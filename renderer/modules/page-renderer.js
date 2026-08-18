import { make } from './dom.js';
import { createBoundedPage } from './page-shell.js';
import { getAtomDefinition } from './engine/atom-registry.js';
import {
  resolveShellAttrs,
  resolvePageRowPlan,
  isWorkoutPlacement,
  isMechanicPlacement,
} from './mechanic-layout.js';
import { getShellDecorator } from './shell-decorator-registry.js';

// Decorator registration — import barrel for side effects.
// This ensures any code path that reaches renderPageFromPlacements()
// (including the measurement harness) also gets decorator registration.
import './decorators/index.js';

// THE PAGE-KIND PARTITION AND THE ROW GROUPING MOVED TO mechanic-layout.js
// (D207 / DR-48). Both are now read by two parties, not one: this file builds
// the DOM from `resolvePageRowPlan()` and the measurement side picks its slot
// width from the same plan, so the width a page is MEASURED at and the width
// it is PRINTED at cannot come apart. `WORKOUT_PAGE_TYPES`,
// `MECHANIC_PAGE_TYPES`, `isWorkoutPlacement`, `isMechanicPlacement`,
// `isCompanionPlacement` (now `isCompanionItem`) and
// `groupPlacementsIntoRows()` live there with the defects that shaped them;
// they are imported back here unchanged, and the DOM this file produces is
// byte-identical.

const BOARD_STATE_COPY = {
  'survey-grid': {
    pageTitle: 'Field Operations',
    companionLabel: 'Companion Surface',
  },
  'node-graph': {
    pageTitle: 'Route Network',
    companionLabel: 'Support Nodes',
  },
  'ledger-board': {
    pageTitle: 'Procedure Ledger',
    companionLabel: 'Tracking Ledger',
  },
  'timeline-reconstruction': {
    pageTitle: 'Reconstruction Board',
    companionLabel: 'Witness Notes',
  },
  'testimony-matrix': {
    pageTitle: 'Evidence Matrix',
    companionLabel: 'Case Surface',
  },
};

function workoutCompactionLevel(placements) {
  const maxDensity = placements.reduce((max, placement) => {
    return Math.max(max, Number(placement.density) || 0);
  }, 0);

  if (maxDensity >= 0.92) return 5;
  if (maxDensity >= 0.82) return 4;
  if (maxDensity >= 0.72) return 3;
  if (maxDensity >= 0.62) return 2;
  if (maxDensity >= 0.48) return 1;
  return 0;
}

function weekContextFromPlacements(placements) {
  let weekIndex = null;
  let totalWeeks = 0;

  for (const placement of placements) {
    const data = placement.atom?.data || placement.data || {};
    if (weekIndex == null && Number.isInteger(data.weekIndex)) {
      weekIndex = data.weekIndex;
    }
    if (!totalWeeks && Number.isFinite(data.totalWeeks) && data.totalWeeks > 0) {
      totalWeeks = data.totalWeeks;
    }
  }

  if (weekIndex == null || totalWeeks <= 0) return null;
  return { weekIndex, totalWeeks };
}

/**
 * Apply resolved shell attributes as data-* attributes on a DOM element.
 */
function applyShellAttrs(element, attrs) {
  if (!attrs || typeof attrs !== 'object') return;
  Object.keys(attrs).forEach(function (key) {
    element.setAttribute('data-' + key, attrs[key]);
  });
}

function resolveMechanicCopy(shellAttrs) {
  return BOARD_STATE_COPY[shellAttrs['board-state-mode']] || BOARD_STATE_COPY['survey-grid'];
}

/**
 * Render a row (from groupPlacementsIntoRows) into a container element.
 *
 * @param {HTMLElement} container
 * @param {{ type: string, placements: Array }} row
 */
function renderRowInto(container, row) {
  if (row.type === 'halves') {
    const rowEl = make('div', 'rp-row rp-row--halves');
    row.placements.forEach(function (placement) {
      const cell = make('div', 'rp-row-cell');
      renderPlacementInto(cell, placement);
      rowEl.appendChild(cell);
    });
    container.appendChild(rowEl);
  } else {
    const rowEl = make('div', 'rp-row rp-row--full');
    renderPlacementInto(rowEl, row.placements[0]);
    container.appendChild(rowEl);
  }
}

