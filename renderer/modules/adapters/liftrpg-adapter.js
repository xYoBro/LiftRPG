/**
 * liftrpg-adapter.js — LiftRPG v1.3 schema → universal atoms
 *
 * Transforms LiftRPG booklet JSON into the engine's universal atom format.
 * All LiftRPG domain logic lives here — the engine knows nothing about
 * weeks, sessions, field ops, or any LiftRPG concept.
 *
 * This is the reference adapter implementation. Third-party engines would
 * write their own adapter following the same pattern:
 *   extractAtoms(data) → AtomDescriptor[]
 *
 * @module adapters/liftrpg-adapter
 */

import { createAtom } from '../engine/atom-registry.js';
import { resolveWeekMechanicProfile } from '../mechanic-registry.js';

// ---------------------------------------------------------------------------
// Section ordering
// ---------------------------------------------------------------------------

export const LIFTRPG_SECTIONS = [
  'cover', 'front-matter', 'body', 'supplements',
  'end-matter', 'endings', 'back-matter', 'padding',
];

// ---------------------------------------------------------------------------
// Main extraction
// ---------------------------------------------------------------------------

/**
 * Extract universal atoms from LiftRPG v1.3 JSON.
 *
 * @param {object} data — the full booklet JSON
 * @param {object} [unlockedEnding] — decrypted ending content (if available)
 * @returns {AtomDescriptor[]}
 */
