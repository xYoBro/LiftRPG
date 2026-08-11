/**
 * reckoning-panel.js — Reckoning panel atom (the Resolve surface)
 *
 * Prints on the field-ops spread facing the week's session cards: the tally of
 * every tick the week's mark strips can earn, the one-sentence conversion rule,
 * the sink line, and — on the week that carries one — the threshold.
 *
 * Rules live where they fire. The conversion teaches here, on the surface that
 * uses it, not on the rules spread six pages back.
 *
 * The Mark phase is ticks only; this is the Resolve phase, so a printed number
 * is allowed here and nowhere else on the workout side.
 *
 * Data shape: { reckoning, weekIndex, economy, weekTargetCount }
 * DORMANT unless the adapter finds `week.reckoning` — no corpus fixture has one.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { make } from '../dom.js';
import { countWrappedLines } from '../utils.js';
import { densityVariant } from '../engine/density-util.js';

// ---------------------------------------------------------------------------
// Ladder mirror  ⇄  booklet.css `.reckoning-panel` blocks
// ---------------------------------------------------------------------------
/**
 * CROSS-FILE CONTRACT — these numbers mirror the `.reckoning-panel` rules in
 * renderer/booklet.css: the base block and the three
 * `.reckoning-panel[data-density-variant="…"]` blocks. booklet.css carries the
 * reverse pointer. **Change them together or the estimate lies.**
 *
 * Why mirror instead of read: estimate() runs in phase 1, before any DOM
 * exists, so it cannot resolve a computed style — the same reason the cipher
 * and oracle ladders exist (D71).
 *
 * Tier keys are exactly the variant names densityVariant() returns, so the tier
 * this estimate models is always the tier render() stamps onto the DOM.
 *
 * THE TALLY BOX DOES NOT MOVE. `box` holds 15px at every tier, above the 14px
 * print floor, for the same reason the mark strip's does: it is a square a
 * pencil has to land in during a set, and a box you cannot tick is not a
 * saving. The panel's shrink is its type and its gaps. Handing the solver a
 * shrinking tally box would promise it space the CSS never gives back.
 *
 * WHAT SHRINKS AND BY HOW MUCH: base→tight takes the panel's text from 6pt to
 * 5.2pt and closes the gaps, which is a real range on a panel whose height is
 * mostly tally rows — a 15-tick week is 2 rows at every tier, so the honest
 * shrink is the chrome around them, not the grid.
 *
 * textChars is a wrap CAPACITY, deliberately set BELOW the true fit: too few
 * characters per line over-counts lines, which over-estimates, which the
 * planner's compaction step absorbs. Too many under-counts and clips.
 */
const LADDER = {
  base: {
    padTop:       3,      // .reckoning-panel padding-top
    headerLine:   13.6,   // .reckoning-header, inherited leading, worst case
    headerPadB:   2,
    headerMB:     3,
    tallyGap:     4,      // .reckoning-tally column-gap
    tallyRowGap:  4,      // .reckoning-tally row-gap
    tallyMB:      5,
    textLh:       10.80,  // 6pt × 1.35
    textChars:    78,
    textMB:       3,
    bankedMT:     4,
    bankedLine:   15,     // .reckoning-banked-box height
    thresholdMT:  4,
    thresholdLine: 15,    // the value chip's own box
  },
  compact: {
    padTop:       3,
    headerLine:   13.6,
    headerPadB:   2,
    headerMB:     3,
    tallyGap:     4,
    tallyRowGap:  4,
    tallyMB:      4,
    textLh:       10.44,  // 5.8pt × 1.35
    textChars:    80,
    textMB:       3,
    bankedMT:     4,
    bankedLine:   15,
    thresholdMT:  4,
    thresholdLine: 15,
  },
  dense: {
    padTop:       2,
    headerLine:   12.9,   // 5.6pt at the same inherited ratio
    headerPadB:   1,
    headerMB:     2,
    tallyGap:     3,
    tallyRowGap:  3,
    tallyMB:      3,
    textLh:        9.72,  // 5.4pt × 1.35
    textChars:    86,
    textMB:       2,
    bankedMT:     3,
    bankedLine:   15,
    thresholdMT:  3,
    thresholdLine: 15,
  },
  tight: {
    padTop:       2,
    headerLine:   12.5,   // 5.4pt at the same inherited ratio
    headerPadB:   1,
    headerMB:     1,
    tallyGap:     3,
    tallyRowGap:  3,
    tallyMB:      3,
    textLh:        9.36,  // 5.2pt × 1.35
    textChars:    92,
    textMB:       2,
    bankedMT:     3,
    bankedLine:   15,
    thresholdMT:  3,
    thresholdLine: 15,
  },
};

/** `.reckoning-tally-box` — the tick target. Density-invariant by design; see
 *  the ladder note above. Mirrors `--reckoning-box-size` in booklet.css. */
const TALLY_BOX_PX = 15;

/** `.reckoning-panel` border-top and `.reckoning-header` border-bottom. */
const BORDER_PX = 1;

