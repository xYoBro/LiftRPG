// ── Session generator (slice scope) ─────────────────────────────────────────
// The periodization engine authors the dungeon's skeleton; dice decorate it.
// Slice: one pull-tree session — prep → warm-up (cleared tier) → 3 working
// sets (= 3 rooms) of the active tier per branch focus → boss attempt when
// eligible → debrief. Rest durations are PRESCRIBED here (never by dice).
//
// Full production adds: A/B/C multi-tree templates, 2/3/4-day variants,
// duration budgets with the cut-order law, deload scheduling, travel mode.

import { getTier, branchOfTier } from './profile.mjs';
import { frontierDoors } from './map.mjs';
import { nextCache } from './discovery.mjs';
import { liveEventDue } from './keystones.mjs';

export const REST_SECONDS = { working: 120, warmup: 60, boss: 180 };
const PREP_DRILLS = [
  { name: 'Wrist circles + rocks', detail: '30s each direction' },
  { name: 'Scap pulls or scap push-ups', detail: '2×6 easy' },
  { name: 'Dead hang', detail: '2×15s, relaxed' }
];

// Slice session: alternate branch focus per session (rows ↔ bar), 3 working
// sets of the focused branch's active tier + 2 of the other branch.
export function generateSession(profile, tree, { dayNumber, skin, rng } = {}) {
  const active = profile.active[tree.id] || {};
  const cleared = profile.cleared[tree.id] || [];
  const sessionIndex = profile.history.filter((h) => h.treeId === tree.id).length;
  const branches = Object.keys(tree.branches);
  const focusBranch = branches[sessionIndex % branches.length];
  const offBranch = branches[(sessionIndex + 1) % branches.length];

  const focusTier = getTier(tree, active[focusBranch]);
  const offTier = getTier(tree, active[offBranch]);

  // Learn mode (tutorial encounter): first session featuring a newly active
  // tier — reduced volume (2 submaximal sets), one form point per set, no
  // boss eligibility.
  const learnMode = focusTier && !profile.tutorialSeen[focusTier.id] && !cleared.includes(focusTier.id);

  // Warm-up: the highest cleared tier in the focus branch (prior tier becomes
  // warm-up — the cleared room is farmable).
  const branchCleared = cleared.filter((id) => branchOfTier(tree, id) === focusBranch);
  const warmupTier = branchCleared.length ? getTier(tree, branchCleared[branchCleared.length - 1]) : null;

  // Session budget shapes optional volume only (never main progression or
  // prep — the cut-order law): 25min → 1 off-branch set, 40 → 2, 60 → 3.
  const budget = (profile.settings && profile.settings.sessionBudgetMinutes) || 40;
  const offSets = budget <= 25 ? 1 : budget >= 60 ? 3 : 2;
  const workingSets = learnMode ? 2 : 3;
  const rooms = [];
  for (let i = 0; i < workingSets; i++) {
    rooms.push({
      kind: 'working',
      setNumber: i + 1,
      tier: focusTier,
      scheme: focusTier.scheme,
      restSeconds: REST_SECONDS.working,
      learnCue: learnMode ? focusTier.tutorial[i % focusTier.tutorial.length] : null
    });
  }
  const offRooms = offTier ? Array.from({ length: offSets }, (_, i) => i + 1).map((n) => ({
    kind: 'working',
    setNumber: n,
    tier: offTier,
    scheme: offTier.scheme,
    restSeconds: REST_SECONDS.working,
    learnCue: null
  })) : [];

  // Boss eligibility: top of window across all sets at form standard was hit
  // last session on this tier (recorded in history), and not in learn mode.
  // Slice convenience: also eligible when the profile marks it explicitly
  // (the author can elect the attempt to exercise the flow).
  const lastOnTier = [...profile.history].reverse()
    .find((h) => h.treeId === tree.id && h.focusTierId === (focusTier && focusTier.id));
  const bossEligible = !!(focusTier && focusTier.boss && !learnMode
    && (profile.bossElect === focusTier.id
      || (lastOnTier && lastOnTier.unlockHit)));

  const allRooms = [...rooms, ...offRooms];
  if (skin && rng) {
    for (const room of allRooms) {
      room.doorOptions = frontierDoors(skin, profile, room.tier.branch, rng, 2);
    }
    assignSpecialRoom(skin, profile, rng, allRooms, { sessionIndex, learnMode });
  }

  return {
    treeId: tree.id,
    dayNumber: dayNumber || sessionIndex + 1,
    focusBranch,
    focusTierId: focusTier ? focusTier.id : null,
    learnMode,
    isDeload: false, // slice: deload scheduling lands in full production
    prep: PREP_DRILLS,
    warmup: warmupTier ? {
      tier: warmupTier,
      sets: 1,
      restSeconds: REST_SECONDS.warmup
    } : null,
    rooms: allRooms,
    boss: bossEligible ? {
      tier: focusTier,
      definition: focusTier.boss,
      restSeconds: REST_SECONDS.boss
    } : null,
    // Band 7 live event (Sprint 2.2): present-tense scripted scene between
    // the work order and joint prep, once ever, ~session 8+.
    liveEvent: liveEventDue(skin || {}, profile, dayNumber || sessionIndex + 1)
  };
}

