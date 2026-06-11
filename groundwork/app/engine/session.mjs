// ── Session generator + session lifecycle ────────────────────────────────────
// The periodization engine authors the dungeon's skeleton; dice decorate it.
// generateSession() plans the day; fileSession() (D58) applies everything a
// finished session does to the profile — the UI renders, the engine decides.
// Rest durations are PRESCRIBED here (never by dice).

import { getTier, branchOfTier, layoffDays, stallCount } from './profile.mjs';
import { frontierDoors } from './map.mjs';
import { nextCache, createPosting, fragmentById } from './discovery.mjs';
import { liveEventDue } from './keystones.mjs';
import { seasonWeek, DELOAD_WEEK, SEASON_WEEKS, seasonClosed } from './season.mjs';

// Rest doctrine (OG audit, D41): 120s wall-clock between rooms is compliant
// BECAUSE rooms alternate movements (paired sets) — each movement recovers
// ~4-5 minutes between its own sets. Where the interleave cannot cover
// (short-budget sessions), the uncovered pair gets the long rest instead
// (D55 / GW-04): same-movement back-to-back is never rested under 180s.
// Boss rest is a full 180s (single max effort follows). Never compress prep
// or boss rest.
export const REST_SECONDS = { working: 120, warmup: 60, boss: 180, samePair: 180 };
const PREP_DRILLS = [
  { name: 'Wrist circles + rocks', detail: '30s each direction' },
  { name: 'Scap pulls or scap push-ups', detail: '2×6 easy' },
  { name: 'Hollow hold', detail: '2×20s — the lever line lives here' },
  { name: 'Dead hang', detail: '2×15s, relaxed' }
];
// Extended prep under tendon-guard (D45): the source's older/sedentary
// doctrine — longer warm-up (10min + age/4), technique before load.
const GUARD_PREP = [
  { name: 'Shoulder circles + arm swings', detail: '15 each way, unhurried' },
  { name: 'Half-tempo rehearsal', detail: '1 easy set of today’s first movement at half speed — alignment first, then load' }
];

// Tendon-guard populations (D45): never-trained, long-layoff past 40, or 55+.
// Connective tissue adapts slower than muscle; the guard buys it time.
export function isTendonGuard(profile) {
  const rec = profile.trainingRecency;
  const age = profile.ageBracket;
  if (!rec && !age) return false;
  return rec === 'never'
    || age === '55plus'
    || (rec === 'years' && age !== 'u40');
}

// Gate standard for a tier (D55): explicit gateStandard where the window top
// is not a sane gate (entry-tier endurance walls); window top otherwise.
export function gateAmount(tier) {
  if (tier.gateStandard && Number.isFinite(tier.gateStandard.amount)) return tier.gateStandard.amount;
  return tier.scheme.kind === 'reps' ? tier.scheme.repWindow[1] : tier.scheme.holdWindow[1];
}

