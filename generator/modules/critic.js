// ── Composition critic helpers (D66) ─────────────────────────────────────────
// Pure functions for the critic loop: digest building, verdict validation and
// normalization (the evidence law gets mechanical teeth here), revision-target
// selection, and unit get/set on the assembled booklet.
//
// The loop itself lives in api-generator.js (it needs the stage runner and
// validators); everything here is side-effect-free and unit-testable.

import {
  CRITIC_DIMENSIONS,
  CRITIC_SCORE_THRESHOLD,
  CRITIC_MAX_REVISIONS_PER_ROUND,
  STRUCTURAL_REOPEN_SCOPES
} from './constants.js';
import { buildWorkoutTopology } from './workout-topology.js';
import { simulateBook } from './sim-player.js';
import {
  validateWeekSchema,
  validateFragmentsStage,
  collectBudgetBreaches,
  unknownKeyPathsForUnit
} from './validation.js';

var VALID_UNIT_TYPES = { week: 1, fragment: 1, ending: 1, rulesSpread: 1 };

var VALID_REOPEN_SCOPES = STRUCTURAL_REOPEN_SCOPES.reduce(function (acc, s) {
  acc[s.id] = 1;
  return acc;
}, {});

// ── Digest: the booklet as the critic sees it ────────────────────────────────
// Strips internal `_` fields and the encrypted-ending blob, and compacts each
// session's exercises array into a one-line summary — the critic needs the
// workout's SHAPE (for fusionPacing), never its full table data.
export function buildCriticDigest(booklet) {
  var digest = JSON.parse(JSON.stringify(booklet, function (key, value) {
    if (key && key.charAt(0) === '_') return undefined;
    if (key === 'exercises') return undefined;
    if (key === 'passwordEncryptedEnding') return undefined;
    return value;
  }));
  var srcWeeks = (booklet && booklet.weeks) || [];
  var digWeeks = digest.weeks || [];
  for (var wi = 0; wi < digWeeks.length && wi < srcWeeks.length; wi++) {
    var srcSessions = srcWeeks[wi].sessions || [];
    var digSessions = digWeeks[wi].sessions || [];
    for (var si = 0; si < digSessions.length && si < srcSessions.length; si++) {
      var exs = srcSessions[si].exercises || [];
      digSessions[si].exerciseSummary = exs.map(function (ex) {
        return (ex.name || 'Lift') + ' ' + (ex.sets || '?') + 'x' + (ex.repsPerSet || '?');
      }).join('; ');
    }
  }
  return digest;
}

// ── The fusion frame (Teeth T4 — FUSION.md mechanism 6, in evidence form) ────
// The conductor's material: the per-week play-order sequence — (load, prose,
// story labels, mechanical surfaces) — as ONE line per week.
//
// WHY A FRAME AT ALL. Everything below is already inside the digest, and the
// critic could in principle derive it. It never did: in the JSON the weeks sit
// thousands of tokens apart, so the SEQUENCE — the only thing pacing is a
// property of — is invisible while every individual week reads fine. That is
// the failure FUSION.md §2 names: completeness as flatness. The frame is an
// index into the digest, not a summary of it; findings still cite the prose.
//
// TWO CURVES, DELIBERATELY. Load (what the body does) and prose volume (how
// loudly the page speaks) are printed as indices against the book's own maxima,
// so §3's law — stakes parallel the load, texture COUNTERPOINTS it — is a
// comparison a reader can make in one pass instead of an impression. A book
// whose two curves rise together is doubling; one whose prose curve is flat is
// mezzo-forte for six weeks.
//
// The load proxy is not re-derived here: buildWorkoutTopology owns sets x reps,
// and it is run against the ASSEMBLED BOOKLET rather than the user's raw
// program because the critic grades the artifact that shipped — the printed
// table is what the player will actually lift.
var FRAME_TITLE_CAP = 40;
var FRAME_INTERLUDE_CAP = 32;
var FRAME_CLOCK_CAP = 3;

function frameWords(text) {
  var s = String(text == null ? '' : text).trim();
  if (!s) return 0;
  return s.split(/\s+/).length;
}

function frameText(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value !== 'object') return String(value);
  return [value.body, value.text, value.content, value.finalLine]
    .filter(function (v) { return typeof v === 'string'; })
    .join(' ');
}

function frameClip(text, cap) {
  var s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= cap) return s;
  return s.slice(0, cap - 1) + '…';
}

function frameIndex(value, max) {
  if (!max || !isFinite(max) || max <= 0) return null;
  return Math.round((Number(value) || 0) / max * 100);
}

// Fragments are attributed to the FIRST week that references them: the player
// reads a document once, on the session that hands it over, so counting it
// again in a later week would inflate that week's reading load with pages
// nobody re-reads.
function buildFragmentIndex(booklet) {
  var byId = {};
  ((booklet && booklet.fragments) || []).forEach(function (f) {
    if (!f || !f.id) return;
    byId[String(f.id).trim().toLowerCase()] = f;
  });
  return byId;
}

