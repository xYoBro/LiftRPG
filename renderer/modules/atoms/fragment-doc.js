/**
 * fragment-doc.js — Found document / fragment atom
 *
 * Wraps document-primitives.js renderFoundDocument() and
 * document-models.js buildFragmentModel() into the atom interface.
 *
 * Data shape: a raw fragment object from the JSON
 */

import { registerAtom } from '../engine/atom-registry.js';
import { buildFragmentModel } from '../document-models.js';
import { renderFoundDocument } from '../document-primitives.js';
import { densityVariant } from '../engine/density-util.js';
import { wrappedLines } from '../utils.js';
import { advancePx, advanceRatio, readTypeMetrics } from '../type-metrics.js';

// ---------------------------------------------------------------------------
// Ladder mirror  ⇄  booklet.css fragment blocks
// ---------------------------------------------------------------------------
/**
 * CROSS-FILE CONTRACT — these numbers mirror the fragment rules in
 * renderer/booklet.css: the base `.fragment-doc` / `-type` / `-header` /
 * `-body` / `-body p` / `-sig` / `.manifest-pointer` block, the per-document
 * `--fragment-body-*` token setters, and the
 * `.fragment-block[data-density-variant="…"]` ladder. booklet.css carries the
 * reverse pointer. **Change them together or the estimate lies.**
 *
 * What this replaces: `CHROME_HEIGHT + paragraphs × PARAGRAPH_HEIGHT`, with a
 * flat 45px per paragraph regardless of how long the paragraph was, plus a
 * MANIFEST_HEIGHT of 16px that never moved with density and was 15px short of
 * the manifest's real 31px. It promised ~23% shrink and delivered -1.3/-5.5/-13%,
 * and it was wrong per-fragment by up to 3.05× (a one-line note charged the
 * same 45px as a nine-line one).
 *
 * The body's type size now comes from the `--fragment-body-*` tokens, so it is
 * (document-class size) × (density scale) rather than a single density value
 * stomping every document class — see the ladder note in booklet.css.
 *
 * Tier keys are exactly the variant names densityVariant() returns.
 */
const LADDER = {
  base: {
    docPadV:     15,     // .fragment-doc padding 7px … 8px
    corrPadV:    22,     // .fragment-doc.correspondence padding 11px …
    typeMB:      3,
    headerMB:    3,
    packetHeaderMB: 5,   // .fragment-block[data-shell-family="classified-packet"]
    paraMB:      2,
    sigPadTop:   5,
    manifestMT:  5,
    manifestPadV: 6,
    bodyScale:   1,
    leadScale:   1,
  },
  compact: {
    docPadV:     15,
    corrPadV:    22,
    typeMB:      3,
    headerMB:    3,
    packetHeaderMB: 5,
    paraMB:      2,
    sigPadTop:   5,
    manifestMT:  5,
    manifestPadV: 6,
    bodyScale:   0.97,
    leadScale:   1,
  },
  dense: {
    docPadV:     11,     // padding 5px 9px 6px
    corrPadV:    11,     // the density rule wins over the correspondence rule
    typeMB:      2,
    headerMB:    3,
    packetHeaderMB: 3,
    paraMB:      1,
    sigPadTop:   4,
    manifestMT:  3,
    manifestPadV: 4,
    bodyScale:   0.93,
    leadScale:   0.98,
  },
  tight: {
    docPadV:     9,      // padding 4px 8px 5px
    corrPadV:    9,
    typeMB:      2,
    headerMB:    3,
    packetHeaderMB: 3,
    paraMB:      1,
    sigPadTop:   3,
    manifestMT:  3,
    manifestPadV: 4,
    bodyScale:   0.90,
    leadScale:   0.96,
  },
};

/**
 * Per-document-class body type, straight off the `--fragment-body-size` /
 * `--fragment-body-leading` setters in booklet.css. Sizes are px (pt × 96/72);
 * leadings are the unitless multipliers. Anything not listed takes the base
 * `.fragment-doc-body` values.
 *
 * NOT modelled, deliberately: the page-level setters
 * (`.fragment-page[data-layout-variant]`, `.fragment-page[data-shell-family]`).
 * They live on the PAGE, and measureAtom() renders this atom into a bare
 * bounded page, so they are absent from the measurement the planner compares
 * against. They only ever make the body smaller, so ignoring them keeps the
 * estimate on the conservative side of the real page too.
 */
