import {
  getPasswordLength,
  pad2,
  splitParagraphs
} from './utils.js?v=17';

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

export function buildCoverPageModel(data) {
  const meta = buildBookletMetaModel(data);
  const cover = data.cover || {};

  return {
    meta,
    designation: cover.designation || '',
    title: meta.blockTitle,
    subtitle: meta.blockSubtitle,
    tagline: cover.tagline || '',
    colophonLines: cover.colophonLines || []
  };
}

export function buildRulesLeftPageModel(data) {
  const meta = buildBookletMetaModel(data);
  const leftPage = (data.rulesSpread || {}).leftPage || {};
  const reEntry = leftPage.reEntryRule;
  const reEntryText = typeof reEntry === 'string' ? reEntry : reEntry && reEntry.ruleText;

  return {
    meta,
    title: leftPage.title || 'Briefing',
    sections: leftPage.sections || [],
    reEntryText: reEntryText || ''
  };
}

export function buildSealedPageModel(data) {
  return {
    meta: buildBookletMetaModel(data),
    title: 'This Document Is Sealed',
    body: 'Assemble your password from the weekly gauge readings. Return to liftrpg.co → Render and enter it to unlock this page.'
  };
}

export function buildGaugeLogPageModel(data) {
  const meta = buildBookletMetaModel(data);
  const rightPage = (data.rulesSpread || {}).rightPage || {};

  return {
    meta,
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
  const meta = buildBookletMetaModel(data);

  return {
    meta,
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

export function buildLockedEndingPageModel(data) {
  const meta = buildBookletMetaModel(data);

  return {
    meta,
    title: 'Final Document',
    body: 'This final page remains sealed until the completed password is entered above. The booklet should give you everything you need.',
    variants: (data.endings || []).map((ending) => ending.variant || 'Variant')
  };
}

export function buildUnlockedEndingPageModel(data, payload) {
  const ending = (data.endings || []).find((item) => {
    if (!payload || !payload.variant || !item) return false;
    return item.variant === payload.variant;
  }) || (data.endings || [])[0] || {};
  const content = payload || ending.content || {};

  return {
    meta: buildBookletMetaModel(data),
    title: content.title || 'Unlocked Document',
    documentType: content.documentType || '',
    body: content.body || content.content || '',
    finalLine: content.finalLine || '',
    designSpec: ending.designSpec || '',
    treatment: inferEndingTreatment(ending.designSpec)
  };
}

export function buildNotesPageModel() {
  return {
    cellCount: 36
  };
}

export function buildBackCoverModel(data) {
  const meta = buildBookletMetaModel(data);

  return {
    meta,
    colophon: 'Printed by hand, completed in pencil, resolved through repetition.',
    mark: 'LiftRPG'
  };
}

export function splitRichText(text) {
  return splitParagraphs(text || '');
}
