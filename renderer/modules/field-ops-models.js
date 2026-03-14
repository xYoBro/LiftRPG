import {
  getPasswordLength,
  pad2,
  splitParagraphs
} from './utils.js?v=44';
import {
  inferCipherFamily,
  inferMapFamily,
  resolveWeekMechanicProfile
} from './mechanic-registry.js?v=44';

function splitKeyRows(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s{2,}|\s*\|\s*/).map((cell) => cell.trim()).filter(Boolean));
}

function parseClockType(clockType) {
  const normalized = String(clockType || '').trim().toLowerCase();
  if (normalized === 'danger' || normalized === 'danger-clock' || normalized === 'threat') return 'danger-clock';
  if (normalized === 'race' || normalized === 'racing' || normalized === 'racing-clock') return 'racing-clock';
  if (normalized === 'tug' || normalized === 'tug-of-war' || normalized === 'tug-of-war-clock') return 'tug-of-war-clock';
  if (normalized === 'linked' || normalized === 'linked-clock') return 'linked-clock';
  if (normalized === 'project' || normalized === 'project-clock') return 'project-clock';
  return 'progress-clock';
}

function normalizeEntries(entries) {
  return (entries || []).map((entry) => ({
    roll: entry.roll || '',
    text: entry.text || '',
    paperAction: entry.paperAction || '',
    fragmentRef: entry.fragmentRef || '',
    type: entry.type || ''
  }));
}

export function buildFieldOpsPageModels(data, week, layoutPlan = {}) {
  const fieldOps = week.fieldOps || {};
  const oracleTable = fieldOps.oracleTable || null;
  const oracleEntries = normalizeEntries((oracleTable || {}).entries || []);
  const mechanicProfile = layoutPlan.mechanicProfile || resolveWeekMechanicProfile(week);
  const useCompanionSpread = layoutPlan.companionPlacement === 'spread';
  const splitOracle = layoutPlan.layout === 'split-oracle' || layoutPlan.layout === 'oracle-only';
  const primaryOracleCount = splitOracle
    ? Math.max(0, Math.min(parseInt(layoutPlan.primaryOracleCount, 10) || 0, oracleEntries.length))
    : oracleEntries.length;
  const primaryOracleEntries = splitOracle ? oracleEntries.slice(0, primaryOracleCount) : oracleEntries;
  const overflowOracleEntries = splitOracle ? oracleEntries.slice(primaryOracleCount) : [];

  const firstPage = {
    pageType: 'field-ops',
    layoutVariant: layoutPlan.layoutVariant || 'balanced',
    headerTitle: 'Field Operations',
    cipher: fieldOps.cipher ? buildCipherModel(fieldOps.cipher, week.weeklyComponent, mechanicProfile) : null,
    mapState: fieldOps.mapState ? buildMapModel(fieldOps.mapState, mechanicProfile) : null,
    gameplayClocks: useCompanionSpread ? [] : buildClockModels(week.gameplayClocks),
    companionComponents: useCompanionSpread ? [] : buildCompanionModels(mechanicProfile.companionComponents),
    mechanicProfile,
    oracle: primaryOracleEntries.length
      ? buildOracleModel({
        ...(oracleTable || {}),
        entries: primaryOracleEntries
      })
      : null,
    layout: splitOracle ? 'split-oracle' : 'standard'
  };

  if (!splitOracle || !oracleTable || !overflowOracleEntries.length) return [firstPage];

  return [
    firstPage,
    {
      pageType: 'oracle-overflow',
      layoutVariant: layoutPlan.layoutVariant || 'standard',
      headerTitle: 'Field Operations',
      cipher: null,
      mapState: null,
      gameplayClocks: [],
      companionComponents: [],
      mechanicProfile,
      oracle: buildOracleModel({
        ...oracleTable,
        entries: overflowOracleEntries
      }),
      layout: 'oracle-only'
    }
  ];
}

export function buildBossPageModel(data, week, options = 'standard') {
  const boss = week.bossEncounter || {};
  const decodingKey = boss.decodingKey || {};
  const entry = options && typeof options === 'object' ? options : {};
  const layoutVariant = typeof options === 'string' ? options : (entry.layoutVariant || 'standard');
  const continuationSegment = entry.continuationSegment || 'full';
  const isContinuation = continuationSegment === 'followup';
  const hasConvergenceAppendix = !!(
    boss.convergenceProof
    || (boss.binaryChoiceAcknowledgement && (boss.binaryChoiceAcknowledgement.ifA || boss.binaryChoiceAcknowledgement.ifB))
  );

  return {
    layoutVariant,
    continuationSegment,
    continuationLabel: entry.continuationLabel || '',
    weekLabel: 'Week ' + pad2(week.weekNumber),
    title: isContinuation
      ? ((boss.title || week.title || 'Convergence') + ' — Continued')
      : (boss.title || week.title || 'Convergence'),
    narrativeParagraphs: isContinuation ? [] : splitParagraphs(boss.narrative || ''),
    mechanismParagraphs: isContinuation ? [] : splitParagraphs(boss.mechanismDescription || ''),
    decodingInstruction: isContinuation ? '' : (decodingKey.instruction || ''),
    decodingTable: isContinuation ? '' : (decodingKey.referenceTable || ''),
    componentInputs: isContinuation ? [] : (boss.componentInputs || []).map((item, index) => ({
      weekLabel: 'W' + pad2(index + 1),
      value: item
    })),
    passwordRevealInstruction: boss.passwordRevealInstruction || 'When the final word is assembled, enter it at liftrpg.co to unlock the ending.',
    passwordLength: getPasswordLength(data, (boss.componentInputs || []).length || 6),
    convergenceProof: (!isContinuation && hasConvergenceAppendix) ? '' : (boss.convergenceProof || ''),
    convergenceProofParagraphs: isContinuation ? splitParagraphs(boss.convergenceProof || '') : [],
    binaryChoiceAcknowledgement: isContinuation ? (boss.binaryChoiceAcknowledgement || null) : null
  };
}

