// ── Assembly & continuity module ─────────────────────────────────────────────
// Extracted from api-generator.js IIFE — booklet assembly, identity contracts,
// continuity ledger, fragment batching, and derivation helpers.

import { DOCUMENT_TYPE_ALIASES, SUPPORTED_THEME_ARCHETYPES, THEME_ARCHETYPE_ALIASES,
  SCHEMA_VERSION,
  MARK_STRIP, MARK_STRIP_TARGET_KINDS, RECKONING_SINK_KINDS, RECKONING_THRESHOLD_RATIO,
  // D128 → W4a: `_assemblyDiagnostics` is pipeline debris and belongs under
  // `_x` like the other nine. api-generator.js reads and deletes it there.
  writePipelineDebris
} from './constants.js';
import {
  isValidWorkspaceStyle,
  resolveWorkspaceStyle,
  isStandardAlphaTable,
  decodeA1Z26,
  resolveShellFamily,
  resolveFamilyBoardModes,
  DEFAULT_WORKSPACE_STYLE,
  VALID_COMPONENT_DIALECTS
} from '../../contracts/contract-constants.mjs';

// W5b — the difficulty instrument. The solvers measure how much work a puzzle
// actually took to prove; this module is where a DERIVED field gets written,
// so the stamp lives here rather than in the validator that also runs them (a
// validator that mutates is a validator nobody can reason about).
import {
  verifyConstrainedGrid,
  verifyWordGrid
} from '../../contracts/puzzle-solvers.mjs';

// ── Structured Layer 2 diagnostics ──────────────────────────────────────────
// Machine-readable diagnostic entries for assembly/normalization repairs.
// Satisfies docs/layer2/ADAPTER-CONTRACT.md §9 (Diagnostics Contract).

/**
 * createDiagnostic(code, severity, phase, message, opts?) -> DiagnosticEntry
 *
 * @param {string} code        - Stable machine-readable category (e.g. 'companion-normalized')
 * @param {string} severity    - 'warning' | 'error'
 * @param {string} phase       - 'normalize' | 'reconcile' | 'validate' | 'synthesize'
 * @param {string} message     - Human-readable explanation
 * @param {object} [opts]      - Optional fields: { path, repairable, correction }
 * @returns {object} plain diagnostic entry (JSON-serialization-safe)
 */
export function createDiagnostic(code, severity, phase, message, opts) {
  var d = {
    code: code,
    severity: severity,
    phase: phase,
    message: message,
    repairable: !!(opts && opts.repairable)
  };
  if (opts && opts.path) d.path = opts.path;
  if (opts && opts.correction) d.correction = opts.correction;
  return d;
}

// ── ID normalisation ────────────────────────────────────────────────────────
// Soft matching for fragment IDs: punctuation and zero-padding differences are
// treated as the same identity. "F.01" vs "F-01" vs "F.001" all match.
// Used in validation and continuity alignment only — never rewrites IDs in the
// booklet unless a later repair step explicitly chooses to do so.

