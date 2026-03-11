import { make } from './dom.js';
import { chunkSessions, paginateFragments } from './layout-governor.js';
import {
  extractFragmentRefs,
  getExerciseSetCount,
  getLoadGuide,
  getPasswordLength,
  pad2,
  showLoadSuffix,
  splitParagraphs
} from './utils.js';

function buildCoverPage(data) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'cover');
  const frame = make('div', 'cover-page');

  if (data.cover.designation) {
    frame.appendChild(make('div', 'cover-designation', data.cover.designation));
  }

  const hero = make('div', 'cover-hero');
  hero.appendChild(make('h1', 'cover-title', data.meta.blockTitle || 'LiftRPG'));
  hero.appendChild(make('p', 'cover-tagline', data.cover.tagline || ''));
  hero.appendChild(make('div', 'cover-rule'));
  frame.appendChild(hero);

  const colophon = make('div', 'cover-colophon');
  (data.cover.colophonLines || []).forEach((line) => {
    colophon.appendChild(make('div', 'cover-colophon-line', line));
  });
  frame.appendChild(colophon);
  page.appendChild(frame);
  return page;
}

function makePasswordBoxes(count, className) {
  const row = make('div', 'password-box-row');
  for (let i = 0; i < count; i += 1) {
    row.appendChild(make('div', className));
  }
  return row;
}

function buildRulesPage(data) {
  const pages = [];

  const leftPage = make('section', 'booklet-page');
  leftPage.setAttribute('data-page-type', 'rules-left');
  const leftFrame = make('div', 'rules-left');

  const leftHeader = make('header', 'rules-header');
  leftHeader.appendChild(make('span', '', 'Orientation'));
  leftHeader.appendChild(make('span', 'page-num', ''));
  leftFrame.appendChild(leftHeader);

  leftFrame.appendChild(make('h2', 'rules-title', data.rulesSpread.leftPage.title || 'Briefing'));

  const leftBody = make('div', 'rules-body');
  (data.rulesSpread.leftPage.sections || []).forEach((section) => {
    leftBody.appendChild(make('h3', '', section.heading || 'Procedure'));
    splitParagraphs(section.body || section.text).forEach((para) => {
      leftBody.appendChild(make('p', '', para));
    });
  });

  const reEntry = data.rulesSpread.leftPage.reEntryRule;
  const reEntryText = typeof reEntry === 'string' ? reEntry : reEntry && reEntry.ruleText;
  if (reEntryText) {
    leftBody.appendChild(make('h3', '', 'Re-entry Procedure'));
    splitParagraphs(reEntryText).forEach((para) => {
      leftBody.appendChild(make('p', '', para));
    });
  }
  leftFrame.appendChild(leftBody);
  leftPage.appendChild(leftFrame);
  pages.push(leftPage);

  const rightPage = make('section', 'booklet-page');
  rightPage.setAttribute('data-page-type', 'rules-right');
  const rightFrame = make('div', 'rules-right');

  const rightHeader = make('header', 'rules-header');
  rightHeader.appendChild(make('span', '', 'Record'));
  rightHeader.appendChild(make('span', 'page-num', ''));
  rightFrame.appendChild(rightHeader);

  rightFrame.appendChild(make('div', 'password-log-title', data.rulesSpread.rightPage.title || 'Password Log'));
  if (data.rulesSpread.rightPage.instruction) {
    rightFrame.appendChild(make('div', 'password-log-subtitle', data.rulesSpread.rightPage.instruction));
  }

  const logGrid = make('div', 'password-log-grid');
  const componentType = (data.meta.weeklyComponentType || 'component').replace(/-/g, ' ');
  (data.weeks || []).forEach((week) => {
    const row = make('div', 'password-log-row');
    row.appendChild(make('div', 'password-log-week', 'W' + pad2(week.weekNumber)));
    row.appendChild(make('div', 'password-log-box'));
    if (!week.isBossWeek) {
      row.appendChild(make('div', 'password-log-instruction', week.weeklyComponent && week.weeklyComponent.extractionInstruction || componentType));
    } else {
      row.appendChild(make('div', 'password-log-instruction', 'Hold until convergence protocol.'));
    }
    logGrid.appendChild(row);
  });
  rightFrame.appendChild(logGrid);

  const finalBlock = make('div', 'password-final');
  finalBlock.appendChild(make('div', 'password-final-label', 'Final Assembly'));
  finalBlock.appendChild(makePasswordBoxes(getPasswordLength(data, (data.meta && data.meta.weekCount) || 6), 'password-final-box'));
  rightFrame.appendChild(finalBlock);

  rightPage.appendChild(rightFrame);
  pages.push(rightPage);

  return pages;
}

