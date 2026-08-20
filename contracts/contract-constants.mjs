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
  '_simReport',
  // §4.11's weekly surface ledger: which economy surfaces each week actually
  // PRINTS, derived at assembly from the week payloads. Debris rather than
  // contract surface because it is a MEASUREMENT — no prompt offers this shape
  // and nothing in the pipeline may author it. It is recorded for the same D19
  // reason the sim's walk is: a book ships with its critique attached, and
  // "week 3 printed no clock at all" belongs in the artifact a reader opens
  // later rather than in a console nobody kept.
  '_weeklySurfaceLedger'
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
  'incident': 'anomaly', 'warning': 'anomaly', 'alert': 'anomaly', 'deviation': 'anomaly',
  'memorandum': 'memo', 'log': 'fieldNote', 'fieldnote': 'fieldNote',
  'inspection report': 'inspection', 'inspection-report': 'inspection',
  'surveillance summary': 'report', 'joint surveillance summary': 'report'
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

// ── THE VOICE SKELETON (the voice die, ratified 2026-08-17; landed W3) ───────
//
// WHAT THIS CURES. Emulation is the modal voice. Book identity explains ~10% of
// style variance across the corpus (VOICE.md's measured enemy) — the model's
// default hand dominates every book, and voice was the only major identity
// register with no die: `meta.literaryRegister` is model-chosen, and neither it
// nor `meta.narrativeVoice` appears in IDENTITY_AXES. Showing a menu removes
// the excuse for a default, never the default itself (the measured lesson one
// screen down at `ludicInstrument`): 87,000 characters of shell prompt named
// the arsenal in full and the model still produced the default book.
//
// SEED THE SKELETON, NEVER THE FLAVOR. Every value below is STRUCTURAL — a
// shape the hand makes — and none is a mood, a lexicon or an image palette.
// Seeded flavor-words are pastiche with a die roll; seeded structure is a hand.
// Genre stays brief-funded through the Chameleon Lens, which is why no value
// here names one.
//
// EVERY VALUE IS MEASURABLE by scripts/measure-voice-sameness.mjs today, save
// the paragraph regime, whose feature (sentences per paragraph) is a named
// addition the ratification recorded honestly rather than assumed.
//
// THE COHERENCE RULE (the axis-collision law): the draw is per-book and binds
// the NARRATING hand only. The multi-hand law stands — in-world writers differ
// from the narrator and from each other, and a found document keeps its own
// dress (a government form is not written in `tidal`).

// V1 — narrating person and distance. Who is speaking, and how close.
export var VOICE_PERSON_REGIMES = [
  'first-singular', 'first-plural', 'second', 'third-close', 'document-voice'
];

// V2 — sentence-length regime. `tidal` is deliberate alternation (high variance
// against a mid mean), which is a different hand from `measured`, not a louder
// one.
export var VOICE_SENTENCE_REGIMES = [
  'clipped', 'measured', 'long-breath', 'tidal'
];

// V3 — fragment license. Already a machine-tell measure (verbless-sentence
// detection exists); this is what gives it a die instead of a ban.
export var VOICE_FRAGMENT_LICENSES = [
  'forbidden', 'sparing', 'habitual'
];

// V4 — punctuation signature. The em-dash is on the machine-tell watch list, so
// `dash-hand` is the LICENSED EXCEPTION proving the ban is a default and not a
// cage. `bare-hand` is a real hand, not the absence of one.
export var VOICE_PUNCTUATION_SIGNATURES = [
  'dash-hand', 'semicolon-hand', 'colon-hand', 'parenthetical-hand', 'bare-hand'
];

// V5 — paragraph regime. `massed` is density-law compatible: fullness is
// matter, never rules sprawl.
export var VOICE_PARAGRAPH_REGIMES = [
  'single-breath', 'standard', 'massed'
];

// ── V6 — THE RESTRAINT BAND (ratified 2026-08-18; the voice-axis draft, Part 2)
//
// WHAT THIS CURES (VISION §7: restraint governs the SOUND of the prose, never
// its supply). The figurative budget was a UNIVERSAL CONSTANT — "at most ONE
// figurative comparison or verbal turn per ~200 words, zero is normal" — stated
// to every prose stage of every book. A universal constant on a taste register
// is the prose-law analogue of the Height Law: protective, and freezing. The
// King in Yellow probe cannot pass it; decadent prose whose whole register is
// figurative excess is unwritable at one turn per two hundred words, and no
// brief, however explicit, could buy its way past a number with no door in it.
//
// THE CURE IS THE TWO-SOURCE LAW (§11), not a raised constant. The budget
// becomes a BAND with a floor and a ceiling, and a book's position in it has
// exactly two legitimate sources: BRIEF-FUNDED (the brief's own words earn the
// density — "lush", "purple", "baroque", cited in `voiceRationale`) or
// SEED-ASSIGNED (the restraint die, drawn across the ladder like every other
// identity axis). Neither source and the book sits at the DEFAULT CENTER, and
// the fourth referee reports that as a default the way it reports every other
// uncited choice.
//
// AN ORDINAL LADDER, AND THE ORDER IS LOAD-BEARING — VALID_DYNAMIC_MARKINGS'
// law (D129) applies here for the same reason: the positions are a monotonic
// scale, the prompt quotes them in order, and alphabetising this array would
// silently reorder a scale into a menu. `plain` is the CENTER and its rate is
// today's universal constant unchanged (one turn per ~200 words = 5 per 1000),
// so a book that neither cites nor obeys is written exactly as every book
// before this ruling was. That is the demotion proof: the band's default is
// pixel-identical to the constant it replaced.
//
// THE FLOOR IS NOT ZERO. `austere` is 1 per 1000, not 0, because a hard zero
// is not restraint but a different instrument — a total ban is what the
// machine-tell list is for, and a ban stated as a budget teaches the model that
// budgets are bans.
//
// REPORT-CLASS, BY RULING (D19). Nothing below arms a blocking floor. The
// obedience question on a restraint axis is answerable only against measured
// prose, and this repo has no figurative-turn counter to measure it with (see
// the honest note in the round report). Promotion is an author call on measured
// evidence — never a flag flip because the warnings got noisy.
//
// THE MACHINE-TELL BAN LIST IS UNTOUCHED AND STAYS UNIVERSAL. No band, no
// license, no genre exception reaches it. The ban list is precisely what makes
// high figuration writable without slop, and a `lush` book obeys every one of
// its clauses. Restraint governs how OFTEN the prose turns; the ban list
// governs which turns are never available. Two axes, no overlap.
export var VOICE_RESTRAINT_LADDER = [
  { position: 'austere', turnsPer1000Words: 1 },
  { position: 'plain', turnsPer1000Words: 5 },
  { position: 'figured', turnsPer1000Words: 12 },
  { position: 'lush', turnsPer1000Words: 25 }
];

// DERIVED, never a second list (D124). The die draws from this; the prompt
// quotes this; the schema's transport enum reads this.
export var VOICE_RESTRAINT_POSITIONS = VOICE_RESTRAINT_LADDER.map(function (row) {
  return row.position;
});

// ONE SOURCE, BOTH BOUNDS — the OUTPUT_BUDGETS idiom the draft named, applied
// to a band whose bounds are the ladder's own ends rather than two more
// literals. A row added to the ladder moves the band by construction.
export var VOICE_RESTRAINT_BAND = {
  minTurnsPer1000Words: VOICE_RESTRAINT_LADDER[0].turnsPer1000Words,
  maxTurnsPer1000Words: VOICE_RESTRAINT_LADDER[VOICE_RESTRAINT_LADDER.length - 1].turnsPer1000Words,
  defaultPosition: 'plain'
};

/**
 * restraintTurnBudget(position) -> number
 *
 * Turns per 1000 words at this position. An absent or unknown position is the
 * band's default centre, which is the pre-ruling universal constant.
 *
 * SINGLE HOME (D93). Readers: the prompt's band table (parity-asserted) and the
 * defaults referee. A second implementation would be a second answer to "how
 * figurative is this book allowed to be?".
 */
export function restraintTurnBudget(position) {
  var key = String(position == null ? '' : position).trim().toLowerCase();
  for (var i = 0; i < VOICE_RESTRAINT_LADDER.length; i++) {
    if (VOICE_RESTRAINT_LADDER[i].position === key) {
      return VOICE_RESTRAINT_LADDER[i].turnsPer1000Words;
    }
  }
  return restraintTurnBudget(VOICE_RESTRAINT_BAND.defaultPosition);
}

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

// ── The arrangement grammar (meta.arrangement — ARRANGEMENT.md phase A) ──────
//
// THE FIFTH CONSTITUTION MADE MACHINERY. docs/craft/ARRANGEMENT.md §0: *a page
// is authored, not accumulated.* Every atom on the first finished book passed
// its own gates and every spread was a pile, because nothing in the system ever
// asked who designed the page. `meta.designLanguage` above answers "what is
// this object made of and printed like"; this block answers "how is it PUT
// TOGETHER" — and VISION §8's ruling is that the second question is the
// identity one: *layout IS the identity.*
//
// PHASE A ONLY, and the boundary is a channel boundary rather than a taste one
// (ARRANGEMENT §9). The axes here are 2 (section furniture), 4 (table and list
// treatment) and 7 (annotation pattern), plus the compositional leitmotif and
// the declaration surface itself. Axis 1 (type pairing) is already landed as
// `typeVoice`. Axes 3, 5 and 6 — grid and gutters, atom form sets, spread
// grammar — are GEOMETRY, they belong to the variant contract (§3), and they
// owe a gate of their own that does not exist yet. Nothing here may move a box.
//
// THE DECORATION CHANNEL'S LAW BINDS EVERY VALUE BELOW, exactly as it binds the
// design language: phase-1 estimation has no DOM and cannot resolve
// `data-section-furniture` any more than it can resolve `data-tone-texture`, so
// a rule here that changed a height would make every estimate on the surface
// lie and `overflow:hidden` would eat the difference as ink. Enforced by
// `arrangementPaintOnlyLaw()` in scripts/validate.mjs — the componentDialect /
// designLanguage blacklist, a third attribute family, one law.
//
// REFUSED, recorded rather than quietly redesigned. ARRANGEMENT §2's example
// values for axes 2 and 7 include three that are GEOMETRY wearing a decoration
// name, and they are held for phase B/C rather than approximated here:
//   • `leader-lines` — right-angle connectors from a thing to the block that
//     describes it. Drawn connectors need placed endpoints; placement is the
//     engine's and the estimate cannot see it.
//   • `margin-notes` — moves content into the outer margin. That is a column
//     count, which is the `newspaper-columns` refusal (a measured 2x estimate
//     error) arriving through a different door.
//   • `footnote-band` — moves the citations to the foot of the page. Same
//     defect: a band at the foot is a row the estimate never charged for.
// What ships is the paint half of each axis, which is most of what a stranger
// notices across a table, and it ships with the honest name for what it is.

// Axis 2 — how a section announces itself. The cheapest identity in a book and
// the loudest (ARRANGEMENT §2): Mothership's black bar is one decision doing
// more for that book's identity than every colour choice combined.
// `hairline-kicker` is TODAY'S BOOK and stamps no attribute, which is what
// makes `ruled-journal` provably byte-identical to the pre-arrangement render.
export var VALID_SECTION_FURNITURE = [
  'hairline-kicker', 'reverse-bar', 'numbered-tab', 'rule-stack'
];
export var DEFAULT_SECTION_FURNITURE = 'hairline-kicker';

// Axis 4 — how a table is drawn. The treatment tells the reader what KIND of
// table this is: something you roll on, something you look up, something you
// consult mid-action (ARRANGEMENT §2, the guide's pages 7/8/12).
export var VALID_TABLE_TREATMENTS = [
  'ruled-rows', 'reverse-header', 'numbered-gutter', 'boxed-panel'
];
export var DEFAULT_TABLE_TREATMENT = 'ruled-rows';

// Axis 7 — how the page points at itself and teaches. This is the axis that
// stops point-of-use being a compromise: a book does not choose between "the
// rules are on the page" and "the page is not a wall of rules", it chooses a
// pattern and the rules ride it. PLAY.md's teaching order says WHAT must be
// known when; this says HOW the page says it.
export var VALID_ANNOTATION_PATTERNS = [
  'inline-note', 'pointer-chips', 'bracket-marks', 'underline-file'
];
export var DEFAULT_ANNOTATION_PATTERN = 'inline-note';

