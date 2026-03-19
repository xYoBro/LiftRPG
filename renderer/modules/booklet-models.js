import {
  getPasswordLength,
  joinRichContentBlocks,
  pad2,
  splitRichContentBlocks,
  splitParagraphs
} from './utils.js?v=47';

function humanizeComponentType(value) {
  return String(value || 'component').replace(/-/g, ' ');
}

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
    sealedTitle: 'Sealed Incident Annex',
    sealedBody: 'Do not open this annex until the packet’s logged values have been reconciled and the final incident designation has been derived.',
    gaugeTitle: 'Recorded Values Log',
    gaugeLabel: 'Full Designation',
    assemblyTitle: 'Incident Designation Assembly',
    assemblySubtitle: 'Transfer each recorded value into the final designation ladder. The annex opens only after the incident name is reconstructed in order.',
    finalLabel: 'Incident Name',
    lockedEndingTitle: 'Sealed Incident Annex',
    lockedEndingBody: 'This annex stays sealed until the final designation is reconstructed from the packet. No preview text is available before unlock.',
    backColophon: 'Filed for internal circulation. Complete in pencil. Unlock only after full convergence.'
  },
  'ship-logbook': {
    rulesTitle: 'Bridge Procedure',
    sealedTitle: 'Sealed Captain\'s Addendum',
    sealedBody: 'Log each weekly reading, then reconstruct the vessel designation before opening the captain’s addendum.',
    gaugeTitle: 'Bridge Log',
    gaugeLabel: 'Final Designation',
    assemblyTitle: 'Vessel Designation Assembly',
    assemblySubtitle: 'Transfer each logged reading into the final designation ladder. Confirm the designation before opening the captain’s addendum.',
    finalLabel: 'Vessel Designation',
    lockedEndingTitle: 'Captain\'s Addendum',
    lockedEndingBody: 'The captain’s final addendum remains sealed until the bridge log resolves into a complete designation.',
    backColophon: 'Logged at sea, completed by hand, resolved from the bridge.'
  },
  'witness-binder': {
    rulesTitle: 'Binder Orientation',
    sealedTitle: 'Sealed Testimony',
    sealedBody: 'Complete the binder’s logged evidence chain before opening the sealed testimony at the end of the file.',
    gaugeTitle: 'Evidence Log',
    gaugeLabel: 'Resolved Name',
    assemblyTitle: 'Evidence Chain Assembly',
    assemblySubtitle: 'Transfer each recorded clue into the final evidence chain. Open the sealed testimony only after the name resolves in order.',
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
    sealedTitle: 'Sealed Family Letter',
    sealedBody: 'Record each weekly value in the archive log, then assemble the final family designation before opening the sealed letter.',
    gaugeTitle: 'Archive Log',
    gaugeLabel: 'Family Designation',
    assemblyTitle: 'Archive Assembly',
    assemblySubtitle: 'Transfer each archived value into the final ladder. Open the sealed letter only after the designation is complete.',
    finalLabel: 'Family Designation',
    lockedEndingTitle: 'Sealed Family Letter',
    lockedEndingBody: 'This final letter remains sealed until the archive’s designation is fully assembled.',
    backColophon: 'Archived at home, annotated by hand, resolved through careful return.'
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

function toShellFamily(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function inferShellFamily(meta = {}, theme = {}) {
  const explicit = toShellFamily(meta.artifactIdentity && meta.artifactIdentity.shellFamily);
  if (explicit && SHELL_FAMILY_COPY[explicit]) return explicit;

  const artifactClass = String((meta.artifactIdentity && meta.artifactIdentity.artifactClass) || '').toLowerCase();
  if (artifactClass.includes('ship')) return 'ship-logbook';
  if (artifactClass.includes('court')) return 'court-packet';
  if (artifactClass.includes('devotional')) return 'devotional-manual';
  if (artifactClass.includes('witness')) return 'witness-binder';
  if (artifactClass.includes('archive') || artifactClass.includes('household')) return 'household-archive';
  if (artifactClass.includes('manual')) return 'technical-manual';
  if (artifactClass.includes('packet') || artifactClass.includes('dossier')) return 'classified-packet';

  switch (String(theme.visualArchetype || '').toLowerCase()) {
    case 'government': return 'classified-packet';
    case 'nautical': return 'ship-logbook';
    case 'occult': return 'devotional-manual';
    case 'minimalist': return 'technical-manual';
    default: return 'field-survey';
  }
}

export function resolveArtifactIdentity(data = {}) {
  const meta = data.meta || {};
  const theme = data.theme || {};
  const raw = meta.artifactIdentity || {};
  const shellFamily = inferShellFamily(meta, theme);
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

export function buildRulesLeftPageModel(data) {
  return buildRulesLeftPageModelWithVariant(data, 'standard');
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
    supportNote: 'No worries if you do not have dice. Ask Google to roll a d100.'
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

export function buildGaugeLogPageModel(data) {
  return buildGaugeLogPageModelWithVariant(data, 'standard');
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

export function buildNotesPageModel() {
  return {
    cellCount: 36
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
