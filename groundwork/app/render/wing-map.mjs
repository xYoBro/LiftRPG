// ── Wing map SVG (Sprint 2.3: map-as-home) ──────────────────────────────────
// The map IS the Station screen. Pure projection of engine state → SVG string:
// asymmetric corridors (doglegs + per-chamber jitter — a routed building, not
// a chart), chamber silhouettes per sector (landmarking), the TODAY pin on the
// session's focus chamber, door-charge bars on gates, per-corridor exploration
// meters, and tap targets (chambers: data-tier, gates: data-gate). Theme-var
// colors only; main.mjs wires the taps.

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const W = 370;
const CH_W = 96, CH_H = 42, GAP = 26;
const TOP_PAD = 92, BOTTOM_PAD = 118;
const COL_BASE = { lever: 102, bar: 256 };
// Doglegs: the lever corridor kinks left past the Counterweight Pit; the bar
// corridor kinks right past the Half Climb, toward the mast.
const KINK = { lever: { at: 4, x: 86 }, bar: { at: 6, x: 284 } };
const JITTER = [0, 4, -4, 2, -2];

function xFor(branch, i) {
  const kink = KINK[branch];
  const base = kink && i >= kink.at ? kink.x : (COL_BASE[branch] || W / 2);
  return base + JITTER[i % JITTER.length];
}

