import { make } from './dom.js';
import { createBoundedPage } from './page-shell.js';
import { getAtomDefinition } from './engine/atom-registry.js';

const WORKOUT_PAGE_TYPES = new Set(['week-header', 'session-card', 'week-footer']);
const MECHANIC_PAGE_TYPES = new Set(['cipher-panel', 'oracle-table', 'map-panel', 'tracker']);
const DEFAULT_ARTIFACT_IDENTITY = {
  shellFamily: 'field-survey',
  boardStateMode: 'survey-grid',
  attachmentStrategy: 'split-technical',
};
const BOARD_STATE_LAYOUTS = {
  'survey-grid': 'balanced',
  'node-graph': 'map-dominant',
  'ledger-board': 'cipher-dominant',
  'timeline-reconstruction': 'timeline-dominant',
  'testimony-matrix': 'matrix-dominant',
};
const BOARD_STATE_COPY = {
  'survey-grid': {
    pageTitle: 'Field Operations',
    companionLabel: 'Companion Surface',
  },
  'node-graph': {
    pageTitle: 'Route Network',
    companionLabel: 'Support Nodes',
  },
  'ledger-board': {
    pageTitle: 'Procedure Ledger',
    companionLabel: 'Tracking Ledger',
  },
  'timeline-reconstruction': {
    pageTitle: 'Reconstruction Board',
    companionLabel: 'Witness Notes',
  },
  'testimony-matrix': {
    pageTitle: 'Evidence Matrix',
    companionLabel: 'Case Surface',
  },
};

function isWorkoutPlacement(placement) {
  return WORKOUT_PAGE_TYPES.has(placement.type);
}

function isMechanicPlacement(placement) {
  return placement.type === 'boss-encounter' || MECHANIC_PAGE_TYPES.has(placement.type);
}

function workoutCompactionLevel(placements) {
  const maxDensity = placements.reduce((max, placement) => {
    return Math.max(max, Number(placement.density) || 0);
  }, 0);

  if (maxDensity >= 0.92) return 5;
  if (maxDensity >= 0.82) return 4;
  if (maxDensity >= 0.72) return 3;
  if (maxDensity >= 0.62) return 2;
  if (maxDensity >= 0.48) return 1;
  return 0;
}

function weekContextFromPlacements(placements) {
  let weekIndex = null;
  let totalWeeks = 0;

  for (const placement of placements) {
    const data = placement.atom?.data || placement.data || {};
    if (weekIndex == null && Number.isInteger(data.weekIndex)) {
      weekIndex = data.weekIndex;
    }
    if (!totalWeeks && Number.isFinite(data.totalWeeks) && data.totalWeeks > 0) {
      totalWeeks = data.totalWeeks;
    }
  }

  if (weekIndex == null || totalWeeks <= 0) return null;
  return { weekIndex, totalWeeks };
}

function resolveArtifactIdentity(placements) {
  for (const placement of placements) {
    const data = placement.atom?.data || placement.data || {};
    if (data.artifactIdentity && typeof data.artifactIdentity === 'object') {
      return {
        ...DEFAULT_ARTIFACT_IDENTITY,
        ...data.artifactIdentity,
      };
    }
  }
  return DEFAULT_ARTIFACT_IDENTITY;
}

function resolveMechanicLayoutVariant(placements, artifactIdentity) {
  const explicit = placements.find((placement) => {
    const data = placement.atom?.data || placement.data || {};
    return data.layoutVariant;
  });
  if (explicit) {
    return explicit.atom?.data?.layoutVariant || explicit.data?.layoutVariant;
  }
  return BOARD_STATE_LAYOUTS[artifactIdentity.boardStateMode] || 'balanced';
}

function resolveMechanicCopy(artifactIdentity) {
  return BOARD_STATE_COPY[artifactIdentity.boardStateMode] || BOARD_STATE_COPY['survey-grid'];
}

export function renderPlacementInto(target, placement) {
  const def = getAtomDefinition(placement.type);
  if (!def) {
    console.warn('[render-v2] No atom definition for type:', placement.type);
    return;
  }

  const rendered = def.render(placement.atom, placement.density);

  if (rendered.classList && rendered.classList.contains('booklet-page')) {
    const innerFrame = rendered.querySelector('.page-frame');
    if (innerFrame) {
      while (innerFrame.firstChild) {
        const child = innerFrame.firstChild;
        if (child.style && child.style.flex && placement.type !== 'session-card') {
          child.style.flex = '';
        }
        target.appendChild(child);
      }
    }
    return;
  }

  if (rendered.style && rendered.style.flex && placement.type !== 'session-card') {
    rendered.style.flex = '';
  }
  target.appendChild(rendered);
}

function appendWeeklyFooter(frame, placements, explicitFooterPlacement = null) {
  if (explicitFooterPlacement) {
    renderPlacementInto(frame, explicitFooterPlacement);
    return;
  }

  const weekContext = weekContextFromPlacements(placements);
  if (!weekContext) return;

  const footerDef = getAtomDefinition('week-footer');
  if (!footerDef) return;

  const footer = footerDef.render({ data: weekContext }, 0);
  footer.classList.add('week-progress-pagefooter');
  frame.appendChild(footer);
}

