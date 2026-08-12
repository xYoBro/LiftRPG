// ── Pipeline checkpoint persistence ──────────────────────────────────────────
// Saves and restores per-stage pipeline state so an interrupted run resumes
// from the last completed stage instead of re-paying for API calls that already
// succeeded. Every function here exists to make "start the book over from zero"
// structurally impossible short of a deliberate clear.
//
// STORAGE. localStorage is the durable home. sessionStorage dies with the tab,
// which is exactly the failure this module exists to prevent: a browser crash
// mid-run orphaned every stage the user had already paid for. sessionStorage is
// kept as a live MIRROR rather than a fallback-only store, because consumers
// outside this module touch the raw key directly and must keep working:
//   - index.html #api-save-checkpoint   READS sessionStorage to build the
//     downloadable checkpoint file
//   - index.html #api-upload-checkpoint WRITES sessionStorage to seed a resume
//   - scripts/eval-bench.mjs            WRITES sessionStorage to seed a resume,
//     READS it back to carry a bench slot across runs
// Reads therefore prefer localStorage and fall back to sessionStorage, so an
// uploaded file, a bench seed, and any legacy in-flight checkpoint all still
// resume. The persisted object shape is unchanged, so previously downloaded
// checkpoint files remain readable.

import { CHECKPOINT_STORAGE_KEY } from './constants.js';

// One displaced checkpoint is parked here rather than destroyed when a run with
// a different run-identity fingerprint claims the active slot. There is only
// one active slot (the UI and the bench both address the bare key), so
// "ignore, do not delete" has to mean "move aside".
var SHELF_STORAGE_KEY = CHECKPOINT_STORAGE_KEY + '_shelved';

var FINGERPRINT_VERSION = 'v1';

// ── Notice channel ──────────────────────────────────────────────────────────
// Storage degradation and resume facts have to reach the operator, and this
// module has no UI. api-generator.js registers a sink that forwards to the
// pipeline's existing onProgress/log channel. Messages are deduped per sink
// registration because the UI log keeps only the last 8 lines.

var noticeSink = null;
var noticesSeen = {};

export function setCheckpointNotice(fn) {
  noticeSink = typeof fn === 'function' ? fn : null;
  noticesSeen = {};
}

function notice(level, message, opts) {
  var once = !opts || opts.once !== false;
  if (once) {
    if (noticesSeen[message]) return;
    noticesSeen[message] = true;
  }
  if (level === 'error') console.error('[LiftRPG] ' + message);
  else console.warn('[LiftRPG] ' + message);
  if (noticeSink) {
    try { noticeSink(level, message); } catch (_e) { /* never let the sink break a run */ }
  }
}

// ── Storage primitives ──────────────────────────────────────────────────────
// Every access is guarded: localStorage throws SecurityError outright in
// sandboxed iframes and in some private-browsing modes, and the pipeline must
// degrade rather than die.

function store(kind) {
  try {
    var s = kind === 'local' ? localStorage : sessionStorage;
    return s || null;
  } catch (_e) { return null; }
}

function readRaw(kind, key) {
  var s = store(kind);
  if (!s) return null;
  try { return s.getItem(key); } catch (_e) { return null; }
}

function writeRaw(kind, key, value) {
  var s = store(kind);
  if (!s) return false;
  try { s.setItem(key, value); return true; } catch (_e) { return false; }
}

function removeRaw(kind, key) {
  var s = store(kind);
  if (!s) return;
  try { s.removeItem(key); } catch (_e) { /* nothing to do */ }
}

function parse(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_e) { return null; }
}

