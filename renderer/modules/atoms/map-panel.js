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
  'grid':           280,
  'point-to-point': 360,
  'linear-track':   160,
  'player-drawn':   350,
};

/** ~15% reduction at max density */
const MAP_HEIGHTS_MIN = {
  'grid':           240,
  'point-to-point': 300,
  'linear-track':   136,
  'player-drawn':   300,
};

registerAtom('map-panel', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'right',
  footprint: { cols: 1 },

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
    const artifactIdentity = data.artifactIdentity || {};

    const mapModel = buildMapModel({
      ...map,
      artifactIdentity,
    }, null);
    // renderMapSection now returns .map-zone (peer of .cipher-zone/.oracle-zone).
    // Set identity attributes on the zone for zone-level CSS rules, and mirror
    // them onto the inner .map-content so CSS selectors targeting
    // .map-content[data-shell-family] (solo-surface contexts) still match.
    const el = renderMapSection(mapModel);
    const shellFamily   = artifactIdentity.shellFamily   || 'field-survey';
    const boardState    = artifactIdentity.boardStateMode || 'survey-grid';
    const attachStrat   = artifactIdentity.attachmentStrategy || 'split-technical';
    el.setAttribute('data-shell-family',        shellFamily);
    el.setAttribute('data-board-state-mode',    boardState);
    el.setAttribute('data-attachment-strategy', attachStrat);

    const mapContent = el.querySelector('.map-content');
    if (mapContent) {
      mapContent.setAttribute('data-shell-family',        shellFamily);
      mapContent.setAttribute('data-board-state-mode',    boardState);
      mapContent.setAttribute('data-attachment-strategy', attachStrat);
    }

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'map-panel';
