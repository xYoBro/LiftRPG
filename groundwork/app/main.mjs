// ── Groundwork app (v2 — the 10/10 pass) ────────────────────────────────────
// Plain and legible (pillar 6), but a GAME: door choices, readable archive,
// encounter decisions, boss ceremony, state-aware voice, hooks that pull you
// back. State + explicit render, no framework.

import { PULL_TREE } from '../data/trees/pull.mjs';
import { SKIN } from '../data/skins/dead-zone.mjs';
import { deriveTreeStat } from '../data/tables/resolution.mjs';
import { createRng } from './engine/rng.mjs';
import { resolveRoom, resolveBoss } from './engine/resolver.mjs';
import {
  createEmptyProfile, loadProfile, saveProfile, clearProfile,
  exportProfile, importProfile,
  createAssessmentRun, currentRung, recordRungResult, isAssessmentComplete,
  applyAssessment, getTier, tierState, recentHitRate, needsRecalibration,
  applyBossPass, intelDropForFault
} from './engine/profile.mjs';
import { generateSession, roomKey, buildAar, unlockHit, REST_SECONDS } from './engine/session.mjs';
import { awardForRow, resolveEncounterChoice, fragmentById, kitItemById } from './engine/discovery.mjs';
import { markExplored, projectWing } from './engine/map.mjs';
import { chimeRestEnd, bossSting, rollTick, unlockAudio } from './engine/audio.mjs';

const TREE = PULL_TREE;

const state = {
  screen: 'home',
  profile: loadProfile(),
  assessRun: null,
  session: null,
  sessionStep: null,        // { phase, roomIndex }
  doorPicks: {},            // roomIndex → chosen door (room object)
  setResults: {},
  resolutions: [],          // per roomIndex: { res, award }
  encounterPending: null,   // { roomIndex, encounter }
  bossResult: null,
  bossFaultPick: null,
  intelDrop: null,
  sessionState: null,
  rng: null,
  timer: null,
  wakeLock: null,
  _aarFiled: null
};

const root = () => document.getElementById('app');
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const flavorName = (tier) => (SKIN.tierNames && SKIN.tierNames[tier.hookSlot]) || tier.name;
const fill = (t, vars) => String(t).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
const muted = () => !!(state.profile && state.profile.settings.muted);

// Papercut adoptions: trough window = sessions 7-18 (~weeks 3-6 at 3/wk)
const inTroughWindow = () => {
  const n = state.profile ? state.profile.history.length : 0;
  return n >= 6 && n <= 17;
};
const daysSinceLastSession = () => {
  const last = state.profile && state.profile.history[state.profile.history.length - 1];
  if (!last) return null;
  return Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000);
};
const dispatchDue = () => {
  const prof = state.profile;
  if (!prof || prof.history.length < 3) return false;
  if (!prof.lastDispatchAt) return true;
  return (Date.now() - new Date(prof.lastDispatchAt).getTime()) / 86400000 >= 7;
};

const BIAS_LABEL = { intel: 'DOCUMENTS LIKELY', loot: 'SALVAGE LIKELY', encounter: 'SOMETHING MOVES HERE', story: 'OLD GROUND' };
const KIND_LABEL = { crit: 'CRITICAL', strong: 'CLEAN CLEAR', success: 'CLEARED', fail: 'SCOUTED', complication: 'COMPLICATION' };

function render() {
  stopTimer();
  const screens = {
    home: renderHome, assess: renderAssess, session: renderSession,
    map: renderMap, log: renderLog, archive: renderArchive, kit: renderKit, settings: renderSettings,
    storm: renderStorm, dispatch: renderDispatch
  };
  (screens[state.screen] || renderHome)();
  window.scrollTo(0, 0);
}
function nav(screen) { state.screen = screen; render(); }

// ── Home ─────────────────────────────────────────────────────────────────────

function treeStat() {
  return deriveTreeStat(TREE, (state.profile.cleared[TREE.id] || []).length, recentHitRate(state.profile, TREE.id));
}

function sessionPreview() {
  // Peek (no doors, no rng): what does today hold?
  const peek = generateSession(state.profile, TREE, {});
  const tier = getTier(TREE, peek.focusTierId);
  return {
    branch: TREE.branches[peek.focusBranch].name,
    room: tier ? flavorName(tier) : '—',
    rooms: peek.rooms.length,
    boss: !!peek.boss,
    learn: peek.learnMode
  };
}