// Durable write with graceful degradation. Checkpoints carry full booklet JSON,
// so QuotaExceededError is a live possibility on a long book; when the durable
// store refuses the write we fall back to the tab-scoped mirror and say so.
function persist(cp) {
  var json;
  try { json = JSON.stringify(cp); } catch (error) {
    notice('error', 'Progress could not be serialized for saving (' +
      ((error && error.message) || 'unknown error') + '). Use Save Progress to keep a copy.');
    return false;
  }

  var durable = writeRaw('local', CHECKPOINT_STORAGE_KEY, json);
  if (!durable) {
    // A stale durable entry would otherwise win on read and resume from FEWER
    // stages than we actually have — re-buying work. Drop it so reads fall
    // through to the fresh mirror.
    removeRaw('local', CHECKPOINT_STORAGE_KEY);
  }
  var mirrored = writeRaw('session', CHECKPOINT_STORAGE_KEY, json);

  if (durable) return true;
  if (mirrored) {
    notice('warn', 'Saved progress is too large for durable storage — it is being kept in this tab only. ' +
      'Do not close this tab, and use Save Progress to download a copy.');
    return true;
  }
  notice('error', 'Progress could not be saved. Completed stages will not be recoverable if this run stops. ' +
    'Use Save Progress to download a copy after each stage.');
  return false;
}

// ── Run-identity fingerprint ────────────────────────────────────────────────
//
// A stored checkpoint is only safe to resume into a run that would have issued
// the same prompts. Without this, a stale checkpoint from book X silently
// donates its skeleton, weeks and fragments to book Y — a correctness AND a
// money hazard, since the resulting hybrid is worthless and has to be re-bought.
//
// The fingerprint covers exactly the CONTENT inputs that shape prompts:
//   - workout (the program text, or the normalized workout object)
//   - brief   (the creative direction; genre/tone/setting all live in here —
//              the API settings object carries no creative fields)
//   - pipeline method (skeleton-flesh / multi-stage / structured — different
//              stage graphs and different prompt builders)
//
// DELIBERATE RULING (Wave A.1): provider, model, API base URL, API key,
// timeouts and retry policy are EXCLUDED. Resuming the same book on a different
// model or provider after failures is a legitimate, money-saving move — a run
// that keeps timing out on one model should be finishable on another without
// re-buying the stages already paid for. Model choice changes voice, not
// identity; the stages already on disk are the stages already on disk.
// Excluded knobs are recorded in `inputs` for display, never hashed.
//
// This is a cache key, not a security boundary: a synchronous non-cryptographic
// hash, because every caller in this module is synchronous and Web Crypto is
// not. Collisions cost a wrong resume; they are not an attack surface.
export function computeRunFingerprint(inputs) {
  inputs = inputs || {};
  var pipeline = String(inputs.pipeline || '');
  var workout = canonicalizeContent(inputs.workout);
  var brief = canonicalizeContent(inputs.brief);
  var payload = FINGERPRINT_VERSION +
    '\npipeline:' + pipeline +
    '\nworkout:' + workout.length + ':' + workout +
    '\nbrief:' + brief.length + ':' + brief;
  return hashString(payload);
}

// Workout arrives as a raw string on the paste path and as a normalized object
// on the wizard path. Both have to fingerprint stably, so objects are stringified
// with sorted keys.
function canonicalizeContent(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return String(value);
  try { return stableStringify(value); } catch (_e) { return String(value); }
}

// What gets STORED for display and for the UI to restore into the workout and
// brief fields. Strings pass through untouched; the wizard's normalized-workout
// object is stored as readable JSON rather than "[object Object]".
function displayInput(value) {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : canonicalizeContent(value);
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value === undefined ? null : value);
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  var keys = Object.keys(value).sort();
  var parts = [];
  for (var i = 0; i < keys.length; i++) {
    if (value[keys[i]] === undefined) continue;
    parts.push(JSON.stringify(keys[i]) + ':' + stableStringify(value[keys[i]]));
  }
  return '{' + parts.join(',') + '}';
}

// Two independent 32-bit accumulators over the same byte stream, concatenated —
// 64 bits of hex from arithmetic that stays exact in a double.
function hashString(str) {
  var h1 = 0x811c9dc5;
  var h2 = 0xc2b2ae35;
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
    h2 = (h2 ^ (h2 >>> 13)) >>> 0;
  }
  return hex8(h1) + hex8(h2);
}

function hex8(n) {
  return ('00000000' + (n >>> 0).toString(16)).slice(-8);
}

