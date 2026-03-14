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
import { densityVariant } from '../engine/density-util.js';

const CHROME_HEIGHT = 80;
const PARAGRAPH_HEIGHT = 45;
/** Compressed values at max density */
const CHROME_HEIGHT_MIN = 60;
const PARAGRAPH_HEIGHT_MIN = 35;

registerAtom('fragment-doc', {
  defaultSizeHint: 'flex',
  canShare: true,
  pageAffinity: 'either',

  estimate(data, density) {
    const bodyText = data.bodyText || data.body || data.content || '';
    const paragraphCount = Array.isArray(data.bodyParagraphs) && data.bodyParagraphs.length
      ? data.bodyParagraphs.length
      : bodyText.split(/\n\n+/).filter(Boolean).length || 1;

    const preferred = CHROME_HEIGHT     + paragraphCount * PARAGRAPH_HEIGHT;
    const min       = CHROME_HEIGHT_MIN + paragraphCount * PARAGRAPH_HEIGHT_MIN;

    return { minHeight: min, preferredHeight: preferred };
  },

  render(atom, density) {
    const data = atom.data || {};
    const fragmentModel = buildFragmentModel(data);
    const el = renderFoundDocument(fragmentModel);

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'fragment-doc';
