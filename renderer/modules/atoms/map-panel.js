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

const MAP_HEIGHTS = {
  'grid': 200,
  'point-to-point': 220,
  'linear-track': 160,
  'player-drawn': 350,
};

registerAtom('map-panel', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'right',

  estimate(data, density) {
    const map = data.map || {};
    const mapType = map.mapType || 'grid';
    const height = MAP_HEIGHTS[mapType] || MAP_HEIGHTS['grid'];

    return { minHeight: height, preferredHeight: height };
  },

  render(atom, density) {
    const data = atom.data || {};
    const map = data.map || {};

    const mapModel = buildMapModel(map, null);
    return renderMapSection(mapModel);
  },
});

export default 'map-panel';
