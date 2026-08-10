/**
 * density-solver.js — Continuous density adjustment and overflow resolution
 *
 * Operates on a page's atom list to resolve overflow. Strategies applied in order:
 * 1. Shrink largest atom (increase density on most shrinkable)
 * 2. Shrink multiple atoms (distribute density proportionally)
 * 3. Split (break the page at its last movable atom — that atom and everything
 *    after it move to a new spread)
 * 4. Flag as unresolved (atom too large for page at max density)
 *
 * @module engine/density-solver
 */

import { getAtomDefinition } from './atom-registry.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum density value. Atoms should not be pushed beyond this. */
export const MAX_DENSITY = 1.0;

/** Minimum density step per adjustment. Prevents infinite tiny adjustments. */
const MIN_DENSITY_STEP = 0.05;

/**
 * Step to take on a page that STALLED but still has a density path (the
 * planner's max-density probe came back clean): halfway to MAX_DENSITY.
 *
 * Density is continuous but rendering is not. Every atom's CSS ladder is a
 * handful of thresholds — 0.3 / 0.6 / 0.85 for the mechanic zones — so a step
 * that lands between two rungs changes nothing at all on the page. When the
 * overflow is small relative to an atom's shrink potential, `fraction` rounds
 * to nothing and the step collapses to MIN_DENSITY_STEP, which is smaller than
 * the gap between rungs: the solver can then spend every revision pass walking
 * 0.60 → 0.65 → 0.70 → 0.75 → 0.80 without ever crossing into `tight`, and the
 * page ships clipped. (Measured: variety-02 page 16, 3px of oracle clipped
 * after five passes, one step short of the rung that would have fixed it.)
 *
 * Halving the remaining range crosses the next threshold in at most a couple of
 * passes and still lands on the same tier the minimal crossing would have —
 * it is a coarser search over the same ladder, not a jump to maximum
 * compression. Jumping straight to MAX_DENSITY would also resolve it, and would
 * throw away the "lowest tier that fits" property the ladders were built for.
 */
const STALL_ESCALATION = 0.5;

/** Maximum revision iterations per page. */
export const MAX_REVISIONS = 5;

/**
 * Overflow reduction (px) a revision pass must buy to count as progress.
 *
 * The planner measures each page before and after a pass and passes
 * `densityExhausted` when a pass bought less than this. Half a pixel is below
 * the 2px overflow tolerance the planner already uses, so a pass that moves
 * the page at all still counts.
 */
export const OVERFLOW_PROGRESS_EPSILON_PX = 0.5;

// ---------------------------------------------------------------------------
// Shrink potential
// ---------------------------------------------------------------------------

/**
 * Calculate how much an atom can shrink (in px) by increasing its density.
 *
 * @param {object} atom — must have `.type`, `.data`
 * @param {number} currentDensity — current density (0.0–1.0)
 * @returns {{ shrinkPotentialPx: number, currentHeight: number, minHeight: number }}
 */
export function atomShrinkPotential(atom, currentDensity) {
  const def = getAtomDefinition(atom.type);
  if (!def) return { shrinkPotentialPx: 0, currentHeight: 0, minHeight: 0 };

  const est    = def.estimate(atom.data, currentDensity);
  const estMax = def.estimate(atom.data, MAX_DENSITY);

  return {
    shrinkPotentialPx: Math.max(0, est.preferredHeight - estMax.minHeight),
    currentHeight:     est.preferredHeight,
    minHeight:         estMax.minHeight,
  };
}

// ---------------------------------------------------------------------------
// Split candidacy
// ---------------------------------------------------------------------------

