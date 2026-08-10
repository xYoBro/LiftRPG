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
import {
  resolvePageOverflow, MAX_REVISIONS, MAX_DENSITY, OVERFLOW_PROGRESS_EPSILON_PX,
} from './density-solver.js';
import {
  createMeasurementRoot, measureAtom, measurePlacementsPage,
} from './measurement-harness.js';
import {
  createDiagnostics, recordAdjustment, recordSplit,
  recordUnresolvedOverflow, recordSpreadUsage, recordAtomMetrics,
  recordWarning, recordRepack,
} from './diagnostics.js';
import { getMechanicSlotWidthPx, getHalfWidthTypes } from '../mechanic-layout.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Default section ordering. Adapters can override this to change
 * the top-level structure of the booklet.
 */
const DEFAULT_SECTION_ORDER = [
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

function estimateAtomHeight(atom, density = ESTIMATE_DENSITY, halfWidthTypes = null) {
  const def = getAtomDefinition(atom.type);
  if (def) {
    const est = def.estimate(atom.data, density);
    // Use minHeight for packing — lets more atoms fit per page.
    // The measurement harness refines actual height post-plan.
    //
    // Width scale factor: half-width atoms (232px vs 470px) wrap text
    // more, increasing height by ~40%. Use the shared mechanic layout
    // contract (halfWidthTypes) when page context is available;
    // otherwise fall back to footprint.cols for non-mechanic atoms.
    const isHalfWidth = halfWidthTypes
      ? halfWidthTypes.has(atom.type)
      : ((def.footprint && def.footprint.cols) || 2) === 1;
    const widthScaleFactor = isHalfWidth ? 1.4 : 1.0;
    return Math.round(est.minHeight * widthScaleFactor);
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
// Padding pages are domain content; callers pass their own spec via
// options.paddingAtom (render.js does). The default preserves the legacy
// LiftRPG filler for estimate-only callers that predate the option.
const DEFAULT_PADDING_ATOM = { type: 'notes-grid', data: { variant: 'dot' } };

function paddingPlacement(spec, id, sequence) {
  return createPlacement({
    type:         spec.type,
    id,
    group:        'padding',
    section:      'padding',
    sequence,
    sizeHint:     'full-page',
    pageAffinity: 'either',
    data:         spec.data || {},
  });
}

function createSpread(spreadIndex, spreadType, mergeKey = null) {
  return {
    spreadIndex,
    spreadType,
    mergeKey,
    left:  [],
    right: [],
  };
}

/**
 * Create an atom placement entry for a spread's left or right page.
 */
function createPlacement(atom, density = ESTIMATE_DENSITY, halfWidthTypes = null) {
  return {
    atomId:          atom.id,
    type:            atom.type,
    density,
    estimatedHeight: estimateAtomHeight(atom, density, halfWidthTypes),
    measuredHeight:  null,
    data:            atom.data,
    sizeHint:        atom.sizeHint,
    atom,   // back-reference to full atom descriptor
  };
}

function placementMustOwnPage(placement) {
  const atom = placement && placement.atom ? placement.atom : null;
  return !!(atom && atom.mustOwnPage);
}

function placementLocksPage(placement) {
  if (!placement) return false;

  const atom = placement.atom || {};
  const definition = getAtomDefinition(placement.type);
  return placementMustOwnPage(placement)
    || atom.sizeHint === 'full-page'
    || !(definition && definition.canShare);
}

/**
 * Sum estimated heights of placements on a page side.
 */
function pageEstimatedHeight(placements) {
  return placements.reduce((sum, p) => sum + p.estimatedHeight, 0);
}

function isPaddingPlacement(placement) {
  const atom = placement && placement.atom ? placement.atom : {};
  return atom.section === 'padding' || atom.group === 'padding';
}

function isSinglePagePreferredPlacement(placement) {
  const policy = placement && placement.atom ? placement.atom.groupPolicy : null;
  return !!policy && policy.mode === 'single-page-preferred';
}

function sameGroupPlacements(placements, group) {
  return placements.length > 0
    && placements.every((placement) => placement.atom && placement.atom.group === group);
}

function prunePaddingPlacements(spreadPlan) {
  for (const spread of spreadPlan) {
    spread.left = spread.left.filter((placement) => !isPaddingPlacement(placement));
    spread.right = spread.right.filter((placement) => !isPaddingPlacement(placement));
  }

  for (let i = spreadPlan.length - 1; i >= 0; i--) {
    if (spreadPlan[i].left.length === 0 && spreadPlan[i].right.length === 0) {
      spreadPlan.splice(i, 1);
    }
  }
}

function countPages(spreadPlan) {
  let pageCount = 0;
  for (const spread of spreadPlan) {
    if (spread.left.length > 0) pageCount++;
    if (spread.right.length > 0) pageCount++;
  }
  return pageCount;
}

function countPaddingPages(spreadPlan) {
  let pageCount = 0;
  for (const spread of spreadPlan) {
    if (spread.left.some(isPaddingPlacement)) pageCount++;
    if (spread.right.some(isPaddingPlacement)) pageCount++;
  }
  return pageCount;
}

// ---------------------------------------------------------------------------
// Print-order walk — ONE implementation of the empty-between invariant
// ---------------------------------------------------------------------------

/**
 * Flatten the plan into printed page order: for each spread, the left page then
 * the right page. This is the order the booklet prints in, the order
 * `scanContinuationDiagnostics` measures, and the order the `printedAtomOrder`
 * pin records.
 *
 * @param {object[]} spreadPlan
 * @returns {Array<{spread: object, side: 'left'|'right'}>}
 */
function flattenPagesInPrintOrder(spreadPlan) {
  const flatPages = [];
  for (const spread of spreadPlan) {
    for (const side of ['left', 'right']) {
      flatPages.push({ spread, side });
    }
  }
  return flatPages;
}

/** Live placements array for a flattened page (mutated in place by callers). */
function pagePlacementsOf(flatPage) {
  return flatPage.spread[flatPage.side];
}

/**
 * Index of the next flattened page at or after `fromIndex` that has printed
 * content, or -1.
 *
 * THE INVARIANT THIS ENCODES (Charter inv. 5): every page skipped on the way is
 * EMPTY, so moving content between the page you started from and the page this
 * returns cannot jump any printed content — the printed atom order is preserved
 * by construction. Any pass that moves atoms between two pages must reach the
 * second page through this walk, never by index arithmetic on one side of the
 * book: stepping spread-to-spread on a single side is blind to the opposite
 * page of the spreads in between, which is exactly the 2026-08-07 compaction
 * reorder the `printedAtomOrder` pin exists to catch.
 *
 * Both Step 4 (whole-page compaction) and Step 4b (repack windows) walk here.
 *
 * @param {Array<{spread: object, side: string}>} flatPages
 * @param {number} fromIndex
 * @returns {number}
 */
function nextPrintedPageIndex(flatPages, fromIndex) {
  for (let i = fromIndex; i < flatPages.length; i++) {
    if (pagePlacementsOf(flatPages[i]).length > 0) return i;
  }
  return -1;
}

function removeEmptySpreads(spreadPlan) {
  for (let i = spreadPlan.length - 1; i >= 0; i--) {
    if (spreadPlan[i].left.length === 0 && spreadPlan[i].right.length === 0) {
      spreadPlan.splice(i, 1);
    }
  }
}

function reindexSpreads(spreadPlan) {
  for (let i = 0; i < spreadPlan.length; i++) {
    spreadPlan[i].spreadIndex = i;
  }
}

function collapseSinglePagePreferredGroups(spreadPlan) {
  const collapsedKeys = new Set();

  for (let i = 0; i < spreadPlan.length; i++) {
    for (const side of ['left', 'right']) {
      const placements = spreadPlan[i][side];
      if (placements.length === 0 || !isSinglePagePreferredPlacement(placements[0])) continue;

      const group = placements[0].atom && placements[0].atom.group;
      if (!group || !sameGroupPlacements(placements, group)) continue;

      const collapseKey = `${group}:${side}`;
      if (collapsedKeys.has(collapseKey)) continue;
      collapsedKeys.add(collapseKey);

      for (let j = i + 1; j < spreadPlan.length; j++) {
        const nextPlacements = spreadPlan[j][side];
        if (nextPlacements.length === 0) continue;
        if (!sameGroupPlacements(nextPlacements, group)) break;

        placements.push(...nextPlacements);
        nextPlacements.length = 0;
      }
    }
  }

  removeEmptySpreads(spreadPlan);
  reindexSpreads(spreadPlan);
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
 * @param {*} mergeKey — spreads with different keys never merge in compaction
 * @param {'spread'|'page'} planningUnit
 * @returns {object[]} array of spread descriptors
 */
function binGroupIntoSpreads(groupAtoms, startSpreadIndex, spreadType, mergeKey, planningUnit) {
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

  // ── Pre-compute half-width types per side ────────────────────
  // Uses the shared mechanic layout contract so estimate-phase width
  // scaling matches actual render width (balanced → half, dominant → full).
  const leftHalfWidthTypes  = getHalfWidthTypes(leftAtoms);
  const rightHalfWidthTypes = getHalfWidthTypes(rightAtoms);

  // ── Bin atoms into pages (shared helper) ────────────────────
  // Non-shareable atoms (full-page, canShare:false) get their own
  // page via forced breaks before and after.
  function binToPages(atoms, halfWidthTypes) {
    const pages = [];
    let current = [];
    for (const atom of atoms) {
      const placement = createPlacement(atom, ESTIMATE_DENSITY, halfWidthTypes);
      const ownPage = atom.mustOwnPage || atom.sizeHint === 'full-page' || !getAtomDefinition(atom.type)?.canShare;

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

  const leftPages  = binToPages(leftAtoms, leftHalfWidthTypes);
  const rightPages = binToPages(rightAtoms, rightHalfWidthTypes);

  // ── Distribute 'either' atoms into pages with room ─────────
  //
  // ORDER SAFETY (Charter inv. 5 — atoms keep their relative sequence).
  //
  // This pass used to be a plain first-fit run independently, per atom, over
  // every page from the front. That reorders same-group content two ways, both
  // of which were live in the corpus:
  //
  //   1. FRONTIER VIOLATION — an atom that fits nowhere opens a NEW page at the
  //      end of the run, and the next atom, being smaller, then slides into an
  //      EARLIER page that had just rejected its predecessor. variety-02 week 2:
  //      companion-0 (memory-slots) opened its own page, then companion-1
  //      (percentile-stat) fitted onto the oracle/map page in front of it, so
  //      the book printed companion-1 before companion-0.
  //
  //   2. BRACKET VIOLATION — an atom lands on a page that already prints BEFORE
  //      pages holding lower-sequence atoms. The whole fragment archive
  //      interleaved this way: standalone fragments lock a page each, so every
  //      shareable fragment behind one fell back into the first shareable page
  //      in the run and printed frag-0, frag-2, frag-4, frag-6, frag-1, …
  //      (variety-02; six of eight fixtures had a shuffled archive).
  //
  // Two anchors make the pass order-preserving without giving up gap filling.
  // Both are pure restrictions on the old candidate set — every placement the
  // new pass accepts, the old pass would also have accepted:
  //
  //   FRONTIER — candidate pages are never below the printed rank used by the
  //   previous 'either' atom, so two 'either' atoms can never exchange places.
  //   A newly opened page is opened at or after the frontier for the same
  //   reason (left pages can outrun right pages within a group).
  //
  //   BRACKET — an atom may only join a page whose atoms all sort BEFORE it and
  //   whose later pages in the same side stream all sort AFTER it. Appending to
  //   the end of such a page is that atom's true position in the stream;
  //   anything else jumps printed content.
  //
  // Order is compared by position within `groupAtoms` — the ordering the
  // planner itself produced (section, then sequence) — not by raw `sequence`,
  // so cross-section groups compare correctly.
  const groupOrderIndex = new Map();
  groupAtoms.forEach((atom, index) => { groupOrderIndex.set(atom.id, index); });
  const orderOf = (placement) => {
    const index = groupOrderIndex.get(placement.atomId);
    return index === undefined ? -1 : index;
  };

  // Spreads pair leftPages[i] with rightPages[i], and a spread prints its left
  // page before its right page — so this is the printed position of a page slot.
  const printedRank = (side, index) => index * 2 + (side === 'right' ? 1 : 0);

  let frontierRank = -1;

  for (const atom of eitherAtoms) {
    const placement = createPlacement(atom, ESTIMATE_DENSITY, rightHalfWidthTypes);
    const ownPage = atom.mustOwnPage || atom.sizeHint === 'full-page' || !getAtomDefinition(atom.type)?.canShare;
    const atomOrder = groupOrderIndex.get(atom.id) ?? -1;
    let placed = false;

    if (!ownPage) {
      // Right pages are still preferred over left (they tend to have more
      // room); the guards below, not the scan order, are what keep it safe.
      const candidates = [];
      for (let i = 0; i < rightPages.length; i++) candidates.push({ side: 'right', index: i, stream: rightPages });
      for (let i = 0; i < leftPages.length; i++)  candidates.push({ side: 'left',  index: i, stream: leftPages });

      for (const candidate of candidates) {
        const page = candidate.stream[candidate.index];
        if (printedRank(candidate.side, candidate.index) < frontierRank) continue;
        if (page.some(placementLocksPage)) continue;
        // Everything already on the page must sort before this atom …
        if (page.some((p) => orderOf(p) > atomOrder)) continue;
        // … and everything printed later in this stream must sort after it.
        let bracketed = true;
        for (let j = candidate.index + 1; j < candidate.stream.length; j++) {
          if (candidate.stream[j].some((p) => orderOf(p) < atomOrder)) { bracketed = false; break; }
        }
        if (!bracketed) continue;
        if (pageEstimatedHeight(page) + placement.estimatedHeight > budget) continue;

        page.push(placement);
        frontierRank = printedRank(candidate.side, candidate.index);
        placed = true;
        break;
      }
    }

    if (!placed) {
      // New page (right side for either-affinity overflow), opened at or after
      // the frontier so it cannot print before an 'either' atom already placed
      // further along the left stream.
      while (printedRank('right', rightPages.length) < frontierRank) rightPages.push([]);
      rightPages.push([placement]);
      frontierRank = printedRank('right', rightPages.length - 1);
    }
  }

  // ── Combine into spreads: pair left[i] with right[i] ───────
  const spreads = [];
  const maxSpreads = Math.max(leftPages.length, rightPages.length);

  for (let i = 0; i < maxSpreads; i++) {
    const spread = createSpread(startSpreadIndex + spreads.length, spreadType, mergeKey);
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
    paddingAtom     = DEFAULT_PADDING_ATOM,
  } = options;

  const diag = createDiagnostics();

  // Phase 1: Order atoms
  const ordered = orderAtoms(atoms, sectionOrder);

  // Phase 2: Group by affinity and bin into spreads
  const groups     = groupByAffinity(ordered);
  const spreadPlan = [];

  for (const [groupKey, groupAtoms] of groups) {
    const spreadType = groupAtoms[0].section || 'body';
    // First-class IR field — the engine never reads domain payloads (charter).
    const mergeKey   = groupAtoms[0].mergeKey ?? null;

    const groupSpreads = binGroupIntoSpreads(
      groupAtoms,
      spreadPlan.length,
      spreadType,
      mergeKey,
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
      paddingSpread.left.push(paddingPlacement(paddingAtom, `padding-${i}`, i));
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
// rowGroup diagnostics — post-measurement scan
// ---------------------------------------------------------------------------

/**
 * Scan a finalised spread plan for orphaned or inconsistent rowGroup usage.
 *
 * Emits warnings (not errors) into the diagnostics collector. Does not change
 * layout behaviour — orphaned atoms still render full-width as designed.
 *
 * Detected conditions:
 * - **orphan**: a cols:1 atom declares rowGroup but no same-page partner
 *   shares that rowGroup value (the atom renders full-width silently).
 * - **mismatch**: on a page with both cipher-panel and map-panel, the two
 *   carry different non-null rowGroup values (balanced pairing is suppressed).
 *
 * @param {object[]} spreadPlan
 * @param {object} diagnostics — DiagnosticsCollector
 */
function scanRowGroupDiagnostics(spreadPlan, diagnostics) {
  for (const spread of spreadPlan) {
    for (const side of ['left', 'right']) {
      const placements = spread[side];
      if (!placements || placements.length === 0) continue;

      // Collect rowGroup membership per page side
      const byRowGroup = new Map();
      for (const p of placements) {
        const rg = p.atom && p.atom.rowGroup;
        if (!rg) continue;
        if (!byRowGroup.has(rg)) byRowGroup.set(rg, []);
        byRowGroup.get(rg).push(p);
      }

      // Check for orphans: a rowGroup with only one cols:1 member
      for (const [rg, members] of byRowGroup) {
        const halfMembers = members.filter(function (p) {
          const def = getAtomDefinition(p.type);
          return ((def && def.footprint && def.footprint.cols) || 2) === 1;
        });
        if (halfMembers.length === 1) {
          const orphan = halfMembers[0];
          recordWarning(diagnostics, 'rowGroup-orphan',
            `${orphan.type} (${orphan.atomId}) has rowGroup "${rg}" but no partner on spread ${spread.spreadIndex} ${side}`,
            {
              atomId: orphan.atomId,
              type: orphan.type,
              rowGroup: rg,
              spreadIndex: spread.spreadIndex,
              side,
            },
          );
        }
      }

      // Check for mismatch: exactly two rowGroup-declaring placements that
      // could have paired but declare different groups — balanced pairing
      // suppressed. Type-agnostic: the engine knows rowGroups, not domains.
      const declared = placements.filter(function (p) { return p.atom && p.atom.rowGroup; });
      if (declared.length === 2 && declared[0].atom.rowGroup !== declared[1].atom.rowGroup) {
        recordWarning(diagnostics, 'rowGroup-mismatch',
          `${declared[0].type} and ${declared[1].type} on spread ${spread.spreadIndex} ${side} have different rowGroups ("${declared[0].atom.rowGroup}" vs "${declared[1].atom.rowGroup}") — balanced pairing suppressed`,
          {
            atomIds: [declared[0].atomId, declared[1].atomId],
            types: [declared[0].type, declared[1].type],
            rowGroups: [declared[0].atom.rowGroup, declared[1].atom.rowGroup],
            spreadIndex: spread.spreadIndex,
            side,
          },
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Continuation chain diagnostics (post-measurement, no layout changes)
// ---------------------------------------------------------------------------

/**
 * Scan the final spread plan for continuation chain issues.
 *
 * Emits warnings for:
 * - `continuation-orphan`: atom declares continuationOf but the
 *   predecessor atom id does not exist in the plan.
 * - `continuation-non-consecutive`: atom and its predecessor both
 *   exist but do not land on consecutive printed pages.
 * - `engine-move-continuation-break`: a continuation chain that was
 *   initially consecutive became non-consecutive because the engine
 *   moved an atom (recorded in diagnostics.atomsSplit).
 *
 * @param {object[]} spreadPlan — finalized spread plan
 * @param {object}   diagnostics — diagnostics collector
 */
// Exported for test harness use (window.__v2ScanContinuation).
export function scanContinuationDiagnostics(spreadPlan, diagnostics) {
  // Build a map from atomId → { printedPage, spreadIndex, side }
  // Printed page order: iterate spreads in order, left then right.
  const atomPageMap = new Map();
  let printedPage = 0;
  for (const spread of spreadPlan) {
    for (const side of ['left', 'right']) {
      const placements = spread[side];
      if (!placements || placements.length === 0) continue;
      for (const p of placements) {
        atomPageMap.set(p.atomId, {
          printedPage,
          spreadIndex: spread.spreadIndex,
          side,
        });
      }
      printedPage++;
    }
  }

  // Collect atoms that declare continuationOf
  const continuationAtoms = [];
  for (const spread of spreadPlan) {
    for (const side of ['left', 'right']) {
      for (const p of spread[side]) {
        const contOf = p.atom && p.atom.continuationOf;
        if (contOf) {
          continuationAtoms.push({
            atomId: p.atomId,
            type: p.type,
            continuationOf: contOf,
            adjacency: (p.atom && p.atom.continuationAdjacency) || null,
          });
        }
      }
    }
  }

  if (continuationAtoms.length === 0) return;

  // Build set of atom ids that were moved by the engine (split-to-new-spread)
  const movedAtomIds = new Set(
    (diagnostics.atomsSplit || []).map(s => s.atomId)
  );

  // Check each continuation atom
  for (const cont of continuationAtoms) {
    const predecessorLoc = atomPageMap.get(cont.continuationOf);
    const continuationLoc = atomPageMap.get(cont.atomId);

    // Orphan: predecessor not in the plan (applies regardless of adjacency policy)
    if (!predecessorLoc) {
      recordWarning(diagnostics, 'continuation-orphan',
        `${cont.atomId} declares continuationOf "${cont.continuationOf}" but predecessor not found in plan`,
        {
          atomId: cont.atomId,
          type: cont.type,
          continuationOf: cont.continuationOf,
          adjacency: cont.adjacency,
        },
      );
      continue;
    }

    // Both exist — check adjacency/ordering based on declared policy
    if (!continuationLoc) continue; // shouldn't happen, but guard

    const gap = continuationLoc.printedPage - predecessorLoc.printedPage;

    // 'required': must be on the immediately next printed page
    if (cont.adjacency === 'required' && gap !== 1) {
      const isEngineMove = movedAtomIds.has(cont.atomId)
        || movedAtomIds.has(cont.continuationOf);

      const category = isEngineMove
        ? 'engine-move-continuation-break'
        : 'continuation-non-consecutive';
      const verb = isEngineMove ? 'engine move broke chain' : 'not on consecutive pages';

      recordWarning(diagnostics, category,
        `${cont.atomId} → ${cont.continuationOf}: ${verb} (page ${predecessorLoc.printedPage} → ${continuationLoc.printedPage}, gap ${gap})`,
        {
          atomId: cont.atomId,
          type: cont.type,
          continuationOf: cont.continuationOf,
          adjacency: cont.adjacency,
          predecessorPage: predecessorLoc.printedPage,
          continuationPage: continuationLoc.printedPage,
          gap,
          predecessorSpreadIndex: predecessorLoc.spreadIndex,
          predecessorSide: predecessorLoc.side,
          continuationSpreadIndex: continuationLoc.spreadIndex,
          continuationSide: continuationLoc.side,
          causedByEngineMove: isEngineMove,
        },
      );
      continue;
    }

    // 'ordered': must print after predecessor (gap > 0), but gaps are fine
    if (cont.adjacency === 'ordered' && gap <= 0) {
      recordWarning(diagnostics, 'continuation-order-violation',
        `${cont.atomId} → ${cont.continuationOf}: prints before or on same page as predecessor (page ${predecessorLoc.printedPage} → ${continuationLoc.printedPage})`,
        {
          atomId: cont.atomId,
          type: cont.type,
          continuationOf: cont.continuationOf,
          adjacency: cont.adjacency,
          predecessorPage: predecessorLoc.printedPage,
          continuationPage: continuationLoc.printedPage,
          gap,
          predecessorSpreadIndex: predecessorLoc.spreadIndex,
          predecessorSide: predecessorLoc.side,
          continuationSpreadIndex: continuationLoc.spreadIndex,
          continuationSide: continuationLoc.side,
        },
      );
      continue;
    }

    // null adjacency: no adjacency/order warning (orphan check above still applies)
  }
}

// ---------------------------------------------------------------------------
// Revision loop — measure pages, resolve overflow, shed when density is spent
// ---------------------------------------------------------------------------

/**
 * Run the bounded overflow-revision loop over every page in the plan.
 *
 * Extracted verbatim from planAndMeasure so the same machinery — stall
 * detection, the D76 max-density probe, D77 stall escalation, shedding,
 * unresolved flagging — runs both on the first pass and again after the
 * repack pass (repacked pages must be solved exactly like first-pass pages).
 *
 * @param {object[]} spreadPlan
 * @param {HTMLElement} stack — measurement stack
 * @param {number} effectiveBudget — real CSS boundary height (px)
 * @param {object} diagnostics
 * @param {Set<string>} unresolvedAtomIds — shared across invocations so an
 *   atom is never double-flagged
 * @returns {number} revision passes applied
 */
function runRevisionLoop(spreadPlan, stack, effectiveBudget, diagnostics, unresolvedAtomIds) {
  let revisionsApplied = 0;

  // Overflow measured for each page on the previous pass, so the solver can
  // be told when its density adjustments stopped buying anything (see the
  // measurement veto in density-solver.resolvePageOverflow).
  //
  // Keyed on the placements ARRAY, not the spread index: splits splice new
  // spreads into the plan mid-loop and `spreadIndex` is not re-indexed until
  // afterwards, so indices are neither unique nor stable during the loop.
  // The array object is — splice and push mutate it in place.
  const lastOverflowPx = new WeakMap();

  for (let pass = 0; pass < MAX_REVISIONS; pass++) {
    let anyResolvableOverflow = false;

    for (const spread of spreadPlan) {
      for (const side of ['left', 'right']) {
        const placements = spread[side];
        if (placements.length === 0) continue;

        // Skip pages where every atom is already flagged unresolvable
        if (placements.every(p => unresolvedAtomIds.has(p.atomId))) continue;

        const pageMeasurement = measurePlacementsPage(
          stack,
          placements,
          spread.spreadType,
        );
        const overflowPx = pageMeasurement.overflowHeight;

        if (overflowPx > 2) {
          // Did the previous pass's adjustments actually move this page?
          const previousOverflowPx = lastOverflowPx.get(placements);
          const stalled = previousOverflowPx !== undefined
            && overflowPx > previousOverflowPx - OVERFLOW_PROGRESS_EPSILON_PX;
          lastOverflowPx.set(placements, overflowPx);

          // A stalled pass is evidence, not proof. Density is a ladder of
          // rendering thresholds, not a ramp: a step that lands between two
          // rungs changes nothing, and the next step may still cross one. So
          // ask the page itself the only question that settles it — does it
          // STILL overflow with every atom at maximum density? If it does,
          // no density path saves this composition and the solver should
          // shed instead of spending the remaining passes. If it does not,
          // the last step merely fell short and the solver should keep going.
          //
          // Measured, never applied: the probe renders a shallow copy at max
          // density and throws it away. Only stalled pages pay for it.
          let densityExhausted = false;
          if (stalled) {
            const maxDensityProbe = measurePlacementsPage(
              stack,
              placements.map(p => ({ ...p, density: MAX_DENSITY })),
              spread.spreadType,
            );
            densityExhausted = maxDensityProbe.overflowHeight > 2;
          }

          const result = resolvePageOverflow(
            placements.map(p => ({
              atomId:  p.atomId,
              type:    p.type,
              density: p.density,
              data:    p.atom?.data,
            })),
            overflowPx,
            effectiveBudget,
            { densityExhausted, stalled },
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
              const remeasure = measureAtom(
                stack, placement.atom, placement.density,
                getMechanicSlotWidthPx(placement, placements),
              );
              placement.measuredHeight = remeasure.measuredHeight;
            }
          }

          // Handle split — break the page and move the whole tail to a new spread.
          //
          // ORDER SAFETY (Charter inv. 5): shedding is a page BREAK, not an
          // extraction. The solver picks WHERE the page breaks (the last atom it
          // is allowed to move); the planner moves that atom and everything
          // after it, so the printed sequence is preserved by construction.
          //
          // Extracting the single chosen atom used to jump it past its own
          // page-mates whenever the solver had to skip a trailing
          // `canSplitAway: false` atom: a week page of
          // [header, s0, s1, s2, footer] shed s2 onto the NEXT page and printed
          // the week footer before the session card it belongs to. The break
          // point is guaranteed to be a proper suffix (index > 0), so the page
          // always keeps content and the shed always reduces its atom count.
          if (result.splitAtomId) {
            const splitIdx = placements.findIndex(p => p.atomId === result.splitAtomId);
            if (splitIdx > 0) {
              const removed = placements.splice(splitIdx);
              // Index = actual insertion position (reindexSpreads runs later;
              // recordSplit must log where the spread really lands).
              const newSpread = createSpread(
                spread.spreadIndex + 1, spread.spreadType, spread.mergeKey,
              );
              newSpread[side].push(...removed);

              // Insert after current spread
              const currentIdx = spreadPlan.indexOf(spread);
              spreadPlan.splice(currentIdx + 1, 0, newSpread);
              // Every moved atom is recorded — scanContinuationDiagnostics reads
              // this set to tell "the engine moved it" from "it was authored
              // that way", and passengers moved as much as the break atom did.
              for (const movedPlacement of removed) {
                recordSplit(
                  diagnostics, movedPlacement.atomId,
                  spread.spreadIndex, newSpread.spreadIndex,
                );
              }
            }
          }

          // Flag unresolved overflow (only once per atom)
          if (!result.resolved && !result.splitAtomId) {
            const culprit = placements.reduce((largest, placement) => {
              if (!largest) return placement;
              const largestHeight = largest.measuredHeight || largest.estimatedHeight || 0;
              const placementHeight = placement.measuredHeight || placement.estimatedHeight || 0;
              return placementHeight > largestHeight ? placement : largest;
            }, null);

            if (culprit && !unresolvedAtomIds.has(culprit.atomId)) {
              unresolvedAtomIds.add(culprit.atomId);
              recordUnresolvedOverflow(
                diagnostics, culprit.atomId, overflowPx, side,
              );
            }
          }
        }
      }
    }

    if (anyResolvableOverflow) revisionsApplied++;
    else break;
  }

  return revisionsApplied;
}

// ---------------------------------------------------------------------------
// Repack (flow) pass — reclaim space fragmented by shed cascades
// ---------------------------------------------------------------------------

/**
 * Re-flow shareable pages after the shed set has stabilized.
 *
 * THE DEFECT THIS CLOSES: initial packing bins atoms at their max-compression
 * estimate (minHeight) while pages render at their placement density, so full
 * pages are systematically optimistic. When measurement exposes the overflow,
 * the solver sheds atoms one at a time, each onto a NEW spread — and nothing
 * ever packs subsequent atoms back into the freed or newly-created space. A
 * cascade leaves runs of near-empty singleton pages (D77: variety-02 40→44).
 * Whole-page compaction (Step 4) cannot fix these because it merges entire
 * pages or nothing; a cascade typically needs a PARTIAL move (three pages of
 * 1/3/1 atoms re-flowed as 3/2).
 *
 * MECHANISM: find windows of consecutive same-side pages and greedily re-flow
 * their placements — in existing order — into the fewest pages that fit at
 * their CURRENT densities, using measurePlacementsPage as the fit oracle (the
 * same rendered-page measurement the planner trusts everywhere else, so row
 * pairing, zone chrome, and shell decoration are all priced in).
 *
 * ORDER SAFETY (Charter inv. 5 — printed atom order is pinned): a window is a
 * run of pages that share side, spreadType, and mergeKey, where every page
 * BETWEEN consecutive members in the flattened print order (left page then
 * right page, per spread) is empty. Flowing content among member pages
 * therefore cannot move any atom across other printed content: within the
 * window the concatenation order is preserved, and no printed page exists
 * between members. Page boundaries move; the atom sequence cannot.
 *
 * CONSTRAINT HANDLING:
 * - mustOwnPage / full-page / canShare:false pages never enter a window
 *   (placementLocksPage) — the adapter's page locks are absolute.
 * - mergeKey equality bounds every window: week content never flows across
 *   the adapter's declared compaction boundary (the engine never reads
 *   data.weekIndex — mergeKey IS the declaration).
 * - rowGroup: a unit is the closed same-page SPAN from the first to the last
 *   member of a rowGroup, interleaved non-members included — because
 *   groupPlacementsIntoRows pairs same-rowGroup cols:1 members regardless of
 *   adjacency, and the adapter's canonical emission is non-adjacent (cipher,
 *   oracle, map with cipher+map paired). A flow boundary therefore cannot
 *   separate an existing halves pair, adjacent or not. (Reuniting currently-
 *   orphaned partners onto one page is allowed — the fit oracle prices the
 *   resulting pairing.)
 * - groupPolicy 'single-page-preferred': same-page members of such a group
 *   are span-bundled into one unit too — the flow can merge the group's page
 *   with neighbors but can never split a currently-together group for a
 *   page-count win. Members already separated by shed may be reunited.
 * - zone: routing is per-page composition; the fit oracle renders the real
 *   page (companion zone, labels, worksheets included).
 * - continuationAdjacency: atoms on either end of ANY adjacency pair
 *   ('required' or 'ordered') are excluded from windows outright. 'required'
 *   pins the immediately-next page; 'ordered' forbids same-page as well as
 *   reordering (gap must be > 0), and the flow merges pages — so both modes
 *   are flow barriers. (Belt and braces — every continuation-emitting type
 *   in the corpus is also page-locked via canShare:false.)
 *
 * STRICT IMPROVEMENT ONLY: a window is rewritten only when the re-flow needs
 * FEWER pages. Because every unit boundary of the current layout is available
 * to the greedy flow (cohesion units are built per page, so they never
 * straddle a page boundary of the current layout), the
 * greedy result never needs more pages than a window whose pages currently
 * fit; the guard also protects windows containing unsat pages, where that
 * assumption fails.
 *
 * TERMINATION: this pass is a single linear walk over a fixed placement list —
 * it adds no atoms, runs no solver, and executes exactly once per
 * planAndMeasure. The post-repack revision loop that follows is the same
 * bounded loop as the first (≤ MAX_REVISIONS passes; densities only rise;
 * sheds strictly reduce per-page atom counts), and no further repack follows
 * it — so no repack↔shed cycle can form.
 *
 * @param {object[]} spreadPlan
 * @param {HTMLElement} stack — measurement stack
 * @param {object} diagnostics
 * @returns {number} number of windows rewritten
 */
function repackAfterShedStabilization(spreadPlan, stack, diagnostics) {
  // Atoms bound by ANY continuation-adjacency contract (either endpoint) are
  // flow barriers: their page relationship is load-bearing. 'required' means
  // immediately-next page; 'ordered' means a strictly LATER page — same-page
  // is a violation too (scanContinuationDiagnostics warns on gap <= 0), and
  // the flow merges pages, so 'ordered' atoms must not enter windows either.
  // (Every current continuation emitter is also page-locked via canShare:false;
  // this set is the contract-level guard, not the accident.)
  const adjacencyBoundIds = new Set();
  for (const spread of spreadPlan) {
    for (const side of ['left', 'right']) {
      for (const p of spread[side]) {
        const atom = p.atom || {};
        if (atom.continuationAdjacency && atom.continuationOf) {
          adjacencyBoundIds.add(p.atomId);
          adjacencyBoundIds.add(atom.continuationOf);
        }
      }
    }
  }

  // Flattened page list in print order — the same order the printed booklet
  // and scanContinuationDiagnostics use.
  const flatPages = flattenPagesInPrintOrder(spreadPlan);
  const placementsOf = pagePlacementsOf;

  function pageEligible(pg) {
    const placements = placementsOf(pg);
    return placements.length > 0 && placements.every((p) =>
      !placementLocksPage(p)
      && !isPaddingPlacement(p)
      && !adjacencyBoundIds.has(p.atomId));
  }

  // Window construction: step page to page through nextPrintedPageIndex — the
  // shared print-order walk — so every flattened page between two window
  // members is empty by construction (the order-safety precondition). Stop at
  // the first printed page that differs in side, spreadType, or mergeKey, or is
  // ineligible.
  const windows = [];
  let k = 0;
  while (k < flatPages.length) {
    if (!pageEligible(flatPages[k])) { k++; continue; }
    const win = [flatPages[k]];
    let last = flatPages[k];
    let lastIdx = k;
    for (;;) {
      const nextIdx = nextPrintedPageIndex(flatPages, lastIdx + 1);
      if (nextIdx < 0) break;
      const pg = flatPages[nextIdx];
      if (pg.side === last.side
        && pg.spread.spreadType === last.spread.spreadType
        && pg.spread.mergeKey === last.spread.mergeKey
        && pageEligible(pg)) {
        win.push(pg);
        last = pg;
        lastIdx = nextIdx;
      } else {
        break;
      }
    }
    if (win.length > 1) windows.push(win);
    k = lastIdx + 1;
  }

  let windowsRepacked = 0;

  for (const win of windows) {
    const spreadType = win[0].spread.spreadType;

    // Build flow units per page. A unit is the closed SPAN from the first to
    // the last same-page member of any shared cohesion key, interleaved
    // non-members included, expanded to a fixpoint so overlapping spans merge.
    // Two keys cohere:
    //
    // - rowGroup: groupPlacementsIntoRows pairs same-rowGroup cols:1 members
    //   REGARDLESS of adjacency (TOPOLOGY-CONTRACT), and the adapter's
    //   canonical emission is exactly non-adjacent — cipher and map share a
    //   rowGroup with the oracle between them. Consecutive-only bundling
    //   would split that rendered halves pair; the span cannot, because the
    //   whole [cipher, oracle, map] run rides as one unit in print order.
    // - group where groupPolicy.mode === 'single-page-preferred': members
    //   currently sharing a page move atomically, so a repack can never break
    //   the single-page preference for a mere page-count win. (Members ALREADY
    //   split across pages by shed form per-page units — reuniting them is
    //   allowed and is an improvement for the policy, priced by the oracle.)
    //
    // Left-to-right span expansion is complete: a key's members can never
    // straddle a unit boundary, because the unit containing the first member
    // extends at least to the key's last same-page member.
    const cohesionKeysOf = (placement) => {
      const atom = placement.atom || {};
      const keys = [];
      if (atom.rowGroup) keys.push(`rg:${atom.rowGroup}`);
      if (isSinglePagePreferredPlacement(placement) && atom.group) {
        keys.push(`grp:${atom.group}`);
      }
      return keys;
    };
    const units = [];
    for (const pg of win) {
      const placements = placementsOf(pg);
      const spanEnd = new Map();  // cohesion key -> last index on this page
      placements.forEach((placement, idx) => {
        for (const key of cohesionKeysOf(placement)) spanEnd.set(key, idx);
      });
      let i = 0;
      while (i < placements.length) {
        let end = i;
        for (let j = i; j <= end; j++) {
          for (const key of cohesionKeysOf(placements[j])) {
            const keyEnd = spanEnd.get(key);
            if (keyEnd > end) end = keyEnd;
          }
        }
        units.push(placements.slice(i, end + 1));
        i = end + 1;
      }
    }

    // Greedy measured flow at CURRENT densities: close a page only when the
    // next unit measurably does not fit (same 2px tolerance as the solver).
    const newPages = [];
    let current = [];
    for (const unit of units) {
      if (current.length === 0) {
        current = [...unit];
        continue;
      }
      const candidate = [...current, ...unit];
      const measurement = measurePlacementsPage(stack, candidate, spreadType);
      if (measurement.overflowHeight > 2) {
        newPages.push(current);
        current = [...unit];
      } else {
        current = candidate;
      }
    }
    if (current.length > 0) newPages.push(current);

    // Strict improvement only — see contract comment above.
    if (newPages.length >= win.length) continue;

    // Apply: member pages keep their plan positions; content flows forward;
    // emptied tail pages are dropped later by removeEmptySpreads.
    for (let wi = 0; wi < win.length; wi++) {
      const target = placementsOf(win[wi]);
      target.length = 0;
      if (wi < newPages.length) target.push(...newPages[wi]);
    }

    // Refresh per-placement measurements in the new page context — width
    // resolution depends on page composition (measurement equals render).
    for (let wi = 0; wi < newPages.length; wi++) {
      const pagePlacements = placementsOf(win[wi]);
      for (const placement of pagePlacements) {
        const remeasure = measureAtom(
          stack, placement.atom, placement.density,
          getMechanicSlotWidthPx(placement, pagePlacements),
        );
        placement.measuredHeight = remeasure.measuredHeight;
      }
    }

    windowsRepacked++;
    recordRepack(
      diagnostics, win.length, newPages.length,
      newPages.map((pagePlacements) => pagePlacements.map((p) => p.atomId)),
    );
  }

  return windowsRepacked;
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

  // Restore adapter-declared single-page groups before measurement so the
  // density solver gets a chance to fit the intended page unit.
  collapseSinglePagePreferredGroups(spreadPlan);

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
          const result = measureAtom(
            stack, placement.atom, placement.density,
            getMechanicSlotWidthPx(placement, spread[side]),
          );
          placement.measuredHeight = result.measuredHeight;

          recordAtomMetrics(
            diagnostics, placement.atomId, placement.type,
            placement.estimatedHeight, result.measuredHeight,
            placement.density, side, spread.spreadIndex,
          );
        }
      }
    }

    // Step 3: Revise overflows (extracted loop — see runRevisionLoop)
    const unresolvedAtomIds = new Set();  // Track atoms already flagged
    let revisionsApplied = runRevisionLoop(
      spreadPlan, stack, effectiveBudget, diagnostics, unresolvedAtomIds,
    );

    // Step 4: Compact — merge underfilled sharable pages
    // After measurement, estimates may have over-allocated. Walk spreads and
    // merge consecutive same-side single-atom pages when their measured
    // heights fit together within the page budget.
    //
    // ORDER SAFETY (Charter inv. 5): the look-ahead walks PRINTED pages via
    // nextPrintedPageIndex, not spreads on one side of the book. Stepping
    // spread-to-spread on a single side — as this loop used to — is blind to
    // the opposite page of every intervening spread: merging spread J's left
    // page into spread I's left page pulls its atoms in front of spread I's
    // right page and every page between, which is the 2026-08-07 compaction
    // reorder the `printedAtomOrder` pin exists to catch. Through the shared
    // walk, every page skipped between the two is empty by construction, so
    // there is no printed content to jump. Same invariant, same helper, as the
    // Step 4b repack windows.
    let compactions = 0;
    const compactionPages = flattenPagesInPrintOrder(spreadPlan);
    for (let fi = 0; fi < compactionPages.length; fi++) {
      const page = compactionPages[fi];
      const placements = pagePlacementsOf(page);
      if (placements.length === 0) continue;

      // Only compact sharable atoms
      const allShareable = placements.every(p => {
        return !placementLocksPage(p);
      });
      if (!allShareable) continue;

      // Look ahead for the next PRINTED page — everything skipped is empty.
      let cursor = fi;
      for (;;) {
        const nextIdx = nextPrintedPageIndex(compactionPages, cursor + 1);
        if (nextIdx < 0) break;
        const candidate = compactionPages[nextIdx];

        // The next printed page is on the other side of the book: it is printed
        // content in its own right, so nothing beyond it may be pulled back.
        if (candidate.side !== page.side) break;
        // Must be same section and week to merge (never cross week boundaries)
        if (candidate.spread.spreadType !== page.spread.spreadType) break;
        if (candidate.spread.mergeKey !== page.spread.mergeKey) break;

        const candidatePlacements = pagePlacementsOf(candidate);
        const candidateShareable = candidatePlacements.every(p => {
          return !placementLocksPage(p);
        });
        // A locked page is a hard wall: merging content from beyond it would
        // reorder printed pages (content after the wall pulled before it).
        if (!candidateShareable) break;

        const mergedMeasurement = measurePlacementsPage(
          stack,
          [...placements, ...candidatePlacements],
          page.spread.spreadType,
        );

        if (mergedMeasurement.overflowHeight <= 2) {
          // Merge: move all candidate placements into current page
          placements.push(...candidatePlacements);
          candidatePlacements.length = 0;
          compactions++;
          cursor = nextIdx;
        } else {
          break;  // Won't fit, stop looking
        }
      }
    }

    // Remove empty spreads left by compaction
    if (compactions > 0) {
      removeEmptySpreads(spreadPlan);
    }
    diagnostics.compactions = compactions;

    // Step 4b: Repack after shed stabilization — flow shareable content back
    // into the space shed cascades fragmented (partial moves compaction's
    // whole-page merges cannot express). One round, then normal solving; see
    // repackAfterShedStabilization for the order-safety and termination
    // arguments.
    const repackedWindows = repackAfterShedStabilization(spreadPlan, stack, diagnostics);
    if (repackedWindows > 0) {
      removeEmptySpreads(spreadPlan);

      // Repacked pages re-enter the SAME solve machinery as first-pass pages
      // (stall detection, max-density probe, stall escalation, shedding).
      // The flow only forms pages its fit oracle measured as fitting, so this
      // is expected to no-op — it exists so measurement-equals-render holds by
      // construction, not by assumption. Bounded (≤ MAX_REVISIONS); no repack
      // follows it, so no repack↔shed cycle can form.
      revisionsApplied += runRevisionLoop(
        spreadPlan, stack, effectiveBudget, diagnostics, unresolvedAtomIds,
      );
    }
    diagnostics.revisionPasses = revisionsApplied;

    // Any padding inserted during estimate-only planning is provisional.
    // Remove it before the final recount so imposition is based on the
    // measured post-compaction layout, not stale pre-compaction pages.
    prunePaddingPlacements(spreadPlan);

    // Re-index spreads and recount pages
    reindexSpreads(spreadPlan);
    let pageCount = countPages(spreadPlan);
    // Step 5: Re-pad after compaction (page count may have changed)
    const padTo = options.padToMultipleOf ?? DEFAULT_PAGE_SPEC.padToMultipleOf;
    const postRemainder = pageCount % padTo;
    const postPadding   = postRemainder === 0 ? 0 : padTo - postRemainder;

    if (postPadding > 0) {
      const postInsertIdx = findPaddingInsertIndex(spreadPlan);
      for (let pi = 0; pi < postPadding; pi++) {
        const padSpread = createSpread(spreadPlan.length, 'padding');
        padSpread.left.push(paddingPlacement(
          options.paddingAtom ?? DEFAULT_PADDING_ATOM, `post-padding-${pi}`, pi));
        spreadPlan.splice(postInsertIdx + pi, 0, padSpread);
        pageCount++;
      }
    }

    // Final overflow truth pass: report the pages we are actually about
    // to print, including clipped full-page atoms whose internal content
    // overflows without exceeding the outer frame height.
    for (const spread of spreadPlan) {
      for (const side of ['left', 'right']) {
        const placements = spread[side];
        if (placements.length === 0) continue;

        const finalMeasurement = measurePlacementsPage(
          stack,
          placements,
          spread.spreadType,
        );

        if (finalMeasurement.overflowHeight > 2) {
          const culprit = placements.reduce((largest, placement) => {
            if (!largest) return placement;
            const largestHeight = largest.measuredHeight || largest.estimatedHeight || 0;
            const placementHeight = placement.measuredHeight || placement.estimatedHeight || 0;
            return placementHeight > largestHeight ? placement : largest;
          }, null);

          if (culprit && !unresolvedAtomIds.has(culprit.atomId)) {
            unresolvedAtomIds.add(culprit.atomId);
            recordUnresolvedOverflow(
              diagnostics, culprit.atomId, finalMeasurement.overflowHeight, side,
            );
          }
        }
      }
    }

    diagnostics.totalPages   = pageCount;
    diagnostics.totalSpreads = spreadPlan.length;
    diagnostics.paddingPages = countPaddingPages(spreadPlan);

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

  // Step 5: Scan for rowGroup inconsistencies (post-measurement, no layout changes)
  scanRowGroupDiagnostics(spreadPlan, diagnostics);

  // Step 6: Scan for continuation chain issues (post-measurement, no layout changes)
  scanContinuationDiagnostics(spreadPlan, diagnostics);

  return { spreadPlan, diagnostics };
}
