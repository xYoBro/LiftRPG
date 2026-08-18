/**
 * word-grid.js — the letter hunt and the woven grid (W5b · W7.5)
 *
 * TWO KINDS, ONE ATOM.
 *
 *   'word-search'  a printed grid of letters and the list of words hidden in
 *                  it. The player rings what they find; depending on the
 *                  puzzle, the answer is one of the words or the letters
 *                  nobody ringed.
 *   'crossword'    a woven grid the player WRITES into, plus two clue lists.
 *                  VISION §4.2's ratified split: the loom builds the grid, the
 *                  model writes the clues. The model authors only
 *                  `wordGrid.entries` (a pool of answer/clue pairs);
 *                  `buildCrossword()` in contracts/puzzle-solvers.mjs weaves
 *                  `wordGrid.skeleton` and assembly stamps it on.
 *
 * Data shape: { wordGrid, weekIndex, totalWeeks, artifactIdentity }
 *
 * ── THE ANSWER KEY IS NEVER RENDERED (D198) ────────────────────────────────
 *
 * For a word search: `wordGrid.words[].row/col/direction` is the placement set
 * — the thing contracts/puzzle-solvers.mjs checks the grid against — and
 * `wordGrid.answer` is what the seal wants. This atom prints the grid and the
 * WORDS, and nothing else about them: printing a coordinate beside a word is
 * printing the solution beside the puzzle.
 *
 * For a crossword the same rule is enforced STRUCTURALLY rather than by
 * discipline, because a crossword skeleton is the first DERIVED field in this
 * schema that must print:
 *
 *   skeleton.mask     '#' block / '.' writable  →  PRINTED (it is the puzzle)
 *   skeleton.entries  slot positions + numbers  →  PRINTED (the clue hangers)
 *   skeleton.marked   shaded squares            →  PRINTED
 *   skeleton.fill     the solved letters        →  THE ANSWER KEY. NEVER.
 *
 * `skeleton.fill` IS NOT READ ANYWHERE IN THIS FILE — not to draw, not to
 * count, not to size. Grep it: the identifier appears only in comments. The
 * mask carries every geometry fact the render and the estimate need, which is
 * what keeps "solvability data is non-printing" true by construction instead
 * of by a comment. `entries[].answer` is read for `.length` and nothing else:
 * an enumeration is what a crossword gives its player; the word is not.
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
 * ── THE CROSSWORD'S OWN ARITHMETIC (`xw*`, W7.5) ───────────────────────────
 *
 * A crossword cell is a WRITING surface; a word-search cell is a RINGING
 * surface. The player puts a pencilled capital inside the first one and draws a
 * loop around the second, so they cannot share a ladder: `--wgrid-cell` runs
 * 20 → 14px and a 14px box will not take a legible hand-written letter. The
 * crossword runs 26 → 20px and its floor IS the word search's ceiling, which is
 * the honest way to say "this is the smaller of the two jobs".
 *
 *   THE 15-COLUMN FIT, CHECKED RATHER THAN ASSUMED. `SPATIAL_GUARDRAILS
 *   .crossword.maxSize` is 15 and the modelled column is GRID_WIDTH_PX = 432:
 *     base    15 × 26 + 14 × 1 = 404px   (28px of slack)
 *     tight   15 × 20 + 14 × 1 = 314px
 *   So the widest legal weave fits at every tier with the cell at its pencil
 *   floor. Raising `xwCellPx` above 27 would break that silently — the board
 *   would simply run off the paper, which is not an overflow the page budget
 *   can see.
 *
 * `xwClueColsN` is the same argument as `wordColsN`, one step further. The clue
 * region is TWO fixed columns and the two lists are one list each: ACROSS in
 * the first, DOWN in the second. Two, not three, because a clue is a SENTENCE
 * where a hidden word is a token — a third column puts prose in a ~140px
 * measure and every clue wraps to four lines. And one list per column rather
 * than both lists flowed together because the player addresses them separately
 * ("six across"), so the region's height is max(across, down) — a number the
 * estimate computes from the entry lists, never from a track count the
 * container decides at a width phase-1 does not know.
 *
 * There is deliberately no crossword LETTER term and no crossword NUMBER term.
 * The cells are empty (the player fills them) and the corner number is
 * absolutely positioned inside its cell, exactly as `.fgrid-target` is — so
 * `--wgrid-xw-num-size` moves the look and never the geometry, the same
 * exclusion `--wgrid-letter-size` carries above. The clue-list HEAD borrows
 * `--wgrid-instr-*`: it is the same quiet-label register as the instruction and
 * it never wraps, so it carries a LINE and no advance, and a second size token
 * for one number with no second reason to move is a second author.
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
    xwCellPx:     26,    // --wgrid-xw-cell
    xwClueLinePx: 10.9,  // 6.3pt × 1.30
    xwClueFsPx:   8.40,  // 6.3pt
    xwClueGapPx:  3,     // --wgrid-xw-clue-gap
    xwClueColsN:  2,     // --wgrid-xw-clue-cols
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
    xwCellPx:     24,
    xwClueLinePx: 10.9,
    xwClueFsPx:   8.40,
    xwClueGapPx:  3,
    xwClueColsN:  2,
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
    xwCellPx:     22,
    xwClueLinePx: 9.8,   // 5.9pt × 1.24
    xwClueFsPx:   7.87,
    xwClueGapPx:  2,
    xwClueColsN:  2,
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
    // The WRITING floor, and it is a different floor from the ringing one
    // above: 20px is the smallest box a pencilled capital survives in.
    xwCellPx:     20,
    xwClueLinePx: 8.8,   // 5.6pt × 1.18
    xwClueFsPx:   7.47,
    xwClueGapPx:  2,
    xwClueColsN:  2,
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
/** The kind switch. Absent kind is a word search — the field predates the
 *  crossword and every pre-W7.5 book omits it. */
