import { make } from './dom.js?v=44';
import { getPageAtom } from './atom-registry.js?v=44';
import { normalizeBookletPlan, planBookletLayout, planWorkoutPageLayout } from './layout-governor.js?v=44';
import { createBoundedPage } from './page-shell.js?v=44';
import {
  buildAssemblyPageModelWithVariant,
  buildBackCoverModel,
  buildCoverPageModel,
  buildGaugeLogPageModelWithVariant,
  buildInterludePageModel,
  buildLockedEndingPageModel,
  buildNotesPageModel,
  buildRulesLeftPageModelWithVariant,
  buildSealedPageModel,
  buildUnlockedEndingPageModel
} from './booklet-models.js?v=44';
import {
  renderAssemblyPage,
  renderBackCover,
  renderCoverPage,
  renderGaugeLogPage,
  renderInterludePage,
  renderLockedEndingPage,
  renderNotesPage,
  renderRulesLeftPage,
  renderSealedPage,
  renderUnlockedEndingPage
} from './booklet-primitives.js?v=44';
import { buildDocumentPageModel } from './document-models.js?v=44';
import { renderDocumentPage } from './document-primitives.js?v=44';
import { buildCompanionSpreadPageModels } from './companion-models.js?v=44';
import { renderCompanionSpreadPage } from './companion-primitives.js?v=44';
import { buildBossPageModel, buildFieldOpsPageModels } from './field-ops-models.js?v=44';
import { renderBossPage, renderFieldOpsPage } from './field-ops-primitives.js?v=44';
import { buildWorkoutPageModel } from './workout-models.js?v=44';
import { renderWorkoutCard } from './workout-primitives.js?v=44';
import { pad2 } from './utils.js?v=44';

function buildWorkoutPage(data, week, entry) {
  const sessions = entry.sessions || [];
  const mechanicProfile = entry.mechanicProfile || {};
  const totalWeeks = (data.weeks || []).length || 0;
  const runningTitle = (data.cover || {}).title || ((data.meta || {}).blockTitle) || 'LiftRPG';
  const scaffold = createBoundedPage('workout-left', 'workout-left', { boundaryRole: 'session-log' });
  const page = scaffold.page;
  const frame = scaffold.frame;
  frame.setAttribute('data-card-count', String(sessions.length));
  frame.setAttribute('data-page-compaction', String(entry.compactionLevel || 0));
  frame.setAttribute('data-route-family', mechanicProfile.routeFamily || 'none');
  frame.setAttribute('data-clock-family', mechanicProfile.clockFamily || 'none');

  const header = make('header', 'page-header');
  header.appendChild(make('span', 'running-title', runningTitle));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  const chunkStart = ((entry.chunkIndex || 0) * 3) + 1;
  const chunkEnd = chunkStart + sessions.length - 1;
  const kickerText = entry.chunkCount > 1
    ? 'Week ' + pad2(week.weekNumber) + ' · Part ' + ((entry.chunkIndex || 0) + 1) + ' of ' + entry.chunkCount + ' · Sessions ' + chunkStart + '-' + chunkEnd + ((entry.chunkIndex || 0) > 0 ? ' · continued' : '')
    : 'Week ' + pad2(week.weekNumber) + ' ·';
  frame.appendChild(make('div', 'week-kicker', kickerText));
  frame.appendChild(make('h2', 'week-title', week.title || 'Training Record'));

  if (week.epigraph && (entry.chunkIndex || 0) === 0) {
    frame.appendChild(make('div', 'week-subtitle', week.epigraph.attribution || ''));
    frame.appendChild(make('div', 'week-meta', week.epigraph.text || ''));
  }

  const cards = make('div', 'session-cards');
  const workoutPageModel = buildWorkoutPageModel(sessions, planWorkoutPageLayout(sessions, {
    compactionLevel: entry.compactionLevel || 0
  }));
  frame.setAttribute('data-page-density', workoutPageModel.pageDensity);
  workoutPageModel.cards.forEach((cardModel) => {
    cards.appendChild(renderWorkoutCard(cardModel));
  });
  frame.appendChild(cards);

  if (totalWeeks > 0) {
    const footer = make('footer', 'week-progress');
    const dots = make('div', 'week-progress-dots');
    for (let index = 0; index < totalWeeks; index += 1) {
      const dot = make('span', 'week-progress-dot');
      if ((index + 1) === week.weekNumber) dot.setAttribute('data-state', 'active');
      dots.appendChild(dot);
    }
    footer.appendChild(dots);
    footer.appendChild(make('div', 'week-progress-label', 'Week ' + week.weekNumber + ' of ' + totalWeeks));
    frame.appendChild(footer);
  }

  return page;
}

function buildBlankPage() {
  return createBoundedPage('blank-filler', 'blank-page', {
    boundaryRole: 'utility',
    pageClass: 'blank-page'
  }).page;
}

