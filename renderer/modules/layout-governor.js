import { readingLength, splitParagraphs } from './utils.js';

export function chunkSessions(week) {
  const sessions = week.sessions || [];
  const chunks = [];
  let current = [];
  let load = 0;

  sessions.forEach((session) => {
    let weight = 1;
    weight += Math.min((session.exercises || []).length, 6) * 0.3;
    weight += Math.min(readingLength(session.storyPrompt) / 300, 1.5);
    if (session.binaryChoice) weight += 1.2;

    if (current.length >= 3 || (current.length >= 1 && load + weight > 3.8)) {
      chunks.push(current);
      current = [];
      load = 0;
    }

    current.push(session);
    load += weight;
  });

  if (current.length) chunks.push(current);
  return chunks;
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
