/**
 * rules-block.js — Rules spread atom (left or right side)
 *
 * Wraps booklet-primitives.js renderRulesLeftPage() and renderSealedPage()
 * plus booklet-models.js model builders into the atom interface.
 *
 * Data shape: { side, rules, meta }
 *   - side: 'left' or 'right'
 *   - For 'left': the full booklet data object (for buildRulesLeftPageModelWithVariant)
 *   - For 'right': the full booklet data object (for buildSealedPageModel)
 *
 * These are full-page atoms. render() returns the full page element.
 */

import { registerAtom } from '../engine/atom-registry.js';
import { PAGE_BUDGET } from '../engine/page-spec.js';
import { MAX_DENSITY } from '../engine/density-solver.js';
import { make } from '../dom.js';
import { advanceRatio, readTypeMetrics } from '../type-metrics.js';
import {
  buildRulesLeftPageModelWithVariant,
  buildSealedPageModel,
} from '../booklet-models.js';
import {
  renderRulesLeftPage,
  renderSealedPage,
} from '../booklet-primitives.js';

const FULL_PAGE_HEIGHT = PAGE_BUDGET.heightPx;

// ---------------------------------------------------------------------------
// Geometry  ⇄  booklet.css `.rules-left` / `.rules-header` / `.rules-title` /
//              `.rules-orientation*` / `.rules-body` / `.rules-section` blocks
// ---------------------------------------------------------------------------
/**
 * THE ESTIMATE THIS FILE USED TO NOT HAVE (DR-37).
 *
 * `estimate()` returned `PAGE_BUDGET.heightPx` for any content whatsoever. That
 * one constant disabled every mechanism the engine has for an over-full page,
 * because all of them are arithmetic ON the estimate:
 *
 *   - `atomShrinkPotential()` is `estimate(d).preferredHeight −
 *     estimate(1.0).minHeight`. Constant in, ZERO out — so the solver believed
 *     this atom could not give back a pixel, and never raised its density even
 *     though `.rules-left[data-layout-variant]` is a real, working ladder.
 *   - `canShare:false` and a page of one make `findSplitCandidateId()` return
 *     null, so Strategy 3 cannot fire either.
 *   - Strategies 1, 2 and 3 all declining leaves Strategy 4: flag unresolved.
 *     `.rules-left` is `overflow:hidden`, so the page then PRINTS CLIPPED.
 *
 * Measured on the delivered book (evals/proving-run, witness-binder, six
 * sections + re-entry + roll support): frame 739.22px, content 788px — 49px of
 * the procedure cut off the bottom of the page whose whole job is teaching the
 * game. The diagnostic fired (`unresolvedOverflow: rules-left +49px`) and
 * nothing could act on it.
 *
 * CROSS-FILE CONTRACT — every number below mirrors a `.rules-*` rule in
 * renderer/booklet.css, which carries the reverse pointer. Phase-1 estimation
 * has no DOM and cannot resolve a custom property, so the numbers live twice.
 * **Change them together or the estimate lies** (D71).
 *
 * The two custom properties this page reads — `--theme-body-size` and
 * `--theme-heading-lg` — are set by NO preset in theme.js, so their CSS
 * fallbacks (8pt / 16pt) are the printed truth and are modelled as such. A
 * preset that starts setting either owes this table the same visit.
 */
const PT = 96 / 72;

/** The inherited line-height on the page frame — `.rules-header`'s measured
 *  14.933px at 7pt fixes it at 1.6. Used for every rung that sets none. */
const BASE_LINE_HEIGHT = 1.6;

/**
 * The content column, measured. `PAGE_BUDGET.widthPx` (470) is the page's
 * budget; the rendered `.rules-left` content box is narrower by the page
 * boundary's own inset plus this element's side padding, and the wrap
 * arithmetic must use what the text actually gets. 443.22px, measured on the
 * delivered book at the `dense` rung (side padding 4px); the looser rungs pad
 * 5–6px, which the per-rung `padX` below carries.
 */
const FRAME_INNER_WIDTH_PX = 451.22;

/**
 * `.rules-header` — 7pt line box at the inherited leading, + padding-bottom 6
 * + the frame rule + margin-bottom 14. The rule is `--theme-frame-width`
 * (1.5px default; the witness-binder shell renders 2px), so the worst case is
 * carried: over-reserving one pixel of chrome is the safe direction.
 */
const HEADER_PX = Math.round((7 * PT * BASE_LINE_HEIGHT + 6 + 2 + 14) * 100) / 100;

