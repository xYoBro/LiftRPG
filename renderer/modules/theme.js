import { alpha, mergeObjects } from './utils.js?v=48';
import { resolveTypeMetrics } from './type-metrics.js?v=48';
import {
  VALID_COMPONENT_DIALECTS,
  DEFAULT_COMPONENT_DIALECT,
  VALID_PRODUCTION_TEXTURES,
  TONE_TEXTURE_LADDER,
  VALID_TYPE_VOICES,
  VALID_DOCUMENT_FAMILIES,
  VALID_DOCUMENT_RECIPES,
  VALID_MARGIN_SEMANTICS,
  VALID_INK_DISCIPLINES,
  VALID_SEAL_TREATMENTS
} from '../../contracts/contract-constants.mjs';

/*
 * THE CHARACTER AXES (Teeth T5, 2026-08-12)
 * ─────────────────────────────────────────
 * Design System law: structure lives in base CSS, character lives in tokens.
 * An archetype that needs its own selector is an architecture failure, so the
 * per-archetype identity below is expressed ONLY as token values. Nine of the
 * ten archetypes carry zero `[data-archetype]` CSS; pastoral's residue is
 * geometry (see the block at the end of booklet.css), not character.
 *
 * AND THE ARCHETYPE IS A FLOOR, NOT AN IDENTITY (D126). Authored design
 * language wins: a book's `theme.palette` outranks the preset, and the preset
 * is what a book that authors nothing falls back to. Pastoral's `--page-accent:
 * #8b2a2a` below is the whole of what the retired
 * `[data-archetype="pastoral"]{--accent:#8b2a2a}` selector used to enforce — a
 * palette-less pastoral book still prints red; the Eastern Shore demo, which
 * authors olive, now prints olive. Adding an archetype CSS selector that pins a
 * palette value is the defect that ruling names; add a preset token instead.
 *
 * THE DRAWING LAW. Every axis added by this wave paints and never measures:
 * background-image on a pseudo-element, an outline (outside the box model), a
 * box-shadow (outside the box model), a border colour, a fill. Phase-1
 * estimation has no DOM and cannot resolve a custom property — the D71/D105
 * lesson — so a token that changed a height would make the solver's math lie
 * with nothing to catch it. THREE deliberate exceptions, all confined to the
 * cover page, whose atom estimates a flat full page and models nothing inside
 * it: `--cover-padding` / `--designation-padding`, `--cover-title-case` /
 * `--cover-title-spacing`, and — added at D126 — `--label-size`, which is a
 * SIZE axis and therefore the sharpest of the three. Gate: no page may gain
 * `data-layout-overflow`. Measured for the third: the minimalist cover's
 * designation block moves 35.84px → 31.59px and the stack below it shifts up
 * 4.25px, while the page height stays 816px and overflow stays 0 — the shift is
 * real, contained, and invisible to every estimate.
 *
 * Each axis below names its booklet.css consumer. Adding a token here without
 * a consumer (or a consumer without a token) breaks the theme contract row in
 * CLAUDE.md; the container's `#booklet-container` block is the only mapping
 * layer, so grep there first.
 *
 *   --page-texture / --page-texture-size  → .booklet-page::after background
 *   --page-edge                           → .booklet-page::after border (trim keyline)
 *   --live-frame / --live-frame-offset    → .page-boundary outline (neatline)
 *   --header-shadow                       → the four page headers' box-shadow
 *   --designation-fill/-border/-ink       → the cover's classification stamp
 *   --designation-border-width/-padding   → …its rule weight and box
 *   --badge-color                         → attachment + doc badge slugs
 *   --card-border                         → session-card border colour
 *   --doc-radius                          → fragment-doc corner (drawing only)
 *   --cover-padding                       → cover page live padding
 *   --cover-title-case / -spacing         → cover title register
 *
 * WIRED AT D126 (authored since Teeth T5, dead until now — the tokens existed
 * in all ten presets with zero var() consumers, which is a theme contract row
 * that was silently false):
 *
 *   --stamp-opacity      → --theme-designation-opacity → .cover-designation
 *                          `opacity` (how hard the stamp was pressed)
 *   --rule-opacity       → --theme-field-rule ink, mixed toward transparent →
 *                          the 38 hairline / field-rule declarations that read
 *                          it (63 references across 58 lines; counted, not
 *                          estimated). NOT --rule itself: that ink also draws
 *                          map-cell borders and structural boxes, and the
 *                          archetype must not be able to fade a grid the player
 *                          marks. Unset, the mix is `X calc(1*100%), transparent`
 *                          — measured byte-identical to bare X on canvas, which
 *                          is why the four presets authoring 1 (minimalist, noir,
 *                          scifi, cyberpunk) re-recorded byte-for-byte unchanged
 *   --grid-dot-opacity   → .player-map[data-canvas-type="dot-grid"] dot alpha
 *                          (compounds with --rule-opacity, deliberately). No
 *                          corpus fixture authors that canvasType, so it has no
 *                          `carries` entry — a stated gap, not a false gate
 *   --label-size         → --theme-label-size → .cover-designation `font-size`,
 *                          AND NOTHING ELSE. See the refusal below
 *
 * REFUSED AT D126 (still authored in every preset, deliberately unwired; a
 * documented refusal is a valid outcome, silent damage is not):
 *
 *   --label-size, beyond the cover. THE DRAWING LAW forbids a theme axis from
 *   moving geometry phase-1 estimation cannot see, and every other consumer of
 *   the label family — page headers, doc labels, session headers, week kickers
 *   — sits inside an atom whose estimate charges for its height. A 6pt→7.5pt
 *   swing there is the D71/D105/D118 class exactly. The cover is the one safe
 *   zone, by the same containment argument as the two exceptions above.
 *
 *   --fog-opacity. It has no consumer that is not a gameplay state signal:
 *   every `var(--fog)` fill in booklet.css is a map cell, hex, node or maze
 *   marker STATE (cleared / locked / door / dead-end), each with its own tuned
 *   alpha, and minimalist authors 0. Wiring it would let an archetype erase the
 *   distinction between a hex the player has cleared and one they have not.
 *   The archetype guarantees legibility; it does not get to spend it. A page
 *   atmosphere wash would be a safe home, but that is a new treatment needing a
 *   compositing design (cyberpunk's --page-fog is #111111), not a wiring.
 *
 *   --grid-fill. Named for the map cell fill, which is drawn as an OPAQUE
 *   45° hatch of --paper/--fog precisely so it survives a monochrome laser
 *   printer. Replacing the hatch with the authored tints (0.02–0.28 alpha,
 *   several of them hue-only: cyan, gold, crimson) breaks both the B&W print
 *   law and the state floor; layering the tint underneath is invisible because
 *   the hatch is opaque. Same finding shape as the panel-texture axis (D116):
 *   it needs a compositing design, not a token.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THE WRITE-IN LAW, AND THE ONE TOKEN NO PRESET MAY DECLARE (D145)
 * ═══════════════════════════════════════════════════════════════════════════
 * This is a journal before it is anything else. Every surface the pencil enters
 * — mark strips, rep boxes, notes zones, workspaces, trackers, map cells — must
 * be bounded by rules that RECEDE from handwriting.
 *
 * `--line-width-pencil` is that law, and it is CONSPICUOUSLY ABSENT from all
 * ten presets below. That absence is the mechanism: `booklet.css` resolves
 * `--theme-pencil-width: var(--line-width-pencil, 1px)`, and because no preset
 * sets it, an archetype cannot make a tick box heavier BY CONSTRUCTION rather
 * than by ten careful values that a future preset could quietly break. Adding
 * it to a preset is the defect this ruling names.
 *
 * WHAT IT COST TO LEARN. `--line-width-frame` reads as page furniture and was
 * authored that way — noir and steampunk both set 4px meaning "bold frames".
 * Fourteen declarations consumed it and TEN were pencil boxes, so a 15px tick
 * box rendered with 4px walls: 53.5% ink, 6.95px of paper left, and the rep
 * box's writable aperture 6px tall. The same shape reached `--line-width-rule`,
 * whose consumers are four headers AND the three write-in BLANKS — the ruled
 * line a lifter writes their load onto was carrying a section header's weight.
 *
 * The archetype keeps every ORNAMENTAL consumer of `--line-width-frame`
 * (.rules-header, .week-door, .fragment-seal, .manifest-pointer), which is
 * where weight was always meant to go. Noir still lays a 4px slab under its
 * headers and down its seals — it just no longer lays one around the box you
 * tick. That is the whole of this ruling: the archetype guarantees legibility
 * (D126); it does not get to spend it.
 *
 * B&W PRINT LAW: every value here reads without hue. Identity is carried by
 * weight, pattern and structure — a hatch, a neatline, a double rule, an
 * inverted slug — so the book survives a photocopier, which is the only
 * printer some of these will ever meet.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * W6 — THE AUTHORED DESIGN LANGUAGE COMPOSES OVER ALL OF THE ABOVE
 * ═══════════════════════════════════════════════════════════════════════════
 * VISION §8: *authored design language wins; the archetype guarantees
 * legibility.* Everything above this line is now the FLOOR — a guarantee that
 * any book renders coherently and prints in black and white. `meta.designLanguage`
 * (contracts/contract-constants.mjs) is the book's own design decisions, and
 * `composeDesignLanguage()` below presses them onto that floor.
 *
 * PRECEDENCE, one sentence: preset ← designLanguage ← theme.tokens, with
 * theme.palette still winning the six colours it names. More explicit authoring
 * outranks less explicit authoring at every step, which is the only ordering
 * that does not surprise someone reading a book's JSON top to bottom.
 *
 * A BOOK WITH NO designLanguage IS BYTE-IDENTICAL TO PRE-W6. Nothing is emitted,
 * no attribute is stamped, and every `var(--x, default)` in booklet.css falls
 * back exactly as it did. That invariant is what makes the archetype's demotion
 * provably harmless, and the visual suite's untouched baselines are its proof.
 *
 * THE INTENSITY SPLIT (a refusal, recorded — D115's Drawing Law applied to the
 * research's flagship axis). `layoutIntensity` is the Mothership↔Mörk Borg
 * spectrum, and the research defines that spectrum in two halves:
 *   • ITS INK — bar weight, framing, slug inversion, ornament pressure, how
 *     hard the texture is pushed. All paint. SHIPPED, below.
 *   • ITS GEOMETRY — column counts, page margins, the type scale, whitespace as
 *     structure. REFUSED. Phase-1 estimation has no DOM, cannot resolve a
 *     custom property, and would keep charging the old height while the page
 *     rendered a new one; `overflow:hidden` would eat the difference as ink.
 *     That is D71/D105/D118 arriving a fifth time, and the answer is the same:
 *     a geometry axis is admissible only when the estimate can SEE it.
 *
 * WHICH IS EXACTLY WHY `typeVoice` IS ADMISSIBLE AND THE OTHERS ARE NOT. A type
 * pairing changes the face, and a face change is an advance-width change — pure
 * geometry. It ships because D121 built the channel that measures it:
 * `resolveTypeMetrics(tokens)` runs at the END of resolveTheme, AFTER this
 * composition, so it reads the faces the BOOK chose and every atom estimate is
 * corrected through `advancePx`/`advanceRatio`. typeVoice is therefore NOT a
 * Drawing-Law axis and must never be gated as one: its gate is D121's — every
 * face measured in FACE_ADVANCE_EM, and zero new overflow.
 *
 * Axis → consumer, kept complete (the same contract as the list above):
 *
 *   layoutIntensity   → --design-intensity (a number, for calc)
 *                     → --design-header-bar   → .page-header box-shadow
 *                     → --design-frame        → .page-boundary box-shadow
 *                     → --design-slug-fill/-ink → .doc-label, .week-kicker
 *                     → --design-texture-press → the ::after texture opacity
 *   productionTexture → [data-production-texture] → --theme-page-texture,
 *                       overriding the archetype's own (which stays the
 *                       FALLBACK: 'none' or absent leaves the preset standing)
 *   toneTexture       → --design-tone-pattern → every flat value THIS system
 *                       lays down: the margin band, the inverted slug, the
 *                       designation fill, the stamped-file ring. Deliberately
 *                       NOT any gameplay-state fill and NOT any surface a
 *                       pencil writes on — the D126 --fog-opacity refusal is
 *                       the precedent and it binds here.
 *   typeVoice         → --font-display/-body/-mono/-accent (see above)
 *   documentRecipes   → [data-recipe-<family>] × .fragment-block[data-document-family]
 *   marginSemantics   → [data-margin-semantics] → the page ::after band layer
 *   inkDiscipline     → --design-ink-coverage, and --theme-page-filter at
 *                       'crushed' alone
 *   sealTreatment     → [data-seal-treatment] → .fragment-seal, .cover-designation
 */
