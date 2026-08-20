/**
 * session-card-forms.mjs — THE SESSION CARD'S FORM SET (ARRANGEMENT §2 axis 5)
 *
 * ── WHY THIS FILE EXISTS, AND WHY IT IS SHAPED LIKE THIS ────────────────────
 *
 * THE VARIANT CONTRACT (docs/craft/ARRANGEMENT.md §3) permits geometry to vary
 * — but only through a named variant whose arithmetic reaches BOTH the
 * measuring step and the drawing step by one route. Every previous geometry
 * mirror in this repo is a pair of hand-maintained copies: a number in
 * `booklet.css` and the same number restated in an estimate, with reciprocal
 * comments asking a human to move them together. That idiom has produced the
 * same silent defect seven times (D71, D105, D115, D118, D121, D133, D145):
 * nothing throws, the estimate is simply wrong, and `overflow:hidden` eats the
 * difference as ink.
 *
 * A hand-maintained mirror is FORBIDDEN for a named variant (decider directive,
 * this wave). So this module is the ONE HOME, in the `legibility.mjs` idiom
 * (D172 — one home, two readers), taken one step further:
 *
 *   • the estimate imports these constants directly
 *     (`session-card-metrics.js`);
 *   • the renderer imports them for the geometry it must stamp
 *     (`workout-primitives.js` / `atoms/session-card.js`);
 *   • THE CSS IS EMITTED FROM THIS FILE by `scripts/gen-reference.mjs`
 *     (`public/renderer/form-variants.css`) and byte-diffed by
 *     `npm run validate`. There is no hand-written stylesheet to drift from.
 *
 * A `.mjs` with no DOM access and no `?v=` cache-busted specifiers, so Node can
 * import it — the same reason `legibility.mjs` is `.mjs`. Its only import is
 * the contract constants, which the browser reaches at
 * `public/contracts/contract-constants.mjs` and Node reaches through the
 * `contracts` symlink; several renderer modules already import it that way.
 *
 * ── THE GEOMETRY IS ABSOLUTE PX, DELIBERATELY ───────────────────────────────
 *
 * Every geometric property emitted below is an absolute pixel value, never an
 * `em`, a `pt`, a `%` or a custom property. Phase-1 estimation has no DOM and
 * no theme knowledge: it cannot resolve `var(--mono)`'s metrics or a `pt` that
 * an archetype re-scales. Absolute px makes the taught form's added height
 * theme-invariant BY CONSTRUCTION, which is what lets the estimate below be
 * exact rather than a worst case. Colour, face and rule style still come from
 * theme tokens — those are paint, and paint may not measure.
 *
 * ── THE WRITE-IN LAW IS NOT NEGOTIABLE (D89 / D145) ─────────────────────────
 *
 * The taught form ADDS chrome above the pencil surfaces. It never shrinks one.
 * There is no rule below that touches `.notes-box`, `.mark-box`,
 * `.return-beat-blank`, `.progression-target-blank` or `.rep-box`, and the
 * gate (`scripts/check-form-variants.mjs`) asserts the pencil floors hold on
 * every form. Teaching that costs the player writing room is not teaching.
 */

import {
  VALID_SESSION_CARD_FORMS,
  DEFAULT_SESSION_CARD_FORM
} from '../../../contracts/contract-constants.mjs';

/**
 * The form vocabulary, held BY REFERENCE from the contract constants — never
 * copied (the D124/D149 idiom). The list the book chooses from IS the list this
 * estimate reads, which is variant-contract clause 2 made structural: a form
 * that cannot be estimated cannot be declared, because there is one list.
 */
export const SESSION_CARD_FORMS = VALID_SESSION_CARD_FORMS;
export const DEFAULT_FORM = DEFAULT_SESSION_CARD_FORM;

/**
 * Normalise whatever rode the atom into a form name.
 *
 * An absent, unknown or malformed value resolves to `bare`, and `bare` is
 * today's exact rendering — so a book that declares nothing renders
 * byte-identically to the pre-form engine. That is the D179 demotion idiom
 * applied to the form channel: declaring nothing moves no pixel.
 */
