// ── Contract constants — THE single source of truth ─────────────────────────
// Every enum, guardrail, and version literal that more than one module relies
// on lives here. Consumed by:
//   - contracts/booklet-schema.mjs (imports enums directly — drift impossible
//     by construction)
//   - generator/modules/constants.js (re-exports for the pipeline)
//   - generator/modules/assembly.js + validation.js (identity normalization)
//   - scripts/validate.mjs (canonical validator, Node)
//   - scripts/gen-reference.mjs (generated reference tables, validator-diffed)
//
// prompt_rules.js is a classic script and cannot import this module; the
// canonical validator asserts its literals match these values (see
// scripts/validate.mjs "prompt-contract parity" checks).
//
// contracts/ is a SYMLINK to public/contracts — one physical file. Editing
// through either path touches the same bytes; nothing is synced.

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

// ── Pipeline debris: the keys, and the one place they may live (D128 → W4a) ──
// The rule above is not new — the schema has said "`_x` is the ONLY place for
// non-contract data (pipeline telemetry, migration residue)" since 1.4. The
// pipelines were writing ten of these at TOP LEVEL anyway, where
// `additionalProperties: false` rejects every one of them, so every booklet the
// real API path has ever produced carried contract violations by construction
// (D128 found six; the sweep that landed this constant found four more).
//
// This list is therefore the CLASS, not the six that were noticed. The failure
// that earned the difference: `_criticReport` was missing from BOTH
// hand-maintained debris lists (migrate-1.4.mjs DEBRIS_KEYS and index.html
// stripInternalKeys), so it survived migration AND the user-facing JSON
// download — the one debris field that reached a user's disk unstripped.
//
// The keys keep their leading underscore INSIDE `_x` (`_x._criticReport`, not
// `_x.criticReport`). It reads redundantly and it is deliberate: one name means
// the legacy fallback is one-to-one, the top-level scan in validate.mjs is
// exact, and there is no second spelling for a list to drift against.
export var PIPELINE_DEBRIS_KEYS = [
  '_pipeline', '_stageTelemetry', '_qualityGate', '_qualityReport',
  '_assemblyWarnings', '_continuityWarnings', '_assemblyDiagnostics',
  '_artifactIntentDrift', '_trialMode', '_criticReport',
  // W4b: the simulated player's walk. Recorded rather than only logged for the
  // D19 reason every other report here is — a book ships with its critique
  // attached, and "the walker found two soft-locks" belongs in the artifact a
  // reader opens later, not in a console nobody kept.
  '_simReport'
];

/**
 * readPipelineDebris(booklet, key) -> value | undefined
 *
 * The one reader. Prefers the lawful home (`_x`), falls back to the legacy
 * top-level position so every booklet generated before this landed still reads
 * — the bench's saved runs, uploaded checkpoints, and the eval history are all
 * pre-move documents and none of them are regenerable.
 *
 * SINGLE HOME (D93): four trees consume debris (eval-bench, playthrough-audit,
 * quality.js, the landing page) and a fallback re-implemented per consumer is
 * exactly how one of them ends up reading only the new position and reporting
 * a clean $0 run that actually failed. Guarded by singleDeclarationHomes().
 */
export function readPipelineDebris(booklet, key) {
  if (!booklet || typeof booklet !== 'object') return undefined;
  var ext = booklet[EXTENSION_KEY];
  if (ext && typeof ext === 'object' && ext[key] !== undefined) return ext[key];
  return booklet[key];
}

/**
 * writePipelineDebris(booklet, key, value) -> booklet
 *
 * The one writer, and the reason the move cannot half-happen: a pipeline that
 * assigns `booklet._criticReport = x` directly is caught by the top-level scan
 * in validate.mjs, and the only way to satisfy that scan is this function.
 * Creates `_x` on demand; refuses keys outside the declared class so a
 * eleventh debris field has to be declared above before it can be written.
 */
export function writePipelineDebris(booklet, key, value) {
  if (!booklet || typeof booklet !== 'object') return booklet;
  if (PIPELINE_DEBRIS_KEYS.indexOf(key) === -1) {
    throw new Error('writePipelineDebris: "' + key + '" is not a declared debris key — '
      + 'add it to PIPELINE_DEBRIS_KEYS in contracts/contract-constants.mjs first');
  }
  if (!booklet[EXTENSION_KEY] || typeof booklet[EXTENSION_KEY] !== 'object') {
    booklet[EXTENSION_KEY] = {};
  }
  booklet[EXTENSION_KEY][key] = value;
  return booklet;
}

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

// Render GEOMETRY, not usage semantics — `boardStateMode` carries the latter.
// Wave 3 (§4 of the gameplay brainstorm) added `concentric` and `maze` because
// two grammar families had no board at all: siege had to borrow a square grid
// for a cordon, and evasion had to spell a labyrinth as a straight line.
export var VALID_MAP_TYPES = [
  'grid', 'point-to-point', 'linear-track', 'player-drawn',
  'concentric', 'maze'
];

// ── Map variant axes (Wave 3) ────────────────────────────────────────────────
// Two geometries got a VARIANT instead of a type, because the data model is
// unchanged and only the drawing differs. A variant costs one enum and one CSS
// block; a type costs the whole add-map-type chain. Spend the type budget only
// when the topology itself is new.

// How a point-to-point map's edges MEAN. 'traversal' is the historical reading
// (an edge is a way to get there); 'relational' is the constellation mode (an
// edge is a tie between people or claims, and the pencil verb is strengthen /
// strain / sever / redraw). Node and edge SHAPE is identical either way — which
// is what keeps buildMapEvolutionFingerprint comparable across the two.
export var VALID_EDGE_SEMANTICS = ['traversal', 'relational'];
export var DEFAULT_EDGE_SEMANTICS = 'traversal';

// The cell a grid map prints. 'hex' reuses tiles/gridDimensions untouched and
// only changes the cell polygon + row offset, so grid guardrails still bound it.
export var VALID_CELL_SHAPES = ['square', 'hex'];
export var DEFAULT_CELL_SHAPE = 'square';

// ── Component dialect (Wave 3) ───────────────────────────────────────────────
// WHOSE instrument this book's countable surfaces are. A dialect changes how a
// clock face, a mark strip, and a track are DRAWN — never how tall they are.
//
// THE HEIGHT LAW (binding, generalizes the D89 flat-height precedent): dialects
// are height-identical by construction. No dialect may add, remove, or resize a
// box; it restyles what is inside one. That is what lets the dialect be a pure
// CSS layer with zero estimate changes and zero new ladders — phase-1 estimation
// has no DOM and cannot resolve `data-component-dialect`, so a dialect that
// moved geometry would make every tracker/reckoning estimate lie (the D71
// defect class, arrived at from a new direction).
export var VALID_COMPONENT_DIALECTS = ['segments', 'beads', 'gauge', 'tally'];
export var DEFAULT_COMPONENT_DIALECT = 'segments';

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

// ── The pencil-only law: demotion, not removal (D122(c)) ────────────────────
// The complete play kit is three objects — the book, a pencil, and two
// ten-sided dice. Nothing a generated book prints may require cutting,
// folding, gluing, aligning a separate sheet, or assembling a component.
// `token-sheet` is a cuttable counter sheet and `overlay-window` is an
// alignment surface laid over another page; both fail that test, so neither is
// ever offered to a model again.
//
// DEMOTION IS NOT REMOVAL. VALID_COMPANION_TYPES above is the SCHEMA's
// acceptance set and keeps both values forever: books generated before this
// ruling carry them, and they must keep validating and rendering. The schema,
// the renderer, COMPANION_COMPONENT_REGISTRY and the corpus are untouched by a
// demotion — only the generation menus narrow.
//
// GENERATION_COMPANION_MENU is DERIVED, never hand-listed. A second
// hand-written list is a second copy of an enum, and every hand-kept copy in
// this repo has rotted. Add a type to VALID_COMPANION_TYPES and it is offered;
// name it in DEMOTED_COMPANION_TYPES as well and it is accepted but unoffered.
// `companionMenuParity()` in validate.mjs recomputes the derivation, holds the
// prompt literals to the menu, and asserts DEMOTED ⊆ VALID — a demoted name
// the schema does not accept is a dead entry, not a demotion.
export var DEMOTED_COMPANION_TYPES = ['token-sheet', 'overlay-window'];

export var GENERATION_COMPANION_MENU = VALID_COMPANION_TYPES.filter(
  function (type) { return DEMOTED_COMPANION_TYPES.indexOf(type) === -1; }
);

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

