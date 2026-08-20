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
// D121: the estimate's only knowledge of typefaces. Forwarded, never read here
// — a missing context resolves to the calibration anchors, so every estimate is
// byte-identical without one (ATOM-IR / the render.js options.typeMetrics row).
import { readTypeMetrics } from '../type-metrics.js';

/**
 * THE FORM CHANNEL, in one place (ARRANGEMENT §3 clause 3 — one channel).
 *
 * The variant contract's third clause is that the chosen variant reaches the
 * measuring step and the drawing step BY THE SAME ROUTE, so the two can never
 * disagree. That route is `atom.data`, and it is the one field both halves
 * already carry: `estimate()` is handed `atom.data` alone (page-planner.js and
 * density-solver.js both call it that way) while `render()` receives the whole
 * descriptor. A sibling field on the descriptor would be visible to render and
 * invisible to the estimate — which is precisely the divergence the prime
 * invariant forbids, built in on purpose.
 *
 * So both functions below project the SAME four fields out of `data` through
 * this one helper. The engine learns nothing: `formVariant` is an opaque string
 * to it, exactly as `ownsPage` is an opaque boolean.
 *
 * `openingRitual` joined them on 2026-08-19 and rides this route for the same
 * reason the other three do: it is printed chrome that MEASURES (it wraps into
 * `.session-step-note` lines the estimate charges for), so a field visible to
 * render and invisible to the estimate would be the divergence the prime
 * invariant forbids, arriving through the one door left open.
 */
function formSpecOf(data) {
  return {
    form: data.formVariant,
    markInstruction: data.markInstruction,
    rulesPointer: data.rulesPointer,
    openingRitual: data.openingRitual,
  };
}

registerAtom('session-card', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'left',

  estimate(data, density, context) {
    const atomData = data || {};
    const session = atomData.session || {};
    // W3-F02: the exercise-name wrap term is a per-character advance against a
    // capped column, so it is face-dependent like every other wrapped-text
    // term. See exerciseNameLines() in session-card-metrics.js.
    const metrics = readTypeMetrics(context);

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
    const formSpec = formSpecOf(atomData);

    if (atomData.ownsPage) {
      const soloHeight = estimateSoloSessionCardHeight(session, metrics, formSpec);
      return { minHeight: soloHeight, preferredHeight: soloHeight };
    }

    return {
      minHeight: estimateSessionCardHeight(session, 1, metrics, formSpec),
      preferredHeight: estimateSessionCardHeight(session, density, metrics, formSpec),
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

    // The same projection the estimate reads, three lines above. The form
    // attribute itself is stamped by renderWorkoutCard(), beside the chrome it
    // selects — see the note there on why it cannot be stamped here.
    const cardModel = buildWorkoutCardModel(session, layoutPlan, formSpecOf(data));
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
