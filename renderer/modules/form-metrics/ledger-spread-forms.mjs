/**
 * ledger-spread-forms.mjs — THE LEDGER'S FORM SET (ARRANGEMENT §2 axis 5)
 *
 * `session-card-forms.mjs` carries the full reason this shape exists; read its
 * header first. In one line: THE VARIANT CONTRACT (docs/craft/ARRANGEMENT.md
 * §3) lets geometry vary only through a named variant whose arithmetic reaches
 * measurement and render BY ONE ROUTE, so the geometry, the estimate's terms
 * and the emitted CSS all live here and the stylesheet is written FROM this
 * file by `scripts/gen-reference.mjs`.
 *
 * ── WHAT THE SECOND FORM IS, HERE ──────────────────────────────────────────
 *
 * NOT teaching chrome. The other three families' second form ADDS something a
 * player reads; this one changes how the same four columns are DRAWN, and it is
 * the design D198's recorded dissent asked for, ruled into phase B at D200-4.
 *
 * `bare` is today's page: the movement label bottom-aligned in its band, and
 * the band's growth stopped at `ROW_GROWTH_CAP_PX` so the label cannot drift
 * away from the column head it belongs to.
 *
 * `register` is the ledger drawn as a ledger. The label goes to the TOP of its
 * band, against the rule that opens it, and the bands then share the whole
 * writing budget. The two changes are one change: bottom alignment is what made
 * a tall band unreadable, so removing it is what makes a tall band legal, and
 * the cap has nothing left to prevent.
 *
 * ── WHAT IT COSTS AND BUYS, MEASURED ───────────────────────────────────────
 *
 * Delivered book (evals/proving-run, five movements, 733.2px sheet):
 *
 *   bare      422.8px of ink — 57.7% full, 310px of trailing white on the
 *             book's closing page. The whitespace debt the dissent named.
 *   register  the bands take the budget, so the page is full by construction.
 *
 * The write-in floor is not spent to buy that: a `register` band is never
 * SHORTER than a `bare` one, because both are floored at `ROW_MIN_PX` and
 * `register` only removes a CEILING. The pencil can only gain room.
 *
 * ── NO ADDED HEIGHT, SO NO ADDED-CHROME FUNCTION ───────────────────────────
 *
 * The other three families export a `…TaughtBandHeightPx()` because their form
 * adds a box. This one adds nothing and moves nothing into or out of the page's
 * budget — it re-spends a budget the page already owned. What it exports
 * instead is the CEILING POLICY, which is the one number the atom's arithmetic
 * has to branch on.
 */

import {
  VALID_LEDGER_SPREAD_FORMS,
  DEFAULT_LEDGER_SPREAD_FORM
} from '../../../contracts/contract-constants.mjs';

/** The form vocabulary, held BY REFERENCE (the D124/D149 idiom). */
export const LEDGER_SPREAD_FORMS = VALID_LEDGER_SPREAD_FORMS;
export const DEFAULT_FORM = DEFAULT_LEDGER_SPREAD_FORM;

/**
 * Normalise whatever rode the atom into a form name. An absent, unknown or
 * malformed value resolves to `bare`, and `bare` is today's exact page.
 */
export function resolveLedgerSpreadForm(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  return LEDGER_SPREAD_FORMS.indexOf(name) === -1 ? DEFAULT_FORM : name;
}

/**
 * Does this form cap how tall a row may grow?
 *
 * THE ONE BRANCH the atom's height arithmetic takes on the form, and the reason
 * it is a predicate here rather than an `if` in the atom: the cap and the
 * alignment are two halves of one decision (see the header), and the CSS below
 * emits the alignment. A consumer that flipped one without the other would
 * print exactly the defect W5 capped, or exactly the whitespace D200-4 ruled
 * against — and nothing would say so.
 *
 * @param {string} form
 * @returns {boolean}
 */
export function formCapsRowGrowth(form) {
  return resolveLedgerSpreadForm(form) !== 'register';
}

// ── THE REGISTER FORM'S GEOMETRY ────────────────────────────────────────────

/**
 * `.ledger-name` padding in the register form. `bare` pads 2px at the BOTTOM
 * (the label sits on the band's floor); `register` pads the same 2px at the
 * TOP, so the label's line box sits the same distance from its rule and the
 * cell's own height is unchanged at every band size — which is why this form
 * costs the estimate nothing.
 */