export function extractLiftRPGAtoms(data, unlockedEnding = null) {
  const atoms = [];

  // ── Cover ───────────────────────────────────────────────────
  atoms.push(createAtom({
    type: 'cover', id: 'cover', group: 'cover',
    section: 'cover', sequence: 0,
    sizeHint: 'full-page', pageAffinity: 'right',
    data: data,   // buildCoverPageModel needs the full data object
  }));

  // ── Rules spread ────────────────────────────────────────────
  atoms.push(createAtom({
    type: 'rules-block', id: 'rules-left', group: 'rules',
    section: 'front-matter', sequence: 0,
    sizeHint: 'full-page', pageAffinity: 'left',
    data: { side: 'left', data },
  }));
  atoms.push(createAtom({
    type: 'rules-block', id: 'rules-right', group: 'rules',
    section: 'front-matter', sequence: 1,
    sizeHint: 'full-page', pageAffinity: 'right',
    data: { side: 'right', data },
  }));

  // ── Gauge log ───────────────────────────────────────────────
  atoms.push(createAtom({
    type: 'gauge-log', id: 'gauge-log', group: 'front-matter',
    section: 'front-matter', sequence: 2,
    sizeHint: 'full-page', pageAffinity: 'either',
    data: data,
  }));

  // ── Weeks ───────────────────────────────────────────────────
  const weeks = data.weeks || [];
  for (let wi = 0; wi < weeks.length; wi++) {
    const week = weeks[wi];
    const isBoss = !!week.isBossWeek;
    const profile = resolveWeekMechanicProfile(week);

    // Session cards (left page)
    const sessions = week.sessions || [];
    for (let si = 0; si < sessions.length; si++) {
      atoms.push(createAtom({
        type: 'session-card',
        id: `w${wi}-s${si}`,
        group: `week-${wi}`,
        section: 'body',
        sequence: wi * 1000 + si,
        sizeHint: 'quarter-page',
        pageAffinity: 'left',
        data: { session: sessions[si], weekIndex: wi, weekMeta: week, profile },
      }));
    }

    if (isBoss) {
      // Boss encounter (right page)
      atoms.push(createAtom({
        type: 'boss-encounter',
        id: `w${wi}-boss`,
        group: `week-${wi}`,
        section: 'body',
        sequence: wi * 1000 + 100,
        sizeHint: 'full-page',
        pageAffinity: 'right',
        data: { week, data },
      }));
    } else {
      // Cipher panel
      if (week.weeklyComponent || (week.fieldOps && week.fieldOps.cipher)) {
        atoms.push(createAtom({
          type: 'cipher-panel',
          id: `w${wi}-cipher`,
          group: `week-${wi}`,
          section: 'body',
          sequence: wi * 1000 + 100,
          sizeHint: 'quarter-page',
          pageAffinity: 'right',
          data: { cipher: (week.fieldOps || {}).cipher || week.weeklyComponent, weekIndex: wi },
        }));
      }

      // Oracle table
      if (week.fieldOps && week.fieldOps.oracleTable) {
        atoms.push(createAtom({
          type: 'oracle-table',
          id: `w${wi}-oracle`,
          group: `week-${wi}`,
          section: 'body',
          sequence: wi * 1000 + 101,
          sizeHint: 'quarter-page',
          pageAffinity: 'right',
          data: { oracle: week.fieldOps.oracleTable, weekIndex: wi },
        }));
      }

      // Map panel
      if (week.fieldOps && week.fieldOps.mapState) {
        const mapType = week.fieldOps.mapState.mapType || 'grid';
        const mapHint = (mapType === 'player-drawn') ? 'half-page' : 'quarter-page';
        atoms.push(createAtom({
          type: 'map-panel',
          id: `w${wi}-map`,
          group: `week-${wi}`,
          section: 'body',
          sequence: wi * 1000 + 102,
          sizeHint: mapHint,
          pageAffinity: 'right',
          data: { map: week.fieldOps.mapState, weekIndex: wi },
        }));
      }

      // Companion components (trackers)
      if (profile.needsCompanionSpread && profile.companionComponents) {
        for (let ci = 0; ci < profile.companionComponents.length; ci++) {
          const comp = profile.companionComponents[ci];
          atoms.push(createAtom({
            type: 'tracker',
            id: `w${wi}-companion-${ci}`,
            group: `week-${wi}-companions`,
            section: 'body',
            sequence: wi * 1000 + 200 + ci,
            sizeHint: comp.footprint || 'half-page',
            pageAffinity: 'either',
            data: {
              trackType: comp.family === 'stress-track' ? 'gauge' : 'track',
              label: comp.title || 'Component',
              segments: (comp.tracks && comp.tracks[0] && comp.tracks[0].segments) || 6,
              startValue: (comp.tracks && comp.tracks[0] && comp.tracks[0].startValue) || 0,
            },
          }));
        }
      }
    }
  }

  // ── Fragments ───────────────────────────────────────────────
  const fragments = data.fragments || [];
  for (let fi = 0; fi < fragments.length; fi++) {
    const frag = fragments[fi];
    const weight = fragmentWeight(frag);
    const hint = weight >= 0.9 ? 'full-page' : weight >= 0.5 ? 'half-page' : 'flex';
    atoms.push(createAtom({
      type: 'fragment-doc',
      id: `frag-${fi}`,
      group: 'fragments',
      section: 'supplements',
      sequence: fi,
      sizeHint: hint,
      pageAffinity: 'either',
      data: frag,
    }));
  }

  // ── Assembly page ───────────────────────────────────────────
  atoms.push(createAtom({
    type: 'assembly-page', id: 'assembly', group: 'end-matter',
    section: 'end-matter', sequence: 0,
    sizeHint: 'full-page', pageAffinity: 'either',
    data: data,
  }));

  // ── Endings ─────────────────────────────────────────────────
  atoms.push(createAtom({
    type: 'ending', id: 'ending-locked', group: 'endings',
    section: 'endings', sequence: 0,
    sizeHint: 'full-page', pageAffinity: 'either',
    data: { type: 'locked', data },
  }));

  if (unlockedEnding) {
    atoms.push(createAtom({
      type: 'ending', id: 'ending-unlocked', group: 'endings',
      section: 'endings', sequence: 1,
      sizeHint: 'full-page', pageAffinity: 'either',
      data: { type: 'unlocked', data, content: unlockedEnding },
    }));
  }

  // ── Back cover ──────────────────────────────────────────────
  atoms.push(createAtom({
    type: 'back-cover', id: 'back-cover', group: 'back-matter',
    section: 'back-matter', sequence: 0,
    sizeHint: 'full-page', pageAffinity: 'left',
    data: data,
  }));

  return atoms;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Estimate fragment weight for size hint selection.
 * Ported from layout-governor.js logic.
 */
function fragmentWeight(fragment) {
  const bodyLen = (fragment.bodyText || fragment.body || fragment.content || '').length;
  const type = fragment.documentType || '';
  let weight = 0.62;
  if (bodyLen > 600) weight += (bodyLen - 600) / 1000;
  if (['transcript', 'form'].includes(type)) weight += 0.15;
  return Math.min(1.55, weight);
}

// ---------------------------------------------------------------------------
// Spread model resolution
// ---------------------------------------------------------------------------

/**
 * Resolve spread model from data + governor logic.
 * LLM suggests, governor overrides based on content density.
 *
 * @param {object} data — full booklet JSON
 * @returns {{ model: string, overridden: boolean, reason: string }}
 */
export function resolveSpreadModel(data) {
  const requested = (data.meta || {}).spreadModel || null;
  const weeks = data.weeks || [];
  if (weeks.length === 0) {
    return { model: 'grouped', overridden: false, reason: 'no-weeks' };
  }

  const avgSessions = weeks.reduce((s, w) => s + (w.sessions || []).length, 0) / weeks.length;

  // Override: too many sessions for per-session
  if (requested === 'per-session' && avgSessions >= 4) {
    return { model: 'grouped', overridden: true, reason: 'density-override' };
  }
  // Override: too few sessions for grouped
  if (requested === 'grouped' && avgSessions <= 1) {
    return { model: 'per-session', overridden: true, reason: 'sparsity-promotion' };
  }
  // Auto-select
  if (!requested) {
    const model = avgSessions <= 2 ? 'per-session' : 'grouped';
    return { model, overridden: false, reason: 'auto-selected' };
  }
  return { model: requested, overridden: false, reason: 'schema-requested' };
}

// ---------------------------------------------------------------------------
// Public adapter interface
// ---------------------------------------------------------------------------

export const liftrpgAdapter = {
  extractAtoms: extractLiftRPGAtoms,
  sectionOrder: LIFTRPG_SECTIONS,
  resolveSpreadModel,
};
