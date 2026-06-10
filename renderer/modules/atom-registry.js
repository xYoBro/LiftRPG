export const DOCUMENT_ATOM_REGISTRY = {
  memo: {
    family: 'bureaucratic',
    label: 'Memo',
    description: 'Administrative or institutional memo artifact.'
  },
  report: {
    family: 'bureaucratic',
    label: 'Report',
    description: 'Formal report or assessment document.'
  },
  inspection: {
    family: 'bureaucratic',
    label: 'Inspection',
    description: 'Survey, audit, or inspection-style document.'
  },
  fieldNote: {
    family: 'hand-authored',
    label: 'Field Note',
    description: 'Field notebook or observational note artifact.'
  },
  'field-note': {
    family: 'hand-authored',
    label: 'Field Note',
    description: 'Field notebook or observational note artifact.'
  },
  correspondence: {
    family: 'personal',
    label: 'Correspondence',
    description: 'Letter, message, or direct personal correspondence.'
  },
  letter: {
    family: 'personal',
    label: 'Letter',
    description: 'Personal or diegetic letter artifact.'
  },
  transcript: {
    family: 'recorded',
    label: 'Transcript',
    description: 'Recorded conversation, statement, or hearing transcript.'
  },
  form: {
    family: 'bureaucratic',
    label: 'Form',
    description: 'Structured form or worksheet artifact.'
  },
  anomaly: {
    family: 'anomalous',
    label: 'Anomaly',
    description: 'Artifact whose typography or document form carries the anomaly directly.'
  }
};

export function getDocumentAtom(type) {
  const normalized = String(type || '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .trim()
    .toLowerCase();
  return DOCUMENT_ATOM_REGISTRY[type] || DOCUMENT_ATOM_REGISTRY[normalized] || { family: 'custom-document' };
}