// The compositional leitmotif — one gesture, restated everywhere. On the
// Mothership sheet it is the rounded chip at six scales, and it is most of the
// reason that sheet reads as designed rather than assembled. The rule
// (ARRANGEMENT §2) is that the gesture appears on at least THREE axes; here
// that is structural rather than hoped for — each gesture's CSS rule names one
// surface from each of the three axes above, and `arrangementEnumParity()`
// asserts the count. Whether the gesture EARNS its repetition is the
// arrangement judge's question (referee 3, report-only, §7), never a floor's.
//
// The three gestures use `border-radius`, `clip-path` and `outline` — three
// properties none of the three axes use, and none of which can move a box. A
// leitmotif that shared a property with an axis would silently clobber it in
// the cascade, which is a book wearing three axes and rendering two.
export var VALID_LEITMOTIF_GESTURES = [
  'none', 'rounded-chip', 'cut-corner', 'double-rule'
];
export var DEFAULT_LEITMOTIF_GESTURE = 'none';

// THE NAMED GRAMMARS (ARRANGEMENT §6, decider-ratified D173).
//
// Today's layout is not a baseline and it is not neutral. It is ONE grammar,
// and the honest thing is to name it, write it down, and make a book CHOOSE it
// rather than inherit it. `ruled-journal` names the object and its signature —
// hairline rules, ruled write-in lines, no header bars — so it sits in the menu
// as a peer with no rank. `journal-standard` was rejected because a name
// containing "standard" does the defaulting this round exists to stop (D135's
// measured failure as a naming bug) and `drowning-season` was rejected on
// VISION §11: a shelf-relative name teaches the model to reason "like the demo".
//
// A GRAMMAR IS A FAMILY, NOT A FREE PASS. Each one declares a value on every
// phase-A axis, so no grammar name can be a no-op: its meaning is the axes it
// names. The book still declares all four axes explicitly (the floor demands
// them) — this table is what those names MEAN, the resolution for a partial or
// hand-authored book, and the definition `ruled-journal` needs in order to be
// checkable as "today's behaviour" rather than asserted as it.
//
// The mapping is a bijection on purpose: every axis value is named by exactly
// one grammar, both directions, and `arrangementEnumParity()` asserts it. An
// axis value no grammar reaches is a value the menu offers and no family owns;
// a grammar that named a value twice would be teaching two names for one look.
export var ARRANGEMENT_GRAMMARS = {
  // Today's book, named. A training journal: quiet, ruled, nothing shouting.
  'ruled-journal': {
    sectionFurniture: 'hairline-kicker',
    tableTreatment: 'ruled-rows',
    annotationPattern: 'inline-note',
    leitmotif: 'none'
  },
  // The issued instrument. Reversed bars, reversed table heads, filled pointer
  // chips — a book printed by an organisation for someone who has to use it
  // under load.
  'field-manual': {
    sectionFurniture: 'reverse-bar',
    tableTreatment: 'reverse-header',
    annotationPattern: 'pointer-chips',
    leitmotif: 'rounded-chip'
  },
  // The thing you look things up in. Numbered tabs, a roll-number gutter,
  // citations filed under a rule — a book that expects to be opened at speed.
  'reference-index': {
    sectionFurniture: 'numbered-tab',
    tableTreatment: 'numbered-gutter',
    annotationPattern: 'underline-file',
    leitmotif: 'double-rule'
  },
  // The printed sheet. Stacked rules, framed panels, bracketed asides — a book
  // that behaves like a poster someone folded.
  'broadside': {
    sectionFurniture: 'rule-stack',
    tableTreatment: 'boxed-panel',
    annotationPattern: 'bracket-marks',
    leitmotif: 'cut-corner'
  }
};
export var VALID_ARRANGEMENT_GRAMMARS = Object.keys(ARRANGEMENT_GRAMMARS);
export var DEFAULT_ARRANGEMENT_GRAMMAR = 'ruled-journal';

// The axes a grammar names, in one place, so every reader iterates the same
// four and a fifth axis cannot be added to the table and forgotten by the
// resolver, the floor or the parity gate.
export var ARRANGEMENT_AXES = [
  { field: 'sectionFurniture', menu: VALID_SECTION_FURNITURE, attr: 'data-section-furniture',
    baseline: DEFAULT_SECTION_FURNITURE },
  { field: 'tableTreatment', menu: VALID_TABLE_TREATMENTS, attr: 'data-table-treatment',
    baseline: DEFAULT_TABLE_TREATMENT },
  { field: 'annotationPattern', menu: VALID_ANNOTATION_PATTERNS, attr: 'data-annotation-pattern',
    baseline: DEFAULT_ANNOTATION_PATTERN },
  { field: 'leitmotif', menu: VALID_LEITMOTIF_GESTURES, attr: 'data-leitmotif',
    baseline: DEFAULT_LEITMOTIF_GESTURE }
];

/**
 * resolveArrangement(spec) -> { grammar, sectionFurniture, ... } | null
 *
 * SINGLE HOME (D93). The renderer composes the declaration into attributes and
 * the reference emitter publishes it; both must resolve a partial declaration
 * the same way or a book renders as one grammar and is described as another.
 *
 * `null` for an absent or unreadable declaration, and that is load-bearing in
 * exactly the way `resolveDesignLanguage()`'s null is: a book that declares no
 * arrangement stamps NO attribute and renders byte-identically to the
 * pre-arrangement engine. "All defaults" and "no declaration" must never be the
 * same object, or the demotion of today's layout becomes a claim instead of a
 * property.
 *
 * PRECEDENCE: the grammar's baseline ← the explicitly declared axis. The
 * explicit field is the more literal authoring and wins, the way
 * `theme.tokens` outranks the composed design language. An off-menu value is
 * DROPPED rather than defaulted (the resolveDesignLanguage ruling): a value
 * nothing draws must be absent rather than silently correct, or misauthoring
 * renders as intention.
 */
export function resolveArrangement(spec) {
  if (!spec || typeof spec !== 'object') return null;
  var out = {};
  var grammar = String(spec.grammar || '').trim();
  if (VALID_ARRANGEMENT_GRAMMARS.indexOf(grammar) !== -1) out.grammar = grammar;
  var baseline = out.grammar ? ARRANGEMENT_GRAMMARS[out.grammar] : null;
  for (var i = 0; i < ARRANGEMENT_AXES.length; i++) {
    var axis = ARRANGEMENT_AXES[i];
    var declared = spec[axis.field];
    if (axis.menu.indexOf(declared) !== -1) out[axis.field] = declared;
    else if (baseline) out[axis.field] = baseline[axis.field];
  }
  return Object.keys(out).length ? out : null;
}

// ── Axis 5 — the atom form set (ARRANGEMENT §2 axis 5, phase B) ──────────────
//
// THE OTHER CHANNEL. Everything above this line is the DECORATION channel: it
// paints and may never move a box, and `arrangementPaintOnlyLaw()` enforces
// that with a property blacklist. This block is the FORM channel, and its law
// is the opposite one — ARRANGEMENT §3 clause 4, in the constitution's own
// words: *paint may not measure; form must.*
//
// So this is deliberately NOT another `ARRANGEMENT_AXES` row. A form is not an
// attribute the theme stamps and a stylesheet draws; it is a named variant that
// arrives WITH ITS OWN ARITHMETIC, and the two travel to measurement and render
// by one route. Adding it to the axes table would hand it to
// `arrangementAttributes()` and `arrangementPaintOnlyLaw()`, which would then
// check the wrong property and pass a geometry change as decoration — the D71
// defect with a constitution quoted over it.
//
//   the vocabulary + the declaration resolver  live here (every closed menu does)
//   the geometry + the emitted CSS             live in
//     public/renderer/modules/form-metrics/session-card-forms.mjs
//   the gate                                   is scripts/check-form-variants.mjs
//
// THE FORM SET LAW (ARRANGEMENT §2 axis 5, ratified 2026-08-17): two forms per
// atom by default — taught and bare — because two is the Mothership answer and
// a third invites a fourth that nobody chooses. Growth follows the arsenal's
// rule (VISION §4.2): a book that reached for a form it did not have names the
// gap, and the gap becomes the next form. HARD CAP FOUR; a fifth is a design
// conversation, not a wave. `ATOM_FORM_SET_CAP` is that cap with a reader.
export var ATOM_FORM_SET_CAP = 4;

// `bare` is TODAY'S EXACT COMPONENT and stamps no attribute, which is what makes
// the pre-form render provably unchanged (the D179 demotion idiom: declaring
// nothing — and declaring the default — moves no pixel). `taught` is the
// Mothership Basic sheet's form, read per family: numbered steps beside the
// fields they fill (session card), a framed how-to-roll band (oracle table), a
// labelled routing band in the shell's own citation vocabulary (found document).
export var VALID_SESSION_CARD_FORMS = ['bare', 'taught'];
export var DEFAULT_SESSION_CARD_FORM = 'bare';
export var VALID_ORACLE_TABLE_FORMS = ['bare', 'taught'];
export var DEFAULT_ORACLE_TABLE_FORM = 'bare';
export var VALID_FRAGMENT_DOC_FORMS = ['bare', 'taught'];
export var DEFAULT_FRAGMENT_DOC_FORM = 'bare';

// THE LEDGER'S FORM SET (D198's recorded dissent, folded in — D200 ruling 4).
//
// The second form is NOT called `taught`, and that is the finding rather than a
// naming preference. The other three families' second form ADDS teaching
// chrome. The ledger's does not: it is the same four columns, drawn the way a
// register is drawn — the movement label at the TOP of its band, under the rule
// that opens the band, and the bands sharing the whole sheet.
//
// THE DISSENT IT IMPLEMENTS, verbatim in effect: the dissenting engineer held
// that `.ledger-name`'s `align-items:flex-end` is the ROOT CAUSE of the
// row-growth pathology W5 capped, and that `ROW_GROWTH_CAP_PX` trades a
// legibility debt for a whitespace debt. Both halves measured on the delivered
// book (five movements, evals/proving-run): capped, the page prints 422.8px of
// ink into a 733.2px sheet — 57.7% full, 310px of trailing white on the book's
// closing spread, against §8's "full, never sparse". Uncapped WITH the labels
// still bottom-aligned is the ~136px band that dropped every label 130px below
// its column head. Uncapped with the labels at the TOP is neither: the label
// sits against its own rule at every band height, so the cap has nothing left
// to prevent.
//
// The cap therefore stays as `bare`'s property — `bare` is today's exact page
// and keeps bottom alignment — and is simply not applied in `register`, where
// the alignment that earned it is gone. `ROW_GROWTH_CAP_PX` remains the rewind
// seam D198 named it.
export var VALID_LEDGER_SPREAD_FORMS = ['bare', 'register'];
export var DEFAULT_LEDGER_SPREAD_FORM = 'bare';

/**
 * THE FORM FAMILIES — every atom family that has a form set, with the unit its
 * shed is measured in.
 *
 * Derived-from, never listed-beside: the declaration schema, the die's axes,
 * the floor's per-family checks, the prompt's menu and the gate's arms all walk
 * this table. A family added here and nowhere else is a family every one of
 * those surfaces picks up; a family added to one of them alone is impossible.
 *
 * `unit` is load-bearing and is the reason this is a table rather than three
 * copies of one rule. The session card and the oracle table are WEEKLY — the
 * adapter emits one per week and the shed is a point on the book's own timeline
 * (ARRANGEMENT §2 axis 5's own words). A found document is NOT weekly: the
 * schema hangs `fragments` off the book root with no week reference at all, and
 * the adapter seats every fragment in the `supplements` section. Its ordinal in
 * printed order is therefore the only sequence it has, and it is a real one —
 * the reader meets the first documents first, so teaching the early ones and
 * shedding the late ones is the same pedagogy the weekly families get.
 */
export var ATOM_FORM_FAMILIES = [
  { id: 'sessionCard', label: 'session card', atomType: 'session-card',
    forms: VALID_SESSION_CARD_FORMS, defaultForm: DEFAULT_SESSION_CARD_FORM, unit: 'week' },
  { id: 'oracleTable', label: 'oracle table', atomType: 'oracle-table',
    forms: VALID_ORACLE_TABLE_FORMS, defaultForm: DEFAULT_ORACLE_TABLE_FORM, unit: 'week' },
  { id: 'fragmentDoc', label: 'found document', atomType: 'fragment-doc',
    forms: VALID_FRAGMENT_DOC_FORMS, defaultForm: DEFAULT_FRAGMENT_DOC_FORM, unit: 'fragment' },
  // A SINGLETON FAMILY. The ledger is the closing spread: one instance per book
  // (the adapter emits a second page only for a roster longer than one sheet,
  // and those pages are one surface continued, not a second showing). There is
  // no shedding arc to declare, so `singleton: true` — read by `formPlansFor()`
  // below and by the gate — and `unit: 'book'`.
  { id: 'ledgerSpread', label: 'ledger', atomType: 'ledger-spread',
    forms: VALID_LEDGER_SPREAD_FORMS, defaultForm: DEFAULT_LEDGER_SPREAD_FORM,
    unit: 'book', singleton: true }
];

