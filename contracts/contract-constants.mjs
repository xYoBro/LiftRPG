// ── Contract constants — THE single source of truth ─────────────────────────
// Every enum, guardrail, and version literal that more than one module relies
// on lives here. Consumed by:
//   - generator/modules/constants.js (re-exports for the pipeline)
//   - generator/modules/assembly.js + validation.js (identity normalization)
//   - scripts/validate.js (canonical validator, Node)
//   - contracts/booklet-1.4.schema.json (kept in sync by the validator's
//     self-check — the validator fails if schema enums drift from this file)
//
// prompt_rules.js is a classic script and cannot import this module; the
// canonical validator asserts its literals match these values (see
// scripts/validate.js "prompt-contract parity" checks).
//
// This file is synced to public/contracts/ by `npm run build:gold-disk`
// (scripts/sync-renderer-to-public.js). Edit it HERE, never in public/.

// ── Schema version ───────────────────────────────────────────────────────────

export var SCHEMA_VERSION = '1.5.0';
// Accepted on input by the renderer (liberal); the validator pins fixtures to
// SCHEMA_VERSION exactly. 1.5.0 is strictly additive over 1.4.0 (the
// percentile-stat companion type plus its optional fields), so 1.4.0 documents
// remain readable; normalization bumps them to SCHEMA_VERSION (D21).
export var ACCEPTED_SCHEMA_VERSIONS = ['1.4.0', '1.5.0'];

// Extension namespace: pipeline telemetry, migration residue, and any
// non-contract data live under `_x` (top level, week level, or bossEncounter
// level). The schema forbids unknown keys everywhere else.
export var EXTENSION_KEY = '_x';

// ── Document types ───────────────────────────────────────────────────────────

export var DOCUMENT_TYPE_ENUM = [
  'memo', 'report', 'inspection', 'fieldNote',
  'correspondence', 'transcript', 'form', 'anomaly'
];

export var DOCUMENT_TYPE_ALIASES = {
  'letter': 'correspondence',
  'maintenance_log': 'fieldNote', 'maintenance-log': 'fieldNote',
  'intercepted-transmission': 'transcript', 'intercepted_transmission': 'transcript',
  'incident_report': 'report', 'incident-report': 'report',
  'technical-drawing': 'inspection', 'technical_drawing': 'inspection',
  'internal-memo': 'memo', 'internal_memo': 'memo', 'internal memo': 'memo',
  'personnel-directive': 'memo', 'personnel_directive': 'memo',
  'internal directive': 'memo', 'internal-directive': 'memo',
  'operational directive': 'memo', 'operational-directive': 'memo',
  'personnel-file': 'report', 'personnel_file': 'report',
  'personal note': 'fieldNote', 'personal-note': 'fieldNote', 'personal_note': 'fieldNote',
  'technical-log': 'fieldNote', 'technical_log': 'fieldNote',
  'technical report': 'report', 'technical-report': 'report', 'technical_report': 'report',
  'field-note': 'fieldNote', 'field_note': 'fieldNote', 'field note': 'fieldNote',
  'log-entry': 'fieldNote', 'log_entry': 'fieldNote', 'log entry': 'fieldNote',
  'signal-log': 'fieldNote', 'signal_log': 'fieldNote',
  'dispatch': 'correspondence', 'communique': 'correspondence',
  'bulletin': 'memo', 'notice': 'memo',
  'dossier': 'report', 'briefing': 'report', 'case-file': 'report', 'case_file': 'report',
  'manifest': 'form', 'ledger': 'form', 'inventory': 'form',
  'testimony': 'transcript', 'deposition': 'transcript', 'interview': 'transcript', 'recording': 'transcript',
  'journal': 'fieldNote', 'diary': 'fieldNote', 'observation': 'fieldNote',
  'assessment': 'inspection', 'survey': 'inspection', 'audit': 'inspection',
  'incident': 'anomaly', 'warning': 'anomaly', 'alert': 'anomaly', 'deviation': 'anomaly'
};

// ── Mechanic vocabularies ────────────────────────────────────────────────────

export var VALID_MAP_TYPES = ['grid', 'point-to-point', 'linear-track', 'player-drawn'];

