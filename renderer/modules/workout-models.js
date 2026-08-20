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
// THE ONE HOME for the session card's form set (ARRANGEMENT §3, the variant
// contract). The form name is resolved HERE and nowhere else on the render
// path, so the model, the stylesheet and the estimate cannot disagree about
// what "taught" means. Bare `.mjs`, no cache-bust query — Node imports the same
// file (the legibility.mjs idiom, D172).
import { resolveSessionCardForm } from './form-metrics/session-card-forms.mjs';

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

/**
 * The progression target (schema 1.5.0 `session.progressionTarget`): the
 * program's own advancement rule, plus the write-in that commits to it.
 *
 * Both halves are required at the schema level, so unlike the return beat this
 * model is all-or-nothing — a card either prints the pair or prints neither.
 * Trimming still guards the null case, because a field that survives schema
 * validation as two whitespace strings would otherwise render an empty rule
 * over a blank nobody can answer.
 */
function buildProgressionTargetModel(progressionTarget) {
  if (!progressionTarget || typeof progressionTarget !== 'object') return null;

  const rule = String(progressionTarget.rule || '').trim();
  const targetLabel = String(progressionTarget.targetLabel || '').trim();
  if (!rule || !targetLabel) return null;

  return { rule, targetLabel };
}

/**
 * THE FORM DECLARATION, as a model (ARRANGEMENT §2 axis 5 / §3).
 *
 * `formSpec` is the third parameter and it is OPTIONAL: absent, malformed or
 * `bare` all resolve to the same thing — `form: 'bare'` with no teaching text —
 * and `renderWorkoutCard()` then builds byte-identical DOM to the pre-form
 * engine. That is the whole demotion proof on the render side, and it is why
 * the two existing call sites in tests/playwright that pass `(session, {})`
 * keep working unchanged.
 *
 * THE RENDERER AUTHORS NO TEACHING PROSE. `markInstruction` and `rulesPointer`
 * are strings the ADAPTER hands down from authored booklet fields. A renderer
 * that composed its own instruction sentence would be D198's derived-data-
 * prints defect wearing a helpful face, and it would print the same sentence in
 * every book — the sameness the arrangement axes exist to break. Empty in,
 * nothing out.
 */
function buildFormModel(formSpec) {
  const spec = (formSpec && typeof formSpec === 'object') ? formSpec : {};
  const form = resolveSessionCardForm(spec.form);
  if (form === 'bare') {
    return { form: 'bare', markInstruction: '', rulesPointer: '', openingRitual: '' };
  }
  return {
    form,
    markInstruction: String(spec.markInstruction || '').trim(),
    rulesPointer: String(spec.rulesPointer || '').trim(),
    // The book's own printed session ritual (gameRulebook.sessionShape.ritual.cue).
    // Empty for every book written before the field existed, and an empty string
    // draws nothing — so the pre-ritual render is unchanged by construction.
    openingRitual: String(spec.openingRitual || '').trim()
  };
}

export function buildWorkoutCardModel(session, layoutPlan, formSpec) {
  const exercises = session.exercises || [];
  const showNotes = typeof session.showNotes === 'boolean' ? session.showNotes : exercises.length > 0;
  const continuationLabel = String(session.continuationLabel || '').trim();

  return {
    form: buildFormModel(formSpec),
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
    progressionTarget: buildProgressionTargetModel(session.progressionTarget),
    showNotes
  };
}