function tagPlanMetadata(page, entry, index) {
  const atom = getPageAtom(entry.type || '');
  page.setAttribute('data-plan-index', String(index));
  page.setAttribute('data-page-index', String(index + 1));
  page.setAttribute('data-plan-entry-type', entry.type || '');
  page.setAttribute('data-atom-family', atom.family || 'custom');
  page.setAttribute('data-atom-measurable', atom.measurable ? 'true' : 'false');
  if (entry.weekIndex != null) {
    page.setAttribute('data-plan-week', String(entry.weekIndex));
  }
  if (entry.compactionLevel != null) {
    page.setAttribute('data-plan-compaction', String(entry.compactionLevel));
  }
  if (entry.layout) {
    page.setAttribute('data-plan-layout', String(entry.layout));
  }
  if (entry.layoutVariant) {
    page.setAttribute('data-layout-variant', String(entry.layoutVariant));
  }
}

export function buildPages(data, unlockedEnding, options = {}) {
  const pages = [];
  const plan = normalizeBookletPlan(options.plan || planBookletLayout(data, unlockedEnding));
  const fieldOpsByWeek = new Map();
  const companionSpreadByWeek = new Map();

  plan.forEach((entry, index) => {
    let page = null;

    switch (entry.type) {
      case 'cover':
        page = renderCoverPage(buildCoverPageModel(data));
        break;
      case 'rules-left':
        page = renderRulesLeftPage(buildRulesLeftPageModelWithVariant(data, entry.layoutVariant));
        break;
      case 'rules-right':
        page = renderSealedPage(buildSealedPageModel(data, entry.layoutVariant));
        break;
      case 'workout-left': {
        const week = (data.weeks || [])[entry.weekIndex] || {};
        page = buildWorkoutPage(data, week, entry);
        break;
      }
      case 'field-ops':
      case 'oracle-overflow': {
        const week = (data.weeks || [])[entry.weekIndex] || {};
        const fieldOpsLayout = entry.type === 'oracle-overflow'
          ? {
            ...entry,
            layout: 'split-oracle'
          }
          : entry;
        const cacheKey = [
          entry.weekIndex,
          fieldOpsLayout.layout || 'standard',
          entry.layoutVariant || 'balanced',
          entry.primaryOracleCount == null ? 'all' : entry.primaryOracleCount,
          fieldOpsLayout.companionPlacement || 'inline'
        ].join(':');
        if (!fieldOpsByWeek.has(cacheKey)) {
          fieldOpsByWeek.set(cacheKey, buildFieldOpsPageModels(data, week, fieldOpsLayout));
        }
        const models = fieldOpsByWeek.get(cacheKey) || [];
        const modelIndex = entry.type === 'oracle-overflow' ? 1 : 0;
        if (models[modelIndex]) {
          page = renderFieldOpsPage(models[modelIndex]);
        }
        break;
      }
      case 'companion-spread-left':
      case 'companion-spread-right': {
        const week = (data.weeks || [])[entry.weekIndex] || {};
        const cacheKey = [
          entry.weekIndex,
          entry.layoutVariant || 'balanced'
        ].join(':');
        if (!companionSpreadByWeek.has(cacheKey)) {
          companionSpreadByWeek.set(cacheKey, buildCompanionSpreadPageModels(week, entry));
        }
        const models = companionSpreadByWeek.get(cacheKey) || [];
        const modelIndex = entry.type === 'companion-spread-right' ? 1 : 0;
        if (models[modelIndex]) {
          page = renderCompanionSpreadPage(models[modelIndex]);
        }
        break;
      }
      case 'boss': {
        const week = (data.weeks || [])[entry.weekIndex] || {};
        page = renderBossPage(buildBossPageModel(data, week, entry));
        break;
      }
      case 'fragment-page':
        page = renderDocumentPage(buildDocumentPageModel(entry.fragments || [], 'fragment', entry.layoutVariant));
        break;
      case 'overflow-doc': {
        const week = (data.weeks || [])[entry.weekIndex] || {};
        page = renderDocumentPage(buildDocumentPageModel(entry.fragments || [week.overflowDocument || {}], 'overflow-doc', entry.layoutVariant));
        break;
      }
      case 'interlude': {
        const week = (data.weeks || [])[entry.weekIndex] || {};
        page = renderInterludePage(buildInterludePageModel(week, entry.layoutVariant, entry.interlude, entry));
        break;
      }
      case 'blank-filler':
        page = buildBlankPage();
        break;
      case 'assembly':
        page = renderAssemblyPage(buildAssemblyPageModelWithVariant(data, entry.layoutVariant));
        break;
      case 'gauge-log':
        page = renderGaugeLogPage(buildGaugeLogPageModelWithVariant(data, entry.layoutVariant));
        break;
      case 'ending-locked':
        page = renderLockedEndingPage(buildLockedEndingPageModel(data, entry.layoutVariant));
        break;
      case 'ending-unlocked':
        page = renderUnlockedEndingPage(buildUnlockedEndingPageModel(data, entry.endingPayload || unlockedEnding, entry.layoutVariant, entry));
        break;
      case 'notes':
        page = renderNotesPage(buildNotesPageModel());
        break;
      case 'back-cover':
        page = renderBackCover(buildBackCoverModel(data));
        break;
      default:
        break;
    }

    if (!page) return;
    tagPlanMetadata(page, entry, index);
    pages.push(page);
  });

  return pages;
}