const THEME_PRESETS = {
  pastoral: {
    '--font-display': '"Playfair Display", Georgia, serif',
    '--font-body': '"Libre Baskerville", Georgia, serif',
    '--font-mono': '"Share Tech Mono", monospace',
    '--font-accent': '"Share Tech Mono", monospace',
    '--weight-body': '400',
    '--weight-heading': '700',
    '--weight-label': '400',
    '--weight-emphasis': '700',
    '--page-ink': '#181714',
    '--page-paper': '#f1ebe0',
    '--page-secondary-paper': '#efe5d7',
    '--page-accent': '#8b2a2a',
    '--page-muted': '#857d72',
    '--page-rule': '#ccc5b6',
    '--page-fog': '#ddd6c5',
    '--page-surface': '#f1ebe0',
    '--page-underlay': 'linear-gradient(180deg, rgba(255,255,255,.045) 0%, rgba(0,0,0,.012) 100%)',
    '--panel-surface': 'rgba(246,241,231,0.82)',
    '--panel-secondary-surface': 'rgba(235,228,212,0.42)',
    '--card-surface': 'rgba(244,239,228,0.72)',
    '--line-style': 'solid',
    '--line-width-hair': '1px',
    // Pastoral values below are the rendered truth: separators/field rules
    // are 1px and canonical prose is 8pt in booklet.css. (These tokens were
    // dead until the bridge wiring; correcting them here keeps the pastoral
    // demo pixel-identical now that they render.)
    '--line-width-rule': '1px',
    '--line-width-frame': '1.5px',
    '--surface-radius': '3px',
    '--surface-shadow': '0 6px 14px rgba(0,0,0,0.025)',
    '--page-shadow': '0 18px 30px rgba(0,0,0,0.12)',
    '--noise-opacity': '0.055',
    '--fog-opacity': '0.1',
    '--rule-opacity': '0.75',
    '--stamp-opacity': '0.85',
    '--label-size': '6.3pt',
    '--label-spacing': '0.28em',
    '--label-transform': 'uppercase',
    '--heading-style': 'italic',
    '--heading-size-xl': '32pt',
    '--heading-size-lg': '16pt',
    '--heading-size-md': '11pt',
    '--body-size': '8pt',
    '--body-line-height': '1.58',
    '--small-size': '6.2pt',
    '--mono-size': '6.4pt',
    '--grid-stroke-style': 'solid',
    '--grid-dot-opacity': '0.24',
    '--grid-fill': 'rgba(204,197,182,0.28)',
    '--track-fill': 'rgba(221,214,197,0.38)',
    '--badge-style': 'normal',
    '--callout-surface': 'rgba(241,235,224,0.28)',
    '--highlight-surface': 'rgba(139,42,42,0.07)',
    '--page-margin': '0.3in',
    '--page-live-top': '0.3in',
    '--page-live-right': '0.3in',
    '--page-live-bottom': '0.28in',
    '--page-live-left': '0.3in',
    // ── character: the demo's own look, now stated rather than special-cased.
    // Pastoral is the refactor oracle (visual-regression baselines), so every
    // value here is the rendered truth of the selectors it replaced.
    '--cover-padding': '0',
    '--card-border': 'rgba(188,180,165,0.8)',
    '--doc-radius': '2px'
  },
  government: {
    '--font-display': '"Playfair Display", Georgia, serif',
    '--font-body': '"IBM Plex Mono", "Courier New", Courier, monospace',
    '--font-mono': '"IBM Plex Mono", "Courier New", Courier, monospace',
    '--font-accent': '"Share Tech Mono", monospace',
    '--weight-body': '400',
    '--weight-heading': '700',
    '--weight-label': '600',
    '--weight-emphasis': '700',
    '--page-ink': '#111111',
    '--page-paper': '#e6dfd1',
    '--page-secondary-paper': '#ded2be',
    '--page-accent': '#a33b3b',
    '--page-muted': '#5e5a51',
    '--page-rule': '#a33b3b',
    '--page-fog': '#dacfbe',
    '--page-surface': 'linear-gradient(180deg, #e6dfd1 0%, #dacfbe 100%)',
    '--page-underlay': 'none',
    '--panel-surface': 'linear-gradient(180deg, rgba(230, 223, 209, 0.98) 0%, rgba(218, 207, 190, 0.92) 100%)',
    '--panel-secondary-surface': 'transparent',
    '--card-surface': 'transparent',
    '--line-style': 'solid',
    '--line-width-hair': '1px',
    '--line-width-rule': '1.5px',
    '--line-width-frame': '2px',
    '--surface-radius': '0px',
    '--surface-shadow': '0 18px 34px rgba(0, 0, 0, 0.08)',
    '--page-shadow': '0 24px 56px rgba(0, 0, 0, 0.20)',
    '--noise-opacity': '0.12',
    '--fog-opacity': '0.1',
    '--rule-opacity': '0.8',
    '--stamp-opacity': '0.9',
    '--label-size': '6pt',
    '--label-spacing': '0.28em',
    '--label-transform': 'uppercase',
    '--heading-style': 'italic',
    '--heading-size-xl': '38pt',
    '--heading-size-lg': '16pt',
    '--heading-size-md': '12pt',
    '--body-size': '9pt',
    '--body-line-height': '1.5',
    '--small-size': '6.2pt',
    '--mono-size': '6.4pt',
    '--grid-stroke-style': 'solid',
    '--grid-dot-opacity': '0.5',
    '--grid-fill': 'rgba(163, 59, 59, 0.08)',
    '--track-fill': 'rgba(218, 207, 190, 0.4)',
    '--badge-style': 'normal',
    '--callout-surface': 'rgba(218, 207, 190, 0.22)',
    '--highlight-surface': 'rgba(163, 59, 59, 0.12)',
    '--page-margin': '0.4in',
    // ── character: a bureaucratic instrument. Security-paper hatch, a ruled
    // box around the live area (the book IS a form), a double rule under every
    // header, and a classification slug stamped in the file-red. The red is
    // authority, never warmth — cards are ruled in ink so the red stays rare.
    '--page-texture': 'repeating-linear-gradient(45deg, rgba(17,17,17,0.035) 0 1px, transparent 1px 7px)',
    '--live-frame': '1px solid rgba(94,90,81,0.45)',
    '--live-frame-offset': '5px',
    '--header-shadow': '0 2px 0 -1px rgba(94,90,81,0.6)',
    '--card-border': 'rgba(17,17,17,0.42)',
    '--designation-fill': 'rgba(163,59,59,0.1)',
    '--designation-border': '#a33b3b',
    '--designation-border-width': '1.5px',
    '--designation-padding': '2px 8px',
    '--cover-title-case': 'uppercase',
    '--cover-title-spacing': '0.02em'
  },
  cyberpunk: {
    '--font-display': '"Share Tech Mono", monospace',
    '--font-body': '"IBM Plex Mono", monospace',
    '--font-mono': '"IBM Plex Mono", monospace',
    '--font-accent': '"Share Tech Mono", monospace',
    '--weight-body': '400',
    '--weight-heading': '600',
    '--weight-label': '600',
    '--weight-emphasis': '700',
    '--page-ink': '#00ffcc',
    '--page-paper': '#0a0a0a',
    '--page-accent': '#ff00ff',
    '--page-muted': '#008866',
    '--page-rule': '#00ffcc',
    '--page-fog': '#111111',
    '--page-surface': 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
    '--page-underlay': 'repeating-linear-gradient(180deg, rgba(0,255,204,0.06) 0 2px, transparent 2px 4px)',
    '--panel-surface': 'linear-gradient(180deg, rgba(10,10,10,0.95) 0%, rgba(17,17,17,0.92) 100%)',
    '--panel-secondary-surface': 'linear-gradient(180deg, rgba(0,255,204,0.1) 0%, transparent 100%)',
    '--card-surface': 'rgba(17,17,17,0.8)',
    '--line-style': 'solid',
    '--line-width-hair': '1px',
    '--line-width-rule': '1px',
    '--line-width-frame': '2px',
    '--surface-radius': '0px',
    '--surface-shadow': '0 0px 20px rgba(0, 255, 204, 0.2)',
    '--page-shadow': '0 24px 50px rgba(0,0,0,0.6)',
    '--noise-opacity': '0.2',
    '--fog-opacity': '0.3',
    '--rule-opacity': '1',
    '--stamp-opacity': '1',
    '--label-size': '7pt',
    '--label-spacing': '0.2em',
    '--label-transform': 'uppercase',
    '--heading-style': 'normal',
    '--heading-size-xl': '24pt',
    '--heading-size-lg': '14pt',
    '--heading-size-md': '10pt',
    '--body-size': '8pt',
    '--body-line-height': '1.4',
    '--small-size': '6pt',
    '--mono-size': '8pt',
    '--grid-stroke-style': 'dotted',
    '--grid-dot-opacity': '0.5',
    '--grid-fill': 'rgba(0, 255, 204, 0.1)',
    '--track-fill': 'rgba(0, 255, 204, 0.2)',
    '--badge-style': 'normal',
    '--callout-surface': 'rgba(255, 0, 255, 0.1)',
    '--highlight-surface': 'rgba(0, 255, 204, 0.15)',
    '--page-margin': '0.3in',
    // ── character: a screen that leaked onto paper. The underlay already
    // scans; this adds the phosphor column grid, a hard neon keyline at the
    // trim, and a bloom under the headers. Reads in B&W as a fine vertical
    // rule field inside a heavy black border.
    '--page-texture': 'repeating-linear-gradient(90deg, rgba(0,255,204,0.055) 0 1px, transparent 1px 4px)',
    '--page-edge': '1px solid rgba(0,255,204,0.55)',
    '--header-shadow': '0 2px 0 -1px rgba(0,255,204,0.4)',
    '--designation-fill': 'rgba(255,0,255,0.12)',
    '--designation-border': 'rgba(255,0,255,0.6)',
    '--designation-padding': '1px 7px'
  },
  scifi: {
    '--font-display': 'system-ui, -apple-system, sans-serif',
    '--font-body': 'system-ui, -apple-system, sans-serif',
    '--font-mono': '"IBM Plex Mono", monospace',
    '--font-accent': 'system-ui, -apple-system, sans-serif',
    '--weight-body': '400',
    '--weight-heading': '600',
    '--weight-label': '500',
    '--weight-emphasis': '700',
    '--page-ink': '#222222',
    '--page-paper': '#ffffff',
    '--page-accent': '#0066ff',
    '--page-muted': '#888888',
    '--page-rule': '#e0e0e0',
    '--page-fog': '#f5f7fa',
    '--page-surface': 'linear-gradient(180deg, #ffffff 0%, #f5f7fa 100%)',
    '--page-underlay': 'none',
    '--panel-surface': 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,247,250,0.92) 100%)',
    '--panel-secondary-surface': 'rgba(245,247,250,0.8)',
    '--card-surface': 'rgba(255,255,255,1)',
    '--line-style': 'solid',
    '--line-width-hair': '1px',
    '--line-width-rule': '1px',
    '--line-width-frame': '1.5px',
    '--surface-radius': '4px',
    '--surface-shadow': '0 8px 24px rgba(0, 102, 255, 0.08)',
    '--page-shadow': '0 24px 40px rgba(0,0,0,0.1)',
    '--noise-opacity': '0.02',
    '--fog-opacity': '0.05',
    '--rule-opacity': '1',
    '--stamp-opacity': '0.9',
    '--label-size': '6.5pt',
    '--label-spacing': '0.15em',
    '--label-transform': 'uppercase',
    '--heading-style': 'normal',
    '--heading-size-xl': '28pt',
    '--heading-size-lg': '16pt',
    '--heading-size-md': '11pt',
    '--body-size': '8.5pt',
    '--body-line-height': '1.6',
    '--small-size': '6.5pt',
    '--mono-size': '7.5pt',
    '--grid-stroke-style': 'solid',
    '--grid-dot-opacity': '0.2',
    '--grid-fill': 'rgba(0, 102, 255, 0.04)',
    '--track-fill': 'rgba(224, 224, 224, 0.4)',
    '--badge-style': 'normal',
    '--callout-surface': 'rgba(0, 102, 255, 0.06)',
    '--highlight-surface': 'rgba(0, 102, 255, 0.1)',
    '--page-margin': '0.45in',
    // ── character: a clinical instrument readout. Nothing is heavy; everything
    // is registered. A measurement dot-field under the page, a hairline
    // containment frame well inside the trim, and a pill-shaped status slug.
    // In B&W it reads as the calmest page in the corpus — that IS the identity.
    '--page-texture': 'radial-gradient(rgba(0,102,255,0.16) 17%, transparent 18%)',
    '--page-texture-size': '14px 14px',
    '--live-frame': '1px solid rgba(0,102,255,0.18)',
    '--live-frame-offset': '7px',
    '--designation-fill': 'rgba(0,102,255,0.08)',
    '--designation-border': 'rgba(0,102,255,0.38)',
    '--designation-padding': '2px 7px',
    '--cover-title-spacing': '-0.01em'
  },
  fantasy: {
    '--font-display': '"Playfair Display", serif',
    '--font-body': '"Libre Baskerville", serif',
    // THE MONO SLOT MUST NAME A MONOSPACE (Teeth T6b, 2026-08-12). This preset
    // declared "Libre Baskerville" here — a proportional serif in the slot the
    // machine-voice surfaces read. That is live TODAY, freeze or no freeze: 16
    // rules take `--font-mono` through `--theme-label-family` rather than the
    // frozen `--mono` alias (`.map-title`, `.ledger-head`, `.cite-ref`,
    // `.boss-mechanism`, `.week-kicker`, `.cipher-zone::before`, the
    // `.fragment-seal-*` pair…), so fantasy printed its whole instrument voice
    // in a book serif. Of the two monospaces the vendored set carries (D92 —
    // IBM Plex Mono and Share Tech Mono), IBM Plex Mono is the one an
    // illuminated field book can hold: its typewriter lineage reads as the
    // surveyor's tally sheet bound in with the parchment, where Share Tech
    // Mono's squared terminal forms would be a screen on a gilt page.
    '--font-mono': '"IBM Plex Mono", monospace',
    '--font-accent': '"Playfair Display", serif',
    '--weight-body': '400',
    '--weight-heading': '700',
    '--weight-label': '600',
    '--weight-emphasis': '700',
    '--page-ink': '#1a3322',
    '--page-paper': '#f4ecc2',
    '--page-accent': '#c5a059',
    '--page-muted': '#5c6b5d',
    '--page-rule': '#c5a059',
    '--page-fog': '#eaddad',
    '--page-surface': 'linear-gradient(180deg, #f4ecc2 0%, #eaddad 100%)',
    '--page-underlay': 'none',
    '--panel-surface': 'linear-gradient(180deg, rgba(244,236,194,0.98) 0%, rgba(234,221,173,0.92) 100%)',
    '--panel-secondary-surface': 'transparent',
    '--card-surface': 'transparent',
    '--line-style': 'solid',
    '--line-width-hair': '1px',
    '--line-width-rule': '1.5px',
    '--line-width-frame': '2.5px',
    '--surface-radius': '0px',
    '--surface-shadow': '0 18px 34px rgba(26, 51, 34, 0.15)',
    '--page-shadow': '0 24px 56px rgba(0, 0, 0, 0.25)',
    '--noise-opacity': '0.15',
    '--fog-opacity': '0.2',
    '--rule-opacity': '0.8',
    '--stamp-opacity': '0.7',
    '--label-size': '7pt',
    '--label-spacing': '0.15em',
    '--label-transform': 'uppercase',
    '--heading-style': 'italic',
    '--heading-size-xl': '32pt',
    '--heading-size-lg': '16pt',
    '--heading-size-md': '12pt',
    '--body-size': '9pt',
    '--body-line-height': '1.55',
    '--small-size': '6.5pt',
    '--mono-size': '8pt',
    '--grid-stroke-style': 'dotted',
    '--grid-dot-opacity': '0.6',
    '--grid-fill': 'rgba(197, 160, 89, 0.1)',
    '--track-fill': 'rgba(234, 221, 173, 0.5)',
    '--badge-style': 'italic',
    '--callout-surface': 'rgba(197, 160, 89, 0.15)',
    '--highlight-surface': 'rgba(26, 51, 34, 0.1)',
    '--page-margin': '0.36in',
    // ── character: an illuminated field book. Parchment mottles (three soft
    // stains, page-sized so they never tile into wallpaper), a gilt double
    // plate frame around the live area, and a gold hairline doubling every
    // header rule. B&W-safe: the frame is a DOUBLE rule, not a gold one.
    '--page-texture': 'radial-gradient(circle at 22% 18%, rgba(197,160,89,0.13) 0 7%, transparent 8%), '
      + 'radial-gradient(circle at 78% 58%, rgba(92,107,93,0.09) 0 6%, transparent 7%), '
      + 'radial-gradient(circle at 41% 88%, rgba(197,160,89,0.1) 0 5%, transparent 6%)',
    '--live-frame': '3px double rgba(197,160,89,0.62)',
    '--live-frame-offset': '5px',
    '--header-shadow': '0 2px 0 -1px rgba(197,160,89,0.7)',
    '--designation-border': 'rgba(197,160,89,0.8)',
    '--designation-padding': '2px 9px'
  },
  noir: {
    '--font-display': '"Share Tech Mono", monospace',
    '--font-body': '"IBM Plex Mono", monospace',
    '--font-mono': '"IBM Plex Mono", monospace',
    '--font-accent': '"Share Tech Mono", monospace',
    // WEIGHT IS A HIERARCHY, NOT A VOLUME KNOB (D145). This was 600, and
    // `--theme-body-weight` reaches exactly one rule — ten PROSE selectors
    // (.rules-body, .boss-narrative, .interlude-body, .fragment-doc-body, …).
    // So noir set every narrative paragraph in the book to semibold, which cost
    // it the two things it was trying to buy: the page went uniformly dark
    // instead of high-contrast, and `strong` at 700 had a single weight step to
    // work with, so emphasis stopped reading as emphasis. Noir's identity is
    // CONTRAST — a stark display face, a 4px slab under the headers, a reversed
    // black designation slug, a mourning keyline at the trim — and every one of
    // those gets LOUDER against a 400 body, not quieter. IBM Plex Mono ships
    // real 400/500/600/700 faces and is a true monospace, so the advance is
    // identical at every weight: this is paint, and the estimate cannot see it.
    '--weight-body': '400',
    '--weight-heading': '700',
    '--weight-label': '700',
    '--weight-emphasis': '700',
    '--page-ink': '#000000',
    '--page-paper': '#e4e4e4',
    '--page-accent': '#000000',
    '--page-muted': '#555555',
    '--page-rule': '#000000',
    '--page-fog': '#c8c8c8',
    '--page-surface': 'linear-gradient(180deg, #e4e4e4 0%, #d0d0d0 100%)',
    '--page-underlay': 'none',
    '--panel-surface': 'linear-gradient(180deg, rgba(228,228,228,0.98) 0%, rgba(200,200,200,0.92) 100%)',
    '--panel-secondary-surface': 'rgba(0,0,0,0.05)',
    '--card-surface': 'linear-gradient(180deg, rgba(228,228,228,0.98) 0%, rgba(200,200,200,0.92) 100%)',
    '--line-style': 'solid',
    '--line-width-hair': '1.5px',
    '--line-width-rule': '2.5px',
    '--line-width-frame': '4px',
    '--surface-radius': '0px',
    '--surface-shadow': '0 20px 40px rgba(0,0,0,0.4)',
    '--page-shadow': '0 24px 60px rgba(0,0,0,0.5)',
    '--noise-opacity': '0.25',
    '--fog-opacity': '0.1',
    '--rule-opacity': '1',
    '--stamp-opacity': '0.9',
    '--label-size': '7.5pt',
    '--label-spacing': '0.2em',
    '--label-transform': 'uppercase',
    '--heading-style': 'normal',
    '--heading-size-xl': '26pt',
    '--heading-size-lg': '15pt',
    '--heading-size-md': '11pt',
    '--body-size': '8.5pt',
    '--body-line-height': '1.5',
    '--small-size': '7pt',
    '--mono-size': '8.5pt',
    '--grid-stroke-style': 'solid',
    '--grid-dot-opacity': '0.8',
    '--grid-fill': 'rgba(0,0,0,0.08)',
    '--track-fill': 'rgba(0,0,0,0.15)',
    '--badge-style': 'normal',
    '--callout-surface': 'rgba(0,0,0,0.08)',
    '--highlight-surface': 'rgba(0,0,0,0.15)',
    '--page-margin': '0.35in',
    // ── character: newsprint and stamped ink. A halftone dot screen over the
    // whole page, a mourning-card keyline at the trim, a heavy second rule
    // under every header, and a designation slug printed in REVERSE — solid
    // black box, paper-coloured text. Pure structure; no hue anywhere.
    '--page-texture': 'radial-gradient(rgba(0,0,0,0.11) 21%, transparent 22%)',
    '--page-texture-size': '3px 3px',
    '--page-edge': '2.5px solid #000000',
    '--header-shadow': '0 3px 0 -1px #000000',
    '--card-border': 'rgba(0,0,0,0.55)',
    '--designation-fill': '#000000',
    '--designation-ink': '#e4e4e4',
    '--designation-border': '#000000',
    '--designation-border-width': '1.5px',
    '--designation-padding': '2px 9px',
    '--cover-title-case': 'uppercase',
    '--cover-title-spacing': '0.04em'
  },
  steampunk: {
    '--font-display': '"Playfair Display", serif',
    '--font-body': '"Libre Baskerville", serif',
    '--font-mono': '"IBM Plex Mono", monospace',
    '--font-accent': '"Share Tech Mono", monospace',
    '--weight-body': '400',
    '--weight-heading': '700',
    '--weight-label': '600',
    '--weight-emphasis': '700',
    '--page-ink': '#3e2f24',
    '--page-paper': '#d9c8b4',
    '--page-accent': '#b87333',
    '--page-muted': '#7a6452',
    '--page-rule': '#b5a642',
    '--page-fog': '#c4b09c',
    '--page-surface': 'linear-gradient(180deg, #d9c8b4 0%, #c4b09c 100%)',
    '--page-underlay': 'none',
    '--panel-surface': 'linear-gradient(180deg, rgba(217,200,180,0.98) 0%, rgba(196,176,156,0.92) 100%)',
    '--panel-secondary-surface': 'rgba(184,115,51,0.08)',
    '--card-surface': 'linear-gradient(180deg, rgba(217,200,180,0.98) 0%, rgba(196,176,156,0.92) 100%)',
    '--line-style': 'double',
    '--line-width-hair': '1px',
    '--line-width-rule': '3px',
    '--line-width-frame': '4px',
    '--surface-radius': '0px',
    '--surface-shadow': '0 18px 34px rgba(62, 47, 36, 0.25)',
    '--page-shadow': '0 24px 50px rgba(0,0,0,0.3)',
    '--noise-opacity': '0.18',
    '--fog-opacity': '0.2',
    '--rule-opacity': '0.9',
    '--stamp-opacity': '0.8',
    '--label-size': '6.5pt',
    '--label-spacing': '0.22em',
    '--label-transform': 'uppercase',
    '--heading-style': 'normal',
    '--heading-size-xl': '28pt',
    '--heading-size-lg': '15pt',
    '--heading-size-md': '11pt',
    '--body-size': '8.5pt',
    '--body-line-height': '1.5',
    '--small-size': '6.2pt',
    '--mono-size': '7.5pt',
    '--grid-stroke-style': 'solid',
    '--grid-dot-opacity': '0.5',
    '--grid-fill': 'rgba(184, 115, 51, 0.1)',
    '--track-fill': 'rgba(181, 166, 66, 0.2)',
    '--badge-style': 'normal',
    '--callout-surface': 'rgba(184, 115, 51, 0.15)',
    '--highlight-surface': 'rgba(181, 166, 66, 0.15)',
    '--page-margin': '0.38in',
    // ── character: an engraved technical plate. The engraver's diagonal hatch
    // under everything, a brass double frame, and hatched panel interiors so
    // the boxes read as plates rather than cards. `--line-style: double`
    // already doubles every border; this finishes the job it started.
    '--page-texture': 'repeating-linear-gradient(-45deg, rgba(62,47,36,0.05) 0 1px, transparent 1px 5px)',
    '--live-frame': '3px double rgba(184,115,51,0.5)',
    '--live-frame-offset': '5px',
    '--header-shadow': '0 2px 0 -1px rgba(184,115,51,0.6)',
    '--designation-border': 'rgba(184,115,51,0.75)',
    '--designation-border-width': '1.5px',
    '--designation-padding': '2px 8px'
  },
  minimalist: {
    '--font-display': 'system-ui, -apple-system, sans-serif',
    '--font-body': 'system-ui, -apple-system, sans-serif',
    '--font-mono': '"IBM Plex Mono", monospace',
    '--font-accent': 'system-ui, -apple-system, sans-serif',
    '--weight-body': '400',
    '--weight-heading': '600',
    '--weight-label': '600',
    '--weight-emphasis': '700',
    '--page-ink': '#000000',
    '--page-paper': '#ffffff',
    '--page-accent': '#000000',
    '--page-muted': '#888888',
    '--page-rule': '#e0e0e0',
    '--page-fog': '#fdfdfd',
    '--page-surface': '#ffffff',
    '--page-underlay': 'none',
    '--panel-surface': '#ffffff',
    '--panel-secondary-surface': '#fcfcfc',
    '--card-surface': '#ffffff',
    '--line-style': 'solid',
    '--line-width-hair': '1px',
    '--line-width-rule': '1px',
    '--line-width-frame': '2px',
    '--surface-radius': '0px',
    '--surface-shadow': 'none',
    '--page-shadow': '0 20px 40px rgba(0,0,0,0.05)',
    '--noise-opacity': '0.01',
    '--fog-opacity': '0',
    '--rule-opacity': '1',
    '--stamp-opacity': '1',
    '--label-size': '6pt',
    '--label-spacing': '0.25em',
    '--label-transform': 'uppercase',
    '--heading-style': 'normal',
    '--heading-size-xl': '30pt',
    '--heading-size-lg': '16pt',
    '--heading-size-md': '11pt',
    '--body-size': '8.5pt',
    '--body-line-height': '1.65',
    '--small-size': '6.5pt',
    '--mono-size': '7.5pt',
    '--grid-stroke-style': 'solid',
    '--grid-dot-opacity': '0.1',
    '--grid-fill': 'rgba(0,0,0,0.02)',
    '--track-fill': 'rgba(0,0,0,0.05)',
    '--badge-style': 'normal',
    '--callout-surface': 'rgba(0,0,0,0.03)',
    '--highlight-surface': 'rgba(0,0,0,0.06)',
    '--page-margin': '0.5in',
    // ── character: restraint IS the identity. Everything an archetype could
    // add, this one refuses: no texture, no frame, no doubled rule, no grain.
    // What's left has to carry it — true black on true white, the widest
    // margin in the corpus, a card border you can actually see (the #e0e0e0
    // rule made cards vanish, which read as unstyled rather than austere), and
    // ONE reversed block: the designation slug in solid ink. Swiss, not blank.
    '--page-texture': 'none',
    '--noise-opacity': '0',
    '--card-border': 'rgba(0,0,0,0.24)',
    '--designation-fill': '#000000',
    '--designation-ink': '#ffffff',
    '--designation-border': '#000000',
    '--designation-padding': '2px 8px',
    '--cover-title-spacing': '-0.03em'
  },
  nautical: {
    '--font-display': '"Playfair Display", serif',
    '--font-body': '"Libre Baskerville", serif',
    '--font-mono': '"IBM Plex Mono", monospace',
    '--font-accent': '"Libre Baskerville", serif',
    '--weight-body': '400',
    '--weight-heading': '700',
    '--weight-label': '600',
    '--weight-emphasis': '700',
    '--page-ink': '#001a33',
    '--page-paper': '#f5f5dc',
    '--page-accent': '#8a3324',
    '--page-muted': '#5c6b73',
    '--page-rule': '#334c66',
    '--page-fog': '#e6e6cc',
    '--page-surface': 'linear-gradient(180deg, #f5f5dc 0%, #e6e6cc 100%)',
    '--page-underlay': 'none',
    '--panel-surface': 'linear-gradient(180deg, rgba(245,245,220,0.98) 0%, rgba(230,230,204,0.92) 100%)',
    '--panel-secondary-surface': 'rgba(0,26,51,0.05)',
    '--card-surface': 'transparent',
    '--line-style': 'solid',
    '--line-width-hair': '1px',
    '--line-width-rule': '1.5px',
    '--line-width-frame': '2px',
    '--surface-radius': '0px',
    '--surface-shadow': '0 16px 30px rgba(0, 26, 51, 0.15)',
    '--page-shadow': '0 24px 50px rgba(0,0,0,0.2)',
    '--noise-opacity': '0.1',
    '--fog-opacity': '0.15',
    '--rule-opacity': '0.85',
    '--stamp-opacity': '0.85',
    '--label-size': '6.8pt',
    '--label-spacing': '0.22em',
    '--label-transform': 'uppercase',
    '--heading-style': 'normal',
    '--heading-size-xl': '26pt',
    '--heading-size-lg': '15pt',
    '--heading-size-md': '11pt',
    '--body-size': '8.5pt',
    '--body-line-height': '1.58',
    '--small-size': '6.4pt',
    '--mono-size': '7.2pt',
    '--grid-stroke-style': 'solid',
    '--grid-dot-opacity': '0.4',
    '--grid-fill': 'rgba(138, 51, 36, 0.08)',
    '--track-fill': 'rgba(51, 76, 102, 0.2)',
    '--badge-style': 'normal',
    '--callout-surface': 'rgba(51, 76, 102, 0.1)',
    '--highlight-surface': 'rgba(138, 51, 36, 0.15)',
    '--page-margin': '0.36in',
    // ── character: the chart room. A plotted graticule under the whole page, a
    // double neatline around the live area exactly as a chart is bordered,
    // logbook ruling inside every card, and badges in chart-blue so the red
    // accent stays what it is on a chart — a correction, not a decoration.
    '--page-texture': 'repeating-linear-gradient(90deg, rgba(0,26,51,0.055) 0 1px, transparent 1px 34px), '
      + 'repeating-linear-gradient(180deg, rgba(0,26,51,0.055) 0 1px, transparent 1px 34px)',
    '--live-frame': '3px double rgba(0,26,51,0.34)',
    '--live-frame-offset': '4px',
    '--header-shadow': '0 2px 0 -1px rgba(51,76,102,0.55)',
    '--badge-color': '#334c66',
    '--designation-border': 'rgba(51,76,102,0.6)',
    '--designation-padding': '2px 8px'
  },
  occult: {
    '--font-display': '"Playfair Display", serif',
    '--font-body': '"Libre Baskerville", serif',
    // THE MONO SLOT MUST NAME A MONOSPACE — see the same note under `fantasy`.
    // IBM Plex Mono for the same reason fantasy takes it: a handled manuscript
    // can hold a TYPED apparatus (the archivist's slip, the transcription) but
    // never a terminal readout.
    //
    // MEASURED COST of both repairs, paired A/B over 20 books × 3 archetypes
    // (scratchpad harness, HEAD theme.js route-intercepted against the tree):
    // pastoral 0 of 20 combos moved a single element; occult and fantasy move
    // 4–423 elements per book with ZERO page-count moves, zero boundary
    // overflow, and horizontal spill unchanged at 486 elements. One cost, and
    // it is real: vale-a-record-of-orcus FORCED to occult gains a 5px internal
    // clip on its gauge-log page. Vale ships as noir, so no book in the corpus
    // regresses — but the combination exists and this is where it is recorded.
    '--font-mono': '"IBM Plex Mono", monospace',
    '--font-accent': '"Playfair Display", serif',
    '--weight-body': '400',
    '--weight-heading': '700',
    '--weight-label': '600',
    '--weight-emphasis': '700',
    '--page-ink': '#2a1a2e',
    '--page-paper': '#c2b28f',
    '--page-accent': '#8c001a',
    '--page-muted': '#5c4a63',
    '--page-rule': '#5a3d4a',
    '--page-fog': '#a69673',
    '--page-surface': 'linear-gradient(180deg, #c2b28f 0%, #a69673 100%)',
    '--page-underlay': 'none',
    '--panel-surface': 'linear-gradient(180deg, rgba(194,178,143,0.98) 0%, rgba(166,150,115,0.92) 100%)',
    '--panel-secondary-surface': 'rgba(140,0,26,0.06)',
    '--card-surface': 'transparent',
    '--line-style': 'solid',
    '--line-width-hair': '1px',
    '--line-width-rule': '1.5px',
    '--line-width-frame': '2.5px',
    '--surface-radius': '0px',
    '--surface-shadow': '0 20px 38px rgba(42, 26, 46, 0.25)',
    '--page-shadow': '0 24px 60px rgba(0,0,0,0.4)',
    '--noise-opacity': '0.22',
    '--fog-opacity': '0.25',
    '--rule-opacity': '0.9',
    '--stamp-opacity': '0.8',
    '--label-size': '6.5pt',
    '--label-spacing': '0.18em',
    '--label-transform': 'uppercase',
    '--heading-style': 'italic',
    '--heading-size-xl': '30pt',
    '--heading-size-lg': '16pt',
    '--heading-size-md': '12pt',
    '--body-size': '9pt',
    '--body-line-height': '1.45',
    '--small-size': '6.4pt',
    '--mono-size': '8pt',
    '--grid-stroke-style': 'dotted',
    '--grid-dot-opacity': '0.7',
    '--grid-fill': 'rgba(140, 0, 26, 0.08)',
    '--track-fill': 'rgba(90, 61, 74, 0.3)',
    '--badge-style': 'italic',
    '--callout-surface': 'rgba(90, 61, 74, 0.15)',
    '--highlight-surface': 'rgba(140, 0, 26, 0.15)',
    '--page-margin': '0.36in',
    // ── character: a working manuscript that has been handled. Foxing stains
    // rather than a mechanical pattern (page-sized, never tiled — repetition
    // would read as printed decoration, and the point is damage), a grimoire's
    // double plate frame, and a designation with no box at all: the word
    // alone, in the blood red. The page grain is already the heaviest in the
    // corpus at 0.22 — the stains sit on top of it, not instead of it.
    '--page-texture': 'radial-gradient(circle at 16% 24%, rgba(90,61,74,0.12) 0 6%, transparent 7%), '
      + 'radial-gradient(circle at 74% 62%, rgba(140,0,26,0.08) 0 5%, transparent 6%), '
      + 'radial-gradient(circle at 46% 86%, rgba(90,61,74,0.09) 0 4%, transparent 5%), '
      + 'radial-gradient(circle at 88% 12%, rgba(90,61,74,0.07) 0 3%, transparent 4%)',
    '--live-frame': '3px double rgba(90,61,74,0.45)',
    '--live-frame-offset': '6px',
    '--badge-color': '#5a3d4a',
    '--designation-border': 'transparent',
    '--designation-ink': '#8c001a'
  }
};