/** Ticks per printed tally row — the JS mirror of `grid-template-columns:
 *  repeat(10, …)` on `.reckoning-tally` in booklet.css. The DOM does not read
 *  this constant; the grid does the chunking, and this is how the estimate
 *  knows where the grid will break. That is precisely why the tally is a
 *  fixed-column grid and not a wrapping flex row: a wrap point set by the
 *  container width is one the estimate cannot compute. Change the column count
 *  in the CSS and this number must move with it. */
const TALLY_PER_ROW = 10;

/** Width the panel's text is modelled against: 5.5in less the widest
 *  `--page-margin` theme.js emits (0.5in), the same conservative basis the
 *  oracle ladder uses. Narrower is the safe direction — it over-counts lines. */
const PANEL_WIDTH_PX = 432;

/** Printed when `meta.economy.currencyLabel` is absent. */
const DEFAULT_PANEL_TITLE = 'Reckoning';

function ladderFor(density) {
  return LADDER[densityVariant(density) || 'base'];
}

function panelTitle(economy) {
  const label = String((economy && economy.currencyLabel) || '').trim();
  return label || DEFAULT_PANEL_TITLE;
}

function tallyCount(data) {
  const raw = Number((data || {}).weekTargetCount);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.floor(raw);
}

function tallyRowCount(count) {
  return count > 0 ? Math.ceil(count / TALLY_PER_ROW) : 0;
}

/** The threshold, or null when this week does not carry one. */
function thresholdValue(reckoning) {
  const raw = Number((reckoning || {}).threshold);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return Math.round(raw);
}

/** Modelled panel height at one ladder tier. Pure over its own data — the
 *  adapter pre-computes weekTargetCount precisely so this never has to reach
 *  into the week's sessions. */
function panelHeightAt(data, tier) {
  const reckoning = (data || {}).reckoning || {};
  let height = BORDER_PX + tier.padTop;

  const titleLines = countWrappedLines(panelTitle(data.economy), tier.textChars) || 1;
  height += titleLines * tier.headerLine + tier.headerPadB + BORDER_PX + tier.headerMB;

  const rows = tallyRowCount(tallyCount(data));
  if (rows) {
    height += rows * TALLY_BOX_PX
      + Math.max(0, rows - 1) * tier.tallyRowGap
      + tier.tallyMB;
  }

  const conversionLines = countWrappedLines(reckoning.conversion, tier.textChars);
  if (conversionLines) height += conversionLines * tier.textLh + tier.textMB;

  const sink = reckoning.sink || {};
  const sinkLines = countWrappedLines(sink.instruction, tier.textChars);
  if (sinkLines) height += sinkLines * tier.textLh + tier.textMB;

  // The Banked write-in prints on every panel — a running balance the player
  // totals in the Resolve phase. Unconditional because the panel is.
  height += tier.bankedMT + tier.bankedLine;

  if (thresholdValue(reckoning) !== null) {
    height += tier.thresholdMT + tier.thresholdLine;
  }

  return Math.round(height);
}

registerAtom('reckoning-panel', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'right',

  /**
   * minHeight is the ladder's floor (the tight tier); preferredHeight is the
   * height at the density asked for. The solver reads the gap as this panel's
   * shrink potential, so it has to be THIS panel's real range — narrow for a
   * short conversion over one tally row, wider for a panel carrying a long
   * sink instruction, where the text is what gives.
   */
  estimate(data, density) {
    const payload = data || {};
    return {
      minHeight:       panelHeightAt(payload, LADDER.tight),
      preferredHeight: panelHeightAt(payload, ladderFor(density)),
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const reckoning = data.reckoning || {};
    const sink = reckoning.sink || {};

    const panel = make('section', 'reckoning-panel');
    panel.setAttribute('data-week-index', String(data.weekIndex ?? ''));

    // Every string below goes in through make()'s textContent, never
    // innerHTML — LLM-authored text cannot carry markup into the page.
    panel.appendChild(make('header', 'reckoning-header', panelTitle(data.economy)));

    const count = tallyCount(data);
    if (count) {
      const tally = make('div', 'reckoning-tally');
      tally.setAttribute('data-tally-count', String(count));
      for (let index = 0; index < count; index += 1) {
        tally.appendChild(make('div', 'reckoning-tally-box'));
      }
      panel.appendChild(tally);
    }

    if (reckoning.conversion) {
      panel.appendChild(make('div', 'reckoning-conversion', reckoning.conversion));
    }

    if (sink.instruction) {
      panel.appendChild(make('div', 'reckoning-sink', sink.instruction));
    }

    // Running-balance write-in: the pencil surface a threshold is tracked
    // against. Always printed — a bar with no ledger under it is an unpaid
    // promise.
    const banked = make('div', 'reckoning-banked');
    banked.appendChild(make('span', 'reckoning-banked-label', 'Banked'));
    banked.appendChild(make('div', 'reckoning-banked-box'));
    panel.appendChild(banked);

    const threshold = thresholdValue(reckoning);
    if (threshold !== null) {
      const row = make('div', 'reckoning-threshold');
      row.appendChild(make('span', 'reckoning-threshold-label', 'Threshold'));
      row.appendChild(make('span', 'reckoning-threshold-value', String(threshold)));
      panel.appendChild(row);
    }

    const variant = densityVariant(density);
    if (variant) panel.setAttribute('data-density-variant', variant);

    return panel;
  },
});

export default 'reckoning-panel';
