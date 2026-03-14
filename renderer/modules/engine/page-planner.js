/**
 * page-planner.js — Spread planning algorithm
 *
 * Bins a flat list of universal atoms into spreads (or pages for journal mode).
 * Uses size hints for initial planning. The measurement harness and density
 * solver refine the plan afterward.
 *
 * Pipeline: orderAtoms → groupByAffinity → binGroupIntoSpreads → pad →
 *           measure → revise → finalise
 *
 * @module engine/page-planner
 */

import { getAtomDefinition } from './atom-registry.js';
import { PAGE_BUDGET, DEFAULT_PAGE_SPEC } from './page-spec.js';
import { resolvePageOverflow, MAX_REVISIONS } from './density-solver.js';
import {
  createMeasurementRoot, measureAtom, checkPageFit,
} from './measurement-harness.js';
import {
  createDiagnostics, recordAdjustment, recordSplit,
  recordUnresolvedOverflow, recordSpreadUsage, recordAtomMetrics,
  formatStatus, summarize,
} from './diagnostics.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default section ordering. Adapters can override this to change
 * the top-level structure of the booklet.
 */
export const DEFAULT_SECTION_ORDER = [
  'cover', 'front-matter', 'body', 'supplements',
  'end-matter', 'endings', 'back-matter', 'padding',
];

/**
 * Approximate pixel height for each size hint, used during initial
 * planning before real measurement. These are intentionally conservative
 * (slightly over-estimate) so the planner doesn't under-allocate.
 */
const SIZE_HINT_PX = {
  'full-page':    PAGE_BUDGET.heightPx,
  'half-page':    PAGE_BUDGET.heightPx * 0.5,
  'quarter-page': PAGE_BUDGET.heightPx * 0.25,
  'flex':         PAGE_BUDGET.heightPx * 0.3,
  'minimal':      40,
};

// ---------------------------------------------------------------------------
// Ordering
// ---------------------------------------------------------------------------

/**
 * Sort atoms by section order, then by sequence within each section.
 *
 * @param {AtomDescriptor[]} atoms
 * @param {string[]} sectionOrder
 * @returns {AtomDescriptor[]} new sorted array (does not mutate input)
 */
export function orderAtoms(atoms, sectionOrder = DEFAULT_SECTION_ORDER) {
  const sectionIndex = {};
  sectionOrder.forEach((s, i) => { sectionIndex[s] = i; });

  return [...atoms].sort((a, b) => {
    const sa = sectionIndex[a.section] ?? 999;
    const sb = sectionIndex[b.section] ?? 999;
    if (sa !== sb) return sa - sb;
    return (a.sequence ?? 0) - (b.sequence ?? 0);
  });
}

// ---------------------------------------------------------------------------
// Estimation helpers
// ---------------------------------------------------------------------------

/**
 * Estimate an atom's height using its registry estimate() function,
 * falling back to the size hint approximation table.
 */
