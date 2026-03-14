/**
 * notes-grid.js — Notes/scratch page atom
 *
 * Renders a full-page grid for handwritten notes. Four variants:
 * dot (intersection circles), lined (horizontal rules), graph
 * (square cells), blank (empty space). Also used as padding pages
 * for saddle-stitch imposition.
 *
 * @module atoms/notes-grid
 */

import { registerAtom } from '../engine/atom-registry.js';
import { make } from '../dom.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Full page height in px (5.5" × 8.5" at 96dpi minus margins). */
const FULL_PAGE_HEIGHT = 741;

/** Default cell count for dot and graph variants (20 cols × 28 rows = 560). */
const DEFAULT_CELL_COUNT = 560;

/** Default line count for the lined variant. */
const DEFAULT_LINE_COUNT = 28;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a dot grid — small circles positioned at regular intersections.
 * @param {number} cellCount — total cells (used to derive columns × rows)
 * @returns {HTMLElement}
 */
function buildDotGrid(cellCount) {
  const container = make('div', 'notes-grid-dots');
  const cols = 20;
  const rows = Math.ceil(cellCount / cols);
  container.style.setProperty('--notes-grid-cols', cols);
  container.style.setProperty('--notes-grid-rows', rows);

  for (let i = 0; i < cols * rows; i++) {
    container.appendChild(make('span', 'notes-grid-dot'));
  }
  return container;
}

/**
 * Build horizontal ruled lines.
 * @param {number} lineCount
 * @returns {HTMLElement}
 */
function buildLinedGrid(lineCount) {
  const container = make('div', 'notes-grid-lined');
  for (let i = 0; i < lineCount; i++) {
    container.appendChild(make('div', 'notes-grid-line'));
  }
  return container;
}

/**
 * Build a square-cell graph grid.
 * @param {number} cellCount
 * @returns {HTMLElement}
 */
function buildGraphGrid(cellCount) {
  const container = make('div', 'notes-grid-graph');
  const cols = 20;
  const rows = Math.ceil(cellCount / cols);
  container.style.setProperty('--notes-grid-cols', cols);
  container.style.setProperty('--notes-grid-rows', rows);

  for (let i = 0; i < cols * rows; i++) {
    container.appendChild(make('div', 'notes-grid-cell'));
  }
  return container;
}

/**
 * Build a blank notes area.
 * @returns {HTMLElement}
 */
function buildBlankGrid() {
  return make('div', 'notes-grid-blank');
}

// ---------------------------------------------------------------------------
// Atom registration
// ---------------------------------------------------------------------------

registerAtom('notes-grid', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'either',

  estimate(_data, _density) {
    return { minHeight: FULL_PAGE_HEIGHT, preferredHeight: FULL_PAGE_HEIGHT };
  },

  render(atom, _density) {
    const data = atom.data ?? {};
    const variant = data.variant || 'lined';
    const cellCount = data.cellCount || DEFAULT_CELL_COUNT;

    const el = make('div', 'notes-grid-atom');
    el.dataset.variant = variant;

    // Header
    const heading = make('h3', 'notes-grid-heading', data.label || 'Field Notes');
    el.appendChild(heading);

    // Grid body
    let grid;
    switch (variant) {
      case 'dot':
        grid = buildDotGrid(cellCount);
        break;
      case 'graph':
        grid = buildGraphGrid(cellCount);
        break;
      case 'blank':
        grid = buildBlankGrid();
        break;
      case 'lined':
      default:
        grid = buildLinedGrid(data.cellCount || DEFAULT_LINE_COUNT);
        break;
    }

    el.appendChild(grid);
    return el;
  },
});

export default 'notes-grid';
