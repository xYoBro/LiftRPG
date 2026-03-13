const MAP_FAMILY_BY_TYPE = {
  grid: 'survey-grid',
  'point-to-point': 'network-trace',
  'linear-track': 'progress-track',
  'player-drawn': 'sketchspace'
};

const CIPHER_FAMILY_BY_TYPE = {
  'first-letter-per-sentence': 'text-extraction',
  substitution: 'symbol-key',
  'fragment-cross-reference': 'cross-reference',
  'path-tracing': 'route-tracing',
  'typographic-anomaly': 'typographic-anomaly'
};

export const COMPANION_COMPONENT_REGISTRY = {
  dashboard: {
    family: 'dashboard',
    title: 'Campaign Dashboard',
    footprint: 'half-page'
  },
  'return-box': {
    family: 'return-box',
    title: 'Return Box',
    footprint: 'quarter-page'
  },
  'inventory-grid': {
    family: 'inventory-grid',
    title: 'Inventory Grid',
    footprint: 'half-page'
  },
  'token-sheet': {
    family: 'token-sheet',
    title: 'Token Sheet',
    footprint: 'full-page'
  },
  'overlay-window': {
    family: 'overlay-window',
    title: 'Overlay Window',
    footprint: 'full-page'
  }
};

function normalizeMapFamily(fieldOps) {
  const mapType = ((fieldOps || {}).mapState || {}).mapType || '';
  return MAP_FAMILY_BY_TYPE[mapType] || (mapType ? 'custom-map' : 'none');
}

function normalizeCipherFamily(fieldOps) {
  const cipherType = ((fieldOps || {}).cipher || {}).type || '';
  return CIPHER_FAMILY_BY_TYPE[cipherType] || (cipherType ? 'custom-cipher' : 'none');
}

function normalizeOracleFamily(fieldOps) {
  const oracleEntries = ((((fieldOps || {}).oracleTable || {}).entries) || []);
  if (!oracleEntries.length) return 'none';

  const hasConsequences = oracleEntries.some((entry) => entry && entry.type === 'consequence');
  const hasFragments = oracleEntries.some((entry) => entry && entry.fragmentRef);
  if (hasConsequences && hasFragments) return 'mixed-oracle';
  if (hasConsequences) return 'consequence-oracle';
  return 'fragment-oracle';
}

function normalizeClockFamily(week) {
  const clocks = week && Array.isArray(week.gameplayClocks) ? week.gameplayClocks : [];
  return clocks.length ? 'progress-clock' : 'none';
}

function normalizeBinaryRouteFamily(week) {
  const hasBinaryChoice = (week.sessions || []).some((session) => session && session.binaryChoice);
  return hasBinaryChoice ? 'binary-route' : 'none';
}

function normalizeCompanionComponents(fieldOps) {
  return (((fieldOps || {}).companionComponents) || [])
    .map((component) => {
      const type = String(component && component.type || '').trim();
      const registryEntry = COMPANION_COMPONENT_REGISTRY[type] || null;
      return {
        ...component,
        type,
        family: registryEntry ? registryEntry.family : (type || 'custom-companion'),
        title: component && component.title || (registryEntry && registryEntry.title) || 'Companion Component',
        footprint: component && component.footprint || (registryEntry && registryEntry.footprint) || 'half-page'
      };
    });
}

export function resolveWeekMechanicProfile(week) {
  const fieldOps = week.fieldOps || {};
  const companionComponents = normalizeCompanionComponents(fieldOps);

  return {
    mapFamily: normalizeMapFamily(fieldOps),
    cipherFamily: normalizeCipherFamily(fieldOps),
    oracleFamily: normalizeOracleFamily(fieldOps),
    clockFamily: normalizeClockFamily(week),
    routeFamily: normalizeBinaryRouteFamily(week),
    companionComponents,
    companionFamilies: companionComponents.map((component) => component.family)
  };
}
