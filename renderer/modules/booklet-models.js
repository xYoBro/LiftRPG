import {
  getPasswordLength,
  joinRichContentBlocks,
  pad2,
  splitRichContentBlocks,
  splitParagraphs
} from './utils.js?v=48';
import { normalizeManifestPointer } from './document-models.js?v=48';
// Shell-family resolution is shared with the generator tree — one
// implementation in contracts/contract-constants.mjs, co-located with the
// VALID_SHELL_FAMILIES enum that gates it. The local copy that used to live
// here is why the generator inferred a different shell for the same booklet
// on 114 of 600 identity combinations (D93).
import {
  resolveShellFamily,
  VALID_COMPONENT_DIALECTS,
  DEFAULT_COMPONENT_DIALECT
} from '../../contracts/contract-constants.mjs';

function humanizeComponentType(value) {
  return String(value || 'component').replace(/-/g, ' ');
}

// THE SHELL IS A STRUCTURE, NOT A GENRE.
//
// Every string below is printed unconditionally by the page models for whatever
// shell family the book carries — and shell family is DRAWN BY THE DIE
// (`drawSeedAssignments`, D149), independently of the brief's literal subject.
// The prompt doctrine says so in as many words: "A pastoral book can be a court
// packet; a government-styled book can be a household archive. Do not let one
// choose the other." So a book about a maximum-security prison legitimately
// draws `ship-logbook` — and the copy it prints may not tell that reader about a
// captain, a vessel or a bridge, none of which appear anywhere else in its 40
// pages. That is exactly what happened, and it is a distribution defect, not a
// one-book fluke: every shell/brief pairing where the die assigns a STRUCTURAL
// fit hits it again.
//
// The register to write in is SHELL_CITATION_STYLES' (contract-constants.mjs),
// which solved this first: ship-logbook cites Entry / Watch / Bearing / Fathom —
// the shell's own procedural furniture, true whether the book means it literally
// or metaphorically. Name what the FORM does (a watch is stood, a leaf is filed,
// an annex is withheld); never name what the world contains.
//
// Two failure shapes to check any new string against:
//   1. a subject noun the brief may not own (captain, vessel, family, incident);
//   2. a setting the brief may not have (at sea, at home).
// Both read as an authoring error to a player who has met neither. The form's
// OWN vocabulary is not one of them — a survey is filed from the field and a
// packet withholds an annex whatever the book is about, which is why
// field-survey's "returned to the field" stays and the logbook's "at sea" went.
const SHELL_FAMILY_COPY = {
  'field-survey': {
    rulesTitle: 'Field Briefing',
    sealedTitle: 'Sealed Survey Addendum',
    sealedBody: 'Complete the weekly survey log and final assembly ladder. The sealed addendum opens only after the full designation is derived.',
    gaugeTitle: 'Gauge Reading Log',
    gaugeLabel: 'Complete Designation',
    assemblyTitle: 'Designation Assembly',
    assemblySubtitle: 'Transfer each recorded field value into the final designation ladder. Decode only when the convergence page authorizes it.',
    finalLabel: 'Final Designation',
    lockedEndingTitle: 'Sealed Addendum',
    lockedEndingBody: 'This closing document remains sealed until the assembled designation is entered above. The survey record contains every required value.',
    backColophon: 'Filed in pencil, resolved through repetition, returned to the field.'
  },
  'classified-packet': {
    rulesTitle: 'Operational Briefing',
    sealedTitle: 'Sealed Annex',
    sealedBody: 'Do not open this annex until the packet’s logged values have been reconciled and the final designation has been derived.',
    gaugeTitle: 'Recorded Values Log',
    gaugeLabel: 'Full Designation',
    assemblyTitle: 'Packet Designation Assembly',
    assemblySubtitle: 'Transfer each recorded value into the final designation ladder. The annex opens only after the designation is reconstructed in order.',
    finalLabel: 'Final Designation',
    lockedEndingTitle: 'Sealed Annex',
    lockedEndingBody: 'This annex stays sealed until the final designation is reconstructed from the packet. No preview text is available before unlock.',
    backColophon: 'Filed for internal circulation. Complete in pencil. Unlock only after full convergence.'
  },
  'ship-logbook': {
    rulesTitle: 'Watch Procedure',
    sealedTitle: 'Sealed Closing Entry',
    sealedBody: 'Log each weekly reading in the order the watches fall, then reconstruct the full designation before opening the closing entry.',
    gaugeTitle: 'Watch Log',
    gaugeLabel: 'Complete Designation',
    assemblyTitle: 'Final Entry Assembly',
    assemblySubtitle: 'Transfer each logged reading into the final designation ladder. Confirm the designation before opening the closing entry.',
    finalLabel: 'Final Designation',
    lockedEndingTitle: 'Sealed Closing Entry',
    lockedEndingBody: 'The closing entry remains sealed until the log resolves into a complete designation.',
    backColophon: 'Logged watch by watch, completed by hand, closed only once the record is whole.'
  },
  'witness-binder': {
    rulesTitle: 'Binder Orientation',
    sealedTitle: 'Sealed Testimony',
    sealedBody: 'Complete the binder’s logged evidence chain before opening the sealed testimony at the end of the file.',
    gaugeTitle: 'Evidence Log',
    gaugeLabel: 'Resolved Name',
    assemblyTitle: 'Evidence Chain Assembly',
    assemblySubtitle: 'Transfer each recorded value into the final evidence chain. Open the sealed testimony only after the name resolves in order.',
    finalLabel: 'Resolved Name',
    lockedEndingTitle: 'Sealed Testimony',
    lockedEndingBody: 'This testimony remains sealed until the binder’s evidence chain is complete.',
    backColophon: 'Witness file completed by hand. Do not circulate without full chain of evidence.'
  },
  'court-packet': {
    rulesTitle: 'Clerk\'s Briefing',
    sealedTitle: 'Sealed Final Filing',
    sealedBody: 'Record each weekly filing value, then reconstruct the final designation before opening the sealed filing.',
    gaugeTitle: 'Filed Values Log',
    gaugeLabel: 'Final Filing',
    assemblyTitle: 'Final Filing Assembly',
    assemblySubtitle: 'Transfer each filed value into the final ladder. Open the sealed filing only after the designation is complete.',
    finalLabel: 'Final Filing',
    lockedEndingTitle: 'Sealed Final Filing',
    lockedEndingBody: 'This final filing remains sealed until the packet’s record is fully reconciled.',
    backColophon: 'Filed by hand, reconciled in sequence, retained for the record.'
  },
  'devotional-manual': {
    rulesTitle: 'Order of Practice',
    sealedTitle: 'Sealed Closing Rite',
    sealedBody: 'Complete each weekly observance, then reconstruct the final word before opening the closing rite.',
    gaugeTitle: 'Observance Log',
    gaugeLabel: 'Final Word',
    assemblyTitle: 'Closing Word Assembly',
    assemblySubtitle: 'Transfer each recorded observance into the final ladder. Open the closing rite only after the word is complete.',
    finalLabel: 'Final Word',
    lockedEndingTitle: 'Sealed Closing Rite',
    lockedEndingBody: 'The closing rite remains sealed until the booklet’s observances resolve into a complete word.',
    backColophon: 'Practiced in order, marked by hand, opened only after completion.'
  },
  'household-archive': {
    rulesTitle: 'Archive Note',
    sealedTitle: 'Sealed Final Leaf',
    sealedBody: 'Record each weekly value in the archive log, then assemble the full designation before opening the final leaf.',
    gaugeTitle: 'Archive Log',
    gaugeLabel: 'Complete Designation',
    assemblyTitle: 'Archive Assembly',
    assemblySubtitle: 'Transfer each archived value into the final ladder. Open the final leaf only after the designation is complete.',
    finalLabel: 'Final Designation',
    lockedEndingTitle: 'Sealed Final Leaf',
    lockedEndingBody: 'This last leaf remains sealed until the archive’s designation is fully assembled.',
    backColophon: 'Kept without a catalogue, annotated by hand, resolved through careful return.'
  },
  'technical-manual': {
    rulesTitle: 'Procedure Briefing',
    sealedTitle: 'Sealed Technical Annex',
    sealedBody: 'Complete each weekly procedure log, then reconstruct the final system designation before opening the annex.',
    gaugeTitle: 'Procedure Log',
    gaugeLabel: 'System Designation',
    assemblyTitle: 'System Designation Assembly',
    assemblySubtitle: 'Transfer each procedure value into the final designation ladder. Open the annex only after the system name resolves.',
    finalLabel: 'System Designation',
    lockedEndingTitle: 'Sealed Technical Annex',
    lockedEndingBody: 'This technical annex remains sealed until the logged procedure values are fully reconciled.',
    backColophon: 'Logged during procedure, completed in pencil, resolved by the manual.'
  }
};

