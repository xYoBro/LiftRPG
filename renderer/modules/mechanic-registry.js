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
// Alias: LLMs sometimes generate "node-graph" instead of "point-to-point"
MAP_FAMILY_BY_TYPE['node-graph'] = 'network-trace';

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
  },
  'danger-clock': {
    label: 'Danger Clock',
    description: 'Escalating threat clock that fills toward a complication.'
  },
  'racing-clock': {
    label: 'Racing Clock',
    description: 'One of two opposed clocks that compete toward resolution.'
  },
  'tug-of-war-clock': {
    label: 'Tug Of War Clock',
    description: 'Clock whose filled state can rise or fall as control shifts.'
  },
  'linked-clock': {
    label: 'Linked Clock',
    description: 'Clock that unlocks or advances another clock when filled.'
  },
  'project-clock': {
    label: 'Project Clock',
    description: 'Long-term project or investigation clock that accumulates progress across weeks.'
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
  },
  'stress-track': {
    family: 'stress-track',
    title: 'Stress Track',
    footprint: 'half-page',
    description: 'Escalating psychological or environmental pressure track with threshold consequences.'
  },
  'usage-die': {
    family: 'usage-die',
    title: 'Usage Die',
    footprint: 'quarter-page',
    description: 'Resource depletion tracker that steps down through die sizes.'
  },
  'memory-slots': {
    family: 'memory-slots',
    title: 'Memory Slots',
    footprint: 'half-page',
    description: 'Slot-limited memory or evidence surface where new entries crowd out older ones.'
  }
};

const COMPANION_FOOTPRINT_WEIGHT = {
  'quarter-page': 0.42,
  'half-page': 0.82,
  'full-page': 1.32
};

export function inferMapFamily(mapType) {
  const value = String(mapType || '').trim();
  return MAP_FAMILY_BY_TYPE[value] || (value ? 'custom-map' : 'none');
}

export function inferCipherFamily(cipherType) {
  const value = String(cipherType || '').trim();
  return CIPHER_FAMILY_BY_TYPE[value] || (value ? 'custom-cipher' : 'none');
}

function normalizeMapFamily(fieldOps) {
  const mapType = ((fieldOps || {}).mapState || {}).mapType || '';
  return inferMapFamily(mapType);
}

function normalizeCipherFamily(fieldOps) {
  const cipherType = ((fieldOps || {}).cipher || {}).type || '';
  return inferCipherFamily(cipherType);
}

function normalizeOracleFamily(fieldOps) {
  const declaredMode = String((((fieldOps || {}).oracleTable || {}).mode) || '').trim().toLowerCase();
  const oracleEntries = ((((fieldOps || {}).oracleTable || {}).entries) || []);
  if (!oracleEntries.length) return 'none';

  if (declaredMode === 'fragment' || declaredMode === 'fragment-oracle') return 'fragment-oracle';
  if (declaredMode === 'consequence' || declaredMode === 'consequence-oracle') return 'consequence-oracle';
  if (declaredMode === 'mixed' || declaredMode === 'mixed-oracle') return 'mixed-oracle';

  const hasConsequences = oracleEntries.some((entry) => entry && entry.type === 'consequence');
  const hasFragments = oracleEntries.some((entry) => entry && entry.fragmentRef);
  if (hasConsequences && hasFragments) return 'mixed-oracle';
  if (hasConsequences) return 'consequence-oracle';
  return 'fragment-oracle';
}

function normalizeClockFamily(week) {
  const clocks = week && Array.isArray(week.gameplayClocks) ? week.gameplayClocks : [];
  if (!clocks.length) return 'none';

  const types = clocks.map((clock) => String(clock && clock.clockType || '').trim().toLowerCase()).filter(Boolean);
  if (types.includes('linked') || types.includes('linked-clock')) return 'linked-clock';
  if (types.includes('race') || types.includes('racing') || types.includes('racing-clock')) return 'racing-clock';
  if (types.includes('tug-of-war') || types.includes('tug') || types.includes('tug-of-war-clock')) return 'tug-of-war-clock';
  if (types.includes('danger') || types.includes('threat') || types.includes('danger-clock')) return 'danger-clock';
  if (types.includes('project') || types.includes('project-clock')) return 'project-clock';
  return 'progress-clock';
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

export function getCompanionComponentWeight(component) {
  const footprint = String((component && component.footprint) || 'half-page').trim().toLowerCase();
  const family = String((component && component.family) || '').trim().toLowerCase();
  let weight = COMPANION_FOOTPRINT_WEIGHT[footprint] || COMPANION_FOOTPRINT_WEIGHT['half-page'];

  if (family === 'stress-track' || family === 'memory-slots' || family === 'dashboard') {
    weight += 0.16;
  }
  if (family === 'overlay-window' || family === 'token-sheet') {
    weight += 0.2;
  }
  if (family === 'usage-die' || family === 'return-box') {
    weight -= 0.06;
  }

  return Math.max(0.28, weight);
}

export function getCompanionSurfaceWeight(components) {
  return (components || []).reduce((sum, component) => {
    return sum + getCompanionComponentWeight(component);
  }, 0);
}

export function shouldUseCompanionSpread(week, mechanicProfile = null) {
  const fieldOps = (week || {}).fieldOps || {};
  const profile = mechanicProfile || resolveWeekMechanicProfile(week);
  const components = profile.companionComponents || [];
  const gameplayClocks = Array.isArray((week || {}).gameplayClocks) ? week.gameplayClocks : [];
  const totalWeight = profile.companionSurfaceWeight || getCompanionSurfaceWeight(components);

  if (!components.length) return false;
  if (!(fieldOps.mapState || fieldOps.cipher || fieldOps.oracleTable)) return false;
  if (components.some((component) => component.footprint === 'full-page')) return true;
  if (components.length >= 3) return true;
  if (gameplayClocks.length >= 2 && totalWeight >= 1.2) return true;
  if (totalWeight >= 1.7) return true;
  if ((profile.clockFamily || 'none') !== 'none' && totalWeight >= 1.35) return true;
  return false;
}

export function resolveWeekMechanicProfile(week) {
  const fieldOps = week.fieldOps || {};
  const companionComponents = normalizeCompanionComponents(fieldOps);
  const companionSurfaceWeight = getCompanionSurfaceWeight(companionComponents);

  return {
    mapFamily: normalizeMapFamily(fieldOps),
    cipherFamily: normalizeCipherFamily(fieldOps),
    oracleFamily: normalizeOracleFamily(fieldOps),
    clockFamily: normalizeClockFamily(week),
    routeFamily: normalizeBinaryRouteFamily(week),
    companionComponents,
    companionFamilies: companionComponents.map((component) => component.family),
    companionSurfaceWeight,
    needsCompanionSpread: shouldUseCompanionSpread(week, {
      companionComponents,
      companionSurfaceWeight,
      clockFamily: normalizeClockFamily(week)
    })
  };
}
