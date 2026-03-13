export const PAGE_ATOM_REGISTRY = {
  cover: { family: 'front-matter', measurable: true },
  'rules-left': { family: 'front-matter', measurable: true },
  'rules-right': { family: 'front-matter', measurable: true },
  'workout-left': { family: 'workout', measurable: true },
  'field-ops': { family: 'play-surface', measurable: true },
  'oracle-overflow': { family: 'play-surface', measurable: true },
  boss: { family: 'boss-surface', measurable: true },
  interlude: { family: 'interlude', measurable: true },
  'fragment-page': { family: 'archive', measurable: true },
  'overflow-doc': { family: 'archive', measurable: true },
  assembly: { family: 'unlock', measurable: true },
  'gauge-log': { family: 'unlock', measurable: true },
  'ending-locked': { family: 'ending', measurable: true },
  'ending-unlocked': { family: 'ending', measurable: true },
  'blank-filler': { family: 'utility', measurable: false },
  notes: { family: 'utility', measurable: false },
  'back-cover': { family: 'back-matter', measurable: false }
};

export const DOCUMENT_ATOM_REGISTRY = {
  memo: { family: 'bureaucratic' },
  report: { family: 'bureaucratic' },
  inspection: { family: 'bureaucratic' },
  fieldNote: { family: 'hand-authored' },
  correspondence: { family: 'personal' },
  transcript: { family: 'recorded' },
  anomaly: { family: 'anomalous' }
};

export function getPageAtom(type) {
  return PAGE_ATOM_REGISTRY[type] || { family: 'custom', measurable: true };
}

export function getDocumentAtom(type) {
  return DOCUMENT_ATOM_REGISTRY[type] || { family: 'custom-document' };
}
