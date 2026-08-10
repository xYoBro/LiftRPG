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
import { pad2, countWrappedLines } from '../utils.js';

/**
 * MEASURED GEOMETRY (2026-08-10, D79).
 *
 * CROSS-FILE CONTRACT: `booklet.css` `.week-kicker` / `.week-title` /
 * `.week-subtitle` / `.week-meta`, and `render()` below, which decides which
 * of them exist. `.week-furniture-header` is a plain block with no padding,
 * border or gap of its own, and it is a flex item of `.page-frame`, so its
 * height is exactly the sum of its children's boxes INCLUDING their bottom
 * margins (no margin collapses through).
 *
 * The old model was four flat constants summing to 45px (63 with an epigraph)
 * against a measured 79.6–141.1px — it under-estimated every one of the 47
 * week headers in the corpus, several by more than 70px. It could not do
 * better: the title and the epigraph WRAP, and a constant cannot see that.
 *
 * `*_LINE` values are the worst-case computed line-height across the corpus's
 * archetypes; `*_MARGIN` is the element's margin-bottom, exact; `*_CHARS` is a
 * wrap fit (see countWrappedLines). Result: 1.07x measured at the median,
 * 1.23x worst, zero under-estimates over all 47 headers.
 *
 * This estimate is also what the adapter's session chunker charges for the
 * week header, via `estimateWeekHeaderHeight()` — one model, two callers.
 */
const KICKER_HEIGHT = 16.8;   // `.week-kicker` 8px, line-height 12.8, margin-bottom 4
const TITLE_LINE = 23.47;     // `.week-title` line-height (22.00–23.47 by archetype)
const TITLE_MARGIN = 3;
const TITLE_CHARS = 44;       // fit; 45 chars is the first string that wraps
const SUBTITLE_LINE = 16.0;   // `.week-subtitle` (epigraph text), 15.00–16.00 by archetype
const SUBTITLE_MARGIN = 2;
const SUBTITLE_CHARS = 80;    // fit ≤81
const META_LINE = 12.8;       // `.week-meta` (epigraph attribution)
const META_MARGIN = 8;
const META_CHARS = 85;        // fit ≤86

const DEFAULT_WEEK_TITLE = 'Training Record';

/**
 * Height of the week header furniture block, in px.
 *
 * Density-invariant: no `[data-density-variant]` or `[data-page-compaction]`
 * rule touches any of these elements, and the corpus measurement confirms a
 * single height per header across all 22 sampled densities.
 *
 * @param {object} weekMeta — the week object (title, epigraph)
 * @param {boolean} [isFirstChunk] — false suppresses the epigraph, mirroring render()
 * @returns {number} px
 */
export function estimateWeekHeaderHeight(weekMeta, isFirstChunk) {
  const week = weekMeta || {};
  const title = String(week.title || DEFAULT_WEEK_TITLE);

  let height = KICKER_HEIGHT
    + countWrappedLines(title, TITLE_CHARS) * TITLE_LINE + TITLE_MARGIN;

  const epigraph = week.epigraph;
  if (epigraph && isFirstChunk !== false) {
    if (epigraph.text) {
      height += countWrappedLines(epigraph.text, SUBTITLE_CHARS) * SUBTITLE_LINE + SUBTITLE_MARGIN;
    }
    if (epigraph.attribution) {
      height += countWrappedLines(epigraph.attribution, META_CHARS) * META_LINE + META_MARGIN;
    }
  }

  return height;
}

registerAtom('week-header', {
  defaultSizeHint: 'minimal',
  canShare: true,
  pageAffinity: 'left',

  estimate(data) {
    const height = estimateWeekHeaderHeight(data.weekMeta, data.isFirstChunk);
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
      // Quote text in the italic subtitle slot, attribution in the small
      // mono meta slot (these were swapped — AUDIT finding 117).
      if (epigraph.text) {
        wrap.appendChild(make('div', 'week-subtitle', epigraph.text));
      }
      if (epigraph.attribution) {
        wrap.appendChild(make('div', 'week-meta', epigraph.attribution));
      }
    }

    return wrap;
  },
});

export default 'week-header';