const THEME_ALIASES = {
  institutional: 'government',
  terminal: 'scifi',
  clinical: 'minimalist',
  corporate: 'government',
  confessional: 'pastoral',
  literary: 'pastoral'
};

function normaliseThemeArchetype(value) {
  const requested = String(value || '').trim().toLowerCase();
  if (THEME_PRESETS[requested]) return requested;
  if (THEME_ALIASES[requested]) return THEME_ALIASES[requested];
  return 'pastoral';
}

/* ═════════════════════════════════════════════════════════════════════════════
   THE AUTHORED DESIGN LANGUAGE (W6)
   ═════════════════════════════════════════════════════════════════════════════ */

/**
 * The type pairings, composed from the FOUR VENDORED FACES AND NOTHING ELSE.
 *
 * Every stack here leads with a family that has a measured entry in
 * FACE_ADVANCE_EM (type-metrics.js), which is what makes this axis legal at all:
 * `resolveTypeMetrics()` reads the composed stacks and hands phase-1 estimation
 * a per-role advance delta, so a book that changes its face changes its
 * estimates with it. `typeMetricsFaceParity()` in scripts/validate.mjs scans
 * this table with the same regex it scans the presets with — adding a fifth
 * family here fails the build until it is vendored (D92) and measured (D121).
 *
 * The fallbacks after the first family are the same defensive stacks the presets
 * use and are never what renders: the vendored file is always present offline.
 */