// IDENTITY STAMP — `data-atom-id` on whatever element actually lands in a frame.
//
// The plan knows which atom each placement is; the DOM did not. Every
// order invariant we had (the D81 printed-sequence law, the printedAtomOrder
// pin) reads `window.__v2SpreadPlan` — the PLAN — so a composition step that
// reorders placements on their way into the frame was invisible to all of
// them. That is exactly what the pre-2026-08-11 type partition in
// renderWorkoutPage() did: plan said card | panel | footer, DOM said panel |
// cards | footer, and nothing failed. This attribute is what lets a gate read
// the rendered composition back (see the DOM-order gate in
// tests/playwright/diagnostics.spec.js).
//
// Geometry-safe by construction: an attribute with no CSS consumer changes no
// box. It is also render-only — measurement-harness.js renders atoms directly
// via `def.render()` and never routes through this function — so measurement
// and render cannot diverge over it.
//
// Stamped on the element that lands in the frame, NOT on `rendered`: an atom
// whose renderer returns a whole `.booklet-page` (cover, fragment-doc, boss,
// interlude — anything built on createBoundedPage) has that wrapper discarded
// below, and its inner frame's children are what actually get appended. Those
// children each carry the id, so an atom occupies a contiguous run of stamped
// elements rather than exactly one.
function stampAtomIdentity(element, atomId) {
  if (!atomId) return;
  if (!element || element.nodeType !== 1) return;
  element.setAttribute('data-atom-id', atomId);
}

export function renderPlacementInto(target, placement) {
  const def = getAtomDefinition(placement.type);
  if (!def) {
    console.warn('[render-v2] No atom definition for type:', placement.type);
    return;
  }

  const rendered = def.render(placement.atom, placement.density);
  const atomId = placement.atomId == null ? '' : String(placement.atomId);

  if (rendered.classList && rendered.classList.contains('booklet-page')) {
    const innerFrame = rendered.querySelector('.page-frame');
    if (innerFrame) {
      while (innerFrame.firstChild) {
        const child = innerFrame.firstChild;
        if (child.style && child.style.flex && placement.type !== 'session-card') {
          child.style.flex = '';
        }
        stampAtomIdentity(child, atomId);
        target.appendChild(child);
      }
    }
    return;
  }

  if (rendered.style && rendered.style.flex && placement.type !== 'session-card') {
    rendered.style.flex = '';
  }
  stampAtomIdentity(rendered, atomId);
  target.appendChild(rendered);
}

function appendWeeklyFooter(frame, placements, explicitFooterPlacement = null) {
  if (explicitFooterPlacement) {
    renderPlacementInto(frame, explicitFooterPlacement);
    return;
  }

  const weekContext = weekContextFromPlacements(placements);
  if (!weekContext) return;

  const footerDef = getAtomDefinition('week-footer');
  if (!footerDef) return;

  const footer = footerDef.render({ data: weekContext }, 0);
  footer.classList.add('week-progress-pagefooter');
  frame.appendChild(footer);
}

