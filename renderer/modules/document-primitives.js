import { make } from './dom.js?v=48';
import { createBoundedPage } from './page-shell.js?v=48';
import { sanitizeHtml } from './utils.js?v=48';

/**
 * renderManifestPointer(pointer) -> Element | null
 * The posted manifest: a filed one-liner stamped at the foot of a document or
 * interlude, naming a surface the player has not reached yet. `postedAs` is
 * printed as text (make() sets textContent — escaped by construction); the
 * target rides as a data attribute for inspection, never as printed chrome.
 */
export function renderManifestPointer(pointer) {
  if (!pointer || !pointer.postedAs) return null;
  const line = make('div', 'manifest-pointer', pointer.postedAs);
  if (pointer.targetRef) line.setAttribute('data-manifest-target', pointer.targetRef);
  return line;
}

/**
 * renderCiteRef(citeRef) -> Element | null
 *
 * THE REFERENCE TOKEN. One home, two callers — found documents (below) and
 * session micro-lines (workout-primitives.js imports this) — because a citation
 * drawn differently on the two surfaces would stop reading as one grammar. The
 * pattern is the same one booklet-primitives.js already uses for
 * renderManifestPointer(): the shared printed pointer lives with the documents.
 *
 * INLINE, and that is load-bearing rather than cosmetic. A non-replaced inline
 * box's vertical padding and border do NOT enter the line box, so the token's
 * frame cannot change the height of the line it sits in. That is what lets both
 * estimate paths charge a citation as characters only, with no height term at
 * all. Switching `.cite-ref` to `inline-block` in booklet.css would silently
 * grow every line that carries one, and nothing models that — the D71 class.
 * booklet.css carries the reciprocal note.
 *
 * `citedAs` goes in through make()'s textContent; the machine target rides as a
 * data attribute so it is inspectable without being printed twice.
 */
export function renderCiteRef(citeRef) {
  if (!citeRef || !citeRef.citedAs) return null;
  const token = make('span', 'cite-ref', citeRef.citedAs);
  if (citeRef.targetRef) token.setAttribute('data-cite-target', citeRef.targetRef);
  return token;
}

/**
 * renderSealBand(seal) -> Element | null
 *
 * The sealed cache's head band (schema 1.5.0 `fragment.seal`): a stamp, the key
 * to look for, and what must already be true to open this. Printed at the TOP
 * of the document, above its type slug — a seal is the first thing you meet on
 * a sealed paper, and the classified-packet shell's `::before` evidence stamp
 * is a pseudo-element, so it still precedes this band without either knowing
 * about the other.
 *
 * NULL-GUARD (the renderManifestPointer pattern): a fragment without a seal
 * appends nothing and builds byte-identical DOM to the pre-Wave-4b renderer.
 *
 * Each field prints as ONE line whose label is inline, so the band's height is
 * (stamp line) + (wrapped lines of each present field) — the shape
 * atoms/fragment-doc.js models. Adding a stacked label would add a row the
 * estimate does not know about.
 */
export function renderSealBand(seal) {
  if (!seal) return null;

  const band = make('div', 'fragment-seal');
  band.appendChild(make('div', 'fragment-seal-mark', 'Sealed'));

  if (seal.keyHint) {
    const line = make('div', 'fragment-seal-line');
    line.appendChild(make('span', 'fragment-seal-key', 'Key'));
    line.appendChild(make('span', 'fragment-seal-text', seal.keyHint));
    band.appendChild(line);
  }
  if (seal.unlockCondition) {
    const line = make('div', 'fragment-seal-line');
    line.appendChild(make('span', 'fragment-seal-key', 'Opens'));
    line.appendChild(make('span', 'fragment-seal-text', seal.unlockCondition));
    band.appendChild(line);
  }

  return band;
}

