import {
  getPasswordLength,
  pad2,
  splitParagraphs
} from './utils.js?v=22';
import { resolveWeekMechanicProfile } from './mechanic-registry.js?v=22';

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
  const splitOracle = layoutPlan.layout === 'split-oracle' || layoutPlan.layout === 'oracle-only';
  const primaryOracleCount = splitOracle
    ? Math.max(0, Math.min(parseInt(layoutPlan.primaryOracleCount, 10) || 0, oracleEntries.length))
    : oracleEntries.length;
  const primaryOracleEntries = splitOracle ? oracleEntries.slice(0, primaryOracleCount) : oracleEntries;
  const overflowOracleEntries = splitOracle ? oracleEntries.slice(primaryOracleCount) : [];

  const firstPage = {
    pageType: 'field-ops',
    layoutVariant: layoutPlan.layoutVariant || 'balanced',
    headerTitle: fieldOps.mapState && fieldOps.mapState.title || week.title || 'Field Operations',
    cipher: fieldOps.cipher ? buildCipherModel(fieldOps.cipher, week.weeklyComponent) : null,
    mapState: fieldOps.mapState ? buildMapModel(fieldOps.mapState) : null,
    gameplayClocks: buildClockModels(week.gameplayClocks),
    companionComponents: buildCompanionModels(mechanicProfile.companionComponents),
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
      headerTitle: oracleTable.title || 'Oracle',
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

export function buildBossPageModel(data, week, layoutVariant = 'standard') {
  const boss = week.bossEncounter || {};
  const decodingKey = boss.decodingKey || {};

  return {
    layoutVariant,
    weekLabel: 'Week ' + pad2(week.weekNumber),
    title: boss.title || week.title || 'Convergence',
    narrativeParagraphs: splitParagraphs(boss.narrative || ''),
    mechanismParagraphs: splitParagraphs(boss.mechanismDescription || ''),
    decodingInstruction: decodingKey.instruction || '',
    decodingTable: decodingKey.referenceTable || '',
    componentInputs: (boss.componentInputs || []).map((item, index) => ({
      weekLabel: 'W' + pad2(index + 1),
      value: item
    })),
    passwordRevealInstruction: boss.passwordRevealInstruction || 'When the final word is assembled, enter it at liftrpg.co to unlock the ending.',
    passwordLength: getPasswordLength(data, (boss.componentInputs || []).length || 6),
    convergenceProof: boss.convergenceProof || '',
    convergenceProofParagraphs: splitParagraphs(boss.convergenceProof || ''),
    binaryChoiceAcknowledgement: boss.binaryChoiceAcknowledgement || null
  };
}

function buildCompanionModels(components) {
  return (components || []).map((component, index) => ({
    id: component.id || 'companion-' + index,
    type: component.type || 'custom',
    family: component.family || 'custom-companion',
    title: component.title || 'Companion Component',
    body: component.body || component.instruction || component.prompt || '',
    rows: component.rows || 0,
    cols: component.cols || 0,
    slots: Array.isArray(component.slots) ? component.slots : [],
    footprint: component.footprint || 'half-page'
  }));
}

export function buildCipherModel(cipher, weeklyComponent) {
  const body = cipher.body || {};

  return {
    type: cipher.type || '',
    title: cipher.title || 'Cipher',
    sequenceText: body.displayText || '',
    keyText: body.key || '',
    workSpace: body.workSpace || null,
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
    consequenceOnFull: clock.consequenceOnFull || ''
  }));
}

export function buildMapModel(mapState) {
  if (!mapState) return null;

  return {
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