/**
 * THE FORM PLAN MENU — what a book declares, and what the die assigns.
 *
 * A plan is a FORM PLUS A SHED RHYTHM, and it is one closed scalar rather than
 * `{form, shedAfterWeek}` for two measured reasons:
 *
 *   1. THE DIE. Every axis needs a die (the two-source law, ARRANGEMENT §8) and
 *      the die's machinery — `drawSeedAssignments`, `readAxisValue`, the
 *      obedience floor, the quality referee — reads ONE scalar at ONE path from
 *      a closed menu. An integer shed week could be assigned but never checked:
 *      classifying `{form:'taught', shedAfterWeek:3}` back into a rhythm needs
 *      the book's length, and the compiler seats that own this declaration have
 *      no weeks yet. Every reader would have to be re-plumbed with a span for
 *      one axis, and a floor that cannot classify reports a pass.
 *   2. THE SPAN IS THE POINT. "Shed at week 3" means a different thing in a
 *      4-week book than in a 12-week one, and the model authoring it is
 *      guessing at a book it has not written. A rhythm is length-relative by
 *      construction: the resolver below turns it into the integer, once, where
 *      the length is actually known.
 *
 * The shed point stays AUTHORED-OR-ASSIGNED under the two-source law — what
 * moved is the vocabulary the author writes it in, from an integer nobody could
 * check to a rhythm everybody reads the same way.
 */
export var VALID_FORM_PLANS = [
  'bare-throughout', 'taught-shed-early', 'taught-shed-mid', 'taught-throughout'
];
export var DEFAULT_FORM_PLAN = 'bare-throughout';

/**
 * formPlansFor(family) -> the plan menu THIS family may declare.
 *
 * A `singleton: true` family (the ledger — one closing spread per book) has no
 * timeline to shed across, so the shed plans are not offered: a shed plan must
 * PRINT BOTH FORMS (resolveFormPlan's clamp + the gate's own assertion), and a
 * single instance structurally cannot — a model declaring `taught-shed-mid`
 * for the ledger would be declaring a rhythm nothing can perform. AMBIGUITY
 * DEFAULTS TO LAW: the menu is narrowed at the source, and every reader (the
 * floor, the die row, the resolver, the prompt, the structured schema) takes
 * it from here rather than from VALID_FORM_PLANS directly. Accepts a family id
 * or a family row.
 *
 * BOTH RETURN VALUES ARE THE EXPORTED ARRAYS THEMSELVES, never copies — the
 * D124 by-reference tooth in validate.mjs checks IDENTITY_AXES menus against
 * this file's exported enums by identity, which is exactly the discipline that
 * keeps a die's menu from drifting off the transport's acceptance set.
 */
export var VALID_FORM_PLANS_SINGLETON = VALID_FORM_PLANS.filter(function (p) {
  return p.indexOf('shed') === -1;
});

export function formPlansFor(family) {
  var row = family;
  if (typeof family === 'string') {
    for (var i = 0; i < ATOM_FORM_FAMILIES.length; i++) {
      if (ATOM_FORM_FAMILIES[i].id === family) { row = ATOM_FORM_FAMILIES[i]; break; }
    }
  }
  return (row && row.singleton) ? VALID_FORM_PLANS_SINGLETON : VALID_FORM_PLANS;
}

/**
 * What each plan MEANS, byte-quoted into the prompt (the D124 idiom) and read
 * by nothing else. One sentence per plan, in the model's own decision terms.
 */
export var FORM_PLAN_GUIDANCE = {
  'bare-throughout': 'the component carries no teaching chrome anywhere. Today\'s book, chosen — right when the surface is self-evident or the world would never annotate itself.',
  'taught-shed-early': 'taught for the first quarter of the run, bare after. The strongest reading of the shedding law: teach while the load is light, then get out of the way.',
  'taught-shed-mid': 'taught to the midpoint, bare after. A longer apprenticeship, for a component whose reading is not obvious the first time.',
  'taught-throughout': 'taught on every instance. For a component the player meets rarely enough that it never becomes second nature.'
};

/**
 * THE SHEDDING LAW (ARRANGEMENT §2 axis 5, ratified 2026-08-17), as arithmetic.
 *
 * *Form varies across the book's own timeline.* Week one carries the taught
 * form and by mid-book the same component sheds all of it, because by then the
 * player knows the game. It is a teaching device and a pacing device at once,
 * and it pairs with the seam law (§5): teach while the load is light; get out
 * of the way when the week is heavy.
 *
 * resolveFormPlan(plan, span) -> { plan, form, shedAfter }
 *
 * SINGLE HOME (D93) for the rhythm→integer step. `span` is how many instances
 * the family has in this book (weeks, or fragments — see ATOM_FORM_FAMILIES).
 * `shedAfter` is the last 1-based position that keeps the taught form, or
 * `null` when the plan never sheds.
 *
 * THE CLAMP IS PART OF THE MEANING, not a guard: a shed plan always leaves at
 * least one position on each side, so a book that declares a shed PRINTS both
 * forms. A shed that produces one form only is a declaration that did nothing,
 * and the gate asserts exactly that on the rendered page.
 */
export function resolveFormPlan(plan, span) {
  var name = String(plan == null ? '' : plan).trim();
  if (VALID_FORM_PLANS.indexOf(name) === -1) name = DEFAULT_FORM_PLAN;
  var n = (typeof span === 'number' && isFinite(span) && span > 0) ? Math.floor(span) : 1;
  if (name === 'bare-throughout') return { plan: name, form: 'bare', shedAfter: null };
  if (name === 'taught-throughout') return { plan: name, form: 'taught', shedAfter: null };
  var fraction = name === 'taught-shed-early' ? 0.25 : 0.5;
  var point = Math.max(1, Math.round(n * fraction));
  return { plan: name, form: 'taught', shedAfter: Math.min(point, Math.max(1, n - 1)) };
}

/**
 * resolveAtomForms(spec) -> { sessionCard?: plan, oracleTable?: plan, fragmentDoc?: plan } | null
 *
 * SINGLE HOME (D93) for `meta.arrangement.atomForms`. The adapter resolves the
 * declaration once per book and stamps the answer on every atom of every family
 * it names, so phase-1 estimation and the renderer read the SAME answer —
 * variant contract clause 3 (one channel).
 *
 * `null` for an absent or unreadable declaration, and it is load-bearing in
 * exactly the way `resolveArrangement()`'s null is: no declaration means every
 * component takes `bare`, which is byte-identical to the pre-form engine. An
 * off-menu plan is DROPPED for that family rather than defaulted to a shed,
 * because a book that misauthored a plan name must not silently acquire a shed
 * schedule — and the other families' declarations still stand, because a typo
 * in one field is not a reason to discard three.
 */
export function resolveAtomForms(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return null;
  var out = null;
  for (var i = 0; i < ATOM_FORM_FAMILIES.length; i++) {
    var family = ATOM_FORM_FAMILIES[i].id;
    var plan = String(spec[family] == null ? '' : spec[family]).trim();
    // Membership is per-family (formPlansFor): a shed plan on a singleton is
    // off-menu HERE too, so it is dropped like any other misauthored name —
    // the family prints bare rather than silently acquiring a rhythm nothing
    // can perform. The floor refuses it with the narrowed menu quoted.
    if (formPlansFor(ATOM_FORM_FAMILIES[i]).indexOf(plan) === -1) continue;
    if (!out) out = {};
    out[family] = plan;
  }
  return out;
}

/**
 * atomFormForPosition(atomForms, family, position, span) -> form
 *
 * The form ONE instance wears. A pure function of the declaration and the
 * instance's own ordinal, so the chunker, the estimate and the renderer cannot
 * reach three answers. `position` is 1-based in the family's own unit (the
 * week's `weekNumber`, or the fragment's printed ordinal).
 *
 * THE PLAN NAMES POSITIONS, NOT FORMS. `resolveFormPlan` answers in the
 * vocabulary the PLAN MENU is written in — `bare` and `taught` — because a plan
 * describes a rhythm ("carry the extra form early, drop it later") and the
 * rhythm is the same whatever the family calls its two forms. Three families do
 * call the second one `taught`; the ledger's is `register`, because it adds no
 * teaching chrome and re-draws the same four columns (D200-4).
 *
 * So the plan's answer is TRANSLATED here, through the family's own row, and
 * this is the only place the two vocabularies meet. Returning `resolveFormPlan`'s
 * literal was correct while every family used the same two words and silently
 * wrong the moment one did not: `resolveLedgerSpreadForm('taught')` finds no
 * such member and falls back to `bare`, so a book that declared
 * `taught-throughout` on the ledger printed today's page and nothing said so —
 * Hollow Success, caught by check-form-variants.mjs's own new ledger arm.
 *
 * @returns {string} a member of the family's own form menu
 */
export function atomFormForPosition(atomForms, family, position, span) {
  var row = null;
  for (var i = 0; i < ATOM_FORM_FAMILIES.length; i++) {
    if (ATOM_FORM_FAMILIES[i].id === family) { row = ATOM_FORM_FAMILIES[i]; break; }
  }
  if (!row) return DEFAULT_SESSION_CARD_FORM;
  // The family's own name for the form a plan calls `taught`: DERIVED from its
  // menu (the one member that is not the default), never a second list.
  var second = row.defaultForm;
  for (var f = 0; f < row.forms.length; f++) {
    if (row.forms[f] !== row.defaultForm) { second = row.forms[f]; break; }
  }
  var translate = function (planForm) {
    return planForm === 'bare' ? row.defaultForm : second;
  };
  var plan = atomForms && atomForms[family];
  if (!plan) return row.defaultForm;
  var resolved = resolveFormPlan(plan, span);
  if (resolved.form === 'bare' || resolved.shedAfter === null) return translate(resolved.form);
  var n = (typeof position === 'number' && isFinite(position)) ? position : 1;
  return n > resolved.shedAfter ? row.defaultForm : translate(resolved.form);
}

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

// ── THE RULEBOOK BAND (VISION §4.0 / PLAY.md §3.1, ratified D173) ───────────
// Every row above is a CHARACTER CEILING on a surface the book PRINTS. This one
// row is neither: it is a WORD BAND with a floor as well as a ceiling, on a
// surface that never prints at all. It lives here because the doctrine put it
// here by name ("the band's home when it lands is OUTPUT_BUDGETS like every
// other prose cap"), and it is NESTED rather than flat for the reason that
// naming makes obvious the moment the two are side by side: every scalar row
// above is consumed by `over(text, cap)` in collectBudgetBreaches and by
// `maxLength` in the structured schemas, both of which count CHARACTERS. A flat
// `gameRulebookWinCondition: 120` would be read by the next person as 120
// characters and enforced as a ceiling — the exact inversion of what it says.
// A nested object cannot be read by either consumer (both index scalar keys by
// name), so the mistake is structural rather than a comment nobody reads.
//
// THE FLOOR FORBIDS HAND-WAVING and the CEILING FORBIDS HIDING — the two halves
// share one ledger, which is D150's law for POINTER_BUDGETS applied to the one
// surface where the floor is the load-bearing half. A one-line answer to "how
// is the password earned" is the silent-failure case wearing a tick-box: the
// only rule in the book that can fail without anyone noticing until the last
// page, which is why the four load-bearing questions cost twice the rest.
//
// THE NUMBERS ARE THE DOCTRINE'S, unchanged. PLAY.md §3.1 proposed them "from
// the eight questions' real needs, to be ratified as constants in the code wave
// that lands the surface"; this is that wave, and nothing here re-argues them.
// They are arbitrary in exactly the way POINTER_BUDGETS says its own rows are —
// a first playtest is what moves them, not a second opinion.
//
// WORDS, NOT CHARACTERS, and that is also the doctrine's choice: the eight
// answers are ordinary prose a stranger has to understand, and a character cap
// on ordinary prose rewards short words. `countRulebookWords` below is the
// single home of the count, because a floor the model is told in one unit and
// measured in another is D144's W-3 defect with arithmetic on top.
// THE ONE CHARACTER CEILING IN A WORD BAND, and it is here rather than as a
// flat OUTPUT_BUDGETS row for the routing reason the nested object already
// carries: INST_OUTPUT_BUDGETS is stated to shell / week-final / fragment /
// ending, four stages that author no part of the rulebook, and a cap stated
// where it cannot be obeyed is doctrine false at every stage that reads it
// (D128). It is stated on SCHEMA_GAME_RULEBOOK instead, beside the band, and
// gameRulebookPromptParity() holds the prompt to this number.
//
// WHY IT IS CHARACTERS WHERE ITS EIGHT NEIGHBOURS ARE WORDS. The eight answers
// are prose a stranger reads once, off-page; the ritual cue is CHROME PRINTED
// ON EVERY SESSION CARD, inside `.session-step-note`, whose wrap capacity is
// characters (STEP_NOTE_CHARS_PER_LINE = 78 in
// renderer/modules/form-metrics/session-card-forms.mjs). 140 is two printed
// lines at that capacity — the most a cue can occupy and still read as a cue
// rather than a paragraph the player skips at the gym. It is a DESIGN floor,
// not a safety mirror: the estimate charges whatever lines the cue produces, so
// a longer cue would be measured correctly and simply stop being a cue.
//
// The key names its unit for the reason the nested object exists at all: the
// two consumers of this file's scalar caps (`over(text, cap)` and `maxLength`)
// index scalar top-level keys and cannot reach a nested one, so no character
// consumer can pick up a word bound or the reverse by accident.
export var GAME_RULEBOOK_BUDGETS = {
  loadBearingMinWords: 120,
  supportingMinWords: 60,
  maxTotalWords: 1800,
  ritualCueMaxChars: 140
};

