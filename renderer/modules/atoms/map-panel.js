/**
 * map-panel.js — Map section atom
 *
 * Wraps field-ops-primitives.js renderMapSection() and
 * field-ops-models.js buildMapModel() into the atom interface.
 *
 * Data shape: { map, weekIndex }
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildMapModel } from '../field-ops-models.js';
import { renderMapSection } from '../field-ops-primitives.js';
import { densityVariant } from '../engine/density-util.js';
import { wrappedLines } from '../utils.js';
import { advancePx, readTypeMetrics } from '../type-metrics.js';

// ---------------------------------------------------------------------------
// Ladder mirror  ⇄  booklet.css `.map-zone[data-density-variant]` blocks
// ---------------------------------------------------------------------------
/**
 * CROSS-FILE CONTRACT — these numbers mirror the map rules in
 * renderer/booklet.css (the base `.map-title` / `.map-note` / `.map-annotation`
 * / `.map-route-key*` block and the `.map-zone[data-density-variant="…"]`
 * ladder). booklet.css carries the reverse pointer. **Change them together or
 * the estimate lies.**
 *
 * THE HONEST ZERO. The map bodies are density-invariant, measured, at
 * every tier across the corpus:
 *   grid           rows × 30px cell + 2px gutter   — a writable square
 *   grid (hex)     rows × 26px + 9px cap           — same, offset-packed
 *   point-to-point 214px min-height frame          — fixed aspect, guardrailed
 *   linear-track   step boxes sized by their text  — pencil boxes
 *   player-drawn   176px min-height canvas         — draw-on-me surface
 *   concentric     196px min-height frame          — ring bands + breach row
 *   maze           214px min-height frame          — corridor runs
 * None of them shrinks with density and none of them should: they are the
 * surfaces the player writes on. What this atom used to do was promise a flat
 * ~15% anyway (280→240, 360→300, …) with no reference to the map's contents;
 * measured delivery was 0 / -6.3 / -12.7%, and every pixel of it came from the
 * .map-note caption — so a map authored without a mapNote promised 15% and
 * delivered exactly nothing. The model below promises only what the chrome
 * (title lead, body gutter, annotation gap, note, route-key rules) can give.
 *
 * Tier keys are exactly the variant names densityVariant() returns.
 */
const LADDER = {
  base: {
    titleMB:      3,
    bodyMB:       4,
    annoMT:       3,
    noteLinePx:   10.41,  // 6.1pt × 1.28
    noteCharPx:   4.05,
    noteFsPx:     8.13,   // 6.1pt — the size noteCharPx was measured at
    noteMT:       3,
    noteHidden:   false,
    rkPadTop:     3,
    rkLabelMB:    5,
    rkRowGap:     3,
  },
  compact: {
    titleMB:      3,
    bodyMB:       4,
    annoMT:       3,
    noteLinePx:   10.41,
    noteCharPx:   4.05,
    noteFsPx:     8.13,   // 6.1pt
    noteMT:       3,
    noteHidden:   false,
    rkPadTop:     3,
    rkLabelMB:    5,
    rkRowGap:     3,
  },
  dense: {
    titleMB:      1,
    bodyMB:       2,
    annoMT:       1,
    noteLinePx:   7.36,   // 4.6pt × 1.2
    noteCharPx:   3.05,
    noteFsPx:     6.13,   // 4.6pt
    noteMT:       1,
    noteHidden:   false,
    rkPadTop:     2,
    rkLabelMB:    3,
    rkRowGap:     2,
  },
  tight: {
    titleMB:      1,
    bodyMB:       2,
    annoMT:       1,
    noteLinePx:   0,      // .map-note{ display:none }
    noteCharPx:   3.05,
    noteFsPx:     6.13,   // 4.6pt
    noteMT:       0,
    noteHidden:   true,
    rkPadTop:     1,
    rkLabelMB:    2,
    rkRowGap:     1,
  },
};

