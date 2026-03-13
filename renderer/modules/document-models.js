import { splitParagraphs } from './utils.js?v=17';

function normalizeDesignSpec(fragment) {
  const designSpec = fragment.designSpec || {};
  return {
    paperTone: designSpec.paperTone || 'neutral',
    primaryTypeface: designSpec.primaryTypeface || 'mixed',
    headerStyle: designSpec.headerStyle || 'form',
    hasRedactions: !!designSpec.hasRedactions,
    hasAnnotations: !!designSpec.hasAnnotations
  };
}

function normalizeAuthenticityChecks(fragment) {
  const checks = fragment.authenticityChecks || {};
  return {
    hasIrrelevantDetail: checks.hasIrrelevantDetail,
    couldExistInDifferentStory: checks.couldExistInDifferentStory,
    redactionDoesNarrativeWork: checks.redactionDoesNarrativeWork
  };
}

function splitBody(fragment) {
  return splitParagraphs(fragment.bodyText || fragment.body || fragment.content || '');
}

export function buildFragmentModel(fragment) {
  const documentType = fragment.documentType || 'Document';
  const documentClass = String(documentType)
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();

  return {
    id: fragment.id || '',
    numberText: fragment.id ? fragment.id.replace('F.', '') : '',
    documentType,
    documentClass,
    title: fragment.title || '',
    author: fragment.inWorldAuthor || '',
    recipient: fragment.inWorldRecipient || '',
    date: fragment.date || '',
    purpose: fragment.inWorldPurpose || 'END FILE',
    bodyParagraphs: splitBody(fragment),
    designSpec: normalizeDesignSpec(fragment),
    authenticityChecks: normalizeAuthenticityChecks(fragment)
  };
}

export function buildDocumentPageModel(fragments, pageType) {
  return {
    pageType: pageType || 'fragment',
    title: 'Documents',
    fragments: (fragments || []).map((fragment) => buildFragmentModel(fragment))
  };
}