/** `.rules-body h3` — 7pt at the body's own leading, plus its margins. */
const H3_FONT_PT = 7;

/**
 * THE LADDER  ⇄  `.rules-left[data-layout-variant="…"]` in booklet.css.
 *
 * `standard` and `compact` are modelled but UNREACHABLE in production: every
 * placement is created at `ESTIMATE_DENSITY = 0.6` (page-planner.js) and the
 * solver only ever RAISES density, so `dense` is where every book starts. They
 * are kept because the ladder is the CSS's shape and an estimate that modelled
 * only the rungs it expects to see would be wrong the day that changes.
 *
 * `packed` is the rung DR-37 adds, and it is the reason the shrink strategy can
 * work at all: without a rung below the starting rung, `estimate(0.6)` and
 * `estimate(1.0)` are the same number and the shrink potential is zero however
 * honest the arithmetic is.
 */
/**
 * TWO TABLES, NOT ONE WITH PACKET COLUMNS, and the reason is CSS cascade order
 * rather than taste. The packet's own body/section/h3 rules and the
 * layout-variant rules have IDENTICAL specificity (0,3,0), so the later rule in
 * the file wins — which makes the packet's `6.8pt` body lose to `compact`'s
 * `7.6pt` and its `margin:0 0 3px` h3 lose to `dense`'s `margin:8px 0 3px`. A
 * single table with `packetBodyPt` columns encodes the wrong winner silently.
 * Each row below is the RESOLVED value for that (rung, shell) pair.
 */
const LADDER = {
  standard: { padX: 6, titlePt: 16, titleLh: 1.15, titleMb: 10, bodyPt: 8, bodyLh: BASE_LINE_HEIGHT, paraMb: 6, h3Mt: 10, h3Mb: 4, sectionMb: 8 },
  compact:  { padX: 5, titlePt: 16, titleLh: 1.15, titleMb: 10, bodyPt: 7.6, bodyLh: 1.56, paraMb: 6, h3Mt: 10, h3Mb: 4, sectionMb: 8 },
  dense:    { padX: 4, titlePt: 14.5, titleLh: 1.15, titleMb: 10, bodyPt: 7.2, bodyLh: 1.48, paraMb: 6, h3Mt: 8, h3Mb: 3, sectionMb: 8 },
  packed:   { padX: 4, titlePt: 12.5, titleLh: 1.15, titleMb: 6, bodyPt: 6.6, bodyLh: 1.36, paraMb: 4, h3Mt: 6, h3Mb: 2, sectionMb: 5 },
};

/** The same rungs on a `classified-packet`, whose body is `columns:2`. */
const PACKET_LADDER = {
  standard: { padX: 6, titlePt: 16, titleLh: 1.15, titleMb: 10, bodyPt: 6.8, bodyLh: 1.36, paraMb: 6, h3Mt: 0, h3Mb: 3, sectionMb: 7 },
  // compact's body was 7.6/1.56 — the variant rule BEATING the packet's own
  // 6.8pt at equal specificity, a non-monotone render the round-close battery
  // caught (Charter inv. 4: The-Hinge estimate ROSE 566.7→707.6px at the 0.3
  // boundary). booklet.css now carries a packet-scoped compact rule at these
  // values — the resolved truth, between standard and dense on every axis.
  compact:  { padX: 5, titlePt: 16, titleLh: 1.15, titleMb: 10, bodyPt: 6.6, bodyLh: 1.32, paraMb: 6, h3Mt: 0, h3Mb: 3, sectionMb: 7 },
  dense:    { padX: 4, titlePt: 12.8, titleLh: 1.15, titleMb: 5, bodyPt: 6.3, bodyLh: 1.28, paraMb: 6, h3Mt: 8, h3Mb: 3, sectionMb: 7 },
  packed:   { padX: 4, titlePt: 11.6, titleLh: 1.15, titleMb: 4, bodyPt: 5.9, bodyLh: 1.22, paraMb: 4, h3Mt: 6, h3Mb: 2, sectionMb: 4 },
};

/** The columns the packet's body flows into, and the gap between them. */
const PACKET_COLUMNS = 2;
const PACKET_COLUMN_GAP_PX = 16;

function tierFor(density, isPacket) {
  const name = rulesLayoutVariant(density);
  return (isPacket ? PACKET_LADDER : LADDER)[name] || (isPacket ? PACKET_LADDER : LADDER).dense;
}

