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
  wordSearchComparisons: 4000000,
  // ── The filled grids (the arsenal wave) ─────────────────────────────────
  // Search nodes expanded across the whole uniqueness proof, one budget per
  // family because the searches are shaped differently. A 9x9 sudoku at the
  // guardrailed blank ratio line-solves or needs a shallow guess; 200k nodes is
  // roughly two orders of magnitude of headroom over that, and a grid that
  // wants more is a grid whose uniqueness the player cannot find either.
  sudokuNodes: 200000,
  // Kakuro searches a wider branching factor (nine digits, no givens at all),
  // so it gets more room — but the combination propagation does most of the
  // work and a well-formed grid rarely reaches four figures.
  kakuroNodes: 400000,
  // The per-run combination enumeration. C(9,4) = 126 at the widest useful run,
  // so this is generous; a run that blows it contributes no propagation rather
  // than failing the proof.
  kakuroCombosPerRun: 20000,
  // KenKen's cage enumeration is size^cells, capped by the guardrail at 6^4 =
  // 1296 per cage per round; the node budget bounds the search around it.
  kenkenNodes: 400000
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

// EXPORTED SO THE MIRROR CAN BE CHECKED. This file cannot import
// contract-constants.mjs — it is dependency-free by construction so it can run
// at both gates — so its closed vocabularies are unavoidably second copies of
// enums that live there. Until the arsenal wave nothing held them equal, and
// `puzzleSolverVocabularyParity()` in validate.mjs now does, in both
// directions: a clue form the schema accepts and the solver cannot propagate is
// a puzzle the gate waves through, and one the solver knows and the schema
// rejects is a branch no book can reach.
export var LOGIC_CLUE_KINDS = ['is', 'not', 'same', 'differs'];

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
// THE FILLED GRIDS — sudoku, kakuro, KenKen  (the arsenal wave)
// ════════════════════════════════════════════════════════════════════════════
// Three families that share one printed object — a matrix of cells the player
// writes DIGITS into — and therefore share the answer rule, the candidate
// machinery and the shape of the proof. They were tier 3 in the Ludic Library
// for exactly one reason, stated there: "a kakuro is a constrained integer
// partition, which is neither [a permutation search nor a line-solve], and the
// law is that nothing ships a puzzle a machine cannot finish." This section is
// that missing proof.
//
// WHY ONE ANSWER MODE FOR ALL THREE. A solved filled grid is a rectangle of
// digits, and the only machine-executable way to read a KEY off it is to name
// the cells to read and the order to read them in. `answerFrom.mode` is
// therefore `cells` everywhere here, with `cells: [{row, col}]` 1-based. Modes
// like "the main diagonal" or "the third row" are special cases of that list
// and would each be another rule and another way to be wrong; the list says the
// same thing and says it in the puzzle rather than in the solver.
//
// THE CANDIDATE MACHINERY IS SHARED AND THE SEARCH IS NOT. All three carry a
// bitmask of possible digits per cell, propagate to a fixpoint, then search the
// cell with the fewest candidates first — but what propagates differs: sudoku
// eliminates across its three unit families, kakuro intersects run-combination
// tables, KenKen enumerates each cage. Sharing the frame keeps the uniqueness
// proof one shape; keeping the propagators separate keeps each one obviously
// correct, which is what a uniqueness proof has to be.
//
// SOUNDNESS OVER COMPLETENESS, EVERYWHERE. Every propagator here may leave work
// undone; none may remove a digit that a real solution uses. Incomplete
// propagation costs search nodes. Unsound propagation costs a uniqueness claim
// that is false — the one failure mode this file exists to make impossible.

/** Bitmask of digits 1..n. Bit (d-1) means digit d. */
function digitMask(n) {
  return (1 << n) - 1;
}

function popcount(mask) {
  var count = 0;
  var m = mask;
  while (m) { m &= m - 1; count++; }
  return count;
}

/** The single digit in a one-bit mask. Callers check popcount first. */
function soleDigit(mask) {
  var d = 1;
  var m = mask;
  while (!(m & 1)) { m >>= 1; d++; }
  return d;
}

/**
 * The shared answer rule: read the solved digits at the declared cells, in the
 * order declared. `solution` is a flat digit array, row-major.
 */
function filledGridAnswer(solution, width, cells) {
  var out = '';
  for (var i = 0; i < cells.length; i++) {
    var cell = cells[i] || {};
    var r = Number(cell.row) - 1;
    var c = Number(cell.col) - 1;
    out += String(solution[r * width + c]);
  }
  return out;
}

/**
 * Shape errors common to every filled grid's answer rule. Returns [] when the
 * rule is well formed against a `height` x `width` board.
 */
function filledGridAnswerShapeErrors(puzzle, height, width) {
  var errors = [];
  var who = label(puzzle);
  var from = puzzle.answerFrom || {};
  if (from.mode !== 'cells') {
    errors.push(who + ': answerFrom.mode is "' + String(from.mode)
      + '" — a filled grid reads its answer as "cells": name the cells to read and the order '
      + 'to read them in, and the digits found there are the key.');
    return errors;
  }
  var cells = asArray(from.cells);
  if (!cells.length) {
    errors.push(who + ': answerFrom.cells is empty — a solved grid with no cells named yields '
      + 'no key, so the puzzle unlocks nothing.');
    return errors;
  }
  for (var i = 0; i < cells.length; i++) {
    var cell = cells[i] || {};
    var r = Number(cell.row);
    var c = Number(cell.col);
    if (!(r >= 1 && r <= height && Math.floor(r) === r)
        || !(c >= 1 && c <= width && Math.floor(c) === c)) {
      errors.push(who + ': answerFrom.cells[' + i + '] is row ' + String(cell.row) + ', column '
        + String(cell.col) + ', which is outside the ' + height + 'x' + width
        + ' grid (rows and columns are 1-based).');
    }
  }
  if (!normalizeAnswer(puzzle.answer)) {
    errors.push(who + ': the answer is empty once normalised.');
  }
  return errors;
}

// ── Sudoku ──────────────────────────────────────────────────────────────────
// Shape:
//   boxWidth   : integer   the sub-block's width
//   boxHeight  : integer   the sub-block's height; the board is boxWidth *
//                          boxHeight on a side, so 3x3 is the classic 9x9 and
//                          3x2 gives the 6x6 a half-letter page likes
//   givens     : string[]  one row per line, one character per cell, "." blank
//   answer     : string
//   answerFrom : { mode: 'cells', cells: [{ row, col }] }
//
// THERE IS NO SEPARATE SOLUTION FIELD, on purpose. The givens ARE the puzzle
// and the solver derives everything else; a declared solution would be a second
// source of truth for the same fact, and the first thing it would ever do is
// disagree with the grid it was printed beside.

function sudokuGeometry(puzzle) {
  var bw = Number(puzzle.boxWidth);
  var bh = Number(puzzle.boxHeight);
  return { bw: bw, bh: bh, size: bw * bh };
}

/** Row, column and box unit membership for every cell. */
function sudokuUnits(bw, bh) {
  var size = bw * bh;
  var units = [];
  var r;
  var c;
  for (r = 0; r < size; r++) {
    var row = [];
    for (c = 0; c < size; c++) row.push(r * size + c);
    units.push(row);
  }
  for (c = 0; c < size; c++) {
    var col = [];
    for (r = 0; r < size; r++) col.push(r * size + c);
    units.push(col);
  }
  // Boxes are boxWidth wide and boxHeight tall, so they tile the board
  // boxHeight across and boxWidth down.
  for (var br = 0; br < bw; br++) {
    for (var bc = 0; bc < bh; bc++) {
      var box = [];
      for (r = 0; r < bh; r++) {
        for (c = 0; c < bw; c++) {
          box.push((br * bh + r) * size + (bc * bw + c));
        }
      }
      units.push(box);
    }
  }
  return units;
}

