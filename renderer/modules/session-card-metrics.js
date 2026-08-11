import { describeExerciseLoad, countWrappedLines } from './utils.js?v=48';

// ---------------------------------------------------------------------------
// Session-card geometry model
// ---------------------------------------------------------------------------
// Every number in this file was read off a rendered card. Nothing here is a
// guess, and nothing is interpolated: the renderer's geometry is a STEP
// function of density (CSS attribute blocks), so the model is a step function
// too. Three ladders, each mirroring a specific set of `booklet.css` rules:
//
//   PAGE_COMPACTION_BOX  the card's own padding + gap, which on a real page
//                        come from `.workout-left[data-page-compaction="N"]`
//   VARIANT_BOX          the same two values when no compaction rule exists
//   CARD_LADDER          everything INSIDE the card, which the
//                        `[data-density-variant]` blocks own
//   PROMPT_LADDER        `.story-prompt`
//   CHOICE_LADDER        `.binary-choice*`
//
// HOW THESE WERE OBTAINED (2026-08-10, D79): every session card in the
// 8-fixture corpus was rendered through `renderPageFromPlacements()` — the
// real `.workout-left` frame, with `data-page-compaction` and
// `data-card-count` set exactly as the printed page sets them — at 22
// densities, with `.session-cards > *` pinned to `flex:0 0 auto` so each card
// reported its natural height instead of its flex share. 4,048 card samples,
// 12,140 exercise rows, 1,914 pages, across every archetype in the corpus.
// Result: card totals run 1.013x measured at the median, 1.13x worst case,
// with ZERO under-estimates. (Before: 1.26x median, 1.56x worst, and 27
// under-estimates — the fiction that made the chunker compare two wrong
// numbers. See DECISIONS D79.)
//
// WHY THE PAGE CONTEXT AND NOT `measureAtom()`: the estimate feeds three
// consumers — the adapter's chunker, the planner's packing anchor, and the
// solver's shrink potential — and all three are asking "will this fit on a
// PAGE". `measureAtom()` renders the card into a bare bounded page with no
// `.workout-left` class, so no compaction rule applies and the card measures
// UP TO 10px shorter than the same card on the page it will actually print
// on (worst at density 0.6: box padding 8px standalone vs 15px on the page).
// The model follows the page. Consequence, stated plainly: the diagnostics'
// estimate-vs-measured column for session cards reads a few px conservative,
// because it compares against the standalone number. That is the harness
// measuring a different thing, not the model drifting.

const NOTES_LINE_HEIGHT = 22;

/** `.notes-box` margin-top — the only part of the box outside its min-height
 *  (padding and border are inside it; box-sizing is border-box). Measured 2.00
 *  at every tier, every archetype. */
const NOTES_MARGIN = 2;

/** `.page-frame` padding-top on a workout page. Measured 4, invariant.
 *  Exported for the chunker, which pays it once per page. */
export const PAGE_FRAME_PAD_Y_PX = 4;

/** `.exercise-name-cell` row-gap — the space between an exercise name and its
 *  instruction hint. Only paid by rows that HAVE a hint. */
const INSTRUCTION_GAP = 2;

/**
 * `.exercise-instruction` wrap width, in characters.
 *
 * Fit the same way as every other wrap term: the largest value at which
 * `ceil(len / C)` never predicted fewer lines than the browser laid out, over
 * all 12,140 rendered rows. The true fit is 16.5 (binding sample: a 17-char
 * hint that wraps to two lines); 16 keeps a little margin for unseen content.
 *
 * It is a single number for every tier even though the font shrinks down the
 * ladder, because the COLUMN shrinks with it: `.exercise-name-cell` is sized
 * by `resolveExerciseNameWidthPx()` (workout-models.js) from the longest
 * exercise name on the card, 54–168px. Fitting per tier produced 16.5 at all
 * four. Cost of the single conservative number: 0.2 over-counted lines per
 * hinted row at the median, worst case 2.
 */
const INSTRUCTION_CHARS_PER_LINE = 16;

