// ── The simulated player (Wave 4b · PLAY.md §4.4 · VISION §4.5) ─────────────
//
// A deterministic harness — no LLM, no DOM, no dice — that plays a generated
// book before it ships. It answers the question the closure floors cannot:
// W4a's floors hold the PLAN to itself (does the declaration wire up?); this
// walks the PRINTED BOOK against that plan and asks whether a real player,
// at realistic adherence, can actually reach the end.
//
// WHY THIS FILE IS DEPENDENCY-LIGHT AND BROWSER-IMPORTABLE. VISION §4.5: "the
// sim needs no DOM, so it runs in all three doors — in the guided door its
// findings become one more prompt to ferry." That is a hard constraint, not a
// preference: a walker that could only run in Node would be absent from two of
// the three paths a book can be born on. It therefore imports only the ref
// GRAMMAR seam (contract-constants, via constants.js — that file's own comment
// names this module as its consumer) and one string normalizer. It must never
// import validation.js: validation.js imports THIS, and the cycle would be a
// load-order bug that only shows up in one of the three doors.
//
// ════════════════════════════════════════════════════════════════════════════
// WHAT THE SIM CAN HONESTLY WALK — read this before adding an assertion
// ════════════════════════════════════════════════════════════════════════════
// Two coupled models, and the difference between them is why the assertions
// are shaped the way they are.
//
// 1. THE TICK ECONOMY (numeric, exact). session.markStrip.targets is a real
//    count, week.reckoning.threshold is a real integer, and adherence is a
//    fraction of sessions. Arithmetic all the way down.
//
// 2. THE GATE GRAPH (structural + TEMPORAL, never numeric). The spine's
//    economyGraph names edges but carries NO AMOUNTS: `currency` is a string
//    ("Relief"), never a price. There is no field anywhere in schema 1.5.0
//    that says what a spend COSTS. So the sim can never answer "can the player
//    afford this"; it answers "can the player HOLD this, and BY WHEN" — which
//    is the question soft-locks are actually made of. Every reachability
//    statement below is a statement about WEEKS, not about money.
//
// The consequence for spend policy is stated here so nobody re-derives it as a
// bug: stingy vs greedy cannot be a BUDGET difference (no prices exist). It is
// a SCHEDULING difference — greedy takes every affordance the week it opens,
// stingy defers each one to the last week that still meets its deadline — and
// the spread between the two schedules is measured in weeks. A book where
// every node has spread 0 is a book where the policy choice is immaterial,
// which is a real and reportable finding.
//
// ════════════════════════════════════════════════════════════════════════════
// THE DETERMINISM ARGUMENT (why a dice-free walker is sound)
// ════════════════════════════════════════════════════════════════════════════
// Two standing laws make the walk deterministic rather than statistical:
//
//   CHANCE ISOLATION (D37) — dice resolve rewards and story, never sets, reps,
//   load, or rest. So a die roll can never change how much WORK a session is,
//   and therefore never changes what a session pays into the economy.
//
//   FAILURE-ONLY-ADDS — a missed roll still feeds intel. So no roll can
//   SUBTRACT from the player's position.
//
// Together: progress is MONOTONE in completed sessions, and dice feed only
// ambient bonuses on top of a guaranteed floor. Therefore every reachability
// assertion computes on GUARANTEED flows alone — session ticks, reckoning
// conversions, keystone reveals, door-gated grants. Dice-fed pools count
// toward the stingy/greedy SPREAD report and never toward reachability, and
// **a boss threshold or ending reachable only through lucky rolls is a
// soft-lock by definition** (orchestrator ruling, W4b). That is not
// conservatism: a book that requires a good roll to be finishable is a book
// that is sometimes unfinishable, and the player finds out in week six.
//
// ════════════════════════════════════════════════════════════════════════════
// THE ADVERSARY (why the bands are exact, not sampled)
// ════════════════════════════════════════════════════════════════════════════
// A band of 60% does not mean "a typical player who missed 40%". It means the
// WORST pattern of misses that still completes 60% of sessions. The brief
// allowed three canonical patterns (miss-earliest / miss-latest / miss-peak)
// as a sampling compromise; this ships the EXACT adversary instead, because
// for this class of constraint the optimum is closed-form:
//
//   Every hard assertion is a PREFIX-SUM constraint — "by the end of week w,
//   are there at least T ticks?" To minimise a prefix sum with a fixed budget
//   of M misses, drop the M highest-value sessions from inside that prefix.
//   Exchange argument: moving a miss from outside the prefix to inside never
//   raises the prefix sum, and swapping a dropped session for a higher-valued
//   one inside the prefix never raises it either. So the greedy choice IS the
//   minimum, per constraint, in O(n log n).
//
// Each constraint is evaluated against ITS OWN optimal adversary, which is
// correct because a soft-lock exists if ANY miss pattern produces it — the
// patterns do not have to be simultaneously realisable by one player.
//
// ════════════════════════════════════════════════════════════════════════════
// THE DOOR BRANCH — underspecified in W4b, attributable since W5a
// ════════════════════════════════════════════════════════════════════════════
// W4b's brief ruled: walk every door-branch combination exhaustively. On
// contact that was VACUOUS. `doorChoice` carried `optionA`/`optionB` with a
// label and a `lean` STRING and nothing else; no field anywhere attributed an
// economy edge to a branch. Enumerating 4096 combinations of a choice with no
// machine-readable payload is 4096 identical walks. The correction shipped
// instead: an edge whose `from` is `door:Wn` is BRANCH-CONTINGENT, reachability
// is computed on the guaranteed subgraph, and a required node that needs a door
// edge is reported as a named UNDERSPECIFICATION. The note ended: "true
// per-branch simulation needs per-branch edge attribution in the schema. That
// is a product decision and is escalated, not taken here."
//
// W5a took it. `economyGraph[].branch` names a side (`door:W3/A`), and this
// walker consumes it when present:
//
//   NO ATTRIBUTION  — unchanged. The guaranteed subgraph decides, and a target
//     that needs a door edge is the underspecification finding it always was.
//   ATTRIBUTION     — a real per-branch walk. One reachability pass per
//     assignment of a side to every attributed door; a target reachable under
//     EVERY assignment is safe even though no guaranteed path exists, and a
//     target that dies under some assignment is a soft-lock with the branch
//     NAMED. That last case is the one the whole feature exists for: "the
//     player who picks the other side loses the endgame" becomes "the player
//     who takes door:W3/B loses ending:E2".
//
// UNATTRIBUTED DOOR EDGES ARE EXCLUDED FROM EVERY PER-BRANCH WALK, in books
// that attribute anything. They cannot be placed on a side, so counting them
// would let a half-attributed spine buy a clean verdict with the half it did
// not declare. They still feed the old underspecification finding.
//
// THE ENUMERATION CAP is honest rather than heroic. 2^d assignments over d
// attributed doors is free at d ≤ 10 and the graph is tiny, but the exact
// question ("is there an assignment under which this target dies") is
// monotone-CNF minimisation and has no cheap closed form. Past the cap the walk
// falls back to per-door probing — each door forced to one side while every
// other attributed door contributes both — which catches single-door failures
// and can MISS a failure that needs two doors to collude. The report says so in
// a measurement rather than pretending to completeness.

import {
  parseSurfaceRef, parseBranchRef, BRANCH_OPTIONS, RECKONING_THRESHOLD_RATIO,
  applyRulebookAmendments
} from './constants.js';
import { toSlugWords } from './assembly.js';

// The three adherence bands, from VISION §4.5. Ordered strictest-last so a
// report reads "held at 100, held at 80, LOST at 60".
export var SIM_ADHERENCE_BANDS = [
  { id: 'full', label: '100%', fraction: 1 },
  { id: 'most', label: '80%', fraction: 0.8 },
  { id: 'realistic', label: '60%', fraction: 0.6 }
];

// The band every HARD assertion is judged at. 60% is the floor VISION names —
// "a lifter who missed two sessions must never discover in the final week that
// the ending has been mathematically unreachable since week three."
export var SIM_HARD_BAND = 'realistic';

export var SIM_SPEND_POLICIES = ['stingy', 'greedy'];

// 2^10 = 1024 assignments. See the branch note in the header: past this the
// walk probes doors one at a time and says so.
export var SIM_BRANCH_ASSIGNMENT_CAP = 10;

// A week's worth of decisions below this is a week that asks the player
// nothing. Per-WEEK only: see the density section for why the per-session
// floor is a measurement rather than a gate in schema 1.5.0.
export var SIM_DECISION_FLOOR_PER_WEEK = 1;

// Ref kinds that ORIGINATE value: the player's own work entering the economy.
// Mirrors validation.js SPINE_SOURCE_KINDS deliberately — that one gates the
// DECLARATION at the skeleton, this one gates the WALK on the printed book,
// and unifying them would put a booklet walker inside a grammar check.
var SIM_SOURCE_KINDS = { markStrip: 1, session: 1, week: 1 };

// Ref kinds that CONVERT value rather than offer it. The weekly reckoning is
// the book's own arithmetic: it happens whether the player wants it to or not,
// it takes no side, and it refuses nothing. It is therefore neither a source
// (it originates no value — the marks did) nor a spend (nothing is chosen).
//
// WHY THIS TABLE EXISTS AT ALL, and it is a defect R1 exposed rather than
// created: before the declaration-literal income law, a spine declared ONE
// representative conversion edge, so exactly one `reckoning:` node existed in
// the graph and the miscategorisation below cost one phantom decision in one
// week — invisible. Under the law every printing week declares its own income
// edge, so every week gained a `reckoning:Wn` node, and the miscategorisation
// became a phantom decision in EVERY week: the per-week decision floor could
// no longer fire on any book, and the spend-window report counted six
// conversions as six things to decide. A "spend surface" that every book has
// in every week is the D100 anti-vacuity failure exactly — a needle matching
// everything looks like a working floor from one side and can never fire.
var SIM_CONVERSION_KINDS = { reckoning: 1 };

// The endgame: what a book must be able to finish. Nothing else is "required",
// because a book is allowed to have optional content the player never reaches.
var SIM_ENDGAME_KINDS = { ending: 1, boss: 1, assembly: 1, seal: 1 };

// Losable pressure. A tension budget that declares something losable in week 4
// wants a surface in week 4 that can actually take it away.
var SIM_LOSABLE_CLOCK_TYPES = { 'danger-clock': 1, 'racing-clock': 1, 'tug-of-war-clock': 1 };

var INFINITY_WEEK = Number.POSITIVE_INFINITY;

// ── Node identity ───────────────────────────────────────────────────────────
// Canonical key for a surface ref. Slugged, so `clock:Relief Ledger` and
// `clock: relief  ledger` are one node — the ref grammar accepts both and a
// graph that treated them as two would report a phantom orphan.
function nodeKey(parsed) {
  if (!parsed || !parsed.valid) return '';
  return parsed.id ? parsed.kind + ':' + toSlugWords(parsed.id) : parsed.kind;
}

function refWeek(parsed) {
  var m = /^w\s*(\d+)/i.exec(String((parsed && parsed.id) || '').trim());
  return m ? parseInt(m[1], 10) : null;
}

function asArray(value) { return Array.isArray(value) ? value : []; }

// ════════════════════════════════════════════════════════════════════════════
// PART 1 — the printed book, read once
// ════════════════════════════════════════════════════════════════════════════

/**
 * readBook(booklet) -> { weeks, sessions, printWeek, ... }
 *
 * Everything the walk needs about what is actually ON the page, gathered in
 * one pass. `printWeek` is the map that makes the whole thing temporal: for
 * every surface the book draws, the earliest week the player can see it.
 */
