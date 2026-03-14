/**
 * diagnostics.js — Layout metrics collector and status reporter
 *
 * Collects metrics from the planning and measurement pipeline,
 * then formats human-readable status messages and debug summaries.
 * No domain knowledge — pure diagnostics infrastructure.
 */

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a fresh diagnostics collector with all fields initialised.
 *
 * @returns {DiagnosticsCollector}
 *
 * @typedef {object} DiagnosticsCollector
 * @property {number}  totalSpreads
 * @property {number}  totalPages
 * @property {number}  paddingPages
 * @property {number}  revisionPasses
 * @property {string|null}  spreadModel          — chosen spread model id
 * @property {boolean}      spreadModelOverridden — true if model was changed post-selection
 * @property {string|null}  overrideReason        — why the model was overridden
 * @property {AdjustmentRecord[]}        atomsAdjusted
 * @property {SplitRecord[]}             atomsSplit
 * @property {UnresolvedOverflow[]}      unresolvedOverflow
 * @property {SpreadUsageRecord[]}       perSpread
 * @property {AtomMetricsRecord[]}       perAtom
 */
export function createDiagnostics() {
  return {
    totalSpreads:          0,
    totalPages:            0,
    paddingPages:          0,
    revisionPasses:        0,

    spreadModel:           null,
    spreadModelOverridden: false,
    overrideReason:        null,

    /** @type {AdjustmentRecord[]} */
    atomsAdjusted:      [],
    /** @type {SplitRecord[]} */
    atomsSplit:          [],
    /** @type {UnresolvedOverflow[]} */
    unresolvedOverflow:  [],
    /** @type {SpreadUsageRecord[]} */
    perSpread:           [],
    /** @type {AtomMetricsRecord[]} */
    perAtom:             [],
  };
}

// ---------------------------------------------------------------------------
// Recording functions
// ---------------------------------------------------------------------------

/**
 * Record a density adjustment for an atom.
 *
 * @param {DiagnosticsCollector} diag
 * @param {string} atomId
 * @param {string} originalDensity
 * @param {string} finalDensity
 * @param {string} reason
 *
 * @typedef {object} AdjustmentRecord
 * @property {string} atomId
 * @property {string} originalDensity
 * @property {string} finalDensity
 * @property {string} reason
 */
export function recordAdjustment(diag, atomId, originalDensity, finalDensity, reason) {
  diag.atomsAdjusted.push({ atomId, originalDensity, finalDensity, reason });
}

/**
 * Record an atom that was split across spreads.
 *
 * @param {DiagnosticsCollector} diag
 * @param {string} atomId
 * @param {number} fromSpread
 * @param {number} toSpread
 *
 * @typedef {object} SplitRecord
 * @property {string} atomId
 * @property {number} fromSpread
 * @property {number} toSpread
 */
export function recordSplit(diag, atomId, fromSpread, toSpread) {
  diag.atomsSplit.push({ atomId, fromSpread, toSpread });
}

/**
 * Record an atom whose content overflows its page and could not be resolved.
 *
 * @param {DiagnosticsCollector} diag
 * @param {string} atomId
 * @param {number} overflowPx
 * @param {number} page
 *
 * @typedef {object} UnresolvedOverflow
 * @property {string} atomId
 * @property {number} overflowPx
 * @property {number} page
 */
export function recordUnresolvedOverflow(diag, atomId, overflowPx, page) {
  diag.unresolvedOverflow.push({ atomId, overflowPx, page });
}

/**
 * Record space usage for a spread.
 *
 * @param {DiagnosticsCollector} diag
 * @param {number} spreadIndex
 * @param {number} leftUsed   — pixels used on left page
 * @param {number} rightUsed  — pixels used on right page
 * @param {number} leftAtoms  — atom count on left page
 * @param {number} rightAtoms — atom count on right page
 *
 * @typedef {object} SpreadUsageRecord
 * @property {number} spreadIndex
 * @property {number} leftUsed
 * @property {number} rightUsed
 * @property {number} leftAtoms
 * @property {number} rightAtoms
 */
export function recordSpreadUsage(diag, spreadIndex, leftUsed, rightUsed, leftAtoms, rightAtoms) {
  diag.perSpread.push({ spreadIndex, leftUsed, rightUsed, leftAtoms, rightAtoms });
}

