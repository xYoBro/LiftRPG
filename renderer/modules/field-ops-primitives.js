import { make } from './dom.js?v=48';
import { createBoundedPage } from './page-shell.js?v=48';
import { PAGE_BUDGET } from './engine/page-spec.js';
import {
  resolveWorkspaceStyle,
  resolveWorkspaceCellCount,
  DEFAULT_WORKSPACE_STYLE
} from '../../contracts/contract-constants.mjs';

const WORD_NUMS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
const BOX_GRID_PATTERN = /(\w+)\s+rows?\s+(?:of\s+)?(\w+)\s+box(?:es)?/i;

function parseDashboardBoxGrid(text) {
  if (!text) return null;
  const match = text.match(BOX_GRID_PATTERN);
  if (!match) return null;
  const rows = WORD_NUMS[match[1].toLowerCase()] || parseInt(match[1], 10);
  const cols = WORD_NUMS[match[2].toLowerCase()] || parseInt(match[2], 10);
  if (!rows || !cols || rows > 8 || cols > 8) return null;
  return { rows, cols };
}

// ── The return box's ruled lines — ONE HOME, THREE READERS ──────────────────
//
// The return box is a WRITING surface: the book tells the player to write the
// counterfoil and rule the line closed. It used to render as a 44px framed
// void with a single 34px bar across the top — the letterbox slot and nothing
// to write on. The first delivered book said "Three ruled lines on the shed
// wall" over exactly one dash (D172 read, P.11 / P.24).
//
// The count comes from the most trustworthy channel available, in order:
// a declared numeric slot count, then the component's own prose, then the
// writable floor. Prose parsing is not a new liberty — `parseDashboardBoxGrid`
// above already reads "two rows of four boxes" out of a dashboard body, and
// this is the same idiom held to the same ceiling.
//
// THE MIRROR: `atoms/tracker.js` renders the same component on the other path
// (AUDIT 112's twin) and its COMPANION_HEIGHTS['return-box'] estimate is priced
// against the geometry below. All three import THIS function rather than
// re-deriving a count, because a render that draws four lines against an
// estimate that priced one is the silent-clipping class.
const RETURN_LINE_PATTERN = /(\w+)\s+(?:ruled\s+|blank\s+|write-in\s+)?lines?\b/i;
/** A write-in surface with fewer lines than this is not a write-in surface. */
export const RETURN_BOX_DEFAULT_LINES = 3;
/** Same ceiling parseDashboardBoxGrid holds: prose is a hint, not an authority. */
const RETURN_BOX_MAX_LINES = 8;

/**
 * How many ruled lines a return box prints.
 *
 * @param {object} source companion component or atom data
 * @returns {number} 1..RETURN_BOX_MAX_LINES
 */
export function returnBoxLineCount(source) {
  const item = source || {};
  // Structured first: `slots` is a number on the atom path and an array on the
  // model path, so only a real number counts — Number([]) is 0 and Number of a
  // one-element array is that element, both of which would be silent nonsense.
  const declared = [item.slotCount, item.slots, item.lines]
    .find((value) => typeof value === 'number' && Number.isFinite(value) && value >= 1);
  if (declared) return Math.min(Math.round(declared), RETURN_BOX_MAX_LINES);

  const prose = String(item.body || item.instruction || '');
  const match = prose.match(RETURN_LINE_PATTERN);
  if (match) {
    const parsed = WORD_NUMS[match[1].toLowerCase()] || parseInt(match[1], 10);
    if (parsed >= 1 && parsed <= RETURN_BOX_MAX_LINES) return parsed;
  }

  return RETURN_BOX_DEFAULT_LINES;
}

/**
 * The return box: the slot it goes through, then the lines it is ruled on.
 *
 * Returns the two nodes SEPARATELY, for the card to append as siblings, rather
 * than wrapping them: `.companion-component` is already a flex column with a
 * 6px gap, so the pair spaces itself. A wrapper would need its own rule, and a
 * class no stylesheet matches is silent by construction — the defect this
 * project keeps re-learning. Both classes used here already exist and already
 * carry the geometry (`.companion-return-box` 44px framed slot,
 * `.companion-dash-line` an 18px dashed rule), which is what makes the
 * estimate in atoms/tracker.js checkable against a ruler.
 *
 * @returns {HTMLElement[]} nodes to append, in order
 */
export function buildReturnBoxSurface(source) {
  const deposit = make('div', 'companion-return-box');
  deposit.appendChild(make('div', 'companion-return-slot'));

  const lines = make('div', 'companion-dashboard');
  const count = returnBoxLineCount(source);
  for (let index = 0; index < count; index += 1) {
    lines.appendChild(make('div', 'companion-dash-line'));
  }
  return [deposit, lines];
}

function polarPoint(cx, cy, radius, angleDegrees) {
  const radians = (angleDegrees - 90) * (Math.PI / 180);
  return {
    x: cx + (radius * Math.cos(radians)),
    y: cy + (radius * Math.sin(radians))
  };
}

function segmentPath(cx, cy, radius, startAngle, endAngle) {
  const start = polarPoint(cx, cy, radius, endAngle);
  const end = polarPoint(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', radius, radius, 0, largeArc, 0, end.x, end.y,
    'Z'
  ].join(' ');
}

/**
 * The clock face — the only clock renderer the printed book can reach.
 *
 * DIALECT LAYERS (Wave 3). All four dialects are DRAWN, every time, into the
 * same 100x100 viewBox; `[data-component-dialect]` in booklet.css shows one and
 * paints the rest out with `fill:none; stroke:none`. Drawing-then-hiding rather
 * than branching on the dialect here is deliberate three ways: this function
 * has no access to meta.artifactIdentity, the box is identical in every dialect
 * so THE HEIGHT LAW holds by construction, and hiding via paint (not `display`)
 * keeps every dialect rule inside the property set the validator's
 * componentDialectHeightLaw() pass permits.
 *
 * NOTE ON THE OTHER CLOCK: atoms/tracker.js buildClock() draws a second clock
 * face and is NOT unified with this one, because it is unreachable — its switch
 * runs only for a `trackType` outside VALID_COMPANION_TYPES, and the schema
 * closes that enum, which is also why no `.tracker-*` class has ever had CSS.
 * Unifying a live renderer with a dead one would buy no drift protection and
 * would import a dead presentation profile into the live path. It stays where
 * it is, with the rest of the generic-tracker seed (D6 class).
 */
/**
 * The one line of derived prose a clock face carries under its name, or ''.
 *
 * SINGLE HOME. Exported because atoms/clocks-panel.js has to count this
 * string's characters in phase 1 to predict the height render() will produce,
 * and a hand-mirrored copy of these four branches is exactly the kind of
 * quiet divergence the ladder-mirror rules exist to prevent. Pure over its
 * argument; no DOM.
 *
 * @param {object} clock — a model from buildClockModels()
 * @returns {string}
 */
export function clockSubtext(clock) {
  if (!clock) return '';
  if (clock.clockType === 'linked-clock' && clock.linkedClockName) {
    return 'Unlocks ' + clock.linkedClockName;
  }
  if (clock.clockType === 'racing-clock' && clock.opposedClockName) {
    return 'Opposes ' + clock.opposedClockName;
  }
  if (clock.clockType === 'tug-of-war-clock') return 'Push / pull state';
  if (clock.clockType === 'danger-clock') return 'Threat escalates on fill';
  return '';
}

/** The prefix `renderGameplayClocks` stamps ahead of `consequenceOnFull`.
 *  Mirrored by CONSEQUENCE_PREFIX_CHARS in atoms/clocks-panel.js. */
export const CLOCK_CONSEQUENCE_PREFIX = 'ON FULL: ';

export function renderGameplayClocks(clocks) {
  const section = make('section', 'ops-section ops-clocks');
  section.appendChild(make('div', 'doc-label', 'Active Clocks'));
  const grid = make('div', 'clock-grid');
  (clocks || []).forEach((clock) => {
    const item = make('div', 'clock-item');
    item.setAttribute('data-clock-type', clock.clockType || 'progress-clock');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'progress-clock-svg');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', '48');
    circle.setAttribute('fill', 'var(--track-fill)');
    circle.setAttribute('stroke', 'var(--page-rule)');
    circle.setAttribute('stroke-width', '2');
    svg.appendChild(circle);

    const filled = clock.startValue || 0;

    for (let i = 0; i < clock.segments; i += 1) {
      const startAngle = (i * 360) / clock.segments;
      const endAngle = ((i + 1) * 360) / clock.segments;
      if (i < filled) {
        const wedge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        wedge.setAttribute('d', segmentPath(50, 50, 46, startAngle, endAngle));
        wedge.setAttribute('fill', 'var(--accent-soft)');
        wedge.setAttribute('class', 'progress-clock-fill');
        svg.appendChild(wedge);
      }

      const angle = (i * 360) / clock.segments;
      const rad = (angle - 90) * (Math.PI / 180);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '50');
      line.setAttribute('y1', '50');
      line.setAttribute('x2', String(50 + 48 * Math.cos(rad)));
      line.setAttribute('y2', String(50 + 48 * Math.sin(rad)));
      line.setAttribute('stroke', 'var(--page-rule)');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('class', 'progress-clock-divider');
      svg.appendChild(line);

      // beads — one countable bead per segment on the inner ring.
      const beadCentre = polarPoint(50, 50, 33, startAngle + (180 / clock.segments));
      const bead = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bead.setAttribute('cx', beadCentre.x.toFixed(2));
      bead.setAttribute('cy', beadCentre.y.toFixed(2));
      bead.setAttribute('r', '7');
      bead.setAttribute('class', 'progress-clock-bead');
      if (i < filled) bead.setAttribute('data-filled', 'true');
      svg.appendChild(bead);

      // tally — a notched rim: a short bar across each segment's rim tick,
      // struck through once the segment is spent.
      const rimOuter = polarPoint(50, 50, 47, startAngle);
      const rimInner = polarPoint(50, 50, 38, startAngle);
      const notch = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      notch.setAttribute('x1', rimInner.x.toFixed(2));
      notch.setAttribute('y1', rimInner.y.toFixed(2));
      notch.setAttribute('x2', rimOuter.x.toFixed(2));
      notch.setAttribute('y2', rimOuter.y.toFixed(2));
      notch.setAttribute('class', 'progress-clock-notch');
      if (i < filled) notch.setAttribute('data-filled', 'true');
      svg.appendChild(notch);
    }

    // gauge — one swept arc reading the whole clock at a glance, plus the
    // needle at the reading. Drawn last so it sits over the rim.
    const sweep = Math.max(0, Math.min(filled, clock.segments));
    if (sweep > 0) {
      const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arc.setAttribute('d', segmentPath(50, 50, 42, 0, (sweep * 360) / clock.segments));
      arc.setAttribute('class', 'progress-clock-arc');
      svg.appendChild(arc);
    }
    const needleEnd = polarPoint(50, 50, 44, (sweep * 360) / clock.segments);
    const needle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    needle.setAttribute('x1', '50');
    needle.setAttribute('y1', '50');
    needle.setAttribute('x2', needleEnd.x.toFixed(2));
    needle.setAttribute('y2', needleEnd.y.toFixed(2));
    needle.setAttribute('class', 'progress-clock-needle');
    svg.appendChild(needle);

    const visuals = make('div', 'clock-visuals');
    visuals.appendChild(svg);
    item.appendChild(visuals);

    const info = make('div', 'clock-info');
    info.appendChild(make('div', 'clock-name', clock.clockName));
    const subtext = clockSubtext(clock);
    if (subtext) info.appendChild(make('div', 'clock-subtext', subtext));
    if ((clock.thresholds || []).length) {
      const thresholds = make('div', 'clock-thresholds');
      (clock.thresholds || []).forEach((threshold) => {
        thresholds.appendChild(make('div', 'clock-threshold', String(threshold)));
      });
      info.appendChild(thresholds);
    }
    if (clock.consequenceOnFull) {
      info.appendChild(make('div', 'clock-consequence', CLOCK_CONSEQUENCE_PREFIX + clock.consequenceOnFull));
    }
    item.appendChild(info);
    grid.appendChild(item);
  });
  section.appendChild(grid);
  return section;
}