const DOC_BODY = {
  'field-note':     { fs: 8.60, leading: 1.34 },   // 6.45pt
  transcript:       { fs: 8.07, leading: 1.34 },   // 6.05pt
  inspection:       { fs: 7.93, leading: 1.24 },   // 5.95pt
  correspondence:   { fs: 8.47, leading: 1.28 },   // 6.35pt, looser leading
};
const DEFAULT_BODY = { fs: 8.47, leading: 1.31 };  // .fragment-doc-body

/** Document classes whose `.fragment-doc` carries a 2px border, not 1px, and
 *  the one that carries none. */
const THICK_BORDER_CLASSES = ['form', 'inspection', 'anomaly'];
const NO_BORDER_CLASSES = ['correspondence'];

// ── Chrome that does not move with density ─────────────────────────────────
/** .fragment-doc-type — 5.1pt at the container's leading. */
const TYPE_LINE_PX = 10.88;
const TYPE_CHAR_PX = 5.2;
const TYPE_FS_PX = 6.80;      // 5.1pt
/** .fragment-block[data-header-style="letterhead"] adds a rule under the slug. */
const LETTERHEAD_EXTRA_PX = 6;
/** .fragment-doc-continuation — 5pt mono, .16em tracking, 3px margin. */
const CONTINUATION_PX = 12.5;
const CONTINUATION_MB = 3;
/** .fragment-doc-header — mono 5.8pt × 1.25, one line per meta field. */
const HEADER_LINE_PX = 9.66;
const HEADER_CHAR_PX = 4.7;
const HEADER_FS_PX = 7.73;    // 5.8pt
/** .fragment-doc.memo adds a 6px pad + 1px rule under the meta box;
 *  classified-packet adds 5px + 1px. */
const MEMO_HEADER_RULE_PX = 6 + 1;
const PACKET_HEADER_RULE_PX = 5 + 1;
/**
 * `.fragment-block[data-shell-family="classified-packet"] .fragment-doc.form/
 * .report/.inspection::before` stamps an EVIDENCE ITEM / ANALYSIS RECORD /
 * INSPECTION SURFACE slug above the document: a 4.8pt mono line (10.24px) with
 * 4px pad, a 1px rule and a 5px margin. `.fragment-doc` is a flex column, so
 * the pseudo blockifies into a real flex item and its height is real — it is
 * exactly the 20px that this estimate was short on every packet form/report/
 * inspection before it was modelled. Deliberately NOT on the density ladder:
 * it is a single stamped line, and trimming its rule would buy 3px.
 */
const PACKET_STAMP_PX = 20.25;
const PACKET_STAMP_CLASSES = ['form', 'report', 'inspection'];

/**
 * Documents whose BODY classified-packet re-faces to mono (booklet.css
 * 6008–6010). The same three classes as PACKET_STAMP_CLASSES today, and a
 * separate list on purpose: they mirror two different CSS rules, either of
 * which can move without the other. Sharing one constant would make a change
 * to the stamp silently re-face the body.
 */
const PACKET_MONO_BODY_CLASSES = ['form', 'inspection', 'report'];

/**
 * SEAL BAND (schema 1.5.0 `fragment.seal`) — `.fragment-seal` and its two
 * children in booklet.css, which carries the reciprocal note.
 *
 * DENSITY-INVARIANT BY DESIGN, and it is a design choice rather than an
 * oversight: no `.fragment-block[data-density-variant] .fragment-seal` rule
 * exists, so the band renders identically at every tier and the model must
 * say so. A seal that shrank with page pressure would be the one piece of
 * chrome a player has to recognise weeks later, rendered smallest exactly on
 * the busiest page.
 *
 * CONTENT-WRAPPED, not a flat constant. `keyHint` and `unlockCondition` are
 * free prose; charging the band one fixed height would under-read every seal
 * whose key hint runs past a line and clip it inside `.fragment-doc`'s
 * `overflow:hidden`. Flat means flat across DENSITY, not across content.
 *
 *   SEAL_CHROME_PX  padding-block 6 + borders 3 (hair width worst case 1.5,
 *                   as the header row does) + margin-bottom 4 + the `Sealed`
 *                   stamp's line box 8.7 + its 2px margin.
 *   SEAL_LINE_PX    `.fragment-seal-line` 5.2pt × 1.35.
 *   SEAL_CHAR_PX    the same 5.2pt mono advance the manifest chip is fitted
 *                   at — same family, same size, so the same number.
 *   SEAL_FRAME_X    padding 12 + borders 2.5, the manifest chip's inset.
 *   SEAL_LABEL_CHARS the inline `Key` / `Opens` label plus its gap, charged
 *                   into the line it shares.
 */
