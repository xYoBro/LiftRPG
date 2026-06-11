// ── Profile + assessment engine ("Session Zero / character creation") ───────
// Users exist ONLY as profile data produced by the assessment (mission 3.1).
// Deterministic: same inputs → same placement. Impossible to fail: every
// outcome is a valid starting stat and the copy reads that way (the skin's
// assessment.outro owns the framing).
//
// Persistence: localStorage (slice) with one-tap JSON export/import — the
// save file is the bridge between devices; the user is never locked in.

const STORAGE_KEY = 'groundwork_profile_v1';
export const PROFILE_VERSION = '0.1.0';

export function createEmptyProfile(seed) {
  return {
    version: PROFILE_VERSION,
    createdAt: new Date().toISOString(),
    seed: seed || String(Date.now()),
    settings: {
      daysPerWeek: 3,
      sessionBudgetMinutes: 40,    // 25 | 40 | 60 (volume shaping, never MED)
      equipment: ['bar', 'mat'],   // THE contract: bar + mat, nothing else
      injuryFlags: [],
      concurrentTraining: [],      // modifier table inputs (full build)
      muted: false
    },
    assessments: {},               // treeId → { probes: [...], classification, completedAt }
    classification: null,          // untrained | trained | intermediate | advanced (D44)
    trainingRecency: null,         // never | years | recent (D45 — tendon-guard input)
    ageBracket: null,              // u40 | 40s | 55plus (D45 — bracket, never a birthdate)
    bests: {},                     // tierId → { amount, unit, at } — the chalk wall (D45)
    cleared: {},                   // treeId → [tierId, ...] (cleared = warm-up/farmable)
    active: {},                    // treeId → { branch → tierId } (working tiers)
    tutorialSeen: {},              // tierId → true (learn-mode fired)
    history: [],                   // session AAR records
    xp: 0,                         // derived display of the access economy
    // Narrative state (the game remembers):
    archive: [],                   // found fragments [{id, chain, foundAt}]
    kit: [],                       // found items [{id, foundAt}]
    explored: {},                  // branch → [roomId] (cleared narrative rooms)
    encountersSeen: [],
    choices: [],                   // encounter decisions, referenced by AARs
    notes: [],                     // player field notes [{at, room, text}]
    shortcuts: [],                 // unlocked map connections (key items)
    lastHook: null,                // Zeigarnik teaser carried to the home screen
    intention: null,               // implementation intention {after, where}
    microGoal: null,               // weekly dispatch micro-goal
    lastDispatchAt: null,          // ISO date of last weekly dispatch
    firedKeystones: [],            // authored reveals that have fired (once ever)
    cachesOpened: [],              // sealed-cache room ids opened
    doorCharge: {},                // tierId → 0..1 gate-eligibility progress
    activeSideQuests: {},          // branch → { id, name, note, tierId, faultId, sessionsLeft } (D49)
    posting: null,                 // located-channel manifest posting (D52)
    exploredAt: {},                // roomId → tierId (which sector it was explored from)
    seasonClosedAt: null,          // ISO date the 8-week commission closed (D40)
    seasonEnding: null,            // ending id chosen at the finale
    campaignStartedAt: null,       // season anchor for the ACTIVE campaign (D43)
    campaignSessionBase: 0         // history length when this campaign began
  };
}

// New campaign (D43): the body travels; the station is new. Training state
// (assessments, cleared, active, history, charge) persists — it is REAL.
// Narrative state belongs to the world being left behind.
export function startNewCampaign(profile) {
  profile.archive = [];
  profile.kit = [];
  profile.explored = {};
  profile.exploredAt = {};
  profile.encountersSeen = [];
  profile.choices = [];
  profile.notes = [];
  profile.shortcuts = [];
  profile.cachesOpened = [];
  profile.firedKeystones = [];
  profile.lastHook = null;
  profile.posting = null;            // postings name the old world's rooms (D52)
  profile.seasonClosedAt = null;
  profile.seasonEnding = null;
  delete profile.bossElect;
  delete profile.routeOverride;
  profile.campaignStartedAt = new Date().toISOString();
  profile.campaignSessionBase = (profile.history || []).length;
  return profile;
}

