/**
 * week-header.js — Week page furniture (header block)
 *
 * Renders the week kicker label, title, and optional epigraph
 * above the session cards on the left workout page.
 *
 * Data shape: { weekIndex, weekMeta, totalWeeks, bookletTitle, isFirstChunk }
 */

import { registerAtom } from '../engine/atom-registry.js';
import { make } from '../dom.js';
import { pad2 } from '../utils.js';

const KICKER_HEIGHT = 15;
const TITLE_HEIGHT = 22;
const EPIGRAPH_HEIGHT = 18;
const MARGIN = 8;

registerAtom('week-header', {
  defaultSizeHint: 'minimal',
  canShare: true,
  pageAffinity: 'left',

  estimate(data) {
    let height = KICKER_HEIGHT + TITLE_HEIGHT + MARGIN;
    const week = data.weekMeta || {};
    if (week.epigraph && data.isFirstChunk !== false) {
      height += EPIGRAPH_HEIGHT;
    }
    return { minHeight: height, preferredHeight: height };
  },

  render(atom) {
    const data = atom.data || {};
    const week = data.weekMeta || {};
    const weekNum = week.weekNumber || (data.weekIndex + 1);

    const wrap = make('div', 'week-furniture-header');

    // Week kicker — monospace label
    const kickerText = 'Week ' + pad2(weekNum) + ' \u00B7';
    wrap.appendChild(make('div', 'week-kicker', kickerText));

    // Week title
    wrap.appendChild(make('h2', 'week-title', week.title || 'Training Record'));

    // Epigraph (only on first chunk of a multi-part week)
    if (week.epigraph && data.isFirstChunk !== false) {
      const epigraph = week.epigraph;
      if (epigraph.attribution) {
        wrap.appendChild(make('div', 'week-subtitle', epigraph.attribution));
      }
      if (epigraph.text) {
        wrap.appendChild(make('div', 'week-meta', epigraph.text));
      }
    }

    return wrap;
  },
});

export default 'week-header';