function readBook(booklet) {
  var doc = booklet || {};
  var weeks = asArray(doc.weeks);
  var printWeek = {};       // nodeKey -> earliest week the surface appears
  var sessions = [];        // { week, session, ticks } in play order
  var perWeek = [];         // per-week rollup

  // A singleton (`boss`, `banked`) is noted with an empty id and keys on its
  // kind alone. A label that slugs away to nothing — punctuation, a dash — is
  // not a name and is dropped rather than folded into the singleton key.
  function note(kind, id, week) {
    var slug = toSlugWords(String(id == null ? '' : id));
    if (id && !slug) return;
    var key = slug ? kind + ':' + slug : kind;
    if (printWeek[key] === undefined || week < printWeek[key]) printWeek[key] = week;
  }

  var bossWeek = null;
  var threshold = null;

  weeks.forEach(function (week, wi) {
    var w = week || {};
    var n = Number(w.weekNumber);
    if (!Number.isFinite(n) || n < 1) n = wi + 1;

    note('week', 'W' + n, n);
    note('reckoning', 'W' + n, n);
    note('markStrip', 'W' + n, n);

    var weekSessions = asArray(w.sessions);
    var weekTicks = 0;
    weekSessions.forEach(function (session, si) {
      var s = session || {};
      var num = Number(s.sessionNumber) || (si + 1);
      // The tick economy's only input. A session with no markStrip pays
      // nothing — which is a real state (pre-D89 books) and reads as zero
      // rather than as an error, because the strip's presence is the mark
      // economy's floor to enforce, not the sim's.
      var ticks = asArray((s.markStrip || {}).targets).length;
      weekTicks += ticks;
      note('session', 'W' + n + '.' + num, n);
      note('markStrip', 'W' + n + '.' + num, n);
      sessions.push({
        week: n, session: num, ticks: ticks,
        hasBinaryChoice: !!s.binaryChoice,
        fragmentRef: s.fragmentRef ? String(s.fragmentRef) : ''
      });
      if (s.fragmentRef) {
        note('fragment', String(s.fragmentRef), n);
        note('seal', String(s.fragmentRef), n);
      }
    });

    var fo = w.fieldOps || {};
    if (fo.oracleTable || fo.oracle) note('oracle', 'W' + n, n);
    if (fo.cipher) note('cipher', 'W' + n, n);
    if (w.doorChoice) note('door', 'W' + n, n);
    asArray(w.gameplayClocks).forEach(function (clock) {
      if (clock && clock.clockName) note('clock', clock.clockName, n);
    });
    var mapState = fo.mapState || {};
    if (mapState.title) note('map', mapState.title, n);
    if (mapState.title || asArray(mapState.nodes).length) note('map', 'W' + n, n);
    asArray(mapState.nodes).forEach(function (node) {
      if (!node) return;
      if (node.label) note('map', node.label, n);
      if (node.id) note('map', node.id, n);
    });
    asArray(mapState.tiles).forEach(function (tile) { if (tile && tile.label) note('map', tile.label, n); });
    function noteCompanions(pool) {
      asArray(pool).forEach(function (c) {
        if (!c) return;
        ['title', 'label', 'statName', 'type'].forEach(function (f) { if (c[f]) note('companion', c[f], n); });
      });
    }
    noteCompanions(fo.companionComponents);
    if (w.interlude && w.interlude.payload) noteCompanions(w.interlude.payload.companionComponents);
    if (w.overflowDocument && w.overflowDocument.id) note('fragment', w.overflowDocument.id, n);

    if (w.isBossWeek || w.bossEncounter) {
      bossWeek = bossWeek === null ? n : Math.min(bossWeek, n);
      note('boss', '', n);
      note('assembly', '', n);
    }
    var reck = w.reckoning || {};
    if (Number.isInteger(reck.threshold)) {
      threshold = { week: n, value: reck.threshold };
    }

    perWeek.push({
      week: n,
      ticks: weekTicks,
      sessions: weekSessions.length,
      hasDoor: !!w.doorChoice,
      binaryChoices: weekSessions.filter(function (s) { return s && s.binaryChoice; }).length,
      clocks: asArray(w.gameplayClocks).map(function (c) {
        return {
          name: String((c || {}).clockName || ''),
          type: String((c || {}).clockType || ''),
          losable: !!SIM_LOSABLE_CLOCK_TYPES[String((c || {}).clockType || '')]
            || String((c || {}).direction || '').toLowerCase() === 'down'
            || !!(c || {}).consequenceOnFull
        };
      }),
      componentValue: ((w.weeklyComponent || {}).value === undefined
        || (w.weeklyComponent || {}).value === null
        || String((w.weeklyComponent || {}).value).trim() === '')
        ? null : String(w.weeklyComponent.value),
      isBoss: !!(w.isBossWeek || w.bossEncounter)
    });
  });

  // The book's own surfaces that live outside the week loop.
  asArray(doc.fragments).forEach(function (fragment) {
    if (!fragment || !fragment.id) return;
    // A fragment the player never meets in a session is still printed; the
    // registry order is the only ordering the book has for it, so it defaults
    // to the last week rather than the first. Handing it earlier is what
    // session.fragmentRef does above (note() keeps the minimum).
    var fallback = perWeek.length || 1;
    note('fragment', fragment.id, fallback);
    if (fragment.title) note('fragment', fragment.title, fallback);
    if (fragment.seal) note('seal', fragment.id, printWeek['fragment:' + toSlugWords(fragment.id)] || fallback);
  });

  var endWeek = (perWeek.length || 1) + 1;   // the endgame sits past the last week
  asArray(doc.endings).forEach(function (ending, ei) {
    if (!ending) return;
    note('ending', ending.variant || ('E' + (ei + 1)), endWeek);
    note('ending', 'E' + (ei + 1), endWeek);
  });
  if (printWeek['boss'] === undefined && perWeek.length) note('boss', '', perWeek.length);
  if (printWeek['assembly'] === undefined && perWeek.length) note('assembly', '', perWeek.length);
  // `banked` is the wallet: available from the first week that pays into it.
  if (printWeek['banked'] === undefined) note('banked', '', 1);

  // ── The endgame the book PRINTS ──────────────────────────────────────────
  // Seeded from the booklet, never from the spine's edges, and that direction
  // is the whole point. A node only exists in the graph because some edge
  // named it, so an ending the spine forgot entirely would vanish from the
  // graph and read as "no problem found" — the exact silent pass this walker
  // exists to prevent. The book says what must be reachable; the graph says
  // whether it is.
  //
  // Each target carries ALIASES because an ending is indexed under both its
  // variant and its ordinal (`ending:canonical` and `ending:E1` are one page),
  // and a spine may name either. Reachable by any alias is reachable.
  var endgame = [];
  asArray(doc.endings).forEach(function (ending, ei) {
    if (!ending) return;
    var variant = String(ending.variant || '').trim();
    var aliases = ['ending:' + toSlugWords('E' + (ei + 1))];
    if (variant) aliases.unshift('ending:' + toSlugWords(variant));
    endgame.push({ label: 'ending:' + (variant || ('E' + (ei + 1))), aliases: aliases, printWeek: endWeek });
  });
  if (bossWeek !== null) {
    endgame.push({ label: 'boss', aliases: ['boss'], printWeek: bossWeek });
    endgame.push({ label: 'assembly', aliases: ['assembly'], printWeek: bossWeek });
  }
  var sealed = asArray(doc.fragments).filter(function (f) { return f && f.seal; })
    .map(function (f) {
      var key = 'seal:' + toSlugWords(String(f.id));
      return {
        id: String(f.id),
        key: key,
        printWeek: printWeek[key] === undefined ? (perWeek.length || 1) : printWeek[key],
        keyHint: String((f.seal || {}).keyHint || ''),
        unlockCondition: String((f.seal || {}).unlockCondition || '')
      };
    });
  sealed.forEach(function (s) {
    endgame.push({ label: 'seal:' + s.id, aliases: [s.key], printWeek: s.printWeek });
  });

  return {
    weeks: perWeek,
    weekCount: perWeek.length,
    sessions: sessions,
    totalSessions: sessions.length,
    totalTicks: sessions.reduce(function (a, s) { return a + s.ticks; }, 0),
    printWeek: printWeek,
    bossWeek: bossWeek,
    threshold: threshold,
    endWeek: endWeek,
    endgame: endgame,
    sealedFragments: sealed,
    passwordLength: Number((doc.meta || {}).passwordLength) || null
  };
}

// ════════════════════════════════════════════════════════════════════════════
// PART 2 — the adversary
// ════════════════════════════════════════════════════════════════════════════

/**
 * adversarialTicksByWeek(book, fraction) -> { completed, missed, prefix }
 *
 * `prefix[w]` is the MINIMUM ticks the player can hold at the end of week w
 * across every miss pattern that completes `completed` sessions. Exact, by the
 * exchange argument in the header: drop the M largest-paying sessions inside
 * the prefix.
 *
 * floor(), not round(): a band is a floor on adherence, and rounding 60% of 17
 * sessions UP would grade the book against a player who trained more than the
 * band promises.
 */
export function adversarialTicksByWeek(book, fraction) {
  var total = book.totalSessions;
  var completed = Math.floor(fraction * total);
  var missed = Math.max(0, total - completed);
  var prefix = {};
  var running = [];
  var sum = 0;
  var byWeek = {};
  book.sessions.forEach(function (s) {
    (byWeek[s.week] || (byWeek[s.week] = [])).push(s.ticks);
  });
  for (var w = 1; w <= book.weekCount; w++) {
    (byWeek[w] || []).forEach(function (t) { running.push(t); sum += t; });
    // The M largest inside this prefix. Re-sorted per week rather than kept in
    // a heap: week counts are single digits and a heap here would be cleverness
    // nobody can audit.
    var drop = running.slice().sort(function (a, b) { return b - a; })
      .slice(0, Math.min(missed, running.length))
      .reduce(function (a, t) { return a + t; }, 0);
    prefix[w] = Math.max(0, sum - drop);
  }
  return { completed: completed, missed: missed, prefix: prefix, fraction: fraction };
}

// ════════════════════════════════════════════════════════════════════════════
// PART 3 — the gate graph
// ════════════════════════════════════════════════════════════════════════════

/**
 * buildGateGraph(spine, book) -> { nodes, edges, guaranteed, branch, chance }
 *
 * Edge classification is the whole determinism argument made mechanical:
 *   chance  — `from` is an oracle (the d100 leg). Feeds ambient pools only.
 *   branch  — `from` is a door. Present on one side, unattributed (see header).
 *   guaranteed — everything else: session work, conversions, keystone reveals.
 */
export function buildGateGraph(spine, book) {
  var edges = [];
  var nodes = {};

  function ensure(parsed, printedWeek) {
    var key = nodeKey(parsed);
    if (!key) return null;
    if (!nodes[key]) {
      nodes[key] = {
        key: key,
        kind: parsed.kind,
        id: parsed.id,
        raw: parsed.raw,
        // Where this surface is DRAWN. A node the book never prints has no
        // week; it is still a graph node (the spine named it) and the walk
        // treats it as available wherever its feeders put it.
        printWeek: printedWeek === undefined ? null : printedWeek,
        inGuaranteed: 0, inBranch: 0, inChance: 0, out: 0
      };
    }
    return nodes[key];
  }

  function locate(parsed) {
    var key = nodeKey(parsed);
    var direct = book.printWeek[key];
    if (direct !== undefined) return direct;
    var rw = refWeek(parsed);
    if (rw !== null) return rw;
    return null;
  }

  asArray(spine.economyGraph).forEach(function (edge, ei) {
    var from = parseSurfaceRef((edge || {}).from);
    var to = parseSurfaceRef((edge || {}).to);
    if (!from.valid || !to.valid) return;   // grammar is the W4a floor's job
    var a = ensure(from, locate(from));
    var b = ensure(to, locate(to));
    if (!a || !b) return;
    // W5a: an ATTRIBUTED edge is branch-contingent whatever its source, which
    // is the point of attribution — "taking door:W3/A prices the West Run at 2"
    // is an edge out of `banked`, not out of the door. The door still decides it.
    var branch = parseBranchRef((edge || {}).branch);
    var cls = from.kind === 'oracle'
      ? 'chance'
      : ((from.kind === 'door' || branch.valid) ? 'branch' : 'guaranteed');
    var price = Number.isInteger((edge || {}).price) && edge.price > 0 ? edge.price : 0;
    var closes = Number.isInteger((edge || {}).closesAtWeek) && edge.closesAtWeek > 0
      ? edge.closesAtWeek : null;
    edges.push({
      i: ei, from: a.key, to: b.key, cls: cls,
      currency: String((edge || {}).currency || ''),
      // The door this edge belongs to and the side of it, or '' when the spine
      // did not say. '' is the W4b state and stays legal.
      door: branch.valid ? nodeKey(parseSurfaceRef(branch.doorRef)) : '',
      option: branch.valid ? branch.option : '',
      price: price,
      closesAtWeek: closes
    });
    a.out++;
    b['in' + cls.charAt(0).toUpperCase() + cls.slice(1)]++;
  });

  // Seed every endgame surface the BOOK prints, whether or not an edge named
  // it. An ending with no inbound edge must appear as a node with no feeder —
  // that is the finding — rather than not appearing at all.
  asArray(book.endgame).forEach(function (target) {
    var key = target.aliases[0];
    if (target.aliases.some(function (a) { return nodes[a]; })) return;
    nodes[key] = {
      key: key,
      kind: key.indexOf(':') === -1 ? key : key.slice(0, key.indexOf(':')),
      id: key.indexOf(':') === -1 ? '' : key.slice(key.indexOf(':') + 1),
      raw: target.label,
      printWeek: target.printWeek === undefined ? null : target.printWeek,
      inGuaranteed: 0, inBranch: 0, inChance: 0, out: 0
    };
  });

  return { nodes: nodes, edges: edges };
}

/**
 * earliestHold(graph, classes) -> { key: week }
 *
 * The GREEDY schedule: the first week the player can hold each node, taking
 * every affordance the moment it opens.
 *
 * A node is available at max(when its feeder is available, when the book draws
 * it) — you cannot hold a surface printed in week 5 during week 2, however
 * early you earned it. Source nodes seed at their own printed week; everything
 * else waits for a feeder. Relaxed to fixpoint (a spine graph has tens of
 * edges; |V| passes is free and cycles terminate correctly).
 */
export function earliestHold(graph, classes, allowEdge) {
  var allow = {};
  (classes || ['guaranteed']).forEach(function (c) { allow[c] = 1; });
  var hold = {};
  Object.keys(graph.nodes).forEach(function (key) {
    var node = graph.nodes[key];
    // Only authored work sources seed themselves. A door is contingent but it
    // is not a source: the player can choose a side only after a real incoming
    // edge feeds the door. Branch attribution lives on the outgoing edges.
    hold[key] = SIM_SOURCE_KINDS[node.kind]
      ? (node.printWeek === null ? 1 : node.printWeek)
      : INFINITY_WEEK;
  });
  var passes = Object.keys(graph.nodes).length + 1;
  for (var p = 0; p < passes; p++) {
    var moved = false;
    graph.edges.forEach(function (edge) {
      if (!allow[edge.cls]) return;
      if (allowEdge && !allowEdge(edge)) return;
      var src = hold[edge.from];
      if (src === INFINITY_WEEK) return;
      var target = graph.nodes[edge.to];
      var when = Math.max(src, target.printWeek === null ? src : target.printWeek);
      if (when < hold[edge.to]) { hold[edge.to] = when; moved = true; }
    });
    if (!moved) break;
  }
  return hold;
}

// Classify a topology that begins at an unfed door without pretending the
// player holds that door. Producer gates reject the orphan, while the shared
// simulator retains its long-standing diagnostic taxonomy for direct runtime
// callers that deliberately probe malformed books.
function contingentPathFromDoor(graph, target) {
  var wanted = {};
  asArray(target.aliases).forEach(function (alias) { wanted[alias] = 1; });
  var queue = Object.keys(graph.nodes).filter(function (key) {
    return (graph.nodes[key] || {}).kind === 'door';
  }).map(function (key) { return { key: key, chance: false }; });
  var seen = {};
  while (queue.length) {
    var state = queue.shift();
    var stateKey = state.key + '\u0000' + (state.chance ? '1' : '0');
    if (seen[stateKey]) continue;
    seen[stateKey] = 1;
    if (wanted[state.key]) return { found: true, chance: state.chance };
    graph.edges.forEach(function (edge) {
      if (edge.from !== state.key) return;
      queue.push({ key: edge.to, chance: state.chance || edge.cls === 'chance' });
    });
  }
  return { found: false, chance: false };
}

