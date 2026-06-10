// ── Keystone engine (Sprint 2.2): authored reveals on authored triggers ─────
// The ambient fragment pool is dice-fed (discovery.mjs); keystones are the
// narrative spine and fire deterministically: first seal broken, seal-count
// milestones, sector entries, and one present-tense live event on the session
// rail. Keystones never enter dice pools and never repeat (profile.firedKeystones).
// Nothing here can touch the prescription (chance-isolation law).

export function doorsOpenedCount(profile) {
  return (profile.history || []).filter((h) => h.boss && h.boss.passed).length;
}

export function monthsOnStation(profile) {
  if (!profile || !profile.createdAt) return 0;
  const days = (Date.now() - new Date(profile.createdAt).getTime()) / 86400000;
  return Math.max(0, Math.floor(days / 30));
}

// Keystones due for a boss pass. `doorsOpened` must INCLUDE the pass being
// ceremonied (history files at debrief, after the ceremony renders).
// Count triggers use >= so saves that predate this system still fire each
// keystone once, on their next qualifying pass.
export function dueKeystonesForBossPass(skin, profile, { doorsOpened, openedHookSlot }) {
  const fired = new Set(profile.firedKeystones || []);
  return (skin.keystones || []).filter((k) => {
    if (fired.has(k.id)) return false;
    const t = k.trigger || {};
    if (t.type === 'first-boss-pass') return doorsOpened >= 1;
    if (t.type === 'boss-pass-count') return doorsOpened >= t.n;
    if (t.type === 'sector-open') return !!openedHookSlot && t.hookSlot === openedHookSlot;
    return false;
  });
}

// File a keystone: mark fired, add to the archive (the desk shows it under
// its chain — keystones default to the KEYSTONE FILE pile).
export function fileKeystone(profile, ks) {
  profile.firedKeystones = profile.firedKeystones || [];
  if (!profile.firedKeystones.includes(ks.id)) profile.firedKeystones.push(ks.id);
  profile.archive = profile.archive || [];
  if (!profile.archive.some((a) => a.id === ks.id)) {
    profile.archive.push({ id: ks.id, chain: ks.chain || 'keystone', keystone: true, foundAt: new Date().toISOString() });
  }
}

// The Band 7 live event: due on the first session at or past fireOnSession,
// once ever. The scene marks itself fired when its document files.
export function liveEventDue(skin, profile, sessionNumber) {
  const ev = skin && skin.liveEvent;
  if (!ev) return null;
  if ((profile.firedKeystones || []).includes(ev.id)) return null;
  return sessionNumber >= (ev.fireOnSession || 8) ? ev : null;
}

// File the live event's document with the closing line for the chosen option.
export function fileLiveEvent(profile, liveEvent, choiceId) {
  profile.firedKeystones = profile.firedKeystones || [];
  if (!profile.firedKeystones.includes(liveEvent.id)) profile.firedKeystones.push(liveEvent.id);
  const doc = liveEvent.document;
  profile.archive = profile.archive || [];
  if (doc && !profile.archive.some((a) => a.id === doc.id)) {
    profile.archive.push({
      id: doc.id, chain: doc.chain || 'signal', keystone: true,
      liveChoice: choiceId || null, foundAt: new Date().toISOString()
    });
  }
  return doc || null;
}
