/*
 * THE LEGIBILITY FLOOR — one home, two readers.
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * WHAT THIS IS FOR. On 2026-08-17 the author's first completed book rendered
 * near-black ink (#101418) on a near-black page (#0a0a0a): contrast 1.02:1.
 * Every exercise name in the book — the fusion surface, the one thing a lifter
 * looks at between sets — was physically invisible, and the book was judged on
 * a presentation that was hiding most of its words.
 *
 * The proximate defect was a guard clause (see resolveTheme in theme.js). The
 * CURE is this module: no book may reach paper with an ink/field relationship
 * a human cannot read, whatever the archetype says and whatever the palette
 * says. VISION §8: *the ten archetypes are scaffolding — a floor of typographic
 * coherence and print-safety — never the identity.* This is that floor, made
 * structural rather than hoped for.
 *
 * ── WHY .mjs, AND WHY IT IS NOT IN theme.js ─────────────────────────────────
 * Two readers need this math and they run in different runtimes:
 *
 *   • `renderer/modules/theme.js` — the browser, at resolve time. It REPAIRS.
 *   • `scripts/validate.mjs` — Node, at gate time. It REFUSES.
 *
 * theme.js cannot be the home: it is a `.js` file whose imports carry the
 * repo's `?v=NN` cache-bust query, so Node parses it as CJS and the import
 * throws before the first statement. A `.mjs` is unconditionally ESM in Node
 * and an ordinary module in the browser, which is the same reason
 * `contracts/puzzle-solvers.mjs` is shaped this way (D132). One home, two
 * readers — the D133 idiom.
 *
 * ── THE DUPLICATION THIS MODULE DELIBERATELY CARRIES ────────────────────────
 * `renderer/modules/utils.js` exports `alpha(hex, a)`, which does what
 * `rgbaOf()` below does. They are NOT merged, and the reason is the paragraph
 * above: utils.js is ESM-in-`.js` and therefore unreachable from the validator.
 * The split is contained to five lines of hex arithmetic, and the derivation
 * that MATTERS — paper → the fields keyed to it — has exactly one home
 * (`derivePaperFields`, below), which theme.js calls rather than rebuilding.
 * If utils.js ever becomes Node-reachable, `alpha` should delegate here.
 *
 * ── THE NUMBER, ARGUED ──────────────────────────────────────────────────────
 * `LEGIBILITY_CONTRAST_FLOOR = 4.5` is WCAG 2.1 SC 1.4.3's AA bar for NORMAL
 * text. The large-text exemption (3:1) is unavailable to this product by
 * construction: canonical body prose is 8pt and the label ladder runs 6–7pt,
 * an order below the ≥18pt/≥14pt-bold threshold the exemption is written for.
 *
 * And it is a FLOOR, not a target, for two reasons WCAG does not cover:
 *
 *   1. WCAG's ratios are derived for EMISSIVE displays. This artifact is
 *      reflective paper read in a gym under whatever light is there. The same
 *      computed ratio buys less on paper than on a screen.
 *   2. VISION §8 requires the book to survive a home laser printer and a
 *      photocopier. Both compress midtones; neither adds contrast. Whatever
 *      ratio resolves here is the BEST the reader will ever see.
 *
 * So 4.5 is the lowest number that can be defended, not a comfortable one.
 * Every shipped preset already clears 5.6:1 against every field it paints,
 * which is the point: this floor binds on authored palettes and on future
 * regressions, and costs the ten archetypes nothing today.
 *
 * ── SCOPE: WHY THESE FIVE TOKENS AND NOT THE OTHER FORTY ────────────────────
 * `FIELD_TOKENS` is the set of tokens that paint an OPAQUE AREA BEHIND TEXT.
 * Those are the only ones that can hide a word. Everything else an archetype
 * paints — `--page-underlay`, `--page-texture`, `--grid-fill`, `--track-fill`,
 * `--callout-surface`, `--panel-secondary-surface`, `--highlight-surface`, the
 * shadows, the edges, the borders — is either a low-alpha TINT that composites
 * over whichever field is beneath it (and therefore cannot invert legibility)
 * or paint outside the box model. That distinction is what an archetype still
 * OWNS after a book has authored its palette, and `legibilityFloor()` in
 * scripts/validate.mjs asserts the split holds for every preset, so a future
 * preset that makes one of those tints opaque fails the build instead of
 * quietly painting over a page.
 */

/** The bar. See THE NUMBER, ARGUED above before changing it. */
export const LEGIBILITY_CONTRAST_FLOOR = 4.5;

