/**
 * hint-band.js — the costed hint ladder, printed (W5b)
 *
 * EXIT's three-rung ladder — nudge, then method, then answer — priced in
 * something the book already tracks, printed as its own band on the page the
 * spine's `printedOn` names.
 *
 * Data shape: { ladder, weekIndex, totalWeeks, artifactIdentity }
 *
 * ── THIS IS THE SPINE'S FIRST PRINTED SURFACE ───────────────────────────────
 * `meta.playSpine` has been renderer-inert since W4a: it declares things ABOUT
 * surfaces the book prints, and is not itself one. This atom is the exception
 * the registry predicted — "a rendered band with its own geometry, which means
 * an estimate term and a ladder mirror" — and it is worth naming as a change
 * of kind rather than a change of degree. From here, an edit to the spine can
 * move ink.
 *
 * ── THE SEAL IS THE ORDER, NOT AN OMISSION ──────────────────────────────────
 * Every rung's `gives` is printed in full. It has to be: the book cannot hide
 * ink, and hiding it would need a second sheet, a window, or a decoder — all
 * three excluded by the pencil-only law (D122). The lock is the same one the
 * sealed cache uses: the cost is printed BEFORE the thing it buys, the rungs
 * run cheapest-first, and the player decides when to pay. Verification is the
 * player's, by honour — the same ruling as the seal.
 *
 * ── AND THE HEADING IS AUTHORED ─────────────────────────────────────────────
 * `ladder.label` carries the band's own heading in the book's voice. This atom
 * prints no English of its own, because a printed element that says "IF YOU
 * ARE STUCK" in a book about a drowned parish is the engine talking on a page
 * where only the fiction may talk (Design Principles 1). When a hand-loaded
 * book carries no label, the band names the puzzle it serves — which is the
 * author's own text too — rather than inventing chrome.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { densityVariant } from '../engine/density-util.js';
import { make } from '../dom.js';
import { wrappedLines } from '../utils.js';
import { advancePx, readTypeMetrics } from '../type-metrics.js';

// ---------------------------------------------------------------------------
// Ladder mirror  ⇄  booklet.css `--hband-*` tokens
// ---------------------------------------------------------------------------
/**
 * CROSS-FILE CONTRACT — these numbers mirror the `--hband-*` token ladder in
 * renderer/booklet.css (the `.hint-band` base block and the
 * `.hint-band[data-density-variant="…"]` blocks). booklet.css carries the
 * reverse pointer, and `ladderMirrorHarness()` in scripts/validate.mjs parses
 * BOTH SIDES and asserts equality. **Change them together or the estimate
 * lies** — phase 1 has no DOM and cannot resolve a custom property, so a token
 * moved on one side alone makes the solver's shrink math wrong in the
 * confident direction (D71).
 *
 * `costWPx` is in the mirror for a reason beyond tidiness: the estimate divides
 * the band's width by it to decide how many lines each rung's two columns take,
 * so a cost column widened in CSS alone makes every `gives` wrap earlier than
 * modelled and the band measure taller than promised.
 *
 * IT IS ALSO THE SAME AT EVERY TIER, and that is a ruling. Narrowing it with
 * density makes the COST text wrap more while the GIVES text wraps less, and
 * which of the two wins is content-dependent — measured on contact, a
 * long-costed ladder came out TALLER at the tight tier than at the dense one,
 * which violates Charter invariant 4 (estimates must be non-increasing in
 * density, or the solver loops without converging). The column is therefore
 * fixed and the band's shrink comes from leading, padding and the gaps. The
 * same argument map-panel's boxed-cell width term is built on.
 *
 * pt→px conversion is ×96/72; line figures are (font-size × leading), rounded
 * to 0.1px exactly as the validator derives them.
 *
 * MEASURED RESIDUAL, STATED PLAINLY. Against real renders a realistic band —
 * short costs, one-line heading — is EXACT at every tier (0.0% delta). A
 * pathological one, whose costs run to a full sentence in a 104px column,
 * over-reads by up to 21%: `wrappedLines()` divides total text width by column
 * width and is blind to the space a real wrap consumes at the break, which on a
 * narrow column is worth a whole modelled line per rung. The probe that found
 * it also confirmed the advance model is right — Chrome measures Share Tech
 * Mono at 0.5995 of font-size against the 0.60 modelled here. The bias is
 * toward OVER-reserving, which costs page density and never clips, so it stays:
 * wrappedLines is shared by every atom in this renderer, and a break-aware
 * correction would under-read the first time a cost held one long unbroken word.
 */
const LADDER = {
  base: {
    labelLinePx: 10.9,   // 6.3pt × 1.30
    labelFsPx:   8.40,   // 6.3pt
    labelMBPx:   4,      // --hband-label-mb
    rungLinePx:  10.2,   // 5.9pt × 1.30
    rungFsPx:    7.87,   // 5.9pt
    rungGapPx:   3,      // --hband-rung-gap
    costWPx:     104,    // --hband-cost-w
    colGapPx:    8,      // --hband-col-gap
    padPx:       5,      // --hband-pad
  },
  compact: {
    labelLinePx: 10.9,
    labelFsPx:   8.40,
    labelMBPx:   3,
    rungLinePx:  10.2,
    rungFsPx:    7.87,
    rungGapPx:   3,
    costWPx:     104,
    colGapPx:    8,
    padPx:       4,
  },
  dense: {
    labelLinePx: 9.8,    // 5.9pt × 1.24
    labelFsPx:   7.87,
    labelMBPx:   2,
    rungLinePx:  9.1,    // 5.5pt × 1.24
    rungFsPx:    7.33,
    rungGapPx:   2,
    costWPx:     104,
    colGapPx:    6,
    padPx:       3,
  },
  tight: {
    labelLinePx: 8.8,    // 5.6pt × 1.18
    labelFsPx:   7.47,
    labelMBPx:   2,
    rungLinePx:  8.2,    // 5.2pt × 1.18
    rungFsPx:    6.93,
    rungGapPx:   2,
    costWPx:     104,
    colGapPx:    5,
    padPx:       2,
  },
};

