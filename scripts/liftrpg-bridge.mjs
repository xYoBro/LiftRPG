#!/usr/bin/env node
// ── liftrpg-bridge.mjs — the Code Bridge (W1) ────────────────────────────────
//
// A localhost HTTP server that speaks an EXISTING wire format from the
// transport registry (public/generator/modules/provider.js) and fulfills every
// request by spawning the user's own locally installed `claude` CLI. The point
// is generation mileage at near-zero marginal cost: the author's Claude Code
// subscription instead of metered API tokens.
//
// ── ToS boundary (design law, not a preference) ──────────────────────────────
// User-installed, on the user's machine, against the user's own subscription.
// The bridge NEVER reads, extracts, forwards, or stores a credential; it has no
// idea what the CLI's token is. It only ever spawns the local binary and
// translates its stdout. It binds to loopback and refuses to bind anywhere
// else. Nothing here is hostable, and making it hostable is not a feature
// request — it is the line.
//
// ── Which wire format, and why not Anthropic Messages ────────────────────────
// The W1 brief recommended the Anthropic Messages surface (POST /v1/messages).
// That surface CANNOT be reached by this project's client today: the anthropic
// adapter posts to the module constant `ANTHROPIC_MESSAGES_URL`
// ('https://api.anthropic.com/v1/messages') and ignores `settings.baseUrl`
// entirely (provider.js). Pointing the client at a localhost Anthropic surface
// would therefore require editing provider.js — W8's hot zone, explicitly out
// of W1's scope.
//
// The OpenAI-compatible adapter takes its URL from `settings.baseUrl`, so the
// bridge is reachable as pure CONFIG (`format:'openai'`, baseUrl
// 'http://127.0.0.1:8090/v1'), which is the D94 law working exactly as written:
// a provider is config, a wire format is code, and this needed no new code on
// the client at all. `allowsEmptyApiKey()` already exempts localhost from the
// key requirement, so W8's browser door needs no key ceremony either.
//
// Consequence for W8: making this public is a PRESET, not a transport change.
//
// ── The D102 lesson is binding ───────────────────────────────────────────────
// A stub that speaks half its client's protocol is worse than no stub. This
// bridge therefore implements the compat surface's THREE live paths:
//   1. streaming SSE (`stream:true`)          — every prose stage
//   2. one-shot JSON (`stream` absent/false)  — the structured stage path
//   3. `response_format:{type:'json_schema'}` — mapped onto the CLI's
//      --json-schema, so structured stages get real schema enforcement rather
//      than a rejection the client has to recover from
// plus OPTIONS preflight (CORS + Private Network Access) and GET /v1/models,
// because the browser door at W8 discovers models through that endpoint.
//
// ── Usage-window exhaustion ──────────────────────────────────────────────────
// Subscription limits are the expected failure, not an exceptional one. They
// are mapped onto the wire format's STRUCTURAL rate-limit shape — HTTP 429 with
// an OpenAI `error.type:'rate_limit_error'` body before the stream opens, or an
// `error` SSE frame once it has. provider.js already marks both retryable
// (`status===429 || >=500` in runStreamingRequest; `payload.error` in
// readOpenAICompatStream), so error-classify.js reads `err.retryable` and
// learns NO new vocabulary. That is asserted by --self-test.
//
// ── Who may talk to it: CORS is DEFAULT-DENY ─────────────────────────────────
// The bridge spends the author's subscription. A page on any origin the browser
// lets through can therefore burn a usage window, so origins are allow-listed,
// not echoed:
//   · no Origin header at all  → served normally (Node clients, the bench)
//   · a LOOPBACK origin        → served, and the origin is echoed back
//                                (http/https on localhost, 127.0.0.1, [::1] —
//                                 exact hostname, so localhost.evil.test is not
//                                 one of them)
//   · anything else            → 403, and no CORS header is emitted at all
// Private Network Access is granted on exactly the origins that are allowed;
// granting it to an origin whose response the browser may not read would be the
// hole this closes, reopened one header lower.
//
// `--allow-origin <origin>` (repeatable) names an additional exact origin. That
// is the W8 door: when this becomes reachable from the site, the site's origin
// is named on the command line, and nothing else changes.
//
// ── Usage ────────────────────────────────────────────────────────────────────
//   node scripts/liftrpg-bridge.mjs                 # serve on :8090
//   node scripts/liftrpg-bridge.mjs --port 9100     # serve elsewhere
//   node scripts/liftrpg-bridge.mjs --self-test     # no network, no spend
//   node scripts/liftrpg-bridge.mjs --preflight     # check and exit
//   node scripts/liftrpg-bridge.mjs --allow-origin https://liftrpg.co
//                                                   # repeatable; loopback is
//                                                   # always allowed anyway
//
// ── The inactivity watchdog ──────────────────────────────────────────────────
// A hung child stalls a pipeline stage for as long as the client's own ceiling
// allows, and on the streaming path the bridge itself hides the hang: the SSE
// keepalive fires on a timer, not on child activity, so the client's 120s idle
// guard (STREAM_IDLE_TIMEOUT_MS) is re-armed forever by a bridge whose child
// has said nothing since it spawned. The only place that silence is visible is
// here.
//
// The cap is on SILENCE, never on wall clock: a prose stage legitimately runs
// many minutes, and a wall-clock cap would kill the healthy long runs this
// transport exists to make affordable. Any byte from the child — stdout or
// stderr — re-arms the window.
//
// One window covers BOTH request shapes, because the client's `stream` flag
// changes only how the BRIDGE relays: the child is always spawned with
// `--output-format stream-json --verbose --include-partial-messages`
// (BASE_CLI_ARGS), so a one-shot request's child streams the same NDJSON frames
// a streaming request's does — message_start, the deltas, message_delta,
// result. Even the --json-schema path, which produces no TEXT deltas, emits
// frames the bridge already counts as activity (input_json_delta and friends;
// see handleFrame). A one-shot child that has said nothing for the whole window
// is therefore hung, not working quietly.
//
// The default is deliberately generous — it fires on HUNG, never on slow. Raise
// it with LIFTRPG_BRIDGE_IDLE_MS if a local CLI is ever seen backing off
// silently for longer (its own upstream retries are the one plausible source of
// a long silent gap); 0 disables the watchdog entirely. A kill is loud and
// named either way, never a silent truncation.
//
// The failure is shaped as HTTP 502, chosen rather than 503: the client treats
// 429/503 as a THROTTLE and waits without consuming a retry attempt (D160), and
// a hung CLI is not a closed door — it is a retryable server fault that should
// consume an attempt and escalate the stage budget like any other. 502 is
// already retryable (`status >= 500` in runStreamingRequest), and the message
// carries none of the throttle vocabulary isLikelyThrottleError scans for.
//
// Env: LIFTRPG_BRIDGE_PORT, LIFTRPG_BRIDGE_CLAUDE_BIN (path to the CLI; the
// self-test points it at a fake), LIFTRPG_BRIDGE_IDLE_MS, LIFTRPG_BRIDGE_VERBOSE=1.
//
// Ports: 8080 http-server · 8081 eval bench · 8082 playthrough auditor · 8090
// is this bridge's, and it must stay out of the other three's way.

'use strict';

import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const DEFAULT_PORT = 8090;
const HOST = '127.0.0.1';                       // loopback only. Not a setting.
const VERBOSE = process.env.LIFTRPG_BRIDGE_VERBOSE === '1';

// Read at CALL time, never captured at import time: --self-test points this at
// a fake CLI after the module has loaded, and a const here would silently spend
// real subscription tokens during a test that claims to spend none.
function claudeBin() { return process.env.LIFTRPG_BRIDGE_CLAUDE_BIN || 'claude'; }

// How long the child may say NOTHING before the bridge stops it. Read at call
// time for the same reason claudeBin() is: the self-test drives the real
// watchdog through the real env knob rather than a copy of it.
const DEFAULT_IDLE_MS = 300000;                 // 5 minutes of total silence
// Grace between SIGTERM and SIGKILL. The CLI gets a chance to exit cleanly; a
// child that ignores the signal still dies, because the whole point is that
// nothing is left spending the subscription with nobody reading its output.
const KILL_GRACE_MS = 2000;

function idleWatchdogMs() {
  const raw = process.env.LIFTRPG_BRIDGE_IDLE_MS;
  if (raw === undefined || raw === '') return DEFAULT_IDLE_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_IDLE_MS;
  return parsed;                                 // 0 = disabled, on purpose
}

// Model ids the local CLI can resolve, and the ids /v1/models advertises.
//
// ONLY these two mean "whatever the CLI resolves": the bridge deliberately
// hardcodes no model id, so the subscription's own default wins and this file
// never goes stale when the alias set moves.
const CLI_DEFAULT_SENTINELS = ['', 'default'];
// Every OTHER alias is a REQUEST and must reach the CLI as --model. Folding
// them into the sentinel branch makes the bridge silently ignore the model the
// caller asked for and spend whatever the CLI defaults to — a bench configured
// for haiku burning Opus, with the config file still saying haiku. The CLI
// takes these verbatim (`claude --model haiku`).
const CLI_MODEL_ALIASES = ['default', 'fable', 'opus', 'sonnet', 'haiku'];

// ── THE BACKEND TABLE (2026-08-19) — TWO OF THREE ARE SCAFFOLDING ────────────
// ONE HOME for "which backends does this bridge route, and what is true of
// each". Routing, /healthz, the startup banner and --self-test all WALK this
// table; a second list is the D93 defect and is how a server ends up
// advertising a state it does not implement.
//
// `claude` is the bridge as it has always been: the bare `/v1/*` surface, an
// empty prefix, and NOT ONE BYTE of its path changed when this table arrived
// (--self-test asserts the claude routes still answer exactly as before).
//
// `codex` and `gemini` are ROUTED AND REFUSED. There is no spawn, no argv, no
// parser for either, on purpose. The wave that tried to build them hit a real
// wall: the Codex CLI reports itself logged in while its refresh token is dead
// (401 on every real call), and no Gemini CLI auth is configured on this
// machine at all. A parser written against zero observed success transcripts is
// exactly how a silently-wrong transport ships — the D102 lesson at the top of
// this file, one layer out. So this wave routes the paths, says plainly that
// nothing stands behind them, and stops.
//
// ── WHAT A FOLLOW-UP WAVE OWES (start HERE; do not re-derive these) ──────────
// 1. FIX AUTH FIRST, then capture a REAL transcript. `codex login`; for Gemini,
//    configure that CLI's own auth. No frame parser may be written from a
//    guess about what the binary emits.
// 2. The flag shapes below were read off `--help` on the INSTALLED binaries
//    (codex 0.145.0, gemini CLI 0.55.1) on 2026-08-19. They are notes for
//    whoever implements, never a contract — re-check them against the version
//    actually installed then:
//    · codex: `codex exec --json` (JSONL events) · `--output-schema <FILE>`
//      (a PATH, not inline JSON) · `-o/--output-last-message <FILE>` ·
//      `-m/--model` · `-s/--sandbox read-only|workspace-write|…` ·
//      `--skip-git-repo-check` (MANDATORY — the CLI refuses to run outside a
//      git repo, and this bridge spawns its children in os.tmpdir()) ·
//      `--ignore-user-config`.
//    · gemini: `-p/--prompt` (headless) · `-m/--model` ·
//      `-o/--output-format text|json|stream-json` · `--approval-mode
//      default|auto_edit|yolo|plan` · `--skip-trust` (headless needs it, or an
//      untrusted CWD silently downgrades the approval mode). No
//      `--output-schema` equivalent exists: structured output on that backend
//      would be prompt-instructed, never wire-enforced, and a stage that
//      believes it was forced when it was only asked is a defect.
//    THE COLLISION, in writing: `-o` is an output FILE on codex and an output
//    FORMAT on gemini. A shared arg-builder that assumes one meaning is a bug.
// 3. OPEN DESIGN QUESTION, unresolved and load-bearing — someone must RULE on
//    it before either backend goes live. Neither CLI exposes a max-output-token
//    lever, and codex exposes no system-prompt flag at all. The claude backend
//    honors the STAGE_BUDGETS ceiling through CLAUDE_CODE_MAX_OUTPUT_TOKENS
//    (see childEnv, and the note above it explaining what a dropped ceiling
//    costs). On a codex backend that ladder has NO WIRE PATH: D97's escalation
//    would be inert, and a truncation retry would escalate to the same ceiling
//    that just truncated — the precise defect childEnv exists to have fixed.
//    Fold the system prompt into the user prompt and accept an unenforced
//    ceiling, or find another lever; either way it is an author ruling, not an
//    implementer's judgement call.
const BACKENDS = {
  claude: {
    prefix: '',                 // the historical surface: bare /v1/*
    state: 'live',
    label: 'Claude Code CLI',
    defaultModelLabel: 'claude-code-default',
    streamsTextDeltas: true,    // real message_delta frames; unchanged since W1
    // ── HOW THIS BACKEND IS BILLED (2026-08-19) ──────────────────────────────
    // A capability column, exactly like `streamsTextDeltas` above: one row per
    // backend, read by handleChatCompletions, nothing downstream (D237's law).
    //
    // 'measured': the CLI computes the dollar figure for the call itself and
    // reports it as `total_cost_usd` on the result frame. That number is
    // subscription-window accounting done by the thing that did the work — it
    // is not an estimate, and it outranks any rate-card arithmetic the client
    // could do. It was already being parsed here and then dropped on the floor;
    // nothing downstream had ever seen it.
    billing: 'measured',
    billingSource: 'the Claude Code CLI\'s own accounting'
  },
  codex: {
    prefix: '/codex',
    state: 'live',
    label: 'Codex CLI',
    defaultModelLabel: 'codex-cli-default',
    // 'not_metered' is a DIFFERENT FACT from "we have no price", and the client
    // renders them differently on purpose. ChatGPT-subscription access has no
    // per-token billing concept at all: there is no rate to look up, no table
    // that could ever be extended to cover it, and no figure the CLI withholds.
    // Reporting it as "unpriced" blames our pricing table for a number that
    // does not exist. `costUsd: 0` in generateCodex() is the same statement in
    // the runner's vocabulary — and 0 must never reach the client as a DOLLAR
    // amount, which is why the mode travels and the zero does not.
    billing: 'not_metered',
    billingSource: 'ChatGPT subscription access',
    // Codex emits NO incremental text: the whole answer arrives in one
    // `item.completed` frame (observed, both plain and schema-forced). The
    // streaming path reads this and relays the accumulated text as a single
    // chunk instead of assuming deltas that never come — a streaming client
    // that got an empty stream would be the D102 failure exactly.
    streamsTextDeltas: false
  },
  gemini: {
    prefix: '/gemini',
    state: 'scaffolded',
    label: 'Gemini CLI',
    // NO `billing` COLUMN ON PURPOSE. This backend refuses every request before
    // a generation runs, so it never builds a usage object and has nothing to
    // declare. Guessing a billing mode for a door that has never answered would
    // be inventing a fact about a transport nobody has authenticated.
    blocker: 'no Gemini CLI auth is configured on this machine. Fix: authenticate the '
      + 'gemini CLI, then re-run this bridge'
  }
};

