/**
 * mechanic-layout.js — Shared page layout contract
 *
 * Single source of truth for how a page's placements are arranged into rows.
 * Both the renderer (DOM build) and the measurement harness (slot-width
 * selection) consume this module so that measurement width always matches
 * actual render width.
 *
 * ── THE ONE ROW PLAN (D207 / DR-48, 2026-08-18) ────────────────────────────
 * `resolvePageRowPlan()` is that single resolution. It answers the question
 * "which row does each placement on this page land in", and BOTH readers take
 * their answer from it: `page-renderer.js` builds its DOM from the plan's rows,
 * and `getMechanicSlotWidthPx()` reads the same plan to pick a measurement
 * width. Before it, the two sides ran two implementations that agreed on the
 * corpus by coincidence rather than by construction:
 *
 *   - the surface half was shared (`buildMechanicSurfaceRows`), but
 *   - the COMPANION half was not: `groupPlacementsIntoRows` lived in
 *     page-renderer.js and pairs cols:1 companion atoms into halves rows that
 *     the measurement side answered `null` (full width) for, because its rule
 *     was a membership test against `MECHANIC_SURFACE_TYPES`; and
 *   - the PAGE KIND was not: a mechanic-surface atom seated on a workout page
 *     renders full-width (renderWorkoutPage has no rows at all) while the
 *     measurement side still answered a halves slot.
 *
 * Neither latent divergence has an instance in today's corpus — every
 * companion atom is cols:2 and no mechanic surface shares a workout page — so
 * this consolidation is measured RENDER-IDENTICAL: 21 fixtures, 1771
 * placements, zero differences in printed order, page count, cell width or
 * rendered height. It is landed as construction, not as a repair: the next
 * cols:1 companion atom, or the first mechanic surface that lands beside a
 * session card, would have silently clipped.
 *
 * WHAT THIS MODULE STILL DOES NOT OWN: the WIDTH ITSELF. A halves cell is
 * `HALF_SLOT_WIDTH_PX` (232px) here and 236–238px in the browser, because
 * PAGE_BUDGET's 0.3in margins and booklet.css's `--page-margin` are two
 * authors of one number. See the residual note on `getMechanicSlotWidthPx()`.
 *
 * @module mechanic-layout
 */

import { HALF_SLOT_WIDTH_PX } from './engine/page-spec.js';
import { getAtomDefinition } from './engine/atom-registry.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// The mechanic SURFACE types (cipher / oracle / map) are not a set here any
// more. They were one, as the membership test that decided which placements
// could be half-width — a second, narrower answer to a question the row plan
// already answers, and the one that made every companion atom full-width by
// fiat. `buildMechanicSurfaceRows()` names the three types directly, in the
// role template that is their only real home.

// PAGE-KIND PARTITION — the dispatch `renderPageFromPlacements()` performs.
// These sets moved here from page-renderer.js so that the row plan and the DOM
// build cannot disagree about what kind of page they are looking at; the
// renderer imports them back. The comments below are the defects that shaped
// each set and are load-bearing.
//
// A page is a session log because it carries session content, NOT because it
// carries a week footer. The footer is a page-structural band the renderer
// positions (ZONE-ASSIGNMENT-DESIGN §6) and appendWeeklyFooter() synthesises
// one on any page that needs it — so a footer is evidence of which WEEK a page
// belongs to, never of what is on it.
//
// It was listed here until the clocks panel produced the first page whose only
// workout-typed placement was a footer: a boss week's clocks, pushed off a full
// card page, arrived as a `page-workout-left` shell with `data-card-count="0"`
// and a session-log boundary — which is what the diagnostics gate 'session
// cards exist on workout pages' caught. Measured across the corpus, no page
// before the clocks panel had a footer without a header or a card, so this
// narrowing reclassifies those pages and nothing else.
const WORKOUT_PAGE_TYPES = new Set(['week-header', 'session-card']);