export function resolveSessionCardForm(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  return SESSION_CARD_FORMS.indexOf(name) === -1 ? DEFAULT_FORM : name;
}

/** True when the form draws chrome the bare form does not. */
export function formDrawsChrome(form) {
  return resolveSessionCardForm(form) === 'taught';
}

// ── THE TAUGHT FORM'S GEOMETRY ──────────────────────────────────────────────
//
// The Mothership Basic sheet, read as a specification (ARRANGEMENT §2 axis 5):
// numbered steps walking the reader box to box, the instruction printed beside
// the very field it fills, and a small pointer to where the detail lives.
//
// WHAT IS AND IS NOT PROSE. The numerals are structure — the renderer counts
// the steps the card actually builds and numbers them in render order, so no
// text is invented and no step can be numbered that does not exist. The
// instruction line and the pointer chip print AUTHORED strings handed down by
// the adapter, or nothing at all. The renderer writes no sentences; a renderer
// that authored its own teaching prose would be the derived-data-prints defect
// (D198) wearing a helpful face.

/**
 * `.session-step-head` — the numbered rule row that precedes each step. A fixed
 * height, so a card's added chrome is `steps × this` and nothing else.
 *
 * 11px holds a 7px numeral on its own line box with a pixel of air, and is the
 * smallest row in which the numeral still reads at print resolution. It is not
 * a pencil target and carries no write-in floor.
 */
export const STEP_HEAD_HEIGHT_PX = 11;

/** The step numeral's font size and line box (the row's own height). */
export const STEP_INDEX_FONT_PX = 7;

/**
 * `.session-step-pointer` — the chip that names where the rules for this card
 * live. Sized STRICTLY BELOW the head row and centred in it, so the chip costs
 * ZERO added height whether it prints or not. That is why the estimate has no
 * pointer term: there is nothing to charge.
 */
export const POINTER_CHIP_HEIGHT_PX = 9;
export const POINTER_CHIP_FONT_PX = 6;

/**
 * `.session-step-note` — the marking instruction, printed inside the mark
 * strip's own step marker rather than as a sibling, so it adds no body child
 * and therefore no body gap. One authored sentence; wrapped.
 */
export const STEP_NOTE_LINE_PX = 9;
export const STEP_NOTE_FONT_PX = 7;
export const STEP_NOTE_GAP_PX = 2;

/**
 * Characters the note fits on one printed line.
 *
 * DERIVED, NOT FITTED, and said plainly for the reason session-card-metrics.js
 * says it about its own micro-line terms: no fixture carries a taught form yet,
 * so there is nothing rendered to fit against. Derivation: PROMPT_LADDER's
 * fitted base row is 68 characters at 10.0px including greedy-wrap waste, which
 * is ~6.6px of effective advance per character; at STEP_NOTE_FONT_PX that
 * scales to ~97. 78 is taken instead — ~20% conservative, and the same number
 * the file's other 5.9pt surfaces carry, so the two do not need separate
 * justification. Over-counting lines over-estimates, which the planner's
 * compaction absorbs; under-counting clips inside `.session-card`'s
 * `overflow:hidden`. REFIT against rendered cards once a fixture declares the
 * taught form — the D76 lesson is that a wrap term fitted in the wrong box is
 * worse than one fitted in none.
 */
export const STEP_NOTE_CHARS_PER_LINE = 78;

/**
 * The added height one taught step marker costs.
 *
 * @param {number} noteLines printed lines of instruction carried by THIS marker
 *   (0 on every marker but the mark strip's, and 0 there when no instruction
 *   was authored)
 * @returns {number} px
 */
export function stepMarkerHeightPx(noteLines) {
  const lines = Number.isFinite(noteLines) && noteLines > 0 ? Math.ceil(noteLines) : 0;
  return STEP_HEAD_HEIGHT_PX
    + (lines ? STEP_NOTE_GAP_PX + lines * STEP_NOTE_LINE_PX : 0);
}

/**
 * Printed lines an authored instruction occupies in the note zone.
 *
 * Kept here rather than in the metrics file so the wrap capacity and the font
 * that produces it cannot be separated.
 *
 * @param {string} text
 * @returns {number} 0 when nothing was authored
 */
