// ── Shared constants for the API generation pipeline ─────────────────────────
// Single source of truth for enums, provider config, and tuning values.
// Every module in the pipeline imports from here — never duplicate these.

export var DEFAULT_TIMEOUT_MS = 600000; // 10 minutes — long frontier-model stages often exceed 5m
export var MAX_OUTPUT_TOKENS = 64000;   // hard ceiling for a single stage; only generated tokens are billed

// ── Streaming transport windows (format-agnostic) ────────────────────────────
// Every streaming transport shares these. Wall-clock is the WRONG failure signal for
// a stream: a legitimate 24k-token completion at a conservative 20 tok/s runs
// ~20 minutes, while a dead socket produces no bytes at all. So the transport
// fails fast on SILENCE and stays patient with PROGRESS:
//
//   connect  — no response headers within this window  -> abort (server unreachable)
//   idle     — no bytes for this long mid-stream       -> abort (connection died)
//   overall  — absolute ceiling regardless of progress -> abort (runaway)
//
// The caller's per-stage requestTimeoutMs is treated as ADVISORY on this path:
// it is clamped into [STREAM_MIN_OVERALL_MS, STREAM_MAX_OVERALL_MS]
// and used as the overall cap only. Idle is the real guard.
export var STREAM_CONNECT_TIMEOUT_MS = 90000;       // 90s to first response headers
export var STREAM_IDLE_TIMEOUT_MS = 120000;  // 2m of total silence mid-stream
export var STREAM_MIN_OVERALL_MS = 600000;   // never cap a live stream below 10m
export var STREAM_MAX_OVERALL_MS = 1800000;          // 30m absolute ceiling

// ── Per-stage token / timeout ladder (single source) ─────────────────────────
// THE LADDER LIVES HERE. Do not hand-write maxTokens/requestTimeoutMs literals
// at stage call sites — pass a stage budget key instead (see stageBudget() in
// api-generator.js), which also owns retry escalation.
//
// Ceilings are ~3-4x the output measured across the three real Anthropic S+F
// runs (docs/plans/2026-03-28-gemini-flash-pipeline-optimization-audit.md §2:
// skeleton ~6.9k, rules ~0.8k, week ~4.3k, fragments ~12.2k bundled, endings
// ~7.4k bundled). Timeouts are sized so the ceiling is actually REACHABLE at a
// conservative ~20 tok/s planning floor — the pairing the old blanket
// 64000-tokens/120000-ms configuration could never satisfy.
//
// INVARIANT: retries escalate. A retry must never get less budget than the
// attempt it is replacing (the Story Plan stage previously shrank 420s -> 300s
// on retry, which is how a slow-but-healthy generation got killed twice).
export var STAGE_BUDGETS = {
  // Shared by both pipelines (§11 Wave 1.5). One structured object of short
  // strings — roughly 25-35 one-line facts. Cheaper than any prose stage by
  // construction, and an explicit row rather than the silent MAX_OUTPUT_TOKENS
  // fallback a missing key would take (D97).
  knowing:    { maxTokens: 12000, timeoutMs: 300000 },
  // Canonicalize (§11 Wave 5). Shared by both pipelines, and the only stage
  // whose output size is set by the USER'S input rather than by the book: a
  // six-week program with six sessions a week is a few hundred short strings.
  // Generous on tokens because truncation here silently drops training weeks,
  // and short on wall clock because it is transcription, not composition.
  canonicalize: { maxTokens: 16000, timeoutMs: 300000 },
  // Skeleton+Flesh
  skeleton:   { maxTokens: 24000, timeoutMs: 600000 },
  rules:      { maxTokens: 12000, timeoutMs: 300000 },
  week:       { maxTokens: 24000, timeoutMs: 600000 },
  fragments:  { maxTokens: 40000, timeoutMs: 900000 },
  endings:    { maxTokens: 24000, timeoutMs: 480000 },
  // Multi-stage / structured
  layerBible: { maxTokens: 24000, timeoutMs: 600000 },
  campaign:   { maxTokens: 24000, timeoutMs: 600000 },
  shell:      { maxTokens: 16000, timeoutMs: 420000 },
  fragment:   { maxTokens: 24000, timeoutMs: 480000 },
  // Critic loop (D66). Both rows were sized before the critic had eight
  // dimensions and machine findings, and both were the smallest rows in the
  // ladder while doing the ladder's largest reading. Measured against real
  // six-week books (Book 1 glassworks, Eastern Shore, what-the-soil-remembers):
  //
  //   critic         input  ~26-38k tokens of digest.
  //                  output a verdict over 8 dimensions, each carrying >=2
  //                  evidence entries (evidence law) plus one failure object
  //                  per weakness. A PASSING verdict is ~700 tokens; the
  //                  verdict that matters is a FAILING one, and a heavy round
  //                  (4 evidence + 5 failures per dimension, pretty-printed as
  //                  models emit it) measures ~6.2k tokens. 8000 gave that
  //                  round no headroom at all — and none whatsoever on a model
  //                  that spends part of the same ceiling thinking.
  //   critic-revise  output is ONE COMPLETE UNIT returned whole, and the
  //                  largest unit is a week: 5.4k tokens compact on Book 1
  //                  (~7k as pretty-printed JSON), and a revision is usually
  //                  longer than the thing it revises. 16000 budgeted the
  //                  rewrite of a week BELOW the 24000 the `week` row spends
  //                  writing one, which is incoherent — a stage may not be
  //                  asked to reproduce an object it cannot afford to emit.
  //
  // Both now follow the ladder's own rule (~3-4x measured output) and pair
  // with a timeout that reaches the ceiling at the conservative ~20 tok/s floor.
  critic:         { maxTokens: 24000, timeoutMs: 480000 },
  'critic-revise': { maxTokens: 24000, timeoutMs: 600000 }
};