/**
 * density → layout variant. ONE HOME: `estimate()` and `render()` both call it,
 * so the rung the estimate priced is provably the rung the page draws. The
 * ternary this replaces lived in `render()` alone, which is how the estimate
 * came to model no rung at all.
 *
 * @param {number} density
 * @returns {'standard'|'compact'|'dense'|'packed'}
 */
export function rulesLayoutVariant(density) {
  const d = Number.isFinite(density) ? density : 0;
  if (d >= 0.85) return 'packed';
  if (d >= 0.6) return 'dense';
  if (d >= 0.3) return 'compact';
  return 'standard';
}

/** The body face's per-character advance as a fraction of font size.
 *  Fitted against the delivered book's six rendered sections at the `dense`
 *  rung (443px column, 9.6px Libre Baskerville): the measured wrap is 72–79
 *  characters a line, and 0.60 reproduces every one of the six line counts,
 *  one of them one line long — the conservative direction for a clip gate. */
const BODY_CHAR_RATIO = 0.60;

/** `.rules-orientation-*` — the establishment block (D195). Situation is
 *  `--theme-body-size` (8pt fallback) at 1.5 with 8px below it; the cast label
 *  is 5.2pt + 3px; a cast row is the tallest of its three cells (6.4pt) plus
 *  the grid's 2px row gap. The block itself carries margin 10 + padding 8 +
 *  a 1px rule. */
const ORIENT_SITUATION_PT = 8;
const ORIENT_SITUATION_LH = 1.5;
const ORIENT_SITUATION_MB = 8;
const ORIENT_LABEL_PX = 5.2 * PT * BASE_LINE_HEIGHT + 3;
const ORIENT_ROW_PT = 6.4;
const ORIENT_ROW_GAP = 2;
const ORIENT_BLOCK_CHROME_PX = 10 + 8 + 1;

/** `.rules-sidecar` — the classified packet's handling callout. Two fixed
 *  house strings plus the support note, all at 4.9pt/1.24, under a doc-label,
 *  inside 4px padding + a rule, with 8px below. A constant: the strings are
 *  house chrome, not authored content. */
const PACKET_SIDECAR_PX = 62;

function lineCount(chars, columnPx, fontSizePx, ratio) {
  if (!chars) return 0;
  const perLine = Math.max(1, Math.floor(columnPx / (ratio * fontSizePx)));
  return Math.max(1, Math.ceil(chars / perLine));
}

/**
 * THE PAGE'S CONTENT, as an ordered list of blocks — the one place that knows
 * what `renderRulesLeftPage()` puts on the page and in what order.
 *
 * Exported because the adapter's chunker slices THIS list (the
 * LEDGER_ROWS_PER_PAGE idiom): a chunker with its own idea of what the page
 * holds would be a second, worse renderer.
 *
 * Every block is `{ heading, body, chars }`. The body text rides along because
 * the RENDERER reads the same list on a chunked page: the estimate, the chunker
 * and the printed sections are then three readers of one projection rather than
 * three ideas about what the page holds.
 *
 * @param {object} bookletData — the full booklet JSON
 * @returns {Array<{heading: string, body: string, chars: number}>}
 */
export function rulesLeftBlocks(bookletData) {
  const model = buildRulesLeftPageModelWithVariant(bookletData || {}, 'dense');
  const isPacket = (model.artifactIdentity || {}).shellFamily === 'classified-packet';
  const push = (list, heading, body) => {
    const text = String(body || '');
    list.push({ heading: String(heading), body: text, chars: text.length });
    return list;
  };
  const blocks = (model.sections || []).reduce(
    (list, section) => push(list, section.heading || 'Procedure', section.body || section.text || ''),
    [],
  );
  if (model.reEntryText) push(blocks, 'Re-entry Procedure', model.reEntryText);
  // The packet routes its support note into the sidecar instead of the body —
  // the same branch renderRulesLeftPage() takes, so the two agree by reading
  // one condition rather than by both being remembered.
  if (model.supportNote && !isPacket) push(blocks, 'Roll Support', model.supportNote);
  return blocks;
}

/**
 * Everything above the first body block: header, title, and — when the book
 * carries one — the establishment block. Density-aware.
 *
 * A CONTINUATION page carries the header and nothing else: no title, no
 * establishing shot, no packet sidecar. Those are the page's opening ceremony
 * and printing them twice would tell the reader the book restarted. The
 * arithmetic and the renderer read the same flag.
 */
