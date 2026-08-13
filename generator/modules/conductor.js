// ── The conductor's pass (FUSION.md §4 mechanism 6) ──────────────────────────
// "A dedicated post-draft read of ONLY the play-order sequence — (load, story
// beat, mechanical beat) per week — auditing phrasing across the whole: tension
// rising with load where the score said it would, mechanical climaxes landing
// on emotional peaks, discord flagged, flatness flagged. The seam's analogue of
// VOICE.md's terminal-two-sentences audit: a dedicated step, because a general
// read passes over it every time."
//
// THE THIRD REFEREE. The critic (critic.js) grades the whole book on eight
// dimensions. The simulated player (sim-player.js) walks the printed economy.
// This one reads the SCORE and nothing else — it never sees a sentence of the
// book's prose. That restriction is the instrument, not a limitation of it:
// pacing is a property of the sequence, and a reader holding thirty thousand
// tokens of good weeks hears good weeks. FUSION §2 names the residual failure
// mode this exists for — "a book that passes every count and is still
// mezzo-forte for six straight weeks. Completeness as flatness."
//
// WHAT IS MEASURED HERE AND WHAT IS JUDGED THERE. Everything this file computes
// is a measurement of the artifact: the two curves (reused verbatim from
// buildFusionFrame — one home for the load proxy, D114), the declared marking's
// rung on the ladder, the spread of those markings, and where a week's
// declaration and its printed volume disagree. None of it is a verdict. The
// verdicts come back from the stage, in the closed vocabulary of
// CONDUCTOR_MECHANISMS, and this file's second half validates and normalizes
// them into failures the critic loop already knows how to route.
//
// ABSTENTION IS A FEATURE, third use of the formatWorkoutTopologyBlock idiom: a
// book that declares no fusionBeat gets no pass at all and says why, rather
// than a read of a score that does not exist. Every fixture in content/ is such
// a book, which is what keeps the sealed corpus untouched by this.

import {
  CONDUCTOR_MECHANISMS,
  CONDUCTOR_MAX_FINDINGS,
  STRUCTURAL_REOPEN_SCOPES,
  VALID_DYNAMIC_MARKINGS
} from './constants.js';
import { buildFusionFrame } from './critic.js';

var VALID_MECHANISMS = CONDUCTOR_MECHANISMS.reduce(function (acc, m) {
  acc[m.id] = 1;
  return acc;
}, {});

var VALID_SCOPES = STRUCTURAL_REOPEN_SCOPES.reduce(function (acc, s) {
  acc[s.id] = 1;
  return acc;
}, {});

var BEAT_CAP = 96;
var VERDICT_CAP = 240;
var CITE_CAP = 64;
var ISSUE_CAP = 240;
var DIRECTIVE_CAP = 240;

// Two weeks is the shortest thing that HAS a sequence. One week has a dynamic;
// it does not have phrasing, and asking a reader to hear phrasing in it invites
// an invented one.
var MIN_SEQUENCE_WEEKS = 2;

// A declared marking and a printed prose volume are on different scales
// (five rungs vs. an index against the book's own maximum), so they are
// compared as WITHIN-BOOK RANKS or not at all. 50 points of rank disagreement
// on a 0-100 scale is roughly "the declaration and the page are in different
// halves of the book" — wide enough that six-week noise does not trip it, tight
// enough to catch the inversion that matters: the week that declares itself
// quiet and prints the longest page.
var MISMATCH_TOLERANCE = 50;

