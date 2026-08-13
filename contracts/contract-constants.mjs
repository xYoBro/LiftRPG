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

// What a `mapState` with no declared `mapType` renders as. Documented behaviour
// since the first map shipped, and hard-coded as a literal in TWO renderer
// files (`field-ops-models.js` resolveMapState, `field-ops-primitives.js`'s
// `data-map-type` stamp). This constant exists because the two-source law's
// reader has to answer "what geometry does this book actually have?" and
// "absent" is the wrong answer — a board with no declared type is a GRID, which
// is the single most common default in the corpus and the finding the fourth
// referee exists to name. `mapDefaultParity()` in validate.mjs holds the two
// renderer literals to this value; folding them into an import is a renderer
// change and belongs to a renderer wave.
export var DEFAULT_MAP_TYPE = 'grid';

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

// ── The cipher-technique menu, and the ceiling it puts on the variety floor ─
//
// THE DEFECT THIS CLOSES (W3 length audit, 2026-08-13). `cipherVarietyFloor`
// was `min(max(n-2,3), max(n-1,1))` — 4 at six weeks, which is the Teeth
// Round's stated floor and correct there. It has no ceiling, so it scaled to 6
// at eight weeks, 8 at ten, and 10 at twelve. The largest vocabulary any prompt
// surface offers a model is the list below. A BLOCKING gate that demands ten
// distinct techniques while the doctrine teaches eight is not a high standard;
// it is a stage the model can only satisfy by inventing vocabulary the same
// doctrine tells it not to invent, and every retry spends money to fail the
// same way.
//
// SO THE FLOOR IS DERIVED-OR-STRICT: demand min(f(weeks), menu size), with the
// size READ from this array. A literal ceiling here would be the same defect
// one level up — a number that stops being true the first time a technique is
// added or retired.
//
// ONE HOME, TWO AUDIENCES, the D124 idiom. This array is what the model is
// OFFERED (INST_CIPHER_DESIGN quotes it exactly, both directions, asserted by
// `cipherMenuParity()` in validate.mjs) and simultaneously what the floor may
// demand. They cannot drift, because there is only one list.
//
// NOT THE SAME VOCABULARY AS `CIPHER_FAMILY_REGISTRY`, deliberately. That
// registry (renderer/modules/mechanic-registry.js) maps machine `sourceType`
// tokens — `substitution`, `path-tracing` — onto five RENDER-side family
// labels for differentiation measurement, and collapses everything else to
// `custom-cipher`. It classifies books after the fact; this menu is the
// authoring vocabulary a model chooses from. Asserting a correspondence
// between them would be inventing one: the two lists answer different
// questions and are allowed to differ in length.
export var GENERATION_CIPHER_TECHNIQUES = [
  'constraint logic',
  'spatial route reading',
  'fragment cross-reference',
  'pattern recognition',
  'typographic anomaly',
  'observational anomaly hunting',
  'metapuzzle assembly',
  'process deduction'
];

// The floor below which no book of any length drops. Three techniques is what
// a four-week book (three non-boss weeks) can carry, and it is the number the
// existing formula already produced there.
export var CIPHER_VARIETY_MIN = 3;

// ── How long a generated book may be ────────────────────────────────────────
//
// `parseWeekCount()` in generator.js has clamped to these two numbers since it
// was written; they lived only there, as literals inside a Math.max/Math.min
// pair. Hoisted for two reasons, both W7:
//
//   1. `weekCountLiteralScan()` in validate.mjs needs a THRESHOLD it can
//      defend. A prompt line that says "two weeks" is a subset quantifier and
//      stays true at every legal length; a line that says "six weeks" is a
//      claim about the whole book, and the whole book is not a constant. `min`
//      is exactly the line between those two readings — no number below it can
//      be describing the book's length, because no book is that short.
//   2. A second copy of the clamp would drift, and the clamp is what decides
//      whether a 16-week canonical program is planned at 16 or silently at 12.
//
// PARITY: validate.mjs asserts generator.js's clamp still quotes these values.
export var BOOK_WEEK_BOUNDS = { min: 4, max: 12 };

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

// ── The authored design language (W6, meta.designLanguage) ───────────────────
//
// VISION §8's law made machinery: *authored design language wins; the archetype
// guarantees legibility.* The ten archetypes are a floor of typographic
// coherence and print-safety. The book's own design decisions — pressed on top
// of that floor — are what make two books of the same genre look like different
// designers' work across a table.
//
// NAMING (a correction to the wave brief, recorded because the collision is
// live): this block is `designLanguage`, NOT `designSpec`. `fragments[].designSpec`
// and `endings[].designSpec` already exist, already render (`data-paper-tone`,
// `data-primary-typeface`, `data-header-style`), and mean a PER-DOCUMENT
// treatment. A second `designSpec` at book level, with an unrelated shape, is
// the two-atom-registries collision the GLOSSARY exists to prevent. The name
// used here is VISION §8's own ("authored design language wins").
//
// THE DRAWING LAW BINDS THIS BLOCK (D115). Every axis below paints and never
// measures — background layers, outlines, box-shadows, fills, masks, opacity —
// because phase-1 estimation has no DOM and cannot resolve a custom property.
// ONE axis is exempt and it is exempt for a stated reason: `typeVoice` changes
// the FACE, which changes advance widths, and it is legal only because D121
// built the channel that measures them (`resolveTypeMetrics()` reads the
// resolved stacks; every atom estimate is corrected through it). A geometry
// axis is admissible when — and only when — the estimate can see it.
//
// REFUSED, with the refusal recorded rather than the axis quietly redesigned:
//   • layoutIntensity's GEOMETRIC half (column counts, page margins, the type
//     scale). The research defines the Mothership↔Mörk Borg spectrum largely in
//     those terms and they are exactly what the estimate cannot see. What ships
//     is the spectrum's INK: bar weight, frame, slug inversion, texture
//     pressure. See THE INTENSITY SPLIT in renderer/modules/theme.js.
//   • `newspaper-columns` as a document recipe. Real `column-rule` needs real
//     multicol, and multicol reflow roughly halves a document's height while
//     fragment-doc.js estimates it at full measure. Queued as a Layer-1 wave
//     (adapter-carried recipe → column-aware estimate → ladder mirror), not
//     shipped as a token.

// How hard the book presses its own layout language, 0.0–1.0. The taste axis,
// deliberately NOT called density: `density` is the 0.0–1.0 OVERFLOW SOLVER's
// word (engine/density-util.js) and one book-authored value must never be
// confused with the solver's per-page pressure. Absent ⇒ ARCHETYPE_INTENSITY.
export var LAYOUT_INTENSITY_BOUNDS = { min: 0, max: 1 };