function renderWorkoutPage(placements, planIndex) {
  const { page, frame } = createBoundedPage(
    'workout-left',
    'workout-left',
    { boundaryRole: 'session-log', pageClass: 'page-workout-left' },
  );

  page.setAttribute('data-plan-index', String(planIndex));
  page.setAttribute('data-engine', 'v2');

  const sessionPlacements = placements.filter((placement) => placement.type === 'session-card');
  const footerPlacement = placements.find((placement) => placement.type === 'week-footer') || null;

  frame.setAttribute('data-card-count', String(sessionPlacements.length));
  frame.setAttribute('data-page-compaction', String(workoutCompactionLevel(sessionPlacements)));

  placements
    .filter((placement) => placement.type !== 'session-card' && placement.type !== 'week-footer')
    .forEach((placement) => renderPlacementInto(frame, placement));

  if (sessionPlacements.length > 0) {
    const cards = make('div', 'session-cards');
    sessionPlacements.forEach((placement) => renderPlacementInto(cards, placement));
    frame.appendChild(cards);
  }

  appendWeeklyFooter(frame, placements, footerPlacement);

  return page;
}

function renderMechanicPage(placements, planIndex) {
  const artifactIdentity = resolveArtifactIdentity(placements);
  const copy = resolveMechanicCopy(artifactIdentity);
  const layoutVariant = resolveMechanicLayoutVariant(placements, artifactIdentity);
  const { page, frame } = createBoundedPage(
    'field-ops',
    'field-ops-right',
    { boundaryRole: 'field-ops', pageClass: 'page-field-ops', layoutVariant },
  );

  page.setAttribute('data-plan-index', String(planIndex));
  page.setAttribute('data-engine', 'v2');
  page.setAttribute('data-shell-family', artifactIdentity.shellFamily || DEFAULT_ARTIFACT_IDENTITY.shellFamily);
  page.setAttribute('data-board-state-mode', artifactIdentity.boardStateMode || DEFAULT_ARTIFACT_IDENTITY.boardStateMode);
  page.setAttribute('data-attachment-strategy', artifactIdentity.attachmentStrategy || DEFAULT_ARTIFACT_IDENTITY.attachmentStrategy);

  frame.setAttribute('data-shell-family', artifactIdentity.shellFamily || DEFAULT_ARTIFACT_IDENTITY.shellFamily);
  frame.setAttribute('data-board-state-mode', artifactIdentity.boardStateMode || DEFAULT_ARTIFACT_IDENTITY.boardStateMode);
  frame.setAttribute('data-attachment-strategy', artifactIdentity.attachmentStrategy || DEFAULT_ARTIFACT_IDENTITY.attachmentStrategy);

  const header = make('header', 'rp-header');
  header.appendChild(make('span', '', copy.pageTitle || 'Field Operations'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  const content = make('div', 'rp-content');
  content.setAttribute('data-shell-family', artifactIdentity.shellFamily || DEFAULT_ARTIFACT_IDENTITY.shellFamily);
  content.setAttribute('data-board-state-mode', artifactIdentity.boardStateMode || DEFAULT_ARTIFACT_IDENTITY.boardStateMode);
  content.setAttribute('data-attachment-strategy', artifactIdentity.attachmentStrategy || DEFAULT_ARTIFACT_IDENTITY.attachmentStrategy);
  const companionPlacements = placements.filter((placement) => placement.type === 'tracker');

  placements
    .filter((placement) => placement.type !== 'tracker' && placement.type !== 'week-footer')
    .forEach((placement) => renderPlacementInto(content, placement));

  if (companionPlacements.length > 0) {
    content.setAttribute('data-has-companion', 'true');
    const companionZone = make('section', 'companion-zone');
    companionZone.appendChild(make('div', 'doc-label', copy.companionLabel || 'Companion Surface'));
    companionPlacements.forEach((placement) => renderPlacementInto(companionZone, placement));
    content.appendChild(companionZone);
  }

  frame.appendChild(content);
  appendWeeklyFooter(frame, placements);

  return page;
}

export function renderPageFromPlacements(placements, spreadType, planIndex) {
  if (placements.length === 0) return null;

  const hasWorkoutContent = placements.some(isWorkoutPlacement);
  const hasMechanicContent = placements.some(isMechanicPlacement);

  if (placements.length === 1) {
    const def = getAtomDefinition(placements[0].type);
    if (def) {
      const rendered = def.render(placements[0].atom, placements[0].density);
      if (rendered.classList && rendered.classList.contains('booklet-page')) {
        rendered.setAttribute('data-plan-index', String(planIndex));
        rendered.setAttribute('data-engine', 'v2');
        const frame = rendered.querySelector('.page-frame');
        if (frame && !frame.querySelector('.week-progress') && hasMechanicContent) {
          appendWeeklyFooter(frame, placements);
        }
        return rendered;
      }
    }
  }

  if (hasWorkoutContent) {
    return renderWorkoutPage(placements, planIndex);
  }

  if (hasMechanicContent) {
    return renderMechanicPage(placements, planIndex);
  }

  const primaryType = placements[0].type;
  const pageType = primaryType === 'fragment-doc' ? 'fragment-page' : primaryType;
  const frameClass = primaryType === 'fragment-doc'
    ? 'fragment-page page-fragment-doc'
    : 'page-' + primaryType;
  const pageClass = pageType ? 'page-shell-' + pageType : null;
  const { page, frame } = createBoundedPage(
    pageType,
    frameClass,
    { boundaryRole: spreadType, pageClass },
  );

  page.setAttribute('data-plan-index', String(planIndex));
  page.setAttribute('data-engine', 'v2');
  if (primaryType === 'fragment-doc') {
    frame.setAttribute('data-fragment-count', String(placements.length));
  }

  for (const placement of placements) {
    renderPlacementInto(frame, placement);
  }

  return page;
}
