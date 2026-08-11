import { make } from './dom.js?v=48';

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
 * see the CROSS-FILE CONTRACT note there before changing `flex-wrap` or the
 * label's `white-space` in booklet.css.
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

  const binaryChoice = renderBinaryChoice(cardModel.binaryChoice);
  if (binaryChoice) {
    body.appendChild(binaryChoice);
  }

  if (cardModel.showNotes) {
    const notesBox = make('div', 'notes-box');
    notesBox.style.setProperty('--notes-box-height', Math.max(12, cardModel.notesHeight || 0) + 'px');
    body.appendChild(notesBox);
  }

  card.appendChild(body);
  return card;
}