/**
 * branchWalks(graph) -> { doors, walks, capped }
 *
 * The per-branch walks (W5a). `walks` is one entry per assignment of a side to
 * every attributed door: `{ label, choice, hold }`, where `hold` is the
 * earliest-hold schedule the player gets if they take exactly those sides.
 *
 * An assignment admits: every guaranteed edge, every edge attributed to a door
 * on the chosen side, and NOTHING ELSE from the branch class — unattributed
 * door edges are excluded on purpose (header, "unattributed door edges are
 * excluded"). Chance edges stay out of every walk; a branch is a choice, a roll
 * is not.
 *
 * `doors` empty means the spine attributed nothing, and the caller keeps W4b's
 * behaviour exactly. That is the compatibility promise: a book written before
 * this feature walks identically.
 */
export function branchWalks(graph) {
  var doorSet = {};
  graph.edges.forEach(function (e) { if (e.door) doorSet[e.door] = 1; });
  var doors = Object.keys(doorSet).sort();
  if (!doors.length) return { doors: doors, walks: [], capped: false };

  var capped = doors.length > SIM_BRANCH_ASSIGNMENT_CAP;
  var assignments = [];
  if (!capped) {
    var total = Math.pow(2, doors.length);
    for (var mask = 0; mask < total; mask++) {
      var choice = {};
      for (var d = 0; d < doors.length; d++) {
        choice[doors[d]] = BRANCH_OPTIONS[(mask >> d) & 1];
      }
      assignments.push(choice);
    }
  } else {
    // The fallback: probe one door at a time. Every OTHER attributed door is
    // left unconstrained (both its sides admitted), so a failure that needs two
    // doors to collude is invisible here — reported as `branchWalkCapped`.
    doors.forEach(function (door) {
      BRANCH_OPTIONS.forEach(function (option) {
        var choice = {};
        choice[door] = option;
        assignments.push(choice);
      });
    });
  }

  var walks = assignments.map(function (choice) {
    var hold = earliestHold(graph, ['guaranteed', 'branch'], function (edge) {
      if (edge.cls !== 'branch') return true;
      if (!edge.door) return false;                       // unattributed: no side owns it
      if (choice[edge.door] === undefined) return true;   // unconstrained in the capped probe
      return choice[edge.door] === edge.option;
    });
    var label = Object.keys(choice).sort().map(function (door) {
      return door + '/' + choice[door];
    }).join(' + ');
    return { label: label, choice: choice, hold: hold };
  });
  return { doors: doors, walks: walks, capped: capped };
}

/**
 * latestHold(graph, earliest, book) -> { key: week }
 *
 * The STINGY schedule: the last week the player can acquire each node without
 * missing a deadline the book actually imposes.
 *
 * WHICH DEADLINES ARE REAL, because getting this wrong makes the schedule a
 * no-op that quietly reports a spread on every node. In a pencil book NOTHING
 * EXPIRES — a map region drawn in week 2 is still on the page in week 6 — and
 * nothing has a price. So most surfaces have no deadline at all and their
 * stingy hold is simply the last week of play. Exactly two structures impose a
 * real one, and both come from the book rather than from the spine's wording:
 *
 *   a SEAL — its key must be held STRICTLY BEFORE the sealed page is drawn,
 *     which is the same law the key-after-lock assertion enforces; and
 *   the ENDGAME — boss, assembly, and the endings are drawn at a fixed week,
 *     and a feeder held after that arrives too late to matter.
 *
 * W5a ADDS THE THIRD: a declared `closesAtWeek` on an edge. That was the honest
 * gap in the paragraph above — "nothing expires" was true of the schema, not of
 * play, and it made the stingy schedule float to the last week for almost every
 * node. A declared window pulls its source's deadline in, so hoarding finally
 * costs something and the spread the report measures is a real one.
 *
 * Everything else still floors at the campaign's last week, which remains the
 * honest shape for an affordance the book never closes.
 */
export function latestHold(graph, earliest, book) {
  var lastPlayable = book.weekCount || 1;
  var latest = {};
  Object.keys(graph.nodes).forEach(function (key) {
    var node = graph.nodes[key];
    if (earliest[key] === INFINITY_WEEK) { latest[key] = INFINITY_WEEK; return; }
    latest[key] = (SIM_ENDGAME_KINDS[node.kind] && node.printWeek !== null)
      ? node.printWeek
      : lastPlayable;
  });
  var passes = Object.keys(graph.nodes).length + 1;
  for (var p = 0; p < passes; p++) {
    var moved = false;
    graph.edges.forEach(function (edge) {
      if (edge.cls !== 'guaranteed') return;
      if (latest[edge.to] === INFINITY_WEEK || latest[edge.from] === INFINITY_WEEK) return;
      // A seal's key is due the week BEFORE the seal is printed; every other
      // consumer is content to be fed the same week it is met.
      var due = latest[edge.to] - (graph.nodes[edge.to].kind === 'seal' ? 1 : 0);
      // A declared window is a harder deadline than the consumer's own: the
      // edge cannot be TAKEN after it closes, whatever the thing it feeds is
      // willing to wait for.
      if (edge.closesAtWeek !== null && edge.closesAtWeek !== undefined) {
        due = Math.min(due, edge.closesAtWeek);
      }
      if (due < latest[edge.from]) { latest[edge.from] = due; moved = true; }
    });
    if (!moved) break;
  }
  // A schedule can never be earlier than the earliest possible hold. When the
  // two collide the node has a one-week window, which is the report's way of
  // saying "the book decides this, not the player".
  Object.keys(latest).forEach(function (key) {
    if (latest[key] !== INFINITY_WEEK && latest[key] < earliest[key]) latest[key] = earliest[key];
  });
  return latest;
}

// ════════════════════════════════════════════════════════════════════════════
// PART 4 — the walk
// ════════════════════════════════════════════════════════════════════════════

function finding(code, message, detail) {
  return { code: code, message: message, detail: detail || null };
}

/**
 * simulateBook(booklet) -> report
 *
 * THE SKIP RULE, stated first because it protects the whole sealed corpus: a
 * book with no `meta.playSpine` is SKIPPED with a reason, never failed. Every
 * fixture in content/ predates the spine and the sealed-corpus rule forbids
 * editing them back green; a walker that failed them would be demanding that
 * evidence be rewritten to suit a gate. Generated books carry a spine because
 * the W4a floors block without one, so the skip costs the generation path
 * nothing.
 *
 * Report contract: `hard` are soft-locks (blocking on the generation path);
 * `soft` are quality findings that route to the critic's revision machinery
 * under the ludic reopen scopes. `skipped` books carry neither.
 */