const SEAL_CHROME_PX = 23.7;
const SEAL_LINE_PX = 9.36;
const SEAL_CHAR_PX = 4.57;
const SEAL_FS_PX = 6.93;      // 5.2pt
const SEAL_FRAME_X = 12 + 2.5;
const SEAL_LABEL_CHARS = 7;

/**
 * FILED CITATION (schema 1.5.0 `fragment.citeRef`) — `.fragment-cite` in
 * booklet.css, one line above the signature.
 *
 * The `.cite-ref` token inside it costs NO height term, and that is a property
 * of the CSS rather than an approximation: the token is a true inline box, and
 * a non-replaced inline's vertical padding and border do not enter the line
 * box. Only its characters count, which is why `citedAs` is measured against
 * this line's own advance width. See the reciprocal note on `.cite-ref` in
 * booklet.css and in document-primitives.js renderCiteRef().
 */
const CITE_LINE_PX = 9.72;   // .fragment-cite 5.4pt × 1.35
const CITE_CHAR_PX = 4.75;   // 5.4pt mono advance
const CITE_FS_PX = 7.20;     // 5.4pt
const CITE_MT = 4;

/** .fragment-doc-sig — mono 5.7pt, 1px rule above. */
const SIG_LINE_PX = 12.14;
const SIG_CHAR_PX = 4.6;
const SIG_FS_PX = 7.60;      // 5.7pt
const SIG_BORDER_PX = 1;
/** .manifest-pointer — 5.2pt mono × 1.35, dashed frame + 1.5px filing rule. */
const MANIFEST_LINE_PX = 9.36;
const MANIFEST_CHAR_PX = 4.57;
const MANIFEST_FS_PX = 6.93; // 5.2pt
const MANIFEST_BORDER_V = 2;
const MANIFEST_FRAME_X = 12 + 2.5;

/**
 * Width the document is modelled against — the narrowest live column the
 * archetype ladder produces (5.5in − 2 × the 0.5in maximum `--page-margin` in
 * theme.js). fragment-doc has no `footprint.cols`, so it always renders at the
 * full column; the only question is which archetype's column, and the narrow
 * one is the conservative choice for wrapped prose. See the same note in
 * atoms/oracle-table.js.
 */
const DOC_WIDTH_PX = 432;
/** .fragment-doc horizontal padding + border, subtracted to get the text column. */
const DOC_INSET_X = 24;

/**
 * Average advance as a fraction of font-size for the body faces. Calibrated
 * over 2,588 rendered paragraphs across both families the corpus themes use
 * (Libre Baskerville and Share Tech Mono needed 0.564 and 0.560 respectively
 * for zero under-estimates); 0.58 clears both with ~0.1 line of slack.
 */
const BODY_CHAR_RATIO = 0.58;

/**
 * WHICH TYPEFACE EACH OF THOSE ADVANCES IS ABOUT.
 *
 * Every constant above was measured against pastoral's faces, because the alias
 * freeze (D116(b)) made pastoral's faces universal. Un-frozen, a fragment can
 * be set in any of the four vendored families, and a per-character advance is a
 * measurement OF a family — so each constant needs the OTHER half of its
 * measurement recorded: the size it was taken at (the `*_FS_PX` above) and the
 * theme role whose family the CSS rule resolves to. type-metrics.js supplies
 * the per-face difference; this function supplies the role.
 *
 * It is not one role per constant, because it is not one rule per class. Three
 * things move a fragment's face, and all three are readable from the model:
 *
 *   `[data-primary-typeface="mono"|"serif"]` on `.fragment-block` (booklet.css
 *   5938–5946) re-faces the BODY, HEADER and SIG together. The selector matches
 *   those two exact strings; `designSpec.primaryTypeface` is free prose and the
 *   corpus carries 60+ other values ('typewriter', 'courier', 'mixed', 'arial
 *   standard'), every one of which matches neither and leaves the base rule
 *   standing. This mirrors the selector, so it compares exactly.
 *
 *   `.fragment-doc.field-note` / `.transcript` set their body in mono (6215,
 *   6227) — declared LATER than the primary-typeface block at equal
 *   specificity, so they win it.
 *
 *   classified-packet sets form/inspection/report bodies in mono (6008–6010) at
 *   higher specificity, so it wins everything. That rule hangs off
 *   `.fragment-block[data-shell-family]` — the atom's OWN root, which
 *   renderFoundDocument() stamps — so unlike the `.fragment-page[…]` setters
 *   this file deliberately ignores, it IS present in the measurement harness
 *   and must be modelled.
 *
 * The chrome that no rule re-faces (type slug, seal lines, citation, manifest)
 * is mono, flatly.
 */