// The press this book pretends to have come off. Procedural CSS only — zero
// raster assets (VISION §8), every one legible after a monochrome photocopy.
// 'none' is a real answer: it means the archetype's own paper texture stands,
// which is how the nine bespoke archetype textures became a fallback layer
// rather than dead weight.
export var VALID_PRODUCTION_TEXTURES = [
  'none', 'photocopy', 'typewriter', 'risograph', 'mimeograph', 'letterpress'
];
export var DEFAULT_PRODUCTION_TEXTURE = 'none';

// Texture-as-tone: the ladder that replaces grey with pattern, so a value
// survives a laser printer that has no grey (zine-research §"Texture-as-Tone").
// Ordered light → dark and the ORDER IS LOAD-BEARING: the ladder is a value
// scale, and gen-reference publishes it as one.
export var TONE_TEXTURE_LADDER = [
  'none', 'stipple', 'hatching', 'cross-hatch', 'dense-cross-hatch', 'reverse-stipple'
];
export var DEFAULT_TONE_TEXTURE = 'none';

// The type pairing. THE PALETTE IS FOUR FACES AND NOT ONE MORE (D121/D92):
// every name here composes Share Tech Mono, Libre Baskerville, IBM Plex Mono
// and Playfair Display — the vendored set, each with a measured FACE_ADVANCE_EM.
// A fifth face is vendor + measure work (D123 delta A2), and typeMetricsFaceParity
// fails the build if this list ever reaches past what is measured.
export var VALID_TYPE_VOICES = [
  'archetype-default', 'literary-press', 'terminal-log', 'field-notebook',
  'typewriter-file', 'broadsheet', 'display-clash', 'plain-record'
];
export var DEFAULT_TYPE_VOICE = 'archetype-default';

// The found-document recipes, keyed by the document FAMILY the renderer already
// stamps on every fragment block (`data-document-family`, from
// renderer/modules/atom-registry.js). Keying on the existing attribute is why
// this axis needs no renderer change at all.
export var VALID_DOCUMENT_FAMILIES = [
  'bureaucratic', 'hand-authored', 'personal', 'recorded', 'anomalous', 'custom-document'
];
export var VALID_DOCUMENT_RECIPES = [
  'plain', 'memo-grid', 'label-borders', 'ledger-rules', 'stamped-file'
];
export var DEFAULT_DOCUMENT_RECIPE = 'plain';

// Into the Odd's colour-coded margins, made B&W-honest: the signal is carried by
// WEIGHT and PATTERN, never by hue (the standing print law). Keyed off
// `data-page-type`, which the page factory already stamps — so the semantics are
// the page kinds the engine actually has, not a parallel vocabulary.
export var VALID_MARGIN_SEMANTICS = ['none', 'edge-band', 'tab-marks', 'rule-weight'];
export var DEFAULT_MARGIN_SEMANTICS = 'none';

// How much ink the press laid down. Scales the drawn layers together (texture,
// band, stamp) so a book reads as one impression rather than a pile of effects.
// 'crushed' is the photocopier's blown midtones and is the only value that
// touches the page filter.
export var VALID_INK_DISCIPLINES = ['light-touch', 'standard', 'heavy-press', 'crushed'];
export var DEFAULT_INK_DISCIPLINE = 'standard';

// The seal/stamp register. Drawn with masks and shadows — a seal that needed a
// height would be the D105 class, so none of these has one.
export var VALID_SEAL_TREATMENTS = ['none', 'rubber-stamp', 'wax', 'embossed', 'perforated'];
export var DEFAULT_SEAL_TREATMENT = 'none';

// ── Artifact identity ────────────────────────────────────────────────────────
// Previously these lived only as silent coercion tables in assembly.js
// (AUDIT finding 74). They are now enforced enums.

export var VALID_SHELL_FAMILIES = [
  'field-survey', 'classified-packet', 'ship-logbook', 'witness-binder',
  'court-packet', 'devotional-manual', 'household-archive', 'technical-manual'
];

// ── The shell menu, with reasons (D144) ─────────────────────────────────────
// THE DEFECT THIS CLOSES, measured 2026-08-13 on the real standard-pipeline
// shell prompt (77,061 characters): the eight family names appeared ZERO times
// in it. `shellFamily` appeared once, inside a field list, with no menu, no
// guidance and no derivation demand. The compiler was asked to declare the
// artifact's whole filing identity from a vocabulary it was never shown, so it
// answered from the one shell every LLM already knows how to write — the
// security packet — and D135's byte-identical government dress across four
// maximally divergent briefs follows from that alone.
//
// A NAME IS NOT A MENU. `VALID_SHELL_FAMILIES` above is an acceptance set; a
// model shown only the set still has to guess what a `household-archive`
// refuses that a `court-packet` does not. So each family carries the two
// clauses that make it CHOOSABLE:
//
//   files    — what kind of world files this way. The positive selection cue.
//   refuses  — what the shell will not do. The discriminator, and the reason
//              this table is not eight synonyms for "official-looking": a
//              shell that refuses nothing is a costume.
//
// ONE HOME, TWO AUDIENCES (the D124 idiom, and the D106 byte-quoting standard
// that already binds SHELL_CITATION_STYLES to INST_POINT_OF_USE). This table is
// the single source; the Step 7a menu in prompt_rules.js quotes both clauses
// verbatim and `shellMenuParity()` in validate.mjs diffs them both directions,
// count included. Keys ≡ VALID_SHELL_FAMILIES ≡ SHELL_CITATION_STYLES keys —
// asserted, because a family with a citation grammar and no reason to be chosen
// is a family that only gets chosen by accident.
//
// `investigation: true` marks the four shells that can carry an INVESTIGATION
// home pull without becoming a security packet. That flag exists because the
// two defaults are one defect: a compiler that reads "the player assembles
// evidence" and knows only one evidence-shaped shell will file a repertory
// theatre as a classified packet. Four peers break the reflex. The Step 7a
// literal names exactly these four, derived — never a second hand-kept list.
export var SHELL_FAMILY_GUIDANCE = {
  'field-survey': {
    files: 'a world that goes out and measures the ground itself — sheets filled in where the work happened, stations numbered in the order they were walked',
    refuses: 'the verdict; a survey records what was found and leaves the judging to whoever reads it later',
    investigation: true
  },
  'classified-packet': {
    files: 'a world with something to withhold and an apparatus for withholding it — compartments, clearances, a cover sheet naming who may not read on',
    refuses: 'the personal voice; a packet is assembled by a body that outlives the people inside it',
    investigation: false
  },
  'ship-logbook': {
    files: 'a world that stands watches — the entry gets made because the hour came, whether or not anything happened in it',
    refuses: 'hindsight; a log is written forward and does not yet know what it is recording',
    investigation: false
  },
  'witness-binder': {
    files: 'a world rebuilt out of what people said — statements taken one at a time, tabbed and cross-referenced by someone who was not there',
    refuses: 'a single authoritative account; the binder\'s whole shape is that the accounts disagree',
    investigation: true
  },
  'court-packet': {
    files: 'a world where a claim is being decided — exhibits, schedules and recitals filed by parties who each want a different answer',
    refuses: 'neutrality about the outcome; every document in it was filed BY someone, FOR something',
    investigation: true
  },
  'devotional-manual': {
    files: 'a world that keeps an observance — offices, rubrics and antiphons telling a practitioner what to do and when, year after year',
    refuses: 'novelty; the manual\'s authority is that it has said the same thing for a very long time',
    investigation: false
  },
  'household-archive': {
    files: 'a world that kept its own papers without meaning to — bundles, drawers and loose leaves in no order but the order they were put down in',
    refuses: 'the finding aid; nobody catalogued this, which is exactly why what is in it surprises the reader',
    investigation: true
  },
  'technical-manual': {
    files: 'a world that is OPERATED — figures, clauses and procedures written so a competent stranger can keep the thing running',
    refuses: 'the story of who wrote it; a manual is addressed to whoever is holding it now',
    investigation: false
  }
};

