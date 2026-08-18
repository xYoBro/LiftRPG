// ════════════════════════════════════════════════════════════════════════════
// THE LUDIC LIBRARY REGISTRY (PLAY.md §1 · VISION §4.4 · Wave 5a)
// ════════════════════════════════════════════════════════════════════════════
// PLAY.md §1 names two shelves: the IMPLEMENTED one (what a generated book can
// print today) and the RESEARCHED one (the print-and-play canon, filtered by
// the pencil-only law, promoted by harvest). Until now the researched shelf
// lived only as prose in docs/reference/immersive-print-and-play.md, which
// means it could not be checked, could not be offered to a model, and could not
// record WHY a family had not landed. This file is that shelf promoted into the
// contract stack, in the MAP_FAMILY_REGISTRY idiom: the enum lives in
// contract-constants.mjs, the registry lives beside it, and validate.mjs gates
// them against each other.
//
// ── WHY THIS IS A SEPARATE FILE, NOT MORE OF contract-constants.mjs ─────────
// contract-constants.mjs is loaded by the BROWSER — the renderer imports it for
// theme, workspace and map resolution, and the generator imports it for the ref
// grammar. Nothing at runtime reads this registry: its consumers are
// gen-reference.mjs (which emits the published page), validate.mjs (which gates
// the prompt menus against it), and human eyes. Putting ~15KB of design prose
// into a module every page load parses would be a cost paid by every reader for
// data no reader uses. The same reasoning already put MAP_FAMILY_REGISTRY in
// mechanic-registry.js rather than in the constants.
//
// ── THE TWO AXES, and why they are two ──────────────────────────────────────
// A tier-1 entry is a SYSTEM: something the book prints, that a composition can
// name (`playSpine.composition[].entry`). A tier-2 entry is a PATTERN: a way of
// wiring systems that the spine DECLARES rather than prints — a hint ladder is
// applied to a decode chain, a gate structure is a property of the whole
// economy. Collapsing the two would have forced the composition enum to accept
// things no atom draws, which is exactly the aspirational-library failure
// LUDIC_LIBRARY_ATOMS exists to prevent.
//
// So: tier 1 widens the composition menu; tier 2 widens the DECLARATION menu.
// Tiers 3 and 4 widen neither and exist to be honest about what the shelf holds
// and why it is not here — a family silently dropped is a family that gets
// re-researched next year.
//
// ── THE PER-ENTRY SCHEMA ────────────────────────────────────────────────────
// Inputs / Process / Outputs / Locks is the research document's own schema for
// every mechanic it lists ("A practical schema for every mechanic you
// implement"), kept verbatim so the promotion is a translation rather than a
// re-derivation. `locks` answers the escape-room question — what is not allowed
// until discovered — and an entry whose locks are "none" says so rather than
// leaving the field to be read as an oversight.

import {
  LUDIC_LIBRARY,
  LUDIC_LIBRARY_ATOMS,
  LUDIC_ARSENAL_ENTRIES,
  VALID_MAP_TYPES,
  VALID_CONSTRAINED_GRID_KINDS,
  VALID_WORD_GRID_KINDS,
  SPATIAL_GUARDRAILS
} from './contract-constants.mjs';
// The solver shelf. puzzle-solvers.mjs is dependency-free by ruling (D151), so
// this import cannot cycle. Used by the arsenal audit below to prove — rather
// than assert — that every puzzle kind the schema names has a machine that
// finishes it.
import * as PUZZLE_SOLVERS from './puzzle-solvers.mjs';

// ── The tiers ───────────────────────────────────────────────────────────────
// Ordered from nearest to furthest from the page. The order is load-bearing:
// gen-reference emits the registry in tier order, and the harvest queue reads
// top-down.
export var LUDIC_TIERS = [
  'implemented',
  'promotable-with-existing-atoms',
  'needs-new-primitive',
  'excluded-physical'
];

// The two laws that put an entry in tier 4. Quoted rather than paraphrased so
// the published page can cite the ruling that excluded each family.
export var LUDIC_EXCLUSION_LAWS = {
  'pencil-only': 'The pencil-only law (D122, PLAY.md §4.2): the complete kit is the book, a pencil, and two ten-sided dice. Nothing cut, folded, glued, aligned, or assembled.',
  'out-of-scope': 'Deliberately out of scope (waves plan §4): phone play modes and any mechanic whose core loop needs a screen, a speaker, or a timer the book cannot print.'
};

