import { readingLength } from './utils.js?v=17';

export function chunkSessions(week) {
  const sessions = week.sessions || [];
  const chunks = [];
  for (let index = 0; index < sessions.length; index += 3) {
    chunks.push(sessions.slice(index, index + 3));
  }
  return chunks;
}

function sessionComplexity(session, cardCount) {
  const promptLength = readingLength(session.storyPrompt);
  const exerciseCount = Math.min((session.exercises || []).length, 6);
  let score = 1.35;
  score += Math.min(promptLength / 180, 2.6);
  score += exerciseCount * 0.62;
  if (session.binaryChoice) score += 1.15;
  if (session.fragmentRef) score += 0.2;

  if (cardCount === 3) score += 0.6;
  if (cardCount === 1) score -= 0.45;

  return score;
}

function resolveDensity(score) {
  if (score >= 6.2) return 'critical';
  if (score >= 5.1) return 'dense';
  if (score >= 4) return 'compact';
  return 'standard';
}

function resolveNotesLines(score, cardCount) {
  if (cardCount === 1) {
    if (score >= 6.2) return 2;
    return 3;
  }

  if (cardCount === 2) {
    if (score >= 5.8) return 0;
    if (score >= 4.8) return 1;
    return 2;
  }

  if (score >= 6.2) return 0;
  if (score >= 5.1) return 1;
  return 2;
}

function resolveNotesHeight(notesLines) {
  if (notesLines <= 0) return 0;
  if (notesLines === 1) return 20;
  if (notesLines === 2) return 30;
  return 40;
}

export function planWorkoutPageLayout(sessions) {
  const cardCount = Math.max(1, sessions.length);
  const complexityScores = sessions.map((session) => sessionComplexity(session, cardCount));
  const totalComplexity = complexityScores.reduce((sum, value) => sum + value, 0) || cardCount;
  const cards = sessions.map((session, index) => {
    const score = complexityScores[index];
    const density = resolveDensity(score);
    const notesLines = resolveNotesLines(score, cardCount);
    const notesHeight = resolveNotesHeight(notesLines);
    const flexWeight = Math.max(1, Math.round((score / totalComplexity) * 100));

    return {
      density,
      notesLines,
      notesHeight,
      flexWeight,
      promptChars: readingLength(session.storyPrompt),
      exerciseCount: (session.exercises || []).length
    };
  });

  return {
    cardCount,
    pageDensity: resolveDensity(totalComplexity / cardCount),
    totalComplexity,
    cards
  };
}

export function paginateFragments(fragments) {
  const pages = [];
  let current = [];
  let load = 0;
  (fragments || []).forEach((fragment) => {
    const body = fragment.bodyText || fragment.body || fragment.content || '';
    const weight = Math.max(0.72, Math.min(readingLength(body) / 1800, 1.2));

    if (current.length >= 2 || (current.length >= 1 && load + weight > 1.55)) {
      pages.push(current);
      current = [];
      load = 0;
    }

    current.push(fragment);
    load += weight;
  });

  if (current.length) pages.push(current);
  return pages;
}

function planWeekEntries(week, weekIndex) {
  const entries = [];
  const chunks = chunkSessions(week);

  if (chunks.length > 0) {
    entries.push({
      type: 'workout-left',
      weekIndex,
      chunkIndex: 0,
      chunkCount: chunks.length,
      sessions: chunks[0]
    });
  }

  if (week.isBossWeek) {
    entries.push({
      type: 'boss',
      weekIndex
    });
  } else {
    const oracleEntryCount = ((((week || {}).fieldOps || {}).oracleTable || {}).entries || []).length;
    entries.push({
      type: 'field-ops',
      weekIndex,
      layout: oracleEntryCount > 12 ? 'split-oracle' : 'standard'
    });
    if (oracleEntryCount > 12) {
      entries.push({
        type: 'oracle-overflow',
        weekIndex,
        layout: 'oracle-only'
      });
    }
  }

  for (let index = 1; index < chunks.length; index += 1) {
    entries.push({
      type: 'workout-left',
      weekIndex,
      chunkIndex: index,
      chunkCount: chunks.length,
      sessions: chunks[index]
    });
    entries.push(week.overflowDocument
      ? { type: 'overflow-doc', weekIndex }
      : { type: 'blank-filler', weekIndex }
    );
  }

  return entries;
}

export function planBookletLayout(data, unlockedEnding) {
  const entries = [
    { type: 'cover' },
    { type: 'rules-left' },
    { type: 'rules-right' }
  ];

  (data.weeks || []).forEach((week, weekIndex) => {
    entries.push(...planWeekEntries(week, weekIndex));
  });

  paginateFragments(data.fragments || []).forEach((fragments) => {
    entries.push({
      type: 'fragment-page',
      fragments
    });
  });

  entries.push(
    { type: 'assembly' },
    { type: 'gauge-log' },
    { type: unlockedEnding ? 'ending-unlocked' : 'ending-locked' }
  );

  while ((entries.length + 1) % 4 !== 0) {
    entries.push({ type: 'notes' });
  }

  entries.push({ type: 'back-cover' });
  return entries;
}
