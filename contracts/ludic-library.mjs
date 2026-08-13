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
  LUDIC_LIBRARY_ATOMS
} from './contract-constants.mjs';

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
  // implemented shelf. What stayed is the INTERLOCKING half, and the reason is
  // again the solver: verifying a board that already exists is a scan, while
  // proving a crisscross or a crossword is fillable-and-unique is a
  // constraint-satisfaction problem over a dictionary this engine does not
  // ship and would have to be brief-blind to use.
  {
    id: 'interlocking-word-grid', label: 'Interlocking word grids (crisscross, dense crossword)',
    inputs: 'A word list and a blank interlocking skeleton with numbered entries.',
    process: 'The player writes words into a shape whose crossings constrain each other; the marked squares spell the answer.',
    outputs: 'A word or letter string the seal wants.',
    locks: 'The crossings are the lock. Nothing ships unless a solver proves the skeleton admits exactly one filling from the printed list.',
    needs: 'A crossing solver plus a blank-skeleton print surface, which is a different geometry from the word board word-grid.js draws. DEFERRED BY RULING at W5b (crisscross was licensed "only if it lands clean"; it did not — the print surface and the uniqueness proof are both new work, not a variant of the search). Dense crossword construction stays out entirely per the waves plan.'
  },
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
