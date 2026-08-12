/**
 * clocks-panel.js — Week-level gameplay clocks atom
 *
 * The printed home of `week.gameplayClocks`. Before this atom the field was
 * authored in eleven corpus fixtures (113 clocks, up to 21 in one book),
 * demanded by the schema and by prompt_rules, and rendered by NOTHING in the
 * V2 pipeline: the only clock that reached paper was an interlude payload.
 * That gap was surfaced under D105 and ruled on by the author — the clocks
 * print.
 *
 * Seating: emitted once per non-boss week that carries clocks, into the week's
 * field-ops attachment group, where it lands as a peer of cipher / oracle /
 * map. It is not a mechanic SURFACE type, so mechanic-layout.js drops it into
 * the row template's `other` bucket — one full-width row below the oracle.
 * The engine owns the page it lands on; this atom declares no placement.
 *
 * Data shape: { clocks, weekIndex, totalWeeks, artifactIdentity }
 *
 * Component dialects (D105) reach these clocks for free: the panel renders the
 * shared `renderGameplayClocks()` markup, so every `[data-component-dialect]`
 * rule in booklet.css — which selects on `.clock-item` / `.progress-clock-*` —
 * applies unchanged, and THE HEIGHT LAW keeps all four dialects the same height.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { advancePx, readTypeMetrics } from '../type-metrics.js';
import { PAGE_BUDGET } from '../engine/page-spec.js';
import { wrappedLines } from '../utils.js';
import { buildClockModels } from '../field-ops-models.js';
import {
  renderGameplayClocks,
  clockSubtext,
  CLOCK_CONSEQUENCE_PREFIX,
} from '../field-ops-primitives.js';

// ---------------------------------------------------------------------------
// Geometry mirror  ⇄  booklet.css `.ops-clocks` / `.clock-*` / `.clocks-panel`
// ---------------------------------------------------------------------------
/**
 * CROSS-FILE CONTRACT — every number below mirrors a declaration in
 * renderer/booklet.css: the shared `.ops-clocks`, `.doc-label`, `.clock-grid`,
 * `.clock-item`, `.clock-visuals`, `.clock-name`, `.clock-subtext`,
 * `.clock-consequence`, `.clock-thresholds` and `.clock-threshold` rules, plus
 * the panel-scoped `.clocks-panel .clock-grid` block. booklet.css carries the
 * reverse pointer. **Change them together or the estimate lies.**
 *
 * Why mirror instead of read: estimate() runs in phase 1, before any DOM
 * exists, so it cannot resolve a computed style — the same reason the cipher,
 * oracle and reckoning ladders exist (D71).
 *
 * THERE IS NO DENSITY LADDER HERE, AND THAT IS THE HONEST ANSWER. This panel
 * does not shrink, so estimate() reports minHeight === preferredHeight at every
 * density and hands the solver a shrink potential of exactly zero. Two reasons,
 * both of them the D89 flat-height family:
 *
 *   1. The clock face is a PENCIL TARGET. A player fills segments on it during
 *      the week; a 42px dial shaved to 30px to win a page is a dial you cannot
 *      tick, which is not a saving. The same ruling the reckoning tally box and
 *      the mark strip already carry.
 *   2. The type is already at the floor. Subtext, consequence and threshold
 *      chips print at 5pt and 4.9pt; there is no responsible tier below them.
 *
 * A ladder that promised shrink this panel cannot deliver would make the
 * solver's `preferredHeight(d) − minHeight(1.0)` arithmetic lie about where the
 * space on a tight field-ops page is — the exact D71 defect, reached by
 * flattery instead of by unit error. Zero is the true number, so zero is what
 * this returns.
 */

/** `.ops-clocks` — margin-top 5, border-top 1, padding-top 5. */
const SECTION_CHROME_PX = 11;
/** `.doc-label` — 5.8pt mono at the container's inherited 1.6 leading, plus its
 *  5px bottom margin. The label text is the 13-character constant "Active
 *  Clocks" from renderGameplayClocks(); at this panel's narrowest possible
 *  column (231px) 13 characters cannot wrap, so one line is a proof, not an
 *  assumption. Line figure matches RK_LABEL_PX in atoms/map-panel.js, which
 *  measures the same `.doc-label` rule. */
const LABEL_BLOCK_PX = 12.38 + 5;

/** `.clock-visuals` / `.progress-clock-svg` — the dial box. Flat by ruling, and
 *  exactly 42px only because `.clocks-panel .progress-clock-svg` is
 *  `display:block`: an inline SVG carries a text baseline, which put 8px of
 *  phantom descender inside a 42px box and reached the planner as internal
 *  overflow. Remove that CSS rule and every panel measures ~4px taller than
 *  this constant says. */
const FACE_PX = 42;
/** `.clock-item` — `grid-template-columns:42px 1fr` with a 6px column gap: the
 *  width the info column loses to the dial. */
const FACE_GUTTER_PX = FACE_PX + 6;
/** `.clock-item` — `padding:4px 0`. */
const ITEM_PAD_Y_PX = 8;