// ── Mark economy: markStrip -> Reckoning (schema 1.5.0, Session 1 / D89) ─────
// The Mark surface (mid-workout ticks on the session card) and the Resolve
// surface (the week's Reckoning panel) are one economy in two halves. All three
// fields below are OPTIONAL at schema level and additive over 1.4.0; the
// assembled-booklet path derives them and then demands them
// (generator/modules/assembly.js deriveMarkStripEconomy, then
// validation.js collectMarkStripFindings). The stage validators deliberately
// know nothing about them — a week-stage demand would break the stub bench and
// the guided-build harness, which both replay hand-authored week payloads.
// Hand-authored corpus fixtures predate the feature and are tolerated by a
// RULE_DEMOTIONS entry in scripts/validate.mjs (D19 severity doctrine).

// Strip shape. 3-5 targets is the ten-second law made countable: fewer than
// three is not a strip, more than five stops being tickable between sets.
// maxLabelWords caps the printed label. Digits are illegal in a label (enforced
// in assembly, warned in validation) because a printed number invites
// arithmetic mid-workout — design constitution law 2.
export var MARK_STRIP = { minTargets: 3, maxTargets: 5, maxLabelWords: 5 };

// MACHINE-ONLY provenance. A kind records WHY a target exists, so derivation is
// auditable and repairs are idempotent. Kinds are NEVER printed and never reach
// a prompt: the amendment killed the printed target-kind taxonomy, because
// labels derive diegetically per world and two booklets sharing a kind must not
// share a phrase. 'custom' is the honest bucket for an authored label whose
// intent the classifier cannot read.
export var MARK_STRIP_TARGET_KINDS = ['completion', 'effort', 'record', 'custom'];

// Where a week's marks GO. The grammar law: a sink must reference vocabulary
// the booklet ALREADY RENDERS — a mark that converts into a surface the player
// cannot see is an unpaid promise. 'notes' is the floor (every session card
// carries a notes rail), which is why it is the repair default.
export var RECKONING_SINK_KINDS = ['map', 'companion', 'clock', 'oracle', 'notes'];

// Derived boss threshold = round(ratio x total attainable ticks), summed across
// ALL weeks (the wallet is cumulative, not per-week). Reachable by
// construction: a player who ticks three quarters of everything clears it, so
// the boss week can never print a target the campaign could not pay for.
// The password chain is untouched — the economy may never own the six-week
// payoff (spine-determinism law).
export var RECKONING_THRESHOLD_RATIO = 0.75;

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

// ── Shell citation grammars (§11 Wave 4a) ───────────────────────────────────
// The pointer form, per shell family. A booklet points at its own surfaces
// constantly — a micro-line citing the rule it fires under, a fragment citing
// the document that supersedes it — and the point-of-use research is blunt
// about what makes a pointer work: it must name WHAT is there, not only WHERE
// (docs/reference/point-of-use-rules-research.md §1.5, §4). Legal editors call
// the destination-without-payload form a BLIND REFERENCE, and every mature
// print tradition examined carries a native vocabulary for avoiding it —
// `Exhibit 4`, `Annex B`, `Folio 12`, Mothership's `(PSG 29)`.
//
// This table lives beside VALID_SHELL_FAMILIES for the same reason
// resolveShellFamily does: the family IS the choice, and a per-booklet
// improvised citation style would defeat the mechanism. Signaling only pays
// when the signal is systematic across the whole artifact (§1.2, §5.3).
//
// D47 (no exemplar bleed): STRUCTURAL patterns and GENERIC vocabulary only.
// `Exhibit` and `Folio` are filing furniture in any world; `the Tidewall
// Survey` is a house image and would leak into every generated book. Nothing
// here names a place, a person, an instrument, or a period.
//
// Two halves, and validate.mjs asserts they agree:
//   labelVocabulary — the structural nouns this shell files under.
//   tokenPattern    — regex SOURCE (string, not RegExp: this file is imported
//                     by Node, the browser, and quoted into prompt_rules) that
//                     matches a pinpoint: one of those labels followed by an
//                     identifier. Every family also accepts the booklet's own
//                     refs (`F.07`, `W4`) — those are pinpoints in any grammar,
//                     and they are the ONLY destinations a generating model can
//                     name, because page numbers are assigned by the layout
//                     engine long after the prose is written.
//
// Keys ≡ VALID_SHELL_FAMILIES (validator-asserted). A family without a grammar
// would silently fall back to the default and cite in a dialect that is not
// its own — the exact inconsistency the table exists to prevent.

// The in-book reference forms every shell accepts. Fragment ids and week refs
// are the machine handles the resolver already understands (parseWeekRef /
// normalizeId in validation.js), so a citation carrying one is checkable as
// well as readable.
export var CITATION_UNIVERSAL_TOKEN = '\\b(?:F\\.?\\s*\\d+|W\\s*\\d+)\\b';

export var SHELL_CITATION_STYLES = {
  'field-survey': {
    labelVocabulary: ['Sheet', 'Station', 'Plate', 'Traverse'],
    tokenPattern: '\\b(?:Sheet|Station|Plate|Traverse)\\s*[A-Z]?[-.\\u2013]?\\s*\\d+\\b'
  },
  'classified-packet': {
    labelVocabulary: ['Annex', 'Enclosure', 'Tab', 'Serial'],
    tokenPattern: '\\b(?:Annex|Enclosure|Tab|Serial)\\s*[A-Z]?[-.\\u2013]?\\s*\\d+\\b'
  },
  'ship-logbook': {
    labelVocabulary: ['Entry', 'Watch', 'Bearing', 'Fathom'],
    tokenPattern: '\\b(?:Entry|Watch|Bearing|Fathom)\\s*[A-Z]?[-.\\u2013]?\\s*\\d+\\b'
  },
  'witness-binder': {
    labelVocabulary: ['Exhibit', 'Statement', 'Deposition', 'Divider'],
    tokenPattern: '\\b(?:Exhibit|Statement|Deposition|Divider)\\s*[A-Z]?[-.\\u2013]?\\s*\\d+\\b'
  },
  'court-packet': {
    labelVocabulary: ['Exhibit', 'Docket', 'Schedule', 'Recital'],
    tokenPattern: '\\b(?:Exhibit|Docket|Schedule|Recital)\\s*[A-Z]?[-.\\u2013]?\\s*\\d+\\b'
  },
  'devotional-manual': {
    labelVocabulary: ['Office', 'Rubric', 'Verse', 'Antiphon'],
    tokenPattern: '\\b(?:Office|Rubric|Verse|Antiphon)\\s*[A-Z]?[-.\\u2013]?\\s*\\d+\\b'
  },
  'household-archive': {
    labelVocabulary: ['Folio', 'Bundle', 'Leaf', 'Drawer'],
    tokenPattern: '\\b(?:Folio|Bundle|Leaf|Drawer)\\s*[A-Z]?[-.\\u2013]?\\s*\\d+\\b'
  },
  'technical-manual': {
    labelVocabulary: ['Figure', 'Clause', 'Procedure', 'Revision'],
    tokenPattern: '\\b(?:Figure|Clause|Procedure|Revision)\\s*[A-Z]?[-.\\u2013]?\\s*\\d+\\b'
  }
};

/**
 * resolveCitationStyle(shellFamily) -> { labelVocabulary, tokenPattern }
 *
 * The citation grammar a booklet cites in. Unknown or absent families get
 * 'field-survey', matching resolveShellFamily's declared default — a booklet
 * always prints in SOME shell, so it always cites in some grammar.
 *
 * SINGLE HOME (D93), same argument as resolveFamilyBoardModes: the table is
 * the gate, and a consumer that rebuilt the lookup would answer "which grammar
 * does this book cite in?" a second time in its own dialect. Guarded by
 * singleDeclarationHomes() in scripts/validate.mjs.
 *
 * Consumers: generator/modules/validation.js (the blind-pointer and
 * citation-style scans).
 */
export function resolveCitationStyle(shellFamily) {
  var key = String(shellFamily || '').trim().toLowerCase();
  return SHELL_CITATION_STYLES[key] || SHELL_CITATION_STYLES['field-survey'];
}

/**
 * citationPinpoints(citedAs, shellFamily) -> { own, foreign }
 *
 * The pinpoint audit of one printed citation. `own` is true when the string
 * carries a pinpoint this shell may use — its own labelled form, or one of the
 * booklet's own refs. `foreign` lists the OTHER families whose labelled form
 * appears, so a caller can say "this book cites like a court packet" rather
 * than only "this citation is blind".
 *
 * The two findings are deliberately separable, because they are different
 * defects with different fixes: a citation with no pinpoint at all makes the
 * reader guess (the blind reference, §4), while a citation with the wrong
 * shell's pinpoint is legible but breaks the consistency that makes signaling
 * work at all (§1.2). Callers route severity; this function only reads.
 *
 * SINGLE HOME (D93). Co-located with the table it reads.
 */
