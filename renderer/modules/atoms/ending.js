/**
 * ending.js — Ending page atom (locked or unlocked)
 *
 * Wraps booklet-primitives.js renderLockedEndingPage() and
 * renderUnlockedEndingPage() plus booklet-models.js model builders
 * into the atom interface.
 *
 * Data shape: { type: 'locked'|'unlocked', meta, endings, content, data }
 *   - type: selects which renderer to use
 *   - data: the full booklet data object (needed for model builders)
 *   - content: for unlocked, the decrypted payload
 *
 * Full-page atom. render() returns the full page element.
 */

import { registerAtom } from '../engine/atom-registry.js';
import {
  buildLockedEndingPageModel,
  buildUnlockedEndingPageModel,
} from '../booklet-models.js';
import {
  renderLockedEndingPage,
  renderUnlockedEndingPage,
} from '../booklet-primitives.js';

const FULL_PAGE_HEIGHT = 741;

registerAtom('ending', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'either',

  estimate(data, density) {
    return { minHeight: FULL_PAGE_HEIGHT, preferredHeight: FULL_PAGE_HEIGHT };
  },

  render(atom, density) {
    const data = atom.data || {};
    const type = data.type || 'locked';
    const bookletData = data.data || {};

    if (type === 'unlocked') {
      const payload = data.content || null;
      // Pass continuationLabel via the entry param (4th arg) so the
      // model builder picks it up for multi-page endings.
      const entry = payload && payload.continuationLabel
        ? { continuationLabel: payload.continuationLabel }
        : null;
      const unlockedModel = buildUnlockedEndingPageModel(bookletData, payload, 'document', entry);
      return renderUnlockedEndingPage(unlockedModel);
    }

    const lockedModel = buildLockedEndingPageModel(bookletData);
    return renderLockedEndingPage(lockedModel);
  },
});

export default 'ending';
