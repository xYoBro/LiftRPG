import { PAGE_HEIGHT_IN, PAGE_WIDTH_IN } from './constants.js';
import { make } from './dom.js';
import { buildPages } from './page-builders.js';
import { applyTheme, resolveTheme } from './theme.js';

function setPageNumbers(pages) {
  pages.forEach((page, index) => {
    const pageNumber = index + 1;
    page.setAttribute('data-page-number', String(pageNumber));
    page.classList.add(pageNumber % 2 === 0 ? 'page-left' : 'page-right');
    page.querySelectorAll('.page-num').forEach((node) => {
      node.textContent = 'P.' + String(pageNumber).padStart(2, '0');
    });
  });
}

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

function applyFit(pages) {
  const debug = new URLSearchParams(window.location.search).get('debugLayout') === '1';
  let clippedCount = 0;

  pages.forEach((page) => {
    const frame = page.firstElementChild;
    if (!frame || frame.tagName !== 'DIV') return;

    const clientHeight = page.clientHeight;
    if (clientHeight === 0) return;

    let trueHeight = frame.scrollHeight;
    if (trueHeight <= clientHeight) return;

    if (debug) {
      console.log('Overflow detected on', page.getAttribute('data-page-type'), '(Safe:', clientHeight, '/ True:', trueHeight, 'px)');
    }

    for (const level of ['1', '2', '3']) {
      if (frame.scrollHeight <= clientHeight) break;
      page.setAttribute('data-fit-level', level);
    }

    trueHeight = frame.scrollHeight;
    if (trueHeight <= clientHeight) return;

    let scale = clientHeight / trueHeight;
    page.setAttribute('data-fit-level', '4');

    const minimumScale = 0.82;
    let clipped = false;
    if (scale < minimumScale) {
      if (debug) {
        console.warn('SEVERE OVERFLOW: Scale clamped from ' + scale.toFixed(3) + ' to ' + minimumScale + ' on ' + page.getAttribute('data-page-type'));
        frame.style.outline = '2px dashed red';
      }
      scale = minimumScale;
      clipped = true;
      clippedCount += 1;
      page.setAttribute('data-fit-failed', 'true');
    }

    frame.style.transform = 'scale(' + scale.toFixed(3) + ')';
    frame.style.transformOrigin = 'top center';
    if (debug && !clipped) {
      console.log('Fallback: applied global CSS transform scale of', scale.toFixed(3));
    }
  });

  return clippedCount;
}

export function syncLayoutMode(refs, layoutMode) {
  refs.booklet.setAttribute('data-layout-mode', layoutMode);
}

export function renderBooklet(refs, layoutMode, data, unlockedEnding, setStatus) {
  refs.booklet.innerHTML = '';
  syncLayoutMode(refs, layoutMode);
  applyTheme(refs.booklet, resolveTheme(data));

  const pages = buildPages(data, unlockedEnding);
  setPageNumbers(pages);
  refs.booklet.appendChild(buildGrid(pages, layoutMode));

  const clippedCount = applyFit(pages);
  refs.printBtn.disabled = false;

  if (clippedCount > 0) {
    setStatus('Loaded ' + pages.length + ' pages. Warning: ' + clippedCount + ' pages clipped (exceeded max density).', 'error');
    return;
  }

  setStatus('Loaded ' + pages.length + ' pages. Review, then print.', 'success');
}
