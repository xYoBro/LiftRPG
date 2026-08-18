/**
 * fragment-doc-forms.mjs — THE FOUND DOCUMENT'S FORM SET (ARRANGEMENT §2 axis 5)
 *
 * `session-card-forms.mjs` carries the full reason this shape exists; read its
 * header first. In one line: THE VARIANT CONTRACT (docs/craft/ARRANGEMENT.md
 * §3) lets geometry vary only through a named variant whose arithmetic reaches
 * measurement and render BY ONE ROUTE, so the geometry, the estimate's terms
 * and the emitted CSS all live here and the stylesheet is written FROM this
 * file by `scripts/gen-reference.mjs`.
 *
 * ── WHAT THE TAUGHT FORM IS, HERE ──────────────────────────────────────────
 *
 * A found document is the one surface in the book with no chrome telling the
 * player what it IS to the game. It is a memo; the player is holding a memo.
 * The taught form adds a ROUTING BAND across the top: the shell's own citation
 * word, this document's own reference, a leader rule, and — when the document
 * carries one — the citation it was filed under.
 *
 * DIEGETIC BY CONSTRUCTION, and this is the half that took the thinking. The
 * band's label is NOT a word this file chose: it is the first term of
 * `SHELL_CITATION_STYLES[shellFamily].labelVocabulary` — the vocabulary the
 * book already opted into when it declared its shell, and the same table the
 * point-of-use prompt teaches from. A survey says "Sheet", a witness binder
 * says "Exhibit", a ship's logbook says "Entry". No renderer-authored sentence
 * reaches the page (D198's rule, and the sameness defect it guards against):
 * the label comes from the contract the book chose, the reference and the
 * citation are the book's own strings, and everything else is a rule.
 *
 * ── ONE HEIGHT, NO WRAP ────────────────────────────────────────────────────
 *
 * The band is a single fixed-height row. That is a design decision with a
 * measured reason behind it: fragment page-ownership is decided by CHARACTER
 * COUNT (`STANDALONE_MIN_CHARS`, `PAGE_CHAR_BUDGET` in the adapter, D150), so
 * a form is only safe here while it cannot change how much a document has to
 * say. A fixed 17px of chrome is form; a wrapped paragraph would be content,
 * and content is what those two constants are about.
 */

import {
  VALID_FRAGMENT_DOC_FORMS,
  DEFAULT_FRAGMENT_DOC_FORM
} from '../../../contracts/contract-constants.mjs';

/** The form vocabulary, held BY REFERENCE (the D124/D149 idiom). */
export const FRAGMENT_DOC_FORMS = VALID_FRAGMENT_DOC_FORMS;
export const DEFAULT_FORM = DEFAULT_FRAGMENT_DOC_FORM;

/**
 * Normalise whatever rode the atom into a form name. An absent, unknown or
 * malformed value resolves to `bare`, and `bare` is today's exact document.
 */
export function resolveFragmentDocForm(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  return FRAGMENT_DOC_FORMS.indexOf(name) === -1 ? DEFAULT_FORM : name;
}

/** True when the form draws chrome the bare form does not. */
export function formDrawsChrome(form) {
  return resolveFragmentDocForm(form) === 'taught';
}

// ── THE TAUGHT FORM'S GEOMETRY ──────────────────────────────────────────────

/**
 * `.fragment-route-band` — the fixed row, BORDER-BOX (booklet.css sets
 * `box-sizing:border-box` on everything), so the rule under it is INSIDE this
 * number and the rendered box measures exactly 12px. 12 holds a 7px label on
 * its own line box with air above and below, and is the smallest row in which
 * the label still reads at print resolution. Not a pencil target; no write-in
 * floor applies to it.
 */
export const ROUTE_BAND_HEIGHT_PX = 12;
/**
 * The rule under the band, 1px — ABSOLUTE rather than `var(--theme-hair-width)`
 * because it sits on a MEASURED box, and on this channel a measured width is
 * geometry (the module header's reason). Colour and style stay themed.
 * Subtracted from the row to give the label its line box, so the two cannot
 * disagree about how much room the text has.
 */
export const ROUTE_BAND_BORDER_PX = 1;
/** The label's line box: the row less its own rule. */
export const ROUTE_BAND_LINE_PX = ROUTE_BAND_HEIGHT_PX - ROUTE_BAND_BORDER_PX;
/** The gap between the band and the document-type slug it introduces. */
export const ROUTE_BAND_MARGIN_BOTTOM_PX = 4;

/** `.fragment-route-label` — the shell's own citation word. */
export const ROUTE_LABEL_FONT_PX = 7;
/** `.fragment-route-ref` — this document's own reference. */
export const ROUTE_REF_FONT_PX = 7;
/**
 * `.fragment-route-cite` — the filed citation, when the document carries one.
 * Sized STRICTLY BELOW the band row and centred in it, so it costs ZERO added
 * height whether it prints or not — which is why the arithmetic below has no
 * citation term.
 */