// ── Room types (Sprint 2.4): one special room per session, in rotation ──────
// The special is attached to ONE DOOR of one room (posted on the card — an
// informed opt-in). Picking the other door is a standard room. Session 1 and
// learn-mode sessions stay pure. Availability gates: a cache must remain
// unopened, an echo needs an archive to replay; quiet always works.
const SPECIAL_ROTATION = ['sealed-cache', 'echo', 'quiet'];

function assignSpecialRoom(skin, profile, rng, rooms, { sessionIndex, learnMode }) {
  if (learnMode || sessionIndex < 1) return;
  let special = null;
  for (let k = 0; k < SPECIAL_ROTATION.length && !special; k++) {
    const type = SPECIAL_ROTATION[(sessionIndex + k) % SPECIAL_ROTATION.length];
    if (type === 'sealed-cache' && nextCache(skin, profile)) special = type;
    else if (type === 'echo' && (profile.archive || []).length >= 2) special = type;
    else if (type === 'quiet' && (skin.quietBeats || []).length) special = type;
  }
  if (!special) return;
  const candidates = rooms.filter((r) => r.doorOptions && r.doorOptions.length >= 2);
  if (!candidates.length) return;
  const room = candidates[Math.floor(rng() * candidates.length)];
  const door = room.doorOptions[Math.floor(rng() * room.doorOptions.length)];
  door.roomType = special;
  if (special === 'sealed-cache') door.cacheId = nextCache(skin, profile).id;
}

// Door charge (Sprint 2.3): gate-eligibility progress from the most recent
// focus work — per-set credit only for form-clean sets (that is what the gate
// grades), proportional to the top of the window. unlockHit ⇒ exactly 1.
export function computeDoorCharge(session, setResults) {
  const focusRooms = session.rooms.filter((r) => r.tier && r.tier.id === session.focusTierId);
  if (!focusRooms.length) return 0;
  let sum = 0;
  for (const room of focusRooms) {
    const result = setResults[roomKey(room)];
    if (!result || result.outcome !== 'hit') continue;
    const top = room.scheme.kind === 'reps' ? room.scheme.repWindow[1] : room.scheme.holdWindow[1];
    sum += Math.min(1, (result.amount || 0) / top);
  }
  return Math.min(1, Math.round((sum / focusRooms.length) * 100) / 100);
}

// Unlock check: did this session's working sets hit the top of the rep/hold
// window across ALL sets at form standard?
export function unlockHit(session, setResults) {
  const focusRooms = session.rooms.filter((r) => r.tier && r.tier.id === session.focusTierId);
  if (!focusRooms.length) return false;
  return focusRooms.every((room) => {
    const result = setResults[roomKey(room)];
    if (!result || result.outcome !== 'hit') return false;
    const scheme = room.scheme;
    const top = scheme.kind === 'reps' ? scheme.repWindow[1] : scheme.holdWindow[1];
    return (result.amount || 0) >= top;
  });
}

export function roomKey(room) {
  return `${room.tier.id}#${room.kind}#${room.setNumber}`;
}

// AAR record appended to profile.history (the log is the after-action report).
export function buildAar(session, { setResults, resolutions, bossResult, intelDrop }) {
  const focusRooms = session.rooms.filter((r) => r.tier && r.tier.id === session.focusTierId);
  const hits = Object.values(setResults).filter((r) => r && r.outcome === 'hit').length;
  return {
    date: new Date().toISOString(),
    treeId: session.treeId,
    focusTierId: session.focusTierId,
    focusBranch: session.focusBranch,
    learnMode: session.learnMode,
    setsTotal: session.rooms.length,
    setsHit: hits,
    unlockHit: unlockHit(session, setResults),
    rooms: resolutions.map((r) => ({ kind: r.kind, roll: r.roll, effect: r.row ? r.row.effect : r.specialType || null })),
    boss: bossResult ? { attempted: true, passed: bossResult.passed, roll: bossResult.roll } : null,
    intelDrop: intelDrop || null
  };
}
