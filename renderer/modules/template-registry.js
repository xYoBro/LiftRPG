import { readingLength } from './utils.js?v=30';

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
  'overflow-doc': ['standard', 'compact', 'dense'],
  'fragment-page': ['stacked', 'tight', 'dense'],
  interlude: ['quiet', 'artifact']
};

export const TEMPLATE_VARIANT_DETAILS = {
  'rules-left': {
    standard: 'Generous leading and spacing for the opening orientation page.',
    compact: 'Tighter rules page with reduced leading and margin use.',
    dense: 'Most compressed orientation layout for unusually long setup text.'
  },
  'rules-right': {
    standard: 'Centered sealed-page treatment with broad negative space.',
    compact: 'Tighter sealed-page treatment for longer supporting copy.'
  },
  'gauge-log': {
    standard: 'Normal weekly gauge log spacing.',
    compact: 'Condensed gauge log spacing for longer cycles.'
  },
  assembly: {
    standard: 'Standard password-assembly ladder and final word block.',
    compact: 'Reduced spacing for longer cycles or denser final instructions.'
  },
  boss: {
    standard: 'Full convergence page treatment.',
    compact: 'Reduced boss spacing while preserving all sections.',
    dense: 'Most compressed boss layout before overflow is considered unresolved.'
  },
  'ending-locked': {
    standard: 'Default locked ending notice.',
    compact: 'Reduced spacing for multi-variant ending summaries.'
  },
  'ending-unlocked': {
    letter: 'Warm, personal letter treatment.',
    document: 'Formal recovered-document treatment.',
    compact: 'Reduced spacing for unusually long unlocked endings.'
  },
  'field-ops': {
    balanced: 'Evenly balanced map, cipher, and oracle surface.',
    'map-dominant': 'Map or spatial companion takes visual precedence.',
    'cipher-dominant': 'Cipher or extraction surface dominates the right page.',
    'oracle-dominant': 'Oracle table dominates the right page.'
  },
  'oracle-overflow': {
    standard: 'Default continuation oracle page.',
    compact: 'Tighter continuation oracle page.'
  },
  'overflow-doc': {
    standard: 'Recovered-document continuation page with regular spacing.',
    compact: 'Reduced document spacing for longer overflow documents.',
    dense: 'Most compressed recovered-document page before overflow is considered unresolved.'
  },
  'fragment-page': {
    stacked: 'Normal archive page with one or two document blocks.',
    tight: 'Compressed archive page for dense single-document content.',
    dense: 'Most compressed archive page for long single-document artifacts.'
  },
  interlude: {
    quiet: 'Minimal interlude treatment with restrained chrome.',
    artifact: 'Artifact-forward interlude treatment with more document character.'
  }
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
      if (overflowLength > 1800) return 'dense';
      return overflowLength > 1100 ? 'compact' : 'standard';
    }
    case 'fragment-page': {
      if (((entry.fragments || []).length || 0) > 1) return 'stacked';
      const fragment = (entry.fragments || [])[0] || {};
      const fragmentLength = readingLength(fragment.body || fragment.content || '');
      return fragmentLength > 1800 ? 'dense' : 'tight';
    }
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