// ── Tier 1: the implemented shelf ───────────────────────────────────────────
// KEYED BY LUDIC_LIBRARY, never re-listing it. The enum in contract-constants
// is the source; this table is the detail hung on it, and validate.mjs asserts
// the keys are exactly the enum in exactly its order. That direction matters:
// LUDIC_LIBRARY is what the SCHEMA accepts in a composition, so it has to be
// importable without dragging this file's prose into the browser.
var IMPLEMENTED_DETAIL = {
  'reckoning-economy': {
    label: 'The reckoning economy',
    inputs: 'Session markStrip ticks; the week’s reckoning conversion; the derived boss threshold.',
    process: 'Ticks tally at the week’s Reckoning, convert to the named currency, and bank; banked value prices every spend the spine declares.',
    outputs: 'A filled strip, a tallied panel, a running Banked figure, and whatever the spend opens.',
    locks: 'Nothing spends before its first Reckoning; the boss threshold gates the endgame ceremony only when the spine routes required content through it.'
  },
  'board': {
    label: 'The board',
    inputs: 'Banked value or a key; the region or node the player names.',
    process: 'Marking the map opens a region permanently — six geometries under eight board-state modes, add-only in every one.',
    outputs: 'A mutated map the player returns to every week; new regions legal to reference in prose.',
    locks: 'A region is unreachable until an edge feeds it; the map never un-marks, so an opened region cannot be spent twice.'
  },
  'decode-chain': {
    label: 'The decode chain',
    inputs: 'The week’s cipher body plus the extraction instruction; prior play state for the cross-reference families.',
    process: 'The player performs the extraction with a pencil; the result is a word, coordinate, or index the book reads back.',
    outputs: 'A decoded value that feeds a seal, a password element, or the boss assembly.',
    locks: 'A cipher whose key is a fragment the player has not met yet cannot be solved — keys land strictly before locks.'
  },
  'clock-bank': {
    label: 'The clock bank',
    inputs: 'Outcomes, spends, misses, and the passage of weeks.',
    process: 'Segments tick on fill, drain, race, or tug-of-war clocks; a full clock fires its declared consequence.',
    outputs: 'Visible pressure the player reads at a glance, and the state change a filled clock triggers.',
    locks: 'A clock nothing reads is a mute source and blocks at the week floor; ambient clocks must be declared ambient.'
  },
  'companion-kit': {
    label: 'The companion kit',
    inputs: 'Play state the player chooses to record — items held, memories kept, stats moved.',
    process: 'State-holding components (dashboards, tracks, stat blocks, inventories, memory slots) take pencil marks between sessions.',
    outputs: 'A carried position the later weeks can read and the endgame can require.',
    locks: 'Slot limits force discards; a component the economy never feeds holds nothing.'
  },
  'oracle-pull': {
    label: 'The oracle pull',
    inputs: 'Two ten-sided dice, read as roll-under percentile.',
    process: 'The d100 leg of the Hook loop: ten bands, each mapping to a concrete state change rather than atmosphere.',
    outputs: 'A rolled outcome that ticks something, grants something, or opens something.',
    locks: 'Chance isolation (D37): dice never touch sets, reps, load, or rest, and an outcome the endgame requires can never sit behind a roll.'
  },
  'door-fork': {
    label: 'The door fork',
    inputs: 'The week’s posted choice and whatever the player has banked when they reach it.',
    process: 'The player takes one side and crosses out the other; the decision ledger names what mechanically differs.',
    outputs: 'A branch-attributed change to the economy — a price, a clock, a region, a table.',
    locks: 'A door with no edge leaving it is flavour-only; content reachable down one branch alone is a soft-lock.'
  },
  'sealed-cache': {
    label: 'The sealed cache',
    inputs: 'A key the player recognises — a decoded word, a filled clock, a named region.',
    process: 'Sealed by honour: the page states its key and its unlock condition and the player chooses when to turn to it.',
    outputs: 'A late document that pays an early promise.',
    locks: 'The key is held strictly before the sealed page is printed; you cannot open what you have not yet found.'
  },
  'boss-convergence': {
    label: 'The boss convergence',
    inputs: 'The weekly component values, the assembly instruction, and the boss componentInputs.',
    process: 'The endgame ceremony assembles the season’s collected values into the finale’s key.',
    outputs: 'The assembly page, the boss encounter, and the ending the assembled value opens.',
    locks: 'Every password element must be collectable on every branch — the finale opens with all of them or none.'
  },
  'deduction-board': {
    label: 'The deduction board',
    inputs: 'A clue set and a grid of pencil cells — subjects against categories, run lengths against a picture, a partly-printed square of digits, named voices against the two kinds of speaker, or things against the order they went in.',
    process: 'The player deduces cell states from constraints; the completed grid yields a code. A deterministic solver proves every printed puzzle solvable, UNIQUE, and key-matched before the week is accepted, and refuses it with the defect quoted otherwise.',
    outputs: 'A word, a letter string or a digit string the seal, the assembly or a priced spend reads.',
    locks: 'The grid is the lock. Nothing ships that a machine cannot finish: two solutions, no solution, or an answer the grid does not yield are all refusals, not warnings.'
  },
  // SUDOKU LIVES HERE, NOT ON THE ARITHMETIC SHELF, and the split is by what
  // each one PLAYS rather than by what it looks like. A sudoku contains no
  // arithmetic at all: it is pure constraint elimination, the same verb the
  // logic grid and the nonogram ask for. Kakuro and KenKen ask the player to
  // ADD, and that is a different hand and a different feeling at a gym bench.
  // Filing them together because both print a square of digits would be naming
  // entries for the file that draws them, which this registry's header forbids.
  'arithmetic-grid': {
    label: 'The arithmetic grid',
    inputs: 'A cage or run structure with target totals, and the digits 1-9.',
    process: 'The player fills digits so every run or cage hits its total with no repeat inside it; the completed grid yields a digit code. A deterministic solver proves solvable, UNIQUE and key-matched, and refuses with the defect quoted otherwise.',
    outputs: 'A digit string the seal, the assembly or a priced spend reads.',
    locks: 'The totals are the lock. A budget the solver cannot finish inside is a refusal, never a pass — an unprovable puzzle and a broken one are the same thing to a player holding a pencil.'
  },
  'word-hunt': {
    label: 'The word hunt',
    inputs: 'A letter board and a word list drawn from the book’s own noun roster.',
    process: 'The player rings the words they find. A verifier proves every declared placement genuinely spells its word in the printed board, so overlaps are legal by construction, and proves the answer rule produces the declared answer.',
    outputs: 'A word the seal or the assembly wants — either one from the list, or the letters no word covered.',
    locks: 'Machine-verified placement; a word the board does not contain is refused, and in leftovers mode an answer the uncovered letters do not spell is refused.'
  },
  // PROMOTED OUT OF TIER 3 AT W7.5, on VISION §4.2's ratified split (D148):
  // THE LOOM BUILDS THE GRID, THE MODEL WRITES THE CLUES. The tier-3 entry sat
  // on one blocker for two waves — "a constraint-satisfaction problem over a
  // dictionary this engine does not ship" — and that framing was the thing that
  // was wrong. The engine needs no dictionary, because it is not FILLING a
  // pre-drawn shape from a lexicon; it is WEAVING a shape around a pool of
  // answers the model already authored. Those are different problems, and the
  // second one a 400,000-placement budget finishes in about 600 tests.
  //
  // DENSITY IS REPORTED, NOT PROMISED. A book's own vocabulary affords a
  // crisscross — ~38-45% fill, ~15-20% of letters checked by a second entry —
  // which is §4.2's "density honest to what the roster affords" answered with a
  // number rather than a hope. See LUDIC_CROSSWORD_FINDINGS below.
  'interlocking-word-grid': {
    label: 'The interlocking word grid (crossword)',
    inputs: 'A pool of answer/clue pairs drawn from the book’s own world, and nothing else — the model authors no geometry.',
    process: 'The loom weaves the answers that interlock into a numbered grid and drops the rest; the player writes answers into a shape whose crossings check each other, and the marked squares spell the key. A verifier re-derives everything from the finished grid and refuses a weave that will not carry a puzzle.',
    outputs: 'A word or letter string the seal, the assembly or a priced spend reads.',
    locks: 'The crossings are the lock. `verifyCrossword()` in contracts/puzzle-solvers.mjs refuses a grid where any run of two or more cells is unclued, any entry crosses nothing, the shape falls into islands, or the marked squares do not spell the declared answer. A search budget exceeded is a refusal, never a pass.'
  },
  'ledger-audit': {
    label: 'The ledger audit',
    inputs: 'The player’s own logged numbers, movement by movement.',
    process: 'First / peak / change per movement, audited across the block — the body read as evidence.',
    outputs: 'A printed ledger spread the player fills and the ending can cite.',
    locks: 'Emitted only when the book declares an economy; nothing gates it.'
  }
};