// ---------------------------------------------------------------------------
// Hex cell variant (mapState.cellShape === 'hex')
// ---------------------------------------------------------------------------
/**
 * Pointy-top hexes in odd-row-offset layout, drawn as SVG polygons.
 *
 * WHY SVG AND NOT clip-path: the Safari export path rasterises through
 * html2canvas 1.4.1 (D87), which does not honour clip-path. Inline SVG is
 * already proven through that path by point-to-point.
 *
 * WHY THE HEIGHT IS FIXED IN px AND THE WIDTH IS NOT: phase-1 estimation has no
 * DOM and cannot know whether this map renders full-width or in a half slot, so
 * a width-derived hex height would be wrong by ~2x in the half-width case (the
 * D71 defect class). The container's height comes from the row count alone;
 * `preserveAspectRatio="xMidYMid meet"` then sizes the hexes to whichever axis
 * binds and centres the slack. Height is density-invariant and width-invariant
 * by construction.
 *
 * CROSS-FILE CONTRACT: HEX_ROW_UNITS / HEX_CAP_UNITS below are mirrored as
 * HEX_ROW_PX / HEX_CAP_PX in atoms/map-panel.js, and the `.map-hex` height rule
 * in booklet.css is written from the same two numbers. Change all three together.
 */
const HEX_ROW_UNITS = 26;   // vertical step between hex rows (0.75 x hex height)
const HEX_CAP_UNITS = 9;    // the bottom quarter of the last row

function hexPolygonPoints(cx, cy, size) {
  // Pointy-top: vertices at 30 deg increments starting from the top.
  const points = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 90);
    points.push(
      (cx + size * Math.cos(angle)).toFixed(2) + ',' + (cy + size * Math.sin(angle)).toFixed(2)
    );
  }
  return points.join(' ');
}

function renderHexGridMap(mapState) {
  const dims = mapState.gridDimensions || { columns: 6, rows: 5 };
  const cols = Math.max(1, parseInt(dims.columns, 10) || 6);
  const rows = Math.max(1, parseInt(dims.rows, 10) || 5);

  const wrap = make('div', 'map-hex');
  wrap.style.height = (rows * HEX_ROW_UNITS + HEX_CAP_UNITS) + 'px';
  wrap.setAttribute('data-hex-columns', String(cols));

  // One hex is 2 units wide and 2.31 units tall in this local space; rows step
  // 1.732 units and odd rows shift a half-width right.
  const size = 1.1547;                 // circumradius for a 2-unit-wide hex
  const stepX = 2;
  const stepY = size * 1.5;
  const vbWidth = cols * stepX + stepX / 2 + 0.6;
  const vbHeight = (rows - 1) * stepY + size * 2 + 0.6;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-hex-svg');
  svg.setAttribute('viewBox', '0 0 ' + vbWidth.toFixed(2) + ' ' + vbHeight.toFixed(2));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const tilesByPosition = {};
  (mapState.tiles || []).forEach((tile) => {
    tilesByPosition[tile.col + ':' + tile.row] = tile;
  });
  const current = mapState.currentPosition || null;

  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      const tile = tilesByPosition[col + ':' + row] || {};
      const isCurrent = !!(current && current.col === col && current.row === row);
      const cx = 0.3 + size + (col - 1) * stepX + (row % 2 === 0 ? stepX / 2 : 0);
      const cy = 0.3 + size + (row - 1) * stepY;

      const cell = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      cell.setAttribute('points', hexPolygonPoints(cx, cy, size));
      cell.setAttribute('class', 'map-hex-cell');
      cell.setAttribute('data-state', isCurrent ? 'current' : (tile.type || 'empty'));
      svg.appendChild(cell);

      const rawLabel = tile.label || (isCurrent ? 'YOU' : '');
      if (rawLabel) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', cx.toFixed(2));
        text.setAttribute('y', cy.toFixed(2));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('class', 'map-hex-label');
        text.textContent = rawLabel.substring(0, 5);
        svg.appendChild(text);
      }
    }
  }

  wrap.appendChild(svg);
  return wrap;
}

function renderGridMap(mapState) {
  if (mapState.cellShape === 'hex') return renderHexGridMap(mapState);
  const wrap = make('div', 'map-grid');
  const dims = mapState.gridDimensions || { columns: 6, rows: 5 };
  const cols = dims.columns || 6;
  wrap.style.gridTemplateColumns = 'repeat(' + cols + ', 1fr)';
  wrap.style.setProperty('--grid-columns', String(cols));
  wrap.style.setProperty('--grid-rows', String(dims.rows || 1));

  const tilesByPosition = {};
  (mapState.tiles || []).forEach((tile) => {
    tilesByPosition[tile.col + ':' + tile.row] = tile;
  });

  for (let row = 1; row <= dims.rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      const tile = tilesByPosition[col + ':' + row] || {};
      let cellClass = 'map-cell ' + (tile.type || 'empty');
      if (mapState.currentPosition && mapState.currentPosition.col === col && mapState.currentPosition.row === row) {
        cellClass += ' current';
      }

      const cell = make('div', cellClass);
      const rawLabel = tile.label || (mapState.currentPosition && mapState.currentPosition.col === col && mapState.currentPosition.row === row ? 'YOU' : '');
      cell.textContent = rawLabel.substring(0, 5);
      wrap.appendChild(cell);
    }
  }

  return wrap;
}

const ROUTE_LABEL_ABBREVIATIONS = {
  access: 'Acc.',
  airlock: 'Airlock',
  approach: 'Appr.',
  archive: 'Arch.',
  bridge: 'Bridge',
  cargo: 'Cargo',
  command: 'Cmd.',
  corridor: 'Corr.',
  crew: 'Crew',
  direct: 'Dir.',
  eva: 'EVA',
  exterior: 'Ext.',
  habitation: 'Hab.',
  junction: 'Jct.',
  ladder: 'Ldr.',
  lab: 'Lab',
  link: 'Link',
  maintenance: 'Maint.',
  medical: 'Med.',
  node: 'Node',
  passage: 'Pass.',
  run: 'Run',
  science: 'Sci.',
  service: 'Svc.',
  transit: 'Transit',
};

function compactRouteLabel(label, maxChars = 18) {
  const raw = String(label || '').trim();
  if (!raw) return '';
  if (raw.length <= maxChars) return raw;

  const compact = raw.replace(/[A-Za-z]+/g, (word) => {
    const replacement = ROUTE_LABEL_ABBREVIATIONS[word.toLowerCase()];
    return replacement || word;
  });
  if (compact.length <= maxChars) return compact;

  return compact
    .split(/\s+/)
    .map((part) => part.replace(/[aeiou]/gi, ''))
    .join(' ')
    .slice(0, maxChars)
    .trim();
}

function buildRouteCode(index) {
  return 'R' + String(index + 1);
}

// ---------------------------------------------------------------------------
// PTP density tiers — deterministic thresholds for node count
// ---------------------------------------------------------------------------
const PTP_DENSITY = {
  STANDARD_MAX: 8,   // ≤8 nodes: standard sizing + insets
  DENSE_MAX: 12,     // 9–12 nodes: tighter boxes, wider coord range
  // >12: packed — smallest boxes, widest coord range
};

// Insets per density tier (SVG-unit percentages within 0–100 viewBox)
const PTP_INSETS = {
  standard: { xStart: 16, xEnd: 84, yStart: 14, yEnd: 82 },
  dense:    { xStart: 11, xEnd: 89, yStart: 10, yEnd: 86 },
  packed:   { xStart:  8, xEnd: 92, yStart:  7, yEnd: 88 },
};

function ptpDensityTier(nodeCount) {
  if (nodeCount <= PTP_DENSITY.STANDARD_MAX) return 'standard';
  if (nodeCount <= PTP_DENSITY.DENSE_MAX) return 'dense';
  return 'packed';
}

// ---------------------------------------------------------------------------
// THE NODE FOOTPRINT — real pixels (DR-49)
// ---------------------------------------------------------------------------
/**
 * CROSS-FILE CONTRACT — ladder mirror ⇄ `renderer/booklet.css`: the base
 * `.map-node` block, the `.rp-row-cell .map-node` narrow-context cap and the
 * `.map-network[data-ptp-density="dense"|"packed"] .map-node` blocks, plus
 * `.map-network { min-height: 214px }`. booklet.css carries the reverse
 * pointer. **Change them together or the relaxation under-separates and node
 * cards print on top of each other.**
 *
 * WHY THIS TABLE HAD TO EXIST (DR-49, 2026-08-19). `relaxNodePositions()` kept
 * cards apart by `minSep = 9` — a constant in the 0–100 normalized coordinate
 * space the nodes are laid out in. A card's footprint is not in that space: it
 * is fixed in real pixels by the CSS below. At a full column the two happen to
 * agree (9 units of a ~420–466px box is ~40px, near a card's width), which is
 * why 29 of the corpus's 35 full-width networks are clean. In a halves cell the
 * box is 236×212, so 9 units is 21px horizontally against a 54px card — the
 * guard separated by LESS THAN HALF a card and three pairs printed on top of
 * each other (sf-c10-strong-convergence pages 8 and 29, one of them a live
 * `element-collision-scan.mjs` finding). A separation constant expressed in a
 * normalized space is only ever correct at one width.
 *
 * `w` IS AUTHORITATIVE, `h` IS MEASURED. The widths are the CSS `max-width`
 * for the tier, and the corpus reaches them: across 331 rendered cards the
 * per-tier median card width EQUALS the max on every tier. A card's HEIGHT has
 * no CSS constant — it is padding + name lines + gap + meta, so it is measured,
 * not derived: these are the corpus p90 rounded up (standard 38.3, dense 34.8,
 * packed 22.9, measured 2026-08-19). A three-line name reaches 50px and is
 * deliberately not covered — sizing the guard to the tallest card in the corpus
 * would be a witness to one book rather than an instrument.
 */
const NODE_BOX_PX = {
  standard: { w: 66, h: 40 },
  dense:    { w: 54, h: 36 },
  packed:   { w: 46, h: 28 },
};

/** `.rp-row-cell .map-node { max-width: 54px }` — the halves-cell cap. */
const NODE_BOX_ROW_CELL_MAX_W_PX = 54;

/**
 * How much of the frame's WIDTH one edge label's run may occupy, and how close
 * to the frame edge its ends may come — both in coordinate units, which is the
 * one axis that maps linearly onto the box under `preserveAspectRatio="none"`.
 *
 * These are containment bounds, not typography: a label narrower than the
 * frame is unaffected, and the only thing they change is that a long one stops
 * at the margin instead of printing off the paper.
 */
const EDGE_LABEL_MAX_RUN_UNITS = 46;
const EDGE_LABEL_FRAME_MARGIN_UNITS = 2;

// ---------------------------------------------------------------------------
// THE EDGE LABEL IS A BOX, NOT A POINT (2026-08-20)
// ---------------------------------------------------------------------------
/**
 * CROSS-FILE CONTRACT — ladder mirror ⇄ `renderer/booklet.css`: the
 * `.map-edge-label` `font-size` (2.1px) and the
 * `.map-network[data-ptp-density="dense"|"packed"] .map-edge-label` override
 * (1.8px), plus `.map-network[data-has-rail="true"] .map-network-svg`'s 46px
 * left inset. booklet.css carries the reverse pointer. **Change a number there
 * without changing it here and the avoidance below reserves a box that is not
 * the one the browser paints** — which is the same failure as no avoidance at
 * all, only harder to see.
 *
 * WHY THIS EXISTS. `labelCollidesWithNode()` — the retired predicate this
 * replaces — asked whether the label's ANCHOR POINT was within a single radial
 * threshold (6 or 8 coordinate units) of a node's CENTRE. Three things are
 * wrong with that question, and each one produced a defect read off a rendered
 * page on 2026-08-20:
 *
 *   1. A label is a RUN, not a point. `variety-02-homecoming` p.8/p.13: every
 *      route word ("Corridor", "North Pass", "East Hall", "Dock Access") is
 *      anchored in clear air between two cards and then runs UNDER them — the
 *      node layer is opaque HTML painted over this SVG — so the page prints
 *      `rrido`, `orth Pa`, `st Ha`. The anchor passed a test the ink failed.
 *   2. A radius cannot describe a rectangle in a box that is not square, and
 *      this box never is (236×212 and 420×617 are both in the corpus). This is
 *      DR-49's own finding — it fixed the node⇄node test and left the
 *      label⇄node one radial. `the-lumina-protocol` p.8 ("R2" sunk into OLD
 *      CITY LIBRARY) and p.34 ("R1" showing only its "1") are that half.
 *   3. The response to a hit was BINARY — suppress if a route key exists, else
 *      paint it anyway wherever the first candidate landed. On a hub topology
 *      every spoke's label sits near the hub, so every label failed the radial
 *      test at once: `the-lumina-protocol` p.26 prints ONE of ten route codes
 *      (R9) over ten drawn routes, under a Route Key listing R1–R10. A key
 *      whose codes never appear on the map is worse than no key.
 *
 * So: the label gets a real box, the cards get real boxes, and a hit is
 * answered by MOVING the label — suppression is the last resort, not the first.
 */