// ── Chrome that does not move with density ─────────────────────────────────
/** .map-title — 7.5pt label at the container's inherited leading. */
const TITLE_LINE_PX = 16;
const TITLE_CHAR_PX = 8.6;
const TITLE_FS_PX = 10.00;   // 7.5pt
/** .map-annotation — 5.9pt mono italic × 1.3. */
const ANNO_LINE_PX = 10.2;
const ANNO_CHAR_PX = 5.0;
const ANNO_FS_PX = 7.87;     // 5.9pt

// ── Body geometry (density-invariant by construction) ──────────────────────
/** .map-cell min-height, and the .map-grid gap between rows. */
const GRID_ROW_PX = 30;
const GRID_GAP_PX = 2;
/** .map-network min-height. On a real page the network also carries `flex:1`,
 *  so it grows into slack; 214 is its floor and what the harness measures. */
const NETWORK_MIN_PX = 214;
/** .map-maze min-height. Deliberately the SAME floor as the network: a maze is
 *  the same class of object — a node-link diagram inside a framed box — and
 *  giving it a second, slightly different number would be two constants
 *  pretending to be a design decision. They are independent: either may move
 *  without the other, and each mirrors its own CSS rule. */
const MAZE_MIN_PX = 214;
/** .map-rings min-height. Shorter than the network on purpose: the diagram is a
 *  circle, so its usable area is bounded by the SHORTER axis, and past ~170px of
 *  ring the extra height is margin either side of the disc. 196 leaves a 162px
 *  disc above the legend and the breach row, both of which are fixed-height. */
const RINGS_MIN_PX = 196;
/** Hex grid geometry — mirrors HEX_ROW_UNITS / HEX_CAP_UNITS in
 *  field-ops-primitives.js and the `.map-hex` rule in booklet.css. The height is
 *  set inline from the row count, so it is width-invariant by construction and
 *  this estimate is exact at either column width. */
const HEX_ROW_PX = 26;
const HEX_CAP_PX = 9;
/** .player-map min-height, and the flow height of one .player-map-prompt
 *  (4.9pt mono chip + its 6px top margin). Seed markers are absolutely
 *  positioned and cost nothing. */
const PLAYER_MIN_PX = 176;
const PLAYER_PROMPT_PX = 12.44;
const PLAYER_PROMPT_MT = 6;
const PLAYER_PROMPT_CHAR_PX = 4.0;
const PLAYER_PROMPT_FS_PX = 6.53;   // 4.9pt
/** Prompts are `width:max-content; max-width:78%`. */
const PLAYER_PROMPT_MAX_W = 0.78;
/** .map-track-step: 4px+5px padding, 1px+1px border, 2px gaps between the
 *  index line, the label, and the optional annotation.
 *
 *  CROSS-FILE CONTRACT (DR-8, 2026-08-17) — the label and annotation heights
 *  below are computed with `wrappedLines()`, a pure character-count model, and
 *  a character-count model IS a break-anywhere model: it assumes a column's
 *  worth of glyphs always starts a new line. That is only true because
 *  `.map-track-label` / `.map-track-meta` in booklet.css carry
 *  `overflow-wrap:break-word`. Before that rule existed a 21px step column
 *  could not break "STATION", so the renderer drew two lines where this model
 *  reserved four AND painted the surplus glyphs onto the next step's label.
 *  booklet.css carries the reverse pointer. **Change them together.** */
const TRACK_STEP_CHROME_PX = 9 + 2;
const TRACK_STEP_GAP_PX = 2;
const TRACK_INDEX_PX = 10.25;
const TRACK_LABEL_LINE_PX = 12.37;   // mono 5.8pt at inherited leading
const TRACK_LABEL_CHAR_PX = 4.7;
const TRACK_LABEL_FS_PX = 7.73;      // 5.8pt
const TRACK_META_LINE_PX = 11.52;    // serif 5.4pt italic
const TRACK_META_CHAR_PX = 4.46;
const TRACK_META_FS_PX = 7.20;       // 5.4pt
const TRACK_GAP_PX = 4;
const TRACK_STEP_PAD_X = 8 + 2;      // horizontal padding + border

