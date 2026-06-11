// ── Groundwork resolution tables (d100 roll-under, Delta Green lineage) ─────
//
// CHANCE-ISOLATION LAW (validated by scripts/validate.mjs):
// dice resolve room contents and rewards ONLY. The effect vocabulary below is
// the closed set of things a roll may do — none of them can name or modify
// sets, reps, exercise selection, progression order, or rest duration. The
// single carve-out is `bonus-room`: an OPT-IN optional extra (hard-capped at
// one per session, volume-bounded, never on deload weeks), enforced by the
// session engine, not by the table.
//
// Roll mechanics:
//   roll d100 (00-99). success = roll <= stat.
//   matched doubles (00,11,...,99): under stat = CRIT, over stat = COMPLICATION.
//   advantage: roll twice keep lower. disadvantage: roll twice keep higher.
//   set outcome maps to advantage/disadvantage (prescription hit at form
//   standard = advantage; partial = flat; missed = disadvantage) — and a
//   missed set still ALWAYS yields intel (failure only ever adds).
//
// Tables are data so the same system runs animated in the app, prints in the
// field manual as d100 lookups, and reskins per campaign without code.

// Closed effect vocabulary. The validator proves no table entry uses
// anything outside this list, and that no entry's payload references
// prescription fields.
export const EFFECT_VOCAB = [
  'loot',         // diegetic reward token (skin renders it; engine logs it)
  'intel',        // a fragment/clue surfaces (always the floor outcome)
  'encounter',    // narrative beat with a flavor choice (no mechanical fork)
  'shortcut',     // map texture: a connection is revealed (visual only)
  'story-beat',   // rest-beat paragraph from the skin
  'bonus-room',   // OPT-IN optional extra work (engine-capped; see law above)
  'xp-bonus'      // extra XP tick (derived display only — never gates tiers)
];

// ── Room resolution (per work set, rolled during the rest slot) ─────────────
// Bands are inclusive [lo, hi] on the d100 roll RELATIVE TO SUCCESS:
// the engine first classifies crit/success/fail/complication, then reads the
// matching table. Within each table, a second d10 (the roll's ones digit)
// picks the row — printable as one combined d100 lookup in the manual.

export const ROOM_TABLES = {
  crit: [
    { digit: 0, effect: 'loot', text: 'A find beyond anything the inventory promised. Take it.', reward: 'relic' },
    { digit: 1, effect: 'shortcut', text: 'A connection that was always there shows itself on the map.' },
    { digit: 2, effect: 'loot', text: 'A cache, intact. More than the records listed.', reward: 'cache' },
    { digit: 3, effect: 'xp-bonus', text: 'Perfect execution. The work counts double in the log.', amount: 1 },
    { digit: 4, effect: 'intel', text: 'A complete page where scraps were expected. The picture sharpens.', weight: 2 },
    { digit: 5, effect: 'story-beat', beatSlot: 'crit-beat', text: 'The place speaks plainly for once.' },
    { digit: 6, effect: 'bonus-room', text: 'A side door stands open. Optional: one extra easy set of warm-up work to clear it. It will not be open next time.' },
    { digit: 7, effect: 'loot', text: 'A tool, functional. Into the kit.', reward: 'tool' },
    { digit: 8, effect: 'shortcut', text: 'From here the layout makes sense. Two distant rooms join on the map.' },
    { digit: 9, effect: 'xp-bonus', text: 'Witnessed. Somebody kept score. Bonus tick.', amount: 1 }
  ],
  success: [
    { digit: 0, effect: 'intel', text: 'Cleared and catalogued. One page recovered.' },
    { digit: 1, effect: 'loot', text: 'Standard salvage. It all counts.', reward: 'salvage' },
    { digit: 2, effect: 'story-beat', beatSlot: 'success-beat', text: 'A quiet moment, noted in the log.' },
    { digit: 3, effect: 'intel', text: 'Fresh markings. Somebody passed through ahead of you.' },
    { digit: 4, effect: 'loot', text: 'Half a cache. The other half left in a hurry.', reward: 'salvage' },
    { digit: 5, effect: 'encounter', text: 'Something else is here. It watches; it does not interfere.' },
    { digit: 6, effect: 'intel', text: 'A door you cannot open yet is now at least on the map.' },
    { digit: 7, effect: 'story-beat', beatSlot: 'success-beat', text: 'This room remembers being used for something else.' },
    { digit: 8, effect: 'loot', text: 'Personal effects, not yours. Worth keeping anyway.', reward: 'salvage' },
    { digit: 9, effect: 'intel', text: 'Clean sweep. The next room on this route is half-known already.' }
  ],
  fail: [
    // "Fail" = the roll missed. The SET already happened and already counted.
    // Failure only ever adds: every row yields intel.
    { digit: 0, effect: 'intel', text: 'Dark, and nothing given up — except certainty that the route continues. Mark it scouted.' },
    { digit: 1, effect: 'intel', text: 'Empty. But empty is information: whatever left, left a direction.' },
    { digit: 2, effect: 'intel', text: 'Locked containers. Their places go in the log for a stronger day.' },
    { digit: 3, effect: 'story-beat', beatSlot: 'fail-beat', text: 'The log gains an unkind, useful note about this room.' },
    { digit: 4, effect: 'intel', text: 'Drag marks in the dust. The map gains an annotation.' },
    { digit: 5, effect: 'intel', text: 'A dead end — one wrong answer removed from the map.' },
    { digit: 6, effect: 'encounter', text: 'A noise past the far wall, too organized to be settling. Logged.' },
    { digit: 7, effect: 'intel', text: 'The room resists. Note what gave out first — that is the next side quest naming itself.' },
    { digit: 8, effect: 'intel', text: 'Old tally marks, not yours. Counted into the log.' },
    { digit: 9, effect: 'story-beat', beatSlot: 'fail-beat', text: 'Nothing here but your own breathing. The log fills with reconnaissance.' }
  ],
  complication: [
    // Matched doubles over the stat. Texture only — never punishment, never
    // a training prescription. Complications color the NEXT beat's tone and
    // add intel with strings attached.
    { digit: 0, effect: 'encounter', text: 'The light fails. Finish the entry by feel.', tone: 'dark' },
    { digit: 1, effect: 'intel', text: 'Good intel, wrong hands: the page names you.', tone: 'watched' },
    { digit: 2, effect: 'encounter', text: 'The way back has changed — same rooms, new order. (The training order does not change; the story order does.)', tone: 'rerouted' },
    { digit: 3, effect: 'story-beat', beatSlot: 'complication-beat', text: 'Mid-sentence, the place goes quiet. It heard something.', tone: 'silence' },
    { digit: 4, effect: 'intel', text: 'A page in a cipher you have not earned. Hold it; its day will come.', tone: 'locked' },
    { digit: 5, effect: 'encounter', text: 'The kit is lighter than it should be. The manifest disagrees with itself.', tone: 'loss' },
    { digit: 6, effect: 'intel', text: 'Two pages that contradict each other. One of them is bait.', tone: 'doubt' },
    { digit: 7, effect: 'encounter', text: 'This room was cleared recently, badly, by someone in a hurry.', tone: 'rival' },
    { digit: 8, effect: 'story-beat', beatSlot: 'complication-beat', text: 'The place misnames this room — and refuses to discuss the error.', tone: 'glitch' },
    { digit: 9, effect: 'intel', text: 'Solid intel, price posted: something now knows the route you took.', tone: 'traced' }
  ]
};

