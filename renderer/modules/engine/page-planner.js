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
/** Default estimation density — moderate compression avoids inflated
 *  notes/padding that would cause the planner to over-allocate pages.
 *  The measurement harness refines actual sizing post-plan. */
const ESTIMATE_DENSITY = 0.6;

function estimateAtomHeight(atom, density = ESTIMATE_DENSITY) {
  const def = getAtomDefinition(atom.type);
  if (def) {
    const est = def.estimate(atom.data, density);
    // Use minHeight for packing — lets more atoms fit per page.
    // The measurement harness refines actual height post-plan.
    return est.minHeight;
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
function createPlacement(atom, density = ESTIMATE_DENSITY) {
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
 * Find the index where padding spreads should be inserted.
 * Inserts before back-matter so the back cover stays last
 * (required for correct saddle-stitch imposition).
 */
function findPaddingInsertIndex(spreadPlan) {
  // Walk backward to find the first back-matter spread
  for (let i = spreadPlan.length - 1; i >= 0; i--) {
    if (spreadPlan[i].spreadType === 'back-matter') {
      return i; // Insert before this spread
    }
  }
  return spreadPlan.length; // No back-matter — append at end
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

  // ── Separate atoms by affinity ──────────────────────────────
  // Full-page and non-shareable atoms are routed by their affinity
  // (not pulled to the front), so boss encounters stay paired with
  // their week's session cards and respect pageAffinity: 'right'.
  const leftAtoms  = [];
  const rightAtoms = [];
  const eitherAtoms = [];

  for (const atom of groupAtoms) {
    const affinity = (planningUnit === 'page') ? 'left' : (atom.pageAffinity || 'either');
    if (affinity === 'left')       leftAtoms.push(atom);
    else if (affinity === 'right') rightAtoms.push(atom);
    else                           eitherAtoms.push(atom);
  }

  // ── Bin atoms into pages (shared helper) ────────────────────
  // Non-shareable atoms (full-page, canShare:false) get their own
  // page via forced breaks before and after.
  function binToPages(atoms) {
    const pages = [];
    let current = [];
    for (const atom of atoms) {
      const placement = createPlacement(atom);
      const ownPage = atom.sizeHint === 'full-page' || !getAtomDefinition(atom.type)?.canShare;

      if (ownPage) {
        // Flush any accumulated shareable atoms
        if (current.length > 0) { pages.push(current); current = []; }
        // Full-page atom gets its own page
        pages.push([placement]);
      } else {
        const currentHeight = pageEstimatedHeight(current);
        if (current.length > 0 && currentHeight + placement.estimatedHeight > budget) {
          pages.push(current);
          current = [];
        }
        current.push(placement);
      }
    }
    if (current.length > 0) pages.push(current);
    return pages;
  }

  const leftPages  = binToPages(leftAtoms);
  const rightPages = binToPages(rightAtoms);

  // ── Distribute 'either' atoms into pages with room ─────────
  for (const atom of eitherAtoms) {
    const placement = createPlacement(atom);
    const ownPage = atom.sizeHint === 'full-page' || !getAtomDefinition(atom.type)?.canShare;
    let placed = false;

    if (!ownPage) {
      // Try right pages first (they tend to have more room)
      for (const page of rightPages) {
        if (pageEstimatedHeight(page) + placement.estimatedHeight <= budget) {
          page.push(placement);
          placed = true;
          break;
        }
      }
      if (!placed) {
        for (const page of leftPages) {
          if (pageEstimatedHeight(page) + placement.estimatedHeight <= budget) {
            page.push(placement);
            placed = true;
            break;
          }
        }
      }
    }
    if (!placed) {
      // New page (right side for either-affinity overflow)
      rightPages.push([placement]);
    }
  }

  // ── Combine into spreads: pair left[i] with right[i] ───────
  const spreads = [];
  const maxSpreads = Math.max(leftPages.length, rightPages.length);

  for (let i = 0; i < maxSpreads; i++) {
    const spread = createSpread(startSpreadIndex + spreads.length, spreadType, weekIndex);
    if (i < leftPages.length)  spread.left  = leftPages[i];
    if (i < rightPages.length) spread.right = rightPages[i];
    spreads.push(spread);
  }

  // Re-index spread positions
  spreads.forEach((s, i) => { s.spreadIndex = startSpreadIndex + i; });

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

  // Pad to multiple of padToMultipleOf.
  // Insert padding BEFORE back-matter so the back cover stays last
  // (critical for saddle-stitch imposition).
  const remainder     = totalPages % padToMultipleOf;
  const paddingNeeded = remainder === 0 ? 0 : padToMultipleOf - remainder;

  if (paddingNeeded > 0) {
    const insertIdx = findPaddingInsertIndex(spreadPlan);
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
      spreadPlan.splice(insertIdx + i, 0, paddingSpread);
      totalPages++;
    }
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
  const { stack, destroy, boundaryHeightPx } = createMeasurementRoot(container);

  // Use the real CSS boundary height for overflow checks.
  // This adapts to the active archetype's print-safe area instead of
  // relying on the static PAGE_BUDGET.heightPx (which may differ).
  const effectiveBudget = boundaryHeightPx || PAGE_BUDGET.heightPx;

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
    const unresolvedAtomIds = new Set();  // Track atoms already flagged

    for (let pass = 0; pass < MAX_REVISIONS; pass++) {
      let anyResolvableOverflow = false;

      for (const spread of spreadPlan) {
        for (const side of ['left', 'right']) {
          const placements = spread[side];
          if (placements.length === 0) continue;

          // Skip pages where every atom is already flagged unresolvable
          if (placements.every(p => unresolvedAtomIds.has(p.atomId))) continue;

          const totalHeight = placements.reduce(
            (s, p) => s + (p.measuredHeight || p.estimatedHeight), 0,
          );
          const overflowPx = totalHeight - effectiveBudget;

          if (overflowPx > 2) {
            const result = resolvePageOverflow(
              placements.map(p => ({
                atomId:  p.atomId,
                type:    p.type,
                density: p.density,
                data:    p.atom?.data,
              })),
              overflowPx,
              effectiveBudget,
            );

            // Apply density adjustments
            if (result.adjustments.length > 0 || result.splitAtomId) {
              anyResolvableOverflow = true;
            }

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

            // Flag unresolved overflow (only once per atom)
            if (!result.resolved && !result.splitAtomId) {
              for (const p of placements) {
                if (unresolvedAtomIds.has(p.atomId)) continue;
                const h = p.measuredHeight || p.estimatedHeight;
                if (h > effectiveBudget) {
                  unresolvedAtomIds.add(p.atomId);
                  recordUnresolvedOverflow(
                    diagnostics, p.atomId, h - effectiveBudget, side,
                  );
                }
              }
            }
          }
        }
      }

      if (anyResolvableOverflow) revisionsApplied++;
      else break;
    }

    diagnostics.revisionPasses = revisionsApplied;

    // Step 4: Compact — merge underfilled sharable pages
    // After measurement, estimates may have over-allocated. Walk spreads and
    // merge consecutive same-side single-atom pages when their measured
    // heights fit together within the page budget.
    let compactions = 0;
    for (let i = 0; i < spreadPlan.length; i++) {
      for (const side of ['left', 'right']) {
        const placements = spreadPlan[i][side];
        if (placements.length === 0) continue;

        // Only compact sharable atoms
        const allShareable = placements.every(p => {
          const def = getAtomDefinition(p.type);
          return def && def.canShare;
        });
        if (!allShareable) continue;

        let runningHeight = placements.reduce(
          (s, p) => s + (p.measuredHeight || p.estimatedHeight), 0,
        );
        if (effectiveBudget - runningHeight < 20) continue;

        // Look ahead for the next spread with same-side sharable atoms
        for (let j = i + 1; j < spreadPlan.length; j++) {
          const candidatePlacements = spreadPlan[j][side];
          if (candidatePlacements.length === 0) continue;

          // Must be same section and week to merge (never cross week boundaries)
          if (spreadPlan[j].spreadType !== spreadPlan[i].spreadType) break;
          if (spreadPlan[j].weekIndex !== spreadPlan[i].weekIndex) break;

          const candidateShareable = candidatePlacements.every(p => {
            const def = getAtomDefinition(p.type);
            return def && def.canShare;
          });
          if (!candidateShareable) continue;

          const candidateHeight = candidatePlacements.reduce(
            (s, p) => s + (p.measuredHeight || p.estimatedHeight), 0,
          );

          if (runningHeight + candidateHeight <= effectiveBudget) {
            // Merge: move all candidate placements into current page
            placements.push(...candidatePlacements);
            candidatePlacements.length = 0;
            compactions++;
            runningHeight += candidateHeight;
            // Keep looking if there's still room
            if (effectiveBudget - runningHeight < 20) break;
          } else {
            break;  // Won't fit, stop looking
          }
        }
      }
    }

    // Remove empty spreads left by compaction
    if (compactions > 0) {
      for (let i = spreadPlan.length - 1; i >= 0; i--) {
        if (spreadPlan[i].left.length === 0 && spreadPlan[i].right.length === 0) {
          spreadPlan.splice(i, 1);
        }
      }
    }
    diagnostics.compactions = compactions;

    // Re-index spreads and recount pages
    let pageCount = 0;
    for (let i = 0; i < spreadPlan.length; i++) {
      spreadPlan[i].spreadIndex = i;
      if (spreadPlan[i].left.length > 0)  pageCount++;
      if (spreadPlan[i].right.length > 0) pageCount++;
    }
    // Step 5: Re-pad after compaction (page count may have changed)
    const padTo = options.padToMultipleOf ?? DEFAULT_PAGE_SPEC.padToMultipleOf;
    const postRemainder = pageCount % padTo;
    const postPadding   = postRemainder === 0 ? 0 : padTo - postRemainder;

    if (postPadding > 0) {
      const postInsertIdx = findPaddingInsertIndex(spreadPlan);
      for (let pi = 0; pi < postPadding; pi++) {
        const padSpread = createSpread(spreadPlan.length, 'padding');
        padSpread.left.push(createPlacement({
          type:         'notes-grid',
          id:           `post-padding-${pi}`,
          group:        'padding',
          section:      'padding',
          sequence:     pi,
          sizeHint:     'full-page',
          pageAffinity: 'either',
          data:         { variant: 'dot' },
        }));
        spreadPlan.splice(postInsertIdx + pi, 0, padSpread);
        pageCount++;
      }
    }

    diagnostics.totalPages   = pageCount;
    diagnostics.totalSpreads = spreadPlan.length;
    diagnostics.paddingPages = postPadding;

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
        `${Math.round(leftHeight / effectiveBudget * 100)}%`,
        `${Math.round(rightHeight / effectiveBudget * 100)}%`,
        spread.left.length,
        spread.right.length,
      );
    }

  } finally {
    destroy();
  }

  return { spreadPlan, diagnostics };
}
