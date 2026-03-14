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

const NOTES_LINE_HEIGHT = 22;

/** Approximate row heights for estimate calculation.
 *  These don't need to be pixel-perfect — the measurement harness
 *  refines actual heights. They just need to be close enough for
 *  the density solver to make good compression decisions. */
const CARD_HEADER_HEIGHT = 48;
const EXERCISE_ROW_HEIGHT = 28;
const CARD_PADDING = 30;
const MIN_EXERCISES = 2;

/** Notes lines at maximum density (density = 1.0).
 *  Formula: Math.round(8 - 1.0 * 6) = 2 lines. */
const MAX_DENSITY_NOTES_LINES = 2;

registerAtom('session-card', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'left',

  estimate(data, density) {
    // Data-aware base: header + exercise rows + padding
    const session = (data || {}).session || {};
    const exercises = Array.isArray(session.exercises) ? session.exercises : [];
    const exerciseCount = Math.max(exercises.length, MIN_EXERCISES);
    const baseHeight = CARD_HEADER_HEIGHT + exerciseCount * EXERCISE_ROW_HEIGHT + CARD_PADDING;

    // Density-responsive notes area
    const notesLines = Math.round(8 - density * 6);
    const notesHeight = notesLines * NOTES_LINE_HEIGHT;

    // minHeight: at max compression (fewest notes lines) — used for packing
    const minNotesHeight = MAX_DENSITY_NOTES_LINES * NOTES_LINE_HEIGHT;

    return {
      minHeight:       baseHeight + minNotesHeight,
      preferredHeight: baseHeight + notesHeight,
    };
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