export var OUTPUT_BUDGETS = {
  storyPrompt: 220, fragmentBody: 1050, interludeBody: 700, endingBody: 2400,
  microLineCondition: 90, microLineCue: 120, citedAs: 90,
  returnBeatClosing: 140, returnBeatOpening: 140,
  doorOptionLean: 90, sealKeyHint: 120, sealUnlockCondition: 140,
  markStripLabel: 28,
  // See the long note above. Nested BY CONSTRUCTION: this is a word band with a
  // floor, and every other row here is a character ceiling.
  gameRulebook: GAME_RULEBOOK_BUDGETS
};

// ── THE PLAIN-STAKES BAND (W1, 2026-08-18) ──────────────────────────────────
// `week.stakesLine` is one flat sentence under the epigraph naming what is
// scarce, threatened or wanted this week. The band is its whole definition:
// below the floor the field is satisfiable with a mood label ("A hard week"),
// which is the sentence it exists to replace; above the ceiling it stops being
// one sentence and becomes a second epigraph in the flat face.
//
// DELIBERATELY NOT AN `OUTPUT_BUDGETS` ROW, and the reason is routing rather
// than taste — the same ruling `gameRulebook` carries one screen up.
// INST_OUTPUT_BUDGETS is a CEILING list ("do not exceed"), stated to four
// stages; this is a two-sided band belonging to one field on one stage, and it
// is stated where that stage reads it (SCHEMA_SINGLE_WEEK, routed to
// week-final). Its prompt/constant parity is asserted behaviourally in
// check-generation-floors.mjs against the BUILT prompt, which is the stronger
// half of the D124 idiom: a number in a section that reaches no stage would
// pass a source scan and fail a reader.
export var WEEK_STAKES_MIN_CHARS = 40;
export var WEEK_STAKES_MAX_CHARS = 240;

// ── THE ESTABLISHMENT BAND (W3, 2026-08-18) ─────────────────────────────────
// `rulesSpread.orientation` is the plain-words setup printed above the
// procedure: what is happening, and who is in it. The first delivered book
// taught its rules against a fiction the reader was never given — documents
// performed at a stranger who did not know where he was or who anyone was.
//
// THE BANDS ARE THE DEMAND, for the stakesLine's reason exactly. Under the
// situation floor the field is satisfiable with a logline, which is the thing
// it exists to replace; over the ceiling it stops being an establishing
// paragraph and becomes the first chapter. Under three cast rows a book has no
// cast, it has a protagonist; over eight the page stops being scannable at the
// moment of use, which is the one thing an orientation cannot afford.
//
// ONE HOME, TWO READERS (D93): `orientationFloorErrors` in validation.js and
// the prompt's own numbers, held together by `orientationBandParity()` in
// validate.mjs — the prompt states these bands to the model, so a constant
// moved alone would demand a shape the model was taught to avoid.
export var ORIENTATION_LIMITS = {
  situationMinChars: 200,
  situationMaxChars: 700,
  castMin: 3,
  castMax: 8
};

// ── THE ASSEMBLY-PAGE DISCLOSURE LAW (author ruling, 2026-08-18) ────────────
// The delivered book's `rulesSpread.rightPage.instruction` was a walkthrough:
// "box 1 from fragment F.03 in week one, box 2 from the week-two cipher grid
// once the stone's date is decoded, box 3 from any row of the week-three oracle
// table, box 4 from the white space between four traced borders, box 5 from
// beneath the last digit of your week-five reckoning total". Every glyph's
// location AND method, disclosed on page four, duplicating the point-of-use
// instructions the week pages already carry. The author: "it gives too much
// information."
//
// THE DISTINCTION: a MANIFEST is licensed (VISION §2, "posted manifests naming
// future finds") — how many boxes there are, one per week, and when. A
// WALKTHROUGH is not. The file posts WHAT is to be found and WHEN; the week
// posts WHERE and HOW.
//
// THE DISCRIMINATOR IS ENUMERATION, NOT LENGTH — and that is a correction to
// the ruling's proposed mechanism, measured before it was written. The ruling
// scoped "a length band per box entry". There ARE no per-box entries: the
// surface is ONE optional string (`rulesSpread.rightPage.instruction`), so
// there is nothing per-box to band. And length does not separate the two shapes
// at all. Measured over 22 corpus fixtures plus both delivered books:
//
//   the offending walkthrough              577 chars   5 box ordinals named
//   the first book's legal manifest        569 chars   1 box ordinal named
//   corpus range                        96-1408 chars  0 box ordinals named
//
// A length band tight enough to catch 577 fails four clean corpus fixtures; a
// band loose enough to spare them misses the defect entirely. What DOES
// separate them cleanly is the per-box roll call: a manifest states a count
// once ("one box per week, five in all"), a walkthrough addresses each box in
// turn and hangs a source on it. Distinct box ordinals named is therefore the
// arm, and on those 24 books it is 0 findings, 1 finding, and the defect.
//
// THREE IS THE FLOOR because two ordinals can be a legitimate boundary
// statement ("box 1 is filled in week one; box 5 at the reckoning"). Three is a
// roll call. Conservative by ruling — a single-value coincidence must never
// block (the D144 idiom).
//
// ONE HOME, TWO READERS: `assemblyDisclosureFloorErrors` in validation.js
// (blocking at the shell gate, where `rulesSpread` is authored) and
// INST_RULES_TEACH's own sentence, held together by the floor-teaching registry.
export var ASSEMBLY_DISCLOSURE_MAX_BOX_POINTERS = 2;

// The ordinal words a box can be addressed by. Digits are handled numerically.
// One home so the floor and the reference page cannot disagree about what
// counts as addressing a box.
export var ASSEMBLY_BOX_ORDINAL_WORDS = [
  'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'
];

/**
 * countAssemblyBoxPointers(text) -> number
 *
 * How many DISTINCT boxes this prose addresses individually. `box 1` and
 * `box one` are the same box; `boxes 1-5` is a range statement and is NOT a
 * roll call, so it is deliberately not matched.
 *
 * SINGLE HOME (D93): the floor in validation.js and the harness that proves it.
 */
export function countAssemblyBoxPointers(text) {
  var haystack = String(text == null ? '' : text).toLowerCase();
  if (!haystack) return 0;
  var seen = {};
  // `box`/`boxes` followed by a digit or an ordinal word, allowing an optional
  // determiner ("box number 3", "in box three").
  var re = /\bbox(?:es)?\s+(?:number\s+)?([a-z]+|\d{1,2})\b/g;
  var m;
  while ((m = re.exec(haystack)) !== null) {
    var token = m[1];
    var index = /^\d+$/.test(token)
      ? Number(token)
      : ASSEMBLY_BOX_ORDINAL_WORDS.indexOf(token) + 1;
    if (index > 0) seen[index] = true;
  }
  return Object.keys(seen).length;
}

// ── The eight questions (PLAY.md §3.1) ──────────────────────────────────────
// THE SINGLE HOME of what the rulebook must answer, and of which answers are
// load-bearing. Three readers that cannot see each other:
//
//   generator/prompt_rules.js        SCHEMA_GAME_RULEBOOK + INST_GAME_RULEBOOK —
//                                    states the questions and the band to the
//                                    model (literals, parity-asserted)
//   generator/modules/validation.js  validateGameRulebookStage — measures them
//   contracts/booklet-schema.mjs     the artifact surface's property names
//
// `key` is the schema field. `load` is which half of the band the answer owes,
// and it is a RULING, not a size hint: the four load-bearing questions are the
// four whose failure is invisible until the book is played (how you win, what
// the economy is, how the password is earned, what a session looks like at the
// table). The other four fail visibly on the first read.
//
// `question` is the model-facing phrasing, byte-quoted into the prompt. It is
// here rather than in prompt_rules.js because the floor's error text quotes it
// too — a floor that named a question differently from the prompt that asked it
// would send a retry to fix an answer the model never knew it was giving.
export var GAME_RULEBOOK_ANSWERS = [
  { key: 'winCondition',  load: 'load-bearing', question: 'How you win' },
  { key: 'coreVerbs',     load: 'supporting',   question: 'What you actually do' },
  { key: 'economy',       load: 'load-bearing', question: 'The economy, in plain words' },
  // ASCII ONLY, and deliberately phrased around the apostrophe rather than
  // through it: every question below is byte-quoted into prompt_rules.js, which
  // is a classic script where an entity ships as literal text to the model and
  // a curly quote is one more byte for a parity scan to disagree about.
  { key: 'passwordPath',  load: 'load-bearing', question: 'How the password for the sealed ending is earned' },
  { key: 'sessionShape',  load: 'load-bearing', question: 'What one session looks like at the table' },
  { key: 'weekShape',     load: 'supporting',   question: 'What one week looks like' },
  { key: 'whatGoesBadly', load: 'supporting',   question: 'What can go badly' },
  { key: 'teachingOrder', load: 'supporting',   question: 'The teaching order' }
];

// THREE TO FIVE VERBS, and the ceiling is the load-bearing half. §3.1: "if two
// of the verbs are the same verb with different labels, there are fewer verbs
// than the model thinks." Two verbs is not a game; six is a parts list wearing
// a verb list's coat, and the player has to hold all of them at the gym.
export var GAME_RULEBOOK_VERBS_MIN = 3;
export var GAME_RULEBOOK_VERBS_MAX = 5;

/**
 * countRulebookWords(text) -> integer
 *
 * THE SINGLE HOME of the rulebook's unit. Whitespace-separated runs, which is
 * what a person means by "words" and what a model approximates when told to
 * write 120 of them. Deliberately NOT a locale-aware tokenizer: the band's
 * whole job is to separate a paragraph from a tick-box, and every candidate
 * definition agrees at that resolution while disagreeing at the fifth decimal.
 *
 * Consumers: generator/modules/validation.js (the band floor) and
 * scripts/check-generation-floors.mjs (its gate). Guarded by
 * singleDeclarationHomes() in scripts/validate.mjs.
 */
export function countRulebookWords(text) {
  var s = String(text === undefined || text === null ? '' : text).trim();
  if (!s) return 0;
  return s.split(/\s+/).length;
}

// ── EDGE CADENCE: the economy graph projected onto the week axis (§4.11) ────
//
// THE DEFECT CLASS THIS EXISTS FOR. An edge like `clock:RootClock → seal:W6` is
// true at BOOK scope and silently false at WEEK scope: the first delivered book
// fed that clock "each week" in its rules and printed it in one week of six. The
// closure floors checked the graph against itself and passed, because the graph
// WAS closed — the pages were what was incomplete. Cadence is the missing axis:
// the book states, per edge, how often the player is meant to touch it, and the
// week gate then checks the pages against the book's own promise (VISION §4.0's
// conformance law — did you build what YOU declared?).
//
// WHY AUTHORED AND NOT DERIVED. Every other half of this feature is derived on
// purpose (see deriveWeekSurfaces in generator/modules/validation.js — a walker
// can read which surfaces a week prints, so nothing asks the model for it). This
// one cannot be: "the gauge arrives in week 2 and that is the design" and "the
// gauge was forgotten in week 1" produce IDENTICAL page data. Intent is not
// inferable, and inferring it would be the silent substitution this project
// names as its founding failure. So the model declares it and the floor holds it
// to the declaration.
//
// THE FOUR MODES, and what each one licenses the floor to demand per week:
//   weekly  — present in every week from `introWeek` (default 1) onward.
//   late    — ABSENT before `introWeek`, present from it. `introWeek` is
//             REQUIRED here and schema-enforced (see booklet-schema.mjs): a
//             `late` with no intro week is a declaration that checks as nothing,
//             the manifestPointer idiom.
//   window  — bounded by the edge's existing `closesAtWeek`, and not referenced
//             after it closes. Requires `closesAtWeek` for the same reason
//             `late` requires `introWeek`.
//   once    — taken a single time, at no fixed week. NOT per-week decidable, so
//             it is the one mode the week gate cannot judge; its arm is
//             report-class at book scope (see collectCadenceOnceFindings).
//
// SEVERITY: the first three arms BLOCK at the WEEK gate. That location is a
// correction to this feature's own design doc, which specified the assembled
// gate — a gate that does not block (api-generator.js logs its errors and
// delivers the booklet regardless), and is excluded from the two-halves registry
// by that registry's own written law. Blocking where blocking is real also
// catches the defect at the seat that can repair one week with a delta instead
// of after every week is paid for. Decider ruling, 2026-08-18.
export var VALID_EDGE_CADENCES = ['weekly', 'once', 'window', 'late'];

