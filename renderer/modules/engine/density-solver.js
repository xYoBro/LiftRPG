/**
 * density-solver.js — Continuous density adjustment and overflow resolution
 *
 * Operates on a page's atom list to resolve overflow. Strategies applied in order:
 * 1. Shrink largest atom (increase density on most shrinkable)
 * 2. Shrink multiple atoms (distribute density proportionally)
 * 3. Split (move last atom to a new spread)
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

/** Maximum revision iterations per page. */
export const MAX_REVISIONS = 5;

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
 * Find the atom to shed from an overfull page — the last one that is allowed
 * to move to a new spread. Atoms whose definition declares
 * `canSplitAway: false` (e.g. week-footer) are skipped.
 *
 * @param {Array<{atomId: string, type: string}>} pageAtoms
 * @returns {string|null} atomId to split away, or null if the page cannot shed anything
 */
function findSplitCandidateId(pageAtoms) {
  if (pageAtoms.length <= 1) return null;

  for (let index = pageAtoms.length - 1; index >= 0; index -= 1) {
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
 * @returns {{ resolved: boolean, adjustments: Array<{atomId: string, newDensity: number}>, splitAtomId: string|null }}
 */
export function resolvePageOverflow(pageAtoms, overflowPx, pageBudgetPx) {
  if (overflowPx <= 0) {
    return { resolved: true, adjustments: [], splitAtomId: null };
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

  // ── Strategy 1: Shrink the single largest atom ──────────────────────
  if (potentials.length > 0) {
    const target = potentials[0];
    const fraction   = Math.min(1.0, overflowPx / target.shrinkPotentialPx);
    const newDensity = Math.min(
      MAX_DENSITY,
      target.density + fraction * (MAX_DENSITY - target.density),
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
            atom.density + Math.max(MIN_DENSITY_STEP, densityIncrease),
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