export function citationPinpoints(citedAs, shellFamily) {
  var text = String(citedAs || '');
  var family = String(shellFamily || '').trim().toLowerCase();
  if (!SHELL_CITATION_STYLES[family]) family = 'field-survey';

  var own = new RegExp(CITATION_UNIVERSAL_TOKEN, 'i').test(text)
    || new RegExp(SHELL_CITATION_STYLES[family].tokenPattern, 'i').test(text);

  var foreign = [];
  for (var other in SHELL_CITATION_STYLES) {
    if (!Object.prototype.hasOwnProperty.call(SHELL_CITATION_STYLES, other)) continue;
    if (other === family) continue;
    if (!new RegExp(SHELL_CITATION_STYLES[other].tokenPattern, 'i').test(text)) continue;
    // Vocabularies overlap on purpose ('Exhibit' files both a witness binder
    // and a court packet). A label this shell already owns is not foreign, no
    // matter which other shell also owns it.
    var shared = SHELL_CITATION_STYLES[other].labelVocabulary.filter(function (label) {
      return SHELL_CITATION_STYLES[family].labelVocabulary.indexOf(label) !== -1;
    });
    var exclusive = SHELL_CITATION_STYLES[other].labelVocabulary.filter(function (label) {
      return shared.indexOf(label) === -1;
    });
    if (!exclusive.length) continue;
    var exclusiveRe = new RegExp('\\b(?:' + exclusive.join('|') + ')\\s*[A-Z]?[-.\\u2013]?\\s*\\d+\\b', 'i');
    if (exclusiveRe.test(text)) foreign.push(other);
  }
  return { own: own, foreign: foreign };
}

// ── Pointer density budgets (§11 Wave 4a) ───────────────────────────────────
// Cross-reference DENSITY is a documented killer independently of whether any
// individual pointer is well-formed: the hypertext literature finds links
// impose load regardless of what they lead to, the Federal Plain Language
// Guidelines say cross-references "frustrate any attempt to write clearly",
// and NN/g's board-game heuristics name First Martians' excessive
// cross-referencing as the anti-pattern (point-of-use §1.6, §3.3, §5.1
// amendment 3). So pointers are a budget, not a free resource.
//
// EVERY NUMBER HERE IS ARBITRARY UNTIL PLAYTEST, and the research says so in
// as many words (§7.2: "Every cue budget we write will be arbitrary until the
// playtest data exists. Ship them as warnings."). They are all WARN-class on
// the assembled path. The derivations, stated so a later wave can argue with
// them rather than guess at them:
//
//   maxMicroLinesPerSession (2) — the reading budget (GW-39). A rest interval
//     is ninety seconds and the blank plus the cue already spend it.
//   maxCiteRefsPerSession (1) — the REST-state law directly: "at most one
//     Tier-2 pointer, and it should be spread-local" (§5.2). A flip during
//     rest must be a choice the player can DECLINE, which stops being true
//     the moment there are two of them.
//   pointersPerWeek (2) — the book-level budget, multiplied by week count so
//     it scales with the artifact instead of pinning a six-week number onto a
//     twelve-week book. Counts BOTH channels (manifestPointer + citeRef),
//     because the reader does not know which channel a pointer belongs to and
//     spends the same navigation either way. Calibrated against the manifest
//     doctrine already in force: 2-3 chains of up to 3 links is ~9 pointers in
//     a six-week book, so 12 leaves genuine room for the citation channel
//     without doubling the navigation load — roughly one pointer per four
//     printed pages.
//   maxSealsPerBooklet (2) / minSealLeadWeeks (2) — a sealed cache is a
//     page-scale lookup, and lookups are a BETWEEN-state pleasure. Two per
//     book keeps the flip rare enough to stay a pleasure; two weeks of lead
//     is what makes the key feel found rather than handed over.
export var POINTER_BUDGETS = {
  maxMicroLinesPerSession: 2,
  maxCiteRefsPerSession: 1,
  pointersPerWeek: 2,
  maxSealsPerBooklet: 2,
  minSealLeadWeeks: 2
};

export var VALID_BOARD_STATE_MODES = [
  'survey-grid', 'node-graph', 'timeline-reconstruction', 'testimony-matrix',
  'ledger-board', 'route-tracker', 'profile-assembly', 'player-drawn'
];

export var VALID_ATTACHMENT_STRATEGIES = [
  'split-technical', 'single-dominant', 'narrative-support'
];

// ── Artifact intent: planning families (Layer 3 compiler contract) ──────────
// The two menus the artifact-intent compiler chooses from. They were written
// five times — the STRUCTURED_SCHEMA_SKELETON enum literal and the
// INST_ARTIFACT_COMPILER menu tables in prompt_rules.js, validation.js's
// advisory maps, assembly.js's MECHANIC_GRAMMAR_PROXIES keys, quality.js's
// STABLE_MAP_GRAMMARS keys — with nothing holding them together. This is the
// single source; validate.mjs asserts every copy against it in both
// directions.
//
// The arc family shapes the booklet's tension curve (opening → midpoint shift
// → endgame pressure → fragment function). Ordered as the compiler menu is.

export var VALID_ARC_FAMILIES = [
  'slow-burn-investigation', 'institutional-collapse', 'witness-accumulation',
  'contamination-spiral', 'procedural-deepening', 'pilgrimage-approach',
  'false-order-to-rupture'
];

// The mechanic grammar family determines what the player DOES each week.
//
// INDEPENDENCE RULING (Wave 0, 2026-08-11), DISCHARGED (Wave 2, 2026-08-11).
// The first seven values used to coincide with VALID_BOARD_STATE_MODES minus
// 'player-drawn', and Wave 0 ruled that coincidence historical rather than
// structural. Wave 2 ended it: the menu now carries fifteen families in nine
// clusters, a family CHOOSES a board (FAMILY_BOARD_MODE_GUIDANCE below)
// instead of being one, and the two arrays no longer have the same length.
// Never derive one from the other.
//
// WIDENING RULING (Wave 2, §3 of the gameplay brainstorm). The original seven
// were all epistemic — mark, connect, sequence, compare, track, advance,
// collect — which made them seven subgenres of ONE macro-genre, "reconstruct
// the record". That was the located cause of gameplay sameness across books.
// They are preserved verbatim (they are the Reconstruction cluster) and eight
// macro-genres join them, each naming a different thing the world spends
// against the player. Order is the compiler menu's order: the reconstruction
// seven first, then the eight.
//
// No new widget is implied by any of them (the composition law): every family
// compiles to atoms, clocks, companions, and map types that already ship.

export var VALID_MECHANIC_GRAMMAR_FAMILIES = [
  'survey-grid', 'node-graph', 'timeline-reconstruction', 'testimony-matrix',
  'ledger-board', 'route-tracker', 'profile-assembly',
  'heat', 'attrition', 'siege', 'stewardship', 'loyalty-web', 'evasion',
  'observance', 'rivalry'
];

// ── Family clusters and their neighbours ────────────────────────────────────
// The cluster is the macro-genre; the family is the member. Nine clusters: the
// seven legacy families share one ('reconstruction'), and each new family is
// its own — a cluster of one is legal and says "this pressure has one shape
// so far", not "this is a lesser genre".
//
// EVERY family must appear here. validate.mjs asserts key parity against
// VALID_MECHANIC_GRAMMAR_FAMILIES, so a family added without a cluster is an
// ERROR rather than a family that silently stops being neighbour-checked.

export var FAMILY_CLUSTERS = {
  'survey-grid': 'reconstruction',
  'node-graph': 'reconstruction',
  'timeline-reconstruction': 'reconstruction',
  'testimony-matrix': 'reconstruction',
  'ledger-board': 'reconstruction',
  'route-tracker': 'reconstruction',
  'profile-assembly': 'reconstruction',
  heat: 'heat',
  attrition: 'attrition',
  siege: 'siege',
  stewardship: 'stewardship',
  'loyalty-web': 'loyalty-web',
  evasion: 'evasion',
  observance: 'observance',
  rivalry: 'rivalry'
};

// Adjacency, with the justification IN the table because an unjustified
// adjacency list is a taste claim that nobody can argue with later. Two
// clusters are neighbours when a book could slide from one into the other
// without anyone noticing — which is exactly the blur the exclusion rule
// (INST_ARTIFACT_COMPILER Step 7) exists to prevent.
//
// Symmetric by construction; validate.mjs asserts the symmetry.

