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
  CRITIC_MAX_REVISIONS_PER_ROUND
} from './constants.js';

var VALID_UNIT_TYPES = { week: 1, fragment: 1, ending: 1, rulesSpread: 1 };

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
        return {
          dimension: dim.id,
          unitType: f.unitType,
          unitRef: f.unitType === 'rulesSpread' ? 'rulesSpread' : f.unitRef,
          issue: String(f.issue || ''),
          directive: String(f.directive).trim()
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
          worstScore: dim.entry.score
        };
        order.push(key);
      }
      if (groups[key].directives.indexOf(f.directive) === -1) groups[key].directives.push(f.directive);
      if (groups[key].dimensions.indexOf(f.dimension) === -1) groups[key].dimensions.push(f.dimension);
    });
  });
  return order
    .map(function (key) { return groups[key]; })
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

// Identity fields a revision must never change; checked before acceptance.
export function revisionPreservesIdentity(unitType, original, revised) {
  if (!original || !revised) return false;
  if (unitType === 'week') return Number(original.weekNumber) === Number(revised.weekNumber);
  if (unitType === 'fragment') return original.id === revised.id;
  if (unitType === 'ending') {
    return (original.variant === undefined || original.variant === revised.variant)
      && (original.id === undefined || original.id === revised.id);
  }
  return true; // rulesSpread has no identity key
}

export function unitLabel(unitType, unitRef) {
  if (unitType === 'week') return 'Week ' + unitRef;
  if (unitType === 'fragment') return 'Fragment ' + unitRef;
  if (unitType === 'ending') return 'Ending "' + unitRef + '"';
  return 'Rules Spread';
}
