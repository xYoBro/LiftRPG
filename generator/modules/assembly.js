// ── Assembly & continuity module ─────────────────────────────────────────────
// Extracted from api-generator.js IIFE — booklet assembly, identity contracts,
// continuity ledger, fragment batching, and derivation helpers.

import { DOCUMENT_TYPE_ALIASES, SUPPORTED_THEME_ARCHETYPES, THEME_ARCHETYPE_ALIASES } from './constants.js';

// ── ID normalisation ────────────────────────────────────────────────────────
// Soft matching for fragment IDs: "F.01" vs "F-01" vs "f_01" all match.
// Used in validation only — never rewrites IDs in the booklet.

export function normalizeId(id) {
  return String(id || '').toLowerCase().replace(/[-_.\s]/g, '');
}

export function firstNonEmpty() {
  for (var i = 0; i < arguments.length; i++) {
    var value = arguments[i];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

export function toSlugWords(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function cloneSimple(value) {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value));
}

export function truncateText(value, maxLength) {
  var text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!maxLength || text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 3)).replace(/\s+\S*$/, '') + '...';
}

export function compactJsonString(value) {
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return '{}';
  }
}

// ── Identity / inference ────────────────────────────────────────────────────

export function inferArtifactClassFromShell(shell) {
  var cover = shell.cover || {};
  var meta = shell.meta || {};
  var theme = shell.theme || {};
  var source = toSlugWords([
    cover.designation,
    cover.title,
    cover.subtitle,
    meta.blockSubtitle,
    meta.worldContract,
    meta.weeklyComponentType
  ].join(' '));

  if (!source) {
    switch (String(theme.visualArchetype || '').toLowerCase()) {
      case 'government': return 'classified incident packet';
      case 'nautical': return 'ship logbook';
      case 'minimalist': return 'technical field manual';
      case 'occult': return 'devotional manual';
      default: return 'field survey folio';
    }
  }

  if (/\b(ship|deck|captain|hull|compartment|navigation|voyage)\b/.test(source)) return 'ship logbook';
  if (/\b(court|docket|testimony|deposition|verdict)\b/.test(source)) return 'court packet';
  if (/\b(devotional|liturgy|prayer|rite|choir|chapel)\b/.test(source)) return 'devotional manual';
  if (/\b(binder|witness|statement|interview|profile)\b/.test(source)) return 'witness binder';
  if (/\b(archive|household|family|estate|ledger)\b/.test(source)) return 'household archive';
  if (/\b(manual|protocol|maintenance|operations|procedure)\b/.test(source)) return 'technical field manual';
  if (/\b(packet|dossier|classified|incident|agency|office)\b/.test(source)) return 'classified incident packet';
  return 'field survey folio';
}

export function inferShellFamily(artifactClass, themeArchetype) {
  var artifact = toSlugWords(artifactClass);
  if (artifact.indexOf('ship') !== -1) return 'ship-logbook';
  if (artifact.indexOf('court') !== -1) return 'court-packet';
  if (artifact.indexOf('devotional') !== -1) return 'devotional-manual';
  if (artifact.indexOf('witness') !== -1) return 'witness-binder';
  if (artifact.indexOf('archive') !== -1 || artifact.indexOf('household') !== -1) return 'household-archive';
  if (artifact.indexOf('manual') !== -1) return 'technical-manual';
  if (artifact.indexOf('packet') !== -1 || artifact.indexOf('dossier') !== -1 || themeArchetype === 'government') {
    return 'classified-packet';
  }
  return 'field-survey';
}

export function inferBoardStateMode(shell, campaignPlan) {
  var metaIdentity = (((shell || {}).meta || {}).artifactIdentity || {});
  if (metaIdentity.boardStateMode) return String(metaIdentity.boardStateMode);

  var topology = (((campaignPlan || {}).topology || {}).type || '').toLowerCase();
  if (topology) {
    if (topology.indexOf('timeline') !== -1) return 'timeline-reconstruction';
    if (topology.indexOf('route') !== -1) return 'route-tracker';
    if (topology.indexOf('node') !== -1) return 'node-graph';
  }

  var componentType = String((((shell || {}).meta || {}).weeklyComponentType) || '').toLowerCase();
  if (componentType.indexOf('station') !== -1 || componentType.indexOf('gauge') !== -1) return 'survey-grid';
  if (componentType.indexOf('ledger') !== -1) return 'ledger-board';
  return 'survey-grid';
}

export function inferAttachmentStrategy(shellFamily, boardStateMode) {
  if (boardStateMode === 'timeline-reconstruction' || boardStateMode === 'testimony-matrix') {
    return 'narrative-support';
  }
  if (shellFamily === 'classified-packet' || shellFamily === 'technical-manual' || shellFamily === 'ship-logbook') {
    return 'split-technical';
  }
  if (shellFamily === 'witness-binder' || shellFamily === 'household-archive') {
    return 'single-dominant';
  }
  return 'split-technical';
}

export function normalizeArtifactIdentity(rawIdentity, shell, campaignPlan) {
  var identity = rawIdentity && typeof rawIdentity === 'object' ? rawIdentity : {};
  var themeArchetype = String((((shell || {}).theme || {}).visualArchetype) || '').toLowerCase();
  var artifactClass = firstNonEmpty(identity.artifactClass, inferArtifactClassFromShell(shell));
  var shellFamily = firstNonEmpty(identity.shellFamily, inferShellFamily(artifactClass, themeArchetype));
  var boardStateMode = firstNonEmpty(identity.boardStateMode, inferBoardStateMode(shell, campaignPlan));
  var attachmentStrategy = firstNonEmpty(identity.attachmentStrategy, inferAttachmentStrategy(shellFamily, boardStateMode));

  return {
    artifactClass: artifactClass,
    artifactBlend: Array.isArray(identity.artifactBlend) ? identity.artifactBlend.slice(0, 4) : (identity.artifactBlend || ''),
    authorialMode: firstNonEmpty(identity.authorialMode, themeArchetype === 'government' ? 'procedural' : ''),
    boardStateMode: boardStateMode,
    documentEcology: identity.documentEcology || '',
    materialCulture: identity.materialCulture || '',
    openingMode: firstNonEmpty(identity.openingMode, shellFamily === 'classified-packet' ? 'briefing' : 'artifact-first'),
    rulesDeliveryMode: firstNonEmpty(identity.rulesDeliveryMode, shellFamily === 'devotional-manual' ? 'diegetic-procedure' : 'mixed'),
    revealShape: identity.revealShape || '',
    unlockLogic: identity.unlockLogic || '',
    shellFamily: shellFamily,
    attachmentStrategy: attachmentStrategy
  };
}

export function ensureArtifactIdentity(shell, campaignPlan) {
  if (!shell || typeof shell !== 'object') return null;
  if (!shell.meta) shell.meta = {};
  var normalized = normalizeArtifactIdentity(shell.meta.artifactIdentity, shell, campaignPlan);
  shell.meta.artifactIdentity = normalized;
  return normalized;
}

export function buildIdentityContract(shell, campaignPlan) {
  shell = shell || {};
  ensureArtifactIdentity(shell, campaignPlan || null);
  var meta = shell.meta || {};
  return {
    worldContract: meta.worldContract || '',
    narrativeVoice: cloneSimple(meta.narrativeVoice) || null,
    literaryRegister: cloneSimple(meta.literaryRegister) || null,
    structuralShape: cloneSimple(meta.structuralShape) || null,
    weeklyComponentType: meta.weeklyComponentType || '',
    artifactIdentity: cloneSimple(meta.artifactIdentity) || null
  };
}

export function equalJsonLike(a, b) {
  return JSON.stringify(a || null) === JSON.stringify(b || null);
}

export function compareIdentityContract(booklet, contract) {
  var errors = [];
  if (!booklet || !contract) return errors;
  var meta = booklet.meta || {};
  var expectedIdentity = contract.artifactIdentity || {};
  var actualIdentity = normalizeArtifactIdentity(meta.artifactIdentity, { meta: meta, theme: booklet.theme || {} }, null);

  if (contract.worldContract && meta.worldContract !== contract.worldContract) {
    errors.push('meta.worldContract drifted from the approved shell contract');
  }
  if (contract.weeklyComponentType && meta.weeklyComponentType !== contract.weeklyComponentType) {
    errors.push('meta.weeklyComponentType drifted from "' + contract.weeklyComponentType + '"');
  }
  if (contract.narrativeVoice && !equalJsonLike(meta.narrativeVoice, contract.narrativeVoice)) {
    errors.push('meta.narrativeVoice drifted from the approved shell contract');
  }
  if (contract.literaryRegister && !equalJsonLike(meta.literaryRegister, contract.literaryRegister)) {
    errors.push('meta.literaryRegister drifted from the approved shell contract');
  }
  if (contract.structuralShape && !equalJsonLike(meta.structuralShape, contract.structuralShape)) {
    errors.push('meta.structuralShape drifted from the approved shell contract');
  }

  Object.keys(expectedIdentity).forEach(function (key) {
    if (!expectedIdentity[key]) return;
    if (JSON.stringify(actualIdentity[key] || null) !== JSON.stringify(expectedIdentity[key] || null)) {
      errors.push('meta.artifactIdentity.' + key + ' drifted from "' + expectedIdentity[key] + '"');
    }
  });

  return errors;
}

