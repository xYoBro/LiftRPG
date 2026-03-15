import {
  getPasswordLength,
  joinRichContentBlocks,
  pad2,
  splitRichContentBlocks,
  splitParagraphs
} from './utils.js?v=46';

function humanizeComponentType(value) {
  return String(value || 'component').replace(/-/g, ' ');
}

export function buildBookletMetaModel(data) {
  const meta = data.meta || {};

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
    passwordLength: getPasswordLength(data, (data.weeks || []).length || 6)
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

export function buildCoverPageModel(data) {
  const meta = buildBookletMetaModel(data);
  const cover = data.cover || {};
  const designation = cover.designation || '';

  return {
    meta,
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
  const leftPage = (data.rulesSpread || {}).leftPage || {};
  const reEntry = leftPage.reEntryRule;
  const reEntryText = typeof reEntry === 'string' ? reEntry : reEntry && reEntry.ruleText;

  return {
    meta,
    layoutVariant: layoutVariant || 'standard',
    title: leftPage.title || 'Briefing',
    sections: leftPage.sections || [],
    reEntryText: reEntryText || ''
  };
}

export function buildSealedPageModel(data, layoutVariant = 'standard') {
  return {
    meta: buildBookletMetaModel(data),
    layoutVariant,
    title: 'This Document Is Sealed',
    body: 'Assemble your password from the weekly gauge readings. Return to liftrpg.co → Render and enter it to unlock this page.'
  };
}

export function buildGaugeLogPageModel(data) {
  return buildGaugeLogPageModelWithVariant(data, 'standard');
}

export function buildGaugeLogPageModelWithVariant(data, layoutVariant) {
  const meta = buildBookletMetaModel(data);
  const rightPage = (data.rulesSpread || {}).rightPage || {};

  return {
    meta,
    layoutVariant: layoutVariant || 'standard',
    title: rightPage.title || 'Gauge Reading Log',
    instruction: rightPage.instruction || '',
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

  return {
    meta,
    layoutVariant: layoutVariant || 'standard',
    title: 'Password Assembly',
    subtitle: 'Transfer each recorded weekly value into the final assembly ladder. Decode only when the boss page gives the rule.',
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

  return {
    meta,
    layoutVariant,
    title: 'Final Document',
    body: 'This final page remains sealed until the completed password is entered above. The booklet should give you everything you need.',
    variants: (data.endings || []).map((ending) => ending.variant || 'Variant')
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

  return {
    meta,
    colophon: 'Printed by hand, completed in pencil, resolved through repetition.',
    mark: 'LiftRPG',
    generatedAt: meta.generatedAt || '',
    weekCount: meta.weekCount || 0,
    totalSessions: meta.totalSessions || 0
  };
}

export function splitRichText(text) {
  return splitParagraphs(text || '');
}
