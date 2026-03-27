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
/** Minimum height per entry (short label-only entries) */
const ENTRY_HEIGHT_FLOOR = 24;
/** Compressed heights at max density */
const HEADER_HEIGHT_MIN = 48;
const ENTRY_HEIGHT_FLOOR_MIN = 20;

/**
 * Oracle entries in prose-heavy booklets contain 150–350 char text + paperAction
 * strings that wrap across multiple lines.  A flat per-entry constant dramatically
 * underestimates these cases.  Instead we estimate height from character count.
 *
 * Calibrated against measured oracle heights in the soil booklet:
 *   avg 237-char entries (10 entries) → 436px actual
 *   Using CHARS=75, LINE=13 → 4 lines × 13 = 52px × 10 + 60 header = 580px (conservative)
 *
 * Over-estimates collapse harmlessly via the compaction step in planAndMeasure().
 */
const ORACLE_ENTRY_CHARS_PER_LINE = 75;
const ORACLE_ENTRY_LINE_HEIGHT_PX = 13;

registerAtom('oracle-table', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'right',

  estimate(data, density) {
    const oracle = data.oracle || {};
    const entries = oracle.entries || [];

    let entriesHeight = 0;
    let entriesHeightMin = 0;
    entries.forEach(function (entry) {
      // Include paperAction in char count — it renders alongside the result text.
      const text = (entry.text || '') + (entry.paperAction ? ' ' + entry.paperAction : '');
      const lines = Math.max(1, Math.ceil(text.length / ORACLE_ENTRY_CHARS_PER_LINE));
      entriesHeight    += Math.max(ENTRY_HEIGHT_FLOOR,     lines * ORACLE_ENTRY_LINE_HEIGHT_PX);
      entriesHeightMin += Math.max(ENTRY_HEIGHT_FLOOR_MIN, lines * ORACLE_ENTRY_LINE_HEIGHT_PX);
    });

    return {
      minHeight:       HEADER_HEIGHT_MIN + entriesHeightMin,
      preferredHeight: HEADER_HEIGHT     + entriesHeight,
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const oracle = data.oracle || {};
    const artifactIdentity = data.artifactIdentity || {};

    const oracleModel = buildOracleModel(oracle);
    const el = renderOracleSection(oracleModel);
    el.setAttribute('data-shell-family', artifactIdentity.shellFamily || 'field-survey');
    el.setAttribute('data-board-state-mode', artifactIdentity.boardStateMode || 'survey-grid');
    el.setAttribute('data-attachment-strategy', artifactIdentity.attachmentStrategy || 'split-technical');

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'oracle-table';
