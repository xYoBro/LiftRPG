import { make } from './dom.js';
import { createBoundedPage } from './page-shell.js';
import { getAtomDefinition } from './engine/atom-registry.js';
import {
  resolveLayoutVariant,
  buildMechanicSurfaceRows,
  resolveShellAttrs,
} from './mechanic-layout.js';
import { getShellDecorator } from './shell-decorator-registry.js';

// Decorator registration — import barrel for side effects.
// This ensures any code path that reaches renderPageFromPlacements()
// (including the measurement harness) also gets decorator registration.
import './decorators/index.js';

// A page is a session log because it carries session content, NOT because it
// carries a week footer. The footer is a page-structural band the renderer
// positions (ZONE-ASSIGNMENT-DESIGN §6) and appendWeeklyFooter() synthesises
// one on any page that needs it — so a footer is evidence of which WEEK a page
// belongs to, never of what is on it.
//
// It was listed here until the clocks panel produced the first page whose only
// workout-typed placement was a footer: a boss week's clocks, pushed off a full
// card page, arrived as a `page-workout-left` shell with `data-card-count="0"`
// and a session-log boundary — which is what the diagnostics gate 'session
// cards exist on workout pages' caught. Measured across the corpus, no page
// before the clocks panel had a footer without a header or a card, so this
// narrowing reclassifies those pages and nothing else.
const WORKOUT_PAGE_TYPES = new Set(['week-header', 'session-card']);
// reckoning-panel is deliberately NOT a mechanic page type: on non-boss weeks
// it shares field-ops pages that cipher/oracle already classify, and on boss
// weeks it shares the final session-chunk page, which routes as a workout page
// regardless (renderPageFromPlacements tests workout content first). Listing
// it here would only change the one case where it lands alone on a page —
// giving that page a mechanic frame and a week footer it does not ask for.
//
// It is NOT what inverted the panel against the cards in Session 1: that was
// the type partition in renderWorkoutPage(), fixed there.
//
// clocks-panel IS listed: unlike the reckoning panel it has no workout-page
// fallback seat, so the one case that matters is the opposite one — a week
// whose clocks are pushed onto a page of their own. Without an entry here that
// page would fall through to the generic branch and be built as a
// `page-clocks-panel` shell that no CSS has ever styled; with it, a solo clocks
// page is a field-ops page with the frame, the board-state title and the week
// footer that every other field-ops page carries.
const MECHANIC_PAGE_TYPES = new Set(['cipher-panel', 'oracle-table', 'map-panel', 'clocks-panel', 'tracker']);
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

function isWorkoutPlacement(placement) {
  return WORKOUT_PAGE_TYPES.has(placement.type);
}

function isMechanicPlacement(placement) {
  return placement.type === 'boss-encounter' || MECHANIC_PAGE_TYPES.has(placement.type);
}

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
 * Group a flat placement list into rows based on footprint.cols and rowGroup.
 *
 * When atoms declare a `rowGroup` on their atom descriptor, atoms with the
 * same rowGroup and `footprint.cols === 1` are paired into halves rows
 * regardless of adjacency. Atoms without rowGroup fall back to the legacy
 * adjacency-based pairing (two consecutive cols:1 → halves row). Atoms with
 * rowGroup never pair with atoms without rowGroup, and atoms with different
 * rowGroup values never pair with each other.
 *
 * @param {Array} placements
 * @returns {Array<{ type: 'halves'|'full', placements: Array }>}
 */
function groupPlacementsIntoRows(placements) {
  const rows = [];
  const consumed = new Set();

  // Phase 1: Pre-compute rowGroup-based pairs.
  // For each rowGroup, collect cols:1 members and pair them in list order.
  const paired = new Map(); // index → partner index
  const byRowGroup = new Map();
  for (let idx = 0; idx < placements.length; idx++) {
    const rg = placements[idx].atom && placements[idx].atom.rowGroup;
    if (!rg) continue;
    if (!byRowGroup.has(rg)) byRowGroup.set(rg, []);
    byRowGroup.get(rg).push(idx);
  }
  for (const indices of byRowGroup.values()) {
    const halfIndices = indices.filter(function (idx) {
      const def = getAtomDefinition(placements[idx].type);
      return ((def && def.footprint && def.footprint.cols) || 2) === 1;
    });
    for (let k = 0; k + 1 < halfIndices.length; k += 2) {
      paired.set(halfIndices[k], halfIndices[k + 1]);
      paired.set(halfIndices[k + 1], halfIndices[k]);
    }
  }

  // Phase 2: Walk placements in order, forming rows.
  let i = 0;
  while (i < placements.length) {
    if (consumed.has(i)) { i++; continue; }

    const p = placements[i];
    const def = getAtomDefinition(p.type);
    const cols = (def && def.footprint && def.footprint.cols) || 2;
    const partner = paired.get(i);

    // rowGroup-based halves row
    if (partner !== undefined && !consumed.has(partner)) {
      rows.push({ type: 'halves', placements: [p, placements[partner]] });
      consumed.add(i);
      consumed.add(partner);
      i++;
      continue;
    }

    // Legacy adjacency fallback — only for atoms WITHOUT rowGroup
    const hasRowGroup = !!(p.atom && p.atom.rowGroup);
    if (!hasRowGroup && cols === 1 && i + 1 < placements.length && !consumed.has(i + 1)) {
      const next = placements[i + 1];
      const nextHasRowGroup = !!(next.atom && next.atom.rowGroup);
      if (!nextHasRowGroup) {
        const nextDef = getAtomDefinition(next.type);
        const nextCols = (nextDef && nextDef.footprint && nextDef.footprint.cols) || 2;
        if (nextCols === 1) {
          rows.push({ type: 'halves', placements: [p, next] });
          consumed.add(i);
          consumed.add(i + 1);
          i += 2;
          continue;
        }
      }
    }

    // Full-width row
    consumed.add(i);
    rows.push({ type: 'full', placements: [p] });
    i++;
  }

  return rows;
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

// resolveLayoutVariant and buildMechanicSurfaceRows are imported from
// mechanic-layout.js — the single source of truth for mechanic row templates.

function isCompanionPlacement(placement) {
  // Primary signal: explicit zone declaration from the adapter.
  // Fallback: type === 'tracker' for atoms emitted before zone adoption.
  const zone = placement.atom?.zone ?? null;
  return zone === 'companion' || (zone == null && placement.type === 'tracker');
}

function renderMechanicPage(placements, planIndex) {
  const shellAttrs = resolveShellAttrs(placements);
  const shellFamily = shellAttrs['shell-family'] || 'field-survey';
  const copy = resolveMechanicCopy(shellAttrs);
  const surfacePlacements = placements.filter((placement) => !isCompanionPlacement(placement) && placement.type !== 'week-footer');
  const companionPlacements = placements.filter(isCompanionPlacement);
  const surfaceTypes = new Set(surfacePlacements.map((placement) => placement.type));
  const isSoloSurface = surfacePlacements.length === 1 && companionPlacements.length === 0;
  const isSoloCompanion = surfacePlacements.length === 0 && companionPlacements.length === 1;
  const layoutVariant = resolveLayoutVariant(shellAttrs, surfacePlacements);

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
  buildMechanicSurfaceRows(surfacePlacements, layoutVariant).forEach((row) => renderRowInto(content, row));

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
    groupPlacementsIntoRows(companionPlacements).forEach((row) => renderRowInto(companionZone, row));
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