function runTransitionKernel(booklet, preparedBook) {
  var doc = booklet || {};
  var spine = (doc.meta || {}).playSpine;
  var base = {
    skipped: false,
    skipReason: '',
    hard: [],
    soft: [],
    bands: [],
    spread: [],
    decisions: [],
    measurements: {}
  };

  if (!spine || typeof spine !== 'object') {
    base.skipped = true;
    base.skipReason = 'no meta.playSpine — this book was authored before the Ludic Spine existed,'
      + ' and the sim walks a declaration it does not have';
    return base;
  }
  if (!asArray(spine.economyGraph).length) {
    base.skipped = true;
    base.skipReason = 'meta.playSpine declares no economyGraph edges — there is no economy to walk'
      + ' (the closure floors own that absence, not the sim)';
    return base;
  }

  var book = preparedBook || readBook(doc);
  if (!book.weekCount) {
    base.skipped = true;
    base.skipReason = 'the booklet prints no weeks';
    return base;
  }

  var graph = buildGateGraph(spine, book);
  var deadline = book.endWeek;

  // ── The schedules ────────────────────────────────────────────────────────
  var guaranteedHold = earliestHold(graph, ['guaranteed']);
  var withBranch = earliestHold(graph, ['guaranteed', 'branch']);
  var withChance = earliestHold(graph, ['guaranteed', 'chance']);
  var withAll = earliestHold(graph, ['guaranteed', 'branch', 'chance']);
  var stingy = latestHold(graph, guaranteedHold, book);
  var branching = branchWalks(graph);

  // ── The bands ────────────────────────────────────────────────────────────
  var hardAdversary = null;
  SIM_ADHERENCE_BANDS.forEach(function (band) {
    var adv = adversarialTicksByWeek(book, band.fraction);
    if (band.id === SIM_HARD_BAND) hardAdversary = adv;
    var row = {
      band: band.id,
      label: band.label,
      completedSessions: adv.completed,
      missedSessions: adv.missed,
      ticksAtEnd: adv.prefix[book.weekCount] || 0,
      thresholdMet: null
    };
    if (book.threshold) {
      row.thresholdMet = (adv.prefix[book.threshold.week] || 0) >= book.threshold.value;
      row.ticksAtThreshold = adv.prefix[book.threshold.week] || 0;
    }
    base.bands.push(row);
  });
  var hardBand = base.bands.filter(function (r) { return r.band === SIM_HARD_BAND; })[0] || base.bands[0];

  // ══ HARD ASSERTIONS ══════════════════════════════════════════════════════
  // Every one of these is a soft-lock: a state the player can reach from which
  // the book cannot be finished. They block on the generation path and quote
  // the defect back as a Correction Directive.

  // The required set is what the BOOK prints, resolved through aliases. A
  // target is satisfied if ANY of its aliases is held.
  function holdOf(schedule, target) {
    return Math.min.apply(null, target.aliases.map(function (a) {
      return schedule[a] === undefined ? INFINITY_WEEK : schedule[a];
    }));
  }
  var required = asArray(book.endgame).filter(function (target) { return target.required !== false; });

  required.forEach(function (target) {
    if (holdOf(guaranteedHold, target) !== INFINITY_WEEK) return;

    // H5a (W5a) — the per-branch verdict, when the spine attributed its doors.
    // Taken BEFORE the underspecification finding because it answers the same
    // question with evidence: a target every assignment reaches is safe even
    // with no guaranteed path, and a target some assignment loses is a soft-lock
    // with the losing side NAMED.
    if (branching.walks.length) {
      var lost = branching.walks.filter(function (walk) {
        return holdOf(walk.hold, target) === INFINITY_WEEK;
      });
      if (lost.length < branching.walks.length) {
        if (!lost.length) return;   // held on every declared branch
        base.hard.push(finding('branch-only-path',
          'The simulated player loses "' + target.label + '" on ' + lost.length + ' of '
          + branching.walks.length + ' declared branch' + (branching.walks.length === 1 ? '' : 'es')
          + ' — taking ' + lost.slice(0, 3).map(function (w) { return w.label; }).join(', ')
          + (lost.length > 3 ? ', …' : '')
          + ' leaves it unreachable, and nothing on the page warns the player at the fork.'
          + ' Feed it from a surface every branch guarantees, or give the losing side its own route to it.',
          { node: target.label, lostOn: lost.map(function (w) { return w.label; }), attributed: true }));
        return;
      }
    }

    var orphanContingency = contingentPathFromDoor(graph, target);
    if (orphanContingency.found) {
      base.hard.push(finding(orphanContingency.chance ? 'contingent-only-path' : 'branch-only-path',
        'The declared route to "' + target.label + '" begins at a door no authored source feeds.'
        + ' The producer gate must wire the door before this contingent path can be played.',
        { node: target.label, orphanDoor: true }));
      return;
    }

    // H4/H5 first: naming WHY it is unreachable is the difference between a
    // directive a model can execute and a shrug.
    if (holdOf(withChance, target) !== INFINITY_WEEK && holdOf(withBranch, target) === INFINITY_WEEK) {
      base.hard.push(finding('dice-only-path',
        'The simulated player cannot reach "' + target.label + '" without a lucky roll: every path to it'
        + ' runs through an oracle edge, and dice feed ambient bonuses only (chance isolation, D37).'
        + ' A book finishable only on good rolls is sometimes unfinishable — wire a guaranteed edge'
        + ' from session work or a reckoning conversion to it.', { node: target.label }));
      return;
    }
    if (holdOf(withBranch, target) !== INFINITY_WEEK) {
      base.hard.push(finding('branch-only-path',
        'The simulated player can reach "' + target.label + '" only through a door edge, and the spine does'
        + ' not say which branch grants it — the player who picks the other side loses the endgame with'
        + ' nothing on the page telling them so. Feed it from a surface both branches guarantee, or'
        + ' declare in decisionLedger which branch carries it.', { node: target.label }));
      return;
    }
    if (holdOf(withAll, target) !== INFINITY_WEEK) {
      base.hard.push(finding('contingent-only-path',
        'The simulated player can reach "' + target.label + '" only by combining a door branch with a die'
        + ' roll. Neither is guaranteed, so neither can carry the endgame.', { node: target.label }));
      return;
    }
    base.hard.push(finding('unreachable-endgame',
      'The simulated player can never reach "' + target.label + '": no economyGraph edge feeds it from any'
      + ' source the player can work toward. This is the soft-lock the sim exists to catch — the book'
      + ' prints a surface the economy cannot open.', { node: target.label }));
  });

  // H3 — keys strictly before locks, judged on the PRINTED weeks. W4a floors
  // this on the declaration (do the refs order forward?); this is the rendered
  // half: the fragment carrying the seal is drawn in some week, and the KEY —
  // the feeder, not the seal itself — has to be holdable STRICTLY BEFORE that
  // week or the page is a wall.
  //
  // Reading the FEEDER's hold rather than the seal's is the whole check. A
  // node's own hold is clamped to its own print week (you cannot hold a page
  // before it is drawn), so comparing a seal's hold against its print week is
  // a tautology that fires on every sealed book — which is exactly what the
  // first draft of this did.
  asArray(book.sealedFragments).forEach(function (sealInfo) {
    var lockWeek = sealInfo.printWeek;
    if (lockWeek === null || lockWeek === undefined) return;
    var feeders = graph.edges.filter(function (e) { return e.to === sealInfo.key && e.cls === 'guaranteed'; });
    if (!feeders.length) return;   // unreachable, already reported above
    var earliestKey = Math.min.apply(null, feeders.map(function (e) {
      return guaranteedHold[e.from] === undefined ? INFINITY_WEEK : guaranteedHold[e.from];
    }));
    if (earliestKey === INFINITY_WEEK) return;
    if (earliestKey >= lockWeek) {
      base.hard.push(finding('key-after-lock',
        'The seal on "' + sealInfo.id + '" is printed in week ' + lockWeek + ' but its key cannot be held'
        + ' until week ' + earliestKey + ' — a sealed page whose key arrives with it or after it is gated'
        + ' content nobody can open. Move the key earlier or the seal later.',
        { seal: sealInfo.id, lockWeek: lockWeek, keyWeek: earliestKey }));
    }
  });

  // H6 — the password chain. Every ending's password elements are the weekly
  // component values; a week whose component the player cannot reach is an
  // element they cannot collect, and the password is all-or-nothing.
  book.weeks.forEach(function (row) {
    if (row.componentValue === null) return;
    var key = 'week:' + toSlugWords('W' + row.week);
    var node = graph.nodes[key];
    if (!node) return;   // the spine never gates this week: the value is simply printed
    // A printed week is normally a guaranteed source. When the spine itself
    // places that week behind a branch/chance edge, however, treating the
    // source classification as stronger than the authored gate makes the
    // password walk blind to exactly the soft-lock it exists to catch. A
    // contingent incoming edge with no guaranteed sibling therefore wins.
    var incoming = graph.edges.filter(function (edge) { return edge.to === key; });
    var contingentGate = incoming.some(function (edge) {
      return edge.cls === 'branch' || edge.cls === 'chance';
    }) && !incoming.some(function (edge) { return edge.cls === 'guaranteed'; });
    if (!contingentGate && guaranteedHold[key] !== INFINITY_WEEK) return;
    base.hard.push(finding('password-element-unreachable',
      'Week ' + row.week + ' carries a password element ("' + row.componentValue + '") and the spine'
      + ' gates that week behind something the player cannot guarantee. Every element is needed on'
      + ' every branch — the finale opens with all of them or none.', { week: row.week }));
  });

  // H7 — required content behind the reckoning threshold. This is the only
  // shape in which the threshold can soft-lock a book: the number itself is a
  // TARGET the panel prints, not a lock (RECKONING_THRESHOLD_RATIO's own
  // doctrine: "the password chain is untouched — the economy may never own the
  // six-week payoff"). But if the spine routes required content THROUGH the
  // boss reckoning, the target becomes a gate, and a gate the 60% band cannot
  // clear is exactly the soft-lock VISION §4.5 names.
  if (book.threshold && hardBand && hardBand.thresholdMet === false) {
    var gateKey = 'reckoning:' + toSlugWords('W' + book.threshold.week);
    // THE CONVERSION EDGE IS NOT A GATE (R1 rider, 2026-08-17). The boss week's
    // reckoning banks its marks like every other week's — and under the
    // declaration-literal income law it MUST, because a spine now owes an
    // income edge for every printing week. That edge makes the wallet, and
    // therefore everything the wallet buys, formally reachable from the
    // threshold node; walked naively, H7 would report the endgame as
    // threshold-gated in every lawful book ever generated. A hard finding that
    // fires on every compliant book is not a floor, it is noise with teeth.
    //
    // The distinction the finding actually means: content is BEHIND the
    // threshold when the spine routes it through the boss reckoning by some
    // route other than the ordinary weekly conversion. So the walk refuses one
    // edge — reckoning → wallet — and traverses everything else. The mutation
    // this check exists for (`reckoning:W6 → boss`) is untouched by the refusal
    // and still fires; the clean book, whose only outgoing boss-week edge is the
    // conversion, correctly says nothing.
    //
    // Whether the endgame is affordable once banked is a DIFFERENT question with
    // its own findings (H8's dead end, H9's budget axis). This one asks only
    // whether the 60% band can pass a gate, and a conversion gates nothing.
    var skipConversionToWallet = function (e) {
      var fromNode = graph.nodes[e.from];
      var toNode = graph.nodes[e.to];
      return !!(fromNode && toNode && SIM_CONVERSION_KINDS[fromNode.kind] && toNode.kind === 'banked');
    };
    // ══ THE WHETHER/WHICH SPLIT — the mirror of validation.js Floor 11a's own
    // split, and it must stay a mirror (D93: a floor blocking a shape the sim
    // approves, or approving one the sim reports, is two answers to the same
    // question at two different prices).
    //
    // The ratified acceptance line (item 4, 2026-08-17): "performance may shape
    // WHICH ending and what state you carry into it — never WHETHER the seal
    // opens." So `boss`, `assembly` and `seal:` behind the threshold are a
    // soft-lock exactly as before, and an `ending:` behind it is a soft-lock
    // ONLY when every ending is behind it. A differentiated finale where the
    // strong block buys the harder close is design, not a lock — and reporting
    // it as one is how this walker starts refusing the differentiation the book
    // is supposed to have.
    //
    // FREE, defined identically on both sides: an ending is free when at least
    // one edge into it starts at a node that is neither the gate nor reachable
    // from it. This side additionally requires that feeder edge to be
    // GUARANTEED, because a free route that needs a lucky roll is not a route
    // (chance isolation, ruling 1) — that asymmetry makes the sim strictly
    // finer than the floor, never looser, which is the only direction two
    // readers of one relation may differ in.
    var gateReaches = function (key) {
      return key === gateKey || reachesFrom(graph, gateKey, key, skipConversionToWallet);
    };
    var kindOf = function (target) {
      var a = target.aliases[0] || '';
      return a.indexOf(':') === -1 ? a : a.slice(0, a.indexOf(':'));
    };
    var gatedTargets = required.filter(function (target) {
      return target.aliases.some(function (a) {
        return reachesFrom(graph, gateKey, a, skipConversionToWallet);
      });
    });
    var whetherBehind = gatedTargets.filter(function (t) { return kindOf(t) !== 'ending'; })
      .map(function (t) { return t.label; });
    var endingsBehind = gatedTargets.filter(function (t) { return kindOf(t) === 'ending'; })
      .map(function (t) { return t.label; });
    var freeEndings = required.filter(function (target) {
      if (kindOf(target) !== 'ending') return false;
      return graph.edges.some(function (e) {
        if (e.cls !== 'guaranteed') return false;
        if (target.aliases.indexOf(e.to) === -1) return false;
        return !gateReaches(e.from);
      });
    }).map(function (t) { return t.label; });
    var behind = whetherBehind.concat(freeEndings.length ? [] : endingsBehind);
    if (behind.length) {
      base.hard.push(finding('threshold-gated-endgame',
        'Week ' + book.threshold.week + ' sets a reckoning threshold of ' + book.threshold.value
        + ', the ' + hardBand.label + ' adherence band banks at most ' + hardBand.ticksAtThreshold
        + ' ticks, and the spine routes ' + behind.join(', ') + ' through that reckoning.'
        + (freeEndings.length || !endingsBehind.length
          ? ' A player at realistic adherence reaches the final week and finds the book cannot be'
            + ' finished: performance may shape WHICH ending they reach, never WHETHER the seal opens.'
          : ' EVERY ending sits behind it, so a player at realistic adherence finishes the program'
            + ' and the book has no last page for them. One gated ending is the high bar; all of'
            + ' them is a locked door.')
        + ' Feed it from a surface the band can reach, or lower what the gate costs.',
        {
          threshold: book.threshold.value, banked: hardBand.ticksAtThreshold, behind: behind,
          whetherBehind: whetherBehind, endingsBehind: endingsBehind, freeEndings: freeEndings
        }));
    }
  }

  // H8 — the dead-end economy state: the player holds banked value, no sink
  // remains open from this week forward, and a gate is still closed. Structural
  // rather than numeric (no prices exist), and none the weaker for it: it is
  // the week-shaped version of "money with nothing left to buy while the door
  // is still shut".
  // The condition, stated exactly: the wallet is still taking deposits after
  // its last exit closed, and something required is still shut. Both halves are
  // load-bearing. Income after the last spend is fine if the book is over;
  // a shut gate is fine if a spend is still open to shoulder it. Only the
  // conjunction is the state where the pencil keeps working for nothing.
  var bankedKey = graph.nodes['banked'] ? 'banked' : null;
  if (bankedKey && guaranteedHold[bankedKey] !== INFINITY_WEEK) {
    // THE DECLARATION-LITERAL READING (author ruling, 2026-08-17). The last
    // DECLARED income edge into the wallet dates the last deposit. Nothing
    // else does — not a chain, not an inference, not a convention.
    //
    // WHAT THIS REPLACES, AND WHY IT WAS WRONG. The first version traced every
    // source to the wallet TRANSITIVELY and, on any hit at all, dated income to
    // `book.weekCount`, reasoning that a spine names one representative edge
    // (`markStrip:W1 → reckoning:W1 → banked`) for a conversion the book
    // repeats every week. That reasoning turns a week-1 DECLARATION into a
    // week-6 FACT. WHICH WEEKS PAY IS EXACTLY THE THING A REPRESENTATIVE EDGE
    // CANNOT REPRESENT: a spine that banks in week 1 and never again is, under
    // the old reading, byte-indistinguishable from one that banks every week —
    // and the old reading called both "income through the final week", which is
    // an invented deposit, in the confident direction, on the one axis this
    // check exists to measure.
    //
    // THE FIREABILITY IS NOW BOUGHT BY DECLARATION, NOT INFERENCE. The comment
    // this replaces was right that the literal reading alone would date most
    // spines to week 1 and leave H8 unfireable. The answer is not to guess the
    // missing weeks — it is to require them: the income-edge floor
    // (validation.js, collectSpineSkeletonFloorErrors Floor 2b) fails any
    // GENERATED spine that owns a wallet and does not declare an income edge
    // for every printing week. On a book this pipeline wrote, the literal and
    // transitive readings therefore agree; where they can still disagree — a
    // hand-authored or pre-floor book — the literal one is the only one reading
    // something a human actually wrote.
    //
    // ONE RELATION, TWO READERS (D93). The floor and this walk must read the
    // same thing: an edge whose `to` is the wallet, dated by its source's print
    // week. Moving one without the other is the two-algorithms defect — the
    // floor would demand a shape the sim does not credit, or credit one the
    // floor never asked for.
    var lastIncome = 0;
    graph.edges.forEach(function (e) {
      if (e.to !== bankedKey || e.cls !== 'guaranteed') return;
      var src = graph.nodes[e.from];
      if (src && src.printWeek !== null) lastIncome = Math.max(lastIncome, src.printWeek);
    });
    var sinkWeeks = graph.edges
      .filter(function (e) { return e.from === bankedKey && e.cls === 'guaranteed'; })
      .map(function (e) {
        var t = graph.nodes[e.to];
        return t && t.printWeek !== null ? t.printWeek : deadline;
      });
    var lastSink = sinkWeeks.length ? Math.max.apply(null, sinkWeeks) : 0;
    var stillClosed = required.filter(function (target) {
      var h = holdOf(guaranteedHold, target);
      return h === INFINITY_WEEK || h > lastSink;
    }).map(function (target) { return target.label; });
    if (lastIncome > lastSink && stillClosed.length) {
      base.hard.push(finding('dead-end-economy',
        'From week ' + (lastSink + 1) + ' the player still banks value and every spend the spine'
        + ' names has already closed (the last sink is drawn in week ' + lastSink + ', income runs to week '
        + lastIncome + '), while ' + stillClosed.join(', ') + ' remains unopened. The economy keeps taking'
        + ' deposits at a bank with no counter — give the late weeks a sink, or move the endgame inside'
        + ' the window the spends actually cover.',
        { lastSinkWeek: lastSink, lastIncomeWeek: lastIncome, stillClosed: stillClosed }));
    }
  }

  // H9 (W5a) — the budget axis. Until prices existed the sim could only ask
  // "can the player HOLD this, and by when"; the header said so and named the
  // gap. `price` closes it, denominated in MARKS — the only unit the machine
  // economy has, and the same one the derived boss threshold is expressed in.
  //
  // NECESSARY-CONDITION ARITHMETIC, deliberately. The adversarial prefix is
  // ticks EARNED by the end of a week, not ticks remaining after other spends,
  // so "price > earned-by-deadline" proves the spend is unaffordable even for a
  // player who bought nothing else. It can never produce a false alarm; it can
  // miss a book that is unaffordable only in aggregate, which is what the total
  // check below catches.
  //
  // REQUIRED means REQUIRED, tested by deletion: an edge is required when
  // removing it makes something the book prints unreachable. A priced side
  // route the player can decline is a choice, and a choice they cannot afford
  // is a design, not a defect.
  var pricedEdges = graph.edges.filter(function (e) { return e.price > 0; });
  base.measurements.pricedEdges = pricedEdges.length;
  var unaffordable = [];
  if (pricedEdges.length && hardAdversary) {
    var reachableNow = required.filter(function (t) {
      return holdOf(guaranteedHold, t) !== INFINITY_WEEK;
    });
    pricedEdges.forEach(function (edge) {
      var without = earliestHold(graph, ['guaranteed'], function (e) { return e !== edge; });
      var breaks = reachableNow.some(function (t) { return holdOf(without, t) === INFINITY_WEEK; });
      if (!breaks) return;
      var deadline = edge.closesAtWeek !== null && edge.closesAtWeek !== undefined
        ? Math.min(edge.closesAtWeek, book.weekCount)
        : book.weekCount;
      var banked = hardAdversary.prefix[deadline] || 0;
      if (edge.price > banked) {
        unaffordable.push({ edge: edge, deadline: deadline, banked: banked });
      }
    });
    unaffordable.forEach(function (row) {
      base.hard.push(finding('unaffordable-required-spend',
        'The spend "' + row.edge.from + ' → ' + row.edge.to + '" costs ' + row.edge.price
        + ' marks and is required to reach the endgame, but a player at ' + hardBand.label
        + ' adherence has banked at most ' + row.banked + ' marks by week ' + row.deadline
        + (row.edge.closesAtWeek ? ' (when the window closes)' : ' (the last week of play)')
        + ' — even spending on nothing else. Lower the price, widen the window, or give the'
        + ' endgame a route that does not pass through this purchase.',
        { from: row.edge.from, to: row.edge.to, price: row.edge.price, banked: row.banked,
          deadline: row.deadline }));
    });
    // The aggregate. Only when no single spend already failed, so one defect
    // reports once — the same discipline the mutation battery is judged by.
    if (!unaffordable.length) {
      var requiredTotal = 0;
      pricedEdges.forEach(function (edge) {
        var without = earliestHold(graph, ['guaranteed'], function (e) { return e !== edge; });
        var breaks = reachableNow.some(function (t) { return holdOf(without, t) === INFINITY_WEEK; });
        if (breaks) requiredTotal += edge.price;
      });
      base.measurements.requiredSpendTotal = requiredTotal;
      var earned = hardAdversary.prefix[book.weekCount] || 0;
      if (requiredTotal > earned) {
        base.hard.push(finding('unaffordable-required-total',
          'The spends the endgame requires cost ' + requiredTotal + ' marks in total and a player at '
          + hardBand.label + ' adherence banks ' + earned + ' across the whole book. Every purchase is'
          + ' individually affordable and the set is not — which the player discovers in the last week,'
          + ' holding a wallet that was never going to be enough.',
          { requiredTotal: requiredTotal, earned: earned, band: hardBand.label }));
      }
    }
  }

  // ══ SOFT FINDINGS ════════════════════════════════════════════════════════
  // These route to the critic's revision machinery under the ludic reopen
  // scopes (economy / gate / decision). They are never blocking: D19 stands —
  // a book ships with its critique attached, and none of these makes a book
  // unfinishable.

  // S1 — the stingy/greedy spread. With no prices the difference is scheduling
  // (see header); a book where every node's window is a single week is a book
  // where the spend policy is a formality.
  // The spend surfaces: everything the player can reach that is neither the
  // work that earns (sources) nor the arithmetic that converts it
  // (SIM_CONVERSION_KINDS). Both exclusions answer the same question — "does
  // this surface ask the player anything?" — and a reckoning does not: it is
  // the same conversion, in the same direction, every week the book prints.
  var optional = Object.keys(graph.nodes).filter(function (key) {
    var kind = graph.nodes[key].kind;
    return guaranteedHold[key] !== INFINITY_WEEK
      && !SIM_SOURCE_KINDS[kind] && !SIM_CONVERSION_KINDS[kind];
  });
  var spreads = optional.map(function (key) {
    var e = guaranteedHold[key];
    var l = stingy[key];
    return { node: key, earliest: e, latest: l, spread: (l === INFINITY_WEEK ? 0 : l - e) };
  });
  base.spread = spreads;
  var material = spreads.filter(function (s) { return s.spread > 0; });
  base.measurements.spendWindows = spreads.length;
  base.measurements.materialWindows = material.length;
  if (spreads.length && !material.length) {
    base.soft.push(finding('spend-spread-immaterial',
      'Playing stingily and playing greedily produce the identical schedule: every one of the '
      + spreads.length + ' spend surfaces opens and closes in the same week, so hoarding buys the'
      + ' player nothing and spending early costs them nothing. Give at least one spend a window —'
      + ' something worth saving for, or something worth taking now.', { windows: spreads.length }));
  }

  // S1b (W5a) — the budget axis, when the book declares one. A price the 60%
  // band can always pay for EVERYTHING is a number on a page: it never refuses
  // anything, so it never asks the player to choose. Reported, never blocking —
  // a generous economy is a legitimate design, and this is the critic's to
  // weigh.
  if (pricedEdges.length && hardAdversary) {
    var allPrices = pricedEdges.reduce(function (a, e) { return a + e.price; }, 0);
    var bandEarned = hardAdversary.prefix[book.weekCount] || 0;
    base.measurements.declaredSpendTotal = allPrices;
    base.measurements.bandEarnedTotal = bandEarned;
    if (allPrices <= bandEarned) {
      base.soft.push(finding('budget-axis-immaterial',
        'Every declared spend in the book costs ' + allPrices + ' marks in total and the '
        + hardBand.label + ' adherence band banks ' + bandEarned + ' — so the player can buy'
        + ' everything even at the worst adherence the book plans for, and no price ever refuses'
        + ' them anything. Raise a price, or accept that spending is a formality here.',
        { declared: allPrices, earned: bandEarned }));
    }
  }

  // Chance-fed pools ride the spread report and never reachability (ruling 1).
  var chanceFed = Object.keys(graph.nodes).filter(function (key) {
    return graph.nodes[key].inChance > 0;
  });
  base.measurements.chanceFedNodes = chanceFed.length;

  // S2 — decision density, per week.
  //
  // PER-SESSION IS A MEASUREMENT, NOT A GATE, AND THE REASON IS STRUCTURAL:
  // schema 1.5.0 offers exactly one per-session choice surface (binaryChoice),
  // and the boss-encounter cross-check assumes exactly one exists in the whole
  // booklet. A per-session decision floor would therefore fail every session of
  // every book for a reason no model could fix — the surface to fix it with
  // does not exist. The count is reported so the gap is visible; the floor
  // waits for a per-session choice primitive to earn it (W5).
  // A decision is an EVENT, not a standing affordance. A spend the player can
  // make in any of six weeks does not ask them anything in week 4; it asks
  // twice — the week it opens ("take it now?") and the week it closes ("last
  // chance"). Counting every week inside every window instead was the D100
  // anti-vacuity failure in miniature: a needle that matches everything looks
  // exactly like a working floor from one side and can never fire.
  var openWindows = {};
  spreads.forEach(function (s) {
    if (s.earliest !== INFINITY_WEEK && s.earliest <= book.weekCount) {
      openWindows[s.earliest] = (openWindows[s.earliest] || 0) + 1;
    }
    if (s.spread > 0 && s.latest !== INFINITY_WEEK && s.latest <= book.weekCount) {
      openWindows[s.latest] = (openWindows[s.latest] || 0) + 1;
    }
  });
  book.weeks.forEach(function (row) {
    var count = (row.hasDoor ? 1 : 0) + row.binaryChoices + (openWindows[row.week] || 0);
    base.decisions.push({ week: row.week, decisions: count, sessions: row.sessions });
    if (count < SIM_DECISION_FLOOR_PER_WEEK) {
      base.soft.push(finding('decision-density-week',
        'Week ' + row.week + ' asks the player to decide nothing: no door, no fork, and no spend'
        + ' window open. The week is executed, not played. Give it a door, a fork, or a spend the'
        + ' player can choose to make now or later.', { week: row.week }));
    }
  });
  base.measurements.sessionsWithChoice = book.sessions.filter(function (s) { return s.hasBinaryChoice; }).length;
  base.measurements.totalSessions = book.totalSessions;

  // S3 — the tension budget honored: a week that declares something losable
  // wants a surface that can take it away.
  asArray(spine.tensionBudget).forEach(function (row) {
    if (!row || !Number.isInteger(row.week)) return;
    var losable = String(row.losable || '').trim();
    if (!losable) return;
    var weekRow = book.weeks.filter(function (r) { return r.week === row.week; })[0];
    if (!weekRow) return;
    var canLose = weekRow.clocks.some(function (c) { return c.losable; });
    if (!canLose) {
      base.soft.push(finding('tension-not-losable',
        'Week ' + row.week + ' declares "' + losable + '" losable and prints nothing that can take it:'
        + ' no danger, racing, or tug-of-war clock, no downward track, no consequence on full. A stake'
        + ' the page cannot collect is a stake the player learns to ignore.', { week: row.week }));
    }
  });

  // S4 — the door that changes nothing the graph carries. W4a's floor reads the
  // decisionLedger row's WORDS; this asks whether the graph has an edge out of
  // that door at all. A door with a beautifully written differsBy and no edge
  // is the flavour-only door with better prose.
  book.weeks.forEach(function (row) {
    if (!row.hasDoor) return;
    var doorKey = 'door:' + toSlugWords('W' + row.week);
    var out = graph.edges.filter(function (e) { return e.from === doorKey; }).length;
    if (!out) {
      base.soft.push(finding('door-carries-no-edge',
        'Week ' + row.week + ' prints a door and the economy graph has no edge leaving `door:W'
        + row.week + '` — whatever the decision ledger says differs, nothing downstream reads it.'
        + ' Point an edge at what the branch actually changes.', { week: row.week }));
    }
  });

  // S5 — the measured threshold band. NOT a gate: see H7. Reported with the
  // arithmetic so a ruling can be made on numbers rather than on feel.
  if (book.threshold && book.totalTicks > 0) {
    var clearsAt = book.threshold.value / book.totalTicks;
    base.measurements.thresholdClearsAtAdherence = Math.round(clearsAt * 1000) / 1000;
    base.measurements.thresholdRatioDoctrine = RECKONING_THRESHOLD_RATIO;
    if (hardBand && hardBand.thresholdMet === false) {
      base.soft.push(finding('threshold-above-band',
        'The reckoning threshold (' + book.threshold.value + ' of ' + book.totalTicks
        + ' attainable ticks) first clears at ' + Math.round(clearsAt * 100) + '% adherence, above the '
        + hardBand.label + ' band, which banks at most ' + hardBand.ticksAtThreshold + '. Nothing'
        + ' required is gated on it, so the book is finishable — but the panel prints a number a'
        + ' realistic player will not reach.', { clearsAt: clearsAt, band: hardBand.label }));
    }
  }

  base.measurements.weekCount = book.weekCount;
  base.measurements.totalTicks = book.totalTicks;
  base.measurements.graphNodes = Object.keys(graph.nodes).length;
  base.measurements.graphEdges = graph.edges.length;
  base.measurements.branchEdges = graph.edges.filter(function (e) { return e.cls === 'branch'; }).length;
  base.measurements.chanceEdges = graph.edges.filter(function (e) { return e.cls === 'chance'; }).length;
  // W5a. `attributedDoors: 0` is the W4b state and reads as "this book's forks
  // are two labels"; `branchWalkCapped` says the enumeration was probed rather
  // than exhausted, which the header warns can miss a two-door collusion.
  base.measurements.attributedDoors = branching.doors.length;
  base.measurements.branchWalks = branching.walks.length;
  base.measurements.branchWalkCapped = branching.capped;
  base.measurements.timedEdges = graph.edges.filter(function (e) {
    return e.closesAtWeek !== null && e.closesAtWeek !== undefined;
  }).length;
  base.book = book;
  base.graph = graph;
  // Keyed by SIM_SPEND_POLICIES so the two schedules are named the way the
  // doctrine names them: greedy takes each affordance the week it opens,
  // stingy defers to the last week that still meets a deadline.
  base.holds = {};
  base.holds[SIM_SPEND_POLICIES[0]] = stingy;
  base.holds[SIM_SPEND_POLICIES[1]] = guaranteedHold;
  return base;
}

