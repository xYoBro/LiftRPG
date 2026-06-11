// ── Groundwork app (v2 — the 10/10 pass) ────────────────────────────────────
// Plain and legible (pillar 6), but a GAME: door choices, readable archive,
// encounter decisions, boss ceremony, state-aware voice, hooks that pull you
// back. State + explicit render, no framework.

import { PULL_TREE } from '../data/trees/pull.mjs';
import { SKIN as DEFAULT_SKIN } from '../data/skins/dead-zone.mjs';
import { validateSkin, skinSummary } from '../data/skins/skin-contract.mjs';
import { buildSkinPrompt } from '../data/skins/skin-prompt.mjs';
import { deriveTreeStat } from '../data/tables/resolution.mjs';
import { createRng } from './engine/rng.mjs';
import { resolveRoom, resolveBoss } from './engine/resolver.mjs';
import {
  createEmptyProfile, loadProfile, saveProfile, clearProfile,
  exportProfile, importProfile, startNewCampaign,
  createAssessmentRun, currentProbe, recordProbeResult, isAssessmentComplete,
  applyAssessment, getTier, tierState, recentHitRate, needsRecalibration,
  applyBossPass, intelDropForFault
} from './engine/profile.mjs';
import { generateSession, roomKey, buildAar, unlockHit, computeDoorCharge, trailingCharges, REST_SECONDS } from './engine/session.mjs';
import { awardForRow, resolveEncounterChoice, resolveSpecialRoom, fragmentById, kitItemById } from './engine/discovery.mjs';
import { markExplored, projectWing } from './engine/map.mjs';
import { doorsOpenedCount, monthsOnStation, dueKeystonesForBossPass, fileKeystone, fileLiveEvent } from './engine/keystones.mjs';
import { seasonState, episodeFor, editorialFor, mastReady, closeSeason, SEASON_WEEKS } from './engine/season.mjs';
import { chimeRestEnd, bossSting, rollTick, unlockAudio } from './engine/audio.mjs';
import { buildWingMapSvg } from './render/wing-map.mjs';
import { FIGURES } from '../data/figures/manifest.mjs';

const TREE = PULL_TREE;

// ── Active skin (creation pipeline, D43) ─────────────────────────────────────
// A custom campaign skin can replace DEAD ZONE wholesale. It is validated at
// import AND at boot (a corrupted save never bricks the app — fall back to
// the default world and say so in the console).
const CUSTOM_SKIN_KEY = 'groundwork_custom_skin';
function loadActiveSkin() {
  try {
    const raw = localStorage.getItem(CUSTOM_SKIN_KEY);
    if (!raw) return DEFAULT_SKIN;
    const custom = JSON.parse(raw);
    const v = validateSkin(custom, TREE);
    if (!v.ok) {
      console.warn('[groundwork] custom skin failed validation; using default world:', v.errors);
      return DEFAULT_SKIN;
    }
    return custom;
  } catch {
    return DEFAULT_SKIN;
  }
}
const SKIN = loadActiveSkin();

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
  keystoneReveals: [],      // authored documents fired by this boss pass
  liveBeat: 0,              // Band 7 live event beat index
  liveChoiceResult: null,
  coldIndex: 0,             // cold-open card index
  deskPile: null,           // archive desk: open pile (chain key)
  deskIndex: 0,             // archive desk: page within the pile
  mapView: 'local',         // station map: 'local' (your band) | 'wing' (everything)
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

function figureFrames(tier) {
  const base = tier.id.replace(/\./g, '-');
  return [1, 2, 3]
    .map((n) => base + '-' + n + '.webp')
    .filter((name) => FIGURES.includes(name))
    .map((name) => 'data/figures/' + name);
}
function videoRefHtml(tier) {
  if (!tier.videoRef) return '';
  const q = encodeURIComponent(tier.videoRef.creator.split(' or ')[0] + ' ' + tier.videoRef.search);
  return `<a class="gw-video-link" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">▶ Watch the form: ${esc(tier.videoRef.creator)} — “${esc(tier.videoRef.search)}”</a>`;
}
function figuresHtml(tier) {
  const frames = figureFrames(tier);
  if (!frames.length) return '';
  return `<div class="gw-figures">${frames.map((src, i) =>
    `<img src="${src}" alt="${esc(tier.name)} — frame ${i + 1}" loading="lazy">`).join('')}</div>`;
}

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

function bottomNav(active) {
  // Map-as-home (Sprint 2.3): the wing map IS the Station screen.
  const items = [
    ['home', 'Station'], ['archive', 'Records'], ['more', 'More']
  ];
  return `<nav class="gw-tabbar">${items.map(([id, label]) =>
    `<button class="gw-tab ${active === id ? 'gw-tab-active' : ''}" data-act="nav-${id}">${label}</button>`).join('')}</nav>`;
}
function wireNav() {
  root().querySelectorAll('[data-act^="nav-"]').forEach((el) => {
    el.addEventListener('click', () => nav(el.getAttribute('data-act').slice(4)));
  });
}

function render() {
  stopTimer();
  const screens = {
    home: renderHome, 'cold-open': renderColdOpen, assess: renderAssess, session: renderSession,
    map: renderHome, log: renderLog, archive: renderArchive, kit: renderArchive, settings: renderSettings,
    storm: renderStorm, dispatch: renderDispatch, more: renderMore, finale: renderFinale,
    create: renderCreate
  };
  (screens[state.screen] || renderHome)();
  // Re-deal animation on every state change (reduced-motion handled in CSS)
  const app = root();
  app.classList.remove('gw-screen');
  void app.offsetWidth;
  app.classList.add('gw-screen');
  window.scrollTo(0, 0);
}
function nav(screen) {
  if (state._pendingReload && screen === 'home') { window.location.reload(); return; }
  if (screen === 'archive') { state.deskPile = null; state.deskIndex = 0; }
  state.screen = screen;
  render();
}

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
    focusTierId: peek.focusTierId,
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
  const preview = hasAssessment ? sessionPreview() : null;
  const missDays = hasAssessment ? daysSinceLastSession() : null;
  const showStormCue = missDays !== null && missDays >= 2 && missDays <= 6;
  if (!p || !hasAssessment) {
    root().innerHTML = `
      <header class="gw-header"><h1>GROUNDWORK</h1>
        <div class="gw-worldline">${esc(SKIN.worldLine)}</div></header>
      <main class="gw-panel gw-home">
        ${!p ? `
          <p class="gw-bigcue">The station needs a keeper.</p>
          <p class="gw-dim">The road holds as far as the gate. Your commission is the standard one.</p>
          <button class="gw-primary gw-big" data-act="new-profile">Arrive at the station</button>
        ` : `
          <p class="gw-bigcue">Intake survey incomplete.</p>
          <button class="gw-primary gw-big" data-act="start-assess">Resume Intake</button>
        `}
      </main>`;
    wire({
      'new-profile': () => { unlockAudio(); startColdOpen(); },
      'start-assess': () => { unlockAudio(); startAssess(); }
    });
    return;
  }
  // Map-as-home (Sprint 2.3): the Station screen IS the wing.
  const focusTier = preview.focusTierId ? getTier(TREE, preview.focusTierId) : null;
  const gateCharge = focusTier && focusTier.boss
    ? (preview.boss ? 1 : (p.doorCharge || {})[focusTier.id] || 0) : null;
  root().innerHTML = `
    <header class="gw-header"><h1>GROUNDWORK</h1>
      <div class="gw-worldline">${esc(SKIN.worldLine)}</div></header>
    <main class="gw-panel gw-home">
      <div class="gw-hero">
        ${(() => {
          const ss = seasonState(SKIN, p);
          if (ss.closed) {
            const endingDoc = p.seasonEnding && SKIN.finale ? SKIN.finale.endings[p.seasonEnding] : null;
            return `<div class="gw-preview-title gw-season-line">SEASON ONE — KEPT${endingDoc ? ' · ' + esc(endingDoc.title.replace('Ending — ', '')) : ''} · OVERTIME</div>`;
          }
          return ss.episode ? `<div class="gw-preview-title gw-season-line">WEEK ${Math.min(ss.week, ss.weeksTotal)} OF ${ss.weeksTotal} — ${esc(ss.episode.title)}</div>` : '';
        })()}
        <div class="gw-preview-title">TODAY — PINNED TO THE MAP</div>
        <div class="gw-hero-line">${esc(preview.room)} · ${preview.rooms} rooms${preview.boss ? ' · <strong>SEALED DOOR</strong>' : ''}${preview.learn ? ' · new ground' : ''}</div>
        ${gateCharge !== null ? `
          <div class="gw-charge">
            <div class="gw-charge-label">${esc(SKIN.map.gateMeterLabel || 'DOOR CHARGE')} · ${esc(focusTier.boss.label)}</div>
            <div class="gw-charge-bar"><div class="gw-charge-fill" style="width:${Math.round(gateCharge * 100)}%"></div></div>
            <div class="gw-charge-note gw-dim">${preview.boss ? 'Charged — the attempt is on the board today.' : gateCharge >= 1 ? 'Charged. Tap the gate on the map to elect the attempt.' : gateCharge > 0 ? Math.round(gateCharge * 100) + '% — top of the window on every set charges the door.' : 'No reading yet. Clean sets at the top of the window charge the door.'}</div>
          </div>` : ''}
        ${p.lastHook ? `<div class="gw-hero-hook">${esc(p.lastHook)}</div>` : ''}
      </div>
      <button class="gw-primary gw-big" data-act="start-session">Start Session</button>
      ${showStormCue ? `
        <div class="gw-callout">${esc(SKIN.sessionFrame.storm.missCue)}
          <button data-act="storm">${esc(SKIN.sessionFrame.storm.button)}</button></div>` : ''}
      ${dispatchDue() ? `<button data-act="dispatch">Weekly Dispatch is due</button>` : ''}
      ${recal ? `<div class="gw-callout">Over two weeks away. The map should match the body that shows up. <button data-act="start-assess">Re-run Intake</button></div>` : ''}
      ${buildStationMap(preview)}
      <div id="map-detail" class="gw-callout" hidden></div>
      <div class="gw-maprow">
        <div class="gw-dim gw-map-legend">pulse = you · tap any chamber or gate · bar under a gate = door charge</div>
        <button class="gw-mapview" data-act="map-view">${state.mapView === 'local' ? 'Whole wing' : 'Your position'}</button>
      </div>
      <div class="gw-identity gw-dim">${p.classification && (SKIN.grades || {})[p.classification] ? esc(SKIN.grades[p.classification].name) + ' · ' : ''}${esc(TREE.name)} ${treeStat()}% · ${(p.cleared[TREE.id] || []).length} sectors · ${(p.archive || []).length} documents${p.intention ? ` · ${esc(fill(SKIN.sessionFrame.intention.display, p.intention))}` : ''}${p.microGoal ? ` · goal: ${esc(p.microGoal)}` : ''}</div>
    </main>
    ${bottomNav('home')}`;
  wire({
    'start-assess': () => { unlockAudio(); startAssess(); },
    'start-session': () => { unlockAudio(); startSession(); },
    storm: () => { unlockAudio(); nav('storm'); },
    dispatch: () => nav('dispatch'),
    'map-view': () => { state.mapView = state.mapView === 'local' ? 'wing' : 'local'; render(); }
  });
  wireStationMap();
  wireNav();
}

