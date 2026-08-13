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
import {
  estimateSessionCardHeight,
  estimateSoloSessionCardHeight,
  sessionCardsGapPx,
  PAGE_FRAME_PAD_Y_PX,
} from '../session-card-metrics.js';
// The chunker charges the week furniture the same numbers the atoms estimate
// for themselves — importing the estimate is how those stay one model rather
// than two constants drifting apart (the old CHUNK_HEADER_HEIGHT was 92px
// against a measured 79.6–141.1). The adapter already reaches into Layer 0 for
// booklet-primitives; these are estimate exports, not renderers.
import { estimateWeekHeaderHeight } from '../atoms/week-header.js';
import { WEEK_FOOTER_HEIGHT_PX } from '../atoms/week-footer.js';
// The ledger's page capacity is derived from its own row geometry, so the
// chunk size below and the atom's height model are one piece of arithmetic —
// an over-long roster cannot become an unsat page.
import { LEDGER_ROWS_PER_PAGE } from '../atoms/ledger-spread.js';
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

/**
 * The density the chunker evaluates candidate pages at.
 *
 * Maximum, deliberately: the chunker is not asking "does this page fit
 * comfortably", it is asking "CAN this page be made to fit at all". A page
 * that overflows at 1.0 has no density path left, which is precisely the state
 * the planner's stall probe resolves by shedding a card onto a new page. See
 * scorePartition() below.
 */
const SESSION_CHUNK_DENSITY = 1.0;
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

/**
 * Determine the rowGroup key for balanced cipher + map pairing.
 * Returns a shared rowGroup string when both cipher and map are present
 * and the layout variant will be `balanced` (halves row). Returns null
 * when a dominant variant is expected (each surface full-width).
 *
 * This mirrors the logic in resolveLayoutVariant() from mechanic-layout.js
 * so the adapter's rowGroup annotation matches actual render behavior.
 *
 * @param {object} artifactIdentity
 * @param {object} week
 * @param {number} weekIndex
 * @returns {string|null}
 */