// The four shells that carry an investigation without a security apparatus.
// DERIVED (D124): flip the flag above and the menu follows. A hand-kept list
// here would be the second copy that every hand-kept copy in this repo became.
export var INVESTIGATION_CAPABLE_SHELLS = VALID_SHELL_FAMILIES.filter(
  function (family) {
    return !!(SHELL_FAMILY_GUIDANCE[family] && SHELL_FAMILY_GUIDANCE[family].investigation);
  }
);

// ── The institutional referent (D136's law, made machine-checkable) ─────────
// D136 ruled that absent an institutional referent in the brief, classifying
// the register as institutional is a MISREAD. That law reached the model as
// prose and reached no gate at all, because nothing could ANSWER "does this
// brief contain one?" This list is the answer, and it is deliberately narrow:
// every term names a BODY THAT RUNS ON PROCEDURE, which is what "institutional"
// has to mean if the word is to exclude anything. A world can be formal,
// ornate, sinister, hierarchical or rule-bound without containing one of these.
//
// Used by the D144 shell floor (a `classified-packet` chosen over a brief with
// no referent owes a written reason) and byte-quoted into the Step 7a
// anti-default, both directions, by `shellMenuParity()`.
//
// NOT a widening of D136's prose line, which names four of these plus the
// catch-all "any body that runs on procedure" and stays as it is: that sentence
// states the REGISTER law to a reader, this array answers a yes/no question for
// a gate, and the gate is deliberately the more literal of the two.
export var INSTITUTIONAL_REFERENT_TERMS = [
  'bureau', 'ministry', 'agency', 'department', 'institute', 'academy',
  'commission', 'directorate', 'authority', 'tribunal', 'constabulary',
  'precinct', 'administration', 'secretariat', 'inspectorate'
];

/**
 * hasInstitutionalReferent(text) -> boolean
 *
 * Whether a brief names a body that runs on procedure. Word-boundary matched
 * and case-insensitive; plural forms are covered by the trailing `s?`.
 *
 * SINGLE HOME (D93), co-located with the list it reads, for the same reason
 * resolveCitationStyle is: a consumer that rebuilt this predicate would answer
 * "is this brief institutional?" a second time in its own dialect, and the two
 * answers would diverge exactly where it mattered. Guarded by
 * singleDeclarationHomes() in scripts/validate.mjs.
 *
 * Consumers: generator/modules/validation.js (the D144 shell floor).
 */