// ── Route key (classified-packet + point-to-point only) ────────────────────
const RK_MARGIN_TOP_PX = 2;
const RK_BORDER_TOP_PX = 1;
const RK_LABEL_PX = 12.38;           // .doc-label, 5.8pt
const RK_ROW_LINE_PX = 8.32;         // .map-route-key-label, 5.2pt × 1.2
const RK_ROW_CHAR_PX = 4.16;
const RK_ROW_FS_PX = 6.93;           // 5.2pt
const RK_CODE_COL_PX = 18;
const RK_CODE_GAP_PX = 5;
const RK_COL_GAP_PX = 8;

/**
 * Width the map is modelled against.
 *
 * map-panel declares `footprint: { cols: 1 }`, so it renders full-width in the
 * dominant layout variants and at HALF_SLOT_WIDTH_PX in a `balanced` halves
 * row. Only the wrapped captions (title, note, annotation, route-key labels)
 * are width-sensitive; every body is not. Like cipher-panel, this models the
 * FULL column and lets the planner's ×1.4 half-width scale factor cover the
 * narrow case for packing — calibrating at the half width instead would be
 * multiplied by 1.4 on top and over-allocate badly. 432px is the narrowest
 * live column the archetype ladder produces (5.5in − 2 × the 0.5in maximum
 * `--page-margin` in theme.js), which is the conservative full-width basis.
 *
 * Measured residual, stated plainly: against real renders this model is exact
 * at full width (78 maps × 4 tiers, zero under-estimates, median 1.002× and
 * worst 1.038×) and under-reads a half-width map by a median 7% — up to 71px on
 * vale's 9-route classified packet, where the note and every route-key label
 * wrap twice as often at 232px. Both consumers absorb that safely: packing uses
 * minHeight × 1.4, which still covers the widest half-width case measured, and
 * the solver's shrinkPotential (preferredHeight − minHeight) merely
 * under-promises, which costs a revision pass and never a stall.
 *
 * ONE BODY IS THE EXCEPTION, AND IT GOT LOUDER (DR-8, 2026-08-17). Every other
 * body is width-invariant; a HORIZONTAL linear-track is the one whose height is
 * inversely proportional to the column, because narrowing it divides the same
 * label across more steps AND more lines. Measured on the four corpus tracks
 * that render in a 238px halves cell, the rendered `.map-track` is now
 * 1.8–2.3× this full-column model (169.5 / 132.3 / 144.7 / 134 / 213.8px against
 * 74 / 74 / 74 / 74 / 109), where before the wrap rule landed it was 0.99–1.4×.
 * That is the SAME model reading the same JSON: what changed is that the
 * renderer finally wraps the way this character-count model always assumed, so
 * the discrepancy moved out of the ink and into the arithmetic — which is the
 * safe half of the trade, but it is not nothing. Measured consequence across the
 * whole sealed corpus: page counts flat on all 20 fixtures, zero new
 * unresolvedOverflow (sf-c1's 2 are pre-existing and identical either side),
 * zero unsat — the solver measures and revises, so this costs revision passes,
 * never correctness. Closing it properly needs the ACTUAL column width in the
 * estimate context, which the ATOM-IR does not carry today (the engine forwards
 * `options.typeMetrics` and nothing else); that is a Layer-1 contract decision,
 * not a constant to nudge here.
 */
const MAP_WIDTH_PX = 432;

function ladderFor(density) {
  return LADDER[densityVariant(density) || 'base'];
}

/**
 * Height of the map body itself. Every branch here is density-free on purpose
 * — see THE HONEST ZERO above. Mirrors renderGridMap / renderHexGridMap /
 * renderPointMap / renderLinearMap / renderPlayerMap / renderRingsMap /
 * renderMazeMap in field-ops-primitives.js, including
 * their defaults (a missing gridDimensions renders 6×5, a missing dimensions
 * renders 12×8) and renderPlayerMap's `.slice(0, 4)` prompt cap.
 */