function resolveBalancedRowGroup(artifactIdentity, week, weekIndex, attachmentStrategy) {
  // Split strategies place cipher and map on separate pages — rowGroup
  // pairing intent cannot be fulfilled, so don't emit it.
  if (attachmentStrategy === 'split-technical' || attachmentStrategy === 'appendix-split'
      || attachmentStrategy === 'fragments-as-filed-documents') {
    return null;
  }

  const boardStateMode = String((artifactIdentity && artifactIdentity.boardStateMode) || 'survey-grid');
  const mapState = week.fieldOps && week.fieldOps.mapState;
  const mapType = mapState ? String(mapState.mapType || '').toLowerCase() : '';

  // Dominant layouts — surfaces render full-width, no pairing
  if (boardStateMode === 'timeline-reconstruction') return null;
  if (boardStateMode === 'testimony-matrix') return null;
  if (boardStateMode === 'node-graph') return null;
  if (mapType === 'player-drawn') return null;

  // Balanced only when both cipher and map are present
  const hasCipher = !!(week.weeklyComponent || (week.fieldOps && week.fieldOps.cipher));
  const hasMap = !!mapState;
  if (hasCipher && hasMap) return `week-${weekIndex}-surfaces`;

  return null;
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
  const shellAttrs = {
    'shell-family': artifactIdentity.shellFamily || 'field-survey',
    'board-state-mode': artifactIdentity.boardStateMode || 'survey-grid',
    'attachment-strategy': artifactIdentity.attachmentStrategy || 'split-technical',
  };

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
    const sessionChunks = chunkWeekSessions(week.sessions || [], week);
    const primaryGroup = `week-${wi}-chunk-0`;
    const attachmentStrategy = resolveWeekAttachmentStrategy(artifactIdentity);
    const balancedRowGroup = isBoss ? null : resolveBalancedRowGroup(artifactIdentity, week, wi, attachmentStrategy);

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
      // THE OWNERSHIP DECLARATION (see sessionChunkOwnsPage). Declared here,
      // where the seating is decided, and carried on the atom so phase-1
      // estimation and the renderer read the SAME answer — the estimate side
      // has no DOM and the renderer has no chunk table.
      const ownsPage = sessionChunkOwnsPage(
        week, chunkIndex, sessionChunks.length, chunk.sessions.length,
      );
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
            ownsPage,
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
          continuationOf: `w${wi}-boss`,
          continuationOrigin: 'adapter',
          continuationAdjacency: 'ordered',
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
          shellAttrs,
          group: resolveAttachmentGroup(primaryGroup, wi, attachmentStrategy, 'cipher', artifactIdentity),
          groupPolicy: singlePageGroupPolicy(),
          rowGroup: balancedRowGroup,
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
          shellAttrs,
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
          shellAttrs,
          group: resolveAttachmentGroup(primaryGroup, wi, attachmentStrategy, 'map', artifactIdentity),
          groupPolicy: singlePageGroupPolicy(),
          rowGroup: balancedRowGroup,
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

      // Constrained grid — the deduction board (W5b). Full-width by
      // footprint: a logic grid is subjects x (values x categories) cells and
      // a nonogram carries clue gutters on two sides, so neither survives a
      // half slot. It therefore declares no rowGroup — the engine gives it a
      // full row, which is placement it decides and this file only enables.
      if (week.fieldOps && week.fieldOps.constrainedGrid) {
        atoms.push(createAtom({
          type: 'constrained-grid',
          id: `w${wi}-cgrid`,
          shellAttrs,
          group: resolveAttachmentGroup(primaryGroup, wi, attachmentStrategy, 'cipher', artifactIdentity),
          groupPolicy: singlePageGroupPolicy(),
          section: 'body',
          sequence: wi * 1000 + 103,
          sizeHint: 'half-page',
          pageAffinity: 'either',
          data: {
            grid: week.fieldOps.constrainedGrid,
            weekIndex: wi,
            totalWeeks,
            artifactIdentity,
          },
        }));
      }

      // Word grid — the letter hunt (W5b). Full-width for the same reason the
      // deduction board is: a letter board plus its word list does not survive
      // a half slot.
      if (week.fieldOps && week.fieldOps.wordGrid) {
        atoms.push(createAtom({
          type: 'word-grid',
          id: `w${wi}-wgrid`,
          shellAttrs,
          group: resolveAttachmentGroup(primaryGroup, wi, attachmentStrategy, 'cipher', artifactIdentity),
          groupPolicy: singlePageGroupPolicy(),
          section: 'body',
          sequence: wi * 1000 + 104,
          sizeHint: 'half-page',
          pageAffinity: 'either',
          data: {
            wordGrid: week.fieldOps.wordGrid,
            weekIndex: wi,
            totalWeeks,
            artifactIdentity,
          },
        }));
      }

      // Clocks panel — see the emission below the boss branch.

      // Reckoning panel — see the emission below the boss branch.

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
          const richBody = ['stress-track', 'token-sheet', 'overlay-window', 'memory-slots', 'inventory-grid', 'dashboard', 'percentile-stat'].includes(trackType)
            ? (comp.body || comp.description || '')
            : (comp.body || '');
          const guidance = ['stress-track', 'token-sheet', 'overlay-window', 'memory-slots', 'inventory-grid', 'dashboard', 'percentile-stat'].includes(trackType)
            ? (comp.instruction || comp.description || '')
            : (comp.instruction || '');
          atoms.push(createAtom({
            type: 'tracker',
            id: `w${wi}-companion-${ci}`,
            zone: 'companion',
            shellAttrs,
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
              // percentile-stat (schema 1.5.0): authored per-week values the
              // player circles, plus the advantage sentence. Carried verbatim —
              // the adapter never recomputes the climb.
              statName: comp.statName || '',
              weeklyValues: Array.isArray(comp.weeklyValues) ? comp.weeklyValues : [],
              advantageRule: comp.advantageRule || '',
              footprint: comp.footprint || '',
              weekIndex: wi,
              totalWeeks,
              artifactIdentity,
            },
          }));
        }
      }
    }

    // ── Clocks panel (week-level gameplayClocks) ──────────────────────────
    // Emitted OUTSIDE the boss branch, and that placement is load-bearing:
    // nine of the eleven corpus fixtures that author clocks put a set on the
    // BOSS week — twenty clocks on the weeks that matter most, where the
    // danger clock is supposed to be running out. A non-boss-only emission
    // would have printed 48 of the 57 authored panels and quietly reproduced
    // the very defect this atom exists to close.
    //
    // SEATING, both cases:
    //   • Non-boss — a PEER of cipher / oracle / map in the week's field-ops
    //     attachment group, sequenced after the map. clocks-panel is not a
    //     mechanic SURFACE type, so mechanic-layout.js's row template drops it
    //     into the `other` bucket (one full-width row below the oracle) and
    //     getMechanicSlotWidthPx() never offers it a half slot. No rowGroup:
    //     the balanced pair is cipher and map, and a third member would either
    //     orphan (the planner's rowGroup-orphan diagnostic) or displace one.
    //   • Boss — the reckoning panel's seat, for the reckoning panel's reason.
    //     A boss week has no cipher/oracle/map to ride beside and the boss
    //     encounter locks a full page, so a field-ops seat strands the panel on
    //     a near-void right page. It joins the week's FINAL session-chunk group
    //     on the left instead, between the last card and the week footer, at a
    //     sequence just ahead of the reckoning panel: mark the sets, read the
    //     clocks, then resolve.
    if (Array.isArray(week.gameplayClocks) && week.gameplayClocks.length) {
      const lastChunk = Math.max(0, sessionChunks.length - 1);
      const clocksSeat = isBoss
        ? {
          group: `week-${wi}-chunk-${lastChunk}`,
          sequence: wi * 1000 + lastChunk * 100 + 39,
          pageAffinity: 'left',
        }
        : {
          group: resolveAttachmentGroup(primaryGroup, wi, attachmentStrategy, 'clocks', artifactIdentity),
          sequence: wi * 1000 + 104,
          pageAffinity: 'right',
        };

      atoms.push(createAtom({
        type: 'clocks-panel',
        id: `w${wi}-clocks`,
        shellAttrs,
        group: clocksSeat.group,
        groupPolicy: singlePageGroupPolicy(),
        section: 'body',
        sequence: clocksSeat.sequence,
        sizeHint: 'quarter-page',
        pageAffinity: clocksSeat.pageAffinity,
        data: {
          clocks: week.gameplayClocks,
          weekIndex: wi,
          totalWeeks,
          artifactIdentity,
        },
      }));
    }

    // ── Reckoning panel (the Resolve surface) ─────────────────────────────
    // Emitted OUTSIDE the boss branch on purpose: the boss week is where the
    // threshold prints, and a boss week has no cipher/oracle/map to ride
    // along with. Everything about it is dormant until `week.reckoning`
    // exists — no corpus fixture carries one, so no corpus atom stream moves.
    //
    // `weekTargetCount` is summed HERE, not in the atom, so the panel's
    // estimate() stays a pure function of its own data. An estimator that
    // reached back into the week's sessions would be reading data the engine
    // never handed it, which is how a phase-1 estimate starts disagreeing
    // with the DOM it is supposed to predict.
    if (week.reckoning) {
      const weekTargetCount = (week.sessions || []).reduce((sum, session) => {
        const targets = session && session.markStrip && session.markStrip.targets;
        return sum + (Array.isArray(targets) ? targets.length : 0);
      }, 0);

      // SEATING (the shape debt, paid): a boss week has no cipher/oracle/map
      // for the panel to ride beside, and the boss encounter owns a full page,
      // so a field-ops seat there stranded the panel on an ~85%-void right
      // page. On boss weeks the panel now joins the week's FINAL session-chunk
      // group on the left, seated between the last card and the week footer.
      // Everywhere else it keeps its field-ops seat beside cipher/oracle/map.
      //
      // This seating was tried once and reverted, because the panel printed
      // ABOVE the last card despite its higher sequence. That was never a
      // binning or zone-routing fault — the plan was right all along. The
      // hoist lived in page COMPOSITION: renderWorkoutPage() in
      // page-renderer.js emitted a workout page by TYPE PARTITION (every
      // non-card atom first, then the cards, then the footer), so any atom
      // seated after a card was lifted above it. It had never shown because
      // the week header was the only non-card atom that had ever landed on a
      // workout page, and it sorts first anyway. renderWorkoutPage() now
      // composes in placement order — the fix lives there, not here.
      const lastChunkIndex = Math.max(0, sessionChunks.length - 1);
      const reckoningSeat = isBoss
        ? {
          // Cards in the chunk run at +0…+n, the footer at +50; +40 lands the
          // panel after every card and before the footer.
          group: `week-${wi}-chunk-${lastChunkIndex}`,
          sequence: wi * 1000 + lastChunkIndex * 100 + 40,
          pageAffinity: 'left',
        }
        : {
          group: resolveAttachmentGroup(primaryGroup, wi, attachmentStrategy, 'reckoning', artifactIdentity),
          sequence: wi * 1000 + 103,
          pageAffinity: 'right',
        };

      atoms.push(createAtom({
        type: 'reckoning-panel',
        id: `w${wi}-reckoning`,
        shellAttrs,
        group: reckoningSeat.group,
        groupPolicy: singlePageGroupPolicy(),
        section: 'body',
        sequence: reckoningSeat.sequence,
        sizeHint: 'quarter-page',
        pageAffinity: reckoningSeat.pageAffinity,
        data: {
          reckoning: week.reckoning,
          weekIndex: wi,
          totalWeeks,
          economy: data.meta && data.meta.economy,
          weekTargetCount,
          artifactIdentity,
        },
      }));
    }

    if (week.overflowDocument) {
      const overflowPageCount = Math.max(1, sessionChunks.length - 1);
      for (let overflowIndex = 0; overflowIndex < overflowPageCount; overflowIndex++) {
        const chunkGroup = `week-${wi}-chunk-${Math.min(sessionChunks.length - 1, overflowIndex + 1)}`;
        atoms.push(createAtom({
          type: 'overflow-doc',
          id: `w${wi}-overflow-doc-${overflowIndex}`,
          continuationOf: overflowIndex > 0 ? `w${wi}-overflow-doc-${overflowIndex - 1}` : null,
          continuationOrigin: overflowIndex > 0 ? 'adapter' : null,
          continuationAdjacency: overflowIndex > 0 ? 'ordered' : null,
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
    const standalone = fragmentMustStandAlone(frag);
    const hint = standalone ? 'full-page' : weight >= 0.5 ? 'half-page' : 'flex';
    atoms.push(createAtom({
      type: 'fragment-doc',
      id: `frag-${fi}`,
      shellAttrs,
      group: 'fragments',
      mustOwnPage: standalone,
      section: 'supplements',
      sequence: fi,
      sizeHint: hint,
      pageAffinity: 'either',
      data: {
        ...frag,
        artifactIdentity,
      },
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
        continuationOf: isFirst ? null : `ending-unlocked-${ei - 1}`,
        continuationOrigin: isFirst ? null : 'adapter',
        continuationAdjacency: isFirst ? null : 'required',
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

  // ── The Ledger — the closing spread ─────────────────────────
  //
  // EMISSION GATE: `meta.economy` and nothing else. The ledger is the mark
  // economy's capstone (D89 family) — a page that audits what six weeks moved,
  // in a book whose whole spine is banking marks. A booklet with no economy
  // gets no ledger, which is also what keeps the nineteen pre-economy corpus
  // fixtures byte-identical in their page plans: the gate is the dormancy
  // guarantee, not a preference.
  //
  // SEATED IN `endings`, NOT `back-matter`, and the reason is mechanical. The
  // planner inserts saddle-stitch padding immediately BEFORE the first
  // back-matter spread (findPaddingInsertIndex), so a back-matter seat would
  // print the ledger AFTER the blank notes pages — the closing spread, filed
  // behind the filler. Sequence 900 puts it after every ending chunk, so the
  // printed order is: ending → ledger → padding → back cover.
  //
  // The adapter owns the roster and the chunking; the engine owns placement.
  // Nothing here names a page.
  const economy = (data.meta || {}).economy;
  if (economy) {
    const roster = extractMovementRoster(data);
    if (roster.length) {
      const ledgerPageCount = Math.ceil(roster.length / LEDGER_ROWS_PER_PAGE);
      for (let li = 0; li < ledgerPageCount; li++) {
        const slice = roster.slice(li * LEDGER_ROWS_PER_PAGE, (li + 1) * LEDGER_ROWS_PER_PAGE);
        atoms.push(createAtom({
          type: 'ledger-spread',
          id: `ledger-${li}`,
          continuationOf: li > 0 ? `ledger-${li - 1}` : null,
          continuationOrigin: li > 0 ? 'adapter' : null,
          continuationAdjacency: li > 0 ? 'ordered' : null,
          group: 'ledger',
          section: 'endings',
          sequence: 900 + li,
          sizeHint: 'full-page',
          pageAffinity: 'either',
          data: {
            movements: slice,
            partIndex: li,
            partCount: ledgerPageCount,
            continuationLabel: li > 0 ? 'Continued' : '',
            economy,
          },
        }));
      }
    }
  }

  // ── Back cover ──────────────────────────────────────────────
  atoms.push(createAtom({
    type: 'back-cover', id: 'back-cover', group: 'back-matter',
    section: 'back-matter', sequence: 0,
    sizeHint: 'full-page', pageAffinity: 'left',
    data: data,
  }));

  // Merge boundary (engine IR): spreads from different weeks must never
  // compact together. The adapter owns the mapping week → mergeKey; the
  // engine reads only the IR field, never data.weekIndex (charter).
  for (const atom of atoms) {
    if (atom.data && typeof atom.data.weekIndex === 'number') {
      atom.mergeKey = atom.data.weekIndex;
    }
  }
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

/**
 * THE OWNERSHIP TEST — does a one-card chunk's card actually OWN its page?
 *
 * DECLARATION, not a guess: this is the single home of the predicate, and the
 * adapter is the only component that can answer it at estimate time, because
 * the adapter is what SEATS the other atoms. Its answer rides the session-card
 * atom as `data.ownsPage`, and three consumers read that one flag:
 *
 *   • `chunkWeekSessions()` scoring (below) — which chunk shapes to prefer.
 *   • `atoms/session-card.js` estimate() — phase 1, no DOM: solo geometry is a
 *     different object, and the atom cannot know its page without being told.
 *   • `page-renderer.js` renderWorkoutPage() — stamps `data-solo-card="1"`,
 *     which is what `booklet.css`'s single-card block now keys on. The
 *     renderer ANDs the declaration with the page it actually composed, so
 *     render can only be less solo than the estimate assumed (the safe
 *     direction: the solo model is the taller one).
 *
 * ── WHY THE OLD CONDITION WAS WRONG (D112, the mute-spread mechanism) ───────
 *
 * The CSS asked `data-card-count="1"` — "is this the only card here?" — and
 * answered yes on a page carrying a WEEK HEADER plus one card. The notes floor
 * (260px, density-invariant by contract, because on a one-card page the notes
 * box IS the page) then claimed height the page did not have: measured on
 * book1-glassworks, grafting the 83px week header onto a solo card page took
 * the frame from 720/720px to 764/720 — 44px of overflow that NO density can
 * answer, because every rule in that block is density-invariant. The solver
 * spent its passes, shed the card onto its own page, and the header stranded
 * alone at 11% fill: one mute spread per week. The floor was right; its
 * CONDITION was wrong. A card owns its page only when nothing else is seated
 * there.
 *
 * ── WHAT COUNTS AS SHARING ─────────────────────────────────────────────────
 *
 *   • Chunk 0 always carries the week-header atom (see the emission loop) —
 *     never solo, however few cards it holds.
 *   • A BOSS week's final chunk carries the clocks panel and/or the reckoning
 *     panel on the left (`pageAffinity: 'left'`, same chunk group) — never
 *     solo. The two conditions below mirror those emission guards exactly;
 *     changing one without the other re-opens this defect class.
 *   • The week footer does NOT count. It is a ~20px page-structural band the
 *     renderer positions (ZONE-ASSIGNMENT-DESIGN §6), not flow content, and it
 *     has always shared the solo page.
 *
 * @param {object|null} week — the schema week (for boss-panel seating)
 * @param {number} chunkIndex
 * @param {number} chunkCount
 * @param {number} chunkSize — cards in this chunk
 * @returns {boolean}
 */
function sessionChunkOwnsPage(week, chunkIndex, chunkCount, chunkSize) {
  if (chunkSize !== 1) return false;
  if (chunkIndex === 0) return false;
  if (chunkIndex === chunkCount - 1 && weekSeatsBossPanelsLeft(week)) return false;
  return true;
}

/**
 * Does this week seat a clocks and/or reckoning panel on the LEFT, beside its
 * final session chunk? Mirrors the seating guards in the emission loop.
 */
function weekSeatsBossPanelsLeft(week) {
  if (!week || !week.isBossWeek) return false;
  const hasClocks = Array.isArray(week.gameplayClocks) && week.gameplayClocks.length > 0;
  return hasClocks || !!week.reckoning;
}

/**
 * Decide which sessions share a workout page.
 *
 * ── WHAT THE SCORE MEANS ───────────────────────────────────────────────────
 *
 * The number of pages is NOT a free variable: `targetChunkCount` fixes it at
 * `ceil(n / 3)` before anything is scored, and only partitions with exactly
 * that many chunks are considered. So the question this function answers is
 * narrow and answerable: given that the week costs N pages, which arrangement
 * of sessions across those N pages FITS BEST?
 *
 * `pageLoadPx` is the height of the page the renderer will actually build:
 *
 *     frame padding
 *   + week header furniture          (first chunk only — that is where the
 *                                     adapter puts the week-header atom)
 *   + every card's measured height at SESSION_CHUNK_DENSITY
 *   + `.session-cards` row-gap × (cards − 1)
 *   + week progress footer           (last chunk only)
 *
 * against `PAGE_BUDGET.heightPx`. `slackPx` is what is left over: positive
 * means the page fits with room, negative means it genuinely does not.
 *
 * Partitions are ordered by, in strict priority:
 *
 *   1. `forcedSheds` — how many pages overflow at MAXIMUM density. Every term
 *      above is evaluated at SESSION_CHUNK_DENSITY = 1.0, so an overflow here
 *      is not "this page is full", it is "no amount of compression saves this
 *      page". Downstream that is exactly the state the planner's stall probe
 *      detects (D76) and answers by shedding a card onto a new page. One
 *      overflowing page therefore costs at least one extra page, and page
 *      count is the thing the chunker was trying to control in the first
 *      place. Counting pages beats counting pixels.
 *   2. `overflowPx` — total pixels over, as the severity tiebreak between
 *      partitions that force the same number of sheds.
 *   3. `tightestSlackPx`, DESCENDING — maximise the headroom of the page with
 *      the least of it. With page count fixed, this is the whole of "true
 *      fit": it picks the arrangement furthest from the cliff, which is also
 *      the arrangement the density solver has to compress least.
 *   4. enumeration order, so the result is deterministic without relying on
 *      the sort being stable.
 *
 * ── WHY IT USED TO BE A LIE ────────────────────────────────────────────────
 *
 * The old score was `totalOverflow`, then chunk count, then `maxLoad`. It read
 * the same way, and it never worked, because the card estimate it summed ran
 * 1.39x measured: every three-card page came out ~190px over a 741px budget
 * when the truth was within ±13px. `totalOverflow` was therefore positive for
 * every candidate, the shed count it implied was fantasy, and the comparison
 * degenerated into "whichever fiction is smaller" — a 58px correction to a
 * single card flipped a whole week's chunking in D76. The metric is only
 * meaningful now because the estimate under it is measured (D79); the honest
 * scoring and the honest model had to land together.
 *
 * Two known limits, stated rather than hidden. `PAGE_BUDGET.heightPx` (741) is
 * the nominal boundary; the real one is archetype-dependent and measured
 * between 729.6 and 760.3px, so a page within ~12px of the budget is inside
 * the noise. And `forcedSheds` is a lower bound — a page 200px over sheds
 * twice — but no partition in the corpus is anywhere near that.
 *
 * ── WHY THE SUM IS NOW THE RIGHT QUESTION ──────────────────────────────────
 *
 * This score adds card heights and compares the total to the budget. It never
 * modelled how the page divides its height among the cards, and until the flex
 * allocation changed that was a real hole rather than a simplification: with
 * `.session-cards > .session-card { flex: 1 1 0 }` alone, every card got the
 * SAME share, so a page whose total fits could still fail — one long card
 * exceeding its equal third while its neighbours sat on unreachable surplus.
 * `forcedSheds: 0` therefore did not imply "no shed", and five corpus pages
 * shed exactly there (eastern-shore w2, The-Hinge w2, vale w2, what-the-soil
 * w2, Persephone w4). `min-height: min-content` on the card gives each card a
 * floor and splits only the SURPLUS equally, so a composition whose total fits
 * now prints — the renderer and this score finally ask the same question. The
 * five sheds are gone; the scoring did not have to change to lose them.
 *
 * @param {object[]} sessions — the week's sessions, in order
 * @param {object|null} weekMeta — the week, for the header furniture estimate
 * @param {number} [maxSessionsPerPage]
 * @returns {{startIndex: number, sessions: object[]}[]}
 */
function chunkWeekSessions(sessions, weekMeta = null, maxSessionsPerPage = 3) {
  const list = Array.isArray(sessions) ? sessions : [];
  if (!list.length) return [{ startIndex: 0, sessions: [] }];
  if (list.length <= maxSessionsPerPage) {
    return [{ startIndex: 0, sessions: list.slice() }];
  }

  const partitions = [];
  const targetChunkCount = Math.ceil(list.length / maxSessionsPerPage);
  const headerHeight = estimateWeekHeaderHeight(weekMeta, true);
  const cardsGap = sessionCardsGapPx(SESSION_CHUNK_DENSITY);

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

  function scorePartition(sizes, ordinal) {
    let startIndex = 0;
    let forcedSheds = 0;
    let overflowPx = 0;
    let tightestSlackPx = Infinity;

    sizes.forEach((size, index) => {
      const chunk = list.slice(startIndex, startIndex + size);

      // A page the card OWNS is a different object — the wrapper stops flexing
      // and the notes box takes a 260px floor. Modelling that with the shared
      // card estimate under-reads by ~194px, which made 1+3 splits look far
      // cheaper than they print. But the solo model only applies where the
      // solo CSS now fires: `sessionChunkOwnsPage()` is the one predicate, and
      // a lone card sharing its page with the week header (chunk 0) or the
      // boss panels is a NORMAL card, priced on the density ladder — which is
      // also the only reason the solver has a shrink path on those pages.
      const cardsLoadPx = sessionChunkOwnsPage(weekMeta, index, sizes.length, size)
        ? estimateSoloSessionCardHeight(chunk[0])
        : chunk.reduce(
          (sum, session) => sum + estimateSessionCardHeight(session, SESSION_CHUNK_DENSITY),
          0,
        ) + (size - 1) * cardsGap;

      const pageLoadPx = PAGE_FRAME_PAD_Y_PX
        + (index === 0 ? headerHeight : 0)
        + cardsLoadPx
        + (index === sizes.length - 1 ? WEEK_FOOTER_HEIGHT_PX : 0);

      const slackPx = PAGE_BUDGET.heightPx - pageLoadPx;
      if (slackPx < 0) {
        forcedSheds += 1;
        overflowPx += -slackPx;
      }
      if (slackPx < tightestSlackPx) tightestSlackPx = slackPx;

      startIndex += size;
    });

    return { sizes, ordinal, forcedSheds, overflowPx, tightestSlackPx };
  }

  walk(0, []);

  const best = partitions
    .filter((sizes) => sizes.length === targetChunkCount)
    .map(scorePartition)
    .sort((a, b) =>
      a.forcedSheds - b.forcedSheds
      || a.overflowPx - b.overflowPx
      || b.tightestSlackPx - a.tightestSlackPx
      || a.ordinal - b.ordinal
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

/**
 * The movement roster: every distinct exercise the program prescribes, in the
 * order the book first asks for it.
 *
 * Case-insensitive de-duplication, first spelling wins. Programs name the same
 * lift inconsistently across six weeks ("Back Squat" in week 1, "back squat" in
 * week 5), and a ledger that printed the same movement twice would ask the
 * player to audit one body part in two places.
 *
 * Derivation lives HERE, not in the atom: reaching into weeks and sessions is
 * domain knowledge, and an estimate that read the whole booklet would stop
 * being a pure function of the data the engine handed it — the same ruling
 * that put `weekTargetCount` in the adapter rather than the reckoning panel.
 */
function extractMovementRoster(data) {
  const seen = new Set();
  const roster = [];

  for (const week of (data.weeks || [])) {
    for (const session of (week.sessions || [])) {
      for (const exercise of (session.exercises || [])) {
        const name = String((exercise && exercise.name) || '').trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        roster.push(name);
      }
    }
  }

  return roster;
}

function resolveWeekAttachmentStrategy(artifactIdentity) {
  // The default always comes from booklet-models: resolveArtifactIdentity()
  // sets attachmentStrategy to raw.attachmentStrategy || 'split-technical',
  // so `explicit` is always non-empty here. A content-based fallback that
  // counted fieldOps attachments used to follow but was unreachable.
  const explicit = String((artifactIdentity && artifactIdentity.attachmentStrategy) || '').trim().toLowerCase();
  return explicit || 'split-technical';
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
  const rawContent = fragment.bodyText || fragment.body || fragment.content || '';
  const body = (typeof rawContent === 'string' ? rawContent : (rawContent.html || ''))
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

/**
 * Minimum body length (reading characters, markup stripped) at which a found
 * document is tall enough to own a printed page.
 *
 * CALIBRATION (measured 2026-08-10, live renderer, planner's own measured
 * heights via window.__v2SpreadPlan; synthetic bodies swept through four
 * document classes):
 *
 *     body chars   300   900  1500  2100  2700  3000  3600  4200
 *     measured px  ~110  ~170  ~230  ~290  ~355  ~380  ~445  ~505
 *
 * memo / report / field-note / correspondence agree inside ±5% — document
 * class moves the curve by less than one sampling step, so class is not a
 * term in this rule. Half of PAGE_BUDGET.heightPx (741 → 370px) is crossed
 * at ≈2900 characters.
 *
 * WHY HALF A PAGE. Not an aesthetic constant: at ≥ half the budget no second
 * document can fit beside this one, so "fills half a page" and "cannot be
 * shared" are the same statement. **Standalone ⟺ unpairable.** Below the
 * line the adapter says nothing about placement and the engine's packer —
 * which measures — decides whether the document actually shares a page.
 *
 * WHAT THIS REPLACES. A documentType allow-list (memo, report, inspection,
 * correspondence, transcript, anomaly, letter) OR'd with two numeric gates
 * (weight ≥ 0.9, length ≥ 900). Post-budget-trim the corpus tops out at 600
 * body characters, so both numeric gates are unreachable and the type list
 * was doing 100% of the work: 155 of 226 fragments locked a page each while
 * covering 14–35% of it (measured range 104–257px on a 741px page; not one
 * corpus fragment reaches even 40%). A memo does not read as a document
 * because it is alone on a sheet — it reads as a stamp in a void. It reads
 * as a document when the archive page around it is full.
 *
 * This is a content-scale gate in the only currency the adapter owns, not a
 * height predictor; the engine remains the authority on actual fit. It is
 * deliberately coarse — the corpus sits 5× away from the line.
 */
const STANDALONE_MIN_CHARS = 2900;

function fragmentMustStandAlone(fragment) {
  const rawContent = fragment.bodyText || fragment.body || fragment.content || '';
  const body = (typeof rawContent === 'string' ? rawContent : (rawContent.html || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return body.length >= STANDALONE_MIN_CHARS;
}

// ---------------------------------------------------------------------------
// Public adapter interface
// ---------------------------------------------------------------------------

export const liftrpgAdapter = {
  extractAtoms: extractLiftRPGAtoms,
  sectionOrder: LIFTRPG_SECTIONS,
};