export var CLUSTER_NEIGHBORS = {
  // The seven reconstruction families are mutual siblings: all of them read a
  // record and rebuild it, so any two of them blur into each other faster than
  // any cross-cluster pair does.
  reconstruction: ['reconstruction'],
  // Both press a wager against a counterparty who is keeping score. Heat's
  // counterparty is watching you; rivalry's is racing you. One book can drift
  // from "how exposed am I" into "am I ahead" without changing a single widget.
  heat: ['rivalry'],
  rivalry: ['heat'],
  // Both spend to move while the stores fall. Attrition's cost is the distance;
  // evasion's cost is the pursuer. The ledger looks identical.
  attrition: ['evasion'],
  evasion: ['attrition'],
  // Both hold the same walls. Siege holds them against an assault that arrives;
  // stewardship holds them against decay that never stops. Swap the antagonist
  // and the board plays the same.
  siege: ['stewardship'],
  stewardship: ['siege'],
  // Both answer to someone else. Loyalty-web is answering to PEOPLE who pull in
  // different directions; observance is answering to a FORM that must be kept
  // exactly. Both are obligation games and both fail the same way — a book that
  // means "duty" and never decides duty to whom.
  'loyalty-web': ['observance'],
  observance: ['loyalty-web']
};

// ── Family → board-state mode guidance ──────────────────────────────────────
// Ranked CANDIDATES, not a mapping. The first entry is the default reading of
// the family; later entries are legitimate alternatives the compiler may take
// when the world argues for them.
//
// ONE HOME (D93 law). Three ungoverned family/map↔board resolvers already
// exist in this repo — assembly.js's inferBoardStateModeFromContext, quality.js's
// STABLE_MAP_GRAMMARS, check-artifact-differentiation.js's mapTypeToBoardMode —
// each written for its own caller and none of them agreeing by construction.
// This is deliberately not a fourth: it is the family's OWN statement of what
// board it wants, consumed through resolveFamilyBoardModes(), and the existing
// trio is reported as future unification work rather than extended here.
//
// The reconstruction seven keep the identity reading they have always had (the
// family names its board), which is why widening the menu changed no existing
// book's board.
//
// Wave 3 adds map GEOMETRIES (concentric, maze, …), not board modes, so this
// table is expected to stay stable across that wave. A siege whose board is
// 'survey-grid' today gets a concentric MAP inside the same board semantics.
//
// Every family must appear; validate.mjs asserts key parity, and every value
// must be a member of VALID_BOARD_STATE_MODES.

export var FAMILY_BOARD_MODE_GUIDANCE = {
  'survey-grid': ['survey-grid'],
  'node-graph': ['node-graph'],
  'timeline-reconstruction': ['timeline-reconstruction'],
  'testimony-matrix': ['testimony-matrix'],
  'ledger-board': ['ledger-board'],
  'route-tracker': ['route-tracker'],
  'profile-assembly': ['profile-assembly'],
  // Exposure is accounted for: what they know about you is a running balance.
  // The alternative is the network of who has seen what.
  heat: ['ledger-board', 'node-graph'],
  // Distance against stores. The route is the board; a surveyed ground works
  // when the depletion is territory rather than travel.
  attrition: ['route-tracker', 'survey-grid'],
  // The ground you still hold. 'player-drawn' is the honest second option
  // until Wave 3's concentric geometry lands — a hand-drawn cordon is cheaper
  // and more diegetic than forcing rings onto a square grid.
  siege: ['survey-grid', 'player-drawn'],
  // The fabric under your hands, parcel by parcel — or the dependency web that
  // decides which repair enables the next.
  stewardship: ['survey-grid', 'node-graph'],
  // The web IS the board. The second reading is the matrix of who claims what
  // about whom, when the loyalties are contested in words rather than ties.
  'loyalty-web': ['node-graph', 'testimony-matrix'],
  // A pursuit has one board: the line you are ahead on.
  evasion: ['route-tracker'],
  // The rite is an order of operations. Second: the player draws the precinct
  // as they learn what belongs where.
  observance: ['timeline-reconstruction', 'player-drawn'],
  // Standings are a ledger. Nothing else reads as "who is ahead" on paper.
  rivalry: ['ledger-board']
};

/**
 * resolveFamilyBoardModes(family) -> string[]
 *
 * The ranked board-state candidates a mechanic grammar family wants. Returns
 * an empty array for an unknown or absent family so callers can treat "no
 * guidance" as a removed signal rather than a default.
 *
 * SINGLE HOME (D93). Co-located with the guidance table for the same reason
 * resolveShellFamily sits next to VALID_SHELL_FAMILIES: the table IS the
 * validity gate, and a consumer that re-implemented the lookup would answer
 * "which board does this family want?" a second time, in its own dialect.
 *
 * Consumers: generator/modules/assembly.js (inferBoardStateModeFromContext).
 * Guarded by singleDeclarationHomes() in scripts/validate.mjs.
 */
export function resolveFamilyBoardModes(family) {
  var key = String(family || '').trim().toLowerCase();
  var modes = FAMILY_BOARD_MODE_GUIDANCE[key];
  return Array.isArray(modes) ? modes.slice() : [];
}

/**
 * resolveNeighborFamilies(family) -> string[]
 *
 * Every family a booklet declaring `family` risks blurring into — the other
 * members of its own cluster plus every member of each neighbouring cluster.
 * The family itself is never included (a booklet cannot refuse what it chose).
 *
 * This is what makes the neighbour-exclusion rule checkable rather than
 * rhetorical: INST_ARTIFACT_COMPILER Step 7 demands at least one refusal from
 * this list, and validateSkeletonStage warns when none of the declared
 * exclusions names anything in it.
 *
 * SINGLE HOME (D93), same argument as resolveFamilyBoardModes.
 * Consumers: generator/modules/validation.js (validateSkeletonStage).
 */
export function resolveNeighborFamilies(family) {
  var key = String(family || '').trim().toLowerCase();
  var cluster = FAMILY_CLUSTERS[key];
  if (!cluster) return [];
  var clusters = CLUSTER_NEIGHBORS[cluster] || [];
  var out = [];
  for (var i = 0; i < VALID_MECHANIC_GRAMMAR_FAMILIES.length; i++) {
    var candidate = VALID_MECHANIC_GRAMMAR_FAMILIES[i];
    if (candidate === key) continue;
    if (clusters.indexOf(FAMILY_CLUSTERS[candidate]) !== -1) out.push(candidate);
  }
  return out;
}

// ── Door-leaning families (Teeth Round, Wave T1a) ───────────────────────────
// Which mechanic grammar families must print a weekly `week.doorChoice`.
//
// The membership is READ OFF the cluster recipes in INST_ARTIFACT_COMPILER
// Step 5a, not chosen by taste. Each recipe states a DECISION the player must
// own every week, and a doorChoice is exactly that decision printed with a
// posted `lean` on each side. The eight macro-genre families all state a
// TWO-SIDED fork the world prices:
//
//   heat         push or lie low, priced
//   attrition    spend now to move well, or arrive thin
//   siege        what is held, and therefore what is given up
//   stewardship  which failing thing gets this week's hands
//   loyalty-web  choose whom to answer, in public
//   evasion      route versus concealment
//   observance   keep the rite or keep the day
//   rivalry      how much to stake against a posted result
//
// The seven reconstruction families are EXCLUDED, on their own recipe's terms:
// their DECISION is a selection among open gaps ("which gap to close this
// week") rather than a fork, and the cluster explicitly REFUSES "an antagonist
// who spends resources against the player". With nothing spending against the
// player there is no lean to post, and a door with no lean is the coin flip
// collectPlayLoopFindings already warns about — so requiring one there would
// manufacture the defect rather than prevent it.
//
// PARITY: the prompt states this membership once, in INST_ARTIFACT_COMPILER
// Step 5c, and validate.mjs (doorLeaningParity) asserts the two agree in both
// directions. A family named here and not there is a door the model is never
// told to build but the stage validator will demand.

export var DOOR_LEANING_FAMILIES = [
  'heat', 'attrition', 'siege', 'stewardship', 'loyalty-web', 'evasion',
  'observance', 'rivalry'
];

/**
 * isDoorLeaningFamily(family) -> boolean
 *
 * Whether a booklet declaring `family` must print a weekly doorChoice.
 * Unknown or absent families answer false: a missing declaration removes the
 * signal, it does not invent a requirement (the same stance
 * resolveFamilyBoardModes takes).
 *
 * SINGLE HOME (D93). The generator asks this to decide a BLOCKING stage error;
 * a second implementation would be a second opinion about what a booklet owes,
 * and each tree would only ever read its own.
 *
 * Consumers: generator/modules/validation.js (validateWeekSchema).
 * Guarded by singleDeclarationHomes() in scripts/validate.mjs.
 */
export function isDoorLeaningFamily(family) {
  var key = String(family || '').trim().toLowerCase();
  return DOOR_LEANING_FAMILIES.indexOf(key) !== -1;
}

