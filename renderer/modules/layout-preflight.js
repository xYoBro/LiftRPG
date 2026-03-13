import { make } from './dom.js?v=20';
import {
  planBookletLayout,
  revisePlanForMeasurement
} from './layout-governor.js?v=20';
import { buildPages } from './page-builders.js?v=20';
import { setPageNumbers } from './pagination.js?v=20';

const MAX_LAYOUT_PASSES = 10;

function createMeasurementRoot(container) {
  const root = make('div', 'layout-preflight-root');
  Object.assign(root.style, {
    position: 'fixed',
    left: '-200vw',
    top: '0',
    width: '5.5in',
    visibility: 'hidden',
    pointerEvents: 'none',
    zIndex: '-1'
  });

  const stack = make('div', 'layout-preflight-stack');
  Object.assign(stack.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '0'
  });

  root.appendChild(stack);
  container.appendChild(root);
  return { root, stack };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function measureSlotMetrics(page, pageType) {
  if (pageType === 'workout-left') {
    const cards = Array.from(page.querySelectorAll('.session-card'));
    const noteBoxes = Array.from(page.querySelectorAll('.notes-box'));
    return {
      cardCount: cards.length,
      cardHeights: cards.map((card) => Math.ceil(card.getBoundingClientRect().height)),
      noteBoxHeights: noteBoxes.map((noteBox) => Math.ceil(noteBox.getBoundingClientRect().height))
    };
  }

  if (pageType === 'field-ops' || pageType === 'oracle-overflow') {
    const oracleEntries = Array.from(page.querySelectorAll('.oracle-entry'));
    const oracleEntryHeights = oracleEntries.map((entry) => Math.ceil(entry.getBoundingClientRect().height));
    return {
      oracleEntryCount: oracleEntries.length,
      averageOracleEntryHeight: average(oracleEntryHeights),
      oracleEntryHeights
    };
  }

  if (pageType === 'fragment' || pageType === 'fragment-page' || pageType === 'overflow-doc') {
    const fragmentBlocks = Array.from(page.querySelectorAll('.fragment-block'));
    return {
      fragmentCount: fragmentBlocks.length,
      fragmentHeights: fragmentBlocks.map((block) => Math.ceil(block.getBoundingClientRect().height))
    };
  }

  return {};
}

function measurePage(page) {
  const pageType = page.getAttribute('data-page-type') || '';
  const frame = page.firstElementChild;
  const safeHeight = page.clientHeight || Math.ceil(page.getBoundingClientRect().height);
  const safeWidth = page.clientWidth || Math.ceil(page.getBoundingClientRect().width);
  const trueHeight = frame
    ? Math.max(frame.scrollHeight, Math.ceil(frame.getBoundingClientRect().height))
    : Math.max(page.scrollHeight, safeHeight);
  const trueWidth = frame
    ? Math.max(frame.scrollWidth, Math.ceil(frame.getBoundingClientRect().width))
    : Math.max(page.scrollWidth, safeWidth);
  const overflowHeight = Math.max(0, trueHeight - safeHeight);
  const overflowWidth = Math.max(0, trueWidth - safeWidth);

  return {
    planIndex: parseInt(page.getAttribute('data-plan-index'), 10) || 0,
    pageType,
    overflowHeight,
    overflowWidth,
    overflowArea: (overflowHeight * Math.max(1, safeWidth)) + (overflowWidth * Math.max(1, safeHeight)),
    slotMetrics: measureSlotMetrics(page, pageType)
  };
}

function evaluatePlan(container, data, unlockedEnding, plan) {
  const surface = createMeasurementRoot(container);
  const pages = buildPages(data, unlockedEnding, { plan });
  setPageNumbers(pages);
  pages.forEach((page) => {
    surface.stack.appendChild(page);
  });

  void surface.root.offsetHeight;

  const pageMeasurements = pages.map((page) => measurePage(page));
  surface.root.remove();

  const overflowPageCount = pageMeasurements.filter((page) => page.overflowHeight > 0 || page.overflowWidth > 0).length;
  const totalOverflowHeight = pageMeasurements.reduce((sum, page) => sum + page.overflowHeight, 0);
  const totalOverflowWidth = pageMeasurements.reduce((sum, page) => sum + page.overflowWidth, 0);
  const totalOverflowArea = pageMeasurements.reduce((sum, page) => sum + page.overflowArea, 0);
  const score = (overflowPageCount * 100000) + (totalOverflowArea * 100) + (pages.length * 10);

  return {
    plan,
    pageCount: pages.length,
    overflowPageCount,
    totalOverflowHeight,
    totalOverflowWidth,
    totalOverflowArea,
    score,
    pages: pageMeasurements
  };
}

function findWorstOverflow(measurements) {
  return (measurements || [])
    .filter((page) => page.overflowHeight > 0 || page.overflowWidth > 0)
    .sort((a, b) => {
      if (b.overflowArea !== a.overflowArea) return b.overflowArea - a.overflowArea;
      return b.overflowHeight - a.overflowHeight;
    })[0] || null;
}

export function optimizeBookletPlan(container, data, unlockedEnding) {
  let currentPlan = planBookletLayout(data, unlockedEnding);
  let current = evaluatePlan(container, data, unlockedEnding, currentPlan);
  let passesApplied = 0;

  for (let pass = 0; pass < MAX_LAYOUT_PASSES; pass += 1) {
    const worstOverflow = findWorstOverflow(current.pages);
    if (!worstOverflow) break;

    const revisedPlan = revisePlanForMeasurement(currentPlan, worstOverflow, data);
    if (!revisedPlan) break;

    const revised = evaluatePlan(container, data, unlockedEnding, revisedPlan);
    if (revised.score >= current.score && revised.totalOverflowArea >= current.totalOverflowArea) {
      break;
    }

    currentPlan = revisedPlan;
    current = revised;
    passesApplied += 1;
  }

  return {
    plan: currentPlan,
    diagnostics: current,
    passesApplied
  };
}