const EDGE_LABEL_FONT_UNITS = { standard: 2.1, dense: 1.8, packed: 1.8 };

/**
 * `.map-network[data-has-rail="true"] .map-network-svg { left: 46px; width:
 * calc(100% - 46px) }` — the instrumentation rail's inset. The SVG and the node
 * layer are inset together, so the two share one coordinate space; what changes
 * is that a coordinate unit is narrower in real pixels than the column implies.
 */
const NETWORK_RAIL_INSET_PX = 46;

/**
 * Mono advance as a fraction of the em, and the line box as a multiple of it.
 * The advance is used only to CHOOSE a run length; the run that is reserved is
 * the run that is painted, because `textLength` forces it exactly. So an error
 * here costs a few percent of glyph stretch, never a wrong collision box.
 */
const EDGE_LABEL_ADVANCE_EM = 0.62;
const EDGE_LABEL_LINE_EM = 1.25;

/** Air around the label's own ink before it counts as touching something. */
const EDGE_LABEL_PAD_X_UNITS = 0.9;
const EDGE_LABEL_PAD_Y_UNITS = 0.5;

/**
 * The candidate ladder, in preference order. Progress runs from mid-edge
 * outwards (the mid-edge label is the readable one; the ends are where a label
 * starts to look like it belongs to a node instead of a route), the sign
 * alternates by edge index so two edges between the same pair of cards do not
 * stack, and the offset scales multiply the shell's base perpendicular offset.
 *
 * 7 × 2 × 4 = 56 candidates per edge, each one an arithmetic test — the whole
 * search costs less than the DOM node it places.
 */
const EDGE_LABEL_PROGRESSIONS = [0.5, 0.38, 0.62, 0.3, 0.7, 0.22, 0.78];
const EDGE_LABEL_OFFSET_SCALES = [1, 1.7, 2.5, 3.4, 0.4];

/**
 * However hard the search is pushing, a label stops belonging to its own line
 * somewhere. 14 units is a seventh of the frame — past that, a reader would
 * have to guess which edge the word is for, and a guessed label is worth less
 * than a nudged one.
 */
const EDGE_LABEL_MAX_OFFSET_UNITS = 14;

/**
 * A label is dropped only when it would still be sitting on a card after all 56
 * candidates AND the route key exists to carry the word. Expressed as a
 * fraction of the label's own area, so a clipped corner prints (and is legible)
 * while a label buried under a card does not pretend to be readable.
 */
const EDGE_LABEL_SUPPRESS_OVERLAP_RATIO = 0.3;

/** Centre-to-centre box overlap area. Both boxes are centred on their point. */
function boxOverlapArea(ax, ay, aw, ah, bx, by, bw, bh) {
  const ox = Math.min(ax + aw / 2, bx + bw / 2) - Math.max(ax - aw / 2, bx - bw / 2);
  if (ox <= 0) return 0;
  const oy = Math.min(ay + ah / 2, by + bh / 2) - Math.max(ay - ah / 2, by - bh / 2);
  if (oy <= 0) return 0;
  return ox * oy;
}

/**
 * `.map-network { min-height: 214px }` less its 1px border either side — the
 * content box `.map-network-nodes` stretches to, and the ONLY vertical fact
 * this layer can know.
 *
 * THE RESIDUAL, STATED PLAINLY. `.map-network` also carries `flex: 1`, so on a
 * tall page it GROWS: measured 212px in a halves cell (the floor exactly) and
 * 258–617px full-width. Nothing reaches render with the grown height — it is
 * decided by flex at layout time, after this code has run — so the guard prices
 * the floor. That is conservative in the safe direction: on a grown box the
 * vertical threshold buys MORE air than a card needs, never less, and the
 * insets plus the per-pass clamp bound how far that can push anything. Closing
 * it honestly means a height channel, which does not exist and which the
 * estimate could not fill either (it charges `NETWORK_MIN_PX`, this same floor).
 */
const NETWORK_BOX_MIN_HEIGHT_PX = 212;

/**
 * The per-axis separation two node cards owe each other, in coordinate units.
 *
 * The conversion is the whole fix: a footprint in pixels divided by the box it
 * is drawn in, times 100. Feed it the real column and the guard is right at
 * every width instead of at one.
 */
function nodeSeparationUnits(tier, layout) {
  const box = NODE_BOX_PX[tier] || NODE_BOX_PX.standard;
  const widthPx = (layout && layout.widthPx > 0) ? layout.widthPx : PAGE_BUDGET.widthPx;
  const cardW = (layout && layout.halvesCell)
    ? Math.min(box.w, NODE_BOX_ROW_CELL_MAX_W_PX)
    : box.w;
  return {
    x: (cardW / widthPx) * 100,
    y: (box.h / NETWORK_BOX_MIN_HEIGHT_PX) * 100,
  };
}

/**
 * A node card's footprint in coordinate units, for the LABEL's use.
 *
 * Deliberately not `nodeSeparationUnits()`: that one prices the column the
 * relaxation runs in and is DR-49's landed contract, untouched here. This one
 * subtracts the rail, because a rail-bearing map draws in a narrower box and a
 * card therefore occupies MORE of it.
 *
 * THE RESIDUAL IS DR-49'S, AND IT IS WHY THERE ARE TWO BOXES. The vertical
 * divisor is a height nothing reaches render with: `.map-network` carries
 * `flex: 1`, so the real box is 212px in a halves cell (the min-height exactly,
 * measured) but 258–617px full-width. Pricing a card against the floor
 * therefore makes it up to ~2.7× taller than it prints on a full-width map.
 *
 * One assumption cannot serve both questions the search asks, because the safe
 * direction reverses between them:
 *
 *   · "where should this label go?" — over-price the card. A phantom conflict
 *     costs a nudge nobody needed. `avoid` answers this, against the floor.
 *   · "is this label so buried it should not print at all?" — UNDER-price it.
 *     Deleting a legible label is the worse error by far, and it is the error
 *     that shipped: on `the-lumina-protocol` p.26 the floor-priced box found no
 *     air anywhere near a 12-card hub and dropped seven of ten route codes off
 *     a map whose Route Key lists all ten. `bury` answers this, against the
 *     tallest box the corpus measured.
 *
 * In a halves cell the two are IDENTICAL by construction — the measured height
 * there IS the floor — so the generous reading is granted only where the
 * evidence says the box really does grow. The x axis is exact in both.
 */
const NETWORK_BOX_MAX_MEASURED_HEIGHT_PX = 617;

function nodeBoxUnitsForLabels(tier, layout, hasRail) {
  const box = NODE_BOX_PX[tier] || NODE_BOX_PX.standard;
  const columnPx = (layout && layout.widthPx > 0) ? layout.widthPx : PAGE_BUDGET.widthPx;
  const drawPx = Math.max(80, columnPx - (hasRail ? NETWORK_RAIL_INSET_PX : 0));
  const halvesCell = !!(layout && layout.halvesCell);
  const cardW = halvesCell ? Math.min(box.w, NODE_BOX_ROW_CELL_MAX_W_PX) : box.w;
  const w = (cardW / drawPx) * 100;
  const tallestPx = halvesCell
    ? NETWORK_BOX_MIN_HEIGHT_PX
    : NETWORK_BOX_MAX_MEASURED_HEIGHT_PX;
  return {
    avoid: { w, h: (box.h / NETWORK_BOX_MIN_HEIGHT_PX) * 100 },
    bury: { w, h: (box.h / tallestPx) * 100 },
  };
}

// ---------------------------------------------------------------------------
// Deterministic collision-avoidance relaxation
// Pushes overlapping nodes apart in bounded passes. Same input → same output.
// ---------------------------------------------------------------------------
/**
 * TWO AXES, NOT A RADIUS. Cards are rectangles, and two rectangles miss each
 * other the moment EITHER axis clears — so the test is a box overlap, and the
 * push is the minimum translation that ends it. The retired radial test asked
 * one question with one threshold for both axes, which cannot be right in a
 * box that is not square (236×212 and 420×617 are both in the corpus) and
 * which fired on pairs that were already clear on one axis.
 *
 * The axis is chosen by PENETRATION AS A FRACTION OF ITS OWN FOOTPRINT, so the
 * choice is isotropic in real pixels even though the two axes have different
 * scales. Ties and exact coincidences resolve by a fixed direction, so the
 * function stays a pure function of its input: same nodes → same positions.
 */
function relaxNodePositions(nodes, insets, passes, sep) {
  const sepX = sep.x;
  const sepY = sep.y;
  for (let pass = 0; pass < passes; pass++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j]._x - nodes[i]._x;
        const dy = nodes[j]._y - nodes[i]._y;
        const penX = sepX - Math.abs(dx);
        const penY = sepY - Math.abs(dy);
        // Clear on either axis ⇒ the boxes cannot overlap. Nothing to do.
        if (penX <= 0 || penY <= 0) continue;
        if (penX / sepX <= penY / sepY) {
          const push = penX / 2;
          const dir = dx === 0 ? 1 : Math.sign(dx);
          nodes[i]._x -= dir * push;
          nodes[j]._x += dir * push;
        } else {
          const push = penY / 2;
          const dir = dy === 0 ? 1 : Math.sign(dy);
          nodes[i]._y -= dir * push;
          nodes[j]._y += dir * push;
        }
        moved = true;
      }
    }
    // Clamp back to bounds after each pass
    nodes.forEach((node) => {
      node._x = Math.max(insets.xStart, Math.min(insets.xEnd, node._x));
      node._y = Math.max(insets.yStart, Math.min(insets.yEnd, node._y));
    });
    if (!moved) break;
  }
}

// ---------------------------------------------------------------------------
// THE MAZE'S predicate — a point against a radius (D151)
// ---------------------------------------------------------------------------
/**
 * The node-graph path no longer uses this: see the box note above for the three
 * defects the radial test produced there, and `placeEdgeLabel()` for what
 * replaced it.
 *
 * It stays because `renderMazeMap()`'s corridor labels are its other caller,
 * and that arm is NOT fixed by this wave. The maze prints its passage names in
 * a different geometry — anchored beside a vertical leg, centred above a
 * horizontal one — against cells this file has no pixel footprint table for, so
 * converting it would be a second unmeasured guess rather than a second fix.
 *
 * THE CLASS IS THEREFORE STILL LIVE HERE, and stated so that the next reader
 * does not have to rediscover it: a maze corridor label is placed by asking
 * whether its ANCHOR POINT is within one radius of a cell's CENTRE, in a
 * coordinate space that is not square, and the answer to a hit is a single
 * flip to the other side rather than a search. `content/geometry-01-tidewall`
 * is the only fixture in the corpus that exercises it.
 */
