import { make } from './dom.js?v=48';
import { createBoundedPage } from './page-shell.js?v=48';
import {
  resolveWorkspaceStyle,
  resolveWorkspaceCellCount,
  DEFAULT_WORKSPACE_STYLE
} from '../../contracts/contract-constants.mjs';

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

/**
 * The clock face — the only clock renderer the printed book can reach.
 *
 * DIALECT LAYERS (Wave 3). All four dialects are DRAWN, every time, into the
 * same 100x100 viewBox; `[data-component-dialect]` in booklet.css shows one and
 * paints the rest out with `fill:none; stroke:none`. Drawing-then-hiding rather
 * than branching on the dialect here is deliberate three ways: this function
 * has no access to meta.artifactIdentity, the box is identical in every dialect
 * so THE HEIGHT LAW holds by construction, and hiding via paint (not `display`)
 * keeps every dialect rule inside the property set the validator's
 * componentDialectHeightLaw() pass permits.
 *
 * NOTE ON THE OTHER CLOCK: atoms/tracker.js buildClock() draws a second clock
 * face and is NOT unified with this one, because it is unreachable — its switch
 * runs only for a `trackType` outside VALID_COMPANION_TYPES, and the schema
 * closes that enum, which is also why no `.tracker-*` class has ever had CSS.
 * Unifying a live renderer with a dead one would buy no drift protection and
 * would import a dead presentation profile into the live path. It stays where
 * it is, with the rest of the generic-tracker seed (D6 class).
 */
/**
 * The one line of derived prose a clock face carries under its name, or ''.
 *
 * SINGLE HOME. Exported because atoms/clocks-panel.js has to count this
 * string's characters in phase 1 to predict the height render() will produce,
 * and a hand-mirrored copy of these four branches is exactly the kind of
 * quiet divergence the ladder-mirror rules exist to prevent. Pure over its
 * argument; no DOM.
 *
 * @param {object} clock — a model from buildClockModels()
 * @returns {string}
 */
export function clockSubtext(clock) {
  if (!clock) return '';
  if (clock.clockType === 'linked-clock' && clock.linkedClockName) {
    return 'Unlocks ' + clock.linkedClockName;
  }
  if (clock.clockType === 'racing-clock' && clock.opposedClockName) {
    return 'Opposes ' + clock.opposedClockName;
  }
  if (clock.clockType === 'tug-of-war-clock') return 'Push / pull state';
  if (clock.clockType === 'danger-clock') return 'Threat escalates on fill';
  return '';
}

/** The prefix `renderGameplayClocks` stamps ahead of `consequenceOnFull`.
 *  Mirrored by CONSEQUENCE_PREFIX_CHARS in atoms/clocks-panel.js. */