// ── Boss resolution ──────────────────────────────────────────────────────────
// The boss ATTEMPT is physical: clean reps/hold of the next tier per the
// tree's boss definition. Dice do not decide the boss — the body does.
// Dice only color the aftermath narration and reward quality.
export const BOSS_TABLES = {
  // Boss passed (physical standard met) — roll for victory texture
  pass: [
    { digit: 0, effect: 'loot', text: 'The door yields. Beyond it: ground you could see but never reach. Take the keystone.', reward: 'keystone' },
    { digit: 1, effect: 'story-beat', beatSlot: 'boss-pass-beat', text: 'For once, no commentary at all. Respect, probably.' },
    { digit: 2, effect: 'loot', text: 'The mechanism comes apart in your hands. Souvenir grade.', reward: 'relic' },
    { digit: 3, effect: 'intel', text: 'From the cleared threshold, three new rooms map themselves.', weight: 2 },
    { digit: 4, effect: 'xp-bonus', text: 'A clean clear, witnessed and recorded. Bonus tick.', amount: 2 },
    { digit: 5, effect: 'story-beat', beatSlot: 'boss-pass-beat', text: 'Something old and heavy stops pretending to be a wall.' },
    { digit: 6, effect: 'shortcut', text: 'The opened gate works both ways. Travel just got shorter.' },
    { digit: 7, effect: 'loot', text: 'The gate had a hoard behind it, as gates do.', reward: 'cache' },
    { digit: 8, effect: 'intel', text: 'The gate kept records of everyone it stopped. You are in there too — older entries, weaker grip.' },
    { digit: 9, effect: 'xp-bonus', text: 'The whole map registers it. Bonus tick.', amount: 2 }
  ],
  // Boss failed (standard not met) — INTEL DROP, never punishment.
  // The engine pairs this with the fault → side-quest mapping from the tier:
  // the failure identifies the sticking point; the table narrates the scouting.
  fail: [
    { digit: 0, effect: 'intel', text: 'The gate held — and in holding, showed its mechanism. You know which part of you it tested. (Side quest assigned.)' },
    { digit: 1, effect: 'intel', text: 'Repelled, but you touched the lock. The next attempt starts from knowledge.' },
    { digit: 2, effect: 'story-beat', beatSlot: 'boss-fail-beat', text: 'A gentler note than expected: this gate has eaten better-prepared visitors. Notes are being taken for you.' },
    { digit: 3, effect: 'intel', text: 'The gate flexed under the attempt. Wear is wear.' },
    { digit: 4, effect: 'intel', text: 'Reconnaissance complete: the failure point is named and has a training answer. (Side quest assigned.)' },
    { digit: 5, effect: 'encounter', text: 'Something on the other side knocked back. Twice.' },
    { digit: 6, effect: 'intel', text: 'You held longer than the log predicted. The model of you is out of date — in the right direction.' },
    { digit: 7, effect: 'story-beat', beatSlot: 'boss-fail-beat', text: 'A maker’s mark on the gate. Built to be opened by a specific kind of strong. Now you know which kind.' },
    { digit: 8, effect: 'intel', text: 'A hairline crack where your best attempt landed. The log remembers damage too.' },
    { digit: 9, effect: 'intel', text: 'Scouting report filed. The far side is one tier away, and tiers are a known technology.' }
  ]
};

// Stat derivation (character sheet percentile per tree):
//   stat = tree.statBase
//        + clearedTierCount * tree.statPerTier
//        + recentPerformanceBonus (0..tree.statRecentMax, from last 3 sessions'
//          prescription-hit rate)
//   capped at tree.statCap. Progression literally reads as growing percentages.
export function deriveTreeStat(tree, clearedTierCount, recentHitRate) {
  const recent = Math.round((recentHitRate || 0) * tree.statRecentMax);
  return Math.min(tree.statCap, tree.statBase + clearedTierCount * tree.statPerTier + recent);
}

export default { EFFECT_VOCAB, ROOM_TABLES, BOSS_TABLES, deriveTreeStat };