function labelCollidesWithNode(lx, ly, nodes, threshold) {
  for (let i = 0; i < nodes.length; i++) {
    if (Math.hypot(lx - nodes[i]._x, ly - nodes[i]._y) < threshold) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Place one edge label clear of the node cards and of the labels already placed
// ---------------------------------------------------------------------------
/**
 * Walks the candidate ladder and returns the first position whose box touches
 * nothing; failing that, the least-bad one, with the overlap it could not
 * avoid so the caller can decide whether it is still worth printing.
 *
 * Node overlap is weighted above label overlap because a card is opaque — it
 * ERASES the glyphs under it — while two labels that graze each other are both
 * still readable. Pure function of its arguments: same map, same placements.
 */
function placeEdgeLabel(spec, nodes, nodeBox, placedLabels) {
  let best = null;
  const cardOverlap = (x, y, card) => {
    let total = 0;
    for (let n = 0; n < nodes.length; n++) {
      total += boxOverlapArea(
        x, y, spec.boxW, spec.boxH,
        nodes[n]._x, nodes[n]._y, card.w, card.h,
      );
    }
    return total;
  };
  // Offset OUTERMOST: every position ALONG the edge is tried at one
  // perpendicular displacement before the next displacement is tried at all. A
  // label that has walked along its own line still reads as that line's label;
  // one shoved sideways starts to look like it belongs to a different edge, so
  // sliding is spent first and pushing out last. (The ladder's final entry is
  // deliberately BELOW the base offset — a tuck close to the line, tried only
  // when everything roomier has failed.)
  for (let oi = 0; oi < EDGE_LABEL_OFFSET_SCALES.length; oi++) {
    const offset = Math.min(
      EDGE_LABEL_MAX_OFFSET_UNITS,
      spec.baseOffset * EDGE_LABEL_OFFSET_SCALES[oi],
    );
    for (let pi = 0; pi < EDGE_LABEL_PROGRESSIONS.length; pi++) {
      const progress = EDGE_LABEL_PROGRESSIONS[pi];
      for (let si = 0; si < 2; si++) {
        const sign = si === 0 ? spec.preferredSign : -spec.preferredSign;
        const x = spec.clampX(spec.fromX + (spec.dx * progress) + (spec.normalX * offset * sign));
        const y = spec.clampY(spec.fromY + (spec.dy * progress) + (spec.normalY * offset * sign));

        const nodeOverlap = cardOverlap(x, y, nodeBox.avoid);
        let labelOverlap = 0;
        for (let l = 0; l < placedLabels.length; l++) {
          const other = placedLabels[l];
          labelOverlap += boxOverlapArea(
            x, y, spec.boxW, spec.boxH,
            other.x, other.y, other.w, other.h,
          );
        }
        if (nodeOverlap === 0 && labelOverlap === 0) {
          return { x, y, buriedOverlap: 0, clear: true };
        }
        const penalty = (nodeOverlap * 3) + labelOverlap;
        if (!best || penalty < best.penalty) best = { x, y, penalty, clear: false };
      }
    }
  }
  // Nothing was clear under the cautious card. Whether it is worth printing is
  // asked of the generous one — see nodeBoxUnitsForLabels().
  best.buriedOverlap = cardOverlap(best.x, best.y, nodeBox.bury);
  return best;
}

// ---------------------------------------------------------------------------
// Truncate long node labels deterministically for dense maps
// ---------------------------------------------------------------------------
function compactNodeLabel(label, maxLen) {
  const raw = String(label || '').trim();
  if (raw.length <= maxLen) return raw;
  // Try dropping parenthesised suffixes first
  const stripped = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (stripped.length <= maxLen && stripped.length > 0) return stripped;
  // Hard truncate
  return raw.slice(0, maxLen - 1).trim() + '\u2026';
}

/**
 * @param {object} mapState
 * @param {{widthPx:number, halvesCell:boolean}|null} layout — DR-49's render
 *   width channel. Absent (the legacy `booklet-primitives.js` interlude path)
 *   means the page column, which is where an interlude map renders anyway.
 */
function renderPointMap(mapState, layout) {
  const wrap = make('div', 'map-network');
  const shellFamily = ((mapState.artifactIdentity || {}).shellFamily || '').toLowerCase();
  // Constellation mode: same geometry, different reading. An edge stops being a
  // way to get there and becomes a tie, so the CSS variant restyles the edge
  // vocabulary and the printed nouns follow — a legend that still said "routes"
  // over a sociogram would be the interface telling the player the wrong game.
  const relational = mapState.edgeSemantics === 'relational';
  wrap.setAttribute('data-edge-semantics', relational ? 'relational' : 'traversal');
  const edgeNoun = relational ? 'ties' : 'routes';
  const useInstrumentationRail = shellFamily === 'classified-packet';
  if (useInstrumentationRail) {
    wrap.setAttribute('data-has-rail', 'true');
    const rail = make('div', 'map-network-rail');
    [
      ['Sector', mapState.title || 'Topology'],
      ['Current', mapState.currentNode || '--'],
      [relational ? 'Ties' : 'Routes', String((mapState.edges || []).length || 0)],
    ].forEach(([label, value]) => {
      const item = make('div', 'map-network-rail-item');
      item.appendChild(make('div', 'map-network-rail-label', label));
      item.appendChild(make('div', 'map-network-rail-value', value));
      rail.appendChild(item);
    });
    wrap.appendChild(rail);
  }

  // ── TWO COORDINATE SYSTEMS, ONE BOX (DR-49's second half) ────────────────
  // The node cards are HTML, positioned `left: _x%; top: _y%` of
  // `.map-network-nodes` — a plain CSS percentage of the REAL box, resolved
  // per axis. This SVG draws the edges BETWEEN those cards from the same `_x`
  // / `_y` numbers, so it must resolve them the same way or the lines connect
  // nothing.
  //
  // `xMidYMid meet` did the opposite: it locked the 0–100 viewBox to a SQUARE
  // scaled by min(width, height) and centred that square in the box, so the
  // two systems agreed only at dead centre and diverged with distance from it.
  // Measured across the sealed corpus (2026-08-19): every line endpoint sat a
  // median 3.7–8.2px from its card in a near-square halves cell (236×212), and
  // a median of 19–71px away on the full-width networks, which are 419.9×550–617
  // — a 5:7 box. That is not a nudge: on `the-conclave-s-legacy` p.14 all four
  // routes float in the middle of the frame while all five nodes sit stranded
  // at the top and bottom edges, touching nothing. A player cannot read which
  // node connects to which, which is the entire job of a node graph. 35 of the
  // corpus's 41 networks render at that aspect.
  //
  // `none` maps u → u% of width and v → v% of height — the CSS percentage
  // resolution, exactly. The cost is a non-uniform scale on the SVG's own
  // paint: stroke thickness now varies with a line's angle, and the `<text>`
  // labels stretch with the box. Both were judged on rendered pages before
  // this shipped (see the DR-49 report) — and the labels already carry
  // `textLength` + `lengthAdjust="spacingAndGlyphs"`, so deliberate horizontal
  // fitting is this component's existing idiom, not a new artefact. Geometry
  // that is RIGHT beats paint that is uniform: an edge that misses its node
  // says something false about the game.
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-network-svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');

  const nodes = (mapState.nodes || []).map((node) => ({ ...node }));
  const nodeCount = nodes.length;
  const tier = ptpDensityTier(nodeCount);
  const insets = PTP_INSETS[tier];

  // Set density tier as CSS custom property for node sizing
  wrap.setAttribute('data-ptp-density', tier);

  // Compute actual coordinate bounding box (handles negative + zero coords)
  let rawMinX = Infinity, rawMaxX = -Infinity;
  let rawMinY = Infinity, rawMaxY = -Infinity;
  nodes.forEach((node) => {
    const nx = Number(node.x) || 0;
    const ny = Number(node.y) || 0;
    if (nx < rawMinX) rawMinX = nx;
    if (nx > rawMaxX) rawMaxX = nx;
    if (ny < rawMinY) rawMinY = ny;
    if (ny > rawMaxY) rawMaxY = ny;
  });
  if (!isFinite(rawMinX)) { rawMinX = 0; rawMaxX = 1; }
  if (!isFinite(rawMinY)) { rawMinY = 0; rawMaxY = 1; }

  // Normalize coordinates using actual min/max range → inset range
  const spanX = Math.max(1, rawMaxX - rawMinX);
  const spanY = Math.max(1, rawMaxY - rawMinY);

  const nodesById = {};
  nodes.forEach((node) => {
    const nx = Number(node.x) || 0;
    const ny = Number(node.y) || 0;
    node._x = insets.xStart + ((nx - rawMinX) / spanX) * (insets.xEnd - insets.xStart);
    node._y = insets.yStart + ((ny - rawMinY) / spanY) * (insets.yEnd - insets.yStart);
    nodesById[node.id] = node;
  });

  // Deterministic collision-avoidance relaxation (3 passes for standard, 5 for dense/packed)
  const relaxPasses = tier === 'standard' ? 3 : 5;
  relaxNodePositions(nodes, insets, relaxPasses, nodeSeparationUnits(tier, layout));

  // Maximum label length per tier
  const nodeLabelMax = tier === 'packed' ? 18 : tier === 'dense' ? 24 : 40;

  // Edge label suppression: aggressive suppression is only safe when an
  // alternate route-label surface (the route key panel) will be rendered.
  // renderRouteKey() is gated on classified-packet, so that's our signal.
  const hasRouteKey = shellFamily === 'classified-packet';
  const edgeLabelThreshold = hasRouteKey
    ? (tier === 'packed' ? 6 : tier === 'dense' ? 10 : 999)
    : 999; // no route key → always attempt inline labels

  // The two boxes the label placement reasons about: a card's footprint, and
  // the running list of labels already on this map. The list is what stops a
  // hub topology from stacking every spoke's label in one place.
  const labelNodeBox = nodeBoxUnitsForLabels(tier, layout, useInstrumentationRail);
  const labelFontUnits = EDGE_LABEL_FONT_UNITS[tier] || EDGE_LABEL_FONT_UNITS.standard;
  const placedLabels = [];

  (mapState.edges || []).forEach((edge, edgeIndex) => {
    const from = nodesById[edge.from];
    const to = nodesById[edge.to];
    if (!from || !to) return;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(from._x || 0));
    line.setAttribute('y1', String(from._y || 0));
    line.setAttribute('x2', String(to._x || 0));
    line.setAttribute('y2', String(to._y || 0));
    line.setAttribute('class', 'map-edge');
    line.setAttribute('data-state', edge.state || 'open');
    svg.appendChild(line);

    // Determine whether to show inline edge label
    const edgeCount = (mapState.edges || []).length;
    const showInlineLabel = edge.label && edgeCount <= edgeLabelThreshold;

    if (showInlineLabel) {
      const dx = (to._x || 0) - (from._x || 0);
      const dy = (to._y || 0) - (from._y || 0);
      const distance = Math.max(1, Math.hypot(dx, dy));
      const normalX = -dy / distance;
      const normalY = dx / distance;
      const offsetSign = edgeIndex % 2 === 0 ? 1 : -1;
      const isDeferredRoute = edge.state === 'locked' || edge.state === 'inaccessible';
      // Relational ties are drawn heavier than traversal edges (a `strong` tie
      // is 2.4 wide), so a 3.2 offset put the label ON the line and a strong
      // tie read as a struck-through one — the opposite of what it means.
      const labelOffset = shellFamily === 'classified-packet'
        ? (isDeferredRoute ? 6.4 : 4.8)
        : (relational ? 4.8 : 3.2);

      const labelText = shellFamily === 'classified-packet'
        ? buildRouteCode(edgeIndex)
        : compactRouteLabel(edge.label, distance < 22 ? 12 : 16);

      // THE RUN IS THE TEXT'S OWN WIDTH (2026-08-20). `textLength` +
      // `lengthAdjust="spacingAndGlyphs"` does not resize type — it FORCES the
      // run to the number given, stretching letterforms and the air between
      // them to reach it. The retired arithmetic charged 3.6 units per
      // character against a ~1.3-unit mono advance and floored the whole run at
      // 10 units, so every label was painted at roughly three times the width
      // its glyphs need: "R9" spanning a tenth of the frame on
      // `the-lumina-protocol` p.26, `variety-02-homecoming`'s p.8 routes
      // reading as spaced-out display type ("L o c k e d") laid across two
      // cards. Two costs, one cause — a stretched label is less legible AND
      // three times as likely to have a card under some part of it. Sizing the
      // run to the advance is therefore half of the occlusion fix, not a
      // cosmetic aside.
      //
      // THE RUN MAY STILL NOT LEAVE THE FRAME (DR-49). The ceiling and the
      // margin below are unchanged and remain pure X arithmetic: under
      // `preserveAspectRatio="none"` the x axis maps straight onto the box
      // width, so a run wider than the frame prints off the paper.
      const naturalRun = labelText.length * labelFontUnits * EDGE_LABEL_ADVANCE_EM;
      const textLength = Math.min(EDGE_LABEL_MAX_RUN_UNITS, Math.max(2, naturalRun));
      const boxW = textLength + (EDGE_LABEL_PAD_X_UNITS * 2);
      const boxH = (labelFontUnits * EDGE_LABEL_LINE_EM) + (EDGE_LABEL_PAD_Y_UNITS * 2);
      // Containment runs INSIDE the search, not after it: a position judged
      // clear and then clamped into the frame is a position nothing checked.
      const halfW = boxW / 2;
      const halfH = boxH / 2;
      const clampX = (x) => Math.max(
        EDGE_LABEL_FRAME_MARGIN_UNITS + halfW,
        Math.min(100 - EDGE_LABEL_FRAME_MARGIN_UNITS - halfW, x),
      );
      const clampY = (y) => Math.max(
        EDGE_LABEL_FRAME_MARGIN_UNITS + halfH,
        Math.min(100 - EDGE_LABEL_FRAME_MARGIN_UNITS - halfH, y),
      );

      const spot = placeEdgeLabel({
        fromX: from._x || 0,
        fromY: from._y || 0,
        dx,
        dy,
        normalX,
        normalY,
        baseOffset: labelOffset,
        preferredSign: offsetSign,
        boxW,
        boxH,
        clampX,
        clampY,
      }, nodes, labelNodeBox, placedLabels);

      // Suppression is now the LAST resort and needs both halves: the search
      // found nowhere clear, the label is still substantially under a card, and
      // a route key exists to carry the word anyway. Without a route key a
      // best-effort position always prints — a fragment of a word beats a route
      // with no name at all.
      const buried = !spot.clear
        && (spot.buriedOverlap / (boxW * boxH)) >= EDGE_LABEL_SUPPRESS_OVERLAP_RATIO;
      if (!buried || !hasRouteKey) {
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', String(spot.x));
        label.setAttribute('y', String(spot.y));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.setAttribute('class', 'map-edge-label');
        label.setAttribute('textLength', String(textLength));
        label.setAttribute('lengthAdjust', 'spacingAndGlyphs');
        label.textContent = labelText;
        svg.appendChild(label);
        placedLabels.push({ x: spot.x, y: spot.y, w: boxW, h: boxH });
      }
    }
  });
  wrap.appendChild(svg);

  const nodeLayer = make('div', 'map-network-nodes');
  nodes.forEach((node) => {
    const card = make('div', 'map-node');
    card.setAttribute('data-state', node.state || 'empty');
    if (mapState.currentNode && mapState.currentNode === node.id) {
      card.setAttribute('data-current', 'true');
    }
    card.style.left = String(node._x || 0) + '%';
    card.style.top = String(node._y || 0) + '%';
    card.appendChild(make('div', 'map-node-name', compactNodeLabel(node.label || node.id, nodeLabelMax)));
    card.appendChild(make('div', 'map-node-meta', node.id || ''));
    nodeLayer.appendChild(card);
  });
  wrap.appendChild(nodeLayer);

  const legend = make('div', 'map-network-legend');
  legend.appendChild(make('div', 'map-network-chip', (nodeCount || 0) + ' nodes'));
  legend.appendChild(make('div', 'map-network-chip', ((mapState.edges || []).length || 0) + ' ' + edgeNoun));
  if (mapState.currentNode) {
    legend.appendChild(make('div', 'map-network-chip', 'Current ' + mapState.currentNode));
  }
  wrap.appendChild(legend);
  return wrap;
}

function renderRouteKey(mapState) {
  const shellFamily = ((mapState.artifactIdentity || {}).shellFamily || '').toLowerCase();
  if (shellFamily !== 'classified-packet' || mapState.mapType !== 'point-to-point' || !(mapState.edges || []).length) {
    return null;
  }

  const wrap = make('div', 'map-route-key');
  wrap.appendChild(make('div', 'doc-label', 'Route Key'));

  const grid = make('div', 'map-route-key-grid');
  (mapState.edges || []).forEach((edge, index) => {
    const row = make('div', 'map-route-key-row');
    row.appendChild(make('div', 'map-route-key-code', buildRouteCode(index)));
    row.appendChild(make('div', 'map-route-key-label', edge.label || 'Route'));
    grid.appendChild(row);
  });
  wrap.appendChild(grid);
  return wrap;
}

function renderLinearMap(mapState) {
  const wrap = make('div', 'map-track');
  wrap.setAttribute('data-direction', mapState.direction || 'horizontal');
  (mapState.positions || []).forEach((position) => {
    const step = make('div', 'map-track-step');
    const isCurrent = position.index === mapState.currentPosition;
    step.setAttribute('data-state', isCurrent ? 'current' : (position.state || 'empty'));
    step.appendChild(make('div', 'map-track-index', String(position.index)));
    step.appendChild(make('div', 'map-track-label', position.label || ''));
    if (position.annotation) {
      step.appendChild(make('div', 'map-track-meta', position.annotation));
    }
    wrap.appendChild(step);
  });
  return wrap;
}

/**
 * THE DRAWING SURFACE IS ITS OWN BOX (DR-12, 2026-08-18).
 *
 * A seed marker is placed by PERCENTAGE of the grid it belongs to — `left` is
 * `col / --grid-columns`, `top` is `row / --grid-rows`. Percentages resolve
 * against the nearest positioned ancestor, so while the seeds and the prompt
 * chips shared one box, the grid the markers were placed on was not the grid
 * the reader sees: the container grew as prompts stacked in normal flow, the
 * percentages stretched with it, and the bottom-row markers landed in prompt
 * space. Six of the eight sibling collisions in the sealed corpus were exactly
 * this pair — `.player-map-seed` printed over `.player-map-prompt`, at 57–79%
 * of the smaller glyph run, on five books and pages every other gate called
 * clean (the collision scan is the only instrument that can see it: nothing
 * clips, so the own-box overflow scan is blind, and the page never overflows,
 * so the density solver is blind).
 *
 * THE FIX IS A POSITIONING CONTEXT, NOT A NUDGE. `.player-map-canvas` owns the
 * dot grid, the seed markers and the coordinate space they are placed in; the
 * prompt chips are siblings BELOW it. The markers can no longer address a
 * region the prompts occupy, whatever the prompts do — which is the difference
 * between removing a collision and moving it.
 *
 * IT ALSO STOPS THE PROMPTS EATING THE PAPER. The chips were printed on top of
 * the surface the player is told to draw on (the pencil-only law: the surface
 * IS the mechanism). Below it, the drawing area is honestly delimited.
 *
 * CROSS-FILE CONTRACT — `atoms/map-panel.js` PLAYER_CANVAS_MIN_PX mirrors the
 * canvas `min-height` in booklet.css, because the panel is now canvas + prompt
 * flow rather than max(canvas, prompt flow). Move them together.
 */
function renderPlayerMap(mapState) {
  const wrap = make('div', 'player-map');
  wrap.style.setProperty('--grid-columns', mapState.dimensions.columns);
  wrap.style.setProperty('--grid-rows', mapState.dimensions.rows);
  wrap.setAttribute('data-canvas-type', mapState.canvasType || 'dot-grid');
  const canvas = make('div', 'player-map-canvas');
  (mapState.seedMarkers || []).forEach((marker) => {
    const seed = make('div', 'player-map-seed', marker.label || '');
    seed.style.left = 'calc((' + Math.max(0, (marker.col || 1) - 0.5) + ' / var(--grid-columns)) * 100%)';
    seed.style.top = 'calc((' + Math.max(0, (marker.row || 1) - 0.5) + ' / var(--grid-rows)) * 100%)';
    canvas.appendChild(seed);
  });
  wrap.appendChild(canvas);
  (mapState.prompts || []).slice(0, 4).forEach((prompt) => {
    wrap.appendChild(make('div', 'player-map-prompt', prompt));
  });
  return wrap;
}

// ---------------------------------------------------------------------------
// concentric — approach rings
// ---------------------------------------------------------------------------
/**
 * Nested rings, OUTERMOST FIRST, drawn in the same 100x100 viewBox idiom every
 * other SVG map uses. The band between ring i and ring i+1 carries ring i's
 * label on the vertical meridian, where a printed label has the most room.
 *
 * The whole diagram is stroke-and-dash, never fill: the bands are where the
 * player writes, so filling them would take the surface away, and a hue-coded
 * ring would not survive the B&W print requirement.
 */
const RINGS_OUTER_R = 46;

/** Ring i's radius, outermost first, for an N-ring diagram. */
function ringRadius(index, count) {
  return RINGS_OUTER_R - (index * (RINGS_OUTER_R / count));
}

function renderRingsMap(mapState) {
  const rings = Array.isArray(mapState.rings) ? mapState.rings : [];
  const count = rings.length;
  const wrap = make('div', 'map-rings');
  wrap.setAttribute('data-ring-count', String(count));

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-rings-svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const current = parseInt(mapState.currentRing, 10) || 0;

  rings.forEach((ring, index) => {
    const radius = ringRadius(index, Math.max(1, count));
    const inner = index + 1 < count ? ringRadius(index + 1, count) : 0;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', radius.toFixed(2));
    circle.setAttribute('class', 'map-ring');
    circle.setAttribute('data-state', ring.state || 'empty');
    if (current === index + 1) circle.setAttribute('data-current', 'true');
    svg.appendChild(circle);

    const label = String(ring.label || '').trim();
    if (!label) return;

    // Mid-band on the meridian above centre. The chord at that height bounds
    // how wide the label may be; textLength only engages when the natural
    // width would exceed it, so short labels are never stretched.
    const bandMid = (radius + inner) / 2;
    const y = 50 - bandMid;
    const chord = 2 * Math.sqrt(Math.max(1, (radius * radius) - (bandMid * bandMid)));
    const available = Math.max(12, chord * 0.82);
    const natural = label.length * 2.2;

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '50');
    text.setAttribute('y', y.toFixed(2));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('class', 'map-ring-label');
    if (natural > available) {
      text.setAttribute('textLength', available.toFixed(2));
      text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    }
    text.textContent = label;
    svg.appendChild(text);
  });

  wrap.appendChild(svg);

  const legend = make('div', 'map-rings-legend');
  legend.appendChild(make('div', 'map-rings-chip', count + (count === 1 ? ' ring' : ' rings')));
  if (current > 0 && rings[current - 1]) {
    legend.appendChild(make('div', 'map-rings-chip', 'Held to ' + (rings[current - 1].label || current)));
  }
  wrap.appendChild(legend);

  // Write-in breach boxes: the pencil half of "mark breaches". Fixed row
  // height, so the body's modelled height stays exact.
  const breaches = Math.max(0, parseInt(mapState.breachMarks, 10) || 0);
  if (breaches > 0) {
    const row = make('div', 'map-rings-breach');
    row.appendChild(make('div', 'map-rings-breach-label', 'Breaches'));
    for (let i = 0; i < breaches; i += 1) {
      row.appendChild(make('div', 'map-rings-breach-box'));
    }
    wrap.appendChild(row);
  }

  return wrap;
}