// ── Tier 2: promotable with existing atoms ──────────────────────────────────
// PATTERNS, not systems. `wired` says whether the declaration surface EXISTS
// today: a wired entry is offered to the model as a harvest pattern and carries
// a schema surface plus a floor; an unwired one is the harvest queue and may be
// named in `honestGaps` but never composed. validate.mjs enforces both
// directions of that (a wired entry absent from the prompt menu is a system no
// book will ever use; an unwired one present in it costs a retry the model
// cannot fix).
//
// `surface` on a wired entry is a real path, existence-asserted against
// booklet-schema.mjs. On an unwired entry it is null, and saying null is the
// point: it is the field a future wave fills in.
var PROMOTABLE = [
  {
    id: 'gate-structure', label: 'Open / sequential / path-based gating', wired: true,
    surface: 'meta.playSpine.gateStructure',
    inputs: 'The composition, and how many independent leads the book wants open at once.',
    process: 'Nicholson’s three puzzle organisations, declared per book: open (many leads, one meta), sequential (each output is the next input), path-based (two or more lanes that converge).',
    outputs: 'A shape the economy graph must actually have — the floor reads the declared structure back off the graph.',
    locks: 'Sequential owes a chain; path-based owes two lanes and a convergence; open owes several independent feeders into one sink.'
  },
  {
    id: 'hint-ladder', label: 'Costed tiered hints', wired: true,
    surface: 'meta.playSpine.hintLadders',
    inputs: 'A puzzle surface the player can stall on, a cost the world can actually collect, and a heading in the book’s own voice.',
    process: 'EXIT’s three-rung ladder — nudge, then method, then answer — each rung priced in something the book already tracks (a clock tick, banked value, a crossed-out option). W5b gave the ladder a PRINTED SURFACE: the rungs print as their own costed band on the page `printedOn` names, rather than riding that page’s prose.',
    outputs: 'A player who is never hard-stuck, a threat clock that remembers they were, and a band the reader finds at the point of use.',
    locks: 'Rungs are ordered and each is dearer than the last; the ladder names the printed surface that carries it, and the seal is the ORDER — the cost prints before the thing it buys, and paying is on the player’s honour, the same ruling as the sealed cache.'
  },
  {
    id: 'deduction-milestone', label: 'Deduction milestones', wired: true,
    surface: 'meta.playSpine.milestones',
    inputs: 'A countable body of evidence — clue marks, opened regions, decoded lines.',
    process: 'At a declared count the book unlocks a working theory: a named choice that changes what comes next.',
    outputs: 'A theory the player commits to in pencil, and the surface that answers it.',
    locks: 'The unlock is unavailable below the count, and the milestone must be answered by a consequence edge — an unanswered theory is an unpaid promise.'
  },
  {
    id: 'legacy-pencil-move', label: 'Legacy moves, pencil-only', wired: true,
    surface: 'meta.playSpine.legacyMoves',
    inputs: 'A state change the book intends to make permanent.',
    process: 'Irreversibility without destruction: cross out forever, mutate the map add-only, unlock a standing rule ("from now on…"), seal a page by honour, gate a page on a session count.',
    outputs: 'A book that is visibly a record of one campaign and cannot be replayed clean.',
    locks: 'Each move names the printed surface it happens on; nothing is ever un-marked.'
  },
  {
    id: 'found-not-found-gating', label: 'Found / not-found gating', wired: true,
    surface: 'meta.playSpine.economyGraph (edges into `seal:`)',
    inputs: 'A lock, and the key the player must already hold.',
    process: 'EXIT’s founding rule — you cannot open what you have not yet found — expressed as an edge whose source is holdable strictly earlier.',
    outputs: 'Gated content that opens exactly once the player has earned it.',
    locks: 'A sealed surface with no inbound edge is unreachable; a key that lands with or after its lock blocks.'
  },
  {
    id: 'branch-attributed-consequence', label: 'Branch-attributed consequence', wired: true,
    surface: 'meta.playSpine.economyGraph[].branch',
    inputs: 'A door and the side of it an edge belongs to.',
    process: 'An edge names `door:W3/A` or `door:W3/B`, so the two sides of a fork are mechanically distinguishable rather than two labels.',
    outputs: 'A fork whose branches genuinely differ, and a simulated player that can walk each side.',
    locks: 'An endgame reachable on one branch only is a soft-lock; unattributed door edges are reported as underspecified.'
  },
  {
    id: 'priced-spend', label: 'Priced spends', wired: true,
    surface: 'meta.playSpine.economyGraph[].price',
    inputs: 'Banked marks, and a spend that costs a stated number of them.',
    process: 'The declaration carries the number the page states in prose, denominated in marks — the same unit as the derived boss threshold, because that is the only unit the machine economy has.',
    outputs: 'A budget the player plans against, and a stingy/greedy choice that is a real trade rather than a schedule.',
    locks: 'A spend is unavailable below its price; the endgame’s own gate stays the derived threshold and may never be re-priced here.'
  },
  {
    id: 'timed-affordance', label: 'Timed affordances', wired: true,
    surface: 'meta.playSpine.economyGraph[].closesAtWeek',
    inputs: 'An affordance and the last week it can be taken.',
    process: 'Daviau’s timed unlock inverted: the window closes, so hoarding costs something and taking it early costs something else.',
    outputs: 'A deadline the schedule can be measured against.',
    locks: 'Nothing may close before it opens; a required surface behind a closed window is a soft-lock.'
  },
  {
    id: 'book-referential-examination', label: 'Book-referential examination', wired: true,
    surface: 'weeks[].fieldOps.cipher (the `cross-reference` family)',
    inputs: 'The book’s own printed pages — fragments, regions, oracle lines, filled clocks.',
    process: 'The index cipher generalised: the answer is a coordinate into this book (fragment, line, word), so the workbook becomes the lock. Real-world trivia is banned outright — it is unverifiable, brief-blind, and fails the moment a player has not read the same books as the model.',
    outputs: 'A puzzle only a player who has actually read this artifact can solve.',
    locks: 'Every cited surface must be printed EARLIER than the puzzle that cites it.'
  },
  {
    id: 'action-draft', label: 'Action draft (pick N of M)', wired: false, surface: null,
    inputs: 'A posted menu of actions and a per-session allowance.',
    process: 'The player picks two of five and crosses out the rest — agency made legible by scarcity of choice, not of resource.',
    outputs: 'A committed plan the week resolves against.',
    locks: 'Unpicked actions are gone for the session; some actions are unavailable until a clue is found.'
  },
  {
    id: 'action-point-pool', label: 'Action-point pool', wired: false, surface: null,
    inputs: 'A per-session pool that refreshes.',
    process: 'Points are spent across a menu; the pool refreshes on schedule rather than accumulating.',
    outputs: 'A spend pattern that resets, unlike the banking economy.',
    locks: 'An action priced above the pool is unavailable this session.'
  },
  {
    id: 'programmed-actions', label: 'Programmed actions', wired: false, surface: null,
    inputs: 'An ordered plan written before resolution.',
    process: 'Write three steps, then resolve in order; consequences can disrupt later steps.',
    outputs: 'A plan that can be compromised — the operation form as fiction.',
    locks: 'Steps cannot be reordered after commitment.'
  },
  {
    id: 'limited-use-abilities', label: 'Limited-use abilities', wired: false, surface: null,
    inputs: 'One to three special moves per act.',
    process: 'Each use is crossed off permanently within its act.',
    outputs: 'A held option whose value is knowing when to burn it.',
    locks: 'An ability unlocks at a declared milestone and is spent when marked.'
  },
  {
    id: 'tiered-resolution', label: 'Tiered resolution (strong / weak / miss)', wired: false, surface: null,
    inputs: 'A d100 roll against a printed threshold.',
    process: 'Three outcome bands rather than pass/fail; the middle band succeeds at a cost.',
    outputs: 'Consequences without a referee — success-with-cost as the common case.',
    locks: 'None; this is a resolution shape, not a gate.'
  },
  {
    id: 'margin-based-outcomes', label: 'Margin-based outcomes', wired: false, surface: null,
    inputs: 'How far over or under the target the roll landed.',
    process: 'Magnitude scales with margin — ticks, reward size, damage.',
    outputs: 'A readout rather than a verdict.',
    locks: 'None.'
  },
  {
    id: 'press-your-luck', label: 'Press-your-luck', wired: false, surface: null,
    inputs: 'A stop-or-continue checkpoint mid-sequence.',
    process: 'Keep rolling for more; busting ticks a threat clock.',
    outputs: 'A tension curve inside a single session.',
    locks: 'Nothing required may sit past a bust point.'
  },
  {
    id: 'resource-spend-reroll', label: 'Resource-spend rerolls', wired: false, surface: null,
    inputs: 'A scarce token the player holds.',
    process: 'Spend to reroll or flip a result — a knob on randomness rather than an escape from it.',
    outputs: 'A saved run and an emptier pocket.',
    locks: 'The token must be earnable before the roll that wants it.'
  },
  {
    id: 'set-collection', label: 'Set collection', wired: false, surface: null,
    inputs: 'Symbols, tags, or marks gathered across weeks.',
    process: 'A complete set unlocks meta content; partial sets pay partially.',
    outputs: 'An evidence wall that reads as accumulated play.',
    locks: 'The meta is unavailable until the set is complete on every branch.'
  },
  {
    id: 'skill-tree', label: 'Unlockable upgrade track', wired: false, surface: null,
    inputs: 'One upgrade choice per act or week.',
    process: 'The player marks a branch of a printed tree; earlier picks constrain later ones.',
    outputs: 'A build the endgame can read.',
    locks: 'A branch is unavailable until its parent is marked.'
  },
  {
    id: 'faction-clock', label: 'Faction clocks', wired: false, surface: null,
    inputs: 'Off-screen actors that advance on a world turn.',
    process: 'Several clocks tick without player input; their state changes what the week offers.',
    outputs: 'A world that moves while the player is away — Calleja’s macro-involvement, printed.',
    locks: 'A faction at full may close an affordance permanently.'
  },
  {
    id: 'oracle-yes-no-twist', label: 'Yes/no oracle with twist', wired: false, surface: null,
    inputs: 'A question and a d100 roll.',
    process: 'Yes/no resolution, with doubles or extremes firing a random event on top.',
    outputs: 'A ruling plus an occasional complication.',
    locks: 'None.'
  },
  {
    id: 'meaning-table', label: 'Meaning tables', wired: false, surface: null,
    inputs: 'Two rolls: action plus descriptor.',
    process: 'The pair is read together into a concrete clue or event.',
    outputs: 'Fabricated specifics the player authors at the bench.',
    locks: 'None.'
  },
  {
    id: 'scene-type-table', label: 'Scene-type tables', wired: false, surface: null,
    inputs: 'A roll at the head of a session.',
    process: 'The table sets the session’s KIND — investigation, confrontation, passage — and its stakes.',
    outputs: 'Varied session texture without varied rules.',
    locks: 'None.'
  },
  {
    id: 'suspect-matrix', label: 'Suspect matrix', wired: false, surface: null,
    inputs: 'Candidates against attributes, and the contradictions the player has found.',
    process: 'Mark contradictions, eliminate rows, and name the survivor.',
    outputs: 'A deduction the endgame can require by name.',
    locks: 'The accusation is unavailable until a declared evidence set is held.'
  },
  {
    id: 'tagged-clue-tokens', label: 'Tagged clues', wired: false, surface: null,
    inputs: 'Clues carrying one or two tags each.',
    process: 'The meta puzzle asks for a tag combination rather than specific clues, so several routes satisfy it.',
    outputs: 'Non-linear investigation that still converges.',
    locks: 'The meta needs a full tag set.'
  },
  {
    id: 'red-herring-paid-risk', label: 'Red herrings as paid risk', wired: false, surface: null,
    inputs: 'An optional lead with a stated cost.',
    process: 'Chasing it may pay, and always advances a threat clock.',
    outputs: 'A real decision about whether to look.',
    locks: 'Nothing required may sit behind a herring.'
  },
  {
    id: 'rule-unlock-packet', label: 'Rule-unlock packets', wired: false, surface: null,
    inputs: 'A session count or a filled clock.',
    process: 'A new rules block enters play at a declared moment; the core system stays stable while modules layer in.',
    outputs: 'Complexity as a reward rather than a tax.',
    locks: 'The packet is sealed by honour until its trigger.'
  },
  {
    id: 'symbol-lock', label: 'Symbol locks', wired: false, surface: null,
    inputs: 'A symbol that identifies which lock a code belongs to.',
    process: 'The symbol is the channel: a code entered against the wrong symbol is simply wrong.',
    outputs: 'Several live locks at once without ambiguity.',
    locks: 'A code is meaningless until its symbol is found.'
  }
];

