import { readingLength, splitParagraphs } from './utils.js';

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

  return sessions.map((session, index) => {
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
}

export function paginateFragments(fragments) {
  const pages = [];
  let current = [];
  let load = 0;
  const processed = [];

  (fragments || []).forEach((fragment) => {
    const body = fragment.bodyText || fragment.body || fragment.content || '';
    const len = readingLength(body);

    if (len > 600) {
      const paras = splitParagraphs(body);
      let currentParas = [];
      let currentLen = 0;
      let part = 1;

      paras.forEach((paragraph) => {
        const paragraphLen = readingLength(paragraph);
        if (currentLen + paragraphLen > 550 && currentParas.length > 0) {
          const clone = Object.assign({}, fragment, {
            content: currentParas.join('\n\n'),
            title: fragment.title ? (part > 1 ? fragment.title + ' (cont.)' : fragment.title) : ''
          });

          if (part > 1) {
            clone.inWorldAuthor = '';
            clone.inWorldRecipient = '';
            clone.date = '';
          }

          processed.push(clone);
          currentParas = [paragraph];
          currentLen = paragraphLen;
          part += 1;
          return;
        }

        currentParas.push(paragraph);
        currentLen += paragraphLen;
      });

      if (currentParas.length > 0) {
        const finalPart = Object.assign({}, fragment, {
          content: currentParas.join('\n\n'),
          title: fragment.title && part > 1 ? fragment.title + ' (cont.)' : fragment.title || ''
        });

        if (part > 1) {
          finalPart.inWorldAuthor = '';
          finalPart.inWorldRecipient = '';
          finalPart.date = '';
        }

        processed.push(finalPart);
      }

      return;
    }

    processed.push(fragment);
  });

  processed.forEach((fragment) => {
    const body = fragment.bodyText || fragment.body || fragment.content || '';
    const weight = Math.max(1, Math.min(readingLength(body) / 600, 2.5));

    if (current.length >= 2 || (current.length >= 1 && load + weight > 1.35)) {
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
