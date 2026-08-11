import {
  describeExerciseLoad,
  getExerciseSetCount,
  getRepTargets,
  showLoadSuffix
} from './utils.js?v=48';

let textMeasureContext = null;

function getTextMeasureContext() {
  if (typeof document === 'undefined') return null;
  if (textMeasureContext) return textMeasureContext;

  const canvas = document.createElement('canvas');
  textMeasureContext = canvas.getContext('2d');
  return textMeasureContext;
}

function measureExerciseNameWidthPx(name) {
  const context = getTextMeasureContext();
  const label = String(name || 'Lift').trim() || 'Lift';
  if (!context) return Math.max(54, Math.min(142, label.length * 8));

  context.font = '700 10.67px \"Libre Baskerville\", Georgia, serif';
  return Math.ceil(context.measureText(label).width);
}

function resolveExerciseNameWidthPx(exercises) {
  const longestWidth = Math.max(
    54,
    ...(exercises || []).map((exercise) => measureExerciseNameWidthPx(exercise && exercise.name))
  );
  return Math.min(longestWidth + 16, 168);
}

function buildExerciseRowModel(exercise) {
  const repTargets = getRepTargets(exercise);
  const repCount = getExerciseSetCount(exercise);
  const loadDisplay = describeExerciseLoad(exercise);
  const hasLoad = showLoadSuffix(exercise) && loadDisplay.hasLoadValue;

  return {
    hasLoad,
    name: exercise && exercise.name || 'Lift',
    loadValue: hasLoad ? loadDisplay.loadValue : '',
    loadUnit: hasLoad ? loadDisplay.loadUnit : '',
    instructionHint: loadDisplay.instructionHint || '',
    repTargets: repTargets.slice(0, repCount)
  };
}

function buildBinaryChoiceModel(binaryChoice) {
  if (!binaryChoice) return null;
  return {
    label: binaryChoice.choiceLabel || 'Route Decision',
    promptA: binaryChoice.promptA || '',
    promptB: binaryChoice.promptB || ''
  };
}

/**
 * The Mark surface: the strip of tick targets printed inside the session body.
 *
 * DORMANCY (the binaryChoice pattern, exactly): returns null when the session
 * carries no `markStrip` — which is every session in the corpus. A null model
 * makes renderMarkStrip() a no-op, which keeps `.session-body`'s child count,
 * and therefore every gap the geometry model charges, unchanged.
 *
 * `kind` is deliberately NOT read. It is a machine enum for the generator's
 * derivation pass; nothing about it is ever printed, so the renderer has no
 * business knowing its values (and cannot drift from them).
 */
function buildMarkStripModel(markStrip) {
  if (!markStrip) return null;
  const targets = Array.isArray(markStrip.targets) ? markStrip.targets : [];
  if (!targets.length) return null;

  return {
    targets: targets.map((target) => ({
      label: String((target && target.label) || '').trim()
    }))
  };
}

export function buildWorkoutCardModel(session, layoutPlan) {
  const exercises = session.exercises || [];
  const showNotes = typeof session.showNotes === 'boolean' ? session.showNotes : exercises.length > 0;
  const continuationLabel = String(session.continuationLabel || '').trim();

  return {
    flexWeight: layoutPlan && layoutPlan.flexWeight ? layoutPlan.flexWeight : 1,
    notesHeight: layoutPlan && typeof layoutPlan.notesHeight === 'number' ? layoutPlan.notesHeight : 12,
    sessionLabel: typeof session.label === 'string' ? session.label : 'Session',
    continuationLabel,
    storyPrompt: session.storyPrompt || '',
    fragmentRefText: session.fragmentRef ? 'Fragment ' + session.fragmentRef : '',
    exerciseNameWidthPx: resolveExerciseNameWidthPx(exercises),
    exerciseRows: exercises.map((exercise) => buildExerciseRowModel(exercise)),
    binaryChoice: buildBinaryChoiceModel(session.binaryChoice),
    markStrip: buildMarkStripModel(session.markStrip),
    showNotes
  };
}

