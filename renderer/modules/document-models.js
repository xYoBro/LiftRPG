import { getDocumentAtom } from './atom-registry.js?v=32';
import { splitParagraphs } from './utils.js?v=32';

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
  const bodyParagraphs = Array.isArray(fragment.bodyParagraphs) && fragment.bodyParagraphs.length
    ? fragment.bodyParagraphs
    : splitBody(fragment);

  return {
    id: fragment.id || '',
    numberText: fragment.id ? fragment.id.replace('F.', '') : '',
    documentType,
    documentClass,
    atomFamily: getDocumentAtom(documentClass).family,
    title: fragment.title || '',
    author: fragment.inWorldAuthor || '',
    recipient: fragment.inWorldRecipient || '',
    date: fragment.date || '',
    purpose: fragment.inWorldPurpose || 'END FILE',
    bodyParagraphs,
    designSpec: normalizeDesignSpec(fragment),
    authenticityChecks: normalizeAuthenticityChecks(fragment),
    continuationLabel: fragment.continuationLabel || '',
    partIndex: fragment.partIndex || 0,
    partCount: fragment.partCount || 0
  };
}

export function buildDocumentPageModel(fragments, pageType, layoutVariant = 'stacked') {
  const normalizedPageType = pageType || 'fragment';
  return {
    pageType: normalizedPageType,
    layoutVariant,
    title: normalizedPageType === 'overflow-doc' ? 'Supplement' : 'Documents',
    fragments: (fragments || []).map((fragment) => buildFragmentModel(fragment))
  };
}
