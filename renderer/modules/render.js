import { PAGE_HEIGHT_IN, PAGE_WIDTH_IN } from './constants.js?v=47';
import { make } from './dom.js?v=47';
import { buildBookletMetaModel } from './booklet-models.js?v=47';
import { setPageNumbers } from './pagination.js?v=47';
import { createBoundedPage } from './page-shell.js?v=47';
import { applyTheme, resolveTheme } from './theme.js?v=47';

// ── V2 Engine imports ───────────────────────────────────────────────
import { getAtomDefinition } from './engine/atom-registry.js';
import { planAndMeasure } from './engine/page-planner.js';
import { liftrpgAdapter } from './adapters/liftrpg-adapter.js';

// Atom self-registration — import for side effects only
import './atoms/cover.js';
import './atoms/rules-block.js';
import './atoms/gauge-log.js';
import './atoms/session-card.js';
import './atoms/week-header.js';
import './atoms/week-footer.js';
import './atoms/cipher-panel.js';
import './atoms/oracle-table.js';
import './atoms/map-panel.js';
import './atoms/boss-encounter.js';
import './atoms/fragment-doc.js';
import './atoms/assembly-page.js';
import './atoms/ending.js';
import './atoms/back-cover.js';
import './atoms/notes-grid.js';
import './atoms/text-block.js';
import './atoms/image.js';
import './atoms/tracker.js';
import './atoms/callout-box.js';
import './atoms/checklist.js';
import './atoms/table.js';
import './atoms/timeline.js';
import './atoms/divider.js';

const WORKOUT_PAGE_TYPES = new Set(['week-header', 'session-card', 'week-footer']);
const MECHANIC_PAGE_TYPES = new Set(['cipher-panel', 'oracle-table', 'map-panel', 'tracker']);

function buildGrid(pages, layoutMode) {
  const grid = make('div', 'booklet-grid');

  if (layoutMode === 'single') {
    pages.forEach((page) => {
      grid.appendChild(page);
    });
    return grid;
  }

  if (layoutMode === 'booklet') {
    let count = pages.length;
    while (count % 4 !== 0) {
      const blank = createBoundedPage('blank-filler', 'page-blank', {
        boundaryRole: 'utility',
        pageClass: 'page-blank'
      }).page;
      blank.style.width = PAGE_WIDTH_IN + 'in';
      blank.style.height = PAGE_HEIGHT_IN + 'in';
      pages.push(blank);
      count = pages.length;
    }

    for (let index = 0; index < count / 2; index += 2) {
      const outer = make('div', 'spread-row printer-sheet');
      outer.appendChild(pages[count - 1 - index]);
      outer.appendChild(pages[index]);
      grid.appendChild(outer);

      if (index + 1 < count / 2) {
        const inner = make('div', 'spread-row printer-sheet');
        inner.appendChild(pages[index + 1]);
        inner.appendChild(pages[count - 2 - index]);
        grid.appendChild(inner);
      }
    }

    return grid;
  }

  const coverSpread = make('div', 'spread-row reader-spread');
  coverSpread.appendChild(make('div', 'spread-spacer'));
  coverSpread.appendChild(pages[0]);
  grid.appendChild(coverSpread);

  for (let index = 1; index < pages.length - 1; index += 2) {
    const spread = make('div', 'spread-row reader-spread');
    spread.appendChild(pages[index]);
    if (index + 1 < pages.length) {
      spread.appendChild(pages[index + 1]);
    } else {
      spread.appendChild(make('div', 'spread-spacer'));
    }
    grid.appendChild(spread);
  }

  if (pages.length % 2 === 0) {
    const backSpread = make('div', 'spread-row reader-spread');
    backSpread.appendChild(pages[pages.length - 1]);
    backSpread.appendChild(make('div', 'spread-spacer'));
    grid.appendChild(backSpread);
  }

  return grid;
}

function applyBookletMetadata(booklet, data) {
  const meta = buildBookletMetaModel(data);
  const theme = data.theme || {};
  const shape = meta.structuralShape || {};
  const voice = meta.narrativeVoice || {};

  booklet.setAttribute('data-visual-archetype', theme.visualArchetype || 'pastoral');
  booklet.setAttribute('data-weekly-component-type', meta.weeklyComponentType || '');
  booklet.setAttribute('data-structural-resolution', shape.resolution || '');
  booklet.setAttribute('data-temporal-order', shape.temporalOrder || '');
  booklet.setAttribute('data-narrative-person', voice.person || '');
  booklet.setAttribute('data-narrative-tense', voice.tense || '');
}

export function syncLayoutMode(refs, layoutMode) {
  refs.booklet.setAttribute('data-layout-mode', layoutMode);
}

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