// reckoning-panel is deliberately NOT a mechanic page type: on non-boss weeks
// it shares field-ops pages that cipher/oracle already classify, and on boss
// weeks it shares the final session-chunk page, which routes as a workout page
// regardless (renderPageFromPlacements tests workout content first). Listing
// it here would only change the one case where it lands alone on a page —
// giving that page a mechanic frame and a week footer it does not ask for.
//
// It is NOT what inverted the panel against the cards in Session 1: that was
// the type partition in renderWorkoutPage(), fixed there.
//
// clocks-panel IS listed: unlike the reckoning panel it has no workout-page
// fallback seat, so the one case that matters is the opposite one — a week
// whose clocks are pushed onto a page of their own. Without an entry here that
// page would fall through to the generic branch and be built as a
// `page-clocks-panel` shell that no CSS has ever styled; with it, a solo clocks
// page is a field-ops page with the frame, the board-state title and the week
// footer that every other field-ops page carries.
// constrained-grid and word-grid (W5b) are listed for the same reason
// clocks-panel is: they are full-width by footprint, so a puzzle that does not
// share a page with a cipher or a map lands alone — and without an entry here
// that solo page would be built as a `page-constrained-grid` shell no CSS has
// ever styled, instead of the field-ops page it plainly is.
const MECHANIC_PAGE_TYPES = new Set([
  'cipher-panel', 'oracle-table', 'map-panel', 'clocks-panel', 'tracker',
  'constrained-grid', 'word-grid'
]);

export function isWorkoutPlacement(placement) {
  return WORKOUT_PAGE_TYPES.has(placement.type);
}

export function isMechanicPlacement(placement) {
  return placement.type === 'boss-encounter' || MECHANIC_PAGE_TYPES.has(placement.type);
}

const DEFAULT_SHELL_ATTRS = {
  'shell-family': 'field-survey',
  'board-state-mode': 'survey-grid',
  'attachment-strategy': 'split-technical',
};

// ---------------------------------------------------------------------------
// Shell attribute resolution
// ---------------------------------------------------------------------------

/**
 * Resolve shell attributes from a list of items (placements or atoms).
 *
 * Resolution order:
 *   1. Explicit `shellAttrs` on the atom descriptor (contract-level channel)
 *   2. Legacy `data.artifactIdentity` scan (migration fallback)
 *   3. Defaults
 *
 * Returns a flat string→string map suitable for `data-*` attributes.
 *
 * @param {Array} items — placements or atoms
 * @returns {object} shell attributes
 */
export function resolveShellAttrs(items) {
  // Primary: explicit shellAttrs on the atom descriptor
  for (const item of items) {
    const attrs = (item.atom && item.atom.shellAttrs) || item.shellAttrs;
    if (attrs && typeof attrs === 'object') {
      return { ...DEFAULT_SHELL_ATTRS, ...attrs };
    }
  }
  // Legacy fallback: data.artifactIdentity
  for (const item of items) {
    const data = item.atom?.data || item.data || {};
    if (data.artifactIdentity && typeof data.artifactIdentity === 'object') {
      const ai = data.artifactIdentity;
      return {
        ...DEFAULT_SHELL_ATTRS,
        ...(ai.shellFamily ? { 'shell-family': ai.shellFamily } : {}),
        ...(ai.boardStateMode ? { 'board-state-mode': ai.boardStateMode } : {}),
        ...(ai.attachmentStrategy ? { 'attachment-strategy': ai.attachmentStrategy } : {}),
      };
    }
  }
  return DEFAULT_SHELL_ATTRS;
}

// ---------------------------------------------------------------------------
// Layout variant resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the layout variant for a mechanic page.
 *
 * Keyed on board-state-mode and map type. The variant controls which surfaces
 * share a half-width row and which are full-width.
 *
 * @param {object} shellAttrs — resolved shell attributes (string→string map)
 * @param {Array} surfacePlacements — cipher/oracle/map placements only
 * @returns {string} layoutVariant
 */
