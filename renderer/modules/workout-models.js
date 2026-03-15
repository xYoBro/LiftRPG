import {
  formatExerciseTargetLoad,
  getExerciseSetCount,
  getRepTargets,
  showLoadSuffix
} from './utils.js?v=46';

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
  return Math.min(longestWidth + 2, 132);
}

function buildExerciseRowModel(exercise) {
  const repTargets = getRepTargets(exercise);
  const repCount = getExerciseSetCount(exercise);
  const hasLoad = showLoadSuffix(exercise);

  return {
    hasLoad,
    name: exercise && exercise.name || 'Lift',
    loadHint: hasLoad ? formatExerciseTargetLoad(exercise) : '',
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
    showNotes
  };
}

export function buildWorkoutPageModel(sessions, pagePlan) {
  return {
    cardCount: pagePlan.cardCount,
    pageDensity: pagePlan.pageDensity,
    cards: (sessions || []).map((session, index) => buildWorkoutCardModel(session, pagePlan.cards[index]))
  };
}
