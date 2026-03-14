/**
 * cover.js — Cover page atom
 *
 * Wraps booklet-primitives.js renderCoverPage() and
 * booklet-models.js buildCoverPageModel() into the atom interface.
 *
 * Data shape: { meta, theme } — the full booklet data object is needed
 * for buildCoverPageModel, so atom.data should carry the full data object.
 *
 * The cover is always a full page. render() returns the full page element
 * directly since the cover IS the page.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildCoverPageModel } from '../booklet-models.js';
import { renderCoverPage } from '../booklet-primitives.js';

const FULL_PAGE_HEIGHT = 741;

registerAtom('cover', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'right',

  estimate(data, density) {
    return { minHeight: FULL_PAGE_HEIGHT, preferredHeight: FULL_PAGE_HEIGHT };
  },

  render(atom, density) {
    const data = atom.data || {};
    const coverModel = buildCoverPageModel(data);
    return renderCoverPage(coverModel);
  },
});

export default 'cover';
