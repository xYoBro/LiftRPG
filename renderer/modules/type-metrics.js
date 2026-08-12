/**
 * type-metrics.js — what phase-1 estimation is allowed to know about typefaces.
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 *
 * Phase-1 estimation has no DOM. Every atom that models wrapped text does it
 * arithmetically: characters × a per-character advance. Those advances are
 * MEASURED constants, and a measured advance is a function of the FACE it was
 * measured against — so an estimate is only true for the typefaces it was
 * calibrated on. Until 2026-08-12 that was invisible, because a CSS defect
 * froze every archetype onto pastoral's two faces (D116(b)/D118): one face set
 * shipped, so one calibration was enough.
 *
 * Un-freezing the aliases makes the face a variable. IBM Plex Mono — which nine
 * of the ten presets name for `--font-mono` and three name for `--font-body` —
 * is 11.1% wider per character than the Share Tech Mono those constants were
 * measured against. Estimate a mono-set book with pastoral's numbers and every
 * wrapped chrome line is modelled ~11% short; the atom is allocated too little
 * height and `overflow:hidden` eats the residue as real ink. Measured corpus
 * census before this file existed: internal clipping 150 → 177 elements, 50 new
 * kinds, 25 deepened (D118).
 *
 * ── THE MODEL, AND THE PROOF THAT IT IS THE RIGHT ONE ───────────────────────
 *
 * An advance constant decomposes as
 *
 *     advance_px = (A(face) + tracking_em) × fontSize_px  + rounding allowance
 *
 * where A(face) is the face's mean advance as a fraction of its em. Only the
 * first term moves when the face changes: `letter-spacing` is a CSS length in
 * em and does not care what face it is spacing, and the rounding allowance is
 * the author's wrap slack. So the face-aware correction is an ADDITION of
 * (A(new) − A(anchor)) × fontSize_px — never a rescale of the whole constant,
 * which would inflate tracking and slack that were never face-dependent.
 *
 * That decomposition is not a hypothesis. Three constants in this repo were
 * measured off the live stylesheet against Share Tech Mono by earlier waves and
 * their measured values recorded in comments; the model reproduces them from
 * A('Share Tech Mono') alone:
 *
 *     .oracle-case-num  5pt mono +.04em   recorded 3.87   model 3.867
 *     .frag-ref chip    7pt mono +.10em   recorded 5.98   model 5.974
 *     .frag-ref chip  5.4pt mono +.10em   recorded 4.61   model 4.609
 *     .clock-name     5.8pt mono +.08em   recorded 4.793  model 4.795
 *     .clock-subtext    5pt mono          recorded 3.597  model 3.601
 *
 * Five constants, three waves, two instruments, worst disagreement 0.006px.
 *
 * ── THE TABLE (measured 2026-08-12) ─────────────────────────────────────────
 *
 * MEASURED, NOT LOOKED UP. Chrome, the vendored woff2 files this repo serves
 * (public/vendor/fonts/), canvas measureText at 100px over the 1.36M authored
 * characters of the 21-book corpus — so A is weighted by the letter frequencies
 * the books actually print, which is the only weighting that matters for a
 * proportional face. Cross-checked against a DOM probe of the same string in
 * the same page: the two instruments agree to within 0.35% on every face, and
 * exactly on the monospaced ones.
 *
 * Independent confirmation that the anchor is right: swept against the real
 * greedy word-wrap of every corpus body paragraph at every ladder size, the
 * smallest ratio that never under-estimates is 0.580 for Share Tech Mono —
 * which is BODY_CHAR_RATIO in atoms/fragment-doc.js, arrived at by a different
 * wave through a different method. For IBM Plex Mono the same sweep says 0.652,
 * and this table's body delta puts it at 0.654.
 *
 * ── THE MIRROR (new class, and it has a gate) ───────────────────────────────
 *
 * MEASURED CONSTANTS ⇄ THE VENDORED FONT SET. This table is true of the four
 * families in public/vendor/fonts/ and of nothing else. Re-vendoring (scripts/
 * vendor-fonts.sh) or naming a new family in a theme.js preset invalidates it
 * exactly the way a CSS token change invalidates a ladder mirror. That is not
 * left to memory: `typeMetricsFaceParity()` in scripts/validate.mjs asserts
 * FACE_ADVANCE_EM ≡ the families in vendor/fonts/fonts.css, and asserts every
 * family named first in a theme.js stack is either measured here or declared
 * UNPINNED below. A new face fails the build until someone measures it.
 */

/**
 * Mean advance per em, corpus-weighted. Keys are the exact family names the
 * theme.js presets and vendor/fonts/fonts.css use.
 */
export const FACE_ADVANCE_EM = {
  'Share Tech Mono':   0.5401,
  'Libre Baskerville': 0.5259,
  'IBM Plex Mono':     0.6000,
  'Playfair Display':  0.4707,
};

