// ── d100 roll-under resolver ─────────────────────────────────────────────────
// Classifies a roll against a tree stat and resolves it to a table row.
// CHANCE-ISOLATION LAW: the resolver returns narrative/reward effects only;
// nothing it returns can reach the prescription. The bonus-room carve-out is
// capped HERE (one per session, never on deload) — the table merely offers.

import { ROOM_TABLES, BOSS_TABLES } from '../../data/tables/resolution.mjs';
import { isDoubles, rollWithMode } from './rng.mjs';

// Set outcome → roll mode. A missed set still always yields (fail table is
// all-intel): failure only ever adds.
export function modeForSetOutcome(outcome) {
  if (outcome === 'hit') return 'advantage';      // prescription met at form standard
  if (outcome === 'partial') return 'flat';
  return 'disadvantage';                           // missed — still yields intel
}

export function classify(roll, stat) {
  const under = roll <= stat;
  if (isDoubles(roll)) return under ? 'crit' : 'complication';
  return under ? 'success' : 'fail';
}

export function resolveRoom(rng, { stat, setOutcome, sessionState }) {
  const mode = modeForSetOutcome(setOutcome);
  const { roll, rolls } = rollWithMode(rng, mode);
  const kind = classify(roll, stat);
  const table = ROOM_TABLES[kind];
  let row = table[roll % 10];

  // Bonus-room cap enforcement (the single chance→training carve-out):
  // opt-in, max one per session, never on deload weeks.
  if (row.effect === 'bonus-room') {
    const allowed = !sessionState.isDeload && !sessionState.bonusRoomOffered;
    if (allowed) {
      sessionState.bonusRoomOffered = true;
    } else {
      row = table[(roll + 1) % 10]; // deterministic adjacent row, never bonus twice
      if (row.effect === 'bonus-room') row = table[(roll + 2) % 10];
    }
  }

  return { roll, rolls, mode, kind, stat, row };
}

export function resolveBoss(rng, { stat, passed }) {
  const { roll, rolls } = rollWithMode(rng, 'flat'); // the body decided; dice color it
  const table = passed ? BOSS_TABLES.pass : BOSS_TABLES.fail;
  return { roll, rolls, mode: 'flat', kind: passed ? 'boss-pass' : 'boss-fail', stat, row: table[roll % 10] };
}