// ---------------------------------------------------------------------------
// Density variant ladder — the single source for the card's density tiers
// ---------------------------------------------------------------------------
/**
 * CROSS-FILE CONTRACT (three-way):
 *   booklet.css      `.session-card[data-density-variant="compact|dense|tight"]`
 *   atoms/session-card.js  sets that attribute from `sessionCardVariant()`
 *   this file        models the geometry each of those blocks produces
 *
 * `sessionCardVariant()` is exported and consumed by the atom renderer, so the
 * thresholds exist once. Density below 0.2 gets no attribute at all — the
 * base `.story-prompt` / `.binary-choice` rules apply; that tier is keyed
 * 'base' internally.
 *
 * Adding a variant means: a CSS block, a threshold here, and a row in EVERY
 * ladder below. A missing ladder row silently falls back to 'base' geometry,
 * which is the largest — safe, but wrong.
 */
const VARIANT_THRESHOLDS = [
  { key: 'tight',   minDensity: 0.6  },
  { key: 'dense',   minDensity: 0.35 },
  { key: 'compact', minDensity: 0.2  },
];

/** Internal tier key, including the attribute-less 'base' tier. */
function variantKey(density) {
  const d = Number.isFinite(density) ? density : 0.6;
  for (const tier of VARIANT_THRESHOLDS) {
    if (d >= tier.minDensity) return tier.key;
  }
  return 'base';
}

/**
 * The `data-density-variant` attribute value for a density, or null when the
 * card renders with base styling (no attribute). Consumed by
 * `atoms/session-card.js` — do not re-declare these thresholds there.
 *
 * @param {number} density — 0.0 (spacious) to 1.0 (maximum compression)
 * @returns {'compact'|'dense'|'tight'|null}
 */
export function sessionCardVariant(density) {
  const key = variantKey(density);
  return key === 'base' ? null : key;
}

// ---------------------------------------------------------------------------
// Page compaction ladder — the SECOND density ladder on a session card
// ---------------------------------------------------------------------------
/**
 * CROSS-FILE CONTRACT (three-way):
 *   page-renderer.js `workoutCompactionLevel()` — the thresholds below are its
 *                    thresholds; it stamps `data-page-compaction` from the MAX
 *                    density on the page
 *   booklet.css      `.workout-left[data-page-compaction="N"] .session-card`
 *                    and `… .session-cards`
 *   this file        models what those blocks produce
 *
 * A session card is styled by TWO attribute ladders at once, and they do not
 * agree. For the card's own box (`padding`, `gap`) and the wrapper's gap the
 * compaction rule wins outright — `.workout-left[data-page-compaction="5"]
 * .session-card` outranks `.session-card[data-density-variant="tight"]` on
 * specificity. For every descendant (`.session-header`, `.story-prompt`,
 * `.session-meta`, `.session-body`, `.exercise-*`, `.notes-box`) the two are
 * specificity-equal and the variant blocks come LATER in the stylesheet, so
 * the variant wins. That split is why this file carries two box tables and one
 * interior table.
 *
 * The compaction ladder is NOT monotone against the variant ladder: at density
 * 0.47 a card is `dense` with no compaction rule (12px of padding), and at
 * 0.48 it is still `dense` but compaction 1 applies (17px). Compressing the
 * page makes the card BOX grow by 5px. `monotoneTail()` resolves it — see the
 * note there. The CSS is what is wrong here, not the model, and fixing it is a
 * print-artifact change.
 *
 * Reading the page's compaction from a single card's density is provably
 * conservative: the renderer uses the max density on the page, which is ≥ this
 * card's, and every box value is non-increasing in level, so the modelled box
 * is never smaller than the rendered one.
 */
const COMPACTION_THRESHOLDS = [
  { level: 5, minDensity: 0.92 },
  { level: 4, minDensity: 0.82 },
  { level: 3, minDensity: 0.72 },
  { level: 2, minDensity: 0.62 },
  { level: 1, minDensity: 0.48 },
];

function compactionLevel(density) {
  const d = Number.isFinite(density) ? density : 0.6;
  for (const tier of COMPACTION_THRESHOLDS) {
    if (d >= tier.minDensity) return tier.level;
  }
  return 0;
}

/**
 * `.session-card` box (padding-block + both borders) and its row-gap, per
 * compaction level. Level 0 has no rule — the variant's own `.session-card`
 * block governs, so it is null here and VARIANT_BOX answers instead.
 *
 * `cardsGap` is `.session-cards`' row-gap, which the same blocks set. The card
 * model does not use it (a card does not contain it); the chunker does, once
 * per adjacent card pair.
 */