const TYPE_VOICES = {
  // The book that was typeset. Display serif over a book serif, machine voice
  // in the typewriter face — an edition, not a document.
  'literary-press': {
    '--font-display': '"Playfair Display", Georgia, serif',
    '--font-body': '"Libre Baskerville", Georgia, serif',
    '--font-mono': '"IBM Plex Mono", "Courier New", Courier, monospace',
    '--font-accent': '"IBM Plex Mono", "Courier New", Courier, monospace'
  },
  // Everything through a machine. One voice, no book anywhere in it.
  'terminal-log': {
    '--font-display': '"Share Tech Mono", monospace',
    '--font-body': '"IBM Plex Mono", "Courier New", Courier, monospace',
    '--font-mono': '"Share Tech Mono", monospace',
    '--font-accent': '"Share Tech Mono", monospace'
  },
  // A working notebook: the hand's own face throughout, the machine only where
  // something was stamped onto it later.
  'field-notebook': {
    '--font-display': '"Libre Baskerville", Georgia, serif',
    '--font-body': '"Libre Baskerville", Georgia, serif',
    '--font-mono': '"Share Tech Mono", monospace',
    '--font-accent': '"Share Tech Mono", monospace'
  },
  // A carbon copy. One typewriter, start to finish, including the title.
  'typewriter-file': {
    '--font-display': '"IBM Plex Mono", "Courier New", Courier, monospace',
    '--font-body': '"IBM Plex Mono", "Courier New", Courier, monospace',
    '--font-mono': '"IBM Plex Mono", "Courier New", Courier, monospace',
    '--font-accent': '"IBM Plex Mono", "Courier New", Courier, monospace'
  },
  // A masthead over a body. This IS pastoral's own stack, named — a book may
  // author the archetype's pairing deliberately, and saying so is not a no-op:
  // it makes the choice legible in the JSON and immune to a preset change.
  broadsheet: {
    '--font-display': '"Playfair Display", Georgia, serif',
    '--font-body': '"Libre Baskerville", Georgia, serif',
    '--font-mono': '"Share Tech Mono", monospace',
    '--font-accent': '"Share Tech Mono", monospace'
  },
  // The collision Mörk Borg is built on: a display serif with nothing beneath
  // it that agrees. Deliberately uncomfortable, and legible anyway.
  'display-clash': {
    '--font-display': '"Playfair Display", Georgia, serif',
    '--font-body': '"IBM Plex Mono", "Courier New", Courier, monospace',
    '--font-accent': '"Share Tech Mono", monospace',
    '--font-mono': '"Share Tech Mono", monospace'
  },
  // The flattest register available: a book face for the title, machine for
  // everything a machine would have written.
  'plain-record': {
    '--font-display': '"Libre Baskerville", Georgia, serif',
    '--font-body': '"IBM Plex Mono", "Courier New", Courier, monospace',
    '--font-mono': '"IBM Plex Mono", "Courier New", Courier, monospace',
    '--font-accent': '"IBM Plex Mono", "Courier New", Courier, monospace'
  }
};