export function enforceIdentityContract(booklet, contract) {
  if (!booklet || !contract) return;
  booklet.meta = booklet.meta || {};
  if (contract.worldContract) booklet.meta.worldContract = contract.worldContract;
  if (contract.weeklyComponentType) booklet.meta.weeklyComponentType = contract.weeklyComponentType;
  if (contract.narrativeVoice) booklet.meta.narrativeVoice = cloneSimple(contract.narrativeVoice);
  if (contract.literaryRegister) booklet.meta.literaryRegister = cloneSimple(contract.literaryRegister);
  if (contract.structuralShape) booklet.meta.structuralShape = cloneSimple(contract.structuralShape);
  if (contract.artifactIdentity) booklet.meta.artifactIdentity = cloneSimple(contract.artifactIdentity);
}

export function formatIdentityContractLines(contract) {
  if (!contract) return [];
  var lines = [
    '- Preserve shell identity exactly. Do not normalize this booklet into generic field dossier grammar.'
  ];
  if (contract.worldContract) lines.push('- Keep meta.worldContract exactly: ' + contract.worldContract);
  if (contract.weeklyComponentType) lines.push('- Keep meta.weeklyComponentType: ' + contract.weeklyComponentType);
  if (contract.artifactIdentity) {
    lines.push('- Keep meta.artifactIdentity exactly: ' + JSON.stringify(contract.artifactIdentity));
    if (contract.artifactIdentity.shellFamily) lines.push('- Do not change shellFamily: ' + contract.artifactIdentity.shellFamily);
    if (contract.artifactIdentity.boardStateMode) lines.push('- Do not change boardStateMode: ' + contract.artifactIdentity.boardStateMode);
    if (contract.artifactIdentity.openingMode) lines.push('- Do not change openingMode: ' + contract.artifactIdentity.openingMode);
    if (contract.artifactIdentity.rulesDeliveryMode) lines.push('- Do not change rulesDeliveryMode: ' + contract.artifactIdentity.rulesDeliveryMode);
    if (contract.artifactIdentity.unlockLogic) lines.push('- Do not change unlockLogic: ' + contract.artifactIdentity.unlockLogic);
  }
  if (contract.narrativeVoice) lines.push('- Keep meta.narrativeVoice exactly as provided.');
  if (contract.literaryRegister) lines.push('- Keep meta.literaryRegister exactly as provided.');
  if (contract.structuralShape) lines.push('- Keep meta.structuralShape exactly as provided.');
  return lines;
}

// ── Ending / signal helpers ─────────────────────────────────────────────────

export function extractEndingBodyText(entry) {
  if (!entry || typeof entry !== 'object') return '';
  if (typeof entry.content === 'string') return entry.content;
  if (entry.content && typeof entry.content === 'object') {
    return firstNonEmpty(entry.content.body, entry.content.content, entry.content.html);
  }
  return firstNonEmpty(entry.body, entry.text);
}

export var SIGNAL_TOKEN_STOPWORDS = {
  the: 1, and: 1, with: 1, from: 1, into: 1, this: 1, that: 1, then: 1,
  were: 1, have: 1, your: 1, their: 1, there: 1, while: 1, after: 1,
  before: 1, where: 1, which: 1, shall: 1, would: 1, could: 1, about: 1
};

export var COUNT_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10
};

export var CONTINUITY_PHRASE_PATTERNS = [
  /\b([a-z0-9-]+(?:\s+[a-z0-9-]+){0,2}\s+cipher)\b/gi,
  /\b([a-z0-9-]+(?:\s+[a-z0-9-]+){0,2}\s+relay)\b/gi,
  /\b([a-z0-9-]+(?:\s+[a-z0-9-]+){0,2}\s+clearance)\b/gi
];

export function extractYearsFromText(text) {
  var matches = String(text || '').match(/\b(18|19|20)\d{2}\b/g) || [];
  return matches.map(function (year) { return Number(year); });
}

export function addSignalTokens(target, text) {
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .forEach(function (token) {
      if (!token || token.length < 4 || SIGNAL_TOKEN_STOPWORDS[token]) return;
      target[token] = true;
    });
}

export function collectAnchoredPhrases(text) {
  var source = String(text || '').toLowerCase();
  var phrases = {};

  CONTINUITY_PHRASE_PATTERNS.forEach(function (pattern) {
    pattern.lastIndex = 0;
    var match;
    while ((match = pattern.exec(source))) {
      var phrase = String(match[1] || '').replace(/\s+/g, ' ').trim();
      if (!phrase) continue;
      phrases[phrase] = true;
    }
  });

  return Object.keys(phrases);
}

export function addAnchoredPhrases(target, text) {
  collectAnchoredPhrases(text).forEach(function (phrase) {
    target[phrase] = true;
  });
}

export function parseCountToken(token) {
  if (token === undefined || token === null) return 0;
  var normalized = String(token).trim().toLowerCase();
  if (COUNT_WORDS[normalized]) return COUNT_WORDS[normalized];
  return parseInt(normalized, 10) || 0;
}

export function extractInputCountClaims(text) {
  var claims = [];
  var seen = {};
  var pattern = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:true\s+|recorded\s+|convergence\s+|component\s+|weekly\s+|final\s+|real\s+)?inputs?\b/gi;
  var match;

  while ((match = pattern.exec(String(text || '')))) {
    var phrase = String(match[0] || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!phrase || seen[phrase]) continue;
    seen[phrase] = true;
    claims.push({
      phrase: phrase,
      value: parseCountToken(match[1])
    });
  }

  return claims;
}

// ── Continuity system ───────────────────────────────────────────────────────

