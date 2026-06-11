// ── Discovery engine: rolls pay out in REAL things ──────────────────────────
// intel → the next unread fragment (story chains advance in order, so the
//   archive assembles coherently no matter the roll order)
// loot  → the next undiscovered kit item (key items open map shortcuts)
// encounter → an unseen encounter beat with a player decision
// All draws are seeded-deterministic and never repeat until pools empty.
// Nothing here can touch the prescription (chance-isolation law).

import { createRng } from './rng.mjs';

// Chains are skin-defined (D50): explicit `skin.chains` [{id,name}] wins;
// otherwise distinct fragment chain ids in first-appearance order. The
// `keystone` pile is engine-owned and always exists.
export function skinChains(skin) {
  if (Array.isArray(skin && skin.chains) && skin.chains.length) {
    return skin.chains.map((c) => (typeof c === 'string' ? { id: c, name: prettyChain(c) } : { id: c.id, name: c.name || prettyChain(c.id) }));
  }
  const seen = [];
  for (const f of (skin && skin.fragments) || []) {
    if (f.chain && !seen.includes(f.chain)) seen.push(f.chain);
  }
  return seen.map((id) => ({ id, name: prettyChain(id) }));
}
export function prettyChain(id) {
  return String(id).replace(/[-_]+/g, ' ').toUpperCase();
}

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
  const order = skinChains(skin).map((c) => c.id);
  const chains = order.filter((c) => pool.some((f) => f.chain === c));
  chains.sort((a, b) => (counts[a] || 0) - (counts[b] || 0) || order.indexOf(a) - order.indexOf(b));
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
      if (!frag) return { type: 'intel-exhausted', text: (skin.emptyPools || {}).intel || 'No new pages remain — for now. The find still counts in the log.' };
      profile.archive = profile.archive || [];
      profile.archive.push({ id: frag.id, chain: frag.chain, foundAt: new Date().toISOString() });
      return { type: 'fragment', fragment: frag };
    }
    case 'loot': {
      const item = drawKitItem(skin, profile, rng);
      if (!item) return { type: 'loot-exhausted', text: (skin.emptyPools || {}).loot || 'A find, ordinary grade. The kit already carries everything that matters.' };
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

// Lookup across every document source: ambient pool, keystones, the live
// event's filed entry. (Keystones live outside skin.fragments so the dice
// draws above can never reach them.)
export function fragmentById(skin, id) {
  return skin.fragments.find((f) => f.id === id)
    || (skin.keystones || []).find((k) => k.id === id)
    || (skin.liveEvent && skin.liveEvent.document && skin.liveEvent.document.id === id
      ? skin.liveEvent.document : null);
}

export function kitItemById(skin, id) {
  return skin.kitItems.find((k) => k.id === id) || null;
}

// ── Room types (Sprint 2.4): deterministic special-room payouts ──────────────
// A special room replaces the dice ceremony with its payout family: cache →
// loot, echo → archive replay, quiet → pure beat. The set behind the door is
// untouched (chance-isolation law); rest runs as prescribed.

export function nextCache(skin, profile) {
  const opened = new Set(profile.cachesOpened || []);
  return (skin.caches || []).find((c) => !opened.has(c.id)) || null;
}

export function resolveSpecialRoom(skin, profile, rng, door) {
  if (door.roomType === 'sealed-cache') {
    const cache = (skin.caches || []).find((c) => c.id === door.cacheId) || nextCache(skin, profile);
    if (!cache) return { type: 'quiet', text: quietBeat(skin, rng) };
    const hasKey = (profile.kit || []).some((k) => k.id === cache.needs);
    const needed = kitItemById(skin, cache.needs);
    if (!hasKey) return { type: 'cache-locked', cache, neededName: needed ? needed.name : 'the right tool' };
    profile.cachesOpened = profile.cachesOpened || [];
    if (!profile.cachesOpened.includes(cache.id)) profile.cachesOpened.push(cache.id);
    // The cache pays from the same honest pools as the dice: next kit item,
    // else next fragment, else the wing is simply generous with words.
    let award = awardForRow(skin, profile, rng, { effect: 'loot' });
    if (award.type !== 'kit') award = awardForRow(skin, profile, rng, { effect: 'intel' });
    return { type: 'cache-open', cache, award };
  }
  if (door.roomType === 'echo') {
    const owned = profile.archive || [];
    if (!owned.length) return { type: 'quiet', text: quietBeat(skin, rng) };
    const pick = owned[Math.floor(rng() * owned.length)];
    const fragment = fragmentById(skin, pick.id);
    if (!fragment) return { type: 'quiet', text: quietBeat(skin, rng) };
    const frame = (skin.echoFrames || {})[fragment.chain] || (skin.echoFrames || {}).log || 'ECHO.';
    return { type: 'echo', fragment, frame };
  }
  return { type: 'quiet', text: quietBeat(skin, rng) };
}

function quietBeat(skin, rng) {
  const beats = (skin && skin.quietBeats) || [];
  return beats.length
    ? beats[Math.floor(rng() * beats.length)]
    : 'A quiet room. The work was the whole of it.'; // neutral by design
}

// ── Posted manifests (D52): the located channel ──────────────────────────────
// At most one live posting: a NAMED find logged at a NAMED room. The work
// order announces it; the door appears on that branch within two sessions
// (session.mjs guarantees inclusion); walking in recovers exactly that find.
// Deterministic (seeded off profile history), reward-side only.


export function createPosting(skin, profile, tree) {
  if (!skin || !skin.roomPools) return null;
  const rng = createRng(String(profile.seed) + ':posting:' + (profile.history || []).length);
  const branches = Object.keys((tree && tree.branches) || skin.roomPools);
  const branch = branches[Math.floor(rng() * branches.length)];
  const pool = (skin.roomPools[branch] || []);
  if (!pool.length) return null;
  // Prefer unexplored rooms — postings should pull the keeper somewhere new.
  const seen = new Set(((profile.explored || {})[branch]) || []);
  const fresh = pool.filter((r) => !seen.has(r.id));
  const room = (fresh.length ? fresh : pool)[Math.floor(rng() * (fresh.length ? fresh.length : pool.length))];
  // The find: next unowned kit item, else the next fragment of the
  // least-advanced chain. Nothing to post → no posting (pools exhausted).
  const haveKit = new Set((profile.kit || []).map((k) => k.id));
  const kitPool = (skin.kitItems || []).filter((k) => !haveKit.has(k.id));
  if (kitPool.length) {
    const item = kitPool[Math.floor(rng() * kitPool.length)];
    return { findType: 'kit', findId: item.id, findName: item.name, roomId: room.id, roomName: room.name, branch, sessionsLeft: 3 };
  }
  const frag = drawFragment(skin, profile, rng);
  if (frag) {
    return { findType: 'fragment', findId: frag.id, findName: frag.title, roomId: room.id, roomName: room.name, branch, sessionsLeft: 3 };
  }
  return null;
}

// Recover the posted find (replaces the dice ceremony for that room, like a
// cache — the set behind the door was untouched).
export function resolvePosting(skin, profile, posting) {
  if (!posting) return null;
  let award = null;
  if (posting.findType === 'kit') {
    const item = kitItemById(skin, posting.findId);
    if (item && !(profile.kit || []).some((k) => k.id === item.id)) {
      profile.kit = profile.kit || [];
      profile.kit.push({ id: item.id, foundAt: new Date().toISOString() });
      if (item.kind === 'key' && item.unlocks) {
        profile.shortcuts = profile.shortcuts || [];
        if (!profile.shortcuts.includes(item.unlocks)) profile.shortcuts.push(item.unlocks);
      }
      award = { type: 'kit', item };
    }
  } else if (posting.findType === 'fragment') {
    const frag = fragmentById(skin, posting.findId);
    if (frag && !(profile.archive || []).some((a) => a.id === frag.id)) {
      profile.archive = profile.archive || [];
      profile.archive.push({ id: frag.id, chain: frag.chain, foundAt: new Date().toISOString() });
      award = { type: 'fragment', fragment: frag };
    }
  }
  profile.posting = null; // recovered (or stale) — the board clears either way
  return award || { type: 'posting-stale', text: 'The manifest was out of date — the find was already in your hands. The room still counts.' };
}