// ── Tier 3: needs a new primitive ───────────────────────────────────────────
// Ordered by verifiability, which is the ordering the waves plan chose on
// purpose: nothing ships a puzzle a machine cannot check.
var NEEDS_PRIMITIVE = [
  // W5b PROMOTED the logic grid and the nonogram out of this tier and left the
  // ARITHMETIC half behind, for one reason it stated plainly: the solver. "A
  // logic grid is a permutation search and a nonogram is a line-solve; a kakuro
  // is a constrained integer partition, which is neither, and the law is that
  // nothing ships a puzzle a machine cannot finish."
  //
  // THE ARSENAL WAVE WROTE THE PROOF, and `arithmetic-grid` left this tier for
  // the implemented shelf: kakuro's run-combination propagation and KenKen's
  // cage enumeration are in contracts/puzzle-solvers.mjs, both with uniqueness
  // and key-matching, both with a budget whose exhaustion is a refusal. Sudoku
  // landed in the same wave but joined `deduction-board` instead — it contains
  // no arithmetic, and these entries are named for what they play.
  //
  // The deferral is not re-listed as a queued entry. One family, one entry, one
  // tier, exactly as `printed-hint-band` was handled below.
  // W5b PROMOTED the search half out of this tier — it is `word-hunt` on the
  // implemented shelf. W7.5 PROMOTED THE INTERLOCKING HALF, and it is
  // `interlocking-word-grid` there. Neither is re-listed here as a queued
  // entry: one family, one entry, one tier, exactly as `printed-hint-band` and
  // `arithmetic-grid` were handled.
  //
  // WHAT THE DEFERRAL GOT WRONG, recorded because the framing is the lesson.
  // Two waves read the blocker as "proving a crossword fillable-and-unique is a
  // constraint-satisfaction problem over a dictionary this engine does not ship
  // and would have to be brief-blind to use." That describes FILLING a
  // pre-drawn shape from a lexicon, which is indeed hard and is not what the
  // ratified split asks for. Weaving a shape AROUND answers the model already
  // wrote is a different problem, and it finishes in about 600 placement tests.
  // The entry sat in tier 3 for two waves on the strength of a sentence that
  // was solving the wrong problem.
  // `printed-hint-band` LANDED IN W5b and left this tier: the band is
  // renderer/modules/atoms/hint-band.js, with its own estimate term and its own
  // parsed ladder mirror, and the tier-2 `hint-ladder` entry above now carries
  // the printed half of the mechanic. It is not re-listed here as a second
  // entry — one family, one entry, one tier.
  {
    id: 'per-session-choice', label: 'Per-session choice surface',
    inputs: 'A choice posted on the session card itself.',
    process: 'Every session asks something, not merely every week.',
    outputs: 'A per-session decision the simulated player can floor rather than merely count.',
    locks: 'None.',
    needs: 'A printed per-session choice primitive. Schema 1.5.0 offers exactly one per-session choice surface (`binaryChoice`) and the boss cross-check assumes one per book, so the sim reports the count and does not gate it.'
  },
  {
    id: 'find-the-anomaly', label: 'Perception puzzles (find the anomaly, spot the difference)',
    inputs: 'An illustration or a dense table with one planted irregularity.',
    process: 'The player locates what does not belong; its position is the answer.',
    outputs: 'A coordinate or letter.',
    locks: 'The anomaly must be machine-plantable and machine-findable, or the puzzle cannot be proven solvable.',
    needs: 'A generated-illustration primitive the engine can both draw and audit. HALF OF THIS FAMILY IS ALREADY SHIPPED and the arsenal wave assessed which half: the TEXTUAL anomaly — one letterform wrong, one spacing wrong, one glitch in a document — is the `typographic-anomaly` cipher family, which prints today, and a cipher IS a planted irregularity whose location is the answer. What stays here is the PICTORIAL half, and it stays for the reason it always did: the engine draws no illustrations, so it can neither plant an anomaly in one nor audit that exactly one is there. Building a second textual anomaly surface would be a fifth cipher family wearing a puzzle\'s name.'
  },
  // ── The metapuzzle, assessed and closed as ALREADY COVERED ────────────────
  // Recorded rather than dropped, per this file's own law: "a family silently
  // dropped is a family that gets re-researched next year." The arsenal wave
  // asked whether dependency-structured metapuzzles (the research's Gilbert
  // charts — puzzles feeding puzzles feeding a final answer) needed a primitive,
  // and the answer is that the Ludic Spine already IS one, with more teeth than
  // a chart has.
  //
  // What a Gilbert chart draws, the spine declares and the floors enforce:
  // `economyGraph` names the edges, `gateStructure` declares the shape they make
  // (open / sequential / path-based, each owing a structure the floor reads back
  // off the graph), and the closure floors block a book with a key after its
  // lock, a dead sink, a mute source or an orphan system. The simulated player
  // then walks the whole thing at three adherence bands. A chart is a picture of
  // a dependency structure; this is a dependency structure that cannot ship
  // disconnected.
  //
  // So there is nothing to build, and this entry exists to say so — with the
  // one honest caveat: the CONSTRAINED GRIDS sit outside that graph. They are
  // not in SURFACE_REF_KINDS, so a puzzle cannot yet be named as a spine node,
  // which means a metapuzzle whose feeders are puzzles rather than surfaces is
  // expressible only through the seals and ciphers the grids feed. That is a
  // real edge and it is written down here rather than left to be rediscovered.
  {
    id: 'metapuzzle-dependency', label: 'Dependency-structured metapuzzles (Gilbert charts)',
    inputs: 'A set of puzzles and surfaces, and the answers each one yields.',
    process: 'Answers feed later locks; the structure of what feeds what is the design, and the final answer needs several of them.',
    outputs: 'A convergence the player assembles from parts they earned separately.',
    locks: 'Every key obtainable before its lock; no dead sinks, no mute sources, no orphan systems.',
    needs: 'NOTHING — assessed and closed as already covered. `meta.playSpine.economyGraph` plus `gateStructure` IS the dependency chart, the closure floors make disconnection a blocking failure rather than a review note, and the simulated player walks it end to end. The one gap worth naming: constrained grids are outside SURFACE_REF_KINDS, so a puzzle cannot be a spine node directly — a metapuzzle built on puzzles routes through the seals and ciphers they feed.'
  }
];