function clip(text, cap) {
  var s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  return s.length > cap ? s.slice(0, cap - 1) + '…' : s;
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// Average-rank percentile over a set of values, 0 (lowest) to 100 (highest),
// ties sharing their mean rank. Returns null for a set of one, where "rank"
// would be a number with no comparison inside it.
function rankPercentiles(values) {
  var n = values.length;
  if (n < 2) return values.map(function () { return null; });
  return values.map(function (v) {
    var below = 0;
    var equal = 0;
    values.forEach(function (other) {
      if (other < v) below += 1;
      else if (other === v) equal += 1;
    });
    return Math.round((below + (equal - 1) / 2) / (n - 1) * 100);
  });
}

/**
 * buildConductorScore(booklet) -> { skipped, skipReason, rows, dynamics, ... }
 *
 * Pure. The projection the conductor stage reads, and the ONLY thing it reads.
 * Machine-readable throughout so a test can assert the measurement rather than
 * the sentence — the buildFusionFrame rule, which this reuses wholesale rather
 * than re-deriving: there is one home for the load proxy (D114) and this is not
 * it.
 */
export function buildConductorScore(booklet) {
  var weeks = (booklet && booklet.weeks) || [];
  if (weeks.length < MIN_SEQUENCE_WEEKS) {
    return skip('this book has fewer than ' + MIN_SEQUENCE_WEEKS + ' weeks — a sequence that short has'
      + ' a dynamic but no phrasing');
  }

  var frame = buildFusionFrame(booklet);
  if (!frame.rows.length) {
    return skip('the fusion frame found no weeks to index');
  }

  var beatByWeek = {};
  weeks.forEach(function (w, wi) {
    var weekNumber = Number((w && w.weekNumber) || (wi + 1));
    var beat = (w && w.fusionBeat) || null;
    if (!beat || typeof beat !== 'object') return;
    var marking = String(beat.marking || '').trim();
    beatByWeek[String(weekNumber)] = {
      beat: clip(beat.beat, BEAT_CAP),
      marking: marking,
      markingIndex: VALID_DYNAMIC_MARKINGS.indexOf(marking)
    };
  });

  var rows = frame.rows.map(function (r) {
    var declared = beatByWeek[String(r.week)] || null;
    return {
      week: r.week,
      isBoss: r.isBoss,
      isDeload: r.isDeload,
      isPeak: r.isPeak,
      sessions: r.sessions,
      loadIndex: r.loadIndex,
      proseIndex: r.proseIndex,
      title: r.title,
      interlude: r.interlude,
      mechanics: r.mechanics,
      beat: declared ? declared.beat : '',
      marking: declared ? declared.marking : '',
      // -1 when a week declares a marking outside the ladder. The stage
      // validators block that at generation, so it can only reach here on a
      // hand-loaded or pre-floors book; it is carried rather than dropped so
      // the projection never silently improves the artifact.
      markingIndex: declared ? declared.markingIndex : null,
      declaredRank: null,
      printedRank: null,
      mismatch: false
    };
  });

  var marked = rows.filter(function (r) { return r.markingIndex != null && r.markingIndex >= 0; });
  if (!marked.length) {
    return skip('no week declares a fusionBeat — there is no score to read, so there is nothing'
      + ' this pass could say that the general read cannot');
  }

  // Ranks are computed over the MARKED weeks only. An unmarked week has no
  // declaration to disagree with, and including it would rank a book against
  // weeks that never took a position.
  var declaredRanks = rankPercentiles(marked.map(function (r) { return r.markingIndex; }));
  var printedRanks = rankPercentiles(marked.map(function (r) { return Number(r.proseIndex) || 0; }));
  marked.forEach(function (r, i) {
    r.declaredRank = declaredRanks[i];
    r.printedRank = printedRanks[i];
    r.mismatch = r.declaredRank != null && r.printedRank != null
      && Math.abs(r.declaredRank - r.printedRank) >= MISMATCH_TOLERANCE;
  });

  var markingCounts = {};
  marked.forEach(function (r) {
    markingCounts[r.marking] = (markingCounts[r.marking] || 0) + 1;
  });
  var markingIndices = marked.map(function (r) { return r.markingIndex; });
  var proseIndices = rows.map(function (r) { return Number(r.proseIndex) || 0; });
  var distinctMarkings = Object.keys(markingCounts).length;

  return {
    skipped: false,
    skipReason: '',
    weekCount: rows.length,
    weeksWithBeat: marked.length,
    shape: frame.shape,
    loadReadable: frame.loadReadable,
    peakWeek: frame.peakWeek,
    rows: rows,
    dynamics: {
      markingCounts: markingCounts,
      distinctMarkings: distinctMarkings,
      // Rungs of VALID_DYNAMIC_MARKINGS actually used, out of the ladder's
      // span. Zero is the measurement behind "mezzo-forte for six weeks": the
      // book declared one volume and never left it.
      markingSpread: Math.max.apply(null, markingIndices) - Math.min.apply(null, markingIndices),
      markingLadderSpan: VALID_DYNAMIC_MARKINGS.length - 1,
      // The PRINTED spread, beside the declared one, because the two can
      // disagree in either direction: a score with range the pages do not
      // honour, or pages with range no week declared.
      proseSpread: Math.max.apply(null, proseIndices) - Math.min.apply(null, proseIndices),
      uniformMarking: distinctMarkings === 1 && marked.length >= MIN_SEQUENCE_WEEKS,
      mismatches: marked.filter(function (r) { return r.mismatch; })
        .map(function (r) { return r.week; })
    }
  };
}

function skip(reason) {
  return { skipped: true, skipReason: reason, rows: [], dynamics: null, weekCount: 0, weeksWithBeat: 0 };
}

/**
 * formatConductorScoreBlock(score) -> string
 *
 * One line per week and a measured caption. '' when the score abstains, so the
 * caller drops the section rather than printing a table of nulls.
 *
 * The load caption is quoted from the same honesty ruling buildFusionFrame
 * carries (D114): when the volume proxy cannot see a weight-progression
 * program, the block says the curve is unreadable instead of printing a flat
 * one, because "the training never changes" is a false thing to teach a reader
 * about a book whose player is adding five pounds a week.
 */
export function formatConductorScoreBlock(score) {
  if (!score || score.skipped || !score.rows.length) return '';
  var d = score.dynamics;
  var lines = [
    '## The Score (measured — the play-order sequence, one line per week)',
    score.loadReadable
      ? 'load = training volume as an index against this book\'s heaviest week (program shape: '
        + score.shape + (score.peakWeek != null ? ', heaviest week ' + score.peakWeek : '') + ').'
      : 'load = NOT READABLE from this artifact. The volume proxy (sets x reps) is \'' + score.shape
        + '\' across the book, which is what a program that progresses by WEIGHT looks like — and the'
        + ' weights are write-in blanks nobody has filled yet. Do NOT read this as "the training never'
        + ' changes". Read the prose curve against the session counts and the DELOAD and BOSS marks.',
    'prose = words printed on this week\'s story surfaces, indexed against its wordiest week.',
    'declared = the week\'s own fusionBeat: the dynamic marking it chose from the ladder',
    '  ' + VALID_DYNAMIC_MARKINGS.join(' < ') + ', then the beat it named for itself.',
    's = sessions. These are measurements of the artifact, not judgments of it.'
  ];
  score.rows.forEach(function (r) {
    var tags = [];
    if (r.isPeak) tags.push('PEAK');
    if (r.isDeload) tags.push('DELOAD');
    if (r.isBoss) tags.push('BOSS');
    lines.push([
      'w' + r.week,
      'load ' + (r.loadIndex == null ? '—' : r.loadIndex) + (tags.length ? ' ' + tags.join('+') : ''),
      'prose ' + (r.proseIndex == null ? '?' : r.proseIndex),
      's' + r.sessions,
      'declared ' + (r.marking || 'NONE'),
      '"' + r.title + '"' + (r.interlude ? ' +interlude "' + r.interlude + '"' : ''),
      r.mechanics.length ? r.mechanics.join(', ') : 'no mechanical surfaces'
    ].join(' | '));
    if (r.beat) lines.push('     beat: "' + r.beat + '"');
  });
  lines.push('');
  lines.push('Measured dynamics: ' + score.weeksWithBeat + ' of ' + score.weekCount
    + ' week(s) declare a marking; ' + d.distinctMarkings + ' distinct marking(s) across the book ('
    + Object.keys(d.markingCounts).map(function (k) { return k + ' x' + d.markingCounts[k]; }).join(', ')
    + '); the declared markings span ' + d.markingSpread + ' of ' + d.markingLadderSpan
    + ' rungs; the printed prose index spans ' + d.proseSpread + ' points.');
  if (d.mismatches.length) {
    lines.push('Declared and printed disagree by half the book or more in week(s): '
      + d.mismatches.map(function (w) { return 'w' + w; }).join(', ')
      + ' — the marking these weeks chose sits on the opposite side of the book from the volume they'
      + ' actually print.');
  }
  return lines.join('\n');
}

// ── Report validation (runJsonStage retry convention: '' = ok) ──────────────
// Deliberately strict on the two things that make the read USABLE and lenient
// on everything else: every week in the score must get a verdict (a pass that
// covers four of six weeks has not read the sequence), and every verdict must
// name a mechanism from the closed vocabulary (an invented one cannot be
// counted, compared, or argued with).
export function validateConductorReport(raw, score) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return 'conductor response is not an object';
  }
  var problems = [];
  if (!nonEmpty(raw.reading)) problems.push('conductor report has no `reading` — the whole-book hearing is missing');
  var weeks = Array.isArray(raw.weeks) ? raw.weeks : null;
  if (!weeks) {
    problems.push('conductor report `weeks` is not an array');
  } else {
    var seen = {};
    weeks.forEach(function (w, i) {
      var n = Number((w || {}).week);
      if (!isFinite(n)) { problems.push('conductor weeks[' + i + '] has no numeric `week`'); return; }
      seen[String(n)] = 1;
      if (!VALID_MECHANISMS[String((w || {}).mechanism || '')]) {
        problems.push('conductor weeks[' + i + '] names mechanism "' + String((w || {}).mechanism)
          + '", which is not one of: ' + Object.keys(VALID_MECHANISMS).join(', '));
      }
      if (!nonEmpty((w || {}).verdict)) problems.push('conductor weeks[' + i + '] has an empty `verdict`');
    });
    ((score && score.rows) || []).forEach(function (r) {
      if (!seen[String(r.week)]) problems.push('conductor report gives week ' + r.week + ' no verdict');
    });
  }
  if (raw.findings !== undefined && !Array.isArray(raw.findings)) {
    problems.push('conductor report `findings` is not an array');
  }
  return problems.join('; ');
}

