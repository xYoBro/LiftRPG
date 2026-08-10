import { describeExerciseLoad } from './utils.js?v=47';

const NOTES_LINE_HEIGHT = 22;
const CARD_HEADER_HEIGHT = 38;
const CARD_META_HEIGHT = 11;
const EXERCISE_ROW_HEIGHT = 24;
const EXERCISE_TABLE_CHROME = 14;
const CARD_PADDING = 18;
const MIN_EXERCISES = 2;
// ---------------------------------------------------------------------------
// Density-interpolated constants
// ---------------------------------------------------------------------------
// Every `_MIN` below is the value at density 1.0 (tight) and every `_MAX` the
// value at density 0.0 (spacious) — see lerp(). That naming works for SIZE
// quantities, which shrink as density rises. The wrapped-text terms are NOT
// interpolated at all any more: they read the step ladder below, because the
// renderer's own geometry is a step function of density, not a ramp.

const NOTE_CHROME_MIN = 6;
const NOTE_CHROME_MAX = 10;
const EXERCISE_INSTRUCTION_LINE_HEIGHT = 8.4;
const EXERCISE_INSTRUCTION_CHARS_PER_LINE = 18;

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
 * Adding a variant means: a CSS block, a threshold here, and a row in BOTH
 * ladders below. A missing ladder row silently falls back to 'base' geometry,
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

/**
 * WRAPPED-TEXT GEOMETRY — measured, not guessed.
 *
 * CROSS-FILE CONTRACT: every number below was read off the rendered DOM and
 * mirrors a specific `booklet.css` declaration. Changing the CSS without
 * changing the matching row here makes the density solver's shrink-potential
 * arithmetic (`preferred(d) − min(1.0)`) lie — the D71 defect class. Both
 * files carry reciprocal comments.
 *
 * How these were obtained (2026-08-10): every session card in the 8-fixture
 * corpus was rendered at ten densities inside a real bounded page and the
 * `.story-prompt` / `.binary-choice-*` boxes measured — 1,840 prompt samples
 * and 128 binary-choice samples across all three body font families the
 * archetype presets use (IBM Plex Mono, Libre Baskerville, system-ui).
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
 *     modelling with the capacity under-counts lines. The binding archetype is
 *     always IBM Plex Mono (widest glyphs, fewest characters per line).
 *
 * MONOTONICITY IS A PROPERTY OF THESE TABLES, not of the clamp below.
 * charsPerLine is non-decreasing down the ladder (denser ⇒ smaller font ⇒ more
 * characters fit) and every height term is non-increasing, so the raw term is
 * non-increasing by construction — Charter invariant 4 without a correction.
 *
 * ONE HONEST FUDGE, and it is the CSS that is wrong, not the model: `dense`
 * measures a 10.16px prompt line-height but `tight` measures 10.33px, because
 * `booklet.css` gives `tight` a LOOSER line-height (1.22) than `dense` (1.2)
 * at the same 6.35pt font. A card therefore gets very slightly taller prompt
 * lines as it is compressed. Modelling that faithfully would breach invariant
 * 4 by ~0.5px on a 3-line prompt, so `dense` carries `tight`'s 10.33 — the
 * running maximum from the compressed end, which is the same worst-case rule
 * `monotoneTail()` applies, just resolved statically. Cost: `dense` prompts
 * are over-estimated by 1.7%. Fixing the CSS (making `tight` genuinely tighter
 * than `dense`) would let this row drop back to 10.16, and is a print-artifact
 * change, so it is not made here.
 */
const PROMPT_LADDER = {
  //         charsPerLine  lineHeight  padY   ← booklet.css `.story-prompt`
  base:    { charsPerLine: 68, lineHeight: 16.00, padY: 4 }, // 7.5pt,  inherited lh, padding 2px 0
  compact: { charsPerLine: 71, lineHeight: 11.95, padY: 4 }, // 7pt,    lh 1.28,      padding 2px 0
  dense:   { charsPerLine: 82, lineHeight: 10.33, padY: 2 }, // 6.35pt, lh 1.2*,      padding 1px 0
  tight:   { charsPerLine: 84, lineHeight: 10.33, padY: 2 }, // 6.35pt, lh 1.22,      padding 1px 0
};

/**
 * Binary-choice geometry. `booklet.css` declares density blocks for `dense`
 * and `tight` only, so `compact` renders identically to `base` — the two rows
 * below are equal on purpose, not by oversight.
 *
 * `chrome` is the measured residual (block padding + option gaps + marker
 * rows) after subtracting the label and both option texts; it varied by less
 * than 0.2px across the whole corpus at each tier.
 *
 * The label defaults to 'Route Decision' when `choiceLabel` is absent —
 * mirrors `buildBinaryChoiceModel()` in workout-models.js. Labels in the
 * corpus run 12–151 characters and do wrap to two lines, so the label is a
 * wrapped-text term too, not a constant.
 */
