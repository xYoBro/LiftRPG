/**
 * Workout topology digest (§10.4 — the Armed Lens).
 *
 * A deterministic JS pre-pass over the normalized workout that emits the SHAPE
 * of the training block as structured facts: how many weeks, how many sessions
 * per week, where the volume peaks, where the deloads sit, and what progression
 * shape the numbers describe.
 *
 * WHY THIS IS JS AND NOT A PROMPT INSTRUCTION. The program is the story's clock.
 * Asking the model to infer the clock from a wall of exercise text spends tokens
 * on arithmetic and returns a different answer every run. Counting sets is not a
 * creative act; choosing what the count MEANS is. So the counting happens here,
 * once, deterministically, and the meaning-making happens in the triptych.
 *
 * CONTRACT WITH THE COMPILER: the digest is candidate PRESSURE, never
 * determinism (INST_ARTIFACT_COMPILER Step 3). It states facts; it never names
 * a genre, family, or tone. `unknown` is a first-class answer — an unparseable
 * program simply removes the signal rather than inventing one, because a
 * confident wrong shape is worse than no shape.
 *
 * PURITY: no Date.now, no Math.random, no network, no DOM. Same input, same
 * output, forever — which is what lets it run before the checkpoint fingerprint
 * without perturbing run identity.
 *
 * Home ruling (§11 Wave 1): a module here rather than beside
 * normalizeWorkoutParam in api-generator.js, so Node can import and unit-test
 * it directly. It self-registers on `window` for the classic-IIFE consumers
 * (generator.js is not a module and cannot import).
 */

// Volume proxy: sets x reps summed over a line. Not a real training-stress
// model — it is a monotone-ish proxy that only ever gets compared against
// itself, week over week, inside one program.
var SETSxREPS = /(\d+)\s*[x×]\s*(\d+)/g;

// Explicit author intent. When the program SAYS deload, that outranks anything
// the arithmetic infers.
var DELOAD_MARKER = /\b(deload|de-load|back[-\s]?off week|recovery week|unload)\b/i;

// Weeks whose volume sits this far below the mean of their neighbours read as a
// deliberate dip rather than noise.
var DELOAD_DIP_RATIO = 0.82;
// Below this spread, a program is flat: week-to-week wobble, not progression.
var STEADY_RANGE_RATIO = 1.08;
// Diffs smaller than this fraction of the mean are flat, not a direction change.
// Without it, +1 rep in week 3 reads as a reversal and everything is a wave.
var FLAT_EPSILON = 0.04;
// A peak has to actually stand out from the shoulder next to it.
var PEAK_PROMINENCE = 1.05;

function lineVolume(line) {
  var total = 0;
  var m;
  SETSxREPS.lastIndex = 0;
  while ((m = SETSxREPS.exec(line)) !== null) {
    var sets = parseInt(m[1], 10);
    var reps = parseInt(m[2], 10);
    if (isFinite(sets) && isFinite(reps) && sets > 0 && reps > 0 && sets <= 20 && reps <= 100) {
      total += sets * reps;
    }
  }
  return total;
}

// ── Source A: the rich normalized object (wizard / Liftoscript paths) ───────
function weeksFromNormalized(nw) {
  var weeks = (nw && nw.weeks) || [];
  if (!weeks.length) return null;
  var out = [];
  for (var i = 0; i < weeks.length; i++) {
    var w = weeks[i] || {};
    var sessions = w.sessions || [];
    var volume = 0;
    var text = '';
    for (var s = 0; s < sessions.length; s++) {
      var exercises = (sessions[s] && sessions[s].exercises) || [];
      text += ' ' + ((sessions[s] && sessions[s].dayLabel) || '') + ' ' + ((sessions[s] && sessions[s].notes) || '');
      for (var e = 0; e < exercises.length; e++) {
        var ex = exercises[e] || {};
        var sets = parseInt(ex.sets, 10);
        var repsMatch = String(ex.repsPerSet || '').match(/\d+/);
        var reps = repsMatch ? parseInt(repsMatch[0], 10) : 0;
        if (isFinite(sets) && isFinite(reps) && sets > 0 && reps > 0) volume += sets * reps;
        text += ' ' + (ex.name || '') + ' ' + (ex.notes || '');
      }
    }
    out.push({
      weekNumber: typeof w.weekNumber === 'number' ? w.weekNumber : (i + 1),
      sessionCount: sessions.length,
      volume: volume,
      declaredDeload: !!w.isDeload || DELOAD_MARKER.test(text)
    });
  }
  return out;
}