function bodyHeight(map, widthPx, metrics) {
  const mapType = map.mapType || 'grid';

  if (mapType === 'point-to-point' || mapType === 'node-graph') {
    return NETWORK_MIN_PX;
  }

  // Both Wave 3 geometries are framed boxes with a fixed floor and `flex:1`,
  // exactly like the network — and, like the network, they are density-invariant
  // by design. The ring bands and the corridor runs are what the player writes
  // on; a solver that could shrink them would be taking the board away to buy
  // four pixels of page.
  if (mapType === 'maze') {
    return MAZE_MIN_PX;
  }

  if (mapType === 'concentric') {
    return RINGS_MIN_PX;
  }

  if (mapType === 'linear-track') {
    const positions = Array.isArray(map.positions) ? map.positions : [];
    const count = Math.max(1, positions.length);
    const vertical = String(map.direction || 'horizontal') === 'vertical';
    // `.map-track` has no flex-wrap: horizontal keeps every step on one line
    // (so the track is as tall as its tallest step), vertical stacks them.
    const stepOuterW = vertical ? widthPx : (widthPx - (count - 1) * TRACK_GAP_PX) / count;
    const stepInnerW = Math.max(8, stepOuterW - TRACK_STEP_PAD_X);

    const stepHeights = positions.map((position) => {
      let h = TRACK_STEP_CHROME_PX + TRACK_INDEX_PX + TRACK_STEP_GAP_PX;
      h += wrappedLines(String(position.label || '').length, stepInnerW,
        advancePx(TRACK_LABEL_CHAR_PX, TRACK_LABEL_FS_PX, 'mono', metrics))
        * TRACK_LABEL_LINE_PX;
      if (position.annotation) {
        h += TRACK_STEP_GAP_PX
          + wrappedLines(String(position.annotation).length, stepInnerW,
            advancePx(TRACK_META_CHAR_PX, TRACK_META_FS_PX, 'body', metrics))
            * TRACK_META_LINE_PX;
      }
      return h;
    });
    if (!stepHeights.length) return 0;

    return vertical
      ? stepHeights.reduce((a, b) => a + b, 0) + (count - 1) * TRACK_GAP_PX
      : Math.max(...stepHeights);
  }

  if (mapType === 'player-drawn') {
    const prompts = (Array.isArray(map.prompts) ? map.prompts : []).slice(0, 4);
    const flow = prompts.reduce((sum, prompt) => sum
      + PLAYER_PROMPT_MT
      + wrappedLines(String(prompt).length, widthPx * PLAYER_PROMPT_MAX_W,
        advancePx(PLAYER_PROMPT_CHAR_PX, PLAYER_PROMPT_FS_PX, 'mono', metrics))
        * PLAYER_PROMPT_PX, 0);
    return Math.max(PLAYER_MIN_PX, flow);
  }

  // grid
  const dims = map.gridDimensions || { columns: 6, rows: 5 };
  const rows = Math.max(0, parseInt(dims.rows, 10) || 0);
  if (!rows) return 0;
  // Hex cells overlap vertically — a row costs three quarters of a hex, plus
  // the last row's bottom quarter once.
  if (map.cellShape === 'hex') return rows * HEX_ROW_PX + HEX_CAP_PX;
  return rows * GRID_ROW_PX + (rows - 1) * GRID_GAP_PX;
}

/**
 * `.map-route-key` only renders for a classified-packet point-to-point map with
 * edges — renderRouteKey() returns null otherwise. Its two-column grid stretches
 * each row to the taller of the pair, exactly like the oracle's entry grid.
 */
function routeKeyHeight(map, tier, widthPx, metrics) {
  const shellFamily = String((map.artifactIdentity || {}).shellFamily || '').toLowerCase();
  const edges = Array.isArray(map.edges) ? map.edges : [];
  if (shellFamily !== 'classified-packet') return 0;
  if (map.mapType !== 'point-to-point') return 0;
  if (!edges.length) return 0;

  const columnW = (widthPx - RK_COL_GAP_PX) / 2;
  const labelW = Math.max(12, columnW - RK_CODE_COL_PX - RK_CODE_GAP_PX);
  const rowHeights = edges.map((edge) =>
    wrappedLines(String(edge.label || 'Route').length, labelW,
      advancePx(RK_ROW_CHAR_PX, RK_ROW_FS_PX, 'mono', metrics)) * RK_ROW_LINE_PX);

  const gridRows = Math.ceil(rowHeights.length / 2);
  let grid = 0;
  for (let row = 0; row < gridRows; row += 1) {
    grid += Math.max(rowHeights[2 * row] || 0, rowHeights[2 * row + 1] || 0);
  }
  grid += Math.max(0, gridRows - 1) * tier.rkRowGap;

  return RK_MARGIN_TOP_PX + tier.rkPadTop + RK_BORDER_TOP_PX + RK_LABEL_PX + tier.rkLabelMB + grid;
}

