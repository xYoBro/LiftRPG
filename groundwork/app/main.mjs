// ── Groundwork app bootstrap ─────────────────────────────────────────────────
// Plain and legible (pillar 6). State + explicit render, no framework.
// The session runner is the core screen; everything else serves it.

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
  applyBossPass, intelDropForFault, branchOfTier
} from './engine/profile.mjs';
import { generateSession, roomKey, buildAar, unlockHit, REST_SECONDS } from './engine/session.mjs';

const TREE = PULL_TREE;

const state = {
  screen: 'home',          // home | assess | session | map | log
  profile: loadProfile(),
  assessRun: null,
  session: null,           // generated session
  sessionStep: null,       // { phase: 'brief'|'prep'|'warmup'|'room'|'boss'|'debrief', roomIndex }
  setResults: {},          // roomKey → { outcome, amount }
  resolutions: [],         // room resolution records
  bossResult: null,
  intelDrop: null,
  sessionState: null,      // { isDeload, bonusRoomOffered }
  rng: null,
  timer: null,             // { remaining, total, intervalId }
  lastRoll: null
};

const root = () => document.getElementById('app');
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function tierFlavorName(tier) {
  return (SKIN.tierNames && SKIN.tierNames[tier.hookSlot]) || tier.name;
}

function fill(template, vars) {
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
}

// ── Screens ──────────────────────────────────────────────────────────────────

function render() {
  stopTimerDisplayOnly();
  const screens = { home: renderHome, assess: renderAssess, session: renderSession, map: renderMap, log: renderLog };
  (screens[state.screen] || renderHome)();
}

function nav(screen) { state.screen = screen; render(); }

function renderHome() {
  const p = state.profile;
  const hasAssessment = p && p.assessments[TREE.id];
  const recal = p && needsRecalibration(p);
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
        ${recal ? `<div class="gw-callout">Layoff detected (&gt;2 weeks since the last AAR). A re-survey is recommended — the map should match the body that shows up, not the one that left. <button data-act="start-assess">Re-run Intake</button></div>` : ''}
        <div class="gw-stat-row">
          <div class="gw-stat"><div class="gw-stat-num">${treeStat()}</div><div class="gw-stat-label">${esc(TREE.name)} %</div></div>
          <div class="gw-stat"><div class="gw-stat-num">${(p.cleared[TREE.id] || []).length}</div><div class="gw-stat-label">rooms cleared</div></div>
          <div class="gw-stat"><div class="gw-stat-num">${p.xp}</div><div class="gw-stat-label">XP</div></div>
        </div>
        <button class="gw-primary" data-act="start-session">Start Session</button>
        <button data-act="map">Station Map</button>
        <button data-act="log">AAR Log</button>
      `}
      <div class="gw-row gw-save-row">
        ${p ? `<button data-act="export">Export Save</button>` : ''}
        <button data-act="import">Import Save</button>
        ${p ? `<button class="gw-danger" data-act="reset">Reset</button>` : ''}
      </div>
      <input type="file" id="import-file" accept="application/json" hidden>
    </main>`;
  wire({
    'new-profile': () => { state.profile = createEmptyProfile(); saveProfile(state.profile); startAssess(); },
    'start-assess': startAssess,
    'start-session': startSession,
    'map': () => nav('map'),
    'log': () => nav('log'),
    'export': doExport,
    'import': () => document.getElementById('import-file').click(),
    'reset': () => { if (confirm('Erase the local save? Export first if you want to keep it.')) { clearProfile(); state.profile = null; render(); } }
  });
  const fileInput = document.getElementById('import-file');
  if (fileInput) fileInput.addEventListener('change', doImport);
}

function startAssess() {
  state.assessRun = createAssessmentRun(TREE);
  state.screen = 'assess';
  render();
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
            return `<li><strong>${esc(TREE.branches[branch].name)}:</strong> ${esc(tierFlavorName(tier))} <span class="gw-dim">(${esc(tier.name)})</span></li>`;
          }).join('')}
        </ul>
        <button class="gw-primary" data-act="home">To the Station</button>
      </main>`;
    wire({ home: () => nav('home') });
    return;
  }
  const rung = currentRung(run, TREE);
  const tier = getTier(TREE, rung.tier);
  const std = rung.standard;
  const stdText = std.kind === 'hold'
    ? `hold ${std.value}s`
    : `${std.value} reps${std.perSide ? ' per side' : ''}`;
  root().innerHTML = `
    <header class="gw-header"><h1>INTAKE SURVEY</h1>
      <div class="gw-dim">rung ${run.index + 1} of ${run.ladder.length} · first miss per branch ends that branch · rest as needed between rungs</div></header>
    <main class="gw-panel">
      <p class="gw-dim">${esc(SKIN.sessionFrame.assessment.intro)}</p>
      <h2>${esc(tierFlavorName(tier))} <span class="gw-dim">(${esc(tier.name)} · ${esc(TREE.branches[tier.branch].name)})</span></h2>
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