/**
 * The public assembled-book adapter. Both this reader and the pre-prose
 * contract adapter below enter `runTransitionKernel`; there is one gameplay
 * transition implementation and two honest readers of different source
 * shapes.
 */
export function simulateBook(booklet) {
  return runTransitionKernel(booklet, null);
}

// ════════════════════════════════════════════════════════════════════════════
// PART 5 — the transient pre-prose artifact contract (D267 Wave 2)
// ════════════════════════════════════════════════════════════════════════════

export var ARTIFACT_TRANSITION_KERNEL_ID = 'liftrpg-sim-transition-v1';

var ARTIFACT_PROSE_FIELDS = {
  body: 1, copy: 1, description: 1, instruction: 1, prompt: 1, text: 1
};

function artifactClone(value) {
  if (Array.isArray(value)) return value.map(artifactClone);
  if (!value || typeof value !== 'object') return value;
  var out = {};
  Object.keys(value).forEach(function (key) { out[key] = artifactClone(value[key]); });
  return out;
}

function artifactPathGet(value, path) {
  return String(path || '').replace(/\[(\d+)\]/g, '.$1').split('.').reduce(function (node, key) {
    return node == null ? undefined : node[key];
  }, value);
}

function artifactPathSet(value, path, next) {
  var parts = String(path).replace(/\[(\d+)\]/g, '.$1').split('.');
  var node = value;
  parts.forEach(function (key, index) {
    if (index === parts.length - 1) { node[key] = next; return; }
    var followingIsIndex = /^\d+$/.test(parts[index + 1]);
    if (!node[key]) node[key] = followingIsIndex ? [] : {};
    node = node[key];
  });
}

function artifactCanonical(value) {
  if (Array.isArray(value)) return '[' + value.map(artifactCanonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + artifactCanonical(value[key]);
    }).join(',') + '}';
  }
  return JSON.stringify(value);
}

function artifactDeepFreeze(value, seen) {
  if (!value || typeof value !== 'object') return value;
  var visited = seen || [];
  if (visited.indexOf(value) !== -1) return value;
  visited.push(value);
  Object.keys(value).forEach(function (key) { artifactDeepFreeze(value[key], visited); });
  return Object.freeze(value);
}

// Synchronous, dependency-free SHA-256. Browser SubtleCrypto is asynchronous;
// the artifact view is a synchronous deterministic seam used identically by
// the browser orchestrator and Node gates, so the digest implementation lives
// beside the canonical serializer rather than acquiring a Node-only import.
function artifactSha256(text) {
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  var bytes = unescape(encodeURIComponent(String(text)));
  var words = [];
  var bitLength = bytes.length * 8;
  for (var i = 0; i < bytes.length; i++) words[i >> 2] = (words[i >> 2] || 0) | bytes.charCodeAt(i) << (24 - (i % 4) * 8);
  words[bitLength >> 5] = (words[bitLength >> 5] || 0) | 0x80 << (24 - bitLength % 32);
  words[((bitLength + 64 >> 9) << 4) + 15] = bitLength;
  var h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  var k = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  for (var offset = 0; offset < words.length; offset += 16) {
    var w = new Array(64);
    for (i = 0; i < 16; i++) w[i] = words[offset + i] | 0;
    for (i = 16; i < 64; i++) {
      var s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      var s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    var a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];
    for (i = 0; i < 64; i++) {
      var sOne = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      var ch = (e & f) ^ (~e & g);
      var t1 = (hh + sOne + ch + k[i] + w[i]) | 0;
      var sZero = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var t2 = (sZero + maj) | 0;
      hh=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
    }
    h[0]=(h[0]+a)|0; h[1]=(h[1]+b)|0; h[2]=(h[2]+c)|0; h[3]=(h[3]+d)|0;
    h[4]=(h[4]+e)|0; h[5]=(h[5]+f)|0; h[6]=(h[6]+g)|0; h[7]=(h[7]+hh)|0;
  }
  return h.map(function (value) { return ('00000000' + (value >>> 0).toString(16)).slice(-8); }).join('');
}

