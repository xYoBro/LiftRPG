/**
 * divider.js — Decorative separator atom
 *
 * Renders a visual break between content sections. Four styles:
 * rule (thin line), ornament (centered decorative mark), whitespace
 * (empty gap), dots (centered dot row). Height is fixed regardless
 * of density — dividers are structural, not content-scaled.
 *
 * @module atoms/divider
 */

import { registerAtom } from '../engine/atom-registry.js';
import { make } from '../dom.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_STYLES = new Set(['rule', 'ornament', 'whitespace', 'dots']);

/** Fixed heights per divider style in px. */
const STYLE_HEIGHTS = {
  rule: 8,
  ornament: 20,
  whitespace: 24,
  dots: 12,
};

/** Ornament characters — chosen for broad font support and print clarity. */
const ORNAMENT_CHAR = '\u2726'; // ✦
const DOT_PATTERN = '\u00B7  \u00B7  \u00B7'; // · · ·

// ---------------------------------------------------------------------------
// Atom registration
// ---------------------------------------------------------------------------

registerAtom('divider', {
  defaultSizeHint: 'minimal',
  canShare: true,
  pageAffinity: 'either',

  estimate(data, _density) {
    const style = VALID_STYLES.has(data?.style) ? data.style : 'rule';
    const height = STYLE_HEIGHTS[style];
    return { minHeight: height, preferredHeight: height };
  },

  render(atom, _density) {
    const data = atom.data ?? {};
    const style = VALID_STYLES.has(data.style) ? data.style : 'rule';

    const el = make('div', 'divider-atom');
    el.dataset.style = style;

    switch (style) {
      case 'rule': {
        const rule = make('hr', 'divider-rule');
        if (data.thickness) {
          const t = Math.min(Math.max(data.thickness, 1), 4);
          rule.style.borderTopWidth = `${t}px`;
        }
        el.appendChild(rule);
        break;
      }

      case 'ornament': {
        el.appendChild(make('span', 'divider-ornament', ORNAMENT_CHAR));
        break;
      }

      case 'whitespace': {
        const spacer = make('div', 'divider-whitespace');
        spacer.style.height = `${STYLE_HEIGHTS.whitespace}px`;
        el.appendChild(spacer);
        break;
      }

      case 'dots': {
        el.appendChild(make('span', 'divider-dots', DOT_PATTERN));
        break;
      }
    }

    return el;
  },
});

export default 'divider';
