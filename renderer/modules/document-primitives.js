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