/**
 * How far the repair may push each side before it gives up and takes the
 * archetype's own pair wholesale. Neither is a design opinion: they are the
 * points past which "preserve the hue" stops being true — a colour at L≥0.98
 * is white and a colour at L≤0.05 is black, whatever its hue channel says.
 */
export const PAPER_LIGHTNESS_CEILING = 0.97;
export const INK_LIGHTNESS_FLOOR = 0.06;

/**
 * Where an INVERTED pair lands when the print law flips it.
 *
 * These are targets, not limits, and they exist because a swap is not enough. A
 * light-ink/dark-paper pair usually has *excellent* contrast — cyan on black is
 * 15.25:1 — so the contrast machinery below has nothing to say about it and,
 * left alone, will not move it at all. That was a real defect in this module,
 * caught by its own mutation battery: `inverted-authored-palette` sailed
 * through every contrast assertion while resolving to light ink on black paper.
 *
 * Exchanging the two lightnesses is the obvious repair and it is a bad one:
 * #00ffcc sits at L=0.50, so a swap hands the paper a mid-grey (L=0.50) that
 * clears the floor by a whisker and prints as a grey slab. So the pair is sent
 * to a PAGE, not merely un-inverted: paper near white, ink dark enough to read
 * as ink, hue and saturation preserved on both. The contrast loops then fine-
 * tune from there if the hue pair still needs it.
 */
export const INVERSION_PAPER_LIGHTNESS = 0.95;
export const INVERSION_INK_LIGHTNESS = 0.2;

/** The lightness step the repair walks in. Small enough that the repaired
 *  value stays near what was authored; large enough to terminate quickly. */
const LIGHTNESS_STEP = 0.02;

/**
 * THE OPAQUE FIELDS — every token that paints an area a word can sit on.
 *
 * Order is the order they are reported in, and it is deliberate: the page
 * surface first, because it is the field under everything else and the one
 * that broke.
 */
export const FIELD_TOKENS = [
  '--page-surface',
  '--panel-surface',
  '--card-surface',
  '--page-secondary-paper',
  '--page-fog'
];

/* ── colour primitives ────────────────────────────────────────────────────── */

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** `#rgb` / `#rrggbb` → `{r,g,b}`, or null. Never throws, never guesses. */
export function parseHex(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!HEX_RE.test(raw)) return null;
  const full = raw.length === 4
    ? '#' + raw[1] + raw[1] + raw[2] + raw[2] + raw[3] + raw[3]
    : raw;
  return {
    r: parseInt(full.slice(1, 3), 16),
    g: parseInt(full.slice(3, 5), 16),
    b: parseInt(full.slice(5, 7), 16)
  };
}

function clamp255(n) { return Math.max(0, Math.min(255, Math.round(n))); }

export function toHex(rgb) {
  const h = (n) => clamp255(n).toString(16).padStart(2, '0');
  return '#' + h(rgb.r) + h(rgb.g) + h(rgb.b);
}

function rgbaOf(hex, a) {
  const c = parseHex(hex);
  if (!c) return null;
  return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(color) {
  const c = typeof color === 'string' ? parseHex(color) : color;
  if (!c) return null;
  const chan = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b);
}

/** WCAG 2.1 contrast ratio. Returns null if either side is unparseable —
 *  a caller must decide what an unknown colour means, never this function. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/* ── HSL, for the repair ──────────────────────────────────────────────────── */

export function toHsl(color) {
  const c = typeof color === 'string' ? parseHex(color) : color;
  if (!c) return null;
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h, s, l };
}

export function fromHsl(hsl) {
  const { h, s, l } = hsl;
  if (s === 0) { const v = clamp255(l * 255); return { r: v, g: v, b: v }; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    let u = t;
    if (u < 0) u += 1;
    if (u > 1) u -= 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return {
    r: clamp255(hue(h + 1 / 3) * 255),
    g: clamp255(hue(h) * 255),
    b: clamp255(hue(h - 1 / 3) * 255)
  };
}

/** The same colour at a different lightness. Hue and saturation survive —
 *  which is the whole promise: the repair fixes the LIGHTNESS relationship
 *  and never silently swaps the author's hue. */
export function withLightness(color, l) {
  const hsl = toHsl(color);
  if (!hsl) return null;
  return toHex(fromHsl({ h: hsl.h, s: hsl.s, l: Math.max(0, Math.min(1, l)) }));
}

export function lightnessOf(color) {
  const hsl = toHsl(color);
  return hsl ? hsl.l : null;
}

/* ── reading a CSS field value ────────────────────────────────────────────── */

const RGBA_RE = /rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*(?:[,/]\s*([0-9.]+)\s*)?\)/g;
const HEX_STOP_RE = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;