export function resolveLayoutVariant(shellAttrs, surfacePlacements) {
  const boardStateMode = String((shellAttrs && shellAttrs['board-state-mode']) || 'survey-grid');
  const mapPlacement = surfacePlacements.find(function (p) { return p.type === 'map-panel'; });
  const mapData = mapPlacement && (mapPlacement.atom && mapPlacement.atom.data || mapPlacement.data || {});
  const mapType = mapData && mapData.map && String(mapData.map.mapType || '').toLowerCase();

  if (boardStateMode === 'timeline-reconstruction') return 'timeline-dominant';
  if (boardStateMode === 'testimony-matrix')        return 'matrix-dominant';
  if (mapType === 'player-drawn')                   return 'map-dominant';
  if (boardStateMode === 'node-graph')              return 'map-dominant';

  const hasCipher = surfacePlacements.some(function (p) { return p.type === 'cipher-panel'; });
  const hasMap    = surfacePlacements.some(function (p) { return p.type === 'map-panel'; });
  if (hasCipher && hasMap) return 'balanced';
  if (hasCipher) return 'cipher-dominant';
  if (hasMap) return 'map-dominant';
  return 'balanced';
}

// ---------------------------------------------------------------------------
// Row template builder
// ---------------------------------------------------------------------------

/**
 * Extract rowGroup from an item that may be a raw AtomDescriptor (.rowGroup)
 * or a placement object (.atom.rowGroup). Returns null when absent.
 */
function extractRowGroup(item) {
  if (item.atom && item.atom.rowGroup) return item.atom.rowGroup;
  return item.rowGroup || null;
}

/**
 * Test whether an item is a companion-zone atom.
 * Primary signal: explicit `zone: 'companion'` on the atom descriptor.
 * Fallback: `type === 'tracker'` for atoms emitted before zone adoption.
 * Works with both raw AtomDescriptors and placement objects.
 *
 * A placement's zone is its ATOM's zone — a placement carries no `zone` field
 * of its own (createPlacement in engine/page-planner.js). The shape test is
 * therefore an either/or, not a fallback chain: reading `item.zone` after
 * `item.atom.zone` would let a placement whose atom declares `zone: ''` fall
 * through to a field that does not exist. Nullish, not falsy, for the same
 * reason the renderer's copy of this predicate used `??` — this is now that
 * copy, and the render side is the authority (D207).
 */
export function isCompanionItem(item) {
  const zone = (item.atom ? item.atom.zone : item.zone) ?? null;
  return zone === 'companion' || (zone == null && item.type === 'tracker');
}

/**
 * Build mechanic surface rows from an explicit layout template keyed by
 * layoutVariant. This is role-based (not adjacency-based), so cipher and
 * map are always paired correctly regardless of sequence order.
 *
 * For the `balanced` variant, rowGroup is the authoritative pairing signal
 * when present. If both cipher and map carry the same non-null rowGroup,
 * they pair explicitly. If neither carries rowGroup, they pair by legacy
 * role-based logic. If only one carries rowGroup, or they carry different
 * values, they render full-width (defensive — adapter inconsistency).
 *
 * Dominant variants ignore rowGroup — full-width layout is unconditional.
 *
 * Oracle is always full-width (below the paired surfaces).
 * Other surfaces follow oracle, each full-width.
 *
 * @param {Array} surfacePlacements — cipher/oracle/map placements only
 * @param {string} layoutVariant
 * @returns {Array<{ type: 'halves'|'full', placements: Array }>}
 */
