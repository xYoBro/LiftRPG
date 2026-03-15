/**
 * overflow-doc.js — Weekly continuation document page atom
 *
 * Wraps document-primitives.js renderDocumentPage() and
 * document-models.js buildDocumentPageModel() into the atom interface.
 *
 * Data shape: { document, layoutVariant? }
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildDocumentPageModel } from '../document-models.js';
import { renderDocumentPage } from '../document-primitives.js';

const FULL_PAGE_HEIGHT = 741;

registerAtom('overflow-doc', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'right',

  estimate() {
    return { minHeight: FULL_PAGE_HEIGHT, preferredHeight: FULL_PAGE_HEIGHT };
  },

  render(atom) {
    const data = atom.data || {};
    const document = data.document || data;
    const layoutVariant = data.layoutVariant || 'stacked';
    const model = buildDocumentPageModel([document], 'overflow-doc', layoutVariant);
    return renderDocumentPage(model);
  },
});

export default 'overflow-doc';