function over(fg, bg) {
  const a = fg.a === undefined ? 1 : fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a)
  };
}

/**
 * Every opaque colour a reader can actually see in a CSS field value,
 * composited over `backdrop`.
 *
 * A gradient contributes every stop (the darkest one is what a word at the
 * bottom of a panel sits on — the reason this returns a list and not a
 * colour). A translucent stop is composited rather than judged raw, because
 * `rgba(17,17,17,0.8)` over white is a mid grey and judging it as #111111
 * would refuse a field that is perfectly readable. `transparent` and `none`
 * resolve to the backdrop itself, which is the truth: nothing is painted.
 *
 * Returns `[]` for a value with no colour in it at all — a caller must treat
 * that as UNKNOWN and never as a pass.
 */
export function fieldStops(value, backdrop) {
  const raw = String(value == null ? '' : value).trim();
  const bg = typeof backdrop === 'string' ? parseHex(backdrop) : backdrop;
  if (!bg) return [];
  if (!raw || raw === 'none' || raw === 'transparent') return [{ ...bg }];

  const stops = [];
  let m;
  RGBA_RE.lastIndex = 0;
  while ((m = RGBA_RE.exec(raw)) !== null) {
    stops.push(over({
      r: Number(m[1]), g: Number(m[2]), b: Number(m[3]),
      a: m[4] === undefined ? 1 : Number(m[4])
    }, bg));
  }
  const hexes = raw.match(HEX_STOP_RE) || [];
  for (const hex of hexes) {
    const c = parseHex(hex);
    if (c) stops.push(c);
  }
  return stops;
}

/** The worst contrast `ink` gets against any stop of `value`, or null when
 *  the value carries no colour this module can read. */
export function worstFieldContrast(ink, value, backdrop) {
  const stops = fieldStops(value, backdrop);
  if (!stops.length) return null;
  let worst = Infinity;
  for (const stop of stops) {
    const ratio = contrastRatio(ink, stop);
    if (ratio !== null && ratio < worst) worst = ratio;
  }
  return worst === Infinity ? null : worst;
}

/**
 * Measure every field a token map paints, against its ink.
 *
 * Returns `{ worst, worstToken, fields: [{token, ratio}] }`. Tokens absent
 * from the map are skipped; tokens present but unreadable are reported with a
 * null ratio and never counted as a pass.
 */
export function measureFields(tokens, options = {}) {
  const ink = options.ink || tokens['--page-ink'];
  const paper = options.paper || tokens['--page-paper'];
  const fields = [];
  let worst = Infinity;
  let worstToken = null;
  for (const token of FIELD_TOKENS) {
    if (!(token in tokens)) continue;
    const ratio = worstFieldContrast(ink, tokens[token], paper);
    fields.push({ token, ratio });
    if (ratio !== null && ratio < worst) { worst = ratio; worstToken = token; }
  }
  const paperRatio = contrastRatio(ink, paper);
  if (paperRatio !== null && paperRatio < worst) {
    worst = paperRatio;
    worstToken = '--page-paper';
  }
  return { worst: worst === Infinity ? null : worst, worstToken, fields, paperRatio };
}

/* ── the derivation: an authored paper carries its fields ─────────────────── */

/**
 * THE ONE HOME for "what do the opaque fields look like on THIS paper".
 *
 * These four formulas are byte-for-byte the ones resolveTheme() has always
 * used for a book that authored a palette and no `theme.tokens` — preserved
 * exactly, so every corpus book that already took that path renders
 * pixel-identical. `--page-fog` is the fifth and is NEW here: fog is the
 * paper's own shadow (it hatches map cells and fills tracks opaquely), so a
 * preset fog keyed to a different paper is the same defect one token over.
 *
 * Returns null for a paper this module cannot read — the caller must then
 * leave the preset's fields standing and let the floor catch the result,
 * rather than deriving a field from a colour nobody can parse.
 */
export function derivePaperFields(paper) {
  const c = parseHex(paper);
  if (!c) return null;
  const panel = 'linear-gradient(180deg, ' + rgbaOf(paper, 0.98) + ' 0%, ' + rgbaOf(paper, 0.9) + ' 100%)';
  const fogL = Math.max(0, (lightnessOf(paper) || 0) - 0.06);
  return {
    '--page-surface': 'linear-gradient(180deg, ' + paper + ' 0%, ' + rgbaOf(paper, 0.92) + ' 100%)',
    '--panel-surface': panel,
    '--card-surface': panel,
    '--page-secondary-paper': paper,
    '--page-fog': withLightness(paper, fogL)
  };
}

