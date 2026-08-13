// ════════════════════════════════════════════════════════════════════════════
// THE PUZZLE SOLVERS (W5b · PLAY.md §1 · the Ludic Harvest, tranche 2)
// ════════════════════════════════════════════════════════════════════════════
// THE LAW THIS FILE EXISTS TO ENFORCE: no puzzle ships unsolved-by-machine.
//
// A generated logic grid, nonogram or word search is the first content in this
// project whose CORRECTNESS is not a matter of taste. A cipher can be clumsy
// and still be a cipher; a constrained grid with two solutions is not a hard
// puzzle, it is a broken one, and the player discovers that at the gym with a
// pencil and no way to check. Everything else the pipeline generates is judged
// by floors that ask "is this shaped like play?". These three are judged by a
// machine that actually plays them.
//
// So each family lands with a deterministic solver that proves, at the
// generation gate:
//   (a) SOLVABLE      — the constraints admit at least one solution;
//   (b) UNIQUE        — exactly one, for the constrained grids (a word search
//                       has no uniqueness obligation: it has a declared
//                       placement set, and the obligation is that every word
//                       is genuinely findable and every overlap legal);
//   (c) KEY-MATCHED   — the answer the book prints is the answer the solution
//                       actually yields, derived by a declared, machine-
//                       executable rule rather than asserted.
// A puzzle that fails any of the three is REFUSED at the stage gate with the
// defect quoted, which is the Correction Directive class: the model is told
// what is wrong in terms it can fix, not that "the puzzle is invalid".
//
// ── WHY contracts/, AND WHY NOT contract-constants.mjs ──────────────────────
// Two trees need this and the renderer needs none of it. The generator's stage
// validators (public/generator/modules/validation.js) run it in the BROWSER at
// the moment a week comes back from the model; the floors harness
// (scripts/check-generation-floors.mjs) runs it in NODE. contracts/ is the one
// directory both trees already import across the repo boundary, and it is
// dependency-free by construction — which this file must also be, because a
// solver that needs a package cannot run at the gate that matters.
//
// It is NOT more of contract-constants.mjs for the reason ludic-library.mjs
// gives: the renderer imports the constants on every page load, and it never
// solves anything. Enums and guardrails for these families DO live there (they
// are what the schema accepts); the search is here.
//
// ── WHAT THIS FILE IS NOT ───────────────────────────────────────────────────
// It is not a puzzle GENERATOR. The LLM authors the puzzle; this proves it.
// The difference matters: a constructor would make the engine an author, and
// the schema-driven decision (CLAUDE.md, Architecture) is that the model fills
// structured JSON and the engine renders it. What a solver buys instead is the
// refusal — the model that cannot make a unique grid is told so and tries
// again, and the book never prints a puzzle nobody can finish.
//
// ── THE DIFFICULTY INSTRUMENT ───────────────────────────────────────────────
// Every solver also emits a machine difficulty score, because the spine's
// `difficultyCurve` wants puzzle hardness keyed to the load curve (the
// sudoku-academy law) and "hard" is otherwise an adjective the model grades
// itself on. The score is WORK THE SOLVER DID, per family:
//   logic grid  — inference-chain depth: how many propagation rounds the
//                 constraint solver needed, plus a penalty when propagation
//                 stalls and the puzzle can only be finished by guessing.
//   nonogram    — line-solve passes, plus a heavier penalty per level of
//                 search depth, because a picross that needs a guess is a
//                 different animal from one that line-solves.
//   word search — measured scan load: comparisons the naive finder spends
//                 locating every word, normalised per word. It rises with
//                 filler density and with awkward directions, which is what
//                 "harder to find" means on paper.
// These are PROXIES and are labelled as such. They are deterministic, they are
// monotone in the right direction, and they are recorded for a later wave to
// consume — W5b does not build curve enforcement.

// ── Budgets ─────────────────────────────────────────────────────────────────
// A solver that runs forever is a gate that never fires. Every search here is
// bounded, and EXCEEDING A BUDGET IS A REFUSAL, never a pass: an unprovable
// puzzle and an invalid one are the same thing to a player. The fix for a
// pathological nonogram is a tighter generation guardrail (see
// SPATIAL_GUARDRAILS.constrainedGrid in contract-constants.mjs), never a
// weaker floor.
export var PUZZLE_SOLVER_BUDGETS = {
  // Logic grid: assignments considered. 6 subjects x 2 categories is 720^2 =
  // 518,400 in the worst case, and the per-category prefilter cuts that hard.
  logicGridAssignments: 4000000,
  // Nonogram: DFS nodes expanded across the whole uniqueness proof.
  nonogramNodes: 200000,
  // Nonogram: candidate placements enumerated for ONE line. A 15-cell line
  // tops out near C(15,7) = 6435, so this is generous by design; a line that
  // blows it contributes no forced cells rather than failing the run.
  nonogramLinePlacements: 50000,
  // Word search: cell comparisons the finder is allowed across all words.
  wordSearchComparisons: 4000000
};

// ── Shared helpers ──────────────────────────────────────────────────────────

/**
 * The comparison form for every answer key in this file.
 *
 * Uppercase, alphanumerics only. The SAME normalisation the crypto password
 * path uses (trim, uppercase, alphanumeric — CLAUDE.md, Encrypt/Unlock),
 * because a puzzle answer is very often the thing that opens the finale, and
 * two different notions of "same string" between the gate and the lock is the
 * silent-divergence class this project keeps paying for.
 */
