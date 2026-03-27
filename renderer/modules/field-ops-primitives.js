import { make } from './dom.js?v=47';
import { createBoundedPage } from './page-shell.js?v=47';

const WORD_NUMS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
const BOX_GRID_PATTERN = /(\w+)\s+rows?\s+(?:of\s+)?(\w+)\s+box(?:es)?/i;

function parseDashboardBoxGrid(text) {
  if (!text) return null;
  const match = text.match(BOX_GRID_PATTERN);
  if (!match) return null;
  const rows = WORD_NUMS[match[1].toLowerCase()] || parseInt(match[1], 10);
  const cols = WORD_NUMS[match[2].toLowerCase()] || parseInt(match[2], 10);
  if (!rows || !cols || rows > 8 || cols > 8) return null;
  return { rows, cols };
}

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
  const cols = mapState.gridDimensions.columns;
  wrap.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
  wrap.style.setProperty('--grid-columns', String(cols));
  wrap.style.setProperty('--grid-rows', String(mapState.gridDimensions.rows || 1));

  const tilesByPosition = {};
  (mapState.tiles || []).forEach((tile) => {
    tilesByPosition[tile.col + ':' + tile.row] = tile;
  });

  for (let row = 1; row <= mapState.gridDimensions.rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
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

const ROUTE_LABEL_ABBREVIATIONS = {
  access: 'Acc.',
  airlock: 'Airlock',
  approach: 'Appr.',
  archive: 'Arch.',
  bridge: 'Bridge',
  cargo: 'Cargo',
  command: 'Cmd.',
  corridor: 'Corr.',
  crew: 'Crew',
  direct: 'Dir.',
  eva: 'EVA',
  exterior: 'Ext.',
  habitation: 'Hab.',
  junction: 'Jct.',
  ladder: 'Ldr.',
  lab: 'Lab',
  link: 'Link',
  maintenance: 'Maint.',
  medical: 'Med.',
  node: 'Node',
  passage: 'Pass.',
  run: 'Run',
  science: 'Sci.',
  service: 'Svc.',
  transit: 'Transit',
};

function compactRouteLabel(label, maxChars = 18) {
  const raw = String(label || '').trim();
  if (!raw) return '';
  if (raw.length <= maxChars) return raw;

  const compact = raw.replace(/[A-Za-z]+/g, (word) => {
    const replacement = ROUTE_LABEL_ABBREVIATIONS[word.toLowerCase()];
    return replacement || word;
  });
  if (compact.length <= maxChars) return compact;

  return compact
    .split(/\s+/)
    .map((part) => part.replace(/[aeiou]/gi, ''))
    .join(' ')
    .slice(0, maxChars)
    .trim();
}

function buildRouteCode(index) {
  return 'R' + String(index + 1);
}

// ---------------------------------------------------------------------------
// PTP density tiers — deterministic thresholds for node count
// ---------------------------------------------------------------------------
const PTP_DENSITY = {
  STANDARD_MAX: 8,   // ≤8 nodes: standard sizing + insets
  DENSE_MAX: 12,     // 9–12 nodes: tighter boxes, wider coord range
  // >12: packed — smallest boxes, widest coord range
};

// Insets per density tier (SVG-unit percentages within 0–100 viewBox)
const PTP_INSETS = {
  standard: { xStart: 16, xEnd: 84, yStart: 14, yEnd: 82 },
  dense:    { xStart: 11, xEnd: 89, yStart: 10, yEnd: 86 },
  packed:   { xStart:  8, xEnd: 92, yStart:  7, yEnd: 88 },
};

function ptpDensityTier(nodeCount) {
  if (nodeCount <= PTP_DENSITY.STANDARD_MAX) return 'standard';
  if (nodeCount <= PTP_DENSITY.DENSE_MAX) return 'dense';
  return 'packed';
}

// ---------------------------------------------------------------------------
// Deterministic collision-avoidance relaxation
// Pushes overlapping nodes apart in bounded passes. Same input → same output.
// ---------------------------------------------------------------------------
function relaxNodePositions(nodes, insets, passes) {
  const minSep = 9;  // minimum separation in SVG units (≈ node box footprint)
  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j]._x - nodes[i]._x;
        const dy = nodes[j]._y - nodes[i]._y;
        const dist = Math.hypot(dx, dy);
        if (dist >= minSep || dist === 0) continue;
        // Deterministic push: half the deficit to each node along the connecting axis
        const overlap = (minSep - dist) / 2;
        const ux = dx / dist;
        const uy = dy / dist;
        nodes[i]._x -= ux * overlap;
        nodes[i]._y -= uy * overlap;
        nodes[j]._x += ux * overlap;
        nodes[j]._y += uy * overlap;
        moved = true;
      }
    }
    // Clamp back to bounds after each pass
    nodes.forEach((node) => {
      node._x = Math.max(insets.xStart, Math.min(insets.xEnd, node._x));
      node._y = Math.max(insets.yStart, Math.min(insets.yEnd, node._y));
    });
    if (!moved) break;
  }
}

