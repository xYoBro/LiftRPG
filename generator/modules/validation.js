// ── Validation module ─────────────────────────────────────────────────────────
// All validators extracted from api-generator.js IIFE.
// Covers: continuity validators, schema validation helpers, per-stage validators,
// and pipeline stage validators.

import {
  ORACLE_ROLL_BANDS,
  VALID_PAYLOAD_TYPES,
  DOCUMENT_TYPE_ENUM,
  DOCUMENT_TYPE_ALIASES,
  VALID_MAP_TYPES,
  SPATIAL_GUARDRAILS,
  VALID_COMPANION_TYPES,
  VALID_CLOCK_TYPES,
  VALID_ARCHETYPES,
  ACCEPTED_SCHEMA_VERSIONS,
  SCHEMA_VERSION,
  PERCENTILE_STAT,
  MARK_STRIP,
  RECKONING_SINK_KINDS,
  RECKONING_THRESHOLD_RATIO
} from './constants.js';

import {
  buildContinuityLedger,
  continuityRefExists,
  resolveBossWeekIndex,
  toSlugWords,
  normalizeId,
  extractInputCountClaims,
  extractEndingBodyText,
  extractYearsFromText,
  collectAnchoredPhrases,
  normalizeThemeArchetype
} from './assembly.js';

// The standard-A1Z26 predicate is a statement about a contract field's shape
// (`decodingKey.referenceTable` is typed `['string','array']`), so it lives
// with the contract — one implementation shared with the renderer. decodeA1Z26
// is the decoder that predicate gates, and moved to the same home in D93; it
// used to reach here second-hand via assembly.js.
//
// The artifactIntent planning menus (arc families, mechanic grammar families)
// come from the same home: the skeleton prompt offers them, this pass checks
// what came back, and a menu that drifted from the checker would make every
// advisory here a lie. See VALID_ARC_FAMILIES in contract-constants.mjs.
import {
  decodeA1Z26,
  isStandardAlphaTable,
  VALID_ARC_FAMILIES,
  VALID_MECHANIC_GRAMMAR_FAMILIES,
  VALID_CONVERGENCE_PATTERNS,
  FAMILY_CLUSTERS,
  REJECTED_READING_AXES,
  resolveNeighborFamilies,
  // Wave 4a: the citation grammar and the pointer budgets. The grammar table
  // and its two readers live with VALID_SHELL_FAMILIES (D93) — this module
  // routes severity, it does not own what a pinpoint looks like.
  POINTER_BUDGETS,
  resolveCitationStyle,
  citationPinpoints,
  resolveShellFamily
} from '../../contracts/contract-constants.mjs';

// Map-evolution fingerprint + companions: one implementation, shared with quality.js.
// Formerly a private copy here that silently diverged from quality.js's — see D91 and
// the header of fingerprint.js. Guarded by singleFingerprintHome() in validate.mjs.
import {
  buildMapEvolutionFingerprint,
  hasComparableMapState,
  looksLikeFragmentRef
} from './fingerprint.js';

// ── Part 1: Continuity validators ─────────────────────────────────────────────

// Normalize component type strings for comparison: trim, lowercase, underscores→spaces
function normalizeComponentType(s) {
  return String(s || '').trim().toLowerCase().replace(/_/g, ' ');
}

function normalizePlanningText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isMapNoChangePlaceholder(value) {
  var normalized = normalizePlanningText(value);
  if (!normalized) return false;
  return /^(?:none|n\/a|na|same|same state|same map|unchanged|static|no change|no visible change|nothing new|no new unlock|no unlock)$/i.test(normalized);
}


function firstNonEmptyShellText() {
  for (var i = 0; i < arguments.length; i++) {
    var value = arguments[i];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function coerceShellText(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return value.map(coerceShellText).filter(Boolean).join(' ').trim();
  }
  if (!value || typeof value !== 'object') return '';
  return firstNonEmptyShellText(
    value.body,
    value.text,
    value.displayText,
    value.content,
    value.copy,
    value.description,
    value.instruction,
    value.summary,
    value.finalLine
  );
}

function titleCaseShellLabel(value) {
  var text = String(value || '').trim();
  if (!text) return '';
  return text.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').replace(/\b[a-z]/g, function (match) {
    return match.toUpperCase();
  });
}

function splitShellSectionText(text, index) {
  var normalized = String(text || '').trim();
  if (!normalized) return { heading: '', body: '' };

  var punctuated = normalized.match(/^([^:]{2,60}?)\s*:\s+(.+)$/);
  if (punctuated) {
    return { heading: titleCaseShellLabel(punctuated[1]), body: punctuated[2].trim() };
  }

  var dashed = normalized.match(/^([^-\u2013\u2014]{2,60}?)\s*[-\u2013\u2014]\s+(.+)$/);
  if (dashed) {
    return { heading: titleCaseShellLabel(dashed[1]), body: dashed[2].trim() };
  }

  return { heading: fabricatedShellHeading(index), body: normalized };
}

// A fabricated heading is a repair, not a silent substitution: "Procedure N"
// is non-diegetic and can print in any genre's booklet, so its use is logged.
function fabricatedShellHeading(index) {
  console.warn('[LiftRPG] rulesSpread section ' + (index + 1)
    + ': no heading could be derived \u2014 placeholder "Procedure ' + (index + 1)
    + '" will print unless the section is regenerated or edited.');
  return 'Procedure ' + (index + 1);
}

function normalizeShellSection(section, index) {
  if (section && typeof section === 'object' && !Array.isArray(section) && section.heading && (section.body || section.text)) {
    if (!section.body && section.text) section.body = String(section.text).trim();
    section.heading = String(section.heading).trim();
    section.body = String(section.body || '').trim();
    return section;
  }

  if (typeof section === 'string' || Array.isArray(section)) {
    var fromText = splitShellSectionText(coerceShellText(section), index);
    return { heading: fromText.heading, body: fromText.body };
  }

  if (!section || typeof section !== 'object') {
    return { heading: fabricatedShellHeading(index), body: '' };
  }

  var objectKeys = Object.keys(section);
  if (!section.heading && !section.body && !section.text && objectKeys.length === 1) {
    var onlyKey = objectKeys[0];
    var onlyValue = coerceShellText(section[onlyKey]);
    if (onlyValue) {
      return { heading: titleCaseShellLabel(onlyKey), body: onlyValue };
    }
  }

  var heading = firstNonEmptyShellText(
    section.heading,
    section.title,
    section.label,
    section.name,
    section.header,
    section.topic
  );
  var body = firstNonEmptyShellText(
    coerceShellText(section.body),
    coerceShellText(section.text),
    coerceShellText(section.content),
    coerceShellText(section.copy),
    coerceShellText(section.description),
    coerceShellText(section.instruction),
    coerceShellText(section.summary)
  );

  if (!heading && body) {
    var split = splitShellSectionText(body, index);
    heading = split.heading;
    body = split.body;
  }

  return {
    heading: heading || fabricatedShellHeading(index),
    body: body || ''
  };
}

export function normalizeShellShape(shell) {
  if (!shell || typeof shell !== 'object') return shell;

  // schemaVersion is tooling-owned. LLMs replaying stale prompts emit old
  // versions; that is local drift, auto-fixed here (guided-build doctrine),
  // never a blocker. Unrecognized versions AND recognized-but-stale ones both
  // land on the current SCHEMA_VERSION — ACCEPTED_SCHEMA_VERSIONS says what we
  // can read, SCHEMA_VERSION says what we write (D21).
  if (shell.meta && typeof shell.meta === 'object' &&
      String(shell.meta.schemaVersion) !== SCHEMA_VERSION) {
    shell.meta.schemaVersion = SCHEMA_VERSION;
  }

  var rulesSpread = shell.rulesSpread || {};
  var leftPage = rulesSpread.leftPage || {};
  var rightPage = rulesSpread.rightPage || {};

  if (!Array.isArray(leftPage.sections)) {
    if (Array.isArray(leftPage.entries)) {
      leftPage.sections = leftPage.entries.slice();
    } else if (Array.isArray(leftPage.rules)) {
      leftPage.sections = leftPage.rules.slice();
    } else if (leftPage.sections && typeof leftPage.sections === 'object') {
      leftPage.sections = Object.keys(leftPage.sections).map(function (key) {
        var entry = {};
        entry[key] = leftPage.sections[key];
        return entry;
      });
    }
  }

  if (Array.isArray(leftPage.sections)) {
    leftPage.sections = leftPage.sections.map(function (section, index) {
      return normalizeShellSection(section, index);
    });
  }

  if (!leftPage.title) {
    leftPage.title = firstNonEmptyShellText(leftPage.heading, leftPage.header, leftPage.name);
  }
  if (!leftPage.reEntryRule) {
    leftPage.reEntryRule = firstNonEmptyShellText(
      leftPage.reentryRule,
      leftPage.reEntry,
      leftPage.missedSessionRule,
      leftPage.catchUpRule
    );
  }

  if (!rightPage.title) {
    rightPage.title = firstNonEmptyShellText(rightPage.heading, rightPage.header, rightPage.name);
  }
  if (!rightPage.instruction) {
    rightPage.instruction = firstNonEmptyShellText(
      rightPage.instruction,
      rightPage.body,
      rightPage.text,
      rightPage.description,
      rightPage.copy,
      rightPage.guide
    );
  }

  rulesSpread.leftPage = leftPage;
  rulesSpread.rightPage = rightPage;
  shell.rulesSpread = rulesSpread;
  return shell;
}

export function normalizeCampaignPlanOwnership(result) {
  if (!result || typeof result !== 'object') return result;

  var weekByNumber = {};
  var overflowIdByWeek = {};
  var overflowEntryByWeek = {};
  var normalizedFragmentRegistry = [];

  (result.weeks || []).forEach(function (week) {
    if (week && week.weekNumber) weekByNumber[week.weekNumber] = week;
  });

  (result.overflowRegistry || []).forEach(function (entry) {
    if (!entry || typeof entry !== 'object') return;
    if (!entry.weekNumber && entry.weekRef) entry.weekNumber = entry.weekRef;
    if (entry.weekNumber && entry.id) {
      overflowIdByWeek[entry.weekNumber] = entry.id;
      overflowEntryByWeek[entry.weekNumber] = entry;
    }
  });

  (result.fragmentRegistry || []).forEach(function (entry) {
    if (!entry || typeof entry !== 'object') return;
    var normalizedId = normalizeId(entry.id);
    var weekNumber = entry.weekRef || entry.weekNumber || null;
    var numericMatch = normalizedId && normalizedId.match(/^f(\d+)$/);
    var numericPortion = numericMatch ? Number(numericMatch[1]) : null;
    var looksLikeOverflow = !!(numericPortion && numericPortion >= 30);

    if (looksLikeOverflow && weekNumber) {
      if (!overflowEntryByWeek[weekNumber]) {
        overflowEntryByWeek[weekNumber] = {
          id: entry.id,
          weekNumber: weekNumber,
          documentType: entry.documentType || '',
          author: entry.author || '',
          narrativeFunction: entry.revealPurpose || entry.narrativeFunction || '',
          tonalIntent: entry.tonalIntent || '',
          arcRelationship: entry.arcRelationship || entry.clueFunction || ''
        };
        overflowIdByWeek[weekNumber] = entry.id;
      }
      return;
    }

    normalizedFragmentRegistry.push(entry);
  });

  result.fragmentRegistry = normalizedFragmentRegistry;
  result.overflowRegistry = Object.keys(overflowEntryByWeek)
    .map(function (weekKey) { return overflowEntryByWeek[weekKey]; })
    .sort(function (left, right) { return Number(left.weekNumber || 0) - Number(right.weekNumber || 0); });

  (result.weeks || []).forEach(function (week) {
    if (!week || typeof week !== 'object') return;
    if (!week.overflowFragmentId && overflowIdByWeek[week.weekNumber]) {
      week.overflowFragmentId = overflowIdByWeek[week.weekNumber];
    }
    if (!Array.isArray(week.fragmentIds)) return;
    var overflowId = normalizeId(week.overflowFragmentId || overflowIdByWeek[week.weekNumber] || '');
    if (!overflowId) return;
    week.fragmentIds = week.fragmentIds.filter(function (fragmentId) {
      return normalizeId(fragmentId) !== overflowId;
    });
  });

  (result.weeks || []).forEach(function (week) {
    if (!week || typeof week !== 'object') return;
    if (week.sessionCount > 3) {
      if (!week.overflowFragmentId && overflowIdByWeek[week.weekNumber]) {
        week.overflowFragmentId = overflowIdByWeek[week.weekNumber];
      }
      return;
    }
    if (week.overflowFragmentId) delete week.overflowFragmentId;
    delete overflowIdByWeek[week.weekNumber];
    delete overflowEntryByWeek[week.weekNumber];
  });

  result.overflowRegistry = Object.keys(overflowEntryByWeek)
    .map(function (weekKey) { return overflowEntryByWeek[weekKey]; })
    .sort(function (left, right) { return Number(left.weekNumber || 0) - Number(right.weekNumber || 0); });

  return result;
}

export function validateWeekChunkContinuity(chunk, context) {
  var errors = [];
  context = context || {};
  var ledger = buildContinuityLedger({
    shell: context.shell,
    campaignPlan: context.campaignPlan,
    weekChunkOutputs: context.priorWeekChunkOutputs || []
  });
  var expectedWeeklyComponentType = ledger.weeklyComponentType;
  var combinedComponentValues = ledger.componentValues.slice();
  var referencedFragmentIds = {};
  var chunkWeekNumbers = {};
  var explicitWeekFragmentPlan = {};
  var plannedFragmentsByWeek = {};
  var approvedRefsByWeek = {};

  function registerApprovedRef(weekNumber, ref) {
    var normalized = normalizeId(ref);
    if (!weekNumber || !normalized) return;
    if (!approvedRefsByWeek[weekNumber]) {
      approvedRefsByWeek[weekNumber] = { lookup: {}, ordered: [] };
    }
    if (!approvedRefsByWeek[weekNumber].lookup[normalized]) {
      approvedRefsByWeek[weekNumber].lookup[normalized] = String(ref);
      approvedRefsByWeek[weekNumber].ordered.push(String(ref));
    }
  }

  function registerPlannedFragment(weekNumber, ref) {
    var normalized = normalizeId(ref);
    if (!weekNumber || !normalized) return;
    if (!plannedFragmentsByWeek[weekNumber]) plannedFragmentsByWeek[weekNumber] = [];
    if (plannedFragmentsByWeek[weekNumber].indexOf(normalized) === -1) {
      plannedFragmentsByWeek[weekNumber].push(normalized);
    }
    registerApprovedRef(weekNumber, ref);
  }

  ((context.campaignPlan || {}).weeks || []).forEach(function (plannedWeek) {
    var weekNumber = Number(plannedWeek && plannedWeek.weekNumber);
    if (!weekNumber) return;
    var fragmentIds = Array.isArray(plannedWeek.fragmentIds) ? plannedWeek.fragmentIds : [];
    if (fragmentIds.length > 0) explicitWeekFragmentPlan[weekNumber] = true;
    fragmentIds.forEach(function (fragmentId) {
      registerPlannedFragment(weekNumber, fragmentId);
    });
    if (plannedWeek && plannedWeek.overflowFragmentId) {
      registerApprovedRef(weekNumber, plannedWeek.overflowFragmentId);
    }
  });

  ((context.campaignPlan || {}).fragmentRegistry || []).forEach(function (entry) {
    if (!entry || !entry.weekRef || explicitWeekFragmentPlan[entry.weekRef]) return;
    registerPlannedFragment(entry.weekRef, entry.id);
  });

  ((context.campaignPlan || {}).overflowRegistry || []).forEach(function (entry) {
    if (!entry || !entry.weekNumber) return;
    registerApprovedRef(entry.weekNumber, entry.id);
  });

  (chunk.weeks || []).forEach(function (week, index) {
    var label = 'Week ' + (week.weekNumber || context.expectedWeeks && context.expectedWeeks[index] || '?');
    if (week && week.weekNumber) chunkWeekNumbers[week.weekNumber] = true;
    var wc = week.weeklyComponent || {};
    if (!week.isBossWeek && expectedWeeklyComponentType && wc.type && normalizeComponentType(wc.type) !== normalizeComponentType(expectedWeeklyComponentType)) {
      errors.push(label + ' weeklyComponent.type "' + wc.type + '" does not match shell meta.weeklyComponentType "' + expectedWeeklyComponentType + '"');
    }

    (week.sessions || []).forEach(function (session, sessionIndex) {
      if (session.fragmentRef && !continuityRefExists(ledger, session.fragmentRef)) {
        errors.push(label + ' session ' + (sessionIndex + 1) + ': fragmentRef "' + session.fragmentRef + '" is not present in fragmentRegistry or overflowRegistry');
      }
      var approvedSessionRefs = approvedRefsByWeek[week.weekNumber];
      if (session.fragmentRef && approvedSessionRefs && !approvedSessionRefs.lookup[normalizeId(session.fragmentRef)]) {
        errors.push(label + ' session ' + (sessionIndex + 1) + ': fragmentRef "' + session.fragmentRef + '" is not approved for this week (allowed: ' + approvedSessionRefs.ordered.join(', ') + ')');
      }
      if (session.fragmentRef) referencedFragmentIds[normalizeId(session.fragmentRef)] = true;
    });

    var oracle = (week.fieldOps || {}).oracleTable || (week.fieldOps || {}).oracle || {};
    (oracle.entries || []).forEach(function (entry, entryIndex) {
      if (entry.fragmentRef && !continuityRefExists(ledger, entry.fragmentRef)) {
        errors.push(label + ' oracle[' + entryIndex + ']: fragmentRef "' + entry.fragmentRef + '" is not present in fragmentRegistry or overflowRegistry');
      }
      var approvedOracleRefs = approvedRefsByWeek[week.weekNumber];
      if (entry.fragmentRef && approvedOracleRefs && !approvedOracleRefs.lookup[normalizeId(entry.fragmentRef)]) {
        errors.push(label + ' oracle[' + entryIndex + ']: fragmentRef "' + entry.fragmentRef + '" is not approved for this week (allowed: ' + approvedOracleRefs.ordered.join(', ') + ')');
      }
      if (entry.fragmentRef) referencedFragmentIds[normalizeId(entry.fragmentRef)] = true;
    });

    var cipherTargets = ((((week.fieldOps || {}).cipher || {}).body || {}).referenceTargets) || [];
    cipherTargets.forEach(function (target, targetIndex) {
      if (!looksLikeFragmentRef(target)) return;
      if (!continuityRefExists(ledger, target)) {
        errors.push(label + ' cipher.referenceTargets[' + targetIndex + '] "' + target + '" is not present in fragmentRegistry or overflowRegistry');
      }
      var approvedCipherRefs = approvedRefsByWeek[week.weekNumber];
      if (approvedCipherRefs && !approvedCipherRefs.lookup[normalizeId(target)]) {
        errors.push(label + ' cipher.referenceTargets[' + targetIndex + '] "' + target + '" is not approved for this week (allowed: ' + approvedCipherRefs.ordered.join(', ') + ')');
      }
      referencedFragmentIds[normalizeId(target)] = true;
    });

    if (week.overflowDocument && week.overflowDocument.id) {
      var overflowId = normalizeId(week.overflowDocument.id);
      if (!ledger.overflowIds[overflowId] && Array.isArray((context.campaignPlan || {}).overflowRegistry) && (context.campaignPlan || {}).overflowRegistry.length) {
        errors.push(label + ' overflowDocument.id "' + week.overflowDocument.id + '" is not present in overflowRegistry');
      }
      ledger.overflowIds[overflowId] = true;
    }

    if (!week.isBossWeek && wc.value !== undefined && wc.value !== null && wc.value !== '') {
      combinedComponentValues.push(String(wc.value));
    }
  });

  Object.keys(plannedFragmentsByWeek).forEach(function (weekKey) {
    var weekNumber = Number(weekKey);
    if (!chunkWeekNumbers[weekNumber]) return;
    (plannedFragmentsByWeek[weekNumber] || []).forEach(function (fragmentId) {
      if (!referencedFragmentIds[fragmentId]) {
        var approved = approvedRefsByWeek[weekNumber];
        var displayId = approved && approved.lookup[fragmentId] ? approved.lookup[fragmentId] : fragmentId;
        errors.push('Week ' + weekNumber + ' does not reference planned fragment "' + displayId + '" in sessions, oracle entries, or cipher referenceTargets');
      }
    });
  });

  var bossWeek = (chunk.weeks || []).find(function (week) { return week && week.isBossWeek; });
  if (bossWeek && bossWeek.bossEncounter) {
    var inputs = (bossWeek.bossEncounter.componentInputs || []).map(function (value) { return String(value); });
    if (inputs.length !== combinedComponentValues.length) {
      errors.push('Boss componentInputs has ' + inputs.length + ' values but the validated non-boss week set has ' + combinedComponentValues.length);
    } else {
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i] !== combinedComponentValues[i]) {
          errors.push('Boss componentInputs[' + i + '] = "' + inputs[i] + '" does not match collected weeklyComponent value "' + combinedComponentValues[i] + '"');
        }
      }
    }

    var bossText = [
      bossWeek.bossEncounter.narrative,
      bossWeek.bossEncounter.mechanismDescription,
      (bossWeek.bossEncounter.decodingKey || {}).instruction,
      bossWeek.bossEncounter.convergenceProof,
      bossWeek.bossEncounter.passwordRevealInstruction
    ].join('\n');
    extractInputCountClaims(bossText).forEach(function (claim) {
      if (claim.value && claim.value !== inputs.length) {
        errors.push('Boss prose says "' + claim.phrase + '" but componentInputs has ' + inputs.length + ' values.');
      }
    });
  }

  return errors;
}

export function validateFragmentBatchContinuity(batchOutput, context) {
  var errors = [];
  context = context || {};
  var ledger = buildContinuityLedger({
    shell: context.shell,
    campaignPlan: context.campaignPlan,
    weekChunkOutputs: context.weekChunkOutputs || []
  });

  (batchOutput.fragments || []).forEach(function (fragment) {
    var id = String((fragment || {}).id || '');
    var normalized = normalizeId(id);
    if (!normalized) return;
    if (context.expectedRegistry && context.expectedRegistry.length && !ledger.fragmentIds[normalized]) {
      errors.push('Fragment "' + id + '" is not present in the campaign fragmentRegistry');
    }

    var content = extractEndingBodyText(fragment);
    var lowered = content.toLowerCase();
    if (lowered.indexOf('liftrpg.co') !== -1 || lowered.indexOf('unlock the ending') !== -1) {
      errors.push('Fragment "' + id + '" leaks final unlock language reserved for the boss/endings path');
    }
  });

  return errors;
}

export function validateEndingsContinuity(endingsOutput, context) {
  var errors = [];
  context = context || {};
  var ledger = buildContinuityLedger({
    shell: context.shell,
    campaignPlan: context.campaignPlan,
    weekChunkOutputs: context.weekChunkOutputs || [],
    fragmentsOutput: context.fragmentsOutput || {}
  });

  (endingsOutput.endings || []).forEach(function (ending, index) {
    if (ending.passwordEncryptedEnding || ending.passwordPlaintext) {
      errors.push('Ending ' + (index + 1) + ' includes forbidden password fields; ending payloads must stay plaintext until local sealing.');
    }

    var body = extractEndingBodyText(ending);
    var lowered = body.toLowerCase();
    if (lowered.indexOf('passwordencryptedending') !== -1) {
      errors.push('Ending ' + (index + 1) + ' appears to include ciphertext or sealing metadata.');
    }

    if (ledger.componentValues.length > 0 && lowered.indexOf('liftrpg.co') !== -1 && lowered.indexOf('enter it') === -1 && lowered.indexOf('enter the word') === -1) {
      errors.push('Ending ' + (index + 1) + ' references the unlock path without a stable instruction phrase.');
    }

    extractYearsFromText(body).forEach(function (year) {
      var knownYears = Object.keys(ledger.priorYears || {}).map(function (value) { return Number(value); });
      if (!knownYears.length) return;
      var known = !!ledger.priorYears[year];
      var closeToKnown = knownYears.some(function (candidate) {
        return Math.abs(candidate - year) <= 1;
      });
      if (!known && !closeToKnown) {
        errors.push('Ending ' + (index + 1) + ' introduces year ' + year + ' without support from validated weeks or fragments.');
      }
    });

    collectAnchoredPhrases(body).forEach(function (phrase) {
      var supportedPhrase = ledger.knownAnchoredPhrases && ledger.knownAnchoredPhrases[phrase];
      if (!supportedPhrase) {
        errors.push('Ending ' + (index + 1) + ' references "' + phrase + '" but that anchored phrase does not appear in validated weeks or fragments.');
      }
    });

    if (/\bearth relay\b/i.test(body) && !(ledger.knownSignalTokens && (ledger.knownSignalTokens.earth || ledger.knownSignalTokens.relay))) {
      errors.push('Ending ' + (index + 1) + ' introduces "Earth relay" without upstream support.');
    }
  });

  return errors;
}

