/**
 * cipher-panel.js — Cipher section atom
 *
 * Wraps field-ops-primitives.js renderCipherSection() and
 * field-ops-models.js buildCipherModel() into the atom interface.
 *
 * Data shape: { cipher, weekIndex }
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildCipherModel } from '../field-ops-models.js';
import { renderCipherSection } from '../field-ops-primitives.js';
import { densityVariant } from '../engine/density-util.js';
import {
  resolveWorkspaceStyle,
  DEFAULT_WORKSPACE_STYLE
} from '../../../contracts/contract-constants.mjs';

// ---------------------------------------------------------------------------
// Ladder mirror  ⇄  booklet.css `--cipher-*` tokens
// ---------------------------------------------------------------------------
/**
 * CROSS-FILE CONTRACT — these numbers mirror the `--cipher-*` token ladder in
 * renderer/booklet.css (the `.cipher-zone` base block and the
 * `.cipher-zone[data-density-variant="…"]` blocks). booklet.css carries the
 * reverse pointer. **Change them together or the estimate lies.**
 *
 * Why mirror instead of read: estimate() runs in phase 1, before any DOM
 * exists. It may not touch the document, so it cannot resolve a custom
 * property. The alternative — a flat guess — is what this replaces: a single
 * WORKSPACE_HEIGHT of 40px for every style, and a fixed 30px of "density
 * savings", which made the solver's Strategy-1 proportional math meaningless
 * (`fraction` saturated to 1.0, so any overflowing cipher jumped straight to
 * density 1.0 instead of the lowest density that fits).
 *
 * Tier keys are exactly the variant names `densityVariant()` returns, so the
 * tier this estimate models is always the tier render() stamps onto the DOM.
 *
 * pt→px conversion is ×96/72; the line figures below are (font-size × leading).
 * The writable floors are the ladder's, not ours: a boxed cell never drops
 * below BOX_CELL_MIN_PX and ruled pitch never below 15px.
 */
const LADDER = {
  //         --cipher-seq-size × -leading | --cipher-key-size × -leading
  base: {
    seqLinePx: 12.7,   // 6.7pt × 1.42
    keyLinePx: 15.0,   // 7.5pt × 1.50
    boxCellMaxPx: 44,  // --cipher-box-max-h
    boxGapPx: 4,       // --cipher-box-gap
    ruleGapPx: 7,      // --cipher-rule-gap
    blankRowPx: 20,    // --cipher-blank-row-h
    cellSizePx: 16,    // --cipher-cell-size
    cellGapPx: 3,      // --cipher-cell-gap
    wsGapPx: 14,       // --cipher-ws-gap-top (8) + --cipher-ws-gap-bottom (6)
    hidesFamilyNote: false,
  },
  compact: {
    seqLinePx: 12.0,   // 6.7pt × 1.34
    keyLinePx: 15.0,   // unchanged at compact
    boxCellMaxPx: 40,
    boxGapPx: 4,
    ruleGapPx: 7,
    blankRowPx: 20,
    cellSizePx: 16,
    cellGapPx: 3,
    wsGapPx: 13,       // 7 + 6
    hidesFamilyNote: false,
  },
  dense: {
    seqLinePx: 10.9,   // 6.3pt × 1.30
    keyLinePx: 12.5,   // 7.0pt × 1.34
    boxCellMaxPx: 34,
    boxGapPx: 3,
    ruleGapPx: 6,
    blankRowPx: 17,
    cellSizePx: 14,
    cellGapPx: 3,
    wsGapPx: 10,       // 6 + 4
    hidesFamilyNote: false,
  },
  tight: {
    seqLinePx: 9.8,    // 5.9pt × 1.24
    keyLinePx: 11.1,   // 6.6pt × 1.26
    boxCellMaxPx: 26,
    boxGapPx: 3,
    ruleGapPx: 5,
    blankRowPx: 15,
    cellSizePx: 13,
    cellGapPx: 2,
    wsGapPx: 8,        // 5 + 3
    hidesFamilyNote: true,   // .cipher-family-note{ display:none }
  },
};

/** --cipher-rule-h: the lined row's own min-height. Constant across the ladder
 *  (pitch shrinks via --cipher-rule-gap only — the pencil floor). */
