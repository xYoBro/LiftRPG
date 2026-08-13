/**
 * constrained-grid.js — the deduction board (W5b)
 *
 * Two kinds under one atom, because they are the same printed object: a grid
 * of pencil cells with constraints printed beside it, whose completion yields
 * a code the economy reads.
 *
 *   logic-grid  subjects x category values; the player strikes and rings cells
 *   nonogram    run clues above and beside a grid; the player shades cells,
 *               and the characters printed inside the shaded ones are the key
 *
 * Data shape: { grid, weekIndex, totalWeeks, artifactIdentity }
 *
 * THE ANSWER KEY IS NEVER RENDERED. `grid.answer` and `grid.answerFrom` are
 * what contracts/puzzle-solvers.mjs checks the puzzle against at the
 * generation gate; printing them would put the solution next to the puzzle.
 * The only thing the page says about the answer is the authored
 * `instruction`, which tells the player HOW to read it.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { densityVariant } from '../engine/density-util.js';
import { make } from '../dom.js';
import { wrappedLines } from '../utils.js';
import { advancePx, readTypeMetrics } from '../type-metrics.js';

// ---------------------------------------------------------------------------
// Ladder mirror  ⇄  booklet.css `--cgrid-*` tokens
// ---------------------------------------------------------------------------
/**
 * CROSS-FILE CONTRACT — these numbers mirror the `--cgrid-*` token ladder in
 * renderer/booklet.css (the `.cgrid-zone` base block and the
 * `.cgrid-zone[data-density-variant="…"]` blocks). booklet.css carries the
 * reverse pointer, and `ladderMirrorHarness()` in scripts/validate.mjs parses
 * BOTH SIDES and asserts equality. **Change them together or the estimate
 * lies.**
 *
 * Why mirror instead of read: estimate() runs in phase 1, before any DOM
 * exists, so it cannot resolve a custom property. A token moved on one side
 * alone makes the solver's shrink math wrong in the confident direction — the
 * D71 defect class, which on a puzzle page costs the player a row of the grid
 * to `overflow:hidden`.
 *
 * Tier keys are exactly the variant names `densityVariant()` returns, so the
 * tier this estimate models is always the tier render() stamps onto the DOM.
 *
 * pt→px conversion is ×96/72; the line figures are (font-size × leading),
 * rounded to 0.1px exactly as the validator derives them.
 *
 * THE CELL HAS A PENCIL FLOOR. `--cgrid-cell` bottoms out at 14px, which is
 * the same floor the reckoning tally holds: a box you cannot put a legible ✗
 * in is not a saving, it is a smaller unusable box. The ladder's shrink comes
 * from the label columns, the clue leading and the block gaps — the chrome —
 * and from four pixels of cell, and it promises nothing more than that.
 */
const LADDER = {
  //          --cgrid-cell | --cgrid-gap | label/clue/instr size × leading
  base: {
    cellPx:       22,     // --cgrid-cell
    gapPx:        2,      // --cgrid-gap
    labelLinePx:  9.1,    // 5.6pt × 1.22
    labelFsPx:    7.47,   // 5.6pt — the size labelCharPx is measured at
    rowLabelPx:   96,     // --cgrid-row-label-w
    clueLinePx:   11.2,   // 6.3pt × 1.33
    clueFsPx:     8.40,   // 6.3pt
    clueGapPx:    3,      // --cgrid-clue-gap
    instrLinePx:  10.2,   // 5.9pt × 1.30
    instrFsPx:    7.87,   // 5.9pt
    blockGapPx:   6,      // --cgrid-block-gap
  },
  compact: {
    cellPx:       20,
    gapPx:        2,
    labelLinePx:  9.1,
    labelFsPx:    7.47,
    rowLabelPx:   92,
    clueLinePx:   11.2,
    clueFsPx:     8.40,
    clueGapPx:    3,
    instrLinePx:  10.2,
    instrFsPx:    7.87,
    blockGapPx:   5,
  },
  dense: {
    cellPx:       17,
    gapPx:        2,
    labelLinePx:  8.7,    // 5.6pt × 1.16
    labelFsPx:    7.47,
    rowLabelPx:   84,
    clueLinePx:   9.8,    // 5.9pt × 1.24
    clueFsPx:     7.87,
    clueGapPx:    2,
    instrLinePx:  8.9,    // 5.5pt × 1.22
    instrFsPx:    7.33,
    blockGapPx:   4,
  },
  tight: {
    cellPx:       14,     // the pencil floor
    gapPx:        1,
    labelLinePx:  7.8,    // 5.2pt × 1.12
    labelFsPx:    6.93,
    rowLabelPx:   72,
    clueLinePx:   8.8,    // 5.6pt × 1.18
    clueFsPx:     7.47,
    clueGapPx:    2,
    instrLinePx:  8.0,    // 5.2pt × 1.16
    instrFsPx:    6.93,
    blockGapPx:   3,
  },
};

