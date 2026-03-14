/**
 * assembly-page.js — Password assembly page atom
 *
 * Wraps booklet-primitives.js renderAssemblyPage() and
 * booklet-models.js buildAssemblyPageModel() into the atom interface.
 *
 * Data shape: { meta, weeks } — the full booklet data object is needed
 * for buildAssemblyPageModel.
 *
 * Full-page atom. render() returns the full page element.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildAssemblyPageModel } from '../booklet-models.js';
import { renderAssemblyPage } from '../booklet-primitives.js';

const FULL_PAGE_HEIGHT = 741;

registerAtom('assembly-page', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'either',

  estimate(data, density) {
    return { minHeight: FULL_PAGE_HEIGHT, preferredHeight: FULL_PAGE_HEIGHT };
  },

  render(atom, density) {
    const data = atom.data || {};
    const assemblyModel = buildAssemblyPageModel(data);
    return renderAssemblyPage(assemblyModel);
  },
});

export default 'assembly-page';
