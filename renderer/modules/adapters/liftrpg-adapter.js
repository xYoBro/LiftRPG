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
import { PAGE_BUDGET } from '../engine/page-spec.js';
import { resolveWeekMechanicProfile } from '../mechanic-registry.js';
import { estimateSessionCardHeight } from '../session-card-metrics.js';
import {
  buildUnlockedEndingPageModel,
  resolveArtifactIdentity,
} from '../booklet-models.js';
import { renderUnlockedEndingPage } from '../booklet-primitives.js';
import {
  joinRichContentBlocks,
  splitRichContentBlocks,
} from '../utils.js';

// ---------------------------------------------------------------------------
// Section ordering
// ---------------------------------------------------------------------------

export const LIFTRPG_SECTIONS = [
  'cover', 'front-matter', 'body', 'supplements',
  'end-matter', 'endings', 'back-matter', 'padding',
];

const SESSION_CHUNK_DENSITY = 1.0;
const CHUNK_HEADER_HEIGHT = 92;
const CHUNK_FOOTER_HEIGHT = 24;
export const MAX_BOOKLET_PAGES = 80;

function singlePageGroupPolicy() {
  return { mode: 'single-page-preferred' };
}

function resolveMapSizeHint(artifactIdentity, mapState) {
  const shellFamily = String((artifactIdentity && artifactIdentity.shellFamily) || '').trim().toLowerCase();
  const boardStateMode = String((artifactIdentity && artifactIdentity.boardStateMode) || '').trim().toLowerCase();
  const mapType = String((mapState && mapState.mapType) || 'grid').trim().toLowerCase();

  if (mapType === 'player-drawn') return 'full-page';
  if (shellFamily === 'classified-packet' && (
    boardStateMode === 'node-graph'
    || boardStateMode === 'timeline-reconstruction'
    || boardStateMode === 'testimony-matrix'
  )) {
    return 'full-page';
  }
  if (mapType === 'point-to-point') return shellFamily === 'classified-packet' ? 'full-page' : 'half-page';
  if (mapType === 'grid') return 'half-page';
  return 'quarter-page';
}

function resolveTrackerSizeHint(artifactIdentity, component) {
  const shellFamily = String((artifactIdentity && artifactIdentity.shellFamily) || '').trim().toLowerCase();
  const family = String((component && (component.type || component.family)) || '').trim().toLowerCase();
  const footprint = String((component && component.footprint) || '').trim().toLowerCase();

  if (footprint === 'full-page' || footprint === 'half-page' || footprint === 'quarter-page') {
    return footprint;
  }
  if (shellFamily === 'classified-packet') {
    if (family === 'token-sheet' || family === 'overlay-window') return 'full-page';
    if (family === 'memory-slots' || family === 'inventory-grid' || family === 'dashboard') return 'half-page';
  }
  return footprint || 'half-page';
}