// ---------------------------------------------------------------------------
// maze — orthogonal corridor graph
// ---------------------------------------------------------------------------
/**
 * Nodes are ROLES (junction / dead-end / door / entrance / goal); passages are
 * PROGRESS (open / locked / hidden). That split is deliberate and is the
 * difference between this and point-to-point: on a network the node carries the
 * progress state, because the question is where you have been. In a labyrinth
 * the question is what you have learned about the shape, so the topology role
 * is printed and the doors are what change week over week.
 *
 * Corridors are horizontal-leg-first elbows — always, never alternating — so a
 * given maze draws the same way every render and the player can annotate a
 * printed page that will still match next week's copy.
 */
const MAZE_DENSITY_MAX_STANDARD = 8;

const MAZE_INSETS = {
  standard: { xStart: 14, xEnd: 86, yStart: 13, yEnd: 84 },
  dense:    { xStart: 10, xEnd: 90, yStart: 9,  yEnd: 88 },
};

function renderMazeMap(mapState) {
  const wrap = make('div', 'map-maze');
  const nodes = (mapState.nodes || []).map((node) => ({ ...node }));
  const tier = nodes.length <= MAZE_DENSITY_MAX_STANDARD ? 'standard' : 'dense';
  const insets = MAZE_INSETS[tier];
  wrap.setAttribute('data-maze-density', tier);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-maze-svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Same coordinate normalisation as the network: authored 1-12 coords, or any
  // other integer range, map onto the inset box by their own bounds.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.forEach((node) => {
    const nx = Number(node.x) || 0;
    const ny = Number(node.y) || 0;
    if (nx < minX) minX = nx;
    if (nx > maxX) maxX = nx;
    if (ny < minY) minY = ny;
    if (ny > maxY) maxY = ny;
  });
  if (!isFinite(minX)) { minX = 0; maxX = 1; }
  if (!isFinite(minY)) { minY = 0; maxY = 1; }
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  const byId = {};
  nodes.forEach((node) => {
    node._x = insets.xStart + (((Number(node.x) || 0) - minX) / spanX) * (insets.xEnd - insets.xStart);
    node._y = insets.yStart + (((Number(node.y) || 0) - minY) / spanY) * (insets.yEnd - insets.yStart);
    byId[node.id] = node;
  });

  (mapState.passages || []).forEach((passage) => {
    const from = byId[passage.from];
    const to = byId[passage.to];
    if (!from || !to) return;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', [
      'M', from._x.toFixed(2), from._y.toFixed(2),
      'H', to._x.toFixed(2),
      'V', to._y.toFixed(2)
    ].join(' '));
    path.setAttribute('class', 'map-corridor');
    path.setAttribute('data-state', passage.state || 'open');
    svg.appendChild(path);

    // A locked passage prints its door: a bar across the longer leg, which is
    // the mark the player crosses out when the door opens.
    if (passage.state === 'locked') {
      const horizontalLeg = Math.abs(to._x - from._x);
      const verticalLeg = Math.abs(to._y - from._y);
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      if (horizontalLeg >= verticalLeg) {
        const midX = (from._x + to._x) / 2;
        bar.setAttribute('x1', midX.toFixed(2));
        bar.setAttribute('y1', (from._y - 2.6).toFixed(2));
        bar.setAttribute('x2', midX.toFixed(2));
        bar.setAttribute('y2', (from._y + 2.6).toFixed(2));
      } else {
        const midY = (from._y + to._y) / 2;
        bar.setAttribute('x1', (to._x - 2.6).toFixed(2));
        bar.setAttribute('y1', midY.toFixed(2));
        bar.setAttribute('x2', (to._x + 2.6).toFixed(2));
        bar.setAttribute('y2', midY.toFixed(2));
      }
      bar.setAttribute('class', 'map-corridor-door');
      svg.appendChild(bar);
    }

    // The corridor's name — the PTP twin's `edge.label` made maze-native
    // (found authored-but-dropped at D151; seven labels in the tidewall
    // fixture never printed). The label rides the LONGER leg, the door bar's
    // own convention, and sits clear of the corridor so the pencil's trace
    // stays unobstructed (the write-in law): middle-anchored above a
    // horizontal leg, start/end-anchored beside a vertical one — an anchored
    // side never spills text back across the line the player draws on. Placed
    // best-effort on collision because the maze has no route-key surface to
    // carry a suppressed label (the same reasoning as PTP's !hasRouteKey arm).
    const labelText = compactRouteLabel(passage.label, tier === 'dense' ? 10 : 14);
    if (labelText) {
      const legH = Math.abs(to._x - from._x);
      const legV = Math.abs(to._y - from._y);
      const collisionR = tier === 'dense' ? 5 : 6;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      if (legH >= legV) {
        const midX = (from._x + to._x) / 2;
        let ly = from._y - 3.2;
        if (labelCollidesWithNode(midX, ly, nodes, collisionR)) ly = from._y + 3.4;
        text.setAttribute('x', midX.toFixed(2));
        text.setAttribute('y', ly.toFixed(2));
        text.setAttribute('text-anchor', 'middle');
      } else {
        const midY = (from._y + to._y) / 2;
        let lx = to._x + 2.2;
        let anchor = 'start';
        if (labelCollidesWithNode(lx, midY, nodes, collisionR)) { lx = to._x - 2.2; anchor = 'end'; }
        text.setAttribute('x', lx.toFixed(2));
        text.setAttribute('y', midY.toFixed(2));
        text.setAttribute('text-anchor', anchor);
      }
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('class', 'map-maze-passage-label');
      text.textContent = labelText;
      svg.appendChild(text);
    }
  });

  const markerR = tier === 'dense' ? 2.4 : 3;
  nodes.forEach((node) => {
    const role = node.state || 'junction';
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'map-maze-node');
    group.setAttribute('data-state', role);

    if (role === 'entrance' || role === 'goal') {
      const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      box.setAttribute('x', (node._x - markerR).toFixed(2));
      box.setAttribute('y', (node._y - markerR).toFixed(2));
      box.setAttribute('width', (markerR * 2).toFixed(2));
      box.setAttribute('height', (markerR * 2).toFixed(2));
      box.setAttribute('class', 'map-maze-marker');
      group.appendChild(box);
      if (role === 'goal') {
        const inner = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const r2 = markerR * 0.5;
        inner.setAttribute('x', (node._x - r2).toFixed(2));
        inner.setAttribute('y', (node._y - r2).toFixed(2));
        inner.setAttribute('width', (r2 * 2).toFixed(2));
        inner.setAttribute('height', (r2 * 2).toFixed(2));
        inner.setAttribute('class', 'map-maze-marker-core');
        group.appendChild(inner);
      }
    } else {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', node._x.toFixed(2));
      dot.setAttribute('cy', node._y.toFixed(2));
      dot.setAttribute('r', String(markerR));
      dot.setAttribute('class', 'map-maze-marker');
      group.appendChild(dot);
      if (role === 'dead-end') {
        // The stub cap: a bar across the dead end, the shape the player is
        // hunting. Finding one is intel, never a penalty.
        const cap = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        cap.setAttribute('x1', (node._x - markerR * 1.5).toFixed(2));
        cap.setAttribute('y1', node._y.toFixed(2));
        cap.setAttribute('x2', (node._x + markerR * 1.5).toFixed(2));
        cap.setAttribute('y2', node._y.toFixed(2));
        cap.setAttribute('class', 'map-maze-cap');
        group.appendChild(cap);
      }
    }

    const label = compactNodeLabel(node.label || '', tier === 'dense' ? 10 : 14);
    if (label) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node._x.toFixed(2));
      text.setAttribute('y', (node._y + markerR + 3.4).toFixed(2));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'map-maze-label');
      text.textContent = label;
      group.appendChild(text);
    }
    svg.appendChild(group);
  });

  wrap.appendChild(svg);

  const legend = make('div', 'map-maze-legend');
  const passages = (mapState.passages || []).length;
  legend.appendChild(make('div', 'map-maze-chip', nodes.length + ' nodes'));
  legend.appendChild(make('div', 'map-maze-chip', passages + (passages === 1 ? ' passage' : ' passages')));
  const deadEnds = nodes.filter((node) => node.state === 'dead-end').length;
  if (deadEnds) legend.appendChild(make('div', 'map-maze-chip', deadEnds + ' dead ends'));
  wrap.appendChild(legend);

  return wrap;
}

