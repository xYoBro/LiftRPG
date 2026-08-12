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
import {
  estimateSessionCardHeight, estimateSoloSessionCardHeight,
  sessionCardVariant, sessionCardNotesHeight,
} from '../session-card-metrics.js';

registerAtom('session-card', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'left',

  estimate(data, density) {
    const atomData = data || {};
    const session = atomData.session || {};

    // A card that OWNS its page is a different object, and the atom cannot
    // work that out for itself — it is handed a session and a density, never a
    // page. The adapter declares it (`data.ownsPage`, see sessionChunkOwnsPage
    // in adapters/liftrpg-adapter.js) and the renderer stamps the same answer
    // as `data-solo-card`, so the geometry this estimate predicts is the
    // geometry that prints. Still a pure function of the atom's own data.
    //
    // min === preferred is not a shortcut: every rule in the solo CSS block is
    // density-invariant, so the shrink potential really is zero, and saying so
    // is what stops the solver spending passes on a card that cannot move.
    if (atomData.ownsPage) {
      const soloHeight = estimateSoloSessionCardHeight(session);
      return { minHeight: soloHeight, preferredHeight: soloHeight };
    }

    return {
      minHeight: estimateSessionCardHeight(session, 1),
      preferredHeight: estimateSessionCardHeight(session, density),
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const session = data.session || {};
    const normalizedDensity = Number.isFinite(density) ? density : 0.6;

    // Notes height comes from the metrics module, which also models it —
    // one formula, so the estimate and the render cannot disagree.
    const notesHeight = sessionCardNotesHeight(normalizedDensity);

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
    if (session.markStrip) card.setAttribute('data-has-mark-strip', 'true');
    card.setAttribute('data-exercise-count', String(Array.isArray(session.exercises) ? session.exercises.length : 0));
    return card;
  },
});

export default 'session-card';