/**
 * The archetype's own place on the intensity spectrum — the FLOOR a book
 * inherits when it authors a design language but says nothing about intensity.
 * These are readings of the presets as they already stand (minimalist's whole
 * character is restraint; cyberpunk already paints a scan field over every
 * page), not new opinions, and they are only ever consulted for a book that
 * HAS a designLanguage. A specless book never reaches this table.
 */
const ARCHETYPE_INTENSITY = {
  minimalist: 0.15,
  scifi: 0.25,
  pastoral: 0.4,
  nautical: 0.45,
  government: 0.55,
  noir: 0.6,
  occult: 0.6,
  steampunk: 0.65,
  fantasy: 0.65,
  cyberpunk: 0.8
};

const DESIGN_ENUMS = {
  productionTexture: VALID_PRODUCTION_TEXTURES,
  toneTexture: TONE_TEXTURE_LADDER,
  typeVoice: VALID_TYPE_VOICES,
  marginSemantics: VALID_MARGIN_SEMANTICS,
  inkDiscipline: VALID_INK_DISCIPLINES,
  sealTreatment: VALID_SEAL_TREATMENTS
};

/**
 * The authored design language, normalised — or `null` when the book has none.
 *
 * `null` is load-bearing and is not the same as "all defaults": a book with no
 * design language stamps no attribute and emits no token, so it renders exactly
 * as it did before this system existed.
 *
 * An off-enum value is DROPPED rather than defaulted, for the reason the schema
 * gives `additionalProperties:false`: a value nothing draws must be absent, not
 * silently the default, or the render looks intentional and the misauthoring is
 * invisible. `layoutIntensity` is the one field that CLAMPS instead, because it
 * is a continuous range rather than a menu — 1.4 is a legible intention stated
 * out of bounds, where `producshun-texture` is not an intention at all. The
 * schema still refuses both; this is only what the renderer does with a book
 * that reached it anyway.
 */