const PAGE_COMPACTION_BOX = {
  0: null,                                    // base `.session-card` / `.session-cards`
  1: { padY: 17, gap: 2, cardsGap: 7 },       // padding 7px 10px 8px, gap 2, cards gap 7
  2: { padY: 15, gap: 2, cardsGap: 6 },       // padding 6px  9px 7px, gap 2, cards gap 6
  3: { padY: 11, gap: 1, cardsGap: 5 },       // padding 4px  8px 5px, gap 1, cards gap 5
  4: { padY: 10, gap: 1, cardsGap: 4 },       // padding 4px  7px 4px, gap 1, cards gap 4
  5: { padY: 10, gap: 1, cardsGap: 4 },       // identical to level 4 in the CSS
};

/** The same two values when no compaction rule applies (level 0). */
const VARIANT_BOX = {
  base:    { padY: 19, gap: 3, cardsGap: 8 }, // padding 8px 10px 9px + 2 borders
  compact: { padY: 16, gap: 2, cardsGap: 8 }, // padding 7px  9px 7px + 2 borders
  dense:   { padY: 12, gap: 1, cardsGap: 8 }, // padding 5px  8px 5px + 2 borders
  tight:   { padY: 10, gap: 1, cardsGap: 8 }, // padding 4px  7px 4px + 2 borders
};

function cardBox(density) {
  return PAGE_COMPACTION_BOX[compactionLevel(density)] || VARIANT_BOX[variantKey(density)];
}

/**
 * The `.session-cards` row-gap at a given density — the space BETWEEN cards on
 * a page. Exported for the chunker; a card's own estimate never pays it.
 *
 * @param {number} density
 * @returns {number} px
 */
export function sessionCardsGapPx(density) {
  return cardBox(density).cardsGap;
}

/**
 * CARD INTERIOR — the terms the `[data-density-variant]` blocks own.
 *
 *   header   `.session-header` outer height, worst case over the corpus. Every
 *            label in the corpus is one line (longest 35 chars against a
 *            ~450px column, which fits roughly 95), so this is a constant, not
 *            a wrapped term. The 1px spread inside each tier is
 *            `--theme-rule-width` on the header's bottom border; the max is
 *            taken.
 *   meta     `.session-meta`, which is sized by `.session-fragment-ref`'s line
 *            box when a fragment reference is authored…
 *   metaEmpty …and by that element's `min-height:1em` when it is not. The
 *            renderer decides on `session.fragmentRef` (workout-models.js
 *            `fragmentRefText`), so the model can too — worth 5px on every
 *            card without a reference, which is most of them in two fixtures.
 *   bodyGap  `.session-body` row-gap (paid between body children).
 *   tableGap `.exercise-table` row-gap (paid between exercise rows).
 *   row      `.exercise-row` height with NO instruction hint. Exactly constant
 *            across the corpus at each tier: below `tight` the row is pinned
 *            by `min-height: calc(rep-box + 2 × padding)`, and at `tight` the
 *            exercise name's own line box (6.9pt `--serif`) is the taller
 *            term. A theme that changed `--serif` would move the `tight` row.
 *   instrLine `.exercise-instruction` line-height. A hinted row costs
 *            INSTRUCTION_GAP + lines × this, on top of `row`.
 */
const CARD_LADDER = {
  base:    { header: 20.92, meta: 14.92, metaEmpty: 9.34, bodyGap: 3, tableGap: 5, row: 21.11, instrLine: 8.52 },
  compact: { header: 19.50, meta: 14.92, metaEmpty: 9.34, bodyGap: 3, tableGap: 4, row: 19.11, instrLine: 8.19 },
  dense:   { header: 17.75, meta: 13.44, metaEmpty: 8.40, bodyGap: 2, tableGap: 3, row: 17.34, instrLine: 7.56 },
  tight:   { header: 16.02, meta: 12.80, metaEmpty: 8.00, bodyGap: 1, tableGap: 2, row: 14.72, instrLine: 7.20 },
};

