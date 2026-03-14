/**
 * map-panel.js — Map section atom
 *
 * Wraps field-ops-primitives.js renderMapSection() and
 * field-ops-models.js buildMapModel() into the atom interface.
 *
 * Data shape: { map, weekIndex }
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildMapModel } from '../field-ops-models.js';
import { renderMapSection } from '../field-ops-primitives.js';
import { densityVariant } from '../engine/density-util.js';

const MAP_HEIGHTS = {
  'grid':           200,
  'point-to-point': 220,
  'linear-track':   160,
  'player-drawn':   350,
};

/** ~15% reduction at max density */
const MAP_HEIGHTS_MIN = {
  'grid':           170,
  'point-to-point': 188,
  'linear-track':   136,
  'player-drawn':   300,
};

registerAtom('map-panel', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'right',

  estimate(data, density) {
    const map = data.map || {};
    const mapType = map.mapType || 'grid';
    const preferred = MAP_HEIGHTS[mapType]     || MAP_HEIGHTS['grid'];
    const min       = MAP_HEIGHTS_MIN[mapType] || MAP_HEIGHTS_MIN['grid'];

    return { minHeight: min, preferredHeight: preferred };
  },

  render(atom, density) {
    const data = atom.data || {};
    const map = data.map || {};

    const mapModel = buildMapModel(map, null);
    const el = renderMapSection(mapModel);

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'map-panel';