export function noteLineCount(text) {
  const body = String(text === null || text === undefined ? '' : text).trim();
  if (!body) return 0;
  return Math.max(1, Math.ceil(body.length / STEP_NOTE_CHARS_PER_LINE));
}

/**
 * THE TAUGHT FORM'S WHOLE ADDED HEIGHT, for one card.
 *
 * The card's own arithmetic lives in `session-card-metrics.js`; this is the
 * form delta it adds, and the ONLY thing that knows what the chrome costs. The
 * body gap is passed in rather than restated because it belongs to the density
 * ladder (`CARD_LADDER[tier].bodyGap`) and is not a property of the form: each
 * marker is a body child, so each marker also buys one more gap.
 *
 * THE NOTE TERM IS PER PRINTED NOTE, NOT PER CARD, and that is a correction
 * made when the second note arrived (the session ritual, 2026-08-19). Every
 * `.session-step-note` is one more flex child of its marker, so every note buys
 * one more `STEP_NOTE_GAP_PX` — the old single-gap term was exact while a card
 * could carry only the mark instruction and would have UNDER-charged by one gap
 * per extra note the moment a second one printed. Under-charging is the
 * silent-clipping direction this whole module exists to make impossible, so the
 * term counts notes rather than summing their lines.
 *
 * @param {number} stepCount body children the card builds (each gets a marker)
 * @param {number} bodyGapPx `.session-body`'s row-gap at this density
 * @param {number|number[]} noteLines printed instruction lines. An ARRAY is one
 *   entry per printed `.session-step-note`, in any order — only the multiset
 *   matters, because each note costs its own gap wherever it sits. A scalar is
 *   read as a single note of that many lines, which is what it always meant.
 * @returns {number} px, 0 when the card builds no steps
 */
export function taughtChromeHeightPx(stepCount, bodyGapPx, noteLines) {
  const steps = Number.isFinite(stepCount) && stepCount > 0 ? Math.floor(stepCount) : 0;
  if (!steps) return 0;
  const gap = Number.isFinite(bodyGapPx) && bodyGapPx > 0 ? bodyGapPx : 0;
  // A scalar is one note, never a total: reading a total as one note is the
  // only interpretation that cannot under-charge, and it is also the meaning
  // every existing caller had.
  const notes = Array.isArray(noteLines) ? noteLines : [noteLines];
  let noteHeight = 0;
  notes.forEach((entry) => {
    const lines = Number.isFinite(entry) && entry > 0 ? Math.ceil(entry) : 0;
    if (lines) noteHeight += STEP_NOTE_GAP_PX + lines * STEP_NOTE_LINE_PX;
  });
  return steps * STEP_HEAD_HEIGHT_PX + steps * gap + noteHeight;
}

// ── THE CSS, EMITTED ────────────────────────────────────────────────────────
//
// Every geometric literal below interpolates a constant declared above. There
// is no number in the emitted stylesheet that this module does not own, which
// is the property that makes the mirror impossible to break by hand: editing
// the stylesheet is caught by the byte-diff, and editing a constant moves the
// stylesheet and the estimate in the same commit.
//
// SCOPING. Every rule is under `.session-card[data-form-variant="taught"]`.
// `bare` stamps NO attribute (see `atoms/session-card.js`), so a card in the
// default form cannot match any selector here — the D179 presence-fence idiom,
// and the reason `bare` is provably byte-identical to the pre-form render.
//
// THIS IS THE FORM CHANNEL, NOT THE DECORATION CHANNEL. `arrangementPaintOnlyLaw()`,
// `componentDialectHeightLaw()` and `designLanguageDrawingLaw()` in
// scripts/validate.mjs all read `public/renderer/booklet.css` and all key on
// their own attribute families (`data-arrangement*`, `data-component-dialect`,
// `data-design-language`). `data-form-variant` is none of those and lives in
// none of that file, so the paint-only blacklist neither captures these rules
// nor should: this channel's law is the opposite one — form MUST measure. Its
// gate is `scripts/check-form-variants.mjs` (ARRANGEMENT §3, both halves).