function rulesChromeHeightPx(bookletData, model, isPacket, tier, metrics, continuation) {
  const columnPx = FRAME_INNER_WIDTH_PX - 2 * tier.padX;

  let height = HEADER_PX;
  if (continuation) return height;

  const titleFs = tier.titlePt * PT;
  const titleLines = lineCount(String(model.title || '').length, columnPx,
    titleFs, advanceRatio(BODY_CHAR_RATIO, 'display', metrics));
  height += Math.max(1, titleLines) * titleFs * tier.titleLh + tier.titleMb;

  if (isPacket) height += PACKET_SIDECAR_PX;

  const orientation = ((bookletData || {}).rulesSpread || {}).orientation;
  const situation = String((orientation && orientation.situation) || '').trim();
  const cast = (orientation && Array.isArray(orientation.cast) ? orientation.cast : [])
    .filter((entry) => String((entry && entry.name) || '').trim());
  if (situation || cast.length) {
    height += ORIENT_BLOCK_CHROME_PX;
    if (situation) {
      const fs = ORIENT_SITUATION_PT * PT;
      height += lineCount(situation.length, columnPx, fs,
        advanceRatio(BODY_CHAR_RATIO, 'body', metrics)) * fs * ORIENT_SITUATION_LH
        + ORIENT_SITUATION_MB;
    }
    if (cast.length) {
      height += ORIENT_LABEL_PX
        + cast.length * (ORIENT_ROW_PT * PT * BASE_LINE_HEIGHT + ORIENT_ROW_GAP);
    }
  }
  return height;
}

/** One body block's height at one rung. The packet's two-column body halves
 *  the flow, which is why the column width and the divisor both branch. */
function blockHeightPx(block, tier, isPacket, metrics) {
  const fs = tier.bodyPt * PT;
  const full = FRAME_INNER_WIDTH_PX - 2 * tier.padX;
  const columnPx = isPacket
    ? (full - PACKET_COLUMN_GAP_PX) / PACKET_COLUMNS
    : full;
  const ratio = advanceRatio(BODY_CHAR_RATIO, 'body', metrics);

  let height = H3_FONT_PT * PT * tier.bodyLh + tier.h3Mt + tier.h3Mb;
  // splitParagraphs() splits on newlines; a block with none is one paragraph.
  height += lineCount(block.chars, columnPx, fs, ratio) * fs * tier.bodyLh + tier.paraMb;
  height += tier.sectionMb;
  // The packet's body flows into two columns, so the block's contribution to
  // the page's HEIGHT is its share of the flow, not its own length.
  return isPacket ? height / PACKET_COLUMNS : height;
}

/**
 * The modelled height of a rules-left page carrying `blocks`, at `density`.
 *
 * UNCLAMPED, deliberately, and it is the difference between this atom being
 * managed and being clipped: a height clamped to `PAGE_BUDGET.heightPx` makes
 * `estimate(0.6)` and `estimate(1.0)` identical the moment BOTH overflow, and
 * a zero shrink potential is exactly the state DR-37 is about. The planner
 * measures the real page for overflow regardless, so nothing downstream needs
 * this number to be a lie about fitting.
 *
 * @param {object} bookletData
 * @param {Array} blocks — a slice of rulesLeftBlocks(), or all of them
 * @param {number} density
 * @param {object|null} [context] — the planner's estimate context
 * @param {boolean} [continuation] — this page is a chunk after the first
 * @returns {number} px
 */
export function rulesLeftHeightPx(bookletData, blocks, density, context = null, continuation = false) {
  const metrics = readTypeMetrics(context);
  const model = buildRulesLeftPageModelWithVariant(bookletData || {}, 'dense');
  const isPacket = (model.artifactIdentity || {}).shellFamily === 'classified-packet';
  const tier = tierFor(density, isPacket);

  let height = rulesChromeHeightPx(bookletData, model, isPacket, tier, metrics, continuation);
  (blocks || []).forEach((block) => {
    height += blockHeightPx(block, tier, isPacket, metrics);
  });
  return Math.round(height * 100) / 100;
}

