/**
 * callout-box.js — Inset callout/sidebar atom
 *
 * Renders a visually distinct box for tips, warnings, flavor text,
 * or sidebar content. Style variant determines border and background
 * treatment (applied via CSS class + data attribute). Density reduces
 * padding and font size.
 *
 * @module atoms/callout-box
 */

import { registerAtom } from '../engine/atom-registry.js';
import { make } from '../dom.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHARS_PER_LINE = 55; // Narrower than text-block due to padding
const LINE_HEIGHT_PX = 22;
const HEADING_HEIGHT = 30;
const VALID_STYLES = new Set(['tip', 'warning', 'flavor', 'sidebar']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(spacious, compressed, density) {
  return spacious + (compressed - spacious) * density;
}

function estimateLines(content) {
  if (!content) return 0;
  return Math.ceil(content.length / CHARS_PER_LINE);
}

// ---------------------------------------------------------------------------
// Atom registration
// ---------------------------------------------------------------------------

registerAtom('callout-box', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'either',

  estimate(data, density) {
    const d = density ?? 0;
    const lines = estimateLines(data?.content);
    const lineH = lerp(LINE_HEIGHT_PX, 17, d);
    const headingH = data?.heading ? HEADING_HEIGHT : 0;
    const padding = lerp(24, 12, d);
    const height = headingH + Math.max(lines, 1) * lineH + padding;

    return {
      minHeight: Math.round(height * 0.8),
      preferredHeight: Math.round(height),
    };
  },

  render(atom, density) {
    const data = atom.data ?? {};
    const d = density ?? 0;
    const style = VALID_STYLES.has(data.style) ? data.style : 'sidebar';
    const content = data.content || '';

    const el = make('div', 'callout-box-atom');
    el.dataset.style = style;

    // Density-driven padding
    const padding = lerp(16, 8, d);
    const lineHeight = lerp(1.5, 1.2, d);
    const fontSize = lerp(12, 10, d);
    el.style.padding = `${Math.round(padding)}px`;
    el.style.lineHeight = lineHeight.toFixed(2);
    if (d > 0.5) {
      el.style.fontSize = `${Math.max(fontSize, 9).toFixed(1)}px`;
    }

    // Optional heading
    if (data.heading) {
      el.appendChild(make('h4', 'callout-box-heading', data.heading));
    }

    // Content paragraphs
    const paragraphs = content.split(/\n\n+/).filter(Boolean);
    const pMargin = lerp(0.8, 0.25, d);

    for (const text of paragraphs) {
      const p = make('p', 'callout-box-text', text);
      p.style.marginBottom = `${pMargin.toFixed(2)}em`;
      el.appendChild(p);
    }

    return el;
  },
});

export default 'callout-box';