function renderHome() {
  const p = state.profile;
  const hasAssessment = p && p.assessments[TREE.id];
  const recal = p && needsRecalibration(p);
  const unread = p ? (p.archive || []).length : 0;
  const preview = hasAssessment ? sessionPreview() : null;
  root().innerHTML = `
    <header class="gw-header"><h1>GROUNDWORK</h1>
      <div class="gw-worldline">${esc(SKIN.worldLine)}</div></header>
    <main class="gw-panel">
      ${!p ? `
        <p>No operative on file. The station needs an intake survey before work can begin.</p>
        <button class="gw-primary" data-act="new-profile">Begin Intake (Assessment)</button>
      ` : !hasAssessment ? `
        <p>Operative on file. Intake survey incomplete.</p>
        <button class="gw-primary" data-act="start-assess">Run Intake Survey</button>
      ` : `
        ${p.lastHook ? `<div class="gw-hook">${esc(p.lastHook)}</div>` : ''}
        ${p.intention ? `<div class="gw-dim gw-duty">${esc(fill(SKIN.sessionFrame.intention.display, p.intention))}</div>` : ''}
        ${p.microGoal ? `<div class="gw-dim gw-duty">MICRO-GOAL: ${esc(p.microGoal)}</div>` : ''}
        ${(() => { const d = daysSinceLastSession(); return d !== null && d >= 2 && d <= 6
          ? `<div class="gw-callout">${esc(SKIN.sessionFrame.storm.missCue)}</div>` : ''; })()}
        ${recal ? `<div class="gw-callout">Layoff detected (&gt;2 weeks since the last AAR). A re-survey is recommended — the map should match the body that shows up. <button data-act="start-assess">Re-run Intake</button></div>` : ''}
        <div class="gw-stat-row">
          <div class="gw-stat"><div class="gw-stat-num">${treeStat()}<span class="gw-pct">%</span></div><div class="gw-stat-label">${esc(TREE.name)}</div></div>
          <div class="gw-stat"><div class="gw-stat-num">${(p.cleared[TREE.id] || []).length}</div><div class="gw-stat-label">sectors</div></div>
          <div class="gw-stat"><div class="gw-stat-num">${unread}</div><div class="gw-stat-label">archive</div></div>
          <div class="gw-stat"><div class="gw-stat-num">${p.xp}</div><div class="gw-stat-label">XP</div></div>
        </div>
        <div class="gw-preview">
          <div class="gw-preview-title">TODAY’S WORK ORDER</div>
          <div>${esc(preview.branch)} focus — ${esc(preview.room)} · ${preview.rooms} rooms${preview.boss ? ' · <strong>SEALED DOOR ELIGIBLE</strong>' : ''}${preview.learn ? ' · new room type (learn mode)' : ''}</div>
        </div>
        <button class="gw-primary gw-big" data-act="start-session">Start Session</button>
        <button data-act="storm">${esc(SKIN.sessionFrame.storm.button)}</button>
        ${dispatchDue() ? `<button data-act="dispatch"><strong>Weekly Dispatch due</strong></button>` : ''}
        <div class="gw-row">
          <button data-act="map">Map</button>
          <button data-act="archive">Archive${unread ? ` (${unread})` : ''}</button>
          <button data-act="kit">Kit${p.kit && p.kit.length ? ` (${p.kit.length})` : ''}</button>
          <button data-act="log">Log</button>
          <button data-act="settings">Settings</button>
        </div>
      `}
      <div class="gw-row gw-save-row">
        ${p ? `<button data-act="export">Export Save</button>` : ''}
        <button data-act="import">Import Save</button>
        ${p ? `<button class="gw-danger" data-act="reset">Reset</button>` : ''}
      </div>
      <input type="file" id="import-file" accept="application/json" hidden>
    </main>`;
  wire({
    'new-profile': () => { unlockAudio(); state.profile = createEmptyProfile(); saveProfile(state.profile); startAssess(); },
    'start-assess': () => { unlockAudio(); startAssess(); },
    'start-session': () => { unlockAudio(); startSession(); },
    map: () => nav('map'), archive: () => nav('archive'), kit: () => nav('kit'),
    log: () => nav('log'), settings: () => nav('settings'),
    storm: () => { unlockAudio(); nav('storm'); },
    dispatch: () => nav('dispatch'),
    export: doExport,
    import: () => document.getElementById('import-file').click(),
    reset: () => { if (confirm('Erase the local save? Export first if you want to keep it.')) { clearProfile(); state.profile = null; render(); } }
  });
  const fileInput = document.getElementById('import-file');
  if (fileInput) fileInput.addEventListener('change', doImport);
}

// ── Assessment ───────────────────────────────────────────────────────────────

function startAssess() {
  state.assessRun = createAssessmentRun(TREE);
  nav('assess');
}

function renderAssess() {
  const run = state.assessRun;
  if (isAssessmentComplete(run, TREE)) {
    state.profile = applyAssessment(state.profile, TREE, run);
    saveProfile(state.profile);
    const active = state.profile.active[TREE.id];
    root().innerHTML = `
      <header class="gw-header"><h1>INTAKE COMPLETE</h1></header>
      <main class="gw-panel">
        <p>${esc(SKIN.sessionFrame.assessment.outro)}</p>
        <ul class="gw-list">
          ${Object.entries(active).map(([branch, tierId]) => {
            const tier = getTier(TREE, tierId);
            return `<li><strong>${esc(TREE.branches[branch].name)}:</strong> ${esc(flavorName(tier))} <span class="gw-dim">(${esc(tier.name)})</span></li>`;
          }).join('')}
        </ul>
        <div class="gw-callout">
          <p>${esc(SKIN.sessionFrame.intention.prompt)}</p>
          <label class="gw-dim">${esc(SKIN.sessionFrame.intention.afterLabel)}</label>
          <input id="int-after" class="gw-text" placeholder="${esc(SKIN.sessionFrame.intention.afterPlaceholder)}" maxlength="60">
          <label class="gw-dim">${esc(SKIN.sessionFrame.intention.whereLabel)}</label>
          <input id="int-where" class="gw-text" placeholder="${esc(SKIN.sessionFrame.intention.wherePlaceholder)}" maxlength="60">
        </div>
        <button class="gw-primary" data-act="home">To the Station</button>
      </main>`;
    wire({ home: () => {
      const after = (document.getElementById('int-after') || {}).value || '';
      const where = (document.getElementById('int-where') || {}).value || '';
      if (after.trim() && where.trim()) {
        state.profile.intention = { after: after.trim(), where: where.trim() };
        saveProfile(state.profile);
      }
      nav('home');
    } });
    return;
  }
  const rung = currentRung(run, TREE);
  const tier = getTier(TREE, rung.tier);
  const std = rung.standard;
  const stdText = std.kind === 'hold' ? `hold ${std.value}s` : `${std.value} reps${std.perSide ? ' per side' : ''}`;
  root().innerHTML = `
    <header class="gw-header"><h1>INTAKE SURVEY</h1>
      <div class="gw-dim">rung ${run.index + 1} of ${run.ladder.length} · first miss per branch ends that branch · rest as needed</div></header>
    <main class="gw-panel">
      <p class="gw-dim">${esc(SKIN.sessionFrame.assessment.intro)}</p>
      <h2>${esc(flavorName(tier))} <span class="gw-dim">(${esc(tier.name)} · ${esc(TREE.branches[tier.branch].name)})</span></h2>
      <p><strong>Standard:</strong> ${esc(stdText)} at form standard.</p>
      <p>${esc(tier.setup)}</p>
      <ul class="gw-list">${tier.formStandard.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      <div class="gw-row">
        <button class="gw-primary" data-act="pass">Met the standard</button>
        <button data-act="miss">Not today — stop this branch</button>
      </div>
    </main>`;
  wire({
    pass: () => { recordRungResult(run, TREE, true); render(); },
    miss: () => { recordRungResult(run, TREE, false); render(); }
  });
}

// ── Session ──────────────────────────────────────────────────────────────────

function startSession() {
  const dayNumber = state.profile.history.length + 1;
  state.rng = createRng(state.profile.seed + ':' + dayNumber);
  state.session = generateSession(state.profile, TREE, { dayNumber, skin: SKIN, rng: state.rng });
  state.doorPicks = {};
  state.setResults = {};
  state.resolutions = [];
  state.encounterPending = null;
  state.bossResult = null;
  state.bossFaultPick = null;
  state.intelDrop = null;
  state.sessionState = { isDeload: state.session.isDeload, bonusRoomOffered: false };
  state.sessionStep = { phase: 'brief', roomIndex: 0 };
  state._aarFiled = null;
  acquireWakeLock();
  nav('session');
}

function renderSession() {
  const phases = {
    brief: renderBrief, prep: renderPrep, warmup: renderWarmup,
    door: renderDoor, room: renderRoom,
    'boss-approach': renderBossApproach, boss: renderBossAttempt, debrief: renderDebrief
  };
  phases[state.sessionStep.phase](state.session);
}

