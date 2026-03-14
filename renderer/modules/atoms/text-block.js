/**
 * text-block.js — Prose paragraph atom
 *
 * Renders text content as paragraphs, or sanitized HTML when the
 * format field requests it. Density controls line-height and
 * paragraph spacing. Designed to share pages with other atoms.
 *
 * @module atoms/text-block
 */

import { registerAtom } from '../engine/atom-registry.js';
import { make } from '../dom.js';
import { sanitizeHtml } from '../utils.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Approximate characters per line at standard page width. */
const CHARS_PER_LINE = 60;

/** Height per line in px at density 0. */
const LINE_HEIGHT_PX = 22;

/** Heading height in px. */
const HEADING_HEIGHT = 30;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Interpolate a value between spacious (density 0) and compressed (density 1).
 * @param {number} spacious — value at density 0
 * @param {number} compressed — value at density 1
 * @param {number} density — 0.0 to 1.0
 * @returns {number}
 */
function lerp(spacious, compressed, density) {
  return spacious + (compressed - spacious) * density;
}

/**
 * Estimate line count from content string length.
 * @param {string} content
 * @returns {number}
 */
function estimateLines(content) {
  if (!content) return 0;
  return Math.ceil(content.length / CHARS_PER_LINE);
}

// ---------------------------------------------------------------------------
// Atom registration
// ---------------------------------------------------------------------------

registerAtom('text-block', {
  defaultSizeHint: 'flex',
  canShare: true,
  pageAffinity: 'either',

  estimate(data, density) {
    const d = density ?? 0;
    const lines = estimateLines(data?.content);
    const lineH = lerp(LINE_HEIGHT_PX, 17, d);
    const headingH = data?.heading ? HEADING_HEIGHT : 0;
    const height = headingH + Math.max(lines, 1) * lineH;

    return {
      minHeight: Math.round(height * 0.8),
      preferredHeight: Math.round(height),
    };
  },

  render(atom, density) {
    const data = atom.data ?? {};
    const d = density ?? 0;
    const content = data.content || '';
    const format = data.format || 'text';

    const el = make('div', 'text-block-atom');

    // Density-driven styles
    const lineHeight = lerp(1.5, 1.2, d);
    const paragraphMargin = lerp(1, 0.3, d);
    el.style.lineHeight = lineHeight.toFixed(2);

    // Optional heading
    if (data.heading) {
      el.appendChild(make('h3', 'text-block-heading', data.heading));
    }

    // Content
    if (format === 'html') {
      // WARNING: content is sanitized but originates from LLM output.
      // sanitizeHtml strips dangerous tags, handlers, and data: URIs.
      const wrapper = make('div', 'text-block-html');
      wrapper.innerHTML = sanitizeHtml(content);
      wrapper.style.setProperty('--tb-paragraph-margin', `${paragraphMargin.toFixed(2)}em`);
      el.appendChild(wrapper);
    } else {
      const paragraphs = content.split(/\n\n+/).filter(Boolean);
      for (const text of paragraphs) {
        const p = make('p', 'text-block-paragraph', text);
        p.style.marginBottom = `${paragraphMargin.toFixed(2)}em`;
        el.appendChild(p);
      }
    }

    return el;
  },
});

export default 'text-block';
