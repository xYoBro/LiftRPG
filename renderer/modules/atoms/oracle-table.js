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

const HEADER_HEIGHT = 60;
const ENTRY_HEIGHT = 24;

registerAtom('oracle-table', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'right',

  estimate(data, density) {
    const oracle = data.oracle || {};
    const entries = oracle.entries || [];
    const height = HEADER_HEIGHT + entries.length * ENTRY_HEIGHT;

    return { minHeight: height, preferredHeight: height };
  },

  render(atom, density) {
    const data = atom.data || {};
    const oracle = data.oracle || {};

    const oracleModel = buildOracleModel(oracle);
    return renderOracleSection(oracleModel);
  },
});

export default 'oracle-table';
