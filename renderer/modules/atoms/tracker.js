/**
 * tracker.js — Gameplay tracker/gauge atom
 *
 * Renders companion components and game trackers for the RPG mechanical layer.
 *
 * Companion types (memory-slots, dashboard, stress-track, inventory-grid,
 * return-box, usage-die) render using .companion-component markup that
 * matches the booklet.css companion section.
 *
 * Generic types (gauge, clock, track, tally) render as simple .tracker-atom
 * elements for when a tracker is not a companion component.
 *
 * @module atoms/tracker
 */

import { registerAtom } from '../engine/atom-registry.js';
import { make } from '../dom.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SEGMENTS = 8;

const COMPANION_TYPES = new Set([
  'memory-slots', 'dashboard', 'stress-track',
  'inventory-grid', 'return-box', 'usage-die', 'token-sheet', 'overlay-window',
]);

/** Base heights per generic track type in px. */
const TYPE_HEIGHTS = {
  gauge: 80,
  clock: 120,
  track: 60,
  tally: 50,
};

/**
 * Height estimators for companion types. Each fn receives (slots) → px.
 */
const COMPANION_HEIGHTS = {
  'memory-slots':   (slots) => 30 + Math.max(1, slots) * 36,
  'dashboard':      (slots, data) => {
    if (data && data.instruction) {
      const grid = parseBoxGridFromInstruction(data.instruction);
      if (grid) return 20 + grid.rows * 36;
    }
    return 28 + Math.max(1, slots) * 26;
  },
  'stress-track':   ()      => 60,
  'inventory-grid': (slots) => 28 + Math.ceil(Math.max(1, slots) / 2) * 30,
  'return-box':     ()      => 80,
  'usage-die':      ()      => 60,
  'token-sheet':    ()      => 120,
  'overlay-window': ()      => 160,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function splitSentences(text) {
  return String(text || '')
    .match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [];
}

function extractThresholdNotes(text) {
  return splitSentences(text).filter((sentence) => /^at\s+\d+/i.test(sentence)).slice(0, 3);
}

function buildDossierLines(count) {
  const container = make('div', 'companion-dossier-lines');
  for (let index = 0; index < count; index += 1) {
    container.appendChild(make('div', 'companion-dossier-line'));
  }
  return container;
}

// ---------------------------------------------------------------------------
// Generic visual builders (gauge, clock, track, tally)
// ---------------------------------------------------------------------------

function buildGauge(segments, startValue, thresholds) {
  const container = make('div', 'tracker-gauge');
  const bar = make('div', 'tracker-gauge-bar');
  for (let i = 0; i < segments; i++) {
    const seg = make('div', 'tracker-gauge-segment');
    if (i < startValue) seg.classList.add('tracker-filled');
    if (thresholds && thresholds.includes(i + 1)) seg.classList.add('tracker-threshold');
    bar.appendChild(seg);
  }
  container.appendChild(bar);
  return container;
}

function buildClock(segments, startValue, thresholds) {
  const container = make('div', 'tracker-clock');
  const size = 80;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) - 4;
  const ns = 'http://www.w3.org/2000/svg';

  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', 'tracker-clock-svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));

  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx', String(cx));
  circle.setAttribute('cy', String(cy));
  circle.setAttribute('r', String(r));
  circle.setAttribute('class', 'tracker-clock-ring');
  svg.appendChild(circle);

  const angleStep = (2 * Math.PI) / segments;
  for (let i = 0; i < segments; i++) {
    const startAngle = i * angleStep - Math.PI / 2;
    const endAngle = startAngle + angleStep;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angleStep > Math.PI ? 1 : 0;

    const path = document.createElementNS(ns, 'path');
    const d = [
      `M ${cx} ${cy}`,
      `L ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      'Z',
    ].join(' ');
    path.setAttribute('d', d);
    let cls = 'tracker-clock-segment';
    if (i < startValue) cls += ' tracker-filled';
    if (thresholds && thresholds.includes(i + 1)) cls += ' tracker-threshold';
    path.setAttribute('class', cls);
    svg.appendChild(path);

    // Dividing line
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', String(cx));
    line.setAttribute('y1', String(cy));
    line.setAttribute('x2', x1.toFixed(2));
    line.setAttribute('y2', y1.toFixed(2));
    line.setAttribute('class', 'tracker-clock-divider');
    svg.appendChild(line);
  }

  container.appendChild(svg);
  return container;
}

function buildTrack(segments, startValue, thresholds, direction) {
  const isReverse = direction === 'drain' || direction === 'down';
  const container = make('div', 'tracker-track');
  if (isReverse) container.classList.add('tracker-track-drain');
  for (let i = 0; i < segments; i++) {
    const box = make('div', 'tracker-track-box');
    if (i < startValue) box.classList.add('tracker-filled');
    if (thresholds && thresholds.includes(i + 1)) box.classList.add('tracker-threshold');
    box.dataset.index = String(i + 1);
    container.appendChild(box);
  }
  return container;
}

function buildTally(segments, startValue) {
  const container = make('div', 'tracker-tally');
  const label = make('span', 'tracker-tally-label', `${startValue || 0} / ${segments}`);
  const area = make('div', 'tracker-tally-area');
  container.appendChild(label);
  container.appendChild(area);
  return container;
}

// ---------------------------------------------------------------------------
// Companion-specific visual builders
// ---------------------------------------------------------------------------

/**
 * memory-slots: labeled writing slots with ruled lines.
 */
function buildMemorySlots(data) {
  const slots = clamp(data.slots || 5, 1, 10);
  const container = make('div', 'companion-memory-slots');
  for (let i = 0; i < slots; i++) {
    const slot = make('div', 'companion-memory-slot');
    const lbl = make('div', 'companion-slot-label', String(i + 1).padStart(2, '0'));
    const lines = make('div', 'companion-memory-lines');
    lines.appendChild(make('div', 'companion-memory-line'));
    lines.appendChild(make('div', 'companion-memory-line'));
    slot.appendChild(lbl);
    slot.appendChild(lines);
    container.appendChild(slot);
  }
  return container;
}

/**
 * Parse instruction text for box grid patterns like
 * "Two rows of four boxes each" or "3 rows of 5 boxes".
 * Returns { rows, cols } or null if no pattern found.
 */
function parseBoxGridFromInstruction(instruction) {
  if (!instruction) return null;
  const WORD_NUMS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
  const pattern = /(\w+)\s+rows?\s+(?:of\s+)?(\w+)\s+box(?:es)?/i;
  const match = instruction.match(pattern);
  if (!match) return null;
  const rows = WORD_NUMS[match[1].toLowerCase()] || parseInt(match[1], 10);
  const cols = WORD_NUMS[match[2].toLowerCase()] || parseInt(match[2], 10);
  if (!rows || !cols || rows > 8 || cols > 8) return null;
  return { rows, cols };
}

/**
 * dashboard: box grid if instruction describes one, otherwise ruled dash-lines.
 */
function buildDashboard(data) {
  const grid = parseBoxGridFromInstruction(data.instruction);

  if (grid) {
    const container = make('div', 'companion-dashboard companion-dashboard-grid');
    for (let r = 0; r < grid.rows; r++) {
      const row = make('div', 'companion-dashboard-row');
      for (let c = 0; c < grid.cols; c++) {
        row.appendChild(make('div', 'companion-dashboard-box'));
      }
      container.appendChild(row);
    }
    return container;
  }

  const lineCount = clamp(data.slots || 5, 1, 10);
  const container = make('div', 'companion-dashboard');
  for (let i = 0; i < lineCount; i++) {
    container.appendChild(make('div', 'companion-dash-line'));
  }
  return container;
}

/**
 * stress-track: row of fillable boxes (escalating pressure track).
 */
function buildStressTrack(data) {
  const segments = clamp(data.segments || data.slots || 8, 1, 16);
  const startValue = clamp(data.startValue || 0, 0, segments);
  const shellFamily = ((data.artifactIdentity || {}).shellFamily || '').toLowerCase();
  const thresholdNotes = extractThresholdNotes(data.instruction || data.body || '');

  if (shellFamily === 'classified-packet') {
    const board = make('div', 'companion-track companion-track-dossier');
    const boxes = make('div', 'companion-track-boxes companion-track-boxes-large');
    for (let i = 0; i < segments; i += 1) {
      const box = make('div', 'companion-track-box companion-track-box-large');
      box.dataset.index = String(i + 1);
      if (i < startValue) box.dataset.filled = 'true';
      box.appendChild(make('div', 'companion-track-index', String(i + 1).padStart(2, '0')));
      box.appendChild(make('div', 'companion-track-mark'));
      boxes.appendChild(box);
    }
    board.appendChild(boxes);

    if (thresholdNotes.length) {
      const noteList = make('div', 'companion-threshold-list');
      thresholdNotes.forEach((note) => {
        noteList.appendChild(make('div', 'companion-threshold-note', note));
      });
      board.appendChild(noteList);
    }
    board.appendChild(buildDossierLines(thresholdNotes.length ? 4 : 5));

    return board;
  }

  const track = make('div', 'companion-track');
  const boxes = make('div', 'companion-track-boxes');
  for (let i = 0; i < segments; i++) {
    const box = make('div', 'companion-track-box');
    if (i < startValue) box.dataset.filled = 'true';
    boxes.appendChild(box);
  }
  track.appendChild(boxes);
  return track;
}

/**
 * inventory-grid: 2-column grid of labeled slots.
 */
function buildInventoryGrid(data) {
  const slots = clamp(data.slots || 4, 1, 12);
  const grid = make('div', 'companion-inventory-grid');
  for (let i = 0; i < slots; i++) {
    const slot = make('div', 'companion-inventory-slot');
    const box = make('div', 'companion-slot-box');
    const lbl = make('div', 'companion-slot-label', String(i + 1).padStart(2, '0'));
    slot.appendChild(box);
    slot.appendChild(lbl);
    grid.appendChild(slot);
  }
  return grid;
}

/**
 * return-box: small deposit box for a clue or card value.
 */
function buildReturnBox() {
  const box = make('div', 'companion-return-box');
  box.appendChild(make('div', 'companion-return-slot'));
  return box;
}

/**
 * usage-die: legacy depletion tracker, rendered as d100 readiness bands.
 */
function buildUsageDie() {
  const steps = ['100', '80', '60', '40', '20', '00'];
  const container = make('div', 'companion-usage-die');
  steps.forEach((step, i) => {
    const el = make('div', 'companion-usage-step', step);
    if (i === 0) el.dataset.active = 'true';
    container.appendChild(el);
  });
  return container;
}

function buildTokenSheet(data) {
  const shellFamily = ((data.artifactIdentity || {}).shellFamily || '').toLowerCase();
  const rows = Number.isFinite(data.rows) && data.rows > 0 ? data.rows : 0;
  const cols = Number.isFinite(data.cols) && data.cols > 0 ? data.cols : 0;
  const total = Math.max(4, (rows && cols) ? rows * cols : 0, data.slots || data.maxValue || 0);
  const currentValue = clamp(data.currentValue || data.startValue || 0, 0, total);
  const bodySentences = splitSentences(data.body || data.instruction || '').slice(0, 5);

  if (shellFamily === 'classified-packet' && total <= 6) {
    const ladder = make('div', 'companion-level-ladder');
    for (let index = 0; index < total; index += 1) {
      const card = make('div', 'companion-level-card');
      if (index < currentValue) card.dataset.active = 'true';
      card.appendChild(make('div', 'companion-level-kicker', 'Access Tier'));
      card.appendChild(make('div', 'companion-level-label', 'Level ' + String(index + 1).padStart(2, '0')));
      card.appendChild(make('div', 'companion-level-status', index < currentValue ? 'Current / cleared' : 'Locked'));
      ladder.appendChild(card);
    }

    if (!data.body && bodySentences.length) {
      const annotations = make('div', 'companion-level-notes');
      bodySentences.forEach((sentence) => {
        annotations.appendChild(make('div', 'companion-threshold-note', sentence));
      });
      ladder.appendChild(annotations);
    }

    return ladder;
  }

  const grid = make('div', 'companion-token-sheet');
  for (let i = 0; i < total; i += 1) {
    const item = make('div', 'companion-token');
    item.appendChild(make('div', 'companion-token-label', 'TOKEN ' + String(i + 1).padStart(2, '0')));
    grid.appendChild(item);
  }
  return grid;
}

function buildOverlayWindow(data) {
  const overlay = make('div', 'companion-overlay');
  const windows = Math.max(3, data.slots || 0);
  for (let i = 0; i < windows; i += 1) {
    const pane = make('div', 'companion-overlay-window');
    pane.appendChild(make('div', 'companion-overlay-label', 'WINDOW ' + String(i + 1).padStart(2, '0')));
    overlay.appendChild(pane);
  }
  return overlay;
}

// ---------------------------------------------------------------------------
// Companion component wrapper
// ---------------------------------------------------------------------------

function renderCompanionComponent(data) {
  const type = data.trackType || 'dashboard';
  const el = make('div', 'companion-component');
  const artifactIdentity = data.artifactIdentity || {};

  el.setAttribute('data-shell-family', artifactIdentity.shellFamily || 'field-survey');
  el.setAttribute('data-board-state-mode', artifactIdentity.boardStateMode || 'survey-grid');
  el.setAttribute('data-component-type', type);

  if (data.label) {
    el.appendChild(make('div', 'companion-title', data.label));
  }
  if (data.body) {
    el.appendChild(make('div', 'companion-body', data.body));
  }
  if (data.instruction && data.instruction !== data.body) {
    el.appendChild(make('div', 'companion-reminder', data.instruction));
  }

  let visual;
  switch (type) {
    case 'memory-slots':   visual = buildMemorySlots(data);   break;
    case 'dashboard':      visual = buildDashboard(data);     break;
    case 'stress-track':   visual = buildStressTrack(data);   break;
    case 'inventory-grid': visual = buildInventoryGrid(data); break;
    case 'return-box':     visual = buildReturnBox();          break;
    case 'usage-die':      visual = buildUsageDie();           break;
    case 'token-sheet':    visual = buildTokenSheet(data);     break;
    case 'overlay-window': visual = buildOverlayWindow(data);  break;
    default:               visual = buildDashboard(data);      break;
  }

  el.appendChild(visual);
  return el;
}

// ---------------------------------------------------------------------------
// Atom registration
// ---------------------------------------------------------------------------

registerAtom('tracker', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'either',

  estimate(data, _density) {
    const type = data?.trackType || 'track';

    if (COMPANION_TYPES.has(type)) {
      const slots = data?.slots || 5;
      const heightFn = COMPANION_HEIGHTS[type];
      const baseHeight = heightFn ? heightFn(slots, data) : 100;
      const instructionHeight = data?.instruction ? 20 : 0;
      const total = baseHeight + instructionHeight;
      // Companion render ignores density — report honest zero shrink
      // potential so the density solver doesn't waste revision passes
      // on adjustments that have no effect. It will go straight to
      // Strategy 3 (split) when overflow is detected.
      return {
        minHeight: total,
        preferredHeight: total,
      };
    }

    const baseHeight = TYPE_HEIGHTS[type] || TYPE_HEIGHTS.track;
    const labelHeight = data?.label ? 24 : 0;
    const consequenceHeight = data?.consequence ? 20 : 0;
    const total = baseHeight + labelHeight + consequenceHeight;
    // Generic tracker render only responds to density marginally
    // (consequence font size at d>0.6). Report minimal shrink (~5%)
    // rather than the previous 25% which overpromised.
    return {
      minHeight: Math.round(total * 0.95),
      preferredHeight: total,
    };
  },

  render(atom, density) {
    const data = atom.data ?? {};
    const d = density ?? 0;
    const trackType = data.trackType || 'track';

    // Companion-specific rendering using .companion-* CSS classes
    if (COMPANION_TYPES.has(trackType)) {
      return renderCompanionComponent(data);
    }

    // Generic rendering (gauge, clock, track, tally)
    const segments = clamp(data.segments || DEFAULT_SEGMENTS, 1, 24);
    const startValue = clamp(data.startValue || 0, 0, segments);
    const thresholds = Array.isArray(data.thresholds) ? data.thresholds : [];

    const el = make('div', 'tracker-atom');
    el.dataset.trackType = trackType;

    if (data.label) {
      el.appendChild(make('div', 'tracker-label', data.label));
    }

    let visual;
    switch (trackType) {
      case 'gauge': visual = buildGauge(segments, startValue, thresholds); break;
      case 'clock': visual = buildClock(segments, startValue, thresholds); break;
      case 'tally': visual = buildTally(segments, startValue); break;
      case 'track':
      default:      visual = buildTrack(segments, startValue, thresholds, data.direction); break;
    }

    el.appendChild(visual);

    if (data.consequence) {
      const note = make('div', 'tracker-consequence', data.consequence);
      if (d > 0.6) note.style.fontSize = '9px';
      el.appendChild(note);
    }

    return el;
  },
});

export default 'tracker';