function sudokuShapeErrors(puzzle) {
  var errors = [];
  var who = label(puzzle);
  var geo = sudokuGeometry(puzzle);

  if (!(geo.bw >= 2 && geo.bh >= 2 && Math.floor(geo.bw) === geo.bw && Math.floor(geo.bh) === geo.bh)) {
    errors.push(who + ': boxWidth and boxHeight must be whole numbers of at least 2 — they are the '
      + 'sub-block a digit may not repeat inside, and the board is boxWidth x boxHeight on a side.');
    return errors;
  }
  if (geo.size > 9) {
    errors.push(who + ': boxWidth x boxHeight is ' + geo.size + ', so the board would be ' + geo.size
      + ' on a side — this solver and this page stop at 9, which is the classic grid.');
    return errors;
  }

  var rows = asArray(puzzle.givens).map(function (r) { return String(r == null ? '' : r); });
  if (rows.length !== geo.size) {
    errors.push(who + ': givens has ' + rows.length + ' rows for a ' + geo.size + 'x' + geo.size
      + ' board — one string per row, always.');
    return errors;
  }
  var allowed = new RegExp('^[.1-' + geo.size + ']+$');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].length !== geo.size) {
      errors.push(who + ': givens row ' + (i + 1) + ' has ' + rows[i].length + ' characters for '
        + geo.size + ' columns — use "." for an empty cell.');
    }
    if (!allowed.test(rows[i])) {
      errors.push(who + ': givens row ' + (i + 1) + ' contains something other than "." or a digit '
        + '1-' + geo.size + '.');
    }
  }
  if (errors.length) return errors;

  // A given that already breaks the rules is a different failure from an
  // unsolvable one, and saying so names the cell rather than the search.
  var units = sudokuUnits(geo.bw, geo.bh);
  var unitNames = ['row', 'column', 'box'];
  for (var u = 0; u < units.length; u++) {
    var seen = {};
    for (var k = 0; k < units[u].length; k++) {
      var idx = units[u][k];
      var ch = rows[Math.floor(idx / geo.size)].charAt(idx % geo.size);
      if (ch === '.') continue;
      if (seen[ch]) {
        errors.push(who + ': the digit ' + ch + ' is printed twice in one '
          + unitNames[Math.min(2, Math.floor(u / geo.size))] + ' — the givens break the rule before '
          + 'the player starts.');
      }
      seen[ch] = true;
    }
  }
  return errors;
}

/**
 * Eliminate to a fixpoint: naked singles across every unit, then hidden
 * singles within each unit. Returns false on contradiction.
 */
function sudokuPropagate(cand, units, size, counters) {
  var changed = true;
  var rounds = 0;
  while (changed) {
    changed = false;
    rounds++;
    if (rounds > 256) break;
    var u;
    var k;
    var d;

    for (u = 0; u < units.length; u++) {
      var unit = units[u];
      // Naked singles: a solved cell removes its digit from the rest of the unit.
      for (k = 0; k < unit.length; k++) {
        var mask = cand[unit[k]];
        if (!mask) return false;
        if (popcount(mask) !== 1) continue;
        for (var j = 0; j < unit.length; j++) {
          if (j === k) continue;
          if (cand[unit[j]] & mask) {
            cand[unit[j]] &= ~mask;
            if (!cand[unit[j]]) return false;
            changed = true;
          }
        }
      }
      // Hidden singles: a digit only one cell in the unit can still hold.
      for (d = 1; d <= size; d++) {
        var bit = 1 << (d - 1);
        var holder = -1;
        var count = 0;
        for (k = 0; k < unit.length; k++) {
          if (cand[unit[k]] & bit) { holder = unit[k]; count++; }
        }
        if (count === 0) return false;
        if (count === 1 && cand[holder] !== bit) { cand[holder] = bit; changed = true; }
      }
    }
  }
  if (counters) counters.rounds = Math.max(counters.rounds, rounds);
  return true;
}

/** Uniqueness search: MRV, counting to two. */
function sudokuSearch(cand, units, size, counters) {
  var solutions = [];
  (function descend(state, depth) {
    if (solutions.length > 1 || counters.overBudget) return;
    counters.nodes++;
    if (counters.nodes > PUZZLE_SOLVER_BUDGETS.sudokuNodes) { counters.overBudget = true; return; }
    if (!sudokuPropagate(state, units, size, null)) return;

    var pick = -1;
    var best = 99;
    for (var i = 0; i < state.length; i++) {
      var n = popcount(state[i]);
      if (n > 1 && n < best) { best = n; pick = i; }
    }
    if (pick === -1) { solutions.push(Int16Array.from(state)); return; }

    counters.depth = Math.max(counters.depth, depth + 1);
    for (var d = 1; d <= size; d++) {
      var bit = 1 << (d - 1);
      if (!(state[pick] & bit)) continue;
      var branch = Int16Array.from(state);
      branch[pick] = bit;
      descend(branch, depth + 1);
      if (solutions.length > 1 || counters.overBudget) return;
    }
  })(cand, 0);
  return solutions;
}

/**
 * solveSudoku(puzzle) -> { ok, errors, solutionCount, solution, difficulty }
 *
 * `solution` is a string[] of digit rows — the same form an answer key would be
 * written by hand, so a human reading a failure can check it.
 */
export function solveSudoku(puzzle) {
  var out = { ok: false, errors: [], solutionCount: 0, solution: null, difficulty: null };
  var p = puzzle || {};
  var who = label(p);

  out.errors = sudokuShapeErrors(p);
  if (out.errors.length) return out;

  var geo = sudokuGeometry(p);
  out.errors = filledGridAnswerShapeErrors(p, geo.size, geo.size);
  if (out.errors.length) return out;

  var rows = asArray(p.givens).map(String);
  var full = digitMask(geo.size);
  var cand = new Int16Array(geo.size * geo.size).fill(full);
  for (var r = 0; r < geo.size; r++) {
    for (var c = 0; c < geo.size; c++) {
      var ch = rows[r].charAt(c);
      if (ch !== '.') cand[r * geo.size + c] = 1 << (Number(ch) - 1);
    }
  }

  var units = sudokuUnits(geo.bw, geo.bh);

  // The difficulty instrument runs FIRST and on its own copy: it measures how
  // far pure elimination gets, which is what "hard" means at a kitchen table.
  var measure = { rounds: 0 };
  var probe = Int16Array.from(cand);
  var propagable = sudokuPropagate(probe, units, geo.size, measure);
  if (!propagable) {
    out.errors.push(who + ': the givens contradict each other — eliminating from them empties a cell, '
      + 'so the printed grid cannot be completed.');
    return out;
  }
  var solvedByLogic = true;
  for (var i = 0; i < probe.length; i++) {
    if (popcount(probe[i]) !== 1) { solvedByLogic = false; break; }
  }

  var counters = { nodes: 0, depth: 0, overBudget: false };
  var solutions = sudokuSearch(cand, units, geo.size, counters);
  if (counters.overBudget) {
    out.errors.push(who + ': the uniqueness proof exceeded the solver budget after ' + counters.nodes
      + ' search steps — print more givens until the grid can be proven, because an unprovable '
      + 'puzzle and a broken one are the same thing to a player.');
    return out;
  }

  out.solutionCount = solutions.length;
  if (!solutions.length) {
    out.errors.push(who + ': the givens admit NO completion — no arrangement of digits satisfies '
      + 'every row, column and box.');
    return out;
  }
  if (solutions.length > 1) {
    out.errors.push(who + ': the givens admit more than one completion — a sudoku must have exactly '
      + 'one. Print another given in the region that stayed ambiguous.');
    return out;
  }

  var solved = solutions[0];
  var digits = [];
  var printed = [];
  for (var rr = 0; rr < geo.size; rr++) {
    var line = '';
    for (var cc = 0; cc < geo.size; cc++) {
      var d = soleDigit(solved[rr * geo.size + cc]);
      digits.push(d);
      line += String(d);
    }
    printed.push(line);
  }
  out.solution = printed;
  out.difficulty = {
    score: measure.rounds + 10 * counters.depth,
    basis: 'elimination-rounds',
    rounds: measure.rounds,
    requiresGuess: !solvedByLogic,
    guessDepth: counters.depth
  };

  var derived = filledGridAnswer(digits, geo.size, asArray(p.answerFrom.cells));
  if (normalizeAnswer(derived) !== normalizeAnswer(p.answer)) {
    out.errors.push(who + ': the named cells of the solved grid read "' + derived
      + '" but the puzzle declares the answer "' + String(p.answer)
      + '" — the key must be what the grid actually produces.');
    return out;
  }

  out.ok = true;
  return out;
}

// ── Kakuro ──────────────────────────────────────────────────────────────────
// Shape:
//   layout     : string[]  rows of "#" (a block cell) and "." (a white cell)
//   sums       : [{ row, col, down?, right? }]   1-based, ON a block cell
//   answer     : string
//   answerFrom : { mode: 'cells', cells: [{ row, col }] }
//
// THE FRAME IS REQUIRED: row 1 and column 1 are all block cells, because every
// run needs a cell to its left or above to carry the clue and the grid edge
// cannot carry one. That is also how every printed kakuro in the world is
// drawn, so it costs the model nothing to obey.
//
// EVERY RUN IS AT LEAST TWO CELLS. A one-cell run is a given wearing a sum, and
// kakuro has no givens; permitting it would let a model produce a "puzzle" that
// is entirely forced cells and call it a grid.

function kakuroDims(puzzle) {
  var rows = asArray(puzzle.layout).map(function (r) { return String(r == null ? '' : r); });
  return { rows: rows, h: rows.length, w: rows.length ? rows[0].length : 0 };
}