/**
 * LUDIC_CROSSWORD_FINDINGS — what the arsenal wave measured, so the next
 * attempt at `interlocking-word-grid` starts from numbers.
 *
 * VISION §4.2 pre-authorises dense crosswords on one ratified split: THE LOOM
 * BUILDS THE GRID, THE MODEL WRITES THE CLUES. The wave built the loom as a
 * prototype — a deterministic multi-pass crisscross fill, no dictionary, ~120
 * lines — and ran it against the demo booklet's own assembled vocabulary. The
 * decisive question was never "can code fill a grid"; it was "what density does
 * a BOOK's own words afford", and that now has an answer rather than a hope.
 *
 * THE HEADLINE: what a book's vocabulary affords is a CRISSCROSS, not a dense
 * crossword — roughly half the cells filled and about one crossing per word.
 * An American-style dense crossword is ~100% filled with every cell in two
 * words, and reaching that needs a large dictionary this engine deliberately
 * does not ship (and could not use brief-blind anyway). So the honest entry,
 * when it lands, is a crisscross whose density is reported rather than promised.
 *
 * That is not a downgrade of the ruling. §4.2 says "density honest to what the
 * roster affords", and this is the number that sentence was written to protect.
 */
export var LUDIC_CROSSWORD_FINDINGS = {
  // The pool is far wider than the 8-12 Core Noun Roster, because the roster is
  // prose inside `worldContract` while the assembled book is full of labels.
  vocabularyFromAssembledBook: 99,
  // Placed / cells filled, at three grid sizes, from that pool.
  measured: [
    { dim: 11, placed: 1, fillPercent: 100, crossings: 0 },
    { dim: 13, placed: 10, fillPercent: 49, crossings: 10 },
    { dim: 15, placed: 18, fillPercent: 51, crossings: 19 }
  ],
  // THE 11x11 COLLAPSE IS A HARD FLOOR, not a tuning failure: a 12-letter word
  // cannot be crossed inside an 11-cell grid, so the first placement fills the
  // board and nothing else fits. Any crossword surface must therefore be at
  // least 13 on a side, and 15 is where it becomes comfortable.
  minimumUsableDim: 13,
  comfortableDim: 15,
  // ── What the SHIPPED loom measures (W7.5) ─────────────────────────────────
  // Bands rather than points, because the figure moves with the pool. Held as
  // strings because they are quoted into an emitted page and a reader wants the
  // range, not a false average. The shipped loom is STRICTER than the prototype
  // — it refuses perpendicular adjacency and collinear overlap, both of which
  // spell words nobody clued — so its fill is LOWER than the prototype's
  // 49-51%. That is the correction, not a regression.
  shippedFillPercentBand: '38-45%',
  shippedCrossedLetterBand: '15-20%',
  // THE GATE THE FAMILY DOES NOT CLEAR, recorded in the contract rather than
  // only in a wave report. See the emitted arsenal page for the long form.
  transportRealCaveat: 'NO for the puzzle data: fieldOps.wordGrid is authored at week-final, '
    + 'which has no structured wire schema (there is no STRUCTURED_SCHEMA_WEEK). DR-59, shared '
    + 'by every week-declared surface. The LIBRARY ENTRY is transport-real at the shell seat.',
  // ── W7.5: EVERY ROW BELOW WAS BUILT, and the numbers were re-measured ─────
  // The prototype's headline held. Re-measured against the same book with the
  // shipped loom — which is STRICTER than the prototype, because it refuses the
  // perpendicular-adjacency and collinear-overlap cases that would otherwise
  // spell undeclared words — 240 of 240 weaves succeeded and verified, from
  // pools of 12-30 at both usable sizes:
  //     fill 38-45%   ·   checked letters 15-20%   ·   259-938 placement tests
  // The fill figure is LOWER than the prototype's 49-51% and that is the
  // correction, not a regression: a laxer adjacency rule fills more cells by
  // spelling words nobody clued.
  built: [
    'The loom is buildCrossword() in contracts/puzzle-solvers.mjs — deterministic, '
      + 'no RNG, dependency-free so it runs in the browser doors and in Node.',
    'The schema surface is wordGrid.kind "crossword": entries [{ answer, clue }] '
      + 'authored by the model, and a machine-written `skeleton` the loom writes.',
    'THE SEAM MOVED, and the prototype\'s plan was wrong about it. The note below '
      + 'said the loom should run at ASSEMBLY. It runs at the WEEK STAGE GATE '
      + 'instead — assembly still stamps the skeleton, but the gate is where the '
      + 'weave has to be proved, because a refusal after the stage gate has passed '
      + 'is a refusal the model can no longer act on. The D132 Correction Directive '
      + 'law decides this, and it decides it against the earlier plan.',
    'The print surface is the word-grid atom\'s crossword branch, with its own '
      + 'ladder mirror.',
    'The floor is verifyCrossword(): every run of two or more cells is a clued '
      + 'entry, every entry crosses another, the shape is one connected island, '
      + 'and the marked squares spell the declared answer.'
  ],
  // THE ONE ROW THAT DID NOT LAND, named rather than quietly dropped.
  remaining: [
    'The book-referential half: every answer findable in the book\'s own printed '
      + 'text. The prompt TEACHES it ("a crossword answer the reader has no way to '
      + 'know is not a puzzle, it is a quiz") and nothing CHECKS it. The instrument '
      + 'exists — buildSurfaceIndex in validation.js is what collectOracleWriteTarget'
      + 'Findings resolves against — but wiring it is a floor of its own with its own '
      + 'false-positive question (an answer may legitimately be a world noun the book '
      + 'names only in prose the index does not walk). Unfloored, and stated so.'
  ]
};

// ── Tier 4: excluded ────────────────────────────────────────────────────────
// Named, never silently dropped. Each entry carries the law that excluded it,
// because "we considered it and here is the ruling" is the difference between a
// filtered shelf and a forgotten one.
var EXCLUDED = [
  { id: 'decoder-disk', label: 'Decoder disk / cipher wheel', law: 'pencil-only',
    note: 'EXIT’s core physical computation object. The index cipher does the same work with a pencil and the book’s own pages — see `book-referential-examination`.' },
  { id: 'code-strip-window', label: 'Sliding code strip and window', law: 'pencil-only',
    note: 'Requires cutting a window and a second sheet.' },
  { id: 'transparency-overlay', label: 'Transparency / tracing overlay', law: 'pencil-only',
    note: 'Requires aligning one sheet over another. `overlay-window` is demoted from the generation menus for this reason (D124).' },
  { id: 'fold-and-cut-reveal', label: 'Fold-and-cut paper engineering', law: 'pencil-only',
    note: 'Folding a corner to keep a place is in; folding a page into a shape is not.' },
  { id: 'cut-card-deck', label: 'Cut-and-sleeve card decks', law: 'pencil-only',
    note: 'The d100 oracle is the printed substitute for a shuffled deck.' },
  { id: 'punch-out-tokens', label: 'Punch-out tokens and counters', law: 'pencil-only',
    note: 'Tracks and tallies hold the same state in graphite. `token-sheet` is demoted from the generation menus (D124).' },
  { id: 'standees', label: 'Standees', law: 'pencil-only',
    note: 'Board position is marked, not occupied.' },
  { id: 'sticker-sheet', label: 'Sticker sheets and achievement seals', law: 'pencil-only',
    note: 'Permanent change is delivered by crossing out and by add-only map mutation — see `legacy-pencil-move`.' },
  { id: 'foldable-envelope', label: 'Envelopes, dossiers, tabbed foldables', law: 'pencil-only',
    note: 'Sealed-by-honour pages do the gating without an envelope.' },
  { id: 'scratch-off', label: 'Scratch-off and tear-off reveals', law: 'pencil-only',
    note: 'Irreversible reveal without destroying the artifact: the honour seal.' },
  { id: 'paper-slider', label: 'Paper sliders and dials', law: 'pencil-only',
    note: 'A printed track marked in pencil carries the same state.' },
  { id: 'laminate-dry-erase', label: 'Lamination for dry-erase reuse', law: 'pencil-only',
    note: 'The book is a record of one campaign, not a reusable board.' },
  { id: 'qr-audio-log', label: 'QR-triggered audio logs', law: 'out-of-scope',
    note: 'Needs a screen and a speaker; the transcript alone is a fragment, which the book already prints.' },
  { id: 'app-timer', label: 'App timer as pressure', law: 'out-of-scope',
    note: 'The clock bank supplies pressure the book itself can hold.' },
  { id: 'app-code-checker', label: 'App as code checker', law: 'out-of-scope',
    note: 'Verification is the player’s, by honour — the same ruling as the seal.' },
  { id: 'atmosphere-soundtrack', label: 'Atmosphere as system (soundtrack tiers)', law: 'out-of-scope',
    note: 'Atmosphere is carried by the artifact’s own design language.' }
];