const RULE_ROW_PX = 10;
/** --cipher-box-min-h: a box you cannot write a digit in is not a saving. */
const BOX_CELL_MIN_PX = 20;

/**
 * Width the workspace is modelled against. Grid geometry (boxed cell
 * aspect-ratio, plaintext-cell wrapping) is width-derived, and estimate()
 * has no page context — the planner only tells us the density. The full
 * content column (PAGE_BUDGET.widthPx) is the right basis: the cipher zone
 * measures 232–238px when it shares a row and ~482px when it holds the page
 * alone, and the wider basis is the conservative (taller) one for boxed
 * workspaces, which are the dominant error term. Mirrors engine/page-spec.js.
 */
const WORKSPACE_WIDTH_PX = 470;

// ---------------------------------------------------------------------------
// Non-workspace chrome
// ---------------------------------------------------------------------------

/** .puzzle-title — 8.6pt display, ~2 wrapped lines plus its margin. */
const TITLE_PX = 26;
/** .password-extract — 6pt mono, ~10.5px per line, plus margin. */
const EXTRACT_LINE_PX = 10.5;
const EXTRACT_MIN_PX = 21;
/** .cipher-family-note — 5.9pt serif italic, ~10.2px per line, plus margin. */
const FAMILY_NOTE_PX = 24;
/** Inter-element margins the model does not itemise (title/sequence/key gaps,
 *  zone padding). Measured at 29–33px across the corpus. */
const ZONE_CHROME_PX = 30;

/**
 * Cipher sequence text (body.displayText) is monospace and wraps to the zone
 * width. CHARS_PER_LINE stays calibrated as it was before the geometry
 * rewrite — the planner applies a ×1.4 width-scale factor to minHeight for
 * cols:1 atoms, so this figure sits between the true half-width (~43) and
 * full-width (~88) character counts on purpose. Only the *line height* moves
 * with density here; holding chars-per-line fixed keeps the modelled
 * per-tier deltas in line with measurement (compact ≈0.94×, dense ≈0.86×,
 * tight ≈0.77× of base) instead of over-promising shrink.
 */
const DISPLAY_TEXT_CHARS_PER_LINE = 60;
/** .key-grid is `white-space:pre-wrap`, so authored newlines survive; this is
 *  the wrap length for the ones that do not. */
const KEY_CHARS_PER_LINE = 46;

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** Map a continuous density to its ladder tier. Same thresholds render uses. */
function ladderFor(density) {
  return LADDER[densityVariant(density) || 'base'];
}

function lineCount(text, charsPerLine) {
  const raw = String(text || '');
  if (!raw) return 0;
  return raw
    .split('\n')
    .filter(Boolean)
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
}

/**
 * Height of the writable workspace, per style, at one ladder tier.
 *
 * CROSS-FILE CONTRACT — mirrors renderWorkspace() / renderLinedWorkspace() /
 * renderBoxedWorkspace() / renderBlankWorkspace() / renderCellWorkspace() in
 * field-ops-primitives.js, including their row/col defaults and clamps, which
 * are load-bearing. Both sides resolve the authored style through the SAME
 * table (resolveWorkspaceStyle in contracts/contract-constants.mjs) and share
 * the same DEFAULT_WORKSPACE_STYLE fallback, so an alias like 'ruled' is
 * measured as the lined geometry it renders as. When these two disagree the
 * failure is silent clipping, not an error.
 */