// ── Match adjudication ──────────────────────────────────────────────────────

export function stageCount(checkpoint) {
  if (!checkpoint || !checkpoint.stages || typeof checkpoint.stages !== 'object') return 0;
  return Object.keys(checkpoint.stages).length;
}

// Returns { match, reason, want, have }. Reasons:
//   'empty'       nothing worth resuming
//   'fingerprint' the stored fingerprint agrees (match) or disagrees (no match)
//   'legacy'      pre-fingerprint checkpoint — accepted on the pipeline tag
//   'pipeline'    legacy checkpoint from a different pipeline method
//
// Legacy checkpoints (no stored fingerprint) are ACCEPTED rather than discarded.
// They exist only until the first save of the current build stamps one, and
// throwing away paid work on a technicality is the exact failure mode this
// module is here to prevent. A checkpoint that HAS a fingerprint must match it.
export function describeCheckpointMatch(checkpoint, inputs) {
  var want = computeRunFingerprint(inputs);
  if (stageCount(checkpoint) === 0) return { match: false, reason: 'empty', want: want, have: '' };

  var have = String(checkpoint.runFingerprint || '');
  if (!have) {
    var storedPipeline = String((checkpoint.inputs && checkpoint.inputs.pipeline) || '');
    var wantPipeline = String((inputs && inputs.pipeline) || '');
    if (storedPipeline && wantPipeline && storedPipeline !== wantPipeline) {
      return { match: false, reason: 'pipeline', want: wantPipeline, have: storedPipeline };
    }
    return { match: true, reason: 'legacy', want: want, have: '' };
  }
  if (have !== want) return { match: false, reason: 'fingerprint', want: want, have: have };
  return { match: true, reason: 'fingerprint', want: want, have: have };
}

// ── Cross-session spend ledger ──────────────────────────────────────────────
// Money already spent on THIS book in EARLIER attempts. Kept as its own labeled
// figure and never merged into the live run meter: the UI meter accumulates only
// from per-stage telemetry, and restored stages emit no telemetry, so a resumed
// run correctly reports $0 for work it did not re-buy. This ledger answers the
// different question "what has this book cost me in total so far".

function zeroSpend() { return { calls: 0, usd: 0, tokens: 0 }; }

var sessionSpend = zeroSpend();

function addSpend(a, b) {
  return {
    calls: (a.calls || 0) + (b.calls || 0),
    usd: roundUsd((a.usd || 0) + (b.usd || 0)),
    tokens: (a.tokens || 0) + (b.tokens || 0)
  };
}

function roundUsd(n) {
  var v = Number(n);
  if (!isFinite(v)) return 0;
  return Math.round(v * 1e6) / 1e6;
}

function num(v) {
  var n = Number(v);
  return isFinite(n) ? n : 0;
}

// Called once per successful paid stage from runJsonStage — the single choke
// point every API call in every pipeline passes through, critic rounds included.
export function recordCheckpointSpend(telemetry) {
  if (!telemetry) return;
  var usage = telemetry.usage || {};
  sessionSpend = addSpend(sessionSpend, {
    calls: 1,
    usd: num(telemetry.estimatedCostUsd),
    tokens: num(usage.totalTokens)
  });
}

function stampSpend(cp) {
  var prior = (cp.spend && cp.spend.priorAttempts) || zeroSpend();
  cp.spend = {
    priorAttempts: prior,
    thisSession: {
      calls: sessionSpend.calls,
      usd: roundUsd(sessionSpend.usd),
      tokens: sessionSpend.tokens
    },
    note: 'priorAttempts is spend from earlier attempts at this same book. It is never added to the live run meter.'
  };
  return cp;
}

