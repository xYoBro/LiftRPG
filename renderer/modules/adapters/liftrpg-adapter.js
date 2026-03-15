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
  const totalWeeks = weeks.length;
  const bookletTitle = (data.cover || {}).title || ((data.meta || {}).blockTitle) || 'LiftRPG';

  for (let wi = 0; wi < weeks.length; wi++) {
    const week = weeks[wi];
    const isBoss = !!week.isBossWeek;
    const profile = resolveWeekMechanicProfile(week);

    // Week header (kicker, title, epigraph) — before session cards
    atoms.push(createAtom({
      type: 'week-header',
      id: `w${wi}-header`,
      group: `week-${wi}`,
      section: 'body',
      sequence: wi * 1000 - 1,
      sizeHint: 'minimal',
      pageAffinity: 'left',
      data: { weekIndex: wi, weekMeta: week, totalWeeks, bookletTitle, isFirstChunk: true },
    }));

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
        data: { session: sessions[si], weekIndex: wi, weekMeta: week, profile, totalWeeks },
      }));
    }

    // Week footer (progress dots) — after session cards
    atoms.push(createAtom({
      type: 'week-footer',
      id: `w${wi}-footer`,
      group: `week-${wi}`,
      section: 'body',
      sequence: wi * 1000 + 50,
      sizeHint: 'minimal',
      pageAffinity: 'left',
      data: { weekIndex: wi, totalWeeks },
    }));

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
        data: { week, data, weekIndex: wi, totalWeeks },
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
          data: { cipher: (week.fieldOps || {}).cipher || week.weeklyComponent, weekIndex: wi, totalWeeks },
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
          data: { oracle: week.fieldOps.oracleTable, weekIndex: wi, totalWeeks },
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
          data: { map: week.fieldOps.mapState, weekIndex: wi, totalWeeks },
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
              weekIndex: wi,
              totalWeeks,
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
  // Show either the locked (sealed) page OR the unlocked ending —
  // never both. The locked page is the default; unlocking replaces it.
  if (!unlockedEnding) {
    atoms.push(createAtom({
      type: 'ending', id: 'ending-locked', group: 'endings',
      section: 'endings', sequence: 0,
      sizeHint: 'full-page', pageAffinity: 'either',
      data: { type: 'locked', data },
    }));
  }

  if (unlockedEnding) {
    const endingBody = unlockedEnding.body || unlockedEnding.content || '';
    const endingChunks = splitEndingBody(endingBody);

    for (let ei = 0; ei < endingChunks.length; ei++) {
      const isFirst = ei === 0;
      const isLast = ei === endingChunks.length - 1;
      atoms.push(createAtom({
        type: 'ending', id: `ending-unlocked-${ei}`, group: 'endings',
        section: 'endings', sequence: 1 + ei,
        sizeHint: 'full-page', pageAffinity: 'either',
        data: {
          type: 'unlocked',
          data,
          content: {
            ...unlockedEnding,
            body: endingChunks[ei],
            // Title and kicker only on first page
            title: isFirst ? (unlockedEnding.title || 'Unlocked Document') : '',
            kicker: isFirst ? (unlockedEnding.kicker || '') : '',
            documentType: isFirst ? (unlockedEnding.documentType || '') : '',
            // Final line only on last page
            finalLine: isLast ? (unlockedEnding.finalLine || '') : '',
            // Continuation label on subsequent pages
            continuationLabel: isFirst ? '' : 'Continued',
          },
        },
      }));
    }
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
 * Split a long ending body into page-sized chunks.
 * Splits on paragraph boundaries (double newline). Returns as many
 * chunks as needed — no artificial cap.
 *
 * @param {string} body — the ending body text (string or HTML)
 * @returns {string[]} array of body chunks
 */
function splitEndingBody(body) {
  const PAGE_CHAR_BUDGET = 1800;
  const text = typeof body === 'string' ? body : '';
  if (!text || text.length <= PAGE_CHAR_BUDGET) return [text || ''];

  const paragraphs = text.split(/\n\n+/);
  if (paragraphs.length <= 1) return [text];

  // Greedily fill pages up to the character budget
  const chunks = [];
  let current = [];
  let currentLen = 0;

  for (const para of paragraphs) {
    const paraLen = para.length + 2; // +2 for the \n\n separator
    if (current.length > 0 && currentLen + paraLen > PAGE_CHAR_BUDGET) {
      chunks.push(current.join('\n\n'));
      current = [];
      currentLen = 0;
    }
    current.push(para);
    currentLen += paraLen;
  }
  if (current.length > 0) chunks.push(current.join('\n\n'));

  return chunks;
}

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
