/**
 * rules-block.js — Rules spread atom (left or right side)
 *
 * Wraps booklet-primitives.js renderRulesLeftPage() and renderSealedPage()
 * plus booklet-models.js model builders into the atom interface.
 *
 * Data shape: { side, rules, meta }
 *   - side: 'left' or 'right'
 *   - For 'left': the full booklet data object (for buildRulesLeftPageModel)
 *   - For 'right': the full booklet data object (for buildSealedPageModel)
 *
 * These are full-page atoms. render() returns the full page element.
 */

import { registerAtom } from '../engine/atom-registry.js';
import {
  buildRulesLeftPageModel,
  buildSealedPageModel,
} from '../booklet-models.js';
import {
  renderRulesLeftPage,
  renderSealedPage,
} from '../booklet-primitives.js';

const FULL_PAGE_HEIGHT = 741;

registerAtom('rules-block', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'either',

  estimate(data, density) {
    return { minHeight: FULL_PAGE_HEIGHT, preferredHeight: FULL_PAGE_HEIGHT };
  },

  render(atom, density) {
    const data = atom.data || {};
    const side = data.side || 'left';

    if (side === 'right') {
      const sealedModel = buildSealedPageModel(data);
      return renderSealedPage(sealedModel);
    }

    const rulesModel = buildRulesLeftPageModel(data);
    return renderRulesLeftPage(rulesModel);
  },
});

export default 'rules-block';