// What this booklet has cost ACROSS EVERY ATTEMPT that reached disk.
//
// getCheckpointSpend() below reports the LIVE module counter as `thisSession`,
// which is the right answer for a run in flight and the wrong one for the
// reader this function exists to serve: the operator who reloaded the page.
// A reload resets the module, so their live counter is zero while the money
// from the interrupted session is sitting in the stored checkpoint — that is
// exactly the "$0 spent" lie the resume surface used to tell.
//
// The figure returned here is priorAttempts + the STORED thisSession, which is
// precisely what resumeCheckpointForRun() will fold into priorAttempts when the
// resumed run opens. A surface that shows it before Build and the run meter's
// prior-spend chip after Build therefore report the same number: the total the
// operator watches can only go up.
//
// NOT for use during a live run. Mid-run the stored `thisSession` IS the live
// session, and the run meter is already showing that money — adding it to a
// "spent earlier" figure would count it twice.
export function getCheckpointSpendToDate(checkpoint) {
  var cp = checkpoint || loadCheckpoint();
  var spend = (cp && cp.spend) || null;
  var total = addSpend(
    (spend && spend.priorAttempts) || zeroSpend(),
    (spend && spend.thisSession) || zeroSpend()
  );
  return { calls: total.calls || 0, usd: roundUsd(total.usd), tokens: total.tokens || 0 };
}