/** Modelled zone height for one map at one ladder tier. */
function mapHeightAt(map, tier, metrics) {
  const width = MAP_WIDTH_PX;

  let height = wrappedLines(String(map.title || 'Map').length, width,
    advancePx(TITLE_CHAR_PX, TITLE_FS_PX, 'mono', metrics))
    * TITLE_LINE_PX + tier.titleMB;

  const body = bodyHeight(map, width, metrics);
  height += body;
  if (body) height += tier.bodyMB;

  height += routeKeyHeight(map, tier, width, metrics);

  if (map.floorLabel) {
    height += tier.annoMT
      + wrappedLines(String(map.floorLabel).length, width,
        advancePx(ANNO_CHAR_PX, ANNO_FS_PX, 'mono', metrics)) * ANNO_LINE_PX;
  }

  if (map.mapNote && !tier.noteHidden) {
    height += tier.noteMT
      + wrappedLines(String(map.mapNote).length, width,
        advancePx(tier.noteCharPx, tier.noteFsPx, 'body', metrics)) * tier.noteLinePx;
  }

  // Ceil, not round: the constants above are fractional pt→px conversions and
  // rounding to nearest turned a handful of maps into 0.2–0.4px under-estimates.
  return Math.ceil(height);
}

registerAtom('map-panel', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'right',
  footprint: { cols: 1 },

  /**
   * minHeight is the ladder's floor (tight); preferredHeight is the height at
   * the density asked for. The gap between them is this map's real shrink
   * potential, and for most maps it is small and honest: a note-less grid map
   * gives back 4px (title lead + body gutter) and says so, where the old flat
   * table claimed 40. A long-noted map on a classified packet gives back
   * meaningfully more, because a caption and a legend are the only things here
   * that can compress.
   */
  estimate(data, density, context) {
    const metrics = readTypeMetrics(context);
    const raw = (data || {}).map || {};
    const map = { ...raw, artifactIdentity: (data || {}).artifactIdentity || raw.artifactIdentity };
    return {
      minHeight:       mapHeightAt(map, LADDER.tight, metrics),
      preferredHeight: mapHeightAt(map, ladderFor(density), metrics),
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const map = data.map || {};
    const artifactIdentity = data.artifactIdentity || {};

    const mapModel = buildMapModel({
      ...map,
      artifactIdentity,
    }, null);
    // renderMapSection now returns .map-zone (peer of .cipher-zone/.oracle-zone).
    // Set identity attributes on the zone for zone-level CSS rules, and mirror
    // them onto the inner .map-content so CSS selectors targeting
    // .map-content[data-shell-family] (solo-surface contexts) still match.
    const el = renderMapSection(mapModel);
    const shellFamily   = artifactIdentity.shellFamily   || 'field-survey';
    const boardState    = artifactIdentity.boardStateMode || 'survey-grid';
    const attachStrat   = artifactIdentity.attachmentStrategy || 'split-technical';
    el.setAttribute('data-shell-family',        shellFamily);
    el.setAttribute('data-board-state-mode',    boardState);
    el.setAttribute('data-attachment-strategy', attachStrat);

    const mapContent = el.querySelector('.map-content');
    if (mapContent) {
      mapContent.setAttribute('data-shell-family',        shellFamily);
      mapContent.setAttribute('data-board-state-mode',    boardState);
      mapContent.setAttribute('data-attachment-strategy', attachStrat);
    }

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'map-panel';