// ── Assembly ────────────────────────────────────────────────────────────────
// ONE array, tier-ordered, so every consumer walks the same list in the same
// order and the emitted page cannot disagree with the parity pass about what
// the shelf holds.
export var LUDIC_LIBRARY_REGISTRY = []
  .concat(LUDIC_LIBRARY.map(function (id) {
    var detail = IMPLEMENTED_DETAIL[id] || {};
    return {
      id: id,
      label: detail.label || id,
      tier: 'implemented',
      inputs: detail.inputs || '',
      process: detail.process || '',
      outputs: detail.outputs || '',
      locks: detail.locks || '',
      atoms: (LUDIC_LIBRARY_ATOMS[id] || []).slice(),
      surface: 'meta.playSpine.composition[].entry',
      wired: true,
      law: null,
      note: ''
    };
  }))
  .concat(PROMOTABLE.map(function (entry) {
    return {
      id: entry.id,
      label: entry.label,
      tier: 'promotable-with-existing-atoms',
      inputs: entry.inputs,
      process: entry.process,
      outputs: entry.outputs,
      locks: entry.locks,
      atoms: [],
      surface: entry.surface,
      wired: !!entry.wired,
      law: null,
      note: ''
    };
  }))
  .concat(NEEDS_PRIMITIVE.map(function (entry) {
    return {
      id: entry.id,
      label: entry.label,
      tier: 'needs-new-primitive',
      inputs: entry.inputs,
      process: entry.process,
      outputs: entry.outputs,
      locks: entry.locks,
      atoms: [],
      surface: null,
      wired: false,
      law: null,
      note: entry.needs
    };
  }))
  .concat(EXCLUDED.map(function (entry) {
    return {
      id: entry.id,
      label: entry.label,
      tier: 'excluded-physical',
      inputs: '',
      process: '',
      outputs: '',
      locks: '',
      atoms: [],
      surface: null,
      wired: false,
      law: entry.law,
      note: entry.note
    };
  }));

/**
 * ludicEntriesByTier(tier) -> entry[]
 *
 * The one accessor. Consumers ask for a tier rather than filtering the array
 * themselves, so a tier rename is one edit and a mis-spelled tier returns
 * nothing loudly (the callers floor on emptiness) instead of quietly.
 */
export function ludicEntriesByTier(tier) {
  return LUDIC_LIBRARY_REGISTRY.filter(function (entry) { return entry.tier === tier; });
}

/**
 * LUDIC_HARVEST_PATTERNS — the tier-2 entries that are WIRED.
 *
 * This is the menu the compiler is allowed to offer, and it is DERIVED for the
 * same reason GENERATION_COMPANION_MENU is (D124): a hand-written second list
 * is how a menu comes to offer something the floors reject. Wiring a queued
 * pattern is one flag; the menu follows.
 */
export var LUDIC_HARVEST_PATTERNS = ludicEntriesByTier('promotable-with-existing-atoms')
  .filter(function (entry) { return entry.wired; })
  .map(function (entry) { return entry.id; });

/**
 * LUDIC_UNCOMPOSABLE — every id a composition or a harvest menu may NOT name.
 *
 * The queued tier-2 patterns, the tier-3 families, and the tier-4 exclusions,
 * in one list, so the prompt-parity scan has a single needle set. These may be
 * named in `honestGaps` — that is what honestGaps is for — and nowhere else.
 */
export var LUDIC_UNCOMPOSABLE = LUDIC_LIBRARY_REGISTRY
  .filter(function (entry) { return entry.tier !== 'implemented' && !entry.wired; })
  .map(function (entry) { return entry.id; });

// ════════════════════════════════════════════════════════════════════════════
// THE ARSENAL AUDIT (gameplay round W1 · VISION §4.2 · §12)
// ════════════════════════════════════════════════════════════════════════════
// "The arsenal is bedrock, not backlog" (§4.2) and "an acceptance set the
// prompts never show is not a menu — it is a default generator" (§12). This
// block grades every implement on the shelf against five gates and compiles
// the digest the rulebook seat will be taught from. ONE compilation, four
// readers: the published page (docs/reference/generated/arsenal.md), the
// parity gate to come, the prompt literal to come, and the author.
//
// THE DERIVATION LAW (author directive, 2026-08-18): every grade cell is
// DERIVED from a named source — a registry field, a file scan, a vm-evaluated
// schema — and where a gate cannot be derived the cell says `unknown` and why.
// A hand-list of verdicts anywhere in this block would be the D202
// two-descriptions defect. The five gates:
//
//   renderable     — atom/geometry exists: the entry's LUDIC_LIBRARY_ATOMS
//                    binding intersected with the engine's live atoms
//                    (parameter: the atoms/ scan minus the D6 quarantine).
//   playable       — pencil-only (tier membership under the law that filters
//                    this shelf), machine-solved for the arsenal entries
//                    (puzzle-solvers.mjs exports, imported above), and
//                    chance-isolated where the entry's own locks state D37.
//   taught         — a text scan of every evaluated INST_/SCHEMA_ prompt
//                    section for the backticked id, joined to the stage(s)
//                    STAGE_SCHEMA_MAP routes that section to. Graded WITH its
//                    stage: named at `shell` is one stage after the rules are
//                    written, and the seat that matters is `game-rulebook`.
//   gated          — a reader scan of the floor sources (validation.js,
//                    validate.mjs — comment-stripped by the caller) for the
//                    declaration surface's own key: does a floor read the
//                    declaration back?
//   transport-real — a walk of EVERY vm-evaluated STRUCTURED_SCHEMA_* at the
//                    declared path: does a structured transport carry the
//                    surface, and is the closed choice enum-constrained there
//                    (the F04 class)? A surface no schema carries grades NO
//                    with the unforced stage named — this column used to walk
//                    the spine alone and grade everything else `unknown`,
//                    which is an audit reporting its own blind spot as the
//                    shelf's ambiguity (DR-44).
//
// HONESTY CAVEATS, stated here because the page repeats them: a text hit
// proves an id is NAMED at a stage, not taught-with-a-reason — reading the
// section is the check no scan performs. A reader scan proves a floor source
// mentions the key on a code line, not that the floor blocks — the floors
// harness owns that proof. Both scans are presence instruments, and the page
// labels them as such.
//
// Inputs that live outside contracts/ (the atom scan, the prompt routing, the
// floor sources, the renderer's map registry) are PARAMETERS passed in by
// scripts/gen-reference.mjs — this module stays free of fs and renderer
// imports, per the same reasoning as the file header's.

var SOLVER_EXPORTS = Object.keys(PUZZLE_SOLVERS)
  .filter(function (k) { return typeof PUZZLE_SOLVERS[k] === 'function'; })
  .sort();
var SOLVER_BUDGET_KEYS = Object.keys(PUZZLE_SOLVERS.PUZZLE_SOLVER_BUDGETS);

// Name normalization for the puzzle/geometry lookups. `point-to-point` is the
// one key whose guardrail group is not its camelization; the alias is a
// derivation spec, existence-checked below, never a verdict.
var GUARDRAIL_KEY_BY_MAP_TYPE = { 'point-to-point': 'ptp' };

function camelKind(kind) {
  return String(kind).replace(/-(\w)/g, function (m, c) { return c.toUpperCase(); });
}
function pascalKind(kind) {
  return String(kind).replace(/(?:^|-)(\w)/g, function (m, c) { return c.toUpperCase(); });
}

function requireEvidence(evidence, key) {
  var v = evidence ? evidence[key] : null;
  var empty = v == null
    || (Array.isArray(v) && !v.length)
    || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
  if (empty) {
    throw new Error('buildArsenalAudit: evidence.' + key + ' is missing or empty — '
      + 'an audit over vacuous evidence reports a pass forever; fix the caller, never default');
  }
  return v;
}

/** Every evaluated prompt section whose text names the backticked id, with its
 *  routed stage(s). Sorted for determinism; a section with no stage row is
 *  reported as builder-routed rather than dropped. */
