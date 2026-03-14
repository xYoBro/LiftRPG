/**
 * fragment-doc.js — Found document / fragment atom
 *
 * Wraps document-primitives.js renderFoundDocument() and
 * document-models.js buildFragmentModel() into the atom interface.
 *
 * Data shape: a raw fragment object from the JSON
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildFragmentModel } from '../document-models.js';
import { renderFoundDocument } from '../document-primitives.js';

const CHROME_HEIGHT = 80;
const PARAGRAPH_HEIGHT = 45;

registerAtom('fragment-doc', {
  defaultSizeHint: 'flex',
  canShare: true,
  pageAffinity: 'either',

  estimate(data, density) {
    const bodyText = data.bodyText || data.body || data.content || '';
    const paragraphCount = Array.isArray(data.bodyParagraphs) && data.bodyParagraphs.length
      ? data.bodyParagraphs.length
      : bodyText.split(/\n\n+/).filter(Boolean).length || 1;

    const height = CHROME_HEIGHT + paragraphCount * PARAGRAPH_HEIGHT;
    return { minHeight: height, preferredHeight: height };
  },

  render(atom, density) {
    const data = atom.data || {};
    const fragmentModel = buildFragmentModel(data);
    return renderFoundDocument(fragmentModel);
  },
});

export default 'fragment-doc';