// ── Source B: raw pasted text (the path every real caller actually takes) ───
// normalizeWorkoutParam's fallback branch produces weeks:[] and zeroed summary
// fields, so rawText is the only real signal in practice. Parsing it is the
// whole job, not a fallback.
function weeksFromRawText(rawText) {
  var lines = String(rawText || '').split('\n');
  var blocks = [];
  var current = null;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var header = line.match(/^\s*week\s+(\d+)\b/i);
    if (header) {
      current = { weekNumber: parseInt(header[1], 10), sessionCount: 0, volume: 0, text: line };
      blocks.push(current);
      continue;
    }
    if (!current) continue;                    // preamble before Week 1
    if (!line.trim()) continue;
    current.text += ' ' + line;
    // A session line: indented, or explicitly labelled a day/session. Both
    // shapes appear in pasted programs; requiring both would drop half of them.
    var isSession = /^\s+\S/.test(line) || /^\s*(day|session|workout)\b/i.test(line);
    if (isSession) {
      current.sessionCount++;
      current.volume += lineVolume(line);
    }
  }
  if (!blocks.length) return null;
  return blocks.map(function (b) {
    return {
      weekNumber: b.weekNumber,
      sessionCount: b.sessionCount,
      volume: b.volume,
      declaredDeload: DELOAD_MARKER.test(b.text)
    };
  });
}

// ── Progression shape ──────────────────────────────────────────────────────
// Conservative by construction: every branch that cannot be defended returns
// `unknown`. The signal is optional; a wrong signal is not.
function classifyShape(volumes) {
  if (volumes.length < 3) return 'unknown';
  var positive = volumes.filter(function (v) { return v > 0; });
  if (positive.length < volumes.length || positive.length < 3) return 'unknown';

  var max = Math.max.apply(null, volumes);
  var min = Math.min.apply(null, volumes);
  if (min <= 0) return 'unknown';
  if (max / min <= STEADY_RANGE_RATIO) return 'steady';

  var mean = volumes.reduce(function (a, b) { return a + b; }, 0) / volumes.length;
  var flatBand = mean * FLAT_EPSILON;

  // Direction sequence with a dead band, so rep-level noise is not a reversal.
  var dirs = [];
  for (var i = 1; i < volumes.length; i++) {
    var d = volumes[i] - volumes[i - 1];
    if (Math.abs(d) <= flatBand) continue;
    dirs.push(d > 0 ? 1 : -1);
  }
  var reversals = 0;
  for (var j = 1; j < dirs.length; j++) if (dirs[j] !== dirs[j - 1]) reversals++;

  var peakIndex = volumes.indexOf(max);
  var last = volumes.length - 1;

  if (reversals === 0) {
    if (!dirs.length) return 'steady';
    return dirs[0] > 0 ? 'linear' : 'unknown';   // a monotonically DEcreasing block is not a shape we name
  }
  if (reversals === 1) {
    // Rise then taper is a peak — but only if the peak actually stands proud of
    // the week after it, otherwise it is a plateau with a rounding artifact.
    if (peakIndex < last && max >= volumes[last] * PEAK_PROMINENCE) return 'peak';
    return 'wave';
  }
  return 'wave';
}

/**
 * @param {object|string} nw - normalizeWorkoutParam output, or raw program text.
 * @returns {{basis: string, weekCount: number|null, sessionsPerWeek: number[],
 *            sessionsPerWeekLabel: string, peakWeek: number|null,
 *            deloadWeeks: number[], progressionShape: string}}
 */