// ── Output budgets (Teeth Round, Wave T1a — hoisted from validation.js) ──────
// The character caps every authored prose surface is held to. One table, three
// readers that cannot see each other:
//
//   generator/modules/validation.js   collectBudgetBreaches — measures them
//   generator/prompt_rules.js         INST_OUTPUT_BUDGETS — states them to the
//                                     model (literals, parity-asserted)
//   generator/api-generator.js        structured-schema maxLength (via the
//                                     constants.js re-export)
//
// They lived in validation.js while only validation.js read them. The Teeth
// Round makes breaches BLOCKING at the week/fragment/ending stages, which means
// the number now costs a retry — and a cap the prompt states differently from
// the cap the validator enforces would spend that retry on an instruction the
// model already followed. validate.mjs (outputBudgetParity) ties the surfaces.
//
// SEVERITY SPLIT (D19 preserved): blocking at a STAGE (a retry is cheap and the
// model can simply write less), warning on the ASSEMBLED booklet (delivery is
// never blocked). Same numbers, two severities, one home.
//
// markStripLabel is the Teeth Round addition: D89's "≤5 words, no digits" law
// made measurable. Five words at print-average length is 28 characters; the
// corpus's only strip-bearing fixture peaks at 27, and the label overflow the
// Playthrough Auditor flagged book-wide on Book 1 sat in the 31-36 range. The
// word law stays the doctrine; this is the cap a machine can hold it to.

export var OUTPUT_BUDGETS = {
  storyPrompt: 220, fragmentBody: 600, interludeBody: 240, endingBody: 1500,
  microLineCondition: 90, microLineCue: 120, citedAs: 90,
  returnBeatClosing: 140, returnBeatOpening: 140,
  doorOptionLean: 90, sealKeyHint: 120, sealUnlockCondition: 140,
  markStripLabel: 28
};

// ── Convergence patterns (Wave 2; the March 2026 convergence-variants design) ─
// The SHAPE of the endgame — how the weekly components become the password.
// Macro-genres vary the middle game; without this the last week was one shape
// in every book ever generated.
//
// These are recorded, not enforced: the artifact schema keeps the field
// optional (no corpus fixture carries one) while generation policy demands it.
// What each pattern may vary is bounded by the decode chain, and that boundary
// is doctrine in prompt_rules.js (INST_CONVERGENCE_DESIGN) rather than a
// comment here — see that section for why 'red-herring' filters READINGS and
// never component COUNT.

export var VALID_CONVERGENCE_PATTERNS = [
  'sequential-assembly', 'reordering', 'red-herring', 'dual-source'
];

// ── The triptych's audit trail (Wave 2) ─────────────────────────────────────
// `artifactIntent._x.rejectedReadings` records the two candidate readings that
// lost. It lives under `_x` because the artifact contract has no opinion on
// pipeline debris — but generation policy needs it MACHINE-COMPARABLE, because
// the only failure worth catching here is invisible in prose: three candidates
// that were one book described three ways.
//
// The field names and the axis vocabulary are stated once, here, because they
// are asserted in three places that cannot see each other — the structured
// skeleton schema literal (what the transport enforces), INST_ARTIFACT_COMPILER
// Step 3 (what the model reads), and validateSkeletonStage (what checks the
// answer). A rename in one of those was previously a silent no-op in the other
// two: the check would look at a field that no longer exists and pass.
//
// The axes are the MAJOR axes from §10.2 — the three on which two readings must
// differ to be genuinely different books.

export var REJECTED_READING_FIELDS = ['axis', 'value', 'oneLiner'];

export var REJECTED_READING_AXES = ['mechanicGrammarFamily', 'arcFamily', 'povFrame'];

// ════════════════════════════════════════════════════════════════════════════
// THE LUDIC SPINE (VISION §4.4 · PLAY.md §3 · Wave 4a)
// ════════════════════════════════════════════════════════════════════════════
// Play is global — the fourth constitution. Fun cannot be requested per
// component: every component is generated to be good AS a component, and a book
// of competent components can still be a series of things to do. So the
// composition is DECLARED before content exists, and the declaration is what
// the floors can hold.
//
// Everything below is the vocabulary that declaration is written in. The shapes
// live in booklet-schema.mjs (meta.playSpine, weeks[].fusionBeat); the demands
// live in prompt_rules.js; the teeth live in validation.js under
// generationFloors. This file owns only the closed sets, so no surface can
// invent a sixth marking or an eleventh library entry on its own.

// ── Dynamic markings (the FUSION §6 promotion) ──────────────────────────────
// FUSION §4.1's fusion score has always demanded "a dynamic marking (which
// weeks are loud, which sparse)"; until now nothing stored one, so the score
// was G-class — asked for, never held. A FIVE-STEP ORDINAL rather than free
// strings, and the reason is the D114 evidence frame: it already builds a
// per-week prose-volume curve indexed to the book's own maximum, so a marking
// on a comparable scale can be checked AGAINST that curve. "hushed" and
// "muted" and "quiet" as three free strings would cost that comparison and
// leave the marking decorative, which is what it already was.
//
// Ordered quiet → loud. The order is load-bearing (an ordinal is only an
// ordinal if the index means something); never alphabetize this array.
export var VALID_DYNAMIC_MARKINGS = ['quiet', 'spare', 'steady', 'full', 'loud'];

// ── The Ludic Library: the implemented shelf ────────────────────────────────
// PLAY.md §1 names two shelves. This is the IMPLEMENTED one — the playable
// families a generated book can already print today — and it is deliberately
// seeded from the atoms that exist rather than from the research menu, because
// a composition naming something unrenderable is a promise the engine breaks
// silently (the honest-when-lacking law exists precisely so the model says
// "the library lacks this" instead of inventing an entry).
//
// Entries are named for what they PLAY, not for the file that draws them: a
// composition reads "the spend economy wired to the decode chain", never
// "session-card + cipher-panel". LUDIC_LIBRARY_ATOMS carries the binding, and
// validate.mjs proves every atom named there is one the LiftRPG adapter
// actually emits — which is what keeps this list derived from the engine
// instead of aspirational.
//
// W5 (the Ludic Harvest) widens this from the researched shelf and gives each
// entry its Inputs/Process/Outputs/Locks. Until then: ten entries, and
// `honestGaps` is where everything else goes.
export var LUDIC_LIBRARY = [
  'reckoning-economy',  // markStrip ticks → tally → Banked → priced spends
  'board',              // the map: 6 geometries under 8 board-state modes
  'decode-chain',       // the weekly cipher and its workspace
  'clock-bank',         // fill / drain / race / tug-of-war pressure
  'companion-kit',      // the state-holding components (dashboards, tracks, stats)
  'oracle-pull',        // the d100 leg of the Hook loop
  'door-fork',          // the week's posted choice, priced on the reward side
  'sealed-cache',       // sealed-by-honor content and the key that opens it
  'boss-convergence',   // the convergence ceremony, assembly, and the locked finale
  'ledger-audit',       // the body audited: first / peak / change per movement
  // W5b — the harvest's first PROMOTION. `deduction-board` was tier 3 (needs a
  // new primitive) until the constrained-grid atom and its solver landed; it is
  // named for what it plays, not for the file, exactly like every entry above.
  // What is still tier 3 is the ARITHMETIC grid (kakuro, KenKen), which needs a
  // different solver — see contracts/ludic-library.mjs.
  'deduction-board'     // the logic grid and the nonogram, proven solvable
];

// The binding that makes the library non-aspirational. Keys ≡ LUDIC_LIBRARY
// (validator-asserted); every value names atom types the LiftRPG adapter emits
// (validator-asserted against liftrpg-adapter.js, the reachability authority —
// an atom that registers but is never emitted is D6-quarantined and cannot
// carry a library entry).
export var LUDIC_LIBRARY_ATOMS = {
  'reckoning-economy': ['session-card', 'reckoning-panel'],
  'board': ['map-panel'],
  'decode-chain': ['cipher-panel'],
  'clock-bank': ['clocks-panel'],
  'companion-kit': ['tracker'],
  'oracle-pull': ['oracle-table'],
  'door-fork': ['week-header'],
  'sealed-cache': ['fragment-doc'],
  'boss-convergence': ['boss-encounter', 'assembly-page', 'ending'],
  'ledger-audit': ['ledger-spread'],
  'deduction-board': ['constrained-grid']
};

