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
import { PAGE_BUDGET } from '../engine/page-spec.js';

const FULL_PAGE_HEIGHT = PAGE_BUDGET.heightPx;
const BOSS_BASE_OVERFLOW = 38;

/**
 * CROSS-FILE CONTRACT — this figure is the JS side of the boss density ladder
 * in renderer/booklet.css (`.boss-right[data-layout-variant="…"]`, which
 * carries the reverse pointer). It is the standard→tight delta the ladder
 * really delivers, so it moves when those rules move.
 *
 * It used to be justified by truncation: "tight variant + boss-component-value
 * line-clamp saves ~280px". Two of the three clamps on that page were hiding
 * live text (up to 69px on vale, 48px on variety-02) and are gone — D77's rule
 * is that truncation is never shrink. Re-measured against the real ladder
 * afterwards, on all nine main boss pages in content/ (the eight profile
 * fixtures plus Persephone), standard → tight:
 *
 *   The-Hinge 217 · soil 230 · Palimpsest 254 · conclave 257 · Persephone 311
 *   Air-Gapped 319 · variety-02 353 · eastern-shore 383 · vale 432
 *
 * median 311, mean 306. So the number survives its own bad reason: 300 is the
 * ladder's real median saving, not the clamp's. Range is wide because the
 * ladder scales with prose volume and this model does not — see the honest
 * hole below.
 */
const BOSS_MAX_SHRINK = 300;

/**
 * The appendix (continuationSegment 'followup') page's ladder is nearly flat,
 * and measurably so: standard → tight moves it 11px (The-Hinge, vale, soil),
 * 29px (Persephone), 30px (conclave). It is almost entirely
 * `[data-continuation-segment="followup"]` chrome, which the density tiers do
 * not touch. The old 120 here promised four to eleven times the shrink the
 * page can give — an over-promise is the dangerous direction, because the
 * solver spends density it will not get back and the planner under-reads the
 * final height.
 */
const BOSS_FOLLOWUP_MAX_SHRINK = 30;

/**
 * HONEST HOLE — this model does not know about forced tight. When the shell is
 * classified-packet AND the boss has appendix content, buildBossPageModel()
 * pins layoutVariant to 'tight' at every density (it has to: the appendix page
 * only exists because the content did not fit), so the rendered page does not
 * respond to density at all and the real shrink potential is zero. Five of the
 * nine main boss pages in content/ are in that state — every fixture that also
 * emits an appendix page — and so is every appendix page. The estimate still
 * promises BOSS_MAX_SHRINK for them, which reads as a systematic
 * under-estimate at high density (vale renders 671px where this model says
 * ~500px). Measurement in
 * phase 2 corrects the number before anything is placed, and the boss is a
 * full-page unsplittable atom that is never packed against anything, so the
 * cost today is wasted solver passes rather than clipping. Closing it properly
 * means giving this atom a real per-block content model (the D77 treatment
 * oracle/map/fragment got); it is not a constant that can be nudged.
 */

function bossContentWeight(week, bookletData) {
  const model = buildBossPageModel(bookletData, week, 'standard');
  const narrativeLen = (model.narrativeParagraphs || []).join(' ').length;
  const mechanismLen = (model.mechanismParagraphs || []).join(' ').length;
  const proofLen = (model.convergenceProofParagraphs || []).join(' ').length;
  const rationaleLen = String(model.whyItFeelsEarned || '').length;
  const prerequisiteLen = (model.requiredPriorKnowledge || []).join(' ').length;
  const branchLen = [
    ((model.binaryChoiceAcknowledgement || {}).ifA || ''),
    ((model.binaryChoiceAcknowledgement || {}).ifB || ''),
  ].join(' ').length;
  const tableLines = String(model.decodingTable || '').split('\n').filter(Boolean).length;
  const componentCount = (model.componentInputs || []).length;

  return Math.min(
    1,
    (narrativeLen + mechanismLen + proofLen + branchLen
      + rationaleLen + prerequisiteLen) / 1400
      + tableLines * 0.04
      + componentCount * 0.03,
  );
}

function estimateBossHeight(data, density) {
  const normalizedDensity = Number.isFinite(density) ? density : 0.6;
  const week = (data || {}).week || {};
  const bookletData = (data || {}).data || {};
  const continuationSegment = (data || {}).continuationSegment || '';
  if (continuationSegment === 'followup') {
    return FULL_PAGE_HEIGHT - normalizedDensity * BOSS_FOLLOWUP_MAX_SHRINK;
  }
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
    const bossModel = buildBossPageModel(bookletData, week, {
      layoutVariant,
      continuationSegment: data.continuationSegment || 'full',
      continuationLabel: data.continuationLabel || '',
    });
    return renderBossPage(bossModel);
  },
});

export default 'boss-encounter';
