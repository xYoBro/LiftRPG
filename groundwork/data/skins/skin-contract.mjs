// ── Campaign-skin contract (creation pipeline, D12/D42) ─────────────────────
// A skin is a WORLD: names, documents, voices, rooms, episodes. It is never
// load-bearing (every section has an engine fallback) and it can NEVER touch
// training (no sets, reps, rest, or exercise content — chance-isolation law
// extends to the creation pipeline: skins decorate, the tree prescribes).
//
// validateSkin() enforces the split:
//   ERRORS   — the world would be broken or unsafe to run (missing identity,
//              empty room pools, dangling references, training content).
//   WARNINGS — missing richness the engine can fall back from (no caches, no
//              silhouettes, partial tierNames). A warned skin runs; it is
//              just a thinner world.

const FRAGMENT_MIN = 12;
const ROOMS_PER_BRANCH_MIN = 6;
const ENCOUNTERS_MIN = 3;
const KIT_MIN = 8;

const isStr = (v, min = 1) => typeof v === 'string' && v.trim().length >= min;
const isArr = (v, min = 0) => Array.isArray(v) && v.length >= min;

// Words that indicate the skin is trying to prescribe training. Generated
// worlds must not carry them in mechanical positions (we scan everything —
// blunt, but the law is blunt). Hardened per GW-10: digit AND word-number
// forms, bare exercise+count, and rest-duration phrasings all count.
// Word-number patterns are CASE-SENSITIVE lowercase on the number: training
// language leaks mid-sentence ("five reps"); capitalized words are usually
// names ("Eight set the locks") and names must not trip the law.
const NUM_WORD = '(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty|forty|fifty|sixty|ninety)';
export const TRAINING_PATTERNS = [
  /\b\d+\s*(x|×)\s*\d+\b/i,                                          // 3x5
  /\b\d+\s*(reps?|sets?)\b/i,                                          // 5 reps / 3 sets
  new RegExp('\\b' + NUM_WORD + '\\s+(reps|sets)\\b'),               // five reps (lowercase, plural)
  new RegExp('\\b(sets|reps)\\s+of\\s+(\\d+|' + NUM_WORD + ')\\b'), // sets of five
  /\b\d+\s*(pull-?ups?|chin-?ups?|push-?ups?|rows?|negatives?|holds?)\b/i,      // 5 pullups
  new RegExp('\\brest\\s+(for\\s+)?(a|an|\\d+|' + NUM_WORD + ')\\s*(s\\b|secs?\\b|seconds?\\b|mins?\\b|minutes?\\b)'), // rest two minutes
  new RegExp('\\bhold\\s+(for\\s+)?(\\d+|' + NUM_WORD + ')\\s*(s\\b|secs?\\b|seconds?\\b)') // hold for thirty seconds
];
export function findTrainingLanguage(text) {
  for (const re of TRAINING_PATTERNS) {
    const m = String(text).match(re);
    if (m) return m[0];
  }
  return null;
}

