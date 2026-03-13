export const MAP_FAMILY_REGISTRY = {
  'survey-grid': {
    label: 'Survey Grid',
    sourceType: 'grid',
    description: 'Grid or parcel survey map with discrete cells or tiles.'
  },
  'network-trace': {
    label: 'Network Trace',
    sourceType: 'point-to-point',
    description: 'Point-to-point or node map that tracks movement between named positions.'
  },
  'progress-track': {
    label: 'Progress Track',
    sourceType: 'linear-track',
    description: 'Linear route or escalating progress track.'
  },
  sketchspace: {
    label: 'Sketchspace',
    sourceType: 'player-drawn',
    description: 'Player-drawn cartographic or diagrammatic surface.'
  }
};

const MAP_FAMILY_BY_TYPE = Object.keys(MAP_FAMILY_REGISTRY).reduce((lookup, family) => {
  lookup[MAP_FAMILY_REGISTRY[family].sourceType] = family;
  return lookup;
}, {});

export const CIPHER_FAMILY_REGISTRY = {
  'text-extraction': {
    label: 'Text Extraction',
    sourceType: 'first-letter-per-sentence',
    description: 'Cipher extracted from surface text or positional reading of prose.'
  },
  'symbol-key': {
    label: 'Symbol Key',
    sourceType: 'substitution',
    description: 'Substitution or symbol legend cipher.'
  },
  'cross-reference': {
    label: 'Cross Reference',
    sourceType: 'fragment-cross-reference',
    description: 'Cipher solved by joining multiple artifacts or document references.'
  },
  'route-tracing': {
    label: 'Route Tracing',
    sourceType: 'path-tracing',
    description: 'Cipher solved by tracing movement, paths, or map routes.'
  },
  'typographic-anomaly': {
    label: 'Typographic Anomaly',
    sourceType: 'typographic-anomaly',
    description: 'Cipher embedded in abnormal typography, spacing, or visible document glitches.'
  }
};

const CIPHER_FAMILY_BY_TYPE = Object.keys(CIPHER_FAMILY_REGISTRY).reduce((lookup, family) => {
  lookup[CIPHER_FAMILY_REGISTRY[family].sourceType] = family;
  return lookup;
}, {});

export const ORACLE_FAMILY_REGISTRY = {
  'fragment-oracle': {
    label: 'Fragment Oracle',
    description: 'Oracle table primarily routes the player to narrative fragments.'
  },
  'consequence-oracle': {
    label: 'Consequence Oracle',
    description: 'Oracle table primarily produces state changes or gameplay consequences.'
  },
  'mixed-oracle': {
    label: 'Mixed Oracle',
    description: 'Oracle table blends fragment routing and direct gameplay consequences.'
  }
};

export const CLOCK_FAMILY_REGISTRY = {
  'progress-clock': {
    label: 'Progress Clock',
    description: 'Circular progress or threat clock surface.'
  }
};

export const ROUTE_FAMILY_REGISTRY = {
  'binary-route': {
    label: 'Binary Route',
    description: 'Week contains A/B or route-branch decision logic.'
  }
};

export const COMPANION_COMPONENT_REGISTRY = {
  dashboard: {
    family: 'dashboard',
    title: 'Campaign Dashboard',
    footprint: 'half-page',
    description: 'Status dashboard surface with slots, tracks, or summary cells.'
  },
  'return-box': {
    family: 'return-box',
    title: 'Return Box',
    footprint: 'quarter-page',
    description: 'Small return or deposit box surface for clues, cards, or values.'
  },
  'inventory-grid': {
    family: 'inventory-grid',
    title: 'Inventory Grid',
    footprint: 'half-page',
    description: 'Grid-based equipment, clue, or specimen inventory surface.'
  },
  'token-sheet': {
    family: 'token-sheet',
    title: 'Token Sheet',
    footprint: 'full-page',
    description: 'Cuttable token or counter sheet.'
  },
  'overlay-window': {
    family: 'overlay-window',
    title: 'Overlay Window',
    footprint: 'full-page',
    description: 'Overlay or alignment surface intended to interact with another page.'
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