function workspaceHeight(workSpace, tier) {
  if (!workSpace) return 0;

  const style = resolveWorkspaceStyle(workSpace.style) || DEFAULT_WORKSPACE_STYLE;
  const rowsRaw = parseInt(workSpace.rows, 10);
  const colsRaw = parseInt(workSpace.cols, 10);

  if (style === 'lined') {
    // .cipher-lined-workspace: flex column of rows at --cipher-rule-h,
    // separated by --cipher-rule-gap.
    const rows = Math.max(2, rowsRaw || 3);
    return rows * RULE_ROW_PX + (rows - 1) * tier.ruleGapPx;
  }

  if (style === 'boxed-totals') {
    // .cipher-boxed-workspace: grid of rows × cols. Each cell prefers a square
    // (aspect-ratio 1/1) but is clamped between --cipher-box-min-h and
    // --cipher-box-max-h — so at 2–4 columns the cap governs and the cell
    // height is density-driven, not width-driven.
    const rows = Math.max(1, rowsRaw || 2);
    const cols = Math.max(2, colsRaw || 4);
    // The width term uses the BASE gap, not the tier's, on purpose: a denser
    // tier has a smaller gap and therefore slightly *wider* cells, which would
    // make the estimate rise with density on very wide grids (cols ≳ 18, where
    // the square is narrower than the cap). Charter invariant 4 requires
    // estimates to be non-increasing in density, so the aspect-ratio term is
    // held density-invariant and only the cap moves.
    const cellWidth = (WORKSPACE_WIDTH_PX - (cols - 1) * LADDER.base.boxGapPx) / cols;
    const cellHeight = Math.min(
      tier.boxCellMaxPx,
      Math.max(BOX_CELL_MIN_PX, cellWidth),
    );
    return rows * cellHeight + (rows - 1) * tier.boxGapPx;
  }

  if (style === 'blank') {
    // .cipher-blank-workspace: a single ruled block, rows × --cipher-blank-row-h.
    const rows = Math.max(2, rowsRaw || 3);
    return rows * tier.blankRowPx;
  }

  // Default — .plaintext-grid: a wrapping strip of --cipher-cell-size squares.
  const count = Math.min((rowsRaw || 1) * (colsRaw || 10), 40);
  const pitch = tier.cellSizePx + tier.cellGapPx;
  const perRow = Math.max(1, Math.floor((WORKSPACE_WIDTH_PX + tier.cellGapPx) / pitch));
  const gridRows = Math.max(1, Math.ceil(count / perRow));
  return gridRows * tier.cellSizePx + (gridRows - 1) * tier.cellGapPx;
}

/** Modelled zone height for one cipher at one ladder tier. */
function cipherHeightAt(cipher, tier) {
  const body = cipher.body || {};

  let height = TITLE_PX + ZONE_CHROME_PX;

  height += lineCount(body.displayText, DISPLAY_TEXT_CHARS_PER_LINE) * tier.seqLinePx;
  height += lineCount(body.key, KEY_CHARS_PER_LINE) * tier.keyLinePx;

  if (body.workSpace) {
    height += workspaceHeight(body.workSpace, tier) + tier.wsGapPx;
  }

  const familyNote = cipher.noticeabilityDesign || cipher.characterDerivationProof || '';
  if (familyNote && !tier.hidesFamilyNote) height += FAMILY_NOTE_PX;

  const extract = String(cipher.extractionInstruction || '');
  height += Math.max(
    EXTRACT_MIN_PX,
    lineCount(extract, DISPLAY_TEXT_CHARS_PER_LINE) * EXTRACT_LINE_PX,
  );

  return Math.round(height);
}

registerAtom('cipher-panel', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'right',
  footprint: { cols: 1 },

  /**
   * minHeight is the floor (the ladder's tight tier); preferredHeight is the
   * height at the density asked for. The density solver reads the gap between
   * them as this atom's shrink potential, so the gap must be the ladder's real
   * range for *this* cipher's workspace style: wide for boxed (a 4-row grid
   * gives back ~75px of cell height alone), narrow for lined (its pitch is
   * already at the pencil floor), and fixed-per-row for blank.
   */
  estimate(data, density) {
    const cipher = (data || {}).cipher || {};
    return {
      minHeight:       cipherHeightAt(cipher, LADDER.tight),
      preferredHeight: cipherHeightAt(cipher, ladderFor(density)),
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const cipher = data.cipher || {};
    const artifactIdentity = data.artifactIdentity || {};

    // buildCipherModel expects (cipher, weeklyComponent, mechanicProfile)
    // We pass cipher as weeklyComponent fallback for extractionInstruction
    const cipherModel = buildCipherModel(cipher, cipher, null);
    const el = renderCipherSection(cipherModel);
    el.setAttribute('data-shell-family', artifactIdentity.shellFamily || 'field-survey');
    el.setAttribute('data-board-state-mode', artifactIdentity.boardStateMode || 'survey-grid');
    el.setAttribute('data-attachment-strategy', artifactIdentity.attachmentStrategy || 'split-technical');

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'cipher-panel';
