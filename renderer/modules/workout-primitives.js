import { make } from './dom.js?v=16';

function renderExerciseRow(rowModel) {
  const row = make('tr', 'exercise-row');
  row.setAttribute('data-has-load', rowModel.hasLoad ? 'true' : 'false');

  const nameCell = make('td', 'exercise-name-cell');
  nameCell.appendChild(make('div', 'exercise-name', rowModel.name));
  row.appendChild(nameCell);

  const weightCell = make('td', 'exercise-weight-cell');
  const loadEntry = make('div', 'exercise-load-entry');

  if (rowModel.hasLoad) {
    loadEntry.classList.add('is-weighted');
    const loadLine = make('span', 'exercise-load-line');
    loadLine.appendChild(make('span', 'exercise-load-hint', rowModel.loadHint));
    loadLine.appendChild(make('span', 'exercise-load-unit', 'lbs'));
    loadEntry.appendChild(loadLine);
  } else {
    loadEntry.classList.add('is-empty');
  }

  weightCell.appendChild(loadEntry);
  row.appendChild(weightCell);

  const dotsCell = make('td', 'exercise-dots-cell');
  dotsCell.appendChild(make('div', 'exercise-dots'));
  row.appendChild(dotsCell);

  const repsCell = make('td', 'exercise-reps-cell');
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
  const exercises = make('table', 'exercise-table');
  exercises.style.setProperty('--exercise-name-width', cardModel.exerciseNameWidthCh + 'ch');
  cardModel.exerciseRows.forEach((rowModel) => {
    exercises.appendChild(renderExerciseRow(rowModel));
  });
  return exercises;
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
  card.style.flex = String(cardModel.flexWeight) + ' 1 0';

  card.appendChild(make('div', 'session-header', cardModel.sessionLabel));

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
  body.appendChild(renderExerciseTable(cardModel));

  const binaryChoice = renderBinaryChoice(cardModel.binaryChoice);
  if (binaryChoice) {
    body.appendChild(binaryChoice);
  }

  const notesBox = make('div', 'notes-box');
  if (cardModel.notesHeight) {
    notesBox.style.setProperty('--notes-box-height', cardModel.notesHeight + 'px');
  }
  body.appendChild(notesBox);

  card.appendChild(body);
  return card;
}