// Read-only view for callers that want to report the ledger.
export function getCheckpointSpend(checkpoint) {
  var cp = checkpoint || loadCheckpoint();
  var prior = (cp && cp.spend && cp.spend.priorAttempts) || zeroSpend();
  return {
    priorAttempts: { calls: prior.calls || 0, usd: roundUsd(prior.usd), tokens: prior.tokens || 0 },
    thisSession: { calls: sessionSpend.calls, usd: roundUsd(sessionSpend.usd), tokens: sessionSpend.tokens }
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

export function loadCheckpoint() {
  var durable = parse(readRaw('local', CHECKPOINT_STORAGE_KEY));
  if (durable) return durable;
  // Legacy checkpoints, uploaded checkpoint files and bench seeds land in the
  // tab-scoped mirror; they are still real progress.
  return parse(readRaw('session', CHECKPOINT_STORAGE_KEY));
}

export function initCheckpoint(inputs) {
  inputs = inputs || {};
  var now = new Date().toISOString();
  sessionSpend = zeroSpend();
  var cp = {
    schema: 2,
    runFingerprint: computeRunFingerprint(inputs),
    inputs: {
      // Stored in FULL, deliberately: the UI restores these into the workout and
      // brief fields when a checkpoint file is uploaded, and a truncated copy
      // would both corrupt the resumed prompts and break fingerprint matching.
      // Next to full booklet JSON in `stages`, the input text is free.
      workout: displayInput(inputs.workout),
      brief: displayInput(inputs.brief),
      // Recorded for display only — deliberately NOT part of the fingerprint.
      model: inputs.model || '',
      provider: inputs.provider || '',
      pipeline: inputs.pipeline || ''
    },
    stages: {},
    createdAt: now,
    updatedAt: now
  };
  stampSpend(cp);
  persist(cp);
  return cp;
}

export function saveCheckpoint(stage, data, checkpoint) {
  var cp = checkpoint || loadCheckpoint() || { inputs: {}, stages: {} };
  if (!cp.stages || typeof cp.stages !== 'object') cp.stages = {};
  cp.stages[stage] = data;
  cp.updatedAt = new Date().toISOString();
  stampSpend(cp);
  persist(cp);
  return cp;
}

export function clearCheckpoint() {
  removeRaw('local', CHECKPOINT_STORAGE_KEY);
  removeRaw('session', CHECKPOINT_STORAGE_KEY);
  sessionSpend = zeroSpend();
}

export function countResumedStages(checkpoint) {
  return stageCount(checkpoint);
}

export function getCheckpoint() {
  return loadCheckpoint();
}

// A checkpoint displaced by a different build is parked, not destroyed. Best
// effort by design: if the shelf write fails (quota), the new run still starts.
export function shelveCheckpoint(checkpoint, reason) {
  if (stageCount(checkpoint) === 0) return false;
  var envelope = {
    shelvedAt: new Date().toISOString(),
    reason: reason || 'mismatch',
    checkpoint: checkpoint
  };
  var json;
  try { json = JSON.stringify(envelope); } catch (_e) { return false; }
  return writeRaw('local', SHELF_STORAGE_KEY, json) || writeRaw('session', SHELF_STORAGE_KEY, json);
}

export function getShelvedCheckpoint() {
  return parse(readRaw('local', SHELF_STORAGE_KEY)) || parse(readRaw('session', SHELF_STORAGE_KEY));
}

export function clearShelvedCheckpoint() {
  removeRaw('local', SHELF_STORAGE_KEY);
  removeRaw('session', SHELF_STORAGE_KEY);
}

// The single entry point both pipelines use to open a run.
//
// Returns { checkpoint, resumed, restoredStages, matched, mismatch, priorSpend }.
// - resumed        how many completed stages came back for free
// - restoredStages their keys, in stored order
// - mismatch       { reason, want, have } when a checkpoint was set aside
// - priorSpend     what earlier attempts at this same book already cost
export function resumeCheckpointForRun(inputs) {
  inputs = inputs || {};
  var existing = loadCheckpoint();
  var verdict = describeCheckpointMatch(existing, inputs);
  var mismatch = null;

  if (!verdict.match && verdict.reason !== 'empty') {
    shelveCheckpoint(existing, verdict.reason);
    mismatch = { reason: verdict.reason, want: verdict.want, have: verdict.have };
    notice('warn', verdict.reason === 'pipeline'
      ? 'Saved progress came from a different pipeline method. It has been set aside, not deleted — this run starts fresh.'
      : 'Saved progress belongs to a different workout or brief. It has been set aside, not deleted — this run starts fresh.');
    existing = null;
  }

  if (!existing) {
    return {
      checkpoint: initCheckpoint(inputs),
      resumed: 0,
      restoredStages: [],
      matched: false,
      mismatch: mismatch,
      priorSpend: zeroSpend()
    };
  }

  // Resuming. Fold the last session's spend into the prior-attempts figure and
  // reset the live counter, so this run's meter starts honestly at zero.
  var prior = addSpend(
    (existing.spend && existing.spend.priorAttempts) || zeroSpend(),
    (existing.spend && existing.spend.thisSession) || zeroSpend()
  );
  sessionSpend = zeroSpend();
  existing.spend = { priorAttempts: prior, thisSession: zeroSpend() };

  // Stamp identity onto legacy checkpoints and refresh the display-only fields,
  // so the next mismatch is decided by fingerprint rather than pipeline tag.
  existing.schema = 2;
  existing.runFingerprint = verdict.want;
  existing.inputs = existing.inputs || {};
  existing.inputs.workout = inputs.workout === undefined
    ? (existing.inputs.workout || '')
    : displayInput(inputs.workout);
  existing.inputs.brief = displayInput(inputs.brief) || existing.inputs.brief || '';
  existing.inputs.pipeline = inputs.pipeline || existing.inputs.pipeline || '';
  existing.inputs.model = inputs.model || '';
  existing.inputs.provider = inputs.provider || '';
  existing.updatedAt = new Date().toISOString();
  stampSpend(existing);
  persist(existing);

  var keys = Object.keys(existing.stages || {});
  return {
    checkpoint: existing,
    resumed: keys.length,
    restoredStages: keys,
    matched: true,
    mismatch: null,
    priorSpend: prior
  };
}

// One honest sentence for the run log when stages come back for free.
export function describeResume(resumeState) {
  if (!resumeState || !resumeState.resumed) return '';
  var prior = resumeState.priorSpend || zeroSpend();
  var line = 'Resuming this booklet: ' + resumeState.resumed + ' completed stage' +
    (resumeState.resumed === 1 ? '' : 's') + ' restored from saved progress at no API cost.';
  if (prior.calls > 0) {
    line += ' Earlier attempts on this booklet already spent ' +
      (prior.usd > 0 ? '~$' + prior.usd.toFixed(4) : 'an unpriced amount') +
      ' across ' + prior.calls + ' API call' + (prior.calls === 1 ? '' : 's') +
      ' (not included in this run meter).';
  }
  return line;
}