/**
 * @param {object} mapState
 * @param {{widthPx:number, halvesCell:boolean}|null} [layout] — DR-49's render
 *   width channel, forwarded to the only body that lays content out in a
 *   normalized coordinate space (the node network). Every other body is either
 *   fixed geometry or flows in CSS and needs nothing.
 */
export function renderMapSection(mapState, layout = null) {
  // .map-zone is the peer of .cipher-zone and .oracle-zone in the zone contract.
  // All zone-level CSS (classified-packet, boardStateMode variants, data-layout-variant
  // rules) targets .map-zone.  The inner .map-content holds the map type content.
  const zone = make('div', 'map-zone');
  const section = make('div', 'map-content');
  section.setAttribute('data-map-family', mapState.family || 'none');
  section.setAttribute('data-map-type', mapState.mapType || 'grid');
  section.appendChild(make('div', 'map-title', mapState.title || 'Map'));

  if (mapState.mapType === 'point-to-point' || mapState.mapType === 'node-graph') {
    section.appendChild(renderPointMap(mapState, layout));
    const routeKey = renderRouteKey(mapState);
    if (routeKey) section.appendChild(routeKey);
  } else if (mapState.mapType === 'linear-track') {
    section.appendChild(renderLinearMap(mapState));
  } else if (mapState.mapType === 'player-drawn') {
    section.appendChild(renderPlayerMap(mapState));
  } else if (mapState.mapType === 'concentric') {
    section.appendChild(renderRingsMap(mapState));
  } else if (mapState.mapType === 'maze') {
    section.appendChild(renderMazeMap(mapState));
  } else {
    section.appendChild(renderGridMap(mapState));
  }

  if (mapState.floorLabel) section.appendChild(make('div', 'map-annotation', mapState.floorLabel));
  if (mapState.mapNote) section.appendChild(make('div', 'map-note', mapState.mapNote));
  zone.appendChild(section);
  return zone;
}

/**
 * The wrapping strip of plaintext squares. Its cell count comes from
 * resolveWorkspaceCellCount() in contracts/contract-constants.mjs — shared
 * with the estimate, not mirrored (see that function's note).
 *
 * `cellCount` was in the schema and in the corpus for a full release cycle
 * without being read here: Persephone authors 11 / 16 / 6 / 6 / 4 squares for
 * its five ciphers and every one of them printed the 10-square rows x cols
 * default. A cipher whose extraction yields four characters printing ten boxes
 * is not a cosmetic miss — the writing surface is telling the player the wrong
 * answer length.
 */
function renderCellWorkspace(workSpace) {
  const grid = make('div', 'plaintext-grid');
  const size = resolveWorkspaceCellCount(workSpace);
  for (let i = 0; i < size; i += 1) {
    grid.appendChild(make('div', 'plaintext-cell'));
  }
  return grid;
}

function renderLinedWorkspace(workSpace) {
  const wrap = make('div', 'cipher-lined-workspace');
  const rows = Math.max(2, parseInt(workSpace.rows, 10) || 3);
  for (let index = 0; index < rows; index += 1) {
    wrap.appendChild(make('div', 'cipher-lined-row'));
  }
  return wrap;
}

function renderBlankWorkspace(workSpace) {
  const wrap = make('div', 'cipher-blank-workspace');
  const rows = Math.max(2, parseInt(workSpace.rows, 10) || 3);
  wrap.style.setProperty('--workspace-rows', String(rows));
  return wrap;
}

function renderBoxedWorkspace(workSpace) {
  const wrap = make('div', 'cipher-boxed-workspace');
  const rows = Math.max(1, parseInt(workSpace.rows, 10) || 2);
  const cols = Math.max(2, parseInt(workSpace.cols, 10) || 4);
  wrap.style.setProperty('--workspace-cols', String(cols));
  for (let index = 0; index < rows * cols; index += 1) {
    wrap.appendChild(make('div', 'cipher-boxed-cell'));
  }
  return wrap;
}

/**
 * CROSS-FILE CONTRACT — the style→geometry map here is mirrored by
 * workspaceHeight() in atoms/cipher-panel.js. Both resolve the authored style
 * through resolveWorkspaceStyle() and the cells count through
 * resolveWorkspaceCellCount() (contracts/contract-constants.mjs), so an alias
 * measures as the geometry it renders as and a declared cell count is measured
 * as the strip it prints. Change the branch set in one and the estimate lies;
 * add a style and both files plus VALID_WORKSPACE_STYLES must move together.
 *
 * Unknown values fall to DEFAULT_WORKSPACE_STYLE rather than throwing: this
 * runs on hand-loaded JSON that never passed through assembly normalization,
 * and a render must always produce a usable writing surface. The generator
 * path raises a diagnostic for the same input (normalizeWorkspaceStyles);
 * silence here is the render-safety floor, not the contract.
 */
function normalizedWorkspaceStyle(workSpace) {
  return resolveWorkspaceStyle(workSpace && workSpace.style) || DEFAULT_WORKSPACE_STYLE;
}

function renderWorkspace(workSpace) {
  const style = normalizedWorkspaceStyle(workSpace);
  if (style === 'lined') return renderLinedWorkspace(workSpace);
  if (style === 'boxed-totals') return renderBoxedWorkspace(workSpace);
  if (style === 'blank') return renderBlankWorkspace(workSpace);
  return renderCellWorkspace(workSpace);
}

