/**
 * ledger-spread.js — The Ledger (salvage seed 8: "the body, audited")
 *
 * The closing spread. One row per movement in the program's roster, three
 * pencil columns: the first mark, the best mark reached, and the difference
 * between them. Nothing on this page is printed by the engine — the player
 * prints the middle of the book, and six weeks later the page is evidence they
 * existed.
 *
 * It is the mark economy's capstone (D89 family), which is why the adapter
 * emits it only for a booklet that runs one: a ledger in a book with nothing
 * to bank is a form with no filing system behind it.
 *
 * Data shape: { movements: string[], partIndex, partCount, economy }
 *   `movements` is the roster the adapter derived — the atom never reaches
 *   back into weeks or sessions, so estimate() stays a pure function of its
 *   own data (the reckoning-panel rule).
 *
 * Full-page atom. render() returns the full page element.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { make } from '../dom.js';
import { createBoundedPage } from '../page-shell.js';
import { PAGE_BUDGET } from '../engine/page-spec.js';

// ---------------------------------------------------------------------------
// Geometry  ⇄  booklet.css `.ledger-*` blocks
// ---------------------------------------------------------------------------
/**
 * CROSS-FILE CONTRACT — these numbers mirror the `.ledger-page`, `.ledger-lede`,
 * `.ledger-head`, `.ledger-row` and `.ledger-cell` rules in
 * renderer/booklet.css, which carries the reverse pointer. Phase-1 estimation
 * has no DOM and cannot resolve a custom property, so the numbers live twice.
 * **Change them together or the estimate lies** (D71).
 *
 * DENSITY-INVARIANT, and the reason is the same one that pins the mark box and
 * the reckoning tally at 15px: every cell on this page is a place a pencil has
 * to land, and a ledger row too short to write a number in is not a saving. No
 * `[data-density-variant]` rule reaches any of these elements, so the model
 * reports one height at every tier — there is no ladder here because there is
 * nothing on the ladder.
 *
 * WHAT DOES MOVE is the row height, and it moves with the ROSTER, not with
 * density: `ledgerRowHeightPx()` divides the page's writing budget among the
 * movements the book actually has, floored at a pencil size and capped so a
 * four-movement program does not print four hotel-register bands. Both the
 * estimate and render() call that one function — render() only stamps its
 * result into `--ledger-row-height` — so the page cannot render at a height
 * the estimate did not predict.
 *
 *   HEADER_PX   `.rp-header` line box (5.7pt at the inherited leading, worst
 *               case) + padding-bottom 2 + rule 1 + margin-bottom 3.
 *   LEDE_PX     `.ledger-lede`, two lines at 6pt × 1.35, + margin-bottom 6.
 *               Two lines is the printed truth for the instruction below, not
 *               a wrap estimate: the string is house chrome, not authored
 *               content, so it is fixed and can be measured once.
 *   HEAD_ROW_PX `.ledger-head` 5.2pt × 1.3 + padding-bottom 3 + rule 1 +
 *               margin-bottom 4.
 *   ROW_MIN_PX  the pencil floor: a 15px writing zone plus the row's 3px of
 *               padding. Below this the column is unusable in a gym.
 *   ROW_MAX_PX  the modelled band — what the row asks for as its `min-height`.
 *   ROW_GROWTH_CAP_PX  how tall flex growth may then take that row. See below.
 */
const HEADER_PX = 16.6;
const LEDE_PX = 27.6;      // 2 × 10.8 + 6
const HEAD_ROW_PX = 14.8;  // 6.8 + 3 + 1 + 4
const ROW_GAP_PX = 4;
const ROW_MIN_PX = 18;
const ROW_MAX_PX = 34;

/**
 * THE ROW GROWTH CEILING (W5 — decider ruling, author-overturnable).
 *
 * `.ledger-row` is `flex: 1 1 auto` inside a `.ledger-table` that is `flex: 1`,
 * so before this constant existed the rows did not stop at ROW_MAX_PX at all —
 * they shared out the ENTIRE writing budget. Measured on the proving-run book,
 * whose roster is five movements: the modelled band is 34px and the rows
 * printed at ~136px each, with `.ledger-name`'s `align-items: flex-end`
 * dropping every movement label roughly 130px below the column head it belongs
 * to. The documented intent ("a four-movement program does not print four
 * hotel-register bands") was already written into ledgerRowHeightPx(); the CSS
 * simply never honoured it, because a `min-height` cannot stop a flex item from
 * GROWING — only a `max-height` can.
 *
 * That was also a measurement-equals-render break in this atom's own numbers:
 * estimate() priced five rows at 34px and the page printed them at 136px.
 *
 * The ruling caps growth at twice the modelled band. Two constants, one
 * author: ledgerRowHeightPx() is the floor the row asks for and
 * ledgerRowPrintedHeightPx() is what it prints at, and render() stamps BOTH as
 * custom properties so booklet.css never writes either number itself.
 *
 * WHAT THE CAP COSTS, stated rather than hidden: a short roster no longer
 * fills the sheet. Five movements at 68px use 356 of the 682px writing budget,
 * so ~326px of the ledger page is now trailing white space. That is the write-in
 * law winning over the fill law, which is the ruling, not an accident — if the
 * author would rather have the full-bleed bands back, this one constant is the
 * whole rewind seam.
 */
