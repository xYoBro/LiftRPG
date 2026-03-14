import { make } from './dom.js?v=30';
import {
  planBookletLayout,
  revisePlanForMeasurement
} from './layout-governor.js?v=30';
import { buildPages } from './page-builders.js?v=30';
import { getPageBoundary, getPageFrame } from './page-shell.js?v=30';
import { setPageNumbers } from './pagination.js?v=30';

const MAX_LAYOUT_PASSES = 10;
const OVERFLOW_TOLERANCE_PX = 2;

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

function heightOf(node) {
  if (!node) return 0;
  return Math.ceil(node.getBoundingClientRect().height);
}

function countBy(items, pickKey) {
  return (items || []).reduce((counts, item) => {
    const key = pickKey(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
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
    const documentParagraphHeights = Array.from(page.querySelectorAll('.fragment-doc-body > p')).map((paragraph) => Math.ceil(paragraph.getBoundingClientRect().height));
    return {
      fragmentCount: fragmentBlocks.length,
      fragmentHeights: fragmentBlocks.map((block) => Math.ceil(block.getBoundingClientRect().height)),
      documentParagraphHeights
    };
  }

  if (pageType === 'boss') {
    return {
      narrativeHeight: heightOf(page.querySelector('.boss-narrative')),
      mechanismHeight: heightOf(page.querySelector('.boss-mechanism')),
      proofHeight: heightOf(page.querySelector('.boss-proof')),
      componentsHeight: heightOf(page.querySelector('.boss-components')),
      convergenceHeight: heightOf(page.querySelector('.boss-convergence')),
      componentCount: page.querySelectorAll('.boss-component-item').length
    };
  }

  if (pageType === 'ending-locked' || pageType === 'ending-unlocked') {
    const paragraphs = Array.from(page.querySelectorAll('.endings-body > p'));
    return {
      paragraphCount: paragraphs.length,
      paragraphHeights: paragraphs.map((paragraph) => Math.ceil(paragraph.getBoundingClientRect().height)),
      bodyHeight: heightOf(page.querySelector('.endings-body')),
      finalLineHeight: heightOf(page.querySelector('.endings-final-line'))
    };
  }

  if (pageType === 'gauge-log') {
    return {
      rowCount: page.querySelectorAll('.password-log-row').length,
      instructionHeight: heightOf(page.querySelector('.password-log-subtitle')),
      finalBlockHeight: heightOf(page.querySelector('.password-final'))
    };
  }

  if (pageType === 'assembly') {
    return {
      rowCount: page.querySelectorAll('.password-assembly-row').length,
      subtitleHeight: heightOf(page.querySelector('.password-assembly-subtitle')),
      finalBlockHeight: heightOf(page.querySelector('.password-final-assembly'))
    };
  }

  if (pageType === 'interlude') {
    const paragraphs = Array.from(page.querySelectorAll('.interlude-body > p'));
    return {
      paragraphCount: paragraphs.length,
      paragraphHeights: paragraphs.map((paragraph) => Math.ceil(paragraph.getBoundingClientRect().height)),
      bodyHeight: heightOf(page.querySelector('.interlude-body')),
      reasonHeight: heightOf(page.querySelector('.interlude-reason'))
    };
  }

  if (pageType === 'rules-left' || pageType === 'rules-right') {
    return {
      headingCount: page.querySelectorAll('h3').length,
      paragraphCount: page.querySelectorAll('p').length
    };
  }

  return {};
}

function measurePage(page) {
  const pageType = page.getAttribute('data-page-type') || '';
  const boundary = getPageBoundary(page);
  const frame = getPageFrame(page);
  const safeHeight = frame
    ? frame.clientHeight || Math.ceil(frame.getBoundingClientRect().height)
    : boundary
      ? boundary.clientHeight || Math.ceil(boundary.getBoundingClientRect().height)
      : page.clientHeight || Math.ceil(page.getBoundingClientRect().height);
  const safeWidth = frame
    ? frame.clientWidth || Math.ceil(frame.getBoundingClientRect().width)
    : boundary
      ? boundary.clientWidth || Math.ceil(boundary.getBoundingClientRect().width)
      : page.clientWidth || Math.ceil(page.getBoundingClientRect().width);
  const contentHeight = Math.max(
    frame ? frame.scrollHeight : 0,
    frame ? Math.ceil(frame.getBoundingClientRect().height) : 0,
    safeHeight
  );
  const contentWidth = Math.max(
    frame ? frame.scrollWidth : 0,
    frame ? Math.ceil(frame.getBoundingClientRect().width) : 0,
    safeWidth
  );
  const overflowHeight = Math.max(0, contentHeight - safeHeight - OVERFLOW_TOLERANCE_PX);
  const overflowWidth = Math.max(0, contentWidth - safeWidth - OVERFLOW_TOLERANCE_PX);

  return {
    planIndex: parseInt(page.getAttribute('data-plan-index'), 10) || 0,
    pageType,
    layoutVariant: page.getAttribute('data-layout-variant') || (frame && frame.getAttribute('data-layout-variant')) || '',
    missingBoundary: !boundary,
    liveAreaHeight: safeHeight,
    liveAreaWidth: safeWidth,
    overflowHeight,
    overflowWidth,
    overflowArea: (overflowHeight * Math.max(1, safeWidth)) + (overflowWidth * Math.max(1, safeHeight)),
    slotMetrics: measureSlotMetrics(page, pageType)
  };
}

function summarizeMeasurements(pageMeasurements) {
  const overflowPages = pageMeasurements.filter((page) => page.overflowHeight > 0 || page.overflowWidth > 0);
  const missingBoundaryPages = pageMeasurements.filter((page) => page.missingBoundary);
  return {
    pageTypeCounts: countBy(pageMeasurements, (page) => page.pageType || 'unknown'),
    layoutVariantCounts: countBy(pageMeasurements.filter((page) => page.layoutVariant), (page) => {
      return page.pageType + ':' + page.layoutVariant;
    }),
    overflowTypes: countBy(overflowPages, (page) => page.pageType || 'unknown'),
    missingBoundaryTypes: countBy(missingBoundaryPages, (page) => page.pageType || 'unknown')
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

  const missingBoundaryPageCount = pageMeasurements.filter((page) => page.missingBoundary).length;
  const overflowPageCount = pageMeasurements.filter((page) => page.overflowHeight > 0 || page.overflowWidth > 0).length;
  const totalOverflowHeight = pageMeasurements.reduce((sum, page) => sum + page.overflowHeight, 0);
  const totalOverflowWidth = pageMeasurements.reduce((sum, page) => sum + page.overflowWidth, 0);
  const totalOverflowArea = pageMeasurements.reduce((sum, page) => sum + page.overflowArea, 0);
  const score = (missingBoundaryPageCount * 10000000) + (overflowPageCount * 100000) + (totalOverflowArea * 100) + (pages.length * 10);

  return {
    plan,
    pageCount: pages.length,
    missingBoundaryPageCount,
    overflowPageCount,
    totalOverflowHeight,
    totalOverflowWidth,
    totalOverflowArea,
    score,
    pages: pageMeasurements,
    summary: summarizeMeasurements(pageMeasurements)
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
