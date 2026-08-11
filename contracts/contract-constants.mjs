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
  linearTrack: { minPositions: 3, maxPositions: 12 },
  playerDrawn: { maxPrompts: 4, maxSeedMarkers: 3 },
  cipher: { displayTextMaxChars: 350, extractionInstructionMaxChars: 200 },
  oracle: { entryCount: 10 }
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