export const CLOCK_CONSEQUENCE_PREFIX = 'ON FULL: ';

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

    const filled = clock.startValue || 0;

    for (let i = 0; i < clock.segments; i += 1) {
      const startAngle = (i * 360) / clock.segments;
      const endAngle = ((i + 1) * 360) / clock.segments;
      if (i < filled) {
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
      line.setAttribute('class', 'progress-clock-divider');
      svg.appendChild(line);

      // beads — one countable bead per segment on the inner ring.
      const beadCentre = polarPoint(50, 50, 33, startAngle + (180 / clock.segments));
      const bead = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bead.setAttribute('cx', beadCentre.x.toFixed(2));
      bead.setAttribute('cy', beadCentre.y.toFixed(2));
      bead.setAttribute('r', '7');
      bead.setAttribute('class', 'progress-clock-bead');
      if (i < filled) bead.setAttribute('data-filled', 'true');
      svg.appendChild(bead);

      // tally — a notched rim: a short bar across each segment's rim tick,
      // struck through once the segment is spent.
      const rimOuter = polarPoint(50, 50, 47, startAngle);
      const rimInner = polarPoint(50, 50, 38, startAngle);
      const notch = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      notch.setAttribute('x1', rimInner.x.toFixed(2));
      notch.setAttribute('y1', rimInner.y.toFixed(2));
      notch.setAttribute('x2', rimOuter.x.toFixed(2));
      notch.setAttribute('y2', rimOuter.y.toFixed(2));
      notch.setAttribute('class', 'progress-clock-notch');
      if (i < filled) notch.setAttribute('data-filled', 'true');
      svg.appendChild(notch);
    }

    // gauge — one swept arc reading the whole clock at a glance, plus the
    // needle at the reading. Drawn last so it sits over the rim.
    const sweep = Math.max(0, Math.min(filled, clock.segments));
    if (sweep > 0) {
      const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arc.setAttribute('d', segmentPath(50, 50, 42, 0, (sweep * 360) / clock.segments));
      arc.setAttribute('class', 'progress-clock-arc');
      svg.appendChild(arc);
    }
    const needleEnd = polarPoint(50, 50, 44, (sweep * 360) / clock.segments);
    const needle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    needle.setAttribute('x1', '50');
    needle.setAttribute('y1', '50');
    needle.setAttribute('x2', needleEnd.x.toFixed(2));
    needle.setAttribute('y2', needleEnd.y.toFixed(2));
    needle.setAttribute('class', 'progress-clock-needle');
    svg.appendChild(needle);

    const visuals = make('div', 'clock-visuals');
    visuals.appendChild(svg);
    item.appendChild(visuals);

    const info = make('div', 'clock-info');
    info.appendChild(make('div', 'clock-name', clock.clockName));
    const subtext = clockSubtext(clock);
    if (subtext) info.appendChild(make('div', 'clock-subtext', subtext));
    if ((clock.thresholds || []).length) {
      const thresholds = make('div', 'clock-thresholds');
      (clock.thresholds || []).forEach((threshold) => {
        thresholds.appendChild(make('div', 'clock-threshold', String(threshold)));
      });
      info.appendChild(thresholds);
    }
    if (clock.consequenceOnFull) {
      info.appendChild(make('div', 'clock-consequence', CLOCK_CONSEQUENCE_PREFIX + clock.consequenceOnFull));
    }
    item.appendChild(info);
    grid.appendChild(item);
  });
  section.appendChild(grid);
  return section;
}

// ---------------------------------------------------------------------------
// Hex cell variant (mapState.cellShape === 'hex')
// ---------------------------------------------------------------------------
/**
 * Pointy-top hexes in odd-row-offset layout, drawn as SVG polygons.
 *
 * WHY SVG AND NOT clip-path: the Safari export path rasterises through
 * html2canvas 1.4.1 (D87), which does not honour clip-path. Inline SVG is
 * already proven through that path by point-to-point.
 *
 * WHY THE HEIGHT IS FIXED IN px AND THE WIDTH IS NOT: phase-1 estimation has no
 * DOM and cannot know whether this map renders full-width or in a half slot, so
 * a width-derived hex height would be wrong by ~2x in the half-width case (the
 * D71 defect class). The container's height comes from the row count alone;
 * `preserveAspectRatio="xMidYMid meet"` then sizes the hexes to whichever axis
 * binds and centres the slack. Height is density-invariant and width-invariant
 * by construction.
 *
 * CROSS-FILE CONTRACT: HEX_ROW_UNITS / HEX_CAP_UNITS below are mirrored as
 * HEX_ROW_PX / HEX_CAP_PX in atoms/map-panel.js, and the `.map-hex` height rule
 * in booklet.css is written from the same two numbers. Change all three together.
 */
const HEX_ROW_UNITS = 26;   // vertical step between hex rows (0.75 x hex height)
const HEX_CAP_UNITS = 9;    // the bottom quarter of the last row

function hexPolygonPoints(cx, cy, size) {
  // Pointy-top: vertices at 30 deg increments starting from the top.
  const points = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 90);
    points.push(
      (cx + size * Math.cos(angle)).toFixed(2) + ',' + (cy + size * Math.sin(angle)).toFixed(2)
    );
  }
  return points.join(' ');
}

