import { make } from './dom.js?v=48';
// The REFERENCE token has one home, beside the manifest pointer it twins
// (booklet-primitives.js already reaches for renderManifestPointer the same
// way). A second copy here would let the two surfaces' citations drift apart
// visually, which is the one thing a citation grammar cannot survive.
import { renderCiteRef } from './document-primitives.js?v=48';

function renderExerciseRow(rowModel) {
  const row = make('div', 'exercise-row');
  row.setAttribute('data-has-load', rowModel.hasLoad ? 'true' : 'false');
  row.setAttribute('data-has-instruction', rowModel.instructionHint ? 'true' : 'false');

  const nameCell = make('div', 'exercise-name-cell');
  nameCell.appendChild(make('div', 'exercise-name', rowModel.name));
  if (rowModel.instructionHint) {
    nameCell.appendChild(make('div', 'exercise-instruction', rowModel.instructionHint));
  }
  row.appendChild(nameCell);

  const weightCell = make('div', 'exercise-weight-cell');
  const loadEntry = make('div', 'exercise-load-entry');

  if (rowModel.hasLoad) {
    loadEntry.classList.add('is-weighted');
    const loadLine = make('span', 'exercise-load-line');
    loadLine.appendChild(make('span', 'exercise-load-value', rowModel.loadValue));
    if (rowModel.loadUnit) {
      loadLine.appendChild(make('span', 'exercise-load-unit', rowModel.loadUnit));
    }
    loadEntry.appendChild(loadLine);
  } else {
    loadEntry.classList.add('is-empty');
  }

  weightCell.appendChild(loadEntry);
  row.appendChild(weightCell);

  const dotsCell = make('div', 'exercise-dots-cell');
  dotsCell.appendChild(make('div', 'exercise-dots'));
  row.appendChild(dotsCell);

  const repsCell = make('div', 'exercise-reps-cell');
  const repGroup = make('div', 'rep-boxes');
  rowModel.repTargets.forEach((target) => {
    const repBox = make('div', 'rep-box');
    repBox.appendChild(make('span', 'rep-box-target', target || ''));
    repGroup.appendChild(repBox);
  });
  repsCell.appendChild(repGroup);
  row.appendChild(repsCell);

  return row;
}

function renderExerciseTable(cardModel) {
  const exercises = make('div', 'exercise-table');
  exercises.style.setProperty('--exercise-name-width', cardModel.exerciseNameWidthPx + 'px');
  cardModel.exerciseRows.forEach((rowModel) => {
    exercises.appendChild(renderExerciseRow(rowModel));
  });
  return exercises;
}

/**
 * The Mark surface — one row of tick targets, printed between the exercise
 * table and the notes box.
 *
 * NULL-GUARD (the renderBinaryChoice pattern, exactly): a null model appends
 * nothing, so a session without a markStrip builds byte-identical DOM.
 *
 * The row NEVER wraps. Targets divide the card's width; they do not stack.
 * That is what makes the strip's height independent of how many targets it
 * carries, which is the property session-card-metrics.js STRIP_LADDER models —
 * see the CROSS-FILE CONTRACT note there before changing `flex-wrap` in
 * booklet.css.
 *
 * The LABEL, by contrast, does wrap, inside a fixed two-line zone (Teeth T3).
 * Its height is a constant either way, so the strip stays modellable; what
 * went away is the one-line ellipsis that used to hide the tail of a long
 * instruction. Labels are schema-capped at 28 characters, which the zone holds
 * at every tier; a longer legacy label clips, and clips VISIBLY to the engine
 * (no line-clamp — see the D77 truncation law note in booklet.css).
 *
 * Labels go in via make()'s textContent, never innerHTML, so LLM-authored text
 * cannot carry markup into the page.
 */
function renderMarkStrip(markStripModel) {
  if (!markStripModel) return null;

  const strip = make('div', 'mark-strip');
  strip.setAttribute('data-target-count', String(markStripModel.targets.length));

  markStripModel.targets.forEach((target) => {
    const item = make('div', 'mark-target');
    item.appendChild(make('div', 'mark-box'));
    item.appendChild(make('div', 'mark-label', target.label));
    strip.appendChild(item);
  });

  return strip;
}

/**
 * The micro-line strip — conditional lines keyed to printed state, read after
 * the marking is done. One row per line: the condition in the label face, the
 * cue in the reading face, and an optional REFERENCE token trailing the cue.
 *
 * NULL-GUARD (the renderBinaryChoice pattern, exactly): a null model appends
 * nothing, so a session without micro-lines builds byte-identical DOM.
 *
 * The condition and the cue share ONE line box on purpose. Stacking them would
 * add a row per line that session-card-metrics.js MICRO_LINE geometry does not
 * model, and the model cannot see DOM. The visual key is typographic contrast
 * (label face vs reading face), the same idiom the reckoning panel's
 * label/value pair uses — not a stacked heading.
 *
 * Text goes in through make()'s textContent, never innerHTML.
 */
function renderMicroLines(microLineModels) {
  if (!microLineModels) return null;

  const strip = make('div', 'micro-line-strip');
  strip.setAttribute('data-line-count', String(microLineModels.length));

  microLineModels.forEach((line) => {
    const row = make('div', 'micro-line');
    if (line.condition) {
      row.appendChild(make('span', 'micro-line-condition', line.condition));
    }
    const cue = make('span', 'micro-line-cue', line.cue);
    const cite = renderCiteRef(line.citeRef);
    if (cite) cue.appendChild(cite);
    row.appendChild(cue);
    strip.appendChild(row);
  });

  return strip;
}