export function buildWorkoutTopology(nw) {
  var empty = {
    basis: 'none',
    weekCount: null,
    sessionsPerWeek: [],
    sessionsPerWeekLabel: 'unknown',
    peakWeek: null,
    deloadWeeks: [],
    progressionShape: 'unknown'
  };
  if (!nw) return empty;

  var basis = 'normalized';
  var weeks = typeof nw === 'string' ? null : weeksFromNormalized(nw);
  if (!weeks) {
    basis = 'raw-text';
    weeks = weeksFromRawText(typeof nw === 'string' ? nw : (nw.rawText || ''));
  }
  if (!weeks || !weeks.length) {
    // Declared week count still beats nothing, even with no shape behind it.
    var declared = (nw && typeof nw === 'object' && typeof nw.weekCount === 'number') ? nw.weekCount : null;
    return Object.assign({}, empty, { weekCount: declared });
  }

  var sessionsPerWeek = weeks.map(function (w) { return w.sessionCount; });
  var volumes = weeks.map(function (w) { return w.volume; });
  var shape = classifyShape(volumes);

  // Peak: reported only when the block actually has a shape. A `steady` block's
  // argmax is noise, and naming it would invent a climax the program does not
  // have — the single most tempting wrong answer this digest can give.
  var peakWeek = null;
  if (shape !== 'unknown' && shape !== 'steady') {
    var peakMax = Math.max.apply(null, volumes);
    if (peakMax > 0) peakWeek = weeks[volumes.indexOf(peakMax)].weekNumber;
  }

  // Deloads: declared markers always count; inferred dips only when the
  // arithmetic is unambiguous against BOTH neighbours.
  var deloadWeeks = [];
  for (var i = 0; i < weeks.length; i++) {
    if (weeks[i].declaredDeload) { deloadWeeks.push(weeks[i].weekNumber); continue; }
    if (i === 0 || i === weeks.length - 1) continue;   // an end week has no "dip"
    var neighbourMean = (volumes[i - 1] + volumes[i + 1]) / 2;
    if (neighbourMean > 0 && volumes[i] > 0 && volumes[i] <= neighbourMean * DELOAD_DIP_RATIO) {
      deloadWeeks.push(weeks[i].weekNumber);
    }
  }

  var uniqueCounts = sessionsPerWeek.filter(function (v, i, a) { return a.indexOf(v) === i; });
  var label;
  if (!sessionsPerWeek.length || uniqueCounts.every(function (c) { return c === 0; })) {
    label = 'unknown';
  } else if (uniqueCounts.length === 1) {
    label = String(uniqueCounts[0]);
  } else {
    label = 'varies (' + Math.min.apply(null, sessionsPerWeek) + '-' + Math.max.apply(null, sessionsPerWeek) + ')';
  }

  return {
    basis: basis,
    weekCount: weeks.length,
    sessionsPerWeek: sessionsPerWeek,
    sessionsPerWeekLabel: label,
    peakWeek: peakWeek,
    deloadWeeks: deloadWeeks,
    progressionShape: shape
  };
}

/**
 * Render the digest as the prompt's derived-context block.
 *
 * Deliberately fact-only: no genre names, no tonal adjectives, no "therefore".
 * The moment this block suggests what a shape MEANS, topology stops being
 * pressure and starts being determinism — and every peaking program produces
 * the same book.
 *
 * Returns '' when there is nothing honest to say, so the caller can filter it
 * out rather than print a block of nulls.
 */
export function formatWorkoutTopologyBlock(topology) {
  if (!topology) return '';
  if (topology.progressionShape === 'unknown' && topology.weekCount == null) return '';
  var lines = ['## Program Shape (derived, not authored)'];
  if (topology.weekCount != null) lines.push('- weeks: ' + topology.weekCount);
  if (topology.sessionsPerWeekLabel && topology.sessionsPerWeekLabel !== 'unknown') {
    lines.push('- sessions per week: ' + topology.sessionsPerWeekLabel);
  }
  lines.push('- progression shape: ' + topology.progressionShape);
  if (topology.peakWeek != null) lines.push('- heaviest week: ' + topology.peakWeek);
  if (topology.deloadWeeks && topology.deloadWeeks.length) {
    lines.push('- lighter weeks: ' + topology.deloadWeeks.join(', '));
  }
  lines.push('These are measurements of the program, not instructions about genre.');
  lines.push('Treat them as pressure on your candidate readings, never as a decision.');
  return lines.join('\n');
}

/**
 * looksLikeDeloadWeek(text) -> boolean
 *
 * Whether a slice of program text DECLARES itself a deload. The explicit-intent
 * half of the deload signal, exported so the Teeth Round's week floors can ask
 * the question without re-growing the pattern (Teeth Round T1a).
 *
 * It is deliberately the DECLARED half only — never the volume-dip inference,
 * which needs the whole program to compare against and cannot be answered from
 * one week's text. A week that dips without saying so still owes its
 * micro-line: the floors must fail SAFE toward demanding content, and a wrong
 * "this is a deload" would silently excuse a week from the whole game layer.
 *
 * SINGLE HOME: DELOAD_MARKER is declared once, here, and read by
 * weeksFromNormalized / weeksFromRawText above and by this predicate.
 */
export function looksLikeDeloadWeek(text) {
  return DELOAD_MARKER.test(String(text || ''));
}

// Classic-IIFE consumers (generator.js) cannot import; they read these off
// window. Guarded so Node imports stay side-effect free.
if (typeof window !== 'undefined') {
  window.buildWorkoutTopology = buildWorkoutTopology;
  window.formatWorkoutTopologyBlock = formatWorkoutTopologyBlock;
  window.looksLikeDeloadWeek = looksLikeDeloadWeek;
}