export function renderCipherSection(cipher) {
  const section = make('div', 'cipher-zone');
  section.setAttribute('data-cipher-type', cipher.type || '');
  section.setAttribute('data-cipher-family', cipher.family || 'none');
  // Stamp the style that was actually built, not the authored string — before
  // this resolved, an unrecognised value (including whole prose paragraphs
  // left by the 1.4 string->object migration) went into the DOM verbatim while
  // the cells grid rendered underneath it.
  section.setAttribute(
    'data-workspace-style',
    resolveWorkspaceStyle(cipher.workspaceStyle) || DEFAULT_WORKSPACE_STYLE
  );
  if (cipher.noticeabilityDesign) {
    section.setAttribute('data-cipher-noticeability', 'authored');
  }
  if (cipher.characterDerivationProof) {
    section.setAttribute('data-has-derivation-proof', 'true');
  }

  section.appendChild(make('div', 'puzzle-title', cipher.title || 'Cipher'));
  if (cipher.sequenceText) {
    section.appendChild(make('div', 'cipher-sequence', cipher.sequenceText));
  }

  if (cipher.keyText) {
    const key = make('div', 'cipher-key');
    if (cipher.family === 'symbol-key' && (cipher.keyRows || []).length > 1) {
      const table = make('div', 'cipher-key-table');
      (cipher.keyRows || []).forEach((row) => {
        const rowNode = make('div', 'cipher-key-row');
        row.forEach((cell) => {
          rowNode.appendChild(make('div', 'cipher-key-cell', cell));
        });
        table.appendChild(rowNode);
      });
      key.appendChild(table);
    } else if (cipher.family === 'cross-reference' && (cipher.referenceTargets || []).length) {
      const refs = make('div', 'cipher-reference-list');
      (cipher.referenceTargets || []).forEach((target) => {
        refs.appendChild(make('div', 'cipher-reference-item', target));
      });
      key.appendChild(refs);
    } else {
      const grid = make('div', 'key-grid');
      grid.textContent = cipher.keyText;
      key.appendChild(grid);
    }
    section.appendChild(key);
  }

  if (cipher.workSpace) {
    section.appendChild(renderWorkspace(cipher.workSpace));
  }

  if (cipher.family === 'route-tracing' && (cipher.referenceTargets || []).length) {
    const steps = make('div', 'cipher-route-strip');
    (cipher.referenceTargets || []).forEach((target) => {
      steps.appendChild(make('div', 'cipher-route-step', target));
    });
    section.appendChild(steps);
  }
  if (cipher.family === 'typographic-anomaly' && cipher.noticeabilityDesign) {
    section.appendChild(make('div', 'cipher-family-note', cipher.noticeabilityDesign));
  }
  if (cipher.family === 'route-tracing' && cipher.characterDerivationProof) {
    section.appendChild(make('div', 'cipher-family-note', cipher.characterDerivationProof));
  }

  section.appendChild(make('div', 'password-extract', cipher.extractionInstruction));
  return section;
}

export function renderOracleSection(oracle) {
  const section = make('div', 'oracle-zone');
  section.setAttribute('data-oracle-mode', oracle.mode || '');
  section.appendChild(make('header', 'oracle-header', oracle.title || 'Oracle'));

  // ── THE FORM CHANNEL (ARRANGEMENT §2 axis 5 / §3) ─────────────────────────
  //
  // The attribute is stamped HERE, beside the chrome it selects, rather than in
  // the atom: every rule in the emitted stylesheet hangs off this element, and
  // stamping it one layer away from the DOM it governs is how a form ends up
  // resolving, reading as present, and drawing nothing.
  //
  // `bare` stamps NOTHING — the D179 presence fence, and the property that makes
  // a book which declares no form byte-identical to the pre-form engine.
  //
  // THE INSTRUCTION IS MOVED, NOT COPIED. In the taught form the authored
  // instruction is the band's text and no `.oracle-instruction` is built, so
  // nothing on the page says it twice. Both branches print the SAME authored
  // string; the renderer writes no sentence of its own.
  const taught = oracle.form === 'taught';
  if (taught) {
    section.setAttribute('data-form-variant', 'taught');
    const band = make('div', 'oracle-teach-band');
    const head = make('div', 'oracle-teach-head');
    head.appendChild(make('span', 'oracle-teach-rule'));
    // The pointer chip: the book's own name for what this table pays in.
    // Absent when the book named nothing — a chip with no noun in it is chrome
    // about nothing.
    if (oracle.rulesPointer) {
      head.appendChild(make('span', 'oracle-teach-pointer', oracle.rulesPointer));
    }
    band.appendChild(head);
    if (oracle.instruction) {
      band.appendChild(make('div', 'oracle-teach-text', oracle.instruction));
    }
    section.appendChild(band);
  } else if (oracle.instruction) {
    section.appendChild(make('div', 'oracle-instruction', oracle.instruction));
  }

  const list = make('div', 'oracle-entries');
  (oracle.entries || []).forEach((entry) => {
    const row = make('div', 'oracle-entry');
    row.setAttribute('data-entry-type', entry.type || '');
    row.appendChild(make('div', 'oracle-case-num', entry.roll || ''));
    row.appendChild(make('div', 'oracle-text', entry.text || ''));
    if (entry.paperAction) row.appendChild(make('div', 'oracle-text', '(' + entry.paperAction + ')'));
    if (entry.fragmentRef) row.appendChild(make('div', 'frag-ref', entry.fragmentRef));
    list.appendChild(row);
  });
  section.appendChild(list);
  return section;
}

function renderTrackRail(track) {
  const rail = make('div', 'companion-track');
  rail.appendChild(make('div', 'companion-track-label', track.label || 'Track'));
  const boxes = make('div', 'companion-track-boxes');
  const segments = Math.max(1, parseInt(track.segments, 10) || 4);
  const active = Math.max(0, Math.min(parseInt(track.startValue, 10) || 0, segments));
  for (let index = 0; index < segments; index += 1) {
    const box = make('div', 'companion-track-box');
    if (index < active) box.setAttribute('data-filled', 'true');
    boxes.appendChild(box);
  }
  rail.appendChild(boxes);
  return rail;
}

function renderInventorySlots(component) {
  const wrap = make('div', 'companion-inventory-grid');
  const slots = (component.slots || []).length ? component.slots : [];
  slots.forEach((slot) => {
    const item = make('div', 'companion-inventory-slot');
    item.appendChild(make('div', 'companion-slot-label', slot.label || ''));
    item.appendChild(make('div', 'companion-slot-box'));
    wrap.appendChild(item);
  });
  (component.conditions || []).forEach((condition) => {
    const chip = make('div', 'companion-condition-chip', condition.label || condition);
    wrap.appendChild(chip);
  });
  return wrap;
}

function renderTokenSheet(component) {
  const grid = make('div', 'companion-token-sheet');
  (component.tokens || []).forEach((token) => {
    const item = make('div', 'companion-token');
    item.appendChild(make('div', 'companion-token-label', token.label || token.name || 'TOKEN'));
    grid.appendChild(item);
  });
  if (!(component.tokens || []).length) {
    const total = Math.max(4, (component.rows || 2) * (component.cols || 4));
    for (let index = 0; index < total; index += 1) {
      grid.appendChild(make('div', 'companion-token'));
    }
  }
  return grid;
}

function renderOverlay(component) {
  const overlay = make('div', 'companion-overlay');
  (component.windows || []).forEach((windowDef) => {
    const pane = make('div', 'companion-overlay-window');
    pane.appendChild(make('div', 'companion-overlay-label', windowDef.label || 'WINDOW'));
    overlay.appendChild(pane);
  });
  if (!(component.windows || []).length) {
    for (let index = 0; index < 3; index += 1) {
      overlay.appendChild(make('div', 'companion-overlay-window'));
    }
  }
  return overlay;
}

function renderUsageDie(component) {
  const wrap = make('div', 'companion-usage-die');
  const ladder = ['100', '80', '60', '40', '20', '00'];
  const current = String(component.usageDie || component.usage || '').toLowerCase();
  ladder.forEach((step) => {
    const item = make('div', 'companion-usage-step', step);
    if (step === '100' || current.indexOf(step) !== -1) item.setAttribute('data-active', 'true');
    wrap.appendChild(item);
  });
  return wrap;
}

// percentile-stat (schema 1.5.0). Mirrors buildPercentileStat() in
// atoms/tracker.js — the same component must print identically on both paths
// (AUDIT 112). Change one, change the other.
function renderPercentileStat(component) {
  const wrap = make('div', 'companion-percentile-stat');

  const head = make('div', 'companion-stat-head');
  head.appendChild(make('div', 'companion-stat-name', component.statName || component.title || 'Standing'));
  head.appendChild(make('div', 'companion-stat-die', 'd100 · roll under'));
  wrap.appendChild(head);

  const values = Array.isArray(component.weeklyValues) && component.weeklyValues.length
    ? component.weeklyValues
    : new Array(6).fill(null);
  const track = make('div', 'companion-stat-track');
  values.slice(0, 8).forEach((value, index) => {
    const printable = Number.isInteger(value) && value >= 1 && value <= 99;
    const box = make('div', 'companion-stat-week');
    box.setAttribute('data-week', String(index + 1));
    box.appendChild(make('div', 'companion-stat-week-label', 'WK ' + (index + 1)));
    box.appendChild(make('div', 'companion-stat-value', printable ? String(value) : ''));
    track.appendChild(box);
  });
  wrap.appendChild(track);

  const advantage = String(component.advantageRule || '').trim()
    || 'Complete every prescribed set in the session before rolling to earn one re-roll.';
  wrap.appendChild(make('div', 'companion-stat-rule',
    'Circle this week’s value, then roll the oracle d100. Roll under it and read one band above the roll. ' + advantage));

  return wrap;
}

function renderMemorySlots(component) {
  const wrap = make('div', 'companion-memory-slots');
  const slots = (component.slots || []).length ? component.slots : new Array(5).fill(null).map((_, index) => ({
    label: 'M' + (index + 1)
  }));
  slots.forEach((slot) => {
    const item = make('div', 'companion-memory-slot');
    item.appendChild(make('div', 'companion-slot-label', slot.label || 'MEM'));
    const lines = make('div', 'companion-memory-lines');
    for (let index = 0; index < 3; index += 1) {
      lines.appendChild(make('div', 'companion-memory-line'));
    }
    item.appendChild(lines);
    wrap.appendChild(item);
  });
  return wrap;
}

export function renderCompanionComponent(component) {
  const card = make('section', 'companion-component');
  card.setAttribute('data-component-family', component.family || 'custom-companion');
  card.setAttribute('data-component-type', component.type || 'custom');
  card.setAttribute('data-component-footprint', component.footprint || 'half-page');
  card.appendChild(make('div', 'companion-title', component.title || 'Companion Component'));
  if (component.subtitle) {
    card.appendChild(make('div', 'companion-subtitle', component.subtitle));
  }
  if (component.playWindow) {
    card.appendChild(make('div', 'companion-meta', 'Use during ' + component.playWindow));
  }

  if (component.body) {
    card.appendChild(make('div', 'companion-body', component.body));
  }

  if ((component.family === 'dashboard' || component.family === 'stress-track') && (component.tracks || []).length) {
    const tracks = make('div', 'companion-dashboard');
    (component.tracks || []).forEach((track) => {
      tracks.appendChild(renderTrackRail(track));
    });
    card.appendChild(tracks);
  } else if (component.family === 'dashboard') {
    const boxGrid = parseDashboardBoxGrid(component.body);
    if (boxGrid) {
      const grid = make('div', 'companion-dashboard companion-dashboard-grid');
      for (let r = 0; r < boxGrid.rows; r++) {
        const row = make('div', 'companion-dashboard-row');
        for (let c = 0; c < boxGrid.cols; c++) {
          row.appendChild(make('div', 'companion-dashboard-box'));
        }
        grid.appendChild(row);
      }
      card.appendChild(grid);
    } else {
      const lineCount = component.slotCount || 5;
      const dash = make('div', 'companion-dashboard');
      for (let i = 0; i < lineCount; i++) {
        dash.appendChild(make('div', 'companion-dash-line'));
      }
      card.appendChild(dash);
    }
  } else if (component.family === 'usage-die') {
    card.appendChild(renderUsageDie(component));
  } else if (component.family === 'percentile-stat') {
    card.appendChild(renderPercentileStat(component));
  } else if (component.family === 'memory-slots') {
    card.appendChild(renderMemorySlots(component));
  } else if (component.family === 'inventory-grid') {
    card.appendChild(renderInventorySlots(component));
  } else if (component.family === 'token-sheet') {
    card.appendChild(renderTokenSheet(component));
  } else if (component.family === 'overlay-window') {
    card.appendChild(renderOverlay(component));
  } else if (component.family === 'return-box') {
    buildReturnBoxSurface(component).forEach((node) => card.appendChild(node));
  } else if ((component.slots || []).length) {
    const slots = make('div', 'companion-slot-grid');
    component.slots.forEach((slot) => {
      const item = make('div', 'companion-slot');
      item.appendChild(make('span', 'companion-slot-label', slot.label || ''));
      item.appendChild(make('span', 'companion-slot-box'));
      slots.appendChild(item);
    });
    card.appendChild(slots);
  } else if ((component.rows || 0) > 0 && (component.cols || 0) > 0) {
    const cells = make('div', 'companion-cell-grid');
    cells.style.setProperty('--companion-cols', String(component.cols));
    const total = component.rows * component.cols;
    for (let i = 0; i < total; i += 1) {
      cells.appendChild(make('div', 'companion-cell'));
    }
    card.appendChild(cells);
  } else {
    card.appendChild(make('div', 'companion-dash-line'));
  }

  if (component.reminder) {
    card.appendChild(make('div', 'companion-reminder', component.reminder));
  }

  return card;
}