function artifactFinding(code, ownerStage, ownerPath, message, paths) {
  return {
    code: code,
    class: 'conformance',
    severity: 'error',
    blocking: true,
    ownerStage: ownerStage || null,
    ownerPath: ownerPath || null,
    path: ownerPath || null,
    message: message,
    detail: { ownerStage: ownerStage || null, ownerPath: ownerPath || null, paths: paths || [ownerPath] }
  };
}

function artifactOwner(path) {
  var match = /^stages\.([^.[\]]+)/.exec(String(path || ''));
  return match ? match[1] : null;
}

function artifactScrub(value, sourcePath, findings) {
  if (Array.isArray(value)) return value.map(function (item, index) {
    return artifactScrub(item, sourcePath + '[' + index + ']', findings);
  });
  if (!value || typeof value !== 'object') return value;
  var out = {};
  Object.keys(value).forEach(function (key) {
    var path = sourcePath + '.' + key;
    if (ARTIFACT_PROSE_FIELDS[key]) {
      findings.push(artifactFinding('artifact-authority-conflict', artifactOwner(path), path,
        'Printable prose field is outside the mechanical artifact contract: ' + path));
      return;
    }
    out[key] = artifactScrub(value[key], path, findings);
  });
  return out;
}

function artifactLeafPairs(value, valuePath, sourcePath, out) {
  if (Array.isArray(value)) {
    if (!value.length) out.push({ valuePath: valuePath, sourcePath: sourcePath });
    else value.forEach(function (item, index) {
      artifactLeafPairs(item, valuePath + '[' + index + ']', sourcePath + '[' + index + ']', out);
    });
    return;
  }
  if (value && typeof value === 'object') {
    var keys = Object.keys(value);
    if (!keys.length) out.push({ valuePath: valuePath, sourcePath: sourcePath });
    else keys.forEach(function (key) {
      artifactLeafPairs(value[key], valuePath + '.' + key, sourcePath + '.' + key, out);
    });
    return;
  }
  out.push({ valuePath: valuePath, sourcePath: sourcePath });
}

function artifactSortRows(rows) {
  return rows.slice().sort(function (a, b) {
    var left = artifactCanonical(a.value);
    var right = artifactCanonical(b.value);
    return left < right ? -1 : (left > right ? 1 : a.sourceIndex - b.sourceIndex);
  });
}

function artifactInput(path) { return { ownerStage: artifactOwner(path), sourcePath: path }; }

function artifactSortedInputs(paths) {
  return paths.map(artifactInput).sort(function (a, b) {
    var left = a.ownerStage + '\u0000' + a.sourcePath;
    var right = b.ownerStage + '\u0000' + b.sourcePath;
    return left < right ? -1 : (left > right ? 1 : 0);
  });
}

function artifactRefWeek(raw, fallback) {
  var parsed = parseSurfaceRef(String(raw || ''));
  var week = refWeek(parsed);
  return week || fallback;
}

function artifactRequired(bank, path, findings) {
  var value = artifactPathGet(bank, path);
  if (value === undefined || value === null) {
    findings.push(artifactFinding('artifact-obligation-missing', artifactOwner(path), path,
      'Required artifact obligation is missing at ' + path));
    return false;
  }
  return true;
}

/**
 * Build an immutable mechanical view over already-paid stage facts. It never
 * invents a generation stage, mutates the checkpoint bank, or reads prose
 * seats. The provenance ledger is parallel to mechanics rather than embedded
 * inside it so digest and authority remain separate facts.
 */
