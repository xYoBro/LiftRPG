import { getDocumentAtom } from './atom-registry.js?v=48';
import { splitParagraphs } from './utils.js?v=48';

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

/**
 * normalizeManifestPointer(source) -> { targetRef, postedAs } | null
 * Posted manifests (schema 1.5.0): the printed forward reference. The renderer
 * prints `postedAs` verbatim; `targetRef` rides along as a data attribute so
 * the chase is inspectable. Both fields are required by the schema, but a
 * half-filled pointer must not print a blank stamp — normalize to null.
 */
export function normalizeManifestPointer(source) {
  const pointer = source && source.manifestPointer;
  if (!pointer || typeof pointer !== 'object') return null;
  const postedAs = String(pointer.postedAs || '').trim();
  if (!postedAs) return null;
  return {
    targetRef: String(pointer.targetRef || '').trim(),
    postedAs
  };
}

/**
 * normalizeCiteRef(source) -> { targetRef, citedAs } | null
 *
 * The printed citation (schema 1.5.0, §11 Wave 4a) — `manifestPointer`'s twin,
 * pointed at an authority instead of a chase. `citedAs` is what the artifact
 * prints; `targetRef` rides along as a data attribute so the citation is
 * inspectable without being printed twice.
 *
 * SINGLE HOME. Session micro-lines carry a citeRef too (workout-models.js
 * imports this), because a citation that normalized differently on the two
 * surfaces would stop being one grammar — the D91 defect class.
 *
 * Both fields are schema-required, but a half-filled ref must not print an
 * empty token, so a blank `citedAs` normalizes to null exactly as a blank
 * `postedAs` does above.
 */
export function normalizeCiteRef(source) {
  const ref = source && source.citeRef;
  if (!ref || typeof ref !== 'object') return null;
  const citedAs = String(ref.citedAs || '').trim();
  if (!citedAs) return null;
  return {
    targetRef: String(ref.targetRef || '').trim(),
    citedAs
  };
}

/**
 * normalizeSeal(source) -> { keyHint, unlockCondition } | null
 *
 * The sealed cache (schema 1.5.0, §11 Wave 4a — salvage seed 5). No crypto:
 * the honour system IS the mechanism, so the renderer's whole job is to make
 * the seal legible and the key recognisable weeks before it is found.
 *
 * Either field alone is still a printable seal (a key with no stated condition
 * is a puzzle; a condition with no key hint is a locked door), so the band
 * survives on one — it collapses to null only when both are blank.
 */
export function normalizeSeal(source) {
  const seal = source && source.seal;
  if (!seal || typeof seal !== 'object') return null;
  const keyHint = String(seal.keyHint || '').trim();
  const unlockCondition = String(seal.unlockCondition || '').trim();
  if (!keyHint && !unlockCondition) return null;
  return { keyHint, unlockCondition };
}

function splitBody(fragment) {
  var raw = fragment.bodyText || fragment.body || fragment.content || '';
  // content may be {html: "..."} object from guided-build — extract the string
  if (raw && typeof raw === 'object') {
    raw = raw.html || raw.text || '';
  }
  // Plain-text bodies are escaped downstream, so an HTML entity in authored
  // text prints literally ("&nbsp;" on variety-02's routing slip). Decode the
  // one whitespace entity LLMs habitually leak into plain-text fields.
  return splitParagraphs(String(raw).replace(/&nbsp;/g, ' '));
}

/**
 * extractContentHtml(fragment) -> string | null
 * Returns the raw HTML string when fragment.content is an {html: "..."} object,
 * or null if content is plain text / absent.
 */
function extractContentHtml(fragment) {
  var c = fragment.content;
  if (c && typeof c === 'object' && typeof c.html === 'string' && c.html.trim()) {
    return c.html;
  }
  return null;
}

export function buildFragmentModel(fragment) {
  const rawDocumentType = fragment.documentType || 'Document';
  // Normalize LLM-generated type variants to the 8 supported renderer types
  var TYPE_ALIASES = {
    'letter': 'correspondence',
    'personal-letter': 'correspondence',
    'technical-report': 'report',
    'internal-memo': 'memo',
    'legal-filing': 'memo',
    'financial-record': 'form',
    'contract': 'memo',
    'field-report': 'report',
    'incident-report': 'report',
    'press-release': 'memo',
  };
  var documentType = TYPE_ALIASES[rawDocumentType.toLowerCase()] || rawDocumentType;
  const cssType = documentType;
  const documentClass = String(cssType)
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
  const bodyParagraphs = Array.isArray(fragment.bodyParagraphs) && fragment.bodyParagraphs.length
    ? fragment.bodyParagraphs
    : splitBody(fragment);

  // Rich HTML content from guided-build: {html: "..."} objects should render
  // as sanitized HTML, not as escaped paragraph text.
  const richHtml = extractContentHtml(fragment);

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
    richHtml: richHtml,
    designSpec: normalizeDesignSpec(fragment),
    authenticityChecks: normalizeAuthenticityChecks(fragment),
    continuationLabel: fragment.continuationLabel || '',
    manifestPointer: normalizeManifestPointer(fragment),
    citeRef: normalizeCiteRef(fragment),
    seal: normalizeSeal(fragment),
    partIndex: fragment.partIndex || 0,
    partCount: fragment.partCount || 0,
    artifactIdentity: fragment.artifactIdentity || {}
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