function buildWorkoutPage(data, week, sessions, chunkIndex, chunkCount) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'workout-left');
  const frame = make('div', 'workout-left');

  const header = make('header', 'page-header');
  header.appendChild(make('span', 'week-id', 'Week ' + pad2(week.weekNumber)));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  const kickerText = chunkCount > 1 ? 'Session Log ' + (chunkIndex + 1) + '/' + chunkCount : 'Session Log';
  frame.appendChild(make('div', 'week-kicker', kickerText));
  frame.appendChild(make('h2', 'week-title', week.title || 'Training Record'));

  if (week.epigraph && chunkIndex === 0) {
    frame.appendChild(make('div', 'week-subtitle', week.epigraph.attribution || ''));
    frame.appendChild(make('div', 'week-meta', week.epigraph.text || ''));
  }

  const cards = make('div', 'session-cards');
  sessions.forEach((session) => {
    cards.appendChild(buildSessionCard(session));
  });
  frame.appendChild(cards);
  page.appendChild(frame);
  return page;
}

function buildSessionCard(session) {
  const card = make('article', 'session-card');
  const exerciseCount = (session.exercises || []).length;
  if (exerciseCount > 4) card.classList.add('density-dense');
  else if (exerciseCount > 2) card.classList.add('density-compact');

  card.appendChild(make('div', 'session-header', typeof session.label === 'string' ? session.label : 'Session'));

  if (session.storyPrompt) {
    card.appendChild(make('div', 'story-prompt', session.storyPrompt));
  }

  if (session.fragmentRef) {
    card.appendChild(make('div', 'frag-ref', 'Fragment ' + session.fragmentRef));
  }

  const exercises = make('table', 'exercise-table');
  (session.exercises || []).forEach((exercise) => {
    exercises.appendChild(renderExerciseRow(exercise));
  });
  card.appendChild(exercises);

  const notesBox = make('div', 'notes-box');
  const notesLines = make('div', 'notes-lines');
  notesLines.appendChild(make('div', 'notes-line'));
  notesLines.appendChild(make('div', 'notes-line'));
  notesBox.appendChild(notesLines);
  card.appendChild(notesBox);

  if (session.binaryChoice) {
    const choice = make('div', 'binary-choice');
    choice.appendChild(make('div', 'binary-choice-label', session.binaryChoice.choiceLabel || 'Route Decision'));

    const optionA = make('div', 'binary-choice-option');
    optionA.appendChild(make('div', 'binary-choice-marker'));
    optionA.appendChild(make('div', 'binary-choice-text', session.binaryChoice.promptA || ''));
    choice.appendChild(optionA);

    const optionB = make('div', 'binary-choice-option');
    optionB.appendChild(make('div', 'binary-choice-marker'));
    optionB.appendChild(make('div', 'binary-choice-text', session.binaryChoice.promptB || ''));
    choice.appendChild(optionB);

    card.appendChild(choice);
  }

  return card;
}

function renderExerciseRow(exercise) {
  const row = make('tr');

  const nameCell = make('td');
  const nameWrapper = make('div', 'exercise-name');
  nameWrapper.textContent = exercise.name || 'Lift';
  nameCell.appendChild(nameWrapper);
  row.appendChild(nameCell);

  if (showLoadSuffix(exercise) || exercise.loadGuide || exercise.loadInstruction) {
    const weightCell = make('td', 'exercise-weight');
    weightCell.textContent = getLoadGuide(exercise) + (showLoadSuffix(exercise) ? ' x' : '');
    row.appendChild(weightCell);
  }

  const dotsCell = make('td');
  dotsCell.style.width = '100%';
  dotsCell.appendChild(make('div', 'exercise-dots'));
  row.appendChild(dotsCell);

  const repsCell = make('td');
  const repGroup = make('div', 'rep-boxes');
  const count = getExerciseSetCount(exercise);
  for (let i = 0; i < count; i += 1) {
    repGroup.appendChild(make('div', 'rep-box'));
  }
  repsCell.appendChild(repGroup);
  row.appendChild(repsCell);

  return row;
}