function resolveDesignLanguage(data) {
  const raw = (((data || {}).meta || {}).designLanguage) || null;
  if (!raw || typeof raw !== 'object') return null;

  const spec = {};
  for (const key of Object.keys(DESIGN_ENUMS)) {
    if (DESIGN_ENUMS[key].indexOf(raw[key]) !== -1) spec[key] = raw[key];
  }

  const intensity = Number(raw.layoutIntensity);
  if (Number.isFinite(intensity)) {
    spec.layoutIntensity = Math.min(1, Math.max(0, intensity));
  }

  const recipes = raw.documentRecipes;
  if (recipes && typeof recipes === 'object') {
    const kept = {};
    for (const family of VALID_DOCUMENT_FAMILIES) {
      if (VALID_DOCUMENT_RECIPES.indexOf(recipes[family]) !== -1) kept[family] = recipes[family];
    }
    if (Object.keys(kept).length) spec.documentRecipes = kept;
  }

  return Object.keys(spec).length ? spec : null;
}

// The ink-coverage multiplier per discipline. One number that scales every
// drawn layer together, so a book reads as ONE impression rather than as a
// stack of independent effects.
const INK_COVERAGE = {
  'light-touch': 0.6,
  standard: 1,
  'heavy-press': 1.45,
  crushed: 1.7
};

