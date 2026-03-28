import { PAGE_HEIGHT_IN, PAGE_WIDTH_IN } from './constants.js?v=47';
import { make } from './dom.js?v=47';
import { buildBookletMetaModel, resolveArtifactIdentity } from './booklet-models.js?v=47';
import { setPageNumbers } from './pagination.js?v=47';
import { createBoundedPage } from './page-shell.js?v=47';
import { renderPageFromPlacements } from './page-renderer.js?v=47';
import { applyTheme, resolveTheme } from './theme.js?v=47';

// ── V2 Engine imports ───────────────────────────────────────────────
import { planAndMeasure } from './engine/page-planner.js';
import { liftrpgAdapter, MAX_BOOKLET_PAGES } from './adapters/liftrpg-adapter.js';

// Shell decorator registration — import for side effects only
import './decorators/classified-packet.js';

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
import './atoms/interlude.js';
import './atoms/fragment-doc.js';
import './atoms/overflow-doc.js';
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
  const artifactIdentity = resolveArtifactIdentity(data);

  booklet.setAttribute('data-visual-archetype', theme.visualArchetype || 'pastoral');
  booklet.setAttribute('data-weekly-component-type', meta.weeklyComponentType || '');
  booklet.setAttribute('data-structural-resolution', shape.resolution || '');
  booklet.setAttribute('data-temporal-order', shape.temporalOrder || '');
  booklet.setAttribute('data-narrative-person', voice.person || '');
  booklet.setAttribute('data-narrative-tense', voice.tense || '');
  booklet.setAttribute('data-shell-family', artifactIdentity.shellFamily || 'field-survey');
  booklet.setAttribute('data-board-state-mode', artifactIdentity.boardStateMode || 'survey-grid');
  booklet.setAttribute('data-attachment-strategy', artifactIdentity.attachmentStrategy || 'split-technical');
}

export function syncLayoutMode(refs, layoutMode) {
  refs.booklet.setAttribute('data-layout-mode', layoutMode);
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
  if (pages.length > MAX_BOOKLET_PAGES) {
    refs.printBtn.disabled = true;
    setStatus(
      '[V2] Loaded ' + pages.length + ' pages (' + atoms.length + ' atoms). ' +
      'Booklet exceeds the ' + MAX_BOOKLET_PAGES + '-page print budget.',
      'error',
    );
    return;
  }

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
