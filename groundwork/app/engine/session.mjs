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
import { seasonWeek, DELOAD_WEEK, SEASON_WEEKS, seasonClosed } from './season.mjs';

// Rest doctrine (OG audit, D41): 120s wall-clock between rooms is compliant
// BECAUSE rooms alternate movements (paired sets) — each movement recovers
// ~4-5 minutes between its own sets. Boss rest is a full 180s (single max
// effort follows). Never compress prep or boss rest.
export const REST_SECONDS = { working: 120, warmup: 60, boss: 180 };
const PREP_DRILLS = [
  { name: 'Wrist circles + rocks', detail: '30s each direction' },
  { name: 'Scap pulls or scap push-ups', detail: '2×6 easy' },
  { name: 'Hollow hold', detail: '2×20s — the lever line lives here' },
  { name: 'Dead hang', detail: '2×15s, relaxed' }
];

// Slice session: alternate branch focus per session (rows ↔ bar), 3 working
// sets of the focused branch's active tier + 2 of the other branch.
export function generateSession(profile, tree, { dayNumber, skin, rng } = {}) {
  const active = profile.active[tree.id] || {};
  const cleared = profile.cleared[tree.id] || [];
  const sessionIndex = profile.history.filter((h) => h.treeId === tree.id).length;
  // Campaign-relative session count (D43): live events, special-room rotation
  // and "first session stays pure" reset per world; the keeper's order number
  // (dayNumber) and body pacing stay global.
  const campaignSession = Math.max(0, sessionIndex - (profile.campaignSessionBase || 0));
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

  // Season clock (D40): calendar week of the commission. Week 5 is the light
  // week — OG deload doctrine (D41): roughly half volume, same movements,
  // never zero. The finale arms at week 8+ (fires after that session's AAR).
  const week = seasonWeek(profile);
  const isDeload = week === DELOAD_WEEK && !seasonClosed(profile);

  // Session budget shapes optional volume only (never main progression or
  // prep — the cut-order law): 25min → 1 off-branch set, 40 → 2, 60 → 3.
  const budget = (profile.settings && profile.settings.sessionBudgetMinutes) || 40;
  const offSets = Math.max(1, (budget <= 25 ? 1 : budget >= 60 ? 3 : 2) - (isDeload ? 1 : 0));
  const workingSets = learnMode || isDeload ? 2 : 3;
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

  // Periodization by population (D44, from the source's models):
  //   untrained/trained beginners — LINEAR: one charged session opens a gate.
  //   intermediate/advanced — LIGHT/HEAVY waves: sessions alternate intensity;
  //   only heavy days grade the door, and a gate wants two charges. Deload
  //   weeks force light. The set prescription itself never changes — the
  //   light day is an instruction to stay inside the window, not a new dose.
  const cls = profile.classification || 'trained';
  const usesWaves = cls === 'intermediate' || cls === 'advanced';
  const chargesNeeded = usesWaves ? 2 : 1;
  const intensity = usesWaves
    ? (isDeload ? 'light' : (campaignSession % 2 === 0 ? 'heavy' : 'light'))
    : 'heavy';

  // Boss eligibility: enough trailing charged sessions on this tier (heavy
  // days only when waving), or an explicit map-tap election.
  const charges = focusTier ? trailingCharges(profile, tree.id, focusTier.id, usesWaves) : 0;
  const bossEligible = !!(focusTier && focusTier.boss && !learnMode
    && (profile.bossElect === focusTier.id || charges >= chargesNeeded));

  // Paired-set interleave (OG audit, D41): rooms alternate corridors —
  // F O F O F — so each movement gets ~4+ minutes between ITS OWN sets while
  // the wall-clock rest stays at the 120s play-window cadence. Strength work
  // wants ≥3min/movement recovery; sequential same-movement sets at 120s
  // under-recovered. The dungeon reading improves too: the route crosses
  // between corridors room by room.
  const allRooms = [];
  for (let i = 0; i < Math.max(rooms.length, offRooms.length); i++) {
    if (rooms[i]) allRooms.push(rooms[i]);
    if (offRooms[i]) allRooms.push(offRooms[i]);
  }
  if (skin && rng) {
    for (const room of allRooms) {
      room.doorOptions = frontierDoors(skin, profile, room.tier.branch, rng, 2);
    }
    assignSpecialRoom(skin, profile, rng, allRooms, { sessionIndex: campaignSession, learnMode });
  }

  return {
    treeId: tree.id,
    dayNumber: dayNumber || sessionIndex + 1,
    focusBranch,
    focusTierId: focusTier ? focusTier.id : null,
    learnMode,
    week,
    isDeload,
    finaleArmed: !seasonClosed(profile) && week >= SEASON_WEEKS && !!(skin && skin.finale),
    prep: PREP_DRILLS,
    warmup: warmupTier ? {
      tier: warmupTier,
      sets: 1,
      restSeconds: REST_SECONDS.warmup
    } : null,
    rooms: allRooms,
    intensity,
    chargesNeeded,
    charges,
    boss: bossEligible ? {
      tier: focusTier,
      definition: focusTier.boss,
      restSeconds: REST_SECONDS.boss
    } : null,
    // Live event (Sprint 2.2): present-tense scripted scene between the work
    // order and joint prep, once per campaign, ~campaign session 8+.
    liveEvent: liveEventDue(skin || {}, profile, campaignSession + 1)
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

// Trailing charged sessions on a tier: consecutive unlockHit sessions, most
// recent first. Sessions on OTHER tiers don't break the chain; a graded
// session that missed the window does. Light days neither grade nor break
// when the athlete is waving (intermediate+).
export function trailingCharges(profile, treeId, tierId, usesWaves) {
  let n = 0;
  for (let i = profile.history.length - 1; i >= 0; i--) {
    const h = profile.history[i];
    if (h.treeId !== treeId || h.focusTierId !== tierId || h.stormProtocol) continue;
    if (usesWaves && h.intensity === 'light') continue;
    if (h.unlockHit) n += 1; else break;
  }
  return n;
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
    intensity: session.intensity || 'heavy',
    setsTotal: session.rooms.length,
    setsHit: hits,
    unlockHit: unlockHit(session, setResults),
    rooms: resolutions.map((r) => ({ kind: r.kind, roll: r.roll, effect: r.row ? r.row.effect : r.specialType || null })),
    boss: bossResult ? { attempted: true, passed: bossResult.passed, roll: bossResult.roll } : null,
    intelDrop: intelDrop || null
  };
}