// NOTE: usage-die was always renderer-supported (mechanic-registry.js:150,
// field-ops-primitives.js:723) but missing from the generator enum — corpus
// proof that generator validation never ran on hand fixtures (AUDIT §4.M).
// percentile-stat (schema 1.5.0) is the growing-stat d100: an authored,
// monotonically rising per-week value the player rolls under on the existing
// oracle d100. Display-floor doctrine — the printed stat never regresses.
export var VALID_COMPANION_TYPES = [
  'dashboard', 'return-box', 'inventory-grid', 'token-sheet',
  'overlay-window', 'stress-track', 'memory-slots', 'usage-die',
  'percentile-stat'
];

// percentile-stat value bounds — a d100 roll-under target must leave room to
// fail (1-99) and the printed track holds at most one value per week.
export var PERCENTILE_STAT = {
  minValue: 1,
  maxValue: 99,
  minWeeklyValues: 1,
  maxWeeklyValues: 8
};

export var VALID_CLOCK_TYPES = [
  'progress-clock', 'danger-clock', 'racing-clock',
  'tug-of-war-clock', 'linked-clock', 'project-clock'
];

export var VALID_PAYLOAD_TYPES = [
  'none', 'narrative', 'cipher', 'map', 'clock',
  'companion', 'fragment-ref', 'password-element'
];

export var ORACLE_ROLL_BANDS = [
  '00-09', '10-19', '20-29', '30-39', '40-49',
  '50-59', '60-69', '70-79', '80-89', '90-99'
];

// ── Cipher workspace styles ──────────────────────────────────────────────────
// The writable surface printed under a cipher. Each value names a distinct
// geometry the renderer builds (field-ops-primitives.js renderWorkspace) and
// the estimate models (atoms/cipher-panel.js workspaceHeight):
//   boxed-totals — grid of rows x cols digit boxes (aspect-capped squares)
//   lined        — stack of ruled pencil rows
//   blank        — one open ruled block, rows deep
//   cells        — wrapping strip of small plaintext squares (the default)
//
// 'cells' is last on purpose: it is DEFAULT_WORKSPACE_STYLE, the value an
// unrecognised style resolves to. That default is a render-safety rule, not a
// preference — an unknown string must still print a usable writing surface.
export var VALID_WORKSPACE_STYLES = ['boxed-totals', 'lined', 'blank', 'cells'];

export var DEFAULT_WORKSPACE_STYLE = 'cells';

// Aliases are style-vocabulary synonyms only — a value that names a geometry
// in different words. Values that name the *content* of the workspace
// ('riddle-answer') or that are prose left behind by the 1.4 string->object
// migration carry no geometry intent and deliberately have no entry here; they
// fall to DEFAULT_WORKSPACE_STYLE.
//
// Entries marked (corpus) were observed in content/ before this enum landed.
export var WORKSPACE_STYLE_ALIASES = {
  'boxgrid': 'boxed-totals',        // (corpus) Palimpsest-House, eastern-shore
  'box-grid': 'boxed-totals',
  'box_grid': 'boxed-totals',
  'boxes': 'boxed-totals',
  'boxed': 'boxed-totals',
  'boxed-total': 'boxed-totals',
  'ruled': 'lined',                 // (corpus) eastern-shore
  'ruled-lines': 'lined',
  'short-lines': 'lined',           // (corpus) The-Hinge
  'lines': 'lined',
  'writing-lines': 'lined',
  'grid': 'cells',                  // (corpus) The-Air-Gapped-Choir, The-Hinge
  'cell-grid': 'cells',
  'cell': 'cells',
  'plaintext-grid': 'cells',
  'empty': 'blank',
  'freeform': 'blank',
  'open': 'blank'
};

// ── Voice discipline ─────────────────────────────────────────────────────────
// The per-book voiceSpec (meta.literaryRegister) splits prose rules in two
// (docs/voice/VOICE.md §0):
//   - Universal machine-tells — echo-callbacks, corrective constructions, wry
//     appositives, short-short drumbeats at significance, assembled endings,
//     narrator amusement, mirrored-aphorism closers — are banned in every genre
//     and are UNLICENSABLE. They are deliberately absent from the enum below:
//     there is no key to write them under, so the ban cannot be argued away.
//   - Genre moves are banned by DEFAULT and register-licensable: a booklet may
//     declare at most one, with a countable budget and a rationale.
// prompt_rules.js INST_VOICE_DISCIPLINE must quote this list exactly
// (validator-asserted, same doctrine as the workspace-style enum).
export var VOICE_LICENSABLE_MOVES = [
  'aphorism', 'direct-address', 'fragment-rhythm', 'ominous-closer'
];

