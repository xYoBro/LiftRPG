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
    assessments: {},               // treeId → { placedTiers: {branch: tierId|null}, ladder: [...], completedAt }
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
    lastHook: null                 // Zeigarnik teaser carried to the home screen
  };
}

// Old saves predate the narrative-state fields — backfill on load.
function migrateProfile(profile) {
  if (!profile) return profile;
  const defaults = {
    archive: [], kit: [], explored: {}, encountersSeen: [],
    choices: [], notes: [], shortcuts: [], lastHook: null
  };
  for (const key of Object.keys(defaults)) {
    if (profile[key] === undefined) profile[key] = defaults[key];
  }
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

// ── Assessment ladder runner ─────────────────────────────────────────────────
// The UI walks the tree's assessmentLadder in order, alternating branches with
// rest (fatigue cap); the user reports pass/miss per rung; first miss per
// branch ends that branch. Placement = last tier passed per branch.
export function createAssessmentRun(tree) {
  return {
    treeId: tree.id,
    ladder: tree.assessmentLadder.map((rung) => ({ ...rung, result: null })),
    branchStopped: {},             // branch → true after first miss
    index: 0
  };
}

export function currentRung(run, tree) {
  while (run.index < run.ladder.length) {
    const rung = run.ladder[run.index];
    const branch = branchOfTier(tree, rung.tier);
    if (run.branchStopped[branch]) { run.index += 1; continue; }
    return rung;
  }
  return null;
}

export function recordRungResult(run, tree, passed) {
  const rung = run.ladder[run.index];
  if (!rung) return run;
  rung.result = passed ? 'pass' : 'miss';
  const branch = branchOfTier(tree, rung.tier);
  if (!passed) run.branchStopped[branch] = true;
  run.index += 1;
  return run;
}

export function isAssessmentComplete(run, tree) {
  return currentRung(run, tree) === null;
}

// Deterministic placement from ladder results.
export function placeFromRun(run, tree) {
  const placed = {};   // branch → last passed tier id (null = start at tier 1, learn mode)
  const cleared = [];
  for (const rung of run.ladder) {
    if (rung.result !== 'pass') continue;
    const branch = branchOfTier(tree, rung.tier);
    placed[branch] = rung.tier;
    cleared.push(rung.tier);
  }
  // Active tier per branch = the tier AFTER the last passed one (or tier 1).
  const active = {};
  for (const branch of Object.keys(tree.branches)) {
    const branchTiers = tree.tiers.filter((t) => t.branch === branch).map((t) => t.id);
    const last = placed[branch];
    const nextIndex = last ? branchTiers.indexOf(last) + 1 : 0;
    active[branch] = branchTiers[Math.min(nextIndex, branchTiers.length - 1)];
    // Everything before the active tier is cleared (warm-up/farmable),
    // even rungs the ladder skipped — placement implies the floor below it.
    for (let i = 0; i < Math.min(nextIndex, branchTiers.length); i++) {
      if (!cleared.includes(branchTiers[i])) cleared.push(branchTiers[i]);
    }
  }
  return { placed, active, cleared };
}

export function applyAssessment(profile, tree, run) {
  const { placed, active, cleared } = placeFromRun(run, tree);
  profile.assessments[tree.id] = {
    placedTiers: placed,
    ladder: run.ladder.map((r) => ({ tier: r.tier, result: r.result })),
    completedAt: new Date().toISOString()
  };
  profile.active[tree.id] = active;
  profile.cleared[tree.id] = cleared;
  return profile;
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
  return migrateProfile(data);
}