function weekMechanics(week) {
  var out = [];
  var fo = (week && week.fieldOps) || {};
  var cipher = fo.cipher;
  if (cipher) out.push('cipher ' + (cipher.type || 'untyped'));
  var oracle = fo.oracleTable || fo.oracle;
  if (oracle) out.push('oracle ' + ((oracle.entries || []).length));
  var clocks = (week && week.gameplayClocks) || [];
  if (clocks.length) {
    var shown = clocks.slice(0, FRAME_CLOCK_CAP).map(function (c) {
      return frameClip((c && c.clockName) || 'clock', 24)
        + ' ' + (Number((c || {}).startValue) || 0) + '/' + (Number((c || {}).segments) || 0);
    });
    if (clocks.length > FRAME_CLOCK_CAP) shown.push('+' + (clocks.length - FRAME_CLOCK_CAP) + ' more');
    out.push('clocks ' + shown.join(' & '));
  }
  if (week && week.doorChoice) out.push('door');
  var marks = 0;
  var micro = 0;
  ((week && week.sessions) || []).forEach(function (s) {
    var strip = s && s.markStrip;
    if (strip && Array.isArray(strip.targets)) marks += strip.targets.length;
    if (s && Array.isArray(s.microLines)) micro += s.microLines.length;
  });
  if (marks) out.push('marks ' + marks);
  if (micro) out.push('micro ' + micro);
  if (week && week.reckoning) out.push('reckoning');
  var companions = fo.companionComponents || [];
  if (companions.length) {
    out.push('companion ' + companions.map(function (c) { return (c && c.type) || 'untyped'; }).join('/'));
  }
  var mapType = (fo.mapState || {}).mapType;
  if (mapType) out.push('map ' + mapType);
  if (week && week.bossEncounter) out.push('boss encounter');
  return out;
}

// The topology reads the USER'S PROGRAM, where "deload" appears in a week
// header and means the week is light. Handing it a booklet's transcribed
// exercise list feeds it fiction and equipment names instead, and a program
// carrying one accessory named for a back-off set marks every week it appears
// in as a deload — measured on the corpus, not imagined. So the frame projects
// the booklet down to the numbers the proxy actually needs and drops the text:
// `isDeload` is an AUTHORED field on the week, and the volume-dip inference
// still runs on real numbers.
function topologyInput(booklet) {
  return {
    weeks: ((booklet && booklet.weeks) || []).map(function (w, wi) {
      return {
        weekNumber: Number((w && w.weekNumber) || (wi + 1)),
        isDeload: !!(w && w.isDeload),
        sessions: ((w && w.sessions) || []).map(function (s) {
          return {
            exercises: ((s && s.exercises) || []).map(function (ex) {
              return { sets: (ex || {}).sets, repsPerSet: (ex || {}).repsPerSet };
            })
          };
        })
      };
    })
  };
}

// Whether the load curve can be READ at all. The volume proxy is sets x reps,
// so a program that progresses by adding weight — which is most strength
// programs — is flat under it, and the weights themselves are write-in blanks
// the player has not filled. Printing a flat index in that case does not merely
// waste tokens: it invites the judgment "the training never changes, so the
// story need not either", which is false about a book whose player is adding
// five pounds a week. The frame declines to state a curve on exactly the
// condition buildWorkoutTopology declines to name a peak.
var READABLE_SHAPES = { linear: 1, wave: 1, peak: 1 };

/**
 * buildFusionFrame(booklet) -> { shape, loadReadable, peakWeek, rows }
 *
 * Pure. One row per week; rows [] when there is nothing honest to say. Row
 * fields are machine-readable so a test can assert the curve, not the sentence.
 */
export function buildFusionFrame(booklet) {
  var weeks = (booklet && booklet.weeks) || [];
  var empty = { shape: 'unknown', loadReadable: false, peakWeek: null, rows: [] };
  if (!weeks.length) return empty;

  var topology = buildWorkoutTopology(topologyInput(booklet));
  var loadReadable = !!READABLE_SHAPES[topology.progressionShape];
  var loadByWeek = {};
  (topology.weekLoads || []).forEach(function (row) {
    loadByWeek[String(row.weekNumber)] = row;
  });
  var deloadSet = {};
  (topology.deloadWeeks || []).forEach(function (n) { deloadSet[String(n)] = 1; });

  var fragmentsById = buildFragmentIndex(booklet);
  var claimedFragments = {};

  var rows = weeks.map(function (week, wi) {
    var weekNumber = Number((week && week.weekNumber) || (wi + 1));
    var load = loadByWeek[String(weekNumber)] || {};
    var sessions = (week && week.sessions) || [];

    var words = frameWords(((week || {}).epigraph || {}).text);
    var fragmentIds = [];
    sessions.forEach(function (s) {
      if (!s) return;
      words += frameWords(s.storyPrompt);
      var rb = s.returnBeat || {};
      words += frameWords(rb.closingLine) + frameWords(rb.openingEcho);
      (s.microLines || []).forEach(function (m) { words += frameWords(m && m.cue); });
      var ref = s.fragmentRef ? String(s.fragmentRef).trim().toLowerCase() : '';
      if (!ref || claimedFragments[ref]) return;
      claimedFragments[ref] = 1;
      var fragment = fragmentsById[ref];
      if (!fragment) return;
      fragmentIds.push(fragment.id);
      words += frameWords(frameText(fragment.content) || frameText(fragment.contentHtml));
    });
    words += frameWords(((week || {}).interlude || {}).body);
    words += frameWords(((week || {}).bossEncounter || {}).narrative);
    if (week && week.overflowDocument) words += frameWords(frameText(week.overflowDocument.content));

    return {
      week: weekNumber,
      isBoss: !!(week && (week.isBossWeek || week.bossEncounter)),
      isDeload: !!(week && week.isDeload) || !!deloadSet[String(weekNumber)],
      isPeak: topology.peakWeek != null && Number(topology.peakWeek) === weekNumber,
      load: Number(load.volume) || 0,
      loadIndex: null,
      sessions: sessions.length,
      proseWords: words,
      proseIndex: null,
      title: frameClip((week && week.title) || '', FRAME_TITLE_CAP),
      interlude: frameClip((((week || {}).interlude) || {}).title || '', FRAME_INTERLUDE_CAP),
      fragments: fragmentIds,
      mechanics: weekMechanics(week)
    };
  });

  var maxLoad = Math.max.apply(null, rows.map(function (r) { return r.load; }));
  var maxWords = Math.max.apply(null, rows.map(function (r) { return r.proseWords; }));
  rows.forEach(function (r) {
    r.loadIndex = loadReadable ? frameIndex(r.load, maxLoad) : null;
    r.proseIndex = frameIndex(r.proseWords, maxWords);
  });
  return {
    shape: topology.progressionShape,
    loadReadable: loadReadable,
    peakWeek: topology.peakWeek,
    rows: rows
  };
}

