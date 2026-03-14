import { make } from './dom.js?v=44';
import { createBoundedPage } from './page-shell.js?v=44';

function polarPoint(cx, cy, radius, angleDegrees) {
  const radians = (angleDegrees - 90) * (Math.PI / 180);
  return {
    x: cx + (radius * Math.cos(radians)),
    y: cy + (radius * Math.sin(radians))
  };
}

function segmentPath(cx, cy, radius, startAngle, endAngle) {
  const start = polarPoint(cx, cy, radius, endAngle);
  const end = polarPoint(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArc, 0, end.x, end.y,
    'Z'
  ].join(' ');
}

export function renderGameplayClocks(clocks) {
  const section = make('section', 'ops-section ops-clocks');
  section.appendChild(make('div', 'doc-label', 'Active Clocks'));
  const grid = make('div', 'clock-grid');
  (clocks || []).forEach((clock) => {
    const item = make('div', 'clock-item');
    item.setAttribute('data-clock-type', clock.clockType || 'progress-clock');
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
      const startAngle = (i * 360) / clock.segments;
      const endAngle = ((i + 1) * 360) / clock.segments;
      if (i < (clock.startValue || 0)) {
        const wedge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        wedge.setAttribute('d', segmentPath(50, 50, 46, startAngle, endAngle));
        wedge.setAttribute('fill', 'var(--accent-soft)');
        wedge.setAttribute('class', 'progress-clock-fill');
        svg.appendChild(wedge);
      }

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
    if (clock.clockType === 'linked-clock' && clock.linkedClockName) {
      info.appendChild(make('div', 'clock-subtext', 'Unlocks ' + clock.linkedClockName));
    } else if (clock.clockType === 'racing-clock' && clock.opposedClockName) {
      info.appendChild(make('div', 'clock-subtext', 'Opposes ' + clock.opposedClockName));
    } else if (clock.clockType === 'tug-of-war-clock') {
      info.appendChild(make('div', 'clock-subtext', 'Push / pull state'));
    } else if (clock.clockType === 'danger-clock') {
      info.appendChild(make('div', 'clock-subtext', 'Threat escalates on fill'));
    }
    if ((clock.thresholds || []).length) {
      const thresholds = make('div', 'clock-thresholds');
      (clock.thresholds || []).forEach((threshold) => {
        thresholds.appendChild(make('div', 'clock-threshold', String(threshold)));
      });
      info.appendChild(thresholds);
    }
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
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-network-svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');

  const nodesById = {};
  (mapState.nodes || []).forEach((node) => {
    nodesById[node.id] = node;
  });

  (mapState.edges || []).forEach((edge) => {
    const from = nodesById[edge.from];
    const to = nodesById[edge.to];
    if (!from || !to) return;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(from.x || 0));
    line.setAttribute('y1', String(from.y || 0));
    line.setAttribute('x2', String(to.x || 0));
    line.setAttribute('y2', String(to.y || 0));
    line.setAttribute('class', 'map-edge');
    line.setAttribute('data-state', edge.state || 'open');
    svg.appendChild(line);

    if (edge.label) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String(((from.x || 0) + (to.x || 0)) / 2));
      label.setAttribute('y', String((((from.y || 0) + (to.y || 0)) / 2) - 2));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'map-edge-label');
      label.textContent = edge.label;
      svg.appendChild(label);
    }
  });
  wrap.appendChild(svg);

  const nodeLayer = make('div', 'map-network-nodes');
  (mapState.nodes || []).forEach((node) => {
    const card = make('div', 'map-node');
    card.setAttribute('data-state', node.state || 'empty');
    if (mapState.currentNode && mapState.currentNode === node.id) {
      card.setAttribute('data-current', 'true');
    }
    card.style.left = String(node.x || 0) + '%';
    card.style.top = String(node.y || 0) + '%';
    card.appendChild(make('div', 'map-node-name', node.label || node.id));
    card.appendChild(make('div', 'map-node-meta', node.id || ''));
    nodeLayer.appendChild(card);
  });
  wrap.appendChild(nodeLayer);
  return wrap;
}