const CHOICE_LADDER = {
  base:    { labelChars: 100, labelLineHeight: 13.07, textChars:  88, textLineHeight: 13.07, chrome: 20.94 },
  compact: { labelChars: 100, labelLineHeight: 13.07, textChars:  88, textLineHeight: 13.07, chrome: 20.94 },
  dense:   { labelChars: 110, labelLineHeight:  9.92, textChars:  97, textLineHeight:  9.60, chrome: 12.00 },
  tight:   { labelChars: 116, labelLineHeight:  8.97, textChars: 104, textLineHeight:  8.51, chrome: 10.00 },
};

/** Mirrors buildBinaryChoiceModel() in workout-models.js. */
const DEFAULT_CHOICE_LABEL = 'Route Decision';

/**
 * MONOTONE CLAMP — Charter invariant 4 ("estimates never rise with density").
 *
 * Now a GUARD, not a correction. Both ladders above are non-increasing by
 * construction, so this returns the raw term unchanged at every density; it
 * exists so that a future ladder edit that breaks the ordering degrades into a
 * conservative over-estimate instead of a solver that fails to converge.
 *
 * `monotoneTail()` returns the worst case over the requested density and every
 * tier at or above it, which is non-increasing by construction: raising the
 * query can only shrink the sampled set, so the max can only fall. The
 * requested density is always sampled itself, so the clamp can never report
 * less than the raw model does at that density.
 *
 * Sampling the TIER BOUNDARIES rather than a fixed 0.05 grid is exact here:
 * the raw term is constant within a tier, so the boundary representatives are
 * the complete set of distinct values above the query. (The old 0.05 grid was
 * also inexact at d = 0.6 — `floor(0.6 / 0.05)` is 11 in floating point, so it
 * sampled the 0.55 dense tier and reported dense geometry at the planner's
 * baseline density.)
 */
function monotoneTail(rawAt, density) {
  const d = Number.isFinite(density) ? Math.min(Math.max(density, 0), 1) : 0.6;
  let worst = rawAt(d);
  for (const tier of VARIANT_THRESHOLDS) {
    if (tier.minDensity <= d) break;         // tiers are ordered densest-first
    const value = rawAt(tier.minDensity);
    if (value > worst) worst = value;
  }
  return worst;
}

/**
 * Interpolate between a value at maximum density and one at minimum density.
 *
 * @param {number} atMaxDensity — the value at density 1.0
 * @param {number} atMinDensity — the value at density 0.0
 * @param {number} density — 0.0 (spacious) to 1.0 (tight)
 */
function lerp(atMaxDensity, atMinDensity, density) {
  return atMaxDensity + (atMinDensity - atMaxDensity) * (1 - density);
}

function countWrappedLines(text, charsPerLine) {
  const normalized = String(text || '').trim();
  if (!normalized) return 0;

  return normalized
    .split(/\n+/)
    .filter(Boolean)
    .reduce((sum, line) => {
      const length = line.trim().length;
      if (length <= 0) return sum;
      return sum + Math.max(1, Math.ceil(length / Math.max(12, charsPerLine)));
    }, 0);
}

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

export function estimateSessionCardHeight(session, density) {
  const normalizedDensity = Number.isFinite(density) ? density : 0.6;
  const exercises = Array.isArray((session || {}).exercises) ? session.exercises : [];
  const exerciseCount = Math.max(exercises.length, MIN_EXERCISES);
  const instructionHeight = exercises.reduce((sum, exercise) => {
    const instruction = describeExerciseLoad(exercise).instructionHint;
    if (!instruction) return sum;
    const lines = Math.max(1, Math.min(2, countWrappedLines(instruction, EXERCISE_INSTRUCTION_CHARS_PER_LINE)));
    return sum + lines * EXERCISE_INSTRUCTION_LINE_HEIGHT + 3;
  }, 0);
  const notesLines = Math.max(3, Math.round(8 - normalizedDensity * 6));
  const notesHeight = notesLines * NOTES_LINE_HEIGHT;

  return CARD_HEADER_HEIGHT
    + CARD_META_HEIGHT
    + CARD_PADDING
    + EXERCISE_TABLE_CHROME
    + exerciseCount * EXERCISE_ROW_HEIGHT
    + instructionHeight
    + estimatePromptHeight(session, normalizedDensity)
    + estimateBinaryChoiceHeight(session, normalizedDensity)
    + notesHeight
    + lerp(NOTE_CHROME_MIN, NOTE_CHROME_MAX, normalizedDensity);
}
