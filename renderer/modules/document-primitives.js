import { make } from './dom.js?v=17';

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
  block.setAttribute('data-paper-tone', fragmentModel.designSpec.paperTone);
  block.setAttribute('data-primary-typeface', fragmentModel.designSpec.primaryTypeface);
  block.setAttribute('data-header-style', fragmentModel.designSpec.headerStyle);
  block.setAttribute('data-has-redactions', fragmentModel.designSpec.hasRedactions ? 'true' : 'false');
  block.setAttribute('data-has-annotations', fragmentModel.designSpec.hasAnnotations ? 'true' : 'false');
  block.setAttribute('data-has-irrelevant-detail', String(fragmentModel.authenticityChecks.hasIrrelevantDetail));
  block.setAttribute('data-could-exist-elsewhere', String(fragmentModel.authenticityChecks.couldExistInDifferentStory));

  if (fragmentModel.id) {
    block.appendChild(make('div', 'fragment-number', fragmentModel.numberText));
  }

  const doc = make('div', 'fragment-doc ' + fragmentModel.documentClass);
  doc.appendChild(make('div', 'fragment-doc-type', fragmentModel.documentType));

  const metaLines = buildMetaLines(fragmentModel);
  if (metaLines.length) {
    const metaBox = make('div', 'fragment-doc-header');
    metaLines.forEach((line) => {
      metaBox.appendChild(make('div', '', line));
    });
    doc.appendChild(metaBox);
  }

  const body = make('div', 'fragment-doc-body');
  fragmentModel.bodyParagraphs.forEach((para) => {
    body.appendChild(make('p', '', para));
  });
  doc.appendChild(body);
  doc.appendChild(make('div', 'fragment-doc-sig', fragmentModel.purpose));
  block.appendChild(doc);
  return block;
}

export function renderDocumentPage(model) {
  const page = make('section', 'booklet-page');
  page.setAttribute('data-page-type', model.pageType || 'fragment');
  const frame = make('div', 'fragment-page');

  const header = make('header', 'page-header');
  header.appendChild(make('span', '', model.title || 'Documents'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  (model.fragments || []).forEach((fragmentModel) => {
    frame.appendChild(renderFoundDocument(fragmentModel));
  });

  page.appendChild(frame);
  return page;
}