// ── Spine budgets ───────────────────────────────────────────────────────────
// The arity rule is the anti-house-economy law made numeric. TWO is the floor
// because one entry is not a composition — it is a single-family pick, which is
// the thing §4.6 forbids by name. FOUR is the ceiling because a six-week book
// that wires five systems teaches none of them; the tension budget has nowhere
// to put a fifth.
//
// consequenceWithinWeeks is the echo law's clock: a fillable thing must be
// answered by a surface within this many weeks. 0 means "in the same week", and
// 2 is the ceiling because an answer three weeks out is not an echo, it is a
// coincidence the player has stopped waiting for.
export var SPINE_BUDGETS = {
  compositionMin: 2,
  compositionMax: 4,
  consequenceWithinWeeksMax: 2,
  consequenceWithinWeeksDefault: 1,
  // ── The harvest budgets (W5a) ─────────────────────────────────────────────
  // THREE RUNGS is EXIT's own ladder (clue 1 → clue 2 → solution) and the
  // ceiling rather than the target: a fourth rung is the answer written twice.
  // A one-rung "ladder" is a hint, not a ladder, so two is the floor.
  hintRungsMin: 2,
  hintRungsMax: 3,
  // Milestones are the deduction beats a book can carry without becoming a
  // checklist. Four is the ceiling for the same reason the composition's is:
  // a book that unlocks five theories has taught the player none of them.
  milestonesMax: 4,
  // Ladders per book. One puzzle family stalls a player; five costed ladders
  // is a walkthrough with a receipt.
  hintLaddersMax: 3
};

// ── The harvest vocabulary (W5a — the Ludic Harvest, tranche 1) ─────────────
// The tier-2 PATTERNS from the Ludic Library registry
// (contracts/ludic-library.mjs) that landed a declaration surface. Every enum
// below is quoted into INST_LUDIC_SPINE and checked both directions, the D124
// idiom: a menu that offers what the floors reject costs a retry the model
// cannot fix, and a floor that gates on what no menu offers fails every
// attempt.

// Nicholson's three puzzle organisations, as cited in the escape-room-as-
// analog-computing analysis. Declared per book, and DERIVABLE from the economy
// graph — which is the whole reason it is an enum rather than prose: the floor
// reads the declared structure back off the graph the book actually wired.
export var VALID_GATE_STRUCTURES = ['open', 'sequential', 'path-based'];

// What each structure OWES the graph. The floor reads these; the prompt quotes
// them. Stated as numbers rather than adjectives because "several leads" is not
// checkable and "three feeders into one sink" is.
//
//   minChainLength   the longest path in edges the graph must contain
//   minConvergence   the most distinct feeders any one node must take
//   minLeads         how many distinct PUZZLE surfaces must sit on a path to a
//                    sink — the count of live leads, not of source edges, so a
//                    book cannot satisfy "open" by naming six markStrips
//
// THE LADDER IS DELIBERATE AND SEQUENTIAL IS THE WEAKEST CLAIM. Three edges is
// the canonical LiftRPG pipeline — marks tally, the tally banks, the bank buys
// something — so a book that wires only that CAN honestly say "sequential", and
// every connected economy has at least one legal declaration. It is not free:
// two edges is a tally that banks and never spends, which is a chain with no
// second question. The other two claims cost real structure, because the thing
// that distinguishes them from a pipeline is convergence: "open" is Nicholson's
// several-leads-one-meta (three feeders into one surface) and "path-based" is
// two lanes that meet. A book with three leads that converge nowhere can
// declare none of the three, and that is the correct answer rather than a gap —
// nothing the player earns reaches the finale, which is the founding defect
// PLAY.md §2 names.
export var GATE_STRUCTURE_SHAPES = {
  'open': { minChainLength: 2, minConvergence: 3, minLeads: 3 },
  'sequential': { minChainLength: 3, minConvergence: 1, minLeads: 1 },
  'path-based': { minChainLength: 3, minConvergence: 2, minLeads: 2 }
};

// The legacy moves a pencil can perform. Daviau's permanent change, filtered by
// the pencil-only law: every one of these is performable with graphite and
// honour, and none of them needs a sticker, a seal, or a pair of scissors.
//
// SPELLING NOTE: `sealed-by-honour` carries the -our the schema comment and the
// prompt already use ("the honour system IS the mechanism"). PLAY.md §4.2
// spells the same idea -or in prose. The ENUM is the machine name; the prose is
// prose. Do not "fix" one to match the other — the parity pass quotes this
// constant, so a rename here is a rename in the prompt, and nowhere else.
export var VALID_LEGACY_MOVES = [
  'cross-out-forever',
  'permanent-map-mutation',
  'standing-rule-unlock',
  'sealed-by-honour',
  'session-count-gate'
];

// ── The puzzle vocabulary (W5b — the Ludic Harvest, tranche 2) ──────────────
// Two tier-3 families promoted out of the Ludic Library registry, and the ONE
// law that makes them different from everything else the pipeline generates:
// NO PUZZLE SHIPS UNSOLVED-BY-MACHINE. Every enum below exists because a
// deterministic solver (contracts/puzzle-solvers.mjs) has to dispatch on it,
// which is also why the lists are short — a value with no solver branch is a
// puzzle the gate cannot refuse, and an unrefusable puzzle is one the player
// discovers is broken at the gym.
//
// KAKURO AND KENKEN ARE DELIBERATELY ABSENT, and so is the dense crossword.
// The registry entries name them; this enum does not, because a family whose
// solver has not been written is a family the schema must not accept. When one
// lands, it is one enum value, one solver branch, and one prompt menu row.

export var VALID_CONSTRAINED_GRID_KINDS = ['logic-grid', 'nonogram'];

// The four clue forms a logic grid may carry. Closed, and closed on purpose:
// each one is a propagation rule in the solver AND a way the puzzle can be
// wrong, so a fifth form is a fifth rule and a fifth failure mode. These four
// are what real logic-grid clues actually say — "X is Y", "X is not Y", "the
// one who did P also did Q", "the one who did P did not do Q".
export var VALID_LOGIC_CLUE_TYPES = ['is', 'not', 'same', 'differs'];

// How a solved grid yields the code the economy reads. Every mode is a
// machine-executable derivation from the SOLUTION — never an assertion about
// it — because obligation (c) of the solver law is that the printed key is
// what the puzzle actually produces.
//
//   cell        one subject's value in one category
//   initials    the first letters of a category, in subject order
export var VALID_LOGIC_ANSWER_MODES = ['cell', 'initials'];

// A nonogram's only answer mode, and the reasoning is in the solver's own
// header: a picture cannot be key-matched, a sparse grid of characters can.
// Shade the cells, read the characters that landed inside the picture.
export var VALID_NONOGRAM_ANSWER_MODES = ['grid-letters'];

export var VALID_WORD_GRID_KINDS = ['word-search'];

// The eight reading directions of a word search. Order is quiet → loud in the
// sense the difficulty proxy uses: the first three read forwards, the rest
// read backwards or on a diagonal and cost more to scan.
export var VALID_WORD_SEARCH_DIRECTIONS = ['E', 'S', 'SE', 'NE', 'W', 'N', 'SW', 'NW'];

//   leftovers   the uncovered cells, row by row — the classic
//   word        one entry from the list, named by 1-based index
export var VALID_WORD_GRID_ANSWER_MODES = ['leftovers', 'word'];

// ── Branch refs: `door:W3/A` ────────────────────────────────────────────────
// An economy edge may declare WHICH SIDE of a fork carries it. Before this,
// `doorChoice` carried optionA/optionB with a label and a lean and nothing
// machine-readable, so the two branches were two names for one thing: the W4b
// simulated player could only report "reachable through a door, and the spine
// does not say which side" and had to escalate true per-branch simulation as a
// product decision. This is that decision, taken.
//
// THE GRAMMAR IS A SUFFIX, NOT A NEW KIND, and that is load-bearing. `door:W3`
// stays one node in the gate graph — the door the player reaches — because a
// door is TAKEN, not earned, and splitting it into two nodes would make the
// door itself contingent on itself. The BRANCH rides on the edge instead, so
// attributing a side never changes the topology, only which walk sees the edge.
//
// Exactly two sides, A and B, because `doorChoice` prints exactly two options.
// A three-way fork is a different printed surface and would need its own.
export var BRANCH_OPTIONS = ['A', 'B'];

export var BRANCH_REF_PATTERN = '^door:\\s*\\S.*/(?:' + BRANCH_OPTIONS.join('|') + ')$';

/**
 * parseBranchRef(ref) -> { doorRef, option, valid, raw }
 *
 * `door:W3/A` -> { doorRef: 'door:W3', option: 'A', valid: true }.
 *
 * Case-insensitive on the kind and the option (the pattern carries the
 * canonical spellings because it is quoted into prompt doctrine), and it
 * returns the DOOR REF rather than the door id so callers can hand the result
 * straight to parseSurfaceRef without rebuilding the string — the rebuild is
 * where a `door: W3` with a space would have lost its match.
 *
 * ONE PARAMETERIZED RESOLVER (D93), same split as parseSurfaceRef above: this
 * owns the grammar, the booklet's inventory of doors lives in validation.js and
 * in the sim's own reader.
 */