export function buildCompanionModels(components) {
  return (components || []).map((component, index) => ({
    id: component.id || 'companion-' + index,
    type: component.type || 'custom',
    family: component.family || 'custom-companion',
    title: component.title || 'Companion Component',
    body: component.body || component.instruction || component.prompt || '',
    subtitle: component.subtitle || '',
    rows: component.rows || 0,
    cols: component.cols || 0,
    slots: Array.isArray(component.slots) ? component.slots : [],
    tracks: Array.isArray(component.tracks) ? component.tracks : [],
    tokens: Array.isArray(component.tokens) ? component.tokens : [],
    conditions: Array.isArray(component.conditions) ? component.conditions : [],
    windows: Array.isArray(component.windows) ? component.windows : [],
    usageDie: component.usageDie || component.usage || '',
    playWindow: component.playWindow || 'rest',
    reminder: component.reminder || '',
    footprint: component.footprint || 'half-page'
  }));
}

export function buildCipherModel(cipher, weeklyComponent, mechanicProfile = null) {
  const body = cipher.body || {};
  const keyRows = splitKeyRows(body.key || '');
  const family = inferCipherFamily(cipher.type || '') || (mechanicProfile && mechanicProfile.cipherFamily) || 'none';

  return {
    type: cipher.type || '',
    family,
    title: cipher.title || 'Cipher',
    sequenceText: body.displayText || '',
    keyText: body.key || '',
    keyRows,
    workSpace: body.workSpace || null,
    workspaceStyle: body.workSpace && body.workSpace.style || '',
    referenceTargets: Array.isArray(body.referenceTargets) ? body.referenceTargets : [],
    extractionInstruction: cipher.extractionInstruction || (weeklyComponent && weeklyComponent.extractionInstruction) || 'Record the derived value.',
    noticeabilityDesign: cipher.noticeabilityDesign || '',
    characterDerivationProof: cipher.characterDerivationProof || ''
  };
}

export function buildOracleModel(oracle) {
  if (!oracle) return null;
  return {
    title: oracle.title || 'Oracle',
    instruction: oracle.instruction || '',
    mode: oracle.mode || '',
    entries: normalizeEntries(oracle.entries)
  };
}

export function buildClockModels(clocks) {
  return (clocks || []).map((clock) => ({
    clockName: clock.clockName || 'Clock',
    segments: parseInt(clock.segments, 10) || 4,
    clockType: parseClockType(clock.clockType),
    startValue: Math.max(0, Math.min(parseInt(clock.startValue, 10) || 0, parseInt(clock.segments, 10) || 4)),
    direction: String(clock.direction || '').trim().toLowerCase() || 'fill',
    linkedClockName: clock.linkedClockName || clock.linkedTo || '',
    opposedClockName: clock.opposedClockName || clock.racingAgainst || '',
    thresholds: Array.isArray(clock.thresholds) ? clock.thresholds : [],
    consequenceOnFull: clock.consequenceOnFull || ''
  }));
}

export function buildMapModel(mapState, mechanicProfile = null) {
  if (!mapState) return null;
  const family = inferMapFamily(mapState.mapType || '') || (mechanicProfile && mechanicProfile.mapFamily) || 'none';

  return {
    family,
    mapType: mapState.mapType || 'grid',
    title: mapState.title || 'Map',
    mapNote: mapState.mapNote || '',
    floorLabel: mapState.floorLabel || '',
    gridDimensions: mapState.gridDimensions || { columns: 6, rows: 5 },
    tiles: mapState.tiles || [],
    currentPosition: mapState.currentPosition || null,
    nodes: mapState.nodes || [],
    edges: mapState.edges || [],
    currentNode: mapState.currentNode || '',
    positions: mapState.positions || [],
    direction: mapState.direction || 'horizontal',
    dimensions: mapState.dimensions || { columns: 12, rows: 8 },
    prompts: mapState.prompts || [],
    seedMarkers: mapState.seedMarkers || [],
    canvasType: mapState.canvasType || 'dot-grid'
  };
}