// Build the wing map with everything the home screen pins to it.
function buildStationMap(preview) {
  const p = state.profile;
  const wing = projectWing(SKIN, TREE, p, (tierId) => tierState(p, TREE, tierId));
  const exploration = {};
  for (const branch of Object.keys(TREE.branches)) {
    const total = ((SKIN.roomPools || {})[branch] || []).length;
    exploration[branch] = { seen: Math.min(total, (((p.explored || {})[branch]) || []).length), total };
  }
  // Rooms explored fill into the sector chamber they were explored from;
  // pre-exploredAt saves fall back to the branch's active sector.
  const roomsBySector = {};
  for (const branch of Object.keys(TREE.branches)) {
    const pool = (SKIN.roomPools || {})[branch] || [];
    const fallbackTier = (p.active[TREE.id] || {})[branch];
    for (const roomId of ((p.explored || {})[branch]) || []) {
      const room = pool.find((r) => r.id === roomId);
      if (!room) continue;
      const tierId = (p.exploredAt || {})[roomId] || fallbackTier;
      if (!tierId) continue;
      (roomsBySector[tierId] = roomsBySector[tierId] || []).push(room);
    }
  }
  return buildWingMapSvg(wing, {
    roomsBySector,
    silhouettes: (SKIN.map && SKIN.map.silhouettes) || {},
    shortcutRoutes: (SKIN.map && SKIN.map.shortcutRoutes) || {},
    charges: p.doorCharge || {},
    todayTierId: preview ? preview.focusTierId : null,
    electedTierId: p.bossElect || null,
    exploration,
    window: state.mapView === 'local' && preview ? { tierId: preview.focusTierId } : null
  });
}

// Chamber and gate taps: detail panel; gates take the elect action
// (map-tap sets bossElect — Sprint 2.3).
function wireStationMap() {
  const detail = () => document.getElementById('map-detail');
  root().querySelectorAll('.gwm-chamber[data-tier]').forEach((el) => {
    el.addEventListener('click', () => {
      const tier = getTier(TREE, el.getAttribute('data-tier'));
      if (!tier) return;
      const st = tierState(state.profile, TREE, tier.id);
      const d = detail();
      d.hidden = false;
      d.innerHTML = `<strong>${esc(flavorName(tier))}</strong> <span class="gw-dim">(${esc(tier.name)} · ${esc(st)})</span><br>
        ${esc(schemeText(tier.scheme))}${tier.boss ? ` · gate standard: ${esc(tier.boss.label)}` : ''}`;
    });
  });
  root().querySelectorAll('.gwm-gate[data-gate]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const tier = getTier(TREE, el.getAttribute('data-gate'));
      if (!tier || !tier.boss) return;
      const charge = (state.profile.doorCharge || {})[tier.id] || 0;
      const elected = state.profile.bossElect === tier.id;
      const cls = state.profile.classification;
      const waves = cls === 'intermediate' || cls === 'advanced';
      const chargeLine = waves
        ? `charges held: ${trailingCharges(state.profile, TREE.id, tier.id, true)}/2 (heavy days only) · last reading ${Math.round(charge * 100)}%`
        : `${esc(SKIN.map.gateMeterLabel || 'DOOR CHARGE')}: ${Math.round(charge * 100)}%`;
      const d = detail();
      d.hidden = false;
      d.innerHTML = `<strong>SEALED GATE</strong> — ${esc(tier.boss.label)}<br>
        <span class="gw-dim">${chargeLine} · the door grades the standard, not the effort. Failure files intel.</span><br>
        <button data-elect="${esc(tier.id)}">${elected ? 'Elected — cancel the attempt' : 'Elect the attempt (next ' + esc(TREE.branches[tier.branch].name) + ' session)'}</button>`;
      d.querySelectorAll('[data-elect]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-elect');
          if (state.profile.bossElect === id) delete state.profile.bossElect;
          else state.profile.bossElect = id;
          saveProfile(state.profile);
          render();
        });
      });
    });
  });
}

// ── More: everything that is not play (log, settings, save, extras) ─────────
function renderMore() {
  root().innerHTML = `
    <header class="gw-header"><h1>MORE</h1></header>
    <main class="gw-panel">
      <button class="gw-row-btn" data-act="log">AAR Log</button>
      <button class="gw-row-btn" data-act="dispatch">Weekly Dispatch</button>
      <button class="gw-row-btn" data-act="storm">${esc(SKIN.sessionFrame.storm.button)}</button>
      <button class="gw-row-btn" data-act="create">New Campaign — creation kit</button>
      <button class="gw-row-btn" data-act="settings">Settings</button>
      <div class="gw-save-row gw-row">
        <button data-act="export">Export Save</button>
        <button data-act="import">Import Save</button>
        <button class="gw-danger" data-act="reset">Reset</button>
      </div>
      <input type="file" id="import-file" accept="application/json" hidden>
    </main>
    ${bottomNav('more')}`;
  wire({
    log: () => nav('log'), settings: () => nav('settings'),
    dispatch: () => nav('dispatch'), storm: () => { unlockAudio(); nav('storm'); },
    create: () => nav('create'),
    export: doExport,
    import: () => document.getElementById('import-file').click(),
    reset: () => { if (confirm('Erase the local save? Export first if you want to keep it.')) { clearProfile(); state.profile = null; nav('home'); } }
  });
  const fileInput = document.getElementById('import-file');
  if (fileInput) fileInput.addEventListener('change', doImport);
  wireNav();
}

// ── Cold open (Sprint 2.1) ───────────────────────────────────────────────────
// Three dealt cards before "Begin Intake": arrival, the dark station,
// RIGGING's first words. The profile is created when intake actually begins —
// bailing mid-open just re-deals it next visit. Skin-optional.

