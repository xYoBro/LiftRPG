import { make } from './dom.js?v=17';
import { planBookletLayout, planWorkoutPageLayout } from './layout-governor.js?v=17';
import {
  buildAssemblyPageModel,
  buildBackCoverModel,
  buildCoverPageModel,
  buildGaugeLogPageModel,
  buildLockedEndingPageModel,
  buildNotesPageModel,
  buildRulesLeftPageModel,
  buildSealedPageModel,
  buildUnlockedEndingPageModel
} from './booklet-models.js?v=17';
import {
  renderAssemblyPage,
  renderBackCover,
  renderCoverPage,
  renderGaugeLogPage,
  renderLockedEndingPage,
  renderNotesPage,
  renderRulesLeftPage,
  renderSealedPage,
  renderUnlockedEndingPage
} from './booklet-primitives.js?v=17';
import { buildDocumentPageModel } from './document-models.js?v=17';
import { renderDocumentPage } from './document-primitives.js?v=17';
import { buildBossPageModel, buildFieldOpsPageModels } from './field-ops-models.js?v=17';
import { renderBossPage, renderFieldOpsPage } from './field-ops-primitives.js?v=17';
import { buildWorkoutPageModel } from './workout-models.js?v=17';
import { renderWorkoutCard } from './workout-primitives.js?v=17';
import { pad2 } from './utils.js?v=17';

function buildWorkoutPage(week, sessions, chunkIndex, chunkCount) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', 'workout-left');
  const frame = make('div', 'workout-left');
  frame.setAttribute('data-card-count', String(sessions.length));

  const header = make('header', 'page-header');
  header.appendChild(make('span', 'week-id', 'Week ' + pad2(week.weekNumber)));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  const kickerText = chunkCount > 1 ? 'Session Log ' + (chunkIndex + 1) + '/' + chunkCount : 'Session Log';
  frame.appendChild(make('div', 'week-kicker', kickerText));
  frame.appendChild(make('h2', 'week-title', week.title || 'Training Record'));

  if (week.epigraph && chunkIndex === 0) {
    frame.appendChild(make('div', 'week-subtitle', week.epigraph.attribution || ''));
    frame.appendChild(make('div', 'week-meta', week.epigraph.text || ''));
  }

  const cards = make('div', 'session-cards');
  const workoutPageModel = buildWorkoutPageModel(sessions, planWorkoutPageLayout(sessions));
  frame.setAttribute('data-page-density', workoutPageModel.pageDensity);
  workoutPageModel.cards.forEach((cardModel) => {
    cards.appendChild(renderWorkoutCard(cardModel));
  });
  frame.appendChild(cards);
  page.appendChild(frame);
  return page;
}

function buildBlankPage() {
  const blank = make('section', 'booklet-page blank-page');
  blank.setAttribute('data-page-type', 'blank-filler');
  return blank;
}

export function buildPages(data, unlockedEnding) {
  const pages = [];
  const plan = planBookletLayout(data, unlockedEnding);
  const fieldOpsByWeek = new Map();

  plan.forEach((entry) => {
    switch (entry.type) {
      case 'cover':
        pages.push(renderCoverPage(buildCoverPageModel(data)));
        return;
      case 'rules-left':
        pages.push(renderRulesLeftPage(buildRulesLeftPageModel(data)));
        return;
      case 'rules-right':
        pages.push(renderSealedPage(buildSealedPageModel(data)));
        return;
      case 'workout-left': {
        const week = (data.weeks || [])[entry.weekIndex] || {};
        pages.push(buildWorkoutPage(week, entry.sessions || [], entry.chunkIndex || 0, entry.chunkCount || 1));
        return;
      }
      case 'field-ops':
      case 'oracle-overflow': {
        const week = (data.weeks || [])[entry.weekIndex] || {};
        if (!fieldOpsByWeek.has(entry.weekIndex)) {
          fieldOpsByWeek.set(entry.weekIndex, buildFieldOpsPageModels(data, week));
        }
        const models = fieldOpsByWeek.get(entry.weekIndex) || [];
        const modelIndex = entry.type === 'oracle-overflow' ? 1 : 0;
        if (models[modelIndex]) {
          pages.push(renderFieldOpsPage(models[modelIndex]));
        }
        return;
      }
      case 'boss': {
        const week = (data.weeks || [])[entry.weekIndex] || {};
        pages.push(renderBossPage(buildBossPageModel(data, week)));
        return;
      }
      case 'fragment-page':
        pages.push(renderDocumentPage(buildDocumentPageModel(entry.fragments || [], 'fragment')));
        return;
      case 'overflow-doc': {
        const week = (data.weeks || [])[entry.weekIndex] || {};
        pages.push(renderDocumentPage(buildDocumentPageModel([week.overflowDocument || {}], 'overflow-doc')));
        return;
      }
      case 'blank-filler':
        pages.push(buildBlankPage());
        return;
      case 'assembly':
        pages.push(renderAssemblyPage(buildAssemblyPageModel(data)));
        return;
      case 'gauge-log':
        pages.push(renderGaugeLogPage(buildGaugeLogPageModel(data)));
        return;
      case 'ending-locked':
        pages.push(renderLockedEndingPage(buildLockedEndingPageModel(data)));
        return;
      case 'ending-unlocked':
        pages.push(renderUnlockedEndingPage(buildUnlockedEndingPageModel(data, unlockedEnding)));
        return;
      case 'notes':
        pages.push(renderNotesPage(buildNotesPageModel()));
        return;
      case 'back-cover':
        pages.push(renderBackCover(buildBackCoverModel(data)));
        return;
      default:
        return;
    }
  });

  return pages;
}
