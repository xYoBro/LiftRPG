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
 * THE DOOR — the weekly decision with its bias posted (schema 1.5.0
 * `week.doorChoice`, salvage seed 3).
 *
 * WHY IT IS SEATED HERE, stated because the alternative was live. The other
 * candidate was the reckoning panel's neighbourhood on the facing field-ops
 * page, and it loses on two counts. First, dormancy coupling: `doorChoice` and
 * `week.reckoning` are independent optional fields, so a door hung off the
 * reckoning atom would vanish from every book that posts doors without running
 * a mark economy. Second, the week header is the only surface emitted once per
 * week unconditionally, and it is where the week is FRAMED — a route is chosen
 * when the week opens, not when it is totted up.
 *
 * The load-state doctrine is satisfied by position rather than by page: this
 * block sits above the session cards, in the week-open moment. It is a
 * BETWEEN-state read (decide, mark, then work), never a mid-set one — nothing
 * on it is consulted during a set, and once the box is ticked it is answered.
 *
 * THE SEAT PAYS FOR ITSELF IN THE FIT MATH, which is the deciding engineering
 * argument. `estimateWeekHeaderHeight()` is what the adapter's session chunker
 * charges for week furniture, so a door's height enters the page-fit decision
 * through the SAME function the atom estimates with — one model, three
 * consumers (atom estimate, chunker, solver). Seating the door anywhere else
 * would have needed a second height model to keep the chunker honest.
 *
 * DENSITY-INVARIANT, like the rest of this header: no `[data-density-variant]`
 * or `[data-page-compaction]` rule reaches these elements, so the model reports
 * one number at every tier. The mark boxes are pencil targets at the D89
 * 15px floor and do not move; only the option text wraps.
 *
 * CROSS-FILE CONTRACT: booklet.css `.week-door*`, which carries the reciprocal
 * pointer. Change them together (D71).
 *
 *   DOOR_CHROME_PX  padding-block 11 + borders 3 (hair width worst case 1.5,
 *                   as elsewhere in this file) + margins 10 + the label's
 *                   9.36px line box + its 4px margin.
 *   DOOR_OPTION_LINE  `.week-door-text` 6pt × 1.3.
 *   DOOR_OPTION_CHARS DERIVED, NOT FITTED (no fixture carries a door yet):
 *                   PROMPT_LADDER's fitted rows imply ~6.47px of effective
 *                   advance per character including greedy-wrap waste, giving
 *                   ~83 characters across the ~430px text column left beside
 *                   the mark box. 72 is taken instead, conservative because
 *                   the lean rides in the wider label face. Refit against
 *                   rendered headers once a fixture carries doors.
 *   DOOR_MARK_PX    `.week-door-mark`, the commitment tick.
 *   DOOR_LEAN_GAP_CHARS  the lean's inline margin, charged as line width.
 */
const DOOR_CHROME_PX = 37.4;
const DOOR_OPTION_LINE = 10.4;
const DOOR_OPTION_CHARS = 72;
const DOOR_OPTION_GAP = 4;
const DOOR_MARK_PX = 15;
const DOOR_LEAN_GAP_CHARS = 2;
const DEFAULT_DOOR_LABEL = 'Door';

/** The two posted options, in printed order, dropping any that has no label. */
function doorOptions(doorChoice) {
  if (!doorChoice || typeof doorChoice !== 'object') return [];
  return [doorChoice.optionA, doorChoice.optionB]
    .map((option) => ({
      label: String((option && option.label) || '').trim(),
      lean: String((option && option.lean) || '').trim(),
    }))
    .filter((option) => option.label);
}

/**
 * Height of the door block, or 0 when the week posts no door.
 *
 * Zero is the dormancy guarantee: no corpus fixture carries a doorChoice, so
 * this term must contribute nothing at all to their week headers — and the
 * chunker reads this same number, so a non-zero floor here would re-chunk the
 * whole corpus.
 */
function doorHeight(week) {
  const options = doorOptions(week && week.doorChoice);
  if (options.length < 2) return 0;

  const rows = options.reduce((sum, option) => {
    const chars = option.label.length
      + (option.lean ? option.lean.length + DOOR_LEAN_GAP_CHARS : 0);
    // The label and the lean share ONE line box (the lean is posted inline
    // beside the label), so the row wraps on their combined length.
    const lines = Math.max(1, Math.ceil(chars / DOOR_OPTION_CHARS));
    // `align-items:flex-start` on the row, so its height is max(mark, text) —
    // carried explicitly rather than assumed, exactly as the mark strip does.
    return sum + Math.max(DOOR_MARK_PX, lines * DOOR_OPTION_LINE);
  }, 0);

  return DOOR_CHROME_PX + rows + (options.length - 1) * DOOR_OPTION_GAP;
}

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

  // The door prints on the first chunk only, with the rest of the week's
  // framing — render() gates it on the same flag.
  if (isFirstChunk !== false) height += doorHeight(week);

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

    // The door — posted with the week's framing, on the first chunk only.
    // A door needs two ways through it; one posted option is a corridor, so
    // doorOptions() drops it rather than printing a choice with no alternative
    // (the normalizeManifestPointer rule: never print a half-filled pointer).
    const options = doorOptions(week.doorChoice);
    if (options.length >= 2 && data.isFirstChunk !== false) {
      const door = make('section', 'week-door');
      door.appendChild(make('div', 'week-door-label',
        String((week.doorChoice.label || '')).trim() || DEFAULT_DOOR_LABEL));

      options.forEach((option) => {
        const row = make('div', 'week-door-option');
        // The commitment affordance: tick the door you took.
        row.appendChild(make('div', 'week-door-mark'));
        const text = make('div', 'week-door-text');
        text.appendChild(make('span', 'week-door-name', option.label));
        // The LEAN is posted beside the label, not below it — the bias is the
        // whole decision, and a bias the reader has to hunt for is not posted.
        if (option.lean) {
          text.appendChild(make('span', 'week-door-lean', option.lean));
        }
        row.appendChild(text);
        door.appendChild(row);
      });

      wrap.appendChild(door);
    }

    return wrap;
  },
});

export default 'week-header';