/**
 * Compose the authored design language into token overrides.
 *
 * EVERY VALUE RETURNED HERE PAINTS. The one exception is `typeVoice`, which
 * returns font stacks — geometry, admissible only because resolveTypeMetrics()
 * runs downstream of this function and hands the change to the estimate. See
 * THE INTENSITY SPLIT in this file's header before adding anything.
 *
 * Returns `{}` for a null spec, which is what keeps a specless book identical.
 */
function composeDesignLanguage(spec, archetype, preset) {
  if (!spec) return {};
  const tokens = {};

  // ── typeVoice: the book's own faces ─────────────────────────────────────
  // 'archetype-default' is a real answer and deliberately emits nothing: a book
  // may say "the archetype's pairing is right for me" without that being a
  // silent absence.
  if (spec.typeVoice && TYPE_VOICES[spec.typeVoice]) {
    Object.assign(tokens, TYPE_VOICES[spec.typeVoice]);
  }

  // ── inkDiscipline: how much ink the press laid down ─────────────────────
  const coverage = INK_COVERAGE[spec.inkDiscipline] || INK_COVERAGE.standard;
  tokens['--design-ink-coverage'] = String(coverage);
  // 'crushed' is the photocopier's blown midtones and is the ONLY value that
  // touches the page filter. A filter on .booklet-page composites — it does not
  // reflow — but it is still the heaviest thing in this system, so it is the
  // one an author has to ask for by name.
  if (spec.inkDiscipline === 'crushed') {
    tokens['--page-filter'] = 'contrast(1.12) brightness(0.99)';
  }

  // ── layoutIntensity: the spectrum's INK (its geometry is refused) ───────
  const intensity = typeof spec.layoutIntensity === 'number'
    ? spec.layoutIntensity
    : (ARCHETYPE_INTENSITY[archetype] !== undefined ? ARCHETYPE_INTENSITY[archetype] : 0.4);
  tokens['--design-intensity'] = String(intensity);

  // The Mothership bar. A box-shadow, so it is drawn entirely outside the box
  // model — the header's own border-bottom (geometry) is untouched at every
  // intensity. Scales 0 → 5px of bar, gated so a light book draws none at all.
  //
  // COMPOSED IN JS, NOT IN CSS, and that is not a shortcut. `box-shadow` takes a
  // comma list in which `none` is only legal ALONE, so `var(--archetype, none),
  // var(--book, none)` is an invalid declaration the browser drops silently
  // whenever either side is unset — the quietest possible way to lose an
  // archetype's header rule. Here both halves are known, so the join is made
  // where it can be made correctly, and the CSS keeps its single consumer.
  // THE THRESHOLD IS A DESIGN DECISION, not a guard. An earlier cut faded the
  // bar in from 0.2, which meant a book at 0.3 drew a 0.9px shadow: invisible
  // on paper, undetectable to a pixel baseline, and TRUE to a carries contract
  // — an axis that reads as present while doing nothing, which is the Hollow
  // Success shape (D135) inside a theme token. So the low end of the spectrum
  // draws NO bar at all, and the first bar it draws is at least a full pixel.
  // Restraint is Mothership's whole character; a quiet book has to be able to
  // be quiet, or the axis only has one end.
  const barPx = Math.max(1, Math.round(intensity * 5 * coverage * 10) / 10);
  const bar = intensity < 0.35
    ? ''
    : `0 ${barPx}px 0 -0.5px var(--design-chrome-ink, currentColor)`;
  if (bar) {
    const inherited = (preset || {})['--header-shadow'];
    tokens['--header-shadow'] = inherited && inherited !== 'none'
      ? `${inherited}, ${bar}`
      : bar;
  }
  tokens['--design-header-bar'] = bar || 'none';

  // The live-area frame, on its own channel so it COMPOSES with the archetype's
  // outline rather than replacing it (an archetype that frames its page and a
  // book that presses hard should read as both, not as whichever ran last).
  tokens['--design-frame'] = intensity < 0.55
    ? 'none'
    : `inset 0 0 0 ${Math.round(intensity * 2 * coverage * 10) / 10}px var(--design-chrome-ink, currentColor)`;

  // The inverted slug — Mothership's reversed label bars. Paint only: a
  // background and a colour, never padding, because padding on an inline label
  // is height its atom never charged for.
  if (intensity >= 0.7) {
    tokens['--design-slug-fill'] = 'var(--design-tone-pattern, none)';
    tokens['--design-slug-color'] = 'var(--ink)';
  }

  // How hard the page texture is pushed. Multiplies whatever texture is in
  // play — the archetype's or the authored one.
  tokens['--design-texture-press'] = String(
    Math.round(Math.min(1, 0.35 + intensity * 0.65) * coverage * 100) / 100
  );

  return tokens;
}

/**
 * The container attributes the design language drives.
 *
 * Attribute rather than token wherever the axis selects a DRAWING MODE rather
 * than a value — the same call `data-component-dialect` makes, and for the same
 * reason: a mode is not a number, and giving it a custom property invites a rule
 * that sizes something from it. Every rule keyed to one of these attributes is
 * held to the Drawing Law by `designLanguageDrawingLaw()` in scripts/validate.mjs.
 */
