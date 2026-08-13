/**
 * word-grid.js — the letter hunt (W5b)
 *
 * A printed grid of letters and the list of words hidden in it. The player
 * rings what they find; depending on the puzzle, the answer is one of the
 * words or the letters nobody ringed.
 *
 * Data shape: { wordGrid, weekIndex, totalWeeks, artifactIdentity }
 *
 * THE ANSWER KEY IS NEVER RENDERED. `wordGrid.words[].row/col/direction` is the
 * placement set — the thing contracts/puzzle-solvers.mjs checks the grid
 * against — and `wordGrid.answer` is what the seal wants. This atom prints the
 * grid and the WORDS, and nothing else about them: printing a coordinate beside
 * a word is printing the solution beside the puzzle.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { densityVariant } from '../engine/density-util.js';
import { make } from '../dom.js';
import { wrappedLines } from '../utils.js';
import { advancePx, readTypeMetrics } from '../type-metrics.js';

// ---------------------------------------------------------------------------
// Ladder mirror  ⇄  booklet.css `--wgrid-*` tokens
// ---------------------------------------------------------------------------
/**
 * CROSS-FILE CONTRACT — these numbers mirror the `--wgrid-*` token ladder in
 * renderer/booklet.css (the `.wgrid-zone` base block and the
 * `.wgrid-zone[data-density-variant="…"]` blocks). booklet.css carries the
 * reverse pointer, and `ladderMirrorHarness()` in scripts/validate.mjs parses
 * BOTH SIDES and asserts equality. **Change them together or the estimate
 * lies.**
 *
 * Phase-1 estimation has no DOM and cannot resolve a custom property, so a
 * token moved on one side alone makes the solver's shrink math wrong in the
 * confident direction — the D71 class, which here costs the player the bottom
 * row of the board to `overflow:hidden`.
 *
 * WHAT IS NOT IN THIS TABLE, AND WHY. There is no letter font-size term: the
 * cell's height is `--wgrid-cell` and the glyph is centred inside it by a
 * line-height equal to that cell, so the type size moves the LOOK and never the
 * geometry. Nothing in the grid wraps, so nothing in the grid needs an advance.
 * The one place this atom does wrap is the word list, and that term is here.
 *
 * `wordColsN` is a constant across the ladder on purpose, and it is mirrored as
 * `--wgrid-word-cols` rather than left implicit. A word list whose column count
 * came from `auto-fill` would break at a width the estimate does not know; a
 * fixed three columns makes `ceil(words / 3)` a number the estimate can compute
 * instead of guess — the same argument the reckoning tally's fixed ten columns
 * are built on.
 *
 * pt→px conversion is ×96/72; line figures are (font-size × leading), rounded
 * to 0.1px exactly as the validator derives them.
 */
const LADDER = {
  base: {
    cellPx:      20,     // --wgrid-cell
    gapPx:       1,      // --wgrid-gap
    wordLinePx:  11.2,   // 6.3pt × 1.33
    wordFsPx:    8.40,   // 6.3pt — the size wordCharPx is measured at
    wordGapPx:   3,      // --wgrid-word-gap
    wordColsN:   3,      // --wgrid-word-cols
    instrLinePx: 10.2,   // 5.9pt × 1.30
    instrFsPx:   7.87,   // 5.9pt
    blockGapPx:  6,      // --wgrid-block-gap
  },
  compact: {
    cellPx:      18,
    gapPx:       1,
    wordLinePx:  11.2,
    wordFsPx:    8.40,
    wordGapPx:   3,
    wordColsN:   3,
    instrLinePx: 10.2,
    instrFsPx:   7.87,
    blockGapPx:  5,
  },
  dense: {
    cellPx:      16,
    gapPx:       1,
    wordLinePx:  9.8,    // 5.9pt × 1.24
    wordFsPx:    7.87,
    wordGapPx:   2,
    wordColsN:   3,
    instrLinePx: 8.9,    // 5.5pt × 1.22
    instrFsPx:   7.33,
    blockGapPx:  4,
  },
  tight: {
    cellPx:      14,     // the pencil floor: a ringed letter must stay legible
    gapPx:       1,
    wordLinePx:  8.8,    // 5.6pt × 1.18
    wordFsPx:    7.47,
    wordGapPx:   2,
    wordColsN:   3,
    instrLinePx: 8.0,    // 5.2pt × 1.16
    instrFsPx:   6.93,
    blockGapPx:  3,
  },
};

/** `.puzzle-title` — the shared cipher/oracle heading class. */
const TITLE_PX = 26;

/**
 * Modelled per-character advances at the calibration anchor — the same ratios
 * constrained-grid derives, from the same corpus-validated constants (0.60 of
 * font-size for untracked mono, 0.50 for body serif). Corrected for the face in
 * use through advancePx(), so a book on a wider mono is modelled at that face's
 * width rather than at pastoral's (D121).
 */
const MONO_ADVANCE_RATIO = 0.60;
const BODY_ADVANCE_RATIO = 0.50;

/** `.wgrid-words` separates itself from the board with a hairline rule and a
 *  gutter. The rule is 1px at every tier (a hairline that shrinks is a hairline
 *  that disappears); the gutter is the ladder's own `--wgrid-word-gap`. */
const WORD_LIST_RULE_PX = 1;

/** Width the board is modelled against — the narrowest live full-width column
 *  the archetype ladder produces, exactly as map-panel and constrained-grid
 *  calibrate. This atom is `footprint: { cols: 2 }`: a letter grid plus its
 *  word list does not survive a half slot. */
