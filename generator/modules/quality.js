// quality.js — Quality gate and reporting functions
// Deterministic post-generation analysis: scores, warnings, weak-spot flags.
// Does NOT modify the booklet. Stored on window.LiftRPGAPI.lastQualityReport after each call.

import { VALID_MAP_TYPES, VALID_COMPANION_TYPES } from './constants.js';
import { normalizeId, normalizeThemeArchetype, decodeA1Z26, isStandardAlphaTable } from './assembly.js';
import { validateAssembledBooklet } from './validation.js';

function looksLikeFragmentRef(ref) {
  return /^f\d+$/i.test(normalizeId(ref || ''));
}

export function extractWeekCompanionTypes(week) {
  return ((((week || {}).fieldOps || {}).companionComponents) || [])
    .map(function (component) { return String((component || {}).type || '').trim(); })
    .filter(Boolean)
    .sort();
}

function buildMapEvolutionFingerprint(mapState) {
  var ms = mapState || {};
  var mapType = String(ms.mapType || 'grid').trim().toLowerCase();

  if (mapType === 'point-to-point' || mapType === 'node-graph') {
    var nodes = (ms.nodes || []).map(function (node) {
      return [node.id || '', node.label || '', node.state || '', node.x || '', node.y || ''].join(':');
    }).sort().join('|');
    var edges = (ms.edges || []).map(function (edge) {
      return [edge.from || '', edge.to || '', edge.label || ''].join(':');
    }).sort().join('|');
    return 'network::' + nodes + '::' + edges + '::' + String(ms.currentNode || '');
  }

  if (mapType === 'linear-track') {
    var stops = (ms.stops || ms.nodes || []).map(function (stop) {
      return [stop.id || '', stop.label || '', stop.state || '', stop.position || ''].join(':');
    }).sort().join('|');
    return 'track::' + stops + '::' + String(ms.currentPosition || ms.currentNode || '');
  }

  if (mapType === 'player-drawn') {
    return 'player::' + String(ms.mapNote || '') + '::' + String(ms.currentPosition || '');
  }

  var tiles = (ms.tiles || []).map(function (tile) {
    return [tile.label || '', tile.type || '', tile.x || '', tile.y || ''].join(':');
  }).sort().join('|');
  return 'grid::' + tiles + '::' + String(ms.currentPosition || '');
}