// Old saves predate the narrative-state fields — backfill on load.
export function migrateProfile(profile) {
  if (!profile) return profile;
  const defaults = {
    archive: [], kit: [], explored: {}, encountersSeen: [],
    choices: [], notes: [], shortcuts: [], lastHook: null,
    intention: null, microGoal: null, lastDispatchAt: null,
    firedKeystones: [], cachesOpened: [], doorCharge: {},
    exploredAt: {}, seasonClosedAt: null, seasonEnding: null,
    campaignStartedAt: null, campaignSessionBase: 0,
    trainingRecency: null, ageBracket: null, bests: {},
    activeSideQuests: {}, posting: null
  };
  for (const key of Object.keys(defaults)) {
    if (profile[key] === undefined) profile[key] = defaults[key];
  }
  // Imports may carry malformed bests (hand-edited saves): every entry must be
  // { amount: finite number } or the stepper opens on NaN (GW-23).
  for (const [tierId, best] of Object.entries(profile.bests || {})) {
    if (!best || typeof best !== 'object' || !Number.isFinite(best.amount)) {
      delete profile.bests[tierId];
    }
  }
  profile.version = PROFILE_VERSION;
  if (profile.settings && profile.settings.muted === undefined) profile.settings.muted = false;
  if (profile.settings && profile.settings.sessionBudgetMinutes === undefined) profile.settings.sessionBudgetMinutes = 40;
  // Equipment contract v2 (bar + mat only): saves from the furniture-rows era
  // reference a branch that no longer exists — clear the pull assessment so
  // the intake re-runs against the lever ladder.
  if (profile.active && profile.active.pull && profile.active.pull.rows) {
    delete profile.assessments.pull;
    delete profile.active.pull;
    delete profile.cleared.pull;
    if (profile.explored) delete profile.explored.rows;
  }
  if (profile.settings) profile.settings.equipment = ['bar', 'mat'];
  return profile;
}

// ── Adaptive probe runner (Intake v2, D44) ───────────────────────────────────
// 4-5 information-dense probes instead of an 18-rung max-test walk. Routing
// lives in tree.probes (data: band tables); placement is per branch; the
// classification (untrained/trained/intermediate/advanced — the source's
// population model, by ABILITY not training age) drives periodization.
// Impossible to fail: every route ends in a valid posting.

const CLASS_RANK = ['untrained', 'trained', 'intermediate', 'advanced'];

export function createAssessmentRun(tree) {
  return {
    treeId: tree.id,
    stage: 'recency',              // recency → age → probes (D45 condition intake)
    answers: {},
    current: tree.probes.start,
    results: [],                   // [{ probe, value }]
    place: {},                     // branch → tier id (active posting)
    classHints: [],
    done: false
  };
}

export function currentProbe(run, tree) {
  return run.done ? null : tree.probes.defs[run.current] || null;
}

// Condition questions before the physical probes (D45): training recency and
// age bracket — the tendon-guard inputs. Brackets only; never a birthdate.
export function recordIntakeAnswer(run, key, value) {
  run.answers[key] = value;
  run.stage = run.stage === 'recency' ? 'age' : 'probes';
  return run;
}

function applyOutcome(run, outcome) {
  if (!outcome) { run.done = true; return; }
  if (outcome.place) Object.assign(run.place, outcome.place);
  if (outcome.classHint) run.classHints.push(outcome.classHint);
  if (outcome.done || !outcome.next) run.done = true;
  else run.current = outcome.next;
}

// value: boolean for pass-fail probes, number for count probes.
export function recordProbeResult(run, tree, value) {
  const probe = currentProbe(run, tree);
  if (!probe) return run;
  run.results.push({ probe: run.current, value });
  if (probe.kind === 'count') {
    const band = probe.bands.find((b) => value <= b.max) || probe.bands[probe.bands.length - 1];
    applyOutcome(run, band);
  } else {
    applyOutcome(run, value ? probe.onPass : probe.onFail);
  }
  return run;
}

export function isAssessmentComplete(run) {
  return !!run.done;
}

export function classificationFromRun(run) {
  let best = 'untrained';
  for (const hint of run.classHints) {
    if (CLASS_RANK.indexOf(hint) > CLASS_RANK.indexOf(best)) best = hint;
  }
  return best;
}

export function applyAssessment(profile, tree, run) {
  const classification = classificationFromRun(run);
  const active = {};
  const cleared = [];
  for (const branch of Object.keys(tree.branches)) {
    const branchTiers = tree.tiers.filter((t) => t.branch === branch).map((t) => t.id);
    const target = run.place[branch] && branchTiers.includes(run.place[branch])
      ? run.place[branch] : branchTiers[0];
    active[branch] = target;
    // Everything below the posting is cleared ground (warm-up/farmable).
    for (let i = 0; i < branchTiers.indexOf(target); i++) cleared.push(branchTiers[i]);
  }
  profile.assessments[tree.id] = {
    probes: run.results,
    answers: run.answers,
    classification,
    completedAt: new Date().toISOString()
  };
  profile.classification = classification;
  if (run.answers.recency) profile.trainingRecency = run.answers.recency;
  if (run.answers.age) profile.ageBracket = run.answers.age;
  profile.active[tree.id] = active;
  profile.cleared[tree.id] = cleared;
  // Re-intake hygiene (GW-22): stale charge bars and elects belong to the old
  // grading; the new posting starts clean.
  for (const tier of tree.tiers) delete (profile.doorCharge || {})[tier.id];
  delete profile.bossElect;
  // Dose default by population (D44 follow-through): intermediate+ bodies need
  // the larger session unless the keeper already chose one.
  if ((classification === 'intermediate' || classification === 'advanced')
    && profile.settings && !profile.settings.budgetTouched) {
    profile.settings.sessionBudgetMinutes = 60;
  }
  return profile;
}

