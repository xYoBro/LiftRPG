import { describeExerciseLoad } from './utils.js?v=47';

const NOTES_LINE_HEIGHT = 22;
const CARD_HEADER_HEIGHT = 38;
const CARD_META_HEIGHT = 11;
const EXERCISE_ROW_HEIGHT = 24;
const EXERCISE_TABLE_CHROME = 14;
const CARD_PADDING = 18;
const MIN_EXERCISES = 2;
const PROMPT_MIN_CHARS_PER_LINE = 54;
const PROMPT_MAX_CHARS_PER_LINE = 70;
const PROMPT_MIN_LINE_HEIGHT = 10.2;
const PROMPT_MAX_LINE_HEIGHT = 12.4;
const PROMPT_PADDING_MIN = 4;
const PROMPT_PADDING_MAX = 8;
const CHOICE_MIN_CHARS_PER_LINE = 34;
const CHOICE_MAX_CHARS_PER_LINE = 46;
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

function lerp(min, max, density) {
  return min + (max - min) * (1 - density);
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

export function estimatePromptHeight(session, density) {
  const prompt = session && session.storyPrompt;
  if (!prompt) return 0;

  const charsPerLine = lerp(PROMPT_MIN_CHARS_PER_LINE, PROMPT_MAX_CHARS_PER_LINE, density);
  const lineHeight = lerp(PROMPT_MIN_LINE_HEIGHT, PROMPT_MAX_LINE_HEIGHT, density);
  const lineCount = countWrappedLines(prompt, charsPerLine);
  if (!lineCount) return 0;

  return lineCount * lineHeight + lerp(PROMPT_PADDING_MIN, PROMPT_PADDING_MAX, density);
}

export function estimateBinaryChoiceHeight(session, density) {
  const choice = session && session.binaryChoice;
  if (!choice) return 0;

  const charsPerLine = lerp(CHOICE_MIN_CHARS_PER_LINE, CHOICE_MAX_CHARS_PER_LINE, density);
  const lineHeight = lerp(CHOICE_MIN_LINE_HEIGHT, CHOICE_MAX_LINE_HEIGHT, density);
  const optionLines = countWrappedLines(choice.promptA, charsPerLine)
    + countWrappedLines(choice.promptB, charsPerLine);

  return lerp(CHOICE_LABEL_MIN_HEIGHT, CHOICE_LABEL_MAX_HEIGHT, density)
    + optionLines * lineHeight
    + lerp(CHOICE_CHROME_MIN, CHOICE_CHROME_MAX, density);
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
