import { make } from './dom.js?v=31';
import { createBoundedPage } from './page-shell.js?v=31';

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

    for (let i = 0; i < clock.segments; i += 1) {
      const angle = (i * 360) / clock.segments;
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
    info.appendChild(make('div', 'clock-name', clock.clockName));
    if (clock.consequenceOnFull) {
      info.appendChild(make('div', 'clock-consequence', 'ON FULL: ' + clock.consequenceOnFull));
    }
    item.appendChild(info);
    grid.appendChild(item);
  });
  section.appendChild(grid);
  return section;
}

function renderGridMap(mapState) {
  const wrap = make('div', 'map-grid');
  wrap.style.gridTemplateColumns = 'repeat(' + mapState.gridDimensions.columns + ', 1fr)';

  const tilesByPosition = {};
  (mapState.tiles || []).forEach((tile) => {
    tilesByPosition[tile.col + ':' + tile.row] = tile;
  });

  for (let row = 1; row <= mapState.gridDimensions.rows; row += 1) {
    for (let col = 1; col <= mapState.gridDimensions.columns; col += 1) {
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
  const wrap = make('div', 'player-map');
  wrap.style.setProperty('--grid-columns', mapState.dimensions.columns);
  wrap.style.setProperty('--grid-rows', mapState.dimensions.rows);
  wrap.setAttribute('data-canvas-type', mapState.canvasType || 'dot-grid');
  (mapState.prompts || []).slice(0, 4).forEach((prompt) => {
    wrap.appendChild(make('div', 'player-map-prompt', prompt));
  });
  return wrap;
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

function renderWorkspace(workSpace) {
  const grid = make('div', 'plaintext-grid');
  const size = Math.min((workSpace.rows || 1) * (workSpace.cols || 10), 40);
  for (let i = 0; i < size; i += 1) {
    grid.appendChild(make('div', 'plaintext-cell'));
  }
  return grid;
}

function renderCipherSection(cipher) {
  const section = make('div', 'cipher-zone');
  section.setAttribute('data-cipher-type', cipher.type || '');
  if (cipher.noticeabilityDesign) {
    section.setAttribute('data-cipher-noticeability', 'authored');
  }
  if (cipher.characterDerivationProof) {
    section.setAttribute('data-has-derivation-proof', 'true');
  }

  section.appendChild(make('div', 'puzzle-title', cipher.title || 'Cipher'));
  if (cipher.sequenceText) {
    section.appendChild(make('div', 'cipher-sequence', cipher.sequenceText));
  }

  if (cipher.keyText) {
    const key = make('div', 'cipher-key');
    const grid = make('div', 'key-grid');
    grid.textContent = cipher.keyText;
    key.appendChild(grid);
    section.appendChild(key);
  }

  if (cipher.workSpace) {
    section.appendChild(renderWorkspace(cipher.workSpace));
  }

  section.appendChild(make('div', 'password-extract', cipher.extractionInstruction));
  return section;
}

function renderOracleSection(oracle) {
  const section = make('div', 'oracle-zone');
  section.setAttribute('data-oracle-mode', oracle.mode || '');
  section.appendChild(make('header', 'oracle-header', oracle.title || 'Oracle'));
  if (oracle.instruction) section.appendChild(make('div', 'oracle-instruction', oracle.instruction));

  const list = make('div', 'oracle-entries');
  (oracle.entries || []).forEach((entry) => {
    const row = make('div', 'oracle-entry');
    row.setAttribute('data-entry-type', entry.type || '');
    row.appendChild(make('div', 'oracle-case-num', entry.roll || ''));
    row.appendChild(make('div', 'oracle-text', entry.text || ''));
    if (entry.paperAction) row.appendChild(make('div', 'oracle-text', '(' + entry.paperAction + ')'));
    if (entry.fragmentRef) row.appendChild(make('div', 'frag-ref', entry.fragmentRef));
    list.appendChild(row);
  });
  section.appendChild(list);
  return section;
}

function renderCompanionComponent(component) {
  const card = make('section', 'companion-component');
  card.setAttribute('data-component-family', component.family || 'custom-companion');
  card.setAttribute('data-component-footprint', component.footprint || 'half-page');
  card.appendChild(make('div', 'companion-title', component.title || 'Companion Component'));

  if (component.body) {
    card.appendChild(make('div', 'companion-body', component.body));
  }

  if ((component.slots || []).length) {
    const slots = make('div', 'companion-slot-grid');
    component.slots.forEach((slot) => {
      const item = make('div', 'companion-slot');
      item.appendChild(make('span', 'companion-slot-label', slot.label || ''));
      item.appendChild(make('span', 'companion-slot-box'));
      slots.appendChild(item);
    });
    card.appendChild(slots);
  } else if ((component.rows || 0) > 0 && (component.cols || 0) > 0) {
    const cells = make('div', 'companion-cell-grid');
    cells.style.setProperty('--companion-cols', String(component.cols));
    const total = component.rows * component.cols;
    for (let i = 0; i < total; i += 1) {
      cells.appendChild(make('div', 'companion-cell'));
    }
    card.appendChild(cells);
  } else {
    card.appendChild(make('div', 'companion-dash-line'));
  }

  return card;
}

export function renderFieldOpsPage(model) {
  const scaffold = createBoundedPage(model.pageType, 'field-ops-right', {
    boundaryRole: 'field-ops',
    layoutVariant: model.layoutVariant || 'balanced'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;
  frame.setAttribute('data-map-family', (model.mechanicProfile || {}).mapFamily || 'none');
  frame.setAttribute('data-cipher-family', (model.mechanicProfile || {}).cipherFamily || 'none');
  frame.setAttribute('data-oracle-family', (model.mechanicProfile || {}).oracleFamily || 'none');

  const header = make('header', 'rp-header');
  header.appendChild(make('span', '', model.headerTitle || 'Field Operations'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  const content = make('div', 'rp-content');
  if (model.layout === 'oracle-only') {
    content.style.gridTemplateAreas = '"oracle oracle"';
  }

  if (model.cipher) content.appendChild(renderCipherSection(model.cipher));

  if (model.mapState || (model.gameplayClocks || []).length > 0) {
    const mapZone = make('section', 'map-zone');
    if (model.mapState) mapZone.appendChild(renderMapSection(model.mapState));
    if ((model.gameplayClocks || []).length > 0) {
      mapZone.appendChild(renderGameplayClocks(model.gameplayClocks));
    }
    content.appendChild(mapZone);
  }

  if (model.oracle) {
    content.appendChild(renderOracleSection(model.oracle));
  }

  if ((model.companionComponents || []).length > 0) {
    content.setAttribute('data-has-companion', 'true');
    const companionZone = make('section', 'companion-zone');
    companionZone.appendChild(make('div', 'doc-label', 'Companion Surface'));
    model.companionComponents.forEach((component) => {
      companionZone.appendChild(renderCompanionComponent(component));
    });
    content.appendChild(companionZone);
  }

  frame.appendChild(content);
  return page;
}

export function renderBossPage(model) {
  const scaffold = createBoundedPage('boss', 'boss-right', {
    boundaryRole: 'boss',
    layoutVariant: model.layoutVariant || 'standard'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;

  if (model.convergenceProof) {
    frame.setAttribute('data-has-convergence-proof', 'true');
  }
  if (model.binaryChoiceAcknowledgement) {
    frame.setAttribute('data-has-binary-choice-ack', 'true');
  }

  const header = make('header', 'boss-header');
  header.appendChild(make('span', '', 'Convergence'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  frame.appendChild(make('h2', 'boss-title', model.title));

  if ((model.narrativeParagraphs || []).length) {
    const narrative = make('div', 'boss-narrative');
    model.narrativeParagraphs.forEach((para) => {
      narrative.appendChild(make('p', '', para));
    });
    frame.appendChild(narrative);
  }

  if ((model.mechanismParagraphs || []).length || model.decodingInstruction || model.decodingTable) {
    const mechanism = make('div', 'boss-mechanism');
    mechanism.appendChild(make('strong', 'boss-mechanism-label', 'Procedure'));
    model.mechanismParagraphs.forEach((para) => {
      mechanism.appendChild(make('p', '', para));
    });
    if (model.decodingInstruction) {
      mechanism.appendChild(make('p', 'boss-decoding-instruction', model.decodingInstruction));
    }
    if (model.decodingTable) {
      const table = make('pre', 'boss-decoding-table');
      table.textContent = model.decodingTable;
      mechanism.appendChild(table);
    }
    frame.appendChild(mechanism);
  }

  const components = make('div', 'boss-components');
  components.appendChild(make('div', 'boss-components-label', 'Recorded Inputs'));
  const list = make('div', 'boss-component-list');
  (model.componentInputs || []).forEach((item) => {
    const row = make('div', 'boss-component-item');
    row.appendChild(make('div', 'boss-component-week', item.weekLabel));
    row.appendChild(make('div', 'boss-component-box'));
    row.appendChild(make('div', '', item.value));
    list.appendChild(row);
  });
  components.appendChild(list);
  frame.appendChild(components);

  if (model.binaryChoiceAcknowledgement) {
    const branch = make('div', 'boss-branch-note');
    branch.appendChild(make('div', 'boss-branch-label', 'Path Reconciliation'));
    if (model.binaryChoiceAcknowledgement.ifA) {
      branch.appendChild(make('p', '', 'If A: ' + model.binaryChoiceAcknowledgement.ifA));
    }
    if (model.binaryChoiceAcknowledgement.ifB) {
      branch.appendChild(make('p', '', 'If B: ' + model.binaryChoiceAcknowledgement.ifB));
    }
    frame.appendChild(branch);
  }

  if ((model.convergenceProofParagraphs || []).length) {
    const proof = make('div', 'boss-proof');
    proof.appendChild(make('div', 'boss-proof-label', 'Convergence Notes'));
    model.convergenceProofParagraphs.slice(0, 2).forEach((paragraph) => {
      proof.appendChild(make('p', '', paragraph));
    });
    frame.appendChild(proof);
  }

  const convergence = make('div', 'boss-convergence');
  convergence.appendChild(make('div', 'boss-convergence-label', 'Final Word'));
  convergence.appendChild(make('p', 'boss-convergence-instruction', model.passwordRevealInstruction));

  const passwordBoxes = make('div', 'boss-password-boxes');
  for (let i = 0; i < model.passwordLength; i += 1) {
    passwordBoxes.appendChild(make('div', 'boss-password-box'));
  }
  convergence.appendChild(passwordBoxes);
  frame.appendChild(convergence);

  return page;
}