function resolveTrackerGroup(primaryGroup, weekIndex, attachmentStrategy, artifactIdentity, component) {
  const shellFamily = String((artifactIdentity && artifactIdentity.shellFamily) || '').trim().toLowerCase();
  const boardStateMode = String((artifactIdentity && artifactIdentity.boardStateMode) || '').trim().toLowerCase();
  const family = String((component && (component.type || component.family)) || '').trim().toLowerCase();

  if (shellFamily === 'classified-packet') {
    if (family === 'token-sheet' || family === 'overlay-window') {
      return `week-${weekIndex}-tactical-board`;
    }
    if (family === 'memory-slots' || family === 'inventory-grid') {
      return boardStateMode === 'testimony-matrix'
        ? `week-${weekIndex}-case-surface`
        : `week-${weekIndex}-support-surface`;
    }
  }

  return resolveAttachmentGroup(primaryGroup, weekIndex, attachmentStrategy, 'companion', artifactIdentity);
}

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
  const artifactIdentity = resolveArtifactIdentity(data);
  const shellFamily = artifactIdentity.shellFamily || 'field-survey';

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
  const gaugeSequence = shellFamily === 'classified-packet' || shellFamily === 'court-packet' ? 3 : 2;
  const assemblySequence = shellFamily === 'classified-packet' || shellFamily === 'court-packet' ? 2 : 0;

  atoms.push(createAtom({
    type: 'gauge-log', id: 'gauge-log', group: 'front-matter',
    section: 'front-matter', sequence: gaugeSequence,
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
    const sessionChunks = chunkWeekSessions(week.sessions || []);
    const primaryGroup = `week-${wi}-chunk-0`;
    const attachmentStrategy = resolveWeekAttachmentStrategy(artifactIdentity, week, profile);

    // Week header (kicker, title, epigraph) — before session cards
    atoms.push(createAtom({
      type: 'week-header',
      id: `w${wi}-header`,
      group: primaryGroup,
      groupPolicy: singlePageGroupPolicy(),
      section: 'body',
      sequence: wi * 1000 - 1,
      sizeHint: 'minimal',
      pageAffinity: 'left',
      data: { weekIndex: wi, weekMeta: week, totalWeeks, bookletTitle, isFirstChunk: true },
    }));

    // Session cards (left page)
    for (let chunkIndex = 0; chunkIndex < sessionChunks.length; chunkIndex++) {
      const chunk = sessionChunks[chunkIndex];
      const chunkGroup = `week-${wi}-chunk-${chunkIndex}`;
      for (let si = 0; si < chunk.sessions.length; si++) {
        const sessionIndex = chunk.startIndex + si;
        atoms.push(createAtom({
          type: 'session-card',
          id: `w${wi}-s${sessionIndex}`,
          group: chunkGroup,
          groupPolicy: singlePageGroupPolicy(),
          section: 'body',
          sequence: wi * 1000 + chunkIndex * 100 + si,
          sizeHint: 'quarter-page',
          pageAffinity: 'left',
          data: {
            session: chunk.sessions[si],
            weekIndex: wi,
            weekMeta: week,
            profile,
            totalWeeks,
          },
        }));
      }
    }

    // Week footer (progress dots) — after session cards
    atoms.push(createAtom({
      type: 'week-footer',
      id: `w${wi}-footer`,
      group: `week-${wi}-chunk-${Math.max(0, sessionChunks.length - 1)}`,
      groupPolicy: singlePageGroupPolicy(),
      section: 'body',
      sequence: wi * 1000 + Math.max(0, sessionChunks.length - 1) * 100 + 50,
      sizeHint: 'minimal',
      pageAffinity: 'left',
      data: { weekIndex: wi, totalWeeks },
    }));

    if (isBoss) {
      const needsBossAppendix = shellFamily === 'classified-packet'
        && week.bossEncounter
        && (
          !!week.bossEncounter.convergenceProof
          || !!(week.bossEncounter.binaryChoiceAcknowledgement
            && (week.bossEncounter.binaryChoiceAcknowledgement.ifA || week.bossEncounter.binaryChoiceAcknowledgement.ifB))
        );

      // Boss encounter (right page)
      atoms.push(createAtom({
        type: 'boss-encounter',
        id: `w${wi}-boss`,
        group: primaryGroup,
        groupPolicy: singlePageGroupPolicy(),
        section: 'body',
        sequence: wi * 1000 + 100,
        sizeHint: 'full-page',
        pageAffinity: 'right',
        data: { week, data, weekIndex: wi, totalWeeks },
      }));

      if (needsBossAppendix) {
        atoms.push(createAtom({
          type: 'boss-encounter',
          id: `w${wi}-boss-appendix`,
          group: `week-${wi}-boss-appendix`,
          section: 'body',
          sequence: wi * 1000 + 101,
          sizeHint: 'full-page',
          pageAffinity: 'right',
          data: {
            week,
            data,
            weekIndex: wi,
            totalWeeks,
            continuationSegment: 'followup',
            continuationLabel: 'Convergence Appendix',
          },
        }));
      }
    } else {
      // Cipher panel
      if (week.weeklyComponent || (week.fieldOps && week.fieldOps.cipher)) {
        atoms.push(createAtom({
          type: 'cipher-panel',
          id: `w${wi}-cipher`,
          group: resolveAttachmentGroup(primaryGroup, wi, attachmentStrategy, 'cipher', artifactIdentity),
          groupPolicy: singlePageGroupPolicy(),
          section: 'body',
          sequence: wi * 1000 + 100,
          sizeHint: 'quarter-page',
          pageAffinity: 'right',
          data: {
            cipher: (week.fieldOps || {}).cipher || week.weeklyComponent,
            weekIndex: wi,
            totalWeeks,
            artifactIdentity,
          },
        }));
      }

      // Oracle table
      if (week.fieldOps && week.fieldOps.oracleTable) {
        atoms.push(createAtom({
          type: 'oracle-table',
          id: `w${wi}-oracle`,
          group: resolveAttachmentGroup(primaryGroup, wi, attachmentStrategy, 'oracle', artifactIdentity),
          groupPolicy: singlePageGroupPolicy(),
          section: 'body',
          sequence: wi * 1000 + 101,
          sizeHint: 'quarter-page',
          pageAffinity: 'right',
          data: {
            oracle: week.fieldOps.oracleTable,
            weekIndex: wi,
            totalWeeks,
            artifactIdentity,
          },
        }));
      }

      // Map panel
      if (week.fieldOps && week.fieldOps.mapState) {
        atoms.push(createAtom({
          type: 'map-panel',
          id: `w${wi}-map`,
          group: resolveAttachmentGroup(primaryGroup, wi, attachmentStrategy, 'map', artifactIdentity),
          groupPolicy: singlePageGroupPolicy(),
          section: 'body',
          sequence: wi * 1000 + 102,
          sizeHint: resolveMapSizeHint(artifactIdentity, week.fieldOps.mapState),
          pageAffinity: 'right',
          data: {
            map: week.fieldOps.mapState,
            weekIndex: wi,
            totalWeeks,
            artifactIdentity,
          },
        }));
      }

      // Companion components (trackers)
      if (profile.needsCompanionSpread && profile.companionComponents) {
        for (let ci = 0; ci < profile.companionComponents.length; ci++) {
          const comp = profile.companionComponents[ci];
          const trackType = comp.type || comp.family || 'track';
          const primaryTrack = Array.isArray(comp.tracks) && comp.tracks.length ? comp.tracks[0] : null;
          const derivedSlots = Array.isArray(comp.slots)
            ? comp.slots.length
            : (typeof comp.slots === 'number' ? comp.slots : 0);
          const derivedSegments = Number.isFinite(primaryTrack && primaryTrack.segments)
            ? primaryTrack.segments
            : (Number.isFinite(comp.maxValue) ? comp.maxValue : derivedSlots || 6);
          const derivedStartValue = Number.isFinite(primaryTrack && primaryTrack.startValue)
            ? primaryTrack.startValue
            : (Number.isFinite(comp.currentValue)
              ? comp.currentValue
              : (Number.isFinite(comp.startValue) ? comp.startValue : 0));
          const richBody = ['stress-track', 'token-sheet', 'overlay-window', 'memory-slots', 'inventory-grid', 'dashboard'].includes(trackType)
            ? (comp.body || comp.description || '')
            : (comp.body || '');
          const guidance = ['stress-track', 'token-sheet', 'overlay-window', 'memory-slots', 'inventory-grid', 'dashboard'].includes(trackType)
            ? (comp.instruction || comp.description || '')
            : (comp.instruction || '');
          atoms.push(createAtom({
            type: 'tracker',
            id: `w${wi}-companion-${ci}`,
            group: resolveTrackerGroup(primaryGroup, wi, attachmentStrategy, artifactIdentity, comp),
            section: 'body',
            sequence: wi * 1000 + 200 + ci,
            sizeHint: resolveTrackerSizeHint(artifactIdentity, comp),
            pageAffinity: 'either',
            data: {
              trackType,
              label: comp.label || comp.title || 'Component',
              title: comp.title || '',
              subtitle: comp.subtitle || '',
              body: richBody,
              instruction: guidance,
              slots: derivedSlots,
              slotDefinitions: Array.isArray(comp.slots) ? comp.slots : [],
              rows: comp.rows || 0,
              cols: comp.cols || 0,
              segments: derivedSegments,
              startValue: derivedStartValue,
              currentValue: Number.isFinite(comp.currentValue) ? comp.currentValue : derivedStartValue,
              maxValue: Number.isFinite(comp.maxValue) ? comp.maxValue : derivedSegments,
              tracks: Array.isArray(comp.tracks) ? comp.tracks : [],
              tokens: Array.isArray(comp.tokens) ? comp.tokens : [],
              windows: Array.isArray(comp.windows) ? comp.windows : [],
              footprint: comp.footprint || '',
              weekIndex: wi,
              totalWeeks,
              artifactIdentity,
            },
          }));
        }
      }
    }

    if (week.overflowDocument) {
      const overflowPageCount = Math.max(1, sessionChunks.length - 1);
      for (let overflowIndex = 0; overflowIndex < overflowPageCount; overflowIndex++) {
        const chunkGroup = `week-${wi}-chunk-${Math.min(sessionChunks.length - 1, overflowIndex + 1)}`;
        atoms.push(createAtom({
          type: 'overflow-doc',
          id: `w${wi}-overflow-doc-${overflowIndex}`,
          group: chunkGroup,
          groupPolicy: singlePageGroupPolicy(),
          section: 'body',
          sequence: wi * 1000 + (overflowIndex + 1) * 100 + 90,
          sizeHint: 'full-page',
          pageAffinity: 'right',
          data: {
            document: {
              ...week.overflowDocument,
              continuationLabel: overflowIndex > 0 ? 'Continued' : '',
            },
            week,
            weekIndex: wi,
            totalWeeks,
          },
        }));
      }
    }

    if (week.interlude) {
      atoms.push(createAtom({
        type: 'interlude',
        id: `w${wi}-interlude`,
        group: `interlude-${wi}`,
        section: 'body',
        sequence: wi * 1000 + 900,
        sizeHint: 'full-page',
        pageAffinity: 'either',
        data: {
          week,
          weekIndex: wi,
          totalWeeks,
          interlude: week.interlude,
        },
      }));
    }
  }

  // ── Fragments ───────────────────────────────────────────────
  const fragments = data.fragments || [];
  for (let fi = 0; fi < fragments.length; fi++) {
    const frag = fragments[fi];
    const weight = fragmentWeight(frag);
    const standalone = fragmentMustStandAlone(frag, weight);
    const hint = standalone ? 'full-page' : weight >= 0.5 ? 'half-page' : 'flex';
    atoms.push(createAtom({
      type: 'fragment-doc',
      id: `frag-${fi}`,
      group: 'fragments',
      mustOwnPage: standalone,
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
    section: 'end-matter', sequence: assemblySequence,
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
    const endingChunks = splitEndingBody(unlockedEnding, data);

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
function inferEndingLayoutVariant(endings, payload) {
  const ending = (endings || []).find((entry) =>
    payload && payload.variant && entry && entry.variant === payload.variant,
  ) || (endings || [])[0] || {};
  const spec = String(ending.designSpec || '').toLowerCase();
  if (spec.includes('letter') || spec.includes('warm') || spec.includes('personal')) {
    return 'letter';
  }
  return 'document';
}

function fallbackSplitEndingBody(body) {
  const PAGE_CHAR_BUDGET = 2400;
  const blocks = splitRichContentBlocks(body);
  if (!blocks.length) return [''];
  if (blocks.length === 1) return [joinRichContentBlocks(blocks)];

  const chunks = [];
  let current = [];
  let currentLen = 0;

  blocks.forEach((block) => {
    const blockLen = String(block || '').length + 2;
    if (current.length > 0 && currentLen + blockLen > PAGE_CHAR_BUDGET) {
      chunks.push(joinRichContentBlocks(current));
      current = [];
      currentLen = 0;
    }
    current.push(block);
    currentLen += blockLen;
  });

  if (current.length > 0) {
    chunks.push(joinRichContentBlocks(current));
  }

  return chunks;
}

function splitEndingBody(unlockedEnding, bookletData) {
  const body = unlockedEnding && (unlockedEnding.body || unlockedEnding.content) || '';
  const blocks = splitRichContentBlocks(body);
  if (!blocks.length) return [''];
  if (blocks.length === 1) return [joinRichContentBlocks(blocks)];

  if (typeof document === 'undefined' || !document.body) {
    return fallbackSplitEndingBody(body);
  }

  const layoutVariant = inferEndingLayoutVariant(bookletData.endings, unlockedEnding);
  const measurementRoot = document.createElement('div');
  Object.assign(measurementRoot.style, {
    position: 'fixed',
    left: '-200vw',
    top: '0',
    width: '5.5in',
    visibility: 'hidden',
    pointerEvents: 'none',
    zIndex: '-1',
  });
  document.body.appendChild(measurementRoot);

  function fitsEndingChunk(chunkBlocks, options = {}) {
    const payload = {
      ...unlockedEnding,
      body: joinRichContentBlocks(chunkBlocks),
      title: options.isContinuation ? '' : (unlockedEnding.title || 'Unlocked Document'),
      kicker: options.isContinuation ? '' : (unlockedEnding.kicker || ''),
      documentType: options.isContinuation ? '' : (unlockedEnding.documentType || ''),
      finalLine: options.isLast ? (unlockedEnding.finalLine || '') : '',
      continuationLabel: options.isContinuation ? 'Continued' : '',
    };
    const entry = options.isContinuation ? { continuationLabel: 'Continued' } : null;
    const model = buildUnlockedEndingPageModel(bookletData, payload, layoutVariant, entry);
    const page = renderUnlockedEndingPage(model);
    measurementRoot.appendChild(page);

    const frame = page.querySelector('.page-frame');
    const bodyEl = page.querySelector('.endings-body');
    const fits = !!frame && !!bodyEl
      && frame.scrollHeight <= frame.clientHeight + 1
      && bodyEl.scrollHeight <= bodyEl.clientHeight + 1;

    page.remove();
    return fits;
  }

  try {
    const chunks = [];
    let start = 0;

    while (start < blocks.length) {
      let bestEnd = start + 1;

      for (let end = start + 1; end <= blocks.length; end++) {
        const fits = fitsEndingChunk(blocks.slice(start, end), {
          isContinuation: start > 0,
          isLast: end === blocks.length,
        });
        if (!fits) break;
        bestEnd = end;
      }

      if (bestEnd <= start) {
        bestEnd = Math.min(blocks.length, start + 1);
      }

      chunks.push(joinRichContentBlocks(blocks.slice(start, bestEnd)));
      start = bestEnd;
    }

    return chunks;
  } finally {
    measurementRoot.remove();
  }
}

function chunkWeekSessions(sessions, maxSessionsPerPage = 3) {
  const list = Array.isArray(sessions) ? sessions : [];
  if (!list.length) return [{ startIndex: 0, sessions: [] }];
  if (list.length <= maxSessionsPerPage) {
    return [{ startIndex: 0, sessions: list.slice() }];
  }

  const partitions = [];
  const targetChunkCount = Math.ceil(list.length / maxSessionsPerPage);

  function walk(startIndex, sizes) {
    if (startIndex >= list.length) {
      partitions.push(sizes.slice());
      return;
    }

    for (let size = 1; size <= maxSessionsPerPage; size += 1) {
      if (startIndex + size > list.length) break;
      sizes.push(size);
      walk(startIndex + size, sizes);
      sizes.pop();
    }
  }

  function scorePartition(sizes) {
    let startIndex = 0;
    let totalOverflow = 0;
    let maxLoad = 0;

    sizes.forEach((size, index) => {
      const chunk = list.slice(startIndex, startIndex + size);
      const sessionLoad = chunk.reduce(
        (sum, session) => sum + estimateSessionCardHeight(session, SESSION_CHUNK_DENSITY),
        0,
      );
      const pageLoad = sessionLoad
        + (index === 0 ? CHUNK_HEADER_HEIGHT : 0)
        + (index === sizes.length - 1 ? CHUNK_FOOTER_HEIGHT : 0);

      totalOverflow += Math.max(0, pageLoad - PAGE_BUDGET.heightPx);
      maxLoad = Math.max(maxLoad, pageLoad);
      startIndex += size;
    });

    return {
      sizes,
      totalOverflow,
      chunkCount: sizes.length,
      maxLoad,
    };
  }

  walk(0, []);

  const best = partitions
    .filter((sizes) => sizes.length === targetChunkCount)
    .map(scorePartition)
    .sort((a, b) =>
      a.totalOverflow - b.totalOverflow
      || a.chunkCount - b.chunkCount
      || a.maxLoad - b.maxLoad
    )[0];

  const chunks = [];
  let startIndex = 0;
  (best ? best.sizes : [list.length]).forEach((size) => {
    chunks.push({
      startIndex,
      sessions: list.slice(startIndex, startIndex + size),
    });
    startIndex += size;
  });

  return chunks;
}

function resolveWeekAttachmentStrategy(artifactIdentity, week, profile) {
  const explicit = String((artifactIdentity && artifactIdentity.attachmentStrategy) || '').trim().toLowerCase();
  if (explicit) return explicit;

  const fieldOps = (week && week.fieldOps) || {};
  const attachmentCount = Number(!!fieldOps.cipher) + Number(!!fieldOps.oracleTable || !!fieldOps.oracle) + Number(!!fieldOps.mapState);
  if (attachmentCount >= 3 || (profile && profile.needsCompanionSpread)) return 'split-technical';
  return 'single-dominant';
}

function resolveAttachmentGroup(primaryGroup, weekIndex, attachmentStrategy, channel, artifactIdentity = null) {
  const shellFamily = String((artifactIdentity && artifactIdentity.shellFamily) || '').trim().toLowerCase();
  const boardStateMode = String((artifactIdentity && artifactIdentity.boardStateMode) || '').trim().toLowerCase();

  if (attachmentStrategy === 'narrative-support') {
    if (channel === 'cipher') return `week-${weekIndex}-support-cipher`;
    return primaryGroup;
  }

  if (attachmentStrategy === 'split-technical' || attachmentStrategy === 'appendix-split') {
    if (shellFamily === 'classified-packet') {
      if (boardStateMode === 'node-graph' || boardStateMode === 'timeline-reconstruction') {
        if (channel === 'map') return `week-${weekIndex}-topology-board`;
        return `week-${weekIndex}-ops-ledger`;
      }
      if (boardStateMode === 'testimony-matrix') {
        if (channel === 'map') return `week-${weekIndex}-case-map`;
        return `week-${weekIndex}-case-ledger`;
      }
    }
    if (boardStateMode === 'timeline-reconstruction') {
      return channel === 'cipher' ? `week-${weekIndex}-tech-cipher` : `week-${weekIndex}-timeline-board`;
    }
    if (boardStateMode === 'testimony-matrix') {
      return channel === 'map' ? `week-${weekIndex}-tech-map` : `week-${weekIndex}-matrix-board`;
    }
    if (boardStateMode === 'node-graph') {
      return channel === 'cipher' ? `week-${weekIndex}-tech-cipher` : `week-${weekIndex}-network-board`;
    }
    if (boardStateMode === 'ledger-board') {
      return channel === 'map' ? `week-${weekIndex}-tech-map` : `week-${weekIndex}-ledger-board`;
    }
    return `week-${weekIndex}-tech-${channel}`;
  }
  return primaryGroup;
}

/**
 * Estimate fragment weight for size hint selection.
 * Mirrors the regression-contract fragment governor so authored archive
 * pacing matches the page plan used in layout checks.
 */
function fragmentWeight(fragment) {
  const body = (fragment.bodyText || fragment.body || fragment.content || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const documentType = String(fragment.documentType || '').toLowerCase();
  let weight = Math.max(0.62, Math.min(body.length / 1600, 1.4));

  if (['memo', 'report', 'inspection', 'correspondence', 'transcript', 'anomaly'].includes(documentType)) {
    weight += 0.16;
  }
  if (['letter', 'form', 'fieldnote', 'field-note'].includes(documentType)) {
    weight += 0.08;
  }
  if ((((fragment || {}).designSpec || {}).hasAnnotations)) weight += 0.04;
  if ((((fragment || {}).designSpec || {}).hasRedactions)) weight += 0.04;

  return Math.min(weight, 1.55);
}

function fragmentMustStandAlone(fragment, weight = fragmentWeight(fragment)) {
  const body = (fragment.bodyText || fragment.body || fragment.content || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const documentType = String(fragment.documentType || '').toLowerCase();

  return weight >= 0.9
    || body.length >= 900
    || ['memo', 'report', 'inspection', 'correspondence', 'transcript', 'anomaly', 'letter'].includes(documentType);
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
