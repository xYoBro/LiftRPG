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
// sessionCardVariant lives beside the geometry it selects: the estimate model
// keys its measured ladder off the same thresholds, and a copy here would let
// the two drift (the D71 defect class). See the CROSS-FILE CONTRACT note in
// session-card-metrics.js.
import { estimateSessionCardHeight, sessionCardVariant } from '../session-card-metrics.js';

const NOTES_LINE_HEIGHT = 22;

registerAtom('session-card', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'left',

  estimate(data, density) {
    const session = (data || {}).session || {};
    return {
      minHeight: estimateSessionCardHeight(session, 1),
      preferredHeight: estimateSessionCardHeight(session, density),
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const session = data.session || {};
    const normalizedDensity = Number.isFinite(density) ? density : 0.6;

    // Compute notes height from density
    const notesLines = Math.max(3, Math.round(8 - normalizedDensity * 6));
    const notesHeight = notesLines * NOTES_LINE_HEIGHT;

    // Build a layoutPlan compatible with buildWorkoutCardModel
    const layoutPlan = {
      flexWeight: 1,
      notesHeight,
      cards: [{ flexWeight: 1, notesHeight }],
    };

    const cardModel = buildWorkoutCardModel(session, layoutPlan);
    const card = renderWorkoutCard(cardModel);
    const variant = sessionCardVariant(normalizedDensity);
    if (variant) card.setAttribute('data-density-variant', variant);
    if (session.binaryChoice) card.setAttribute('data-has-binary-choice', 'true');
    card.setAttribute('data-exercise-count', String(Array.isArray(session.exercises) ? session.exercises.length : 0));
    return card;
  },
});

export default 'session-card';