export function buildContinuityLedger(context) {
  context = context || {};
  var shell = context.shell || {};
  var campaignPlan = context.campaignPlan || {};
  var weekChunkOutputs = context.weekChunkOutputs || [];
  var fragmentsOutput = context.fragmentsOutput || {};
  var endingsOutput = context.endingsOutput || {};
  var identity = ensureArtifactIdentity(shell, campaignPlan) || {};
  var weeks = [];
  var fragmentIds = {};
  var overflowIds = {};
  var componentValues = [];
  var cipherTypes = [];
  var sessionFragmentRefs = {};
  var oracleFragmentRefs = {};
  var knownSignalTokens = {};
  var knownAnchoredPhrases = {};
  var priorYears = {};

  addSignalTokens(knownSignalTokens, (shell.meta || {}).worldContract);
  addSignalTokens(knownSignalTokens, (((shell.meta || {}).artifactIdentity || {}).artifactClass || ''));
  addAnchoredPhrases(knownAnchoredPhrases, (shell.meta || {}).worldContract);

  weekChunkOutputs.forEach(function (chunk) {
    (chunk.weeks || []).forEach(function (week) {
      weeks.push(week);
      var wc = week.weeklyComponent || {};
      if (!week.isBossWeek && wc.value !== undefined && wc.value !== null && wc.value !== '') {
        componentValues.push(String(wc.value));
      }
      if (week.overflowDocument && week.overflowDocument.id) {
        overflowIds[normalizeId(week.overflowDocument.id)] = true;
      }
      var cipherType = (((week.fieldOps || {}).cipher || {}).type || '').trim();
      if (cipherType) cipherTypes.push(cipherType);
      addSignalTokens(knownSignalTokens, week.title);
      addSignalTokens(knownSignalTokens, ((week.fieldOps || {}).cipher || {}).title);
      addAnchoredPhrases(knownAnchoredPhrases, week.title);
      addAnchoredPhrases(knownAnchoredPhrases, ((week.fieldOps || {}).cipher || {}).title);
      extractYearsFromText(week.title).forEach(function (year) { priorYears[year] = true; });
      (week.sessions || []).forEach(function (session) {
        if (session.fragmentRef) sessionFragmentRefs[normalizeId(session.fragmentRef)] = true;
        addSignalTokens(knownSignalTokens, session.storyPrompt);
        addAnchoredPhrases(knownAnchoredPhrases, session.storyPrompt);
        extractYearsFromText(session.storyPrompt).forEach(function (year) { priorYears[year] = true; });
      });
      ((((week.fieldOps || {}).oracleTable || {}).entries) || []).forEach(function (entry) {
        if (entry.fragmentRef) oracleFragmentRefs[normalizeId(entry.fragmentRef)] = true;
        addSignalTokens(knownSignalTokens, entry.text);
        addAnchoredPhrases(knownAnchoredPhrases, entry.text);
        extractYearsFromText(entry.text).forEach(function (year) { priorYears[year] = true; });
      });
      ((((week.fieldOps || {}).oracle || {}).entries) || []).forEach(function (entry) {
        if (entry.fragmentRef) oracleFragmentRefs[normalizeId(entry.fragmentRef)] = true;
        addSignalTokens(knownSignalTokens, entry.text);
        addAnchoredPhrases(knownAnchoredPhrases, entry.text);
        extractYearsFromText(entry.text).forEach(function (year) { priorYears[year] = true; });
      });
      if (week.overflowDocument) {
        addSignalTokens(knownSignalTokens, week.overflowDocument.title);
        addSignalTokens(knownSignalTokens, week.overflowDocument.content || week.overflowDocument.body);
        addAnchoredPhrases(knownAnchoredPhrases, week.overflowDocument.title);
        addAnchoredPhrases(knownAnchoredPhrases, week.overflowDocument.content || week.overflowDocument.body);
        extractYearsFromText(week.overflowDocument.content || week.overflowDocument.body).forEach(function (year) { priorYears[year] = true; });
      }
    });
  });

  (campaignPlan.fragmentRegistry || []).forEach(function (entry) {
    if (entry && entry.id) fragmentIds[normalizeId(entry.id)] = true;
  });
  ((fragmentsOutput || {}).fragments || []).forEach(function (entry) {
    if (entry && entry.id) fragmentIds[normalizeId(entry.id)] = true;
    addSignalTokens(knownSignalTokens, entry.title);
    addSignalTokens(knownSignalTokens, extractEndingBodyText(entry));
    addAnchoredPhrases(knownAnchoredPhrases, entry.title);
    addAnchoredPhrases(knownAnchoredPhrases, extractEndingBodyText(entry));
    extractYearsFromText(extractEndingBodyText(entry)).forEach(function (year) { priorYears[year] = true; });
  });
  (campaignPlan.overflowRegistry || []).forEach(function (entry) {
    if (entry && entry.id) overflowIds[normalizeId(entry.id)] = true;
  });

  var bossPlan = campaignPlan.bossPlan || {};
  var expectedBossInputCount = weeks.filter(function (week) { return !week.isBossWeek; }).length;
  if (!expectedBossInputCount && Array.isArray(campaignPlan.weeks)) {
    expectedBossInputCount = Math.max(0, campaignPlan.weeks.length - 1);
  }

  return {
    artifactIdentity: identity,
    weekCount: Array.isArray(campaignPlan.weeks) ? campaignPlan.weeks.length : weeks.length,
    weeklyComponentType: firstNonEmpty((shell.meta || {}).weeklyComponentType, bossPlan.weeklyComponentType),
    expectedBossInputCount: expectedBossInputCount,
    componentValues: componentValues,
    fragmentIds: fragmentIds,
    overflowIds: overflowIds,
    cipherTypes: cipherTypes,
    sessionFragmentRefs: sessionFragmentRefs,
    oracleFragmentRefs: oracleFragmentRefs,
    endings: (endingsOutput || {}).endings || [],
    knownSignalTokens: knownSignalTokens,
    knownAnchoredPhrases: knownAnchoredPhrases,
    priorYears: priorYears
  };
}

export function continuityRefExists(ledger, ref) {
  var normalized = normalizeId(ref);
  return !!((ledger.fragmentIds && ledger.fragmentIds[normalized]) || (ledger.overflowIds && ledger.overflowIds[normalized]));
}

// ── Shell context extractor ─────────────────────────────────────────────────
// Extracts compact narrative constraints from shell output for downstream stages.
// Returns null if shell has no relevant fields (safe to pass as-is).

export function extractShellContext(shell) {
  var meta = shell.meta || {};
  var ctx = {};
  var hasContent = false;
  ensureArtifactIdentity(shell, null);
  if (meta.worldContract) { ctx.worldContract = meta.worldContract; hasContent = true; }
  if (meta.narrativeVoice) { ctx.narrativeVoice = meta.narrativeVoice; hasContent = true; }
  if (meta.literaryRegister) { ctx.literaryRegister = meta.literaryRegister; hasContent = true; }
  if (meta.structuralShape) { ctx.structuralShape = meta.structuralShape; hasContent = true; }
  if (meta.artifactIdentity) { ctx.artifactIdentity = meta.artifactIdentity; hasContent = true; }
  // Fix M2: return null when hasContent is false
  return hasContent ? ctx : null;
}

// ── Inter-chunk continuity builder ──────────────────────────────────────────
// Builds a compact continuity packet from ALL prior generated weeks.
// Replaces the thin {lastWeekNumber, lastMapState, lastClocks, lastTitle}
// with a richer summary that lets downstream chunks maintain puzzle, map,
// fragment, and narrative coherence without seeing full prior JSON.

export function buildChunkContinuity(allPriorWeeks) {
  allPriorWeeks = (allPriorWeeks || []).filter(Boolean);
  if (allPriorWeeks.length === 0) return null;

  var weekSummaries = [];
  var usedFragmentRefs = [];
  var cipherProgression = [];
  var componentValues = [];
  var overflowDocs = [];
  var binaryChoiceState = null;

  // Map progression from the LAST week that has a mapState
  var lastMapState = null;

  // Recent oracle context (last 2 weeks only)
  var recentOracles = [];

  allPriorWeeks.forEach(function (week, wi) {
    var wn = week.weekNumber || (wi + 1);
    var fo = week.fieldOps || {};
    var sessions = week.sessions || [];

    // Week title summary
    weekSummaries.push({ week: wn, title: week.title || '' });

    // Component values
    var wc = week.weeklyComponent || {};
    if (wc.value !== undefined && wc.value !== null && wc.value !== '') {
      componentValues.push({ week: wn, value: wc.value });
    }

    // Cipher progression (type + short summary)
    var cipher = fo.cipher || {};
    if (cipher.type) {
      cipherProgression.push({
        week: wn,
        type: cipher.type,
        title: (cipher.title || '').slice(0, 80)
      });
    }

    // Fragment refs used in sessions
    sessions.forEach(function (s) {
      if (s.fragmentRef) usedFragmentRefs.push(s.fragmentRef);
    });

    // Oracle fragment refs
    var oracle = fo.oracleTable || fo.oracle || {};
    var entries = oracle.entries || [];
    entries.forEach(function (e) {
      if (e.fragmentRef) usedFragmentRefs.push(e.fragmentRef);
    });

    // Binary choice detection
    sessions.forEach(function (s) {
      if (s.binaryChoice) {
        binaryChoiceState = {
          week: wn,
          choiceLabel: (s.binaryChoice.choiceLabel || '').slice(0, 120)
        };
      }
    });

    // Overflow document tracking
    if (week.overflowDocument && week.overflowDocument.id) {
      overflowDocs.push({
        week: wn,
        id: week.overflowDocument.id,
        documentType: week.overflowDocument.documentType || '',
        author: week.overflowDocument.inWorldAuthor || ''
      });
    }

    // Map state tracking
    if (fo.mapState) {
      lastMapState = fo.mapState;
    }

    // Recent oracle summaries (keep last 2)
    if (entries.length > 0) {
      var oracleSummary = { week: wn, entryCount: entries.length };
      // Extract fragment refs and paper actions from oracle
      var oracleFrags = [];
      var oracleActions = [];
      entries.forEach(function (e) {
        if (e.fragmentRef) oracleFrags.push(e.fragmentRef);
        if (e.paperAction) oracleActions.push(e.paperAction.slice(0, 60));
      });
      if (oracleFrags.length > 0) oracleSummary.fragmentRefs = oracleFrags;
      if (oracleActions.length > 0) oracleSummary.paperActions = oracleActions.slice(0, 3);
      recentOracles.push(oracleSummary);
    }
  });

  // Build map summary from last known mapState
  var mapSummary = summarizeMapStateForContinuity(lastMapState);

  // Deduplicate fragment refs
  var seen = {};
  usedFragmentRefs = usedFragmentRefs.filter(function (ref) {
    if (seen[ref]) return false;
    seen[ref] = true;
    return true;
  });

  return {
    weekCount: allPriorWeeks.length,
    weekSummaries: weekSummaries,
    componentValues: componentValues,
    cipherProgression: cipherProgression,
    usedFragmentRefs: usedFragmentRefs,
    overflowDocs: overflowDocs,
    recentOracles: recentOracles.slice(-2),
    mapProgression: mapSummary,
    binaryChoice: binaryChoiceState,
    clocks: (allPriorWeeks[allPriorWeeks.length - 1] || {}).gameplayClocks || []
  };
}

