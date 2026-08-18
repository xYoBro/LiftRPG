/**
 * oracle-table-forms.mjs — THE ORACLE TABLE'S FORM SET (ARRANGEMENT §2 axis 5)
 *
 * The session card's module (`session-card-forms.mjs`) carries the full reason
 * this shape exists; read its header first. In one line: THE VARIANT CONTRACT
 * (docs/craft/ARRANGEMENT.md §3) lets geometry vary only through a named
 * variant whose arithmetic reaches measurement and render BY ONE ROUTE, so the
 * geometry, the estimate's terms and the emitted CSS all live here and the
 * stylesheet is written FROM this file by `scripts/gen-reference.mjs`.
 *
 * Same three properties, for the same reasons:
 *   • absolute px only — phase-1 estimation has no DOM, cannot resolve a custom
 *     property and cannot know which archetype re-scales a `pt`;
 *   • the vocabulary is held BY REFERENCE from the contract constants;
 *   • `bare` stamps NO attribute, so a book that declares nothing renders
 *     byte-identically to the pre-form engine (the D179 demotion idiom).
 *
 * ── WHAT THE TAUGHT FORM IS, HERE ──────────────────────────────────────────
 *
 * The axis-5 reading of a roll table: *the instruction lives where the roll
 * happens.* The bare form prints the oracle's instruction as a line of italic
 * prose above the entries, which reads as flavour and is skipped like flavour.
 * The taught form gives it a FRAMED BAND with a leader rule and a pointer chip
 * naming what the table pays in — the how-to-roll instrument, drawn as an
 * instrument.
 *
 * THE INSTRUCTION IS MOVED, NEVER DUPLICATED. In the taught form the plain
 * `.oracle-instruction` element is not built at all; its authored text is the
 * band's text. The estimate therefore drops the instruction term when it adds
 * the band, and `oracleTaughtBandHeightPx()` is the whole of what the band
 * costs — which is what the gate measures the rendered band against.
 *
 * THE RENDERER AUTHORS NOTHING. Every string in the band is the BOOK'S: the
 * oracle's own `instruction` and the economy's own `currencyLabel`. A renderer
 * that wrote its own how-to-roll sentence would print the same teaching in
 * every book, which is the sameness this axis exists to break, and it would be
 * the derived-data-prints defect (D198) wearing a helpful face.
 */

import {
  VALID_ORACLE_TABLE_FORMS,
  DEFAULT_ORACLE_TABLE_FORM
} from '../../../contracts/contract-constants.mjs';

/** The form vocabulary, held BY REFERENCE (the D124/D149 idiom). */
export const ORACLE_TABLE_FORMS = VALID_ORACLE_TABLE_FORMS;
export const DEFAULT_FORM = DEFAULT_ORACLE_TABLE_FORM;

/**
 * Normalise whatever rode the atom into a form name. An absent, unknown or
 * malformed value resolves to `bare`, and `bare` is today's exact table.
 */
export function resolveOracleTableForm(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  return ORACLE_TABLE_FORMS.indexOf(name) === -1 ? DEFAULT_FORM : name;
}

/** True when the form draws chrome the bare form does not. */
export function formDrawsChrome(form) {
  return resolveOracleTableForm(form) === 'taught';
}

// ── THE TAUGHT FORM'S GEOMETRY ──────────────────────────────────────────────

/**
 * `.oracle-teach-band` — the band's closing rule. ONE rule, at the bottom.
 *
 * CORRECTED ON THE RENDERED PAGE, which is the only place it could have been
 * caught: the band was drafted with rules top AND bottom, and on p.07 of the
 * tidewall fixture the top rule landed directly under `.oracle-header`'s own
 * border-bottom with the leader rule a few pixels below it — three parallel
 * hairlines in ten pixels, which reads as a ruling artifact rather than as a
 * frame. The leader rule already opens the band; only the close was missing.
 *
 * ABSOLUTE, not `var(--theme-hair-width)`, and the distinction is the channel's
 * own law rather than a preference: this border is on a MEASURED box, so its
 * width is geometry and geometry is absolute px here (the module header's
 * reason — phase-1 estimation cannot resolve a custom property). The leader
 * rule may take the token because it sits inside a fixed-height row and costs
 * nothing. Colour and style stay themed; those are paint.
 */
