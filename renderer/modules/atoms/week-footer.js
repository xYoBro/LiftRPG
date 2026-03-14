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

const FOOTER_HEIGHT = 25;

registerAtom('week-footer', {
  defaultSizeHint: 'minimal',
  canShare: true,
  pageAffinity: 'left',

  estimate() {
    return { minHeight: FOOTER_HEIGHT, preferredHeight: FOOTER_HEIGHT };
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