export function validateSkin(skin, tree) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  if (!skin || typeof skin !== 'object') return { ok: false, errors: ['Not a JSON object.'], warnings };

  // Identity
  if (!isStr(skin.id)) err('skin.id missing');
  if (!isStr(skin.name)) err('skin.name missing');
  if (!isStr(skin.worldLine)) err('skin.worldLine missing (the home-screen world sentence)');

  // Tier names: every hookSlot of the tree should have a sector name.
  const slots = tree.tiers.map((t) => t.hookSlot);
  const tierNames = skin.tierNames || {};
  const missingSlots = slots.filter((s) => !isStr(tierNames[s]));
  if (missingSlots.length === slots.length) err('tierNames: empty — the wing has no places');
  else if (missingSlots.length) warn(`tierNames: ${missingSlots.length} sector(s) unnamed (fallback: exercise names): ${missingSlots.join(', ')}`);

  // Intake voice per probe + grades (Intake v2, D44).
  const probeIds = Object.keys((tree.probes || {}).defs || {});
  const voice = skin.intakeVoice || {};
  const missingProbes = probeIds.filter((p) => !isStr(voice[p]));
  if (missingProbes.length) warn(`intakeVoice: ${missingProbes.length} probe line(s) missing (fallback: sector lines): ${missingProbes.join(', ')}`);
  const grades = skin.grades || {};
  for (const g of ['untrained', 'trained', 'intermediate', 'advanced']) {
    if (!grades[g] || !isStr(grades[g].name)) { warn('grades: missing or incomplete (fallback: plain class names)'); break; }
  }
  // Condition survey + chalk-wall lines (D45) — engine has plain fallbacks.
  const iq = skin.intakeQuestions || {};
  for (const qk of ['recency', 'age']) {
    if (!iq[qk] || !isStr((iq[qk] || {}).prompt) || !isArr((iq[qk] || {}).options, 3)) {
      warn(`intakeQuestions.${qk}: missing or incomplete (fallback: plain wording)`);
    } else {
      const ids = iq[qk].options.map((o) => o[0]);
      const want = qk === 'recency' ? ['never', 'years', 'recent'] : ['u40', '40s', '55plus'];
      if (!want.every((id) => ids.includes(id))) err(`intakeQuestions.${qk}: option ids must be exactly ${want.join('/')} (engine reads them)`);
    }
  }
  if (!isStr((skin.sessionFrame || {}).newMark) || !isStr((skin.sessionFrame || {}).newMarkFirst)) {
    warn('sessionFrame.newMark/newMarkFirst: missing (fallback: plain new-mark line)');
  }

  // Room pools per branch
  const branches = Object.keys(tree.branches);
  for (const b of branches) {
    const pool = (skin.roomPools || {})[b] || [];
    if (pool.length < ROOMS_PER_BRANCH_MIN) err(`roomPools.${b}: ${pool.length} rooms (need ≥${ROOMS_PER_BRANCH_MIN})`);
    const ids = new Set();
    pool.forEach((r, i) => {
      if (!isStr(r.id) || !isStr(r.name) || !isStr(r.desc)) err(`roomPools.${b}[${i}]: needs id, name, desc`);
      if (r.id && ids.has(r.id)) err(`roomPools.${b}: duplicate room id ${r.id}`);
      ids.add(r.id);
      if (r.bias && !['intel', 'loot', 'encounter', 'story'].includes(r.bias)) warn(`roomPools.${b}[${i}]: unknown bias "${r.bias}"`);
    });
  }
  const allRoomIds = new Set(branches.flatMap((b) => ((skin.roomPools || {})[b] || []).map((r) => r.id)));

  // Chains (D50): the desk derives its piles from the skin. An explicit
  // manifest must cover every fragment chain; without one the engine falls
  // back to first-appearance order (warn — names will be prettified ids).
  if (Array.isArray(skin.chains) && skin.chains.length) {
    const declared = new Set(skin.chains.map((c) => (typeof c === 'string' ? c : c.id)));
    skin.chains.forEach((c, i) => {
      const id = typeof c === 'string' ? c : c.id;
      if (!isStr(id)) err(`chains[${i}]: needs an id`);
      if (typeof c === 'object' && !isStr(c.name)) warn(`chains[${i}]: no display name (fallback: prettified id)`);
    });
    for (const f of skin.fragments || []) {
      if (isStr(f.chain) && !declared.has(f.chain)) err(`fragments: chain "${f.chain}" not in the chains manifest — its pile would never render`);
    }
  } else {
    warn('chains: no manifest — desk piles fall back to first-appearance order with prettified names');
  }

  // Fragments: the ambient archive
  const frags = skin.fragments || [];
  if (frags.length < FRAGMENT_MIN) err(`fragments: ${frags.length} (need ≥${FRAGMENT_MIN})`);
  const fragIds = new Set();
  const chains = new Set();
  frags.forEach((f, i) => {
    if (!isStr(f.id) || !isStr(f.title) || !isStr(f.body) || !isStr(f.hook)) err(`fragments[${i}]: needs id, title, body, hook`);
    if (f.id && fragIds.has(f.id)) err(`fragments: duplicate id ${f.id}`);
    fragIds.add(f.id);
    if (isStr(f.chain)) chains.add(f.chain);
    else err(`fragments[${i}]: needs chain`);
  });
  if (chains.size < 2) warn('fragments: fewer than 2 chains — the archive will read as one note pile');

  // Kit
  const kit = skin.kitItems || [];
  if (kit.length < KIT_MIN) warn(`kitItems: ${kit.length} (recommend ≥${KIT_MIN})`);
  kit.forEach((k, i) => {
    if (!isStr(k.id) || !isStr(k.name) || !isStr(k.body)) err(`kitItems[${i}]: needs id, name, body`);
    if (k.kind === 'key' && k.unlocks && !((skin.map || {}).shortcutRoutes || {})[k.unlocks]) {
      warn(`kitItems[${i}]: key unlocks "${k.unlocks}" but map.shortcutRoutes has no such route`);
    }
  });

  // Encounters
  const encs = skin.encounters || [];
  if (encs.length < ENCOUNTERS_MIN) warn(`encounters: ${encs.length} (recommend ≥${ENCOUNTERS_MIN})`);
  encs.forEach((e, i) => {
    if (!isStr(e.id) || !isStr(e.prompt) || !isArr(e.options, 2)) err(`encounters[${i}]: needs id, prompt, 2 options`);
  });

  // Session frame: the voice surfaces the engine reads every session
  const sf = skin.sessionFrame || {};
  if (!sf.brief || !isArr((sf.brief || {}).riggingLines, 1)) err('sessionFrame.brief.riggingLines: the brief has no voice');
  if (!sf.brief || !sf.brief.order || !isStr((sf.brief.order || {}).heading)) warn('sessionFrame.brief.order: no work-order form (plain fallback)');
  if (!sf.debrief || !isStr((sf.debrief || {}).script)) err('sessionFrame.debrief.script missing');
  if (!isArr(sf.restBeats, 3)) err('sessionFrame.restBeats: need ≥3 (the voice that fills rest windows)');
  else {
    const hasDefault = sf.restBeats.some((b) => !b.when || Object.keys(b.when).length === 0);
    if (!hasDefault) err('sessionFrame.restBeats: needs a default (empty when:{}) pool or rests go silent');
  }
  if (!sf.assessment || !isStr((sf.assessment || {}).outro)) warn('sessionFrame.assessment.outro missing (plain fallback)');
  for (const key of ['storm', 'dispatch', 'intention', 'nextTeasers']) {
    if (!sf[key]) warn(`sessionFrame.${key} missing (feature renders plain or hides)`);
  }
  if (!skin.bossCeremony || !isStr((skin.bossCeremony || {}).approach)) err('bossCeremony.approach missing (gate days have no ceremony)');

  // Map identity
  const map = skin.map || {};
  if (!isStr(map.stationName)) err('map.stationName missing');
  if (!map.wings || !isStr(map.wings[tree.id])) warn(`map.wings.${tree.id} missing (fallback: tree name)`);
  if (!map.silhouettes || Object.keys(map.silhouettes).length < slots.length / 2) warn('map.silhouettes: sparse — chambers render plain');

  // Keystones: triggers must reference real places
  (skin.keystones || []).forEach((k, i) => {
    if (!isStr(k.id) || !isStr(k.title) || !isStr(k.body) || !isStr(k.hook)) err(`keystones[${i}]: needs id, title, body, hook`);
    const t = k.trigger || {};
    if (!['first-boss-pass', 'boss-pass-count', 'sector-open'].includes(t.type)) err(`keystones[${i}]: unknown trigger type "${t.type}"`);
    if (t.type === 'sector-open' && !slots.includes(t.hookSlot)) err(`keystones[${i}]: sector-open hookSlot "${t.hookSlot}" not in the tree`);
    if (t.type === 'boss-pass-count' && !(t.n >= 2)) err(`keystones[${i}]: boss-pass-count needs n ≥ 2`);
  });
  if (!isArr(skin.keystones, 3)) warn('keystones: fewer than 3 — the spine is thin');

  // Live event + season + finale (optional systems, validated when present)
  if (skin.liveEvent) {
    const ev = skin.liveEvent;
    if (!isStr(ev.id) || !isArr(ev.beats, 2) || !ev.choice || !isArr((ev.choice || {}).options, 2) || !ev.document) {
      err('liveEvent: needs id, ≥2 beats, a 2-option choice, and a document');
    }
  } else warn('liveEvent missing — no present-tense scene (~week 3 anchor)');
  if (skin.season) {
    if (!isArr((skin.season || {}).episodes, 8)) err('season.episodes: need 8 titled weeks');
  } else warn('season missing — campaign runs without episode framing');
  if (skin.finale) {
    const fin = skin.finale;
    if (!isArr(fin.beats, 2) || !fin.choice || !isArr((fin.choice || {}).options, 2) || !fin.endings) err('finale: needs beats, choice, endings');
    else {
      const optIds = fin.choice.options.map((o) => o.id);
      for (const id of optIds) if (!fin.endings[id]) err(`finale: option "${id}" has no ending document`);
      if (!fin.choice.options.some((o) => o.requiresMast)) warn('finale: no option gated on the body (requiresMast) — the metroidvania statement is missing');
    }
  } else warn('finale missing — the season will not close');

  // Table texts (D51): without them the d100 rows speak in the engine's
  // neutral register — runs fine, reads thinner.
  if (!skin.tableTexts) warn('tableTexts: missing — dice rows use the engine\u2019s neutral lines');
  if (!skin.postingLabels) warn('postingLabels: missing — posted manifests use plain framing');

  // Reading budgets (GW-39): the gassed-reader law, enforced as warnings at
  // import (the reference world is held to ERROR in the test battery).
  const BUDGETS = [
    ['rest beat', (skin.sessionFrame || {}).restBeats ? skin.sessionFrame.restBeats.flatMap((b) => b.lines || []) : [], 35],
    ['scene line', ((skin.sessionFrame || {}).brief || {}).sceneLines ? skin.sessionFrame.brief.sceneLines.flatMap((b) => b.lines || []) : [], 45],
    ['fragment', (skin.fragments || []).map((f) => (f.body || '') + ' ' + (f.hook || '')), 130],
    ['keystone', (skin.keystones || []).map((k) => (k.body || '') + ' ' + (k.hook || '')), 150],
    ['trace', Object.values(skin.traces || {}), 32],
    ['quiet beat', skin.quietBeats || [], 75],
    ['ending', Object.values(((skin.finale || {}).endings) || {}).map((e) => (e.body || '') + ' ' + (e.hook || '')), 190]
  ];
  for (const [label, list, budget] of BUDGETS) {
    const over = list.filter((t) => String(t).trim().split(/\s+/).length > budget).length;
    if (over) warn(`reading budget: ${over} ${label}(s) over ${budget} words — gassed readers skim, then skip`);
  }

  // Traces reference real rooms
  for (const roomId of Object.keys(skin.traces || {})) {
    if (!allRoomIds.has(roomId)) warn(`traces: room id "${roomId}" not in any pool`);
  }
  for (const c of skin.caches || []) {
    if (!isStr(c.id) || !isStr(c.needs) || !isStr(c.locked) || !isStr(c.open)) err('caches: each needs id, needs, locked, open');
    else if (!kit.some((k) => k.id === c.needs)) err(`caches: "${c.id}" needs kit item "${c.needs}" which does not exist`);
  }

  // The law: no training content anywhere in the world.
  const hit = findTrainingLanguage(JSON.stringify(skin));
  if (hit) err(`chance-isolation: skin text contains training prescription language ("${hit}") — worlds decorate, the tree prescribes`);

  return { ok: errors.length === 0, errors, warnings };
}

// Summary line for the import preview.
export function skinSummary(skin, tree) {
  const branches = Object.keys(tree.branches);
  const rooms = branches.reduce((n, b) => n + (((skin.roomPools || {})[b]) || []).length, 0);
  return {
    name: skin.name || skin.id || 'unnamed',
    worldLine: skin.worldLine || '',
    fragments: (skin.fragments || []).length,
    keystones: (skin.keystones || []).length,
    rooms,
    kit: (skin.kitItems || []).length,
    episodes: ((skin.season || {}).episodes || []).length,
    endings: Object.keys(((skin.finale || {}).endings) || {}).length,
    voice: Object.values(skin.voices || {})[0] ? Object.values(skin.voices)[0].name : '—'
  };
}
