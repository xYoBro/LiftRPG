// ── Map fingerprint module ────────────────────────────────────────────────────
// Single home for the map-evolution fingerprint and its companion predicates.
//
// WHY THIS MODULE EXISTS (D91)
// ----------------------------
// `buildMapEvolutionFingerprint` used to be implemented TWICE, privately, in
// quality.js and validation.js. The copies were made a day apart —
// 40fdf903 (2026-03-29, "Tighten generator finish flow and week contracts") seeded
// quality.js; 96d50e87 (2026-03-30, "Block stagnant assembled map states") copied it
// into validation.js and silently IMPROVED the grid branch on the way in. The
// improvement was never back-ported, and neither line was touched again for ~4.5
// months. GLOSSARY.md carried a "change both or neither" hazard note, but nothing
// enforced it, so the drift stood undetected.
//
// The measured divergence: all 25 grid-type weeks in the corpus fingerprinted
// differently under the two copies (the 71 point-to-point / linear-track /
// player-drawn weeks agreed). Neither copy was correct — each was wrong exactly
// where the other was right:
//
//   * quality.js read `tile.x`/`tile.y` only, but the corpus writes `col`/`row`
//     (586/586 tiles), so every coordinate was erased; and it stringified an
//     object `currentPosition` to the constant "[object Object]". Result: two weeks
//     whose board moved but whose labels/types held steady collided => a FALSE
//     "map-stagnation" weakSpot.
//   * validation.js destructured `currentPosition` as `{row, col}`, but the schema
//     types it `['object','integer','string']`. A string or integer position
//     collapsed to a bare ",". Result: two weeks at different named positions
//     collided => a FALSE blocking ERROR ("map tiles identical to previous week").
//
// The merged implementation below is strictly finer than both: coordinates fall
// back col/row -> x/y (nullish, so a legal 0 coordinate survives), and
// `currentPosition` is shape-dispatched rather than assumed. It preserves every
// observable decision the old pair produced on the corpus.
//
// GUARDED BY: `singleFingerprintHome()` in scripts/validate.mjs — an ERROR-class
// hygiene pass asserting this module exports the three functions AND that neither
// consumer has re-grown a private copy. Do not re-declare these locally.

import { normalizeId } from './assembly.js';

// Canonical hash of a week's `mapState`, used to detect whether the board actually
// changed week over week. Equal fingerprints on consecutive weeks = stagnation.
export function buildMapEvolutionFingerprint(mapState) {
  var ms = mapState || {};
  var mapType = String(ms.mapType || 'grid').trim().toLowerCase();

  if (mapType === 'point-to-point' || mapType === 'node-graph') {
    var nodes = (ms.nodes || []).map(function (node) {
      return [node.id || '', node.label || '', node.state || '', node.x || '', node.y || ''].join(':');
    }).sort().join('|');
    // `edge.state` is part of the fingerprint. It was omitted while `node.state`
    // was included — an asymmetry, not a ruling: INST_MAPS_BOARD names "route
    // closed" as legitimate week-to-week evolution, so a week whose only delta
    // was a locked route fingerprinted as stagnant. Adding the field can only
    // make consecutive weeks MORE distinct, so this strictly reduces false
    // stagnation findings. It also makes the relational (constellation) mode
    // legible at all: there, the tie state IS the weekly delta.
    var edges = (ms.edges || []).map(function (edge) {
      return [edge.from || '', edge.to || '', edge.label || '', edge.state || ''].join(':');
    }).sort().join('|');
    return 'network::' + nodes + '::' + edges + '::' + String(ms.currentNode || '')
      + '::' + String(ms.edgeSemantics || '');
  }

  if (mapType === 'maze') {
    // Nodes carry the ROLE and passages carry the PROGRESS, so a maze's weekly
    // delta lives almost entirely in the passage states.
    var mazeNodes = (ms.nodes || []).map(function (node) {
      return [node.id || '', node.label || '', node.state || '', node.x || '', node.y || ''].join(':');
    }).sort().join('|');
    var passages = (ms.passages || []).map(function (passage) {
      return [passage.from || '', passage.to || '', passage.label || '', passage.state || ''].join(':');
    }).sort().join('|');
    return 'maze::' + mazeNodes + '::' + passages + '::' + String(ms.currentNode || '');
  }

  if (mapType === 'concentric') {
    // Ring ORDER is meaning (outermost first), so this one is deliberately
    // unsorted — two books with the same ring labels in a different order are
    // different boards.
    var rings = (ms.rings || []).map(function (ring) {
      return [ring.label || '', ring.state || '', ring.annotation || ''].join(':');
    }).join('|');
    return 'rings::' + rings + '::' + String(ms.currentRing || '')
      + '::' + String(ms.breachMarks || '');
  }

  if (mapType === 'linear-track') {
    var stops = (ms.stops || ms.nodes || []).map(function (stop) {
      return [stop.id || '', stop.label || '', stop.state || '', stop.position || ''].join(':');
    }).sort().join('|');
    return 'track::' + stops + '::' + String(ms.currentPosition || ms.currentNode || '');
  }

  if (mapType === 'player-drawn') {
    return 'player::' + String(ms.mapNote || '') + '::' + String(ms.currentPosition || '');
  }

  // Grid. Coordinates are authored as col/row (the corpus shape); x/y is the
  // schema-legal alternate. Nullish-coalesce so a legitimate 0 coordinate survives.
  var tiles = (ms.tiles || []).map(function (tile) {
    var t = tile || {};
    var col = t.col ?? t.x ?? '';
    var row = t.row ?? t.y ?? '';
    return [t.label || '', t.type || '', col, row].join(':');
  }).sort().join('|');
  return 'grid::' + tiles + '::' + fingerprintPosition(ms.currentPosition);
}

// `currentPosition` is typed ['object','integer','string'] by the schema. Dispatch on
// shape instead of assuming one: an object yields "row,col"; a string or integer
// yields its own value. Assuming either shape loses the other (the D91 defect).
function fingerprintPosition(cp) {
  if (cp === undefined || cp === null || cp === '') return '';
  if (typeof cp === 'object') return (cp.row || '') + ',' + (cp.col || '');
  return String(cp);
}

// Does this mapState carry enough state to be worth comparing week over week?
// Gates the blocking stagnation check so an empty/absent board is never "identical".
export function hasComparableMapState(mapState) {
  var ms = mapState || {};
  var mapType = String(ms.mapType || 'grid').trim().toLowerCase();

  if (mapType === 'point-to-point' || mapType === 'node-graph') {
    return !!(((ms.nodes || []).length > 0) || ((ms.edges || []).length > 0) || ms.currentNode);
  }

  if (mapType === 'linear-track') {
    return !!((((ms.stops || ms.nodes || []).length > 0) || ms.currentPosition || ms.currentNode));
  }

  if (mapType === 'player-drawn') {
    return !!(ms.mapNote || ms.currentPosition);
  }

  if (mapType === 'maze') {
    return !!(((ms.nodes || []).length > 0) || ((ms.passages || []).length > 0));
  }

  if (mapType === 'concentric') {
    return !!(((ms.rings || []).length > 0) || ms.currentRing);
  }

  return !!(((ms.tiles || []).length > 0) || ms.currentPosition);
}

// Fragment-reference shape test (F.01, f12, …). Was byte-identically duplicated in
// quality.js and validation.js — same defect class as the fingerprint, folded in here
// before it could drift too.
export function looksLikeFragmentRef(ref) {
  return /^f\d+$/i.test(normalizeId(ref || ''));
}