/**
 * The element every rule in this family's section hangs off. Exported so the
 * emitter, the gate and the asset check all name ONE selector root — the
 * atom type and the class it renders as are not always the same word.
 */
export const FORM_ROOT_SELECTOR = '.session-card';

/**
 * This family's SECTION of `public/renderer/form-variants.css`. The banner, the
 * file's path and the order the sections are written in belong to
 * `form-metrics/index.mjs`, which is the one home for the emitted file — three
 * families each emitting a whole stylesheet would be three stylesheets.
 *
 * Deterministic: a pure function of the constants above, with no date, hash or
 * iteration order in it (gen-reference.mjs's determinism law).
 *
 * @returns {string}
 */
export function emitSessionCardFormCss() {
  const S = FORM_ROOT_SELECTOR + '[data-form-variant="taught"]';
  return [
    '/* ── THE TAUGHT FORM — session card, ARRANGEMENT.md §2 axis 5 ───────────',
    '   Numbered steps walking the reader box to box, the marking instruction',
    '   printed beside the field it fills, and a pointer to where the rules',
    '   live. The bare form draws none of this and stamps no attribute. */',
    '',
    `${S} .session-step-marker{`,
    '  display:flex;',
    '  flex-direction:column;',
    `  gap:${STEP_NOTE_GAP_PX}px;`,
    '  /* THE ABSORPTION LAW (D198). `.session-body` is a flex column; a marker',
    '     that could shrink would print at a height the estimate did not predict',
    '     and the planner would never see the difference. The notes box carries',
    '     `flex:1 1 auto` and is what absorbs a squeeze. */',
    '  flex:0 0 auto;',
    '}',
    '',
    `${S} .session-step-head{`,
    '  display:flex;',
    '  align-items:center;',
    '  gap:4px;',
    `  height:${STEP_HEAD_HEIGHT_PX}px;`,
    '  flex:0 0 auto;',
    '}',
    '',
    '/* The numeral. Absolute px, not `pt` and not `em`: the estimate has no theme',
    '   knowledge, so this row must measure the same under every archetype. */',
    `${S} .session-step-index{`,
    `  font-family:var(--theme-label-family,var(--mono));`,
    `  font-size:${STEP_INDEX_FONT_PX}px;`,
    `  line-height:${STEP_HEAD_HEIGHT_PX}px;`,
    '  letter-spacing:.08em;',
    '  color:var(--muted);',
    '  flex:0 0 auto;',
    '}',
    '',
    '/* The rule that runs from the numeral to the edge — the Basic sheet\'s',
    '   walk-me-through-it gesture. Zero height inside a fixed-height row, so it',
    '   is pure paint and charges nothing. */',
    `${S} .session-step-rule{`,
    '  flex:1 1 auto;',
    '  height:0;',
    '  min-width:0;',
    '  border-top:var(--theme-hair-width,1px) var(--theme-line-style,solid) var(--theme-field-rule,var(--rule));',
    '}',
    '',
    '/* The pointer chip. Sized STRICTLY BELOW the head row and centred in it, so',
    '   it costs zero added height — which is why the estimate carries no pointer',
    '   term. Raising this above the head height would make that silence a lie. */',
    `${S} .session-step-pointer{`,
    '  flex:0 0 auto;',
    `  height:${POINTER_CHIP_HEIGHT_PX}px;`,
    `  line-height:${POINTER_CHIP_HEIGHT_PX}px;`,
    `  font-family:var(--theme-label-family,var(--mono));`,
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
    '/* The marking instruction, printed inside the mark strip\'s own marker — the',
    '   axis\'s central claim: the instruction beside the field it fills. Inside',
    '   the marker, not beside it, so it adds no body child and no body gap. */',
    `${S} .session-step-note{`,
    `  font-family:var(--serif);`,
    `  font-size:${STEP_NOTE_FONT_PX}px;`,
    `  line-height:${STEP_NOTE_LINE_PX}px;`,
    '  color:var(--ink);',
    '  flex:0 0 auto;',
    '  min-width:0;',
    '  overflow-wrap:break-word;',
    '}'
  ].join('\n');
}