// ── Part 2: Schema validation helpers ─────────────────────────────────────────

export function normalizeOracleRollBand(value) {
  return String(value || '')
    .trim()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, '');
}

export function collectOracleBandErrors(entries, label) {
  var errors = [];
  if (entries.length !== ORACLE_ROLL_BANDS.length) {
    errors.push(label + ': has ' + entries.length + ' entries, needs 10 (bands "00-09"–"90-99")');
    return errors;
  }
  var seen = {};
  entries.forEach(function (entry) {
    var roll = normalizeOracleRollBand(entry && entry.roll);
    if (ORACLE_ROLL_BANDS.indexOf(roll) === -1) {
      errors.push(label + ': unexpected roll "' + (entry && entry.roll) + '" (must use d100 bands "00-09"–"90-99")');
      return;
    }
    if (seen[roll]) {
      errors.push(label + ': duplicate roll "' + roll + '"');
      return;
    }
    seen[roll] = true;
  });
  ORACLE_ROLL_BANDS.forEach(function (roll) {
    if (!seen[roll]) errors.push(label + ': missing roll "' + roll + '"');
  });
  return errors;
}

export function validateBookletSchema(booklet) {
  var errors = [];
  (booklet.weeks || []).forEach(function (week, wi) {
    var wn = 'Week ' + (wi + 1);
    var fo = week.fieldOps || {};

    // Oracle checks
    var oracle = fo.oracleTable || fo.oracle || {};
    var entries = oracle.entries || [];
    entries.forEach(function (entry, ei) {
      if (Object.prototype.hasOwnProperty.call(entry, 'description')) {
        errors.push(wn + ' oracle[' + ei + ']: uses "description" — must be "text"');
      }
      if (entry.type === 'fragment' && !entry.fragmentRef) {
        errors.push(wn + ' oracle[' + ei + ']: type "fragment" missing fragmentRef');
      }
    });
    collectOracleBandErrors(entries, wn + ' oracle').forEach(function (message) {
      errors.push(message);
    });

    // Cipher body must be an object
    var cipher = fo.cipher || {};
    if (cipher.body !== undefined && typeof cipher.body !== 'object') {
      errors.push(wn + ' cipher.body: must be an object, got ' + (typeof cipher.body));
    }

    // Interlude payloadType
    var interlude = week.interlude || {};
    if (interlude.payloadType && !VALID_PAYLOAD_TYPES[interlude.payloadType]) {
      errors.push(wn + ' interlude.payloadType: "' + interlude.payloadType + '" not supported');
    }
  });
  return errors;
}

// ── Part 3: Per-stage validators ──────────────────────────────────────────────

// ── Wave 4a shape checks (stage-level) ──────────────────────────────────────
// The stage validators run against a single stage's JSON, before assembly and
// long before the cross-document ledger exists — so they cannot ask whether a
// citeRef RESOLVES (that is the assembled-path job, collectCiteRefFindings).
// What they can and must ask is whether a field the model emitted is BUILT: a
// citeRef with a targetRef and no citedAs is a pointer with no scent, and it
// would reach the page as a destination the reader is asked to guess at.
//
// Every check below is conditional on the field being present. These fields are
// optional richness (D19) — demanding them here would fail complete books and
// spend a retry on a field the doctrine only invites.

function citeRefShapeError(where, ref) {
  if (ref === undefined || ref === null) return '';
  if (typeof ref !== 'object' || Array.isArray(ref)) {
    return where + ' citeRef must be an object { targetRef, citedAs }';
  }
  if (!String(ref.targetRef || '').trim()) {
    return where + ' citeRef is missing targetRef — a citation must name the surface it cites';
  }
  if (!String(ref.citedAs || '').trim()) {
    return where + ' citeRef is missing citedAs — a destination with no payload is a blind reference';
  }
  return '';
}

// Session-level: microLines[] and returnBeat.
function pushShapeErrors(errors, where, session) {
  var lines = session && session.microLines;
  if (lines !== undefined && lines !== null) {
    if (!Array.isArray(lines)) {
      errors.push(where + ' microLines must be an array of { condition, cue, citeRef? }');
    } else {
      lines.forEach(function (line, mi) {
        var at = where + ' microLine ' + (mi + 1);
        if (!line || typeof line !== 'object' || Array.isArray(line)) {
          errors.push(at + ' must be an object { condition, cue, citeRef? }');
          return;
        }
        if (!String(line.condition || '').trim()) {
          errors.push(at + ' is missing condition — a keyed line must name the printed state it fires on');
        }
        if (!String(line.cue || '').trim()) {
          errors.push(at + ' is missing cue — a condition with no payload asks the player to check something for nothing');
        }
        var refErr = citeRefShapeError(at, line.citeRef);
        if (refErr) errors.push(refErr);
      });
    }
  }

  var rb = session && session.returnBeat;
  if (rb !== undefined && rb !== null) {
    if (typeof rb !== 'object' || Array.isArray(rb)) {
      errors.push(where + ' returnBeat must be an object { closingLine, openingEcho? }');
    } else if (!String(rb.closingLine || '').trim()) {
      errors.push(where + ' returnBeat is missing closingLine — the return beat exists to name tomorrow before the book closes');
    }
  }
}

// Week-level: doorChoice.
function pushDoorChoiceErrors(errors, door) {
  if (door === undefined || door === null) return;
  if (typeof door !== 'object' || Array.isArray(door)) {
    errors.push('doorChoice must be an object { label?, optionA, optionB }');
    return;
  }
  ['optionA', 'optionB'].forEach(function (side) {
    var option = door[side];
    if (option === undefined || option === null) {
      errors.push('doorChoice is missing ' + side + ' — a door with one side is a corridor');
      return;
    }
    if (typeof option !== 'object' || Array.isArray(option)) {
      errors.push('doorChoice.' + side + ' must be an object { label, lean? }');
      return;
    }
    if (!String(option.label || '').trim()) {
      errors.push('doorChoice.' + side + ' is missing label — the player must be able to say which way they went');
    }
  });
}

// Fragment-level: citeRef and seal. Exported because the fragment stage and the
// assembled path both reach for it, and a second copy would drift.
export function collectFragmentPointerShapeErrors(fragment) {
  var errors = [];
  var where = 'Fragment "' + ((fragment && fragment.id) || '?') + '"';
  var refErr = citeRefShapeError(where, fragment && fragment.citeRef);
  if (refErr) errors.push(refErr);

  var s = fragment && fragment.seal;
  if (s === undefined || s === null) return errors;
  if (typeof s !== 'object' || Array.isArray(s)) {
    errors.push(where + ' seal must be an object { keyHint, unlockCondition }');
    return errors;
  }
  if (!String(s.keyHint || '').trim()) {
    errors.push(where + ' seal is missing keyHint — the player must be able to recognise the key weeks before the lock');
  }
  if (!String(s.unlockCondition || '').trim()) {
    errors.push(where + ' seal is missing unlockCondition — a lock with no stated opening is a page nobody may turn');
  }
  return errors;
}

/**
 * Per-week structural validation. Runs after each week is generated
 * in the pipeline, before proceeding to the next stage.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateWeekSchema(weekObj, isBoss, expectedOptions) {
  var errors = [];
  var warnings = [];
  expectedOptions = expectedOptions || {};
  if (!weekObj) { return { valid: false, errors: ['Week object is null'] }; }
  if (!weekObj.title) errors.push('Missing week title');

  // Epigraph — renderer reads .text and .attribution for every week page
  if (!weekObj.epigraph || typeof weekObj.epigraph !== 'object') {
    errors.push('Week missing epigraph');
  } else {
    if (!weekObj.epigraph.text) errors.push('Week epigraph missing text');
    if (!weekObj.epigraph.attribution) errors.push('Week epigraph missing attribution');
  }

  if (!Array.isArray(weekObj.sessions) || weekObj.sessions.length === 0) {
    errors.push('Missing or empty sessions array');
  } else {
    weekObj.sessions.forEach(function(s, si) {
      if (!s.storyPrompt) errors.push('Session ' + (si+1) + ' missing storyPrompt');
      if (!s.label) errors.push('Session ' + (si+1) + ' missing label');
      if (s.sessionNumber === undefined) errors.push('Session ' + (si+1) + ' missing sessionNumber');
      if (!Array.isArray(s.exercises) || s.exercises.length === 0) {
        errors.push('Session ' + (si+1) + ' missing exercises');
      }
      // ── Wave 4a optional richness ──────────────────────────────────────────
      // PRESENCE IS NOT DEMANDED, deliberately (D19). A week without micro-lines
      // or a return beat is a complete, valid, printable week; these fields buy
      // depth, and a stage validator that required them would fail a good book
      // and burn a retry to get a field the doctrine only asks for. What IS
      // checked is that a field the model DID emit has a shape the renderer can
      // print — a half-built micro-line is worse than none, because it reaches
      // the page as a condition with no payload.
      pushShapeErrors(errors, 'Session ' + (si + 1), s);
    });
  }

  pushDoorChoiceErrors(errors, weekObj.doorChoice);

  // Non-boss weeks must have weeklyComponent.extractionInstruction
  if (!isBoss) {
    var wc = weekObj.weeklyComponent || {};
    if (!wc.extractionInstruction) {
      errors.push('Non-boss week missing weeklyComponent.extractionInstruction');
    }
    if (wc.value === undefined || wc.value === null || wc.value === '') {
      errors.push('Non-boss week missing weeklyComponent.value');
    } else {
      var numericValue = Number(wc.value);
      if (isNaN(numericValue) || numericValue !== Math.floor(numericValue)) {
        errors.push('Non-boss week weeklyComponent.value "' + wc.value + '" is not an integer (required for A1Z26 decode)');
      } else if (numericValue < 1 || numericValue > 26) {
        errors.push('Non-boss week weeklyComponent.value ' + numericValue + ' out of A1Z26 range (1–26)');
      }
    }
  }

  // Non-boss weeks must have fieldOps
  if (!isBoss && !weekObj.fieldOps) {
    errors.push('Non-boss week missing fieldOps');
  }
  if (!isBoss && weekObj.fieldOps) {
    var fo = weekObj.fieldOps;

    if (!fo.cipher) errors.push('Non-boss week missing fieldOps.cipher');
    if (!fo.mapState) errors.push('Non-boss week missing fieldOps.mapState');

    // Oracle validation — LLMs use both "oracleTable" and "oracle" keys
    var ot = fo.oracleTable || fo.oracle;
    if (ot) {
      if (!ot.title) errors.push('oracleTable.title missing');
      if (!ot.instruction) errors.push('oracleTable.instruction missing');
      if (!Array.isArray(ot.entries)) {
        errors.push('oracleTable.entries must be an array');
      } else {
        if (ot.entries.length !== 10) {
          errors.push('Oracle table must have exactly 10 entries (d100 bands), got ' + ot.entries.length);
        }
        ot.entries.forEach(function(e, i) {
          if (e && !e.text) {
            if (e.result) {
              errors.push('Oracle entry ' + i + ' uses "result" instead of "text"');
            } else if (e.description) {
              errors.push('Oracle entry ' + i + ' uses "description" instead of "text"');
            } else if (e.label) {
              errors.push('Oracle entry ' + i + ' uses "label" instead of "text"');
            } else {
              errors.push('Oracle entry ' + i + ' missing text field');
            }
          }
        });
      }
    } else {
      errors.push('Non-boss week missing fieldOps.oracleTable');
    }

    // Cipher validation
    if (fo.cipher) {
      var REQUIRED_CIPHER_FIELDS = ['type', 'title', 'body', 'extractionInstruction', 'characterDerivationProof', 'noticeabilityDesign'];
      REQUIRED_CIPHER_FIELDS.forEach(function (field) {
        if (fo.cipher[field] === undefined || fo.cipher[field] === null || fo.cipher[field] === '') {
          errors.push('cipher.' + field + ' missing');
        }
      });
      if (fo.cipher.body && typeof fo.cipher.body === 'string') {
        errors.push('cipher.body must be an object (with displayText, key, workSpace), not a string');
      }
    }

    // Map validation
    if (fo.mapState) {
      if (!fo.mapState.mapType) {
        errors.push('mapState missing mapType field');
      } else if (VALID_MAP_TYPES.indexOf(fo.mapState.mapType) === -1) {
        errors.push('Unknown mapType: "' + fo.mapState.mapType + '". Must be one of: ' + VALID_MAP_TYPES.join(', '));
      }
      if (fo.mapState.mapType === 'grid' && fo.mapState.gridDimensions) {
        var gd = fo.mapState.gridDimensions;
        if (gd.columns > 12 || gd.rows > 8) {
          errors.push('Grid dimensions exceed max (12x8): got ' + gd.columns + 'x' + gd.rows);
        }
      }
      if (fo.mapState.mapType === 'point-to-point') {
        var ptpNodes = fo.mapState.nodes || [];
        var ptpEdges = fo.mapState.edges || [];
        if (ptpNodes.length > 12) {
          errors.push('PTP map: ' + ptpNodes.length + ' nodes exceeds max 12');
        }
        if (ptpEdges.length > 10) {
          errors.push('PTP map: ' + ptpEdges.length + ' edges exceeds max 10');
        }
        ptpNodes.forEach(function(node, ni) {
          var nx = Number(node.x);
          var ny = Number(node.y);
          if (!Number.isInteger(nx) || nx < 1 || nx > 12) {
            errors.push('PTP node[' + ni + '] x=' + node.x + ' out of range 1-12');
          }
          if (!Number.isInteger(ny) || ny < 1 || ny > 12) {
            errors.push('PTP node[' + ni + '] y=' + node.y + ' out of range 1-12');
          }
        });
        // Warn on long node labels (legibility at print size)
        ptpNodes.forEach(function(node, ni) {
          var label = String(node.label || '').trim();
          if (label.length > 24) {
            warnings.push('PTP node "' + label.substring(0, 20) + '...": label is ' + label.length + ' chars (recommend \u226420 for print legibility)');
          }
        });
      }
      // Wave 3 geometries. Numbers come from SPATIAL_GUARDRAILS rather than
      // literals \u2014 the PTP/grid checks above predate the import and are left
      // alone rather than refactored under an unrelated change.
      if (fo.mapState.mapType === 'concentric') {
        var ringGuard = SPATIAL_GUARDRAILS.concentric;
        var rings = fo.mapState.rings || [];
        if (rings.length < ringGuard.minRings || rings.length > ringGuard.maxRings) {
          errors.push('Concentric map: ' + rings.length + ' rings outside range '
            + ringGuard.minRings + '-' + ringGuard.maxRings);
        }
        var currentRing = fo.mapState.currentRing;
        if (currentRing !== undefined && currentRing !== null
          && (!Number.isInteger(Number(currentRing)) || Number(currentRing) < 1 || Number(currentRing) > rings.length)) {
          errors.push('Concentric map: currentRing=' + currentRing + ' does not name a ring (1-' + rings.length + ')');
        }
        rings.forEach(function (ring, ri) {
          var label = String((ring || {}).label || '').trim();
          if (label.length > ringGuard.ringLabelMaxChars) {
            warnings.push('Concentric ring[' + ri + '] label is ' + label.length
              + ' chars (recommend \u2264' + ringGuard.ringLabelMaxChars + ' for print legibility)');
          }
        });
      }
      if (fo.mapState.mapType === 'maze') {
        var mazeGuard = SPATIAL_GUARDRAILS.maze;
        var mazeNodes = fo.mapState.nodes || [];
        var passages = fo.mapState.passages || [];
        if (mazeNodes.length > mazeGuard.maxNodes) {
          errors.push('Maze map: ' + mazeNodes.length + ' nodes exceeds max ' + mazeGuard.maxNodes);
        }
        if (passages.length > mazeGuard.maxPassages) {
          errors.push('Maze map: ' + passages.length + ' passages exceeds max ' + mazeGuard.maxPassages);
        }
        var mazeIds = {};
        mazeNodes.forEach(function (node) { mazeIds[node.id] = true; });
        passages.forEach(function (passage, pi) {
          // A passage to nowhere draws nothing at all \u2014 the renderer skips it,
          // so the corridor the fiction promised is silently absent.
          if (!mazeIds[passage.from]) {
            errors.push('Maze passage[' + pi + '] from="' + passage.from + '" names no node');
          }
          if (!mazeIds[passage.to]) {
            errors.push('Maze passage[' + pi + '] to="' + passage.to + '" names no node');
          }
        });
      }
    }

    if (expectedOptions.previousWeek && expectedOptions.previousWeek.fieldOps && expectedOptions.previousWeek.fieldOps.mapState) {
      var currentMap = fo.mapState || {};
      var previousMap = (expectedOptions.previousWeek.fieldOps || {}).mapState || {};
      if (hasComparableMapState(currentMap) && hasComparableMapState(previousMap)) {
        var currentFingerprint = buildMapEvolutionFingerprint(currentMap);
        var previousFingerprint = buildMapEvolutionFingerprint(previousMap);
        if (currentFingerprint && previousFingerprint && currentFingerprint === previousFingerprint) {
          errors.push('Week ' + (expectedOptions.currentWeekNumber || weekObj.weekNumber || '?') + ' map tiles identical to previous week — no visible evolution');
        }
      }
    }

    // Companion component validation
    if (Array.isArray(fo.companionComponents)) {
      fo.companionComponents.forEach(function(cc) {
        if (!cc) return;
        if (cc.type && VALID_COMPANION_TYPES.indexOf(cc.type) === -1) {
          errors.push('Unknown companion component type: "' + cc.type + '"');
        }
        if (!cc.label) errors.push('Companion component missing label');
        if (!cc.body) errors.push('Companion component missing body');
      });
    }
  }

  // Boss week validation
  if (isBoss) {
    var boss = weekObj.bossEncounter;
    if (!boss) {
      errors.push('Boss week missing bossEncounter');
    } else {
      if (!boss.title) errors.push('Boss encounter missing title');
      if (!boss.narrative) errors.push('Boss encounter missing narrative');
      if (!boss.mechanismDescription) errors.push('Boss encounter missing mechanismDescription');
      if (!boss.convergenceProof) errors.push('Boss encounter missing convergenceProof');
      if (!boss.passwordRevealInstruction) errors.push('Boss encounter missing passwordRevealInstruction');

      if (!boss.decodingKey) {
        errors.push('Boss encounter missing decodingKey');
      } else {
        if (!boss.decodingKey.referenceTable) {
          errors.push('Boss decodingKey missing referenceTable');
        } else if (!isStandardAlphaTable(boss.decodingKey.referenceTable)) {
          errors.push('Boss decodingKey.referenceTable must be a standard A1Z26 string (1=A ... 26=Z)');
        }
        if (!boss.decodingKey.instruction) {
          errors.push('Boss decodingKey missing instruction');
        }
      }

      // componentInputs is deterministic derived data — the post-processing
      // enforcement (enforceDeterministicFields) overwrites it with the correct
      // collected weeklyComponent values. Don't validate what we're going to
      // overwrite anyway; it just burns retries for nothing.
    }

    var approvedBossFragmentIds = Array.isArray(expectedOptions.approvedFragmentIds)
      ? expectedOptions.approvedFragmentIds.map(function (id) { return String(id || ''); }).filter(Boolean)
      : [];
    if (approvedBossFragmentIds.length > 0) {
      var sessionRefsById = {};
      (weekObj.sessions || []).forEach(function (session) {
        if (!session || !session.fragmentRef) return;
        sessionRefsById[normalizeId(session.fragmentRef)] = true;
      });
      if (approvedBossFragmentIds.length > (weekObj.sessions || []).length) {
        errors.push('Boss week has ' + approvedBossFragmentIds.length + ' planned fragmentIds but only ' + (weekObj.sessions || []).length + ' sessions to reference them');
      }
      approvedBossFragmentIds.forEach(function (fragmentId) {
        if (!sessionRefsById[normalizeId(fragmentId)]) {
          errors.push('Boss week sessions do not reference planned fragment "' + fragmentId + '"');
        }
      });
    }
  }

  // Overflow consistency: overflow must be true when sessions > 3
  if (Array.isArray(weekObj.sessions) && weekObj.sessions.length > 3 && !weekObj.overflow) {
    errors.push('Week has ' + weekObj.sessions.length + ' sessions but overflow is not true');
  }
  if (weekObj.overflow && Array.isArray(weekObj.sessions) && weekObj.sessions.length <= 3) {
    errors.push('Week has overflow=true but only ' + weekObj.sessions.length + ' sessions');
  }
  if (Array.isArray(weekObj.sessions) && weekObj.sessions.length > 3) {
    var overflowDocument = weekObj.overflowDocument;
    if (!overflowDocument || typeof overflowDocument !== 'object') {
      errors.push('Overflow week missing overflowDocument');
    } else {
      if (!overflowDocument.id) errors.push('overflowDocument.id missing');
      if (!overflowDocument.documentType) errors.push('overflowDocument.documentType missing');
      if (!overflowDocument.content && !overflowDocument.body) errors.push('overflowDocument missing content');
      if (!overflowDocument.designSpec || typeof overflowDocument.designSpec !== 'object') {
        warnings.push('overflowDocument missing designSpec (renderer falls back to neutral defaults)');
      }
    }
  }

  // Gameplay clocks — renderer builds clock widgets from these fields
  if (Array.isArray(weekObj.gameplayClocks) && weekObj.gameplayClocks.length > 0) {
    weekObj.gameplayClocks.forEach(function (clock, ci) {
      if (!clock) return;
      var label = 'gameplayClocks[' + ci + ']';
      if (!clock.clockName) errors.push(label + ' missing clockName');
      if (clock.segments === undefined || typeof clock.segments !== 'number') {
        errors.push(label + ' missing or non-numeric segments');
      }
      if (!clock.clockType) {
        errors.push(label + ' missing clockType');
      } else if (VALID_CLOCK_TYPES.indexOf(clock.clockType) === -1) {
        errors.push(label + ' unknown clockType: "' + clock.clockType + '"');
      }
      if (!clock.consequenceOnFull) errors.push(label + ' missing consequenceOnFull');
    });
  }

  // Interlude validation — renderer reads title and body when interlude exists
  if (weekObj.interlude && typeof weekObj.interlude === 'object') {
    if (!weekObj.interlude.title) errors.push('Interlude missing title');
    if (!weekObj.interlude.body) errors.push('Interlude missing body');
  }

  if (warnings.length > 0) {
    console.warn('[LiftRPG] Week advisory:', warnings.join('; '));
  }
  return { valid: errors.length === 0, errors: errors, warnings: warnings };
}

/**
 * Shell structural validation. Runs after shell stage (Stage 3).
 * Returns { valid: boolean, errors: string[] }
 */
