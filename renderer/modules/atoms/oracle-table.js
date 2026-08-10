/**
 * oracle-table.js — Oracle table atom
 *
 * Wraps field-ops-primitives.js renderOracleSection() and
 * field-ops-models.js buildOracleModel() into the atom interface.
 *
 * Data shape: { oracle, weekIndex }
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildOracleModel } from '../field-ops-models.js';
import { renderOracleSection } from '../field-ops-primitives.js';
import { densityVariant } from '../engine/density-util.js';

// ---------------------------------------------------------------------------
// Ladder mirror  ⇄  booklet.css oracle blocks
// ---------------------------------------------------------------------------
/**
 * CROSS-FILE CONTRACT — these numbers mirror the oracle rules in
 * renderer/booklet.css: the base `.oracle-header` / `.oracle-instruction` /
 * `.oracle-entries` / `.oracle-entry` / `.oracle-text` / `.frag-ref` block and
 * the four `.oracle-zone[data-density-variant="…"]` blocks. booklet.css carries
 * the reverse pointer. **Change them together or the estimate lies.**
 *
 * Why mirror instead of read: estimate() runs in phase 1, before any DOM
 * exists, so it cannot resolve a computed style. What it replaces was a flat
 * per-entry character model with a fixed 12px of "density savings" — it
 * promised ~2% shrink where the CSS delivered up to 48%, and the sign of that
 * error is the dangerous one: an under-promising estimate keeps the solver
 * away from the tiers that would actually have fit, so pages shed instead of
 * compressing.
 *
 * Tier keys are exactly the variant names densityVariant() returns, so the
 * tier this estimate models is always the tier render() stamps onto the DOM.
 *
 * pt→px is ×96/72. textLh is (font-size × line-height), both from the tier's
 * `.oracle-text` rule. The three chrome figures are the measured cost of the
 * flex row's baseline alignment, which is not derivable from box metrics:
 *   plainExtra — how much taller the entry is than its text column, from the
 *     .oracle-case-num sitting on the same baseline with a taller line box.
 *   fragExtra  — the same, when a .frag-ref rides in the row too.
 *   fragBlock  — the frag-ref's own outer height (chip + block margins). A
 *     one-line entry is governed by this, not by its text.
 * All three were read off the corpus with the grid switched to align-items:
 * start (399 entries × 4 tiers); each is a single value across every fixture.
 */
const LADDER = {
  base: {
    textFs:      6.93,   // 5.2pt
    textLh:      8.46,   // × 1.22
    padV:        4,      // .oracle-entry padding 2px 0
    rowGap:      2,      // .oracle-entries row-gap
    colGap:      8,      // .oracle-entries column-gap
    plainExtra:  1,
    fragExtra:   8,
    fragBlock:   22.92,  // 7pt chip (14.92) + 4px margins × 2
    fragCharPx:  5.98,   // mono 7pt + .1em tracking
    headerPadB:  2,
    headerMB:    3,
    instrMB:     3,
  },
  compact: {
    textFs:      6.67,   // 5pt
    textLh:      8.14,   // × 1.22 (leading unchanged at compact)
    padV:        4,
    rowGap:      2,
    colGap:      8,
    plainExtra:  1,
    fragExtra:   8,
    fragBlock:   22.92,
    fragCharPx:  5.98,
    headerPadB:  2,
    headerMB:    3,
    instrMB:     3,
  },
  dense: {
    textFs:      6.40,   // 4.8pt
    textLh:      7.56,   // × 1.18
    padV:        2,      // padding 1px 0
    rowGap:      1,
    colGap:      6,
    plainExtra:  2,
    fragExtra:   2,      // frag-ref margins collapse to 0 at dense
    fragBlock:   11.52,  // 5.4pt chip, no margins
    fragCharPx:  4.61,
    headerPadB:  2,
    headerMB:    2,
    instrMB:     2,
  },
  tight: {
    textFs:      6.07,   // 4.55pt — the readability floor, not a clamp
    textLh:      6.80,   // × 1.12
    padV:        0,
    rowGap:      0,
    colGap:      4,
    plainExtra:  2,
    fragExtra:   2,
    fragBlock:   11.52,
    fragCharPx:  4.61,
    headerPadB:  1,
    headerMB:    1,
    instrMB:     1,
  },
};

/** .oracle-entry border-bottom + column-gap; .oracle-zone border-top + padding.
 *  Constant across the ladder. */
const ENTRY_BORDER_PX = 1;
const ENTRY_GAP_PX = 3;
const ZONE_BORDER_TOP_PX = 1;
const ZONE_PAD_TOP_PX = 3;

/** .oracle-case-num — mono 5pt + .04em tracking. Not on the ladder: the roll
 *  value is how a player finds their result, so it holds its size. */
const NUM_CHAR_PX = 3.87;

/** .oracle-header inherits the container's line-height, which is archetype-
 *  dependent (12.56px on some themes, 13.56px on others). The taller figure is
 *  the conservative one. Its border-bottom is ENTRY_BORDER_PX. */
const HEADER_LINE_PX = 13.6;
const HEADER_CHAR_PX = 6.1;    // mono 5.9pt, uppercase, .14em tracking
/** .oracle-instruction — 5.9pt italic serif at --theme-body-leading. */
const INSTR_LINE_PX = 12.6;
const INSTR_CHAR_PX = 4.0;