// ── Session flow ─────────────────────────────────────────────────────────────

function treeStat() {
  return deriveTreeStat(TREE, (state.profile.cleared[TREE.id] || []).length, recentHitRate(state.profile, TREE.id));
}

function startSession() {
  const dayNumber = state.profile.history.length + 1;
  state.session = generateSession(state.profile, TREE, { dayNumber });
  state.rng = createRng(state.profile.seed + ':' + dayNumber);
  state.setResults = {};
  state.resolutions = [];
  state.bossResult = null;
  state.intelDrop = null;
  state.sessionState = { isDeload: state.session.isDeload, bonusRoomOffered: false };
  state.sessionStep = { phase: 'brief', roomIndex: 0 };
  state.screen = 'session';
  render();
}

function renderSession() {
  const s = state.session;
  const step = state.sessionStep;
  const phases = { brief: renderBrief, prep: renderPrep, warmup: renderWarmup, room: renderRoom, boss: renderBoss, debrief: renderDebrief };
  phases[step.phase](s);
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
      ${s.learnMode ? `<div class="gw-callout">${esc(SKIN.sessionFrame.tutorial.intro)}</div>` : ''}
      <button class="gw-primary" data-act="go">Begin</button>
      <button data-act="abort">Back</button>
    </main>`;
  wire({ go: () => { state.sessionStep = { phase: 'prep', roomIndex: 0 }; render(); }, abort: () => nav('home') });
}

function renderPrep(s) {
  root().innerHTML = `
    <header class="gw-header"><h1>JOINT PREP</h1><div class="gw-dim">mandatory — connective tissue first</div></header>
    <main class="gw-panel">
      <ul class="gw-list">${s.prep.map((d) => `<li><strong>${esc(d.name)}</strong> — ${esc(d.detail)}</li>`).join('')}</ul>
      <button class="gw-primary" data-act="done">Prep complete</button>
    </main>`;
  wire({ done: () => { state.sessionStep = { phase: s.warmup ? 'warmup' : 'room', roomIndex: 0 }; render(); } });
}

function renderWarmup(s) {
  const w = s.warmup;
  root().innerHTML = `
    <header class="gw-header"><h1>WARM-UP — CLEARED ROOM</h1></header>
    <main class="gw-panel">
      <h2>${esc(tierFlavorName(w.tier))} <span class="gw-dim">(${esc(w.tier.name)})</span></h2>
      <p>1 easy set in the ${schemeText(w.tier.scheme)} range. This room is yours; walk it to wake up.</p>
      <button class="gw-primary" data-act="done">Warm-up done</button>
    </main>`;
  wire({ done: () => { state.sessionStep = { phase: 'room', roomIndex: 0 }; render(); } });
}

function schemeText(scheme) {
  return scheme.kind === 'reps'
    ? `${scheme.sets}×${scheme.repWindow[0]}–${scheme.repWindow[1]}${scheme.perSide ? ' per side' : ''}`
    : `${scheme.sets}×${scheme.holdWindow[0]}–${scheme.holdWindow[1]}s holds`;
}

function renderRoom(s) {
  const idx = state.sessionStep.roomIndex;
  const room = s.rooms[idx];
  if (!room) { state.sessionStep = { phase: s.boss ? 'boss' : 'debrief' }; render(); return; }
  const key = roomKey(room);
  const result = state.setResults[key];
  const resolution = state.resolutions[idx];
  const tier = room.tier;
  const target = tier.scheme.kind === 'reps' ? tier.scheme.repWindow : tier.scheme.holdWindow;
  const unit = tier.scheme.kind === 'reps' ? 'reps' : 'seconds';

  root().innerHTML = `
    <header class="gw-header">
      <h1>ROOM ${idx + 1} / ${s.rooms.length} — ${esc(tierFlavorName(tier))}</h1>
      <div class="gw-dim">${esc(tier.name)} · set ${room.setNumber} · target ${target[0]}–${target[1]} ${unit} · ${esc(TREE.name)} ${treeStat()}%</div>
    </header>
    <main class="gw-panel">
      ${room.learnCue ? `<div class="gw-callout">Cue this set: <strong>${esc(room.learnCue)}</strong></div>` : `
      <details class="gw-form"><summary>Form standard</summary>
        <ul class="gw-list">${tier.formStandard.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></details>`}
      ${!result ? `
        <p class="gw-bigcue">Do the set. The room resolves when you rest.</p>
        <div class="gw-row">
          <button class="gw-primary" data-act="hit">Hit (top of form)</button>
          <button data-act="partial">Partial</button>
          <button data-act="missed">Missed</button>
        </div>
        <div class="gw-row gw-amount-row">
          <label>${unit}: <input id="amount" type="number" min="0" max="120" inputmode="numeric"></label>
        </div>
      ` : !resolution ? `
        <div id="dice-stage" class="gw-dice-stage"><div class="gw-die" id="die">--</div></div>
        <p class="gw-dim">Set logged (${esc(result.outcome)}). Roll to resolve the room — ${result.outcome === 'hit' ? 'advantage' : result.outcome === 'partial' ? 'flat' : 'disadvantage'} vs ${treeStat()}%.</p>
        <button class="gw-primary" data-act="roll">Roll d100</button>
      ` : `
        ${renderResolutionHtml(resolution)}
        ${renderTimerHtml(room.restSeconds)}
        <button class="gw-primary" data-act="next">Next room</button>
      `}
    </main>`;

  wire({
    hit: () => logSet(key, 'hit'),
    partial: () => logSet(key, 'partial'),
    missed: () => logSet(key, 'missed'),
    roll: () => rollRoom(idx, room),
    next: () => { state.sessionStep = { phase: 'room', roomIndex: idx + 1 }; render(); }
  });
  if (resolution) startTimer(room.restSeconds);
}

function logSet(key, outcome) {
  const amountEl = document.getElementById('amount');
  const amount = amountEl && amountEl.value ? Number(amountEl.value) : 0;
  state.setResults[key] = { outcome, amount };
  render();
}

function rollRoom(idx, room) {
  const result = state.setResults[roomKey(room)];
  const resolution = resolveRoom(state.rng, {
    stat: treeStat(),
    setOutcome: result.outcome,
    sessionState: state.sessionState
  });
  resolution.kind = resolution.kind; // crit/success/fail/complication
  animateDie(resolution.roll, () => {
    state.resolutions[idx] = resolution;
    render();
  });
}

function renderResolutionHtml(res) {
  const kindLabel = { crit: 'CRITICAL', success: 'CLEARED', fail: 'SCOUTED', complication: 'COMPLICATION' }[res.kind] || res.kind;
  const beats = SKIN.sessionFrame.restBeats[res.row.beatSlot] || null;
  const beat = beats ? beats[res.roll % beats.length] : null;
  return `
    <div class="gw-resolution gw-res-${esc(res.kind)}">
      <div class="gw-roll">${String(res.roll).padStart(2, '0')} <span class="gw-dim">vs ${res.stat} · ${esc(res.mode)}${res.rolls.length > 1 ? ' (' + res.rolls.map((r) => String(r).padStart(2, '0')).join(', ') + ')' : ''}</span></div>
      <div class="gw-kind">${esc(kindLabel)}</div>
      <p class="gw-script">${esc(res.row.text)}</p>
      ${beat ? `<p class="gw-beat">${esc(beat)}</p>` : ''}
    </div>`;
}

function renderBoss(s) {
  const boss = s.boss;
  const tier = boss.tier;
  const def = boss.definition;
  const intro = SKIN.bossIntros[tier.hookSlot] || SKIN.bossIntros.default;
  const res = state.bossResult;
  root().innerHTML = `
    <header class="gw-header"><h1>SEALED DOOR — ${esc(tierFlavorName(getTier(TREE, def.tier) || tier))}</h1>
      <div class="gw-dim">boss attempt · rest ${REST_SECONDS.boss}s before you start</div></header>
    <main class="gw-panel">
      <p class="gw-script">${esc(intro)}</p>
      <p><strong>The standard:</strong> ${esc(def.label)}.</p>
      ${!res ? `
        <div class="gw-row">
          <button class="gw-primary" data-act="pass">Standard met</button>
          <button data-act="fail">Held — this time</button>
          <button data-act="skip">Walk away (no attempt)</button>
        </div>
      ` : `
        ${renderResolutionHtml(res)}
        ${state.intelDrop ? `<div class="gw-callout">${esc(fill(SKIN.sessionFrame.intelDrop, {
          faultName: state.intelDrop.fault.text,
          sideQuestName: state.intelDrop.sideQuest.name,
          sideQuestNote: state.intelDrop.sideQuest.note
        }))}</div>` : ''}
        <button class="gw-primary" data-act="debrief">File the AAR</button>
      `}
    </main>`;
  wire({
    pass: () => finishBoss(true),
    fail: () => finishBoss(false),
    skip: () => { state.sessionStep = { phase: 'debrief' }; render(); },
    debrief: () => { state.sessionStep = { phase: 'debrief' }; render(); }
  });
}

function finishBoss(passed) {
  const s = state.session;
  const tier = s.boss.tier;
  const res = resolveBoss(state.rng, { stat: treeStat(), passed });
  res.passed = passed;
  state.bossResult = res;
  if (passed) {
    applyBossPass(state.profile, TREE, tier.id, s.boss.definition.tier);
    delete state.profile.bossElect;
  } else {
    // Intel drop: ask which fault showed up (slice: first common fault by
    // default; the author picks in the UI in full production)
    state.intelDrop = intelDropForFault(TREE, tier.id, tier.commonFaults[0].id);
  }
  render();
}

function renderDebrief(s) {
  // Persist AAR once
  if (!state._aarFiled) {
    const aar = buildAar(s, {
      setResults: state.setResults,
      resolutions: state.resolutions.filter(Boolean),
      bossResult: state.bossResult,
      intelDrop: state.intelDrop
    });
    state.profile.history.push(aar);
    if (s.learnMode && s.focusTierId) state.profile.tutorialSeen[s.focusTierId] = true;
    state.profile.xp += aar.setsHit + (state.bossResult && state.bossResult.passed ? 0 : 0);
    saveProfile(state.profile);
    state._aarFiled = aar;
  }
  const aar = state._aarFiled;
  const loot = state.resolutions.filter((r) => r && r.row.effect === 'loot').length;
  const intel = state.resolutions.filter((r) => r && r.row.effect === 'intel').length + (state.intelDrop ? 1 : 0);
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
        <div class="gw-stat"><div class="gw-stat-num">${treeStat()}</div><div class="gw-stat-label">${esc(TREE.name)} % now</div></div>
      </div>
      <button class="gw-primary" data-act="home">Close the log</button>
    </main>`;
  wire({ home: () => { state._aarFiled = null; if (aar.unlockHit && s.focusTierId) state.profile.bossElect = s.focusTierId; saveProfile(state.profile); nav('home'); } });
}

