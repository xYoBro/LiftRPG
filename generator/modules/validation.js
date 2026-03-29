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
  VALID_COMPANION_TYPES,
  VALID_CLOCK_TYPES,
  VALID_ARCHETYPES
} from './constants.js';

import {
  buildContinuityLedger,
  continuityRefExists,
  normalizeId,
  extractInputCountClaims,
  extractEndingBodyText,
  extractYearsFromText,
  collectAnchoredPhrases,
  decodeA1Z26,
  isStandardAlphaTable,
  normalizeThemeArchetype
} from './assembly.js';

// ── Part 1: Continuity validators ─────────────────────────────────────────────

// Normalize component type strings for comparison: trim, lowercase, underscores→spaces
function normalizeComponentType(s) {
  return String(s || '').trim().toLowerCase().replace(/_/g, ' ');
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

  (chunk.weeks || []).forEach(function (week, index) {
    var label = 'Week ' + (week.weekNumber || context.expectedWeeks && context.expectedWeeks[index] || '?');
    var wc = week.weeklyComponent || {};
    if (!week.isBossWeek && expectedWeeklyComponentType && wc.type && normalizeComponentType(wc.type) !== normalizeComponentType(expectedWeeklyComponentType)) {
      errors.push(label + ' weeklyComponent.type "' + wc.type + '" does not match shell meta.weeklyComponentType "' + expectedWeeklyComponentType + '"');
    }

    (week.sessions || []).forEach(function (session, sessionIndex) {
      if (session.fragmentRef && !continuityRefExists(ledger, session.fragmentRef)) {
        errors.push(label + ' session ' + (sessionIndex + 1) + ': fragmentRef "' + session.fragmentRef + '" is not present in fragmentRegistry or overflowRegistry');
      }
    });

    var oracle = (week.fieldOps || {}).oracleTable || (week.fieldOps || {}).oracle || {};
    (oracle.entries || []).forEach(function (entry, entryIndex) {
      if (entry.fragmentRef && !continuityRefExists(ledger, entry.fragmentRef)) {
        errors.push(label + ' oracle[' + entryIndex + ']: fragmentRef "' + entry.fragmentRef + '" is not present in fragmentRegistry or overflowRegistry');
      }
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

/**
 * Per-week structural validation. Runs after each week is generated
 * in the pipeline, before proceeding to the next stage.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateWeekSchema(weekObj, isBoss, expectedOptions) {
  var errors = [];
  var warnings = [];
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
    });
  }

  // Non-boss weeks must have weeklyComponent.extractionInstruction
  if (!isBoss) {
    var wc = weekObj.weeklyComponent || {};
    if (!wc.extractionInstruction) {
      errors.push('Non-boss week missing weeklyComponent.extractionInstruction');
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
      if (!fo.cipher.title) errors.push('cipher.title missing');
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
  }

  // Overflow consistency: overflow must be true when sessions > 3
  if (Array.isArray(weekObj.sessions) && weekObj.sessions.length > 3 && !weekObj.overflow) {
    errors.push('Week has ' + weekObj.sessions.length + ' sessions but overflow is not true');
  }
  if (weekObj.overflow && Array.isArray(weekObj.sessions) && weekObj.sessions.length <= 3) {
    errors.push('Week has overflow=true but only ' + weekObj.sessions.length + ' sessions');
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
    if (!shell.meta.schemaVersion || !String(shell.meta.schemaVersion).match(/^1\.3/)) {
      errors.push('meta.schemaVersion should start with "1.3", got: ' + shell.meta.schemaVersion);
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

export function validateAssembledBooklet(booklet) {
  var errors = [];
  var warnings = []; // soft issues (stylistic, non-fatal) — attached to return value

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
    if (!week.isBossWeek && mapState && mapState.tiles && mapState.tiles.length > 0) {
      var tileByCoord = {};
      (mapState.tiles || []).forEach(function (t) {
        if (t.row !== undefined && t.col !== undefined) {
          tileByCoord[t.row + ',' + t.col] = t.type || 'unknown';
        }
      });
      weekMapSnapshots.push({
        weekIndex: wi,
        dims: mapState.gridDimensions || {},
        tileByCoord: tileByCoord
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
    }
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
    warnings.push('Campaign Plan → overflowRegistry: missing or not an array');
  }
  if (!Array.isArray(result.fragmentRegistry)) {
    warnings.push('Campaign Plan → fragmentRegistry: missing or not an array');
  } else {
    result.fragmentRegistry.forEach(function (f, i) {
      if (!f.id) warnings.push('Campaign Plan → fragmentRegistry[' + i + ']: missing id');
      if (!f.weekRef) warnings.push('Campaign Plan → fragmentRegistry[' + i + ']: missing weekRef');
    });
  }
  if (Array.isArray(result.weeks)) {
    result.weeks.forEach(function (w, i) {
      if (!w.weekNumber) warnings.push('Campaign Plan → weeks[' + i + ']: missing weekNumber');
    });
  }
  if (warnings.length > 0) {
    console.warn('[LiftRPG] Campaign Plan advisory:', warnings.join('; '));
  }
  if (errors.length > 0) return errors.join('; ');
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
  var validDocLookup = {};
  DOCUMENT_TYPE_ENUM.forEach(function (t) { validDocLookup[t] = true; });

  result.fragments.forEach(function (fragment) {
    var id = normalizeId(fragment && fragment.id);
    if (!id) return;
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
  var missing = expected.filter(function (id) { return !seen[id]; });
  if (missing.length > 0) {
    return 'Fragment stage validation failed: missing IDs ' + missing.slice(0, 8).join(', ') + '.';
  }
  if (extras.length > 0) {
    return 'Fragment stage validation failed: unexpected IDs ' + extras.slice(0, 8).join(', ') + '.';
  }
  return '';
}

export function validateEndingsStage(result) {
  if (!result || !Array.isArray(result.endings) || result.endings.length === 0) {
    return 'Finale stage validation failed: expected a non-empty endings array.';
  }
  var issues = [];
  result.endings.forEach(function (ending, i) {
    var label = 'Ending ' + (i + 1);
    if (!ending.variant) issues.push(label + ' missing variant');
    if (!ending.content || typeof ending.content !== 'object') {
      issues.push(label + ' missing content object');
    } else {
      if (!ending.content.body) issues.push(label + ' missing content.body');
      if (!ending.content.documentType) issues.push(label + ' missing content.documentType');
      if (!ending.content.finalLine) issues.push(label + ' missing content.finalLine');
    }
    if (!ending.designSpec) {
      issues.push(label + ' missing designSpec');
    } else if (typeof ending.designSpec === 'object') {
      if (!ending.designSpec.paperTone) issues.push(label + ' designSpec missing paperTone');
    }
    // String designSpec is accepted for backward compatibility (renderer normalizes it)
  });
  return issues.length > 0 ? 'Finale stage: ' + issues.join('; ') : '';
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
  var VALID_ARC_FAMILIES = {
    'slow-burn-investigation': 1, 'institutional-collapse': 1, 'witness-accumulation': 1,
    'contamination-spiral': 1, 'procedural-deepening': 1, 'pilgrimage-approach': 1, 'false-order-to-rupture': 1
  };
  var VALID_MECHANIC_FAMILIES = {
    'survey-grid': 1, 'node-graph': 1, 'timeline-reconstruction': 1,
    'testimony-matrix': 1, 'ledger-board': 1, 'route-tracker': 1, 'profile-assembly': 1
  };
  var VALID_HOME_PULLS = { story: 1, game: 1, investigation: 1, mixed: 1 };

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
    if (!intent.arcFamily || !VALID_ARC_FAMILIES[intent.arcFamily]) {
      console.warn('Skeleton → artifactIntent.arcFamily: "' + (intent.arcFamily || '') + '" not in known families (advisory)');
    }
    if (!intent.mechanicGrammarFamily || !VALID_MECHANIC_FAMILIES[intent.mechanicGrammarFamily]) {
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
  /missing designSpec/i,
  /missing epigraph/i,
  /epigraph missing/i,
  /missing consequenceOnFull/i,
  /missing falseAssumptions/i,
  /missing motifPayoffs/i,
  /missing finalRevealRecontextualizes/i
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
