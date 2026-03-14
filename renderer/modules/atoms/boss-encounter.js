/**
 * boss-encounter.js — Boss encounter page atom
 *
 * Wraps field-ops-primitives.js renderBossPage() and
 * field-ops-models.js buildBossPageModel() into the atom interface.
 *
 * Data shape: { boss, weekIndex, meta, week, data }
 *   - week: the full week object (needed for buildBossPageModel)
 *   - data: the full booklet data object (needed for password length)
 *
 * Full-page atom. render() returns the full page element.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildBossPageModel } from '../field-ops-models.js';
import { renderBossPage } from '../field-ops-primitives.js';

const FULL_PAGE_HEIGHT = 741;

registerAtom('boss-encounter', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'right',

  estimate(data, density) {
    return { minHeight: FULL_PAGE_HEIGHT, preferredHeight: FULL_PAGE_HEIGHT };
  },

  render(atom, density) {
    const data = atom.data || {};
    const week = data.week || {};
    const bookletData = data.data || {};

    // buildBossPageModel(data, week, options)
    const bossModel = buildBossPageModel(bookletData, week);
    return renderBossPage(bossModel);
  },
});

export default 'boss-encounter';