export function summarizeMapStateForContinuity(mapState) {
  if (!mapState) return null;

  var mapType = String(mapState.mapType || 'grid');
  var summary = { mapType: mapType };

  if (mapState.title) summary.title = String(mapState.title).slice(0, 80);
  if (mapState.floorLabel) summary.floorLabel = String(mapState.floorLabel).slice(0, 60);
  if (mapState.mapNote) summary.mapNote = String(mapState.mapNote).slice(0, 120);

  if (mapType === 'point-to-point') {
    var nodes = mapState.nodes || [];
    var edges = mapState.edges || [];
    summary.nodeCount = nodes.length;
    summary.edgeCount = edges.length;
    summary.currentNode = mapState.currentNode || '';
    summary.notableNodes = nodes
      .filter(function (node) { return node && (node.state || node.label); })
      .slice(0, 5)
      .map(function (node) {
        return (node.label || node.id || 'node') + (node.state ? ' [' + node.state + ']' : '');
      });
    return summary;
  }

  if (mapType === 'linear-track') {
    var positions = mapState.positions || [];
    summary.positionCount = positions.length;
    summary.currentPosition = mapState.currentPosition;
    summary.direction = mapState.direction || 'horizontal';
    summary.notablePositions = positions
      .filter(function (position) { return position && (position.annotation || position.label || position.state); })
      .slice(0, 5)
      .map(function (position) {
        var parts = [position.label || ('Position ' + position.index)];
        if (position.state) parts.push('[' + position.state + ']');
        if (position.annotation) parts.push(position.annotation.slice(0, 40));
        return parts.join(' ');
      });
    return summary;
  }

  if (mapType === 'player-drawn') {
    summary.canvasType = mapState.canvasType || 'dot-grid';
    summary.dimensions = mapState.dimensions || null;
    summary.seedMarkerCount = (mapState.seedMarkers || []).length;
    summary.promptCount = (mapState.prompts || []).length;
    summary.seedMarkers = (mapState.seedMarkers || []).slice(0, 3).map(function (marker) {
      return marker.label || ('(' + marker.col + ',' + marker.row + ')');
    });
    return summary;
  }

  var tiles = mapState.tiles || [];
  var anomalyCount = 0;
  var inaccessibleCount = 0;
  var notableAnnotations = [];
  tiles.forEach(function (tile) {
    if (tile.type === 'anomaly') anomalyCount++;
    if (tile.type === 'inaccessible') inaccessibleCount++;
    if (tile.annotation) notableAnnotations.push((tile.label || 'tile') + ': ' + tile.annotation.slice(0, 50));
  });
  summary.currentPosition = mapState.currentPosition;
  summary.gridDimensions = mapState.gridDimensions;
  summary.tileCount = tiles.length;
  summary.anomalyCount = anomalyCount;
  summary.inaccessibleCount = inaccessibleCount;
  if (notableAnnotations.length > 0) {
    summary.notableAnnotations = notableAnnotations.slice(0, 5);
  }
  return summary;
}

// ── Oracle key normalization (fix C4) ───────────────────────────────────────

export function normalizeOracleKey(week) {
  var fo = week.fieldOps;
  if (!fo) return;
  if (!fo.oracleTable && fo.oracle) {
    fo.oracleTable = fo.oracle;
    delete fo.oracle;
  }
}

// ── Oracle entry key normalization ──────────────────────────────────────────
// Models sometimes use "result", "description", or "label" instead of "text"
// for oracle entry content. Rename in place.

export function normalizeOracleEntryKeys(week) {
  var ot = week && week.fieldOps && week.fieldOps.oracleTable;
  if (!ot || !Array.isArray(ot.entries)) return;
  ot.entries.forEach(function (e) {
    if (!e.text && e.result) { e.text = e.result; delete e.result; }
    if (!e.text && e.description) { e.text = e.description; delete e.description; }
    if (!e.text && e.label) { e.text = e.label; delete e.label; }
  });
}

// ── Stage-level auto-repair for week objects ────────────────────────────────
// Called by runJsonStage BEFORE retry decision. Applies deterministic fixes
// that cost zero API calls. Idempotent — safe to call multiple times.

export function autoRepairWeek(result) {
  if (!result) return result;
  normalizeCompanionComponents(result);
  normalizeOracleKey(result);
  normalizeOracleEntryKeys(result);
  if (Array.isArray(result.sessions)) {
    result.overflow = result.sessions.length > 3;
  }
  return result;
}

// ── Normalization helpers ───────────────────────────────────────────────────

// Normalize companionComponents: model sometimes returns an object keyed by
// component name instead of the expected array. Convert in place.
export function normalizeCompanionComponents(week) {
  var fo = week.fieldOps || week.bossEncounter;
  if (!fo || !fo.companionComponents) return;
  if (Array.isArray(fo.companionComponents)) return;
  if (typeof fo.companionComponents === 'object' && fo.companionComponents !== null) {
    var cc = fo.companionComponents;
    fo.companionComponents = Object.keys(cc).map(function (key) {
      var val = cc[key];
      if (typeof val === 'object' && val !== null) {
        if (!val.type) val.type = key;
        return val;
      }
      return { type: key, value: val };
    });
    console.warn('[LiftRPG] Normalized companionComponents from object to array (' + fo.companionComponents.length + ' items)');
  }
}

// Normalize documentType aliases (e.g. 'letter' -> 'correspondence') on
// fragments, overflow documents, and endings in place.
export function normalizeDocumentTypes(booklet) {
  (booklet.fragments || []).forEach(function (f) {
    if (f.documentType && DOCUMENT_TYPE_ALIASES[f.documentType]) {
      f.documentType = DOCUMENT_TYPE_ALIASES[f.documentType];
    }
  });
  (booklet.weeks || []).forEach(function (week) {
    if (week.overflowDocument && week.overflowDocument.documentType && DOCUMENT_TYPE_ALIASES[week.overflowDocument.documentType]) {
      week.overflowDocument.documentType = DOCUMENT_TYPE_ALIASES[week.overflowDocument.documentType];
    }
  });
  (booklet.endings || []).forEach(function (ending) {
    var content = ending.content;
    if (content && content.documentType && DOCUMENT_TYPE_ALIASES[content.documentType]) {
      content.documentType = DOCUMENT_TYPE_ALIASES[content.documentType];
    }
  });
}

// ── Overflow document normalization (RC-2 mechanical cleanup) ────────────────
// Auto-assigns missing IDs, deduplicates collisions with fragment IDs.

export function normalizeOverflowDocuments(booklet) {
  var fragmentIds = {};
  (booklet.fragments || []).forEach(function (f) {
    if (f.id) fragmentIds[normalizeId(f.id)] = true;
  });
  var usedOverflowIds = {};

  (booklet.weeks || []).forEach(function (week, wi) {
    var od = week.overflowDocument;
    if (!od) return;

    // Auto-assign missing ID
    if (!od.id) {
      od.id = 'overflow-w' + (wi + 1);
    }

    // Dedup collision with fragment IDs
    var nid = normalizeId(od.id);
    if (fragmentIds[nid] || usedOverflowIds[nid]) {
      od.id = od.id + '-overflow';
      nid = normalizeId(od.id);
    }
    usedOverflowIds[nid] = true;
  });
}

// ── Interlude normalization ──────────────────────────────────────────────────
// Repairs common LLM errors in interlude objects:
//  1. "fragment" payloadType → "fragment-ref" (common LLM confusion)
//  2. String payload for "companion" → wrapped in { companionComponents: [] }
//  3. Unknown payloadType → downgraded to "narrative" with console warning

var VALID_INTERLUDE_PAYLOAD_TYPES = {
  none: 1, narrative: 1, cipher: 1, map: 1, clock: 1,
  companion: 1, 'fragment-ref': 1, 'password-element': 1
};