/**
 * WRAPPED-TEXT GEOMETRY — measured, not guessed.
 *
 * CROSS-FILE CONTRACT: every number below was read off the rendered DOM and
 * mirrors a specific `booklet.css` declaration. Changing the CSS without
 * changing the matching row here makes the density solver's shrink-potential
 * arithmetic (`preferred(d) − min(1.0)`) lie — the D71 defect class. Both
 * files carry reciprocal comments.
 *
 *   lineHeight — computed style, exact. `base` has no `line-height`
 *     declaration, so it inherits and varies by archetype (15.00 mono/noir,
 *     15.80 pastoral, 16.00 sci-fi); the model has no theme knowledge and
 *     takes the worst case, 16.00.
 *   padY — the element's own vertical padding, exact.
 *   charsPerLine — the LARGEST value at which `ceil(len / C)` never predicted
 *     fewer lines than the browser actually laid out, over every sample. This
 *     is a fit, not a capacity: a first-line capacity probe measures 84–115
 *     characters at `tight`, but greedy word wrap wastes the line end, so
 *     modelling with the capacity under-counts lines.
 *
 * THE D76 NUMBERS WERE FIT IN THE WRONG BOX. `dense`/`tight` carried 82/84
 * characters, fit against cards measured standalone; on a real page the card's
 * padding comes from the compaction ladder instead of the variant ladder, so
 * the prompt column is up to 6px narrower and the same string takes one more
 * line. That cost 26 under-estimated prompts on Palimpsest-House alone. Refit
 * inside the page: 80 at both tiers.
 *
 * `dense` measures a 10.16px line-height and `tight` a 10.33px one, because
 * `booklet.css` gives `tight` a LOOSER line-height (1.22) than `dense` (1.2)
 * at the same 6.35pt font — compressing the card makes its prompt lines
 * taller. Both rows now carry their true value and `monotoneTail()` resolves
 * the inversion at runtime, along with the much larger box inversion at
 * density 0.48. One mechanism, not two.
 */
const PROMPT_LADDER = {
  //         charsPerLine  lineHeight  padY   ← booklet.css `.story-prompt`
  base:    { charsPerLine: 68, lineHeight: 16.00, padY: 4 }, // 7.5pt,  inherited lh, padding 2px 0
  compact: { charsPerLine: 71, lineHeight: 11.95, padY: 4 }, // 7pt,    lh 1.28,      padding 2px 0
  dense:   { charsPerLine: 80, lineHeight: 10.16, padY: 2 }, // 6.35pt, lh 1.2,       padding 1px 0
  tight:   { charsPerLine: 80, lineHeight: 10.33, padY: 2 }, // 6.35pt, lh 1.22,      padding 1px 0
};

/**
 * Binary-choice geometry. `booklet.css` declares density blocks for `dense`
 * and `tight` only, so `compact` renders identically to `base` — the two rows
 * below are equal on purpose, not by oversight.
 *
 * `chrome` is the measured residual after subtracting the MODELLED label and
 * option lines (block padding + border + label margin + option gaps + marker
 * rows), taken at its corpus maximum.
 *
 * `textLineHeight` at `dense` and `tight` is 10.76, not the 9.60/8.51 the
 * variant blocks declare, and that is not a mistake:
 * `.workout-left[data-card-count="2"] .binary-choice-text` sets 6.4pt/1.26 and
 * sits AFTER the variant rules in the stylesheet, so on any two-card page the
 * choice text does not compress at all. The estimate cannot see the page's
 * card count, so it takes the worst case. (The label is the mirror image — its
 * card-count rule sits BEFORE the variant rules and loses — hence the two
 * columns disagree about which ladder they follow.) Cost: the seven fixtures
 * whose choice cards land on three-card pages are over-estimated on this term
 * by ~26%, over 8 cards corpus-wide. The real fix is in the CSS, where a
 * card-count rule should not silently defeat a density lever — the D71/D72
 * class — and that is a print-artifact change.
 *
 * The label defaults to 'Route Decision' when `choiceLabel` is absent —
 * mirrors `buildBinaryChoiceModel()` in workout-models.js. Labels in the
 * corpus run 12–151 characters and do wrap to two lines, so the label is a
 * wrapped-text term too, not a constant.
 */