export function readArtifactContractView(bank, options) {
  var source = bank || {};
  var pipeline = options && options.pipeline === 'skeleton-flesh' ? 'skeleton-flesh' : 'standard';
  var findings = [];
  var mechanics = {};
  var direct = [];
  var derived = [];

  function requirePath(path) { return artifactRequired(source, path, findings); }
  function addDirect(path, valuePath, opts) {
    if (!requirePath(path)) return;
    var raw = artifactPathGet(source, path);
    var projected = opts && Object.prototype.hasOwnProperty.call(opts, 'projected')
      ? opts.projected : raw;
    var rows = Array.isArray(raw) && opts && opts.set
      ? artifactSortRows(raw.map(function (_, sourceIndex) {
        return { value: artifactScrub(projected[sourceIndex], path + '[' + sourceIndex + ']', findings), sourceIndex: sourceIndex };
      })) : null;
    function recordPairs(clean, targetPath, sourcePath) {
      var pairs = [];
      artifactLeafPairs(clean, targetPath, sourcePath, pairs);
      pairs.forEach(function (pair) {
        var projectedValue = artifactPathGet({ mechanics: mechanics }, pair.valuePath);
        var sourceValue = artifactPathGet(source, pair.sourcePath);
        if (opts && typeof opts.changedInputs === 'function'
            && artifactCanonical(projectedValue) !== artifactCanonical(sourceValue)) {
          derived.push({
            valuePath: pair.valuePath,
            derivation: 'apply legal rulebook amendment to pristine authored mechanic',
            inputs: artifactSortedInputs([pair.sourcePath].concat(opts.changedInputs(sourceValue, projectedValue)))
          });
        } else {
          direct.push({ valuePath: pair.valuePath, ownerStage: artifactOwner(pair.sourcePath), sourcePath: pair.sourcePath });
        }
      });
    }
    if (rows) {
      var values = rows.map(function (row) { return row.value; });
      artifactPathSet(mechanics, valuePath, values);
      rows.forEach(function (row, targetIndex) {
        recordPairs(row.value, 'mechanics.' + valuePath + '[' + targetIndex + ']', path + '[' + row.sourceIndex + ']');
      });
      return;
    }
    var clean = artifactScrub(projected, path, findings);
    artifactPathSet(mechanics, valuePath, clean);
    recordPairs(clean, 'mechanics.' + valuePath, path);
  }
  function addDerived(valuePath, value, operation, inputPaths) {
    artifactPathSet(mechanics, valuePath, artifactClone(value));
    derived.push({ valuePath: 'mechanics.' + valuePath, derivation: operation, inputs: artifactSortedInputs(inputPaths) });
  }

  var ruleRoot = 'stages.gameRulebook.gameRulebook';
  var pristineRulebook = artifactPathGet(source, ruleRoot);
  var amendmentRoot = 'stages.shellIdentity.meta.rulebookAmendments.renames';
  var proposedAmendments = pipeline === 'standard'
    ? artifactPathGet(source, 'stages.shellIdentity.meta.rulebookAmendments') : null;
  var amendmentResult = pipeline === 'standard'
    ? applyRulebookAmendments(pristineRulebook, proposedAmendments) : { rulebook: pristineRulebook, applied: [] };
  var effectiveRulebook = options && options.effectiveRulebook
    ? options.effectiveRulebook : amendmentResult.rulebook;
  var appliedAmendments = options && Array.isArray(options.appliedAmendments)
    ? options.appliedAmendments : amendmentResult.applied;
  var proposedRenameRows = proposedAmendments && Array.isArray(proposedAmendments.renames)
    ? proposedAmendments.renames : [];

  function amendmentInputsForChange(before, after) {
    var beforeRef = parseSurfaceRef(String(before == null ? '' : before));
    var afterRef = parseSurfaceRef(String(after == null ? '' : after));
    var matched = [];
    proposedRenameRows.forEach(function (row, index) {
      var fromRef = parseSurfaceRef(String((row || {}).from || ''));
      var toRef = parseSurfaceRef(String((row || {}).to || ''));
      var applied = appliedAmendments.some(function (accepted) {
        return accepted.kind === fromRef.kind
          && String(accepted.from).toLowerCase() === String(fromRef.id || '').toLowerCase()
          && String(accepted.to).toLowerCase() === String(toRef.id || '').toLowerCase();
      });
      if (!applied || !beforeRef.valid || !afterRef.valid
          || beforeRef.kind !== fromRef.kind || afterRef.kind !== toRef.kind
          || String(beforeRef.id).toLowerCase() !== String(fromRef.id).toLowerCase()
          || String(afterRef.id).toLowerCase() !== String(toRef.id).toLowerCase()) return;
      matched.push(amendmentRoot + '[' + index + '].from');
      matched.push(amendmentRoot + '[' + index + '].to');
      matched.push(amendmentRoot + '[' + index + '].why');
    });
    return matched;
  }
  function rulebookProjection(path) {
    return artifactPathGet(effectiveRulebook, path.slice(ruleRoot.length + 1));
  }
  function addRulebookDirect(path, valuePath, opts) {
    var settings = Object.assign({}, opts || {}, {
      projected: rulebookProjection(path),
      changedInputs: amendmentInputsForChange
    });
    addDirect(path, valuePath, settings);
  }
  [
    ruleRoot + '.artifactDesign', ruleRoot + '.winCondition', ruleRoot + '.coreVerbs',
    ruleRoot + '.economy', ruleRoot + '.passwordPath', ruleRoot + '.sessionShape',
    ruleRoot + '.weekShape', ruleRoot + '.teachingOrder'
  ].forEach(requirePath);
  // The conceit is one authored object; commitments are a set of simultaneous
  // physical/gameplay promises, so source order cannot become semantic digest.
  if (requirePath(ruleRoot + '.artifactDesign')) {
    addRulebookDirect(ruleRoot + '.artifactDesign.governingConceit', 'artifactDesign.governingConceit');
    addRulebookDirect(ruleRoot + '.artifactDesign.commitments', 'artifactDesign.commitments', { set: true });
  }
  addRulebookDirect(ruleRoot + '.winCondition.requires', 'winCondition.requires');
  addRulebookDirect(ruleRoot + '.coreVerbs.verbs', 'coreVerbs', { set: true });
  addRulebookDirect(ruleRoot + '.economy.currency', 'currency');
  addRulebookDirect(ruleRoot + '.passwordPath.elements', 'passwordElements');
  addRulebookDirect(ruleRoot + '.sessionShape.ritual', 'sessionRitual');
  if (artifactPathGet(source, ruleRoot + '.teachingOrder.sequence') !== undefined) {
    addRulebookDirect(ruleRoot + '.teachingOrder.sequence', 'teachingOrder');
  } else {
    // The current stage schema requires the teaching-order owner but its
    // machine-readable sequence remains optional. Absence therefore means
    // "no ordered mechanical commitment", not a fabricated reading of the
    // prose answer. Keep the empty value traceable to the real owner object.
    addDerived('teachingOrder', [], 'project optional authored teaching sequence',
      [ruleRoot + '.teachingOrder']);
  }

  var weekRoot = pipeline === 'standard' ? 'stages.campaignPlan.weeks' : 'stages.skeleton.weekPlan';
  if (requirePath(weekRoot)) {
    var weekRows = artifactPathGet(source, weekRoot);
    if (!Array.isArray(weekRows)) {
      findings.push(artifactFinding('artifact-obligation-invalid', artifactOwner(weekRoot), weekRoot,
        'Planned weeks must be an array.'));
    } else {
      var sortedWeekRows = weekRows.map(function (row, sourceIndex) {
        return { row: row, sourceIndex: sourceIndex };
      }).sort(function (a, b) {
        return Number((a.row || {}).weekNumber) - Number((b.row || {}).weekNumber);
      });
      mechanics.weeks = [];
      sortedWeekRows.forEach(function (entry, targetIndex) {
        mechanics.weeks[targetIndex] = {};
        ['weekNumber', 'sessionCount', 'guaranteedMarksPerSession'].forEach(function (field) {
          addDirect(weekRoot + '[' + entry.sourceIndex + '].' + field, 'weeks[' + targetIndex + '].' + field);
        });
      });
    }
  }

  var spineRoot = pipeline === 'standard'
    ? 'stages.shellSpine.meta.playSpine' : 'stages.skeleton.meta.playSpine';
  ['economyGraph', 'consequenceEdges', 'decisionLedger', 'tensionBudget'].forEach(function (family) {
    requirePath(spineRoot + '.' + family);
  });
  addDirect(spineRoot + '.consequenceEdges', 'consequenceEdges', { set: true });
  addDirect(spineRoot + '.decisionLedger', 'decisionLedger', { set: true });
  addDirect(spineRoot + '.tensionBudget', 'tensionBudget', { set: true });

  var bossPath = pipeline === 'standard' ? 'stages.campaignPlan.bossPlan' : 'stages.skeleton.bossPlan';
  addDirect(bossPath, 'bossPlan');

  var cadencePath = pipeline === 'standard'
    ? 'stages.economyGraph.surfaceCadences' : spineRoot + '.surfaceCadences';
  addDirect(cadencePath, 'surfaceCadences', { set: true });

  var topologyPath = spineRoot + '.economyGraph';
  var topology = artifactPathGet(source, topologyPath);
  var pacingPath = pipeline === 'standard' ? 'stages.economyGraph.economyGraph' : topologyPath;
  var pacing = artifactPathGet(source, pacingPath);
  if (pipeline === 'standard') requirePath(pacingPath);
  if (!Array.isArray(topology)) topology = [];
  if (!Array.isArray(pacing)) pacing = [];

  function edgeIdentity(edge) { return String((edge || {}).from || '') + '\u0000' + String((edge || {}).to || ''); }
  var topologySeen = {};
  var pacingSeen = {};
  topology.forEach(function (edge, index) {
    var key = edgeIdentity(edge);
    if (topologySeen[key] !== undefined) {
      var matchingPace = pacing.findIndex(function (row) { return edgeIdentity(row) === key; });
      findings.push(artifactFinding('artifact-authority-conflict', artifactOwner(topologyPath), topologyPath + '[' + index + ']',
        'Spine repeats one topology edge.', [topologyPath + '[' + index + ']', pacingPath + '[' + (matchingPace < 0 ? index : matchingPace) + ']']));
    }
    topologySeen[key] = index;
  });
  pacing.forEach(function (edge, index) {
    var key = edgeIdentity(edge);
    if (pacingSeen[key] !== undefined) findings.push(artifactFinding('artifact-authority-conflict', artifactOwner(pacingPath), pacingPath + '[' + index + ']',
      'Pacing repeats one join edge.', [topologyPath + '[' + (topologySeen[key] === undefined ? pacingSeen[key] : topologySeen[key]) + ']', pacingPath + '[' + index + ']']));
    pacingSeen[key] = index;
  });
  // A join key is identity, never position. Detect a true rename only among
  // rows that did not join by (from,to), and only when one unique counterpart
  // preserves one half of that identity. This keeps a producer-valid reorder
  // neutral while retaining exact field provenance for an actual renamed key.
  var renamedTopology = {};
  var renamedPacing = {};
  if (pipeline === 'standard') {
    var unmatchedTopology = topology.map(function (edge, index) {
      return pacingSeen[edgeIdentity(edge)] === undefined ? index : -1;
    }).filter(function (index) { return index >= 0; });
    var unmatchedPacing = pacing.map(function (edge, index) {
      return topologySeen[edgeIdentity(edge)] === undefined ? index : -1;
    }).filter(function (index) { return index >= 0; });
    unmatchedTopology.forEach(function (topologyIndex) {
      var sourceEdge = topology[topologyIndex] || {};
      var candidates = unmatchedPacing.filter(function (pacingIndex) {
        var candidate = pacing[pacingIndex] || {};
        return (candidate.from === sourceEdge.from) !== (candidate.to === sourceEdge.to);
      });
      if (candidates.length !== 1) return;
      var pacingIndex = candidates[0];
      var reverseCandidates = unmatchedTopology.filter(function (otherTopologyIndex) {
        var other = topology[otherTopologyIndex] || {};
        var candidate = pacing[pacingIndex] || {};
        return (candidate.from === other.from) !== (candidate.to === other.to);
      });
      if (reverseCandidates.length !== 1) return;
      var field = sourceEdge.from === (pacing[pacingIndex] || {}).from ? 'to' : 'from';
      renamedTopology[topologyIndex] = pacingIndex;
      renamedPacing[pacingIndex] = topologyIndex;
      findings.push(artifactFinding('artifact-authority-conflict', 'economyGraph', pacingPath + '[' + pacingIndex + '].' + field,
        'Pacing renames a spine-owned join key.', [topologyPath + '[' + topologyIndex + '].' + field, pacingPath + '[' + pacingIndex + '].' + field]));
    });
  }

  var graphRows = [];
  topology.forEach(function (rawEdge, topologyIndex) {
    var key = edgeIdentity(rawEdge);
    var pacingIndex = pacingSeen[key];
    var annotation = pacingIndex === undefined ? null : pacing[pacingIndex];
    if (pipeline === 'standard' && !annotation && renamedTopology[topologyIndex] === undefined) {
      findings.push(artifactFinding('artifact-authority-conflict', 'economyGraph', topologyPath + '[' + topologyIndex + ']',
        'Pacing omits a topology edge.', [topologyPath + '[' + topologyIndex + ']', pacingPath]));
    }
    if (annotation && pipeline === 'standard') {
      ['from', 'to', 'currency', 'branch'].forEach(function (field) {
        // Pacing annotates topology; it may omit spine-owned echoes. When it
        // does echo one, however, the two paid owners must agree exactly.
        if (annotation[field] === undefined) return;
        if (annotation[field] !== rawEdge[field]) {
          findings.push(artifactFinding('artifact-authority-conflict', 'economyGraph', pacingPath + '[' + pacingIndex + '].' + field,
            'Pacing conflicts with spine-owned topology.', [topologyPath + '[' + topologyIndex + '].' + field, pacingPath + '[' + pacingIndex + '].' + field]));
        }
      });
    }
    var edge = {};
    ['from', 'to', 'currency', 'branch'].forEach(function (field) {
      if (rawEdge && rawEdge[field] !== undefined) edge[field] = artifactClone(rawEdge[field]);
    });
    var paced = annotation || rawEdge || {};
    ['price', 'closesAtWeek'].forEach(function (field) {
      if (paced[field] !== undefined) edge[field] = artifactClone(paced[field]);
    });
    graphRows.push({ value: edge, topologyIndex: topologyIndex, pacingIndex: pacingIndex === undefined ? topologyIndex : pacingIndex });
  });
  if (pipeline === 'standard') pacing.forEach(function (edge, pacingIndex) {
    if (topologySeen[edgeIdentity(edge)] !== undefined) return;
    if (renamedPacing[pacingIndex] !== undefined) return;
    findings.push(artifactFinding('artifact-authority-conflict', 'economyGraph', pacingPath + '[' + pacingIndex + ']',
      'Pacing invents an edge the spine does not own.', [topologyPath, pacingPath + '[' + pacingIndex + ']']));
  });

  function graphTuple(edge) {
    return ['from', 'to', 'currency', 'price', 'closesAtWeek', 'branch'].map(function (field) {
      return artifactCanonical((edge || {})[field]);
    }).join('\u0000');
  }
  graphRows.sort(function (a, b) {
    var left = graphTuple(a.value); var right = graphTuple(b.value);
    return left < right ? -1 : (left > right ? 1 : a.topologyIndex - b.topologyIndex);
  });
  mechanics.economyGraph = graphRows.map(function (row) { return row.value; });
  graphRows.forEach(function (row, targetIndex) {
    var rawEdge = topology[row.topologyIndex] || {};
    var annotation = pacing[row.pacingIndex] || {};
    ['from', 'to', 'currency', 'branch'].forEach(function (field) {
      if (rawEdge[field] === undefined) return;
      var valuePath = 'mechanics.economyGraph[' + targetIndex + '].' + field;
      var topologyFieldPath = topologyPath + '[' + row.topologyIndex + '].' + field;
      var annotationFieldPath = pacingPath + '[' + row.pacingIndex + '].' + field;
      if (pipeline === 'standard' && annotation[field] !== undefined) {
        derived.push({ valuePath: valuePath,
          derivation: 'join spine-owned topology field to matching pacing echo',
          inputs: artifactSortedInputs([topologyFieldPath, annotationFieldPath]) });
      } else {
        direct.push({ valuePath: valuePath,
          ownerStage: artifactOwner(topologyFieldPath), sourcePath: topologyFieldPath });
      }
    });
    ['price', 'closesAtWeek'].forEach(function (field) {
      if (annotation[field] === undefined) return;
      var valuePath = 'mechanics.economyGraph[' + targetIndex + '].' + field;
      if (pipeline === 'standard') {
        derived.push({ valuePath: valuePath,
          derivation: 'join pacing annotation to spine topology by normalized from/to identity',
          inputs: artifactSortedInputs([
            topologyPath + '[' + row.topologyIndex + '].from',
            topologyPath + '[' + row.topologyIndex + '].to',
            pacingPath + '[' + row.pacingIndex + '].from',
            pacingPath + '[' + row.pacingIndex + '].to',
            pacingPath + '[' + row.pacingIndex + '].' + field
          ]) });
      } else {
        direct.push({ valuePath: valuePath,
          ownerStage: artifactOwner(pacingPath), sourcePath: pacingPath + '[' + row.pacingIndex + '].' + field });
      }
    });
  });

  var endings = [];
  var endingInputs = [];
  if (pipeline === 'skeleton-flesh') {
    var endingPath = 'stages.skeleton.endingVariants';
    if (requirePath(endingPath)) {
      asArray(artifactPathGet(source, endingPath)).forEach(function (value, index) {
        endings.push(String(value).replace(/^ending:/i, ''));
        endingInputs.push(endingPath + '[' + index + ']');
      });
    }
  } else {
    topology.forEach(function (edge, index) {
      var match = /^ending:(.+)$/i.exec(String((edge || {}).to || ''));
      if (!match || endings.indexOf(match[1]) !== -1) return;
      endings.push(match[1]); endingInputs.push(topologyPath + '[' + index + '].to');
    });
  }
  var endingRows = endings.map(function (value, index) { return { value: value, sourcePath: endingInputs[index] }; })
    .sort(function (a, b) { return a.value < b.value ? -1 : (a.value > b.value ? 1 : 0); });
  mechanics.endingVariants = endingRows.map(function (row) { return row.value; });
  endingRows.forEach(function (row, index) {
    if (pipeline === 'skeleton-flesh' && artifactPathGet(source, row.sourcePath) === row.value) {
      direct.push({ valuePath: 'mechanics.endingVariants[' + index + ']', ownerStage: 'skeleton', sourcePath: row.sourcePath });
    } else {
      derived.push({ valuePath: 'mechanics.endingVariants[' + index + ']', derivation: 'normalize declared ending reference', inputs: artifactSortedInputs([row.sourcePath]) });
    }
  });

  var convergenceTopologyIndex = topology.findIndex(function (edge) { return String((edge || {}).to) === 'boss'; });
  var convergencePacingIndex = pacing.findIndex(function (edge) { return String((edge || {}).to) === 'boss'; });
  var convergenceInputs = [
    ruleRoot + '.winCondition.requires[0]',
    bossPath + '.decodeLogic',
    topologyPath + '[' + convergenceTopologyIndex + '].to',
    pacingPath + '[' + convergencePacingIndex + '].price'
  ];
  if (convergenceInputs.every(function (path) { return artifactPathGet(source, path) !== undefined; })) {
    addDerived('convergenceFunded', true, 'derive guaranteed boss/assembly/ending convergence', convergenceInputs);
  }

  // Duplicate authorities are rejected rather than resolved by precedence.
  ['artifactDesign', 'meta.artifactDesign', 'artifactPlan'].forEach(function (path) {
    if (artifactPathGet(source, path) !== undefined) findings.push(artifactFinding('artifact-authority-conflict', null, path,
      'Artifact design has one canonical owner.', [path, ruleRoot + '.artifactDesign']));
  });
  ['stages.shellSpine.artifactDesign', 'stages.shellSpine.meta.artifactDesign', 'stages.campaignPlan.artifactContract'].forEach(function (path) {
    if (artifactPathGet(source, path) !== undefined) findings.push(artifactFinding('artifact-authority-conflict', artifactOwner(path), path,
      'Artifact design has one canonical owner.', [path, ruleRoot + '.artifactDesign']));
  });
  if (artifactPathGet(source, ruleRoot + '.artifactDesign.winCondition') !== undefined) {
    findings.push(artifactFinding('artifact-authority-conflict', 'gameRulebook', ruleRoot + '.artifactDesign.winCondition',
      'Rulebook obligations are siblings of artifactDesign, never copied inside it.'));
  }

  // Recovery is owed only by a structured losable declaration. The topology
  // owner names the answer; the annotation owner dates it.
  asArray(artifactPathGet(source, spineRoot + '.tensionBudget')).forEach(function (row) {
    var losable = String((row || {}).losable || '').trim();
    if (!losable) return;
    // Recovery topology is machine-readable only when fallBehind is itself one
    // exact surface ref. Narrative descriptions such as "map:Route stays
    // shut" remain tension prose and cannot silently create a route contract.
    var answeringRef = String((row || {}).fallBehind || '').trim();
    if (!/^[A-Za-z][A-Za-z0-9-]*:[^\s]+$/.test(answeringRef)) return;
    var consequence = asArray(artifactPathGet(source, spineRoot + '.consequenceEdges')).filter(function (edge) {
      return String((edge || {}).source || '').toLowerCase() === losable.toLowerCase()
        && String((edge || {}).answeredBy || '').toLowerCase() === answeringRef.toLowerCase();
    })[0];
    if (!consequence) {
      findings.push(artifactFinding('artifact-obligation-missing', artifactOwner(spineRoot), spineRoot + '.consequenceEdges',
        'A structured loss declaration has no answering consequence edge.'));
      return;
    }
    var edgeIndex = topology.findIndex(function (edge) {
      return String((edge || {}).from || '').toLowerCase() === losable.toLowerCase()
        && String((edge || {}).to || '').toLowerCase() === String(consequence.answeredBy || '').toLowerCase();
    });
    if (edgeIndex < 0) {
      findings.push(artifactFinding('artifact-obligation-missing', artifactOwner(topologyPath), topologyPath,
        'A structured recovery declaration has no matching topology edge.', [topologyPath]));
      return;
    }
    var paceIndex = pipeline === 'standard' ? pacingSeen[edgeIdentity(topology[edgeIndex])] : edgeIndex;
    var closes = paceIndex === undefined ? undefined : (pacing[paceIndex] || {}).closesAtWeek;
    var due = Number(row.week) + Number(consequence.withinWeeks || 0);
    if (Number.isFinite(Number(closes)) && Number(closes) > due) {
      var closePath = pacingPath + '[' + paceIndex + '].closesAtWeek';
      findings.push(artifactFinding('artifact-obligation-invalid', artifactOwner(closePath), closePath,
        'Recovery closes after its declared answering bound.'));
    }
  });

  direct.sort(function (a, b) { return a.valuePath < b.valuePath ? -1 : (a.valuePath > b.valuePath ? 1 : 0); });
  derived.sort(function (a, b) { return a.valuePath < b.valuePath ? -1 : (a.valuePath > b.valuePath ? 1 : 0); });
  var semanticCanonicalJson = artifactCanonical(mechanics);
  var view = {
    mechanics: mechanics,
    provenance: { direct: direct, derived: derived },
    semanticCanonicalJson: semanticCanonicalJson,
    semanticDigest: artifactSha256(semanticCanonicalJson)
  };
  return { view: artifactDeepFreeze(view), blocking: artifactDeepFreeze(findings.slice()) };
}