/**
 * THE SPLIT PATH (DR-37's second half) — the rules page's own chunker.
 *
 * The adapter calls this and emits one `rules-block` per returned slice, the
 * way `LEDGER_ROWS_PER_PAGE` chunks a long movement roster. It exists because
 * the packed rung is a floor, not an answer: measured on the delivered book
 * with the establishment surface at ITS OWN CONTRACT CAPS (a 700-character
 * situation and eight cast rows — the numbers this file's header quotes from
 * the prompt), the page renders 939.5px of ink into a 737.2px frame. 208px of
 * procedure and cast cut off, at every rung, with nothing left to shrink.
 *
 * CHUNKED AT THE DENSEST RUNG (density 1.0 ⇒ `packed`), and that ordering is
 * the whole design: shrinking is cheaper than a page, so the chunker only
 * splits what shrinking provably cannot save. A book that fits at `packed`
 * comes back as ONE slice and the adapter emits exactly the atom it always
 * did — which is what keeps the corpus's page plans byte-identical.
 *
 * The FIRST slice pays the chrome (title, establishing shot, packet sidecar);
 * later slices pay only the header, so the fit test switches at the boundary.
 *
 * @param {object} bookletData
 * @returns {Array<Array<{heading: string, body: string, chars: number}>>}
 */
export function chunkRulesLeftBlocks(bookletData) {
  const all = rulesLeftBlocks(bookletData);
  if (all.length <= 1) return [all];

  const chunks = [];
  let rest = all;
  while (rest.length) {
    const continuation = chunks.length > 0;
    let take = rest.length;
    // A single block too tall for a page still goes on a page of its own: it
    // then overflows and SAYS so through the solver, which is strictly better
    // than a chunker that emits an empty page and loops.
    while (take > 1
      && rulesLeftHeightPx(bookletData, rest.slice(0, take), MAX_DENSITY, null, continuation)
        > FULL_PAGE_HEIGHT) {
      take -= 1;
    }
    chunks.push(rest.slice(0, take));
    rest = rest.slice(take);
  }
  return chunks;
}

/**
 * THE ESTABLISHMENT SURFACE (W1, 2026-08-18) — `rulesSpread.orientation`.
 *
 * The author's verdict on the first delivered book was that he did not know
 * what was being said. Half of that is prose; the other half is that the book
 * never established anything — documents performed at a reader who had not been
 * told where he was or who anyone was, and the rules page taught procedure
 * against a fiction nobody had handed him.
 *
 * `situation` is the plain-words paragraph; `cast` is the named-persons table.
 * Both print ABOVE the procedure, because that is the order a stranger needs
 * them in: who and what, then how.
 *
 * BUILT HERE RATHER THAN IN booklet-primitives.js, and the seam is deliberate:
 * `renderRulesLeftPage()` renders a MODEL, and the orientation is read straight
 * off the booklet, so threading it through the model builder would add a field
 * to two files to carry a block that no other caller wants. The insertion point
 * is named (`.rules-body`), not positional.
 *
 * ESTIMATE-NEUTRAL BY CONSTRUCTION: this atom is `full-page` / `canShare:false`
 * and estimates PAGE_BUDGET.heightPx whatever it contains, so nothing here can
 * detune the solver. What it CAN do is overflow a page that is already dense —
 * `.rules-left` is `overflow:hidden` — which is why the prompt caps the
 * situation at 700 characters and the cast at eight rows, and why the CSS keeps
 * the table at instrument size.
 */
function renderOrientation(orientation) {
  const situation = String((orientation && orientation.situation) || '').trim();
  const cast = (orientation && Array.isArray(orientation.cast)) ? orientation.cast : [];
  const rows = cast
    .map((entry) => ({
      name: String((entry && entry.name) || '').trim(),
      role: String((entry && entry.role) || '').trim(),
      note: String((entry && entry.note) || '').trim(),
    }))
    // A row with no name is not a half-row, it is a typo that reads as a
    // record — the normalizeManifestPointer rule, applied here.
    .filter((entry) => entry.name);
  if (!situation && !rows.length) return null;

  const block = make('section', 'rules-orientation');
  if (situation) {
    block.appendChild(make('p', 'rules-orientation-situation', situation));
  }
  if (rows.length) {
    const table = make('div', 'rules-orientation-cast');
    // The label is chrome, not fiction: it names what the table IS. The shell's
    // own dress reaches it through the theme tokens on the page, never through
    // a string chosen here.
    table.appendChild(make('div', 'rules-orientation-label', 'Persons named in this file'));
    rows.forEach((entry) => {
      const row = make('div', 'rules-orientation-row');
      row.appendChild(make('span', 'rules-orientation-name', entry.name));
      row.appendChild(make('span', 'rules-orientation-role', entry.role));
      // THE THIRD CELL IS ALWAYS EMITTED, even empty. The rows are
      // `display:contents` over a three-column grid, so a row that contributed
      // two cells would let the NEXT row's name fall into the third column and
      // every name below it would step sideways — a silent misalignment on the
      // one page whose whole job is being scannable.
      row.appendChild(make('span', 'rules-orientation-note', entry.note));
      table.appendChild(row);
    });
    block.appendChild(table);
  }
  return block;
}

