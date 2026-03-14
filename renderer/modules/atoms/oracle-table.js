/**
 * oracle-table.js — Oracle table atom
 *
 * Wraps field-ops-primitives.js renderOracleSection() and
 * field-ops-models.js buildOracleModel() into the atom interface.
 *
 * Data shape: { oracle, weekIndex }
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildOracleModel } from '../field-ops-models.js';
import { renderOracleSection } from '../field-ops-primitives.js';
import { densityVariant } from '../engine/density-util.js';

const HEADER_HEIGHT = 60;
const ENTRY_HEIGHT = 24;
/** Compressed heights at max density */
const HEADER_HEIGHT_MIN = 48;
const ENTRY_HEIGHT_MIN = 20;

registerAtom('oracle-table', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'right',

  estimate(data, density) {
    const oracle = data.oracle || {};
    const entries = oracle.entries || [];
    const preferred = HEADER_HEIGHT + entries.length * ENTRY_HEIGHT;
    const min       = HEADER_HEIGHT_MIN + entries.length * ENTRY_HEIGHT_MIN;

    return { minHeight: min, preferredHeight: preferred };
  },

  render(atom, density) {
    const data = atom.data || {};
    const oracle = data.oracle || {};

    const oracleModel = buildOracleModel(oracle);
    const el = renderOracleSection(oracleModel);

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'oracle-table';