export function resolveArtifactIdentity(data = {}) {
  const meta = data.meta || {};
  const theme = data.theme || {};
  const raw = meta.artifactIdentity || {};
  const shellFamily = resolveShellFamily(raw.shellFamily, raw.artifactClass, theme.visualArchetype);
  const copy = SHELL_FAMILY_COPY[shellFamily] || SHELL_FAMILY_COPY['field-survey'];

  return {
    artifactClass: raw.artifactClass || '',
    artifactBlend: raw.artifactBlend || '',
    authorialMode: raw.authorialMode || '',
    boardStateMode: raw.boardStateMode || 'survey-grid',
    documentEcology: raw.documentEcology || '',
    materialCulture: raw.materialCulture || '',
    openingMode: raw.openingMode || 'artifact-first',
    rulesDeliveryMode: raw.rulesDeliveryMode || 'mixed',
    revealShape: raw.revealShape || '',
    unlockLogic: raw.unlockLogic || '',
    shellFamily,
    attachmentStrategy: raw.attachmentStrategy || 'split-technical',
    // Whose instrument the countable surfaces are. An unknown value falls to
    // the default rather than propagating: a dialect the CSS does not know
    // would print unstyled boxes, and an unstyled tick box is not a dialect,
    // it is a missing one.
    componentDialect: VALID_COMPONENT_DIALECTS.indexOf(raw.componentDialect) === -1
      ? DEFAULT_COMPONENT_DIALECT
      : raw.componentDialect,
    copy
  };
}