function renderGameplayClocks(clocks) {
  const section = make('section', 'ops-section ops-clocks');
  section.appendChild(make('div', 'doc-label', 'Active Clocks'));
  const grid = make('div', 'clock-grid');
  (clocks || []).forEach((clock) => {
    const item = make('div', 'clock-item');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'progress-clock-svg');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '48');
    circle.setAttribute('fill', 'var(--track-fill)');
    circle.setAttribute('stroke', 'var(--page-rule)');
    circle.setAttribute('stroke-width', '2');
    svg.appendChild(circle);

    const segments = parseInt(clock.segments, 10) || 4;
    for (let i = 0; i < segments; i += 1) {
      const angle = (i * 360) / segments;
      const rad = (angle - 90) * (Math.PI / 180);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '50');
      line.setAttribute('y1', '50');
      line.setAttribute('x2', String(50 + 48 * Math.cos(rad)));
      line.setAttribute('y2', String(50 + 48 * Math.sin(rad)));
      line.setAttribute('stroke', 'var(--page-rule)');
      line.setAttribute('stroke-width', '1.5');
      svg.appendChild(line);
    }

    const visuals = make('div', 'clock-visuals');
    visuals.appendChild(svg);
    item.appendChild(visuals);

    const info = make('div', 'clock-info');
    info.appendChild(make('div', 'clock-name', clock.clockName || 'Clock'));
    if (clock.consequenceOnFull) {
      info.appendChild(make('div', 'clock-consequence', 'ON FULL: ' + clock.consequenceOnFull));
    }
    item.appendChild(info);
    grid.appendChild(item);
  });
  section.appendChild(grid);
  return section;
}

function renderMapSection(mapState) {
  const section = make('div', 'map-content');
  section.appendChild(make('div', 'map-title', mapState.title || 'Map'));

  if (mapState.mapType === 'point-to-point') {
    section.appendChild(renderPointMap(mapState));
  } else if (mapState.mapType === 'linear-track') {
    section.appendChild(renderLinearMap(mapState));
  } else if (mapState.mapType === 'player-drawn') {
    section.appendChild(renderPlayerMap(mapState));
  } else {
    section.appendChild(renderGridMap(mapState));
  }

  if (mapState.floorLabel) section.appendChild(make('div', 'map-annotation', mapState.floorLabel));
  if (mapState.mapNote) section.appendChild(make('div', 'map-note', mapState.mapNote));
  return section;
}

function renderGridMap(mapState) {
  const gridData = mapState.gridDimensions || { columns: 6, rows: 5 };
  const wrap = make('div', 'map-grid');
  wrap.style.gridTemplateColumns = 'repeat(' + gridData.columns + ', 1fr)';

  const tilesByPosition = {};
  (mapState.tiles || []).forEach((tile) => {
    tilesByPosition[tile.col + ':' + tile.row] = tile;
  });

  for (let row = 1; row <= gridData.rows; row += 1) {
    for (let col = 1; col <= gridData.columns; col += 1) {
      const tile = tilesByPosition[col + ':' + row] || {};
      let cellClass = 'map-cell ' + (tile.type || 'empty');
      if (mapState.currentPosition && mapState.currentPosition.col === col && mapState.currentPosition.row === row) {
        cellClass += ' current';
      }

      const cell = make('div', cellClass);
      const rawLabel = tile.label || (mapState.currentPosition && mapState.currentPosition.col === col && mapState.currentPosition.row === row ? 'YOU' : '');
      cell.textContent = rawLabel.substring(0, 5);
      wrap.appendChild(cell);
    }
  }

  return wrap;
}

