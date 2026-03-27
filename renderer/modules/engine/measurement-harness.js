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
import { renderPageFromPlacements } from '../page-renderer.js';
import { getAtomDefinition } from './atom-registry.js';
import { PAGE_BUDGET, HALF_SLOT_WIDTH_PX } from './page-spec.js';

function clipsVerticalOverflow(style) {
  const overflowY = style.overflowY || '';
  const overflow = style.overflow || '';
  return ['hidden', 'clip', 'auto', 'scroll'].includes(overflowY)
    || ['hidden', 'clip', 'auto', 'scroll'].includes(overflow);
}

/**
 * Returns true if the element uses intentional CSS content truncation.
 * Elements with -webkit-line-clamp clip content by design and should not
 * be counted as overflow — the clipping is the intended behaviour.
 */
function hasIntentionalClamp(style) {
  const lc = style.getPropertyValue('-webkit-line-clamp');
  return Boolean(lc && lc !== 'none' && lc !== '0');
}

function measureInternalOverflowPx(root) {
  if (!root || typeof window === 'undefined' || typeof root.querySelectorAll !== 'function') {
    return 0;
  }

  let maxOverflow = 0;
  const nodes = [root, ...root.querySelectorAll('*')];
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement) || node.clientHeight <= 0) return;

    const style = window.getComputedStyle(node);
    if (!clipsVerticalOverflow(style)) return;
    // Skip elements with intentional CSS truncation (line-clamp).
    // Their clientHeight < scrollHeight by design, not by overflow.
    if (hasIntentionalClamp(style)) return;

    const overflow = node.scrollHeight - node.clientHeight;
    if (overflow > maxOverflow) maxOverflow = overflow;
  });

  return maxOverflow;
}

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
 * Returns the slot width (px) for an atom based on its footprint.cols.
 * Returns null for full-width atoms (cols:2 or unspecified).
 *
 * @param {object} atom
 * @returns {number|null}
 */
function getAtomSlotWidthPx(atom) {
  const def = getAtomDefinition(atom.type);
  const cols = (def && def.footprint && def.footprint.cols) || 2;
  return cols === 1 ? HALF_SLOT_WIDTH_PX : null;
}

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
 * @param {number|null} slotWidthPx — optional slot width for cols:1 atoms
 * @returns {{ measuredHeight: number, measuredWidth: number, overflowHeight: number }}
 */
export function measureAtom(stack, atom, density, slotWidthPx = null) {
  const def = getAtomDefinition(atom.type);
  if (!def) {
    console.warn(`[measurement-harness] No definition for atom type: ${atom.type}`);
    return { measuredHeight: 0, measuredWidth: 0, overflowHeight: 0 };
  }

  // Slot-width path: measure cols:1 atoms at their actual render width.
  if (slotWidthPx !== null) {
    const slot = make('div', 'layout-engine-slot-measure');
    Object.assign(slot.style, {
      width:         slotWidthPx + 'px',
      height:        'auto',
      overflow:      'visible',
      display:       'flex',
      flexDirection: 'column',
      position:      'relative',
    });
    const rendered = def.render(atom, density);
    if (rendered.style && rendered.style.flex) rendered.style.flex = '';
    slot.appendChild(rendered);
    stack.appendChild(slot);
    const rect = slot.getBoundingClientRect();
    const internalOverflow = measureInternalOverflowPx(slot);
    slot.remove();
    return {
      measuredHeight: rect.height + internalOverflow,
      measuredWidth:  rect.width,
      overflowHeight: internalOverflow,
    };
  }

  // Create a bounded page context for accurate measurement.
  // Use flex column layout (matching the real page frame) with auto
  // height so the frame grows to fit content. This ensures margins
  // behave identically to the rendered page — in flex layout, margins
  // don't collapse through elements or with the container, unlike
  // block layout where collapsed-through margins are invisible to
  // both getBoundingClientRect() and getComputedStyle().
  const { page, boundary, frame } = createBoundedPage(atom.type, `measure-${atom.type}`);
  Object.assign(frame.style, {
    height:        'auto',
    // Keep display:flex and flex-direction:column from CSS —
    // only override height to auto so frame grows to fit content.
  });
  const rendered = def.render(atom, density);
  // If the atom renderer returned a full page element (has .booklet-page class),
  // move its inner frame into the measurement context rather than just its children.
  // Moving the frame itself preserves the frame's class list and data-layout-variant
  // attribute, so density-variant CSS rules (e.g. .boss-right[data-layout-variant="tight"])
  // apply correctly during offscreen measurement.
  if (rendered.classList && rendered.classList.contains('booklet-page')) {
    const innerFrame = rendered.querySelector('.page-frame');
    if (innerFrame) {
      Object.assign(innerFrame.style, { height: 'auto' });
      frame.appendChild(innerFrame);
    }
  } else {
    // Strip V1 flex self-sizing (e.g. session cards set flex: N 1 0)
    // so the atom uses its intrinsic height. The CSS rule
    // .page-frame > * { flex-shrink: 0 } prevents compression.
    if (rendered.style && rendered.style.flex) {
      rendered.style.flex = '';
    }
    frame.appendChild(rendered);
  }
  stack.appendChild(page);

  // Measure the frame's auto height — this captures the atom's
  // intrinsic content height PLUS its margins (which don't collapse
  // in the flex column context, matching the rendered page).
  const boundaryRect = boundary.getBoundingClientRect();
  const frameRect    = frame.getBoundingClientRect();
  const internalOverflowPx = measureInternalOverflowPx(frame);

  const measuredHeight = frameRect.height + internalOverflowPx;
  const measuredWidth  = frameRect.width;
  const overflowHeight = Math.max(
    0,
    frameRect.bottom - boundaryRect.bottom,
    internalOverflowPx,
  );

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
    const slotWidthPx = getAtomSlotWidthPx(placement.atom);
    const result = measureAtom(stack, placement.atom, placement.density, slotWidthPx);
    return {
      atomId:         placement.atomId,
      measuredHeight: result.measuredHeight,
      overflowHeight: result.overflowHeight,
    };
  });
}

export function measurePlacementsPage(stack, placements, spreadType = 'body') {
  if (!Array.isArray(placements) || placements.length === 0) {
    return {
      overflowHeight: 0,
      boundaryHeight: 0,
      frameHeight: 0,
    };
  }

  const page = renderPageFromPlacements(placements, spreadType, -1);
  if (!page) {
    return {
      overflowHeight: 0,
      boundaryHeight: 0,
      frameHeight: 0,
    };
  }

  stack.appendChild(page);

  const boundary = page.querySelector(':scope > .page-boundary');
  const frame = page.querySelector(':scope > .page-boundary > .page-frame');

  if (!boundary || !frame) {
    page.remove();
    return {
      overflowHeight: 0,
      boundaryHeight: 0,
      frameHeight: 0,
    };
  }

  const boundaryRect = boundary.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  const internalOverflowPx = measureInternalOverflowPx(frame);
  const overflowHeight = Math.max(
    0,
    frame.scrollHeight - frame.clientHeight,
    frameRect.bottom - boundaryRect.bottom,
    internalOverflowPx,
  );

  page.remove();

  return {
    overflowHeight,
    boundaryHeight: boundaryRect.height,
    frameHeight: frameRect.height,
  };
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