const CHOICE_LADDER = {
  base:    { labelChars: 120, labelLineHeight: 13.07, textChars: 88, textLineHeight: 13.07, chrome: 21 },
  compact: { labelChars: 120, labelLineHeight: 13.07, textChars: 88, textLineHeight: 13.07, chrome: 21 },
  dense:   { labelChars: 120, labelLineHeight:  9.92, textChars: 97, textLineHeight: 10.76, chrome: 12 },
  tight:   { labelChars: 120, labelLineHeight:  8.97, textChars: 97, textLineHeight: 10.76, chrome: 10 },
};

/** Mirrors buildBinaryChoiceModel() in workout-models.js. */
const DEFAULT_CHOICE_LABEL = 'Route Decision';

/**
 * MARK STRIP — the Mark surface's geometry (Session 1).
 *
 * CROSS-FILE CONTRACT: mirrors the `.mark-strip` base block and the three
 * `.session-card[data-density-variant="…"] .mark-strip` blocks in
 * `booklet.css`, which carries the reciprocal pointer. Phase-1 estimation has
 * no DOM and cannot resolve a custom property, so the numbers live twice;
 * change them together or the solver's shrink potential lies (the D71 class).
 *
 * WHY THE TARGET COUNT DOES NOT APPEAR IN THE HEIGHT. The strip is one flex
 * line with `flex-wrap: nowrap`, and each label is pinned to a single line by
 * `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. Three
 * targets and five targets therefore produce the SAME height — they divide the
 * card's width, they do not stack. Charging per target would over-estimate a
 * five-target strip by ~4×, and an over-estimate is not "the safe direction"
 * here: at ~20px a target it would add ~250px of phantom height to a
 * three-card page and shed a page that fits. The clamp in the CSS is what
 * makes this modellable at all — it converts an unbounded text term into a
 * constant. Relaxing `nowrap` in either place without adding a wrap term here
 * is the D71 defect, pointed the other way.
 *
 * WHY IT IS FLAT ACROSS THE LADDER. `box` is the tick target — the thing a
 * pencil has to land in — and it holds 15px at every tier by design, above the
 * 14px print floor. The row is `align-items:center`, so its height is
 * max(box, labelLine), and the box wins at all four tiers: the strip's only
 * real shrink is its own padding, 3px end to end. That is the honest number.
 * Modelling the box as scaling with density would hand the solver 12px of
 * shrink potential that the CSS will never deliver.
 *
 *   padTop    `.mark-strip` padding-top.
 *   border    its border-top. `--theme-hair-width` resolves to 1px in nine
 *             archetypes and 1.5px in one (`--line-width-hair`); the model has
 *             no theme knowledge and takes the worst case, as CARD_LADDER's
 *             header row does for the same reason.
 *   box       `.mark-box` height — density-invariant, and deliberately so.
 *   labelLine `.mark-label` line box (font-size × line-height), carried so the
 *             max() above is explicit rather than assumed. It is below `box`
 *             at every tier today; if a theme ever pushes it above, the model
 *             follows without an edit.
 */
const STRIP_LADDER = {
  //         padTop  border  box  labelLine   ← booklet.css `.mark-strip`
  base:    { padTop: 5, border: 1.5, box: 15, labelLine: 8.96 }, // 5.6pt × 1.2
  compact: { padTop: 4, border: 1.5, box: 15, labelLine: 8.96 }, // 5.6pt × 1.2
  dense:   { padTop: 3, border: 1.5, box: 15, labelLine: 8.48 }, // 5.3pt × 1.2
  tight:   { padTop: 2, border: 1.5, box: 15, labelLine: 8.16 }, // 5.1pt × 1.2
};

/**
 * SINGLE-CARD PAGE GEOMETRY (`data-card-count="1"`).
 *
 * CROSS-FILE CONTRACT: `booklet.css` `.workout-left[data-card-count="1"] …`.
 * A page holding exactly one session card is a different object: the wrapper
 * stops flexing, the card reverts to spacious padding whatever the density
 * says, and — the term that matters — `.notes-box` gets `min-height:260px`,
 * because on a one-card page the notes box IS the page. None of that responds
 * to density; the card measures 400–562px at every density in the corpus.
 *
 * The atom's own `estimate()` cannot use this: it is handed a density and a
 * session, never the page's card count. The CHUNKER can, and does — it is the
 * component deciding how many cards share a page in the first place. See
 * `estimateSoloSessionCardHeight()`.
 *
 * Unmodelled before D79, and worth 194px: the notes term read 66px (three
 * lines at maximum density) against a 262px box.
 */