/**
 * formatFusionFrameBlock(frame) -> string
 *
 * One line per week, deliberately — prose here would cost more tokens than the
 * digest it indexes. Returns '' when there is nothing to say, so the caller can
 * drop the section rather than print a table of nulls (the
 * formatWorkoutTopologyBlock idiom).
 */
export function formatFusionFrameBlock(frame) {
  var rows = (frame && frame.rows) || [];
  if (!rows.length) return '';
  var lines = [
    '## The Fusion Frame (measured — the play-order sequence, one line per week)',
    'prose = words printed on this week\'s story surfaces, indexed against its wordiest week',
    '(fragments counted in the week that hands them over). s = sessions.',
    'These are measurements of the artifact, not judgments of it.'
  ];
  if (frame.loadReadable) {
    lines.splice(1, 0, 'load = training volume as an index against this book\'s heaviest week'
      + ' (program shape: ' + frame.shape
      + (frame.peakWeek != null ? ', heaviest week ' + frame.peakWeek : '') + ').');
  } else {
    // Say what cannot be read, rather than printing a number that would be read
    // as a fact. A flat volume proxy is what a weight-progression program looks
    // like from inside the artifact, and the weights are blanks the player fills.
    lines.splice(1, 0, 'load = NOT READABLE from this artifact. The volume proxy (sets x reps) is \''
      + frame.shape + '\' across the book, which is what a program that progresses by WEIGHT'
      + ' looks like — and the weights are write-in blanks nobody has filled yet. Do NOT read'
      + ' this as "the training never changes". Audit the prose curve against the session'
      + ' counts and the weeks marked DELOAD and BOSS instead.');
  }
  rows.forEach(function (r) {
    var tags = [];
    if (r.isPeak) tags.push('PEAK');
    if (r.isDeload) tags.push('DELOAD');
    if (r.isBoss) tags.push('BOSS');
    var cols = [
      'w' + r.week,
      'load ' + (r.loadIndex == null ? '—' : r.loadIndex) + (tags.length ? ' ' + tags.join('+') : ''),
      'prose ' + (r.proseIndex == null ? '?' : r.proseIndex),
      's' + r.sessions,
      '"' + r.title + '"'
        + (r.interlude ? ' +interlude "' + r.interlude + '"' : '')
        + (r.fragments.length ? ' +docs ' + r.fragments.join(',') : ''),
      r.mechanics.length ? r.mechanics.join(', ') : 'no mechanical surfaces'
    ];
    lines.push(cols.join(' | '));
  });
  return lines.join('\n');
}

// ════════════════════════════════════════════════════════════════════════════
// THE SPINE FRAME (W4b) — systemIntegration's evidence, on the D114 pattern
// ════════════════════════════════════════════════════════════════════════════
// `systemIntegration` has always been the dimension most exposed to feel: "do
// the components listen to each other" is answerable by vibe, and a critic
// grading it by vibe rewards a book whose components are individually
// impressive. The fusion frame fixed the same problem for `fusionPacing` by
// handing the critic a MEASUREMENT and letting it grade against numbers; this
// is that move applied to play.
//
// The projection, exactly: the DECLARED spine (composition, edges, forks,
// tension rows) beside what the simulated player found when it walked the
// printed book. Declaration on the left, reality on the right, so a finding
// cites rather than feels.
//
// ABSTENTION IS A FEATURE, not a fallback. A book with no spine gets NO frame
// (the formatter returns '' and the caller drops the section), because the
// alternative — printing a table of nulls — invites the critic to read
// "nothing declared" as "nothing there", which is false about every book
// generated before W4a. The formatWorkoutTopologyBlock idiom, third use.
var SPINE_FRAME_ROLE_CAP = 72;

function spineClip(text, cap) {
  var s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  return s.length > cap ? s.slice(0, cap - 1) + '…' : s;
}

/**
 * buildSpineFrame(booklet) -> { declared, walked, abstain, reason }
 *
 * Pure. Machine-readable so a test can assert the projection rather than the
 * sentence, exactly like buildFusionFrame's rows.
 */