function renderWorkoutPage(placements, planIndex) {
  const { page, frame } = createBoundedPage(
    'workout-left',
    'workout-left',
    { boundaryRole: 'session-log', pageClass: 'page-workout-left' },
  );

  page.setAttribute('data-plan-index', String(planIndex));
  page.setAttribute('data-engine', 'v2');

  const sessionPlacements = placements.filter((placement) => placement.type === 'session-card');
  const footerPlacement = placements.find((placement) => placement.type === 'week-footer') || null;

  frame.setAttribute('data-card-count', String(sessionPlacements.length));
  frame.setAttribute('data-page-compaction', String(workoutCompactionLevel(sessionPlacements)));

  // THE OWNERSHIP TEST (render half) — what `booklet.css`'s single-card block
  // keys on. `data-card-count="1"` used to carry it, and that question is the
  // wrong one: a page holding a WEEK HEADER plus one card answered yes, took
  // the density-invariant 260px notes floor, overflowed with no shrink path,
  // and shed the card — stranding the header alone (D112's mute spread).
  //
  // Two clauses, both necessary. The adapter's declaration (`data.ownsPage`,
  // see sessionChunkOwnsPage in adapters/liftrpg-adapter.js) is what phase-1
  // estimation reads, so honouring it is what keeps estimate and render
  // modelling the same object. The composition check is the renderer's own
  // eyes: the planner can seat a foreign atom here, and a declaration made
  // before placement must not outrank the page that actually exists. The
  // conjunction can only turn solo OFF, never on — and off is the shorter
  // geometry, so render never needs more height than the estimate reserved.
  //
  // The week footer is exempt: page-structural band, not flow content
  // (ZONE-ASSIGNMENT-DESIGN §6), and it has always shared the solo page.
  const flowPlacementCount = placements
    .filter((placement) => placement.type !== 'week-footer').length;
  const cardOwnsPage = sessionPlacements.length === 1
    && flowPlacementCount === 1
    && !!(sessionPlacements[0].data && sessionPlacements[0].data.ownsPage);
  if (cardOwnsPage) frame.setAttribute('data-solo-card', '1');

  // PRINTED ORDER = PLACEMENT ORDER.
  //
  // This loop used to be a type partition: every non-card atom rendered into
  // the frame first, then the cards, then the footer. That silently hoisted
  // ANY non-card atom above the cards no matter what sequence the adapter gave
  // it — the page composed by type, while the plan was ordered by (section,
  // sequence). It never showed because the only non-card atom that had ever
  // landed on a workout page was the week header, which sorts first anyway.
  // Session 1's reckoning panel, seated between the last card and the footer,
  // printed above the card and exposed it.
  //
  // The planner's per-(group, side) sequence law (D81) governs the placement
  // array; composing in that array's order is what carries the law into the
  // DOM. Nothing here may reorder placements — only group them.
  //
  // Consecutive cards share one `.session-cards` flex column, because that
  // container is what lets cards stretch to fill the page (`flex:1` + `flex:1
  // 1 0` children). A run breaks when a non-card atom is seated between cards,
  // and each run gets its own column — the atom prints where its sequence put
  // it. The week footer is the one exception: it is a page-structural band the
  // renderer positions, not a flow atom (ZONE-ASSIGNMENT-DESIGN §6), and
  // appendWeeklyFooter synthesises one when no footer placement is present.
  const flowPlacements = placements.filter((placement) => placement.type !== 'week-footer');
  let cursor = 0;
  while (cursor < flowPlacements.length) {
    if (flowPlacements[cursor].type !== 'session-card') {
      renderPlacementInto(frame, flowPlacements[cursor]);
      cursor++;
      continue;
    }

    const cards = make('div', 'session-cards');
    while (cursor < flowPlacements.length && flowPlacements[cursor].type === 'session-card') {
      renderPlacementInto(cards, flowPlacements[cursor]);
      cursor++;
    }
    frame.appendChild(cards);
  }

  appendWeeklyFooter(frame, placements, footerPlacement);

  return page;
}

// The row plan — surface template, companion grouping, shell attrs and layout
// variant — comes from mechanic-layout.js's resolvePageRowPlan(), the single
// source of truth this file and the measurement side both read (D207).

