/**
 * mechanic-layout.js — Shared mechanic page layout contract
 *
 * Single source of truth for how mechanic surfaces (cipher, oracle, map)
 * are arranged into rows on a field-ops page. Both the renderer (DOM build)
 * and the measurement harness (slot-width selection) consume this module so
 * that measurement width always matches actual render width.
 *
 * @module mechanic-layout
 */

import { HALF_SLOT_WIDTH_PX } from './engine/page-spec.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MECHANIC_SURFACE_TYPES = new Set([
  'cipher-panel', 'oracle-table', 'map-panel',
]);

const DEFAULT_ARTIFACT_IDENTITY = {
  shellFamily: 'field-survey',
  boardStateMode: 'survey-grid',
  attachmentStrategy: 'split-technical',
};

// ---------------------------------------------------------------------------
// Artifact identity resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the artifactIdentity from a list of placements.
 * Scans placement data for an explicit `artifactIdentity` object;
 * falls back to defaults.
 *
 * @param {Array} placements
 * @returns {object} artifactIdentity
 */
export function resolveArtifactIdentityFromPlacements(placements) {
  for (const placement of placements) {
    const data = placement.atom?.data || placement.data || {};
    if (data.artifactIdentity && typeof data.artifactIdentity === 'object') {
      return { ...DEFAULT_ARTIFACT_IDENTITY, ...data.artifactIdentity };
    }
  }
  return DEFAULT_ARTIFACT_IDENTITY;
}

// ---------------------------------------------------------------------------
// Layout variant resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the layout variant for a mechanic page.
 *
 * Keyed on boardStateMode and map type. The variant controls which surfaces
 * share a half-width row and which are full-width.
 *
 * @param {object} artifactIdentity
 * @param {Array} surfacePlacements — cipher/oracle/map placements only
 * @returns {string} layoutVariant
 */
export function resolveLayoutVariant(artifactIdentity, surfacePlacements) {
  const boardStateMode = String((artifactIdentity && artifactIdentity.boardStateMode) || 'survey-grid');
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
 * Build mechanic surface rows from an explicit layout template keyed by
 * layoutVariant. This is role-based (not adjacency-based), so cipher and
 * map are always paired correctly regardless of sequence order.
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
    case 'balanced':
      if (cipher && map) {
        rows.push({ type: 'halves', placements: [cipher, map] });
      } else {
        if (cipher) rows.push({ type: 'full', placements: [cipher] });
        if (map)    rows.push({ type: 'full', placements: [map] });
      }
      break;
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
// Slot-width contract (measurement ↔ renderer agreement)
// ---------------------------------------------------------------------------

/**
 * Determine the measurement slot width for a mechanic surface placement.
 *
 * Resolves the actual layout variant from the page's placements, then
 * checks whether the given placement would render in a half-width row
 * cell or a full-width row. Returns HALF_SLOT_WIDTH_PX for halves,
 * null for full-width (so the measurement harness uses bounded-page width).
 *
 * For non-mechanic-surface atoms (tracker, week-footer, etc.), always
 * returns null (full-width).
 *
 * @param {object} placement — the placement to measure (needs .type, .atom/.data)
 * @param {Array} allPagePlacements — all placements on the same page side
 * @returns {number|null} slot width in px, or null for full-width
 */
export function getMechanicSlotWidthPx(placement, allPagePlacements) {
  // Only mechanic surface types can be half-width
  if (!MECHANIC_SURFACE_TYPES.has(placement.type)) return null;

  // Filter to surface placements (same filter as renderMechanicPage uses)
  const surfacePlacements = allPagePlacements.filter(function (p) {
    return p.type !== 'tracker' && p.type !== 'week-footer';
  });

  // Resolve layout variant using the same logic as the renderer
  const artifactIdentity = resolveArtifactIdentityFromPlacements(allPagePlacements);
  const variant = resolveLayoutVariant(artifactIdentity, surfacePlacements);

  // Build the row template and find which row contains this placement's type
  const rows = buildMechanicSurfaceRows(surfacePlacements, variant);
  for (const row of rows) {
    const inRow = row.placements.some(function (p) { return p.type === placement.type; });
    if (inRow) {
      return row.type === 'halves' ? HALF_SLOT_WIDTH_PX : null;
    }
  }

  // Not found in any row — full-width fallback
  return null;
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
    return p.type !== 'tracker' && p.type !== 'week-footer';
  });
  if (surfaceItems.length === 0) return new Set();

  const artifactIdentity = resolveArtifactIdentityFromPlacements(items);
  const variant = resolveLayoutVariant(artifactIdentity, surfaceItems);
  const rows = buildMechanicSurfaceRows(surfaceItems, variant);

  const types = new Set();
  for (const row of rows) {
    if (row.type === 'halves') {
      row.placements.forEach(function (p) { types.add(p.type); });
    }
  }
  return types;
}