function facesFor(model, kind, isPacket, metrics) {
  const typeface = String((model.designSpec || {}).primaryTypeface || '').trim();
  const chromeRole = typeface === 'serif' ? 'body' : 'mono';

  let bodyRole;
  if (isPacket && PACKET_MONO_BODY_CLASSES.includes(kind)) bodyRole = 'mono';
  else if (kind === 'field-note' || kind === 'transcript') bodyRole = 'mono';
  else if (typeface === 'mono') bodyRole = 'mono';
  else bodyRole = 'body';

  return {
    type:      advancePx(TYPE_CHAR_PX, TYPE_FS_PX, 'mono', metrics),
    header:    advancePx(HEADER_CHAR_PX, HEADER_FS_PX, chromeRole, metrics),
    seal:      advancePx(SEAL_CHAR_PX, SEAL_FS_PX, 'mono', metrics),
    cite:      advancePx(CITE_CHAR_PX, CITE_FS_PX, 'mono', metrics),
    sig:       advancePx(SIG_CHAR_PX, SIG_FS_PX, chromeRole, metrics),
    manifest:  advancePx(MANIFEST_CHAR_PX, MANIFEST_FS_PX, 'mono', metrics),
    bodyRatio: advanceRatio(BODY_CHAR_RATIO, bodyRole, metrics),
  };
}

function ladderFor(density) {
  return LADDER[densityVariant(density) || 'base'];
}

function bodyLines(chars, widthPx, fontSizePx, bodyRatio) {
  if (!chars) return 1;
  const perLine = Math.max(1, Math.floor(widthPx / (bodyRatio * fontSizePx)));
  return Math.max(1, Math.ceil(chars / perLine));
}

/** The last word of `documentClass` — the CSS class the doc actually carries. */
function docKind(model) {
  return String(model.documentClass || '').trim().toLowerCase();
}

