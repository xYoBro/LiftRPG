import { alpha, mergeObjects } from './utils.js?v=48';
import { resolveTypeMetrics } from './type-metrics.js?v=48';
import {
  VALID_COMPONENT_DIALECTS,
  DEFAULT_COMPONENT_DIALECT
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
 * THE DRAWING LAW. Every axis added by this wave paints and never measures:
 * background-image on a pseudo-element, an outline (outside the box model), a
 * box-shadow (outside the box model), a border colour, a fill. Phase-1
 * estimation has no DOM and cannot resolve a custom property — the D71/D105
 * lesson — so a token that changed a height would make the solver's math lie
 * with nothing to catch it. Two deliberate exceptions, both confined to the
 * cover page, whose atom estimates a flat full page and models nothing inside
 * it: `--cover-padding` / `--designation-padding` and `--cover-title-case` /
 * `--cover-title-spacing`. Gate: no page may gain `data-layout-overflow`.
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
 * B&W PRINT LAW: every value here reads without hue. Identity is carried by
 * weight, pattern and structure — a hatch, a neatline, a double rule, an
 * inverted slug — so the book survives a photocopier, which is the only
 * printer some of these will ever meet.
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
    '--weight-body': '600',
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

export function resolveTheme(data) {
  const theme = (data && data.theme) || {};
  const archetype = normaliseThemeArchetype(theme.visualArchetype);
  const preset = THEME_PRESETS[archetype] || THEME_PRESETS.pastoral;
  const palette = theme.palette || {};
  const tokens = mergeObjects(preset, theme.tokens || {});

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
  tokens['--highlight-surface'] = tokens['--highlight-surface'] || alpha(tokens['--page-accent'], 0.12);

  return {
    archetype,
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