const SOLO_CARD = {
  padY: 20,          // padding 8px 10px 10px + 2 borders
  gap: 3,            // `.session-card` row-gap
  // `.session-header` is 7pt with 4px of padding-bottom here — the same
  // declaration the base tier carries — so it reads CARD_LADDER.base.header
  // rather than repeating the number. (Repeating it is how the first draft
  // under-read variety-02 by 0.86px: that archetype's `--theme-rule-width`
  // adds a pixel to the header's bottom border, and the base row already
  // carries that worst case.)
  bodyGap: 3,        // `.session-body` row-gap
  notes: 262,        // min-height 260 + NOTES_MARGIN
  promptLineHeight: 13.62,  // 7.4pt × 1.38
  promptPadY: 4,
  promptCharsPerLine: 68,   // base-tier column, same 7.4pt-ish measure
  // THE MARK STRIP ON A SOLO CARD. `.mark-strip` carries no `data-card-count`
  // override, so its geometry is whatever the card's density variant stamps —
  // but this estimate is density-invariant by contract, so it charges the
  // TALLEST row of the ladder. That is STRIP_LADDER.base, reached by asking
  // rawMarkStripHeight() at density 0, exactly as the binary-choice term above
  // reaches CHOICE_LADDER.base. Reading it rather than repeating the number is
  // deliberate: a copied constant here is the D71 drift hazard, and a term
  // MISSING here is the D79 one — the unmodelled solo notes box cost 194px.
  stripDensity: 0,
};

/**
 * MONOTONE CLAMP — Charter invariant 4 ("estimates never rise with density").
 *
 * Load-bearing again, and for a bigger reason than in D76. The card's geometry
 * is governed by two CSS ladders that disagree about direction (see
 * COMPACTION_THRESHOLDS): raising density from 0.47 to 0.48 grows the card box
 * by 5px, and from 0.35 to 0.48 the `.story-prompt` line-height falls while
 * the box grows. Modelled faithfully — which is what this file now does — the
 * raw term rises with density on all 184 corpus cards. `monotoneTail()` is
 * what makes the reported estimate non-increasing anyway.
 *
 * It returns the worst case over the requested density and every threshold
 * above it, which is non-increasing by construction: raising the query can
 * only shrink the sampled set, so the max can only fall. The requested density
 * is always sampled itself, so the clamp can never report less than the raw
 * model does at that density.
 *
 * Sampling THRESHOLDS rather than a fixed grid is exact: the raw term is
 * constant between thresholds, so the threshold representatives are the
 * complete set of distinct values above the query. The set below is the union
 * of the variant thresholds and the compaction thresholds — miss one and the
 * clamp silently stops being a clamp on that band.
 *
 * It is applied ONCE, to the whole card, not per term. `max(Σ terms)` is never
 * larger than `Σ max(term)`, so one clamp at the top is the tightest monotone
 * correction available.
 */
const CLAMP_THRESHOLDS = [0.2, 0.35, 0.48, 0.6, 0.62, 0.72, 0.82, 0.92];

function monotoneTail(rawAt, density) {
  const d = Number.isFinite(density) ? Math.min(Math.max(density, 0), 1) : 0.6;
  let worst = rawAt(d);
  for (const threshold of CLAMP_THRESHOLDS) {
    if (threshold <= d) continue;
    const value = rawAt(threshold);
    if (value > worst) worst = value;
  }
  return worst;
}

// `countWrappedLines` lives in utils.js — the same primitive measures the week
// header's title and epigraph. Note in particular that it does NOT treat a
// newline as a hard break: `.story-prompt`, `.binary-choice-text` and
// `.exercise-instruction` all render with `white-space: normal`, so a newline
// collapses to a space. The old model split on `\n`; that branch was a no-op
// (no prompt, label or hint in the corpus contains one) but it modelled a
// break the browser never draws.

function rawPromptHeight(prompt, density) {
  const tier = PROMPT_LADDER[variantKey(density)];
  const lineCount = countWrappedLines(prompt, tier.charsPerLine);
  if (!lineCount) return 0;

  return lineCount * tier.lineHeight + tier.padY;
}