function designAttributes(spec) {
  const attrs = {};
  if (!spec) return attrs;
  // THE PRESENCE MARKER, and the reason the demotion is provable rather than
  // argued. EVERY W6 rule in booklet.css sits under `[data-design-language]`, so
  // a book without one is untouched BY CONSTRUCTION — not by each rule happening
  // to fall back correctly, which is a claim that needs re-proving after every
  // future edit. One attribute governs the whole system; delete it and the book
  // is its archetype again.
  attrs['data-design-language'] = 'true';
  if (spec.productionTexture && spec.productionTexture !== 'none') {
    attrs['data-production-texture'] = spec.productionTexture;
  }
  if (spec.toneTexture && spec.toneTexture !== 'none') {
    attrs['data-tone-texture'] = spec.toneTexture;
  }
  if (spec.marginSemantics && spec.marginSemantics !== 'none') {
    attrs['data-margin-semantics'] = spec.marginSemantics;
  }
  if (spec.inkDiscipline) attrs['data-ink-discipline'] = spec.inkDiscipline;
  if (spec.sealTreatment && spec.sealTreatment !== 'none') {
    attrs['data-seal-treatment'] = spec.sealTreatment;
  }
  if (spec.documentRecipes) {
    for (const family of Object.keys(spec.documentRecipes)) {
      if (spec.documentRecipes[family] === 'plain') continue;
      attrs['data-recipe-' + family] = spec.documentRecipes[family];
    }
  }
  return attrs;
}

/**
 * The alpha a preset asked for on `--highlight-surface` — the ONE thing the
 * archetype keeps when the book's own accent takes the hue (D126's ruling,
 * executed at W6). Presets pin `rgba(r,g,b,a)`; anything unparseable falls to
 * resolveTheme()'s own generic 0.12, which is the value the derivation used
 * before any preset pinned this token.
 */
function highlightAlpha(pinned) {
  const m = /rgba?\(([^)]+)\)/.exec(String(pinned || ''));
  if (!m) return 0.12;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean);
  const a = parts.length > 3 ? parseFloat(parts[3]) : 1;
  return Number.isFinite(a) ? a : 0.12;
}

export function resolveTheme(data) {
  const theme = (data && data.theme) || {};
  const archetype = normaliseThemeArchetype(theme.visualArchetype);
  const preset = THEME_PRESETS[archetype] || THEME_PRESETS.pastoral;
  const palette = theme.palette || {};
  // PRECEDENCE (W6): preset ← designLanguage ← theme.tokens, with theme.palette
  // still winning the six colours it names below. The archetype is the floor;
  // the book's authored design language presses onto it; an explicit
  // `theme.tokens` entry is the most literal authoring there is and outranks
  // both. A book with no designLanguage merges `{}` and is byte-identical to
  // the pre-W6 render.
  const designLanguage = resolveDesignLanguage(data);
  const tokens = mergeObjects(
    mergeObjects(preset, composeDesignLanguage(designLanguage, archetype, preset)),
    theme.tokens || {}
  );

  if (palette.ink) tokens['--page-ink'] = palette.ink;
  if (palette.paper) tokens['--page-paper'] = palette.paper;
  if (palette.paper && !theme.tokens) tokens['--page-secondary-paper'] = palette.paper;
  if (palette.accent) tokens['--page-accent'] = palette.accent;
  if (palette.muted) tokens['--page-muted'] = palette.muted;
  if (palette.rule) tokens['--page-rule'] = palette.rule;
  if (palette.fog) tokens['--page-fog'] = palette.fog;

  if (palette.paper && !theme.tokens) {
    tokens['--page-surface'] = 'linear-gradient(180deg, ' + palette.paper + ' 0%, ' + alpha(palette.paper, 0.92) + ' 100%)';
    tokens['--panel-surface'] = 'linear-gradient(180deg, ' + alpha(palette.paper, 0.98) + ' 0%, ' + alpha(palette.paper, 0.9) + ' 100%)';
    tokens['--card-surface'] = tokens['--panel-surface'];
  }

  tokens['--page-underlay'] = tokens['--page-underlay'] || 'none';
  tokens['--page-secondary-paper'] = tokens['--page-secondary-paper'] || tokens['--page-paper'];
  tokens['--panel-secondary-surface'] = tokens['--panel-secondary-surface'] || alpha(tokens['--page-fog'], 0.28);
  tokens['--callout-surface'] = tokens['--callout-surface'] || alpha(tokens['--page-fog'], 0.2);

  // ── THE HIGHLIGHT SPLIT, closed (D126's flagged residue, ruled for W6) ────
  // `--highlight-surface` becomes `--accent-soft`, which paints `.boss-proof`,
  // `.boss-branch-note` and the filled progress-clock wedges. Every preset pins
  // it, so the generic derivation below could never fire and `--accent-soft`
  // went on carrying the ARCHETYPE's accent while `--accent` (D126) carries the
  // BOOK's: an olive-accented book washed its proofs pastoral red.
  //
  // The ruling (VISION §8, extended to this token at W6): the authored hue
  // outranks the preset; THE ARCHETYPE KEEPS ONLY THE ALPHA. So when a book
  // authors `palette.accent`, the hue is the book's and the transparency is
  // whatever the preset asked for — pastoral's restrained 0.07 stays 0.07,
  // cyberpunk's 0.15 stays 0.15, and neither archetype loses the one thing it
  // was actually saying with this token. An unauthored accent leaves the preset
  // untouched, so a palette-less book is unchanged.
  //
  // `theme.tokens` still wins outright: it is the most literal authoring there
  // is, and a book that names this exact token has already answered the question.
  const pinnedHighlight = tokens['--highlight-surface'];
  const explicitHighlight = (theme.tokens || {})['--highlight-surface'];
  if (explicitHighlight) {
    tokens['--highlight-surface'] = explicitHighlight;
  } else if (palette.accent) {
    tokens['--highlight-surface'] = alpha(palette.accent, highlightAlpha(pinnedHighlight));
  } else {
    tokens['--highlight-surface'] = pinnedHighlight || alpha(tokens['--page-accent'], 0.12);
  }

  return {
    archetype,
    designLanguage,
    // Typography metrics ride on the resolved theme for the same reason the
    // dialect does: they are a book-wide presentation fact, decided once, from
    // the same tokens. Nothing here is applied to the DOM — the CSS already has
    // the stacks. This is the copy phase-1 ESTIMATION gets, because estimation
    // has no DOM to read a font stack out of. See modules/type-metrics.js.
    typeMetrics: resolveTypeMetrics(tokens),
    // The component dialect rides on the resolved theme because it is the same
    // KIND of thing — a book-wide presentation choice stamped once on the
    // container and read by CSS. It is NOT a token: a dialect changes drawing,
    // never a value, and giving it a custom property would invite a rule that
    // sizes something from it. See THE HEIGHT LAW in contract-constants.mjs.
    componentDialect: resolveComponentDialect(data),
    tokens
  };
}

/**
 * The book's component dialect, defaulted. Reads meta.artifactIdentity rather
 * than data.theme: the dialect is an artifact-identity decision (whose
 * instrument this is), not a palette one.
 */
function resolveComponentDialect(data) {
  const raw = (((data || {}).meta || {}).artifactIdentity || {}).componentDialect;
  return VALID_COMPONENT_DIALECTS.indexOf(raw) === -1 ? DEFAULT_COMPONENT_DIALECT : raw;
}

export function applyTheme(container, theme) {
  container.setAttribute('data-archetype', theme.archetype);
  container.setAttribute('data-component-dialect', theme.componentDialect || DEFAULT_COMPONENT_DIALECT);

  // The design-language attributes. Cleared first for the same reason the
  // custom properties below are: a second load in the same session must not
  // inherit the first book's design language. Attributes are removed by prefix
  // rather than by list because `data-recipe-*` is keyed by document family.
  for (const attr of Array.from(container.attributes)) {
    if (DESIGN_ATTR_PREFIXES.some((p) => attr.name.startsWith(p))) {
      container.removeAttribute(attr.name);
    }
  }
  const designAttrs = designAttributes(theme.designLanguage);
  Object.keys(designAttrs).forEach((name) => {
    container.setAttribute(name, designAttrs[name]);
  });

  // Clear every custom property a previous applyTheme set on this container.
  // Without this, tokens that exist in one theme but not the next (preset
  // extras, booklet-supplied theme.tokens) leak across loads in one session.
  const stale = [];
  for (let i = 0; i < container.style.length; i++) {
    const prop = container.style[i];
    if (prop.startsWith('--')) stale.push(prop);
  }
  stale.forEach((prop) => container.style.removeProperty(prop));
  Object.keys(theme.tokens).forEach((key) => {
    container.style.setProperty(key, theme.tokens[key]);
  });
}

// Every attribute prefix applyTheme() owns on the container. Kept beside the
// remover, because the failure mode of a stale entry here is a book wearing the
// previous book's design language — which looks entirely intentional.
const DESIGN_ATTR_PREFIXES = [
  'data-design-language', 'data-production-texture', 'data-tone-texture',
  'data-margin-semantics', 'data-ink-discipline', 'data-seal-treatment',
  'data-recipe-'
];