export function normalizeId(id) {
  return String(id || '')
    .toLowerCase()
    .replace(/[-_.\s]/g, '')
    .replace(/\d+/g, function (digits) {
      var value = parseInt(digits, 10);
      return Number.isFinite(value) ? String(value) : digits;
    });
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

export function toSlugToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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

// inferShellFamily() and its normalizeShellFamilyValue() wrapper are NOT
// defined here. resolveShellFamily() in contracts/contract-constants.mjs
// (imported above) owns that decision for both trees. The copy that lived here
// disagreed with the renderer's on 114 of 600 identity combinations: it fed a
// shellFamily token it had just rejected back into inference, and its archetype
// fallback knew only 'government'. See D93 and the function's header.

var SUPPORTED_BOARD_STATE_MODES = {
  'survey-grid': true,
  'node-graph': true,
  'timeline-reconstruction': true,
  'testimony-matrix': true,
  'ledger-board': true,
  'route-tracker': true,
  'profile-assembly': true,
  'player-drawn': true
};

var SUPPORTED_ATTACHMENT_STRATEGIES = {
  'split-technical': true,
  'single-dominant': true,
  'narrative-support': true
};

function normalizeBoardStateModeToken(value) {
  var token = toSlugToken(value);
  if (!token) return '';
  if (SUPPORTED_BOARD_STATE_MODES[token]) return token;
  if (token === 'grid' || token === 'survey' || token === 'field-survey') return 'survey-grid';
  if (token === 'point-to-point') return 'node-graph';
  if (token === 'linear-track' || token === 'route' || token === 'route-board') return 'route-tracker';
  if (token === 'timeline' || token === 'chronological' || token === 'chronology') return 'timeline-reconstruction';
  if (token === 'testimony' || token === 'witness-matrix' || token === 'evidence-matrix') return 'testimony-matrix';
  if (token === 'ledger' || token === 'audit-ledger') return 'ledger-board';
  if (token === 'profile' || token === 'profile-board') return 'profile-assembly';
  if (token === 'player' || token === 'sketch-map') return 'player-drawn';
  return '';
}

function inferBoardStateModeFromContext(shell, campaignPlan) {
  // The declared mechanic grammar family speaks FIRST (Wave 2). Before this,
  // a booklet could declare `siege` in its planning contract and be handed a
  // board inferred from the phrase "gauge" in its component type — the intent
  // contract was binding on every downstream stage except the one field it
  // most directly determines. The guidance's first candidate is the family's
  // default reading; an explicit boardStateMode still wins outright (this
  // function only runs when there isn't one), so a family that wants its
  // second candidate simply says so.
  var family = (((shell || {}).meta || {}).artifactIntent || {}).mechanicGrammarFamily;
  var guided = resolveFamilyBoardModes(family);
  if (guided.length) return guided[0];

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

export function inferBoardStateMode(shell, campaignPlan) {
  var metaIdentity = (((shell || {}).meta || {}).artifactIdentity || {});
  var normalized = normalizeBoardStateModeToken(metaIdentity.boardStateMode);
  if (normalized) return normalized;
  return inferBoardStateModeFromContext(shell, campaignPlan);
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

function normalizeAttachmentStrategyValue(value, shellFamily, boardStateMode) {
  var token = toSlugToken(value);
  if (SUPPORTED_ATTACHMENT_STRATEGIES[token]) return token;
  if (token.indexOf('narrative') !== -1 || token.indexOf('story') !== -1) return 'narrative-support';
  if (token.indexOf('single') !== -1 || token.indexOf('dominant') !== -1 || token.indexOf('binder') !== -1) {
    return 'single-dominant';
  }
  if (
    token.indexOf('split') !== -1
    || token.indexOf('technical') !== -1
    || token.indexOf('loose') !== -1
    || token.indexOf('insert') !== -1
    || token.indexOf('append') !== -1
    || token.indexOf('packet') !== -1
  ) {
    return 'split-technical';
  }
  return inferAttachmentStrategy(shellFamily, boardStateMode);
}

export function normalizeArtifactIdentity(rawIdentity, shell, campaignPlan) {
  var identity = rawIdentity && typeof rawIdentity === 'object' ? rawIdentity : {};
  var themeArchetype = String((((shell || {}).theme || {}).visualArchetype) || '').toLowerCase();
  var artifactClass = firstNonEmpty(identity.artifactClass, inferArtifactClassFromShell(shell));
  var shellFamily = resolveShellFamily(identity.shellFamily, artifactClass, themeArchetype);
  var boardStateMode = normalizeBoardStateModeToken(identity.boardStateMode) || inferBoardStateModeFromContext(shell, campaignPlan);
  var attachmentStrategy = normalizeAttachmentStrategyValue(identity.attachmentStrategy, shellFamily, boardStateMode);
  var componentDialect = String(identity.componentDialect || '').trim().toLowerCase();

  var out = {
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

  // ── componentDialect (D105, caught by the Teeth Round T1b bench run) ───────
  // This normalizer returns a WHITELIST, so a field absent from the literal is
  // not passed through — it is deleted. componentDialect was missing from that
  // literal from the day D105 added the field, which made it write-only on the
  // generated path: the shell stage authored a dialect, ensureArtifactIdentity
  // dropped it, and theme.js's resolveComponentDialect fell back to the default
  // with nothing logged anywhere. The Teeth Round's F2 floor turned that into a
  // real cost — the model is now BLOCKED until it declares a dialect, and every
  // one of those retries was buying a value this function then discarded. The
  // stub bench is what surfaced it: the shell validated carrying `gauge` and
  // the delivered booklet carried no dialect at all.
  //
  // ASSIGNED ONLY WHEN VALID, rather than always with a blank fallback, for two
  // reasons that point the same way. `componentDialect` is a CLOSED enum in
  // booklet-schema.mjs with no empty member, so a blank would make every
  // dialect-less booklet fail its own schema; and the value is stamped straight
  // into the `data-component-dialect` attribute the CSS selects on, where an
  // unrecognized string is a dialect that silently draws nothing. Absence is
  // the shape the schema and the renderer both already know how to read.
  if (VALID_COMPONENT_DIALECTS.indexOf(componentDialect) !== -1) {
    out.componentDialect = componentDialect;
  }
  return out;
}

export function ensureArtifactIdentity(shell, campaignPlan) {
  if (!shell || typeof shell !== 'object') return null;
  if (!shell.meta) shell.meta = {};
  var normalized = normalizeArtifactIdentity(shell.meta.artifactIdentity, shell, campaignPlan);
  shell.meta.artifactIdentity = normalized;
  return normalized;
}

// ── Board-state mode truthing ─────────────────────────────────────────────
// After assembly, the booklet's weeks contain actual mapState.mapType values.
// If the declared boardStateMode disagrees with the dominant observed map type,
// correct it to reflect truth.  This is a narrow, defensible truthing rule:
// we only override when the current value is a generic fallback AND the weeks
// clearly use something else.

var MAP_TYPE_TO_BOARD_STATE = {
  'grid':            'survey-grid',
  'point-to-point':  'node-graph',
  'linear-track':    'route-tracker',
  'player-drawn':    'player-drawn'
};

/**
 * truthBoardStateMode(booklet, diag?) -> void
 *
 * Inspects assembled weeks for actual mapState.mapType values and corrects
 * meta.artifactIdentity.boardStateMode when the declared value is clearly
 * wrong.  Only fires when:
 *   1. The booklet has assembled weeks with mapType data
 *   2. The current boardStateMode does not match the dominant observed type
 *
 * Mutates booklet.meta.artifactIdentity in place.
 */
export function truthBoardStateMode(booklet, diag) {
  if (!booklet || !booklet.weeks || booklet.weeks.length === 0) return;

  var identity = ((booklet.meta || {}).artifactIdentity) || {};
  var current = String(identity.boardStateMode || '').toLowerCase();

  // Collect map types from non-boss weeks
  var typeCounts = {};
  var total = 0;
  booklet.weeks.forEach(function (week) {
    if (week.isBossWeek) return;
    var fo = week.fieldOps || {};
    var map = fo.map || fo.mapState || {};
    var mt = String(map.mapType || '').trim().toLowerCase();
    if (mt) {
      typeCounts[mt] = (typeCounts[mt] || 0) + 1;
      total++;
    }
  });

  if (total === 0) return; // no map data to truth against

  // Find dominant map type (highest count)
  var dominant = '';
  var dominantCount = 0;
  for (var mt in typeCounts) {
    if (typeCounts[mt] > dominantCount) {
      dominant = mt;
      dominantCount = typeCounts[mt];
    }
  }

  if (!dominant) return;

  var expectedBoardState = MAP_TYPE_TO_BOARD_STATE[dominant] || '';
  if (!expectedBoardState) return;

  // Only correct if current value disagrees with observed truth
  if (current === expectedBoardState) return;

  var oldVal = current || '(empty)';
  if (!booklet.meta) booklet.meta = {};
  if (!booklet.meta.artifactIdentity) booklet.meta.artifactIdentity = {};
  booklet.meta.artifactIdentity.boardStateMode = expectedBoardState;

  var msg = 'boardStateMode truthed from "' + oldVal + '" to "' + expectedBoardState +
    '" based on dominant mapType "' + dominant + '" (' + dominantCount + '/' + total + ' weeks)';
  console.warn('[LiftRPG] ' + msg);
  if (diag) {
    diag.push(createDiagnostic('boardstate-mode-truthed', 'warning', 'post-assembly-truth', msg,
      { path: 'meta.artifactIdentity.boardStateMode', repairable: true,
        correction: oldVal + ' → ' + expectedBoardState }));
  }
}

// ── Artifact intent preservation ──────────────────────────────────────────
// Ensures meta.artifactIntent survives assembly when it existed upstream.
// Does not invent intent — only preserves what was already declared.

function preserveArtifactIntent(booklet, upstreamMeta) {
  if (!upstreamMeta || !upstreamMeta.artifactIntent) return;
  if (!booklet.meta) booklet.meta = {};
  if (!booklet.meta.artifactIntent) {
    booklet.meta.artifactIntent = cloneSimple(upstreamMeta.artifactIntent);
  }
}

// ── Identity preservation diagnostics ─────────────────────────────────────
// Detects silent regressions in artifact metadata preservation.

/**
 * diagnoseIdentityPreservation(booklet, upstreamMeta, diag) -> void
 *
 * Checks for:
 *   1. artifactIntent existed upstream but vanished in the final booklet
 *   2. boardStateMode clearly disagrees with the assembled booklet's map mode
 *   3. artifactIdentity fields that are blank when upstream had values
 *
 * Appends diagnostics to diag array. Does not mutate the booklet.
 */
export function diagnoseIdentityPreservation(booklet, upstreamMeta, diag) {
  if (!diag) return;
  var bMeta = booklet.meta || {};
  var uMeta = upstreamMeta || {};

  // 1. artifactIntent loss
  if (uMeta.artifactIntent && !bMeta.artifactIntent) {
    diag.push(createDiagnostic('artifact-intent-lost', 'warning', 'post-assembly-truth',
      'meta.artifactIntent existed in upstream shell but is missing in final booklet',
      { path: 'meta.artifactIntent', repairable: false }));
  }

  // 2. artifactIdentity field blanking
  var uIdentity = uMeta.artifactIdentity || {};
  var bIdentity = bMeta.artifactIdentity || {};
  // componentDialect joins the list with the fix above: it is exactly the kind
  // of field this scan exists for — declared once at the shell stage, read once
  // by the renderer, and invisible in between. The drop it would have caught
  // survived from D105 to the Teeth Round because nothing watched this field.
  var identityFields = ['artifactClass', 'shellFamily', 'boardStateMode', 'openingMode',
    'rulesDeliveryMode', 'unlockLogic', 'attachmentStrategy', 'materialCulture',
    'annotationCulture', 'documentEcology', 'revealShape', 'authorialMode',
    'componentDialect'];

  identityFields.forEach(function (field) {
    var uVal = uIdentity[field];
    var bVal = bIdentity[field];
    if (uVal && typeof uVal === 'string' && uVal.trim() && (!bVal || !String(bVal).trim())) {
      diag.push(createDiagnostic('identity-field-blanked', 'warning', 'post-assembly-truth',
        'artifactIdentity.' + field + ' was "' + uVal + '" upstream but is blank in final booklet',
        { path: 'meta.artifactIdentity.' + field, repairable: false }));
    }
  });
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
    artifactIdentity: cloneSimple(meta.artifactIdentity) || null,
    // Wave 2: the planning contract travels with the identity contract. Both
    // are shell-stage commitments that later stages must not drift from, and
    // keeping them in separate channels is how one of them got forgotten.
    artifactIntent: cloneSimple(meta.artifactIntent) || null
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
  // Wave 2: the planning contract is as un-normalizable as the identity one.
  // A repair pass that "fixes" a booklet by dropping its declared family has
  // repaired it into the generic book this contract exists to prevent.
  var intent = contract.artifactIntent;
  if (intent) {
    lines.push('- Keep meta.artifactIntent exactly as provided — it is a planning contract, not metadata.');
    if (intent.mechanicGrammarFamily) lines.push('- Do not change mechanicGrammarFamily: ' + intent.mechanicGrammarFamily);
    if (intent.arcFamily) lines.push('- Do not change arcFamily: ' + intent.arcFamily);
    if (intent.convergencePattern) lines.push('- Do not change convergencePattern: ' + intent.convergencePattern);
    // The mode die's answer is a planning decision like the three above: a
    // revision that quietly re-modes the finale has re-rolled a die the run
    // already threw, and the settlement declarations downstream would then be
    // conforming to a mode nothing assigned.
    if (intent.endingMode) lines.push('- Do not change endingMode: ' + intent.endingMode);
  }
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
  // The Layer 3 planning contract (Wave 2). This channel is how the
  // multi-stage pipeline's week, fragment, and ending prompts see the shell —
  // and until now artifactIntent was not in it, so that pipeline compiled a
  // binding contract at the shell stage and then wrote every word of the
  // booklet without ever showing it to the writer. The S+F pipeline had the
  // contract from the start (generator.js formatArtifactIntentContract); this
  // is the same material on the other path, rendered by the same formatter.
  if (meta.artifactIntent) { ctx.artifactIntent = meta.artifactIntent; hasContent = true; }
  // The currency (D144), and it is D103's row again with a different field.
  // INST_MARK_SURFACE demands every week's reckoning sentence print
  // `meta.economy.currencyLabel` VERBATIM, and currencyMentionVerdict grades
  // every week against it — but this projection is how the multi-stage
  // pipeline's week prompts see the shell, and the label was not in it. The
  // week stage was being asked to reproduce a phrase it had never been shown.
  // Measured consequence: F04 failed 17 of 18 weeks across three pipeline
  // books. Its S+F twin is extractSkeletonContext in generator.js; both carry
  // it or one pipeline writes blind.
  if (meta.economy) { ctx.economy = meta.economy; hasContent = true; }
  // The knowing (§11 Wave 1.5). This is the whole point of the shell-context
  // channel for the process particulars: week-final, fragment, and ending
  // prompts all read their world through this projection, so a particular that
  // does not reach here funds nothing. Absent on any booklet planned before
  // the knowing stage existed — every consumer tolerates its absence.
  if (meta.processParticulars) { ctx.processParticulars = meta.processParticulars; hasContent = true; }
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

/**
 * stampPuzzleDifficulty(week)   (W5b)
 *
 * Record how hard each puzzle in this week actually was, measured by the same
 * solver that proves it — inference-chain depth for a logic grid, line-solve
 * passes for a nonogram, scan load for a word search.
 *
 * MACHINE-WRITTEN, NEVER AUTHORED. The prompt does not mention `difficulty`,
 * so a model has no reason to invent one; if one arrives anyway it is
 * overwritten, because a number nobody measured is worse than no number. Only
 * a puzzle that PASSES gets stamped: a failing solve has no honest score, and
 * the week is about to be refused anyway.
 *
 * Nothing consumes this yet. It exists so a later wave can key puzzle hardness
 * to the load curve (the sudoku-academy law) without re-solving the book to
 * find out how hard it was — W5b records, and builds no curve enforcement.
 */
export function stampPuzzleDifficulty(week) {
  var fo = (week || {}).fieldOps;
  if (!fo) return;
  if (fo.constrainedGrid) {
    var g = verifyConstrainedGrid(fo.constrainedGrid);
    if (g.ok && g.difficulty) {
      fo.constrainedGrid.difficulty = { score: g.difficulty.score, basis: g.difficulty.basis };
    } else {
      delete fo.constrainedGrid.difficulty;
    }
  }
  if (fo.wordGrid) {
    var w = verifyWordGrid(fo.wordGrid);
    if (w.ok && w.difficulty) {
      fo.wordGrid.difficulty = { score: w.difficulty.score, basis: w.difficulty.basis };
    } else {
      delete fo.wordGrid.difficulty;
    }
  }
}

export function autoRepairWeek(result, context) {
  if (!result) return result;
  normalizeCompanionComponents(result);
  normalizeOracleKey(result);
  normalizeOracleEntryKeys(result);
  stampPuzzleDifficulty(result);
  if (Array.isArray(result.sessions)) {
    result.overflow = result.sessions.length > 3;
  }

  // weeklyComponent.type alignment: if shell declares weeklyComponentType and
  // this week's weeklyComponent.type drifted, align to the authoritative value.
  // Preserves value and extractionInstruction — only corrects the type label.
  if (context && context.weeklyComponentType && result.weeklyComponent && !result.isBossWeek) {
    var wcType = result.weeklyComponent.type || '';
    var expectedType = context.weeklyComponentType;
    var normalizedWc = wcType.trim().toLowerCase().replace(/_/g, ' ');
    var normalizedExpected = expectedType.trim().toLowerCase().replace(/_/g, ' ');
    if (wcType && normalizedWc !== normalizedExpected) {
      var oldType = result.weeklyComponent.type;
      result.weeklyComponent.type = expectedType;
      console.warn('[autoRepairWeek] weeklyComponent.type "' + oldType + '" → "' + expectedType +
        '" (aligned to shell authority for week ' + (result.weekNumber || '?') + ')');
      if (!result._overflowRepairs) result._overflowRepairs = [];
      result._overflowRepairs.push({
        code: 'weekly-component-type-aligned',
        severity: 'warning',
        phase: 'reconcile',
        message: 'Week ' + (result.weekNumber || '?') + ' weeklyComponent.type "' + oldType +
          '" aligned to shell weeklyComponentType "' + expectedType + '"',
        repairable: true,
        path: 'weeks[' + (result.weekNumber || '?') + '].weeklyComponent.type',
        correction: oldType + ' → ' + expectedType
      });
    }
  }

  // fragmentRef alignment: repair invalid session/oracle fragmentRefs when
  // the week plan declares exactly one approved fragment for the position.
  if (context && context.approvedFragmentIds) {
    var approvedSet = {};
    (context.approvedFragmentIds || []).forEach(function (id) {
      approvedSet[normalizeId(id)] = id;
    });
    var overflowId = context.overflowFragmentId
      ? normalizeId(context.overflowFragmentId)
      : null;
    if (overflowId && context.overflowFragmentId) {
      approvedSet[overflowId] = context.overflowFragmentId;
    }

    // Repair session fragmentRefs
    (result.sessions || []).forEach(function (session, si) {
      if (session.fragmentRef && !approvedSet[normalizeId(session.fragmentRef)]) {
        // Try to find an unambiguous match by normalized similarity
        var candidates = Object.keys(approvedSet);
        if (candidates.length === 1) {
          var oldRef = session.fragmentRef;
          session.fragmentRef = approvedSet[candidates[0]];
          if (!result._overflowRepairs) result._overflowRepairs = [];
          result._overflowRepairs.push({
            code: 'fragment-ref-aligned',
            severity: 'warning',
            phase: 'reconcile',
            message: 'Week ' + (result.weekNumber || '?') + ' session ' + (si + 1) +
              ' fragmentRef "' + oldRef + '" aligned to sole approved ID "' + session.fragmentRef + '"',
            repairable: true,
            path: 'weeks[' + (result.weekNumber || '?') + '].sessions[' + si + '].fragmentRef',
            correction: oldRef + ' → ' + session.fragmentRef
          });
        }
      }
    });

    // Repair oracle fragmentRefs
    var oracle = (result.fieldOps || {}).oracleTable || (result.fieldOps || {}).oracle || {};
    (oracle.entries || []).forEach(function (entry, ei) {
      if (entry.fragmentRef && !approvedSet[normalizeId(entry.fragmentRef)]) {
        var candidates = Object.keys(approvedSet);
        if (candidates.length === 1) {
          var oldRef = entry.fragmentRef;
          entry.fragmentRef = approvedSet[candidates[0]];
          if (!result._overflowRepairs) result._overflowRepairs = [];
          result._overflowRepairs.push({
            code: 'fragment-ref-aligned',
            severity: 'warning',
            phase: 'reconcile',
            message: 'Week ' + (result.weekNumber || '?') + ' oracle[' + ei +
              '] fragmentRef "' + oldRef + '" aligned to sole approved ID "' + entry.fragmentRef + '"',
            repairable: true,
            path: 'weeks[' + (result.weekNumber || '?') + '].fieldOps.oracle.entries[' + ei + '].fragmentRef',
            correction: oldRef + ' → ' + entry.fragmentRef
          });
        }
      }
    });
  }

  // Overflow-registry reconciliation: if this week has an overflow document
  // and there is exactly one planned overflow entry for this week number,
  // deterministically align the ID (and optionally documentType) to the
  // authoritative registry entry. This prevents retry loops over a purely
  // mechanical ID mismatch.
  if (context && result.overflowDocument && result.overflow) {
    var weekNum = result.weekNumber || (context.weekNumber);
    var overflowRegistry = (context.overflowRegistry || []);
    var plannedEntries = overflowRegistry.filter(function (entry) {
      return entry.weekNumber === weekNum;
    });
    if (plannedEntries.length === 1) {
      var planned = plannedEntries[0];
      var currentId = result.overflowDocument.id || '';
      if (normalizeId(currentId) !== normalizeId(planned.id)) {
        console.warn('[autoRepairWeek] Overflow ID "' + currentId + '" → "' + planned.id +
          '" (aligned to overflowRegistry for week ' + weekNum + ')');
        result.overflowDocument.id = planned.id;
        // Track the repair for diagnostics
        if (!result._overflowRepairs) result._overflowRepairs = [];
        result._overflowRepairs.push({
          code: 'overflow-registry-aligned',
          severity: 'warning',
          phase: 'reconcile',
          message: 'Week ' + weekNum + ' overflowDocument.id "' + currentId +
            '" aligned to planned registry entry "' + planned.id + '"',
          repairable: true,
          path: 'weeks[' + weekNum + '].overflowDocument.id',
          correction: currentId + ' → ' + planned.id
        });
      }
      // Also align documentType if it's missing or is a known alias
      if (planned.documentType) {
        var currentDt = result.overflowDocument.documentType || '';
        var canonicalDt = DOCUMENT_TYPE_ALIASES[currentDt] || currentDt;
        var plannedDt = DOCUMENT_TYPE_ALIASES[planned.documentType] || planned.documentType;
        if (!currentDt || (canonicalDt !== plannedDt)) {
          result.overflowDocument.documentType = planned.documentType;
        }
      }
    }
  }

  // Final default: if documentType is STILL missing after planned-registry
  // alignment (the skeleton's registry entry may itself lack a type — the
  // 2026-08-11 live run failed exactly here, 4 retries deep), default to
  // 'report', the most neutral member of DOCUMENT_TYPE_ENUM. Deterministic
  // derivation-as-repair (D89/D78 family): a paid week stage must never die
  // on a field the pipeline can fill by rule. Paired with the REPAIRABLE
  // classification in validation.js — that promise is only honest because
  // this default exists.
  if (result.overflowDocument && typeof result.overflowDocument === 'object' &&
      !result.overflowDocument.documentType) {
    result.overflowDocument.documentType = 'report';
    if (!result._overflowRepairs) result._overflowRepairs = [];
    result._overflowRepairs.push({
      code: 'overflow-documenttype-defaulted',
      severity: 'warning',
      phase: 'reconcile',
      message: 'Week ' + weekNum + ' overflowDocument.documentType was missing (model omitted it; planned registry carried none) — defaulted to "report"',
      repairable: true,
      path: 'weeks[' + weekNum + '].overflowDocument.documentType',
      correction: '(missing) → report'
    });
  }

  // Canonicalize overflow document type aliases regardless of whether a
  // planned registry entry exists. This brings week-level ingestion into
  // parity with full-booklet assembly normalization (normalizeDocumentTypes)
  // so guided-build week validation sees canonical types before checking enums.
  if (result.overflowDocument && result.overflowDocument.documentType) {
    var rawDt = result.overflowDocument.documentType;
    var canonical = DOCUMENT_TYPE_ALIASES[rawDt];
    if (canonical) {
      result.overflowDocument.documentType = canonical;
      console.warn('[autoRepairWeek] Overflow documentType "' + rawDt + '" → "' + canonical + '"');
      if (!result._overflowRepairs) result._overflowRepairs = [];
      result._overflowRepairs.push({
        code: 'overflow-document-type-alias',
        severity: 'warning',
        phase: 'normalize',
        message: 'Week ' + (result.weekNumber || '?') + ' overflowDocument.documentType "' + rawDt +
          '" canonicalized to "' + canonical + '"',
        repairable: true,
        path: 'weeks[' + (result.weekNumber || '?') + '].overflowDocument.documentType',
        correction: rawDt + ' → ' + canonical
      });
    }
  }

  return result;
}

// ── Normalization helpers ───────────────────────────────────────────────────

// Normalize companionComponents: model sometimes returns an object keyed by
// component name instead of the expected array. Convert in place.
export function normalizeCompanionComponents(week, diag) {
  var fo = week.fieldOps || week.bossEncounter;
  if (!fo || !fo.companionComponents) return;
  if (Array.isArray(fo.companionComponents)) return;
  if (typeof fo.companionComponents === 'object' && fo.companionComponents !== null) {
    var cc = fo.companionComponents;
    var keys = Object.keys(cc);
    fo.companionComponents = keys.map(function (key) {
      var val = cc[key];
      if (typeof val === 'object' && val !== null) {
        if (!val.type) val.type = key;
        return val;
      }
      return { type: key, value: val };
    });
    var msg = 'Normalized companionComponents from object to array (' + fo.companionComponents.length + ' items)';
    console.warn('[LiftRPG] ' + msg);
    if (diag) {
      diag.push(createDiagnostic('companion-object-to-array', 'warning', 'normalize', msg, {
        path: 'week ' + (week.weekNumber || '?') + '.fieldOps.companionComponents',
        repairable: true,
        correction: 'Converted object {' + keys.join(', ') + '} to array'
      }));
    }
  }
}

// Normalize documentType aliases (e.g. 'letter' -> 'correspondence') on
// fragments, overflow documents, and endings in place.
export function normalizeDocumentTypes(booklet, diag) {
  // Missing-type backstop (2026-08-11): the artifact schema REQUIRES
  // documentType on every fragment-shaped object, so assembly must guarantee
  // it — default 'report' (neutral enum member) with a diagnostic. Mirrors
  // the week-level default in autoRepairWeek; keeps Ajv from failing a
  // finished paid booklet on a fillable field.
  (booklet.fragments || []).forEach(function (f) {
    if (f && typeof f === 'object' && !f.documentType) {
      f.documentType = 'report';
      if (diag) {
        diag.push(createDiagnostic('document-type-defaulted', 'warning', 'normalize',
          'Fragment "' + (f.id || '?') + '" documentType was missing — defaulted to "report"',
          { path: 'fragments[' + (f.id || '?') + '].documentType', repairable: true, correction: '(missing) → report' }));
      }
    }
  });
  (booklet.weeks || []).forEach(function (week, wi) {
    if (week.overflowDocument && typeof week.overflowDocument === 'object' && !week.overflowDocument.documentType) {
      week.overflowDocument.documentType = 'report';
      if (diag) {
        diag.push(createDiagnostic('document-type-defaulted', 'warning', 'normalize',
          'Week ' + (wi + 1) + ' overflowDocument documentType was missing — defaulted to "report"',
          { path: 'weeks[' + wi + '].overflowDocument.documentType', repairable: true, correction: '(missing) → report' }));
      }
    }
  });
  (booklet.fragments || []).forEach(function (f) {
    if (f.documentType && DOCUMENT_TYPE_ALIASES[f.documentType]) {
      var from = f.documentType;
      f.documentType = DOCUMENT_TYPE_ALIASES[f.documentType];
      if (diag) {
        diag.push(createDiagnostic('document-type-alias', 'warning', 'normalize',
          'Fragment "' + (f.id || '?') + '" documentType "' + from + '" resolved to "' + f.documentType + '"',
          { path: 'fragments[' + (f.id || '?') + '].documentType', repairable: true, correction: from + ' → ' + f.documentType }));
      }
    }
  });
  (booklet.weeks || []).forEach(function (week, wi) {
    if (week.overflowDocument && week.overflowDocument.documentType && DOCUMENT_TYPE_ALIASES[week.overflowDocument.documentType]) {
      var from = week.overflowDocument.documentType;
      week.overflowDocument.documentType = DOCUMENT_TYPE_ALIASES[week.overflowDocument.documentType];
      if (diag) {
        diag.push(createDiagnostic('document-type-alias', 'warning', 'normalize',
          'Week ' + (wi + 1) + ' overflowDocument documentType "' + from + '" resolved to "' + week.overflowDocument.documentType + '"',
          { path: 'weeks[' + wi + '].overflowDocument.documentType', repairable: true, correction: from + ' → ' + week.overflowDocument.documentType }));
      }
    }
  });
  (booklet.endings || []).forEach(function (ending, ei) {
    var content = ending.content;
    if (content && content.documentType && DOCUMENT_TYPE_ALIASES[content.documentType]) {
      var from = content.documentType;
      content.documentType = DOCUMENT_TYPE_ALIASES[content.documentType];
      if (diag) {
        diag.push(createDiagnostic('document-type-alias', 'warning', 'normalize',
          'Ending ' + (ei + 1) + ' documentType "' + from + '" resolved to "' + content.documentType + '"',
          { path: 'endings[' + ei + '].content.documentType', repairable: true, correction: from + ' → ' + content.documentType }));
      }
    }
  });
}

// ── THE LITERAL `\n` SWEEP (the D21 tooling-owned-repair precedent) ─────────
//
// A model that is asked for JSON sometimes answers with a string containing
// the two CHARACTERS backslash and n where it meant a line break. The JSON is
// valid, every schema check passes, every gate is green — and the printed page
// carries the glyphs `\n` in the middle of a cipher instruction. Week 4 of the
// first delivered book printed exactly that.
//
// This is a normalization, not a validation: the same class as schemaVersion
// (D21) — tooling owns the repair, the model is never blocked for it, and the
// count is REPORTED so a silent rewrite is impossible.
//
// THE DENYLIST IS THE WHOLE SAFETY ARGUMENT. A conversion is only ever
// applied to prose/content fields. Identifiers, cross-references, URLs, hex
// colours, ciphertext and enum tokens are skipped by KEY NAME, because in
// those a backslash is either impossible (so the sweep is a no-op) or
// load-bearing (so the sweep would corrupt it). Skipping too much costs a
// missed repair; skipping too little corrupts a booklet — the asymmetry
// decides the default.
//
// `_x` is skipped wholesale: pipeline debris is machine-written, never
// printed, and carries base64 and serialized payloads.
// Matched on WORDS, not substrings, so the camelCase tail of `fragmentId`,
// `weekRef`, `accentColor` and `mapType` is seen while `typewriterBody` and
// `keystoneScene` are not falsely caught by `type` / `key`.
var ESCAPED_WHITESPACE_SKIP_WORDS = {
  id: 1, ids: 1, ref: 1, refs: 1, url: 1, urls: 1, href: 1, link: 1,
  color: 1, colors: 1, colour: 1, colours: 1, hex: 1,
  // NOT `cipherText`: that is the printed puzzle, it is prose to this sweep,
  // and it is the field week 4 of the first delivered book got wrong. The
  // crypto blob is caught by `password` / `encrypted` instead.
  password: 1, encrypted: 1, hash: 1, salt: 1,
  key: 1, keys: 1, slug: 1, token: 1, seed: 1, fingerprint: 1,
  type: 1, types: 1, family: 1, archetype: 1, dialect: 1, style: 1,
  mode: 1, variant: 1, version: 1, path: 1, paths: 1
};

function escapedWhitespaceKeyWords(key) {
  return String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ');
}

function skipsEscapedWhitespace(key) {
  var name = String(key || '');
  if (name.charAt(0) === '_') return true;
  var words = escapedWhitespaceKeyWords(name);
  for (var i = 0; i < words.length; i++) {
    if (ESCAPED_WHITESPACE_SKIP_WORDS[words[i]]) return true;
  }
  return false;
}

function convertEscapedWhitespace(value) {
  // Only the two-character sequences. A real newline already in the string is
  // untouched, and `\\n` (an author's deliberate escaped backslash) is left
  // alone because the backslash before it is consumed by the alternation.
  return value.replace(/\\\\|\\n|\\t/g, function (match) {
    if (match === '\\n') return '\n';
    if (match === '\\t') return '\t';
    return match;
  });
}

/**
 * normalizeEscapedWhitespace(booklet, diag) -> number
 *
 * Walks every string in the assembled booklet and converts literal `\n` / `\t`
 * two-character sequences into the real characters. Returns the number of
 * STRINGS changed (not the number of sequences), which is the number the run
 * note reports.
 */
export function normalizeEscapedWhitespace(booklet, diag) {
  var converted = 0;
  var paths = [];

  function convertAt(container, slot, here) {
    var value = container[slot];
    if (value.indexOf('\\n') === -1 && value.indexOf('\\t') === -1) return;
    var next = convertEscapedWhitespace(value);
    if (next === value) return;
    container[slot] = next;
    converted++;
    if (paths.length < 12) paths.push(here);
  }

  // An array inherits its OWN key's verdict: `sections[].lines` is prose and is
  // swept, `fragmentIds` is not, because the denylist already answered at the
  // key that owns the array. Without this inheritance every prose list in the
  // book (rules lines, oracle rows, clue stacks) would be silently exempt.
  function walk(node, path, eligible) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(function (entry, i) {
        var here = path + '[' + i + ']';
        if (typeof entry === 'string') {
          if (eligible) convertAt(node, i, here);
          return;
        }
        walk(entry, here, eligible);
      });
      return;
    }
    Object.keys(node).forEach(function (key) {
      if (skipsEscapedWhitespace(key)) return;
      var value = node[key];
      var here = path ? path + '.' + key : key;
      if (typeof value === 'string') {
        convertAt(node, key, here);
        return;
      }
      walk(value, here, true);
    });
  }

  walk(booklet, '', false);

  if (converted > 0 && Array.isArray(diag)) {
    diag.push(createDiagnostic('escaped-whitespace-normalized', 'warning', 'normalize',
      'Converted literal \\n / \\t sequences into real line breaks in ' + converted
      + ' field' + (converted === 1 ? '' : 's')
      + ' — the model wrote the escape as text. First: ' + paths.slice(0, 6).join(', ') + '.',
      { repairable: true }));
  }
  return converted;
}

// Normalize cipher workspace styles to the canonical enum in place.
//
// Two outcomes, two diagnostics (D19: neither is an error — an unrenderable
// style must never block delivery, and the fallback still prints a usable
// writing surface):
//   - a style-vocabulary synonym ('ruled', 'boxgrid') resolves through
//     WORKSPACE_STYLE_ALIASES  → 'workspace-style-alias'
//   - anything else (content labels, prose left by the 1.4 string->object
//     migration, model noise) carries no geometry intent and becomes
//     DEFAULT_WORKSPACE_STYLE → 'workspace-style-unknown'
//
// Before this existed the fallback happened silently inside renderWorkspace(),
// so an author who wrote 'ruled' got plaintext cells and no signal.
export function normalizeWorkspaceStyles(booklet, diag) {
  (booklet.weeks || []).forEach(function (week, wi) {
    var containers = [week.fieldOps, week.bossEncounter];
    containers.forEach(function (container) {
      var body = container && container.cipher && container.cipher.body;
      var ws = body && body.workSpace;
      if (!ws || typeof ws !== 'object') return;
      if (isValidWorkspaceStyle(ws.style)) return;
      // `style` is optional in the schema. An absent one is an omission, not a
      // wrong answer — the renderer defaults it. Don't invent a field, and
      // don't raise a repair diagnostic for something nobody got wrong.
      if (ws.style === undefined || ws.style === null || ws.style === '') return;

      var from = ws.style;
      var canonical = resolveWorkspaceStyle(from);
      var label = 'Week ' + (week.weekNumber || wi + 1) + ' cipher workSpace.style';
      var shown = String(from == null ? '' : from);
      if (shown.length > 60) shown = shown.slice(0, 57) + '...';
      var pathStr = 'weeks[' + wi + '].' +
        (container === week.bossEncounter ? 'bossEncounter' : 'fieldOps') +
        '.cipher.body.workSpace.style';

      if (canonical) {
        ws.style = canonical;
        if (diag) {
          diag.push(createDiagnostic('workspace-style-alias', 'warning', 'normalize',
            label + ' "' + shown + '" resolved to "' + canonical + '"',
            { path: pathStr, repairable: true, correction: shown + ' → ' + canonical }));
        }
        return;
      }

      ws.style = DEFAULT_WORKSPACE_STYLE;
      if (diag) {
        diag.push(createDiagnostic('workspace-style-unknown', 'warning', 'normalize',
          label + ' "' + shown + '" names no known writing surface; defaulted to "' +
            DEFAULT_WORKSPACE_STYLE + '"',
          { path: pathStr, repairable: true, correction: shown + ' → ' + DEFAULT_WORKSPACE_STYLE }));
      }
    });
  });
}

// ── Overflow repair collection ───────────────────────────────────────────────
// Collects _overflowRepairs diagnostics from individual weeks into the
// assembly-level diagnostics array, then cleans up the per-week temp field.

function collectOverflowRepairs(booklet, diag) {
  (booklet.weeks || []).forEach(function (week) {
    if (Array.isArray(week._overflowRepairs)) {
      week._overflowRepairs.forEach(function (repair) { diag.push(repair); });
      delete week._overflowRepairs;
    }
  });
}

// ── Overflow document normalization (RC-2 mechanical cleanup) ────────────────
// Auto-assigns missing IDs, deduplicates collisions with fragment IDs.

export function normalizeOverflowDocuments(booklet, diag) {
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
      if (diag) {
        diag.push(createDiagnostic('overflow-id-synthesized', 'warning', 'reconcile',
          'Week ' + (wi + 1) + ' overflowDocument missing id — assigned "' + od.id + '"',
          { path: 'weeks[' + wi + '].overflowDocument.id', repairable: true, correction: 'Assigned "' + od.id + '"' }));
      }
    }

    // Dedup collision with fragment IDs
    var nid = normalizeId(od.id);
    if (fragmentIds[nid] || usedOverflowIds[nid]) {
      var originalId = od.id;
      od.id = od.id + '-overflow';
      nid = normalizeId(od.id);
      if (diag) {
        diag.push(createDiagnostic('overflow-id-collision', 'warning', 'reconcile',
          'Week ' + (wi + 1) + ' overflowDocument id "' + originalId + '" collided — renamed to "' + od.id + '"',
          { path: 'weeks[' + wi + '].overflowDocument.id', repairable: true, correction: originalId + ' → ' + od.id }));
      }
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

export function normalizeInterludes(booklet, diag) {
  (booklet.weeks || []).forEach(function (week, wi) {
    var interlude = week.interlude;
    if (!interlude) return;

    var pt = String(interlude.payloadType || '').trim().toLowerCase();
    var weekLabel = 'week ' + (week.weekNumber || (wi + 1));
    var basePath = 'weeks[' + wi + '].interlude';

    // Fix 1: "fragment" → "fragment-ref"
    if (pt === 'fragment') {
      var msg1 = weekLabel + ' interlude payloadType "fragment" → "fragment-ref"';
      console.warn('[assembly] ' + msg1);
      interlude.payloadType = 'fragment-ref';
      pt = 'fragment-ref';
      if (diag) {
        diag.push(createDiagnostic('interlude-payload-type-alias', 'warning', 'normalize', msg1,
          { path: basePath + '.payloadType', repairable: true, correction: 'fragment → fragment-ref' }));
      }
    }

    // Fix 2: unknown payloadType → "narrative"
    if (pt && !VALID_INTERLUDE_PAYLOAD_TYPES[pt]) {
      var msg2 = weekLabel + ' interlude payloadType "' + pt + '" unsupported → downgraded to "narrative"';
      console.warn('[assembly] ' + msg2);
      var oldPt = pt;
      interlude.payloadType = 'narrative';
      pt = 'narrative';
      if (diag) {
        diag.push(createDiagnostic('interlude-payload-type-unknown', 'warning', 'normalize', msg2,
          { path: basePath + '.payloadType', repairable: true, correction: oldPt + ' → narrative' }));
      }
    }

    // Fix 3: companion payload must be object with companionComponents
    if (pt === 'companion' && interlude.payload) {
      if (typeof interlude.payload === 'string') {
        var msg3 = weekLabel + ' interlude companion payload was string → wrapped in companionComponents';
        console.warn('[assembly] ' + msg3);
        // `dashboard` is the neutral salvage container: it renders from body
        // alone (blank ruled lines, no rows/cols/tokens required) and claims no
        // mechanic the string payload never declared. It replaced
        // `overlay-window` under D122(c) — a repair path that manufactures a
        // demoted companion would put a cuttable surface into a book no prompt
        // ever offered one to, which is the demotion leaking through the back.
        interlude.payload = {
          companionComponents: [{
            type: 'dashboard',
            title: interlude.payload,
            body: interlude.payload
          }]
        };
        if (diag) {
          diag.push(createDiagnostic('interlude-companion-shape', 'warning', 'normalize', msg3,
            { path: basePath + '.payload', repairable: true, correction: 'Wrapped string payload in companionComponents array' }));
        }
      } else if (interlude.payload && !Array.isArray(interlude.payload.companionComponents)) {
        var msg4 = weekLabel + ' interlude companion payload missing companionComponents → wrapped';
        console.warn('[assembly] ' + msg4);
        interlude.payload = { companionComponents: [interlude.payload] };
        if (diag) {
          diag.push(createDiagnostic('interlude-companion-shape', 'warning', 'normalize', msg4,
            { path: basePath + '.payload', repairable: true, correction: 'Wrapped object payload in companionComponents array' }));
        }
      }
    }

    // Fix 4: fragment-ref payload should be object with fragmentRef
    if (pt === 'fragment-ref' && typeof interlude.payload === 'string') {
      interlude.payload = { fragmentRef: interlude.payload, action: '' };
      if (diag) {
        diag.push(createDiagnostic('interlude-fragment-ref-shape', 'warning', 'normalize',
          weekLabel + ' interlude fragment-ref payload was string → wrapped in {fragmentRef, action}',
          { path: basePath + '.payload', repairable: true, correction: 'Wrapped string in {fragmentRef, action}' }));
      }
    }
  });
}

// ── Mark economy derivation (Session 1 / D89) ───────────────────────────────
// DERIVATION-AS-REPAIR. The Mark surface (session.markStrip) and the Resolve
// surface (week.reckoning) are standard on generated booklets, but a model
// cannot be trusted to emit 3-5 legal tick labels on every session of every
// week. So this pass derives the STRUCTURE — count, ids, kinds, and a working
// label for anything missing or illegal — from the booklet's OWN FINAL DATA,
// and leaves every legal authored label untouched. "Targets derived in
// assembly" holds for structure and guarantees; diegesis stays authored.
//
// It runs on all three assemble paths, AFTER the normalizedWorkout exercise
// override (the effort/record trees read the exercises that will actually
// print) and BEFORE enforceBookletDerivedFields (which owns the password
// spine this pass may never touch).
//
// What it will never do: touch componentInputs, decodingKey, weeklyComponent
// values, or meta.passwordLength. The economy may not own the six-week payoff
// (spine-determinism law); the boss threshold is a separate, derived, and
// always-reachable number.

var MARK_STRIP_DEFAULT_CURRENCY_ID = 'reserve';
var MARK_STRIP_DEFAULT_CURRENCY_LABEL = 'Reserve';
var RECKONING_DEFAULT_SINK_KIND = 'notes';
// The floor sink: every session card carries a notes rail, so 'notes' is the
// one sink that can never name a surface the booklet does not print.
var RECKONING_DEFAULT_SINK_INSTRUCTION = 'Bank the marks in the notes rail.';
// meta.economy.currencyId — mirror of the schema pattern. Machine handle for
// later cross-references (Session 3 `unlocked-by`), never printed.
var CURRENCY_ID_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;

/**
 * A printed tick label is legal when it is non-empty, at most
 * MARK_STRIP.maxLabelWords words, and carries NO DIGITS. The digit ban is the
 * ten-second law in enforceable form: a number on the strip invites arithmetic
 * between sets, which is exactly the interaction the Mark surface exists to
 * avoid. Illegal labels are dropped and replaced, never silently printed.
 */
function isLegalMarkLabel(label) {
  var text = String(label == null ? '' : label).trim();
  if (!text) return false;
  if (/\d/.test(text)) return false;
  return text.split(/\s+/).length <= MARK_STRIP.maxLabelWords;
}

function cleanMarkLabel(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

// Kind classification for AUTHORED labels only (derived defaults carry their
// kind directly). MOST-SPECIFIC FAMILY FIRST, first match wins — 'record' verbs
// name one concrete act, 'effort' words name a quality of the work, and
// 'completion' words are the broadest, so testing completion first would
// swallow "Every log line written". Anything unread is 'custom', which is the
// honest answer rather than a guess. Kinds are machine-only provenance: they
// decide top-up novelty and nothing else, and are never printed.
var MARK_KIND_PATTERNS = [
  ['record', /\b(log|logs|logged|write|writes|written|wrote|note|notes|noted|record|records|recorded|entry|entries|read|signed|initial|initialled)\b/i],
  ['effort', /\b(top|heavy|heavier|hard|harder|load|loaded|weight|weighted|range|held|hold|holds|push|pushed|max|heaviest|slow|slower|tempo|depth|deeper)\b/i],
  ['completion', /\b(all|every|each|complete|completed|finish|finished|close|closed|done|whole|through|clean)\b/i]
];

function classifyMarkLabel(label) {
  var text = String(label || '');
  for (var i = 0; i < MARK_KIND_PATTERNS.length; i++) {
    if (MARK_KIND_PATTERNS[i][1].test(text)) return MARK_KIND_PATTERNS[i][0];
  }
  return 'custom';
}

// A rep RANGE ("8-12", "6 to 8") is the tell that the session has room at the
// top of the prescription; a fixed rep count has none.
function sessionHasRepRange(exercises) {
  return (exercises || []).some(function (ex) {
    return /\d\s*(?:[-–—]|to)\s*\d/i.test(String((ex && ex.repsPerSet) || ''));
  });
}

// weightField is variously true, "170lb", "0lb", "" or absent across the
// corpus. Present-and-meaningful is the question, not truthiness.
function sessionHasWeightField(exercises) {
  return (exercises || []).some(function (ex) {
    var value = ex && ex.weightField;
    if (value === true) return true;
    if (value === false || value === undefined || value === null) return false;
    var text = String(value).trim().toLowerCase();
    return !!text && text !== 'false' && text !== 'none' && text !== 'n/a' && text !== '-';
  });
}

/**
 * The derived-default ladder. Three targets, in this fixed order, each anchored
 * to a surface the session CERTAINLY PRINTS — a default that promises an
 * unprinted surface is the same unpaid promise the sink law forbids.
 *
 *   completion — always "Every set closed". Explicitly the ROLL-UP of the
 *                rep-box row: the boxes record the work, the strip scores it.
 *                One philosophy, not two competing logs.
 *   effort     — rep range present        -> "Top of the range held"
 *                else any weightField      -> "Load added to the bar"
 *                else                      -> "Every movement attempted"
 *   record     — showNotes                 -> "The log line written"
 *                else storyPrompt present  -> "The prompt line read"
 *                else                      -> "The session card signed"
 */
function defaultCompletionTarget() {
  return { label: 'Every set closed', kind: 'completion' };
}

function defaultEffortTarget(session) {
  var exercises = (session && session.exercises) || [];
  if (sessionHasRepRange(exercises)) return { label: 'Top of the range held', kind: 'effort' };
  if (sessionHasWeightField(exercises)) return { label: 'Load added to the bar', kind: 'effort' };
  return { label: 'Every movement attempted', kind: 'effort' };
}

function defaultRecordTarget(session) {
  if (session && session.showNotes) return { label: 'The log line written', kind: 'record' };
  if (session && String(session.storyPrompt || '').trim()) {
    return { label: 'The prompt line read', kind: 'record' };
  }
  return { label: 'The session card signed', kind: 'record' };
}

function coerceCurrencyId(value) {
  var token = toSlugToken(value);
  return CURRENCY_ID_PATTERN.test(token) ? token : '';
}

/**
 * resolveBossWeekIndex(weeks) -> index | -1
 *
 * SINGLE IMPLEMENTATION shared with generator/modules/validation.js, so the
 * week that assembly writes a threshold onto is always the week validation
 * demands one from. Mirrors enforceBookletDerivedFields' backward scan, then
 * falls back to the final week: a booklet with no isBossWeek is already a hard
 * validation error, and a second error about a missing threshold on a week
 * nobody can name would only bury it.
 */
export function resolveBossWeekIndex(weeks) {
  var list = weeks || [];
  for (var i = list.length - 1; i >= 0; i--) {
    if (list[i] && list[i].isBossWeek) return i;
  }
  return list.length ? list.length - 1 : -1;
}

function normalizeSessionMarkStrip(session, weekNumber, sessionNumber, diag) {
  var path = 'weeks[' + weekNumber + '].sessions[' + sessionNumber + '].markStrip';
  var where = 'Week ' + weekNumber + ' session ' + sessionNumber;
  var strip = (session.markStrip && typeof session.markStrip === 'object') ? session.markStrip : null;
  var authored = (strip && Array.isArray(strip.targets)) ? strip.targets : [];

  var kept = [];
  var seenLabels = {};
  var haveKinds = {};
  var dropped = [];

  authored.forEach(function (entry) {
    var label = cleanMarkLabel(typeof entry === 'string' ? entry : (entry && entry.label));
    if (!isLegalMarkLabel(label)) { dropped.push(label || '(blank)'); return; }
    var key = label.toLowerCase();
    if (seenLabels[key]) { dropped.push(label + ' (duplicate)'); return; }
    var authoredKind = entry && entry.kind;
    var kind = MARK_STRIP_TARGET_KINDS.indexOf(authoredKind) !== -1
      ? authoredKind
      : classifyMarkLabel(label);
    seenLabels[key] = true;
    haveKinds[kind] = true;
    kept.push({ label: label, kind: kind });
  });

  if (dropped.length && diag) {
    diag.push(createDiagnostic('mark-strip-label-rejected', 'warning', 'normalize',
      where + ': dropped ' + dropped.length + ' markStrip target(s) — a label must be non-empty, '
      + 'at most ' + MARK_STRIP.maxLabelWords + ' words, digit-free, and unique within the strip. '
      + 'Rejected: ' + dropped.join(' | '),
      { path: path + '.targets', repairable: true, correction: 'replaced by derived default(s)' }));
  }

  // Top-up. Pass 1 prefers a kind the strip does not already carry (so a strip
  // of two authored effort lines gains a completion, not a third effort);
  // pass 2 ignores kind novelty and only avoids duplicate labels, so the floor
  // of MARK_STRIP.minTargets is reached even when kinds are saturated.
  var ladder = [defaultCompletionTarget(), defaultEffortTarget(session), defaultRecordTarget(session)];
  var added = [];
  function tryAppend(candidate, requireNovelKind) {
    if (kept.length >= MARK_STRIP.minTargets) return;
    if (requireNovelKind && haveKinds[candidate.kind]) return;
    var key = candidate.label.toLowerCase();
    if (seenLabels[key]) return;
    seenLabels[key] = true;
    haveKinds[candidate.kind] = true;
    kept.push(candidate);
    added.push(candidate.label);
  }
  ladder.forEach(function (candidate) { tryAppend(candidate, true); });
  ladder.forEach(function (candidate) { tryAppend(candidate, false); });

  if (added.length && diag) {
    diag.push(createDiagnostic('mark-strip-targets-derived', 'warning', 'synthesize',
      where + ': markStrip had ' + (kept.length - added.length) + ' legal target(s); derived '
      + added.length + ' to reach the ' + MARK_STRIP.minTargets + '-target floor — '
      + added.join(' | ') + '. Derived labels are generic by construction; the world should author its own.',
      { path: path + '.targets', repairable: true, correction: 'added ' + added.join(', ') }));
  }

  if (kept.length > MARK_STRIP.maxTargets) {
    var overflow = kept.slice(MARK_STRIP.maxTargets).map(function (t) { return t.label; });
    kept = kept.slice(0, MARK_STRIP.maxTargets);
    if (diag) {
      diag.push(createDiagnostic('mark-strip-truncated', 'warning', 'normalize',
        where + ': markStrip carried more than ' + MARK_STRIP.maxTargets
        + ' targets — a strip past that stops being tickable between sets. Dropped: ' + overflow.join(' | '),
        { path: path + '.targets', repairable: true, correction: 'truncated to ' + MARK_STRIP.maxTargets }));
    }
  }

  session.markStrip = {
    targets: kept.map(function (target, index) {
      return {
        id: 'ms-w' + weekNumber + '-s' + sessionNumber + '-' + (index + 1),
        label: target.label,
        kind: target.kind
      };
    })
  };
  return session.markStrip.targets.length;
}

function ensureWeekReckoning(week, weekNumber, currencyLabel, diag) {
  var path = 'weeks[' + weekNumber + '].reckoning';
  var where = 'Week ' + weekNumber;
  var authored = (week.reckoning && typeof week.reckoning === 'object') ? week.reckoning : {};

  var conversion = String(authored.conversion || '').trim();
  if (!conversion) {
    conversion = 'Each mark banks one ' + currencyLabel + '.';
    if (diag) {
      diag.push(createDiagnostic('reckoning-conversion-derived', 'warning', 'synthesize',
        where + ': no reckoning conversion authored — defaulted to "' + conversion
        + '". The conversion rule teaches on the panel where it fires; a generic one is a missed beat.',
        { path: path + '.conversion', repairable: true, correction: conversion }));
    }
  }

  var authoredSink = (authored.sink && typeof authored.sink === 'object') ? authored.sink : null;
  var kind = (authoredSink && RECKONING_SINK_KINDS.indexOf(authoredSink.kind) !== -1)
    ? authoredSink.kind : '';
  var instruction = authoredSink ? String(authoredSink.instruction || '').trim() : '';
  if (!kind || !instruction) {
    var reason = !authoredSink ? 'no sink authored'
      : (!kind ? 'sink.kind "' + String(authoredSink.kind) + '" is not one of ' + RECKONING_SINK_KINDS.join(', ')
        : 'sink.instruction was empty');
    kind = kind || RECKONING_DEFAULT_SINK_KIND;
    instruction = instruction || RECKONING_DEFAULT_SINK_INSTRUCTION;
    if (diag) {
      diag.push(createDiagnostic('reckoning-sink-derived', 'warning', 'synthesize',
        where + ': ' + reason + ' — fell back to the notes rail, the one sink every session card prints.',
        { path: path + '.sink', repairable: true, correction: kind + ': ' + instruction }));
    }
  }

  var sink = { kind: kind, instruction: instruction };
  var ref = authoredSink && String(authoredSink.ref || '').trim();
  if (ref) sink.ref = ref;

  var next = { conversion: conversion, sink: sink };
  // Authored thresholds survive here; the boss week's is overwritten below.
  if (Number.isInteger(authored.threshold) && authored.threshold >= 1) {
    next.threshold = authored.threshold;
  }
  week.reckoning = next;
}

/**
 * deriveMarkStripEconomy(booklet, diag) -> summary
 *
 * Establishes the whole mark economy on a freshly assembled booklet:
 * meta.economy, a normalized markStrip on every session, a reckoning on every
 * week, and the derived boss threshold. Idempotent — running it twice produces
 * the same document (second run finds every label legal and every id already
 * in canonical form).
 *
 * NO-OP GUARD: a document with no sessions AND no economy signal at all is left
 * exactly as it was. That is the safety valve for a caller assembling something
 * that is not a campaign; every real generated booklet has sessions, so the
 * Mark surface is standard.
 *
 * @returns {{ established, currencyId, currencyLabel, totalAttainableTicks,
 *             bossWeekIndex, threshold }}
 */
export function deriveMarkStripEconomy(booklet, diag) {
  var weeks = (booklet && booklet.weeks) || [];
  var meta = (booklet && booklet.meta) || {};
  var sessionCount = 0;
  var hasStripSignal = false;
  var hasReckoningSignal = false;

  weeks.forEach(function (week) {
    (((week || {}).sessions) || []).forEach(function (session) {
      sessionCount++;
      if (session && session.markStrip) hasStripSignal = true;
    });
    if (week && week.reckoning) hasReckoningSignal = true;
  });

  var hasEconomySignal = !!(meta.economy || hasStripSignal || hasReckoningSignal);
  if (!sessionCount && !hasEconomySignal) {
    return {
      established: false, currencyId: '', currencyLabel: '',
      totalAttainableTicks: 0, bossWeekIndex: -1, threshold: 0
    };
  }

  booklet.meta = meta;

  // ── The declaration ──────────────────────────────────────────────────────
  var authoredEconomy = (meta.economy && typeof meta.economy === 'object') ? meta.economy : null;
  var currencyLabel = firstNonEmpty(
    authoredEconomy && authoredEconomy.currencyLabel,
    MARK_STRIP_DEFAULT_CURRENCY_LABEL
  );
  var currencyId = coerceCurrencyId(authoredEconomy && authoredEconomy.currencyId)
    || coerceCurrencyId(currencyLabel)
    || MARK_STRIP_DEFAULT_CURRENCY_ID;

  // THE SYNTHESIZER STAYS, AND IT IS NOW THE PASTE PATH'S FLOOR ALONE (D144).
  // Both API pipelines block at their shell/skeleton gate on an unset
  // currencyLabel, so a generated book reaching here without one is impossible;
  // what reaches here without one is a pasted or hand-assembled booklet, where
  // synthesis is the right answer because there is no stage left to retry. That
  // is the opposite of the artifactIntent ruling (D136: deliberately NO
  // synthesizer) and the difference is what the field IS — a fabricated READING
  // grades as faithful and hides a misread, while a synthesized currency NAME
  // is visibly generic and announces itself in the warning below.
  if (!authoredEconomy) {
    if (diag) {
      diag.push(createDiagnostic('mark-economy-synthesized', 'warning', 'synthesize',
        'meta.economy absent — synthesized currency "' + currencyLabel + '" (id "' + currencyId
        + '"). This is the safety floor, not a design: the world should name what a mark banks into.',
        { path: 'meta.economy', repairable: true, correction: currencyId + ' / ' + currencyLabel }));
    }
  } else if (String(authoredEconomy.currencyId || '') !== currencyId) {
    if (diag) {
      diag.push(createDiagnostic('mark-economy-currency-id-normalized', 'warning', 'normalize',
        'meta.economy.currencyId "' + String(authoredEconomy.currencyId || '(absent)')
        + '" is not a machine handle — normalized to "' + currencyId + '". The printed label is untouched.',
        { path: 'meta.economy.currencyId', repairable: true,
          correction: String(authoredEconomy.currencyId || '(absent)') + ' → ' + currencyId }));
    }
  }
  meta.economy = { currencyId: currencyId, currencyLabel: currencyLabel };

  // ── The Mark surface, per session; the Resolve surface, per week ─────────
  var totalAttainableTicks = 0;
  weeks.forEach(function (week, wi) {
    if (!week) return;
    var weekNumber = week.weekNumber || (wi + 1);
    (week.sessions || []).forEach(function (session, si) {
      if (!session) return;
      totalAttainableTicks += normalizeSessionMarkStrip(
        session, weekNumber, session.sessionNumber || (si + 1), diag
      );
    });
    ensureWeekReckoning(week, weekNumber, currencyLabel, diag);
  });

  // ── The derived boss threshold ───────────────────────────────────────────
  // Cumulative across the whole campaign — the wallet does not reset weekly.
  // Always overwritten, exactly like componentInputs: a threshold the model
  // invented is an unreachability risk, and this one is reachable by
  // construction. Never touches the password chain.
  var bossWeekIndex = resolveBossWeekIndex(weeks);
  var threshold = 0;
  if (bossWeekIndex >= 0 && totalAttainableTicks > 0 && weeks[bossWeekIndex].reckoning) {
    threshold = Math.max(1, Math.round(RECKONING_THRESHOLD_RATIO * totalAttainableTicks));
    var bossReckoning = weeks[bossWeekIndex].reckoning;
    if (bossReckoning.threshold !== threshold) {
      if (diag) {
        diag.push(createDiagnostic('reckoning-threshold-derived', 'warning', 'synthesize',
          'Week ' + (weeks[bossWeekIndex].weekNumber || (bossWeekIndex + 1))
          + ' reckoning.threshold set to ' + threshold + ' — '
          + RECKONING_THRESHOLD_RATIO + ' x ' + totalAttainableTicks
          + ' attainable ticks across the campaign'
          + (bossReckoning.threshold === undefined ? ' (none authored)'
            : ' (model had ' + bossReckoning.threshold + ')'),
          { path: 'weeks[' + (bossWeekIndex + 1) + '].reckoning.threshold', repairable: true,
            correction: String(bossReckoning.threshold === undefined ? '(absent)' : bossReckoning.threshold)
              + ' → ' + threshold }));
      }
      bossReckoning.threshold = threshold;
    }
  }

  return {
    established: true,
    currencyId: currencyId,
    currencyLabel: currencyLabel,
    totalAttainableTicks: totalAttainableTicks,
    bossWeekIndex: bossWeekIndex,
    threshold: threshold
  };
}

// ── Booklet assemblers ──────────────────────────────────────────────────────
// Merges partial JSON chunks from the 10-stage pipeline into a complete booklet.

export function assembleBooklet(shell, weekChunkOutputs, fragmentsOutput, endingsOutput, campaignPlan) {
  ensureArtifactIdentity(shell, campaignPlan || null);
  var diag = [];
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

  // Literal `\n` before anything reads the strings — every later normalizer,
  // every estimate and every gate should see the text the reader will see.
  normalizeEscapedWhitespace(booklet, diag);

  // Normalize data shapes that models commonly get wrong
  booklet.weeks.forEach(function (week) { normalizeCompanionComponents(week, diag); });
  booklet.weeks.forEach(normalizeOracleKey);
  normalizeDocumentTypes(booklet, diag);
  normalizeWorkspaceStyles(booklet, diag);
  normalizeInterludes(booklet, diag);

  // Set overflow deterministically (fix C1 — was missing in this assembler)
  booklet.weeks.forEach(function (week) {
    if ((week.sessions || []).length > 3) {
      week.overflow = true;
    }
  });

  // Collect overflow-registry alignment repairs from individual weeks
  collectOverflowRepairs(booklet, diag);

  // Normalize overflow documents (auto-assign missing IDs, dedup collisions)
  normalizeOverflowDocuments(booklet, diag);

  // Establish the mark economy (markStrip + reckoning + derived boss threshold)
  // before the password spine is enforced — the two never touch.
  deriveMarkStripEconomy(booklet, diag);

  // Enforce deterministic derived fields (meta counts, componentInputs, password)
  var result = enforceBookletDerivedFields(booklet, diag);
  if (result.warnings.length > 0) {
    console.warn('[LiftRPG] Assembly derivation warnings:', result.warnings);
  }

  // Preserve upstream artifactIntent (Layer 3 planning contract)
  preserveArtifactIntent(booklet, shell.meta);

  // Truth boardStateMode against actual assembled week data
  truthBoardStateMode(booklet, diag);

  // Diagnose identity preservation regressions
  diagnoseIdentityPreservation(booklet, shell.meta, diag);

  // Attach structured diagnostics (survives JSON serialization)
  writePipelineDebris(booklet, '_assemblyDiagnostics', diag);

  return booklet;
}

// ── Structured booklet assembler ────────────────────────────────────────────
// Same as assembleBooklet but with exercise override: when normalizedWorkout
// has populated weeks[].sessions[].exercises, those replace LLM-generated
// exercise data deterministically. Used only by generateStructured().

export function assembleStructuredBooklet(shell, weekChunkOutputs, fragmentsOutput, endingsOutput, normalizedWorkout, campaignPlan) {
  ensureArtifactIdentity(shell, campaignPlan || null);
  var diag = [];
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

  // Literal `\n` before anything reads the strings — every later normalizer,
  // every estimate and every gate should see the text the reader will see.
  normalizeEscapedWhitespace(booklet, diag);

  // Normalize data shapes that models commonly get wrong
  booklet.weeks.forEach(function (week) { normalizeCompanionComponents(week, diag); });
  booklet.weeks.forEach(normalizeOracleKey);
  normalizeDocumentTypes(booklet, diag);
  normalizeWorkspaceStyles(booklet, diag);
  normalizeInterludes(booklet, diag);

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
        session.exercises = nwSession.exercises.map(function (ex, ei) {
          var filled = [];
          if (!ex.name) filled.push('name');
          if (!ex.sets) filled.push('sets');
          if (!ex.repsPerSet) filled.push('repsPerSet');
          if (filled.length) {
            diag.push(createDiagnostic('exercise-fields-defaulted', 'warning', 'normalize',
              'Week ' + (wi + 1) + ' session ' + (si + 1) + ' exercise ' + (ei + 1)
              + ': parsed workout missing ' + filled.join(', ')
              + ' — filled with placeholder(s). Check the printed journal row.'));
          }
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

  // Collect overflow-registry alignment repairs from individual weeks
  collectOverflowRepairs(booklet, diag);

  // Normalize overflow documents (auto-assign missing IDs, dedup collisions)
  normalizeOverflowDocuments(booklet, diag);

  // Establish the mark economy. MUST run after the normalizedWorkout exercise
  // override above: the effort and record trees read the exercises that will
  // actually print, not the model's placeholder ones.
  deriveMarkStripEconomy(booklet, diag);

  // Enforce deterministic derived fields (meta counts, componentInputs, password)
  var result = enforceBookletDerivedFields(booklet, diag);
  if (result.warnings.length > 0) {
    console.warn('[LiftRPG] Structured assembly derivation warnings:', result.warnings);
  }

  // Preserve upstream artifactIntent (Layer 3 planning contract)
  preserveArtifactIntent(booklet, shell.meta);

  // Truth boardStateMode against actual assembled week data
  truthBoardStateMode(booklet, diag);

  // Diagnose identity preservation regressions
  diagnoseIdentityPreservation(booklet, shell.meta, diag);

  // Attach structured diagnostics (survives JSON serialization)
  writePipelineDebris(booklet, '_assemblyDiagnostics', diag);

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

// Neither isStandardAlphaTable() nor decodeA1Z26() is defined here. Both live
// in contracts/contract-constants.mjs (imported above) because the renderer
// needs the same predicate and the same decoder.
//
// The isStandardAlphaTable copy that lived here was string-only — it rejected
// the `[{ value, letter }]` array form that the schema allows and that
// `npm run migrate` produces. The decodeA1Z26 copy returned null where the
// renderer's returned '' for the same failure; every call site branches on
// truthiness, so the two trees never disagreed observably, but they were still
// two implementations of one rule (D93). Do not reintroduce a local copy.

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
export function enforceBookletDerivedFields(booklet, diag) {
  var warnings = [];
  var weeks = booklet.weeks || [];
  var meta = booklet.meta || {};
  booklet.meta = meta;
  booklet.theme = booklet.theme || {};

  var requestedArchetype = String(booklet.theme.visualArchetype || '').trim().toLowerCase();
  var normalizedArchetype = normalizeThemeArchetype(booklet.theme.visualArchetype);
  if (requestedArchetype && requestedArchetype !== normalizedArchetype) {
    var arcMsg = 'theme.visualArchetype normalized from "' + requestedArchetype + '" to "' + normalizedArchetype + '"';
    warnings.push(arcMsg);
    if (diag) {
      diag.push(createDiagnostic('theme-archetype-normalized', 'warning', 'normalize', arcMsg,
        { path: 'theme.visualArchetype', repairable: true, correction: requestedArchetype + ' → ' + normalizedArchetype }));
    }
  }
  booklet.theme.visualArchetype = normalizedArchetype;

  // -- Meta counts (warn on mismatch, then enforce deterministic truth) --
  var actualTotalSessions = weeks.reduce(function (sum, w) {
    return sum + (w.sessions ? w.sessions.length : 0);
  }, 0);
  if (meta.weekCount !== weeks.length) {
    var wcMsg = 'meta.weekCount (' + meta.weekCount + ') corrected to ' + weeks.length;
    warnings.push(wcMsg);
    if (diag) {
      diag.push(createDiagnostic('meta-weekcount-corrected', 'warning', 'synthesize', wcMsg,
        { path: 'meta.weekCount', repairable: true, correction: meta.weekCount + ' → ' + weeks.length }));
    }
  }
  if (meta.totalSessions !== actualTotalSessions) {
    var tsMsg = 'meta.totalSessions (' + meta.totalSessions + ') corrected to ' + actualTotalSessions;
    warnings.push(tsMsg);
    if (diag) {
      diag.push(createDiagnostic('meta-total-sessions-corrected', 'warning', 'synthesize', tsMsg,
        { path: 'meta.totalSessions', repairable: true, correction: meta.totalSessions + ' → ' + actualTotalSessions }));
    }
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
        var ciMsg = 'componentInputs corrected: model had [' + existingInputs.join(', ') + '], computed [' + computed.join(', ') + ']';
        if (existingInputs.length > 0) {
          warnings.push(ciMsg);
        }
        if (diag) {
          diag.push(createDiagnostic('component-inputs-corrected', 'warning', 'synthesize', ciMsg,
            { path: 'bossEncounter.componentInputs', repairable: true, correction: '[' + existingInputs.join(', ') + '] → [' + computed.join(', ') + ']' }));
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
            var plMsg = 'meta.passwordLength corrected from ' + meta.passwordLength + ' to ' + password.length;
            warnings.push(plMsg);
            if (diag) {
              diag.push(createDiagnostic('password-length-corrected', 'warning', 'synthesize', plMsg,
                { path: 'meta.passwordLength', repairable: true, correction: meta.passwordLength + ' → ' + password.length }));
            }
          }
          meta.passwordLength = password.length;
        } else {
          var failMsg = 'A1Z26 decode failed — componentInputs contain non-integer or out-of-range values';
          warnings.push(failMsg);
          if (diag) {
            diag.push(createDiagnostic('password-decode-failed', 'warning', 'synthesize', failMsg,
              { path: 'bossEncounter.componentInputs', repairable: false }));
          }
        }
      } else {
        var nonStdMsg = 'Boss decodingKey.referenceTable is not standard A1Z26 — password not derived deterministically';
        warnings.push(nonStdMsg);
        if (diag) {
          diag.push(createDiagnostic('password-non-standard-table', 'warning', 'synthesize', nonStdMsg,
            { path: 'bossEncounter.decodingKey.referenceTable', repairable: false }));
        }
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
export function buildFragmentBatches(fragmentRegistry, weekSummaries, options) {
  if (!fragmentRegistry || fragmentRegistry.length === 0) return [];
  options = options || {};

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

  // Single-batch mode: put all fragments in one batch. Used by guided build
  // where operator friction matters more than token-limit splitting.
  if (options.singleBatch) {
    return [{
      weekNumbers: allWeekNums,
      registry: fragmentRegistry.slice(),
      weekSummaries: (weekSummaries || []).slice()
    }];
  }

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
  var diag = [];
  var normalizedArtifactIdentity = normalizeArtifactIdentity(
    meta.artifactIdentity,
    { meta: meta, theme: skeleton.theme || {}, cover: skeleton.cover || {} },
    null
  );

  // -- Base booklet structure --
  var booklet = {
    meta: {
      blockTitle:               meta.blockTitle || '',
      blockSubtitle:            meta.blockSubtitle || '',
      schemaVersion:            SCHEMA_VERSION,
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
      artifactIdentity:         normalizedArtifactIdentity,
      storyAnchor:              meta.storyAnchor || ''
    },
    cover: skeleton.cover || {},
    rulesSpread: (rulesOutput && rulesOutput.rulesSpread) ? rulesOutput.rulesSpread : {},
    theme: skeleton.theme || {},
    weeks: [],
    fragments: flattenSkeletonFragments(fragmentOutputs, skeleton.fragmentRegistry),
    endings: flattenSkeletonEndings(endingsOutputs || [])
  };

  // booklet.meta above is an EXPLICIT field list, so any meta key not named
  // there is dropped. Carry an authored economy declaration across CONDITIONALLY
  // — assigning undefined would leave an own key that the closed meta schema
  // rejects. deriveMarkStripEconomy synthesizes one below when none was authored.
  if (meta.economy) booklet.meta.economy = meta.economy;
  // Same conditional rule for the knowing (§11 Wave 1.5). It is authored by the
  // knowing stage onto skeleton.meta; without this line the field would reach
  // every prose prompt and then vanish from the shipped booklet, and nothing
  // would report the loss.
  if (meta.processParticulars) booklet.meta.processParticulars = meta.processParticulars;

  // -- Weeks: merge skeleton structural fields + flesh content --
  for (var i = 0; i < weekOutputs.length; i++) {
    var week = weekOutputs[i];
    var plan = (skeleton.weekPlan && skeleton.weekPlan[i]) || {};

    // Ensure structural fields from skeleton are present
    week.weekNumber = plan.weekNumber || (i + 1);
    week.isBossWeek = !!plan.isBossWeek;
    week.isDeload = !!plan.isDeload;

    // Normalize companion components (array, not object)
    normalizeCompanionComponents(week, diag);
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

  // -- Literal `\n` sweep, same seat as the other two assemblers --
  normalizeEscapedWhitespace(booklet, diag);

  // -- Normalize document types (alias resolution) --
  normalizeDocumentTypes(booklet, diag);
  normalizeWorkspaceStyles(booklet, diag);

  // -- Collect overflow-registry alignment repairs from individual weeks --
  collectOverflowRepairs(booklet, diag);

  // -- Normalize overflow documents (auto-assign missing IDs, dedup collisions) --
  normalizeOverflowDocuments(booklet, diag);

  normalizeInterludes(booklet, diag);

  // -- Compute totalSessions --
  var totalSessions = 0;
  for (var ti = 0; ti < booklet.weeks.length; ti++) {
    totalSessions += (booklet.weeks[ti].sessions || []).length;
  }
  booklet.meta.totalSessions = totalSessions;

  // -- Mark economy: markStrip per session, reckoning per week, boss threshold --
  // After the exercise overlay above (the effort/record trees read the final
  // exercises) and before the password spine below (which it never touches).
  deriveMarkStripEconomy(booklet, diag);

  // -- Enforce derived fields (boss componentInputs, password, theme normalization) --
  var enforcement = enforceBookletDerivedFields(booklet, diag);
  if (enforcement.warnings && enforcement.warnings.length > 0) {
    enforcement.warnings.forEach(function (w) { console.warn('[S+F assembly] ' + w); });
  }

  // Preserve upstream artifactIntent (Layer 3 planning contract)
  preserveArtifactIntent(booklet, meta);

  // Truth boardStateMode against actual assembled week data
  truthBoardStateMode(booklet, diag);

  // Diagnose identity preservation regressions
  diagnoseIdentityPreservation(booklet, meta, diag);

  // Cipher variety, planned vs built (Teeth Round F5, assembly half — WARN)
  diagnoseCipherVariety(booklet, skeleton.weekPlan || [], diag);

  // Attach structured diagnostics (survives JSON serialization)
  writePipelineDebris(booklet, '_assemblyDiagnostics', diag);

  return booklet;
}

// ── Targeted patch prompt ───────────────────────────────────────────────────

export function generatePatchPrompt(rawJson, errors, options) {
  options = options || {};
  var contractLines = formatIdentityContractLines(options.identityContract || null);

  // Overflow-registry context: when errors include overflow ID mismatches,
  // include the authoritative registry entries so the repair model can align
  // IDs without guessing.
  var overflowLines = [];
  var overflowRegistry = options.overflowRegistry || [];
  if (overflowRegistry.length > 0) {
    var hasOverflowError = errors.some(function (e) {
      return /overflowDocument\.id.*not present in overflowRegistry/i.test(e) ||
             /overflow/i.test(e);
    });
    if (hasOverflowError) {
      overflowLines.push('');
      overflowLines.push('## Authoritative Overflow Registry');
      overflowLines.push('These are the planned overflow documents. Each week\'s overflowDocument.id MUST exactly match the entry for its weekNumber:');
      overflowLines.push(JSON.stringify(overflowRegistry));
      overflowLines.push('Align any mismatched overflowDocument.id to the registry entry for that week. Preserve all content — only fix the ID and optionally documentType.');
    }
  }

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
    overflowLines.length ? overflowLines.join('\n') : null,
    '',
    '## Errors to Fix',
    errors.map(function (e) { return '- ' + e; }).join('\n'),
    '',
    '## JSON',
    '',
    rawJson
  ].filter(Boolean).join('\n');
}

// ══════════════════════════════════════════════════════════════════════════════
// Post-assembly artifact-intent drift diagnostics
// ══════════════════════════════════════════════════════════════════════════════
// Compares an assembled booklet against meta.artifactIntent to detect where
// downstream generation drifted from the Layer 3 planning contract.
// Returns a serialization-safe diagnostics object suitable for persisting as
// booklet._artifactIntentDrift.

/**
 * collectObservedDocumentTypes(booklet) -> string[]
 * Gathers all document types actually used across fragments, overflow docs,
 * and endings. Normalizes via DOCUMENT_TYPE_ALIASES for consistency.
 */
function collectObservedDocumentTypes(booklet) {
  var types = {};

  (booklet.fragments || []).forEach(function (f) {
    var dt = String(f.documentType || '').trim().toLowerCase();
    if (dt) {
      var canonical = DOCUMENT_TYPE_ALIASES[dt] || dt;
      types[canonical] = (types[canonical] || 0) + 1;
    }
  });

  (booklet.weeks || []).forEach(function (week) {
    if (week.overflowDocument) {
      var dt = String(week.overflowDocument.documentType || '').trim().toLowerCase();
      if (dt) {
        var canonical = DOCUMENT_TYPE_ALIASES[dt] || dt;
        types[canonical] = (types[canonical] || 0) + 1;
      }
    }
  });

  (booklet.endings || []).forEach(function (e) {
    var content = e.content || {};
    var dt = String(content.documentType || '').trim().toLowerCase();
    if (dt) {
      var canonical = DOCUMENT_TYPE_ALIASES[dt] || dt;
      types[canonical] = (types[canonical] || 0) + 1;
    }
  });

  return types;
}

/**
 * collectObservedMapTypes(booklet) -> { [mapType]: count }
 * Gathers map types actually used across weeks.
 */
function collectObservedMapTypes(booklet) {
  var types = {};
  (booklet.weeks || []).forEach(function (week) {
    var fo = week.fieldOps || {};
    var map = fo.map || fo.mapState || {};
    var mt = String(map.mapType || '').trim().toLowerCase();
    if (mt) types[mt] = (types[mt] || 0) + 1;
  });
  return types;
}

/**
 * collectObservedCipherTypes(booklet) -> { [cipherType]: count }
 * Gathers cipher types actually used across weeks.
 */
function collectObservedCipherTypes(booklet) {
  var types = {};
  (booklet.weeks || []).forEach(function (week) {
    var fo = week.fieldOps || {};
    var cipher = fo.cipher || {};
    var ct = String(cipher.type || '').trim().toLowerCase();
    if (ct) types[ct] = (types[ct] || 0) + 1;
  });
  return types;
}

/**
 * diagnoseCipherVariety(booklet, plannedWeeks, diag)
 *
 * The assembly-side half of the cipher-variety floor (Teeth Round F5). The
 * skeleton stage BLOCKS on the planned variety; this reports what was actually
 * BUILT, and whether it still matches the plan the skeleton was held to.
 *
 * WARN-class throughout, deliberately: by the time assembly runs, the weeks are
 * generated and paid for, and D19 says delivery is never blocked. What this
 * buys is a named divergence — before it, a plan that scheduled four families
 * and a book that built two looked identical from outside, which is exactly the
 * gap Book 1 fell through.
 *
 * collectObservedCipherTypes had ZERO call sites before this. It was written
 * beside collectObservedMapTypes and never wired, so the observed-vs-planned
 * comparison it exists for had never once run.
 */
function diagnoseCipherVariety(booklet, plannedWeeks, diag) {
  var observed = collectObservedCipherTypes(booklet);
  var observedFamilies = Object.keys(observed);
  var planned = {};
  (plannedWeeks || []).forEach(function (w) {
    if (!w || w.isBossWeek) return;
    var t = String(w.cipherType || '').trim().toLowerCase();
    if (t) planned[t] = 1;
  });
  var plannedFamilies = Object.keys(planned);

  if (plannedFamilies.length && observedFamilies.length < plannedFamilies.length) {
    diag.push(createDiagnostic('cipher-variety-below-plan', 'warning', 'validate',
      'The plan scheduled ' + plannedFamilies.length + ' cipher families ('
        + plannedFamilies.join(', ') + ') but the built booklet carries '
        + observedFamilies.length + ' (' + observedFamilies.join(', ')
        + ') — a week collapsed onto a technique the player has already learned',
      { path: 'weeks[].fieldOps.cipher.type' }));
  }

  var unplanned = observedFamilies.filter(function (t) { return !planned[t]; });
  if (plannedFamilies.length && unplanned.length) {
    diag.push(createDiagnostic('cipher-type-off-plan', 'warning', 'validate',
      'Built cipher type(s) ' + unplanned.join(', ') + ' were not in the plan ('
        + plannedFamilies.join(', ') + ')',
      { path: 'weeks[].fieldOps.cipher.type' }));
  }
}

// Mechanic grammar → expected board-state proxies mapping.
// Not exhaustive in what it EXPECTS (several families have no strong map-type
// proxy), but exhaustive in its KEYS: validate.mjs asserts this key set equals
// VALID_MECHANIC_GRAMMAR_FAMILIES in contracts/contract-constants.mjs exactly,
// so widening the family menu forces a conscious ruling here rather than a
// silently unproxied family.
// The eight macro-genre families (Wave 2) are proxied from the map types their
// FAMILY_BOARD_MODE_GUIDANCE candidates imply — survey-grid→grid,
// node-graph→point-to-point, route-tracker/timeline→linear-track,
// player-drawn→player-drawn. Four of them get an empty ruling rather than a
// guess: heat and rivalry are pressures, not geometries (a heat book is a heat
// book on any board), and an expectation the family does not actually carry
// would spend this check's credibility on noise.
var MECHANIC_GRAMMAR_PROXIES = {
  'survey-grid':              { expectedMapTypes: ['grid'], expectedCipherTypes: [] },
  'node-graph':               { expectedMapTypes: ['point-to-point'], expectedCipherTypes: [] },
  'timeline-reconstruction':  { expectedMapTypes: ['linear-track'], expectedCipherTypes: [] },
  'route-tracker':            { expectedMapTypes: ['linear-track', 'point-to-point'], expectedCipherTypes: [] },
  'testimony-matrix':         { expectedMapTypes: [], expectedCipherTypes: [] },
  'ledger-board':             { expectedMapTypes: ['grid'], expectedCipherTypes: [] },
  'profile-assembly':         { expectedMapTypes: [], expectedCipherTypes: [] },
  heat:                       { expectedMapTypes: [], expectedCipherTypes: [] },
  attrition:                  { expectedMapTypes: ['linear-track', 'grid', 'maze'], expectedCipherTypes: [] },
  // Wave 3 gave siege its own geometry. 'concentric' leads because rings ARE the
  // verb (hold ground while it closes); grid and player-drawn stay legal because
  // six books of siege must not all draw the same disc.
  siege:                      { expectedMapTypes: ['concentric', 'grid', 'player-drawn'], expectedCipherTypes: [] },
  stewardship:                { expectedMapTypes: ['grid', 'point-to-point'], expectedCipherTypes: [] },
  'loyalty-web':              { expectedMapTypes: ['point-to-point'], expectedCipherTypes: [] },
  // A pursuit is a line or a labyrinth — both are "ahead of them", differently.
  evasion:                    { expectedMapTypes: ['linear-track', 'maze'], expectedCipherTypes: [] },
  // A rite is an order of operations; a precinct learned inward is the same rite
  // in space, which is why concentric belongs here and not only under siege.
  observance:                 { expectedMapTypes: ['linear-track', 'player-drawn', 'concentric'], expectedCipherTypes: [] },
  rivalry:                    { expectedMapTypes: [], expectedCipherTypes: [] }
};

/**
 * compareArtifactIntentDrift(booklet) -> { diagnostics: DiagnosticEntry[] }
 *
 * Main post-assembly comparison. Returns a serialization-safe object.
 * Only emits diagnostics for checks with concrete, defensible signals.
 */
export function compareArtifactIntentDrift(booklet) {
  var diagnostics = [];
  var intent = ((booklet.meta || {}).artifactIntent) || null;

  if (!intent) {
    // No intent declared — nothing to compare against. This is expected for
    // booklets generated before the artifact-intent compiler existed.
    return { diagnostics: diagnostics };
  }

  var ecology = intent.documentEcology || {};
  var exclusions = intent.exclusions || {};

  // ── Document ecology: forbidden types ─────────────────────────────────
  var observedDocTypes = collectObservedDocumentTypes(booklet);
  var forbidden = (ecology.forbidden || []).map(function (t) { return t.toLowerCase(); });
  var dominant = (ecology.dominant || []).map(function (t) { return t.toLowerCase(); });

  forbidden.forEach(function (ft) {
    if (observedDocTypes[ft]) {
      diagnostics.push(createDiagnostic(
        'forbidden-document-type',
        'warning',
        'post-assembly-compare',
        'Forbidden document type "' + ft + '" appears ' + observedDocTypes[ft] + ' time(s) in assembled booklet.',
        { repairable: false, path: 'documentEcology.forbidden vs assembled fragments/overflow/endings' }
      ));
    }
  });

  // ── Document ecology: dominant underrepresentation ────────────────────
  if (dominant.length > 0) {
    var totalDocs = 0;
    var dominantCount = 0;
    Object.keys(observedDocTypes).forEach(function (dt) {
      totalDocs += observedDocTypes[dt];
      if (dominant.indexOf(dt) >= 0) dominantCount += observedDocTypes[dt];
    });

    if (totalDocs > 0) {
      var dominantRatio = dominantCount / totalDocs;
      // If declared dominant families account for less than 40% of actual documents,
      // flag ecology underrepresentation. Threshold is intentionally generous.
      if (dominantRatio < 0.4) {
        diagnostics.push(createDiagnostic(
          'dominant-ecology-underrepresented',
          'warning',
          'post-assembly-compare',
          'Declared dominant document families (' + dominant.join(', ') + ') account for only ' +
            Math.round(dominantRatio * 100) + '% of ' + totalDocs + ' assembled documents (threshold: 40%).',
          { repairable: false, path: 'documentEcology.dominant vs assembled document types' }
        ));
      }
    }
  }

  // ── Exclusions: document exclusions ───────────────────────────────────
  (exclusions.documentExclusions || []).forEach(function (excluded) {
    var normalized = excluded.toLowerCase();
    if (observedDocTypes[normalized]) {
      diagnostics.push(createDiagnostic(
        'excluded-document-type-present',
        'warning',
        'post-assembly-compare',
        'Excluded document type "' + excluded + '" appears ' + observedDocTypes[normalized] + ' time(s) in assembled booklet.',
        { repairable: false, path: 'exclusions.documentExclusions vs assembled fragments' }
      ));
    }
  });

  // ── Mechanic grammar drift: board-state proxy comparison ──────────────
  var declaredGrammar = String(intent.mechanicGrammarFamily || '').toLowerCase();
  var proxy = MECHANIC_GRAMMAR_PROXIES[declaredGrammar];

  if (proxy && proxy.expectedMapTypes.length > 0) {
    var observedMaps = collectObservedMapTypes(booklet);
    var observedMapList = Object.keys(observedMaps);

    // Check if ANY expected map type is present. If the declared grammar
    // expects point-to-point but the booklet only uses grid, that's drift.
    var hasExpected = proxy.expectedMapTypes.some(function (emt) {
      return observedMaps[emt] > 0;
    });

    if (observedMapList.length > 0 && !hasExpected) {
      diagnostics.push(createDiagnostic(
        'mechanic-grammar-map-mismatch',
        'warning',
        'post-assembly-compare',
        'Declared mechanic grammar "' + declaredGrammar + '" expects map types [' +
          proxy.expectedMapTypes.join(', ') + '] but assembled booklet uses [' +
          observedMapList.join(', ') + '].',
        { repairable: false, path: 'mechanicGrammarFamily vs assembled weeks[].fieldOps.map.mapType' }
      ));
    }
  }

  // ── Exclusions: mechanic exclusions (map type proxy) ──────────────────
  // Mechanic exclusions reference grammar families, not raw map types.
  // We can only detect drift when the excluded grammar has a strong proxy.
  (exclusions.mechanicExclusions || []).forEach(function (excluded) {
    var exProxy = MECHANIC_GRAMMAR_PROXIES[excluded.toLowerCase()];
    if (exProxy && exProxy.expectedMapTypes.length > 0) {
      var observedMaps = collectObservedMapTypes(booklet);
      exProxy.expectedMapTypes.forEach(function (emt) {
        if (observedMaps[emt] && observedMaps[emt] > 0) {
          diagnostics.push(createDiagnostic(
            'excluded-mechanic-proxy-present',
            'warning',
            'post-assembly-compare',
            'Excluded mechanic grammar "' + excluded + '" has map type proxy "' + emt +
              '" which appears ' + observedMaps[emt] + ' time(s) in assembled booklet.',
            { repairable: false, path: 'exclusions.mechanicExclusions vs assembled map types' }
          ));
        }
      });
    }
  });

  return { diagnostics: diagnostics };
}
