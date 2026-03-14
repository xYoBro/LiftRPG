import { PAGE_HEIGHT_IN, PAGE_WIDTH_IN } from './constants.js?v=44';
import { make } from './dom.js?v=44';
import { buildBookletMetaModel } from './booklet-models.js?v=44';
import { optimizeBookletPlan } from './layout-preflight.js?v=44';
import { buildPages } from './page-builders.js?v=44';
import { setPageNumbers } from './pagination.js?v=44';
import { createBoundedPage } from './page-shell.js?v=44';
import { applyTheme, resolveTheme } from './theme.js?v=44';

// ── V2 Engine imports ───────────────────────────────────────────────
import { getAtomDefinition } from './engine/atom-registry.js';
import { planAndMeasure } from './engine/page-planner.js';
import { liftrpgAdapter } from './adapters/liftrpg-adapter.js';

// Atom self-registration — import for side effects only
import './atoms/cover.js';
import './atoms/rules-block.js';
import './atoms/gauge-log.js';
import './atoms/session-card.js';
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

function annotatePagesWithDiagnostics(pages, diagnostics) {
  const diagnosticsByIndex = new Map((diagnostics || []).map((item) => [item.planIndex, item]));

  pages.forEach((page) => {
    const planIndex = parseInt(page.getAttribute('data-plan-index'), 10) || 0;
    const detail = diagnosticsByIndex.get(planIndex);

    page.removeAttribute('data-layout-overflow');
    page.removeAttribute('data-layout-overflow-height');
    page.removeAttribute('data-layout-overflow-width');
    page.removeAttribute('data-layout-missing-boundary');

    if (!detail) return;
    if (detail.missingBoundary) {
      page.setAttribute('data-layout-missing-boundary', 'true');
    }
    if (detail.overflowHeight <= 0 && detail.overflowWidth <= 0) return;

    page.setAttribute('data-layout-overflow', 'true');
    page.setAttribute('data-layout-overflow-height', String(detail.overflowHeight));
    page.setAttribute('data-layout-overflow-width', String(detail.overflowWidth));
  });
}

export function syncLayoutMode(refs, layoutMode) {
  refs.booklet.setAttribute('data-layout-mode', layoutMode);
}

export function renderBooklet(refs, layoutMode, data, unlockedEnding, setStatus) {
  const debugLayout = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debugLayout') === '1';
  refs.booklet.innerHTML = '';
  syncLayoutMode(refs, layoutMode);
  applyTheme(refs.booklet, resolveTheme(data));
  applyBookletMetadata(refs.booklet, data);

  const layoutResult = optimizeBookletPlan(refs.booklet, data, unlockedEnding);
  const pages = buildPages(data, unlockedEnding, { plan: layoutResult.plan });
  setPageNumbers(pages);
  annotatePagesWithDiagnostics(pages, layoutResult.diagnostics.pages);
  refs.booklet.appendChild(buildGrid(pages, layoutMode));
  refs.printBtn.disabled = false;

  window.__layoutPlan = layoutResult.plan;
  window.__layoutDiagnostics = layoutResult.diagnostics;
  window.__layoutSummary = layoutResult.diagnostics.summary;

  if (layoutResult.diagnostics.missingBoundaryPageCount > 0) {
    const boundaryTypes = Object.keys((layoutResult.diagnostics.summary || {}).missingBoundaryTypes || {}).join(', ');
    setStatus(
      'Loaded ' + pages.length + ' pages. ' + layoutResult.diagnostics.missingBoundaryPageCount + ' page(s) are missing a live-area boundary box' + (boundaryTypes ? ' (' + boundaryTypes + ')' : '') + '.',
      'error'
    );
    return;
  }

  if (layoutResult.diagnostics.overflowPageCount > 0) {
    const overflowTypes = Object.keys((layoutResult.diagnostics.summary || {}).overflowTypes || {}).join(', ');
    const overflowIndexes = (layoutResult.diagnostics.pages || [])
      .filter((page) => page.overflowHeight > 0 || page.overflowWidth > 0)
      .map((page) => String((page.planIndex || 0) + 1))
      .join(', ');
    if (debugLayout) {
      window.location.hash = 'layout-overflow=' + encodeURIComponent(overflowIndexes || overflowTypes || 'true');
    }
    setStatus(
      'Loaded ' + pages.length + ' pages. Layout governor left ' + layoutResult.diagnostics.overflowPageCount + ' unresolved overflow page(s)' + (overflowTypes ? ' (' + overflowTypes + ')' : '') + (overflowIndexes ? ' at pages ' + overflowIndexes : '') + '.',
      'error'
    );
    return;
  }

  if (debugLayout) {
    window.location.hash = 'layout-ok';
  }

  if (layoutResult.passesApplied > 0) {
    setStatus(
      'Loaded ' + pages.length + ' pages. Layout governor resolved ' + layoutResult.passesApplied + ' plan adjustment(s). Review, then print.',
      'success'
    );
    return;
  }

  setStatus('Loaded ' + pages.length + ' pages. Review, then print.', 'success');
}

// =====================================================================
// V2 Engine Pipeline
// =====================================================================

/**
 * Render a single page from a spread side's placements.
 *
 * Creates a bounded page, renders each atom at its solved density,
 * and appends the rendered content to the page frame.
 *
 * @param {Array} placements — array of placement objects from the spread plan
 * @param {string} spreadType — section type (e.g. 'body', 'cover')
 * @param {number} planIndex — sequential page index for diagnostics
 * @returns {HTMLElement} the assembled page element
 */
function renderPageFromPlacements(placements, spreadType, planIndex) {
  if (placements.length === 0) return null;

  // Single full-page atom whose renderer returns a complete booklet-page:
  // use it directly instead of double-wrapping.
  if (placements.length === 1) {
    const def = getAtomDefinition(placements[0].type);
    if (def) {
      const rendered = def.render(placements[0].atom, placements[0].density);
      if (rendered.classList && rendered.classList.contains('booklet-page')) {
        rendered.setAttribute('data-plan-index', String(planIndex));
        rendered.setAttribute('data-engine', 'v2');
        return rendered;
      }
      // Content fragment — wrap it below
    }
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
    const def = getAtomDefinition(placement.type);
    if (!def) {
      console.warn('[render-v2] No atom definition for type:', placement.type);
      continue;
    }
    const rendered = def.render(placement.atom, placement.density);
    // If a renderer returned a full page, extract its frame content
    if (rendered.classList && rendered.classList.contains('booklet-page')) {
      const innerFrame = rendered.querySelector('.page-frame');
      if (innerFrame) {
        while (innerFrame.firstChild) {
          frame.appendChild(innerFrame.firstChild);
        }
      }
    } else {
      frame.appendChild(rendered);
    }
  }

  return page;
}

/**
 * Convert a spread plan into an array of page DOM elements.
 *
 * @param {object[]} spreadPlan — from planAndMeasure()
 * @returns {HTMLElement[]}
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
 *
 * Replaces the V1 pipeline (layout-governor + page-builders) with the
 * universal atom-based engine. Same signature as renderBooklet() for
 * drop-in switching.
 */
export function renderBookletV2(refs, layoutMode, data, unlockedEnding, setStatus) {
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
