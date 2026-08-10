/**
 * week-footer.js — Week page furniture (progress dots footer)
 *
 * Renders the progress dots and "Week N of M" label at the bottom
 * of the left workout page.
 *
 * Data shape: { weekIndex, totalWeeks }
 */

import { registerAtom } from '../engine/atom-registry.js';
import { make } from '../dom.js';

/**
 * MEASURED (2026-08-10, D79): `.week-progress` renders 15.52px, 17.52px or
 * 19.52px depending on the page's `data-card-count` and `data-page-compaction`
 * (the two ladders only move its `padding-top`: 8 → 6 → 4). The dots row and
 * the label are fixed-size, so the block never wraps and never depends on
 * `totalWeeks`. 20 is the ceiling plus a rounding allowance; the old 25 was a
 * 5–9px fiction on every workout page.
 *
 * CROSS-FILE CONTRACT: `booklet.css` `.week-progress` and its
 * `[data-card-count="3"]` / `[data-page-compaction="4|5"]` overrides. Exported
 * because the adapter's session chunker charges the same number for the footer
 * on a week's last chunk.
 */
export const WEEK_FOOTER_HEIGHT_PX = 20;

registerAtom('week-footer', {
  defaultSizeHint: 'minimal',
  canShare: true,
  canSplitAway: false,
  pageAffinity: 'left',

  estimate() {
    return { minHeight: WEEK_FOOTER_HEIGHT_PX, preferredHeight: WEEK_FOOTER_HEIGHT_PX };
  },

  render(atom) {
    const data = atom.data || {};
    const totalWeeks = data.totalWeeks || 0;
    const weekNum = (data.weekIndex || 0) + 1;

    const footer = make('footer', 'week-progress');

    if (totalWeeks > 0) {
      const dots = make('div', 'week-progress-dots');
      for (let i = 0; i < totalWeeks; i++) {
        const dot = make('span', 'week-progress-dot');
        if ((i + 1) === weekNum) dot.setAttribute('data-state', 'active');
        dots.appendChild(dot);
      }
      footer.appendChild(dots);
      footer.appendChild(make('div', 'week-progress-label', 'Week ' + weekNum + ' of ' + totalWeeks));
    }

    return footer;
  },
});

export default 'week-footer';