export function estimatePromptHeight(session, density) {
  const prompt = session && session.storyPrompt;
  if (!prompt) return 0;

  return monotoneTail((d) => rawPromptHeight(prompt, d), density);
}

function rawBinaryChoiceHeight(choice, density) {
  const tier = CHOICE_LADDER[variantKey(density)];
  const labelLines = Math.max(
    1,
    countWrappedLines(choice.choiceLabel || DEFAULT_CHOICE_LABEL, tier.labelChars),
  );
  const optionLines = countWrappedLines(choice.promptA, tier.textChars)
    + countWrappedLines(choice.promptB, tier.textChars);

  return labelLines * tier.labelLineHeight
    + optionLines * tier.textLineHeight
    + tier.chrome;
}

export function estimateBinaryChoiceHeight(session, density) {
  const choice = session && session.binaryChoice;
  if (!choice) return 0;

  return monotoneTail((d) => rawBinaryChoiceHeight(choice, d), density);
}

/**
 * `.mark-strip` height, or 0 when the session carries no strip.
 *
 * Zero is the whole dormancy guarantee on the estimate side: every session in
 * the corpus predates the feature, so this term must contribute nothing at all
 * to their totals — not a rounding difference, not a gap.
 */
function rawMarkStripHeight(markStrip, density) {
  if (!markStrip) return 0;
  const targets = Array.isArray(markStrip.targets) ? markStrip.targets : [];
  if (!targets.length) return 0;

  const tier = STRIP_LADDER[variantKey(density)];
  return tier.padTop + tier.border + Math.max(tier.box, tier.labelLine);
}

/**
 * Height of one session's mark strip at a density. Exported for symmetry with
 * the prompt and choice terms; the card estimate uses the raw term directly.
 *
 * @param {object} session — a schema session object
 * @param {number} density
 * @returns {number} px, 0 when the session has no markStrip
 */
export function estimateMarkStripHeight(session, density) {
  const strip = session && session.markStrip;
  if (!strip) return 0;

  return monotoneTail((d) => rawMarkStripHeight(strip, d), density);
}

// ---------------------------------------------------------------------------
// Card composition
// ---------------------------------------------------------------------------

/**
 * What the renderer will actually build for this session — mirrors
 * `buildWorkoutCardModel()` (workout-models.js) and `renderWorkoutCard()`
 * (workout-primitives.js). The card is a flex column, so the number of
 * children decides how many gaps get paid; guessing it is how the old model
 * lost 3–9px per card.
 */
function cardComposition(session) {
  const exercises = Array.isArray((session || {}).exercises) ? session.exercises : [];
  const hasPrompt = !!(session && session.storyPrompt);
  const hasTable = exercises.length > 0;
  const hasChoice = !!(session && session.binaryChoice);
  // Mirrors buildMarkStripModel(): a strip with no targets renders nothing, so
  // it is not a body child and pays no gap.
  const strip = (session || {}).markStrip;
  const hasStrip = !!(strip && Array.isArray(strip.targets) && strip.targets.length);
  // `showNotes` mirrors buildWorkoutCardModel: explicit boolean wins, else the
  // notes box appears only when there are exercises to write against.
  const showNotes = typeof (session || {}).showNotes === 'boolean'
    ? session.showNotes
    : hasTable;

  return {
    exercises,
    hasPrompt,
    hasTable,
    hasChoice,
    hasStrip,
    showNotes,
    // header + [prompt] + meta + body
    cardChildren: 1 + (hasPrompt ? 1 : 0) + 1 + 1,
    // [table] + [strip] + [choice] + [notes]
    bodyChildren: (hasTable ? 1 : 0) + (hasStrip ? 1 : 0) + (hasChoice ? 1 : 0) + (showNotes ? 1 : 0),
  };
}

/**
 * The exercise table: one row per authored exercise, plus a wrapped
 * instruction hint on the rows that carry one.
 *
 * There is no minimum row count. The old model floored it at 2, which added a
 * phantom row to every single-exercise session — 57 cards in the corpus, worth
 * 15–21px each. The renderer renders exactly what is authored.
 */