function startColdOpen() {
  if (!SKIN.coldOpen || !SKIN.coldOpen.length) {
    state.profile = createEmptyProfile();
    saveProfile(state.profile);
    startAssess();
    return;
  }
  state.coldIndex = 0;
  nav('cold-open');
}

function renderColdOpen() {
  const cards = SKIN.coldOpen || [];
  const card = cards[state.coldIndex];
  if (!card) { startAssess(); return; }
  const last = state.coldIndex === cards.length - 1;
  root().innerHTML = `
    <header class="gw-header"><h1>${esc(card.title)}</h1>
      <div class="gw-dim">${state.coldIndex + 1} of ${cards.length}</div></header>
    <main class="gw-panel gw-cold">
      ${card.kind === 'document' ? `
        <div class="gw-document">
          <div class="gw-doc-type">${esc((card.documentType || 'document').toUpperCase())}</div>
          <p class="gw-doc-body">${esc(card.body)}</p>
          ${card.hook ? `<div class="gw-doc-hook">${esc(card.hook)}</div>` : ''}
        </div>` : `
        <p class="gw-script">${esc(card.body)}</p>
        ${card.voiceLine ? `<p class="gw-beat">${esc(card.voiceLine)}</p>` : ''}`}
      <button class="gw-primary gw-big" data-act="cold-next">${last ? 'Begin Intake' : 'Continue'}</button>
    </main>`;
  wire({
    'cold-next': () => {
      if (last) {
        state.profile = createEmptyProfile();
        saveProfile(state.profile);
        startAssess();
      } else {
        state.coldIndex += 1;
        render();
      }
    }
  });
}

