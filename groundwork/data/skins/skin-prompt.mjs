// ── Campaign generation prompt (creation pipeline, D12/D42) ──────────────────
// buildSkinPrompt(tree, brief) emits ONE paste-able prompt for any chat LLM.
// The LLM writes the WORLD; the engine owns the training. This file is the
// single source of the generation rules — never inline prompt content
// elsewhere (same doctrine as LiftRPG's prompt_rules.js).

const COUNTS = {
  rooms: 8, fragmentsPerChain: 4, chains: 4, kit: 10, encounters: 4,
  keystones: 5, quietBeats: 5, caches: 4, traces: 10
};

function treeFacts(tree) {
  const branches = Object.entries(tree.branches)
    .map(([id, b]) => `- branch "${id}" — ${b.name}: ${b.note}`).join('\n');
  const ladder = tree.tiers.map((t) =>
    `- hookSlot "${t.hookSlot}" (branch ${t.branch}): the exercise is "${t.name}"`).join('\n');
  const probes = Object.entries((tree.probes || {}).defs || {}).map(([id, p]) => {
    const t = tree.tiers.find((x) => x.id === p.tier);
    return `- probe "${id}": tests "${t ? t.name : p.tier}" — ${p.test}`;
  }).join('\n');
  return { branches, ladder, probes };
}