// ── Map (projection of engine state) ─────────────────────────────────────────
function renderMap() {
  const branches = Object.keys(TREE.branches);
  root().innerHTML = `
    <header class="gw-header"><h1>${esc(SKIN.map.stationName)} — ${esc(SKIN.map.wings[TREE.id])}</h1>
      <div class="gw-dim">cleared rooms are farmable · the locked door is always visible</div></header>
    <main class="gw-panel gw-map">
      ${branches.map((branch) => `
        <div class="gw-map-branch">
          <h2>${esc(TREE.branches[branch].name)}</h2>
          <div class="gw-rooms">
            ${TREE.tiers.filter((t) => t.branch === branch).map((t) => {
              const st = tierState(state.profile, TREE, t.id);
              return `<div class="gw-room gw-room-${st}" title="${esc(t.name)}">
                <div class="gw-room-name">${esc(tierFlavorName(t))}</div>
                <div class="gw-room-state">${st === 'cleared' ? '✓' : st === 'active' ? '●' : '🔒'}</div>
              </div>`;
            }).join('')}
          </div>
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

// ── Dice, timer, save plumbing ───────────────────────────────────────────────

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
    <div class="gw-dim">rest — the beat above is the room resolving</div>
  </div>`;
}

function startTimer(total) {
  stopTimer();
  let remaining = total;
  state.timer = { remaining, total, intervalId: setInterval(() => {
    remaining -= 1;
    const num = document.getElementById('timer-num');
    const fillEl = document.getElementById('timer-fill');
    if (!num || !fillEl) { stopTimer(); return; }
    num.textContent = fmtTime(Math.max(0, remaining));
    fillEl.style.width = Math.max(0, (remaining / total) * 100) + '%';
    if (remaining <= 0) { num.textContent = 'GO'; stopTimer(); }
  }, 1000) };
}

function stopTimer() {
  if (state.timer && state.timer.intervalId) clearInterval(state.timer.intervalId);
  state.timer = null;
}
function stopTimerDisplayOnly() { stopTimer(); }

function fmtTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
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
  navigator.serviceWorker.register('./sw.js').catch(() => { /* offline-first is best-effort in dev */ });
}
render();