export function buildWingMapSvg(wing, opts = {}) {
  const silhouettes = opts.silhouettes || {};
  const charges = opts.charges || {};
  const maxSectors = Math.max(...wing.branches.map((b) => b.sectors.length));
  const H = TOP_PAD + maxSectors * (CH_H + GAP) + BOTTOM_PAD;
  const yFor = (i) => H - BOTTOM_PAD - (i + 1) * (CH_H + GAP) + GAP;
  const parts = [];

  // Entry hall joins the corridor bases.
  const entryY = H - 78;
  parts.push(`<line x1="${xFor('lever', 0)}" y1="${entryY}" x2="${xFor('bar', 0)}" y2="${entryY}" class="gwm-corridor"/>`);
  parts.push(`<text x="${W / 2}" y="${entryY + 16}" class="gwm-corridor-label" text-anchor="middle">WING ENTRANCE</text>`);

  for (const b of wing.branches) {
    parts.push(`<g class="gwm-${esc(b.branch)}">`);

    // Corridor base: name + exploration completion meter (Sprint 2.3).
    const bx = xFor(b.branch, 0);
    const ex = (opts.exploration || {})[b.branch];
    parts.push(`<text x="${bx}" y="${entryY + 32}" class="gwm-corridor-label" text-anchor="middle">${esc(b.name.toUpperCase())}</text>`);
    if (ex && ex.total) {
      const mw = 44, frac = Math.min(1, ex.seen / ex.total);
      parts.push(`<rect x="${bx - mw / 2}" y="${entryY + 38}" width="${mw}" height="4" rx="2" class="gwm-meter-bg"/>`
        + `<rect x="${bx - mw / 2}" y="${entryY + 38}" width="${Math.max(2, mw * frac)}" height="4" rx="2" class="gwm-meter-fg"/>`
        + `<text x="${bx}" y="${entryY + 54}" class="gwm-sealed" text-anchor="middle">${ex.seen}/${ex.total} EXPLORED</text>`);
    }

    b.sectors.forEach((sec, i) => {
      const x = xFor(b.branch, i);
      const y = yFor(i);
      // Connector from below (entry hall or previous chamber top).
      const x0 = i === 0 ? xFor(b.branch, 0) : xFor(b.branch, i - 1);
      const y0 = i === 0 ? entryY : yFor(i - 1) - CH_H / 2;
      const known = i === 0 || b.sectors[i - 1].state !== 'locked';
      parts.push(`<line x1="${x0}" y1="${y0}" x2="${x}" y2="${y + CH_H / 2}" class="${known ? 'gwm-corridor' : 'gwm-corridor-unknown'}"/>`);

      // Gate on the connector ABOVE the active chamber, with its charge bar.
      if (sec.state === 'active' && sec.tier.boss) {
        const xUp = i + 1 < b.sectors.length ? xFor(b.branch, i + 1) : x;
        const gx = (x + xUp) / 2;
        const gy = y - CH_H / 2 - GAP / 2;
        const charge = Math.max(0, Math.min(1, charges[sec.tier.id] || 0));
        const elected = opts.electedTierId === sec.tier.id;
        parts.push(`<g class="gwm-gate ${elected ? 'gwm-gate-elected' : ''}" data-gate="${esc(sec.tier.id)}">`
          + `<rect x="${gx - 13}" y="${gy - 8}" width="26" height="16" rx="3"/>`
          + `<text x="${gx}" y="${gy + 4}" text-anchor="middle">✕</text>`
          + `<rect class="gwm-charge-bg" x="${gx - 15}" y="${gy + 11}" width="30" height="3.5" rx="1.75"/>`
          + (charge > 0 ? `<rect class="gwm-charge-fg" x="${gx - 15}" y="${gy + 11}" width="${Math.max(2, 30 * charge)}" height="3.5" rx="1.75"/>` : '')
          + `</g>`);
      }

      // Chamber: silhouette-first landmark; state badges at the edges.
      // Lock economy: only the NEXT sealed door announces itself (lock + name).
      // Deeper locked sectors are fog — a dim silhouette, no icon spam; the
      // unknown should read as unknown, not as a wall of padlocks.
      const sil = silhouettes[sec.tier.hookSlot];
      const nextDoor = sec.state === 'locked' && i > 0 && b.sectors[i - 1].state === 'active';
      parts.push(`<g class="gwm-chamber gwm-chamber-${sec.state} ${sec.state === 'locked' && !nextDoor ? 'gwm-chamber-fog' : ''}" data-tier="${esc(sec.tier.id)}">`
        + `<rect x="${x - CH_W / 2}" y="${y - CH_H / 2}" width="${CH_W}" height="${CH_H}" rx="8"/>`
        + (sil ? `<path class="gwm-sil" d="${sil}" transform="translate(${x},${y})"/>` : '')
        + (sec.state === 'active'
          ? `<circle class="gwm-you" cx="${x - CH_W / 2 + 13}" cy="${y}" r="6" fill="${b.branch === 'lever' ? 'var(--gw-accent)' : 'var(--gw-amber)'}"/>`
          : sec.state === 'cleared'
            ? `<text x="${x + CH_W / 2 - 12}" y="${y + 4}" text-anchor="middle" class="gwm-glyph">✓</text>`
            : nextDoor
              ? `<text x="${x + CH_W / 2 - 12}" y="${y + 4}" text-anchor="middle" class="gwm-glyph">🔒</text>`
              : '')
        + (nextDoor ? `<text x="${x}" y="${y + CH_H / 2 - 6}" text-anchor="middle" class="gwm-sealed gwm-nextdoor">${esc(sec.flavorName)}</text>` : '')
        + `</g>`);

      // TODAY pin (Sprint 2.3): the work order is pinned to the pulsing chamber.
      if (opts.todayTierId === sec.tier.id) {
        const side = b.branch === 'lever' ? -1 : 1;
        const px = x + side * (CH_W / 2 + 8);
        const tx = side < 0 ? px - 48 : px + 8;
        parts.push(`<g class="gwm-today">`
          + `<line x1="${x + side * CH_W / 2}" y1="${y}" x2="${px + (side < 0 ? -4 : 4)}" y2="${y}"/>`
          + `<rect x="${tx - 4}" y="${y - 9}" width="48" height="18" rx="3"/>`
          + `<text x="${tx + 20}" y="${y + 4}" text-anchor="middle">TODAY</text>`
          + `</g>`);
      }
    });

    // Explored narrative rooms budding off the corridor, fog-of-war style.
    const outer = b.branch === 'lever' ? -1 : 1;
    b.explored.slice(0, 10).forEach((room, i) => {
      const baseY = yFor(Math.floor(i / 2)) + (i % 2 === 0 ? -8 : 12);
      const sx = xFor(b.branch, Math.floor(i / 2)) + outer * (CH_W / 2 + 10);
      parts.push(`<rect class="gwm-stub" x="${sx + (outer < 0 ? -10 : 0)}" y="${baseY - 5}" width="10" height="10" rx="2"><title>${esc(room.name)}</title></rect>`);
    });
    parts.push('</g>');
  }

  // Key-item shortcuts as amber cross-links.
  const routes = opts.shortcutRoutes || {};
  for (const id of wing.shortcuts) {
    const r = routes[id];
    if (!r) continue;
    parts.push(`<line x1="${xFor(r.from[0], r.from[1]) + CH_W / 2}" y1="${yFor(r.from[1])}" x2="${xFor(r.to[0], r.to[1]) - CH_W / 2}" y2="${yFor(r.to[1])}" class="gwm-shortcut"><title>${esc(r.label)}</title></line>`);
  }

  // Sealed wings at the edges; the Mast continues up past the bar capstone.
  const mastX = xFor('bar', maxSectors - 1);
  const sealedPos = [
    { x: 14, y: H / 2, anchor: 'start' },
    { x: 14, y: H - 14, anchor: 'start' },
    { x: W - 14, y: H - 14, anchor: 'end' },
    { x: mastX, y: 24, anchor: 'middle' }
  ];
  (wing.lockedDoors || []).forEach((d, i) => {
    const pos = sealedPos[i % sealedPos.length];
    if (i === 3) parts.push(`<line x1="${mastX}" y1="${yFor(maxSectors - 1) - CH_H / 2}" x2="${mastX}" y2="38" class="gwm-corridor-unknown"/>`);
    parts.push(`<text x="${pos.x}" y="${pos.y}" class="gwm-sealed" text-anchor="${pos.anchor}">🔒 ${esc(d.name)}</text>`);
  });

  return `<svg viewBox="0 0 ${W} ${H}" class="gwm" role="img" aria-label="Station wing map">${parts.join('')}</svg>`;
}