export const ROUTE_CITE_HEIGHT_PX = 9;
export const ROUTE_CITE_FONT_PX = 6;

/**
 * THE TAUGHT FORM'S WHOLE ADDED HEIGHT, for one document.
 *
 * A constant, deliberately (see the header): the band never wraps, so it can
 * never move a document across the character-counted page-ownership boundary.
 * A function rather than a bare constant because it is what the gate calls to
 * compare against the RENDERED band, and a function is the seam a future form
 * with a variable term would grow into.
 *
 * @returns {number} px
 */
export function fragmentTaughtBandHeightPx() {
  // The rule is inside ROUTE_BAND_HEIGHT_PX (border-box), so it is not added
  // again here. Adding it twice would over-reserve by a pixel on every taught
  // document and break the gate's rendered-vs-charged identity by exactly that.
  return ROUTE_BAND_HEIGHT_PX + ROUTE_BAND_MARGIN_BOTTOM_PX;
}

// ── THE CSS, EMITTED ────────────────────────────────────────────────────────
//
// Every geometric literal below interpolates a constant declared above. Scoped
// under `.fragment-doc[data-form-variant="taught"]`; `bare` stamps no attribute
// at all, so no rule here can match it (the D179 presence fence).

/**
 * The element every rule in this family's section hangs off. Exported so the
 * emitter, the gate and the asset check all name ONE selector root — the
 * atom type and the class it renders as are not always the same word.
 */
export const FORM_ROOT_SELECTOR = '.fragment-doc';

/**
 * This family's SECTION of `public/renderer/form-variants.css` (the banner and
 * the file belong to `form-metrics/index.mjs`).
 *
 * @returns {string}
 */
export function emitFragmentDocFormCss() {
  const S = FORM_ROOT_SELECTOR + '[data-form-variant="taught"]';
  return [
    '/* ── THE TAUGHT FORM — found document, ARRANGEMENT.md §2 axis 5 ────────',
    '   A routing band in the shell\'s own citation vocabulary: what this world',
    '   calls a filed thing, this document\'s reference, and the citation it was',
    '   filed under. The bare form draws none of it and stamps no attribute. */',
    '',
    `${S} .fragment-route-band{`,
    '  display:flex;',
    '  align-items:center;',
    '  gap:4px;',
    `  height:${ROUTE_BAND_HEIGHT_PX}px;`,
    `  margin-bottom:${ROUTE_BAND_MARGIN_BOTTOM_PX}px;`,
    `  border-bottom:${ROUTE_BAND_BORDER_PX}px var(--theme-line-style,solid) var(--theme-field-rule,var(--rule));`,
    '  /* THE ABSORPTION LAW (D198). `.fragment-doc` is a flex column; a band',
    '     that could shrink would print shorter than the estimate charged and',
    '     nothing would ever report the difference. */',
    '  flex:0 0 auto;',
    '}',
    '',
    `${S} .fragment-route-label{`,
    '  font-family:var(--theme-label-family,var(--mono));',
    `  font-size:${ROUTE_LABEL_FONT_PX}px;`,
    `  line-height:${ROUTE_BAND_LINE_PX}px;`,
    '  letter-spacing:.14em;',
    '  text-transform:uppercase;',
    '  color:var(--muted);',
    '  flex:0 0 auto;',
    '}',
    '',
    `${S} .fragment-route-ref{`,
    '  font-family:var(--theme-label-family,var(--mono));',
    `  font-size:${ROUTE_REF_FONT_PX}px;`,
    `  line-height:${ROUTE_BAND_LINE_PX}px;`,
    '  letter-spacing:.08em;',
    '  color:var(--ink);',
    '  flex:0 0 auto;',
    '  white-space:nowrap;',
    '}',
    '',
    '/* The leader rule. Zero height inside a fixed-height row: pure paint. */',
    `${S} .fragment-route-rule{`,
    '  flex:1 1 auto;',
    '  height:0;',
    '  min-width:0;',
    '  border-top:var(--theme-hair-width,1px) var(--theme-line-style,solid) var(--theme-field-rule,var(--rule));',
    '}',
    '',
    '/* The filed citation, when the document carries one. Sized strictly below',
    '   the band row, so the arithmetic\'s silence about it stays honest. */',
    `${S} .fragment-route-cite{`,
    '  flex:0 0 auto;',
    `  height:${ROUTE_CITE_HEIGHT_PX}px;`,
    `  line-height:${ROUTE_CITE_HEIGHT_PX}px;`,
    '  font-family:var(--theme-label-family,var(--mono));',
    `  font-size:${ROUTE_CITE_FONT_PX}px;`,
    '  letter-spacing:.06em;',
    '  padding:0 4px;',
    '  color:var(--muted);',
    '  border:var(--theme-hair-width,1px) var(--theme-line-style,solid) var(--theme-field-rule,var(--rule));',
    '  border-radius:2px;',
    '  white-space:nowrap;',
    '  overflow:hidden;',
    '  max-width:40%;',
    '}'
  ].join('\n');
}