export function validateShellSchema(shell, expectedOptions) {
  var errors = [];
  var warnings = [];
  if (!shell) { return { valid: false, errors: ['Shell is null'] }; }
  normalizeShellShape(shell);
  // Hard failures: match pre-restructure checks exactly
  if (!shell.meta) errors.push('Missing meta');
  if (!shell.cover) errors.push('Missing cover');
  if (!shell.rulesSpread) {
    errors.push('Missing rulesSpread');
  } else {
    if (!shell.rulesSpread.leftPage) errors.push('rulesSpread missing leftPage');
    if (!shell.rulesSpread.rightPage) errors.push('rulesSpread missing rightPage');
    if (shell.rulesSpread.leftPage && !Array.isArray(shell.rulesSpread.leftPage.sections)) {
      errors.push('rulesSpread.leftPage missing sections array');
    }
    if (shell.rulesSpread.leftPage && Array.isArray(shell.rulesSpread.leftPage.sections)) {
      if (shell.rulesSpread.leftPage.sections.length < 4) {
        errors.push('rulesSpread.leftPage.sections has fewer than 4 entries (' +
          shell.rulesSpread.leftPage.sections.length + ')');
      }
      shell.rulesSpread.leftPage.sections.forEach(function(s, i) {
        if (!s.heading) errors.push('leftPage.sections[' + i + '] missing heading');
        if (!s.body && !s.text) errors.push('leftPage.sections[' + i + '] missing body');
      });
    }
  }
  if (shell.meta) {
    if (ACCEPTED_SCHEMA_VERSIONS.indexOf(String(shell.meta.schemaVersion)) === -1) {
      errors.push('meta.schemaVersion must be one of ' + ACCEPTED_SCHEMA_VERSIONS.join(', ') + ', got: ' + shell.meta.schemaVersion);
    }
    if (!('passwordEncryptedEnding' in shell.meta)) {
      errors.push('meta.passwordEncryptedEnding must exist (can be empty string)');
    }
    // weekCount, totalSessions, passwordLength are injected by JS post-generation
    // (enforceBookletDerivedFields in assembly.js). Not validated against LLM output.
  }
  if (shell.theme && shell.theme.visualArchetype) {
    if (VALID_ARCHETYPES.indexOf(shell.theme.visualArchetype) === -1) {
      errors.push('Unknown visualArchetype: "' + shell.theme.visualArchetype + '"');
    }
  }
  // ── Theme palette validation (renderer reads all 6 for 27 CSS vars) ──────
  if (shell.theme) {
    if (!shell.theme.palette || typeof shell.theme.palette !== 'object') {
      errors.push('theme.palette missing — renderer cannot set CSS variables');
    } else {
      var HEX_RE = /^#[0-9a-fA-F]{6}$/;
      ['ink', 'paper', 'accent', 'muted', 'rule', 'fog'].forEach(function (key) {
        var val = shell.theme.palette[key];
        if (!val) {
          errors.push('theme.palette.' + key + ' missing');
        } else if (!HEX_RE.test(val)) {
          errors.push('theme.palette.' + key + ' is not valid hex: "' + val + '"');
        }
      });
    }
  }

  // ── Meta sub-fields consumed by renderer ──────────────────────────────────
  if (shell.meta) {
    if (!shell.meta.blockTitle) errors.push('meta.blockTitle missing');
    if (!shell.meta.worldContract) warnings.push('Shell → meta: missing worldContract');
    if (!shell.meta.artifactIdentity) warnings.push('Shell → meta: missing artifactIdentity');

    // narrativeVoice — render.js reads .person and .tense
    var nv = shell.meta.narrativeVoice;
    if (!nv || typeof nv !== 'object') {
      errors.push('meta.narrativeVoice missing');
    } else {
      if (!nv.person) errors.push('meta.narrativeVoice.person missing');
      if (!nv.tense) errors.push('meta.narrativeVoice.tense missing');
    }

    // structuralShape — cover page reads .resolution
    var ss = shell.meta.structuralShape;
    if (!ss || typeof ss !== 'object') {
      errors.push('meta.structuralShape missing or not an object');
    } else {
      if (!ss.resolution) errors.push('meta.structuralShape.resolution missing');
    }
  }

  // ── Cover required fields (renderer reads all three) ──────────────────────
  if (shell.cover) {
    if (!shell.cover.title) errors.push('cover.title missing');
    if (!shell.cover.designation) errors.push('cover.designation missing');
    if (!shell.cover.tagline) errors.push('cover.tagline missing');
    if (!Array.isArray(shell.cover.colophonLines) || shell.cover.colophonLines.length < 3) {
      errors.push('cover.colophonLines must be an array with at least 3 items');
    }
  }

  // ── Rules spread right page instruction ───────────────────────────────────
  if (shell.rulesSpread && shell.rulesSpread.rightPage) {
    if (!shell.rulesSpread.rightPage.instruction) {
      errors.push('rulesSpread.rightPage.instruction missing');
    }
  }

  if (!shell.theme) warnings.push('Shell → theme: missing entirely');
  if (warnings.length > 0) {
    console.warn('[LiftRPG] Shell advisory:', warnings.join('; '));
  }
  return { valid: errors.length === 0, errors: errors };
}

// Validates the assembled booklet. Returns array of human-readable errors.
// Fragment ID matching is soft: "F.01" matches "F-01", "f_01", etc.

// ── Output budgets (GAP-1, DOCTRINE-LEDGER) ─────────────────────────────────
// The prompt demands these caps (INST_OUTPUT_BUDGETS); this measures them
// post-generation. Warnings per D19 — gassed readers skim, then skip, but an
// overlong prompt is degraded quality, not an invalid booklet. The critic
// loop feeds these to the critic as machine findings (must become failures).
//
// Wave 4a adds the point-of-use surfaces, and they are budgeted HARDER than
// prose is. Every string below prints beside a blank in a ninety-second rest
// window, where the reader's capacity is degraded, brief, and single-threaded
// (point-of-use §5.2). A cue that needs three lines has stopped being a cue and
// become the rule again, which is the split the tiers exist to make. Same D19
// severity as the prose budgets — the numbers are ship-as-warnings until
// playtest, per the research's own §7.2.
var OUTPUT_BUDGETS = {
  storyPrompt: 220, fragmentBody: 600, interludeBody: 240, endingBody: 1500,
  microLineCondition: 90, microLineCue: 120, citedAs: 90,
  returnBeatClosing: 140, returnBeatOpening: 140,
  doorOptionLean: 90, sealKeyHint: 120, sealUnlockCondition: 140
};

export function collectBudgetBreaches(booklet) {
  var breaches = [];
  function over(text, cap) {
    var len = String(text || '').length;
    return len > cap ? len : 0;
  }
  ((booklet && booklet.weeks) || []).forEach(function (week, wi) {
    ((week && week.sessions) || []).forEach(function (session, si) {
      var len = over(session && session.storyPrompt, OUTPUT_BUDGETS.storyPrompt);
      if (len) breaches.push({ unitType: 'week', unitRef: week.weekNumber || (wi + 1),
        message: 'Week ' + (week.weekNumber || (wi + 1)) + ' session ' + (si + 1)
          + ' storyPrompt is ' + len + ' chars (budget ' + OUTPUT_BUDGETS.storyPrompt + ')' });
    });
    var interlude = week && week.interlude;
    var ilen = over(interlude && interlude.body, OUTPUT_BUDGETS.interludeBody);
    if (ilen) breaches.push({ unitType: 'week', unitRef: week.weekNumber || (wi + 1),
      message: 'Week ' + (week.weekNumber || (wi + 1)) + ' interlude body is ' + ilen
        + ' chars (budget ' + OUTPUT_BUDGETS.interludeBody + ')' });

    // ── Wave 4a point-of-use surfaces ────────────────────────────────────────
    var wn = week.weekNumber || (wi + 1);
    function weekBreach(msg) { breaches.push({ unitType: 'week', unitRef: wn, message: msg }); }
    ((week && week.sessions) || []).forEach(function (session, si) {
      var where = 'Week ' + wn + ' session ' + (si + 1);
      ((session && session.microLines) || []).forEach(function (line, mi) {
        var c = over(line && line.condition, OUTPUT_BUDGETS.microLineCondition);
        if (c) weekBreach(where + ' microLine ' + (mi + 1) + ' condition is ' + c
          + ' chars (budget ' + OUTPUT_BUDGETS.microLineCondition + ')');
        var q = over(line && line.cue, OUTPUT_BUDGETS.microLineCue);
        if (q) weekBreach(where + ' microLine ' + (mi + 1) + ' cue is ' + q
          + ' chars (budget ' + OUTPUT_BUDGETS.microLineCue + ')');
        var a = over(line && line.citeRef && line.citeRef.citedAs, OUTPUT_BUDGETS.citedAs);
        if (a) weekBreach(where + ' microLine ' + (mi + 1) + ' citeRef.citedAs is ' + a
          + ' chars (budget ' + OUTPUT_BUDGETS.citedAs + ')');
      });
      var rb = session && session.returnBeat;
      var rc = over(rb && rb.closingLine, OUTPUT_BUDGETS.returnBeatClosing);
      if (rc) weekBreach(where + ' returnBeat.closingLine is ' + rc
        + ' chars (budget ' + OUTPUT_BUDGETS.returnBeatClosing + ')');
      var ro = over(rb && rb.openingEcho, OUTPUT_BUDGETS.returnBeatOpening);
      if (ro) weekBreach(where + ' returnBeat.openingEcho is ' + ro
        + ' chars (budget ' + OUTPUT_BUDGETS.returnBeatOpening + ')');
    });
    var door = week && week.doorChoice;
    ['optionA', 'optionB'].forEach(function (side) {
      var lean = over(door && door[side] && door[side].lean, OUTPUT_BUDGETS.doorOptionLean);
      if (lean) weekBreach('Week ' + wn + ' doorChoice.' + side + '.lean is ' + lean
        + ' chars (budget ' + OUTPUT_BUDGETS.doorOptionLean + ')');
    });
  });
  ((booklet && booklet.fragments) || []).forEach(function (frag) {
    var len = over(frag && (frag.content || frag.body), OUTPUT_BUDGETS.fragmentBody);
    if (len) breaches.push({ unitType: 'fragment', unitRef: frag.id,
      message: 'Fragment ' + (frag.id || '?') + ' body is ' + len
        + ' chars (budget ' + OUTPUT_BUDGETS.fragmentBody + ')' });
    var cited = over(frag && frag.citeRef && frag.citeRef.citedAs, OUTPUT_BUDGETS.citedAs);
    if (cited) breaches.push({ unitType: 'fragment', unitRef: frag.id,
      message: 'Fragment ' + (frag.id || '?') + ' citeRef.citedAs is ' + cited
        + ' chars (budget ' + OUTPUT_BUDGETS.citedAs + ')' });
    var hint = over(frag && frag.seal && frag.seal.keyHint, OUTPUT_BUDGETS.sealKeyHint);
    if (hint) breaches.push({ unitType: 'fragment', unitRef: frag.id,
      message: 'Fragment ' + (frag.id || '?') + ' seal.keyHint is ' + hint
        + ' chars (budget ' + OUTPUT_BUDGETS.sealKeyHint + ')' });
    var unlock = over(frag && frag.seal && frag.seal.unlockCondition, OUTPUT_BUDGETS.sealUnlockCondition);
    if (unlock) breaches.push({ unitType: 'fragment', unitRef: frag.id,
      message: 'Fragment ' + (frag.id || '?') + ' seal.unlockCondition is ' + unlock
        + ' chars (budget ' + OUTPUT_BUDGETS.sealUnlockCondition + ')' });
  });
  ((booklet && booklet.endings) || []).forEach(function (ending, ei) {
    var body = ending && ending.content && ending.content.body;
    var len = over(body, OUTPUT_BUDGETS.endingBody);
    if (len) breaches.push({ unitType: 'ending', unitRef: (ending && (ending.variant || ending.id)) || ei,
      message: 'Ending "' + ((ending && ending.variant) || ei) + '" body is ' + len
        + ' chars (renderer splits awkwardly past ' + OUTPUT_BUDGETS.endingBody + ')' });
  });
  return breaches;
}

// ── Core Noun Roster discipline (GAP-2, DOCTRINE-LEDGER) ────────────────────
// INST_WORLD_CONTRACT demands a Core Noun Roster of 8-12 specific nouns inside
// the meta.worldContract string, and that every cipher, map node, fragment,
// boss mechanism, and oracle entry reference at least one roster noun. This
// measures it post-generation, heuristically: roster nouns are the maximal
// capitalized runs in the worldContract; a surface "references" a noun if it
// contains the full noun or a distinctive component word. Warnings per D19.

var ROSTER_CONNECTORS = { of: 1, the: 1, and: 1, '&': 1 };
var ROSTER_STOPWORDS = {
  The: 1, A: 1, An: 1, On: 1, In: 1, Of: 1, And: 1, Or: 1, But: 1, It: 1,
  This: 1, That: 1, Core: 1, Noun: 1, Roster: 1, Featuring: 1, With: 1,
  When: 1, Where: 1, After: 1, Before: 1, Every: 1, Their: 1, They: 1,
  She: 1, He: 1, Her: 1, His: 1, You: 1, Your: 1, Its: 1, If: 1, As: 1,
  At: 1, To: 1, By: 1, For: 1, From: 1, Between: 1, Against: 1, Write: 1
};
// Generic component words that must not count as a match on their own —
// only as part of the full noun phrase.
var ROSTER_GENERIC_COMPONENTS = {
  department: 1, bureau: 1, division: 1, office: 1, agency: 1, captain: 1,
  doctor: 1, sergeant: 1, officer: 1, records: 1, archive: 1, letter: 1,
  agreement: 1, project: 1, protocol: 1, station: 1, sector: 1, wing: 1
};

var ROSTER_HONORIFICS = { Dr: 1, Mr: 1, Mrs: 1, Ms: 1, St: 1, Capt: 1, Sgt: 1, Lt: 1 };