export function buildSpineFrame(booklet) {
  var spine = ((booklet || {}).meta || {}).playSpine;
  var empty = { abstain: true, reason: '', declared: null, walked: null };
  if (!spine || typeof spine !== 'object') {
    empty.reason = 'this book declares no play spine';
    return empty;
  }
  var report = simulateBook(booklet);
  if (report.skipped) {
    empty.reason = report.skipReason;
    return empty;
  }
  return {
    abstain: false,
    reason: '',
    declared: {
      composition: (spine.composition || []).map(function (c) {
        return { entry: String((c || {}).entry || ''), role: spineClip((c || {}).role, SPINE_FRAME_ROLE_CAP) };
      }),
      economyEdges: (spine.economyGraph || []).length,
      consequenceEdges: (spine.consequenceEdges || []).length,
      forks: (spine.decisionLedger || []).map(function (d) {
        return { fork: String((d || {}).fork || ''), differsBy: spineClip((d || {}).differsBy, SPINE_FRAME_ROLE_CAP) };
      }),
      tensionRows: (spine.tensionBudget || []).map(function (t) {
        return {
          week: (t || {}).week,
          scarce: spineClip((t || {}).scarce, 32),
          losable: spineClip((t || {}).losable, 32),
          fallBehind: spineClip((t || {}).fallBehind, 32)
        };
      }),
      honestGaps: (spine.honestGaps || []).length
    },
    walked: {
      bands: report.bands,
      decisions: report.decisions,
      softLocks: report.hard.map(function (f) { return f.code; }),
      findings: report.soft.map(function (f) { return f.code; }),
      measurements: report.measurements
    }
  };
}

/**
 * formatSpineFrameBlock(frame) -> string
 *
 * One line per declaration, each answered by what the walk measured. '' when
 * the frame abstains, so the caller drops the section entirely.
 */
export function formatSpineFrameBlock(frame) {
  if (!frame || frame.abstain) return '';
  var d = frame.declared;
  var w = frame.walked;
  var m = w.measurements || {};
  var lines = [
    '## The Spine Frame (measured — what the book DECLARED beside what a walker FOUND)',
    'The simulated player walked this book with no dice and no DOM, at three adherence bands,',
    'over the guaranteed economy only. These are measurements of the artifact, not judgments of',
    'it — but systemIntegration is graded against them, so cite these rather than impressions.',
    'declared: ' + d.composition.length + ' library entries, ' + d.economyEdges + ' economy edges, '
      + d.consequenceEdges + ' consequence edges, ' + d.forks.length + ' fork(s), '
      + d.tensionRows.length + ' tension row(s)'
      + (d.honestGaps ? ', ' + d.honestGaps + ' honest gap(s)' : ''),
    'walked:   ' + (m.graphNodes || 0) + ' nodes / ' + (m.graphEdges || 0) + ' edges ('
      + (m.branchEdges || 0) + ' door-contingent, ' + (m.chanceEdges || 0) + ' dice-fed and excluded'
      + ' from reachability), ' + (m.materialWindows || 0) + ' of ' + (m.spendWindows || 0)
      + ' spend windows wide enough for stingy and greedy play to differ'
  ];
  d.composition.forEach(function (c) {
    lines.push('  entry ' + c.entry + ' — "' + c.role + '"');
  });
  d.forks.forEach(function (f) {
    lines.push('  fork ' + f.fork + ' — differs by "' + f.differsBy + '"');
  });
  w.bands.forEach(function (b) {
    lines.push('  band ' + b.label + ': ' + b.completedSessions + ' sessions, ' + b.ticksAtEnd + ' ticks'
      + (b.thresholdMet === null ? '' : ', reckoning threshold '
        + (b.thresholdMet ? 'met' : 'NOT met (' + b.ticksAtThreshold + ' banked)')));
  });
  var thin = w.decisions.filter(function (row) { return row.decisions === 0; });
  lines.push('  decisions per week: ' + w.decisions.map(function (r) { return 'w' + r.week + ':' + r.decisions; }).join(' ')
    + (thin.length ? ' — ' + thin.length + ' week(s) ask nothing' : ''));
  // ── The decisions row is decisionWeight's measured half (2026-08-19) ───────
  // The walker counts forks; it cannot judge them, and it has never claimed to.
  // But the COUNT is the one hard fact available on that dimension, and a row
  // of identical per-week counts is the flat-demand signal masteryCurve exists
  // to catch. Naming its readers here is what keeps the new dimensions from
  // being graded on impression alone — the frame is measurement, and a critic
  // told which measurement answers which dimension cites it instead of
  // inventing. It stays a POINTER, never a verdict: the walker cannot see
  // whether a counted fork is dominated, discernible, or reasserted later,
  // which is precisely the gap the two dimensions were added to cover.
  lines.push('  read that row twice: its ZEROES are decisionWeight evidence (a week that asks'
    + ' nothing), and its FLATNESS across the program is masteryCurve evidence (a demand that'
    + ' never rises). A non-zero count is not a pass on either — the walker counts forks and'
    + ' cannot tell a real choice from two flavours of one cost.');
  if (w.softLocks.length) {
    lines.push('  SOFT-LOCKS the walker found: ' + w.softLocks.join(', ')
      + ' — these are structural failures, not taste; systemIntegration cannot score at threshold'
      + ' while one stands.');
  }
  if (w.findings.length) {
    lines.push('  findings: ' + w.findings.join(', '));
  }
  return lines.join('\n');
}

// ── Verdict validation (runJsonStage retry convention: '' = ok) ─────────────
export function validateCriticVerdict(raw) {
  if (!raw || typeof raw !== 'object' || !raw.verdict || typeof raw.verdict !== 'object') {
    return 'critic response missing verdict object';
  }
  var problems = [];
  CRITIC_DIMENSIONS.forEach(function (dim) {
    var entry = raw.verdict[dim.id];
    if (!entry || typeof entry !== 'object') { problems.push('missing dimension ' + dim.id); return; }
    if (typeof entry.score !== 'number' || !isFinite(entry.score)) problems.push(dim.id + '.score is not a number');
    if (!Array.isArray(entry.evidence)) problems.push(dim.id + '.evidence is not an array');
    if (!Array.isArray(entry.failures)) problems.push(dim.id + '.failures is not an array');
  });
  return problems.join('; ');
}