export function buildMechanicSurfaceRows(surfacePlacements, layoutVariant) {
  const cipher = surfacePlacements.find(function (p) { return p.type === 'cipher-panel'; });
  const oracle = surfacePlacements.find(function (p) { return p.type === 'oracle-table'; });
  const map    = surfacePlacements.find(function (p) { return p.type === 'map-panel'; });
  const other  = surfacePlacements.filter(function (p) {
    return p.type !== 'cipher-panel' && p.type !== 'oracle-table' && p.type !== 'map-panel';
  });

  const rows = [];

  switch (layoutVariant) {
    case 'balanced': {
      if (cipher && map) {
        // rowGroup-aware pairing: explicit adapter intent takes precedence.
        const cipherRG = extractRowGroup(cipher);
        const mapRG    = extractRowGroup(map);
        const explicitPair = cipherRG && mapRG && cipherRG === mapRG;
        const legacyPair   = !cipherRG && !mapRG;

        if (explicitPair || legacyPair) {
          rows.push({ type: 'halves', placements: [cipher, map] });
        } else {
          // Mismatched or partial rowGroup — render full-width (safe fallback)
          if (cipher) rows.push({ type: 'full', placements: [cipher] });
          if (map)    rows.push({ type: 'full', placements: [map] });
        }
      } else {
        if (cipher) rows.push({ type: 'full', placements: [cipher] });
        if (map)    rows.push({ type: 'full', placements: [map] });
      }
      break;
    }
    case 'timeline-dominant':
      if (map)    rows.push({ type: 'full', placements: [map] });
      if (cipher) rows.push({ type: 'full', placements: [cipher] });
      break;
    case 'map-dominant':
    case 'matrix-dominant':
    case 'cipher-dominant':
    default:
      if (map)    rows.push({ type: 'full', placements: [map] });
      if (cipher) rows.push({ type: 'full', placements: [cipher] });
      break;
  }

  if (oracle) rows.push({ type: 'full', placements: [oracle] });
  other.forEach(function (p) { rows.push({ type: 'full', placements: [p] }); });

  return rows;
}

// ---------------------------------------------------------------------------
// Companion-zone row grouping
// ---------------------------------------------------------------------------

/**
 * Group a flat placement list into rows based on footprint.cols and rowGroup.
 *
 * When atoms declare a `rowGroup` on their atom descriptor, atoms with the
 * same rowGroup and `footprint.cols === 1` are paired into halves rows
 * regardless of adjacency. Atoms without rowGroup fall back to the legacy
 * adjacency-based pairing (two consecutive cols:1 → halves row). Atoms with
 * rowGroup never pair with atoms without rowGroup, and atoms with different
 * rowGroup values never pair with each other.
 *
 * MOVED HERE FROM page-renderer.js (D207). It is the companion zone's half of
 * the row plan, and while it lived in the renderer only the renderer could
 * read it — so the measurement side answered `null` (full width) for every
 * companion atom, including a cols:1 pair this function puts in a halves cell.
 * Byte-identical logic; the renderer imports it back.
 *
 * @param {Array} placements
 * @returns {Array<{ type: 'halves'|'full', placements: Array }>}
 */
export function groupPlacementsIntoRows(placements) {
  const rows = [];
  const consumed = new Set();

  // Phase 1: Pre-compute rowGroup-based pairs.
  // For each rowGroup, collect cols:1 members and pair them in list order.
  const paired = new Map(); // index → partner index
  const byRowGroup = new Map();
  for (let idx = 0; idx < placements.length; idx++) {
    const rg = placements[idx].atom && placements[idx].atom.rowGroup;
    if (!rg) continue;
    if (!byRowGroup.has(rg)) byRowGroup.set(rg, []);
    byRowGroup.get(rg).push(idx);
  }
  for (const indices of byRowGroup.values()) {
    const halfIndices = indices.filter(function (idx) {
      const def = getAtomDefinition(placements[idx].type);
      return ((def && def.footprint && def.footprint.cols) || 2) === 1;
    });
    for (let k = 0; k + 1 < halfIndices.length; k += 2) {
      paired.set(halfIndices[k], halfIndices[k + 1]);
      paired.set(halfIndices[k + 1], halfIndices[k]);
    }
  }

  // Phase 2: Walk placements in order, forming rows.
  let i = 0;
  while (i < placements.length) {
    if (consumed.has(i)) { i++; continue; }

    const p = placements[i];
    const def = getAtomDefinition(p.type);
    const cols = (def && def.footprint && def.footprint.cols) || 2;
    const partner = paired.get(i);

    // rowGroup-based halves row
    if (partner !== undefined && !consumed.has(partner)) {
      rows.push({ type: 'halves', placements: [p, placements[partner]] });
      consumed.add(i);
      consumed.add(partner);
      i++;
      continue;
    }

    // Legacy adjacency fallback — only for atoms WITHOUT rowGroup
    const hasRowGroup = !!(p.atom && p.atom.rowGroup);
    if (!hasRowGroup && cols === 1 && i + 1 < placements.length && !consumed.has(i + 1)) {
      const next = placements[i + 1];
      const nextHasRowGroup = !!(next.atom && next.atom.rowGroup);
      if (!nextHasRowGroup) {
        const nextDef = getAtomDefinition(next.type);
        const nextCols = (nextDef && nextDef.footprint && nextDef.footprint.cols) || 2;
        if (nextCols === 1) {
          rows.push({ type: 'halves', placements: [p, next] });
          consumed.add(i);
          consumed.add(i + 1);
          i += 2;
          continue;
        }
      }
    }

    // Full-width row
    consumed.add(i);
    rows.push({ type: 'full', placements: [p] });
    i++;
  }

  return rows;
}