// The modes whose declaration is incomplete without a companion number, and the
// field each one owes. Derived from, never a second copy of, the enum above —
// the floor, the schema's conditional and the prompt all read this one table, so
// a fifth mode cannot arrive with its arithmetic left implicit.
export var EDGE_CADENCE_REQUIRED_FIELDS = {
  late: 'introWeek',
  window: 'closesAtWeek'
};

// ── The graph→rules vocabulary (PLAY.md §3.2, the second direction) ─────────
// A surface KIND in the ref grammar is a machine word (`markStrip`, `citeRef`).
// A rulebook is written for a player, who will never read the word `markStrip`.
// This table is what lets the graph→rules direction be checked at all: for each
// kind the economy graph can name, the player-facing words that count as having
// TAUGHT it. The prompt quotes this table, so the model is told exactly which
// words satisfy the floor — the D136 two-halves idiom, because a floor that
// scanned for undisclosed synonyms would be a riddle rather than a rule.
//
// Matched case-insensitively as substrings, so "marks", "marking" and "marked"
// all satisfy `markStrip` off the stem `mark`. Stems are deliberately short and
// generous: this floor exists to catch a system the rules NEVER MENTION, not to
// grade the phrasing of one they do.
export var RULEBOOK_KIND_WORDS = {
  week: ['week'],
  session: ['session', 'workout', 'training day'],
  markStrip: ['mark'],
  reckoning: ['reckoning', 'tally', 'total'],
  clock: ['clock', 'track', 'gauge', 'dial'],
  oracle: ['oracle', 'table', 'roll'],
  cipher: ['cipher', 'code', 'decode', 'decipher'],
  map: ['map', 'board', 'region'],
  companion: ['companion', 'ally', 'kit', 'dashboard'],
  fragment: ['fragment', 'document', 'record', 'page'],
  door: ['door', 'choice', 'fork', 'decision'],
  seal: ['seal', 'sealed', 'locked'],
  ending: ['ending', 'finale', 'last page'],
  banked: ['bank'],
  boss: ['boss', 'final week', 'confrontation'],
  assembly: ['assembly', 'assemble', 'password']
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

// ── DR-33: THE DECLARED CONVENTION (author ruling, 2026-08-18) ──────────────
// THE RULING: "a password's last step may be a declared convention; undeclared
// non-derivation is a defect."
//
// A CORRECTION TO THE RULING'S OWN WIRING, recorded because it is the whole
// reason this block is four lines instead of a new enum. The ruling was scoped
// as an additive `convergencePattern` on `bossEncounter.decodingKey`, a closed
// menu of `['in-order', 'anagram']`. That field ALREADY EXISTS one screen up,
// at `meta.artifactIntent.convergencePattern`, with a four-value menu that
// already contains both of the ruling's conventions:
//
//   in-order  ≡  sequential-assembly, red-herring, dual-source  (the boss page
//               lists the values in WEEK ORDER and that reading is the password;
//               red-herring filters READINGS and dual-source varies SOURCES —
//               neither touches the order of the collected record)
//   anagram   ≡  reordering                                     (the week-order
//               string is deliberately the WRONG word)
//
// A second field would have been a second home for one question, in a second
// vocabulary, with no answer to "which wins when they disagree" — D93's defect
// with an enum on top. It would also have needed its own menu-parity pass,
// while the existing field already has one (validate.mjs, both directions,
// against INST_CONVERGENCE_DESIGN's `### \`pattern\`` headings).
//
// So the conventions are DERIVED FROM THE EXISTING MENU rather than listed
// beside it (the D124 idiom: a derived set cannot drift; a copied one drifts in
// the one direction that matters). Extending the menu by future ruling adds a
// row HERE, and a pattern with no row fails `convergenceDerivationParity()` in
// validate.mjs rather than silently defaulting to the lenient reading.
export var CONVERGENCE_DERIVATION_MODES = {
  'sequential-assembly': 'in-order',
  'reordering': 'anagram',
  'red-herring': 'in-order',
  'dual-source': 'in-order'
};

// THE DEFAULT IS THE STRICT ONE, and that is the ruling's own words: undeclared
// non-derivation is a DEFECT, so silence must select the reading that catches
// it. A book that declares nothing is held to exact derivation.
export var DEFAULT_CONVERGENCE_DERIVATION_MODE = 'in-order';

/**
 * convergenceDerivationMode(pattern) -> 'in-order' | 'anagram'
 *
 * SINGLE HOME (D93). Two readers that cannot see each other: the corpus audit in
 * scripts/validate.mjs (report-class) and the boss-stage floor in validation.js
 * (blocking). An unknown or absent pattern reads as the strict default.
 */
export function convergenceDerivationMode(pattern) {
  var key = String(pattern == null ? '' : pattern).trim().toLowerCase();
  return CONVERGENCE_DERIVATION_MODES[key] || DEFAULT_CONVERGENCE_DERIVATION_MODE;
}

// THE TEACHING HALF OF THE ANAGRAM CONVENTION, and it is deliberately GENEROUS.
// A declared convention is only a convention if the PLAYER is told it: an
// anagram nobody is asked to rearrange is indistinguishable, at the table, from
// a mis-derivation. So the check is presence of a rearrange instruction in the
// boss's own reveal prose — and it is a wide net on purpose, because the cost
// of a miss is blocking a book that taught the reorder in words this list did
// not anticipate, and the cost of a false pass is one warning.
//
// Matched case-insensitively as substrings, so `reorder` covers `reordered`,
// `reordering` and `re-order` is carried separately (the hyphen breaks the
// stem). One home, two readers — the same pair as the mode table above.
export var CONVERGENCE_REARRANGE_TERMS = [
  'rearrange', 're-arrange', 'reorder', 're-order', 'reordering',
  'anagram', 'true order', 'reading order', 'correct order', 'right order',
  'wrong order', 'wrong reading', 'out of order', 'shuffle', 'unscramble',
  'scrambled', 'in a different order', 'not in week order'
];

/**
 * teachesRearrangement(text) -> boolean
 *
 * Does this prose tell the player the collected letters are not yet the word?
 */
export function teachesRearrangement(text) {
  var haystack = String(text == null ? '' : text).toLowerCase();
  if (!haystack) return false;
  for (var i = 0; i < CONVERGENCE_REARRANGE_TERMS.length; i++) {
    if (haystack.indexOf(CONVERGENCE_REARRANGE_TERMS[i]) !== -1) return true;
  }
  return false;
}

// ════════════════════════════════════════════════════════════════════════════
// THE SETTLEMENT DOCTRINE (author directive, 2026-08-18 — the gameplay round)
// ════════════════════════════════════════════════════════════════════════════
// THE AUTHOR'S SENTENCE: "The sealed ending is the most expensive content in
// any book (the reader pays weeks of training for the password), and its
// narrative WEIGHT becomes a design input, canonical never confected."
//
// The ending is THE SETTLEMENT of every debt the book incurred. It spends what
// the reader earned; it differs by WHICH ending was reached; and it passes THE
// FINISHER TEST — an ending a non-player could enjoy equally has paid off
// nothing, because nothing in it was bought with the weeks.
//
// EVIDENCE ON FILE: book 2 shipped one ending, and the proving-night read found
// the game thinnest exactly where the payoff should have been thickest.
//
// ── THE MODE MENU, AND WHY IT IS A DIE AXIS ────────────────────────────────
// THE TWIST CLAUSE says settlement must never read as tidy resolution, and that
// a twist is settlement's most demanding form — it pays debts the reader did
// not know they held, and needs SEEDED evidence to invert. The obvious wrong
// turn from there is to demand a twist, and the author closed it in advance:
// "I wouldn't want every story to end in a twist."
//
// So the MODE rides the two-source law like every other identity choice
// (VISION §11): brief-funded, or seed-assigned across the FULL menu, never a
// default in EITHER direction. All-twist is the sameness defect wearing a
// dramatic hat; the plain fully-earned revelation chosen on purpose is exactly
// as designed as the inversion. That is why this is an IDENTITY_AXES row
// (below) and not a floor demanding a shape.
export var VALID_ENDING_MODES = ['revelation', 'twist', 'ambiguous-by-design'];

// ── THE DISPOSITIONS: ADDRESSED, NEVER "ANSWERED" ──────────────────────────
// D70's resolution law says a forward promise that resolves to nothing is
// invalidity. The naive extension of it to the finale would demand every
// promise ANSWERED, which is a demand for tidy resolution — the exact reading
// the twist clause forbids, and one that would fail `ambiguous-by-design`
// books for being what they declared themselves to be.
//
// So a debt is ADDRESSED, in one of three ways, and the menu is the whole
// difference between a settlement floor and a tidiness floor:
//
//   paid         the ending gives the reader the thing the promise owed
//   transformed  the promise is met by changing what it meant — the midpoint
//                law's change-interpretation rule, applied at the finale
//   inverted     the promise is paid by being turned over: what the reader
//                thought they held, they did not. THE TWIST'S disposition, and
//                the only one that owes seeded evidence, because an inversion
//                with nothing planted behind it is not a twist, it is a
//                retraction.
export var VALID_SETTLEMENT_DISPOSITIONS = ['paid', 'transformed', 'inverted'];

// A BAND, not a floor (the POINTER_BUDGETS idiom, D150). Below the minimum the
// declaration is ceremony — one debt named is an ending that settled nothing
// and said so in the right shape. Above the maximum it is a receipt: a finale
// itemising nine promises is a table of contents, not a payoff.
export var SETTLEMENT_DEBT_BUDGET = { min: 2, max: 6 };

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
  'arithmetic-grid',    // kakuro and KenKen, every filling proven unique
  // W7.5 — the last puzzle family off tier 3, on VISION §4.2's ratified split
  // (D148): THE LOOM BUILDS THE GRID, THE MODEL WRITES THE CLUES. A separate
  // entry from `word-hunt` for the same reason `arithmetic-grid` is separate
  // from `deduction-board` — the verb differs. A search asks the player to
  // LOOK; a crossword asks them to WRITE, which is why §4.2 names it the
  // natural implement for meta-stories where the reader is the character.
  'interlocking-word-grid'  // the woven crossword; every crossing machine-proven
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
  'arithmetic-grid': ['constrained-grid'],
  // The same two-entries-one-atom shape as the pair above, and the same
  // justification: `word-grid` is the printed object, while looking for words
  // already on the page and writing words into an empty shape are two plays.
  'interlocking-word-grid': ['word-grid']
};

// ── THE FURNITURE AND THE INSTRUMENTS (D170) ────────────────────────────────
// MEASURED, not argued. The first completed book declared a four-entry
// composition — `reckoning-economy`, `decode-chain`, `clock-bank`,
// `boss-convergence` — and passed the arity floor with room to spare. Three of
// those four are printed by EVERY generated book by construction: the week
// gate refuses a non-boss week with no cipher and no oracle, `meta.economy` is
// required at the shell gate (so the ledger spread always emits), and there is
// no book without a boss. A composition assembled out of those is not a
// choice; it is a DESCRIPTION of the default book wearing the vocabulary of a
// choice — VISION §12's "acceptance set the prompts never show is a default
// generator", one layer up.
//
// So the library splits on one question: DOES A BOOK GET THIS WITHOUT ASKING?
//
// STRUCTURAL is the hand-declared half, and it is hand-declared because it is
// a CLAIM about the rest of the system (these six are gate-required or
// schema-required elsewhere), not a derivation from this file. It is short,
// checkable by reading the week gate, and pinned by validate.mjs.
// DISCRETIONARY is DERIVED from it — never a second list (D124) — so promoting
// a new entry into LUDIC_LIBRARY makes it an instrument automatically, which
// is the safe direction: a new entry is discretionary until someone proves the
// engine prints it unasked.
export var LUDIC_STRUCTURAL_ENTRIES = [
  'reckoning-economy',  // every session prints a markStrip; every week a reckoning
  'board',              // validateWeekSchema: a non-boss week owes fieldOps.mapState
  'decode-chain',       // validateWeekSchema: a non-boss week owes fieldOps.cipher
  'oracle-pull',        // validateWeekSchema: 'Non-boss week missing fieldOps.oracleTable'
  'boss-convergence',   // there is no book without a boss week
  'ledger-audit'        // the adapter emits the spread iff meta.economy, which the shell gate requires
];

export var LUDIC_DISCRETIONARY_ENTRIES = LUDIC_LIBRARY.filter(function (entry) {
  return LUDIC_STRUCTURAL_ENTRIES.indexOf(entry) === -1;
});