// Retry escalation: each attempt gets more wall clock than the last, and a
// truncated attempt gets its token ceiling raised to MAX_OUTPUT_TOKENS.
export var RETRY_TIMEOUT_GROWTH = 1.5;
export var RETRY_TIMEOUT_CEILING_MS = 1200000; // 20m — no retry waits longer

// ── Provider presets ─────────────────────────────────────────────────────────

export var PROVIDERS = {
  anthropic: {
    label: 'Claude (Anthropic)',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-6',
    format: 'anthropic',
    modelDiscovery: 'anthropic'
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    format: 'openai',
    modelDiscovery: 'openai'
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    format: 'openai',
    modelDiscovery: 'openai'
  },
  ollama: {
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    format: 'openai',
    modelDiscovery: 'ollama',
    noKey: true
  },
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-pro',
    format: 'openai',
    modelDiscovery: 'gemini'
  },
  custom: {
    label: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    defaultModel: '',
    format: 'openai',
    modelDiscovery: 'openai'
  }
};

// ── Rate limiting & budget ───────────────────────────────────────────────────

export var BUDGET_KEY = 'liftrpg_api_daily_budget';
export var RATE_WINDOW_MS = 60000;   // 1 minute
export var RATE_MAX_CALLS = 5;       // 5 calls per minute (Gemini free tier)
export var DAILY_CALL_LIMIT = 20;    // Gemini free tier: 20 API calls/day

// ── Checkpointing ────────────────────────────────────────────────────────────

export var CHECKPOINT_STORAGE_KEY = 'liftrpg_pipeline_checkpoint';

// ── Schema enums ─────────────────────────────────────────────────────────────
// Single source of truth: contracts/contract-constants.mjs (synced to
// public/contracts/ by build:gold-disk). These re-exports keep existing import
// sites stable. NEVER define enum values here.

import {
  SCHEMA_VERSION,
  ACCEPTED_SCHEMA_VERSIONS,
  DOCUMENT_TYPE_ENUM,
  DOCUMENT_TYPE_ALIASES,
  VALID_MAP_TYPES,
  VALID_EDGE_SEMANTICS,
  VALID_CELL_SHAPES,
  VALID_COMPONENT_DIALECTS,
  DEFAULT_COMPONENT_DIALECT,
  SPATIAL_GUARDRAILS,
  VALID_COMPANION_TYPES,
  DEMOTED_COMPANION_TYPES,
  GENERATION_COMPANION_MENU,
  VALID_CLOCK_TYPES,
  VALID_ARCHETYPES,
  THEME_ARCHETYPE_ALIASES,
  ORACLE_ROLL_BANDS,
  VALID_PAYLOAD_TYPES as PAYLOAD_TYPE_LIST,
  VALID_SHELL_FAMILIES,
  VALID_BOARD_STATE_MODES,
  VALID_ATTACHMENT_STRATEGIES,
  PERCENTILE_STAT,
  VALID_WORKSPACE_STYLES,
  WORKSPACE_STYLE_ALIASES,
  DEFAULT_WORKSPACE_STYLE,
  MARK_STRIP,
  MARK_STRIP_TARGET_KINDS,
  RECKONING_SINK_KINDS,
  RECKONING_THRESHOLD_RATIO,
  OUTPUT_BUDGETS,
  LUDIC_LIBRARY,
  LUDIC_LIBRARY_ATOMS,
  VALID_DYNAMIC_MARKINGS,
  SPINE_BUDGETS,
  SURFACE_REF_KINDS,
  SURFACE_REF_SINGLETONS,
  parseSurfaceRef,
  VALID_GATE_STRUCTURES,
  GATE_STRUCTURE_SHAPES,
  VALID_LEGACY_MOVES,
  BRANCH_OPTIONS,
  BRANCH_REF_PATTERN,
  parseBranchRef,
  PIPELINE_DEBRIS_KEYS,
  readPipelineDebris,
  writePipelineDebris
} from '../../contracts/contract-constants.mjs';