/** Maximal runs of white cells, with the block cell that must carry each clue. */
function kakuroRuns(rows, h, w) {
  var runs = [];
  var r;
  var c;
  var cells;
  for (r = 0; r < h; r++) {
    c = 0;
    while (c < w) {
      if (rows[r].charAt(c) !== '.') { c++; continue; }
      cells = [];
      var startC = c;
      while (c < w && rows[r].charAt(c) === '.') { cells.push(r * w + c); c++; }
      runs.push({ axis: 'right', cells: cells, clueRow: r, clueCol: startC - 1 });
    }
  }
  for (c = 0; c < w; c++) {
    r = 0;
    while (r < h) {
      if (rows[r].charAt(c) !== '.') { r++; continue; }
      cells = [];
      var startR = r;
      while (r < h && rows[r].charAt(c) === '.') { cells.push(r * w + c); r++; }
      runs.push({ axis: 'down', cells: cells, clueRow: startR - 1, clueCol: c });
    }
  }
  return runs;
}

function kakuroShapeErrors(puzzle, dims, runs) {
  var errors = [];
  var who = label(puzzle);
  var rows = dims.rows;

  if (dims.h < 4 || dims.w < 4) {
    errors.push(who + ': a kakuro needs at least 4 rows and 4 columns once the clue frame is '
      + 'counted, found ' + dims.h + 'x' + dims.w + '.');
    return errors;
  }
  for (var i = 0; i < dims.h; i++) {
    if (rows[i].length !== dims.w) {
      errors.push(who + ': layout row ' + (i + 1) + ' has ' + rows[i].length + ' characters but row 1 '
        + 'has ' + dims.w + ' — the grid must be rectangular.');
    }
    if (/[^#.]/.test(rows[i])) {
      errors.push(who + ': layout row ' + (i + 1) + ' contains something other than "#" or "." — '
        + '"#" is a block cell, "." is a cell the player writes a digit in.');
    }
  }
  if (errors.length) return errors;

  if (/[^#]/.test(rows[0])) {
    errors.push(who + ': layout row 1 must be all "#" — a run needs a block cell above it to carry '
      + 'its down-sum, and the grid edge cannot carry one.');
  }
  for (var r = 0; r < dims.h; r++) {
    if (rows[r].charAt(0) !== '#') {
      errors.push(who + ': layout row ' + (r + 1) + ' starts with a white cell — column 1 must be all '
        + '"#", because a run needs a block cell to its left to carry its right-sum.');
      break;
    }
  }
  if (errors.length) return errors;

  // Index the declared sums by the block cell they sit on.
  var declared = {};
  var sums = asArray(puzzle.sums);
  for (var s = 0; s < sums.length; s++) {
    var entry = sums[s] || {};
    var sr = Number(entry.row) - 1;
    var sc = Number(entry.col) - 1;
    if (!(sr >= 0 && sr < dims.h && sc >= 0 && sc < dims.w)) {
      errors.push(who + ': sums[' + s + '] names row ' + String(entry.row) + ', column '
        + String(entry.col) + ', which is outside the ' + dims.h + 'x' + dims.w + ' grid.');
      continue;
    }
    if (rows[sr].charAt(sc) !== '#') {
      errors.push(who + ': sums[' + s + '] sits at row ' + entry.row + ', column ' + entry.col
        + ', which is a white cell — a sum is printed in a BLOCK cell, above or to the left of the '
        + 'run it describes.');
      continue;
    }
    declared[sr * dims.w + sc] = entry;
  }
  if (errors.length) return errors;

  var used = {};
  for (var k = 0; k < runs.length; k++) {
    var run = runs[k];
    var where = run.axis === 'right' ? 'right-sum' : 'down-sum';
    var at = who + ': the ' + (run.axis === 'right' ? 'across' : 'down') + ' run starting at row '
      + (Math.floor(run.cells[0] / dims.w) + 1) + ', column ' + ((run.cells[0] % dims.w) + 1);
    if (run.cells.length < 2) {
      errors.push(at + ' is a single cell — every kakuro run is at least two cells, or the digit is '
        + 'simply given rather than deduced.');
      continue;
    }
    if (run.cells.length > 9) {
      errors.push(at + ' is ' + run.cells.length + ' cells long — nine distinct digits is the maximum '
        + 'a run can hold.');
      continue;
    }
    var clueIdx = run.clueRow * dims.w + run.clueCol;
    var clue = declared[clueIdx];
    var target = clue ? Number(run.axis === 'right' ? clue.right : clue.down) : NaN;
    if (!(target > 0) || Math.floor(target) !== target) {
      errors.push(at + ' has no ' + where + ' declared on the block cell at row ' + (run.clueRow + 1)
        + ', column ' + (run.clueCol + 1) + ' — every run carries a total or the player has nothing '
        + 'to solve against.');
      continue;
    }
    used[clueIdx + ':' + run.axis] = true;
    var len = run.cells.length;
    var minSum = len * (len + 1) / 2;
    var maxSum = len * (19 - len) / 2;
    if (target < minSum || target > maxSum) {
      errors.push(at + ' asks for ' + target + ' across ' + len + ' cells, but ' + len
        + ' different digits total between ' + minSum + ' and ' + maxSum + ' — the run cannot be filled.');
    }
  }
  // A declared sum with no run under it is a printed number the player cannot use.
  for (var idx in declared) {
    if (!Object.prototype.hasOwnProperty.call(declared, idx)) continue;
    var e = declared[idx];
    if (e.right != null && !used[idx + ':right']) {
      errors.push(who + ': a right-sum is printed at row ' + e.row + ', column ' + e.col
        + ' but no across run begins there — the number has nothing to describe.');
    }
    if (e.down != null && !used[idx + ':down']) {
      errors.push(who + ': a down-sum is printed at row ' + e.row + ', column ' + e.col
        + ' but no down run begins there — the number has nothing to describe.');
    }
  }
  return errors;
}

var KAKURO_COMBO_CACHE = {};

/** Every set of `len` distinct digits 1-9 summing to `target`, as bitmasks. */
function kakuroCombos(target, len) {
  var key = target + ':' + len;
  if (KAKURO_COMBO_CACHE[key]) return KAKURO_COMBO_CACHE[key];
  var out = [];
  (function pick(start, remaining, sum, mask) {
    if (out.length > PUZZLE_SOLVER_BUDGETS.kakuroCombosPerRun) return;
    if (remaining === 0) {
      if (sum === target) out.push(mask);
      return;
    }
    for (var d = start; d <= 9; d++) {
      if (sum + d > target) break;
      pick(d + 1, remaining - 1, sum + d, mask | (1 << (d - 1)));
    }
  })(1, len, 0, 0);
  KAKURO_COMBO_CACHE[key] = out;
  return out;
}

/**
 * Intersect each run's cells with the digits its surviving combinations allow.
 * SOUND, not complete: a combination survives if it contains every digit
 * already forced in the run, so no digit a real solution uses is ever removed.
 */
function kakuroPropagate(cand, runs, counters) {
  var changed = true;
  var rounds = 0;
  while (changed) {
    changed = false;
    rounds++;
    if (rounds > 128) break;
    for (var k = 0; k < runs.length; k++) {
      var run = runs[k];
      var forced = 0;
      var i;
      for (i = 0; i < run.cells.length; i++) {
        var m = cand[run.cells[i]];
        if (!m) return false;
        if (popcount(m) === 1) {
          if (forced & m) return false;   // the same digit twice in one run
          forced |= m;
        }
      }
      var combos = kakuroCombos(run.target, run.cells.length);
      var allowed = 0;
      var any = false;
      for (i = 0; i < combos.length; i++) {
        if ((combos[i] & forced) !== forced) continue;
        allowed |= combos[i];
        any = true;
      }
      if (!any) return false;
      var free = allowed & ~forced;
      for (i = 0; i < run.cells.length; i++) {
        var cell = run.cells[i];
        if (popcount(cand[cell]) === 1) continue;
        var next = cand[cell] & free;
        if (next !== cand[cell]) {
          cand[cell] = next;
          if (!next) return false;
          changed = true;
        }
      }
    }
  }
  if (counters) counters.rounds = Math.max(counters.rounds, rounds);
  return true;
}

function kakuroComplete(cand, runs) {
  for (var k = 0; k < runs.length; k++) {
    var run = runs[k];
    var sum = 0;
    var seen = 0;
    for (var i = 0; i < run.cells.length; i++) {
      var m = cand[run.cells[i]];
      if (popcount(m) !== 1) return false;
      if (seen & m) return false;
      seen |= m;
      sum += soleDigit(m);
    }
    if (sum !== run.target) return false;
  }
  return true;
}

function kakuroSearch(cand, runs, whiteCells, counters) {
  var solutions = [];
  (function descend(state, depth) {
    if (solutions.length > 1 || counters.overBudget) return;
    counters.nodes++;
    if (counters.nodes > PUZZLE_SOLVER_BUDGETS.kakuroNodes) { counters.overBudget = true; return; }
    if (!kakuroPropagate(state, runs, null)) return;

    var pick = -1;
    var best = 99;
    for (var i = 0; i < whiteCells.length; i++) {
      var n = popcount(state[whiteCells[i]]);
      if (n > 1 && n < best) { best = n; pick = whiteCells[i]; }
    }
    if (pick === -1) {
      if (kakuroComplete(state, runs)) solutions.push(Int16Array.from(state));
      return;
    }
    counters.depth = Math.max(counters.depth, depth + 1);
    for (var d = 1; d <= 9; d++) {
      var bit = 1 << (d - 1);
      if (!(state[pick] & bit)) continue;
      var branch = Int16Array.from(state);
      branch[pick] = bit;
      descend(branch, depth + 1);
      if (solutions.length > 1 || counters.overBudget) return;
    }
  })(cand, 0);
  return solutions;
}

/** solveKakuro(puzzle) -> { ok, errors, solutionCount, solution, difficulty } */
export function solveKakuro(puzzle) {
  var out = { ok: false, errors: [], solutionCount: 0, solution: null, difficulty: null };
  var p = puzzle || {};
  var who = label(p);

  var dims = kakuroDims(p);
  if (!dims.h || !dims.w) {
    out.errors.push(who + ': layout is empty — a kakuro is a printed grid of block and white cells.');
    return out;
  }
  var runs = kakuroRuns(dims.rows, dims.h, dims.w);
  out.errors = kakuroShapeErrors(p, dims, runs);
  if (out.errors.length) return out;
  out.errors = filledGridAnswerShapeErrors(p, dims.h, dims.w);
  if (out.errors.length) return out;

  // Attach each run's target now that the shape is proven.
  var declared = {};
  asArray(p.sums).forEach(function (entry) {
    declared[(Number(entry.row) - 1) * dims.w + (Number(entry.col) - 1)] = entry;
  });
  var whiteCells = [];
  for (var idx = 0; idx < dims.h * dims.w; idx++) {
    if (dims.rows[Math.floor(idx / dims.w)].charAt(idx % dims.w) === '.') whiteCells.push(idx);
  }
  runs.forEach(function (run) {
    var clue = declared[run.clueRow * dims.w + run.clueCol];
    run.target = Number(run.axis === 'right' ? clue.right : clue.down);
  });
  var answerCell = {};
  asArray((p.answerFrom || {}).cells).forEach(function (cell) {
    answerCell[(Number(cell.row) - 1) * dims.w + (Number(cell.col) - 1)] = true;
  });
  for (var a in answerCell) {
    if (!Object.prototype.hasOwnProperty.call(answerCell, a)) continue;
    if (whiteCells.indexOf(Number(a)) === -1) {
      out.errors.push(who + ': answerFrom.cells names a block cell — the key is read from cells the '
        + 'player writes a digit in.');
      return out;
    }
  }

  var cand = new Int16Array(dims.h * dims.w).fill(0);
  whiteCells.forEach(function (cell) { cand[cell] = digitMask(9); });

  var measure = { rounds: 0 };
  var probe = Int16Array.from(cand);
  if (!kakuroPropagate(probe, runs, measure)) {
    out.errors.push(who + ': the sums contradict each other — no run can be filled consistently, so '
      + 'the printed grid cannot be completed.');
    return out;
  }
  var solvedByLogic = whiteCells.every(function (cell) { return popcount(probe[cell]) === 1; });

  var counters = { nodes: 0, depth: 0, overBudget: false };
  var solutions = kakuroSearch(cand, runs, whiteCells, counters);
  if (counters.overBudget) {
    out.errors.push(who + ': the uniqueness proof exceeded the solver budget after ' + counters.nodes
      + ' search steps — shorten the runs or shrink the grid until it can be proven. A kakuro a '
      + 'machine cannot prove is one a player cannot finish honestly.');
    return out;
  }

  out.solutionCount = solutions.length;
  if (!solutions.length) {
    out.errors.push(who + ': the sums admit NO filling — every arrangement breaks a run.');
    return out;
  }
  if (solutions.length > 1) {
    out.errors.push(who + ': the sums admit more than one filling — a kakuro must have exactly one. '
      + 'Change a total so the ambiguous run resolves.');
    return out;
  }

  var solved = solutions[0];
  var digits = new Array(dims.h * dims.w).fill(0);
  var printed = [];
  for (var r = 0; r < dims.h; r++) {
    var line = '';
    for (var c = 0; c < dims.w; c++) {
      var cell = r * dims.w + c;
      if (dims.rows[r].charAt(c) === '#') { line += '#'; continue; }
      var d = soleDigit(solved[cell]);
      digits[cell] = d;
      line += String(d);
    }
    printed.push(line);
  }
  out.solution = printed;
  out.difficulty = {
    score: measure.rounds + 10 * counters.depth,
    basis: 'combination-rounds',
    rounds: measure.rounds,
    requiresGuess: !solvedByLogic,
    guessDepth: counters.depth
  };

  var derived = filledGridAnswer(digits, dims.w, asArray(p.answerFrom.cells));
  if (normalizeAnswer(derived) !== normalizeAnswer(p.answer)) {
    out.errors.push(who + ': the named cells of the solved grid read "' + derived
      + '" but the puzzle declares the answer "' + String(p.answer)
      + '" — the key must be what the grid actually produces.');
    return out;
  }

  out.ok = true;
  return out;
}

// ── KenKen ──────────────────────────────────────────────────────────────────
// Shape:
//   size       : integer   the board is size x size and holds digits 1..size
//   cages      : [{ cells: [{ row, col }], operation, target }]
//   answer     : string
//   answerFrom : { mode: 'cells', cells: [{ row, col }] }
//
// The operations are WORDS, not glyphs — "add" | "subtract" | "multiply" |
// "divide" | "fixed" — because the enum has to survive a JSON round trip, a
// prompt menu and a parity scan that reads quoted lowercase tokens. The printed
// page draws the conventional + − × ÷ from the word; the wire carries the word.
//
// `subtract` and `divide` are TWO-CELL ONLY and order-free (the larger minus or
// over the smaller), which is what every printed KenKen means by them. `fixed`
// is the one-cell cage: the digit is simply given.

export var KENKEN_OPERATIONS = ['add', 'subtract', 'multiply', 'divide', 'fixed'];

function kenkenShapeErrors(puzzle) {
  var errors = [];
  var who = label(puzzle);
  var size = Number(puzzle.size);
  if (!(size >= 3 && size <= 9 && Math.floor(size) === size)) {
    errors.push(who + ': size is ' + String(puzzle.size) + ' — a KenKen board is 3 to 9 on a side.');
    return errors;
  }
  var cages = asArray(puzzle.cages);
  if (!cages.length) {
    errors.push(who + ': no cages — a KenKen with no cages is an empty Latin square with every '
      + 'arrangement as a solution.');
    return errors;
  }

  var owner = new Array(size * size).fill(-1);
  for (var k = 0; k < cages.length; k++) {
    var cage = cages[k] || {};
    var at = who + ': cage ' + (k + 1);
    var cells = asArray(cage.cells);
    if (!cells.length) {
      errors.push(at + ' has no cells.');
      continue;
    }
    if (cells.length > 4) {
      errors.push(at + ' covers ' + cells.length + ' cells — four is the ceiling, because a cage the '
        + 'solver must enumerate grows as size to the power of its cell count.');
      continue;
    }
    if (KENKEN_OPERATIONS.indexOf(cage.operation) === -1) {
      errors.push(at + ' has operation "' + String(cage.operation) + '", which is not one of '
        + KENKEN_OPERATIONS.join(' | ') + '.');
      continue;
    }
    if (!(Number(cage.target) > 0) || Math.floor(Number(cage.target)) !== Number(cage.target)) {
      errors.push(at + ' has target ' + String(cage.target) + ' — a cage target is a positive whole number.');
      continue;
    }
    if ((cage.operation === 'subtract' || cage.operation === 'divide') && cells.length !== 2) {
      errors.push(at + ' is "' + cage.operation + '" across ' + cells.length + ' cells — subtraction and '
        + 'division are two-cell cages, because with three cells the result depends on an order the '
        + 'printed page does not show.');
      continue;
    }
    if (cage.operation === 'fixed' && cells.length !== 1) {
      errors.push(at + ' is "fixed" across ' + cells.length + ' cells — a fixed cage names one cell '
        + 'and gives its digit.');
      continue;
    }
    if (cage.operation !== 'fixed' && cells.length === 1) {
      errors.push(at + ' covers one cell but is "' + cage.operation + '" — a single-cell cage is "fixed".');
      continue;
    }
    for (var i = 0; i < cells.length; i++) {
      var r = Number(cells[i].row) - 1;
      var c = Number(cells[i].col) - 1;
      if (!(r >= 0 && r < size && c >= 0 && c < size)) {
        errors.push(at + ' names row ' + String(cells[i].row) + ', column ' + String(cells[i].col)
          + ', which is outside the ' + size + 'x' + size + ' board.');
        continue;
      }
      var idx = r * size + c;
      if (owner[idx] !== -1) {
        errors.push(at + ' claims row ' + (r + 1) + ', column ' + (c + 1) + ', which cage '
          + (owner[idx] + 1) + ' already holds — cages partition the board, so every cell belongs to '
          + 'exactly one.');
        continue;
      }
      owner[idx] = k;
    }
  }
  if (errors.length) return errors;

  var orphans = 0;
  for (var j = 0; j < owner.length; j++) if (owner[j] === -1) orphans++;
  if (orphans) {
    errors.push(who + ': ' + orphans + ' cell(s) belong to no cage — the cages must cover the whole '
      + 'board, or those cells are constrained by nothing but the Latin rule.');
  }
  return errors;
}

/** Does this digit multiset satisfy the cage? Order-free by construction. */
function kenkenCageHolds(operation, target, values) {
  var i;
  if (operation === 'fixed') return values[0] === target;
  if (operation === 'add') {
    var sum = 0;
    for (i = 0; i < values.length; i++) sum += values[i];
    return sum === target;
  }
  if (operation === 'multiply') {
    var product = 1;
    for (i = 0; i < values.length; i++) product *= values[i];
    return product === target;
  }
  var hi = Math.max(values[0], values[1]);
  var lo = Math.min(values[0], values[1]);
  if (operation === 'subtract') return hi - lo === target;
  return lo > 0 && hi % lo === 0 && hi / lo === target;
}

/**
 * Enumerate every filling of one cage consistent with the current candidates,
 * the operation, and the Latin rule INSIDE the cage (two cells sharing a row or
 * column must differ). Returns the per-cell union of digits that survive.
 */
function kenkenCageUnions(cage, cand, size, counters) {
  var n = cage.idx.length;
  var unions = new Array(n).fill(0);
  var values = new Array(n);
  var any = false;
  (function place(i) {
    if (counters.overBudget) return;
    if (i === n) {
      if (!kenkenCageHolds(cage.operation, cage.target, values)) return;
      any = true;
      for (var j = 0; j < n; j++) unions[j] |= (1 << (values[j] - 1));
      return;
    }
    for (var d = 1; d <= size; d++) {
      if (!(cand[cage.idx[i]] & (1 << (d - 1)))) continue;
      var clash = false;
      for (var k = 0; k < i; k++) {
        if (values[k] !== d) continue;
        if (cage.rows[k] === cage.rows[i] || cage.cols[k] === cage.cols[i]) { clash = true; break; }
      }
      if (clash) continue;
      values[i] = d;
      counters.cageWork++;
      place(i + 1);
      if (counters.overBudget) return;
    }
  })(0);
  return any ? unions : null;
}

function kenkenPropagate(cand, cages, units, size, counters) {
  var work = { cageWork: 0, overBudget: false };
  var changed = true;
  var rounds = 0;
  while (changed) {
    changed = false;
    rounds++;
    if (rounds > 128) break;
    if (!sudokuPropagate(cand, units, size, null)) return false;
    for (var k = 0; k < cages.length; k++) {
      var cage = cages[k];
      var unions = kenkenCageUnions(cage, cand, size, work);
      if (!unions) return false;
      for (var i = 0; i < cage.idx.length; i++) {
        var next = cand[cage.idx[i]] & unions[i];
        if (next !== cand[cage.idx[i]]) {
          cand[cage.idx[i]] = next;
          if (!next) return false;
          changed = true;
        }
      }
    }
  }
  if (counters) counters.rounds = Math.max(counters.rounds, rounds);
  return true;
}

function kenkenSearch(cand, cages, units, size, counters) {
  var solutions = [];
  (function descend(state, depth) {
    if (solutions.length > 1 || counters.overBudget) return;
    counters.nodes++;
    if (counters.nodes > PUZZLE_SOLVER_BUDGETS.kenkenNodes) { counters.overBudget = true; return; }
    if (!kenkenPropagate(state, cages, units, size, null)) return;

    var pick = -1;
    var best = 99;
    for (var i = 0; i < state.length; i++) {
      var n = popcount(state[i]);
      if (n > 1 && n < best) { best = n; pick = i; }
    }
    if (pick === -1) { solutions.push(Int16Array.from(state)); return; }

    counters.depth = Math.max(counters.depth, depth + 1);
    for (var d = 1; d <= size; d++) {
      var bit = 1 << (d - 1);
      if (!(state[pick] & bit)) continue;
      var branch = Int16Array.from(state);
      branch[pick] = bit;
      descend(branch, depth + 1);
      if (solutions.length > 1 || counters.overBudget) return;
    }
  })(cand, 0);
  return solutions;
}

/** solveKenKen(puzzle) -> { ok, errors, solutionCount, solution, difficulty } */
export function solveKenKen(puzzle) {
  var out = { ok: false, errors: [], solutionCount: 0, solution: null, difficulty: null };
  var p = puzzle || {};
  var who = label(p);

  out.errors = kenkenShapeErrors(p);
  if (out.errors.length) return out;
  var size = Number(p.size);
  out.errors = filledGridAnswerShapeErrors(p, size, size);
  if (out.errors.length) return out;

  var cages = asArray(p.cages).map(function (cage) {
    var cells = asArray(cage.cells);
    return {
      operation: cage.operation,
      target: Number(cage.target),
      idx: cells.map(function (cell) { return (Number(cell.row) - 1) * size + (Number(cell.col) - 1); }),
      rows: cells.map(function (cell) { return Number(cell.row) - 1; }),
      cols: cells.map(function (cell) { return Number(cell.col) - 1; })
    };
  });
  // Rows and columns only. A KenKen has no boxes, and sudokuPropagate takes its
  // units as data rather than deriving them — so handing it two families
  // instead of three IS the Latin-square propagator, with no branch and no
  // second copy of naked-and-hidden singles to drift from the first.
  var units = [];
  var r;
  var c;
  for (r = 0; r < size; r++) {
    var row = [];
    for (c = 0; c < size; c++) row.push(r * size + c);
    units.push(row);
  }
  for (c = 0; c < size; c++) {
    var col = [];
    for (r = 0; r < size; r++) col.push(r * size + c);
    units.push(col);
  }

  var cand = new Int16Array(size * size).fill(digitMask(size));
  var measure = { rounds: 0 };
  var probe = Int16Array.from(cand);
  if (!kenkenPropagate(probe, cages, units, size, measure)) {
    out.errors.push(who + ': the cages contradict each other — no digit survives in some cell, so the '
      + 'printed grid cannot be completed.');
    return out;
  }
  var solvedByLogic = true;
  for (var i = 0; i < probe.length; i++) {
    if (popcount(probe[i]) !== 1) { solvedByLogic = false; break; }
  }

  var counters = { nodes: 0, depth: 0, overBudget: false };
  var solutions = kenkenSearch(cand, cages, units, size, counters);
  if (counters.overBudget) {
    out.errors.push(who + ': the uniqueness proof exceeded the solver budget after ' + counters.nodes
      + ' search steps — shrink the board or tighten a cage until it can be proven.');
    return out;
  }

  out.solutionCount = solutions.length;
  if (!solutions.length) {
    out.errors.push(who + ': the cages admit NO filling — no Latin square satisfies every cage.');
    return out;
  }
  if (solutions.length > 1) {
    out.errors.push(who + ': the cages admit more than one filling — a KenKen must have exactly one. '
      + 'Split a cage or change a target so the ambiguity resolves.');
    return out;
  }

  var solved = solutions[0];
  var digits = [];
  var printed = [];
  for (var rr = 0; rr < size; rr++) {
    var line = '';
    for (var cc = 0; cc < size; cc++) {
      var d = soleDigit(solved[rr * size + cc]);
      digits.push(d);
      line += String(d);
    }
    printed.push(line);
  }
  out.solution = printed;
  out.difficulty = {
    score: measure.rounds + 10 * counters.depth,
    basis: 'cage-rounds',
    rounds: measure.rounds,
    requiresGuess: !solvedByLogic,
    guessDepth: counters.depth
  };

  var derived = filledGridAnswer(digits, size, asArray(p.answerFrom.cells));
  if (normalizeAnswer(derived) !== normalizeAnswer(p.answer)) {
    out.errors.push(who + ': the named cells of the solved grid read "' + derived
      + '" but the puzzle declares the answer "' + String(p.answer)
      + '" — the key must be what the grid actually produces.');
    return out;
  }

  out.ok = true;
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// TRUTH-TELLERS — the knights-and-knaves form  (the arsenal wave)
// ════════════════════════════════════════════════════════════════════════════
// Shape:
//   speakers    : string[]   3..6 named voices
//   roleLabels  : { truth, lie }   what THIS world calls the two kinds
//   statements  : [{ speaker, text, claim }]
//   answer      : string
//   answerFrom  : { mode: 'roles' } | { mode: 'initials', role }
//
// WHY IT IS NOT A LOGIC GRID, which is the first thing anyone proposes. A logic
// grid's category is a BIJECTION with its subjects — `values` must have exactly
// as many entries as there are subjects and each is used exactly once. Four
// speakers can all be liars. The bijection is the logic grid's whole engine (the
// solver enumerates permutations), so a two-value category over four subjects is
// not a tight fit for this family, it is a different mathematical object. Hence
// a kind, a solver, and a two-column mark board rather than a matrix.
//
// THE PROOF IS EXHAUSTIVE AND THAT IS THE POINT. Six speakers is 64 role
// assignments; the solver tries every one and stops at the second that survives.
// There is no propagation to be unsound in and no budget to exceed, which makes
// this the one family here whose uniqueness proof needs no defending.
//
// THE RULE, stated once because everything below is mechanical from it: a
// speaker whose role is `truth` makes only true statements; a speaker whose role
// is `lie` makes only false ones. So a statement CONSTRAINS: eval(claim) must
// equal (role === truth). That is the entire semantics.
//
// THE ROLE LABELS ARE THE BOOK'S, NOT THE ENGINE'S. `truth` and `lie` are wire
// values; the page prints what `roleLabels` says — SWORN and FORSWORN, SOUND and
// TAINTED, whatever the world calls them. Printing the word "TRUTH" on a page of
// this book would be the engine talking, which the diegetic law forbids.

export var TRUTH_TELLER_ROLES = ['truth', 'lie'];
export var TRUTH_CLAIM_TYPES = ['is', 'same', 'differs', 'and', 'or', 'count'];
export var TRUTH_COMPARATORS = ['exactly', 'at-least', 'at-most'];

/** How deep a compound claim may nest. Three is a sentence; four is a paragraph
 *  nobody can hold in their head at a gym bench. */
var TRUTH_MAX_CLAIM_DEPTH = 3;

function truthClaimShapeErrors(claim, speakers, at, depth) {
  var errors = [];
  var k = claim || {};
  if (depth > TRUTH_MAX_CLAIM_DEPTH) {
    errors.push(at + ' nests claims more than ' + TRUTH_MAX_CLAIM_DEPTH + ' deep — past that it is '
      + 'not a statement a player can hold in their head.');
    return errors;
  }
  if (TRUTH_CLAIM_TYPES.indexOf(k.type) === -1) {
    errors.push(at + ' has claim type "' + String(k.type) + '", which is not one of '
      + TRUTH_CLAIM_TYPES.join(' | ') + '.');
    return errors;
  }
  if (k.type === 'is') {
    if (speakers.indexOf(String(k.speaker)) === -1) {
      errors.push(at + ' names speaker "' + String(k.speaker) + '", who is not in the speaker list.');
    }
    if (TRUTH_TELLER_ROLES.indexOf(k.role) === -1) {
      errors.push(at + ' names role "' + String(k.role) + '" — the two roles are '
        + TRUTH_TELLER_ROLES.join(' | ') + '.');
    }
    return errors;
  }
  if (k.type === 'same' || k.type === 'differs') {
    if (speakers.indexOf(String(k.speaker)) === -1) {
      errors.push(at + ' names speaker "' + String(k.speaker) + '", who is not in the speaker list.');
    }
    if (speakers.indexOf(String(k.otherSpeaker)) === -1) {
      errors.push(at + ' names speaker "' + String(k.otherSpeaker) + '", who is not in the speaker list.');
    }
    if (String(k.speaker) === String(k.otherSpeaker)) {
      errors.push(at + ' compares "' + String(k.speaker) + '" with themselves, which is true by '
        + 'definition for "same" and impossible for "differs" — neither constrains anything.');
    }
    return errors;
  }
  if (k.type === 'count') {
    if (TRUTH_TELLER_ROLES.indexOf(k.role) === -1) {
      errors.push(at + ' counts role "' + String(k.role) + '" — the two roles are '
        + TRUTH_TELLER_ROLES.join(' | ') + '.');
    }
    if (TRUTH_COMPARATORS.indexOf(k.comparator) === -1) {
      errors.push(at + ' has comparator "' + String(k.comparator) + '", which is not one of '
        + TRUTH_COMPARATORS.join(' | ') + '.');
    }
    var n = Number(k.n);
    if (!(n >= 0 && n <= speakers.length && Math.floor(n) === n)) {
      errors.push(at + ' counts to ' + String(k.n) + ', and there are ' + speakers.length + ' speakers.');
    }
    return errors;
  }
  // and / or
  var subs = asArray(k.claims);
  if (subs.length < 2) {
    errors.push(at + ' is "' + k.type + '" over ' + subs.length + ' claim(s) — joining needs at '
      + 'least two things to join.');
    return errors;
  }
  for (var i = 0; i < subs.length; i++) {
    errors = errors.concat(truthClaimShapeErrors(subs[i], speakers, at + ' → part ' + (i + 1), depth + 1));
  }
  return errors;
}

/** Is the claim true under this role assignment? `roles[i]` is 'truth'|'lie'. */
function evalTruthClaim(claim, roles, speakers) {
  var k = claim || {};
  var i;
  if (k.type === 'is') {
    return roles[speakers.indexOf(String(k.speaker))] === k.role;
  }
  if (k.type === 'same') {
    return roles[speakers.indexOf(String(k.speaker))] === roles[speakers.indexOf(String(k.otherSpeaker))];
  }
  if (k.type === 'differs') {
    return roles[speakers.indexOf(String(k.speaker))] !== roles[speakers.indexOf(String(k.otherSpeaker))];
  }
  if (k.type === 'count') {
    var tally = 0;
    for (i = 0; i < roles.length; i++) if (roles[i] === k.role) tally++;
    if (k.comparator === 'exactly') return tally === Number(k.n);
    if (k.comparator === 'at-least') return tally >= Number(k.n);
    return tally <= Number(k.n);
  }
  var subs = asArray(k.claims);
  if (k.type === 'and') {
    for (i = 0; i < subs.length; i++) {
      if (!evalTruthClaim(subs[i], roles, speakers)) return false;
    }
    return true;
  }
  for (i = 0; i < subs.length; i++) {
    if (evalTruthClaim(subs[i], roles, speakers)) return true;
  }
  return false;
}

function truthTellerShapeErrors(puzzle) {
  var errors = [];
  var who = label(puzzle);
  var speakers = asArray(puzzle.speakers).map(String);

  if (speakers.length < 3) {
    errors.push(who + ': a truth-teller puzzle needs at least 3 speakers, found ' + speakers.length
      + ' — with two the answer is a coin flip once either one speaks.');
  }
  if (speakers.length > 8) {
    errors.push(who + ': ' + speakers.length + ' speakers is past what the printed board holds.');
  }
  if (new Set(speakers).size !== speakers.length) {
    errors.push(who + ': two speakers share a name — statements address speakers by name, so '
      + 'duplicates are unresolvable.');
  }
  var labels = puzzle.roleLabels || {};
  if (!String(labels.truth || '').trim() || !String(labels.lie || '').trim()) {
    errors.push(who + ': roleLabels must name BOTH kinds as this world names them. The board prints '
      + 'those two words as its column headings, and "TRUTH" and "LIE" would be the engine talking '
      + 'on a page of this book.');
  }
  var statements = asArray(puzzle.statements);
  if (statements.length < 2) {
    errors.push(who + ': ' + statements.length + ' statement(s) — one voice cannot corner itself.');
  }
  for (var i = 0; i < statements.length; i++) {
    var line = statements[i] || {};
    var at = who + ': statement ' + (i + 1);
    if (speakers.indexOf(String(line.speaker)) === -1) {
      errors.push(at + ' is spoken by "' + String(line.speaker) + '", who is not in the speaker list.');
      continue;
    }
    if (!String(line.text || '').trim()) {
      errors.push(at + ' has no printed text — the player reads prose, the solver reads the claim, '
        + 'and both must exist.');
      continue;
    }
    errors = errors.concat(truthClaimShapeErrors(line.claim, speakers, at, 1));
  }
  return errors;
}

function truthTellerAnswerFrom(puzzle, roles, speakers) {
  var from = puzzle.answerFrom || {};
  var i;
  if (from.mode === 'roles') {
    var out = '';
    for (i = 0; i < roles.length; i++) out += roles[i] === 'truth' ? 'T' : 'L';
    return out;
  }
  var initials = '';
  for (i = 0; i < speakers.length; i++) {
    if (roles[i] === from.role) initials += speakers[i].charAt(0);
  }
  return initials;
}

function truthTellerAnswerShapeErrors(puzzle) {
  var errors = [];
  var who = label(puzzle);
  var from = puzzle.answerFrom || {};
  if (from.mode !== 'roles' && from.mode !== 'initials') {
    errors.push(who + ': answerFrom.mode is "' + String(from.mode) + '" — a truth-teller puzzle reads '
      + 'its answer as "roles" (one letter per speaker in order, T for the truthful kind and L for '
      + 'the other) or "initials" (the first letters of the speakers holding one named role).');
    return errors;
  }
  if (from.mode === 'initials' && TRUTH_TELLER_ROLES.indexOf(from.role) === -1) {
    errors.push(who + ': answerFrom.mode "initials" must name which role to collect — '
      + TRUTH_TELLER_ROLES.join(' | ') + '.');
  }
  if (!normalizeAnswer(puzzle.answer)) {
    errors.push(who + ': the answer is empty once normalised.');
  }
  return errors;
}

/**
 * solveTruthTellers(puzzle) -> { ok, errors, solutionCount, solution, difficulty }
 *
 * `solution` is the role list in speaker order, so a human reading a failure can
 * check it by hand the way they would check the puzzle.
 */
export function solveTruthTellers(puzzle) {
  var out = { ok: false, errors: [], solutionCount: 0, solution: null, difficulty: null };
  var p = puzzle || {};
  var who = label(p);

  out.errors = truthTellerShapeErrors(p).concat(truthTellerAnswerShapeErrors(p));
  if (out.errors.length) return out;

  var speakers = asArray(p.speakers).map(String);
  var statements = asArray(p.statements);
  var n = speakers.length;
  var found = [];

  // Exhaustive over 2^n. No budget: six speakers is 64 assignments, and the
  // guardrail is what keeps it that way.
  for (var mask = 0; mask < (1 << n); mask++) {
    var roles = [];
    for (var i = 0; i < n; i++) roles.push((mask & (1 << i)) ? 'truth' : 'lie');
    var ok = true;
    for (var s = 0; s < statements.length; s++) {
      var line = statements[s];
      var speakerIsTruthful = roles[speakers.indexOf(String(line.speaker))] === 'truth';
      if (evalTruthClaim(line.claim, roles, speakers) !== speakerIsTruthful) { ok = false; break; }
    }
    if (ok) {
      found.push(roles);
      if (found.length > 1) break;
    }
  }

  out.solutionCount = found.length;
  if (!found.length) {
    out.errors.push(who + ': no assignment of the two kinds satisfies every statement — the '
      + 'statements contradict each other, so the puzzle has no answer at all.');
    return out;
  }
  if (found.length > 1) {
    out.errors.push(who + ': more than one assignment satisfies every statement — a truth-teller '
      + 'puzzle must have exactly one. Add a statement that separates the surviving possibilities, '
      + 'or make an existing one say something about a speaker nobody has mentioned.');
    return out;
  }

  out.solution = found[0];
  // The instrument: how much STRUCTURE the statements carry. A puzzle of bare
  // accusations is easier than one of compound claims about counts, and the
  // claim tree's size is exactly that, measured rather than adjectival.
  var nodes = 0;
  statements.forEach(function (line) {
    (function walk(claim) {
      nodes++;
      asArray((claim || {}).claims).forEach(walk);
    })(line.claim);
  });
  out.difficulty = {
    score: n + nodes,
    basis: 'statement-load',
    speakers: n,
    claimNodes: nodes,
    requiresGuess: false
  };

  var derived = truthTellerAnswerFrom(p, out.solution, speakers);
  if (!normalizeAnswer(derived)) {
    out.errors.push(who + ': the answer rule reads nothing off the solved board — in "initials" mode '
      + 'that means no speaker holds the role you asked for, so the key is empty.');
    return out;
  }
  if (normalizeAnswer(derived) !== normalizeAnswer(p.answer)) {
    out.errors.push(who + ': the solved board yields "' + derived + '" but the puzzle declares the '
      + 'answer "' + String(p.answer) + '" — the key must be what the board actually produces.');
    return out;
  }

  out.ok = true;
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// SEQUENCE — routes and schedules  (the arsenal wave)
// ════════════════════════════════════════════════════════════════════════════
// Shape:
//   items      : string[]   3..6 things to be ordered
//   slots      : string[]   the ordered positions, same count as items — stops
//                           on a route, days in a week, shifts, berths
//   axisLabel  : string     optional band heading over the slot columns
//   orderClues : [{ text, constraint }]   — NOT `clues`, which the logic grid
//                           owns with a different constraint vocabulary; one
//                           field accepting both would weaken that grid's own
//                           validation to the union of two languages
//   answer     : string
//   answerFrom : { mode: 'slot', slot } | { mode: 'initials' }
//
// WHY THIS IS NOT A LOGIC GRID, and the answer is the exact mirror of the
// truth-teller one. There the BOARD matched and the mathematics did not; here
// the mathematics matches perfectly — items against slots IS a bijection, and
// the logic grid's permutation solver would happily prove it — and what does
// not match is the CONSTRAINT LANGUAGE. "The ledger was collected before the
// warehouse" is an ORDINAL fact, and the logic grid's four forms (is / not /
// same / differs) cannot express one. A grid whose clues can only say "Tuesday
// is not the mill" is not a schedule puzzle; it is a matching puzzle whose
// values happen to be sorted.
//
// So: the same board, the same permutation search, and six ordinal forms. The
// board being shared is why this kind costs almost no rendering — see the
// atom's shim.
//
// WHY IT IS NOT A MAP OVERLAY, which the wave scouted first. Routes look
// spatial, and the corridor maze already draws labelled nodes. Two findings
// against it: the maze's passages carry no cost or ordering dimension in the
// schema at all, and a standing prompt ruling says a discovered dead end "never
// costs the player anything" — so a route puzzle with stakes on the board would
// need that ruling overturned, which is an author's call and not an
// implementation. A schedule and a route are the same object anyway: a set of
// things in an order, constrained. The grid says that without needing a map.

export var SEQUENCE_CONSTRAINT_TYPES = ['at', 'not-at', 'before', 'after', 'adjacent', 'gap'];

function sequenceShapeErrors(puzzle) {
  var errors = [];
  var who = label(puzzle);
  var items = asArray(puzzle.items).map(String);
  var slots = asArray(puzzle.slots).map(String);

  if (items.length < 3) {
    errors.push(who + ': a sequence needs at least 3 items, found ' + items.length
      + ' — two things in an order is a single fact, not a deduction.');
  }
  if (items.length > 7) {
    errors.push(who + ': ' + items.length + ' items is past what the printed board holds.');
  }
  if (new Set(items).size !== items.length) {
    errors.push(who + ': two items share a name — clues address items by name, so duplicates are '
      + 'unresolvable.');
  }
  if (slots.length !== items.length) {
    errors.push(who + ': ' + slots.length + ' slots for ' + items.length + ' items — every item takes '
      + 'exactly one slot and every slot takes exactly one item, so the counts must be equal.');
  }
  if (new Set(slots).size !== slots.length) {
    errors.push(who + ': two slots share a label — the columns would be indistinguishable on the page.');
  }
  if (errors.length) return errors;

  var clues = asArray(puzzle.orderClues);
  if (!clues.length) {
    errors.push(who + ': no clues — every ordering is a solution.');
  }
  for (var i = 0; i < clues.length; i++) {
    var clue = clues[i] || {};
    var k = clue.constraint || {};
    var at = who + ': clue ' + (i + 1);
    if (!String(clue.text || '').trim()) {
      errors.push(at + ' has no printed text — the player reads prose, the solver reads the '
        + 'constraint, and both must exist.');
      continue;
    }
    if (SEQUENCE_CONSTRAINT_TYPES.indexOf(k.type) === -1) {
      errors.push(at + ' has constraint type "' + String(k.type) + '", which is not one of '
        + SEQUENCE_CONSTRAINT_TYPES.join(' | ') + '.');
      continue;
    }
    if (items.indexOf(String(k.item)) === -1) {
      errors.push(at + ' names item "' + String(k.item) + '", which is not in the item list.');
      continue;
    }
    if (k.type === 'at' || k.type === 'not-at') {
      if (slots.indexOf(String(k.slot)) === -1) {
        errors.push(at + ' names slot "' + String(k.slot) + '", which is not in the slot list.');
      }
      continue;
    }
    if (items.indexOf(String(k.otherItem)) === -1) {
      errors.push(at + ' names item "' + String(k.otherItem) + '", which is not in the item list.');
      continue;
    }
    if (String(k.item) === String(k.otherItem)) {
      errors.push(at + ' relates "' + String(k.item) + '" to itself, which constrains nothing.');
      continue;
    }
    if (k.type === 'gap') {
      var n = Number(k.n);
      if (!(n >= 1 && n <= items.length - 1 && Math.floor(n) === n)) {
        errors.push(at + ' asks for a gap of ' + String(k.n) + ' across ' + items.length
          + ' slots — a gap is a whole number from 1 to ' + (items.length - 1) + '.');
      }
    }
  }
  return errors;
}

/** Does this ordering satisfy the constraint? `pos[i]` is item i's slot index. */
function sequenceHolds(k, pos, items) {
  var a = pos[items.indexOf(String(k.item))];
  if (k.type === 'at') return a === Number(k.slotIndex);
  if (k.type === 'not-at') return a !== Number(k.slotIndex);
  var b = pos[items.indexOf(String(k.otherItem))];
  if (k.type === 'before') return a < b;
  if (k.type === 'after') return a > b;
  if (k.type === 'adjacent') return Math.abs(a - b) === 1;
  return Math.abs(a - b) === Number(k.n);
}

/**
 * Count orderings, stopping at two. Exhaustive over permutations — 6 items is
 * 720 and the render ceiling of 7 is 5040, so there is no budget here for the
 * same reason the truth-teller solver has none.
 */
function enumerateSequences(puzzle, compiled) {
  var items = asArray(puzzle.items).map(String);
  var n = items.length;
  var perms = permutations(n);
  var found = [];
  for (var p = 0; p < perms.length && found.length < 2; p++) {
    var ok = true;
    for (var c = 0; c < compiled.length; c++) {
      if (!sequenceHolds(compiled[c], perms[p], items)) { ok = false; break; }
    }
    if (ok) found.push(perms[p]);
  }
  return found;
}

/**
 * The difficulty instrument: candidate elimination over item x slot, run to a
 * fixpoint purely to MEASURE how far pure reasoning gets. It never decides
 * validity — enumerateSequences owns that — and it is sound but incomplete,
 * which is exactly what a measurement of "how far can you get by thinking"
 * should be.
 */
function sequenceInferenceDepth(puzzle, compiled) {
  var items = asArray(puzzle.items).map(String);
  var n = items.length;
  var full = (1 << n) - 1;
  var cand = new Array(n).fill(full);
  var rounds = 0;
  var changed = true;
  while (changed && rounds < 64) {
    changed = false;
    rounds++;
    for (var q = 0; q < compiled.length; q++) {
      var k = compiled[q];
      var ai = items.indexOf(String(k.item));
      var before;
      var next;
      if (k.type === 'at') {
        next = 1 << Number(k.slotIndex);
      } else if (k.type === 'not-at') {
        next = cand[ai] & ~(1 << Number(k.slotIndex));
      } else {
        var bi = items.indexOf(String(k.otherItem));
        if (!cand[ai] || !cand[bi]) continue;
        var maskFor = function (test, other) {
          var m = 0;
          for (var s = 0; s < n; s++) {
            for (var t = 0; t < n; t++) {
              if (!(other & (1 << t))) continue;
              if (test(s, t)) { m |= (1 << s); break; }
            }
          }
          return m;
        };
        var rel = k.type === 'before' ? function (s, t) { return s < t; }
          : k.type === 'after' ? function (s, t) { return s > t; }
            : k.type === 'adjacent' ? function (s, t) { return Math.abs(s - t) === 1; }
              : function (s, t) { return Math.abs(s - t) === Number(k.n); };
        var aNext = cand[ai] & maskFor(rel, cand[bi]);
        var bNext = cand[bi] & maskFor(function (t, s) { return rel(s, t); }, cand[ai]);
        if (aNext !== cand[ai]) { cand[ai] = aNext; changed = true; }
        if (bNext !== cand[bi]) { cand[bi] = bNext; changed = true; }
        continue;
      }
      if (next !== cand[ai]) { cand[ai] = next; changed = true; }
    }
    // Naked and hidden singles over the one bijection.
    for (var i = 0; i < n; i++) {
      var m = cand[i];
      if (m && (m & (m - 1)) === 0) {
        for (var j = 0; j < n; j++) {
          if (j !== i && (cand[j] & m)) { cand[j] &= ~m; changed = true; }
        }
      }
    }
    for (var s2 = 0; s2 < n; s2++) {
      var holders = 0;
      var count = 0;
      for (var i2 = 0; i2 < n; i2++) {
        if (cand[i2] & (1 << s2)) { holders = i2; count++; }
      }
      if (count === 1 && cand[holders] !== (1 << s2)) { cand[holders] = (1 << s2); changed = true; }
    }
  }

  var solvedByInference = true;
  for (var z = 0; z < n; z++) {
    if (!cand[z] || (cand[z] & (cand[z] - 1)) !== 0) { solvedByInference = false; break; }
  }
  return {
    score: rounds + (solvedByInference ? 0 : 5),
    basis: 'ordering-rounds',
    rounds: rounds,
    requiresGuess: !solvedByInference
  };
}

function sequenceAnswerShapeErrors(puzzle) {
  var errors = [];
  var who = label(puzzle);
  var from = puzzle.answerFrom || {};
  var slots = asArray(puzzle.slots).map(String);
  if (from.mode !== 'slot' && from.mode !== 'initials') {
    errors.push(who + ': answerFrom.mode is "' + String(from.mode) + '" — a sequence reads its answer '
      + 'as "slot" (the item that ends up in one named slot) or "initials" (the first letters of the '
      + 'items in slot order).');
    return errors;
  }
  if (from.mode === 'slot' && slots.indexOf(String(from.slot)) === -1) {
    errors.push(who + ': answerFrom names slot "' + String(from.slot) + '", which is not in the slot list.');
  }
  if (!normalizeAnswer(puzzle.answer)) {
    errors.push(who + ': the answer is empty once normalised.');
  }
  return errors;
}

/** solveSequence(puzzle) -> { ok, errors, solutionCount, solution, difficulty } */
export function solveSequence(puzzle) {
  var out = { ok: false, errors: [], solutionCount: 0, solution: null, difficulty: null };
  var p = puzzle || {};
  var who = label(p);

  out.errors = sequenceShapeErrors(p).concat(sequenceAnswerShapeErrors(p));
  if (out.errors.length) return out;

  var items = asArray(p.items).map(String);
  var slots = asArray(p.slots).map(String);
  // Resolve slot NAMES to indices once, so the search compares numbers.
  var compiled = asArray(p.orderClues).map(function (clue) {
    var k = Object.assign({}, (clue || {}).constraint || {});
    if (k.type === 'at' || k.type === 'not-at') k.slotIndex = slots.indexOf(String(k.slot));
    return k;
  });

  var found = enumerateSequences(p, compiled);
  out.solutionCount = found.length;
  if (!found.length) {
    out.errors.push(who + ': the clues have NO ordering — they contradict each other, so the printed '
      + 'board cannot be completed.');
    return out;
  }
  if (found.length > 1) {
    out.errors.push(who + ': the clues admit more than one ordering — a sequence must have exactly '
      + 'one. Add a clue that fixes an item to a slot, or one that separates the two orderings that '
      + 'survive.');
    return out;
  }

  var pos = found[0];
  out.solution = new Array(items.length);
  for (var i = 0; i < items.length; i++) out.solution[pos[i]] = items[i];
  out.difficulty = sequenceInferenceDepth(p, compiled);

  var from = p.answerFrom || {};
  var derived = from.mode === 'slot'
    ? out.solution[slots.indexOf(String(from.slot))]
    : out.solution.map(function (name) { return String(name).charAt(0); }).join('');

  if (normalizeAnswer(derived) !== normalizeAnswer(p.answer)) {
    out.errors.push(who + ': the solved ordering yields "' + derived + '" but the puzzle declares the '
      + 'answer "' + String(p.answer) + '" — the key must be what the board actually produces.');
    return out;
  }

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
  if (g.kind === 'sudoku') return solveSudoku(g);
  if (g.kind === 'kakuro') return solveKakuro(g);
  if (g.kind === 'kenken') return solveKenKen(g);
  if (g.kind === 'truth-tellers') return solveTruthTellers(g);
  if (g.kind === 'sequence') return solveSequence(g);
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