export const BAND_BORDER_V_PX = 1;
/** `.oracle-teach-band` — padding-block (3px top, 3px bottom). */
export const BAND_PAD_V_PX = 6;
/** `.oracle-teach-band` — padding-inline, each side. Costs width, not height. */
export const BAND_PAD_X_PX = 6;
/** The gap between the band and the entries it introduces. */
export const BAND_MARGIN_BOTTOM_PX = 4;

/**
 * `.oracle-teach-head` — the fixed-height row holding the leader rule and the
 * pointer chip. Fixed, so the band's height is text plus a constant.
 */
export const BAND_HEAD_HEIGHT_PX = 11;

/**
 * `.oracle-teach-pointer` — the chip naming what this table pays in. Sized
 * STRICTLY BELOW the head row and centred in it, so the chip costs ZERO added
 * height whether it prints or not. That is why the arithmetic below has no
 * pointer term: there is nothing to charge.
 */
export const POINTER_CHIP_HEIGHT_PX = 9;
export const POINTER_CHIP_FONT_PX = 6;

/** `.oracle-teach-text` — the authored instruction, wrapped. */
export const BAND_TEXT_LINE_PX = 9;
export const BAND_TEXT_FONT_PX = 7;
export const BAND_TEXT_GAP_PX = 2;

/**
 * Characters the instruction fits on one printed line.
 *
 * DERIVED, NOT FITTED, and said plainly for the reason session-card-forms.mjs
 * says it: no fixture carries a taught form yet, so there is nothing rendered
 * to fit against. Derivation: the band's live column is the oracle zone's
 * modelled 432px less this band's own 12px of inset, and the entry serif's
 * calibrated advance ratio is 0.62 of font-size (atoms/oracle-table.js,
 * fitted over 2,452 text columns) — 420 / (0.62 × 7) ≈ 96. 78 is taken
 * instead, the same ~20% conservative number the session card's note carries,
 * so the two do not need separate justification. Over-counting lines
 * over-reserves, which the planner's compaction absorbs; under-counting clips
 * inside the zone and is invisible. REFIT against rendered bands once a
 * fixture declares the taught form.
 */
export const BAND_TEXT_CHARS_PER_LINE = 78;

/**
 * Printed lines an authored instruction occupies in the band.
 *
 * Kept here rather than in the atom so the wrap capacity and the font that
 * produces it cannot be separated.
 *
 * @param {string} text
 * @returns {number} 0 when nothing was authored
 */
export function bandLineCount(text) {
  const body = String(text === null || text === undefined ? '' : text).trim();
  if (!body) return 0;
  return Math.max(1, Math.ceil(body.length / BAND_TEXT_CHARS_PER_LINE));
}

/**
 * THE TAUGHT FORM'S WHOLE ADDED HEIGHT, for one oracle table.
 *
 * The ONLY thing that knows what the band costs. The atom adds this and drops
 * its own instruction term, because in the taught form the instruction IS this
 * band — there is no second copy on the page.
 *
 * @param {number} textLines printed lines of instruction the band carries
 * @returns {number} px
 */
export function oracleTaughtBandHeightPx(textLines) {
  const lines = Number.isFinite(textLines) && textLines > 0 ? Math.ceil(textLines) : 0;
  return BAND_BORDER_V_PX + BAND_PAD_V_PX + BAND_HEAD_HEIGHT_PX
    + (lines ? BAND_TEXT_GAP_PX + lines * BAND_TEXT_LINE_PX : 0)
    + BAND_MARGIN_BOTTOM_PX;
}

// ── THE CSS, EMITTED ────────────────────────────────────────────────────────
//
// Every geometric literal below interpolates a constant declared above, so the
// stylesheet and the arithmetic cannot be edited apart: the byte-diff catches a
// hand-edit of the stylesheet, and a constant change moves both in one commit.
//
// SCOPING. Every rule is under `.oracle-zone[data-form-variant="taught"]`, and
// `bare` stamps no attribute at all — the D179 presence-fence idiom, and the
// reason `bare` is provably byte-identical to the pre-form render.