export {
  SCHEMA_VERSION,
  ACCEPTED_SCHEMA_VERSIONS,
  DOCUMENT_TYPE_ENUM,
  DOCUMENT_TYPE_ALIASES,
  VALID_MAP_TYPES,
  // Wave 3 map variant axes + the component dialect. Re-exported for the same
  // reason every other enum here is: one home, stable import sites.
  VALID_EDGE_SEMANTICS,
  VALID_CELL_SHAPES,
  VALID_COMPONENT_DIALECTS,
  DEFAULT_COMPONENT_DIALECT,
  SPATIAL_GUARDRAILS,
  // VALID_* is the schema's acceptance set; DEMOTED/MENU is the generation
  // axis. A menu narrowing (D122c) never touches acceptance — old books keep
  // validating and rendering. The menu is derived in contract-constants.mjs.
  VALID_COMPANION_TYPES,
  DEMOTED_COMPANION_TYPES,
  GENERATION_COMPANION_MENU,
  VALID_CLOCK_TYPES,
  VALID_ARCHETYPES,
  THEME_ARCHETYPE_ALIASES,
  ORACLE_ROLL_BANDS,
  VALID_SHELL_FAMILIES,
  VALID_BOARD_STATE_MODES,
  VALID_ATTACHMENT_STRATEGIES,
  PERCENTILE_STAT,
  VALID_WORKSPACE_STYLES,
  WORKSPACE_STYLE_ALIASES,
  DEFAULT_WORKSPACE_STYLE,
  // Mark economy (Session 1 / D89) — markStrip shape, machine-only target
  // kinds, Reckoning sink vocabulary, derived-threshold ratio.
  MARK_STRIP,
  MARK_STRIP_TARGET_KINDS,
  RECKONING_SINK_KINDS,
  RECKONING_THRESHOLD_RATIO,
  // Prose caps (Teeth Round T1a). Hoisted to contract-constants when breaches
  // became stage-blocking: api-generator.js reads them through here to stamp
  // maxLength onto the structured schemas the compat transports enforce.
  OUTPUT_BUDGETS,
  // ── The Ludic Spine (W4a) ──────────────────────────────────────────────
  // The play vocabulary and its one ref grammar. Re-exported, never
  // re-declared: parseSurfaceRef has a single home (D93) and the floors, the
  // prompt-parity pass, and the W4b simulated player all reach it through
  // this seam.
  LUDIC_LIBRARY,
  LUDIC_LIBRARY_ATOMS,
  VALID_DYNAMIC_MARKINGS,
  SPINE_BUDGETS,
  SURFACE_REF_KINDS,
  SURFACE_REF_SINGLETONS,
  parseSurfaceRef,
  // ── The Ludic Harvest, tranche 1 (W5a) ────────────────────────────────
  // The tier-2 patterns that landed a declaration surface. Same seam, same
  // rule: parseBranchRef has one home beside parseSurfaceRef, because a
  // second branch parser is a second answer to "which side is this".
  VALID_GATE_STRUCTURES,
  GATE_STRUCTURE_SHAPES,
  VALID_LEGACY_MOVES,
  BRANCH_OPTIONS,
  BRANCH_REF_PATTERN,
  parseBranchRef,
  // ── Pipeline debris (D128) ─────────────────────────────────────────────
  // `_x` is the only lawful home for non-contract data and always was; the
  // pipelines wrote ten keys at top level anyway, where the schema rejects
  // every one. write/read are the seam that makes the move total.
  PIPELINE_DEBRIS_KEYS,
  readPipelineDebris,
  writePipelineDebris
};

export var SUPPORTED_THEME_ARCHETYPES = VALID_ARCHETYPES.reduce(function (acc, name) {
  acc[name] = true;
  return acc;
}, {});

// Legacy object-map shape retained for existing call sites.
export var VALID_PAYLOAD_TYPES = PAYLOAD_TYPE_LIST.reduce(function (acc, name) {
  acc[name] = 1;
  return acc;
}, {});

