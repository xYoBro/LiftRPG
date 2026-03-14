/**
 * measurement-harness.js — Offscreen DOM measurement for atoms
 *
 * Creates a hidden measurement root at -200vw. Renders individual atoms
 * into bounded pages and measures their actual pixel height via
 * getBoundingClientRect(). Used by the page planner to verify estimates
 * and detect overflow.
 *
 * Generalises the approach from layout-preflight.js to work with
 * individual atoms rather than whole pages.
 *
 * @module engine/measurement-harness
 */

import { make } from '../dom.js';
import { createBoundedPage } from '../page-shell.js';
import { getAtomDefinition } from './atom-registry.js';
import { PAGE_BUDGET } from './page-spec.js';

// ---------------------------------------------------------------------------
// Measurement root
// ---------------------------------------------------------------------------

/**
 * Create the offscreen measurement root.
 *
 * Must be attached to a themed container so that CSS custom properties
 * (fonts, sizes, spacing) are inherited for accurate measurement.
 *
 * @param {HTMLElement} container — the themed booklet container
 * @returns {{ root: HTMLElement, stack: HTMLElement, destroy: () => void }}
 */
export function createMeasurementRoot(container) {
  const root = make('div', 'layout-engine-measurement-root');
  Object.assign(root.style, {
    position:      'fixed',
    left:          '-200vw',
    top:           '0',
    width:         '5.5in',
    visibility:    'hidden',
    pointerEvents: 'none',
    zIndex:        '-1',
  });

  const stack = make('div', 'layout-engine-measurement-stack');
  Object.assign(stack.style, {
    display:       'flex',
    flexDirection: 'column',
    gap:           '0',
  });

  root.appendChild(stack);
  container.appendChild(root);

  // Measure the real CSS boundary height once from a throwaway page.
  // This replaces the static PAGE_BUDGET.heightPx for overflow checks,
  // ensuring the planner uses the archetype's actual print-safe area.
  const probe = createBoundedPage('_probe', '_probe');
  stack.appendChild(probe.page);
  const probeBoundaryHeight = probe.boundary.getBoundingClientRect().height;
  probe.page.remove();

  return {
    root,
    stack,
    /** Actual CSS boundary height for the active theme (px). */
    boundaryHeightPx: probeBoundaryHeight,
    destroy() {
      root.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// Single-atom measurement
// ---------------------------------------------------------------------------

/**
 * Measure a single atom's rendered height inside a bounded page context.
 *
 * Creates a temporary bounded page, renders the atom into the frame,
 * measures via getBoundingClientRect(), then cleans up. Returns actual
 * pixel dimensions and any overflow beyond the page boundary.
 *
 * @param {HTMLElement} stack — the measurement stack element
 * @param {object} atom — atom descriptor (must have `.type`, `.data`)
 * @param {number} density — density level (0.0–1.0)
 * @returns {{ measuredHeight: number, measuredWidth: number, overflowHeight: number }}
 */
export function measureAtom(stack, atom, density) {
  const def = getAtomDefinition(atom.type);
  if (!def) {
    console.warn(`[measurement-harness] No definition for atom type: ${atom.type}`);
    return { measuredHeight: 0, measuredWidth: 0, overflowHeight: 0 };
  }

  // Create a bounded page context for accurate measurement.
  // Override frame to use block layout with auto height so we measure
  // the atom's intrinsic content height, not its flexed height.
  const { page, boundary, frame } = createBoundedPage(atom.type, `measure-${atom.type}`);
  Object.assign(frame.style, {
    display:       'block',
    height:        'auto',
  });
  const rendered = def.render(atom, density);
  // If the atom renderer returned a full page element (has .booklet-page class),
  // extract its frame content instead of nesting a page inside a page.
  let measureTarget = rendered;
  if (rendered.classList && rendered.classList.contains('booklet-page')) {
    const innerFrame = rendered.querySelector('.page-frame');
    if (innerFrame) {
      // Switch inner frame to block layout too for intrinsic measurement
      Object.assign(innerFrame.style, { display: 'block', height: 'auto' });
      while (innerFrame.firstChild) {
        frame.appendChild(innerFrame.firstChild);
      }
    }
    // Content was moved into frame — measure frame, not the detached shell
    measureTarget = frame;
  } else {
    // Strip flex self-sizing from the rendered element so it
    // flows at its natural content height inside the block frame.
    if (rendered.style && rendered.style.flex) {
      rendered.style.flex = '';
    }
    frame.appendChild(rendered);
  }
  stack.appendChild(page);

  // Measure
  const boundaryRect = boundary.getBoundingClientRect();
  const contentRect  = measureTarget.getBoundingClientRect();

  const measuredHeight = contentRect.height;
  const measuredWidth  = contentRect.width;
  const overflowHeight = Math.max(0, contentRect.bottom - boundaryRect.bottom);

  // Clean up
  page.remove();

  return { measuredHeight, measuredWidth, overflowHeight };
}

// ---------------------------------------------------------------------------
// Batch measurement
// ---------------------------------------------------------------------------

/**
 * Measure all atoms assigned to one page (left or right side of a spread).
 *
 * @param {HTMLElement} stack — the measurement stack element
 * @param {Array<{atomId: string, type: string, density: number, data: object, atom: object}>} pageAtoms
 * @returns {Array<{ atomId: string, measuredHeight: number, overflowHeight: number }>}
 */
export function measurePageAtoms(stack, pageAtoms) {
  return pageAtoms.map(placement => {
    const result = measureAtom(stack, placement.atom, placement.density);
    return {
      atomId:         placement.atomId,
      measuredHeight: result.measuredHeight,
      overflowHeight: result.overflowHeight,
    };
  });
}

// ---------------------------------------------------------------------------
// Fit checking
// ---------------------------------------------------------------------------

/**
 * Check whether a page's atoms exceed the page budget.
 *
 * @param {Array<{ measuredHeight: number }>} measurements
 * @param {number} [budgetPx] — override page budget (defaults to PAGE_BUDGET.heightPx)
 * @returns {{ totalHeight: number, budgetPx: number, overflowPx: number, fits: boolean }}
 */
export function checkPageFit(measurements, budgetPx) {
  const budget      = budgetPx ?? PAGE_BUDGET.heightPx;
  const totalHeight = measurements.reduce((sum, m) => sum + m.measuredHeight, 0);
  const overflowPx  = Math.max(0, totalHeight - budget);

  return {
    totalHeight,
    budgetPx: budget,
    overflowPx,
    fits: overflowPx <= 2,   // 2px tolerance (matches current OVERFLOW_TOLERANCE_PX)
  };
}