function renderLinearMap(mapState) {
  const wrap = make('div', 'map-track');
  wrap.setAttribute('data-direction', mapState.direction || 'horizontal');
  (mapState.positions || []).forEach((position) => {
    const step = make('div', 'map-track-step');
    const isCurrent = position.index === mapState.currentPosition;
    step.setAttribute('data-state', isCurrent ? 'current' : (position.state || 'empty'));
    step.appendChild(make('div', 'map-track-index', String(position.index)));
    step.appendChild(make('div', 'map-track-label', position.label || ''));
    if (position.annotation) {
      step.appendChild(make('div', 'map-track-meta', position.annotation));
    }
    wrap.appendChild(step);
  });
  return wrap;
}

function renderPlayerMap(mapState) {
  const wrap = make('div', 'player-map');
  wrap.style.setProperty('--grid-columns', mapState.dimensions.columns);
  wrap.style.setProperty('--grid-rows', mapState.dimensions.rows);
  wrap.setAttribute('data-canvas-type', mapState.canvasType || 'dot-grid');
  (mapState.seedMarkers || []).forEach((marker) => {
    const seed = make('div', 'player-map-seed', marker.label || '');
    seed.style.left = 'calc((' + Math.max(0, (marker.col || 1) - 0.5) + ' / var(--grid-columns)) * 100%)';
    seed.style.top = 'calc((' + Math.max(0, (marker.row || 1) - 0.5) + ' / var(--grid-rows)) * 100%)';
    wrap.appendChild(seed);
  });
  (mapState.prompts || []).slice(0, 4).forEach((prompt) => {
    wrap.appendChild(make('div', 'player-map-prompt', prompt));
  });
  return wrap;
}

export function renderMapSection(mapState) {
  const section = make('div', 'map-content');
  section.setAttribute('data-map-family', mapState.family || 'none');
  section.setAttribute('data-map-type', mapState.mapType || 'grid');
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

function renderCellWorkspace(workSpace) {
  const grid = make('div', 'plaintext-grid');
  const size = Math.min((workSpace.rows || 1) * (workSpace.cols || 10), 40);
  for (let i = 0; i < size; i += 1) {
    grid.appendChild(make('div', 'plaintext-cell'));
  }
  return grid;
}

function renderLinedWorkspace(workSpace) {
  const wrap = make('div', 'cipher-lined-workspace');
  const rows = Math.max(2, parseInt(workSpace.rows, 10) || 3);
  for (let index = 0; index < rows; index += 1) {
    wrap.appendChild(make('div', 'cipher-lined-row'));
  }
  return wrap;
}

function renderBlankWorkspace(workSpace) {
  const wrap = make('div', 'cipher-blank-workspace');
  const rows = Math.max(2, parseInt(workSpace.rows, 10) || 3);
  wrap.style.setProperty('--workspace-rows', String(rows));
  return wrap;
}

function renderBoxedWorkspace(workSpace) {
  const wrap = make('div', 'cipher-boxed-workspace');
  const rows = Math.max(1, parseInt(workSpace.rows, 10) || 2);
  const cols = Math.max(2, parseInt(workSpace.cols, 10) || 4);
  wrap.style.setProperty('--workspace-cols', String(cols));
  for (let index = 0; index < rows * cols; index += 1) {
    wrap.appendChild(make('div', 'cipher-boxed-cell'));
  }
  return wrap;
}

function renderWorkspace(workSpace) {
  const style = String((workSpace && workSpace.style) || '').trim().toLowerCase();
  if (style === 'lined') return renderLinedWorkspace(workSpace);
  if (style === 'boxed-totals') return renderBoxedWorkspace(workSpace);
  if (style === 'blank') return renderBlankWorkspace(workSpace);
  return renderCellWorkspace(workSpace);
}

export function renderCipherSection(cipher) {
  const section = make('div', 'cipher-zone');
  section.setAttribute('data-cipher-type', cipher.type || '');
  section.setAttribute('data-cipher-family', cipher.family || 'none');
  section.setAttribute('data-workspace-style', cipher.workspaceStyle || 'cells');
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
    if (cipher.family === 'symbol-key' && (cipher.keyRows || []).length > 1) {
      const table = make('div', 'cipher-key-table');
      (cipher.keyRows || []).forEach((row) => {
        const rowNode = make('div', 'cipher-key-row');
        row.forEach((cell) => {
          rowNode.appendChild(make('div', 'cipher-key-cell', cell));
        });
        table.appendChild(rowNode);
      });
      key.appendChild(table);
    } else if (cipher.family === 'cross-reference' && (cipher.referenceTargets || []).length) {
      const refs = make('div', 'cipher-reference-list');
      (cipher.referenceTargets || []).forEach((target) => {
        refs.appendChild(make('div', 'cipher-reference-item', target));
      });
      key.appendChild(refs);
    } else {
      const grid = make('div', 'key-grid');
      grid.textContent = cipher.keyText;
      key.appendChild(grid);
    }
    section.appendChild(key);
  }

  if (cipher.workSpace) {
    section.appendChild(renderWorkspace(cipher.workSpace));
  }

  if (cipher.family === 'route-tracing' && (cipher.referenceTargets || []).length) {
    const steps = make('div', 'cipher-route-strip');
    (cipher.referenceTargets || []).forEach((target) => {
      steps.appendChild(make('div', 'cipher-route-step', target));
    });
    section.appendChild(steps);
  }
  if (cipher.family === 'typographic-anomaly' && cipher.noticeabilityDesign) {
    section.appendChild(make('div', 'cipher-family-note', cipher.noticeabilityDesign));
  }
  if (cipher.family === 'route-tracing' && cipher.characterDerivationProof) {
    section.appendChild(make('div', 'cipher-family-note', cipher.characterDerivationProof));
  }

  section.appendChild(make('div', 'password-extract', cipher.extractionInstruction));
  return section;
}

