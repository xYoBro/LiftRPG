/**
 * page-spec.js — Page dimension and budget constants
 *
 * Single source of truth for page geometry. All layout decisions
 * reference these values. No domain knowledge — pure geometry.
 *
 * Default: half-letter (5.5in x 8.5in) saddle-stitched booklet.
 * All objects are frozen (immutable).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** CSS pixels per inch (browser standard) */
const DPI = 96;

// ---------------------------------------------------------------------------
// Default page specification
// ---------------------------------------------------------------------------

/**
 * Frozen page spec for a half-letter saddle-stitched booklet.
 *
 * @property {number} width        — page width in inches
 * @property {number} height       — page height in inches
 * @property {object} margins      — top/bottom/left/right in inches
 * @property {string} planningUnit — 'spread' (default) or 'page'
 * @property {number} padToMultipleOf — page count must be a multiple of this
 */
export const DEFAULT_PAGE_SPEC = Object.freeze({
  width:  5.5,
  height: 8.5,
  margins: Object.freeze({
    top:    0.4,
    bottom: 0.38,
    left:   0.3,
    right:  0.3,
  }),
  planningUnit:    'spread',
  padToMultipleOf: 4,
});

// ---------------------------------------------------------------------------
// Budget computation
// ---------------------------------------------------------------------------

/**
 * Compute the usable content area from a page spec.
 * Returns both inches and CSS pixels (at 96 dpi).
 *
 * @param {object} spec — a page spec (DEFAULT_PAGE_SPEC shape)
 * @returns {Readonly<{heightIn: number, widthIn: number, heightPx: number, widthPx: number}>}
 */
function computeBudget(spec) {
  const widthIn  = spec.width  - spec.margins.left - spec.margins.right;
  const heightIn = spec.height - spec.margins.top  - spec.margins.bottom;

  return Object.freeze({
    widthIn,
    heightIn,
    widthPx:  Math.round(widthIn  * DPI),
    heightPx: Math.round(heightIn * DPI),
  });
}

/**
 * Pre-computed content budget for the default half-letter page.
 *
 * widthIn:  5.5 - 0.3 - 0.3  = 4.9 in  (470 px)
 * heightIn: 8.5 - 0.4 - 0.38 = 7.72 in (741 px)
 */
export const PAGE_BUDGET = computeBudget(DEFAULT_PAGE_SPEC);

// ---------------------------------------------------------------------------
// Column layout constants
// ---------------------------------------------------------------------------

/** Gap between half-width columns (px). */
export const COLUMN_GAP_PX = 6;

/**
 * Width of a single half-width slot (px).
 * Two slots + gap = PAGE_BUDGET.widthPx.
 * floor((470 - 6) / 2) = 232
 */
export const HALF_SLOT_WIDTH_PX = Math.floor((PAGE_BUDGET.widthPx - COLUMN_GAP_PX) / 2);

// ---------------------------------------------------------------------------
// Custom spec factory
// ---------------------------------------------------------------------------

/**
 * Create a custom page spec by merging overrides onto the defaults.
 * Margins are shallow-merged (you can override individual sides).
 * The returned object and its margins are frozen.
 *
 * @param {object} [overrides]         — partial page spec
 * @param {number} [overrides.width]
 * @param {number} [overrides.height]
 * @param {object} [overrides.margins] — partial margins (top/bottom/left/right)
 * @param {string} [overrides.planningUnit]
 * @param {number} [overrides.padToMultipleOf]
 * @returns {Readonly<typeof DEFAULT_PAGE_SPEC>}
 */
export function createPageSpec(overrides = {}) {
  const mergedMargins = Object.freeze({
    ...DEFAULT_PAGE_SPEC.margins,
    ...(overrides.margins || {}),
  });

  // Spread defaults, then overrides, then the merged margins on top
  const spec = Object.freeze({
    ...DEFAULT_PAGE_SPEC,
    ...overrides,
    margins: mergedMargins,
  });

  return spec;
}