const ROW_GROWTH_CAP_PX = ROW_MAX_PX * 2;

/** Everything above the first movement row. */
const LEDGER_CHROME_PX = HEADER_PX + LEDE_PX + HEAD_ROW_PX;

/** Height left for movement rows on one ledger page. */
const LEDGER_BODY_BUDGET_PX = PAGE_BUDGET.heightPx - LEDGER_CHROME_PX;

/** What the geometry above actually allows: rows at the pencil floor, gaps
 *  included, inside the page's writing budget. */
const DERIVED_ROWS_PER_PAGE = Math.max(1, Math.floor(
  (LEDGER_BODY_BUDGET_PX + ROW_GAP_PX) / (ROW_MIN_PX + ROW_GAP_PX),
));

/**
 * Movements one ledger page can carry before its rows drop below the pencil
 * floor. The adapter imports this to chunk a long roster across pages, so a
 * roster longer than one sheet becomes two ledger pages rather than one
 * unsatisfiable one.
 *
 * DERIVATION (741 − 59.0 chrome = 682 of writing budget):
 *   floor((682 + 4) / (18 + 4)) = floor(31.18) = 31
 *
 * PINNED AS A LITERAL because it has a mirror outside this module tree:
 * `scripts/check-layout-regressions.js` plans the corpus in Node, where these
 * ES modules cannot be imported, and validate.mjs asserts the two literals are
 * equal (the STANDALONE_MIN_CHARS pattern — that pair diverged 900 vs 950 and
 * nothing noticed for months). A computed export would leave the mirror with
 * nothing to be checked against.
 *
 * The literal cannot silently drift from the geometry it claims to summarise
 * either: the guard below re-derives it at module load. Raising ROW_MIN_PX and
 * forgetting this number would otherwise hand the adapter 31 rows for a page
 * that fits 26 — content clipped inside a page whose estimate was clamped to
 * the budget, which is the silent-overflow class this project exists to refuse.
 */
export const LEDGER_ROWS_PER_PAGE = 31;

if (LEDGER_ROWS_PER_PAGE !== DERIVED_ROWS_PER_PAGE) {
  console.error(
    '[ledger] LEDGER_ROWS_PER_PAGE is pinned at ' + LEDGER_ROWS_PER_PAGE
    + ' but the row geometry in this file yields ' + DERIVED_ROWS_PER_PAGE
    + ' — recompute the pinned literal and its mirror in '
    + 'scripts/check-layout-regressions.js before the ledger clips.',
  );
}

/**
 * The height one movement row takes on a page carrying `rowCount` of them.
 *
 * Pure arithmetic over a single integer, so estimate() and render() reach the
 * same number without a DOM between them. A short roster gets generous bands
 * (the page is a writing surface, and a four-row table stranded at the top of
 * a sheet reads as an unfinished page rather than a spacious one); a long
 * roster compacts to the floor and stops.
 *
 * @param {number} rowCount
 * @returns {number} px
 */
export function ledgerRowHeightPx(rowCount) {
  return clampFairShare(rowCount, ROW_MAX_PX);
}

/**
 * The height one movement row actually PRINTS at on a page carrying
 * `rowCount` of them — the modelled band grown by `.ledger-row`'s `flex:1 1
 * auto` and stopped by ROW_GROWTH_CAP_PX.
 *
 * This is the number estimate() must price, because it is the number the page
 * renders. Same fair-share arithmetic as the floor above, different ceiling:
 * one function, two ceilings, so the floor and the printed height can never be
 * derived by two different rules.
 *
 * @param {number} rowCount
 * @returns {number} px
 */
export function ledgerRowPrintedHeightPx(rowCount) {
  return clampFairShare(rowCount, ROW_GROWTH_CAP_PX);
}

/** The shared arithmetic: an equal share of the writing budget, floored at the
 *  pencil minimum and capped at whichever ceiling the caller is asking about. */
