  window.SCHEMA_HEADER = [
    '# LiftRPG Booklet Render Contract - Prompt Reference',
    '',
    'You are generating a complete LiftRPG booklet as a single JSON object.',
    'This prompt is for the core LiftRPG fiction mode: print-first, diegetic, and workout-fused without forcing explicit gym language into the story.',
    '',
    '## Top-Level Structure',
    '',
    'Always include these top-level keys:',
    '- `meta`',
    '- `theme`',
    '- `weeks`',
    '- `fragments`',
    '- `cover`',
    '- `rulesSpread`',
    '- `endings`'
  ];

  window.SCHEMA_META = [
    '## meta (object)',
    '',
    'Required fields:',
    '- `schemaVersion` (string): Always "1.5.0"',
    '- `generatedAt` (string): ISO 8601 datetime',
    '- `blockTitle` (string): Full story title',
    '- `blockSubtitle` (string): One-line official or diegetic designation',
    '- `worldContract` (string): One sentence. The north star for every story, mechanic, and visual choice. Write this first.',
    '- `narrativeVoice` (object): { person, tense, narratorStance, voiceRationale }. Do not default to second-person present tense. Choose the person and tense that best serves the fiction: first person for intimate or unreliable narrators, second person for procedural or instructional worlds, third limited for institutional distance.',
    '- `literaryRegister` (object): the per-book voiceSpec. { name, behaviorDescription, forbiddenMoves, typographicBehavior } plus the three fields that carry prose law:',
    '  * `mechanisms` (string[], 2-4): what this book\'s prose DOES, in selection terms. Never a vibe adjective, never a named author or work.',
    '  * `authorRegisters` (array of { author, records, omits, format }): one entry per named in-world author who writes more than one surface. Two documents by different authors must be tellable apart with the bylines removed.',
    '  * `licensedMoves` (array, 0-1 entries; zero is normal): { move, budget, rationale }. See the Voice Discipline section for the closed enum and the license rules.',
    '- `artifactIdentity` (object, required for shell-aware rendering): { artifactClass, artifactBlend?, authorialMode?, boardStateMode, documentEcology?, materialCulture?, openingMode?, rulesDeliveryMode?, revealShape?, unlockLogic?, shellFamily, attachmentStrategy, componentDialect }',
    '  * `componentDialect` (string, REQUIRED): CLOSED enum — "segments" (a bar or pie cut into wedges) | "beads" (a counted string) | "gauge" (a dial reading) | "tally" (marks scored in fives). How every clock, track and tick strip is DRAWN. Pick what this world would reach for to keep a count; it changes no geometry and no rule.',
    '- `weeklyComponentType` (string): One fiction-native non-semantic measurement family used across all non-boss weeks. It should feel like an operational residue or in-world key: a number, code, reading, tag, case ID, route marker, calibration value, or designation, never a plaintext letter.',
    '- `economy` (object): { currencyId, currencyLabel }. The single thing the workout pays out. Declared once here; every session markStrip earns it and every week reckoning spends it. Nothing else in the booklet is a tick currency.',
    '  * `currencyId` (string): the machine slug — lowercase, hyphen-separated, stable for the life of the booklet. Never printed on any page. Tooling cross-references it.',
    '  * `currencyLabel` (string): the printed name, in the world\'s own accounting language. It should be a noun this trade, house, office, watch, or congregation already counts — an operational residue with a ledger behind it, the same family of thing as `weeklyComponentType` but spendable. Never a game term bolted onto the fiction.',
    '  * ANTI-SAMENESS: the label must derive from THIS brief. A currency that could be lifted unchanged into any other booklet — Supply, Scrip, Credits, Points, Resolve, Favor — is a differentiation defect, not a safe default. If two booklets built from different briefs could plausibly share the name, it is the wrong name for both.',
    '- `structuralShape` (object): { resolution, temporalOrder, narratorReliability, promptFragmentRelationship, shapeRationale }.',
    '  * Resolution: "closed" (mystery solved), "open" (ambiguity persists), "shifted" (question changed), "costly" (resolved at a price), "full" (complete resolution), "partial" (some threads resolved), "ambiguous" (deliberately unclear).',
    '  * TemporalOrder: "chronological", "in-medias-res" (starts at crisis, flashes back), "rashomon" (contradictory overlapping timelines), "fragmented" (acausal memory), "linear" (strict forward), "reverse" (end-to-beginning), "parallel" (simultaneous threads).',
    '  * NarratorReliability: "reliable", "compromised" (knows but omits), "unreliable" (believes wrong things), "institutional" (voice of the system), "multiple" (several narrators), "shifting" (reliability changes over time).',
    '  * PromptFragmentRelationship: "fragments-deepen" (fragments add depth to prompts), "fragments-contradict" (fragments undermine prompt claims), "fragments-parallel" (fragments tell a parallel story), "fragments-precede" (fragments are chronologically earlier).',
    '  Choose values that create real structural consequences, not decorative labels.',
    '- `storySpine` (object, optional but strongly recommended): { premise, protagonistDrive, centralTension, midpointShift, finalCost }. Five sentences maximum total. This is your story anchor — refer back to it when writing every session prompt, fragment, and ending. It is not rendered but keeps the story coherent across a long generation.',
    '- `passwordEncryptedEnding` (string): Set to empty string `""`. Trusted tooling writes this after sealing the ending. Do not invent fake ciphertext. Always include this key.',
    '- `demoPassword` (string, optional): Only include for explicit demo fixtures.',
    '- `liftoScript` (string): Raw workout program pasted by the user',
    '(Note: `weekCount`, `totalSessions`, and `passwordLength` are injected by tooling after generation — do NOT include them in your output.)',
    '',
    'Forbidden:',
    '- Do not include `meta.passwordPlaintext` in normal output.',
    '- Do not include hidden planning notes in `meta`.'
  ];

  window.SCHEMA_THEME = [
    '## theme (object)',
    '',
    'Always include a theme object. The renderer supports these `visualArchetype` values only:',
    '- `pastoral`',
    '- `government`',
    '- `cyberpunk`',
    '- `scifi`',
    '- `fantasy`',
    '- `noir`',
    '- `steampunk`',
    '- `minimalist`',
    '- `nautical`',
    '- `occult`',
    '',
    'Theme fields:',
    '- `visualArchetype` (string): One supported archetype only',
    '- `palette` (object): { ink, paper, accent, muted, rule, fog }',
    '- `tokens` (object, optional): Use only to refine the chosen archetype, not to replace it',
    '',
    'Choose a visual archetype that matches the story world. Do not invent unsupported names like institutional, corporate, terminal, clinical, confessional, or literary.'
  ];

  window.SCHEMA_WEEKS_PRE = [
    '## weeks (array of objects)',
    '',
    'One object per week. Length must equal meta.weekCount.',
    '',
    'Each week requires:',
    '- `weekNumber` (integer): 1-indexed',
    '- `title` (string): Feels like a chapter title inside the world, not a workout label',
    '- `epigraph` (object): { text, attribution }',
    '- `isBossWeek` (boolean): True for the final week only',
    '- `weeklyComponent` (object): { type, value, extractionInstruction }. Type must match meta.weeklyComponentType on non-boss weeks. Value is non-semantic raw data, not a letter, and should feel like a collectable operational clue rather than arbitrary filler. Boss week value is null.',
    '- `sessions` (array, 3-6 items): Each session has { sessionNumber, label, exercises: [{ name, sets, repsPerSet, weightField?, notes? }], storyPrompt, fragmentRef?, markStrip?, binaryChoice?: { choiceLabel, promptA, promptB } }',
    '- `sessions[].markStrip` (object): the mid-workout tick strip. See the session.markStrip section below for the authored fields.',
    '- `reckoning` (object): the week-close conversion panel. See the week.reckoning section below.',
    '- `fieldOps` (object, required on non-boss weeks): contains mapState, cipher, oracleTable, and optional companionComponents',
    '- `bossEncounter` (object, required on boss week): replaces fieldOps',
    '- `overflow` (boolean): MUST be true when sessions.length > 3. This is a hard contract — the renderer uses it to build a Part 2 spread. Omitting it when sessions exceed 3 breaks page layout.',
    '- `overflowDocument` (foundDocument, REQUIRED when overflow is true): The Part 2 right-hand page. Must be a self-contained found document with all standard fragment fields (id, title, documentType, content, designSpec, etc.). This is a standalone document that appears alongside the overflow sessions — it is NOT a continuation of the session content. Treat it as another fragment, placed here for pacing.',
    '- `interlude` (object, optional): must contain { title, reason, body } and may also include payloadType, payload, spreadAware',
    '- `gameplayClocks` (array, optional): week-level progress clocks outside the oracle payload',
    '- `isDeload` (boolean, optional): tonal flag only',
    '- `fusionBeat` (object, REQUIRED): { beat, marking }. This week\'s FUSION SCORE, declared.',
    '  `beat` is one sentence: how this week\'s TRAINING texture IS this week\'s STORY texture.',
    '  Not what happens — how it FEELS the same. The deload is the exhale: a deload week that',
    '  reads as filler is a defect, so its beat is the aftermath, the letter, the count taken.',
    '  `marking` is a CLOSED five-step ordinal for prose VOLUME on this week\'s pages:',
    '  "quiet" | "spare" | "steady" | "full" | "loud". Counterpoint, do not double: the peak',
    '  load week wants the QUIETEST prose with the highest stakes; the deload wants the warmest',
    '  prose and the longest view. A book whose markings track the load curve is doubling.'
  ];

  // The board serves the verb, never decoration (§4 of the gameplay brainstorm).
  // Wave 3 added two geometries because two grammar families had no board at
  // all; the guardrail numbers below are quoted from SPATIAL_GUARDRAILS in
  // contracts/contract-constants.mjs and are parity-asserted by validate.mjs.
  window.SCHEMA_SPATIAL = [
    '### fieldOps.mapState',
    '- `mapType` (string): one of "grid" | "point-to-point" | "linear-track" | "player-drawn" | "concentric" | "maze"',
    '- `title` (string): diegetic heading',
    '- `floorLabel` (string, optional): deck, floor, wing, district, sector, or stratum label when it strengthens spatial identity',
    '- `mapNote` (string, optional): footer note',
    '- Shared states: "empty" | "cleared" | "locked" | "anomaly" | "current" | "inaccessible"',
    // COMPRESSED (D144, the compress-first rule): four lines lived here and
    // again, near-verbatim, in INST_MAPS_BOARD — "changing board state, not an
    // illustration", the denied-route/return-point pair, and the persist-with-a-
    // delta rule. The two sections ALWAYS travel together (SCHEMA_SPATIAL rides
    // week-final's `schemas` and the SCHEMA_SPEC bundle; INST_MAPS_BOARD rides
    // week-final's `instructions` and the INSTRUCTIONS bundle), so nothing lost
    // reach — the model was simply told the same four things twice in one
    // prompt. 359 characters recovered against the ceiling, and no doctrine
    // moved. If either section's routing ever diverges, restore them here.
    '',
    'GRID:',
    '- `gridDimensions`: { columns: 5-12, rows: 4-8 }',
    '- `tiles`: [{ col, row, type, label?, annotation? }] with route meaning, blocked movement, checkpoints, or discoverable annotations, not filler cells',
    '- `currentPosition`: { col, row }',
    '- `cellShape` (optional): "square" (default) | "hex". Hex reads as surveyed ground with six-way movement — charts, wilderness traverses, dig sites. Same tiles and dimensions either way. Choose hex when the player is CROSSING ground, not reading a floor plan; `topology.cellShape` decides once the plan declares one.',
    '',
    'POINT-TO-POINT:',
    '- `nodes`: [{ id, label, x, y, state }] — x and y MUST be integers in range 1–12 INCLUSIVE. Zero (0) and negative values are ILLEGAL and cause nodes to stack. Use the full 1–12 range.',
    '- `edges`: [{ from, to, label?, state? }]',
    '- `currentNode`: string',
    '- **HARD LIMITS: max 12 nodes, max 10 edges.** These are rendering limits — exceeding them causes layout overflow that cannot be resolved. Do NOT exceed them under any circumstances.',
    '- **Preferred node count: 5–7 per week.** This is the sweet spot for a half-letter page. 8+ nodes are dense; use only when the narrative demands a complex network. Fewer nodes with richer state changes are better than many nodes with simple labels.',
    '- **Coordinate spread requirement:** For maps with 6+ nodes, max(x) MUST be ≥ 9 and max(y) MUST be ≥ 7. No more than 2 nodes may share the same x value. No more than 2 nodes may share the same y value. Do NOT pack all nodes into a sub-range like 1–5.',
    '- **Label discipline:** Node labels are rendered in ~5pt monospace on a small page. Keep labels to 2–3 words (≤20 characters). Prefer short location names over full descriptive phrases. BAD: "Conclave Records Office West Annex". GOOD: "Records West". Edge labels (route names) should be even shorter: 1–2 words, ≤12 characters.',
    '- **Network growth across weeks:** Show progression via node `state` changes ("locked"→"empty"→"active"→"visited"), not by adding nodes beyond the 12 limit. Start with most nodes locked; open them as the story progresses.',
    '- `edgeSemantics` (optional): "traversal" (default) | "relational". Traversal means an edge is a way to get there. Relational is the constellation mode: the edge is a TIE between people, houses, or claims, and the board is a sociogram — a case-file web, a family tree, a correspondence map, a court alliance chart.',
    '- **RELATIONAL MODE:** node/edge shape is unchanged; only the reading changes. Edge `state` uses "strong" | "strained" | "severed" | "redrawn" instead of the access states, and each prints differently. The player verbs are strengthen, strain, sever, redraw — never travel. Do not mix relational and traversal edges on the same board.',
    '',
    'CONCENTRIC (approach rings — the siege board):',
    '- `rings`: [{ label, state, annotation? }] ordered OUTERMOST FIRST. The last ring is what the siege is about.',
    '- **Limits: 3-6 rings, ring labels max 18 characters.** Fewer than three rings is a target, not an approach; more than six and the innermost band is thinner than the pencil that marks it.',
    '- `currentRing` (integer, 1-based): which ring the player currently holds to. 1 is the outermost.',
    '- `breachMarks` (integer, 0-8, optional): how many write-in breach boxes print under the diagram. The pencil half of "mark breaches".',
    '- Player verbs: advance inward, hold or lose a ring, mark a breach. Week over week a ring changes state or the held ring moves — the topology itself does not.',
    '- Serves siege, observance, and heat: quarantine cordons, shrine precincts, siege works, blast radii, orbit charts.',
    '',
    'MAZE (corridor graph — the evasion board):',
    '- `nodes`: [{ id, label?, x, y, state }] where `state` is the topology ROLE: "junction" | "dead-end" | "door" | "entrance" | "goal". Node labels max 14 characters.',
    '- `passages`: [{ from, to, label?, state? }] where `state` is PROGRESS: "open" | "locked" | "hidden". Corridors print as right-angle runs; a locked passage prints a door bar the player crosses out when it opens.',
    '- **HARD LIMITS: max 12 nodes, max 14 passages.** Same x/y rules as point-to-point: integers 1-12 inclusive, spread across the range.',
    '- The role/progress split is the point: nodes say what the shape IS, passages say what has opened. Week over week, passages change state — the corridors do not move.',
    '- Player verbs: trace the path, mark dead ends, unlock doors. A discovered dead end is INTEL — it narrows the search. It never costs the player anything.',
    '- Serves evasion, attrition, and reconstruction: catacombs, archive stacks, hedge labyrinths, vent systems, a bureaucratic process rendered as corridors.',
    '',
    'LINEAR-TRACK:',
    '- `positions`: [{ index, label, state, annotation? }] should suggest route logic, pressure, or access stages rather than generic progress pips',
    '- `currentPosition`: number',
    '- `direction`: "horizontal" | "vertical"',
    '- Limits: 3-12 positions',
    '',
    'PLAYER-DRAWN:',
    '- `canvasType`: "dot-grid" | "graph-paper" | "hex-dot" | "blank"',
    '- `dimensions`: { columns: 8-16, rows: 6-12 }',
    '- `prompts`: [string] up to 4 and each prompt should reveal topology, access logic, or interpretive uncertainty over time',
    '- `seedMarkers`: [{ col, row, label }] up to 3 and each should feel purposeful enough to anchor exploration'
  ];

  window.SCHEMA_WEEKS_POST = [
    '### fieldOps.cipher',
    '- Shape: { type, title, body, noticeabilityDesign, extractionInstruction, characterDerivationProof }',
    '- `body` is an OBJECT, never a string. Shape: { displayText?: string, key?: string, workSpace?: object, referenceTargets?: string[] }',
    '  - `displayText`: the puzzle text shown to the player — **HARD LIMIT: 350 characters maximum.** The player must read this at a glance during a rest interval. If it needs more space, it is too complex.',
    '  - `key`: cipher key or lookup table (if applicable)',
    '  - `workSpace`: { style, rows?: number, cols?: number } — the writing surface printed under the puzzle',
    '  - `workSpace.style` is a CLOSED enum. Use exactly one of: "boxed-totals" | "lined" | "blank" | "cells". Any other string is not a style — it is silently replaced with "cells", and the surface you intended is not printed.',
    '    - "boxed-totals": grid of rows x cols digit boxes — use for numeric answers built column by column',
    '    - "lined": ruled pencil rows — use when the player writes words or a worked derivation',
    '    - "blank": one open ruled block, rows deep — use for free scratch work',
    '    - "cells": strip of small squares, one character each — use for letter-by-letter plaintext',
    '  - Never put instructions, worked examples, or prose in `style`. Those belong in `extractionInstruction` or `characterDerivationProof`.',
    '  - `referenceTargets`: array of fragment IDs or map labels for cross-reference puzzles',
    '- `extractionInstruction`: **HARD LIMIT: 200 characters maximum.** One or two sentences only.',
    '- `type` should name a specific technique such as substitution, reverse-alphabet, grid-filter, index-extraction, fragment-cross-reference, path-tracing, typographic-anomaly, numeric-sequence, contextual-question, or room-label-derivation',
    '- Ciphers yield fiction-native values only. The boss page handles value-to-letter decoding.',
    '- Cipher body displayText should present the puzzle cleanly — no "thinking out loud" about the method, no self-referential explanations of how to solve it.',
    '',
    '### fieldOps.oracleTable',
    '- REQUIRED on every non-boss week: it is the loop\'s variable reward. A week without one is rejected.',
    '- Shape: { title, instruction, mode, entries[] }',
    '- `mode` is optional metadata; if present prefer "fragment", "consequence", or "mixed"',
    '- Exactly 10 entries, roll bands "00-09", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80-89", "90-99" — each band exactly once. Entries numbered 1-10 are not a d100 table and are rejected.',
    '- Each entry: { roll: string, type: "fragment"|"consequence", text: string, paperAction?: string, fragmentRef?: string }',
    '- CRITICAL: the text field is called `text`, never `description` or `label`.',
    '- Fragment entries (type: "fragment") must include `fragmentRef` pointing to a real fragment ID.',
    '- Consequence entries must include `paperAction` that visibly changes the paper state (mark a clock, shade a node, cross off a route, etc.).',
    '- Oracle entries must be playable game consequences or concrete fiction events, not atmospheric vibes or prose descriptions.',
    '- If the user\'s creative direction specifies a different dice system (e.g. 2d6, d20), adapt oracle entries and roll bands to match.',
    '- If the booklet carries a `percentile-stat` companion, at least TWO weeks must state the roll-under check inside `instruction`: if the roll comes in under the stat value circled for this week, read the entry one band above the one rolled (one row toward 00-09). The same die does both jobs — never ask for a second roll.',
    '',
    '### fieldOps.companionComponents',
    'Array of 0-3 companion components per week. Each is an object with `type` plus type-specific fields.',
    'Supported component `type` values only:',
    // MENU SURFACE 1 of 2 (companionMenuParity() in validate.mjs): this shape
    // list must equal GENERATION_COMPANION_MENU exactly. `token-sheet` and
    // `overlay-window` were removed here by D122(c) — the pencil-only law. They
    // remain in VALID_COMPANION_TYPES so old books validate and render; they
    // are simply never offered again. Do NOT name them to the model, not even
    // as a prohibition: a named type is a reachable type.
    '- `dashboard`: { type, label, body, rows?, cols?, subtitle?, footprint? }',
    '- `usage-die`: { type, label, body, usageDie? }',
    '- `return-box`: { type, label, body, reminder? }',
    '- `inventory-grid`: { type, label, body, rows?, cols?, tokens? }',
    '- `stress-track`: { type, label, body, tracks?, conditions? }',
    '- `memory-slots`: { type, label, body, slots? }',
    '- `percentile-stat`: { type, label, body, statName, weeklyValues, advantageRule? }',
    '',
    '`percentile-stat` is the growing-stat d100 — one printed stat box whose value rises week by week:',
    '- `statName` (string, required): the stat itself, named from the Core Noun Roster and diegetic. It names a capability the world would actually track.',
    '- `weeklyValues` (integer[], required): one value per week of the campaign, each 1-99. They MUST rise monotonically — the printed stat never regresses.',
    '- `advantageRule` (string, optional): one sentence describing the re-roll earned by completing every prescribed set in a session.',
    '- Print ONE percentile-stat per booklet. It is a campaign-wide sheet, not a per-week surface.',
    '- The player circles the current week\'s value, then rolls the existing oracle d100 and reads under-or-over. No new dice.',
    '',
    'Common fields across all types:',
    '- `label` (string, required): diegetic title for the component',
    '- `body` (string, required): instruction or flavour text',
    '- `footprint` (string, optional): "half-page" (default) or "full-page"',
    '- `subtitle` (string, optional): secondary label',
    '- `reminder` (string, optional): short reminder note shown at bottom',
    '',
    '### session.markStrip',
    'The tick strip printed inside every session card, under the exercise table. It is the only thing the player touches mid-workout besides the rep boxes.',
    '- Shape: { targets: [{ label }] } — 3 to 5 targets, in the order they will be ticked.',
    '- `label` (string, required): the printed target, in this world\'s own language. HARD LIMITS: 5 words maximum, and NO DIGITS of any kind. A label with a number in it is asking the player to count, and counting is not a tick.',
    '- The strip prints on ONE line, so labels share it: at 3 targets a label may run 4-5 words; at 4 or 5 targets keep every label to 2-3 words or the print truncates them mid-word.',
    '- A target must be satisfiable by ONE pencil mark, decidable in ten seconds, with the booklet lying open at this page. If answering it needs arithmetic, a lookup, a choice, or a page turn, it is not a strip target.',
    '- Exactly ONE target per strip is the completion roll-up: the whole prescribed session done, ticked once. It is the rep-box row scored, never re-recorded. Do not ask the player to restate any number the exercise table already holds.',
    '- The remaining targets name what this session asked for beyond finishing it — a standard held, a record kept, a shortcut refused, a duty discharged — always phrased as this artifact would phrase it, never in the language of exercise science.',
    '- Ticked targets pay out `meta.economy.currencyLabel` and nothing else.',
    '- `id` and `kind` on each target are TOOLING-OWNED. Do not author them; tooling assigns and repairs them from the session\'s own exercises. Write labels only.',
    '',
    '### week.reckoning',
    'One panel per week, printed on the field-ops spread facing the session cards. The player totals the week\'s ticks here, converts them, and spends them. This is a sit-down surface, not a mid-workout one.',
    '- Shape: { conversion, sink: { kind, ref, instruction } }',
    '- `conversion` (string, required): ONE sentence, in the book\'s voice, stating what the week\'s ticks become. This sentence IS the rule and this panel is its only home — do not restate it on the rules spread.',
    '- `sink` (object, required): where the currency goes. It must be a surface THIS booklet actually prints, and it must already be printed by the week that spends into it.',
    '- `sink.kind` is a CLOSED enum. Use exactly one of: "map" | "companion" | "clock" | "oracle" | "notes". Any other string is not a sink — the panel prints a spend with nowhere to put it, and the currency leaks out of the booklet.',
    '- `sink.ref` (string, required): names the actual target inside this booklet — a map node or route label, a companionComponent label, a clockName, an oracle band, or the notes rail. A ref naming something the booklet never prints is a broken promise, exactly like a manifestPointer aimed at a missing fragment.',
    '- `sink.instruction` (string, required): one line, world-voiced, saying what the spend DOES to that surface — a mark made, a route opened, a slot filled, a band shifted. Never a menu of options, never a formula.',
    '- `threshold` on the boss week is TOOLING-OWNED and derived from what the weeks can actually pay out. Never author it, never state a number in prose, never imply what the bar is.',
    '',
    '### week.interlude',
    '- Required if present: `title`, `reason`, `body`',
    '- `reason` MUST reference specific terms from the worldContract or literaryRegister. It grounds the interlude in the fiction. Do not use generic phrasing \u2014 name characters, locations, or artifacts from the Core Noun Roster.',
    '- Optional: `payloadType`, `payload`, `spreadAware`, `manifestPointer`',
    '- Supported `payloadType` values ONLY (no others accepted):',
    '  "none" | "narrative" | "cipher" | "map" | "clock" | "companion" | "fragment-ref" | "password-element"',
    '  Do NOT use "fragment" (use "fragment-ref" instead). Do NOT invent new payload types.',
    '- When `payloadType` is "companion", `payload` MUST be an object: `{ "companionComponents": [{ "type": "...", ... }] }`',
    '- When `payloadType` is "map", `payload` MUST be an object: `{ "mapState": { "mapType": "...", ... } }`',
    '- When `payloadType` is "clock", `payload` MUST be an object: `{ "gameplayClocks": [{ ... }] }`',
    '- When `payloadType` is "fragment-ref", `payload` MUST be an object: `{ "fragmentRef": "F.XX", "action": "..." }`',
    '- When `payloadType` is "narrative" or "none", `payload` is a plain string or omitted.',
    '- Use interludes for discovered packets, route updates, partial instructions, fragment handoffs, password elements, or compact state shifts only when they materially change play.',
    '- `manifestPointer` (object, optional): a posted manifest — a diegetic forward reference this interlude prints. Shape: `{ "targetRef": "...", "postedAs": "..." }`',
    '  - `targetRef` (string, required): the surface being pointed at — a fragment id ("F.07") or a week reference ("W4"). It MUST exist and MUST come LATER in the booklet than the week this interlude sits in. A pointer to a missing or earlier surface is a broken promise and fails validation.',
    '  - `postedAs` (string, required): the one-line manifest as this artifact would print it, in the world\'s own filing voice (e.g. "LAST LOGGED: tide ledger — Week 4 survey").',
    '',
    '### week.gameplayClocks',
    '- Each clock: { clockName, segments, clockType, startValue?, direction?, linkedClockName?, opposedClockName?, thresholds?, consequenceOnFull }',
    '- Supported `clockType` values only:',
    '  "progress-clock" | "danger-clock" | "racing-clock" | "tug-of-war-clock" | "linked-clock" | "project-clock"',
    '',
    '### bossEncounter',
    '- Shape: { title, narrative, mechanismDescription, componentInputs, decodingKey, convergenceProof, passwordRevealInstruction, binaryChoiceAcknowledgement?: { ifA, ifB } }',
    '- `decodingKey`: { instruction, referenceTable }',
    '- `componentInputs` must match the prior weeklyComponent values in order. This is the',
    '  collection record and it is fixed in every convergence pattern — a pattern changes what',
    '  the player must UNDERSTAND about those values, never which ones are listed or in what',
    '  order (see Convergence Design).',
    '- `convergenceProof`: the worked proof, and what it must contain depends on the declared',
    '  `meta.artifactIntent.convergencePattern` — see Convergence Design.',
    '- The boss page reveals how raw values become letters for the first time'
  ];

  // ── The puzzle grids (W5b — the Ludic Harvest, tranche 2) ─────────────────
  // ROUTED TO week-final ONLY, and deliberately absent from SCHEMA_SPEC. The
  // single-prompt path runs hard against its own character ceiling (the floors
  // harness asserts it, and this section alone put it 1686 over), so this rides
  // the stage map exactly the way POINT_OF_USE / RETURN_LOOP / DOOR_BIAS do.
  // The consequence is stated rather than discovered: the paste path never
  // offers a puzzle grid, which is the honest trade — an optional new surface
  // is what a ceiling-bound prompt gives up first.
  window.SCHEMA_PUZZLES = [
    '### fieldOps.constrainedGrid (OPTIONAL — the deduction board)',
    'A logic grid or a nonogram whose completed state yields a code the economy reads. Emit one only on a week that wants a deduction beat; a booklet with none is a legitimate booklet. At most one per week.',
    '',
    'THE REFUSAL RULE, AND IT IS ABSOLUTE: a deterministic solver reads every grid before the week is accepted. It proves the puzzle has a solution, that it has EXACTLY ONE, and that the answer you declare is what the solved grid actually yields. Fail any of the three and the week is rejected with the defect quoted back to you. Do not emit a grid you have not solved yourself first.',
    '- `kind` (string, required): "logic-grid" | "nonogram" | "sudoku" | "kakuro" | "kenken". No other value is accepted — the dense crossword has no solver here yet and is refused.',
    '',
    'WHICH GRID, AND WHY. Five kinds is a shelf, not a list; pick the one whose PLAY matches the beat, and note what each one refuses to be.',
    '| Kind | Choose it when | It refuses |',
    '|------|----------------|------------|',
    '| `logic-grid` | The week is about WHO or WHICH — testimony, suspects, assignments, a matching that the fiction already cares about. The clues are sentences in the world\'s voice, so the puzzle carries prose. | Anything with no cast. It needs named entities the story owns. |',
    '| `nonogram` | The answer should be SEEN before it is read — a shape emerging from static, a signal resolving. Purely spatial; the letters are scattered in it. | Carrying story. Its clues are numbers and say nothing in the world\'s voice. |',
    '| `sudoku` | The week wants a long, quiet, self-checking grind with no fiction attached — a discipline the character performs. Difficulty scales cleanly with the load curve. | Meaning. A sudoku is content-free by construction, so it never advances the story on its own. |',
    '| `kakuro` | The world runs on ARITHMETIC the player should feel — accounts, rations, tallies, weights. The sums are diegetic numbers on a diegetic form. | Letters. Its answer is digits, so the lock it opens must want digits. |',
    '| `kenken` | You want a short arithmetic puzzle with visible STRUCTURE — cages the eye reads as regions, districts, cells, shifts. Small boards bite hard. | Length. Six on a side is the ceiling; it is a sharp beat, not a long sitting. |',
    'A book that prints the same kind on every week that carries a grid has chosen once and repeated the choice.',
    '- `title` (string, required): diegetic heading, as this world would label the surface.',
    '- `instruction` (string, optional): one or two lines telling the player what to do and how to read the answer off the finished grid. Never state the answer.',
    '- `answer` (string, required): the code the finished grid yields. It is NEVER printed — it is what the solver checks the puzzle against and what the seal or the assembly wants.',
    '- `answerFrom` (object, required): the machine-readable rule that derives the answer from the solution. See each kind below.',
    '',
    'LOGIC-GRID:',
    '- `subjects` (string[]): the rows — the entities being matched. **Limits: 3-5 subjects.** Distinct, and each label 22 characters or fewer.',
    '- `categories`: [{ name, values }] — one or two column groups, and `values` MUST have exactly as many entries as there are subjects. Each category is a one-to-one match: every subject holds exactly one value and every value is held by exactly one subject.',
    '- `clues`: [{ text, constraint }] — **2-12 clues.** `text` is the sentence the player reads, in this world\'s voice. `constraint` is the same fact in machine form, and the two MUST agree; the player solves from the text and the solver solves from the constraint.',
    '- `constraint.type` is a CLOSED enum of four: "is" | "not" | "same" | "differs".',
    '  "is"      { type, subject, category, value } — this subject holds this value.',
    '  "not"     { type, subject, category, value } — this subject does not hold it.',
    '  "same"    { type, category, value, otherCategory, otherValue } — whoever holds `value` also holds `otherValue`. Needs two categories.',
    '  "differs" { type, category, value, otherCategory, otherValue } — whoever holds `value` does NOT hold `otherValue`. Needs two categories.',
    '- Logic-grid `answerFrom.mode` is a CLOSED enum of two: "cell" | "initials". "cell" { mode, category, subject } reads that subject\'s value in that category; "initials" { mode, category } reads the first letters of that category\'s values down the subject list.',
    '- Build the solution FIRST, then write clues that force it, then check that no other arrangement survives them. A grid with two answers is the commonest failure and it is always caused by writing clues before fixing the solution.',
    '',
    'NONOGRAM:',
    '- `rowClues` / `colClues`: integer[][] — the run lengths for each row and each column, in order. **Limits: 5x5 to 10x10 cells.** The two clue sets describe the same picture, so their totals MUST be equal.',
    '- `letterGrid`: string[] — one string per row, one character per cell, and "." for a cell that carries no character. SPARSE ON PURPOSE: scatter a handful of letters or digits, some inside the picture and some outside it as decoys.',
    '- `answerFrom`: { mode: "grid-letters" } — the only mode. The answer is the characters in the SHADED cells, read left to right, top to bottom. A picture alone yields nothing a machine can check, so the letters are how a nonogram becomes a lock.',
    '- Draw the picture first, derive both clue sets from it, then place the letters so the shaded ones spell the answer.',
    '',
    'THE THREE FILLED GRIDS share one answer rule and it is the only one they accept. `answerFrom` is { mode: "cells", cells: [{ row, col }] } — name the cells to read and the order to read them in, 1-BASED from the top-left, and the digits found there are the key. Choose cells the solved grid actually fills; three to six of them is a key, twenty is a transcript.',
    '',
    'SUDOKU:',
    '- `boxWidth` / `boxHeight` (integers): the sub-block a digit may not repeat inside. The board is boxWidth x boxHeight on a side, so 2x2 gives a 4x4 board, 3x2 gives 6x6 and 3x3 gives the classic 9x9. **Limits: 4x4 to 9x9 boards.**',
    '- `givens`: string[] — one string per row, one character per cell, "." for a cell the player fills. Digits only, 1 up to the board size.',
    '- **At least 50% of the cells must be blank.** A grid printed with more givens than that is solvable, unique and still not a puzzle: it is finished by reading it.',
    '- Build the completed square first, then remove digits one at a time, checking after each removal that exactly one completion survives. Stop the moment a second appears.',
    '',
    'KAKURO:',
    '- `layout`: string[] — one string per row. "#" is a block cell, "." is a cell the player writes a digit in. **Limits: 5x5 to 9x9 cells,** counting the clue frame.',
    '- ROW 1 AND COLUMN 1 ARE ALL "#". A run\'s total is printed in the block cell above it or to its left, and the edge of the page cannot hold one.',
    '- `sums`: [{ row, col, down?, right? }] — 1-based coordinates OF A BLOCK CELL. `right` is the total of the across run starting in the next cell to the right; `down` is the total of the down run starting in the next cell below. Every run needs its total and every total needs its run.',
    '- Digits are 1-9, each used at most once WITHIN a run. **Every run is at least 2 cells and at most 9.** A one-cell run is a given wearing a total, and kakuro has no givens.',
    '',
    'KENKEN:',
    '- `size` (integer): the board is size x size and holds the digits 1 to size, each once per row and once per column. **Limits: 3 to 6 on a side.**',
    '- `cages`: [{ cells, operation, target }] — the cages must PARTITION the board: every cell in exactly one cage, no cell in two, none left over. **At most 4 cells per cage.**',
    '- `operation` is a CLOSED enum of five: "add" | "subtract" | "multiply" | "divide" | "fixed". The digits in a cage combine to its `target`.',
    '- "subtract" and "divide" are TWO-CELL ONLY and read larger-from-smaller, because with three cells the result would depend on an order the printed page does not show. "fixed" is a one-cell cage and simply gives that digit.',
    '- Build the Latin square first, then draw cages over it and read each target off the digits you already placed. Then check that no other square satisfies the same cages.',
    '',
    '### fieldOps.wordGrid (OPTIONAL — the letter hunt)',
    'A word search whose hidden words come from this book\'s own Core Noun Roster, never from a generic word list. Optional, at most one per week, and the same REFUSAL RULE governs it: the solver reads the grid you print, checks that every declared placement genuinely spells its word there, and checks that the answer rule genuinely produces the answer you declared.',
    '- `kind` (string, required): "word-search" is the only value; crisscross and dense crossword construction have no solver here yet and are refused.',
    '- `title` (string, required): diegetic heading. `instruction` (string, optional): what the player does and how the answer is read.',
    '- `grid`: string[] — one string per row, letters A-Z only, every row the same length. **Limits: 6x6 to 12x12 letters.**',
    '- `words`: [{ word, row, col, direction }] — **4-10 words**, each 3-12 letters. `row` and `col` are 1-BASED coordinates of the word\'s FIRST letter, counting from the top-left cell.',
    '- `direction` is one of "E" | "S" | "SE" | "NE" | "W" | "N" | "SW" | "NW". The last four read backwards or up; use them sparingly, they are what makes a board hard.',
    '- THE PLACEMENTS ARE THE ANSWER KEY AND ARE NEVER PRINTED. The page shows the board and the word list; the coordinates exist so the gate can prove the words are really there.',
    '- `wordGrid.answerFrom.mode` is a CLOSED enum of two: "leftovers" | "word". "leftovers" { mode } reads every letter no word covers, left to right, top to bottom. "word" { mode, index } names the 1-based position in the word list.',
    '- Place the words first, then fill every remaining cell. In "leftovers" mode those filler letters ARE the answer, in reading order, so count the uncovered cells before you choose what they must spell.',
    '',
  ];

  // Later: do not expand document families until we prove the current
  // set can carry threaded evidence, contradiction, and character depth.
  // Favor better fragment function over more fragment categories.
  window.SCHEMA_FRAGMENTS = [
    '## fragments (array of found documents)',
    '',
    'Use weekCount*2 to weekCount*3 fragments (e.g. 12-18 for a 6-week block). Prefer fewer, higher-quality fragments over volume. Mix 3-5 document families from the supported list below.',
    '',
    '**HARD CONSTRAINT — documentType:** `documentType` MUST be one of exactly these 8 values. No others are valid — do not invent custom types:',
    '- `memo` — internal institutional communications, official notices, administrative memos',
    '- `report` — sensor logs, technical analysis, monitoring outputs, data summaries',
    '- `inspection` — formal assessment documents, compliance evaluations, audit reports',
    '- `fieldNote` — informal handwritten observations, personal logs, margin notes',
    '- `correspondence` — letters, personal written communications, unsent drafts',
    '- `transcript` — voice recordings, meeting minutes, spoken-word transcriptions',
    '- `form` — structured forms, ledgers, registration documents, financial records',
    '- `anomaly` — anomalous findings, breach reports, unexplained events',
    '**Do NOT use:** "legal-filing", "personal-letter", "technical-report", "internal-memo", "financial-record", or any other invented type. Map every document concept to the nearest valid type above.',
    '',
    'Each fragment has:',
    '- `id` (string): pattern "F.N"',
    '- `title` (string): diegetic document title or subject line',
    '- `date` (string, optional): in-world date stamp',
    '- `documentType` (supported value only)',
    '- `inWorldAuthor` (string)',
    '- `inWorldRecipient` (string)',
    '- `inWorldPurpose` (string)',
    '- `content` (string)',
    '- `designSpec` (object): { paperTone, primaryTypeface, headerStyle, hasRedactions, hasAnnotations }',
    '- `authenticityChecks` (object): { hasIrrelevantDetail, couldExistInDifferentStory, redactionDoesNarrativeWork }',
    '- `manifestPointer` (object, optional): a posted manifest — a diegetic forward reference this document prints. Shape: `{ "targetRef": "...", "postedAs": "..." }`',
    '  - `targetRef` (string, required): the surface being pointed at — another fragment id ("F.07") or a week reference ("W4"). It MUST exist and MUST come LATER in the booklet than the week this fragment is delivered in. A pointer to a missing or earlier surface is a broken promise and fails validation.',
    '  - `postedAs` (string, required): the one-line manifest as this artifact would print it, in the world\'s own filing voice (e.g. "LAST LOGGED: tide ledger — Week 4 survey"). Never write it as an instruction to the player.',
    '- Across the full booklet, include at least three linked fragment functions: one action-changing artifact, one interpretation-changing artifact, and one character-deepening artifact.',
    '- At least one incident, place, procedure, or relationship should recur across multiple document perspectives.',
    '- Fragments may arrive as threaded packets, route updates, contradictory records, or personal aftershocks, not just isolated lore drops.',
    '- Every fragment MUST be referenced by at least one oracle entry (via fragmentRef), session prompt (via fragmentRef or by name), or cipher (via referenceTargets). If a fragment is never referenced, it should not exist.',
    '',
    'Do not force every booklet to use all document types. Variety matters, but chosen absence also creates identity.'
  ];

  window.SCHEMA_COVER_RULES = [
    '## cover',
    '- `title` (string): same as meta.blockTitle',
    '- `designation` (string)',
    '- `tagline` (string)',
    '- `subtitle` (string, optional): one-line diegetic subtitle',
    '- `colophonLines` (string[], 3-6 items)',
    '',
    '## rulesSpread',
    '- `leftPage`: { title, reEntryRule, sections: [{ heading, body }] }. Each section is an object with a `heading` string and a `body` string.',
    '- `rightPage`: { title, instruction }',
    '- One leftPage section must explain the play cadence in-world'
  ];

  window.SCHEMA_ENDINGS = [
    '## endings',
    '- Array of 1-3 plaintext endings',
    '- Each item: { variant, content, designSpec }',
    '- `content`: { documentType, body, finalLine }',
    '- `body` length: see Output Length Budgets. Write in paragraphs — that is where the renderer breaks a long ending.',
    '- `finalLine`: a single closing sentence or phrase that lands on the last page. Keep it short and resonant.',
    '- These are authored now; encryption happens later in trusted tooling'
  ];

  // Legacy alias: SCHEMA_TAIL = SCHEMA_COVER_RULES + SCHEMA_ENDINGS
  // Used by the single-prompt path (SCHEMA_SPEC) which needs all sections
  window.SCHEMA_TAIL = [].concat(SCHEMA_COVER_RULES, [''], SCHEMA_ENDINGS);

  window.SCHEMA_WEEK_PLAN = [
    '## weekPlan (object)',
    '- `weekNumber` (integer)',
    '- `title` (string)',
    '- `narrativeIntent` (string): 1-sentence summary of the focus',
    '- `mechanicSurfaces` (string[]): which diegetic mechanics apply',
    '- `requiredFragmentMentions` (string[]): fragment IDs to tease',
    '- `mapProgressionState` (string): brief note on how map shifts'
  ];

  window.SCHEMA_SINGLE_WEEK = [
    '## week (object)',
    'Generate exactly ONE week object.',
    '- `weekNumber` (integer): 1-indexed',
    '- `title` (string): chapter title inside the world',
    '- `epigraph` (object): { text, attribution }',
    '- `isBossWeek` (boolean)',
    '- `weeklyComponent` (object): { type, value, extractionInstruction }',
    '- `sessions` (array, 3-6 items): { sessionNumber, label, exercises: [{ name, sets, repsPerSet, weightField?, notes? }], storyPrompt, fragmentRef?, markStrip, binaryChoice?: { choiceLabel, promptA, promptB } }',
    '- `sessions[].markStrip` (object): { targets: [{ label }] } — 3-5 tick targets. See the session.markStrip section for the authoring law.',
    '- `reckoning` (object): { conversion, sink: { kind, ref, instruction } }. See the week.reckoning section.',
    '- `fieldOps` (object): mapState, cipher, oracleTable, companionComponents',
    '- `bossEncounter` (object): replaces fieldOps if boss week',
    '- `overflow` (boolean) and `overflowDocument` (foundDocument object)',
    '- `interlude` (object, optional)',
    '- `gameplayClocks` (array, optional)',
    '- `isDeload` (boolean, optional)',
    '- `fusionBeat` (object, REQUIRED): { beat, marking }. This week\'s FUSION SCORE, declared.',
    '  `beat` is one sentence: how this week\'s TRAINING texture IS this week\'s STORY texture.',
    '  Not what happens — how it FEELS the same. The deload is the exhale: a deload week that',
    '  reads as filler is a defect, so its beat is the aftermath, the letter, the count taken.',
    '  `marking` is a CLOSED five-step ordinal for prose VOLUME on this week\'s pages:',
    '  "quiet" | "spare" | "steady" | "full" | "loud". Counterpoint, do not double: the peak',
    '  load week wants the QUIETEST prose with the highest stakes; the deload wants the warmest',
    '  prose and the longest view. A book whose markings track the load curve is doubling.',
    '- `sessions[].microLines` (array, REQUIRED — at least ONE somewhere in this week, max 2 per session): { condition, cue, citeRef? }. See Point Of Use.',
    '  A week that prints no conditional micro-line is rejected. Deload weeks are exempt; every other week owes at least one.',
    '- `sessions[].returnBeat` (object, REQUIRED on EVERY session): { closingLine, openingEcho? }. See The Return Loop.',
    '  `closingLine` is required on every session. From week 2 onward `openingEcho` is required too — only week 1 has nothing to echo.',
    '- `sessions[].progressionTarget` (object, optional): { rule, targetLabel }. Both required together. See The Progression Target — omit the field when the program states no progression.',
    '- `doorChoice` (object): { label?, optionA: { label, lean }, optionB: { label, lean } }. See Door Bias.',
    '  REQUIRED on every non-boss, non-deload week when this booklet\'s `mechanicGrammarFamily` is one of the eight',
    '  pressure families (see Door Bias for the list). Optional — and welcome — for the reconstruction families.'
  ];

  window.SCHEMA_SINGLE_FRAGMENT = [
    '## fragment (object)',
    'Generate exactly ONE found document.',
    '- `id` (string): pattern "F.N"',
    '- `title` (string): diegetic document title or subject line',
    '- `date` (string, optional): in-world date stamp',
    '- `documentType` (supported value)',
    '- `inWorldAuthor` (string)',
    '- `inWorldRecipient` (string)',
    '- `inWorldPurpose` (string)',
    '- `content` (string)',
    '- `designSpec` (object): { paperTone, primaryTypeface, headerStyle, hasRedactions, hasAnnotations }',
    '- `authenticityChecks` (object): { hasIrrelevantDetail, couldExistInDifferentStory, redactionDoesNarrativeWork }',
    '- `citeRef` (object, optional): { targetRef, citedAs } — a citation at another surface. See Point Of Use.',
    '- `seal` (object, optional): { keyHint, unlockCondition } — a sealed cache opening on an EARLIER surface. See Sealed Caches.'
  ];

  window.SCHEMA_SINGLE_ENDING = [
    '## ending (object)',
    'Generate exactly ONE ending variant.',
    '- `variant` (string)',
    '- `content`: { documentType, body, finalLine }',
    '- `designSpec` (object): { paperTone, primaryTypeface }'
  ];

  // ── Skeleton Schema (Skeleton+Flesh pipeline) ──────────────────────────
  // Compact structural scaffold — no prose, just decisions and cross-refs.
  // One API call produces the entire planning layer; flesh calls fill content.
  window.SCHEMA_SKELETON = [
    '# Booklet Skeleton Schema',
    '',
    'Return a single JSON object with exactly this structure. Fill every field.',
    'This is the STRUCTURAL SKELETON only — no long prose, just decisions.',
    '',
    '## meta (object)',
    '- `blockTitle` (string): full story title',
    '- `blockSubtitle` (string): one-line diegetic designation',
    '- `worldContract` (string): one sentence — the governing tension that drives the entire booklet',
    '- `weeklyComponentType` (string): fiction-native measurement family (e.g., "gauge reading", "signal frequency")',
    '- `economy` (object): { currencyId, currencyLabel } — the one currency the workout pays out.',
    '  currencyId: machine slug, lowercase and hyphen-separated, never printed.',
    '  currencyLabel: the printed name, in this world\'s own accounting language — a noun the artifact already counts, derived from THIS brief and portable to no other booklet.',
    '- `narrativeVoice` (object): { person, tense, narratorStance, voiceRationale }',
    '- `literaryRegister` (object): { name, behaviorDescription, forbiddenMoves, typographicBehavior,',
    '    mechanisms: string[] (2-4, what the prose DOES in selection terms),',
    '    authorRegisters: [{ author, records, omits, format }] (one per named in-world author),',
    '    licensedMoves: [{ move, budget, rationale }] (0-1 entries; zero is normal) }',
    '- `structuralShape` (object): { resolution, temporalOrder, narratorReliability, promptFragmentRelationship, shapeRationale }',
    '  resolution: "closed"|"open"|"shifted"|"costly"|"full"|"partial"|"ambiguous"',
    '  temporalOrder: "chronological"|"in-medias-res"|"rashomon"|"fragmented"|"linear"|"reverse"|"parallel"',
    '  narratorReliability: "reliable"|"compromised"|"unreliable"|"institutional"|"multiple"|"shifting"',
    '  promptFragmentRelationship: "fragments-deepen"|"fragments-contradict"|"fragments-parallel"|"fragments-precede"',
    '- `storySpine` (object): { premise, protagonistDrive, centralTension, midpointShift, finalCost } — 5 sentences total',
    '- `artifactIdentity` (object): { artifactClass, shellFamily, boardStateMode, attachmentStrategy, componentDialect }',
    '  `componentDialect` is REQUIRED and is a CLOSED enum: "segments" | "beads" | "gauge" | "tally".',
    '  It is the instrument this book counts in — how every clock, track and tick strip is DRAWN.',
    '  segments: a pie or bar cut into wedges. beads: a counted string. gauge: a dial reading.',
    '  tally: scored marks in fives. Choose the one this world would actually use to keep a count;',
    '  it changes no geometry and no rule, only whose hand drew the instrument.',
    '  Plus optional: artifactBlend?, authorialMode?, documentEcology?, materialCulture?, openingMode?, rulesDeliveryMode?, revealShape?, unlockLogic?',
    '- `artifactIntent` (object, required): The compiled planning contract from the Artifact Intent Compiler.',
    '  Required fields:',
    '  - `briefMode` (string): how the brief was classified',
    '  - `fidelityMode` (string): literal | interpretive | compositional',
    '  - `arcFamily` (string): chosen arc family from the menu',
    '  - `mechanicGrammarFamily` (string): chosen mechanic grammar family from the menu',
    '  - `documentEcology` (object): { dominant: string[], forbidden: string[] }',
    '  - `exclusions` (object): { mechanicExclusions: string[], documentExclusions: string[], arcExclusions: string[] }',
    '  - `homePull` (string): story | game | investigation | mixed',
    '  - `convergencePattern` (string): the endgame shape — sequential-assembly | reordering | red-herring | dual-source',
    '  - `reading` (object): the recorded reading — your interpretation of the brief, written down.',
    '    { tone, register, povFrame, impliedSetting, emotionalArc, genreTemplate, ludicReading, briefEvidence }',
    '    All free strings in your own words; these are a record, not a menu.',
    '    ludicReading is 1-2 sentences: what KIND OF GAME this brief wants, in your words —',
    '    what the player is doing minute to minute, what they are spending, what they risk.',
    '    briefEvidence is 1-2 sentences naming the brief phrases that drove the reading.',
    '  - `selectionReason` (string): why the winning candidate reading beat the others.',
    '',
    '## theme (object)',
    '- `visualArchetype` (string): one of government|cyberpunk|scifi|fantasy|noir|steampunk|minimalist|nautical|occult|pastoral',
    '- `palette` (object): { ink, paper, accent, muted, rule, fog } — all valid 6-digit hex (#rrggbb)',
    '',
    '## cover (object)',
    '- `title` (string): same as meta.blockTitle',
    '- `designation` (string): diegetic file/project/case number',
    '- `tagline` (string): one-line hook',
    '- `subtitle` (string, optional)',
    '- `colophonLines` (string[]): 3-6 in-world provenance lines',
    '',
    '## weekPlan (array, length = weekCount)',
    'One entry per week. The final week MUST be the boss week.',
    '- `weekNumber` (integer, 1-indexed)',
    '- `title` (string): chapter title',
    '- `arcBeat` (string): 1-sentence narrative focus for this week',
    '- `epigraphText` (string): epigraph quote for this week',
    '- `epigraphAttribution` (string): attribution for the epigraph',
    '- `mapType` (string): grid|point-to-point|linear-track|player-drawn|concentric|maze',
    '- `cipherType` (string): the cipher technique name',
    '- `componentValue` (number|null): fiction-native value for password system (null for boss week)',
    '- `isBossWeek` (boolean): true ONLY for final week',
    '- `isDeload` (boolean): tonal flag for deload weeks',
    '- `isBinaryChoiceWeek` (boolean): true for the week containing the binary choice',
    '- `sessionCount` (integer): 3-6 sessions for this week',
    '- `fragmentIds` (string[]): IDs of fragments referenced in this week\'s sessions/oracles',
    '- `overflowFragmentId` (string|null): ID of overflow document if sessionCount > 3',
    '- `oracleMode` (string): "fragment"|"consequence"|"mixed"',
    '- `companionTypes` (string[]): companion component types for this week (0-3 items)',
    '- `clockNames` (string[]): gameplay clock names introduced or active this week',
    '- `hasInterlude` (boolean): whether this week has an interlude page',
    '',
    '## fragmentRegistry (array)',
    'One entry per found document. 12-30 fragments total.',
    '- `id` (string): pattern "F.N" (F.01, F.02, etc.)',
    '- `documentType` (string): memo|report|inspection|fieldNote|correspondence|transcript|form|anomaly',
    '- `inWorldAuthor` (string): who wrote this document in-world',
    '- `inWorldRecipient` (string): who received it',
    '- `title` (string): diegetic document title or subject line',
    '- `narrativePurpose` (string): 1-sentence description of what this fragment reveals or conceals',
    '',
    '## bossPlan (object)',
    '- `passwordWord` (string): the target password (all-caps, e.g., "HERON")',
    '- `decodingLogic` (string): how componentValues map to letters (e.g., "A1Z26: 1=A, 2=B, ..., 26=Z")',
    '- `convergenceRequirements` (string): what the boss encounter must reference from prior weeks',
    '- `binaryChoiceSetup` (string): what choice was offered and how the boss acknowledges both paths',
    '',
    '## endingVariants (string[])',
    'Array of 1-3 variant labels (e.g., ["canonical", "bittersweet"])'
  ].join('\n');

  // JSON example for the skeleton (used in prompt text for freeform providers)
  window.SKELETON_OUTPUT_EXAMPLE = JSON.stringify({
    meta: {
      blockTitle: '', blockSubtitle: '', worldContract: '',
      weeklyComponentType: '',
      economy: { currencyId: '', currencyLabel: '' },
      narrativeVoice: { person: '', tense: '', narratorStance: '', voiceRationale: '' },
      literaryRegister: {
        name: '', behaviorDescription: '', forbiddenMoves: '', typographicBehavior: '',
        mechanisms: ['', ''],
        authorRegisters: [{ author: '', records: '', omits: '', format: '' }],
        licensedMoves: []
      },
      structuralShape: { resolution: '', temporalOrder: '', narratorReliability: '', promptFragmentRelationship: '', shapeRationale: '' },
      storySpine: { premise: '', protagonistDrive: '', centralTension: '', midpointShift: '', finalCost: '' },
      // componentDialect is a closed enum, but it is left blank here for the
      // same reason theme.visualArchetype is: a filled-in sample of a choice
      // that carries the book's LOOK functions as an exemplar to copy, and
      // every booklet would then count in the same instrument.
      artifactIdentity: { artifactClass: '', shellFamily: '', boardStateMode: '', attachmentStrategy: '', componentDialect: '' },
      artifactIntent: {
        // `briefMode` and `fidelityMode` stay filled, and they are the only two
        // that do. Both CLASSIFY THE INPUT — how the brief arrived, and how
        // literally to take it — so a sample is a worked reading of a document
        // the model can check its own answer against. Every field below them
        // chooses what the BOOK IS, and a sample there is an exemplar.
        briefMode: 'sparse', fidelityMode: 'interpretive',
        // ── BLANK BY RULING (D144), and this is D47's own argument applied to
        // the fields that were exempted from it. The comment two blocks up
        // states the rule correctly for `componentDialect`: a filled-in sample
        // of a choice that carries the book's identity functions as an exemplar
        // to copy. These seven were filled anyway, and the values were the
        // measured convergence itself — `survey-grid`, `slow-burn-
        // investigation`, `sequential-assembly`, a dominant ecology of
        // fieldNote+report, and `grid` as the week-1 board. Every one is the
        // default the rest of this wave exists to break, printed in the one
        // place a freeform provider is told to IMITATE.
        //
        // The old rationale here claimed the opposite — "enum members are shown
        // because they are a closed menu" — which is exactly backwards: being a
        // closed menu is what makes a shown value an instruction. The blanks
        // still teach the SHAPE (which keys, which arrays, how many entries),
        // which is all an output example owes.
        arcFamily: '', mechanicGrammarFamily: '',
        documentEcology: { dominant: ['', ''], forbidden: [''] },
        exclusions: { mechanicExclusions: ['', ''], documentExclusions: [''], arcExclusions: [''] },
        homePull: '',
        convergencePattern: '',
        // The recorded reading is the model's own words, and a filled-in sample
        // would function as an exemplar to copy — the same bleed, one level
        // down.
        reading: {
          tone: '', register: '', povFrame: '', impliedSetting: '',
          emotionalArc: '', genreTemplate: '', ludicReading: '', briefEvidence: ''
        },
        selectionReason: '',
        // The two candidates that lost. `axis` is a closed menu, so it is
        // shown; the rest is the model's own words and stays blank for the
        // same D47 reason the reading does.
        _x: {
          rejectedReadings: [
            { axis: 'mechanicGrammarFamily', value: '', oneLiner: '' },
            { axis: 'arcFamily', value: '', oneLiner: '' }
          ]
        }
      }
    },
    theme: { visualArchetype: '', palette: { ink: '#000000', paper: '#ffffff', accent: '#000000', muted: '#888888', rule: '#cccccc', fog: '#eeeeee' } },
    cover: { title: '', designation: '', tagline: '', colophonLines: ['', '', ''] },
    // Same ruling as the artifactIntent block above (D144). `mapType: 'grid'`,
    // `oracleMode: 'mixed'` and `documentType: 'memo'` were each the measured
    // default of their own menu, printed in the shape a freeform provider is
    // told to imitate — and `memo` in particular is the document type
    // INST_SHELL_CHOICE now names out loud as "the one the model reaches for
    // when it has not decided". Structural values (`weekNumber`, `sessionCount`,
    // `componentValue`, the id patterns) stay: they teach the shape, and a shape
    // is what an output example is for.
    weekPlan: [
      { weekNumber: 1, title: '', arcBeat: '', epigraphText: '', epigraphAttribution: '',
        mapType: '', cipherType: '', componentValue: 1, isBossWeek: false, isDeload: false,
        isBinaryChoiceWeek: false, sessionCount: 5, fragmentIds: ['F.01'],
        overflowFragmentId: null, oracleMode: '', companionTypes: [], clockNames: [], hasInterlude: false }
    ],
    fragmentRegistry: [
      { id: 'F.01', documentType: '', inWorldAuthor: '', inWorldRecipient: '', title: '', narrativePurpose: '' }
    ],
    bossPlan: { passwordWord: '', decodingLogic: '', convergenceRequirements: '', binaryChoiceSetup: '' },
    endingVariants: ['canonical']
  }, null, 2);

  // Structured output schema for the skeleton (OpenAI json_schema format)
  // ── The play spine, as a structured stage literal (W5a) ───────────────────
  // ONE COPY, and the reason is a defect found on contact. W4a made the spine
  // REQUIRED in prose and BLOCKING at the floors, and put it in neither
  // structured literal — so a model answering under a compat transport was
  // asked for a field the transport's schema never mentioned, and under a
  // strict structured mode (where the transport injects additionalProperties:
  // false) the field it did emit would have been dropped before the floor ever
  // saw it. Every attempt would fail on a field nobody could deliver.
  //
  // Both pipelines reach this ONE object: STRUCTURED_SCHEMA_SKELETON below uses
  // it directly, and api-generator.js's STRUCTURED_SCHEMA_SHELL borrows it
  // through `window.STRUCTURED_SCHEMA_PLAY_SPINE` — the same window hop it
  // already uses for STRUCTURED_SCHEMA_SKELETON itself. A second hand-written
  // copy is the skeleton-triple defect with extra steps.
  //
  // `entry` is a plain string rather than an enum copy: the library menu is
  // already parity-asserted in the prose section above, a third copy would be a
  // third thing to drift, and the closure floor rejects a stray entry with a
  // message naming the whole library.
  var STRUCTURED_PLAY_SPINE = {
    type: 'object',
    properties: {
      composition: {
        type: 'array',
        items: {
          type: 'object',
          properties: { entry: { type: 'string' }, role: { type: 'string' } },
          required: ['entry', 'role']
        }
      },
      honestGaps: { type: 'array', items: { type: 'string' } },
      economyGraph: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            from: { type: 'string' }, to: { type: 'string' }, currency: { type: 'string' },
            branch: { type: 'string' },
            price: { type: 'integer' },
            closesAtWeek: { type: 'integer' }
          },
          required: ['from', 'to']
        }
      },
      consequenceEdges: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            source: { type: 'string' }, answeredBy: { type: 'string' },
            withinWeeks: { type: 'integer' }
          },
          required: ['source', 'answeredBy', 'withinWeeks']
        }
      },
      decisionLedger: {
        type: 'array',
        items: {
          type: 'object',
          properties: { fork: { type: 'string' }, differsBy: { type: 'string' } },
          required: ['fork', 'differsBy']
        }
      },
      tensionBudget: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            week: { type: 'integer' }, scarce: { type: 'string' },
            losable: { type: 'string' }, fallBehind: { type: 'string' }
          },
          required: ['week']
        }
      },
      difficultyCurve: {
        type: 'object',
        properties: {
          keyedToLoad: { type: 'boolean' }, shape: { type: 'string' },
          perWeek: { type: 'array', items: { type: 'string' } }
        },
        required: ['keyedToLoad', 'shape']
      },
      gateStructure: { type: 'string', enum: ['open', 'sequential', 'path-based'] },
      hintLadders: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            puzzle: { type: 'string' }, printedOn: { type: 'string' },
            // W5b: the band's printed heading. Required HERE (generation
            // policy) and optional in booklet-schema.mjs (the artifact
            // contract) — the artifactIntent severity split.
            label: { type: 'string' },
            rungs: {
              type: 'array',
              items: {
                type: 'object',
                properties: { cost: { type: 'string' }, gives: { type: 'string' } },
                required: ['cost', 'gives']
              }
            }
          },
          required: ['puzzle', 'printedOn', 'label', 'rungs']
        }
      },
      milestones: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' }, at: { type: 'integer' },
            unlocks: { type: 'string' }, printedOn: { type: 'string' }
          },
          required: ['label', 'at', 'unlocks', 'printedOn']
        }
      },
      legacyMoves: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            move: {
              type: 'string',
              enum: ['cross-out-forever', 'permanent-map-mutation', 'standing-rule-unlock',
                'sealed-by-honour', 'session-count-gate']
            },
            printedOn: { type: 'string' }, makesPermanent: { type: 'string' }
          },
          required: ['move', 'printedOn']
        }
      },
      // Which harvest patterns this book composed with (D144). OPTIONAL like
      // the three arrays above — declaring none is legal — but DECLARED IS
      // BUILT: the adoption floor reads each declared pattern back off the
      // artifact, so this list is a promise rather than a label.
      //
      // A plain string array rather than an enum copy, and that is `entry`'s
      // precedent above rather than laziness: the menu is already stated to the
      // model in the harvest table and parity-asserted both directions, a third
      // copy here would be a third thing to drift, and the floor rejects a
      // stray id with a message naming the whole menu.
      harvestPatterns: { type: 'array', items: { type: 'string' } }
    },
    // The DEMANDED half. The three harvest arrays are absent on purpose: a book
    // need not carry a hint ladder, and requiring one would tax every brief for
    // a pattern most do not want. `honestGaps` IS required, empty-array and all
    // — "nothing is missing" said out loud is the record; skipping the key is
    // not the same statement.
    required: ['composition', 'honestGaps', 'economyGraph', 'consequenceEdges',
      'decisionLedger', 'tensionBudget', 'difficultyCurve', 'gateStructure']
  };
  window.STRUCTURED_SCHEMA_PLAY_SPINE = STRUCTURED_PLAY_SPINE;

  window.STRUCTURED_SCHEMA_SKELETON = {
    type: 'object',
    properties: {
      meta: {
        type: 'object',
        properties: {
          blockTitle: { type: 'string' }, blockSubtitle: { type: 'string' },
          worldContract: { type: 'string' }, weeklyComponentType: { type: 'string' },
          // The markStrip economy declaration (Session 1). currencyId is the
          // stable machine handle for future cross-references; currencyLabel is
          // the only half that ever prints.
          economy: {
            type: 'object',
            properties: { currencyId: { type: 'string' }, currencyLabel: { type: 'string' } },
            required: ['currencyId', 'currencyLabel']
          },
          narrativeVoice: {
            type: 'object',
            properties: { person: { type: 'string' }, tense: { type: 'string' }, narratorStance: { type: 'string' }, voiceRationale: { type: 'string' } },
            required: ['person', 'tense', 'narratorStance']
          },
          literaryRegister: {
            type: 'object',
            properties: {
              name: { type: 'string' }, behaviorDescription: { type: 'string' },
              forbiddenMoves: { type: 'string' }, typographicBehavior: { type: 'string' },
              // voiceSpec: the prose contract (docs/voice/VOICE.md). mechanisms
              // state what the prose DOES; authorRegisters carry the multi-hand
              // law; licensedMoves is the declared, budgeted genre exception.
              mechanisms: { type: 'array', items: { type: 'string' } },
              authorRegisters: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    author: { type: 'string' }, records: { type: 'string' },
                    omits: { type: 'string' }, format: { type: 'string' }
                  },
                  required: ['author', 'records', 'omits', 'format']
                }
              },
              licensedMoves: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    move: { type: 'string', enum: ['aphorism', 'direct-address', 'fragment-rhythm', 'ominous-closer'] },
                    budget: { type: 'string' }, rationale: { type: 'string' }
                  },
                  required: ['move', 'budget', 'rationale']
                }
              }
            },
            required: ['name', 'behaviorDescription', 'mechanisms', 'authorRegisters']
          },
          structuralShape: {
            type: 'object',
            properties: { resolution: { type: 'string' }, temporalOrder: { type: 'string' }, narratorReliability: { type: 'string' }, promptFragmentRelationship: { type: 'string' }, shapeRationale: { type: 'string' } },
            required: ['resolution', 'temporalOrder']
          },
          storySpine: {
            type: 'object',
            properties: {
              premise: { type: 'string' },
              protagonistDrive: { type: 'string' },
              centralTension: { type: 'string' },
              midpointShift: { type: 'string' },
              finalCost: { type: 'string' }
            },
            required: ['premise', 'protagonistDrive', 'centralTension', 'midpointShift', 'finalCost']
          },
          artifactIdentity: {
            type: 'object',
            properties: {
              artifactClass: { type: 'string' },
              // ── The shell and the board, ENUM-CONSTRAINED (D144) ─────────
              // componentDialect below is the template, and the argument is the
              // same one: an unbounded `type: 'string'` on a closed enum lets a
              // compat transport accept anything, so the only thing steering the
              // answer was a menu the prompt did not carry. Now the prompt
              // carries one (INST_SHELL_CHOICE Step 7a) and the transport
              // enforces it, which is what makes the choice a choice rather than
              // a default. Quoted rather than imported for the reason every enum
              // in this file is: prompt_rules.js is a classic browser script and
              // cannot import contract-constants.mjs. `shellMenuParity()` in
              // validate.mjs diffs both literals against the enums, both
              // directions, so a family added there is enforced here or the
              // build fails.
              shellFamily: {
                type: 'string',
                enum: ['field-survey', 'classified-packet', 'ship-logbook', 'witness-binder',
                  'court-packet', 'devotional-manual', 'household-archive', 'technical-manual']
              },
              boardStateMode: {
                type: 'string',
                enum: ['survey-grid', 'node-graph', 'timeline-reconstruction', 'testimony-matrix',
                  'ledger-board', 'route-tracker', 'profile-assembly', 'player-drawn']
              },
              attachmentStrategy: { type: 'string' },
              // Teeth Round F2. Required HERE by generation policy for the same
              // reason the recorded reading is: this literal is what a compat
              // transport enforces, and an optional bounded choice is a choice
              // the model skips. booklet-schema.mjs keeps it optional — the
              // corpus predates the field and must not move.
              componentDialect: { type: 'string', enum: ['segments', 'beads', 'gauge', 'tally'] }
            },
            required: ['artifactClass', 'shellFamily', 'boardStateMode', 'attachmentStrategy', 'componentDialect']
          },
          artifactIntent: {
            type: 'object',
            properties: {
              briefMode: { type: 'string', enum: ['explicit', 'sparse', 'empty', 'mashup', 'reference-led', 'personal-subject'] },
              fidelityMode: { type: 'string', enum: ['literal', 'interpretive', 'compositional'] },
              arcFamily: { type: 'string', enum: ['slow-burn-investigation', 'institutional-collapse', 'witness-accumulation', 'contamination-spiral', 'procedural-deepening', 'pilgrimage-approach', 'false-order-to-rupture'] },
              mechanicGrammarFamily: { type: 'string', enum: ['survey-grid', 'node-graph', 'timeline-reconstruction', 'testimony-matrix', 'ledger-board', 'route-tracker', 'profile-assembly', 'heat', 'attrition', 'siege', 'stewardship', 'loyalty-web', 'evasion', 'observance', 'rivalry'] },
              documentEcology: {
                type: 'object',
                properties: {
                  dominant: { type: 'array', items: { type: 'string' } },
                  forbidden: { type: 'array', items: { type: 'string' } }
                },
                required: ['dominant', 'forbidden']
              },
              exclusions: {
                type: 'object',
                properties: {
                  mechanicExclusions: { type: 'array', items: { type: 'string' } },
                  documentExclusions: { type: 'array', items: { type: 'string' } },
                  arcExclusions: { type: 'array', items: { type: 'string' } }
                },
                required: ['mechanicExclusions', 'documentExclusions', 'arcExclusions']
              },
              homePull: { type: 'string', enum: ['story', 'game', 'investigation', 'mixed'] },
              // The endgame's shape (Wave 2). Same two-stance split as the
              // reading below: required here because generation policy demands
              // a declared pattern, optional in booklet-schema.mjs because no
              // corpus fixture carries an artifactIntent at all.
              convergencePattern: { type: 'string', enum: ['sequential-assembly', 'reordering', 'red-herring', 'dual-source'] },
              // The recorded reading (§10.1). Required HERE by generation
              // policy — this literal is the machine-enforced contract handed
              // to the transport, and an optional reading is a reading the
              // model skips. The artifact schema keeps it optional; the two
              // stances are deliberate, not drift (see booklet-schema.mjs).
              reading: {
                type: 'object',
                properties: {
                  tone: { type: 'string' },
                  register: { type: 'string' },
                  povFrame: { type: 'string' },
                  impliedSetting: { type: 'string' },
                  emotionalArc: { type: 'string' },
                  genreTemplate: { type: 'string' },
                  // The game-kind reading (W4a). Required here for the same
                  // reason every sibling is: this literal is what a compat
                  // transport enforces, and an optional reading is a reading
                  // the model skips.
                  ludicReading: { type: 'string' },
                  briefEvidence: { type: 'string' }
                },
                required: ['tone', 'register', 'povFrame', 'impliedSetting', 'emotionalArc', 'genreTemplate', 'ludicReading', 'briefEvidence']
              },
              selectionReason: { type: 'string' },
              // The triptych's audit trail (Wave 2). `_x` is the schema's
              // declared extension namespace, so this shape is enforced HERE
              // and stays permissive in booklet-schema.mjs — the artifact
              // contract has no opinion on what a pipeline leaves in `_x`,
              // while generation policy needs the rejected readings to be
              // machine-comparable. A string[] of one-liners could not be
              // checked for axis difference; this can.
              _x: {
                type: 'object',
                properties: {
                  rejectedReadings: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        axis: { type: 'string', enum: ['mechanicGrammarFamily', 'arcFamily', 'povFrame'] },
                        value: { type: 'string' },
                        oneLiner: { type: 'string' }
                      },
                      required: ['axis', 'value', 'oneLiner']
                    }
                  }
                },
                required: ['rejectedReadings']
              }
            },
            required: ['briefMode', 'fidelityMode', 'arcFamily', 'mechanicGrammarFamily', 'documentEcology', 'exclusions', 'homePull', 'convergencePattern', 'reading', 'selectionReason', '_x']
          },
          playSpine: STRUCTURED_PLAY_SPINE
        },
        required: ['blockTitle', 'blockSubtitle', 'worldContract', 'weeklyComponentType', 'economy', 'narrativeVoice', 'literaryRegister', 'structuralShape', 'storySpine', 'artifactIdentity', 'artifactIntent', 'playSpine']
      },
      theme: {
        type: 'object',
        properties: {
          visualArchetype: { type: 'string', enum: ['government', 'cyberpunk', 'scifi', 'fantasy', 'noir', 'steampunk', 'minimalist', 'nautical', 'occult', 'pastoral'] },
          palette: {
            type: 'object',
            properties: { ink: { type: 'string' }, paper: { type: 'string' }, accent: { type: 'string' }, muted: { type: 'string' }, rule: { type: 'string' }, fog: { type: 'string' } },
            required: ['ink', 'paper', 'accent', 'muted', 'rule', 'fog']
          }
        },
        required: ['visualArchetype', 'palette']
      },
      cover: {
        type: 'object',
        properties: {
          title: { type: 'string' }, designation: { type: 'string' }, tagline: { type: 'string' },
          subtitle: { type: 'string' },
          colophonLines: { type: 'array', items: { type: 'string' } }
        },
        required: ['title', 'designation', 'tagline', 'colophonLines']
      },
      weekPlan: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            weekNumber: { type: 'integer' }, title: { type: 'string' }, arcBeat: { type: 'string' },
            epigraphText: { type: 'string' }, epigraphAttribution: { type: 'string' },
            mapType: { type: 'string', enum: ['grid', 'point-to-point', 'linear-track', 'player-drawn', 'concentric', 'maze'] },
            cipherType: { type: 'string' },
            componentValue: {}, isBossWeek: { type: 'boolean' }, isDeload: { type: 'boolean' },
            isBinaryChoiceWeek: { type: 'boolean' }, sessionCount: { type: 'integer' },
            fragmentIds: { type: 'array', items: { type: 'string' } },
            overflowFragmentId: {}, oracleMode: { type: 'string', enum: ['fragment', 'consequence', 'mixed'] },
            companionTypes: { type: 'array', items: { type: 'string' } },
            clockNames: { type: 'array', items: { type: 'string' } },
            hasInterlude: { type: 'boolean' }
          },
          required: ['weekNumber', 'title', 'arcBeat', 'mapType', 'cipherType', 'isBossWeek', 'sessionCount', 'fragmentIds']
        }
      },
      fragmentRegistry: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' }, documentType: { type: 'string' },
            inWorldAuthor: { type: 'string' }, inWorldRecipient: { type: 'string' },
            title: { type: 'string' }, narrativePurpose: { type: 'string' }
          },
          required: ['id', 'documentType', 'inWorldAuthor', 'title', 'narrativePurpose']
        }
      },
      bossPlan: {
        type: 'object',
        properties: {
          passwordWord: { type: 'string' }, decodingLogic: { type: 'string' },
          convergenceRequirements: { type: 'string' }, binaryChoiceSetup: { type: 'string' }
        },
        required: ['passwordWord', 'decodingLogic', 'convergenceRequirements']
      },
      endingVariants: { type: 'array', items: { type: 'string' } }
    },
    required: ['meta', 'theme', 'cover', 'weekPlan', 'fragmentRegistry', 'bossPlan', 'endingVariants']
  };

  // ── Knowing Schema (the knowing stage — §11 Wave 1.5) ───────────────────
  // The supply side of VOICE.md §7's funding rule. The roster says who and
  // what exists; THIS says how their world actually works, authored once as
  // structured material every prose stage selects from.
  //
  // PARITY: the four category names are mirrored in
  // STRUCTURED_SCHEMA_KNOWING below and in `meta.processParticulars` in
  // contracts/booklet-schema.mjs. validate.mjs (knowingParticularsParity)
  // anchors both prompt surfaces on the booklet schema — a category added to
  // one surface alone is an ERROR, not a silent hole.
  window.SCHEMA_KNOWING = [
    '# Process Particulars Schema',
    '',
    'Return a single JSON object with exactly this structure.',
    '',
    '## processParticulars (object)',
    '- `instruments` (array of strings): the tools, devices, and measures of this trade',
    '  and what the people who use them actually call them — the working name, not the',
    '  catalogue name. Include what each one reads, in what unit, and its ordinary failure.',
    '- `paperworkRealities` (array of strings): what form gates what access; what gets',
    '  signed, countersigned, filed, stamped, held, or refused; who may refuse it and on',
    '  what grounds; where a copy goes and how long it is kept.',
    '- `orderOfOperations` (array of strings): the sequence this trade or institution',
    '  actually runs in. What happens first. What cannot happen until something else does.',
    '  What gets skipped when there is no time, and what that costs later.',
    '- `periodSpecifics` (array of strings): period, regional, and material specifics the',
    '  brief implies — what things are made of, what they cost, how long they take, what',
    '  everyone in this world knows without being told. Omit this array entirely if the',
    '  brief implies no period or place; a guessed century is worse than none.',
    '',
    'Every entry is ONE fact, stated flat, in a single line. Not a paragraph, not a',
    'sentence with a flourish, not an observation about what a fact means.',
    'Aim for 6-10 instruments, 6-10 paperworkRealities, 5-8 orderOfOperations.'
  ];

  // Structured output schema for the knowing stage (OpenAI json_schema format).
  // `periodSpecifics` is deliberately NOT required: a brief that implies no
  // period must be allowed to say so by omission rather than by invention.
  window.STRUCTURED_SCHEMA_KNOWING = {
    type: 'object',
    properties: {
      processParticulars: {
        type: 'object',
        properties: {
          instruments: { type: 'array', items: { type: 'string' } },
          paperworkRealities: { type: 'array', items: { type: 'string' } },
          orderOfOperations: { type: 'array', items: { type: 'string' } },
          periodSpecifics: { type: 'array', items: { type: 'string' } }
        },
        required: ['instruments', 'paperworkRealities', 'orderOfOperations']
      }
    },
    required: ['processParticulars']
  };

  // ── Canonical workout (§11 Wave 5) ───────────────────────────────────────
  // The canonicalization stage's output: a pasted Liftoscript program read into
  // the structure the pipeline already consumes. This stage writes NO prose and
  // invents NO training — it is a transcription with a grammar behind it.
  //
  // The field names are load-bearing beyond this prompt: they are the shape
  // `normalizeCanonicalWorkout()` (generator/modules/liftosaur.js) maps into
  // the normalized-workout RICH branch, which in turn is what the topology
  // digest reads. Renaming one here without renaming it there returns the rich
  // branch to being decorative.
  window.SCHEMA_CANONICAL_WORKOUT = {
    type: 'object',
    properties: {
      weeks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            weekNumber: { type: 'integer' },
            isDeload: { type: 'boolean' },
            sessions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dayLabel: { type: 'string' },
                  notes: { type: 'string' },
                  exercises: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        sets: { type: 'integer' },
                        repsPerSet: { type: 'string' },
                        weightField: { type: 'string' },
                        notes: { type: 'string' }
                      },
                      required: ['name', 'sets', 'repsPerSet']
                    }
                  }
                },
                required: ['dayLabel', 'exercises']
              }
            }
          },
          required: ['weekNumber', 'sessions']
        }
      },
      progressionSummary: { type: 'string' }
    },
    required: ['weeks']
  };

  window.SCHEMA_SPEC = [].concat(
    SCHEMA_HEADER, [''],
    SCHEMA_META, [''],
    SCHEMA_THEME, [''],
    SCHEMA_WEEKS_PRE, [''],
    SCHEMA_SPATIAL, [''],
    SCHEMA_WEEKS_POST, [''],
    SCHEMA_FRAGMENTS, [''],
    SCHEMA_TAIL
  ).join('\n');

  // Phase-1 default: stay generator-first.
  // Defer API/chat generation split, new payload enums, new map types,
  // and true new-affordance progression until the current prompt
  // reliably produces cohesive, render-clean booklets.

  // THE DERIVATION LAW (W3 corrective wave, F05). The recorded reading SPLITS
  // by field: `tone` and `briefEvidence` quote the brief and stay faithful,
  // while `register` and `genreTemplate` — the two that CLASSIFY — arrived
  // institutional on briefs that supplied no institution. The proof case is A1
  // (evals/w3-matrix/register-table.json): a decaying repertory theatre, masks,
  // understudies, an escape room; tone recorded as "elegant, ornate, sinister;
  // fin-de-siecle decadence", register recorded as "institutional-formal prose"
  // and genreTemplate as "institutional gothic mystery". Nothing in that brief
  // supplied the word. The lens inserted it, and every document, character and
  // mechanic chosen downstream inherited it.
  //
  // The law lives HERE rather than at the compiler's Step 10 because this
  // section fixes the signals and Step 10 only writes them down; both ride the
  // shell stage and the single-prompt bundle, in this order, so the two-word
  // tie-ins at Step 10 always resolve against a law the model has already read.
  window.INST_BRIEF_INTERPRETATION = [
    '## Brief Interpretation (run silently before everything else)',
    'Before writing any fields or world contract, decode the creative direction brief. Do not output this step.',
    '',
    'If the brief is a MASHUP (X meets Y, X + Y, like X but with Y):',
    '- Identify the genre, tone, emotional register, and defining conventions of each element separately.',
    '- Find the creative tension between them — the interesting collision, not the safe middle ground.',
    '- Example: "Oldboy meets Project Hail Mary" → Oldboy (psychological revenge thriller, identity horror, shocking reversal, claustrophobic) + Project Hail Mary (optimistic hard sci-fi, isolation, alien contact, problem-solving under pressure) → the collision: a protagonist solving an impossible problem who discovers the mission itself was designed as punishment for something they did. The optimism of competence meets the horror of complicity. The "alien contact" is the person they wronged.',
    '- The creative tension IS the story. Do not average the two elements into something neither. Honor the dissonance.',
    '',
    'If the brief contains a NAMED PERSONAL CHARACTER (a real pet, a family member, a named person in the user\'s life):',
    '- That character is real and specific. Center the story around them literally, not metaphorically.',
    '- A named pet implies: POV close to that character, tone scaled to their nature, the world experienced through their frame.',
    '- Example: "my yorkie Jasper goes back to Turkey where he\'s from and has an existential crisis and comes home" → Jasper is real. Turkey is real. The existential crisis (identity, origin, belonging) is the emotional spine. The homecoming is the resolution. The story IS this arc, not a metaphor for it.',
    '- Do not abstract or universalize what is personal and specific.',
    '',
    'If the brief names a FILM, BOOK, GAME, SHOW, or CULTURAL REFERENCE:',
    '- Extract its defining genre conventions, emotional register, protagonist type, and structural shape.',
    '- Use those as your primary creative template, not as decoration or surface texture.',
    '- An LLM should know these works. If you know them, use what you know. If a reference is obscure, treat the name as a tone signal and infer from surrounding context.',
    '',
    'After interpreting the brief, fix these design signals internally (do not output them):',
    '- TONE: the emotional register (dark, hopeful, comedic, melancholic, tense, wondrous, intimate, etc.)',
    '- REGISTER: the prose style (literary, pulp, intimate, procedural, whimsical, etc.)',
    '- POV CHARACTER: who experiences this story (named person, animal, institution, unnamed protagonist, etc.)',
    '- IMPLIED SETTING: where and when — specific place if named, composite if implied',
    '- EMOTIONAL ARC: what changes for the protagonist emotionally by the end',
    '- GENRE TEMPLATE: what genre conventions apply (revenge thriller, sci-fi isolation, coming-of-age, road trip, etc.)',
    '',
    '',
    'DERIVATION LAW for REGISTER and GENRE TEMPLATE, the two signals that CLASSIFY: each must be',
    'traceable to words the brief actually contains — name the phrase, silently, before you fix the',
    'signal. Absent an institutional referent in the brief (a bureau, academy, ministry, department,',
    'any body that runs on procedure), classifying either signal as institutional is a MISREAD, and it',
    'misfunds every document, character and mechanic chosen downstream. A world can be formal, ornate,',
    'sinister or rule-bound without being an institution.',
    'THE ONE EXCEPTION: institutional may be one DECLARED HALF of a contrast the brief\'s own words',
    'support, when `briefEvidence` names both halves. A collision you argued for is a reading; a',
    'classification nothing in the brief asked for is not.',
    '',
    'These extracted signals own the story. The design bias in the prompt owns the game mechanics. They do not compete.',
    'Brief interpretation overrides: storyLens, characterWeb, secretShapes, arcMoves from the design bias.',
    'Design bias PROPOSES: mapType, puzzleFamilies, pressureClocks, scarcitySurfaces, documentTypes.',
    'The map geometry is DERIVED from the mechanic grammar family — where the two disagree the family',
    'wins, and selectionReason says so.'
  ];

  window.INST_OUTPUT_RULES = [
    '## Output Rules',
    '- Return valid JSON only. No markdown fences, no explanation, no comments.',
    '- The JSON must parse with JSON.parse().',
    '- Use only renderer-supported vocabulary for theme archetypes, document types, companion component types, interlude payload types, clock types, and map types.',
    '- Do not include literal newlines inside string values — encode them as \\n.',
    '- Do not use trailing commas in objects or arrays.',
    '- All internal double-quotes inside string values must be escaped as \\".',
    '- Never leave arrays or objects unclosed. Complete every structure before ending the response.',
    '- If nearing the output token limit, shorten prose fields (storyPrompt, fragment content, interlude body, endings) rather than omitting required structure.',
    '- Before outputting, silently verify the response would pass JSON.parse(). If it would not, fix it first.'
  ];

  // Every line here is about a field the SHELL authors — `theme` and the two
  // `meta.password*` fields. The endings-array line that used to close this
  // section now lives in INST_ENDINGS_PLAINTEXT below, because this section is
  // stage-routed and that line was landing on stages that author no endings
  // array at all (D128).
  window.INST_CONTRACT_GUARDRAILS = [
    '## Contract Guardrails',
    '- Always include a `theme` object.',
    '- Do not invent `meta.passwordEncryptedEnding`. Leave it empty or omit it; trusted tooling seals the ending later.',
    '- Do not include `meta.passwordPlaintext` unless this is an explicit demo fixture and the user asked for it.'
  ];

  // ROUTING, not a new rule: this is the sentence lifted out of
  // INST_CONTRACT_GUARDRAILS, put where it is true (D128).
  //
  // Exactly one live surface authors the plaintext `endings` ARRAY: the
  // single-prompt whole-booklet path, which is the one that carries
  // SCHEMA_ENDINGS. No STAGE_SCHEMA_MAP stage does — the multi-stage `ending`
  // stage writes ONE variant per call (its own SCHEMA_SINGLE_ENDING slice says
  // "Generate exactly ONE ending variant"), and the S+F bundled-endings builder
  // carries FLESH_ENDINGS_BUNDLE_SPEC instead of routing through the map. So
  // this section is joined into INSTRUCTIONS and routed to no stage.
  //
  // Routed to the single-ending stage, it cost a bench book six attempts: the
  // model was told to author an array by one half of its prompt and one object
  // by the other, and answered with an envelope that satisfied neither.
  window.INST_ENDINGS_PLAINTEXT = [
    '## Plaintext Endings',
    '- Author the plaintext `endings` array now. Tooling will encrypt later.'
  ];

  // PARITY: every number quoted here is OUTPUT_BUDGETS in
  // contracts/contract-constants.mjs, and validate.mjs (outputBudgetParity)
  // asserts the two agree. They are no longer advice — a breach is BLOCKING at
  // the week, fragment, and ending stages, so a cap stated here that differs
  // from the cap enforced there spends a whole retry on an instruction the
  // model already followed.
  window.INST_OUTPUT_BUDGETS = [
    '## Output Length Budgets',
    'CAPS, in characters — the page\'s limit, not caution\'s. Fill the surface; over a cap costs a retry.',
    'Full means SET, never crammed: a wall of text fails, and so does an empty page.',
    '- `storyPrompt`: 220 per session prompt.',
    '- Fragment `content` (any body field): 1050 — three fill an archive page.',
    '- `interlude.body`: 700 — it owns a page, but shares it with the payload.',
    '- `ending.content.body`: 2400, target 1600–2200. Longer bodies split on paragraph breaks.',
    '- `markStrip` target `label`: 28 (the five-word law). Prints on ONE line: a long label truncates mid-word, it does not wrap.',
    '- `microLines[].condition`: 90. `microLines[].cue`: 120.',
    '- `returnBeat.closingLine` and `returnBeat.openingEcho`: 140 each.',
    '- `doorChoice.optionA.lean` / `optionB.lean`: 90 each.',
    '- `citeRef.citedAs`: 90. `seal.keyHint`: 120. `seal.unlockCondition`: 140.',
    '- Depth goes into a document, never into the pile: minimum COUNTS, full length.',
    '- Avoid quoted dialogue unless it materially advances story or game state.'
  ];

  window.INST_BRIEF_FIDELITY = [
    '## Brief Fidelity',
    'The user\'s creative direction brief is the primary authority on tone, register, and premise — weight it above the design profile defaults.',
    '- If the brief is playful, whimsical, or comedic (e.g. "a chair fights a bookcase"), produce a story that matches that register. Do not add institutional complexity, hidden layers, or found-document gravity the brief did not ask for.',
    '- If the brief is literal, take it literally first before reaching for metaphor or subtext.',
    '- If the brief is minimal or abstract, treat its simplicity as permission to be simple. Use the design profile for structure, but do not elevate stakes or setting complexity beyond what the brief implies.',
    '- If the brief names a specific genre (adventure, romance, horror, comedy), that genre is the story even if the design profile points elsewhere.',
    '- The four-layer world, found-document fragments, and institutional character webs are defaults, not requirements. A playful or simple brief can have a two-layer world and a straightforward cast.',
    '- Do not interpret brevity in the brief as an invitation to add depth the user did not ask for. A short brief means stay close to what was said.',
    '- The design bias is a structural scaffold. The brief is the voice. Never let the scaffold drown the voice.'
  ];

  window.INST_WORLD_CONTRACT = [
    '## World Contract & Core Noun Roster',
    '- Write `meta.worldContract` before anything else. This is your bible.',
    '- Inside the `worldContract` string, you MUST define a **Core Noun Roster**: a list of 8-12 fiercely specific people, places, departments, and objects.',
    '- EVERY single cipher, map node, fragment, boss mechanism, and oracle entry MUST explicitly reference at least one item from the Core Noun Roster.',
    '- Do not invent stray lore later. If a noun is important enough to be a puzzle solution or a map endpoint, it must be established in the roster.',
    '- This creates extreme holistic continuity. The world must feel airtight and relentlessly cross-referenced.'
  ];

  window.INST_STORY_ENGINE = [
    '## Story Engine First, Then JSON',
    '- Before writing fields, determine your story engine: genre/tone, layered setting, protagonist role, core want, core need, flaw, wound, relationship web, antagonist pressure, secret, midpoint shift, darkest moment, resolution mode, recurring object, recurring place, recurring motif.',
    '- Capture the essential arc in `meta.storySpine` (5 sentences max: premise, protagonist drive, central tension, midpoint shift, final cost). This is your anchor — refer back to it when writing every session prompt, fragment, and ending.',
    '- The week prompts, fragments, rules spread, boss page, and endings must all feel like consequences of the same story engine.'
  ];

  window.INST_ENVIRONMENT = [
    '## Rich Environment',
    '- Match environmental depth to the brief:',
    '  * Complex/serious brief: four layers (public, working, hidden, historical).',
    '  * Medium brief: three layers (public, working, hidden OR historical).',
    '  * Light/comedic/simple brief: two layers (surface and one surprise underneath). Do not force institutional complexity the brief did not ask for.',
    '- Even a bland building, office, clinic, dam, station, depot, or archive can be compelling if the labor, wear, jurisdiction, rumor, and buried history are specific.',
    '- Define 8-12 world-native nouns early and reuse them across prompts, fragments, map labels, and interface labels.',
    '- Give the world material specificity: one recurring smell, one recurring sound, one recurring object, one recurring bureaucratic or folk phrase.'
  ];

  // THE BETRAYAL ARENA (W3 corrective wave, F05). The serious branch used to
  // demand "one structural/institutional betrayal" — a MANDATE, on the branch
  // most briefs land in, naming one arena. It is doctrine reach, not model
  // habit: the register table (evals/w3-matrix/register-table.json) shows two
  // maximally divergent briefs classified institutional in `register` and
  // `genreTemplate` while their `tone` fields stayed faithful. A1 is the proof
  // case — a decaying repertory theatre, masks, understudies, no institutional
  // referent anywhere in the brief, read as "institutional gothic mystery".
  //
  // So the arena becomes a MENU parameterized by the brief's own register, with
  // institutional as one option among peers. Menu, not worked example (D47): a
  // single filled-in betrayal would install one house cast in every book, which
  // is the disease this wave exists to treat.
  window.INST_CHARACTER_WEB = [
    '## Character Web & Ideological Contradictions',
    '- Do not define characters by functional tropes (e.g., "the hacker", "the mentor"). Define them by their emotional dependencies and ideological contradictions.',
    '- Every major NPC must have a worldview that structurally challenges or opposes the protagonist, but remains utterly sympathetic or unavoidable.',
    '',
    'Scale character depth to match the brief:',
    '- **Complex/serious brief:** Name 4-6 recurring characters in the Core Noun Roster. Include at least one intimate dependency, one structural betrayal, one unstable alliance, and one absent/ghostly shadow over the cast. At least 3 fragments should be authored by named ideological rivals. At least one character must radically change stance or be tragically recontextualized by the final third.',
    '  That betrayal has an ARENA — artistic, communal, commercial, familial, scientific, spiritual, institutional, or another this brief names. Troupes and households have structures to betray too. Take the arena the brief supplies; `institutional` is a peer on that list, never the default.',
    '- **Medium brief:** Name 2-3 recurring characters with opposing worldviews. Include at least one dependency and one betrayal or alliance. At least 2 fragments authored by named characters.',
    '- **Light/comedic/simple brief:** 1-2 characters with clear motivation and one relationship that changes. No mandatory betrayal or institutional complexity. At least 1 fragment authored by a named character.',
    '',
    '- Use named characters consistently across storyPrompts, fragments, and interludes at whatever depth the brief demands.'
  ];

  // THE BOSS AXIS (W3 corrective wave, F05). The boss line's middle term was
  // "institutional knowledge", stated CONJUNCTIVELY and on no branch at all —
  // so it bound comedies, pastorals and household stories equally, and it rides
  // three stages (layer-codex, week-final, ending). The darkest-moment line
  // below already branches on register; this one did not, which is why it was
  // the reach that survived every light-brief guard in the file.
  //
  // Now: the axis is TYPED by the book's own register (a menu), and the whole
  // line branches — a light brief owes mastery of ITS world, not an
  // institution's. Menu discipline is D47's: shapes, one clause each, no
  // worked culmination.
  window.INST_LAYERED_ARC = [
    '## Layered Arc',
    '- Build a real arc, not just clue accumulation.',
    '- At least one week should recontextualize earlier evidence instead of merely adding another clue.',
    '- The midpoint must change interpretation, not just raise stakes.',
    '- Shape the tension curve explicitly:',
    '  Early weeks: establishment, constraint, first mystery, first relationship.',
    '  Midpoint: binary choice that recontextualizes prior evidence AND costs a relationship.',
    '  Late weeks: convergence, darkest moment (relational or ethical cost), escalation.',
    '  Boss week: culmination that tests spatial mastery, deep knowledge of this world, and relationship stakes.',
    '  TYPE that middle axis to this world\'s own register — institutional, scholastic, artisanal, communal, territorial, devotional, or whatever procedure it actually runs on. A light, comic or domestic block tests mastery of ITS world and owes no institution at all.',
    '  These are POSITIONS in the block, not week numbers. A short block compresses them; a long block gives each phase more weeks, and every added week still owes its own beat.',
    '- Unless the block is intentionally comic or the brief signals a lighter register, the darkest moment must cost the protagonist something they cannot recover: a relationship damaged, a belief overturned, an ethical line crossed, or an institutional protection lost.',
    '- The ending must acknowledge the binary choice, the boss outcome, and at least one relationship consequence.'
  ];

  window.INST_WORKOUT_FUSION = [
    '## Workout-Story Fusion (Metaphoric Translation)',
    '- Fuse the workout to the story structurally and emotionally by mapping the physical exertion type onto narrative hardship.',
    '- Use this exact translation matrix to interpret the physical effort over the week or session:',
    '  * **Heavy Low-Rep (Strength):** Crushing environmental pressure, inevitable slow-moving threats, bearing a literal or psychological burden, immovable obstacles.',
    '  * **High-Volume Hypertrophy (8-15 reps):** Attrition, swarm tactics, exhausting repetitive labor, wading through thick resistance, drowning.',
    '  * **Sprints / High Heart Rate:** Frantic evasion, racing against an immediate running clock, dwindling oxygen, panic, unstable footing.',
    '  * **Long Zone 2 / Steady State:** Paranoia, vast distances, slow depletion of resources, eerie quiet before a storm, tracking or being tracked.',
    '  * **Deload / Recovery:** False safety, painful memory surfacing, treating wounds, studying the map, discovering a horrifying truth in the quiet.',
    '- Identify the dominant physical modality in the raw workout and apply its metaphor translation strictly to the `storyPrompts`. Only use literal gym terminology if the theme demands it.',
    '- **CRITICAL: Every session MUST have a non-empty exercises array.** Transcribe the user\'s workout exactly — name, sets, repsPerSet, weightField. Never omit exercises on any session, even the last session in a high-session-count week. If the user provides 6 sessions of exercises, all 6 must appear with complete exercise data.',
    '- **HARD CONSTRAINT — EXERCISE FIDELITY:** Copy exercise names VERBATIM from the user\'s liftoscript. Do NOT add, invent, substitute, or supplement sessions with exercises not explicitly written by the user. Do NOT guess what accessory work the program implies. If the user provided 3 exercises per session, use those 3. If a session needs more volume, add more sets of the user\'s exercises — never new exercise names. Machine exercises, cable exercises, and isolation movements are FORBIDDEN unless the user explicitly listed them.'
  ];

  // ── The Mark surface ────────────────────────────────────────────────────
  // Session 1 (markStrip + Reckoning). COMPRESSION, NOT A FORK: the
  // three-phase law, the ten-second law, the one-currency-per-markStrip law
  // and the spine-determinism guard are the design constitution in
  // docs/plans/2026-08-10-hardening-program-amended.md; the economy laws it
  // leans on (pressures vs resources, per-spread teachCost, scarcity beats
  // options, print-before-rules-fire, renderers resolve against the actual
  // booklet) come from docs/plans/2026-08-09-game-design-space-grammar.md.
  // Those docs and this section MOVE TOGETHER — change one, change the other
  // in the same commit.
  //
  // Field shapes live in SCHEMA_META (economy) and SCHEMA_WEEKS_POST
  // (session.markStrip, week.reckoning). This section is doctrine only.
  window.INST_MARK_SURFACE = [
    '## The Mark Surface (markStrip and Reckoning)',
    'The workout is the story\'s clock, and this is the seam where the clock pays.',
    'Every session card prints a strip of tick targets. Every week prints one',
    'reckoning panel that converts those ticks into the booklet\'s one currency and',
    'spends them on a surface the booklet already prints. Design it as one economy,',
    'not as two separate features that happen to share a page.',
    '',
    '### The three-phase law',
    'Every demand this booklet makes of the player sits in exactly one phase. Know',
    'which phase you are writing for before you write the words.',
    '- MARK — mid-workout, between sets, under load. Ticks only.',
    '- RESOLVE — after the last set. Five minutes at most, sitting down. Totalling,',
    '  converting, spending. The reckoning panel lives here.',
    '- READ — rest days and week boundaries. Fragments, interludes, the ending.',
    'A demand printed for the wrong phase is not met, it is skipped — and a strip',
    'the player has learned to skip stops being marked at all.',
    '',
    '### The ten-second law (MARK phase only)',
    '- A markStrip target is satisfied by ONE pencil mark. Nothing else.',
    '- No number to write, no arithmetic to do, no option to weigh, no table to',
    '  consult, no page to turn. A gassed lifter between sets can do exactly one',
    '  thing, and that thing is drawing a line.',
    '- Nothing new to read, either. The storyPrompt is the entire mid-workout',
    '  reading budget and it stays inside its 220-character cap.',
    '',
    '### The strip scores the work; the table records it',
    'The exercise table already RECORDS the session — sets, reps, load, the rep',
    'boxes. The strip SCORES it. One target on every strip is the completion',
    'roll-up: the whole prescribed session done, ticked once. That target is the',
    'rep-box row judged, never the rep-box row copied. Never ask the player to',
    'restate in the strip a number the table already holds — a strip target that',
    'duplicates the table is a chore, and a strip target that judges the table is a',
    'game.',
    'The other targets name what this session asked for beyond finishing it: a',
    'standard held, a record kept, a shortcut refused, a duty discharged. Phrase',
    'them the way this artifact would phrase them, never in the language of',
    'exercise science, and never with a digit in the line.',
    '',
    '### One currency',
    'Every markStrip pays out the ONE currency declared in `meta.economy`. One name,',
    'one label, whole booklet. Do not invent a second tick currency, a bonus token,',
    'or a parallel point pool.',
    'This governs INCOME only. The booklet may still run pressures the world spends',
    'against the player — clocks, deadlines, suspicion, contamination. Those are',
    'pressures, not resources: they need no source in the strip and no sink in the',
    'reckoning.',
    'Scarcity is what turns a spend into a decision. A week that pays out more than',
    'its sink can absorb has no decision in it. Prefer a tight number to a menu — a',
    'ration set below what the player wants costs one integer to teach, and a table',
    'of options costs a page of teaching the player does not have.',
    '',
    '### Teach the conversion where it fires',
    '- `week.reckoning.conversion` is ONE sentence, in the book\'s voice, printed on',
    '  the reckoning panel. It states what the week\'s ticks become, and it names the',
    '  currency EXACTLY as `meta.economy.currencyLabel` writes it — the whole phrase,',
    '  verbatim, once. A modifier alone is not its name, and a synonym is a second',
    '  currency to the player counting them. That sentence IS the rule, and the panel',
    '  is its only home.',
    '- Do not restate the conversion on the rules spread. The rules spread may name',
    '  the strip once inside the play cadence — one clause, no arithmetic. Teaching',
    '  budget is spent per spread, not per booklet, and a rule taught twice has been',
    '  paid for twice.',
    '- The sink must name a surface THIS booklet actually prints, and that surface',
    '  must already be printed by the week that spends into it. A sink pointing at',
    '  something the booklet never prints, or does not print yet, is a broken',
    '  promise — the same defect as a manifestPointer aimed at a missing fragment.',
    '- Let the panel demand rather than explain. Labelled tally boxes, a sink line,',
    '  and one conversion sentence carry more than a paragraph of instruction does.',
    '',
    '### The spine is not for sale',
    'Banked currency may colour prose, open optional surfaces, and decide WHICH',
    'ending variant reads as earned. It may NEVER gate the password, the weekly',
    'component values, the decodingKey, or any link in the decode chain. A player',
    'who trains the whole block cannot be priced out of the ending. If the economy is',
    'the only thing standing between the player and that payoff, the design is',
    'wrong — move that gate off the spine.',
    '',
    '### What tooling owns (never author these)',
    '- `markStrip.targets[].id` and `.kind` — assigned and repaired by tooling from',
    '  the session\'s own exercises. Write labels; leave those two out entirely.',
    '- `week.reckoning.threshold` — derived by tooling from what the weeks can',
    '  actually pay out. Write the boss week as though a bar exists and the player',
    '  may or may not clear it. Never author the number, state it in prose, or write',
    '  a line that only reads correctly if the bar sits at one particular value.'
  ];

  window.INST_PERVASIVE_PLAY = [
    '## Pervasive Play (The Rest Interval)',
    '- Think in three play bands:',
    '  1. microplay: one mark, one lookup, one trace during mid-workout rest.',
    '  2. bridge play: one meaningful cross-reference or route update that persists across sessions.',
    '  3. pervasive/deep play (The Rest Interval): The time *between* workouts MUST be filled with diegetic anticipation.',
    '- Use `interlude` payloads to assign "off-session contemplation" tasks: a cipher that requires staring at the map at night, a moral dilemma to weigh before the next session, or a cliffhanger code to crack.',
    '- Do not let the fiction sleep when the player rests. The interlude must demand mental engagement even when they are not lifting.',
    '',
    '**Macro involvement hooks (between-session pressure):**',
    '- End at least half of all sessions with an unresolved question the player will think about away from the gym.',
    '- Clocks that imply off-screen consequences create urgency even when the booklet is closed.',
    '- Binary choices should be presented at session end so the player deliberates before the next session.',
    '- At least one fragment per block should plant a mystery that requires combining information from two different weeks to resolve.',
    '',
    '**Posted manifests (`manifestPointer`) — the located channel:**',
    '- Anticipation with an address beats atmosphere. A posted manifest is a printed line on a fragment or interlude that names a specific thing at a specific LATER place: "X was last logged in Y". The player now has somewhere to be.',
    '- Each booklet should carry 2-3 manifest chains. Post each pointer 1-3 sessions before its payoff — close enough to stay warm, far enough to be a chase.',
    '- At least one chain must run three links: the recovered document posts the next link of its own chain, so following one manifest hands the player the next. Chains end clean — the final link posts nothing.',
    '- `targetRef` must name a real later surface: a fragment id delivered in a later week, or a week reference ("W4"). Pointing at something missing, or at something already read, breaks the promise the line makes — validation rejects both.',
    '- Write `postedAs` in the artifact\'s own filing voice, never as a note to the player: "LAST LOGGED: tide ledger — Week 4 survey", "FORWARDED TO CASE FILE 12-B, spring quarter", "Sent on with the Michaelmas accounts." Whoever kept this paper wrote that line for their own reasons.',
    '- The pointed-to surface must actually pay off — the thing the manifest named has to be recognisably present when the player gets there.'
  ];

  // ── Point of use (§11 Wave 4a) ─────────────────────────────────────────────
  // The register hierarchy, made authorable. Grounded in
  // docs/reference/point-of-use-rules-research.md — the pinpoint law (§4), the
  // one-home law (§0), the no-chain law (§1.4), the three load states (§5.2),
  // and the density budget (§1.6/§5.1). The citation grammars quoted below are
  // SHELL_CITATION_STYLES in contract-constants.mjs; validate.mjs asserts this
  // menu against that table, so a shell added there without a line here is an
  // error rather than a family that quietly cites in someone else's dialect.
  window.INST_POINT_OF_USE = [
    '## Point Of Use — Cues, Pointers, And Citation',
    'A rule is not printed where it fires. What fires there is the DEMAND (the blank), the CUE (a handle, a few words), and at most one POINTER. Each rule is stated in full ONCE, on one surface. Restating it at the fire point taxes a Week-4 reader for a lesson they no longer need.',
    '',
    '**Conditional micro-lines (`session.microLines`) — the cheapest content in the book.**',
    'Same printed page, new pencil state, new reading: thirty keyed lines out-branch the page count at one line each. Shape `{ condition, cue, citeRef? }`.',
    '- `condition` names a CHECKABLE PRINTED STATE — a clock segment filled, a node shaded, a strip target ticked, a slot crossed off, a stat circled. The player answers it by LOOKING. "If the Relief Ledger stands at 3 or more" is checkable; "if you feel ready", "if you remember the letter" are not, because nothing on the page settles them.',
    '- `cue` is the payload: what to read, mark, or do now that it holds. One clause.',
    '- MAX TWO per session, at most ONE carrying a `citeRef`. A rest interval is ninety seconds and the blank already spends it.',
    '- Voice them as the document\'s own conditional filing note, never as a rules paragraph addressed to a player.',
    '',
    '**`citeRef` — the pointer.** Shape `{ targetRef, citedAs }`, legal on a microLine and on a fragment. `targetRef` is a fragment id ("F.07") or a week ref ("W4"), and unlike a manifest it may point EITHER WAY: Week 5 cites the rule taught in Week 1.',
    '- THE PINPOINT LAW. `citedAs` names what is there AND where. "The abbot\'s letter is already waiting" makes the reader guess; "the abbot\'s letter — Folio 12" does not. A citation with no pinpoint fails validation.',
    '- NEVER cite a page number — pages are numbered by the press long after you write. Cite by the booklet\'s refs ("F.07", "W4") or the shell\'s filing labels below.',
    '- THE NO-CHAIN LAW. A citeRef may not land on a surface carrying a citeRef or manifestPointer. A reader who spends the flip must arrive at the answer, not a forwarding address.',
    '- DENSITY IS A BAND, not a ceiling: 1 to 2 pointers per week for the whole book, manifests and citations counted together. Below the band the documents never name each other and the archive is a pile; above it, cross-reference density kills a layout however well each pointer is written. Spend the band on the document channel first — a manifest costs a reader nothing mid-set.',
    '- THE INTEGRATION EXCEPTION. Anything that must be read TOGETHER to make sense — a table and the roll that reads it, a diagram and its key — goes on the same spread. Pointers are for consulting to adjudicate, never for integrating to understand.',
    '',
    '**Citation grammar — one style per booklet, set by `artifactIdentity.shellFamily`.** A citation is not an instruction, it is a fact about the document, so it carries procedure with no explaining voice. Use your shell\'s labels with a number, every time:',
    '- `field-survey`: Sheet / Station / Plate / Traverse',
    '- `classified-packet`: Annex / Enclosure / Tab / Serial',
    '- `ship-logbook`: Entry / Watch / Bearing / Fathom',
    '- `witness-binder`: Exhibit / Statement / Deposition / Divider',
    '- `court-packet`: Exhibit / Docket / Schedule / Recital',
    '- `devotional-manual`: Office / Rubric / Verse / Antiphon',
    '- `household-archive`: Folio / Bundle / Leaf / Drawer',
    '- `technical-manual`: Figure / Clause / Procedure / Revision',
    'Borrowing another shell\'s labels fails validation: an inconsistent citation style is noise, not a cue.',
    '',
    '**Marginalia as evidence.** A later week may cite what the PLAYER wrote, in the same citation grammar it uses for printed documents ("the margin note against Sheet 4"). The world reading their handwriting back to them is the strongest re-entry move the form has. Once per book, not routinely.',
    '',
    '**Sealed caches (`fragment.seal`).** One or two per booklet. A document printed late that opens on a key found early — page-flipping as travel. `keyHint` describes the key well enough to be recognised weeks before the lock; `unlockCondition` names the EARLIER surface by ref ("opens with what was filed at F.04"). There is no real lock: the honour system IS the mechanism, because the deciding and the flip are the pleasure. Key at least two weeks ahead of its cache, and never a demand mid-workout — a cache is opened between sessions, unhurried.'
  ];

  // ── The return loop + the weekly door (Teeth Round, Wave T1a) ─────────────
  // `SCHEMA_SINGLE_WEEK` has pointed at "The Return Loop" and "Door Bias" since
  // Wave 4a landed the fields. NEITHER SECTION EXISTED. The model was handed
  // two one-line field shapes, told they were optional, and referred to
  // doctrine that was not in its prompt — which is precisely the shape of Book
  // 1's absence: 0 doors across six weeks, return beats on 9 of 20 sessions.
  //
  // Both are stage-routed (STAGE_SCHEMA_MAP → week-final) rather than added to
  // the flat INSTRUCTIONS bundle, for the ceiling reason INST_POINT_OF_USE was:
  // the single-prompt path is hard against 108,000 characters.
  //
  // Sourced from docs/reference/return-loop-design.md §1 (the four deficits)
  // and the doorChoice contract in contracts/booklet-schema.mjs.
  window.INST_RETURN_LOOP = [
    '## The Return Loop (sessions[].returnBeat)',
    'A session that ends on logistics ends on nothing. The return beat is one line at each end of the session — the cheapest re-entry mechanism the form has, and the only one that survives a week of not opening the book.',
    '',
    '- `closingLine` (REQUIRED, every session): tomorrow, cut tonight. Name the NEXT session before the player closes the book — the specific thing waiting, in this world\'s voice. Not a summary of what just happened, not a mood. Something with an address.',
    '- `openingEcho` (REQUIRED from week 2 onward): the world acknowledging the session just finished, keyed to something the player actually MARKED — a shaded node, a filled segment, a ticked target, a circled value. Week 1 is exempt because it has nothing to echo; every later session does.',
    '- Both are ONE line. They print in the margin of a session card, not in the prose block.',
    '- Voice them as the artifact\'s own note to itself, never as encouragement and never as a rules instruction to the player. "The gate log still shows Tuesday open" is a return beat; "Great work — see you next session!" is not.',
    '- The echo must be FALSIFIABLE from the page: if the player cannot look down and see the thing being referred to, it is atmosphere, and it will read as the book talking to someone else.'
  ];

  window.INST_DOOR_BIAS = [
    '## Door Bias (week.doorChoice)',
    'The weekly decision, with the bias POSTED. Two routes; the prescribed work behind either one is IDENTICAL — the agency lives entirely on the reward side, so the training never moves and the player never pays for a choice with a harder session.',
    '',
    '- Shape: { label?, optionA: { label, lean }, optionB: { label, lean } }.',
    '- `label` (optional): what this artifact calls the fork, in its own filing voice.',
    '- `optionA.label` / `optionB.label` (REQUIRED): the two ways, named so the player can say afterwards which one they took.',
    '- `lean` (REQUIRED on both sides): what that way is LIKELY to pay in. A door with no posted lean is a coin flip, and a coin flip is not a decision. State the tendency, never a guarantee — "the survey road is slower and the ledger stays quiet" leans; "choose A for +2" is a rules table.',
    '- ONE door per week at most. It is the week\'s decision, not a menu.',
    '- It is NOT `session.binaryChoice`. That field carries the single midpoint fork the boss encounter acknowledges; the door is the weekly one, and the two must not be confused.',
    '- The two leans must genuinely differ in KIND, not in size. Both roads slower-but-safer versus faster-but-safer is one road drawn twice.',
    '',
    '**REQUIRED for the eight pressure families.** If this booklet\'s `mechanicGrammarFamily` is `heat`, `attrition`, `siege`, `stewardship`, `loyalty-web`, `evasion`, `observance`, or `rivalry`, every non-boss, non-deload week MUST print a doorChoice. Those eight recipes each name a decision the player owns every week — push or lie low, ration or arrive thin, hold or concede, mend this or let that worsen, answer this claimant or that one, route or conceal, keep the rite or keep the day, stake or hold. The door is where that decision gets printed. A week of such a book without one has removed the thing the family is made of.',
    '**Optional for the reconstruction families** (`survey-grid`, `node-graph`, `timeline-reconstruction`, `testimony-matrix`, `ledger-board`, `route-tracker`, `profile-assembly`). Nothing spends resources against the player there, so there is often no lean to post honestly. Print one when the week really does fork; never print an empty one to fill the field.'
  ];

  window.INST_DIEGETIC_MECHANICS = [
    '## Diegetic Mechanics Selection',
    '- Do not blindly paste game mechanics into every week. Smartly select mechanics ONLY when they make diegetic sense.',
    '- **Session Phase Loop:** Design and name a specific play cadence for this booklet (e.g., "Workout → Oracle Pull → Execute Consequence → Read Fragment → Mark Board → Record Component"). Commit to this loop in the rulesSpread and follow it consistently. The loop is what makes this feel like a board game, not a journal.',
    '- **Clocks:** Use only when the story implies countdowns, rising institutional heat, structural failure, or approaching pursuers.',
    '- **Ciphers / Puzzles:** Use only when the player intersects hidden communications, corrupted data, or encrypted journals. Do not bury a door code in an abstract puzzle unless someone in-world hid it that way.',
    '- **Maps:** Pick the geometry from the verb, not the setting — see "Choosing the geometry" in the maps section. Exploring open ground reads as a hex grid; moving between named places reads as point-to-point; holding a perimeter reads as concentric rings; getting out unseen reads as a maze.',
    '- **Companions:** Use stress/inventory tracks only if resource scarcity is a central thematic pressure.',
    '- **Player Reflection (Logging):** At least twice per booklet, prompt the player to document a diegetic thought, sketch an observation, or log an answer directly onto the paper.',
    '- **Legacy Mutability:** When narrative shifts are permanent, demand permanent physical actions from the player ("cross out this paragraph permanently", "black out this node", "tear off this corner").',
    '- If a mechanic does not logically stem from the world fiction, discard it. Identity comes from chosen absence as much as inclusion.',
    '- Every non-boss week should logically trigger at least one of these surfaces based strictly on the narrative context.'
  ];

  window.INST_SYSTEM_INTEGRATION = [
    '## System Integration',
    '- The map, clocks, oracles, companions, and ciphers are ONE living board, not five parallel games. Every system must affect at least one other system.',
    '- Oracle consequences should reference specific map nodes ("shade the node you occupy on the map"), specific clocks ("advance [clock name] by 1"), or specific companion state ("cross off one slot on [companion]").',
    '- Clock consequenceOnFull should trigger a visible map change: a route closes, a node becomes inaccessible, a new zone opens under duress, or an NPC\'s position shifts.',
    '- Companion depletion or exhaustion should gate a player decision: when a stress-track fills or a dashboard/inventory surface is exhausted, the player loses access to a route, information source, or safe option.',
    '- Cipher solutions should connect to the map: the fiction-native value derived from a cipher should correspond to a map location, node label, or route identifier the player can now access or reinterpret.',
    '- Weekly component values should be spatially derived: readings from instruments at specific map coordinates, tags from specific nodes, codes found in specific restricted areas.',
    '- The binary choice at midpoint should fork the board state: one option opens route A and closes route B; the other does the reverse. Both routes must remain viable but with different pressures and information access.'
  ];

  window.INST_WEEKLY_COMPONENTS = [
    '## Weekly Components',
    '- Treat `weeklyComponent` values as diegetic residues or operational keys: readings, tags, case numbers, route markers, calibration results, timestamps, docket fragments, call signs, or similar in-world traces.',
    '- Each non-boss weeklyComponent value should feel collectable, comparable, and operationally meaningful even before the boss decode explains its final use.'
  ];

  window.INST_SESSION_PROMPTS = [
    '## Session Prompts',
    '- Each `storyPrompt` is 2-4 sentences.',
    '- Each prompt must advance the story, alter pressure, expose a relationship, reveal environment, or force interpretation. It must not simply summarize events.',
    '- Every prompt should include one physical action, one sensory detail, and one material object.',
    '- End sessions on unresolved pressure or altered expectation, not tidy closure.',
    '- Do not force every prompt to name a clock, node, or mechanic. When prompt text references system state, it must feel diegetic and earned.',
    '- Every session prompt must end with unresolved narrative tension. The player should close the booklet wanting to know what happens next.',
    '- Session prompts must advance the story. No atmospheric filler that could be removed without changing the plot.',
    '- Prompts must reference concrete physical detail from the world (nodes, objects, documents), not abstract emotions.',
    '- Heavy training weeks must parallel crisis narrative phases. Deload weeks are breathing room, not dead space.'
  ];

  window.INST_FOUND_DOCUMENTS = [
    '## Found Document Quality',
    '- Fragments must feel like real artifacts with real purposes inside the world.',
    '- Include routine, domestic, or procedural documents, not only dramatic revelations.',
    '- At least two fragments should be protagonist-adjacent by authorship, address, or consequence.',
    '- Build at least three linked fragment functions into the booklet: one artifact that changes action, one that changes interpretation, and one that deepens character stakes.',
    '- Let at least one incident, place, procedure, or relationship echo across multiple document perspectives.',
    '- Treat fragments as threaded evidence, found packets, route instructions, contradictory accounts, or emotional aftershocks, not only lore drops.',
    '- Use redactions only when they do narrative work.'
  ];

  window.INST_CIPHER_DESIGN = [
    '## Cipher And Puzzle Design',
    '- Ciphers produce fiction-native raw values, never raw letters.',
    '- Week 1 puzzle should be solvable quickly. Later weeks can deepen or recombine the grammar.',
    // LENGTH-SAFE BY CONSTRUCTION (W7). This read "at least four distinct
    // puzzle families across a standard six-week block" — a floor stated as a
    // fact about a length no longer every book's. The exact number is a
    // function of week count and lives at the planning stages, which know it;
    // this stage authors one week and states the rule.
    '- Give every non-boss week a puzzle family no earlier week used, for as many weeks as the list below can cover. Never fewer than three across the book.',
    '- Do not repeat the same puzzle family in consecutive non-boss weeks unless repetition is diegetic and escalating.',
    // THE MENU. Quoted exactly from GENERATION_CIPHER_TECHNIQUES in
    // contracts/contract-constants.mjs, in order, and asserted both
    // directions by cipherMenuParity() in validate.mjs. Its LENGTH is also
    // the ceiling on cipherVarietyFloor(), so a technique added here without
    // being added there would let the gate demand a family nobody offers.
    '- Good families include constraint logic, spatial route reading, fragment cross-reference, pattern recognition, typographic anomaly, observational anomaly hunting, metapuzzle assembly, and process deduction.',
    '- **Gating logic:** Design ciphers as lock-and-key systems. Week 1 cipher output should be usable as an input or key for a later puzzle. At least one cipher should require information the player can only obtain from a specific map node or fragment — this is found/not-found gating.',
    '- The solved cipher should open access (to a route, a fragment, a map zone, or a companion function) — not just produce a number for the boss decode.'
  ];

  window.INST_MAPS_BOARD = [
    '## Maps As Board State',
    '- The map is a changing board state, not an illustration.',
    '- PERSISTENT TOPOLOGY: Design ONE main facility/location map and reuse it across most non-boss weeks. The player should learn, annotate, and master this space over time. Do not create a new unrelated map for each week.',
    '- Week-to-week map evolution: new node unlocked, route closed, state change, annotation added, zone renamed, or access altered. Same topology, evolving state.',
    '- Every map should contain a denied route, locked zone, or inaccessible space plus a likely return point, checkpoint, or remembered landmark.',
    // COMPRESSED (D144, compress-first). Two lines left this section and lost
    // no reach. The zoom-in/new-sector rule MERGED into the geometry section's
    // second-geometry clause, which says the same thing and additionally rides
    // `campaign-plan` — so the planner now hears it too, which it did not
    // before. The `floorLabel` usage cue was a paraphrase of SCHEMA_SPATIAL's
    // own field definition, and the two always travel together.
    '- **Point-to-point print legibility:** Node and edge labels print at ~5pt on a half-letter page. Keep node labels to 2–3 words. Edge labels to 1–2 words. If a location has a long institutional name, abbreviate it for the map label and use the full name in prose. The map is a board, not a paragraph.',
    '- Player-drawn maps should still give enough seed markers or prompts to feel purposeful, not empty.'
  ];

  // ── Choosing the geometry (D144: hoisted out of INST_MAPS_BOARD) ──────────
  // WHY IT MOVED. This table used to live inside INST_MAPS_BOARD, which is
  // routed to `week-final` and the single-prompt bundle — so on the standard
  // pipeline the geometry decision was first READ at the stage that authors
  // week 1, three stages after the campaign plan had already declared the
  // persistent topology every later week reuses. The stage that CHOOSES the
  // board could not see the table, and the stage that could see it was told
  // (correctly) to preserve what the plan had already fixed.
  //
  // Measured on the real prompts, 2026-08-13: `campaign-plan` contained
  // `concentric` once, `maze` once and `hex` once — all inside the compact
  // MECHANIC_VOCAB_BRIEF constraint list, with no guidance on when any of them
  // is the right answer; `week-final` carried the full table. Every W3 matrix
  // book used a square grid or point-to-point.
  //
  // So the table is its own section now, routed to BOTH stages plus the bundle.
  // The rest of INST_MAPS_BOARD stays week-final-only, because the rest of it IS
  // week material (print legibility at 5pt, weekly deltas, floorLabel) — routing
  // that to the planner would be doctrine false at its stage, the D128 defect.
  //
  // THE HEX AND MAZE ROWS' `Serves` COLUMN NAMED A CLUSTER, NOT FAMILIES.
  // Both read "reconstruction", which is the name of the seven-family cluster in
  // FAMILY_CLUSTERS and NOT a value of VALID_MECHANIC_GRAMMAR_FAMILIES. Every
  // other row names families. A model whose declared family is `survey-grid`
  // therefore found itself named explicitly in the plain-`grid` row and nowhere
  // in the hex row — so hex was unreachable for exactly the family whose whole
  // idiom is surveyed ground. Both rows now name families.
  window.INST_MAP_GEOMETRY = [
    '### Choosing the geometry',
    'ONE geometry per book. Choose it because it serves the grammar family — the board serves the verb, never decoration. A second geometry (a zoom-in, a new sector) is a topology change: it must be diegetically justified, and the main topology must return.',
    '',
    '| Geometry | Player verbs | Serves |',
    '|---|---|---|',
    '| `grid` | clear cells, annotate ground, mark position | survey-grid, ledger-board, stewardship |',
    '| `grid` + `cellShape: "hex"` | reveal hexes, plot traverses across open ground (six-way agency) | survey-grid, route-tracker, attrition, stewardship |',
    '| `point-to-point` | move between nodes, open routes | node-graph, heat, stewardship |',
    '| `point-to-point` + `edgeSemantics: "relational"` | strengthen, strain, sever, redraw ties | loyalty-web, testimony-matrix |',
    '| `linear-track` | advance the line, hold ground behind you | route-tracker, timeline-reconstruction |',
    '| `concentric` | advance inward, hold or lose rings, mark breaches | siege, observance, heat |',
    '| `maze` | trace the path, mark dead ends, unlock doors | evasion, attrition, node-graph |',
    '| `player-drawn` | draw the space as you learn it | any family whose world is unmapped |',
    '',
    '- A geometry is not an aesthetic. If the family\'s verb is "hold ground while it closes", rings ARE that verb and a square grid is a translation of it. If the verb is "get out without being seen", corridors are that verb and a straight line is a summary of it.',
    '- `grid` is the easiest DEFAULT. Before taking it, name the verb your family performs. Crossing ground rather than reading a floor plan? `cellShape: "hex"` is the same data model and the truer board.',
    '- The DESIGN BIAS proposes geometries; the mechanic grammar family DECIDES. Where they disagree, the family wins and `selectionReason` names the verb that settled it.',
    '- The map is an in-world document with an in-world maker: it has a reason to exist, labels drawn from the world\'s own nouns, and weekly deltas someone in the fiction would name. Two booklets that both chose `concentric` must not produce the same drawing.'
  ];

  // ── Convergence Design (Wave 2; the March 2026 convergence-variants design) ─
  // The endgame used to be one shape in every booklet: collect one component
  // per week, concatenate in week order, decode. This is the menu that breaks
  // it — and the law that keeps every pattern sealable.
  //
  // THE DECODE CHAIN IS NOT PROMPT-ONLY (correction to the March design, which
  // was written against an older pipeline and claimed prompt-only scope). Three
  // machine facts bound what a pattern may vary, all of them ERROR-class today:
  //   1. assembly.js enforceBookletDerivedFields OVERWRITES
  //      bossEncounter.componentInputs with the collected non-boss
  //      weeklyComponent values, in week order.
  //   2. validation.js validateAssembledBooklet errors when componentInputs
  //      count differs from the non-boss week count, or when any entry differs
  //      from its week's value.
  //   3. meta.passwordLength is derived from the A1Z26 decode of that list, and
  //      the renderer prints that many password boxes.
  // So a pattern may vary WHERE the weekly value comes from, WHAT the player
  // must know to read it, and WHAT the decoded letters mean — never the count,
  // never the stored order. The March doc's "more components than the password
  // needs" would print the wrong number of boxes; it is landed below as more
  // READINGS than the password needs, which delivers the same filtration on the
  // surface where the mark is made.
  window.INST_CONVERGENCE_DESIGN = [
    '## Convergence Design (how the weeks become the password)',
    '',
    'The spine is fixed in every pattern, because the printed booklet depends on it:',
    '- Every non-boss week yields EXACTLY ONE component value, an integer 1-26.',
    '- The boss page lists those values in WEEK ORDER. That is the collection record.',
    '- `decodingKey.referenceTable` is the standard A1Z26 table (1=A ... 26=Z).',
    '- The password has exactly as many letters as there are non-boss weeks.',
    'A convergence needing a different count, a different stored order, or a non-alphabetic',
    'table is not a creative choice; it is a booklet whose printed unlock does not work.',
    '',
    'Within that spine, choose what serves the world contract. Do NOT default to sequential',
    'assembly every time — by the fourth booklet a player who has seen only that shape is',
    'doing data entry, not a puzzle.',
    '',
    '### `sequential-assembly`',
    'The letters, read in week order, are the password. Correct when the fiction is about',
    'accumulation and the last week should feel like arrival. `convergenceProof` shows the',
    'values, the letters, and the resulting word.',
    '',
    '### `reordering`',
    'The week-order letters are an ANAGRAM of the password. The boss reveals the true reading',
    'order, which must be something the player learned in play — an order the world',
    'established, never an arbitrary shuffle.',
    '- `convergenceProof` MUST show BOTH: the week-order string, marked as the wrong reading,',
    '  and the true-order string.',
    '- HARD REQUIREMENT: `passwordRevealInstruction` MUST state the final password in exactly',
    '  the form `The password is WORD.` — one sentence, the word in capitals. The tooling that',
    '  seals the ending reads that sentence; without it the anagram gets sealed and the player',
    '  is locked out of their own booklet at the end of the block. Export redacts the sentence before',
    '  printing, so stating it spoils nothing.',
    '- Do not choose this pattern if the true order cannot be derived from something printed.',
    '',
    '### `red-herring`',
    'Each week\\\'s surface offers MORE candidate readings than the week needs — several figures,',
    'marks, or values — and only one is this week\\\'s component. The player must know the',
    'discriminating rule to write the right number in the box.',
    '- The discriminator is established in the fiction and CONFIRMED at the boss, which states',
    '  the rule plainly so the player can check every week against it.',
    '- `convergenceProof` MUST identify the decoys — at least one wrong reading per week the',
    '  player could have taken — and then show the filtered result.',
    '- The tracker still holds ONE value per week. The filtering happens where the mark is',
    '  made, not at the end, and a player who wrote a wrong value must be able to fix it.',
    '',
    '### `dual-source`',
    'The weekly values do not all come from the cipher. Some are extracted from an oracle',
    'result, a found document, a map state, or a companion surface, and the boss combines',
    'cipher-derived and narrative-derived values.',
    '- Each week must make its SOURCE unambiguous.',
    '- `convergenceProof` MUST document both kinds of source and which week gave which.',
    '- At least two weeks must draw from a non-cipher source, or this is sequential assembly',
    '  wearing a label.',
    '',
    'Whatever the pattern, the password-record layout is fixed (one box per week, one final',
    'assembly row) and `convergenceProof` stays strict. A pattern changes what the player must',
    'UNDERSTAND, never what the booklet must PRINT.',
  ];

  window.INST_INTERLUDES = [
    '## Interludes And Messaging',
    '- Use supported interlude payloads for discovered packets, route updates, partial instructions, password elements, fragment references, or compact state changes only when they materially affect play.',
    '- Do not add interludes as ornamental prose breaks. Each one should change pressure, interpretation, access, or memory.'
  ];

  window.INST_ORACLES_CLOCKS = [
    '## Oracles And Clocks',
    '- Oracle consequence results must visibly alter the paper state.',
    '- Use clocks to embody threat, bureaucracy, contamination, pursuit, trust, distance, repair, or public fallout.',
    '- Prefer at least one endowed track or clock with `startValue > 0` unless the fiction strongly argues against it.',
    '- Oracle paperAction must name a specific target: "advance [clock name] by 1", "shade [node label] on the map", "cross off one slot on [companion name]", "mark the route between [A] and [B] as closed." Never use vague instructions like "update the board" or "something changes."',
    '- At least one clock\'s consequenceOnFull must change the map: close a route, lock a node, open an emergency path, or force relocation.',
    '- At least one oracle entry per week should connect to the map by referencing a node or route by label.'
  ];

  window.INST_COMPANIONS = [
    '## Companion Components',
    '- Only use companion components when they create real scarcity, tension, overwrite pressure, route denial, or strategic tradeoff.',
    '- Good uses: stress accumulation, usage depletion, evidence crowding, memory overwrite, access buffer, or dashboard state.',
    '- Do not add companion surfaces as decorative filler.',
    '- **The growing stat (`percentile-stat`):** name it from the Core Noun Roster and make it a capability this world would actually keep a number on — standing inside a named institution, clearance against a named archive, fluency in a named record system, credit with a named faction. It must read as a line an in-world clerk would write.',
    '- Never name the stat after the body, the training block, or the player. It is not Strength, Endurance, Fitness, Level, or XP. The workout produces it; the fiction is what carries it.',
    '- One percentile-stat per booklet, introduced inside the first quarter of the block so it has room to climb. Its `body` must say in one sentence what having a high number means inside the world.'
  ];

  window.INST_PROGRESSION = [
    '## Progression Design',
    '- Design a clear capability arc across the campaign. Week 1 should feel constrained: limited map access, simple mechanics, few nodes visible, basic companion state.',
    // W7: this ramp named absolute week numbers, which described a six-week
    // block and nothing else. At twelve weeks every surface was on by week 5
    // and seven weeks ran flat; at four weeks the clocks arrived on the boss.
    // Positions in the block scale; week numbers do not.
    '- **Mechanical Rule Ramp — positions in the block, never fixed week numbers:** Week 1 introduces only the core loop (map + oracle + session prompts). Companion components arrive inside the first third of the block; gameplay clocks by the end of the first half; only past the midpoint may one week layer several mechanical surfaces at once. Complexity is a reward, not a starting condition.',
    '- Each non-boss week must give the player something new: a cleared route, an unlocked node, a decoded access code, a revealed map area, a new companion function, a key that opens a previously locked gate.',
    '- By the penultimate week, the player should have enough capabilities and map knowledge to make real strategic choices about route, resource allocation, and risk.',
    '- The boss week should require the player to have MASTERED the space. The decodingKey should reference map node names, spatial relationships, clock history, or institutional knowledge gathered across the campaign — not just arithmetic on weekly component values.',
    '- Do not give the player everything in Week 1. Do not gate everything behind the boss. Distribute progression evenly, with the midpoint binary choice as the biggest single state change.',
    '- **Display floor:** if the booklet carries a `percentile-stat`, its `weeklyValues` must rise monotonically across the campaign — every value strictly greater than the one before it. The printed stat never regresses. A missed week costs the player the roll, never the number.',
    '- Author those values; do not ask the player to compute them. Open low enough that early rolls usually fail (roughly 20-35) and close high enough that late rolls usually land (roughly 60-75). The climb between them is the character sheet the block wrote.',
    '- The stat must be visible in play, not just on its own page: at least two weeks\' oracle `instruction` must state the roll-under check and the one-band upgrade it grants.',
    '- **Chance isolation:** the stat and the dice move the story only. No roll, no stat value, and no oracle result may ever change sets, reps, load, or rest. Advantage flows workout to game and never back.'
  ];

  window.INST_VISUAL_DIRECTION = [
    '## Visual Direction',
    '- Choose one supported visual archetype that matches the world.',
    '- Use density variation across the booklet: not every spread should be medium density.',
    '- Make the visual logic part of the fiction. Format is worldbuilding, not decoration.',
    '- If the story is institutional, document structure should feel institutional. If it is intimate, the artifact should still show the world hand through margins, annotations, or typographic behavior.',
    '- Choose only 2-3 recurring visual signals for the whole booklet, such as stamps, route arrows, warning bars, docket numbers, repeated symbols, or marginalia.',
    '- Those recurring signals should communicate status, authorship, jurisdiction, pressure, or hazard.',
    '- Avoid decorative clutter that does not support world logic or play clarity.'
  ];

  // ── The authored design language (W6) ───────────────────────────────────
  //
  // ROUTING: staged pipelines only, via STAGE_SCHEMA_MAP → 'shell'. It is
  // deliberately absent from window.INSTRUCTIONS and window.SCHEMA_SPEC. The
  // single-prompt bundle measured 114,437 of its 115,000-character ceiling at
  // D136; there is no room, and the puzzle section set the precedent at D132
  // (routed stage-only, and the code says so). A paste-path book still renders
  // — it renders as its archetype, which is exactly what the archetype is for.
  //
  // WHY THIS EXISTS AT ALL: D135 measured three of four maximally divergent
  // briefs wearing BYTE-IDENTICAL government/classified-packet dress. The
  // archetype menu was never the lever it looked like — ten presets cannot make
  // two books of the same genre look like different designers' work, because
  // ten is the number of looks the system had. This section hands the book its
  // own design decisions, and hands them to it as MENUS with a derivation law,
  // for the same reason D136 did it to register: a free choice converges and a
  // cited choice cannot.
  //
  // THE MENUS ARE BYTE-QUOTED from contract-constants.mjs (VALID_*), and
  // `designLanguageMenuParity()` in scripts/validate.mjs diffs them both ways —
  // an axis value offered here that the schema rejects is a stage failure on
  // output this prompt demanded, and a value the schema accepts that this
  // prompt never offers is a look no book will ever wear.
  window.SCHEMA_DESIGN_LANGUAGE = [
    '## meta.designLanguage (REQUIRED — this book\'s own design)',
    '',
    'The archetype is a floor: it guarantees the book is legible and prints in black and white.',
    'It is NOT this book\'s identity. `meta.designLanguage` is, and it is composed OVER the',
    'archetype, so state it even when a choice agrees with the archetype you picked.',
    '',
    '- `layoutIntensity` (number 0.0-1.0, REQUIRED): how hard this book presses. 0.0 is a',
    '  clinical instrument — quiet rules, nothing shouting. 1.0 is a poster on every spread.',
    '  Most books are not at either end.',
    '- `productionTexture` (REQUIRED): "none" | "photocopy" | "typewriter" | "risograph" |',
    '  "mimeograph" | "letterpress" — the press this object came off.',
    '- `toneTexture` (REQUIRED): "none" | "stipple" | "hatching" | "cross-hatch" |',
    '  "dense-cross-hatch" | "reverse-stipple" — how a shade is made on a machine with no grey.',
    '  The list runs light to dark.',
    '- `typeVoice` (REQUIRED): "archetype-default" | "literary-press" | "terminal-log" |',
    '  "field-notebook" | "typewriter-file" | "broadsheet" | "display-clash" | "plain-record".',
    '- `documentRecipes` (REQUIRED, object): one entry per document family this book uses.',
    '  Keys: "bureaucratic" | "hand-authored" | "personal" | "recorded" | "anomalous" |',
    '  "custom-document". Values: "plain" | "memo-grid" | "label-borders" | "ledger-rules" |',
    '  "stamped-file".',
    '- `marginSemantics` (REQUIRED): "none" | "edge-band" | "tab-marks" | "rule-weight" — how',
    '  the outer margin tells a reader what KIND of page they have opened to.',
    '- `inkDiscipline` (REQUIRED): "light-touch" | "standard" | "heavy-press" | "crushed".',
    '- `sealTreatment` (REQUIRED): "none" | "rubber-stamp" | "wax" | "embossed" | "perforated".',
    '- `designEvidence` (REQUIRED, string, 1-2 sentences): the brief\'s own words that these',
    '  choices came from, quoted, and what they made the object look like.'
  ];

  window.INST_DESIGN_LANGUAGE = [
    '## Design Language (run after Brief Interpretation, with Visual Direction)',
    '',
    'Two books from the same genre must be distinguishable across a table. The archetype cannot',
    'do that — ten archetypes is ten looks. Choose this book\'s design the way a designer hired',
    'for THIS story would: from the object it is, not from the shelf it sits on.',
    '',
    'DERIVATION LAW, the same law that governs register: every axis must be traceable to words',
    'the brief actually contains. Name the phrase to yourself before you fix the axis, and put',
    'the phrases in `designEvidence`. A design language that cannot cite the brief is a house',
    'style wearing the book\'s name, and it will look like the last book you made.',
    '',
    'HONEST WHEN LACKING. If a brief supports no reading on an axis, "none"/"archetype-default"',
    'is the correct answer and a real one. Do not manufacture a press the world has no reason to',
    'own. A quiet book that means its quiet beats a loud book that means nothing.',
    '',
    'THE PRESS IS A CLAIM ABOUT THE WORLD, not a filter over it. Ask who made this object and',
    'on what machine:',
    '- "photocopy" — copied, passed hand to hand, degraded by circulation',
    '- "typewriter" — struck once, by a person, on a machine that leaves pressure',
    '- "risograph" — printed cheaply in a small run, slightly out of register',
    '- "mimeograph" — duplicated in bulk by an organisation that could not afford better',
    '- "letterpress" — set with care, by someone who expected it to last',
    '- "none" — the world has no printing story worth telling; let the archetype speak',
    '',
    'TYPE VOICE is who is speaking in ink:',
    '- "literary-press" — an edition. Someone set this like a book.',
    '- "terminal-log" — no book anywhere in it. Machines wrote it for machines.',
    '- "field-notebook" — a working hand, with a machine only where something was stamped on later',
    '- "typewriter-file" — one carbon copy, one machine, start to finish',
    '- "broadsheet" — a masthead over a body: something published, for readers',
    '- "display-clash" — a display face over a body that does not agree with it. Deliberately',
    '  uncomfortable. Use it when the world is at war with itself, not for decoration.',
    '- "plain-record" — the flattest register available. The document does not want to be read.',
    '- "archetype-default" — the archetype\'s pairing is right for this world',
    '',
    'DOCUMENT RECIPES are per document FAMILY, so the book\'s papers do not all look alike:',
    '"memo-grid" is an institution\'s bar-and-rule; "label-borders" is a doubled warning frame;',
    '"ledger-rules" is ruled paper under the prose; "stamped-file" is a document that was',
    'handled. Give different families different recipes when the world has more than one kind of',
    'author in it — that difference IS the worldbuilding.',
    '',
    'MARGIN SEMANTICS answers "what kind of page is this?" before the reader has read a word:',
    '"edge-band" bands the outer margin by page kind; "tab-marks" is a drawn thumb index;',
    '"rule-weight" says it with the weight of the frame alone.',
    '',
    'DIVERGE ON PURPOSE. If a divergence seed was drawn for this run, let it push at least ONE',
    'axis away from the obvious reading of the genre — the obvious reading is what every other',
    'book of this genre already chose. Then check the whole set reads as ONE object: a',
    'letterpress edition with a crushed photocopier discipline is two stories about the same',
    'piece of paper.',
    '',
    'BLACK AND WHITE IS NOT A DEGRADED MODE. Every choice here has to survive a monochrome laser',
    'printer, because that is the printer most players own. Weight, pattern and structure carry',
    'the signal; colour never does.'
  ];

  window.INST_ANTI_SAMENESS = [
    '## Anti-Sameness',
    '- Do not make every booklet about the same kinds of institutions, secrets, beats, or reveals.',
    '- Mundane work is welcome if it becomes strange through specificity and consequence.',
    '- Choose at least one mechanic family, document family, or expected beat to exclude on purpose. Identity comes from selected absence as much as inclusion.',
    '- Avoid cookie-cutter arcs where each week is just clue -> stranger clue -> boss reveal.'
  ];

  // ── Artifact Intent Compiler ────────────────────────────────────────────
  // Layer 3 planning contract: compiles the user brief into a binding
  // artifact-level planning bundle. The model must choose from explicit
  // families rather than drifting into the default LiftRPG booklet grammar.
  // See docs/plans/2026-03-28-brief-to-artifact-compiler.md

  window.INST_ARTIFACT_COMPILER = [
    '## Artifact Intent Compiler (run after Brief Interpretation)',
    '',
    'After interpreting the brief, you MUST compile it into a concrete artifact planning',
    'bundle (`meta.artifactIntent`). This is a binding planning contract — later stages',
    'must preserve these commitments. Do not leave them implicit.',
    '',
    '### Step 1: Classify the brief',
    'Set `briefMode` to one of:',
    '- `explicit`: rich direction with clear genre, tone, and object cues',
    '- `sparse`: short premise that still implies an object and emotional engine',
    '- `empty`: no creative direction provided (if a seed direction was drawn for you and',
    '  appears in the creative direction channel, it IS direction — classify and honor it as',
    '  though the user had written it, and do not fall back to a generic default)',
    '- `mashup`: combines multiple references or domains (X meets Y)',
    '- `reference-led`: names a specific author, film, book, game, or cultural work',
    '- `personal-subject`: includes a real person, pet, or intimate real-world referent',
    '',
    '### Step 2: Choose fidelity mode',
    'Set `fidelityMode` to one of:',
    '- `literal`: the brief names a specific scenario, person, or place — build around it exactly',
    '- `interpretive`: the brief gives a theme or mood — preserve the emotional engine while specifying the object',
    '- `compositional`: the brief is empty or minimal — infer aggressively through explicit contract choices',
    '',
    'KEY RULE: a sparser brief does not mean "make it more generic."',
    'It means make STRONGER object choices on the user\'s behalf.',
    '',
    '### Step 3: Read the brief three ways, then choose one (the candidate triptych)',
    'Before committing to any family, construct THREE candidate readings of this brief.',
    'Do this silently, inside this one response — do not ask for more turns and do not',
    'output the deliberation as prose.',
    '',
    'Each candidate is a complete reading: tone, register, POV frame, implied setting,',
    'emotional arc, genre template, and the arc + mechanic grammar families it implies.',
    '',
    'Rules for the triptych:',
    '- The three candidates MUST differ on at least one MAJOR axis: `mechanicGrammarFamily`,',
    '  `arcFamily`, or POV frame. Three shades of one idea is a rule violation — if all three',
    '  would produce the same board and the same tension curve, you have not read three ways.',
    '- The program shape supplied in the derived-context block is candidate PRESSURE, not',
    '  determinism: the program\'s shape must be legible in at least one candidate\'s arc or',
    '  mechanic choice. Topology proposes; the triptych disposes.',
    '- SELECTION CRITERION: choose the candidate with the sharpest creative tension that still',
    '  honors the fidelityMode. Never the safest read. Never the average of the three.',
    '  Honoring the dissonance is the rule for every brief class, not only mashups.',
    '- A candidate that a `literal` fidelityMode cannot support is disqualified no matter how',
    '  interesting it is. Sharpness never licenses ignoring what the brief actually says.',
    '',
    'Emit ONLY the winner as the reading. Record the two that lost under',
    '`artifactIntent._x.rejectedReadings` — at least TWO entries, each an object:',
    '- `axis`: the MAJOR axis it differed on — `mechanicGrammarFamily` | `arcFamily` | `povFrame`',
    '- `value`: what it would have chosen on that axis. It must differ from the winner\\\'s.',
    '- `oneLiner`: one sentence on what that book would have been.',
    'An entry matching the winner on both family axes is not a rejected reading; it is the same',
    'book described twice, and it means the triptych did not run.',
    '',
    '### Step 4: Choose one arc family',
    'Set `arcFamily` to one of these families. Each shapes the entire booklet\'s tension curve:',
    '',
    '| Arc Family | Opening | Midpoint Shift | Endgame Pressure | Fragment Function |',
    '|-----------|---------|---------------|-----------------|------------------|',
    '| `slow-burn-investigation` | Anomaly: something is wrong but not yet named | Recontextualization: evidence means something different | Scope: the problem is bigger than assumed | Exhibits: evidence to assemble |',
    '| `institutional-collapse` | Normalcy: the institution appears to function | Fracture: internal contradiction becomes visible | Cascade: each failure triggers the next | Records: artifacts from before and during collapse |',
    '| `witness-accumulation` | Testimony: a single account from one perspective | Contradiction: testimonies conflict on a specific point | Convergence: the player must weigh whose account to trust | Depositions: different voices on the same events |',
    '| `contamination-spiral` | Contact: a substance, idea, or force enters the system | Spread: contamination reaches a second domain | Irreversibility: the original state cannot be restored | Samples: measurements, readings, specimens |',
    '| `procedural-deepening` | Surface: the procedure appears routine | Layer: a hidden procedure exists beneath the visible one | Recursion: the deeper procedure applies to the protagonist | Manuals: instructions that change meaning with context |',
    '| `pilgrimage-approach` | Departure: the protagonist leaves known ground | Threshold: the landscape changes character | Arrival: the destination is not what was expected | Waypoints: markers on the route that change the journey\'s meaning |',
    '| `false-order-to-rupture` | Order: the world appears stable and coherent | Crack: one element does not fit the declared order | Rupture: the order was constructed to conceal something | Facades: the order\'s own documentation, which contradicts itself |',
    '',
    'The arc family constrains how weekly arcBeats develop. Do not choose one family and then',
    'write beats that follow a different one.',
    '',
    '### Step 5: Choose one mechanic grammar family',
    'Set `mechanicGrammarFamily` to one of these fifteen. Each changes what the player DOES each',
    'week and, more importantly, what the WORLD spends against them. They fall into nine',
    'clusters; the first seven share one because they are one macro-genre — all seven read an',
    'incomplete record and rebuild it. Choosing across clusters changes the game; choosing',
    'within the reconstruction cluster changes the documents.',
    '',
    '| Family | Cluster | Board-State Mode | Primary Player Action |',
    '|--------|---------|-----------------|----------------------|',
    '| `survey-grid` | reconstruction | survey-grid | Mark, clear, annotate grid positions |',
    '| `node-graph` | reconstruction | node-graph | Connect, traverse, sever nodes |',
    '| `timeline-reconstruction` | reconstruction | timeline-reconstruction | Sequence events, identify gaps |',
    '| `testimony-matrix` | reconstruction | testimony-matrix | Compare accounts, mark contradictions |',
    '| `ledger-board` | reconstruction | ledger-board | Track quantities, debits, credits |',
    '| `route-tracker` | reconstruction | route-tracker | Advance position, choose direction |',
    '| `profile-assembly` | reconstruction | profile-assembly | Collect attributes, compare profiles |',
    '| `heat` | heat | ledger-board | Act loudly or quietly, and pay the difference |',
    '| `attrition` | attrition | route-tracker | Spend stores to cover ground |',
    '| `siege` | siege | survey-grid | Fortify, concede, hold a position |',
    '| `stewardship` | stewardship | survey-grid | Repair one failing thing, let others worsen |',
    '| `loyalty-web` | loyalty-web | node-graph | Answer one claimant in front of the others |',
    '| `evasion` | evasion | route-tracker | Choose the fast line or the hidden one |',
    '| `observance` | observance | timeline-reconstruction | Keep the form exactly, or keep the day |',
    '| `rivalry` | rivalry | ledger-board | Stake something against a posted result |',
    '',
    'The Board-State Mode column is the family\'s DEFAULT board, not its identity. A family may',
    'take a different `meta.artifactIdentity.boardStateMode` when the world argues for it —',
    'state the argument in `selectionReason`. The family also shapes the oracle, cipher, and',
    'companion surface choices. Do not choose one family and then design mechanics from a',
    'different one.',
    '',
    '### Step 5a: The cluster recipes (BINDING — invariants on effect)',
    'Each recipe states what a book in that cluster must FEEL like, never which components to',
    'use. Two books in the same cluster built from different pieces are both correct; two built',
    'from the same pieces that produce different pressures are also both correct. Compose',
    'freely — the recipe is the constraint, the component list is not.',
    '',
    'PRESSURE is what the world spends against the player. DECISION is what the player must own',
    'every week. REFUSES is what the family will not do, and it feeds your exclusions in Step 8.',
    '"Usually made from" is a non-binding note on how the effect commonly gets built.',
    '',
    '**Reconstruction** — `survey-grid` `node-graph` `timeline-reconstruction` `testimony-matrix` `ledger-board` `route-tracker` `profile-assembly`',
    '- PRESSURE: the record\'s incompleteness. The world spends GAPS: what is missing, misfiled or contradicted denies access until resolved.',
    '- DECISION: which gap to close this week, knowing the others stay open another week.',
    '- REFUSES: an antagonist who spends resources against the player. Nothing is coming FOR them; the difficulty is epistemic. Grow a pursuer and you have changed family.',
    '- Usually: persistent board marks; a companion holding partial results; ciphers that open access.',
    '',
    '**Heat**',
    '- PRESSURE: attention. The world spends AWARENESS: it rises when the player acts loudly, falls only when they accept a slower week.',
    '- DECISION: push or lie low, priced. Every acquisition has a loud price and a quiet one, and the quiet one costs time the campaign lacks.',
    '- REFUSES: the free action, and forgetting. Nothing costs nothing; attention never decays on its own.',
    '- Usually: a rising track nobody wants; thresholds that change costs; a sink that buys quiet.',
    '',
    '**Attrition**',
    '- PRESSURE: depletion against distance. Stores are spent for the fact of continuing, and the ground left does not shrink to match.',
    '- DECISION: ration: spend now to move well, or arrive thin — a bet about a week not yet visible.',
    '- REFUSES: replenishment on demand, and the free route. Stores are found, never bought at will; every direction costs something different.',
    '- Usually: a depleting die; positions that advance only by paying; a far end visible from week one.',
    '',
    '**Siege**',
    '- PRESSURE: a clock the player cannot stop. The world spends TIME toward an arrival no action of theirs slows.',
    '- DECISION: prioritize inside a fixed budget — what is held, and therefore what is given up. Never enough to hold everything.',
    '- REFUSES: escape and permanence. No outrunning, no negotiating, and nothing fortified stays safe.',
    '- Usually: a racing clock with thresholds; regions held or conceded; a final week that IS the arrival.',
    '',
    '**Stewardship**',
    '- PRESSURE: decay. The world spends CONDITION: surfaces degrade on a schedule the player did not set and cannot pause.',
    '- DECISION: mend — which failing thing gets this week\'s hands, knowing the rest worsen meanwhile.',
    '- REFUSES: total restoration, and blame. Something ends unrepaired, and decay never advances because the player fell short, in the book or the gym.',
    '- Usually: fill clocks as repair; board states that improve where worked and worsen where not.',
    '',
    '**Loyalty web**',
    '- PRESSURE: competing claims. The world spends OBLIGATION: parties wanting incompatible things who notice which one was answered.',
    '- DECISION: choose whom to answer, in public. Standing buys action, and spending it is visible to the others.',
    '- REFUSES: the neutral move and the villain. Nothing satisfies everyone, nothing is unobserved, and every claimant wants something reasonable.',
    '- Usually: opposed tracks moving together; a gate only regard opens; a choice that shuts one door for good.',
    '',
    '**Evasion**',
    '- PRESSURE: a pursuer closing. The world spends PROXIMITY, advancing on the campaign\'s own beats — dates, milestones, revelations.',
    '- DECISION: route versus concealment. The fast line is the known line; distance bought loudly is distance lost later.',
    '- REFUSES: punishing the player\'s week, and the repeatable hiding place. The pursuit NEVER advances because a session was missed — print that rule — and no cover works twice.',
    '- Usually: a drain clock on the spine; caches along the alternates; positions that name the cost of leaving.',
    '',
    '**Observance**',
    '- PRESSURE: exactness. The world spends the RITE\'s demands: a form kept precisely while conditions make precision harder each week.',
    '- DECISION: keep the rite or keep the day — which part of the form is done correctly when the week does not allow all of it.',
    '- REFUSES: grading the player, and improvisation. Nothing says they were devout enough; a lapse changes what the rite MEANS rather than subtracting. The form is given.',
    '- Usually: standing read as position, not skill; slots that fill and overwrite; a printed order of operations.',
    '',
    '**Rivalry**',
    '- PRESSURE: a counterpart\'s authored progress. The world spends ANOTHER\'S ADVANCE: a rival whose weekly position is printed in advance.',
    '- DECISION: wager against a posted result — how much to stake on beating a number already known and unchangeable.',
    '- REFUSES: the villain, and reactivity. The rival is not an enemy, and nothing the player lifts, rolls or marks moves their line.',
    '- Usually: two clocks on different schedules; a stake spent before a result is read; a final week as the meeting.',
    '',
    '### Step 5b: How the family is chosen (consonance, then program shape)',
    'The family is DERIVED, never picked at random. Two signals propose; the triptych disposes.',
    '',
    'FIRST, the brief\'s emotional core — the mechanic must BE the theme, not represent it:',
    'urgency or a deadline arriving -> `siege` · corruption or exposure -> `heat` · competing',
    'loyalties -> `loyalty-web` · scarcity or going without -> `attrition` · discovery or buried',
    'knowledge -> the reconstruction cluster · trust or keeping something alive -> `stewardship`',
    '· pursuit or dread -> `evasion` · devotion or exactness -> `observance` · competition or',
    'pride -> `rivalry`. This proposes; it does not decide. Depart from it when the sharper',
    'reading demands it, and say so in `selectionReason`.',
    '',
    'SECOND, the program\'s shape from the derived-context block (physiological congruence,',
    'promoted from a pacing rule to a genre signal): a program that PEAKS late means a `siege`',
    'candidate must appear in the triptych; a STEADY grind makes `attrition` live; a WAVE or',
    'deload rhythm makes `evasion` live. An unknown shape removes the signal, never forces a',
    'default. Binding: the program\'s shape must be legible in at least one candidate, and the',
    'winning family must be defensible from the brief.',
    '',
    '### Step 5c: What the family OBLIGES (doors)',
    'The eight pressure families — `heat`, `attrition`, `siege`, `stewardship`, `loyalty-web`,',
    '`evasion`, `observance`, `rivalry` — each name a decision the player owns weekly, so every',
    'non-boss, non-deload week owes a `week.doorChoice` with a posted lean on both sides. The',
    'seven reconstruction families owe none: nothing spends against the player there, so there is',
    'often no lean that can be posted honestly, and an unposted door is a coin flip. They may',
    'still print one on a week that genuinely forks.',
    '',
    '### Step 6: Choose the convergence pattern',
    'Set `convergencePattern` to one of: `sequential-assembly` | `reordering` | `red-herring` |',
    '`dual-source`. This is the SHAPE of the endgame — how a block of collected weekly values becomes',
    'the password. The macro-genre varies the middle of the book; this varies the end. Do NOT',
    'default to `sequential-assembly` every time. Read the Convergence Design section before',
    'choosing: it states what each pattern may and may not change, and one of them carries a',
    'hard requirement on what the boss page must state.',
    '',
    '### Step 7: Declare document ecology',
    'Set `documentEcology`:',
    '- `dominant` (string[], 2-3 types): document types that make up 50%+ of fragments',
    '- `forbidden` (string[], 1-3 types): document types that must NOT appear in this booklet',
    '',
    'Valid types: memo, report, inspection, fieldNote, correspondence, transcript, form, anomaly.',
    '',
    'The ecology must feel native to the artifact. A court packet is mostly transcript and',
    'correspondence. A ship log is mostly fieldNote and inspection. Do not use all 8 types.',
    '',
    '### Step 8: Declare exclusions',
    'Set `exclusions`:',
    '- `mechanicExclusions` (string[], at least 1): mechanic grammar families or board-state',
    '  modes this booklet will NOT use',
    '- `documentExclusions` (string[], at least 1): same as forbidden in ecology — reinforced here',
    '- `arcExclusions` (string[], at least 1): arc families this booklet is NOT following',
    '',
    'Exclusions are identity. Every booklet must refuse something.',
    '',
    'NEIGHBOUR RULE. A booklet must refuse the families it is most likely to slide into, which',
    'are never the distant ones. Neighbour pairs: `heat`<->`rivalry` (both press a wager against',
    'a counterparty who keeps score), `attrition`<->`evasion` (both spend to move while stores',
    'fall), `siege`<->`stewardship` (both hold the same walls, against assault or against decay),',
    '`loyalty-web`<->`observance` (both answer to something outside the player: people, or a form).',
    '- Chose one of the eight macro-genres? `mechanicExclusions` must name at least one NEIGHBOUR.',
    '- Chose a reconstruction family? Name at least TWO of the other six — they are all siblings,',
    '  so they blur fastest of all.',
    '- Refusing a distant family is free and proves nothing. The refusal must forbid the move',
    '  your book will actually be tempted to make in the middle of the block, and it must hold',
    '  in the built booklet: a `heat` book that refuses `rivalry` and then prints a rival\\\'s weekly standings',
    '  has broken its own contract.',
    '',
    '### Step 9: Name the home pull',
    'Set `homePull` to one of: `story` | `game` | `investigation` | `mixed`',
    '',
    'This is: what kind of evening object is this when the lifter opens it at home?',
    '- `story`: the player returns for narrative curiosity',
    '- `game`: the player returns for mechanical progression',
    '- `investigation`: the player returns to assemble evidence and solve',
    '- `mixed`: balanced pull across dimensions',
    '',
    '### Step 10: Record the reading',
    'The winning candidate from Step 3 stops being private. Write it down.',
    '',
    'Set `reading` to an object with all seven fields, in your own words (these are free',
    'strings — a record of how you read this brief, not a menu to pick from):',
    '- `tone`: the emotional register you committed to',
    '- `register`: the prose style you committed to — under the derivation law, never defaulted',
    '- `povFrame`: who experiences this story and through what frame',
    '- `impliedSetting`: where and when',
    '- `emotionalArc`: what changes for the protagonist by the end',
    '- `genreTemplate`: the genre conventions now in force — derived from the brief\'s own words',
    '- `ludicReading`: what KIND OF GAME this brief wants. 1-2 sentences: what the player',
    '  is doing minute to minute, what they spend, and what they can lose. A brief implies a',
    '  game the way it implies a tone — "a siege that never lifts" is a pressure that only',
    '  rises; "a season of repairs" is husbandry. Read it, do not default to it.',
    '- `briefEvidence`: 1-2 sentences naming the ACTUAL phrases in the brief that drove this',
    '  reading. Quote or name the words that are there. If the brief cannot support a claim,',
    '  do not make the claim — write what the brief actually gives you, even if that is little.',
    '',
    'Set `selectionReason` (string): why this candidate beat the other two. Name the tension',
    'it buys and the axis on which it differed from the runner-up. "It fit best" is not a',
    'reason; a reason survives someone disagreeing with it.',
    '',
    'The reading is BINDING and it is AUDITABLE. Later stages write against it, and the',
    'composition critic grades the finished booklet against this recorded reading — a reading',
    'the brief cannot support becomes a cited finding, not a vague complaint about tone.',
    '',
    '### Step 11: Compose the play, do not assemble it',
    'A book of individually good components is still a series of things to do. Fun is not a',
    'property you can request per component — every oracle wants to be evocative and every',
    'clock wants stakes, and none of that makes them listen to each other.',
    '',
    'So COMPOSE. Pick TWO to FOUR playable systems and wire them into ONE economy where each',
    'one reads what another writes. Not a parts list: a sentence. What the marks feed, where',
    'it banks, what the banked thing buys, what that opens, and what answers it.',
    '',
    'Three rules that decide whether the composition is real:',
    '- Every spend has a destination the book DRAWS. A price with nothing on the other side',
    '  of it is a dead sink.',
    '- Every clock, track or counter is READ by something. A clock nothing reads is scenery',
    '  with a number on it.',
    '- Every fork changes something a player could point at. If the only difference between',
    '  two branches is which adjective describes them, it is not a choice.',
    '',
    'The shape of the economy follows the mechanic grammar family you chose in Step 5, not a',
    'house pattern: pressure that only rises does not bank, husbandry does not race, and a',
    'chase does not accumulate. Two books from the same brief class must still differ in what',
    'the player DOES, not only in what the pages say.',
    '',
    'And be honest when the brief wants something this engine cannot print. Say so plainly',
    'rather than dressing an existing system up as the missing one — a tally strip called a',
    'deck is still a tally strip, and the player finds out on page one.'
  ];

  // ── The three unchosen choices (D144) ─────────────────────────────────────
  // MEASURED, not suspected. The real standard-pipeline shell prompt is 77,061
  // characters and contains the string `field-survey` zero times — and
  // `classified-packet`, `ship-logbook`, `witness-binder`, `court-packet`,
  // `devotional-manual`, `household-archive` and `technical-manual` zero times
  // each. `shellFamily` appears once, inside a field list. The compiler has been
  // declaring the artifact's whole filing identity from a vocabulary no prompt
  // surface ever showed it, and it answered the way anything answers an
  // unmenued question: with the most available option. That is the mechanism
  // under D135's byte-identical government dress, and it is not a taste problem.
  //
  // Three choices had the same shape and are fixed together, because they fail
  // together: the SHELL (what kind of object this is), the DOCUMENT ECOLOGY
  // (what it is made of) and the HOME PULL (why the reader opens it). Each now
  // gets a menu with peers, a derivation demand in D136's exact form, and an
  // anti-default naming the specific reflex it has to beat.
  //
  // ROUTING: `shell` + `skeleton`, and DELIBERATELY NOT the single-prompt
  // bundle. Two independent reasons, and either one alone would be enough.
  // (1) The ceiling: the real paste prompt measures 114,307 of its ratified
  // 115,000 characters, and this section is ~4,000. Landing it there would
  // require a compression ruling first (D136's standing condition), which is an
  // author decision and not this wave's. (2) The precedent: DESIGN_LANGUAGE
  // (D139) and the puzzle sections (D132) are stage-only for the same arithmetic
  // and the paste path renders as its archetype, which is what an archetype is
  // for. The compiler's own Steps 7 and 9 are UNCHANGED on every surface, so
  // nothing here is pointed at from a path that lacks it — the dangling-pointer
  // defect Step 5c earned in D111.
  //
  // The table's two clauses per family are BYTE-QUOTED from SHELL_FAMILY_GUIDANCE
  // in contracts/contract-constants.mjs and diffed both directions by
  // `shellMenuParity()` in validate.mjs, count included, along with the
  // investigation line and the institutional-referent terms. One home, one menu
  // (D124): a shell added there is offered here or the build fails.
  window.INST_SHELL_CHOICE = [
    '## Choosing the Shell, the Ecology and the Pull (compiler Steps 7, 7a, 9)',
    'Three of the compiler\'s choices decide what this artifact IS before a word of it is',
    'written. Each one below is a MENU, and each one is under the derivation law: the answer',
    'must be traceable to words the brief actually contains. Name the phrase in',
    '`selectionReason`. "It fit best" is not a derivation.',
    '',
    '### Step 7a: Choose the shell',
    'Set `artifactIdentity.shellFamily` to exactly one of these eight. The shell is the KIND OF',
    'DOCUMENT SET this book is — it decides the chrome, the citation grammar, the voice of every',
    'label, and what the reader thinks they are holding.',
    '',
    '| Shell family | What kind of world files this way | What it refuses |',
    '|---|---|---|',
    '| `field-survey` | a world that goes out and measures the ground itself — sheets filled in where the work happened, stations numbered in the order they were walked | the verdict; a survey records what was found and leaves the judging to whoever reads it later |',
    '| `classified-packet` | a world with something to withhold and an apparatus for withholding it — compartments, clearances, a cover sheet naming who may not read on | the personal voice; a packet is assembled by a body that outlives the people inside it |',
    '| `ship-logbook` | a world that stands watches — the entry gets made because the hour came, whether or not anything happened in it | hindsight; a log is written forward and does not yet know what it is recording |',
    '| `witness-binder` | a world rebuilt out of what people said — statements taken one at a time, tabbed and cross-referenced by someone who was not there | a single authoritative account; the binder\'s whole shape is that the accounts disagree |',
    '| `court-packet` | a world where a claim is being decided — exhibits, schedules and recitals filed by parties who each want a different answer | neutrality about the outcome; every document in it was filed BY someone, FOR something |',
    '| `devotional-manual` | a world that keeps an observance — offices, rubrics and antiphons telling a practitioner what to do and when, year after year | novelty; the manual\'s authority is that it has said the same thing for a very long time |',
    '| `household-archive` | a world that kept its own papers without meaning to — bundles, drawers and loose leaves in no order but the order they were put down in | the finding aid; nobody catalogued this, which is exactly why what is in it surprises the reader |',
    '| `technical-manual` | a world that is OPERATED — figures, clauses and procedures written so a competent stranger can keep the thing running | the story of who wrote it; a manual is addressed to whoever is holding it now |',
    '',
    'FOUR OF THESE CARRY AN INVESTIGATION without a security apparatus: `field-survey`,',
    '`witness-binder`, `court-packet`, `household-archive`. If the player is assembling evidence,',
    'these are your peers — a survey, a binder of statements, a filed claim and a drawer of family',
    'papers are all evidence-shaped, and none of them needs a security apparatus to be one.',
    '',
    'ANTI-DEFAULT. `classified-packet` is a PEER on this list, never the default. A brief that',
    'names no bureau, ministry, agency, department, institute, academy, commission, directorate,',
    'authority, tribunal, constabulary, precinct, administration, secretariat or inspectorate does',
    'not file as a security packet. Redaction bars, clearance stamps and cover sheets are the',
    'furniture of one specific world; a theatre, a household, a ship, a congregation and a',
    'workshop each keep records, and',
    'none of them keeps them like that. If you choose `classified-packet` over a brief with no',
    'such body in it, `selectionReason` must say what in the brief\'s own words put it there.',
    '',
    'The shell and the archetype are different questions. The archetype is how the page LOOKS;',
    'the shell is what the object IS. A pastoral book can be a court packet; a government-styled',
    'book can be a household archive. Do not let one choose the other.',
    '',
    '### Step 7 (document ecology), under the same law',
    'Your `documentEcology.dominant` is what this artifact is MADE OF, and it follows the shell',
    'you just chose plus the brief\'s own nouns — not a general sense of what serious documents',
    'look like. A repertory theatre files correspondence, transcripts and fieldNotes; a ship',
    'files fieldNotes and inspections; a household files letters and forms. `memo` and `report`',
    'are the two the model reaches for when it has not decided, so a booklet that names both as',
    'dominant owes a phrase from the brief that put an office in it.',
    '',
    '### Step 9 (home pull), under the same law',
    '`homePull` is what brings the lifter back to the book on a rest day, and all four values',
    'are peers: `story` | `game` | `investigation` | `mixed`. `investigation` is a real answer',
    'for a book with no crime and no agency in it — assembling evidence is a VERB, and a season',
    'of repairs, a rehearsal block or a shipping route can each be assembled from evidence. It',
    'is also NOT the safe answer: choose `game` when the return is mechanical progression and',
    '`story` when it is narrative curiosity, and say in `selectionReason` which phrase in the',
    'brief decided it.'
  ];

  // ── The two-source law (VISION §11, D146) ─────────────────────────────────
  // The DOCTRINE half. The per-run assignments are values, not text, so they
  // reach the model through `formatSeedAssignmentBlock()` below — but every
  // SENTENCE about what to do with them lives here, in the file that owns
  // prompt content, and the builders only ever call the formatter.
  //
  // WHY THIS EXISTS AT ALL, stated for the model as bluntly as it is stated in
  // the vision: D144 gave the shell a menu and measured the result — showing a
  // menu removes the EXCUSE for a default, not the default itself. A model
  // handed eight equally-described shells and no reason to prefer one answers
  // with whatever it always answers. So the die goes first.
  //
  // ROUTED to the compiler seats (`shell`) and to `campaign-plan`, which is the
  // stage that declares the board geometry. NOT on the single-prompt bundle:
  // the paste path draws no run seed, has no record to be reproducible from,
  // and is 318 characters from its ratified ceiling.
  window.INST_SEED_ASSIGNMENT = [
    '## Assigned identity — the two-source law',
    '',
    'This book is procedurally generated, and the system owns the dice. Every identity choice',
    'you make below has exactly TWO legitimate sources, and there is no third:',
    '',
    '1. BRIEF-FUNDED — the brief\'s own words earn it. You take it, and you record the words',
    '   that earned it in the evidence field named beside that choice. The citation is checked.',
    '2. SEED-ASSIGNED — the system already drew it, from the full menu, before you read this.',
    '   You TRANSCRIBE it exactly. The evidence field then records the assignment, not an',
    '   argument for it.',
    '',
    'A choice that is neither is a DEFAULT, and defaults are findings against this book.',
    '',
    'TRANSCRIBED, NEVER IMPROVED. An assignment is not a suggestion and not a starting point.',
    'Do not move it toward something that "fits better" — fitting it is YOUR work, not the',
    'die\'s. A seed-assigned shell, archetype or texture is a CONSTRAINT the rest of the book',
    'is built to earn, exactly the way a constraint you were given by a client would be. Books',
    'that are all comfortable choices are the books that come out identical.',
    '',
    'WHEN THE BRIEF REALLY DOES FUND A CHOICE, TAKE IT. The brief outranks the die wherever it',
    'actually names something — a brief that says "my grandmother\'s recipe box" has chosen its',
    'shell, and no assignment overrules the user\'s own words. What the die outranks is HABIT:',
    'the choice you would have made because it is the one you always make. So the test for',
    'departing from an assignment is not "does the brief permit this?" — almost anything is',
    'permitted — it is "can I quote the phrase that requires it?" If you cannot quote it, the',
    'assignment stands.',
    '',
    'HOW A DEPARTURE IS RECORDED, because this is CHECKED and a stage fails without it: when',
    'you take something other than the assignment, the evidence field named beside that choice',
    'must NAME THE VALUE YOU TOOK, next to the brief words that earned it. One sentence about',
    'the shell does not fund a different archetype, a different texture and a different pull —',
    'each departure is written down where it happened, or it reads as a default.',
    '',
    'ONE EXCEPTION, already law: the board geometry. The mechanic grammar family DECIDES the',
    'board — if the assigned geometry\'s `Serves` row does not name your declared family, take',
    'the family\'s board and say in `selectionReason` which verb settled it. That is not a third',
    'source: the family is itself one of these choices, so a geometry the family forces is',
    'funded by whatever funded the family.'
  ];

  /**
   * formatSeedAssignmentBlock(assignments, axes) -> string
   *
   * THE PER-RUN GIVENS. `assignments` is what the die said (drawn once per run
   * by the orchestrator, from the seed recorded on the booklet); `axes` is the
   * stage's slice of IDENTITY_AXES, passed in because this file is a classic
   * script and cannot import the contract module.
   *
   * Returns '' when there is nothing to hand over — no seed context, no
   * assignments, no axes — so the paste path and every hand-assembled caller
   * build the prompt they always built, byte for byte. The obedience floor is
   * silent under exactly the same condition, and that pairing is the contract:
   * a stage never checks an assignment it was not shown.
   */
  window.formatSeedAssignmentBlock = function (assignments, axes) {
    if (!assignments || typeof assignments !== 'object') return '';
    if (!Array.isArray(axes) || !axes.length) return '';
    var rows = [];
    for (var i = 0; i < axes.length; i++) {
      var axis = axes[i];
      var value = assignments[axis.id];
      if (!value) continue;
      rows.push('- ' + axis.label + ' IS `' + value + '` — evidence field: `' + axis.evidencePath + '`');
    }
    if (!rows.length) return '';
    return [
      '### The assignments for THIS book',
      '',
      'Drawn from this book\'s run seed, across each full menu, before you saw the brief. Each',
      'line is a GIVEN. Write it exactly — or write something else and, in the evidence field',
      'named on that line, NAME the value you took and quote the brief phrase that required it.',
      ''
    ].concat(rows).join('\n');
  };

  // ── The Ludic Spine (W4a) ─────────────────────────────────────────────────
  // Routed to the `shell` stage ONLY, because that is the stage that authors
  // meta and therefore the only stage that can write a spine — and because the
  // closure floors that enforce it are stage gates on the API pipelines.
  //
  // The single-prompt bundle deliberately does NOT carry this section: it is
  // already the largest prompt in the system, the floors do not run on the
  // paste path, and INST_ARTIFACT_COMPILER Step 11 is written self-contained so
  // the paste path still gets the composition DISCIPLINE without the JSON
  // shape. A pointer from Step 11 to this section would dangle on that surface
  // — the exact defect Step 5c's "Read the Door Bias section" was (D111).
  //
  // NO WORKED SPINE, ever (D47). The family table below is a MENU of economy
  // SHAPES, one clause each; a single filled-in example would install one house
  // economy in every book, which is the disease this whole section exists to
  // prevent (PLAY.md §2, "the house economy").
  window.INST_LUDIC_SPINE = [
    '## The Play Spine (meta.playSpine — REQUIRED)',
    'Step 11 of the compiler said what to compose. This is where you write it down, in a',
    'shape a machine can check. A book whose systems do not reference each other is rejected',
    'at this stage, so declare the wiring here and then BUILD what you declared.',
    '',
    '### Surface refs — how the spine points at things',
    'Every edge names a surface as `kind:id`, or one of three singletons.',
    'Kinds: `week:W3` `session:W3.2` `markStrip:W3.2` `reckoning:W3` `clock:<clock name>`',
    '`oracle:W4` `cipher:W2` `map:<region or board name>` `companion:<label>` `fragment:F.07`',
    '`door:W5` `seal:<fragment id>` `ending:E2`',
    'Singletons (no id — a book has at most one): `banked` `boss` `assembly`',
    'Use the names you are actually giving these surfaces. A ref to a week this book does',
    'not have, or to a fragment outside your registry, is a blocking error.',
    '',
    '### The seven declarations',
    '- `composition` (array, 2-4 items): `{ entry, role }`.',
    '  `entry` is a CLOSED menu — the systems this engine can print:',
    '  `reckoning-economy` (marks tally, bank, price spends) · `board` (the map and its',
    '  regions) · `decode-chain` (the weekly cipher) · `clock-bank` (fill / drain / race /',
    '  tug-of-war) · `companion-kit` (dashboards, tracks, stats, inventories) ·',
    '  `oracle-pull` (the d100 table) · `door-fork` (the week\\\'s posted choice) ·',
    '  `sealed-cache` (sealed-by-honour content and its key) · `boss-convergence` (the',
    '  endgame ceremony, assembly and locked finale) · `ledger-audit` (the body audited) ·',
    '  `deduction-board` (a logic grid, a nonogram or a sudoku — machine-proven solvable and unique) ·',
    '  `word-hunt` (a letter board whose hidden words are machine-verified in it) ·',
    '  `arithmetic-grid` (a kakuro or a KenKen: the player ADDS rather than eliminates, and every',
    '  filling is machine-proven unique).',
    '  Entries must be DISTINCT. `role` is a sentence in your own words: what this system',
    '  does in THIS book. "It is the map" is not a role; "the map is the only place a spend',
    '  becomes visible" is.',
    '- `honestGaps` (string[]): what the brief wanted that the list above cannot print.',
    '  Write it plainly. This is not a failure — it is the record that stops a tally strip',
    '  from being described as a deck. Empty array if the brief asks for nothing missing.',
    '- `economyGraph` (array): `{ from, to, currency? }`. Named edges, never implied.',
    '  At least one edge must START at a tick origin (`markStrip:` / `session:` / `week:`)',
    '  and at least one must END at a surface the book draws. Every node must be reachable',
    '  from a source and reach a printed sink. Omit `currency` on edges that move the player',
    '  without spending anything (a key opening a gate); do not invent one.',
    '- `consequenceEdges` (array): `{ source, answeredBy, withinWeeks }`. Every fillable',
    '  thing names the surface that answers it. `withinWeeks` is 0, 1 or 2 — 0 means the',
    '  same week. An answer further out than you declare is a blocking error, and an answer',
    '  in an EARLIER week than its question is printed before it is asked.',
    '- `decisionLedger` (array): `{ fork, differsBy }`. One row per door, `fork` written as',
    '  `door:W3`. `differsBy` must name a MECHANICAL surface that changes — a clock, a price,',
    '  a region, a gate, a table. Adjectives are not differences.',
    '- `tensionBudget` (array, one row per week): `{ week, scarce?, losable?, fallBehind? }`.',
    '  At least ONE axis named per week. Leaving an axis out is a declaration that this week',
    '  has none of it, which is a legitimate thing to say — a deload week often has exactly',
    '  one. All three empty is a week with nothing at stake.',
    '- `difficultyCurve` (object): `{ keyedToLoad, shape, perWeek }`. `keyedToLoad` is a',
    '  boolean: true when the puzzles harden as the lifts do, false when the brief warrants',
    '  something else. False is a real answer, not a failure — say what the curve does',
    '  instead in `shape`, and give one clause per week in `perWeek`.',
    '',
    '### The economy\\\'s SHAPE follows the family (choose from this menu)',
    'The mechanic grammar family you chose in Step 5 already decided what the world spends',
    'against the player. The economy must move the same way, or the book says one thing and',
    'plays another. Pick the row you chose and build that shape:',
    '',
    '| Family | What the economy DOES |',
    '|--------|----------------------|',
    '| `heat` | Rises only. Nothing the player does lowers it; spends BUY TIME, they do not reduce the number. No banking against heat — the pressure is not a currency. |',
    '| `attrition` | Drains. The player starts with something finite and every week takes some. Spends slow the drain or convert it; the graph runs downhill. |',
    '| `siege` | Two clocks race in opposite directions — what holds and what closes. Spends reinforce one at the cost of the other; nothing is neutral. |',
    '| `stewardship` | Grows if tended. The player invests and the thing repays later; neglect is the only loss. The graph has loops that pay back, not just sinks. |',
    '| `loyalty-web` | Tugs. Spending on one relationship spends against another; the same currency moves two tracks in opposite directions. |',
    '| `evasion` | Races. Position matters more than accumulation; the player converts marks into distance or cover, and standing still costs. |',
    '| `observance` | Accrues by discipline. Rites kept on schedule earn; a missed observance costs more than it earned. The clock is a calendar. |',
    '| `rivalry` | Compares. Every player gain is measured against a rival\\\'s standing; the economy prints BOTH sides and the gap is the state. |',
    '| the seven reconstruction families | Assemble. Marks buy access to gaps — a shaded cell, a decoded line, a named node — and the picture is the state. Nothing spends against the player; the scarcity is what is still unknown. |',
    '',
    'The row is the SHAPE, not the content. Two heat books both rise; what rises, what it',
    'costs to hold it back, and what the number is called are yours.',
    '',
    '### The harvest patterns (optional, and strict once used)',
    'The composition above says which SYSTEMS this book prints. These say how they are WIRED.',
    'Take the ones the brief actually wants and leave the rest — a book that uses none of them',
    'is a legitimate book. A book that half-declares one is not: every field below is required',
    'once its object exists, because a hint with no cost and a milestone with no page are',
    'records that check as nothing.',
    '',
    // OUTPUTS (D144) is byte-quoted from each entry's `outputs` field in
    // contracts/ludic-library.mjs, and `harvestOutputsParity()` in validate.mjs
    // diffs it. The column earns its width: this table previously said what
    // each pattern COSTS you to get wrong and never what it GIVES you, so a
    // model reading it saw nine ways to fail and no reason to adopt one.
    '| Pattern | Declare it as | What you get | What it costs you to get wrong |',
    '|---------|---------------|--------------|--------------------------------|',
    '| `gate-structure` | `gateStructure` (REQUIRED, see below) | A shape the economy graph must actually have — the floor reads the declared structure back off the graph. | Declaring a shape the graph does not have |',
    '| `hint-ladder` | `hintLadders[]` | A player who is never hard-stuck, a threat clock that remembers they were, and a band the reader finds at the point of use. | A free hint, which is a walkthrough |',
    '| `deduction-milestone` | `milestones[]` | A theory the player commits to in pencil, and the surface that answers it. | A theory nothing answers |',
    '| `legacy-pencil-move` | `legacyMoves[]` | A book that is visibly a record of one campaign and cannot be replayed clean. | Permanence with no page it happens on |',
    '| `branch-attributed-consequence` | `economyGraph[].branch` | A fork whose branches genuinely differ, and a simulated player that can walk each side. | A fork whose sides are two labels |',
    '| `priced-spend` | `economyGraph[].price` | A budget the player plans against, and a stingy/greedy choice that is a real trade rather than a schedule. | A price nobody at 60% adherence can pay |',
    '| `timed-affordance` | `economyGraph[].closesAtWeek` | A deadline the schedule can be measured against. | A window that shuts before it opens |',
    '| `found-not-found-gating` | an `economyGraph` edge INTO a `seal:` | Gated content that opens exactly once the player has earned it. | A locked page with no key |',
    '| `book-referential-examination` | a cross-reference cipher | A puzzle only a player who has actually read this artifact can solve. | Citing a page this book does not print |',
    '',
    'DECLARE WHAT YOU BUILT, in `harvestPatterns` (string[], optional): the ids from the first',
    'column of the patterns you actually wired. Declaring none is legal and common. Declaring one',
    'you did not build is not — the floors read each declared pattern back off the artifact, so',
    'this list is a promise rather than a label.',
    '',
    'IF A PATTERN WAS ASSIGNED TO YOU, ANSWER IT. When the GIVENS name a harvest pattern, you',
    'have exactly two replies and silence is not one of them: build it and list it here, or',
    'DECLINE it in `selectionReason` — write the pattern id and the one sentence saying what this',
    'book does instead. Declining is a real answer and costs you nothing; a book that composes',
    'with none of these patterns is still a legitimate book. What is checked is that you said so.',
    'Leaving the field out is not "none", it is no answer at all, and the stage fails on it.',
    '',
    'SEALED GATING IS PRINTED, NOT PHYSICAL. A `seal:` is a page the book asks the player not to',
    'read until they hold the key — a printed instruction and an honour system, in the same kit as',
    'a pencil and two dice. It is never an envelope, a glued flap, a page to cut, or anything the',
    'reader must physically open. If the world wants a sealed thing, the seal is a line of text on',
    'the page saying what must be true before you turn to it.',
    '',
    '- `gateStructure` (REQUIRED, one of "open" | "sequential" | "path-based"): how this book',
    '  gates. **open** — several leads run at once and one meta needs all of them (owes three',
    '  distinct leads and one surface taking three feeders). **sequential** — each answer is',
    '  the next question (owes a chain three edges long). **path-based** — two or more lanes',
    '  that converge (owes two leads, a three-edge chain, and a surface taking two feeders).',
    '  The floor reads this back off your economyGraph. Declare the shape you actually wired.',
    '- `hintLadders` (array, at most 3): `{ puzzle, printedOn, label, rungs[] }`. `puzzle` is the',
    '  ref the player gets stuck on; `printedOn` is where the rungs are printed — usually the',
    '  same page. 2-3 rungs, each `{ cost, gives }`, in order: a nudge, then the method, then',
    '  at most the answer. `cost` is paid in something this book already tracks (a clock tick,',
    '  marks, a crossed-out option) and must get DEARER down the ladder.',
    '  `label` is the BAND\'S OWN HEADING, in this world\'s voice and this artifact\'s idiom — the',
    '  words a reader sees above the rungs. Never "Hints" and never "If you are stuck": those',
    '  are the engine talking, and nothing printed in this book is the engine talking.',
    '  The rungs PRINT AS THEIR OWN BAND on the surface `printedOn` names. Do NOT also write',
    '  them into that surface\'s prose — the band is where the player reads them, and saying it',
    '  twice spends the page on a repetition.',
    '- `milestones` (array, at most 4): `{ label, at, unlocks, printedOn }`. `at` is a COUNT the',
    '  player can check against their own page (marks banked, regions opened, fragments',
    '  decoded). `unlocks` is a ref, and some consequenceEdge must mention it — a theory the',
    '  book never answers is an unpaid promise.',
    '- `legacyMoves` (array): `{ move, printedOn, makesPermanent? }`. `move` is one of',
    '  "cross-out-forever" | "permanent-map-mutation" | "standing-rule-unlock" |',
    '  "sealed-by-honour" | "session-count-gate". Each kind at most once. These are the whole',
    '  legacy vocabulary a pencil can perform: crossing out the road not taken, adding to the',
    '  map and never removing, a rule that reads "from now on…", a page sealed by honour, a',
    '  page that opens after N sessions. Anything needing a sticker, a seal, or scissors is',
    '  excluded by the kit, not missing from this list.',
    '',
    '### Three fields on an economy edge',
    '- `branch` — which side of a fork this edge belongs to, written `door:W3/A` or `door:W3/B`.',
    '  Use it and the two sides of your fork become mechanically different things rather than',
    '  two names. If you attribute ONE side, attribute the other too: a fork with one declared',
    '  side is a fork where the player who picks the other gets whatever is left. Anything the',
    '  book must reach must be reachable on BOTH sides.',
    '- `price` — what a spend costs, as a whole number of MARKS. Marks, not the currency label:',
    '  marks are what the session strips count and what the reckoning threshold is derived in,',
    '  so a price in marks is a number the machine can check against what a player at realistic',
    '  adherence will actually have. The page still says "two Relief"; this says how many marks',
    '  that is. Price the edges OUT of `banked`. Never price the edge into `boss` or `assembly`',
    '  — that gate is the derived reckoning threshold and it already has a number.',
    '- `closesAtWeek` — the last week an affordance can be taken. Without one, nothing in a',
    '  pencil book ever expires and hoarding costs nothing. One or two real windows is what',
    '  makes saving a decision.',
    '',
    '### Book-referential examination (and the one hard ban)',
    'When you want a puzzle that tests attention, make THIS BOOK the reference: a cross-',
    'reference cipher whose answer is a coordinate into pages this book prints — a fragment id',
    'and a line, a region already opened, a value already banked. Every cited surface must be',
    'printed EARLIER than the puzzle citing it.',
    'NEVER write real-world trivia — history, geography, science, dates, celebrity, anything',
    'the player would have to know from outside. It is unverifiable by this engine, it ignores',
    'the brief, and it fails outright for any player who has not read what you read. The book',
    'is the only reference work at the bench.',
    '',
    '### When the brief wants something this list cannot do',
    'Say so in `honestGaps`, by name. Card decks, cut tokens, decoder wheels, overlays and',
    'stickers are excluded by the kit and always will be; logic grids, word grids, action',
    'drafts, suspect matrices and faction clocks are on the shelf and not yet built. Naming one',
    'is the record that stops a tally strip from being described as a deck. It is never a',
    'failure — inventing an entry to cover the gap is.',
    '',
    '### Length',
    'This book has as many weeks as the program does. Express the arc in FRACTIONS of that',
    'number, never in a fixed count: the midpoint shift lands at the middle week, the boss is',
    'the last week, and the tension budget has exactly one row per week the program has.'
  ];

  window.INST_ANTI_GENERIC = [
    '## Anti-Generic Doctrine',
    '- Every content field must earn its space by revealing, recontextualizing,',
    '  altering state, or exposing character through omission. No atmospheric filler.',
    '- No fragment should be transplantable unchanged into a different booklet.',
    '  If you removed the proper nouns, would it still feel specific? If yes, rewrite.',
    '- Later weeks must recontextualize earlier elements. Do not merely intensify',
    '  atmosphere or add more weirdness. The player\'s understanding must change.',
    '- Documents are authored for in-world purpose, not to impress the reader.',
    '  The author of each document does not know they are in a game.',
    '- Final reveals must resolve prior evidence, not introduce new core facts.',
    '- Endings pay off named earlier specifics (places, objects, phrases, relationships),',
    '  not summarize the plot.'
  ];

  window.INST_ANTI_PATTERNS = [
    '## Anti-Patterns (hard reject)',
    '- NEVER write story prompts that are gym metaphors ("your muscles burn like the reactor core", "each rep forges the blade"). The workout is real. The story is fiction. They fuse through timing and tension, not literal mapping.',
    '- NEVER create one-off maps that share no topology between weeks. The player must learn and master a persistent space.',
    '- NEVER make oracle entries that are only atmospheric prose ("a strange feeling washes over you"). Every oracle result must trigger a concrete game action or fiction event.',
    '- NEVER design boss decode as simple arithmetic on weekly values (subtract 40, divide by 3). The decode must require spatial mastery, institutional knowledge, or cross-reference of prior play state.',
    '- NEVER write cipher body displayText that explains its own method ("this uses a substitution cipher where…"). Present the puzzle, not the pedagogy.',
    '- NEVER use LLM cliché phrases: "A testament to...", "A stark reminder of...", "A symphony of...", "A tapestry of...".',
    '- NEVER summarize emotion ("He felt profound sadness"). Describe physical posture, omissions, and action instead.',
    '- PROSE STRIPPING: Do not use the words "delve", "echoes", "cacophony", "visceral", "smirk", or "shudder" unless medically necessary.'
  ];

  // ── Voice discipline ────────────────────────────────────────────────────
  // COMPRESSION, NOT A FORK. This section is the prompt-side compression of
  // docs/voice/VOICE.md (the prose constitution). The two MOVE TOGETHER — the
  // same coupling rule that binds SCHEMA_SPATIAL to contract-constants.mjs.
  // Change one, change the other in the same commit.
  //
  // The licensable-move list below is quoted from VOICE_LICENSABLE_MOVES in
  // contracts/contract-constants.mjs and is validator-asserted (validate.mjs
  // prompt-contract parity). The universal machine-tells are absent from that
  // enum on purpose: they cannot be licensed, so there is no key to write.
  //
  // The universal list carries all TEN bans of VOICE.md §4. Two of them —
  // emotion summary and gym metaphor — also appear in INST_ANTI_PATTERNS, and
  // that dual home is deliberate: ANTI_PATTERNS rides the planning stages
  // (layer-codex, campaign-plan) which carry no VOICE_DISCIPLINE, and
  // VOICE_DISCIPLINE rides the prose stages (shell/skeleton, week-final,
  // fragment, ending) which carried no ANTI_PATTERNS. Neither set alone covers
  // the pipeline. The prohibitions are identical, so this is one rule with two
  // reaches, not two rules that can disagree. VOICE.md §4 is the authority for
  // the wording; §4 itself notes the gym-metaphor ban is "enforced elsewhere
  // too". Change the constitution first, then both surfaces.
  //
  // D47: NO exemplar prose here, ever. This section teaches mechanisms and
  // bans; it never shows a passage to imitate.
  window.INST_VOICE_DISCIPLINE = [
    '## Voice Discipline (prose law — every word of in-world prose)',
    'Applies to: session storyPrompts, interlude title/reason/body, fragment and',
    'overflow document bodies, ending bodies and finalLines, oracle entry text,',
    'boss narrative prose, and epigraphs.',
    'Two surfaces sit OUTSIDE the fiction and take a flat instrument register:',
    'rulesSpread (it teaches a stranger to play) and cipher extractionInstruction',
    '(an operation, not a mood). Flat is correct there, not a lapse.',
    '',
    '### The play kit (hard constraint on anything the page asks for)',
    'The complete kit is THREE OBJECTS: this book, a pencil, and two ten-sided dice.',
    'No scissors, no glue, no printer, no second sheet, no app, no screen, no other person.',
    'Every instruction you write must be performable with those three things and nothing',
    'else. Marking, writing, tracing, circling, crossing out, shading, tallying, folding a',
    'corner to keep a place, and sealing by honour ("do not read this page until...") are',
    'all in. Cutting out, folding into a shape, gluing, punching, aligning one page over',
    'another, and assembling a component are all out — a booklet that asks for them is not',
    'playable at a gym bench, which is where this book is opened.',
    'This binds the PROSE, not only the mechanics: an in-world instruction to "cut along the',
    'dotted line" is the same defect whether it is a rule or a line of fiction.',
    '',
    '### The partition',
    '- Universal bans hold in EVERY genre and can never be licensed away.',
    '- Genre moves are banned by DEFAULT and licensable once, with a budget.',
    'When the two disagree about a passage, the universal ban wins.',
    '',
    '### Universal bans (unlicensable, all genres)',
    '- Echo-callbacks: a word, object, or image repeated later for wry effect.',
    '- Corrective constructions: the sentence that pretends to correct itself to',
    '  land a definition ("not X — X the way Y is Z").',
    '- Wry appositives: a trailing clause commenting on the noun it just named.',
    '- Short-short drumbeats at significance: two clipped sentences in a row at',
    '  the moment that matters. Sentence lengths stay unpatterned near a reveal.',
    '- Assembled endings: closing lines regrouped out of their natural order to',
    '  manufacture a tidy ending. The writer closes on their own last business.',
    '- Narrator amusement: the narration enjoying the material, or itself.',
    '- Mirrored-aphorism closers: chiasmus, negation pivots, and definitional',
    '  equations in terminal position. The pipeline MEASURES this one.',
    '- Typography as mood: lowercase styling, dropped punctuation, spaced letters.',
    '  Standard capitalization and punctuation in every register; format',
    '  conventions belong to the document, never to the mood.',
    '- Emotion summary: naming the feeling instead of recording what showed.',
    '  Posture, omission, and action carry it; a stated emotion replaces it.',
    '- Gym metaphor in the fiction: the workout is real and the story is fiction.',
    '  They fuse through timing and tension, never through literal mapping. No',
    '  lift, set, rep, or bodily exertion stands in as a figure for a story event,',
    '  and no story event is narrated as training.',
    '',
    '### Terminal position is emphasis',
    'A writer chooses where to stop, so stopping at the strange thing is pointing',
    'at it — however plain the sentence. A flat ominous closer is the same move as',
    'a purple one, better dressed. Units end on work, motion, or the next',
    'obligation: filing, travel, weather, the next task. At least three ordinary',
    'sentences follow any anomaly before the unit ends.',
    'Noticing is an action: no gazing, pausing, staring, considering, or feeling a',
    'chill. Attention shows as recorded behavior — an extra measurement, a',
    'photograph, a log entry, a changed route, a mark on the board.',
    'Do not complete the inference for the reader. Record the two facts and walk',
    'on; the reader makes the connection and credits the writer with it.',
    '',
    '### The figurative budget',
    'At most ONE figurative comparison or verbal turn per ~200 words. Zero is',
    'normal and often correct. A storyPrompt (220-character budget) therefore has',
    'NO figurative allowance at all; a fragment body spends at most one.',
    '',
    '### Two-pass order (run both, in this order, inside every prose field)',
    '1. Procedural draft: information only, zero figurative language, correct',
    '   process order, real particulars from meta.worldContract, and the',
    '   selections that in-world writer would plausibly make.',
    '2. Effect pass: alter at most two sentences per ~250 words, inside the budget',
    '   above. Leaving the draft untouched is a legitimate and frequent outcome.',
    'If the procedural draft is boring, the worldContract is thin — deepen the',
    'knowing, never decorate the prose.',
    '',
    '### The voiceSpec (meta.literaryRegister) — author it, then obey it',
    '- `mechanisms` (array, 2-4 strings): what this book’s prose DOES, in',
    '  SELECTION terms — which detail it picks, what it reports first, what it',
    '  refuses to explain. Derive them from the creative brief. Never a vibe',
    '  adjective, never a named author or a specific book, film, or show.',
    '- `authorRegisters` (array of { author, records, omits, format }): ONE entry',
    '  for every named in-world author who writes more than one surface. Identity',
    '  comes from what a writer records, what they omit, and how they format —',
    '  never from flourish, lowercase styling, or aphorism. Two documents by',
    '  different authors must be tellable apart with the bylines removed.',
    '- `licensedMoves` (array, 0 or 1 entries — zero is the normal state): the',
    '  declared exception. Each entry is { move, budget, rationale }.',
    '  `licensedMoves[].move` is a CLOSED enum. Use exactly one of: "aphorism", "direct-address", "fragment-rhythm", "ominous-closer".',
    '  `budget` states a countable ceiling AND where it applies. `rationale`',
    '  states why this brief demands it. A license without a rationale is not a',
    '  license, and a licensed move over budget is a failure like any other.',
    '  License only when the brief genuinely calls for that genre register.',
    '  The universal bans above are NOT in this enum and can never be licensed.',
    '',
    '### The knowing demand (plainness must be funded)',
    'Prose decorates when it has nothing true to select from. The world is',
    'therefore KNOWN before it is narrated, and the knowing is already written',
    'down: `meta.processParticulars` carries this booklet\'s instruments and what',
    'they are actually called, its paperwork realities (what form gates what',
    'access; what gets signed, filed, countersigned, or refused), its order of',
    'operations (what happens first, what cannot happen until something else',
    'does), and its period and regional specifics.',
    'SELECT from that material. Do not invent a parallel set of particulars, and',
    'do not contradict the ones you were given — a second, disagreeing world is',
    'worse than a thin one. If a scene needs a particular the list does not',
    'carry, extend the list\'s own logic rather than opening a new subject.',
    'meta.worldContract remains the roster: who and what exists. The particulars',
    'are how their world works. Both are binding.',
    'Target roughly three true procedural particulars per 150 words of documentary',
    'text. Below that the prose is padding and will reach for turns.',
    '',
    '### Ending audit (run before returning any prose)',
    'Inspect the FINAL TWO SENTENCES of every storyPrompt, interlude, fragment,',
    'overflow document, and ending (including finalLine). This is where the',
    'failure concentrates, so it gets its own pass. Rewrite any that close on an',
    'aphorism, a mirrored or definitional turn, an ironic beat, a short flat',
    'sentence positioned as a closer, two clipped sentences in a row, or an image',
    'of the anomaly. A finalLine lands by naming something specific the weeks',
    'earned, never by cadence alone.'
  ];

  // ── The knowing stage (§11 Wave 1.5) ────────────────────────────────────
  // The SUPPLY side of the funding rule. INST_VOICE_DISCIPLINE's knowing
  // demand tells prose stages to select from authored particulars; this
  // section is what authors them. It rides exactly one stage ('knowing') and
  // writes no prose of its own.
  //
  // D47: no worked examples here. A sample instrument or a sample form name
  // would be house flavor manufactured at the one point in the pipeline whose
  // entire job is to manufacture the BOOK's flavor — the bleed would land
  // upstream of every prose stage at once.
  window.INST_KNOWING = [
    '## The Knowing (author this world\'s process particulars)',
    'You are not writing prose. You are writing down what a person who works',
    'inside this world knows without being told, as a list of flat true facts',
    'that every later writing stage will select from.',
    '',
    '### Why this exists',
    'Prose decorates when it has nothing true to say. Given real material, it',
    'stops reaching for turns; given nothing, it reaches every time. Everything',
    'you author here is the funding for the plainness the prose stages owe.',
    '',
    '### Binding context',
    '- The recorded reading of the brief is BINDING. Every particular must be',
    '  something that could be true in the world that reading describes — its',
    '  tone, register, implied setting, and period. Do not author a second,',
    '  more interesting world alongside it.',
    '- The Core Noun Roster inside meta.worldContract is BINDING. Particulars',
    '  attach to the roster\'s people, places, departments, and objects. A',
    '  particular about a noun that does not exist in this book is waste.',
    '- The artifact intent contract is BINDING. Paperwork realities must be',
    '  paperwork this artifact\'s document ecology would actually produce.',
    '',
    '### What a good particular is',
    '- ONE fact. Flat. A single line. No paragraph, no framing, no reflection.',
    '- SPECIFIC to this world. If the same line could sit in a different',
    '  booklet with the proper nouns swapped, it funds nothing — cut it.',
    '- CONSEQUENTIAL. Prefer the fact that constrains someone: the step that',
    '  cannot be skipped, the signature that gates the door, the reading that',
    '  is always wrong in the same direction.',
    '- KNOWN, not explained. Write it the way an insider would say it to',
    '  another insider — no gloss on why it matters, no aside for the reader.',
    '- TRUE ENOUGH TO BE BORING. A particular that is already dramatic is a',
    '  plot point wearing a procedure\'s coat. The drama is the prose stages\'',
    '  job; yours is to make their drama cost something real.',
    '',
    '### What is not a particular',
    '- Atmosphere, mood, or sensory colour. Those are prose.',
    '- A rule of the GAME (dice, clocks, marks, tick targets). Those are',
    '  mechanics, decided elsewhere. Particulars are facts about the FICTION\'s',
    '  working world.',
    '- Anything about training, lifting, sets, or reps. The workout is real and',
    '  sits outside the fiction.',
    '- A secret, a twist, or a reveal. Particulars are the ordinary floor those',
    '  stand on. If a fact is only interesting once, it belongs to a fragment.',
    '',
    '### Coverage',
    'Spread the particulars across the whole institution or trade, not one',
    'corner of it: the people who make the records and the people who read',
    'them, the routine week and the exception, the thing that always works and',
    'the thing that never quite does.',
    'Return ONLY the JSON object. No commentary, no markdown fences.'
  ];

  // ── Liftoscript grammar (§11 Wave 5) ─────────────────────────────────────
  // The canonicalization stage's whole reference. It is a SYNTAX summary and
  // nothing else: no world flavor, no tone, no example that could seed a genre
  // (D47). Exercise names in the examples are deliberately the most ordinary
  // ones in the language.
  //
  // Facts verified against liftosaur.com/docs/liftoscript (2026-08-11), not
  // recalled. Where the model would otherwise guess, the instruction is to
  // quote instead — see the custom() rule, which is the single most important
  // line in this section.
  //
  // ROUTING (the provisional split, §11 Wave 5 ruling 7): this rides the staged
  // pipeline only, via STAGE_SCHEMA_MAP. The single-prompt path is hard against
  // its 108,000-char ceiling and gets nothing new this wave — same reason
  // INST_POINT_OF_USE was routed to stages in Wave 4a. One line reverses it if
  // the ceiling moves.
  window.INST_LIFTOSCRIPT_GRAMMAR = [
    '## Liftoscript Syntax',
    'The program below is written in Liftoscript, Liftosaur\'s program notation.',
    'Read it as notation, not prose. Transcribe what it says; add nothing.',
    '',
    '### Structure',
    '- `# Week 1` opens a week. `## Day 1` opens a day (one session) inside it.',
    '- Lines under a day are exercises, one per line.',
    '',
    '### Exercise lines',
    '- Shape: `Name[, Equipment] / SetsxReps [modifiers]`.',
    '  `Bench Press / 3x8` · `Bench Press, Dumbbell / 3x5` · `Bench Press / 3x8-12`.',
    '- Modifiers follow the sets-and-reps, space-separated: weight (`100lb`),',
    '  percentage (`60%`), RPE (`@8`), rest timer (`90s`). Any subset, any order.',
    '- A comma separates SET GROUPS on one line: `Bench Press / 1x12 60%, 5x5 60%`',
    '  is one exercise with two groups, not two exercises.',
    '- A `+` after the reps means AMRAP — the last set goes to failure',
    '  (`1x5+`). A `+` after an RPE means log the RPE.',
    '- `Squat / ...Bench Press` reuses another exercise\'s definition;',
    '  `...Bench Press[2:1]` reuses it as written in week 2, day 1.',
    '- A bracket on the NAME is a week range: `Bench Press[1-5] / 3x8` means',
    '  the line applies in weeks 1 through 5.',
    '- `//` starts a note meant for the lifter. `///` starts one that is not.',
    '',
    '### Progression',
    '- `progress: lp(...)` linear progression — add weight on success, cut after',
    '  repeated failure. `progress: dp(...)` double progression — climb the rep',
    '  range first, then add weight. `progress: sum(...)` — total reps across',
    '  sets crosses a threshold, then add weight.',
    '- `progress: custom(...) {~ ... ~}` is a SCRIPT. Do NOT interpret it, do NOT',
    '  summarize what you think it does, and do NOT invent a rule from it. Quote',
    '  the line verbatim into `progressionSummary` and move on. A confidently',
    '  wrong progression is worse than an unexplained one: the lifter cannot',
    '  tell your guess from their plan.',
    '',
    '### Your job',
    '- Emit one entry per week and one session per day, in order.',
    '- Copy exercise names EXACTLY as written. Never rename, translate, expand an',
    '  abbreviation, or add an exercise the program does not contain.',
    '- Resolve `...` reuse and week ranges into the concrete week they land in,',
    '  so every week lists its own sessions in full.',
    '- Put weight, percentage or RPE into `weightField` as written.',
    '- Mark a week `isDeload` only when the program says so.',
    '- `progressionSummary`: one plain sentence naming the progression rule the',
    '  program states, or the quoted `custom()` line, or an empty string if the',
    '  program states none. Never infer one from the numbers.'
  ];

  // ── Progression target (§11 Wave 5) ──────────────────────────────────────
  // The workout-side twin of tomorrow-cut-tonight. Field shape lives in
  // SCHEMA_SINGLE_WEEK; this section is doctrine only.
  //
  // The whole point is the OMISSION rule. Every other optional field on the
  // card gets better when the model reaches for it; this one gets worse,
  // because a progression the model invented is indistinguishable in print from
  // the one the lifter's program actually prescribes — and they will follow it.
  // Staged-path only, same provisional split as the grammar above.
  window.INST_PROGRESSION_TARGET = [
    '## The Progression Target (sessions[].progressionTarget)',
    'A printed program that never says when to add weight has handed its own',
    'advancement back to memory. This prints the rule where the work happens,',
    'with a blank for the number the lifter commits to before closing the book.',
    '',
    '- `rule`: the program\'s OWN progression, restated in the world\'s voice.',
    '  Source it from the program itself — the `progress:` line when the program',
    '  carries one, the stated progression text otherwise. It is a rule, not',
    '  encouragement: it says what happens and when.',
    '- `targetLabel`: the prompt over the write-in. It asks for ONE thing the',
    '  lifter can write in five seconds with the set still in their hands —',
    '  next session\'s number. Not a reflection, not a feeling, not a sentence.',
    '',
    '**OMIT THE FIELD ENTIRELY when the program states no progression.** Do not',
    'derive one from the set and rep numbers, do not carry one over from a',
    'different exercise, and do not supply a generic one. A guessed progression',
    'is worse than none: it is printed in the same ink as the real prescription',
    'and the lifter has no way to tell them apart. Silence is honest here.',
    '',
    '- Keep it to the sessions where the progression actually applies. A',
    '  deload week advances nothing, and saying so on every card is noise.',
    '- Both fields are required together. A rule with no blank is prose nobody',
    '  acts on; a blank with no rule is a question nobody asked.'
  ];

  window.INST_ENDING_STANDARD = [
    '## Ending Standard',
    '- The ending is a found document first, not a summary.',
    '- Pay off at least three recurring details: object, place, relationship phrase, procedure, motif, or earlier contradiction.',
    '- The ending must reflect: (a) the binary choice the player made, (b) the boss encounter outcome, and (c) at least one relationship consequence.',
    '- If there are multiple ending variants, they should differ in emotional register and relationship resolution, not just plot outcome.',
    '- The final line should feel discrete and earned — a sentence the player remembers.'
  ];

  window.INST_STRUCTURAL_RULES = [
    '## Structural Rules',
    '- Exactly one binaryChoice per block, at the midpoint week, never on boss week.',
    '- Exactly one boss week, and it is the final week.',
    '- Boss week `weeklyComponent.value` is null.',
    '- Every fragmentRef must resolve to a real fragment ID.',
    '- `bossEncounter.componentInputs` must match prior weeklyComponent values in order.',
    '- `rulesSpread.leftPage.sections` must include a section explaining the play cadence in-world.'
  ];

  window.INST_SELF_VERIFICATION = [
    '## Final Self-Verification',
    '- meta.weekCount === weeks.length',
    '- meta.totalSessions equals the actual session total',
    '- theme.visualArchetype is one supported renderer value',
    '- weeklyComponent.type matches meta.weeklyComponentType on non-boss weeks',
    '- exactly one boss week exists and it is final',
    '- exactly one binaryChoice exists and it is at the midpoint week',
    '- interludes, if present, include title, reason, and body',
    '- overflow weeks include overflowDocument',
    '- documentType values come only from the supported list',
    '- companion component, interlude payload, map, and clock vocab come only from the supported list',
    '- oracle entries use the field name `text`, never `description` or `label`',
    '- oracle fragment entries include `fragmentRef` pointing to a real fragment ID',
    '- every oracle table has exactly 10 entries using the d100 roll bands "00-09" through "90-99"',
    '- `cipher.body` is an object with { displayText?, key?, workSpace?, referenceTargets? }, never a string',
    '- every cipher `workSpace.style` is one of "boxed-totals", "lined", "blank", "cells" — never prose, never an invented name',
    '- every session carries a markStrip of 3-5 targets, each label 5 words or fewer with no digit anywhere in it',
    '- exactly one markStrip target per session is the completion roll-up, and no target restates a number the exercise table already holds',
    '- every week carries a reckoning whose conversion is one sentence and whose `sink.ref` names a surface this booklet actually prints, by that week',
    '- nothing earned on a markStrip gates the password, the weekly component values, or the decodingKey',
    '- most non-boss weeks share a persistent main topology — maps are not unrelated one-offs',
    '- story prompts contain zero gym/exercise metaphors — the workout is real, the fiction is fiction',
    '- boss decodingKey requires spatial or institutional knowledge, not simple arithmetic on weekly values',
    '- story voices are distinct across prompts and fragments',
    '- the setting has public, working, hidden, and historical layers',
    '- at least one scarcity surface persists across all non-boss weeks',
    '- the booklet includes at least one meaningful re-entry, revisitation, or changed-access payoff',
    '- at least three fragments have distinct linked functions: action-changing, interpretation-changing, and character-deepening',
    '- maps contain denied space, a return point, and visible state evolution where appropriate',
    '- recurring visual signals are restrained and functional rather than decorative',
    '- the block expresses exploration, pressure, scarcity, mystery, and gating across its full arc',
    '- the story would still feel specific if explicit exercise terminology were removed from the prose',
    '- oracle paperAction entries name specific targets (clock names, map nodes, companion slots) — never vague',
    '- at least one clock consequenceOnFull triggers a map state change',
    '- named characters from the relationship web appear as fragment inWorldAuthor for at least 3 fragments',
    '- binary choice has mechanical consequences (different map access, different clock states, different available information)',
    '- each non-boss week gives the player a new capability, access, or knowledge they did not have before',
    '- the board state evolves week over week: maps show consequences of prior weeks, clocks carry forward, companions change state',
    '- boss decodingKey references map locations, spatial relationships, or institutional knowledge — not just arithmetic',
    '- the ending reflects the binary choice, boss outcome, and at least one relationship consequence',
    '',
    '## Ending Audit (voice — run this pass separately, on the text alone)',
    'Read ONLY the final two sentences of every storyPrompt, interlude body,',
    'fragment body, overflow document, and ending (including finalLine). Failure',
    'concentrates in terminal position, and a general read passes over it.',
    '- no aphorism, moral, ironic turn, or mirrored/definitional closer ("A is not B", "less X than Y")',
    '- no short flat sentence positioned as a closer, and no two clipped sentences in a row',
    '- the unit ends on work, motion, or the next obligation — not on the anomaly or an image of it',
    '- the ending is FOUND, not assembled: no safe facts pulled out of their natural grouping to close on',
    '- each named in-world author still reads as their own hand: what they record, omit, and how they format',
    '- no genre move (aphorism, direct address, fragments-as-rhythm, ominous closer) appears unless',
    '  meta.literaryRegister.licensedMoves declares it, and then only inside its stated budget',
    '',
    '## Common Failures (fix before returning)',
    '- Fragments that could be transplanted unchanged into a different booklet — add concrete Core Noun Roster references',
    '- Oracle entries with atmospheric consequence instead of named targets — rewrite with specific clock/map/companion names',
    '- Two consecutive non-boss weeks using the same cipher family — redesign one',
    '- Story prompts ending on tidy closure instead of unresolved pressure — rewrite the final sentence',
    '- Maps showing no state evolution between weeks — add at least one unlock, closure, or annotation change per week'
  ];

  window.INST_QUALITY_STANDARD = [
    '## Quality Standard',
    '- Every content field must earn its space. Atmospheric filler that could be removed without changing the plot, game state, or character understanding is a failure.',
    '- If any document, oracle entry, or story prompt feels transplantable to a different booklet, it is generic. Rewrite with Core Noun Roster references.'
  ];

  window.INST_POSTWRITING_GATE = [];

  window.INST_RULES_TEACH = [
    '## Rules Page Requirements',
    'The rulesSpread leftPage MUST teach the player how to play the game.',
    'It is NOT diegetic flavor or institutional worldbuilding — it is procedural instruction.',
    'Required sections (minimum 4):',
    '- Play cadence: what the player does each training session (workout -> oracle pull -> execute consequences -> read fragment -> mark board)',
    '- Map/board usage: how to annotate, what marks mean, when to update',
    '- Oracle access: what triggers a pull, how to read results, how to execute consequence tags. Include: "All oracle tables use d100. No dice? Google roll d100."',
    '- Clocks/trackers: what they are, when they advance, what happens when they fill or empty',
    'If the booklet carries a `percentile-stat` companion, one section MUST also teach it, in the world\'s own voice:',
    '- circle this week\'s value on the stat box before you roll',
    '- roll under it on the oracle d100 and read the entry one band above the one you rolled',
    '- complete every prescribed set in the session before rolling and you may re-roll once — the only thing training changes is your standing, never the sets themselves',
    'The rightPage contains the password/convergence tracker and unlock instructions.',
    'Both pages must be comprehensible to a player who has never seen the booklet before.'
  ];

  window.INSTRUCTIONS = [].concat(
    ['# Generation Instructions', ''],
    ['## Priority Tiers',
     'These instructions are organized by priority. Tier 1 quality CANNOT be sacrificed to satisfy Tier 3 checkboxes.',
     'If running low on output tokens, shorten Tier 3 verification and structural detail — never Tier 1 prose or Tier 2 game design.',
     ''],

    // ── TIER 1: Story Quality (the soul of the booklet) ──────────────
    ['## ── TIER 1: STORY QUALITY ──', ''],
    INST_BRIEF_INTERPRETATION, [''],
    INST_BRIEF_FIDELITY, [''],
    INST_ARTIFACT_COMPILER, [''],
    INST_STORY_ENGINE, [''],
    INST_LAYERED_ARC, [''],
    INST_CHARACTER_WEB, [''],
    INST_SESSION_PROMPTS, [''],
    INST_FOUND_DOCUMENTS, [''],
    INST_ENDING_STANDARD, [''],
    INST_ANTI_GENERIC, [''],
    INST_ANTI_PATTERNS, [''],
    INST_VOICE_DISCIPLINE, [''],

    // ── TIER 2: Game Design (the play experience) ─────────────────────
    ['## ── TIER 2: GAME DESIGN ──', ''],
    INST_WORLD_CONTRACT, [''],
    INST_ENVIRONMENT, [''],
    INST_WORKOUT_FUSION, [''],
    INST_MARK_SURFACE, [''],
    INST_PERVASIVE_PLAY, [''],
    INST_DIEGETIC_MECHANICS, [''],
    INST_SYSTEM_INTEGRATION, [''],
    INST_WEEKLY_COMPONENTS, [''],
    INST_CIPHER_DESIGN, [''],
    INST_CONVERGENCE_DESIGN, [''],
    INST_MAPS_BOARD, [''],
    // D144: the geometry table left INST_MAPS_BOARD so the campaign planner
    // could see it too. It stays on the bundle because the paste path authors
    // every map in one call — a MOVE, not an addition (bundle delta ≈ 0).
    INST_MAP_GEOMETRY, [''],
    INST_ORACLES_CLOCKS, [''],
    INST_COMPANIONS, [''],
    INST_PROGRESSION, [''],
    INST_INTERLUDES, [''],
    INST_ANTI_SAMENESS, [''],

    // ── TIER 3: Structural Compliance (guardrails) ────────────────────
    ['## ── TIER 3: STRUCTURAL COMPLIANCE ──', ''],
    INST_OUTPUT_RULES, [''],
    INST_CONTRACT_GUARDRAILS, [''],
    // The whole-booklet path IS the endings-array surface — see the section's
    // own note. It reaches no stage, and that is the routing, not an oversight.
    INST_ENDINGS_PLAINTEXT, [''],
    INST_OUTPUT_BUDGETS, [''],
    INST_VISUAL_DIRECTION, [''],
    INST_STRUCTURAL_RULES, [''],
    INST_RULES_TEACH, [''],
    INST_SELF_VERIFICATION
  ).join('\n');

  // ── Mechanic Vocabulary Brief ───────────────────────────────────────────
  // Compact summary of renderer mechanical constraints for planning stages.
  // Must match the vocabularies defined in SCHEMA_SPATIAL, SCHEMA_WEEKS_POST,
  // SCHEMA_FRAGMENTS, and SCHEMA_THEME above. If those change, update this.
  window.MECHANIC_VOCAB_BRIEF = [
    'RENDERER MECHANICAL CONSTRAINTS (plan within these boundaries):',
    '- Map types (exactly 6): grid, point-to-point, linear-track, player-drawn, concentric, maze.',
    '  Grid: max 12 cols x 8 rows (cellShape square or hex). PTP: max 12 nodes, max 10 edges (edgeSemantics traversal or relational). Linear: max 12 positions. Player-drawn: canvas instructions only.',
    '  Concentric: 3-6 rings, labels max 18 chars. Maze: max 12 nodes, max 14 passages.',
    '- Ciphers: DELAYED INTERPRETATION. Weekly values are fiction-native (numbers, codes, instrument readings), NEVER raw letters.',
    '  The boss decodingKey, on the LAST week of the block, converts accumulated values to letters. This is non-negotiable.',
    '- Oracle tables: d100 with exactly 10 bands (00-09, 10-19, ... 90-99). Each entry has a `text` field.',
    '  Entry types: "fragment" (includes fragmentRef) or "consequence" (includes paperAction).',
    // MENU SURFACE 2 of 2 (companionMenuParity() in validate.mjs): the count and
    // the list must equal GENERATION_COMPANION_MENU. Narrowed from 9 by D122(c).
    '- Companion component types (7): dashboard, return-box, inventory-grid, stress-track, memory-slots, usage-die, percentile-stat.',
    '  percentile-stat is the growing-stat d100: ONE per booklet, statName from the Core Noun Roster, weeklyValues (1-99) rising monotonically, rolled under on the oracle die.',
    '- Clock types (6): progress-clock, danger-clock, racing-clock, tug-of-war-clock, linked-clock, project-clock.',
    '- Mark surface: EVERY session prints a markStrip of 3-5 tick targets (labels only, 5 words max, no digits, one pencil mark each).',
    '  EVERY week prints one reckoning panel converting those ticks into the single currency declared in meta.economy.',
    '  Reckoning sink kinds (5): map, companion, clock, oracle, notes. The sink must name a surface this booklet actually prints.',
    '- Fragment documentTypes (8): memo, report, inspection, fieldNote, correspondence, transcript, form, anomaly.',
    '- Boss encounter MUST include decodingKey with referenceTable (e.g., "1=A 2=B ... 26=Z").',
    '- Visual archetypes (10): government, cyberpunk, scifi, fantasy, noir, steampunk, minimalist, nautical, occult, pastoral.',
    'Do NOT invent mechanics, map types, component types, or document types outside these lists.'
  ].join('\n');

  // ── The conductor's pass (FUSION.md §4 mechanism 6) ──────────────────────
  // A dedicated post-draft read of ONLY the play-order sequence. The doctrine
  // below is compressed from docs/craft/FUSION.md §3 (the load-bearing law) and
  // §4 (the six mechanisms); when the two disagree, FUSION.md wins and this is
  // regenerated from it — the VOICE.md compression rule, same seam.
  //
  // ROUTING: staged pipelines only, via STAGE_SCHEMA_MAP. It is deliberately
  // absent from window.INSTRUCTIONS — the single-prompt path has no stage loop
  // to feed and roughly 1,800 characters of headroom under its ceiling, so
  // doctrine about a stage it cannot run would be pure cost.
  //
  // The mechanism ids and their one-line readings are BYTE-QUOTED from
  // CONDUCTOR_MECHANISMS in generator/modules/constants.js, which is the single
  // home. check-generation-floors.mjs diffs the two surfaces: an id the
  // normalizer accepts and this prompt never offers is a verdict nobody can
  // return, and an id offered here that the normalizer drops is a verdict that
  // vanishes silently.
  window.SCHEMA_CONDUCTOR = [
    '# Conductor\'s Report Schema',
    '',
    'Return a single JSON object with exactly this structure. No prose outside it.',
    '',
    '- `reading` (string, REQUIRED): one or two sentences naming how this book is phrased AS',
    '  A WHOLE — the shape its dynamics take from the first week to the last. Not a score, not',
    '  a compliment, not a summary of what happens.',
    '- `weeks` (array, REQUIRED): exactly ONE entry per week printed in the score, in order.',
    '  - `week` (integer): the week number exactly as the score prints it.',
    '  - `mechanism` (string): which relation you heard in this week, from the closed list in',
    '    the instructions. One value only — the one that most explains this week\'s place in',
    '    the sequence.',
    '  - `verdict` (string): ONE sentence. What this week does in the sequence, and whether it',
    '    does what its own declared marking said it would.',
    '  - `cites` (array of strings): the measurements you read it from — week numbers with the',
    '    curve values you compared, or the declared marking beside the printed index. "w4 load',
    '    100, prose 96, declared loud" is a cite. "it felt flat" is not.',
    '- `findings` (array, REQUIRED, AT MOST 3): the defects worth a revision, most damaging',
    '  first. Return [] when the sequence is phrased and you have nothing to fix — an empty',
    '  findings array is a real answer and a better one than three invented ones.',
    '  - `week` (integer): the ONE week whose revision fixes this.',
    '  - `mechanism` (string): the same closed list.',
    '  - `issue` (string): one sentence naming what is wrong, citing the weeks and the curves.',
    '  - `directive` (string): one imperative sentence a reviser can execute inside that week',
    '    alone. Never a cross-week rename, never "rewrite the book".',
    '  - `reopen` (array of strings): which aspects of that week\'s SHAPE the reviser may',
    '    re-decide, from the closed list in the instructions. At least one, or the finding is',
    '    read as a rewording request.'
  ];

  // Structured output schema for the conductor stage (OpenAI json_schema format,
  // non-strict). It mirrors SCHEMA_CONDUCTOR above and adds the finding cap at
  // the wire, where a provider that honours it costs nothing to enforce.
  window.STRUCTURED_SCHEMA_CONDUCTOR = {
    type: 'object',
    properties: {
      reading: { type: 'string' },
      weeks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            week: { type: 'integer' },
            mechanism: {
              enum: ['score', 'counterpoint', 'doubling', 'discord', 'flat', 'exhale',
                'leitmotif', 'echo', 'unnameable']
            },
            verdict: { type: 'string' },
            cites: { type: 'array', items: { type: 'string' } }
          },
          required: ['week', 'mechanism', 'verdict', 'cites']
        }
      },
      findings: {
        type: 'array',
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            week: { type: 'integer' },
            mechanism: {
              enum: ['score', 'counterpoint', 'doubling', 'discord', 'flat', 'exhale',
                'leitmotif', 'echo', 'unnameable']
            },
            issue: { type: 'string' },
            directive: { type: 'string' },
            reopen: {
              type: 'array',
              items: { enum: ['beat', 'dynamics', 'motif', 'mechanism', 'economy', 'gate', 'decision'] }
            }
          },
          required: ['week', 'mechanism', 'issue', 'directive', 'reopen']
        }
      }
    },
    required: ['reading', 'weeks', 'findings']
  };

  window.INST_CONDUCTOR = [
    '## The Conductor\'s Pass (read the score, not the pages)',
    'You are reading a printed game book that fuses a real training program with a story. You',
    'have NOT been given the book. You have been given its SCORE: one line per week carrying',
    'the training load, the volume of prose the week prints, the dynamic marking the week',
    'declared for itself, the beat it named, and the mechanical surfaces it puts on the page.',
    'That restriction is the instrument. Phrasing is a property of the SEQUENCE, and a reader',
    'holding thirty thousand words of individually good weeks hears individually good weeks.',
    '',
    '### The law you are listening for',
    'STAKES PARALLEL THE LOAD; TEXTURE COUNTERPOINTS IT.',
    'What a week is ABOUT rises with the training load — what is at risk, what converges, what',
    'can no longer be postponed. How the page SPEAKS moves the other way: spare, cold and',
    'procedural exactly when the body roars; open, expansive and human when the body rests.',
    'UNISON IS NOT HARMONY. Two curves rising together is doubling, and doubling is the most',
    'common way this fails, because it feels like conviction while it is written. The reader\'s',
    'body is already the loudest instrument in the room on a peak day; a page that also shouts',
    'is redundant AND inaudible.',
    'THE DELOAD IS THE EXHALE. A lighter week must carry content, not padding — the aftermath,',
    'the document that arrives, the count taken. A week whose story idles because the body is',
    'idling is a dropped bar, and it shows in the score as a light week whose prose index and',
    'surface list collapse together.',
    '',
    '### The failure this pass exists to catch',
    'Every week was written to be good AS A WEEK, so every week wanted to be loud. A book can',
    'carry every mechanic, pass every count, and still hold one dynamic for its whole length.',
    'Completeness as flatness is the enemy here, and it is invisible one week at a time.',
    '',
    '### The nine relations — name exactly one per week',
    'These are the only values `mechanism` accepts. Choose the one that most explains the',
    'week\'s place in the sequence; the verdict says whether it succeeds or fails at it.',
    '- "score": the week plays the beat and the dynamic marking it declared for itself.',
    '- "counterpoint": what is at stake rises with the training load while the page speaks the other way.',
    '- "doubling": both curves move together — unison, which is not harmony.',
    '- "discord": a heavy week carrying an administrative beat, with nothing at risk in it.',
    '- "flat": the book holds one dynamic for its whole length — every week mezzo-forte.',
    '- "exhale": the lighter week carries content — the aftermath, the arriving document, the count taken.',
    '- "leitmotif": a carried object means something different here than it did before the midpoint.',
    '- "echo": a mechanical event and a story surface answer each other inside one week, both directions.',
    '- "unnameable": what this world will not say is carried by a printed surface rather than a sentence.',
    '',
    '### What you may reopen',
    'A finding names which aspects of that week\'s SHAPE a reviser may re-decide. Name only what',
    'the fix needs; everything unnamed stays frozen.',
    '- "beat": what the week is ABOUT — its position in the arc, what is at risk, what it converges.',
    '- "dynamics": how loudly the week SPEAKS — its prose volume and register, including cutting it shorter.',
    '- "motif": which recurring object, place, or phrase the week carries, and what it means here.',
    '- "mechanism": which printed surface carries the week\'s pressure and what it answers.',
    'The remaining three — "economy", "gate", "decision" — are the play WIRING, and a different',
    'reader owns them. Use one only when the phrasing defect is genuinely a wiring defect: a',
    'week that is quiet because it asks the player nothing, not a week that is quiet on purpose.',
    '',
    '### What this pass does NOT do',
    '- Do not rewrite prose. You have not been shown any; a sentence you invent is a guess.',
    '- Do not score anything. No numbers, no grades, no dimensions. Verdicts and targets only.',
    '- Do not check whether surfaces are PRESENT. Presence is already law and already gated.',
    '  A week printing every surface is exactly the book this pass exists to hear the flatness in.',
    '- Do not audit the training. The program is the reader\'s real block and is never revised;',
    '  the load curve is a fact you read against, never a thing you may ask to change.',
    '- Do not invent measurements. If the score says the load curve is NOT READABLE, read the',
    '  prose curve against the session counts and the DELOAD and BOSS marks, and say that you did.',
    '- Do not manufacture findings to fill the three slots. Silence where the phrasing works is',
    '  the honest answer and costs the book nothing.'
  ];

  // ── Stage Schema Assembler ──────────────────────────────────────────────
  // Routes the right SCHEMA + INST slices to each API pipeline stage.
  // Single source of truth: modify SCHEMA_* or INST_* above, and both
  // the single-prompt path AND the API pipeline automatically pick up changes.
  //
  // COUPLING CONTRACT:
  // - If you add a new SCHEMA section, add it here for relevant stages.
  // - If you add a new INST section, add it here AND to the INSTRUCTIONS reassembly,
  //   UNLESS it is stage-only by ruling — in which case it goes here, it does NOT
  //   go in the bundle, and a validator pass asserts BOTH halves of that routing.
  //   Stage-only today: DESIGN_LANGUAGE (D139), CONDUCTOR (D134), LUDIC_SPINE
  //   (W4a), POINT_OF_USE / RETURN_LOOP / DOOR_BIAS (Teeth), SHELL_CHOICE (D144).
  //   Every one of them is off the bundle for the same arithmetic: the paste
  //   path is hard against its 115,000-character ceiling.
  // - NEVER put schema or instruction content in generator.js or api-generator.js.

  var STAGE_SCHEMA_MAP = {
    // Planning stages: story-first
    'layer-codex':    { schemas: [],                                            instructions: ['STORY_ENGINE', 'CHARACTER_WEB', 'LAYERED_ARC', 'ANTI_PATTERNS'] },
    // MAP_GEOMETRY rides the campaign plan because the plan is where the
    // persistent topology is DECLARED and every later week is told to preserve
    // it (D144). Before this, the geometry table was first read at week-final —
    // three stages after the decision it governs had already been made, by a
    // stage that could not see it.
    // SEED_ASSIGNMENT rides here for one axis and one reason: the board
    // geometry is DECLARED at this stage (`topology.mainMapType`), so this is
    // the stage that must be handed its assignment. The doctrine travels with
    // it because the family-decides exception is stated in the same section.
    'campaign-plan':  { schemas: [],                                            instructions: ['WORLD_CONTRACT', 'MAP_GEOMETRY', 'SEED_ASSIGNMENT', 'PROGRESSION', 'SYSTEM_INTEGRATION', 'ANTI_PATTERNS', 'ANTI_SAMENESS'] },
    // Shell: story + world + structural
    // Shell authors meta.literaryRegister (the voiceSpec) and meta.worldContract
    // (the knowing) — VOICE_DISCIPLINE is the authoring doctrine for both.
    // MARK_SURFACE rides the shell stage because meta.economy is authored here:
    // the currency cannot be named well without knowing what it is FOR.
    // CONVERGENCE_DESIGN rides the shell because the compiler CHOOSES the
    // pattern here (Step 6) and cannot choose well without knowing what each
    // one costs. It rides week-final and ending too — the stages that build
    // the boss page and the payoff — so the pattern is legible everywhere it
    // has consequences.
    // DESIGN_LANGUAGE rides the shell because the shell is where `theme` is
    // authored, and the two are one decision: the archetype is the floor the
    // design language is composed onto (W6). It is stage-only — the
    // single-prompt bundle has no room (D136: 563 chars of headroom), and the
    // D132 puzzle precedent is the model. A paste-path book renders as its
    // archetype, which is what an archetype is for.
    // SHELL_CHOICE rides directly behind ARTIFACT_COMPILER because it IS the
    // compiler's Steps 7/7a/9, moved out of the section only so the ceiling-bound
    // paste path does not have to carry it (D144). Order is load-bearing: the
    // model reads Step 7 and Step 9 in the compiler, then reads the menus that
    // make them choosable, in the same sitting.
    // SEED_ASSIGNMENT rides directly behind SHELL_CHOICE, and the order is
    // load-bearing the same way theirs is: the model reads the menus that make
    // each choice choosable, then reads which of them the die already made.
    // Reversed, the assignments read as one more menu.
    'shell':          { schemas: ['META', 'THEME', 'DESIGN_LANGUAGE', 'COVER_RULES'],              instructions: ['BRIEF_INTERPRETATION', 'BRIEF_FIDELITY', 'ARTIFACT_COMPILER', 'SHELL_CHOICE', 'SEED_ASSIGNMENT', 'LUDIC_SPINE', 'CONVERGENCE_DESIGN', 'WORLD_CONTRACT', 'VOICE_DISCIPLINE', 'STORY_ENGINE', 'ENVIRONMENT', 'CHARACTER_WEB', 'MARK_SURFACE', 'RULES_TEACH', 'VISUAL_DIRECTION', 'DESIGN_LANGUAGE', 'OUTPUT_RULES', 'OUTPUT_BUDGETS', 'CONTRACT_GUARDRAILS', 'STRUCTURAL_RULES'] },
    // Knowing: the world's process particulars, authored once after the
    // skeleton/shell and consumed by every prose stage (§11 Wave 1.5). It
    // writes no prose, so it carries no VOICE_DISCIPLINE — it carries the
    // brief-fidelity law instead, because a particular that drifts from the
    // brief mis-funds every stage downstream of it.
    'knowing':        { schemas: ['KNOWING'],                                   instructions: ['KNOWING', 'BRIEF_FIDELITY'] },
    // Canonicalize: pasted Liftoscript read into structure (§11 Wave 5). It
    // carries the grammar and NOTHING else — no voice, no world, no brief. The
    // stage transcribes a program; a creative instruction here would license it
    // to improve the training, which is the one thing it must never do.
    'canonicalize':   { schemas: [],                                            instructions: ['LIFTOSCRIPT_GRAMMAR'] },
    // Week plan: lean
    // Week flesh: full game design + story
    // Prose stages (week-final, fragment, ending) carry VOICE_DISCIPLINE: they
    // write storyPrompts, interludes, oracle text, documents, and endings.
    //
    // POINT_OF_USE / RETURN_LOOP / DOOR_BIAS ride the STAGE MAP as of the Teeth
    // Round, and that is a fix, not a preference. Until now INST_POINT_OF_USE
    // was pasted directly into the two MULTI-STAGE builders in generator.js and
    // reached the S+F flesh builders NOWHERE — so the default pipeline authored
    // `microLines`, `citeRef` and `seal` having been shown a one-line field
    // shape and a cross-reference to a section that was not in its prompt.
    // Book 1 (S+F) came back with zero of all three. The stage map reaches both
    // pipelines from one place and still keeps this off the single-prompt path,
    // which is hard against its 108,000-character ceiling.
    // NO CONTRACT_GUARDRAILS here either, for the same reason the `ending`
    // stage has none (D128's second queued finding, closed in W4a). All three
    // of its lines are about fields a week chunk does not author: `theme` and
    // the two `meta.password*` fields live on the SHELL. Doctrine routed to a
    // stage it is false at is worse than doctrine routed nowhere — it spends
    // context telling a model not to do something it cannot do, and teaches it
    // that this prompt's rules may not apply to the shape in front of it.
    'week-final':     { schemas: ['SINGLE_WEEK', 'SPATIAL', 'WEEKS_POST', 'PUZZLES'],      instructions: ['SESSION_PROMPTS', 'VOICE_DISCIPLINE', 'LAYERED_ARC', 'WORKOUT_FUSION', 'MARK_SURFACE', 'PERVASIVE_PLAY', 'POINT_OF_USE', 'RETURN_LOOP', 'DOOR_BIAS', 'DIEGETIC_MECHANICS', 'SYSTEM_INTEGRATION', 'WEEKLY_COMPONENTS', 'CIPHER_DESIGN', 'CONVERGENCE_DESIGN', 'MAPS_BOARD', 'MAP_GEOMETRY', 'INTERLUDES', 'ORACLES_CLOCKS', 'COMPANIONS', 'PROGRESSION', 'PROGRESSION_TARGET', 'ANTI_SAMENESS', 'ANTI_GENERIC', 'ANTI_PATTERNS', 'OUTPUT_RULES', 'OUTPUT_BUDGETS', 'SELF_VERIFICATION'] },
    // Fragment: story quality first
    'fragment':       { schemas: ['SINGLE_FRAGMENT'],                           instructions: ['FOUND_DOCUMENTS', 'VOICE_DISCIPLINE', 'POINT_OF_USE', 'ANTI_GENERIC', 'CHARACTER_WEB', 'OUTPUT_RULES', 'OUTPUT_BUDGETS', 'SELF_VERIFICATION'] },
    // Ending: story quality first (endings are where voice failure concentrates)
    //
    // NO CONTRACT_GUARDRAILS here, and that omission is the fix (D128). This
    // stage writes ONE ending object — SCHEMA_SINGLE_ENDING says so in its
    // first line — and the guardrails section is about fields it does not
    // author: `theme`, `meta.password*`, and (until the split) the whole
    // `endings` ARRAY. Told to author an array and an object at once, the model
    // answers with an envelope, which is a shape no validator here accepts.
    // JSON hygiene reaches this stage through OUTPUT_RULES, which is where it
    // belongs.
    'ending':         { schemas: ['SINGLE_ENDING'],                             instructions: ['ENDING_STANDARD', 'CONVERGENCE_DESIGN', 'VOICE_DISCIPLINE', 'LAYERED_ARC', 'ANTI_GENERIC', 'OUTPUT_RULES', 'OUTPUT_BUDGETS', 'SELF_VERIFICATION'] },
    // Conductor: the dedicated read of the play-order sequence, after assembly
    // and ahead of the critic's first round. It carries NOTHING else on
    // purpose. No VOICE_DISCIPLINE (it writes no prose and is shown none), no
    // OUTPUT_BUDGETS (it authors no player-facing text), no world or brief
    // doctrine (the brief rides the prompt head separately, as the critic's
    // does). A section routed to a stage it is false at teaches the model that
    // this prompt's rules may not apply to the shape in front of it — the D128
    // lesson, and this stage is small enough that one false section would be a
    // measurable fraction of what it reads.
    'conductor':      { schemas: ['CONDUCTOR'],                                 instructions: ['CONDUCTOR'] }
  };

  window.buildStageSchema = function(stageName) {
    var entry = STAGE_SCHEMA_MAP[stageName];
    if (!entry) {
      console.error('[prompt_rules] Unknown stage: ' + stageName);
      return '';
    }
    var parts = [];

    // Planning stages get the mechanic vocabulary brief
    if (stageName === 'layer-codex' || stageName === 'campaign-plan') {
      parts.push(window.MECHANIC_VOCAB_BRIEF);
    }

    // Add relevant SCHEMA sections
    entry.schemas.forEach(function(key) {
      var schemaArr = window['SCHEMA_' + key];
      if (schemaArr) {
        parts.push(schemaArr.join('\n'));
      } else {
        console.error('[prompt_rules] STAGE_SCHEMA_MAP references missing SCHEMA_' + key + ' (stage: ' + stageName + ')');
      }
    });

    // Add relevant INSTRUCTIONS sections
    entry.instructions.forEach(function(key) {
      var instArr = window['INST_' + key];
      if (instArr) {
        parts.push(instArr.join('\n'));
      } else {
        console.error('[prompt_rules] STAGE_SCHEMA_MAP references missing INST_' + key + ' (stage: ' + stageName + ')');
      }
    });

    return parts.join('\n\n');
  };

  // Load-time validation: catch STAGE_SCHEMA_MAP key typos immediately
  (function validateStageSchemaMap() {
    var stageNames = Object.keys(STAGE_SCHEMA_MAP);
    stageNames.forEach(function(stage) {
      var entry = STAGE_SCHEMA_MAP[stage];
      entry.schemas.forEach(function(key) {
        if (!window['SCHEMA_' + key]) {
          console.error('[prompt_rules] STAGE_SCHEMA_MAP references missing SCHEMA_' + key + ' (stage: ' + stage + ')');
        }
      });
      entry.instructions.forEach(function(key) {
        if (!window['INST_' + key]) {
          console.error('[prompt_rules] STAGE_SCHEMA_MAP references missing INST_' + key + ' (stage: ' + stage + ')');
        }
      });
    });
  })();

  // Additive to window.generatePrompt (single-pass, Chat + API Standard mode).
  //
  // Legacy full-compile chat path:
  //   generateStage1Prompt → generateStage2Prompt → generateStage3Prompt
  // The default manual flow now continues through shell / weeks / fragments / endings.
  //
  // API "Deep" mode (10-stage partial-JSON pipeline):
  //   Stage 1: Layer Codex
  //   Stage 2: Campaign Plan + Fragment Registry
  //   Stage 3: Booklet Shell (meta, cover, rules, theme)
  //   Stages 4..N-3: Week Chunks (dynamic, 2-3 weeks each)
  //   Stage N-2: Fragments (all found documents)
  //   Stage N-1: Endings
  //   Stage N: Patch (conditional, only if validation fails)
  //
  // Stage 1: Layer Codex  — compact 3-layer architecture planning JSON
  // Stage 2: Campaign Plan — per-week structure using the approved layer codex
  // Stage 3 (legacy chat): Final Compile — full booklet JSON retained only as fallback

  window.STAGE1_OUTPUT_SCHEMA = JSON.stringify({
    storyLayer: {
      premise: '',
      protagonist: { role: '', want: '', need: '', flaw: '', wound: '', arc: '' },
      antagonistPressure: '',
      relationshipWeb: [
        { name: '', role: '', initialStance: '', secret: '', arcFunction: '' }
      ],
      midpointReversal: '',
      darkestMoment: '',
      resolutionMode: '',
      bossTruth: '',
      recurringMotifs: { object: '', place: '', phrase: '', sensory: '' }
    },
    gameLayer: {
      coreLoop: '',
      persistentTopology: '',
      majorZones: [],
      gatesAndKeys: [],
      progressionGates: [
        { week: 1, playerGains: '', unlocks: '', requires: '' }
      ],
      persistentPressures: [],
      companionSurfaces: [],
      revisitLogic: '',
      boardStateArc: '',
      bossConvergence: '',
      informationLayers: '',
      weeklyComponentType: ''
    },
    governingLayer: {
      institutionName: '',
      departments: [],
      proceduresThatAffectPlay: [],
      recordsAndForms: [],
      documentVoiceRules: []
    },
    designPrinciples: [
      "short design principle string — one per entry",
      "another principle (array of strings, NOT a single string or object)"
    ],
    designLedger: {
      mysteryQuestions: [
        { question: '', answerableFrom: '', revealTiming: '' }
      ],
      falseAssumptions: [
        { assumption: '', plantedBy: '', correctedBy: '' }
      ],
      motifPayoffs: [
        { motif: '', firstAppearance: '', transformation: '', payoff: '' }
      ],
      weekTransformations: [
        { week: 1, understandingShift: '', stateChange: '', framingChange: '' }
      ],
      clueEconomy: {
        hardClues: [],
        softClues: [],
        misdirections: [],
        confirmations: []
      },
      finalRevealRecontextualizes: ''
    }
  }, null, 2);

  window.STAGE2_OUTPUT_SCHEMA = JSON.stringify({
    topology: {
      type: '',
      identity: '',
      // D144: the BOARD, declared where the persistent topology is declared.
      // `type` above is free prose and always was; these two are the machine
      // fields every later week reads and preserves. Left blank for the same
      // D47 reason componentDialect and visualArchetype are — a filled-in
      // sample of a bounded choice functions as an exemplar to copy, and the
      // measured symptom of that is eleven books on a square grid.
      mainMapType: '',
      cellShape: '',
      mainMap: '',
      zones: [],
      persistentLocks: [],
      shortcuts: [],
      pressureCircuits: []
    },
    weeks: [
      {
        weekNumber: 1,
        arcBeat: '',
        npcBeat: '',
        stateSnapshot: '',
        playerGains: '',
        zoneFocus: '',
        cipherType: '',
        mapReuse: 'full',
        stateChange: '',
        newGateOrUnlock: '',
        weeklyComponentMeaning: '',
        oraclePressure: '',
        fragmentFunction: '',
        governingProcedure: '',
        companionChange: '',
        isBossWeek: false,
        isBinaryChoiceWeek: false,
        sessionCount: 3,
        fragmentIds: ['F.01'],
        overflowFragmentId: null,
        sessionBeatTypes: []
      }
    ],
    bossPlan: {
      decodeLogic: '',
      whyItFeelsEarned: '',
      requiredPriorKnowledge: [],
      weeklyComponentType: ''
    },
    fragmentRegistry: [
      {
        id: 'F.01',
        title: '',
        documentType: '',
        author: '',
        revealPurpose: '',
        clueFunction: '',
        weekRef: 1
      }
    ],
    overflowRegistry: [
      {
        id: 'F.30',
        weekNumber: 1,
        documentType: '',
        author: '',
        narrativeFunction: '',
        tonalIntent: '',
        arcRelationship: ''
      }
    ]
  }, null, 2);

  // ── Manual-path stage doctrine + flesh-stage output specs ─────────────
  // Moved verbatim from generator.js (coupling contract: ALL prompt content
  // lives in this file; builders in generator.js only assemble inputs).
  window.INST_STAGE1_DOCTRINE = [
      'You are architecting a print-and-play solo workout journal with the structural',
      'depth of a stateful paper game. This is planning only — return the layer codex JSON.',
      '',
      '## Structural DNA (genre-neutral, non-negotiable)',
      '- **Persistent topology.** One map reused across weeks. Player revisits spaces with new understanding.',
      '- **Meaningful gating.** Locked areas have specific keys earned through play, not by week number.',
      '- **Environmental clueing.** Answers are in the map, documents, and oracle — not exposition.',
      '- **Information asymmetry.** Player knows less than whoever keeps this world\'s secrets — the institution, the family, the troupe, the market, the congregation, or whatever body the brief names. Documents imply unseen systems.',
      '- **Accumulated consequence.** Choices and discoveries persist. Nothing resets between weeks.',
      '- **Clue economy.** Every fragment and oracle result advances an answerable question. No lore dumps.',
      '- **Earned convergence.** Boss decode pays off spatial mastery and deep knowledge of this world, typed to its own register — institutional, scholastic, artisanal, communal, territorial, devotional, or whatever procedure it actually runs on.',
      '',
      '## Three-Layer Foundation',
      '',
      '### Story Layer',
      'Define: core premise, protagonist (role, want, need, flaw, wound, arc),',
      'antagonist pressure, relationship web (4-6 named characters, each with role,',
      'initial stance, secret, and arc function: introduces tension / reveals truth /',
      'changes loyalty / provides key / blocks path), midpoint reversal, darkest moment',
      '(what it costs the protagonist — relational, ethical, or institutional),',
      'resolution mode, boss truth, recurring motifs (object, place, phrase, sensory).',
      '',
      'Mystery pacing: plan the central answerable question, the revelation sequence',
      '(which facts establish early, which fragment complicates at midpoint, which',
      'recontextualizes near the end), and partial resolution with durable ambiguity.',
      '',
      '### Game Layer',
      'Define: core game loop, one persistent topology reused across most non-boss weeks,',
      'major zones with distinct mechanical identity (each zone has a dominant activity:',
      'patrol, search, decode, observe, extract, survey), all gates and the specific keys',
      'that open them (a gate is a locked zone, document, or knowledge; a key is a cipher',
      'value, cleared node, companion action, or oracle result), progression gates per week',
      '(what the player gains and what it unlocks), persistent pressures (clocks, patrols,',
      'surveillance, scarcity — at least one escalates regardless of player action),',
      'companion surfaces (each has trackable state: trust, information shared, loyalty),',
      'revisitation logic (how prior spaces become mechanically different — a cleared node',
      'reveals a shortcut, a decoded document unlocks an adjacent zone), board state arc',
      '(Week 1 constrained → penultimate week mastered), information layers (what the player',
      'can verify vs. what the governing body claims vs. what the documents actually show),',
      'and exactly what boss convergence requires (list specific outputs: cipher values,',
      'cleared zones, companion states, oracle discoveries).',
      '',
      '### Governing Layer',
      'Define: the governing body of this world BY ITS OWN KIND — institution, house, guild,',
      'troupe, market, congregation, crew, or whatever body the brief names — its name, its',
      'organs, and the procedures that materially affect play (what grants access: a paper, a',
      'token, a name; what triggers scrutiny; what records change board state), recurring',
      'document types and their voice rules, and the information hierarchy (what the player is',
      'permitted to see, what is withheld, what contradicts the body\'s own records). The',
      'governing body is the system the player navigates — its documents imply structures',
      'larger than the booklet contains.',
      '',
      '## Hard Targets',
      '- Topology: 1 persistent map, 3+ zones, 2+ locked in Week 1, opened through play.',
      '- Gating: every gate names its key. At least one gate requires outputs from 2 different weeks.',
      '- Oracle: 40%+ entries per week produce playable consequences (board state, clock, gate, companion).',
      '- Fragments: clue economy — early establish, midpoint complicate, late recontextualize. 3+ verifiable.',
      '- Overflow docs: artifacts of the governing body implying larger systems. 1+ contradicts an earlier fragment.',
      '- Boss: decode requires specific outputs from 3+ prior weeks referencing map, institution, or relationships.',
      '- Companions: 2+ with persistent trackable state. Binary choice costs something relational/institutional.',
      '- Mystery: central question answerable from evidence. Revelations via documents only, not exposition.',
      '',
      '## Design Ledger (prewriting commitments — fill before all other fields)',
      '',
      '### Mystery Questions (exactly 3)',
      'Each must be answerable from evidence in the booklet. Name the question,',
      'what evidence answers it (fragments, cipher outputs, map state, oracle results),',
      'and when the answer becomes available (early, midpoint, or late).',
      '',
      '### False Assumptions (exactly 3)',
      'What the player will likely believe early that turns out to be wrong or incomplete.',
      'Name the assumption, what plants it (which document, prompt, or map state),',
      'and what later evidence corrects it (which fragment, oracle result, or reveal).',
      '',
      '### Motif Payoffs (4-6)',
      'Each recurring element (object, phrase, place, sensation, procedure) must have:',
      'first appearance (week + context), how it transforms across the block, and what',
      'its final appearance pays off. A motif that merely recurs is decoration. A motif',
      'that means something different the last time it appears is architecture.',
      '',
      '### Week-by-Week Transformations (one per week)',
      'For each week, commit to what changes in:',
      '- understanding: what the player now knows or suspects that they did not before.',
      '- state: what changed on the board (map, clocks, companion stance, gate).',
      '- framing: how the governing or relationship context shifted.',
      '',
      '### Clue Economy',
      'Tag every planned clue as: hard (directly answers a mystery question),',
      'soft (suggestive, needs combination with another clue), misdirection (plausible',
      'wrong answer), or confirmation (validates a soft clue in hindsight).',
      'Distribute so no non-boss week is clue-free.',
      '',
      '### Final Reveal',
      'Name exactly what the boss decode or final document recontextualizes.',
      'It must reframe at least 2 earlier elements (motifs, documents, map state)',
      'rather than introducing new core facts.',
      '',
      '## Anti-Patterns to Eliminate',
      '- One-off maps. Atmospheric-only story prompts. Vibes-only oracle entries.',
      '- Lore-dump fragments. Flavor-only overflow documents. Stateless companions.',
      '- Retrofitted password. Arbitrary boss decode without referencing prior play.',
      '- Gates opening by week number. Exposition instead of diegetic documents.',
      '- Game systems in isolation (oracle has no effect on map, clocks have no effect on routes).',
      '',
      '## Output Rules',
      '- Return compact JSON only, matching the schema below exactly.',
      '- No markdown fences, no explanation, no commentary.',
      '- Stop after Stage 1.',
  ];

  /**
   * The five named arc beats, placed as fractions of the block and grouped by
   * the week each lands on.
   *
   * Grouping is the whole point. Derived positions overlap at short lengths —
   * a four-week block puts Complication and Reversal both on week 2 — and two
   * lines demanding different things of the same week is not an arc, it is a
   * contradiction the model has to pick a side in. Merged, week 2 is asked for
   * "Complication + Reversal", which is exactly what a four-week story does.
   *
   * Positions, in order: Setup is always week 1; Complication a quarter in;
   * Reversal at the midpoint (the binary-choice week the validators check);
   * Deepening two from the end; Escalation the penultimate week; Boss the last.
   */
  function arcBeatLines(weekCount) {
    var midpoint = Math.ceil(weekCount / 2);
    var beats = [
      { week: 1, name: 'Setup', text: 'establish setting, protagonist role, core tension, constrained map — most zones locked' },
      { week: Math.max(2, Math.min(midpoint, Math.round(weekCount / 4))), name: 'Complication', text: 'new pressure, first gate opened, companion introduces tension' },
      { week: midpoint, name: 'Reversal', text: 'binary choice recontextualizes evidence, costs a relationship, reveals that an earlier clue meant something different than assumed' },
      { week: Math.max(weekCount - 2, midpoint), name: 'Deepening', text: 'darkest moment — relational or ethical cost, a governing system turns against the player, a trusted document is revealed as unreliable' },
      { week: Math.max(weekCount - 1, 2), name: 'Escalation', text: 'pressures converge, full map access, final preparation, the player can now see the pattern connecting earlier fragments' },
      { week: weekCount, name: 'Boss', text: 'culmination — decode requires spatial mastery + deep knowledge of this world, typed to its own register (institutional, scholastic, artisanal, communal, territorial, devotional, or whatever procedure it actually runs on) + relationship state from prior weeks' }
    ];
    var byWeek = {};
    var order = [];
    for (var i = 0; i < beats.length; i++) {
      var w = beats[i].week;
      if (!byWeek[w]) { byWeek[w] = []; order.push(w); }
      byWeek[w].push(beats[i]);
    }
    order.sort(function (a, b) { return a - b; });
    return order.map(function (w) {
      var group = byWeek[w];
      var names = group.map(function (b) { return b.name; }).join(' + ');
      var texts = group.map(function (b) { return b.text; }).join('; and ');
      return '- Week ' + w + ': ' + names + ' (' + texts + ')';
    });
  }

  window.buildStage2Doctrine = function (weekCount) {
    var midpoint = Math.ceil(weekCount / 2);
    var minReuse = Math.max(weekCount - 2, 3);
    return [
      '## Story Plan Rules',
      '- Use ' + weekCount + ' weeks to match the workout programme.',
      '- At least ' + minReuse + ' non-boss weeks must reuse the same main topology.',
      '  Set mapReuse to "full", "zoom", or "overlay" for those weeks.',
      '- Week ' + midpoint + ' is the binary choice week (isBinaryChoiceWeek: true).',
      '- Week ' + weekCount + ' is the boss week (isBossWeek: true).',
      '',
      '## Design Ledger Enforcement',
      'The layer codex includes a designLedger with prewriting commitments.',
      'The campaign plan must honor all of them:',
      '- Map each mystery question to the weeks where evidence appears.',
      '- Map each false assumption to the week that plants it and the week that corrects it.',
      '- Each motif must appear in at least 2 non-adjacent weeks.',
      '- clueEconomy tags (hard/soft/misdirection/confirmation) must be distributed so no',
      '  non-boss week is clue-free. fragmentFunction must name the clue type it delivers.',
      '- weekTransformations must match stateChange, playerGains, and companionChange per week.',
      '- finalRevealRecontextualizes must connect to the bossPlan.',
      '',
      '## Topology Doctrine',
      '- The persistent topology from the layer codex must have 3+ distinct zones.',
      '- Each zone has a dominant activity (patrol, search, decode, observe, extract, survey).',
      '- At least 2 zones are locked in Week 1 and opened through play by the penultimate week.',
      '- Gate state changes are explicit per week: "Week X clears node Y, unlocks zone Z."',
      '- By Week ' + (weekCount - 1) + ', all zones must be accessible.',
      '- mapReuse values: "full" (same map, different state), "zoom" (subset of main map),',
      '  "overlay" (same map with new layer of information).',
      '',
      '## Oracle Doctrine',
      '- At least 40% of oracle entries per week produce a playable consequence:',
      '  board state change, clock tick, gate effect, or companion reaction.',
      '- Oracle entries that reference fragments must name the fragment ID.',
      '- No oracle table is purely atmospheric — every table advances the mystery or changes the board.',
      '- FAILURE ONLY ADDS: every band puts something on the paper — intel, a mark, a pointer, board motion.',
      '  A setback is the world doing something. Never "nothing happens", never a bare subtraction.',
      '- Oracle consequences should connect to the week\'s zone focus and active pressures.',
      '',
      '## Companion & Choice Doctrine',
      '- Each non-boss week must specify which named companion appears and how their stance changes.',
      '- companionChange must be specific: "X\'s trust increases because Y" — not "relationship develops."',
      '- The binary choice week must name: what the player gains from each option, what they lose,',
      '  and how at least one companion reacts differently based on the choice.',
      '- At least one companion\'s behavior in the final weeks depends on earlier player actions.',
      '',
      '## Cipher & Map Evolution Doctrine',
      '- Every non-boss week must declare a `cipherType` that names the actual puzzle family for that week.',
      '- No two consecutive non-boss weeks may use the same cipherType.',
      // DERIVED from cipherVarietyFloor() (validation.js, capped by
      // GENERATION_CIPHER_TECHNIQUES), reaching this classic script through the
      // `window` bridge api-generator.js installs. This line used to restate
      // the formula, so the prompt and the gate were two homes for one number;
      // at 12 weeks both demanded 10 distinct techniques against a menu of 8.
      // With no bridge, state the rule and no number — never guess a floor.
      (typeof window.cipherVarietyFloor === 'function')
        ? '- Use at least ' + window.cipherVarietyFloor(weekCount) + ' distinct cipher types across the non-boss weeks.'
        : '- Give as many non-boss weeks as possible a cipher type no earlier week used.',
      '- `mapReuse` may keep the same topology, but it may never mean "no visible change."',
      '- Every non-boss week must produce a visibly different `stateChange`: a cleared node, opened gate, rerouted path, new annotation layer, locked return, or revealed shortcut.',
      '- `stateSnapshot`, `stateChange`, and `newGateOrUnlock` cannot all describe the same board state as the prior week.',
      '',
      '## Arc Beat Assignment',
      // W7 — DERIVED AT EVERY LENGTH, and merged rather than collided.
      //
      // Two defects lived here. Complication was pinned to Week 2 while every
      // other beat was already derived, so a twelve-week block put Setup and
      // Complication back to back and left weeks 3-5 and 7-9 with no beat at
      // all. And at the MINIMUM legal length the derivations overlapped: a
      // four-week block printed "Week 2: Reversal" directly under "Week 2:
      // Complication", and "Week 3: Escalation" under "Week 3: Deepening" —
      // four contradictory demands on two weeks, shipped since the function
      // was written.
      //
      // `arcBeats()` derives every position, then groups by week so a week
      // carrying two beats is asked for ONE compound thing it can actually do.
      // The six-week block is byte-identical to before: round(6/4) is 2, and
      // no two beats land on the same week there.
      ].concat(arcBeatLines(weekCount)).concat([
      // The weeks BETWEEN the named beats. A six-week block has one or two and
      // they take care of themselves; a twelve-week block has six, and without
      // this line the plan simply has nothing to say about half the book.
      '- Every week not named above is a RUN, not filler: it continues the beat before it with a',
      '  new capability, a new state change, and higher pressure than the week before. None may',
      '  repeat its predecessor. A longer block has more of these, not longer ones.',
      '',
      '## Per-Week Requirements',
      '- Each week must specify all of the following:',
      '  `zoneFocus` — which zone of the topology is active this week.',
      '  `stateChange` — what changes on the map (node cleared, gate opened, shortcut revealed).',
      '  `newGateOrUnlock` — what new capability, access, or knowledge the player gains.',
      '  `oraclePressure` — what the oracle table does and how it affects board state.',
      '  `fragmentFunction` — which fragments appear and their role (establishes / complicates / reveals).',
      '  `companionChange` — which companion, what they do, how their trackable state changes.',
      '  `governingProcedure` — what institutional procedure is active and how it affects access.',
      '  `weeklyComponentMeaning` — what the cipher value represents in-fiction and how it connects to the decode.',
      '- `weeklyComponentMeaning` must describe a single derivable integer (1-26), never a composite sensor panel, paragraph, or bundle of readings.',
      '- `arcBeat`: narrative function (setup, complication, reversal, darkest moment, escalation, culmination).',
      '- `npcBeat`: which named character appears, what they reveal or conceal, and why it matters.',
      '- `stateSnapshot`: one-line board state entering this week (open nodes, clock levels, companion states).',
      '- `playerGains`: what the player acquires that they did not have before.',
      '',
      '## Fragment Registry — Clue Economy',
      '- Assign fragment IDs (F.01, F.02, ...) for every found document the booklet needs.',
      '- Each entry: { id, title, documentType, author, revealPurpose, clueFunction, weekRef, sessionRef }.',
      '- `clueFunction` is one of: "establishes" (baseline fact), "complicates" (contradicts or adds nuance),',
      '  "reveals" (answers a question or recontextualizes earlier evidence).',
      '- At least 3 fragments must be authored by named characters from the relationship web.',
      '- At least 3 fragments must be verifiable — their claims can be checked against map state,',
      '  cipher outputs, or other fragments.',
      '- No fragment dumps lore. If it contains world-building, it must also contain a clue.',
      '- Use at least 3 documentType values across the full fragmentRegistry once the booklet has 8+ fragments.',
      '- No single documentType may account for more than 45% of the fragmentRegistry once the booklet has 8+ fragments.',
      '- Favor the artifact intent\'s dominant document ecology, but do not collapse into one memo-like default.',
      '- Aim for 15-22 fragments total, distributed across all non-boss weeks.',
      '- Do not over-allocate boss-week fragments: boss sessions must be able to directly reference every boss-week fragmentId.',
      '',
      '## Overflow Document Registry — Institutional Ecology',
      '- Overflow documents appear on weeks where sessions > 3 (the right-side page becomes a found document).',
      '- Plan one overflow document per overflow week. Use IDs starting at F.30 (F.30, F.31, F.32, ...).',
      '- Overflow IDs must NOT collide with fragment IDs.',
      '- Each entry: { id, weekNumber, documentType, author, narrativeFunction, tonalIntent, arcRelationship }.',
      '- Overflow documents represent the institution talking to itself — memos, inspections, internal',
      '  correspondence, procedural forms. They imply systems larger than the player sees.',
      '- Escalation: early overflow documents establish institutional voice and procedural norms.',
      '  Midpoint documents show strain or cover-ups. Late documents deliver revelations.',
      '- At least one overflow document must contradict or complicate a fragment from a different week.',
      '',
      '## Boss Convergence Proof',
      '- `requiredPriorKnowledge` must list at least 3 specific outputs from prior weeks:',
      '  cipher values, cleared zones, companion revelations, or oracle discoveries.',
      '- `whyItFeelsEarned` must explain how spatial mastery, institutional knowledge,',
      '  and relationship navigation all contribute to the decode.',
      '- The decode must not be solvable without prior-week play.',
      '',
      '## Output Rules',
      '- Return compact JSON only, matching the schema below exactly.',
      '- No markdown fences, no explanation.',
      '- Stop after Stage 2.'
    ]);
  };

  window.FLESH_RULES_SPREAD_SPEC = [
      '## Output Schema',
      'Return a single JSON object:',
      '```',
      '{',
      '  "rulesSpread": {',
      '    "leftPage": {',
      '      "title": "string — diegetic heading for the rules page",',
      '      "reEntryRule": "string — what happens when a player misses a session",',
      '      "sections": [',
      '        { "heading": "string", "body": "string — 2-4 sentences explaining this rule in-world" }',
      '      ]',
      '    },',
      '    "rightPage": {',
      '      "title": "string — diegetic heading for the tracking page",',
      '      "instruction": "string — 1-2 sentences explaining how to use the tracking page"',
      '    }',
      '  }',
      '}',
      '```',
      '',
      '## Requirements',
      '- leftPage.sections: at least 4 sections, each with heading + body.',
      '- One section must explain the play cadence in-world (workout → dice → story → mark).',
      '- All text must be diegetic — it should feel like part of the fictional world.',
      '- Match the literary register and narrative voice from the identity above.',
      '',
      'Return ONLY the JSON. No markdown fences, no commentary.'
  ];

  window.buildFleshEndingSpec = function (variant) {
    return [
      '## Output Schema',
      'Return a single JSON object:',
      '{ "variant": "' + variant + '",',
      '  "content": { "documentType": "string", "body": "string (the ending prose)", "finalLine": "string (closing line)" },',
      '  "designSpec": { "paperTone": "string", "primaryTypeface": "string" } }',
      '',
      '## Quality Requirements',
      '- The ending must feel EARNED — reference specific events, characters, and discoveries from the weeks.',
      '- finalLine should land emotionally. It is the last thing the player reads.',
      '- The body should be a substantial in-world document (letter, report, final log entry).',
      '- designSpec should match the document type and world identity.',
      '',
      'Return ONLY the JSON object. No markdown fences, no commentary.'
    ];
  };

  window.FLESH_ENDINGS_BUNDLE_SPEC = [
      '## Output Schema',
      'Return { "endings": [ ... ] } with one object per variant.',
      'Each ending object:',
      '{ "variant": "string",',
      '  "content": { "documentType": "string", "body": "string (the ending prose)", "finalLine": "string (closing line)" },',
      '  "designSpec": { "paperTone": "string", "primaryTypeface": "string" } }',
      '',
      '## Quality Requirements',
      '- Each ending must feel EARNED — reference specific events, characters, and discoveries from the weeks.',
      '- Each variant must be GENUINELY DIFFERENT — different emotional register, different implications, different narrative stance.',
      '- finalLine should land emotionally. It is the last thing the player reads.',
      '- The body should be a substantial in-world document (letter, report, final log entry).',
      '- designSpec should match the document type and world identity.',
      '',
      'Return ONLY the JSON object. No markdown fences, no commentary.'
  ];

  // ── Composition critic (D66): the conductor's ears ────────────────────────
  // Grades the ASSEMBLED booklet on the compositional commitments this file
  // demands. Dimension ids are load-bearing: modules/constants.js
  // CRITIC_DIMENSIONS and modules/critic.js parse against them (generator
  // tests assert parity). Scores are evidence-anchored: a score at or above
  // the ship threshold without cited evidence is invalid by law and gets
  // clamped client-side.
  window.CRITIC_RUBRIC = [
    '## The Rubric — eight dimensions, graded 0-100',
    '',
    'Calibration anchors (grade against these, not against hope):',
    '- 50 = the structure is present but inert — components exist, nothing connects.',
    '- 70 = competent and connected — systems reference each other, arc functions.',
    '- 85 = composed — visible through-lines, payoffs land, the world feels authored.',
    '- 90 = a working game designer would ship this without edits.',
    '- 95+ = reserve for work you would hold up as an exemplar. Most first drafts land 60-80.',
    '',
    '### arcIntegrity',
    'Does the declared arcFamily actually shape the weekly arcBeats? Does the midpoint',
    'RECONTEXTUALIZE prior evidence (name what changes meaning) rather than merely escalate?',
    'Does the darkest moment cost something named and irrecoverable (relational, ethical,',
    'institutional)? Does the ending acknowledge the binary choice, the boss outcome, and a',
    'relationship consequence?',
    '',
    '### systemIntegration',
    'One living board, not parallel games: do oracle paperActions name clocks, nodes, and',
    'companion slots that actually exist in this booklet? Does at least one clock’s',
    'consequenceOnFull change the map? Do cipher outputs open access (route, zone, fragment)',
    'rather than just feeding the boss decode? Does the binary choice fork board state both ways?',
    'If a `percentile-stat` companion is present, is it referenced BY NAME inside oracle',
    '`instruction` text in at least two weeks? A growing stat nothing rolls against is a',
    'decorative page — grade it as inert and cite the oracle instructions that omit it.',
    'THE DECLARED FAMILY: grade the booklet against the recipe of the',
    '`meta.artifactIntent.mechanicGrammarFamily` it declared, on three counts. (a) Is the',
    'family\'s PRESSURE actually spent against the player — is there a printed surface where',
    'the world takes something, on a schedule the player does not control? A declared `heat`',
    'book whose attention never rises, or a `siege` book whose clock the player can stop, has',
    'a label instead of a genre. (b) Is the family\'s DECISION present every week — does the',
    'player choose between named alternatives with different costs, or is the week a sequence',
    'of instructions? (c) Are the family\'s REFUSALS honoured, including the exclusions the',
    'booklet declared for itself in `artifactIntent.exclusions`? Cite the surface that carries',
    'the pressure (or the absence of one) and the week where the decision is made.',
    '',
    '### clueEconomy',
    'Are the mystery questions answerable from evidence physically present in the booklet?',
    'Are false assumptions planted by one document and corrected by a later one — both',
    'identifiable? Do at least three fragments have distinct linked functions (action-changing,',
    'interpretation-changing, character-deepening)? Is any non-boss week clue-free?',
    'Posted manifests (`manifestPointer`): does every chase resolve on the surface it pointed',
    'at — is the thing the manifest named recognisably present when the player arrives? No',
    'dangling anticipation, no chain that fizzles into an unrelated document. Cite the posted',
    'line and the payoff it landed on (or failed to).',
    '',
    '### motifPayoff',
    'Do recurring objects, places, or phrases appear in at least two non-adjacent weeks AND',
    'mean something different at their final appearance? A motif that merely recurs is',
    'decoration — grade it as inert. Cite the first and final appearances.',
    '',
    '### worldCohesion',
    'Core Noun Roster discipline: do ciphers, map nodes, oracle entries, and fragments',
    'reference nouns established in the worldContract, or does stray lore appear late? Does',
    'the document ecology honor its declared dominant/forbidden types? Is the institutional',
    'voice consistent across documents that claim the same author or department?',
    '',
    '### briefFidelity',
    'Does the tone and register match the user’s brief — including its simplicity, if it is',
    'simple? Has the structural scaffold drowned the voice (institutional gravity the brief',
    'never asked for)? Are named references honored as templates, not decoration? Is the prose',
    'free of banned cliche patterns?',
    'Grade against the booklet’s OWN recorded reading (`meta.artifactIntent.reading`) when it',
    'is present. THREE distinct failures live here and they cite differently: (a) the booklet',
    'departs from its recorded reading — cite the reading field and the prose that contradicts',
    'it; (b) the recorded reading itself is not supportable by the brief, most often a',
    '`briefEvidence` that asserts more than the brief says — cite the reading field and the',
    'brief phrase it overreaches; (c) THE REGISTER AXIS — the artifact\'s register contradicts',
    'the reading\'s own `tone` words. `tone` is the field that quotes the brief; `register` and',
    '`genreTemplate` CLASSIFY it, and a classification can go institutional, procedural or grim',
    'on a brief that supplied none of it. So grade the pages against the TONE words and quote',
    'them: name the tone words, then name the prose, shell, document ecology or cast those words',
    'cannot support. A tone recorded as warm, absurd, domestic or wondrous, printed as classified',
    'procedure, is a failure here even when every other field agrees with itself — reading and',
    'artifact agreeing is not evidence, because both can be wrong in the same direction.',
    'A misread is now localizable; say which of the three it is, and cite the words.',
    '',
    '### fusionPacing',
    'Does the physical modality of each week’s workout map to the narrative register per the',
    'fusion matrix (heavy = crushing pressure, sprints = frantic evasion, deload = false safety)?',
    'Do heavy weeks land on crisis beats and deloads breathe? Do at least half the sessions end',
    'unresolved? Are storyPrompts inside their length budgets with a physical action, sensory',
    'detail, and material object? Zero gym metaphors in the fiction? Do interludes assign',
    'real off-session engagement (a question to weigh, a code to crack, a map to study)',
    'rather than ornamental prose breaks?',
    'THE FUSION FRAME. Grade the SEQUENCE, not the weeks one at a time. Pacing is a property',
    'of the whole book: every week is written to be good AS A WEEK, so every week wants to be',
    'loud, and a book of individually strong weeks is flat. The measured frame supplied after',
    'the digest is the play-order sequence — per week, the training load index, the printed',
    'prose index, the story labels, and the mechanical surfaces that week actually prints.',
    'Audit it on four counts, and cite weeks by number and index.',
    '(a) THE LAW — stakes parallel the load, texture counterpoints it. What a week is ABOUT',
    'rises with the training load: what is at risk, what converges, what can no longer be',
    'postponed. How the page SPEAKS moves the other way — spare, cold, procedural exactly when',
    'the body roars; open and human when it rests. Two curves rising together is doubling, not',
    'harmony: the player\'s body is already the loudest instrument in the room on a peak day,',
    'so a page that also shouts is redundant and inaudible. Audit the extremes hardest — the',
    'peak week should carry the quietest prose at the highest stakes, the deload the warmest',
    'prose with the longest view.',
    '(b) DISCORD — a week whose load is high and whose beat is administrative: the body at its',
    'limit while the page files paperwork with nothing at stake. Name the week, its load index,',
    'and the surface that idles.',
    '(c) FLATNESS — every week at the same dynamic. If the prose index barely moves across the',
    'book, or every week prints the same inventory of surfaces in the same proportions, the',
    'book is mezzo-forte for its whole length. Grade that as inert even when each week is',
    'individually competent, and say which weeks should have been quiet.',
    '(d) THE DELOAD IS THE EXHALE — a lighter week must carry content, not padding: the',
    'aftermath, the arriving document, the count taken. A deload whose story idles because the',
    'body is idling is a dropped bar, and the frame shows it as a light week whose prose index',
    'and surface list both collapse.',
    'Findings on these four counts are usually STRUCTURAL (see the failure contract): a week',
    'that is loud in the wrong place cannot be fixed by retinting its sentences.',
    'THE CONDUCTOR\'S READ. When a "Conductor\'s Read" section is present after the frame, weigh',
    'it as evidence rather than as opinion: it is a dedicated pass over the play-order sequence',
    'by a reader shown the score and none of the prose, so it hears phrasing a full read passes',
    'over every time — adopt its verdicts into your own, or cite the prose that shows a reading',
    'is wrong. Its prioritized findings are already open failures on this dimension.',
    '',
    '### voiceDiscipline',
    'Read the prose as a cold auditor: the text and the rules, nothing else.',
    'MULTI-HAND: put two documents by different named in-world authors side by side',
    'with the bylines removed — could you tell them apart by what each records, omits,',
    'and how each formats? If not, the booklet has one hand wearing several names;',
    'grade it as inert and cite both documents. Do the declared',
    'meta.literaryRegister.mechanisms actually show in the prose, or are they a label',
    'the text never honors?',
    'TERMINAL POSITION: read the FINAL TWO SENTENCES of storyPrompts, interludes,',
    'fragments, and endings (including finalLine). Do units end on work, motion, or',
    'the next obligation — or on an aphorism, a mirrored or definitional turn, an',
    'image of the anomaly, or a short flat sentence positioned as a closer? Is any',
    'ending ASSEMBLED — safe facts pulled out of their natural grouping to close on?',
    'TERMINAL SURFACES face the STRICTEST scrutiny of all: the final interlude, the',
    'boss narrative, and the endings are read after maximum invested effort, so the',
    'final-two-sentences law applies HARDEST there. A tic that would cost a point in',
    'a week-2 storyPrompt is a failure on these surfaces — audit them first, and',
    'cite them by name.',
    'LICENSES: every genre move (aphorism, direct address, fragments-as-rhythm,',
    'ominous closer) must be declared in meta.literaryRegister.licensedMoves and stay',
    'inside its stated budget. An undeclared move is a failure; so is a declared one',
    'over budget. A declared move is ALSO graded for PLACEMENT and PAYOFF: resonance',
    'lives at the end, so its licensed home is the terminal surfaces — a license',
    'spent in an early storyPrompt, a non-final interlude, or a fragment is spent',
    'before the reader has earned it, and a license that never pays off where the',
    'investment peaks is a wasted declaration. Cite where each spend landed. The',
    'machine-tells — echo-callbacks, corrective constructions, wry',
    'appositives, short-short drumbeats, assembled endings, narrator amusement — are',
    'unlicensable in every genre.',
    'FUNDING: does documentary prose carry real procedural particulars (instruments,',
    'paperwork, order of operations), roughly three per 150 words — or does it',
    'decorate because it has nothing true to select from?'
  ];

  window.CRITIC_EVIDENCE_LAW = [
    '## Evidence Law (scores are claims; claims need exhibits)',
    '- Every dimension score MUST cite at least two evidence entries: a JSON path or location',
    '  ("weeks[2].sessions[1].storyPrompt", "fragments F.07") plus a verbatim quote of at most',
    '  15 words from the booklet.',
    '- A score of 90 or above with fewer than two evidence entries is INVALID.',
    '- A score of 90 or above while open failures remain for that dimension is INVALID.',
    '- Evidence must support the score given. Citing strong material while scoring low, or',
    '  weak material while scoring high, makes the verdict incoherent — do not do it.',
    '- You are an adversarial critic. Your job is to find where the composition fails, then',
    '  grade what remains honestly. You are not the author’s friend and not their enemy.'
  ];

  window.CRITIC_FAILURE_CONTRACT = [
    '## Failure + Directive Contract',
    'For every weakness that holds a dimension below threshold, emit a failure object:',
    '- "dimension": the dimension id.',
    '- "unitType": one of "week" | "fragment" | "ending" | "rulesSpread" — the ONE unit whose',
    '  revision would fix this. Directives must be executable within that unit alone; never',
    '  demand cross-unit renames or structural rebuilds.',
    '- "unitRef": weekNumber (number) for weeks, fragment id (string) for fragments, ending',
    '  variant (string) for endings, "rulesSpread" for the rules spread.',
    '- "issue": one sentence naming what is wrong, with the evidence location.',
    '- "directive": one imperative sentence a reviser can execute inside that unit — concrete,',
    '  targeted, preserving all ids, refs, and enum vocabulary.',
    '- "scope": "prose" or "structure". Default to "prose": the directive is executable by',
    '  rewriting sentences inside the unit. Use "structure" ONLY when rewording cannot fix the',
    '  finding because the unit\'s SHAPE is the cause — it is about the wrong thing, it is loud',
    '  in the wrong place, it carries the wrong object, or its pressure sits on the wrong',
    '  printed surface. A structural failure licenses the reviser to RE-DECIDE that aspect;',
    '  a prose failure never does.',
    '- "reopen": required when scope is "structure", omitted otherwise. An array of one or more',
    '  of the seven aspects below — name only the ones your directive actually needs reopened,',
    '  because everything you do not name is frozen for that revision:',
    '  - "beat": what the unit is ABOUT — its position in the arc, what is at risk in it, what',
    '    it converges or postpones.',
    '  - "dynamics": how loudly the unit SPEAKS — its prose volume and register against the',
    '    training load of its week, including making it shorter.',
    '  - "motif": which recurring object, place, or phrase the unit carries, and what that',
    '    object means at this point in the book.',
    '  - "mechanism": which printed surface carries the unit\'s pressure — what the clock,',
    '    oracle, door, cipher, or mark strip is keyed to and what it answers.',
    '  - "economy": where the unit\'s value flows — what its marks bank into, what its spend',
    '    buys, and which surface downstream reads the result.',
    '  - "gate": what the unit locks and what opens it — which key the player must already',
    '    hold, and how far ahead of the lock they can hold it.',
    '  - "decision": what the unit asks the player to CHOOSE — whether it forks at all, and',
    '    what mechanically differs across the branches.',
    '  The last three are the play wiring, and they exist because a dead sink, a key that',
    '  arrives too late, and a week that asks nothing are not fixable by re-keying a surface.',
    '  A "structure" scope with no reopen array is read as "prose", so name the aspect.',
    'The revision runs under floors you cannot waive and must not ask for: the training itself',
    '(sessions, exercises, sets, reps), every id and cross-reference, and the decode spine',
    '(weekly component values, the boss decoding key) survive every revision unchanged. A',
    'directive that requires changing any of them cannot be executed and will be discarded.'
  ];

  // The conductor's prompt. Deliberately short: its whole input is the score
  // block plus the brief, because the read's value comes from what it is NOT
  // shown. Doctrine and output contract come from INST_CONDUCTOR +
  // SCHEMA_CONDUCTOR through the stage map, so this builder holds no prompt
  // content of its own — the coupling contract, same as every other stage.
  window.buildConductorPrompt = function (scoreBlock, brief) {
    return [
      '# The Conductor\'s Pass — Play-Order Sequence Review',
      '',
      '## The User\'s Creative Brief (the register the phrasing serves)',
      brief || '(no brief provided — read the phrasing against the book\'s own declared markings)',
      '',
      window.buildStageSchema('conductor'),
      '',
      scoreBlock,
      '',
      'Return ONLY the JSON object. No fences, no commentary.'
    ].join('\n');
  };

  window.buildCriticPrompt = function (bookletDigestJson, brief, machineFindings, fusionFrameBlock) {
    // The fusion frame (Teeth T4) rides AFTER the digest, next to the machine
    // findings, because both are measurements rather than instructions — and
    // because the sequence has to be the last thing read before the verdict is
    // written, not the first thing read before thirty thousand tokens of book.
    // Built by modules/critic.js buildFusionFrame + formatFusionFrameBlock.
    var frameBlock = (typeof fusionFrameBlock === 'string' && fusionFrameBlock.trim())
      ? ['', fusionFrameBlock] : [];
    var machineBlock = (machineFindings && machineFindings.length) ? [
      '',
      '## Machine Findings (measured by the pipeline — these are facts, not opinions)',
      'Each finding below MUST appear as a failure with a unit-scoped directive under the',
      'relevant dimension: text-budget breaches belong to fusionPacing, Core Noun Roster',
      'findings to worldCohesion, growing-stat (percentile-stat) findings to systemIntegration,',
      'terminal-position voice tics (mirrored aphorism, short-short drumbeat) to voiceDiscipline.',
      'A dimension with a standing machine finding cannot score at or above the ship threshold.'
    ].concat(machineFindings.map(function (f) { return '- ' + f; })) : [];
    return [
      '# Composition Critic — Assembled Booklet Review',
      '',
      'You are grading an assembled print-and-play booklet (a workout journal fused with a',
      'solo paper RPG) against the compositional commitments its generation contract makes.',
      'The machine validator has already checked schema, counts, and reference integrity —',
      'do NOT re-check those. You grade the MUSIC, not the notes: whether the composition',
      'coheres as a play experience.',
      '',
      '## The User’s Creative Brief (fidelity target)',
      brief || '(no brief provided — grade briefFidelity on internal tonal consistency)',
      ''
    ].concat(window.CRITIC_RUBRIC, [''], window.CRITIC_EVIDENCE_LAW, [''], window.CRITIC_FAILURE_CONTRACT, [
      '',
      '## Output Contract',
      'Return ONLY a JSON object, no markdown fences, no commentary:',
      '{',
      '  "verdict": {',
      '    "arcIntegrity":      { "score": 0, "evidence": [{ "path": "...", "quote": "..." }], "failures": [] },',
      '    "systemIntegration": { "score": 0, "evidence": [], "failures": [] },',
      '    "clueEconomy":       { "score": 0, "evidence": [], "failures": [] },',
      '    "motifPayoff":       { "score": 0, "evidence": [], "failures": [] },',
      '    "worldCohesion":     { "score": 0, "evidence": [], "failures": [] },',
      '    "briefFidelity":     { "score": 0, "evidence": [], "failures": [] },',
      '    "fusionPacing":      { "score": 0, "evidence": [], "failures": [] },',
      '    "voiceDiscipline":   { "score": 0, "evidence": [], "failures": [] }',
      '  },',
      '  "summary": "two sentences: the composition’s strongest through-line and its weakest seam"',
      '}',
      'Every failure object follows the Failure + Directive Contract exactly.',
      '',
      '## The Assembled Booklet (digest — workout exercise lists compacted)',
      bookletDigestJson
    ], frameBlock, machineBlock).join('\n');
  };

  // Revision prompt: apply the critic’s directives to ONE unit, changing
  // nothing that was not directed. The validity floor is enforced client-side
  // (a revision that increases validation errors is reverted), but the prompt
  // carries the preservation laws so revisions rarely need reverting.
  //
  // STRUCTURAL REACH (Teeth T4). `reopenScopes` is the closed menu from
  // STRUCTURAL_REOPEN_SCOPES in modules/constants.js — the aspects of the unit's
  // SHAPE this revision may re-decide. Empty (the default) means the unit's
  // shape is fixed and only its prose moves, which is what every revision could
  // do before this round. The licence text below is quoted from that constant;
  // the generator tests assert the two surfaces agree.
  window.buildUnitRevisionPrompt = function (unitLabel, unitJson, directives, contextJson, reopenScopes) {
    var directiveLines = (directives || []).map(function (d, i) { return (i + 1) + '. ' + d; });
    var REOPEN_LICENCES = {
      beat: 'what this unit is ABOUT may change — its position in the arc, what is at '
        + 'risk in it, what it converges or postpones',
      dynamics: 'how loudly this unit SPEAKS may change — its prose volume and register '
        + 'against the training load of its week, including cutting it shorter',
      motif: 'which recurring object, place, or phrase this unit carries may change, and '
        + 'what that object means at this point in the book',
      mechanism: 'which printed surface carries this unit\'s pressure may change — what the '
        + 'clock, oracle, door, cipher, or strip is keyed to and what it answers',
      // The ludic scopes (W4b) — the simulated player's soft findings arrive
      // here. Byte-quoted from STRUCTURAL_REOPEN_SCOPES like the four above.
      economy: 'where this unit\'s value flows may change — what its marks bank into, what its '
        + 'spend buys, and which surface downstream reads the result',
      gate: 'what this unit locks and what opens it may change — which key the player must '
        + 'already hold, and how far ahead of the lock they can hold it',
      decision: 'what this unit asks the player to CHOOSE may change — whether it forks at all, '
        + 'and what mechanically differs across the branches'
    };
    var reopened = (reopenScopes || []).filter(function (id) { return !!REOPEN_LICENCES[id]; });
    var reopenBlock = reopened.length ? [
      '## Reopened Constraints — this revision may RE-DECIDE these, not merely reword them',
      'The critic found the cause of these directives in the unit\'s shape, not its sentences.',
      'The aspects listed here are open questions again, and answering them differently is the',
      'point of the revision. Everything NOT listed here is frozen, including every field the',
      'preservation laws name.'
    ].concat(reopened.map(function (id) {
      return '- ' + id + ': ' + REOPEN_LICENCES[id];
    })).concat([
      'Re-deciding is not rebuilding: the unit keeps its contractual counts and its printed',
      'surfaces still exist. A reopened mechanical assignment re-keys a surface or swaps what it',
      'answers; it never deletes the surface, and a week that arrives without an oracle, a',
      'cipher, a map, a door it owed, or its micro-lines is discarded and the original kept.',
      ''
    ]) : [];
    return [
      '# Targeted Revision — ' + unitLabel,
      '',
      'You are revising ONE unit of an already-assembled booklet. A composition critic has',
      'issued the directives below. Apply ALL of them. Change NOTHING that a directive does',
      'not name.',
      ''
    ].concat(reopenBlock, [
      '## Preservation Laws (violating any invalidates the revision)',
      '- Keep every id, fragmentRef, weekNumber, variant, and cross-reference exactly as-is.',
      '- Keep the structure: same fields, same array lengths where counts are contractual',
      '  (oracle tables keep exactly 10 entries with the same roll bands).',
      '- Keep all enum vocabulary (documentType, clock types, companion types, map types).',
      '- Keep exercises, sets, and reps untouched — the workout is never revised. Session count',
      '  and session numbering are part of the workout.',
      '- Keep the decode spine: weeklyComponent.value, boss componentInputs, and the boss',
      '  decodingKey are already sealed into the ending\'s password. Changing one breaks a',
      '  puzzle the reader only opens at the end of the block.',
      '- Prose may change freely WHERE A DIRECTIVE POINTS. Adjacent prose stays.',
      '',
      '## World Context (stay inside it — no new nouns, no stray lore)',
      contextJson,
      '',
      '## Directives',
      directiveLines.join('\n'),
      '',
      '## The Current Unit',
      unitJson,
      '',
      '## Output',
      'Return ONLY the complete revised unit as a JSON object. No fences, no commentary.'
    ]).join('\n');
  };
