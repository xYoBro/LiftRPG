// ── Season engine (D40): the 8-week commission ───────────────────────────────
// One campaign = 8 calendar weeks from the first filed session. Weeks are
// titled episodes (skin.season.episodes); week 5 is the light week (deload,
// D41); week 8+ arms the finale, which fires after that session's AAR and
// closes the season. Endings key to real wing-state, never dice
// (chance-isolation law). Training continues after close — overtime — until
// a new season/skin begins.

export const SEASON_WEEKS = 8;
export const DELOAD_WEEK = 5;

// The duty clock anchors on the active campaign's start (D43 — the body
// travels between worlds; each world gets its own 8 weeks), falling back to
// the first session ever filed for pre-campaign saves.
export function seasonAnchor(profile) {
  if (profile && profile.campaignStartedAt) return new Date(profile.campaignStartedAt).getTime();
  const first = profile && profile.history && profile.history[0];
  return first ? new Date(first.date).getTime() : null;
}

// Calendar week of the commission, 1-based. Before the first session — and
// for the session about to be filed on day one — it is week 1.
export function seasonWeek(profile) {
  const anchor = seasonAnchor(profile);
  if (!anchor) return 1;
  const days = Math.floor((Date.now() - anchor) / 86400000);
  return Math.max(1, Math.floor(days / 7) + 1);
}

export function seasonClosed(profile) {
  return !!(profile && profile.seasonClosedAt);
}

export function episodeFor(skin, week) {
  const season = skin && skin.season;
  if (!season) return null;
  if (week > SEASON_WEEKS) return { week, ...(season.overtime || { title: 'OVERTIME', line: '' }) };
  return season.episodes.find((e) => e.week === week) || null;
}

export function editorialFor(skin, week) {
  const season = skin && skin.season;
  if (!season || !season.editorials) return null;
  const hit = season.editorials.find((e) => e.week === week);
  return hit ? hit.line : null;
}

export function seasonState(skin, profile) {
  const week = seasonWeek(profile);
  return {
    week,
    weeksTotal: SEASON_WEEKS,
    episode: episodeFor(skin, week),
    isDeloadWeek: week === DELOAD_WEEK && !seasonClosed(profile),
    finaleArmed: !seasonClosed(profile) && week >= SEASON_WEEKS && !!(skin && skin.finale),
    closed: seasonClosed(profile)
  };
}

// Mast readiness: the body cleared Mast Access — the transmit ending's real
// gate. (cleared = the pull-up sector is farmable ground.)
export function mastReady(profile, treeId) {
  return ((profile.cleared || {})[treeId] || []).includes('pull.bar.full');
}

// Close the season: file the chosen ending into the archive, stamp the close.
export function closeSeason(profile, finale, endingId) {
  const ending = finale.endings[endingId];
  if (!ending) return null;
  profile.firedKeystones = profile.firedKeystones || [];
  if (!profile.firedKeystones.includes(finale.id)) profile.firedKeystones.push(finale.id);
  profile.archive = profile.archive || [];
  if (!profile.archive.some((a) => a.id === ending.id)) {
    profile.archive.push({ id: ending.id, chain: ending.chain || 'keystone', keystone: true, foundAt: new Date().toISOString() });
  }
  profile.seasonClosedAt = new Date().toISOString();
  profile.seasonEnding = endingId;
  return ending;
}
