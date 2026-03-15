import { pad2 } from './utils.js?v=46';
import { buildClockModels, buildCompanionModels } from './field-ops-models.js?v=46';
import { resolveWeekMechanicProfile } from './mechanic-registry.js?v=46';

function componentWeight(component) {
  const footprint = String((component && component.footprint) || 'half-page').trim().toLowerCase();
  const family = String((component && component.family) || '').trim().toLowerCase();
  let weight = footprint === 'full-page' ? 1.3 : footprint === 'quarter-page' ? 0.38 : 0.8;

  if (family === 'stress-track' || family === 'memory-slots' || family === 'dashboard') weight += 0.14;
  if (family === 'usage-die' || family === 'return-box') weight -= 0.08;

  return Math.max(0.28, weight);
}

function splitComponentsForSpread(components, clockCount, layoutVariant) {
  const list = Array.isArray(components) ? components.slice() : [];
  if (!list.length) {
    return { leftComponents: [], rightComponents: [] };
  }

  if (list.length === 1) {
    return clockCount > 0
      ? { leftComponents: [], rightComponents: list }
      : { leftComponents: list, rightComponents: [] };
  }

  const leftComponents = [];
  const rightComponents = [];
  let leftLoad = clockCount > 0 ? (layoutVariant === 'clock-dominant' ? 0.95 : 0.72) : 0;
  let rightLoad = 0;

  list.forEach((component, index) => {
    const weight = componentWeight(component);
    const isFullPage = component.footprint === 'full-page';

    if (isFullPage && rightComponents.length === 0) {
      rightComponents.push(component);
      rightLoad += weight;
      return;
    }

    if (index === 0 && layoutVariant === 'clock-dominant' && rightComponents.length === 0) {
      rightComponents.push(component);
      rightLoad += weight;
      return;
    }

    if (leftLoad <= rightLoad) {
      leftComponents.push(component);
      leftLoad += weight;
    } else {
      rightComponents.push(component);
      rightLoad += weight;
    }
  });

  if (!leftComponents.length && rightComponents.length > 1) {
    leftComponents.push(rightComponents.shift());
  }
  if (!rightComponents.length && leftComponents.length > 1) {
    rightComponents.push(leftComponents.pop());
  }

  return { leftComponents, rightComponents };
}

function buildSpreadPageModel(week, pageType, side, layoutVariant, gameplayClocks, components, mechanicProfile) {
  const weekLabel = 'Week ' + pad2((week || {}).weekNumber || 0);
  const weeklyComponent = (week || {}).weeklyComponent || {};
  return {
    pageType,
    side,
    layoutVariant: layoutVariant || 'balanced',
    headerTitle: 'Companion Surface',
    weekLabel,
    title: (week && week.title) || 'Companion Surface',
    subtitle: weeklyComponent.extractionInstruction || '',
    gameplayClocks,
    companionComponents: components,
    mechanicProfile
  };
}

export function buildCompanionSpreadPageModels(week, layoutPlan = {}) {
  const mechanicProfile = layoutPlan.mechanicProfile || resolveWeekMechanicProfile(week);
  const gameplayClocks = buildClockModels((week || {}).gameplayClocks || []);
  const components = buildCompanionModels(mechanicProfile.companionComponents || []);
  const layoutVariant = layoutPlan.layoutVariant || 'balanced';
  const split = splitComponentsForSpread(components, gameplayClocks.length, layoutVariant);

  return [
    buildSpreadPageModel(
      week,
      'companion-spread-left',
      'left',
      layoutVariant,
      gameplayClocks,
      split.leftComponents,
      mechanicProfile
    ),
    buildSpreadPageModel(
      week,
      'companion-spread-right',
      'right',
      layoutVariant,
      [],
      split.rightComponents,
      mechanicProfile
    )
  ];
}