const GRID_WIDTH_PX = 432;

function ladderFor(density) {
  return LADDER[densityVariant(density) || 'base'];
}
function monoAdvance(fsPx, metrics) {
  return advancePx(MONO_ADVANCE_RATIO * fsPx, fsPx, 'mono', metrics);
}
function bodyAdvance(fsPx, metrics) {
  return advancePx(BODY_ADVANCE_RATIO * fsPx, fsPx, 'body', metrics);
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * The word list.
 *
 * CROSS-FILE CONTRACT — mirrors renderWordList() below and the
 * `grid-template-columns: repeat(var(--wgrid-word-cols), 1fr)` rule in
 * booklet.css. Three fixed columns, so the row count is arithmetic; a word too
 * long for its column wraps, and that is the one wrapped term here.
 */
function wordListHeight(wordGrid, tier, metrics) {
  const words = asArray(wordGrid.words);
  if (!words.length) return 0;
  const cols = Math.max(1, tier.wordColsN);
  const colWidth = Math.max(24, (GRID_WIDTH_PX - (cols - 1) * tier.wordGapPx) / cols);
  const adv = monoAdvance(tier.wordFsPx, metrics);

  const rows = Math.ceil(words.length / cols);
  let total = 0;
  for (let r = 0; r < rows; r += 1) {
    // A CSS grid row is as tall as its tallest cell.
    let tallest = 1;
    for (let c = 0; c < cols; c += 1) {
      const entry = words[r * cols + c];
      if (!entry) continue;
      tallest = Math.max(tallest, wrappedLines(String(entry.word || '').length, colWidth, adv));
    }
    total += tallest * tier.wordLinePx;
  }
  // + the hairline and the gutter above the list (border-top + padding-top).
  return WORD_LIST_RULE_PX + tier.wordGapPx + total + Math.max(0, rows - 1) * tier.wordGapPx;
}

/** The letter board. Density-invariant in COLUMN count and shrinking only in
 *  cell size — the board is what the player rings, so its floor is a pencil
 *  floor, not a design preference. */
function boardHeight(wordGrid, tier) {
  const rows = asArray(wordGrid.grid).length;
  if (!rows) return 0;
  return rows * tier.cellPx + Math.max(0, rows - 1) * tier.gapPx;
}

/** Modelled zone height for one word grid at one ladder tier. */
function wordGridHeightAt(wordGrid, tier, metrics) {
  let height = TITLE_PX;

  const instruction = String(wordGrid.instruction || '');
  if (instruction) {
    height += wrappedLines(instruction.length, GRID_WIDTH_PX, bodyAdvance(tier.instrFsPx, metrics))
      * tier.instrLinePx + tier.blockGapPx;
  }

  height += boardHeight(wordGrid, tier);

  const list = wordListHeight(wordGrid, tier, metrics);
  if (list) height += tier.blockGapPx + list;

  // Ceil, not round — the constants are fractional pt→px conversions, and
  // rounding to nearest turns a handful of boards into sub-pixel
  // under-estimates the solver spends a revision pass discovering.
  return Math.ceil(height);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderBoard(wordGrid) {
  const board = make('div', 'wgrid-board');
  asArray(wordGrid.grid).forEach((row) => {
    const rowEl = make('div', 'wgrid-row');
    String(row).toUpperCase().split('').forEach((letter) => {
      rowEl.appendChild(make('div', 'wgrid-cell', letter));
    });
    board.appendChild(rowEl);
  });
  return board;
}

function renderWordList(wordGrid) {
  const list = make('ul', 'wgrid-words');
  asArray(wordGrid.words).forEach((entry) => {
    // The WORD only. `row`, `col` and `direction` are the answer key.
    list.appendChild(make('li', 'wgrid-word', String((entry || {}).word || '').toUpperCase()));
  });
  return list;
}

registerAtom('word-grid', {
  defaultSizeHint: 'half-page',
  canShare: true,
  pageAffinity: 'either',
  footprint: { cols: 2 },

  /**
   * minHeight is the ladder's floor (tight); preferredHeight is the height at
   * the density asked for. The gap between them is this board's real shrink
   * potential: six pixels of cell per row plus the word list's leading, and
   * nothing else. A 10×10 board gives back 60px and says 60px — it does not
   * promise a flat percentage it cannot deliver.
   */
  estimate(data, density, context) {
    const metrics = readTypeMetrics(context);
    const wordGrid = (data || {}).wordGrid || {};
    return {
      minHeight:       wordGridHeightAt(wordGrid, LADDER.tight, metrics),
      preferredHeight: wordGridHeightAt(wordGrid, ladderFor(density), metrics),
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const wordGrid = data.wordGrid || {};
    const artifactIdentity = data.artifactIdentity || {};

    const el = make('div', 'wgrid-zone');
    el.setAttribute('data-grid-kind', String(wordGrid.kind || 'word-search'));
    el.setAttribute('data-shell-family', artifactIdentity.shellFamily || 'field-survey');
    el.setAttribute('data-board-state-mode', artifactIdentity.boardStateMode || 'survey-grid');
    el.setAttribute('data-attachment-strategy', artifactIdentity.attachmentStrategy || 'split-technical');

    el.appendChild(make('div', 'puzzle-title', String(wordGrid.title || 'Word Hunt')));
    if (wordGrid.instruction) {
      el.appendChild(make('div', 'wgrid-instruction', String(wordGrid.instruction)));
    }
    el.appendChild(renderBoard(wordGrid));
    if (asArray(wordGrid.words).length) el.appendChild(renderWordList(wordGrid));

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'word-grid';
