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
// quantities, which shrink as density rises. It does NOT work for
// chars-per-line, which is an INVERSE-size quantity, so those two pairs are
// named by their end instead.

const PROMPT_MIN_LINE_HEIGHT = 10.2;   // 6.35pt × 1.22 — the tight variant
const PROMPT_MAX_LINE_HEIGHT = 12.4;   // 7.5pt × ~1.24 — the base variant
const PROMPT_PADDING_MIN = 4;
const PROMPT_PADDING_MAX = 8;
const CHOICE_MIN_LINE_HEIGHT = 9.6;
const CHOICE_MAX_LINE_HEIGHT = 11.6;
const CHOICE_LABEL_MIN_HEIGHT = 11;
const CHOICE_LABEL_MAX_HEIGHT = 15;
const CHOICE_CHROME_MIN = 12;
const CHOICE_CHROME_MAX = 18;
const NOTE_CHROME_MIN = 6;
const NOTE_CHROME_MAX = 10;
const EXERCISE_INSTRUCTION_LINE_HEIGHT = 8.4;
const EXERCISE_INSTRUCTION_CHARS_PER_LINE = 18;

/**
 * Wrap widths — CHARACTERS PER LINE.
 *
 * KNOWN INACCURACY, deliberately kept. These interpolate the wrong way. The
 * card column is a fixed width and density changes only the font, so a denser
 * card fits MORE characters per line, never fewer — `.story-prompt` runs 7.5pt
 * (base) → 7pt (compact) → 6.35pt (dense/tight) and `.binary-choice-text` 7pt
 * → 6.1pt → 5.8pt in booklet.css. The model does the opposite: 70 chars at
 * density 0.0 narrowing to 54 at density 1.0.
 *
 * Raising density therefore added wrapped lines faster than it shrank them
 * (wrap ratio 70/54 = 1.30 beats line-height ratio 12.4/10.2 = 1.22), and at
 * every wrap boundary the raw term stepped UP as density rose — a breach of
 * Charter invariant 4, measured at 120 steps across 103 of the corpus's 184
 * session cards. The clamp below removes the breach; these constants are left
 * alone because re-orienting them is NOT a local change:
 *
 *   • Only the density-1.0 value reaches the planner —
 *     `page-planner.estimateAtomHeight()` packs on `minHeight`, which is
 *     `estimateSessionCardHeight(session, 1)`. Widening the tight end (the
 *     physically correct direction) lowers that floor, which re-plans every
 *     page: it packed a 4th session card onto The-Hinge page 13 and clipped it
 *     8px, and shifted printed atom order in two fixtures.
 *   • Narrowing the spacious end instead keeps the floor but inflates
 *     `preferredHeight` at mid densities, which inflates the solver's shrink
 *     potential (`preferred(d) − min(1.0)`). That flipped The-Hinge page 13
 *     from "shed a card" to "compress three", and the compressed page clips
 *     8px inside a card whose notes-box is already at its 66px floor.
 *
 * Both are real re-plans of a print artifact and need author review, so the
 * calibration stays and the contract is enforced by the clamp. Note the whole
 * span is conservative anyway: a browser sweep of the rendered `.story-prompt`
 * at the tight variant (439px column, 8.47px font) measures ~110 characters on
 * a full line, twice what is modelled here, so the term over-counts lines.
 */
const PROMPT_CHARS_PER_LINE_SPACIOUS = 70;   // density 0.0
const PROMPT_CHARS_PER_LINE_TIGHT    = 54;   // density 1.0 — planner anchor
const CHOICE_CHARS_PER_LINE_SPACIOUS = 46;
const CHOICE_CHARS_PER_LINE_TIGHT    = 34;   // density 1.0 — planner anchor

/**
 * MONOTONE CLAMP — Charter invariant 4 ("estimates never rise with density").
 *
 * A wrapped-text term is a step function of density, and the step direction
 * above is wrong, so the raw term can rise. `monotoneTail()` returns the
 * WORST CASE over every sampled density at or above the requested one, which
 * makes the result non-increasing by construction: raising the query density
 * can only shrink the sampled set, so the max can only fall. Sampling starts
 * at the grid point at or below the query, so the clamp never reports less
 * than the raw model would at that grid step.
 *
 * Two properties matter downstream and both hold:
 *   • at density 1.0 the sampled set is exactly {1.0}, so `minHeight` — the
 *     planner's packing anchor — is bit-identical to the pre-clamp value;
 *   • `preferredHeight` moves only where the raw term was about to rise,
 *     which is the minimum perturbation any monotone correction can make
 *     (a non-increasing g with g(1) = raw(1) must have g(d) ≥ raw(1) for all
 *     d, so no zero-change fix exists).
 *
 * The 0.05 grid resolves every density variant threshold the renderer uses.
 */
const CLAMP_GRID_STEP = 0.05;

function monotoneTail(rawAt, density) {
  const d = Number.isFinite(density) ? Math.min(Math.max(density, 0), 1) : 0.6;
  const steps = Math.round(1 / CLAMP_GRID_STEP);
  let worst = 0;
  for (let i = Math.floor(d / CLAMP_GRID_STEP); i <= steps; i += 1) {
    const value = rawAt(Math.min(1, i * CLAMP_GRID_STEP));
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
  const charsPerLine = lerp(PROMPT_CHARS_PER_LINE_TIGHT, PROMPT_CHARS_PER_LINE_SPACIOUS, density);
  const lineHeight = lerp(PROMPT_MIN_LINE_HEIGHT, PROMPT_MAX_LINE_HEIGHT, density);
  const lineCount = countWrappedLines(prompt, charsPerLine);
  if (!lineCount) return 0;

  return lineCount * lineHeight + lerp(PROMPT_PADDING_MIN, PROMPT_PADDING_MAX, density);
}

export function estimatePromptHeight(session, density) {
  const prompt = session && session.storyPrompt;
  if (!prompt) return 0;

  return monotoneTail((d) => rawPromptHeight(prompt, d), density);
}

function rawBinaryChoiceHeight(choice, density) {
  const charsPerLine = lerp(CHOICE_CHARS_PER_LINE_TIGHT, CHOICE_CHARS_PER_LINE_SPACIOUS, density);
  const lineHeight = lerp(CHOICE_MIN_LINE_HEIGHT, CHOICE_MAX_LINE_HEIGHT, density);
  const optionLines = countWrappedLines(choice.promptA, charsPerLine)
    + countWrappedLines(choice.promptB, charsPerLine);

  return lerp(CHOICE_LABEL_MIN_HEIGHT, CHOICE_LABEL_MAX_HEIGHT, density)
    + optionLines * lineHeight
    + lerp(CHOICE_CHROME_MIN, CHOICE_CHROME_MAX, density);
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