/** `.puzzle-title` — the shared cipher/oracle heading class, ~2 wrapped lines
 *  plus its margin. Density-invariant, as it is for cipher-panel. */
const TITLE_PX = 26;

/**
 * Modelled per-character advances, at the calibration anchor.
 *
 * These are NOT new measurements. They are the ratio the corpus already
 * validated for the same faces at the same class of size — 0.60 of font-size
 * for untracked mono (Share Tech Mono's A of 0.5401 plus the same wrap slack
 * carried by map-panel's TRACK_LABEL_CHAR_PX 4.7/7.73 = 0.608 and
 * RK_ROW_CHAR_PX 4.16/6.93 = 0.600), and 0.50 for body serif (map-panel's
 * noteCharPx 4.05/8.13 = 0.498). Every one of them is corrected for the face
 * actually in use through advancePx(), so a book on IBM Plex Mono is modelled
 * at IBM Plex Mono's width rather than at pastoral's (D121).
 */
const MONO_ADVANCE_RATIO = 0.60;
const BODY_ADVANCE_RATIO = 0.50;

/** Left indent of a clue's text past its number. `.cgrid-clue` padding. */
const CLUE_INDENT_PX = 14;
/** `.ngram-row-clue` — width per printed run number, and its floor. */
const RUN_NUMBER_PX = 9;
const ROW_CLUE_MIN_PX = 18;

/**
 * Width the grid is modelled against.
 *
 * This atom declares `footprint: { cols: 2 }` — a deduction board needs the
 * page. 432px is the narrowest live column the archetype ladder produces
 * (5.5in − 2 × the 0.5in maximum `--page-margin` in theme.js), which is the
 * conservative full-width basis and the same one map-panel calibrates on.
 */
const GRID_WIDTH_PX = 432;

function ladderFor(density) {
  return LADDER[densityVariant(density) || 'base'];
}