function artifactPreparedBook(mechanics) {
  var weeks = asArray(mechanics.weeks);
  var sessions = [];
  var perWeek = [];
  var printWeek = {};
  var lastWeek = weeks.reduce(function (max, row) { return Math.max(max, Number((row || {}).weekNumber) || 0); }, 0) || weeks.length;
  function note(raw, fallback) {
    var parsed = parseSurfaceRef(String(raw || ''));
    if (!parsed || !parsed.valid) return;
    var key = nodeKey(parsed);
    var week = artifactRefWeek(raw, fallback);
    if (parsed.kind === 'boss' || parsed.kind === 'assembly') week = lastWeek;
    if (parsed.kind === 'ending') week = lastWeek + 1;
    if (printWeek[key] === undefined || week < printWeek[key]) printWeek[key] = week;
  }
  weeks.forEach(function (row, index) {
    var week = Number((row || {}).weekNumber) || index + 1;
    var count = Number((row || {}).sessionCount) || 0;
    var floor = Number((row || {}).guaranteedMarksPerSession) || 0;
    for (var session = 1; session <= count; session++) {
      sessions.push({ week: week, session: session, ticks: floor, hasBinaryChoice: false, fragmentRef: '' });
      note('session:W' + week + '.' + session, week);
      note('markStrip:W' + week + '.' + session, week);
    }
    note('week:W' + week, week); note('markStrip:W' + week, week); note('reckoning:W' + week, week);
    var tension = asArray(mechanics.tensionBudget).filter(function (item) { return Number((item || {}).week) === week; })[0] || {};
    perWeek.push({ week: week, ticks: count * floor, sessions: count,
      hasDoor: asArray(mechanics.decisionLedger).some(function (decision) { return artifactRefWeek((decision || {}).fork, -1) === week; }),
      binaryChoices: 0, clocks: String(tension.losable || '').trim() ? [{ name: tension.losable, type: 'danger-clock', losable: true }] : [],
      componentValue: null, isBoss: week === lastWeek });
  });
  asArray(mechanics.economyGraph).forEach(function (edge) { note((edge || {}).from, 1); note((edge || {}).to, lastWeek); });
  // In the authored contract an undated wallet exit stays open through the
  // program. `map:W1` says where the surface first appears, not that spending
  // closes in week one. The assembled reader can recover this distinction
  // from pages; the pre-prose adapter must carry it explicitly into the same
  // transition kernel.
  asArray(mechanics.economyGraph).forEach(function (edge) {
    if (String((edge || {}).from || '').toLowerCase() !== 'banked') return;
    if (Number.isInteger((edge || {}).closesAtWeek) && edge.closesAtWeek > 0) return;
    var target = nodeKey(parseSurfaceRef(String((edge || {}).to || '')));
    if (target) printWeek[target] = Math.max(Number(printWeek[target]) || 0, lastWeek);
  });
  asArray(mechanics.passwordElements).forEach(function (ref) { note(ref, artifactRefWeek(ref, lastWeek)); });
  var required = asArray(((mechanics.winCondition || {}).requires));
  var endgame = required.map(function (ref) {
    var parsed = parseSurfaceRef(String(ref || ''));
    var key = nodeKey(parsed);
    return { label: String(ref), aliases: [key], printWeek: printWeek[key] === undefined ? lastWeek + 1 : printWeek[key], required: true };
  });
  asArray(mechanics.endingVariants).forEach(function (variant) {
    var label = /^ending:/i.test(String(variant || '')) ? String(variant) : 'ending:' + String(variant || '');
    var key = nodeKey(parseSurfaceRef(label));
    if (!key || endgame.some(function (target) { return target.aliases.indexOf(key) !== -1; })) return;
    endgame.push({ label: label, aliases: [key],
      printWeek: printWeek[key] === undefined ? lastWeek + 1 : printWeek[key], required: false });
  });
  return {
    weeks: perWeek, weekCount: weeks.length, sessions: sessions, totalSessions: sessions.length,
    totalTicks: sessions.reduce(function (sum, row) { return sum + row.ticks; }, 0), printWeek: printWeek,
    bossWeek: lastWeek, threshold: null, endWeek: lastWeek + 1, endgame: endgame,
    sealedFragments: [], passwordLength: asArray(mechanics.passwordElements).length
  };
}

function artifactTopologyOwner(view) {
  var provenance = ((view || {}).provenance || {});
  var paths = asArray(provenance.direct).map(function (row) { return row.sourcePath; })
    .concat(asArray(provenance.derived).reduce(function (all, row) {
      return all.concat(asArray((row || {}).inputs).map(function (input) { return input.sourcePath; }));
    }, []));
  var path = paths.filter(function (item) { return /(?:shellSpine|skeleton)\.meta\.playSpine\.economyGraph\[/.test(item); })[0] || '';
  return path.replace(/\[\d+\].*$/, '');
}

function artifactOwnerPathForFinding(view, row) {
  var provenance = (view || {}).provenance || {};
  var mechanics = (view || {}).mechanics || {};
  var graph = asArray(mechanics.economyGraph);
  var detail = row.detail || {};
  var index = graph.findIndex(function (edge) {
    return (!detail.from || edge.from === detail.from) && (!detail.to || edge.to === detail.to)
      && (!detail.node || edge.to === detail.node || String(edge.to || '').toLowerCase() === String(detail.node || '').toLowerCase());
  });
  function provenanceSource(valuePath, suffix, topologyOnly) {
    var directRow = asArray(provenance.direct).filter(function (item) { return item.valuePath === valuePath; })[0];
    if (directRow && (!topologyOnly || /(?:shellSpine|skeleton)\.meta\.playSpine\.economyGraph/.test(directRow.sourcePath))) {
      return directRow.sourcePath;
    }
    var derivedRow = asArray(provenance.derived).filter(function (item) { return item.valuePath === valuePath; })[0];
    var inputs = asArray(derivedRow && derivedRow.inputs);
    return (inputs.filter(function (input) {
      return (!suffix || String(input.sourcePath || '').slice(-suffix.length) === suffix)
        && (!topologyOnly || /(?:shellSpine|skeleton)\.meta\.playSpine\.economyGraph/.test(input.sourcePath || ''));
    })[0] || {}).sourcePath || '';
  }
  if (row.code === 'unaffordable-required-spend' && index >= 0) {
    return provenanceSource('mechanics.economyGraph[' + index + '].price', '.price', false)
      || artifactTopologyOwner(view);
  }
  if ((row.code === 'branch-only-path' || row.code === 'dice-only-path') && index >= 0) {
    var field = row.code === 'branch-only-path' ? 'branch' : 'from';
    return provenanceSource('mechanics.economyGraph[' + index + '].' + field, '.' + field, true)
      || artifactTopologyOwner(view);
  }
  return artifactTopologyOwner(view);
}

/**
 * Execute the current simulator transition kernel over the prose-free view.
 * Findings retain the simulator's public code/bucket shape and gain the exact
 * paid owner path needed by repair routing.
 */
export function proveArtifactContract(view) {
  var mechanics = (view || {}).mechanics || {};
  var spine = {
    economyGraph: artifactClone(asArray(mechanics.economyGraph)),
    consequenceEdges: artifactClone(mechanics.consequenceEdges || []),
    decisionLedger: artifactClone(mechanics.decisionLedger || []),
    tensionBudget: artifactClone(mechanics.tensionBudget || [])
  };
  var preparedBook = artifactPreparedBook(mechanics);
  var report = runTransitionKernel({ meta: { playSpine: spine } }, preparedBook);
  report.transitionKernelId = ARTIFACT_TRANSITION_KERNEL_ID;
  report.semanticDigest = view && view.semanticDigest;
  report.bands.forEach(function (row) {
    var band = SIM_ADHERENCE_BANDS.filter(function (candidate) { return candidate.id === row.band; })[0];
    if (band) row.prefix = adversarialTicksByWeek(preparedBook, band.fraction).prefix;
  });

  // Before prose is funded, every authored price must be numerically usable;
  // an optional choice priced above the strongest possible balance is still a
  // false affordance. The assembled simulator's narrower endgame test remains
  // unchanged, while this contract adapter applies the same arithmetic and
  // preserves the existing public finding code for routing.
  var hardBand = SIM_ADHERENCE_BANDS.filter(function (candidate) { return candidate.id === 'realistic'; })[0]
    || SIM_ADHERENCE_BANDS[SIM_ADHERENCE_BANDS.length - 1];
  var hardPrefix = hardBand ? adversarialTicksByWeek(preparedBook, hardBand.fraction).prefix : {};
  spine.economyGraph.forEach(function (edge) {
    var price = Number((edge || {}).price) || 0;
    if (price <= 0) return;
    var deadline = Number.isInteger((edge || {}).closesAtWeek) && edge.closesAtWeek > 0
      ? Math.min(edge.closesAtWeek, preparedBook.weekCount) : preparedBook.weekCount;
    var banked = Number(hardPrefix[deadline]) || 0;
    if (price <= banked) return;
    if (report.hard.some(function (row) {
      return row.code === 'unaffordable-required-spend'
        && (row.detail || {}).from === edge.from && (row.detail || {}).to === edge.to;
    })) return;
    report.hard.push(finding('unaffordable-required-spend',
      'The authored spend "' + edge.from + ' → ' + edge.to + '" costs ' + price
      + ' marks, but the realistic adherence band can bank at most ' + banked
      + ' by week ' + deadline + '.',
      { from: edge.from, to: edge.to, price: price, banked: banked, deadline: deadline }));
  });

  // The assembled reader normally encounters an oracle after another printed
  // surface feeds it. The pre-prose contract intentionally has no fabricated
  // oracle/session payload. An explicit oracle edge is still authored chance,
  // so retain the kernel's existing dice-only class rather than degrading the
  // diagnosis to generic unreachable merely because printable prose is absent.
  report.hard.forEach(function (row) {
    if (row.code !== 'unreachable-endgame') return;
    var target = String(((row || {}).detail || {}).node || '');
    var chanceEdge = spine.economyGraph.filter(function (edge) { return /^oracle:/i.test(String((edge || {}).from || '')); })
      .filter(function (edge) {
        if (String((edge || {}).to || '').toLowerCase() === target.toLowerCase()) return true;
        var seen = {}; var frontier = [String((edge || {}).to || '')];
        while (frontier.length) {
          var current = frontier.pop();
          if (current.toLowerCase() === target.toLowerCase()) return true;
          if (seen[current]) continue;
          seen[current] = true;
          spine.economyGraph.forEach(function (next) {
            if (String((next || {}).from || '') === current && !/^oracle:/i.test(String((next || {}).from || ''))) {
              frontier.push(String((next || {}).to || ''));
            }
          });
        }
        return false;
      })[0];
    if (!chanceEdge) return;
    row.code = 'dice-only-path';
    row.detail = Object.assign({}, row.detail || {}, { from: chanceEdge.from, to: chanceEdge.to });
  });

  var guaranteed = ((report || {}).holds || {}).greedy || {};
  asArray(mechanics.passwordElements).forEach(function (raw) {
    var key = nodeKey(parseSurfaceRef(String(raw || '')));
    if (guaranteed[key] !== undefined && guaranteed[key] !== INFINITY_WEEK) return;
    if (report.hard.some(function (row) { return row.code === 'password-element-unreachable' && (row.detail || {}).element === raw; })) return;
    report.hard.push(finding('password-element-unreachable',
      'The required password element "' + raw + '" has no guaranteed route before assembly.',
      { element: raw }));
  });
  ['hard', 'soft'].forEach(function (bucket) {
    report[bucket].forEach(function (row) {
      var ownerPath = artifactOwnerPathForFinding(view, row);
      row.detail = Object.assign({}, row.detail || {}, { ownerPath: ownerPath, ownerStage: artifactOwner(ownerPath) });
    });
  });
  return report;
}

// Can `target` be reached from `source` over guaranteed edges? Used by the
// threshold gate: the question is not "is the threshold high" but "does
// anything the book needs sit behind it".
// `skipEdge` is an optional predicate: return true to refuse to TRAVERSE an
// edge without removing it from the graph. One caller uses it (H7), and the
// reason it is a parameter rather than a graph filter is that the edge in
// question is real everywhere else — see the note at H7.
function reachesFrom(graph, sourceKey, targetKey, skipEdge) {
  if (!graph.nodes[sourceKey] || !graph.nodes[targetKey]) return false;
  var seen = {}; seen[sourceKey] = 1;
  var frontier = [sourceKey];
  while (frontier.length) {
    var cur = frontier.pop();
    if (cur === targetKey) return true;
    graph.edges.forEach(function (e) {
      if (e.from !== cur || e.cls !== 'guaranteed') return;
      if (seen[e.to]) return;
      if (typeof skipEdge === 'function' && skipEdge(e)) return;
      seen[e.to] = 1; frontier.push(e.to);
    });
  }
  return false;
}

/**
 * simCorrectionDirectives(report) -> string[]
 *
 * The hard findings as Correction Directives, the defect quoted. Same shape the
 * stage validators emit, so classifyValidationErrors routes them the way it
 * routes every other blocking error.
 */
export function simCorrectionDirectives(report) {
  if (!report || report.skipped) return [];
  return asArray(report.hard).map(function (f) {
    return 'Simulated player → ' + f.message;
  });
}

/**
 * simSoftFindings(report) -> string[]
 *
 * The soft half, for the critic's machine-findings channel.
 */
export function simSoftFindings(report) {
  if (!report || report.skipped) return [];
  return asArray(report.soft).map(function (f) {
    return 'Simulated player → ' + f.message;
  });
}

/**
 * simSummaryLine(report) -> string
 *
 * One line for a log or a report header. Skips say WHY, because a silent skip
 * is indistinguishable from a pass and that is how a gate becomes vacuous.
 */
export function simSummaryLine(report) {
  if (!report) return 'simulated player: no report';
  if (report.skipped) return 'simulated player: SKIPPED — ' + report.skipReason;
  var m = report.measurements || {};
  return 'simulated player: ' + report.hard.length + ' soft-lock(s), ' + report.soft.length
    + ' finding(s) over ' + (m.graphNodes || 0) + ' nodes / ' + (m.graphEdges || 0) + ' edges, '
    + (m.weekCount || 0) + ' weeks, ' + (m.totalTicks || 0) + ' attainable ticks';
}