// ---------------------------------------------------------------------------
// THE ONE ROW PLAN (measurement ↔ renderer agreement)
// ---------------------------------------------------------------------------

/**
 * The row plan a page's placements will actually render as.
 *
 * ONE RESOLUTION, TWO READERS (D93's law applied to width, D207's ruling).
 * `page-renderer.js` builds its DOM from this plan's rows; the measurement
 * side reads the same plan to choose a width. Two implementations of "which
 * row does this land in" is two answers to a question that has one — and the
 * measurement copy is the one nobody sees fail, because a divergence does not
 * throw, it clips.
 *
 * The plan mirrors `renderPageFromPlacements()`'s own dispatch:
 *
 *   - a page carrying workout content is a WORKOUT page. It has no rows at
 *     all: renderWorkoutPage() renders every flow placement full-width into
 *     the frame (cards share a `.session-cards` flex column, which is also
 *     full-width). So `kind: 'flow'` and every row is full.
 *   - a page carrying mechanic content is a FIELD-OPS page: surface rows from
 *     the role template, then the companion zone's own grouping.
 *   - anything else (fragment pages, endings, the generic branch) renders
 *     placements straight into the frame — full-width, no rows.
 *
 * THE SINGLE-PLACEMENT EARLY RETURN IS NOT MODELLED, ON PURPOSE. It fires when
 * a lone placement's renderer returns a whole `.booklet-page`, which this
 * module cannot know without rendering — and it does not need to: a lone
 * placement can never produce a halves row on any branch (the surface template
 * pairs cipher WITH map, and the companion grouping needs two cols:1 atoms).
 * Every branch answers full width for a page of one, so the omission is
 * width-inert by construction rather than by luck.
 *
 * @param {Array} placements — all placements on one page side
 * @returns {{ kind: string, shellAttrs: object|null, layoutVariant: string|null,
 *   surfacePlacements: Array, companionPlacements: Array,
 *   surfaceRows: Array, companionRows: Array }}
 */
export function resolvePageRowPlan(placements) {
  const list = Array.isArray(placements) ? placements : [];

  const hasWorkoutContent  = list.some(isWorkoutPlacement);
  const hasMechanicContent = list.some(isMechanicPlacement);

  if (hasWorkoutContent || !hasMechanicContent) {
    return {
      kind: hasWorkoutContent ? 'workout' : 'flow',
      shellAttrs: null,
      layoutVariant: null,
      surfacePlacements: list,
      companionPlacements: [],
      surfaceRows: list.map(function (p) { return { type: 'full', placements: [p] }; }),
      companionRows: [],
    };
  }

  const shellAttrs = resolveShellAttrs(list);
  const surfacePlacements = list.filter(function (p) {
    return !isCompanionItem(p) && p.type !== 'week-footer';
  });
  const companionPlacements = list.filter(isCompanionItem);
  const layoutVariant = resolveLayoutVariant(shellAttrs, surfacePlacements);

  return {
    kind: 'mechanic',
    shellAttrs,
    layoutVariant,
    surfacePlacements,
    companionPlacements,
    surfaceRows:   buildMechanicSurfaceRows(surfacePlacements, layoutVariant),
    companionRows: groupPlacementsIntoRows(companionPlacements),
  };
}

