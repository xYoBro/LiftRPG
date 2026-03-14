/**
 * session-card.js — Session card atom
 *
 * Wraps workout-primitives.js renderWorkoutCard() and
 * workout-models.js buildWorkoutCardModel() into the atom interface.
 *
 * Data shape: { session, weekIndex, weekMeta, profile }
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildWorkoutCardModel } from '../workout-models.js';
import { renderWorkoutCard } from '../workout-primitives.js';

const EXERCISE_ROW_HEIGHT = 28;
const CHROME_HEIGHT = 65;
const BINARY_CHOICE_HEIGHT = 45;
const NOTES_LINE_HEIGHT = 22;
const PROMPT_LINE_HEIGHT = 20;
const PROMPT_CHARS_PER_LINE = 45;

registerAtom('session-card', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'left',

  estimate(data, density) {
    const session = data.session || {};
    const exercises = session.exercises || [];

    let height = CHROME_HEIGHT;

    // Exercise rows
    height += exercises.length * EXERCISE_ROW_HEIGHT;

    // Story prompt
    if (session.storyPrompt) {
      const lines = Math.ceil(session.storyPrompt.length / PROMPT_CHARS_PER_LINE);
      height += lines * PROMPT_LINE_HEIGHT;
    }

    // Binary choice
    if (session.binaryChoice) {
      height += BINARY_CHOICE_HEIGHT;
    }

    // Notes box — shrinks with density
    const notesLines = Math.round(8 - density * 6);
    height += notesLines * NOTES_LINE_HEIGHT;

    return { minHeight: height, preferredHeight: height };
  },

  render(atom, density) {
    const data = atom.data || {};
    const session = data.session || {};

    // Compute notes height from density
    const notesLines = Math.round(8 - density * 6);
    const notesHeight = notesLines * NOTES_LINE_HEIGHT;

    // Build a layoutPlan compatible with buildWorkoutCardModel
    const layoutPlan = {
      flexWeight: 1,
      notesHeight,
      cards: [{ flexWeight: 1, notesHeight }],
    };

    const cardModel = buildWorkoutCardModel(session, layoutPlan);
    return renderWorkoutCard(cardModel);
  },
});

export default 'session-card';