function monoAdvance(tier, fsPx, metrics) {
  return advancePx(MONO_ADVANCE_RATIO * fsPx, fsPx, 'mono', metrics);
}
function bodyAdvance(fsPx, metrics) {
  return advancePx(BODY_ADVANCE_RATIO * fsPx, fsPx, 'body', metrics);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * The kinds that print a square of digit cells. They share a render, an
 * estimate and an answer rule; what differs is the furniture drawn inside the
 * cells (a sudoku's box rules, a kakuro's sums, a KenKen's cage borders), and
 * none of that furniture changes the geometry — every one of them is painted
 * inside a cell that already has its size. That is why they need no ladder
 * tokens of their own.
 */
const FILLED_GRID_KINDS = { sudoku: 1, kakuro: 1, kenken: 1 };

/**
 * The truth-teller board, expressed as a logic grid.
 *
 * It is not a logic grid MATHEMATICALLY — the roles are not a bijection with
 * the speakers, which is why it has its own solver — but it is exactly one
 * PRINTED: rows of names, two mark columns, and a numbered list of statements
 * underneath. So it borrows the logic grid's renderer and the logic grid's
 * estimate rather than growing a second pair that could disagree with each
 * other. Nothing new to mirror, nothing new to measure, and the two-line
 * shim below is the whole of the difference.
 *
 * The column headings come from `roleLabels`, which the book authors: the
 * printed page never says "TRUTH", because nothing printed in this book is the
 * engine talking.
 */
function truthTellerShim(grid) {
  const labels = grid.roleLabels || {};
  return {
    subjects: asArray(grid.speakers),
    categories: [{
      name: String(grid.axisLabel || ''),
      values: [String(labels.truth || ''), String(labels.lie || '')],
    }],
    clues: asArray(grid.statements).map((line) => ({
      text: `${String((line || {}).speaker || '')}: ${String((line || {}).text || '')}`,
    })),
  };
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * The logic grid's matrix.
 *
 * CROSS-FILE CONTRACT — mirrors renderLogicMatrix() below: the category band,
 * the column-label row, and one row per subject whose height is the greater of
 * the cell box and the wrapped row label. When the two disagree the failure is
 * silent clipping, not an error, so they are written adjacent on purpose.
 */
function logicMatrixHeight(grid, tier, metrics) {
  const subjects = asArray(grid.subjects);
  const cats = asArray(grid.categories);
  if (!subjects.length || !cats.length) return 0;

  const labelAdv = monoAdvance(tier, tier.labelFsPx, metrics);

  // Header: one line of category band, then the column labels wrapped to a
  // single cell's width (they are the narrowest text on the page).
  let colLabelLines = 1;
  cats.forEach((cat) => {
    asArray(cat.values).forEach((value) => {
      colLabelLines = Math.max(
        colLabelLines,
        wrappedLines(String(value).length, tier.cellPx, labelAdv),
      );
    });
  });
  const header = tier.labelLinePx + colLabelLines * tier.labelLinePx + tier.gapPx;

  // Body: a row is at least a cell tall, and taller when its label wraps.
  let body = 0;
  subjects.forEach((subject) => {
    const labelH = wrappedLines(String(subject).length, tier.rowLabelPx, labelAdv) * tier.labelLinePx;
    body += Math.max(tier.cellPx, labelH);
  });
  body += Math.max(0, subjects.length - 1) * tier.gapPx;

  return header + body;
}

/**
 * The nonogram's frame. Row clues sit to the LEFT and therefore cost width,
 * not height; only the column-clue band adds rows above the grid.
 *
 * CROSS-FILE CONTRACT — mirrors renderNonogram() below.
 */
function nonogramFrameHeight(grid, tier) {
  const rowClues = asArray(grid.rowClues);
  const colClues = asArray(grid.colClues);
  if (!rowClues.length || !colClues.length) return 0;

  let deepestColumn = 1;
  colClues.forEach((clue) => {
    deepestColumn = Math.max(deepestColumn, asArray(clue).length);
  });
  const band = deepestColumn * tier.labelLinePx + tier.gapPx;

  const rows = rowClues.length;
  const grid_ = rows * tier.cellPx + Math.max(0, rows - 1) * tier.gapPx;

  return band + grid_;
}

/** Every clue, numbered, wrapped to the content column. */
function cluesHeight(grid, tier, metrics) {
  const clues = asArray(grid.clues);
  if (!clues.length) return 0;
  const adv = bodyAdvance(tier.clueFsPx, metrics);
  const width = Math.max(40, GRID_WIDTH_PX - CLUE_INDENT_PX);
  let total = 0;
  clues.forEach((clue) => {
    total += wrappedLines(String((clue || {}).text || '').length, width, adv) * tier.clueLinePx;
  });
  return total + Math.max(0, clues.length - 1) * tier.clueGapPx;
}

/**
 * The filled grids' frame — sudoku, kakuro, KenKen.
 *
 * All three print the same object: a square of cells the player writes digits
 * into, with no label column and no clue list. The height is therefore exactly
 * the matrix, and the estimate is exact rather than modelled — there is no text
 * to wrap. Kakuro's sums and KenKen's cage targets are drawn INSIDE cells that
 * already have their height, so neither costs a row.
 *
 * CROSS-FILE CONTRACT — mirrors renderFilledGrid() below.
 */
function filledGridHeight(grid, tier) {
  const rows = filledGridRowCount(grid);
  if (!rows) return 0;
  return rows * tier.cellPx + Math.max(0, rows - 1) * tier.gapPx;
}

/** How many rows the printed board has, per kind. */
function filledGridRowCount(grid) {
  if (grid.kind === 'sudoku') {
    return Number(grid.boxWidth) * Number(grid.boxHeight) || asArray(grid.givens).length;
  }
  if (grid.kind === 'kakuro') return asArray(grid.layout).length;
  if (grid.kind === 'kenken') return Number(grid.size) || 0;
  return 0;
}

/** Modelled zone height for one constrained grid at one ladder tier. */
function gridHeightAt(grid, tier, metrics) {
  let height = TITLE_PX;

  const instruction = String(grid.instruction || '');
  if (instruction) {
    height += wrappedLines(instruction.length, GRID_WIDTH_PX, bodyAdvance(tier.instrFsPx, metrics))
      * tier.instrLinePx + tier.blockGapPx;
  }

  // AN EXPLICIT DISPATCH, NOT AN `else`. Until the arsenal wave this was a
  // binary — nonogram or "the logic grid path" — and a kind the enum gained
  // would have been modelled as a logic grid with no subjects: an estimate of
  // zero for a board that prints. The unknown kind now contributes the title
  // and the instruction and nothing else, which is what an atom that cannot
  // draw the body honestly costs.
  if (grid.kind === 'nonogram') {
    height += nonogramFrameHeight(grid, tier);
  } else if (FILLED_GRID_KINDS[grid.kind]) {
    height += filledGridHeight(grid, tier);
  } else {
    // The logic grid, and the truth-teller board through its shim — one code
    // path on purpose, so the two cannot drift apart in the estimate.
    const shaped = grid.kind === 'truth-tellers' ? truthTellerShim(grid) : grid;
    height += logicMatrixHeight(shaped, tier, metrics);
    const clues = cluesHeight(shaped, tier, metrics);
    if (clues) height += tier.blockGapPx + clues;
  }

  // Ceil, not round: the constants above are fractional pt→px conversions, and
  // rounding to nearest turns a handful of grids into sub-pixel
  // under-estimates — which the solver spends a revision pass discovering.
  return Math.ceil(height);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderLogicMatrix(grid) {
  const subjects = asArray(grid.subjects);
  const cats = asArray(grid.categories);
  const matrix = make('div', 'cgrid-matrix');

  // Category band — one label per group, spanning its own values.
  const band = make('div', 'cgrid-band');
  band.appendChild(make('div', 'cgrid-corner'));
  cats.forEach((cat) => {
    const span = Math.max(1, asArray(cat.values).length);
    const el = make('div', 'cgrid-cat', String((cat || {}).name || ''));
    el.style.setProperty('--cgrid-span', String(span));
    band.appendChild(el);
  });
  matrix.appendChild(band);

  // Column labels.
  const head = make('div', 'cgrid-head');
  head.appendChild(make('div', 'cgrid-corner'));
  cats.forEach((cat) => {
    asArray(cat.values).forEach((value) => {
      head.appendChild(make('div', 'cgrid-col-label', String(value)));
    });
  });
  matrix.appendChild(head);

  // One row per subject.
  subjects.forEach((subject) => {
    const row = make('div', 'cgrid-row');
    row.appendChild(make('div', 'cgrid-row-label', String(subject)));
    cats.forEach((cat) => {
      asArray(cat.values).forEach(() => {
        row.appendChild(make('div', 'cgrid-cell'));
      });
    });
    matrix.appendChild(row);
  });

  return matrix;
}

function renderNonogram(grid) {
  const rowClues = asArray(grid.rowClues);
  const colClues = asArray(grid.colClues);
  const letters = asArray(grid.letterGrid);
  const frame = make('div', 'ngram');

  const band = make('div', 'ngram-band');
  band.appendChild(make('div', 'cgrid-corner'));
  colClues.forEach((clue) => {
    const cell = make('div', 'ngram-col-clue');
    asArray(clue).forEach((run) => {
      cell.appendChild(make('span', 'ngram-run', String(run)));
    });
    band.appendChild(cell);
  });
  frame.appendChild(band);

  rowClues.forEach((clue, r) => {
    const row = make('div', 'ngram-row');
    row.appendChild(make('div', 'ngram-row-clue', asArray(clue).join(' ')));
    const letterRow = String(letters[r] || '');
    colClues.forEach((_col, c) => {
      const ch = letterRow.charAt(c);
      // `.` is the schema's "this cell carries no character" — it is a hole in
      // the key, not a printed full stop.
      row.appendChild(make('div', 'cgrid-cell ngram-cell', ch && ch !== '.' ? ch : ''));
    });
    frame.appendChild(row);
  });

  return frame;
}

/**
 * The operator a cage prints. Words on the wire, glyphs on the page — the enum
 * has to survive JSON, a prompt menu and a parity scan that reads lowercase
 * tokens, and the player has to see the sign every printed KenKen uses.
 */
const CAGE_GLYPH = {
  add: '+', subtract: '−', multiply: '×', divide: '÷', fixed: ''
};

/**
 * The filled grids — sudoku, kakuro, KenKen.
 *
 * CROSS-FILE CONTRACT — mirrors filledGridHeight() above: one row of cells per
 * board row and nothing else in the vertical. Every piece of furniture here
 * (box rules, sum numbers, cage borders and targets) is painted INSIDE a cell
 * that already has its height, or is a border on a `box-sizing: border-box`
 * cell, so none of it can move the geometry the estimate promised. Keep it that
 * way: a sum printed ABOVE the grid instead of inside its block cell would be
 * the D71 defect class with a friendly face.
 *
 * The cells are the same `.cgrid-cell` the logic grid uses, so the pencil floor
 * and the write-in aperture are inherited rather than re-declared.
 */
function renderFilledGrid(grid) {
  const frame = make('div', 'fgrid');
  const rows = filledGridRowCount(grid);
  if (!rows) return frame;

  if (grid.kind === 'sudoku') {
    const bw = Number(grid.boxWidth);
    const bh = Number(grid.boxHeight);
    const givens = asArray(grid.givens);
    for (let r = 0; r < rows; r++) {
      const line = make('div', 'fgrid-row');
      const text = String(givens[r] || '');
      for (let c = 0; c < rows; c++) {
        const ch = text.charAt(c);
        const cls = ['cgrid-cell', 'fgrid-cell'];
        if (ch && ch !== '.') cls.push('fgrid-given');
        if (bw && (c + 1) % bw === 0 && c !== rows - 1) cls.push('fgrid-box-r');
        if (bh && (r + 1) % bh === 0 && r !== rows - 1) cls.push('fgrid-box-b');
        line.appendChild(make('div', cls.join(' '), ch && ch !== '.' ? ch : ''));
      }
      frame.appendChild(line);
    }
    return frame;
  }

  if (grid.kind === 'kakuro') {
    const layout = asArray(grid.layout).map(String);
    const width = layout.length ? layout[0].length : 0;
    const byCell = {};
    asArray(grid.sums).forEach((entry) => {
      byCell[(Number(entry.row) - 1) + ':' + (Number(entry.col) - 1)] = entry || {};
    });
    for (let r = 0; r < rows; r++) {
      const line = make('div', 'fgrid-row');
      for (let c = 0; c < width; c++) {
        if (layout[r].charAt(c) !== '#') {
          line.appendChild(make('div', 'cgrid-cell fgrid-cell'));
          continue;
        }
        const block = make('div', 'cgrid-cell fgrid-cell fgrid-block');
        const sum = byCell[r + ':' + c];
        if (sum && sum.right != null) {
          block.appendChild(make('span', 'fgrid-sum fgrid-sum-right', String(sum.right)));
        }
        if (sum && sum.down != null) {
          block.appendChild(make('span', 'fgrid-sum fgrid-sum-down', String(sum.down)));
        }
        if (sum && (sum.right != null || sum.down != null)) block.classList.add('fgrid-block-clued');
        line.appendChild(block);
      }
      frame.appendChild(line);
    }
    return frame;
  }

  // KenKen: a heavy border wherever a cell's neighbour belongs to another cage,
  // and the target printed in the cage's first cell reading order.
  const size = rows;
  const owner = new Array(size * size).fill(-1);
  const cages = asArray(grid.cages);
  cages.forEach((cage, k) => {
    asArray((cage || {}).cells).forEach((cell) => {
      const idx = (Number(cell.row) - 1) * size + (Number(cell.col) - 1);
      if (idx >= 0 && idx < owner.length) owner[idx] = k;
    });
  });
  const anchor = {};
  for (let i = 0; i < owner.length; i++) {
    if (owner[i] !== -1 && anchor[owner[i]] === undefined) anchor[owner[i]] = i;
  }
  for (let r = 0; r < size; r++) {
    const line = make('div', 'fgrid-row');
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      const k = owner[idx];
      const cls = ['cgrid-cell', 'fgrid-cell'];
      if (c === 0 || owner[idx - 1] !== k) cls.push('fgrid-cage-l');
      if (c === size - 1 || owner[idx + 1] !== k) cls.push('fgrid-cage-r');
      if (r === 0 || owner[idx - size] !== k) cls.push('fgrid-cage-t');
      if (r === size - 1 || owner[idx + size] !== k) cls.push('fgrid-cage-b');
      const cell = make('div', cls.join(' '));
      if (k !== -1 && anchor[k] === idx) {
        const cage = cages[k] || {};
        cell.appendChild(make('span', 'fgrid-target',
          String(cage.target == null ? '' : cage.target) + (CAGE_GLYPH[cage.operation] || '')));
      }
      line.appendChild(cell);
    }
    frame.appendChild(line);
  }
  return frame;
}

registerAtom('constrained-grid', {
  defaultSizeHint: 'half-page',
  canShare: true,
  pageAffinity: 'either',
  footprint: { cols: 2 },

  /**
   * minHeight is the ladder's floor (tight); preferredHeight is the height at
   * the density asked for. The gap between them is this grid's real shrink
   * potential, and it is honest about being small: the cells are what the
   * player writes in, so most of a puzzle page cannot compress. A five-subject
   * two-category grid gives back 5 × 8px of cell plus the label and clue
   * leading, and says so — it does not promise a flat 15%.
   */
  estimate(data, density, context) {
    const metrics = readTypeMetrics(context);
    const grid = (data || {}).grid || {};
    return {
      minHeight:       gridHeightAt(grid, LADDER.tight, metrics),
      preferredHeight: gridHeightAt(grid, ladderFor(density), metrics),
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const grid = data.grid || {};
    const artifactIdentity = data.artifactIdentity || {};

    const el = make('div', 'cgrid-zone');
    el.setAttribute('data-grid-kind', String(grid.kind || 'logic-grid'));
    el.setAttribute('data-shell-family', artifactIdentity.shellFamily || 'field-survey');
    el.setAttribute('data-board-state-mode', artifactIdentity.boardStateMode || 'survey-grid');
    el.setAttribute('data-attachment-strategy', artifactIdentity.attachmentStrategy || 'split-technical');

    el.appendChild(make('div', 'puzzle-title', String(grid.title || 'Deduction')));
    if (grid.instruction) {
      el.appendChild(make('div', 'cgrid-instruction', String(grid.instruction)));
    }

    // The same explicit dispatch estimate() uses, and it has to be the same or
    // the two disagree about which body is drawn — which is the one divergence
    // this atom cannot survive, since measurement and render read this function
    // and that one respectively.
    if (grid.kind === 'nonogram') {
      el.appendChild(renderNonogram(grid));
    } else if (FILLED_GRID_KINDS[grid.kind]) {
      el.appendChild(renderFilledGrid(grid));
    } else {
      const shaped = grid.kind === 'truth-tellers' ? truthTellerShim(grid) : grid;
      el.appendChild(renderLogicMatrix(shaped));
      const clues = asArray(shaped.clues);
      if (clues.length) {
        const list = make('ol', 'cgrid-clues');
        clues.forEach((clue) => {
          list.appendChild(make('li', 'cgrid-clue', String((clue || {}).text || '')));
        });
        el.appendChild(list);
      }
    }

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'constrained-grid';