// Which backend a request names, and the route with that backend's prefix
// removed. The claude branch returns the route UNCHANGED, so every claude route
// below is matched by the same literal string it always was — the routing table
// did not learn a new shape, it grew a lookup in front of it.
function resolveBackendRoute(route) {
  for (const name of Object.keys(BACKENDS)) {
    const backend = BACKENDS[name];
    if (!backend.prefix) continue;
    if (route === backend.prefix || route.startsWith(backend.prefix + '/')) {
      return { name, backend, rest: route.slice(backend.prefix.length) || '/' };
    }
  }
  return { name: 'claude', backend: BACKENDS.claude, rest: route };
}

// The CLI's own agent system prompt frames the model as a coding agent with
// tools. A generation stage is a self-contained "return this JSON" instruction,
// so the bridge replaces that framing with the smallest honest one. A `system`
// message from the client always wins over this default.
const DEFAULT_SYSTEM_PROMPT =
  'You are a text generation service. Follow the user\'s instructions exactly '
  + 'and return only what they ask for, with no preamble and no commentary.';

// ── CLI invocation ───────────────────────────────────────────────────────────
// --safe-mode          : the user's CLAUDE.md, memory, hooks, skills and MCP
//                        servers must not leak into a generation prompt. Auth
//                        is untouched by it (unlike --bare, which forces
//                        ANTHROPIC_API_KEY and would defeat the whole point).
// --tools ""           : no agent loop. One turn, text out.
// --output-format stream-json --verbose --include-partial-messages
//                      : NDJSON carrying the raw Messages events, which is what
//                        makes real streaming translation possible.
// --no-session-persistence / --strict-mcp-config / --disable-slash-commands
//                      : leave nothing behind, load nothing extra.
const BASE_CLI_ARGS = [
  '-p',
  '--safe-mode',
  '--tools', '',
  '--output-format', 'stream-json',
  '--verbose',
  '--include-partial-messages',
  '--no-session-persistence',
  '--strict-mcp-config',
  '--disable-slash-commands'
];

// ── Small helpers ────────────────────────────────────────────────────────────

function log(...args) { console.log('[bridge]', ...args); }
function debug(...args) { if (VERBOSE) console.log('[bridge:debug]', ...args); }

function parseArgs(argv) {
  const out = { mode: 'serve', port: Number(process.env.LIFTRPG_BRIDGE_PORT) || DEFAULT_PORT };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--self-test') out.mode = 'self-test';
    else if (argv[i] === '--preflight') out.mode = 'preflight';
    else if (argv[i] === '--port') out.port = Number(argv[++i]) || DEFAULT_PORT;
    else if (argv[i] === '--allow-origin') {
      const value = argv[++i];
      if (!allowOrigin(value)) {
        console.log('Not an origin: ' + JSON.stringify(value == null ? '' : value)
          + '. --allow-origin takes scheme://host[:port], e.g. https://liftrpg.co');
        process.exit(1);
      }
    }
  }
  return out;
}

// ── The origin allow-list ────────────────────────────────────────────────────
// Loopback is allowed by construction and is NOT in this set; the set holds
// only what --allow-origin named. Kept mutable at module scope for the same
// reason claudeBin() is read at call time: --self-test drives the real check
// through the real flag path rather than a copy of it.

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const EXTRA_ALLOWED_ORIGINS = new Set();

// URL is the parser, never a regex: a regex over origins is how
// `https://localhost.evil.test` and `http://127.0.0.1.evil.test` get read as
// loopback. Returns '' for anything that is not a well-formed origin, and ''
// never matches anything.
function normalizeOrigin(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return '';
  let url;
  try { url = new URL(raw); } catch (_e) { return ''; }
  if (!url.protocol || !url.hostname) return '';
  return url.origin && url.origin !== 'null' ? url.origin.toLowerCase() : '';
}

function isLoopbackOrigin(origin) {
  let url;
  try { url = new URL(origin); } catch (_e) { return false; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return LOOPBACK_HOSTNAMES.has(url.hostname.toLowerCase());
}

// The flag's own implementation, so --allow-origin and the self-test cannot
// disagree about what an accepted origin is.
function allowOrigin(value) {
  const normalized = normalizeOrigin(value);
  if (!normalized) return false;
  EXTRA_ALLOWED_ORIGINS.add(normalized);
  return true;
}

function originAllowed(origin) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  return isLoopbackOrigin(normalized) || EXTRA_ALLOWED_ORIGINS.has(normalized);
}

// Subscription auth is the whole point, so an API key in the environment is
// stripped from the CHILD's env: with one set, the CLI would bill the API
// account instead of the subscription and the wave's premise would silently
// evaporate. Reported at preflight rather than done quietly.
// ── THE STAGE'S OUTPUT CEILING REACHES THE CLI (2026-08-17) ──────────────────
// THE DEFECT: `maxTokens` is the load-bearing half of every STAGE_BUDGETS row
// (D97) — the ladder that escalates on a truncation retry, the reason a stage
// that returns a whole unit can never be budgeted below the stage that wrote
// it. The client sends it as `max_tokens` on every request. This bridge read
// the body, used `messages`, `response_format`, `model` and `stream`, and
// dropped `max_tokens` on the floor. So on the bridge door — the door the
// proving run uses — the entire budget ladder was inert: every stage got
// whatever ceiling the CLI defaults to, and a truncation retry "escalated" to
// the identical ceiling that had just truncated.
//
// THE MECHANISM. The installed CLI (2.1.233) exposes NO --max-tokens flag; the
// ceiling is an environment variable, CLAUDE_CODE_MAX_OUTPUT_TOKENS, which the
// binary does read (verified against the installed binary, not from memory).
// So it rides childEnv rather than BASE_CLI_ARGS. If a future CLI grows a flag,
// move it — a flag is visible in the spawn line and an env var is not.
//
// NOT a silent default: `maxTokens` unset means the caller expressed no ceiling
// and the CLI's own default is the honest answer. Only a real number is
// forwarded, and a non-positive one is ignored rather than passed through as a
// ceiling of zero.
function childEnv(maxOutputTokens) {
  const env = Object.assign({}, process.env);
  // Subscription auth is the whole point (see the note above this function).
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.CLAUDE_CODE_OAUTH_TOKEN;
  const ceiling = Number(maxOutputTokens);
  if (Number.isFinite(ceiling) && ceiling > 0) {
    env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = String(Math.floor(ceiling));
  }
  return env;
}

// Every live child, so a Ctrl-C on the bridge does not orphan a `claude`
// process that keeps spending the subscription with nobody reading its output.
const liveChildren = new Set();
function track(child) {
  liveChildren.add(child);
  child.on('close', () => liveChildren.delete(child));
}
function killAllChildren(signal) {
  for (const child of liveChildren) {
    try { child.kill(signal || 'SIGTERM'); } catch (_e) { /* already gone */ }
  }
}

function runCli(args, { input = '', timeoutMs = 30000, bin = null } = {}) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(bin || claudeBin(), args, { env: childEnv(), cwd: os.tmpdir() });
    } catch (err) {
      return resolve({ code: -1, stdout: '', stderr: String(err && err.message || err), spawnError: err });
    }
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch (_e) { /* gone */ } }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: stderr || String(err.message || err), spawnError: err });
    });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
    if (input) child.stdin.end(input); else child.stdin.end();
  });
}

// ── Preflight ────────────────────────────────────────────────────────────────
// The first printed line is either "ready" or the exact fix. Both probes are
// free: --version spawns nothing remote, and `auth status` reads local
// credentials without making a model call.

async function preflight(port) {
  const version = await runCli(['--version'], { timeoutMs: 15000 });
  if (version.spawnError && version.spawnError.code === 'ENOENT') {
    return {
      ok: false,
      line: 'Claude Code CLI not found (' + claudeBin() + '). Fix: npm install -g @anthropic-ai/claude-code'
    };
  }
  if (version.code !== 0) {
    return {
      ok: false,
      line: 'Claude Code CLI failed to run (' + claudeBin() + '): '
        + (version.stderr || version.stdout || 'exit ' + version.code).trim().split('\n')[0]
    };
  }

  const auth = await runCli(['auth', 'status'], { timeoutMs: 20000 });
  let status = null;
  try { status = JSON.parse(auth.stdout); } catch (_e) { status = null; }
  if (!status || !status.loggedIn) {
    return { ok: false, line: 'Claude Code is installed but not logged in. Fix: claude auth login' };
  }

  const strippedKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  return {
    ok: true,
    line: 'found Claude Code, logged in, ready on :' + port,
    detail: 'cli ' + version.stdout.trim().split(' ')[0]
      + ' · auth ' + (status.authMethod || 'unknown')
      + ' · plan ' + (status.subscriptionType || 'unknown')
      + (strippedKey ? ' · ANTHROPIC_API_KEY present in env and withheld from the CLI (subscription billing preserved)' : '')
  };
}

// The codex backend's own status line. NEVER blocking and never the first line
// printed: the claude preflight owns that (the door quotes it verbatim), and a
// second backend being unavailable must not stop the bridge serving the first.
// Both probes are local reads — `--version` and `login status` make no model
// call and spend nothing.
async function codexPreflight() {
  const version = await runCli(['--version'], { timeoutMs: 15000, bin: codexBin() });
  if (version.spawnError && version.spawnError.code === 'ENOENT') {
    return 'codex backend: CLI not found (' + codexBin() + '). Fix: install the Codex CLI, or ignore this door.';
  }
  if (version.code !== 0) {
    return 'codex backend: the CLI failed to run — '
      + (version.stderr || version.stdout || 'exit ' + version.code).trim().split('\n')[0];
  }
  const auth = await runCli(['login', 'status'], { timeoutMs: 20000, bin: codexBin() });
  const said = (auth.stdout + ' ' + auth.stderr).trim().split('\n')[0];
  if (auth.code !== 0 || /not logged in/i.test(said)) {
    return 'codex backend: not logged in. Fix: codex login';
  }
  // Deliberately NOT called "ready". `codex login status` reports that
  // credentials exist on disk; it does not prove the token refreshes or that
  // this account may use a model — both of which were false on this machine
  // while that command said everything was fine. The only proof is a real call,
  // and a preflight that spends quota to prove a door is worse than one that
  // states what it actually checked.
  return 'codex backend: ' + version.stdout.trim().split('\n')[0] + ' · ' + said
    + ' · not verified by a call (this bridge always sends --ignore-user-config; '
    + 'a config-pinned model is the known way this door 400s)';
}

// ── Request translation ──────────────────────────────────────────────────────

// The compat payload carries either a plain string or typed parts.
function partsToText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((p) => p && (p.type === 'text' || typeof p.text === 'string'))
    .map((p) => String(p.text || ''))
    .join('\n');
}

function hasImageParts(messages) {
  return messages.some((m) => Array.isArray(m && m.content)
    && m.content.some((p) => p && (p.type === 'image_url' || p.type === 'image')));
}

// A model the local CLI cannot resolve is a FATAL config error, not a retryable
// one: retrying it three times with escalating budgets wastes wall clock and
// tells the operator nothing. The message deliberately avoids the vocabulary
// error-classify.js scans for ('unsupported', 'not supported', 'json_schema',
// 'invalid parameter'), so it lands as a plain fatal error rather than being
// mistaken for a structured-output capability miss.
function resolveModelArgs(requested) {
  const model = String(requested == null ? '' : requested).trim();
  if (CLI_DEFAULT_SENTINELS.includes(model.toLowerCase())) return { args: [] };
  if (CLI_MODEL_ALIASES.includes(model.toLowerCase())) return { args: ['--model', model.toLowerCase()] };
  if (/^claude[-.]/i.test(model)) return { args: ['--model', model] };
  return {
    error: 'Bridge: model \'' + model + '\' is not a Claude Code model id. '
      + 'Use one of: ' + CLI_MODEL_ALIASES.join(', ') + ', or a claude-* id.'
  };
}

// ── The exhaustion gate ──────────────────────────────────────────────────────
// Structural signals first, message text only as the fallback — the same
// discipline provider.js applies to finish reasons. The CLI emits
// `rate_limit_event` frames carrying a status field. A WARNING IS NOT A WALL
// (D141): the CLI reports `allowed_warning` when a window is merely NEARING
// its cap, and the first draft's "anything other than 'allowed' is spent"
// predicate turned an 79%-used week into a three-day false outage. Any
// `allowed*` status proceeds; only refusal-class statuses flag — and a real
// refusal is still caught twice more downstream (the 429 structural check and
// the text fallback), so narrowing here cannot hide one.

function rateLimitFromEvent(frame) {
  const info = frame && frame.rate_limit_info;
  if (!info) return null;
  const status = String(info.status || '').toLowerCase();
  if (!status || status.startsWith('allowed') || status === 'warning') return null;
  const resets = Number(info.resetsAt) > 0
    ? ' Window resets at ' + new Date(Number(info.resetsAt) * 1000).toISOString() + '.'
    : '';
  return 'Claude Code subscription usage window exhausted (' + (info.rateLimitType || 'usage window')
    + ', status ' + status + ').' + resets;
}

// Text fallback: the CLI's own wording when a run is refused for limits. This
// vocabulary lives HERE, in the bridge, and nowhere downstream.
const EXHAUSTION_TEXT = /usage limit|rate limit|rate_limit|limit reached|too many requests|out of (?:credit|usage)|quota (?:exceeded|exhausted)|upgrade to (?:continue|increase)|resets? at/i;

function rateLimitFromResult(frame, stderr) {
  if (!frame && !stderr) return null;
  if (frame && Number(frame.api_error_status) === 429) {
    return 'Claude Code reported HTTP 429 from the upstream API.';
  }
  const text = [
    frame && frame.result,
    frame && frame.error,
    frame && frame.api_error_status,
    stderr
  ].filter(Boolean).map(String).join('\n');
  if (frame && frame.is_error && EXHAUSTION_TEXT.test(text)) {
    return 'Claude Code refused the call for usage limits: ' + text.trim().slice(0, 300);
  }
  if (!frame && stderr && EXHAUSTION_TEXT.test(stderr)) {
    return 'Claude Code refused the call for usage limits: ' + stderr.trim().slice(0, 300);
  }
  return null;
}

// Anthropic stop_reason -> OpenAI finish_reason. The client normalizes from
// there (FINISH_REASON_MAP), so 'length' is what makes a truncated stage
// classify as truncation on the compat path.
// ── THE ABSENT SIGNAL IS NOT A SUCCESS SIGNAL (2026-08-17) ──────────────────
// '' maps to 'stop', which is the only defensible default: the client's
// FINISH_REASON_MAP has no "unknown", and inventing 'length' would make every
// missing frame look like a truncation and escalate a budget for no reason.
//
// But it is a GUESS, and it is the guess that hides the expensive failure. If
// the CLI produced text and never emitted a stop_reason, a genuinely truncated
// answer normalizes to success: the stage validator sees a short-but-parseable
// body, classifies it as an ordinary schema failure, and stageBudget() hands
// attempt 2 the exact ceiling that just truncated — the D97 wall, twice, at
// full price. We cannot invent a signal the CLI did not send; what we can do is
// refuse to be quiet about having guessed. `noteMissingStopReason` below is the
// loud half.
function toOpenAIFinishReason(stopReason) {
  switch (String(stopReason || '').toLowerCase()) {
    case 'max_tokens': return 'length';
    case 'refusal': return 'content_filter';
    case 'end_turn':
    case 'stop_sequence':
    case 'tool_use':                 // the --json-schema path stops this way
    case '': return 'stop';
    default: return 'stop';
  }
}

