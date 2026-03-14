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

/**
 * Infer the layout variant from the ending's designSpec.
 * Matches the treatment inference in booklet-models.js but maps
 * to layout variant names used by CSS [data-layout-variant] selectors:
 *   warm-letter → 'letter', official-document → 'document', default → 'document'
 */
function inferLayoutVariant(endings, payload) {
  // Find the matching ending entry to read designSpec
  const ending = (endings || []).find(e =>
    payload && payload.variant && e && e.variant === payload.variant,
  ) || (endings || [])[0] || {};
  const spec = String(ending.designSpec || '').toLowerCase();
  if (spec.includes('letter') || spec.includes('warm') || spec.includes('personal')) {
    return 'letter';
  }
  return 'document';
}

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
      const layoutVariant = inferLayoutVariant(bookletData.endings, payload);
      const unlockedModel = buildUnlockedEndingPageModel(bookletData, payload, layoutVariant, entry);
      return renderUnlockedEndingPage(unlockedModel);
    }

    const lockedModel = buildLockedEndingPageModel(bookletData);
    return renderLockedEndingPage(lockedModel);
  },
});

export default 'ending';