function renderPointMap(mapState) {
  const wrap = make('div', 'map-network');
  (mapState.nodes || []).forEach((node) => {
    const card = make('div', 'map-node');
    card.setAttribute('data-state', node.state || 'empty');
    card.appendChild(make('div', 'map-node-name', node.label || node.id));
    card.appendChild(make('div', 'map-node-meta', node.id || ''));
    wrap.appendChild(card);
  });
  return wrap;
}

function renderLinearMap(mapState) {
  const wrap = make('div', 'map-track');
  (mapState.positions || []).forEach((position) => {
    const step = make('div', 'map-track-step');
    step.setAttribute('data-state', position.state || 'empty');
    step.appendChild(make('div', 'map-track-index', String(position.index)));
    step.appendChild(make('div', 'map-track-label', position.label || ''));
    wrap.appendChild(step);
  });
  return wrap;
}

function renderPlayerMap(mapState) {
  const gridData = mapState.dimensions || { columns: 12, rows: 8 };
  const wrap = make('div', 'player-map');
  wrap.style.setProperty('--grid-columns', gridData.columns);
  wrap.style.setProperty('--grid-rows', gridData.rows);
  wrap.setAttribute('data-canvas-type', mapState.canvasType || 'dot-grid');
  (mapState.prompts || []).slice(0, 4).forEach((prompt) => {
    wrap.appendChild(make('div', 'player-map-prompt', prompt));
  });
  return wrap;
}

function renderWorkspace(workSpace) {
  const grid = make('div', 'plaintext-grid');
  const size = Math.min((workSpace.rows || 1) * (workSpace.cols || 10), 40);
  for (let i = 0; i < size; i += 1) {
    grid.appendChild(make('div', 'plaintext-cell'));
  }
  return grid;
}

function renderCipherSection(cipher, weeklyComponent) {
  const section = make('div', 'cipher-zone');
  section.appendChild(make('div', 'puzzle-title', cipher.title || 'Cipher'));
  if (cipher.body && cipher.body.displayText) {
    section.appendChild(make('div', 'cipher-sequence', cipher.body.displayText));
  }

  if (cipher.body && cipher.body.key) {
    const key = make('div', 'cipher-key');
    const grid = make('div', 'key-grid');
    grid.textContent = cipher.body.key;
    key.appendChild(grid);
    section.appendChild(key);
  }

  if (cipher.body && cipher.body.workSpace) {
    section.appendChild(renderWorkspace(cipher.body.workSpace));
  }

  const instruction = cipher.extractionInstruction || (weeklyComponent && weeklyComponent.extractionInstruction) || 'Record the derived value.';
  section.appendChild(make('div', 'password-extract', instruction));
  return section;
}

function renderOracleSection(oracle) {
  const section = make('div', 'oracle-zone');
  section.appendChild(make('header', 'oracle-header', oracle.title || 'Oracle'));
  if (oracle.instruction) section.appendChild(make('div', 'oracle-instruction', oracle.instruction));

  const list = make('div', 'oracle-entries');
  (oracle.entries || []).forEach((entry) => {
    const row = make('div', 'oracle-entry');
    row.appendChild(make('div', 'oracle-case-num', entry.roll || ''));
    row.appendChild(make('div', 'oracle-text', entry.text || ''));
    if (entry.paperAction) row.appendChild(make('div', 'oracle-text', '(' + entry.paperAction + ')'));
    if (entry.fragmentRef) row.appendChild(make('div', 'frag-ref', entry.fragmentRef));
    list.appendChild(row);
  });
  section.appendChild(list);
  return section;
}