// Text with no stop_reason is the masked-truncation case. Reported on stderr,
// where the operator running the bridge in its own terminal will see it beside
// the request line, and NOT shaped as an error: the response is still the best
// answer available and refusing it would turn a suspicion into a dead stage.
function noteMissingStopReason(stopReason, text, ctx) {
  if (String(stopReason || '').trim()) return;
  if (!String(text || '').length) return;
  console.error('[bridge] WARNING: the CLI returned '
    + String(text).length + ' chars with NO stop_reason'
    + (ctx ? ' (' + ctx + ')' : '')
    + '. Reporting finish_reason="stop" because there is no other honest default — but a '
    + 'TRUNCATED answer is indistinguishable from a complete one here. If the stage that '
    + 'made this call fails on schema shape, suspect truncation first: its retry will get '
    + 'the same token ceiling, not an escalated one.');
}

function toOpenAIUsage(usage) {
  const u = usage || {};
  const input = Number(u.input_tokens) || 0;
  const cacheRead = Number(u.cache_read_input_tokens) || 0;
  const cacheWrite = Number(u.cache_creation_input_tokens) || 0;
  const output = Number(u.output_tokens) || 0;
  const thinking = Number((u.output_tokens_details || {}).thinking_tokens) || 0;
  const prompt = input + cacheRead + cacheWrite;
  return {
    prompt_tokens: prompt,
    completion_tokens: output,
    total_tokens: prompt + output,
    prompt_tokens_details: { cached_tokens: cacheRead },
    completion_tokens_details: { reasoning_tokens: thinking }
  };
}

// ── THE BILLING FACT, ON THE WIRE ────────────────────────────────────────────
// Rides `usage` for the same reason thinking tokens ride
// `completion_tokens_details` above: it is accounting, the usage object is the
// accounting carrier, and both the one-shot body and the streaming usage frame
// already deliver it — so one attachment point covers every path without a
// second plumbing route. The client reads these two keys provider-blind and
// never asks which door produced them.
//
// `cost_usd` is emitted ONLY when a real figure exists. The Claude CLI reports
// `total_cost_usd` on its plain result frames but NOT on the schema-forced
// path, so the field is genuinely absent on schema calls — and absent is the
// correct wire shape for "not measured this time". Emitting 0 there would be
// indistinguishable from a free call, which is the exact lie the client's
// unpriced state exists to avoid.
function withBillingFacts(usage, backend, costUsd) {
  const out = Object.assign({}, usage || {});
  if (!backend || !backend.billing) return out;
  out.billing_mode = backend.billing;
  if (backend.billingSource) out.billing_source = backend.billingSource;
  if (backend.billing === 'measured' && Number(costUsd) > 0) {
    out.cost_usd = Number(costUsd);
  }
  return out;
}

// ── Spawning one generation ──────────────────────────────────────────────────
// Resolves { text, usage, stopReason, model, costUsd } or rejects with an Error
// carrying `.rateLimited` / `.status` so the HTTP layer can shape it.

function generate({ prompt, system, schema, model, maxTokens, onDelta, onActivity, onModel, onSpawn }) {
  return new Promise((resolve, reject) => {
    const args = BASE_CLI_ARGS.slice();
    const modelArgs = resolveModelArgs(model);
    if (modelArgs.error) {
      const err = new Error(modelArgs.error);
      err.status = 400;
      return reject(err);
    }
    args.push(...modelArgs.args);
    args.push('--system-prompt', system || DEFAULT_SYSTEM_PROMPT);
    if (schema) args.push('--json-schema', JSON.stringify(schema));

    let child;
    try {
      // The stage's own output ceiling (STAGE_BUDGETS, D97) rides the child's
      // environment — see childEnv's header for why it is not a CLI flag.
      child = spawn(claudeBin(), args, { env: childEnv(maxTokens), cwd: os.tmpdir() });
    } catch (err) {
      const spawnErr = new Error('Bridge could not spawn the Claude Code CLI: ' + (err && err.message));
      spawnErr.status = 503;
      return reject(spawnErr);
    }
    track(child);
    if (onSpawn) onSpawn(child);

    let stdoutBuf = '';
    let stderr = '';
    let text = '';
    let usage = null;
    let stopReason = '';
    let cliModel = '';
    let costUsd = 0;
    let resultFrame = null;
    let rateLimit = null;
    let settled = false;

    function finishError(message, extra) {
      if (settled) return;
      settled = true;
      clearWatchdog();
      const err = new Error(message);
      Object.assign(err, extra || {});
      reject(err);
    }

    // ── The inactivity watchdog (see the header) ──────────────────────────────
    // Armed at spawn, re-armed by every byte the child writes on either pipe,
    // cleared the moment this call settles. A window of 0 means "no watchdog".
    const idleMs = idleWatchdogMs();
    let idleTimer = null;
    function clearWatchdog() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = null;
    }
    function armWatchdog() {
      if (settled || !idleMs) return;
      clearWatchdog();
      idleTimer = setTimeout(onSilence, idleMs);
    }
    function onSilence() {
      idleTimer = null;
      if (settled) return;
      // Report the window the way it was configured: a sub-second window
      // (the self-test's) rounds to "0s" and reads like a bug in the report.
      const windowLabel = idleMs >= 1000 ? Math.round(idleMs / 1000) + 's' : idleMs + 'ms';
      log('no output from the Claude Code CLI for ' + windowLabel + ' — stopping it');
      // Kill FIRST, answer second: the caller must never be told the call is
      // over while a paid child is still running.
      try { child.kill('SIGTERM'); } catch (_e) { /* already gone */ }
      const hard = setTimeout(() => {
        try { if (child.exitCode === null) child.kill('SIGKILL'); } catch (_e) { /* gone */ }
      }, KILL_GRACE_MS);
      if (hard.unref) hard.unref();
      // Wording matters as much as the status. 'stalled' makes this retryable
      // even on a path that loses the status code, and NOTHING here is throttle
      // vocabulary ('rate limit', 'usage window', 'try again later', …) or
      // truncation vocabulary — a stall is neither, and being read as either
      // would send the pipeline down the wrong recovery.
      finishError(
        'Bridge: the Claude Code CLI produced no output for ' + windowLabel + ' and was stopped '
        + '(the run stalled). Raise LIFTRPG_BRIDGE_IDLE_MS if this machine legitimately '
        + 'needs longer.',
        { status: 502, stalled: true }
      );
    }
    // Armed from the spawn, so a child that never says a word at all is covered
    // by the same window as one that goes quiet halfway through.
    armWatchdog();

    function handleFrame(frame) {
      if (onActivity) onActivity();
      if (!frame || typeof frame !== 'object') return;

      if (frame.type === 'rate_limit_event') {
        const hit = rateLimitFromEvent(frame);
        if (hit) rateLimit = hit;
        return;
      }
      if (frame.type === 'stream_event') {
        const ev = frame.event || {};
        if (ev.type === 'message_start') {
          // The model the CLI actually resolved. Reported upward immediately so
          // the streamed chunks name it rather than the alias that was asked
          // for — the client keeps the FIRST model it sees, and telemetry that
          // says 'default' or 'sonnet' when Opus ran is a lie the bench would
          // carry into every report.
          const resolved = (ev.message && ev.message.model) || '';
          if (resolved && resolved !== cliModel) {
            cliModel = resolved;
            if (onModel) onModel(resolved);
          }
        } else if (ev.type === 'content_block_delta') {
          const delta = ev.delta || {};
          // text_delta only. thinking_delta / signature_delta / input_json_delta
          // are activity, never content — the same rule readAnthropicStream
          // applies on the client side.
          if (delta.type === 'text_delta' && typeof delta.text === 'string') {
            text += delta.text;
            if (onDelta) onDelta(delta.text);
          }
        } else if (ev.type === 'message_delta') {
          if (ev.delta && ev.delta.stop_reason) stopReason = ev.delta.stop_reason;
          if (ev.usage) usage = ev.usage;
        }
        return;
      }
      if (frame.type === 'result') {
        resultFrame = frame;
        // Merged, not replaced: the result frame carries the authoritative
        // totals, message_delta carries the thinking-token detail, and neither
        // is a superset of the other.
        if (frame.usage) usage = Object.assign({}, usage, frame.usage);
        if (frame.stop_reason) stopReason = frame.stop_reason;
        if (Number(frame.total_cost_usd) > 0) costUsd = Number(frame.total_cost_usd);
        const hit = rateLimitFromResult(frame, stderr);
        if (hit) rateLimit = hit;
      }
    }

    child.stdout.on('data', (chunk) => {
      armWatchdog();                 // BYTES are the liveness signal, not frames:
      stdoutBuf += chunk;            // a half-written line is still a live child.
      let nl;
      while ((nl = stdoutBuf.indexOf('\n')) !== -1) {
        const line = stdoutBuf.slice(0, nl).trim();
        stdoutBuf = stdoutBuf.slice(nl + 1);
        if (!line) continue;
        try { handleFrame(JSON.parse(line)); } catch (_e) { debug('unparseable CLI line:', line.slice(0, 160)); }
      }
    });
    child.stderr.on('data', (d) => { armWatchdog(); stderr += d; });
    child.on('error', (err) => finishError(
      'Bridge could not run the Claude Code CLI: ' + (err && err.message), { status: 503 }
    ));

    child.on('close', (code) => {
      clearWatchdog();
      if (settled) return;
      if (!rateLimit) rateLimit = rateLimitFromResult(resultFrame, stderr);
      if (rateLimit) {
        return finishError(rateLimit, { status: 429, rateLimited: true });
      }
      // The --json-schema path answers with a tool_use block, so there are no
      // text deltas at all: the JSON only exists on the result frame. The same
      // fallback covers a stream whose partial frames were dropped — if we hold
      // the bytes, the client gets them.
      if (!text && resultFrame) {
        if (resultFrame.structured_output && typeof resultFrame.structured_output === 'object') {
          text = JSON.stringify(resultFrame.structured_output);
        } else if (typeof resultFrame.result === 'string' && !resultFrame.is_error) {
          text = resultFrame.result;
        }
      }
      if (resultFrame && resultFrame.is_error) {
        return finishError(
          'Claude Code CLI reported an error (' + (resultFrame.subtype || 'unknown') + '): '
          + String(resultFrame.result || stderr || '').slice(0, 400),
          { status: 502 }
        );
      }
      if (code !== 0 && !text) {
        return finishError(
          'Claude Code CLI exited ' + code + ': ' + (stderr.trim().slice(0, 400) || 'no output'),
          { status: 502 }
        );
      }
      if (!text) {
        return finishError('Claude Code CLI returned no text content.', { status: 502 });
      }
      settled = true;
      // The masked-truncation warning, at the one point both facts are in hand.
      noteMissingStopReason(stopReason, text,
        (maxTokens ? 'ceiling ' + maxTokens + ' tokens' : 'no ceiling requested')
        + (schema ? ', schema-forced' : ''));
      resolve({
        text,
        usage: toOpenAIUsage(usage),
        finishReason: toOpenAIFinishReason(stopReason),
        model: cliModel || 'claude-code-default',
        costUsd
      });
    });

    child.stdin.on('error', () => { /* the child died first; `close` reports it */ });
    child.stdin.end(prompt);
  });
}

// ── The codex backend (2026-08-19) ───────────────────────────────────────────
// EVERY LINE BELOW IS GROUNDED IN AN OBSERVED TRANSCRIPT, captured on this
// machine against codex-cli 0.145.0 on 2026-08-19. Nothing here is inferred
// from `--help`; the flag notes on the BACKENDS table were the starting point,
// and the parser was written from what the binary actually emitted:
//
//   $ echo "say the word PROBE and nothing else" | codex exec --json \
//       --skip-git-repo-check --ignore-user-config -s read-only -o LAST.txt
//   {"type":"thread.started","thread_id":"01a01845-…"}
//   {"type":"turn.started"}
//   {"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"PROBE"}}
//   {"type":"turn.completed","usage":{"input_tokens":17269,"cached_input_tokens":11008,
//     "cache_write_input_tokens":0,"output_tokens":6,"reasoning_output_tokens":0}}
//
// and, schema-forced with `--output-schema FILE` (a PATH, never inline JSON):
//   {"type":"item.completed","item":{"id":"item_0","type":"agent_message",
//     "text":"{\"title\":\"Midnight Iron\",\"weeks\":6}"}}
// — the raw JSON arrives as the agent message's TEXT, so the schema path needs
// no separate extraction. The `-o` file received the identical string.
//
// A failed turn, from the probe that found the model wall:
//   {"type":"item.completed","item":{"id":"item_0","type":"error","message":
//     "Model metadata for `gpt-5.4` not found. Defaulting to fallback metadata…"}}
//   {"type":"error","message":"{\"type\":\"error\",\"status\":400,…}"}
//   {"type":"turn.failed","error":{"message":"…"}}
//
// ── THREE THINGS THAT WILL BITE WHOEVER TOUCHES THIS NEXT ────────────────────
// 1. THE EXIT CODE IS NOT A SUCCESS SIGNAL. That failed turn exited **0**.
//    (And a run whose prompt is passed as a positional argument exits 1 while
//    printing "Reading additional input from stdin" — the prompt goes on
//    STDIN.) So this parser decides on the EVENTS and treats the exit code as
//    nothing but a reason to stop reading. A wrapper that trusted `code === 0`
//    would report a 400 from the API as a successful empty generation.
// 2. `--ignore-user-config` IS LOAD-BEARING, not hygiene. The user's
//    ~/.codex/config.toml pins `model = "gpt-5.4"`, which this account cannot
//    use, and EVERY call failed 400 until the flag was added. It is also the
//    codex analogue of the claude path's --safe-mode: personality, projects,
//    notify hooks and MCP config must not leak into a generation prompt.
// 3. `item.completed` carries BOTH the answer and non-fatal warnings — the
//    same frame type, told apart only by `item.type`. An `item.type:'error'`
//    is a WARNING (the metadata line above rode one and the turn still ran);
//    only a top-level `type:'error'` or `turn.failed` is fatal.
//
// ── WHAT THIS DOOR CANNOT DO, STATED RATHER THAN PAPERED OVER ────────────────
// · NO OUTPUT CEILING. The CLI exposes no max-tokens flag and no environment
//   equivalent (the claude path has CLAUDE_CODE_MAX_OUTPUT_TOKENS; see
//   childEnv). So `max_tokens` — the load-bearing half of every STAGE_BUDGETS
//   row (D97) — is ADVISORY here: it is stated to the model in words and
//   enforced by nothing. A truncation retry on this door escalates a ceiling
//   the wire never carried. That is a known hole, not an oversight, and it is
//   the open ruling named on the BACKENDS table.
// · NO SYSTEM-PROMPT CHANNEL. There is no --system-prompt flag, so the system
//   message is folded into the prompt under a labelled delimiter below.
// · NO MODEL MENU. Every concrete id tried (gpt-5, gpt-5-codex, gpt-5.1-codex,
//   gpt-5.4) was refused by the account with "not supported when using Codex
//   with a ChatGPT account". The ONLY selection proven to work is the CLI's own
//   default, so that is the only id /codex/v1/models advertises. A requested id
//   still reaches the binary verbatim (the claude path's law: a bridge that
//   silently ignores the model it was asked for is spending the wrong one) —
//   it will simply fail loudly at the API.
function codexBin() { return process.env.LIFTRPG_BRIDGE_CODEX_BIN || 'codex'; }