function renderMechanicPage(placements, planIndex) {
  const rowPlan = resolvePageRowPlan(placements);
  const { shellAttrs, layoutVariant, surfacePlacements, companionPlacements } = rowPlan;
  const shellFamily = shellAttrs['shell-family'] || 'field-survey';
  const copy = resolveMechanicCopy(shellAttrs);
  const surfaceTypes = new Set(surfacePlacements.map((placement) => placement.type));
  const isSoloSurface = surfacePlacements.length === 1 && companionPlacements.length === 0;
  const isSoloCompanion = surfacePlacements.length === 0 && companionPlacements.length === 1;

  // Build page facts once — passed to decorator hooks.
  const pageFacts = {
    shellAttrs,
    placements,
    surfacePlacements,
    companionPlacements,
    surfaceTypes,
    layoutVariant,
    isSoloSurface,
    isSoloCompanion,
    weekContext: weekContextFromPlacements(placements),
  };

  const decorator = getShellDecorator(shellFamily);

  const { page, frame } = createBoundedPage(
    'field-ops',
    'field-ops-right',
    { boundaryRole: 'field-ops', pageClass: 'page-field-ops' },
  );

  page.setAttribute('data-plan-index', String(planIndex));
  page.setAttribute('data-engine', 'v2');
  applyShellAttrs(page, shellAttrs);
  applyShellAttrs(frame, shellAttrs);

  const header = make('header', 'rp-header');
  header.appendChild(make('span', '', copy.pageTitle || 'Field Operations'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  // Decorator: header chrome (strip, briefing, etc.)
  const headerChrome = decorator.buildHeaderChrome && decorator.buildHeaderChrome(pageFacts);
  if (headerChrome) {
    frame.appendChild(headerChrome);
  }

  const content = make('div', 'rp-content');
  applyShellAttrs(content, shellAttrs);
  if (surfaceTypes.size === 1) {
    const soloType = surfacePlacements[0] ? surfacePlacements[0].type : '';
    content.setAttribute('data-solo-surface', soloType);
  } else if (surfacePlacements.length === 0 && companionPlacements.length > 0) {
    content.setAttribute('data-solo-surface', 'tracker');
  }

  frame.setAttribute('data-layout-variant', layoutVariant);
  rowPlan.surfaceRows.forEach((row) => renderRowInto(content, row));

  // Decorator: solo-surface supplement (worksheet, etc.)
  if (isSoloSurface) {
    const supplement = decorator.buildSoloSurfaceSupplement && decorator.buildSoloSurfaceSupplement(pageFacts);
    if (supplement) {
      content.appendChild(supplement);
    }
  }

  if (companionPlacements.length > 0) {
    content.setAttribute('data-has-companion', 'true');
    const companionZone = make('section', 'companion-zone');
    companionZone.appendChild(make('div', 'doc-label', copy.companionLabel || 'Companion Surface'));
    rowPlan.companionRows.forEach((row) => renderRowInto(companionZone, row));
    content.appendChild(companionZone);

    // Decorator: companion-only supplement (worksheet, etc.)
    if (isSoloCompanion) {
      const supplement = decorator.buildCompanionOnlySupplement && decorator.buildCompanionOnlySupplement(pageFacts);
      if (supplement) {
        content.appendChild(supplement);
      }
    }
  }

  frame.appendChild(content);
  appendWeeklyFooter(frame, placements);

  return page;
}

export function renderPageFromPlacements(placements, spreadType, planIndex) {
  if (placements.length === 0) return null;

  const hasWorkoutContent = placements.some(isWorkoutPlacement);
  const hasMechanicContent = placements.some(isMechanicPlacement);

  if (placements.length === 1) {
    const def = getAtomDefinition(placements[0].type);
    if (def) {
      const rendered = def.render(placements[0].atom, placements[0].density);
      if (rendered.classList && rendered.classList.contains('booklet-page')) {
        rendered.setAttribute('data-plan-index', String(planIndex));
        rendered.setAttribute('data-engine', 'v2');
        const frame = rendered.querySelector('.page-frame');
        if (frame && !frame.querySelector('.week-progress') && hasMechanicContent) {
          appendWeeklyFooter(frame, placements);
        }
        return rendered;
      }
    }
  }

  if (hasWorkoutContent) {
    return renderWorkoutPage(placements, planIndex);
  }

  if (hasMechanicContent) {
    return renderMechanicPage(placements, planIndex);
  }

  const primaryType = placements[0].type;
  const pageType = primaryType === 'fragment-doc' ? 'fragment-page' : primaryType;
  const frameClass = primaryType === 'fragment-doc'
    ? 'fragment-page page-fragment-doc'
    : 'page-' + primaryType;
  const pageClass = pageType ? 'page-shell-' + pageType : null;
  const { page, frame } = createBoundedPage(
    pageType,
    frameClass,
    { boundaryRole: spreadType, pageClass },
  );

  page.setAttribute('data-plan-index', String(planIndex));
  page.setAttribute('data-engine', 'v2');

  // Fragment-doc: resolve shell attrs and decorator once for both hooks
  const isFragment = primaryType === 'fragment-doc';
  let fragmentDecorator = null;
  let fragmentFacts = null;

  if (isFragment) {
    const shellAttrs = resolveShellAttrs(placements);
    const shellFamily = shellAttrs['shell-family'] || 'field-survey';
    frame.setAttribute('data-fragment-count', String(placements.length));
    applyShellAttrs(frame, shellAttrs);

    fragmentDecorator = getShellDecorator(shellFamily);
    fragmentFacts = {
      shellAttrs,
      placements,
      fragmentCount: placements.length,
    };
  }

  for (const placement of placements) {
    renderPlacementInto(frame, placement);
  }

  // Decorator: fragment footer (archive footer, etc.)
  if (isFragment && fragmentDecorator) {
    const footer = fragmentDecorator.buildFragmentFooter
      && fragmentDecorator.buildFragmentFooter(fragmentFacts);
    if (footer) {
      frame.appendChild(footer);
    }
  }

  return page;
}