function clampFairShare(rowCount, ceilingPx) {
  const rows = Number.isFinite(rowCount) ? Math.max(0, Math.floor(rowCount)) : 0;
  if (rows <= 0) return ROW_MIN_PX;

  const available = LEDGER_BODY_BUDGET_PX - (rows - 1) * ROW_GAP_PX;
  const fair = Math.floor(available / rows);
  return Math.max(ROW_MIN_PX, Math.min(ceilingPx, fair));
}

/** The printed roster for this page — trimmed, blanks dropped. */
function movementsOf(data) {
  const raw = Array.isArray((data || {}).movements) ? data.movements : [];
  return raw.map((name) => String(name || '').trim()).filter(Boolean);
}

/** Modelled page height for a roster of `rows` movements. */
function ledgerHeightAt(rows) {
  if (rows <= 0) return Math.round(LEDGER_CHROME_PX);

  // The PRINTED height, not the modelled floor: the rows grow past their
  // min-height up to the growth cap, and pricing the floor here is what let a
  // five-movement page estimate at 245px and print at 741px.
  const height = LEDGER_CHROME_PX
    + rows * ledgerRowPrintedHeightPx(rows)
    + (rows - 1) * ROW_GAP_PX;

  // The adapter's chunking keeps this under the budget; the clamp is the belt
  // that makes a mis-chunked page impossible to turn into an unresolvable one.
  return Math.round(Math.min(height, PAGE_BUDGET.heightPx));
}

/** Column headings. Words, not symbols: the vendored faces are not guaranteed
 *  to carry a delta glyph, and a missing glyph is a tofu box in print. */
const COLUMN_HEADS = ['Movement', 'First', 'Peak', 'Change'];

/** The instruction, printed where it fires (the reckoning-panel doctrine —
 *  a rule taught six pages back is a rule nobody reads). Its two printed lines
 *  are what LEDE_PX models; changing this string means re-measuring it. */
const LEDGER_LEDE =
  'Write the first mark you made for each movement, the best mark you reached, '
  + 'and the difference between them.';

const DEFAULT_LEDGER_TITLE = 'Ledger';

registerAtom('ledger-spread', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'either',

  /**
   * minHeight equals preferredHeight, and that is the honest shape rather than
   * a stub: nothing on this page shrinks, so reporting a range would hand the
   * density solver shrink potential the CSS will never deliver — the same lie
   * STRIP_LADDER refuses to tell about the tick box.
   */
  estimate(data, _density) {
    const height = ledgerHeightAt(movementsOf(data).length);
    return { minHeight: height, preferredHeight: height };
  },

  render(atom, _density) {
    const data = atom.data || {};
    const movements = movementsOf(data);

    const { page, frame } = createBoundedPage(
      'ledger-spread',
      'ledger-page',
      { boundaryRole: 'ledger', pageClass: 'page-ledger-spread' },
    );

    const title = String((data.economy && data.economy.ledgerLabel) || '').trim()
      || DEFAULT_LEDGER_TITLE;
    const header = make('header', 'rp-header');
    header.appendChild(make('span', '', data.continuationLabel
      ? title + ' · ' + data.continuationLabel
      : title));
    header.appendChild(make('span', 'page-num', ''));
    frame.appendChild(header);

    frame.appendChild(make('div', 'ledger-lede', LEDGER_LEDE));

    const table = make('div', 'ledger-table');
    table.setAttribute('data-row-count', String(movements.length));
    // Two numbers, computed once each, stamped where the CSS can use them.
    // render() does not get its own formula — that is how the two sides stay
    // one model. `--ledger-row-height` is the row's floor (min-height),
    // `--ledger-row-max` is the ceiling flex growth may take it to.
    table.style.setProperty('--ledger-row-height', ledgerRowHeightPx(movements.length) + 'px');
    table.style.setProperty('--ledger-row-max', ledgerRowPrintedHeightPx(movements.length) + 'px');

    const head = make('div', 'ledger-head');
    COLUMN_HEADS.forEach((label, index) => {
      head.appendChild(make('div', index === 0 ? 'ledger-head-name' : 'ledger-head-cell', label));
    });
    table.appendChild(head);

    movements.forEach((name) => {
      const row = make('div', 'ledger-row');
      // Names go in through make()'s textContent, never innerHTML.
      row.appendChild(make('div', 'ledger-name', name));
      row.appendChild(make('div', 'ledger-cell'));
      row.appendChild(make('div', 'ledger-cell'));
      row.appendChild(make('div', 'ledger-cell'));
      table.appendChild(row);
    });

    frame.appendChild(table);
    return page;
  },
});

export default 'ledger-spread';