/**
 * normalizeConductorReport(raw, score) -> the report the loop consumes
 *
 * Mirrors normalizeCriticVerdict's shape and its FAIL-SAFE DEMOTION: a finding
 * that declares no valid reopen scope is not dropped — it runs, as a prose
 * finding. A dropped finding is a defect nobody hears about; a demoted one is a
 * defect somebody rewrites.
 */
export function normalizeConductorReport(raw, score) {
  var weekSet = {};
  ((score && score.rows) || []).forEach(function (r) { weekSet[String(r.week)] = 1; });

  var weeks = (Array.isArray(raw && raw.weeks) ? raw.weeks : [])
    .filter(function (w) {
      return w && weekSet[String(Number(w.week))] && VALID_MECHANISMS[String(w.mechanism || '')]
        && nonEmpty(w.verdict);
    })
    .map(function (w) {
      return {
        week: Number(w.week),
        mechanism: String(w.mechanism),
        verdict: clip(w.verdict, VERDICT_CAP),
        cites: (Array.isArray(w.cites) ? w.cites : [])
          .filter(function (c) { return nonEmpty(c); })
          .map(function (c) { return clip(c, CITE_CAP); })
      };
    });

  var findings = (Array.isArray(raw && raw.findings) ? raw.findings : [])
    .filter(function (f) {
      return f && weekSet[String(Number(f.week))] && VALID_MECHANISMS[String(f.mechanism || '')]
        && nonEmpty(f.issue) && nonEmpty(f.directive);
    })
    .map(function (f) {
      var reopen = (Array.isArray(f.reopen) ? f.reopen : [])
        .map(function (r) { return String(r || '').trim(); })
        .filter(function (r) { return VALID_SCOPES[r]; })
        .filter(function (r, i, arr) { return arr.indexOf(r) === i; });
      // Canonical enum order, so a given report produces a byte-stable revision
      // prompt regardless of the order the model listed its scopes in.
      reopen = STRUCTURAL_REOPEN_SCOPES.map(function (s) { return s.id; })
        .filter(function (id) { return reopen.indexOf(id) !== -1; });
      return {
        week: Number(f.week),
        mechanism: String(f.mechanism),
        issue: clip(f.issue, ISSUE_CAP),
        directive: clip(f.directive, DIRECTIVE_CAP),
        scope: reopen.length ? 'structure' : 'prose',
        reopen: reopen
      };
    })
    .slice(0, CONDUCTOR_MAX_FINDINGS);

  return {
    skipped: false,
    skipReason: '',
    reading: clip((raw && raw.reading) || '', VERDICT_CAP * 2),
    weeks: weeks,
    findings: findings,
    // The measurements ride along so _criticReport carries the evidence the
    // verdicts were formed against, not only the verdicts. An eval reading two
    // books needs the curve, not the adjective.
    measured: score && score.dynamics ? score.dynamics : null
  };
}

