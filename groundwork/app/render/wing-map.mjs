// ── Wing map SVG: ONE building (D61) ─────────────────────────────────────────
// The wing is a single station cross-section, not two progression columns.
// The vertical-pull line climbs the TOWER (right); the horizontal-pull line
// runs the GALLERIES (left) as switchback floors; one hull, one entry hall,
// stairs and key-item bridges join them. The training truth underneath is
// untouched — two independent lines, gates per line (D46: the map never lies)
// — but the place reads as one building you are clearing.
//
// Pure projection of engine state → SVG string. Theme-var colors only;
// main.mjs wires the taps (chambers: data-tier, gates: data-gate).

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const W = 370;
// Tower (vertical line): stacked floors, shared walls.
const TW = 88, TH = 40, TGAP = 9;
const TOWER_X = 300;
// Galleries (horizontal line): switchback floors of 3, smaller rooms.
const GW_C = 62, GH = 40;
const GALLERY_XS = [54, 121, 188];          // chamber centers; floor direction alternates
const PER_FLOOR = 3;
const BOTTOM_PAD = 96, TOP_PAD = 64;

// Generic landmark glyphs (GW-41): worlds that ship no silhouettes still get
// distinguishable chambers — a neutral set keyed by sector position, stroke-only.
const GENERIC_SILS = [
  'M-12,6 H12', 'M-10,6 L0,-6 L10,6', 'M-12,-5 H12 M-12,1 H12 M-12,7 H12',
  'M0,-8 V8 M-7,0 H7', 'M-11,5 A11,11 0 0 1 11,5', 'M-5,8 V-6 M5,8 V-6 M-5,2 H5',
  'M-12,7 H12 M-8,7 V-3 M0,7 V-6 M8,7 V-1', 'M-9,-6 H9 V6 H-9 Z',
  'M-12,0 H-3 M3,0 H12 M0,0 m-3,0 a3,3 0 1 0 6,0 a3,3 0 1 0 -6,0',
  'M0,8 V-8 M-6,8 L0,-8 L6,8'
];