function estimateAtomHeight(atom, density = 0.0) {
  const def = getAtomDefinition(atom.type);
  if (def) {
    const est = def.estimate(atom.data, density);
    return est.preferredHeight;
  }
  return SIZE_HINT_PX[atom.sizeHint] || SIZE_HINT_PX['flex'];
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/**
 * Group atoms by their `group` affinity key.
 * Preserves order within each group.
 *
 * @param {AtomDescriptor[]} orderedAtoms
 * @returns {Map<string, AtomDescriptor[]>}
 */
function groupByAffinity(orderedAtoms) {
  const groups = new Map();
  for (const atom of orderedAtoms) {
    const key = atom.group || atom.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(atom);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Spread construction
// ---------------------------------------------------------------------------

/**
 * Create an empty spread descriptor.
 */
function createSpread(spreadIndex, spreadType, weekIndex = null) {
  return {
    spreadIndex,
    spreadType,
    weekIndex,
    left:  [],
    right: [],
  };
}

/**
 * Create an atom placement entry for a spread's left or right page.
 */
function createPlacement(atom, density = 0.0) {
  return {
    atomId:          atom.id,
    type:            atom.type,
    density,
    estimatedHeight: estimateAtomHeight(atom, density),
    measuredHeight:  null,
    data:            atom.data,
    sizeHint:        atom.sizeHint,
    atom,   // back-reference to full atom descriptor
  };
}

/**
 * Sum estimated heights of placements on a page side.
 */
function pageEstimatedHeight(placements) {
  return placements.reduce((sum, p) => sum + p.estimatedHeight, 0);
}

/**
 * Bin a group of atoms into one or more spreads.
 *
 * For spread mode: assigns atoms to left/right based on pageAffinity.
 * For page mode:   assigns atoms to left only (no right page).
 *
 * @param {AtomDescriptor[]} groupAtoms
 * @param {number} startSpreadIndex
 * @param {string} spreadType
 * @param {number|null} weekIndex
 * @param {'spread'|'page'} planningUnit
 * @returns {object[]} array of spread descriptors
 */
function binGroupIntoSpreads(groupAtoms, startSpreadIndex, spreadType, weekIndex, planningUnit) {
  const budget  = PAGE_BUDGET.heightPx;
  const spreads = [];
  let current   = createSpread(startSpreadIndex + spreads.length, spreadType, weekIndex);

  for (const atom of groupAtoms) {
    const placement = createPlacement(atom);

    // Full-page atoms get their own page/spread
    if (atom.sizeHint === 'full-page' || !getAtomDefinition(atom.type)?.canShare) {
      // Flush current spread if it has content
      if (current.left.length > 0 || current.right.length > 0) {
        spreads.push(current);
        current = createSpread(startSpreadIndex + spreads.length, spreadType, weekIndex);
      }
      current.left.push(placement);
      spreads.push(current);
      current = createSpread(startSpreadIndex + spreads.length, spreadType, weekIndex);
      continue;
    }

    // Determine target side
    const affinity = atom.pageAffinity || 'either';
    let targetSide;
    if (planningUnit === 'page') {
      targetSide = 'left';    // page mode: everything on the single page
    } else if (affinity === 'left') {
      targetSide = 'left';
    } else if (affinity === 'right') {
      targetSide = 'right';
    } else {
      // 'either' — pick the side with more room
      const leftHeight  = pageEstimatedHeight(current.left);
      const rightHeight = pageEstimatedHeight(current.right);
      targetSide = leftHeight <= rightHeight ? 'left' : 'right';
    }

    const targetPage   = current[targetSide];
    const currentHeight = pageEstimatedHeight(targetPage);

    // Does it fit?
    if (currentHeight + placement.estimatedHeight <= budget) {
      targetPage.push(placement);
    } else {
      // Start a new spread
      spreads.push(current);
      current = createSpread(startSpreadIndex + spreads.length, spreadType, weekIndex);
      current[targetSide].push(placement);
    }
  }

  // Push last spread if it has content
  if (current.left.length > 0 || current.right.length > 0) {
    spreads.push(current);
  }

  return spreads;
}

// ---------------------------------------------------------------------------
// Main planning function (estimate-only, no measurement)
// ---------------------------------------------------------------------------

/**
 * Plan the full booklet layout from a list of universal atoms.
 *
 * This is the estimate-only phase. Call `planAndMeasure()` for the full
 * plan → measure → revise pipeline.
 *
 * @param {AtomDescriptor[]} atoms — flat list from an adapter
 * @param {object} [options]
 * @param {string[]} [options.sectionOrder]
 * @param {'spread'|'page'} [options.planningUnit]
 * @param {number} [options.padToMultipleOf]
 * @returns {{ spreadPlan: object[], diagnostics: object }}
 */
export function planSpreads(atoms, options = {}) {
  const {
    sectionOrder   = DEFAULT_SECTION_ORDER,
    planningUnit   = DEFAULT_PAGE_SPEC.planningUnit,
    padToMultipleOf = DEFAULT_PAGE_SPEC.padToMultipleOf,
  } = options;

  const diag = createDiagnostics();

  // Phase 1: Order atoms
  const ordered = orderAtoms(atoms, sectionOrder);

  // Phase 2: Group by affinity and bin into spreads
  const groups     = groupByAffinity(ordered);
  const spreadPlan = [];

  for (const [groupKey, groupAtoms] of groups) {
    const spreadType = groupAtoms[0].section || 'body';
    const weekIndex  = groupAtoms[0].data?.weekIndex ?? null;

    const groupSpreads = binGroupIntoSpreads(
      groupAtoms,
      spreadPlan.length,
      spreadType,
      weekIndex,
      planningUnit,
    );

    // Re-index spreads
    for (const spread of groupSpreads) {
      spread.spreadIndex = spreadPlan.length;
      spreadPlan.push(spread);
    }
  }

  // Phase 3: Count pages and pad
  let totalPages = 0;
  for (const spread of spreadPlan) {
    if (spread.left.length > 0)  totalPages++;
    if (spread.right.length > 0) totalPages++;
  }

  // Pad to multiple of padToMultipleOf
  const remainder     = totalPages % padToMultipleOf;
  const paddingNeeded = remainder === 0 ? 0 : padToMultipleOf - remainder;

  for (let i = 0; i < paddingNeeded; i++) {
    const paddingSpread = createSpread(spreadPlan.length, 'padding');
    paddingSpread.left.push(createPlacement({
      type:         'notes-grid',
      id:           `padding-${i}`,
      group:        'padding',
      section:      'padding',
      sequence:     i,
      sizeHint:     'full-page',
      pageAffinity: 'either',
      data:         { variant: 'dot' },
    }));
    spreadPlan.push(paddingSpread);
    totalPages++;
  }

  // Phase 4: Record diagnostics
  diag.totalSpreads = spreadPlan.length;
  diag.totalPages   = totalPages;
  diag.paddingPages = paddingNeeded;

  return { spreadPlan, diagnostics: diag };
}

// ---------------------------------------------------------------------------
// Full pipeline: plan → measure → revise
// ---------------------------------------------------------------------------

/**
 * Run the full plan → measure → revise → finalise pipeline.
 *
 * @param {AtomDescriptor[]} atoms
 * @param {HTMLElement} container — themed booklet container (for CSS var inheritance)
 * @param {object} [options] — same as planSpreads options
 * @returns {{ spreadPlan: object[], diagnostics: object }}
 */
export function planAndMeasure(atoms, container, options = {}) {
  // Step 1: Plan with estimates
  const { spreadPlan, diagnostics } = planSpreads(atoms, options);

  // Step 2: Measure each atom in the offscreen DOM
  const { stack, destroy } = createMeasurementRoot(container);

  try {
    // Measure all atoms
    for (const spread of spreadPlan) {
      for (const side of ['left', 'right']) {
        for (const placement of spread[side]) {
          const result = measureAtom(stack, placement.atom, placement.density);
          placement.measuredHeight = result.measuredHeight;

          recordAtomMetrics(
            diagnostics, placement.atomId, placement.type,
            placement.estimatedHeight, result.measuredHeight,
            placement.density, side, spread.spreadIndex,
          );
        }
      }
    }

    // Step 3: Revise overflows
    let revisionsApplied = 0;

    for (let pass = 0; pass < MAX_REVISIONS; pass++) {
      let anyOverflow = false;

      for (const spread of spreadPlan) {
        for (const side of ['left', 'right']) {
          const placements = spread[side];
          if (placements.length === 0) continue;

          const totalHeight = placements.reduce(
            (s, p) => s + (p.measuredHeight || p.estimatedHeight), 0,
          );
          const overflowPx = totalHeight - PAGE_BUDGET.heightPx;

          if (overflowPx > 2) {
            anyOverflow = true;

            const result = resolvePageOverflow(
              placements.map(p => ({
                atomId:  p.atomId,
                type:    p.type,
                density: p.density,
                data:    p.atom?.data,
              })),
              overflowPx,
              PAGE_BUDGET.heightPx,
            );

            // Apply density adjustments
            for (const adj of result.adjustments) {
              const placement = placements.find(p => p.atomId === adj.atomId);
              if (placement) {
                recordAdjustment(
                  diagnostics, adj.atomId,
                  placement.density, adj.newDensity, 'overflow',
                );
                placement.density = adj.newDensity;

                // Re-measure adjusted atom
                const remeasure = measureAtom(stack, placement.atom, placement.density);
                placement.measuredHeight = remeasure.measuredHeight;
              }
            }

            // Handle split — move atom to a new spread
            if (result.splitAtomId) {
              const splitIdx = placements.findIndex(p => p.atomId === result.splitAtomId);
              if (splitIdx >= 0) {
                const [removed] = placements.splice(splitIdx, 1);
                const newSpread = createSpread(
                  spreadPlan.length, spread.spreadType, spread.weekIndex,
                );
                newSpread[side].push(removed);

                // Insert after current spread
                const currentIdx = spreadPlan.indexOf(spread);
                spreadPlan.splice(currentIdx + 1, 0, newSpread);
                recordSplit(
                  diagnostics, result.splitAtomId,
                  spread.spreadIndex, newSpread.spreadIndex,
                );
              }
            }

            // Flag unresolved overflow
            if (!result.resolved && !result.splitAtomId) {
              for (const p of placements) {
                const h = p.measuredHeight || p.estimatedHeight;
                if (h > PAGE_BUDGET.heightPx) {
                  recordUnresolvedOverflow(
                    diagnostics, p.atomId, h - PAGE_BUDGET.heightPx, side,
                  );
                }
              }
            }
          }
        }
      }

      if (anyOverflow) revisionsApplied++;
      else break;
    }

    diagnostics.revisionPasses = revisionsApplied;

    // Re-index spreads and recount pages
    let pageCount = 0;
    for (let i = 0; i < spreadPlan.length; i++) {
      spreadPlan[i].spreadIndex = i;
      if (spreadPlan[i].left.length > 0)  pageCount++;
      if (spreadPlan[i].right.length > 0) pageCount++;
    }
    diagnostics.totalPages   = pageCount;
    diagnostics.totalSpreads = spreadPlan.length;

    // Record per-spread usage
    for (const spread of spreadPlan) {
      const leftHeight  = spread.left.reduce(
        (s, p) => s + (p.measuredHeight || p.estimatedHeight), 0,
      );
      const rightHeight = spread.right.reduce(
        (s, p) => s + (p.measuredHeight || p.estimatedHeight), 0,
      );
      recordSpreadUsage(
        diagnostics, spread.spreadIndex,
        `${Math.round(leftHeight / PAGE_BUDGET.heightPx * 100)}%`,
        `${Math.round(rightHeight / PAGE_BUDGET.heightPx * 100)}%`,
        spread.left.length,
        spread.right.length,
      );
    }

  } finally {
    destroy();
  }

  return { spreadPlan, diagnostics };
}
