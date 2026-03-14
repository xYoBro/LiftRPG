/**
 * gauge-log.js — Gauge log page atom
 *
 * Wraps booklet-primitives.js renderGaugeLogPage() and
 * booklet-models.js buildGaugeLogPageModel() into the atom interface.
 *
 * Data shape: { meta, weeks } — the full booklet data object is needed
 * for buildGaugeLogPageModel.
 *
 * Full-page atom. render() returns the full page element.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildGaugeLogPageModel } from '../booklet-models.js';
import { renderGaugeLogPage } from '../booklet-primitives.js';

const FULL_PAGE_HEIGHT = 741;

registerAtom('gauge-log', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'either',

  estimate(data, density) {
    return { minHeight: FULL_PAGE_HEIGHT, preferredHeight: FULL_PAGE_HEIGHT };
  },

  render(atom, density) {
    const data = atom.data || {};
    const gaugeModel = buildGaugeLogPageModel(data);
    return renderGaugeLogPage(gaugeModel);
  },
});

export default 'gauge-log';