// Session: alternate branch focus per session (lever ↔ bar), 3 working sets
// of the focused branch's active tier + budget-shaped sets of the other.
export function generateSession(profile, tree, { dayNumber, skin, rng } = {}) {
  const active = profile.active[tree.id] || {};
  const cleared = profile.cleared[tree.id] || [];
  const realSessions = profile.history.filter((h) => h.treeId === tree.id && !h.stormProtocol);
  const sessionIndex = realSessions.length;
  // Campaign-relative session count (D43): live events, special-room rotation
  // and "first session stays pure" reset per world; the keeper's order number
  // (dayNumber) and body pacing stay global.
  const campaignSession = Math.max(0, sessionIndex - (profile.campaignSessionBase || 0));
  const branches = Object.keys(tree.branches);
  // Route choice (D46): the keeper may take either corridor as the day's
  // focus. Training-legal by construction — BOTH branches train every
  // session; focus only biases volume 3v2, and the rotation default returns
  // after the chosen session files. The override is one-shot.
  const rotationDefault = branches[sessionIndex % branches.length];
  const focusBranch = profile.routeOverride && branches.includes(profile.routeOverride)
    ? profile.routeOverride
    : rotationDefault;
  const offBranch = branches.find((b) => b !== focusBranch) || branches[(sessionIndex + 1) % branches.length];

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

  // Re-entry modulation (D55 / GW-14): a 7-13 day gap trims optional volume
  // and (for wavers) forces a light day — the windows themselves never change.
  // Past 14 days the recalibration prompt takes over (profile.mjs).
  const gapDays = layoffDays(profile);
  const reentry = gapDays >= 7 && gapDays <= 13;

  // Tendon-guard (D45, source Ch6 populations): sedentary re-entries and
  // older bodies get extended prep and +30s working rests. Safety over
  // performance; the prescription windows themselves never change.
  const tendonGuard = isTendonGuard(profile);
  const workingRest = REST_SECONDS.working + (tendonGuard ? 30 : 0);

  // Session budget shapes optional volume only (never main progression or
  // prep — the cut-order law): 25min → 1 off-branch set, 40 → 2, 60 → 3.
  const budget = (profile.settings && profile.settings.sessionBudgetMinutes) || 40;
  const offSets = Math.max(1, (budget <= 25 ? 1 : budget >= 60 ? 3 : 2) - (isDeload ? 1 : 0) - (reentry ? 1 : 0));
  const workingSets = learnMode || isDeload ? 2 : 3;
  const rooms = [];
  for (let i = 0; i < workingSets; i++) {
    rooms.push({
      kind: 'working',
      setNumber: i + 1,
      tier: focusTier,
      scheme: focusTier.scheme,
      restSeconds: workingRest,
      learnCue: learnMode ? focusTier.tutorial[i % focusTier.tutorial.length] : null
    });
  }
  const offRooms = offTier ? Array.from({ length: offSets }, (_, i) => i + 1).map((n) => ({
    kind: 'working',
    setNumber: n,
    tier: offTier,
    scheme: offTier.scheme,
    restSeconds: workingRest,
    learnCue: null
  })) : [];

  // Periodization by population (D44, from the source's models):
  //   untrained/trained beginners — LINEAR: one charged session opens a gate.
  //   intermediate/advanced — LIGHT/HEAVY waves: sessions alternate intensity;
  //   only heavy days grade the door, and a gate wants two charges. Deload
  //   weeks and re-entry days force light. The set prescription itself never
  //   changes — the light day is an instruction to stay inside the window.
  const cls = profile.classification || 'trained';
  const usesWaves = cls === 'intermediate' || cls === 'advanced';
  const chargesNeeded = usesWaves ? 2 : 1;
  const intensity = usesWaves
    ? (isDeload || reentry ? 'light' : (campaignSession % 2 === 0 ? 'heavy' : 'light'))
    : 'heavy';

  // Boss eligibility (D48): gates are max efforts — they never arm on deload
  // weeks, and for waving athletes only on heavy days. Within those guards:
  // enough trailing charges, or the keeper's own map-tap election.
  const charges = focusTier ? trailingCharges(profile, tree.id, focusTier.id, usesWaves) : 0;
  const gateDayLegal = !isDeload && !reentry && (!usesWaves || intensity === 'heavy');
  const bossEligible = !!(focusTier && focusTier.boss && !learnMode && gateDayLegal
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

  // Advanced dose (D55 / GW-16): heavy days may carry one OPTIONAL extra
  // focus set — engine-authored, never on deload/guard/learn/re-entry days.
  if (cls === 'advanced' && intensity === 'heavy' && !isDeload && !learnMode && !tendonGuard && !reentry && focusTier) {
    allRooms.push({
      kind: 'working', setNumber: workingSets + 1, tier: focusTier,
      scheme: focusTier.scheme, restSeconds: workingRest, learnCue: null, optional: true
    });
  }

  // Rest-law repair (D55 / GW-04): wherever the interleave leaves the same
  // movement back-to-back, the EARLIER room carries the long rest. The pair
  // is honest about it (restNote renders on the timer).
  for (let i = 1; i < allRooms.length; i++) {
    if (allRooms[i].tier.branch === allRooms[i - 1].tier.branch) {
      allRooms[i - 1].restSeconds = Math.max(allRooms[i - 1].restSeconds, REST_SECONDS.samePair + (tendonGuard ? 30 : 0));
      allRooms[i - 1].restNote = 'long-rest';
    }
  }

  if (skin && rng) {
    for (const room of allRooms) {
      room.doorOptions = frontierDoors(skin, profile, room.tier.branch, rng, 2);
    }
    assignSpecialRoom(skin, profile, rng, allRooms, { sessionIndex: campaignSession, learnMode });
    attachPosting(skin, profile, allRooms);
  }

  // Side quest (D49): the assigned fault drill rides the session whenever its
  // branch is in focus — authored tree data, deterministic, prescription-side.
  const sideQuest = (profile.activeSideQuests || {})[focusBranch] || null;
  // Deep stall (six stalled sessions, D49): offer the authored regression as an optional
  // warm-up swap. Opt-in texture; the prescribed work is untouched.
  const stallDepth = focusTier ? stallCount(profile, tree.id, focusTier.id) : 0;
  const regressionOffer = stallDepth >= 6 && focusTier && focusTier.regression
    ? getTier(tree, focusTier.regression) : null;

  return {
    treeId: tree.id,
    dayNumber: dayNumber || sessionIndex + 1,
    focusBranch,
    focusTierId: focusTier ? focusTier.id : null,
    learnMode,
    week,
    isDeload,
    reentry,
    finaleArmed: !seasonClosed(profile) && week >= SEASON_WEEKS && !!(skin && skin.finale),
    prep: tendonGuard ? [...PREP_DRILLS, ...GUARD_PREP] : PREP_DRILLS,
    tendonGuard,
    sideQuest,
    regressionOffer,
    warmup: warmupTier ? {
      tier: warmupTier,
      sets: 1,
      restSeconds: REST_SECONDS.warmup
    } : null,
    rooms: allRooms,
    intensity,
    chargesNeeded,
    charges,
    posting: profile.posting || null,
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

// Posted manifest (D52): if a posting is live, its named room is guaranteed to
// appear among this session's doors on its branch — walking in recovers the
// posted find. Reward-side navigation; the set behind the door is untouched.
function attachPosting(skin, profile, rooms) {
  const posting = profile.posting;
  if (!posting) return;
  const pool = ((skin.roomPools || {})[posting.branch]) || [];
  const postedRoom = pool.find((r) => r.id === posting.roomId);
  if (!postedRoom) return;
  const branchRooms = rooms.filter((r) => r.tier.branch === posting.branch && r.doorOptions && r.doorOptions.length);
  if (!branchRooms.length) return;
  for (const room of branchRooms) {
    const hit = room.doorOptions.find((d) => d.id === posting.roomId);
    if (hit) { if (!hit.roomType) hit.posted = true; return; }
  }
  // Not dealt naturally: post it over the last plain door of the first
  // branch room (specials keep their door).
  const room = branchRooms[0];
  for (let i = room.doorOptions.length - 1; i >= 0; i--) {
    if (!room.doorOptions[i].roomType) {
      room.doorOptions[i] = { ...postedRoom, posted: true };
      return;
    }
  }
}

// Door charge (Sprint 2.3): gate-eligibility progress from the most recent
// focus work — per-set credit only for form-clean sets (that is what the gate
// grades), proportional to the gate standard (D55). unlockHit ⇒ exactly 1.
export function computeDoorCharge(session, setResults) {
  const focusRooms = session.rooms.filter((r) => r.tier && r.tier.id === session.focusTierId && !r.optional);
  if (!focusRooms.length) return 0;
  let sum = 0;
  for (const room of focusRooms) {
    const result = setResults[roomKey(room)];
    if (!result || result.outcome !== 'hit') continue;
    const top = gateAmount(room.tier);
    const amount = Number.isFinite(result.amount) ? result.amount : 0;
    sum += Math.min(1, amount / top);
  }
  const charge = sum / focusRooms.length;
  return Number.isFinite(charge) ? Math.min(1, Math.round(charge * 100) / 100) : 0;
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

// Unlock check: did this session's working sets hit the gate standard across
// ALL prescribed sets at form standard? Optional extra sets never gate.
export function unlockHit(session, setResults) {
  const focusRooms = session.rooms.filter((r) => r.tier && r.tier.id === session.focusTierId && !r.optional);
  if (!focusRooms.length) return false;
  return focusRooms.every((room) => {
    const result = setResults[roomKey(room)];
    if (!result || result.outcome !== 'hit') return false;
    return (result.amount || 0) >= gateAmount(room.tier);
  });
}

export function roomKey(room) {
  return `${room.tier.id}#${room.kind}#${room.setNumber}${room.optional ? '#opt' : ''}`;
}

// AAR record appended to profile.history (the log is the after-action report).
export function buildAar(session, { setResults, resolutions, bossResult, intelDrop }) {
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
    // The body's actual numbers (D45): best single amount + total volume per
    // tier this session. This is the data "real progress" is made of — the
    // ledger, the dispatch deltas, and the season audit all read from it.
    marks: (() => {
      const marks = {};
      for (const room of session.rooms) {
        const res = setResults[roomKey(room)];
        if (!res || !res.amount || !Number.isFinite(res.amount)) continue;
        const m = marks[room.tier.id] = marks[room.tier.id]
          || { best: 0, volume: 0, unit: (room.scheme.kind === 'reps' ? 'reps' : 's') + (room.scheme.perSide ? '/side' : '') };
        m.best = Math.max(m.best, res.amount);
        m.volume += res.amount;
      }
      return marks;
    })(),
    boss: bossResult ? { attempted: true, passed: bossResult.passed, roll: bossResult.roll } : null,
    intelDrop: intelDrop || null
  };
}

// ── fileSession (D58): everything a finished session does to the profile ────
// Extracted from the debrief screen so the engine owns its own lifecycle and
// the sim suite can drive whole seasons headlessly. The UI calls this once,
// then renders. Chance isolation: nothing in here reads a die.
export function fileSession(profile, tree, session, { setResults, resolutions = [], bossResult = null, intelDrop = null, skin = null }) {
  const aar = buildAar(session, { setResults, resolutions, bossResult, intelDrop });
  profile.history.push(aar);
  delete profile.routeOverride; // route choice is one-shot (D46)
  if (session.learnMode && session.focusTierId) profile.tutorialSeen[session.focusTierId] = true;

  const cls = profile.classification || 'trained';
  const usesWaves = cls === 'intermediate' || cls === 'advanced';

  // Door charge (Sprint 2.3): latest focus evidence drives the gate meter.
  // Light days don't grade the door (D44) — the last heavy reading stands.
  if (session.focusTierId && !(session.intensity === 'light' && session.chargesNeeded > 1)) {
    profile.doorCharge = profile.doorCharge || {};
    profile.doorCharge[session.focusTierId] = aar.unlockHit ? 1 : computeDoorCharge(session, setResults);
  }

  // An elect is consumed by the session that carried the attempt (D48) —
  // whether it was passed, failed, or walked away from.
  if (session.boss) delete profile.bossElect;

  // Auto-elect only at FULL charges (D48; supersedes the one-charge elect that
  // made the two-charge wave doctrine cosmetic). trailingCharges now includes
  // the session just filed.
  if (session.focusTierId) {
    const tier = getTier(tree, session.focusTierId);
    const charges = trailingCharges(profile, tree.id, session.focusTierId, usesWaves);
    if (tier && tier.boss && charges >= (session.chargesNeeded || 1)) {
      profile.bossElect = session.focusTierId;
    }
  }

  // Side quests (D49): a failed gate files a real assignment; a passed gate
  // clears the branch; an emitted quest spends a session.
  profile.activeSideQuests = profile.activeSideQuests || {};
  if (bossResult && !bossResult.passed && intelDrop && session.boss) {
    const branch = session.boss.tier.branch;
    profile.activeSideQuests[branch] = {
      id: intelDrop.sideQuest.id, name: intelDrop.sideQuest.name, note: intelDrop.sideQuest.note,
      tierId: session.boss.tier.id, faultId: intelDrop.fault.id, sessionsLeft: 3
    };
  } else if (session.sideQuest) {
    const q = profile.activeSideQuests[session.focusBranch];
    if (q) {
      q.sessionsLeft -= 1;
      if (q.sessionsLeft <= 0) delete profile.activeSideQuests[session.focusBranch];
    }
  }
  if (bossResult && bossResult.passed && session.boss) {
    delete profile.activeSideQuests[session.boss.tier.branch];
  }

  // Stall detector (D49): four graded sessions on one tier with the gate still
  // under half charge ⇒ the wing names the first common fault itself.
  if (session.focusTierId && !profile.activeSideQuests[session.focusBranch]) {
    const tier = getTier(tree, session.focusTierId);
    const depth = stallCount(profile, tree.id, session.focusTierId);
    const charge = (profile.doorCharge || {})[session.focusTierId] || 0;
    if (tier && depth >= 4 && charge < 0.5 && tier.commonFaults && tier.commonFaults.length) {
      const fault = tier.commonFaults[0];
      const sq = tier.faultSideQuests[fault.id];
      if (sq) {
        profile.activeSideQuests[session.focusBranch] = {
          id: sq.id, name: sq.name, note: sq.note,
          tierId: tier.id, faultId: fault.id, sessionsLeft: 3, stall: true
        };
      }
    }
  }

  profile.xp += aar.setsHit;

  // Zeigarnik hook for the home screen.
  if (skin) {
    const fill = (t, vars) => String(t || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
    const teasers = ((skin.sessionFrame || {}).nextTeasers) || {};
    const lastFrag = (profile.archive || []).slice(-1)[0];
    const lastFragData = lastFrag ? fragmentById(skin, lastFrag.id) : null;
    const focusTier = getTier(tree, session.focusTierId);
    const flavor = (t) => (t && skin.tierNames && skin.tierNames[t.hookSlot]) || (t ? t.name : '');
    if (aar.unlockHit && session.focusTierId && profile.bossElect === session.focusTierId) {
      const next = focusTier && focusTier.boss ? getTier(tree, focusTier.boss.tier) : null;
      profile.lastHook = fill(teasers.bossEligible, { bossDoor: next ? flavor(next) : 'the sealed door' }) || profile.lastHook;
    } else if (lastFragData) {
      profile.lastHook = fill(teasers.newFragment, { lastFragmentHook: lastFragData.hook }) || profile.lastHook;
    } else {
      profile.lastHook = fill(teasers.default, { focusRoom: flavor(focusTier) || 'the wing' }) || profile.lastHook;
    }

    // Posted manifest lifecycle (D52): unclaimed postings age out after three
    // sessions; a fresh one is posted whenever the board is empty.
    if (profile.posting) {
      profile.posting.sessionsLeft -= 1;
      if (profile.posting.sessionsLeft <= 0) profile.posting = null;
    }
    if (!profile.posting) {
      profile.posting = createPosting(skin, profile, tree);
    }
  }

  return aar;
}