export function buildBookletMetaModel(data) {
  const meta = data.meta || {};
  const artifactIdentity = resolveArtifactIdentity(data);

  return {
    blockTitle: meta.blockTitle || 'LiftRPG',
    blockSubtitle: meta.blockSubtitle || '',
    worldContract: meta.worldContract || '',
    narrativeVoice: meta.narrativeVoice || null,
    literaryRegister: meta.literaryRegister || null,
    structuralShape: meta.structuralShape || null,
    weeklyComponentType: meta.weeklyComponentType || 'component',
    weeklyComponentLabel: humanizeComponentType(meta.weeklyComponentType),
    generatedAt: meta.generatedAt || '',
    weekCount: meta.weekCount || (data.weeks || []).length || 0,
    totalSessions: meta.totalSessions || 0,
    passwordLength: getPasswordLength(data, (data.weeks || []).length || 6),
    artifactIdentity
  };
}

function normalizeCoverMarking(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\bblock\s+\d+\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function resolveCoverSubtitle(designation, subtitle) {
  if (!subtitle) return '';
  if (!designation) return subtitle;

  const normalizedDesignation = normalizeCoverMarking(designation);
  const normalizedSubtitle = normalizeCoverMarking(subtitle);
  if (!normalizedSubtitle) return '';
  if (!normalizedDesignation) return subtitle;

  if (
    normalizedDesignation === normalizedSubtitle ||
    normalizedDesignation.includes(normalizedSubtitle) ||
    normalizedSubtitle.includes(normalizedDesignation)
  ) {
    return '';
  }

  return subtitle;
}

export function normalizeD100Language(value) {
  var text = String(value || '');
  if (!text) return '';

  return text
    .replace(/\broll\s+2d6\b/gi, 'roll 1d100')
    .replace(/\broll\s+two\s+six-sided\s+dice\b/gi, 'roll 1d100')
    .replace(/\bd10\s*\+\s*d%\s*\(percentile\)\b/gi, 'd100')
    .replace(/\bd10\s*\+\s*d%\b/gi, 'd100');
}

export function buildCoverPageModel(data) {
  const meta = buildBookletMetaModel(data);
  const cover = data.cover || {};
  const designation = cover.designation || '';
  const artifactIdentity = meta.artifactIdentity || resolveArtifactIdentity(data);

  return {
    meta,
    artifactIdentity,
    designation,
    title: cover.title || meta.blockTitle,
    subtitle: resolveCoverSubtitle(designation, cover.subtitle || meta.blockSubtitle),
    tagline: cover.tagline || '',
    colophonLines: cover.colophonLines || [],
    coverArt: cover.svgArt || cover.coverArt || '',
    coverArtCaption: cover.coverArtCaption || cover.artCaption || ''
  };
}

export function buildRulesLeftPageModelWithVariant(data, layoutVariant) {
  const meta = buildBookletMetaModel(data);
  const artifactIdentity = meta.artifactIdentity || resolveArtifactIdentity(data);
  const leftPage = (data.rulesSpread || {}).leftPage || {};
  const reEntry = leftPage.reEntryRule;
  const reEntryText = typeof reEntry === 'string' ? reEntry : reEntry && reEntry.ruleText;
  const sections = (leftPage.sections || []).map(function (section) {
    return {
      ...section,
      body: normalizeD100Language(section.body || section.text || ''),
      text: normalizeD100Language(section.text || section.body || '')
    };
  });
  const sectionTextLength = sections.reduce(function (sum, section) {
    return sum + String(section.body || section.text || '').length;
  }, 0);
  const resolvedVariant = layoutVariant === 'standard'
    && artifactIdentity.shellFamily === 'classified-packet'
    && sectionTextLength > 520
    ? 'dense'
    : (layoutVariant || 'standard');

  return {
    meta,
    artifactIdentity,
    layoutVariant: resolvedVariant,
    title: leftPage.title || artifactIdentity.copy.rulesTitle,
    sections: sections,
    reEntryText: normalizeD100Language(reEntryText || ''),
    supportNote: 'No dice? Google "roll d100".'
  };
}

export function buildSealedPageModel(data, layoutVariant = 'standard') {
  const meta = buildBookletMetaModel(data);
  const artifactIdentity = meta.artifactIdentity || resolveArtifactIdentity(data);
  return {
    meta,
    artifactIdentity,
    layoutVariant,
    title: artifactIdentity.copy.sealedTitle,
    body: artifactIdentity.copy.sealedBody
  };
}

export function buildGaugeLogPageModelWithVariant(data, layoutVariant) {
  const meta = buildBookletMetaModel(data);
  const artifactIdentity = meta.artifactIdentity || resolveArtifactIdentity(data);
  const rightPage = (data.rulesSpread || {}).rightPage || {};

  return {
    meta,
    artifactIdentity,
    layoutVariant: layoutVariant || 'standard',
    title: rightPage.title || artifactIdentity.copy.gaugeTitle,
    instruction: normalizeD100Language(rightPage.instruction || ''),
    rows: (data.weeks || []).map((week) => ({
      weekLabel: 'Week ' + pad2(week.weekNumber),
      instruction: week.isBossWeek
        ? 'Boss convergence — see field operations'
        : (week.weeklyComponent && week.weeklyComponent.extractionInstruction) || meta.weeklyComponentLabel
    })),
    passwordLength: meta.passwordLength
  };
}

export function buildAssemblyPageModel(data) {
  return buildAssemblyPageModelWithVariant(data, 'standard');
}

export function buildAssemblyPageModelWithVariant(data, layoutVariant) {
  const meta = buildBookletMetaModel(data);
  const artifactIdentity = meta.artifactIdentity || resolveArtifactIdentity(data);

  return {
    meta,
    artifactIdentity,
    layoutVariant: layoutVariant || 'standard',
    title: artifactIdentity.copy.assemblyTitle,
    subtitle: artifactIdentity.copy.assemblySubtitle,
    rows: (data.weeks || [])
      .filter((week) => !week.isBossWeek)
      .map((week) => ({
        weekLabel: 'Week ' + pad2(week.weekNumber)
      })),
    passwordLength: meta.passwordLength
  };
}

function inferEndingTreatment(designSpec) {
  const text = String(designSpec || '').toLowerCase();
  if (!text) return 'default';
  if (text.includes('warm') || text.includes('letter') || text.includes('serif')) return 'warm-letter';
  if (text.includes('report') || text.includes('memo') || text.includes('dossier')) return 'official-document';
  return 'default';
}

export function buildLockedEndingPageModel(data, layoutVariant = 'standard') {
  const meta = buildBookletMetaModel(data);
  const artifactIdentity = meta.artifactIdentity || resolveArtifactIdentity(data);

  return {
    meta,
    artifactIdentity,
    layoutVariant,
    title: artifactIdentity.copy.lockedEndingTitle,
    body: artifactIdentity.copy.lockedEndingBody
  };
}

export function buildUnlockedEndingPageModel(data, payload, layoutVariant = 'document', entry = null) {
  const ending = (data.endings || []).find((item) => {
    if (!payload || !payload.variant || !item) return false;
    return item.variant === payload.variant;
  }) || (data.endings || [])[0] || {};
  const content = payload || ending.content || {};
  const bodyBlocks = Array.isArray(entry && entry.bodyBlocks) && entry.bodyBlocks.length
    ? entry.bodyBlocks
    : splitRichContentBlocks(content.body || content.content || '');
  const finalLine = entry && Object.prototype.hasOwnProperty.call(entry, 'finalLineOverride')
    ? entry.finalLineOverride
    : (content.finalLine || '');

  return {
    meta: buildBookletMetaModel(data),
    layoutVariant,
    title: content.title || 'Unlocked Document',
    documentType: content.documentType || '',
    kicker: content.kicker || '',
    body: joinRichContentBlocks(bodyBlocks),
    bodyBlocks,
    finalLine,
    designSpec: ending.designSpec || '',
    treatment: inferEndingTreatment(ending.designSpec),
    continuationLabel: entry && entry.continuationLabel || ''
  };
}

export function buildInterludePageModel(week, layoutVariant, interludeOverride = null, entry = null) {
  const interlude = interludeOverride || (week && week.interlude) || {};
  const bodyBlocks = Array.isArray(entry && entry.bodyBlocks) && entry.bodyBlocks.length
    ? entry.bodyBlocks
    : splitRichContentBlocks(interlude.body || '');

  return {
    weekNumber: week && week.weekNumber || 0,
    layoutVariant: layoutVariant || 'quiet',
    title: interlude.title || 'Interlude',
    reason: interlude.reason || '',
    body: joinRichContentBlocks(bodyBlocks),
    bodyBlocks,
    spreadAware: !!(interlude && (interlude.spreadAware || interlude['spread-aware'])),
    // Posted manifest (schema 1.5.0) — the forward reference this interlude
    // prints. Same normalization as fragments; see document-models.js.
    manifestPointer: normalizeManifestPointer(interlude),
    payload: interlude.payload || null,
    payloadType: interlude.payloadType || '',
    continuationLabel: entry && entry.continuationLabel || ''
  };
}

export function buildBackCoverModel(data) {
  const meta = buildBookletMetaModel(data);
  const artifactIdentity = meta.artifactIdentity || resolveArtifactIdentity(data);

  return {
    meta,
    artifactIdentity,
    colophon: artifactIdentity.copy.backColophon,
    mark: 'LiftRPG',
    generatedAt: meta.generatedAt || '',
    weekCount: meta.weekCount || 0,
    totalSessions: meta.totalSessions || 0
  };
}

export function splitRichText(text) {
  return splitParagraphs(text || '');
}