/**
 * conductorFailures(report) -> failure objects in the critic's own raw shape
 *
 * THE PRE-SEED. These are pushed onto the round-one verdict's `fusionPacing`
 * failures BEFORE normalizeCriticVerdict runs, which means they travel every
 * law the critic's own failures travel and gain no privileges: the same
 * unitType/unitRef/directive validation, the same reopen-scope filtering, the
 * same fail-safe demotion, the same union-by-unit in selectRevisionTargets, and
 * the same three floors (identity, generation, validity) at acceptance.
 *
 * One consequence is deliberate and worth stating plainly: normalizeCriticVerdict
 * clamps any dimension carrying an open failure below the ship threshold, so a
 * conductor finding holds fusionPacing open for round one even when the critic
 * would have passed it. That is not a new rule — it is the evidence law the
 * critic has always run under ("a score at or above threshold while open
 * failures remain is INVALID"), applied to a failure the critic did not author.
 */
export function conductorFailures(report) {
  if (!report || report.skipped) return [];
  return (report.findings || []).map(function (f) {
    return {
      unitType: 'week',
      unitRef: f.week,
      issue: f.issue,
      directive: f.directive,
      scope: f.scope,
      reopen: f.reopen.slice()
    };
  });
}

/**
 * formatConductorReportBlock(report) -> string
 *
 * The read as EVIDENCE for the critic, beside the fusion frame and the spine
 * frame. '' when the pass abstained or found nothing to say.
 */