export function normalizeInterludes(booklet) {
  (booklet.weeks || []).forEach(function (week) {
    var interlude = week.interlude;
    if (!interlude) return;

    var pt = String(interlude.payloadType || '').trim().toLowerCase();

    // Fix 1: "fragment" → "fragment-ref"
    if (pt === 'fragment') {
      console.warn('[assembly] week ' + (week.weekNumber || '?') + ' interlude payloadType "fragment" → "fragment-ref"');
      interlude.payloadType = 'fragment-ref';
      pt = 'fragment-ref';
    }

    // Fix 2: unknown payloadType → "narrative"
    if (pt && !VALID_INTERLUDE_PAYLOAD_TYPES[pt]) {
      console.warn('[assembly] week ' + (week.weekNumber || '?') + ' interlude payloadType "' + pt + '" unsupported → downgraded to "narrative"');
      interlude.payloadType = 'narrative';
      pt = 'narrative';
    }

    // Fix 3: companion payload must be object with companionComponents
    if (pt === 'companion' && interlude.payload) {
      if (typeof interlude.payload === 'string') {
        console.warn('[assembly] week ' + (week.weekNumber || '?') + ' interlude companion payload was string → wrapped in companionComponents');
        interlude.payload = {
          companionComponents: [{
            type: 'overlay-window',
            title: interlude.payload,
            body: interlude.payload
          }]
        };
      } else if (interlude.payload && !Array.isArray(interlude.payload.companionComponents)) {
        console.warn('[assembly] week ' + (week.weekNumber || '?') + ' interlude companion payload missing companionComponents → wrapped');
        interlude.payload = { companionComponents: [interlude.payload] };
      }
    }

    // Fix 4: fragment-ref payload should be object with fragmentRef
    if (pt === 'fragment-ref' && typeof interlude.payload === 'string') {
      interlude.payload = { fragmentRef: interlude.payload, action: '' };
    }
  });
}

// ── Booklet assemblers ──────────────────────────────────────────────────────
// Merges partial JSON chunks from the 10-stage pipeline into a complete booklet.

export function assembleBooklet(shell, weekChunkOutputs, fragmentsOutput, endingsOutput, campaignPlan) {
  ensureArtifactIdentity(shell, campaignPlan || null);
  var booklet = {
    meta: shell.meta || {},
    cover: shell.cover || {},
    rulesSpread: shell.rulesSpread || {},
    theme: shell.theme || {},
    weeks: [],
    fragments: (fragmentsOutput || {}).fragments || [],
    endings: (endingsOutput || {}).endings || []
  };

  // Concatenate weeks from all chunks in order
  weekChunkOutputs.forEach(function (chunk) {
    booklet.weeks = booklet.weeks.concat(chunk.weeks || []);
  });

  // Normalize data shapes that models commonly get wrong
  booklet.weeks.forEach(normalizeCompanionComponents);
  booklet.weeks.forEach(normalizeOracleKey);
  normalizeDocumentTypes(booklet);
  normalizeInterludes(booklet);

  // Set overflow deterministically (fix C1 — was missing in this assembler)
  booklet.weeks.forEach(function (week) {
    if ((week.sessions || []).length > 3) {
      week.overflow = true;
    }
  });

  // Enforce deterministic derived fields (meta counts, componentInputs, password)
  var result = enforceBookletDerivedFields(booklet);
  if (result.warnings.length > 0) {
    console.warn('[LiftRPG] Assembly derivation warnings:', result.warnings);
  }

  return booklet;
}

// ── Structured booklet assembler ────────────────────────────────────────────
// Same as assembleBooklet but with exercise override: when normalizedWorkout
// has populated weeks[].sessions[].exercises, those replace LLM-generated
// exercise data deterministically. Used only by generateStructured().

export function assembleStructuredBooklet(shell, weekChunkOutputs, fragmentsOutput, endingsOutput, normalizedWorkout, campaignPlan) {
  ensureArtifactIdentity(shell, campaignPlan || null);
  var booklet = {
    meta: shell.meta || {},
    cover: shell.cover || {},
    rulesSpread: shell.rulesSpread || {},
    theme: shell.theme || {},
    weeks: [],
    fragments: (fragmentsOutput || {}).fragments || [],
    endings: (endingsOutput || {}).endings || []
  };

  // Concatenate weeks from all chunks in order
  weekChunkOutputs.forEach(function (chunk) {
    booklet.weeks = booklet.weeks.concat(chunk.weeks || []);
  });

  // Normalize data shapes that models commonly get wrong
  booklet.weeks.forEach(normalizeCompanionComponents);
  booklet.weeks.forEach(normalizeOracleKey);
  normalizeDocumentTypes(booklet);
  normalizeInterludes(booklet);

  // Override exercises with normalized data when available
  var nw = normalizedWorkout || {};
  if (nw.weeks && nw.weeks.length > 0) {
    booklet.weeks.forEach(function (week, wi) {
      var nwWeek = nw.weeks[wi];
      if (!nwWeek || !nwWeek.sessions) return;
      (week.sessions || []).forEach(function (session, si) {
        var nwSession = nwWeek.sessions[si];
        if (!nwSession || !nwSession.exercises || nwSession.exercises.length === 0) return;
        // Map normalized exercises to renderer shape
        session.exercises = nwSession.exercises.map(function (ex) {
          return {
            name: ex.name || 'Lift',
            sets: ex.sets || 3,
            repsPerSet: ex.repsPerSet || '5',
            weightField: ex.weightField !== undefined ? ex.weightField : true,
            notes: ex.notes || ''
          };
        });
        if (nwSession.dayLabel) {
          session.label = 'Session ' + (si + 1) + ' \u00b7 ' + nwSession.dayLabel;
        }
      });
    });
  }

  // Set overflow deterministically
  booklet.weeks.forEach(function (week) {
    if ((week.sessions || []).length > 3) {
      week.overflow = true;
    }
  });

  // Enforce deterministic derived fields (meta counts, componentInputs, password)
  var result = enforceBookletDerivedFields(booklet);
  if (result.warnings.length > 0) {
    console.warn('[LiftRPG] Structured assembly derivation warnings:', result.warnings);
  }

  return booklet;
}

// ── Week summary extractor ──────────────────────────────────────────────────
// Compact context from generated weeks for the fragments stage.

export function extractWeekSummaries(weekChunkOutputs) {
  var summaries = [];
  weekChunkOutputs.forEach(function (chunk) {
    (chunk.weeks || []).forEach(function (w) {
      var sessions = w.sessions || [];
      var fo = w.fieldOps || {};

      var entry = {
        weekNumber: w.weekNumber,
        title: w.title
      };

      // Epigraph (truncated — may be string or {text, attribution})
      if (w.epigraph) {
        entry.epigraph = typeof w.epigraph === 'string'
          ? w.epigraph.slice(0, 80)
          : (w.epigraph.text || '').slice(0, 80);
      }

      // Session data (compact — truncated prompts, key refs only)
      entry.sessions = sessions.map(function (s, si) {
        var sd = { index: si + 1 };
        if (s.label) sd.label = s.label;
        if (s.storyPrompt) sd.storyPrompt = s.storyPrompt.slice(0, 50);
        if (s.fragmentRef) sd.fragmentRef = s.fragmentRef;
        return sd;
      });

      // Fragment refs (flat list for quick lookup)
      var refs = sessions.map(function (s) { return s.fragmentRef || ''; }).filter(Boolean);
      if (refs.length > 0) entry.fragmentRefs = refs;

      // Weekly component
      var wc = w.weeklyComponent || {};
      if (wc.value !== undefined && wc.value !== null) {
        entry.weeklyComponent = { value: wc.value };
        if (wc.type) entry.weeklyComponent.type = wc.type;
        if (wc.extractionInstruction) entry.weeklyComponent.extractionInstruction = wc.extractionInstruction;
      }

      // Cipher summary
      var cipher = fo.cipher || {};
      if (cipher.type) {
        entry.cipher = {
          type: cipher.type,
          title: (cipher.title || '').slice(0, 100)
        };
        if (cipher.extractionInstruction) {
          entry.cipher.extractionInstruction = cipher.extractionInstruction.slice(0, 150);
        }
        if (cipher.characterDerivationProof) {
          entry.cipher.hasProof = true;
        }
      }

      // Oracle summary (compact — counts + fragment refs only)
      var oracle = fo.oracleTable || fo.oracle || {};
      var oEntries = oracle.entries || [];
      if (oEntries.length > 0) {
        var fragLinked = [];
        oEntries.forEach(function (e) {
          if (e.fragmentRef) fragLinked.push(e.fragmentRef);
        });
        entry.oracle = { entryCount: oEntries.length };
        if (oracle.mode) entry.oracle.mode = oracle.mode;
        if (fragLinked.length > 0) entry.oracle.fragmentLinked = fragLinked;
      }

      // Map state summary
      var ms = fo.mapState;
      if (ms) {
        entry.mapState = {};
        if (ms.gridDimensions) {
          entry.mapState.gridSize = ms.gridDimensions.columns + '\u00d7' + ms.gridDimensions.rows;
        }
        if (ms.currentPosition) entry.mapState.currentPosition = ms.currentPosition;
        if (ms.mapNote) entry.mapState.mapNote = ms.mapNote.slice(0, 120);
        // Tile counts (compact)
        var tiles = ms.tiles || [];
        if (tiles.length > 0) {
          var anomalyCount = 0, inaccessibleCount = 0;
          tiles.forEach(function (t) {
            if (t.type === 'anomaly') anomalyCount++;
            if (t.type === 'inaccessible') inaccessibleCount++;
          });
          if (anomalyCount) entry.mapState.anomalyCount = anomalyCount;
          if (inaccessibleCount) entry.mapState.inaccessibleCount = inaccessibleCount;
        }
      }

      // Overflow document
      if (w.overflowDocument) {
        entry.overflowDocument = {
          id: w.overflowDocument.id,
          documentType: w.overflowDocument.documentType || '',
          title: (w.overflowDocument.title || '').slice(0, 80)
        };
        if (w.overflowDocument.inWorldPurpose) {
          entry.overflowDocument.inWorldPurpose = w.overflowDocument.inWorldPurpose.slice(0, 100);
        }
      }

      // Binary choice
      sessions.forEach(function (s) {
        if (s.binaryChoice) {
          entry.binaryChoice = {
            choiceLabel: (s.binaryChoice.choiceLabel || '').slice(0, 120),
            promptA: (s.binaryChoice.promptA || '').slice(0, 80),
            promptB: (s.binaryChoice.promptB || '').slice(0, 80)
          };
        }
      });

      // Boss encounter summary
      if (w.isBossWeek && w.bossEncounter) {
        var boss = w.bossEncounter;
        entry.bossEncounter = {
          title: boss.title || '',
          componentInputs: boss.componentInputs || []
        };
        if (boss.convergenceProof) {
          entry.bossEncounter.convergenceExcerpt = boss.convergenceProof.slice(0, 200);
        }
        if (boss.binaryChoiceAcknowledgement) {
          entry.bossEncounter.acknowledgesBinaryChoice = true;
        }
      }

      summaries.push(entry);
    });
  });
  return summaries;
}

