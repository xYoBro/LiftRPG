/**
 * boss-encounter.js — Boss encounter page atom
 *
 * Wraps field-ops-primitives.js renderBossPage() and
 * field-ops-models.js buildBossPageModel() into the atom interface.
 *
 * Data shape: { boss, weekIndex, meta, week, data }
 *   - week: the full week object (needed for buildBossPageModel)
 *   - data: the full booklet data object (needed for password length)
 *
 * Full-page atom. render() returns the full page element.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildBossPageModel } from '../field-ops-models.js';
import { renderBossPage } from '../field-ops-primitives.js';

const FULL_PAGE_HEIGHT = 741;
const BOSS_BASE_OVERFLOW = 38;
// Reflects actual shrink potential when componentInputs have long text:
// tight variant + boss-component-value line-clamp saves ~280px on dense booklets.
const BOSS_MAX_SHRINK = 300;

function bossContentWeight(week, bookletData) {
  const model = buildBossPageModel(bookletData, week, 'standard');
  const narrativeLen = (model.narrativeParagraphs || []).join(' ').length;
  const mechanismLen = (model.mechanismParagraphs || []).join(' ').length;
  const proofLen = (model.convergenceProofParagraphs || []).join(' ').length;
  const branchLen = [
    ((model.binaryChoiceAcknowledgement || {}).ifA || ''),
    ((model.binaryChoiceAcknowledgement || {}).ifB || ''),
  ].join(' ').length;
  const tableLines = String(model.decodingTable || '').split('\n').filter(Boolean).length;
  const componentCount = (model.componentInputs || []).length;

  return Math.min(
    1,
    (narrativeLen + mechanismLen + proofLen + branchLen) / 1400
      + tableLines * 0.04
      + componentCount * 0.03,
  );
}

function estimateBossHeight(data, density) {
  const normalizedDensity = Number.isFinite(density) ? density : 0.6;
  const week = (data || {}).week || {};
  const bookletData = (data || {}).data || {};
  const overflowAllowance = BOSS_BASE_OVERFLOW + bossContentWeight(week, bookletData) * 22;

  return FULL_PAGE_HEIGHT + overflowAllowance - normalizedDensity * BOSS_MAX_SHRINK;
}

function bossLayoutVariant(density) {
  if (density >= 0.75) return 'tight';
  if (density >= 0.45) return 'dense';
  return 'standard';
}

registerAtom('boss-encounter', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'right',

  estimate(data, density) {
    return {
      minHeight: estimateBossHeight(data, 1.0),
      preferredHeight: estimateBossHeight(data, density),
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const week = data.week || {};
    const bookletData = data.data || {};
    const layoutVariant = bossLayoutVariant(density);

    // buildBossPageModel(data, week, options)
    const bossModel = buildBossPageModel(bookletData, week, layoutVariant);
    return renderBossPage(bossModel);
  },
});

export default 'boss-encounter';