export function extractRosterNouns(worldContract) {
  var words = String(worldContract || '').split(/\s+/).filter(Boolean);
  var nouns = [];
  var run = [];
  function flushRun() {
    while (run.length && ROSTER_CONNECTORS[run[0].toLowerCase()]) run.shift();
    while (run.length && ROSTER_CONNECTORS[run[run.length - 1].toLowerCase()]) run.pop();
    var filtered = run.filter(function (w) { return !ROSTER_STOPWORDS[w]; });
    if (filtered.length > 0) {
      var phrase = run.join(' ');
      if (filtered.length > 1 || filtered[0].length >= 3) nouns.push(phrase);
    }
    run = [];
  }
  words.forEach(function (raw) {
    var word = raw.replace(/^["'‘“(\[]+/g, '');
    // List punctuation ends a noun phrase — but a period after an honorific
    // ("Dr.") is part of the name, not a sentence boundary.
    var breaksAfter = /[,;:.!?)\]]$/.test(word)
      && !ROSTER_HONORIFICS[word.replace(/[^\p{L}]/gu, '')];
    word = word.replace(/["'’”,;:.!?)\]]+$/g, '');
    if (!word || /^\d+$/.test(word)) { flushRun(); return; } // pure numbers (roster indices, years) break runs
    var isCap = /^[\p{Lu}\p{N}]/u.test(word);
    var isConnector = ROSTER_CONNECTORS[word.toLowerCase()];
    if (isCap || (isConnector && run.length > 0)) run.push(word);
    else flushRun();
    if (breaksAfter) flushRun();
  });
  flushRun();
  // Dedupe, drop runs that are stopwords-only artifacts
  var seen = {};
  return nouns.filter(function (n) {
    var key = n.toLowerCase();
    if (seen[key]) return false;
    seen[key] = true;
    var parts = n.split(/\s+/).filter(function (w) { return !ROSTER_STOPWORDS[w]; });
    return parts.length > 0;
  });
}

// Per-noun needle sets: the full phrase plus each distinctive component word
// (possessives stripped, generic words excluded) — so prose saying just "Yua"
// still counts as referencing "Tamashiro Yua".
function buildRosterNeedles(roster) {
  return roster.map(function (noun) {
    var needles = [noun.toLowerCase()];
    noun.split(/\s+/).forEach(function (part) {
      var p = part.toLowerCase().replace(/[''’]s$/u, '').replace(/[^\p{L}\p{N}-]/gu, '');
      if (p.length >= 4 && !ROSTER_GENERIC_COMPONENTS[p] && !ROSTER_STOPWORDS[part]) {
        needles.push(p);
      }
    });
    return { noun: noun, needles: needles };
  });
}

function nounMatches(entry, hay) {
  for (var i = 0; i < entry.needles.length; i++) {
    if (hay.indexOf(entry.needles[i]) !== -1) return true;
  }
  return false;
}

export function collectNounRosterFindings(booklet) {
  var findings = [];
  var wc = booklet && booklet.meta && booklet.meta.worldContract;
  if (!wc || typeof wc !== 'string') return findings; // absence is warned elsewhere
  var roster = extractRosterNouns(wc);
  if (roster.length < 3) {
    findings.push('worldContract defines no discernible Core Noun Roster ('
      + roster.length + ' specific noun(s) found; doctrine demands 8-12 — add the roster to meta.worldContract)');
    return findings;
  }
  var rosterNeedles = buildRosterNeedles(roster);
  var referencedNouns = {};
  // references() answers "does this surface cite any roster noun" and marks
  // which nouns it cites (for the dead-noun sweep) in the same pass.
  function references(text) {
    var hay = String(text || '').toLowerCase();
    if (!hay) return false;
    var hit = false;
    rosterNeedles.forEach(function (entry) {
      if (nounMatches(entry, hay)) {
        referencedNouns[entry.noun] = true;
        hit = true;
      }
    });
    return hit;
  }

  ((booklet && booklet.weeks) || []).forEach(function (week, wi) {
    var label = 'Week ' + (week.weekNumber || (wi + 1));
    var fo = week.fieldOps || {};
    var cipher = fo.cipher;
    if (cipher) {
      var cipherText = [cipher.title, (cipher.body || {}).displayText, cipher.extractionInstruction].join('\n');
      if (!references(cipherText)) {
        findings.push(label + ' cipher references no Core Noun Roster noun');
      }
    }
    var oracle = fo.oracleTable;
    if (oracle && Array.isArray(oracle.entries) && oracle.entries.length) {
      var missing = 0;
      oracle.entries.forEach(function (entry) {
        var t = entry && entry.text;
        if (!references(t)) missing++;
      });
      if (missing > 0) {
        findings.push(label + ' oracle: ' + missing + ' of ' + oracle.entries.length
          + ' entries reference no Core Noun Roster noun');
      }
    }
    var nodes = ((fo.mapState || {}).nodes) || [];
    if (nodes.length) {
      var unanchored = 0;
      nodes.forEach(function (node) {
        var t = node && node.label;
        if (!references(t)) unanchored++;
      });
      if (unanchored === nodes.length) {
        findings.push(label + ' map: no node label references a Core Noun Roster noun');
      }
    }
    var boss = week.bossEncounter;
    if (boss) {
      var bossText = [boss.narrative, boss.mechanismDescription, boss.convergenceProof].join('\n');
      if (!references(bossText)) {
        findings.push(label + ' boss mechanism references no Core Noun Roster noun');
      }
    }
  });

  ((booklet && booklet.fragments) || []).forEach(function (frag) {
    var fragText = [frag && frag.title, frag && (frag.content || frag.body)].join('\n');
    if (!references(fragText)) {
      findings.push('Fragment ' + ((frag && frag.id) || '?') + ' references no Core Noun Roster noun');
    }
  });

  var dead = roster.filter(function (noun) { return !referencedNouns[noun]; });
  if (dead.length > 0 && dead.length >= Math.ceil(roster.length / 2)) {
    findings.push('Core Noun Roster nouns never referenced on any checked surface: ' + dead.join(', '));
  }
  return findings;
}

// ── Growing-stat discipline (GAP-6 Landing 1, DOCTRINE-LEDGER) ──────────────
// The percentile-stat companion is the growing-stat d100: an AUTHORED per-week
// value the player rolls under on the existing oracle die. Two laws bind it —
// the display floor (values never regress) and the d100 range (a roll-under
// target must leave room to fail). Warnings per D19: a flat or backsliding stat
// is degraded design, not an unrenderable booklet. The schema enforces
// presence and range per item; monotonicity and campaign-shape live here.

function collectPercentileStats(booklet) {
  var found = [];
  ((booklet && booklet.weeks) || []).forEach(function (week, wi) {
    var label = 'Week ' + ((week && week.weekNumber) || (wi + 1));
    var pools = [((week && week.fieldOps) || {}).companionComponents];
    var interlude = week && week.interlude;
    if (interlude && interlude.payload && typeof interlude.payload === 'object') {
      pools.push(interlude.payload.companionComponents);
    }
    pools.forEach(function (pool) {
      (Array.isArray(pool) ? pool : []).forEach(function (component) {
        if (component && component.type === 'percentile-stat') {
          found.push({ label: label, component: component });
        }
      });
    });
  });
  return found;
}

export function collectPercentileStatFindings(booklet) {
  var findings = [];
  var stats = collectPercentileStats(booklet);
  if (!stats.length) return findings;

  var weekCount = ((booklet && booklet.weeks) || []).length;

  if (stats.length > 1) {
    findings.push('percentile-stat: ' + stats.length + ' growing-stat components found ('
      + stats.map(function (s) { return s.label; }).join(', ')
      + ') — doctrine is ONE per booklet, a campaign-wide sheet rather than a per-week surface');
  }

  stats.forEach(function (entry) {
    var component = entry.component;
    var where = entry.label + ' percentile-stat';
    var statName = String((component && component.statName) || '').trim();

    if (!statName) {
      findings.push(where + ' is missing statName — the stat must be named from the Core Noun Roster');
    }

    var values = component && component.weeklyValues;
    if (!Array.isArray(values) || values.length === 0) {
      findings.push(where + ' ("' + (statName || '?') + '") has no weeklyValues — authored per-week values are required');
      return;
    }

    var offRange = values.filter(function (v) {
      return !Number.isInteger(v) || v < PERCENTILE_STAT.minValue || v > PERCENTILE_STAT.maxValue;
    });
    if (offRange.length) {
      findings.push(where + ' ("' + (statName || '?') + '") has ' + offRange.length
        + ' weeklyValues outside ' + PERCENTILE_STAT.minValue + '-' + PERCENTILE_STAT.maxValue
        + ' (got: ' + offRange.join(', ') + ') — a d100 roll-under target must leave room to fail');
    }

    var regressions = [];
    for (var i = 1; i < values.length; i++) {
      if (Number(values[i]) <= Number(values[i - 1])) {
        regressions.push('index ' + i + ' (' + values[i - 1] + ' → ' + values[i] + ')');
      }
    }
    if (regressions.length) {
      findings.push(where + ' ("' + (statName || '?') + '") weeklyValues do not rise monotonically at '
        + regressions.join(', ') + ' — display-floor doctrine: the printed stat never regresses');
    }

    if (weekCount && values.length !== weekCount) {
      findings.push(where + ' ("' + (statName || '?') + '") has ' + values.length
        + ' weeklyValues but the campaign runs ' + weekCount
        + ' weeks — the player needs one value to circle per week');
    }
  });

  return findings;
}

// ── Mark economy demand (Session 1 / D89) ───────────────────────────────────
// The Mark surface is the fusion seam — the one near-universal this project can
// defend demanding — so the assembled booklet must carry it. THE DEMAND LIVES
// HERE AND ONLY HERE, never in validateWeekSchema: the stub bench derives stage
// payloads from a corpus fixture and --forge-check never runs assembly, and the
// guided-build harness replays hand-authored week payloads. A week-stage demand
// would break both on day one, and neither failure would mean anything about
// the feature.
//
// Severity follows D19. Missing/undersized strips and unreachable thresholds
// are ERRORS: the booklet promises a game it cannot print. Label taste and
// dangling sink refs are WARNINGS — degraded design, still renderable.
//
// The hand-authored corpus predates all of this. Absence of meta.economy is a
// single WARNING (the "no markStrip economy" line, also listed in
// scripts/validate.mjs RULE_DEMOTIONS), never a cascade of per-session errors.

// Sink refs cannot use continuityRefExists(): that predicate resolves fragment
// and overflow ids ONLY, and its ledger is built from GENERATION-STAGE chunk
// outputs (shell / weekChunkOutputs / campaignPlan), not an assembled booklet.
// A sink may name a clock, a companion, a map node, or an oracle. So this is a
// deliberate pragmatic existence scan over the assembled document — every
// surface the booklet actually prints, indexed two ways: normalizeId for
// id-shaped refs and slug words for names.
function buildSinkRefIndex(booklet) {
  var ids = {};
  var names = {};
  function addId(value) {
    var key = normalizeId(value);
    if (key) ids[key] = true;
  }
  function addName(value) {
    var key = toSlugWords(value);
    if (key) names[key] = true;
  }
  function addBoth(value) { addId(value); addName(value); }

  (((booklet || {}).fragments) || []).forEach(function (fragment) {
    if (!fragment) return;
    addId(fragment.id);
    addName(fragment.title);
  });

  function indexCompanions(pool) {
    (Array.isArray(pool) ? pool : []).forEach(function (component) {
      if (!component) return;
      addName(component.title);
      addName(component.label);
      addName(component.statName);
      addName(component.type);
    });
  }

  (((booklet || {}).weeks) || []).forEach(function (week) {
    if (!week) return;
    var fieldOps = week.fieldOps || {};
    indexCompanions(fieldOps.companionComponents);
    var interlude = week.interlude;
    if (interlude && interlude.payload && typeof interlude.payload === 'object') {
      indexCompanions(interlude.payload.companionComponents);
    }
    (week.gameplayClocks || []).forEach(function (clock) {
      if (clock) addName(clock.clockName);
    });
    if (fieldOps.oracleTable) addName(fieldOps.oracleTable.title);
    if (fieldOps.cipher) addName(fieldOps.cipher.title);
    var mapState = fieldOps.mapState || {};
    addName(mapState.title);
    addName(mapState.floorLabel);
    (mapState.nodes || []).forEach(function (node) {
      if (!node) return;
      addBoth(node.id);
      addName(node.label);
    });
    (mapState.tiles || []).forEach(function (tile) { if (tile) addName(tile.label); });
    (mapState.positions || []).forEach(function (pos) { if (pos) addName(pos.label); });
    if (week.overflowDocument) {
      addId(week.overflowDocument.id);
      addName(week.overflowDocument.title);
    }
  });

  return { ids: ids, names: names };
}

function sinkRefResolves(index, ref) {
  var raw = String(ref == null ? '' : ref).trim();
  if (!raw) return true;              // absent ref is legal — the kind alone is a sink
  if (index.ids[normalizeId(raw)]) return true;
  return !!index.names[toSlugWords(raw)];
}

// Singular/plural tolerance for the one-currency check. Deliberately crude: it
// is looking for a NOUN the panel prints, not parsing English.
function singularizeToken(word) {
  if (/(?:ses|xes|zes|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && /s$/.test(word) && !/ss$/.test(word)) return word.slice(0, -1);
  return word;
}

/**
 * Does this conversion sentence name the booklet's declared currency?
 *
 * HEURISTIC, and stated as one: full label first, then its head noun, each
 * matched with singular/plural tolerance. It exists to catch the real failure —
 * week 1 banking "Embers" while week 4 banks "Tokens", two income currencies
 * where the amended one-per-markStrip law allows one — not to grade prose.
 */
function conversionNamesCurrency(text, currencyLabel) {
  var haystack = ' ' + toSlugWords(text) + ' ';
  var words = toSlugWords(currencyLabel).split(' ').filter(Boolean);
  if (!words.length) return false;
  var candidates = [words.join(' '), words[words.length - 1]];
  return candidates.some(function (candidate) {
    var stem = singularizeToken(candidate);
    return haystack.indexOf(' ' + candidate + ' ') !== -1
      || haystack.indexOf(' ' + stem + ' ') !== -1
      || haystack.indexOf(' ' + stem + 's ') !== -1
      || haystack.indexOf(' ' + stem + 'es ') !== -1;
  });
}

function markLabelComplaint(label) {
  var text = String(label == null ? '' : label).trim();
  if (!text) return 'is empty';
  if (/\d/.test(text)) return 'contains a digit — a number on the strip invites arithmetic mid-workout';
  if (text.split(/\s+/).length > MARK_STRIP.maxLabelWords) {
    return 'runs ' + text.split(/\s+/).length + ' words (max ' + MARK_STRIP.maxLabelWords + ')';
  }
  return '';
}

/**
 * collectMarkStripFindings(booklet) -> { errors: string[], warnings: string[] }
 *
 * Both severities in one pass, because the rules interlock: the strip count
 * error and the label warning read the same targets, and the threshold error
 * reads the total the strips add up to. Consumers:
 *   - validateAssembledBooklet — errors to errors, warnings to warnings
 *   - api-generator.js critic loop — warnings only (errors never reach the
 *     critic by design; they are the validity floor a revision may not raise)
 */
export function collectMarkStripFindings(booklet) {
  var errors = [];
  var warnings = [];
  var weeks = ((booklet || {}).weeks) || [];
  var meta = (booklet || {}).meta || {};
  var economy = (meta.economy && typeof meta.economy === 'object') ? meta.economy : null;

  var strippedSessions = 0;
  var totalAttainableTicks = 0;
  weeks.forEach(function (week) {
    (((week || {}).sessions) || []).forEach(function (session) {
      var targets = ((session || {}).markStrip || {}).targets;
      if (Array.isArray(targets)) {
        strippedSessions++;
        totalAttainableTicks += targets.length;
      }
    });
  });

  // ── Dormancy: the pre-Session-1 corpus ───────────────────────────────────
  if (!economy) {
    warnings.push('meta.economy is absent — no markStrip economy declared'
      + (strippedSessions
        ? ', yet ' + strippedSessions + ' session(s) carry a markStrip (orphan strips: '
          + 'the marks bank into a currency the booklet never names)'
        : ' (pre-Session-1 booklet; the Mark surface is standard on generated booklets)'));
    return { errors: errors, warnings: warnings };
  }

  var currencyLabel = String(economy.currencyLabel || '').trim();
  var currencyId = String(economy.currencyId || '').trim();
  if (!currencyId || !currencyLabel) {
    errors.push('meta.economy is incomplete (currencyId "' + currencyId + '", currencyLabel "'
      + currencyLabel + '") — the markStrip economy needs both a machine handle and a printed label');
  }

  // ── The Mark surface: every session, 3-5 targets ─────────────────────────
  weeks.forEach(function (week, wi) {
    if (!week) return;
    var weekNumber = week.weekNumber || (wi + 1);
    (week.sessions || []).forEach(function (session, si) {
      if (!session) return;
      var where = 'Week ' + weekNumber + ' session ' + (session.sessionNumber || (si + 1));
      var targets = ((session.markStrip || {}).targets);
      if (!Array.isArray(targets) || targets.length === 0) {
        errors.push(where + ': no markStrip — meta.economy declares "' + currencyLabel
          + '" but the session prints nothing to tick');
        return;
      }
      if (targets.length < MARK_STRIP.minTargets || targets.length > MARK_STRIP.maxTargets) {
        errors.push(where + ': markStrip has ' + targets.length + ' target(s) — the Mark surface requires '
          + MARK_STRIP.minTargets + '-' + MARK_STRIP.maxTargets);
      }
      var seen = {};
      targets.forEach(function (target, ti) {
        var label = String((target || {}).label || '');
        var complaint = markLabelComplaint(label);
        if (complaint) {
          warnings.push(where + ' markStrip target ' + (ti + 1) + ' ("' + label + '") ' + complaint);
        }
        var key = toSlugWords(label);
        if (key && seen[key]) {
          warnings.push(where + ' markStrip repeats the target "' + label
            + '" — a duplicate tick is a target the player cannot lose');
        }
        if (key) seen[key] = true;
      });
    });
  });

  // ── The Resolve surface: every week, one reckoning ───────────────────────
  var sinkIndex = buildSinkRefIndex(booklet);
  weeks.forEach(function (week, wi) {
    if (!week) return;
    var weekNumber = week.weekNumber || (wi + 1);
    var reckoning = (week.reckoning && typeof week.reckoning === 'object') ? week.reckoning : null;
    if (!reckoning) {
      errors.push('Week ' + weekNumber + ': no reckoning — marks are banked but never resolved');
      return;
    }
    var conversion = String(reckoning.conversion || '').trim();
    if (!conversion) {
      errors.push('Week ' + weekNumber + ' reckoning has no conversion rule — the panel teaches nothing');
    } else if (currencyLabel && !conversionNamesCurrency(conversion, currencyLabel)) {
      errors.push('Week ' + weekNumber + ' reckoning conversion does not name the declared currency "'
        + currencyLabel + '" ("' + conversion + '") — the markStrip economy resolves into exactly '
        + 'one currency per booklet');
    }
    var sink = (reckoning.sink && typeof reckoning.sink === 'object') ? reckoning.sink : null;
    if (!sink) {
      errors.push('Week ' + weekNumber + ' reckoning has no sink — the marks convert into nothing');
      return;
    }
    if (RECKONING_SINK_KINDS.indexOf(sink.kind) === -1) {
      errors.push('Week ' + weekNumber + ' reckoning sink.kind "' + String(sink.kind)
        + '" is not one of ' + RECKONING_SINK_KINDS.join(', ')
        + ' — a sink must reference vocabulary the booklet already renders');
    }
    if (!String(sink.instruction || '').trim()) {
      errors.push('Week ' + weekNumber + ' reckoning sink has no instruction — the player is told where '
        + 'the marks go but not what to do');
    }
    if (sink.ref && !sinkRefResolves(sinkIndex, sink.ref)) {
      warnings.push('Week ' + weekNumber + ' reckoning sink.ref "' + sink.ref
        + '" names nothing in the booklet — no fragment, companion, clock, oracle or map surface answers to it');
    }
  });

  // ── The boss threshold: derived, and reachable by arithmetic ─────────────
  // Band bounds use floor/ceil with a floor of 1 so a one-tick campaign
  // (round(0.75 x 1) = 1) is not reported as out of band by rounding alone.
  var bossWeekIndex = resolveBossWeekIndex(weeks);
  weeks.forEach(function (week, wi) {
    var reckoning = (week && week.reckoning) || null;
    if (!reckoning || reckoning.threshold === undefined) return;
    var weekNumber = (week && week.weekNumber) || (wi + 1);
    var lower = Math.max(1, Math.floor(0.5 * totalAttainableTicks));
    var upper = Math.max(1, Math.ceil(0.85 * totalAttainableTicks));
    if (reckoning.threshold < lower || reckoning.threshold > upper) {
      errors.push('Week ' + weekNumber + ' reckoning.threshold ' + reckoning.threshold
        + ' sits outside the reachable band ' + lower + '-' + upper + ' (0.5-0.85 x '
        + totalAttainableTicks + ' attainable ticks) — assembly derives '
        + RECKONING_THRESHOLD_RATIO + ', so an out-of-band value means the derivation was bypassed');
    }
  });
  if (strippedSessions > 0 && bossWeekIndex >= 0) {
    var bossReckoning = (weeks[bossWeekIndex] || {}).reckoning;
    if (bossReckoning && bossReckoning.threshold === undefined) {
      errors.push('Week ' + ((weeks[bossWeekIndex] || {}).weekNumber || (bossWeekIndex + 1))
        + ' is the boss week and carries no reckoning.threshold — the campaign banks '
        + totalAttainableTicks + ' marks toward nothing');
    }
  }

  return { errors: errors, warnings: warnings };
}

// ── Voice tics in terminal position (B-class voice scan) ────────────────────
// docs/voice/VOICE.md states two laws this can partially measure: terminal
// position is emphasis, and the machine-tells are banned in every genre. The
// corpus measurement (scripts/measure-voice-sameness.mjs) found the tic rates
// concentrating in endings and interludes — exactly where the law predicts.
//
// SCOPE IS THE POINT: only the FINAL TWO SENTENCES of each prose unit are
// scanned. Mid-paragraph negation is ordinary English; the same construction
// in terminal position is a closer. Full-text scanning would bury the real
// signal in noise, so it is deliberately not done.
//
// LIMITS, stated because these are regexes pretending to be an ear: the
// aphorism family matches SURFACE FORMS. It fires on innocent negation and
// misses inverted forms it has no pattern for (irregular inflection defeats
// stem echo — including the author's own founding ear-log catch). Treat the
// output as a floor, never a verdict: the cold audit in docs/voice/CHECKLIST.md
// and the critic's voiceDiscipline dimension carry the judgment.
//
// Warnings per D19: a tic is degraded taste, not an invalid booklet. The critic
// loop consumes these as machine findings it must convert into failures.

var VOICE_TIC_LIMITS = {
  aphorismMaxWords: 20,     // "short sentence" ceiling for the short-only patterns
  drumbeatMinWords: 3,      // below this it is a signature or a date, not a beat
  drumbeatMaxWords: 7,      // a clipped sentence
  drumbeatRunUpWords: 12,   // the longer sentence that makes the clipped pair a rhythm break
  quoteMaxChars: 70         // how much of the offending sentence a finding quotes
};

// Line-aware: found documents carry form scaffolding with no terminal
// punctuation ("ROUTING: NIGHT STAFF") that is still a unit of rhythm.
function voiceSentences(text) {
  var clean = String(text || '')
    .replace(/\r/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&mdash;/g, '—').replace(/&nbsp;/g, ' ')
    .replace(/&apos;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .trim();
  var out = [];
  clean.split(/\n+/).forEach(function (line) {
    var trimmed = line.trim();
    if (!trimmed) return;
    // Sentence break = terminal punctuation (plus any closing quote/bracket)
    // followed by whitespace. Written as replace-then-split rather than a
    // lookbehind so the module parses on older Safari, which the print path
    // still reaches.
    trimmed.replace(/([.!?…]["'”’)\]]*)\s+/g, '$1\n').split('\n').forEach(function (part) {
      var s = part.trim();
      if (s) out.push(s);
    });
  });
  return out;
}

function voiceWords(s) {
  return (String(s).match(/[A-Za-z][A-Za-z'’-]*/g) || []).map(function (w) { return w.toLowerCase(); });
}

// Form scaffolding ("FILED: 14 MARCH", "[PAGES 2-6 NOT RECOVERED]") is a real
// document's real furniture, not a rhythm choice. Ending a memo on its routing
// line is the writer's own last business — the opposite of a manufactured
// closer — so scaffolding is dropped before the tail is taken.
function isVoiceLabelLine(s) {
  var t = String(s).trim();
  return /^[^a-z]{3,}$/.test(t) || /^[A-Z][A-Z0-9 ./#-]{2,}:/.test(t);
}

var VOICE_FUNCTION_WORDS = {
  the: 1, of: 1, and: 1, to: 1, a: 1, in: 1, that: 1, is: 1, was: 1, it: 1,
  for: 1, as: 1, with: 1, but: 1, on: 1, not: 1, be: 1, at: 1, by: 1, this: 1,
  have: 1, from: 1, or: 1, are: 1, they: 1, you: 1, his: 1, her: 1, he: 1,
  she: 1, all: 1, no: 1, one: 1, there: 1, their: 1, which: 1, when: 1, if: 1,
  than: 1, its: 1, what: 1, who: 1, how: 1, why: 1, been: 1, were: 1, will: 1,
  would: 1, them: 1, him: 1, has: 1, had: 1, more: 1, less: 1, into: 1,
  out: 1, up: 1, down: 1, over: 1, then: 1, so: 1, about: 1, any: 1, some: 1
};

function voiceStem(w) {
  return w.replace(/(?:ing|edly|ed|ies|es|s|ly)$/, '').replace(/(.)\1$/, '$1');
}

function voiceContentWords(s) {
  return voiceWords(s).filter(function (w) { return w.length >= 4 && !VOICE_FUNCTION_WORDS[w]; });
}

// Chiasmus-ish: a shared content-word stem at the hinge of a two-clause
// sentence (anadiplosis …X | X…, or envelope X… | …X).
function voiceClauseMirror(sentence) {
  var clauses = String(sentence).split(/\s*[,;—–]\s*|\s+--\s+/)
    .map(function (c) { return c.trim(); }).filter(Boolean);
  if (clauses.length < 2) return false;
  for (var i = 0; i < clauses.length - 1; i++) {
    var a = voiceContentWords(clauses[i]);
    var b = voiceContentWords(clauses[i + 1]);
    if (!a.length || !b.length) continue;
    if (voiceWords(clauses[i]).length > 12 || voiceWords(clauses[i + 1]).length > 12) continue;
    if (voiceStem(a[a.length - 1]) === voiceStem(b[0])) return true;
    if (voiceStem(a[0]) === voiceStem(b[b.length - 1])) return true;
  }
  return false;
}

// The mirrored-aphorism family proper: negation and contrast pivots plus
// chiasmus. Ported from the CORE patterns of scripts/measure-voice-sameness.mjs
// (its "adjacent" patterns spot-checked at ~50% false positives and are
// deliberately left out — a warning nobody trusts is a warning nobody reads).
var VOICE_APHORISM_PATTERNS = [
  { name: 'not-X-but-Y', test: function (s) { return /\bnot\s+(?:[\w'’-]+\s+){0,5}but\s+/i.test(s); } },
  { name: 'X-is-not-Y', short: true, test: function (s) { return /\b(?:is|are|was|were|isn'?t|aren'?t|wasn'?t|weren'?t)\s+not\b/i.test(s); } },
  { name: 'comma-not-Y', test: function (s) { return /,\s*not\s+(?:a|an|the|to|for|because)?\s*[\w'’-]+[.!?]?$/i.test(s); } },
  { name: 'more/less-X-than-Y', test: function (s) { return /\b(?:less|more|fewer|rather)\s+(?:[\w'’-]+\s+){0,3}than\b/i.test(s); } },
  { name: 'clause-mirror', short: true, test: voiceClauseMirror }
];

function voiceQuote(sentence) {
  var s = String(sentence).trim().replace(/\s+/g, ' ');
  return s.length > VOICE_TIC_LIMITS.quoteMaxChars
    ? s.slice(0, VOICE_TIC_LIMITS.quoteMaxChars - 1) + '…'
    : s;
}

// Returns the tic descriptions found in the final two sentences of `text`.
export function scanTerminalVoiceTics(text) {
  var sentences = voiceSentences(text).filter(function (s) { return !isVoiceLabelLine(s); });
  if (!sentences.length) return [];
  var tail = sentences.slice(-2);
  var hits = [];

  tail.forEach(function (sentence) {
    var short = voiceWords(sentence).length <= VOICE_TIC_LIMITS.aphorismMaxWords;
    for (var i = 0; i < VOICE_APHORISM_PATTERNS.length; i++) {
      var p = VOICE_APHORISM_PATTERNS[i];
      if (p.short && !short) continue;
      if (!p.test(sentence)) continue;
      hits.push('mirrored aphorism in terminal position [' + p.name + ']: "' + voiceQuote(sentence) + '"');
      break; // one finding per sentence — the pattern name is diagnostic, not a tally
    }
  });

  // Terminal drumbeat: two clipped sentences closing a unit that was not
  // already running clipped. The run-up guard is what makes it a rhythm BREAK
  // rather than a register (a telegraphic document is allowed to be terminse).
  if (sentences.length >= 3 && tail.length === 2) {
    var lastLens = tail.map(function (s) { return voiceWords(s).length; });
    var runUp = voiceWords(sentences[sentences.length - 3]).length;
    // A one- or two-word line is a signature, a date, or a name — furniture,
    // not a beat. (Signature blocks longer than that still slip through; the
    // cold audit catches what the floor cannot.)
    if (lastLens[0] >= VOICE_TIC_LIMITS.drumbeatMinWords
      && lastLens[1] >= VOICE_TIC_LIMITS.drumbeatMinWords
      && lastLens[0] <= VOICE_TIC_LIMITS.drumbeatMaxWords
      && lastLens[1] <= VOICE_TIC_LIMITS.drumbeatMaxWords
      && runUp >= VOICE_TIC_LIMITS.drumbeatRunUpWords) {
      hits.push('short-short drumbeat closing the unit (' + lastLens[0] + ' then ' + lastLens[1]
        + ' words after a ' + runUp + '-word sentence): "' + voiceQuote(tail[1]) + '"');
    }
  }

  return hits;
}

// Every prose unit the voice constitution governs, with the critic unit that
// owns it (week / fragment / ending — the units a revision can target).
// `terminal` marks the surfaces read after maximum invested effort — the
// final week's interlude and the endings (the boss narrative is also terminal
// but is not a collected prose unit) — the licensed home for a declared
// genre move (Constitution Law 6: resonance lives at the end).
function collectVoiceProseUnits(booklet) {
  var units = [];
  var weeks = (booklet && booklet.weeks) || [];
  weeks.forEach(function (week, wi) {
    var number = (week && week.weekNumber) || (wi + 1);
    var finalWeek = wi === weeks.length - 1;
    ((week && week.sessions) || []).forEach(function (session, si) {
      if (session && session.storyPrompt) {
        units.push({ unitType: 'week', unitRef: number, text: session.storyPrompt,
          terminal: false,
          label: 'Week ' + number + ' session ' + (si + 1) + ' storyPrompt' });
      }
    });
    var interlude = week && week.interlude;
    if (interlude && interlude.body) {
      units.push({ unitType: 'week', unitRef: number, text: interlude.body,
        terminal: finalWeek,
        label: 'Week ' + number + ' interlude' });
    }
    var overflow = week && week.overflowDocument;
    var overflowBody = overflow && (overflow.content || overflow.body);
    if (overflowBody) {
      units.push({ unitType: 'week', unitRef: number, text: overflowBody,
        terminal: false,
        label: 'Week ' + number + ' overflow document ' + ((overflow && overflow.id) || '') });
    }
  });
  ((booklet && booklet.fragments) || []).forEach(function (frag, fi) {
    var body = frag && (frag.content || frag.body || frag.contentHtml);
    if (body) {
      units.push({ unitType: 'fragment', unitRef: (frag && frag.id) || fi, text: body,
        terminal: false,
        label: 'Fragment ' + ((frag && frag.id) || fi) });
    }
  });
  ((booklet && booklet.endings) || []).forEach(function (ending, ei) {
    var variant = (ending && (ending.variant || ending.id)) || ei;
    var body = extractEndingBodyText(ending);
    var finalLine = ending && ending.content && ending.content.finalLine;
    // The finalLine IS the terminal position — it is scanned as part of the
    // ending's tail, not as a separate unit, so a clean body cannot hide it.
    var text = [body, finalLine].filter(Boolean).join('\n');
    if (text) {
      units.push({ unitType: 'ending', unitRef: variant, text: text,
        terminal: true,
        label: 'Ending "' + variant + '"' });
    }
  });
  return units;
}

export function collectVoiceTicFindings(booklet) {
  var findings = [];
  collectVoiceProseUnits(booklet).forEach(function (unit) {
    scanTerminalVoiceTics(unit.text).forEach(function (hit) {
      findings.push({
        unitType: unit.unitType,
        unitRef: unit.unitRef,
        message: unit.label + ' — ' + hit
      });
    });
  });
  return findings;
}

// ── Licensed-move placement (Constitution Law 6: resonance lives at the end) ─
// A licensed genre move's home is the terminal surfaces — the final interlude,
// the boss narrative, and the endings: the pages read after maximum invested
// effort. When meta.literaryRegister.licensedMoves declares a move, this scan
// looks for that move's pattern family in NON-terminal prose (storyPrompts,
// non-final interludes, overflow documents, fragments) and flags each unit
// where it appears as a spend before the end. Findings are WARNINGS (D19):
// early placement is degraded taste, not invalidity — the budget text is free
// prose and cannot be machine-parsed, so placement, not budget count, is what
// the machine can check.
//
// Detector honesty (each is a regex pretending to be an ear):
//   aphorism        — the mirrored-aphorism pattern family over EVERY sentence
//                     (not just the tail — a spend mid-unit is still a spend).
//                     Fires on innocent negation; misses inverted forms it has
//                     no pattern for.
//   ominous-closer  — the terminal-position tic scan reused as-is: a closer
//                     performed at the end of a non-terminal unit. Sees only
//                     the aphorism family and the drumbeat; a flat ominous
//                     image with no structural signature is invisible to it.
//   direct-address  — second-person pronouns in unquoted narration. Sentences
//                     carrying double quotes are skipped (a spoken "you"
//                     belongs to a character, not the narrator); pronoun-free
//                     imperatives ("Look at the board.") are missed.
//   fragment-rhythm — a run of two or more consecutive 1-4-word sentences.
//                     Word count is not verblessness: label lines are dropped
//                     first, but terse legitimate prose can still fire, and a
//                     verbless fragment longer than four words never will.

function detectAphorismMove(text) {
  var hits = [];
  voiceSentences(text).filter(function (s) { return !isVoiceLabelLine(s); }).forEach(function (sentence) {
    var short = voiceWords(sentence).length <= VOICE_TIC_LIMITS.aphorismMaxWords;
    for (var i = 0; i < VOICE_APHORISM_PATTERNS.length; i++) {
      var p = VOICE_APHORISM_PATTERNS[i];
      if (p.short && !short) continue;
      if (!p.test(sentence)) continue;
      hits.push('mirrored aphorism [' + p.name + ']: "' + voiceQuote(sentence) + '"');
      break; // one finding per sentence, same law as the tic scan
    }
  });
  return hits;
}

function detectOminousCloserMove(text) {
  return scanTerminalVoiceTics(text).map(function (hit) {
    return 'closer performed at the unit’s end — ' + hit;
  });
}

function detectDirectAddressMove(text) {
  var hits = [];
  voiceSentences(text).filter(function (s) { return !isVoiceLabelLine(s); }).forEach(function (sentence) {
    if (/["“”]/.test(sentence)) return; // spoken address is a character's, not the narrator's
    if (/\byou(?:r|rs|rself|rselves)?\b/i.test(sentence)) {
      hits.push('second-person address: "' + voiceQuote(sentence) + '"');
    }
  });
  return hits;
}

var FRAGMENT_RHYTHM_MAX_WORDS = 4; // above this a sentence is a sentence, not a fragment beat
function detectFragmentRhythmMove(text) {
  var sentences = voiceSentences(text).filter(function (s) { return !isVoiceLabelLine(s); });
  var hits = [];
  var run = 0;
  for (var i = 0; i <= sentences.length; i++) {
    var words = i < sentences.length ? voiceWords(sentences[i]).length : 0;
    if (i < sentences.length && words >= 1 && words <= FRAGMENT_RHYTHM_MAX_WORDS) {
      run++;
      continue;
    }
    if (run >= 2) {
      hits.push(run + ' consecutive clipped fragments ending "' + voiceQuote(sentences[i - 1]) + '"');
    }
    run = 0;
  }
  return hits;
}

var LICENSED_MOVE_DETECTORS = {
  'aphorism': detectAphorismMove,
  'ominous-closer': detectOminousCloserMove,
  'direct-address': detectDirectAddressMove,
  'fragment-rhythm': detectFragmentRhythmMove
};

export function collectLicensedMovePlacementFindings(booklet) {
  var register = (booklet && booklet.meta && booklet.meta.literaryRegister) || {};
  var moves = Array.isArray(register.licensedMoves) ? register.licensedMoves : [];
  if (!moves.length) return []; // zero licenses is the normal state — nothing to place
  var findings = [];
  var units = collectVoiceProseUnits(booklet).filter(function (unit) { return !unit.terminal; });
  moves.forEach(function (entry) {
    var move = entry && entry.move;
    var detect = LICENSED_MOVE_DETECTORS[move];
    if (!detect) return; // enum validity is the schema's problem, not placement's
    units.forEach(function (unit) {
      var hits = detect(unit.text);
      if (!hits.length) return;
      // One warning per unit per move: the first exhibit plus a count, so a
      // unit written entirely in the move does not drown the report.
      var more = hits.length > 1 ? ' (+' + (hits.length - 1) + ' more in this unit)' : '';
      findings.push({
        unitType: unit.unitType,
        unitRef: unit.unitRef,
        message: unit.label + ' — licensed move "' + move + '" spent before the end — '
          + hits[0] + more
          + '; its licensed home is the final interlude, the boss narrative, and the endings'
      });
    });
  });
  return findings;
}

// ── Posted manifests: the forward-only resolution law (GAP-6 Landing 2) ─────
// A `manifestPointer` is a printed promise — "X was last logged in Y" — that
// names a real surface the player has NOT reached yet. That promise is
// machine-checkable, so it is checked: two ways to break it, both ERRORS per
// D19 (a dangling pointer is invalidity, not degraded taste).
//   1. The target does not exist in the booklet at all.
//   2. The target exists but sits at or before the pointer's own position, so
//      the chase is already over the moment it is posted.
// Position is PLAY order, not page order: fragments print in the back archive,
// but a fragment is *met* when the booklet first hands it over. Two components:
//   week — the earliest week that delivers it, over every channel (a session
//     naming it, that week's oracle or cipher pulling it, an interlude carrying
//     it, or the week it supplements). This is the primary key.
//   slot — the SCRIPTED position inside that week: a session index, or the
//     end-of-week slot for interlude hand-offs and overflow supplements. Oracle
//     and cipher routes are optional and unordered, so they leave slot null.
// Forward means a later week, or the same week at a later scripted slot (the
// 2-3 session mini-chase). Same week with either slot unknown is not provably
// forward, so it fails. A week reference ("W4") sits at the head of its week
// and therefore only ever resolves forward into a strictly later week.

function manifestWeekNumber(week, index) {
  var n = Number(week && week.weekNumber);
  return Number.isFinite(n) && n > 0 ? n : (index + 1);
}

function parseWeekRef(ref) {
  var match = /^w\s*(\d+)$/i.exec(String(ref || '').trim());
  return match ? parseInt(match[1], 10) : null;
}

function buildManifestPositions(booklet) {
  var weeks = (booklet && booklet.weeks) || [];
  var positions = {}; // normalized document id -> { week, slot }

  function place(ref, weekNo, slot) {
    var key = normalizeId(ref);
    if (!key) return;
    var current = positions[key];
    if (!current || weekNo < current.week) {
      positions[key] = { week: weekNo, slot: slot };
      return;
    }
    if (weekNo !== current.week) return;
    if (slot === null) return;
    if (current.slot === null || slot < current.slot) current.slot = slot;
  }

  weeks.forEach(function (week, wi) {
    var weekNo = manifestWeekNumber(week, wi);
    var sessions = (week && week.sessions) || [];
    var fo = (week && week.fieldOps) || {};

    sessions.forEach(function (session, si) {
      if (session && session.fragmentRef) place(session.fragmentRef, weekNo, si);
    });

    // Oracle pulls and cipher targets are optional routes live for the whole
    // week — they fix the week but never a scripted position inside it.
    var oracle = fo.oracleTable || fo.oracle || {};
    (oracle.entries || []).forEach(function (entry) {
      if (entry && entry.fragmentRef) place(entry.fragmentRef, weekNo, null);
    });
    ((((fo.cipher || {}).body) || {}).referenceTargets || []).forEach(function (target) {
      if (looksLikeFragmentRef(target)) place(target, weekNo, null);
    });

    // The interlude closes the week; a hand-off in its payload lands with it,
    // as does the week's overflow supplement.
    var payload = (week && week.interlude) ? week.interlude.payload : null;
    if (payload && typeof payload === 'object' && payload.fragmentRef) {
      place(payload.fragmentRef, weekNo, sessions.length);
    }
    if (week && week.overflowDocument && week.overflowDocument.id) {
      place(week.overflowDocument.id, weekNo, sessions.length);
    }
  });

  return positions;
}

// true when `target` is strictly later than `source` in play order.
function manifestPointsForward(source, target) {
  if (!source || !target) return null; // unprovable — caller falls back
  if (target.week !== source.week) return target.week > source.week;
  if (source.slot === null || target.slot === null) return false;
  return target.slot > source.slot;
}

// ── The shared pointer ledger ───────────────────────────────────────────────
// Everything both pointer channels need to know about where things sit. It was
// inline in collectManifestPointerErrors until the citation channel arrived and
// needed the same four tables; copying them would have been D91 in miniature —
// two derivations of "which documents does this booklet print" that nobody
// would notice diverging, because each caller only ever reads its own.
//
//   positions      — play-order position per document (buildManifestPositions).
//   knownDocs      — every printable document id, normalized.
//   archiveOrder   — authored fragment order, the fallback sequence for
//                    documents no week delivers.
//   weekNumbers    — the weeks that exist.
//   pointerBearing — normalized doc id -> the channel that document points
//                    with. This is what makes the no-chain law checkable.
function buildPointerLedger(booklet) {
  var weeks = (booklet && booklet.weeks) || [];
  var fragments = (booklet && booklet.fragments) || [];
  var ledger = {
    positions: buildManifestPositions(booklet),
    knownDocs: {},
    archiveOrder: {},
    weekNumbers: {},
    pointerBearing: {},
    weekCount: weeks.length
  };

  function noteDocument(doc) {
    if (!doc || !doc.id) return;
    var key = normalizeId(doc.id);
    ledger.knownDocs[key] = true;
    if (ledger.pointerBearing[key]) return;
    if (doc.citeRef && typeof doc.citeRef === 'object') ledger.pointerBearing[key] = 'citeRef';
    else if (doc.manifestPointer && typeof doc.manifestPointer === 'object') {
      ledger.pointerBearing[key] = 'manifestPointer';
    }
  }

  fragments.forEach(function (fragment, fi) {
    if (!fragment || !fragment.id) return;
    var key = normalizeId(fragment.id);
    if (ledger.archiveOrder[key] === undefined) ledger.archiveOrder[key] = fi;
    noteDocument(fragment);
  });

  weeks.forEach(function (week, wi) {
    ledger.weekNumbers[manifestWeekNumber(week, wi)] = true;
    if (week && week.overflowDocument) noteDocument(week.overflowDocument);
  });

  return ledger;
}

export function collectManifestPointerErrors(booklet) {
  var errors = [];
  var weeks = (booklet && booklet.weeks) || [];
  var fragments = (booklet && booklet.fragments) || [];

  var ledger = buildPointerLedger(booklet);
  var positions = ledger.positions;
  var archiveOrder = ledger.archiveOrder;
  var knownDocs = ledger.knownDocs;
  var weekNumbers = ledger.weekNumbers;
  var weekCount = ledger.weekCount;

  function check(pointer, label, source) {
    if (pointer === undefined || pointer === null) return; // optional — absence is fine
    if (typeof pointer !== 'object' || Array.isArray(pointer)) {
      errors.push(label + ' manifestPointer must be an object { targetRef, postedAs }');
      return;
    }

    var targetRef = String(pointer.targetRef || '').trim();
    var postedAs = String(pointer.postedAs || '').trim();
    if (!postedAs) {
      errors.push(label + ' manifestPointer is missing postedAs — the manifest line the artifact prints');
    }
    if (!targetRef) {
      errors.push(label + ' manifestPointer is missing targetRef — a posted manifest must name the surface it points at');
      return;
    }

    var targetPosition = null;
    var targetWhere = '';
    var targetKey = null;
    var weekRef = parseWeekRef(targetRef);

    if (weekRef !== null) {
      if (!weekNumbers[weekRef]) {
        errors.push(label + ' manifestPointer.targetRef "' + targetRef + '" names Week ' + weekRef +
          ', which this ' + weekCount + '-week campaign does not contain — a posted manifest must name a real surface');
        return;
      }
      // A week reference means "somewhere in Week N" — it sits at the head of
      // that week, so only a strictly later week resolves forward.
      targetPosition = { week: weekRef, slot: 0 };
      targetWhere = 'Week ' + weekRef + ' is not later';
    } else {
      targetKey = normalizeId(targetRef);
      if (!knownDocs[targetKey]) {
        errors.push(label + ' manifestPointer.targetRef "' + targetRef + '" does not resolve — no document in this booklet carries that id and it is not a week reference (W1-W' + weekCount + ')');
        return;
      }
      if (positions[targetKey]) {
        targetPosition = positions[targetKey];
        targetWhere = '"' + targetRef + '" is delivered in Week ' + targetPosition.week;
      }
    }

    // Forward-only. Same position counts as backward: a manifest that lands
    // where it was posted is anticipation with nowhere to go.
    var forward = manifestPointsForward(source.position, targetPosition);
    if (forward !== null) {
      if (!forward) {
        errors.push(label + ' manifestPointer.targetRef "' + targetRef + '" does not point forward — the manifest is posted in Week ' +
          source.position.week + ' and ' + targetWhere +
          '; a posted manifest must name a surface the player has not reached yet');
      }
      return;
    }

    // Neither side is delivered by a week (archive-only documents): authored
    // fragment order is the only sequence the booklet declares.
    if (targetKey !== null && source.archiveIndex !== null && archiveOrder[targetKey] !== undefined) {
      if (archiveOrder[targetKey] <= source.archiveIndex) {
        errors.push(label + ' manifestPointer.targetRef "' + targetRef + '" does not point forward — it sits at or before the posting document in the fragment archive, and no week delivers either one');
      }
    }
  }

  fragments.forEach(function (fragment, fi) {
    if (!fragment || fragment.manifestPointer === undefined) return;
    var key = fragment.id ? normalizeId(fragment.id) : '';
    check(fragment.manifestPointer, 'Fragment "' + (fragment.id || '?') + '":', {
      position: (key && positions[key]) ? positions[key] : null,
      archiveIndex: fi
    });
  });

  weeks.forEach(function (week, wi) {
    var weekNo = manifestWeekNumber(week, wi);
    var sessions = (week && week.sessions) || [];
    // An interlude and a week's overflow supplement both close their week.
    var endOfWeek = { week: weekNo, slot: sessions.length };
    var interlude = week && week.interlude;
    if (interlude && interlude.manifestPointer !== undefined) {
      check(interlude.manifestPointer, 'Week ' + weekNo + ' interlude:', {
        position: endOfWeek,
        archiveIndex: null
      });
    }
    var overflow = week && week.overflowDocument;
    if (overflow && overflow.manifestPointer !== undefined) {
      check(overflow.manifestPointer, 'Week ' + weekNo + ' overflowDocument "' + (overflow.id || '?') + '":', {
        position: endOfWeek,
        archiveIndex: null
      });
    }
  });

  return errors;
}

// ── Cited authorities: the citeRef family (§11 Wave 4a) ─────────────────────
// The manifest channel's twin, and deliberately parameterized rather than
// copied. A manifestPointer POSTS a chase and is forward-only by law; a citeRef
// CITES an authority, and an authority sits wherever it sits — the rule a
// Week-5 micro-line fires under was taught in Week 1, and a later fragment may
// cite an earlier one. Direction is the whole difference, so it is an argument.
//
// Four ERROR-class checks, from docs/reference/point-of-use-rules-research.md
// §6.3, and every one of them is a broken PRINTED PROMISE rather than degraded
// taste — the D19 line:
//   1. Resolution — the cited surface exists. A citation to nothing is the same
//      defect as a manifest aimed at a missing fragment.
//   2. No-chain — the cited surface does not itself point somewhere. Two
//      disclosure levels is the documented ceiling (NN/g); the plain-language
//      literature calls the unbounded form the "never-ending story". A reader
//      who spends the flip must land on the thing, not on a forwarding address.
//   3. Blind pointer — `citedAs` carries a pinpoint. A destination without a
//      payload makes the reader guess, which is what legal editors mean by a
//      blind reference, and it is the amendment the research forces on the
//      author's original "just give the page number" hypothesis.
//   4. Citation-style parity — the pinpoint is in THIS shell's grammar.
//      Signaling only pays when the signal is systematic across the artifact.
//
// 3 and 4 are split, where the spec stated one check. They are different
// defects with different fixes ("you cited nothing" vs "you cited like a court
// packet in a ship's logbook"), splitting them keeps the two from double-firing
// on the same string, and it lets the message name the vocabulary the book
// should have used. Force is unchanged: both are ERRORS.
//
// One thing a generating model CANNOT cite is a page number: pagination is
// assigned by the layout engine long after the prose exists. That is why the
// universal pinpoint is the booklet's own ref vocabulary (F.07 / W4) and why
// the shell grammars file by label rather than by page.

var POINTER_REF_TOKEN = /\b(?:F\.?\s*\d+|W\s*\d+)\b/gi;

// true / false / null-when-unprovable, for a required direction of travel.
// 'either' is the citation channel: an authority may sit on any side.
function pointerTravelsCorrectly(direction, source, target) {
  if (direction === 'either') return true;
  var forward = manifestPointsForward(source, target);
  if (forward === null) return null;
  return direction === 'forward' ? forward : !forward;
}

// Resolve one ref token against the ledger. Returns the target position plus a
// human phrase for it, or a `missing` reason the caller turns into a message.
function resolveLedgerRef(ledger, rawRef) {
  var ref = String(rawRef || '').trim();
  if (!ref) return { missing: 'empty' };
  var weekRef = parseWeekRef(ref);
  if (weekRef !== null) {
    if (!ledger.weekNumbers[weekRef]) return { missing: 'week', weekRef: weekRef };
    // A week reference sits at the head of its week, exactly as the manifest
    // channel reads it — one position vocabulary, two channels.
    return { weekRef: weekRef, position: { week: weekRef, slot: 0 }, where: 'Week ' + weekRef };
  }
  var key = normalizeId(ref);
  if (!ledger.knownDocs[key]) return { missing: 'doc', key: key };
  return {
    key: key,
    position: ledger.positions[key] || null,
    where: ledger.positions[key] ? ('Week ' + ledger.positions[key].week) : 'the archive'
  };
}

export function collectCiteRefFindings(booklet) {
  var errors = [];
  var warnings = [];
  var weeks = (booklet && booklet.weeks) || [];
  var fragments = (booklet && booklet.fragments) || [];
  var ledger = buildPointerLedger(booklet);
  var identity = (booklet && booklet.meta && booklet.meta.artifactIdentity) || {};
  var shellFamily = resolveShellFamily(
    identity.shellFamily,
    identity.artifactClass,
    ((booklet && booklet.theme) || {}).visualArchetype
  );
  var style = resolveCitationStyle(shellFamily);

  function check(ref, label, source, direction) {
    if (ref === undefined || ref === null) return;
    if (typeof ref !== 'object' || Array.isArray(ref)) {
      errors.push(label + ' citeRef must be an object { targetRef, citedAs }');
      return;
    }
    var targetRef = String(ref.targetRef || '').trim();
    var citedAs = String(ref.citedAs || '').trim();

    if (!citedAs) {
      errors.push(label + ' citeRef is missing citedAs — a citation the artifact never prints points at nothing');
    }
    if (!targetRef) {
      errors.push(label + ' citeRef is missing targetRef — a citation must name the surface it cites');
      return;
    }

    // 1. Resolution.
    var target = resolveLedgerRef(ledger, targetRef);
    if (target.missing === 'week') {
      errors.push(label + ' citeRef.targetRef "' + targetRef + '" names Week ' + target.weekRef
        + ', which this ' + ledger.weekCount + '-week campaign does not contain');
      return;
    }
    if (target.missing) {
      errors.push(label + ' citeRef.targetRef "' + targetRef + '" does not resolve — no document in this booklet carries that id and it is not a week reference (W1-W'
        + ledger.weekCount + ')');
      return;
    }

    // 2. No-chain. Week references are exempt: a week is a place, not a
    //    surface, so landing in one is not landing on a forwarding address.
    if (target.key && ledger.pointerBearing[target.key]) {
      errors.push(label + ' citeRef.targetRef "' + targetRef + '" lands on a surface that itself carries a '
        + ledger.pointerBearing[target.key]
        + ' — a pointer may not point at another pointer; cite the surface that holds the answer');
    }

    // 3 + 4. The pinpoint audit.
    if (citedAs) {
      var pin = citationPinpoints(citedAs, shellFamily);
      if (!pin.own && !pin.foreign.length) {
        errors.push(label + ' citeRef.citedAs "' + citedAs
          + '" carries no pinpoint — name the destination as this ' + shellFamily
          + ' would file it (' + style.labelVocabulary.join(' / ') + ' + a number, or the ref itself)');
      } else if (!pin.own && pin.foreign.length) {
        errors.push(label + ' citeRef.citedAs "' + citedAs + '" cites in the ' + pin.foreign[0]
          + ' grammar, but this booklet is a ' + shellFamily + ' — one citation style per artifact ('
          + style.labelVocabulary.join(' / ') + ')');
      }
    }

    // Directionality. 'either' short-circuits; the parameter exists so the
    // seal channel below can demand backward travel from the same machinery.
    var travels = pointerTravelsCorrectly(direction, source && source.position, target.position);
    if (travels === false) {
      errors.push(label + ' citeRef.targetRef "' + targetRef + '" must point '
        + direction + ', but ' + target.where + ' does not sit that way');
    }
  }

  weeks.forEach(function (week, wi) {
    var weekNo = manifestWeekNumber(week, wi);
    ((week && week.sessions) || []).forEach(function (session, si) {
      ((session && session.microLines) || []).forEach(function (line, mi) {
        if (!line || line.citeRef === undefined) return;
        check(line.citeRef,
          'Week ' + weekNo + ' session ' + (si + 1) + ' microLine ' + (mi + 1) + ':',
          { position: { week: weekNo, slot: si } },
          'either');
      });
    });
  });

  // Every document that can carry a pointer, in one list. An overflowDocument
  // IS a fragment (it shares the schema $def), so it inherits citeRef and seal
  // — and a scan that walked only `booklet.fragments` would have left the
  // overflow archive silently unchecked. It closes its own week, which is the
  // position the manifest channel already assigns it.
  var pointerDocs = [];
  fragments.forEach(function (fragment) {
    if (!fragment) return;
    var key = fragment.id ? normalizeId(fragment.id) : '';
    pointerDocs.push({
      doc: fragment,
      label: 'Fragment "' + (fragment.id || '?') + '"',
      position: (key && ledger.positions[key]) ? ledger.positions[key] : null,
      key: key
    });
  });
  weeks.forEach(function (week, wi) {
    var overflow = week && week.overflowDocument;
    if (!overflow) return;
    var weekNo = manifestWeekNumber(week, wi);
    var key = overflow.id ? normalizeId(overflow.id) : '';
    pointerDocs.push({
      doc: overflow,
      label: 'Week ' + weekNo + ' overflowDocument "' + (overflow.id || '?') + '"',
      position: (key && ledger.positions[key])
        ? ledger.positions[key]
        : { week: weekNo, slot: ((week.sessions || []).length) },
      key: key
    });
  });

  pointerDocs.forEach(function (entry) {
    if (entry.doc.citeRef === undefined) return;
    check(entry.doc.citeRef, entry.label + ':', { position: entry.position }, 'either');
  });

  // ── Sealed caches ─────────────────────────────────────────────────────────
  // Honour-system locks: no crypto, because the flip IS the pleasure and a page
  // the player physically cannot open is a worse artifact than one they choose
  // not to open yet. What IS checkable is the geometry — the key must already
  // be behind the player when they meet the lock, or the seal is a wall.
  var sealed = [];
  pointerDocs.forEach(function (entry) {
    var fragment = entry.doc;
    if (!fragment.seal || typeof fragment.seal !== 'object') return;
    sealed.push(fragment);
    var label = entry.label + ' seal:';
    var here = entry.position;
    var condition = String(fragment.seal.unlockCondition || '');
    var refs = condition.match(POINTER_REF_TOKEN) || [];

    if (!refs.length) {
      warnings.push(label + ' unlockCondition names no surface this booklet prints ("' + condition
        + '") — a lock whose key cannot be located is a wall, not a cache');
      return;
    }
    refs.forEach(function (raw) {
      var target = resolveLedgerRef(ledger, raw);
      if (target.missing) {
        errors.push(label + ' unlockCondition cites "' + raw
          + '", which this booklet does not print — the key to a sealed cache must exist');
        return;
      }
      var travels = pointerTravelsCorrectly('backward', here, target.position);
      if (travels === false) {
        errors.push(label + ' unlockCondition cites "' + raw + '" (' + target.where
          + '), which the player has not reached when this cache is printed — a seal opens on what is already behind them');
      }
    });
  });

  if (sealed.length > POINTER_BUDGETS.maxSealsPerBooklet) {
    warnings.push('This booklet seals ' + sealed.length + ' caches (budget '
      + POINTER_BUDGETS.maxSealsPerBooklet
      + ') — page-flipping is a pleasure while it stays rare and a chore once it is routine');
  }

  return { errors: errors, warnings: warnings };
}

// ── Pointer density (§11 Wave 4a) ───────────────────────────────────────────
// Cross-reference density is a documented killer independently of whether any
// individual pointer is well-formed (point-of-use §1.6, §3.3, §5.1 amendment
// 3). Nothing counted these before: the manifest channel was budgeted in prose
// doctrine only, and the citation channel is new.
//
// WARN-class throughout, and honestly so — the research states plainly that
// every cue budget is arbitrary until playtest data exists (§7.2). What the
// numbers encode is a ratio the literature does support: a rest-window surface
// may offer at most ONE pointer the reader can decline, and a book may not
// spend its whole navigation budget on being cross-referenced.
export function collectPointerDensityFindings(booklet) {
  var findings = [];
  var weeks = (booklet && booklet.weeks) || [];
  var total = 0;

  weeks.forEach(function (week, wi) {
    var weekNo = manifestWeekNumber(week, wi);
    ((week && week.sessions) || []).forEach(function (session, si) {
      var lines = (session && session.microLines) || [];
      if (!Array.isArray(lines) || !lines.length) return;
      var where = 'Week ' + weekNo + ' session ' + (si + 1);
      if (lines.length > POINTER_BUDGETS.maxMicroLinesPerSession) {
        findings.push(where + ' carries ' + lines.length + ' microLines (budget '
          + POINTER_BUDGETS.maxMicroLinesPerSession
          + ') — every keyed line spends the same ninety seconds the set does');
      }
      var pointered = lines.filter(function (l) { return l && l.citeRef; }).length;
      total += pointered;
      if (pointered > POINTER_BUDGETS.maxCiteRefsPerSession) {
        findings.push(where + ' offers ' + pointered
          + ' citeRef pointers on one session card (budget ' + POINTER_BUDGETS.maxCiteRefsPerSession
          + ') — a rest-interval flip has to stay a choice the player can decline');
      }
    });
    // The other channel, counted on the same ledger: a reader does not know
    // which kind of pointer they are spending attention on.
    if (week && week.interlude && week.interlude.manifestPointer) total++;
    if (week && week.overflowDocument && week.overflowDocument.manifestPointer) total++;
  });

  ((booklet && booklet.fragments) || []).forEach(function (fragment) {
    if (!fragment) return;
    if (fragment.manifestPointer) total++;
    if (fragment.citeRef) total++;
  });

  var budget = POINTER_BUDGETS.pointersPerWeek * Math.max(1, weeks.length);
  if (total > budget) {
    findings.push('This booklet prints ' + total + ' pointers across both channels (manifests + citations); the budget for '
      + weeks.length + ' weeks is ' + budget
      + ' — cross-reference density is a documented cost independent of how well each pointer is written');
  }
  return findings;
}

// ── Play-loop advisories (§11 Wave 4a) ──────────────────────────────────────
// Four heuristics over content the machine can only read as text. B-class by
// the doctrine ledger: each one measures a PROXY for the law it serves, and
// each will miss cases and occasionally fire on a good one. Named honestly per
// the D89 one-currency precedent — a heuristic that presents itself as a proof
// is worse than no check, because it stops anyone from building the real one.
//
// What each can and cannot see:
//   Micro-line checkability — the law is "the condition names a state the
//     player can verify by looking at the page". The check is a keyword scan
//     for conditions that reach OFF the page (feelings, memory, intent). It
//     cannot tell whether a named clock actually exists; it only catches the
//     obvious uncheckables.
//   Door leans — structural, and therefore the most reliable of the four: a
//     door option with no `lean` string is a coin flip rather than a decision.
//   Return echo — structural too: a session after the first with no
//     openingEcho is the return-loop simulation's deficit 2 (the return moment
//     is mute) sitting in plain sight.
//   Failure-only-adds — the law is "every failure band ADDS something printed:
//     intel, a mark, a pointer, state motion; never pure loss". The check is a
//     keyword scan for pure-nothing phrasings ("nothing happens", "no effect",
//     "lose your progress"). A model that writes an elegant empty outcome will
//     pass it, and a legitimate setback that also adds intel may trip it.
var UNCHECKABLE_CONDITION_PATTERNS = [
  /\bif you (?:feel|felt|think|thought|believe|remember|recall|want|wish|decide|choose|prefer|suspect)\b/i,
  /\bif you (?:have|had) (?:been|ever)\b/i,
  /\bif it (?:feels|felt|seems|seemed)\b/i,
  /\bif you are (?:ready|willing|unsure|certain|sure)\b/i,
  /\bwhen you are ready\b/i
];

//
// The failure-only-adds scan is CLAUSE-level, and it has to be. A first draft
// matched loss phrases against the whole entry and fired on two corpus bands
// that read "if not completed: advance the clock and annotate the map; if
// completed: no effect — mark COMPLIANT". Those entries add twice; the phrase
// "no effect" was sitting in a conditional branch beside the addition. Matching
// the entry as one string could not see that, so the rule is now: an entry is
// pure loss when some clause reads as loss and NO clause reads as gain.
//
// A clause "gains" if it carries an additive paper instruction that is not
// governing a negative quantity — which is what separates "mark Z5 COMPLIANT"
// from "Mark -1 Impulse Point", the real violation in the corpus. State motion
// counts as a gain even when the motion is against the player: advancing a
// danger clock is the world spending a pressure, which is printed consequence,
// not the absence of one.
var LOSS_CLAUSE_PATTERNS = [
  /\bnothing (?:happens|changes|is (?:found|gained|learned)|comes of it)\b/i,
  /\bno (?:effect|change|result|consequence|gain)\b/i,
  /\b(?:lose|forfeit|erase|surrender|give up)\s+(?:a|one|your|the|\d)/i,
  /\bthe (?:trail|lead|search|attempt) (?:goes|is) (?:cold|dead|nowhere)\b/i,
  /\b(?:wasted|for nothing|to no avail|dead end|empty-handed)\b/i
];

var GAIN_CLAUSE_PATTERN =
  /\b(?:mark|annotate|shade|circle|record|write|note|add|advance|tick|fill|open|reveal|unlock|cross off|log|stamp|redraw|strike)\b/i;

// A negative quantity anywhere in the clause disqualifies it as a gain: the
// additive verb is being used to subtract.
var NEGATIVE_QUANTITY_PATTERN = /(?:^|[\s(])[-−]\s*\d|\bminus\s+\d|\b(?:remove|subtract|deduct)\b/i;

function readsAsPureLoss(text) {
  // Split on sentence and branch boundaries so a two-branch oracle entry is
  // read as the two outcomes it actually prints.
  var clauses = String(text || '').split(/[.;]|—|\bif\b/i).filter(function (c) {
    return c && c.trim();
  });
  var lost = false;
  var gained = false;
  clauses.forEach(function (clause) {
    if (LOSS_CLAUSE_PATTERNS.some(function (re) { return re.test(clause); })) lost = true;
    if (GAIN_CLAUSE_PATTERN.test(clause) && !NEGATIVE_QUANTITY_PATTERN.test(clause)) gained = true;
  });
  return lost && !gained;
}

export function collectPlayLoopFindings(booklet) {
  var findings = [];
  var weeks = (booklet && booklet.weeks) || [];
  var sessionsSeen = 0;

  weeks.forEach(function (week, wi) {
    var weekNo = manifestWeekNumber(week, wi);

    ((week && week.sessions) || []).forEach(function (session, si) {
      sessionsSeen++;
      var where = 'Week ' + weekNo + ' session ' + (si + 1);

      ((session && session.microLines) || []).forEach(function (line, mi) {
        var condition = String((line && line.condition) || '');
        var uncheckable = UNCHECKABLE_CONDITION_PATTERNS.some(function (re) { return re.test(condition); });
        if (uncheckable) {
          findings.push(where + ' microLine ' + (mi + 1)
            + ' keys off something the page cannot show ("' + condition
            + '") — a condition must name a mark, a shaded node, a filled segment, or a circled value');
        }
      });

      var rb = session && session.returnBeat;
      // Deficit 2 (return-loop-design §1): the return moment is mute. The
      // booklet's FIRST session is exempt by construction — it has no prior
      // session to echo, which is why the schema leaves openingEcho optional.
      if (rb && typeof rb === 'object' && sessionsSeen > 1
        && !String(rb.openingEcho || '').trim()) {
        findings.push(where + ' returnBeat has a closingLine but no openingEcho — the book names tomorrow'
          + ' and then says nothing about yesterday when the player comes back');
      }
    });

    var door = week && week.doorChoice;
    if (door && typeof door === 'object') {
      ['optionA', 'optionB'].forEach(function (side) {
        var option = door[side];
        if (!option || typeof option !== 'object') return;
        if (!String(option.lean || '').trim()) {
          findings.push('Week ' + weekNo + ' doorChoice.' + side
            + ' posts no lean — an unposted door is a coin flip, not a decision; the player must be told what each way is likely to pay');
        }
      });
    }

    var oracle = ((week && week.fieldOps) || {}).oracleTable || ((week && week.fieldOps) || {}).oracle || {};
    ((oracle && oracle.entries) || []).forEach(function (entry) {
      var text = String((entry && entry.text) || '') + '. ' + String((entry && entry.paperAction) || '');
      if (readsAsPureLoss(text)) {
        findings.push('Week ' + weekNo + ' oracle band "' + ((entry && entry.roll) || '?')
          + '" reads as pure loss ("' + String((entry && entry.text) || '').slice(0, 60)
          + '") — every band must ADD something printed: intel, a mark, a pointer, or state motion');
      }
    });
  });

  return findings;
}

export function validateAssembledBooklet(booklet) {
  var errors = [];
  var warnings = []; // soft issues (stylistic, non-fatal) — attached to return value

  collectBudgetBreaches(booklet).forEach(function (b) { warnings.push(b.message); });
  collectNounRosterFindings(booklet).forEach(function (m) { warnings.push(m); });
  collectPercentileStatFindings(booklet).forEach(function (m) { warnings.push(m); });
  // The mark economy carries both severities (see collectMarkStripFindings):
  // a missing strip is an unprintable promise, a clumsy label is taste.
  var markStripFindings = collectMarkStripFindings(booklet);
  markStripFindings.errors.forEach(function (m) { errors.push(m); });
  markStripFindings.warnings.forEach(function (m) { warnings.push(m); });
  collectVoiceTicFindings(booklet).forEach(function (f) { warnings.push(f.message); });
  collectLicensedMovePlacementFindings(booklet).forEach(function (f) { warnings.push(f.message); });
  // Posted manifests are promises, not preferences — broken ones are errors.
  collectManifestPointerErrors(booklet).forEach(function (m) { errors.push(m); });
  // Citations are the same class of promise (Wave 4a): a pointer that resolves
  // nowhere, chains, or makes the reader guess is invalidity. The seal budget
  // and the density counts are taste, and ride the warning channel.
  var citeFindings = collectCiteRefFindings(booklet);
  citeFindings.errors.forEach(function (m) { errors.push(m); });
  citeFindings.warnings.forEach(function (m) { warnings.push(m); });
  collectPointerDensityFindings(booklet).forEach(function (m) { warnings.push(m); });
  collectPlayLoopFindings(booklet).forEach(function (m) { warnings.push(m); });

  // ── Top-level structure ──────────────────────────────────────────────────
  ['meta', 'cover', 'rulesSpread', 'weeks', 'fragments', 'endings'].forEach(function (key) {
    if (!booklet[key]) errors.push('Missing top-level key: ' + key);
  });

  var meta = booklet.meta || {};
  var weeks = booklet.weeks || [];
  var fragments = booklet.fragments || [];

  if (!meta.artifactIdentity || typeof meta.artifactIdentity !== 'object') {
    warnings.push('meta.artifactIdentity is missing; renderer will fall back to a derived shell family.');
  }

  // ── Meta consistency ─────────────────────────────────────────────────────
  if (meta.weekCount !== undefined && meta.weekCount !== weeks.length) {
    errors.push('meta.weekCount (' + meta.weekCount + ') does not match weeks.length (' + weeks.length + ')');
  }
  if (meta.totalSessions !== undefined) {
    var actualSessions = 0;
    weeks.forEach(function (w) { actualSessions += (w.sessions || []).length; });
    if (meta.totalSessions !== actualSessions) {
      errors.push('meta.totalSessions (' + meta.totalSessions + ') does not match actual session count (' + actualSessions + ')');
    }
  }

  // ── Boss week: exactly one, must be final ────────────────────────────────
  var bossWeeks = weeks.filter(function (w) { return w.isBossWeek; });
  if (bossWeeks.length === 0) {
    errors.push('No boss week found (isBossWeek: true)');
  } else if (bossWeeks.length > 1) {
    errors.push('Multiple boss weeks found — must be exactly one');
  }
  if (weeks.length > 0 && !weeks[weeks.length - 1].isBossWeek) {
    errors.push('Boss week must be the final week in the array');
  }
  if (bossWeeks.length === 1 && !bossWeeks[0].bossEncounter) {
    errors.push('Boss week (isBossWeek: true) has no bossEncounter object');
  }

  // ── Fragment documentType validation ────────────────────────────────────
  // Derive from DOCUMENT_TYPE_ENUM (single source of truth for schema + validator)
  var validDocLookup = {};
  DOCUMENT_TYPE_ENUM.forEach(function (t) { validDocLookup[t] = true; });
  fragments.forEach(function (f) {
    if (f.documentType && !validDocLookup[f.documentType]) {
      errors.push('Fragment "' + (f.id || '?') + '": documentType "' + f.documentType + '" not in supported list');
    }
    if (!f.designSpec || typeof f.designSpec !== 'object') {
      warnings.push('Fragment "' + (f.id || '?') + '": missing designSpec (renderer falls back to neutral defaults)');
    }
  });

  // ── Fragment + overflow document ID uniqueness ───────────────────────────
  var fragmentIds = {};
  var fragmentIdsNorm = {};
  var allDocIds = {};  // fragments + overflow docs combined
  var referencedArtifactFragments = {};
  fragments.forEach(function (f) {
    if (f.id) {
      var nid = normalizeId(f.id);
      if (fragmentIds[f.id]) {
        errors.push('Duplicate fragment ID: "' + f.id + '"');
      }
      fragmentIds[f.id] = true;
      fragmentIdsNorm[nid] = true;
      if (allDocIds[nid]) {
        errors.push('Fragment ID "' + f.id + '" collides with another document ID');
      }
      allDocIds[nid] = 'fragment';
    }
  });

  // Collect overflow document IDs and check for collisions + required fields
  weeks.forEach(function (week, wi) {
    var wn = 'Week ' + (wi + 1);
    var hasOverflow = (week.sessions || []).length > 3;
    var od = week.overflowDocument;

    // Week alignment: overflow weeks must have overflow docs
    if (hasOverflow && !od) {
      errors.push(wn + ' has > 3 sessions but no overflowDocument');
    }

    if (od) {
      // Required fields
      if (!od.id) {
        errors.push(wn + ' overflowDocument missing id');
      }
      if (!od.documentType) {
        errors.push(wn + ' overflowDocument missing documentType');
      } else if (!validDocLookup[od.documentType]) {
        errors.push(wn + ' overflowDocument: documentType "' + od.documentType + '" not in supported list');
      }
      if (!od.content && !od.body) {
        errors.push(wn + ' overflowDocument missing content');
      }
      if (!od.designSpec || typeof od.designSpec !== 'object') {
        warnings.push(wn + ' overflowDocument missing designSpec (renderer falls back to neutral defaults)');
      }

      // ID collision check
      if (od.id) {
        var nid = normalizeId(od.id);
        if (allDocIds[nid]) {
          errors.push(wn + ' overflowDocument ID "' + od.id + '" collides with ' + (allDocIds[nid] === 'fragment' ? 'a fragment' : 'another overflow document'));
        }
        allDocIds[nid] = 'overflow';
      }
    }
  });

  function fragmentExists(ref) {
    var nid = normalizeId(ref);
    return fragmentIds[ref] || fragmentIdsNorm[nid] || allDocIds[nid] === 'overflow';
  }

  // ── Collect non-boss weeklyComponent values for boss verification ────────
  var nonBossValues = [];
  var hasBinaryChoice = false;
  var binaryChoiceWeek = null;
  var weekMapSnapshots = []; // collected for cross-week map progression check

  // ── Per-week validation ──────────────────────────────────────────────────
  weeks.forEach(function (week, wi) {
    var wn = 'Week ' + (wi + 1);
    var fo = week.fieldOps || {};

    // -- Sessions --
    (week.sessions || []).forEach(function (s, si) {
      if (s.fragmentRef && !fragmentExists(s.fragmentRef)) {
        errors.push(wn + ' session ' + (si + 1) + ': fragmentRef "' + s.fragmentRef + '" not found in fragments[] or overflowDocument IDs');
      }
      if (s.fragmentRef) referencedArtifactFragments[normalizeId(s.fragmentRef)] = true;
      if (s.binaryChoice) {
        hasBinaryChoice = true;
        binaryChoiceWeek = wn;
      }
    });

    // -- Oracle validation --
    var oracle = fo.oracleTable || fo.oracle || {};
    if (!week.isBossWeek) {
      if (!oracle.title) errors.push(wn + ' oracle: missing title');
      if (!oracle.instruction) errors.push(wn + ' oracle: missing instruction');
    }
    var entries = oracle.entries || [];
    entries.forEach(function (entry, ei) {
      if (Object.prototype.hasOwnProperty.call(entry, 'description')) {
        errors.push(wn + ' oracle[' + ei + ']: uses "description" — must be "text"');
      }
      if (entry.type === 'fragment' && !entry.fragmentRef) {
        errors.push(wn + ' oracle[' + ei + ']: type "fragment" missing fragmentRef');
      }
      if (entry.fragmentRef && !fragmentExists(entry.fragmentRef)) {
        errors.push(wn + ' oracle[' + ei + ']: fragmentRef "' + entry.fragmentRef + '" not found in fragments[] or overflowDocument IDs');
      }
      if (entry.fragmentRef) referencedArtifactFragments[normalizeId(entry.fragmentRef)] = true;
    });

    // Band count check: boss weeks replace fieldOps with bossEncounter — skip oracle validation
    if (!week.isBossWeek) {
      collectOracleBandErrors(entries, wn + ' oracle').forEach(function (message) {
        errors.push(message);
      });
    }

    // -- Cipher validation (non-boss weeks) --
    var cipher = fo.cipher || {};
    if (!week.isBossWeek) {
      // Required cipher fields
      var REQUIRED_CIPHER_FIELDS = ['type', 'title', 'body', 'extractionInstruction', 'characterDerivationProof', 'noticeabilityDesign'];
      REQUIRED_CIPHER_FIELDS.forEach(function (field) {
        if (cipher[field] === undefined || cipher[field] === null || cipher[field] === '') {
          errors.push(wn + ' cipher: missing required field "' + field + '"');
        }
      });
      if (cipher.body !== undefined && typeof cipher.body !== 'object') {
        errors.push(wn + ' cipher.body: must be an object, got ' + (typeof cipher.body));
      }
      var cipherTargets = (((cipher || {}).body || {}).referenceTargets) || [];
      cipherTargets.forEach(function (target, targetIndex) {
        if (!looksLikeFragmentRef(target)) return;
        if (!fragmentExists(target)) {
          errors.push(wn + ' cipher.referenceTargets[' + targetIndex + ']: "' + target + '" not found in fragments[] or overflowDocument IDs');
        }
        referencedArtifactFragments[normalizeId(target)] = true;
      });
    }

    // -- Map grid integrity --
    var mapState = fo.mapState;
    if (mapState && mapState.gridDimensions) {
      var dims = mapState.gridDimensions;
      var tiles = mapState.tiles || [];
      var expectedTileCount = (dims.rows || 0) * (dims.columns || 0);

      if (tiles.length > 0 && tiles.length !== expectedTileCount) {
        errors.push(wn + ' mapState: rows(' + dims.rows + ') * columns(' + dims.columns + ') = ' + expectedTileCount + ' but got ' + tiles.length + ' tiles');
      }

      // Duplicate coordinate check + bounds check
      if (tiles.length > 0) {
        var coordsSeen = {};
        tiles.forEach(function (tile, ti) {
          if (tile.row !== undefined && tile.col !== undefined) {
            var coord = tile.row + ',' + tile.col;
            if (coordsSeen[coord]) {
              errors.push(wn + ' mapState tile[' + ti + ']: duplicate coord (' + coord + ')');
            }
            coordsSeen[coord] = true;
            if (tile.row < 1 || tile.row > dims.rows) {
              errors.push(wn + ' mapState tile[' + ti + ']: row ' + tile.row + ' out of bounds (1\u2013' + dims.rows + ')');
            }
            if (tile.col < 1 || tile.col > dims.columns) {
              errors.push(wn + ' mapState tile[' + ti + ']: col ' + tile.col + ' out of bounds (1\u2013' + dims.columns + ')');
            }
          }
        });
      }

      // currentPosition validity
      var cp = mapState.currentPosition;
      if (cp) {
        if (cp.row !== undefined && (cp.row < 1 || cp.row > dims.rows)) {
          errors.push(wn + ' mapState.currentPosition: row ' + cp.row + ' out of bounds (1\u2013' + dims.rows + ')');
        }
        if (cp.col !== undefined && (cp.col < 1 || cp.col > dims.columns)) {
          errors.push(wn + ' mapState.currentPosition: col ' + cp.col + ' out of bounds (1\u2013' + dims.columns + ')');
        }
        // Verify currentPosition corresponds to an actual tile
        if (cp.row !== undefined && cp.col !== undefined && tiles.length > 0) {
          var cpCoord = cp.row + ',' + cp.col;
          if (!coordsSeen[cpCoord]) {
            errors.push(wn + ' mapState.currentPosition (' + cpCoord + ') does not match any tile');
          }
        }
      }
    }

    // -- PTP map integrity --
    if (mapState && mapState.mapType === 'point-to-point') {
      var ptpN = mapState.nodes || [];
      var ptpE = mapState.edges || [];
      if (ptpN.length > 12) errors.push(wn + ' PTP map: ' + ptpN.length + ' nodes exceeds max 12');
      if (ptpE.length > 10) errors.push(wn + ' PTP map: ' + ptpE.length + ' edges exceeds max 10');
      ptpN.forEach(function (node, ni) {
        var nx = Number(node.x), ny = Number(node.y);
        if (!Number.isInteger(nx) || nx < 1 || nx > 12) errors.push(wn + ' PTP node[' + ni + '] x=' + node.x + ' out of range 1\u201312');
        if (!Number.isInteger(ny) || ny < 1 || ny > 12) errors.push(wn + ' PTP node[' + ni + '] y=' + node.y + ' out of range 1\u201312');
      });
      ptpN.forEach(function (node) {
        var label = String(node.label || '').trim();
        if (label.length > 24) {
          warnings.push(wn + ' PTP node "' + label.substring(0, 20) + '...": ' + label.length + ' chars (recommend \u226420 for print legibility)');
        }
      });
    }

    // Collect map snapshot for cross-week progression check (non-boss only)
    if (!week.isBossWeek && mapState) {
      var tileByCoord = {};
      (mapState.tiles || []).forEach(function (t) {
        if (t.row !== undefined && t.col !== undefined) {
          tileByCoord[t.row + ',' + t.col] = t.type || 'unknown';
        }
      });
      weekMapSnapshots.push({
        weekIndex: wi,
        dims: mapState.gridDimensions || {},
        tileByCoord: tileByCoord,
        fingerprint: hasComparableMapState(mapState) ? buildMapEvolutionFingerprint(mapState) : '',
        hasComparableState: hasComparableMapState(mapState)
      });
    }

    // -- Interlude payloadType --
    var interlude = week.interlude || {};
    if (interlude.payloadType && !VALID_PAYLOAD_TYPES[interlude.payloadType]) {
      errors.push(wn + ' interlude.payloadType: "' + interlude.payloadType + '" not supported');
    }

    // -- weeklyComponent.value on non-boss weeks --
    if (!week.isBossWeek) {
      var wc = week.weeklyComponent || {};
      if (wc.value === undefined || wc.value === null || wc.value === '') {
        errors.push(wn + ': weeklyComponent.value is missing or empty');
      }
      nonBossValues.push(wc.value);
    }
  });

  // ── Cross-week map progression validation ─────────────────────────────────
  if (weekMapSnapshots.length >= 2) {
    // Impossible tile regressions: cleared→locked, anomaly→locked
    var REGRESSION_PAIRS = { 'cleared→locked': true, 'anomaly→locked': true };
    var firstDims = weekMapSnapshots[0].dims;

    for (var mi = 1; mi < weekMapSnapshots.length; mi++) {
      var prev = weekMapSnapshots[mi - 1];
      var curr = weekMapSnapshots[mi];
      var prevWn = 'Week ' + (prev.weekIndex + 1);
      var currWn = 'Week ' + (curr.weekIndex + 1);

      // Grid dimension consistency (warning — dimensions could change for narrative reasons)
      if (curr.dims.rows !== firstDims.rows || curr.dims.columns !== firstDims.columns) {
        warnings.push(currWn + ' mapState gridDimensions (' + curr.dims.rows + 'x' + curr.dims.columns +
          ') differ from Week 1 (' + firstDims.rows + 'x' + firstDims.columns + ')');
      }

      // Tile state regressions (error — logically impossible)
      for (var coord in prev.tileByCoord) {
        if (curr.tileByCoord[coord]) {
          var transition = prev.tileByCoord[coord] + '\u2192' + curr.tileByCoord[coord];
          if (REGRESSION_PAIRS[transition]) {
            errors.push(prevWn + '\u2192' + currWn + ' tile (' + coord + '): impossible regression ' + transition);
          }
        }
      }

      if (prev.hasComparableState && curr.hasComparableState && prev.fingerprint && curr.fingerprint && prev.fingerprint === curr.fingerprint) {
        errors.push(currWn + ' map tiles identical to previous week — no visible evolution');
      }
    }
  }

  var unreferencedArtifactFragments = fragments.filter(function (fragment) {
    return fragment && fragment.id && !referencedArtifactFragments[normalizeId(fragment.id)];
  });
  if (unreferencedArtifactFragments.length > 0) {
    errors.push(unreferencedArtifactFragments.length + ' fragment(s) never referenced by sessions, oracle entries, or cipher referenceTargets: ' +
      unreferencedArtifactFragments.map(function (fragment) { return fragment.id; }).join(', '));
  }

  // ── Boss encounter validation ────────────────────────────────────────────
  if (bossWeeks.length === 1) {
    var boss = bossWeeks[0].bossEncounter || {};
    var inputs = boss.componentInputs || [];
    var nonBossCount = weeks.filter(function (w) { return !w.isBossWeek; }).length;

    // componentInputs count must match non-boss weeks (error — deterministic invariant)
    if (inputs.length > 0 && inputs.length !== nonBossCount) {
      errors.push('Boss componentInputs has ' + inputs.length + ' values but there are ' + nonBossCount + ' non-boss weeks');
    }

    // componentInputs values must exactly match collected weeklyComponent values in order
    if (inputs.length === nonBossValues.length && inputs.length > 0) {
      for (var ci = 0; ci < inputs.length; ci++) {
        if (String(inputs[ci]) !== String(nonBossValues[ci])) {
          errors.push('Boss componentInputs[' + ci + '] = "' + inputs[ci] + '" does not match Week ' + (ci + 1) + ' weeklyComponent.value = "' + nonBossValues[ci] + '"');
        }
      }
    }

    // ── A1Z26 numeric validity (when boss decode is standard alphabetic) ────
    var dk = boss.decodingKey;
    if (dk && dk.referenceTable && !isStandardAlphaTable(dk.referenceTable)) {
      errors.push('Boss decodingKey.referenceTable must be a standard A1Z26 string (1=A ... 26=Z)');
    }
    var isA1Z26Boss = dk && dk.referenceTable && isStandardAlphaTable(dk.referenceTable);

    if (isA1Z26Boss) {
      // Each non-boss weeklyComponent.value must be an integer 1–26
      nonBossValues.forEach(function (val, vi) {
        if (val === undefined || val === null || val === '') return; // already flagged above
        var n = Number(val);
        if (isNaN(n) || n !== Math.floor(n)) {
          errors.push('Week ' + (vi + 1) + ' weeklyComponent.value "' + val + '" is not an integer (required for A1Z26 decode)');
        } else if (n < 1 || n > 26) {
          errors.push('Week ' + (vi + 1) + ' weeklyComponent.value ' + n + ' out of A1Z26 range (1\u201326)');
        }
      });

      // Verify demoPassword matches deterministic derivation
      var derivedPassword = decodeA1Z26(
        (boss.componentInputs || []).map(function (v) { return Number(v); })
      );
      if (derivedPassword && meta.demoPassword) {
        if (meta.demoPassword !== derivedPassword) {
          errors.push('meta.demoPassword "' + meta.demoPassword + '" does not match derived A1Z26 password "' + derivedPassword + '"');
        }
      }

      // ── Reordering convergence: the seal must be able to find the answer ──
      // (Wave 2.) The tooling that encrypts the ending derives the password
      // from the boss page, and its LAST resort is decodeA1Z26 of
      // componentInputs — the week-order string. For every pattern but one
      // that is the right answer. For `reordering` the week-order string is
      // deliberately the WRONG word, so unless the boss states the true
      // password in the form the deriver recognises, the booklet ships sealed
      // with the anagram: the player does six weeks of work, solves the
      // reorder correctly, types the right word, and is locked out of their
      // own ending. Nothing else in this repo would notice — the JSON is
      // valid, the render is clean, and the failure only exists at unlock.
      //
      // ERROR, not a warning, and safe to be one: no corpus fixture declares a
      // convergencePattern, so this can only fire on a booklet that opted in.
      // The phrase is a PRESENCE check against the doctrine's required
      // wording (INST_CONVERGENCE_DESIGN), not a second password derivation.
      var declaredPattern = String(((meta.artifactIntent || {}).convergencePattern) || '').toLowerCase();
      if (declaredPattern === 'reordering') {
        var bossReveal = [
          boss.passwordRevealInstruction, boss.narrative, boss.convergenceProof
        ].filter(Boolean).join('\n');
        var statedMatch = bossReveal.match(/\bpassword\s+is\s+([A-Za-z0-9-]{3,})\b/);
        if (!statedMatch) {
          errors.push('convergencePattern is "reordering" but the boss encounter never states its final password '
            + '("The password is WORD."). The sealed password would be the week-order string "'
            + (derivedPassword || '?') + '", which this pattern defines as the WRONG reading.');
        } else {
          var stated = statedMatch[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
          var sortLetters = function (s) { return String(s || '').split('').sort().join(''); };
          if (derivedPassword && sortLetters(stated) !== sortLetters(derivedPassword)) {
            errors.push('convergencePattern is "reordering" but the stated password "' + stated
              + '" is not a rearrangement of the collected letters "' + derivedPassword
              + '" — the player cannot reach it from the values the booklet had them collect.');
          }
        }
      }

      // Repeated decoded letters (warning — stylistic, not impossible)
      if (derivedPassword) {
        var letterCounts = {};
        for (var li = 0; li < derivedPassword.length; li++) {
          var ch = derivedPassword[li];
          letterCounts[ch] = (letterCounts[ch] || 0) + 1;
        }
        for (var letter in letterCounts) {
          if (letterCounts[letter] > 1) {
            warnings.push('A1Z26 decoded password "' + derivedPassword + '" has repeated letter "' + letter + '" (\u00d7' + letterCounts[letter] + ')');
          }
        }
      }
    }

    // binaryChoice → binaryChoiceAcknowledgement cross-check
    if (hasBinaryChoice) {
      var bca = boss.binaryChoiceAcknowledgement;
      if (!bca) {
        errors.push('A session has binaryChoice (' + binaryChoiceWeek + ') but boss encounter has no binaryChoiceAcknowledgement');
      } else {
        if (!bca.ifA) {
          errors.push('Boss binaryChoiceAcknowledgement missing ifA');
        }
        if (!bca.ifB) {
          errors.push('Boss binaryChoiceAcknowledgement missing ifB');
        }
      }
    }
  }

  // Return serialization-safe shape (plain object, not array-with-custom-properties)
  return { errors: errors, warnings: warnings };
}

// ── Part 4: Pipeline stage validators ─────────────────────────────────────────

export function validateLayerBibleStage(result) {
  if (!result) return 'Layer Codex → missing required sections (null result).';
  var errors = [];
  var warnings = [];
  // Hard failures: top-level sections must exist (matches pre-restructure behavior)
  if (!result.storyLayer) errors.push('Layer Codex → storyLayer: missing entirely');
  if (!result.gameLayer) errors.push('Layer Codex → gameLayer: missing entirely');
  if (!result.governingLayer) errors.push('Layer Codex → governingLayer: missing entirely');
  if (!result.designLedger) {
    errors.push('Layer Codex → designLedger: missing entirely');
  } else {
    // designLedger sub-fields are hard requirements (were checked before restructure)
    if (!result.designLedger.mysteryQuestions) errors.push('Layer Codex → designLedger: missing mysteryQuestions');
    if (!result.designLedger.weekTransformations) errors.push('Layer Codex → designLedger: missing weekTransformations');
    if (!result.designLedger.falseAssumptions) warnings.push('Layer Codex → designLedger: missing falseAssumptions');
    if (!result.designLedger.motifPayoffs) warnings.push('Layer Codex → designLedger: missing motifPayoffs');
    if (!result.designLedger.finalRevealRecontextualizes) warnings.push('Layer Codex → designLedger: missing finalRevealRecontextualizes');
  }
  // Advisory warnings: sub-field checks for debugging (logged, not blocking)
  if (result.storyLayer) {
    if (!result.storyLayer.premise) warnings.push('Layer Codex → storyLayer: missing premise');
    if (!result.storyLayer.protagonist) warnings.push('Layer Codex → storyLayer: missing protagonist');
    if (!result.storyLayer.antagonistPressure) warnings.push('Layer Codex → storyLayer: missing antagonistPressure');
    if (!result.storyLayer.recurringMotifs) warnings.push('Layer Codex → storyLayer: missing recurringMotifs');
  }
  if (result.gameLayer) {
    if (!result.gameLayer.coreLoop) warnings.push('Layer Codex → gameLayer: missing coreLoop');
    if (!result.gameLayer.persistentTopology) warnings.push('Layer Codex → gameLayer: missing persistentTopology');
    if (!result.gameLayer.majorZones) warnings.push('Layer Codex → gameLayer: missing majorZones');
  }
  if (result.governingLayer) {
    if (!result.governingLayer.institutionName) warnings.push('Layer Codex → governingLayer: missing institutionName');
    if (!result.governingLayer.departments) warnings.push('Layer Codex → governingLayer: missing departments');
  }
  if (result.designLedger && !result.designLedger.clueEconomy) {
    warnings.push('Layer Codex → designLedger: missing clueEconomy');
  }
  if (warnings.length > 0) {
    console.warn('[LiftRPG] Layer Codex advisory:', warnings.join('; '));
  }
  if (errors.length > 0) return errors.join('; ');
  return '';
}

export function validateCampaignPlanStage(result) {
  if (!result) return 'Campaign Plan → missing required sections (null result).';
  var errors = [];
  var warnings = [];
  var weekByNumber = {};
  var fragmentRegistryById = {};
  var weekFragmentOwners = {};
  var orderedWeeks = [];
  // Hard failures: weeks[] and bossPlan must exist (matches pre-restructure behavior)
  if (!Array.isArray(result.weeks)) {
    errors.push('Campaign Plan → weeks: missing or not an array');
  } else if (result.weeks.length === 0) {
    errors.push('Campaign Plan → weeks: empty array');
  }
  if (!result.bossPlan) errors.push('Campaign Plan → bossPlan: missing');
  // Advisory warnings: sub-field checks for debugging
  if (!result.topology) {
    warnings.push('Campaign Plan → topology: missing entirely');
  } else if (!result.topology.zones) {
    warnings.push('Campaign Plan → topology: missing zones');
  }
  if (!Array.isArray(result.overflowRegistry)) {
    errors.push('Campaign Plan → overflowRegistry: missing or not an array');
  }
  if (!Array.isArray(result.fragmentRegistry)) {
    errors.push('Campaign Plan → fragmentRegistry: missing or not an array');
  } else {
    result.fragmentRegistry.forEach(function (f, i) {
      var label = 'Campaign Plan → fragmentRegistry[' + i + ']';
      var normalizedId = normalizeId(f && f.id);
      if (!normalizedId) {
        errors.push(label + ': missing id');
        return;
      }
      if (fragmentRegistryById[normalizedId]) {
        errors.push(label + ': duplicate id "' + f.id + '"');
      } else {
        fragmentRegistryById[normalizedId] = f;
      }
      if (!f.weekRef) {
        errors.push(label + ': missing weekRef');
      }
    });
  }
  if (Array.isArray(result.weeks)) {
    result.weeks.forEach(function (w, i) {
      var label = 'Campaign Plan → weeks[' + i + ']';
      if (!w.weekNumber) {
        errors.push(label + ': missing weekNumber');
        return;
      }
      if (weekByNumber[w.weekNumber]) {
        errors.push(label + ': duplicate weekNumber ' + w.weekNumber);
      } else {
        weekByNumber[w.weekNumber] = w;
        orderedWeeks.push(w);
      }
      if (!w.sessionCount || w.sessionCount < 1) {
        errors.push(label + ': missing sessionCount');
      }
      if (!w.isBossWeek && !String(w.cipherType || '').trim()) {
        errors.push(label + ': cipherType missing for non-boss week');
      }
      if (!Array.isArray(w.fragmentIds)) {
        errors.push(label + ': fragmentIds missing or not an array');
      } else {
        var seenWeekFragmentIds = {};
        w.fragmentIds.forEach(function (fragmentId, fragmentIndex) {
          var normalizedId = normalizeId(fragmentId);
          if (!normalizedId) {
            errors.push(label + ': fragmentIds[' + fragmentIndex + '] is empty');
            return;
          }
          if (seenWeekFragmentIds[normalizedId]) {
            errors.push(label + ': duplicate fragmentIds entry "' + fragmentId + '"');
            return;
          }
          seenWeekFragmentIds[normalizedId] = true;
          if (weekFragmentOwners[normalizedId] && weekFragmentOwners[normalizedId] !== w.weekNumber) {
            errors.push(label + ': fragmentIds[' + fragmentIndex + '] "' + fragmentId + '" is also assigned to week ' + weekFragmentOwners[normalizedId]);
          } else {
            weekFragmentOwners[normalizedId] = w.weekNumber;
          }
        });
        if (w.isBossWeek && w.fragmentIds.length > Number(w.sessionCount || 0)) {
          errors.push(label + ': boss week has ' + w.fragmentIds.length + ' fragmentIds but only ' + w.sessionCount + ' sessions to reference them');
        }
      }
    });
  }
  orderedWeeks
    .slice()
    .sort(function (left, right) { return Number(left.weekNumber || 0) - Number(right.weekNumber || 0); })
    .reduce(function (prevCipherType, week) {
      if (!week || week.isBossWeek) return prevCipherType;
      var label = 'Campaign Plan → week ' + week.weekNumber;
      var currentCipherType = String(week.cipherType || '').trim();
      if (prevCipherType && currentCipherType && prevCipherType === currentCipherType) {
        errors.push(label + ': cipherType "' + currentCipherType + '" repeats the prior non-boss week');
      }
      return currentCipherType || prevCipherType;
    }, '');
  var hasDetailedMapPlanning = orderedWeeks.some(function (week) {
    if (!week || week.isBossWeek) return false;
    return Object.prototype.hasOwnProperty.call(week, 'stateSnapshot')
      || Object.prototype.hasOwnProperty.call(week, 'mapReuse')
      || Object.prototype.hasOwnProperty.call(week, 'stateChange')
      || Object.prototype.hasOwnProperty.call(week, 'newGateOrUnlock');
  });
  if (hasDetailedMapPlanning) {
    orderedWeeks
      .slice()
      .sort(function (left, right) { return Number(left.weekNumber || 0) - Number(right.weekNumber || 0); })
      .reduce(function (prevFingerprint, week) {
        if (!week || week.isBossWeek) return prevFingerprint;
        var label = 'Campaign Plan → week ' + week.weekNumber;
        var stateSnapshot = normalizePlanningText(week.stateSnapshot);
        var mapReuse = normalizePlanningText(week.mapReuse);
        var stateChange = normalizePlanningText(week.stateChange);
        var newGateOrUnlock = normalizePlanningText(week.newGateOrUnlock);
        if (!stateSnapshot) errors.push(label + ': stateSnapshot missing');
        if (!mapReuse) errors.push(label + ': mapReuse missing');
        if (!stateChange) {
          errors.push(label + ': stateChange missing');
        } else if (isMapNoChangePlaceholder(stateChange)) {
          errors.push(label + ': stateChange cannot be a no-change placeholder');
        }
        if (!newGateOrUnlock) {
          errors.push(label + ': newGateOrUnlock missing');
        } else if (isMapNoChangePlaceholder(newGateOrUnlock)) {
          errors.push(label + ': newGateOrUnlock cannot be a no-change placeholder');
        }
        var fingerprint = [stateSnapshot, stateChange, newGateOrUnlock].join('::');
        if (prevFingerprint && stateSnapshot && stateChange && newGateOrUnlock && fingerprint === prevFingerprint) {
          errors.push(label + ': stateSnapshot/stateChange/newGateOrUnlock repeat the prior non-boss week');
        }
        return fingerprint || prevFingerprint;
      }, '');
  }
  if (Array.isArray(result.weeks)) {
    var overflowRegistry = Array.isArray(result.overflowRegistry) ? result.overflowRegistry : [];
    var overflowByWeek = {};
    overflowRegistry.forEach(function (entry, index) {
      if (!entry || !entry.weekNumber) {
        errors.push('Campaign Plan → overflowRegistry[' + index + ']: missing weekNumber');
        return;
      }
      if (overflowByWeek[entry.weekNumber]) {
        errors.push('Campaign Plan → overflowRegistry has duplicate entry for week ' + entry.weekNumber);
      }
      overflowByWeek[entry.weekNumber] = entry;
    });
    result.weeks.forEach(function (week, index) {
      if (!week || !week.weekNumber) return;
      var label = 'Campaign Plan → weeks[' + index + ']';
      if (week.sessionCount > 3) return;
      if (week.overflowFragmentId) {
        errors.push(label + ': sessionCount <= 3 but overflowFragmentId should be omitted');
      }
    });
    result.weeks.forEach(function (week, index) {
      if (!week || !week.sessionCount || week.sessionCount <= 3) return;
      var label = 'Campaign Plan → weeks[' + index + ']';
      if (!week.overflowFragmentId) {
        errors.push(label + ': sessionCount > 3 but overflowFragmentId is missing');
      }
      var planned = overflowByWeek[week.weekNumber];
      if (!planned) {
        errors.push(label + ': sessionCount > 3 but overflowRegistry has no entry for week ' + week.weekNumber);
        return;
      }
      if (!planned.id) {
        errors.push('Campaign Plan → overflowRegistry week ' + week.weekNumber + ': missing id');
      }
      if (!planned.documentType) {
        errors.push('Campaign Plan → overflowRegistry week ' + week.weekNumber + ': missing documentType');
      }
      if (week.overflowFragmentId && planned.id && week.overflowFragmentId !== planned.id) {
        errors.push(label + ': overflowFragmentId "' + week.overflowFragmentId + '" does not match overflowRegistry id "' + planned.id + '"');
      }
    });
  }
  if (Array.isArray(result.fragmentRegistry)) {
    var fragmentDocTypeCounts = {};
    result.fragmentRegistry.forEach(function (entry, index) {
      var label = 'Campaign Plan → fragmentRegistry[' + index + ']';
      var normalizedId = normalizeId(entry && entry.id);
      var rawDocumentType = String((entry && entry.documentType) || '').trim();
      var canonicalDocumentType = rawDocumentType
        ? (DOCUMENT_TYPE_ALIASES[rawDocumentType] || rawDocumentType).toLowerCase()
        : '';
      if (!normalizedId || !entry.weekRef || !weekByNumber[entry.weekRef]) {
        if (entry && entry.weekRef && !weekByNumber[entry.weekRef]) {
          errors.push(label + ': weekRef "' + entry.weekRef + '" does not match any planned week');
        }
        return;
      }
      var owningWeek = weekByNumber[entry.weekRef];
      var fragmentIds = Array.isArray(owningWeek.fragmentIds) ? owningWeek.fragmentIds : [];
      var listed = fragmentIds.some(function (fragmentId) {
        return normalizeId(fragmentId) === normalizedId;
      });
      if (!listed) {
        errors.push(label + ': id "' + entry.id + '" is not listed in the owning week\'s fragmentIds array (week ' + entry.weekRef + ')');
      }
      if (canonicalDocumentType && DOCUMENT_TYPE_ENUM.indexOf(canonicalDocumentType) !== -1) {
        fragmentDocTypeCounts[canonicalDocumentType] = (fragmentDocTypeCounts[canonicalDocumentType] || 0) + 1;
      }
    });
    if (result.fragmentRegistry.length >= 8) {
      var documentTypes = Object.keys(fragmentDocTypeCounts);
      if (documentTypes.length < 3) {
        errors.push('Campaign Plan → fragmentRegistry: uses only ' + documentTypes.length + ' documentType values across ' + result.fragmentRegistry.length + ' planned fragments');
      }
      documentTypes.forEach(function (documentType) {
        var count = fragmentDocTypeCounts[documentType] || 0;
        if ((count / result.fragmentRegistry.length) > 0.45) {
          errors.push('Campaign Plan → fragmentRegistry: documentType "' + documentType + '" accounts for ' + count + ' of ' + result.fragmentRegistry.length + ' planned fragments');
        }
      });
    }
  }
  if (Array.isArray(result.weeks)) {
    result.weeks.forEach(function (week, index) {
      if (!week || !Array.isArray(week.fragmentIds)) return;
      var label = 'Campaign Plan → weeks[' + index + ']';
      week.fragmentIds.forEach(function (fragmentId, fragmentIndex) {
        var normalizedId = normalizeId(fragmentId);
        var registryEntry = fragmentRegistryById[normalizedId];
        if (!registryEntry) {
          errors.push(label + ': fragmentIds[' + fragmentIndex + '] "' + fragmentId + '" is not present in fragmentRegistry');
          return;
        }
        if (registryEntry.weekRef && registryEntry.weekRef !== week.weekNumber) {
          errors.push(label + ': fragmentIds[' + fragmentIndex + '] "' + fragmentId + '" belongs to week ' + registryEntry.weekRef + ' in fragmentRegistry');
        }
      });
    });
  }
  if (warnings.length > 0) {
    console.warn('[LiftRPG] Campaign Plan advisory:', warnings.join('; '));
  }
  if (errors.length > 0) return errors.join('; ');
  // Cipher family variety (GAP-3, DOCTRINE-LEDGER): the doctrine demands
  // ≥ min(max(weekCount-2,3), weekCount-1) distinct families across non-boss
  // weeks. Emitted as an error string matched by DEGRADED_PATTERNS — the
  // stage is accepted with a warning (D19), never blocked.
  if (result && Array.isArray(result.weeks)) {
    var nonBossTypes = result.weeks
      .filter(function (w) { return w && !w.isBossWeek; })
      .map(function (w) { return String(w.cipherType || '').trim().toLowerCase(); })
      .filter(Boolean);
    var weekCount = result.weeks.length;
    var needed = Math.min(Math.max(weekCount - 2, 3), Math.max(weekCount - 1, 1));
    var distinct = {};
    nonBossTypes.forEach(function (t) { distinct[t] = 1; });
    var have = Object.keys(distinct).length;
    if (nonBossTypes.length >= 3 && have < needed) {
      errors.push('Campaign Plan: cipher variety below doctrine — ' + have
        + ' distinct famil' + (have === 1 ? 'y' : 'ies') + ' across ' + nonBossTypes.length
        + ' non-boss weeks (doctrine wants ' + needed + ')');
    }
  }

  return '';
}

export function validateWeeksStage(result, expectedWeeks) {
  if (!result || !Array.isArray(result.weeks)) {
    return 'Week stage validation failed: expected a { weeks:[...] } object.';
  }
  var requested = (expectedWeeks || []).slice().sort(function (a, b) { return a - b; });
  var returned = result.weeks.map(function (week) { return week.weekNumber; }).sort(function (a, b) { return a - b; });
  if (requested.length !== returned.length) {
    return 'Week stage validation failed: expected ' + requested.length + ' weeks but received ' + returned.length + '.';
  }
  for (var i = 0; i < requested.length; i++) {
    if (requested[i] !== returned[i]) {
      return 'Week stage validation failed: expected weeks [' + requested.join(', ') + '] but received [' + returned.join(', ') + '].';
    }
  }
  return '';
}

export function validateFragmentsStage(result, expectedRegistry) {
  if (!result || !Array.isArray(result.fragments)) {
    return 'Fragment stage validation failed: expected a { fragments:[...] } object.';
  }
  var expected = (expectedRegistry || []).map(function (entry) { return normalizeId(entry.id); }).filter(Boolean);
  if (!expected.length) return '';
  var seen = {};
  var extras = [];
  var invalid = [];
  var missingDesignSpec = [];
  var missingTitle = [];
  var missingDocType = [];
  var missingAuthor = [];
  var pointerShape = [];
  var validDocLookup = {};
  DOCUMENT_TYPE_ENUM.forEach(function (t) { validDocLookup[t] = true; });

  result.fragments.forEach(function (fragment) {
    var id = normalizeId(fragment && fragment.id);
    if (!id) return;
    // Wave 4a: shape only. Whether the citation RESOLVES needs the whole
    // booklet and is checked on the assembled path.
    collectFragmentPointerShapeErrors(fragment).forEach(function (m) { pointerShape.push(m); });
    if (!fragment.content && !fragment.bodyParagraphs && !fragment.bodyText && !fragment.body) {
      invalid.push(fragment.id);
    }
    if (!fragment.designSpec || typeof fragment.designSpec !== 'object') {
      missingDesignSpec.push(fragment.id);
    }
    if (!fragment.title) {
      missingTitle.push(fragment.id);
    }
    if (!fragment.documentType) {
      missingDocType.push(fragment.id);
    } else if (!validDocLookup[fragment.documentType] && !DOCUMENT_TYPE_ALIASES[fragment.documentType]) {
      missingDocType.push(fragment.id + ' (invalid: "' + fragment.documentType + '")');
    }
    if (!fragment.inWorldAuthor) {
      missingAuthor.push(fragment.id);
    }
    seen[id] = true;
    if (expected.indexOf(id) === -1) extras.push(fragment.id);
  });
  if (missingDesignSpec.length > 0) {
    console.warn('[LiftRPG] Fragments missing designSpec: ' + missingDesignSpec.join(', '));
  }
  if (invalid.length > 0) {
    return 'Fragment stage validation failed: missing content/body in IDs ' + invalid.slice(0, 8).join(', ') + '.';
  }
  if (missingTitle.length > 0) {
    console.warn('[LiftRPG] Fragments missing title: ' + missingTitle.join(', '));
  }
  if (missingDocType.length > 0) {
    return 'Fragment stage validation failed: missing/invalid documentType in IDs ' + missingDocType.slice(0, 8).join(', ') + '.';
  }
  if (missingAuthor.length > 0) {
    return 'Fragment stage validation failed: missing inWorldAuthor in IDs ' + missingAuthor.slice(0, 8).join(', ') + '.';
  }
  if (pointerShape.length > 0) {
    return 'Fragment stage validation failed: ' + pointerShape.slice(0, 4).join('; ') + '.';
  }
  var missing = expected.filter(function (id) { return !seen[id]; });
  if (missing.length > 0) {
    return 'Fragment stage validation failed: missing IDs ' + missing.slice(0, 8).join(', ') + '.';
  }
  if (extras.length > 0) {
    return 'Fragment stage validation failed: unexpected IDs ' + extras.slice(0, 8).join(', ') + '.';
  }
  return '';
}

/**
 * Validates the skeleton output shape.
 * Convention: returns '' on pass, non-empty string on hard failure.
 */
export function validateSkeletonStage(result, weekCount) {
  if (!result || typeof result !== 'object') return 'Skeleton: not an object';

  // ── meta ──
  var meta = result.meta;
  if (!meta) return 'Skeleton → meta: missing';
  if (!meta.blockTitle) return 'Skeleton → meta.blockTitle: missing';
  if (!meta.worldContract) return 'Skeleton → meta.worldContract: missing';
  if (!meta.weeklyComponentType) return 'Skeleton → meta.weeklyComponentType: missing';
  if (!meta.narrativeVoice || !meta.narrativeVoice.person) {
    console.warn('Skeleton → meta.narrativeVoice: missing or incomplete (advisory)');
  }
  if (!meta.literaryRegister || !meta.literaryRegister.name) {
    console.warn('Skeleton → meta.literaryRegister: missing or incomplete (advisory)');
  }
  if (!meta.structuralShape || !meta.structuralShape.resolution) {
    console.warn('Skeleton → meta.structuralShape: missing or incomplete (advisory)');
  }
  if (!meta.artifactIdentity || !meta.artifactIdentity.artifactClass) {
    console.warn('Skeleton → meta.artifactIdentity: missing or incomplete (advisory)');
  }

  // ── artifactIntent (Layer 3 planning contract) ──
  var VALID_BRIEF_MODES = { explicit: 1, sparse: 1, empty: 1, mashup: 1, 'reference-led': 1, 'personal-subject': 1 };
  var VALID_FIDELITY_MODES = { literal: 1, interpretive: 1, compositional: 1 };
  var VALID_HOME_PULLS = { story: 1, game: 1, investigation: 1, mixed: 1 };
  // arcFamily / mechanicGrammarFamily are imported from contract-constants.mjs
  // (the menus the skeleton prompt offers). They are arrays, not object maps —
  // membership is indexOf, not a property read.

  var intent = meta.artifactIntent;
  if (!intent || typeof intent !== 'object') {
    console.warn('Skeleton → meta.artifactIntent: missing (advisory — skeleton should produce this)');
  } else {
    if (!intent.briefMode || !VALID_BRIEF_MODES[intent.briefMode]) {
      console.warn('Skeleton → artifactIntent.briefMode: "' + (intent.briefMode || '') + '" not in known values (advisory)');
    }
    if (!intent.fidelityMode || !VALID_FIDELITY_MODES[intent.fidelityMode]) {
      console.warn('Skeleton → artifactIntent.fidelityMode: "' + (intent.fidelityMode || '') + '" not in known values (advisory)');
    }
    if (!intent.arcFamily || VALID_ARC_FAMILIES.indexOf(intent.arcFamily) === -1) {
      console.warn('Skeleton → artifactIntent.arcFamily: "' + (intent.arcFamily || '') + '" not in known families (advisory)');
    }
    if (!intent.mechanicGrammarFamily || VALID_MECHANIC_GRAMMAR_FAMILIES.indexOf(intent.mechanicGrammarFamily) === -1) {
      console.warn('Skeleton → artifactIntent.mechanicGrammarFamily: "' + (intent.mechanicGrammarFamily || '') + '" not in known families (advisory)');
    }
    if (!intent.homePull || !VALID_HOME_PULLS[intent.homePull]) {
      console.warn('Skeleton → artifactIntent.homePull: "' + (intent.homePull || '') + '" not in known values (advisory)');
    }
    var ecology = intent.documentEcology;
    if (!ecology || typeof ecology !== 'object') {
      console.warn('Skeleton → artifactIntent.documentEcology: missing (advisory)');
    } else {
      if (!Array.isArray(ecology.dominant) || ecology.dominant.length === 0) {
        console.warn('Skeleton → artifactIntent.documentEcology.dominant: empty or missing (advisory)');
      }
      if (!Array.isArray(ecology.forbidden) || ecology.forbidden.length === 0) {
        console.warn('Skeleton → artifactIntent.documentEcology.forbidden: empty or missing (advisory)');
      }
    }
    var excl = intent.exclusions;
    if (!excl || typeof excl !== 'object') {
      console.warn('Skeleton → artifactIntent.exclusions: missing (advisory)');
    } else {
      if (!Array.isArray(excl.mechanicExclusions) || excl.mechanicExclusions.length === 0) {
        console.warn('Skeleton → artifactIntent.exclusions.mechanicExclusions: empty or missing (advisory)');
      }
      if (!Array.isArray(excl.documentExclusions) || excl.documentExclusions.length === 0) {
        console.warn('Skeleton → artifactIntent.exclusions.documentExclusions: empty or missing (advisory)');
      }
      if (!Array.isArray(excl.arcExclusions) || excl.arcExclusions.length === 0) {
        console.warn('Skeleton → artifactIntent.exclusions.arcExclusions: empty or missing (advisory)');
      }
      // ── The neighbour rule (Wave 2) ──
      // "Every booklet must refuse something" was satisfiable by refusing
      // anything, and the cheapest refusal is the most distant family — which
      // costs nothing and prevents no blur. What a booklet actually risks
      // becoming is its NEIGHBOUR: the cluster next door shares the pressure
      // shape, so the drift is invisible from inside. Advisory by D19 (this is
      // generation policy, and a booklet that refuses the wrong thing is still
      // a booklet), but named: before this, a refusal that protected nothing
      // looked identical to one that did.
      var neighbors = resolveNeighborFamilies(intent.mechanicGrammarFamily);
      if (neighbors.length && Array.isArray(excl.mechanicExclusions) && excl.mechanicExclusions.length) {
        var declaredEx = excl.mechanicExclusions.map(function (e) { return String(e || '').trim().toLowerCase(); });
        var refusedNeighbors = neighbors.filter(function (n) { return declaredEx.indexOf(n) !== -1; });
        // Reconstruction families are mutual siblings, so one refusal inside a
        // seven-member cluster barely narrows anything — two is the floor there.
        var required = FAMILY_CLUSTERS[intent.mechanicGrammarFamily] === 'reconstruction' ? 2 : 1;
        if (refusedNeighbors.length < required) {
          console.warn('Skeleton → artifactIntent.exclusions.mechanicExclusions: "'
            + intent.mechanicGrammarFamily + '" refuses ' + refusedNeighbors.length + ' of its '
            + neighbors.length + ' neighbour families (needs ' + required
            + ') — refusing a distant family prevents no blur (advisory). Neighbours: '
            + neighbors.join(', '));
        }
      }
    }
    // ── The convergence pattern (Wave 2) ──
    if (!intent.convergencePattern || VALID_CONVERGENCE_PATTERNS.indexOf(intent.convergencePattern) === -1) {
      console.warn('Skeleton → artifactIntent.convergencePattern: "' + (intent.convergencePattern || '')
        + '" not in known patterns (advisory — an undeclared pattern is a booklet that will default to sequential assembly)');
    }
    // ── The triptych's audit trail (Wave 2) ──
    // The rejected readings are the only externally visible evidence that
    // three candidates existed. Two checks, both advisory: fewer than two
    // entries means the deliberation was not recorded, and an entry matching
    // the winner on both family axes means the "candidates" were one book
    // described twice — the exact failure mode the MAJOR-axis rule exists to
    // prevent, and the one that cannot be seen from the winner alone.
    var rejected = ((intent._x || {}).rejectedReadings) || null;
    if (!Array.isArray(rejected) || rejected.length < 2) {
      console.warn('Skeleton → artifactIntent._x.rejectedReadings: '
        + (Array.isArray(rejected) ? rejected.length : 0)
        + ' entries (advisory — the triptych produces three readings, so two must have lost)');
    } else {
      for (var rj = 0; rj < rejected.length; rj++) {
        var cand = rejected[rj] || {};
        var axis = String(cand.axis || '').trim();
        var value = String(cand.value || '').trim().toLowerCase();
        if (axis && REJECTED_READING_AXES.indexOf(axis) === -1) {
          console.warn('Skeleton → artifactIntent._x.rejectedReadings[' + rj + ']: axis "' + axis
            + '" is not a major axis (' + REJECTED_READING_AXES.join(', ')
            + ') — a candidate that differed on a minor axis is not a third reading (advisory)');
        }
        if (!axis || !value) {
          console.warn('Skeleton → artifactIntent._x.rejectedReadings[' + rj
            + ']: missing axis or value (advisory — an unlabelled rejection cannot be checked for difference)');
          continue;
        }
        var winner = axis === 'arcFamily'
          ? String(intent.arcFamily || '').toLowerCase()
          : (axis === 'mechanicGrammarFamily' ? String(intent.mechanicGrammarFamily || '').toLowerCase() : null);
        if (winner !== null && value === winner) {
          console.warn('Skeleton → artifactIntent._x.rejectedReadings[' + rj + ']: declares axis "'
            + axis + '" but names the same value the winner chose ("' + value
            + '") — that is the same book described twice, not a rejected reading (advisory)');
        }
      }
    }

    // ── The recorded reading (§10.1) ──
    // Policy-demand, never a hard failure (D19): the structured skeleton schema
    // lists these as required, so a compliant transport supplies them; a
    // freeform provider that skips them still ships a booklet. What the warning
    // buys is a NAMED absence — before this, a lens that silently stopped
    // recording its reading looked exactly like a lens that never had one.
    var reading = intent.reading;
    if (!reading || typeof reading !== 'object') {
      console.warn('Skeleton → artifactIntent.reading: missing (advisory — the recorded reading is what makes a misread localizable)');
    } else {
      var READING_FIELDS = ['tone', 'register', 'povFrame', 'impliedSetting', 'emotionalArc', 'genreTemplate'];
      for (var ri = 0; ri < READING_FIELDS.length; ri++) {
        var rf = READING_FIELDS[ri];
        if (!reading[rf] || typeof reading[rf] !== 'string' || !reading[rf].trim()) {
          console.warn('Skeleton → artifactIntent.reading.' + rf + ': empty or missing (advisory)');
        }
      }
      // briefEvidence is the load-bearing half: without it the reading is an
      // assertion, and the critic has nothing to check the assertion against.
      if (!reading.briefEvidence || typeof reading.briefEvidence !== 'string' || !reading.briefEvidence.trim()) {
        console.warn('Skeleton → artifactIntent.reading.briefEvidence: empty or missing (advisory — an unevidenced reading cannot be audited against the brief)');
      }
    }
    if (!intent.selectionReason || typeof intent.selectionReason !== 'string' || !intent.selectionReason.trim()) {
      console.warn('Skeleton → artifactIntent.selectionReason: empty or missing (advisory — the triptych ran without recording why the winner won)');
    }
  }

  // ── theme ──
  var theme = result.theme;
  if (!theme) return 'Skeleton → theme: missing';
  if (!theme.visualArchetype) return 'Skeleton → theme.visualArchetype: missing';
  var normalizedArchetype = normalizeThemeArchetype(theme.visualArchetype);
  if (normalizedArchetype !== theme.visualArchetype) {
    console.warn('Skeleton → theme.visualArchetype: "' + theme.visualArchetype + '" normalized to "' + normalizedArchetype + '"');
    theme.visualArchetype = normalizedArchetype;
  }
  if (!theme.palette || !theme.palette.ink || !theme.palette.paper) {
    return 'Skeleton → theme.palette: missing or incomplete (need at least ink + paper)';
  }

  // ── cover ──
  if (!result.cover || !result.cover.title) return 'Skeleton → cover.title: missing';

  // ── weekPlan ──
  var wp = result.weekPlan;
  if (!Array.isArray(wp) || wp.length === 0) return 'Skeleton → weekPlan: missing or empty';
  if (wp.length !== weekCount) {
    return 'Skeleton → weekPlan has ' + wp.length + ' weeks but workout specifies ' + weekCount + ' weeks — must match exactly';
  }
  var lastWeek = wp[wp.length - 1];
  if (!lastWeek.isBossWeek) return 'Skeleton → weekPlan: final week must have isBossWeek: true';

  // Check each week entry has required fields
  for (var i = 0; i < wp.length; i++) {
    var w = wp[i];
    if (!w.weekNumber) return 'Skeleton → weekPlan[' + i + '].weekNumber: missing';
    if (!w.title) return 'Skeleton → weekPlan[' + i + '].title: missing';
    if (!w.mapType) return 'Skeleton → weekPlan[' + i + '].mapType: missing';
    if (!w.sessionCount || w.sessionCount < 1) return 'Skeleton → weekPlan[' + i + '].sessionCount: missing or invalid';
  }

  // ── fragmentRegistry ──
  var fr = result.fragmentRegistry;
  if (!Array.isArray(fr) || fr.length === 0) return 'Skeleton → fragmentRegistry: missing or empty';

  // Cap fragment registry at 12 — more than this exceeds single-call generation capacity
  var MAX_FRAGMENTS = 12;
  if (fr.length > MAX_FRAGMENTS) {
    var originalCount = fr.length;
    // Keep fragments referenced by weekPlan first, then trim to cap
    var referencedIds = {};
    for (var ri = 0; ri < wp.length; ri++) {
      (wp[ri].fragmentIds || []).forEach(function (fid) { referencedIds[fid] = true; });
      if (wp[ri].overflowFragmentId) referencedIds[wp[ri].overflowFragmentId] = true;
    }
    var kept = fr.filter(function (f) { return referencedIds[f.id]; });
    var unreferenced = fr.filter(function (f) { return !referencedIds[f.id]; });
    fr = kept.concat(unreferenced).slice(0, MAX_FRAGMENTS);
    result.fragmentRegistry = fr;
    console.warn('Skeleton → fragmentRegistry trimmed from ' + originalCount + ' to ' + fr.length + ' (cap: ' + MAX_FRAGMENTS + ')');

    // Strip orphaned weekPlan references so flesh stages never see trimmed IDs
    var survivingIds = {};
    for (var si = 0; si < fr.length; si++) survivingIds[fr[si].id] = true;
    for (var pi = 0; pi < wp.length; pi++) {
      if (wp[pi].fragmentIds) {
        wp[pi].fragmentIds = wp[pi].fragmentIds.filter(function (fid) { return survivingIds[fid]; });
      }
      if (wp[pi].overflowFragmentId && !survivingIds[wp[pi].overflowFragmentId]) {
        console.warn('Skeleton → weekPlan[' + pi + '].overflowFragmentId "' + wp[pi].overflowFragmentId + '" removed (not in capped registry)');
        delete wp[pi].overflowFragmentId;
      }
    }
  }

  // Cross-ref: every fragmentId in weekPlan must exist in registry
  var registryIds = {};
  for (var j = 0; j < fr.length; j++) {
    if (!fr[j].id) return 'Skeleton → fragmentRegistry[' + j + ']: missing id';
    registryIds[fr[j].id] = true;
  }
  for (var k = 0; k < wp.length; k++) {
    var fids = wp[k].fragmentIds || [];
    for (var m = 0; m < fids.length; m++) {
      if (!registryIds[fids[m]]) {
        console.warn('Skeleton → weekPlan[' + k + '].fragmentIds references "' + fids[m] + '" not in fragmentRegistry (advisory)');
      }
    }
    if (wp[k].overflowFragmentId && !registryIds[wp[k].overflowFragmentId]) {
      console.warn('Skeleton → weekPlan[' + k + '].overflowFragmentId "' + wp[k].overflowFragmentId + '" not in fragmentRegistry (advisory)');
    }
  }

  // ── bossPlan ──
  if (!result.bossPlan) return 'Skeleton → bossPlan: missing';
  if (!result.bossPlan.passwordWord) return 'Skeleton → bossPlan.passwordWord: missing';

  // ── endingVariants ──
  if (!Array.isArray(result.endingVariants) || result.endingVariants.length === 0) {
    return 'Skeleton → endingVariants: missing or empty';
  }

  return '';
}

// ── The knowing stage (§11 Wave 1.5) ────────────────────────────────────────
// Same idiom as every other stage validator: '' passes, a string hard-fails
// and costs a retry, console.warn is advisory.
//
// The severity split is D19 applied literally. UNUSABLE SHAPE is a hard fail:
// if the stage did not return an object of arrays there is nothing for the
// prose stages to select from, and the whole point of the stage is gone —
// retrying is the correct spend. Everything about how MUCH was authored, and
// which categories were covered, is generation POLICY and warns only. A thin
// knowing still funds more prose than no knowing, and a booklet must never be
// blocked from shipping because a model was terse about paperwork.
//
// NOT BUILT (deliberate, noted so it is not mistaken for an oversight): the
// FUNDING heuristic — particulars-per-150-words measured against the assembled
// prose, per VOICE.md §7 / CHECKLIST.md → FUNDING. It cannot run here (there is
// no prose yet at this stage) and belongs on the assembled-booklet path beside
// the other B-class scans. This validator checks that funds EXIST; the funding
// audit will check that they were SPENT.
export var KNOWING_THIN_COUNT = 3;

export function validateKnowingStage(result) {
  if (!result || typeof result !== 'object') return 'Knowing: not an object';

  var particulars = result.processParticulars;
  if (!particulars || typeof particulars !== 'object' || Array.isArray(particulars)) {
    return 'Knowing → processParticulars: missing or not an object';
  }

  var CATEGORIES = ['instruments', 'paperworkRealities', 'orderOfOperations', 'periodSpecifics'];
  var warnings = [];
  var usableTotal = 0;

  for (var i = 0; i < CATEGORIES.length; i++) {
    var key = CATEGORIES[i];
    var value = particulars[key];
    if (value === undefined || value === null) {
      // periodSpecifics is legitimately omitted when the brief implies no
      // period or place — the schema does not require it either.
      if (key !== 'periodSpecifics') {
        warnings.push(key + ': absent (the prose stages will have nothing to select from here)');
      }
      continue;
    }
    if (!Array.isArray(value)) {
      return 'Knowing → processParticulars.' + key + ': not an array';
    }
    var usable = value.filter(function (entry) {
      return typeof entry === 'string' && entry.trim().length > 0;
    });
    usableTotal += usable.length;
    if (usable.length === 0) {
      warnings.push(key + ': empty');
    } else if (usable.length < KNOWING_THIN_COUNT && key !== 'periodSpecifics') {
      warnings.push(key + ': only ' + usable.length + ' particular(s) — thin, prose will reach for turns');
    }
  }

  if (usableTotal === 0) {
    return 'Knowing → processParticulars: no usable particulars in any category';
  }

  if (warnings.length > 0) {
    console.warn('[LiftRPG] Knowing advisory: ' + warnings.join('; '));
  }
  return '';
}

// ── Error severity classification ───────────────────────────────────────────
// Categorizes validation error strings by severity so runJsonStage can decide
// whether to retry (blocking), accept (degraded), or skip (repairable by
// assembly.js auto-repair).

var REPAIRABLE_PATTERNS = [
  /overflow is not true/,
  /overflow=true but only/,
  /uses "(?:result|description|label)" instead of "text"/,
  /meta\.weekCount.*does not match/i,
  /meta\.totalSessions.*does not match/i,
  /Unknown visualArchetype/i,
  /interlude\.payloadType.*not supported/i,
  /overflowDocument\.id.*not present in overflowRegistry/i,
  /weeklyComponent\.type.*does not match.*weeklyComponentType/i
];

var DEGRADED_PATTERNS = [
  /cipher variety below doctrine/i,
  /missing designSpec/i,
  /missing epigraph/i,
  /epigraph missing/i,
  /missing consequenceOnFull/i
  // falseAssumptions / motifPayoffs / finalRevealRecontextualizes are emitted
  // as WARNINGS post-restructure and never reach this classifier — patterns
  // for them here would be dead code.
];

export function classifyValidationErrors(errors) {
  var blocking = [];
  var repairable = [];
  var degraded = [];

  (errors || []).forEach(function (err) {
    if (REPAIRABLE_PATTERNS.some(function (p) { return p.test(err); })) {
      repairable.push(err);
    } else if (DEGRADED_PATTERNS.some(function (p) { return p.test(err); })) {
      degraded.push(err);
    } else {
      blocking.push(err);
    }
  });

  return { blocking: blocking, repairable: repairable, degraded: degraded };
}