export function normalizeAnswer(value) {
  return String(value == null ? '' : value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function label(puzzle) {
  var title = String((puzzle && puzzle.title) || '').trim();
  return title ? '"' + title + '"' : 'untitled puzzle';
}

/** Every permutation of [0..n-1]. n is guardrailed to 6, so 720 is the cap. */
function permutations(n) {
  var out = [];
  var current = [];
  var used = new Array(n).fill(false);
  (function walk() {
    if (current.length === n) { out.push(current.slice()); return; }
    for (var i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(i);
      walk();
      current.pop();
      used[i] = false;
    }
  })();
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// LOGIC GRID
// ════════════════════════════════════════════════════════════════════════════
// Shape (see contracts/booklet-schema.mjs $defs.constrainedGrid):
//   subjects   : string[]                     the rows — 3..6 distinct entities
//   categories : [{ name, values: string[] }] 1..2 columns groups, each a
//                                             BIJECTION with subjects
//   clues      : [{ text, constraint }]       printed prose + machine form
//   answer     : string
//   answerFrom : { mode: 'cell'|'initials', category, subject? }
//
// The solution is therefore one permutation per category. That is the whole
// model, and it is deliberately the smallest one that carries real logic-grid
// play: classic grids are exactly "each of these is exactly one of those".
//
// The constraint vocabulary is FOUR forms and closed:
//   is      { subject, category, value }                    a positive cell
//   not     { subject, category, value }                    a struck cell
//   same    { category, value, otherCategory, otherValue }  cross-category tie
//   differs { category, value, otherCategory, otherValue }  cross-category bar
// `same`/`differs` are what make a two-category grid a puzzle rather than two
// independent ones, and they are the forms real logic-grid clues take ("the
// one who took the west stair was not the one carrying the ledger"). A fifth
// form would need a fifth propagation rule and a fifth way to be wrong.

var LOGIC_CLUE_KINDS = ['is', 'not', 'same', 'differs'];

function indexOfCategory(puzzle, name) {
  var cats = asArray(puzzle.categories);
  for (var i = 0; i < cats.length; i++) {
    if (String((cats[i] || {}).name) === String(name)) return i;
  }
  return -1;
}

function indexOfValue(category, value) {
  var values = asArray(category && category.values);
  for (var i = 0; i < values.length; i++) {
    if (String(values[i]) === String(value)) return i;
  }
  return -1;
}

/**
 * Structural check. Runs BEFORE any search, so the errors a malformed puzzle
 * produces name the field rather than the search that gave up on it.
 */
function logicGridShapeErrors(puzzle) {
  var errors = [];
  var who = label(puzzle);
  var subjects = asArray(puzzle.subjects).map(String);
  var cats = asArray(puzzle.categories);

  if (subjects.length < 3) {
    errors.push(who + ': a logic grid needs at least 3 subjects, found ' + subjects.length
      + ' — two rows is a coin flip, not a deduction.');
  }
  if (new Set(subjects).size !== subjects.length) {
    errors.push(who + ': subjects repeat — each row must be a distinct entity or the grid has no bijection to solve.');
  }
  if (!cats.length) {
    errors.push(who + ': a logic grid needs at least one category of values to assign.');
  }

  for (var c = 0; c < cats.length; c++) {
    var cat = cats[c] || {};
    var values = asArray(cat.values).map(String);
    var name = String(cat.name || '(unnamed)');
    if (values.length !== subjects.length) {
      errors.push(who + ': category "' + name + '" has ' + values.length + ' values for '
        + subjects.length + ' subjects — a logic grid category is a one-to-one match, so the counts must be equal.');
    }
    if (new Set(values).size !== values.length) {
      errors.push(who + ': category "' + name + '" repeats a value — one-to-one means each value is used exactly once.');
    }
  }
  var catNames = cats.map(function (c2) { return String((c2 || {}).name); });
  if (new Set(catNames).size !== catNames.length) {
    errors.push(who + ': two categories share a name — clues address categories by name, so duplicates are unresolvable.');
  }

  var clues = asArray(puzzle.clues);
  if (!clues.length) {
    errors.push(who + ': no clues — a grid with no constraints has every permutation as a solution.');
  }
  for (var i = 0; i < clues.length; i++) {
    var clue = clues[i] || {};
    var k = clue.constraint || {};
    var at = who + ': clue ' + (i + 1);
    if (!String(clue.text || '').trim()) {
      errors.push(at + ' has no printed text — the player reads prose, the solver reads the constraint, and both must exist.');
      continue;
    }
    if (LOGIC_CLUE_KINDS.indexOf(k.type) === -1) {
      errors.push(at + ' has constraint type "' + String(k.type) + '", which is not one of '
        + LOGIC_CLUE_KINDS.join(' | ') + '.');
      continue;
    }
    if (k.type === 'is' || k.type === 'not') {
      if (subjects.indexOf(String(k.subject)) === -1) {
        errors.push(at + ' names subject "' + String(k.subject) + '", which is not in the subject list.');
      }
      var ci = indexOfCategory(puzzle, k.category);
      if (ci === -1) errors.push(at + ' names category "' + String(k.category) + '", which this grid does not have.');
      else if (indexOfValue(cats[ci], k.value) === -1) {
        errors.push(at + ' names value "' + String(k.value) + '", which is not in category "' + String(k.category) + '".');
      }
    } else {
      var a = indexOfCategory(puzzle, k.category);
      var b = indexOfCategory(puzzle, k.otherCategory);
      if (a === -1) errors.push(at + ' names category "' + String(k.category) + '", which this grid does not have.');
      if (b === -1) errors.push(at + ' names category "' + String(k.otherCategory) + '", which this grid does not have.');
      if (a !== -1 && b !== -1 && a === b) {
        errors.push(at + ' ties category "' + String(k.category) + '" to itself — "' + k.type
          + '" links two DIFFERENT categories; use "is"/"not" for a single-category fact.');
      }
      if (a !== -1 && indexOfValue(cats[a], k.value) === -1) {
        errors.push(at + ' names value "' + String(k.value) + '", which is not in category "' + String(k.category) + '".');
      }
      if (b !== -1 && indexOfValue(cats[b], k.otherValue) === -1) {
        errors.push(at + ' names value "' + String(k.otherValue) + '", which is not in category "' + String(k.otherCategory) + '".');
      }
    }
  }
  return errors;
}

/** Compile clues into closures over permutation arrays, grouped by the highest
 *  category index they touch — which is what makes the nested enumeration
 *  prune instead of brute-force. */
function compileLogicClues(puzzle) {
  var subjects = asArray(puzzle.subjects).map(String);
  var cats = asArray(puzzle.categories);
  var byMaxCat = cats.map(function () { return []; });

  asArray(puzzle.clues).forEach(function (clue) {
    var k = (clue || {}).constraint || {};
    if (k.type === 'is' || k.type === 'not') {
      var ci = indexOfCategory(puzzle, k.category);
      var si = subjects.indexOf(String(k.subject));
      var vi = indexOfValue(cats[ci], k.value);
      var want = k.type === 'is';
      byMaxCat[ci].push(function (perms) { return (perms[ci][si] === vi) === want; });
      return;
    }
    var a = indexOfCategory(puzzle, k.category);
    var b = indexOfCategory(puzzle, k.otherCategory);
    var av = indexOfValue(cats[a], k.value);
    var bv = indexOfValue(cats[b], k.otherValue);
    var same = k.type === 'same';
    var slot = Math.max(a, b);
    byMaxCat[slot].push(function (perms) {
      var holder = perms[a].indexOf(av);
      return (perms[b][holder] === bv) === same;
    });
  });
  return byMaxCat;
}

/**
 * Count solutions, stopping at two. Exhaustive over permutations, pruned
 * per category — the only search shape that is obviously correct, which is
 * what a uniqueness proof has to be.
 */
function enumerateLogicSolutions(puzzle) {
  var cats = asArray(puzzle.categories);
  var n = asArray(puzzle.subjects).length;
  var perms = permutations(n);
  var clueSets = compileLogicClues(puzzle);
  var found = [];
  var work = 0;
  var overBudget = false;

  var current = new Array(cats.length);
  (function descend(c) {
    if (found.length > 1 || overBudget) return;
    if (c === cats.length) { found.push(current.slice()); return; }
    for (var p = 0; p < perms.length; p++) {
      if (found.length > 1 || overBudget) return;
      work++;
      if (work > PUZZLE_SOLVER_BUDGETS.logicGridAssignments) { overBudget = true; return; }
      current[c] = perms[p];
      var ok = true;
      var set = clueSets[c];
      for (var i = 0; i < set.length; i++) {
        if (!set[i](current)) { ok = false; break; }
      }
      if (ok) descend(c + 1);
    }
  })(0);

  return { solutions: found, overBudget: overBudget, work: work };
}

/**
 * Inference-chain depth. A propagation-only solver — no guessing — run purely
 * to MEASURE how deep the chain of deductions goes. It never decides validity;
 * enumerateLogicSolutions owns that. This is the difficulty instrument.
 */
function logicInferenceDepth(puzzle) {
  var subjects = asArray(puzzle.subjects).map(String);
  var cats = asArray(puzzle.categories);
  var n = subjects.length;
  var full = (1 << n) - 1;
  // cand[c][subject] = bitmask of value indices still possible.
  var cand = cats.map(function () { return new Array(n).fill(full); });
  var clues = asArray(puzzle.clues).map(function (c) { return (c || {}).constraint || {}; });

  function subjectsFor(c, v) {
    var mask = 0;
    for (var i = 0; i < n; i++) if (cand[c][i] & (1 << v)) mask |= (1 << i);
    return mask;
  }
  function restrictValueToSubjects(c, v, subjectMask) {
    var changed = false;
    for (var i = 0; i < n; i++) {
      if ((subjectMask & (1 << i)) === 0 && (cand[c][i] & (1 << v))) {
        cand[c][i] &= ~(1 << v);
        changed = true;
      }
    }
    return changed;
  }

  var rounds = 0;
  var changed = true;
  while (changed && rounds < 64) {
    changed = false;
    rounds++;

    for (var q = 0; q < clues.length; q++) {
      var k = clues[q];
      if (k.type === 'is' || k.type === 'not') {
        var ci = indexOfCategory(puzzle, k.category);
        var si = subjects.indexOf(String(k.subject));
        var vi = indexOfValue(cats[ci], k.value);
        if (ci === -1 || si === -1 || vi === -1) continue;
        var next = k.type === 'is' ? (1 << vi) : (cand[ci][si] & ~(1 << vi));
        if (next !== cand[ci][si]) { cand[ci][si] = next; changed = true; }
      } else {
        var a = indexOfCategory(puzzle, k.category);
        var b = indexOfCategory(puzzle, k.otherCategory);
        if (a === -1 || b === -1 || a === b) continue;
        var av = indexOfValue(cats[a], k.value);
        var bv = indexOfValue(cats[b], k.otherValue);
        if (av === -1 || bv === -1) continue;
        if (k.type === 'same') {
          // The holder of `value` in A is the holder of `otherValue` in B, so
          // the two candidate subject sets are the same set.
          var both = subjectsFor(a, av) & subjectsFor(b, bv);
          if (restrictValueToSubjects(a, av, both)) changed = true;
          if (restrictValueToSubjects(b, bv, both)) changed = true;
        } else {
          for (var i2 = 0; i2 < n; i2++) {
            if (cand[a][i2] === (1 << av) && (cand[b][i2] & (1 << bv))) {
              cand[b][i2] &= ~(1 << bv); changed = true;
            }
            if (cand[b][i2] === (1 << bv) && (cand[a][i2] & (1 << av))) {
              cand[a][i2] &= ~(1 << av); changed = true;
            }
          }
        }
      }
    }

    // Naked singles (a subject fixed to one value frees that value elsewhere)
    // and hidden singles (a value possible for one subject fixes that subject).
    for (var c2 = 0; c2 < cats.length; c2++) {
      for (var i3 = 0; i3 < n; i3++) {
        var m = cand[c2][i3];
        if (m && (m & (m - 1)) === 0) {
          for (var j = 0; j < n; j++) {
            if (j !== i3 && (cand[c2][j] & m)) { cand[c2][j] &= ~m; changed = true; }
          }
        }
      }
      for (var v2 = 0; v2 < n; v2++) {
        var sm = subjectsFor(c2, v2);
        if (sm && (sm & (sm - 1)) === 0) {
          var only = Math.log2(sm) | 0;
          if (cand[c2][only] !== (1 << v2)) { cand[c2][only] = (1 << v2); changed = true; }
        }
      }
    }
  }

  var solvedByInference = true;
  for (var c3 = 0; c3 < cats.length; c3++) {
    for (var i4 = 0; i4 < n; i4++) {
      var mm = cand[c3][i4];
      if (!mm || (mm & (mm - 1)) !== 0) { solvedByInference = false; break; }
    }
    if (!solvedByInference) break;
  }

  return {
    score: rounds + (solvedByInference ? 0 : 5),
    basis: 'inference-rounds',
    rounds: rounds,
    requiresGuess: !solvedByInference
  };
}

/** The declared answer, derived from a solved grid. */
function logicGridAnswerFrom(puzzle, solution) {
  var from = puzzle.answerFrom || {};
  var subjects = asArray(puzzle.subjects).map(String);
  var cats = asArray(puzzle.categories);
  var ci = indexOfCategory(puzzle, from.category);
  if (ci === -1) return null;
  var values = asArray(cats[ci].values).map(String);

  if (from.mode === 'cell') {
    var si = subjects.indexOf(String(from.subject));
    if (si === -1) return null;
    return values[solution[ci][si]];
  }
  if (from.mode === 'initials') {
    return subjects.map(function (_s, i) { return values[solution[ci][i]].charAt(0); }).join('');
  }
  return null;
}

function logicGridAnswerShapeErrors(puzzle) {
  var errors = [];
  var who = label(puzzle);
  var from = puzzle.answerFrom || {};
  if (from.mode !== 'cell' && from.mode !== 'initials') {
    errors.push(who + ': answerFrom.mode is "' + String(from.mode)
      + '" — a logic grid reads its answer as "cell" (one subject\'s value) or "initials" '
      + '(the first letters of a category in subject order). Any other rule is not machine-checkable.');
    return errors;
  }
  if (indexOfCategory(puzzle, from.category) === -1) {
    errors.push(who + ': answerFrom names category "' + String(from.category) + '", which this grid does not have.');
  }
  if (from.mode === 'cell' && asArray(puzzle.subjects).map(String).indexOf(String(from.subject)) === -1) {
    errors.push(who + ': answerFrom.mode "cell" names subject "' + String(from.subject)
      + '", which is not in the subject list.');
  }
  if (!normalizeAnswer(puzzle.answer)) {
    errors.push(who + ': the answer is empty once normalised — the grid must yield something the economy can read.');
  }
  return errors;
}

/**
 * solveLogicGrid(puzzle) -> { ok, errors, solutionCount, solution, difficulty }
 *
 * `solutionCount` is 0, 1, or 2 where 2 means "at least two" — the search
 * stops as soon as a second solution exists, because the only question is
 * whether the puzzle is unique.
 */
export function solveLogicGrid(puzzle) {
  var out = { ok: false, errors: [], solutionCount: 0, solution: null, difficulty: null };
  var p = puzzle || {};
  var who = label(p);

  out.errors = logicGridShapeErrors(p).concat(logicGridAnswerShapeErrors(p));
  if (out.errors.length) return out;

  var run = enumerateLogicSolutions(p);
  if (run.overBudget) {
    out.errors.push(who + ': the uniqueness proof exceeded the solver budget after '
      + run.work + ' assignments — shrink the grid (fewer subjects or one category) '
      + 'until it can be proven, because an unprovable puzzle and a broken one are the same to a player.');
    return out;
  }

  out.solutionCount = run.solutions.length;
  if (!run.solutions.length) {
    out.errors.push(who + ': the clues have NO solution — they contradict each other, so the printed grid cannot be completed.');
    return out;
  }
  if (run.solutions.length > 1) {
    out.errors.push(who + ': the clues admit more than one solution — a logic grid must have exactly one. '
      + 'Add a clue that separates the remaining possibilities.');
    return out;
  }

  out.solution = run.solutions[0];
  out.difficulty = logicInferenceDepth(p);

  var derived = logicGridAnswerFrom(p, out.solution);
  if (derived == null) {
    out.errors.push(who + ': the answer rule could not be applied to the solved grid.');
    return out;
  }
  if (normalizeAnswer(derived) !== normalizeAnswer(p.answer)) {
    out.errors.push(who + ': the solved grid yields "' + derived + '" but the puzzle declares the answer "'
      + String(p.answer) + '" — the key must be what the grid actually produces.');
    return out;
  }

  out.ok = true;
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// NONOGRAM
// ════════════════════════════════════════════════════════════════════════════
// Shape:
//   rowClues   : integer[][]     one run-list per row
//   colClues   : integer[][]     one run-list per column
//   letterGrid : string[]        rows of single characters, same dimensions
//   answer     : string
//   answerFrom : { mode: 'grid-letters' }
//
// ── WHY letterGrid IS REQUIRED, AND WHY IT IS THE ONLY ANSWER MODE ──────────
// A classic picross outputs a PICTURE, and "the shape reads as a K" is not a
// thing a machine can check. The registry entry is explicit that the output is
// "a coordinate, digit string, or symbol the economy reads" — so a nonogram
// with no machine-derivable answer is not a lock, it is a drawing with a
// caption asserting what it depicts.
//
// The letter grid closes that hole without breaking the puzzle: SOME cells
// print a faint character, the player shades the solved cells, and the shaded
// characters read in row-major order are the key. It is a real print-and-play
// form, it prints in B&W, it needs no colour and no second sheet, and it is
// exactly derivable from the unique solution. A "shape" mode was considered
// and cut: it can prove solvability and uniqueness but never (c), and a gate
// that checks two of its three obligations reads as a gate.
//
// THE GRID IS SPARSE ON PURPOSE. `.` means "this cell carries no character",
// and most cells will be dots. Lettering every cell would chain the answer's
// LENGTH to the picture's fill count — a 10x10 with a 40-cell picture would
// have a forty-character "key" — which is not a key, it is a transcript. A
// scattering of characters, some inside the picture and some outside it as
// decoys, gives a short key and makes the unshaded characters wrong answers,
// which is the escape-room move this family is worth having for.

function nonogramShapeErrors(puzzle) {
  var errors = [];
  var who = label(puzzle);
  var rowClues = asArray(puzzle.rowClues);
  var colClues = asArray(puzzle.colClues);
  var h = rowClues.length;
  var w = colClues.length;

  if (h < 3 || w < 3) {
    errors.push(who + ': a nonogram needs at least 3 rows and 3 columns, found ' + h + 'x' + w + '.');
    return errors;
  }
  // The line solver packs a line's forced-cell sets into a 32-bit mask, so a
  // line longer than 30 would silently lose its high cells. The generation
  // guardrail caps at a fraction of this; the check is here so the SOLVER is
  // self-protecting rather than trusting a constant it does not import.
  if (h > 30 || w > 30) {
    errors.push(who + ': a nonogram larger than 30 in either axis cannot be proven by this solver '
      + '(the line masks are 32-bit) — and at that size it is not a half-letter page anyway.');
    return errors;
  }

  var rowSum = 0;
  var colSum = 0;
  var i;
  for (i = 0; i < h; i++) {
    var rc = asArray(rowClues[i]).map(Number);
    if (!rc.length || rc.some(function (n) { return !(n > 0) || Math.floor(n) !== n; })) {
      errors.push(who + ': row ' + (i + 1) + ' has a clue that is not a list of positive whole runs '
        + '— use [0] only by omitting the run, never a zero or a fraction.');
      continue;
    }
    var need = rc.reduce(function (a, b) { return a + b; }, 0) + rc.length - 1;
    if (need > w) {
      errors.push(who + ': row ' + (i + 1) + ' asks for runs needing ' + need + ' cells in a row '
        + w + ' wide — the clue cannot fit.');
    }
    rowSum += rc.reduce(function (a, b) { return a + b; }, 0);
  }
  for (i = 0; i < w; i++) {
    var cc = asArray(colClues[i]).map(Number);
    if (!cc.length || cc.some(function (n) { return !(n > 0) || Math.floor(n) !== n; })) {
      errors.push(who + ': column ' + (i + 1) + ' has a clue that is not a list of positive whole runs.');
      continue;
    }
    var needC = cc.reduce(function (a, b) { return a + b; }, 0) + cc.length - 1;
    if (needC > h) {
      errors.push(who + ': column ' + (i + 1) + ' asks for runs needing ' + needC + ' cells in a column '
        + h + ' tall — the clue cannot fit.');
    }
    colSum += cc.reduce(function (a, b) { return a + b; }, 0);
  }
  if (!errors.length && rowSum !== colSum) {
    errors.push(who + ': the row clues fill ' + rowSum + ' cells and the column clues fill ' + colSum
      + ' — a nonogram\'s two clue sets describe the same picture, so their totals must match.');
  }

  var letters = asArray(puzzle.letterGrid);
  var lettered = 0;
  if (letters.length !== h) {
    errors.push(who + ': letterGrid has ' + letters.length + ' rows for ' + h
      + ' row clues — the characters are printed IN the cells, so the grids must be the same size.');
  } else {
    for (i = 0; i < h; i++) {
      var row = String(letters[i] || '').toUpperCase();
      if (row.length !== w) {
        errors.push(who + ': letterGrid row ' + (i + 1) + ' has ' + row.length + ' characters for '
          + w + ' columns — use "." for a cell that carries no character.');
      }
      if (/[^A-Z0-9.]/.test(row)) {
        errors.push(who + ': letterGrid row ' + (i + 1) + ' contains something other than a letter, a digit '
          + 'or "." — one printable character per cell, "." for none.');
      }
      lettered += row.replace(/[^A-Z0-9]/g, '').length;
    }
    if (!lettered) {
      errors.push(who + ': letterGrid carries no characters at all — then the solved picture spells nothing '
        + 'and the puzzle has no output the economy can read.');
    }
  }

  if ((puzzle.answerFrom || {}).mode !== 'grid-letters') {
    errors.push(who + ': answerFrom.mode is "' + String((puzzle.answerFrom || {}).mode)
      + '" — a nonogram reads its answer as "grid-letters": the letters in the solved cells, row by row. '
      + 'No other rule can be checked against the picture.');
  }
  if (!normalizeAnswer(puzzle.answer)) {
    errors.push(who + ': the answer is empty once normalised.');
  }
  return errors;
}

/** All placements of `clue` in a line of length `len` consistent with `known`
 *  (-1 unknown, 0 empty, 1 filled). Returns the AND-intersections, or null
 *  when there are none (contradiction) or the enumeration blew its budget. */
function lineForced(clue, known, len, counters) {
  var allFilled = -1;   // bitwise AND of every candidate's filled mask
  var allEmpty = -1;    // bitwise AND of every candidate's empty mask
  var count = 0;
  var over = false;

  var line = new Array(len);
  (function place(ci, at) {
    if (over || count > PUZZLE_SOLVER_BUDGETS.nonogramLinePlacements) { over = true; return; }
    if (ci === clue.length) {
      for (var t = at; t < len; t++) {
        if (known[t] === 1) return;
        line[t] = 0;
      }
      var fm = 0;
      var em = 0;
      for (var i = 0; i < len; i++) {
        if (line[i] === 1) fm |= (1 << i); else em |= (1 << i);
      }
      allFilled = allFilled === -1 ? fm : (allFilled & fm);
      allEmpty = allEmpty === -1 ? em : (allEmpty & em);
      count++;
      counters.placements++;
      return;
    }
    var run = clue[ci];
    var remaining = clue.slice(ci).reduce(function (a, b) { return a + b; }, 0) + (clue.length - ci - 1);
    for (var start = at; start + remaining <= len; start++) {
      var ok = true;
      var s;
      for (s = at; s < start; s++) {
        if (known[s] === 1) { ok = false; break; }
      }
      if (!ok) break;   // a filled cell was skipped; no later start can fix it
      for (s = start; s < start + run; s++) {
        if (known[s] === 0) { ok = false; break; }
      }
      if (!ok) continue;
      var gap = start + run;
      if (gap < len && known[gap] === 1) continue;
      for (s = at; s < start; s++) line[s] = 0;
      for (s = start; s < start + run; s++) line[s] = 1;
      if (gap < len) line[gap] = 0;
      place(ci + 1, gap + 1);
      if (over) return;
    }
  })(0, 0);

  if (over) return { forcedFilled: 0, forcedEmpty: 0, count: count, over: true };
  if (!count) return null;
  return { forcedFilled: allFilled, forcedEmpty: allEmpty, count: count, over: false };
}

/** Line-solve to fixpoint. Returns false on contradiction. */
function nonogramPropagate(state, rowClues, colClues, h, w, counters) {
  var changed = true;
  var passes = 0;
  while (changed) {
    changed = false;
    passes++;
    if (passes > 128) break;
    var i;
    var j;
    var known;
    var res;
    for (i = 0; i < h; i++) {
      known = new Array(w);
      for (j = 0; j < w; j++) known[j] = state[i * w + j];
      res = lineForced(rowClues[i], known, w, counters);
      if (res === null) return false;
      if (res.over) continue;
      for (j = 0; j < w; j++) {
        var want = (res.forcedFilled & (1 << j)) ? 1 : ((res.forcedEmpty & (1 << j)) ? 0 : -1);
        if (want !== -1 && state[i * w + j] === -1) { state[i * w + j] = want; changed = true; }
      }
    }
    for (j = 0; j < w; j++) {
      known = new Array(h);
      for (i = 0; i < h; i++) known[i] = state[i * w + j];
      res = lineForced(colClues[j], known, h, counters);
      if (res === null) return false;
      if (res.over) continue;
      for (i = 0; i < h; i++) {
        var wantC = (res.forcedFilled & (1 << i)) ? 1 : ((res.forcedEmpty & (1 << i)) ? 0 : -1);
        if (wantC !== -1 && state[i * w + j] === -1) { state[i * w + j] = wantC; changed = true; }
      }
    }
  }
  counters.passes = Math.max(counters.passes, passes);
  return true;
}

function nonogramComplete(state, rowClues, colClues, h, w) {
  function runs(cells) {
    var out = [];
    var run = 0;
    for (var i = 0; i < cells.length; i++) {
      if (cells[i] === 1) run++;
      else if (run) { out.push(run); run = 0; }
    }
    if (run) out.push(run);
    return out;
  }
  var i;
  var j;
  for (i = 0; i < h; i++) {
    var row = [];
    for (j = 0; j < w; j++) row.push(state[i * w + j]);
    if (runs(row).join(',') !== rowClues[i].join(',')) return false;
  }
  for (j = 0; j < w; j++) {
    var col = [];
    for (i = 0; i < h; i++) col.push(state[i * w + j]);
    if (runs(col).join(',') !== colClues[j].join(',')) return false;
  }
  return true;
}

/**
 * solveNonogram(puzzle) -> { ok, errors, solutionCount, solution, difficulty }
 *
 * `solution` is a string[] of '#' and '.' rows — the same form the answer key
 * would be written in by hand, so a human reading a failure can check it.
 */
export function solveNonogram(puzzle) {
  var out = { ok: false, errors: [], solutionCount: 0, solution: null, difficulty: null };
  var p = puzzle || {};
  var who = label(p);

  out.errors = nonogramShapeErrors(p);
  if (out.errors.length) return out;

  var rowClues = asArray(p.rowClues).map(function (r) { return asArray(r).map(Number); });
  var colClues = asArray(p.colClues).map(function (c) { return asArray(c).map(Number); });
  var h = rowClues.length;
  var w = colClues.length;

  var counters = { nodes: 0, placements: 0, passes: 0, guessDepth: 0 };
  var solutions = [];
  var overBudget = false;

  var root = new Int8Array(h * w).fill(-1);
  if (!nonogramPropagate(root, rowClues, colClues, h, w, counters)) {
    out.errors.push(who + ': the row and column clues contradict each other — the picture cannot be drawn.');
    return out;
  }
  var rootPasses = counters.passes;

  (function search(state, depth) {
    if (solutions.length > 1 || overBudget) return;
    counters.nodes++;
    if (counters.nodes > PUZZLE_SOLVER_BUDGETS.nonogramNodes) { overBudget = true; return; }

    var idx = -1;
    for (var i = 0; i < state.length; i++) {
      if (state[i] === -1) { idx = i; break; }
    }
    if (idx === -1) {
      if (nonogramComplete(state, rowClues, colClues, h, w)) solutions.push(Int8Array.from(state));
      return;
    }
    counters.guessDepth = Math.max(counters.guessDepth, depth + 1);
    for (var t = 0; t < 2; t++) {
      var branch = Int8Array.from(state);
      branch[idx] = t === 0 ? 1 : 0;
      if (nonogramPropagate(branch, rowClues, colClues, h, w, counters)) search(branch, depth + 1);
      if (solutions.length > 1 || overBudget) return;
    }
  })(root, 0);

  if (overBudget) {
    out.errors.push(who + ': the uniqueness proof exceeded the solver budget after ' + counters.nodes
      + ' search steps — shrink the grid or add clue structure until the picture is line-solvable. '
      + 'A nonogram a machine cannot prove is one a player cannot finish honestly.');
    return out;
  }

  out.solutionCount = solutions.length;
  if (!solutions.length) {
    out.errors.push(who + ': the clues have NO solution.');
    return out;
  }
  if (solutions.length > 1) {
    out.errors.push(who + ': the clues admit more than one picture — a nonogram must have exactly one. '
      + 'Adjust a run so the ambiguous block resolves.');
    return out;
  }

  var solved = solutions[0];
  var rows = [];
  var letters = [];
  for (var r = 0; r < h; r++) {
    var line = '';
    for (var c = 0; c < w; c++) {
      var on = solved[r * w + c] === 1;
      line += on ? '#' : '.';
      var ch = String(p.letterGrid[r]).toUpperCase().charAt(c);
      if (on && /[A-Z0-9]/.test(ch)) letters.push(ch);
    }
    rows.push(line);
  }
  if (!letters.length) {
    out.errors.push(who + ': the solved picture covers no lettered cell — the shaded cells spell nothing, '
      + 'so move a character into the picture.');
    return out;
  }
  out.solution = rows;
  out.difficulty = {
    score: rootPasses + 10 * counters.guessDepth,
    basis: 'line-solve-passes',
    passes: rootPasses,
    requiresGuess: counters.guessDepth > 0,
    guessDepth: counters.guessDepth
  };

  var derived = letters.join('');
  if (normalizeAnswer(derived) !== normalizeAnswer(p.answer)) {
    out.errors.push(who + ': the solved cells spell "' + derived + '" but the puzzle declares the answer "'
      + String(p.answer) + '" — the key must be what the grid actually produces.');
    return out;
  }

  out.ok = true;
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// WORD SEARCH
// ════════════════════════════════════════════════════════════════════════════
// Shape:
//   grid       : string[]        rows of letters
//   words      : [{ word, row, col, direction }]   1-based row/col
//   answer     : string
//   answerFrom : { mode: 'leftovers'|'word', index? }
//
// There is no uniqueness obligation here and pretending otherwise would be
// theatre: a letter grid contains whatever it contains, and a word appearing
// twice is not a defect. The obligations that ARE real:
//   - every declared placement genuinely spells its word in the printed grid.
//     This is also what makes overlaps legal BY CONSTRUCTION: two words that
//     cross agree because both read the same cell, so there is no separate
//     consistency check to forget.
//   - the answer rule applies, and for "leftovers" the uncovered cells really
//     do spell the key.
//
// The independent finder below is NOT a third obligation, and saying so is the
// point: once a placement verifies, the word is in the grid by definition, so
// a "findability" check would be a tautology dressed as a gate. It earns its
// place for two other reasons. It is the difficulty instrument — the scan load
// it measures IS what makes a word search hard on paper. And it is a MIRROR:
// it walks a direction with its own arithmetic, so if it ever failed to find a
// word whose placement verified, one of the two readers would be wrong. That
// disagreement is reported as a solver defect rather than a content defect.

export var WORD_SEARCH_DIRECTIONS = {
  E: [0, 1], W: [0, -1], S: [1, 0], N: [-1, 0],
  SE: [1, 1], SW: [1, -1], NE: [-1, 1], NW: [-1, -1]
};

/** Directions that read backwards or on a diagonal — the ones that make a
 *  grid harder to scan, and the term the difficulty proxy weights. */
var AWKWARD_DIRECTIONS = { W: 1, N: 1, SW: 1, NE: 1, NW: 1 };

function wordGridShapeErrors(puzzle) {
  var errors = [];
  var who = label(puzzle);
  var grid = asArray(puzzle.grid).map(function (r) { return String(r == null ? '' : r).toUpperCase(); });
  var words = asArray(puzzle.words);

  if (grid.length < 4) {
    errors.push(who + ': a word search needs at least 4 rows, found ' + grid.length + '.');
    return errors;
  }
  var w = grid[0].length;
  if (w < 4) {
    errors.push(who + ': a word search needs at least 4 columns, found ' + w + '.');
    return errors;
  }
  for (var i = 0; i < grid.length; i++) {
    if (grid[i].length !== w) {
      errors.push(who + ': grid row ' + (i + 1) + ' has ' + grid[i].length + ' letters but row 1 has ' + w
        + ' — the grid must be rectangular or the coordinates mean nothing.');
    }
    if (/[^A-Z]/.test(grid[i])) {
      errors.push(who + ': grid row ' + (i + 1) + ' contains a non-letter — every cell holds exactly one A-Z character.');
    }
  }
  if (!words.length) {
    errors.push(who + ': no words to find.');
  }
  var seen = {};
  for (var j = 0; j < words.length; j++) {
    var entry = words[j] || {};
    var word = String(entry.word || '').toUpperCase();
    var at = who + ': word ' + (j + 1);
    if (word.length < 3) {
      errors.push(at + ' ("' + word + '") is shorter than 3 letters — a two-letter word is noise, not a find.');
    }
    if (/[^A-Z]/.test(word)) {
      errors.push(at + ' ("' + word + '") contains a non-letter; word-search entries are A-Z only.');
    }
    if (seen[word]) errors.push(at + ' repeats "' + word + '" — list each word once.');
    seen[word] = true;
    if (!WORD_SEARCH_DIRECTIONS[entry.direction]) {
      errors.push(at + ' has direction "' + String(entry.direction) + '", which is not one of '
        + Object.keys(WORD_SEARCH_DIRECTIONS).join(' | ') + '.');
    }
  }

  var from = puzzle.answerFrom || {};
  if (from.mode !== 'leftovers' && from.mode !== 'word') {
    errors.push(who + ': answerFrom.mode is "' + String(from.mode)
      + '" — a word search reads its answer as "leftovers" (the uncovered letters, row by row) '
      + 'or "word" (one entry from the list).');
  }
  if (from.mode === 'word') {
    var idx = Number(from.index);
    if (!(idx >= 1 && idx <= words.length && Math.floor(idx) === idx)) {
      errors.push(who + ': answerFrom.index is ' + String(from.index) + ' but the list has '
        + words.length + ' words (index is 1-based).');
    }
  }
  if (!normalizeAnswer(puzzle.answer)) {
    errors.push(who + ': the answer is empty once normalised.');
  }
  return errors;
}

/**
 * Independent finder. Scans every cell x every direction and returns the
 * comparison count — which is both the findability proof and the difficulty
 * instrument, because "how much scanning this costs" is exactly what makes a
 * word search hard on paper.
 */
function findWord(grid, word, h, w, counters) {
  var dirs = Object.keys(WORD_SEARCH_DIRECTIONS);
  for (var r = 0; r < h; r++) {
    for (var c = 0; c < w; c++) {
      for (var d = 0; d < dirs.length; d++) {
        var step = WORD_SEARCH_DIRECTIONS[dirs[d]];
        var ok = true;
        for (var k = 0; k < word.length; k++) {
          var rr = r + step[0] * k;
          var cc = c + step[1] * k;
          counters.comparisons++;
          if (counters.comparisons > PUZZLE_SOLVER_BUDGETS.wordSearchComparisons) return null;
          if (rr < 0 || rr >= h || cc < 0 || cc >= w || grid[rr].charAt(cc) !== word.charAt(k)) {
            ok = false;
            break;
          }
        }
        if (ok) return { row: r + 1, col: c + 1, direction: dirs[d] };
      }
    }
  }
  return false;
}

/**
 * verifyWordSearch(puzzle) -> { ok, errors, difficulty, coverage }
 */
export function verifyWordSearch(puzzle) {
  var out = { ok: false, errors: [], difficulty: null, coverage: null };
  var p = puzzle || {};
  var who = label(p);

  out.errors = wordGridShapeErrors(p);
  if (out.errors.length) return out;

  var grid = asArray(p.grid).map(function (r) { return String(r).toUpperCase(); });
  var h = grid.length;
  var w = grid[0].length;
  var words = asArray(p.words);
  var covered = new Set();
  var awkward = 0;
  var counters = { comparisons: 0 };

  for (var j = 0; j < words.length; j++) {
    var entry = words[j] || {};
    var word = String(entry.word).toUpperCase();
    var step = WORD_SEARCH_DIRECTIONS[entry.direction];
    var r0 = Number(entry.row) - 1;
    var c0 = Number(entry.col) - 1;
    var at = who + ': "' + word + '"';

    var endR = r0 + step[0] * (word.length - 1);
    var endC = c0 + step[1] * (word.length - 1);
    if (r0 < 0 || c0 < 0 || r0 >= h || c0 >= w || endR < 0 || endC < 0 || endR >= h || endC >= w) {
      out.errors.push(at + ' is placed at row ' + entry.row + ', column ' + entry.col + ' heading '
        + entry.direction + ', which runs off the ' + h + 'x' + w + ' grid.');
      continue;
    }

    var spelled = '';
    var cells = [];
    for (var k = 0; k < word.length; k++) {
      var rr = r0 + step[0] * k;
      var cc = c0 + step[1] * k;
      spelled += grid[rr].charAt(cc);
      cells.push(rr * w + cc);
    }
    if (spelled !== word) {
      out.errors.push(at + ' is declared at row ' + entry.row + ', column ' + entry.col + ' heading '
        + entry.direction + ', but the grid spells "' + spelled + '" there — the placement and the printed '
        + 'letters must agree, or the word is not in the puzzle the player holds.');
      continue;
    }
    cells.forEach(function (cell) { covered.add(cell); });
    if (AWKWARD_DIRECTIONS[entry.direction]) awkward++;

    var found = findWord(grid, word, h, w, counters);
    if (found === null) {
      out.errors.push(who + ': the findability scan exceeded the solver budget — shrink the grid or the word list.');
      return out;
    }
    if (!found) {
      // Unreachable unless the two traversals disagree — see the mirror note
      // in this section's header. Reported as a solver defect, not a content
      // one, because the content already proved itself one line above.
      out.errors.push(at + ' verified at its declared placement but the independent scan could not find it — '
        + 'the two direction readers in puzzle-solvers.mjs disagree, which is a solver defect, not a puzzle defect.');
    }
  }
  if (out.errors.length) return out;

  var leftovers = '';
  for (var i = 0; i < h * w; i++) {
    if (!covered.has(i)) leftovers += grid[Math.floor(i / w)].charAt(i % w);
  }

  var from = p.answerFrom || {};
  var derived = from.mode === 'leftovers'
    ? leftovers
    : String((words[Number(from.index) - 1] || {}).word || '');

  if (normalizeAnswer(derived) !== normalizeAnswer(p.answer)) {
    out.errors.push(who + ': ' + (from.mode === 'leftovers'
      ? 'the letters left over after every word is struck out read "' + derived + '"'
      : 'word ' + from.index + ' is "' + derived + '"')
      + ' but the puzzle declares the answer "' + String(p.answer)
      + '" — the key must be what the grid actually produces.');
    return out;
  }

  out.coverage = { cells: h * w, covered: covered.size, leftovers: leftovers.length };
  out.difficulty = {
    score: Math.round(counters.comparisons / Math.max(1, words.length) / 10) + 3 * awkward,
    basis: 'search-load',
    comparisons: counters.comparisons,
    awkwardDirections: awkward
  };
  out.ok = true;
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// THE TWO ENTRY POINTS THE GATES CALL
// ════════════════════════════════════════════════════════════════════════════
// One per schema surface, dispatching on `kind`, so a caller never has to know
// which families exist — adding a third constrained-grid kind is one branch
// here and one enum value, not an edit at every gate.

export function verifyConstrainedGrid(grid) {
  var g = grid || {};
  if (g.kind === 'logic-grid') return solveLogicGrid(g);
  if (g.kind === 'nonogram') return solveNonogram(g);
  return {
    ok: false,
    errors: [label(g) + ': constrainedGrid.kind is "' + String(g.kind)
      + '", which no solver knows. Nothing ships unsolved-by-machine, so an unknown kind is refused.'],
    solutionCount: 0,
    solution: null,
    difficulty: null
  };
}

export function verifyWordGrid(wordGrid) {
  var g = wordGrid || {};
  if (g.kind === 'word-search') return verifyWordSearch(g);
  return {
    ok: false,
    errors: [label(g) + ': wordGrid.kind is "' + String(g.kind)
      + '", which no solver knows. Nothing ships unsolved-by-machine, so an unknown kind is refused.'],
    difficulty: null,
    coverage: null
  };
}