function renderBrief(s) {
  const brief = fill(SKIN.sessionFrame.brief.script, {
    dayNumber: s.dayNumber,
    wingName: SKIN.map.wings[TREE.id] || TREE.name,
    roomCount: s.rooms.length,
    bossClause: s.boss ? SKIN.sessionFrame.brief.bossClause : ''
  });
  root().innerHTML = `
    <header class="gw-header"><h1>${esc(SKIN.sessionFrame.brief.title)}</h1></header>
    <main class="gw-panel">
      <p class="gw-script">${esc(brief)}</p>
      ${state.profile.history.length === 6 ? `<div class="gw-callout">${esc(SKIN.sessionFrame.troughForecast)}</div>` : ''}
      ${s.learnMode ? `<div class="gw-callout">${esc(SKIN.sessionFrame.tutorial.intro)}</div>` : ''}
      <button class="gw-primary gw-big" data-act="go">Begin</button>
      <button data-act="abort">Back</button>
    </main>`;
  wire({ go: () => { state.sessionStep = { phase: 'prep', roomIndex: 0 }; render(); }, abort: () => { releaseWakeLock(); nav('home'); } });
}

function renderPrep(s) {
  root().innerHTML = `
    <header class="gw-header"><h1>JOINT PREP</h1><div class="gw-dim">mandatory — connective tissue first</div></header>
    <main class="gw-panel">
      <ul class="gw-list">${s.prep.map((d) => `<li><strong>${esc(d.name)}</strong> — ${esc(d.detail)}</li>`).join('')}</ul>
      <button class="gw-primary gw-big" data-act="done">Prep complete</button>
    </main>`;
  wire({ done: () => { state.sessionStep = { phase: s.warmup ? 'warmup' : 'door', roomIndex: 0 }; render(); } });
}

function renderWarmup(s) {
  const w = s.warmup;
  root().innerHTML = `
    <header class="gw-header"><h1>WARM-UP — CLEARED GROUND</h1></header>
    <main class="gw-panel">
      <h2>${esc(flavorName(w.tier))} <span class="gw-dim">(${esc(w.tier.name)})</span></h2>
      <p>1 easy set in the ${esc(schemeText(w.tier.scheme))} range. This sector is yours; walk it to wake up.</p>
      <button class="gw-primary gw-big" data-act="done">Warm-up done</button>
    </main>`;
  wire({ done: () => { state.sessionStep = { phase: 'door', roomIndex: 0 }; render(); } });
}

function schemeText(scheme) {
  return scheme.kind === 'reps'
    ? `${scheme.sets}×${scheme.repWindow[0]}–${scheme.repWindow[1]}${scheme.perSide ? ' per side' : ''}`
    : `${scheme.sets}×${scheme.holdWindow[0]}–${scheme.holdWindow[1]}s holds`;
}

// Door choice — the navigation verb. Same set behind every door.
function renderDoor(s) {
  const idx = state.sessionStep.roomIndex;
  const room = s.rooms[idx];
  if (!room) { state.sessionStep = { phase: s.boss ? 'boss-approach' : 'debrief' }; render(); return; }
  const doors = room.doorOptions || [];
  if (doors.length < 2 || state.doorPicks[idx]) { state.sessionStep = { phase: 'room', roomIndex: idx }; render(); return; }
  root().innerHTML = `
    <header class="gw-header"><h1>ROUTE — ROOM ${idx + 1} OF ${s.rooms.length}</h1>
      <div class="gw-dim">${esc(flavorName(room.tier))} sector · the set is the same behind either door</div></header>
    <main class="gw-panel">
      <p class="gw-bigcue">Two doors. Pick the route.</p>
      ${doors.map((d, i) => `
        <button class="gw-door" data-door="${i}">
          <div class="gw-door-name">${esc(d.name)}</div>
          <div class="gw-door-bias">${esc(BIAS_LABEL[d.bias] || '')}</div>
          <div class="gw-door-desc">${esc(d.desc)}</div>
        </button>`).join('')}
    </main>`;
  root().querySelectorAll('[data-door]').forEach((el) => {
    el.addEventListener('click', () => {
      state.doorPicks[idx] = doors[Number(el.getAttribute('data-door'))];
      state.sessionStep = { phase: 'room', roomIndex: idx };
      render();
    });
  });
}

