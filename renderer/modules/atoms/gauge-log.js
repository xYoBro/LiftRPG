/**
 * gauge-log.js — Gauge log page atom
 *
 * Wraps booklet-primitives.js renderGaugeLogPage() and
 * booklet-models.js buildGaugeLogPageModelWithVariant() into the atom interface.
 *
 * Data shape: { meta, weeks } — the full booklet data object is needed
 * for buildGaugeLogPageModelWithVariant.
 *
 * Full-page atom. render() returns the full page element.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildGaugeLogPageModelWithVariant } from '../booklet-models.js';
import { renderGaugeLogPage } from '../booklet-primitives.js';
import { densityVariant } from '../engine/density-util.js';

const FULL_PAGE_HEIGHT = 741;
// Minimum height at maximum density (tight variant). The old justification
// cited "line-clamped instructions" — that clamp is gone (it hid up to 120px
// of live extraction-instruction text while buying zero fit; see the tight
// .password-log-instruction note in booklet.css). Re-measured clamp-free
// across all 18 content/ fixtures: natural tight content runs 278-488px
// (median 332, max vale 488), so 560 remains a conservative floor above the
// worst corpus page — the constant survives its own dead reason (D78).
const GAUGE_LOG_MIN_HEIGHT = 560;

registerAtom('gauge-log', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'either',

  estimate(data, density) {
    const d = Number.isFinite(density) ? density : 0;
    const preferredHeight = FULL_PAGE_HEIGHT + (GAUGE_LOG_MIN_HEIGHT - FULL_PAGE_HEIGHT) * d;
    return {
      minHeight: GAUGE_LOG_MIN_HEIGHT,
      preferredHeight: Math.round(preferredHeight),
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const variant = densityVariant(density) || 'standard';
    const gaugeModel = buildGaugeLogPageModelWithVariant(data, variant);
    return renderGaugeLogPage(gaugeModel);
  },
});

export default 'gauge-log';