/**
 * THE RULE: an authored paper carries its fields — applied, in one place.
 *
 * `theme.tokens` outranks the derivation for the tokens it ACTUALLY NAMES and
 * for nothing else. That "and for nothing else" is the whole fix: the guard
 * this replaces disarmed the derivation whenever `theme.tokens` existed AT
 * ALL, and `theme.tokens` is a deliberately open object that models fill with
 * prose.
 *
 * `palette.fog` is the one palette entry that also counts as pinning, because
 * fog is in the field set: a book that authored its fog has answered the
 * question the derivation exists to answer.
 *
 * TWO READERS, and they must not be able to disagree: `theme.js` calls this at
 * resolve time, `scripts/validate.mjs` calls it to predict what a book will
 * resolve to. The validator cannot import theme.js (see WHY .mjs above), so
 * without this function the gate would need a second implementation of the
 * rule it is gating — D93's two-algorithms defect, aimed at the exact surface
 * that just cost the author a book.
 *
 * Mutates and returns `tokens`.
 */
export function applyAuthoredPaper(tokens, palette, explicitTokens) {
  const paper = (palette || {}).paper;
  if (!paper) return tokens;
  const derived = derivePaperFields(paper);
  // A null derivation means the authored paper is not a colour this module can
  // read. Leave the preset's fields standing rather than deriving from
  // nonsense — enforceLegibilityFloor() is what catches the result.
  if (!derived) return tokens;
  const explicit = explicitTokens && typeof explicitTokens === 'object' ? explicitTokens : {};
  for (const token of FIELD_TOKENS) {
    if (Object.prototype.hasOwnProperty.call(explicit, token)) continue;
    if (token === '--page-fog' && palette.fog) continue;
    tokens[token] = derived[token];
  }
  return tokens;
}

/* ── the floor, enforced ──────────────────────────────────────────────────── */

/**
 * Guarantee the resolved theme is readable, and say what it cost.
 *
 * TWO INDEPENDENT LAWS, IN ORDER, AND THE ORDER IS LOAD-BEARING.
 *
 *   0. THE PRINT LAW (VISION §8). Paper is the light side of the pair, always:
 *      a page darker than its ink prints as a solid black rectangle on a home
 *      laser printer, takes no pencil, and is unshippable HOWEVER GOOD ITS
 *      CONTRAST RATIO IS. Checked first, because an inverted pair is typically
 *      high-contrast and a contrast-first pass therefore declares it fine.
 *   1. THE FLOOR. Ink clears `floor` against every opaque field. The paper is
 *      lightened first and the ink darkened only when paper has run out of
 *      room, so the repair always moves toward a page rather than away from one.
 *
 * Hue survives every step. The repair moves LIGHTNESS and nothing else, until
 * the last resort, where it takes the archetype's own ink and paper wholesale
 * — the literal reading of "the archetype floor wins", reached only when a
 * palette cannot be made legible by lightness alone.
 *
 * `tokens` is mutated in place (it is resolveTheme's own working map) and the
 * report is returned. A theme that already passes is not touched and reports
 * `repaired: false` — so a book that was fine is byte-identical.
 */