/** `.hint-band` draws a hairline frame. A hairline that shrinks is a hairline
 *  that disappears, so it is 1px at every tier — top and bottom both count. */
const BORDER_PX = 1;

/** Modelled per-character advances at the calibration anchor — the same ratios
 *  the other two W5b atoms derive, from the same corpus-validated constants.
 *  Corrected for the face in use through advancePx() (D121). */
const MONO_ADVANCE_RATIO = 0.60;
const BODY_ADVANCE_RATIO = 0.50;

/** Width the band is modelled against. `footprint: { cols: 2 }` — a band IS a
 *  full-width strip, that is its shape. 432px is the narrowest live full-width
 *  column the archetype ladder produces, the same conservative basis
 *  map-panel and the two puzzle atoms calibrate on. */
const BAND_WIDTH_PX = 432;

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

/** The heading this band prints. Authored, or the puzzle it serves — never
 *  engine English. Mirrors renderHintBand() below. */
function bandHeading(ladder) {
  return String(ladder.label || ladder.puzzle || '');
}

/**
 * Modelled band height at one ladder tier.
 *
 * CROSS-FILE CONTRACT — mirrors renderHintBand() below: a framed strip with a
 * heading and one two-column row per rung, each row as tall as its taller
 * column. When the two disagree the failure is silent clipping, so they are
 * written adjacent on purpose.
 */
function bandHeightAt(ladder, tier, metrics) {
  const inner = BAND_WIDTH_PX - 2 * tier.padPx - 2 * BORDER_PX;
  let height = 2 * BORDER_PX + 2 * tier.padPx;

  const heading = bandHeading(ladder);
  if (heading) {
    height += wrappedLines(heading.length, inner, monoAdvance(tier.labelFsPx, metrics))
      * tier.labelLinePx + tier.labelMBPx;
  }

  const rungs = asArray(ladder.rungs);
  if (!rungs.length) return Math.ceil(height);

  const costW = Math.max(24, tier.costWPx);
  const givesW = Math.max(40, inner - costW - tier.colGapPx);
  const costAdv = monoAdvance(tier.rungFsPx, metrics);
  const givesAdv = bodyAdvance(tier.rungFsPx, metrics);

  rungs.forEach((rung) => {
    const costLines = wrappedLines(String((rung || {}).cost || '').length, costW, costAdv);
    const givesLines = wrappedLines(String((rung || {}).gives || '').length, givesW, givesAdv);
    height += Math.max(costLines, givesLines) * tier.rungLinePx;
  });
  height += Math.max(0, rungs.length - 1) * tier.rungGapPx;

  // Ceil, not round — the constants are fractional pt→px conversions.
  return Math.ceil(height);
}

function renderHintBand(ladder) {
  const band = make('div', 'hint-band');

  const heading = bandHeading(ladder);
  if (heading) band.appendChild(make('div', 'hint-band-label', heading));

  const rungs = asArray(ladder.rungs);
  if (rungs.length) {
    const list = make('ul', 'hint-rungs');
    rungs.forEach((rung) => {
      const row = make('li', 'hint-rung');
      // COST FIRST, ALWAYS. The band's whole lock is that the price is read
      // before the thing it buys; putting `gives` first would print a free
      // hint with a footnote about what it should have cost.
      row.appendChild(make('span', 'hint-rung-cost', String((rung || {}).cost || '')));
      row.appendChild(make('span', 'hint-rung-gives', String((rung || {}).gives || '')));
      list.appendChild(row);
    });
    band.appendChild(list);
  }

  return band;
}

registerAtom('hint-band', {
  defaultSizeHint: 'minimal',
  canShare: true,
  pageAffinity: 'either',
  footprint: { cols: 2 },

  /**
   * minHeight is the ladder's floor (tight); preferredHeight is the height at
   * the density asked for. The gap between them is small and honest: a band is
   * three short rows and a heading, so its shrink is leading, padding and the
   * cost column — there is no writable surface here to take away, and nothing
   * here that the tight tier hides. A band that vanished under pressure would
   * be a promise the spine made and the page broke.
   */
  estimate(data, density, context) {
    const metrics = readTypeMetrics(context);
    const ladder = (data || {}).ladder || {};
    return {
      minHeight:       bandHeightAt(ladder, LADDER.tight, metrics),
      preferredHeight: bandHeightAt(ladder, ladderFor(density), metrics),
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const ladder = data.ladder || {};
    const artifactIdentity = data.artifactIdentity || {};

    const el = renderHintBand(ladder);
    el.setAttribute('data-shell-family', artifactIdentity.shellFamily || 'field-survey');
    el.setAttribute('data-board-state-mode', artifactIdentity.boardStateMode || 'survey-grid');
    el.setAttribute('data-attachment-strategy', artifactIdentity.attachmentStrategy || 'split-technical');

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'hint-band';
