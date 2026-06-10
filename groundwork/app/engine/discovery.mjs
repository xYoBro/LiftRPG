// ── Discovery engine: rolls pay out in REAL things ──────────────────────────
// intel → the next unread fragment (story chains advance in order, so the
//   archive assembles coherently no matter the roll order)
// loot  → the next undiscovered kit item (key items open map shortcuts)
// encounter → an unseen encounter beat with a player decision
// All draws are seeded-deterministic and never repeat until pools empty.
// Nothing here can touch the prescription (chance-isolation law).

const CHAIN_ORDER = ['log', 'personal', 'technical', 'signal'];

export function undiscoveredFragments(skin, profile) {
  const have = new Set((profile.archive || []).map((f) => f.id));
  return skin.fragments.filter((f) => !have.has(f.id));
}

// Advance one chain: prefer the chain with the lowest read-count (keeps all
// four stories moving); within a chain, always the next fragment in order.
export function drawFragment(skin, profile, rng) {
  const pool = undiscoveredFragments(skin, profile);
  if (!pool.length) return null;
  const counts = {};
  for (const f of profile.archive || []) counts[f.chain] = (counts[f.chain] || 0) + 1;
  const chains = CHAIN_ORDER.filter((c) => pool.some((f) => f.chain === c));
  chains.sort((a, b) => (counts[a] || 0) - (counts[b] || 0) || CHAIN_ORDER.indexOf(a) - CHAIN_ORDER.indexOf(b));
  // small seeded jitter so two equal chains don't always tie-break the same way
  const pick = chains[(counts[chains[0]] || 0) === (counts[chains[1]] || 0) && chains.length > 1 && rng() < 0.35 ? 1 : 0];
  return pool.find((f) => f.chain === pick) || pool[0];
}

export function drawKitItem(skin, profile, rng) {
  const have = new Set((profile.kit || []).map((k) => k.id));
  const pool = skin.kitItems.filter((k) => !have.has(k.id));
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

export function drawEncounter(skin, profile, rng) {
  const seen = new Set(profile.encountersSeen || []);
  let pool = skin.encounters.filter((e) => !seen.has(e.id));
  if (!pool.length) pool = skin.encounters; // recycle once exhausted
  return pool[Math.floor(rng() * pool.length)];
}

// Apply a resolved room's reward to the profile. Returns a payload the UI
// renders (the actual document/item/encounter — the prize is the prize).
export function awardForRow(skin, profile, rng, row) {
  switch (row.effect) {
    case 'intel': {
      const frag = drawFragment(skin, profile, rng);
      if (!frag) return { type: 'intel-exhausted', text: 'The archive holds no more new pages — for now. The intel still counts in the log.' };
      profile.archive = profile.archive || [];
      profile.archive.push({ id: frag.id, chain: frag.chain, foundAt: new Date().toISOString() });
      return { type: 'fragment', fragment: frag };
    }
    case 'loot': {
      const item = drawKitItem(skin, profile, rng);
      if (!item) return { type: 'loot-exhausted', text: 'Salvage, ordinary grade. The kit is already carrying everything that matters.' };
      profile.kit = profile.kit || [];
      profile.kit.push({ id: item.id, foundAt: new Date().toISOString() });
      if (item.kind === 'key' && item.unlocks) {
        profile.shortcuts = profile.shortcuts || [];
        if (!profile.shortcuts.includes(item.unlocks)) profile.shortcuts.push(item.unlocks);
      }
      return { type: 'kit', item };
    }
    case 'encounter': {
      const enc = drawEncounter(skin, profile, rng);
      profile.encountersSeen = profile.encountersSeen || [];
      if (!profile.encountersSeen.includes(enc.id)) profile.encountersSeen.push(enc.id);
      return { type: 'encounter', encounter: enc };
    }
    case 'shortcut': {
      profile.shortcutsFound = (profile.shortcutsFound || 0) + 1;
      return { type: 'shortcut', text: row.text };
    }
    case 'xp-bonus': {
      profile.xp += row.amount || 1;
      return { type: 'xp', amount: row.amount || 1, text: row.text };
    }
    case 'bonus-room':
      return { type: 'bonus-room', text: row.text };
    case 'story-beat':
    default:
      return { type: 'story', text: row.text, beatSlot: row.beatSlot || null };
  }
}

// Resolve an encounter decision (pure texture; optional intel award).
export function resolveEncounterChoice(skin, profile, rng, encounter, optionIndex) {
  const option = encounter.options[optionIndex] || encounter.options[0];
  let extra = null;
  if (option.award && option.award.type === 'intel') {
    const frag = drawFragment(skin, profile, rng);
    if (frag) {
      profile.archive = profile.archive || [];
      profile.archive.push({ id: frag.id, chain: frag.chain, foundAt: new Date().toISOString() });
      extra = frag;
    }
  }
  profile.choices = profile.choices || [];
  profile.choices.push({ encounter: encounter.id, choice: option.label, at: new Date().toISOString() });
  return { option, extraFragment: extra };
}

export function fragmentById(skin, id) {
  return skin.fragments.find((f) => f.id === id) || null;
}

export function kitItemById(skin, id) {
  return skin.kitItems.find((k) => k.id === id) || null;
}