export function buildWingMapSvg(wing, opts = {}) {
  const silhouettes = opts.silhouettes || {};
  const charges = opts.charges || {};
  const branches = wing.branches;
  // Convention: the LONGER line climbs the tower (vertical pulling climbs);
  // the other runs the galleries. For the pull wing: bar=tower, lever=gallery.
  const sorted = [...branches].sort((a, b) => b.sectors.length - a.sectors.length);
  const towerBranch = sorted[0];
  const galleryBranch = sorted[1] || sorted[0];

  const towerN = towerBranch.sectors.length;
  const floors = Math.ceil(galleryBranch.sectors.length / PER_FLOOR);
  const H = TOP_PAD + Math.max(towerN * (TH + TGAP), floors * (TH + TGAP) * 2) + BOTTOM_PAD;
  const entryY = H - 64;

  // Tower level i (0 = base): stacked upward, shared-wall spacing.
  const towerPos = (i) => ({ x: TOWER_X, y: entryY - 34 - TH / 2 - i * (TH + TGAP) });
  // Gallery: boustrophedon floors of 3 — the route reads as a walk through the
  // building (left→right, stair, right→left…). Floors sit on every second
  // tower level so the two halves share one architecture.
  const galleryPos = (i) => {
    const f = Math.floor(i / PER_FLOOR);
    const k = i % PER_FLOOR;
    const xs = f % 2 === 0 ? GALLERY_XS : [...GALLERY_XS].reverse();
    return { x: xs[k], y: entryY - 34 - GH / 2 - f * (TH + TGAP) * 2 };
  };
  const posFor = (branch, i) => branch === towerBranch.branch ? towerPos(i) : galleryPos(i);
  const sizeFor = (branch) => branch === towerBranch.branch ? { w: TW, h: TH } : { w: GW_C, h: GH };

  const parts = [];

  // ── The hull: one faint footprint — the strongest "one place" cue there is.
  const gTop = galleryPos(galleryBranch.sectors.length - 1).y - GH / 2 - 12;
  const tTop = towerPos(towerN - 1).y - TH / 2 - 12;
  const hullBot = entryY + 26;
  const gL = GALLERY_XS[0] - GW_C / 2 - 12, gR = GALLERY_XS[GALLERY_XS.length - 1] + GW_C / 2 + 14;
  const tR = TOWER_X + TW / 2 + 12;
  parts.push(`<path class="gwm-hull" d="M${gL},${hullBot} L${gL},${gTop} L${gR},${gTop} L${gR},${tTop} L${tR},${tTop} L${tR},${hullBot} Z"/>`);

  // Entry hall joins the two halves at the base — one way in.
  parts.push(`<line x1="${GALLERY_XS[0] - GW_C / 2}" y1="${entryY}" x2="${TOWER_X + TW / 2}" y2="${entryY}" class="gwm-corridor"/>`);
  parts.push(`<text x="${(GALLERY_XS[0] + TOWER_X) / 2}" y="${entryY + 16}" class="gwm-corridor-label" text-anchor="middle">WING ENTRANCE</text>`);
  parts.push(`<line x1="${GALLERY_XS[0]}" y1="${entryY}" x2="${GALLERY_XS[0]}" y2="${galleryPos(0).y + GH / 2}" class="gwm-corridor"/>`);
  parts.push(`<line x1="${TOWER_X}" y1="${entryY}" x2="${TOWER_X}" y2="${towerPos(0).y + TH / 2}" class="gwm-corridor"/>`);

  for (const b of branches) {
    const isTower = b.branch === towerBranch.branch;
    parts.push(`<g class="gwm-${esc(b.branch)}">`);

    // Line label + exploration meter at the base of its half.
    const base = posFor(b.branch, 0);
    const ex = (opts.exploration || {})[b.branch];
    parts.push(`<text x="${base.x}" y="${entryY + 32}" class="gwm-corridor-label" text-anchor="middle">${esc(b.name.toUpperCase())}${isTower ? ' · UP THE TOWER' : ' · ALONG THE GALLERIES'}</text>`);
    if (ex && ex.total) {
      const mw = 44, frac = Math.min(1, ex.seen / ex.total);
      parts.push(`<rect x="${base.x - mw / 2}" y="${entryY + 38}" width="${mw}" height="4" rx="2" class="gwm-meter-bg"/>`
        + `<rect x="${base.x - mw / 2}" y="${entryY + 38}" width="${Math.max(2, mw * frac)}" height="4" rx="2" class="gwm-meter-fg"/>`
        + `<text x="${base.x}" y="${entryY + 50}" class="gwm-sealed" text-anchor="middle">${ex.seen}/${ex.total} EXPLORED</text>`);
    }

    b.sectors.forEach((sec, i) => {
      const { x, y } = posFor(b.branch, i);
      const { w, h } = sizeFor(b.branch);

      // Connector from the previous chamber: tower = shared floor; gallery =
      // along the floor, or a stair where the floor turns.
      if (i > 0) {
        const prev = posFor(b.branch, i - 1);
        const known = sec.state !== 'locked' || b.sectors[i - 1].state !== 'locked';
        const cls = known ? 'gwm-corridor' : 'gwm-corridor-unknown';
        if (isTower) {
          parts.push(`<line x1="${prev.x}" y1="${prev.y - h / 2}" x2="${x}" y2="${y + h / 2}" class="${cls}"/>`);
        } else if (prev.y === y) {
          parts.push(`<line x1="${prev.x < x ? prev.x + w / 2 : prev.x - w / 2}" y1="${y}" x2="${prev.x < x ? x - w / 2 : x + w / 2}" y2="${y}" class="${cls}"/>`);
        } else {
          // Stair between gallery floors, at the turn end.
          parts.push(`<path class="${cls}" fill="none" d="M${prev.x},${prev.y - h / 2} L${prev.x},${(prev.y + y) / 2 + 6} L${x},${(prev.y + y) / 2 - 6} L${x},${y + h / 2}"/>`);
        }
      }

      // Gate on the boundary to the NEXT chamber, with its charge bar.
      if (sec.state === 'active' && sec.tier.boss) {
        const nxt = i + 1 < b.sectors.length ? posFor(b.branch, i + 1) : { x, y: y - (TH + TGAP) };
        const gx = (x + nxt.x) / 2;
        const gy = (y + nxt.y) / 2 - 2;
        const charge = Math.max(0, Math.min(1, charges[sec.tier.id] || 0));
        const elected = opts.electedTierId === sec.tier.id;
        parts.push(`<g class="gwm-gate ${elected ? 'gwm-gate-elected' : ''}" data-gate="${esc(sec.tier.id)}">`
          + `<rect x="${gx - 13}" y="${gy - 8}" width="26" height="16" rx="3"/>`
          + `<text x="${gx}" y="${gy + 4}" text-anchor="middle">✕</text>`
          + `<rect class="gwm-charge-bg" x="${gx - 15}" y="${gy + 11}" width="30" height="3.5" rx="1.75"/>`
          + (charge > 0 ? `<rect class="gwm-charge-fg" x="${gx - 15}" y="${gy + 11}" width="${Math.max(2, 30 * charge)}" height="3.5" rx="1.75"/>` : '')
          + `</g>`);
      }

      // Chamber. Lock economy: only the NEXT sealed door announces itself;
      // deeper locked floors are fog (the unknown reads as unknown).
      const sil = silhouettes[sec.tier.hookSlot]
        || (Object.keys(silhouettes).length ? null : GENERIC_SILS[i % GENERIC_SILS.length]);
      const nextDoor = sec.state === 'locked' && i > 0 && b.sectors[i - 1].state === 'active';
      parts.push(`<g class="gwm-chamber gwm-chamber-${sec.state} ${sec.state === 'locked' && !nextDoor ? 'gwm-chamber-fog' : ''}" data-tier="${esc(sec.tier.id)}">`
        + `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="7"/>`
        + (sil ? `<path class="gwm-sil" d="${sil}" transform="translate(${x},${y})${isTower ? '' : ' scale(0.82)'}"/>` : '')
        + (sec.state === 'active'
          ? (opts.todayTierId && sec.tier.id !== opts.todayTierId
            ? `<circle class="gwm-post" cx="${x - w / 2 + 11}" cy="${y}" r="5"/>`
            : `<circle class="gwm-you" cx="${x - w / 2 + 11}" cy="${y}" r="5.5" fill="${isTower ? 'var(--gw-amber)' : 'var(--gw-accent)'}"/>`)
          : sec.state === 'cleared'
            ? `<text x="${x + w / 2 - 11}" y="${y + 4}" text-anchor="middle" class="gwm-glyph">✓</text>`
            : nextDoor
              ? `<text x="${x + w / 2 - 11}" y="${y + 4}" text-anchor="middle" class="gwm-glyph">🔒</text>`
              : '')
        + (nextDoor ? `<text x="${Math.max(8 + sec.flavorName.length * 2.4, Math.min(W - 8 - sec.flavorName.length * 2.4, x))}" y="${y + h / 2 - 5}" text-anchor="middle" class="gwm-sealed gwm-nextdoor">${esc(sec.flavorName)}</text>` : '')
        + `</g>`);

      // Explored rooms fill INTO their chamber (play draws the map).
      const roomsHere = (opts.roomsBySector || {})[sec.tier.id] || [];
      const cap = isTower ? 6 : 4;
      roomsHere.slice(0, cap).forEach((room, ri) => {
        const cx = x - w / 2 + 8 + ri * 12;
        parts.push(`<rect class="gwm-roomcell" x="${cx}" y="${y + h / 2 - 10}" width="8" height="6" rx="2"><title>${esc(room.name)}</title></rect>`);
      });
      if (roomsHere.length > cap) {
        parts.push(`<text x="${x + w / 2 - 8}" y="${y + h / 2 - 5}" text-anchor="end" class="gwm-roomcount">+${roomsHere.length - cap}</text>`);
      }

      // Posted-manifest diamond (D52) on the active chamber of its line.
      if (opts.posting && opts.posting.branch === b.branch && sec.state === 'active') {
        parts.push(`<text x="${x + w / 2 - 24}" y="${y + 4}" text-anchor="middle" class="gwm-posting">◈</text>`);
      }

      // TODAY pin: the work order, pinned to the focus chamber. The tower pin
      // points left (into the stair gap); a gallery pin floats above its room.
      if (opts.todayTierId === sec.tier.id) {
        if (isTower) {
          const px = x - w / 2 - 8;
          parts.push(`<g class="gwm-today">`
            + `<line x1="${x - w / 2}" y1="${y}" x2="${px - 4}" y2="${y}"/>`
            + `<rect x="${px - 52}" y="${y - 9}" width="48" height="18" rx="3"/>`
            + `<text x="${px - 28}" y="${y + 4}" text-anchor="middle">TODAY</text>`
            + `</g>`);
        } else {
          parts.push(`<g class="gwm-today">`
            + `<line x1="${x}" y1="${y - h / 2}" x2="${x}" y2="${y - h / 2 - 7}"/>`
            + `<rect x="${x - 24}" y="${y - h / 2 - 25}" width="48" height="18" rx="3"/>`
            + `<text x="${x}" y="${y - h / 2 - 12}" text-anchor="middle">TODAY</text>`
            + `</g>`);
        }
      }
    });
    parts.push('</g>');
  }

  // Key-item bridges between the halves (shortcuts: real map connections).
  const routes = opts.shortcutRoutes || {};
  for (const id of wing.shortcuts) {
    const r = routes[id];
    if (!r) continue;
    const a = posFor(r.from[0], r.from[1]);
    const bp = posFor(r.to[0], r.to[1]);
    const aw = sizeFor(r.from[0]).w, bw = sizeFor(r.to[0]).w;
    const x1 = a.x < bp.x ? a.x + aw / 2 : a.x - aw / 2;
    const x2 = a.x < bp.x ? bp.x - bw / 2 : bp.x + bw / 2;
    parts.push(`<line x1="${x1}" y1="${a.y}" x2="${x2}" y2="${bp.y}" class="gwm-shortcut"><title>${esc(r.label)}</title></line>`);
  }

  // Sealed wings at the building's edges; the Mast continues above the tower.
  const mastTop = towerPos(towerN - 1);
  const sealedPos = [
    { x: 14, y: Math.round(H * 0.4), anchor: 'start' },
    { x: 14, y: H - 2, anchor: 'start' },
    { x: W - 14, y: H - 2, anchor: 'end' },
    { x: mastTop.x, y: tTop - 6, anchor: 'middle' }
  ];
  (wing.lockedDoors || []).forEach((d, i) => {
    const pos = sealedPos[i % sealedPos.length];
    if (i === 3) parts.push(`<line x1="${mastTop.x}" y1="${mastTop.y - TH / 2}" x2="${mastTop.x}" y2="${tTop - 12}" class="gwm-corridor-unknown"/>`);
    parts.push(`<text x="${pos.x}" y="${pos.y}" class="gwm-sealed" text-anchor="${pos.anchor}">🔒 ${esc(d.name)}</text>`);
  });

  // Default view lands ON the keeper: a window around BOTH active chambers
  // (the session works both lines), gate above, cleared ground below.
  let viewBox = `0 0 ${W} ${H}`;
  if (opts.window && opts.window.tierId) {
    const ys = [];
    for (const b of branches) {
      const i = b.sectors.findIndex((sec) => sec.state === 'active');
      if (i !== -1) ys.push(posFor(b.branch, i).y);
      const f = b.sectors.findIndex((sec) => sec.tier.id === opts.window.tierId);
      if (f !== -1) ys.push(posFor(b.branch, f).y);
    }
    if (ys.length) {
      const yTop = Math.max(0, Math.min(...ys) - TH - TGAP - 34);
      const wantEntry = Math.max(...ys) + (TH + TGAP) * 2 > entryY;
      const yBottom = wantEntry ? Math.min(H, entryY + 60) : Math.min(H, Math.max(...ys) + TH + 42);
      viewBox = `0 ${Math.round(yTop)} ${W} ${Math.round(Math.max(160, yBottom - yTop))}`;
    }
  }
  return `<svg viewBox="${viewBox}" class="gwm" role="img" aria-label="Station wing map">${parts.join('')}</svg>`;
}