/**
 * Stacks whose first family this machine cannot pin, and the ruling about them.
 *
 * `system-ui` resolves to a different face on every operating system — SF on
 * this Mac (measured A 0.4242), Segoe UI on Windows, whatever fontconfig hands
 * back on Linux. A booklet is a PRINTED artifact generated on the reader's own
 * machine, so measuring the local resolution and shipping it as a constant
 * would bake this Mac's metrics into every reader's page budget.
 *
 * The ruling: an unpinned stack takes delta 0 — the calibrated anchor, which is
 * what it already estimates at today. Combined with the clamp in faceDelta(),
 * this means the table only ever ADDS height for a face proven wider than the
 * calibration, and never removes height on the strength of a face we cannot
 * prove the reader has. scifi and minimalist (the two presets that name
 * system-ui) are therefore byte-identical to their pre-wave estimates.
 */
export const UNPINNED_FAMILIES = [
  'system-ui',
  '-apple-system',
  'sans-serif',
  'serif',
  'monospace',
  'Georgia',
  'Courier New',
  'Courier',
];

/**
 * The face each existing advance constant was calibrated against — pastoral's
 * preset, because the freeze made pastoral's faces universal. Every base
 * constant in the atoms is a measurement of one of these three.
 *
 * `accent` has no advance constant of its own today (the one class that reads
 * --theme-accent-family, `.doc-label` under witness-binder, is modelled by a
 * LINE height, not an advance). It is resolved anyway so that a future accent-
 * faced advance has a role to name rather than a reason to invent one.
 */
export const TYPE_ANCHORS = {
  display: 'Playfair Display',
  body:    'Libre Baskerville',
  mono:    'Share Tech Mono',
  accent:  'Share Tech Mono',
};

/** The theme token that supplies each role's face. */
const ROLE_TOKENS = {
  display: '--font-display',
  body:    '--font-body',
  mono:    '--font-mono',
  accent:  '--font-accent',
};

/** Every role at the anchor face: what an estimate with no theme context gets,
 *  and byte-identically what every estimate got before this file existed. */
export const DEFAULT_TYPE_METRICS = Object.freeze({
  display: 0, body: 0, mono: 0, accent: 0,
});

/** First family in a CSS font stack, unquoted. `'"IBM Plex Mono", monospace'`
 *  → `IBM Plex Mono`. */
export function firstFamily(stack) {
  const first = String(stack || '').split(',')[0].trim();
  return first.replace(/^["']|["']$/g, '');
}

/**
 * How much wider than the anchor one face is, in em, floored at zero.
 *
 * THE CLAMP IS A RULING, NOT A ROUNDING. A face narrower than the anchor could
 * in principle buy its book height back, and the arithmetic would even be
 * right. It is refused for two reasons: an unpinned stack's true width is
 * unknowable from here (see UNPINNED_FAMILIES), and reclaiming space from
 * narrow faces would move page counts in books this wave has no reason to
 * touch. The wave's job is to stop under-estimating wide faces; a floor at the
 * historical calibration means every book either estimates exactly as it did
 * before or estimates more conservatively, and never less.
 */
export function faceDelta(stack, role) {
  const anchor = FACE_ADVANCE_EM[TYPE_ANCHORS[role]];
  const face = FACE_ADVANCE_EM[firstFamily(stack)];
  if (!anchor || !face) return 0;
  return Math.max(0, face - anchor);
}

/**
 * Resolve the four role deltas from a theme's tokens.
 *
 * @param {object} tokens — the `tokens` half of resolveTheme()'s return value
 * @returns {{display:number, body:number, mono:number, accent:number}}
 */
export function resolveTypeMetrics(tokens) {
  const source = tokens || {};
  const metrics = {};
  for (const role of Object.keys(ROLE_TOKENS)) {
    metrics[role] = faceDelta(source[ROLE_TOKENS[role]], role);
  }
  return Object.freeze(metrics);
}

/**
 * Read the metrics out of an estimate context, defaulting to the anchor set.
 *
 * Atoms call this rather than reaching into the context themselves, so that an
 * estimate invoked WITHOUT context — the density solver's probes, a harness,
 * any future caller — degrades to exactly the pre-wave numbers instead of
 * throwing or, worse, silently reading `undefined` into the arithmetic.
 */
export function readTypeMetrics(context) {
  const metrics = context && context.typeMetrics;
  if (!metrics) return DEFAULT_TYPE_METRICS;
  return metrics;
}

/**
 * A measured advance, corrected for the face actually in use.
 *
 * @param {number} basePx      — the measured constant, at the anchor face
 * @param {number} fontSizePx  — the size that constant was measured at
 * @param {string} role        — display | body | mono | accent
 * @param {object} metrics     — from readTypeMetrics()
 */
export function advancePx(basePx, fontSizePx, role, metrics) {
  const delta = (metrics && metrics[role]) || 0;
  return delta ? basePx + delta * fontSizePx : basePx;
}

/**
 * The same correction for constants expressed as a FRACTION of font-size
 * (fragment-doc's BODY_CHAR_RATIO, oracle-table's CHAR_WIDTH_RATIO) rather than
 * as pixels. The delta is already an em fraction, so it simply adds.
 */
export function advanceRatio(baseRatio, role, metrics) {
  const delta = (metrics && metrics[role]) || 0;
  return delta ? baseRatio + delta : baseRatio;
}