// ── The arsenal, and the field each entry has to print (D170) ───────────────
// VISION §4.2: "the model must compose from a shelf wide enough to contain the
// appropriate implement, not merely the available one." These are the entries
// whose implement is a PUZZLE the engine draws — the constraint grids and the
// word grids — and the one thing that makes them checkable is that each lands
// in exactly one optional week field. DERIVED from LUDIC_LIBRARY_ATOMS: an
// entry is arsenal iff one of its atoms is a puzzle atom, so the arsenal grows
// when the shelf does and no list here can go stale.
export var LUDIC_PUZZLE_ATOM_FIELDS = {
  'constrained-grid': 'constrainedGrid',
  'word-grid': 'wordGrid'
};

export var LUDIC_ARSENAL_ENTRIES = LUDIC_LIBRARY.filter(function (entry) {
  return (LUDIC_LIBRARY_ATOMS[entry] || []).some(function (atom) {
    return Object.prototype.hasOwnProperty.call(LUDIC_PUZZLE_ATOM_FIELDS, atom);
  });
});

/**
 * ludicArsenalWeekField(entry) -> 'constrainedGrid' | 'wordGrid' | ''
 *
 * The week surface an arsenal entry has to print. One home, three readers: the
 * week GIVEN in the prompt, the week floor that blocks a week that owes one and
 * skipped it, and the assembled-gate adoption finding.
 */
export function ludicArsenalWeekField(entry) {
  var atoms = LUDIC_LIBRARY_ATOMS[String(entry || '').trim()] || [];
  for (var i = 0; i < atoms.length; i++) {
    if (LUDIC_PUZZLE_ATOM_FIELDS[atoms[i]]) return LUDIC_PUZZLE_ATOM_FIELDS[atoms[i]];
  }
  return '';
}

/**
 * compositionDiscretionaryFloor(n) -> number
 *
 * How many of a composition's N entries must be INSTRUMENTS rather than
 * furniture. Half, rounded up, floored at one — so a two-entry composition may
 * still name one structural system as its spine, and a four-entry one owes two
 * real choices.
 *
 * WHY HALF AND NOT ALL (the conservative reading, pending an author ruling):
 * naming `reckoning-economy` in a composition is not always description — a
 * book whose whole game is the tally genuinely composes with it, and forcing
 * every entry to be discretionary would ban that book to cure a different one.
 * Half is the smallest rule that rejects the measured defect (one instrument in
 * four) without legislating the shape of a legitimate depth-composition
 * (VISION §4.4: the spine must not become a house economy).
 *
 * SINGLE HOME (D93). The prompt states this number, the shell floor enforces
 * it, and compositionFloorParity() in validate.mjs holds the two together.
 */
export function compositionDiscretionaryFloor(n) {
  var count = Number(n) || 0;
  if (count <= 0) return 0;
  return Math.max(1, Math.ceil(count / 2));
}

/**
 * deriveLudicWeekAssignments(spine, plannedWeeks) -> [{ weekNumber, entry, field }]
 *
 * THE PER-WEEK BOARD/PUZZLE PICTURE, computed by the pipeline and handed over
 * as a GIVEN — D166's cure applied to the arsenal. A book that DECLARES
 * `deduction-board` in its composition and then prints no grid has declared a
 * game it does not play; before this, nothing connected the declaration at the
 * shell stage to the week stages that would have had to build it, and the week
 * prompt's own puzzle section says in as many words that "a booklet with none
 * is a legitimate booklet" — true in general, false for a book that just said
 * otherwise.
 *
 * ONE DERIVATION, TWO READERS (the D166 idiom): the week prompt's GIVEN block
 * and the week gate's floor. Re-deriving it on either side is D93's
 * two-algorithms defect, and here it would be invisible — the model would build
 * a grid in week 3 and the gate would demand one in week 4.
 *
 * THE SCHEDULE, and why it is not random: arsenal entries go to the LATEST
 * non-boss weeks, one per week, in composition order. The Mechanical Rule Ramp
 * (INST_PROGRESSION) says week one introduces only the core loop and
 * "complexity is a reward, not a starting condition", so a puzzle grid in week
 * one would be a given fighting a doctrine. The boss week is excluded because
 * its own doctrine is that it asks nothing new.
 *
 * Returns [] when there is nothing to hand over — no spine, no arsenal entry
 * declared, no week picture — so every caller without one builds the prompt it
 * always built, byte for byte, and the floor stays silent under exactly the
 * same condition.
 */
export function deriveLudicWeekAssignments(spine, plannedWeeks) {
  if (!spine || typeof spine !== 'object') return [];
  if (!Array.isArray(plannedWeeks) || !plannedWeeks.length) return [];

  var declared = [];
  (Array.isArray(spine.composition) ? spine.composition : []).forEach(function (item) {
    var entry = String((item || {}).entry || '').trim();
    if (LUDIC_ARSENAL_ENTRIES.indexOf(entry) === -1) return;
    if (declared.indexOf(entry) === -1) declared.push(entry);
  });
  if (!declared.length) return [];

  var open = [];
  plannedWeeks.forEach(function (shape) {
    var n = Number((shape || {}).weekNumber);
    if (!isFinite(n) || n < 2) return;              // week one is core loop only
    if (shape.isBoss || shape.isBossWeek) return;   // the boss asks nothing new
    open.push(n);
  });
  if (!open.length) return [];
  open.sort(function (a, b) { return a - b; });

  // Latest weeks first, then read back in week order so the block prints
  // ascending. One entry per week: two grids on one page is a worksheet.
  var seats = open.slice(-declared.length);
  var out = [];
  for (var i = 0; i < declared.length && i < seats.length; i++) {
    out.push({ weekNumber: seats[i], entry: declared[i], field: ludicArsenalWeekField(declared[i]) });
  }
  return out;
}

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
// THE CROSSWORD IS ABSENT FROM *THIS* ENUM AND ALWAYS WILL BE — it is a WORD
// grid, not a constrained grid, and it lives in `VALID_WORD_GRID_KINDS` below.
// The distinction is the printed object: these seven hand the player a matrix
// of constraints, while a crossword hands them an interlocking shape and a
// clue list. Two negative fixtures in check-generation-floors.mjs still use the
// literal 'crossword' to prove THIS enum refuses an unknown kind, and that
// remains honest precisely because the value belongs to the other family.
//
// The prediction that comment used to make came true exactly as written: when
// the crossword landed at W7.5 it was one enum value, one solver branch and one
// prompt menu row — the same shape the arsenal wave used for the three filled
// grids below, closing the W5b deferral that named them.
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

// Two printed objects, and they are as different as a maze is from a cipher:
// a SEARCH hands the player a full letter board and asks them to ring what is
// already there, while a CROSSWORD hands them an empty interlocking shape and
// asks them to write. They share this enum because they share a schema seat
// (`fieldOps.wordGrid`) and an atom, not because they share a mechanic.
//
// `crossword` landed at W7.5 on VISION §4.2's ratified split — THE LOOM BUILDS
// THE GRID, THE MODEL WRITES THE CLUES (D148). The model authors a POOL of
// answer/clue pairs and nothing else; `buildCrossword()` in
// contracts/puzzle-solvers.mjs weaves the grid and `verifyCrossword()` proves
// it. There is no author-supplied geometry anywhere in this family, which is
// why the schema carries no grid for a crossword to disagree with.
export var VALID_WORD_GRID_KINDS = ['word-search', 'crossword'];

// The eight reading directions of a word search. Order is quiet → loud in the
// sense the difficulty proxy uses: the first three read forwards, the rest
// read backwards or on a diagonal and cost more to scan.
export var VALID_WORD_SEARCH_DIRECTIONS = ['E', 'S', 'SE', 'NE', 'W', 'N', 'SW', 'NW'];

// A crossword's two axes, and the contrast with the eight above is the point:
// a search may read backwards and diagonally because the player is SCANNING,
// while a crossword entry reads left-to-right or top-to-bottom because the
// player is WRITING and a single number in a cell's corner has to serve both
// the across and the down clue that start there.
//
// MIRRORED BY `CROSSWORD_DIRECTIONS` in contracts/puzzle-solvers.mjs, which
// cannot import this file (dependency-free by construction so it runs at both
// gates). `puzzleSolverVocabularyParity()` in validate.mjs holds the two equal.
export var VALID_CROSSWORD_DIRECTIONS = ['across', 'down'];