function buildFieldOpsPages(data, week) {
  const fieldOps = week.fieldOps || {};
  const pages = [];
  const splitOracle = fieldOps.oracleTable && (fieldOps.oracleTable.entries || []).length > 8;

  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'field-ops');
  const frame = make('div', 'field-ops-right');

  const header = make('header', 'rp-header');
  header.appendChild(make('span', '', fieldOps.mapState && fieldOps.mapState.title || week.title || 'Field Operations'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  const content = make('div', 'rp-content');
  if (fieldOps.cipher) content.appendChild(renderCipherSection(fieldOps.cipher, week.weeklyComponent));

  const mapZone = make('section', 'map-zone');
  if (fieldOps.mapState) mapZone.appendChild(renderMapSection(fieldOps.mapState));
  if (week.gameplayClocks && week.gameplayClocks.length > 0) {
    mapZone.appendChild(renderGameplayClocks(week.gameplayClocks));
  }
  content.appendChild(mapZone);

  if (!splitOracle && fieldOps.oracleTable) {
    content.appendChild(renderOracleSection(fieldOps.oracleTable));
  }

  frame.appendChild(content);
  page.appendChild(frame);
  pages.push(page);

  if (splitOracle && fieldOps.oracleTable) {
    const secondPage = make('section', 'booklet-page');
    secondPage.setAttribute('data-page-type', 'oracle-overflow');
    const secondFrame = make('div', 'field-ops-right');

    const secondHeader = make('header', 'rp-header');
    secondHeader.appendChild(make('span', '', fieldOps.oracleTable.title || 'Oracle'));
    secondHeader.appendChild(make('span', 'page-num', ''));
    secondFrame.appendChild(secondHeader);

    const secondContent = make('div', 'rp-content');
    secondContent.style.gridTemplateAreas = '"oracle oracle"';
    secondContent.appendChild(renderOracleSection(fieldOps.oracleTable));
    secondFrame.appendChild(secondContent);
    secondPage.appendChild(secondFrame);
    pages.push(secondPage);
  }

  return pages;
}

function buildBossPage(data, week) {
  const boss = week.bossEncounter || {};
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'boss');
  const frame = make('div', 'boss-right');

  const header = make('header', 'boss-header');
  header.appendChild(make('span', '', 'Convergence'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  frame.appendChild(make('h2', 'boss-title', boss.title || week.title));

  if (boss.narrative) {
    const narrative = make('div', 'boss-narrative');
    splitParagraphs(boss.narrative).forEach((para) => {
      narrative.appendChild(make('p', '', para));
    });
    frame.appendChild(narrative);
  }

  if (boss.mechanismDescription) {
    const mechanism = make('div', 'boss-mechanism');
    mechanism.appendChild(make('strong', 'boss-mechanism-label', 'Procedure'));
    splitParagraphs(boss.mechanismDescription).forEach((para) => {
      mechanism.appendChild(make('p', '', para));
    });
    frame.appendChild(mechanism);
  }

  const components = make('div', 'boss-components');
  components.appendChild(make('div', 'boss-components-label', 'Recorded Inputs'));
  const list = make('div', 'boss-component-list');
  (boss.componentInputs || []).forEach((item, index) => {
    const row = make('div', 'boss-component-item');
    row.appendChild(make('div', 'boss-component-week', 'W' + pad2(index + 1)));
    row.appendChild(make('div', 'boss-component-box'));
    row.appendChild(make('div', '', item));
    list.appendChild(row);
  });
  components.appendChild(list);
  frame.appendChild(components);

  const convergence = make('div', 'boss-convergence');
  convergence.appendChild(make('div', 'boss-convergence-label', 'Final Word'));
  convergence.appendChild(make('p', 'boss-convergence-instruction', boss.passwordRevealInstruction || 'When the final word is assembled, enter it at liftrpg.co to unlock the ending.'));

  const wordLength = getPasswordLength(data, (boss.componentInputs || []).length || 6);
  const passwordBoxes = make('div', 'boss-password-boxes');
  for (let i = 0; i < wordLength; i += 1) {
    passwordBoxes.appendChild(make('div', 'boss-password-box'));
  }
  convergence.appendChild(passwordBoxes);
  frame.appendChild(convergence);

  page.appendChild(frame);
  return page;
}

function renderFragment(fragment) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'fragment');

  const frame = make('div', 'fragment-page');
  const header = make('header', 'page-header');
  header.appendChild(make('span', '', 'Archive'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  const block = make('div', 'fragment-block');
  if (fragment.id) {
    block.appendChild(make('div', 'fragment-number', fragment.id.replace('F.', '')));
  }

  const documentType = (fragment.documentType || 'memo').toLowerCase().replace(' ', '-');
  const doc = make('div', 'fragment-doc ' + documentType);
  doc.appendChild(make('div', 'fragment-doc-type', fragment.documentType || 'Document'));

  const meta = [];
  if (fragment.inWorldAuthor) meta.push('FROM: ' + fragment.inWorldAuthor);
  if (fragment.inWorldRecipient) meta.push('TO: ' + fragment.inWorldRecipient);
  if (fragment.date) meta.push('DATE: ' + fragment.date);
  if (meta.length) {
    const metaBox = make('div', 'fragment-doc-header');
    meta.forEach((line) => {
      metaBox.appendChild(make('div', '', line));
    });
    doc.appendChild(metaBox);
  }

  const body = make('div', 'fragment-doc-body');
  splitParagraphs(fragment.bodyText || fragment.body || fragment.content || '').forEach((para) => {
    body.appendChild(make('p', '', para));
  });
  doc.appendChild(body);

  doc.appendChild(make('div', 'fragment-doc-sig', fragment.inWorldPurpose || 'END FILE'));
  block.appendChild(doc);
  frame.appendChild(block);
  page.appendChild(frame);
  return page;
}

function buildFragmentPages(data, renderedFragments) {
  const remaining = (data.fragments || []).filter((fragment) => !renderedFragments[fragment.id]);
  return paginateFragments(remaining).map((pageFragments) => {
    const page = make('section', 'booklet-page');
    page.setAttribute('data-page-type', 'fragment');
    const frame = make('div', 'fragment-page');
    const header = make('header', 'page-header');
    header.appendChild(make('span', '', 'Archive'));
    header.appendChild(make('span', 'page-num', ''));
    frame.appendChild(header);

    const stack = make('div', 'fragment-stack');
    pageFragments.forEach((fragment) => {
      stack.appendChild(renderFragment(fragment));
    });
    frame.appendChild(stack);
    page.appendChild(frame);
    return page;
  });
}

function buildAssemblyPage(data) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'assembly');

  const frame = make('div', 'password-assembly-page');
  frame.appendChild(make('h2', 'password-assembly-title', 'Password Assembly'));
  frame.appendChild(make('p', 'password-assembly-subtitle', 'Transfer each recorded weekly value into the final assembly ladder. Decode only when the boss page gives the rule.'));

  const list = make('div', 'password-assembly-grid');
  (data.weeks || []).forEach((week) => {
    if (week.isBossWeek) return;
    const row = make('div', 'password-assembly-row');
    row.appendChild(make('div', 'password-assembly-week-label', 'Week ' + pad2(week.weekNumber)));
    row.appendChild(make('div', 'password-assembly-cell'));
    row.appendChild(make('div', 'password-assembly-arrow', '→'));
    row.appendChild(make('div', 'password-assembly-cell'));
    list.appendChild(row);
  });
  frame.appendChild(list);

  const finalBlock = make('div', 'password-final-assembly');
  finalBlock.appendChild(make('div', 'password-final-label', 'Final Word'));
  const wordLength = getPasswordLength(data, (data.meta && data.meta.weekCount) || 6);
  const passwordBoxes = make('div', 'password-final-row');
  for (let i = 0; i < wordLength; i += 1) {
    passwordBoxes.appendChild(make('div', 'password-final-cell'));
  }
  finalBlock.appendChild(passwordBoxes);
  frame.appendChild(finalBlock);

  page.appendChild(frame);
  return page;
}

