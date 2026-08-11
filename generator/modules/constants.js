// ── Shared constants for the API generation pipeline ─────────────────────────
// Single source of truth for enums, provider config, and tuning values.
// Every module in the pipeline imports from here — never duplicate these.

export var DEFAULT_TIMEOUT_MS = 600000; // 10 minutes — long frontier-model stages often exceed 5m
export var MAX_OUTPUT_TOKENS = 64000;   // max supported by Claude Sonnet 4.6 — generous ceiling, only pay for generated

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
  VALID_COMPANION_TYPES,
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
  RECKONING_THRESHOLD_RATIO
} from '../../contracts/contract-constants.mjs';

export {
  SCHEMA_VERSION,
  ACCEPTED_SCHEMA_VERSIONS,
  DOCUMENT_TYPE_ENUM,
  DOCUMENT_TYPE_ALIASES,
  VALID_MAP_TYPES,
  VALID_COMPANION_TYPES,
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
  RECKONING_THRESHOLD_RATIO
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