// Consecutive trailing Storm Protocol days (GW-15): the minimum-dose tool is
// honest only while it is occasional.
export function consecutiveStorms(profile) {
  let n = 0;
  for (let i = profile.history.length - 1; i >= 0; i--) {
    if (profile.history[i].stormProtocol) n += 1; else break;
  }
  return n;
}

// Stall depth on a tier (D49): consecutive graded sessions on this tier with
// the gate still uncharged. Storms and other tiers are skipped; an unlockHit
// (or any boss attempt) resets the count.
export function stallCount(profile, treeId, tierId) {
  let n = 0;
  for (let i = profile.history.length - 1; i >= 0; i--) {
    const h = profile.history[i];
    if (h.treeId !== treeId || h.stormProtocol || h.focusTierId !== tierId) continue;
    if (h.unlockHit || h.boss) break;
    n += 1;
  }
  return n;
}

// ── Tier/tree helpers ────────────────────────────────────────────────────────
export function branchOfTier(tree, tierId) {
  const tier = tree.tiers.find((t) => t.id === tierId);
  return tier ? tier.branch : null;
}

export function getTier(tree, tierId) {
  return tree.tiers.find((t) => t.id === tierId) || null;
}

export function tierState(profile, tree, tierId) {
  const cleared = profile.cleared[tree.id] || [];
  if (cleared.includes(tierId)) return 'cleared';
  const active = profile.active[tree.id] || {};
  if (Object.values(active).includes(tierId)) return 'active';
  return 'locked'; // visible-but-locked: the map always shows the door
}

export function recentHitRate(profile, treeId) {
  const recent = profile.history.filter((h) => h.treeId === treeId).slice(-3);
  if (!recent.length) return 0;
  const hits = recent.reduce((n, h) => n + (h.setsHit || 0), 0);
  const total = recent.reduce((n, h) => n + (h.setsTotal || 0), 0);
  return total ? hits / total : 0;
}

// Layoff detection (>14 days since last session → prompt recalibration)
export function layoffDays(profile) {
  const last = profile.history[profile.history.length - 1];
  if (!last) return 0;
  return Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000);
}

export function needsRecalibration(profile) {
  return layoffDays(profile) > 14;
}

// ── Level-up / intel-drop (boss outcomes mutate the access economy) ─────────
export function applyBossPass(profile, tree, bossTierId, nextTierId) {
  const cleared = profile.cleared[tree.id] || (profile.cleared[tree.id] = []);
  if (!cleared.includes(bossTierId)) cleared.push(bossTierId);
  const branch = branchOfTier(tree, bossTierId);
  if (nextTierId) profile.active[tree.id][branch] = nextTierId;
  profile.xp += 10; // derived display; tiers are the real economy
  return profile;
}

export function intelDropForFault(tree, tierId, faultId) {
  const tier = getTier(tree, tierId);
  if (!tier) return null;
  const fault = (tier.commonFaults || []).find((f) => f.id === faultId) || tier.commonFaults[0];
  const sq = tier.faultSideQuests[fault ? fault.id : null] || Object.values(tier.faultSideQuests)[0];
  return fault && sq ? { fault, sideQuest: sq } : null;
}

// ── Persistence ──────────────────────────────────────────────────────────────
export function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrateProfile(JSON.parse(raw)) : null;
  } catch { return null; }
}

export function clearProfile() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportProfile(profile) {
  return JSON.stringify(profile, null, 2);
}

export function importProfile(json) {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object' || !data.version || !data.settings) {
    throw new Error('Not a Groundwork profile file.');
  }
  // Refuse saves from a NEWER major version (GW-29): migrating forward is
  // supported, guessing backward is not. Tell the user what to do.
  const major = (v) => parseInt(String(v).split('.')[0], 10) || 0;
  if (major(data.version) > major(PROFILE_VERSION)) {
    throw new Error(`This save is from a newer Groundwork (v${data.version}). Update the app, then import again.`);
  }
  return migrateProfile(data);
}