function scanTaught(id, evidence) {
  var needle = '`' + id + '`';
  var hits = [];
  Object.keys(evidence.sectionTexts).sort().forEach(function (name) {
    if (String(evidence.sectionTexts[name]).indexOf(needle) === -1) return;
    var stages = evidence.sectionStages[name];
    hits.push({ section: name, stages: Array.isArray(stages) ? stages.slice() : [] });
  });
  return hits;
}

var TAUGHT_HIT_CAP = 4;

function taughtText(hits) {
  var shown = hits.slice(0, TAUGHT_HIT_CAP).map(function (h) {
    return h.section + ' → ' + (h.stages.length ? h.stages.join('/') : '(builder-routed, no stage row)');
  });
  var more = hits.length - shown.length;
  return shown.join(' · ') + (more > 0 ? ' (+' + more + ' more sections)' : '');
}

function gradeRenderable(entry, evidence) {
  if (entry.tier === 'excluded-physical') {
    return { v: 'na', text: 'excluded — see the ruling column' };
  }
  if (entry.tier === 'needs-new-primitive') {
    return { v: 'no', text: 'NO — blocked on a primitive (see the build queue)' };
  }
  if (entry.tier === 'implemented') {
    var dead = entry.atoms.filter(function (a) {
      return evidence.liveAtoms.indexOf(a) === -1;
    });
    return dead.length
      ? { v: 'no', text: 'NO — bound atoms not live: ' + dead.join(', ') }
      : { v: 'yes', text: 'yes — ' + entry.atoms.join(' + ') + ' (live)' };
  }
  return { v: 'na', text: 'pattern — no atom of its own; wires systems that already print' };
}

function gradePlayable(entry) {
  if (entry.law) {
    return { v: 'no', text: 'NO — excluded by `' + entry.law + '`' };
  }
  if (entry.tier === 'needs-new-primitive') {
    return { v: 'yes', text: 'pencil-only by shelf admission; nothing printable to prove yet' };
  }
  var text = 'yes — pencil-only by shelf admission';
  if (LUDIC_ARSENAL_ENTRIES.indexOf(entry.id) !== -1) {
    text += '; machine-solved (' + SOLVER_EXPORTS.length
      + ' solvers/verifiers in puzzle-solvers.mjs, budget-exceeded refuses — D132)';
  }
  if (entry.locks && entry.locks.indexOf('Chance isolation') !== -1) {
    text += '; chance-isolated (D37, stated in its own locks)';
  }
  return { v: 'yes', text: text };
}

function gradeTaught(entry, evidence) {
  var hits = scanTaught(entry.id, evidence);
  if (!hits.length) {
    return { v: 'no', atRulebook: false, hits: hits, text: 'NO — not named in any prompt section' };
  }
  var atRulebook = hits.some(function (h) { return h.stages.indexOf('game-rulebook') !== -1; });
  return { v: atRulebook ? 'yes' : 'partial', atRulebook: atRulebook, hits: hits, text: taughtText(hits) };
}

/** The key a floor would have to mention to be reading this declaration back.
 *  A parenthetical backtick on the surface (`seal:`, `cross-reference`) wins;
 *  otherwise the path's terminal segment. */
function declarationNeedle(entry) {
  var paren = /\(([^)]*)\)/.exec(entry.surface || '');
  if (paren) {
    var tick = /`([^`]+)`/.exec(paren[1]);
    if (tick) return tick[1];
  }
  var clean = String(entry.surface || '').replace(/\s*\(.*$/, '');
  var segs = clean.split('.');
  return segs[segs.length - 1].replace(/\[\]$/, '');
}

function gradeGated(entry, evidence) {
  if (entry.tier === 'excluded-physical') return { v: 'na', text: '—' };
  if (entry.tier === 'needs-new-primitive') {
    return { v: 'no', text: 'no — nothing declarable yet' };
  }
  if (entry.tier === 'implemented') {
    var v = evidence.floorSources['public/generator/modules/validation.js'] || '';
    if (v.indexOf('playSpine.composition[') === -1 || v.indexOf('LUDIC_LIBRARY') === -1) {
      return { v: 'unknown', text: 'unknown — the composition floor was not found in validation.js' };
    }
    var text = 'yes — composition floors (validation.js): entry enum-gated against '
      + 'LUDIC_LIBRARY, arity/distinctness/role floored';
    if (LUDIC_ARSENAL_ENTRIES.indexOf(entry.id) !== -1
        && v.indexOf('playSpine.composition declares') !== -1) {
      text += '; a declared implement is scheduled onto a week that blocks without it';
    }
    return { v: 'yes', text: text };
  }
  if (!entry.wired) {
    return { v: 'no', text: 'no — queued: no declaration surface to read back' };
  }
  var needle = declarationNeedle(entry);
  var readers = Object.keys(evidence.floorSources).sort().filter(function (p) {
    return evidence.floorSources[p].indexOf(needle) !== -1;
  });
  return readers.length
    ? { v: 'yes', text: 'yes — `' + needle + '` read by ' + readers.join(' + ') }
    : { v: 'unknown', text: 'unknown — no reader of `' + needle + '` found in the scanned floor sources' };
}

function collectSubtreeEnumKeys(node, keyName, out) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node.enum) && keyName) out.push(keyName);
  var props = node.properties || {};
  Object.keys(props).sort().forEach(function (k) {
    collectSubtreeEnumKeys(props[k], k, out);
  });
  if (node.items) collectSubtreeEnumKeys(node.items, keyName, out);
  return out;
}

/** Walk a JSON-Schema node down a dotted path whose array levels carry `[]`.
 *  Returns null the moment a segment does not exist. */
function walkSchemaPath(root, segs) {
  var node = root;
  for (var i = 0; i < segs.length; i++) {
    var isArr = /\[\]$/.test(segs[i]);
    var key = segs[i].replace(/\[\]$/, '');
    node = node && node.properties ? node.properties[key] : null;
    if (isArr) node = node && node.items ? node.items : null;
    if (!node) return null;
  }
  return node;
}

/** The grade for a node the walk FOUND, shared by the spine walk and the
 *  whole-roster walk so one surface is never graded by two rules. */
function gradeFoundNode(node) {
  if (Array.isArray(node.enum)) {
    return { v: 'yes', text: 'YES — enum-constrained on the transport (' + node.enum.length + ' values)' };
  }
  var enumKeys = collectSubtreeEnumKeys(node, null, []);
  return enumKeys.length
    ? { v: 'carried', text: 'carried — shape on the transport; enum on ' + enumKeys.map(function (k) { return '`' + k + '`'; }).join(', ') }
    : { v: 'carried', text: 'carried — field on the transport, no enum (the floor is the enforcement)' };
}

// How many unforced stage labels the NO reason quotes before it stops listing.
var UNFORCED_STAGE_CAP = 4;

function gradeTransport(entry, evidence) {
  if (entry.tier === 'excluded-physical' || entry.tier === 'needs-new-primitive') {
    return { v: 'na', text: '—' };
  }
  if (!entry.surface) return { v: 'no', text: 'no — no declaration surface' };
  var clean = String(entry.surface).replace(/\s*\(.*$/, '');
  var prefix = 'meta.playSpine.';
  if (clean.indexOf(prefix) !== 0) {
    // ── OFF-SPINE SURFACES (DR-44) ─────────────────────────────────────────
    // This used to grade `unknown — outside the spine transport this audit
    // walks`, which is the audit reporting its own blind spot as the shelf's
    // ambiguity. A surface declared elsewhere is walked against EVERY
    // structured stage schema the repo defines, and the honest answer when
    // none carries it is NO — with the reason, because "no schema has it" and
    // "the stage that writes it forces no schema at all" are different
    // findings and only the second is actionable.
    //
    // TWO READINGS OF THE PATH, deliberately. A stage schema may be rooted at
    // the BOOK (properties.weeks[]…) or at the stage's own UNIT (the week
    // object itself, properties.fieldOps…). Both are walked so a future
    // unit-rooted week schema grades YES the day it lands rather than
    // reporting a false NO that someone has to debug.
    var segs = clean.split('.');
    var roster = evidence.transportSchemas || {};
    var names = Object.keys(roster).sort();
    for (var n = 0; n < names.length; n++) {
      var found = walkSchemaPath(roster[names[n]], segs)
        || (segs.length > 1 ? walkSchemaPath(roster[names[n]], segs.slice(1)) : null);
      if (found) return gradeFoundNode(found);
    }
    var unforced = (evidence.unforcedStages || []).slice(0, UNFORCED_STAGE_CAP);
    var more = (evidence.unforcedStages || []).length - unforced.length;
    return {
      v: 'no',
      text: 'NO — declared at `' + clean + '`, and none of the ' + names.length
        + ' structured stage schemas carries it. The stages that write outside the spine run '
        + 'UNFORCED (`schema: null`): ' + unforced.join(', ')
        + (more > 0 ? ' (+' + more + ' more)' : '')
        + ' — freeform text plus repair extraction, so this surface has no wire contract at all.'
    };
  }
  var node = walkSchemaPath(evidence.spineSchema, clean.slice(prefix.length).split('.'));
  if (!node) {
    return { v: 'no', text: 'NO — the structured transport does not carry `' + clean + '`' };
  }
  // The implemented tier all declares at `composition[].entry`, and the only
  // honest grade for a CLOSED shelf on that field is an enum. A merely
  // "carried" string means the acceptance set never reaches the wire — D217's
  // F04 finding — so the sentence is kept rather than deleted with the defect:
  // strip the enum and this row re-earns it out loud instead of quietly
  // downgrading to "carried".
  if (entry.tier === 'implemented' && !Array.isArray(node.enum)) {
    return {
      v: 'no',
      text: 'NO — `composition[].entry` is a bare string on the transport; the acceptance set '
        + '(LUDIC_LIBRARY) never reaches it. The F04 class.'
    };
  }
  return gradeFoundNode(node);
}

