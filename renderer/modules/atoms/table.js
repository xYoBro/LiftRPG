/**
 * table.js — Data table atom
 *
 * Renders a table with header row, data rows, and optional caption.
 * Density controls cell padding and font size. The `compact` flag
 * in data forces tighter layout regardless of density. Designed for
 * reference tables, decoding keys, and stat blocks in printed booklets.
 *
 * @module atoms/table
 */

import { registerAtom } from '../engine/atom-registry.js';
import { make } from '../dom.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEADER_ROW_HEIGHT = 32;
const CAPTION_HEIGHT = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(spacious, compressed, density) {
  return spacious + (compressed - spacious) * density;
}

// ---------------------------------------------------------------------------
// Atom registration
// ---------------------------------------------------------------------------

registerAtom('table', {
  defaultSizeHint: 'flex',
  canShare: true,
  pageAffinity: 'either',

  estimate(data, density) {
    const d = density ?? 0;
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    const isCompact = data?.compact || d > 0.6;
    const rowH = isCompact ? 22 : lerp(26, 22, d);
    const captionH = data?.caption ? CAPTION_HEIGHT : 0;
    const height = HEADER_ROW_HEIGHT + rows.length * rowH + captionH;

    return {
      minHeight: Math.round(height * 0.85),
      preferredHeight: Math.round(height),
    };
  },

  render(atom, density) {
    const data = atom.data ?? {};
    const d = density ?? 0;
    const headers = Array.isArray(data.headers) ? data.headers : [];
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const isCompact = data.compact || d > 0.6;

    const el = make('div', 'table-atom');

    // Optional caption
    if (data.caption) {
      el.appendChild(make('div', 'table-caption', data.caption));
    }

    // Table element
    const table = make('table', 'table-grid');

    // Density-driven cell padding
    const cellPad = isCompact ? 4 : lerp(8, 4, d);
    table.style.setProperty('--table-cell-padding', `${Math.round(cellPad)}px`);

    if (d > 0.4) {
      const fontSize = lerp(12, 10, d);
      table.style.fontSize = `${Math.max(fontSize, 9).toFixed(1)}px`;
    }

    // Header row
    if (headers.length > 0) {
      const thead = make('thead', 'table-head');
      const tr = make('tr', 'table-header-row');
      for (const header of headers) {
        tr.appendChild(make('th', 'table-th', header));
      }
      thead.appendChild(tr);
      table.appendChild(thead);
    }

    // Data rows
    if (rows.length > 0) {
      const tbody = make('tbody', 'table-body');
      for (const row of rows) {
        const tr = make('tr', 'table-row');
        const cells = Array.isArray(row) ? row : [];
        for (const cell of cells) {
          tr.appendChild(make('td', 'table-td', String(cell ?? '')));
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
    }

    el.appendChild(table);
    return el;
  },
});

export default 'table';