function rawExerciseTableHeight(exercises, tier) {
  if (!exercises.length) return 0;

  let height = exercises.length * tier.row + (exercises.length - 1) * tier.tableGap;

  for (const exercise of exercises) {
    const instruction = describeExerciseLoad(exercise).instructionHint;
    if (!instruction) continue;
    height += INSTRUCTION_GAP
      + countWrappedLines(instruction, INSTRUCTION_CHARS_PER_LINE) * tier.instrLine;
  }

  return height;
}

/**
 * The `--notes-box-height` the atom renderer will set for a density: the ruled
 * writing area, 8 lines at maximum whitespace down to a 3-line floor.
 *
 * Exported and consumed by `atoms/session-card.js`, so the formula and its
 * line height exist ONCE. They used to exist twice — the atom carried its own
 * `NOTES_LINE_HEIGHT = 22` and its own `Math.max(3, Math.round(8 - d * 6))` —
 * which is the D71 defect class waiting to happen: a change on either side
 * silently detunes the solver.
 *
 * @param {number} density
 * @returns {number} px, excluding the box's own margin
 */
export function sessionCardNotesHeight(density) {
  const normalized = Number.isFinite(density) ? density : 0.6;
  const lines = Math.max(3, Math.round(8 - normalized * 6));
  return lines * NOTES_LINE_HEIGHT;
}

/** As rendered: the writing area plus the box's margin-top. */
function notesBoxHeight(density) {
  return sessionCardNotesHeight(density) + NOTES_MARGIN;
}

function rawSessionCardHeight(session, density) {
  const tier = CARD_LADDER[variantKey(density)];
  const box = cardBox(density);
  const parts = cardComposition(session);

  return box.padY
    + box.gap * (parts.cardChildren - 1)
    + tier.header
    + (parts.hasPrompt ? rawPromptHeight(session.storyPrompt, density) : 0)
    + (session && session.fragmentRef ? tier.meta : tier.metaEmpty)
    + Math.max(0, parts.bodyChildren - 1) * tier.bodyGap
    + rawExerciseTableHeight(parts.exercises, tier)
    + rawMarkStripHeight(parts.hasStrip ? session.markStrip : null, density)
    + (parts.hasChoice ? rawBinaryChoiceHeight(session.binaryChoice, density) : 0)
    + (parts.showNotes ? notesBoxHeight(density) : 0);
}

/**
 * Height of one session card at a density, as it will render on a workout
 * page. Non-increasing in density (Charter invariant 4) via monotoneTail.
 *
 * @param {object} session — a schema session object
 * @param {number} density — 0.0 (spacious) to 1.0 (maximum compression)
 * @returns {number} px
 */
export function estimateSessionCardHeight(session, density) {
  return monotoneTail((d) => rawSessionCardHeight(session, d), density);
}

/**
 * Height of a session card that will be ALONE on its page
 * (`data-card-count="1"`). Density-invariant by construction — see SOLO_CARD.
 *
 * Only the chunker may call this: it is the one component that knows a chunk's
 * size before the page exists.
 *
 * @param {object} session
 * @returns {number} px
 */
export function estimateSoloSessionCardHeight(session) {
  const parts = cardComposition(session);
  // Interior text still follows the base tier: the card-count rules restore
  // base-ish type sizes, and `.exercise-*` carries no card-count override at
  // all, so the base row/gap geometry is the honest read.
  const tier = CARD_LADDER.base;

  const prompt = parts.hasPrompt
    ? countWrappedLines(session.storyPrompt, SOLO_CARD.promptCharsPerLine)
      * SOLO_CARD.promptLineHeight + SOLO_CARD.promptPadY
    : 0;

  return SOLO_CARD.padY
    + SOLO_CARD.gap * (parts.cardChildren - 1)
    + tier.header
    + prompt
    + (session && session.fragmentRef ? tier.meta : tier.metaEmpty)
    + Math.max(0, parts.bodyChildren - 1) * SOLO_CARD.bodyGap
    + rawExerciseTableHeight(parts.exercises, tier)
    + rawMarkStripHeight(parts.hasStrip ? session.markStrip : null, SOLO_CARD.stripDensity)
    + (parts.hasChoice ? rawBinaryChoiceHeight(session.binaryChoice, 0) : 0)
    + (parts.showNotes ? SOLO_CARD.notes : 0);
}