// ── Verdict normalization: clamp + evidence law enforcement ─────────────────
// The prompt states the law; this makes it mechanical. A score at/above the
// threshold is clamped to threshold-1 when it lacks two evidence citations or
// still carries open failures — the critic cannot wave something through.
export function normalizeCriticVerdict(raw, threshold) {
  var t = typeof threshold === 'number' ? threshold : CRITIC_SCORE_THRESHOLD;
  var out = { verdict: {}, summary: String((raw && raw.summary) || '') };
  CRITIC_DIMENSIONS.forEach(function (dim) {
    var entry = (raw && raw.verdict && raw.verdict[dim.id]) || {};
    var score = Math.max(0, Math.min(100, Math.round(Number(entry.score) || 0)));
    var evidence = (Array.isArray(entry.evidence) ? entry.evidence : [])
      .filter(function (e) { return e && (e.path || e.quote); })
      .map(function (e) { return { path: String(e.path || ''), quote: String(e.quote || '') }; });
    var failures = (Array.isArray(entry.failures) ? entry.failures : [])
      .filter(function (f) {
        return f && typeof f.directive === 'string' && f.directive.trim()
          && VALID_UNIT_TYPES[f.unitType]
          && (f.unitType === 'rulesSpread' || f.unitRef !== undefined && f.unitRef !== null && f.unitRef !== '');
      })
      .map(function (f) {
        // ── Structural scope (Teeth T4) ────────────────────────────────────
        // The critic declares whether rewording can fix the finding, and if not,
        // WHICH aspects of the unit's shape the reviser may re-decide. Both are
        // closed vocabularies, so the routing is a lookup and never a reading of
        // the directive's wording.
        //
        // FAIL-SAFE DEMOTION: "structure" with no valid reopen scope is a mood,
        // not an instruction — it would hand the reviser a licence with no
        // object, which is how a targeted revision becomes a rewrite. Such a
        // failure still runs; it runs as a prose revision.
        var reopen = (Array.isArray(f.reopen) ? f.reopen : [])
          .map(function (r) { return String(r || '').trim(); })
          .filter(function (r) { return VALID_REOPEN_SCOPES[r]; })
          .filter(function (r, i, arr) { return arr.indexOf(r) === i; });
        var structural = String(f.scope || '') === 'structure' && reopen.length > 0;
        return {
          dimension: dim.id,
          unitType: f.unitType,
          unitRef: f.unitType === 'rulesSpread' ? 'rulesSpread' : f.unitRef,
          issue: String(f.issue || ''),
          directive: String(f.directive).trim(),
          scope: structural ? 'structure' : 'prose',
          reopen: structural ? reopen : []
        };
      });
    var clamped = false;
    if (score >= t && evidence.length < 2) { score = t - 1; clamped = true; }
    if (score >= t && failures.length > 0) { score = t - 1; clamped = true; }
    out.verdict[dim.id] = { score: score, evidence: evidence, failures: failures, clamped: clamped };
  });
  return out;
}

export function summarizeVerdict(normalized) {
  var scores = {};
  var min = 100;
  var sum = 0;
  CRITIC_DIMENSIONS.forEach(function (dim) {
    var s = normalized.verdict[dim.id] ? normalized.verdict[dim.id].score : 0;
    scores[dim.id] = s;
    if (s < min) min = s;
    sum += s;
  });
  return {
    byDimension: scores,
    min: min,
    avg: Math.round(sum / CRITIC_DIMENSIONS.length)
  };
}

// ── Revision targeting ───────────────────────────────────────────────────────
// Group the failing dimensions' failures by unit; prioritize units implicated
// by the lowest-scoring dimensions, then by directive count; cap per round.
export function selectRevisionTargets(normalized, threshold, maxUnits) {
  var t = typeof threshold === 'number' ? threshold : CRITIC_SCORE_THRESHOLD;
  var cap = typeof maxUnits === 'number' ? maxUnits : CRITIC_MAX_REVISIONS_PER_ROUND;
  var failing = CRITIC_DIMENSIONS
    .map(function (dim) { return { id: dim.id, entry: normalized.verdict[dim.id] }; })
    .filter(function (d) { return d.entry && d.entry.score < t; })
    .sort(function (a, b) { return a.entry.score - b.entry.score; });

  var groups = {};
  var order = [];
  failing.forEach(function (dim) {
    dim.entry.failures.forEach(function (f) {
      var key = f.unitType + ':' + String(f.unitRef);
      if (!groups[key]) {
        groups[key] = {
          unitType: f.unitType,
          unitRef: f.unitRef,
          directives: [],
          dimensions: [],
          reopen: [],
          structural: false,
          worstScore: dim.entry.score
        };
        order.push(key);
      }
      if (groups[key].directives.indexOf(f.directive) === -1) groups[key].directives.push(f.directive);
      if (groups[key].dimensions.indexOf(f.dimension) === -1) groups[key].dimensions.push(f.dimension);
      // A unit reached by one structural finding is opened structurally, and the
      // reopened scopes are the UNION across its findings — the unit is revised
      // once, so the single revision has to carry every licence its findings
      // need. The revision stays unit-scoped either way: the law the loop
      // enforces is one unit per call, not one finding per call.
      (f.reopen || []).forEach(function (r) {
        if (groups[key].reopen.indexOf(r) === -1) groups[key].reopen.push(r);
      });
      if (f.scope === 'structure' && (f.reopen || []).length) groups[key].structural = true;
    });
  });
  return order
    .map(function (key) { return groups[key]; })
    .map(function (group) {
      // Canonical enum order, so the revise prompt for a given verdict is
      // byte-stable regardless of which dimension named a scope first.
      group.reopen = STRUCTURAL_REOPEN_SCOPES
        .map(function (s) { return s.id; })
        .filter(function (id) { return group.reopen.indexOf(id) !== -1; });
      return group;
    })
    .sort(function (a, b) {
      return a.worstScore - b.worstScore || b.directives.length - a.directives.length;
    })
    .slice(0, cap);
}