// ── Creation kit (D43): new campaign worlds on the same engine ───────────────
// Brief → generation prompt → any chat LLM → paste the JSON world back →
// validate → activate. The body travels (assessments, cleared sectors,
// history persist); the station, the voice, and the archive are new.
function renderCreate() {
  const customActive = SKIN !== DEFAULT_SKIN;
  root().innerHTML = `
    <header class="gw-header"><h1>NEW CAMPAIGN</h1>
      <div class="gw-dim">current world: ${esc(SKIN.name)}${customActive ? ' (custom)' : ''}</div></header>
    <main class="gw-panel">
      <p class="gw-dim">The body travels — intake results, cleared sectors, and the log come with you.
        The world is replaced: new station, new voice, new archive, a fresh 8-week season.</p>

      <h2>1 · Write a brief, copy the prompt</h2>
      <div class="gw-note-row"><input id="create-brief" class="gw-text" maxlength="300"
        placeholder="e.g. lighthouse on a drowned coast, 1930s, grief and tides"></div>
      <button class="gw-primary" data-act="copy-prompt">Copy the creation prompt</button>
      <div id="prompt-out" hidden>
        <p class="gw-dim">Clipboard blocked — copy it manually:</p>
        <textarea id="prompt-text" class="gw-text gw-textarea" readonly rows="8"></textarea>
      </div>
      <p class="gw-dim">Paste it into any chat LLM (Claude, ChatGPT, Gemini). It returns a JSON world.</p>

      <h2>2 · Paste the world back</h2>
      <textarea id="skin-json" class="gw-text gw-textarea" rows="6" placeholder='{ "id": "...", "name": "..." … }'></textarea>
      <button class="gw-primary" data-act="validate-skin">Validate the world</button>
      <div id="skin-report"></div>

      ${customActive ? `
        <h2>Return</h2>
        <button data-act="restore-default">Leave this world — return to ${esc(DEFAULT_SKIN.name)}</button>
        <p class="gw-dim">Starts a fresh campaign in the default world. The body still travels.</p>` : ''}
      <button data-act="back">Back</button>
    </main>`;
  wire({
    back: () => nav('more'),
    'copy-prompt': async () => {
      const brief = (document.getElementById('create-brief') || {}).value || '';
      const prompt = buildSkinPrompt(TREE, brief);
      try {
        await navigator.clipboard.writeText(prompt);
        const btn = root().querySelector('[data-act="copy-prompt"]');
        if (btn) btn.textContent = 'Copied — paste it into your LLM';
      } catch {
        const out = document.getElementById('prompt-out');
        const ta = document.getElementById('prompt-text');
        out.hidden = false;
        ta.value = prompt;
        ta.focus();
        ta.select();
      }
    },
    'validate-skin': () => {
      const report = document.getElementById('skin-report');
      let raw = (document.getElementById('skin-json') || {}).value || '';
      raw = raw.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) {
        report.innerHTML = `<div class="gw-callout gw-cal-err">Not valid JSON: ${esc(e.message)}</div>`;
        return;
      }
      const v = validateSkin(parsed, TREE);
      const summary = skinSummary(parsed, TREE);
      report.innerHTML = `
        ${v.errors.length ? `<div class="gw-callout gw-cal-err"><strong>${v.errors.length} error(s) — cannot activate:</strong>
          <ul class="gw-list">${v.errors.slice(0, 12).map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
          <p class="gw-dim">Paste these errors back to your LLM and ask it to fix the JSON.</p></div>` : ''}
        ${v.warnings.length ? `<div class="gw-callout"><strong>${v.warnings.length} warning(s) — runs with fallbacks:</strong>
          <ul class="gw-list">${v.warnings.slice(0, 10).map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
        ${v.ok ? `
          <div class="gw-item">
            <div class="gw-item-kind">WORLD VALIDATED</div>
            <div class="gw-item-name">${esc(summary.name)}</div>
            <p>${esc(summary.worldLine)}</p>
            <p class="gw-dim">voice: ${esc(summary.voice)} · ${summary.rooms} rooms · ${summary.fragments} documents ·
              ${summary.keystones} keystones · ${summary.episodes} episodes · ${summary.endings} endings · ${summary.kit} kit items</p>
          </div>
          <button class="gw-primary gw-big" data-act="activate-skin">Begin this campaign</button>` : ''}`;
      state._pendingSkin = v.ok ? parsed : null;
      wire({
        'activate-skin': () => {
          if (!state._pendingSkin) return;
          localStorage.setItem(CUSTOM_SKIN_KEY, JSON.stringify(state._pendingSkin));
          startNewCampaign(state.profile);
          saveProfile(state.profile);
          window.location.reload();
        }
      });
    },
    'restore-default': () => {
      if (!confirm('Leave this world? Its archive stays behind; your body and log travel.')) return;
      localStorage.removeItem(CUSTOM_SKIN_KEY);
      startNewCampaign(state.profile);
      saveProfile(state.profile);
      window.location.reload();
    }
  });
}

// ── Assessment ───────────────────────────────────────────────────────────────

function startAssess() {
  state.assessRun = createAssessmentRun(TREE);
  nav('assess');
}

// ── Intake v2 (D44): 4-5 adaptive probes, then the grade ─────────────────────
function renderAssess() {
  const run = state.assessRun;
  if (isAssessmentComplete(run)) { renderGradeReveal(run); return; }
  const probe = currentProbe(run, TREE);
  const tier = getTier(TREE, probe.tier);
  const voice = (SKIN.intakeVoice || {})[run.current] || (SKIN.intakeVoice || {})[tier.hookSlot];
  const isCount = probe.kind === 'count';
  root().innerHTML = `
    <header class="gw-header"><h1>INTAKE</h1>
      <div class="gw-dim">probe ${run.results.length + 1} · at most 5 · rest as long as you like between tests</div></header>
    <main class="gw-panel gw-center">
      <div class="gw-dim">${esc(TREE.branches[tier.branch].name)} corridor · ${esc(flavorName(tier))}</div>
      <h2 class="gw-test-name">${esc(tier.name)}</h2>
      <p class="gw-test-standard">${esc(probe.test)}</p>
      ${voice ? `<p class="gw-beat gw-intake-voice">${esc(voice)}</p>` : ''}
      <details class="gw-form"><summary>How to do it</summary>
        ${videoRefHtml(tier)}
        ${figuresHtml(tier)}
        <p>${esc(tier.setup)}</p>
        <ul class="gw-list">${tier.formStandard.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      </details>
      ${isCount ? `
        <div class="gw-stepper">
          <button class="gw-step" data-step="-1">−</button>
          <div class="gw-step-num" id="probe-count">0</div>
          <button class="gw-step" data-step="1">+</button>
          <div class="gw-step-unit">${esc(probe.unit || 'reps')}</div>
        </div>
        <button class="gw-primary gw-big" data-act="confirm">That’s my number</button>
      ` : `
        <button class="gw-primary gw-big" data-act="pass">Did it</button>
        <button class="gw-big" data-act="miss">Not yet — that’s the survey working</button>
      `}
    </main>`;
  root().querySelectorAll('[data-step]').forEach((el) => {
    el.addEventListener('click', () => {
      const num = document.getElementById('probe-count');
      num.textContent = String(Math.max(0, Number(num.textContent) + Number(el.getAttribute('data-step'))));
    });
  });
  wire({
    pass: () => { recordProbeResult(run, TREE, true); render(); },
    miss: () => { recordProbeResult(run, TREE, false); render(); },
    confirm: () => {
      const n = Number((document.getElementById('probe-count') || {}).textContent || 0);
      recordProbeResult(run, TREE, n);
      render();
    }
  });
}

// The grade reveal: classification as a paper artifact — the keeper's
// commission card, stamped. Periodization is posted as a duty cycle.
function renderGradeReveal(run) {
  state.profile = applyAssessment(state.profile, TREE, run);
  saveProfile(state.profile);
  const cls = state.profile.classification;
  const grade = (SKIN.grades || {})[cls] || { name: String(cls).toUpperCase(), line: '' };
  const waves = cls === 'intermediate' || cls === 'advanced';
  const active = state.profile.active[TREE.id];
  root().innerHTML = `
    <header class="gw-header"><h1>INTAKE COMPLETE</h1></header>
    <main class="gw-panel">
      <p class="gw-dim">${esc(SKIN.sessionFrame.assessment.outro)}</p>
      <div class="gw-document gw-grade">
        <div class="gw-doc-type">KEEPER GRADE ASSESSMENT · ${run.results.length} PROBE${run.results.length === 1 ? '' : 'S'} ON RECORD</div>
        <div class="gw-grade-stamp">${esc(grade.name)}</div>
        <div class="gw-order-rows">
          ${Object.entries(active).map(([branch, tierId]) => {
            const tier = getTier(TREE, tierId);
            return `<div class="gw-order-row"><span>${esc(TREE.branches[branch].name.toUpperCase())}</span><span>${esc(flavorName(tier))} <span class="gw-dim">(${esc(tier.name)})</span></span></div>`;
          }).join('')}
          <div class="gw-order-row"><span>DUTY CYCLE</span><span>${waves
            ? 'Heavy and light days alternate. The doors grade heavy days — and ask for two.'
            : 'Linear. Every charged session counts toward the doors.'}</span></div>
        </div>
        ${grade.line ? `<div class="gw-doc-hook">${esc(grade.line)}</div>` : ''}
      </div>
      <div class="gw-callout">
        <p>${esc(SKIN.sessionFrame.intention.prompt)}</p>
        <label class="gw-dim">${esc(SKIN.sessionFrame.intention.afterLabel)}</label>
        <input id="int-after" class="gw-text" placeholder="${esc(SKIN.sessionFrame.intention.afterPlaceholder)}" maxlength="60">
        <label class="gw-dim">${esc(SKIN.sessionFrame.intention.whereLabel)}</label>
        <input id="int-where" class="gw-text" placeholder="${esc(SKIN.sessionFrame.intention.wherePlaceholder)}" maxlength="60">
      </div>
      <button class="gw-primary gw-big" data-act="home">To the Station</button>
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
  state.keystoneReveals = [];
  state.liveBeat = 0;
  state.liveChoiceResult = null;
  state.sessionState = { isDeload: state.session.isDeload, bonusRoomOffered: false };
  state.sessionStep = { phase: 'brief', roomIndex: 0 };
  state._aarFiled = null;
  acquireWakeLock();
  nav('session');
}

function renderSession() {
  const phases = {
    brief: renderBrief, live: renderLiveEvent, prep: renderPrep, warmup: renderWarmup,
    door: renderDoor, room: renderRoom,
    'boss-approach': renderBossApproach, boss: renderBossAttempt, debrief: renderDebrief
  };
  phases[state.sessionStep.phase](state.session);
}

// First matching pool wins; the line cycles on a deterministic seed (never
// the session rng — a re-render must not advance the dice stream).
function pickBriefLine(pools, ctx, seed) {
  for (const pool of pools || []) {
    const w = pool.when || {};
    if (w.firstSession && !ctx.firstSession) continue;
    if (w.learnMode && !ctx.learnMode) continue;
    if (w.bossDay && !ctx.bossDay) continue;
    if (w.postBossFail && !ctx.postBossFail) continue;
    return pool.lines[seed % pool.lines.length];
  }
  return null;
}

function renderBrief(s) {
  const brief = SKIN.sessionFrame.brief || {};
  const focusTier = s.focusTierId ? getTier(TREE, s.focusTierId) : null;
  const vars = {
    orderNumber: s.dayNumber,
    wingName: SKIN.map.wings[TREE.id] || TREE.name,
    sectorName: focusTier ? flavorName(focusTier) : TREE.name,
    roomCount: s.rooms.length,
    gateLabel: s.boss ? s.boss.definition.label : ''
  };
  const ctx = {
    firstSession: state.profile.history.length === 0,
    learnMode: s.learnMode,
    bossDay: !!s.boss,
    postBossFail: state.profile.history.some((h) => h.boss && !h.boss.passed && h.focusTierId === s.focusTierId)
  };
  const scene = pickBriefLine(brief.sceneLines, ctx, s.dayNumber);
  const voice = pickBriefLine(brief.riggingLines, ctx, s.dayNumber);
  const order = brief.order;
  // Episode framing (D40): the week is a titled chapter; RIGGING may
  // editorialize against the posted order (two authorities, pure texture).
  const episode = episodeFor(SKIN, s.week);
  const editorial = editorialFor(SKIN, s.week);
  root().innerHTML = `
    <header class="gw-header"><h1>${esc(brief.title || 'WORK ORDER')}</h1>
      ${episode ? `<div class="gw-dim gw-episode">WEEK ${Math.min(s.week, SEASON_WEEKS)} OF ${SEASON_WEEKS} — ${esc(episode.title)}</div>` : ''}</header>
    <main class="gw-panel">
      ${scene ? `<p class="gw-script">${esc(fill(scene, vars))}</p>` : ''}
      <div class="gw-document gw-workorder">
        ${order && order.sub ? `<div class="gw-doc-type">${esc(fill(order.sub, vars))}</div>` : ''}
        <div class="gw-doc-title">${esc(order ? fill(order.heading, vars) : 'WORK ORDER №' + s.dayNumber)}</div>
        <div class="gw-order-rows">
          ${episode ? `<div class="gw-order-row"><span>EPISODE</span><span>${esc(episode.title)}${episode.line ? ' — ' + esc(episode.line) : ''}</span></div>` : ''}
          ${(order ? order.rows : [['ROUTE', '{{sectorName}}'], ['ROOMS', '{{roomCount}}']]).map(([k, v]) =>
            `<div class="gw-order-row"><span>${esc(k)}</span><span>${esc(fill(v, vars))}</span></div>`).join('')}
          ${s.isDeload ? `<div class="gw-order-row"><span>NOTE</span><span>Light week, posted on purpose. Volume reduced; the standard is unchanged.</span></div>`
            : s.intensity === 'light' && s.chargesNeeded > 1 ? `<div class="gw-order-row"><span>CYCLE</span><span>Light day — work inside the window. The doors grade heavy days.</span></div>`
            : s.chargesNeeded > 1 ? `<div class="gw-order-row"><span>CYCLE</span><span>Heavy day — the door is watching. Charges held: ${s.charges}/${s.chargesNeeded}.</span></div>` : ''}
          ${s.boss && order && order.gateRow ? `<div class="gw-order-row gw-order-gate"><span>${esc(order.gateRow[0])}</span><span>${esc(fill(order.gateRow[1], vars))}</span></div>` : ''}
        </div>
        ${order && order.foot ? `<div class="gw-doc-hook">${esc(order.foot)}</div>` : ''}
      </div>
      ${(() => {
        // RIGGING speaks ONCE per brief: a week editorial outranks the deload
        // beat outranks the regular line. Never stack voice blocks.
        const line = editorial || (s.isDeload && SKIN.sessionFrame.deloadBeats ? SKIN.sessionFrame.deloadBeats[0] : null) || voice;
        return line ? `<p class="gw-beat">${esc(fill(line, vars))}</p>` : '';
      })()}
      ${state.profile.history.length === 6 ? `<div class="gw-callout">${esc(SKIN.sessionFrame.troughForecast)}</div>` : ''}
      <button class="gw-primary gw-big" data-act="go">Begin</button>
      <button data-act="abort">Back</button>
    </main>`;
  wire({
    go: () => { state.sessionStep = { phase: s.liveEvent ? 'live' : 'prep', roomIndex: 0 }; render(); },
    abort: () => { releaseWakeLock(); nav('home'); }
  });
}

// ── Band 7 live event (Sprint 2.2) ───────────────────────────────────────────
// The one scripted present-tense scene: beats deal one at a time, then the
// choice, then the filed document — entry 215, in the player's hand. Fires
// once ever; everything else in the archive HAPPENED months ago. This happens
// now.
function renderLiveEvent(s) {
  const ev = s.liveEvent;
  if (!ev) { state.sessionStep = { phase: 'prep', roomIndex: 0 }; render(); return; }
  const beats = ev.beats || [];
  const atChoice = state.liveBeat >= beats.length;
  const chosen = state.liveChoiceResult;
  root().innerHTML = `
    <header class="gw-header"><h1>${esc(ev.title)}</h1>
      <div class="gw-dim gw-live-dim">LIVE · NOW · NOT A RECORDING</div></header>
    <main class="gw-panel gw-live">
      ${beats.slice(0, Math.min(state.liveBeat + 1, beats.length)).map((b) => `<p class="gw-script">${esc(b)}</p>`).join('')}
      ${atChoice && !chosen ? `
        <p class="gw-beat">${esc(ev.voiceLine || '')}</p>
        <p class="gw-bigcue">${esc(ev.choice.prompt)}</p>
        ${ev.choice.options.map((o, i) => `
          <button class="gw-door" data-live-choice="${i}"><div class="gw-door-name">${esc(o.label)}</div></button>`).join('')}
      ` : atChoice && chosen ? `
        <p class="gw-script">${esc(chosen.result)}</p>
        <div class="gw-document">
          <div class="gw-doc-type">${esc(chosen.doc.documentType.toUpperCase())} · ARCHIVE ${esc(chosen.doc.id)}</div>
          <div class="gw-doc-title">${esc(chosen.doc.title)}</div>
          <p class="gw-doc-body">${esc(chosen.doc.body)}${chosen.closing ? '\n\n' + esc(chosen.closing) : ''}</p>
          <div class="gw-doc-hook">${esc(chosen.doc.hook)}</div>
        </div>
        <button class="gw-primary gw-big" data-act="live-done">Back to the work order</button>
      ` : `
        <button class="gw-primary gw-big" data-act="live-next">…</button>
      `}
    </main>`;
  wire({
    'live-next': () => { state.liveBeat += 1; render(); },
    'live-done': () => { state.sessionStep = { phase: 'prep', roomIndex: 0 }; render(); }
  });
  root().querySelectorAll('[data-live-choice]').forEach((el) => {
    el.addEventListener('click', () => {
      const option = ev.choice.options[Number(el.getAttribute('data-live-choice'))];
      const doc = fileLiveEvent(state.profile, ev, option.id);
      state.profile.lastHook = doc && doc.hook ? doc.hook : state.profile.lastHook;
      saveProfile(state.profile);
      state.liveChoiceResult = {
        result: option.result,
        doc,
        closing: doc && doc.closings ? doc.closings[option.id] : null
      };
      render();
    });
  });
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
    ${hudHtml(s, idx)}
    <header class="gw-header"><h1>PICK THE ROUTE</h1>
      <div class="gw-dim">${esc(flavorName(room.tier))} sector · the set is the same behind either door</div></header>
    <main class="gw-panel">
      <p class="gw-bigcue">Two doors.</p>
      <div class="gw-doors">
      ${doors.map((d, i) => {
        // Strand layer: a revisited room carries Eight's trace — the wing was
        // played before you, and the other player's litter helps.
        const seen = ((state.profile.explored || {})[room.tier.branch] || []).includes(d.id);
        const trace = seen ? (SKIN.traces || {})[d.id] : null;
        return `
        <button class="gw-door ${d.roomType ? 'gw-door-rt' : ''}" data-door="${i}">
          <div class="gw-door-name">${esc(d.name)}</div>
          <div class="gw-door-bias ${d.roomType ? 'gw-door-special' : ''}">${esc(d.roomType ? ((SKIN.roomTypeLabels || {})[d.roomType] || d.roomType.toUpperCase()) : seen ? 'WALKED BEFORE' : BIAS_LABEL[d.bias] || '')}</div>
          <div class="gw-door-desc">${esc(d.desc)}</div>
          ${trace ? `<div class="gw-door-trace">${esc(trace)}</div>` : ''}
        </button>`;
      }).join('')}
      </div>
    </main>`;
  root().querySelectorAll('[data-door]').forEach((el) => {
    el.addEventListener('click', () => {
      state.doorPicks[idx] = doors[Number(el.getAttribute('data-door'))];
      state.sessionStep = { phase: 'room', roomIndex: idx };
      render();
    });
  });
}

function hudHtml(s, idx) {
  return `<div class="gw-hudwrap">
    <div class="gw-hud">
      <span>ORDER №${s.dayNumber}</span>
      <span>ROOM ${Math.min(idx + 1, s.rooms.length)}/${s.rooms.length}${s.boss ? ' +GATE' : ''}</span>
      <span class="gw-hud-stat">${esc(TREE.name.toUpperCase())} ${treeStat()}%</span>
    </div>
    ${routeStripHtml(s, idx)}
  </div>`;
}

// Today's route as an instrument (author feedback round 3): one cell per
// room, colored by corridor, filled as cleared, the current cell pulsing,
// the sealed gate at the end of the line on boss days. ROOM n/m, spatially.
function routeStripHtml(s, atIndex) {
  const cells = s.rooms.map((room, i) => {
    const cleared = !!state.resolutions[i];
    const current = i === atIndex && atIndex < s.rooms.length;
    return `<span class="gw-route-cell gw-rc-${esc(room.tier.branch)}${cleared ? ' gw-rc-cleared' : ''}${current ? ' gw-rc-current' : ''}"></span>`;
  }).join('<span class="gw-route-seg"></span>');
  const atGate = atIndex >= s.rooms.length && !!s.boss;
  const gate = s.boss
    ? `<span class="gw-route-seg"></span><span class="gw-route-gate${atGate ? ' gw-rc-current' : ''}">✕</span>`
    : '';
  const here = atGate
    ? 'the sealed door'
    : state.doorPicks[atIndex]
      ? state.doorPicks[atIndex].name
      : s.rooms[atIndex] ? flavorName(s.rooms[atIndex].tier) : '';
  return `<div class="gw-route" role="img" aria-label="today's route, room ${Math.min(atIndex + 1, s.rooms.length)} of ${s.rooms.length}">
      <span class="gw-route-entry"></span><span class="gw-route-seg"></span>${cells}${gate}
    </div>
    ${here ? `<div class="gw-route-here">▸ ${esc(here)}</div>` : ''}`;
}

function renderRoom(s) {
  const idx = state.sessionStep.roomIndex;
  const room = s.rooms[idx];
  if (!room) { state.sessionStep = { phase: s.boss ? 'boss-approach' : 'debrief' }; render(); return; }
  const door = state.doorPicks[idx] || null;
  // Bare roomKey — the engine's unlockHit/computeDoorCharge read the same
  // keys (the old '#'+idx suffix silently broke boss auto-eligibility).
  const key = roomKey(room);
  const result = state.setResults[key];
  let entry = state.resolutions[idx];
  // Special rooms (Sprint 2.4): the chosen door's room type replaces the dice
  // ceremony with its deterministic payout. Resolves once, on first render
  // after the set is logged. The rest timer runs as prescribed.
  if (door && door.roomType && result && !entry) {
    const special = resolveSpecialRoom(SKIN, state.profile, state.rng, door);
    markExplored(state.profile, room.tier.branch, door.id, room.tier.id);
    saveProfile(state.profile);
    entry = state.resolutions[idx] = {
      kind: 'special', specialType: door.roomType, special,
      outcome: result.outcome, branch: room.tier.branch, roomIndex: idx,
      roll: null, rolls: [], row: null, award: null, door
    };
  }
  const tier = room.tier;
  const target = tier.scheme.kind === 'reps' ? tier.scheme.repWindow : tier.scheme.holdWindow;
  const unit = tier.scheme.kind === 'reps' ? 'reps' : 'sec';
  const phase = !result ? (state._logging === key ? 'log' : 'set') : !entry ? 'roll' : 'rest';

  root().innerHTML = `
    ${hudHtml(s, idx)}
    <header class="gw-header">
      <h1>${esc(door ? door.name : flavorName(tier))}</h1>
      <div class="gw-dim" id="prescription">${esc(tier.name)} · set ${room.setNumber} · ${target[0]}–${target[1]} ${unit}${s.intensity === 'light' && s.chargesNeeded > 1 ? ' · light day' : ''}</div>
    </header>
    <main class="gw-panel gw-center">
      ${phase === 'set' ? `
        ${room.learnCue ? `<div class="gw-callout">This set, one thing: <strong>${esc(room.learnCue)}</strong></div>${videoRefHtml(tier)}${figuresHtml(tier)}` : `
        <details class="gw-form"><summary>Form standard</summary>
          ${videoRefHtml(tier)}
          ${figuresHtml(tier)}
          <ul class="gw-list">${tier.formStandard.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></details>`}
        <p class="gw-bigcue">Do the set.</p>
        <p class="gw-dim">Aim for ${target[1]} ${unit}. The room resolves while you rest.</p>
        <button class="gw-primary gw-big" data-act="log">Set done</button>
      ` : phase === 'log' ? `
        <p class="gw-bigcue">How did it go?</p>
        <div class="gw-stepper">
          <button class="gw-step" data-step="-1">−</button>
          <div class="gw-step-num" id="amount">${target[1]}</div>
          <button class="gw-step" data-step="1">+</button>
          <div class="gw-step-unit">${unit}</div>
        </div>
        <button class="gw-primary gw-big" data-act="hit">Hit — clean form</button>
        <div class="gw-row gw-even">
          <button data-act="partial">Partial</button>
          <button data-act="missed">Missed</button>
        </div>
      ` : phase === 'roll' ? `
        <div id="dice-stage" class="gw-dice-stage"><div class="gw-die" id="die">--</div></div>
        <p class="gw-dim">${esc(TREE.name)} ${treeStat()}% · ${result.outcome === 'hit' ? 'advantage' : result.outcome === 'partial' ? 'flat' : 'disadvantage'}</p>
        <button class="gw-primary gw-big" data-act="roll">Roll d100</button>
      ` : state.encounterPending && state.encounterPending.roomIndex === idx ? `
        ${renderEncounterHtml(state.encounterPending.encounter)}
      ` : `
        ${entry.kind === 'special' ? renderSpecialHtml(entry) : renderResolutionHtml(entry, idx)}
        ${renderTimerHtml(room.restSeconds)}
        <details class="gw-form"><summary>+ field note</summary>
          <div class="gw-note-row"><input id="field-note" class="gw-text" placeholder="one line" maxlength="120"></div>
        </details>
        <button class="gw-primary gw-big" data-act="next">${idx + 1 < s.rooms.length ? 'Next room' : s.boss ? 'To the sealed door' : 'File the AAR'}</button>
      `}
    </main>`;

  root().querySelectorAll('[data-step]').forEach((el) => {
    el.addEventListener('click', () => {
      const num = document.getElementById('amount');
      num.textContent = String(Math.max(0, Number(num.textContent) + Number(el.getAttribute('data-step'))));
    });
  });
  wire({
    log: () => { state._logging = key; render(); },
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
      state._logging = null;
      state.sessionStep = { phase: 'door', roomIndex: idx + 1 };
      render();
    }
  });
  root().querySelectorAll('[data-enc-choice]').forEach((el) => {
    el.addEventListener('click', () => resolveEncounter(idx, Number(el.getAttribute('data-enc-choice'))));
  });
  if (phase === 'rest') startTimer(room.restSeconds);
}

function logSet(key, outcome) {
  const amount = Number((document.getElementById('amount') || {}).textContent || 0);
  state.setResults[key] = { outcome, amount };
  state._logging = null;
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
    if (door) markExplored(state.profile, room.tier.branch, door.id, room.tier.id);
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
    postBossFail: state.profile.history.some((h) => h.boss && !h.boss.passed && h.focusTierId === state.session.focusTierId),
    // Arc context (Sprint 2.2): RIGGING remembers accumulated history.
    doorsOpened: doorsOpenedCount(state.profile),
    months: monthsOnStation(state.profile)
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
    if (w.doorsOpenedAtLeast && ctx.doorsOpened < w.doorsOpenedAtLeast) continue;
    if (w.monthsAtLeast && ctx.months < w.monthsAtLeast) continue;
    // rollUnder keeps a beat occasional without rng: the resolved roll is
    // already seeded, so the same session replays identically.
    if (w.rollUnder && entry.roll % 100 >= w.rollUnder) continue;
    return fill(beat.lines[entry.roll % beat.lines.length], ctx);
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

// Shared document/item cards (rolls, echoes, keystones, encounters).
function documentHtml(f, extraClass) {
  return `
    <div class="gw-document${extraClass ? ' ' + extraClass : ''}">
      <div class="gw-doc-type">${esc((f.documentType || 'document').toUpperCase())} · ARCHIVE ${esc(f.id)}</div>
      <div class="gw-doc-title">${esc(f.title)}</div>
      <p class="gw-doc-body">${esc(f.body)}</p>
      <div class="gw-doc-hook">${esc(f.hook)}</div>
    </div>`;
}
function kitHtml(k) {
  return `
    <div class="gw-item">
      <div class="gw-item-kind">${esc(k.kind.toUpperCase())} RECOVERED</div>
      <div class="gw-item-name">${esc(k.name)}</div>
      <p>${esc(k.body)}</p>
      ${k.kind === 'key' ? `<div class="gw-doc-hook">A route on the map just got shorter.</div>` : ''}
    </div>`;
}

function renderResolutionHtml(entry, idx) {
  const beat = stateAwareBeat(entry);
  const award = entry.award;
  let awardHtml = '';
  if (award.type === 'fragment') {
    awardHtml = documentHtml(award.fragment);
  } else if (award.type === 'kit') {
    awardHtml = kitHtml(award.item);
  } else if (award.type === 'shortcut') {
    awardHtml = `<div class="gw-item"><div class="gw-item-kind">SHORTCUT</div><p>${esc(award.text)}</p></div>`;
  } else if (award.type === 'xp') {
    // XP is invisible (Sprint 2.6): the row's flavor stands as a margin tick;
    // tiers, the stat, and the archive are the visible economy.
    awardHtml = `<div class="gw-item"><div class="gw-item-kind">MARGIN TICK</div><p>${esc(award.text)}</p></div>`;
  } else if (award.type === 'bonus-room') {
    awardHtml = `<div class="gw-callout">${esc(award.text)} <span class="gw-dim">(optional — one extra easy set of warm-up tier; skip freely)</span></div>`;
  } else if (award.type === 'story' || award.type === 'intel-exhausted' || award.type === 'loot-exhausted') {
    awardHtml = `<p class="gw-script">${esc(award.text || entry.row.text)}</p>`;
  }
  const encHtml = entry.encounterResult ? `
    <p class="gw-script">${esc(entry.encounterResult.text)}</p>
    ${entry.encounterResult.extraFragment ? documentHtml(entry.encounterResult.extraFragment) : ''}` : '';
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

// Special-room ceremonies (Sprint 2.4): no dice — the room IS the payout.
function renderSpecialHtml(entry) {
  const sp = entry.special;
  const label = (SKIN.roomTypeLabels || {})[entry.specialType] || String(entry.specialType).toUpperCase();
  let body = '';
  if (sp.type === 'quiet') {
    body = `<p class="gw-script">${esc(sp.text)}</p>`;
  } else if (sp.type === 'cache-locked') {
    body = `<p class="gw-script">${esc(sp.cache.locked)}</p>
      <div class="gw-item"><div class="gw-item-kind">STILL SEALED</div>
        <div class="gw-item-name">${esc(sp.cache.name)}</div>
        <p>Needs: ${esc(sp.neededName)}. The cache stays in the wing — salvage doors carry the keys.</p></div>`;
  } else if (sp.type === 'cache-open') {
    const awardHtml = sp.award.type === 'kit' ? kitHtml(sp.award.item)
      : sp.award.type === 'fragment' ? documentHtml(sp.award.fragment)
        : `<p class="gw-script">${esc(sp.award.text || '')}</p>`;
    body = `<p class="gw-script">${esc(sp.cache.open)}</p>${awardHtml}`;
  } else if (sp.type === 'echo') {
    body = `<p class="gw-script">${esc(sp.frame)}</p>${documentHtml(sp.fragment, 'gw-echo')}`;
  }
  return `
    <div class="gw-resolution gw-res-special gw-res-sp-${esc(sp.type)}">
      <div class="gw-kind">${esc(label)}</div>
      ${body}
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
    ${hudHtml(s, s.rooms.length)}
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
  // Aftermath. A midpoint recontextualization keystone REPLACES the generic
  // pass-reveal line; document keystones deal as cards after the map reveal.
  const doorTier = getTier(TREE, boss.definition.tier) || boss.tier;
  const recontext = res.passed ? (state.keystoneReveals || []).find((k) => k.presentation === 'recontext') : null;
  const docKeystones = res.passed ? (state.keystoneReveals || []).filter((k) => k.presentation !== 'recontext') : [];
  const reveal = res.passed
    ? (recontext ? recontext.body : fill(SKIN.bossCeremony.passReveal, { sectorName: flavorName(doorTier) }))
    : SKIN.bossCeremony.failReveal;
  root().innerHTML = `
    <header class="gw-header"><h1>${res.passed ? 'THE DOOR OPENS' : 'THE DOOR HOLDS'}</h1></header>
    <main class="gw-panel">
      <div class="gw-resolution gw-res-${res.passed ? 'crit' : 'fail'}">
        <p class="gw-script">${esc(reveal)}</p>
        ${recontext ? `<p class="gw-beat">${esc(recontext.hook)}</p>` : ''}
        <div class="gw-roll">${String(res.roll).padStart(2, '0')}</div>
        <div class="gw-kind">${res.passed ? 'AFTERMATH' : 'RECONNAISSANCE'}</div>
        <p class="gw-script">${esc(res.row.text)}</p>
      </div>
      ${res.passed ? `
        <div class="gw-map-reveal">
          <div class="gw-item-kind">SECTOR OPENED</div>
          <div class="gw-item-name">${esc(flavorName(doorTier))}</div>
          <p class="gw-dim">${esc(doorTier.name)} — ${esc(schemeText(doorTier.scheme))}. The map has redrawn itself.</p>
        </div>
        ${docKeystones.map((k) => `
        <div class="gw-document gw-keystone">
          <div class="gw-doc-type">KEYSTONE · ${esc((k.documentType || 'document').toUpperCase())} · ARCHIVE ${esc(k.id)}</div>
          <div class="gw-doc-title">${esc(k.title)}</div>
          <p class="gw-doc-body">${esc(k.body)}</p>
          <div class="gw-doc-hook">${esc(k.hook)}</div>
        </div>`).join('')}` : state.intelDrop ? `
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
    // Keystone gating (Sprint 2.2): authored reveals fire on the ceremony
    // rail. History files at debrief, so the count includes this pass.
    const nextTier = getTier(TREE, s.boss.definition.tier);
    state.keystoneReveals = dueKeystonesForBossPass(SKIN, state.profile, {
      doorsOpened: doorsOpenedCount(state.profile) + 1,
      openedHookSlot: nextTier ? nextTier.hookSlot : null
    });
    for (const ks of state.keystoneReveals) fileKeystone(state.profile, ks);
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
    // Door charge (Sprint 2.3): latest focus evidence drives the gate meter.
    // Light days don't grade the door (D44) — the last heavy reading stands.
    if (s.focusTierId && !(s.intensity === 'light' && s.chargesNeeded > 1)) {
      state.profile.doorCharge = state.profile.doorCharge || {};
      state.profile.doorCharge[s.focusTierId] = aar.unlockHit ? 1 : computeDoorCharge(s, state.setResults);
    }
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
    <main class="gw-panel gw-center">
      <p class="gw-script">${esc(debrief)}</p>
      ${aar.unlockHit ? `<div class="gw-callout"><strong>The sealed door is eligible next session.</strong></div>` : ''}
      ${s.learnMode ? `<div class="gw-callout">${esc(SKIN.sessionFrame.tutorial.aarPrompt)}</div>` : ''}
      <div class="gw-note-row">
        <label class="gw-dim">Minutes you lost track of time:</label>
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
    // Finale (D40): the first AAR filed in week 8+ closes out into the
    // transmit choice instead of the home screen — the season's last scene.
    if (s.finaleArmed && !s.stormProtocol) {
      state.liveBeat = 0;
      state.liveChoiceResult = null;
      nav('finale');
      return;
    }
    nav('home');
  } });
}

// ── Season finale (D40): the choice Eight left ───────────────────────────────
// Beats deal one at a time; the transmit option is gated on REAL wing-state
// (Mast Access cleared) — the ending you cannot pick yet is the metroidvania
// statement. Closing files the ending document and stamps the season.
function renderFinale() {
  const fin = SKIN.finale;
  // A just-chosen ending must still display (closeSeason stamps the profile
  // BEFORE the ending card renders) — only bounce when arriving already-closed.
  if (!fin || (state.profile.seasonClosedAt && !state.liveChoiceResult)) { nav('home'); return; }
  const beats = fin.beats || [];
  const atChoice = state.liveBeat >= beats.length;
  const chosen = state.liveChoiceResult;
  const ready = mastReady(state.profile, TREE.id);
  root().innerHTML = `
    <header class="gw-header"><h1>${esc(fin.title)}</h1>
      <div class="gw-dim gw-episode">WEEK ${SEASON_WEEKS} OF ${SEASON_WEEKS} — THE COMMISSION ENDS TONIGHT</div></header>
    <main class="gw-panel gw-live">
      ${beats.slice(0, Math.min(state.liveBeat + 1, beats.length)).map((b) => `<p class="gw-script">${esc(b)}</p>`).join('')}
      ${atChoice && !chosen ? `
        <p class="gw-bigcue">${esc(fin.choice.prompt)}</p>
        ${fin.choice.options.map((o, i) => {
          const locked = o.requiresMast && !ready;
          return `
          <button class="gw-door ${locked ? 'gw-door-locked' : ''}" data-fin-choice="${i}" ${locked ? 'disabled' : ''}>
            <div class="gw-door-name">${locked ? '🔒 ' : ''}${esc(o.label)}</div>
            ${locked ? `<div class="gw-door-desc">${esc(o.lockedHint || '')}</div>` : ''}
          </button>`;
        }).join('')}
      ` : atChoice && chosen ? `
        ${documentHtml(chosen.ending, 'gw-keystone')}
        <p class="gw-beat">${esc(fin.closing)}</p>
        <button class="gw-primary gw-big" data-act="fin-done">Close the season</button>
      ` : `
        <button class="gw-primary gw-big" data-act="fin-next">…</button>
      `}
    </main>`;
  wire({
    'fin-next': () => { state.liveBeat += 1; render(); },
    'fin-done': () => { state.liveChoiceResult = null; nav('home'); }
  });
  root().querySelectorAll('[data-fin-choice]').forEach((el) => {
    el.addEventListener('click', () => {
      const option = fin.choice.options[Number(el.getAttribute('data-fin-choice'))];
      if (option.requiresMast && !ready) return;
      const ending = closeSeason(state.profile, fin, option.id);
      if (!ending) return;
      state.profile.lastHook = ending.hook;
      saveProfile(state.profile);
      bossSting(muted(), true);
      state.liveChoiceResult = { ending };
      render();
    });
  });
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
  const dispatchEpisode = episodeFor(SKIN, seasonState(SKIN, state.profile).week);
  root().innerHTML = `
    <header class="gw-header"><h1>${esc(SKIN.sessionFrame.dispatch.title)}</h1>
      ${dispatchEpisode ? `<div class="gw-dim gw-episode">closing the episode — ${esc(dispatchEpisode.title)}</div>` : ''}</header>
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

// ── Archive-as-desk (Sprint 2.5) / Log / Settings ────────────────────────────
// Eight's desk: documents are paper piles you leaf through, not a details
// list. One pile per chain, kit and field notes as objects on the desk.

const CHAIN_NAMES = { log: 'STATION LOG', personal: 'PERSONAL EFFECTS', technical: 'TECHNICAL FILES', signal: 'BAND 7', keystone: 'KEYSTONE FILE' };
const CHAIN_UI_ORDER = ['log', 'personal', 'technical', 'signal', 'keystone'];

// All document sources in canonical order (so piles leaf in story order
// regardless of found order), filtered to what the player holds.
function allDocSources() {
  const liveDoc = SKIN.liveEvent && SKIN.liveEvent.document;
  return [...SKIN.fragments, ...(SKIN.keystones || []), ...(liveDoc ? [liveDoc] : [])];
}
function ownedDocs(chain) {
  const owned = state.profile.archive || [];
  const meta = new Map(owned.map((a) => [a.id, a]));
  return allDocSources()
    .filter((d) => (d.chain || 'keystone') === chain && meta.has(d.id))
    .map((d) => ({ ...d, liveChoice: (meta.get(d.id) || {}).liveChoice || null }));
}
function chainTotal(chain) {
  return allDocSources().filter((d) => (d.chain || 'keystone') === chain).length;
}

function renderArchive() {
  if (state.deskPile) { renderDeskPile(); return; }
  const p = state.profile;
  const totalOwned = (p.archive || []).length;
  const kitItems = (p.kit || []).map((k) => kitItemById(SKIN, k.id)).filter(Boolean);
  root().innerHTML = `
    <header class="gw-header"><h1>THE ARCHIVE</h1>
      <div class="gw-dim">Eight’s desk — ${totalOwned} documents on it · tap a pile, leaf the pages</div></header>
    <main class="gw-panel">
      <div class="gw-desk">
        ${CHAIN_UI_ORDER.map((chain) => {
          const docs = ownedDocs(chain);
          const total = chainTotal(chain);
          if (!total) return '';
          return docs.length ? `
            <button class="gw-pile" data-pile="${chain}">
              <div class="gw-pile-kind">${esc(CHAIN_NAMES[chain] || chain)}</div>
              <div class="gw-pile-count">${docs.length} of ${total} pages</div>
              <div class="gw-pile-top">${esc(docs[docs.length - 1].title)}</div>
            </button>` : `
            <div class="gw-pile gw-pile-empty">
              <div class="gw-pile-kind">${esc(CHAIN_NAMES[chain] || chain)}</div>
              <div class="gw-pile-count">no pages yet</div>
            </div>`;
        }).join('')}
        ${kitItems.length ? `
          <button class="gw-pile gw-pile-kit" data-pile="kit">
            <div class="gw-pile-kind">THE KIT</div>
            <div class="gw-pile-count">${kitItems.length} of ${SKIN.kitItems.length} recovered</div>
            <div class="gw-pile-top">${esc(kitItems[kitItems.length - 1].name)}</div>
          </button>` : `
          <div class="gw-pile gw-pile-empty"><div class="gw-pile-kind">THE KIT</div>
            <div class="gw-pile-count">salvage doors carry it</div></div>`}
        ${p.notes.length ? `
          <button class="gw-pile gw-pile-kit" data-pile="notes">
            <div class="gw-pile-kind">FIELD NOTES</div>
            <div class="gw-pile-count">${p.notes.length} line${p.notes.length === 1 ? '' : 's'}, your hand</div>
          </button>` : ''}
      </div>
      ${totalOwned ? '' : '<p class="gw-dim">No documents yet. The rooms hold them; the work recovers them.</p>'}
    </main>
    ${bottomNav('archive')}`;
  root().querySelectorAll('[data-pile]').forEach((el) => {
    el.addEventListener('click', () => {
      state.deskPile = el.getAttribute('data-pile');
      state.deskIndex = 0;
      render();
    });
  });
  wireNav();
}

function renderDeskPile() {
  const pile = state.deskPile;
  const back = `<button data-act="desk">Back to the desk</button>`;
  if (pile === 'kit') {
    const items = (state.profile.kit || []).map((k) => kitItemById(SKIN, k.id)).filter(Boolean);
    root().innerHTML = `
      <header class="gw-header"><h1>THE KIT</h1>
        <div class="gw-dim">${items.length} of ${SKIN.kitItems.length} recovered</div></header>
      <main class="gw-panel">
        ${items.map((k) => `
          <div class="gw-item">
            <div class="gw-item-kind">${esc(k.kind.toUpperCase())}${k.kind === 'key' ? ' · OPENS A ROUTE' : ''}</div>
            <div class="gw-item-name">${esc(k.name)}</div>
            <p>${esc(k.body)}</p>
          </div>`).join('')}
        ${back}
      </main>
      ${bottomNav('archive')}`;
  } else if (pile === 'notes') {
    root().innerHTML = `
      <header class="gw-header"><h1>FIELD NOTES</h1><div class="gw-dim">your hand</div></header>
      <main class="gw-panel">
        <ul class="gw-list">${state.profile.notes.slice(-30).map((n) => `<li><span class="gw-dim">${esc(n.room)}:</span> ${esc(n.text)}</li>`).join('')}</ul>
        ${back}
      </main>
      ${bottomNav('archive')}`;
  } else {
    const docs = ownedDocs(pile);
    if (!docs.length) { state.deskPile = null; render(); return; }
    state.deskIndex = Math.max(0, Math.min(state.deskIndex, docs.length - 1));
    const doc = docs[state.deskIndex];
    const body = doc.body + (doc.closings && doc.liveChoice && doc.closings[doc.liveChoice]
      ? '\n\n' + doc.closings[doc.liveChoice] : '');
    root().innerHTML = `
      <header class="gw-header"><h1>${esc(CHAIN_NAMES[pile] || pile)}</h1>
        <div class="gw-dim">page ${state.deskIndex + 1} of ${docs.length} · tap the page to leaf</div></header>
      <main class="gw-panel gw-reader">
        <div class="gw-stack">${documentHtml({ ...doc, body }, doc.keystone || pile === 'keystone' ? 'gw-keystone' : '')}</div>
        <div class="gw-leaf-row">
          <button data-act="prev" ${state.deskIndex === 0 ? 'disabled' : ''}>‹ prev</button>
          <span class="gw-dim">${state.deskIndex + 1} / ${docs.length}</span>
          <button data-act="next" ${state.deskIndex >= docs.length - 1 ? 'disabled' : ''}>next ›</button>
        </div>
        ${back}
      </main>
      ${bottomNav('archive')}`;
    const page = root().querySelector('.gw-stack .gw-document');
    if (page) page.addEventListener('click', () => {
      state.deskIndex = state.deskIndex + 1 < docs.length ? state.deskIndex + 1 : 0;
      render();
    });
    wire({
      prev: () => { state.deskIndex -= 1; render(); },
      next: () => { state.deskIndex += 1; render(); }
    });
  }
  wire({ desk: () => { state.deskPile = null; render(); } });
  wireNav();
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
    </main>
    ${bottomNav('more')}`;
  wireNav();
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
    </main>
    ${bottomNav('more')}`;
  root().querySelectorAll('[data-budget]').forEach((el) => {
    el.addEventListener('click', () => {
      state.profile.settings.sessionBudgetMinutes = Number(el.getAttribute('data-budget'));
      saveProfile(state.profile); render();
    });
  });
  wire({
    mute: () => { state.profile.settings.muted = !state.profile.settings.muted; saveProfile(state.profile); render(); }
  });
  wireNav();
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

const RING_R = 58;
const RING_C = 2 * Math.PI * RING_R;
function renderTimerHtml(seconds) {
  return `<div class="gw-timer" id="timer" data-total="${seconds}">
    <div class="gw-ring-wrap">
      <svg class="gw-ring" viewBox="0 0 132 132">
        <circle class="gw-ring-bg" cx="66" cy="66" r="${RING_R}"/>
        <circle class="gw-ring-fg" id="timer-ring" cx="66" cy="66" r="${RING_R}"
          stroke-dasharray="${RING_C}" stroke-dashoffset="0"/>
      </svg>
      <div class="gw-timer-num" id="timer-num">${fmtTime(seconds)}</div>
    </div>
    <div class="gw-dim">rest — read, decide, breathe</div>
  </div>`;
}

function startTimer(total) {
  stopTimer();
  let remaining = total;
  state.timer = { intervalId: setInterval(() => {
    remaining -= 1;
    const num = document.getElementById('timer-num');
    const ring = document.getElementById('timer-ring');
    if (!num || !ring) { stopTimer(); return; }
    num.textContent = fmtTime(Math.max(0, remaining));
    ring.style.strokeDashoffset = String(RING_C * (1 - Math.max(0, remaining) / total));
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
// Self-updating: when a deployed service worker takes control, reload to the
// new build — immediately on stateless screens, deferred to the next return
// home when a session is live (a mid-session reload would eat the run).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* dev */ });
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; } // first install: page is already current
    if (state.screen === 'home' || state.screen === 'more' || state.screen === 'archive') {
      window.location.reload();
    } else {
      state._pendingReload = true;
    }
  });
}
render();