export function parseBranchRef(ref) {
  var raw = String(ref == null ? '' : ref).trim();
  var out = { doorRef: '', option: '', valid: false, raw: raw };
  if (!raw) return out;
  var slash = raw.lastIndexOf('/');
  if (slash <= 0) return out;
  var head = raw.slice(0, slash).trim();
  var tail = raw.slice(slash + 1).trim().toUpperCase();
  if (BRANCH_OPTIONS.indexOf(tail) === -1) return out;
  var parsed = parseSurfaceRef(head);
  if (!parsed.valid || parsed.kind !== 'door') return out;
  out.doorRef = 'door:' + parsed.id;
  out.option = tail;
  out.valid = true;
  return out;
}

// ── The surface-ref grammar ─────────────────────────────────────────────────
// Spine edges point at surfaces, and a pointer nobody can resolve is a promise
// nobody can check. This extends the precedent the manifestPointer / citeRef
// channels already set: a ref is a STRING with a kind prefix, so the grammar is
// readable by a model, quotable into a prompt, and parseable by a machine.
//
//   kind:id   — `week:W3` `session:W3.2` `markStrip:W3.2` `reckoning:W3`
//               `clock:Relief Ledger` `oracle:W4` `cipher:W2` `map:West Run`
//               `companion:Standing` `fragment:F.07` `door:W5` `seal:F.07`
//               `ending:E2`
//   singleton — `banked` `boss` `assembly`: the three surfaces a book has at
//               most one of, so naming an id would be noise.
//
// ONE PARAMETERIZED RESOLVER (D93). The split against buildSurfaceIndex in
// validation.js is deliberate and stated so nobody "unifies" it later: this
// function owns the GRAMMAR (is this a well-formed ref, and of what kind),
// which is closed, dependency-free, and needed by prompt parity checks and the
// W4b simulated player alike. The INDEX — which surfaces a given booklet
// actually prints — owns booklet traversal and lives beside the other booklet
// walkers in validation.js. Grammar here, inventory there.
export var SURFACE_REF_KINDS = [
  'week', 'session', 'markStrip', 'reckoning', 'clock', 'oracle', 'cipher',
  'map', 'companion', 'fragment', 'door', 'seal', 'ending'
];

export var SURFACE_REF_SINGLETONS = ['banked', 'boss', 'assembly'];

// Regex SOURCE (a string, not a RegExp — this file is read by Node, the
// browser, and the prompt-parity pass), built FROM the arrays so a new kind
// cannot land without the pattern following it.
//
// MATCH IT CASE-INSENSITIVELY (`new RegExp(SURFACE_REF_PATTERN, 'i')`). The
// pattern carries the CANONICAL spellings because it is quoted into prompt
// doctrine, where `markStrip:` is what the model should read; parseSurfaceRef
// accepts any casing, so a case-sensitive consumer would reject refs the
// resolver happily parses.
export var SURFACE_REF_PATTERN =
  '^(?:(?:' + SURFACE_REF_KINDS.join('|') + '):\\s*\\S.*|(?:'
  + SURFACE_REF_SINGLETONS.join('|') + '))$';

/**
 * parseSurfaceRef(ref) -> { kind, id, valid, raw }
 *
 * `kind` is the canonical spelling from the arrays above (matching is
 * case-insensitive so `Clock:` and `markstrip:` parse, but the canonical form
 * is what comes back — consumers index by it). `id` is '' for singletons.
 * `valid` false means the string is not a ref at all, which is a different
 * finding from a ref that parses but resolves to nothing: the first is a
 * grammar error the model can fix from the message, the second needs the book.
 */
export function parseSurfaceRef(ref) {
  var raw = String(ref == null ? '' : ref).trim();
  var out = { kind: '', id: '', valid: false, raw: raw };
  if (!raw) return out;

  var lowered = raw.toLowerCase();
  for (var s = 0; s < SURFACE_REF_SINGLETONS.length; s++) {
    if (lowered === SURFACE_REF_SINGLETONS[s]) {
      out.kind = SURFACE_REF_SINGLETONS[s];
      out.valid = true;
      return out;
    }
  }

  var colon = raw.indexOf(':');
  if (colon <= 0) return out;
  var head = raw.slice(0, colon).trim().toLowerCase();
  var tail = raw.slice(colon + 1).trim();
  if (!tail) return out;

  for (var k = 0; k < SURFACE_REF_KINDS.length; k++) {
    if (SURFACE_REF_KINDS[k].toLowerCase() !== head) continue;
    out.kind = SURFACE_REF_KINDS[k];
    out.id = tail;
    out.valid = true;
    return out;
  }
  return out;
}

/**
 * resolveShellFamily(rawShellFamily, artifactClass, themeArchetype) -> family
 *
 * The canonical shell family for an artifact identity. Co-located with
 * VALID_SHELL_FAMILIES because the enum IS the validity gate in step 1 — the
 * resolver and the enum cannot be separated without the "is this token real?"
 * question being answered twice.
 *
 * Unlike resolveDocumentType / resolveWorkspaceStyle this never returns null:
 * every booklet prints with some shell, and 'field-survey' is the declared
 * default (schema + assembly + renderer all already fell back to it).
 *
 * Resolution order:
 *   1. An authored shellFamily that slugs to a member of VALID_SHELL_FAMILIES
 *      wins outright.
 *   2. Otherwise the token is DISCARDED and artifactClass keywords decide.
 *   3. Otherwise the theme archetype decides.
 *   4. Otherwise 'field-survey'.
 *
 * SINGLE IMPLEMENTATION (D93). It lived twice — renderer/modules/booklet-models.js
 * and generator/modules/assembly.js — and the copies disagreed on 114 of 600
 * synthetic identity combinations. The renderer's semantics are the ones kept
 * here, because it was right on both root causes:
 *
 *   RC1 — rejected token fed back into inference. assembly.js called
 *   inferShellFamily(firstNonEmpty(value, artifactClass), ...) after already
 *   deciding `value` was not a valid family, so an invalid token like
 *   "ships-manifest" still steered the answer to ship-logbook and artifactClass
 *   never got a vote. A token judged invalid must carry no weight — step 2
 *   above reads artifactClass, not the discarded token.
 *
 *   RC2 — truncated archetype fallback. assembly.js mapped only
 *   'government' -> classified-packet; nautical, occult and minimalist booklets
 *   with an unrecognised artifactClass silently fell to field-survey on the
 *   generator path while the renderer gave them their proper shell.
 *
 * Consumers: generator/modules/assembly.js (normalizeArtifactIdentity),
 * renderer/modules/booklet-models.js (resolveArtifactIdentity).
 * Guarded by singleDeclarationHomes() in scripts/validate.mjs.
 */