const CODEX_BASE_ARGS = [
  'exec',
  '--json',                 // NDJSON events on stdout — what makes this parseable
  '--skip-git-repo-check',  // MANDATORY: children spawn in os.tmpdir(), not a repo
  '--ignore-user-config',   // see note 2 above — without it every call 400s here
  '-s', 'read-only'         // a generation stage writes nothing to the machine
];

// The only model id this door advertises. Everything else is a request that
// reaches the binary and is answered by the API, not silently swapped.
const CODEX_MODEL_ALIASES = ['default'];

// Folded, not dropped. The delimiter is plain words rather than a fake role
// header: the model is being told where the instructions end, and an invented
// protocol marker would be one more thing to get subtly wrong.
function foldCodexPrompt(system, prompt, maxTokens) {
  const head = system || DEFAULT_SYSTEM_PROMPT;
  const ceiling = maxTokens
    ? '\n\nKeep the response under roughly ' + maxTokens + ' output tokens.'
    : '';
  return 'INSTRUCTIONS (follow exactly):\n' + head + ceiling
    + '\n\n--- END INSTRUCTIONS ---\n\nREQUEST:\n' + prompt;
}

// Codex's usage block, in OpenAI's shape.
//
// `input_tokens` is TREATED AS INCLUSIVE of `cached_input_tokens`, on the
// evidence rather than a guess: two near-identical probes reported 17269 (with
// 11008 cached) and 17311 (with 0 cached). If cached were additive the first
// prompt would have been ~28k for the same handful of words. So cached rides
// the DETAIL field only — adding it to the prompt total, the way toOpenAIUsage
// does for Anthropic's genuinely-separate counters, would inflate every number
// the run panel shows. Re-measure before changing this.
function codexUsageToOpenAI(usage) {
  const u = usage || {};
  const prompt = Number(u.input_tokens) || 0;
  const output = Number(u.output_tokens) || 0;
  return {
    prompt_tokens: prompt,
    completion_tokens: output,
    total_tokens: prompt + output,
    prompt_tokens_details: { cached_tokens: Number(u.cached_input_tokens) || 0 },
    completion_tokens_details: { reasoning_tokens: Number(u.reasoning_output_tokens) || 0 }
  };
}

// Same contract as generate(): resolves { text, usage, finishReason, model,
// costUsd }, rejects with an Error carrying `status` and optionally
// `rateLimited` / `stalled`. Same watchdog, same tracking, same kill-first
// discipline — a second process family spending a user's quota with nobody
// reading its output is the failure `track()` exists to prevent.
function generateCodex({ prompt, system, schema, model, maxTokens, onActivity, onModel, onSpawn }) {
  return new Promise((resolve, reject) => {
    const args = CODEX_BASE_ARGS.slice();
    const requested = String(model == null ? '' : model);
    if (CLI_DEFAULT_SENTINELS.indexOf(requested) === -1) args.push('-m', requested);

    // The schema is a FILE on this CLI. Written per call and removed when the
    // call settles, whichever way it settles.
    let schemaPath = '';
    if (schema) {
      try {
        schemaPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'liftrpg-codex-schema-')), 'schema.json');
        fs.writeFileSync(schemaPath, JSON.stringify(schema));
        args.push('--output-schema', schemaPath);
      } catch (err) {
        return reject(Object.assign(
          new Error('Bridge: could not stage the codex output schema: ' + (err && err.message)),
          { status: 500 }));
      }
    }
    function cleanupSchema() {
      if (!schemaPath) return;
      try { fs.rmSync(path.dirname(schemaPath), { recursive: true, force: true }); } catch (_e) { /* gone */ }
      schemaPath = '';
    }

    let child;
    try {
      // childEnv() with no argument: the API-key strip applies here too (an
      // OPENAI_API_KEY in the environment would bill the API account instead of
      // the subscription — the same premise-evaporation the claude path guards,
      // and codex reads that variable), and NO ceiling is sent because this CLI
      // has nowhere to put one.
      child = spawn(codexBin(), args, { env: childEnv(), cwd: os.tmpdir() });
    } catch (err) {
      return reject(Object.assign(
        new Error('Bridge could not spawn the Codex CLI: ' + (err && err.message)), { status: 503 }));
    }
    track(child);
    if (onSpawn) onSpawn(child);

    let stdoutBuf = '';
    let stderr = '';
    let text = '';
    let usage = null;
    let fatal = '';
    let fatalStatus = 0;
    let settled = false;
    let sawTurn = false;

    const idleMs = idleWatchdogMs();
    let idleTimer = null;
    function clearWatchdog() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = null;
    }
    function armWatchdog() {
      if (settled || !idleMs) return;
      clearWatchdog();
      idleTimer = setTimeout(onSilence, idleMs);
    }
    function finishError(message, extra) {
      if (settled) return;
      settled = true;
      clearWatchdog();
      cleanupSchema();
      reject(Object.assign(new Error(message), extra || {}));
    }
    function onSilence() {
      idleTimer = null;
      if (settled) return;
      const windowLabel = idleMs >= 1000 ? Math.round(idleMs / 1000) + 's' : idleMs + 'ms';
      log('no output from the Codex CLI for ' + windowLabel + ' — stopping it');
      try { child.kill('SIGTERM'); } catch (_e) { /* gone */ }
      const hard = setTimeout(() => {
        try { if (child.exitCode === null) child.kill('SIGKILL'); } catch (_e) { /* gone */ }
      }, KILL_GRACE_MS);
      if (hard.unref) hard.unref();
      // 502 + 'stalled', for the reason the header gives: a hang must consume a
      // retry attempt and escalate, never be waited out as a throttle. NOTE the
      // codex-specific risk: this CLI emits FAR fewer frames than the claude
      // one — on the probes, four events for a whole call — so a long quiet
      // generation has less to re-arm this window with. If a real stage is ever
      // killed here while healthy, raise LIFTRPG_BRIDGE_IDLE_MS rather than
      // removing the watchdog.
      finishError(
        'Bridge: the Codex CLI produced no output for ' + windowLabel + ' and was stopped '
        + '(the run stalled). Raise LIFTRPG_BRIDGE_IDLE_MS if this machine legitimately '
        + 'needs longer.',
        { status: 502, stalled: true });
    }

    function handleFrame(frame) {
      const type = String(frame && frame.type || '');
      if (type === 'turn.started') { sawTurn = true; return; }
      if (type === 'item.completed') {
        const item = frame.item || {};
        if (item.type === 'agent_message' && typeof item.text === 'string') {
          text += item.text;
          // NO onDelta HERE, deliberately. This backend declares
          // streamsTextDeltas:false, which makes the caller emit the
          // accumulated text as one chunk at the end. Emitting it here TOO
          // sends the whole answer twice — caught by the self-test's
          // no-duplication row, which exists because a doubled payload is the
          // kind of defect a client happily accepts and a reader never sees.
          return;
        }
        // An item-level error is a WARNING (see note 3 in the header): the
        // metadata notice rode one and the turn completed normally. Logged so
        // it is never invisible, never fatal.
        if (item.type === 'error') log('codex notice: ' + String(item.message || '').slice(0, 200));
        return;
      }
      if (type === 'turn.completed') { usage = frame.usage || null; return; }
      if (type === 'error' || type === 'turn.failed') {
        const raw = String((frame.error && frame.error.message) || frame.message || 'unknown codex failure');
        // The API's own error arrives as a JSON STRING inside that message.
        // Unwrapped when it parses, so the operator reads a sentence instead of
        // an escaped blob; left alone when it does not.
        let shown = raw;
        try {
          const inner = JSON.parse(raw);
          if (inner && inner.error && inner.error.message) shown = String(inner.error.message);
          // The API's OWN status rides that envelope (the observed failure
          // carried "status":400). Propagated rather than flattened to 502,
          // because the difference is the whole retry decision: a 400 the
          // account can never satisfy must not be retried three times with an
          // escalating budget, and a 429 must be waited out rather than burning
          // an attempt. Only a plausible HTTP status is trusted.
          const innerStatus = Number(inner && inner.status);
          if (Number.isFinite(innerStatus) && innerStatus >= 400 && innerStatus < 600) {
            fatalStatus = innerStatus;
          }
        } catch (_e) { /* not JSON — the raw line is the message */ }
        if (!fatal) fatal = shown;
        return;
      }
    }

    child.stdout.on('data', (chunk) => {
      armWatchdog();
      if (onActivity) onActivity();
      stdoutBuf += chunk;
      let nl;
      while ((nl = stdoutBuf.indexOf('\n')) !== -1) {
        const line = stdoutBuf.slice(0, nl).trim();
        stdoutBuf = stdoutBuf.slice(nl + 1);
        if (!line) continue;
        try { handleFrame(JSON.parse(line)); } catch (_e) { debug('codex: unparsed line', line.slice(0, 160)); }
      }
    });
    child.stderr.on('data', (d) => { armWatchdog(); if (onActivity) onActivity(); stderr += d; });

    child.on('error', (err) => finishError(
      'Bridge could not run the Codex CLI: ' + (err && err.message),
      { status: err && err.code === 'ENOENT' ? 400 : 503 }));

    child.on('close', () => {
      if (settled) return;
      settled = true;
      clearWatchdog();
      cleanupSchema();
      if (fatal) {
        // A quota wall on this backend is expected, not exceptional, and is
        // mapped onto the wire format's structural throttle shape exactly as
        // the claude path maps a spent usage window.
        const throttled = EXHAUSTION_TEXT.test(fatal) || fatalStatus === 429;
        return reject(Object.assign(
          new Error('Codex CLI: ' + fatal),
          { status: throttled ? 429 : (fatalStatus || 502), rateLimited: throttled }));
      }
      if (!text) {
        return reject(Object.assign(
          new Error('Bridge: the Codex CLI returned no assistant message'
            + (sawTurn ? '' : ' and never started a turn')
            + (stderr.trim() ? ' (' + stderr.trim().split('\n')[0].slice(0, 200) + ')' : '')
            + '. The exit code is not a success signal on this CLI, so this is decided on the events.'),
          { status: 502 }));
      }
      if (onModel) onModel(BACKENDS.codex.defaultModelLabel);
      resolve({
        text,
        usage: codexUsageToOpenAI(usage),
        // This CLI reports no stop reason at all, so nothing here can tell a
        // clean stop from a truncation. Reported as 'stop' because that is what
        // is known — inventing 'length' from a text-length guess would be worse
        // than the silence.
        finishReason: 'stop',
        model: BACKENDS.codex.defaultModelLabel,
        costUsd: 0
      });
    });

    armWatchdog();
    child.stdin.on('error', () => { /* the child died first; `close` reports it */ });
    child.stdin.end(foldCodexPrompt(system, prompt, maxTokens));
  });
}

// ── HTTP surface ─────────────────────────────────────────────────────────────

// DEFAULT-DENY. A request with no Origin (Node, curl, the bench's own fetch)
// needs no CORS headers and gets none — CORS is a browser mechanism and their
// absence has never stopped a non-browser client. A disallowed origin gets none
// either, which is the denial: without an echoed allow-origin the browser
// refuses the response, and `vary: origin` is still emitted so no cache can
// serve an allowed origin's answer to a denied one.
function corsHeaders(req) {
  const origin = req.headers.origin;
  if (!origin || !originAllowed(origin)) return { vary: 'origin' };
  return {
    'access-control-allow-origin': normalizeOrigin(origin),
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': req.headers['access-control-request-headers']
      || 'authorization, content-type, x-api-key, anthropic-version, anthropic-beta, anthropic-dangerous-direct-browser-access',
    'access-control-max-age': '86400',
    // Private Network Access: a page on a public origin reaching 127.0.0.1 is
    // blocked by Chrome unless the preflight says this. Emitted only for an
    // origin already allowed above — a denied origin must not be handed the
    // one header that exists to unlock loopback.
    'access-control-allow-private-network': 'true',
    vary: 'origin'
  };
}

// A foreign origin is refused before anything is spawned, not merely denied the
// response. A preflighted POST never arrives, but a simple request (text/plain,
// no custom headers) skips the preflight entirely and would otherwise spend a
// usage window whose answer the attacker's page could not even read. Silent
// theft with no payoff is still theft.
function originRefused(req, res) {
  const origin = req.headers.origin;
  if (!origin || originAllowed(origin)) return false;
  // Both of these are attacker-controlled and can run to the header size limit.
  // Truncated before they reach the operator's console or the response body:
  // the refusal should name what was refused, not let it write a page.
  const shown = String(origin).slice(0, 120);
  log('refused cross-origin request from ' + shown
    + ' (' + req.method + ' ' + String(req.url || '').slice(0, 120) + ')');
  const payload = JSON.stringify(errorBody(
    'Bridge: origin ' + shown + ' is not allowed. Loopback origins are allowed by '
    + 'default; name another with --allow-origin <origin>.', 'origin_not_allowed'));
  res.writeHead(403, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload), vary: 'origin' });
  res.end(payload);
  return true;
}

function sendJson(req, res, status, body) {
  // A client that hung up mid-generation is the normal case when a run is
  // killed, and writing to its dead socket would turn a clean abort into an
  // unhandled throw inside the request handler.
  if (res.writableEnded || res.destroyed) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, Object.assign({
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload)
  }, corsHeaders(req)));
  res.end(payload);
}

function errorBody(message, type) {
  return { error: { message, type: type || 'bridge_error', code: type === 'rate_limit_error' ? 'rate_limit_exceeded' : undefined } };
}

// A scaffolded backend's answer, and the ONLY thing behind those routes.
//
// HTTP 400, deliberately NOT 501. The client marks `status === 429 || >= 500`
// retryable (provider.js, both the streaming and the structured paths), so a
// semantically-correct 501 would make every stage retry a backend that can
// never answer — three escalating attempts and a whole wall-clock ladder spent
// on a permanent condition. A scaffolded backend is a FATAL config error,
// exactly like a model id the CLI cannot resolve, and it is shaped like one.
//
// The wording is chosen as carefully as resolveModelArgs' is: it avoids the
// refusal words error-classify.js scans for beside a forcing subject
// ('unsupported', 'not supported', 'does not support', …), so a structured
// stage does not read this as a schema-forcing capability miss and silently
// degrade to an unforced call; and it avoids every throttle phrase
// (isLikelyThrottleError), so nobody waits it out. --self-test pins both.
function backendNotImplemented(req, res, name, backend) {
  return sendJson(req, res, 400, errorBody(
    'Bridge: the ' + name + ' backend is scaffolding only. This bridge routes '
    + backend.prefix + '/v1/* and spawns nothing behind it — there is no request path yet. '
    + 'Blocked on: ' + backend.blocker
    + '. See the BACKENDS table in liftrpg-bridge.mjs for what a follow-up wave owes.',
    'backend_not_implemented'));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 64 * 1024 * 1024) reject(new Error('request too large')); });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

