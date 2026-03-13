import { readingLength } from './utils.js?v=20';

export const TEMPLATE_VARIANTS = {
  'rules-left': ['standard', 'compact', 'dense'],
  'rules-right': ['standard', 'compact'],
  'gauge-log': ['standard', 'compact'],
  assembly: ['standard', 'compact'],
  boss: ['standard', 'compact', 'dense'],
  'ending-locked': ['standard', 'compact'],
  'ending-unlocked': ['letter', 'document', 'compact'],
  'field-ops': ['balanced', 'map-dominant', 'cipher-dominant', 'oracle-dominant'],
  'oracle-overflow': ['standard', 'compact'],
  'overflow-doc': ['standard', 'compact'],
  'fragment-page': ['stacked', 'tight'],
  interlude: ['quiet', 'artifact']
};

function totalRulesBodyLength(data) {
  const leftPage = ((data || {}).rulesSpread || {}).leftPage || {};
  const sectionLength = (leftPage.sections || []).reduce((sum, section) => {
    return sum + readingLength(section.body || section.text || '');
  }, 0);
  return sectionLength + readingLength((leftPage.reEntryRule && leftPage.reEntryRule.ruleText) || leftPage.reEntryRule || '');
}

export function pickDefaultTemplateVariant(type, context = {}) {
  const data = context.data || {};
  const week = context.week || {};
  const entry = context.entry || {};
  const mechanicProfile = context.mechanicProfile || {};
  const mapFamily = mechanicProfile.mapFamily || 'none';
  const cipherFamily = mechanicProfile.cipherFamily || 'none';
  const oracleFamily = mechanicProfile.oracleFamily || 'none';
  const companionComponents = mechanicProfile.companionComponents || [];

  switch (type) {
    case 'rules-left':
      return totalRulesBodyLength(data) > 1600 ? 'dense' : 'standard';
    case 'rules-right':
    case 'gauge-log':
      return (data.weeks || []).length >= 6 ? 'compact' : 'standard';
    case 'assembly':
      return (data.weeks || []).length >= 6 ? 'compact' : 'standard';
    case 'boss': {
      const boss = week.bossEncounter || {};
      const totalLength = readingLength(boss.narrative || '') + readingLength(boss.mechanismDescription || '') + readingLength(boss.convergenceProof || '');
      if (totalLength > 2600) return 'dense';
      if (totalLength > 1800) return 'compact';
      return 'standard';
    }
    case 'ending-unlocked':
      if ((entry.treatment || '').includes('letter')) return 'letter';
      if ((entry.treatment || '').includes('document')) return 'document';
      return 'document';
    case 'field-ops':
      if (companionComponents.some((component) => component.footprint === 'full-page')) return 'map-dominant';
      if (oracleFamily.includes('oracle') && !mapFamily.includes('none')) return 'balanced';
      if (!mapFamily.includes('none') && oracleFamily === 'none') return 'map-dominant';
      if (!cipherFamily.includes('none') && oracleFamily === 'none') return 'cipher-dominant';
      if (oracleFamily !== 'none') return 'oracle-dominant';
      return 'balanced';
    case 'overflow-doc': {
      const overflowLength = readingLength((((week || {}).overflowDocument || {}).body || ((week || {}).overflowDocument || {}).content || ''));
      return overflowLength > 1100 ? 'compact' : 'standard';
    }
    case 'fragment-page':
      return ((entry.fragments || []).length || 0) > 1 ? 'stacked' : 'tight';
    case 'interlude': {
      const interludeBody = ((week || {}).interlude || {}).body || ((entry || {}).interlude || {}).body || '';
      if ((((week || {}).interlude || {}).spreadAware) || (((entry || {}).interlude || {}).spreadAware)) return 'artifact';
      const interludeLength = readingLength(interludeBody);
      return interludeLength > 500 ? 'artifact' : 'quiet';
    }
    default:
      return (TEMPLATE_VARIANTS[type] || ['standard'])[0];
  }
}

export function nextTemplateVariant(type, currentVariant) {
  const variants = TEMPLATE_VARIANTS[type] || ['standard'];
  const index = variants.indexOf(currentVariant);
  if (index === -1) return variants[0];
  return variants[Math.min(index + 1, variants.length - 1)];
}
