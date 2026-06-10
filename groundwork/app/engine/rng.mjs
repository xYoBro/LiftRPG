// ── Seeded RNG (mulberry32) ──────────────────────────────────────────────────
// Same profile + same seed → identical run (mission 3.9: testability and the
// persona simulations). Never Math.random() in engine code.

export function createRng(seed) {
  let a = hashSeed(seed);
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(seed) {
  const str = String(seed === undefined || seed === null ? 'groundwork' : seed);
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

// d100 as 00-99 (Delta Green lineage: 00 is a real roll, doubles matter).
export function rollD100(rng) {
  return Math.floor(rng() * 100);
}

export function isDoubles(roll) {
  return roll % 11 === 0; // 00, 11, 22 ... 99
}

// advantage: keep lower (roll-under). disadvantage: keep higher.
// mode: 'advantage' | 'flat' | 'disadvantage'
export function rollWithMode(rng, mode) {
  const first = rollD100(rng);
  if (mode === 'flat' || !mode) return { roll: first, rolls: [first] };
  const second = rollD100(rng);
  const keep = mode === 'advantage' ? Math.min(first, second) : Math.max(first, second);
  return { roll: keep, rolls: [first, second] };
}