//   leftovers   the uncovered cells, row by row — the classic (word search only:
//               a crossword has no uncovered letters, and the solver says so)
//   word        one entry from the list, named by 1-based index
//   marked      the classic crossword extraction — shaded squares, read in
//               order, spell the key. Declared ENTRY-RELATIVE as
//               `picks: [{ entry, letter }]` rather than as grid coordinates,
//               because the model writes the pool before the grid exists and
//               cannot name a cell it has never seen. The loom converts the
//               picks to cells once the weave is done.
export var VALID_WORD_GRID_ANSWER_MODES = ['leftovers', 'word', 'marked'];

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
  // ── THE FIVE MANDATORY ANSWERS (author ruling, 2026-08-13 — D152) ─────────
  // D151's anti-vacuity sweep proved these five could be STRIPPED from an
  // otherwise-obedient shell with no gate response — the harvest dodge on core
  // identity. Unlike the harvest, a book cannot compose without a shell, a
  // board, an archetype, a pull or an ecology: omission here is not declining
  // a feature, it is handing the choice to the silent normalizer, which is the
  // default generator's third disguise. Flagged, the D151 arm demands an
  // ANSWER: declare a value (the departure arm then checks citation-or-
  // assignment) or decline by naming the assignment in the evidence field.
  // The harness rows that pinned these as dodgeable struck their pins the same
  // commit this landed (§18d-ii — a closed dodge must strike its line).
  { id: 'shellFamily', label: 'shellFamily', path: 'meta.artifactIdentity.shellFamily',
    menu: VALID_SHELL_FAMILIES, kind: 'scalar', answerRequired: true,
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shellIdentity', 'skeleton'] },
  { id: 'boardStateMode', label: 'boardStateMode', path: 'meta.artifactIdentity.boardStateMode',
    menu: VALID_BOARD_STATE_MODES, kind: 'scalar', answerRequired: true,
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shellIdentity', 'skeleton'] },
  { id: 'componentDialect', label: 'componentDialect', path: 'meta.artifactIdentity.componentDialect',
    menu: VALID_COMPONENT_DIALECTS, kind: 'scalar',
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shellIdentity', 'skeleton'] },
  // THE ONE AXIS THAT IS A FLOOR RATHER THAN A REGISTER (round directive 9,
  // 2026-08-17). Every other row here names something the book DECIDES about
  // itself — its shell, its board, its pull, its ecology. Since the composition
  // amendment the archetype is not that: ARRANGEMENT.md makes layout the
  // identity and demotes the archetype to a legibility and print-safety FLOOR,
  // the baseline a book inherits when it authors nothing.
  //
  // `answerRequired` STAYS, and the reason is D152's, unchanged by the
  // demotion: silence here does not decline a feature, it hands the choice to
  // the silent normalizer. A floor still has to be CHOSEN — the demotion
  // changes what the choice means, not whether one was made.
  //
  // `role` is what changed. It carries no gate and narrows no menu; its single
  // reader is auditIdentitySources, which reports a floor chosen without
  // citation in floor-selection words rather than calling it an identity
  // default. Report-class either way (D19 — warnings only, never a weakSpot),
  // so this changes the SENTENCE a reader gets and nothing a pipeline does.
  // identityAxesForStage and drawSeedAssignments read `id`, `menu` and
  // `stages`, none of which move: the die offers the same faces and every stage
  // is shown the same slice.
  // THE SEAT IS THE EVIDENCE'S, NOT THE VALUE'S (the shell split). The VALUE
  // `theme.visualArchetype` is written by the THEME seat; the EVIDENCE is
  // `meta.artifactIntent.selectionReason`, written by the IDENTITY seat. This
  // row therefore sits at the identity seat, under the rule
  // `shellAxisEvidenceOwnership()` in validate.mjs now enforces for every axis:
  // an obedience axis lives at a seat that writes its own evidence field, or
  // its gate demands a sentence in a field the stage cannot write (D234).
  //
  // MEASURED, not reasoned: with this row at `shellTheme`, the theme seat's
  // answer created `meta.artifactIntent` from nothing to hold its declination,
  // and the merge then overwrote the identity block's whole intent bundle with
  // a one-field stub — a later seat silently rewriting an earlier one's
  // decision, which is the exact thing the fixed GIVENS exist to prevent.
  // scripts/check-shell-split.mjs's arm A2c caught it.
  //
  // The theme seat is not left guessing: `summarizeShellIdentityFor(_, 'theme')`
  // hands it the identity block's `artifactIntent` INCLUDING selectionReason, so
  // the archetype the compiler declared arrives as a finished GIVEN. What it
  // costs is the same thing the two spine axes cost — the DEPARTURE arm on this
  // axis drops from blocking at a stage gate to report-class at the referee.
  { id: 'visualArchetype', label: 'theme.visualArchetype', path: 'theme.visualArchetype',
    menu: VALID_ARCHETYPES, kind: 'scalar', answerRequired: true, role: 'floor',
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shellIdentity', 'skeleton'] },
  { id: 'arcFamily', label: 'arcFamily', path: 'meta.artifactIntent.arcFamily',
    menu: VALID_ARC_FAMILIES, kind: 'scalar',
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shellIdentity', 'skeleton'] },
  { id: 'mechanicGrammarFamily', label: 'mechanicGrammarFamily', path: 'meta.artifactIntent.mechanicGrammarFamily',
    menu: VALID_MECHANIC_GRAMMAR_FAMILIES, kind: 'scalar',
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shellIdentity', 'skeleton'] },
  { id: 'homePull', label: 'homePull', path: 'meta.artifactIntent.homePull',
    menu: VALID_HOME_PULLS, kind: 'scalar', answerRequired: true,
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shellIdentity', 'skeleton'] },
  // THE MODE DIE (the settlement doctrine, 2026-08-18). VISION §14.1 says the
  // endgame PATTERN is part of what varies per book, and until this row the
  // only thing varying was the password's arithmetic (convergencePattern) —
  // how the reader OPENS the ending, never what the ending DOES to them.
  //
  // ANSWER-REQUIRED, ADOPTION OPTIONAL — the harvest axis's shape (D151), and
  // for the reason the author stated when the twist clause was written: "I
  // wouldn't want every story to end in a twist." A die that could only ever
  // ratchet toward inversion would install a house ending, which is the
  // sameness defect this table exists to break. Declining costs one sentence
  // in `selectionReason`, and a declined twist is a book that chose the plain
  // revelation ON PURPOSE — which is the point.
  //
  // BLOCKING, not reportOnly: unlike the voice axes there IS an instrument
  // here — `endings[].settlement.mode` is declared, machine-readable, and
  // conformance-checked at the ending seat, so an assignment landing on this
  // axis can be observed all the way to the artifact.
  { id: 'endingMode', label: 'endingMode', path: 'meta.artifactIntent.endingMode',
    menu: VALID_ENDING_MODES, kind: 'scalar', answerRequired: true,
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shellIdentity', 'skeleton'] },
  { id: 'documentEcologyDominant', label: 'documentEcology.dominant',
    path: 'meta.artifactIntent.documentEcology.dominant',
    menu: DOCUMENT_TYPE_ENUM, kind: 'member', answerRequired: true,
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shellIdentity', 'skeleton'] },
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
  // ── THE COMPILER DECLARES; THE SPINE BUILDS (the shell split) ────────────
  // THE PROBLEM THE SPLIT CREATED, stated plainly because the resolution costs
  // something. This axis's VALUE lives at `meta.playSpine.harvestPatterns`,
  // which the SPINE seat writes. Its EVIDENCE — the field a departure or a
  // decline must be written in — lives at `meta.artifactIntent.selectionReason`,
  // which the IDENTITY seat wrote three calls earlier and which no later seat
  // may rewrite (a later sub-stage overwriting an earlier one's decision is the
  // exact thing the fixed GIVENS exist to prevent). No single seat holds both.
  //
  // Tagging the SPINE alone hands it a gate it cannot satisfy: its own gate's
  // departure arm demands a sentence in a field it must not write — the
  // reviser-told-nothing shape (D234), nine paid attempts and nine rejections.
  // MEASURED, not reasoned: scripts/check-shell-split.mjs failed exactly this
  // way on the stub before the row moved.
  //
  // Tagging BOTH is worse in a subtler way: it makes the gate satisfiable only
  // if the identity seat, which has not seen the spine yet, happens to name the
  // instrument the spine will later choose. A gate whose satisfiability depends
  // on two separate calls agreeing about an unmade decision is a gate that
  // fails books for a coordination nobody asked for.
  //
  // SO THE AXIS SITS AT THE SEAT THAT WRITES ITS EVIDENCE, and the two halves
  // divide the way the fields already imply: the COMPILER DECLARES (answers the
  // die in its own selectionReason — adopt-or-decline, which is the only arm
  // that can fire on a unit carrying no playSpine), and the SPINE BUILDS what
  // was declared. The build is not unchecked: `collectSpineHarvestFloorErrors`
  // is the declared-is-built floor and still blocks at the spine seat, and
  // `auditIdentitySources` still reports a departure over the assembled book.
  //
  // WHAT THIS COSTS, said rather than buried: the DEPARTURE arm on these two
  // axes drops from BLOCKING at a stage gate to REPORT-class at the referee.
  // Restoring it means giving the spine an evidence field of its own — a
  // doctrine decision about where a declination is recorded, which is an author
  // ruling and is filed as one, not taken here.
  { id: 'harvestPatterns', label: 'playSpine.harvestPatterns', path: 'meta.playSpine.harvestPatterns',
    menu: VALID_HARVEST_PATTERNS, kind: 'member', answerRequired: true,
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shellIdentity'] },
  // THE INSTRUMENT (D170). The ludic lens's own axis, and the last one to get
  // a die — which is why the first completed book's composition was four
  // pieces of furniture. VISION §4.6 asks the compiler for a COMPOSITION
  // "never a single-family pick", and §4.2 built the arsenal precisely so a
  // book could reach past what it gets for free; neither had a source. Under
  // the two-source law that made every composition a DEFAULT: nothing in the
  // brief names `word-hunt`, so if the die does not either, the model picks
  // the systems already in front of it. Measured: 87,341 characters of shell
  // prompt name `deduction-board`, `word-hunt` and `arithmetic-grid` exactly
  // once each, inside a thirteen-item menu, which is §12's density class.
  //
  // The menu is the DISCRETIONARY half only — assigning `decode-chain` would
  // be the die telling the book to do what it cannot avoid, which teaches the
  // model that assignments are ceremonial.
  //
  // ANSWER-REQUIRED, NOT ADOPTION-REQUIRED — the harvest axis's shape (D151),
  // and for the same reason: forcing adoption would install a house economy on
  // the one axis whose whole point is that the game-kind is authored per book
  // (VISION §4.4). Declining is legitimate and costs one sentence.
  // THE COMPILER DECLARES; THE SPINE BUILDS — harvestPatterns' ruling above,
  // for the same reason and at the same cost. The composition's arity, menu,
  // distinctness and role floors all still block at the spine seat.
  { id: 'ludicInstrument', label: 'playSpine.composition[].entry', path: 'meta.playSpine.composition',
    menu: LUDIC_DISCRETIONARY_ENTRIES, kind: 'objectMember', itemKey: 'entry', answerRequired: true,
    evidencePath: 'meta.artifactIntent.selectionReason', stages: ['shellIdentity'] },
  // ── THE VOICE SKELETON AXES (the voice die, ratified 2026-08-17; W3) ─────
  // Five axes, one per structural dimension of the narrating hand. The menus
  // are up at VOICE_PERSON_REGIMES and its siblings; the reasoning for the
  // menu design is stated there and not repeated.
  //
  // REPORT-CLASS, AND THAT FLAG IS NEW HERE (`reportOnly`). Every other row on
  // this table is checked by a BLOCKING floor at its stage gate. These five are
  // not, by the ratification's own terms and by D19: the obedience question on
  // a voice axis is answerable only against measured prose, the bands that
  // would decide it are to be calibrated from corpus percentiles rather than
  // invented, and a blocking floor on an uncalibrated band would fail books for
  // a shape nobody has measured yet. `seedObedienceFloorErrors` reads the flag
  // and routes these findings to warnings; the fourth referee
  // (auditIdentitySources) reports default-center as it does for every axis,
  // which is where the evidence for a future promotion will come from.
  // Promotion to blocking is an author ruling on measured evidence — it is not
  // a flag flip somebody makes because the warnings got noisy.
  //
  // ANSWER-REQUIRED, THOUGH. The harvest axis's shape (D151): silence and an
  // assignment declined in writing are different answers, and only silence is
  // the finding. Under report-class that costs a warning, not a run.
  //
  // SHELL SEAT ONLY, and this is the routing rather than a preference. The
  // voice skeleton is taught by INST_VOICE_SKELETON, which STAGE_SCHEMA_MAP
  // routes to `shell`; S+F's compiler seat (generateSkeletonPrompt, in
  // generator.js) carries no voice-skeleton doctrine, so a book written there
  // would be measured against axes its own prompt never named. That is the
  // derived-or-strict trap even when the verdict is only a warning, because the
  // warning would be true of the system and not of the book. Widening to
  // `skeleton` is one prompt edit in generator.js and is reported, not assumed.
  //
  // THE EVIDENCE RAIL is `voiceRationale`, which already exists on
  // narrativeVoice and already means "why this voice" — the departure arm needs
  // a field where a book can say what it did instead, and inventing a second
  // one beside a field that already says exactly that would be the D93 defect.
  { id: 'voicePerson', label: 'narrativeVoice.voiceSkeleton.person',
    path: 'meta.narrativeVoice.voiceSkeleton.person',
    menu: VOICE_PERSON_REGIMES, kind: 'scalar', answerRequired: true, reportOnly: true,
    evidencePath: 'meta.narrativeVoice.voiceRationale', stages: ['shellIdentity'] },
  { id: 'voiceSentenceRegime', label: 'narrativeVoice.voiceSkeleton.sentenceRegime',
    path: 'meta.narrativeVoice.voiceSkeleton.sentenceRegime',
    menu: VOICE_SENTENCE_REGIMES, kind: 'scalar', answerRequired: true, reportOnly: true,
    evidencePath: 'meta.narrativeVoice.voiceRationale', stages: ['shellIdentity'] },
  { id: 'voiceFragmentLicense', label: 'narrativeVoice.voiceSkeleton.fragmentLicense',
    path: 'meta.narrativeVoice.voiceSkeleton.fragmentLicense',
    menu: VOICE_FRAGMENT_LICENSES, kind: 'scalar', answerRequired: true, reportOnly: true,
    evidencePath: 'meta.narrativeVoice.voiceRationale', stages: ['shellIdentity'] },
  { id: 'voicePunctuationSignature', label: 'narrativeVoice.voiceSkeleton.punctuationSignature',
    path: 'meta.narrativeVoice.voiceSkeleton.punctuationSignature',
    menu: VOICE_PUNCTUATION_SIGNATURES, kind: 'scalar', answerRequired: true, reportOnly: true,
    evidencePath: 'meta.narrativeVoice.voiceRationale', stages: ['shellIdentity'] },
  { id: 'voiceParagraphRegime', label: 'narrativeVoice.voiceSkeleton.paragraphRegime',
    path: 'meta.narrativeVoice.voiceSkeleton.paragraphRegime',
    menu: VOICE_PARAGRAPH_REGIMES, kind: 'scalar', answerRequired: true, reportOnly: true,
    evidencePath: 'meta.narrativeVoice.voiceRationale', stages: ['shellIdentity'] },
  // THE RESTRAINT DIE (ratified 2026-08-18 — the voice-axis draft's Part 2).
  // The sixth voice axis, and the only one that is not a shape the hand makes
  // but a RATE it makes them at. It rides this table for the reason Part 2
  // gives: a book's position in the figurative band has two legitimate sources
  // and a die is one of them, so without a row here the band would have exactly
  // one funded source and every uncited book would sit at the centre by
  // default — which is the universal constant back again, wearing a band.
  //
  // EVERY FLAG MATCHES THE FIVE ABOVE, deliberately, because this axis is
  // report-class for a stronger reason than they are: they at least have an
  // instrument (measure-voice-sameness.mjs computes every feature the five are
  // judged on). There is no figurative-turn counter in this repo at all, so
  // `reportOnly` here is not "the band is uncalibrated" but "nothing measures
  // it yet". Promotion owes an instrument first, then an author ruling.
  { id: 'voiceRestraint', label: 'narrativeVoice.voiceSkeleton.restraint',
    path: 'meta.narrativeVoice.voiceSkeleton.restraint',
    menu: VOICE_RESTRAINT_POSITIONS, kind: 'scalar', answerRequired: true, reportOnly: true,
    evidencePath: 'meta.narrativeVoice.voiceRationale', stages: ['shellIdentity'] },
  { id: 'productionTexture', label: 'designLanguage.productionTexture', path: 'meta.designLanguage.productionTexture',
    menu: VALID_PRODUCTION_TEXTURES, kind: 'scalar',
    evidencePath: 'meta.designLanguage.designEvidence', stages: ['shellTheme'] },
  { id: 'toneTexture', label: 'designLanguage.toneTexture', path: 'meta.designLanguage.toneTexture',
    menu: TONE_TEXTURE_LADDER, kind: 'scalar',
    evidencePath: 'meta.designLanguage.designEvidence', stages: ['shellTheme'] },
  { id: 'typeVoice', label: 'designLanguage.typeVoice', path: 'meta.designLanguage.typeVoice',
    menu: VALID_TYPE_VOICES, kind: 'scalar',
    evidencePath: 'meta.designLanguage.designEvidence', stages: ['shellTheme'] },
  { id: 'marginSemantics', label: 'designLanguage.marginSemantics', path: 'meta.designLanguage.marginSemantics',
    menu: VALID_MARGIN_SEMANTICS, kind: 'scalar',
    evidencePath: 'meta.designLanguage.designEvidence', stages: ['shellTheme'] },
  { id: 'inkDiscipline', label: 'designLanguage.inkDiscipline', path: 'meta.designLanguage.inkDiscipline',
    menu: VALID_INK_DISCIPLINES, kind: 'scalar',
    evidencePath: 'meta.designLanguage.designEvidence', stages: ['shellTheme'] },
  { id: 'sealTreatment', label: 'designLanguage.sealTreatment', path: 'meta.designLanguage.sealTreatment',
    menu: VALID_SEAL_TREATMENTS, kind: 'scalar',
    evidencePath: 'meta.designLanguage.designEvidence', stages: ['shellTheme'] },
  // ── THE ARRANGEMENT AXES (ARRANGEMENT §8) ────────────────────────────────
  // "The arrangement axes join the two-source law rather than getting an
  // exemption from it — every axis needs a die, not just a list." The measured
  // reason is one level up in this file's own history: the game-kind menus were
  // shown IN FULL inside an 87,000-character prompt and the model still
  // produced the default book. Showing a menu removes the excuse for a default,
  // never the default itself.
  //
  // BOTH SEATS, unlike the design-language axes directly above, and the
  // asymmetry is the routing rather than a preference: SCHEMA_ARRANGEMENT and
  // INST_ARRANGEMENT are routed to the shell stage (STAGE_SCHEMA_MAP) AND
  // hand-routed into generateSkeletonPrompt, so both compiler seats are taught
  // this surface and both may therefore be checked against it. W6's design
  // language reached only one seat and its floor is scoped to one seat for that
  // reason; a floor at a seat whose prompt never names the field blocks a
  // pipeline on a surface it was never asked for, and the retry re-fails
  // identically.
  //
  // NO `answerRequired` FLAG, and that is the W6 shape rather than an oversight
  // (see the flag's own note above: do not add one without a ruling). Silence
  // is not a third path on these axes because `arrangementFloorErrors` blocks
  // the stage on an absent field before this floor is ever asked — which is
  // precisely the condition under which D146's original reasoning holds.
  { id: 'arrangementGrammar', label: 'arrangement.grammar', path: 'meta.arrangement.grammar',
    menu: VALID_ARRANGEMENT_GRAMMARS, kind: 'scalar',
    evidencePath: 'meta.arrangement.arrangementEvidence', stages: ['shellTheme', 'skeleton'] },
  { id: 'sectionFurniture', label: 'arrangement.sectionFurniture', path: 'meta.arrangement.sectionFurniture',
    menu: VALID_SECTION_FURNITURE, kind: 'scalar',
    evidencePath: 'meta.arrangement.arrangementEvidence', stages: ['shellTheme', 'skeleton'] },
  { id: 'tableTreatment', label: 'arrangement.tableTreatment', path: 'meta.arrangement.tableTreatment',
    menu: VALID_TABLE_TREATMENTS, kind: 'scalar',
    evidencePath: 'meta.arrangement.arrangementEvidence', stages: ['shellTheme', 'skeleton'] },
  { id: 'annotationPattern', label: 'arrangement.annotationPattern', path: 'meta.arrangement.annotationPattern',
    menu: VALID_ANNOTATION_PATTERNS, kind: 'scalar',
    evidencePath: 'meta.arrangement.arrangementEvidence', stages: ['shellTheme', 'skeleton'] },
  { id: 'leitmotif', label: 'arrangement.leitmotif', path: 'meta.arrangement.leitmotif',
    menu: VALID_LEITMOTIF_GESTURES, kind: 'scalar',
    evidencePath: 'meta.arrangement.arrangementEvidence', stages: ['shellTheme', 'skeleton'] },
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
// ── THE FORM AXES (ARRANGEMENT §2 axis 5 / §3, phase B) ─────────────────────
// The five arrangement axes above PAINT. These three MEASURE, and they are on
// this table for the reason ARRANGEMENT §8 gives for the paint axes: *every
// axis needs a die, not just a list.* D206 built the channel that makes the
// shape variable and no book varied, because nothing assigned a form and no
// prompt asked for one — the same measured shape as the game-kind menus, which
// were shown in full inside an 87,000-character prompt and still produced the
// default book. A list without a die is a list the model reads past.
//
// DERIVED FROM ATOM_FORM_FAMILIES, never listed beside it. A family added to
// that table gains its die, its prompt slice, its floor and its gate arm in one
// edit; a family added here alone is impossible. Same idiom, same reason, as
// the demoted-companion menu (D124).
//
// BOTH COMPILER SEATS, matching the arrangement axes directly above rather than
// the design-language axes: the declaration lives inside `meta.arrangement`, so
// it rides SCHEMA_ARRANGEMENT/INST_ARRANGEMENT to whichever seats they reach,
// and `arrangementFloorErrors` blocks at both. Teach where you check.
//
// NO `answerRequired` FLAG, for the arrangement axes' own reason: the
// arrangement floor blocks on an absent plan before the obedience floor is ever
// asked, so silence is not a third path here.
].concat(ATOM_FORM_FAMILIES.map(function (family) {
  return {
    id: 'atomForm' + family.id.charAt(0).toUpperCase() + family.id.slice(1),
    label: 'arrangement.atomForms.' + family.id,
    path: 'meta.arrangement.atomForms.' + family.id,
    // Per-family menu (formPlansFor): the die must never assign a singleton a
    // shed plan the resolver would drop and the floor would refuse — a menu
    // wider than the family's own is an assignment nobody can obey.
    menu: formPlansFor(family),
    kind: 'scalar',
    evidencePath: 'meta.arrangement.arrangementEvidence',
    stages: ['shellTheme', 'skeleton']
  };
}));

// The stages that own at least one axis. Derived so a new axis with a new stage
// cannot be handed to a model and then checked by nobody.
export var IDENTITY_AXIS_STAGES = IDENTITY_AXES.reduce(function (acc, axis) {
  (axis.stages || []).forEach(function (stage) {
    if (acc.indexOf(stage) === -1) acc.push(stage);
  });
  return acc;
}, []);

// ── STAGE FAMILIES: one seat that became four (the shell split) ────────────
// `shell` was one call authoring four sibling booklet surfaces, and every axis
// above named it. It is now four sequential sub-stages, and each axis names the
// ONE that authors its own surface — D149's own law, applied to a finer seat:
// a stage checked against axes it was never shown is the derived-or-strict
// trap, and after the split each sub-stage is shown only its own quarter.
//
// The family key is a UNION ACCESSOR, not a stage. Nothing is tagged `shell`
// any more, so `IDENTITY_AXIS_STAGES` (derived from the rows) names only real
// seats — the gate in validate.mjs that demands a builder be handed
// `identityAxesForStage('<seat>')` therefore demands the three real ones and
// cannot be satisfied by a family name nobody builds a prompt for. Callers that
// legitimately want the whole shell's worth of axes at once (the eval bench's
// corpus reader, the floors harness's census rows) ask for the family and get
// the same set they got before the split, in the same order.
//
// The guided wizard still authors the whole shell in one prompt (its builder is
// untouched by ruling), so the family is what that path means by "shell".
export var IDENTITY_AXIS_STAGE_FAMILIES = {
  shell: ['shellIdentity', 'shellRules', 'shellTheme', 'shellSpine']
};

/**
 * identityAxesForStage(stage) -> axis[]
 *
 * SINGLE HOME (D93). The prompt asks for the axes it must show, the floor asks
 * for the axes it may check, and the two must be the same list or the system
 * demands a value it never handed over.
 *
 * A FAMILY KEY expands to the union of its members, in table order and without
 * duplicates. A real stage key never collides with a family key — the family
 * table's own keys are the retired seats, and `IDENTITY_AXIS_STAGES` is derived
 * from the rows, so the two namespaces cannot overlap by construction.
 */
export function identityAxesForStage(stage) {
  var key = String(stage || '').trim();
  var members = IDENTITY_AXIS_STAGE_FAMILIES[key] || [key];
  return IDENTITY_AXES.filter(function (axis) {
    var stages = axis.stages || [];
    for (var i = 0; i < members.length; i++) {
      if (stages.indexOf(members[i]) !== -1) return true;
    }
    return false;
  });
}

// FNV-1a, 32-bit. The draw's whole entropy path, and it is deliberately the
// dullest hash available: the requirement is that two draws from one seed are
// BYTE-IDENTICAL in every runtime this repo runs in — a browser, a Node
// harness, and a vm sandbox — not that it is hard to invert. Nothing here reads
// a clock or a global; `drawSeedAssignments` is a pure function of its argument
// and the table above, which is what makes a book reproducible from the seed
// recorded on it (`_x.divergenceSeed`).
export function seedHash(text) {
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
// THE AVALANCHE FINALIZER (D231). FNV-1a's low bits are a closed channel —
// the multiplier is odd, so the low k bits of the state never feel the high
// bits — and every small-menu axis drew `hash % 4` from that starved channel
// with near-identical inputs. Measured on 5,000 random seed pairs: 3% collided
// on ALL EIGHT surface-identity axes at once (10,000× the independent rate),
// in a bimodal all-or-nothing pattern — seeds fell into a handful of large
// equivalence classes, and every generated book drew its face from those few.
// Marginally uniform, jointly degenerate: per-axis frequency tests pass while
// the joint draw is the sameness engine itself. fmix32 (MurmurHash3's
// finalizer) gives every output bit dependence on every state bit, making the
// axes jointly independent. Scoped HERE, not in seedHash — seedHash has other
// consumers (draw-inputs.mjs) whose mappings this must not silently move.
function avalanche32(h) {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function drawSeedAssignments(seedValue) {
  var value = String(seedValue == null ? '' : seedValue).trim();
  if (!value) return null;
  var out = {};
  for (var i = 0; i < IDENTITY_AXES.length; i++) {
    var axis = IDENTITY_AXES[i];
    if (!axis.menu || !axis.menu.length) continue;
    out[axis.id] = axis.menu[avalanche32(seedHash(value + ' ' + axis.id)) % axis.menu.length];
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
  // `objectMember` is `member` for an array of OBJECTS: the composition is
  // `[{entry, role}]`, and the axis is about the entries. Projecting here — one
  // line, in the single reader — is what lets the obedience floor, the referee
  // and the GIVENS block treat this axis exactly like `harvestPatterns` without
  // any of them learning the spine's shape (D170).
  if (axis.kind === 'objectMember') {
    if (!Array.isArray(node)) return undefined;
    var key = axis.itemKey || 'entry';
    return node.map(function (item) {
      return item && typeof item === 'object' ? String(item[key] == null ? '' : item[key]).trim() : '';
    }).filter(Boolean);
  }
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
  // ── The crossword (W7.5 · VISION §4.2 · the loom) ─────────────────────────
  // EVERY NUMBER HERE WAS MEASURED, not chosen. The instrument was 240 weaves
  // of the demo booklet's own assembled vocabulary (2,293 words), pools of
  // 12-30 at both usable sizes; `LUDIC_CROSSWORD_FINDINGS` in
  // contracts/ludic-library.mjs holds the earlier prototype's numbers and this
  // wave's confirm them.
  //
  // NOTE WHAT IS ABSENT: there is no minimum fill or crossing PERCENTAGE. A
  // book's own roster affords ~38-45% fill and ~15-20% checked letters — a
  // crisscross, not an American-style dense grid — and §4.2's own words are
  // "density honest to what the roster affords". Flooring a percentage off
  // these draws would be machinery derived from a measurement artifact, which
  // is the D198 counter-guard. The structural floors do the work instead, and
  // they are booleans the solver proves: every entry crosses another, the grid
  // is one connected shape, every run of two or more cells is a clued entry.
  crossword: {
    // The 11x11 collapse is a HARD floor, not a tuning failure: a 12-letter
    // answer cannot be crossed inside an 11-cell grid, so the first placement
    // fills the board and nothing else fits.
    minSize: 13,
    // The search bound AND the render ceiling. The weave is cropped to its
    // bounding box afterwards, so the printed grid is usually smaller.
    maxSize: 15,
    // The POOL the model authors. The loom weaves what interlocks and drops
    // the rest, so this is a supply of candidates, never a placement demand —
    // "place all N" refused 10 of 18 realistic pools and the refusal was not
    // actionable, which is why the pool model is the one that shipped.
    minPoolEntries: 12,
    maxPoolEntries: 24,
    // What the weave must actually yield to be a puzzle. Observed worst case
    // from a conforming pool was 8 placed; this sits two under, because the
    // floor exists to refuse a non-puzzle rather than to enforce a quality
    // target the prompt already teaches.
    minPlacedEntries: 6,
    wordMinChars: 3,
    // Must stay below minSize or the longest answer cannot be crossed.
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