export function resolveShellFamily(rawShellFamily, artifactClass, themeArchetype) {
  var token = String(rawShellFamily || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (VALID_SHELL_FAMILIES.indexOf(token) !== -1) return token;

  var klass = String(artifactClass || '').toLowerCase();
  if (klass.indexOf('ship') !== -1) return 'ship-logbook';
  if (klass.indexOf('court') !== -1) return 'court-packet';
  if (klass.indexOf('devotional') !== -1) return 'devotional-manual';
  if (klass.indexOf('witness') !== -1) return 'witness-binder';
  if (klass.indexOf('archive') !== -1 || klass.indexOf('household') !== -1) return 'household-archive';
  if (klass.indexOf('manual') !== -1) return 'technical-manual';
  if (klass.indexOf('packet') !== -1 || klass.indexOf('dossier') !== -1) return 'classified-packet';

  switch (String(themeArchetype || '').toLowerCase()) {
    case 'government': return 'classified-packet';
    case 'nautical': return 'ship-logbook';
    case 'occult': return 'devotional-manual';
    case 'minimalist': return 'technical-manual';
    default: return 'field-survey';
  }
}

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
  // Approach rings. Fewer than three rings is a target, not an approach; more
  // than six and the innermost band is thinner than the pencil that marks it
  // (the printed diagram is ~196px tall, so a 7th band lands under 4px).
  // Single-tier on purpose: unlike a node graph there is no "packed" render
  // fallback to absorb an over-eager model — a 9-ring diagram is not dense,
  // it is unusable — so generation policy IS the render ceiling here.
  concentric: { minRings: 3, maxRings: 6, ringLabelMaxChars: 18, maxBreachMarks: 8 },
  // Corridor graph. Two-tier like ptp.
  //
  // WHY THE NODE CEILING IS 15 AND NOT HIGHER: a maze reuses `mapState.nodes`,
  // the same physical array point-to-point uses, so one `maxItems` bounds both.
  // Raising it for maze would weaken the ptp gate that keeps a 20-node network
  // out of the corpus, and the maze does not need the room: at 12 marked
  // junctions the orthogonal corridors are already at minimum separation in a
  // 100-unit viewBox. Passages get their own array and so carry their own tier.
  maze: {
    maxNodes: 12,
    maxPassages: 14,
    renderMaxNodes: 15,
    renderMaxPassages: 20,
    nodeLabelMaxChars: 14
  },
  linearTrack: { minPositions: 3, maxPositions: 12 },
  playerDrawn: { maxPrompts: 4, maxSeedMarkers: 3 },
  cipher: { displayTextMaxChars: 350, extractionInstructionMaxChars: 200 },
  oracle: { entryCount: 10 },
  // ── The puzzle grids (W5b) ────────────────────────────────────────────────
  // These guardrails are load-bearing in a way the map ones are not: they are
  // what keeps the SOLVER's uniqueness proof tractable. The escalation valve
  // for a pathological puzzle is a tighter number here, never a weaker floor —
  // "we could not prove it" and "it is broken" are the same thing to a player
  // holding a pencil.
  //
  // Two-tier where the render can honestly absorb more than generation asks
  // for (the ptp idiom), single-tier where it cannot and the reason is stated.
  logicGrid: {
    // Generation policy. Five subjects is the sweet spot for a half-letter
    // page: the grid is subjects x (subjects x categories) cells, so five by
    // two is already 5 rows of 10 boxes.
    minSubjects: 3,
    maxSubjects: 5,
    minClues: 2,
    maxClues: 12,
    labelMaxChars: 22,
    // Render ceiling — one more row than generation asks for, because a
    // six-subject grid still fits and the corpus should not reject a good
    // hand-authored one. 6! per category is also the point where exhaustive
    // uniqueness stays instant (720 permutations).
    renderMaxSubjects: 6,
    // SINGLE TIER, like concentric: two category groups is what the printed
    // grid draws. A third group is not denser, it is a second page — and the
    // solver's cost is (subjects!)^categories, so the ceiling is where the
    // proof stops being free.
    maxCategories: 2
  },
  nonogram: {
    // Square-ish and small. Below 5 there is nothing to deduce; above 10 the
    // clue gutters eat the page and line-solving starts needing search.
    minSize: 5,
    maxSize: 10,
    // Render ceiling. The solver protects itself independently at 30 (32-bit
    // line masks); this is the printable limit.
    renderMaxSize: 15
  },
  wordSearch: {
    minSize: 6,
    maxSize: 12,
    renderMaxSize: 15,
    minWords: 4,
    maxWords: 10,
    wordMinChars: 3,
    wordMaxChars: 12
  }
};

// ── Crypto contract ──────────────────────────────────────────────────────────
// Validator-asserted against renderer/modules/constants.js and
// generator/liftrpg-encrypt.js; crypto.js is covered transitively, since it
// imports these constants from renderer/modules/constants.js rather than
// declaring its own.

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

// Ceiling on the `cells` strip. A print guardrail, not a style choice: past
// this the strip stops being a writing surface and starts being a page of
// graph paper.
export var WORKSPACE_CELL_MAX = 40;

// Columns assumed when a `cells` workspace names neither cellCount nor cols.
export var WORKSPACE_CELL_DEFAULT_COLS = 10;

/**
 * resolveWorkspaceCellCount(workSpace) -> integer
 *
 * How many squares a `cells` workspace prints. SINGLE IMPLEMENTATION, for the
 * same reason resolveWorkspaceStyle is: the renderer
 * (field-ops-primitives.js renderCellWorkspace) and the estimate
 * (atoms/cipher-panel.js workspaceHeight) must agree on the count or the
 * measured height and the promised height describe different grids, and the
 * failure is silent clipping rather than an error. A comment pair cannot
 * enforce that; a shared function can.
 *
 * `cellCount` is the authored total and wins outright when present. It is not
 * a cap on rows x cols: .plaintext-grid is a WRAPPING strip whose columns come
 * from the available width, so rows/cols were only ever a way to spell a
 * count — reading cellCount as min(rows x cols, cellCount) would silently
 * discard the author's number (Persephone asks for 11 cells with no rows/cols,
 * where the rows x cols fallback yields exactly 10).
 */
export function resolveWorkspaceCellCount(workSpace) {
  var ws = workSpace || {};
  var declared = parseInt(ws.cellCount, 10);
  if (isFinite(declared) && declared > 0) {
    return Math.min(declared, WORKSPACE_CELL_MAX);
  }
  var rows = parseInt(ws.rows, 10);
  var cols = parseInt(ws.cols, 10);
  return Math.min(
    (isFinite(rows) && rows > 0 ? rows : 1)
      * (isFinite(cols) && cols > 0 ? cols : WORKSPACE_CELL_DEFAULT_COLS),
    WORKSPACE_CELL_MAX
  );
}

/**
 * isStandardAlphaTable(referenceTable) -> boolean
 *
 * True when bossEncounter.decodingKey.referenceTable is the full standard
 * A=1 ... Z=26 mapping. This is the gate for deterministic password
 * derivation (decodeA1Z26): a table that does not print all 26 letters
 * cannot justify decoding a value the booklet never shows the player.
 *
 * SINGLE IMPLEMENTATION for both trees. The schema types the field as
 * `['string','array']` (booklet-schema.mjs), and `npm run migrate` rewrites
 * legacy object maps into the `[{ value, letter }]` array form — so the
 * predicate MUST accept both shapes. It lived twice before: a string-only
 * copy in generator/modules/assembly.js and an array-aware copy in
 * renderer/modules/utils.js, which meant a valid array-form A1Z26 table was
 * a hard error on the generator path and a working table on the render path
 * (AUDIT 19, second half). Array rows are normalized to the canonical
 * "N=L" string form so both shapes share one check.
 *
 * Consumers: generator/modules/assembly.js (password derivation),
 * generator/modules/validation.js (strict rules), renderer/modules/utils.js
 * (deriveBookletPassword).
 *
 * Its decoder, decodeA1Z26, lives directly below for the same reason: the
 * predicate is the gate and the decoder is the thing gated, and splitting them
 * across trees is what produced the drift both now record.
 */
export function isStandardAlphaTable(referenceTable) {
  if (!referenceTable) return false;
  var table = referenceTable;
  if (Array.isArray(table)) {
    table = table
      .map(function (row) { return row && (row.value + '=' + row.letter); })
      .filter(Boolean)
      .join(' ');
  }
  if (typeof table !== 'string') return false;
  var pairs = table.match(/\d+=\s*[A-Za-z]/g);
  if (!pairs || pairs.length < 26) return false;
  for (var i = 0; i < 26; i++) {
    var expected = (i + 1) + '=' + String.fromCharCode(65 + i);
    var found = false;
    for (var j = 0; j < pairs.length; j++) {
      if (pairs[j].replace(/\s/g, '').toUpperCase() === expected) { found = true; break; }
    }
    if (!found) return false;
  }
  return true;
}

/**
 * decodeA1Z26(values) -> string
 *
 * Converts an array of numeric values to uppercase letters via A=1 ... Z=26.
 * Returns the EMPTY STRING when the array is empty or any value is not an
 * integer in 1-26 — i.e. "no password could be derived". Callers test it for
 * truthiness; none distinguishes empty-string from any other falsy failure.
 *
 * SINGLE IMPLEMENTATION (D93). It lived twice, and the copies returned
 * different falsy values for the same failure: '' in renderer/modules/utils.js,
 * null in generator/modules/assembly.js. The divergence was unobservable —
 * all three call sites branch on truthiness or coerce through
 * String(value || '') — so this unification is behaviour-preserving. The ''
 * return is kept because it makes the function total over strings: the
 * renderer feeds the result straight into safeUpper(), where a leaked null
 * would otherwise have had to survive on the `|| ''` guard alone.
 *
 * The gate for calling this at all is isStandardAlphaTable() above: a
 * referenceTable that does not print all 26 letters cannot justify decoding a
 * value the booklet never shows the player.
 *
 * Consumers: generator/modules/assembly.js (enforceBookletDerivedFields),
 * generator/modules/validation.js (demoPassword cross-check),
 * renderer/modules/utils.js (deriveBookletPassword).
 * Guarded by singleDeclarationHomes() in scripts/validate.mjs.
 */
export function decodeA1Z26(values) {
  if (!Array.isArray(values) || values.length === 0) return '';
  var letters = '';
  for (var index = 0; index < values.length; index += 1) {
    var value = Number(values[index]);
    if (!Number.isInteger(value) || value < 1 || value > 26) return '';
    letters += String.fromCharCode(64 + value);
  }
  return letters;
}
