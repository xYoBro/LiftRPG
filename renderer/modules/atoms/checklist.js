/**
 * checklist.js — Printable checkbox list atom
 *
 * Renders rows of empty checkbox squares designed to be filled in
 * with a pencil. Each item has a label and optional description.
 * Density reduces row spacing and can hide descriptions at high
 * compression levels.
 *
 * @module atoms/checklist
 */

import { registerAtom } from '../engine/atom-registry.js';
import { make } from '../dom.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEADING_HEIGHT = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(spacious, compressed, density) {
  return spacious + (compressed - spacious) * density;
}

// ---------------------------------------------------------------------------
// Atom registration
// ---------------------------------------------------------------------------

registerAtom('checklist', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'either',

  estimate(data, density) {
    const d = density ?? 0;
    const items = Array.isArray(data?.items) ? data.items : [];
    const headingH = data?.heading ? HEADING_HEIGHT : 0;
    const rowH = lerp(28, 22, d);
    // Descriptions add height at low density
    const descH = d < 0.7
      ? items.filter(i => i.description).length * lerp(18, 10, d)
      : 0;
    const height = headingH + items.length * rowH + descH;

    return {
      minHeight: Math.round(height * 0.85),
      preferredHeight: Math.round(height),
    };
  },

  render(atom, density) {
    const data = atom.data ?? {};
    const d = density ?? 0;
    const items = Array.isArray(data.items) ? data.items : [];
    const showDescriptions = d < 0.7;

    const el = make('div', 'checklist-atom');

    // Optional heading
    if (data.heading) {
      el.appendChild(make('h4', 'checklist-heading', data.heading));
    }

    // Item list
    const list = make('div', 'checklist-list');
    const rowGap = lerp(8, 3, d);
    list.style.gap = `${Math.round(rowGap)}px`;

    for (const item of items) {
      const row = make('div', 'checklist-row');

      // Checkbox square
      const box = make('span', 'checklist-box');
      if (item.checked) box.classList.add('checklist-box-filled');
      row.appendChild(box);

      // Label
      const label = make('span', 'checklist-label', item.label || '');
      row.appendChild(label);

      list.appendChild(row);

      // Optional description (hidden at high density)
      if (item.description && showDescriptions) {
        const desc = make('div', 'checklist-description', item.description);
        const descSize = lerp(11, 9, d);
        desc.style.fontSize = `${Math.max(descSize, 9).toFixed(1)}px`;
        list.appendChild(desc);
      }
    }

    el.appendChild(list);
    return el;
  },
});

export default 'checklist';
