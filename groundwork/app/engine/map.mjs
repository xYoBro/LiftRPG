// ── Exploration map: door choices over narrative rooms ──────────────────────
// The wing is a space, not a list. Each working SET clears one narrative room;
// before the set the player chooses between two frontier doors (bias posted on
// the door). The choice is real navigation agency and never touches the set:
// same tier, same scheme, same rest behind every door (chance-isolation law).
//
// Sectors: each tier is a sector of the wing. Rooms explored are remembered
// per branch; pools recycle with " (revisited)" once exhausted — cleared rooms
// are farmable.

export function exploredSet(profile, branch) {
  return new Set(((profile.explored || {})[branch]) || []);
}

export function frontierDoors(skin, profile, branch, rng, count = 2) {
  const pool = (skin.roomPools && skin.roomPools[branch]) || [];
  if (!pool.length) return [];
  const seen = exploredSet(profile, branch);
  let fresh = pool.filter((r) => !seen.has(r.id));
  if (fresh.length < count) fresh = pool.slice(); // cleared rooms are farmable
  if (!fresh.length) return [];
  // Seeded, order-stable pick of `count` distinct doors. When the pool offers
  // more than one bias, the pair is bias-distinct — twin-bias pairs made the
  // pick cosmetic (GW-21).
  const doors = [];
  const working = fresh.slice();
  while (doors.length < count && working.length) {
    let pickPool = working;
    if (doors.length) {
      const distinct = working.filter((r) => r.bias !== doors[0].bias);
      if (distinct.length) pickPool = distinct;
    }
    const pick = pickPool[Math.floor(rng() * pickPool.length)];
    working.splice(working.indexOf(pick), 1);
    doors.push({ ...pick });
  }
  return doors;
}

export function markExplored(profile, branch, roomId, tierId) {
  profile.explored = profile.explored || {};
  profile.explored[branch] = profile.explored[branch] || [];
  if (!profile.explored[branch].includes(roomId)) profile.explored[branch].push(roomId);
  // Remember WHERE it was explored — the map fills rooms into their sector
  // chamber (play draws the map).
  if (tierId) {
    profile.exploredAt = profile.exploredAt || {};
    if (!profile.exploredAt[roomId]) profile.exploredAt[roomId] = tierId;
  }
}

// Bias tilt: deterministically nudge the resolved row toward the door's
// posted bias when the rolled row doesn't match. Searches forward from the
// rolled digit for the nearest bias-matching row — same roll, same door,
// same result, every time. Crit/complication rows are never overridden.
const BIAS_EFFECTS = { intel: 'intel', loot: 'loot', encounter: 'encounter', story: 'story-beat' };

export function applyDoorBias(table, rolledDigit, bias, kind) {
  const row = table[rolledDigit % 10];
  if (kind === 'crit' || kind === 'complication') return row;
  const want = BIAS_EFFECTS[bias];
  if (!want || row.effect === want) return row;
  for (let step = 1; step < 10; step++) {
    const candidate = table[(rolledDigit + step) % 10];
    if (candidate.effect === want) return candidate;
  }
  return row;
}

// Map projection for the map screen: sectors (tiers) per branch with their
// room footprints, plus shortcuts and cross-wing locked doors.
export function projectWing(skin, tree, profile, tierStateFn) {
  const branches = Object.keys(tree.branches).map((branch) => {
    const sectors = tree.tiers.filter((t) => t.branch === branch).map((tier) => ({
      tier,
      state: tierStateFn(tier.id),
      flavorName: (skin.tierNames && skin.tierNames[tier.hookSlot]) || tier.name
    }));
    const explored = ((profile.explored || {})[branch] || [])
      .map((id) => (skin.roomPools[branch] || []).find((r) => r.id === id))
      .filter(Boolean);
    return { branch, name: tree.branches[branch].name, sectors, explored };
  });
  return {
    stationName: skin.map.stationName,
    wingName: skin.map.wings[tree.id] || tree.name,
    branches,
    shortcuts: profile.shortcuts || [],
    lockedDoors: skin.lockedDoors || []
  };
}
