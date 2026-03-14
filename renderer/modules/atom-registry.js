export const PAGE_ATOM_REGISTRY = {
  cover: {
    family: 'front-matter',
    measurable: true,
    label: 'Cover',
    liveAreaRole: 'editorial-cover',
    description: 'Front-cover artifact page with designation, title, tagline, and colophon.'
  },
  'rules-left': {
    family: 'front-matter',
    measurable: true,
    label: 'Rules Left',
    liveAreaRole: 'briefing',
    description: 'Orientation and usage page on the left side of the opening spread.'
  },
  'rules-right': {
    family: 'front-matter',
    measurable: true,
    label: 'Rules Right',
    liveAreaRole: 'sealed',
    description: 'Sealed right-hand page in the opening spread.'
  },
  'companion-spread-left': {
    family: 'companion-spread',
    measurable: true,
    label: 'Companion Spread Left',
    liveAreaRole: 'play-grid',
    description: 'Dedicated left-hand companion page carrying clocks and large analog support surfaces.'
  },
  'companion-spread-right': {
    family: 'companion-spread',
    measurable: true,
    label: 'Companion Spread Right',
    liveAreaRole: 'play-grid',
    description: 'Dedicated right-hand companion page paired with the left companion spread surface.'
  },
  'workout-left': {
    family: 'workout',
    measurable: true,
    label: 'Workout Left',
    liveAreaRole: 'session-log',
    description: 'Canonical left-hand workout page containing one to three workout cards.'
  },
  'field-ops': {
    family: 'play-surface',
    measurable: true,
    label: 'Field Ops',
    liveAreaRole: 'play-grid',
    description: 'Primary right-hand weekly play surface combining map, cipher, oracle, and companion components.'
  },
  'oracle-overflow': {
    family: 'play-surface',
    measurable: true,
    label: 'Oracle Overflow',
    liveAreaRole: 'play-grid',
    description: 'Continuation right-hand play surface used when oracle content no longer fits the primary field-ops page.'
  },
  boss: {
    family: 'boss-surface',
    measurable: true,
    label: 'Boss',
    liveAreaRole: 'convergence',
    description: 'Boss/convergence page that replaces the weekly field-ops surface on boss weeks.'
  },
  interlude: {
    family: 'interlude',
    measurable: true,
    label: 'Interlude',
    liveAreaRole: 'bridge',
    description: 'Mid-book tonal or narrative interruption page.'
  },
  'fragment-page': {
    family: 'archive',
    measurable: true,
    label: 'Fragment Page',
    liveAreaRole: 'archive',
    description: 'Back-matter document archive page containing one or more found-document fragments.'
  },
  'overflow-doc': {
    family: 'archive',
    measurable: true,
    label: 'Overflow Document',
    liveAreaRole: 'archive',
    description: 'Weekly right-hand continuation document paired with extra workout pages.'
  },
  assembly: {
    family: 'unlock',
    measurable: true,
    label: 'Assembly',
    liveAreaRole: 'unlock',
    description: 'Password assembly page that gathers weekly outputs into the final word.'
  },
  'gauge-log': {
    family: 'unlock',
    measurable: true,
    label: 'Gauge Log',
    liveAreaRole: 'unlock',
    description: 'Gauge reading log page used to record weekly extraction outputs.'
  },
  'ending-locked': {
    family: 'ending',
    measurable: true,
    label: 'Locked Ending',
    liveAreaRole: 'ending',
    description: 'Locked final page shown before decryption.'
  },
  'ending-unlocked': {
    family: 'ending',
    measurable: true,
    label: 'Unlocked Ending',
    liveAreaRole: 'ending',
    description: 'Unlocked final document shown after successful decryption.'
  },
  'blank-filler': {
    family: 'utility',
    measurable: false,
    label: 'Blank Filler',
    liveAreaRole: 'utility',
    description: 'Padding page used to preserve booklet imposition.'
  },
  notes: {
    family: 'utility',
    measurable: false,
    label: 'Notes',
    liveAreaRole: 'utility',
    description: 'General notes grid page used as booklet padding and player scratch space.'
  },
  'back-cover': {
    family: 'back-matter',
    measurable: false,
    label: 'Back Cover',
    liveAreaRole: 'back-cover',
    description: 'Back-cover artifact page and closing colophon.'
  }
};

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

export function getPageAtom(type) {
  return PAGE_ATOM_REGISTRY[type] || { family: 'custom', measurable: true };
}

export function getDocumentAtom(type) {
  const normalized = String(type || '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .trim();
  return DOCUMENT_ATOM_REGISTRY[type] || DOCUMENT_ATOM_REGISTRY[normalized] || { family: 'custom-document' };
}