/**
 * Record measurement metrics for a single atom.
 *
 * @param {DiagnosticsCollector} diag
 * @param {string} atomId
 * @param {string} type
 * @param {number} estimatedHeight — pre-measurement estimate in px
 * @param {number} measuredHeight  — actual measured height in px
 * @param {string} density
 * @param {number} page
 * @param {number} spreadIndex
 *
 * @typedef {object} AtomMetricsRecord
 * @property {string} atomId
 * @property {string} type
 * @property {number} estimatedHeight
 * @property {number} measuredHeight
 * @property {string} density
 * @property {number} page
 * @property {number} spreadIndex
 */
export function recordAtomMetrics(diag, atomId, type, estimatedHeight, measuredHeight, density, page, spreadIndex) {
  diag.perAtom.push({ atomId, type, estimatedHeight, measuredHeight, density, page, spreadIndex });
}

// ---------------------------------------------------------------------------
// Status formatter
// ---------------------------------------------------------------------------

/**
 * Build a human-readable status message from collected diagnostics.
 *
 * Level logic:
 *   'error' — unresolved overflow exists (content will clip in print)
 *   'warn'  — atoms were split across spreads (layout needed fallback)
 *   'info'  — clean layout
 *
 * @param {DiagnosticsCollector} diag
 * @returns {{ message: string, level: 'info'|'warn'|'error' }}
 */
export function formatStatus(diag) {
  const parts = [];

  // Page count
  parts.push(`${diag.totalPages} pages across ${diag.totalSpreads} spreads.`);

  // Spread model override
  if (diag.spreadModelOverridden && diag.overrideReason) {
    parts.push(`Spread model overridden: ${diag.overrideReason}.`);
  }

  // Revision passes (only mention if > 0)
  if (diag.revisionPasses > 0) {
    parts.push(`${diag.revisionPasses} revision ${diag.revisionPasses === 1 ? 'pass' : 'passes'}.`);
  }

  // Adjustments
  if (diag.atomsAdjusted.length > 0) {
    parts.push(`${diag.atomsAdjusted.length} atom${diag.atomsAdjusted.length === 1 ? '' : 's'} density-adjusted.`);
  }

  // Splits
  if (diag.atomsSplit.length > 0) {
    parts.push(`${diag.atomsSplit.length} atom${diag.atomsSplit.length === 1 ? '' : 's'} split across spreads.`);
  }

  // Unresolved overflow — detail each one
  if (diag.unresolvedOverflow.length > 0) {
    const overflowDetails = diag.unresolvedOverflow
      .map(o => `${o.atomId} on page ${o.page} (+${Math.round(o.overflowPx)}px)`)
      .join('; ');
    parts.push(`UNRESOLVED OVERFLOW: ${overflowDetails}.`);
  }

  // Padding pages
  if (diag.paddingPages > 0) {
    parts.push(`${diag.paddingPages} padding page${diag.paddingPages === 1 ? '' : 's'} added for imposition.`);
  }

  // Sign-off
  parts.push('Review, then print.');

  // Determine level
  let level = 'info';
  if (diag.unresolvedOverflow.length > 0) {
    level = 'error';
  } else if (diag.atomsSplit.length > 0) {
    level = 'warn';
  }

  return { message: parts.join(' '), level };
}

// ---------------------------------------------------------------------------
// Debug summary
// ---------------------------------------------------------------------------

/**
 * Return a compact object suitable for console logging / debug inspection.
 *
 * @param {DiagnosticsCollector} diag
 * @returns {{ pages: number, spreads: number, padding: number, revisions: number,
 *             adjusted: number, split: number, unresolved: number,
 *             spreadModel: string|null, overridden: boolean }}
 */
export function summarize(diag) {
  return {
    pages:       diag.totalPages,
    spreads:     diag.totalSpreads,
    padding:     diag.paddingPages,
    revisions:   diag.revisionPasses,
    adjusted:    diag.atomsAdjusted.length,
    split:       diag.atomsSplit.length,
    unresolved:  diag.unresolvedOverflow.length,
    spreadModel: diag.spreadModel,
    overridden:  diag.spreadModelOverridden,
  };
}