function buildLockedEndingPage(data) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'ending-locked');
  const frame = make('div', 'endings-page');
  frame.appendChild(make('h2', 'endings-title', 'Final Document'));

  const body = make('div', 'endings-body');
  body.appendChild(make('p', '', 'This final page remains sealed until the completed password is entered above. The booklet should give you everything you need.'));
  frame.appendChild(body);

  if (data.endings && data.endings.length) {
    const variants = make('div', 'chip-row');
    data.endings.forEach((ending) => {
      variants.appendChild(make('div', 'chip chip-muted', ending.variant || 'Variant'));
    });
    frame.appendChild(variants);
  }

  page.appendChild(frame);
  return page;
}

function buildUnlockedEndingPage(payload) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'ending-unlocked');
  const frame = make('div', 'endings-page');

  frame.appendChild(make('h2', 'endings-title', payload.title || 'Unlocked Document'));
  if (payload.documentType) frame.appendChild(make('div', 'doc-label', payload.documentType));

  const body = make('div', 'endings-body');
  splitParagraphs(payload.body || payload.content || '').forEach((para) => {
    body.appendChild(make('p', '', para));
  });
  frame.appendChild(body);

  if (payload.finalLine) {
    frame.appendChild(make('div', 'endings-final-line', payload.finalLine));
  }

  page.appendChild(frame);
  return page;
}

