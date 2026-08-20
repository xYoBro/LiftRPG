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
  // DR-33 (2026-08-18) — the declared convention. The mode table is DERIVED
  // from VALID_CONVERGENCE_PATTERNS one line up, and the rearrange matcher is
  // the teaching half's machine reader. Both live with the contract because
  // scripts/validate.mjs's corpus audit asks the same two questions this file's
  // boss floor asks, and two implementations would be two answers to "did this
  // chain converge?".
  convergenceDerivationMode,
  teachesRearrangement,
  // The settlement doctrine (2026-08-18). The mode menu, the disposition menu
  // and the debt band live with the contract for the reason stated above: the
  // prompt is built from these arrays and the floor is checked against them,
  // so a menu the model was shown and a menu the gate accepts cannot diverge.
  VALID_ENDING_MODES,
  VALID_SETTLEMENT_DISPOSITIONS,
  SETTLEMENT_DEBT_BUDGET,
  // The assembly-page disclosure law (2026-08-18). One counter, two readers:
  // the shell floor below and the harness that proves it.
  ASSEMBLY_DISCLOSURE_MAX_BOX_POINTERS,
  countAssemblyBoxPointers,
  FAMILY_CLUSTERS,
  REJECTED_READING_AXES,
  resolveNeighborFamilies,
  // Wave 4a: the citation grammar and the pointer budgets. The grammar table
  // and its two readers live with VALID_SHELL_FAMILIES (D93) — this module
  // routes severity, it does not own what a pinpoint looks like.
  POINTER_BUDGETS,
  resolveCitationStyle,
  citationPinpoints,
  resolveShellFamily,
  // Teeth Round T1a. Both of these decide BLOCKING stage errors, so both live
  // with the contract rather than here: what a booklet OWES (which families
  // must print a door) and how long its prose may be are statements the prompt
  // surfaces quote too, and validate.mjs ties every copy back to that home.
  VALID_COMPONENT_DIALECTS,
  isDoorLeaningFamily,
  OUTPUT_BUDGETS,
  // W4a — the Ludic Spine. The closed sets and the ref GRAMMAR live with the
  // contract; the booklet INVENTORY (buildSurfaceIndex, below) lives here with
  // the other booklet walkers. Grammar there, inventory here — stated in both
  // files so nobody "unifies" them into one home that has to know both.
  LUDIC_LIBRARY,
  LUDIC_STRUCTURAL_ENTRIES,
  LUDIC_DISCRETIONARY_ENTRIES,
  LUDIC_ARSENAL_ENTRIES,
  ludicArsenalWeekField,
  compositionDiscretionaryFloor,
  SPINE_BUDGETS,
  parseSurfaceRef,
  VALID_DYNAMIC_MARKINGS,
  VALID_EDGE_CADENCES,
  EDGE_CADENCE_REQUIRED_FIELDS,
  // W5a — the Ludic Harvest, tranche 1. Same split: the closed vocabularies and
  // the branch grammar live with the contract, the checks that need the book
  // live here.
  VALID_GATE_STRUCTURES,
  // D144 — the harvest adoption floor's acceptance set. The MENU is derived in
  // contracts/ludic-library.mjs, which is Node-only; this is the same list in
  // the one place a browser module can reach it, held equal in order by
  // ludicRegistryIntegrity() in validate.mjs.
  VALID_HARVEST_PATTERNS,
  GATE_STRUCTURE_SHAPES,
  VALID_LEGACY_MOVES,
  BRANCH_OPTIONS,
  parseBranchRef,
  // W7 — the cipher-variety ceiling. The floor may not demand more distinct
  // techniques than the doctrine offers; the size is read, never written down.
  GENERATION_CIPHER_TECHNIQUES,
  CIPHER_VARIETY_MIN,
  // W6 — the authored design language. The floor below decides a BLOCKING stage
  // error, so its menus come from the contract rather than from a copy here: the
  // prompt teaches these exact lists (designLanguageMenuParity in validate.mjs
  // diffs them both ways), the schema accepts these exact lists, and a floor
  // holding a third private copy would eventually reject a value the model was
  // correctly told it could choose.
  LAYOUT_INTENSITY_BOUNDS,
  VALID_PRODUCTION_TEXTURES,
  TONE_TEXTURE_LADDER,
  VALID_TYPE_VOICES,
  VALID_DOCUMENT_FAMILIES,
  VALID_DOCUMENT_RECIPES,
  VALID_MARGIN_SEMANTICS,
  VALID_INK_DISCIPLINES,
  VALID_SEAL_TREATMENTS,
  // The arrangement grammar's menus and its axis table (ARRANGEMENT.md phase
  // A). Imported for the reason every menu above it is: the floor must refuse
  // exactly the values the renderer refuses to draw, and a private copy here
  // would drift into failing books for a look the engine actually wears.
  VALID_ARRANGEMENT_GRAMMARS,
  ARRANGEMENT_AXES,
  // ARRANGEMENT §2 axis 5 — the FORM channel's vocabulary and its family table.
  // Same reason, one channel over: the floor must refuse exactly the plans
  // `resolveAtomForms()` drops, and it must ask about exactly the families the
  // adapter stamps. Both are derived from these two, never listed here.
  VALID_FORM_PLANS,
  ATOM_FORM_FAMILIES,
  formPlansFor,
  // D144 — the single home for "does this brief name a body that runs on
  // procedure?". Imported rather than re-implemented: a private copy here and
  // the prompt's byte-quoted term list would answer the same question in two
  // dialects, which is D91's whole anatomy. Guarded by singleDeclarationHomes().
  hasInstitutionalReferent,
  // D148 — the two-source law's table and its readers (VISION §11). Imported
  // for exactly the reason above: the floor must ask what the die said in the
  // SAME dialect the prompt hands it out in, from the same accessor, or the
  // shown set and the checked set quietly stop being the same set.
  identityAxesForStage,
  readAxisValue,
  // D173 — the rudder. The eight questions, the word band, the verb arity, the
  // count itself and the player-facing word table the graph→rules direction
  // matches on. All imported, none re-declared: the prompt states these numbers
  // as literals (validate.mjs gameRulebookPromptParity diffs them), so a
  // private copy here would fail books for a band the model was told differently.
  GAME_RULEBOOK_ANSWERS,
  GAME_RULEBOOK_VERBS_MIN,
  GAME_RULEBOOK_VERBS_MAX,
  // W1 — the plain-stakes band. Imported for the reason every number above it
  // is: SCHEMA_SINGLE_WEEK states these two integers to the model as literals,
  // and a private copy here would fail weeks for a band the model was told
  // differently.
  ORIENTATION_LIMITS,
  WEEK_STAKES_MIN_CHARS,
  WEEK_STAKES_MAX_CHARS,
  RULEBOOK_KIND_WORDS,
  countRulebookWords
} from '../../contracts/contract-constants.mjs';

// W5b — the Ludic Harvest, tranche 2. THE ONE LAW: no puzzle ships
// unsolved-by-machine. The solvers are a separate contract module because the
// renderer must never pay for them (it draws puzzles, it does not solve them)
// and because Node runs them too, at the floors harness. This module routes
// severity; puzzle-solvers.mjs decides whether a puzzle is a puzzle.
import {
  verifyConstrainedGrid,
  verifyWordGrid
} from '../../contracts/puzzle-solvers.mjs';

// W3 corrective wave (F06). The canonical schema, imported rather than
// described. The browser-side validator is hand-written and had no unknown-key
// check of ANY kind, so its promise — "a revision may never make the booklet
// less valid" — held only against the weaker of the two validators in the repo,
// and unknown-key invention is precisely what a free-form revision stage
// produces. This module now derives that one pass from the same object
// scripts/validate.mjs runs through Ajv, so the two cannot disagree about what
// a legal key is. booklet-schema.mjs imports only contract-constants.mjs and is
// therefore browser-safe.
import { BOOKLET_SCHEMA } from '../../contracts/booklet-schema.mjs';

// Map-evolution fingerprint + companions: one implementation, shared with quality.js.
// Formerly a private copy here that silently diverged from quality.js's — see D91 and
// the header of fingerprint.js. Guarded by singleFingerprintHome() in validate.mjs.
import {
  buildMapEvolutionFingerprint,
  hasComparableMapState,
  looksLikeFragmentRef
} from './fingerprint.js';

// The simulated player (W4b). ONE-DIRECTIONAL BY DESIGN: sim-player.js imports
// the ref grammar and one normalizer and nothing else, so it can never import
// this file back. The walker must run in all three doors (VISION §4.5) and a
// cycle here would surface as a load-order failure in exactly one of them.
import {
  simulateBook,
  simCorrectionDirectives,
  simSoftFindings
} from './sim-player.js';

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

// ── THE SETTLEMENT FLOOR (the settlement doctrine, 2026-08-18) ──────────────
//
// WHAT THIS GATE CAN AND CANNOT DO, stated first so nobody later mistakes it
// for more than it is. It CANNOT grade whether an ending lands. Literary weight
// is not decidable by a validator, and a floor that pretended to grade it would
// be the overclaiming gate the severity doctrine warns about — ignored inside a
// week, and worse than no gate.
//
// What it CAN do is the DR-33 declared-convention idiom, which is the whole
// design: the ending DECLARES what it settles and in what mode, and the gate
// checks conformance to that declaration — presence, shape, menu membership,
// and the one structural implication the twist clause carries (an inversion
// owes seeded evidence). The book is held to its own word, never to a house
// preference.
//
// THE ONE ARM THAT IS NOT SELF-REFERENTIAL, and the reason this is a floor
// rather than an essay the model grades itself on: `owed` is a SURFACE REF,
// resolved against the book's own printed inventory through buildSurfaceIndex —
// one home, two readers (D93). A settlement whose debts name nothing the book
// prints is a settlement of debts the book never incurred, and that is
// decidable. Without an armed index the arm stays silent by the D144
// ungated-caller rule: a gate must never invent the evidence it checks.
//
// D70's resolution law is EXTENDED here, not restated. That law says a forward
// promise resolving to nothing is invalidity. The naive extension to the finale
// would demand every promise ANSWERED — a demand for tidy resolution, which is
// exactly what the twist clause forbids and what would fail an
// `ambiguous-by-design` book for being what it declared. So the demand is
// ADDRESSED: paid, transformed, or inverted.
export function endingSettlementFloorErrors(ending, where, options) {
  options = options || {};
  var errors = [];
  var settlement = (ending || {}).settlement;

  if (!settlement || typeof settlement !== 'object' || Array.isArray(settlement)) {
    errors.push(where + ' declares no `settlement` — the sealed ending is the most expensive'
      + ' content in the book and must state what it settles: { mode, debts[] }');
    return errors;
  }

  var mode = String(settlement.mode == null ? '' : settlement.mode).trim();
  if (!mode) {
    errors.push(where + '.settlement declares no `mode` — an ending is checked against its own'
      + ' declaration, so an undeclared mode is an ending nothing can be checked against ('
      + VALID_ENDING_MODES.join(' | ') + ')');
  } else if (VALID_ENDING_MODES.indexOf(mode) === -1) {
    errors.push(where + '.settlement.mode "' + mode + '" is not an ending mode ('
      + VALID_ENDING_MODES.join(' | ') + ')');
  }

  // THE BOOK'S OWN WORD, when the seat was armed with it. The mode is decided
  // at the compiler seat and rides the intent contract to this one; an ending
  // settling in a mode the book never declared has re-rolled a die the run
  // already threw. Armed-only: an ungated caller stays silent (D144).
  var bookMode = String(options.endingMode == null ? '' : options.endingMode).trim();
  if (bookMode && mode && VALID_ENDING_MODES.indexOf(mode) !== -1 && mode !== bookMode) {
    errors.push(where + '.settlement.mode is "' + mode + '" but this book declared endingMode "'
      + bookMode + '" — the finale settles in the mode the book chose, or the choice was theatre');
  }

  var debts = Array.isArray(settlement.debts) ? settlement.debts : [];
  if (debts.length < SETTLEMENT_DEBT_BUDGET.min) {
    errors.push(where + '.settlement settles only ' + debts.length + ' debt(s); at least '
      + SETTLEMENT_DEBT_BUDGET.min + ' — the reader paid weeks of training for this page and'
      + ' an ending that settles nothing is an ending a non-player could enjoy equally');
  }
  if (debts.length > SETTLEMENT_DEBT_BUDGET.max) {
    errors.push(where + '.settlement lists ' + debts.length + ' debts; at most '
      + SETTLEMENT_DEBT_BUDGET.max + ' — past that the finale is a receipt, not a payoff');
  }

  var invertedCount = 0;
  debts.forEach(function (debt, di) {
    var at = where + '.settlement.debts[' + di + ']';
    var row = debt || {};

    var owed = String(row.owed == null ? '' : row.owed).trim();
    var parsedOwed = parseSurfaceRef(owed);
    if (!parsedOwed.valid) {
      errors.push(at + '.owed "' + owed + '" does not name a surface (expected `kind:id`, e.g.'
        + ' `fragment: F.03` or `clock: the tide`) — a debt naming nothing this book prints is'
        + ' a debt the book never incurred');
    } else if (options.surfaceIndex) {
      var res = surfaceRefResolves(options.surfaceIndex, owed);
      if (!res.ok) errors.push(at + '.owed "' + owed + '" ' + res.reason);
    }

    var disposition = String(row.disposition == null ? '' : row.disposition).trim();
    if (VALID_SETTLEMENT_DISPOSITIONS.indexOf(disposition) === -1) {
      errors.push(at + '.disposition "' + disposition + '" is not a disposition ('
        + VALID_SETTLEMENT_DISPOSITIONS.join(' | ') + ') — a promise is ADDRESSED, and'
        + ' transformed and inverted settle a debt as truly as paid does');
    }

    if (!String(row.how == null ? '' : row.how).trim()) {
      errors.push(at + '.how says nothing about how this debt was settled');
    }

    if (disposition === 'inverted') {
      invertedCount += 1;
      // THE TWIST'S COST OF ENTRY. An inversion with nothing planted behind it
      // is a retraction, not a reversal — the author's own words, and the one
      // structural implication of the twist clause a machine can decide.
      var seeded = String(row.seededAt == null ? '' : row.seededAt).trim();
      var parsedSeed = parseSurfaceRef(seeded);
      if (!parsedSeed.valid) {
        errors.push(at + ' inverts "' + owed + '" without naming where the evidence was seeded'
          + ' — `seededAt` must be a surface ref; an inversion with nothing planted behind it'
          + ' is a retraction, not a reversal');
      } else if (options.surfaceIndex) {
        var seedRes = surfaceRefResolves(options.surfaceIndex, seeded);
        if (!seedRes.ok) errors.push(at + '.seededAt "' + seeded + '" ' + seedRes.reason);
      }
    }
  });

  // CONFORMANCE, IN THE ONE DIRECTION THAT IS DECIDABLE. A declared twist that
  // inverts nothing did not do what it said. The converse is deliberately NOT
  // checked: a revelation carrying an inversion is not a defect, and forbidding
  // it would make the menu a cage rather than a choice.
  if (mode === 'twist' && invertedCount === 0) {
    errors.push(where + '.settlement declares mode "twist" but no debt is `inverted` — a twist'
      + ' pays debts the reader did not know they held; an ending that only pays forward is a'
      + ' revelation, and declaring it a twist makes the declaration unreadable');
  }

  return errors;
}

/**
 * endingSettlementSetFloorErrors(endings, where, options) -> string[]
 *
 * THE WHICH-DIFFERENTIATION ARM. Book 2 shipped ONE ending and the proving-night
 * read found the game thinnest where the payoff should have been thickest — so
 * this arm is deliberately SILENT on a one-ending book rather than demanding
 * more endings, which is a product decision nobody has made.
 *
 * What it decides: two endings that settle the same debts the same ways are one
 * ending printed twice, however different the adjectives. That comparison is
 * exact — it is a set of (owed, disposition) pairs — which is why the demand is
 * "differ in WHAT THEY SETTLE" rather than "differ in register", a thing no
 * validator can see.
 */
export function endingSettlementSetFloorErrors(endings, where, options) {
  var list = Array.isArray(endings) ? endings : [];
  if (list.length < 2) return [];
  var errors = [];
  var seen = {};
  list.forEach(function (ending, ei) {
    var settlement = (ending || {}).settlement;
    var debts = (settlement && Array.isArray(settlement.debts)) ? settlement.debts : [];
    if (!debts.length) return;
    var signature = debts.map(function (d) {
      return String((d || {}).owed || '').trim().toLowerCase()
        + ' ' + String((d || {}).disposition || '').trim().toLowerCase();
    }).sort().join('|');
    var label = String((ending || {}).variant || ('#' + (ei + 1)));
    if (seen[signature]) {
      errors.push(where + ': endings "' + seen[signature] + '" and "' + label + '" settle the'
        + ' same debts the same ways — multiple endings must differ in WHAT THEY SETTLE, never'
        + ' in flavour; two endings paying the same debts are one ending printed twice');
    } else {
      seen[signature] = label;
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

// ── The generation floors (Teeth Round, Wave T1a) ───────────────────────────
// Book 1 shipped legally with zero micro-lines, zero doors, no componentDialect
// and two cipher families, because every one of those surfaces was described to
// the model as optional. The law the round teaches: a mid-tier model treats
// "optional but demanded" as "skip" — so what is creative and undeliverable by
// derivation must be GENERATION-STRICT, not merely requested.
//
// OPT-IN, DELIBERATELY. Every floor below is gated on
// `options.generationFloors`, and the ONLY callers that pass it are the API
// pipelines' stage gates. Three other callers reach these same validators:
//
//   • the guided-build wizard's harness, replaying hand-assembled payloads
//   • window.LiftRPGAPI.manual, the browser-side inspection surface
//   • the safety-net re-validations that log advisories after a stage passes
//
// None of those is the generation path, and a hand-built booklet that prints no
// micro-lines is a complete, valid, printable artifact. Gating keeps this a
// generation POLICY rather than a new artifact requirement — booklet-schema.mjs
// is untouched and the corpus never moves (D19, and the Teeth Round's own R1).
function floorsOn(options) {
  return !!(options && options.generationFloors);
}

/**
 * cipherVarietyFloor(weekCount) -> number
 *
 * How many distinct cipher techniques a book of this length owes. Six weeks
 * (the standard block) yields 4, which is the Teeth Round's stated floor; the
 * formula generalises it downward so a four-week book is asked for 3 rather
 * than for more techniques than it has non-boss weeks to carry them.
 *
 * DERIVED-OR-STRICT (W7, the W3 length audit). The formula had no CEILING, so
 * it scaled to 6/8/10 at 8/10/12 weeks — past the eight techniques the
 * doctrine offers. A blocking gate that demands more variety than any prompt
 * surface teaches can only be satisfied by improvising vocabulary, which is
 * the one thing the same doctrine forbids; every retry then buys the same
 * failure. The cap READS `GENERATION_CIPHER_TECHNIQUES.length`, so adding or
 * retiring a technique moves the ceiling by construction and no literal here
 * can go stale. See the long note beside that array in contract-constants.mjs.
 *
 * The six-week answer is unchanged: min(4, 8) === 4.
 *
 * One implementation, three readers: the skeleton's cipher PLAN, the campaign
 * plan's, and the two prompt surfaces that state the number to the model. They
 * used to disagree by construction — the campaign plan carried this formula,
 * the skeleton carried no check at all, and two prompt builders each carried a
 * hand-copied `Math.min(Math.max(...))` of their own.
 */
export function cipherVarietyFloor(weekCount) {
  var n = Number(weekCount) || 0;
  // `n - 2`: the boss week carries no cipher, and one repeat is allowed among
  // the rest — the original Teeth Round derivation, unchanged. The two clamps
  // around it are the floor and the ceiling.
  var scaled = Math.min(Math.max(n - 2, CIPHER_VARIETY_MIN), Math.max(n - 1, 1));
  return Math.min(scaled, GENERATION_CIPHER_TECHNIQUES.length);
}

/**
 * isPrintableRepTarget(value) -> boolean
 *
 * THE LEGALITY CONTRACT FOR A REP BOX. `repsPerSet` is typed
 * `['string','integer']` in booklet-schema.mjs with no sanity bound, and the
 * renderer prints whatever arrives, verbatim: getRepTargets() in
 * renderer/modules/utils.js does `String(value).trim()` and stamps the result
 * into every set box (null/undefined become the empty string). So `-1` prints
 * "-1" three times and `null` prints three empty boxes — which is exactly what
 * Book 1 shipped (D112 flagged both as generation territory; this is the floor
 * that closes them, and content/sf-haiku45-c5-trial-1.json carries the blank
 * variant of the same defect).
 *
 * WHAT STAYS LEGAL, deliberately. A rep target is a WRITTEN INSTRUCTION, not a
 * number — the corpus carries "AMRAP", "45s", "see sets", "Max", "rounds",
 * "10 each", "35 min", "6+", "12+ (TEST)". Banning non-numerics would ban the
 * form's own vocabulary. The nonsense class is narrow and mechanical: a value
 * that reaches the box as a blank, a zero, a negative, or a serialized
 * null/NaN. Everything else is a target a player can read and act on.
 *
 * Slash forms are judged SEGMENT BY SEGMENT because that is how they print:
 * getRepTargets splits on '/' and gives each set its own target, so "5/-1/5"
 * puts a sentinel in box two while looking legal as a whole string.
 *
 * CROSS-FILE CONTRACT — this is the AUTHORITY; `printableRepTarget()` in
 * generator/modules/liftosaur.js is the producer-side mirror that refuses to
 * emit a value this would reject. It cannot import this one (that module is
 * deliberately dependency-free), so the two are pinned by one shared case table
 * in scripts/check-generation-floors.mjs §12: nothing the producer keeps may be
 * a value this predicate blocks. Loosening this one without loosening that one
 * is safe; loosening THAT one alone re-opens the laundering hole.
 *
 * @param {*} value  the raw repsPerSet as authored
 * @returns {boolean} true when a rep box can print it and a player can read it
 */
export function isPrintableRepTarget(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return isFinite(value) && value > 0;
  if (typeof value === 'boolean') return false;
  if (typeof value !== 'string') return false;

  var text = value.trim();
  if (!text) return false;

  var parts = text.indexOf('/') === -1 ? [text] : text.split('/');
  var printable = 0;
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i].trim();
    // The renderer drops empty segments ("5//5" prints two targets), so an
    // empty one is not itself a defect — a string of NOTHING BUT empties is.
    if (!part) continue;
    var lowered = part.toLowerCase();
    if (lowered === 'null' || lowered === 'undefined' || lowered === 'nan') return false;
    // Bare number only. "0-5" and "6+" are written targets that merely start
    // with a digit; parseFloat would read them as 0 and 6 and judge the wrong
    // thing. Anything that is not a bare number is a token the player reads.
    if (/^[+-]?\d+(?:\.\d+)?$/.test(part) && Number(part) <= 0) return false;
    printable++;
  }
  return printable > 0;
}

/**
 * How to name an unprintable value in an error the model has to act on.
 * The model needs to see WHAT IT SENT, not a category — "repsPerSet is -1"
 * corrects; "repsPerSet is invalid" invites the same guess again.
 */
function describeRepTarget(value) {
  if (value === undefined) return 'absent';
  if (value === null) return 'null';
  if (typeof value === 'string') return '"' + value.slice(0, 24) + '"';
  if (typeof value === 'object') return 'an object';
  return String(value);
}

/**
 * collectPuzzleFloorErrors(weekObj) -> string[]   (W5b)
 *
 * THE SOLVER FLOOR. Two obligations, in this order:
 *
 *   1. GENERATION POLICY — the tighter half of the two-tier guardrails. The
 *      schema accepts up to the RENDER ceiling so a hand-authored corpus book
 *      is not rejected for being one row bigger than the prompt asks for; this
 *      floor holds the generation numbers, and it holds them FIRST because a
 *      grid outside them is one whose uniqueness proof may not be affordable.
 *      The escalation valve for a pathological puzzle is a tighter number in
 *      SPATIAL_GUARDRAILS, never a weaker floor here.
 *
 *   2. THE PROOF — contracts/puzzle-solvers.mjs actually solves the thing, and
 *      its errors go straight through unedited. They are written as Correction
 *      Directives (what is wrong, in the terms the model can fix) precisely so
 *      that this function does not have to translate them; a floor that
 *      paraphrases its instrument is a floor that goes stale against it.
 *
 * BLOCKING, and gated on generationFloors like every other floor: a hand-loaded
 * booklet carrying a wobbly puzzle still renders, because the artifact contract
 * is not the generation contract (D19). The refusal belongs at the stage gate,
 * where there is still a model to hand it back to.
 */
function collectPuzzleFloorErrors(weekObj) {
  var errors = [];
  var fieldOps = (weekObj || {}).fieldOps || {};

  var grid = fieldOps.constrainedGrid;
  if (grid) {
    var GG = SPATIAL_GUARDRAILS.logicGrid;
    var GN = SPATIAL_GUARDRAILS.nonogram;
    // AN EXPLICIT DISPATCH, NOT AN `else`. With two kinds "not a nonogram"
    // meant "a logic grid"; with five it means nothing, and a sudoku falling
    // into the logic-grid arm would be told it has zero of the three subjects it
    // was never supposed to have. Every kind names itself here, and the trailing
    // `else` is the logic grid because that is the kind whose fields it reads.
    if (grid.kind === 'nonogram') {
      var rows = Array.isArray(grid.rowClues) ? grid.rowClues.length : 0;
      var cols = Array.isArray(grid.colClues) ? grid.colClues.length : 0;
      if (rows < GN.minSize || rows > GN.maxSize || cols < GN.minSize || cols > GN.maxSize) {
        errors.push('fieldOps.constrainedGrid: a generated nonogram must be between '
          + GN.minSize + 'x' + GN.minSize + ' and ' + GN.maxSize + 'x' + GN.maxSize
          + ', and this one is ' + rows + 'x' + cols + '.');
      }
    } else if (grid.kind === 'sudoku') {
      var GS = SPATIAL_GUARDRAILS.sudoku;
      var side = Number(grid.boxWidth) * Number(grid.boxHeight);
      if (!(side >= GS.minSide && side <= GS.maxSide)) {
        errors.push('fieldOps.constrainedGrid: boxWidth x boxHeight makes a board ' + side
          + ' on a side, and a generated sudoku must be between ' + GS.minSide + 'x' + GS.minSide
          + ' and ' + GS.maxSide + 'x' + GS.maxSide + '.');
      } else {
        // THE BLANK FLOOR. Solvable, unique and key-matched are the solver's
        // three obligations and a grid can meet all of them while being
        // finished by reading it. This is the fourth thing, and only this
        // gate can ask it: the solver sees a legal puzzle.
        var filled = 0;
        (Array.isArray(grid.givens) ? grid.givens : []).forEach(function (row) {
          filled += String(row).replace(/[^0-9]/g, '').length;
        });
        var cells = side * side;
        var blankPct = cells ? Math.round(((cells - filled) / cells) * 100) : 0;
        if (blankPct < GS.minBlankPercent) {
          errors.push('fieldOps.constrainedGrid: the sudoku prints ' + filled + ' of ' + cells
            + ' cells (' + blankPct + '% blank), and a generated sudoku must leave at least '
            + GS.minBlankPercent + '% blank. A grid this full is solvable, unique and still not a '
            + 'puzzle — the player finishes it by reading it.');
        }
      }
    } else if (grid.kind === 'kakuro') {
      var GK = SPATIAL_GUARDRAILS.kakuro;
      var layout = Array.isArray(grid.layout) ? grid.layout : [];
      var kh = layout.length;
      var kw = kh ? String(layout[0]).length : 0;
      if (kh < GK.minSize || kh > GK.maxSize || kw < GK.minSize || kw > GK.maxSize) {
        errors.push('fieldOps.constrainedGrid: a generated kakuro must be between '
          + GK.minSize + 'x' + GK.minSize + ' and ' + GK.maxSize + 'x' + GK.maxSize
          + ' counting the clue frame, and this one is ' + kh + 'x' + kw + '.');
      }
    } else if (grid.kind === 'kenken') {
      var GX = SPATIAL_GUARDRAILS.kenken;
      var kkSize = Number(grid.size);
      if (!(kkSize >= GX.minSize && kkSize <= GX.maxSize)) {
        errors.push('fieldOps.constrainedGrid: a generated KenKen must be between ' + GX.minSize
          + ' and ' + GX.maxSize + ' on a side, and this one is ' + String(grid.size) + '.');
      }
      var wide = 0;
      (Array.isArray(grid.cages) ? grid.cages : []).forEach(function (cage) {
        if (Array.isArray((cage || {}).cells) && cage.cells.length > GX.maxCageCells) wide++;
      });
      if (wide) {
        errors.push('fieldOps.constrainedGrid: ' + wide + ' cage(s) cover more than '
          + GX.maxCageCells + ' cells — the solver enumerates every filling of every cage, which '
          + 'grows as the board size to the power of the cage\'s cell count.');
      }
    } else if (grid.kind === 'sequence') {
      var GQ = SPATIAL_GUARDRAILS.sequence;
      var things = Array.isArray(grid.items) ? grid.items.length : 0;
      var orderClues = Array.isArray(grid.orderClues) ? grid.orderClues.length : 0;
      if (things < GQ.minItems || things > GQ.maxItems) {
        errors.push('fieldOps.constrainedGrid: a generated sequence must order between '
          + GQ.minItems + ' and ' + GQ.maxItems + ' items, and this one orders ' + things + '.');
      }
      if (orderClues < GQ.minClues || orderClues > GQ.maxClues) {
        errors.push('fieldOps.constrainedGrid: a generated sequence must carry between '
          + GQ.minClues + ' and ' + GQ.maxClues + ' clues, and this one carries ' + orderClues + '.');
      }
      var wideLabels = [];
      (Array.isArray(grid.items) ? grid.items : []).concat(
        Array.isArray(grid.slots) ? grid.slots : []
      ).forEach(function (v) {
        if (String(v).length > GQ.labelMaxChars) wideLabels.push(String(v));
      });
      if (wideLabels.length) {
        errors.push('fieldOps.constrainedGrid: item or slot label(s) longer than ' + GQ.labelMaxChars
          + ' characters (' + wideLabels.slice(0, 3).join(', ') + ') — the board prints slots in a '
          + 'column one cell wide, so they wrap it off the page.');
      }
    } else if (grid.kind === 'truth-tellers') {
      var GT = SPATIAL_GUARDRAILS.truthTellers;
      var voices = Array.isArray(grid.speakers) ? grid.speakers.length : 0;
      var lines = Array.isArray(grid.statements) ? grid.statements.length : 0;
      if (voices < GT.minSpeakers || voices > GT.maxSpeakers) {
        errors.push('fieldOps.constrainedGrid: a generated truth-teller puzzle must have between '
          + GT.minSpeakers + ' and ' + GT.maxSpeakers + ' speakers, and this one has ' + voices + '.');
      }
      if (lines < GT.minStatements || lines > GT.maxStatements) {
        errors.push('fieldOps.constrainedGrid: a generated truth-teller puzzle must carry between '
          + GT.minStatements + ' and ' + GT.maxStatements + ' statements, and this one carries '
          + lines + '.');
      }
      var longNames = [];
      (Array.isArray(grid.speakers) ? grid.speakers : []).forEach(function (s) {
        if (String(s).length > GT.labelMaxChars) longNames.push(String(s));
      });
      if (longNames.length) {
        errors.push('fieldOps.constrainedGrid: speaker name(s) longer than ' + GT.labelMaxChars
          + ' characters (' + longNames.slice(0, 3).join(', ') + ') — the board prints them in the '
          + 'row-label column, so they wrap the two mark cells off the page.');
      }
    } else {
      var subjects = Array.isArray(grid.subjects) ? grid.subjects.length : 0;
      var cats = Array.isArray(grid.categories) ? grid.categories : [];
      var clues = Array.isArray(grid.clues) ? grid.clues.length : 0;
      if (subjects < GG.minSubjects || subjects > GG.maxSubjects) {
        errors.push('fieldOps.constrainedGrid: a generated logic grid must have between '
          + GG.minSubjects + ' and ' + GG.maxSubjects + ' subjects, and this one has ' + subjects + '.');
      }
      if (cats.length > GG.maxCategories) {
        errors.push('fieldOps.constrainedGrid: a logic grid may carry at most '
          + GG.maxCategories + ' categories, and this one carries ' + cats.length + '.');
      }
      if (clues < GG.minClues || clues > GG.maxClues) {
        errors.push('fieldOps.constrainedGrid: a generated logic grid must carry between '
          + GG.minClues + ' and ' + GG.maxClues + ' clues, and this one carries ' + clues + '.');
      }
      var overlong = [];
      (Array.isArray(grid.subjects) ? grid.subjects : []).forEach(function (s) {
        if (String(s).length > GG.labelMaxChars) overlong.push(String(s));
      });
      cats.forEach(function (cat) {
        (Array.isArray((cat || {}).values) ? cat.values : []).forEach(function (v) {
          if (String(v).length > GG.labelMaxChars) overlong.push(String(v));
        });
      });
      if (overlong.length) {
        errors.push('fieldOps.constrainedGrid: label(s) longer than ' + GG.labelMaxChars
          + ' characters (' + overlong.slice(0, 3).join(', ') + ') — the grid prints them in a '
          + 'column one cell wide, so they wrap the board out of the page.');
      }
    }

    verifyConstrainedGrid(grid).errors.forEach(function (msg) {
      errors.push('fieldOps.constrainedGrid: ' + msg);
    });
  }

  var word = fieldOps.wordGrid;
  if (word) {
    // THE TWO KINDS CARRY DISJOINT SHAPES, so the guardrail band is branched.
    // Running the word-search size band over a crossword would report a 0x0
    // grid — a crossword declares no grid at all, because the loom builds it —
    // and the model would be handed a defect it cannot act on.
    if (word.kind === 'crossword') {
      var GX = SPATIAL_GUARDRAILS.crossword;
      var poolCount = Array.isArray(word.entries) ? word.entries.length : 0;
      if (poolCount < GX.minPoolEntries || poolCount > GX.maxPoolEntries) {
        errors.push('fieldOps.wordGrid: a generated crossword offers the loom between '
          + GX.minPoolEntries + ' and ' + GX.maxPoolEntries
          + ' answer/clue pairs, and this one offers ' + poolCount + '.');
      }
      // The loom is the floor. verifyCrossword() weaves the grid from the pool
      // and refuses it if the weave will not carry a puzzle — solvable (every
      // declared entry is a run of the grid), unique-in-the-crossword's sense
      // (every run of two or more cells is a clued entry, so there is no slot
      // the player cannot finish and no clue pointing at nothing), and
      // key-matched (the marked squares spell the declared answer). A budget
      // exceeded is a refusal, never a pass.
      verifyWordGrid(word, GX).errors.forEach(function (msg) {
        errors.push('fieldOps.wordGrid: ' + msg);
      });
    } else {
      var GW = SPATIAL_GUARDRAILS.wordSearch;
      var gridRows = Array.isArray(word.grid) ? word.grid.length : 0;
      var gridCols = gridRows ? String(word.grid[0] || '').length : 0;
      var wordCount = Array.isArray(word.words) ? word.words.length : 0;
      if (gridRows < GW.minSize || gridRows > GW.maxSize || gridCols < GW.minSize || gridCols > GW.maxSize) {
        errors.push('fieldOps.wordGrid: a generated word search must be between '
          + GW.minSize + 'x' + GW.minSize + ' and ' + GW.maxSize + 'x' + GW.maxSize
          + ', and this one is ' + gridRows + 'x' + gridCols + '.');
      }
      if (wordCount < GW.minWords || wordCount > GW.maxWords) {
        errors.push('fieldOps.wordGrid: a generated word search must hide between '
          + GW.minWords + ' and ' + GW.maxWords + ' words, and this one hides ' + wordCount + '.');
      }

      verifyWordGrid(word).errors.forEach(function (msg) {
        errors.push('fieldOps.wordGrid: ' + msg);
      });
    }
  }

  return errors;
}

/**
 * collectLudicWeekOwedErrors(weekObj, owed) -> string[]   (D170)
 *
 * THE DECLARED IMPLEMENT ACTUALLY PRINTS. The other half of the arsenal fix,
 * and the half that puts ink on a page: the composition is declared at the
 * shell stage, and until now nothing carried that declaration forward to the
 * week stages that would have had to build it. The week prompt's own puzzle
 * section says "a booklet with none is a legitimate booklet" — true of a book
 * in general, false of a book that just declared `deduction-board` — so the
 * model read a permission where its own spine had written an obligation.
 *
 * `owed` is one row of deriveLudicWeekAssignments() (contract-constants), the
 * SAME derivation the week prompt states as a GIVEN. Never re-derived here:
 * two derivations would put the grid in week three and demand it in week four,
 * and the model would be told nothing useful either time (D93/D166).
 *
 * Silent without a row, exactly like every other spine floor — a gate that
 * invents the declaration it checks against is not checking anything.
 */
function collectLudicWeekOwedErrors(weekObj, owed) {
  if (!owed || typeof owed !== 'object') return [];
  var entry = String(owed.entry || '').trim();
  var field = String(owed.field || '').trim();
  if (!entry || !field) return [];
  var fieldOps = (weekObj || {}).fieldOps || {};
  if (fieldOps[field] && typeof fieldOps[field] === 'object') return [];
  return ['fieldOps.' + field + ' is missing, and this week owes it: '
    + 'meta.playSpine.composition declares `' + entry + '`, and this book\'s week schedule '
    + 'puts that implement here. A composition entry is a promise the weeks pay — build the '
    + 'grid on this week, to the shape and the guardrails the puzzle section states. '
    + '(If the book should not carry one at all, the spine is what is wrong, not this week.)'];
}

/**
 * collectConvergenceChainFloorErrors(boss, componentInputs) -> string[]
 *
 * ── DERIVE OR DECLARE (author ruling DR-33, 2026-08-18) ─────────────────────
 *
 * THE RULING: "a password's last step may be a declared convention; undeclared
 * non-derivation is a defect." The chain is the one rule in the book that can
 * fail silently and take the whole ending with it — nothing else in the system
 * notices that the values the player collects do not spell the word the last
 * page asks for. The 2026-08-09 coherence audit found seven of nineteen
 * fixtures with broken chains and ZERO gates fired on any of them.
 *
 * THE SEAT IS THE BOSS WEEK, and that is where the evidence already is. The
 * gate is handed `expectedOptions.componentInputs` — the real collected values,
 * in week order, on every seat of both pipelines — and the boss unit carries
 * its own reveal prose. Nothing new has to be armed for this floor to fire.
 *
 * IT IS DELIBERATELY PATTERN-BLIND, and that is a correction to the ruling's
 * proposed wiring rather than a shortcut. `meta.artifactIntent.convergencePattern`
 * is the declaration's one home (see CONVERGENCE_DERIVATION_MODES), but it does
 * not ride the week gate's options, and it is the WEAKER evidence anyway: a
 * `reordering` declaration in `meta` is a claim the player never sees. What the
 * player can actually do is decided by two things on the boss page — the word it
 * states, and whether it tells them to rearrange. So this floor asks THOSE, and
 * a book whose meta says `reordering` while its boss page teaches no reorder is
 * caught here exactly as it should be. The corpus audit in scripts/validate.mjs
 * reads the declaration too, because there it is reporting on finished books
 * rather than gating a stage.
 *
 * THREE CONDITIONS BEFORE IT SPEAKS, so it can only fire where the claim is
 * unambiguous: a standard A1Z26 table (the week gate already errors otherwise),
 * inputs that are all integers 1-26, and a password actually STATED on the boss
 * page in the form the doctrine demands. A boss that states no password makes
 * no claim, and inventing one to check would be the gate writing the design.
 */
function collectConvergenceChainFloorErrors(boss, componentInputs) {
  if (!boss || typeof boss !== 'object') return [];
  var inputs = Array.isArray(componentInputs) ? componentInputs : null;
  if (!inputs || !inputs.length) return [];               // no evidence ⇒ silent (D144)
  var table = (boss.decodingKey || {}).referenceTable;
  if (!table || !isStandardAlphaTable(table)) return [];  // the week gate owns that
  var numeric = inputs.map(function (v) { return Number(v); });
  for (var i = 0; i < numeric.length; i++) {
    var n = numeric[i];
    if (isNaN(n) || n !== Math.floor(n) || n < 1 || n > 26) return [];
  }
  var derived = String(decodeA1Z26(numeric) || '').toUpperCase();
  if (!derived) return [];
  var reveal = [boss.passwordRevealInstruction, boss.convergenceProof, boss.narrative]
    .filter(Boolean).join('\n');
  var statedMatch = reveal.match(/\bpassword\s+is\s+([A-Za-z0-9-]{3,})\b/);
  if (!statedMatch) return [];                            // no claim ⇒ no check
  var stated = statedMatch[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!stated || stated === derived) return [];           // the in-order reading: nothing owed

  var sortLetters = function (s) { return String(s || '').split('').sort().join(''); };
  if (sortLetters(stated) !== sortLetters(derived)) {
    return ['Boss convergence: the collected values decode to "' + derived + '" through this '
      + 'book\'s own table, and the boss page states the password is "' + stated + '" — which '
      + 'is not the same letters in any order. The player collects exactly what the booklet '
      + 'asked for, follows the booklet\'s own table, and arrives at a word the last page '
      + 'rejects. A password\'s last step may be a declared convention; this is not a '
      + 'convention, it is a chain that does not converge. Either state "' + derived + '", or '
      + 'change the weekly values so they decode to "' + stated + '".'];
  }
  if (!teachesRearrangement(reveal)) {
    return ['Boss convergence: the collected values decode to "' + derived + '" and the boss '
      + 'page states the password is "' + stated + '" — the same letters in a different ORDER. '
      + 'That is a legitimate convention, but it is only a convention if the player is TOLD: '
      + 'nothing in the reveal, the proof or the narrative tells them to rearrange the letters. '
      + 'An anagram nobody is asked to unscramble is indistinguishable, at the table, from a '
      + 'mis-derivation. Say on the page that the week-order reading is the wrong one and what '
      + 'establishes the true order.'];
  }
  return [];
}

/**
 * Per-week structural validation. Runs after each week is generated
 * in the pipeline, before proceeding to the next stage.
 * Returns { valid: boolean, errors: string[] }
 *
 * expectedOptions.generationFloors turns on the Teeth Round floors (micro-lines,
 * return beats, doors, prose budgets). See floorsOn() above for why they are
 * opt-in rather than default.
 */
export function validateWeekSchema(weekObj, isBoss, expectedOptions) {
  var errors = [];
  var warnings = [];
  // Delta-class coordinates for the errors this gate can name exactly (D167).
  // Always present on the verdict, empty far more often than not; a consumer
  // reads it as "these errors, and only these, are repairable field by field".
  var deltaTargets = [];
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

  // ── THE PLAIN-STAKES LINE (W1, 2026-08-18) ────────────────────────────────
  // The epigraph is the week's MOOD and is allowed to be oblique. Nothing on a
  // week's opening page has ever said, in words a stranger can act on, what is
  // actually at stake — and the author's verdict on the first delivered book
  // was "most of the time I don't know what is being said".
  //
  // BLOCKING AT THE GATE, OPTIONAL IN THE ARTIFACT SCHEMA — D111's
  // derived-or-strict split, the shape playSpine already carries. The corpus
  // predates the field and must keep validating; generation must deliver it.
  //
  // SAFE TO BLOCK HERE, and that is a measured claim rather than a hope: the
  // week stage sends `schema: null` (api-generator.js), so its prose schema IS
  // its transport. This is exactly the condition D144 found missing for
  // `meta.economy` — prose-demanded, gate-enforced, transport-absent — and the
  // reason the establishment surface's floor is NOT landed beside this one.
  //
  // THE BAND IS THE DEMAND. Presence alone would be satisfiable with "Things
  // are difficult this week", which is the sentence this field exists to
  // replace; the low bound buys a real clause and the high bound keeps it one
  // sentence rather than a second epigraph.
  if (floorsOn(expectedOptions)) {
    var stakes = String(weekObj.stakesLine || '').trim();
    if (!stakes) {
      errors.push('Week missing stakesLine — one flat sentence, second person, present tense, '
        + 'naming what is scarce, threatened or wanted THIS week, and carrying either a number '
        + 'or the name of a printed surface (a clock, a track, a strip, a board, a table). It '
        + 'prints under the epigraph and it is the line that tells a reader who understood '
        + 'nothing else what this week is about.');
    } else if (stakes.length < WEEK_STAKES_MIN_CHARS || stakes.length > WEEK_STAKES_MAX_CHARS) {
      var stakesMessage = 'Week stakesLine is ' + stakes.length + ' characters; it must be '
        + WEEK_STAKES_MIN_CHARS + '-' + WEEK_STAKES_MAX_CHARS + '. Shorter than that is a mood '
        + 'label, not stakes; longer is a second epigraph. One sentence naming the scarce or '
        + 'threatened thing, with a number or a printed surface in it.';
      errors.push(stakesMessage);
      // DELTA-CLASS (D167): one named field, one coordinate, satisfiable in
      // isolation. Re-rolling a whole week over one sentence is the waste the
      // delta path exists to stop.
      deltaTargets.push({
        message: stakesMessage,
        pathParts: ['stakesLine'],
        path: formatFieldPath(['stakesLine']),
        requirement: 'week.stakesLine must be ' + WEEK_STAKES_MIN_CHARS + '-'
          + WEEK_STAKES_MAX_CHARS + ' characters — one flat sentence naming what is scarce, '
          + 'threatened or wanted this week, with a number or a printed surface named in it.'
      });
    }
  }

  // ── The brief-transcription ban, week seat (W1) ──
  // Epigraph and interlude body are the week's authored prose. Silent with no
  // brief on the options — see the floor's own header for why that is the
  // honest condition and not a hole.
  if (floorsOn(expectedOptions)) {
    errors = errors.concat(briefTranscriptionFloorErrors([
      { label: 'epigraph.text', text: (weekObj.epigraph || {}).text },
      { label: 'interlude.body', text: (weekObj.interlude || {}).body }
    ], expectedOptions.brief, 'Week'));

    // ── A clock this week feeds is a clock this week prints (W3) ──
    // The spine rides these options already (the closure floors read it); the
    // rulebook is armed alongside it for the report-class prose arm. No spine,
    // no check — a floor never invents the declaration it checks against.
    errors = errors.concat(clockReachabilityFloorErrors(weekObj,
      expectedOptions.weekNumber || expectedOptions.currentWeekNumber,
      expectedOptions.playSpine, expectedOptions.gameRulebook));
    warnings = warnings.concat(clockReachabilityWarnings(weekObj,
      expectedOptions.weekNumber || expectedOptions.currentWeekNumber,
      expectedOptions.playSpine, expectedOptions.gameRulebook));

    // ── Cadence conformance: the book's own promise, per week (§4.11) ──
    // A NEW AXIS beside the arm above, not a rewrite of it: that one asks
    // whether a clock this week FEEDS is a clock this week PRINTS; this one
    // asks whether the pages match the cadence the book declared for itself.
    // Same evidence rule — no spine, no check.
    errors = errors.concat(cadenceConformanceFloorErrors(weekObj,
      expectedOptions.weekNumber || expectedOptions.currentWeekNumber,
      expectedOptions.playSpine));

    // ── The book-scope half of the same question: was the promise kept? ──
    // D199's arm above is week-scoped and attributes an edge to a week by
    // reading `W<n>` out of its `from`. A book-level edge (`banked → clock:X`)
    // carries no week and was checked by nobody, at any seat. Fires at the LAST
    // week only, over every week this run has banked — see the floor's header
    // for why that is the first seat that can see its evidence. No weekCount and
    // no priorWeeks on the options means no check, the same law as above.
    errors = errors.concat(weeklessEdgeRedemptionFloorErrors(weekObj,
      expectedOptions.weekNumber || expectedOptions.currentWeekNumber, {
        weekCount: expectedOptions.weekCount,
        priorWeeks: expectedOptions.priorWeeks,
        playSpine: expectedOptions.playSpine
      }));
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

  // ── Floor: the rep box prints something a player can act on (F9) ──────────
  // D111's class from the data side. The other floors are about surfaces the
  // model SKIPS; this one is about a surface it fills with nonsense. Book 1
  // asked for "Chin-ups 3xAMRAP" and got `repsPerSet: -1` in week 2 and
  // `null` in week 6 — the C-programmer's AMRAP sentinel and a shrug — which
  // printed as three boxes reading "-1" and three reading nothing. Nothing in
  // the stack could have caught it: the artifact schema types the field
  // `['string','integer']` with no bound, no stage validator looked at it, and
  // every `|| '5'` fallback downstream is defeated by a truthy `-1`.
  //
  // NO EXEMPTIONS. Boss weeks and deload weeks print rep boxes like every
  // other week, so unlike F3/F4 there is nothing here to excuse.
  if (floorsOn(expectedOptions) && Array.isArray(weekObj.sessions)) {
    weekObj.sessions.forEach(function (s, si) {
      var exercises = (s && Array.isArray(s.exercises)) ? s.exercises : [];
      exercises.forEach(function (ex, ei) {
        if (!ex || typeof ex !== 'object' || Array.isArray(ex)) return;
        if (isPrintableRepTarget(ex.repsPerSet)) return;
        errors.push('Session ' + (si + 1) + ' exercise ' + (ei + 1)
          + ' (' + (String((ex.name || '')).trim() || 'unnamed') + '): repsPerSet is '
          + describeRepTarget(ex.repsPerSet)
          + ' — the rep boxes print this verbatim, so it must be a positive count or a written'
          + ' target the player can read ("AMRAP", "45s", "8-12", "30s"); blanks, zero, negatives'
          + ' and sentinel values reach the page as nonsense the player cannot act on');
      });
    });
  }

  // ── Floor: the return beat (F7) ───────────────────────────────────────────
  // closingLine on EVERY session, openingEcho from week 2 onward. The first
  // week is exempt from the echo by construction — it has nothing to echo,
  // which is why the artifact schema leaves openingEcho optional and only
  // generation policy demands it. Deficit 2 of the return-loop design, made
  // structural instead of measured after the fact.
  if (floorsOn(expectedOptions) && Array.isArray(weekObj.sessions)) {
    var floorWeekNumber = Number(
      expectedOptions.weekNumber || expectedOptions.currentWeekNumber || weekObj.weekNumber || 0
    );
    weekObj.sessions.forEach(function (s, si) {
      var rb = s && s.returnBeat;
      if (!rb || typeof rb !== 'object' || Array.isArray(rb)) {
        errors.push('Session ' + (si + 1) + ' has no returnBeat — every session must cut tomorrow tonight'
          + ' (returnBeat.closingLine), or the book ends on logistics');
        return;
      }
      // A present-but-empty closingLine is already reported by pushShapeErrors.
      if (floorWeekNumber >= 2 && !String(rb.openingEcho || '').trim()) {
        errors.push('Session ' + (si + 1) + ' returnBeat has no openingEcho — from week 2 onward the world must'
          + ' acknowledge the session just finished, keyed to something the player marked');
      }
    });
  }

  // ── Floor: conditional micro-lines (F3) ───────────────────────────────────
  // At least one keyed line per non-deload week. Same printed page, new pencil
  // state, new reading — the cheapest content the form has, and Book 1 printed
  // none of it in six weeks. The ≤2-per-session ceiling stays a WARN on the
  // assembled path (collectPointerDensityFindings); this is the floor only.
  if (floorsOn(expectedOptions) && !expectedOptions.isDeload && Array.isArray(weekObj.sessions)) {
    var microLineCount = 0;
    weekObj.sessions.forEach(function (s) {
      var lines = s && s.microLines;
      if (Array.isArray(lines)) microLineCount += lines.length;
    });
    if (microLineCount === 0) {
      errors.push('Week prints no conditional micro-lines — a non-deload week must carry at least one'
        + ' sessions[].microLines entry { condition, cue } keyed to a printed state the player can look at');
    }
  }

  pushDoorChoiceErrors(errors, weekObj.doorChoice);

  // ── Floor: the weekly door (F4) ───────────────────────────────────────────
  // Required only for the door-leaning families (DOOR_LEANING_FAMILIES in
  // contract-constants). Those eight recipes each state a two-sided decision the
  // world PRICES, and a doorChoice with both leans posted is that decision
  // printed. The reconstruction seven refuse an antagonist who spends against
  // the player, so they have no lean to post — demanding a door there would
  // manufacture the coin flip the play-loop scan already warns about.
  if (floorsOn(expectedOptions) && weekOwesDoor({
    isBoss: isBoss,
    isDeload: expectedOptions.isDeload,
    mechanicGrammarFamily: expectedOptions.mechanicGrammarFamily
  }) && !weekObj.doorChoice) {
    errors.push('Week posts no doorChoice — the "' + expectedOptions.mechanicGrammarFamily
      + '" grammar prices a decision every week, so this week owes { optionA, optionB } with a lean on each side');
  }

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
      //
      // ── DERIVE OR DECLARE (DR-33) ──
      // What is NOT overwritten, and what nothing before this asked: whether
      // the word the boss page states is reachable from those values at all.
      // The gate reads the OPTIONS' inputs (the real collected record) rather
      // than the unit's copy, precisely because the unit's copy is about to be
      // replaced. Armed on both pipelines already — see the floor's header.
      if (floorsOn(expectedOptions)) {
        errors = errors.concat(
          collectConvergenceChainFloorErrors(boss, expectedOptions.componentInputs));
      }
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

  // ── Floor: the oracle is band-complete (F1) ───────────────────────────────
  // Absence and a wrong entry COUNT were already blocking above; what was never
  // checked at the stage is whether the ten entries actually cover the ten d100
  // bands. A table with ten entries rolled "1".."10" prints as a dice layer the
  // d100 the booklet hands the player cannot address.
  if (floorsOn(expectedOptions) && !isBoss && weekObj.fieldOps) {
    var floorOracle = weekObj.fieldOps.oracleTable || weekObj.fieldOps.oracle;
    if (floorOracle && Array.isArray(floorOracle.entries) && floorOracle.entries.length === 10) {
      collectOracleBandErrors(floorOracle.entries, 'oracleTable').forEach(function (m) {
        errors.push(m);
      });
    }
  }

  // ── Floor: prose budgets cost a retry, not a shrug (F6) ───────────────────
  // Same numbers the assembled path warns on (OUTPUT_BUDGETS), one severity
  // higher because here they are still cheap to fix: the model rewrites the
  // overweight field. Book 1 blew every budget — twelve fragments at roughly
  // double, endings at triple — and shipped sixty pages, because nothing
  // between the prompt and the page ever charged for it.
  if (floorsOn(expectedOptions)) {
    // The stage runs before weekNumber is stamped onto the output, so hand the
    // collector the number the caller knows — otherwise every book's breaches
    // read "Week 1" and the correction directive points at the wrong page.
    var budgetWeek = Object.assign({}, weekObj, {
      weekNumber: Number(expectedOptions.weekNumber || expectedOptions.currentWeekNumber
        || weekObj.weekNumber || 0) || weekObj.weekNumber
    });
    collectBudgetBreaches({ weeks: [budgetWeek] }).forEach(function (b) {
      var message = 'Over budget: ' + b.message;
      errors.push(message);
      // THE DELTA-CLASS DECLARATION (D167). The floor is unchanged — this
      // breach still costs the stage its pass. What is added is the fact the
      // remedy needs: the error is one named string, four characters too long,
      // and here is where it lives. The path is re-based off the ['weeks', 0]
      // wrapper this gate builds, so it is relative to the WEEK OBJECT the
      // stage actually returned — the payload the merge will land on.
      //
      // `message` is carried verbatim so the consumer matches on identity
      // rather than re-deriving: a blocking error is delta-class only when a
      // target claims that exact string.
      deltaTargets.push({
        message: message,
        pathParts: b.path.slice(2),
        path: formatFieldPath(b.path.slice(2)),
        cap: b.cap,
        length: b.length,
        // The floor's own sentence, so the delta prompt states the requirement
        // in the words the gate will re-check it in.
        requirement: b.message
      });
    });
  }

  // ── Floor: the week resolves into the currency the book DECLARED ──────────
  // THE DEFECT THIS CLOSES, measured on the first completed book: every one of
  // its six weeks converted its ticks into a name the book never declared —
  // "Cred", "Pull", "beads" — against a `meta.economy.currencyLabel` of
  // "Favors Owed". Six for six.
  //
  // The rule itself is old (D136/D144): INST_MARK_SURFACE demands the
  // conversion sentence print the label verbatim, and currencyMentionVerdict
  // grades it. What was missing is a gate at the stage that WRITES the
  // sentence. Until now the only reader of that verdict was
  // collectMarkStripFindings, which runs inside validateAssembledBooklet —
  // after every week, every fragment and every ending has been paid for. So a
  // defect a single week could have fixed for the price of one week became a
  // book-level ERROR with no cheap remedy, six times over.
  //
  // Same predicate, same split as the assembled gate, deliberately: 'absent' is
  // an ERROR (the economy resolved into something else) and 'modifier' is a
  // WARNING (the right currency under a slightly different name). Two gates
  // reading one predicate with two different severities would be two rules.
  //
  // SILENT WITHOUT THE LABEL. `currencyLabel` rides expectedOptions from the
  // pipeline that read it off the shell/skeleton; a caller that passes none —
  // the guided-build wizard, the manual API, every hand-assembled replay —
  // gets no check at all. A floor must never invent the declaration it is
  // checking against, which is the same law playSpine is held to above.
  // ── Floor: the week carries its Resolve surface at all (R3) ──────────────
  // THE GAP THIS CLOSES. `week.reckoning` is where a week's ticked marks turn
  // into the book's currency and get spent — the Resolve half of the mark
  // economy. collectMarkStripFindings has always ERRORED on a week without one
  // ("marks are banked but never resolved"), but it runs inside
  // validateAssembledBooklet: after every week, every fragment and every ending
  // has been paid for. A week that simply omitted the panel therefore passed
  // its own stage gate, banked, and failed the book several stages later, with
  // no remedy short of regenerating the week. The same shape of defect the
  // currency floor below was promoted to catch, one level further out: the
  // conversion sentence was gated at this stage while the OBJECT THAT HOLDS IT
  // was not.
  //
  // GENERATION-GATED, and the measurement is why. 21 of 22 corpus fixtures
  // carry no `week.reckoning` on any week (and no `meta.economy` either) — they
  // are books from before the Resolve surface existed, and they are evidence,
  // not output. An artifact-level demand would fail the sealed corpus wholesale
  // to catch a defect only a generating pipeline can commit. The assembled
  // check stays exactly where it is as the second net (D19's severity split
  // applied to placement rather than to level).
  //
  // FOUR ERRORS, ONE ROUND, BY DESIGN. Each missing leaf claims its own error
  // and its own delta target because the classifier matches errors to targets
  // by message IDENTITY, one to one. This is not the D156 cascade — there is no
  // root here whose repair frees the others; all of them are the repair, and
  // the delta machinery asks for all of them in a single call. What it costs is
  // one small structured response instead of a ~30k-token week re-roll, which
  // is the whole of R2's economics.
  //
  // SCOPE IS THE ASSEMBLED GATE'S ERROR SET, exactly. conversion, sink.kind and
  // sink.instruction are what validateAssembledBooklet ERRORS on; `sink.ref` is
  // a WARNING there, and `reckoning.threshold` is DERIVED by assembly from
  // RECKONING_THRESHOLD_RATIO. Promoting a check is moving where it fires, not
  // raising what it demands — so neither is added here.
  if (floorsOn(expectedOptions)) {
    var wkReckoning = (weekObj.reckoning && typeof weekObj.reckoning === 'object')
      ? weekObj.reckoning : null;
    var wkSink = (wkReckoning && wkReckoning.sink && typeof wkReckoning.sink === 'object')
      ? wkReckoning.sink : null;
    var wkCurrency = String((expectedOptions || {}).currencyLabel || '').trim();
    var panelMissing = !wkReckoning ? ' This week has no `reckoning` object at all.' : '';

    var owePresence = function (parts, requirement) {
      var message = 'Week reckoning is missing `' + formatFieldPath(parts) + '` — ' + requirement;
      errors.push(message);
      // THE PRESENCE-CLASS DECLARATION (R2/R3). `presence: true` is the floor's
      // LICENSE for the merge to create this path; without it the merge refuses
      // to write a field that is not already there, which is the no-invent law
      // and stays the default everywhere else. The license is narrow on purpose:
      // it names one exact path, and the merge creates that path and nothing
      // deeper or wider.
      deltaTargets.push({
        message: message,
        pathParts: parts.slice(),
        path: formatFieldPath(parts),
        presence: true,
        requirement: requirement
      });
    };

    if (!String((wkReckoning || {}).conversion || '').trim()) {
      owePresence(['reckoning', 'conversion'],
        'one sentence telling the player what this week\'s ticked marks convert into.'
        + (wkCurrency
          ? ' It must print the declared currency phrase "' + wkCurrency
            + '" VERBATIM, whole, once — not a synonym and not a second name for it.'
          : ' Name the book\'s declared currency in it, whole, once.')
        + ' This is the rule the player reads at the end of the week.' + panelMissing);
    }
    if (!String((wkSink || {}).kind || '').trim()) {
      owePresence(['reckoning', 'sink', 'kind'],
        'the KIND of surface this week\'s converted marks are spent on. Exactly one of: '
        + RECKONING_SINK_KINDS.join(', ') + ' — a sink must reference vocabulary this booklet'
        + ' already renders.' + panelMissing);
    }
    if (!String((wkSink || {}).instruction || '').trim()) {
      owePresence(['reckoning', 'sink', 'instruction'],
        'one instruction telling the player what to DO with the converted marks on that surface'
        + ' (how much fills what, and with which pencil mark). Without it the player is told'
        + ' where the marks go but not what to do there.' + panelMissing);
    }
  }

  if (floorsOn(expectedOptions)) {
    var weekCurrencyLabel = String(expectedOptions.currencyLabel || '').trim();
    var weekConversion = String(((weekObj.reckoning || {}).conversion) || '').trim();
    if (weekCurrencyLabel && weekConversion) {
      var weekMention = currencyMentionVerdict(weekConversion, weekCurrencyLabel);
      if (weekMention === 'absent') {
        // THE DELTA-CLASS DECLARATION AT THE CURRENCY FLOOR (R2). The Crown
        // Job's named case: six weeks, six conversions naming a currency the
        // book never declared, and the remedy for each was a full week re-roll
        // over one sentence. The floor is unchanged — this still costs the
        // stage its pass — but the sentence has one exact coordinate and one
        // requirement statable in the floor's own words, which is the whole
        // test for delta-class. Text-class, not presence-class: the field is
        // there and wrong, so nothing needs creating.
        var currencyMessage = 'reckoning.conversion does not name the declared currency "'
          + weekCurrencyLabel + '" ("' + weekConversion + '") — this booklet resolves into '
          + 'exactly one currency, and the conversion sentence must print that phrase '
          + 'VERBATIM, whole, once. Not a synonym and not a second name for the same thing.';
        errors.push(currencyMessage);
        deltaTargets.push({
          message: currencyMessage,
          pathParts: ['reckoning', 'conversion'],
          path: formatFieldPath(['reckoning', 'conversion']),
          requirement: 'Rewrite this conversion sentence so it prints the declared currency phrase "'
            + weekCurrencyLabel + '" VERBATIM, whole, and once — not a synonym, not a shortened'
            + ' form, and not a second name for the same thing. Keep the mark arithmetic and the'
            + ' surface it names exactly as they are; only the currency phrase is wrong.'
        });
      } else if (weekMention === 'modifier') {
        warnings.push('reckoning.conversion names the currency "' + weekCurrencyLabel
          + '" by its modifier rather than the declared phrase ("' + weekConversion
          + '") — print the whole phrase, or a player counting them reads two currencies');
      }
    }
  }

  // ── Floor: a citation names WHERE, at the stage that writes it (D170) ─────
  // THE MEASURED DEFECT: three of the first completed book's citeRefs carried
  // no pinpoint — "the Vault Night flyer — Station Five pinboard" tells the
  // reader what is there and not where to look. All three were authored at this
  // stage, in `sessions[].microLines[].citeRef`, and all three were caught by
  // collectCiteRefFindings inside validateAssembledBooklet.
  //
  // PROMOTED BECAUSE THE PREDICATE IS LOCAL. citationPinpoints reads exactly two
  // things: the `citedAs` string and the shell family. Both exist here — the
  // family is declared at the shell/skeleton and rides the floor options the way
  // the currency and the spine already do. Nothing about the rest of the book is
  // consulted, so this is the same answer the assembled gate gives, given
  // several expensive stages earlier.
  //
  // WHAT IS DELIBERATELY LEFT BEHIND, and it is not an oversight: the NO-CHAIN
  // law ("a pointer may not point at another pointer") and REF RESOLUTION both
  // need the whole booklet. The fourth defect in this book was a week-6 microLine
  // citing F.15 — a fragment authored two stages LATER, in a fragment batch that
  // does not exist while week 6 is being written. That check cannot move, and
  // pretending otherwise would be a floor asserting against an empty set.
  //
  // Both laws are already TAUGHT (INST_POINT_OF_USE: THE PINPOINT LAW and THE
  // NO-CHAIN LAW, with the per-shell label table). This wave adds no doctrine —
  // only the gate, at the stage that can still fix it cheaply.
  if (floorsOn(expectedOptions) && Array.isArray(weekObj.sessions)) {
    var weekShellFamily = String(expectedOptions.shellFamily || '').trim();
    if (weekShellFamily) {
      var weekCiteStyle = resolveCitationStyle(weekShellFamily);
      weekObj.sessions.forEach(function (s, si) {
        var lines = (s && Array.isArray(s.microLines)) ? s.microLines : [];
        lines.forEach(function (line, mi) {
          var ref = line && line.citeRef;
          if (!ref || typeof ref !== 'object' || Array.isArray(ref)) return;
          var citedAs = String(ref.citedAs || '').trim();
          if (!citedAs) return;   // the shape check above already owns absence
          var pin = citationPinpoints(citedAs, weekShellFamily);
          if (pin.own) return;
          var at = 'Session ' + (s.sessionNumber || (si + 1)) + ' microLine ' + (mi + 1);
          if (pin.foreign.length) {
            errors.push(at + ': citeRef.citedAs "' + citedAs + '" cites in the ' + pin.foreign[0]
              + ' grammar, but this booklet is a ' + weekShellFamily
              + ' — one citation style per artifact ('
              + weekCiteStyle.labelVocabulary.join(' / ') + ')');
          } else {
            errors.push(at + ': citeRef.citedAs "' + citedAs
              + '" carries no pinpoint — a citation names what is there AND where. File the '
              + 'destination as this ' + weekShellFamily + ' would ('
              + weekCiteStyle.labelVocabulary.join(' / ') + ' + a number), or cite the ref itself');
          }
        });
      });
    }
  }

  // ── Floor: the fusion score is STORED, not merely thought (W4a) ───────────
  // FUSION §4.1 has demanded a per-week beat plus a dynamic marking since it
  // was written, and until W4a nothing stored one — the score was G-class, the
  // compiler asked to think in beats and the answer going nowhere. Storing it
  // without a floor would leave it exactly as G-class, because a mid-tier model
  // treats "optional but demanded" as "skip" (D111, the founding lesson).
  //
  // The marking is enum-gated rather than free text because the D114 evidence
  // frame already measures prose volume per week against the book's own
  // maximum: a five-step ordinal can be COMPARED to that curve, and three
  // synonyms for quiet cannot.
  if (floorsOn(expectedOptions)) {
    var beat = weekObj.fusionBeat;
    if (!beat || typeof beat !== 'object') {
      errors.push('Week has no fusionBeat — declare how this week\'s training texture IS its story'
        + ' texture: { beat, marking }, marking one of ' + VALID_DYNAMIC_MARKINGS.join(' | '));
    } else {
      if (!String(beat.beat || '').trim()) {
        errors.push('Week fusionBeat.beat is empty — one sentence naming how the training texture and the'
          + ' story texture are the same thing this week');
      }
      var marking = String(beat.marking || '').trim();
      if (!marking) {
        errors.push('Week fusionBeat.marking is unset — declare this week\'s prose volume: '
          + VALID_DYNAMIC_MARKINGS.join(' | '));
      } else if (VALID_DYNAMIC_MARKINGS.indexOf(marking) === -1) {
        errors.push('Week fusionBeat.marking "' + marking + '" is not a dynamic marking: '
          + VALID_DYNAMIC_MARKINGS.join(' | '));
      }
    }
  }

  // ── The closure floors that can only be checked per week (W4a) ────────────
  // The door and the clocks are authored in THIS chunk; the spine was declared
  // back at the shell/skeleton. The spine rides in through expectedOptions the
  // same way mechanicGrammarFamily does — a caller that omits it gets no spine
  // floors at all, which is the honest failure (a floor with no declaration to
  // check against must not invent one).
  if (floorsOn(expectedOptions)) {
    collectSpineWeekFloorErrors(
      weekObj,
      expectedOptions.playSpine,
      Number(expectedOptions.weekNumber || expectedOptions.currentWeekNumber || weekObj.weekNumber || 0),
      // The stage that AUTHORED the spine, so a spine defect found here routes
      // back to the prompt that can fix it (D143). 'Shell' on the multi-stage
      // pipeline, 'Skeleton' on S+F — the caller knows which seat it sits in.
      expectedOptions.spineStageLabel
    ).forEach(function (msg) { errors.push(msg); });

    collectPuzzleFloorErrors(weekObj).forEach(function (msg) { errors.push(msg); });

    collectLudicWeekOwedErrors(weekObj, expectedOptions.owesLudicEntry)
      .forEach(function (msg) { errors.push(msg); });
  }

  if (warnings.length > 0) {
    console.warn('[LiftRPG] Week advisory:', warnings.join('; '));
  }
  return { valid: errors.length === 0, errors: errors, warnings: warnings, deltaTargets: deltaTargets };
}

// ── The artifact-intent floor (W3 corrective wave, F07) ─────────────────────
// A3 shipped COMPLETE — 6 weeks, 18 sessions, 14 fragments, three critic rounds,
// finalMin 50 — with `meta.artifactIntent` absent. Not thin, not partial: the
// key did not exist. No reading, no selectionReason, no arcFamily, no
// mechanicGrammarFamily. The bench's lens audit printed the diagnosis
// ("reading=MISSING selectionReason=MISSING") and the run continued, because
// the surface was OBSERVED by a report-only lens and REQUIRED by nothing. Two
// of four matrix books shipped that way.
//
// The schema is correctly additive-optional here — no corpus fixture carries an
// artifactIntent, and hand-authored booklets predate the compiler — so the
// demand can only live where generation policy lives: the stage gate, opt-in
// through floorsOn(), which is the D111 shape exactly.
//
// PRESENCE + MINIMUM SHAPE, and no more. Menu conformance (briefMode,
// fidelityMode, homePull, the exclusion arrays, the rejected readings) stays
// advisory where it already is. What BLOCKS is the four things the surface must
// carry for anything downstream to do its job: the two families that bind the
// arc and the board, and a reading with a tone and the evidence it was taken
// from. `tone` is load-bearing as of this same wave — the composition critic's
// register axis grades the artifact against those exact words, so an empty tone
// silently disarms the instrument built to catch the misread.
//
// DELIBERATELY NO SYNTHESIZER. `ensureArtifactIdentity` exists; `ensureArtifactIntent`
// appears zero times in public/, and that asymmetry is now a ruling rather than
// an oversight. A synthesized intent would satisfy every downstream consumer
// with a reading no model ever made — worse than absence, because absence is
// detectable and a fabricated reading grades as faithful. The floor causes a
// retry; the retry causes an author.
//
// ── THE UNEARNED PACKET (D144) ──────────────────────────────────────────────
// A third parameter, and it is the brief, because the fourth thing this floor
// now checks cannot be answered from `meta` alone. MEASURED: the shell prompt
// named zero of the eight shell families, so `classified-packet` was not chosen
// over the others — it was the only one the model could name. W-1 gives it a
// menu with peers and an anti-default; this is the half with teeth.
//
// DELIBERATELY THE WEAKEST FLOOR IN THE FILE, and that is the ruling rather
// than a compromise. It does NOT forbid the packet: a customs house, a censor's
// office and a ministry archive are all legitimately security-shaped, and a
// gate that refused them would be trading one house aesthetic for another. It
// demands a SENTENCE — the same `selectionReason` the compiler already owes for
// every other choice — and only when both halves are true: the shell is the
// packet AND the brief names no body that runs on procedure. A model that made
// the choice on purpose writes one line; a model that defaulted has nothing to
// write, which is exactly the signal.
//
// NO BRIEF ⇒ NO CHECK, on purpose. The ungated callers (the guided-build
// harness, window.LiftRPGAPI.manual) hand-assemble payloads and pass no brief,
// and a floor that fired on absence would block them for not being the
// generation path. Absence is silence here, never a failure — the honest shape
// for a predicate whose input is optional.
// ── THE OBEDIENCE FLOOR (VISION §11, D146) ──────────────────────────────────
// The half with teeth. W-1 drew an assignment for every identity axis and W-2
// handed each compiler seat the ones it authors; without this, both are a
// suggestion, and a suggestion is what the shell menu already was before D144
// measured what it produced.
//
// WHAT IT CHECKS, per axis the stage authors: the delivered value EQUALS its
// assignment, or the axis's evidence surface NAMES the value that was chosen
// instead. Those are the law's two sources and there is no third, so an axis
// that is neither is the default the fourth referee exists to find — caught
// here, at the stage that can still cheaply rewrite it, rather than reported
// after a whole book is paid for.
//
// THE CITATION TEST IS PER-AXIS ON PURPOSE. `selectionReason` funds nine axes
// and `designEvidence` funds six, so "the field is non-empty" would let one
// sentence about the shell excuse a departure on five other axes. Requiring the
// evidence to NAME the value actually chosen is what makes each departure
// individually funded, and it is exactly what the prompt asks for in the
// imperative ("quote the brief phrase that required the change in the evidence
// field named on that line" — INST_SEED_ASSIGNMENT, its other half).
//
// NO SEED CONTEXT ⇒ SILENT, the D144 no-brief idiom. The ungated callers (the
// guided-build harness, window.LiftRPGAPI.manual) hand-assemble payloads and
// draw no run seed; a floor that fired on absence would block them for not
// being the generation path. The pairing is exact: the formatter emits no
// GIVENS block under the same condition, so a stage is never checked against an
// assignment it was not shown.
//
// ABSENCE OF THE FIELD IS SILENT ON EVERY AXIS BUT ONE, and the exception is an
// amendment this floor's first draft argued against. D146 wrote: "this floor
// asks 'did you obey?', never 'did you answer?' — presence is a different
// question with its own floors (artifactIntentFloorErrors above,
// designLanguageFloorErrors below)". That reasoning holds wherever some floor
// really does demand the field, because silence there is already blocked before
// this one is asked.
//
// It did NOT hold for `playSpine.harvestPatterns`, and D149 measured the hole:
// no floor demands that field — the declared-is-built floor only fires when the
// key is present — so omitting it dodges the draw entirely. Not disobedience,
// which this floor catches; a THIRD SOURCE, which the two-source law says does
// not exist. A book that quietly used none of the assigned pattern and a book
// that considered it and refused are indistinguishable at every gate.
//
// THE AMENDMENT (D151): on an axis marked `answerRequired`, an assignment must
// be ANSWERED. Adopt it — and the adoption floor then reads it back off the
// artifact — or DECLINE it on the axis's evidence rail, naming the pattern and
// the reason. MANDATORY ANSWER, NOT MANDATORY ADOPTION: the W5a ruling survives
// intact, because "none of these patterns" is still a legal answer; it is now a
// SPOKEN one. The citation test is the same `evidenceNames` the departure arm
// uses, for the same reason — a sentence naming the thing is the most a machine
// can ask, and it is exactly what the unearned-packet floor asks.
//
// AN EXPLICIT EMPTY LIST IS THE SAME ANSWER AS SILENCE and is treated
// identically on a flagged axis, because `harvestPatterns: []` and no key at all
// say precisely the same thing to every reader. Scoping that unification to the
// flag matters: on an unflagged member axis an empty list keeps its D146
// departure error, so nothing widens where no ruling asked it to.
//
// THE FLAG IS NOT THE WHOLE HOLE. §18d-ii of the floors harness sweeps the rest
// of the table and pins the five axes that can still be dropped in silence
// (shellFamily, boardStateMode, visualArchetype, homePull,
// documentEcology.dominant). Those await a ruling; this floor does not invent
// one for them.
//
// THE GEOMETRY IS NOT CHECKED HERE, by measurement rather than by preference.
// It is authored at the campaign plan, one stage BEFORE the mechanic grammar
// family that D144 W-2 licensed to overrule it, so the exemption
// (familyRefusesGeometry) is unanswerable at the gate that could catch it
// early — and a blocking floor at the assembled gate would cost a whole book
// to enforce a rule whose exception is legitimate. The fourth referee
// classifies it instead, report-class, where both facts are finally in hand.
function evidenceNames(evidence, value) {
  var text = String(evidence || '').toLowerCase();
  var needle = String(value || '').trim().toLowerCase();
  if (!text || !needle) return false;
  // A prose citation may spell a hyphenated enum with spaces ("witness binder"),
  // and refusing that would fail books for typography. Generous in the safe
  // direction: it can accept a citation that is loosely worded, it cannot
  // invent one that is absent.
  return text.indexOf(needle) !== -1 || text.indexOf(needle.replace(/-/g, ' ')) !== -1;
}

function readEvidenceAt(unit, dotPath) {
  var parts = String(dotPath || '').split('.');
  var node = unit;
  for (var i = 0; i < parts.length; i++) {
    if (!node || typeof node !== 'object') return '';
    node = node[parts[i]];
  }
  return typeof node === 'string' ? node : '';
}

// ── REPORT-CLASS AXES (`reportOnly`, W3) ────────────────────────────────────
// One collector, two projections. The five voice-skeleton axes are checked by
// exactly the same arms as every other axis and their findings are routed to
// WARNINGS rather than errors, because the obedience question on a voice axis
// is answerable only against measured prose and the bands that would decide it
// are still to be calibrated from corpus percentiles (D19: policy heuristics
// WARN, contract violations block).
//
// SPLIT AS A PROJECTION, NOT AS A SECOND FLOOR (D93). The arms — the
// mandatory-answer arm, the departure arm, the evidence test — are written once
// and read twice. A parallel `seedObedienceWarnings` with its own copy of the
// logic would be two answers to "did the book obey the die?", and the two would
// stop agreeing on the first amendment either one received.
function collectSeedObedienceFindings(unit, where, stage, seedAssignments) {
  if (!seedAssignments || typeof seedAssignments !== 'object') return [];
  var axes = identityAxesForStage(stage);
  if (!axes.length) return [];
  var errors = [];
  for (var i = 0; i < axes.length; i++) {
    var axis = axes[i];
    var assigned = seedAssignments[axis.id];
    if (!assigned) continue;
    var delivered = readAxisValue(unit, axis);

    // ── THE MANDATORY-ANSWER ARM (D151) ──
    // Silence, and — on a flagged axis only — an explicit empty list, which says
    // the same thing. Unflagged axes fall through to the departure arm below
    // exactly as they did before, so an empty `documentEcology.dominant` keeps
    // its own error and nothing widens outside the ruling.
    var unanswered = delivered === undefined
      || (axis.answerRequired && Array.isArray(delivered) && !delivered.length);
    if (unanswered) {
      if (!axis.answerRequired) continue;
      if (evidenceNames(readEvidenceAt(unit, axis.evidencePath), assigned)) continue;
      errors.push({ axis: axis, reportOnly: !!axis.reportOnly, message:
        (where || 'Stage') + ' → ' + axis.label + ' answers nothing: the system '
        + 'assigned `' + assigned + '` and the book neither declares it nor says why not. '
        + 'An assignment must be ANSWERED. Build it and name it in `' + axis.path + '`, or '
        + 'decline it in `' + axis.evidencePath + '` — write `' + assigned + '` there with '
        + 'the one sentence saying what this book does instead. Declining is legitimate and '
        + 'common; a book that composes with none of them is a legitimate book. Saying nothing '
        + 'is a third source, and under the two-source law there is no third.' });
      continue;
    }

    var obeyed = Array.isArray(delivered)
      ? delivered.some(function (entry) {
        return String(entry || '').trim().toLowerCase() === String(assigned).toLowerCase();
      })
      : String(delivered).trim().toLowerCase() === String(assigned).toLowerCase();
    if (obeyed) continue;

    var evidence = readEvidenceAt(unit, axis.evidencePath);
    var chosen = Array.isArray(delivered) ? delivered : [delivered];
    var funded = chosen.some(function (value) { return evidenceNames(evidence, value); });
    if (funded) continue;

    errors.push({ axis: axis, reportOnly: !!axis.reportOnly, message:
      (where || 'Stage') + ' → ' + axis.label + ' is '
      + (chosen.length ? '`' + chosen.join('`, `') + '`' : 'empty')
      + ', but the system assigned `' + assigned + '` and `' + axis.evidencePath
      + '` does not name what you chose instead. Under the two-source law every identity '
      + 'choice is BRIEF-FUNDED (quote the brief phrase that requires it, in that field) or '
      + 'SEED-ASSIGNED (write `' + assigned + '` exactly). This is neither, which makes it a '
      + 'default. Take the assignment, or name your choice in `' + axis.evidencePath
      + '` alongside the words in the brief that earned it.' });
  }
  return errors;
}

/**
 * The BLOCKING projection. Everything the die assigned that the book neither
 * took nor answered for, on an axis whose obedience is a contract question.
 */
export function seedObedienceFloorErrors(unit, where, stage, seedAssignments) {
  return collectSeedObedienceFindings(unit, where, stage, seedAssignments)
    .filter(function (f) { return !f.reportOnly; })
    .map(function (f) { return f.message; });
}

/**
 * The REPORT projection. Same arms, same evidence, WARNING class — the caller
 * puts these on `warnings` and delivery is never blocked by them (D19).
 * Separate function rather than a flag on the one above, so a caller cannot
 * accidentally concat report-class findings onto its blocking list.
 */
export function seedObedienceFloorWarnings(unit, where, stage, seedAssignments) {
  return collectSeedObedienceFindings(unit, where, stage, seedAssignments)
    .filter(function (f) { return f.reportOnly; })
    .map(function (f) { return f.message; });
}

export function artifactIntentFloorErrors(meta, where, brief, seedAssignments) {
  var errors = [];
  var prefix = (where || 'Stage') + ' → meta.artifactIntent';
  var intent = (meta && typeof meta === 'object') ? meta.artifactIntent : null;

  var identity = (meta && typeof meta === 'object' && meta.artifactIdentity
    && typeof meta.artifactIdentity === 'object') ? meta.artifactIdentity : {};
  var shellFamily = String(identity.shellFamily || '').trim().toLowerCase();
  var briefText = String(brief || '').trim();
  var reason = String((intent && intent.selectionReason) || '').trim();
  // ── PRECEDENCE: AN ASSIGNMENT IS A DERIVATION (VISION §11) ──
  // The two floors must not contradict each other on one field. This one
  // demands a sentence for a packet the brief did not earn; the obedience floor
  // demands the assignment be transcribed. A book whose die said
  // `classified-packet` and which transcribed it obeyed the system exactly, and
  // owes no argument for having done so — the assignment IS the reason, and
  // asking for a second one would teach the model that transcribing is a thing
  // it has to apologise for.
  //
  // Narrow on purpose: only the packet's OWN assignment excuses it. A run whose
  // die said `ship-logbook` and which filed a classified packet anyway is the
  // unearned packet D144 measured, and it still owes its sentence — twice over,
  // because the obedience floor is asking too.
  var packetAssigned = !!(seedAssignments && typeof seedAssignments === 'object'
    && String(seedAssignments.shellFamily || '').toLowerCase() === 'classified-packet');
  if (shellFamily === 'classified-packet' && briefText && !packetAssigned
      && !hasInstitutionalReferent(briefText) && !reason) {
    errors.push((where || 'Stage') + ' → meta.artifactIdentity.shellFamily is "classified-packet" '
      + 'and the brief names no bureau, ministry, agency, department or any other body that runs '
      + 'on procedure — so this is the default, not a choice, unless meta.artifactIntent.selectionReason '
      + 'says what in the brief put it there. Seven other shells are on the menu, four of them carry '
      + 'an investigation, and a world can be formal, sinister or rule-bound without being an institution.');
  }
  if (!intent || typeof intent !== 'object') {
    errors.push(prefix + ' is absent — the artifact planning bundle is this stage\'s '
      + 'binding output (reading, arcFamily, mechanicGrammarFamily); every later stage writes '
      + 'against it, and a booklet without it was never planned, only produced');
    return errors;
  }
  if (!String(intent.arcFamily || '').trim()) {
    errors.push(prefix + '.arcFamily is unset — declare the arc family that shapes the whole '
      + 'tension curve: ' + VALID_ARC_FAMILIES.join(' | '));
  }
  if (!String(intent.mechanicGrammarFamily || '').trim()) {
    errors.push(prefix + '.mechanicGrammarFamily is unset — declare what the world spends '
      + 'against the player: ' + VALID_MECHANIC_GRAMMAR_FAMILIES.join(' | '));
  }
  var reading = (intent.reading && typeof intent.reading === 'object') ? intent.reading : null;
  if (!reading) {
    errors.push(prefix + '.reading is absent — record the winning reading of the brief '
      + '(tone, register, povFrame, impliedSetting, emotionalArc, genreTemplate, ludicReading, '
      + 'briefEvidence); an unrecorded reading cannot be audited or graded against');
    return errors;
  }
  if (!String(reading.tone || '').trim()) {
    errors.push(prefix + '.reading.tone is empty — the tone is the field that quotes the brief, '
      + 'and the field the composition critic grades this book\'s register against');
  }
  if (!String(reading.briefEvidence || '').trim()) {
    errors.push(prefix + '.reading.briefEvidence is empty — name the actual phrases in the brief '
      + 'that drove this reading; an unevidenced reading cannot be checked against what was asked for');
  }
  return errors;
}

/**
 * designLanguageFloorErrors(meta, where) -> string[]
 *
 * THE DESIGN-LANGUAGE FLOOR (W6's close). F07's defect shape, exactly, one wave
 * later: D135 measured three of four maximally divergent briefs wearing
 * BYTE-IDENTICAL government/classified-packet dress, W6 built `meta.designLanguage`
 * to break that, and shipped it DEMANDED in prose (SCHEMA_DESIGN_LANGUAGE marks
 * all nine axes REQUIRED) and REQUIRED BY NOTHING. A mid-tier model treats
 * "optional but demanded" as "skip" — the Teeth Round's founding measurement —
 * and the absence is undetectable until a reader notices the book has no look
 * of its own, which is the same thing as noticing nothing at all.
 *
 * The schema is correctly additive-optional (no corpus fixture carries a design
 * language, and requiring it in booklet-schema.mjs would break every fixture to
 * enforce a prompt rule), so the demand can only live where generation policy
 * lives: the stage gate, opt-in through floorsOn(). The D111 shape.
 *
 * WHAT BLOCKS: presence, plus the nine axes the PROMPT ITSELF marks REQUIRED —
 * not one field more. This floor is deliberately no stricter than what the
 * model is taught, because a gate that demands more than any prompt surface
 * teaches can only be satisfied by improvising, and every retry then buys the
 * same failure (the cipherVarietyFloor lesson, stated in that function above).
 *
 * ENUM MEMBERSHIP BLOCKS TOO, and that is the componentDialect precedent rather
 * than a new severity: resolveDesignLanguage() in renderer/modules/theme.js
 * DROPS an off-menu value instead of defaulting it, on purpose — so a book that
 * authors `typeVoice: "typewriter"` (not a menu member) renders in the
 * archetype's faces and looks entirely intentional. That is invisible
 * misauthoring, and the stage gate is the one place a retry can still fix it
 * cheaply. The schema rejects the same value much later, on the assembled book.
 *
 * "none" AND "archetype-default" ARE REAL ANSWERS and always available, on every
 * enum axis that has them — INST_DESIGN_LANGUAGE says so under HONEST WHEN
 * LACKING. So this floor can always be satisfied honestly; it never pushes a
 * book to manufacture a press its world has no reason to own. What it refuses
 * is SILENCE, which is the one answer that carries no reading of the brief.
 *
 * DELIBERATELY NO SYNTHESIZER, and this is the load-bearing half of the ruling.
 * `ensureArtifactIdentity` exists and could be copied here in twenty lines. It
 * must not be. A synthesized design language would satisfy resolveTheme(), stamp
 * real attributes, paint real ink, and grade as AUTHORED to every instrument
 * downstream — including the eval bench built to measure exactly this
 * convergence. That is strictly worse than absence, because absence is
 * detectable and a fabricated look is not. The floor causes a retry; the retry
 * causes an author. (D136's ruling for register, applied to design.)
 */
export function designLanguageFloorErrors(meta, where) {
  var errors = [];
  var prefix = (where || 'Stage') + ' → meta.designLanguage';
  var spec = (meta && typeof meta === 'object') ? meta.designLanguage : null;
  if (!spec || typeof spec !== 'object') {
    errors.push(prefix + ' is absent — the archetype is a floor, not this book\'s identity, '
      + 'and a book that authors no design language is published in whichever of ten looks its '
      + 'archetype happens to carry. Declare layoutIntensity, productionTexture, toneTexture, '
      + 'typeVoice, documentRecipes, marginSemantics, inkDiscipline, sealTreatment and '
      + 'designEvidence, deriving each from words the brief actually contains');
    return errors;
  }

  // layoutIntensity is the one continuous axis, so it is checked as a number in
  // range rather than as a menu member. `0` is a legitimate value (a clinical
  // instrument that presses as little as the system allows), which is why this
  // tests FINITENESS rather than truthiness — a truthiness test here would read
  // the quietest legal book as an unauthored one.
  //
  // Booleans and arrays are excluded before the range test because Number([])
  // and Number(true) are 0 and 1 — both in range, neither an intensity. The
  // bounds are formatted through toFixed(1) rather than concatenated with '.0',
  // so a future non-integer bound reads as "0.2" and not as "0.2.0".
  var lo = Number(LAYOUT_INTENSITY_BOUNDS.min).toFixed(1);
  var hi = Number(LAYOUT_INTENSITY_BOUNDS.max).toFixed(1);
  var rawIntensity = spec.layoutIntensity;
  var intensity = Number(rawIntensity);
  if (rawIntensity === undefined || rawIntensity === null || rawIntensity === '') {
    errors.push(prefix + '.layoutIntensity is unset — state how hard this book presses, '
      + lo + ' (a clinical instrument) to ' + hi + ' (a poster on every spread)');
  } else if (typeof rawIntensity === 'boolean' || Array.isArray(rawIntensity)
    || !isFinite(intensity)
    || intensity < LAYOUT_INTENSITY_BOUNDS.min || intensity > LAYOUT_INTENSITY_BOUNDS.max) {
    errors.push(prefix + '.layoutIntensity "' + rawIntensity + '" is not a number between '
      + lo + ' and ' + hi);
  }

  // The six menu axes. One table, one message shape: an unset axis and an
  // off-menu axis fail differently because they need different corrections —
  // "choose one" versus "that one does not exist".
  var MENU_AXES = [
    ['productionTexture', VALID_PRODUCTION_TEXTURES, 'the press this object came off'],
    ['toneTexture', TONE_TEXTURE_LADDER, 'how a shade is made on a machine with no grey'],
    ['typeVoice', VALID_TYPE_VOICES, 'who is speaking in ink'],
    ['marginSemantics', VALID_MARGIN_SEMANTICS, 'how the outer margin says what kind of page this is'],
    ['inkDiscipline', VALID_INK_DISCIPLINES, 'how much ink the press laid down'],
    ['sealTreatment', VALID_SEAL_TREATMENTS, 'the seal register']
  ];
  for (var i = 0; i < MENU_AXES.length; i++) {
    var axis = MENU_AXES[i][0];
    var menu = MENU_AXES[i][1];
    var gloss = MENU_AXES[i][2];
    var value = String(spec[axis] === undefined || spec[axis] === null ? '' : spec[axis]).trim();
    if (!value) {
      errors.push(prefix + '.' + axis + ' is unset — declare ' + gloss + ': ' + menu.join(' | '));
    } else if (menu.indexOf(value) === -1) {
      errors.push(prefix + '.' + axis + ' "' + value + '" is not a value this engine draws, so it '
        + 'would be dropped and the book would silently keep the archetype\'s: ' + menu.join(' | '));
    }
  }

  // documentRecipes: at least one family, every key and value on its menu. The
  // prompt asks for "one entry per document family this book uses", so an EMPTY
  // object is the shape that clears a presence check and means nothing — the
  // whole point of reading the shape rather than the key.
  var recipes = spec.documentRecipes;
  if (!recipes || typeof recipes !== 'object' || Array.isArray(recipes)) {
    errors.push(prefix + '.documentRecipes is absent — give each document family this book uses a '
      + 'recipe, so the book\'s papers do not all look alike. Keys: ' + VALID_DOCUMENT_FAMILIES.join(' | ')
      + '. Values: ' + VALID_DOCUMENT_RECIPES.join(' | '));
  } else {
    var families = Object.keys(recipes);
    if (!families.length) {
      errors.push(prefix + '.documentRecipes is empty — an empty object is not a design decision. '
        + 'Name at least the family this book\'s documents actually belong to. Keys: '
        + VALID_DOCUMENT_FAMILIES.join(' | ') + '. Values: ' + VALID_DOCUMENT_RECIPES.join(' | '));
    }
    for (var f = 0; f < families.length; f++) {
      var family = families[f];
      if (VALID_DOCUMENT_FAMILIES.indexOf(family) === -1) {
        errors.push(prefix + '.documentRecipes."' + family + '" is not a document family the '
          + 'renderer stamps, so the recipe would draw on nothing: ' + VALID_DOCUMENT_FAMILIES.join(' | '));
      } else if (VALID_DOCUMENT_RECIPES.indexOf(recipes[family]) === -1) {
        errors.push(prefix + '.documentRecipes.' + family + ' "' + recipes[family] + '" is not a '
          + 'recipe this engine draws: ' + VALID_DOCUMENT_RECIPES.join(' | '));
      }
    }
  }

  // THE DERIVATION LAW's evidence, and the exact counterpart of
  // artifactIntent.reading.briefEvidence above: without it the design language
  // is an assertion, and nothing downstream can check the assertion against
  // what was actually asked for. A design language that cannot cite the brief
  // is a house style wearing the book's name — which is the convergence D135
  // measured, arriving through the machinery built to prevent it.
  if (!String(spec.designEvidence || '').trim()) {
    errors.push(prefix + '.designEvidence is empty — quote the brief\'s own words these choices '
      + 'came from and say what they made the object look like; an uncited design language is a '
      + 'house style wearing this book\'s name');
  }

  return errors;
}

/**
 * arrangementFloorErrors(meta, where) -> string[]
 *
 * THE ARRANGEMENT FLOOR (ARRANGEMENT.md phase A). designLanguageFloorErrors'
 * twin, one constitution later, and the defect it exists to stop is the one
 * VISION §8 names: *layout IS the identity, and the model authors it per book.*
 * The first completed book passed every atom-level gate and every spread was a
 * pile — not because a component was wrong, but because nothing in the pipeline
 * had ever asked who composed the page.
 *
 * WHAT BLOCKS: presence, plus the six fields the PROMPT ITSELF marks REQUIRED —
 * not one more. The cipherVarietyFloor lesson, restated: a gate that demands
 * more than any prompt surface teaches can only be satisfied by improvising,
 * and every retry then buys the same failure.
 *
 * ENUM MEMBERSHIP BLOCKS TOO, on the componentDialect/design-language
 * precedent, and here it is sharper than either. `resolveArrangement()` DROPS
 * an off-menu axis and falls back to the declared grammar's own value, so a
 * book that authors `sectionFurniture: "reverse-bars"` renders the grammar's
 * furniture and looks entirely deliberate. That is invisible misauthoring, and
 * the stage gate is the last place a retry can fix it cheaply.
 *
 * BOTH SEATS RUN THIS, unlike the design-language floor beside it, and the
 * asymmetry is the ROUTING rather than a preference: SCHEMA_ARRANGEMENT and
 * INST_ARRANGEMENT reach the shell stage through STAGE_SCHEMA_MAP and the S+F
 * compiler seat through generateSkeletonPrompt. Both seats are taught, so both
 * may be checked; `arrangementMenuParity()` in scripts/validate.mjs asserts the
 * teaching half, both halves of one rule.
 *
 * DELIBERATELY NO SYNTHESIZER, and this is the load-bearing half. A synthesized
 * arrangement would satisfy resolveArrangement(), stamp real attributes, paint
 * real ink and grade as AUTHORED to every instrument downstream — including the
 * arrangement judge built to read exactly this. That is strictly worse than
 * absence, because absence is detectable and a fabricated design is not. The
 * floor causes a retry; the retry causes an author. (D136's ruling for
 * register, applied a third time.)
 *
 * WHAT THIS FLOOR IS NOT: an aesthetic judge. It checks presence, membership
 * and citation — conformance, in ARRANGEMENT §3.4's word. Whether the grammar
 * is any GOOD on the page, whether the leitmotif earns its repetition, whether
 * the spread is inviting and navigable, is referee 3's question on a rendered
 * page and is report-only indefinitely by ruling (§7). A blocking floor on a
 * rubric nobody has calibrated would refuse good books for confident reasons.
 */
export function arrangementFloorErrors(meta, where) {
  var errors = [];
  var prefix = (where || 'Stage') + ' → meta.arrangement';
  var spec = (meta && typeof meta === 'object') ? meta.arrangement : null;
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    errors.push(prefix + ' is absent — a page is authored, not accumulated, and a book that '
      + 'declares no arrangement is published in whichever layout the engine happens to have. '
      + 'Declare grammar, sectionFurniture, tableTreatment, annotationPattern, leitmotif, '
      + 'atomForms and arrangementEvidence, deriving each from words the brief actually '
      + 'contains. Grammars: ' + VALID_ARRANGEMENT_GRAMMARS.join(' | ')
      + '. Form plans: ' + VALID_FORM_PLANS.join(' | ')
      + ' (singleton families — the ledger — offer the throughout plans only)');
    return errors;
  }

  // The grammar. Checked first and named in its own error, because it is the
  // one field that says what KIND of object this book is — and because
  // "ruled-journal" being a legal answer is the whole point of naming it
  // (ARRANGEMENT §6): today's layout is a choice a book may make, never a
  // default it inherits by saying nothing.
  var grammar = String(spec.grammar === undefined || spec.grammar === null ? '' : spec.grammar).trim();
  if (!grammar) {
    errors.push(prefix + '.grammar is unset — name the family this book\'s pages belong to: '
      + VALID_ARRANGEMENT_GRAMMARS.join(' | ') + '. "ruled-journal" is a real answer and a real '
      + 'decision; it is the quiet ruled notebook, chosen because the story wants one');
  } else if (VALID_ARRANGEMENT_GRAMMARS.indexOf(grammar) === -1) {
    errors.push(prefix + '.grammar "' + grammar + '" is not a grammar this engine composes: '
      + VALID_ARRANGEMENT_GRAMMARS.join(' | '));
  }

  // The four axes, from the one table. Iterated rather than listed so an axis
  // added to the contract cannot be added to the schema, the prompt and the CSS
  // and then be optional here by omission.
  for (var i = 0; i < ARRANGEMENT_AXES.length; i++) {
    var axis = ARRANGEMENT_AXES[i];
    var raw = spec[axis.field];
    var value = String(raw === undefined || raw === null ? '' : raw).trim();
    if (!value) {
      errors.push(prefix + '.' + axis.field + ' is unset — state it explicitly even when it '
        + 'agrees with your grammar: ' + axis.menu.join(' | '));
    } else if (axis.menu.indexOf(value) === -1) {
      errors.push(prefix + '.' + axis.field + ' "' + value + '" is not a value this engine '
        + 'draws, so it would be dropped and the book would silently wear its grammar\'s: '
        + axis.menu.join(' | '));
    }
  }

  // ── THE FORM AXES (ARRANGEMENT §2 axis 5 / §3) ──────────────────────────
  //
  // The five axes above PAINT; these MEASURE. They are floored at the same seat
  // and in the same shape for the arrangement floor's own reason — the
  // declaration lives inside `meta.arrangement`, so it is taught wherever this
  // object is taught, and a floor may check what its seat was shown.
  //
  // WHAT BLOCKS: presence of the object, presence of every family's plan, and
  // membership. Membership is sharper here than anywhere else on this floor:
  // `resolveAtomForms()` DROPS an off-menu plan and the family silently takes
  // `bare`, which is today's exact component — so a book that misauthored
  // `"taught-shed-middle"` renders as if it had chosen the quiet answer and
  // looks entirely deliberate. That is invisible misauthoring, and the stage
  // gate is the last place a retry can fix it cheaply.
  //
  // THE FAMILIES ARE ITERATED, never listed: a family added to
  // ATOM_FORM_FAMILIES gains its floor here in the same edit that gives it a
  // schema key, a die axis and a gate arm.
  var forms = spec.atomForms;
  if (!forms || typeof forms !== 'object' || Array.isArray(forms)) {
    errors.push(prefix + '.atomForms is absent — say how each component TEACHES itself and '
      + 'when it stops. One plan per family: ' + ATOM_FORM_FAMILIES.map(function (f) {
        return f.id + ' (' + formPlansFor(f).join(' | ') + ')';
      }).join('; ')
      + '. A book that declares none prints every component in its bare form, which is a real '
      + 'answer but never an unmade decision');
  } else {
    for (var fi = 0; fi < ATOM_FORM_FAMILIES.length; fi++) {
      var famRow = ATOM_FORM_FAMILIES[fi];
      var raw = forms[famRow.id];
      var plan = String(raw === undefined || raw === null ? '' : raw).trim();
      // The menu is PER-FAMILY (formPlansFor): a singleton family is never
      // offered a shed plan, so a shed plan on it is off-menu and refused with
      // the narrowed menu quoted — never accepted into a rhythm nothing can
      // perform.
      var famMenu = formPlansFor(famRow);
      if (!plan) {
        errors.push(prefix + '.atomForms.' + famRow.id + ' is unset — state the ' + famRow.label
          + '\'s form plan explicitly, even when it is "bare-throughout": '
          + famMenu.join(' | '));
      } else if (famMenu.indexOf(plan) === -1) {
        errors.push(prefix + '.atomForms.' + famRow.id + ' "' + plan + '" is not a plan this '
          + 'family resolves, so it would be dropped and the ' + famRow.label + ' would silently '
          + 'print bare while the book read as having chosen: ' + famMenu.join(' | '));
      }
    }
  }

  // THE DERIVATION LAW's evidence, designEvidence's exact counterpart. It is
  // also the rail the obedience floor reads when a book departs from a seed
  // assignment (contract-constants.mjs IDENTITY_AXES), so an empty string here
  // costs a book both checks at once.
  if (!String(spec.arrangementEvidence || '').trim()) {
    errors.push(prefix + '.arrangementEvidence is empty — quote the brief\'s own words these '
      + 'choices came from, and name any assigned value you did not take; an uncited '
      + 'arrangement is a house layout wearing this book\'s name');
  }

  return errors;
}

/**
 * teachingText(rulesSpread) -> string
 *
 * Everything the rules spread actually PRINTS as teaching, flattened. One
 * reader today (the vocabulary floor below); it exists as a named function
 * because "what counts as the teaching" is a definition, and a definition
 * inlined at its single call site is a definition that gets quietly widened
 * the second time someone needs it.
 */
function rulesTeachingText(rulesSpread) {
  var spread = (rulesSpread && typeof rulesSpread === 'object') ? rulesSpread : {};
  var left = (spread.leftPage && typeof spread.leftPage === 'object') ? spread.leftPage : {};
  var right = (spread.rightPage && typeof spread.rightPage === 'object') ? spread.rightPage : {};
  var parts = [left.title, right.title, right.instruction];
  // reEntryRule is typed `['string','object']` by the artifact schema, so a
  // reader that assumed string would silently contribute nothing on the object
  // form — the failure mode this whole floor exists to catch, one level down.
  if (typeof left.reEntryRule === 'string') parts.push(left.reEntryRule);
  else if (left.reEntryRule && typeof left.reEntryRule === 'object') {
    Object.keys(left.reEntryRule).forEach(function (k) {
      if (typeof left.reEntryRule[k] === 'string') parts.push(left.reEntryRule[k]);
    });
  }
  var orientation = (spread.orientation && typeof spread.orientation === 'object')
    ? spread.orientation : {};
  parts.push(orientation.situation);
  (Array.isArray(orientation.cast) ? orientation.cast : []).forEach(function (entry) {
    if (!entry || typeof entry !== 'object') return;
    parts.push(entry.name, entry.role, entry.note);
  });
  (Array.isArray(left.sections) ? left.sections : []).forEach(function (section) {
    if (!section || typeof section !== 'object') return;
    parts.push(section.heading, section.body, section.text);
  });
  return parts.filter(function (p) { return typeof p === 'string'; }).join('\n');
}

/**
 * teachingNormalize(text) -> string
 *
 * Case-folded, punctuation-flattened, whitespace-collapsed. GENEROUS IN THE
 * SAFE DIRECTION, the evidenceNames idiom directly above: it can accept a term
 * the page spelled loosely (a hyphen written as a space, a capital dropped, a
 * possessive apostrophe), it cannot invent a term the page never printed.
 */
function teachingNormalize(text) {
  return String(text == null ? '' : text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * rulesTeachingFloorErrors(rulesSpread, gameRulebook, where) -> string[]
 *
 * ── THE RULES PAGE TEACHES THE GAME THE RULEBOOK DESIGNED (W1, 2026-08-18) ──
 *
 * The author's verdict on the first delivered book: "most of the time I don't
 * know what is being said... I still don't know how to play the game." The
 * rules page had four sections, passed every gate, and named neither what the
 * training pays out nor what the player physically does with the pencil.
 *
 * THE CHECKABLE HALF of the register split. The register itself — flat,
 * imperative, every term defined at first use — is taught in INST_RULES_TEACH
 * and is not machine-checkable without prose parsing, which is a different
 * wave's work and a worse instrument. What IS checkable, exactly, is the
 * VOCABULARY: the rulebook declares one currency and three-to-five core verbs,
 * the shell seat is shown both verbatim (formatGameRulebookGiven's "The
 * declarations this book is held to"), and a rules page that prints neither is
 * teaching a game other than the one this book plays.
 *
 * ONE DIRECTION ONLY, and the omission is deliberate. The reverse question —
 * "is every world-word on this page defined here?" — needs prose comprehension
 * to answer and would fail books for typography. Presence of the declared
 * vocabulary is the half a machine can hold without lying about what it knows.
 *
 * NO RULEBOOK ⇒ SILENT (the D144 ungated-caller idiom). The wizard and the
 * manual API hand-assemble shells with no rulebook riding the options; a floor
 * that fired on absence would block them for not being the generation path,
 * and — worse — would be checking a page against a design nobody wrote.
 */
export function rulesTeachingFloorErrors(rulesSpread, gameRulebook, where) {
  var errors = [];
  if (!gameRulebook || typeof gameRulebook !== 'object') return errors;
  if (!rulesSpread || typeof rulesSpread !== 'object') return errors;
  var prefix = (where || 'Stage') + ' → rulesSpread';
  var taught = teachingNormalize(rulesTeachingText(rulesSpread));
  if (!taught) return errors;

  var currency = String(((gameRulebook.economy || {}).currency) || '').trim();
  var currencyNeedle = teachingNormalize(currency);
  if (currencyNeedle && taught.indexOf(currencyNeedle) === -1) {
    errors.push(prefix + ' never prints the currency this game runs on. The rulebook you were '
      + 'given names it "' + currency + '" and the rules page is where a player learns that '
      + 'word — every session earns it and every reckoning spends it for the rest of the book. '
      + 'Teach it by name, and define it in the same breath: what one of them IS, and what '
      + 'filling the box means.');
  }

  var verbs = ((gameRulebook.coreVerbs || {}).verbs) || [];
  var missing = (Array.isArray(verbs) ? verbs : []).map(function (entry) {
    return String((entry && entry.verb) || '').trim();
  }).filter(function (verb) {
    if (!verb) return false;
    var needle = teachingNormalize(verb);
    return needle && taught.indexOf(needle) === -1;
  });
  if (missing.length) {
    errors.push(prefix + ' never prints ' + (missing.length === 1 ? 'the core verb' : 'the core verbs')
      + ' "' + missing.join('", "') + '" — the rulebook declares '
      + 'that as something the player physically does with a pencil in this book, and a verb '
      + 'the rules page never names is a verb no player performs. Every core verb gets a '
      + 'sentence on this page saying what you do, on which printed surface, and when.');
  }
  return errors;
}

/**
 * collectClockReachabilityFindings(weekObj, weekNumber, playSpine, gameRulebook)
 *
 * ── A CLOCK THE WEEK FEEDS MUST BE A CLOCK THE WEEK PRINTS (W3) ─────────────
 *
 * The read's defect 8, and the most expensive kind of defect this system can
 * produce: the first delivered book's rules said "at each week's reckoning,
 * shade as many bands as your two strips totalled", and the Root Clock existed
 * in the data of week six only. The book's second economy loop had no surface
 * for 83% of the game. Every gate was green, because no gate had ever compared
 * what the machine says the week DOES against what the page gives the player to
 * do it ON. That is measurement-equals-render, applied to the play graph.
 *
 * THE BLOCKING ARM IS EXACT AND READS ONLY MACHINE DATA. The spine's economy
 * graph declares edges; an edge whose source resolves to THIS week and whose
 * target is `clock:<name>` is the machine saying, in its own words, that this
 * week's play writes into that clock. The clock must then appear in this week's
 * `gameplayClocks` by name. Both sides are strings the BOOK declared — nothing
 * is parsed out of prose, nothing is guessed, and a book whose spine feeds no
 * clock from this week is asked for nothing.
 *
 * Measured before it shipped, across the whole corpus plus the demo plus the
 * delivered book: exactly ONE finding, and it is the defect above (the
 * proving-run book's week 1 owing the Root Clock). Zero findings everywhere
 * else. The corpus predates the spine entirely, so it is silent there by the
 * D144 ungated-caller idiom rather than by an exemption.
 *
 * THE FUZZY ARM WARNS AND NEVER BLOCKS (the decider's standing exception to
 * ambiguity-defaults-to-law). The rulebook's `weekShape` answer is prose, and
 * prose that names a clock is claiming the player touches it EVERY week — which
 * is how the Drought Gauge came to be armed from session one and absent from
 * week one. But "the prose names it" is a substring test against a proper noun,
 * and a substring test can be wrong in a way an edge cannot. So it reports.
 * Promotion is an author ruling on measured evidence.
 */
function normalizeClockName(name) {
  return teachingNormalize(name);
}

/**
 * statedEndingCount(text) -> number | null
 *
 * THE COUNT A BOOK SAYS OUT LOUD. `null` means no count was claimed, which is a
 * different thing from a count of zero and must stay distinguishable: a win
 * condition that never states a number is making no promise, and a gate that
 * invented one would be writing the design instead of checking it.
 *
 * ONE HOME, TWO READERS (D93): the rulebook stage gate and the assembled pass
 * both ask "how many endings did this book promise?", and two spellings of that
 * question would be two answers.
 *
 * Words and digits both, because a designer writes "three endings" and a schema
 * writes "3 endings" and the promise is identical. Bounded at twelve: past that
 * the phrase is a page count or a year, not an ending count.
 */
var ENDING_COUNT_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12
};

function statedEndingCount(text) {
  var raw = String(text == null ? '' : text);
  if (!raw) return null;
  var re = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2})\s+(?:different\s+|possible\s+|distinct\s+)?endings\b/i;
  var m = re.exec(raw);
  if (!m) return null;
  var token = String(m[1]).toLowerCase();
  var n = Object.prototype.hasOwnProperty.call(ENDING_COUNT_WORDS, token)
    ? ENDING_COUNT_WORDS[token] : parseInt(token, 10);
  if (!n || n < 1 || n > 12) return null;
  return n;
}

function collectClockReachabilityFindings(weekObj, weekNumber, playSpine, gameRulebook) {
  var findings = [];
  var wk = Number(weekNumber);
  if (!weekObj || typeof weekObj !== 'object' || !wk) return findings;
  var graph = (playSpine && Array.isArray(playSpine.economyGraph)) ? playSpine.economyGraph : null;
  if (!graph) return findings;

  var printed = {};
  (Array.isArray(weekObj.gameplayClocks) ? weekObj.gameplayClocks : []).forEach(function (clock) {
    var key = normalizeClockName(clock && clock.clockName);
    if (key) printed[key] = true;
  });

  // Every clock the graph names anywhere, and the subset this week FEEDS.
  var allClocks = {};
  var owedHere = {};
  graph.forEach(function (edge) {
    if (!edge || typeof edge !== 'object') return;
    var to = parseSurfaceRef(edge.to);
    if (!to.valid || to.kind !== 'clock' || !to.id) return;
    var key = normalizeClockName(to.id);
    if (!key) return;
    allClocks[key] = to.id;
    var from = parseSurfaceRef(edge.from);
    if (!from.valid || !from.id) return;
    // `reckoning:W3`, `markStrip:W3.1`, `door:W3` — the week is the first
    // number after the W, and a source with no week (`banked`, `assembly`) is
    // a book-level source that owes no particular week anything.
    var m = /^w(\d+)/i.exec(String(from.id));
    if (!m || Number(m[1]) !== wk) return;
    owedHere[key] = to.id;
  });

  Object.keys(owedHere).forEach(function (key) {
    if (printed[key]) return;
    findings.push({ reportOnly: false, message: 'Week ' + wk + ' → the play spine feeds `clock:'
      + owedHere[key] + '` from this week (an economyGraph edge out of week ' + wk + '), and this '
      + 'week\'s `gameplayClocks` does not carry it. The machine says the player marks that clock '
      + 'here; the page gives them nothing to mark. Either print the clock in this week\'s '
      + 'gameplayClocks under exactly the name the graph uses, or the edge is describing a loop '
      + 'this book never gives the player a surface for — which is a whole economy the reader '
      + 'is told about and can never touch.' });
  });

  // The prose arm. Report-class, and scoped to clocks the graph already names,
  // so a substring hit can never invent a clock that does not exist.
  var weekShape = teachingNormalize((((gameRulebook || {}).weekShape) || {}).answer);
  if (weekShape) {
    Object.keys(allClocks).forEach(function (key) {
      if (printed[key] || owedHere[key]) return;
      if (weekShape.indexOf(key) === -1) return;
      findings.push({ reportOnly: true, message: 'Week ' + wk + ' → the rulebook\'s weekShape '
        + 'answer describes what happens EVERY week and it names `' + allClocks[key] + '`, which '
        + 'this week does not print. If the player touches that clock every week, it belongs in '
        + 'every week\'s gameplayClocks; if it arrives later, weekShape should say from which '
        + 'week. Reported, not refused: this reads a proper noun out of prose, and prose can be '
        + 'read wrong in a way a graph edge cannot.' });
    });
  }
  return findings;
}

export function clockReachabilityFloorErrors(weekObj, weekNumber, playSpine, gameRulebook) {
  return collectClockReachabilityFindings(weekObj, weekNumber, playSpine, gameRulebook)
    .filter(function (f) { return !f.reportOnly; })
    .map(function (f) { return f.message; });
}

export function clockReachabilityWarnings(weekObj, weekNumber, playSpine, gameRulebook) {
  return collectClockReachabilityFindings(weekObj, weekNumber, playSpine, gameRulebook)
    .filter(function (f) { return f.reportOnly; })
    .map(function (f) { return f.message; });
}

/**
 * weeklessEdgeRedemptionFloorErrors(weekObj, weekNumber, options) -> [message]
 *
 * ── THE PROMISE, REDEEMED (the adversarial forge's HOLE 1, 2026-08-20) ──────
 *
 * `surfaceRefResolves()` runs a PROMISE RULE at the spine seat: when nothing of
 * a kind is authored yet, `clock:Ghost Meridian` is an intention and is
 * accepted, because a spine declared before any content exists must be
 * declarable. That rule is right, and nothing anywhere ever asked whether the
 * promise was KEPT.
 *
 * The arm above (D199) asks the week-scoped half — a clock THIS WEEK feeds is a
 * clock THIS WEEK prints — and it attributes an edge to a week by reading `W<n>`
 * out of the `from` id. An edge out of a BOOK-LEVEL singleton (`banked`,
 * `boss`, `assembly`) carries no week, so that arm skips it, correctly, and
 * NOTHING ELSE PICKED IT UP: on the bench stub 9 of 23 edges are
 * `banked → clock:X`, which is the dominant shape in the corpus, and run 3
 * shipped four `map:Garden Terrace` edges to a map printed in no week with
 * report-class warnings as the only trace.
 *
 * THE DEMAND (author ruling, 2026-08-20): a weekless edge's endpoint must exist
 * SOMEWHERE in the book — the same standard the week-scoped arm already meets,
 * widened from week scope to book scope.
 *
 * ── THE SEAT IS A CORRECTION, AND IT IS THE D200-3b LAW ─────────────────────
 *
 * The ruling as briefed named the ECONOMY-GRAPH seat, "where the whole graph is
 * first visible". The whole graph is indeed first visible there — and the union
 * of all weeks' surfaces is not: `economyGraph` runs BEFORE the first week on
 * both pipelines (API_STAGE_ORDER_BY_PIPELINE, index.html), and
 * `validateEconomyGraphStage` is handed `priorGraph` and `weekCount` and no week
 * payload at all. A floor there could only ask its question against an empty
 * inventory, which is a gate that cannot see its evidence reporting a pass —
 * exactly the defect the disclosure law was written for. The DEMAND is
 * unchanged; only the seat moved, to the first seat at which the evidence
 * exists.
 *
 * THE LAST WEEK'S GATE, then, and blocking there:
 *   · every week is authored by the time the last one is judged, so the union is
 *     complete and a finding cannot be a false miss;
 *   · the last week can REPAIR it — a book-level edge names no week, so printing
 *     the surface in this week satisfies it, which is a local, delta-shaped fix
 *     of exactly the kind the week seat is good at;
 *   · it is a generation-stage gate, so it blocks (the assembled reader does
 *     not — api-generator.js logs and delivers) and it is eligible for the
 *     two-halves registry the assembled gate is excluded from.
 *
 * WHICH KINDS, and the absences are the argument. `clock`, `companion` and `map`
 * are the kinds a WEEK prints under a name of its own choosing — the same set
 * `CADENCE_NAMED_SURFACE_KINDS` reasons its way to, for the same reason.
 * `fragment`, `seal` and `ending` are named surfaces too and are deliberately
 * NOT here: they are written by the fragments and endings stages, which run
 * AFTER the last week, so the last week's gate cannot see their evidence and
 * demanding them would break the same law in the other direction.
 *
 * WHICH EDGES. Only edges with NO week-shaped endpoint on either side. That is a
 * clean partition against D199's arm rather than an overlap: an edge that names
 * a week is owned by that week's gate and reported there, and reporting the same
 * absent surface twice would spend two errors of a retry's budget on one fix.
 *
 * NO EVIDENCE, NO CHECK (the D144 ungated-caller idiom, three times over): no
 * spine, no `weekCount`, or a caller that is not the last week ⇒ silent. The
 * sealed corpus predates the spine and is untouched.
 */
var BOOK_SCOPE_REDEEMABLE_KINDS = { clock: 1, companion: 1, map: 1 };

function refIsWeekShaped(parsed) {
  return !!(parsed && parsed.valid && parsed.id
    && /^w\s*\d+/i.test(String(parsed.id).trim()));
}

export function weeklessEdgeRedemptionFloorErrors(weekObj, weekNumber, options) {
  var errors = [];
  var opts = options || {};
  var wk = Number(weekNumber);
  var total = Number(opts.weekCount);
  if (!weekObj || typeof weekObj !== 'object' || !wk) return errors;
  // The last week ONLY: before it, a surface absent so far may still arrive.
  if (!(total > 0) || wk !== total) return errors;
  var spine = opts.playSpine;
  var graph = (spine && Array.isArray(spine.economyGraph)) ? spine.economyGraph : null;
  if (!graph || !graph.length) return errors;

  // THE BOOK'S OWN INVENTORY, from the one home (D93/D204): every week this run
  // has banked, plus the week now under judgement.
  var priorWeeks = Array.isArray(opts.priorWeeks) ? opts.priorWeeks : [];
  var allWeeks = priorWeeks.concat([weekObj]).map(function (w, i) {
    if (w && typeof w === 'object' && !(Number(w.weekNumber) > 0)) {
      return Object.assign({}, w, { weekNumber: i + 1 });
    }
    return w;
  });
  var index = buildSurfaceIndex({ weeks: allWeeks });

  var reported = {};
  graph.forEach(function (edge, ei) {
    if (!edge || typeof edge !== 'object') return;
    var from = parseSurfaceRef(edge.from);
    var to = parseSurfaceRef(edge.to);
    // Owned by D199's week-scoped arm — see the header's partition note.
    if (refIsWeekShaped(from) || refIsWeekShaped(to)) return;
    [{ side: 'from', parsed: from }, { side: 'to', parsed: to }].forEach(function (end) {
      var p = end.parsed;
      if (!p.valid || !p.id) return;                      // singletons carry no id
      if (!BOOK_SCOPE_REDEEMABLE_KINDS[p.kind]) return;
      var key = toSlugWords(p.id);
      if (!key) return;
      var bucket = index.kinds[p.kind];
      if (bucket && bucket[key]) return;
      var dedupe = p.kind + ':' + key;
      if (reported[dedupe]) return;
      reported[dedupe] = true;
      errors.push('Week ' + wk + ' → `playSpine.economyGraph[' + ei + '].' + end.side + '` names `'
        + p.kind + ':' + p.id + '` and no week in this book prints a ' + p.kind + ' by that name. '
        + 'That edge starts or ends at a surface the player will never see, so the loop it '
        + 'describes is an economy the reader is told about and can never touch. This edge names '
        + 'no week, so ANY week can satisfy it — this is the last week, and therefore the last '
        + 'chance: print `' + p.id + '` in this week under exactly that name (a clock in '
        + '`gameplayClocks`, a companion in `fieldOps.companionComponents`, a map in '
        + '`fieldOps.mapState`), or the book ships with a promise it never keeps.');
    });
  });
  return errors;
}

/**
 * collectCadenceConformanceFindings(weekObj, weekNumber, playSpine) -> [message]
 *
 * ── DID YOU BUILD WHAT YOU DECLARED? (VISION §4.0, §4.11) ───────────────────
 *
 * D199's arm above asks whether a clock this week FEEDS is a clock this week
 * PRINTS. This asks the next question: the book stated, per edge, how often the
 * player touches it — so do the pages match the book's own promise?
 *
 * BLOCKING, AT THE WEEK GATE. The design doc specified the assembled gate; that
 * was its own error and the decider corrected it (2026-08-18). The assembled
 * gate does not block — api-generator.js logs its errors and delivers the
 * booklet ("whole-booklet patching is disabled by policy") — so a floor there is
 * telemetry wearing a gate's name, which is worse than no gate. Here it blocks,
 * it fires at the seat that can repair one week with a delta, and it is eligible
 * for the two-halves registry that the assembled gate is excluded from by that
 * registry's own written law.
 *
 * IT READS ONLY MACHINE DATA, D199's discipline exactly: a declared cadence, a
 * declared surface name, and the surfaces this week's own payload prints. No
 * prose is parsed and nothing is guessed. A book that declares no cadence is
 * asked for nothing — absence stays legal (the sealed corpus predates all of
 * this and is silent here by the D144 ungated-caller idiom, not by an exemption).
 *
 * WHICH ENDPOINTS ARE CHECKABLE, and why the answer is narrow. An endpoint
 * qualifies when it names a SURFACE BY NAME (`clock:Root Clock`) rather than by
 * week (`markStrip:W3.1`). A week-shaped ref is bound to its own week by its own
 * id, so a weekly cadence demand on it would ask week 5 to print week 3's mark
 * strip — a false miss the moment it fired. The three kinds that carry names are
 * clock, companion and map; oracle, cipher and door are indexed by week ordinal
 * only, so every ref to them is week-shaped and skipped by the same rule.
 */
var CADENCE_NAMED_SURFACE_KINDS = ['clock', 'companion', 'map'];

function cadenceCheckableEndpoints(edge) {
  var out = [];
  ['from', 'to'].forEach(function (side) {
    var parsed = parseSurfaceRef(edge[side]);
    if (!parsed.valid || !parsed.id) return;
    if (CADENCE_NAMED_SURFACE_KINDS.indexOf(parsed.kind) === -1) return;
    // Week-shaped ids belong to their own week and cannot carry a cross-week
    // cadence demand. See the header.
    if (/^w\s*\d+/i.test(String(parsed.id).trim())) return;
    out.push({ kind: parsed.kind, id: parsed.id, key: toSlugWords(parsed.id) });
  });
  return out;
}

function weekPrintsSurface(surfaces, kind, key) {
  var bucket = surfaces.kinds[kind];
  return !!(bucket && bucket[key]);
}

// Does D199's arm already own this miss? Its scope is exactly: an edge whose
// `from` names THIS week and whose `to` is a clock. Reporting the same absent
// clock twice would spend two errors of a retry's budget on one fix.
function clockArmAlreadyOwns(edge, kind, wk) {
  if (kind !== 'clock') return false;
  var to = parseSurfaceRef(edge.to);
  if (!to.valid || to.kind !== 'clock') return false;
  var from = parseSurfaceRef(edge.from);
  if (!from.valid || !from.id) return false;
  var m = /^w(\d+)/i.exec(String(from.id));
  return !!m && Number(m[1]) === wk;
}

export function cadenceConformanceFloorErrors(weekObj, weekNumber, playSpine) {
  var errors = [];
  var wk = Number(weekNumber);
  if (!weekObj || typeof weekObj !== 'object' || !wk) return errors;
  var graph = (playSpine && Array.isArray(playSpine.economyGraph)) ? playSpine.economyGraph : null;
  if (!graph) return errors;

  var surfaces = deriveWeekSurfaces(weekObj, wk);

  graph.forEach(function (edge) {
    if (!edge || typeof edge !== 'object') return;
    var cadence = edge.cadence;
    if (!cadence || typeof cadence !== 'object' || Array.isArray(cadence)) return;
    var mode = String(cadence.mode || '').trim();
    if (VALID_EDGE_CADENCES.indexOf(mode) === -1) return;

    var edgeLabel = '`' + String(edge.from || '?') + '` → `' + String(edge.to || '?') + '`';

    // ── The half-declaration arm (the manifestPointer idiom) ────────────────
    // A mode whose companion number is missing is a declaration that reads as a
    // record and checks as nothing. The schema catches `late` without an
    // introWeek; `window` owes `closesAtWeek`, which is a SIBLING of cadence and
    // so cannot be conditioned on the schema node. Both read one table.
    //
    // THE ONE ARM IN THIS FLOOR THAT DOES NOT CARRY THE WEEK'S LABEL (the
    // teaching audit, 2026-08-20). Every other arm above and below asks the week
    // for something the week can give — print the surface, or stop printing it —
    // so an unprefixed `Week N → ` message correctly means "the seat that raised
    // this owns the fix". This arm does not: the missing number lives on a spine
    // EDGE, authored at the shell seat and paced by the economy-graph stage, and
    // the week unit has no field to put it in. Labelled with the owning stage so
    // repairOwnerForError routes it BACKWARD to the seat that can repair it —
    // which is the route REPAIR_STAGE_ORDER's own comment already anticipated
    // and no label had ever made reachable. Guarded upstream today
    // (validateEconomyGraphStage checks the same table on every edge it returns,
    // and that stage always precedes weeks), so this fires only if stage order
    // changes or a resumed checkpoint carries an old spine past the graph gate —
    // exactly the cases where burning every week attempt on an unfixable defect
    // would be worst.
    var owed = EDGE_CADENCE_REQUIRED_FIELDS[mode];
    if (owed) {
      var owedValue = owed === 'introWeek' ? cadence.introWeek : edge[owed];
      if (!(Number(owedValue) > 0)) {
        errors.push('Economy Graph → the economy-graph edge ' + edgeLabel + ' declares '
          + '`cadence.mode: "' + mode + '"` and does not carry `' + owed + '`. That cadence is '
          + 'a promise about WHICH WEEKS the player touches this edge, and without `' + owed + '` '
          + 'it names no week — it reads as a declaration and checks as nothing. Give it '
          + '`' + owed + '`, or use a cadence that does not need one.');
        return;
      }
    }

    var introWeek = Number(cadence.introWeek) > 0 ? Number(cadence.introWeek) : 1;
    var closesAtWeek = Number(edge.closesAtWeek) > 0 ? Number(edge.closesAtWeek) : 0;

    cadenceCheckableEndpoints(edge).forEach(function (ep) {
      var present = weekPrintsSurface(surfaces, ep.kind, ep.key);
      var named = '`' + ep.kind + ':' + ep.id + '`';

      if (mode === 'weekly') {
        if (wk < introWeek || present) return;
        if (clockArmAlreadyOwns(edge, ep.kind, wk)) return;
        errors.push('Week ' + wk + ' → the economy-graph edge ' + edgeLabel + ' is declared '
          + '`cadence.mode: "weekly"`' + (introWeek > 1 ? ' from week ' + introWeek : '')
          + ', and this week does not print ' + named + '. Weekly is the book\'s own promise that '
          + 'the player touches this surface every week from ' + (introWeek > 1 ? 'week ' + introWeek : 'week 1')
          + ' — so either print it in this week under exactly the name the graph uses, or change '
          + 'the cadence to the one this book actually has. A weekly loop the page provides in '
          + 'some weeks and not others is an economy the reader is told about and cannot touch.');
        return;
      }

      if (mode === 'late') {
        if (wk < introWeek && present) {
          errors.push('Week ' + wk + ' → the economy-graph edge ' + edgeLabel + ' is declared '
            + '`cadence.mode: "late"` arriving in week ' + introWeek + ', and this week prints '
            + named + ' already. Late means the surface is DELIBERATELY absent until week '
            + introWeek + '; printing it earlier makes the declaration false. Either move the '
            + 'surface out of this week, or set `introWeek` to the week it really starts.');
          return;
        }
        if (wk >= introWeek && !present) {
          if (clockArmAlreadyOwns(edge, ep.kind, wk)) return;
          errors.push('Week ' + wk + ' → the economy-graph edge ' + edgeLabel + ' is declared '
            + '`cadence.mode: "late"` arriving in week ' + introWeek + ', and this week is at or '
            + 'past that and does not print ' + named + '. A late arrival still has to arrive. '
            + 'Print it under exactly the name the graph uses, or correct `introWeek`.');
        }
        return;
      }

      if (mode === 'window') {
        if (closesAtWeek && wk > closesAtWeek && present) {
          errors.push('Week ' + wk + ' → the economy-graph edge ' + edgeLabel + ' is declared '
            + '`cadence.mode: "window"` closing at week ' + closesAtWeek + ', and this week still '
            + 'prints ' + named + '. A window that is still on the page after it closes is not a '
            + 'window — it is a deadline the player has no way to feel. Either stop printing the '
            + 'surface after week ' + closesAtWeek + ', or extend `closesAtWeek` to the truth.');
        }
      }
      // `once` is book-scope and cannot be judged from one week — see
      // collectCadenceOnceFindings, which reports it after assembly.
    });
  });

  return errors;
}

/**
 * collectCadenceOnceFindings(booklet) -> [{ message }]
 *
 * THE ONE ARM THE WEEK GATE CANNOT CARRY (§4.11). `once` says the player takes
 * this edge a single time at no fixed week, so no single week's payload can
 * confirm or deny it — only the whole book can, and only weakly: the honest
 * question at book scope is whether the surface is printed ANYWHERE.
 *
 * REPORT-CLASS, and labelled as telemetry rather than as a gate. It runs inside
 * validateAssembledBooklet, whose errors do not block delivery, so a blocking
 * severity here would be a claim the mechanism cannot honour (D19, and the
 * floor-teaching registry's own scope note). It carries no registry row for
 * exactly that reason — the registry admits blocking generation-stage floors
 * only, and pretending otherwise would put a row in a table whose law excludes it.
 */
export function collectCadenceOnceFindings(booklet) {
  var findings = [];
  var doc = booklet || {};
  var spine = ((doc.meta || {}).playSpine) || null;
  var graph = (spine && Array.isArray(spine.economyGraph)) ? spine.economyGraph : null;
  if (!graph) return findings;
  var ledger = deriveWeeklySurfaceLedger(doc);
  if (!ledger.length) return findings;

  graph.forEach(function (edge) {
    if (!edge || typeof edge !== 'object') return;
    var cadence = edge.cadence;
    if (!cadence || typeof cadence !== 'object') return;
    if (String(cadence.mode || '').trim() !== 'once') return;
    cadenceCheckableEndpoints(edge).forEach(function (ep) {
      var anywhere = ledger.some(function (row) {
        return weekPrintsSurface(row, ep.kind, ep.key);
      });
      if (anywhere) return;
      findings.push({ message: 'The economy-graph edge `' + String(edge.from || '?') + '` → `'
        + String(edge.to || '?') + '` is declared `cadence.mode: "once"`, and `' + ep.kind + ':'
        + ep.id + '` is printed in no week of this book. A once-only affordance still has to be '
        + 'somewhere the player can reach it. Reported, not refused: this is measured after '
        + 'assembly, where nothing blocks.' });
    });
  });
  return findings;
}

/**
 * collectOracleWriteTargetFindings(booklet) -> [{ message }]
 *
 * ── DR-32: THE ORACLE'S WRITE TARGET, REPORT-CLASS ──────────────────────────
 *
 * The clock arm above asks the same question from the machine side: a play
 * spine's `economyGraph` edge names `clock:X` out of week 3, so week 3 owes a
 * printed clock called X. That arm has a graph to read, and it BLOCKS.
 *
 * This arm has only prose. An oracle entry's `paperAction` is a free string,
 * and the corpus's 652 of them carry ZERO surface-ref grammar — the schema's
 * `oracleTable.entries[].clockTarget` is declared, populated in none of 1065
 * corpus entries, and read by no code in this repo. So the only way to ask
 * "does the book print the thing this action tells the player to mark?" is to
 * read a surface name out of an instruction sentence, which is a guess about
 * English. It therefore WARNS and never blocks — the D199 conservatism
 * precedent, applied to a matcher with even less to stand on.
 *
 * MEASURED BEFORE ARMED (scripts/measure-oracle-write-targets.mjs, run on the
 * 21-book corpus 2026-08-18). The broad verb-phrase grammar the measurement
 * swept is NOT precise enough to ship: over 350 prepositional captures it
 * resolved 18% exactly, and its misses were dominated by page furniture the
 * inventory structurally cannot hold ("mission journal", "survey grid", "the
 * nearest open margin", "the DOCUMENT DATES field"). Two slices survived:
 *
 *   · `advance <Named Surface>` / `reduce <Named Surface>` — 174 of 195 direct
 *     captures resolved exactly. This is the ANTI-VACUITY half: it proves the
 *     matcher can say yes, which an arm built only on the failing idiom could
 *     never demonstrate.
 *   · `add <quantity> to <Named Surface>` — 133 captures, 124 unresolved, and
 *     ALL 124 came from four books that print no clock and no component by the
 *     name the action uses (spot-verified by hand: variety-04-cargo tells the
 *     player eleven times to add to a "Suspicion track" it never prints).
 *
 * WHAT THIS ARM CANNOT PROVE, stated because the number is zero: no book in
 * the corpus uses the `add … to X` idiom AND prints X, so the corpus contains
 * no true negative for that half. Its false-positive rate on a well-formed
 * book is UNMEASURED. That is the honest reason it is report-class, and the
 * reason a promotion to blocking owes a corpus that contains the positive case
 * first.
 *
 * BOOK-LEVEL BY NECESSITY, not by preference. A week-3 oracle may legitimately
 * point at a companion printed in week 1, so a week-seat version of this check
 * would report misses that are not misses — a gate that cannot see its
 * evidence reports the wrong thing (D200-3b, in the other direction).
 *
 * The inventory is `buildSurfaceIndex` below — the floors' own index, not a
 * second one (D93).
 */

// Direct object IS the surface: these two verbs act on a named quantity.
var WRITE_TARGET_DIRECT_VERBS = ['advance', 'reduce'];
// Direct object is the written VALUE; the surface arrives after "to".
var WRITE_TARGET_ADD_VERBS = ['add'];

// An instruction starts a clause. Without this the noun readings win: "The log
// shows the tape was calibrated on Day 1" would extract a write to "Day 1".
var WRITE_TARGET_CLAUSE_HEAD = /(?:^|[.;:!?,—–()"'“”]\s*|\b(?:and|or|then|also|but)\s+)$/i;
var WRITE_TARGET_STOP = {
  by: 1, as: 1, with: 1, to: 1, at: 1, on: 1, in: 1, and: 1, or: 1, for: 1,
  from: 1, if: 1, when: 1, per: 1, using: 1, under: 1, the: 1, a: 1, an: 1,
  this: 1, that: 1, your: 1, its: 1, their: 1, onto: 1, into: 1, beside: 1,
  against: 1, until: 1, then: 1, but: 1, now: 1, no: 1, not: 1, of: 1, is: 1,
  was: 1, are: 1, were: 1, next: 1, alongside: 1, adjacent: 1, above: 1,
  below: 1, each: 1, both: 1
};
var WRITE_TARGET_DEICTIC = /^(it|them|this|that|these|those|here|there|one|each|both|him|her|us|me|you|all|level\s+\d+|\d+[a-z]*)$/i;
// A capture made only of these names the paper, not a designed surface.
var WRITE_TARGET_FURNITURE = {
  map: 1, margin: 1, grid: 1, journal: 1, log: 1, logbook: 1, page: 1,
  sheet: 1, form: 1, track: 1, box: 1, boxes: 1, line: 1, field: 1, column: 1,
  note: 1, notes: 1, table: 1, chart: 1, tracker: 1, ledger: 1, card: 1,
  slot: 1, slots: 1, space: 1, section: 1, row: 1, header: 1, footer: 1,
  panel: 1, strip: 1, book: 1, booklet: 1, record: 1, records: 1, sidebar: 1,
  blank: 1, entry: 1, my: 1, our: 1, current: 1
};
// The prose adds these to a printed surface's own name, on either side: the
// clock called "Suspicion" is written "the Suspicion track", and the map node
// called "N4" is written "node N4". One retry per side — never both at once,
// because stripping from both ends of a two-token capture leaves nothing and
// an empty slug matches everything.
var WRITE_TARGET_NAME_SUFFIXES = {
  track: 1, clock: 1, tracker: 1, meter: 1, gauge: 1, dial: 1, log: 1,
  bar: 1, counter: 1, strip: 1
};
var WRITE_TARGET_NAME_PREFIXES = {
  node: 1, tile: 1, cell: 1, edge: 1, zone: 1, sector: 1, ring: 1, panel: 1,
  box: 1, slot: 1, column: 1, row: 1, track: 1, clock: 1, square: 1
};
var WRITE_TARGET_MAX_TOKENS = 4;

var WRITE_TARGET_DIRECT_RE = new RegExp(
  '\\b(' + WRITE_TARGET_DIRECT_VERBS.join('|') + ')\\s+(?:the\\s+|your\\s+)?'
  + '([A-Za-z0-9][^.;:!?,()]{0,60})', 'gi');
var WRITE_TARGET_ADD_RE = new RegExp(
  '\\b(' + WRITE_TARGET_ADD_VERBS.join('|') + ')\\b[^.;:!?]{0,40}?\\bto\\s+'
  + '(?:the\\s+|your\\s+|this\\s+|its\\s+|their\\s+|a\\s+|an\\s+)?'
  + '([A-Za-z0-9][^.;:!?,()]{0,60})', 'gi');

function trimWriteTarget(raw) {
  var kept = [];
  var parts = String(raw == null ? '' : raw).trim().split(/\s+/);
  for (var i = 0; i < parts.length; i++) {
    var bare = parts[i].replace(/^[^A-Za-z0-9]+/, '').replace(/[^A-Za-z0-9'’]+$/, '');
    if (!bare) break;
    if (WRITE_TARGET_STOP[bare.toLowerCase()]) break;
    kept.push(bare);
    if (kept.length >= WRITE_TARGET_MAX_TOKENS) break;
  }
  return kept.join(' ');
}

function extractWriteTargets(actionText) {
  var src = String(actionText == null ? '' : actionText);
  if (!src) return [];
  var out = [];
  function scan(re) {
    re.lastIndex = 0;
    var m;
    while ((m = re.exec(src)) !== null) {
      if (!WRITE_TARGET_CLAUSE_HEAD.test(src.slice(0, m.index))) continue;
      var target = trimWriteTarget(m[2]);
      if (!target) continue;
      // An all-caps multi-word capture is the verbatim string the player
      // writes, never the thing they write it on.
      if (/^[A-Z0-9][A-Z0-9 '’-]*$/.test(target) && target.split(/\s+/).length > 1) continue;
      if (WRITE_TARGET_DEICTIC.test(target)) continue;
      // A NAMED surface carries a capital somewhere. Lower-case captures are
      // "one slot", "first box", "the last exercise completed" — descriptions
      // of a place on a page, not the name of a printed component.
      if (!/[A-Z]/.test(target)) continue;
      out.push({ verb: m[1].toLowerCase(), target: target, span: m[0].trim().replace(/\s+/g, ' ') });
    }
  }
  scan(WRITE_TARGET_DIRECT_RE);
  scan(WRITE_TARGET_ADD_RE);
  return out;
}

function writeTargetResolves(index, target) {
  var primary = toSlugWords(target);
  if (!primary) return true;
  var toks = primary.split(' ').filter(Boolean);
  var tries = [primary];
  if (toks.length > 1 && WRITE_TARGET_NAME_SUFFIXES[toks[toks.length - 1]]) {
    tries.push(toks.slice(0, -1).join(' '));
  }
  if (toks.length > 1 && WRITE_TARGET_NAME_PREFIXES[toks[0]]) {
    tries.push(toks.slice(1).join(' '));
  }
  var kinds = index.kinds || {};
  var kindNames = Object.keys(kinds);
  var t, k, name;
  for (t = 0; t < tries.length; t++) {
    for (k = 0; k < kindNames.length; k++) {
      if (kinds[kindNames[k]][tries[t]]) return true;
    }
  }
  // The loose tier, deliberately last: an indexed name inside the capture, or
  // the capture inside an indexed name ("VALE Stress Track" ⊃ "vale stress").
  for (t = 0; t < tries.length; t++) {
    var padded = ' ' + tries[t] + ' ';
    for (k = 0; k < kindNames.length; k++) {
      var bucket = kinds[kindNames[k]];
      for (name in bucket) {
        if (!Object.prototype.hasOwnProperty.call(bucket, name)) continue;
        if (!name || name.length < 3) continue;
        if (padded.indexOf(' ' + name + ' ') !== -1) return true;
        if ((' ' + name + ' ').indexOf(padded) !== -1) return true;
      }
    }
  }
  // Every token is page furniture — "the margin", "your grid". Not a finding:
  // no schema field holds the name of the paper.
  var allFurniture = toks.length > 0;
  for (var i = 0; i < toks.length; i++) {
    if (!WRITE_TARGET_FURNITURE[toks[i]]) { allFurniture = false; break; }
  }
  return allFurniture;
}

export function collectOracleWriteTargetFindings(booklet) {
  var findings = [];
  var doc = booklet || {};
  if (!Array.isArray(doc.weeks) || !doc.weeks.length) return findings;
  var index;
  try { index = buildSurfaceIndex(doc); } catch (e) { return findings; }
  if (!index || !index.kinds) return findings;

  var seen = {};
  doc.weeks.forEach(function (week, wi) {
    if (!week) return;
    var wk = Number(week.weekNumber);
    if (!Number.isFinite(wk) || wk < 1) wk = wi + 1;
    var oracle = ((week.fieldOps || {}).oracleTable) || null;
    if (!oracle || !Array.isArray(oracle.entries)) return;
    oracle.entries.forEach(function (entry) {
      if (!entry || typeof entry !== 'object') return;
      extractWriteTargets(entry.paperAction).forEach(function (hit) {
        if (writeTargetResolves(index, hit.target)) return;
        // One finding per (week, surface name): a book that repeats the same
        // unreachable target across ten rolls has ONE defect, and ten copies
        // of one sentence is how a report-class channel gets ignored.
        var key = wk + '\x00' + toSlugWords(hit.target);
        if (seen[key]) return;
        seen[key] = true;
        findings.push({
          week: wk,
          target: hit.target,
          message: 'Week ' + wk + ' oracle → a paper action says "' + hit.span + '", and nothing '
            + 'this book prints is called "' + hit.target + '" — no clock, component, map node, '
            + 'cipher, fragment, door or ending of that name exists anywhere in the artifact. The '
            + 'player rolls, reads an instruction to mark something, and has no surface to mark. '
            + 'Either print the surface under exactly this name, or write the action against a '
            + 'surface the book already carries. Reported, not refused: this reads a name out of '
            + 'an instruction sentence, and an instruction may legitimately name the margin, a '
            + 'journal or the workout log — surfaces no schema field holds.'
        });
      });
    });
  });
  return findings;
}

/**
 * orientationFloorErrors(rulesSpread, where) -> string[]
 *
 * ── THE ESTABLISHMENT FLOOR (W3, 2026-08-18) ────────────────────────────────
 *
 * The first delivered book taught its procedure against a fiction the reader
 * was never given: documents performed at a stranger who did not know where he
 * was, who anyone was, or what had already happened. Every gate was green,
 * because no gate asked whether the book had said.
 *
 * W1 built the surface — `rulesSpread.orientation` in the artifact schema, in
 * both prose prompt surfaces, and in the renderer — and deliberately withheld
 * the floor. This is that floor, and the wire slot that makes it answerable
 * (STRUCTURED_SCHEMA_SHELL gained `orientation` in the same change; without it
 * the structured transports had no field to answer in, and a floor demanding a
 * value the transport cannot carry blocks the pipeline forever).
 *
 * THE SHELL SEAT ONLY, and the asymmetry is the routing rather than a
 * preference — the design-language floor's reasoning below, unchanged.
 * INST_RULES_TEACH is routed to the `shell` stage alone (STAGE_SCHEMA_MAP), and
 * S+F's own rules seat (`generateFleshRulesPrompt`) carries no rules-teaching
 * doctrine at all: it does not name the field, the bands, or the cast shape. A
 * floor there would block that pipeline on a surface its prompt never mentions,
 * and the retry would re-fail identically.
 *
 * PRESENCE IS THE FIRST DEMAND AND THE BANDS ARE THE SECOND. A `situation`
 * under the floor is a logline, which is the thing this field exists to
 * replace; a cast under three rows is a protagonist, not a cast. The bands live
 * in ORIENTATION_LIMITS and are quoted to the model in the same numbers
 * (orientationBandParity in validate.mjs holds the pair together).
 */
export function orientationFloorErrors(rulesSpread, where) {
  var errors = [];
  if (!rulesSpread || typeof rulesSpread !== 'object') return errors;
  var prefix = (where || 'Stage') + ' → rulesSpread.orientation';
  var orientation = rulesSpread.orientation;
  if (!orientation || typeof orientation !== 'object') {
    errors.push(prefix + ' is absent. Before the procedure, the book has to say what is '
      + 'happening and who is in it, in plain words: `situation` ('
      + ORIENTATION_LIMITS.situationMinChars + '-' + ORIENTATION_LIMITS.situationMaxChars
      + ' characters, present tense, outside the fiction\'s voice) and `cast` ('
      + ORIENTATION_LIMITS.castMin + '-' + ORIENTATION_LIMITS.castMax
      + ' entries of { name, role }). A reader who has not been told where he is cannot '
      + 'follow a single document that follows, and every rule on this page is taught '
      + 'against a fiction he was never given.');
    return errors;
  }
  var situation = String(orientation.situation || '').trim();
  if (!situation) {
    errors.push(prefix + '.situation is empty — say what is happening here, in plain words, '
      + 'in the present tense: where we are, what has gone wrong or is at stake, and what the '
      + 'reader is doing about it over the coming weeks. Withhold the ANSWERS, never the SETUP.');
  } else if (situation.length < ORIENTATION_LIMITS.situationMinChars
      || situation.length > ORIENTATION_LIMITS.situationMaxChars) {
    errors.push(prefix + '.situation is ' + situation.length + ' characters; it must be '
      + ORIENTATION_LIMITS.situationMinChars + '-' + ORIENTATION_LIMITS.situationMaxChars
      + '. Shorter than that is a logline — the thing this field exists to replace. Longer '
      + 'and it has stopped being the establishing paragraph and become the first chapter, '
      + 'which is not what a reader standing at the front of the book can use.');
  }
  var cast = Array.isArray(orientation.cast) ? orientation.cast : null;
  if (!cast) {
    errors.push(prefix + '.cast is absent or not an array — name the people, offices or bodies '
      + 'this book is about, ' + ORIENTATION_LIMITS.castMin + '-' + ORIENTATION_LIMITS.castMax
      + ' of them. Every in-world author of a document belongs here.');
    return errors;
  }
  if (cast.length < ORIENTATION_LIMITS.castMin || cast.length > ORIENTATION_LIMITS.castMax) {
    errors.push(prefix + '.cast has ' + cast.length + ' entries; it must have '
      + ORIENTATION_LIMITS.castMin + '-' + ORIENTATION_LIMITS.castMax
      + '. Fewer than ' + ORIENTATION_LIMITS.castMin + ' is a protagonist, not a cast, and the '
      + 'documents will be signed by names the reader never met. More than '
      + ORIENTATION_LIMITS.castMax + ' and the page stops being scannable at the one moment it '
      + 'has to be — the moment a reader is looking someone up.');
  }
  var malformed = [];
  cast.forEach(function (member, i) {
    if (!member || typeof member !== 'object') { malformed.push('[' + i + '] is not an object'); return; }
    if (!String(member.name || '').trim()) malformed.push('[' + i + '] has no name');
    if (!String(member.role || '').trim()) malformed.push('[' + i + '] has no role');
  });
  if (malformed.length) {
    errors.push(prefix + '.cast has entries a reader cannot use: ' + malformed.slice(0, 4).join('; ')
      + '. Every row is { name (spelled exactly as the weeks and fragments spell it), role '
      + '(2-6 words, what they are) } — a row missing either is a line of the lookup table '
      + 'that answers nothing when it is looked up.');
  }
  return errors;
}

/**
 * collectAnswerBearingFragmentFindings(fragments, componentInputs)
 *   -> { errors: string[], warnings: string[] }
 *
 * ── THE ANSWER-BEARING SEAL (author ruling, 2026-08-18 — the doc-11 class) ──
 *
 * A fragment whose body reveals the convergence answers must carry a seal. Not
 * because the document is illegitimate — a confirmation slip or a supervisor's
 * duplicate is often the best document in the book — but because a document
 * that prints every collected value ends the game the moment it is read, and
 * the player has no way to know that BEFORE reading it. The seal is the honour
 * system, not a lock: the pleasure is the flip and the deciding. A player who
 * is warned can choose; a player who is not has been robbed of a choice nobody
 * offered them.
 *
 * TWO ARMS, SPLIT BY CONFIDENCE (the D144 idiom — be conservative, and never
 * let a single-value coincidence block):
 *
 *   ERROR   every one of the book's componentInputs appears as a distinct
 *           number-token, AND they appear CLOSE TOGETHER. That is the collected
 *           record reproduced as a list, and there is no reading of it that is
 *           not disclosure.
 *   WARNING all of them appear, but scattered through the document. A world
 *           whose values are its own nouns — node numbers, berth numbers, ring
 *           ordinals — will name them all across a page of prose without ever
 *           handing over the chain, so this reports and never blocks.
 *
 * NUMBER-TOKENS, NOT SUBSTRINGS, and that distinction is the whole difference
 * between a gate and a nuisance: the token test matches "7" and not "17",
 * "1975" or "F.07". A substring scan over five small integers finds them in
 * every date, every case number and every page reference in the corpus.
 *
 * THE PROXIMITY WINDOW IS MEASURED, NOT CHOSEN, and it is what makes the exact
 * arm safe to block on. Swept over 22 corpus fixtures plus both delivered
 * books, exactly six fragments contain their book's whole collected record.
 * Their tightest windows, and what each one actually is:
 *
 *   sf-c10-strong-convergence F.08     14   "will always be 8, 5, 18, 15, 14."
 *   The-Air-Gapped-Choir F.6           15   "31 / 09 / 14 / 22", one line
 *   The-Air-Gapped-Choir F.8           33   TOP/RIGHT/BOTTOM/LEFT = all four
 *   the delivered book's F.11          59   ← THE DOCUMENT THIS RULING NAMES
 *   ── the gap ──────────────────────────────────────────────────────────────
 *   sf-haiku45-c5-trial-1 F.05        122   an intake-statistics memo whose
 *                                           ordinary counts happen to be the
 *                                           book's five small integers
 *   The-Air-Gapped-Choir F.2          189   four nodes named across a page of
 *                                           narrative — the world's own
 *                                           vocabulary, not a disclosure
 *
 * Every genuine hand-over is a LIST, and a list of five values is about one
 * printed line; every coincidence is prose, and prose spreads. 90 is one line
 * of type, and it sits near the middle of a 59-to-122 gap rather than hard
 * against either edge — 31 characters of margin below, 32 above.
 *
 * BOTH SIDES OF THAT SWEEP WERE EARNED BY A FAILING HARNESS ROW, not assumed.
 * The token rule originally excluded any following `.`, to keep `F.14` from
 * matching `14` — which also excluded a value that merely ENDS A SENTENCE, so a
 * document could list the whole record and go unseen for using full stops. The
 * blocking row in check-generation-floors.mjs caught it; the rule now excludes
 * only a DOTTED IDENTIFIER (`.` followed by more word characters), and the
 * corrected sweep is the table above.
 *
 * THE PASSWORD-AS-A-WORD ARM WAS DROPPED, and it is worth writing down because
 * the ruling proposed it: "or the full derived password string". Measured, it
 * is a false-positive factory — a good password is a word FROM the world, so
 * the demo booklet (password "HERON") flagged five fragments for mentioning the
 * bird that gives the book its name. A password the fiction never says is a
 * worse password; a gate that punishes the better one is the wrong gate.
 *
 * SILENT WITHOUT ITS EVIDENCE (D144's ungated-caller idiom). A gate handed no
 * componentInputs cannot know what the answers are, and inventing them would be
 * the gate writing the design.
 *
 * A SEAL SATISFIES IT ENTIRELY. `seal` is required-both-fields by the artifact
 * schema, so its presence IS the declaration of the key hint and the release
 * condition; this floor asks only that it is there.
 */
var ANSWER_DISCLOSURE_WINDOW_CHARS = 90;

function collectAnswerBearingFragmentFindings(fragments, componentInputs) {
  var out = { errors: [], warnings: [] };
  var list = Array.isArray(fragments) ? fragments : [];
  if (!list.length) return out;
  var inputs = (Array.isArray(componentInputs) ? componentInputs : [])
    .map(function (v) { return String(v == null ? '' : v).trim(); })
    .filter(Boolean);
  if (inputs.length < 2) return out;                      // no evidence ⇒ silent

  // Every offset at which this value stands as its own token.
  //
  // THE TRAILING RULE IS NARROWER THAN A DOT BAN, and the harness row that
  // caught it is why: excluding any following `.` also excluded a value that
  // simply ENDS A SENTENCE ("...and 14."), so a document could list the whole
  // record and go unseen for using full stops. What must be excluded is a
  // DOTTED IDENTIFIER — `F.14`, `1.14` — where the dot is followed by more
  // word characters. Sentence punctuation is not part of the token.
  function tokenOffsets(body, value) {
    var token = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var re = new RegExp('(^|[^\\w.])' + token + '(?!\\w|\\.\\w)', 'g');
    var offsets = [];
    var m;
    while ((m = re.exec(body)) !== null) {
      offsets.push(m.index + m[1].length);
      re.lastIndex = m.index + 1;                         // allow adjacent matches
    }
    return offsets;
  }

  list.forEach(function (fragment) {
    if (!fragment || typeof fragment !== 'object') return;
    var body = String(fragment.content || fragment.body || fragment.contentHtml || '');
    if (!body) return;
    var id = String(fragment.id || '?');
    if (fragment.seal && typeof fragment.seal === 'object'
        && String(fragment.seal.unlockCondition || '').trim()) return;

    var found = [];
    for (var i = 0; i < inputs.length; i++) {
      var offsets = tokenOffsets(body, inputs[i]);
      if (!offsets.length) return;                        // not every value: not this floor's case
      found.push(offsets);
    }

    // The tightest span containing one occurrence of every value: anchor on
    // each occurrence of the first value and take the nearest of each other.
    var tightest = Infinity;
    found[0].forEach(function (anchor) {
      var lo = anchor;
      var hi = anchor;
      for (var k = 1; k < found.length; k++) {
        var best = found[k][0];
        var bestDistance = Math.abs(best - anchor);
        found[k].forEach(function (offset) {
          var distance = Math.abs(offset - anchor);
          if (distance < bestDistance) { bestDistance = distance; best = offset; }
        });
        lo = Math.min(lo, best);
        hi = Math.max(hi, best);
      }
      tightest = Math.min(tightest, hi - lo);
    });

    if (tightest <= ANSWER_DISCLOSURE_WINDOW_CHARS) {
      out.errors.push('Fragment ' + id + ' reproduces the collected record: all ' + inputs.length
        + ' of the values the player is meant to gather appear together, within ' + tightest
        + ' characters, and no seal is declared. A document that confirms the chain answers is '
        + 'sealed by honour: give it a `seal` with a `keyHint` (what the player will recognise '
        + 'when they may open it) and an `unlockCondition` naming an earlier printed surface. '
        + 'Unsealed, it ends the game the first time it is read, and the player had no way to '
        + 'know that before reading it.');
    } else {
      out.warnings.push('Fragment ' + id + ' names all ' + inputs.length + ' collected values, '
        + 'but spread over ' + tightest + ' characters rather than listed together, and declares '
        + 'no seal. Scattered like that it is far more likely to be the world using its own '
        + 'numbers than a document handing over the chain, so this reports rather than blocks. '
        + 'If it is meant to confirm the answers, seal it.');
    }
  });
  return out;
}

/**
 * collectAnswerBearingFragmentFloorErrors(fragments, componentInputs)
 *
 * The blocking projection of the findings above. Split for the same reason
 * collectSeedObedienceFindings is split from its two projections (W3): one body
 * of evidence, two severities, and the census counts the demands once.
 */
export function collectAnswerBearingFragmentFloorErrors(fragments, componentInputs) {
  return collectAnswerBearingFragmentFindings(fragments, componentInputs).errors;
}

/**
 * collectAnswerBearingFragmentWarnings(fragments, componentInputs)
 */
export function collectAnswerBearingFragmentWarnings(fragments, componentInputs) {
  return collectAnswerBearingFragmentFindings(fragments, componentInputs).warnings;
}

/**
 * assemblyDisclosureFloorErrors(rulesSpread, where) -> string[]
 *
 * ── THE ASSEMBLY-PAGE DISCLOSURE LAW (author ruling, 2026-08-18) ────────────
 *
 * The delivered book's `rulesSpread.rightPage.instruction` was a walkthrough:
 * every glyph's location AND method, disclosed on page four, duplicating the
 * point-of-use instructions the week pages already carry. The author's verdict:
 * "it gives too much information."
 *
 * THE DISTINCTION THE RULING DRAWS. A MANIFEST is licensed by VISION §2's
 * "posted manifests naming future finds" — a count, one per week, and what
 * happens when they are all filled. A WALKTHROUGH is not. The file posts WHAT
 * is to be found and WHEN; the week posts WHERE and HOW.
 *
 * WHY THE ARM IS AN ENUMERATION COUNT AND NOT A LENGTH BAND — measured before
 * it was written, and it corrects the shape the ruling proposed. There are no
 * per-box entries to band: the surface is ONE optional string. And length does
 * not separate the two shapes. Over 22 corpus fixtures plus both delivered
 * books, the offending walkthrough is 577 characters and the first book's
 * perfectly legal manifest is 569, while clean corpus fixtures run to 1408. A
 * band tight enough to catch 577 fails four clean fixtures; a band loose enough
 * to spare them catches nothing.
 *
 * What separates them cleanly is the ROLL CALL. A manifest states a count once;
 * a walkthrough addresses each box in turn and hangs a source on it. Distinct
 * box ordinals named: corpus 0, first book 1, the defect 5.
 *
 * CONSERVATIVE BY RULING (the D144 idiom): the threshold is three, because two
 * ordinals can be a legitimate boundary statement ("box 1 is filled in week
 * one; the last at the reckoning"). A single mention can never block.
 *
 * SHELL SEAT ONLY, for orientationFloorErrors' reason exactly: INST_RULES_TEACH
 * is routed to `shell` alone, so this is the only seat whose prompt names the
 * surface. Silent when there is no rightPage instruction — the field is
 * optional in the artifact contract and this floor is about what it SAYS, never
 * about whether it exists.
 */
export function assemblyDisclosureFloorErrors(rulesSpread, where) {
  var errors = [];
  if (!rulesSpread || typeof rulesSpread !== 'object') return errors;
  var rightPage = rulesSpread.rightPage;
  if (!rightPage || typeof rightPage !== 'object') return errors;
  var instruction = String(rightPage.instruction || '').trim();
  if (!instruction) return errors;
  var pointers = countAssemblyBoxPointers(instruction);
  if (pointers > ASSEMBLY_DISCLOSURE_MAX_BOX_POINTERS) {
    errors.push((where || 'Stage') + ' → rulesSpread.rightPage.instruction addresses '
      + pointers + ' boxes individually, and the tracker page may name at most '
      + ASSEMBLY_DISCLOSURE_MAX_BOX_POINTERS + ' that way. This page posts a MANIFEST — how '
      + 'many boxes there are, that one is filled per week, and what happens when they are '
      + 'all filled. Telling the player up front which surface each box comes from and what '
      + 'must be done to read it is a WALKTHROUGH: it spends the discovery of the whole block '
      + 'on the rules page, and it repeats instructions the week pages already give at the '
      + 'moment they are usable. State the count and the cadence here; the method belongs at '
      + 'point of use, on the week that owns it.');
  }
  return errors;
}

/**
 * briefTranscriptionFloorErrors(units, brief, where) -> string[]
 *
 * ── THE BRIEF IS INPUT, NEVER COPY (W1, 2026-08-18) ─────────────────────────
 *
 * The author read the first delivered book's prose as pretentious. Part of that
 * is invention; part of it is not invention at all — the brief's own phrasing
 * coming back as printed prose, so the book reads like a restatement of its own
 * commission. A brief is the thing the prose is built to SATISFY. Quoting it
 * back is the pitch wearing the artifact's clothes.
 *
 * SIX CONSECUTIVE WORDS, verbatim after case-folding and punctuation-flattening.
 * Six is chosen against collision rather than against taste: five-word runs
 * ("at the end of the") occur by chance in ordinary English; six of the brief's
 * OWN words in order do not.
 *
 * NO BRIEF ⇒ SILENT (the D144 ungated-caller idiom, and the honest condition
 * here): a stage gate that was handed no brief cannot know what was copied, and
 * a floor that invented its own evidence would be worse than absent.
 */
function wordTokens(text) {
  var normalized = teachingNormalize(text);
  return normalized ? normalized.split(' ') : [];
}

export var BRIEF_TRANSCRIPTION_RUN = 6;

export function briefTranscriptionFloorErrors(units, brief, where) {
  var errors = [];
  var briefWords = wordTokens(brief);
  if (briefWords.length < BRIEF_TRANSCRIPTION_RUN) return errors;
  var runs = {};
  for (var i = 0; i + BRIEF_TRANSCRIPTION_RUN <= briefWords.length; i++) {
    runs[briefWords.slice(i, i + BRIEF_TRANSCRIPTION_RUN).join(' ')] = true;
  }
  (Array.isArray(units) ? units : []).forEach(function (unit) {
    if (!unit || errors.length >= 3) return;
    var words = wordTokens(unit.text);
    for (var j = 0; j + BRIEF_TRANSCRIPTION_RUN <= words.length; j++) {
      var run = words.slice(j, j + BRIEF_TRANSCRIPTION_RUN).join(' ');
      if (!runs[run]) continue;
      errors.push((where || 'Stage') + ' → ' + String(unit.label || 'prose')
        + ' copies a run of ' + BRIEF_TRANSCRIPTION_RUN + ' words straight out of the brief: "'
        + run + '". The brief is input, never copy — it is the commission this book answers, '
        + 'not material to quote back at the reader. Say the thing this world would say '
        + 'instead, in its own words and out of its own particulars.');
      return;
    }
  });
  return errors;
}

/**
 * Shell structural validation. Runs after shell stage (Stage 3).
 * Returns { valid: boolean, errors: string[] }
 */
export function validateShellSchema(shell, expectedOptions) {
  var errors = [];
  var warnings = [];
  // THE VERDICT CARRIES ITS OWN REMEDIES (the week gate's shape, D167). A floor
  // that can name one field and one coordinate publishes them here so the stage
  // can rewrite that field instead of re-rolling the whole shell.
  var deltaTargets = [];
  if (!shell) { return { valid: false, errors: ['Shell is null'], deltaTargets: [] }; }
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
  // ── Floor: the component dialect (F2) ─────────────────────────────────────
  // A bounded choice, not content — the recorded-reading precedent says a
  // required enum field arrives and an optional one does not. Book 1 declared
  // none, so every countable surface in it drew in the default instrument.
  // Opt-in like every other floor: the guided-build wizard and the manual API
  // hand-assemble shells and owe nothing here (see floorsOn).
  if (floorsOn(expectedOptions)) {
    var shellDialect = String(((shell.meta || {}).artifactIdentity || {}).componentDialect || '').trim();
    if (!shellDialect) {
      errors.push('meta.artifactIdentity.componentDialect is unset — declare the instrument this book counts in: '
        + VALID_COMPONENT_DIALECTS.join(' | '));
    } else if (VALID_COMPONENT_DIALECTS.indexOf(shellDialect) === -1) {
      errors.push('meta.artifactIdentity.componentDialect "' + shellDialect + '" is not a dialect this engine draws: '
        + VALID_COMPONENT_DIALECTS.join(' | '));
    }

    // ── The currency floor (D144) ──
    // `meta.economy` is the one surface a whole downstream RULE is stated
    // against: INST_MARK_SURFACE demands the week's conversion sentence name
    // `currencyLabel` verbatim, and currencyMentionVerdict grades every week
    // against it. Both are unsatisfiable if no label was ever authored — and
    // when none is, deriveMarkStripEconomy synthesizes "Marks" AFTER assembly,
    // which is far too late to help the week stage and looks, in the finished
    // book, exactly like a choice.
    //
    // So the label is declared HERE, at the stage that authors meta, or the
    // stage retries. `currencyId` is deliberately NOT floored: it is a machine
    // handle that assembly normalizes from the label anyway, and a floor on a
    // derivable field buys a retry for something the pipeline can fix itself.
    var economy = (shell.meta || {}).economy;
    var currencyLabel = String((economy && economy.currencyLabel) || '').trim();
    if (!currencyLabel) {
      errors.push('meta.economy.currencyLabel is unset — name the ONE thing this world\'s '
        + 'workout pays out, in its own words. Every session markStrip earns it, every week '
        + 'reckoning spends it, and every reckoning sentence must print this exact phrase; '
        + 'with no label authored the pipeline invents one after the fact and grades every '
        + 'week against a name nobody chose.');
    }

    // ── THE CURRENCY HAS TWO HOMES AND THEY MUST BE ONE (2026-08-17) ───────
    // `gameRulebook.economy.currency` is what the DESIGNER named the currency,
    // floored at the rulebook stage. `meta.economy.currencyLabel` is what the
    // BOOK prints, floored ten lines up, and it is the string every week's
    // reckoning sentence must reproduce verbatim (INST_MARK_SURFACE ⇄
    // currencyMentionVerdict). Nothing had ever compared them.
    //
    // That is the Crown Job's exact defect class and it was still constructible
    // with every gate green: a rulebook teaching the player they earn "Favour",
    // a shell paying out "Marks", six weeks of conversion sentences printing
    // the shell's word, and a parity floor that only ever asked whether the
    // graph carried SOME currency the rulebook mentioned. The player reads the
    // rules, then never sees that word again.
    //
    // BYTE EQUALITY AFTER TRIM, and deliberately no fuzzy match: a currency is
    // a proper noun the book prints in two places, and "close enough" is how a
    // book ends up with two names for one thing.
    //
    // ANTI-VACUITY / SCOPE: fires only when BOTH exist. A caller with no
    // rulebook (the wizard, a hand-built replay) gets no check rather than a
    // fabricated one, and a missing currencyLabel is already the floor above —
    // stacking a second error on it would spend a retry saying one thing twice.
    var rulebookCurrency = String(
      ((((expectedOptions || {}).gameRulebook) || {}).economy || {}).currency || ''
    ).trim();
    if (currencyLabel && rulebookCurrency && currencyLabel !== rulebookCurrency) {
      var currencyMismatch = 'meta.economy.currencyLabel is "' + currencyLabel
        + '" but the rulebook you were given names the currency "' + rulebookCurrency
        + '" — the rulebook\'s currency IS this book\'s currency, and the shell must carry it'
        + ' VERBATIM. The player is taught one word in the rules and then reads a different'
        + ' word on every reckoning line for the rest of the book. Set'
        + ' meta.economy.currencyLabel to "' + rulebookCurrency + '" exactly, or say why the'
        + ' rules were wrong — the rules do not change here.';
      errors.push(currencyMismatch);
      // DELTA-CLASS (D167): one named field, one coordinate, one requirement
      // satisfiable in isolation. Re-rolling an entire shell over a proper noun
      // is the exact waste the delta path exists to stop.
      deltaTargets.push({
        message: currencyMismatch,
        pathParts: ['meta', 'economy', 'currencyLabel'],
        path: formatFieldPath(['meta', 'economy', 'currencyLabel']),
        requirement: 'meta.economy.currencyLabel must be exactly "' + rulebookCurrency
          + '" — the currency the rulebook named, character for character.'
      });
    }

    // ── The artifact-intent floor (W3 corrective wave, F07) ──
    // Same argument as the spine below: the standard pipeline runs the compiler
    // HERE, so the planning bundle is declared here or nowhere on this path.
    // The brief rides expectedOptions for the D144 unearned-packet arm; every
    // other arm of this helper reads meta alone, and a caller that passes no
    // brief simply does not run that arm (see the helper's header).
    errors = errors.concat(artifactIntentFloorErrors(shell.meta, 'Shell',
      (expectedOptions || {}).brief, (expectedOptions || {}).seedAssignments));

    // ── The obedience floor (VISION §11) ──
    // The whole shell unit, not `shell.meta`: `theme.visualArchetype` is an
    // identity axis and lives beside meta, not inside it. Silent without seed
    // context, which is the same condition under which the stage was shown no
    // GIVENS at all.
    errors = errors.concat(seedObedienceFloorErrors(shell, 'Shell', 'shell',
      (expectedOptions || {}).seedAssignments));

    // ── The obedience floor's REPORT half (the voice die, W3) ──
    // Same arms, same evidence, WARNING class. The five voice-skeleton axes are
    // marked `reportOnly` on IDENTITY_AXES: they are drawn, shown to this seat
    // (INST_VOICE_SKELETON is routed to `shell`) and CHECKED here, and a book
    // that ignores the die is reported rather than refused — because the bands
    // that would settle a voice obedience question are still to be calibrated
    // from the corpus, and blocking on an uncalibrated band fails books for a
    // shape nobody has measured. Promotion to blocking is an author ruling on
    // measured evidence, not a flag flip.
    warnings = warnings.concat(seedObedienceFloorWarnings(shell, 'Shell', 'shell',
      (expectedOptions || {}).seedAssignments));

    // ── The rules page teaches THIS game's vocabulary (W1) ──
    // Same options rail the currency-parity floor above reads, and the same
    // anti-vacuity law: no rulebook in the options, no check. The shell seat is
    // SHOWN this rulebook (generateShellPrompt's rulebookGiven), so the demand
    // is answerable at the seat it is asked of.
    errors = errors.concat(rulesTeachingFloorErrors(shell.rulesSpread,
      (expectedOptions || {}).gameRulebook, 'Shell'));

    // ── The book says where you are before it says what to do (W3) ──
    // No options rail and no silence condition: unlike the rulebook floors
    // above, this one reads only the unit the gate was handed. The demand is
    // unconditional because the answer is — every book has a situation and a
    // cast, and a book that declines to say so has declined to be legible, not
    // declined a feature. Shell seat only; see the floor's own header.
    errors = errors.concat(orientationFloorErrors(shell.rulesSpread, 'Shell'));

    // ── The file posts WHAT and WHEN; the week posts WHERE and HOW ──
    // Same seat, same unit, same silence rule as the orientation floor above.
    // Silent when the tracker page carries no instruction at all: the field is
    // optional in the artifact contract, and this floor is about what it SAYS.
    errors = errors.concat(assemblyDisclosureFloorErrors(shell.rulesSpread, 'Shell'));

    // ── The design-language floor (W6's close) ──
    // Here and ONLY here, and the asymmetry with every floor beside it is a
    // finding rather than an omission. SCHEMA_DESIGN_LANGUAGE and
    // INST_DESIGN_LANGUAGE are routed to the 'shell' stage alone
    // (STAGE_SCHEMA_MAP in prompt_rules.js; designLanguageMenuParity in
    // validate.mjs asserts that routing), and generateSkeletonPrompt — the S+F
    // pipeline's compiler seat, which carries INST_ARTIFACT_COMPILER and is
    // therefore where the artifact-intent floor's other half lives — carries no
    // design-language doctrine at all. It does not name the field, the axes, or
    // the menus.
    //
    // So a floor at the skeleton gate would block that pipeline on a surface its
    // own prompt never mentions, and the retry would re-fail identically: the
    // model cannot deliver what it was never asked for, and the Correction
    // Directive would be the only place it ever heard the field's name. That is
    // the derived-or-strict failure cipherVarietyFloor() records above, and it
    // is worse than the gap it would close — a blocked pipeline rather than an
    // unenforced demand.
    //
    // The S+F half therefore waits on the routing, which is prompt content and
    // a ceiling decision, not a validator one. Until then the S+F pipeline
    // authors no design language and its books render as their archetype, which
    // is exactly what the pre-W6 behaviour was.
    errors = errors.concat(designLanguageFloorErrors(shell.meta, 'Shell'));

    // ── The arrangement floor (ARRANGEMENT.md phase A) ──
    // BOTH seats, and the contrast with the paragraph above is the whole
    // reason that paragraph is so long: the design language is floored here
    // alone because it is TAUGHT here alone. The arrangement grammar is routed
    // to the shell stage (STAGE_SCHEMA_MAP) and hand-routed into
    // generateSkeletonPrompt, so the S+F compiler seat runs the same floor on
    // the same surface, and neither pipeline is blocked on something its own
    // prompt never named.
    errors = errors.concat(arrangementFloorErrors(shell.meta, 'Shell'));

    // ── The closure floors (W4a) ──
    // The standard pipeline runs the compiler HERE, so the spine is declared
    // here or nowhere on this path. The shell carries no week material, only
    // the count — buildSurfaceIndex synthesizes the week list from it so the
    // week-shaped refs in the spine have something to resolve against.
    errors = errors.concat(collectSpineSkeletonFloorErrors(
      (shell.meta || {}).playSpine,
      { weekCount: Number((expectedOptions || {}).weekCount) || 0 },
      'Shell',
      // The SAME array the pre-flight floor below is handed — derivePlannedWeekShapes'
      // output (D166's one deload derivation). It funds the deload exhale exemption
      // on the tension floor; a caller with no plan gets no exemption.
      (expectedOptions || {}).plannedWeeks
    ));

    // ── The rulebook⇄spine parity floor (D173) ──
    // The spine is the rulebook's PROJECTION (PLAY.md §3.2), so the check runs
    // at the seat that authors the spine and is handed the rulebook the seat's
    // PROMPT was handed — one document, one stage, shown and checked. The
    // errors carry THIS seat's label rather than the rulebook's, and that is the
    // rules-first ruling made operational: when the graph and the rules
    // disagree, the graph is what changes.
    errors = errors.concat(collectRulebookSpineParityErrors(
      (expectedOptions || {}).gameRulebook,
      (shell.meta || {}).playSpine,
      'Shell'
    ));

    // ── The earliest-stage pre-flight (D143) ──
    // The spine is authored HERE, and so is the family it must be wired for.
    // The week shapes come from the campaign plan (which ran before this stage)
    // through expectedOptions, the same way the spine itself rides into the
    // week floors — a gate never invents the plan it is checking against, so a
    // caller that omits `plannedWeeks` gets no pre-flight.
    errors = errors.concat(collectSpinePreflightFloorErrors(
      (shell.meta || {}).playSpine,
      {
        weeks: (expectedOptions || {}).plannedWeeks,
        fragmentRegistry: (expectedOptions || {}).fragmentRegistry,
        // Read off the shell UNDER TEST, not the caller: artifactIntent is
        // floored above, so by the time this runs the family is present or the
        // stage has already failed for its absence.
        mechanicGrammarFamily: ((shell.meta || {}).artifactIntent || {}).mechanicGrammarFamily
      },
      'Shell'
    ));
  }

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
  return {
    valid: errors.length === 0,
    errors: errors,
    warnings: warnings,
    deltaTargets: deltaTargets
  };
}

// Validates the assembled booklet. Returns array of human-readable errors.
// Fragment ID matching is soft: "F.01" matches "F-01", "f_01", etc.

// ── Output budgets (GAP-1, DOCTRINE-LEDGER) ─────────────────────────────────
// The prompt demands these caps (INST_OUTPUT_BUDGETS); this measures them
// post-generation. The NUMBERS now live in contracts/contract-constants.mjs
// (OUTPUT_BUDGETS, imported above) — they were hoisted in the Teeth Round when
// breaches became BLOCKING at the week/fragment/ending stages, because a cap
// the prompt states differently from the cap the retry enforces spends a whole
// attempt on an instruction the model already obeyed.
//
// The SEVERITY split stays here and stays D19: a breach costs a retry at the
// stage (the model can simply write less), and warns on the assembled booklet
// (delivery is never blocked — an overlong prompt is degraded quality, not an
// invalid booklet). The critic loop feeds these in as machine findings.
//
// Wave 4a's point-of-use surfaces are budgeted HARDER than prose is. Every one
// of them prints beside a blank in a ninety-second rest window, where the
// reader's capacity is degraded, brief, and single-threaded (point-of-use
// §5.2). A cue that needs three lines has stopped being a cue and become the
// rule again, which is the split the tiers exist to make.

// ── THE COORDINATE HALF (D167) ──────────────────────────────────────────────
// Every breach below is a SINGLE named string that is a few characters too
// long. The message says so in words; `path` says so in coordinates, and the
// two are produced HERE, together, by the code that already walked to the
// field. Delta repair (api-generator.js) reads the coordinates to ask the model
// for exactly those fields and to merge exactly those fields back — and it
// never parses the message, because a parser would be a second algorithm for a
// fact the producer already knows (D93's law at a new surface).
//
// `path` is an array of keys, relative to the booklet-shaped object handed in.
// `formatFieldPath` is the ONE rendering of it — the string the model is shown
// and the string the model must echo back. Arrays travel between the producer
// and the merge; the string exists only for the wire, so nothing anywhere has
// to parse a path back into keys.
export function formatFieldPath(parts) {
  var out = '';
  (parts || []).forEach(function (part) {
    if (typeof part === 'number') out += '[' + part + ']';
    else out += (out ? '.' : '') + String(part);
  });
  return out;
}

export function collectBudgetBreaches(booklet) {
  var breaches = [];
  function over(text, cap) {
    var len = String(text || '').length;
    return len > cap ? len : 0;
  }
  // One push site, so a breach can never exist without its coordinates.
  function add(unitType, unitRef, pathParts, cap, len, message) {
    breaches.push({
      unitType: unitType,
      unitRef: unitRef,
      path: pathParts,
      cap: cap,
      length: len,
      message: message
    });
  }
  ((booklet && booklet.weeks) || []).forEach(function (week, wi) {
    ((week && week.sessions) || []).forEach(function (session, si) {
      var len = over(session && session.storyPrompt, OUTPUT_BUDGETS.storyPrompt);
      if (len) add('week', week.weekNumber || (wi + 1),
        ['weeks', wi, 'sessions', si, 'storyPrompt'], OUTPUT_BUDGETS.storyPrompt, len,
        'Week ' + (week.weekNumber || (wi + 1)) + ' session ' + (si + 1)
          + ' storyPrompt is ' + len + ' chars (budget ' + OUTPUT_BUDGETS.storyPrompt + ')');
    });
    var interlude = week && week.interlude;
    var ilen = over(interlude && interlude.body, OUTPUT_BUDGETS.interludeBody);
    if (ilen) add('week', week.weekNumber || (wi + 1),
      ['weeks', wi, 'interlude', 'body'], OUTPUT_BUDGETS.interludeBody, ilen,
      'Week ' + (week.weekNumber || (wi + 1)) + ' interlude body is ' + ilen
        + ' chars (budget ' + OUTPUT_BUDGETS.interludeBody + ')');

    // ── Wave 4a point-of-use surfaces ────────────────────────────────────────
    var wn = week.weekNumber || (wi + 1);
    function weekBreach(pathParts, cap, len, msg) {
      add('week', wn, pathParts, cap, len, msg);
    }
    ((week && week.sessions) || []).forEach(function (session, si) {
      var where = 'Week ' + wn + ' session ' + (si + 1);
      ((session && session.microLines) || []).forEach(function (line, mi) {
        var c = over(line && line.condition, OUTPUT_BUDGETS.microLineCondition);
        if (c) weekBreach(['weeks', wi, 'sessions', si, 'microLines', mi, 'condition'],
          OUTPUT_BUDGETS.microLineCondition, c,
          where + ' microLine ' + (mi + 1) + ' condition is ' + c
          + ' chars (budget ' + OUTPUT_BUDGETS.microLineCondition + ')');
        var q = over(line && line.cue, OUTPUT_BUDGETS.microLineCue);
        if (q) weekBreach(['weeks', wi, 'sessions', si, 'microLines', mi, 'cue'],
          OUTPUT_BUDGETS.microLineCue, q,
          where + ' microLine ' + (mi + 1) + ' cue is ' + q
          + ' chars (budget ' + OUTPUT_BUDGETS.microLineCue + ')');
        var a = over(line && line.citeRef && line.citeRef.citedAs, OUTPUT_BUDGETS.citedAs);
        if (a) weekBreach(['weeks', wi, 'sessions', si, 'microLines', mi, 'citeRef', 'citedAs'],
          OUTPUT_BUDGETS.citedAs, a,
          where + ' microLine ' + (mi + 1) + ' citeRef.citedAs is ' + a
          + ' chars (budget ' + OUTPUT_BUDGETS.citedAs + ')');
      });
      var rb = session && session.returnBeat;
      var rc = over(rb && rb.closingLine, OUTPUT_BUDGETS.returnBeatClosing);
      if (rc) weekBreach(['weeks', wi, 'sessions', si, 'returnBeat', 'closingLine'],
        OUTPUT_BUDGETS.returnBeatClosing, rc,
        where + ' returnBeat.closingLine is ' + rc
        + ' chars (budget ' + OUTPUT_BUDGETS.returnBeatClosing + ')');
      var ro = over(rb && rb.openingEcho, OUTPUT_BUDGETS.returnBeatOpening);
      if (ro) weekBreach(['weeks', wi, 'sessions', si, 'returnBeat', 'openingEcho'],
        OUTPUT_BUDGETS.returnBeatOpening, ro,
        where + ' returnBeat.openingEcho is ' + ro
        + ' chars (budget ' + OUTPUT_BUDGETS.returnBeatOpening + ')');
    });
    var door = week && week.doorChoice;
    ['optionA', 'optionB'].forEach(function (side) {
      var lean = over(door && door[side] && door[side].lean, OUTPUT_BUDGETS.doorOptionLean);
      if (lean) weekBreach(['weeks', wi, 'doorChoice', side, 'lean'],
        OUTPUT_BUDGETS.doorOptionLean, lean,
        'Week ' + wn + ' doorChoice.' + side + '.lean is ' + lean
        + ' chars (budget ' + OUTPUT_BUDGETS.doorOptionLean + ')');
    });

    // ── The mark strip's labels (D89's word law, measured) ───────────────────
    // The strip prints on ONE line at every density tier, so a long label does
    // not wrap — it truncates, and the player is left ticking a box whose
    // demand ran off the edge of the card.
    ((week && week.sessions) || []).forEach(function (session, si) {
      var targets = ((session && session.markStrip) || {}).targets;
      (Array.isArray(targets) ? targets : []).forEach(function (target, ti) {
        var l = over(target && target.label, OUTPUT_BUDGETS.markStripLabel);
        if (l) weekBreach(['weeks', wi, 'sessions', si, 'markStrip', 'targets', ti, 'label'],
          OUTPUT_BUDGETS.markStripLabel, l,
          'Week ' + wn + ' session ' + (si + 1) + ' markStrip target ' + (ti + 1)
          + ' label is ' + l + ' chars (budget ' + OUTPUT_BUDGETS.markStripLabel + ')');
      });
    });
  });
  ((booklet && booklet.fragments) || []).forEach(function (frag, fi) {
    // The body reads from `content` when it exists and `body` otherwise, so the
    // coordinate must name the key the value actually came from — a path to the
    // OTHER key would create a field rather than shorten one.
    var bodyKey = (frag && frag.content) ? 'content' : 'body';
    var len = over(frag && (frag.content || frag.body), OUTPUT_BUDGETS.fragmentBody);
    if (len) add('fragment', frag.id, ['fragments', fi, bodyKey], OUTPUT_BUDGETS.fragmentBody, len,
      'Fragment ' + (frag.id || '?') + ' body is ' + len
        + ' chars (budget ' + OUTPUT_BUDGETS.fragmentBody + ')');
    var cited = over(frag && frag.citeRef && frag.citeRef.citedAs, OUTPUT_BUDGETS.citedAs);
    if (cited) add('fragment', frag.id, ['fragments', fi, 'citeRef', 'citedAs'], OUTPUT_BUDGETS.citedAs, cited,
      'Fragment ' + (frag.id || '?') + ' citeRef.citedAs is ' + cited
        + ' chars (budget ' + OUTPUT_BUDGETS.citedAs + ')');
    var hint = over(frag && frag.seal && frag.seal.keyHint, OUTPUT_BUDGETS.sealKeyHint);
    if (hint) add('fragment', frag.id, ['fragments', fi, 'seal', 'keyHint'], OUTPUT_BUDGETS.sealKeyHint, hint,
      'Fragment ' + (frag.id || '?') + ' seal.keyHint is ' + hint
        + ' chars (budget ' + OUTPUT_BUDGETS.sealKeyHint + ')');
    var unlock = over(frag && frag.seal && frag.seal.unlockCondition, OUTPUT_BUDGETS.sealUnlockCondition);
    if (unlock) add('fragment', frag.id, ['fragments', fi, 'seal', 'unlockCondition'],
      OUTPUT_BUDGETS.sealUnlockCondition, unlock,
      'Fragment ' + (frag.id || '?') + ' seal.unlockCondition is ' + unlock
        + ' chars (budget ' + OUTPUT_BUDGETS.sealUnlockCondition + ')');
  });
  ((booklet && booklet.endings) || []).forEach(function (ending, ei) {
    var body = ending && ending.content && ending.content.body;
    var len = over(body, OUTPUT_BUDGETS.endingBody);
    if (len) add('ending', (ending && (ending.variant || ending.id)) || ei,
      ['endings', ei, 'content', 'body'], OUTPUT_BUDGETS.endingBody, len,
      'Ending "' + ((ending && ending.variant) || ei) + '" body is ' + len
        + ' chars (renderer splits awkwardly past ' + OUTPUT_BUDGETS.endingBody + ')');
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

// ════════════════════════════════════════════════════════════════════════════
// THE LUDIC SPINE — closure floors (PLAY.md §3, W4a)
// ════════════════════════════════════════════════════════════════════════════
// PLAY.md §2 names six failure modes and every one of them is a WIRING defect:
// a spend with no destination, a clock nothing reads, a fork whose branches
// differ only in flavour. D111's floors guarantee the instruments EXIST; these
// guarantee they are pointed at each other.
//
// WHERE THEY RUN, and why it is not one place. A floor has to run at the stage
// that holds its material, or it cannot be blocking:
//
//   SKELETON — the spine itself is authored here, beside artifactIntent, before
//     any content exists. Everything provable from the DECLARATION plus the
//     weekPlan runs here: arity, connectivity, dead sinks, key-before-lock
//     ordering, and ref resolution. This is also the cheap place to fail — one
//     skeleton retry instead of a whole book.
//   WEEK — doors and clocks are authored per week chunk, so "this door has a
//     ledger row" and "this clock is read by an edge" can only be checked as
//     each week lands. The spine rides in through expectedOptions, exactly the
//     way mechanicGrammarFamily already does.
//
// What is deliberately NOT here: the rendered-reality half. Whether the printed
// page honours the declaration is the W4b simulated player's question, and it
// answers it by walking the book rather than reading its plan. These floors
// hold the plan to itself; the sim holds the book to the plan.

/**
 * deriveWeekSurfaces(week, fallbackNumber) -> { weekNumber, kinds }
 *
 * WHAT ONE WEEK ACTUALLY PRINTS, by surface kind (§4.11). `kinds` maps a ref
 * kind to a set of slugged ids, the same slugging buildSurfaceIndex has always
 * used, so a name written one way in the graph and another way on the page still
 * matches exactly where it always did.
 *
 * THE VOCABULARY'S SOURCE, stated because the honest answer matters more than
 * the tidy one. This function IS the vocabulary — it was extracted verbatim from
 * buildSurfaceIndex's per-week loop, which is the floors' own long-standing
 * inventory, and buildSurfaceIndex now calls it rather than keeping a second
 * copy. So there is exactly one home and two readers (D93): the book-scope index
 * and the week-scope ledger.
 *
 * WHAT THAT DOES NOT BUY. This reads the BOOKLET JSON, not the adapter's
 * emissions, so it knows the surfaces the schema names and not, independently,
 * the surfaces the renderer draws. A surface family the adapter learns to emit
 * without a schema field to carry it would be invisible here — the DR-40 shape.
 * Deriving from the adapter was considered and is not feasible in this wave: the
 * adapter is a browser ES module in the renderer tree that consumes an assembled
 * booklet and returns layout atoms, so "which economy surfaces does week 3 have"
 * is not a question it answers without running a layout pass. The mitigation is
 * that both readers share this one list, so the ledger can never be more ignorant
 * than the floors already are.
 *
 * ONLY AUTHORED SURFACES, never PLANNED ones. `mapType: 'grid'` and
 * `cipherType: 'index-extraction'` are decisions about what week 3 will contain;
 * they are not the name of a region or a puzzle, and counting them would make a
 * kind look authored while holding none of the names a spine edge points at —
 * which turns a forward promise into a false miss. See surfaceRefResolves.
 */
export function deriveWeekSurfaces(week, fallbackNumber) {
  var out = { weekNumber: Number(fallbackNumber) || 1, kinds: {} };
  if (!week || typeof week !== 'object') return out;
  var n = Number(week.weekNumber);
  if (!Number.isFinite(n) || n < 1) n = Number(fallbackNumber) || 1;
  out.weekNumber = n;

  function note(kind, value) {
    var key = toSlugWords(value);
    if (!key) return;
    if (!out.kinds[kind]) out.kinds[kind] = {};
    out.kinds[kind][key] = true;
  }

  note('week', 'W' + n);
  note('reckoning', 'W' + n);
  note('markStrip', 'W' + n);
  var sessions = Array.isArray(week.sessions) ? week.sessions : [];
  for (var si = 0; si < Math.max(sessions.length, Number(week.sessionCount) || 0); si++) {
    note('session', 'W' + n + '.' + (si + 1));
    note('markStrip', 'W' + n + '.' + (si + 1));
  }
  var fo = week.fieldOps || {};
  if (fo.oracleTable || fo.oracle) note('oracle', 'W' + n);
  if (fo.cipher) note('cipher', 'W' + n);
  if (week.doorChoice) note('door', 'W' + n);
  (week.gameplayClocks || []).forEach(function (clock) {
    if (clock) note('clock', clock.clockName);
  });
  var mapState = fo.mapState || {};
  if (mapState.title) note('map', mapState.title);
  if (mapState.title || (mapState.nodes || []).length) note('map', 'W' + n);
  (mapState.nodes || []).forEach(function (node) { if (node) { note('map', node.label); note('map', node.id); } });
  (mapState.tiles || []).forEach(function (tile) { if (tile) note('map', tile.label); });
  function noteCompanions(pool) {
    (Array.isArray(pool) ? pool : []).forEach(function (c) {
      if (!c) return;
      note('companion', c.title); note('companion', c.label);
      note('companion', c.statName); note('companion', c.type);
    });
  }
  noteCompanions(fo.companionComponents);
  if (week.interlude && week.interlude.payload) noteCompanions(week.interlude.payload.companionComponents);
  if (week.overflowDocument && week.overflowDocument.id) note('fragment', week.overflowDocument.id);
  return out;
}

/**
 * deriveWeeklySurfaceLedger(booklet) -> [{ weekNumber, kinds }]
 *
 * THE WEEKLY SURFACE LEDGER (§4.11's derived half) — the economy graph's week
 * axis, measured rather than declared. One row per week, each row the output of
 * deriveWeekSurfaces above.
 *
 * TELEMETRY, NOT A GATE'S EVIDENCE, and the distinction is deliberate. The
 * blocking cadence arms live at the WEEK gate and read the single week they were
 * handed — they never consult this. This exists for the two book-scope readers
 * that genuinely need every week at once: the `once` cadence arm and DR-32's
 * oracle write-target arm, both report-class. It is also written to `_x` so a
 * delivered book carries the measurement a reader can check its own pages
 * against.
 *
 * A MEASUREMENT, NEVER MODEL-WRITABLE: nothing in any prompt or stage schema
 * offers this shape, and it is recomputed from the booklet every time it is
 * asked for rather than read back from debris.
 */
export function deriveWeeklySurfaceLedger(booklet) {
  var doc = booklet || {};
  var weeks = Array.isArray(doc.weeks) ? doc.weeks : [];
  return weeks.map(function (week, wi) { return deriveWeekSurfaces(week, wi + 1); });
}

/**
 * buildSurfaceIndex(booklet) -> { weeks, kinds, has(kind, id) }
 *
 * What a booklet (or a weekPlan-bearing skeleton) actually offers a spine edge
 * to point at, indexed by ref KIND. The sibling of buildSinkRefIndex above and
 * built for the same pragmatic reason: a spine ref may name a week, a clock, a
 * fragment, a map region or a singleton, and no one existing predicate spans
 * those.
 *
 * Deliberately TOLERANT of three shapes, because three stages need it: a
 * booklet (`weeks`), a skeleton (`weekPlan`), and a SHELL — which carries no
 * week material at all, only the count. Without that last fallback the spine
 * floors would run vacuously on the standard pipeline, where the compiler and
 * the spine are authored at the shell stage and every week-shaped ref would
 * read as "week 3 does not exist" against an empty index.
 */
export function buildSurfaceIndex(booklet) {
  var doc = booklet || {};
  var weekList = Array.isArray(doc.weeks) && doc.weeks.length
    ? doc.weeks
    : (Array.isArray(doc.weekPlan) ? doc.weekPlan : []);
  if (!weekList.length && Number.isInteger(doc.weekCount) && doc.weekCount > 0) {
    weekList = [];
    for (var wc = 1; wc <= doc.weekCount; wc++) weekList.push({ weekNumber: wc });
  }

  var index = {
    weeks: {},
    kinds: {},
    weekCount: weekList.length
  };
  function note(kind, value) {
    var key = toSlugWords(value);
    if (!key) return;
    if (!index.kinds[kind]) index.kinds[kind] = {};
    index.kinds[kind][key] = true;
  }

  weekList.forEach(function (week, wi) {
    if (!week) return;
    var n = Number(week.weekNumber);
    if (!Number.isFinite(n) || n < 1) n = wi + 1;
    index.weeks[n] = true;
    // ONE VOCABULARY, FOLDED INTO THE BOOK-SCOPE INDEX (§4.11). Everything this
    // loop used to note inline now comes from deriveWeekSurfaces above, so the
    // book-scope index and the week-scope ledger cannot form different opinions
    // about what a week prints — the D93 two-algorithms defect, pre-empted. The
    // authored-not-planned rule and its reasoning moved into that function.
    var derivedSurfaces = deriveWeekSurfaces(week, n);
    Object.keys(derivedSurfaces.kinds).forEach(function (kind) {
      Object.keys(derivedSurfaces.kinds[kind]).forEach(function (slug) {
        if (!index.kinds[kind]) index.kinds[kind] = {};
        index.kinds[kind][slug] = true;
      });
    });
  });

  var fragments = Array.isArray(doc.fragments) ? doc.fragments
    : (Array.isArray(doc.fragmentRegistry) ? doc.fragmentRegistry : []);
  fragments.forEach(function (fragment) {
    if (!fragment) return;
    note('fragment', fragment.id);
    note('fragment', fragment.title);
    // A seal rides ON a fragment, so `seal:F.07` names the document that will
    // carry it. Indexed for every fragment rather than only sealed ones: at
    // declaration time the seal does not exist yet, and the spine is where the
    // book says it intends to put one.
    note('seal', fragment.id);
  });

  (Array.isArray(doc.endings) ? doc.endings : []).forEach(function (ending, ei) {
    if (!ending) return;
    note('ending', ending.variant || ('E' + (ei + 1)));
    note('ending', 'E' + (ei + 1));
  });
  (Array.isArray(doc.endingVariants) ? doc.endingVariants : []).forEach(function (v, ei) {
    note('ending', v); note('ending', 'E' + (ei + 1));
  });

  return index;
}

// ── THE FIXED-FORM REF KINDS (the proving-run-4 defect, 2026-08-20) ────────
// Two classes of surface id, and the difference is knowable WITHOUT a book.
//
// A ref kind whose ids `deriveWeekSurfaces()` mints from the week and session
// NUMBERS can only ever hold a W-shaped id. Read that function: `markStrip` is
// noted as `'W' + n` and `'W' + n + '.' + (si + 1)` and by no other route, so
// `markStrip:Night` is not a name that happens to be missing from this book —
// it is a name no LiftRPG book can ever have. `week`, `reckoning`, `oracle`,
// `cipher` and `door` are the same: one note apiece, all of them `'W' + n`.
// The other kinds — `clock`, `map`, `companion`, `fragment`, `seal`, `ending` —
// take their ids from AUTHORED strings (clock names, region titles, fragment
// ids), so a narrative label there is exactly right and must not be refused.
//
// D178'S "GRAMMAR ONLY AT THIS SEAT" IS SCOPED BY THIS, NOT VIOLATED. That
// ruling's own rationale is quoted at its site below: "a ref cannot be resolved
// against an index that has nothing in it." True for the declared kinds — at
// the rulebook seat no clock has been written, so `clock:Relief Ledger` is a
// forward promise and blocking it would make the design undeclarable. FALSE for
// the derived kinds, whose legal SHAPE is knowable from the grammar alone, with
// no index, no weeks and no content. This check is therefore syntactic and
// fires here, where a refusal costs milliseconds, instead of two seats and two
// paid 900-second attempts later at the shell gate — which is what it cost,
// twice, on proving run 4 (`markStrip:Night`, and three more the shell gate
// would have waved through as forward promises: `oracle:Arrivals`,
// `cipher:Ledger`, `door:Threshold`).
//
// SHAPE ONLY, NEVER ARITY, and the restraint is deliberate. `surfaceRefResolves`
// accepts any week-shaped id for any kind (`if (weekNo !== null) return ok`), so
// `session:W3` resolves everywhere else in the machine. Refusing it here alone
// would be a demand nobody diagnosed, blocking a book for something every other
// seat tolerates. Separators are tolerated for the same reason: the index slugs
// through `toSlugWords`, so `W3.2`, `W3-2` and `W3 2` are one id downstream and
// all three must pass.
//
// ONE HOME, TWO READERS (D93/D133's idiom), and the second reader is why this
// block sits beside surfaceRefResolves rather than inside the rulebook floors:
//   · validateGameRulebookStage — the cheap kill, at the seat that writes the
//     ref first, before a single week exists.
//   · surfaceRefResolves        — every spine seat and the simulated player.
// The second reader is not tidiness. The shell gate's PROMISE RULE accepts any
// ref of a kind the index has no bucket for, and at the shell seat the skeleton
// has no oracle, cipher or door — so of the FOUR derived-kind inventions in the
// real run-4 rulebook (`markStrip:Night` `oracle:Arrivals` `cipher:Ledger`
// `door:Threshold`) exactly ONE was ever reported. The other three were forward
// promises to a machine and impossibilities to a printer, and the only gate that
// would have seen them is report-class. A promise rule that cannot tell a
// promise from an impossibility is what this predicate repairs.
var FIXED_FORM_REF_KINDS = {
  week: 1, session: 1, markStrip: 1, reckoning: 1, oracle: 1, cipher: 1, door: 1
};
var FIXED_FORM_REF_SHAPE = /^w\s*\d+(?:\s*[.\-]?\s*\d+)?$/i;

/**
 * fixedFormRefReason(parsed) -> string
 *
 * '' when the parsed ref is fine (a singleton, a declared kind, or a derived
 * kind already written W-shaped — none of which this predicate has an opinion
 * about), otherwise the reason clause: why it can never resolve and the shape
 * to write instead. A CLAUSE, not a sentence, so both readers can prefix it
 * with the ref in their own field's grammar and the wording stays identical.
 */
function fixedFormRefReason(parsed) {
  var p = parsed || {};
  if (!p.valid || !p.id) return '';
  if (!FIXED_FORM_REF_KINDS[p.kind]) return '';
  if (FIXED_FORM_REF_SHAPE.test(String(p.id).trim())) return '';
  var sessioned = p.kind === 'session' || p.kind === 'markStrip';
  return 'gives the `' + p.kind + '` the id "' + p.id
    + '", and ' + p.kind + ' ids are DERIVED from the week and session numbers, never named'
    + ' — write `' + p.kind + ':W3` for the week-3 surface'
    + (sessioned ? ' or `' + p.kind + ':W3.2` for session 2 of week 3' : '')
    + '. A narrative label here names a surface this book will never print, whatever else it'
    + ' contains. Name it by its number, and put the world-name in the prose.';
}

/**
 * fixedFormRefShapeError(ref) -> string
 *
 * The rulebook seat's reading: '' or the message with the offending ref quoted
 * in front of it. The caller supplies the field path, so one message serves all
 * four ref-carrying rulebook fields and the registry needs one anchor.
 */
function fixedFormRefShapeError(ref) {
  var parsed = parseSurfaceRef(ref);
  var reason = fixedFormRefReason(parsed);
  return reason ? '"' + parsed.raw + '" ' + reason : '';
}

// A week-shaped id ('W3', 'W3.2') the index can place. Returns the week number
// or null — the ordering floors need the NUMBER, not just existence.
function surfaceRefWeek(parsed) {
  var m = /^w\s*(\d+)/i.exec(String(parsed.id || '').trim());
  return m ? parseInt(m[1], 10) : null;
}

/**
 * surfaceRefResolves(index, ref) -> { ok, reason }
 *
 * Two distinct findings, deliberately not collapsed (the same split as
 * citationPinpoints' own/foreign): a ref that does not PARSE is a grammar error
 * the model can fix from the message alone, while a ref that parses and finds
 * nothing needs the book to explain. Collapsing them produced "invalid ref"
 * messages that told a model nothing about which half to change.
 *
 * Singletons (`banked`, `boss`, `assembly`) always resolve: a book has at most
 * one of each and the spine may name it before it is built.
 */
export function surfaceRefResolves(index, ref) {
  var parsed = parseSurfaceRef(ref);
  if (!parsed.valid) {
    return { ok: false, reason: 'is not a surface ref (expected `kind:id`, e.g. `clock:Relief Ledger`, or one of banked / boss / assembly)' };
  }
  if (!parsed.id) return { ok: true, reason: '' };

  var weekNo = surfaceRefWeek(parsed);
  if (weekNo !== null && !index.weeks[weekNo]) {
    return { ok: false, reason: 'names week ' + weekNo + ', which this book does not have' };
  }
  // THE SHAPE QUESTION, ASKED BEFORE THE PROMISE RULE (2026-08-20). A derived
  // kind's id is knowable without an index, so the promise rule below must not
  // get to wave one through: `oracle:Arrivals` at the shell seat finds no
  // oracle bucket and is accepted as an intention, and the intention is
  // unbuildable. Ordered after the week check so `markStrip:W99` keeps the
  // better message (the shape is right; the week is not).
  var shapeReason = fixedFormRefReason(parsed);
  if (shapeReason) return { ok: false, reason: shapeReason };
  // THE PROMISE RULE. The spine is declared before content exists, so a name
  // check has teeth exactly where the stage already knows the names:
  //   - nothing of this kind is authored yet  -> forward promise, accept. At
  //     the shell stage no clock has been written, so `clock:Relief Ledger` is
  //     an intention; blocking it would make the spine undeclarable before the
  //     content it is supposed to shape.
  //   - some of this kind ARE authored        -> the set is knowable, so a name
  //     outside it is a real miss. The fragment registry is the live example:
  //     it exists at skeleton time, so `fragment:F.09` against a six-entry
  //     registry is a defect the moment it is written.
  //   - week-shaped ids                       -> judged by the week, above.
  // The rendered-reality half — does the printed page carry the surface the
  // spine named — is the W4b simulated player's question, not this one's.
  var bucket = index.kinds[parsed.kind];
  if (!bucket) return { ok: true, reason: '' };
  if (bucket[toSlugWords(parsed.id)]) return { ok: true, reason: '' };
  if (weekNo !== null) return { ok: true, reason: '' };
  return { ok: false, reason: 'points at "' + parsed.id + '", which no ' + parsed.kind + ' in this book is called' };
}

// The tick origins: where value ENTERS the economy. An economy graph with no
// source is a closed loop the player can never feed.
var SPINE_SOURCE_KINDS = { markStrip: 1, session: 1, week: 1 };
// The surfaces that PRINT an outcome — where value leaves the economy and
// becomes something on the page.
var SPINE_SINK_KINDS = {
  map: 1, clock: 1, companion: 1, oracle: 1, cipher: 1, fragment: 1,
  seal: 1, ending: 1, boss: 1, assembly: 1, door: 1
};

// The ENDGAME surfaces: the payoff the whole six weeks is for. A strict subset
// of the sinks above, and the distinction is the point — a clock or a map is a
// surface the economy may legitimately gate, while these four are the payoff
// VISION §4.5 protects. Read by Floor 11a, and the same set the simulated
// player calls `book.endgame`.
//
// THE MEMBERSHIP IS NOT UNIFORM, and Floor 11a splits it (acceptance package
// item 4, 2026-08-17): `boss`/`assembly`/`seal` decide WHETHER the book can be
// finished and are what a lifter at 60% adherence may never be locked out of;
// `ending` decides WHICH close they reach, and performance is allowed to shape
// that as long as one close stays open. Do not read this object as one class.
var SPINE_ENDGAME_KINDS = { boss: 1, assembly: 1, ending: 1, seal: 1 };

// `differsBy` must name a MECHANICAL surface, not an adjective. Reuses the D100
// extraction-must-find-something idiom: the needle list is derived from the ref
// grammar plus the mechanical nouns the schema already prints, and a scan that
// matched nothing anywhere would itself be the defect.
var DECISION_MECHANICAL_NEEDLES = [
  'clock', 'track', 'map', 'node', 'region', 'cipher', 'oracle', 'companion',
  'fragment', 'seal', 'banked', 'spend', 'price', 'tick', 'mark', 'reckoning',
  'threshold', 'ending', 'boss', 'assembly', 'key', 'gate', 'stat', 'inventory',
  'slot', 'die', 'dice', 'roll', 'table', 'ledger'
];

function namesMechanicalSurface(text) {
  var hay = ' ' + toSlugWords(text) + ' ';
  if (parseSurfaceRef(text).valid) return true;
  for (var i = 0; i < DECISION_MECHANICAL_NEEDLES.length; i++) {
    if (hay.indexOf(' ' + DECISION_MECHANICAL_NEEDLES[i]) !== -1) return true;
  }
  return false;
}

/**
 * collectSpineSkeletonFloorErrors(spine, skeleton) -> string[]
 *
 * The five book-wide closure floors, checked against the DECLARATION and the
 * weekPlan. Collected rather than early-returned for the same reason the D111
 * skeleton floors are: a spine that misses three should cost ONE retry naming
 * all three.
 */
// ── THE RULEBOOK FLOORS (VISION §4.0 / PLAY.md §3.1-§3.2, D173) ────────────
// Two instruments, two seats, and the split is the whole design:
//
//   validateGameRulebookStage        runs at the rulebook's OWN stage. Presence,
//                                    shape, the word band both ways, the verb
//                                    arity and ref-grammar validity. Everything
//                                    checkable about the document ALONE.
//   collectRulebookSpineParityErrors runs at the SPINE seat (`shell` on the
//                                    multi-stage path, `skeleton` on S+F),
//                                    because a parity check needs both sides
//                                    and the graph does not exist yet at the
//                                    earlier seat.
//
// CLASS (PLAY.md §3.4). The band is a LAW: "did you answer the question at all"
// is a property of any book, not of this book's declaration. The parity floor
// is the CONFORMANCE archetype — it asks nothing about what game this is and
// only whether the machine and the rules describe the same one. Both block, and
// under §3.4's tie-break they would block anyway: AMBIGUITY DEFAULTS TO LAW.
//
// EVERY PARITY ERROR QUOTES THE DEFECT. A floor that says "the rules and the
// graph disagree" sends a retry to re-read two documents; a floor that says
// which currency, which verb, which ref sends it to one line.

/**
 * rulebookAnswerText(rulebook, key) -> string
 * One reader for "what did the model actually write for question N", so the
 * band floor, the parity floor and the prompt formatter cannot disagree about
 * what counts as an answer.
 */
function rulebookAnswerText(rulebook, key) {
  var node = (rulebook || {})[key];
  if (!node || typeof node !== 'object' || Array.isArray(node)) return '';
  return String(node.answer === undefined || node.answer === null ? '' : node.answer).trim();
}

/**
 * rulebookTaughtText(rulebook) -> string
 * Everything the rulebook TEACHES, as one lower-cased haystack: the eight
 * answers plus the currency name. This is what the graph→rules direction is
 * matched against — a system the player is told about ANYWHERE in the rules is
 * taught, and it is not this floor's business which paragraph did it.
 */
function rulebookTaughtText(rulebook) {
  var parts = [];
  GAME_RULEBOOK_ANSWERS.forEach(function (row) {
    parts.push(rulebookAnswerText(rulebook, row.key));
  });
  parts.push(String(((rulebook || {}).economy || {}).currency || ''));
  // THE VERB LIST IS TAUGHT MATERIAL, not machine plumbing, and this line is a
  // correction made on contact rather than a convenience. The first version of
  // this floor read the eight prose answers alone and immediately reported a
  // book that declares `{ verb: 'tick', on: 'clock:the tide' }` as containing a
  // clock "the player is never told about" — which is false: the verb list is
  // exactly the part of the rulebook the point-of-use pages print, so a surface
  // a declared verb is performed on IS taught. Including the ref also means the
  // kind word arrives with it, which is the right answer for the same reason.
  var verbs = ((rulebook || {}).coreVerbs || {}).verbs;
  (Array.isArray(verbs) ? verbs : []).forEach(function (item) {
    parts.push(String((item || {}).verb || ''));
    parts.push(String((item || {}).on || ''));
  });
  // THE RITUAL IS TAUGHT MATERIAL BY THE STRONGEST ARGUMENT AVAILABLE, and the
  // verb list's reason raised one level: the cue is not merely part of the
  // rules, it is the part PRINTED ON EVERY SESSION PAGE. A surface the player
  // is instructed to act on at the top of every workout is the most taught
  // thing in the book, and a graph→rules arm that called it untaught would be
  // reporting the opposite of what the pages say.
  var ritual = ((rulebook || {}).sessionShape || {}).ritual;
  if (ritual && typeof ritual === 'object') {
    parts.push(String(ritual.cue || ''));
    parts.push(String(ritual.on || ''));
  }
  return parts.join('\n').toLowerCase();
}

/**
 * validateEconomyGraphStage(result, options) -> string
 *
 * The economy-graph sub-stage's own gate (§4.11). Returns '' on success and a
 * single joined error string on failure, the shape runJsonStage expects.
 *
 * ANNOTATE ONLY — THE FLOOR THAT MAKES THE RULING REAL (author decision 4). The
 * stage may add cadence, price and branch to edges that exist; it may never add
 * or remove one. That is D136's revisionInventsKeys idiom scoped to this unit,
 * and it is checked as a SET COMPARISON on `from → to` pairs against the graph
 * the stage was handed, because "same length" is not the same claim: a model
 * that drops one edge and invents another passes a count and has silently
 * rewritten the economy.
 *
 * `options.priorGraph` is the evidence and, per the D144 ungated-caller idiom,
 * its absence disarms only the no-invent arm — the cadence-shape arms below read
 * the unit they were handed and stay live regardless.
 */
export function validateEconomyGraphStage(result, options) {
  var S = 'Economy Graph → ';
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return S + 'not an object';
  }
  var graph = result.economyGraph;
  if (!Array.isArray(graph)) {
    return S + 'economyGraph is missing or not an array — this stage exists to pace the edges'
      + ' the book already declared, and it must return all of them';
  }

  var errors = [];
  var opts = options || {};
  var edgeKey = function (edge) {
    return toSlugWords(String((edge || {}).from || '')) + ' -> '
      + toSlugWords(String((edge || {}).to || ''));
  };

  // ── The no-invent arm ────────────────────────────────────────────────────
  var prior = Array.isArray(opts.priorGraph) ? opts.priorGraph : null;
  if (prior) {
    var priorKeys = {};
    prior.forEach(function (edge) { priorKeys[edgeKey(edge)] = String((edge || {}).from || '') + ' → ' + String((edge || {}).to || ''); });
    var returnedKeys = {};
    graph.forEach(function (edge) { returnedKeys[edgeKey(edge)] = true; });
    Object.keys(priorKeys).forEach(function (key) {
      if (!returnedKeys[key]) {
        errors.push(S + 'the edge `' + priorKeys[key] + '` was in the graph you were given and is'
          + ' not in what you returned. This stage may not remove an edge — the shape of this'
          + ' graph came from the rules, and dropping one here would mean the book has two'
          + ' different economies depending on which page you read. Return every edge, in order,'
          + ' with the same `from` and `to`.');
      }
    });
    graph.forEach(function (edge) {
      var key = edgeKey(edge);
      if (!priorKeys[key]) {
        errors.push(S + 'the edge `' + String((edge || {}).from || '?') + ' → '
          + String((edge || {}).to || '?') + '` is not in the graph you were given. This stage may'
          + ' not add an edge — it paces the economy the rules declared, it does not extend it.');
      }
    });
  }

  // ── The cadence-shape arms (strict when present, the manifestPointer idiom) ─
  graph.forEach(function (edge, i) {
    if (!edge || typeof edge !== 'object') {
      errors.push(S + 'economyGraph[' + i + '] is not an object');
      return;
    }
    var label = '`' + String(edge.from || '?') + ' → ' + String(edge.to || '?') + '`';
    if (!String(edge.from || '').trim() || !String(edge.to || '').trim()) {
      errors.push(S + 'economyGraph[' + i + '] is missing `from` or `to` — copy both verbatim'
        + ' from the graph you were given');
    }
    var cadence = edge.cadence;
    if (cadence === undefined || cadence === null) return;
    if (typeof cadence !== 'object' || Array.isArray(cadence)) {
      errors.push(S + label + ' has a `cadence` that is not an object — it is'
        + ' `{ "mode": ..., "introWeek": ... }`');
      return;
    }
    var mode = String(cadence.mode || '').trim();
    if (!mode) {
      errors.push(S + label + ' has a `cadence` with no `mode` — a cadence with no mode is a'
        + ' record that checks as nothing');
      return;
    }
    if (VALID_EDGE_CADENCES.indexOf(mode) === -1) {
      errors.push(S + label + ' declares `cadence.mode: "' + mode + '"`, which is not one of: '
        + VALID_EDGE_CADENCES.join(', ') + '. Use exactly one of those.');
      return;
    }
    var owed = EDGE_CADENCE_REQUIRED_FIELDS[mode];
    if (owed) {
      var owedValue = owed === 'introWeek' ? cadence.introWeek : edge[owed];
      if (!(Number(owedValue) > 0)) {
        errors.push(S + label + ' declares `cadence.mode: "' + mode + '"` and carries no `'
          + owed + '`. That cadence is a promise about which weeks the player touches this edge,'
          + ' and without `' + owed + '` it names no week. Supply `' + owed + '`, or use a'
          + ' cadence that does not need one.');
      }
    }
    var weekCount = Number(opts.weekCount) || 0;
    if (weekCount > 0 && Number(cadence.introWeek) > weekCount) {
      errors.push(S + label + ' declares `introWeek: ' + cadence.introWeek + '` and this book has '
        + weekCount + ' weeks. A surface that arrives after the last week never arrives.');
    }
  });

  return errors.length ? errors.join('; ') : '';
}

/**
 * validateGameRulebookStage(result, options) -> string
 *
 * The rulebook stage's own gate. Returns '' on success and a single joined
 * error string on failure, the shape runJsonStage expects.
 *
 * COLLECTED, NOT EARLY-RETURNED, for the D111 reason: a rulebook thin on three
 * answers should cost ONE retry naming all three. The only early return is a
 * missing object, because everything below it would then report the same fact
 * eight times.
 */
export function validateGameRulebookStage(result, options) {
  var S = 'Game Rulebook → ';
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return S + 'not an object';
  }
  var rulebook = result.gameRulebook;
  if (!rulebook || typeof rulebook !== 'object' || Array.isArray(rulebook)) {
    return S + 'gameRulebook is missing — this stage exists to decide what the game IS,'
      + ' and every stage after it is written to serve what it says';
  }

  var band = OUTPUT_BUDGETS.gameRulebook;
  var errors = [];
  var totalWords = 0;

  GAME_RULEBOOK_ANSWERS.forEach(function (row) {
    var node = rulebook[row.key];
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      errors.push(S + 'gameRulebook.' + row.key + ' is missing — "' + row.question
        + '" is one of the eight questions this stage owes, and a book cannot be written to serve an answer nobody gave');
      return;
    }
    var text = rulebookAnswerText(rulebook, row.key);
    var words = countRulebookWords(text);
    totalWords += words;
    var floor = row.load === 'load-bearing' ? band.loadBearingMinWords : band.supportingMinWords;
    if (words < floor) {
      errors.push(S + 'gameRulebook.' + row.key + '.answer is ' + words + ' word'
        + (words === 1 ? '' : 's') + ' against a floor of ' + floor + ' ("' + row.question
        + '"). The floor is the load-bearing half of this band: a one-line answer here is'
        + ' a tick-box, and the failures it hides do not surface until the book is played');
    }
  });

  if (totalWords > band.maxTotalWords) {
    errors.push(S + 'the eight answers total ' + totalWords + ' words against a ceiling of '
      + band.maxTotalWords + '. This is a design document, not a chapter — it should be'
      + ' shorter than one week of the book\'s prose, and a rulebook long enough to hide'
      + ' in is a rulebook nobody checked');
  }

  // ── The verbs: arity, and DISTINCTNESS ──
  // §3.1: "if two of the verbs are the same verb with different labels, there
  // are fewer verbs than the model thinks." Checked on the verb word alone,
  // case-folded — the surface may repeat (two things marked on one strip is a
  // real design), the verb may not.
  var verbs = ((rulebook.coreVerbs || {}).verbs) || [];
  if (!Array.isArray(verbs) || verbs.length < GAME_RULEBOOK_VERBS_MIN
    || verbs.length > GAME_RULEBOOK_VERBS_MAX) {
    errors.push(S + 'gameRulebook.coreVerbs.verbs has '
      + (Array.isArray(verbs) ? verbs.length : 0) + ' entr'
      + ((Array.isArray(verbs) ? verbs.length : 0) === 1 ? 'y' : 'ies') + '; this book owes '
      + GAME_RULEBOOK_VERBS_MIN + '-' + GAME_RULEBOOK_VERBS_MAX
      + ' — fewer is not a game, more is a list the player has to hold at the gym');
  }
  var seenVerbs = {};
  (Array.isArray(verbs) ? verbs : []).forEach(function (item, vi) {
    var verb = String((item || {}).verb || '').trim().toLowerCase();
    var on = String((item || {}).on || '').trim();
    if (!verb) {
      errors.push(S + 'gameRulebook.coreVerbs.verbs[' + vi + '] has no verb');
    } else if (seenVerbs[verb]) {
      errors.push(S + 'gameRulebook.coreVerbs.verbs names "' + verb
        + '" twice — the same verb with two labels is one verb, so name the third thing'
        + ' the player actually does instead');
    } else {
      seenVerbs[verb] = 1;
    }
    if (!on) {
      errors.push(S + 'gameRulebook.coreVerbs.verbs[' + vi + '] ("' + (verb || '?')
        + '") names no surface — a verb with nowhere to happen is a word');
    } else if (!parseSurfaceRef(on).valid) {
      errors.push(S + 'gameRulebook.coreVerbs.verbs[' + vi + '].on "' + on
        + '" is not a surface ref — write it in the `kind:id` grammar from the Surface refs'
        + ' section, or the next stage cannot wire the verb to anything');
    } else {
      var onShape = fixedFormRefShapeError(on);
      if (onShape) {
        errors.push(S + 'gameRulebook.coreVerbs.verbs[' + vi + '].on ' + onShape);
      }
    }
  });

  // ── The two ref lists ──
  // GRAMMAR ONLY at this seat, deliberately, and this is the placement ruling
  // made honest: this stage runs before any week, fragment or board exists, so
  // a ref cannot be resolved against an index that has nothing in it. What a
  // ref written here BECOMES is a demand on the spine — the parity floor at the
  // spine seat requires it to appear as a node, and the spine's own closure
  // floors resolve that node against the book. Transitive, and each half is
  // checked where its evidence lives.
  [['winCondition', 'requires', 'the win condition'],
    ['passwordPath', 'elements', 'the password path']].forEach(function (row) {
    var list = ((rulebook[row[0]] || {})[row[1]]) || [];
    if (!Array.isArray(list) || !list.length) {
      errors.push(S + 'gameRulebook.' + row[0] + '.' + row[1]
        + ' is empty — ' + row[2] + ' must land as structured data as well as prose, or the'
        + ' simulated player has nothing to aim at: it walks the graph and cannot read a paragraph');
      return;
    }
    list.forEach(function (ref, ri) {
      var raw = String(ref || '').trim();
      if (!parseSurfaceRef(raw).valid) {
        errors.push(S + 'gameRulebook.' + row[0] + '.' + row[1] + '[' + ri + '] "' + raw
          + '" is not a surface ref — write it in the `kind:id` grammar from the Surface refs section');
      } else {
        // The SHAPE half of the same rule (see fixedFormRefShapeError above):
        // grammar-only at this seat still, because a derived kind's legal form
        // needs no index.
        var listShape = fixedFormRefShapeError(raw);
        if (listShape) {
          errors.push(S + 'gameRulebook.' + row[0] + '.' + row[1] + '[' + ri + '] ' + listShape);
        }
      }
    });
  });

  // ── THE ENDING COUNT IS ONE NUMBER (W3 — the read's defect 12) ──────────
  // The first delivered book's win condition promised "one of the three
  // endings" while three different surfaces held three different counts. The
  // half a machine can settle HERE, before a word of prose is written, is the
  // rulebook's own internal one: the number the answer states out loud against
  // the number of `ending:` refs the same object lists for the walker. A book
  // that disagrees with itself at the design stage disagrees with itself on
  // every page written from it.
  //
  // SILENT WHEN NO NUMBER IS CLAIMED. A win condition that never states a count
  // is making no claim, and inventing one to check would be the gate writing
  // the design. Only a stated numeral is a promise.
  {
    var claimed = statedEndingCount((rulebook.winCondition || {}).answer);
    if (claimed !== null) {
      var endingRefs = {};
      ((rulebook.winCondition || {}).requires || []).forEach(function (ref) {
        var parsed = parseSurfaceRef(ref);
        if (parsed.valid && parsed.kind === 'ending' && parsed.id) {
          endingRefs[String(parsed.id).trim().toLowerCase()] = true;
        }
      });
      var refCount = Object.keys(endingRefs).length;
      if (refCount && refCount !== claimed) {
        errors.push(S + 'gameRulebook.winCondition says the player reaches one of ' + claimed
          + ' endings, and `requires` names ' + refCount + ' distinct `ending:` ref'
          + (refCount === 1 ? '' : 's') + '. Those are the same number written twice — the prose'
          + ' is what the player is promised and the refs are what the walker aims at, and a book'
          + ' that disagrees with itself here will print that disagreement on the page a reader'
          + ' finishes on. Say one number, in both places.');
      }
    }
  }

  // ── THE SESSION RITUAL (the play-legibility root cause, 2026-08-19) ─────
  // VISION §4.0's "printed at the point of use, shaped as a form" was ratified
  // and unbuilt: the first delivered book taught "roll two d10 at the start of
  // the session" on a rules page and printed nothing on the page the player
  // opens at the gym. `sessionShape.answer` is a designer's paragraph and never
  // prints, by ruling — so nothing carried the answer to "what do I do now" to
  // the one place it is asked.
  //
  // THREE DEMANDS AND A GRAMMAR CHECK, all of them here rather than at the
  // spine seat, because every one is answerable from this document ALONE. The
  // fourth half — that `on` names a surface the economy graph touches — needs
  // both sides and lives in collectRulebookSpineParityErrors with the verbs'.
  {
    var ritual = (rulebook.sessionShape || {}).ritual;
    if (!ritual || typeof ritual !== 'object' || Array.isArray(ritual)) {
      errors.push(S + 'gameRulebook.sessionShape.ritual is missing — the answer above is a design'
        + ' note that never prints, so without this the player opens a session page at the gym'
        + ' with no indication of what to do first. Write the opening move as one printed'
        + ' imperative (`cue`) on one named surface (`on`)');
    } else {
      var cue = String(ritual.cue === undefined || ritual.cue === null ? '' : ritual.cue).trim();
      if (!cue) {
        errors.push(S + 'gameRulebook.sessionShape.ritual.cue is empty — this is the sentence the'
          + ' session card prints, and an empty one prints nothing at the moment it is needed');
      } else if (cue.length > band.ritualCueMaxChars) {
        errors.push(S + 'gameRulebook.sessionShape.ritual.cue is ' + cue.length
          + ' characters against a ceiling of ' + band.ritualCueMaxChars
          + '. This prints at the top of every session page and is read mid-set: past two printed'
          + ' lines it stops being a cue and becomes a paragraph the player skips. Say the one'
          + ' thing they do first');
      }
      var ritualOn = String(ritual.on === undefined || ritual.on === null ? '' : ritual.on).trim();
      if (!parseSurfaceRef(ritualOn).valid) {
        errors.push(S + 'gameRulebook.sessionShape.ritual.on '
          + (ritualOn ? '"' + ritualOn + '" is not a surface ref' : 'is empty')
          + ' — the ritual happens somewhere, and the next stage has to wire it to that surface;'
          + ' write it in the `kind:id` grammar from the Surface refs section');
      } else {
        var ritualShape = fixedFormRefShapeError(ritualOn);
        if (ritualShape) {
          errors.push(S + 'gameRulebook.sessionShape.ritual.on ' + ritualShape);
        }
      }
    }
  }

  if (!String(((rulebook.economy || {}).currency) || '').trim()) {
    errors.push(S + 'gameRulebook.economy.currency is empty — the economy owes the name this'
      + ' world calls its currency, because that exact phrase is what the book prints and'
      + ' what the graph is checked against');
  }

  if (options && options.collect) return errors;
  return errors.length ? errors.join('; ') : '';
}

/**
 * collectRulebookSpineParityErrors(rulebook, spine, stageLabel) -> string[]
 *
 * THE TWO-WAY PARITY FLOOR (PLAY.md §3.2). The spine is the rulebook's
 * projection, and one direction alone has never held in this project:
 *
 *   RULES → GRAPH  catches "the book explains a system the machine has never
 *                  heard of". Nothing validates it, nothing simulates it, and
 *                  it silently does not exist.
 *   GRAPH → RULES  catches "the machine contains a system the player is never
 *                  told about". It passes every gate and no human can play it.
 *
 * NO RULEBOOK ⇒ NO CHECK, and that is the honest failure rather than a hole:
 * the absence is blocked at the rulebook's own stage, and a caller that never
 * ran that stage (the guided wizard, the manual surface, a hand-built replay)
 * owes nothing here. A floor that invented a rulebook to check against would be
 * checking the book against itself.
 */
export function collectRulebookSpineParityErrors(rulebook, spine, stageLabel) {
  if (!rulebook || typeof rulebook !== 'object') return [];
  if (!spine || typeof spine !== 'object') return [];
  var S = (stageLabel || 'Skeleton') + ' → ';
  var errors = [];

  var edges = Array.isArray(spine.economyGraph) ? spine.economyGraph : [];
  // Node identity is the ref STRING, case-folded — parseSurfaceRef matches
  // case-insensitively, so the floor must too or `Cipher:W2` and `cipher:W2`
  // would be two nodes to the gate and one to every other reader.
  var nodes = {};
  edges.forEach(function (edge) {
    ['from', 'to'].forEach(function (side) {
      var raw = String((edge || {})[side] || '').trim();
      if (raw) nodes[raw.toLowerCase()] = raw;
    });
  });
  var hasNode = function (ref) {
    return Object.prototype.hasOwnProperty.call(nodes, String(ref || '').trim().toLowerCase());
  };

  // ── RULES → GRAPH ──────────────────────────────────────────────────────
  // 1. the currency the rules name is priced on an edge
  var currency = String(((rulebook.economy || {}).currency) || '').trim();
  if (currency) {
    var priced = edges.some(function (edge) {
      return String((edge || {}).currency || '').trim().toLowerCase() === currency.toLowerCase();
    });
    if (!priced) {
      errors.push(S + 'the rulebook teaches the currency "' + currency
        + '" and no `playSpine.economyGraph` edge carries it. The player would be taught an'
        + ' economy the machine has never heard of — add the edges that move it, spelled the'
        + ' way the rulebook spelled it');
    }
  }
  // 2. every verb happens on a surface the graph touches
  var verbs = ((rulebook.coreVerbs || {}).verbs) || [];
  (Array.isArray(verbs) ? verbs : []).forEach(function (item) {
    var verb = String((item || {}).verb || '').trim();
    var on = String((item || {}).on || '').trim();
    if (!on || hasNode(on)) return;
    errors.push(S + 'the rulebook teaches the player to "' + (verb || 'act') + '" on `' + on
      + '`, and no `playSpine.economyGraph` edge names that surface. A verb performed on a'
      + ' node no edge touches is a system nothing validates and nothing simulates');
  });
  // 2b. THE SESSION RITUAL happens on a surface the graph touches. The verbs'
  //     check exactly, and separate because the repair is different: a verb
  //     with a dead surface is a rule nobody performs, and a RITUAL with a dead
  //     surface is a rule printed on every session page pointing at nothing —
  //     the loudest version of the same failure, on the surface the player
  //     reads most often.
  var ritualOn = String((((rulebook.sessionShape || {}).ritual) || {}).on || '').trim();
  if (ritualOn && !hasNode(ritualOn)) {
    errors.push(S + 'the rulebook prints an opening ritual on `' + ritualOn
      + '` at the top of every session page, and no `playSpine.economyGraph` edge names that'
      + ' surface. This is the one instruction the player reads every session, so a ritual'
      + ' aimed at a node no edge touches is the book\'s most-read sentence pointing at'
      + ' nothing — wire the surface or move the ritual to one the economy already reaches');
  }
  // 3-4. the win condition and the password path reach the graph
  [['winCondition', 'requires', 'the win condition requires'],
    ['passwordPath', 'elements', 'the password is assembled from']].forEach(function (row) {
    var list = ((rulebook[row[0]] || {})[row[1]]) || [];
    (Array.isArray(list) ? list : []).forEach(function (ref) {
      var raw = String(ref || '').trim();
      if (!raw || hasNode(raw)) return;
      errors.push(S + 'the rulebook says ' + row[2] + ' `' + raw
        + '`, and no `playSpine.economyGraph` edge names it. The simulated player walks the'
        + ' graph and cannot read the rulebook, so a node it never sees is a claim nothing'
        + ' can prove — wire it or change the rule');
    });
  });

  // ── GRAPH → RULES ──────────────────────────────────────────────────────
  var taught = rulebookTaughtText(rulebook);
  // 5. every currency on an edge is a currency the rules taught
  var seenCurrency = {};
  edges.forEach(function (edge) {
    var label = String((edge || {}).currency || '').trim();
    if (!label) return;                       // an unpriced edge names no currency
    var key = label.toLowerCase();
    if (seenCurrency[key]) return;
    seenCurrency[key] = 1;
    if (taught.indexOf(key) === -1) {
      errors.push(S + '`playSpine.economyGraph` moves a currency called "' + label
        + '" and the rulebook never mentions it. The machine would contain a system the'
        + ' player is never told about: it passes every other gate and no human can play it');
    }
  });
  // 6. every KIND of surface the graph touches is named in the rules, in the
  //    player-facing words the rulebook stage was shown. Kinds, not refs: a
  //    rulebook is written for a player who will never read `markStrip:W3.2`,
  //    and demanding the ref would demand machine vocabulary on a page meant
  //    for a person.
  var seenKind = {};
  Object.keys(nodes).forEach(function (key) {
    var parsed = parseSurfaceRef(nodes[key]);
    if (!parsed.valid) return;                // the closure floors own bad refs
    var kind = String(parsed.kind || '').trim();
    if (!kind || seenKind[kind]) return;
    seenKind[kind] = 1;
    var words = RULEBOOK_KIND_WORDS[kind];
    if (!words || !words.length) return;      // a kind with no player word owes nothing
    var named = words.some(function (word) { return taught.indexOf(word) !== -1; });
    if (!named) {
      errors.push(S + '`playSpine.economyGraph` wires a `' + kind
        + '` and the rulebook never mentions one (it would have said '
        + words.map(function (w) { return '"' + w + '"'; }).join(' or ')
        + '). Either teach it in the rules or take it out of the graph — a system the rules'
        + ' skip is one the player cannot use');
    }
  });

  return errors;
}

export function collectSpineSkeletonFloorErrors(spine, skeleton, stageLabel, plannedWeeks) {
  var errors = [];
  // ── THE DELOAD EXHALE'S EVIDENCE (2026-08-17) ────────────────────────────
  // `plannedWeeks` is derivePlannedWeekShapes()' output — the ONE deload
  // derivation (D166), the same array the pre-flight floor already consumes,
  // handed here as a fourth parameter rather than re-derived from whichever
  // shape the caller happens to hold. A second deload heuristic beside the
  // first is D93's two-algorithms defect, and it is exactly the mistake the
  // "lighter weeks" line in the topology digest already represents.
  //
  // A CALLER THAT PASSES NOTHING GETS NO EXEMPTION. A gate never invents the
  // plan it is checking against: with no shapes in hand every week is treated
  // as a working week and the tension floor blocks precisely as it did before.
  var deloadWeeks = {};
  (Array.isArray(plannedWeeks) ? plannedWeeks : []).forEach(function (w) {
    var n = Number((w || {}).weekNumber);
    if (Number.isInteger(n) && (w || {}).isDeload) deloadWeeks[n] = true;
  });
  // The compiler runs at `shell` on the standard pipeline and at `skeleton` on
  // S+F, so the prefix is a parameter: an error naming the wrong stage sends
  // the retry to a prompt that cannot fix it.
  var S = (stageLabel || 'Skeleton') + ' \u2192 ';
  if (!spine || typeof spine !== 'object') {
    return [S + 'meta.playSpine is missing — every book declares its play spine before content exists'
      + ' (composition of ' + SPINE_BUDGETS.compositionMin + '-' + SPINE_BUDGETS.compositionMax
      + ' library entries, economyGraph, consequenceEdges, decisionLedger, tensionBudget, difficultyCurve)'];
  }

  var index = buildSurfaceIndex(skeleton || {});

  // ── Floor 1: composition arity ──
  // 2-4 entries, distinct, each with a role. One entry is not a composition; it
  // is the single-family pick the anti-house-economy law forbids by name.
  var composition = Array.isArray(spine.composition) ? spine.composition : [];
  if (composition.length < SPINE_BUDGETS.compositionMin || composition.length > SPINE_BUDGETS.compositionMax) {
    errors.push(S + 'playSpine.composition has ' + composition.length + ' entr'
      + (composition.length === 1 ? 'y' : 'ies') + '; this book owes '
      + SPINE_BUDGETS.compositionMin + '-' + SPINE_BUDGETS.compositionMax
      + ' wired into one economy — a single entry is a family pick, not a composition');
  }
  var seenEntries = {};
  composition.forEach(function (item, ci) {
    var entry = String((item || {}).entry || '').trim();
    if (!entry || LUDIC_LIBRARY.indexOf(entry) === -1) {
      errors.push(S + 'playSpine.composition[' + ci + '].entry "' + entry
        + '" is not in the Ludic Library (' + LUDIC_LIBRARY.join(' | ')
        + ') — if the brief wants something the library lacks, say so in honestGaps rather than inventing an entry');
    } else if (seenEntries[entry]) {
      errors.push(S + 'playSpine.composition names "' + entry
        + '" twice — a composition needs distinct systems listening to each other, not one system counted twice');
    } else {
      seenEntries[entry] = 1;
    }
    if (!String((item || {}).role || '').trim()) {
      errors.push(S + 'playSpine.composition[' + ci + '] has no role — name what this entry does IN THIS BOOK,'
        + ' or the composition is a parts list');
    }
  });

  // ── Floor 1b: the composition is a CHOICE, not a description (D170) ──
  // Arity alone was satisfiable with furniture. The first completed book
  // declared four entries and three of them are printed by every book by
  // construction — the week gate refuses a non-boss week with no map, cipher
  // or oracle, and `meta.economy` is required at this very stage — so the
  // composition described the default book in the vocabulary of a choice, and
  // passed. VISION §4.6 asks for a composition "never a single-family pick";
  // a composition of things you could not have avoided is that pick with the
  // furniture counted as company.
  //
  // The number is DERIVED (compositionDiscretionaryFloor, contract-constants),
  // never a literal here, and the prompt states the same rule in the same
  // words — compositionFloorParity() in validate.mjs holds the two together.
  // Landing one alone either fails books for an unasked shape or asks for a
  // shape nothing checks (the D136 F04 idiom).
  var legalEntries = composition
    .map(function (item) { return String((item || {}).entry || '').trim(); })
    .filter(function (entry) { return LUDIC_LIBRARY.indexOf(entry) !== -1; });
  var uniqueEntries = [];
  legalEntries.forEach(function (entry) {
    if (uniqueEntries.indexOf(entry) === -1) uniqueEntries.push(entry);
  });
  if (uniqueEntries.length >= SPINE_BUDGETS.compositionMin) {
    var instruments = uniqueEntries.filter(function (entry) {
      return LUDIC_DISCRETIONARY_ENTRIES.indexOf(entry) !== -1;
    });
    var owed = compositionDiscretionaryFloor(uniqueEntries.length);
    if (instruments.length < owed) {
      var furniture = uniqueEntries.filter(function (entry) {
        return LUDIC_STRUCTURAL_ENTRIES.indexOf(entry) !== -1;
      });
      errors.push(S + 'playSpine.composition names ' + uniqueEntries.length + ' entries and only '
        + instruments.length + ' of them is something this book had to choose'
        + (furniture.length ? ' — `' + furniture.join('`, `') + '` print in every book whether a spine names them or not' : '')
        + '. A composition of ' + uniqueEntries.length + ' owes at least ' + owed
        + ' from the INSTRUMENTS half of the menu (' + LUDIC_DISCRETIONARY_ENTRIES.join(' | ')
        + '). Replace the furniture with the systems that make THIS book a different game, '
        + 'or keep it and say in its `role` what it does here that it does not do everywhere');
    }
  }

  // ── Floor 2: graph connectivity ──
  // Every node reachable from a source and reaching a sink that prints. An
  // orphan system is a mechanic reachable from nothing and feeding nothing.
  var edges = Array.isArray(spine.economyGraph) ? spine.economyGraph : [];
  if (!edges.length) {
    errors.push(S + 'playSpine.economyGraph is empty — name the edges: what ticks feed, where the tally banks,'
      + ' what the banked value buys, what that opens. Edges are named, never implied');
  }
  var parsedEdges = [];
  edges.forEach(function (edge, ei) {
    var from = parseSurfaceRef((edge || {}).from);
    var to = parseSurfaceRef((edge || {}).to);
    ['from', 'to'].forEach(function (side) {
      var res = surfaceRefResolves(index, (edge || {})[side]);
      if (!res.ok) {
        errors.push(S + 'playSpine.economyGraph[' + ei + '].' + side + ' "'
          + String((edge || {})[side] || '') + '" ' + res.reason);
      }
    });
    if (from.valid && to.valid) parsedEdges.push({ i: ei, from: from, to: to });
  });

  if (parsedEdges.length) {
    var nodes = {};
    parsedEdges.forEach(function (e) {
      nodes[e.from.kind + ':' + e.from.id] = e.from;
      nodes[e.to.kind + ':' + e.to.id] = e.to;
    });
    var hasSource = parsedEdges.some(function (e) { return SPINE_SOURCE_KINDS[e.from.kind]; });
    if (!hasSource) {
      errors.push(S + 'playSpine.economyGraph has no source edge — nothing enters this economy.'
        + ' At least one edge must start at a tick origin (markStrip: / session: / week:)');
    }
    var hasSink = parsedEdges.some(function (e) { return SPINE_SINK_KINDS[e.to.kind]; });
    if (!hasSink) {
      errors.push(S + 'playSpine.economyGraph has no printing sink — nothing this economy produces reaches the page.'
        + ' At least one edge must end at a surface the book prints');
    }

    // Reachability, forward from every source and backward from every sink.
    var forward = {}, backward = {};
    parsedEdges.forEach(function (e) {
      if (SPINE_SOURCE_KINDS[e.from.kind]) forward[e.from.kind + ':' + e.from.id] = 1;
      if (SPINE_SINK_KINDS[e.to.kind]) backward[e.to.kind + ':' + e.to.id] = 1;
    });
    var grew = true;
    while (grew) {
      grew = false;
      parsedEdges.forEach(function (e) {
        var a = e.from.kind + ':' + e.from.id;
        var b = e.to.kind + ':' + e.to.id;
        if (forward[a] && !forward[b]) { forward[b] = 1; grew = true; }
        if (backward[b] && !backward[a]) { backward[a] = 1; grew = true; }
      });
    }
    // ── THE CASCADE, REPORTED AT ITS ROOT (D156) ──
    // One missing edge strands everything downstream of it, and the floor used
    // to report each stranded node as its own defect: the author's first book
    // drew NINE orphan errors from a single unfed subgraph, and the retry went
    // looking for nine repairs. A directive must name the repair (D154's
    // lesson) — so the roots say what edge to add, and the nodes behind them
    // say whose fix will free them. Every message keeps the phrase
    // "reachable from no source" so nothing matching on it goes blind.
    //
    // Display form matters here too: `banked`, `boss` and `assembly` are
    // SINGLETONS written bare in the grammar, so the internal "kind:id" key
    // renders them "boss:" — a string the model never wrote and cannot search
    // for. Print what the book says.
    var refLabel = function (node) { return node.id ? node.kind + ':' + node.id : node.kind; };
    var orphanSet = {};
    Object.keys(nodes).forEach(function (k) { if (!forward[k]) orphanSet[k] = 1; });
    var strandedBehind = {};
    parsedEdges.forEach(function (e) {
      var a = e.from.kind + ':' + e.from.id;
      var b = e.to.kind + ':' + e.to.id;
      if (orphanSet[a] && orphanSet[b]) strandedBehind[b] = a;
    });

    Object.keys(nodes).forEach(function (key) {
      if (!forward[key]) {
        var node = nodes[key];
        var label = refLabel(node);
        if (strandedBehind[key]) {
          errors.push(S + 'playSpine.economyGraph: "' + label + '" is reachable from no source,'
            + ' because nothing feeds "' + refLabel(nodes[strandedBehind[key]]) + '" upstream of it.'
            + ' Fix that one first — this node comes back with it');
          return;
        }
        var weekNo = surfaceRefWeek(node);
        var feed = weekNo !== null ? 'markStrip:W' + weekNo : 'banked';
        errors.push(S + 'playSpine.economyGraph: "' + label + '" is reachable from no source —'
          + ' an orphan system the player can never feed. THIS IS THE ROOT: add one edge into it,'
          + ' `{ from: "' + feed + '", to: "' + label + '" }`, or whatever genuinely feeds it'
          + ' (a source is markStrip: / session: / week:), or drop it');
      } else if (!backward[key]) {
        // A source that reaches no sink is a dead spend: value goes in and
        // nothing on the page ever shows it. Same singleton-safe label as the
        // orphan arm above — one node, one spelling, whichever arm reports it.
        errors.push(S + 'playSpine.economyGraph: "' + refLabel(nodes[key]) + '" reaches no printing sink —'
          + ' a dead sink (value spent with no destination the book draws).'
          + ' Give it an edge INTO a surface the book prints (map: / clock: / oracle: / cipher: /'
          + ' fragment: / companion: / seal: / door: / ending: / boss / assembly), or drop it');
      }
    });

    // ── Floor 2b: the wallet is fed in EVERY week that prints (R1) ──────────
    // THE RULING THIS ENFORCES (author, 2026-08-17): a spine declares an income
    // edge for every printing week. Declaration-literal, because WHICH WEEKS
    // PAY is exactly the thing a representative edge cannot represent.
    //
    // The defect it closes is not in the book — it is in what the book let the
    // machine assume. A spine that wired `markStrip:W1 → reckoning:W1 → banked`
    // and stopped was read by the simulated player as banking every week
    // through the finale, because the walk traced the chain and dated income to
    // the last week on any hit. That inference was load-bearing for exactly one
    // finding (H8, the dead-end economy), and it made the finding a statement
    // about a book nobody wrote: income in weeks 2-6 that no edge declares.
    //
    // The sim now reads the wallet's feeders literally (sim-player.js H8), and
    // this floor is what keeps that reading complete rather than merely honest.
    // ONE RELATION, TWO READERS (D93): an edge whose `to` is the wallet, dated
    // by its source's print week. The sim credits exactly that; this demands
    // exactly that. Changing either alone is the two-algorithms defect.
    //
    // SCOPED TO BOOKS THAT HAVE A WALLET. A spine may route marks straight into
    // a printing sink with no `banked` node at all — a legitimate economy, and
    // one this floor must not invent a wallet for. The guard mirrors the sim's
    // own (`bankedKey`): no wallet, no demand.
    //
    // GENERATION-GATED BY CONSTRUCTION, not by an option. Both call sites sit
    // inside their pipeline's floors block, and no assembled-artifact path
    // reaches here — the sealed corpus carries no `meta.playSpine` at all, so
    // this floor cannot reach a fixture even in principle (measured: 0 of 22).
    var walletFed = parsedEdges.some(function (e) { return e.to.kind === 'banked'; });
    var printingWeeks = Number(index.weekCount) || 0;
    if (walletFed && printingWeeks > 0) {
      var paidWeeks = {};
      parsedEdges.forEach(function (e) {
        if (e.to.kind !== 'banked') return;
        var payWeek = surfaceRefWeek(e.from);
        if (payWeek !== null) paidWeeks[payWeek] = 1;
      });
      var unpaidWeeks = [];
      for (var pw = 1; pw <= printingWeeks; pw++) {
        if (!paidWeeks[pw]) unpaidWeeks.push(pw);
      }
      if (unpaidWeeks.length) {
        errors.push(S + 'playSpine.economyGraph banks value but declares no income edge for week'
          + (unpaidWeeks.length === 1 ? ' ' : 's ') + unpaidWeeks.join(', ')
          + ' — the wallet is fed only in week' + (Object.keys(paidWeeks).length === 1 ? ' ' : 's ')
          + (Object.keys(paidWeeks).sort(function (a, b) { return a - b; }).join(', ') || '(none)')
          + '. One representative edge cannot say which weeks pay, and every reader of this graph'
          + ' takes it literally: a week with no income edge is a week the player banks nothing.'
          + ' Add one edge per unfed week — `{ from: "reckoning:W' + unpaidWeeks[0]
          + '", to: "banked" }` and its like — or, if those weeks genuinely pay nothing, that is a'
          + ' book where the pencil stops earning and the spine should say so somewhere else');
      }
    }
  }

  // ── Floor 3: consequence edges resolve, and the echo has a clock ──
  var consequences = Array.isArray(spine.consequenceEdges) ? spine.consequenceEdges : [];
  if (!consequences.length) {
    errors.push(S + 'playSpine.consequenceEdges is empty — every fillable thing names the surface that answers it,'
      + ' or the book is a set of things to fill in with nothing listening');
  }
  consequences.forEach(function (edge, ci) {
    ['source', 'answeredBy'].forEach(function (side) {
      var res = surfaceRefResolves(index, (edge || {})[side]);
      if (!res.ok) {
        errors.push(S + 'playSpine.consequenceEdges[' + ci + '].' + side + ' "'
          + String((edge || {})[side] || '') + '" ' + res.reason);
      }
    });
    var within = (edge || {}).withinWeeks;
    if (within !== undefined && (!Number.isInteger(within) || within < 0 || within > SPINE_BUDGETS.consequenceWithinWeeksMax)) {
      errors.push(S + 'playSpine.consequenceEdges[' + ci + '].withinWeeks is ' + within
        + ' — an echo answers within 0-' + SPINE_BUDGETS.consequenceWithinWeeksMax
        + ' weeks; further out is a coincidence the player has stopped waiting for');
    }
  });

  // ── Floor 4: keys before locks ──
  // Every consequence whose source and answer both name a week must run
  // forward: an answer that lands before its question is content the player
  // meets in the wrong order, and a key that arrives after its lock is content
  // they can never reach at all.
  consequences.forEach(function (edge, ci) {
    var src = parseSurfaceRef((edge || {}).source);
    var ans = parseSurfaceRef((edge || {}).answeredBy);
    if (!src.valid || !ans.valid) return;
    var sw = surfaceRefWeek(src);
    var aw = surfaceRefWeek(ans);
    if (sw === null || aw === null) return;
    if (aw < sw) {
      errors.push(S + 'playSpine.consequenceEdges[' + ci + ']: "' + ans.raw + '" answers "' + src.raw
        + '" in an EARLIER week — the answer is printed before the question is asked');
    }
    var within = Number.isInteger((edge || {}).withinWeeks)
      ? edge.withinWeeks : SPINE_BUDGETS.consequenceWithinWeeksDefault;
    if (aw - sw > within) {
      errors.push(S + 'playSpine.consequenceEdges[' + ci + ']: "' + ans.raw + '" answers "' + src.raw
        + '" ' + (aw - sw) + ' weeks later but declares withinWeeks ' + within
        + ' — either move the answer or declare the wait honestly');
    }
  });

  // Locks: an edge INTO a seal must be fed by something the player can hold
  // strictly before the sealed week.
  edges.forEach(function (edge, ei) {
    var to = parseSurfaceRef((edge || {}).to);
    if (!to.valid || to.kind !== 'seal') return;
    var from = parseSurfaceRef((edge || {}).from);
    if (!from.valid) return;
    var lockWeek = surfaceRefWeek(to);
    var keyWeek = surfaceRefWeek(from);
    if (lockWeek === null || keyWeek === null) return;
    if (keyWeek >= lockWeek) {
      errors.push(S + 'playSpine.economyGraph[' + ei + ']: the key "' + from.raw + '" is not held before the lock "'
        + to.raw + '" — a seal whose key arrives with it or after it is gated content nobody can open');
    }
  });

  // ── Floor 5: the tension budget names at least one axis per week ──
  var budget = Array.isArray(spine.tensionBudget) ? spine.tensionBudget : [];
  var plannedWeeks = Object.keys(index.weeks).map(Number).sort(function (a, b) { return a - b; });
  var budgetByWeek = {};
  budget.forEach(function (row) {
    if (row && Number.isInteger(row.week)) budgetByWeek[row.week] = row;
  });
  plannedWeeks.forEach(function (n) {
    var row = budgetByWeek[n];
    if (!row) {
      errors.push(S + 'playSpine.tensionBudget has no row for week ' + n
        + ' — every week declares what is scarce, what can be lost, or where the player can fall behind');
      return;
    }
    var named = ['scarce', 'losable', 'fallBehind'].filter(function (axis) {
      return String(row[axis] || '').trim();
    });
    // ── THE DELOAD IS THE EXHALE, NEVER FILLER (FUSION's seam law) ─────────
    // This floor demanded an axis on EVERY planned week, which made a deload
    // week owe a tension it is defined by not having. The model's only legal
    // moves were to invent a scarcity the training does not create, or to be
    // blocked — and the first is worse, because a fabricated axis on a deload
    // is the book telling the player to feel pressure in the week the program
    // deliberately removed it.
    //
    // The exemption is NARROW and it is EVIDENCE-GATED: only a week the ONE
    // deload derivation marks (derivePlannedWeekShapes, D166) may declare all
    // three axes absent, and it must do so by declaring the row — a missing
    // row still blocks above, on every week. On any other week this is byte
    // for byte the floor it always was.
    if (!named.length && !deloadWeeks[n]) {
      errors.push(S + 'playSpine.tensionBudget week ' + n
        + ' names no axis — at least one of scarce / losable / fallBehind must be real (an absent axis is a declaration'
        + ' that it is not present; all three absent is a week with no tension at all).'
        + ' Only a planned DELOAD week may declare all three absent: there the emptiness IS'
        + ' the exhale, and week ' + n + ' is not one');
    }
  });

  errors.push.apply(errors, collectSpineHarvestFloorErrors(spine, index, parsedEdges, S));

  return errors;
}

// ════════════════════════════════════════════════════════════════════════════
// THE HARVEST FLOORS (W5a — the Ludic Harvest, tranche 1)
// ════════════════════════════════════════════════════════════════════════════
// Nine tier-2 patterns from contracts/ludic-library.mjs landed a declaration
// surface in W5a. These are their teeth. Split into its own function purely for
// size — it runs inside the skeleton floors, at the same stage, against the
// same index, and shares their severity: BLOCKING on the generation path,
// silent on any book that carries no spine.
//
// THE SEVERITY SPLIT, stated once: `gateStructure` is DEMANDED (the structured
// stage literal requires it and the prompt calls it required), because it costs
// the model one enum and buys the floors a shape to check the whole graph
// against. The other three declarations are OPTIONAL-BUT-STRICT: a book need
// not carry a hint ladder, but a book that carries one owes ordered rungs, real
// costs, and a printed page the player can find. Demanding all four would tax
// every book for patterns most briefs do not want, which is how a menu becomes
// a checklist.

// A "lead" for gate-structure purposes: a puzzle surface the player works at.
// Deliberately NOT every node — `banked`, `reckoning:` and `week:` are plumbing,
// and counting them would let a book satisfy "open" with bookkeeping.
var SPINE_LEAD_KINDS = { cipher: 1, map: 1, oracle: 1, fragment: 1, seal: 1, companion: 1, clock: 1 };

/**
 * measureSpineGraphShape(parsedEdges) -> { chain, convergence, leads }
 *
 * The three numbers GATE_STRUCTURE_SHAPES is written in. Computed by
 * relaxation with a pass cap rather than by path enumeration: a spine graph can
 * legitimately contain a cycle (a stewardship economy that pays back into its
 * own source is the named example in PLAY.md §2), and a longest-simple-path
 * search would either hang on one or need a visited-set walk whose cost is
 * exponential. Saturating at |V| is the right answer for a cycle anyway — a
 * loop IS a chain at least that long.
 */
/**
 * isWeeklyConversionEdge(from, to) -> boolean
 *
 * THE BOOK'S METRONOME, named once (R1, 2026-08-17).
 *
 * `reckoning:Wn → banked` is the weekly conversion: the player's ticked marks
 * becoming the book's currency. Since the declaration-literal income law (Floor
 * 2b) every printing week declares one, so it is now the single most common
 * edge in any spine — and it is the one edge that carries no design
 * information at all. It gates nothing (it is the panel doing its job), it
 * decides nothing (it happens whether the player wants it or not), and it
 * converges nothing (six copies of one conversion are one lane drawn six
 * times).
 *
 * THREE FLOORS ASK A QUESTION THIS EDGE ANSWERS FALSELY, and before the income
 * law each of them was wrong about exactly one edge per book, which is invisible:
 *   · Floor 8's convergence — every wallet takes weekCount feeders;
 *   · Floor 11a's threshold walk — the boss week's conversion makes the whole
 *     economy formally "behind" the threshold;
 *   · sim-player.js H7 and its decision-density count — same two mistakes on
 *     the assembled book.
 * One predicate, so a future floor asking a fourth question inherits the answer
 * rather than rediscovering it. sim-player.js mirrors this deliberately rather
 * than importing it, for the same reason SIM_SOURCE_KINDS mirrors
 * SPINE_SOURCE_KINDS: the sim walks printed books and must not pull a grammar
 * validator in behind it.
 */
function isWeeklyConversionEdge(from, to) {
  return !!(from && to && from.kind === 'reckoning' && to.kind === 'banked');
}

export function measureSpineGraphShape(parsedEdges) {
  var edges = Array.isArray(parsedEdges) ? parsedEdges : [];
  var key = function (side) { return side.kind + ':' + side.id; };
  var nodes = {};
  var feeders = {};
  var out = {};
  edges.forEach(function (e) {
    var a = key(e.from), b = key(e.to);
    nodes[a] = e.from; nodes[b] = e.to;
    // CONVERGENCE IS LANES MEETING, NOT THE METRONOME TICKING (R1 rider).
    // Under the income law a spine declares `reckoning:Wn → banked` for every
    // printing week, so the wallet takes weekCount distinct feeders in every
    // lawful book — and `minConvergence` for path-based is 2. Counted naively,
    // the convergence half of Floor 8 could never fail again on any book with a
    // wallet and two weeks: the gate-structure floor would grade one shape and
    // approve all three. Six copies of one weekly conversion arriving at the
    // wallet is ONE lane drawn six times, which is precisely what "two or more
    // lanes that converge" is not.
    //
    // Excluded from the FEEDER map only. The chain through the wallet is real
    // work — earn, convert, bank, spend, finish — so these edges keep their
    // place in the depth relaxation above and `chain` is unchanged.
    if (!isWeeklyConversionEdge(e.from, e.to)) {
      if (!feeders[b]) feeders[b] = {};
      feeders[b][a] = 1;
    }
    if (!out[a]) out[a] = {};
    out[a][b] = 1;
  });
  var nodeKeys = Object.keys(nodes);
  if (!nodeKeys.length) return { chain: 0, convergence: 0, leads: 0 };

  var depth = {};
  nodeKeys.forEach(function (k) { depth[k] = SPINE_SOURCE_KINDS[nodes[k].kind] ? 0 : -1; });
  // A graph with no declared source still has a chain; seed the nodes nothing
  // feeds so the measurement is about SHAPE and the missing source is reported
  // by its own floor rather than swallowed here.
  if (!nodeKeys.some(function (k) { return depth[k] === 0; })) {
    nodeKeys.forEach(function (k) { if (!feeders[k]) depth[k] = 0; });
  }
  var cap = nodeKeys.length;
  for (var pass = 0; pass < cap; pass++) {
    var moved = false;
    edges.forEach(function (e) {
      var a = key(e.from), b = key(e.to);
      if (depth[a] < 0) return;
      var next = Math.min(depth[a] + 1, cap);
      if (next > depth[b]) { depth[b] = next; moved = true; }
    });
    if (!moved) break;
  }

  var chain = 0;
  nodeKeys.forEach(function (k) { if (depth[k] > chain) chain = depth[k]; });
  var convergence = 0;
  Object.keys(feeders).forEach(function (k) {
    var count = Object.keys(feeders[k]).length;
    if (count > convergence) convergence = count;
  });
  var leads = nodeKeys.filter(function (k) {
    return SPINE_LEAD_KINDS[nodes[k].kind] && depth[k] >= 0;
  }).length;
  return { chain: chain, convergence: convergence, leads: leads };
}

/**
 * collectHarvestAdoptionFindings(booklet) -> string[]
 *
 * DECLARED IS BUILT, the arm that needs weeks (D144).
 *
 * `book-referential-examination` is the harvest pattern that replaced the
 * real-world-trivia ban with something checkable: a puzzle only a player who
 * has actually read THIS artifact can solve. Its machine trace is a cipher
 * pointing at the book's own surfaces — `cipher.body.referenceTargets`, which
 * the week validator already resolves against the fragment registry.
 *
 * WHY NOT AT THE COMPILER GATE, where the rest of the harvest floor lives: the
 * shell stage has no weeks at all, and the skeleton's weekPlan carries a
 * `cipherType` string and no cipher body. Checking here would be checking
 * nothing, and a floor that cannot see its evidence reports a pass — which is
 * the Hollow Success shape this repo has paid for twice.
 *
 * Severity is the caller's (D19): blocking under generationFloors, advisory on
 * the corpus, because a hand-authored fixture that declares a pattern is
 * stating an intention rather than failing a gate.
 */
export function collectHarvestAdoptionFindings(booklet) {
  var findings = [];
  var spine = ((booklet || {}).meta || {}).playSpine;
  var declared = (spine && Array.isArray(spine.harvestPatterns)) ? spine.harvestPatterns : [];
  if (!declared.length) return findings;   // not declaring is legal (W5a)

  var wants = {};
  declared.forEach(function (raw) { wants[String(raw || '').trim()] = 1; });

  if (wants['book-referential-examination']) {
    var weeks = Array.isArray((booklet || {}).weeks) ? booklet.weeks : [];
    var carriers = weeks.filter(function (week) {
      var targets = ((((week || {}).fieldOps || {}).cipher || {}).body || {}).referenceTargets;
      return Array.isArray(targets) && targets.filter(function (t) {
        return String(t || '').trim();
      }).length > 0;
    });
    if (!carriers.length) {
      findings.push('meta.playSpine.harvestPatterns declares "book-referential-examination" and no week\'s '
        + 'cipher.body.referenceTargets names anything — that pattern IS a puzzle whose inputs live '
        + 'elsewhere in this artifact, and the referenceTargets array is where a cipher says which pages. '
        + 'Point at least one week\'s cipher at the book\'s own surfaces, or drop the declaration');
    }
  }

  return findings;
}

function collectSpineHarvestFloorErrors(spine, index, parsedEdges, S) {
  var errors = [];
  var rawEdges = Array.isArray(spine.economyGraph) ? spine.economyGraph : [];
  var weekCount = index.weekCount || Object.keys(index.weeks).length || 0;

  // ── Floor 8: the gate structure is declared AND the graph has that shape ──
  // Nicholson's three organisations. The declaration alone would be a label;
  // reading it back off the graph is what makes it a floor — a book that says
  // "path-based" and wires one chain has told the player it has choices it does
  // not have.
  var structure = String(spine.gateStructure || '').trim();
  if (!structure) {
    errors.push(S + 'playSpine.gateStructure is missing — declare how this book gates: '
      + VALID_GATE_STRUCTURES.join(' | ')
      + ' (open = several leads feeding one meta; sequential = each answer is the next question;'
      + ' path-based = two or more lanes that converge)');
  } else if (VALID_GATE_STRUCTURES.indexOf(structure) === -1) {
    errors.push(S + 'playSpine.gateStructure "' + structure + '" is not one of '
      + VALID_GATE_STRUCTURES.join(' | '));
  } else if (parsedEdges.length) {
    var want = GATE_STRUCTURE_SHAPES[structure];
    var got = measureSpineGraphShape(parsedEdges);
    var shortfalls = [];
    if (got.chain < want.minChainLength) {
      shortfalls.push('its longest chain is ' + got.chain + ' edge' + (got.chain === 1 ? '' : 's')
        + ', not ' + want.minChainLength);
    }
    if (got.convergence < want.minConvergence) {
      shortfalls.push('no surface takes ' + want.minConvergence + ' distinct feeders (the most is '
        + got.convergence + ')');
    }
    if (got.leads < want.minLeads) {
      shortfalls.push('it runs ' + got.leads + ' lead' + (got.leads === 1 ? '' : 's')
        + ', not ' + want.minLeads);
    }
    if (shortfalls.length) {
      errors.push(S + 'playSpine.gateStructure declares "' + structure
        + '" but the economyGraph is not that shape: ' + shortfalls.join('; ')
        + '. Either wire the structure you declared or declare the one you wired');
    }
  }

  // ── Floor 9: branch attribution is a real side of a real door ────────────
  rawEdges.forEach(function (edge, ei) {
    var branch = (edge || {}).branch;
    if (branch === undefined || branch === null || String(branch).trim() === '') return;
    var parsed = parseBranchRef(branch);
    if (!parsed.valid) {
      errors.push(S + 'playSpine.economyGraph[' + ei + '].branch "' + String(branch)
        + '" is not a branch ref — write `door:W3/' + BRANCH_OPTIONS[0] + '` or `door:W3/'
        + BRANCH_OPTIONS[1] + '`, naming the door and the side of it this edge belongs to');
      return;
    }
    var res = surfaceRefResolves(index, parsed.doorRef);
    if (!res.ok) {
      errors.push(S + 'playSpine.economyGraph[' + ei + '].branch names "' + parsed.doorRef
        + '", which ' + res.reason);
    }
    // An attributed edge whose `from` is that same door is the normal shape,
    // but attribution is legal on any edge the branch turns on. What is NOT
    // legal is attributing an edge to a door while ALSO sourcing it from a
    // different door: two forks cannot both own one edge, and the sim would
    // have to pick.
    var from = parseSurfaceRef((edge || {}).from);
    if (from.valid && from.kind === 'door'
      && ('door:' + from.id).toLowerCase() !== parsed.doorRef.toLowerCase()) {
      errors.push(S + 'playSpine.economyGraph[' + ei + '] leaves "' + from.raw
        + '" but is attributed to "' + parsed.doorRef
        + '" — one edge, two forks. Attribute it to the door it leaves, or source it from the door that owns it');
    }
  });

  // Both sides of every attributed door must carry something. A fork where the
  // spine names only side A is the flavour-only door wearing attribution: the
  // player who picks B gets an edge nobody declared.
  var branchSides = {};
  rawEdges.forEach(function (edge) {
    var parsed = parseBranchRef((edge || {}).branch);
    if (!parsed.valid) return;
    var doorKey = parsed.doorRef.toLowerCase();
    if (!branchSides[doorKey]) branchSides[doorKey] = {};
    branchSides[doorKey][parsed.option] = 1;
  });
  Object.keys(branchSides).forEach(function (doorKey) {
    var missing = BRANCH_OPTIONS.filter(function (opt) { return !branchSides[doorKey][opt]; });
    if (missing.length) {
      errors.push(S + 'playSpine.economyGraph attributes edges to "' + doorKey + '/'
        + BRANCH_OPTIONS.filter(function (o) { return missing.indexOf(o) === -1; }).join('')
        + '" only — side ' + missing.join(' and ') + ' of that fork carries no edge, so one branch'
        + ' is the declared side and the other is whatever is left. Give both sides an edge, or attribute neither');
    }
  });

  // ── Floor 9a: DECLARED IS BUILT — the harvest adoption floor (D144) ──────
  // W5a's ruling stands: a book that composes with none of these patterns is a
  // legitimate book, and NOT DECLARING remains legal. What was missing is the
  // other half. `meta.playSpine.harvestPatterns` lets a book say which patterns
  // it used, and a declaration nothing checks is strictly worse than silence —
  // it reads as evidence to the bench, the census and the author, and costs the
  // model one line to produce.
  //
  // WHAT IS CHECKABLE HERE is what the spine itself can prove. The seal arm is
  // spine-internal (an edge into a `seal:` either exists in the economyGraph or
  // does not), so it belongs at the compiler gate where a retry is cheap. The
  // `book-referential-examination` arm needs WEEKS, which do not exist at this
  // stage on either pipeline, so it lives on the assembled booklet — see
  // collectHarvestAdoptionFindings below. Splitting by observability rather
  // than putting both in one place is what keeps each arm from being vacuous at
  // the stage that runs it.
  var declaredPatterns = Array.isArray(spine.harvestPatterns) ? spine.harvestPatterns : [];
  var seenPatterns = {};
  declaredPatterns.forEach(function (raw, pi) {
    var id = String(raw || '').trim();
    if (!id || VALID_HARVEST_PATTERNS.indexOf(id) === -1) {
      errors.push(S + 'playSpine.harvestPatterns[' + pi + '] "' + id + '" is not a harvest pattern ('
        + VALID_HARVEST_PATTERNS.join(' | ') + ') — a misspelt id is silently unadoptable: nothing '
        + 'checks it, and the declaration then reads as evidence of a system this book does not have');
      return;
    }
    if (seenPatterns[id]) {
      errors.push(S + 'playSpine.harvestPatterns names "' + id + '" twice');
    }
    seenPatterns[id] = 1;
  });
  if (seenPatterns['found-not-found-gating']) {
    var gatesASeal = parsedEdges.some(function (e) { return e.to.kind === 'seal'; });
    if (!gatesASeal) {
      errors.push(S + 'playSpine.harvestPatterns declares "found-not-found-gating" and the economyGraph '
        + 'has no edge INTO a `seal:` — found/not-found gating IS that edge: something the player may or '
        + 'may not have found opens a page that is otherwise closed. Wire the key to the seal, or drop '
        + 'the declaration');
    }
  }

  // ── Floor 10: prices are in marks, and the endgame's gate is not for sale ─
  rawEdges.forEach(function (edge, ei) {
    var price = (edge || {}).price;
    if (price === undefined || price === null) return;
    if (!Number.isInteger(price) || price < 1) {
      errors.push(S + 'playSpine.economyGraph[' + ei + '].price is ' + price
        + ' — a price is a whole number of MARKS (the unit the markStrip counts and the'
        + ' reckoning threshold is derived in), at least 1');
      return;
    }
    var to = parseSurfaceRef((edge || {}).to);
    if (to.valid && (to.kind === 'boss' || to.kind === 'assembly')) {
      // D188 CORRECTED THIS SENTENCE'S REASONING, not its predicate. The old
      // text said the endgame "is gated by the DERIVED reckoning threshold and
      // by nothing else" — which taught the threshold as a LOCK twelve lines
      // from the floor (harvest-endgame-not-tollgate) that forbids it being
      // one. A model that believed this sentence built exactly the design the
      // neighbouring floor then refused, which is what killed three shell
      // attempts on the proving run.
      //
      // The ratified law (acceptance package item 4, 2026-08-17): the tally may
      // shape WHICH ending and what state you carry into it, never WHETHER the
      // seal opens or the ceremony happens. So the endgame edge is unpriceable
      // because it is a TARGET, not because a different number already gates it.
      errors.push(S + 'playSpine.economyGraph[' + ei + '] prices the edge into "' + to.raw
        + '" at ' + price + ' — the endgame is a TARGET the player aims at, never a lock they'
        + ' buy through. WHETHER the boss happens and the assembly completes is not for sale,'
        + ' and the derived reckoning threshold does not gate it either; it decides WHICH'
        + ' ending. Price the spends that LEAD to the endgame instead');
    }
    var from = parseSurfaceRef((edge || {}).from);
    if (from.valid && SPINE_SOURCE_KINDS[from.kind]) {
      errors.push(S + 'playSpine.economyGraph[' + ei + '] prices an edge OUT OF "' + from.raw
        + '" — the player\'s own work is not a purchase. Price the edge out of `banked`'
        + ' (or out of the reckoning that banks it), which is where value is held');
    }
  });

  // ── Floor 11: a window cannot close before it opens ──────────────────────
  rawEdges.forEach(function (edge, ei) {
    var closes = (edge || {}).closesAtWeek;
    if (closes === undefined || closes === null) return;
    if (!Number.isInteger(closes) || closes < 1) {
      errors.push(S + 'playSpine.economyGraph[' + ei + '].closesAtWeek is ' + closes
        + ' — the last week this affordance can be taken, as a whole week number');
      return;
    }
    if (weekCount && closes > weekCount) {
      errors.push(S + 'playSpine.economyGraph[' + ei + '].closesAtWeek is week ' + closes
        + ' and this book has ' + weekCount + ' weeks — a deadline past the last page is no deadline');
    }
    var to = parseSurfaceRef((edge || {}).to);
    var opensAt = to.valid ? surfaceRefWeek(to) : null;
    if (opensAt !== null && closes < opensAt) {
      errors.push(S + 'playSpine.economyGraph[' + ei + '] closes in week ' + closes
        + ' but "' + to.raw + '" is not drawn until week ' + opensAt
        + ' — the window shuts before it opens, which is content nobody can reach');
    }
  });

  // ── Floor 11a: the endgame is not routed THROUGH the boss reckoning ───────
  // THE PROMOTION (D170). The simulated player already catches this as H7
  // (`threshold-gated-endgame`) — but only after assembly, which is after every
  // week, fragment and ending has been paid for. The first completed book was
  // failed by it: `reckoning:W6 → boss` put the boss and both endings behind
  // the derived threshold, and a player at realistic adherence reaches the last
  // week to find the endgame was arithmetically closed.
  //
  // WHY THIS IS PROMOTABLE, and the whole argument is arithmetic that is
  // decided by two constants rather than by any one book:
  //   - the boss threshold is round(RECKONING_THRESHOLD_RATIO * attainable),
  //     with the ratio 0.75 (assembly.js);
  //   - the hard band the sim judges at is 0.6 (SIM_HARD_BAND, VISION §4.5),
  //     and it banks AT MOST 0.6 * attainable — adversarially, rather less.
  // 0.6 < 0.75 for every book, so the 60% band NEVER clears the threshold. The
  // sim's H7 therefore reduces to its structural half — "does the spine route
  // anything required through the boss reckoning" — and that half is a pure
  // reachability question over the DECLARED economyGraph. No ticks, no printed
  // weeks, no assembled book. The premise is asserted as its own harness row:
  // if the ratio ever drops below the band, this floor's justification dies and
  // that row goes red rather than this check going quietly wrong.
  //
  // NOT A DUPLICATE OF FLOOR 10. That floor forbids a PRICE on an edge into
  // boss/assembly — a second number for a gate that already has one. This book
  // priced nothing; it simply drew the edge. An unpriced edge into the endgame
  // out of the boss reckoning is the same soft-lock and sailed straight through.
  //
  // The threshold is a printed TARGET, never a lock (RECKONING_THRESHOLD_RATIO's
  // own doctrine: the economy may never own the six-week payoff). This floor is
  // that sentence, enforced.
  // THE CONVERSION EDGE IS NOT A GATE (R1 rider, 2026-08-17), and this rider is
  // load-bearing rather than tidy. Floor 2b now requires a generated spine that
  // owns a wallet to declare an income edge for EVERY printing week — including
  // the boss week, whose `reckoning:W{last} → banked` is the ordinary weekly
  // conversion. Walked naively, that single edge puts the wallet, and therefore
  // everything the wallet buys, "behind" the threshold in every lawful book:
  // this floor would block every spine the new law demands, at the shell gate,
  // before a word of prose was written.
  //
  // The finding's actual meaning is unchanged: content is behind the threshold
  // when the spine routes it through the boss reckoning by some route OTHER
  // than the ordinary conversion. So the walk refuses exactly one edge —
  // reckoning → banked — and traverses everything else, including every route
  // the measured defect took (`reckoning:W6 → boss`, and the transitive
  // `reckoning:W6 → cipher:W5 → assembly`). Both are still blocked, and their
  // rows still fire.
  //
  // ONE EXEMPTION, TWO READERS (D93): sim-player.js H7 refuses the same edge on
  // the assembled book. They must move together — a floor blocking a shape the
  // sim approves, or approving one the sim reports, is two answers to the same
  // question at two different prices.
  //
  // ══ THE WHETHER/WHICH SPLIT (the acceptance package's item 4, ratified
  // 2026-08-17), and this scoping is a CORRECTION of the floor as first written,
  // not a relaxation of it. The ratified line: "performance may shape WHICH
  // ending and what state you carry into it — never WHETHER the seal opens.
  // Completing the program earns the final piece of the story, no matter what."
  //
  // The first draft refused every SPINE_ENDGAME_KINDS node behind the threshold,
  // endings included, unconditionally — while its own error text said "anything
  // REQUIRED". An ending is not required; the ENDINGS are. Differentiated
  // outcomes are the standing watch's only legal home of global stakes, so a
  // threshold-gated ending beside a reachable one is exactly the differentiation
  // the book is supposed to have, and the unconditional refusal was forbidding
  // it. It killed a proving run three times over one such edge.
  //
  // So the endgame splits into two classes and they are checked differently:
  //   WHETHER-class — `boss`, `assembly`, `seal:` (the password path). These are
  //     "can this book be finished at all". NEVER behind the threshold, no
  //     exceptions, unchanged from the original floor.
  //   WHICH-class — `ending:`. Legal behind the threshold IFF at least one other
  //     ending is FED from outside the threshold's reach, so the player who
  //     banks under the number still turns a last page. All endings behind it
  //     blocks exactly as before.
  //
  // "FED FROM OUTSIDE" is the definition both readers implement, stated once: an
  // `ending:` is FREE when at least one edge into it starts at a node that is
  // neither the boss reckoning nor reachable from it. Deliberately a FEEDER test
  // rather than "not in the closure" — an ending with no feeder at all is not
  // free, it is unreachable, and letting it excuse a gated sibling would turn
  // two defects into a pass.
  if (parsedEdges.length && weekCount) {
    var bossReckoningKey = ('reckoning:w' + weekCount);
    var spineAdj = {};
    var endingFeeders = {};
    parsedEdges.forEach(function (e) {
      if (isWeeklyConversionEdge(e.from, e.to)) return;
      var a = (e.from.kind + ':' + e.from.id).toLowerCase();
      var b = (e.to.kind + ':' + e.to.id).toLowerCase();
      (spineAdj[a] || (spineAdj[a] = [])).push({ key: b, ref: e.to });
      if (e.to.kind === 'ending') (endingFeeders[b] || (endingFeeders[b] = [])).push(a);
    });
    var seenFromGate = {};
    var gatedWhether = [];
    var gatedEndings = [];
    var walk = [bossReckoningKey];
    while (walk.length) {
      var here = walk.pop();
      (spineAdj[here] || []).forEach(function (next) {
        if (seenFromGate[next.key]) return;
        seenFromGate[next.key] = 1;
        if (next.ref.kind === 'ending') gatedEndings.push(next.ref.raw);
        else if (SPINE_ENDGAME_KINDS[next.ref.kind]) gatedWhether.push(next.ref.raw);
        walk.push(next.key);
      });
    }
    var behindTheGate = function (key) {
      return key === bossReckoningKey || !!seenFromGate[key];
    };
    var freeEndings = Object.keys(endingFeeders).filter(function (k) {
      return endingFeeders[k].some(function (feeder) { return !behindTheGate(feeder); });
    });
    if (gatedWhether.length) {
      errors.push(S + 'playSpine.economyGraph routes ' + gatedWhether.join(', ')
        + ' through "reckoning:W' + weekCount + '" — the final week\'s reckoning is where the DERIVED'
        + ' threshold sits, and that number is a printed TARGET, not a lock. A player at the 60%'
        + ' adherence this book must survive banks well under it (the threshold is '
        + Math.round(RECKONING_THRESHOLD_RATIO * 100) + '% of the attainable ticks), so a boss, an'
        + ' assembly or a seal behind that reckoning is a book they cannot finish: they train the'
        + ' whole block, reach the last week, and the ceremony was closed since week one.'
        + ' Performance may shape WHICH ending they reach — never WHETHER the seal opens. Feed the'
        + ' ceremony from a surface the player\'s own work reaches directly — a cipher, an assembly,'
        + ' a seal keyed earlier — and let the threshold reward rather than gate');
    }
    if (gatedEndings.length && !freeEndings.length) {
      errors.push(S + 'playSpine.economyGraph routes EVERY ending (' + gatedEndings.join(', ')
        + ') through "reckoning:W' + weekCount + '" — a threshold-gated ending is legal, and it is'
        + ' this book\'s high bar; it may not be this book\'s only door. A player at the 60%'
        + ' adherence this book must survive banks well under the derived threshold (it is '
        + Math.round(RECKONING_THRESHOLD_RATIO * 100) + '% of the attainable ticks), so with every'
        + ' ending behind it they finish the program and the book has no last page for them.'
        + ' Completing the program earns the final piece of the story, no matter what. Feed at'
        + ' least one ending from a surface the player\'s own work reaches directly — a cipher, an'
        + ' assembly, a seal keyed earlier — and let the gated one be what a strong block buys');
    }
  }

  // ── Floor 12: hint ladders are ordered, costed, and printed somewhere ────
  var ladders = Array.isArray(spine.hintLadders) ? spine.hintLadders : [];
  ladders.forEach(function (ladder, li) {
    var where = S + 'playSpine.hintLadders[' + li + ']';
    ['puzzle', 'printedOn'].forEach(function (side) {
      var res = surfaceRefResolves(index, (ladder || {})[side]);
      if (!res.ok) {
        errors.push(where + '.' + side + ' "' + String((ladder || {})[side] || '') + '" ' + res.reason);
      }
    });
    // The ladder must hang on something the player can be STUCK on. A hint
    // ladder attached to `banked` is help with arithmetic.
    var puzzle = parseSurfaceRef((ladder || {}).puzzle);
    if (puzzle.valid && !SPINE_LEAD_KINDS[puzzle.kind]) {
      errors.push(where + '.puzzle names "' + puzzle.raw + '", which is not something a player can be stuck on.'
        + ' A hint ladder hangs on a cipher, a map, an oracle, a fragment, a seal, a clock or a companion');
    }
    // W5b: the band's own heading, and it is REQUIRED at generation (optional
    // in booklet-schema.mjs — the artifactIntent severity split). The band is a
    // printed surface now, and a printed surface with no authored heading gets
    // an engine-fixed English one, which is the house-aesthetic failure the
    // diegetic-UI law forbids outright. HAND-LOADED BOOKS ARE UNAFFECTED: the
    // atom falls back to naming the puzzle it serves.
    if (!String((ladder || {}).label || '').trim()) {
      errors.push(where + ' has no label — the rungs print as their own band now, and a band needs a'
        + ' heading in this world\'s voice. Not "Hints" and not "If you are stuck": those are the engine'
        + ' talking, and nothing printed in this book is the engine talking');
    }
    var rungs = Array.isArray((ladder || {}).rungs) ? ladder.rungs : [];
    if (rungs.length < SPINE_BUDGETS.hintRungsMin || rungs.length > SPINE_BUDGETS.hintRungsMax) {
      errors.push(where + '.rungs has ' + rungs.length + ' rung' + (rungs.length === 1 ? '' : 's')
        + ' — a ladder is ' + SPINE_BUDGETS.hintRungsMin + '-' + SPINE_BUDGETS.hintRungsMax
        + ' steps (a nudge, a method, and at most the answer). One rung is a hint, not a ladder');
    }
    rungs.forEach(function (rung, ri) {
      if (!String((rung || {}).cost || '').trim()) {
        errors.push(where + '.rungs[' + ri + '] has no cost — a free hint is a walkthrough.'
          + ' Name what taking it costs in this book\'s own terms (a clock tick, marks, a crossed-out option)');
      }
      if (!String((rung || {}).gives || '').trim()) {
        errors.push(where + '.rungs[' + ri + '] says nothing about what it gives');
      }
    });
  });
  if (ladders.length > SPINE_BUDGETS.hintLaddersMax) {
    errors.push(S + 'playSpine.hintLadders has ' + ladders.length + ' ladders; at most '
      + SPINE_BUDGETS.hintLaddersMax + ' — past that the book is a walkthrough with a receipt');
  }

  // ── Floor 13: a milestone unlocks something the book answers ─────────────
  var milestones = Array.isArray(spine.milestones) ? spine.milestones : [];
  var answered = {};
  (Array.isArray(spine.consequenceEdges) ? spine.consequenceEdges : []).forEach(function (edge) {
    var src = parseSurfaceRef((edge || {}).source);
    if (src.valid) answered[(src.kind + ':' + src.id).toLowerCase()] = 1;
    var ans = parseSurfaceRef((edge || {}).answeredBy);
    if (ans.valid) answered[(ans.kind + ':' + ans.id).toLowerCase()] = 1;
  });
  milestones.forEach(function (milestone, mi) {
    var where = S + 'playSpine.milestones[' + mi + ']';
    ['unlocks', 'printedOn'].forEach(function (side) {
      var res = surfaceRefResolves(index, (milestone || {})[side]);
      if (!res.ok) {
        errors.push(where + '.' + side + ' "' + String((milestone || {})[side] || '') + '" ' + res.reason);
      }
    });
    var at = (milestone || {}).at;
    if (!Number.isInteger(at) || at < 1) {
      errors.push(where + '.at is ' + at + ' — a milestone opens at a COUNT the player can check'
        + ' against their own page (marks banked, regions opened, fragments decoded)');
    }
    var unlocks = parseSurfaceRef((milestone || {}).unlocks);
    if (unlocks.valid && !answered[(unlocks.kind + ':' + unlocks.id).toLowerCase()]) {
      errors.push(where + ' unlocks "' + unlocks.raw + '" and no consequenceEdge mentions it —'
        + ' a theory the book never answers is an unpaid promise. Name the surface that responds to it');
    }
  });

  // ── Floor 14: legacy moves happen on a page ──────────────────────────────
  var legacy = Array.isArray(spine.legacyMoves) ? spine.legacyMoves : [];
  var seenMoves = {};
  legacy.forEach(function (row, ri) {
    var where = S + 'playSpine.legacyMoves[' + ri + ']';
    var move = String((row || {}).move || '').trim();
    if (VALID_LEGACY_MOVES.indexOf(move) === -1) {
      errors.push(where + '.move "' + move + '" is not a pencil legacy move ('
        + VALID_LEGACY_MOVES.join(' | ') + ') — anything needing a sticker, a seal or scissors'
        + ' is excluded by the pencil-only law, not missing from this list');
    } else if (seenMoves[move]) {
      errors.push(where + ' repeats "' + move + '" — declare each kind of permanence once,'
        + ' naming the page it happens on');
    } else {
      seenMoves[move] = 1;
    }
    var res = surfaceRefResolves(index, (row || {}).printedOn);
    if (!res.ok) {
      errors.push(where + '.printedOn "' + String((row || {}).printedOn || '') + '" ' + res.reason);
    }
  });

  return errors;
}

// ════════════════════════════════════════════════════════════════════════════
// REPAIR OWNERSHIP — which stage can actually fix a blocking error (D143)
// ════════════════════════════════════════════════════════════════════════════
// D128's law one level up: a retry must land on a prompt that can fix the
// defect. A week gate can fail on a defect whose material lives in the spine,
// and no number of week retries will ever mend it — M1 spent three attempts and
// a full rebuild proving that (evals/morning-books/ledger.json).
//
// OWNERSHIP IS DERIVED, NEVER TAGGED. Every cross-stage error in this file
// already opens with the owning stage's label — `Shell → `, `Skeleton → `,
// `Campaign Plan → ` — because D129 made that label a parameter for exactly
// this reason ("an error naming the wrong stage sends the retry to a prompt
// that can't fix it"). So the prefix IS the ownership declaration, and reading
// it back is the whole derivation. Hand-tagging every error string with an
// `ownedBy` field would be a second home for a fact the prefix already carries,
// and the two would drift the first time someone edited one (D93).
//
// An error with no stage prefix is owned by the stage that raised it. That is
// the honest default: a plain `Week 3 has no fusionBeat` is the week's own
// business, and inventing a route for it would be worse than not routing.
var REPAIR_STAGE_LABEL_KEYS = {
  'layer codex': 'layerBible',
  'story plan': 'campaignPlan',
  'campaign plan': 'campaignPlan',
  'skeleton': 'skeleton',
  'shell': 'shell',
  'booklet setup': 'shell',
  'world detail': 'knowing',
  'knowing': 'knowing',
  // D173. The rulebook stage's own floors carry this prefix, so a defect found
  // in the document itself routes back to the stage that wrote it. Parity
  // defects deliberately do NOT carry it: they are labelled with the spine seat,
  // because rules-first means the projection changes to serve the source.
  'game rulebook': 'gameRulebook',
  // The teaching audit (2026-08-20). REPAIR_STAGE_ORDER in api-generator.js
  // already ranks `economyGraph` and says why in so many words — "the cadence
  // floor blocks at the WEEK gate and names this stage's own declarations, so a
  // cadence defect found in week 4 must route BACKWARD" — and REPAIR_STAGE_NAMES
  // already carries its display name. This table was the missing third: no
  // prefix resolved to the stage, so the route that comment describes could
  // never be taken. `Economy Graph → ` is the prefix the stage's own gate writes
  // (validateEconomyGraphStage's `S`), so there is one label for the seat, not
  // two. Its own errors are unaffected — planRepairRoute refuses a same-stage
  // owner, which is the behaviour they already had when the prefix resolved to
  // nothing.
  'economy graph': 'economyGraph'
};

/**
 * repairOwnerForError(message) -> stageKey | ''
 *
 * The stage that owns the FIX for one blocking error, read off the stage-label
 * prefix the floors already write. Returns '' when the message carries no
 * recognised prefix — meaning "whoever raised this owns it", which is what the
 * existing retry ladder already assumes.
 *
 * Deliberately anchored (`^`) and bounded: this reads a prefix, never a
 * mention. `Week W2 renders clock "Shell → ..."` in the middle of a sentence is
 * content, not a routing instruction.
 */
export function repairOwnerForError(message) {
  var m = /^([A-Za-z][A-Za-z ]{0,18}?)\s*→\s/.exec(String(message || ''));
  if (!m) return '';
  return REPAIR_STAGE_LABEL_KEYS[m[1].trim().toLowerCase()] || '';
}

/**
 * weekOwesDoor({ isBoss, isDeload, mechanicGrammarFamily }) -> boolean
 *
 * THE SINGLE HOME for "does this week owe a printed doorChoice". Read by the
 * week gate (F4, which demands the door) and by the shell/skeleton pre-flight
 * below (which demands the LEDGER ROW for that door). One predicate, because
 * the two gates disagreeing about who owes a door is precisely the failure the
 * pre-flight exists to prevent: a plan blocked at the cheap gate for a door the
 * expensive gate would never have asked for, or waved through for one it will.
 *
 * Every input is a PLANNING fact — the family is declared in artifactIntent,
 * the boss week is the last week, and the deload flag comes from the plan or
 * the program's own text. None of it needs a written week, which is what makes
 * the promotion legal at all.
 */
export function weekOwesDoor(shape) {
  var s = shape || {};
  if (s.isBoss || s.isBossWeek) return false;
  if (s.isDeload) return false;
  return isDoorLeaningFamily(s.mechanicGrammarFamily);
}

/**
 * deriveWeekIdentityGiven(expectedOptions, isBoss) -> object | null
 *
 * THE WEEK GATE'S OWN OPTIONS, READ BACK AS PROMPT GIVENS (D173).
 *
 * THE MEASURED DEFECT (the runtime-surface audit, 2026-08-17). Two blocking
 * week floors read planning values the week prompt printed ZERO times:
 *
 *   - F4 (`weekOwesDoor`, above) blocks a doorless week when the booklet's
 *     `mechanicGrammarFamily` is one of the eight pressure families. The
 *     doctrine states that demand as a CONDITIONAL — "if this booklet's
 *     mechanicGrammarFamily is heat, attrition, …" — over a value the week
 *     prompt never showed. The model was asked to read a conditional and
 *     supply its own antecedent.
 *   - the citation-pinpoint floor (D170) blocks a `citeRef.citedAs` filed in
 *     another shell's grammar, keyed to `artifactIdentity.shellFamily`. The
 *     doctrine prints an EIGHT-ROW table of grammars and neither week builder
 *     printed the key that selects the row.
 *
 * Neither is a capability question at any model tier: the antecedent was not in
 * the prompt. Both values were already computed at the call site and handed to
 * the gate alone — D166's and D170's shape exactly, funded teaching pointed at
 * the wrong seat.
 *
 * WHY IT TAKES THE GATE'S OPTIONS OBJECT rather than a shell or a skeleton.
 * `validateWeekSchema(week, isBoss, options)` and this function read ONE object,
 * so the values the prompt teaches cannot drift from the values the gate reads —
 * not because two derivations agree today, but because there is only one. A
 * caller that adds a field to the gate's row adds it here for free; a caller
 * that reads the shell twice would be D93's two-algorithms defect wearing a
 * helpful face (the same warning `formatPlannedDoorGivensBlock` carries).
 *
 * `owesDoor` is `weekOwesDoor`'s own answer, never a re-reading of the family
 * against a second membership list. `citationLabels` come from
 * `resolveCitationStyle` — the table `citationPinpoints` matches against — so
 * the labels offered and the labels accepted are the same four strings.
 *
 * Returns null when the gate holds neither value, so a caller with no compiler
 * context builds the prompt it always built, byte for byte — and each floor is
 * silent under exactly the condition that drops its half of the block.
 *
 * Consumers: api-generator.js (both week loops) → formatWeekIdentityGivenBlock.
 */
export function deriveWeekIdentityGiven(expectedOptions, isBoss) {
  var o = expectedOptions || {};
  var family = String(o.mechanicGrammarFamily || '').trim();
  var shellFamily = String(o.shellFamily || '').trim();
  if (!family && !shellFamily) return null;
  var given = {};
  if (family) {
    given.mechanicGrammarFamily = family;
    given.owesDoor = weekOwesDoor({
      isBoss: isBoss,
      isDeload: o.isDeload,
      mechanicGrammarFamily: family
    });
    // WHICH exemption, when there is one. "This week owes no door" is true of a
    // deload week in a pressure family and of every week of a reconstruction
    // book, and those are different sentences to a writer: one is a local
    // exemption, the other is what the book is made of.
    given.doorExemption = isBoss ? 'boss' : (o.isDeload ? 'deload' : '');
  }
  if (shellFamily) {
    given.shellFamily = shellFamily;
    given.citationLabels = resolveCitationStyle(shellFamily).labelVocabulary.slice();
  }
  return given;
}

/**
 * collectSpinePreflightFloorErrors(spine, plannedWeeks, family, stageLabel)
 *   -> string[]
 *
 * THE EARLIEST-STAGE PRE-FLIGHT (D143). The static half of the doors-differ
 * floor, promoted from the week gate to the gate that authors the spine.
 *
 * The founding case, measured rather than argued: M1 (lighthouse-4w) declared
 * `mechanicGrammarFamily: "stewardship"` — a door-leaning family — over four
 * weeks, and a decisionLedger carrying exactly one row, `door:W2`. Weeks 1 and
 * 3 therefore owed a door the ledger could not describe, and that was true the
 * instant the shell was written. It cost three attempts and a full rebuild to
 * find out, because the only gate that could see it ran after every expensive
 * prose stage. This is a pure cross-check with zero model calls: the plan knows
 * its door weeks, the spine knows its ledger rows.
 *
 * WHAT IS NOT PROMOTED, and why (the sweep's honest half):
 *   - Floor 7, no mute source. NOTHING in any planning artifact schedules a
 *     week's gameplayClocks — not the campaign plan's week items, not the
 *     skeleton's weekPlan. The clocks are authored with the week, so the
 *     contradiction is genuinely unknowable here and a pre-flight would be
 *     asserting against an empty set.
 *   - The fusionBeat floor. `beat` and `marking` are authored per week; no plan
 *     declares them either.
 * Both stay at the week gate as the render-truth backstop, which is also where
 * a VOLUNTARY door lands: a week that prints a doorChoice it was never required
 * to print cannot be predicted from the plan, and this pre-flight deliberately
 * does not pretend otherwise.
 *
 * FORM. The pre-flight can only match the `door:W<n>` REF form, because at plan
 * time the door has no prose label to match against. That is one form stricter
 * than the week gate, which also accepts a label match — and it is exactly as
 * strict as the DOCTRINE: SCHEMA_PLAY_SPINE in prompt_rules.js says "One row
 * per door, `fork` written as `door:W3`". So a spine that followed its own
 * prompt passes, the week gate is simply laxer than what was asked for, and a
 * spine that did not costs one retry at the cheapest gate carrying the remedy
 * verbatim. Checked before ruling, because a pre-flight stricter than the
 * doctrine would block books the prompt never mis-taught.
 */
export function collectSpinePreflightFloorErrors(spine, plan, stageLabel) {
  var errors = [];
  if (!spine || typeof spine !== 'object') return errors;  // absence is the arity floor's business
  var p = plan || {};
  var weeks = Array.isArray(p.weeks) ? p.weeks : [];
  var family = p.mechanicGrammarFamily || '';
  if (!weeks.length) return errors;                        // no plan ⇒ nothing knowable ⇒ no floor
  var S = (stageLabel || 'Skeleton') + ' → ';

  var ledger = Array.isArray(spine.decisionLedger) ? spine.decisionLedger : [];
  var coveredDoorWeeks = {};
  ledger.forEach(function (row) {
    var parsed = parseSurfaceRef((row || {}).fork);
    if (!parsed.valid || parsed.kind !== 'door') return;
    var n = surfaceRefWeek(parsed);
    if (n !== null) coveredDoorWeeks[n] = row;
  });

  var owed = [];
  weeks.forEach(function (shape) {
    if (!weekOwesDoor(Object.assign({ mechanicGrammarFamily: family }, shape || {}))) return;
    var n = Number((shape || {}).weekNumber);
    if (!Number.isFinite(n) || n < 1) return;
    owed.push(n);
  });

  var uncovered = owed.filter(function (n) { return !coveredDoorWeeks[n]; });
  if (uncovered.length) {
    errors.push(S + 'playSpine.decisionLedger has no row for the door'
      + (uncovered.length === 1 ? '' : 's') + ' week' + (uncovered.length === 1 ? ' ' : 's ')
      + uncovered.map(function (n) { return 'W' + n; }).join(', ')
      + ' will print — the "' + String(family || '') + '" grammar prices a decision every non-deload week,'
      + ' so ' + (uncovered.length === 1 ? 'that week owes a row naming the fork as `door:W'
        + uncovered[0] + '`' : 'each owes a row naming the fork as `door:W<n>`')
      + ' and saying what mechanically differs across it. A door the ledger cannot describe is'
      + ' flavour-only by definition');
  }

  // The same promotion applied to floor 4's other half. `keys before locks`
  // already runs here, but only for refs whose id is week-shaped: `seal:F.07`
  // names a FRAGMENT, so surfaceRefWeek returned null and the check skipped it
  // silently. The plan schedules every fragment to a week (fragmentRegistry[]
  // .weekRef), so the seal's week IS knowable — the ordering was checkable all
  // along through one more lookup.
  var fragmentWeeks = {};
  (Array.isArray(p.fragmentRegistry) ? p.fragmentRegistry : []).forEach(function (entry) {
    // `weekRef` is authored as 'W3' or '3' depending on the pipeline's plan
    // schema; both name the same week and neither is worth a migration.
    var m = /(\d+)/.exec(String((entry || {}).weekRef || ''));
    var key = toSlugWords((entry || {}).id);
    if (m && key) fragmentWeeks[key] = parseInt(m[1], 10);
  });
  if (Object.keys(fragmentWeeks).length) {
    (Array.isArray(spine.economyGraph) ? spine.economyGraph : []).forEach(function (edge, ei) {
      var to = parseSurfaceRef((edge || {}).to);
      if (!to.valid || to.kind !== 'seal') return;
      if (surfaceRefWeek(to) !== null) return;             // week-shaped: floor 4 already holds it
      var lockWeek = fragmentWeeks[toSlugWords(to.id)];
      if (lockWeek === undefined) return;
      var from = parseSurfaceRef((edge || {}).from);
      if (!from.valid) return;
      var keyWeek = surfaceRefWeek(from);
      if (keyWeek === null) keyWeek = fragmentWeeks[toSlugWords(from.id)];
      if (keyWeek === undefined || keyWeek === null) return;
      if (keyWeek >= lockWeek) {
        errors.push(S + 'playSpine.economyGraph[' + ei + ']: the key "' + from.raw
          + '" is held in week ' + keyWeek + ' but the lock "' + to.raw + '" is printed in week '
          + lockWeek + ' (the plan schedules that fragment there) — a seal whose key arrives with it'
          + ' or after it is gated content nobody can open');
      }
    });
  }

  return errors;
}

/**
 * collectSpineWeekFloorErrors(weekObj, spine, weekNumber, spineStageLabel) -> string[]
 *
 * The two floors that can only be checked as each week lands, because the door
 * and the clocks are authored in the week chunk while the spine was declared
 * back at the skeleton.
 *
 * Every error here is owned by the SPINE-AUTHORING stage, not by the week: each
 * one's stated remedy is a decisionLedger row, a differsBy rewrite or an
 * economyGraph edge, and none of those exist in a week chunk. So each carries
 * that stage's label as its prefix — the same idiom the skeleton floors use,
 * and what `repairOwnerForError` reads to route the repair. The label is a
 * parameter for D129's reason: the compiler seat is `shell` on the multi-stage
 * pipeline and `skeleton` on S+F, and an error naming the wrong one sends the
 * repair to a prompt that cannot fix it. A caller that omits it gets the
 * unprefixed message and no routing — floors never invent their own context.
 */
export function collectSpineWeekFloorErrors(weekObj, spine, weekNumber, spineStageLabel) {
  var errors = [];
  if (!spine || typeof spine !== 'object') return errors;   // absent spine is the skeleton's floor, not this one's
  var week = weekObj || {};
  var label = 'W' + (weekNumber || week.weekNumber || '?');
  var S = String(spineStageLabel || '').trim() ? (String(spineStageLabel).trim() + ' → ') : '';

  // ── Floor 6: doors differ on a named mechanical surface ──
  // "A door the ledger cannot describe is flavor-only by definition." The check
  // is deliberately two-part: the ROW must exist, and its differsBy must name
  // something mechanical rather than an adjective — because "the harder road"
  // and "the safer road" is exactly the fork that passes a presence check and
  // changes nothing on the page.
  if (week.doorChoice) {
    var ledger = Array.isArray(spine.decisionLedger) ? spine.decisionLedger : [];
    var doorLabel = String(week.doorChoice.label || week.doorChoice.prompt || '').trim();
    var row = null;
    for (var li = 0; li < ledger.length; li++) {
      var fork = String((ledger[li] || {}).fork || '').trim();
      if (!fork) continue;
      var parsed = parseSurfaceRef(fork);
      var matchesRef = parsed.valid && parsed.kind === 'door'
        && String(parsed.id || '').replace(/\s+/g, '').toLowerCase() === label.toLowerCase();
      var matchesLabel = doorLabel && toSlugWords(fork) === toSlugWords(doorLabel);
      if (matchesRef || matchesLabel) { row = ledger[li]; break; }
    }
    if (!row) {
      errors.push(S + 'Week ' + label + ' prints a doorChoice with no playSpine.decisionLedger row —'
        + ' name the fork as `door:' + label + '` and say what mechanically differs across it,'
        + ' or the door is flavour-only by definition');
    } else if (!namesMechanicalSurface(row.differsBy)) {
      errors.push(S + 'Week ' + label + ' decisionLedger row differsBy "' + String(row.differsBy || '')
        + '" names no mechanical surface — a fork whose branches read differently but PLAY identically'
        + ' is the flavour-only door. Name the clock, track, price, region, cipher or gate that changes');
    }
  }

  // ── Floor 7: no mute source ──
  // Every clock this week renders is read by an edge, or declared ambient. The
  // escape hatch is real and deliberate: a clock that exists purely as world
  // texture is a legitimate choice, but it has to be a DECLARED one.
  var clocks = Array.isArray(week.gameplayClocks) ? week.gameplayClocks : [];
  if (clocks.length) {
    var readNames = {};
    function noteRead(ref) {
      var parsed = parseSurfaceRef(ref);
      if (parsed.valid && parsed.kind === 'clock') readNames[toSlugWords(parsed.id)] = 1;
    }
    (Array.isArray(spine.economyGraph) ? spine.economyGraph : []).forEach(function (edge) {
      noteRead((edge || {}).from); noteRead((edge || {}).to);
    });
    (Array.isArray(spine.consequenceEdges) ? spine.consequenceEdges : []).forEach(function (edge) {
      noteRead((edge || {}).source); noteRead((edge || {}).answeredBy);
    });
    var ambient = ' ' + (Array.isArray(spine.honestGaps) ? spine.honestGaps : [])
      .concat((Array.isArray(spine.composition) ? spine.composition : []).map(function (c) { return (c || {}).role; }))
      .map(function (t) { return toSlugWords(t); }).join(' ') + ' ';
    clocks.forEach(function (clock) {
      var name = String((clock || {}).clockName || '').trim();
      if (!name) return;
      var slug = toSlugWords(name);
      if (readNames[slug]) return;
      if (slug && ambient.indexOf(slug) !== -1) return;
      errors.push(S + 'Week ' + label + ' renders clock "' + name + '" that no playSpine edge reads —'
        + ' a mute source. Point an edge at `clock:' + name + '`, or declare it ambient by naming it in a'
        + ' composition role or honestGaps');
    });
  }

  return errors;
}

// Singular/plural tolerance for the one-currency check. Deliberately crude: it
// is looking for a NOUN the panel prints, not parsing English.
function singularizeToken(word) {
  if (/(?:ses|xes|zes|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && /s$/.test(word) && !/ss$/.test(word)) return word.slice(0, -1);
  return word;
}

// THE STOPLIST (W3 corrective wave, F04). A near-miss is only evidence if the
// word that hit is DISTINCTIVE — a word that could only have come from this
// currency's name. Function words cannot: a label like "The Iron Marks" would
// otherwise register a near-miss on any sentence in English containing "the",
// which would make the WARN class vacuous and the ERROR class empty. So a
// modifier counts only when it is outside this list AND at least three
// characters long. THREE, not four: "Ash", "Ink", "Oak", "Tin" are plausible
// distinctive modifiers on a currency label, while two-letter words are
// function words and the ones a label could plausibly carry are listed here.
// The head noun is exempt — it is matched separately and is the currency's
// name by construction.
var CURRENCY_MODIFIER_STOPLIST = [
  'the', 'a', 'an', 'and', 'or', 'of', 'for', 'in', 'on', 'to', 'at', 'by',
  'with', 'from', 'per', 'each', 'every', 'one', 'two', 'this', 'that'
];
var CURRENCY_MODIFIER_MIN_LENGTH = 3;

function haystackHas(haystack, candidate) {
  var stem = singularizeToken(candidate);
  return haystack.indexOf(' ' + candidate + ' ') !== -1
    || haystack.indexOf(' ' + stem + ' ') !== -1
    || haystack.indexOf(' ' + stem + 's ') !== -1
    || haystack.indexOf(' ' + stem + 'es ') !== -1;
}

/**
 * How does this conversion sentence name the booklet's declared currency?
 * Returns 'named' | 'modifier' | 'absent'.
 *
 * HEURISTIC, and stated as one: full label first, then its head noun, each
 * matched with singular/plural tolerance. It exists to catch the real failure —
 * week 1 banking "Embers" while week 4 banks "Tokens", two income currencies
 * where the amended one-per-markStrip law allows one — not to grade prose.
 *
 * THE SPLIT (W3 corrective wave, F04). The rule failed 17 of 18 weeks across
 * three pipeline books, and TWO DIFFERENT DEFECTS wore one message. A2 declared
 * "Chalk Signatures" and wrote "a further chalk mark on the ground already
 * claimed" — the right currency, named by its modifier instead of its head
 * noun. A1 declared "Callboard Marks" and wrote "one pencil stroke added to the
 * standby's own line" — no shared noun at all, a genuine miss. Conflated, the
 * count overstated the prose failure and hid how close some weeks were.
 *
 * Graded, 'modifier' is a polish miss (WARN) and 'absent' means what it says
 * (ERROR). The prompt half of the same split is INST_MARK_SURFACE, which now
 * demands the full phrase verbatim once — so the model is taught the shape
 * instead of guessing which noun the validator scans for.
 */
function currencyMentionVerdict(text, currencyLabel) {
  var haystack = ' ' + toSlugWords(text) + ' ';
  var words = toSlugWords(currencyLabel).split(' ').filter(Boolean);
  if (!words.length) return 'absent';
  var head = words[words.length - 1];
  if (haystackHas(haystack, words.join(' ')) || haystackHas(haystack, head)) return 'named';
  var modifiers = words.slice(0, -1).filter(function (w) {
    return w.length >= CURRENCY_MODIFIER_MIN_LENGTH
      && CURRENCY_MODIFIER_STOPLIST.indexOf(w) === -1;
  });
  return modifiers.some(function (w) { return haystackHas(haystack, w); }) ? 'modifier' : 'absent';
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
    } else if (currencyLabel) {
      // THE SPLIT (F04): named by its modifier is a polish miss; naming no part
      // of the currency at all is the economy failing to resolve.
      var mention = currencyMentionVerdict(conversion, currencyLabel);
      if (mention === 'modifier') {
        warnings.push('Week ' + weekNumber + ' reckoning conversion names the currency "'
          + currencyLabel + '" by its modifier rather than the declared phrase ("' + conversion
          + '") — the panel converts into the right thing under a slightly different name, which '
          + 'reads as a second currency to a player counting them');
      } else if (mention === 'absent') {
        errors.push('Week ' + weekNumber + ' reckoning conversion does not name the declared currency "'
          + currencyLabel + '" ("' + conversion + '") — the markStrip economy resolves into exactly '
          + 'one currency per booklet');
      }
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

  // ── The floor of presence (VISION §8, the depth wave) ─────────────────────
  // The ceiling above can only answer "too many?". A book with no pointers at
  // all sits inside every budget in this table and is still not the
  // cross-linked artifact the density law asks for — 19 of 20 corpus fixtures
  // were in exactly that state when this was written. Same ledger, same
  // WARN-class, other direction.
  //
  // The finding names the CHEAP channel on purpose. The card channel
  // (microLines[].citeRef) is capped at one per session because it is read
  // mid-rest; the document channel costs the reader nothing at all, so a book
  // that needs pointers should spend them on documents first.
  var floor = POINTER_BUDGETS.minPointersPerWeek * Math.max(1, weeks.length);
  if (total < floor) {
    findings.push('This booklet prints ' + total + ' pointer' + (total === 1 ? '' : 's')
      + ' across both channels (manifests + citations); the floor for '
      + weeks.length + ' weeks is ' + floor
      + ' — a book whose documents never name each other is a pile, not an archive.'
      + ' Spend the band on the document channel first: a manifestPointer costs a reader nothing mid-set');
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

// ── The unknown-key pass (W3 corrective wave, F06) ──────────────────────────
// DERIVED FROM THE SCHEMA, never described. The canonical schema rejects
// unknown keys everywhere outside `_x` (80 `additionalProperties: false` sites);
// this walker reads that same object and reports the paths that violate it, so
// the browser-side validator and Ajv cannot hold different opinions about what
// a legal key is. A described copy would be a second, worse schema — which is
// the failure mode contract-constants.mjs exists to prevent.
//
// WHAT IT UNDERSTANDS, stated plainly because a walker that silently skips a
// construct is a gate with a hole: `$ref` into `$defs`, `properties`, `items`,
// and `additionalProperties: false`. Allowed keys are UNIONED across `properties`
// and any `allOf` / `if` / `then` / `else` branches, which is conservative in the
// only direction that matters — a key the schema conditionally allows is never
// reported. Arrays walk element-wise. `_x` subtrees are never entered, because
// `_x` is the one place non-contract data is legal (and is where the pipeline's
// own debris lives).
//
// SEVERITY IS D19. On the generation path these are ERRORS: a generated booklet
// carrying an invented field is a booklet the canonical validator will refuse,
// and the model can simply not invent it. On fixtures they are WARNINGS —
// `npm run validate` must never fail a sealed fixture over a gate written after
// it was sealed, and the corpus is evidence, not output.
function schemaAllowedKeys(node) {
  var allowed = {};
  function absorb(n) {
    if (!n || typeof n !== 'object') return;
    if (n.properties) {
      Object.keys(n.properties).forEach(function (k) { allowed[k] = n.properties[k]; });
    }
    ['if', 'then', 'else'].forEach(function (branch) { absorb(n[branch]); });
    if (Array.isArray(n.allOf)) n.allOf.forEach(absorb);
    if (Array.isArray(n.anyOf)) n.anyOf.forEach(absorb);
    if (Array.isArray(n.oneOf)) n.oneOf.forEach(absorb);
  }
  absorb(node);
  return allowed;
}

function resolveSchemaRef(node) {
  var seen = 0;
  while (node && typeof node === 'object' && typeof node.$ref === 'string' && seen++ < 8) {
    var name = node.$ref.replace('#/$defs/', '');
    node = (BOOKLET_SCHEMA.$defs || {})[name];
  }
  return node;
}

/**
 * collectUnknownKeyPaths(value, schemaNode, path) -> string[]
 * Every key present in `value` that the schema does not allow at that location.
 * Exported for the critic's revision floor, which diffs unit against unit.
 */
export function collectUnknownKeyPaths(value, schemaNode, path) {
  var found = [];
  var node = resolveSchemaRef(schemaNode);
  if (!node || typeof node !== 'object' || !value || typeof value !== 'object') return found;
  var here = path || '';

  if (Array.isArray(value)) {
    var itemSchema = node.items;
    if (!itemSchema) return found;
    value.forEach(function (entry, i) {
      found = found.concat(collectUnknownKeyPaths(entry, itemSchema, here + '[' + i + ']'));
    });
    return found;
  }

  var allowed = schemaAllowedKeys(node);
  var closed = node.additionalProperties === false;
  Object.keys(value).forEach(function (key) {
    // `_x` is the extension namespace: legal wherever it is declared, and never
    // walked into. A key named `_x` where the schema does not declare one is
    // still reported by the closed-object check below, which is correct — the
    // namespace is granted at specific levels, not universally.
    var child = allowed[key];
    if (!child) {
      if (closed) found.push((here ? here + '.' : '') + key);
      return;
    }
    if (key === '_x') return;
    found = found.concat(collectUnknownKeyPaths(value[key], child, (here ? here + '.' : '') + key));
  });
  return found;
}

/**
 * Unknown-key paths in one critic-revisable unit, addressed through the
 * schema's own $defs so the unit is judged by exactly the rules it will face
 * when the whole booklet reaches scripts/validate.mjs.
 */
export function unknownKeyPathsForUnit(unitType, unit) {
  var DEFS = { week: 'week', fragment: 'fragment', ending: 'ending', rulesSpread: 'rulesSpread' };
  var defName = DEFS[unitType];
  if (!defName) return [];
  var node = (BOOKLET_SCHEMA.$defs || {})[defName];
  if (!node) return [];
  return collectUnknownKeyPaths(unit, node, '');
}

export function collectUnknownKeyFindings(booklet) {
  return collectUnknownKeyPaths(booklet, BOOKLET_SCHEMA, '').map(function (p) {
    return 'Unknown key "' + p + '" — the schema rejects keys it does not declare outside the '
      + '`_x` namespace, so this booklet cannot pass the canonical validator';
  });
}

/**
 * validateAssembledBooklet(booklet, options) -> { valid, errors, warnings, sim }
 *
 * `options` is additive and every existing caller omits it, which keeps their
 * behaviour byte-identical: `options.generationFloors` is the D111 switch and
 * nothing else reads it here.
 *
 * THE SIMULATED PLAYER'S SEAT (W4b). This is the only gate in the pipeline that
 * sees a whole assembled book, which is the only object the sim can walk — the
 * week stages see one week and the skeleton sees a plan. Severity follows D111
 * exactly:
 *
 *   floors ON  (the API pipelines) — soft-locks are ERRORS. A book whose ending
 *     is unreachable at realistic adherence is not a book with a quality
 *     problem; it is a book that cannot be finished, and the model is told so
 *     with the defect quoted.
 *   floors OFF (the corpus, the guided wizard, hand-authored JSON) — the same
 *     findings ride the WARNING channel. `npm run validate` must never fail a
 *     sealed fixture over a gate written after it was sealed.
 *
 * And underneath both: a book with no `meta.playSpine` is SKIPPED by the walker
 * itself, so every fixture in content/ is untouched either way.
 */
export function validateAssembledBooklet(booklet, options) {
  var errors = [];
  var warnings = []; // soft issues (stylistic, non-fatal) — attached to return value
  var opts = options || {};

  var simReport = simulateBook(booklet);
  if (!simReport.skipped) {
    var simHard = simCorrectionDirectives(simReport);
    if (opts.generationFloors) simHard.forEach(function (m) { errors.push(m); });
    else simHard.forEach(function (m) { warnings.push(m); });
    simSoftFindings(simReport).forEach(function (m) { warnings.push(m); });
  }

  collectBudgetBreaches(booklet).forEach(function (b) { warnings.push(b.message); });
  collectNounRosterFindings(booklet).forEach(function (m) { warnings.push(m); });
  collectPercentileStatFindings(booklet).forEach(function (m) { warnings.push(m); });
  // The mark economy carries both severities (see collectMarkStripFindings):
  // a missing strip is an unprintable promise, a clumsy label is taste.
  var markStripFindings = collectMarkStripFindings(booklet);
  markStripFindings.errors.forEach(function (m) { errors.push(m); });
  markStripFindings.warnings.forEach(function (m) { warnings.push(m); });
  // The unknown-key pass (F06), on the D19 split: blocking for generated books,
  // advisory for the corpus. This is the check whose absence let a critic
  // revision invent two fields and still clear a floor whose promise was that a
  // revision may never make the booklet less valid.
  collectUnknownKeyFindings(booklet).forEach(function (m) {
    if (opts.generationFloors) errors.push(m); else warnings.push(m);
  });
  // The harvest adoption floor's week-dependent arm (D144). Blocking on the
  // generation path, advisory on the corpus, the D19 split — a hand-authored
  // fixture that declares a pattern is stating an intention, not failing a gate.
  collectHarvestAdoptionFindings(booklet).forEach(function (m) {
    if (opts.generationFloors) errors.push(m); else warnings.push(m);
  });
  collectVoiceTicFindings(booklet).forEach(function (f) { warnings.push(f.message); });
  // DR-32, report-class on BOTH paths (no D19 split): the matcher reads a
  // surface name out of an instruction sentence, and its false-positive rate
  // on the `add … to X` idiom is UNMEASURED — the corpus holds no book that
  // uses that idiom and prints the surface. A fuzzy arm warns. Promotion owes
  // a corpus with the positive case in it, and is an author call.
  collectOracleWriteTargetFindings(booklet).forEach(function (f) { warnings.push(f.message); });
  // §4.11's book-scope arm, and the ONLY cadence arm that lives here. The other
  // three block at the WEEK gate, where blocking is real; `once` names no week,
  // so no week's payload can judge it and this is the only seat that can ask the
  // question at all. Report-class on BOTH paths with no D19 split, because this
  // function does not block on either one — api-generator.js logs these and
  // delivers the booklet. Labelling it an error would be a claim the mechanism
  // cannot honour.
  collectCadenceOnceFindings(booklet).forEach(function (f) { warnings.push(f.message); });
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
      var lowerFrag = f.documentType.toLowerCase();
      var resolved = DOCUMENT_TYPE_ALIASES[lowerFrag];
      if (!resolved || !validDocLookup[resolved]) {
        errors.push('Fragment "' + (f.id || '?') + '": documentType "' + f.documentType + '" not in supported list');
      }
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
        var lowerOd = od.documentType.toLowerCase();
        var resolvedOd = DOCUMENT_TYPE_ALIASES[lowerOd];
        if (!resolvedOd || !validDocLookup[resolvedOd]) {
          errors.push(wn + ' overflowDocument: documentType "' + od.documentType + '" not in supported list');
        }
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
      // ── DR-33: THE DECLARED CONVENTION (author ruling, 2026-08-18) ────────
      // This comparison was unconditional, and that made `reordering` a pattern
      // the pipeline offers and then refuses: a reordering book's demoPassword
      // is by definition NOT the week-order reading, so every one of them
      // errored here even when it obeyed the reordering doctrine perfectly. The
      // ruling settles it — a password's last step may be a DECLARED
      // convention. Under `reordering` the demand becomes multiset equality
      // (the same letters, any order) plus the reveal teaching the rearrange;
      // under every other pattern, and under silence, exact equality stands
      // unchanged, which is the ruling's other half: undeclared non-derivation
      // is a defect.
      var derivationMode = convergenceDerivationMode(
        (meta.artifactIntent || {}).convergencePattern);
      if (derivedPassword && meta.demoPassword) {
        var demoUpper = String(meta.demoPassword).toUpperCase();
        var sortChars = function (s) { return String(s || '').split('').sort().join(''); };
        if (derivationMode === 'anagram') {
          if (sortChars(demoUpper) !== sortChars(derivedPassword)) {
            errors.push('meta.demoPassword "' + meta.demoPassword + '" is not a rearrangement of '
              + 'the derived A1Z26 letters "' + derivedPassword + '" — convergencePattern is '
              + '"' + ((meta.artifactIntent || {}).convergencePattern) + '", which licenses a '
              + 'different ORDER and nothing else. The player cannot reach this word from the '
              + 'values the booklet had them collect.');
          } else if (!teachesRearrangement([
            boss.passwordRevealInstruction, boss.convergenceProof, boss.narrative
          ].filter(Boolean).join('\n'))) {
            errors.push('meta.demoPassword "' + meta.demoPassword + '" rearranges the derived '
              + 'letters "' + derivedPassword + '" and the boss page never tells the player to '
              + 'rearrange anything. A convention is only declared if the PAGE declares it — an '
              + 'anagram nobody is asked to unscramble is a mis-derivation at the table.');
          }
        } else if (meta.demoPassword !== derivedPassword) {
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
      //
      // DR-33 RETARGETED THE TEST, not the arm: this asked `=== 'reordering'`
      // directly, which made it a SECOND reader of "which patterns rearrange?"
      // beside the mode table the ruling introduced. One home, two readers
      // (D93) — the pattern-to-mode question is answered in one place now, so a
      // future pattern that rearranges cannot be taught to one of these arms
      // and not the other. Behaviour on today's four-value menu is identical.
      if (convergenceDerivationMode((meta.artifactIntent || {}).convergencePattern) === 'anagram') {
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

    // ── The answer-bearing seal, assembled seat (the doc-11 class) ──
    // THE ONE SEAT THAT HAS THE WHOLE PICTURE: the fragments, the collected
    // record and the finished password are all on this object, so this arm
    // needs nothing armed. It is telemetry rather than a gate (this validator
    // logs and the booklet is delivered regardless), which is exactly why the
    // fragment-stage seat above exists and owes its arming.
    var answerFindings = collectAnswerBearingFragmentFindings(booklet.fragments, inputs);
    answerFindings.errors.forEach(function (m) { errors.push(m); });
    answerFindings.warnings.forEach(function (m) { warnings.push(m); });

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
  // `sim` rides along so a caller can report the walk without re-running it.
  // Serialization-safe by construction: the walker's graph and holds are
  // stripped, because they carry the node objects and this shape is written
  // into `_x` debris and posted through structuredClone boundaries.
  return {
    errors: errors,
    warnings: warnings,
    sim: {
      skipped: simReport.skipped,
      skipReason: simReport.skipReason,
      hard: simReport.hard,
      soft: simReport.soft,
      bands: simReport.bands,
      decisions: simReport.decisions,
      measurements: simReport.measurements
    }
  };
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

export function validateCampaignPlanStage(result, options) {
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
      // The label leads with the WEEK NUMBER, the name the plan itself uses —
      // found on the first real run (D153 follow-on): "weeks[5] … is also
      // assigned to week 5" reads as a contradiction when weeks[5] is week 6,
      // and an informed retry then repairs the wrong week, twice. The index
      // stays in parentheses for humans reading the raw array.
      var label = 'Campaign Plan → Week ' + (w && w.weekNumber ? w.weekNumber : (i + 1)) + ' (weeks[' + i + '])';
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
      var lowerRaw = rawDocumentType ? rawDocumentType.toLowerCase() : '';
      var canonicalDocumentType = lowerRaw
        ? (DOCUMENT_TYPE_ALIASES[lowerRaw] || lowerRaw)
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
      // Same week-number-first labeling as the loop above (D153 follow-on).
      var label = 'Campaign Plan → Week ' + (week.weekNumber || (index + 1)) + ' (weeks[' + index + '])';
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

  // ── Floor: the cipher plan carries real variety (F5, multi-stage twin) ────
  // DEAD UNTIL THE TEETH ROUND, and dead in the quietest way: the block below
  // pushed onto `errors` AFTER the `return errors.join('; ')` above it, so the
  // array it filled was discarded and the function returned '' regardless. The
  // DEGRADED_PATTERNS entry that was supposed to demote it never matched
  // anything, because nothing was ever emitted. Book 1's two families passed a
  // check that had not run since it was written.
  //
  // Now it returns, and it is BLOCKING under generationFloors — cipher variety
  // is creative and has no derivation, so it can only come from the model.
  // Ungated callers (the guided-build harness, the manual API) keep the old
  // silence: they replay hand-built plans and owe no generation policy.
  if (floorsOn(options) && result && Array.isArray(result.weeks)) {
    var nonBossTypes = result.weeks
      .filter(function (w) { return w && !w.isBossWeek; })
      .map(function (w) { return String(w.cipherType || '').trim().toLowerCase(); })
      .filter(Boolean);
    var needed = cipherVarietyFloor(result.weeks.length);
    var distinct = {};
    nonBossTypes.forEach(function (t) { distinct[t] = 1; });
    var have = Object.keys(distinct).length;
    if (nonBossTypes.length >= 3 && have < needed) {
      return 'Campaign Plan → weeks schedule only ' + have + ' distinct cipherType value'
        + (have === 1 ? '' : 's') + ' across ' + nonBossTypes.length + ' non-boss weeks; this book owes '
        + needed + ' — give each week a technique the player has to learn fresh';
    }
  }

  // ── Floor: a geometry departure NAMES THE VALUE IT DEPARTED FROM (D170) ──
  // The one arm of the obedience law that IS answerable at this stage, and the
  // only gate that ever sees this decision. The geometry axis is deliberately
  // not held to the full floor here (see the long note beside
  // seedObedienceFloorErrors): the family that D144 W-2 licensed to overrule
  // the die is declared one stage LATER, so "was this departure legitimate?"
  // has no answer yet. "Did this departure quote the assignment it departed
  // from?" has one, right now, and it is the half that caught nothing.
  //
  // MEASURED. The first completed book was handed `the board geometry
  // (mapState.mapType) IS `concentric`` verbatim in this stage's GIVENS block,
  // and wrote back "DEPARTURE RECORDED: the seed assigned `grid`" — a value no
  // die ever produced — then argued the exemption from a mechanic grammar
  // family the shell stage did not go on to declare. Every downstream reader
  // took the departure at its word, because the referee only ever asks whether
  // the family refuses the ASSIGNED geometry, never whether the sentence is
  // about the assignment at all. Five of five non-boss weeks then printed the
  // same board.
  //
  // NARROW BY CONSTRUCTION: silent when no assignment rode the call (the
  // guided harness, the manual API, every replay), and silent when the plan
  // simply obeys. It cannot judge the departure — only refuse an unquoted one.
  if (floorsOn(options) && result && result.topology) {
    var assignedGeometry = String(((options.seedAssignments || {}).mapGeometry) || '').trim();
    var plannedGeometry = String(result.topology.mainMapType || '').trim();
    if (assignedGeometry && plannedGeometry
      && plannedGeometry.toLowerCase() !== assignedGeometry.toLowerCase()) {
      var identityText = String(result.topology.identity || '').toLowerCase();
      if (identityText.indexOf(assignedGeometry.toLowerCase()) === -1) {
        return 'Campaign Plan → topology.mainMapType is "' + plannedGeometry
          + '" and the system assigned `' + assignedGeometry + '`, but topology.identity never '
          + 'mentions `' + assignedGeometry + '`. A departure has to name the value it departed '
          + 'from, or nothing downstream can tell a considered exemption from a mis-remembered '
          + 'assignment. Write `' + assignedGeometry + '` in topology.identity beside the reason '
          + 'you took "' + plannedGeometry + '" instead — the mechanic grammar family whose Serves '
          + 'row refuses `' + assignedGeometry + '` and names "' + plannedGeometry + '", or the '
          + 'brief phrase that required it. If neither is true, take the assignment.';
      }
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

/**
 * validateFragmentsStage(result, expectedRegistry, options) -> verdict
 *
 * THE VERDICT OBJECT (D157's documented shape; converted D168). This gate used
 * to answer in strings — '' for a pass, one sentence for a failure — and its
 * budget branch concatenated up to six breaches into that single sentence. Six
 * coordinates were therefore thrown away at the exact gate that most needs
 * them: the fragments stage runs LATER in every book than the weeks do, and
 * `fragmentBody` is the largest budgeted string in the schema, so an overshoot
 * here costs the most expensive re-roll the pipeline can order.
 *
 * The shape is now the week gate's: `{ valid, errors, warnings, deltaTargets }`,
 * one error per defect, and one delta target per PATH-NAMED defect claiming its
 * error string verbatim (D167). `validationFailed` / `extractErrorList` in
 * api-generator.js already read this shape, so every runJsonStage call site is
 * unchanged; the callers that read the old string directly are converted with
 * it (there were two, plus two harnesses).
 */
function fragmentVerdict(errors, deltaTargets) {
  var list = (errors || []).filter(Boolean);
  return {
    valid: list.length === 0,
    errors: list,
    warnings: [],
    deltaTargets: (deltaTargets || []).slice()
  };
}

export function validateFragmentsStage(result, expectedRegistry, options) {
  if (!result || !Array.isArray(result.fragments)) {
    return fragmentVerdict(['Fragment stage validation failed: expected a { fragments:[...] } object.']);
  }

  // ── Floor: prose budgets cost a retry (F6) ────────────────────────────────
  // Twelve fragments at roughly double budget is how Book 1 reached sixty
  // pages. Checked FIRST because a fragment that is twice as long as it may be
  // is wrong before any of its ids are, and the correction directive should
  // lead with the thing that actually blew the book up.
  //
  // The early return is LOAD-BEARING for the remedy, not merely for the
  // message's emphasis: a verdict carrying budget breaches AND an id defect is
  // mixed, and a mixed verdict takes the full re-roll by ruling (D167). Because
  // this branch answers alone, a fragment batch whose only defect is length is
  // delta-class by construction. Accumulating these into the checks below would
  // silently return the whole gate to re-rolling.
  //
  // The old cap-at-6 is gone with the concatenation that needed it: each breach
  // is its own error now, and truncating a list of blocking errors would drop
  // the very coordinates the repair is made of.
  if (floorsOn(options)) {
    var budgetErrors = [];
    var budgetTargets = [];
    collectBudgetBreaches({ fragments: result.fragments }).forEach(function (b) {
      // Same idiom, same words as the week gate (D167): the message is carried
      // verbatim onto the target so the classifier matches by identity and
      // never by parsing. The path needs NO re-basing here — this gate is
      // handed the `{ fragments:[...] }` object the stage itself returns, which
      // is the payload a merge lands on, so the collector's own coordinates
      // already address it.
      var message = 'Over budget: ' + b.message;
      budgetErrors.push(message);
      budgetTargets.push({
        message: message,
        pathParts: b.path.slice(),
        path: formatFieldPath(b.path),
        cap: b.cap,
        length: b.length,
        requirement: b.message
      });
    });
    if (budgetErrors.length > 0) return fragmentVerdict(budgetErrors, budgetTargets);

    // ── The brief-transcription ban, fragment seat (W1) ──
    // The body reads from `content` when it exists and `body` otherwise — the
    // same two-key rule collectBudgetBreaches applies eight screens up, and for
    // the same reason: a reader that assumed one key would report every book
    // clean on the other. Silent with no brief on the options (D144 idiom).
    var copiedBrief = briefTranscriptionFloorErrors(
      result.fragments.map(function (frag) {
        return {
          label: 'fragment ' + ((frag && frag.id) || '?') + ' body',
          text: frag && (frag.content || frag.body)
        };
      }), (options || {}).brief, 'Fragments');
    if (copiedBrief.length > 0) return fragmentVerdict(copiedBrief);

    // ── The answer-bearing seal, fragment seat (the doc-11 class) ──
    // Silent with no `componentInputs`/`demoPassword` on the options (D144's
    // ungated-caller idiom). ARMED at W7's close: the week loop's collected
    // component values ride the fragment config and reach all three fragment
    // seats as the `componentInputs` option (`// W7-ARM seal-single`,
    // `seal-batch`, `seal-sf` in api-generator.js), and the registry row's
    // `armedBy` anchors those three marker comments — so this seat now fires on
    // the staged path, not only through the assembled one. (This comment said
    // the opposite until the teaching audit, 2026-08-20, caught it; a stale
    // "not yet armed" note is how a live floor gets armed twice.)
    var answersOut = collectAnswerBearingFragmentFloorErrors(
      result.fragments, (options || {}).componentInputs);
    if (answersOut.length > 0) return fragmentVerdict(answersOut);
  }
  var expected = (expectedRegistry || []).map(function (entry) { return normalizeId(entry.id); }).filter(Boolean);
  if (!expected.length) return fragmentVerdict([]);
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
  // Every sentence below is BYTE-IDENTICAL to the string this gate used to
  // return; only the envelope changed. These defects name a set of ids rather
  // than one coordinate, so none of them is delta-class and none publishes a
  // target — which is what makes the classifier refuse them (D167).
  if (invalid.length > 0) {
    return fragmentVerdict(['Fragment stage validation failed: missing content/body in IDs ' + invalid.slice(0, 8).join(', ') + '.']);
  }
  if (missingTitle.length > 0) {
    console.warn('[LiftRPG] Fragments missing title: ' + missingTitle.join(', '));
  }
  if (missingDocType.length > 0) {
    return fragmentVerdict(['Fragment stage validation failed: missing/invalid documentType in IDs ' + missingDocType.slice(0, 8).join(', ') + '.']);
  }
  if (missingAuthor.length > 0) {
    return fragmentVerdict(['Fragment stage validation failed: missing inWorldAuthor in IDs ' + missingAuthor.slice(0, 8).join(', ') + '.']);
  }
  if (pointerShape.length > 0) {
    return fragmentVerdict(['Fragment stage validation failed: ' + pointerShape.slice(0, 4).join('; ') + '.']);
  }
  var missing = expected.filter(function (id) { return !seen[id]; });
  if (missing.length > 0) {
    return fragmentVerdict(['Fragment stage validation failed: missing IDs ' + missing.slice(0, 8).join(', ') + '.']);
  }
  if (extras.length > 0) {
    return fragmentVerdict(['Fragment stage validation failed: unexpected IDs ' + extras.slice(0, 8).join(', ') + '.']);
  }
  return fragmentVerdict([]);
}

/**
 * Validates the skeleton output shape.
 * Convention: returns '' on pass, non-empty string on hard failure.
 *
 * `options.generationFloors` turns on the Teeth Round skeleton floors: the
 * component dialect, the cipher-family plan, and the companion floor. Opt-in
 * for the same reason every other floor is — see floorsOn().
 */
export function validateSkeletonStage(result, weekCount, options) {
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

  // ── The artifact-intent floor, the Skeleton+Flesh half (F07) ──────────────
  // Everything above this line is an advisory, and advisories are what let two
  // of four matrix books ship with no planning bundle at all. This stage is the
  // S+F pipeline's compiler seat — generateSkeletonPrompt carries
  // INST_ARTIFACT_COMPILER, so the skeleton is TOLD to author the bundle — which
  // makes it the exact counterpart of the shell gate on the standard pipeline.
  // A floor on one pipeline only would leave half the generated books owing a
  // surface nobody asks them for.
  //
  // Same four fields, same helper, same opt-in: the menu conformance above stays
  // advisory, and every ungated caller (the guided-build harness, the manual
  // API) keeps its silence.
  if (floorsOn(options)) {
    var intentFloor = artifactIntentFloorErrors(meta, 'Skeleton', (options || {}).brief,
      (options || {}).seedAssignments);
    if (intentFloor.length) return intentFloor.join('; ');

    // The obedience floor's S+F half. `'skeleton'`, not `'shell'`: this seat
    // authors eight of the fifteen axes and was handed exactly those eight
    // (D148 W-2a), so it is checked against exactly those eight.
    var obedience = seedObedienceFloorErrors(result, 'Skeleton', 'skeleton',
      (options || {}).seedAssignments);
    if (obedience.length) return obedience.join('; ');

    // The arrangement floor's S+F half. Same surface, same helper, same opt-in
    // — and it is legitimate at this seat only because generateSkeletonPrompt
    // carries INST_ARRANGEMENT and SCHEMA_ARRANGEMENT (asserted by
    // arrangementMenuParity in scripts/validate.mjs). A floor on one pipeline
    // only would leave half the generated books composing their pages by
    // accident, which is exactly the state ARRANGEMENT.md was written about.
    var arrangement = arrangementFloorErrors(meta, 'Skeleton');
    if (arrangement.length) return arrangement.join('; ');
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

  // ── The Teeth Round skeleton floors ───────────────────────────────────────
  // Everything above this line was already structural. Everything below was
  // "demanded" in prose and therefore skipped: Book 1 came back with no
  // dialect, two cipher families against a floor of four, and companions only
  // because a hotfix regeneration happened to include them.
  //
  // Collected rather than early-returned, because a skeleton that misses three
  // of them should cost ONE retry that names all three, not three retries that
  // each name one. This is the only stage validator in the file that runs long
  // enough for that to matter.
  if (floorsOn(options)) {
    var floorErrors = [];

    // ── Floor: the component dialect (F2) ──
    var dialect = String(((result.meta || {}).artifactIdentity || {}).componentDialect || '').trim();
    if (!dialect) {
      floorErrors.push('Skeleton → meta.artifactIdentity.componentDialect is unset — declare the instrument this'
        + ' book counts in: ' + VALID_COMPONENT_DIALECTS.join(' | '));
    } else if (VALID_COMPONENT_DIALECTS.indexOf(dialect) === -1) {
      floorErrors.push('Skeleton → meta.artifactIdentity.componentDialect "' + dialect
        + '" is not a dialect this engine draws: ' + VALID_COMPONENT_DIALECTS.join(' | '));
    }

    // ── Floor: the cipher plan carries real variety (F5) ──
    // Scheduled HERE, at the only stage that sees the whole book at once. The
    // week stage cannot see it: each week's cipher looks fine alone, and six
    // fine weeks were how Book 1 arrived with two families.
    var plannedTypes = wp
      .filter(function (w) { return w && !w.isBossWeek; })
      .map(function (w) { return String(w.cipherType || '').trim().toLowerCase(); })
      .filter(Boolean);
    var neededFamilies = cipherVarietyFloor(wp.length);
    var distinctPlanned = {};
    plannedTypes.forEach(function (t) { distinctPlanned[t] = 1; });
    var havePlanned = Object.keys(distinctPlanned).length;
    if (plannedTypes.length >= 3 && havePlanned < neededFamilies) {
      floorErrors.push('Skeleton → weekPlan schedules only ' + havePlanned + ' distinct cipherType value'
        + (havePlanned === 1 ? '' : 's') + ' across ' + plannedTypes.length + ' non-boss weeks; this book owes '
        + neededFamilies + ' — give each week a technique the player has to learn fresh');
    }

    // ── Floor: at least one companion component (F8) ──
    // Book-level, not per-week: companions are a campaign surface and three of
    // six weeks carrying none is a legitimate design. Zero across the whole
    // book is a booklet with nothing to hold state in.
    var companionTotal = 0;
    wp.forEach(function (w) {
      if (w && Array.isArray(w.companionTypes)) companionTotal += w.companionTypes.length;
    });
    if (companionTotal === 0) {
      floorErrors.push('Skeleton → weekPlan plans no companionTypes anywhere in the book — at least one week must'
        + ' carry a companion component for the play state to live on');
    }

    // The week shapes, derived ONCE and read by both the closure floors (the
    // deload exhale exemption on the tension budget) and the pre-flight below.
    // Same fields derivePlannedWeekShapes emits on the staged path, because it
    // is the same question and there is only ever one answer to it (D166).
    var sfPlannedWeeks = wp.map(function (w, i) {
      return {
        weekNumber: Number((w || {}).weekNumber) || (i + 1),
        isBoss: !!(w || {}).isBossWeek,
        isDeload: !!(w || {}).isDeload
      };
    });

    // ── The closure floors (W4a) ──
    // Collected into the same batch for the same reason: a spine with three
    // wiring defects should cost ONE retry that names all three.
    floorErrors = floorErrors.concat(
      collectSpineSkeletonFloorErrors((result.meta || {}).playSpine, result, 'Skeleton', sfPlannedWeeks)
    );

    // ── The rulebook⇄spine parity floor (D173), S+F's half ──
    // Same document, same check, different seat. The rulebook rides in through
    // options for the same reason the spine rides into the week floors: a gate
    // never invents the plan it is checking against, so a caller with no
    // rulebook (the wizard, the manual surface, a hand-built replay) gets no
    // parity check rather than a fabricated one.
    floorErrors = floorErrors.concat(collectRulebookSpineParityErrors(
      (options || {}).gameRulebook,
      (result.meta || {}).playSpine,
      'Skeleton'
    ));

    // ── The earliest-stage pre-flight (D143) ──
    // Cheaper here than anywhere: this stage IS the plan, so nothing has to be
    // passed in. The weekPlan carries isDeload and isBossWeek directly (they
    // are in STRUCTURED_SCHEMA_SKELETON), and the family is in the same meta
    // block the artifact-intent floor just checked.
    floorErrors = floorErrors.concat(collectSpinePreflightFloorErrors(
      (result.meta || {}).playSpine,
      {
        weeks: sfPlannedWeeks,
        fragmentRegistry: result.fragmentRegistry,
        mechanicGrammarFamily: ((result.meta || {}).artifactIntent || {}).mechanicGrammarFamily
      },
      'Skeleton'
    ));

    if (floorErrors.length) return floorErrors.join('; ');
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
  /overflowDocument\.documentType missing/i,
  /weeklyComponent\.type.*does not match.*weeklyComponentType/i
];

var DEGRADED_PATTERNS = [
  // /cipher variety below doctrine/i lived here from GAP-3 until the Teeth
  // Round and never matched anything: validateCampaignPlanStage pushed that
  // string onto an array it had already returned past, so the demotion was
  // guarding an error that was never emitted. Cipher variety is now emitted,
  // and it is BLOCKING (F5) — the pattern is deleted rather than updated,
  // because a demotion for a floor is a floor that does not exist.
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