// ── Unit access on the assembled booklet ─────────────────────────────────────
export function getUnit(booklet, unitType, unitRef) {
  if (!booklet) return null;
  if (unitType === 'rulesSpread') return booklet.rulesSpread || null;
  if (unitType === 'week') {
    var weeks = booklet.weeks || [];
    return weeks.find(function (w) { return w && Number(w.weekNumber) === Number(unitRef); })
      || weeks[Number(unitRef) - 1] || null;
  }
  if (unitType === 'fragment') {
    return (booklet.fragments || []).find(function (f) { return f && f.id === unitRef; }) || null;
  }
  if (unitType === 'ending') {
    var endings = booklet.endings || [];
    return endings.find(function (e) { return e && (e.variant === unitRef || e.id === unitRef); }) || null;
  }
  return null;
}

// Replace a unit in place. Returns the previous value so a failed validity
// check can revert, or null when the unit could not be located.
export function setUnit(booklet, unitType, unitRef, revised) {
  if (!booklet || !revised || typeof revised !== 'object') return null;
  if (unitType === 'rulesSpread') {
    var prevRules = booklet.rulesSpread;
    booklet.rulesSpread = revised;
    return { previous: prevRules };
  }
  var list = unitType === 'week' ? booklet.weeks
    : unitType === 'fragment' ? booklet.fragments
      : unitType === 'ending' ? booklet.endings : null;
  if (!Array.isArray(list)) return null;
  var idx = -1;
  if (unitType === 'week') {
    idx = list.findIndex(function (w) { return w && Number(w.weekNumber) === Number(unitRef); });
    if (idx === -1 && list[Number(unitRef) - 1]) idx = Number(unitRef) - 1;
  } else if (unitType === 'fragment') {
    idx = list.findIndex(function (f) { return f && f.id === unitRef; });
  } else {
    idx = list.findIndex(function (e) { return e && (e.variant === unitRef || e.id === unitRef); });
  }
  if (idx === -1) return null;
  var previous = list[idx];
  list[idx] = revised;
  return { previous: previous, index: idx };
}

// ── The identity floor ───────────────────────────────────────────────────────
// What a revision may NEVER change, checked before acceptance. This is the
// bound that makes structural reach safe: the surgeon may reopen a week's beat,
// its dynamics, its motif and its mechanical assignment, and still cannot touch
// the two things the booklet is FOR — the training the player performs, and the
// decode spine the ending is already sealed against.
//
// It was one line (weekNumber) while revisions could only reword, and the rest
// was covered incidentally by the validity floor's error-count comparison. With
// shape reopened, "incidentally" is not a floor. Every check below is stated in
// the revision prompt's preservation laws; this is where it is enforced.
function prescriptionSignature(session) {
  return (((session || {}).exercises) || []).map(function (ex) {
    return [String((ex && ex.name) || ''), String((ex && ex.sets) || ''),
      String((ex && ex.repsPerSet) || '')].join('|');
  }).join(' ;; ');
}

function weekIdentityPreserved(original, revised) {
  if (Number(original.weekNumber) !== Number(revised.weekNumber)) return false;

  // THE DECODE SPINE. This week's component value is one character of a password
  // the ending was already encrypted with, weeks before the critic ran. Change
  // it and the printed cipher stops opening the sealed page — a failure the
  // reader meets at the end of six weeks of work.
  var originalComponent = original.weeklyComponent;
  if (originalComponent && originalComponent.value !== undefined && originalComponent.value !== null) {
    var revisedComponent = revised.weeklyComponent || {};
    if (String(revisedComponent.value) !== String(originalComponent.value)) return false;
  }
  var originalBoss = original.bossEncounter;
  if (originalBoss) {
    var revisedBoss = revised.bossEncounter || {};
    var originalKey = originalBoss.decodingKey || {};
    var revisedKey = revisedBoss.decodingKey || {};
    if (JSON.stringify(originalKey.referenceTable || '') !== JSON.stringify(revisedKey.referenceTable || '')) return false;
    if (JSON.stringify(originalBoss.componentInputs || []) !== JSON.stringify(revisedBoss.componentInputs || [])) return false;
  }

  // THE WORKOUT. The program is the user's own training block; the story is
  // what it means, never what it is. Session count, session numbering, and every
  // prescription survive verbatim.
  var originalSessions = original.sessions;
  if (Array.isArray(originalSessions)) {
    var revisedSessions = revised.sessions;
    if (!Array.isArray(revisedSessions) || revisedSessions.length !== originalSessions.length) return false;
    for (var i = 0; i < originalSessions.length; i++) {
      var a = originalSessions[i] || {};
      var b = revisedSessions[i] || {};
      if (a.sessionNumber !== undefined && String(a.sessionNumber) !== String(b.sessionNumber)) return false;
      if (prescriptionSignature(a) !== prescriptionSignature(b)) return false;
    }
  }
  return true;
}