// voiceSpec shape limits. mechanisms are 2-4 borrowings stated in SELECTION
// terms (what the prose does, never whom it resembles); a license is rare by
// construction — one is the ceiling, zero is the normal state.
export var VOICE_SPEC_LIMITS = {
  minMechanisms: 2,
  maxMechanisms: 4,
  maxLicensedMoves: 1
};

// ── Theme archetypes ─────────────────────────────────────────────────────────

export var VALID_ARCHETYPES = [
  'government', 'cyberpunk', 'scifi', 'fantasy', 'noir',
  'steampunk', 'minimalist', 'nautical', 'occult', 'pastoral'
];

export var THEME_ARCHETYPE_ALIASES = {
  institutional: 'government',
  terminal: 'scifi',
  clinical: 'minimalist',
  corporate: 'government',
  confessional: 'pastoral',
  literary: 'pastoral'
};

// ── Artifact identity ────────────────────────────────────────────────────────
// Previously these lived only as silent coercion tables in assembly.js
// (AUDIT finding 74). They are now enforced enums.

export var VALID_SHELL_FAMILIES = [
  'field-survey', 'classified-packet', 'ship-logbook', 'witness-binder',
  'court-packet', 'devotional-manual', 'household-archive', 'technical-manual'
];

export var VALID_BOARD_STATE_MODES = [
  'survey-grid', 'node-graph', 'timeline-reconstruction', 'testimony-matrix',
  'ledger-board', 'route-tracker', 'profile-assembly', 'player-drawn'
];

export var VALID_ATTACHMENT_STRATEGIES = [
  'split-technical', 'single-dominant', 'narrative-support'
];

// ── Spatial guardrails ───────────────────────────────────────────────────────
// One set of numbers. prompt_rules.js SCHEMA_SPATIAL and MECHANIC_VOCAB_BRIEF
// must quote exactly these (validator-asserted); the generator validators
// enforce them; the renderer degrades gracefully beyond them but fixtures may
// not exceed them. Resolves the 12/10 vs 15/20 vs uncapped three-way
// (AUDIT finding 5).

export var SPATIAL_GUARDRAILS = {
  ptp: {
    // Generation policy (what prompts demand of LLMs; preferred 5-7 nodes):
    maxNodes: 12,
    maxEdges: 10,
    // Render ceiling (what fixtures may not exceed — the renderer's "packed"
    // tier handles up to here; the corpus' best campaign uses 15 nodes):
    renderMaxNodes: 15,
    renderMaxEdges: 20,
    coordMin: 1,
    coordMax: 12,
    nodeLabelMaxChars: 20,
    edgeLabelMaxChars: 12
  },
  grid: { maxColumns: 12, maxRows: 8 },
  linearTrack: { minPositions: 3, maxPositions: 12 },
  playerDrawn: { maxPrompts: 4, maxSeedMarkers: 3 },
  cipher: { displayTextMaxChars: 350, extractionInstructionMaxChars: 200 },
  oracle: { entryCount: 10 }
};

// ── Crypto contract ──────────────────────────────────────────────────────────
// Must match renderer/modules/constants.js + crypto.js and
// generator/liftrpg-encrypt.js (validator-asserted).

export var CRYPTO_CONTRACT = {
  algo: 'AES-GCM',
  keyBits: 256,
  saltBytes: 32,
  ivBytes: 12,
  iterations: 200000
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function isValidDocumentType(value) {
  return DOCUMENT_TYPE_ENUM.indexOf(value) !== -1;
}

export function resolveDocumentType(value) {
  if (isValidDocumentType(value)) return value;
  var key = String(value || '').toLowerCase();
  return DOCUMENT_TYPE_ALIASES[key] || null;
}

export function isValidWorkspaceStyle(value) {
  return VALID_WORKSPACE_STYLES.indexOf(value) !== -1;
}

/**
 * Canonical workspace style, or null when the value carries no geometry
 * intent. Mirrors resolveDocumentType: callers that must always end up with a
 * style fall back to DEFAULT_WORKSPACE_STYLE themselves, so the "I guessed"
 * case stays visible to the caller (assembly raises a diagnostic; the renderer
 * silently prints cells, because a render must never throw).
 */
export function resolveWorkspaceStyle(value) {
  if (isValidWorkspaceStyle(value)) return value;
  var key = String(value == null ? '' : value).trim().toLowerCase();
  if (isValidWorkspaceStyle(key)) return key;
  return WORKSPACE_STYLE_ALIASES[key] || null;
}