// ---------------------------------------------------------------------------
// THE CONVERGENCE NOTES BOX'S SLOT BUDGET (2026-08-20)
// ---------------------------------------------------------------------------
/**
 * WHAT WAS WRONG. This box printed `paragraphs.slice(0, 2)` — a bare count cap
 * with no marker, no diagnostic and no relation to the space on the page. On
 * the classified-packet path `buildBossPageModel()` assembles the list as
 * [narrative tail, instruction tail, mechanism remainder, convergenceProof], so
 * the two slots went to spillover and the authored proof — the paragraph that
 * tells the player how the password derives, and the only reason the box is
 * called Convergence Notes — was dropped every time. Read off
 * `the-lumina-protocol` p.41 on 2026-08-20, on a page with ~450px of blank
 * paper under it. Nothing was competing for the space.
 *
 * WHY THE CAP IS STILL HERE, and this is the part measured rather than
 * reasoned. Printing every paragraph was tried first and CLIPS: with no cap,
 * `.page-frame` overflows by 67px on `what-the-soil-remembers` p.54, 82px on
 * `Persephone` p.41 and 22px on `liftrpg-eastern-shore` p.26 — a silent drop
 * traded for a silent clip, which is the worse of the two (D198's whole
 * discipline). A boss page is a full-page, unsplittable atom with no
 * continuation route past the appendix, and `atoms/boss-encounter.js` prices
 * the followup page's whole density ladder at 30px — it cannot absorb 82.
 *
 * AND NO LOCAL NUMBER PREDICTS THE FIT — measured across nine corpus boss
 * pages, which is why this is a slot budget and not a character budget: the
 * box fits at 2377 chars / 295px on `the-conclave-s-legacy` p.38 and clips at
 * 1727 chars / 228px on `liftrpg-eastern-shore` p.26, because what is left
 * over depends on the rest of the page, which this function cannot see. Three
 * slots clips Persephone; two clips nothing in the corpus. So: two.
 *
 * WHAT CHANGED IS WHICH TWO. The proof's own paragraphs take the slots first —
 * they are the trailing `convergenceProofCoreCount` of the list — and the
 * leading spillover fills whatever is left, in document order, so the box still
 * reads in the order it was written.
 *
 * WHAT THIS DOES NOT FIX, stated at the site: a book whose proof runs past two
 * paragraphs still loses the rest, and a page with room to spare still stops at
 * two. Both need something this layer does not have — a continuation route for
 * the appendix, or a followup ladder with real shrink in it.
 */
const CONVERGENCE_PROOF_SLOTS = 2;

function selectConvergenceProofParagraphs(model) {
  const paragraphs = model.convergenceProofParagraphs || [];
  if (paragraphs.length <= CONVERGENCE_PROOF_SLOTS) return paragraphs;

  const coreCount = Math.max(0, Math.min(
    Number(model.convergenceProofCoreCount) || 0,
    paragraphs.length,
  ));
  // No count declared (an older model shape) ⇒ the pre-2026-08-20 behaviour,
  // which is exactly "the leading slots" — never worse than what shipped.
  if (coreCount <= 0) return paragraphs.slice(0, CONVERGENCE_PROOF_SLOTS);

  const core = paragraphs.slice(paragraphs.length - coreCount).slice(0, CONVERGENCE_PROOF_SLOTS);
  const leadRoom = CONVERGENCE_PROOF_SLOTS - core.length;
  const lead = leadRoom > 0
    ? paragraphs.slice(0, paragraphs.length - coreCount).slice(0, leadRoom)
    : [];
  return lead.concat(core);
}

export function renderBossPage(model) {
  const scaffold = createBoundedPage('boss', 'boss-right', {
    boundaryRole: 'boss',
    layoutVariant: model.layoutVariant || 'standard'
  });
  const page = scaffold.page;
  const frame = scaffold.frame;
  frame.setAttribute('data-shell-family', model.shellFamily || (model.artifactIdentity && model.artifactIdentity.shellFamily) || 'field-survey');
  const isClassifiedFollowup = (model.shellFamily || (model.artifactIdentity && model.artifactIdentity.shellFamily) || '') === 'classified-packet'
    && model.continuationSegment === 'followup';

  if (model.convergenceProof) {
    frame.setAttribute('data-has-convergence-proof', 'true');
  }
  if (model.binaryChoiceAcknowledgement) {
    frame.setAttribute('data-has-binary-choice-ack', 'true');
  }
  if (model.continuationSegment) {
    frame.setAttribute('data-continuation-segment', model.continuationSegment);
  }

  const header = make('header', 'boss-header');
  header.appendChild(make('span', '', 'Convergence'));
  header.appendChild(make('span', 'page-num', ''));
  frame.appendChild(header);

  if (model.shellFamily === 'classified-packet') {
    const strip = make('div', 'boss-incident-strip');
    strip.appendChild(make('div', 'boss-incident-chip', 'Final Document'));
    strip.appendChild(make('div', 'boss-incident-chip', model.weekLabel || 'Week 00'));
    strip.appendChild(make('div', 'boss-incident-chip', 'Recovered Inputs ' + ((model.componentInputs || []).length || 0)));
    frame.appendChild(strip);
  }

  if (model.continuationLabel) {
    frame.appendChild(make('div', 'doc-label continuation-label', model.continuationLabel));
  }
  frame.appendChild(make('h2', 'boss-title', model.title));

  let appendixGrid = null;
  if (isClassifiedFollowup) {
    appendixGrid = make('div', 'boss-appendix-grid');
  }

  if ((model.narrativeParagraphs || []).length) {
    const narrative = make('div', 'boss-narrative');
    model.narrativeParagraphs.forEach((para) => {
      narrative.appendChild(make('p', '', para));
    });
    frame.appendChild(narrative);
  }

  if ((model.mechanismParagraphs || []).length || model.decodingInstruction || model.decodingTable) {
    const mechanism = make('div', 'boss-mechanism');
    mechanism.appendChild(make('strong', 'boss-mechanism-label', 'Procedure'));
    model.mechanismParagraphs.forEach((para) => {
      mechanism.appendChild(make('p', '', para));
    });
    if (model.decodingInstruction) {
      mechanism.appendChild(make('p', 'boss-decoding-instruction', model.decodingInstruction));
    }
    if (model.decodingTable) {
      const table = make('pre', 'boss-decoding-table');
      table.textContent = model.decodingTable;
      mechanism.appendChild(table);
    }
    frame.appendChild(mechanism);
  }

  // ── THE RENDER CONTRACT: SOLVABILITY DATA IS NON-PRINTING ────────────────
  //
  // `bossEncounter.componentInputs` is the MACHINE's copy of the five answers.
  // It is not authored content: `assembly.js` recomputes it from the weeks'
  // collected components and overwrites whatever the model wrote there
  // ("componentInputs corrected: model had […], computed […]"), and
  // `utils.js deriveBookletPassword()` decodes it through the reference table
  // to get the password that unlocks the ending. It exists so the machine can
  // prove the puzzle is solvable and so the unlock can be verified — for the
  // reader it is the answer key, printed on the page that asks the question.
  //
  // The first delivered book shipped with 9/13/16/12/25 set beside the write-in
  // boxes on its boss page (the D172 every-page read, P.28): six weeks of
  // cipher work answered in the margin. The label and the box stay — those are
  // the player's surface — and the value never renders.
  //
  // The rule this states, for anything added to this page later: a field the
  // pipeline DERIVES rather than authors may not print. The password obeys it
  // by a different mechanism (`sanitizeBossTextForDisplay()` scrubs the derived
  // password out of every prose seat before it reaches the DOM);
  // `convergenceProof` and `passwordRevealInstruction` DO print because they
  // are authored prose about the method, passed through that same seam.
  //
  // WHAT THAT SEAM COVERS, AND WHAT IT DOES NOT (corrected 2026-08-19; the
  // sentence above used to read "already scrubbed by that same seam", which
  // claimed more than the seam does). It matches the derived password as a
  // token: bare, quoted, and — since this correction — spelled out one letter
  // at a time with separators. It is not prose comprehension and it is not a
  // guarantee. A partial split ("P, RYOR"), a paraphrase, or a sentence that
  // identifies the word without writing it all reach the page.
  //
  // The earning defect: proving run 3's boss page printed
  // "By the table: P, R, Y, O, R." one clause away from a [REDACTED] that
  // worked — a live scrub, and the answer key on the page anyway. The seam is
  // the last line of defence, not the only one; the half that keeps the shape
  // from being authored at all is the convergence doctrine in prompt_rules.js
  // (INST_CONVERGENCE_DESIGN, "ONE PROHIBITION, EVERY PATTERN").
  if ((model.componentInputs || []).length) {
    const components = make('div', 'boss-components');
    components.appendChild(make('div', 'boss-components-label', model.componentLabel || 'Recorded Inputs'));
    const list = make('div', 'boss-component-list');
    (model.componentInputs || []).forEach((item) => {
      const row = make('div', 'boss-component-item');
      row.appendChild(make('div', 'boss-component-week', item.weekLabel));
      row.appendChild(make('div', 'boss-component-box'));
      list.appendChild(row);
    });
    components.appendChild(list);
    frame.appendChild(components);
  }

  if (model.binaryChoiceAcknowledgement) {
    const branch = make('div', 'boss-branch-note');
    branch.appendChild(make('div', 'boss-branch-label', 'Path Reconciliation'));
    if (model.binaryChoiceAcknowledgement.ifA) {
      branch.appendChild(make('p', '', 'If A: ' + model.binaryChoiceAcknowledgement.ifA));
    }
    if (model.binaryChoiceAcknowledgement.ifB) {
      branch.appendChild(make('p', '', 'If B: ' + model.binaryChoiceAcknowledgement.ifB));
    }
    (appendixGrid || frame).appendChild(branch);
  }

  if ((model.convergenceProofParagraphs || []).length) {
    const proof = make('div', 'boss-proof');
    proof.appendChild(make('div', 'boss-proof-label', 'Convergence Notes'));
    selectConvergenceProofParagraphs(model).forEach((paragraph) => {
      proof.appendChild(make('p', '', paragraph));
    });
    (appendixGrid || frame).appendChild(proof);
  }

  if (appendixGrid && appendixGrid.childNodes.length) {
    frame.appendChild(appendixGrid);
  }

  const convergence = make('div', 'boss-convergence');
  convergence.appendChild(make('div', 'boss-convergence-label', model.convergenceLabel || 'Final Word'));
  convergence.appendChild(make('p', 'boss-convergence-instruction', model.passwordRevealInstruction));

  const passwordBoxes = make('div', 'boss-password-boxes');
  for (let i = 0; i < model.passwordLength; i += 1) {
    passwordBoxes.appendChild(make('div', 'boss-password-box'));
  }
  convergence.appendChild(passwordBoxes);
  frame.appendChild(convergence);

  return page;
}