export function revisionPreservesIdentity(unitType, original, revised) {
  if (!original || !revised) return false;
  if (unitType === 'week') return weekIdentityPreserved(original, revised);
  if (unitType === 'fragment') return original.id === revised.id;
  if (unitType === 'ending') {
    return (original.variant === undefined || original.variant === revised.variant)
      && (original.id === undefined || original.id === revised.id);
  }
  return true; // rulesSpread has no identity key
}

// ── The key-invention floor (W3 corrective wave, F06) ───────────────────────
// A1's post-hoc critic re-run made the booklet LESS valid: 17 real errors
// before, 19 after, two new and zero resolved. Both new ones were invented
// fields — `decision` on a session, `paperAction` on a cipher — and the validity
// floor that promises "a revision may never make the booklet less valid" waved
// them through, because it compares counts from validateAssembledBooklet, which
// had no unknown-key check of any kind. The floor was not broken and not
// mis-wired; its promise was simply true against the weaker of the two
// validators in the repo, and unknown-key invention is exactly what a free-form
// revision stage produces.
//
// A KEY-DIFF, FILTERED BY THE SCHEMA, and both halves are load-bearing.
//   - The schema half is what makes it precise: the reviser may add
//     `fieldOps.oracleTable` to a week that lacked one, because a structural
//     revision with the mechanical assignment reopened is LICENSED to do that
//     and the unit floor above actively rewards it. A blanket "no key the
//     original lacked" would revert the repair the critic just asked for.
//   - The diff half is what keeps it a delta, like every other floor here: a
//     unit that already carried an illegal key does not get to veto every
//     revision of itself. Only what THIS revision introduced is charged to it.
//
// Indices are collapsed (`sessions[1].decision` -> `sessions[].decision`)
// because reordering or appending an array element is not the defect; inventing
// a field is.
function collapseIndices(path) {
  return String(path).replace(/\[\d+\]/g, '[]');
}

export function revisionInventsKeys(unitType, original, revised) {
  var before = {};
  unknownKeyPathsForUnit(unitType, original).forEach(function (p) {
    before[collapseIndices(p)] = true;
  });
  var invented = [];
  unknownKeyPathsForUnit(unitType, revised).forEach(function (p) {
    var key = collapseIndices(p);
    if (!before[key] && invented.indexOf(key) === -1) invented.push(key);
  });
  return invented;
}

// ── The validity floor, at the unit's own stage gate ─────────────────────────
// A revision re-enters the pipeline through the same door the unit came out of:
// its stage validator, with generationFloors ON (D111). Structural reach is
// what makes this necessary — a reviser licensed to re-decide a week's
// mechanical assignment can delete the oracle it decided against, and the
// assembled-booklet validator does not demand one (fixtures and hand-authored
// booklets legitimately have none; the FLOOR is generation policy).
//
// Compared as a DELTA by the caller, never as an absolute: a book generated
// before the floors, or hand-loaded, may already be failing them, and a
// pre-existing failure must not veto an improvement the critic asked for.
//
// ── THE OPTIONS ARE THE GATE'S REACH (author ruling, 2026-08-19) ─────────────
// This function used to pass a deliberately minimal options object, and that
// minimality WAS the defect it looked like a safety margin: six floors that run
// when the unit is first generated — cadence conformance, the currency-verbatim
// demand, citation pinpoints, clock reachability, brief transcription and the
// spine's per-week closure floors — were silent here, so a revision could delete
// the surface an accepted week printed and pass a gate named "the same door the
// unit came out of". That is the D144 ungated-caller idiom seen from the inside:
// nothing was wrong, nothing was armed. The author ruled all six armed.
//
// DERIVED FROM THE BOOKLET, not handed in, for the same reason the demands are
// harvested rather than restated: a caller assembling this bag is exactly how it
// went narrow the first time. The assembled booklet already carries every piece
// of evidence these floors read — the spine, the rulebook, the declared currency
// and the shell family all live under `meta` by the time the critic runs. The
// BRIEF is the one fact no booklet carries (it is input, never content — see
// briefTranscriptionFloorErrors), so it is the one parameter, and an absent
// brief leaves that floor correctly silent rather than inventing its evidence.
//
// `spineStageLabel` is deliberately NOT passed. Its only job is routing a spine
// defect back to the stage that authored it, and this seat is not a repair seat
// — it discards the revision and keeps the original. collectSpineWeekFloorErrors
// documents the unprefixed message as the honest answer for a caller with no
// stage to name, and before/after read the same options, so the delta compares
// like for like.
export function unitFloorErrors(unitType, unit, booklet, brief) {
  if (!unit || typeof unit !== 'object') return [];
  var meta = ((booklet || {}).meta) || {};
  var briefText = brief == null ? '' : brief;
  if (unitType === 'week') {
    var intent = meta.artifactIntent || {};
    var result = validateWeekSchema(unit, !!(unit.isBossWeek || unit.bossEncounter), {
      generationFloors: true,
      weekNumber: unit.weekNumber,
      currentWeekNumber: unit.weekNumber,
      isDeload: !!unit.isDeload,
      mechanicGrammarFamily: intent.mechanicGrammarFamily || '',
      // The spine arms three of the six at once: the per-week closure floors
      // (mute clock, door ledger row, differsBy), cadence conformance, and the
      // BLOCKING arm of clock reachability. No spine on the booklet, no check.
      playSpine: meta.playSpine || null,                              // arms cadence + spine closure + clock reachability
      // The rulebook arms clock reachability's report-class prose arm only.
      gameRulebook: meta.gameRulebook || null,                        // arms clock reachability's prose arm
      currencyLabel: (meta.economy || {}).currencyLabel || '',        // arms the currency-verbatim demand
      shellFamily: (meta.artifactIdentity || {}).shellFamily || '',   // arms citation pinpoints
      brief: briefText
    });
    return (result && result.errors) || [];
  }
  if (unitType === 'fragment') {
    // The fragments gate answers in the verdict shape (D157/D168), so the floor
    // list is read off `.errors` rather than wrapped from a single string. A
    // budget failure now arrives as one error per breach, which is what the
    // revision loop wants anyway: it quotes each defect to the reviser.
    //
    // Of the six, only brief transcription has a fragment arm — the other five
    // read week surfaces. `componentInputs` (the answer-bearing seal floor) is
    // armed at the fragment stage gate and NOT here; that is a seventh silent
    // floor, outside the six the author ruled on, and it is filed rather than
    // armed on this wave.
    var verdict = validateFragmentsStage({ fragments: [unit] }, [], {
      generationFloors: true,
      brief: briefText
    });
    return (verdict && verdict.errors) || [];
  }
  if (unitType === 'ending') {
    // Endings have no per-unit stage validator (their stage gate is continuity,
    // which needs the whole book). The floor that IS unit-scoped is the prose
    // budget — the one Book 1 blew by roughly three times.
    return collectBudgetBreaches({ endings: [unit] }).map(function (b) {
      return 'Over budget: ' + b.message;
    });
  }
  return [];
}

