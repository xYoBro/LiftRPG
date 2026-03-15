/**
 * interlude.js — Narrative bridge / interlude page atom
 *
 * Wraps booklet-primitives.js renderInterludePage() and
 * booklet-models.js buildInterludePageModel() into the atom interface.
 *
 * Data shape: { week, interlude, layoutVariant?, continuationLabel? }
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildInterludePageModel } from '../booklet-models.js';
import { renderInterludePage } from '../booklet-primitives.js';

const FULL_PAGE_HEIGHT = 741;

function inferLayoutVariant(interlude) {
  const payloadType = String((interlude || {}).payloadType || '').trim().toLowerCase();
  if (payloadType && payloadType !== 'none') return 'artifact';
  if ((interlude || {}).spreadAware) return 'artifact';
  return 'quiet';
}

registerAtom('interlude', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'either',

  estimate() {
    return { minHeight: FULL_PAGE_HEIGHT, preferredHeight: FULL_PAGE_HEIGHT };
  },

  render(atom) {
    const data = atom.data || {};
    const week = data.week || data.weekMeta || {};
    const interlude = data.interlude || week.interlude || {};
    const layoutVariant = data.layoutVariant || inferLayoutVariant(interlude);
    const entry = data.continuationLabel
      ? { continuationLabel: data.continuationLabel }
      : null;
    const model = buildInterludePageModel(week, layoutVariant, interlude, entry);
    return renderInterludePage(model);
  },
});

export default 'interlude';