export function formatConductorReportBlock(report) {
  if (!report || report.skipped) return '';
  var weeks = report.weeks || [];
  var findings = report.findings || [];
  if (!weeks.length && !findings.length) return '';
  var lines = [
    '## The Conductor\'s Read (a dedicated pass over the play-order sequence)',
    'A separate reader was given ONLY the sequence — per week the two curves, the marking and beat',
    'the week declared for itself, and the surfaces it prints — and asked how the book is PHRASED.',
    'It never saw a sentence of the prose, which is the point: pacing is a property of the whole,',
    'and a reader holding the pages hears the pages. Weigh these as evidence for fusionPacing —',
    'adopt them, or cite the prose that shows the reading is wrong.'
  ];
  if (report.reading) lines.push('reading: ' + report.reading);
  weeks.forEach(function (w) {
    lines.push('  w' + w.week + ' ' + w.mechanism + ' — ' + w.verdict
      + (w.cites.length ? ' [reads: ' + w.cites.join('; ') + ']' : ''));
  });
  if (findings.length) {
    lines.push('  FINDINGS it prioritized — already entered as fusionPacing failures, so they are');
    lines.push('  targets this round whether or not you name them; grade them, do not re-file them:');
    findings.forEach(function (f) {
      lines.push('  - w' + f.week + ' ' + f.mechanism + ': ' + f.issue + ' → ' + f.directive
        + (f.reopen.length ? ' (reopens ' + f.reopen.join(', ') + ')' : ' (prose)'));
    });
  }
  return lines.join('\n');
}

/**
 * conductorSummaryLine(report) -> string
 *
 * One line for a log. Skips say WHY, because a silent skip is indistinguishable
 * from a pass and that is how a gate becomes vacuous (the simSummaryLine rule).
 */
export function conductorSummaryLine(report) {
  if (!report) return 'conductor: no report';
  if (report.skipped) return 'conductor: SKIPPED — ' + report.skipReason;
  var m = report.measured || {};
  return 'conductor: ' + (report.weeks || []).length + ' week verdict(s), '
    + (report.findings || []).length + ' finding(s); '
    + (m.distinctMarkings || 0) + ' distinct marking(s) spanning ' + (m.markingSpread || 0)
    + ' of ' + (m.markingLadderSpan || 0) + ' rungs, prose spread ' + (m.proseSpread || 0);
}