// ── Binary choice week finder ───────────────────────────────────────────────

export function findBinaryChoiceWeek(weekChunkOutputs) {
  for (var ci = 0; ci < weekChunkOutputs.length; ci++) {
    var weeks = weekChunkOutputs[ci].weeks || [];
    for (var wi = 0; wi < weeks.length; wi++) {
      var sessions = weeks[wi].sessions || [];
      for (var si = 0; si < sessions.length; si++) {
        if (sessions[si].binaryChoice) return weeks[wi];
      }
    }
  }
  return null;
}

// ── Deterministic derivation helpers ────────────────────────────────────────
// Compute bookkeeping facts from assembled data instead of trusting model prose.

/**
 * decodeA1Z26(values) -> string | null
 * Converts an array of numeric values to uppercase letters via A=1 ... Z=26.
 * Returns null if any value is out of range or non-numeric.
 */
export function decodeA1Z26(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  var letters = '';
  for (var i = 0; i < values.length; i++) {
    var n = Number(values[i]);
    if (isNaN(n) || n < 1 || n > 26 || n !== Math.floor(n)) return null;
    letters += String.fromCharCode(64 + n); // 65='A', so 64+1='A'
  }
  return letters;
}

/**
 * isStandardAlphaTable(referenceTable) -> boolean
 * Detects whether a decodingKey.referenceTable is a standard A=1 ... Z=26 table.
 * Matches tables formatted as "1=A  2=B  3=C ..." with any whitespace/newlines.
 * Returns false for any non-standard mapping (reverse alphabet, custom codes, etc.).
 */
export function isStandardAlphaTable(referenceTable) {
  if (!referenceTable || typeof referenceTable !== 'string') return false;
  // Extract all N=L pairs from the table text
  var pairs = referenceTable.match(/\d+=\s*[A-Za-z]/g);
  if (!pairs || pairs.length < 26) return false;
  // Verify each pair matches standard A1Z26
  for (var i = 0; i < 26; i++) {
    var expected = (i + 1) + '=' + String.fromCharCode(65 + i);
    // Find this pair (allow whitespace around =)
    var found = false;
    for (var j = 0; j < pairs.length; j++) {
      var cleaned = pairs[j].replace(/\s/g, '').toUpperCase();
      if (cleaned === expected) { found = true; break; }
    }
    if (!found) return false;
  }
  return true;
}

export function normalizeThemeArchetype(value) {
  var requested = String(value || '').trim().toLowerCase();
  if (SUPPORTED_THEME_ARCHETYPES[requested]) return requested;
  if (THEME_ARCHETYPE_ALIASES[requested]) return THEME_ARCHETYPE_ALIASES[requested];
  return 'pastoral';
}

/**
 * enforceBookletDerivedFields(booklet) -> { warnings: string[] }
 *
 * Post-assembly enforcement of deterministic fields. Mutates booklet in place.
 * Called by both assembleBooklet() and assembleStructuredBooklet().
 *
 * Enforces:
 *   meta.weekCount, meta.totalSessions
 *   bossEncounter.componentInputs (from collected non-boss weeklyComponent values)
 *   meta.passwordLength (when A1Z26 decode succeeds)
 *
 * Returns warnings array for non-critical issues (e.g. non-standard decode table).
 */
export function enforceBookletDerivedFields(booklet) {
  var warnings = [];
  var weeks = booklet.weeks || [];
  var meta = booklet.meta || {};
  booklet.meta = meta;
  booklet.theme = booklet.theme || {};

  var requestedArchetype = String(booklet.theme.visualArchetype || '').trim().toLowerCase();
  var normalizedArchetype = normalizeThemeArchetype(booklet.theme.visualArchetype);
  if (requestedArchetype && requestedArchetype !== normalizedArchetype) {
    warnings.push('theme.visualArchetype normalized from "' + requestedArchetype + '" to "' + normalizedArchetype + '"');
  }
  booklet.theme.visualArchetype = normalizedArchetype;

  // -- Meta counts (warn on mismatch, then enforce deterministic truth) --
  var actualTotalSessions = weeks.reduce(function (sum, w) {
    return sum + (w.sessions ? w.sessions.length : 0);
  }, 0);
  if (meta.weekCount !== weeks.length) {
    warnings.push('Booklet meta.weekCount (' + meta.weekCount + ') corrected to ' + weeks.length);
  }
  if (meta.totalSessions !== actualTotalSessions) {
    warnings.push('Booklet meta.totalSessions (' + meta.totalSessions + ') corrected to ' + actualTotalSessions);
  }
  meta.weekCount = weeks.length;
  meta.totalSessions = actualTotalSessions;

  // -- Collect non-boss weeklyComponent values --
  var nonBossValues = [];
  weeks.forEach(function (w) {
    if (!w.isBossWeek) {
      var wc = w.weeklyComponent || {};
      if (wc.value !== undefined && wc.value !== null && wc.value !== '') {
        nonBossValues.push(wc.value);
      }
    }
  });

  // -- Boss encounter: verify componentInputs --
  var bossWeek = null;
  for (var i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].isBossWeek) { bossWeek = weeks[i]; break; }
  }

  if (bossWeek && bossWeek.bossEncounter && nonBossValues.length > 0) {
    var boss = bossWeek.bossEncounter;
    var existingInputs = boss.componentInputs || [];

    // Only enforce when we have values for every non-boss week
    var nonBossCount = weeks.filter(function (w) { return !w.isBossWeek; }).length;
    if (nonBossValues.length === nonBossCount) {
      var computed = nonBossValues.map(function (v) { return String(v); });
      var mismatch = existingInputs.length !== computed.length;
      if (!mismatch) {
        for (var ci = 0; ci < computed.length; ci++) {
          if (String(existingInputs[ci]) !== computed[ci]) { mismatch = true; break; }
        }
      }
      if (mismatch) {
        if (existingInputs.length > 0) {
          warnings.push('componentInputs corrected: model had [' + existingInputs.join(', ') + '], computed [' + computed.join(', ') + ']');
        }
        boss.componentInputs = computed;
      }
    }

    // -- Password derivation (A1Z26 only) --
    var dk = boss.decodingKey;
    if (dk && dk.referenceTable) {
      if (isStandardAlphaTable(dk.referenceTable)) {
        var numericValues = (boss.componentInputs || []).map(function (v) { return Number(v); });
        var password = decodeA1Z26(numericValues);
        if (password) {
          if (meta.passwordLength !== password.length) {
            warnings.push('meta.passwordLength corrected from ' + meta.passwordLength + ' to ' + password.length);
          }
          meta.passwordLength = password.length;
        } else {
          warnings.push('A1Z26 decode failed — componentInputs contain non-integer or out-of-range values');
        }
      } else {
        warnings.push('Boss decodingKey.referenceTable is not standard A1Z26 — password not derived deterministically');
      }
    }
  }

  return { warnings: warnings };
}