function renderPlacementInto(target, placement) {
  const def = getAtomDefinition(placement.type);
  if (!def) {
    console.warn('[render-v2] No atom definition for type:', placement.type);
    return;
  }

  const rendered = def.render(placement.atom, placement.density);

  if (rendered.classList && rendered.classList.contains('booklet-page')) {
    const innerFrame = rendered.querySelector('.page-frame');
    if (innerFrame) {
      while (innerFrame.firstChild) {
        const child = innerFrame.firstChild;
        if (child.style && child.style.flex && placement.type !== 'session-card') {
          child.style.flex = '';
        }
        target.appendChild(child);
      }
    }
    return;
  }

  if (rendered.style && rendered.style.flex && placement.type !== 'session-card') {
    rendered.style.flex = '';
  }
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

function renderWorkoutPage(placements, spreadType, planIndex) {
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

  placements
    .filter((placement) => placement.type !== 'session-card' && placement.type !== 'week-footer')
    .forEach((placement) => renderPlacementInto(frame, placement));

  if (sessionPlacements.length > 0) {
    const cards = make('div', 'session-cards');
    sessionPlacements.forEach((placement) => renderPlacementInto(cards, placement));
    frame.appendChild(cards);
  }

  appendWeeklyFooter(frame, placements, footerPlacement);

  return page;
}

function renderMechanicPage(placements, spreadType, planIndex) {
  const { page, frame } = createBoundedPage(
    'field-ops',
    'field-ops-right',
    { boundaryRole: 'field-ops', pageClass: 'page-field-ops' },
  );

  page.setAttribute('data-plan-index', String(planIndex));
  page.setAttribute('data-engine', 'v2');

  const content = make('div', 'rp-content');
  const companionPlacements = placements.filter((placement) => placement.type === 'tracker');

  placements
    .filter((placement) => placement.type !== 'tracker' && placement.type !== 'week-footer')
    .forEach((placement) => renderPlacementInto(content, placement));

  if (companionPlacements.length > 0) {
    content.setAttribute('data-has-companion', 'true');
    const companionZone = make('section', 'companion-zone');
    companionZone.appendChild(make('div', 'doc-label', 'Companion Surface'));
    companionPlacements.forEach((placement) => renderPlacementInto(companionZone, placement));
    content.appendChild(companionZone);
  }

  frame.appendChild(content);
  appendWeeklyFooter(frame, placements);

  return page;
}

// =====================================================================
// V2 Engine Pipeline
// =====================================================================

/**
 * Render a single page from a spread side's placements.
 */
function renderPageFromPlacements(placements, spreadType, planIndex) {
  if (placements.length === 0) return null;

  const hasWorkoutContent = placements.some(isWorkoutPlacement);
  const hasMechanicContent = placements.some(isMechanicPlacement);

  // Single full-page atom whose renderer returns a complete booklet-page:
  // use it directly instead of double-wrapping.
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
      // Content fragment — wrap it below
    }
  }

  if (hasWorkoutContent) {
    return renderWorkoutPage(placements, spreadType, planIndex);
  }

  if (hasMechanicContent) {
    return renderMechanicPage(placements, spreadType, planIndex);
  }

  const primaryType = placements[0].type;
  const { page, frame } = createBoundedPage(
    primaryType,
    'page-' + primaryType,
    { boundaryRole: spreadType, pageClass: 'page-' + primaryType },
  );

  page.setAttribute('data-plan-index', String(planIndex));
  page.setAttribute('data-engine', 'v2');

  for (const placement of placements) {
    renderPlacementInto(frame, placement);
  }

  return page;
}

/**
 * Convert a spread plan into an array of page DOM elements.
 */
function buildPagesFromSpreadPlan(spreadPlan) {
  const pages = [];
  let planIndex = 0;

  for (const spread of spreadPlan) {
    if (spread.left.length > 0) {
      const page = renderPageFromPlacements(spread.left, spread.spreadType, planIndex);
      if (page) {
        pages.push(page);
        planIndex++;
      }
    }
    if (spread.right.length > 0) {
      const page = renderPageFromPlacements(spread.right, spread.spreadType, planIndex);
      if (page) {
        pages.push(page);
        planIndex++;
      }
    }
  }

  return pages;
}

/**
 * V2 render pipeline: adapter → planner → atom renderers → grid.
 */
export function renderBooklet(refs, layoutMode, data, unlockedEnding, setStatus) {
  refs.booklet.innerHTML = '';
  syncLayoutMode(refs, layoutMode);
  applyTheme(refs.booklet, resolveTheme(data));
  applyBookletMetadata(refs.booklet, data);

  // Step 1: Extract atoms from data via adapter
  const atoms = liftrpgAdapter.extractAtoms(data, unlockedEnding);

  // Step 2: Plan and measure — full pipeline with overflow resolution
  const { spreadPlan, diagnostics } = planAndMeasure(atoms, refs.booklet, {
    sectionOrder: liftrpgAdapter.sectionOrder,
    planningUnit: 'spread',
    padToMultipleOf: 4,
  });

  // Step 3: Render atoms into pages
  const pages = buildPagesFromSpreadPlan(spreadPlan);
  setPageNumbers(pages);

  // Step 4: Build grid and attach
  refs.booklet.appendChild(buildGrid(pages, layoutMode));
  refs.printBtn.disabled = false;

  // Step 5: Expose diagnostics for debugging
  window.__v2SpreadPlan = spreadPlan;
  window.__v2Diagnostics = diagnostics;
  window.__v2AtomCount = atoms.length;
  window.__v2PageCount = pages.length;

  // Step 6: Report status
  const unresolvedCount = (diagnostics.unresolvedOverflow || []).length;
  if (unresolvedCount > 0) {
    setStatus(
      '[V2] Loaded ' + pages.length + ' pages (' + atoms.length + ' atoms). ' +
      unresolvedCount + ' unresolved overflow(s). ' +
      diagnostics.revisionPasses + ' revision pass(es).',
      'error',
    );
    return;
  }

  if (diagnostics.revisionPasses > 0) {
    setStatus(
      '[V2] Loaded ' + pages.length + ' pages (' + atoms.length + ' atoms). ' +
      diagnostics.revisionPasses + ' revision pass(es) applied. Review, then print.',
      'success',
    );
    return;
  }

  setStatus(
    '[V2] Loaded ' + pages.length + ' pages (' + atoms.length + ' atoms). Review, then print.',
    'success',
  );
}