registerAtom('rules-block', {
  defaultSizeHint: 'full-page',
  canShare: false,
  pageAffinity: 'either',

  /**
   * The sealed right page is chrome only — a title, a lock, an instruction and
   * a URL, all house strings — so it keeps the full-page constant it always
   * had. The LEFT page is the one that carries authored content, and it is the
   * one DR-37 is about.
   */
  estimate(data, density, context = null) {
    const payload = data || {};
    if ((payload.side || 'left') !== 'left') {
      return { minHeight: FULL_PAGE_HEIGHT, preferredHeight: FULL_PAGE_HEIGHT };
    }
    const bookletData = payload.data || payload;
    // The adapter's chunker stamps the slice this page carries. A page with no
    // stamp is the whole page — which is what every pre-DR-37 caller means, and
    // what the density solver's context-free probes mean too.
    const blocks = Array.isArray(payload.blocks)
      ? payload.blocks
      : rulesLeftBlocks(bookletData);
    const height = rulesLeftHeightPx(
      bookletData, blocks, density, context, !!payload.continuation);
    // minHeight === preferredHeight at a given rung: nothing on this page
    // shrinks WITHIN a rung, so reporting a range would hand the solver shrink
    // potential the CSS will never deliver (the ledger's rule). The potential
    // the solver does get comes from the RUNGS — estimate(0.6) vs estimate(1.0).
    return { minHeight: height, preferredHeight: height };
  },

  render(atom, density) {
    const data = atom.data || {};
    const side = data.side || 'left';
    const d = density ?? 0;

    // adapter wraps as { side, data: <bookletData> }
    const bookletData = data.data || data;

    // ONE HOME for density → rung (see rulesLayoutVariant): the estimate prices
    // the rung this line selects, so the two cannot name different ones.
    const layoutVariant = rulesLayoutVariant(d);

    if (side === 'right') {
      const sealedModel = buildSealedPageModel(bookletData, layoutVariant);
      return renderSealedPage(sealedModel);
    }

    const rulesModel = buildRulesLeftPageModelWithVariant(bookletData, layoutVariant);

    // THE CHUNKED PAGE (DR-37). The adapter stamps the slice this page carries;
    // an unstamped page is the whole page and renders exactly as it always did.
    //
    // The slice REPLACES `sections` and empties the two fields
    // renderRulesLeftPage() appends after them, because those two are already
    // blocks in the list — leaving them set would print the re-entry rule and
    // the roll-support note twice on a book that never split.
    const continuation = !!data.continuation;
    if (Array.isArray(data.blocks)) {
      rulesModel.sections = data.blocks.map((block) => ({
        heading: block.heading, body: block.body, text: block.body,
      }));
      rulesModel.reEntryText = '';
      // The packet's support note lives in the SIDECAR, not the body, so it is
      // not a block — it stays on the model, and only on the opening page.
      const isPacket = (rulesModel.artifactIdentity || {}).shellFamily === 'classified-packet';
      if (!isPacket || continuation) rulesModel.supportNote = '';
    }
    if (continuation) {
      // No second title and no second establishing shot: the ceremony belongs
      // to the page that opens the procedure. The header says what this is.
      rulesModel.title = '';
      rulesModel.headerLabel = 'Orientation · continued';
    }

    const page = renderRulesLeftPage(rulesModel);

    // Presence-guarded: a book with no orientation prints byte-identically to
    // the way it printed before this surface existed, which is what makes the
    // schema field safe to be additive-optional.
    const orientation = continuation ? null : renderOrientation(
      ((bookletData || {}).rulesSpread || {}).orientation);
    if (orientation) {
      // Above the procedure — who and what, then how. `.rules-body` is the
      // named anchor; if it is ever renamed the block appends at the end of the
      // frame rather than vanishing, because a missing establishing shot is
      // worse than a mis-placed one.
      const body = page.querySelector('.rules-body');
      if (body && body.parentNode) body.parentNode.insertBefore(orientation, body);
      else (page.querySelector('.page-frame') || page).appendChild(orientation);
    }
    return page;
  },
});

export default 'rules-block';