function buildBackCover() {
  const page = make('section', 'booklet-page');
  page.classList.add('page-back');
  page.setAttribute('data-page-type', 'back-cover');
  const colophon = make('div', 'back-cover');
  colophon.appendChild(make('p', 'back-cover-colophon', 'Printed by hand, completed in pencil, resolved through repetition.'));
  colophon.appendChild(make('div', 'back-cover-mark', 'LiftRPG'));
  page.appendChild(colophon);
  return page;
}

function buildNotesPage() {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'notes');

  const frame = make('div', 'notes-page');
  const header = make('header', 'page-header');
  header.appendChild(make('span', '', 'Field Notes'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  const notes = make('div', 'notes-grid');
  for (let i = 0; i < 36; i += 1) {
    notes.appendChild(make('div', 'notes-cell'));
  }
  frame.appendChild(notes);
  page.appendChild(frame);
  return page;
}

function buildWeekPages(data, renderedFragments) {
  let pages = [];
  (data.weeks || []).forEach((week) => {
    chunkSessions(week).forEach((chunk, chunkIndex, chunkList) => {
      if (chunkIndex > 0) {
        const blank = make('section', 'booklet-page blank-page');
        blank.setAttribute('data-page-type', 'blank-filler');
        pages.push(blank);
      }
      pages.push(buildWorkoutPage(data, week, chunk, chunkIndex, chunkList.length));
    });

    pages = pages.concat(week.isBossWeek ? buildBossPage(data, week) : buildFieldOpsPages(data, week));

    const refs = extractFragmentRefs(week);
    const uniqueRefs = refs.filter((ref, index) => refs.indexOf(ref) === index);
    const fragmentsForWeek = (data.fragments || []).filter((fragment) => uniqueRefs.indexOf(fragment.id) !== -1 && !renderedFragments[fragment.id]);

    if (fragmentsForWeek.length > 0) {
      fragmentsForWeek.forEach((fragment) => {
        renderedFragments[fragment.id] = true;
      });

      pages = pages.concat(paginateFragments(fragmentsForWeek).map((pageFragments) => {
        const page = make('section', 'booklet-page');
        page.setAttribute('data-page-type', 'fragment');
        const frame = make('div', 'fragment-page');
        const header = make('header', 'page-header');
        header.appendChild(make('span', '', 'Archive'));
        header.appendChild(make('span', 'page-num', ''));
        frame.appendChild(header);

        const stack = make('div', 'fragment-stack');
        pageFragments.forEach((fragment) => {
          stack.appendChild(renderFragment(fragment));
        });
        frame.appendChild(stack);
        page.appendChild(frame);
        return page;
      }));
    }
  });

  return pages.flat();
}

export function buildPages(data, unlockedEnding) {
  const pages = [];
  const renderedFragments = {};

  pages.push(buildCoverPage(data));
  pages.push(...buildRulesPage(data));
  pages.push(...buildWeekPages(data, renderedFragments));
  pages.push(...buildFragmentPages(data, renderedFragments));
  pages.push(buildAssemblyPage(data));
  pages.push(unlockedEnding ? buildUnlockedEndingPage(unlockedEnding) : buildLockedEndingPage(data));

  while ((pages.length + 1) % 4 !== 0) {
    pages.push(buildNotesPage());
  }

  pages.push(buildBackCover());
  return pages;
}