/**
 * The element every rule in this family's section hangs off. Exported so the
 * emitter, the gate and the asset check all name ONE selector root — the
 * atom type and the class it renders as are not always the same word.
 */
export const FORM_ROOT_SELECTOR = '.oracle-zone';

/**
 * This family's SECTION of `public/renderer/form-variants.css` (the banner and
 * the file belong to `form-metrics/index.mjs`).
 *
 * @returns {string}
 */
export function emitOracleTableFormCss() {
  const S = FORM_ROOT_SELECTOR + '[data-form-variant="taught"]';
  return [
    '/* ── THE TAUGHT FORM — oracle table, ARRANGEMENT.md §2 axis 5 ──────────',
    '   The how-to-roll instruction, drawn as an instrument instead of printed',
    '   as flavour: a framed band with a leader rule and a chip naming what the',
    '   table pays in. The bare form draws none of this and stamps no',
    '   attribute — its instruction stays the plain `.oracle-instruction` line. */',
    '',
    `${S} .oracle-teach-band{`,
    '  display:flex;',
    '  flex-direction:column;',
    `  gap:${BAND_TEXT_GAP_PX}px;`,
    `  padding:${BAND_PAD_V_PX / 2}px ${BAND_PAD_X_PX}px;`,
    `  margin-bottom:${BAND_MARGIN_BOTTOM_PX}px;`,
    `  border-bottom:${BAND_BORDER_V_PX}px var(--theme-line-style,solid) var(--theme-field-rule,var(--rule));`,
    '  /* THE ABSORPTION LAW (D198). A band that could shrink would print at a',
    '     height the estimate did not predict, and the planner would never be',
    '     told the difference. */',
    '  flex:0 0 auto;',
    '}',
    '',
    `${S} .oracle-teach-head{`,
    '  display:flex;',
    '  align-items:center;',
    '  gap:4px;',
    `  height:${BAND_HEAD_HEIGHT_PX}px;`,
    '  flex:0 0 auto;',
    '}',
    '',
    '/* The leader rule. Zero height inside a fixed-height row, so it is pure',
    '   paint and charges nothing. */',
    `${S} .oracle-teach-rule{`,
    '  flex:1 1 auto;',
    '  height:0;',
    '  min-width:0;',
    '  border-top:var(--theme-hair-width,1px) var(--theme-line-style,solid) var(--theme-field-rule,var(--rule));',
    '}',
    '',
    '/* The pointer chip — the book\'s own name for what this table pays in.',
    '   Sized STRICTLY BELOW the head row and centred in it, so it costs zero',
    '   added height, which is why the arithmetic carries no pointer term. */',
    `${S} .oracle-teach-pointer{`,
    '  flex:0 0 auto;',
    `  height:${POINTER_CHIP_HEIGHT_PX}px;`,
    `  line-height:${POINTER_CHIP_HEIGHT_PX}px;`,
    '  font-family:var(--theme-label-family,var(--mono));',
    `  font-size:${POINTER_CHIP_FONT_PX}px;`,
    '  letter-spacing:.06em;',
    '  padding:0 4px;',
    '  color:var(--muted);',
    '  border:var(--theme-hair-width,1px) var(--theme-line-style,solid) var(--theme-field-rule,var(--rule));',
    '  border-radius:2px;',
    '  white-space:nowrap;',
    '  overflow:hidden;',
    '  max-width:45%;',
    '}',
    '',
    '/* The authored instruction, MOVED here rather than copied: the taught form',
    '   builds no `.oracle-instruction`, so nothing on the page says it twice. */',
    `${S} .oracle-teach-text{`,
    '  font-family:var(--serif);',
    `  font-size:${BAND_TEXT_FONT_PX}px;`,
    `  line-height:${BAND_TEXT_LINE_PX}px;`,
    '  color:var(--ink);',
    '  flex:0 0 auto;',
    '  min-width:0;',
    '  overflow-wrap:break-word;',
    '}'
  ].join('\n');
}
