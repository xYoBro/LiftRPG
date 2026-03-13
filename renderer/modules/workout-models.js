import {
  getExerciseSetCount,
  getExerciseTargetLoad,
  getRepTargets,
  showLoadSuffix
} from './utils.js?v=17';

function resolveExerciseNameWidthCh(exercises) {
  const longestExerciseName = Math.max(
    4,
    ...(exercises || []).map((exercise) => String(exercise && exercise.name || 'Lift').trim().length || 4)
  );
  return Math.min(longestExerciseName, 20);
}

function buildExerciseRowModel(exercise) {
  const repTargets = getRepTargets(exercise);
  const repCount = getExerciseSetCount(exercise);
  const hasLoad = showLoadSuffix(exercise);

  return {
    hasLoad,
    name: exercise && exercise.name || 'Lift',
    loadHint: hasLoad ? getExerciseTargetLoad(exercise) : '',
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

  return {
    flexWeight: layoutPlan && layoutPlan.flexWeight ? layoutPlan.flexWeight : 1,
    notesHeight: layoutPlan && layoutPlan.notesHeight ? layoutPlan.notesHeight : 0,
    sessionLabel: typeof session.label === 'string' ? session.label : 'Session',
    storyPrompt: session.storyPrompt || '',
    fragmentRefText: session.fragmentRef ? 'Fragment ' + session.fragmentRef : '',
    exerciseNameWidthCh: resolveExerciseNameWidthCh(exercises),
    exerciseRows: exercises.map((exercise) => buildExerciseRowModel(exercise)),
    binaryChoice: buildBinaryChoiceModel(session.binaryChoice)
  };
}

export function buildWorkoutPageModel(sessions, pagePlan) {
  return {
    cardCount: pagePlan.cardCount,
    pageDensity: pagePlan.pageDensity,
    cards: (sessions || []).map((session, index) => buildWorkoutCardModel(session, pagePlan.cards[index]))
  };
}