export function buildSkinPrompt(tree, brief) {
  const { branches, ladder, probes } = treeFacts(tree);
  const briefText = (brief || '').trim() || 'Author’s choice — surprise me, but commit fully to one world.';
  return `You are designing a complete campaign world for GROUNDWORK — a training game where a real
strength program IS the story's clock. The engine owns all training content (exercises, sets,
reps, rest). You own everything else: the place, the voice, the documents, the mystery.

CREATIVE BRIEF
${briefText}

THE FORM (read carefully — this is a found-world, not a plot)
- The player is a newcomer with a duty, alone-ish in a PLACE built around two "corridors" of
  physical work. A predecessor is gone and left the place deliberately arranged.
- The story is told through: a 3-card cold open; one line of voice per intake test; documents
  found during work (4 chains, delivered in order); authored keystone reveals at progress
  milestones; one present-tense live event (~week 3); 8 titled weekly episodes; a finale with
  a real choice and 3 endings. The player reads during REST WINDOWS — every text earns ~30
  seconds of attention, no more.
- TONE IS THE BRIEF'S, NOT YOURS. Cozy, comic, hopeful, pastoral, sporting, romantic, noir,
  dreadful — whatever the brief implies, commit to it. The structure above supplies all the
  mystery a metroidvania needs (locked doors, an absent predecessor, an unanswered question);
  do NOT add dread on top unless the brief asks for it. An overgrown greenhouse run by a
  cheerful ghost of good filing habits is as valid a world as a dead relay station.
- One speaking character: the VOICE. Derive its personality from the brief — a warm aunt who
  runs a tea house, a cheerful engineer, a gruff harbor master, a serene head gardener. Give
  it two or three consistent verbal habits and one thing it quietly cares about. Every line it
  speaks is prefixed with its NAME in caps, e.g. 'NAME: "..."'.
- REGISTER RANGE (this is what separates writing from caricature): most lines are plain,
  concrete, and human. Big atmospheric swings are rare and earned. Vary sentence length.
  At least a third of all documents and beats should contain something mundane, warm, or
  quietly funny — a kettle that takes nine minutes, an inventory joke, weather. If every
  line sounds momentous, the world reads as parody. Numbers beat adjectives; specifics beat
  mood. Hooks vary in temperature: some are questions, some are jokes that land later, some
  are just a name you don't know yet.
- Every document still ends on a HOOK (its own field) — a reason to come back, not
  necessarily a chill.
- Quality bar: a beloved indie module — specific, confident, rereadable — in whatever
  register the brief demands.
- THE LAW: never mention exercises, sets, reps, seconds of rest, or workout instructions in
  ANY text. The world mirrors effort thematically (weight, holding, climbing, patience) —
  it never prescribes it. Validation rejects skins containing rep/set language.

THE PLACE MUST MAP TO THIS STRUCTURE (the training tree — rename nothing here):
${branches}

Each hookSlot below is a SECTOR of the place (a room/zone the player works in for weeks).
Name each one as a location in your world (tierNames):
${ladder}

THE INTAKE is 4-5 adaptive PROBES (not a full ladder). Write one VOICE line per probe id for
intakeVoice — it should set the test in your world without prescribing numbers beyond what
the probe text states, and carry the voice's character:
${probes}

THE GRADES: the intake classifies the player (engine-side) as untrained / trained /
intermediate / advanced. Write "grades": one in-world RANK NAME and one VOICE line per class
(e.g. a commission grade, a guild rank). The line for "untrained" must make the bottom of the
map feel like the right place to start, never a judgment. Intermediate/advanced lines should
mention that their duty alternates heavy and light days and the doors ask for proof twice —
in-world language, no training numbers.

OUTPUT — one JSON object, no markdown fences, no commentary, exactly these keys:
{
  "id": "kebab-case-world-id",
  "name": "WORLD NAME",
  "version": "1.0.0",
  "worldLine": "One sentence of world-state shown under the title.",
  "voices": { "pull-voice": { "name": "VOICENAME", "register": "two-sentence character card", "ttsHint": { "style": "delivery note" } } },
  "tierNames": { "<every hookSlot above>": "Sector Name" },
  "intakeVoice": { "<every probe id above>": "VOICENAME: “one line for that probe”" },
  "grades": { "untrained": { "name": "RANK NAME", "line": "VOICENAME: “...”" }, "trained": {...}, "intermediate": {...}, "advanced": {...} },
  "intakeQuestions": { "recency": { "prompt": "in-world: when did you last train/serve?", "note": "one reassuring line", "options": [["never","label"],["years","label"],["recent","label"]] }, "age": { "prompt": "in-world age-bracket question", "note": "a bracket, never a birthdate", "options": [["u40","label"],["40s","label"],["55plus","label"]] } } — KEEP the option ids exactly as shown; the engine reads them,
  "coldOpen": [
    { "kind": "document", "title": "CARD 1 TITLE", "documentType": "form", "body": "the orders/letter that sent the player here (60-90 words)", "hook": "— signature line" },
    { "kind": "scene", "title": "CARD 2 TITLE", "body": "arrival; the place is deliberately stilled, not ruined (60-90 words)" },
    { "kind": "voice", "title": "CARD 3 TITLE", "body": "how the voice's channel opens (1-2 sentences)", "voiceLine": "VOICENAME: “first words; ends by pointing at the intake”" }
  ],
  "roomPools": { "<branch id>": [ ${COUNTS.rooms}+ rooms each: { "id": "unique-id", "name": "Room Name", "bias": "intel|loot|encounter|story", "desc": "one concrete sentence with personality, in the brief's register" } ] },
  "lockedDoors": [ 4 teases of OTHER wings of the place: { "name": "...", "requires": "...", "tease": "one sentence" } ],
  "fragments": [ ${COUNTS.chains} chains × ${COUNTS.fragmentsPerChain}+ docs, each { "id": "XX-01", "chain": "chain-id", "title": "...", "documentType": "fieldNote|correspondence|form|inspection|report|transcript", "body": "60-110 words", "hook": "one line" } — chains: the predecessor's official record; their private writing; the place's technical/working record with oddities; the outside-world/contact thread. Each chain reads in order and the LAST doc of each chain points at the finale.
  ],
  "kitItems": [ ${COUNTS.kit} items: { "id": "k-...", "name": "...", "kind": "tool|key|comfort|lore", "body": "one-two sentences", "unlocks": "(keys only) a shortcutRoutes id" } ],
  "encounters": [ ${COUNTS.encounters} beats: { "id": "enc-...", "prompt": "something is here, present tense", "options": [ { "label": "...", "result": "...", "award": { "type": "intel" } }, { "label": "...", "result": "...", "award": null } ] } ],
  "sessionFrame": {
    "brief": {
      "title": "WORK ORDER (or your world's term)",
      "sceneLines": [ pools with conditions, first-match-wins: { "when": { "firstSession": true }, "lines": ["..."] }, { "when": { "bossDay": true }, "lines": ["..."] }, { "when": { "postBossFail": true }, "lines": ["..."] }, { "when": {}, "lines": [3 lines] } ],
      "order": { "heading": "ORDER №{{orderNumber}}", "sub": "where the order form comes from", "rows": [["ROUTE", "{{wingName}} — {{sectorName}}"], ["ROOMS", "{{roomCount}} on the manifest"]], "gateRow": ["GATE", "{{gateLabel}} — posted at the door"], "foot": "A MOTTO." },
      "riggingLines": [ pools: { "when": { "firstSession": true, "learnMode": true }, "lines": ["..."] }, { "when": { "firstSession": true }, "lines": ["..."] }, { "when": { "learnMode": true }, "lines": ["..."] }, { "when": { "bossDay": true }, "lines": ["..."] }, { "when": {}, "lines": [3 lines] } ]
    },
    "debrief": { "title": "...", "script": "uses {{dayNumber}} {{roomsCleared}} {{lootSummary}} {{intelCount}} {{intelPlural}} {{bossLine}}", "bossPassLine": "...", "bossFailLine": "..." },
    "restBeats": [ 8-12 pools in priority order; conditions: kind:"crit"|"complication", outcome:"missed"|"partial" (+branch), streak:3, troughWindow+isFirstRoom (3 lines about the documented flat weeks — forecast it, normalize it), doorsOpenedAtLeast:2|4 +isFirstRoom +rollUnder:35 (the voice references {{doorsOpened}}), monthsAtLeast:1|2 similarly ({{months}}), isFirstRoom, postBossFail, and a FINAL default {} pool with 3 lines ],
    "deloadBeats": [ "one line for the light week" ],
    "tutorial": { "aarPrompt": "how the player self-checks form on a new movement (film one set, compare, file it) in your world's language" },
    "assessment": { "intro": "...", "outro": "..." },
    "intelDrop": "uses {{faultName}} {{sideQuestName}} {{sideQuestNote}}",
    "newMark": "personal-best line, uses {{amount}} {{unit}} {{tierName}} {{prev}} — real progress, stamped in-world",
    "newMarkFirst": "first-ever mark on a rig, uses {{amount}} {{unit}} {{tierName}}",
    "troughForecast": "a posted notice from the predecessor about weeks 3-6 feeling flat — forecasting it IS the intervention",
    "intention": { "prompt": "...", "afterLabel": "After (a daily event)", "afterPlaceholder": "...", "whereLabel": "At (where the bar lives)", "wherePlaceholder": "...", "display": "SCHEDULE — after {{after}}, at {{where}}." },
    "storm": { "button": "...", "intro": "minimum-dose day framing", "done": "...", "missCue": "never-miss-twice line" },
    "dispatch": { "title": "...", "intro": "trends not feelings", "frictionPrompt": "...", "goalPrompt": "...", "close": "..." },
    "nextTeasers": { "bossEligible": "uses {{bossDoor}}", "newFragment": "uses {{lastFragmentHook}}", "default": "uses {{focusRoom}}" }
  },
  "bossCeremony": { "approach": "uses {{doorName}} {{standard}} {{tease}}", "teases": { "default": "...", "<hookSlot of a major gate>": "a special tease" }, "beforeAttempt": "VOICENAME: “...”", "passReveal": "uses {{sectorName}}", "failReveal": "failure files knowledge, never shame" },
  "keystones": [ ${COUNTS.keystones} authored reveals: { "id": "KF-01", "chain": "keystone", "presentation": "document", "trigger": { "type": "first-boss-pass" }, ... }, one with { "presentation": "recontext", "trigger": { "type": "boss-pass-count", "n": 3 } } that REFRAMES everything mid-campaign, and 2-3 with { "type": "sector-open", "hookSlot": "<a real hookSlot>" } — the biggest on the sector whose exercise is the iconic milestone (e.g. the first full pull-up slot) ],
  "liveEvent": { "id": "live-...", "fireOnSession": 8, "title": "...", "beats": [3 present-tense beats — this HAPPENS NOW, unlike every found document], "voiceLine": "VOICENAME: “...”", "choice": { "prompt": "...", "options": [ { "id": "a", "label": "...", "result": "..." }, { "id": "b", "label": "...", "result": "..." } ] }, "document": { "id": "...", "chain": "<signal chain id>", "title": "...", "documentType": "transcript", "body": "...", "closings": { "a": "...", "b": "..." }, "hook": "..." } },
  "season": { "commissionLine": "COMMISSION: 8 weeks. ...", "episodes": [ 8: { "week": n, "title": "EPISODE TITLE", "line": "through-line sentence" } — week 5 is the posted light week; week 8 is the finale ], "overtime": { "title": "OVERTIME", "line": "..." }, "editorials": [ 2-3: { "week": n, "line": "VOICENAME disagreeing with the posted order — texture, never instructions" } ] },
  "finale": { "id": "finale-s1", "title": "...", "beats": [3], "choice": { "prompt": "...", "options": [ { "id": "act", "label": "the big irreversible act", "requiresMast": true, "lockedHint": "why the body is not ready yet (in-world)" }, { "id": "inherit", "label": "inherit the predecessor's way" }, { "id": "defer", "label": "record everything, decide nothing — the sequel hook" } ] }, "endings": { "act": {doc}, "inherit": {doc}, "defer": {doc} — each { "id": "END-1|2|3", "chain": "keystone", "title": "Ending — ...", "documentType": "...", "body": "120-160 words, lands the theme", "hook": "..." } }, "closing": "SEASON ONE — ... one line." },
  "quietBeats": [ ${COUNTS.quietBeats} pure-atmosphere rooms, 60-90 words each, no reward — the thing the rewards are for ],
  "echoFrames": { "<each chain id>": "one situating line for re-reading a page where it was written", "keystone": "..." },
  "caches": [ ${COUNTS.caches}: { "id": "cache-...", "name": "...", "needs": "<a kit item id>", "locked": "the want of the key (2 sentences)", "open": "the give (1-2 sentences, ends with a colon)" } ],
  "roomTypeLabels": { "sealed-cache": "...", "echo": "...", "quiet": "..." },
  "traces": { "<${COUNTS.traces} room ids from your pools>": "the predecessor's mark in that room — one sentence each; mix warm, funny, and curious" },
  "map": { "stationName": "...", "gateMeterLabel": "DOOR CHARGE (or your term)", "wings": { "${'pull'}": "This Wing's Name", "push": "...", "legs": "...", "core": "...", "handstand": "..." }, "shortcutRoutes": { "<route-id>": { "label": "...", "from": ["<branch>", index], "to": ["<branch>", index] } × 3 }, "silhouettes": {} }
}

CRAFT RULES (the difference between a world and a word salad)
1. ONE question, askable in one sentence, answered by the finale. Every chain circles it.
   The question's flavor follows the brief: it can be a wonder, a joke with a long fuse, or
   an ache — it does not have to be a dread.
2. The predecessor must be PRESENT through arrangement: things cleaned, labeled, left for
   the player. They can be charming, eccentric, beloved, exasperating — absence is not the
   same thing as haunting.
3. The midpoint recontext keystone must change what the player thinks the WORK is.
4. Hooks are promises: each one must eventually be kept by a later document or the finale.
5. Numbers beat adjectives. "Eleven watts, constant" beats "a strange power draw." Equally:
   "the kettle takes nine minutes" beats "time moved strangely here."
6. The live event and finale are PRESENT tense; everything else found is past tense.
7. Write the 8 episode titles LAST, as the season's table of contents.
8. The finale's locked option must make the player want next season's body, not feel cheated.
9. ANTI-CARICATURE CHECK before you output: reread your default rest-beat pool and your
   room descriptions. If more than half could be captioned "ominous", revise until the world
   also contains weather, meals, small repairs, and one genuinely funny line the voice would
   deny was a joke.

Return ONLY the JSON object.`;
}

export default buildSkinPrompt;