/** `.clocks-panel .clock-grid` — the panel-scoped fixed column count and gaps.
 *  A FIXED column count, not the shared `auto-fit minmax(120px,1fr)`, for the
 *  reason the reckoning tally is a fixed-column grid: a wrap point set by the
 *  container width is one the estimate cannot compute. With the count fixed,
 *  the info column width — and therefore every wrap in this panel — is
 *  arithmetic. A lone clock spans the panel (`[data-clock-count="1"]`) rather
 *  than sitting beside a void. */
const GRID_COLS = 2;
const GRID_COL_GAP_PX = 8;
const GRID_ROW_GAP_PX = 6;

/**
 * ADVANCES ARE MEASURED, NOT DERIVED. Every `*_CHAR_PX` below was read off the
 * live stylesheet with a 60-character probe in the panel's own font context
 * (Share Tech Mono at the archetype's sizes), then rounded UP. Rounding up is
 * the wrap allowance: these estimates divide a character count by a column
 * width, which models a break at any character, while the browser breaks at
 * word boundaries and therefore ragged-ends a little short of the true
 * capacity. A few percent of extra advance buys that back without the ~11%
 * padding a nominal 0.6em ratio would have carried.
 */
/** `.clock-name` — 5.8pt mono, uppercase, letter-spacing .08em, inherited 1.6
 *  leading (12.3733px computed, the same figure RK_LABEL_PX mirrors in
 *  atoms/map-panel.js). Measured advance 4.793. */
const NAME_LINE_PX = 12.37;
const NAME_CHAR_PX = 4.8;
const NAME_FS_PX = 7.73;   // 5.8pt — the size NAME_CHAR_PX was measured at
/** `.clock-subtext` / `.clock-consequence` — 5pt mono × 1.25 (explicit in CSS),
 *  8.3333px computed. Measured advance 3.597; 3.8 is the value that fits the
 *  corpus best. It was chosen by sweeping 3.60–3.90 against all 57 authored
 *  clocks panels measured through the harness: 3.8 scores 52 exact, 3 under, 2
 *  over, mean −0.2px. The residual is ±1 text line and it is IRREDUCIBLE — a
 *  character-count model breaks at any character while the browser breaks at
 *  word boundaries, so two panels with the same character count and different
 *  word lengths genuinely wrap differently. Same class of honest error as the
 *  fragment-doc reading-length curve. */
const TEXT_LINE_PX = 8.33;
const TEXT_CHAR_PX = 3.8;
const TEXT_FS_PX = 6.67;   // 5pt
/** Characters `renderGameplayClocks()` prepends to `consequenceOnFull`. */
const CONSEQUENCE_PREFIX_CHARS = CLOCK_CONSEQUENCE_PREFIX.length;

/** `.clock-thresholds` — margin-top 3, gap 3 between chips. */
const THRESHOLDS_MT_PX = 3;
const THRESHOLDS_GAP_PX = 3;
/** `.clock-threshold` — 4.9pt mono at inherited 1.6 leading (10.4533px
 *  computed), `padding:1px 3px` and a 1px border on all four sides. Measured
 *  advance 3.660. */
const CHIP_LINE_PX = 10.45;
const CHIP_CHAR_PX = 3.7;
const CHIP_FS_PX = 6.53;   // 4.9pt
const CHIP_PAD_Y_PX = 4;
const CHIP_PAD_X_PX = 8;

/**
 * `.clock-thresholds` is `display:flex; flex-wrap:wrap`, and the packing is
 * modelled rather than approximated. The cheap approximation — one chip per row
 * — was measured against the corpus and over-estimated by up to 30% on the
 * clocks whose thresholds are bare segment numbers (`[4, 6]` reads as two
 * chips that share one line, not two lines), which on a non-shrinkable panel is
 * page budget spent on nothing. Chip widths are content-driven and bounded by
 * the column, so the wrap is arithmetic — the same reason the grid above has a
 * fixed column count.
 */
function thresholdBlockHeightPx(thresholds, availWidth, chipCharPx) {
  const lines = [];
  let lineWidth = 0;
  let lineHeight = 0;

  for (const threshold of thresholds) {
    const chars = String(threshold).length;
    // `width:auto` on a flex item: shrink-to-fit, capped by the column. The
    // inner width is derived FIRST and the outer from it, never the reverse:
    // computing `outer` then subtracting the padding back off round-trips the
    // text width through two floating-point steps, and `chars * CHIP_CHAR_PX /
    // (chars * CHIP_CHAR_PX + PAD - PAD)` lands at 1.0000000000000002 — which
    // ceil()s to 2, silently giving every short chip a second line.
    const inner = Math.min(chars * chipCharPx, Math.max(1, availWidth - CHIP_PAD_X_PX));
    const outer = inner + CHIP_PAD_X_PX;
    const height = wrappedLines(chars, inner, chipCharPx) * CHIP_LINE_PX + CHIP_PAD_Y_PX;

    const needsNewLine = lineWidth > 0 && lineWidth + THRESHOLDS_GAP_PX + outer > availWidth;
    if (needsNewLine) {
      lines.push(lineHeight);
      lineWidth = outer;
      lineHeight = height;
    } else {
      lineWidth += (lineWidth > 0 ? THRESHOLDS_GAP_PX : 0) + outer;
      lineHeight = Math.max(lineHeight, height);
    }
  }
  if (lineHeight > 0) lines.push(lineHeight);
  if (!lines.length) return 0;

  return THRESHOLDS_MT_PX
    + lines.reduce((sum, height) => sum + height, 0)
    + (lines.length - 1) * THRESHOLDS_GAP_PX;
}