function buildMetaLines(fragmentModel) {
  const lines = [];
  if (fragmentModel.title) lines.push(fragmentModel.title);
  if (fragmentModel.author) lines.push('FROM: ' + fragmentModel.author);
  if (fragmentModel.recipient) lines.push('TO: ' + fragmentModel.recipient);
  if (fragmentModel.date) lines.push('DATE: ' + fragmentModel.date);
  return lines;
}

export function renderFoundDocument(fragmentModel) {
  const block = make('div', 'fragment-block');
  const shellFamily = (fragmentModel.artifactIdentity || {}).shellFamily || 'field-survey';
  block.setAttribute('data-paper-tone', fragmentModel.designSpec.paperTone);
  block.setAttribute('data-primary-typeface', fragmentModel.designSpec.primaryTypeface);
  block.setAttribute('data-header-style', fragmentModel.designSpec.headerStyle);
  block.setAttribute('data-has-redactions', fragmentModel.designSpec.hasRedactions ? 'true' : 'false');
  block.setAttribute('data-has-annotations', fragmentModel.designSpec.hasAnnotations ? 'true' : 'false');
  block.setAttribute('data-has-irrelevant-detail', String(fragmentModel.authenticityChecks.hasIrrelevantDetail));
  block.setAttribute('data-could-exist-elsewhere', String(fragmentModel.authenticityChecks.couldExistInDifferentStory));
  block.setAttribute('data-document-family', fragmentModel.atomFamily || 'custom-document');
  block.setAttribute('data-shell-family', shellFamily);

  if (fragmentModel.id) {
    block.appendChild(make('div', 'fragment-number', fragmentModel.numberText));
  }

  const doc = make('div', 'fragment-doc ' + fragmentModel.documentClass);
  doc.setAttribute('data-shell-family', shellFamily);
  const sealBand = renderSealBand(fragmentModel.seal);
  if (sealBand) {
    doc.setAttribute('data-sealed', 'true');
    doc.appendChild(sealBand);
  }
  doc.appendChild(make('div', 'fragment-doc-type', fragmentModel.documentType));
  if (fragmentModel.continuationLabel) {
    doc.appendChild(make('div', 'fragment-doc-continuation', fragmentModel.continuationLabel));
  }

  const metaLines = buildMetaLines(fragmentModel);
  if (metaLines.length) {
    const metaBox = make('div', 'fragment-doc-header');
    metaLines.forEach((line) => {
      metaBox.appendChild(make('div', '', line));
    });
    doc.appendChild(metaBox);
  }

  const body = make('div', 'fragment-doc-body');
  if (fragmentModel.richHtml) {
    // Rich HTML from guided-build {html: "..."} content — render as sanitized HTML
    body.innerHTML = sanitizeHtml(fragmentModel.richHtml);
  } else {
    fragmentModel.bodyParagraphs.forEach((para) => {
      body.appendChild(make('p', '', para));
    });
  }
  doc.appendChild(body);
  const manifest = renderManifestPointer(fragmentModel.manifestPointer);
  if (manifest) doc.appendChild(manifest);
  // The filed citation, on its own line above the signature. A document may
  // both POST a chase forward and CITE the authority it was filed under, so
  // this is co-resident with the manifest rather than an alternative to it.
  const cite = renderCiteRef(fragmentModel.citeRef);
  if (cite) {
    const citeLine = make('div', 'fragment-cite');
    citeLine.appendChild(cite);
    doc.appendChild(citeLine);
  }
  doc.appendChild(make('div', 'fragment-doc-sig', fragmentModel.purpose));
  block.appendChild(doc);
  return block;
}

export function renderDocumentPage(model) {
  const pageType = model.pageType || 'fragment';
  const scaffold = createBoundedPage(pageType, 'fragment-page', {
    boundaryRole: 'archive',
    layoutVariant: model.layoutVariant || 'stacked'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;

  const header = make('header', 'page-header');
  header.appendChild(make('span', '', model.title || 'Documents'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  (model.fragments || []).forEach((fragmentModel) => {
    frame.appendChild(renderFoundDocument(fragmentModel));
  });

  return page;
}