/**
 * Width the entry grid is modelled against.
 *
 * The oracle is always full-width: buildMechanicSurfaceRows() puts it in a
 * `full` row under the paired cipher/map surfaces in every layout variant, so
 * unlike the cipher there is no half-width case to hedge for. But "full width"
 * is not PAGE_BUDGET.widthPx (470): the live column is 5.5in less twice the
 * archetype's `--page-margin`, which theme.js sets between 0.3in and 0.5in —
 * measured 470.4px on pastoral, 460.8 on noir, 451.2 on government, 441.6 on
 * scifi. 470 is the pastoral value, so modelling at it under-estimates every
 * other theme (that is where the 17px shortfall on the government fixtures came
 * from). The narrowest column the ladder can produce is the conservative basis,
 * and narrower is the safe direction here: an over-estimate is collapsed by the
 * compaction step in planAndMeasure(), an under-estimate over-packs the page
 * and can cost a shed.
 */
const ZONE_WIDTH_PX = 432;   // 5.5in − 2 × 0.5in (widest --page-margin)

/**
 * Average advance width as a fraction of font-size for the entry serif,
 * calibrated so that no entry in the corpus wraps to more lines than modelled
 * (2,452 text columns × 4 tiers; zero under-estimates, median zone estimate
 * 1.08× measured). Word wrapping is ragged, so the true per-line capacity
 * varies with the words; this is the capacity that bounds it.
 */
const CHAR_WIDTH_RATIO = 0.62;

/** Narrowest text column the flex row will hand back before the frag-ref and
 *  case-num start shrinking instead. */
const MIN_TEXT_WIDTH_PX = 26;

function ladderFor(density) {
  return LADDER[densityVariant(density) || 'base'];
}

function wrappedLines(chars, widthPx, fontSizePx) {
  if (!chars) return 0;
  const perLine = Math.max(1, Math.floor(widthPx / (CHAR_WIDTH_RATIO * fontSizePx)));
  return Math.max(1, Math.ceil(chars / perLine));
}

/**
 * Natural height of one `.oracle-entry` at one ladder tier.
 *
 * The row is `display:flex; align-items:baseline` holding the case number, one
 * or two `.oracle-text` columns (the result, and the paperAction in its own
 * parenthesised column — they are siblings, NOT concatenated prose), and an
 * optional `.frag-ref`. The two text columns are `flex:1`, so they split
 * whatever the fixed-width chips leave.
 */
function entryHeight(entry, tier, entryWidthPx) {
  const numW = String(entry.roll || '').length * NUM_CHAR_PX;
  const fragChars = String(entry.fragmentRef || '').length;
  const fragW = fragChars ? fragChars * tier.fragCharPx : 0;

  const columns = [String(entry.text || '')];
  if (entry.paperAction) columns.push('(' + entry.paperAction + ')');

  const itemCount = 1 + columns.length + (fragChars ? 1 : 0);
  const available = Math.max(
    MIN_TEXT_WIDTH_PX * columns.length,
    entryWidthPx - numW - fragW - (itemCount - 1) * ENTRY_GAP_PX,
  );
  const perColumn = available / columns.length;

  const textH = Math.max(...columns.map(
    (text) => wrappedLines(text.length, perColumn, tier.textFs) * tier.textLh,
  ));

  const stack = fragChars
    ? Math.max(textH + tier.fragExtra, tier.fragBlock)
    : textH + tier.plainExtra;

  return stack + tier.padV + ENTRY_BORDER_PX;
}

/** Modelled zone height for one oracle table at one ladder tier. */
function oracleHeightAt(oracle, tier) {
  const entries = Array.isArray(oracle.entries) ? oracle.entries : [];

  let height = ZONE_BORDER_TOP_PX + ZONE_PAD_TOP_PX;

  const titleChars = String(oracle.title || 'Oracle').length;
  height += Math.max(1, Math.ceil(titleChars * HEADER_CHAR_PX / ZONE_WIDTH_PX)) * HEADER_LINE_PX
    + tier.headerPadB + ENTRY_BORDER_PX + tier.headerMB;

  if (oracle.instruction) {
    const instrChars = String(oracle.instruction).length;
    height += Math.max(1, Math.ceil(instrChars * INSTR_CHAR_PX / ZONE_WIDTH_PX)) * INSTR_LINE_PX
      + tier.instrMB;
  }

  // .oracle-entries is a two-column grid with stretch alignment, so a row is
  // as tall as its taller entry — summing entries individually would over-count
  // by roughly the height of every shorter one.
  const entryWidth = (ZONE_WIDTH_PX - tier.colGap) / 2;
  const naturals = entries.map((entry) => entryHeight(entry, tier, entryWidth));
  const rowCount = Math.ceil(naturals.length / 2);
  for (let row = 0; row < rowCount; row += 1) {
    height += Math.max(naturals[2 * row] || 0, naturals[2 * row + 1] || 0);
  }
  height += Math.max(0, rowCount - 1) * tier.rowGap;

  return Math.round(height);
}

registerAtom('oracle-table', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'right',

  /**
   * minHeight is the ladder's floor (the tight tier); preferredHeight is the
   * height at the density asked for. The solver reads the gap between them as
   * this atom's shrink potential, so the gap has to be this oracle's real
   * range: wide for a table of long results with fragment refs (the frag-ref
   * chip alone gives back 6px per entry between base and dense), narrow for a
   * table of one-line results, where the entry is already at its floor.
   */
  estimate(data, density) {
    const oracle = (data || {}).oracle || {};
    return {
      minHeight:       oracleHeightAt(oracle, LADDER.tight),
      preferredHeight: oracleHeightAt(oracle, ladderFor(density)),
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const oracle = data.oracle || {};
    const artifactIdentity = data.artifactIdentity || {};

    const oracleModel = buildOracleModel(oracle);
    const el = renderOracleSection(oracleModel);
    el.setAttribute('data-shell-family', artifactIdentity.shellFamily || 'field-survey');
    el.setAttribute('data-board-state-mode', artifactIdentity.boardStateMode || 'survey-grid');
    el.setAttribute('data-attachment-strategy', artifactIdentity.attachmentStrategy || 'split-technical');

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'oracle-table';
