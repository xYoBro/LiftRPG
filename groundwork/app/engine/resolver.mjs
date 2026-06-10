// ── d100 roll-under resolver (v2: success degrees + door bias) ───────────────
// Classifies a roll against a tree stat and resolves it to a table row.
// CHANCE-ISOLATION LAW: the resolver returns narrative/reward effects only;
// nothing it returns can reach the prescription. The bonus-room carve-out is
// capped HERE (one per session, never on deload) — the table merely offers.
//
// Degrees (D29 follow-up — texture without nerfing growth):
//   doubles under stat  → crit
//   roll ≤ stat/2       → strong success ("clean clear": upgraded reward)
//   roll ≤ stat         → success
//   doubles over stat   → complication
//   else                → fail (all-intel table: failure only ever adds)

import { ROOM_TABLES, BOSS_TABLES } from '../../data/tables/resolution.mjs';
import { isDoubles, rollWithMode } from './rng.mjs';
import { applyDoorBias } from './map.mjs';

export function modeForSetOutcome(outcome) {
  if (outcome === 'hit') return 'advantage';
  if (outcome === 'partial') return 'flat';
  return 'disadvantage'; // missed — still yields intel
}

export function classify(roll, stat) {
  const under = roll <= stat;
  if (isDoubles(roll)) return under ? 'crit' : 'complication';
  if (!under) return 'fail';
  return roll <= Math.floor(stat / 2) ? 'strong' : 'success';
}

// Strong success upgrades flavor-only rows to a tangible prize.
function upgradeForStrong(table, rolledDigit, row) {
  if (row.effect === 'intel' || row.effect === 'loot' || row.effect === 'xp-bonus' || row.effect === 'bonus-room') return row;
  for (let step = 1; step < 10; step++) {
    const candidate = table[(rolledDigit + step) % 10];
    if (candidate.effect === 'intel' || candidate.effect === 'loot') return candidate;
  }
  return row;
}

export function resolveRoom(rng, { stat, setOutcome, sessionState, doorBias }) {
  const mode = modeForSetOutcome(setOutcome);
  const { roll, rolls } = rollWithMode(rng, mode);
  const kind = classify(roll, stat);
  const table = ROOM_TABLES[kind === 'strong' ? 'success' : kind];
  let row = applyDoorBias(table, roll % 10, doorBias, kind);
  if (kind === 'strong') row = upgradeForStrong(table, roll % 10, row);

  // Bonus-room cap (the single chance→training carve-out): opt-in, max one
  // per session, never on deload weeks.
  if (row.effect === 'bonus-room') {
    const allowed = sessionState && !sessionState.isDeload && !sessionState.bonusRoomOffered;
    if (allowed) {
      sessionState.bonusRoomOffered = true;
    } else {
      row = table[(roll + 1) % 10];
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
