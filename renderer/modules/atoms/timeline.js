/**
 * timeline.js — Linear progression/timeline atom
 *
 * Renders entries along a connecting line, either vertically (default)
 * or horizontally. Each entry has a marker, label, and optional
 * description. Density reduces spacing and can suppress descriptions.
 * Useful for narrative progression, mission logs, and event sequences.
 *
 * @module atoms/timeline
 */

import { registerAtom } from '../engine/atom-registry.js';
import { make } from '../dom.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEADING_HEIGHT = 30;
const HORIZONTAL_HEIGHT = 120;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(spacious, compressed, density) {
  return spacious + (compressed - spacious) * density;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * Build a vertical timeline.
 */
function buildVertical(entries, density) {
  const d = density ?? 0;
  const showDesc = d < 0.6;
  const container = make('div', 'timeline-vertical');

  const entryGap = lerp(12, 4, d);
  container.style.gap = `${Math.round(entryGap)}px`;

  for (const entry of entries) {
    const row = make('div', 'timeline-entry');

    // Marker dot / custom marker
    const marker = make('div', 'timeline-marker',
      entry.marker || '\u25CF'); // ● default
    row.appendChild(marker);

    // Content column
    const body = make('div', 'timeline-entry-body');
    body.appendChild(make('div', 'timeline-entry-label', entry.label || ''));

    if (entry.description && showDesc) {
      const desc = make('div', 'timeline-entry-desc', entry.description);
      const descSize = lerp(11, 9, d);
      desc.style.fontSize = `${Math.max(descSize, 9).toFixed(1)}px`;
      body.appendChild(desc);
    }

    row.appendChild(body);
    container.appendChild(row);
  }

  return container;
}

/**
 * Build a horizontal timeline.
 */
function buildHorizontal(entries, density) {
  const d = density ?? 0;
  const container = make('div', 'timeline-horizontal');

  // Track line
  const track = make('div', 'timeline-track');

  for (const entry of entries) {
    const node = make('div', 'timeline-node');

    // Marker
    const marker = make('div', 'timeline-marker',
      entry.marker || '\u25CF');
    node.appendChild(marker);

    // Label below marker
    const label = make('div', 'timeline-node-label', entry.label || '');
    if (d > 0.5) {
      const fontSize = lerp(11, 9, d);
      label.style.fontSize = `${Math.max(fontSize, 9).toFixed(1)}px`;
    }
    node.appendChild(label);

    track.appendChild(node);
  }

  container.appendChild(track);
  return container;
}

// ---------------------------------------------------------------------------
// Atom registration
// ---------------------------------------------------------------------------

registerAtom('timeline', {
  defaultSizeHint: 'half-page',
  canShare: true,
  pageAffinity: 'either',

  estimate(data, density) {
    const d = density ?? 0;
    const entries = Array.isArray(data?.entries) ? data.entries : [];
    const headingH = data?.heading ? HEADING_HEIGHT : 0;
    const direction = data?.direction || 'vertical';

    if (direction === 'horizontal') {
      return {
        minHeight: HORIZONTAL_HEIGHT,
        preferredHeight: headingH + HORIZONTAL_HEIGHT,
      };
    }

    // Vertical: per-entry height
    const entryH = lerp(60, 40, d);
    const height = headingH + entries.length * entryH;

    return {
      minHeight: Math.round(height * 0.8),
      preferredHeight: Math.round(height),
    };
  },

  render(atom, density) {
    const data = atom.data ?? {};
    const d = density ?? 0;
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const direction = data.direction || 'vertical';

    const el = make('div', 'timeline-atom');
    el.dataset.direction = direction;

    // Optional heading
    if (data.heading) {
      el.appendChild(make('h4', 'timeline-heading', data.heading));
    }

    // Build timeline
    const timeline = direction === 'horizontal'
      ? buildHorizontal(entries, d)
      : buildVertical(entries, d);

    el.appendChild(timeline);
    return el;
  },
});

export default 'timeline';
