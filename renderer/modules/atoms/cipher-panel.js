/**
 * cipher-panel.js — Cipher section atom
 *
 * Wraps field-ops-primitives.js renderCipherSection() and
 * field-ops-models.js buildCipherModel() into the atom interface.
 *
 * Data shape: { cipher, weekIndex }
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildCipherModel } from '../field-ops-models.js';
import { renderCipherSection } from '../field-ops-primitives.js';
import { densityVariant } from '../engine/density-util.js';

const BASE_HEIGHT = 180;
const WORKSPACE_HEIGHT = 40;
const KEY_ROWS_HEIGHT = 30;
/** Max compressible margin savings at tight density */
const DENSITY_SAVINGS = 30;

/**
 * Cipher sequence text (body.displayText) renders at half-slot width (~232px).
 * The planner applies a ×1.4 width-scale factor for cols:1 atoms, so we
 * calibrate CHARS_PER_LINE for FULL width (so after ×1.4, the estimate
 * conservatively covers the narrow-width render).
 *
 * Calibrated against measured cipher heights in the soil booklet:
 *   506-char displayText → 250px actual  (estimate: 399px after ×1.4 — conservative)
 *   621-char displayText → 398px actual  (estimate: 441px — conservative)
 *   1059-char displayText → 576px actual (estimate: 588px — conservative)
 */
const DISPLAY_TEXT_CHARS_PER_LINE = 60;
const DISPLAY_TEXT_LINE_HEIGHT_PX = 15;

registerAtom('cipher-panel', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'right',
  footprint: { cols: 1 },

  estimate(data, density) {
    const cipher = data.cipher || {};
    const body = cipher.body || {};
    let height = BASE_HEIGHT;

    if (body.workSpace) {
      height += WORKSPACE_HEIGHT;
    }

    const keyText = body.key || '';
    if (keyText) {
      const keyLines = keyText.split('\n').filter(Boolean).length;
      if (keyLines > 1) {
        height += KEY_ROWS_HEIGHT;
      }
    }

    // Account for displayText content — the dominant height driver for
    // prose-heavy ciphers (index-extraction, typographic-anomaly, etc.).
    const displayText = body.displayText || '';
    if (displayText) {
      const lines = Math.max(1, Math.ceil(displayText.length / DISPLAY_TEXT_CHARS_PER_LINE));
      height += lines * DISPLAY_TEXT_LINE_HEIGHT_PX;
    }

    return {
      minHeight:       height - DENSITY_SAVINGS,
      preferredHeight: height,
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const cipher = data.cipher || {};
    const artifactIdentity = data.artifactIdentity || {};

    // buildCipherModel expects (cipher, weeklyComponent, mechanicProfile)
    // We pass cipher as weeklyComponent fallback for extractionInstruction
    const cipherModel = buildCipherModel(cipher, cipher, null);
    const el = renderCipherSection(cipherModel);
    el.setAttribute('data-shell-family', artifactIdentity.shellFamily || 'field-survey');
    el.setAttribute('data-board-state-mode', artifactIdentity.boardStateMode || 'survey-grid');
    el.setAttribute('data-attachment-strategy', artifactIdentity.attachmentStrategy || 'split-technical');

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'cipher-panel';
