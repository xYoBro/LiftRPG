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

registerAtom('cipher-panel', {
  defaultSizeHint: 'quarter-page',
  canShare: true,
  pageAffinity: 'right',

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

    return {
      minHeight:       height - DENSITY_SAVINGS,
      preferredHeight: height,
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const cipher = data.cipher || {};

    // buildCipherModel expects (cipher, weeklyComponent, mechanicProfile)
    // We pass cipher as weeklyComponent fallback for extractionInstruction
    const cipherModel = buildCipherModel(cipher, cipher, null);
    const el = renderCipherSection(cipherModel);

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'cipher-panel';
