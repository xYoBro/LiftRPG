import {
  describeExerciseLoad,
  getExerciseSetCount,
  getRepTargets,
  showLoadSuffix
} from './utils.js?v=48';
// The citation normalizer has ONE home, beside its twin normalizeManifestPointer
// — a citeRef on a micro-line and a citeRef on a found document are the same
// grammar, and two normalizers would be the D91 defect class.
import { normalizeCiteRef } from './document-models.js?v=48';

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

/**
 * Conditional micro-lines (schema 1.5.0 `session.microLines`): the re-entry
 * mechanism, and the cheapest content the book can carry — same printed page,
 * new pencil state, new reading.
 *
 * DORMANCY (the binaryChoice pattern, exactly): null when the session carries
 * none, which is every session in the corpus. A null model makes
 * renderMicroLines() a no-op, which keeps `.session-body`'s child count and
 * therefore every gap the geometry model charges.
 *
 * NO CAP, deliberately. The density law is ≤2 lines per session with at most
 * one citation among them, and it is a generation-side WARN (D19: a
 * reading-budget heuristic, not a validity claim). Silently dropping a third
 * line here would print a book that disagrees with its own JSON; the renderer
 * prints what was authored and session-card-metrics.js charges for all of it.
 *
 * A line with neither clause is dropped rather than printed as an empty row —
 * the normalizeManifestPointer rule: a half-filled pointer must not print a
 * blank stamp.
 */
function buildMicroLineModels(microLines) {
  if (!Array.isArray(microLines) || !microLines.length) return null;

  const models = microLines
    .map((line) => ({
      condition: String((line && line.condition) || '').trim(),
      cue: String((line && line.cue) || '').trim(),
      citeRef: normalizeCiteRef(line)
    }))
    .filter((line) => line.condition || line.cue);

  return models.length ? models : null;
}

/**
 * The return beat (schema 1.5.0 `session.returnBeat`): tomorrow cut tonight,
 * and the world's answer when the book reopens.
 *
 * `openingEcho` is optional at the schema level because the first session has
 * no prior session to echo, so the model carries the two halves independently:
 * a session may print an echo, a closing line, or both. Null only when neither
 * survives trimming.
 */
function buildReturnBeatModel(returnBeat) {
  if (!returnBeat || typeof returnBeat !== 'object') return null;

  const closingLine = String(returnBeat.closingLine || '').trim();
  const openingEcho = String(returnBeat.openingEcho || '').trim();
  if (!closingLine && !openingEcho) return null;

  return { closingLine, openingEcho };
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
    microLines: buildMicroLineModels(session.microLines),
    returnBeat: buildReturnBeatModel(session.returnBeat),
    showNotes
  };
}