export function enforceLegibilityFloor(tokens, options = {}) {
  const floor = options.floor || LEGIBILITY_CONTRAST_FLOOR;
  const fallback = options.fallback || {};
  const before = measureFields(tokens);
  const inkStart = tokens['--page-ink'];
  const paperStart = tokens['--page-paper'];
  const report = {
    floor,
    ratioBefore: before.worst,
    ratio: before.worst,
    worstToken: before.worstToken,
    repaired: false,
    inverted: false,
    repairs: []
  };

  // An unreadable ink or paper is not a pass. Fall straight to the archetype's
  // pair — this module refuses to reason about a colour it cannot parse.
  const inkRgb = parseHex(inkStart);
  const paperRgb = parseHex(paperStart);
  if (!inkRgb || !paperRgb) {
    if (!parseHex(fallback.ink) || !parseHex(fallback.paper)) return report;
    report.repairs.push({ token: '--page-ink', from: inkStart, to: fallback.ink, reason: 'unreadable-colour' });
    report.repairs.push({ token: '--page-paper', from: paperStart, to: fallback.paper, reason: 'unreadable-colour' });
    tokens['--page-ink'] = fallback.ink;
    tokens['--page-paper'] = fallback.paper;
  }

  let ink = tokens['--page-ink'];
  let paper = tokens['--page-paper'];

  // 0 — THE PRINT LAW, CHECKED BEFORE THE FLOOR AND NOT AS A COROLLARY OF IT.
  //
  // This ordering is the whole correctness of this function. An inverted pair is
  // usually HIGH contrast — cyan on black is 15.25:1 — so a contrast-first
  // implementation returns "already fine" and ships a page that prints as a
  // solid black rectangle and takes no pencil. That is precisely the bug this
  // module exists to prevent, and an earlier cut of it had exactly that hole:
  // the early return below sat above this check, and the `inverted` flag was
  // computed after it, so it was always false. Its own mutation battery found
  // it. The two laws are independent; each gets its own gate.
  report.inverted = relativeLuminance(paper) < relativeLuminance(ink);
  if (report.inverted) {
    const flippedPaper = withLightness(paper, INVERSION_PAPER_LIGHTNESS);
    const flippedInk = withLightness(ink, INVERSION_INK_LIGHTNESS);
    if (flippedPaper && flippedInk) {
      report.repairs.push({ token: '--page-paper', from: paper, to: flippedPaper, reason: 'print-law-inversion' });
      report.repairs.push({ token: '--page-ink', from: ink, to: flippedInk, reason: 'print-law-inversion' });
      paper = flippedPaper;
      ink = flippedInk;
    }
  } else if (before.worst !== null && before.worst >= floor) {
    return report;
  }

  // The baseline the LIGHTNESS repairs are reported against. Not
  // `tokens['--page-*']`: after an inversion those already differ, and comparing
  // against them would file a second 'lightness' entry for a token the print law
  // has already accounted for — one change, two lines in the audit trail.
  const inkAfterLaw = ink;
  const paperAfterLaw = paper;

  // 1 — the paper goes light (the print law's direction).
  let guard = 0;
  while ((contrastRatio(ink, paper) || 0) < floor
         && (lightnessOf(paper) || 0) < PAPER_LIGHTNESS_CEILING
         && guard++ < 100) {
    paper = withLightness(paper, Math.min(PAPER_LIGHTNESS_CEILING, (lightnessOf(paper) || 0) + LIGHTNESS_STEP));
  }

  // 2 — the ink goes dark, only if paper alone was not enough.
  guard = 0;
  while ((contrastRatio(ink, paper) || 0) < floor
         && (lightnessOf(ink) || 1) > INK_LIGHTNESS_FLOOR
         && guard++ < 100) {
    ink = withLightness(ink, Math.max(INK_LIGHTNESS_FLOOR, (lightnessOf(ink) || 1) - LIGHTNESS_STEP));
  }

  // 3 — last resort: the archetype's own pair, entire.
  if ((contrastRatio(ink, paper) || 0) < floor
      && parseHex(fallback.ink) && parseHex(fallback.paper)
      && (contrastRatio(fallback.ink, fallback.paper) || 0) >= floor) {
    ink = fallback.ink;
    paper = fallback.paper;
    report.repairs.push({ token: '--page-ink', from: tokens['--page-ink'], to: ink, reason: 'archetype-floor' });
    report.repairs.push({ token: '--page-paper', from: tokens['--page-paper'], to: paper, reason: 'archetype-floor' });
  } else {
    if (ink !== inkAfterLaw) {
      report.repairs.push({ token: '--page-ink', from: inkAfterLaw, to: ink, reason: 'lightness' });
    }
    if (paper !== paperAfterLaw) {
      report.repairs.push({ token: '--page-paper', from: paperAfterLaw, to: paper, reason: 'lightness' });
    }
  }
  tokens['--page-ink'] = ink;
  tokens['--page-paper'] = paper;

  // 4 — every field that still fails takes the derivation from the repaired
  //     paper. This is what catches a field authored opaque and dark directly
  //     in `theme.tokens`: the most literal authoring there is still does not
  //     outrank the floor.
  const derived = derivePaperFields(paper);
  if (derived) {
    for (const token of FIELD_TOKENS) {
      if (!(token in tokens)) continue;
      const ratio = worstFieldContrast(ink, tokens[token], paper);
      if (ratio !== null && ratio >= floor) continue;
      if (derived[token] === undefined || tokens[token] === derived[token]) continue;
      report.repairs.push({ token, from: tokens[token], to: derived[token], reason: 'field-derived' });
      tokens[token] = derived[token];
    }
  }

  const after = measureFields(tokens);
  report.ratio = after.worst;
  report.worstToken = after.worstToken;
  report.repaired = report.repairs.length > 0;
  return report;
}