/**
 * buildArsenalAudit(evidence) -> { entries, composable, rulebookSeat,
 *                                  geometries, puzzles }
 *
 * Pure: a function of this registry, the contracts imported above, and the
 * evidence parameters. Throws on vacuous evidence rather than grading air.
 *
 * evidence:
 *   liveAtoms     string[]                       atoms/ scan minus the D6 quarantine
 *   sectionTexts  { section: text }              evaluated INST_/SCHEMA_ sections
 *   sectionStages { section: stage[] }           STAGE_SCHEMA_MAP, text-parsed
 *   spineSchema   object                         evaluated STRUCTURED_SCHEMA_PLAY_SPINE
 *   floorSources  { relPath: text }              comment-stripped floor sources
 *   mapRegistry   { family: {label, sourceType} } renderer MAP_FAMILY_REGISTRY, parsed
 */
export function buildArsenalAudit(evidence) {
  ['liveAtoms', 'sectionTexts', 'sectionStages', 'spineSchema', 'floorSources', 'mapRegistry']
    .forEach(function (key) { requireEvidence(evidence, key); });
  if (!evidence.spineSchema.properties) {
    throw new Error('buildArsenalAudit: evidence.spineSchema has no properties — '
      + 'the transport walk would report every surface missing');
  }

  var entries = LUDIC_LIBRARY_REGISTRY.map(function (entry) {
    return {
      id: entry.id,
      label: entry.label,
      tier: entry.tier,
      wired: entry.wired,
      surface: entry.surface,
      law: entry.law,
      note: entry.note,
      renderable: gradeRenderable(entry, evidence),
      playable: gradePlayable(entry),
      taught: gradeTaught(entry, evidence),
      gated: gradeGated(entry, evidence),
      transport: gradeTransport(entry, evidence)
    };
  });

  // The composable shelf: what a book can actually name today — the
  // implemented systems plus the wired patterns. The rulebook-seat verdict is
  // measured over exactly this set, because these are the implements the
  // stage that designs the game would need to be shown.
  var composable = entries.filter(function (e) {
    return e.tier === 'implemented'
      || (e.tier === 'promotable-with-existing-atoms' && e.wired);
  });
  var rulebookSeat = {
    stage: 'game-rulebook',
    taught: composable.filter(function (e) { return e.taught.atRulebook; })
      .map(function (e) { return e.id; }),
    total: composable.length
  };

  var geometries = VALID_MAP_TYPES.map(function (type) {
    var family = Object.keys(evidence.mapRegistry).filter(function (f) {
      return evidence.mapRegistry[f].sourceType === type;
    })[0];
    if (!family) {
      throw new Error('buildArsenalAudit: no map family claims sourceType "' + type
        + '" — the geometry table would grade a board nobody draws');
    }
    var gk = GUARDRAIL_KEY_BY_MAP_TYPE[type] || camelKind(type);
    var rail = SPATIAL_GUARDRAILS[gk];
    var hits = scanTaught(type, evidence);
    return {
      type: type,
      family: family,
      label: evidence.mapRegistry[family].label || family,
      renderable: 'yes — family `' + family + '` in the renderer registry',
      taught: hits.length ? taughtText(hits) : 'NO — not named in any prompt section',
      taughtHits: hits,
      guardrails: rail
        ? 'yes — `SPATIAL_GUARDRAILS.' + gk + '` (' + Object.keys(rail).length + ' keys)'
        : 'NONE'
    };
  });

  var puzzles = VALID_CONSTRAINED_GRID_KINDS
    .map(function (k) { return { kind: k, atom: 'constrained-grid' }; })
    .concat(VALID_WORD_GRID_KINDS.map(function (k) { return { kind: k, atom: 'word-grid' }; }))
    .map(function (row) {
      // Case-insensitive match: export style capitalizes internal words the
      // kind's hyphenation cannot predict (`kenken` -> solveKenKen), so the
      // candidate is compared flattened. The first emitted page shipped
      // "NONE — no solver export matches" for kenken while solveKenKen
      // existed — the audit lying in the damning direction.
      var flat = String(row.kind).replace(/-/g, '').toLowerCase();
      var solver = SOLVER_EXPORTS.filter(function (n) {
        var ln = n.toLowerCase();
        return ln === 'solve' + flat || ln === 'verify' + flat;
      })[0] || null;
      var budgets = SOLVER_BUDGET_KEYS.filter(function (b) {
        return b.indexOf(camelKind(row.kind)) === 0;
      });
      var gk = camelKind(row.kind);
      return {
        kind: row.kind,
        atom: row.atom,
        solver: solver ? '`' + solver + '()`' : 'NONE — no solver export matches',
        solverOk: !!solver,
        budgets: budgets.length ? budgets.map(function (b) { return '`' + b + '`'; }).join(' ') : 'none named',
        guardrail: SPATIAL_GUARDRAILS[gk] ? '`SPATIAL_GUARDRAILS.' + gk + '`' : 'NONE'
      };
    });

  return {
    entries: entries,
    composable: composable.map(function (e) { return e.id; }),
    rulebookSeat: rulebookSeat,
    geometries: geometries,
    puzzles: puzzles
  };
}

/**
 * buildArsenalDigest() -> string
 *
 * The compressed shelf, in the D144 Inputs/Process/Outputs/Locks form, one
 * line per implement — COMPILED from the registry, never research prose. This
 * is what the rulebook seat will be taught from (Wave 2 quotes it into the
 * `game-rulebook` prompt): the systems a composition can name and the wired
 * patterns a spine can declare, each with what it gives and what locks it.
 * Pure function of the registry; the published page prints it verbatim so the
 * author reads exactly what the model will.
 */
export function buildArsenalDigest() {
  var lines = [];
  lines.push('THE IMPLEMENTED SYSTEMS — the composition menu. '
    + 'Each line: what feeds it, what it does, what it yields, what locks it.');
  ludicEntriesByTier('implemented').forEach(function (e) {
    lines.push('- `' + e.id + '` (' + e.label + ') — IN: ' + e.inputs
      + ' DOES: ' + e.process + ' GIVES: ' + e.outputs + ' LOCKS: ' + e.locks);
  });
  lines.push('');
  lines.push('THE WIRED PATTERNS — the harvest menu. '
    + 'Declared on the surface each line names; a floor reads every declaration back.');
  ludicEntriesByTier('promotable-with-existing-atoms')
    .filter(function (e) { return e.wired; })
    .forEach(function (e) {
      lines.push('- `' + e.id + '` (declare: `' + e.surface + '`) — GIVES: '
        + e.outputs + ' LOCKS: ' + e.locks);
    });
  return lines.join('\n');
}