/**
 * The opening echo — the world acknowledging the last session, printed at the
 * card's head where the player meets it before anything else.
 */
function renderOpeningEcho(returnBeatModel) {
  if (!returnBeatModel || !returnBeatModel.openingEcho) return null;
  return make('div', 'session-echo', returnBeatModel.openingEcho);
}

/**
 * Tomorrow cut tonight — the closing write-in, printed LAST.
 *
 * The order is the doctrine, not a layout preference (peak-end law): the body's
 * win is what the session ends on, and the promissory note is the very last
 * thing the pencil touches before the book closes. Anything appended after this
 * demotes the note to a middle.
 *
 * The blank is a pencil target, so its height is fixed at the D89 form-field
 * floor and does not move with density — see RETURN_BEAT in
 * session-card-metrics.js and the reciprocal note in booklet.css.
 */
function renderReturnBeat(returnBeatModel) {
  if (!returnBeatModel || !returnBeatModel.closingLine) return null;

  const beat = make('div', 'return-beat');
  beat.appendChild(make('div', 'return-beat-label', returnBeatModel.closingLine));
  beat.appendChild(make('div', 'return-beat-blank'));
  return beat;
}

/**
 * The progression target — the program's advancement rule and the number the
 * player commits to for next time.
 *
 * ORDERING RULING (§11 Wave 5): this renders immediately BEFORE the return
 * beat, not after it. The brief asked for it "near the returnBeat close block",
 * and before is the only side that is near without being destructive:
 * renderReturnBeat()'s peak-end doctrine requires the closing line to stay the
 * last thing the pencil touches, and anything appended after it demotes the
 * note to a middle. Adjacency is satisfied either way; the doctrine is only
 * satisfied one way.
 *
 * Like the return blank, the write-in is a pencil target held at the D89
 * form-field floor — see PROGRESSION_* in session-card-metrics.js and the
 * reciprocal note in booklet.css.
 */
function renderProgressionTarget(progressionTargetModel) {
  if (!progressionTargetModel || !progressionTargetModel.rule) return null;

  const box = make('div', 'progression-target');
  box.appendChild(make('div', 'progression-target-rule', progressionTargetModel.rule));
  box.appendChild(make('div', 'progression-target-label', progressionTargetModel.targetLabel));
  box.appendChild(make('div', 'progression-target-blank'));
  return box;
}

function renderBinaryChoice(binaryChoiceModel) {
  if (!binaryChoiceModel) return null;

  const choice = make('div', 'binary-choice');
  choice.appendChild(make('div', 'binary-choice-label', binaryChoiceModel.label));

  const optionA = make('div', 'binary-choice-option');
  optionA.appendChild(make('div', 'binary-choice-marker'));
  optionA.appendChild(make('div', 'binary-choice-text', binaryChoiceModel.promptA));
  choice.appendChild(optionA);

  const optionB = make('div', 'binary-choice-option');
  optionB.appendChild(make('div', 'binary-choice-marker'));
  optionB.appendChild(make('div', 'binary-choice-text', binaryChoiceModel.promptB));
  choice.appendChild(optionB);

  return choice;
}

export function renderWorkoutCard(cardModel) {
  const card = make('article', 'session-card');

  const headerText = cardModel.continuationLabel
    ? (cardModel.sessionLabel + ' · ' + cardModel.continuationLabel)
    : cardModel.sessionLabel;
  card.appendChild(make('div', 'session-header', headerText));

  const echo = renderOpeningEcho(cardModel.returnBeat);
  if (echo) {
    card.appendChild(echo);
  }

  if (cardModel.storyPrompt) {
    card.appendChild(make('div', 'story-prompt', cardModel.storyPrompt));
  }

  const metaRow = make('div', 'session-meta');
  const fragmentRef = make('div', 'session-fragment-ref', cardModel.fragmentRefText || '');
  if (!cardModel.fragmentRefText) {
    fragmentRef.setAttribute('aria-hidden', 'true');
  }
  metaRow.appendChild(fragmentRef);
  card.appendChild(metaRow);

  const body = make('div', 'session-body');
  if (cardModel.exerciseRows.length) {
    body.appendChild(renderExerciseTable(cardModel));
  }

  const markStrip = renderMarkStrip(cardModel.markStrip);
  if (markStrip) {
    body.appendChild(markStrip);
  }

  // Micro-lines sit after the strip and before the route decision: they are
  // read once the marking that answers them has been done.
  const microLines = renderMicroLines(cardModel.microLines);
  if (microLines) {
    body.appendChild(microLines);
  }

  const binaryChoice = renderBinaryChoice(cardModel.binaryChoice);
  if (binaryChoice) {
    body.appendChild(binaryChoice);
  }

  if (cardModel.showNotes) {
    const notesBox = make('div', 'notes-box');
    notesBox.style.setProperty('--notes-box-height', Math.max(12, cardModel.notesHeight || 0) + 'px');
    body.appendChild(notesBox);
  }

  // Immediately before the return beat — see renderProgressionTarget(). The
  // workout's next number is settled first; the story gets the last word.
  const progressionTarget = renderProgressionTarget(cardModel.progressionTarget);
  if (progressionTarget) {
    body.appendChild(progressionTarget);
  }

  // LAST — see renderReturnBeat(). The peak-end ordering is the mechanism.
  const returnBeat = renderReturnBeat(cardModel.returnBeat);
  if (returnBeat) {
    body.appendChild(returnBeat);
  }

  card.appendChild(body);
  return card;
}