// ── Composition critic loop (the conductor's ears) ──────────────────────────
// The critic grades the ASSEMBLED booklet on the compositional commitments
// prompt_rules.js already demands, then drives targeted unit revisions until
// every dimension clears the threshold or the round cap is hit (D66).
// Dimension ids must match the rubric in prompt_rules.js buildCriticPrompt
// (generator tests assert the parity).
export var CRITIC_SCORE_THRESHOLD = 90;
export var CRITIC_MAX_ROUNDS = 3;
export var CRITIC_MAX_REVISIONS_PER_ROUND = 6;
export var CRITIC_DIMENSIONS = [
  { id: 'arcIntegrity', name: 'Arc Integrity' },
  { id: 'systemIntegration', name: 'System Integration' },
  { id: 'clueEconomy', name: 'Clue Economy & Mystery' },
  { id: 'motifPayoff', name: 'Motif Payoff' },
  { id: 'worldCohesion', name: 'World Cohesion' },
  { id: 'briefFidelity', name: 'Brief Fidelity & Register' },
  { id: 'fusionPacing', name: 'Fusion & Pacing' },
  // Voice discipline (docs/voice/VOICE.md): the critic is the audit seat for
  // the prose laws no regex can reach — multi-hand distinctness, terminal
  // position, unlicensed genre moves. The B-class tic scan feeds it facts.
  { id: 'voiceDiscipline', name: 'Voice Discipline' }
];

// ── Structural revision reach (Teeth T4 — the surgeon) ──────────────────────
// The three-tier fix loop is law: code derives (silent) -> stage retries
// correct (Correction Directive) -> the critic revises (grade->revise->regrade).
// Tier 3 used to be able to reword a unit and nothing else, so a finding whose
// cause was the unit's SHAPE could only ever retint sentences. It was
// commentary. A failure may now declare `scope: "structure"`, and name which
// aspects of the unit the reviser may RE-DECIDE, from this closed menu.
//
// The menu is deliberately the FUSION.md mechanism vocabulary (docs/craft/
// FUSION.md §4) rather than a list of schema fields: a reviser told "you may
// re-decide weeks[3].gameplayClocks[0].clockType" edits a field, while one told
// "the mechanical assignment is reopened" re-decides which surface carries the
// week's pressure. The constitution names the moves; the surgery uses its names.
//
// SINGLE HOME. modules/critic.js normalizes against these ids and prompt_rules.js
// states them to the model in TWO places — the failure contract (how to declare
// one) and the revision prompt (what re-deciding each one licenses). Generator
// tests assert the three surfaces agree, the same parity CRITIC_DIMENSIONS has.
export var STRUCTURAL_REOPEN_SCOPES = [
  { id: 'beat', name: 'the declared beat',
    licenses: 'what this unit is ABOUT may change — its position in the arc, what is at '
      + 'risk in it, what it converges or postpones' },
  { id: 'dynamics', name: 'the dynamic marking',
    licenses: 'how loudly this unit SPEAKS may change — its prose volume and register '
      + 'against the training load of its week, including cutting it shorter' },
  { id: 'motif', name: 'the motif carried',
    licenses: 'which recurring object, place, or phrase this unit carries may change, and '
      + 'what that object means at this point in the book' },
  { id: 'mechanism', name: 'the mechanical assignment',
    licenses: 'which printed surface carries this unit\'s pressure may change — what the '
      + 'clock, oracle, door, cipher, or strip is keyed to and what it answers' },
  // ── The ludic scopes (W4b) ───────────────────────────────────────────────
  // The first four are the FUSION vocabulary: they let a reviser re-decide what
  // a unit is and how it sounds. None of them can re-decide how the unit is
  // WIRED, and that is precisely the class of finding the simulated player
  // produces — a dead sink, a key that arrives too late, a week that asks
  // nothing. Routing a sim finding through `mechanism` would license "re-key
  // the clock" when the defect is "nothing reads the clock", which is a
  // different edit on a different object.
  //
  // Three, not one, for the same reason there are four above rather than one
  // "structure": the reviser is told what is open and everything else is
  // frozen, so a scope that meant "the play is reopened" would unfreeze the
  // whole unit on every finding.
  { id: 'economy', name: 'the economic wiring',
    licenses: 'where this unit\'s value flows may change — what its marks bank into, what its '
      + 'spend buys, and which surface downstream reads the result' },
  { id: 'gate', name: 'the gate and its key',
    licenses: 'what this unit locks and what opens it may change — which key the player must '
      + 'already hold, and how far ahead of the lock they can hold it' },
  { id: 'decision', name: 'the decision offered',
    licenses: 'what this unit asks the player to CHOOSE may change — whether it forks at all, '
      + 'and what mechanically differs across the branches' }
];