function isCrossword(wordGrid) {
  return String((wordGrid || {}).kind || '') === 'crossword';
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
// Crossword geometry
// ---------------------------------------------------------------------------

/**
 * ONE HOME FOR THE PRINTED CLUE LINE — the estimate charges the characters the
 * render draws, because it is literally the same string.
 *
 * The enumeration is the answer's LENGTH and the answer itself never appears.
 * A crossword hands its player a clue and a count; handing them the word would
 * be the word-search's coordinate-beside-the-word defect in a second family.
 */
function crosswordClueLine(number, entry) {
  const clue = String((entry || {}).clue || '');
  const length = String((entry || {}).answer || '').length;
  const label = Number.isFinite(number) ? `${number}. ` : '';
  return length ? `${label}${clue} (${length})` : `${label}${clue}`;
}

/**
 * The two clue lists, resolved, in printed order.
 *
 * `skeleton.entries[].index` is 1-based into the authored pool — that is how a
 * woven slot finds the clue it prints and the length it enumerates. Slots the
 * loom dropped are simply not in `skeleton.entries`, so the printed list is
 * exactly the subset that made it into the grid.
 *
 * `skeleton.fill` is not consulted. It is the answer key (D198).
 */
function crosswordLists(wordGrid) {
  const pool = asArray(wordGrid.entries);
  const slots = asArray((wordGrid.skeleton || {}).entries);
  const lists = { across: [], down: [] };
  slots.forEach((raw) => {
    const slot = raw || {};
    const number = Number.isFinite(slot.number) ? slot.number : null;
    const key = String(slot.direction) === 'down' ? 'down' : 'across';
    lists[key].push({
      number,
      text: crosswordClueLine(number, pool[Number(slot.index) - 1]),
    });
  });
  // Stable when a slot carries no number (the field is optional in the
  // schema): an unnumbered slot keeps the loom's own order rather than being
  // shuffled to the front by a NaN comparison.
  const byNumber = (a, b) => (a.number == null || b.number == null ? 0 : a.number - b.number);
  lists.across.sort(byNumber);
  lists.down.sort(byNumber);
  return lists;
}

/**
 * The woven board. Its row count comes from `mask` — the printed shape — so
 * the estimate and the render agree by reading the same array.
 */
function crosswordBoardHeight(wordGrid, tier) {
  const rows = asArray((wordGrid.skeleton || {}).mask).length;
  if (!rows) return 0;
  return rows * tier.xwCellPx + Math.max(0, rows - 1) * tier.gapPx;
}

/**
 * The clue region.
 *
 * CROSS-FILE CONTRACT — mirrors renderCrosswordClues() below and the
 * `grid-template-columns: repeat(var(--wgrid-xw-clue-cols), 1fr)` rule in
 * booklet.css. Two fixed columns holding one list each, so the region is ONE
 * grid row whose height is the taller of the two lists — `align-items: start`
 * on the CSS side is what makes that true rather than hoped.
 *
 * Each list is a flex column with `gap`, and its children are the head plus n
 * clues — so n+1 children and therefore n gaps, not n-1. Getting that off by
 * one is a whole clue's leading on a fifteen-clue list.
 */
function crosswordCluesHeight(wordGrid, tier, metrics) {
  const lists = crosswordLists(wordGrid);
  const cols = Math.max(1, tier.xwClueColsN);
  const colWidth = Math.max(24, (GRID_WIDTH_PX - (cols - 1) * tier.xwClueGapPx) / cols);
  const adv = bodyAdvance(tier.xwClueFsPx, metrics);

  let tallest = 0;
  ['across', 'down'].forEach((key) => {
    const list = lists[key];
    if (!list.length) return;
    let height = tier.instrLinePx;           // the direction head
    list.forEach((item) => {
      height += wrappedLines(item.text.length, colWidth, adv) * tier.xwClueLinePx;
    });
    height += list.length * tier.xwClueGapPx;
    tallest = Math.max(tallest, height);
  });
  if (!tallest) return 0;
  // + the hairline and the gutter above the region (border-top + padding-top),
  // the same chrome the word list carries.
  return WORD_LIST_RULE_PX + tier.xwClueGapPx + tallest;
}

/** Modelled zone height for one crossword at one ladder tier. */
function crosswordHeightAt(wordGrid, tier, metrics) {
  let height = TITLE_PX;

  const instruction = String(wordGrid.instruction || '');
  if (instruction) {
    height += wrappedLines(instruction.length, GRID_WIDTH_PX, bodyAdvance(tier.instrFsPx, metrics))
      * tier.instrLinePx + tier.blockGapPx;
  }

  height += crosswordBoardHeight(wordGrid, tier);

  const clues = crosswordCluesHeight(wordGrid, tier, metrics);
  if (clues) height += tier.blockGapPx + clues;

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

/**
 * The woven board.
 *
 * READS `mask`, `entries` (for the corner numbers) AND `marked`. Does not read
 * `fill`. A cell is drawn from its mask character alone: '#' is a block, and
 * everything else is an aperture the player writes in — so there is no code
 * path here through which a solved letter could reach the DOM (D198).
 */
function renderCrosswordBoard(wordGrid) {
  const skeleton = wordGrid.skeleton || {};
  const mask = asArray(skeleton.mask);
  if (!mask.length) return null;

  // Where a number sits, and which one. An across and a down entry starting in
  // the same cell share a number, so the lower wins rather than the last read.
  const numbers = new Map();
  asArray(skeleton.entries).forEach((raw) => {
    const slot = raw || {};
    if (!Number.isFinite(slot.number)) return;
    const key = `${slot.row},${slot.col}`;
    const prior = numbers.get(key);
    if (prior == null || slot.number < prior) numbers.set(key, slot.number);
  });
  const marked = new Set(
    asArray(skeleton.marked).map((m) => `${(m || {}).row},${(m || {}).col}`),
  );

  const board = make('div', 'wgrid-xw-board');
  mask.forEach((maskRow, r) => {
    const rowEl = make('div', 'wgrid-xw-row');
    String(maskRow).split('').forEach((mark, c) => {
      const key = `${r + 1},${c + 1}`;
      if (mark === '#') {
        rowEl.appendChild(make('div', 'wgrid-xw-cell wgrid-xw-block'));
        return;
      }
      const cell = make('div', marked.has(key)
        ? 'wgrid-xw-cell wgrid-xw-marked'
        : 'wgrid-xw-cell');
      const number = numbers.get(key);
      if (number != null) cell.appendChild(make('div', 'wgrid-xw-num', String(number)));
      rowEl.appendChild(cell);
    });
    board.appendChild(rowEl);
  });
  return board;
}

/**
 * The two clue lists, side by side.
 *
 * The head is the schema's own direction value (`VALID_CROSSWORD_DIRECTIONS`)
 * in capitals, not English this atom invented. A crossword prints two lists and
 * the player has to be able to say which one a number belongs to; the label IS
 * that distinction, the way the word search's list is its words. Nothing else
 * on this surface is the engine talking.
 */
function renderCrosswordClues(wordGrid) {
  const lists = crosswordLists(wordGrid);
  const wrap = make('div', 'wgrid-xw-clues');
  ['across', 'down'].forEach((key) => {
    const list = lists[key];
    if (!list.length) return;
    const column = make('div', 'wgrid-xw-list');
    column.setAttribute('data-direction', key);
    column.appendChild(make('div', 'wgrid-xw-list-head', key.toUpperCase()));
    // The CLUE and the enumeration. Never `entries[].answer`, never a
    // coordinate, never anything out of `skeleton.fill`.
    list.forEach((item) => column.appendChild(make('div', 'wgrid-xw-clue', item.text)));
    wrap.appendChild(column);
  });
  return wrap.children.length ? wrap : null;
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
    // Two kinds, two arithmetics, one dispatch. A word search takes the exact
    // path it took before the crossword existed — same function, same
    // arguments — so its numbers are unchanged by construction.
    const heightAt = isCrossword(wordGrid) ? crosswordHeightAt : wordGridHeightAt;
    return {
      minHeight:       heightAt(wordGrid, LADDER.tight, metrics),
      preferredHeight: heightAt(wordGrid, ladderFor(density), metrics),
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
    if (isCrossword(wordGrid)) {
      const board = renderCrosswordBoard(wordGrid);
      if (board) el.appendChild(board);
      const clues = renderCrosswordClues(wordGrid);
      if (clues) el.appendChild(clues);
    } else {
      el.appendChild(renderBoard(wordGrid));
      if (asArray(wordGrid.words).length) el.appendChild(renderWordList(wordGrid));
    }

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'word-grid';
