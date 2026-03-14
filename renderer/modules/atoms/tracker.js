/**
 * tracker.js — Gameplay tracker/gauge atom
 *
 * Renders a single tracker for the RPG mechanical layer. Four types:
 * gauge (horizontal bar), clock (SVG pie segments), track (linear
 * box row), tally (simple tally area). Start values pre-fill segments
 * per the Endowed Progress principle. Thresholds mark trigger points.
 *
 * @module atoms/tracker
 */

import { registerAtom } from '../engine/atom-registry.js';
import { make } from '../dom.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SEGMENTS = 8;

/** Base heights per track type in px. */
const TYPE_HEIGHTS = {
  gauge: 80,
  clock: 120,
  track: 60,
  tally: 50,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(spacious, compressed, density) {
  return spacious + (compressed - spacious) * density;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Build a horizontal segmented gauge bar.
 */
function buildGauge(segments, startValue, thresholds) {
  const container = make('div', 'tracker-gauge');
  const bar = make('div', 'tracker-gauge-bar');

  for (let i = 0; i < segments; i++) {
    const seg = make('div', 'tracker-gauge-segment');
    if (i < startValue) seg.classList.add('tracker-filled');
    if (thresholds && thresholds.includes(i + 1)) {
      seg.classList.add('tracker-threshold');
    }
    bar.appendChild(seg);
  }

  container.appendChild(bar);
  return container;
}

/**
 * Build a circular SVG clock with pie segments.
 */
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

  // Outer circle
  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx', String(cx));
  circle.setAttribute('cy', String(cy));
  circle.setAttribute('r', String(r));
  circle.setAttribute('class', 'tracker-clock-ring');
  svg.appendChild(circle);

  // Pie segments
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

/**
 * Build a linear box track (row of boxes).
 */
function buildTrack(segments, startValue, thresholds, direction) {
  const isReverse = direction === 'drain' || direction === 'down';
  const container = make('div', 'tracker-track');
  if (isReverse) container.classList.add('tracker-track-drain');

  for (let i = 0; i < segments; i++) {
    const box = make('div', 'tracker-track-box');
    if (i < startValue) box.classList.add('tracker-filled');
    if (thresholds && thresholds.includes(i + 1)) {
      box.classList.add('tracker-threshold');
    }
    // Index label inside box for reference
    box.dataset.index = String(i + 1);
    container.appendChild(box);
  }

  return container;
}

/**
 * Build a simple tally area.
 */
function buildTally(segments, startValue) {
  const container = make('div', 'tracker-tally');
  const label = make('span', 'tracker-tally-label',
    `${startValue || 0} / ${segments}`);
  const area = make('div', 'tracker-tally-area');
  container.appendChild(label);
  container.appendChild(area);
  return container;
}

// ---------------------------------------------------------------------------
// Atom registration
// ---------------------------------------------------------------------------

registerAtom('tracker', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'either',

  estimate(data, density) {
    const type = data?.trackType || 'track';
    const baseHeight = TYPE_HEIGHTS[type] || TYPE_HEIGHTS.track;
    const labelHeight = data?.label ? 24 : 0;
    const consequenceHeight = data?.consequence ? 20 : 0;
    const total = baseHeight + labelHeight + consequenceHeight;

    return {
      minHeight: Math.round(total * 0.75),
      preferredHeight: total,
    };
  },

  render(atom, density) {
    const data = atom.data ?? {};
    const d = density ?? 0;
    const trackType = data.trackType || 'track';
    const segments = clamp(data.segments || DEFAULT_SEGMENTS, 1, 24);
    const startValue = clamp(data.startValue || 0, 0, segments);
    const thresholds = Array.isArray(data.thresholds) ? data.thresholds : [];

    const el = make('div', 'tracker-atom');
    el.dataset.trackType = trackType;

    // Label
    if (data.label) {
      el.appendChild(make('div', 'tracker-label', data.label));
    }

    // Visual representation
    let visual;
    switch (trackType) {
      case 'gauge':
        visual = buildGauge(segments, startValue, thresholds);
        break;
      case 'clock':
        visual = buildClock(segments, startValue, thresholds);
        break;
      case 'tally':
        visual = buildTally(segments, startValue);
        break;
      case 'track':
      default:
        visual = buildTrack(segments, startValue, thresholds, data.direction);
        break;
    }

    el.appendChild(visual);

    // Consequence text
    if (data.consequence) {
      const note = make('div', 'tracker-consequence', data.consequence);
      if (d > 0.6) {
        note.style.fontSize = '9px';
      }
      el.appendChild(note);
    }

    return el;
  },
});

export default 'tracker';