function renderHexGridMap(mapState) {
  const dims = mapState.gridDimensions || { columns: 6, rows: 5 };
  const cols = Math.max(1, parseInt(dims.columns, 10) || 6);
  const rows = Math.max(1, parseInt(dims.rows, 10) || 5);

  const wrap = make('div', 'map-hex');
  wrap.style.height = (rows * HEX_ROW_UNITS + HEX_CAP_UNITS) + 'px';
  wrap.setAttribute('data-hex-columns', String(cols));

  // One hex is 2 units wide and 2.31 units tall in this local space; rows step
  // 1.732 units and odd rows shift a half-width right.
  const size = 1.1547;                 // circumradius for a 2-unit-wide hex
  const stepX = 2;
  const stepY = size * 1.5;
  const vbWidth = cols * stepX + stepX / 2 + 0.6;
  const vbHeight = (rows - 1) * stepY + size * 2 + 0.6;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-hex-svg');
  svg.setAttribute('viewBox', '0 0 ' + vbWidth.toFixed(2) + ' ' + vbHeight.toFixed(2));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const tilesByPosition = {};
  (mapState.tiles || []).forEach((tile) => {
    tilesByPosition[tile.col + ':' + tile.row] = tile;
  });
  const current = mapState.currentPosition || null;

  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      const tile = tilesByPosition[col + ':' + row] || {};
      const isCurrent = !!(current && current.col === col && current.row === row);
      const cx = 0.3 + size + (col - 1) * stepX + (row % 2 === 0 ? stepX / 2 : 0);
      const cy = 0.3 + size + (row - 1) * stepY;

      const cell = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      cell.setAttribute('points', hexPolygonPoints(cx, cy, size));
      cell.setAttribute('class', 'map-hex-cell');
      cell.setAttribute('data-state', isCurrent ? 'current' : (tile.type || 'empty'));
      svg.appendChild(cell);

      const rawLabel = tile.label || (isCurrent ? 'YOU' : '');
      if (rawLabel) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', cx.toFixed(2));
        text.setAttribute('y', cy.toFixed(2));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('class', 'map-hex-label');
        text.textContent = rawLabel.substring(0, 5);
        svg.appendChild(text);
      }
    }
  }

  wrap.appendChild(svg);
  return wrap;
}