// ── Fragment batching ───────────────────────────────────────────────────────
// Groups fragmentRegistry entries into batches by weekRef for sequential generation.

/**
 * buildFragmentBatches(fragmentRegistry, weekSummaries) -> Array<{ weekNumbers, registry, weekSummaries }>
 *
 * Groups fragmentRegistry entries into batches using weekRef associations.
 * Strategy: one batch per week-chunk pair (weeks 1-2, 3-4, 5-6 for a 6-week booklet).
 * Entries that lack weekRef are distributed evenly across batches (round-robin).
 *
 * Each batch contains:
 *   weekNumbers: number[]         — which weeks this batch covers
 *   registry: object[]            — registry entries for this batch
 *   weekSummaries: object[]       — week summaries scoped to this batch
 */
export function buildFragmentBatches(fragmentRegistry, weekSummaries) {
  if (!fragmentRegistry || fragmentRegistry.length === 0) return [];

  // Determine week numbers from summaries; fall back to weekRefs in registry
  var allWeekNums = (weekSummaries || []).map(function (ws) { return ws.weekNumber; });
  if (allWeekNums.length === 0) {
    // Pre-planning call (no summaries yet) — derive from registry weekRefs
    var weekSet = {};
    fragmentRegistry.forEach(function (entry) {
      if (entry.weekRef && typeof entry.weekRef === 'number') weekSet[entry.weekRef] = true;
    });
    allWeekNums = Object.keys(weekSet).map(Number).sort(function (a, b) { return a - b; });
  }
  if (allWeekNums.length === 0) allWeekNums = [1]; // absolute fallback — at least one batch

  // Build pairs: [1,2], [3,4], [5,6] for 6-week; [1,2], [3] for 3-week, etc.
  var pairs = [];
  for (var i = 0; i < allWeekNums.length; i += 2) {
    var pair = [allWeekNums[i]];
    if (i + 1 < allWeekNums.length) pair.push(allWeekNums[i + 1]);
    pairs.push(pair);
  }

  // Build a weekNumber -> summaries lookup
  var summaryByWeek = {};
  (weekSummaries || []).forEach(function (ws) {
    summaryByWeek[ws.weekNumber] = ws;
  });

  // Assign each registry entry to a pair based on weekRef
  var pairBuckets = pairs.map(function () { return []; });
  var unassigned = [];

  fragmentRegistry.forEach(function (entry) {
    if (entry.weekRef && typeof entry.weekRef === 'number') {
      // Find which pair this weekRef belongs to
      var placed = false;
      for (var pi = 0; pi < pairs.length; pi++) {
        if (pairs[pi].indexOf(entry.weekRef) !== -1) {
          pairBuckets[pi].push(entry);
          placed = true;
          break;
        }
      }
      if (!placed) unassigned.push(entry);
    } else {
      unassigned.push(entry);
    }
  });

  // Distribute unassigned entries evenly across batches (not all into last)
  if (unassigned.length > 0) {
    for (var ui = 0; ui < unassigned.length; ui++) {
      var targetBucket = ui % pairBuckets.length;
      pairBuckets[targetBucket].push(unassigned[ui]);
    }
  }

  // Build batch objects (skip empty batches)
  var batches = [];
  for (var bi = 0; bi < pairs.length; bi++) {
    if (pairBuckets[bi].length === 0) continue;
    var batchSummaries = pairs[bi].map(function (wn) {
      return summaryByWeek[wn];
    }).filter(Boolean);
    batches.push({
      weekNumbers: pairs[bi],
      registry: pairBuckets[bi],
      weekSummaries: batchSummaries
    });
  }

  // Cap at 3 batches: merge smallest batches until count <= 3
  while (batches.length > 3) {
    // Find the two smallest batches by registry length
    var minIdx = 0;
    for (var mi = 1; mi < batches.length; mi++) {
      if (batches[mi].registry.length < batches[minIdx].registry.length) minIdx = mi;
    }
    // Merge smallest into its neighbor (prefer the adjacent batch)
    var mergeTarget = minIdx > 0 ? minIdx - 1 : 1;
    batches[mergeTarget].weekNumbers = batches[mergeTarget].weekNumbers.concat(batches[minIdx].weekNumbers);
    batches[mergeTarget].registry = batches[mergeTarget].registry.concat(batches[minIdx].registry);
    batches[mergeTarget].weekSummaries = batches[mergeTarget].weekSummaries.concat(batches[minIdx].weekSummaries);
    batches.splice(minIdx, 1);
    // Sort merged batch to maintain week ordering for prompt context (fix I8)
    batches[mergeTarget].weekNumbers.sort(function (a, b) { return a - b; });
    batches[mergeTarget].weekSummaries.sort(function (a, b) {
      return (a.weekNumber || 0) - (b.weekNumber || 0);
    });
  }

  return batches;
}

/**
 * mergeFragmentBatches(batchOutputs, expectedRegistry) -> { fragments, errors }
 *
 * Merges batch outputs into a single fragments array.
 * Validates:
 *   - no duplicate IDs across batches
 *   - all registry IDs present in output
 *   - final array ordered by batch sequence (deterministic)
 */
export function mergeFragmentBatches(batchOutputs, expectedRegistry) {
  var merged = [];
  var seenIds = {};
  var errors = [];

  batchOutputs.forEach(function (batchOutput, bi) {
    var frags = (batchOutput || {}).fragments || [];
    frags.forEach(function (f) {
      var nid = normalizeId(f.id);
      if (seenIds[nid]) {
        errors.push('Duplicate fragment ID across batches: ' + f.id + ' (batch ' + (bi + 1) + ')');
      } else {
        seenIds[nid] = true;
        merged.push(f);
      }
    });
  });

  // Check completeness against registry
  (expectedRegistry || []).forEach(function (entry) {
    var nid = normalizeId(entry.id);
    if (!seenIds[nid]) {
      errors.push('Missing fragment from batches: ' + entry.id);
    }
  });

  return { fragments: merged, errors: errors };
}

/**
 * buildSkeletonFragmentBatches(skeleton)
 *
 * Builds fragment batches from skeleton data.
 * The skeleton's fragmentRegistry lacks weekRef — we derive it from
 * weekPlan[].fragmentIds and weekPlan[].overflowFragmentId.
 * Delegates to the existing buildFragmentBatches() for actual grouping.
 */
export function buildSkeletonFragmentBatches(skeleton) {
  var wp = skeleton.weekPlan || [];
  var registry = skeleton.fragmentRegistry || [];

  // Build reverse mapping: fragmentId -> first week that references it
  var fragToWeek = {};
  for (var i = 0; i < wp.length; i++) {
    var fids = wp[i].fragmentIds || [];
    for (var j = 0; j < fids.length; j++) {
      if (!fragToWeek[fids[j]]) fragToWeek[fids[j]] = wp[i].weekNumber;
    }
    if (wp[i].overflowFragmentId && !fragToWeek[wp[i].overflowFragmentId]) {
      fragToWeek[wp[i].overflowFragmentId] = wp[i].weekNumber;
    }
  }

  // Enrich registry entries with weekRef for buildFragmentBatches()
  var enriched = registry.map(function (entry) {
    return Object.assign({}, entry, { weekRef: fragToWeek[entry.id] || 1 });
  });

  // Build minimal weekSummaries (just weekNumbers — enough for batching)
  var weekSummaries = wp.map(function (w) {
    return { weekNumber: w.weekNumber };
  });

  return buildFragmentBatches(enriched, weekSummaries);
}

// ── Skeleton+Flesh assembly helpers ──────────────────────────────────────────

/**
 * Flattens fragment outputs from S+F batches into a clean fragment array.
 *
 * Fragment batches may arrive as:
 *   - Array of wrapper objects: [{ fragments: [...] }, { fragments: [...] }]
 *   - Flat array of fragment objects: [{ id, documentType, ... }, ...]
 *   - Mixed: some wrappers, some bare objects
 *
 * After flattening, each fragment is aligned to the skeleton fragmentRegistry
 * to ensure `id` and `documentType` are preserved from the skeleton's plan.
 */
