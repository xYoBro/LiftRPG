/**
 * back-cover.js — Back cover page atom
 *
 * Wraps booklet-primitives.js renderBackCover() and
 * booklet-models.js buildBackCoverModel() into the atom interface.
 *
 * Data shape: { meta } — the full booklet data object is needed
 * for buildBackCoverModel.
 *
 * Full-page atom. render() returns the full page element.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildBackCoverModel } from '../booklet-models.js';
import { renderBackCover } from '../booklet-primitives.js';

const FULL_PAGE_HEIGHT = 741;

registerAtom('back-cover', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'left',

  estimate(data, density) {
    return { minHeight: FULL_PAGE_HEIGHT, preferredHeight: FULL_PAGE_HEIGHT };
  },

  render(atom, density) {
    const data = atom.data || {};
    const backCoverModel = buildBackCoverModel(data);
    return renderBackCover(backCoverModel);
  },
});

export default 'back-cover';