export function hasInstitutionalReferent(text) {
  var haystack = String(text || '');
  if (!haystack) return false;
  for (var i = 0; i < INSTITUTIONAL_REFERENT_TERMS.length; i++) {
    if (new RegExp('\\b' + INSTITUTIONAL_REFERENT_TERMS[i] + 's?\\b', 'i').test(haystack)) {
      return true;
    }
  }
  return false;
}

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
//   minPointersPerWeek (1) — THE FLOOR OF PRESENCE, added by the depth wave
//     (VISION §8: "more referenceable, cross-linked text, pages worth flipping
//     back to"). Every number above is a ceiling, and a table of ceilings only
//     answers "too many?" — it reads a book with ZERO pointers as perfectly
//     within budget. Measured at the moment it was added: 19 of the 20 corpus
//     fixtures print exactly 0 pointers across both channels and the twentieth
//     prints 2. A book whose documents never name each other is a pile, not an
//     archive, and D111 already caught this absence once as a prompt-routing
//     bug rather than model laziness — which is precisely why it needs a
//     standing instrument instead of a re-reading.
//     Half the ceiling, deliberately: the band is 1–2 pointers a week, which
//     for a six-week book with twelve to eighteen fragments means six to
//     twelve — one document in two or three naming another. WARN-class like
//     every other row here, and arbitrary until playtest in exactly the same
//     way (§7.2). The prompt states the BAND (INST_POINT_OF_USE), and
//     validate.mjs pointerBandParity() holds the two together.
export var POINTER_BUDGETS = {
  minPointersPerWeek: 1,
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
//
// ── THE DENSITY LAW (VISION §8, ratified D146; landed by the depth wave) ────
// Restraint governs the SOUND of the prose, never its supply. These numbers
// stopped being brevity-as-safety and became what the PAGE can hold: a cap is
// the page's limit, not caution's. A wall of text is a failure; so is an empty
// page, and every page must pass both tests at once — inviting on the surface,
// navigable in seconds.
//
// THE CAP IS WHAT GETS WRITTEN, which is why the numbers and not the targets
// are the lever. Measured over the corpus at the moment of the raise: fragment
// bodies median 591 / p90 598 against a cap of 600; ending bodies median 1457 /
// p90 1497 against a cap of 1500 (and a stated target of 400–700 that every
// book ignored); interlude bodies median 228 / max 240 against a cap of 240.
// Three surfaces, three caps, and the distribution piled against each one. The
// model was never being terse — it was obeying.
//
// EVERY RAISE IS PRICED AGAINST ITS OWN SURFACE'S GEOMETRY, per field, because
// a budget the layout cannot absorb is an overflow factory (the D71 class).
// The arithmetic, so a later wave can argue with it rather than guess at it:
//
//   fragmentBody 600 → 1050. `.fragment-doc-body` at the dense tier (density
//     0.6) is 7.88px on a 10.11px line in a 408px text column — 89 characters
//     a line. An archive page is 741px and packs documents with a 6px gutter,
//     so THREE documents fit at 243px each and the fourth is what breaks. That
//     243px is a cliff, not a slope: swept over all 238 corpus fragments at
//     their real chrome (p90 111px — meta box, type slug, signature, frame,
//     seal band), the p90 document measures 186px at a 600-character cap (three
//     to a page, 77% of it filled), 234px at 1050 (three to a page, 96% filled)
//     and 246px at 1100 — where the third document no longer fits and the page
//     drops to 67%. 1050 is the last round number under the cliff. The two
//     instruments agree on it: the atom's estimate and the Node planner mirror
//     in check-layout-regressions.js both put a capped document at 263px on the
//     tidewall fixture's heaviest chrome. At 600 an archive page carried four
//     documents in 614 of its 741px and left 127px of white on every spread —
//     that is the empty-page complaint stated as a number, and the adapter's own
//     calibration note had already named its cause ("post-budget-trim the corpus
//     tops out at 600 body characters… not one corpus fragment reaches even
//     40%. A memo does not read as a document because it is alone on a sheet").
//     CEILING, ASSERTED: the cap must stay below STANDALONE_MIN_CHARS (2900),
//     or the budget itself would start converting shareable documents into
//     page-locking ones — validate.mjs proseBudgetsFitTheirPages() holds it.
//
//   interludeBody 240 → 700. The interlude is a FULL-PAGE atom: its estimate is
//     PAGE_BUDGET.heightPx whatever it holds, so 240 characters bought a whole
//     printed page for five lines of type. `.interlude-body` is 10pt on a 1.65
//     leading (22px a line) across a 393px measure (88% of the frame) — ~50
//     characters a line. The page spends ~105px on chrome (page header, 18pt
//     title, the reason line) and SHARES the rest with the payload block, which
//     is the term that bounds this one: measured at density 0.6 over the corpus,
//     a map payload is 177px flat, a clocks payload runs 92px at the median and
//     275px at p90, a cipher payload 231px at the median and 390px at p90. The
//     reserve is therefore 300px, which covers every payload but a top-decile
//     cipher. 741 − 105 − 300 = 336px = 15 lines = ~750 characters; 700 is that
//     with a line of margin. A quiet interlude (payloadType `none`) has ~300px
//     more than it needs, which is the right direction for a ceiling — and the
//     prompt line names the trade, because the model chooses both terms.
//
//   endingBody 1500 → 2400 (target 1600–2200). Also a full-page atom, and the
//     only one that SPLITS: splitEndingBody() measures real fit in the browser
//     and breaks on paragraph boundaries. A single-paragraph body cannot split
//     at all, so the cap must be a one-page number. `.endings-body` is 7pt on
//     the 1.6 body leading (14.93px a line) across a 447px measure — 82
//     characters a line. Worst-case chrome (wrapped 22pt title, kicker,
//     documentType, the final line's rule) is ~178px, leaving ~563px = 37
//     lines = ~2,950 characters on one page. 2400 keeps ~550 characters of
//     slack against that worst case AND equals fallbackSplitEndingBody()'s
//     PAGE_CHAR_BUDGET, which is this repo's existing statement of how much
//     prose is one ending page. Asserted, not coincidental — see the same
//     validate.mjs pass. Raising it further means raising that constant too,
//     and that changes how many pages a book has on the no-DOM path.
//
// WHAT DID NOT MOVE, AND WHY THAT IS NOT AN OVERSIGHT. Every remaining row is
// a SESSION-CARD surface (storyPrompt, the microLine pair, the returnBeat
// pair, doorOptionLean, citedAs, markStripLabel), and the session card is the
// one surface in the book whose two instruments disagree: three cards share
// one page under a single-page group policy, and a browser-proven-clean page
// (tests/playwright/gameplay-surfaces.spec.js, which asserts zero overflow,
// zero clipping and zero unsat on a booklet carrying every Wave-4 surface)
// estimates at 1134px against a ~750px live area — 1.53×. Phase-1 estimation
// says there is no headroom at all; the browser says there is headroom nobody
// has measured. A cap raised on a surface whose model and whose render
// disagree by half is the D71 defect by definition, so these rows wait for a
// measurement pass. They are also the rows the density law bears on least:
// they are cues read in a ninety-second rest window, where point-of-use §5.2
// budgets them HARDER than prose on purpose. The empty page was never a
// session page.

// THE LENS THAT WATCHES THE RAISE (VISION §8; the depth wave's report axis).
// A raised cap is a permission, not an outcome — the model can take it or leave
// it, and the only way to know which is to measure. PAGE_FILL_THIN_RATIO is the
// line below which a surface is reported as running thin: mean authored length
// under half of what its page was budgeted to hold.
//
// REPORT-CLASS AND ARBITRARY, in the D19 sense and stated as plainly as
// POINTER_BUDGETS states it about itself. Half is a lens, not a law: it was
// chosen because at the moment of the raise every measured surface sat at
// 95-99% of its OLD cap, so a book that lands under 50% of the new one has
// changed behaviour rather than merely varied. quality.js auditPageFill() is
// the only reader, it writes warnings and never a weakSpot, and nothing in
// QUALITY_BLOCKING_AREAS can reach it.
export var PAGE_FILL_THIN_RATIO = 0.5;

export var OUTPUT_BUDGETS = {
  storyPrompt: 220, fragmentBody: 1050, interludeBody: 700, endingBody: 2400,
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
  'deduction-board',    // logic grid, nonogram, sudoku, truth-tellers, sequence — all proven
  'word-hunt',          // the letter board, every word machine-verified in it
  // The arsenal wave's promotion, closing W5b's one stated deferral: kakuro and
  // KenKen have their solvers. It is a SEPARATE entry from the deduction board
  // because it asks a different verb — the player adds, rather than eliminates
  // — and these entries are named for what they play.
  'arithmetic-grid'     // kakuro and KenKen, every filling proven unique
];

// ── The harvest patterns, as an acceptance set (D144) ───────────────────────
// The MENU is derived in contracts/ludic-library.mjs (`LUDIC_HARVEST_PATTERNS`
// = the tier-2 entries marked `wired`), and that stays the single home of the
// derivation. This is the same list in the one place the BROWSER can reach it,
// for exactly the reason LUDIC_LIBRARY sits here while the registry sits there:
// ludic-library.mjs is Node-only (nothing at runtime reads it), and both
// booklet-schema.mjs and generator/modules/validation.js must be browser-safe.
//
// `ludicRegistryIntegrity()` in validate.mjs holds the two equal IN ORDER, the
// same way it already holds LUDIC_LIBRARY equal to the registry's implemented
// tier. Wiring a queued pattern is one flag in the registry; this list follows
// or the build fails.
//
// WHY IT NEEDED A HOME AT ALL (D144): `meta.playSpine.harvestPatterns` lets a
// book DECLARE which of these it composed with, and the adoption floor then
// checks it BUILT what it declared. Declaring is optional — a book that uses
// none is a legitimate book (the W5a ruling) — but a declaration nothing checks
// is worse than no declaration, because it reads as evidence.
export var VALID_HARVEST_PATTERNS = [
  'gate-structure', 'hint-ladder', 'deduction-milestone', 'legacy-pencil-move',
  'found-not-found-gating', 'branch-attributed-consequence', 'priced-spend',
  'timed-affordance', 'book-referential-examination'
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
  // Two entries, one atom, and that is correct rather than a smell: the atom is
  // the printed object and the entry is the play. `constrained-grid` draws a
  // matrix of pencil cells; whether the player eliminates in it or adds in it is
  // the thing a composition is choosing between.
  'deduction-board': ['constrained-grid'],
  'word-hunt': ['word-grid'],
  'arithmetic-grid': ['constrained-grid']
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
// THE DENSE CROSSWORD IS DELIBERATELY ABSENT. The registry entry names it; this
// enum does not, because a family whose solver has not been written is a family
// the schema must not accept. When one lands, it is one enum value, one solver
// branch, and one prompt menu row — which is exactly what the arsenal wave did
// for the three filled grids below, closing the W5b deferral that named them.
//
// `sudoku`, `kakuro` and `kenken` share one printed object (a matrix the player
// writes DIGITS into) and therefore one answer rule; they do not share a
// solver, because a Latin square, a constrained integer partition and a caged
// arithmetic square are three different proofs.

export var VALID_CONSTRAINED_GRID_KINDS = [
  'logic-grid', 'nonogram', 'sudoku', 'kakuro', 'kenken', 'truth-tellers', 'sequence'
];

// ── The sequence (route / schedule) vocabulary ──────────────────────────────
// WHY IT IS NOT A LOGIC GRID is the exact mirror of the truth-teller answer.
// There the BOARD matched and the mathematics did not; here the mathematics
// matches perfectly — items against slots IS a bijection — and what does not
// match is the CONSTRAINT LANGUAGE. "The ledger was collected before the
// warehouse" is an ORDINAL fact, and the logic grid's four forms cannot express
// one. A grid whose clues can only say "Tuesday is not the mill" is not a
// schedule puzzle; it is a matching puzzle whose values happen to be sorted.
//
// A ROUTE AND A SCHEDULE ARE ONE OBJECT: a set of things in an order, under
// constraints. The slots carry whichever fiction the book wants — stops, days,
// shifts, berths, watches — so one kind serves both.
export var VALID_SEQUENCE_CONSTRAINT_TYPES = [
  'at', 'not-at', 'before', 'after', 'adjacent', 'gap'
];

//   slot       the item that ends up in one named slot
//   initials   the first letters of the items in slot order — the classic
export var VALID_SEQUENCE_ANSWER_MODES = ['slot', 'initials'];

// ── The truth-teller (knights-and-knaves) vocabulary ────────────────────────
// WHY IT IS NOT A LOGIC GRID, since that is the first thing anyone proposes: a
// logic-grid category is a BIJECTION with its subjects — as many values as
// subjects, each used exactly once — and four speakers can all be liars. The
// bijection is the logic grid's engine (its solver enumerates permutations), so
// a two-value category over four subjects is not a tight fit, it is a different
// mathematical object.
//
// The roles are WIRE VALUES. What the page prints is `roleLabels`, which the
// book authors in its own world's words — printing "TRUTH" on a page of this
// book would be the engine talking, which the diegetic law forbids.
export var VALID_TRUTH_TELLER_ROLES = ['truth', 'lie'];

// The claim forms, closed. Each is a way a statement can constrain AND a way it
// can be wrong, so the list is short on purpose — the same argument that keeps
// VALID_LOGIC_CLUE_TYPES at four. `and`/`or` recurse, which is what makes six
// forms expressive enough for real knights-and-knaves prose without a seventh.
//
// `not` was considered and cut: it is always expressible by flipping the role
// on an `is`, or by De Morgan on a compound, and it was the only form that made
// the nesting depth hard to reason about.
export var VALID_TRUTH_CLAIM_TYPES = ['is', 'same', 'differs', 'and', 'or', 'count'];

// "At least one of us is a liar" is the canonical statement of the family, so
// counting is a first-class form rather than a pile of nested ors.
export var VALID_TRUTH_COMPARATORS = ['exactly', 'at-least', 'at-most'];

//   roles      one letter per speaker in order — T for the truthful kind, L for
//              the other. The whole board as a key.
//   initials   the first letters of the speakers holding one named role.
export var VALID_TRUTH_TELLER_ANSWER_MODES = ['roles', 'initials'];

// The filled grids' only answer mode, and the reasoning is the nonogram's: a
// solved digit rectangle has exactly one machine-executable reading — name the
// cells and the order, and the digits found there are the key. "The main
// diagonal" and "the third row" are special cases of that list, and each would
// be another rule and another way to be wrong.
export var VALID_FILLED_GRID_ANSWER_MODES = ['cells'];

// KenKen's cage operations, as WORDS rather than glyphs. The printed page draws
// the conventional + − × ÷ from the word; the wire carries the word, because
// the enum has to survive a JSON round trip, a prompt menu, and a parity scan
// that reads quoted lowercase tokens. `fixed` is the one-cell cage.
//
// MIRRORED BY `KENKEN_OPERATIONS` in contracts/puzzle-solvers.mjs, which cannot
// import this file (it is dependency-free by construction so it can run at both
// gates). `puzzleSolverVocabularyParity()` in validate.mjs holds the two equal,
// along with the two older pairs that had no such guard until this wave.
export var VALID_KENKEN_OPERATIONS = ['add', 'subtract', 'multiply', 'divide', 'fixed'];

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

// ── The two-source law: seed-assigned identity (VISION §11, D146) ───────────
//
// "Every identity choice — shell, board, dialect, palette axis, ecology, pull,
// every menu the compiler answers — has exactly two legitimate sources:
// BRIEF-FUNDED (the brief's own words earn it, and the harness checks the
// citation) or SEED-ASSIGNED (the system draws it deterministically from the
// run seed across the full menu and hands it to the model as a given —
// transcribed-never-improved, applied to identity, with a floor verifying
// obedience). A choice that is neither is a DEFAULT, and defaults are
// findings." — VISION §11, ratified 2026-08-13.
//
// D144 measured what a menu the prompts never show actually produces: eight
// shell families, zero occurrences in a 77,061-character prompt, one inevitable
// answer. W-1 gave the shell a menu. This is the other half — showing a menu
// removes the excuse for a default, but nothing yet removed the DEFAULT ITSELF.
// A model handed eight equally-described shells and no reason to prefer one
// still answers with whatever its weights like, book after book, and the
// harness cannot tell that answer apart from a considered choice.
//
// So the die goes first. Every axis below is pre-drawn from the run seed across
// its FULL menu before the model ever sees the stage, and the model is told:
// derive it from the brief with a citation, or transcribe the assignment. The
// brief outranks the die wherever it actually funds a choice; the die outranks
// habit everywhere else. There is no third source.
//
// WHY THE TABLE IS DERIVED AND NOT WRITTEN OUT. Every `menu` below is an enum
// declared above in this file. A hand-kept axis list is the D124 defect with a
// new name: the menu the die draws from would drift from the menu the schema
// accepts, and the drift direction is always the same — the die keeps offering
// a value the schema stopped taking, or stops offering one it started taking,
// and either way the obedience floor demands something impossible. `menu` holds
// the ARRAY REFERENCE, so an enum that gains a value gains it here in the same
// edit, with no second list to remember.

// The pull that brings a lifter back to the book on a rest day. Promoted to a
// constant by this wave because it is an identity axis and the die must draw
// from the same four values the three prompt surfaces offer — it was written
// out by hand in all three (the field list, the structured literal, and the
// compiler's Step 9) and held together by nothing. `homePullMenuParity()` in
// validate.mjs now diffs all three against this array, both directions.
export var VALID_HOME_PULLS = ['story', 'game', 'investigation', 'mixed'];

// Every axis: where the delivered value lives, what menu it is drawn from, and
// where a BRIEF-FUNDED choice would have written its citation.
//
//   id            stable identifier; the draw hashes it, so renaming an id
//                 re-rolls that axis for every seed. Treat as a wire format.
//   label         what the GIVEN calls it in the prompt.
//   path          dot path to the delivered value, rooted at the booklet.
//   menu          the full menu. THE ARRAY REFERENCE, never a copy.
//   kind          'scalar' — the delivered value IS the choice.
//                 'member' — the delivered value is a LIST and the assignment
//                            must appear in it (ecology dominants, harvest
//                            adoption: assigning one entry never forbids the
//                            others, which is what keeps a two-document ecology
//                            or a three-pattern harvest legal).
//                 'dominant' — the delivered value is spread across the weeks
//                            and the book's answer is the modal one (geometry:
//                            "ONE geometry per book" is prompt law, and the
//                            weeks are where it is written down).
//   evidencePath  the surface a brief-funded choice cites FROM. Two surfaces,
//                 because the compiler already owes two: `selectionReason` for
//                 the artifact's identity and `designEvidence` for the design
//                 language (D139's derivation law). An axis whose evidence
//                 surface is empty cannot be brief-funded, by construction.
//   stages        every stage that AUTHORS this axis — the stages that must be
//                 shown its assignment and are the only ones allowed to check
//                 it. Measured, not assumed: the S+F skeleton authors eight of
//                 these and no design language and no play spine at all
//                 (SCHEMA_SKELETON names neither), so handing that seat a
//                 `sealTreatment` given would be doctrine false at its stage —
//                 D128's defect, and the same argument that keeps the
//                 design-language floor off the skeleton gate in validation.js.
//   familyDecides true only for the geometry. See the exemption note below.
//   answerRequired THE MANDATORY-ANSWER FLAG (D151). True on an axis where
//                 omitting the delivered field is available as a THIRD path —
//                 neither taking the assignment nor departing from it. Where it
//                 is set, seedObedienceFloorErrors stops asking only "did you
//                 obey?" and also asks "did you answer?" — see its header.
//
//                 IT IS SET ON ONE AXIS BECAUSE ONE RULING EXISTS, NOT BECAUSE
//                 ONE HOLE DOES. The D151 sweep in check-generation-floors.mjs
//                 (§18d-ii) measured the rest and found FIVE more: strip
//                 `shellFamily`, `boardStateMode`, `theme.visualArchetype`,
//                 `homePull` or `documentEcology.dominant` from an obedient
//                 shell and the shell gate raises nothing. Those are recorded
//                 and pinned there, not flagged here — closing them changes what
//                 the stage rejects for every real run, which is a ruling and
//                 not a flag flip. Do not add a flag to this table without one.
export var IDENTITY_AXES = [
  { id: 'shellFamily', label: 'shellFamily', path: 'meta.artifactIdentity.shellFamily',
    menu: VALID_SHELL_FAMILIES, kind: 'scalar',
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shell', 'skeleton'] },
  { id: 'boardStateMode', label: 'boardStateMode', path: 'meta.artifactIdentity.boardStateMode',
    menu: VALID_BOARD_STATE_MODES, kind: 'scalar',
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shell', 'skeleton'] },
  { id: 'componentDialect', label: 'componentDialect', path: 'meta.artifactIdentity.componentDialect',
    menu: VALID_COMPONENT_DIALECTS, kind: 'scalar',
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shell', 'skeleton'] },
  { id: 'visualArchetype', label: 'theme.visualArchetype', path: 'theme.visualArchetype',
    menu: VALID_ARCHETYPES, kind: 'scalar',
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shell', 'skeleton'] },
  { id: 'arcFamily', label: 'arcFamily', path: 'meta.artifactIntent.arcFamily',
    menu: VALID_ARC_FAMILIES, kind: 'scalar',
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shell', 'skeleton'] },
  { id: 'mechanicGrammarFamily', label: 'mechanicGrammarFamily', path: 'meta.artifactIntent.mechanicGrammarFamily',
    menu: VALID_MECHANIC_GRAMMAR_FAMILIES, kind: 'scalar',
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shell', 'skeleton'] },
  { id: 'homePull', label: 'homePull', path: 'meta.artifactIntent.homePull',
    menu: VALID_HOME_PULLS, kind: 'scalar',
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shell', 'skeleton'] },
  { id: 'documentEcologyDominant', label: 'documentEcology.dominant',
    path: 'meta.artifactIntent.documentEcology.dominant',
    menu: DOCUMENT_TYPE_ENUM, kind: 'member',
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shell', 'skeleton'] },
  // THE ONE AXIS THAT CAN BE DODGED BY SILENCE AND HAS A RULING ABOUT IT.
  // `harvestPatterns` is OPTIONAL by the W5a ruling — a book that composes with
  // none of these patterns is a legitimate book — and D149 measured what that
  // costs once a die is drawing for the axis: the model can decline the
  // assignment without ever saying so, by simply not writing the key. Nothing
  // reads an absent field, so the draw evaporates and the run looks obedient.
  //
  // THE RULING (D151): MANDATORY ANSWER, NOT MANDATORY ADOPTION. The book either
  // adopts and builds the assigned pattern (the declared-is-built floor then
  // reads it back off the artifact) or DECLINES it in `selectionReason`, naming
  // the pattern and the reason. Declining costs nothing and stays common; only
  // silence became the error. The shape is the unearned packet's — demand a
  // sentence, never force the thing — because forcing adoption would install a
  // house economy on the one axis whose whole point is that a book may use none.
  { id: 'harvestPatterns', label: 'playSpine.harvestPatterns', path: 'meta.playSpine.harvestPatterns',
    menu: VALID_HARVEST_PATTERNS, kind: 'member', answerRequired: true,
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shell'] },
  { id: 'productionTexture', label: 'designLanguage.productionTexture', path: 'meta.designLanguage.productionTexture',
    menu: VALID_PRODUCTION_TEXTURES, kind: 'scalar',
    evidencePath: 'meta.designLanguage.designEvidence', stages: ['shell'] },
  { id: 'toneTexture', label: 'designLanguage.toneTexture', path: 'meta.designLanguage.toneTexture',
    menu: TONE_TEXTURE_LADDER, kind: 'scalar',
    evidencePath: 'meta.designLanguage.designEvidence', stages: ['shell'] },
  { id: 'typeVoice', label: 'designLanguage.typeVoice', path: 'meta.designLanguage.typeVoice',
    menu: VALID_TYPE_VOICES, kind: 'scalar',
    evidencePath: 'meta.designLanguage.designEvidence', stages: ['shell'] },
  { id: 'marginSemantics', label: 'designLanguage.marginSemantics', path: 'meta.designLanguage.marginSemantics',
    menu: VALID_MARGIN_SEMANTICS, kind: 'scalar',
    evidencePath: 'meta.designLanguage.designEvidence', stages: ['shell'] },
  { id: 'inkDiscipline', label: 'designLanguage.inkDiscipline', path: 'meta.designLanguage.inkDiscipline',
    menu: VALID_INK_DISCIPLINES, kind: 'scalar',
    evidencePath: 'meta.designLanguage.designEvidence', stages: ['shell'] },
  { id: 'sealTreatment', label: 'designLanguage.sealTreatment', path: 'meta.designLanguage.sealTreatment',
    menu: VALID_SEAL_TREATMENTS, kind: 'scalar',
    evidencePath: 'meta.designLanguage.designEvidence', stages: ['shell'] },
  // THE GEOMETRY, AND ITS ONE EXEMPTION. D144 W-2 landed the rule that governs
  // this axis — "the DESIGN BIAS proposes geometries; the mechanic grammar
  // family DECIDES" — and that rule is not a third source: the family is itself
  // an axis on this table, so a geometry the family forces is funded by
  // whatever funded the family. What it is NOT is a licence to ignore the die:
  // the exemption applies only when the declared family's own Serves row
  // refuses the assignment, and `familyRefusesGeometry()` below is the single
  // predicate both the floor and the referee ask. Authored at the CAMPAIGN
  // PLAN (`topology.mainMapType`) and realised in the weeks' mapState, which is
  // why its stage is the planner's and why its obedience is report-class this
  // wave — see the referee in quality.js for the reasoning.
  { id: 'mapGeometry', label: 'the board geometry (mapState.mapType)',
    path: 'weeks[].fieldOps.mapState.mapType',
    menu: VALID_MAP_TYPES, kind: 'dominant',
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['campaign-plan'], familyDecides: true }
];

// The stages that own at least one axis. Derived so a new axis with a new stage
// cannot be handed to a model and then checked by nobody.
export var IDENTITY_AXIS_STAGES = IDENTITY_AXES.reduce(function (acc, axis) {
  (axis.stages || []).forEach(function (stage) {
    if (acc.indexOf(stage) === -1) acc.push(stage);
  });
  return acc;
}, []);

/**
 * identityAxesForStage(stage) -> axis[]
 *
 * SINGLE HOME (D93). The prompt asks for the axes it must show, the floor asks
 * for the axes it may check, and the two must be the same list or the system
 * demands a value it never handed over.
 */
export function identityAxesForStage(stage) {
  var key = String(stage || '').trim();
  return IDENTITY_AXES.filter(function (axis) {
    return (axis.stages || []).indexOf(key) !== -1;
  });
}

// FNV-1a, 32-bit. The draw's whole entropy path, and it is deliberately the
// dullest hash available: the requirement is that two draws from one seed are
// BYTE-IDENTICAL in every runtime this repo runs in — a browser, a Node
// harness, and a vm sandbox — not that it is hard to invert. Nothing here reads
// a clock or a global; `drawSeedAssignments` is a pure function of its argument
// and the table above, which is what makes a book reproducible from the seed
// recorded on it (`_x.divergenceSeed`).
function seedHash(text) {
  var hash = 2166136261;
  var str = String(text == null ? '' : text);
  for (var i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * drawSeedAssignments(seedValue) -> { axisId: assignedValue } | null
 *
 * THE DRAW. One value per axis, from the axis's full menu, keyed on the seed
 * value and the axis id together so that two axes sharing a menu length do not
 * share an answer. Returns null for an absent seed value, because "no seed
 * context" has to be distinguishable from "assignments that happen to match the
 * defaults" — the floor is silent on the first and blocking on the second.
 *
 * SINGLE HOME (D93). Consumers: api-generator.js (both pipelines, once per
 * run), validation.js (the obedience floor), quality.js (the fourth referee),
 * and the two harnesses. A consumer that re-implemented the draw would answer
 * "what did the die say?" a second time in its own dialect, and the floor and
 * the prompt would quietly stop agreeing about the same book.
 */
export function drawSeedAssignments(seedValue) {
  var value = String(seedValue == null ? '' : seedValue).trim();
  if (!value) return null;
  var out = {};
  for (var i = 0; i < IDENTITY_AXES.length; i++) {
    var axis = IDENTITY_AXES[i];
    if (!axis.menu || !axis.menu.length) continue;
    out[axis.id] = axis.menu[seedHash(value + ' ' + axis.id) % axis.menu.length];
  }
  return out;
}

/**
 * readAxisValue(booklet, axis) -> string | string[] | undefined
 *
 * The delivered value, by axis kind. `undefined` means the axis was not
 * delivered on this object at all — which every caller must treat as "not my
 * question" rather than as a miss, because a shell stage carries no weeks and a
 * week carries no shell.
 */
export function readAxisValue(booklet, axis) {
  if (!booklet || typeof booklet !== 'object' || !axis) return undefined;
  if (axis.kind === 'dominant') {
    var weeks = Array.isArray(booklet.weeks) ? booklet.weeks : [];
    var tally = {};
    var best;
    var bestCount = 0;
    for (var w = 0; w < weeks.length; w++) {
      // `fieldOps`, not the week root. The board lives at
      // `weeks[].fieldOps.mapState` on every booklet in the corpus, and a
      // reader that looked one level too high would report every book's
      // geometry as not-delivered — silently, and forever.
      var fieldOps = (weeks[w] && weeks[w].fieldOps) || {};
      var mapState = fieldOps.mapState;
      if (!mapState || typeof mapState !== 'object') continue;
      // A BOARD WITH NO DECLARED TYPE IS A GRID, and reading it as "not
      // delivered" would hide the single most common default in the corpus
      // behind the word "absent". `A missing mapState.mapType defaults to
      // "grid"` is the renderer's documented behaviour, so the book HAS a
      // geometry — it just did not choose one, which is precisely the finding.
      var type = String(mapState.mapType || DEFAULT_MAP_TYPE).trim();
      if (!type) continue;
      tally[type] = (tally[type] || 0) + 1;
      if (tally[type] > bestCount) { bestCount = tally[type]; best = type; }
    }
    return best;
  }
  var parts = String(axis.path || '').split('.');
  var node = booklet;
  for (var i = 0; i < parts.length; i++) {
    if (!node || typeof node !== 'object') return undefined;
    node = node[parts[i]];
  }
  if (node === undefined || node === null) return undefined;
  if (axis.kind === 'member') return Array.isArray(node) ? node : undefined;
  var scalar = String(node).trim();
  return scalar ? scalar : undefined;
}

// The geometry table's `Serves` column, promoted to a constant so the exemption
// predicate below reads the SAME relation the model was shown. This is D144
// W-2's table — the one whose hex and maze rows named a cluster instead of
// families and made hex structurally unreachable for survey-grid books — and
// the whole reason it now has a home here is that the exemption has to be
// answerable from the doctrine, not from a second relation that resembles it.
//
// KEYS ≡ VALID_MAP_TYPES; every value ∈ VALID_MECHANIC_GRAMMAR_FAMILIES; the
// variant rows in the prompt (`grid` + hex, `point-to-point` + relational) fold
// into their TYPE, because a variant is the same geometry drawn differently.
// `geometryServesParity()` in validate.mjs diffs each row against the prompt's
// own Serves column, both directions.
//
// `player-drawn` serves EVERY family on purpose — the prompt row reads "any
// family whose world is unmapped", so the empty-refusal answer below is that
// row, not a gap.
export var GEOMETRY_SERVES_FAMILIES = {
  'grid': ['survey-grid', 'ledger-board', 'stewardship', 'route-tracker', 'attrition'],
  'point-to-point': ['node-graph', 'heat', 'stewardship', 'loyalty-web', 'testimony-matrix'],
  'linear-track': ['route-tracker', 'timeline-reconstruction'],
  'concentric': ['siege', 'observance', 'heat'],
  'maze': ['evasion', 'attrition', 'node-graph'],
  'player-drawn': VALID_MECHANIC_GRAMMAR_FAMILIES
};

/**
 * familyRefusesGeometry(family, geometry) -> boolean
 *
 * D144 W-2's rule, made answerable. TRUE when the declared mechanic grammar
 * family is not named in the assigned geometry's Serves row — the one case
 * where a geometry may legitimately differ from its assignment with no brief
 * citation, because the family already decided and the prompt says so in the
 * imperative ("the family wins and `selectionReason` names the verb").
 *
 * An unknown family or an unknown geometry is a REMOVED SIGNAL, never a
 * refusal: returning true there would hand every book with a mistyped family a
 * free pass out of the floor.
 */
export function familyRefusesGeometry(family, geometry) {
  var key = String(family || '').trim().toLowerCase();
  if (VALID_MECHANIC_GRAMMAR_FAMILIES.indexOf(key) === -1) return false;
  var serves = GEOMETRY_SERVES_FAMILIES[String(geometry || '').trim()];
  if (!serves || !serves.length) return false;
  return serves.indexOf(key) === -1;
}

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
  },
  // ── The filled grids (the arsenal wave) ───────────────────────────────────
  // A sudoku's side is boxWidth x boxHeight, so the printable set is 4 (2x2),
  // 6 (3x2) and 9 (3x3). SINGLE TIER at 9: the classic grid is the ceiling of
  // the family, not a render limit that generation is being kept under, and a
  // 12x12 variant is a different puzzle rather than a bigger one.
  //
  // THE BLANK FLOOR IS THE REAL GUARDRAIL. A 9x9 printed with 60 givens is
  // solvable, unique and key-matched — it passes every clause of the solver law
  // and is still not a puzzle, because it is finished by reading it. Half the
  // cells blank is the line, and it is stated as a PERCENTAGE so it means the
  // same thing on all three board sizes.
  sudoku: {
    minSide: 4,
    maxSide: 9,
    minBlankPercent: 50
  },
  // Kakuro counts its clue frame: the top row and left column are block cells
  // that carry the sums, so a 5x5 is a 4x4 of writable cells. Two-tier like ptp
  // — the render absorbs a wider grid than generation asks for, and the corpus
  // should not reject a good hand-authored one.
  kakuro: {
    minSize: 5,
    maxSize: 9,
    renderMaxSize: 11,
    maxRunLength: 9
  },
  // KenKen's cost is the CAGE, not the board: propagation enumerates every
  // filling of every cage each round, which is size^cells. Four cells is the
  // ceiling for that reason and the board stops at 6 for generation. The render
  // ceiling is 7 rather than the solver's own 9, because a 9x9 caged square is
  // provable but not printable at half-letter — the two limits are different
  // questions and this one is the page's.
  kenken: {
    minSize: 3,
    maxSize: 6,
    renderMaxSize: 7,
    maxCageCells: 4
  },
  // Truth-tellers. THE ONLY GUARDRAIL HERE THAT PROTECTS A PROOF IS THE SPEAKER
  // COUNT, and it barely needs to: the solver is exhaustive over 2^speakers, so
  // six is 64 assignments and even the render ceiling of eight is 256. There is
  // no budget and no propagation to be unsound in — this is the one family whose
  // uniqueness proof needs no defending.
  //
  // What the numbers really bound is the PAGE and the PLAYER. Two speakers is a
  // coin flip once either one talks; nine rows of statements is a wall of prose
  // where a puzzle should be; a claim nested four deep is a sentence nobody can
  // hold in their head at a gym bench.
  truthTellers: {
    minSpeakers: 3,
    maxSpeakers: 6,
    renderMaxSpeakers: 8,
    minStatements: 2,
    maxStatements: 8,
    maxClaimDepth: 3,
    labelMaxChars: 22
  },
  // Sequences. Exhaustive over permutations like the logic grid, so the item
  // count is what keeps the proof free: 6 items is 720 orderings and the render
  // ceiling of 7 is 5040. Two items in an order is a single fact, not a
  // deduction, which is why the floor is three.
  sequence: {
    minItems: 3,
    maxItems: 6,
    renderMaxItems: 7,
    minClues: 2,
    maxClues: 12,
    labelMaxChars: 22
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