function renderGridMap(mapState) {
  if (mapState.cellShape === 'hex') return renderHexGridMap(mapState);
  const wrap = make('div', 'map-grid');
  const dims = mapState.gridDimensions || { columns: 6, rows: 5 };
  const cols = dims.columns || 6;
  wrap.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
  wrap.style.setProperty('--grid-columns', String(cols));
  wrap.style.setProperty('--grid-rows', String(dims.rows || 1));

  const tilesByPosition = {};
  (mapState.tiles || []).forEach((tile) => {
    tilesByPosition[tile.col + ':' + tile.row] = tile;
  });

  for (let row = 1; row <= dims.rows; row += 1) {
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
  // Constellation mode: same geometry, different reading. An edge stops being a
  // way to get there and becomes a tie, so the CSS variant restyles the edge
  // vocabulary and the printed nouns follow — a legend that still said "routes"
  // over a sociogram would be the interface telling the player the wrong game.
  const relational = mapState.edgeSemantics === 'relational';
  wrap.setAttribute('data-edge-semantics', relational ? 'relational' : 'traversal');
  const edgeNoun = relational ? 'ties' : 'routes';
  const useInstrumentationRail = shellFamily === 'classified-packet';
  if (useInstrumentationRail) {
    wrap.setAttribute('data-has-rail', 'true');
    const rail = make('div', 'map-network-rail');
    [
      ['Sector', mapState.title || 'Topology'],
      ['Current', mapState.currentNode || '--'],
      [relational ? 'Ties' : 'Routes', String((mapState.edges || []).length || 0)],
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

  // Edge label suppression: aggressive suppression is only safe when an
  // alternate route-label surface (the route key panel) will be rendered.
  // renderRouteKey() is gated on classified-packet, so that's our signal.
  const hasRouteKey = shellFamily === 'classified-packet';
  const edgeLabelThreshold = hasRouteKey
    ? (tier === 'packed' ? 6 : tier === 'dense' ? 10 : 999)
    : 999; // no route key → always attempt inline labels
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
    const showInlineLabel = edge.label && edgeCount <= edgeLabelThreshold;

    if (showInlineLabel) {
      const dx = (to._x || 0) - (from._x || 0);
      const dy = (to._y || 0) - (from._y || 0);
      const distance = Math.max(1, Math.hypot(dx, dy));
      const normalX = -dy / distance;
      const normalY = dx / distance;
      const offsetSign = edgeIndex % 2 === 0 ? 1 : -1;
      const isDeferredRoute = edge.state === 'locked' || edge.state === 'inaccessible';
      // Relational ties are drawn heavier than traversal edges (a `strong` tie
      // is 2.4 wide), so a 3.2 offset put the label ON the line and a strong
      // tie read as a struck-through one — the opposite of what it means.
      const labelOffset = shellFamily === 'classified-packet'
        ? (isDeferredRoute ? 6.4 : 4.8)
        : (relational ? 4.8 : 3.2);

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

      // Only suppress an individual label if all candidates collide AND
      // an alternate route key surface exists to carry the information.
      // Without a route key, always render the label (best-effort position).
      if (placed || !hasRouteKey) {
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
  legend.appendChild(make('div', 'map-network-chip', ((mapState.edges || []).length || 0) + ' ' + edgeNoun));
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

// ---------------------------------------------------------------------------
// concentric — approach rings
// ---------------------------------------------------------------------------
/**
 * Nested rings, OUTERMOST FIRST, drawn in the same 100x100 viewBox idiom every
 * other SVG map uses. The band between ring i and ring i+1 carries ring i's
 * label on the vertical meridian, where a printed label has the most room.
 *
 * The whole diagram is stroke-and-dash, never fill: the bands are where the
 * player writes, so filling them would take the surface away, and a hue-coded
 * ring would not survive the B&W print requirement.
 */
const RINGS_OUTER_R = 46;

/** Ring i's radius, outermost first, for an N-ring diagram. */
function ringRadius(index, count) {
  return RINGS_OUTER_R - (index * (RINGS_OUTER_R / count));
}

function renderRingsMap(mapState) {
  const rings = Array.isArray(mapState.rings) ? mapState.rings : [];
  const count = rings.length;
  const wrap = make('div', 'map-rings');
  wrap.setAttribute('data-ring-count', String(count));

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-rings-svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const current = parseInt(mapState.currentRing, 10) || 0;

  rings.forEach((ring, index) => {
    const radius = ringRadius(index, Math.max(1, count));
    const inner = index + 1 < count ? ringRadius(index + 1, count) : 0;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', radius.toFixed(2));
    circle.setAttribute('class', 'map-ring');
    circle.setAttribute('data-state', ring.state || 'empty');
    if (current === index + 1) circle.setAttribute('data-current', 'true');
    svg.appendChild(circle);

    const label = String(ring.label || '').trim();
    if (!label) return;

    // Mid-band on the meridian above centre. The chord at that height bounds
    // how wide the label may be; textLength only engages when the natural
    // width would exceed it, so short labels are never stretched.
    const bandMid = (radius + inner) / 2;
    const y = 50 - bandMid;
    const chord = 2 * Math.sqrt(Math.max(1, (radius * radius) - (bandMid * bandMid)));
    const available = Math.max(12, chord * 0.82);
    const natural = label.length * 2.2;

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '50');
    text.setAttribute('y', y.toFixed(2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('class', 'map-ring-label');
    if (natural > available) {
      text.setAttribute('textLength', available.toFixed(2));
      text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    }
    text.textContent = label;
    svg.appendChild(text);
  });

  wrap.appendChild(svg);

  const legend = make('div', 'map-rings-legend');
  legend.appendChild(make('div', 'map-rings-chip', count + (count === 1 ? ' ring' : ' rings')));
  if (current > 0 && rings[current - 1]) {
    legend.appendChild(make('div', 'map-rings-chip', 'Held to ' + (rings[current - 1].label || current)));
  }
  wrap.appendChild(legend);

  // Write-in breach boxes: the pencil half of "mark breaches". Fixed row
  // height, so the body's modelled height stays exact.
  const breaches = Math.max(0, parseInt(mapState.breachMarks, 10) || 0);
  if (breaches > 0) {
    const row = make('div', 'map-rings-breach');
    row.appendChild(make('div', 'map-rings-breach-label', 'Breaches'));
    for (let i = 0; i < breaches; i += 1) {
      row.appendChild(make('div', 'map-rings-breach-box'));
    }
    wrap.appendChild(row);
  }

  return wrap;
}

// ---------------------------------------------------------------------------
// maze — orthogonal corridor graph
// ---------------------------------------------------------------------------
/**
 * Nodes are ROLES (junction / dead-end / door / entrance / goal); passages are
 * PROGRESS (open / locked / hidden). That split is deliberate and is the
 * difference between this and point-to-point: on a network the node carries the
 * progress state, because the question is where you have been. In a labyrinth
 * the question is what you have learned about the shape, so the topology role
 * is printed and the doors are what change week over week.
 *
 * Corridors are horizontal-leg-first elbows — always, never alternating — so a
 * given maze draws the same way every render and the player can annotate a
 * printed page that will still match next week's copy.
 */
const MAZE_DENSITY_MAX_STANDARD = 8;

const MAZE_INSETS = {
  standard: { xStart: 14, xEnd: 86, yStart: 13, yEnd: 84 },
  dense:    { xStart: 10, xEnd: 90, yStart: 9,  yEnd: 88 },
};

function renderMazeMap(mapState) {
  const wrap = make('div', 'map-maze');
  const nodes = (mapState.nodes || []).map((node) => ({ ...node }));
  const tier = nodes.length <= MAZE_DENSITY_MAX_STANDARD ? 'standard' : 'dense';
  const insets = MAZE_INSETS[tier];
  wrap.setAttribute('data-maze-density', tier);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-maze-svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Same coordinate normalisation as the network: authored 1-12 coords, or any
  // other integer range, map onto the inset box by their own bounds.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.forEach((node) => {
    const nx = Number(node.x) || 0;
    const ny = Number(node.y) || 0;
    if (nx < minX) minX = nx;
    if (nx > maxX) maxX = nx;
    if (ny < minY) minY = ny;
    if (ny > maxY) maxY = ny;
  });
  if (!isFinite(minX)) { minX = 0; maxX = 1; }
  if (!isFinite(minY)) { minY = 0; maxY = 1; }
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  const byId = {};
  nodes.forEach((node) => {
    node._x = insets.xStart + (((Number(node.x) || 0) - minX) / spanX) * (insets.xEnd - insets.xStart);
    node._y = insets.yStart + (((Number(node.y) || 0) - minY) / spanY) * (insets.yEnd - insets.yStart);
    byId[node.id] = node;
  });

  (mapState.passages || []).forEach((passage) => {
    const from = byId[passage.from];
    const to = byId[passage.to];
    if (!from || !to) return;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', [
      'M', from._x.toFixed(2), from._y.toFixed(2),
      'H', to._x.toFixed(2),
      'V', to._y.toFixed(2)
    ].join(' '));
    path.setAttribute('class', 'map-corridor');
    path.setAttribute('data-state', passage.state || 'open');
    svg.appendChild(path);

    // A locked passage prints its door: a bar across the longer leg, which is
    // the mark the player crosses out when the door opens.
    if (passage.state === 'locked') {
      const horizontalLeg = Math.abs(to._x - from._x);
      const verticalLeg = Math.abs(to._y - from._y);
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      if (horizontalLeg >= verticalLeg) {
        const midX = (from._x + to._x) / 2;
        bar.setAttribute('x1', midX.toFixed(2));
        bar.setAttribute('y1', (from._y - 2.6).toFixed(2));
        bar.setAttribute('x2', midX.toFixed(2));
        bar.setAttribute('y2', (from._y + 2.6).toFixed(2));
      } else {
        const midY = (from._y + to._y) / 2;
        bar.setAttribute('x1', (to._x - 2.6).toFixed(2));
        bar.setAttribute('y1', midY.toFixed(2));
        bar.setAttribute('x2', (to._x + 2.6).toFixed(2));
        bar.setAttribute('y2', midY.toFixed(2));
      }
      bar.setAttribute('class', 'map-corridor-door');
      svg.appendChild(bar);
    }

    // The corridor's name — the PTP twin's `edge.label` made maze-native
    // (found authored-but-dropped at D151; seven labels in the tidewall
    // fixture never printed). The label rides the LONGER leg, the door bar's
    // own convention, and sits clear of the corridor so the pencil's trace
    // stays unobstructed (the write-in law): middle-anchored above a
    // horizontal leg, start/end-anchored beside a vertical one — an anchored
    // side never spills text back across the line the player draws on. Placed
    // best-effort on collision because the maze has no route-key surface to
    // carry a suppressed label (the same reasoning as PTP's !hasRouteKey arm).
    const labelText = compactRouteLabel(passage.label, tier === 'dense' ? 10 : 14);
    if (labelText) {
      const legH = Math.abs(to._x - from._x);
      const legV = Math.abs(to._y - from._y);
      const collisionR = tier === 'dense' ? 5 : 6;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      if (legH >= legV) {
        const midX = (from._x + to._x) / 2;
        let ly = from._y - 3.2;
        if (labelCollidesWithNode(midX, ly, nodes, collisionR)) ly = from._y + 3.4;
        text.setAttribute('x', midX.toFixed(2));
        text.setAttribute('y', ly.toFixed(2));
        text.setAttribute('text-anchor', 'middle');
      } else {
        const midY = (from._y + to._y) / 2;
        let lx = to._x + 2.2;
        let anchor = 'start';
        if (labelCollidesWithNode(lx, midY, nodes, collisionR)) { lx = to._x - 2.2; anchor = 'end'; }
        text.setAttribute('x', lx.toFixed(2));
        text.setAttribute('y', midY.toFixed(2));
        text.setAttribute('text-anchor', anchor);
      }
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('class', 'map-maze-passage-label');
      text.textContent = labelText;
      svg.appendChild(text);
    }
  });

  const markerR = tier === 'dense' ? 2.4 : 3;
  nodes.forEach((node) => {
    const role = node.state || 'junction';
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'map-maze-node');
    group.setAttribute('data-state', role);

    if (role === 'entrance' || role === 'goal') {
      const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      box.setAttribute('x', (node._x - markerR).toFixed(2));
      box.setAttribute('y', (node._y - markerR).toFixed(2));
      box.setAttribute('width', (markerR * 2).toFixed(2));
      box.setAttribute('height', (markerR * 2).toFixed(2));
      box.setAttribute('class', 'map-maze-marker');
      group.appendChild(box);
      if (role === 'goal') {
        const inner = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const r2 = markerR * 0.5;
        inner.setAttribute('x', (node._x - r2).toFixed(2));
        inner.setAttribute('y', (node._y - r2).toFixed(2));
        inner.setAttribute('width', (r2 * 2).toFixed(2));
        inner.setAttribute('height', (r2 * 2).toFixed(2));
        inner.setAttribute('class', 'map-maze-marker-core');
        group.appendChild(inner);
      }
    } else {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', node._x.toFixed(2));
      dot.setAttribute('cy', node._y.toFixed(2));
      dot.setAttribute('r', String(markerR));
      dot.setAttribute('class', 'map-maze-marker');
      group.appendChild(dot);
      if (role === 'dead-end') {
        // The stub cap: a bar across the dead end, the shape the player is
        // hunting. Finding one is intel, never a penalty.
        const cap = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cap.setAttribute('x1', (node._x - markerR * 1.5).toFixed(2));
        cap.setAttribute('y1', node._y.toFixed(2));
        cap.setAttribute('x2', (node._x + markerR * 1.5).toFixed(2));
        cap.setAttribute('y2', node._y.toFixed(2));
        cap.setAttribute('class', 'map-maze-cap');
        group.appendChild(cap);
      }
    }

    const label = compactNodeLabel(node.label || '', tier === 'dense' ? 10 : 14);
    if (label) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node._x.toFixed(2));
      text.setAttribute('y', (node._y + markerR + 3.4).toFixed(2));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'map-maze-label');
      text.textContent = label;
      group.appendChild(text);
    }
    svg.appendChild(group);
  });

  wrap.appendChild(svg);

  const legend = make('div', 'map-maze-legend');
  const passages = (mapState.passages || []).length;
  legend.appendChild(make('div', 'map-maze-chip', nodes.length + ' nodes'));
  legend.appendChild(make('div', 'map-maze-chip', passages + (passages === 1 ? ' passage' : ' passages')));
  const deadEnds = nodes.filter((node) => node.state === 'dead-end').length;
  if (deadEnds) legend.appendChild(make('div', 'map-maze-chip', deadEnds + ' dead ends'));
  wrap.appendChild(legend);

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

  if (mapState.mapType === 'point-to-point' || mapState.mapType === 'node-graph') {
    section.appendChild(renderPointMap(mapState));
    const routeKey = renderRouteKey(mapState);
    if (routeKey) section.appendChild(routeKey);
  } else if (mapState.mapType === 'linear-track') {
    section.appendChild(renderLinearMap(mapState));
  } else if (mapState.mapType === 'player-drawn') {
    section.appendChild(renderPlayerMap(mapState));
  } else if (mapState.mapType === 'concentric') {
    section.appendChild(renderRingsMap(mapState));
  } else if (mapState.mapType === 'maze') {
    section.appendChild(renderMazeMap(mapState));
  } else {
    section.appendChild(renderGridMap(mapState));
  }

  if (mapState.floorLabel) section.appendChild(make('div', 'map-annotation', mapState.floorLabel));
  if (mapState.mapNote) section.appendChild(make('div', 'map-note', mapState.mapNote));
  zone.appendChild(section);
  return zone;
}