/** Modelled block height for one fragment at one ladder tier. */
function fragmentHeightAt(model, tier, shellFamily, metrics) {
  const kind = docKind(model);
  const isPacket = shellFamily === 'classified-packet';
  const adv = facesFor(model, kind, isPacket, metrics);

  const borderV = NO_BORDER_CLASSES.includes(kind) ? 0
    : (THICK_BORDER_CLASSES.includes(kind) ? 4 : 2);
  const padV = NO_BORDER_CLASSES.includes(kind) ? tier.corrPadV : tier.docPadV;

  let height = borderV + padV;
  const textWidth = DOC_WIDTH_PX - DOC_INSET_X;

  if (isPacket && PACKET_STAMP_CLASSES.includes(kind)) height += PACKET_STAMP_PX;

  // Seal band — first real child, above the type slug. Zero when the fragment
  // carries no seal, which is every fragment in the corpus: the dormancy
  // guarantee is that a seal-less document estimates byte-identically to the
  // pre-Wave-4b model, not merely close to it.
  const seal = model.seal;
  if (seal) {
    height += SEAL_CHROME_PX;
    const sealWidth = textWidth - SEAL_FRAME_X;
    if (seal.keyHint) {
      height += wrappedLines(seal.keyHint.length + SEAL_LABEL_CHARS, sealWidth, adv.seal) * SEAL_LINE_PX;
    }
    if (seal.unlockCondition) {
      height += wrappedLines(seal.unlockCondition.length + SEAL_LABEL_CHARS, sealWidth, adv.seal) * SEAL_LINE_PX;
    }
  }

  // Document-type slug
  height += wrappedLines(String(model.documentType || 'Document').length, textWidth, adv.type)
    * TYPE_LINE_PX + tier.typeMB;
  if ((model.designSpec || {}).headerStyle === 'letterhead') height += LETTERHEAD_EXTRA_PX;

  if (model.continuationLabel) height += CONTINUATION_PX + CONTINUATION_MB;

  // Meta box — one line per present field (buildMetaLines in document-primitives)
  const metaFields = [model.title, model.author, model.recipient, model.date].filter(Boolean);
  if (metaFields.length) {
    height += metaFields.reduce((sum, field) =>
      sum + wrappedLines(String(field).length + 6, textWidth, adv.header) * HEADER_LINE_PX, 0);
    if (kind === 'memo') height += MEMO_HEADER_RULE_PX;
    else if (isPacket) height += PACKET_HEADER_RULE_PX;
    height += isPacket ? tier.packetHeaderMB : tier.headerMB;
  }

  // Body — the only prose here, and the only thing the type ladder scales.
  const face = DOC_BODY[kind] || DEFAULT_BODY;
  const fontSize = face.fs * tier.bodyScale;
  const lineHeight = fontSize * face.leading * tier.leadScale;
  const paragraphs = Array.isArray(model.bodyParagraphs) && model.bodyParagraphs.length
    ? model.bodyParagraphs
    : [''];
  height += paragraphs.reduce((sum, para) =>
    sum + bodyLines(String(para || '').length, textWidth, fontSize, adv.bodyRatio) * lineHeight + tier.paraMB, 0);

  // Posted manifest (schema 1.5.0). The old model charged this a flat 16px and
  // never moved it with density; it is a framed two-line chip that measures 31px
  // with its margin at base and 27px at tight.
  const manifest = model.manifestPointer;
  if (manifest && manifest.postedAs) {
    height += tier.manifestMT + tier.manifestPadV + MANIFEST_BORDER_V
      + wrappedLines(String(manifest.postedAs).length, textWidth - MANIFEST_FRAME_X, adv.manifest)
        * MANIFEST_LINE_PX;
  }

  // Filed citation, one line above the signature.
  const cite = model.citeRef;
  if (cite && cite.citedAs) {
    height += CITE_MT
      + wrappedLines(cite.citedAs.length, textWidth, adv.cite) * CITE_LINE_PX;
  }

  height += tier.sigPadTop + SIG_BORDER_PX
    + wrappedLines(String(model.purpose || 'END FILE').length, textWidth, adv.sig) * SIG_LINE_PX;

  // Ceil, not round: the constants are fractional pt→px conversions.
  return Math.ceil(height);
}

registerAtom('fragment-doc', {
  defaultSizeHint: 'flex',
  canShare: true,
  pageAffinity: 'either',

  /**
   * minHeight is the ladder's floor (tight); preferredHeight is the height at
   * the density asked for. The gap between them is this document's real range,
   * and it is now content-shaped rather than a flat 23%: a long memo with a
   * manifest and a wrapped signature gives back real pixels (frame, slug gap,
   * paragraph gutters, and a 10% type step), while a two-line field note is
   * nearly all frame and gives back very little — which is the truth.
   */
  estimate(data, density, context) {
    const metrics = readTypeMetrics(context);
    const model = buildFragmentModel(data || {});
    // Read the shell off the model, not the raw data — buildFragmentModel is
    // what renderFoundDocument() stamps `data-shell-family` from, so this is
    // the same value the CSS will match on.
    const shellFamily = String((model.artifactIdentity || {}).shellFamily || '').toLowerCase();
    return {
      minHeight:       fragmentHeightAt(model, LADDER.tight, shellFamily, metrics),
      preferredHeight: fragmentHeightAt(model, ladderFor(density), shellFamily, metrics),
    };
  },

  render(atom, density) {
    const data = atom.data || {};
    const fragmentModel = buildFragmentModel(data);
    const el = renderFoundDocument(fragmentModel);

    const variant = densityVariant(density);
    if (variant) el.setAttribute('data-density-variant', variant);

    return el;
  },
});

export default 'fragment-doc';