function findBossPasswordSpoiler(boss) {
  if (!boss || typeof boss !== 'object') return '';
  var texts = [
    boss.narrative,
    boss.mechanismDescription,
    boss.convergenceProof,
    boss.passwordRevealInstruction
  ].filter(Boolean).map(function (value) { return String(value); });

  for (var i = 0; i < texts.length; i++) {
    var text = texts[i];
    var explicit = text.match(/enter this password,\s*['"]?([A-Z0-9-]{3,16})['"]?/i);
    if (explicit && explicit[1]) return explicit[1].toUpperCase();
  }

  if (boss.passwordRevealInstruction) {
    var quoted = String(boss.passwordRevealInstruction).match(/['"]([A-Z0-9-]{3,16})['"]/);
    if (quoted && quoted[1]) return quoted[1].toUpperCase();
  }
  return '';
}

export function collectIdentityVariationFindings(booklet, nonBossWeeks, fragments, report) {
  var findings = 0;
  var meta = (booklet || {}).meta || {};
  var artifactIdentity = meta.artifactIdentity || {};

  var docTypeCounts = {};
  fragments.forEach(function (fragment) {
    var type = String((fragment || {}).documentType || '').trim().toLowerCase();
    if (!type) return;
    docTypeCounts[type] = (docTypeCounts[type] || 0) + 1;
  });
  var dominantDocType = '';
  var dominantDocCount = 0;
  Object.keys(docTypeCounts).forEach(function (type) {
    if (docTypeCounts[type] > dominantDocCount) {
      dominantDocType = type;
      dominantDocCount = docTypeCounts[type];
    }
  });
  if (dominantDocType && fragments.length >= 6 && dominantDocCount / fragments.length >= 0.5) {
    report.weakSpots.push({
      area: 'artifact-monoculture',
      detail: '"' + dominantDocType + '" accounts for ' + dominantDocCount + ' of ' + fragments.length + ' fragments',
      severity: 'high'
    });
    findings++;
  }

  var mapTypes = {};
  nonBossWeeks.forEach(function (week) {
    var mapType = String((((week || {}).fieldOps || {}).mapState || {}).mapType || 'grid');
    mapTypes[mapType] = true;
  });
  if (nonBossWeeks.length >= 4 && Object.keys(mapTypes).length < 2) {
    // Check whether the declared planning contract expects a stable map grammar.
    // If so, repeated map type is correct, not a failure.
    var intent = meta.artifactIntent || {};
    var declaredGrammar = String(intent.mechanicGrammarFamily || '').toLowerCase();
    var declaredBoard = String(artifactIdentity.boardStateMode || '').toLowerCase();
    var soleMapType = Object.keys(mapTypes)[0];

    // Grammars/board-state modes that inherently use a single map type
    var STABLE_MAP_GRAMMARS = {
      'survey-grid': 'grid',
      'ledger-board': 'grid',
      'timeline-reconstruction': 'linear-track',
      'route-tracker': 'linear-track',
      'node-graph': 'point-to-point'
    };

    var expectedByGrammar = STABLE_MAP_GRAMMARS[declaredGrammar];
    var expectedByBoard = STABLE_MAP_GRAMMARS[declaredBoard];
    var suppressed = (expectedByGrammar && expectedByGrammar === soleMapType) ||
                     (expectedByBoard && expectedByBoard === soleMapType);

    if (!suppressed) {
      report.weakSpots.push({
        area: 'board-monotony',
        detail: 'All non-boss weeks use the same mapState.mapType "' + soleMapType + '"',
        severity: 'high'
      });
      findings++;
    }
  }

  var companionSignatures = {};
  nonBossWeeks.forEach(function (week) {
    var signature = extractWeekCompanionTypes(week).join('|') || 'none';
    companionSignatures[signature] = true;
  });
  if (nonBossWeeks.length >= 4 && Object.keys(companionSignatures).length < 2) {
    report.weakSpots.push({
      area: 'companion-sameness',
      detail: 'Companion component loadout repeats across every non-boss week',
      severity: 'medium'
    });
    findings++;
  }

  // Core identity fields the skeleton always provides — missing these is a real undercommitment.
  // Optional creative fields (openingMode, rulesDeliveryMode, unlockLogic) are not required.
  if (!artifactIdentity.artifactClass && !artifactIdentity.shellFamily) {
    report.weakSpots.push({
      area: 'identity-undercommitment',
      detail: 'artifactIdentity is missing core identity fields (artifactClass, shellFamily)',
      severity: 'high'
    });
    findings++;
  } else if (!artifactIdentity.artifactClass || !artifactIdentity.shellFamily) {
    report.weakSpots.push({
      area: 'identity-undercommitment',
      detail: 'artifactIdentity has partial core identity (' +
        (artifactIdentity.artifactClass ? 'artifactClass present' : 'artifactClass missing') + ', ' +
        (artifactIdentity.shellFamily ? 'shellFamily present' : 'shellFamily missing') + ')',
      severity: 'medium'
    });
    findings++;
  }

  return findings;
}

export var QUALITY_BLOCKING_AREAS = {
  'artifact-monoculture': { target: 'fragments' },
  'board-monotony': { target: 'weeks' },
  'companion-sameness': { target: 'weeks' },
  'identity-undercommitment': { target: 'shell' },
  'boss-password-spoiler': { target: 'endings', alwaysBlock: true },
  'map-stagnation': { target: 'weeks' },
  'cipher-repetition': { target: 'weeks' },
  'oracle-vagueness': { target: 'weeks' },
  'identity-drift-risk': { target: 'shell', alwaysBlock: true },
  'thin-ending': { target: 'endings' },
  'unsupported-reveal': { target: 'endings' },
  'intent-forbidden-content': { target: 'shell', alwaysBlock: true },
  'intent-excluded-content': { target: 'shell' },
  'intent-ecology-drift': { target: 'fragments' },
  'intent-mechanic-drift': { target: 'weeks' }
};

export function formatQualityGateMessage(target, detail) {
  var prefix = target ? target.charAt(0).toUpperCase() + target.slice(1) : 'Booklet';
  return prefix + ': ' + detail;
}

export function buildQualityGate(report) {
  report = report || {};
  var blockers = [];
  var seen = {};

  function pushBlocker(target, detail) {
    var message = formatQualityGateMessage(target, detail);
    if (seen[message]) return;
    seen[message] = true;
    blockers.push({ target: target || '', message: message });
  }

  (report.schemaErrors || []).forEach(function (error) {
    pushBlocker('', 'schema validation failed: ' + error);
  });

  (report.weakSpots || []).forEach(function (spot) {
    var policy = QUALITY_BLOCKING_AREAS[spot.area];
    if (!policy) return;
    if (policy.alwaysBlock || spot.severity === 'high') {
      pushBlocker(policy.target, spot.detail);
    }
  });

  var identityVariationScore = (((report.scores || {}).identityVariation) || {}).score;
  if (typeof identityVariationScore === 'number' && identityVariationScore < 0.8) {
    pushBlocker('shell', 'identity variation score is ' + identityVariationScore + ' — the booklet is still converging toward the default grammar');
  }

  var aggregateScore = (((report.scores || {}).aggregate) || {}).score;
  if (typeof aggregateScore === 'number' && aggregateScore < 0.72) {
    pushBlocker('shell', 'aggregate quality score is ' + aggregateScore + ' — the booklet needs another pass before export');
  }

  return {
    passed: blockers.length === 0,
    blockers: blockers
  };
}

export function generateQualityReport(booklet) {
  var report = {
    timestamp: new Date().toISOString(),
    schemaErrors: [],
    scores: {},
    warnings: [],
    weakSpots: []
  };

  if (!booklet || typeof booklet !== 'object') {
    report.schemaErrors.push('Booklet is not a valid object');
    return report;
  }

  // ── Schema completeness (delegate to existing validator) ───────────────
  var validationResult = validateAssembledBooklet(booklet);
  report.schemaErrors = validationResult.errors;
  // Surface validator warnings (soft issues) alongside hard errors
  var validatorWarnings = validationResult.warnings || [];
  if (validatorWarnings.length > 0) {
    report.warnings = report.warnings.concat(validatorWarnings);
  }
  report.scores.schemaCompleteness = report.schemaErrors.length === 0
    ? { score: 1, label: validatorWarnings.length > 0 ? validatorWarnings.length + ' warnings' : 'clean' }
    : { score: Math.max(0, 1 - report.schemaErrors.length * 0.1), label: report.schemaErrors.length + ' errors' };

  var meta = booklet.meta || {};
  var weeks = booklet.weeks || [];
  var fragments = booklet.fragments || [];
  var endings = booklet.endings || [];
  var nonBossWeeks = weeks.filter(function (w) { return !w.isBossWeek; });
  var bossWeek = weeks.filter(function (w) { return w.isBossWeek; })[0];

  // ── Helper: collect all fragment IDs (soft-matching via normalizeId) ────
  var fragmentIdSet = {};     // exact ID → fragment
  var fragmentIdSetNorm = {}; // normalizeId(ID) → fragment
  var overflowIdSetNorm = {}; // normalizeId(ID) → overflow document
  fragments.forEach(function (f) {
    if (f.id) {
      fragmentIdSet[f.id] = f;
      fragmentIdSetNorm[normalizeId(f.id)] = f;
    }
  });
  weeks.forEach(function (week) {
    var od = week && week.overflowDocument;
    if (od && od.id) overflowIdSetNorm[normalizeId(od.id)] = od;
  });

  function fragmentExistsQR(ref) {
    return fragmentIdSet[ref] || fragmentIdSetNorm[normalizeId(ref)] || overflowIdSetNorm[normalizeId(ref)];
  }

  // ── Continuity coherence ───────────────────────────────────────────────
  var continuityIssues = [];

  // Check fragmentRefs in sessions resolve (soft-matching via normalizeId)
  var referencedFragmentIdsNorm = {}; // normalizeId(ref) → true
  weeks.forEach(function (week, wi) {
    (week.sessions || []).forEach(function (s) {
      if (s.fragmentRef) {
        referencedFragmentIdsNorm[normalizeId(s.fragmentRef)] = true;
        if (!fragmentExistsQR(s.fragmentRef)) {
          continuityIssues.push('Week ' + (wi + 1) + ' fragmentRef "' + s.fragmentRef + '" unresolved');
        }
      }
    });
    // Oracle fragment refs
    var oracle = (week.fieldOps || {}).oracleTable || (week.fieldOps || {}).oracle || {};
    (oracle.entries || []).forEach(function (e) {
      if (e.fragmentRef) {
        referencedFragmentIdsNorm[normalizeId(e.fragmentRef)] = true;
        if (!fragmentExistsQR(e.fragmentRef)) {
          continuityIssues.push('Week ' + (wi + 1) + ' oracle fragmentRef "' + e.fragmentRef + '" unresolved');
        }
      }
    });
    var cipherTargets = ((((week.fieldOps || {}).cipher || {}).body || {}).referenceTargets || []);
    cipherTargets.forEach(function (target, targetIndex) {
      if (!looksLikeFragmentRef(target)) return;
      referencedFragmentIdsNorm[normalizeId(target)] = true;
      if (!fragmentExistsQR(target)) {
        continuityIssues.push('Week ' + (wi + 1) + ' cipher.referenceTargets[' + targetIndex + '] "' + target + '" unresolved');
      }
    });
  });

  // Unreferenced fragments (never pointed to by any session, oracle, or
  // fragment-like cipher reference target, soft-matched)
  var unreferencedFragments = fragments.filter(function (f) {
    return f.id && !referencedFragmentIdsNorm[normalizeId(f.id)];
  });
  if (unreferencedFragments.length > 0) {
    continuityIssues.push(unreferencedFragments.length + ' fragment(s) never referenced: ' +
      unreferencedFragments.map(function (f) { return f.id; }).join(', '));
  }

  report.scores.continuityCoherence = continuityIssues.length === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - continuityIssues.length * 0.15), label: continuityIssues.length + ' issues' };
  if (continuityIssues.length) report.warnings = report.warnings.concat(continuityIssues);

  // ── Boss convergence integrity ─────────────────────────────────────────
  // Count boss-related validator errors for scoring (they already live in
  // schemaErrors — do NOT re-add them to warnings to avoid duplication).
  // Add quality-only checks that the validator doesn't cover.
  var bossIssues = [];
  var bossQualityWarnings = []; // quality-only (not in schemaErrors)
  if (!bossWeek) {
    // Already an error in schemaErrors; just count for scoring
    bossIssues.push('No boss week found');
  } else if (!bossWeek.bossEncounter) {
    bossIssues.push('Boss week has no bossEncounter object');
  } else {
    var bossObj = bossWeek.bossEncounter;
    if (!bossObj.decodingKey) {
      bossQualityWarnings.push('Boss missing decodingKey — no reveal mechanic');
    }
    var leakedPassword = findBossPasswordSpoiler(bossObj);
    if (leakedPassword) {
      report.weakSpots.push({
        area: 'boss-password-spoiler',
        detail: 'Boss convergence text explicitly reveals the final password "' + leakedPassword + '"',
        severity: 'high'
      });
    }
    // Count boss-related hard errors from validator for scoring only
    var bossErrorCount = report.schemaErrors.filter(function (e) {
      return e.indexOf('Boss ') === 0 || e.indexOf('componentInputs') !== -1 ||
        e.indexOf('A1Z26') !== -1 || e.indexOf('demoPassword') !== -1;
    }).length;
    // Pad bossIssues length to reflect validator errors without duplicating strings
    for (var bei = 0; bei < bossErrorCount; bei++) bossIssues.push('(validator)');
  }

  var bossTotalIssues = bossIssues.length + bossQualityWarnings.length;
  report.scores.bossConvergence = bossTotalIssues === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - bossTotalIssues * 0.25), label: bossTotalIssues + ' issues' };
  // Only add quality-only warnings (validator errors are already in schemaErrors)
  if (bossQualityWarnings.length) report.warnings = report.warnings.concat(bossQualityWarnings);

  // ── Fragment reference integrity ───────────────────────────────────────
  var fragIssues = [];
  var docTypes = {};
  fragments.forEach(function (f) {
    if (!f.id) fragIssues.push('Fragment missing id');
    if (!f.documentType) fragIssues.push('Fragment "' + (f.id || '?') + '" missing documentType');
    var dt = f.documentType || 'unknown';
    docTypes[dt] = (docTypes[dt] || 0) + 1;
    if (!f.content && !f.body) fragIssues.push('Fragment "' + (f.id || '?') + '" missing content');
  });

  // Document type diversity
  var typeCount = Object.keys(docTypes).length;
  if (typeCount < 3 && fragments.length >= 6) {
    report.weakSpots.push({
      area: 'fragment-diversity',
      detail: 'Only ' + typeCount + ' document type(s) across ' + fragments.length + ' fragments',
      severity: 'medium'
    });
  }

  report.scores.fragmentIntegrity = fragIssues.length === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - fragIssues.length * 0.1), label: fragIssues.length + ' issues' };

  // ── Map integrity ──────────────────────────────────────────────────────
  var mapIssues = [];
  var prevMapLabels = null;
  nonBossWeeks.forEach(function (week) {
    var actualWeekNum = weeks.indexOf(week) + 1; // true week number, not filtered index
    var ms = (week.fieldOps || {}).mapState;
    if (!ms) {
      mapIssues.push('Week ' + actualWeekNum + ' missing mapState');
      return;
    }
    var labels = buildMapEvolutionFingerprint(ms);

    // Check for state evolution (tile labels AND types should differ between weeks)
    if (prevMapLabels !== null && labels === prevMapLabels) {
      report.weakSpots.push({
        area: 'map-stagnation',
        detail: 'Week ' + actualWeekNum + ' map tiles identical to previous week — no visible evolution',
        severity: 'high'
      });
    }
    prevMapLabels = labels;

    if (!ms.currentPosition) {
      mapIssues.push('Week ' + actualWeekNum + ' mapState missing currentPosition');
    }
  });

  // Count map regression errors from validator for scoring (already in schemaErrors)
  var mapRegressionCount = report.schemaErrors.filter(function (e) {
    return e.indexOf('impossible regression') !== -1;
  }).length;

  var mapTotalIssues = mapIssues.length + mapRegressionCount;
  report.scores.mapIntegrity = mapTotalIssues === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - mapTotalIssues * 0.15), label: mapTotalIssues + ' issues' };

  // ── Oracle completeness ────────────────────────────────────────────────
  var oracleIssues = [];
  var allOracleTexts = [];
  weeks.forEach(function (week, wi) {
    if (week.isBossWeek) return;
    var oracle = (week.fieldOps || {}).oracleTable || (week.fieldOps || {}).oracle || {};
    var entries = oracle.entries || [];
    if (entries.length === 0) {
      oracleIssues.push('Week ' + (wi + 1) + ' has no oracle entries');
      return;
    }

    entries.forEach(function (e) {
      var txt = e.text || '';
      allOracleTexts.push(txt);
      // Check for vague paperAction
      if (e.paperAction) {
        var pa = e.paperAction.toLowerCase();
        if (pa.indexOf('something') !== -1 || pa.indexOf('update the board') !== -1 || pa === '') {
          report.weakSpots.push({
            area: 'oracle-vagueness',
            detail: 'Week ' + (wi + 1) + ' oracle paperAction is vague: "' + e.paperAction + '"',
            severity: 'high'
          });
        }
      }
    });
  });

  // Thin oracle variety: check for near-duplicate texts across weeks
  var oracleDupes = 0;
  for (var oi = 0; oi < allOracleTexts.length; oi++) {
    for (var oj = oi + 1; oj < allOracleTexts.length; oj++) {
      if (allOracleTexts[oi] && allOracleTexts[oi] === allOracleTexts[oj]) {
        oracleDupes++;
      }
    }
  }
  if (oracleDupes > 0) {
    report.weakSpots.push({
      area: 'oracle-variety',
      detail: oracleDupes + ' duplicate oracle text(s) across weeks',
      severity: 'medium'
    });
  }

  report.scores.oracleCompleteness = oracleIssues.length === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - oracleIssues.length * 0.2), label: oracleIssues.length + ' issues' };

  // ── Overflow document planning integrity ───────────────────────────────
  var overflowIssues = [];
  weeks.forEach(function (week, wi) {
    if ((week.sessions || []).length > 3) {
      var od = week.overflowDocument;
      if (!od) {
        overflowIssues.push('Week ' + (wi + 1) + ' overflow but no overflowDocument');
      } else {
        if (!od.documentType) overflowIssues.push('Week ' + (wi + 1) + ' overflowDocument missing documentType');
        if (!od.content && !od.body) overflowIssues.push('Week ' + (wi + 1) + ' overflowDocument missing content');
      }
    }
  });

  report.scores.overflowIntegrity = overflowIssues.length === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - overflowIssues.length * 0.25), label: overflowIssues.length + ' issues' };

  // ── Workout/session consistency ────────────────────────────────────────
  var sessionIssues = [];
  var totalSessions = 0;
  weeks.forEach(function (week, wi) {
    var sessions = week.sessions || [];
    totalSessions += sessions.length;
    if (sessions.length === 0) {
      sessionIssues.push('Week ' + (wi + 1) + ' has zero sessions');
    }
    sessions.forEach(function (s, si) {
      if (!s.storyPrompt && !s.prompt) {
        sessionIssues.push('Week ' + (wi + 1) + ' session ' + (si + 1) + ' missing storyPrompt');
      }
      if (!s.exercises || s.exercises.length === 0) {
        sessionIssues.push('Week ' + (wi + 1) + ' session ' + (si + 1) + ' has no exercises');
      }
    });
  });
  if (meta.totalSessions && meta.totalSessions !== totalSessions) {
    sessionIssues.push('meta.totalSessions (' + meta.totalSessions + ') != actual (' + totalSessions + ')');
  }

  report.scores.sessionConsistency = sessionIssues.length === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - sessionIssues.length * 0.1), label: sessionIssues.length + ' issues' };

  var identityVariationIssues = collectIdentityVariationFindings(booklet, nonBossWeeks, fragments, report);
  report.scores.identityVariation = identityVariationIssues === 0
    ? { score: 1, label: 'clean' }
    : { score: Math.max(0, 1 - identityVariationIssues * 0.2), label: identityVariationIssues + ' issues' };

  // ── Weak spot detection (heuristics) ───────────────────────────────────

  // Repeated cipher types
  var cipherTypes = [];
  nonBossWeeks.forEach(function (w) {
    var ct = ((w.fieldOps || {}).cipher || {}).type || '';
    cipherTypes.push(ct);
  });
  for (var ci = 1; ci < cipherTypes.length; ci++) {
    if (cipherTypes[ci] && cipherTypes[ci] === cipherTypes[ci - 1]) {
      report.weakSpots.push({
        area: 'cipher-repetition',
        detail: 'Weeks ' + ci + ' and ' + (ci + 1) + ' both use cipher type "' + cipherTypes[ci] + '"',
        severity: 'high'
      });
    }
  }
  var uniqueCipherTypes = {};
  cipherTypes.forEach(function (t) { if (t) uniqueCipherTypes[t] = true; });
  if (Object.keys(uniqueCipherTypes).length < Math.min(4, nonBossWeeks.length) && nonBossWeeks.length >= 4) {
    report.weakSpots.push({
      area: 'cipher-diversity',
      detail: 'Only ' + Object.keys(uniqueCipherTypes).length + ' distinct cipher types across ' + nonBossWeeks.length + ' non-boss weeks (target: 4+)',
      severity: 'medium'
    });
  }

  // Underused fragments (exist but never referenced)
  if (unreferencedFragments.length > fragments.length * 0.3 && fragments.length > 3) {
    report.weakSpots.push({
      area: 'underused-fragments',
      detail: unreferencedFragments.length + ' of ' + fragments.length + ' fragments never referenced by sessions, oracle entries, or cipher referenceTargets',
      severity: 'medium'
    });
  }

  // Voice/register drift risk: check if meta has narrativeVoice
  if (!meta.narrativeVoice && !meta.literaryRegister) {
    report.weakSpots.push({
      area: 'voice-drift-risk',
      detail: 'meta missing narrativeVoice and literaryRegister — high risk of register drift across stages',
      severity: 'low'
    });
  }
  if (!meta.artifactIdentity) {
    report.weakSpots.push({
      area: 'identity-drift-risk',
      detail: 'meta.artifactIdentity missing — renderer will infer shell identity from weak signals only',
      severity: 'high'
    });
  }

  // Endings quality: check endings reference specifics
  endings.forEach(function (ending, ei) {
    var body = '';
    if (ending.content && typeof ending.content === 'object') {
      body = ending.content.body || ending.content.html || '';
    } else if (typeof ending.content === 'string') {
      body = ending.content;
    } else if (ending.body) {
      body = ending.body;
    }
    if (body.length < 100) {
      report.weakSpots.push({
        area: 'thin-ending',
        detail: 'Ending ' + (ei + 1) + ' body is only ' + body.length + ' chars — likely too thin for payoff',
        severity: 'high'
      });
    }
  });

  // Unsupported reveal pattern: boss without decodingKey referenceTable
  if (bossWeek) {
    var dk = (bossWeek.bossEncounter || {}).decodingKey;
    if (dk && !dk.referenceTable && !dk.instruction) {
      report.weakSpots.push({
        area: 'unsupported-reveal',
        detail: 'Boss decodingKey present but missing both referenceTable and instruction',
        severity: 'high'
      });
    }
  }

  // ── Artifact intent coherence (Layer 3 variety contract drift) ────────
  var intentDrift = (booklet._artifactIntentDrift || {}).diagnostics || [];
  var intentIssueCount = 0;

  if (intentDrift.length > 0) {
    // Severity mapping: forbidden/excluded → high, underrepresentation/proxy → medium
    var DRIFT_SEVERITY_MAP = {
      'forbidden-document-type': { area: 'intent-forbidden-content', severity: 'high' },
      'excluded-document-type-present': { area: 'intent-excluded-content', severity: 'high' },
      'excluded-mechanic-proxy-present': { area: 'intent-excluded-content', severity: 'medium' },
      'dominant-ecology-underrepresented': { area: 'intent-ecology-drift', severity: 'medium' },
      'mechanic-grammar-map-mismatch': { area: 'intent-mechanic-drift', severity: 'medium' }
    };

    intentDrift.forEach(function (d) {
      var mapping = DRIFT_SEVERITY_MAP[d.code] || { area: 'intent-ecology-drift', severity: 'medium' };
      report.weakSpots.push({
        area: mapping.area,
        detail: d.message,
        severity: mapping.severity
      });
      intentIssueCount++;
    });
  }

  // Score: clean if no drift, degrade per issue (forbidden counts more)
  if (((booklet.meta || {}).artifactIntent)) {
    var forbiddenCount = intentDrift.filter(function (d) {
      return d.code === 'forbidden-document-type' || d.code === 'excluded-document-type-present';
    }).length;
    var softCount = intentIssueCount - forbiddenCount;
    // Forbidden/excluded violations cost 0.25 each, soft drift costs 0.15 each
    var intentScore = Math.max(0, 1 - (forbiddenCount * 0.25) - (softCount * 0.15));
    report.scores.artifactIntentCoherence = {
      score: Math.round(intentScore * 100) / 100,
      label: intentIssueCount === 0 ? 'clean' : intentIssueCount + ' drift issue(s)'
    };
  }

  // ── S+F cross-stage continuity (surfaced from pipeline instrumentation) ──
  var sfContinuity = booklet._continuityWarnings || [];
  if (sfContinuity.length > 0) {
    sfContinuity.forEach(function (cw) {
      report.warnings.push('[S+F continuity/' + (cw.stage || '?') + '] ' + (cw.message || ''));
    });
    report.scores.sfContinuity = {
      score: Math.max(0, 1 - sfContinuity.length * 0.15),
      label: sfContinuity.length + ' cross-stage issue(s)'
    };
  }

  // ── Aggregate score ────────────────────────────────────────────────────
  var scoreKeys = Object.keys(report.scores);
  var totalScore = 0;
  scoreKeys.forEach(function (k) { totalScore += report.scores[k].score; });
  report.scores.aggregate = {
    score: Math.round((totalScore / scoreKeys.length) * 100) / 100,
    label: scoreKeys.length + ' dimensions'
  };

  report.weakSpotCount = report.weakSpots.length;
  report.warningCount = report.warnings.length;

  // Side-effect: store on public API for console inspection
  if (typeof window !== 'undefined' && window.LiftRPGAPI) {
    window.LiftRPGAPI.lastQualityReport = report;
  }

  return report;
}