// ── THE REVISION SEAT'S TAUGHT HALF (the two-halves law, D186/D187) ──────────
// `unitFloorErrors` above is the gate a revision re-enters. Nothing ever told
// the reviser what that gate checks: `buildUnitRevisionPrompt` printed the
// unit, the critic's directives and the world context, and not one floor
// demand. The reopen licences made it worse rather than better — `dynamics`
// invites a marking change without the marking menu, `economy` invites a
// reckoning rewrite without the sink demands, `mechanism` invites a door re-key
// without the door demand. Every unit seat in the pipeline got its budgets and
// its givens in D150/D183/D186; this one seat was missed, and it is the seat
// that rewrites whole budgeted units.
//
// MEASURED, on proving run 3 (evals/proving-run/console-run3.log): nine week
// revisions paid for, nine rejected, every one "dropped generation floors
// (0 → N)". The delivered book was written flush against its caps — the longest
// `storyPrompt` used 219 of its 220 characters, the longest `doorOptionLean` 89
// of 90 — so a critic directive asking for a sharper line breached a budget the
// reviser was never shown. Twenty-one characters is the entire distance between
// an accepted revision and a discarded one, and the loop could not accept one.
//
// DERIVED FROM THE GATE ITSELF, never restated. The demands are harvested by
// asking `unitFloorErrors` — the SAME function the revision is judged by — what
// an identity-only unit of this shape owes. The teaching is therefore the
// floor's own sentences: there is ONE string, the floor writes it, and a floor
// reworded tomorrow teaches its new wording today. This is why no demand is
// spelled out here and no cap is copied — a second copy is the D93 defect, and
// a prompt teaching a different set than the floor demands is worse than
// silence (D143).
//
// SHAPE-AWARE, because the probe carries the shape selectors the gate branches
// on: a boss week is asked about `bossEncounter` and never about the door or
// the weeklyComponent a boss week does not owe.
//
// WHAT THIS DOES NOT DO, restated after the 2026-08-19 arming. The six floors
// named in the old form of this note are no longer silent at the gate — see
// `unitFloorErrors` above — and the teaching extends to them BY CONSTRUCTION,
// because it is the gate's own output for a probe of this shape. But the probe
// is IDENTITY-ONLY, and that bounds what can be harvested from any floor:
//
//   · A PRESENCE-CLASS demand is taught, because an empty unit is missing the
//     surface and the floor says so. The spine's closure floors are the new
//     case worth naming: an empty week prints no door and no clock, so they
//     raise nothing on the probe and teach nothing — a reviser that ADDS a
//     clock the spine does not read is refused by a demand it was never shown.
//   · A TEXT-CLASS demand (the currency phrase is wrong, a citeRef carries no
//     pinpoint, six words are copied from the brief) fires only on a field that
//     EXISTS and is wrong, so an empty probe cannot draw it out either.
//
// That bound is a property of harvesting rather than a defect in it, and it is
// not new: `stakesLine` present-but-out-of-band has always been untaught for the
// same reason. It is stated here so the next reader does not mistake a short
// demand list for a narrow gate. Fixing it means a probe that carries deliberate
// violations, which is a second authored copy of the floors — the exact thing
// this derivation exists to avoid.
export function unitFloorDemands(unitType, unit, booklet, brief) {
  if (!unit || typeof unit !== 'object') return [];
  var probe;
  if (unitType === 'week') {
    probe = {
      weekNumber: unit.weekNumber,
      isBossWeek: !!(unit.isBossWeek || unit.bossEncounter),
      isDeload: !!unit.isDeload
    };
  } else if (unitType === 'fragment') {
    probe = { id: unit.id, documentType: unit.documentType };
  } else if (unitType === 'ending') {
    probe = { id: unit.id, variant: unit.variant };
  } else {
    return [];
  }
  return unitFloorErrors(unitType, probe, booklet, brief);
}

export function unitLabel(unitType, unitRef) {
  if (unitType === 'week') return 'Week ' + unitRef;
  if (unitType === 'fragment') return 'Fragment ' + unitRef;
  if (unitType === 'ending') return 'Ending "' + unitRef + '"';
  return 'Rules Spread';
}