// ---------------------------------------------------------------------------
// Check if a candidate label position is too close to any node center
// ---------------------------------------------------------------------------
function labelCollidesWithNode(lx, ly, nodes, threshold) {
  for (let i = 0; i < nodes.length; i++) {
    if (Math.hypot(lx - nodes[i]._x, ly - nodes[i]._y) < threshold) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Truncate long node labels deterministically for dense maps
// ---------------------------------------------------------------------------
function compactNodeLabel(label, maxLen) {
  const raw = String(label || '').trim();
  if (raw.length <= maxLen) return raw;
  // Try dropping parenthesised suffixes first
  const stripped = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (stripped.length <= maxLen && stripped.length > 0) return stripped;
  // Hard truncate
  return raw.slice(0, maxLen - 1).trim() + '\u2026';
}

function renderPointMap(mapState) {
  const wrap = make('div', 'map-network');
  const shellFamily = ((mapState.artifactIdentity || {}).shellFamily || '').toLowerCase();
  const useInstrumentationRail = shellFamily === 'classified-packet';
  if (useInstrumentationRail) {
    wrap.setAttribute('data-has-rail', 'true');
    const rail = make('div', 'map-network-rail');
    [
      ['Sector', mapState.title || 'Topology'],
      ['Current', mapState.currentNode || '--'],
      ['Routes', String((mapState.edges || []).length || 0)],
    ].forEach(([label, value]) => {
      const item = make('div', 'map-network-rail-item');
      item.appendChild(make('div', 'map-network-rail-label', label));
      item.appendChild(make('div', 'map-network-rail-value', value));
      rail.appendChild(item);
    });
    wrap.appendChild(rail);
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-network-svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const nodes = (mapState.nodes || []).map((node) => ({ ...node }));
  const nodeCount = nodes.length;
  const tier = ptpDensityTier(nodeCount);
  const insets = PTP_INSETS[tier];

  // Set density tier as CSS custom property for node sizing
  wrap.setAttribute('data-ptp-density', tier);

  // Compute actual coordinate bounding box (handles negative + zero coords)
  let rawMinX = Infinity, rawMaxX = -Infinity;
  let rawMinY = Infinity, rawMaxY = -Infinity;
  nodes.forEach((node) => {
    const nx = Number(node.x) || 0;
    const ny = Number(node.y) || 0;
    if (nx < rawMinX) rawMinX = nx;
    if (nx > rawMaxX) rawMaxX = nx;
    if (ny < rawMinY) rawMinY = ny;
    if (ny > rawMaxY) rawMaxY = ny;
  });
  if (!isFinite(rawMinX)) { rawMinX = 0; rawMaxX = 1; }
  if (!isFinite(rawMinY)) { rawMinY = 0; rawMaxY = 1; }

  // Normalize coordinates using actual min/max range → inset range
  const spanX = Math.max(1, rawMaxX - rawMinX);
  const spanY = Math.max(1, rawMaxY - rawMinY);

  const nodesById = {};
  nodes.forEach((node) => {
    const nx = Number(node.x) || 0;
    const ny = Number(node.y) || 0;
    node._x = insets.xStart + ((nx - rawMinX) / spanX) * (insets.xEnd - insets.xStart);
    node._y = insets.yStart + ((ny - rawMinY) / spanY) * (insets.yEnd - insets.yStart);
    nodesById[node.id] = node;
  });

  // Deterministic collision-avoidance relaxation (3 passes for standard, 5 for dense/packed)
  const relaxPasses = tier === 'standard' ? 3 : 5;
  relaxNodePositions(nodes, insets, relaxPasses);

  // Maximum label length per tier
  const nodeLabelMax = tier === 'packed' ? 18 : tier === 'dense' ? 24 : 40;

  // Edge label density threshold — suppress inline labels in dense maps
  // (classified-packet always uses route codes + route key)
  const edgeLabelThreshold = tier === 'packed' ? 6 : tier === 'dense' ? 10 : 999;
  const nodeCollisionRadius = tier === 'packed' ? 6 : 8;

  (mapState.edges || []).forEach((edge, edgeIndex) => {
    const from = nodesById[edge.from];
    const to = nodesById[edge.to];
    if (!from || !to) return;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(from._x || 0));
    line.setAttribute('y1', String(from._y || 0));
    line.setAttribute('x2', String(to._x || 0));
    line.setAttribute('y2', String(to._y || 0));
    line.setAttribute('class', 'map-edge');
    line.setAttribute('data-state', edge.state || 'open');
    svg.appendChild(line);

    // Determine whether to show inline edge label
    const edgeCount = (mapState.edges || []).length;
    const showInlineLabel = edge.label && (
      shellFamily === 'classified-packet'
        ? edgeCount <= edgeLabelThreshold
        : edgeCount <= edgeLabelThreshold
    );

    if (showInlineLabel) {
      const dx = (to._x || 0) - (from._x || 0);
      const dy = (to._y || 0) - (from._y || 0);
      const distance = Math.max(1, Math.hypot(dx, dy));
      const normalX = -dy / distance;
      const normalY = dx / distance;
      const offsetSign = edgeIndex % 2 === 0 ? 1 : -1;
      const isDeferredRoute = edge.state === 'locked' || edge.state === 'inaccessible';
      const labelOffset = shellFamily === 'classified-packet'
        ? (isDeferredRoute ? 6.4 : 4.8)
        : 3.2;

      // Try multiple positions along the edge to avoid node overlap
      const candidateProgressions = shellFamily === 'classified-packet'
        ? [isDeferredRoute
            ? (edgeIndex % 2 === 0 ? 0.24 : 0.78)
            : (edgeIndex % 2 === 0 ? 0.36 : 0.6)]
        : [0.5, 0.35, 0.65, 0.25, 0.75];

      const labelText = shellFamily === 'classified-packet'
        ? buildRouteCode(edgeIndex)
        : compactRouteLabel(edge.label, distance < 22 ? 12 : 16);
      const textLength = Math.max(10, Math.min(distance * 0.9, labelText.length * 3.6));

      let bestX = 0, bestY = 0, placed = false;
      for (let ci = 0; ci < candidateProgressions.length; ci++) {
        const progress = candidateProgressions[ci];
        const cx = (from._x || 0) + (dx * progress) + (normalX * labelOffset * offsetSign);
        const cy = (from._y || 0) + (dy * progress) + (normalY * labelOffset * offsetSign);
        if (!labelCollidesWithNode(cx, cy, nodes, nodeCollisionRadius)) {
          bestX = cx;
          bestY = cy;
          placed = true;
          break;
        }
        if (ci === 0) { bestX = cx; bestY = cy; } // fallback to first candidate
      }

      // Only suppress label entirely if all candidates collide AND we're in packed mode
      if (placed || tier !== 'packed') {
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', String(bestX));
        label.setAttribute('y', String(bestY));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.setAttribute('class', 'map-edge-label');
        label.setAttribute('textLength', String(textLength));
        label.setAttribute('lengthAdjust', 'spacingAndGlyphs');
        label.textContent = labelText;
        svg.appendChild(label);
      }
    }
  });
  wrap.appendChild(svg);

  const nodeLayer = make('div', 'map-network-nodes');
  nodes.forEach((node) => {
    const card = make('div', 'map-node');
    card.setAttribute('data-state', node.state || 'empty');
    if (mapState.currentNode && mapState.currentNode === node.id) {
      card.setAttribute('data-current', 'true');
    }
    card.style.left = String(node._x || 0) + '%';
    card.style.top = String(node._y || 0) + '%';
    card.appendChild(make('div', 'map-node-name', compactNodeLabel(node.label || node.id, nodeLabelMax)));
    card.appendChild(make('div', 'map-node-meta', node.id || ''));
    nodeLayer.appendChild(card);
  });
  wrap.appendChild(nodeLayer);

  const legend = make('div', 'map-network-legend');
  legend.appendChild(make('div', 'map-network-chip', (nodeCount || 0) + ' nodes'));
  legend.appendChild(make('div', 'map-network-chip', ((mapState.edges || []).length || 0) + ' routes'));
  if (mapState.currentNode) {
    legend.appendChild(make('div', 'map-network-chip', 'Current ' + mapState.currentNode));
  }
  wrap.appendChild(legend);
  return wrap;
}

function renderRouteKey(mapState) {
  const shellFamily = ((mapState.artifactIdentity || {}).shellFamily || '').toLowerCase();
  if (shellFamily !== 'classified-packet' || mapState.mapType !== 'point-to-point' || !(mapState.edges || []).length) {
    return null;
  }

  const wrap = make('div', 'map-route-key');
  wrap.appendChild(make('div', 'doc-label', 'Route Key'));

  const grid = make('div', 'map-route-key-grid');
  (mapState.edges || []).forEach((edge, index) => {
    const row = make('div', 'map-route-key-row');
    row.appendChild(make('div', 'map-route-key-code', buildRouteCode(index)));
    row.appendChild(make('div', 'map-route-key-label', edge.label || 'Route'));
    grid.appendChild(row);
  });
  wrap.appendChild(grid);
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
  // .map-zone is the peer of .cipher-zone and .oracle-zone in the zone contract.
  // All zone-level CSS (classified-packet, boardStateMode variants, data-layout-variant
  // rules) targets .map-zone.  The inner .map-content holds the map type content.
  const zone = make('div', 'map-zone');
  const section = make('div', 'map-content');
  section.setAttribute('data-map-family', mapState.family || 'none');
  section.setAttribute('data-map-type', mapState.mapType || 'grid');
  section.appendChild(make('div', 'map-title', mapState.title || 'Map'));

  if (mapState.mapType === 'point-to-point') {
    section.appendChild(renderPointMap(mapState));
    const routeKey = renderRouteKey(mapState);
    if (routeKey) section.appendChild(routeKey);
  } else if (mapState.mapType === 'linear-track') {
    section.appendChild(renderLinearMap(mapState));
  } else if (mapState.mapType === 'player-drawn') {
    section.appendChild(renderPlayerMap(mapState));
  } else {
    section.appendChild(renderGridMap(mapState));
  }

  if (mapState.floorLabel) section.appendChild(make('div', 'map-annotation', mapState.floorLabel));
  if (mapState.mapNote) section.appendChild(make('div', 'map-note', mapState.mapNote));
  zone.appendChild(section);
  return zone;
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
  const ladder = ['100', '80', '60', '40', '20', '00'];
  const current = String(component.usageDie || component.usage || '').toLowerCase();
  ladder.forEach((step) => {
    const item = make('div', 'companion-usage-step', step);
    if (step === '100' || current.indexOf(step) !== -1) item.setAttribute('data-active', 'true');
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
  } else if (component.family === 'dashboard') {
    const boxGrid = parseDashboardBoxGrid(component.body);
    if (boxGrid) {
      const grid = make('div', 'companion-dashboard companion-dashboard-grid');
      for (let r = 0; r < boxGrid.rows; r++) {
        const row = make('div', 'companion-dashboard-row');
        for (let c = 0; c < boxGrid.cols; c++) {
          row.appendChild(make('div', 'companion-dashboard-box'));
        }
        grid.appendChild(row);
      }
      card.appendChild(grid);
    } else {
      const lineCount = component.slotCount || 5;
      const dash = make('div', 'companion-dashboard');
      for (let i = 0; i < lineCount; i++) {
        dash.appendChild(make('div', 'companion-dash-line'));
      }
      card.appendChild(dash);
    }
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
  frame.setAttribute('data-shell-family', model.shellFamily || (model.artifactIdentity && model.artifactIdentity.shellFamily) || 'field-survey');
  const isClassifiedFollowup = (model.shellFamily || (model.artifactIdentity && model.artifactIdentity.shellFamily) || '') === 'classified-packet'
    && model.continuationSegment === 'followup';

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

  if (model.shellFamily === 'classified-packet') {
    const strip = make('div', 'boss-incident-strip');
    strip.appendChild(make('div', 'boss-incident-chip', 'Final Document'));
    strip.appendChild(make('div', 'boss-incident-chip', model.weekLabel || 'Week 00'));
    strip.appendChild(make('div', 'boss-incident-chip', 'Recovered Inputs ' + ((model.componentInputs || []).length || 0)));
    frame.appendChild(strip);
  }

  if (model.continuationLabel) {
    frame.appendChild(make('div', 'doc-label continuation-label', model.continuationLabel));
  }
  frame.appendChild(make('h2', 'boss-title', model.title));

  let appendixGrid = null;
  if (isClassifiedFollowup) {
    appendixGrid = make('div', 'boss-appendix-grid');
  }

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
    components.appendChild(make('div', 'boss-components-label', model.componentLabel || 'Recorded Inputs'));
    const list = make('div', 'boss-component-list');
    (model.componentInputs || []).forEach((item) => {
      const row = make('div', 'boss-component-item');
      row.appendChild(make('div', 'boss-component-week', item.weekLabel));
      row.appendChild(make('div', 'boss-component-box'));
      row.appendChild(make('div', 'boss-component-value', item.value));
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
    (appendixGrid || frame).appendChild(branch);
  }

  if ((model.convergenceProofParagraphs || []).length) {
    const proof = make('div', 'boss-proof');
    proof.appendChild(make('div', 'boss-proof-label', 'Convergence Notes'));
    model.convergenceProofParagraphs.slice(0, 2).forEach((paragraph) => {
      proof.appendChild(make('p', '', paragraph));
    });
    (appendixGrid || frame).appendChild(proof);
  }

  if (appendixGrid && appendixGrid.childNodes.length) {
    frame.appendChild(appendixGrid);
  }

  const convergence = make('div', 'boss-convergence');
  convergence.appendChild(make('div', 'boss-convergence-label', model.convergenceLabel || 'Final Word'));
  convergence.appendChild(make('p', 'boss-convergence-instruction', model.passwordRevealInstruction));

  const passwordBoxes = make('div', 'boss-password-boxes');
  for (let i = 0; i < model.passwordLength; i += 1) {
    passwordBoxes.appendChild(make('div', 'boss-password-box'));
  }
  convergence.appendChild(passwordBoxes);
  frame.appendChild(convergence);

  return page;
}