export function renderOracleSection(oracle) {
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

function renderTrackRail(track) {
  const rail = make('div', 'companion-track');
  rail.appendChild(make('div', 'companion-track-label', track.label || 'Track'));
  const boxes = make('div', 'companion-track-boxes');
  const segments = Math.max(1, parseInt(track.segments, 10) || 4);
  const active = Math.max(0, Math.min(parseInt(track.startValue, 10) || 0, segments));
  for (let index = 0; index < segments; index += 1) {
    const box = make('div', 'companion-track-box');
    if (index < active) box.setAttribute('data-filled', 'true');
    boxes.appendChild(box);
  }
  rail.appendChild(boxes);
  return rail;
}

function renderInventorySlots(component) {
  const wrap = make('div', 'companion-inventory-grid');
  const slots = (component.slots || []).length ? component.slots : [];
  slots.forEach((slot) => {
    const item = make('div', 'companion-inventory-slot');
    item.appendChild(make('div', 'companion-slot-label', slot.label || ''));
    item.appendChild(make('div', 'companion-slot-box'));
    wrap.appendChild(item);
  });
  (component.conditions || []).forEach((condition) => {
    const chip = make('div', 'companion-condition-chip', condition.label || condition);
    wrap.appendChild(chip);
  });
  return wrap;
}

function renderTokenSheet(component) {
  const grid = make('div', 'companion-token-sheet');
  (component.tokens || []).forEach((token) => {
    const item = make('div', 'companion-token');
    item.appendChild(make('div', 'companion-token-label', token.label || token.name || 'TOKEN'));
    grid.appendChild(item);
  });
  if (!(component.tokens || []).length) {
    const total = Math.max(4, (component.rows || 2) * (component.cols || 4));
    for (let index = 0; index < total; index += 1) {
      grid.appendChild(make('div', 'companion-token'));
    }
  }
  return grid;
}

function renderOverlay(component) {
  const overlay = make('div', 'companion-overlay');
  (component.windows || []).forEach((windowDef) => {
    const pane = make('div', 'companion-overlay-window');
    pane.appendChild(make('div', 'companion-overlay-label', windowDef.label || 'WINDOW'));
    overlay.appendChild(pane);
  });
  if (!(component.windows || []).length) {
    for (let index = 0; index < 3; index += 1) {
      overlay.appendChild(make('div', 'companion-overlay-window'));
    }
  }
  return overlay;
}

function renderUsageDie(component) {
  const wrap = make('div', 'companion-usage-die');
  const ladder = ['d20', 'd12', 'd10', 'd8', 'd6', 'd4'];
  const current = String(component.usageDie || 'd8').toLowerCase();
  ladder.forEach((step) => {
    const item = make('div', 'companion-usage-step', step.toUpperCase());
    if (step === current) item.setAttribute('data-active', 'true');
    wrap.appendChild(item);
  });
  return wrap;
}

function renderMemorySlots(component) {
  const wrap = make('div', 'companion-memory-slots');
  const slots = (component.slots || []).length ? component.slots : new Array(5).fill(null).map((_, index) => ({
    label: 'M' + (index + 1)
  }));
  slots.forEach((slot) => {
    const item = make('div', 'companion-memory-slot');
    item.appendChild(make('div', 'companion-slot-label', slot.label || 'MEM'));
    const lines = make('div', 'companion-memory-lines');
    for (let index = 0; index < 3; index += 1) {
      lines.appendChild(make('div', 'companion-memory-line'));
    }
    item.appendChild(lines);
    wrap.appendChild(item);
  });
  return wrap;
}

export function renderCompanionComponent(component) {
  const card = make('section', 'companion-component');
  card.setAttribute('data-component-family', component.family || 'custom-companion');
  card.setAttribute('data-component-type', component.type || 'custom');
  card.setAttribute('data-component-footprint', component.footprint || 'half-page');
  card.appendChild(make('div', 'companion-title', component.title || 'Companion Component'));
  if (component.subtitle) {
    card.appendChild(make('div', 'companion-subtitle', component.subtitle));
  }
  if (component.playWindow) {
    card.appendChild(make('div', 'companion-meta', 'Use during ' + component.playWindow));
  }

  if (component.body) {
    card.appendChild(make('div', 'companion-body', component.body));
  }

  if ((component.family === 'dashboard' || component.family === 'stress-track') && (component.tracks || []).length) {
    const tracks = make('div', 'companion-dashboard');
    (component.tracks || []).forEach((track) => {
      tracks.appendChild(renderTrackRail(track));
    });
    card.appendChild(tracks);
  } else if (component.family === 'usage-die') {
    card.appendChild(renderUsageDie(component));
  } else if (component.family === 'memory-slots') {
    card.appendChild(renderMemorySlots(component));
  } else if (component.family === 'inventory-grid') {
    card.appendChild(renderInventorySlots(component));
  } else if (component.family === 'token-sheet') {
    card.appendChild(renderTokenSheet(component));
  } else if (component.family === 'overlay-window') {
    card.appendChild(renderOverlay(component));
  } else if (component.family === 'return-box') {
    const deposit = make('div', 'companion-return-box');
    deposit.appendChild(make('div', 'companion-return-slot'));
    card.appendChild(deposit);
  } else if ((component.slots || []).length) {
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

  if (component.reminder) {
    card.appendChild(make('div', 'companion-reminder', component.reminder));
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
  frame.setAttribute('data-clock-family', (model.mechanicProfile || {}).clockFamily || 'none');

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
  if (model.continuationSegment) {
    frame.setAttribute('data-continuation-segment', model.continuationSegment);
  }

  const header = make('header', 'boss-header');
  header.appendChild(make('span', '', 'Convergence'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  if (model.continuationLabel) {
    frame.appendChild(make('div', 'doc-label continuation-label', model.continuationLabel));
  }
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

  if ((model.componentInputs || []).length) {
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
  }

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