/** Width the panel is modelled against: the full content column. Mirrors
 *  PAGE_BUDGET.widthPx in engine/page-spec.js — imported rather than copied,
 *  because this atom is always full-width (it is not a mechanic surface type,
 *  so getMechanicSlotWidthPx() never hands it a half slot). */
const PANEL_WIDTH_PX = PAGE_BUDGET.widthPx;

/** Width of one clock's info column at a given clock count. */
function infoWidthPx(clockCount) {
  const cols = clockCount === 1 ? 1 : GRID_COLS;
  const cellWidth = (PANEL_WIDTH_PX - (cols - 1) * GRID_COL_GAP_PX) / cols;
  return Math.max(1, cellWidth - FACE_GUTTER_PX);
}

/** Flow height of one `.clock-item`, dial floor included. */
function clockItemHeightPx(clock, infoWidth, adv) {
  let info = wrappedLines(String(clock.clockName || '').length, infoWidth, adv.name) * NAME_LINE_PX;

  const subtext = clockSubtext(clock);
  if (subtext) {
    info += wrappedLines(subtext.length, infoWidth, adv.text) * TEXT_LINE_PX;
  }

  const thresholds = Array.isArray(clock.thresholds) ? clock.thresholds : [];
  if (thresholds.length) {
    info += thresholdBlockHeightPx(thresholds, infoWidth, adv.chip);
  }

  if (clock.consequenceOnFull) {
    const chars = CONSEQUENCE_PREFIX_CHARS + String(clock.consequenceOnFull).length;
    info += wrappedLines(chars, infoWidth, adv.text) * TEXT_LINE_PX;
  }

  // `align-items:center` on `.clock-item`: the row is as tall as the taller of
  // the dial and the info column.
  return Math.max(FACE_PX, info) + ITEM_PAD_Y_PX;
}

/** Modelled panel height. Pure over its own data at every density. */
function panelHeightPx(data, metrics) {
  const clocks = buildClockModels((data || {}).clocks);
  if (!clocks.length) return 0;

  // Every text class in this panel reads `--mono` (booklet.css 4522/4529/4541)
  // and none of them is re-faced by an archetype, shell or density rule — the
  // whole surface is one face, so one role covers it.
  const adv = {
    name: advancePx(NAME_CHAR_PX, NAME_FS_PX, 'mono', metrics),
    text: advancePx(TEXT_CHAR_PX, TEXT_FS_PX, 'mono', metrics),
    chip: advancePx(CHIP_CHAR_PX, CHIP_FS_PX, 'mono', metrics),
  };

  const infoWidth = infoWidthPx(clocks.length);
  const cols = clocks.length === 1 ? 1 : GRID_COLS;

  // Grid rows are as tall as their tallest member — the same max the browser
  // takes, computed over the same row partition the fixed column count fixes.
  let gridHeight = 0;
  for (let index = 0; index < clocks.length; index += cols) {
    const row = clocks.slice(index, index + cols);
    gridHeight += row.reduce((tallest, clock) => {
      return Math.max(tallest, clockItemHeightPx(clock, infoWidth, adv));
    }, 0);
  }
  const rowCount = Math.ceil(clocks.length / cols);
  gridHeight += Math.max(0, rowCount - 1) * GRID_ROW_GAP_PX;

  return Math.round(SECTION_CHROME_PX + LABEL_BLOCK_PX + gridHeight);
}

registerAtom('clocks-panel', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'right',

  /**
   * Flat by ruling — see the geometry-mirror note above. minHeight and
   * preferredHeight are the same number at every density, which reports a
   * shrink potential of zero to the solver. That is the truth: this panel has
   * nothing it can honestly give back.
   */
  estimate(data, density, context) {
    const height = panelHeightPx(data, readTypeMetrics(context));
    return { minHeight: height, preferredHeight: height };
  },

  render(atom) {
    const data = atom.data || {};
    const clocks = buildClockModels(data.clocks);

    // The shared clock renderer is the only clock renderer the printed book can
    // reach (atoms/tracker.js buildClock() is unreachable seed — D6/D105). The
    // panel adds a class and a count and changes nothing inside, so the dialect
    // layers and every `.clock-*` rule apply exactly as they do in an interlude.
    const section = renderGameplayClocks(clocks);
    section.classList.add('clocks-panel');
    section.setAttribute('data-clock-count', String(clocks.length));
    section.setAttribute('data-week-index', String(data.weekIndex ?? ''));
    return section;
  },
});

export default 'clocks-panel';