const SSE_KEEPALIVE_MS = 10000;   // client idle window is 120s (constants.js)

// THE DISPATCH POINT (2026-08-19). One handler, one runner per backend. The
// claude branch is reached by exactly the same values it always was — the
// backend defaults to claude and every claude-specific string below is now read
// off the BACKENDS row that holds it, so the live surface is unmoved.
//
// A follow-up wave adding gemini adds a runner and a row. It does NOT add a
// branch here, and it does not start until it has a REAL transcript in hand:
// the codex parser above exists because two probes were run and read, and the
// three traps recorded in its header (exit 0 on failure, the config-pinned
// model, warnings sharing the answer's frame type) were all found that way, not
// reasoned out. See the BACKENDS table for what is known about the gemini flags
// and for the OPEN RULING on the unenforceable output ceiling.
const BACKEND_RUNNERS = { claude: generate, codex: generateCodex };

async function handleChatCompletions(req, res, backendName) {
  const backend = BACKENDS[backendName] || BACKENDS.claude;
  const runGeneration = BACKEND_RUNNERS[backendName] || BACKEND_RUNNERS.claude;
  let body;
  try {
    body = JSON.parse(await readBody(req) || '{}');
  } catch (_e) {
    return sendJson(req, res, 400, errorBody('Bridge: request body was not valid JSON.'));
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    return sendJson(req, res, 400, errorBody('Bridge: request carried no messages.'));
  }
  if (hasImageParts(messages)) {
    // Honest refusal beats a silent text-only call. The CLI takes a prompt on
    // stdin; images would need a different transport shape entirely.
    return sendJson(req, res, 400, errorBody('Bridge: image parts are not carried to the ' + backend.label + '.'));
  }

  const system = messages.filter((m) => m && m.role === 'system').map((m) => partsToText(m.content)).join('\n\n');
  const prompt = messages.filter((m) => m && m.role !== 'system').map((m) => partsToText(m.content)).join('\n\n');
  if (!prompt.trim()) {
    return sendJson(req, res, 400, errorBody('Bridge: request carried no prompt text.'));
  }

  const rf = body.response_format || {};
  const schema = (rf.type === 'json_schema' && rf.json_schema && rf.json_schema.schema) || null;
  const wantsStream = !!body.stream;
  // THE STAGE'S OUTPUT CEILING, honored rather than dropped. Every request the
  // client makes carries the STAGE_BUDGETS row's maxTokens here; before this it
  // was read by nothing, so the D97 ladder did not exist on this door.
  const maxTokens = Number(body.max_tokens) > 0 ? Number(body.max_tokens) : 0;
  // Which streaming shape this backend needs at the end of the call. For
  // claude this evaluates to `!!schema` — byte-identical to the condition that
  // stood here before the second backend existed.
  const needsWholeText = backend.streamsTextDeltas ? !!schema : true;
  const id = 'bridge-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  const created = Math.floor(Date.now() / 1000);
  let child = null;
  const onSpawn = (c) => { child = c; };

  // A client that hangs up must not leave a paid generation running.
  res.on('close', () => { if (child && child.exitCode === null) { try { child.kill('SIGTERM'); } catch (_e) { /* gone */ } } });

  log(backendName + ' · ' + (wantsStream ? 'stream' : 'one-shot') + (schema ? '+schema' : '')
    + ' · model=' + (body.model || 'default') + ' · prompt=' + prompt.length + ' chars');

  if (!wantsStream) {
    try {
      const out = await runGeneration({ prompt, system, schema, model: body.model, maxTokens, onSpawn });
      return sendJson(req, res, 200, {
        id,
        object: 'chat.completion',
        created,
        model: out.model,
        choices: [{ index: 0, message: { role: 'assistant', content: out.text }, finish_reason: out.finishReason }],
        usage: withBillingFacts(out.usage, backend, out.costUsd)
      });
    } catch (err) {
      const status = err.status || 502;
      return sendJson(req, res, status,
        errorBody(err.message, err.rateLimited ? 'rate_limit_error' : 'bridge_error'));
    }
  }

  // ── Streaming ──────────────────────────────────────────────────────────────
  // The client's stream guard fails on SILENCE, not on wall clock: a stage that
  // spends four minutes in a thinking block must still look alive. Every CLI
  // frame is activity, and a keepalive comment covers the gaps. `readSseFrames`
  // ignores any line that does not start with `data:`, so a comment is pure
  // liveness — it re-arms the idle window and adds nothing to the payload.
  let headersSent = false;
  let keepalive = null;
  function openStream() {
    if (headersSent) return;
    headersSent = true;
    res.writeHead(200, Object.assign({
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'x-accel-buffering': 'no'
    }, corsHeaders(req)));
    res.write(': bridge open\n\n');
    keepalive = setInterval(() => { try { res.write(': keepalive\n\n'); } catch (_e) { /* closed */ } }, SSE_KEEPALIVE_MS);
  }
  function frame(obj) { try { res.write('data: ' + JSON.stringify(obj) + '\n\n'); } catch (_e) { /* closed */ } }
  function touch() { if (headersSent) { try { res.write(': tick\n\n'); } catch (_e) { /* closed */ } } }
  function closeStream() {
    if (keepalive) clearInterval(keepalive);
    keepalive = null;
    try { res.end(); } catch (_e) { /* closed */ }
  }

  let model = body.model || backend.defaultModelLabel;
  try {
    openStream();
    const out = await runGeneration({
      prompt, system, schema, model: body.model, maxTokens, onSpawn,
      onActivity: touch,
      onModel: (resolved) => { model = resolved; },
      onDelta: (delta) => frame({
        id, object: 'chat.completion.chunk', created, model,
        choices: [{ index: 0, delta: { role: 'assistant', content: delta }, finish_reason: null }]
      })
    });
    model = out.model || model;
    // On claude, the schema path produces no text deltas (the JSON rides a
    // tool_use block), so the accumulated text arrives here as one chunk.
    // Emitting it unconditionally would double the payload; emitting it never
    // would hand a schema-mode streaming client an empty stream — the exact
    // D102 failure. A backend that streams NO deltas at all (codex) is that
    // same case on every request, which is what `streamsTextDeltas` says.
    if (needsWholeText && out.text) {
      frame({
        id, object: 'chat.completion.chunk', created, model,
        choices: [{ index: 0, delta: { role: 'assistant', content: out.text }, finish_reason: null }]
      });
    }
    frame({
      id, object: 'chat.completion.chunk', created, model,
      choices: [{ index: 0, delta: {}, finish_reason: out.finishReason }]
    });
    // Usage rides its own choices-empty chunk — the shape
    // stream_options.include_usage produces, which is what the client reads.
    frame({ id, object: 'chat.completion.chunk', created, model, choices: [], usage: withBillingFacts(out.usage, backend, out.costUsd) });
    res.write('data: [DONE]\n\n');
    closeStream();
  } catch (err) {
    // Mid-stream we cannot change the status code, so the failure rides an
    // `error` SSE frame. readOpenAICompatStream marks that retryable — the same
    // structural outcome as the 429 the pre-stream path returns.
    frame(errorBody(err.message, err.rateLimited ? 'rate_limit_error' : 'bridge_error'));
    closeStream();
  }
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = String(req.url || '');
    const route = url.split('?')[0].replace(/\/+$/, '') || '/';

    // First gate, ahead of every route including the preflight: a denied origin
    // must not learn the shape of this server, and must never reach a spawn.
    if (originRefused(req, res)) return;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders(req));
      return res.end();
    }
    // THE BACKEND LOOKUP (2026-08-19). `rest` is the route the claude branches
    // below have always matched — for the claude backend it IS `route`, so
    // nothing about the live surface moved. A prefixed backend is answered by
    // exactly one thing, on every method and every path under it: the refusal.
    const { name: backendName, backend, rest } = resolveBackendRoute(route);
    if (backend.state !== 'live') {
      // Including /healthz and /models. A scaffolded backend answering a health
      // probe with 200 would tell eval-bench's bridgeIsUp() (which reads
      // res.ok) that a backend spawning nothing is up, and model discovery
      // answering 200 would let the door look configured. The reason arrives at
      // the earliest possible touch instead.
      return backendNotImplemented(req, res, backendName, backend);
    }

    if (req.method === 'GET' && (rest === '/healthz' || rest === '/')) {
      return sendJson(req, res, 200, {
        ok: true,
        service: 'liftrpg-bridge',
        format: 'openai-compatible',
        // Additive, and the one place all three states are visible at once.
        // Derived from the table, never restated: a backend that grows a real
        // implementation reports it here by changing one field.
        backends: Object.keys(BACKENDS).map((name) => ({
          name,
          state: BACKENDS[name].state,
          baseUrl: 'http://' + HOST + ':' + (req.socket.localPort || DEFAULT_PORT) + BACKENDS[name].prefix + '/v1',
          blocker: BACKENDS[name].blocker || null
        }))
      });
    }
    // Model discovery: `modelDiscovery:'openai'` fetches <baseUrl>/models. The
    // ids are the CLI's own aliases — the bridge names no concrete model.
    if (req.method === 'GET' && rest === '/v1/models') {
      const aliases = backendName === 'codex' ? CODEX_MODEL_ALIASES : CLI_MODEL_ALIASES;
      const owner = backendName === 'codex' ? 'codex-cli' : 'claude-code-cli';
      return sendJson(req, res, 200, {
        object: 'list',
        data: aliases.map((id) => ({ id, object: 'model', owned_by: owner }))
      });
    }
    if (req.method === 'POST' && rest === '/v1/chat/completions') {
      try {
        return await handleChatCompletions(req, res, backendName);
      } catch (err) {
        log('unhandled request failure:', err && err.message);
        if (!res.headersSent) return sendJson(req, res, 500, errorBody('Bridge failure: ' + (err && err.message)));
        return res.end();
      }
    }
    return sendJson(req, res, 404, errorBody('Bridge: no route for ' + req.method + ' ' + route));
  });
}

async function serve(port) {
  const check = await preflight(port);
  console.log(check.line);                    // FIRST LINE: ready, or the fix.
  if (!check.ok) process.exit(1);
  if (check.detail) log(check.detail);

  const server = createServer();
  server.on('error', (err) => {
    console.log(err && err.code === 'EADDRINUSE'
      ? 'Port ' + port + ' is already in use. Fix: stop the other process, or run with --port <n>.'
      : 'Bridge server error: ' + (err && err.message));
    process.exit(1);
  });
  server.listen(port, HOST, () => {
    log('CORS: loopback origins only'
      + (EXTRA_ALLOWED_ORIGINS.size
        ? ', plus ' + Array.from(EXTRA_ALLOWED_ORIGINS).join(', ')
        : ' (name another with --allow-origin <origin>)'));
    log('POST http://' + HOST + ':' + port + '/v1/chat/completions  (OpenAI-compatible, streaming)');
    // The value the LiftRPG page's Base URL field wants, printed here because
    // the POST line above taught readers to paste the FULL endpoint into it —
    // which the page now also forgives, but the right value should come from
    // the program that knows it (found on the first real deployed-site run).
    log('base URL for the LiftRPG page: http://' + HOST + ':' + port + '/v1');
    log('bench: EVAL_PROVIDER=bridge node scripts/eval-bench.mjs');
    log('POST http://' + HOST + ':' + port + '/codex/v1/chat/completions  (Codex CLI backend)');
    // Best-effort and after the server is already listening, so a slow or
    // missing codex binary delays nothing that matters.
    codexPreflight().then((line) => log(line)).catch(() => { /* never fatal */ });
    // The scaffolded backends announce themselves as scaffolded. The FIRST
    // printed line is still the preflight's (ready, or the exact fix) — that
    // line is the door's quoted contract and is untouched. These sit below it
    // so an operator reading the banner cannot mistake a routed path for a
    // working one. Derived from BACKENDS, so a backend that goes live drops out
    // of this list by changing its `state` and nothing else.
    for (const name of Object.keys(BACKENDS)) {
      const backend = BACKENDS[name];
      if (backend.state === 'live') continue;
      log(name + ' backend: SCAFFOLDED, NOT IMPLEMENTED — http://' + HOST + ':' + port
        + backend.prefix + '/v1/* answers with the reason and spawns nothing. Blocked on: '
        + backend.blocker);
    }
  });
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      log('shutting down; killing ' + liveChildren.size + ' in-flight CLI call(s)');
      killAllChildren('SIGTERM');
      server.close(() => process.exit(0));
      setTimeout(() => { killAllChildren('SIGKILL'); process.exit(0); }, 500);
    });
  }
}

// ── Self-test ────────────────────────────────────────────────────────────────
// No network, no subscription spend, no browser: a fake CLI replays recorded
// stream-json frames and the real server is driven over real HTTP. What it
// proves is the part that cannot be proven by reading — that an exhausted usage
// window arrives at error-classify.js as a RETRYABLE stage error through
// structural markers alone, with no new vocabulary anywhere downstream.

// The fake CODEX cli. Every frame it writes is COPIED FROM A REAL TRANSCRIPT
// captured on 2026-08-19 (the full transcripts are quoted in generateCodex's
// header) — the token counts, the frame order, the item shapes and the
// exits-0-on-failure behaviour are all reproductions, not inventions. That is
// the difference between a fixture and a guess: this replays what the binary
// did, so a parser that passes here parsed the real thing.
//
// It also reports back what it was TOLD — argv and the stdin prompt — because
// the half of this door that cannot be seen from the outside is what actually
// reached the binary, which is exactly where the claude path's dropped
// max_tokens hid for a whole wave.
const FAKE_CODEX_CLI = `#!/usr/bin/env node
const fs = require('fs');
const s = process.env.BRIDGE_CODEX_SCENARIO || 'ok';
const w = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
let stdin = '';
process.stdin.on('data', (d) => { stdin += d; });
process.stdin.on('end', () => {
  w({ type: 'thread.started', thread_id: 'fake-thread' });
  w({ type: 'turn.started' });
  if (s === 'echo-invocation') {
    // The mirror: what the bridge actually built. The schema file is READ from
    // disk, because '--output-schema takes a path' is a claim about the file
    // system, not about argv.
    const i = process.argv.indexOf('--output-schema');
    let schemaText = '';
    if (i !== -1) { try { schemaText = fs.readFileSync(process.argv[i + 1], 'utf8'); } catch (e) { schemaText = 'UNREADABLE'; } }
    w({ type: 'item.completed', item: { id: 'item_0', type: 'agent_message',
      text: JSON.stringify({ argv: process.argv.slice(2), stdin: stdin, schemaText: schemaText }) } });
    w({ type: 'turn.completed', usage: {} });
    process.exit(0);
  }
  if (s === 'api-failure') {
    // VERBATIM from the probe that found the model wall — including the exit
    // code. This CLI exits 0 on a failed turn.
    w({ type: 'item.completed', item: { id: 'item_0', type: 'error',
      message: 'Model metadata for \\\`gpt-5.4\\\` not found. Defaulting to fallback metadata; this can degrade performance and cause issues.' } });
    const inner = JSON.stringify({ type: 'error', status: 400, error: { type: 'invalid_request_error', message: "The 'gpt-5.4' model is not supported when using Codex with a ChatGPT account." } });
    w({ type: 'error', message: inner });
    w({ type: 'turn.failed', error: { message: inner } });
    process.exit(0);
  }
  if (s === 'throttled') {
    const inner = JSON.stringify({ type: 'error', status: 429, error: { type: 'rate_limit_error', message: 'You have hit your usage limit. Try again later.' } });
    w({ type: 'error', message: inner });
    w({ type: 'turn.failed', error: { message: inner } });
    process.exit(0);
  }
  if (s === 'no-message') { w({ type: 'turn.completed', usage: {} }); process.exit(0); }
  if (s === 'schema') {
    w({ type: 'item.completed', item: { id: 'item_0', type: 'agent_message', text: '{"title":"Midnight Iron","weeks":6}' } });
    w({ type: 'turn.completed', usage: { input_tokens: 17311, cached_input_tokens: 0, cache_write_input_tokens: 0, output_tokens: 21, reasoning_output_tokens: 0 } });
    process.exit(0);
  }
  // 'ok' — the plain probe, verbatim.
  w({ type: 'item.completed', item: { id: 'item_0', type: 'error', message: 'a non-fatal notice rides the same frame type as the answer' } });
  w({ type: 'item.completed', item: { id: 'item_0', type: 'agent_message', text: 'PROBE' } });
  w({ type: 'turn.completed', usage: { input_tokens: 17269, cached_input_tokens: 11008, cache_write_input_tokens: 0, output_tokens: 6, reasoning_output_tokens: 0 } });
  process.exit(0);
});
`;

