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
// These must stay in sync with prompt_rules.js SCHEMA_* sections and the
// renderer's mechanic-registry / document-primitives.

export var DOCUMENT_TYPE_ENUM = [
  'memo', 'report', 'inspection', 'fieldNote',
  'correspondence', 'transcript', 'form', 'anomaly'
];

export var DOCUMENT_TYPE_ALIASES = { 'letter': 'correspondence' };

export var VALID_MAP_TYPES = ['grid', 'point-to-point', 'linear-track', 'player-drawn'];

export var VALID_COMPANION_TYPES = [
  'dashboard', 'return-box', 'inventory-grid', 'token-sheet',
  'overlay-window', 'stress-track', 'memory-slots'
];

export var VALID_CLOCK_TYPES = [
  'progress-clock', 'danger-clock', 'racing-clock',
  'tug-of-war-clock', 'linked-clock', 'project-clock'
];

export var VALID_ARCHETYPES = [
  'government', 'cyberpunk', 'scifi', 'fantasy', 'noir',
  'steampunk', 'minimalist', 'nautical', 'occult', 'pastoral'
];

export var SUPPORTED_THEME_ARCHETYPES = {
  pastoral: true, government: true, cyberpunk: true, scifi: true,
  fantasy: true, noir: true, steampunk: true, minimalist: true,
  nautical: true, occult: true
};

export var THEME_ARCHETYPE_ALIASES = {
  institutional: 'government',
  terminal: 'scifi',
  clinical: 'minimalist',
  corporate: 'government',
  confessional: 'pastoral',
  literary: 'pastoral'
};

export var ORACLE_ROLL_BANDS = [
  '00-09', '10-19', '20-29', '30-39', '40-49',
  '50-59', '60-69', '70-79', '80-89', '90-99'
];

export var VALID_PAYLOAD_TYPES = {
  none: 1, narrative: 1, cipher: 1, map: 1, clock: 1,
  companion: 1, 'fragment-ref': 1, 'password-element': 1
};