/**
 * Determine the measurement slot width for a placement.
 *
 * Reads `resolvePageRowPlan()` — the same plan the renderer builds its DOM
 * from — and returns HALF_SLOT_WIDTH_PX when the placement lands in a halves
 * cell, null for full-width (so the measurement harness uses bounded-page
 * width).
 *
 * IDENTITY FIRST, THEN atomId, THEN TYPE. The retired implementation matched
 * `p.type === placement.type`, which answers for a SIBLING of the same type
 * rather than for the placement asked about. Harmless while every page carries
 * at most one of each mechanic surface, wrong the moment one does not; the
 * type test survives only as the last resort for callers that pass a copy.
 *
 * ── THE RESIDUAL, MEASURED (DR-48, 2026-08-18) ─────────────────────────────
 * This function now resolves the same ROW render does. It does not yet resolve
 * the same WIDTH: a halves cell is 236–238px in the browser (`(frame − 6) / 2`
 * against a real 481.9px field-ops frame) and `HALF_SLOT_WIDTH_PX` is 232,
 * because `PAGE_BUDGET`'s 0.3in margins and booklet.css's `--page-margin` are
 * two authors of one number and disagree by ~6px per page. The full-width path
 * has no such gap — it measures inside a real bounded page and gets the real
 * frame. Closing the halves gap means deriving the slot from a probed frame
 * (the way `createMeasurementRoot` already probes boundary HEIGHT) and feeding
 * the same number to phase-1 estimation, which today reads the constant with
 * no DOM to probe. Left standing deliberately: it is a 2.5% error, and moving
 * it without moving the estimate would break the estimate↔measurement width
 * agreement D206 landed.
 *
 * @param {object} placement — the placement to measure (needs .type, .atom/.data)
 * @param {Array} allPagePlacements — all placements on the same page side
 * @returns {number|null} slot width in px, or null for full-width
 */
export function getMechanicSlotWidthPx(placement, allPagePlacements) {
  const plan = resolvePageRowPlan(allPagePlacements);

  for (const row of [...plan.surfaceRows, ...plan.companionRows]) {
    if (row.type !== 'halves') continue;
    if (row.placements.some(function (p) { return rowMemberMatches(p, placement); })) {
      return HALF_SLOT_WIDTH_PX;
    }
  }

  return null;
}

/** Identity → atomId → type, in that order. See getMechanicSlotWidthPx. */
function rowMemberMatches(member, placement) {
  if (member === placement) return true;
  if (member.atomId != null && placement.atomId != null) return member.atomId === placement.atomId;
  return member.type === placement.type;
}

// ---------------------------------------------------------------------------
// Batch helper for estimate phase
// ---------------------------------------------------------------------------

/**
 * Determine which mechanic surface types will render at half-width
 * given a set of co-located items (atoms or placements).
 *
 * Used by the estimate-phase planner before page assignment is final.
 * Items must have `.type` and either `.data` or `.atom.data` for map
 * type / artifact identity resolution.
 *
 * Works with both raw AtomDescriptors and placement objects — the
 * resolvers read `.atom?.data || .data` which covers both shapes.
 *
 * @param {Array} items — atoms or placements on the same page side
 * @returns {Set<string>} atom types that will render in a halves row
 */
export function getHalfWidthTypes(items) {
  const surfaceItems = items.filter(function (p) {
    return !isCompanionItem(p) && p.type !== 'week-footer';
  });
  if (surfaceItems.length === 0) return new Set();

  const shellAttrs = resolveShellAttrs(items);
  const variant = resolveLayoutVariant(shellAttrs, surfaceItems);
  const rows = buildMechanicSurfaceRows(surfaceItems, variant);

  const types = new Set();
  for (const row of rows) {
    if (row.type === 'halves') {
      row.placements.forEach(function (p) { types.add(p.type); });
    }
  }
  return types;
}