const FAKE_CLI = `#!/usr/bin/env node
const s = process.env.BRIDGE_TEST_SCENARIO || 'ok';
const w = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
let stdin = '';
process.stdin.on('data', (d) => { stdin += d; });
process.stdin.on('end', () => {
  const hasSchema = process.argv.includes('--json-schema');
  // What --model (if anything) actually reached the binary. The bridge can only
  // be caught ignoring a requested model by asking the CLI what it was told.
  const mi = process.argv.indexOf('--model');
  const modelArg = mi === -1 ? 'NONE' : process.argv[mi + 1];
  if (s === 'echo-model') {
    w({ type: 'result', subtype: 'success', is_error: false, result: modelArg, stop_reason: 'end_turn', usage: {} });
    process.exit(0);
  }
  // ── The watchdog scenarios ───────────────────────────────────────────────
  // 'hang' says nothing at all and never exits — the one-shot shape of a hung
  // child, and the case no client-side guard can see (the bridge's own SSE
  // keepalive re-arms the client's idle window forever).
  if (s === 'hang') {
    setTimeout(() => process.exit(0), 120000);
    return;
  }
  // 'hang-mid' speaks, then goes silent forever: the watchdog must re-arm on
  // real bytes and still fire on the silence that follows them.
  if (s === 'hang-mid') {
    w({ type: 'stream_event', event: { type: 'message_start', message: { model: 'claude-fake-1' } } });
    w({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '{"partial":' } } });
    setTimeout(() => process.exit(0), 120000);
    return;
  }
  // 'slow-stream' is the arm that keeps the watchdog honest: a child that takes
  // far longer than the window overall, but never goes quiet inside it, must
  // finish untouched. This is the "long prose stage" a wall-clock cap kills.
  if (s === 'slow-stream') {
    let n = 0;
    const iv = setInterval(() => {
      n++;
      w({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'x' } } });
      if (n >= 10) {
        clearInterval(iv);
        w({ type: 'stream_event', event: { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { input_tokens: 2, output_tokens: 10 } } });
        w({ type: 'result', subtype: 'success', is_error: false, result: 'ignored', stop_reason: 'end_turn',
            usage: { input_tokens: 2, output_tokens: 10 } });
        process.exit(0);
      }
    }, 120);
    return;
  }
  w({ type: 'stream_event', event: { type: 'message_start', message: { model: 'claude-fake-1' } } });
  // Text-only exhaustion: no rate_limit_event at all, only the CLI's prose.
  // This scenario is what proves the fallback, so it must NOT emit the
  // structural frame — otherwise the structural path silently covers for it and
  // a broken fallback passes.
  if (s === 'ratelimit-pre') {
    w({ type: 'result', subtype: 'error_during_execution', is_error: true, result: 'Claude usage limit reached. Your limit will reset at 3pm.', usage: {} });
    process.exit(1);
  }
  // Structural-only exhaustion: the rate_limit_event carries the whole signal
  // and the result frame's wording is generic. This scenario is what proves the
  // structural path independently of any string matching.
  if (s === 'ratelimit-structural') {
    w({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', rateLimitType: 'five_hour', resetsAt: 1786570200 } });
    w({ type: 'result', subtype: 'error_during_execution', is_error: true, result: 'Request failed.', usage: {} });
    process.exit(1);
  }
  w({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'quiet work' } } });
  if (s === 'ratelimit-mid') {
    w({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '{"partial":' } } });
    w({ type: 'rate_limit_event', rate_limit_info: { status: 'rejected', rateLimitType: 'five_hour', resetsAt: 1786570200 } });
    w({ type: 'result', subtype: 'error_during_execution', is_error: true, result: 'Claude usage limit reached.', usage: {} });
    process.exit(1);
  }
  if (s === 'truncated') {
    w({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '{"cut":' } } });
    w({ type: 'stream_event', event: { type: 'message_delta', delta: { stop_reason: 'max_tokens' }, usage: { input_tokens: 10, output_tokens: 20 } } });
    w({ type: 'result', subtype: 'success', is_error: false, result: '{"cut":', stop_reason: 'max_tokens', usage: { input_tokens: 10, output_tokens: 20 } });
    process.exit(0);
  }
  if (hasSchema) {
    w({ type: 'result', subtype: 'success', is_error: false, result: '{"ok":true}', stop_reason: 'tool_use',
        structured_output: { ok: true }, usage: { input_tokens: 7, output_tokens: 3, cache_read_input_tokens: 2 } });
    process.exit(0);
  }
  w({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '{"echo":' } } });
  w({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: JSON.stringify(stdin.trim().slice(0, 20)) + '}' } } });
  w({ type: 'stream_event', event: { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { input_tokens: 11, output_tokens: 5, cache_read_input_tokens: 3 } } });
  w({ type: 'result', subtype: 'success', is_error: false, result: 'ignored', stop_reason: 'end_turn',
      total_cost_usd: 0.0011, usage: { input_tokens: 11, output_tokens: 5, cache_read_input_tokens: 3, output_tokens_details: { thinking_tokens: 4 } } });
  process.exit(0);
});
`;