function renderRoom(s) {
  const idx = state.sessionStep.roomIndex;
  const room = s.rooms[idx];
  if (!room) { state.sessionStep = { phase: s.boss ? 'boss-approach' : 'debrief' }; render(); return; }
  const door = state.doorPicks[idx] || null;
  const key = roomKey(room) + '#' + idx;
  const result = state.setResults[key];
  const entry = state.resolutions[idx];
  const tier = room.tier;
  const target = tier.scheme.kind === 'reps' ? tier.scheme.repWindow : tier.scheme.holdWindow;
  const unit = tier.scheme.kind === 'reps' ? 'reps' : 'seconds';

  root().innerHTML = `
    <header class="gw-header">
      <h1>${esc(door ? door.name : flavorName(tier))}</h1>
      <div class="gw-dim" id="prescription">${esc(tier.name)} · set ${room.setNumber} · target ${target[0]}–${target[1]} ${unit} · ${esc(TREE.name)} ${treeStat()}%</div>
    </header>
    <main class="gw-panel">
      ${room.learnCue ? `<div class="gw-callout">Cue this set: <strong>${esc(room.learnCue)}</strong></div>` : `
      <details class="gw-form"><summary>Form standard</summary>
        <ul class="gw-list">${tier.formStandard.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></details>`}
      ${!result ? `
        <p class="gw-bigcue">Do the set. The room resolves when you rest.</p>
        <div class="gw-stepper">
          <button class="gw-step" data-step="-1">−</button>
          <div class="gw-step-num" id="amount">${target[1]}</div>
          <button class="gw-step" data-step="1">+</button>
          <div class="gw-step-unit">${unit}</div>
        </div>
        <div class="gw-row">
          <button class="gw-primary gw-big" data-act="hit">Hit — form standard</button>
        </div>
        <div class="gw-row">
          <button data-act="partial">Partial</button>
          <button data-act="missed">Missed</button>
        </div>
      ` : !entry ? `
        <div id="dice-stage" class="gw-dice-stage"><div class="gw-die" id="die">--</div></div>
        <p class="gw-dim">Set logged (${esc(result.outcome)}, ${result.amount} ${unit}). RIGGING — [${treeStat()}%, ${result.outcome === 'hit' ? 'advantage' : result.outcome === 'partial' ? 'flat' : 'disadvantage'}]: resolve the room.</p>
        <button class="gw-primary gw-big" data-act="roll">Roll d100</button>
      ` : state.encounterPending && state.encounterPending.roomIndex === idx ? `
        ${renderEncounterHtml(state.encounterPending.encounter)}
      ` : `
        ${renderResolutionHtml(entry, idx)}
        ${renderTimerHtml(room.restSeconds)}
        <div class="gw-note-row">
          <input id="field-note" placeholder="field note (optional)" maxlength="120">
        </div>
        <button class="gw-primary gw-big" data-act="next">${idx + 1 < s.rooms.length ? 'Next room' : s.boss ? 'To the sealed door' : 'File the AAR'}</button>
      `}
    </main>`;

  // steppers
  root().querySelectorAll('[data-step]').forEach((el) => {
    el.addEventListener('click', () => {
      const num = document.getElementById('amount');
      num.textContent = String(Math.max(0, Number(num.textContent) + Number(el.getAttribute('data-step'))));
    });
  });
  wire({
    hit: () => logSet(key, 'hit'),
    partial: () => logSet(key, 'partial'),
    missed: () => logSet(key, 'missed'),
    roll: () => rollRoom(idx, room, door, key),
    next: () => {
      const note = document.getElementById('field-note');
      if (note && note.value.trim()) {
        state.profile.notes.push({ at: new Date().toISOString(), room: door ? door.name : flavorName(tier), text: note.value.trim() });
        saveProfile(state.profile);
      }
      state.sessionStep = { phase: 'door', roomIndex: idx + 1 };
      render();
    }
  });
  root().querySelectorAll('[data-enc-choice]').forEach((el) => {
    el.addEventListener('click', () => resolveEncounter(idx, Number(el.getAttribute('data-enc-choice'))));
  });
  if (entry && !(state.encounterPending && state.encounterPending.roomIndex === idx)) startTimer(room.restSeconds);
}

function logSet(key, outcome) {
  const amount = Number((document.getElementById('amount') || {}).textContent || 0);
  state.setResults[key] = { outcome, amount };
  render();
}

function rollRoom(idx, room, door, key) {
  const result = state.setResults[key];
  const res = resolveRoom(state.rng, {
    stat: treeStat(),
    setOutcome: result.outcome,
    sessionState: state.sessionState,
    doorBias: door ? door.bias : null
  });
  animateDie(res.roll, () => {
    const award = awardForRow(SKIN, state.profile, state.rng, res.row);
    if (door) markExplored(state.profile, room.tier.branch, door.id);
    saveProfile(state.profile);
    state.resolutions[idx] = { ...res, award, door, outcome: result.outcome, branch: room.tier.branch, roomIndex: idx };
    if (award.type === 'encounter') state.encounterPending = { roomIndex: idx, encounter: award.encounter };
    render();
  });
}

function renderEncounterHtml(enc) {
  return `
    <div class="gw-resolution gw-res-encounter">
      <div class="gw-kind">ENCOUNTER</div>
      <p class="gw-script">${esc(enc.prompt)}</p>
      ${enc.options.map((o, i) => `<button class="gw-door" data-enc-choice="${i}"><div class="gw-door-name">${esc(o.label)}</div></button>`).join('')}
    </div>`;
}

function resolveEncounter(idx, choiceIndex) {
  const pending = state.encounterPending;
  const { option, extraFragment } = resolveEncounterChoice(SKIN, state.profile, state.rng, pending.encounter, choiceIndex);
  saveProfile(state.profile);
  state.resolutions[idx].encounterResult = { text: option.result, extraFragment };
  state.encounterPending = null;
  render();
}

function stateAwareBeat(entry) {
  const ctx = {
    kind: entry.kind,
    outcome: entry.outcome,
    branch: entry.branch,
    isFirstRoom: entry.roomIndex === 0,
    troughWindow: inTroughWindow(),
    streak: streakAt(entry.roomIndex),
    postBossFail: state.profile.history.some((h) => h.boss && !h.boss.passed && h.focusTierId === state.session.focusTierId)
  };
  for (const beat of SKIN.sessionFrame.restBeats) {
    const w = beat.when || {};
    if (w.kind && w.kind !== ctx.kind) continue;
    if (w.outcome && w.outcome !== ctx.outcome) continue;
    if (w.branch && w.branch !== ctx.branch) continue;
    if (w.isFirstRoom && !ctx.isFirstRoom) continue;
    if (w.troughWindow && !ctx.troughWindow) continue;
    if (w.streak && ctx.streak < w.streak) continue;
    if (w.postBossFail && !ctx.postBossFail) continue;
    return beat.lines[entry.roll % beat.lines.length];
  }
  return null;
}

function streakAt(roomIndex) {
  let streak = 0;
  for (let i = roomIndex; i >= 0; i--) {
    const r = state.resolutions[i];
    if (r && r.outcome === 'hit') streak += 1; else break;
  }
  return streak;
}

function renderResolutionHtml(entry, idx) {
  const beat = stateAwareBeat(entry);
  const award = entry.award;
  let awardHtml = '';
  if (award.type === 'fragment') {
    const f = award.fragment;
    awardHtml = `
      <div class="gw-document">
        <div class="gw-doc-type">${esc(f.documentType.toUpperCase())} · ARCHIVE ${esc(f.id)}</div>
        <div class="gw-doc-title">${esc(f.title)}</div>
        <p class="gw-doc-body">${esc(f.body)}</p>
        <div class="gw-doc-hook">${esc(f.hook)}</div>
      </div>`;
  } else if (award.type === 'kit') {
    const k = award.item;
    awardHtml = `
      <div class="gw-item">
        <div class="gw-item-kind">${esc(k.kind.toUpperCase())} RECOVERED</div>
        <div class="gw-item-name">${esc(k.name)}</div>
        <p>${esc(k.body)}</p>
        ${k.kind === 'key' ? `<div class="gw-doc-hook">A route on the map just got shorter.</div>` : ''}
      </div>`;
  } else if (award.type === 'shortcut') {
    awardHtml = `<div class="gw-item"><div class="gw-item-kind">SHORTCUT</div><p>${esc(award.text)}</p></div>`;
  } else if (award.type === 'xp') {
    awardHtml = `<div class="gw-item"><div class="gw-item-kind">+${award.amount} XP</div><p>${esc(award.text)}</p></div>`;
  } else if (award.type === 'bonus-room') {
    awardHtml = `<div class="gw-callout">${esc(award.text)} <span class="gw-dim">(optional — one extra easy set of warm-up tier; skip freely)</span></div>`;
  } else if (award.type === 'story' || award.type === 'intel-exhausted' || award.type === 'loot-exhausted') {
    awardHtml = `<p class="gw-script">${esc(award.text || entry.row.text)}</p>`;
  }
  const encHtml = entry.encounterResult ? `
    <p class="gw-script">${esc(entry.encounterResult.text)}</p>
    ${entry.encounterResult.extraFragment ? `
      <div class="gw-document">
        <div class="gw-doc-type">${esc(entry.encounterResult.extraFragment.documentType.toUpperCase())} · ARCHIVE ${esc(entry.encounterResult.extraFragment.id)}</div>
        <div class="gw-doc-title">${esc(entry.encounterResult.extraFragment.title)}</div>
        <p class="gw-doc-body">${esc(entry.encounterResult.extraFragment.body)}</p>
        <div class="gw-doc-hook">${esc(entry.encounterResult.extraFragment.hook)}</div>
      </div>` : ''}` : '';
  return `
    <div class="gw-resolution gw-res-${esc(entry.kind)}">
      <div class="gw-roll">${String(entry.roll).padStart(2, '0')} <span class="gw-dim">vs ${entry.stat} · ${esc(entry.mode)}${entry.rolls.length > 1 ? ' (' + entry.rolls.map((r) => String(r).padStart(2, '0')).join(', ') + ')' : ''}</span></div>
      <div class="gw-kind">${esc(KIND_LABEL[entry.kind] || entry.kind)}</div>
      ${award.type === 'fragment' || award.type === 'kit' ? '' : `<p class="gw-script">${esc(entry.row.text)}</p>`}
      ${awardHtml}
      ${encHtml}
      ${beat ? `<p class="gw-beat">${esc(beat)}</p>` : ''}
    </div>`;
}

// ── Boss ceremony ─────────────────────────────────────────────────────────────

function renderBossApproach(s) {
  const boss = s.boss;
  const doorTier = getTier(TREE, boss.definition.tier) || boss.tier;
  const approach = fill(SKIN.bossCeremony.approach, {
    doorName: flavorName(doorTier),
    standard: boss.definition.label,
    tease: SKIN.bossCeremony.teases[doorTier.hookSlot] || SKIN.bossCeremony.teases.default
  });
  root().innerHTML = `
    <header class="gw-header"><h1>THE SEALED DOOR</h1>
      <div class="gw-dim">rest the full ${REST_SECONDS.boss}s before the attempt</div></header>
    <main class="gw-panel">
      <p class="gw-script">${esc(approach)}</p>
      <p class="gw-beat">${esc(SKIN.bossCeremony.beforeAttempt)}</p>
      ${renderTimerHtml(REST_SECONDS.boss)}
      <button class="gw-primary gw-big" data-act="attempt">Make the attempt</button>
      <button data-act="skip">Walk away (no attempt)</button>
    </main>`;
  wire({
    attempt: () => { state.sessionStep = { phase: 'boss' }; render(); },
    skip: () => { state.sessionStep = { phase: 'debrief' }; render(); }
  });
  startTimer(REST_SECONDS.boss);
}

function renderBossAttempt(s) {
  const boss = s.boss;
  const res = state.bossResult;
  if (!res) {
    // During effort: nothing to read. One line, two buttons.
    root().innerHTML = `
      <header class="gw-header"><h1>${esc(boss.definition.label.toUpperCase())}</h1></header>
      <main class="gw-panel gw-attempt">
        <p class="gw-bigcue">Go.</p>
        <div class="gw-row">
          <button class="gw-primary gw-big" data-act="pass">Standard met</button>
          <button class="gw-big" data-act="fail">The door held</button>
        </div>
      </main>`;
    wire({ pass: () => finishBoss(true), fail: () => beginFaultPick() });
    return;
  }
  // Aftermath
  const doorTier = getTier(TREE, boss.definition.tier) || boss.tier;
  const reveal = res.passed
    ? fill(SKIN.bossCeremony.passReveal, { sectorName: flavorName(doorTier) })
    : SKIN.bossCeremony.failReveal;
  root().innerHTML = `
    <header class="gw-header"><h1>${res.passed ? 'THE DOOR OPENS' : 'THE DOOR HOLDS'}</h1></header>
    <main class="gw-panel">
      <div class="gw-resolution gw-res-${res.passed ? 'crit' : 'fail'}">
        <p class="gw-script">${esc(reveal)}</p>
        <div class="gw-roll">${String(res.roll).padStart(2, '0')}</div>
        <div class="gw-kind">${res.passed ? 'AFTERMATH' : 'RECONNAISSANCE'}</div>
        <p class="gw-script">${esc(res.row.text)}</p>
      </div>
      ${res.passed ? `
        <div class="gw-map-reveal">
          <div class="gw-item-kind">SECTOR OPENED</div>
          <div class="gw-item-name">${esc(flavorName(doorTier))}</div>
          <p class="gw-dim">${esc(doorTier.name)} — ${esc(schemeText(doorTier.scheme))}. The map has redrawn itself.</p>
        </div>` : state.intelDrop ? `
        <div class="gw-callout">${esc(fill(SKIN.sessionFrame.intelDrop, {
          faultName: state.intelDrop.fault.text,
          sideQuestName: state.intelDrop.sideQuest.name,
          sideQuestNote: state.intelDrop.sideQuest.note
        }))}</div>` : ''}
      <button class="gw-primary gw-big" data-act="debrief">File the AAR</button>
    </main>`;
  wire({ debrief: () => { state.sessionStep = { phase: 'debrief' }; render(); } });
}

function beginFaultPick() {
  const tier = state.session.boss.tier;
  root().innerHTML = `
    <header class="gw-header"><h1>WHAT GAVE FIRST?</h1>
      <div class="gw-dim">the failure is the survey — name the weak strand</div></header>
    <main class="gw-panel">
      ${tier.commonFaults.map((f, i) => `<button class="gw-door" data-fault="${i}"><div class="gw-door-name">${esc(f.text)}</div></button>`).join('')}
    </main>`;
  root().querySelectorAll('[data-fault]').forEach((el) => {
    el.addEventListener('click', () => {
      state.bossFaultPick = tier.commonFaults[Number(el.getAttribute('data-fault'))].id;
      finishBoss(false);
    });
  });
}

function finishBoss(passed) {
  const s = state.session;
  const tier = s.boss.tier;
  const res = resolveBoss(state.rng, { stat: treeStat(), passed });
  res.passed = passed;
  state.bossResult = res;
  bossSting(muted(), passed);
  if (passed) {
    applyBossPass(state.profile, TREE, tier.id, s.boss.definition.tier);
    delete state.profile.bossElect;
  } else {
    state.intelDrop = intelDropForFault(TREE, tier.id, state.bossFaultPick || tier.commonFaults[0].id);
  }
  saveProfile(state.profile);
  render();
}

// ── Debrief ──────────────────────────────────────────────────────────────────

function renderDebrief(s) {
  if (!state._aarFiled) {
    const aar = buildAar(s, {
      setResults: state.setResults,
      resolutions: state.resolutions.filter(Boolean),
      bossResult: state.bossResult,
      intelDrop: state.intelDrop
    });
    state.profile.history.push(aar);
    if (s.learnMode && s.focusTierId) state.profile.tutorialSeen[s.focusTierId] = true;
    state.profile.xp += aar.setsHit;
    // Zeigarnik hook for the home screen
    const lastFrag = (state.profile.archive || []).slice(-1)[0];
    const lastFragData = lastFrag ? fragmentById(SKIN, lastFrag.id) : null;
    if (aar.unlockHit && s.focusTierId) {
      state.profile.bossElect = s.focusTierId;
      const next = getTier(TREE, getTier(TREE, s.focusTierId).boss && getTier(TREE, s.focusTierId).boss.tier);
      state.profile.lastHook = fill(SKIN.sessionFrame.nextTeasers.bossEligible, { bossDoor: next ? flavorName(next) : 'the sealed door' });
    } else if (lastFragData) {
      state.profile.lastHook = fill(SKIN.sessionFrame.nextTeasers.newFragment, { lastFragmentHook: lastFragData.hook });
    } else {
      const focusTier = getTier(TREE, s.focusTierId);
      state.profile.lastHook = fill(SKIN.sessionFrame.nextTeasers.default, { focusRoom: focusTier ? flavorName(focusTier) : 'the wing' });
    }
    saveProfile(state.profile);
    state._aarFiled = aar;
    releaseWakeLock();
  }
  const aar = state._aarFiled;
  const loot = state.resolutions.filter((r) => r && r.award && r.award.type === 'kit').length;
  const intel = state.resolutions.filter((r) => r && r.award && (r.award.type === 'fragment' || (r.encounterResult && r.encounterResult.extraFragment))).length;
  const debrief = fill(SKIN.sessionFrame.debrief.script, {
    dayNumber: s.dayNumber,
    roomsCleared: aar.setsHit,
    lootSummary: loot ? `${loot} item${loot === 1 ? '' : 's'}` : 'nothing — this time',
    intelCount: intel,
    intelPlural: intel === 1 ? '' : 's',
    bossLine: state.bossResult
      ? (state.bossResult.passed ? SKIN.sessionFrame.debrief.bossPassLine : SKIN.sessionFrame.debrief.bossFailLine)
      : ''
  });
  root().innerHTML = `
    <header class="gw-header"><h1>${esc(SKIN.sessionFrame.debrief.title)}</h1></header>
    <main class="gw-panel">
      <p class="gw-script">${esc(debrief)}</p>
      ${aar.unlockHit ? `<div class="gw-callout">Top of the window across all sets. <strong>The sealed door is eligible next session.</strong></div>` : ''}
      ${s.learnMode ? `<div class="gw-callout">${esc(SKIN.sessionFrame.tutorial.aarPrompt)}</div>` : ''}
      <div class="gw-stat-row">
        <div class="gw-stat"><div class="gw-stat-num">+${aar.setsHit}</div><div class="gw-stat-label">XP</div></div>
        <div class="gw-stat"><div class="gw-stat-num">${intel}</div><div class="gw-stat-label">archive</div></div>
        <div class="gw-stat"><div class="gw-stat-num">${treeStat()}<span class="gw-pct">%</span></div><div class="gw-stat-label">${esc(TREE.name)} now</div></div>
      </div>
      <div class="gw-note-row">
        <label class="gw-dim">Minutes you lost track of time (the real meter):</label>
        <div class="gw-stepper">
          <button class="gw-step" data-fstep="-5">−</button>
          <div class="gw-step-num" id="flow-min">0</div>
          <button class="gw-step" data-fstep="5">+</button>
          <div class="gw-step-unit">min</div>
        </div>
      </div>
      ${state.profile.lastHook ? `<div class="gw-hook">${esc(state.profile.lastHook)}</div>` : ''}
      <button class="gw-primary gw-big" data-act="home">Close the log</button>
    </main>`;
  root().querySelectorAll('[data-fstep]').forEach((el) => {
    el.addEventListener('click', () => {
      const num = document.getElementById('flow-min');
      num.textContent = String(Math.max(0, Number(num.textContent) + Number(el.getAttribute('data-fstep'))));
    });
  });
  wire({ home: () => {
    const flow = Number((document.getElementById('flow-min') || {}).textContent || 0);
    if (flow > 0 && state.profile.history.length) {
      state.profile.history[state.profile.history.length - 1].flowMinutes = flow;
      saveProfile(state.profile);
    }
    state._aarFiled = null;
    nav('home');
  } });
}

// ── Storm Protocol (minimum dose — the identity rep) ─────────────────────────
function renderStorm() {
  const cleared = state.profile.cleared[TREE.id] || [];
  const tierId = cleared[cleared.length - 1] || Object.values(state.profile.active[TREE.id] || {})[0];
  const tier = getTier(TREE, tierId);
  if (!tier) { nav('home'); return; }
  root().innerHTML = `
    <header class="gw-header"><h1>STORM PROTOCOL</h1></header>
    <main class="gw-panel">
      <p class="gw-script">${esc(SKIN.sessionFrame.storm.intro)}</p>
      <h2>${esc(flavorName(tier))} <span class="gw-dim">(${esc(tier.name)})</span></h2>
      <p>One easy set, well inside the ${esc(schemeText(tier.scheme))} range. Nothing else.</p>
      <button class="gw-primary gw-big" data-act="done">Set done — file it</button>
      <button data-act="home">Back</button>
    </main>`;
  wire({
    done: () => {
      state.profile.history.push({
        date: new Date().toISOString(),
        treeId: TREE.id,
        focusTierId: tier.id,
        focusBranch: tier.branch,
        learnMode: false,
        stormProtocol: true,
        setsTotal: 1, setsHit: 1, unlockHit: false,
        rooms: [], boss: null, intelDrop: null
      });
      state.profile.xp += 1;
      saveProfile(state.profile);
      root().innerHTML = `
        <header class="gw-header"><h1>ANCHOR CHECKED</h1></header>
        <main class="gw-panel">
          <p class="gw-script">${esc(SKIN.sessionFrame.storm.done)}</p>
          <button class="gw-primary gw-big" data-act="home">Close the log</button>
        </main>`;
      wire({ home: () => nav('home') });
    },
    home: () => nav('home')
  });
}

// ── Weekly Dispatch (trend review — judge in trends or not at all) ──────────
function renderDispatch() {
  const h = state.profile.history;
  const window1 = h.slice(-3), window0 = h.slice(-6, -3);
  const rate = (w) => {
    const total = w.reduce((n, x) => n + (x.setsTotal || 0), 0);
    return total ? Math.round(100 * w.reduce((n, x) => n + (x.setsHit || 0), 0) / total) : null;
  };
  const flow = (w) => w.reduce((n, x) => n + (x.flowMinutes || 0), 0);
  const r1 = rate(window1), r0 = rate(window0);
  const trendArrow = r0 === null ? '' : r1 > r0 ? ' ↑' : r1 < r0 ? ' ↓' : ' →';
  root().innerHTML = `
    <header class="gw-header"><h1>${esc(SKIN.sessionFrame.dispatch.title)}</h1></header>
    <main class="gw-panel">
      <p class="gw-dim">${esc(SKIN.sessionFrame.dispatch.intro)}</p>
      <div class="gw-stat-row">
        <div class="gw-stat"><div class="gw-stat-num">${h.length}</div><div class="gw-stat-label">sessions total</div></div>
        <div class="gw-stat"><div class="gw-stat-num">${r1 === null ? '—' : r1 + '%' + trendArrow}</div><div class="gw-stat-label">hit rate (last 3)</div></div>
        <div class="gw-stat"><div class="gw-stat-num">${flow(window1)}</div><div class="gw-stat-label">flow min (last 3)</div></div>
        <div class="gw-stat"><div class="gw-stat-num">${treeStat()}<span class="gw-pct">%</span></div><div class="gw-stat-label">${esc(TREE.name)}</div></div>
      </div>
      <label class="gw-dim">${esc(SKIN.sessionFrame.dispatch.frictionPrompt)}</label>
      <div class="gw-note-row"><input id="disp-friction" class="gw-text" maxlength="120"></div>
      <label class="gw-dim">${esc(SKIN.sessionFrame.dispatch.goalPrompt)}</label>
      <div class="gw-note-row"><input id="disp-goal" class="gw-text" maxlength="120"></div>
      <button class="gw-primary gw-big" data-act="file">File the dispatch</button>
      <button data-act="home">Back</button>
    </main>`;
  wire({
    file: () => {
      const friction = (document.getElementById('disp-friction') || {}).value || '';
      const goal = (document.getElementById('disp-goal') || {}).value || '';
      if (friction.trim()) state.profile.notes.push({ at: new Date().toISOString(), room: 'Weekly Dispatch', text: 'Friction: ' + friction.trim() });
      if (goal.trim()) state.profile.microGoal = goal.trim();
      state.profile.lastDispatchAt = new Date().toISOString();
      saveProfile(state.profile);
      root().innerHTML = `
        <header class="gw-header"><h1>DISPATCH FILED</h1></header>
        <main class="gw-panel">
          <p class="gw-script">${esc(SKIN.sessionFrame.dispatch.close)}</p>
          <button class="gw-primary gw-big" data-act="home">Back to the station</button>
        </main>`;
      wire({ home: () => nav('home') });
    },
    home: () => nav('home')
  });
}

// ── Archive / Kit / Map / Log / Settings ─────────────────────────────────────

const CHAIN_NAMES = { log: 'STATION LOG', personal: 'PERSONAL EFFECTS', technical: 'TECHNICAL FILES', signal: 'BAND 7' };

function renderArchive() {
  const found = (state.profile.archive || []).map((a) => fragmentById(SKIN, a.id)).filter(Boolean);
  const byChain = {};
  for (const f of found) (byChain[f.chain] = byChain[f.chain] || []).push(f);
  const total = SKIN.fragments.length;
  root().innerHTML = `
    <header class="gw-header"><h1>THE ARCHIVE</h1>
      <div class="gw-dim">${found.length} of ${total} documents recovered · intel rolls and encounters add pages</div></header>
    <main class="gw-panel">
      ${found.length ? Object.keys(byChain).map((chain) => `
        <h2>${esc(CHAIN_NAMES[chain] || chain)}</h2>
        ${byChain[chain].map((f) => `
          <details class="gw-doc-entry">
            <summary>${esc(f.id)} — ${esc(f.title)}</summary>
            <div class="gw-document">
              <div class="gw-doc-type">${esc(f.documentType.toUpperCase())}</div>
              <p class="gw-doc-body">${esc(f.body)}</p>
              <div class="gw-doc-hook">${esc(f.hook)}</div>
            </div>
          </details>`).join('')}`).join('') : '<p>No documents yet. The rooms hold them; the work recovers them.</p>'}
      ${state.profile.notes.length ? `
        <h2>FIELD NOTES (yours)</h2>
        <ul class="gw-list">${state.profile.notes.slice(-15).map((n) => `<li><span class="gw-dim">${esc(n.room)}:</span> ${esc(n.text)}</li>`).join('')}</ul>` : ''}
      <button class="gw-primary" data-act="home">Back</button>
    </main>`;
  wire({ home: () => nav('home') });
}

function renderKit() {
  const items = (state.profile.kit || []).map((k) => kitItemById(SKIN, k.id)).filter(Boolean);
  root().innerHTML = `
    <header class="gw-header"><h1>THE KIT</h1>
      <div class="gw-dim">${items.length} of ${SKIN.kitItems.length} recovered</div></header>
    <main class="gw-panel">
      ${items.length ? items.map((k) => `
        <div class="gw-item">
          <div class="gw-item-kind">${esc(k.kind.toUpperCase())}${k.kind === 'key' ? ' · OPENS A ROUTE' : ''}</div>
          <div class="gw-item-name">${esc(k.name)}</div>
          <p>${esc(k.body)}</p>
        </div>`).join('') : '<p>Empty kit. Salvage lives behind doors marked for it.</p>'}
      <button class="gw-primary" data-act="home">Back</button>
    </main>`;
  wire({ home: () => nav('home') });
}

function renderMap() {
  const wing = projectWing(SKIN, TREE, state.profile, (tierId) => tierState(state.profile, TREE, tierId));
  root().innerHTML = `
    <header class="gw-header"><h1>${esc(wing.stationName)} — ${esc(wing.wingName)}</h1>
      <div class="gw-dim">cleared sectors are farmable · sealed doors post their standard · locked wings wait</div></header>
    <main class="gw-panel gw-map">
      ${wing.branches.map((b) => `
        <div class="gw-map-branch">
          <h2>${esc(b.name)} corridor</h2>
          <div class="gw-rooms">
            ${b.sectors.map((sec) => `
              <div class="gw-room gw-room-${sec.state}" title="${esc(sec.tier.name)}">
                <div>
                  <div class="gw-room-name">${esc(sec.flavorName)}</div>
                  <div class="gw-dim">${esc(sec.tier.name)}${sec.state === 'locked' && sec.tier.boss === null ? '' : ''}</div>
                </div>
                <div class="gw-room-state">${sec.state === 'cleared' ? '✓' : sec.state === 'active' ? '●' : '🔒'}</div>
              </div>`).join('')}
          </div>
          ${b.explored.length ? `<div class="gw-dim gw-explored">explored: ${b.explored.map((r) => esc(r.name)).join(' · ')}</div>` : ''}
        </div>`).join('')}
      ${wing.shortcuts.length ? `<h2>Open shortcuts</h2><ul class="gw-list">${wing.shortcuts.map((sc) => `<li>${esc(sc)}</li>`).join('')}</ul>` : ''}
      <h2>Sealed wings</h2>
      ${wing.lockedDoors.map((d) => `
        <div class="gw-room gw-room-locked">
          <div><div class="gw-room-name">${esc(d.name)}</div><div class="gw-dim">${esc(d.tease)} <em>(requires ${esc(d.requires)})</em></div></div>
          <div class="gw-room-state">🔒</div>
        </div>`).join('')}
      <button class="gw-primary" data-act="home">Back</button>
    </main>`;
  wire({ home: () => nav('home') });
}

function renderLog() {
  const rows = [...state.profile.history].reverse().slice(0, 20);
  root().innerHTML = `
    <header class="gw-header"><h1>AAR LOG</h1></header>
    <main class="gw-panel">
      ${rows.length ? `<ul class="gw-list">${rows.map((h) => `
        <li><strong>${esc(h.date.slice(0, 10))}</strong> — ${esc(h.focusBranch)} · sets ${h.setsHit}/${h.setsTotal}
        ${h.boss ? (h.boss.passed ? ' · <strong>door opened</strong>' : ' · door held (intel filed)') : ''}
        ${h.learnMode ? ' · tutorial' : ''}</li>`).join('')}</ul>` : '<p>No entries yet.</p>'}
      <button class="gw-primary" data-act="home">Back</button>
    </main>`;
  wire({ home: () => nav('home') });
}

function renderSettings() {
  const s = state.profile.settings;
  root().innerHTML = `
    <header class="gw-header"><h1>SETTINGS</h1></header>
    <main class="gw-panel">
      <h2>Session budget</h2>
      <p class="gw-dim">Shapes optional volume only. Main progression work and joint prep are never cut.</p>
      <div class="gw-row">
        ${[25, 40, 60].map((m) => `<button data-budget="${m}" class="${s.sessionBudgetMinutes === m ? 'gw-primary' : ''}">${m} min</button>`).join('')}
      </div>
      <h2>Sound</h2>
      <div class="gw-row">
        <button data-act="mute" class="${s.muted ? '' : 'gw-primary'}">${s.muted ? 'Unmute chimes' : 'Sound on'}</button>
      </div>
      <button class="gw-primary" data-act="home">Back</button>
    </main>`;
  root().querySelectorAll('[data-budget]').forEach((el) => {
    el.addEventListener('click', () => {
      state.profile.settings.sessionBudgetMinutes = Number(el.getAttribute('data-budget'));
      saveProfile(state.profile); render();
    });
  });
  wire({
    mute: () => { state.profile.settings.muted = !state.profile.settings.muted; saveProfile(state.profile); render(); },
    home: () => nav('home')
  });
}

// ── Dice, timer, wake lock, save plumbing ────────────────────────────────────

function animateDie(finalRoll, done) {
  const die = document.getElementById('die');
  if (!die) { done(); return; }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { die.textContent = String(finalRoll).padStart(2, '0'); setTimeout(done, 250); return; }
  die.classList.add('gw-die-rolling');
  let ticks = 0;
  const id = setInterval(() => {
    ticks += 1;
    die.textContent = String(Math.floor(Math.random() * 100)).padStart(2, '0'); // display-only flutter
    rollTick(muted());
    if (ticks >= 14) {
      clearInterval(id);
      die.classList.remove('gw-die-rolling');
      die.textContent = String(finalRoll).padStart(2, '0');
      setTimeout(done, 450);
    }
  }, 70);
}

function renderTimerHtml(seconds) {
  return `<div class="gw-timer" id="timer" data-total="${seconds}">
    <div class="gw-timer-num" id="timer-num">${fmtTime(seconds)}</div>
    <div class="gw-timer-bar"><div class="gw-timer-fill" id="timer-fill" style="width:100%"></div></div>
    <div class="gw-dim">rest — read, decide, breathe</div>
  </div>`;
}

function startTimer(total) {
  stopTimer();
  let remaining = total;
  state.timer = { intervalId: setInterval(() => {
    remaining -= 1;
    const num = document.getElementById('timer-num');
    const fillEl = document.getElementById('timer-fill');
    if (!num || !fillEl) { stopTimer(); return; }
    num.textContent = fmtTime(Math.max(0, remaining));
    fillEl.style.width = Math.max(0, (remaining / total) * 100) + '%';
    if (remaining <= 0) {
      num.textContent = 'GO';
      chimeRestEnd(muted());
      stopTimer();
    }
  }, 1000) };
}

function stopTimer() {
  if (state.timer && state.timer.intervalId) clearInterval(state.timer.intervalId);
  state.timer = null;
}

function fmtTime(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

async function acquireWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      state.wakeLock = await navigator.wakeLock.request('screen');
      document.addEventListener('visibilitychange', reacquireWakeLock);
    }
  } catch { /* not critical */ }
}
async function reacquireWakeLock() {
  if (document.visibilityState === 'visible' && state.screen === 'session') {
    try { state.wakeLock = await navigator.wakeLock.request('screen'); } catch { /* ok */ }
  }
}
function releaseWakeLock() {
  document.removeEventListener('visibilitychange', reacquireWakeLock);
  if (state.wakeLock) { state.wakeLock.release().catch(() => {}); state.wakeLock = null; }
}

function doExport() {
  const blob = new Blob([exportProfile(state.profile)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `groundwork-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function doImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state.profile = importProfile(String(reader.result));
      saveProfile(state.profile);
      render();
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function wire(handlers) {
  root().querySelectorAll('[data-act]').forEach((el) => {
    const act = el.getAttribute('data-act');
    if (handlers[act]) el.addEventListener('click', handlers[act]);
  });
}

// ── Boot ─────────────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* dev */ });
}
render();
