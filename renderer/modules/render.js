import { PAGE_HEIGHT_IN, PAGE_WIDTH_IN } from './constants.js?v=21';
import { make } from './dom.js?v=21';
import { buildBookletMetaModel } from './booklet-models.js?v=21';
import { optimizeBookletPlan } from './layout-preflight.js?v=21';
import { buildPages } from './page-builders.js?v=21';
import { setPageNumbers } from './pagination.js?v=21';
import { applyTheme, resolveTheme } from './theme.js?v=21';

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
      const blank = make('section', 'booklet-page page-blank');
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

    if (!detail) return;
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

  if (layoutResult.diagnostics.overflowPageCount > 0) {
    const overflowTypes = Object.keys((layoutResult.diagnostics.summary || {}).overflowTypes || {}).join(', ');
    setStatus(
      'Loaded ' + pages.length + ' pages. Layout governor left ' + layoutResult.diagnostics.overflowPageCount + ' unresolved overflow page(s)' + (overflowTypes ? ' (' + overflowTypes + ')' : '') + '.',
      'error'
    );
    return;
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