async function selfTest() {
  const failures = [];
  const ok = (name, cond, detail) => {
    console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (cond || !detail ? '' : ' — ' + detail));
    if (!cond) failures.push(name);
  };

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liftrpg-bridge-selftest-'));
  const fake = path.join(dir, 'fake-claude.mjs');
  fs.writeFileSync(fake, FAKE_CLI);
  fs.chmodSync(fake, 0o755);
  process.env.LIFTRPG_BRIDGE_CLAUDE_BIN = fake;

  // ONE FILE, TWO HOMES (D189): this script ships byte-identical in the private
  // repo (scripts/, beside public/) and the public repo (scripts/, beside
  // generator/) — build:gold-disk copies it verbatim. Probe both layouts so the
  // copy needs no path rewrite; a rewrite step is how the copies drifted a
  // whole watchdog apart.
  const classifyCandidates = [
    '../public/generator/modules/error-classify.js',
    '../generator/modules/error-classify.js'
  ];
  let classify = null;
  for (const candidate of classifyCandidates) {
    try { classify = await import(candidate); break; } catch (e) {
      if (e && e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
    }
  }
  if (!classify) throw new Error('self-test cannot locate error-classify.js from either repo layout');

  const server = createServer();
  await new Promise((r) => server.listen(0, HOST, r));
  const port = server.address().port;
  const base = 'http://' + HOST + ':' + port;
  const post = (body, scenario) => {
    process.env.BRIDGE_TEST_SCENARIO = scenario || 'ok';
    return fetch(base + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer unused' },
      body: JSON.stringify(body)
    });
  };
  const msg = [{ role: 'user', content: 'stage prompt' }];

  console.log('Bridge self-test — fake CLI, real server, real error-classify.js\n');

  // 1. Preflight: CORS + Private Network Access, for an origin that is allowed.
  const preflightFrom = (origin) => fetch(base + '/v1/chat/completions', {
    method: 'OPTIONS',
    headers: { origin, 'access-control-request-private-network': 'true' }
  });
  const opt = await preflightFrom('http://localhost:8081');
  ok('OPTIONS preflight answers 204', opt.status === 204, 'got ' + opt.status);
  ok('preflight allows the private network', opt.headers.get('access-control-allow-private-network') === 'true');
  ok('preflight echoes a loopback origin', opt.headers.get('access-control-allow-origin') === 'http://localhost:8081');
  ok('preflight varies on origin', (opt.headers.get('vary') || '').toLowerCase().includes('origin'));

  // 1b. THE DENIAL GATE. The bridge spends a subscription, so an origin it does
  // not know must get no allow-origin header, no private-network grant, and no
  // spawn. Every assertion here is one a blanket `origin || '*'` would fail.
  const denied = await preflightFrom('https://evil.example');
  ok('a foreign origin is refused at the preflight', denied.status === 403, 'got ' + denied.status);
  ok('a foreign origin gets NO allow-origin echo',
    denied.headers.get('access-control-allow-origin') === null,
    'echoed: ' + denied.headers.get('access-control-allow-origin'));
  ok('a foreign origin gets NO private-network grant',
    denied.headers.get('access-control-allow-private-network') === null);

  // A POST is the request that costs money. It must die before generate().
  const deniedPost = await fetch(base + '/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    body: JSON.stringify({ model: 'default', messages: msg })
  });
  const deniedBody = await deniedPost.json();
  ok('a foreign origin cannot spend a generation', deniedPost.status === 403, 'got ' + deniedPost.status);
  ok('a foreign origin gets NO allow-origin echo on POST',
    deniedPost.headers.get('access-control-allow-origin') === null);
  ok('the refusal names the origin and the flag that would allow it',
    /evil\.example/.test((deniedBody.error || {}).message || '')
    && /--allow-origin/.test((deniedBody.error || {}).message || ''));
  ok('a foreign origin never reaches the CLI',
    !deniedBody.choices && (deniedBody.error || {}).type === 'origin_not_allowed');

  // Lookalike hostnames are the whole reason the check parses instead of
  // matching: these three are public origins that a substring test reads as
  // loopback, and each one would be a live token-theft door.
  for (const lookalike of [
    'http://localhost.evil.example',
    'https://127.0.0.1.evil.example',
    'http://notlocalhost:8081'
  ]) {
    const res = await preflightFrom(lookalike);
    ok(`'${lookalike}' is not treated as loopback`,
      res.status === 403 && res.headers.get('access-control-allow-origin') === null,
      'status ' + res.status + ', echoed ' + res.headers.get('access-control-allow-origin'));
  }

  // Every loopback spelling the bench or the W8 door could arrive as.
  for (const loopback of ['http://127.0.0.1:8081', 'http://localhost:5173', 'https://localhost:8443']) {
    const res = await preflightFrom(loopback);
    ok(`'${loopback}' is allowed`,
      res.status === 204 && res.headers.get('access-control-allow-origin') === loopback,
      'status ' + res.status + ', echoed ' + res.headers.get('access-control-allow-origin'));
  }

  // 1c. THE W8 DOOR: --allow-origin, through the flag's own implementation.
  // Asserted denied FIRST, so this proves the flag rather than the default.
  const siteOrigin = 'https://liftrpg.co';
  const beforeFlag = await preflightFrom(siteOrigin);
  ok('the site origin is denied until it is named', beforeFlag.status === 403, 'got ' + beforeFlag.status);
  ok('--allow-origin accepts a well-formed origin', allowOrigin(siteOrigin) === true);
  ok('--allow-origin rejects a non-origin', allowOrigin('liftrpg.co') === false);
  const afterFlag = await preflightFrom(siteOrigin);
  ok('a named origin is echoed', afterFlag.headers.get('access-control-allow-origin') === siteOrigin,
    'echoed: ' + afterFlag.headers.get('access-control-allow-origin'));
  ok('a named origin gets the private-network grant',
    afterFlag.headers.get('access-control-allow-private-network') === 'true');
  // Naming one origin must not open the rest.
  const stillDenied = await preflightFrom('https://evil.example');
  ok('naming one origin does not allow another', stillDenied.status === 403, 'got ' + stillDenied.status);
  EXTRA_ALLOWED_ORIGINS.delete(siteOrigin);
  ok('the allow-list is exact (removing it denies again)',
    (await preflightFrom(siteOrigin)).status === 403);

  // 1e. The SECOND layer, asserted directly because the first one hides it.
  // originRefused answers 403 before any route runs, so no HTTP request can
  // reach corsHeaders carrying a denied origin — which means an HTTP-level
  // assertion passes whatever that function does, and a leak there would ship
  // green. (Mutation-tested: loosening corsHeaders alone is invisible from the
  // wire.) These two call it with a synthetic request instead.
  const headersFor = (origin) => corsHeaders({ headers: origin ? { origin } : {} });
  ok('corsHeaders emits nothing for a denied origin, independently of the 403',
    !('access-control-allow-origin' in headersFor('https://evil.example'))
    && !('access-control-allow-private-network' in headersFor('https://evil.example')),
    JSON.stringify(headersFor('https://evil.example')));
  ok('corsHeaders still echoes a loopback origin',
    headersFor('http://127.0.0.1:8081')['access-control-allow-origin'] === 'http://127.0.0.1:8081');

  // 1d. No Origin at all is the Node client, and it is served normally with no
  // CORS headers — their absence is what every test below silently depends on.
  const noOrigin = await fetch(base + '/healthz');
  ok('a request with no Origin is served normally', noOrigin.status === 200);
  ok('a request with no Origin gets no allow-origin header',
    noOrigin.headers.get('access-control-allow-origin') === null);

  // 2. Streaming: the shape readOpenAICompatStream consumes.
  const streamRes = await post({ model: 'default', messages: msg, stream: true });
  const sse = await streamRes.text();
  const deltas = sse.split('\n').filter((l) => l.startsWith('data: ') && l.indexOf('[DONE]') === -1)
    .map((l) => JSON.parse(l.slice(6)));
  const streamedText = deltas.map((d) => ((d.choices || [])[0] || {}).delta)
    .filter(Boolean).map((d) => d.content || '').join('');
  ok('stream returns text/event-stream', (streamRes.headers.get('content-type') || '').includes('text/event-stream'));
  ok('stream carries a keepalive comment', sse.includes(': bridge open'));
  ok('stream assembles the assistant text', streamedText.startsWith('{"echo":'), streamedText.slice(0, 40));
  ok('stream drops thinking deltas', !streamedText.includes('quiet work'));
  ok('stream reports finish_reason stop',
    deltas.some((d) => ((d.choices || [])[0] || {}).finish_reason === 'stop'));
  ok('stream reports usage on a choices-empty chunk',
    deltas.some((d) => d.usage && d.usage.prompt_tokens === 14 && d.usage.completion_tokens === 5),
    JSON.stringify(deltas.find((d) => d.usage) || null));
  ok('stream terminates with [DONE]', sse.trimEnd().endsWith('data: [DONE]'));

  // 3. One-shot + json_schema: the structured stage path.
  const structured = await post({
    model: 'default', messages: msg,
    response_format: { type: 'json_schema', json_schema: { name: 'stage', strict: false, schema: { type: 'object' } } }
  });
  const structuredBody = await structured.json();
  ok('structured call answers 200 chat.completion', structured.status === 200 && structuredBody.object === 'chat.completion');
  ok('structured content is the schema-shaped JSON',
    JSON.parse(structuredBody.choices[0].message.content).ok === true);
  ok('structured usage counts cache reads as input', structuredBody.usage.prompt_tokens === 9);

  // 3b. THE MEASURED-COST CHANNEL. The CLI computes the dollars for its own
  // call; before 2026-08-19 that number was parsed and dropped, so the run
  // panel reported every bridge run as unpriced while the true figure sat in a
  // local variable. All four assertions below are ones the pre-fix bridge fails.
  //
  // The last one is the anti-vacuity arm and matters most: the fake CLI's
  // SCHEMA result frame carries no `total_cost_usd`, exactly as the real one
  // does not. If `cost_usd` appeared there anyway, this channel would be
  // manufacturing a number rather than relaying one — so absence is asserted as
  // hard as presence.
  {
    const plain = await post({ model: 'default', messages: msg });
    const plainBody = await plain.json();
    ok('claude: the CLI\'s own measured cost reaches the wire',
      plainBody.usage.cost_usd === 0.0011, JSON.stringify(plainBody.usage));
    ok('claude: the measured figure is not zero (a real number, not a placeholder)',
      Number(plainBody.usage.cost_usd) > 0);
    ok('claude: the wire declares HOW the door is billed, not just what it cost',
      plainBody.usage.billing_mode === 'measured', plainBody.usage.billing_mode);
    ok('claude: a call the CLI priced NOTHING for carries no cost_usd (schema path)',
      structuredBody.usage.cost_usd === undefined
      && structuredBody.usage.billing_mode === 'measured',
      JSON.stringify(structuredBody.usage));
  }

  // 4. THE GATE: exhaustion before the stream opens -> 429 -> retryable.
  // Two scenarios, because the bridge has two detectors and either one going
  // blind must be visible here. The structural detector (rate_limit_event) is
  // proved by a run whose prose says nothing; the text detector is proved by a
  // run that emits no structural frame at all.
  const structural = await post({ model: 'default', messages: msg }, 'ratelimit-structural');
  const structuralBody = await structural.json();
  ok('structural exhaustion (rate_limit_event only) answers HTTP 429',
    structural.status === 429, 'got ' + structural.status + ' ' + JSON.stringify(structuralBody).slice(0, 160));
  ok('structural exhaustion names the window',
    /usage window exhausted/i.test((structuralBody.error || {}).message || ''));

  const pre = await post({ model: 'default', messages: msg }, 'ratelimit-pre');
  const preBody = await pre.json();
  ok('text-only exhaustion (no rate_limit_event) answers HTTP 429', pre.status === 429, 'got ' + pre.status);
  ok('exhaustion body is the format\'s rate-limit shape', preBody.error && preBody.error.type === 'rate_limit_error');
  // Reproduces exactly what runStreamingRequest builds from this response.
  const transportError = new Error('API error: ' + preBody.error.message);
  transportError.status = pre.status;
  if (pre.status === 429 || pre.status >= 500) transportError.retryable = true;
  ok('error-classify calls it retryable', classify.shouldRetryStageError(transportError) === true);
  ok('error-classify does NOT call it truncation', classify.isLikelyTruncationError(transportError) === false);
  ok('error-classify does NOT send it to the freeform fallback',
    classify.shouldFallbackFromStructured(transportError) === false);

  // 5. THE GATE: exhaustion mid-stream -> error frame -> retryable.
  const mid = await post({ model: 'default', messages: msg, stream: true }, 'ratelimit-mid');
  const midSse = await mid.text();
  const midErr = midSse.split('\n').filter((l) => l.startsWith('data: '))
    .map((l) => JSON.parse(l.slice(6))).find((p) => p.error);
  ok('mid-stream exhaustion emits an error frame', !!midErr && midErr.error.type === 'rate_limit_error');
  // Reproduces readOpenAICompatStream's payload.error branch.
  const midError = new Error('API error: ' + (midErr ? midErr.error.message : ''));
  midError.retryable = true;
  ok('mid-stream error-classify calls it retryable', classify.shouldRetryStageError(midError) === true);

  // 6. Truncation still normalizes through the existing map, not new vocabulary.
  const trunc = await post({ model: 'default', messages: msg, stream: true }, 'truncated');
  const truncSse = await trunc.text();
  ok('max_tokens maps to finish_reason length', truncSse.includes('"finish_reason":"length"'));

  // 7. A model the CLI cannot resolve is fatal and actionable, not retryable.
  const badModel = await post({ model: 'gpt-4o', messages: msg });
  const badBody = await badModel.json();
  ok('an unresolvable model answers 400', badModel.status === 400, 'got ' + badModel.status);
  const badError = new Error('API error: ' + badBody.error.message);
  badError.status = 400;
  ok('an unresolvable model is not mistaken for a structured-output miss',
    classify.shouldFallbackFromStructured(badError) === false, badBody.error.message);
  ok('an unresolvable model is not retried', classify.shouldRetryStageError(badError) === false);

  // 8. Model discovery, for the W8 door.
  const models = await (await fetch(base + '/v1/models')).json();
  ok('/v1/models lists the CLI aliases', Array.isArray(models.data) && models.data.some((m) => m.id === 'sonnet'));

  // 9. Model PASS-THROUGH. Advertising an id on /v1/models and honoring it are
  // different things, and the gap between them is silent: the caller asks for
  // haiku, the bridge passes no --model, the CLI runs its default, and the only
  // evidence is a bench report naming a model nobody selected. Every id the
  // bridge advertises must therefore be shown to REACH the binary.
  const echoModel = async (model) => {
    const res = await post({ model, messages: msg }, 'echo-model');
    return (await res.json()).choices[0].message.content;
  };
  for (const alias of CLI_MODEL_ALIASES.filter((a) => !CLI_DEFAULT_SENTINELS.includes(a))) {
    const got = await echoModel(alias);
    ok(`model '${alias}' reaches the CLI as --model ${alias}`, got === alias, 'CLI was told: ' + got);
  }
  for (const sentinel of ['default', '']) {
    const got = await echoModel(sentinel);
    ok(`model '${sentinel || '(empty)'}' passes no --model (the CLI's own default wins)`,
      got === 'NONE', 'CLI was told: ' + got);
  }
  ok('a full claude-* id reaches the CLI verbatim',
    (await echoModel('claude-sonnet-4-5')) === 'claude-sonnet-4-5');

  // 10. THE INACTIVITY WATCHDOG. A hung child is the failure with no other
  // reader: the client's idle guard is re-armed by the bridge's own keepalive,
  // and the one-shot path has nothing but the stage's wall-clock ceiling. Every
  // request below is bounded by its own abort signal, so a watchdog that never
  // fires FAILS here rather than hanging the self-test.
  const priorIdle = process.env.LIFTRPG_BRIDGE_IDLE_MS;
  process.env.LIFTRPG_BRIDGE_IDLE_MS = '400';
  // The whole exchange — request AND body read — is inside the bound, because
  // a stream's headers land immediately and only the BODY hangs: bounding the
  // fetch alone would let a broken watchdog throw past the assertions instead
  // of failing them.
  const bounded = async (label, body, scenario) => {
    process.env.BRIDGE_TEST_SCENARIO = scenario;
    try {
      const res = await fetch(base + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000)
      });
      return { status: res.status, text: await res.text() };
    } catch (err) {
      ok(label, false, 'never answered: ' + (err && err.message));
      return null;
    }
  };
  const sseFrames = (text) => text.split('\n')
    .filter((l) => l.startsWith('data: ') && l.indexOf('[DONE]') === -1)
    .map((l) => JSON.parse(l.slice(6)));

  // 10a. One-shot: a child that says nothing at all.
  const hung = await bounded('a hung one-shot child is stopped and answered',
    { model: 'default', messages: msg }, 'hang');
  if (hung) {
    const hungBody = JSON.parse(hung.text);
    const hungMessage = (hungBody.error || {}).message || '';
    ok('a hung one-shot child is stopped and answered', hung.status === 502, 'got ' + hung.status);
    ok('the stall answer names the silence and the knob',
      /no output for \d+(?:ms|s)\b/.test(hungMessage) && /LIFTRPG_BRIDGE_IDLE_MS/.test(hungMessage),
      hungMessage);
    // The shaping, read by the real classifier. A stall must be RETRYABLE (the
    // stage burns an attempt and escalates) and must NOT be a throttle — 503
    // here would make the pipeline sit in a backoff wait for a door that is not
    // closed, consuming no attempt and never converging.
    const stallErr = new Error('API error: ' + hungMessage);
    stallErr.status = hung.status;
    if (hung.status === 429 || hung.status >= 500) stallErr.retryable = true;
    ok('a stall classifies as retryable', classify.shouldRetryStageError(stallErr) === true);
    ok('a stall is NOT classified as a throttle', classify.isLikelyThrottleError(stallErr) === false,
      'a throttle waits without consuming an attempt — a hung CLI must consume one');
    ok('a stall is NOT classified as truncation', classify.isLikelyTruncationError(stallErr) === false);
    ok('a stall does NOT send the stage to the freeform fallback',
      classify.shouldFallbackFromStructured(stallErr) === false);
  }
  // Nothing may be left spending the subscription after the answer.
  for (let i = 0; i < 60 && liveChildren.size; i++) await new Promise((r) => setTimeout(r, 50));
  ok('the stopped child is really dead', liveChildren.size === 0, liveChildren.size + ' still live');

  // 10b. Streaming, silent from the start: the failure rides an error frame,
  // which readOpenAICompatStream already marks retryable.
  const hungStream = await bounded('a hung streaming child emits an error frame',
    { model: 'default', messages: msg, stream: true }, 'hang');
  if (hungStream) {
    const hungSse = hungStream.text;
    const hungFrame = sseFrames(hungSse).find((p) => p.error);
    ok('a hung streaming child emits an error frame', !!hungFrame, hungSse.slice(0, 120));
    ok('the streamed stall is not dressed as a rate limit',
      !!hungFrame && hungFrame.error.type === 'bridge_error',
      hungFrame ? hungFrame.error.type : 'no frame');
  }

  // 10c. Streaming that spoke and then went quiet — the watchdog re-arms on
  // real bytes, so this proves it fires on silence AFTER activity, not merely
  // on a child that never started.
  const midHang = await bounded('a stream that goes silent mid-response is stopped',
    { model: 'default', messages: msg, stream: true }, 'hang-mid');
  if (midHang) {
    const midHangSse = midHang.text;
    const midHangFrame = sseFrames(midHangSse).find((p) => p.error);
    ok('a stream that goes silent mid-response is stopped', !!midHangFrame,
      midHangSse.slice(0, 160));
    ok('the partial text it did send still reached the client',
      midHangSse.includes('{\\"partial\\":') || midHangSse.includes('{"partial":'));
  }

  // 10d. THE ANTI-VACUITY ARM. A watchdog that kills healthy long runs is worse
  // than none: this child takes ~1.2s against a 400ms window and must survive,
  // because it never goes quiet for a whole window. This is the assertion that
  // fails if the timer stops being re-armed by child bytes.
  const slow = await bounded('a slow but talking child is NOT killed',
    { model: 'default', messages: msg, stream: true }, 'slow-stream');
  if (slow) {
    const slowSse = slow.text;
    const slowFrames = sseFrames(slowSse);
    const slowText = slowFrames.map((d) => ((d.choices || [])[0] || {}).delta)
      .filter(Boolean).map((d) => d.content || '').join('');
    ok('a slow but talking child is NOT killed', !slowFrames.some((f) => f.error),
      JSON.stringify(slowFrames.find((f) => f.error) || null));
    ok('the slow child\'s whole answer arrives', slowText === 'xxxxxxxxxx', slowText);
    ok('the slow child finishes normally',
      slowFrames.some((d) => ((d.choices || [])[0] || {}).finish_reason === 'stop')
      && slowSse.trimEnd().endsWith('data: [DONE]'));
  }

  // 10e. THE KILL ITSELF, asserted at the source rather than over HTTP. The
  // request path also kills the child when the response closes, which means an
  // HTTP-level assertion stays green even if the watchdog answers and walks
  // away leaving a paid child running (mutation-tested: removing the SIGTERM is
  // invisible from the wire). This one calls generate() directly and reads the
  // child the moment the promise settles.
  process.env.BRIDGE_TEST_SCENARIO = 'hang';
  let watched = null;
  let stallError = null;
  try {
    await generate({ prompt: 'stage prompt', onSpawn: (c) => { watched = c; } });
  } catch (err) { stallError = err; }
  ok('generate() rejects a stalled call at the source', !!stallError && stallError.status === 502,
    stallError ? 'status ' + stallError.status : 'it resolved');
  ok('the stall is flagged as a stall, not a generic CLI failure',
    !!stallError && stallError.stalled === true);
  ok('the child is signalled BEFORE the caller is answered',
    !!watched && (watched.killed === true || watched.exitCode !== null),
    watched ? 'killed=' + watched.killed + ' exitCode=' + watched.exitCode : 'never spawned');
  for (let i = 0; i < 60 && liveChildren.size; i++) await new Promise((r) => setTimeout(r, 50));
  ok('a directly-driven stall leaves nothing running', liveChildren.size === 0,
    liveChildren.size + ' still live');

  // 10f. The knob, and its off switch — both read at CALL time, so a serve
  // process never has to restart to change them.
  process.env.LIFTRPG_BRIDGE_IDLE_MS = '';
  ok('an unset window falls back to the generous default', idleWatchdogMs() === DEFAULT_IDLE_MS);
  process.env.LIFTRPG_BRIDGE_IDLE_MS = '0';
  ok('LIFTRPG_BRIDGE_IDLE_MS=0 disables the watchdog', idleWatchdogMs() === 0);
  process.env.LIFTRPG_BRIDGE_IDLE_MS = 'not-a-number';
  ok('a nonsense window falls back to the default rather than disabling itself',
    idleWatchdogMs() === DEFAULT_IDLE_MS);
  if (priorIdle === undefined) delete process.env.LIFTRPG_BRIDGE_IDLE_MS;
  else process.env.LIFTRPG_BRIDGE_IDLE_MS = priorIdle;

  // 10g. THE STAGE'S OUTPUT CEILING REACHES THE CHILD (2026-08-17).
  // The failure this pins is SILENT by construction: a dropped max_tokens
  // changes nothing observable on the wire — the request succeeds, the answer
  // comes back, and the only symptom is that the D97 budget ladder does not
  // exist on this door and a truncation retry escalates to the same ceiling
  // that just truncated. Asserted on childEnv() itself, which is the one place
  // the ceiling can be seen leaving.
  process.env.ANTHROPIC_API_KEY = 'sk-should-be-stripped';
  const budgeted = childEnv(48000);
  ok('a requested ceiling reaches the child as CLAUDE_CODE_MAX_OUTPUT_TOKENS',
    budgeted.CLAUDE_CODE_MAX_OUTPUT_TOKENS === '48000',
    'got ' + JSON.stringify(budgeted.CLAUDE_CODE_MAX_OUTPUT_TOKENS));
  ok('the ceiling does not resurrect the stripped API key',
    budgeted.ANTHROPIC_API_KEY === undefined);
  // The negative half. A default that ships a ceiling nobody asked for is the
  // same defect pointing the other way, and it would be equally invisible.
  ok('no ceiling requested means no ceiling sent',
    childEnv().CLAUDE_CODE_MAX_OUTPUT_TOKENS === undefined
      && childEnv(0).CLAUDE_CODE_MAX_OUTPUT_TOKENS === undefined
      && childEnv('nonsense').CLAUDE_CODE_MAX_OUTPUT_TOKENS === undefined);
  delete process.env.ANTHROPIC_API_KEY;

  // 10h. The absent stop_reason is guessed LOUDLY. `noteMissingStopReason` is
  // the only thing standing between a masked truncation and a silent one, so a
  // version of it that returns without printing must fail here.
  {
    const said = [];
    const realErr = console.error;
    console.error = (...a) => said.push(a.join(' '));
    try {
      noteMissingStopReason('', 'some text the CLI produced', 'ceiling 1000 tokens');
      noteMissingStopReason('end_turn', 'some text');   // a real signal says nothing
      noteMissingStopReason('', '');                    // no text is not a truncation
    } finally { console.error = realErr; }
    ok('text with no stop_reason warns about masked truncation',
      said.length === 1 && /NO stop_reason/.test(said[0]), said.length + ' line(s)');
  }

  // 11. THE SCAFFOLDED BACKENDS (2026-08-19). Every assertion here runs with
  // ZERO auth and touches NO real binary — which is the whole point: the codex
  // refresh token is dead and gemini has no auth at all, so this is exactly the
  // part of those backends that can be proven today. What it pins is the shape
  // of the refusal, because the two ways this scaffolding could be wrong are
  // both SILENT: a 5xx would be retried three times by the client's own
  // escalation ladder against a backend that can never answer, and a message
  // carrying refusal-plus-forcing-subject vocabulary would be read as a
  // structured-output capability miss and degrade a forced stage to an
  // unforced one.
  for (const scaffolded of ['gemini']) {
    const prefix = BACKENDS[scaffolded].prefix;
    const before = liveChildren.size;
    const res = await fetch(base + prefix + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'default', messages: msg })
    });
    const body = await res.json();
    const message = String((body.error && body.error.message) || '');
    ok(scaffolded + ': the route exists and refuses rather than 404ing',
      res.status !== 404, 'got ' + res.status);
    ok(scaffolded + ': the refusal names itself as not implemented',
      body.error && body.error.type === 'backend_not_implemented',
      JSON.stringify(body).slice(0, 160));
    ok(scaffolded + ': the refusal names what is blocking it',
      message.includes('Blocked on:') && message.length > 80, message.slice(0, 160));
    // THE RETRY SHAPE. 429/503 is a throttle the client waits out without
    // consuming an attempt; >=500 is retryable and burns the whole ladder.
    // A permanent condition must be neither.
    ok(scaffolded + ': the refusal is FATAL, not retryable and not a throttle',
      res.status < 500 && res.status !== 429 && res.status !== 503, 'got ' + res.status);
    ok(scaffolded + ': the refusal reads as no throttle to error-classify.js',
      !classify.isLikelyThrottleError({ status: res.status, message }));
    ok(scaffolded + ': the refusal reads as no structured-output miss',
      classify.structuredOutputRefusalReason(message) === '',
      'matched ' + classify.structuredOutputRefusalReason(message));
    // NOTHING WAS SPAWNED. This is the wave's actual promise.
    ok(scaffolded + ': no child process was spawned', liveChildren.size === before,
      before + ' -> ' + liveChildren.size);

    // Every method and every path under the prefix answers the same way —
    // model discovery and the health probe included, so the door cannot look
    // configured and the bench cannot read a scaffolded backend as up.
    const models = await fetch(base + prefix + '/v1/models');
    ok(scaffolded + ': model discovery refuses too', !models.ok && models.status < 500,
      'got ' + models.status);
    const health = await fetch(base + prefix + '/healthz');
    ok(scaffolded + ': the health probe reports NOT up', !health.ok,
      'got ' + health.status);
  }

  // 11a. THE CODEX BACKEND (2026-08-19), against a fake CLI that REPLAYS the
  // real transcript rather than an invented one. Everything asserted here is
  // either a shape the binary was observed producing, or a fact about what the
  // bridge sends it — the two halves nobody can see from the outside.
  const fakeCodex = path.join(dir, 'fake-codex.cjs');
  fs.writeFileSync(fakeCodex, FAKE_CODEX_CLI);
  fs.chmodSync(fakeCodex, 0o755);
  process.env.LIFTRPG_BRIDGE_CODEX_BIN = fakeCodex;
  const codexPost = (body, scenario) => {
    process.env.BRIDGE_CODEX_SCENARIO = scenario || 'ok';
    return fetch(base + '/codex/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
  };

  {
    const res = await codexPost({ model: 'default', messages: msg }, 'ok');
    const out = await res.json();
    ok('codex: a plain call answers 200 with the assistant message',
      res.status === 200 && out.choices && out.choices[0].message.content === 'PROBE',
      JSON.stringify(out).slice(0, 200));
    ok('codex: a non-fatal item error does not fail the turn',
      out.choices && out.choices[0].finish_reason === 'stop');
    // THE SILENT ONE. codex reports cached tokens INSIDE input_tokens, so
    // adding them (the Anthropic mapping's correct behaviour) would inflate
    // every figure the run panel shows, invisibly and forever.
    ok('codex: cached input is a detail, never added to the prompt total',
      !!out.usage && out.usage.prompt_tokens === 17269 && out.usage.total_tokens === 17275
        && out.usage.prompt_tokens_details.cached_tokens === 11008,
      JSON.stringify(out.usage || null));
    ok('codex: the model reported is the one this door can actually select',
      out.model === 'codex-cli-default', out.model);
    // NOT-METERED IS A CLAIM, NOT A GAP. The client renders this door
    // differently from "we have no pricing row" — the second sentence blames
    // our table for a number that does not exist anywhere. The zero-cost
    // assertion is the load-bearing half: `generateCodex` hardcodes
    // `costUsd: 0`, and a 0 arriving as a DOLLAR AMOUNT would print a
    // subscription run as a free run.
    ok('codex: the door declares itself unmetered rather than merely unpriced',
      out.usage.billing_mode === 'not_metered', out.usage.billing_mode);
    ok('codex: the door names WHY there is no price',
      /subscription/i.test(String(out.usage.billing_source || '')), out.usage.billing_source);
    ok('codex: a zero cost is never shipped as a dollar figure',
      out.usage.cost_usd === undefined, JSON.stringify(out.usage.cost_usd));
  }

  // What reached the binary. The claude path lost its whole budget ladder for a
  // wave by dropping max_tokens silently; this is the same class of check.
  {
    const res = await codexPost({
      model: 'default',
      messages: [{ role: 'system', content: 'SYSTEM-MARKER' }, { role: 'user', content: 'USER-MARKER' }],
      response_format: { type: 'json_schema', json_schema: { schema: { type: 'object', properties: { a: { type: 'string' } } } } }
    }, 'echo-invocation');
    const seen = JSON.parse((await res.json()).choices[0].message.content);
    const argv = seen.argv;
    ok('codex: the invocation carries exec --json and the read-only sandbox',
      argv[0] === 'exec' && argv.includes('--json') && argv.includes('-s')
        && argv[argv.indexOf('-s') + 1] === 'read-only', argv.join(' '));
    // Both of these were learned the hard way: without --skip-git-repo-check the
    // CLI refuses to run in os.tmpdir(), and without --ignore-user-config the
    // user's config-pinned model failed EVERY call with a 400.
    ok('codex: --skip-git-repo-check is sent (children run outside a repo)',
      argv.includes('--skip-git-repo-check'));
    ok('codex: --ignore-user-config is sent (the config-pinned model 400s)',
      argv.includes('--ignore-user-config'));
    ok('codex: no --model is sent for the default sentinel',
      argv.indexOf('-m') === -1 && argv.indexOf('--model') === -1, argv.join(' '));
    // No system-prompt flag exists, so the system message must be IN the prompt
    // or it was silently discarded — and the model would never see it.
    ok('codex: the system message is folded into the prompt, not dropped',
      seen.stdin.includes('SYSTEM-MARKER') && seen.stdin.includes('USER-MARKER')
        && seen.stdin.includes('END INSTRUCTIONS'), seen.stdin.slice(0, 120));
    // --output-schema takes a PATH. Asserted by reading the file back.
    ok('codex: the schema reaches the CLI as a readable FILE, not inline JSON',
      argv.includes('--output-schema') && seen.schemaText.includes('"properties"'),
      seen.schemaText.slice(0, 120));
  }
  {
    const res = await codexPost({ model: 'gpt-5-codex', messages: msg }, 'echo-invocation');
    const seen = JSON.parse((await res.json()).choices[0].message.content);
    ok('codex: a requested model reaches the binary verbatim',
      seen.argv[seen.argv.indexOf('-m') + 1] === 'gpt-5-codex', seen.argv.join(' '));
  }

  // THE EXIT-CODE TRAP. The real CLI exits 0 on a failed turn, so a wrapper
  // keyed on the exit code reports an API rejection as a successful empty
  // generation. This is the assertion that catches that, and the fake exits 0
  // exactly as the binary did.
  {
    const res = await codexPost({ model: 'default', messages: msg }, 'api-failure');
    const out = await res.json();
    ok('codex: a failed turn is a failure even though the CLI exits 0',
      res.status !== 200 && out.error, res.status + ' ' + JSON.stringify(out).slice(0, 120));
    ok('codex: the API\'s own message is unwrapped from the JSON envelope',
      /not supported when using Codex/.test(String(out.error.message)),
      String(out.error.message).slice(0, 160));
    // A permanent 400 must not be retried three times with an escalating budget.
    ok('codex: the API\'s own status is propagated, so a 400 is not retried',
      res.status === 400, 'got ' + res.status);
    ok('codex: a permanent failure is not shaped as a throttle',
      !classify.isLikelyThrottleError({ status: res.status, message: String(out.error.message) }));
  }
  {
    const res = await codexPost({ model: 'default', messages: msg }, 'throttled');
    const out = await res.json();
    ok('codex: a quota wall arrives as a structural 429 the client already retries',
      res.status === 429 && out.error.type === 'rate_limit_error',
      res.status + ' ' + JSON.stringify(out.error).slice(0, 120));
  }
  {
    const res = await codexPost({ model: 'default', messages: msg }, 'no-message');
    const out = await res.json();
    ok('codex: a turn with no assistant message is an error, never an empty success',
      res.status !== 200 && /no assistant message/.test(String(out.error.message)),
      res.status + ' ' + JSON.stringify(out).slice(0, 140));
  }

  // Streaming. This CLI emits NO incremental deltas, so the danger is the D102
  // one: a streaming client handed an empty stream. The accumulated text must
  // arrive as a chunk on EVERY request, not only the schema ones.
  {
    process.env.BRIDGE_CODEX_SCENARIO = 'schema';
    const res = await fetch(base + '/codex/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'default', stream: true, messages: msg })
    });
    const raw = await res.text();
    const chunks = raw.split('\n').filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'))
      .map((l) => { try { return JSON.parse(l.slice(6)); } catch (_e) { return null; } }).filter(Boolean);
    const streamed = chunks.map((c) => (c.choices && c.choices[0] && c.choices[0].delta || {}).content || '').join('');
    ok('codex: a streaming request carries the whole answer, not an empty stream',
      streamed.includes('Midnight Iron'), JSON.stringify(streamed).slice(0, 160));
    ok('codex: the stream still closes with a finish reason and a usage frame',
      chunks.some((c) => c.choices && c.choices[0] && c.choices[0].finish_reason === 'stop')
        && chunks.some((c) => c.usage && c.usage.prompt_tokens === 17311)
        && raw.includes('[DONE]'));
    ok('codex: the answer is not duplicated across chunks',
      (streamed.match(/Midnight Iron/g) || []).length === 1, streamed.slice(0, 160));
  }
  {
    const models = await (await fetch(base + '/codex/v1/models')).json();
    ok('codex: model discovery advertises only what this door can select',
      Array.isArray(models.data) && models.data.length === 1 && models.data[0].id === 'default',
      JSON.stringify(models.data));
  }

  // 11b. THE CLAUDE SURFACE IS UNMOVED. The prefix lookup runs in front of
  // every claude route, so the regression to fear is that it swallowed one.
  const liveModels = await (await fetch(base + '/v1/models')).json();
  ok('claude: /v1/models still lists the CLI aliases',
    Array.isArray(liveModels.data) && liveModels.data.some((m) => m.id === 'sonnet'));
  const rootHealth = await fetch(base + '/healthz');
  const rootBody = await rootHealth.json();
  ok('claude: /healthz is still ok and still names the service and format',
    rootHealth.status === 200 && rootBody.ok === true
      && rootBody.service === 'liftrpg-bridge' && rootBody.format === 'openai-compatible');
  ok('/healthz reports every backend\'s true state',
    Array.isArray(rootBody.backends) && rootBody.backends.length === 3
      && rootBody.backends.find((b) => b.name === 'claude').state === 'live'
      && rootBody.backends.find((b) => b.name === 'codex').state === 'live'
      && rootBody.backends.find((b) => b.name === 'gemini').state === 'scaffolded',
    JSON.stringify(rootBody.backends || null).slice(0, 200));
  // An unknown prefix is still a 404 — the lookup must not adopt every path.
  const unknown = await fetch(base + '/openai/v1/models');
  ok('an unnamed prefix is still a 404, not a backend', unknown.status === 404,
    'got ' + unknown.status);

  await new Promise((r) => server.close(r));
  fs.rmSync(dir, { recursive: true, force: true });

  console.log('\n' + (failures.length ? 'SELF-TEST FAILED: ' + failures.join(', ') : 'Self-test green.'));
  process.exit(failures.length ? 1 : 0);
}

// ── Entry ────────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv);
if (args.mode === 'self-test') {
  await selfTest();
} else if (args.mode === 'preflight') {
  const check = await preflight(args.port);
  console.log(check.line);
  if (check.detail) log(check.detail);
  process.exit(check.ok ? 0 : 1);
} else {
  await serve(args.port);
}