/**
 * The wrapping strip of plaintext squares. Its cell count comes from
 * resolveWorkspaceCellCount() in contracts/contract-constants.mjs — shared
 * with the estimate, not mirrored (see that function's note).
 *
 * `cellCount` was in the schema and in the corpus for a full release cycle
 * without being read here: Persephone authors 11 / 16 / 6 / 6 / 4 squares for
 * its five ciphers and every one of them printed the 10-square rows x cols
 * default. A cipher whose extraction yields four characters printing ten boxes
 * is not a cosmetic miss — the writing surface is telling the player the wrong
 * answer length.
 */
function renderCellWorkspace(workSpace) {
  const grid = make('div', 'plaintext-grid');
  const size = resolveWorkspaceCellCount(workSpace);
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

/**
 * CROSS-FILE CONTRACT — the style→geometry map here is mirrored by
 * workspaceHeight() in atoms/cipher-panel.js. Both resolve the authored style
 * through resolveWorkspaceStyle() and the cells count through
 * resolveWorkspaceCellCount() (contracts/contract-constants.mjs), so an alias
 * measures as the geometry it renders as and a declared cell count is measured
 * as the strip it prints. Change the branch set in one and the estimate lies;
 * add a style and both files plus VALID_WORKSPACE_STYLES must move together.
 *
 * Unknown values fall to DEFAULT_WORKSPACE_STYLE rather than throwing: this
 * runs on hand-loaded JSON that never passed through assembly normalization,
 * and a render must always produce a usable writing surface. The generator
 * path raises a diagnostic for the same input (normalizeWorkspaceStyles);
 * silence here is the render-safety floor, not the contract.
 */
function normalizedWorkspaceStyle(workSpace) {
  return resolveWorkspaceStyle(workSpace && workSpace.style) || DEFAULT_WORKSPACE_STYLE;
}

function renderWorkspace(workSpace) {
  const style = normalizedWorkspaceStyle(workSpace);
  if (style === 'lined') return renderLinedWorkspace(workSpace);
  if (style === 'boxed-totals') return renderBoxedWorkspace(workSpace);
  if (style === 'blank') return renderBlankWorkspace(workSpace);
  return renderCellWorkspace(workSpace);
}

export function renderCipherSection(cipher) {
  const section = make('div', 'cipher-zone');
  section.setAttribute('data-cipher-type', cipher.type || '');
  section.setAttribute('data-cipher-family', cipher.family || 'none');
  // Stamp the style that was actually built, not the authored string — before
  // this resolved, an unrecognised value (including whole prose paragraphs
  // left by the 1.4 string->object migration) went into the DOM verbatim while
  // the cells grid rendered underneath it.
  section.setAttribute(
    'data-workspace-style',
    resolveWorkspaceStyle(cipher.workspaceStyle) || DEFAULT_WORKSPACE_STYLE
  );
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

// percentile-stat (schema 1.5.0). Mirrors buildPercentileStat() in
// atoms/tracker.js — the same component must print identically on both paths
// (AUDIT 112). Change one, change the other.
function renderPercentileStat(component) {
  const wrap = make('div', 'companion-percentile-stat');

  const head = make('div', 'companion-stat-head');
  head.appendChild(make('div', 'companion-stat-name', component.statName || component.title || 'Standing'));
  head.appendChild(make('div', 'companion-stat-die', 'd100 · roll under'));
  wrap.appendChild(head);

  const values = Array.isArray(component.weeklyValues) && component.weeklyValues.length
    ? component.weeklyValues
    : new Array(6).fill(null);
  const track = make('div', 'companion-stat-track');
  values.slice(0, 8).forEach((value, index) => {
    const printable = Number.isInteger(value) && value >= 1 && value <= 99;
    const box = make('div', 'companion-stat-week');
    box.setAttribute('data-week', String(index + 1));
    box.appendChild(make('div', 'companion-stat-week-label', 'WK ' + (index + 1)));
    box.appendChild(make('div', 'companion-stat-value', printable ? String(value) : ''));
    track.appendChild(box);
  });
  wrap.appendChild(track);

  const advantage = String(component.advantageRule || '').trim()
    || 'Complete every prescribed set in the session before rolling to earn one re-roll.';
  wrap.appendChild(make('div', 'companion-stat-rule',
    'Circle this week’s value, then roll the oracle d100. Roll under it and read one band above the roll. ' + advantage));

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
  } else if (component.family === 'percentile-stat') {
    card.appendChild(renderPercentileStat(component));
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