function flattenSkeletonFragments(fragmentOutputs, fragmentRegistry) {
  if (!fragmentOutputs || !Array.isArray(fragmentOutputs)) return [];

  // Step 1: flatten any wrapper objects
  var flat = [];
  for (var i = 0; i < fragmentOutputs.length; i++) {
    var item = fragmentOutputs[i];
    if (!item) continue;
    if (Array.isArray(item)) {
      // Already an array of fragments (direct concat from unwrapKey)
      for (var j = 0; j < item.length; j++) {
        if (item[j]) flat.push(item[j]);
      }
    } else if (item.fragments && Array.isArray(item.fragments)) {
      // Wrapper object: { fragments: [...] }
      for (var k = 0; k < item.fragments.length; k++) {
        if (item.fragments[k]) flat.push(item.fragments[k]);
      }
    } else if (item.id || item.title || item.content || item.body || item.documentType) {
      // Bare fragment object
      flat.push(item);
    }
    // else: skip unrecognized shape
  }

  // Step 2: align to skeleton registry — ensure id + documentType match
  var registry = Array.isArray(fragmentRegistry) ? fragmentRegistry : [];
  var registryById = {};
  for (var r = 0; r < registry.length; r++) {
    if (registry[r] && registry[r].id) {
      registryById[normalizeId(registry[r].id)] = registry[r];
    }
  }

  for (var f = 0; f < flat.length; f++) {
    var frag = flat[f];
    var nid = frag.id ? normalizeId(frag.id) : '';
    var regEntry = nid ? registryById[nid] : null;

    // Backfill id from registry if missing
    if (!frag.id && f < registry.length) {
      frag.id = registry[f].id;
      regEntry = registry[f];
    }

    // Backfill documentType from registry
    if (regEntry) {
      if (!frag.documentType && regEntry.documentType) {
        frag.documentType = regEntry.documentType;
      }
      // Ensure id exactly matches registry (case/format normalization)
      frag.id = regEntry.id;
    }

    // Ensure body text is at the top level for the renderer
    if (!frag.body && frag.content && typeof frag.content === 'string') {
      frag.body = frag.content;
    }
  }

  return flat;
}

/**
 * Flattens ending outputs from S+F into a clean endings array.
 *
 * Endings may arrive as:
 *   - Array of individual ending objects: [{ variant, content, ... }, ...]
 *   - Wrapper object: { endings: [...] }
 *   - Mixed shapes
 */
function flattenSkeletonEndings(endingsOutputs) {
  if (!endingsOutputs || !Array.isArray(endingsOutputs)) {
    // Might be a wrapper: { endings: [...] }
    if (endingsOutputs && endingsOutputs.endings && Array.isArray(endingsOutputs.endings)) {
      return endingsOutputs.endings;
    }
    return [];
  }

  // Check if the array contains a single wrapper object
  var flat = [];
  for (var i = 0; i < endingsOutputs.length; i++) {
    var item = endingsOutputs[i];
    if (!item) continue;
    if (item.endings && Array.isArray(item.endings)) {
      // Wrapper: { endings: [...] }
      for (var j = 0; j < item.endings.length; j++) {
        if (item.endings[j]) flat.push(item.endings[j]);
      }
    } else if (item.variant || item.content || item.body) {
      // Direct ending object
      flat.push(item);
    }
  }

  return flat;
}

// ── Skeleton+Flesh booklet assembler ────────────────────────────────────────

/**
 * Assembles the final booklet JSON from skeleton + flesh outputs.
 *
 * @param {object} skeleton       — full skeleton object (meta, theme, cover, weekPlan, bossPlan, etc.)
 * @param {object} rulesOutput    — { rulesSpread: { leftPage, rightPage } }
 * @param {object[]} weekOutputs  — array of week objects (one per weekPlan entry), in order
 * @param {object[]} fragmentOutputs — fragment data from batches (may be wrappers or flat)
 * @param {object[]} endingsOutputs  — ending data (may be wrappers or individual objects)
 * @param {object} nw             — NormalizedWorkout (for exercise overlay)
 * @returns {object} final booklet JSON
 */
export function assembleSkeletonFleshBooklet(skeleton, rulesOutput, weekOutputs, fragmentOutputs, endingsOutputs, nw) {
  var meta = skeleton.meta || {};

  // -- Base booklet structure --
  var booklet = {
    meta: {
      blockTitle:               meta.blockTitle || '',
      blockSubtitle:            meta.blockSubtitle || '',
      schemaVersion:            '1.3',
      weekCount:                weekOutputs.length,
      totalSessions:            0,
      generatedAt:              new Date().toISOString(),
      passwordEncryptedEnding:  '',
      liftoScript:              (nw && nw.rawText) ? nw.rawText : '',
      worldContract:            meta.worldContract || '',
      weeklyComponentType:      meta.weeklyComponentType || '',
      narrativeVoice:           meta.narrativeVoice || {},
      literaryRegister:         meta.literaryRegister || {},
      structuralShape:          meta.structuralShape || {},
      artifactIdentity:         meta.artifactIdentity || {}
    },
    cover: skeleton.cover || {},
    rulesSpread: (rulesOutput && rulesOutput.rulesSpread) ? rulesOutput.rulesSpread : {},
    theme: skeleton.theme || {},
    weeks: [],
    fragments: flattenSkeletonFragments(fragmentOutputs, skeleton.fragmentRegistry),
    endings: flattenSkeletonEndings(endingsOutputs || [])
  };

  // -- Weeks: merge skeleton structural fields + flesh content --
  for (var i = 0; i < weekOutputs.length; i++) {
    var week = weekOutputs[i];
    var plan = (skeleton.weekPlan && skeleton.weekPlan[i]) || {};

    // Ensure structural fields from skeleton are present
    week.weekNumber = plan.weekNumber || (i + 1);
    week.isBossWeek = !!plan.isBossWeek;
    week.isDeload = !!plan.isDeload;

    // Normalize companion components (array, not object)
    normalizeCompanionComponents(week);
    normalizeOracleKey(week);

    // Overflow flag: deterministic from session count
    if (week.sessions && week.sessions.length > 3) {
      week.overflow = true;
    }

    booklet.weeks.push(week);
  }

  // -- Exercise overlay from NormalizedWorkout --
  if (nw && nw.weeks && nw.weeks.length > 0) {
    for (var wi = 0; wi < booklet.weeks.length && wi < nw.weeks.length; wi++) {
      var nwWeek = nw.weeks[wi];
      var bWeek = booklet.weeks[wi];
      if (!bWeek.sessions || !nwWeek.sessions) continue;
      for (var si = 0; si < bWeek.sessions.length && si < nwWeek.sessions.length; si++) {
        var nwSession = nwWeek.sessions[si];
        if (nwSession.exercises && nwSession.exercises.length > 0) {
          bWeek.sessions[si].exercises = nwSession.exercises.map(function (ex) {
            return {
              name:        ex.name || 'Lift',
              sets:        ex.sets || 3,
              repsPerSet:  ex.repsPerSet || '5',
              weightField: ex.weightField !== undefined ? ex.weightField : true,
              notes:       ex.notes || ''
            };
          });
        }
        if (nwSession.dayLabel) {
          bWeek.sessions[si].label = 'Session ' + (si + 1) + ' \u00b7 ' + nwSession.dayLabel;
        }
      }
    }
  }

  // -- Normalize document types (alias resolution) --
  normalizeDocumentTypes(booklet);

  // -- Normalize overflow documents (auto-assign missing IDs, dedup collisions) --
  normalizeOverflowDocuments(booklet);

  normalizeInterludes(booklet);

  // -- Compute totalSessions --
  var totalSessions = 0;
  for (var ti = 0; ti < booklet.weeks.length; ti++) {
    totalSessions += (booklet.weeks[ti].sessions || []).length;
  }
  booklet.meta.totalSessions = totalSessions;

  // -- Enforce derived fields (boss componentInputs, password, theme normalization) --
  var enforcement = enforceBookletDerivedFields(booklet);
  if (enforcement.warnings && enforcement.warnings.length > 0) {
    enforcement.warnings.forEach(function (w) { console.warn('[S+F assembly] ' + w); });
  }

  return booklet;
}

// ── Targeted patch prompt ───────────────────────────────────────────────────

export function generatePatchPrompt(rawJson, errors, options) {
  options = options || {};
  var contractLines = formatIdentityContractLines(options.identityContract || null);
  return [
    'You are a JSON repair specialist.',
    '',
    'The JSON below has validation errors. Fix ONLY the listed errors.',
    '',
    'RULES:',
    '- Output ONLY the corrected JSON. No markdown fences, no commentary, no explanation.',
    '- Preserve all unaffected content exactly as-is.',
    '- Do not rewrite the booklet into a safer or more generic form.',
    '- The output must be valid, parseable JSON.',
    contractLines.length ? '' : null,
    contractLines.length ? '## Identity Contract' : null,
    contractLines.length ? contractLines.join('\n') : null,
    '',
    '## Errors to Fix',
    errors.map(function (e) { return '- ' + e; }).join('\n'),
    '',
    '## JSON',
    '',
    rawJson
  ].filter(Boolean).join('\n');
}