export const LABEL_PAD_TOP_PX = 2;
export const LABEL_PAD_BOTTOM_PX = 0;

/**
 * How far the label's first GLYPH may sit below the top of its padding box.
 *
 * The gate measures the glyph run, not the element box (D172: a `.ledger-name`
 * under `align-items:stretch` has the band's full height in both forms, so its
 * box says nothing about where the text landed). A glyph never starts at the
 * top of its line box: `.ledger-name` is 6.5pt on a 1.2 line, so half-leading
 * plus the gap between line-box top and cap height puts the ink about a pixel
 * down. Two pixels is that, rounded up — small enough that a bottom-aligned
 * label in the shortest legal band (ROW_MIN_PX, 18px) still fails it by a
 * factor of three, which is what keeps the check from being a formality.
 */
export const LABEL_GLYPH_SLACK_PX = 2;

/**
 * The band's own rule is `bare`'s `border-bottom`. In `register` the label
 * belongs to the rule that OPENS its band, so the row draws its rule on top
 * instead — 1px either way, absolute rather than `var(--theme-hair-width)`
 * because it sits on a measured box and on this channel a measured width is
 * geometry. Colour and style stay themed.
 *
 * The last row would otherwise print an unclosed band, so the table draws a
 * closing rule under itself; both are 1px and they replace, never add.
 *
 * ZERO ADDED HEIGHT, and it is `box-sizing:border-box` (booklet.css sets it on
 * everything) that makes that true rather than an approximation: the row's
 * rule moves from its bottom edge to its top edge INSIDE the same min/max box,
 * and the table's closing rule sits inside a `flex:1` box whose size the page
 * decides. So the estimate carries no term for either — which is the property
 * that lets this form ship without a second arithmetic.
 */
export const ROW_RULE_PX = 1;

// ── THE CSS, EMITTED ────────────────────────────────────────────────────────
//
// Every geometric literal below interpolates a constant declared above. Scoped
// under `.ledger-table[data-form-variant="register"]`; `bare` stamps no
// attribute at all, so no rule here can match it (the D179 presence fence).

/**
 * The element every rule in this family's section hangs off. Exported so the
 * emitter, the gate and the asset check all name ONE selector root — the atom
 * type and the class it renders as are not the same word (`ledger-spread`
 * renders its form-bearing element as `.ledger-table`).
 */
export const FORM_ROOT_SELECTOR = '.ledger-table';

/**
 * This family's SECTION of `public/renderer/form-variants.css` (the banner and
 * the file belong to `form-metrics/index.mjs`).
 *
 * @returns {string}
 */
export function emitLedgerSpreadFormCss() {
  const S = FORM_ROOT_SELECTOR + '[data-form-variant="register"]';
  return [
    '/* ── THE REGISTER FORM — ledger, ARRANGEMENT.md §2 axis 5 ──────────────',
    '   The ledger drawn as a register: the movement label at the TOP of its',
    '   band, against the rule that opens it, and the bands sharing the whole',
    '   sheet. The bare form bottom-aligns the label and caps the band, and',
    '   stamps no attribute. D198\'s recorded dissent, ruled in at D200-4. */',
    '',
    '/* The label moves to the head of its own band. This is the change the cap',
    '   existed to compensate for — a bottom-aligned label in a tall band prints',
    `   far from its column head; a top-aligned one never does. */`,
    `${S} .ledger-name{`,
    '  align-items:flex-start;',
    `  padding-top:${LABEL_PAD_TOP_PX}px;`,
    `  padding-bottom:${LABEL_PAD_BOTTOM_PX}px;`,
    '}',
    '',
    '/* The rule opens the band instead of closing it, so every label has a line',
    '   directly above it. One rule either way — this replaces, never adds, so',
    '   the row\'s measured height is identical to the bare form\'s at the same',
    '   band size and the estimate needs no term for it. */',
    `${S} .ledger-row{`,
    '  border-bottom:0;',
    `  border-top:${ROW_RULE_PX}px var(--theme-line-style,solid) var(--theme-field-rule,var(--rule));`,
    '}',
    '',
    '/* The last band would otherwise print unclosed. The table carries the',
    '   closing rule so no row needs a :last-child exception the estimate would',
    '   have to know about. */',
    `${S}{`,
    `  border-bottom:${ROW_RULE_PX}px var(--theme-line-style,solid) var(--theme-field-rule,var(--rule));`,
    '}'
  ].join('\n');
}