/**
 * Find the BREAK POINT for shedding from an overfull page — the last atom that
 * is allowed to move to a new spread. Atoms whose definition declares
 * `canSplitAway: false` (e.g. week-footer) are skipped.
 *
 * The returned id is a page break, not an extraction: the planner moves this
 * atom AND every atom after it (see the shed handler in page-planner.js). That
 * is what makes shedding order-preserving — Charter inv. 5 — and it is why the
 * break point must be a PROPER suffix (index > 0). Two consequences:
 *
 * - `canSplitAway: false` means "never the atom that leaves on its own", not
 *   "never moves": a week-footer still rides along behind the last session card
 *   it belongs to. Before the suffix rule, skipping backwards over the footer
 *   extracted an interior card and printed the week footer BEFORE that card
 *   (six of eight corpus fixtures did this).
 * - A page whose only legal break point is index 0 cannot shed at all — moving
 *   the whole page resolves nothing and would loop. Such a page falls through
 *   to the density strategies and, if those fail, to unresolved (Charter
 *   failure model).
 *
 * @param {Array<{atomId: string, type: string}>} pageAtoms
 * @returns {string|null} atomId to break at, or null if the page cannot shed
 */
function findSplitCandidateId(pageAtoms) {
  if (pageAtoms.length <= 1) return null;

  for (let index = pageAtoms.length - 1; index >= 1; index -= 1) {
    const candidate = pageAtoms[index];
    const definition = getAtomDefinition(candidate.type);
    if (definition && definition.canSplitAway === false) continue;
    return candidate.atomId;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Overflow resolution
// ---------------------------------------------------------------------------

/**
 * Resolve overflow on a single page by adjusting atom densities.
 *
 * Returns an instruction set: density adjustments to apply, and optionally
 * an atom to split off to a new spread. The caller (page planner) applies
 * these instructions and re-measures.
 *
 * @param {Array<{atomId: string, type: string, density: number, data: object}>} pageAtoms
 * @param {number} overflowPx — pixels over budget (positive = overflowing)
 * @param {number} pageBudgetPx — total available height in px
 * @param {object} [options]
 * @param {boolean} [options.densityExhausted] — the planner measured this page
 *   with every atom at max density and it still overflowed. See the veto below.
 * @param {boolean} [options.stalled] — the previous pass bought less than
 *   OVERFLOW_PROGRESS_EPSILON_PX. With densityExhausted false this means the
 *   step landed between two rungs of the CSS ladder; see STALL_ESCALATION.
 * @returns {{ resolved: boolean, adjustments: Array<{atomId: string, newDensity: number}>, splitAtomId: string|null }}
 */
export function resolvePageOverflow(pageAtoms, overflowPx, pageBudgetPx, options = {}) {
  if (overflowPx <= 0) {
    return { resolved: true, adjustments: [], splitAtomId: null };
  }

  // ── Measurement veto: the density ladder is spent ────────────────────────
  //
  // Strategies 1 and 2 return `resolved: true` optimistically — the comment on
  // Strategy 1 says the measurement pass will verify. Nothing was verifying.
  // The planner re-measured, saw the same overflow, and asked again; the
  // solver, reasoning only from estimates, answered the same way. Five passes
  // of that and the page was reported unresolved with a legal shed still on
  // the table.
  //
  // It is not a corner case. A page of session cards distributes its height by
  // COUNT (`.session-cards > .session-card { flex: 1 1 0 }`), so compressing a
  // card that is not the one overflowing returns exactly zero pixels to the one
  // that is: the shares are equal whatever the contents do. Whenever the
  // overflowing atom is already at max density, every remaining adjustment the
  // estimates offer is provably worthless — and the estimates cannot see it.
  //
  // `densityExhausted` is the planner's answer to the only question that
  // settles it: measured at MAX density, does the page still overflow? When it
  // does, no density path saves this composition, so skip to shedding. A page
  // with nothing to shed falls through, because the Charter failure model
  // still requires an unsplittable page to be driven to max density.
  if (options.densityExhausted) {
    const shedAtomId = findSplitCandidateId(pageAtoms);
    if (shedAtomId) {
      return { resolved: false, adjustments: [], splitAtomId: shedAtomId };
    }
  }

  // Gather shrink potential for every atom that can still shrink
  const potentials = pageAtoms
    .map(atom => ({
      ...atom,
      ...atomShrinkPotential(atom, atom.density),
    }))
    .filter(a => a.shrinkPotentialPx > 0 && a.density < MAX_DENSITY);

  // Sort by most shrinkable first
  potentials.sort((a, b) => b.shrinkPotentialPx - a.shrinkPotentialPx);

  // Early exit: if combined shrink potential cannot cover the overflow,
  // shedding an atom beats compressing every atom on the page. Jump straight
  // to Strategy 3 (split) rather than burning MAX_REVISIONS on futile
  // incremental adjustments.
  //
  // This shortcut applies ONLY when the page has something it can shed. A page
  // that cannot split (single atom, or every atom canSplitAway:false) must
  // still be compressed: shrink potential is derived from atom *estimates*,
  // which are approximations, so it may not veto compression outright. The
  // Charter failure model requires an unsplittable page to render at max
  // density, and the measurement pass — not the estimate — is the authority on
  // whether that resolved the overflow. So fall through to the density
  // strategies below instead of giving up.
  const totalShrinkPotential = potentials.reduce((sum, a) => sum + a.shrinkPotentialPx, 0);
  if (totalShrinkPotential < overflowPx) {
    const splitAtomId = findSplitCandidateId(pageAtoms);
    if (splitAtomId) {
      return { resolved: false, adjustments: [], splitAtomId };
    }
  }

  // The floor on this pass's step. A page that made no measured progress last
  // pass has proved its last step fell between two rungs of the CSS ladder, so
  // the arithmetic minimum is the wrong floor — see STALL_ESCALATION. Only
  // reachable when the planner's probe said a density path still exists;
  // `densityExhausted` short-circuits above.
  const stepFloor = (density) => (options.stalled
    ? Math.max(MIN_DENSITY_STEP, (MAX_DENSITY - density) * STALL_ESCALATION)
    : MIN_DENSITY_STEP);

  // ── Strategy 1: Shrink the single largest atom ──────────────────────
  if (potentials.length > 0) {
    const target = potentials[0];
    const fraction   = Math.min(1.0, overflowPx / target.shrinkPotentialPx);
    const floor      = stepFloor(target.density);
    const newDensity = Math.min(
      MAX_DENSITY,
      target.density + Math.max(floor, fraction * (MAX_DENSITY - target.density)),
    );
    const densityStep = newDensity - target.density;

    if (densityStep >= MIN_DENSITY_STEP) {
      return {
        resolved: true,   // optimistic — measurement pass will verify
        adjustments: [{ atomId: target.atomId, newDensity }],
        splitAtomId: null,
      };
    }
  }

  // ── Strategy 2: Distribute shrink across multiple atoms ─────────────
  if (potentials.length > 1) {
    const totalShrink = potentials.reduce((sum, a) => sum + a.shrinkPotentialPx, 0);
    if (totalShrink >= overflowPx) {
      const adjustments = potentials.map(atom => {
        const share         = atom.shrinkPotentialPx / totalShrink;
        const densityIncrease = share * (MAX_DENSITY - atom.density) * (overflowPx / totalShrink);
        return {
          atomId:     atom.atomId,
          newDensity: Math.min(
            MAX_DENSITY,
            atom.density + Math.max(stepFloor(atom.density), densityIncrease),
          ),
        };
      });
      return { resolved: true, adjustments, splitAtomId: null };
    }
  }

  // ── Strategy 3: Split — move the last atom to a new spread ──────────
  const splitAtomId = findSplitCandidateId(pageAtoms);
  if (splitAtomId) {
    return {
      resolved: false,
      adjustments: [],
      splitAtomId,
    };
  }

  // ── Strategy 4: Single atom exceeds page — flag unresolved ──────────
  return {
    resolved: false,
    adjustments: [],
    splitAtomId: null,
  };
}

