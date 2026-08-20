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
    '  * THE RULEBOOK\'S CURRENCY IS THIS BOOK\'S CURRENCY. If the rules given to you above name a currency, `currencyLabel` MUST be that phrase VERBATIM — character for character, no rewording, no expansion, no shortening. This is a blocking check. The rules teach the player one word and then every reckoning line in the book prints this field; two different words means the player is taught a currency they never see again. You are not choosing the name here, you are carrying it. Invent a label ONLY when the rules named none.',
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
    '- `palette` (object): { ink, paper, accent, muted, rule, fog } — all six are 6-digit hex',
    '  strings, `#rrggbb`. Not `#fff`, not a colour name; anything else is refused.',
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
    // ONE VOCABULARY (2026-08-17). This line offered ten hyphenated
    // technique NAMES; the planning stage that SCHEDULES the week's cipherType
    // and the floor that counts distinct techniques both work in the FAMILY
    // framing (constraint logic, spatial route reading, fragment
    // cross-reference, pattern recognition, typographic anomaly, observational
    // anomaly hunting, metapuzzle assembly, process deduction). Two vocabularies
    // for one field is how a plan that scheduled six distinct families arrives
    // as six weeks the variety floor cannot tell apart. The keep-the-family
    // instruction is unchanged: the plan decides, this stage executes.
    '- `type` names the cipher technique, in the SAME family vocabulary the plan used: constraint logic, spatial route reading, fragment cross-reference, pattern recognition, typographic anomaly, observational anomaly hunting, metapuzzle assembly, or process deduction. If the plan assigned this week a technique, KEEP IT — the variety floor counts families across the whole book and one week drifting to another family can put the book under its floor.',
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
    // ── THE TAUGHT HALF of clockReachabilityFloorErrors (W3, D186 idiom) ────
    // The floor reads the spine's own edges; this is the sentence that tells
    // the model what those edges oblige it to print. Landed in the same edit
    // as the floor, and the registry row `week-clock-reachable` holds them
    // together.
    '- A clock this week FEEDS is a clock this week PRINTS. If the play spine has an edge',
    '  out of this week (`reckoning:W<n>`, `markStrip:W<n>.x`, `door:W<n>`) into a',
    '  `clock:<name>`, that clock belongs in THIS week\'s gameplayClocks, spelled exactly as',
    '  the spine spells it. A week whose play writes into a clock the page never prints is a',
    '  loop the player is told about and given no surface to touch — the reader marks nothing,',
    '  and the economy exists only in the rules.',
    '- If the rules describe a clock as something the player touches every week, it belongs in',
    '  every week. A clock that only arrives later should say from which week in the rulebook\'s',
    '  weekShape answer.',
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
    '- `kind` (string, required): "logic-grid" | "nonogram" | "sudoku" | "kakuro" | "kenken" | "truth-tellers" | "sequence". No other value is accepted — the dense crossword has no solver here yet and is refused.',
    '',
    'WHICH GRID, AND WHY. Five kinds is a shelf, not a list; pick the one whose PLAY matches the beat, and note what each one refuses to be.',
    '| Kind | Choose it when | It refuses |',
    '|------|----------------|------------|',
    '| `logic-grid` | The week is about WHO or WHICH — testimony, suspects, assignments, a matching that the fiction already cares about. The clues are sentences in the world\'s voice, so the puzzle carries prose. | Anything with no cast. It needs named entities the story owns. |',
    '| `nonogram` | The answer should be SEEN before it is read — a shape emerging from static, a signal resolving. Purely spatial; the letters are scattered in it. | Carrying story. Its clues are numbers and say nothing in the world\'s voice. |',
    '| `sudoku` | The week wants a long, quiet, self-checking grind with no fiction attached — a discipline the character performs. Difficulty scales cleanly with the load curve. | Meaning. A sudoku is content-free by construction, so it never advances the story on its own. |',
    '| `kakuro` | The world runs on ARITHMETIC the player should feel — accounts, rations, tallies, weights. The sums are diegetic numbers on a diegetic form. | Letters. Its answer is digits, so the lock it opens must want digits. |',
    '| `kenken` | You want a short arithmetic puzzle with visible STRUCTURE — cages the eye reads as regions, districts, cells, shifts. Small boards bite hard. | Length. Six on a side is the ceiling; it is a sharp beat, not a long sitting. |',
    '| `truth-tellers` | Somebody is LYING and the player must work out who. The statements are dialogue, so this is the one grid that advances the plot while being solved — testimony, interrogation, a crew you cannot all trust. | Neutrality. Every statement is a character speaking, so it needs voices the story owns and costs prose to run. |',
    '| `sequence` | The question is WHAT ORDER — a route walked, a schedule kept, a watch rota, the order things were taken. Its clues are ordinal ("before", "two apart", "not last"), which is the one thing a logic grid cannot say. | Simultaneity. Everything it orders happened one at a time, so it cannot express two things at once or a thing in two places. |',
    'A book that prints the same kind on every week that carries a grid has chosen once and repeated the choice.',
    '',
    'AND THE ONE THING NOT ON THIS SHELF, because it is already on another. A NODE MAZE — labelled choices at junctions, doors you decide whether to open — is the `maze` map geometry, not a grid: `nodes[].label` and the "door" state are exactly that puzzle, and the board prints week over week where a grid prints once. What the maze does not carry is a cost for walking it; a discovered dead end is intel, and traversal never charges the player. So a maze that should feel dangerous takes its danger from the ECONOMY it is wired into: price a door as a spend, tick a clock while the goal is unreached, or seal the goal so arriving is what opens it. Declare those edges in `economyGraph`.',
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
    'TRUTH-TELLERS (the knights-and-knaves form):',
    'Some speakers always tell the truth and the rest always lie; the player marks which is which. The board prints one row per speaker and two mark columns, with the statements numbered underneath.',
    '- `speakers` (string[]): the voices, by name. **Limits: 3-6 speakers,** each name 22 characters or fewer. Two is a coin flip once either one talks.',
    '- `roleLabels` (object, required): { truth, lie } — what THIS world calls the two kinds, in its own words. These two words are the board\'s column headings. Never "TRUTH" and "LIE": nothing printed in this book is the engine talking. Give them the world\'s names — SWORN and FORSWORN, CLEAN and TAINTED, whatever the fiction earns.',
    '- `statements`: [{ speaker, text, claim }] — **2-8 statements.** `text` is the line the character actually says, in their own voice; `claim` is the same assertion in machine form, and the two MUST agree. A speaker may talk more than once, or not at all.',
    '- `claim.type` is a CLOSED enum of six: "is" | "same" | "differs" | "and" | "or" | "count".',
    '  "is"      { type, speaker, role } — that speaker is of that kind. `role` is "truth" or "lie".',
    '  "same"    { type, speaker, otherSpeaker } — those two are of the same kind.',
    '  "differs" { type, speaker, otherSpeaker } — those two are of different kinds.',
    '  "and"     { type, claims[] } — every joined claim holds. Two or more.',
    '  "or"      { type, claims[] } — at least one holds. Two or more.',
    '  "count"   { type, role, comparator, n } — how many speakers are of that kind. `comparator` is "exactly" | "at-least" | "at-most".',
    '- Nest "and"/"or" no more than 3 deep. Past that it is not a statement a player can hold in their head between sets.',
    '- THE RULE THE WHOLE PUZZLE RUNS ON: a truthful speaker\'s claim must be TRUE, and a lying speaker\'s claim must be FALSE. A liar saying "I am a liar" is a paradox with no solution, and the gate refuses it.',
    '- Truth-teller `answerFrom.mode` is a CLOSED enum of two: "roles" | "initials". "roles" { mode } reads one letter per speaker in order, T for the truthful kind and L for the other. "initials" { mode, role } reads the first letters of the speakers holding that one role, in speaker order.',
    '- Decide who is lying FIRST, then write statements that force exactly that arrangement, then check that no other arrangement survives them. Every speaker must be pinned down by something, or two answers survive.',
    '',
    'SEQUENCE (routes and schedules — one kind, because they are one object: things in an order, constrained):',
    '- `items` (string[]): the things being ordered. **Limits: 3-6 items,** each label 22 characters or fewer.',
    '- `slots` (string[]): the positions, IN ORDER — exactly as many as there are items. The labels carry the fiction: stops on a round, days of a week, watches, berths, shifts.',
    '- `axisLabel` (string, optional): the heading printed over the slot columns, in this world\'s words — ORDER OF CALL, WATCH, THE ROTA.',
    '- `orderClues`: [{ text, constraint }] — **2-12 clues.** NOT `clues`: that field belongs to the logic grid and speaks a different constraint language. `text` is the sentence the player reads; `constraint` is the same fact in machine form, and the two MUST agree.',
    '- `constraint.type` is a CLOSED enum of six: "at" | "not-at" | "before" | "after" | "adjacent" | "gap".',
    '  "at"       { type, item, slot } — this item takes this slot.',
    '  "not-at"   { type, item, slot } — it does not.',
    '  "before"   { type, item, otherItem } — the item comes earlier than the other.',
    '  "after"    { type, item, otherItem } — later.',
    '  "adjacent" { type, item, otherItem } — the two are next to each other, in either direction.',
    '  "gap"      { type, item, otherItem, n } — they are exactly n slots apart, in either direction. n=1 is the same as "adjacent"; use "adjacent" when that is what you mean.',
    '- Sequence `answerFrom.mode` is a CLOSED enum of two: "slot" | "initials". "slot" { mode, slot } reads whichever item ended up in that slot; "initials" { mode } reads the first letters of the items in slot order.',
    '- WATCH THE PROSE AGAINST THE MACHINE FORM. "Two calls stood between them" is a gap of THREE, not two — `gap` counts the distance between positions, so two apart means one thing in between. A clue whose sentence and constraint disagree is a puzzle the player cannot solve from the page.',
    '- Fix the order FIRST, then write clues that force it, then check no other ordering survives them. A sequence with two answers is the commonest failure and it is always caused by writing clues before fixing the order.',
    '',
    '### fieldOps.wordGrid (OPTIONAL — the letter hunt, or the interlocking grid)',
    'Two printed objects share this seat, and they are chosen for opposite reasons. A WORD SEARCH hands the player a full board and asks them to ring what is already there — quiet, meditative, a between-sets surface. A CROSSWORD hands them an empty interlocking shape and asks them to WRITE: it is the natural implement for meta-stories where the reader is the character, because every answer the reader supplies is the reader supplying it. Reach for the crossword when the book is about knowing, naming, or reconstructing — and for the search when it is about looking.',
    'Optional, at most one per week, and the same REFUSAL RULE governs both: the solver reads what you declared and refuses the puzzle if it cannot prove it is finishable.',
    '- `kind` (string, required) for a word grid: "word-search" | "crossword". No other value is accepted.',
    '- `title` (string, required): diegetic heading. `instruction` (string, optional): what the player does and how the answer is read.',
    '- `answer` (string, required — BOTH kinds): the code the finished grid yields, written out in full. It is NEVER printed; it is what the solver checks the puzzle against and what the seal or the assembly wants. `answerFrom` is the RULE that derives it and `answer` is the RESULT of applying that rule — you must declare both, and the solver refuses the week when they disagree or when `answer` is empty.',
    '- `grid`: string[] — one string per row, letters A-Z only, every row the same length. **Limits: 6x6 to 12x12 letters.**',
    '- `words`: [{ word, row, col, direction }] — **4-10 words**, each 3-12 letters. `row` and `col` are 1-BASED coordinates of the word\'s FIRST letter, counting from the top-left cell.',
    '- `direction` is one of "E" | "S" | "SE" | "NE" | "W" | "N" | "SW" | "NW". The last four read backwards or up; use them sparingly, they are what makes a board hard.',
    '- THE PLACEMENTS ARE THE ANSWER KEY AND ARE NEVER PRINTED. The page shows the board and the word list; the coordinates exist so the gate can prove the words are really there.',
    '- `wordGrid.answerFrom.mode` is a CLOSED enum of three: "leftovers" | "word" | "marked". A WORD SEARCH uses the first two — "leftovers" { mode } reads every letter no word covers, left to right, top to bottom, and "word" { mode, index } names the 1-based position in the word list. "marked" belongs to the crossword and is described below; a word search that declares it is refused.',
    '- Place the words first, then fill every remaining cell. In "leftovers" mode those filler letters ARE the answer, in reading order, so count the uncovered cells before you choose what they must spell.',
    '',
    '#### If `kind` is "crossword" — THE LOOM BUILDS THE GRID, YOU WRITE THE CLUES',
    'You do not draw this grid and you must not try. You supply a POOL of answer/clue pairs; the machine weaves them into an interlocking shape, numbers it, and prints it. That division is deliberate: solvability is the machine\'s guarantee, voice is yours. Every ounce of your effort goes into the clues.',
    '- `entries`: [{ answer, clue }] — **12-24 pairs**, each answer 3-12 letters, A-Z only, no digits, no spaces, each answer appearing once.',
    '- THE POOL IS A SUPPLY, NOT A PLACEMENT DEMAND. The loom weaves whatever interlocks and DROPS the rest, and only the placed entries are printed with their clues. Offer generously. A pool of twelve near-identical long words weaves a worse grid than a pool of twenty mixed ones.',
    '- WHAT MAKES A POOL WEAVE: shared letters. Words interlock where a letter of one is a letter of another, so a pool heavy in common letters (A, E, R, S, T, L, N) crosses well and a pool of rare-letter words does not cross at all. Mix lengths — short words are the connective tissue that lets long ones cross. At least **6** of your entries must end up placed or the puzzle is refused.',
    '- THE ANSWERS COME FROM THIS BOOK\'S OWN WORLD — the Core Noun Roster, the places, the objects, the names the fiction has already taught. A crossword answer the reader has no way to know is not a puzzle, it is a quiz.',
    '- `clue` (required on every entry): this is the writing. A crossword clue is a tiny piece of voice — oblique, in the book\'s register, earned by the fiction. "Holds you, or drowns you" is a clue for ANCHOR; "A type of ship fastening" is a dictionary. Never define the word; characterise the thing.',
    '- `wordGrid.answerFrom.mode` for a crossword is "marked" | "word" ("leftovers" belongs to the search — a crossword has no uncovered letters). "word" { mode, index } names the 1-based entry whose answer IS the key, and that entry must be one the loom placed. "marked" { mode, picks } is the classic: `picks` is an ordered list of { entry, letter }, both 1-based, and the letters they name — read in that order — spell the key. Those cells print shaded.',
    '- YOU CANNOT NAME A GRID SQUARE, because the grid does not exist when you write. That is why `picks` names an ENTRY and a LETTER POSITION instead of a row and a column. The loom converts them once it has woven.',
    '- DERIVE `answer` YOURSELF AND WRITE IT OUT — you do not need the woven grid to do it, because `picks` indexes YOUR OWN pool. For each pick in order take `entries[entry - 1].answer` and its `letter`-th character (both 1-based) and concatenate them; that string IS `answer`. In "word" mode `answer` is simply `entries[index - 1].answer`. Every entry a pick names must be one you expect the loom to place, so pick from your shortest, most-crossable answers. A week whose `answer` is missing, empty, or disagrees with what the picks spell is REFUSED.',
    '- The finished grid is at most 15x15 and is cropped to whatever the words made — you do not choose a size.',
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
    '- One leftPage section must explain the play cadence in-world',
    // THE ESTABLISHMENT SURFACE (W1). Additive-optional in the artifact schema
    // so every existing book still validates; described here because this is
    // the shape surface the shell stage authors rulesSpread from.
    '- `orientation` (object): { situation, cast }. The plain-words establishing shot —',
    '  `situation` is 2-6 sentences (200-700 chars) saying what is happening here, and `cast`',
    '  is 3-8 entries of { name, role, note } naming the people this book is about. Written',
    '  flat, outside the fiction\'s voice. See the Rules Page Requirements for the full demand.'
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

  // SCHEMA_WEEK_PLAN deleted (author-ruled 2026-08-18, DR-39/D203's proposal):
  // campaign-plan-era leftover with no stage; routing it would have created a
  // second description of the plan's week shape beside STRUCTURED_SCHEMA_CAMPAIGN
  // — the exact two-descriptions defect D203 removed. The sketch lives in git log.

  window.SCHEMA_SINGLE_WEEK = [
    '## week (object)',
    'Generate exactly ONE week object.',
    '- `weekNumber` (integer): 1-indexed',
    '- `title` (string): chapter title inside the world',
    '- `epigraph` (object): { text, attribution }',
    // THE PLAIN-STAKES LINE (W1, 2026-08-18). The epigraph is the week's MOOD
    // and is allowed to be oblique; nothing on the week's opening page has ever
    // said, in words a stranger can act on, what is actually at stake. This
    // field is that sentence, and it prints directly under the epigraph in the
    // flat instrument face.
    '- `stakesLine` (string, 40-240 chars): ONE flat sentence, second person, present tense,',
    '  naming what is scarce, threatened or wanted THIS week. It must contain either a NUMBER',
    '  or the name of a printed surface (a clock, a track, a strip, a board, a table). Not a',
    '  mood and not a tease: "Three cells on the tide clock are already filled; fill the last',
    '  four and the causeway closes for good." Flat register, like the rules page — this is the',
    '  line that tells a reader who understood nothing else what this week is about.',
    '- `isBossWeek` (boolean)',
    '- `weeklyComponent` (object): { type, value, extractionInstruction }',
    '- `sessions` (array, 3-6 items): { sessionNumber, label, exercises: [{ name, sets, repsPerSet, weightField?, notes? }], storyPrompt, fragmentRef?, markStrip, binaryChoice?: { choiceLabel, promptA, promptB } }',
    // F9's teaching half. The floor (validateWeekSchema, D111) has refused
    // unprintable rep targets since the Teeth Round; nothing ever ASKED for a
    // printable one, and the measured defect was a model transcribing "3xAMRAP"
    // as `repsPerSet: -1` in one week and `null` in another — obeying "transcribe
    // the user\'s workout exactly" and being blocked for it. Stage-only by
    // routing, on the D170 precedent below: SCHEMA_SINGLE_WEEK is not in
    // SCHEMA_SPEC, so the paste path pays nothing.
    '- `exercises[].repsPerSet` PRINTS VERBATIM INSIDE THE REP BOXES, so it must be something a player can act on:',
    '  a positive count (`5`, `8`) or a written target in plain words (`"AMRAP"`, `"8-12"`, `"45s"`, `"to failure"`).',
    '  Blanks, `0`, negative numbers and sentinel values are refused at this stage — write what the box should SAY.',
    '- `sessions[].markStrip` (object): { targets: [{ label }] } — 3-5 tick targets. See the session.markStrip section for the authoring law.',
    '- `reckoning` (object): { conversion, sink: { kind, ref, instruction } }. See the week.reckoning section.',
    // D170: the verbatim demand, restated on the FIELD the stage is filling.
    // INST_MARK_SURFACE states the law and the prompt head carries the label as
    // a GIVEN, but the first completed book renamed the currency in 6 of 6
    // weeks — so it is also said here, where the model is looking when it fills
    // this field. STAGE-ONLY BY ROUTING: SCHEMA_SINGLE_WEEK is not in
    // SCHEMA_SPEC, so this costs the paste path (hard against 115,000 chars)
    // exactly nothing. Putting it on SCHEMA_WEEKS_POST instead took the bundle
    // 297 chars over its ceiling — measured, not guessed.
    '- `reckoning.conversion` MUST print the currency label given to you in this prompt VERBATIM — the whole phrase, once, no synonym. This field is checked against it at this stage.',
    '- `fieldOps` (object): mapState, cipher, oracleTable, companionComponents',
    '- `bossEncounter` (object): replaces fieldOps if boss week',
    '- `overflow` (boolean) and `overflowDocument` (foundDocument object)',
    '- `interlude` (object, optional)',
    // THE MUTE-SOURCE HALF, said on the field the stage is filling. The floor
    // fires HERE (validateWeekSchema → collectSpineWeekFloorErrors Floor 7) but
    // is owned by the spine seat, so a week that invents a clock is blocked by a
    // graph it was never shown. The spine's own half is in INST_LUDIC_SPINE;
    // this is the half the week can actually act on, because the plan it is
    // handed carries `clockNames`. STAGE-ONLY BY ROUTING, on the D170 precedent
    // directly above: SCHEMA_SINGLE_WEEK is not in SCHEMA_SPEC, so the paste
    // path (hard against 115,000 chars) pays nothing. Putting it on
    // INST_ORACLES_CLOCKS instead took the bundle 417 chars over — measured.
    '- `gameplayClocks` (array, optional): render the clocks THIS WEEK\'S PLAN NAMES, spelled the way it spells them.',
    '  The play spine was wired before this week was written and every clock you render is checked back against it:',
    '  a clock no spine edge reads is a mute source and this week is refused for it. Do not invent a clock here and',
    '  do not rename one — a better clock is a change to the spine, which is a stage you are not writing.',
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
    '- `designSpec` (object): { paperTone, primaryTypeface }',
    '- `settlement` (object): { mode, debts: [{ owed, disposition, how, seededAt? }] } — see The Settlement'
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
    '  - `endingMode` (string): what the ending DOES to the reader — revelation | twist | ambiguous-by-design',
    '    convergencePattern is how the reader OPENS the ending; this is what they find. See The Settlement.',
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
    '- `cipherType` (string): the cipher technique name. ACROSS THE NON-BOSS WEEKS THESE MUST VARY:',
    '  this stage is blocked when the schedule reuses one or two families for the whole book. Give',
    '  each week a technique the player has to learn fresh — the count owed rises with the number',
    '  of weeks, so schedule as many distinct techniques as the block has room for.',
    '- `componentValue` (number|null): fiction-native value for password system (null for boss week)',
    '- `isBossWeek` (boolean): true ONLY for final week',
    '- `isDeload` (boolean): tonal flag for deload weeks',
    '- `isBinaryChoiceWeek` (boolean): true for the week containing the binary choice',
    '- `sessionCount` (integer): 3-6 sessions for this week',
    '- `fragmentIds` (string[]): IDs of fragments referenced in this week\'s sessions/oracles',
    '- `overflowFragmentId` (string|null): ID of overflow document if sessionCount > 3',
    '- `oracleMode` (string): "fragment"|"consequence"|"mixed"',
    '- `companionTypes` (string[]): companion component types for this week (0-3 items). A week may',
    '  legitimately carry none, but the BOOK may not: at least one week must carry a companion',
    '  component for the play state to live on, and this stage is blocked when the whole weekPlan',
    '  schedules zero. Two different types across the book is the target.',
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
        // BLANKED for the reason every closed menu on this example is blanked
        // (D47/D144): a shown enum member is an instruction, not an
        // illustration, and this is the one axis where a shown value would
        // install the house ending the mode die exists to prevent.
        endingMode: '',
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
  // ONE STRUCTURED LITERAL, BORROWED (the D129/D131 idiom). Both transports
  // reach this object: STRUCTURED_SCHEMA_SKELETON names it directly below, and
  // api-generator.js's withArrangement() presses it onto STRUCTURED_SCHEMA_SHELL.
  // A second hand-written copy in api-generator.js would be the skeleton-triple
  // defect — two surfaces describing one field, drifting one at a time.
  //
  // TYPES, NOT MENUS, on STRUCTURED_PLAY_SPINE's precedent: the menus are
  // already stated in the prose section and already parity-asserted both ways,
  // and the floor rejects a stray value with a message naming the whole menu.
  var STRUCTURED_ARRANGEMENT = {
    type: 'object',
    properties: {
      grammar: { type: 'string' },
      sectionFurniture: { type: 'string' },
      tableTreatment: { type: 'string' },
      annotationPattern: { type: 'string' },
      leitmotif: { type: 'string' },
      // ── AXIS 5, THE FORM CHANNEL (ARRANGEMENT §2 axis 5 / §3) ────────────
      // THE F04 CLASS, and the reason this slot exists at all (D195's measured
      // lesson): a field the prose DEMANDS and the gate ENFORCES, with no slot
      // on the structured transport, blocks every attempt — the model cannot
      // emit a key its own output schema has no room for, and each retry
      // re-fails identically. Prose, gate and transport land together.
      //
      // TYPES, NOT MENUS, on the five axes above's precedent: the plans are
      // stated in the prose section and parity-asserted both ways, the floor
      // rejects a stray plan with a message naming the whole menu, and a
      // fourth copy of the vocabulary is a fourth thing to drift (D124).
      atomForms: {
        type: 'object',
        properties: {
          sessionCard: { type: 'string' },
          oracleTable: { type: 'string' },
          fragmentDoc: { type: 'string' },
          ledgerSpread: { type: 'string' }
        },
        required: ['sessionCard', 'oracleTable', 'fragmentDoc', 'ledgerSpread']
      },
      arrangementEvidence: { type: 'string' }
    },
    // All seven, because the prompt marks all seven REQUIRED and the floor
    // blocks on all seven. A transport schema asking for fewer steers the model
    // toward a unit its own stage gate refuses.
    required: ['grammar', 'sectionFurniture', 'tableTreatment', 'annotationPattern',
      'leitmotif', 'atomForms', 'arrangementEvidence']
  };

  var STRUCTURED_PLAY_SPINE = {
    type: 'object',
    properties: {
      composition: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            // ── THE ACCEPTANCE SET, ON THE WIRE (DR-43 / D217's F04 finding) ──
            // This field was a bare `{type:'string'}` while the composition
            // floor rejected anything outside LUDIC_LIBRARY, which made all
            // thirteen implemented systems transport-unreal: the one stage that
            // decides what the game IS could answer `entry: "faction-clock"`
            // and the transport would carry it happily to a gate that fails the
            // whole stage. The retry then re-rolls a 30k-token unit over a
            // choice the schema could have refused for free.
            //
            // THE EXCEPTION TO "TYPES, NOT MENUS" (the rule stated on
            // STRUCTURED_ARRANGEMENT above), and it is a principled one rather
            // than an inconsistency. That rule earns its keep where the floor's
            // vocabulary is a POLICY the prompt states in prose and the schema
            // would merely re-state — a fourth thing to drift (D124). Here the
            // vocabulary is the CLOSED CONTENTS OF A SHELF: LUDIC_LIBRARY is
            // derived from the implemented tier of the registry (a system is on
            // this list because an atom prints it), the floor's message already
            // recites the whole list, and `gateStructure` two hundred lines
            // below has carried its enum on this same literal since D129. A
            // model cannot invent an implement into existence, so letting it
            // TRY is pure retry cost.
            //
            // BY REFERENCE, in the only sense an import-free browser IIFE
            // allows (the D149 idiom): the literal is quoted here and
            // spineStructuredLiteralParity() in validate.mjs byte-checks its
            // membership and order against LUDIC_LIBRARY at build time. Add an
            // implement to the shelf without adding it here and the build
            // fails — which is the point, because the silent version of that
            // mistake is a new system the designer stage is taught about and
            // the transport refuses.
            entry: {
              type: 'string',
              enum: ['reckoning-economy', 'board', 'decode-chain', 'clock-bank',
                'companion-kit', 'oracle-pull', 'door-fork', 'sealed-cache',
                'boss-convergence', 'ledger-audit', 'deduction-board', 'word-hunt',
                'arithmetic-grid', 'interlocking-word-grid']
            },
            role: { type: 'string' }
          },
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
  // The same window hop, for the same reason: api-generator.js cannot import
  // from this file, so the ONE arrangement literal reaches the shell transport
  // through the window rather than by being written twice.
  window.STRUCTURED_ARRANGEMENT = STRUCTURED_ARRANGEMENT;

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
              endingMode: { type: 'string', enum: ['revelation', 'twist', 'ambiguous-by-design'] },
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
            required: ['briefMode', 'fidelityMode', 'arcFamily', 'mechanicGrammarFamily', 'documentEcology', 'exclusions', 'homePull', 'convergencePattern', 'endingMode', 'reading', 'selectionReason', '_x']
          },
          playSpine: STRUCTURED_PLAY_SPINE,
          // The arrangement grammar, on the transport at BOTH seats. The shell
          // gets the same object through withArrangement() in api-generator.js;
          // this is the S+F half. Prose-demanded and gate-enforced but
          // transport-absent is the W5a/D139 defect, and it costs a whole
          // pipeline: under a strict structured mode the field is dropped
          // before the floor that blocks on it ever sees it.
          arrangement: STRUCTURED_ARRANGEMENT
        },
        required: ['blockTitle', 'blockSubtitle', 'worldContract', 'weeklyComponentType', 'economy', 'narrativeVoice', 'literaryRegister', 'structuralShape', 'storySpine', 'artifactIdentity', 'artifactIntent', 'playSpine', 'arrangement']
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

  // ── Game Rulebook Schema (the rules-first stage — VISION §4.0, D173) ──────
  // THE RUDDER'S OUTPUT SHAPE. The eight questions PLAY.md §3.1 ratified, the
  // four structured companions that make three of them machine-checkable, and
  // the word band both ways.
  //
  // NOT TO BE CONFUSED WITH THE PRINTED RULES. The Skeleton+Flesh pipeline has
  // a stage named `rules` that writes `rulesSpread` — the pages a player reads.
  // This is upstream of that and of everything else: a DESIGN DOCUMENT that
  // never prints in full anywhere. Every name on this surface says so
  // (`gameRulebook`, `SCHEMA_GAME_RULEBOOK`, stage key `gameRulebook`, stage
  // name "Game Rulebook", rail card "Game Design") precisely so the two cannot
  // be conflated by anyone reading either one in isolation.
  //
  // PARITY: the eight keys and their load class are GAME_RULEBOOK_ANSWERS in
  // contracts/contract-constants.mjs; the three numbers are
  // OUTPUT_BUDGETS.gameRulebook; the verb arity is GAME_RULEBOOK_VERBS_MIN/MAX.
  // validate.mjs (gameRulebookPromptParity) anchors this surface and
  // STRUCTURED_SCHEMA_GAME_RULEBOOK below on all three, and on the artifact
  // schema's own property names — three prompt surfaces and a contract, the
  // skeleton-triple shape, so a field renamed on one is an ERROR rather than a
  // silent hole.
  //
  // NO WORKED RULEBOOK, EVER (D47), and this is the surface where that rule
  // matters most in the whole system. One filled-in example of "how you win"
  // would install one game in every book generated after it — the house economy
  // failure (PLAY.md §2) at the level of the game itself rather than its
  // economy. What is shown below is the SHAPE and the questions; every answer
  // is the model's.
  window.SCHEMA_GAME_RULEBOOK = [
    '# Game Rulebook Schema',
    '',
    'Return a single JSON object with exactly this structure. Prose fields are ordinary',
    'English sentences — this is a designer explaining a game, not a data entry form.',
    '',
    '## gameRulebook (object) — all eight answers required',
    '',
    '- `winCondition` (object)',
    '  - `answer` (string): how you win, in ordinary words.',
    '  - `requires` (array of surface refs): the surfaces the player must reach or hold to have',
    '    won. These become nodes in the economy graph a later stage writes.',
    // THE TAUGHT HALF of the ending-count parity floor (W3, D186 idiom).
    '  - If `answer` states how many endings there are, `requires` must name exactly that many',
    '    distinct `ending:` refs. The number a player is promised and the number the walker',
    '    aims at are one number written twice — say it once, and write it in both places.',
    '- `coreVerbs` (object)',
    '  - `answer` (string): what the player physically does with a pencil in this book.',
    '  - `verbs` (array, 3-5 items): `{ verb, on }`. `verb` is one word or a short phrase',
    '    ("cross out", "trace"). `on` is the surface ref that verb is performed on.',
    '- `economy` (object)',
    '  - `answer` (string): what the training earns, what it buys, what it costs, what happens',
    '    when the player runs out.',
    '  - `currency` (string): what it is CALLED in this world. This exact name must appear on',
    '    an edge of the economy graph a later stage writes, and it is the phrase the book prints.',
    '- `passwordPath` (object)',
    '  - `answer` (string): how the password to the sealed ending is earned.',
    '  - `elements` (array of surface refs): where the pieces come from, one ref per source.',
    '- `sessionShape` (object)',
    '  - `answer` (string): what one session looks like at the table.',
    // THE POINT-OF-USE HALF (VISION §4.0, built 2026-08-19). The teaching half of
    // the ritual floors below; every demand they make is stated here.
    '  - `ritual` (object): the ONE THING the player does on opening a session page, as a form.',
    '    - `cue` (string, at most 140 characters): one imperative sentence, printed at the top of',
    '      every session card in this book. Write it as an instruction to a person standing in a',
    '      gym with a pencil — "Roll two d10 and read the week\'s oracle before your first set."',
    '      Not a description of the ritual; the ritual itself, in the words the page will print.',
    '    - `on` (string): the surface ref the cue acts on, in the `kind:id` grammar. It must be a',
    '      surface the economy graph touches, exactly as a core verb\'s `on` must be.',
    '    The rest of `sessionShape.answer` never prints. This is the part that does, and it is the',
    '    only sentence in the book printed at the moment it is needed rather than on a rules page',
    '    the player read once in week one and will not turn back to mid-set.',
    '- `weekShape` (object) — `answer` (string) and NO other key.',
    '- `whatGoesBadly` (object) — `answer` (string) and NO other key.',
    '- `teachingOrder` (object) — `answer` (string) and NO other key.',
    '  These three carry `answer` and nothing else — a sibling key of any name beside an answer',
    '  (`answer_note`, `answer_length_ok`, anything) fails the whole stage. `sessionShape` carries',
    '  `answer` and `ritual`, and no other key either.',
    '- `unprintableWants` (array of strings, may be empty): anything this design wanted that this',
    '  system cannot print. Say it plainly rather than substituting something printable and',
    '  calling it the same thing.',
    '',
    '## Length is a BAND — a floor as well as a ceiling',
    '- At least 120 words each: `winCondition.answer`, `economy.answer`, `passwordPath.answer`,',
    '  `sessionShape.answer`. These four fail silently when they are thin.',
    '- At least 60 words each: `coreVerbs.answer`, `weekShape.answer`, `whatGoesBadly.answer`,',
    '  `teachingOrder.answer`.',
    '- At most 1800 words across all eight answers combined. This is a design document, not a',
    '  chapter: it should be shorter than one week of the book\'s prose.',
    'Both bounds are enforced and both cost a retry. A one-line answer is the failure this floor',
    'exists to catch; a rulebook long enough to hide in is a rulebook nobody checked.',
    // The motive absorber (D228): three models across three runs answered this
    // band's pressure by ANNOTATING length compliance in invented sibling keys
    // (`answer_length_note`, `answer_note`, `answer_length_ok`) — the machine
    // does the counting, and saying so here removes the reason to annotate.
    'The machine counts every word itself. Never report, assert, or annotate lengths anywhere in',
    'the object — no note, ok, placeholder, or helper keys. If an answer feels thin, write the',
    'answer longer; never write ABOUT its length.'
  ];

  // Structured output schema for the game rulebook stage (OpenAI json_schema /
  // Anthropic tool-input format). ONE literal, borrowed by both transports —
  // the shape the D129/D131 spine literal already holds.
  //
  // NO `maxLength` ANYWHERE, and that is a ruling rather than an omission: the
  // band is in WORDS and `maxLength` counts characters, so a maxLength here
  // would be a second, wrong statement of the same rule on the one surface that
  // is measured in the other unit (D162's finding that maxLength is instruction
  // on every transport applies doubly when the unit disagrees). The stage
  // validator is the enforcement, as it is for every other budget.
  window.STRUCTURED_SCHEMA_GAME_RULEBOOK = {
    type: 'object',
    properties: {
      gameRulebook: {
        type: 'object',
        properties: {
          winCondition: {
            type: 'object',
            properties: {
              answer: { type: 'string' },
              requires: { type: 'array', items: { type: 'string' } }
            },
            required: ['answer', 'requires']
          },
          coreVerbs: {
            type: 'object',
            properties: {
              answer: { type: 'string' },
              verbs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { verb: { type: 'string' }, on: { type: 'string' } },
                  required: ['verb', 'on']
                }
              }
            },
            required: ['answer', 'verbs']
          },
          economy: {
            type: 'object',
            properties: { answer: { type: 'string' }, currency: { type: 'string' } },
            required: ['answer', 'currency']
          },
          passwordPath: {
            type: 'object',
            properties: {
              answer: { type: 'string' },
              elements: { type: 'array', items: { type: 'string' } }
            },
            required: ['answer', 'elements']
          },
          // THE FIFTH COMPANION. Forced on the wire like the other four, so the
          // transport cannot strip the one field the page prints. Still no
          // `maxLength` on `cue` — the ruling above holds for the whole object:
          // maxLength is instruction on every transport (D162), the stage
          // validator is the enforcement, and a bound stated twice in two places
          // is the drift this file exists to avoid.
          sessionShape: {
            type: 'object',
            properties: {
              answer: { type: 'string' },
              ritual: {
                type: 'object',
                properties: { cue: { type: 'string' }, on: { type: 'string' } },
                required: ['cue', 'on']
              }
            },
            required: ['answer', 'ritual']
          },
          weekShape: {
            type: 'object', properties: { answer: { type: 'string' } }, required: ['answer']
          },
          whatGoesBadly: {
            type: 'object', properties: { answer: { type: 'string' } }, required: ['answer']
          },
          teachingOrder: {
            type: 'object', properties: { answer: { type: 'string' } }, required: ['answer']
          },
          unprintableWants: { type: 'array', items: { type: 'string' } }
        },
        required: ['winCondition', 'coreVerbs', 'economy', 'passwordPath',
          'sessionShape', 'weekShape', 'whatGoesBadly', 'teachingOrder']
      }
    },
    required: ['gameRulebook']
  };

  // ── THE ECONOMY GRAPH'S WEEK AXIS (§4.11) ────────────────────────────────
  // The sub-stage that annotates the spine's economyGraph after the shell has
  // declared it. ANNOTATE ONLY — it adds cadence, price and branch to edges that
  // already exist and may never add or remove one (author-ratified, decision 4).
  // The graph's SHAPE stays the rulebook projection's; this stage is asked only
  // how often each existing edge is taken.
  //
  // THE CADENCE MENU IS QUOTED FROM VALID_EDGE_CADENCES and parity-asserted both
  // directions by edgeCadenceMenuParity() in validate.mjs. A copied menu drifts
  // one way (D124/D149): the die keeps offering what the transport stopped
  // taking, or here, the prompt keeps offering a mode the floor stopped knowing.
  window.SCHEMA_ECONOMY_GRAPH = [
    '# Economy Graph Schema — the week axis',
    '',
    'Return a single JSON object: `{ "economyGraph": [ ...edges... ] }`.',
    '',
    'You are given the graph this book already declared. Return THE SAME EDGES, in the same',
    'order, each one enriched. You may not add an edge and you may not remove one: the shape of',
    'this graph was decided when the rules were written, and your job is to say how each edge is',
    'PACED, not to redesign the economy.',
    '',
    '## Each edge (object)',
    '- `from` (string) — copy verbatim from the given graph.',
    '- `to` (string) — copy verbatim from the given graph.',
    '- `currency` (string, optional) — copy if present.',
    '- `branch` (string, optional) — which side of a fork carries this edge (`door:W3/A`).',
    '- `price` (integer ≥ 1, optional) — what this edge costs, IN MARKS.',
    '- `closesAtWeek` (integer ≥ 1, optional) — the last week this edge can be taken.',
    '- `cadence` (object, optional but strongly wanted) — how often the player takes this edge.',
    '  - `mode` (string): exactly one of `weekly`, `once`, `window`, `late`.',
    '  - `introWeek` (integer ≥ 1): the week the edge\'s surface starts appearing. It names a',
    '    week of THIS book — an `introWeek` past the last week is a surface that never arrives.',
    // D229: the closed-schema line the rulebook seat paid three runs to learn,
    // written here BEFORE this seat's first live run — its framing verb is
    // "enrich", its gate blocks invented siblings, and that pairing is the
    // exact trap the annotation class walks into.
    'An edge carries exactly the fields listed above and NO other key, at any depth. Never',
    'annotate: a note, explanation, or compliance key of any name beside these fields fails',
    'the whole stage. The machine checks the promises itself — say the cadence, not why.',
    '',
    '## What each cadence PROMISES, and what is then checked against your pages',
    'A cadence is not a label. It is a promise about which weeks print the surface this edge',
    'names, and every week of this book is checked against it. Choose the one that is true.',
    '- `weekly` — the player touches this every week from `introWeek` (default week 1). Every',
    '  week from then on must print the surface, under exactly the name this edge uses.',
    '- `late` — the surface is DELIBERATELY absent until `introWeek`, and present from it.',
    '  `introWeek` is REQUIRED. This is how a book says "the gauge arrives in week 2 and that',
    '  is the design" rather than leaving it indistinguishable from having forgotten week 1.',
    '- `window` — the edge can be taken up to a deadline, and the surface must stop appearing',
    '  after it closes. `closesAtWeek` is REQUIRED with this mode. A deadline the player cannot',
    '  feel because the surface is still on the page is not a deadline.',
    '- `once` — taken a single time, at no fixed week. Use this when no week owns the edge.',
    '',
    'DECLARE THE CADENCE YOU ACTUALLY BUILT. `weekly` on a surface the book prints twice is a',
    'promise the pages break, and it is checked week by week — it will be refused, and the week',
    'that refuses it is the week you will have to rewrite. If a surface genuinely appears in some',
    'weeks and not others on no schedule, that is `once` or a `late` with the right week, not a',
    '`weekly` you hope nobody counts.'
  ];

  // Structured-output twin. ONE literal, borrowed by both transports — the same
  // shape STRUCTURED_SCHEMA_GAME_RULEBOOK above holds.
  //
  // THE ENUM IS A LITERAL HERE BECAUSE THIS FILE HAS NO IMPORTS (it is a classic
  // IIFE by design, D124's idiom): every closed menu in this file is quoted and
  // held to its contract home by a validate.mjs parity pass rather than by a
  // reference. edgeCadenceMenuParity() reads BOTH this literal and the prose
  // menu above against VALID_EDGE_CADENCES, in both directions — a mode added to
  // the contract and not here would be a mode the floor knows and the model is
  // never offered, which is a verdict nobody can return (D134's shape).
  window.STRUCTURED_SCHEMA_ECONOMY_GRAPH = {
    type: 'object',
    properties: {
      economyGraph: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            currency: { type: 'string' },
            branch: { type: 'string' },
            price: { type: 'integer' },
            closesAtWeek: { type: 'integer' },
            cadence: {
              type: 'object',
              properties: {
                mode: { type: 'string', enum: ['weekly', 'once', 'window', 'late'] },
                introWeek: { type: 'integer' }
              },
              required: ['mode']
            }
          },
          required: ['from', 'to']
        }
      }
    },
    required: ['economyGraph']
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
  //
  // THE `example` ANNOTATIONS (DR-39). Each leaf carries the worked value that
  // illustrates it, ON THE PROPERTY NODE ITSELF. Until this wave the stage
  // taught its shape from a hand-written JSON example in generator.js while
  // this block reached no model at all — two descriptions of one shape,
  // agreeing on the day they were written, with nothing keeping them agreeing.
  // Annotating the node rather than keeping a parallel sample table is what
  // makes the pair undriftable: a renamed field carries its own example with
  // it, and there is no second list to forget.
  //
  // D47 (no closed-menu values in a worked example) is satisfied BY
  // CONSTRUCTION here, not by vigilance: not one property below is an enum —
  // these are structural transcription fields, so no example can ship an
  // enum member disguised as an instruction.
  window.SCHEMA_CANONICAL_WORKOUT = {
    type: 'object',
    properties: {
      weeks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            weekNumber: { type: 'integer', example: 1 },
            isDeload: { type: 'boolean', example: false },
            sessions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dayLabel: { type: 'string', example: 'Day 1' },
                  notes: { type: 'string', example: '' },
                  exercises: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', example: 'Bench Press' },
                        sets: { type: 'integer', example: 3 },
                        // The string quotes are the teaching, not decoration:
                        // `printableRepTarget` accepts rep TARGETS like "8+"
                        // or "5-8", so this field is a string that often
                        // looks like a number (liftosaur.js's own note).
                        repsPerSet: { type: 'string', example: '8' },
                        weightField: { type: 'string', example: '100lb' },
                        notes: { type: 'string', example: '' }
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
      progressionSummary: { type: 'string', example: '' }
    },
    required: ['weeks']
  };

  // THE ROUTED PROJECTION (DR-39). The object above is the authority on field
  // names; this is the only thing the canonicalize stage prints, and it is
  // GENERATED from that object rather than written beside it. One home, two
  // readings — the `normalizeCanonicalWorkout()` contract and the prompt.
  //
  // Why a second name rather than routing the object: `buildStageSchema` joins
  // SCHEMA_* sections as arrays of lines (`schemaArr.join('\n')`). Handing it
  // this object throws `join is not a function` — the object was never a
  // prompt section, which is exactly why the reachability census found it
  // dead. The projection is the array; the object stays the schema.
  window.SCHEMA_CANONICAL_WORKOUT_SPEC = (function (schema) {
    var typeOf = function (node) { return (node && node.type) ? String(node.type) : 'value'; };

    // The field spec, walked off the schema — never restated.
    function specLines(node, indent, out) {
      var props = (node && node.properties) || {};
      var required = (node && node.required) || [];
      Object.keys(props).forEach(function (key) {
        var child = props[key] || {};
        var type = typeOf(child);
        out.push(indent + '- `' + key + '` (' + type
          + (required.indexOf(key) !== -1 ? ', REQUIRED' : '') + ')');
        if (type === 'object') specLines(child, indent + '  ', out);
        if (type === 'array' && child.items) specLines(child.items, indent + '  ', out);
      });
      return out;
    }

    // The worked example, from the same walk. A leaf with no annotation prints
    // a loud marker rather than vanishing from the example: a field that
    // silently disappears from the teaching is the failure mode this whole
    // derivation exists to end, and it must not be reintroduced by omission.
    function example(node) {
      var type = typeOf(node);
      if (type === 'object') {
        var obj = {};
        var props = (node && node.properties) || {};
        Object.keys(props).forEach(function (k) { obj[k] = example(props[k]); });
        return obj;
      }
      if (type === 'array') return [example((node && node.items) || {})];
      return Object.prototype.hasOwnProperty.call(node || {}, 'example')
        ? node.example
        : '<<NO EXAMPLE DECLARED FOR THIS FIELD>>';
    }

    return [].concat(
      ['## Output shape',
       'Field names are exact — copy them verbatim. Emit no fields beyond these.'],
      specLines(schema, '', []),
      ['',
       'Return ONLY a JSON object of this shape:'],
      JSON.stringify(example(schema), null, 2).split('\n')
    );
  })(SCHEMA_CANONICAL_WORKOUT);

  // THE WIRE SCHEMA (DR-42). The THIRD reading of the same object, and the one
  // that turns the taught shape from a request into a constraint: the
  // canonicalize stage was the last paid stage on either pipeline running
  // `schema: null`, so its field names were taught in prose and enforced by
  // nothing. That is the F04 class one layer down from DR-39 — a shape the
  // structured transport does not hold. `normalizeCanonicalWorkout()` answers a
  // misnamed field by silently DROPPING it (a nameless exercise is skipped, an
  // unparseable `sets` is omitted, a week with no shaped session vanishes), so
  // the failure mode is a book built on a thinner program than the user typed,
  // with nothing thrown and nothing logged. Forcing the schema makes the wrong
  // shape unsendable rather than undetectable.
  //
  // DERIVED, NEVER RESTATED. Hand-writing this literal beside the object would
  // rebuild the exact second home DR-39 tore down — with the extra cruelty that
  // the two would be describing the same wire contract. One object, three
  // readings: the field-name authority, the printed spec, and this.
  //
  // WHAT THE STRIP REMOVES AND WHY. The `example:` annotations are TEACHING —
  // they exist so the printed spec can carry a worked value on the property
  // node itself. `example` is not a JSON Schema keyword (draft 2019-09 spells
  // it `examples`), and a non-keyword riding a compat `response_format`
  // json_schema or an Anthropic tool `input_schema` is at best ignored and at
  // worst rejected. It carries no constraint either way, so it has no business
  // on the wire. Arrays are copied rather than aliased: two objects sharing one
  // `required` array is a mutation seam nobody would look for.
  //
  // maxLength IS ABSENT and that is D162's ruling, not an oversight: this stage
  // has no OUTPUT_BUDGETS row, and a cap here would be instruction on every
  // transport anyway (collectBudgetBreaches is the enforcement everywhere).
  window.STRUCTURED_SCHEMA_CANONICAL_WORKOUT = (function (schema) {
    function wire(node) {
      if (!node || typeof node !== 'object') return node;
      var out = {};
      Object.keys(node).forEach(function (key) {
        if (key === 'example') return;
        var value = node[key];
        if (key === 'properties') {
          var props = {};
          Object.keys(value).forEach(function (p) { props[p] = wire(value[p]); });
          out.properties = props;
        } else if (key === 'items') {
          out.items = wire(value);
        } else {
          out[key] = Array.isArray(value) ? value.slice() : value;
        }
      });
      return out;
    }
    return wire(schema);
  })(SCHEMA_CANONICAL_WORKOUT);

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
    'CAPS, in characters. A cap is a hard wall: one character over costs the whole stage a retry.',
    'You cannot count characters, so aim every capped line at roughly 85% of its cap and land UNDER it. A line at 85-95% of its budget IS the full surface; a line at 101% is a rejected answer. Riding the cap edge is how stages fail.',
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

  // TWO HALVES, ONE PER SEAT (2026-08-17). This section rides the CAMPAIGN PLAN
  // and the identity stage, and its first line said "write `meta.worldContract`
  // before anything else" — at the campaign plan, which runs BEFORE the identity
  // stage exists and whose output carries no `meta`. Unfollowable there, and it
  // sat above the roster discipline that IS true there, so the true half read as
  // conditional on the impossible one.
  //
  // Split by what each seat can actually do: the ROSTER DISCIPLINE binds at
  // planning (the plan is where the nouns are committed to and every later stage
  // reuses them); the FIELD is written at the one stage that authors meta.
  window.INST_WORLD_CONTRACT = [
    '## World Contract & Core Noun Roster',
    '- THE ROSTER, at every stage that plans or writes: define a **Core Noun Roster** — 8-12 fiercely specific people, places, departments and objects — and work from it. This is your bible whether or not this stage is the one that writes it down.',
    '- EVERY single cipher, map node, fragment, boss mechanism, and oracle entry MUST explicitly reference at least one item from the Core Noun Roster.',
    '- Do not invent stray lore later. If a noun is important enough to be a puzzle solution or a map endpoint, it must be established in the roster.',
    '- This creates extreme holistic continuity. The world must feel airtight and relentlessly cross-referenced.',
    '- THE FIELD, at the identity stage only: `meta.worldContract` is where the contract and its roster are written down, before anything else in that stage. If this stage\'s output schema has no `meta`, it does not write that field — carry the roster in the world material this stage DOES author, and do not invent a `meta` key your schema will reject.'
  ];

  window.INST_STORY_ENGINE = [
    '## Story Engine First, Then JSON',
    '- Before writing fields, determine your story engine: genre/tone, layered setting, protagonist role, core want, core need, flaw, wound, relationship web, antagonist pressure, secret, midpoint shift, darkest moment, resolution mode, recurring object, recurring place, recurring motif.',
    // STAGE-CONDITIONAL (2026-08-17). This line named `meta.storySpine` flatly,
    // and this section rides TWO stages: the identity stage (which authors
    // `meta`) and the layer codex (whose output schema is
    // storyLayer/gameLayer/governingLayer and contains no `meta` at all). At
    // the codex the instruction was unfollowable — obey and emit a key the
    // schema rejects, or ignore a line that reads as mandatory.
    '- Capture the essential arc in five sentences max: premise, protagonist drive, central tension, midpoint shift, final cost. This is your anchor — refer back to it when writing every session prompt, fragment, and ending.',
    '  * If this stage\'s schema has `meta`, that arc goes in `meta.storySpine`.',
    '  * If it does not — the layer-codex stage authors `storyLayer` and no `meta` — the arc IS `storyLayer.premise` plus the protagonist and midpoint fields around it. Write it there. Never add a `meta` key your output schema does not contain; it will be rejected.',
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
    '- Use redactions only when they do narrative work.',
    '',
    // ── THE ANSWER-BEARING SEAL (author ruling, 2026-08-18) ──────────────────
    // THE TWO HALVES OF ONE RULE. The floor is
    // collectAnswerBearingFragmentFloorErrors in validation.js; this sentence
    // is its teaching. A document that hands the player the whole convergence
    // in week one is not a spoiler risk the player chose — it is one the book
    // made for them.
    '',
    '### A document that confirms the chain\'s answers is sealed by honour',
    'A fragment MAY carry the answers — a confirmation slip, a duplicate ledger, a supervisor\'s',
    'copy of the whole record. That is a real document and often the best one in the book.',
    'But a document that prints EVERY collected value, or the finished password itself, ends',
    'the game the moment it is read, and the player has no way to know that before reading it.',
    'So: declare its seal and its release week. Give that fragment a `seal` object —',
    '`keyHint` (what the player will recognise when they may open it) and `unlockCondition`',
    '(what must already be true, naming an EARLIER printed surface). The seal is the honour',
    'system, not a lock: the pleasure is the flip and the deciding, and a player who is warned',
    'can choose. A player who is not warned has been robbed of a choice nobody offered them.',
    'Carrying every answer with no seal declared is a blocking error.'
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
    'VALUES and the ROUTE — which week gave which figure, off which surface, and that they',
    'are read straight through the table in week order. It stops there — the decode itself is',
    'the move the PLAYER makes, and the proof does not make it for them.',
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
    '  is locked out of their own booklet at the end of the block. Export redacts the word out',
    '  of that sentence before printing, so stating it THERE, whole, in that exact form, spoils',
    '  nothing. Read that narrowly: it is a licence for one demanded sentence and one shape,',
    '  not a general permission to put the password anywhere in the boss prose.',
    '- Do not choose this pattern if the true order cannot be derived from something printed.',
    '',
    '### `red-herring`',
    'Each week\'s surface offers MORE candidate readings than the week needs — several figures,',
    'marks, or values — and only one is this week\'s component. The player must know the',
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
    '',
    // ── THE SPELLED-OUT READING (proving run 3, 2026-08-19) ──────────────────
    // Placed at the CLOSER, not inside one pattern, because that is the layer
    // that produced the defect: the leak arrived under `dual-source`, whose own
    // bullets never mention letters — the model took the licence from
    // `sequential-assembly`'s old "shows the values, the letters, and the
    // resulting word" line four sections above and applied it to a different
    // pattern. A per-pattern fix would be the same whack-a-mole one section
    // over. This sentence reaches all four.
    //
    // Deliberately NOT a ban on quoting an assembled STRING: `reordering` above
    // hard-requires both the wrong reading and the true one, and `red-herring`
    // requires the filtered result. The contiguous form is the one the export
    // scrub can actually see. What it cannot see, and what this forbids, is the
    // enumeration.
    'ONE PROHIBITION, EVERY PATTERN. `convergenceProof` may name the values, name their',
    'sources, and quote an assembled STRING where a pattern above demands one. It must NEVER',
    'spell a reading out one letter at a time — `By the table: P, R, Y, O, R.` is the shape,',
    'and it has reached a printed page. Written that way the proof performs the single step',
    'the last page exists to ask the player to take, and it hands over the answer in a form',
    'the player has not earned. State the figures and the reading order; stop before the',
    'letters.',
    '',
    // ── DERIVE OR DECLARE (author ruling DR-33, 2026-08-18) ──────────────────
    // THE TWO HALVES OF ONE RULE (the D136 F04 idiom). The floor is
    // collectConvergenceChainFloorErrors in validation.js, blocking at the boss
    // week gate; this is the sentence that teaches it. Landing either alone
    // either blocks a book for a shape nobody asked for, or asks for a shape
    // nothing checks.
    '### Derive or declare (this is checked at the boss week, and it blocks)',
    'The letters the collected values decode to, read in week order, are THE DERIVATION.',
    'If the password you state on the boss page is that string, nothing more is owed.',
    'If it is NOT that string, exactly one thing makes it legal: the password must be a',
    'REARRANGEMENT of those same letters, and the boss page must TELL THE PLAYER to rearrange',
    'them — in plain words, on the page, in the reveal or the proof. That is the declared',
    'convention.',
    'A password that is neither the week-order reading nor a rearrangement of it is a chain',
    'the player cannot walk: they collect the values the booklet asked for, follow the',
    'booklet\'s own table, and arrive at a word the last page rejects. An anagram nobody is',
    'told to unscramble is the same failure wearing a puzzle.',
    'Undeclared non-derivation is a defect, not a style.',
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

  // ── The arrangement grammar (ARRANGEMENT.md phase A) ────────────────────
  //
  // ROUTING: BOTH compiler seats, and that is the difference from the design
  // language directly above. The shell stage gets it through STAGE_SCHEMA_MAP;
  // the S+F skeleton seat gets it by hand inside generateSkeletonPrompt, the
  // way INST_SHELL_CHOICE and INST_SEED_ASSIGNMENT are hand-routed there. It is
  // deliberately absent from window.INSTRUCTIONS and window.SCHEMA_SPEC — the
  // single-prompt bundle has no room (D136 measured 563 characters of headroom)
  // and a paste-path book renders in the default grammar, which is what a named
  // default is for.
  //
  // WHY IT REACHES BOTH SEATS WHEN THE DESIGN LANGUAGE REACHES ONE: the
  // arrangement floor blocks at BOTH gates, and a floor at a seat whose prompt
  // never names the field blocks a pipeline on a surface it was never asked
  // for — the retry then re-fails identically, carrying the field\'s name in
  // the correction directive and nowhere else. Both halves of one rule land
  // together (D136 F04, D149): teach it where it is checked.
  //
  // WHY IT EXISTS: VISION §8 — *layout IS the identity, and the model authors
  // it per book.* The design language answers what press this object came off;
  // this answers who designed the page. The first completed book passed every
  // atom-level gate and every spread was a pile, because nothing in the system
  // had ever asked.
  //
  // THE MENUS ARE BYTE-QUOTED from contract-constants.mjs and
  // `arrangementMenuParity()` in scripts/validate.mjs diffs them both ways,
  // including each grammar\'s four values — a grammar taught as a name and not
  // as its values is a mood, and a model resolves a mood into whatever it did
  // last time.
  window.SCHEMA_ARRANGEMENT = [
    '## meta.arrangement (REQUIRED — how this book\'s page is put together)',
    '',
    'The design language is what this object is printed LIKE. This is how the page is',
    'COMPOSED: how a section announces itself, how a table is drawn, how the page points at',
    'itself, and the one gesture that repeats everywhere. Two books can share an archetype and',
    'a press and still be unmistakably different objects across a table — this is where that',
    'happens.',
    '',
    '- `grammar` (REQUIRED): "ruled-journal" | "field-manual" | "reference-index" | "broadside"',
    '  — the family this book belongs to. Each one is a set of the four axes below.',
    '- `sectionFurniture` (REQUIRED): "hairline-kicker" | "reverse-bar" | "numbered-tab" |',
    '  "rule-stack" — how a section announces itself at the top of the page.',
    '- `tableTreatment` (REQUIRED): "ruled-rows" | "reverse-header" | "numbered-gutter" |',
    '  "boxed-panel" — how a roll table is drawn.',
    '- `annotationPattern` (REQUIRED): "inline-note" | "pointer-chips" | "bracket-marks" |',
    '  "underline-file" — how the page points at itself and teaches.',
    '- `leitmotif` (REQUIRED): "none" | "rounded-chip" | "cut-corner" | "double-rule" — the one',
    '  gesture that repeats across all three axes above.',
    '- `atomForms` (REQUIRED, object): the FORM PLAN for each component the player writes on —',
    '  how much teaching chrome it carries, and when it stops carrying it. Four keys, all',
    '  REQUIRED: `sessionCard`, `oracleTable`, `fragmentDoc`, `ledgerSpread`. For the first',
    '  three, each value is exactly one of:',
    '  "bare-throughout" | "taught-shed-early" | "taught-shed-mid" | "taught-throughout".',
    '  The shed point is worked out from the length of YOUR book — you choose the rhythm, not',
    '  the week number, so one plan reads correctly whatever the block length turns out to be.',
    '  `ledgerSpread` is ONE closing spread, so it has no timeline to shed across — its value is',
    '  "bare-throughout" | "taught-throughout" only. Its taught form is not teaching chrome: it',
    '  is the REGISTER drawing — movement labels top-aligned against the rule that opens each band,',
    '  the bands sharing the whole page — the ledger drawn as a ledger rather than a table with',
    '  leftover space. Choose it when the book\'s paperwork would keep a real register.',
    '  State all four explicitly, including every "bare-throughout".',
    '- `arrangementEvidence` (REQUIRED, string, 1-2 sentences): the brief\'s own words these',
    '  choices came from. If you departed from an assignment you were given, name the value you',
    '  took here.',
    '',
    'State all four axes explicitly even when they agree with your chosen grammar. The grammar',
    'names the family; the four fields are what this book actually wears. `atomForms` is a',
    'separate question from all of them: the four axes are how the page is DRAWN, and the form',
    'plans are how much of the page is spent TEACHING.'
  ];

  window.INST_ARRANGEMENT = [
    '## Arrangement (run with Design Language)',
    '',
    'A page is AUTHORED, not accumulated. Every component on a spread can be individually',
    'correct and the spread can still be nobody\'s design — that is the most common way a',
    'generated book fails, and it fails invisibly, because nothing on it is wrong.',
    '',
    'DERIVATION LAW, the same law that governs register and design: every axis must be',
    'traceable to words the brief actually contains, and the phrases go in',
    '`arrangementEvidence`. An arrangement that cannot cite the brief is a house layout wearing',
    'the book\'s name.',
    '',
    'THE FOUR GRAMMARS, and what each one IS:',
    '- "ruled-journal" — hairline-kicker furniture, ruled-rows tables, inline-note annotation,',
    '  leitmotif none. A training journal: quiet, ruled, nothing shouting. A real answer for a',
    '  book about private, ordinary work — and a real DECISION, not a default.',
    '- "field-manual" — reverse-bar furniture, reverse-header tables, pointer-chips annotation,',
    '  rounded-chip leitmotif. An issued instrument, printed by an organisation for someone who',
    '  has to use it under load.',
    '- "reference-index" — numbered-tab furniture, numbered-gutter tables, underline-file',
    '  annotation, double-rule leitmotif. The thing you look things up in, opened at speed.',
    '- "broadside" — rule-stack furniture, boxed-panel tables, bracket-marks annotation,',
    '  cut-corner leitmotif. A printed sheet: stacked rules, framed panels, bracketed asides.',
    '',
    'NONE OF THESE IS THE NORMAL ONE. "ruled-journal" is what every book looked like before',
    'this menu existed, which is exactly why it has a name now: choose it because this story',
    'wants a quiet ruled notebook, never because it is what you would have done anyway.',
    '',
    'MIX ON PURPOSE, NOT BY DRIFT. You may declare one grammar and take a different value on an',
    'axis — a field-manual that files its citations under a rule instead of chipping them is a',
    'real object. Say why in `arrangementEvidence`. What is forbidden is drift: four axes that',
    'answer to nothing.',
    '',
    'WHAT EACH AXIS SAYS, so you can choose on meaning rather than on sound:',
    '- Section furniture is the loudest cheap identity in a book. "reverse-bar" is a solid band',
    '  across the top of every page — an institution talking. "numbered-tab" is a thumb index:',
    '  a book expecting to be opened mid-task. "rule-stack" is a stacked hairline: a printed',
    '  sheet. "hairline-kicker" is a quiet rule and small capitals.',
    '- Table treatment tells the reader what KIND of table this is: something you roll on,',
    '  something you look up, something you consult mid-action.',
    '- Annotation pattern is how the rules ride the page. This is what stops point-of-use being',
    '  a compromise: the book does not choose between "the rules are on the page" and "the page',
    '  is not a wall of rules" — it chooses a pattern and the rules ride it. Point at the',
    '  rulebook\'s own teaching order: what has to be known first gets the loudest pointer.',
    '- The leitmotif is one gesture restated everywhere — a rounded chip, a cut corner, a',
    '  doubled rule. It lands on all three axes above, and it is most of the difference between',
    '  a page that reads as designed and one that reads as assembled. "none" is a real answer',
    '  for a book whose whole character is restraint.',
    '',
    'THE FORM PLANS — how much of the page teaches, and for how long:',
    '- A component has two forms. BARE is the surface alone: the boxes, the rules, nothing',
    '  explaining itself. TAUGHT adds chrome that says how the surface is used — the session',
    '  card numbers its steps and prints the marking rule beside the strip it governs, the',
    '  oracle frames its how-to-roll line as an instrument instead of a caption, and a found',
    '  document gets a routing band naming what it is in your world\'s own filing words.',
    '- Mothership ships two character sheets, Basic and Advanced: the same character, one sheet',
    '  walking you through it and one assuming you know. That pair is the whole idea. A book',
    '  that teaches on every page treats a player who has run the whole block like a stranger; a',
    '  book that never teaches abandons them in week one.',
    '- THE SHEDDING LAW: teach while the load is light, get out of the way when the week is',
    '  heavy. "taught-shed-early" and "taught-shed-mid" are the two ways to do that; the engine',
    '  works the actual shed point out from how long this book runs.',
    '- Choose per component, not once. These three surfaces are met at different rates: a',
    '  session card is filled in several times a week, an oracle is rolled on once a week, and a',
    '  found document may be the only one of its kind the player ever sees. A component the',
    '  player meets rarely can justify teaching throughout; one they meet daily should shed.',
    '- "bare-throughout" is a real answer, and the same kind of real answer "ruled-journal" is:',
    '  choose it because this world would never annotate itself — an archive that explains its',
    '  own forms is not an archive — never because it is the least work.',
    '- Say what chose these in `arrangementEvidence`, the same as every axis above.',
    '',
    'THE PENCIL OUTRANKS EVERY AXIS. No furniture, table, annotation or form choice may cost a',
    'write-in surface its space or draw inside a box a pencil fills. Teaching chrome is ADDED',
    'above the write-in surfaces, never bought out of them. If an axis and the pencil collide,',
    'the pencil wins.',
    '',
    'BLACK AND WHITE, AGAIN. Weight, fill and pattern carry every signal here. Nothing on this',
    'axis set may depend on colour.'
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
    '- `value`: what it would have chosen on that axis. It must differ from the winner\'s.',
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
    '  in the built booklet: a `heat` book that refuses `rivalry` and then prints a rival\'s weekly standings',
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
    'funded by whatever funded the family.',
    '',
    'THE EXCEPTION LICENSES LEAVING, NOT LANDING. A family that decides has decided ON',
    'something: the geometry you take instead must be one your declared family\'s own `Serves`',
    'row NAMES. Departing from an assigned board onto a second board the same family also',
    'refuses is not the exemption — it is a default with an argument attached, and it is',
    'recorded as one. And whichever way you go, WRITE THE ASSIGNED VALUE DOWN, exactly as it',
    'was given to you. A departure that misquotes the assignment it departed from cannot be',
    'told apart from one that never read it; this is checked, and the stage fails without it.'
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
  // `deferEvidenceTo` (optional): where the departure is recorded when THIS
  // stage cannot write the evidence field itself.
  //
  // THE DEFECT IT CLOSES (2026-08-17). The mapGeometry axis names
  // `meta.artifactIntent.selectionReason` as its evidence field and is dealt at
  // the CAMPAIGN PLAN — a stage whose output schema contains no `meta` at all.
  // So the block printed "evidence field: meta.artifactIntent.selectionReason"
  // into a prompt for a stage physically unable to write it, above a paragraph
  // saying the citation is CHECKED and a stage fails without it. A model that
  // believed it had two moves: obey and be unable to comply, or invent a `meta`
  // key its schema rejects. Both cost a retry, and the honest instruction — the
  // departure is recorded downstream, at the seat that authors meta — was never
  // given. The axis row is untouched: the evidence field is right, the SEAT for
  // writing it is what differs.
  window.formatSeedAssignmentBlock = function (assignments, axes, deferEvidenceTo) {
    if (!assignments || typeof assignments !== 'object') return '';
    if (!Array.isArray(axes) || !axes.length) return '';
    var deferred = String(deferEvidenceTo || '').trim();
    var rows = [];
    for (var i = 0; i < axes.length; i++) {
      var axis = axes[i];
      var value = assignments[axis.id];
      if (!value) continue;
      rows.push('- ' + axis.label + ' IS `' + value + '` — evidence field: `' + axis.evidencePath + '`');
    }
    if (!rows.length) return '';
    var head = [
      '### The assignments for THIS book',
      '',
      'Drawn from this book\'s run seed, across each full menu, before you saw the brief. Each',
      'line is a GIVEN. Write it exactly — or write something else and, in the evidence field',
      'named on that line, NAME the value you took and quote the brief phrase that required it.'
    ];
    if (deferred) {
      head = head.concat([
        '',
        'THIS STAGE DOES NOT WRITE THOSE EVIDENCE FIELDS — its output schema has no place for',
        'them, so do not try to add one. Take the assignment, or depart from it; ' + deferred + '.',
        'What is asked of you here is the VALUE. If you depart, say why in the field this',
        'stage does have for saying why, and the departure will be recorded where it belongs.'
      ]);
    }
    return head.concat(['']).concat(rows).join('\n');
  };

  /**
   * formatPlannedDoorGivensBlock(plannedWeeks) -> string
   *
   * THE PER-RUN DOOR GIVENS. D111's derived-where-derivable law applied to the
   * PROMPT rather than to a floor: the pipeline computes the exact week shapes
   * (derivePlannedWeekShapes in api-generator.js) BEFORE the shell stage runs,
   * hands them to the gate that blocks the stage, and — until now — showed the
   * model none of it. The model was asked to infer, from a generic rule, an
   * answer key the caller was already holding.
   *
   * MEASURED, not argued: the author's first live book failed the shell stage
   * twice on the same pre-flight — "playSpine.decisionLedger has no row for the
   * doors weeks W1, W2, W4, W5 will print" — with the blocking error quoted
   * verbatim into the retry directive both times. The retry carried the
   * remedy and the model still missed it, which is the D158 density class: a
   * rule stated generically among two hundred other rules is a rule the model
   * satisfies everywhere except one place. A GIVEN naming the four weeks is
   * not a new rule, it is the same rule with the arithmetic already done.
   *
   * `plannedWeeks` is the SAME array the gate reads (one derivation, now three
   * readers — the shell pre-flight, the week loop's floor options, and this
   * block). It must never be re-derived here: the topology digest carries its
   * own independent "lighter weeks" heuristic, and a prompt taught from one
   * source while the gate checks against the other is D93's two-algorithms
   * defect wearing a helpful face.
   *
   * CONDITIONAL ON THE FAMILY, because the family is declared in this same
   * call. The block states the obligation the way the floor computes it —
   * door-leaning family AND non-boss AND non-deload — and names no families
   * itself: Step 5c owns that membership list and doorLeaningParity() in
   * validate.mjs anchors on Step 5c's own sentence. A third copy here would be
   * a list nothing checks.
   *
   * Returns '' when there is nothing to hand over, so every caller without a
   * week picture (the paste path, the guided harness, the S+F seat that
   * co-authors its weekPlan in the same call) builds the prompt it always
   * built, byte for byte.
   */
  window.formatPlannedDoorGivensBlock = function (plannedWeeks) {
    if (!Array.isArray(plannedWeeks) || !plannedWeeks.length) return '';
    var open = [], deload = [], boss = [];
    for (var i = 0; i < plannedWeeks.length; i++) {
      var shape = plannedWeeks[i] || {};
      var n = Number(shape.weekNumber);
      if (!isFinite(n) || n < 1) continue;
      if (shape.isBoss || shape.isBossWeek) boss.push(n);
      else if (shape.isDeload) deload.push(n);
      else open.push(n);
    }
    if (!open.length && !deload.length && !boss.length) return '';
    var label = function (list) {
      return list.map(function (n) { return 'W' + n; }).join(', ');
    };
    var lines = [
      '### The weeks this book already has — a GIVEN',
      '',
      'Derived from the approved story plan and the program itself, before you were asked. This',
      'is the same picture the gate checks your spine against. It is not an estimate, and it is',
      'not yours to revise.',
      ''
    ];
    if (boss.length) lines.push('- Boss week (owes no door): ' + label(boss));
    if (deload.length) lines.push('- Deload week' + (deload.length === 1 ? '' : 's')
      + ' (owe' + (deload.length === 1 ? 's' : '') + ' no door): ' + label(deload));
    lines.push('- Every other week: ' + (open.length ? label(open) : 'none'));
    lines.push('');
    if (open.length) {
      lines.push('If the `mechanicGrammarFamily` you declare is one of the eight pressure families'
        + ' (Step 5c),');
      lines.push('then EVERY week on that last line prints a `week.doorChoice`, and'
        + ' `meta.playSpine.decisionLedger`');
      lines.push('owes one row for each of them — ' + open.map(function (n) {
        return '`door:W' + n + '`';
      }).join(', ') + ' — ' + open.length + ' row' + (open.length === 1 ? '' : 's')
        + ' in all. Count them');
      lines.push('against that line before you answer: one week short is a rejected payload, and'
        + ' it is the');
      lines.push('most common way this stage fails. If you declare a reconstruction family instead,'
        + ' none of');
      lines.push('these weeks is obliged to fork and the ledger carries only the doors you actually'
        + ' print.');
    } else {
      lines.push('No week in this book is both non-boss and non-deload, so no family obliges a'
        + ' weekly door here.');
      lines.push('The ledger carries only the doors you actually choose to print.');
    }
    if (boss.length || deload.length) {
      lines.push('');
      lines.push('The boss and deload weeks above owe nothing. Give one a row only if you are'
        + ' deliberately');
      lines.push('printing a door there.');
    }
    return lines.join('\n');
  };

  /**
   * formatLudicWeekGivenBlock(owed) -> string
   *
   * THE ARSENAL'S WEEK GIVEN (D170). D166's cure — hand the model the
   * arithmetic instead of a rule to remember — applied to the one obligation
   * that reaches this stage from two stages back.
   *
   * `owed` is one row of deriveLudicWeekAssignments() in contract-constants,
   * computed once above the week loop and handed to BOTH readers: this block
   * and the week gate's `owesLudicEntry`. It must never be re-derived here.
   *
   * IT NAMES THE PERMISSION IT OVERRIDES, on purpose. The puzzle section this
   * prompt also carries says "a booklet with none is a legitimate booklet" —
   * a true sentence that is false for this week, and doctrine that contradicts
   * a given without saying so teaches the model that this prompt's rules are
   * negotiable (the D128 lesson).
   *
   * Returns '' when this week owes nothing, so every week without a row builds
   * the prompt it always built, byte for byte — and the floor is silent under
   * exactly the same condition.
   */
  window.formatLudicWeekGivenBlock = function (owed) {
    if (!owed || typeof owed !== 'object') return '';
    var entry = String(owed.entry || '').trim();
    var field = String(owed.field || '').trim();
    if (!entry || !field) return '';
    return [
      '### The implement this week owes — a GIVEN',
      '',
      'This book\'s `meta.playSpine.composition` declares `' + entry + '`, and the schedule',
      'puts it HERE. Author `fieldOps.' + field + '` on this week, to the shape and the',
      'guardrails the puzzle section below states, and wire what it yields into the economy',
      'the spine already declared.',
      '',
      'This overrides the puzzle section\'s standing permission: "a booklet with none is a',
      'legitimate booklet" is true of books in general and false of this one, because this',
      'one said otherwise. A week that owes this and skips it is a rejected payload.'
    ].join('\n');
  };

  /**
   * formatWeekIdentityGivenBlock(given) -> string
   *
   * THE TWO GATE-READ IDENTITY VALUES, PRINTED AT THE POINT OF USE (D173).
   *
   * `given` is `deriveWeekIdentityGiven(weekFloorOptions, isBoss)` in
   * validation.js — the week gate's OWN options object read back. It must never
   * be rebuilt from a shell or a skeleton here: the whole claim of this block is
   * that the prompt's demand and the gate's verdict come from one object, and a
   * second read is a second answer to "does this week owe a door".
   *
   * WHAT IT REPLACES, in both halves:
   *
   *   - Door Bias states the demand as a conditional over
   *     `mechanicGrammarFamily`, a value the week prompt printed zero times. The
   *     block resolves the conditional FOR THIS WEEK, and says which way — a
   *     week that owes a door is told so in the imperative, and a week that owes
   *     none is told that too, because "no obligation" is also an answer the
   *     model was previously left to guess at.
   *   - Point Of Use prints eight citation grammars and says borrowing another
   *     shell's labels fails validation. Seven of those eight rows are another
   *     book's. The block names the row, and the labels come from the table the
   *     floor matches against, so the vocabulary offered IS the vocabulary
   *     accepted.
   *
   * NO FAMILY MEMBERSHIP LIST HERE, deliberately. `owesDoor` arrives already
   * decided by `weekOwesDoor` → `isDoorLeaningFamily`; INST_DOOR_BIAS and
   * INST_ARTIFACT_COMPILER Step 5c own the membership prose and
   * `doorLeaningParity()` anchors on Step 5c. A third copy here would be a list
   * nothing checks — and the negative branch is phrased against the eight the
   * doctrine names rather than asserting a class, so an unrecognised family is
   * described truthfully instead of being called a reconstruction family.
   *
   * Returns '' when there is nothing to hand over, so every caller without a
   * compiler context builds the prompt it always built, byte for byte.
   */
  window.formatWeekIdentityGivenBlock = function (given) {
    if (!given || typeof given !== 'object') return '';
    var blocks = [];
    var family = String(given.mechanicGrammarFamily || '').trim();
    if (family) {
      var head = [
        '### The grammar this book runs on — a GIVEN',
        '',
        'This booklet declared `meta.artifactIntent.mechanicGrammarFamily: ' + family + '`. That is',
        'not a menu to re-open, and it is the value the Door Bias section\'s conditional is asking',
        'about — already resolved, for this week, below.',
        '',
        ''
      ].join('\n');
      if (given.owesDoor) {
        blocks.push(head + [
          '`' + family + '` is one of the eight pressure families that section names, and this week is',
          'neither the boss week nor a deload. So the conditional has fired: this week MUST print',
          '`week.doorChoice` with `optionA` and `optionB`, each carrying a posted `lean`. Do not',
          'weigh whether it applies — it applies. A week of this book with no door is a rejected',
          'payload.'
        ].join('\n'));
      } else if (given.doorExemption) {
        blocks.push(head + [
          'This is ' + (given.doorExemption === 'boss' ? 'the BOSS week' : 'a DELOAD week')
            + ', which owes no `week.doorChoice` whatever `' + family + '`',
          'prices elsewhere in the book. Print one only if this week genuinely forks; never print an',
          'empty one to fill the field.'
        ].join('\n'));
      } else {
        blocks.push(head + [
          '`' + family + '` is not one of the eight pressure families that section names, so no week of',
          'this book is obliged to print a `week.doorChoice`. Print one where the week genuinely',
          'forks and you can post an honest lean on both sides; never print an empty one to fill',
          'the field.'
        ].join('\n'));
      }
    }
    var shellFamily = String(given.shellFamily || '').trim();
    var labels = Array.isArray(given.citationLabels) ? given.citationLabels : [];
    if (shellFamily && labels.length) {
      blocks.push([
        '### The filing labels this book cites in — a GIVEN',
        '',
        'This booklet\'s `meta.artifactIdentity.shellFamily` is `' + shellFamily + '`. The Point Of Use',
        'section prints eight citation grammars; seven of them belong to other books. Yours is the',
        'one row that matters:',
        '',
        '- ' + labels.join(' / ') + ' — plus a number ("' + labels[0] + ' 4").',
        '',
        'Every `citeRef.citedAs` you write names WHAT is there and WHERE to look, filed in that',
        'vocabulary, or by the booklet\'s own refs ("F.07", "W4"). A `citedAs` with no pinpoint is',
        'rejected at this stage, and so is one borrowing another shell\'s labels.'
      ].join('\n'));
    }
    return blocks.join('\n\n');
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
  // ── The Game Rulebook (VISION §4.0 / PLAY.md §3.1, ratified D173) ────────
  // THE RUDDER. The pipeline used to ask the model for parts and it got parts:
  // sessions, clocks, oracle tables, a boss. Every part was checked; nothing
  // ever decided what the GAME was, and the first finished book played as one
  // note (D171). The author's ruling: "the LLM should have to write the rules of
  // the game before it creates all the text on how to play… it will give the
  // game a shape."
  //
  // ROUTING: the `game-rulebook` stage ONLY, and the stage runs FIRST on both
  // API pipelines. It is deliberately OFF the single-prompt bundle, on the
  // KNOWING and DESIGN_LANGUAGE precedent: that surface is hard against its
  // ceiling (D136 measured 563 characters of headroom; a legal empty-brief
  // fixture measured 115,182 against a 115,000 ceiling at HEAD, DR-3), the
  // floors do not run on the paste path, and a whole design document is the
  // largest thing anyone has proposed adding to it. The paste path keeps
  // getting its composition discipline from INST_ARTIFACT_COMPILER Step 11,
  // which is written self-contained for exactly this reason.
  //
  // NO WORKED EXAMPLE, NO SAMPLE ANSWER, NO CLOSED MENU (D47/D144). This is the
  // one stage in the system whose entire job is to decide what the game is; a
  // shown answer here is not an illustration, it is the answer.
  // ── THE ECONOMY GRAPH'S OWN SEAT (§4.11) ─────────────────────────────────
  // WHY THIS STAGE EXISTS AT ALL. The graph used to be authored inside the shell
  // stage's ~108,000-character payload, where the model was answering the economy
  // question while also answering the shell, theme, arrangement, voice,
  // orientation and disclosure questions. The density class (D158) predicts
  // exactly the shallow, implied-not-named edges the corpus shows, and the first
  // delivered book had them. This is a NARROW seat: the rulebook, the graph, the
  // topology and the week plan, and nothing else.
  //
  // ANNOTATE ONLY (author-ratified, decision 4). The no-invent discipline is
  // D136's revisionInventsKeys idiom scoped to one unit, and it is stated to the
  // model as the first thing it reads rather than left to a floor to punish.
  window.INST_ECONOMY_GRAPH = [
    '## Pace the economy you already designed',
    'This book\'s rules are written and its economy graph is declared. You are not designing a',
    'new economy and you are not adding to this one. You are answering one question about each',
    'edge that already exists: HOW OFTEN does the player take it?',
    '',
    'Return every edge you were given, in the order you were given them, with the same `from`',
    'and the same `to`. Adding an edge or dropping one is the one thing this stage may never do —',
    'the shape of this graph came from the rules, and changing it here would mean the book has',
    'two different economies depending on which page you read.',
    '',
    '### Why the cadence matters more than it looks',
    'An edge like `clock:Root Clock → seal:W6` is TRUE for the book and can still be false for',
    'every week in it: if week 3 never prints that clock, the player has an economy they were',
    'told about and cannot touch. That exact defect shipped — a clock the rules fed "each week",',
    'printed in one week of six, with every check green, because nothing had ever compared what',
    'the machine says the week DOES against what the page gives the player to do it ON.',
    '',
    'Your cadence is what closes that. It is checked, week by week, against the surfaces each',
    'week actually prints. So the cadence you declare has to be the cadence the book will have.',
    '',
    '### Price and branch, while you are here',
    'Where an edge is a SPEND, give it a `price` in marks — marks, not the fiction\'s currency',
    'name, because the mark is the only unit the machine economy has. Where an edge belongs to',
    'one side of a fork, say which with `branch` (`door:W3/A`). Both are optional and both are',
    'better answered here than guessed later.',
    '',
    'Leave a field out rather than inventing a value for it. An edge with no price is an edge',
    'that costs nothing, and that is a legitimate answer.'
  ];

  window.INST_GAME_RULEBOOK = [
    '## Write the rules of the game — before anything else exists',
    'You are the game designer. Nothing of this book has been written yet: no weeks, no',
    'documents, no ending, no board. Before any of that, you decide what the GAME is, and',
    'everything written afterwards is written to serve what you decide here.',
    '',
    'This is a design document. It never prints in full anywhere. What eventually reaches the',
    'page is the small part the player needs at the moment they need it, printed as a form at',
    'the point of use — so write for a designer who has to build this, not for a reader.',
    '',
    '### The kit you are designing for, and it is the whole kit',
    'The player has the book, a pencil, and two ten-sided dice. Nothing is cut, folded, glued,',
    'aligned or assembled, ever. Randomness is two d10 read as a percentile, roll-under: the',
    'probability IS the number printed on the page. Design inside that and the book can be',
    'built; design outside it and it cannot.',
    '',
    '### The eight questions. Answer all eight, in ordinary words.',
    '',
    '1. HOW YOU WIN. One claim a stranger understands. Not "advance the narrative" — what state',
    '   must the book be in, on the last page, for the player to have won? If there is more than',
    '   one ending, what distinguishes them, and what does a player do differently to reach each?',
    '2. WHAT YOU ACTUALLY DO. The three to five things a player physically does with a pencil in',
    '   this book. If two of your verbs are the same verb with different labels, you have fewer',
    '   verbs than you think — merge them and find the real third.',
    '3. THE ECONOMY, IN PLAIN WORDS. What the training earns, what it is called in this world,',
    '   what it buys, what it costs, and what happens when the player runs out. If it cannot be',
    '   said in a paragraph, the player will never understand it either.',
    '4. HOW THE PASSWORD IS EARNED. Which pieces of the sealed ending\'s password exist, where',
    '   each comes from, how a player KNOWS they have found one, and what a player who missed',
    '   sessions does. This is the single most important rule in the book: it is the only one',
    '   that can fail silently and take the whole ending with it.',
    '5. WHAT ONE SESSION LOOKS LIKE AT THE TABLE. From opening the book at the gym to closing it.',
    '   What is read first, what is marked, when the dice come out, what is written, and what is',
    '   deliberately left unfinished for next time.',
    '   THEN WRITE THE OPENING MOVE AS A FORM (`sessionShape.ritual`). Everything else in this',
    '   answer is for the designer and never prints. `ritual.cue` is the one sentence that DOES:',
    '   it is printed at the top of every session page, where the player is standing with the book',
    '   open and a pencil, and it must tell them what to do first without their turning back to the',
    '   rules. A rules page that says "roll at the start of each session" and a session page that',
    '   says nothing is a rule the player will never perform — the rule existed and was illegible',
    '   at the only moment it mattered. Name the surface it happens on in `ritual.on`, and make it',
    '   a surface your economy actually touches: a ritual performed on nothing is a ritual nothing',
    '   pays for.',
    '6. WHAT ONE WEEK LOOKS LIKE. How the sessions add up, what happens at the end of a week, and',
    '   what decision the week ends on.',
    '7. WHAT CAN GO BADLY. What is scarce. What can be lost. Where a player can fall behind, how',
    '   they would notice, and how they can recover. A game where nothing can go wrong is a',
    '   worksheet.',
    '8. THE TEACHING ORDER. What the player must know before their first set, what can wait until',
    '   week two, and what should only be explained at the moment it is needed.',
    '',
    // ── THE DESIGNER'S SEAT LEARNS THE LAWS (2026-08-17) ──────────────────
    // THE RUN-KILLER THIS CLOSES. This stage runs FIRST and everything after it
    // is built to serve what it ratifies — but it was taught none of the laws
    // the LATER seats are floored on. So it could ratify, in ordinary prose, a
    // threshold-gated win condition; the spine seat would then be forbidden by
    // Floor 11a to wire the design it had been handed, parity would demand it
    // wire it anyway, and the repair router would send the fix to a stage
    // already banked. That is a dead end, not a retry, and it is what the
    // proving run hit.
    //
    // Stated in the GATES' OWN TERMS and aimed at Q1 and Q4, which is where the
    // designs that break them are written. This is the two-halves law applied
    // one seat EARLIER than usual: the floors still live at the spine seat, but
    // the seat that can still avoid them is this one.
    '### THE LAWS YOUR DESIGN MUST OBEY',
    'These are not style notes. Every one is enforced by a blocking check on the stage that turns',
    'your answers into the machine\'s graph, so a design that breaks one cannot be built — the next',
    'stage will be forbidden to wire what you ratified here, and it cannot come back and ask you to',
    'change it. Answers 1 and 4 are where these bite.',
    '',
    '1. THE TALLY PICKS WHICH ENDING, NEVER WHETHER. The player\'s final total may decide which',
    '   ending they reach and what state they carry into it. It may never decide whether the sealed',
    '   ending opens, whether the last week happens, or whether the password can be assembled at',
    '   all. A win condition that reads "reach N and the finale unlocks" is refused. Write it as',
    '   "reach N and you finish THIS way; short of it you finish ANOTHER way" — at least one ending',
    '   must be reachable without clearing the threshold.',
    '2. THE BOOK MUST BE WINNABLE AT 60% ADHERENCE. Assume a player who completes six of every ten',
    '   prescribed sessions, in the worst pattern of misses. That player must still finish the book',
    '   and open the sealed ending. Everything you price, gate or require has to be affordable on',
    '   that budget. Design for the player who has a life, not the one who never misses.',
    '3. THE ENDGAME IS A TARGET, NEVER A PURCHASE. The last week, the confrontation and the password',
    '   assembly are what the book aims at. They are never bought, never priced, never behind a',
    '   toll. Price the things that LEAD there instead.',
    '4. FAILURE ONLY ADDS. A missed session, a failed roll or a wrong guess may add pressure, add a',
    '   complication, or close one route while opening another. It may never take away what the',
    '   player already earned, and it may never make the ending unreachable. A pencil book has no',
    '   undo, and a player who cannot recover stops playing.',
    '5. THE DICE NEVER TOUCH THE TRAINING. Randomness decides what the world does — never what the',
    '   player lifts, how many sets they owe, or whether the work they did counted. The training is',
    '   the one thing in this book that is not a die roll, which is why marking it means anything.',
    '',
    '### Where the design comes from',
    'Your own knowledge of games — board games, video games, escape rooms, puzzle books, solo',
    'journalling games, legacy campaigns — remixed for THIS brief and this training program.',
    'There is no house template and no default game. Two books from the same brief must still',
    'differ in their verbs, their economy shape, their decision texture and their tension source.',
    'The program is the clock: heavy weeks are pressure, light weeks are the exhale, and the',
    'game should feel different in each because the training is.',
    '',
    '### Say what you cannot have',
    'This system prints on paper and a player marks it with a pencil. If your design wants',
    'something it cannot print — a deck to shuffle, a wheel to turn, a component to cut out —',
    'do not quietly substitute something printable and call it the same thing. Name the want in',
    '`unprintableWants` and design the best version you can without it. An honest gap is a',
    'record; a silent substitution is a book that describes a game it is not.',
    '',
    '### What happens to these answers',
    'The next stage turns them into a machine-readable graph and is checked against you in both',
    'directions: every currency, verb surface, win-condition ref and password element you name',
    'must appear in that graph, and nothing may appear in that graph that you did not teach. So',
    'name the surfaces you actually intend the book to have, in the ref grammar given above, and',
    'spell them the same way twice.',
    '',
    '### Name every KIND of surface in the ordinary word a player would use for it',
    'The check on "nothing may appear in that graph that you did not teach" is run on KINDS, not',
    'refs — a rulebook is written for a player who will never read `markStrip:W3.2`. For each kind',
    'of surface your design uses, at least one of its player-facing words must appear SOMEWHERE in',
    'your eight answers, your currency name, or your verb list. If a kind never appears in your',
    'prose, the next stage may not wire it, and it will have to drop a system your design assumed.',
    'These are the words that count, and they are the words a player would say anyway:',
    '- a `week` — "week"',
    '- a `session` — "session", "workout" or "training day"',
    '- a `markStrip` — "mark"',
    '- a `reckoning` — "reckoning", "tally" or "total"',
    '- a `clock` — "clock", "track", "gauge" or "dial"',
    '- an `oracle` — "oracle", "table" or "roll"',
    '- a `cipher` — "cipher", "code", "decode" or "decipher"',
    '- a `map` — "map", "board" or "region"',
    '- a `companion` — "companion", "ally", "kit" or "dashboard"',
    '- a `fragment` — "fragment", "document", "record" or "page"',
    '- a `door` — "door", "choice", "fork" or "decision"',
    '- a `seal` — "seal", "sealed" or "locked"',
    '- an `ending` — "ending", "finale" or "last page"',
    '- the wallet (`banked`) — "bank"',
    '- the `boss` — "boss", "final week" or "confrontation"',
    '- the `assembly` — "assembly", "assemble" or "password"',
    'Your own world-names go beside these, never instead of them: call it the Tide Ledger all you',
    'like, but say once that it is a track, or the machine cannot tell the player was ever told.',
    '',
    // The teaching half of D197's schema-derived unknown-key gate (D227): the
    // habit this forbids killed proving-run 3's first stage twice on the
    // bridge, where no wire schema can force the shape — attempt 1 invented
    // `answer_note` siblings, and after a repair prompt naming them, attempt 2
    // invented `answer_placeholder`. The gate is generic, so no named floor
    // ever owed this sentence; it is written now, at the seat that paid for it.
    'THE SCHEMA IS CLOSED. Emit exactly the keys the shape above names — nothing else, at any',
    'depth. Do not add annotation, note, placeholder, length, or helper keys beside your answers',
    '(`answer_note`, `answer_placeholder`, and anything like them are rejected whole). An answer',
    'field carries the answer itself and nothing else.',
    '',
    'Return ONLY the JSON object. No commentary, no markdown fences.'
  ];

  /**
   * formatGameRulebookGiven(rulebook, options) -> string
   *
   * THE RULEBOOK, HANDED TO THE STAGES THAT MUST SERVE IT (D173/D174 idiom).
   *
   * D174's measured lesson was that a surface can be authored, funded and
   * formatted and still reach the seats that need it nowhere. The rulebook is
   * the most expensive thing in the ladder to author and the most useless if it
   * is not read, so it is delivered as a GIVEN — not as a suggestion, and not
   * paraphrased.
   *
   * THREE SEAT CLASSES, each named rather than assumed:
   *   · the SPINE seat (`shell` on the multi-stage path, `skeleton` on S+F).
   *     The spine is this object's projection and the parity floor checks both
   *     directions, so the spine seat gets the FULL rulebook: a stage checked
   *     against a document it was never shown is the derived-or-strict trap.
   *   · the PRINTED RULES seat (`rules`, S+F). What prints is the point-of-use
   *     subset of exactly this document. On the multi-stage path that surface
   *     is `rulesSpread`, authored at the shell — the same stage, so one
   *     delivery covers both there.
   *   · the PROSE seats (`week-final`, `fragment`, `ending`, both pipelines) —
   *     added by the prose-funding wave. VISION §5: the world funds the prose,
   *     and a model with nothing true to say decorates. Measured before this
   *     wave: the formatter had four call sites and every one of them was
   *     PRE-CONTENT. Every week, every found document and every ending in the
   *     system was written by a stage that had never been told what game it
   *     was writing for — the D174 defect exactly, on the surfaces the reader
   *     actually reads.
   *
   * THE PROJECTIONS:
   *   · `options.compact` drops the answers the printed rules seat does not
   *     need in full, keeping the machine-facing declarations.
   *   · `options.prose` keeps the five answers a prose surface can be WRONG
   *     about — it can name the wrong currency, invent a verb, promise a win
   *     the rules do not contain, describe a password path that does not
   *     exist, or threaten a failure that cannot happen. It drops the three
   *     STRUCTURAL answers (session shape, week shape, teaching order), which
   *     the rules page and the week plan own: a prose stage handed those reads
   *     them as a shape to re-derive against the plan it was already given.
   *   · Neither flag: the whole document, for the two spine seats.
   *
   * WHY THE PROSE DEMAND LIVES HERE AND NOT IN INST_FOUND_DOCUMENTS. Two
   * independent reasons, and the second is the binding one:
   *   1. The single-prompt bundle measured 114,941 of its ratified 115,000
   *      characters at this wave — ~60 characters of headroom. INST_FOUND_
   *      DOCUMENTS, INST_INTERLUDES and INST_VOICE_DISCIPLINE are all ON that
   *      bundle (D132/D139/D144 arithmetic, one more time).
   *   2. D128's law: a section routed to a stage it is FALSE at teaches the
   *      model that this prompt's rules may not apply to the shape in front of
   *      it. "Name the document's occasion inside the game's economy" is
   *      unanswerable on the paste path, which runs no rulebook stage at all —
   *      so on the bundle it would be exactly that false section. Stated here,
   *      it arrives only where a rulebook exists to answer it, resolved.
   *
   * Returns '' for a missing or empty rulebook, so every caller without one
   * builds the prompt it always built, byte for byte.
   */
  window.formatGameRulebookGiven = function (rulebook, options) {
    if (!rulebook || typeof rulebook !== 'object') return '';
    var opts = options || {};
    var answerOf = function (key) {
      var node = rulebook[key];
      if (!node || typeof node !== 'object') return '';
      return String(node.answer || '').trim();
    };
    var lines = [
      '## THE GAME RULEBOOK (written before this stage — a GIVEN, not a proposal)',
      '',
      'This book\'s game was designed before any of its content existed. What follows is that',
      'design, verbatim. It is the SOURCE: what you write now serves it. Where your instinct',
      'and these rules disagree, the rules win.',
      ''
    ];
    // THE PROSE SEATS' OWN DEMAND. Stated once, here, because it is only
    // answerable where a rulebook exists (see the D128 note in the header).
    if (opts.prose) {
      lines = lines.concat([
        'YOU ARE WRITING PROSE FOR THIS GAME, and these rules are what the prose has to be TRUE',
        'OF. Name the currency by the name below and no other. Let the page show the verbs the',
        'player actually performs, on the surfaces they are performed on. Never promise the',
        'reader a win, a cost, or a way through that these rules do not contain. If a CURRENCY',
        'given elsewhere in this prompt spells the currency differently, THAT spelling is the',
        'one that prints — it is the same currency under a second name, and you must not widen',
        'the drift by inventing a third.',
        '',
        'EVERY IN-WORLD DOCUMENT YOU WRITE ANSWERS THREE QUESTIONS BEFORE ITS FIRST SENTENCE,',
        'and the answers are specific to THIS document, never to the book\'s genre:',
        '- WHO WROTE IT — a named person or office inside the fiction, with a position in the',
        '  conflict these rules describe: who they answer to, what they stand to lose, what the',
        '  economy above costs them.',
        '- WHO READS IT — its in-fiction addressee. A document written to no one is a lore',
        '  drop; a document written to a named reader has something to withhold from them.',
        '- ITS OCCASION — what event in the game\'s economy caused it to be written NOW. A mark',
        '  spent, a clock turned, a gate refused, a component extracted.',
        '"The harbormaster\'s third warning letter, to the pilot who ignored the first two,',
        'written the morning after the tide clock filled" is an occasion. "Cosmic-horror prose"',
        'is a genre label and funds nothing.',
        '',
        'THIS IS ALSO WHY THE HANDS DIFFER. Two documents by different named authors must be',
        'tellable apart with the bylines removed — and the thing that makes them so is that',
        'their writers hold DIFFERENT POSITIONS in the conflict above. They record different',
        'facts because different facts threaten them; they omit different facts for the same',
        'reason; they format differently because they answer to different offices. Voices that',
        'differ only in flourish are one hand wearing several names.',
        ''
      ]);
    }
    // THE SPINE SEATS' ORDERING DEMAND (D139's compose-before-metrics idiom,
    // applied to voice). These two seats author `meta.literaryRegister`, and
    // they receive the rulebook already — so the ordering can be stated as a
    // fact about the prompt in front of them rather than as a rule they must
    // remember. Not on the compact projection (the rules page authors no
    // voiceSpec) and not on the prose projection (those stages obey one).
    if (!opts.compact && !opts.prose) {
      lines = lines.concat([
        'THE VOICE IS CHOSEN AFTER, AND FROM, THESE RULES. When you author',
        '`meta.literaryRegister` below, derive it from the GAME the rules above declare — not',
        'from the genre words in the brief, and not before you have read them. The narrating',
        'voice is a fit to what the player DOES: a book whose core verb is decoding under',
        'deadline does not sound like a book whose core verb is tending something slowly. The',
        'same order governs `authorRegisters`: the hands differ because their writers hold',
        'different positions in the conflict these rules describe.',
        ''
      ]);
    }
    var SECTIONS = [
      ['winCondition', 'How you win'],
      ['coreVerbs', 'What the player actually does'],
      ['economy', 'The economy'],
      ['passwordPath', 'How the password is earned'],
      ['sessionShape', 'One session at the table'],
      ['weekShape', 'One week'],
      ['whatGoesBadly', 'What can go badly'],
      ['teachingOrder', 'The teaching order']
    ];
    // The compact projection keeps every answer whose absence would let a
    // printed teaching surface contradict the design — how you win, what you
    // do, the economy, the password, the session, and the teaching order — and
    // drops the two a rules page does not print (the week's shape and the
    // failure modes, which the week stages own).
    var COMPACT_KEYS = ['winCondition', 'coreVerbs', 'economy', 'passwordPath',
      'sessionShape', 'teachingOrder'];
    // The prose projection keeps the five answers a written page can be WRONG
    // about and drops the three structural ones. `whatGoesBadly` is IN and it
    // is the least obvious inclusion: a document's occasion is usually a thing
    // that went badly, and a stage that invents its own failure modes writes
    // threats the game cannot deliver.
    var PROSE_KEYS = ['winCondition', 'coreVerbs', 'economy', 'passwordPath', 'whatGoesBadly'];
    SECTIONS.forEach(function (row) {
      if (opts.compact && COMPACT_KEYS.indexOf(row[0]) === -1) return;
      if (opts.prose && PROSE_KEYS.indexOf(row[0]) === -1) return;
      var text = answerOf(row[0]);
      if (!text) return;
      lines.push('### ' + row[1]);
      lines.push(text);
      lines.push('');
    });

    var declared = [];
    var currency = String(((rulebook.economy || {}).currency) || '').trim();
    if (currency) declared.push('- The currency is called: ' + currency);
    var verbs = ((rulebook.coreVerbs || {}).verbs) || [];
    if (Array.isArray(verbs) && verbs.length) {
      declared.push('- The core verbs and the surfaces they are performed on: '
        + verbs.map(function (v) {
          return String((v || {}).verb || '').trim() + ' on `' + String((v || {}).on || '').trim() + '`';
        }).join(' · '));
    }
    var requires = ((rulebook.winCondition || {}).requires) || [];
    if (Array.isArray(requires) && requires.length) {
      declared.push('- Winning requires reaching: ' + requires.map(function (r) {
        return '`' + String(r).trim() + '`';
      }).join(' '));
    }
    var elements = ((rulebook.passwordPath || {}).elements) || [];
    if (Array.isArray(elements) && elements.length) {
      declared.push('- The password pieces come from: ' + elements.map(function (r) {
        return '`' + String(r).trim() + '`';
      }).join(' '));
    }
    // THE RITUAL'S SURFACE, on the same list as the verbs' (2026-08-20). The
    // spine seat is required to carry `sessionShape.ritual.on` as a graph node
    // (`parity-ritual-surface-into-graph`), and until this line it was the one
    // ref-bearing rulebook field the given never echoed — so the seat that must
    // wire it was shown the rule and not the value. Every other declaration
    // below travels; this one was simply missed.
    var ritual = (rulebook.sessionShape || {}).ritual;
    var ritualOn = String(((ritual && typeof ritual === 'object') ? ritual.on : '') || '').trim();
    if (ritualOn) {
      declared.push('- The session opens on: `' + ritualOn + '`');
    }
    if (declared.length) {
      lines.push('### The declarations this book is held to');
      lines = lines.concat(declared);
      lines.push('');
    }
    var wants = rulebook.unprintableWants;
    if (Array.isArray(wants) && wants.length) {
      lines.push('### Declared as unbuildable on paper (do not quietly substitute)');
      wants.forEach(function (w) {
        var text = String(w || '').trim();
        if (text) lines.push('- ' + text);
      });
      lines.push('');
    }
    return lines.join('\n').replace(/\n+$/, '');
  };

  /**
   * formatWeekCadenceGiven(playSpine, weekNumber) -> string
   *
   * THIS WEEK'S CADENCE OBLIGATIONS — the taught half of the blocking cadence
   * floor (§4.11, D187's two-halves law).
   *
   * THE FLOOR IT TEACHES: cadenceConformanceFloorErrors() in validation.js
   * blocks a week that does not print a surface its own book declared weekly (or
   * late-arriving, or window-closed). A floor whose demand no prompt states
   * blocks a model that obeyed its prompt perfectly — that is an ambush, and it
   * is the defect D186 learned live, on the author, on the proving run.
   *
   * DERIVED, AND DELIBERATELY TINY. It prints only the edges that bear on THIS
   * week, resolved from the same `cadence` declarations the floor reads, so the
   * model is told exactly what it will be held to and nothing else. A week with
   * no cadence obligations gets '' and its prompt is byte-identical to the one it
   * always built — which is what keeps this off the ceiling of every week that
   * does not need it (DR-35 is live; the shell payload is still the largest
   * prompt in the system and this seat is the second).
   *
   * IT NAMES THE SURFACE, NOT THE RULE. The model is not asked to reason about
   * cadence vocabulary here — that reasoning happened at the economy-graph seat
   * that WROTE the declarations. This seat is told, in imperative English, which
   * named surfaces this week owes and which it must not print yet. Two seats, two
   * halves of one rule.
   */
  window.formatWeekCadenceGiven = function (playSpine, weekNumber) {
    var spine = (playSpine && typeof playSpine === 'object') ? playSpine : null;
    if (!spine) return '';
    var n = Number(weekNumber);
    if (!(n > 0)) return '';
    var graph = Array.isArray(spine.economyGraph) ? spine.economyGraph : [];
    if (!graph.length) return '';

    var owes = [];
    var withhold = [];
    var seen = {};
    graph.forEach(function (edge) {
      if (!edge || typeof edge !== 'object') return;
      var cadence = edge.cadence;
      if (!cadence || typeof cadence !== 'object') return;
      var mode = String(cadence.mode || '').trim();
      var introWeek = Number(cadence.introWeek) > 0 ? Number(cadence.introWeek) : 1;
      var closesAtWeek = Number(edge.closesAtWeek) > 0 ? Number(edge.closesAtWeek) : 0;
      // The same endpoint rule the floor uses: a surface named by NAME, never a
      // week-shaped ref (which belongs to its own week and cannot be owed here).
      ['from', 'to'].forEach(function (side) {
        var raw = String(edge[side] || '').trim();
        var m = /^([A-Za-z]+)\s*:\s*(.+)$/.exec(raw);
        if (!m) return;
        var kind = m[1];
        var id = m[2].trim();
        if (['clock', 'companion', 'map'].indexOf(kind) === -1) return;
        if (/^w\s*\d+/i.test(id)) return;
        var label = '`' + kind + ':' + id + '`';
        var dedupe = mode + '::' + label;
        if (seen[dedupe]) return;
        seen[dedupe] = true;
        if (mode === 'weekly' && n >= introWeek) {
          owes.push('- ' + label + ' — declared WEEKLY'
            + (introWeek > 1 ? ' from week ' + introWeek : '') + '.');
        } else if (mode === 'late' && n >= introWeek) {
          owes.push('- ' + label + ' — declared LATE, arriving in week ' + introWeek + '.');
        } else if (mode === 'late' && n < introWeek) {
          withhold.push('- ' + label + ' — declared LATE, and does not arrive until week '
            + introWeek + '.');
        } else if (mode === 'window' && closesAtWeek && n > closesAtWeek) {
          withhold.push('- ' + label + ' — its window CLOSED at week ' + closesAtWeek + '.');
        }
      });
    });
    if (!owes.length && !withhold.length) return '';

    var lines = [
      '### The surfaces this week owes — a GIVEN, and it is checked',
      '',
      'This book declared how often the player touches each part of its economy, before any week',
      'was written. Week ' + n + ' is held to those declarations, and a week that breaks one is',
      'refused and sent back.',
      ''
    ];
    if (owes.length) {
      lines.push('MUST APPEAR IN THIS WEEK, under exactly the name shown:');
      lines = lines.concat(owes);
      lines.push('Print each one as a real, markable surface in this week\'s payload — a clock in'
        + ' `gameplayClocks`, a companion component, a named map region. The name must match'
        + ' exactly; a renamed surface is a missing surface to the machine and to the player'
        + ' following the rules page.');
      lines.push('');
    }
    if (withhold.length) {
      lines.push('MUST NOT APPEAR IN THIS WEEK — the book declared these deliberately absent here:');
      lines = lines.concat(withhold);
      lines.push('This is design, not omission. Printing one early makes the book\'s own'
        + ' declaration false.');
      lines.push('');
    }
    return lines.join('\n').replace(/\n+$/, '');
  };

  /**
   * formatWeekTensionGiven(playSpine, weekNumber, weekCount) -> string
   *
   * THIS WEEK'S ROW OF THE TENSION BUDGET, AND ITS PLACE ON THE CURVE.
   *
   * `meta.playSpine.tensionBudget` is authored one row per week at the spine
   * seat, `difficultyCurve.perWeek` one clause per week beside it, and both are
   * read back by the closure floors and the simulated player. Measured before
   * the prose-funding wave: NO prompt surface under public/generator/ read
   * either one. The week stages — the stages that write what is actually at
   * stake in a week — were choosing this week's pressure freely while the book
   * had already declared it, which is D170's shape (a rule that reaches the
   * stage nowhere) applied to the seam VISION §7 exists to hold.
   *
   * DERIVED, NOT RESTATED. The position is stated as "week N of M" and the
   * curve clause is quoted verbatim from `perWeek[N-1]`. It deliberately does
   * NOT name a week "the peak": that would be a second deload/peak heuristic
   * living beside `derivePlannedWeekShapes` and the topology digest's own, and
   * D166's ruling on exactly that pair is that teaching from one heuristic
   * while checking against another is D93's two-algorithms defect. If the book
   * wants this week called the peak, the book says so in `perWeek`.
   *
   * Returns '' when there is no spine, no row for this week and no curve
   * clause, so every caller without one builds the prompt it always built.
   */
  window.formatWeekTensionGiven = function (playSpine, weekNumber, weekCount) {
    var spine = (playSpine && typeof playSpine === 'object') ? playSpine : null;
    if (!spine) return '';
    var n = Number(weekNumber);
    if (!(n > 0)) return '';
    var budget = Array.isArray(spine.tensionBudget) ? spine.tensionBudget : [];
    var curve = (spine.difficultyCurve && typeof spine.difficultyCurve === 'object')
      ? spine.difficultyCurve : {};
    var perWeek = Array.isArray(curve.perWeek) ? curve.perWeek : [];
    var row = budget.filter(function (r) { return Number((r || {}).week) === n; })[0] || null;
    var clause = String(perWeek[n - 1] || '').trim();
    var shape = String(curve.shape || '').trim();
    if (!row && !clause && !shape) return '';
    var total = Number(weekCount) || budget.length || perWeek.length || 0;
    var position = total > 0 ? ('week ' + n + ' of ' + total) : ('week ' + n);
    var lines = [
      '### What this week has at stake — a GIVEN',
      '',
      'This book\'s `meta.playSpine.tensionBudget` was written before any week was, and it has a',
      'row for ' + position + '. It is not a suggestion about mood: it is what this week must',
      'actually put at risk, on the page, in surfaces the player marks.',
      ''
    ];
    var axes = [];
    if (row) {
      if (String(row.scarce || '').trim()) {
        axes.push('- SCARCE this week: ' + String(row.scarce).trim());
      }
      if (String(row.losable || '').trim()) {
        axes.push('- LOSABLE this week: ' + String(row.losable).trim());
      }
      if (String(row.fallBehind || '').trim()) {
        axes.push('- HOW THE PLAYER FALLS BEHIND: ' + String(row.fallBehind).trim());
      }
    }
    if (axes.length) {
      lines = lines.concat(axes);
      // An ABSENT axis is a declaration, not a gap (the schema says so), so the
      // block says which way rather than leaving the model to guess whether a
      // missing line means "none" or "not yet decided".
      if (axes.length < 3) {
        lines.push('The axes not listed are declared EMPTY for this week — do not invent pressure on'
          + ' them.');
      }
      lines.push('');
    } else if (row) {
      lines.push('This week\'s row names no axis at all: the book declared a week with nothing at'
        + ' stake. Write it that way — a lull is a legitimate week — and do not manufacture a'
        + ' threat the spine did not price.');
      lines.push('');
    }
    if (clause || shape) {
      lines.push('The difficulty curve: '
        + (curve.keyedToLoad === true
          ? 'this book keyed its puzzles to the training load.'
          : curve.keyedToLoad === false
            ? 'this book deliberately did NOT key its puzzles to the training load.'
            : 'declared without a keying answer.'));
      if (shape) lines.push('Its shape, as the book stated it: ' + shape);
      if (clause) lines.push('And for ' + position + ', verbatim: ' + clause);
      lines.push('');
    }
    return lines.join('\n').replace(/\n+$/, '');
  };

  // ── THE ARSENAL AT THE DESIGNER'S SEAT (D217 W2, author directive 2026-08-18) ──
  //
  // VISION §4.0: the model is the game designer, and what the book may print is
  // bounded by the renderable vocabulary — *the boundary is stated rather than
  // faked*. VISION §12: an acceptance set the prompts never show is not a menu,
  // it is a default generator. The arsenal audit
  // (docs/reference/generated/arsenal.md) measured this seat and convicted it:
  // ZERO of the 22 composable implements were named at `game-rulebook`. The whole
  // shelf was taught one stage LATER, at `shell`, after the rules were already
  // written — so the stage whose entire job is deciding what the game IS designed
  // it blind, and a blind designer designs the default game.
  //
  // THE AMENDMENT THIS MAKES. The rulebook stage is doctrine-minimal by ruling
  // (D128; §22e of check-generation-floors.mjs pins the negatives — no prose
  // budgets, nothing false at this seat). That ruling STANDS, with one addition:
  // the shelf. Doctrine-minimal never meant "and no menu of what can be printed".
  //
  // THE DIGEST IS EMITTED, NEVER WRITTEN. `buildArsenalDigest()` in
  // contracts/ludic-library.mjs compiles the shelf from the registry in the D144
  // IN/DOES/GIVES/LOCKS form, one line per implement. This file is a browser IIFE
  // with zero imports, so the digest arrives as a quoted literal — kept honest by
  // `arsenalDigestParity()` in scripts/validate.mjs, which byte-compares the
  // evaluated `window.ARSENAL_DIGEST` against the function's live output in BOTH
  // directions (a literal that drifts, and a registry change the literal does not
  // carry). Never edit a digest line in place. Re-emit the block:
  //   node -e "import('./public/contracts/ludic-library.mjs').then(m=>process.stdout.write(m.buildArsenalDigest()))"
  // and re-quote each line, one array element per digest line, in order.
  //
  // CHOOSE-WITH-A-REASON, NOT A PARTS LIST. The audit's `taught` gate asks for a
  // menu WITH a reason to choose each row, and the registry's `outputs` (GIVES) IS
  // that reason — so the framing points AT the clause instead of paraphrasing it. A
  // paraphrase would be a second, worse copy of the argument for adoption (D144 5b,
  // where the harvest menu offered nine ways to fail and no reason to adopt).
  //
  // NO SECOND MENU, deliberately. The furniture/instruments split (D170,
  // LUDIC_STRUCTURAL_ENTRIES) is NOT restated here, and not only for the D93 copy
  // reason: teaching "six of these print anyway, spend your choices elsewhere" at
  // THIS seat would invite a rulebook that never names the map, the cipher, the
  // oracle or the tally in ordinary words — and the spine may only wire kinds the
  // rules already named, while the week gate requires all four. The distinction is
  // true at the seat that writes `composition` (INST_LUDIC_SPINE teaches it there)
  // and would cause failures here.
  //
  // THE HONEST GAP IS `unprintableWants`, NOT `honestGaps`. Two laws one layer
  // apart, and booklet-schema.mjs says so at meta.gameRulebook.unprintableWants:
  // this seat records what the PRINTABLE VOCABULARY lacks; `playSpine.honestGaps`
  // records what the LIBRARY lacks, one stage later. `honestGaps` is not a key this
  // stage may write — `meta.gameRulebook` is additionalProperties:false and
  // unknownKeyErrorsForStage blocks the unit — so naming it here would teach a
  // blocking defect.
  window.ARSENAL_DIGEST = [
    'THE IMPLEMENTED SYSTEMS — the composition menu. Each line: what feeds it, what it does, what it yields, what locks it.',
    '- `reckoning-economy` (The reckoning economy) — IN: Session markStrip ticks; the week’s reckoning conversion; the derived boss threshold. DOES: Ticks tally at the week’s Reckoning, convert to the named currency, and bank; banked value prices every spend the spine declares. GIVES: A filled strip, a tallied panel, a running Banked figure, and whatever the spend opens. LOCKS: Nothing spends before its first Reckoning; the boss threshold is a printed TARGET — it may pick WHICH ending the player reaches, never WHETHER the endgame opens, and a spine that routes required content through it is blocked (D130).',
    '- `board` (The board) — IN: Banked value or a key; the region or node the player names. DOES: Marking the map opens a region permanently — six geometries under eight board-state modes, add-only in every one. GIVES: A mutated map the player returns to every week; new regions legal to reference in prose. LOCKS: A region is unreachable until an edge feeds it; the map never un-marks, so an opened region cannot be spent twice.',
    '- `decode-chain` (The decode chain) — IN: The week’s cipher body plus the extraction instruction; prior play state for the cross-reference families. DOES: The player performs the extraction with a pencil; the result is a word, coordinate, or index the book reads back. GIVES: A decoded value that feeds a seal, a password element, or the boss assembly. LOCKS: A cipher whose key is a fragment the player has not met yet cannot be solved — keys land strictly before locks.',
    '- `clock-bank` (The clock bank) — IN: Outcomes, spends, misses, and the passage of weeks. DOES: Segments tick on fill, drain, race, or tug-of-war clocks; a full clock fires its declared consequence. GIVES: Visible pressure the player reads at a glance, and the state change a filled clock triggers. LOCKS: A clock nothing reads is a mute source and blocks at the week floor; ambient clocks must be declared ambient.',
    '- `companion-kit` (The companion kit) — IN: Play state the player chooses to record — items held, memories kept, stats moved. DOES: State-holding components (dashboards, tracks, stat blocks, inventories, memory slots) take pencil marks between sessions. GIVES: A carried position the later weeks can read and the endgame can require. LOCKS: Slot limits force discards; a component the economy never feeds holds nothing.',
    '- `oracle-pull` (The oracle pull) — IN: Two ten-sided dice, read as roll-under percentile. DOES: The d100 leg of the Hook loop: ten bands, each mapping to a concrete state change rather than atmosphere. GIVES: A rolled outcome that ticks something, grants something, or opens something. LOCKS: Chance isolation (D37): dice never touch sets, reps, load, or rest, and an outcome the endgame requires can never sit behind a roll.',
    '- `door-fork` (The door fork) — IN: The week’s posted choice and whatever the player has banked when they reach it. DOES: The player takes one side and crosses out the other; the decision ledger names what mechanically differs. GIVES: A branch-attributed change to the economy — a price, a clock, a region, a table. LOCKS: A door with no edge leaving it is flavour-only; content reachable down one branch alone is a soft-lock.',
    '- `sealed-cache` (The sealed cache) — IN: A key the player recognises — a decoded word, a filled clock, a named region. DOES: Sealed by honour: the page states its key and its unlock condition and the player chooses when to turn to it. GIVES: A late document that pays an early promise. LOCKS: The key is held strictly before the sealed page is printed; you cannot open what you have not yet found.',
    '- `boss-convergence` (The boss convergence) — IN: The weekly component values, the assembly instruction, and the boss componentInputs. DOES: The endgame ceremony assembles the season’s collected values into the finale’s key. GIVES: The assembly page, the boss encounter, and the ending the assembled value opens. LOCKS: Every password element must be collectable on every branch — the finale opens with all of them or none.',
    '- `ledger-audit` (The ledger audit) — IN: The player’s own logged numbers, movement by movement. DOES: First / peak / change per movement, audited across the block — the body read as evidence. GIVES: A printed ledger spread the player fills and the ending can cite. LOCKS: Emitted only when the book declares an economy; nothing gates it.',
    '- `deduction-board` (The deduction board) — IN: A clue set and a grid of pencil cells — subjects against categories, run lengths against a picture, a partly-printed square of digits, named voices against the two kinds of speaker, or things against the order they went in. DOES: The player deduces cell states from constraints; the completed grid yields a code. A deterministic solver proves every printed puzzle solvable, UNIQUE, and key-matched before the week is accepted, and refuses it with the defect quoted otherwise. GIVES: A word, a letter string or a digit string the seal, the assembly or a priced spend reads. LOCKS: The grid is the lock. Nothing ships that a machine cannot finish: two solutions, no solution, or an answer the grid does not yield are all refusals, not warnings.',
    '- `word-hunt` (The word hunt) — IN: A letter board and a word list drawn from the book’s own noun roster. DOES: The player rings the words they find. A verifier proves every declared placement genuinely spells its word in the printed board, so overlaps are legal by construction, and proves the answer rule produces the declared answer. GIVES: A word the seal or the assembly wants — either one from the list, or the letters no word covered. LOCKS: Machine-verified placement; a word the board does not contain is refused, and in leftovers mode an answer the uncovered letters do not spell is refused.',
    '- `arithmetic-grid` (The arithmetic grid) — IN: A cage or run structure with target totals, and the digits 1-9. DOES: The player fills digits so every run or cage hits its total with no repeat inside it; the completed grid yields a digit code. A deterministic solver proves solvable, UNIQUE and key-matched, and refuses with the defect quoted otherwise. GIVES: A digit string the seal, the assembly or a priced spend reads. LOCKS: The totals are the lock. A budget the solver cannot finish inside is a refusal, never a pass — an unprovable puzzle and a broken one are the same thing to a player holding a pencil.',
    '- `interlocking-word-grid` (The interlocking word grid (crossword)) — IN: A pool of answer/clue pairs drawn from the book’s own world, and nothing else — the model authors no geometry. DOES: The loom weaves the answers that interlock into a numbered grid and drops the rest; the player writes answers into a shape whose crossings check each other, and the marked squares spell the key. A verifier re-derives everything from the finished grid and refuses a weave that will not carry a puzzle. GIVES: A word or letter string the seal, the assembly or a priced spend reads. LOCKS: The crossings are the lock. `verifyCrossword()` in contracts/puzzle-solvers.mjs refuses a grid where any run of two or more cells is unclued, any entry crosses nothing, the shape falls into islands, or the marked squares do not spell the declared answer. A search budget exceeded is a refusal, never a pass.',
    '',
    'THE WIRED PATTERNS — the harvest menu. Declared on the surface each line names; a floor reads every declaration back.',
    '- `gate-structure` (declare: `meta.playSpine.gateStructure`) — GIVES: A shape the economy graph must actually have — the floor reads the declared structure back off the graph. LOCKS: Sequential owes a chain; path-based owes two lanes and a convergence; open owes several independent feeders into one sink.',
    '- `hint-ladder` (declare: `meta.playSpine.hintLadders`) — GIVES: A player who is never hard-stuck, a threat clock that remembers they were, and a band the reader finds at the point of use. LOCKS: Rungs are ordered and each is dearer than the last; the ladder names the printed surface that carries it, and the seal is the ORDER — the cost prints before the thing it buys, and paying is on the player’s honour, the same ruling as the sealed cache.',
    '- `deduction-milestone` (declare: `meta.playSpine.milestones`) — GIVES: A theory the player commits to in pencil, and the surface that answers it. LOCKS: The unlock is unavailable below the count, and the milestone must be answered by a consequence edge — an unanswered theory is an unpaid promise.',
    '- `legacy-pencil-move` (declare: `meta.playSpine.legacyMoves`) — GIVES: A book that is visibly a record of one campaign and cannot be replayed clean. LOCKS: Each move names the printed surface it happens on; nothing is ever un-marked.',
    '- `found-not-found-gating` (declare: `meta.playSpine.economyGraph (edges into `seal:`)`) — GIVES: Gated content that opens exactly once the player has earned it. LOCKS: A sealed surface with no inbound edge is unreachable; a key that lands with or after its lock blocks.',
    '- `branch-attributed-consequence` (declare: `meta.playSpine.economyGraph[].branch`) — GIVES: A fork whose branches genuinely differ, and a simulated player that can walk each side. LOCKS: An endgame reachable on one branch only is a soft-lock; unattributed door edges are reported as underspecified.',
    '- `priced-spend` (declare: `meta.playSpine.economyGraph[].price`) — GIVES: A budget the player plans against, and a stingy/greedy choice that is a real trade rather than a schedule. LOCKS: A spend is unavailable below its price; the endgame’s own gate stays the derived threshold and may never be re-priced here.',
    '- `timed-affordance` (declare: `meta.playSpine.economyGraph[].closesAtWeek`) — GIVES: A deadline the schedule can be measured against. LOCKS: Nothing may close before it opens; a required surface behind a closed window is a soft-lock.',
    '- `book-referential-examination` (declare: `weeks[].fieldOps.cipher (the `cross-reference` family)`) — GIVES: A puzzle only a player who has actually read this artifact can solve. LOCKS: Every cited surface must be printed EARLIER than the puzzle that cites it.'
  ].join('\n');

  window.INST_ARSENAL = [
    '## The arsenal — what this engine can actually print',
    'Read the shelf before you answer the eight questions. Every implement below is BUILT: the',
    'engine draws it, a floor reads it back, and a player works it with a pencil on paper. The',
    'shelf is the boundary of what your design can become an actual book.',
    '',
    'IT IS NOT WHERE THE IDEAS COME FROM. Those still come from your own knowledge of games,',
    'remixed for THIS brief — the shelf is what an idea has to be BUILT OUT OF once you have it.',
    'Two designers handed this same shelf and different briefs should produce different games. If',
    'the shelf is deciding your game, you are reading it as a template, and it is not one.',
    '',
    'THE REASON TO CHOOSE ONE IS ON ITS OWN LINE. Each entry says what feeds it (IN), what it',
    'does (DOES), what the player gets out of it (GIVES) and what breaks if it is wired wrong',
    '(LOCKS). GIVES is the argument for the implement; LOCKS is its price. Choose the implements',
    'whose GIVES is the game you are describing — not the ones that are familiar, and not the',
    'ones that come first in the list.',
    '',
    window.ARSENAL_DIGEST,
    '',
    'THIS IS A SHELF, NOT A CHECKLIST. Naming all of it is not designing — a game is as much',
    'what you left off as what you kept. A later stage writes the composition down, and it',
    'writes it FROM your answers, so let your answers WANT particular implements and say what',
    'each one is FOR in this book. A design that gestures at everything leaves the choosing to a',
    'stage that cannot read your intent, and that is how two books from different briefs end up',
    'the same game.',
    '',
    'IF THE SHELF LACKS WHAT YOUR DESIGN WANTS, SAY SO. Do not rename something on it and call',
    'it the thing you wanted. Name the want in `unprintableWants`, in plain words, and design',
    'the best version you can with what is here. That record is how this shelf grows — the gap',
    'you write down is the next implement built. A silent substitution is a book that describes',
    'a game it is not.'
  ];

  // ── The surface-ref grammar (extracted, D173 rules-first wave) ────────────
  // ONE HOME, TWO STAGE READERS. The grammar used to live inside the Play Spine
  // section, which was correct while the spine was the only surface that
  // pointed at anything. The rulebook stage now points too — its win condition
  // names the nodes a player must reach, its verbs name the surfaces they are
  // performed on, its password path names where the pieces come from — and it
  // runs BEFORE the spine, so it cannot read a section routed to a later stage.
  //
  // The alternative was a second copy in the rulebook's own schema, which is
  // the drift D93 exists to make impossible: a kind added here and not there
  // would be a ref the floors resolve and one prompt never taught. Extracted
  // instead, and routed to both seats through STAGE_SCHEMA_MAP.
  //
  // validate.mjs (ludicSpinePromptParity, tooth 2) anchors the SURFACE_REF_KINDS
  // and SURFACE_REF_SINGLETONS parity on THIS section rather than on the spine's.
  window.INST_SURFACE_REFS = [
    '## Surface refs — how this book points at its own parts',
    'Every reference to a printed surface is written as `kind:id`, or as one of three singletons.',
    '',
    '### DERIVE OR DECLARE — the id is one or the other, and guessing costs an attempt',
    'SOME IDS ARE DERIVED, and you do not get to name them. The weeks and sessions of this book',
    'are numbered by the training program, so every surface that sits ON a week or a session is',
    'identified by that number and by nothing else. The id is always `W<week>`, or',
    '`W<week>.<session>` where a single session is meant:',
    'Kinds: `week:W3` `session:W3.2` `markStrip:W3.2` `reckoning:W3` `oracle:W4` `cipher:W2`',
    '`door:W5`',
    'A world-name in one of these — `markStrip:Night`, `oracle:Arrivals`, `door:Threshold` —',
    'points at a surface this book will never print, however good the name is. The mark strip on',
    'week 3 is `markStrip:W3` even in a book about nights; call it the Night Register in the',
    'prose and `W3` in the ref.',
    '',
    'SOME IDS ARE DECLARED, and those are yours. The id is the name you are actually giving the',
    'surface elsewhere in this book, spelled the same way every time you point at it:',
    '`clock:<clock name>` `map:<region or board name>` `companion:<label>` `fragment:F.07`',
    '`seal:<fragment id>` `ending:E2`',
    '',
    'Singletons (no id — a book has at most one): `banked` `boss` `assembly`',
    'A ref to a week this book does not have, or to a fragment outside your registry, is a',
    'blocking error.'
  ];

  window.INST_LUDIC_SPINE = [
    '## The Play Spine (meta.playSpine — REQUIRED)',
    'Step 11 of the compiler said what to compose. This is where you write it down, in a',
    'shape a machine can check. A book whose systems do not reference each other is rejected',
    'at this stage, so declare the wiring here and then BUILD what you declared.',
    'Refs are written in the `kind:id` grammar given in the Surface refs section above.',
    '',
    '### THE SPINE IS A PROJECTION OF THE RULEBOOK, NOT A SECOND DESIGN',
    'The game rulebook was written before this stage and is quoted to you above as a GIVEN.',
    'It is the SOURCE. You are not designing the game here — you already did — you are writing',
    'down, in a machine-checkable shape, the game those rules describe. Every currency, verb,',
    'win-condition node and password element in the rules must turn up in the graph below, and',
    'nothing may turn up in the graph that the rules never taught. Both directions are checked',
    'and both block:',
    '- RULES INTO GRAPH. The currency the rules name must appear as a `currency` on at least one',
    '  `economyGraph` edge. Every surface a core verb is performed `on`, every ref the win',
    '  condition `requires`, the surface the opening ritual acts on (`sessionShape.ritual.on`),',
    '  and every password element must appear as a node — a `from` or a `to` — SPELLED THE SAME',
    '  WAY the rulebook spelled it. If the rules say the player decodes on `cipher:W2`, this',
    '  graph has a `cipher:W2`. The ritual is the fifth of those and the one an enumeration is',
    '  most likely to drop: it is printed at the top of every session page, so a ritual acting',
    '  on a surface no edge names is the loudest dead reference the book can carry.',
    '- GRAPH INTO RULES. Every currency you name on an edge must be a currency the rulebook',
    '  taught, and every KIND of surface your graph touches must already be named somewhere in the',
    '  rulebook quoted above, in the ordinary player-facing word for that kind — a clock called a',
    '  "clock", "track", "gauge" or "dial"; a map called a "map", "board" or "region"; a cipher',
    '  called a "cipher", "code", "decode" or "decipher", and so on for every kind you wire. A',
    '  system in the machine that the player is never told about passes every other gate and no',
    '  human can play it. YOU CANNOT EDIT THE RULES FROM HERE, so the repair is on this side: wire',
    '  only the kinds those rules already name, and put anything else in `honestGaps`.',
    'If the graph you would honestly write disagrees with the rules, the RULES WIN and the graph',
    'changes to serve them. That is what rules-first means.',
    '',
    // D230: the floor's teaching half at the graph-writing seat. Three shell
    // attempts in proving-run 3 routed the endgame through the reckoning
    // threshold against a rulebook that explicitly forbade it — the soft-lock
    // floor (D130) taught the law only in its ERROR text, after the money was
    // spent. The old reckoning-economy LOCKS line even read as permission.
    '### THE ENDGAME ROUTING LAW (blocking)',
    'The reckoning threshold is a printed TARGET, never a lock. Route NOTHING required through',
    'it: no boss, no assembly, no seal, and never every ending. The tally may pick WHICH ending',
    'the player signs — it may never decide WHETHER the endgame opens. Feed the ceremony and at',
    'least one ending from surfaces the player\'s own work reaches directly (a cipher, an',
    'assembly, a seal keyed earlier); a threshold-gated ending is legal only as the high bar a',
    'strong block buys, never the only door. A graph that gates required content on the',
    'threshold is blocked at this stage — at 60% adherence the book must still finish.',
    '',
    '### The seven declarations',
    '- `composition` (array, 2-4 items): `{ entry, role }`.',
    '  `entry` is a CLOSED menu, and it comes in TWO HALVES. Read the halves before you pick.',
    '',
    '  THE FURNITURE — every book prints these whether it composes with them or not. The week',
    '  gate refuses a non-boss week with no map, no cipher or no oracle; `meta.economy` is',
    '  required of you on this very stage; there is no book without a boss. Naming them is',
    '  therefore a DESCRIPTION of the default book, not a choice:',
    '  `reckoning-economy` (marks tally, bank, price spends) · `board` (the map and its',
    '  regions) · `decode-chain` (the weekly cipher) · `oracle-pull` (the d100 table) ·',
    '  `boss-convergence` (the endgame ceremony, assembly and locked finale) ·',
    '  `ledger-audit` (the body audited).',
    '',
    '  THE INSTRUMENTS — none of these appears unless a book asks for it. This half is where',
    '  the book becomes a particular game rather than a competent one:',
    '  `clock-bank` (fill / drain / race / tug-of-war pressure) · `companion-kit` (dashboards,',
    '  tracks, stats, inventories) · `door-fork` (the week\'s posted choice) ·',
    '  `sealed-cache` (sealed-by-honour content and its key) ·',
    '  `deduction-board` (a logic grid, a nonogram, a sudoku, a truth-teller board or a sequence —',
    '  machine-proven solvable and unique) ·',
    '  `word-hunt` (a letter board whose hidden words are machine-verified in it) ·',
    '  `arithmetic-grid` (a kakuro or a KenKen: the player ADDS rather than eliminates, and every',
    '  filling is machine-proven unique) ·',
    '  `interlocking-word-grid` (a crossword: you supply the answers and the clues, the machine',
    '  weaves the grid. The natural implement for a book where the reader is the character,',
    '  because every answer the reader writes is the reader supplying it).',
    '',
    '  AT LEAST HALF YOUR ENTRIES, ROUNDED UP, MUST COME FROM THE INSTRUMENTS — one of two,',
    '  two of three, two of four. This is checked and the stage fails without it. A composition',
    '  of four in which three are furniture reads as a choice and is not one: it describes what',
    '  the engine was going to print anyway. If you want the tally or the map to be a real',
    '  composed system rather than the floor everything stands on, say so in `role` and spend',
    '  one of your remaining seats on it.',
    '  Entries must be DISTINCT. `role` is a sentence in your own words: what this system',
    '  does in THIS book. "It is the map" is not a role; "the map is the only place a spend',
    '  becomes visible" is.',
    '  A declared `deduction-board`, `word-hunt`, `arithmetic-grid` or `interlocking-word-grid`',
    '  is a PROMISE the week',
    '  stages are held to: a specific week will be told it owes that grid, and will be blocked',
    '  if it does not print one. Declare the implement you actually want built.',
    '- `honestGaps` (string[]): what the brief wanted that the list above cannot print.',
    '  Write it plainly. This is not a failure — it is the record that stops a tally strip',
    '  from being described as a deck. Empty array if the brief asks for nothing missing.',
    '- `economyGraph` (array): `{ from, to, currency? }`. Named edges, never implied.',
    '  At least one edge must START at a tick origin (`markStrip:` / `session:` / `week:`)',
    '  and at least one must END at a surface the book draws. Every node must be reachable',
    '  from a source and reach a printed sink. Omit `currency` on edges that move the player',
    '  without spending anything (a key opening a gate); do not invent one.',
    '  IF YOUR ECONOMY HAS A WALLET (`banked`), EVERY PRINTING WEEK FEEDS IT BY ITS OWN',
    '  DECLARED EDGE — `{ from: "reckoning:W1", to: "banked" }`, `{ from: "reckoning:W2",',
    '  to: "banked" }`, and so on through the final week. One representative edge cannot say',
    '  which weeks pay, and every reader of this graph takes it literally: a week with no',
    '  income edge is a week the player banks nothing. The gate holds you to one edge per',
    '  printing week whenever `banked` exists. A design where some week deliberately pays',
    '  nothing is expressed WITHOUT the wallet for that flow — route that week\'s marks to a',
    '  direct sink instead — never as a silently missing edge.',
    '  THE SHAPE THAT SATISFIES THIS, and the one failure that keeps happening: a book whose',
    '  week 1 is wired and whose later weeks hang off nothing is a book with one working',
    '  economy and a pile of orphans, because reachability does not flow from week to week by',
    '  itself. EVERY week\'s surfaces must trace back to a source — its own `markStrip:W2` /',
    '  `session:W2.1` / `week:W2`, or a `banked` spend that reaches them. Walk it before you',
    '  answer: start at each tick origin, follow the edges you wrote, and confirm you can',
    '  arrive at the finale (`boss`, `assembly`, every `ending:`) — those three are written',
    '  BARE or with an id exactly as shown, and they are the nodes most often left stranded.',
    '  EVERY CLOCK THIS BOOK WILL PRINT IS READ BY AN EDGE, OR IS DECLARED AMBIENT. A later stage',
    '  writes the weeks and renders the clocks; each one it renders is checked back against this',
    '  graph, and a clock no edge names is a mute source that blocks that week — with the repair',
    '  landing HERE, not there. So name the clocks you intend the book to carry as `clock:<name>`',
    '  nodes on an economyGraph or consequenceEdges edge now. If a clock is pure world texture and',
    '  nothing reads it, that is a legitimate choice: declare it ambient by naming it in a',
    '  composition `role` or in `honestGaps`. Spell the name exactly as the weeks will print it.',
    '  AN EDGE INTO A `seal:` COMES FROM A STRICTLY EARLIER WEEK. The key is held before the lock —',
    '  a seal whose key arrives with it or after it is gated content nobody can open, and this is',
    '  checked against both the week refs and the week each fragment is scheduled for.',
    '- `consequenceEdges` (array): `{ source, answeredBy, withinWeeks }`. Every fillable',
    '  thing names the surface that answers it. `withinWeeks` is 0, 1 or 2 — 0 means the',
    '  same week. An answer further out than you declare is a blocking error, and an answer',
    '  in an EARLIER week than its question is printed before it is asked.',
    '- `decisionLedger` (array): `{ fork, differsBy }`. One row per door, `fork` written as',
    '  `door:W3`. `differsBy` must name a MECHANICAL surface that changes — a clock, a price,',
    '  a region, a gate, a table. Adjectives are not differences.',
    '- `tensionBudget` (array, one row per week): `{ week, scarce?, losable?, fallBehind? }`.',
    '  At least ONE axis named per week. Leaving an axis out is a declaration that this week',
    '  has none of it, which is a legitimate thing to say. All three empty is a week with',
    '  nothing at stake — and is rejected on every week EXCEPT a planned deload.',
    '  THE DELOAD IS THE EXHALE, NEVER FILLER. On a week the program plans as a deload, all',
    '  three axes empty is the correct answer when the training removed the pressure: the',
    '  emptiness is the declaration, and the row is still written. Never invent a scarcity a',
    '  deload does not have in order to fill the row — a fabricated axis tells the player to',
    '  feel pressure in the one week the program deliberately took it away.',
    '- `difficultyCurve` (object): `{ keyedToLoad, shape, perWeek }`. `keyedToLoad` is a',
    '  boolean: true when the puzzles harden as the lifts do, false when the brief warrants',
    '  something else. False is a real answer, not a failure — say what the curve does',
    '  instead in `shape`, and give one clause per week in `perWeek`.',
    '',
    '### The economy\'s SHAPE follows the family (choose from this menu)',
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
    '| `rivalry` | Compares. Every player gain is measured against a rival\'s standing; the economy prints BOTH sides and the gap is the state. |',
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
    '  ref the player gets stuck on — a cipher, a map, an oracle, a fragment, a seal, a clock',
    '  or a companion. Nothing else takes a ladder: `boss`, `assembly`, endings and reckonings',
    '  are ceremonies and tallies, not puzzles a player is stuck on, and the gate refuses them.',
    '  `printedOn` is where the rungs are printed — usually the',
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
    '  book must reach must be reachable on BOTH sides. One edge belongs to ONE fork: never',
    '  attribute an edge to one door while sourcing it `from` a different door — two forks cannot',
    '  both own one edge, and the simulated player would have to pick.',
    '- `price` — what a spend costs, as a whole number of MARKS, at least 1. Marks, not the currency label:',
    '  marks are what the session strips count and what the reckoning threshold is derived in,',
    '  so a price in marks is a number the machine can check against what a player at realistic',
    '  adherence will actually have. The page still says "two Relief"; this says how many marks',
    '  that is. Price the edges OUT of `banked`. Never price the edge into `boss` or `assembly`',
    '  — the endgame is a TARGET the player aims at, never a lock they buy through. WHETHER the',
    '  boss happens and the assembly completes is not for sale, and the reckoning threshold does',
    '  not gate it either: it decides WHICH ending. Price the spends that LEAD there.',
    '- `closesAtWeek` — the last week an affordance can be taken. Without one, nothing in a',
    '  pencil book ever expires and hoarding costs nothing. One or two real windows is what',
    '  makes saving a decision.',
    '',
    // D170. Both of these are soft-locks the simulated player already catches
    // AFTER assembly — which is after every prose stage has been paid for. The
    // first completed book committed both. The first now has a blocking floor
    // at this stage (a floor whose doctrine is in nobody's prompt is three
    // failed attempts and a dead run), and the second is stated here because it
    // was taught NOWHERE and caught only post-hoc.
    '### The last week is the payoff, not a tollgate',
    'The final week\'s reckoning is where the DERIVED threshold sits, and that number is a',
    'printed TARGET the player aims at — never a lock. A lifter at 60% adherence banks well',
    'under it, and this book must be finishable by that lifter. So:',
    '- NEVER draw an edge from the final week\'s reckoning into `boss`, `assembly` or a',
    '  `seal:` — with or without a price. Those decide WHETHER the book can be finished at',
    '  all, and completing the program earns the final piece of the story no matter what.',
    '  This is checked; an edge like `{ from: "reckoning:W6", to: "boss" }` is refused.',
    '- An `ending:` MAY sit behind that reckoning. Performance is allowed to shape WHICH',
    '  ending the player reaches — that is where differentiated outcomes belong. It is legal',
    '  only if at least one OTHER ending is fed from a surface the player reaches directly.',
    '  The gated ending is this book\'s high bar; it may never be its only door. A graph that',
    '  routes EVERY ending through `reckoning:W6` is refused.',
    '- Feed the endgame from what the player\'s own work reaches directly: the weekly ciphers',
    '  into `assembly`, a seal keyed weeks earlier, a component the sessions produce.',
    '- The threshold may still REWARD. `reckoning:W6` into a clock, a map region or an',
    '  optional page is exactly what the panel is for. It just may not own the whole finale.',
    '',
    '### The bank needs a counter open as long as it takes deposits',
    'If the player is still banking value in week 6 and the last thing they could SPEND it on',
    'closed in week 4, the pencil is doing work for nothing — and they can feel it. Check the',
    'two dates against each other before you finish the graph:',
    '- the last week any edge feeds `banked`, and',
    '- the last week any edge OUT of `banked` is still open (its `closesAtWeek`, or the week',
    '  the surface it buys is drawn).',
    'The second must not be earlier than the first. Give the late weeks a sink — a spend that',
    'stays open to the end, a price on something the finale wants — or move the affordances',
    'inside the window the income actually covers. A week that earns currency with nothing left',
    'to buy is a week whose strip the player stops ticking.',
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
    'No scissors, no glue, no printer, no second sheet, no other person.',
    // THE DICE ARE FUNGIBLE; THE SYSTEM IS NOT (VISION §3, ratified 2026-08-13).
    // This sentence used to read "no app, no screen" as an absolute, which
    // directly contradicted INST_RULES_TEACH twelve hundred lines down —
    // that section MANDATES the rules spread tell a player without dice to ask
    // for a d100. One of the two had to be wrong and the vision says which:
    // two d10s are the canonical INSTRUMENT, never an equipment requirement.
    // No purchase stands between a printed book and the first session.
    'ONE EXCEPTION, AND ONLY THIS ONE: the randomness source may be a screen. Two d10 are the',
    'canonical instrument, not a purchase the player must make — saying "roll a d100" to any',
    'assistant, or tapping any dice app, is the same engine and most players will play exactly',
    'that way. Everything ELSE the page asks for must be performable with the book and the',
    'pencil alone. The book itself never requires a screen; the randomness source may be one.',
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
    // THE BRIEF-TRANSCRIPTION BAN (W1, 2026-08-18). The measured failure the
    // author reads as pretension is often not invention at all: the brief's own
    // phrases come back as printed prose, so the book sounds like its own
    // pitch. A brief is a COMMISSION — the thing the prose is built to satisfy,
    // never material to quote back.
    '- Brief transcription: the brief is input, never copy. No run of six or more',
    '  consecutive words from the brief may appear verbatim in any printed prose —',
    '  not in an epigraph, a fragment, an interlude, an oracle entry or an ending.',
    '  Its ideas are yours to build; its sentences are not yours to print. A phrase',
    '  you find yourself reaching for twice is almost always the brief\'s, not the',
    '  world\'s. This one is measured.',
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
    // ── THE BAND, NOT THE CONSTANT (ratified 2026-08-18) ────────────────────
    // This was "at most ONE per ~200 words" for every book ever generated — a
    // universal constant on a taste register, which is the Height Law's defect
    // applied to prose: protective, and freezing. It is now a BAND whose
    // position is set per book by the restraint axis (VOICE_RESTRAINT_LADDER).
    // `plain` is the old constant unchanged, so a book that declares nothing is
    // written exactly as every book before this ruling was.
    '### The figurative budget (a band, set by `voiceSkeleton.restraint`)',
    'Your rate of figurative comparison or verbal turn is the position this book',
    'was assigned or earned, per 1000 words of prose:',
    '  `austere` 1 · `plain` 5 · `figured` 12 · `lush` 25',
    'If no position is declared, write at `plain` — one turn per ~200 words, which',
    'is where this book\'s budget sat before the band existed. Zero is always a',
    'legitimate outcome for any individual passage at any position.',
    'The budget is a RATE OVER PROSE, so short surfaces spend nothing: a',
    'storyPrompt (220-character budget) has no figurative allowance at any',
    'position, and a fragment body spends at most one below `figured`.',
    'A higher position never buys thinner material, shorter documents or fewer',
    'true particulars — restraint governs the SOUND of the prose, never its',
    'supply. Every universal ban above holds unchanged at every position.',
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

  // ── THE VOICE SKELETON (the voice die, ratified 2026-08-17; landed W3) ───
  // THE TAUGHT HALF of the five voice identity axes. The die draws one value on
  // each and hands them to this stage as GIVENS (formatSeedAssignmentBlock);
  // this section is what tells the model what an assignment on these axes MEANS
  // and where the answer is written down. The D136/D149 two-halves idiom: the
  // floor that reads `meta.narrativeVoice.voiceSkeleton` and the sentences that
  // teach it land together, and neither is allowed to move alone
  // (floorTeachingRegistry + voiceSkeletonMenuParity in validate.mjs).
  //
  // STRUCTURE, NEVER FLAVOR — stated to the model in those words, because the
  // failure mode of a voice die is a model that reads it as a mood board and
  // produces pastiche. Genre stays brief-funded.
  window.INST_VOICE_SKELETON = [
    '## The voice skeleton (meta.narrativeVoice.voiceSkeleton)',
    'Your default prose hand is the same hand in every book you write. That is',
    'the one thing this book cannot be. The five choices below are the SKELETON',
    'of the narrating voice — shapes the hand makes, not moods it has — and this',
    'book\'s are assigned to it, the way its shell and its board are.',
    '',
    'Write all five under `meta.narrativeVoice.voiceSkeleton`:',
    '- `person`: first-singular | first-plural | second | third-close | document-voice',
    '  Who narrates and how close. `document-voice` means no narrator at all —',
    '  the prose is only what its documents would say.',
    '- `sentenceRegime`: clipped | measured | long-breath | tidal',
    '  `clipped` is short declaratives. `measured` is a middle band held steady.',
    '  `long-breath` builds through subordinate clauses. `tidal` ALTERNATES on',
    '  purpose — a long build, then a short break — which is a different hand',
    '  from `measured`, not a louder one.',
    '- `fragmentLicense`: forbidden | sparing | habitual',
    '  `forbidden` means every sentence carries a verb. `sparing` allows',
    '  fragments only at stress points. `habitual` makes the fragment this',
    '  hand\'s signature.',
    '- `punctuationSignature`: dash-hand | semicolon-hand | colon-hand | parenthetical-hand | bare-hand',
    '  The joint this hand uses, with the others kept rare. `bare-hand` is',
    '  commas and periods only, and it is a hand — not the absence of one.',
    '- `paragraphRegime`: single-breath | standard | massed',
    '  `single-breath` is 1-2 sentence paragraphs, white space as pacing.',
    '  `standard` is 3-5. `massed` is long blocks where density is the texture.',
    // ── V6, THE RESTRAINT BAND (ratified 2026-08-18) ─────────────────────────
    // The band's numbers are VOICE_RESTRAINT_LADDER in contract-constants.mjs
    // and are parity-asserted against this table both directions (D124), so a
    // rate moved on one side alone fails the build.
    '- `restraint`: austere | plain | figured | lush',
    '  HOW OFTEN this book turns a phrase, as figurative turns per 1000 words of',
    '  prose. `austere` is 1 — the plainest register the form has. `plain` is 5,',
    '  which is one turn per ~200 words. `figured` is 12. `lush` is 25, and it is',
    '  a real position, not a warning: a brief whose whole register is figurative',
    '  excess is written here and nowhere else.',
    '  This axis is an ORDINAL SCALE, low to high. It sets a rate, never a mood.',
    '',
    '### Restraint governs the sound of the prose, never its supply',
    'A high position buys MORE TURNS. It does not buy thinner material, shorter',
    'documents, vaguer particulars or fewer true facts. Every budget, every count',
    'and every knowing demand is unchanged at `lush`; what changes is how often',
    'the prose is allowed to reach. A book that answers a rich brief with less',
    'writing has failed it in the opposite direction.',
    '',
    '### The ban list is NOT in the band',
    'Every universal machine-tell stays banned at every position, `lush` included.',
    'There is no genre exception, no licence and no budget that reaches them. The',
    'ban list is exactly what makes a high position writable without slop: it',
    'removes the moves that are pastiche in ANY register, so a figurative book is',
    'figurative in its own hand instead of in the default one.',
    '',
    '### This binds the NARRATOR only',
    'In-world writers still differ from the narrator and from each other, and a',
    'found document keeps its own dress. A government form is not written in',
    '`tidal` because the narrator is. The skeleton is the hand that writes the',
    'book AROUND the documents.',
    '',
    '### These are structure, never flavor',
    'None of these values names a mood, a lexicon, an image palette or a genre.',
    'Do not translate them into any of those. Genre and texture come from the',
    'creative brief and from nowhere else; a skeleton dressed as a mood is',
    'pastiche with a die roll on it.',
    '',
    '### If you depart from an assignment, NAME THE VALUE YOU TOOK',
    'Taking the assignment needs no argument — the assignment IS the reason.',
    'Departing needs one sentence in `meta.narrativeVoice.voiceRationale` that',
    'writes the ASSIGNED value out in full and says what this book does instead',
    'and why the brief required it. A choice that is neither the assignment nor',
    'a brief-quoted departure is a DEFAULT, and a default is what this die',
    'exists to remove. Silence is not a third option: an assignment must be',
    'ANSWERED, adopted or declined in writing.',
    ''
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

  // ── THE SETTLEMENT DOCTRINE (author directive, 2026-08-18) ───────────────
  // ONE SECTION, TWO SEATS, because it is one rule: the shell seat CHOOSES the
  // mode and the ending seat SETTLES in it. Splitting it would put the menu in
  // two homes (D93) and let the two halves drift into a book whose finale
  // conforms to a mode nothing assigned.
  //
  // OFF the ceiling-bound single-prompt bundle by the SHELL_CHOICE/
  // DESIGN_LANGUAGE precedent (D139/D144) — stage-routed only.
  window.INST_ENDING_SETTLEMENT = [
    '## The Settlement',
    '- The sealed ending is the most expensive content in this book. The reader pays weeks of',
    '  real training for the password that opens it. Write it as the SETTLEMENT of every debt',
    '  the book incurred, not as a summary of what happened.',
    '- Settling a debt means: resolving a question the story left open, landing the consequence',
    '  of the darkest moment, or saying out loud what the fragments only implied.',
    '',
    '### THE FINISHER TEST',
    '- An ending a non-player could enjoy equally has paid off nothing. If a stranger who never',
    '  trained, never marked a strip and never decoded a fragment would get the same thing from',
    '  this page that the player gets, then nothing on it was bought with the weeks. Rewrite it.',
    '- Multiple endings must differ in WHAT THEY SETTLE, never in flavour. Two endings that pay',
    '  the same debts in different adjectives are one ending printed twice.',
    '',
    '### THE MODE — choose it, do not default to it',
    '- `meta.artifactIntent.endingMode` is one of: `revelation` | `twist` | `ambiguous-by-design`.',
    '- Settlement must never read as tidy resolution. A twist is settlement\'s MOST DEMANDING',
    '  form: it pays debts the reader did not know they held, and it needs evidence seeded',
    '  earlier in the book to invert. An inversion with nothing planted behind it is a',
    '  retraction, not a reversal.',
    '- AND THE OTHER DIRECTION, which matters exactly as much: not every story should end in a',
    '  twist. All-twist is sameness wearing a dramatic hat. A plain, fully-earned revelation',
    '  CHOSEN ON PURPOSE is exactly as designed as an inversion. `ambiguous-by-design` is a',
    '  third real answer, not a way of declining to decide.',
    '- So the mode is brief-funded or die-assigned, never a habit. Whichever you take, the',
    '  ending conforms to the mode the book declared — you are checked against your OWN',
    '  declaration, not against a house preference.',
    '',
    '### THE SETTLEMENT DECLARATION (`settlement` on every ending object)',
    '- Every ending declares a `settlement`: `{ mode, debts[] }`. It is NOT printed — it is your',
    '  statement of what this ending spent, the way the play spine states what the book built.',
    '- `mode` repeats the book\'s declared ending mode.',
    '- `debts` names 2-6 things this ending settles. Each debt is',
    '  `{ owed, disposition, how }` (plus `seededAt` when inverting):',
    '  * `owed` — a SURFACE REF naming what the book already printed and left owing:',
    '    `fragment:F.03`, `clock:<clock name>`, `week:W4`, `session:W4.2`, `boss`, `banked`.',
    '    Same grammar as the spine\'s refs — week and session refs are `W<n>`, never bare numbers.',
    '    A debt naming nothing this book prints is a debt the book never incurred.',
    '  * `disposition` — `paid` (the ending gives what was owed) | `transformed` (the ending',
    '    changes what it meant) | `inverted` (what the reader thought they held, they did not).',
    '    A promise must be ADDRESSED, never merely answered in one direction — `transformed`',
    '    and `inverted` settle a debt as truly as `paid` does.',
    '  * `how` — one sentence, concrete, in the book\'s own nouns.',
    '  * `seededAt` — REQUIRED on every `inverted` debt: the surface ref where you planted the',
    '    evidence that makes the inversion land. This is the twist\'s cost of entry.',
    '- If you declared `twist`, at least one debt must be `inverted`. If you declared',
    '  `revelation` or `ambiguous-by-design`, inversions are allowed but never required.'
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

  // ── The shell's own last pass (D158) ────────────────────────────────────
  // INST_SELF_VERIFICATION below is routed to week-final / fragment / ending,
  // and every line in it is about CONTENT. The shell stage — which declares
  // the whole play spine and every identity axis, and is the most
  // cross-reference-dense stage in the pipeline — had no final pass at all.
  // It showed: the author's first book failed the shell gate three times on
  // three DIFFERENT cross-references (an unfed economy half, then unanswered
  // milestones), each a rule the doctrine states plainly and the model
  // satisfied everywhere except one place.
  //
  // These are not new rules. Every line is a floor that already blocks, written
  // as a question to ask BEFORE answering — because the expensive failure is
  // not being told a law, it is a whole 32,000-token payload thrown away over
  // one missing edge. Shell + skeleton only (the two compiler seats); the
  // ceiling-bound paste path is untouched.
  window.INST_SHELL_SELF_CHECK = [
    '## Before you answer: walk your own spine',
    'Every line below is a gate that will REJECT this payload. They are cheap to check now',
    'and expensive to miss — a single unwired edge costs the whole answer.',
    '',
    '1. WALK THE ECONOMY. Start at each tick origin (`markStrip:` / `session:` / `week:`) and',
    '   follow your `economyGraph` edges. Can you REACH every node you named — including the',
    '   later weeks, `boss`, `assembly`, and every `ending:`? Reachability does not flow from',
    '   week to week by itself: week 3 content wired to nothing is an orphan even when week 1',
    '   is perfect. Then walk it backwards: does every node reach a surface the book PRINTS?',
    '2. ANSWER EVERY PROMISE. For each `milestones[].unlocks`, is there a `consequenceEdges`',
    '   row that mentions that same ref? A theory the book never answers is an unpaid promise.',
    '3. PRICE EVERY DOOR — count them, do not eyeball them. If the `mechanicGrammarFamily` you',
    '   declared is one of the eight pressure families (Step 5c), walk the week list you are',
    '   working from — the GIVEN block in this prompt if you were handed one, otherwise the',
    '   `weekPlan` you just wrote — and name every week that is neither the boss week nor a',
    '   deload. EACH of those weeks prints a door, and EACH owes its OWN `decisionLedger` row,',
    '   written `door:W3`, naming a MECHANICAL difference — a clock, a price, a region, a gate.',
    '   Then count your rows against that list. One week short is a rejected payload, and it is',
    '   the most common way this stage fails.',
    '4. ONE ROW PER WEEK. Does `tensionBudget` have a row for every week in the book?',
    '5. BUILD WHAT YOU DECLARED. Every `harvestPatterns` entry must be built where it claims:',
    '   declaring `found-not-found-gating` obliges the gate to exist in the economy.',
    '6. ANSWER EVERY ASSIGNMENT. Each identity axis is either transcribed exactly as assigned,',
    '   or declined in its evidence field with the assignment named and a reason from the brief.',
    '   Silence on an assigned axis is the one answer that is never accepted.',
    '7. DISTINCT COMPOSITION. Two to four entries, no repeats, each with a role written in your',
    '   own words about THIS book.',
    '',
    'If any check fails, FIX IT NOW rather than emitting and hoping. You cannot see the',
    'validator; these seven questions are what it is going to ask.'
  ];

  // ── SCOPED TO THE STAGES THAT ACTUALLY RUN IT (2026-08-17) ───────────────
  // ROUTING: `week-final`, `fragment`, `ending` — three UNIT stages. Each is
  // handed one week, one batch of documents, or one ending, and each returns
  // exactly that. It never sees the assembled booklet.
  //
  // Five checks were deleted here, not reworded, because there is no longer any
  // surface where they are true. They were BOOK-LEVEL cardinality and
  // TOOLING-OWNED meta fields:
  //   meta.weekCount === weeks.length          — `weeks` does not exist at a unit stage
  //   meta.totalSessions equals the total       — same, and SCHEMA_META forbids
  //   exactly one boss week exists and is final — a unit cannot count the book
  //   theme.visualArchetype is a supported value — authored at the identity stage
  // Normalization owns weekCount/totalSessions and auto-fixes them (D21), so
  // even a stage that COULD emit them is told not to. They survived because the
  // retired single-prompt bundle wrote the whole booklet in one call and they
  // were true there; that surface is gone, and a check nobody can run teaches a
  // model that this list is decorative — which is how the checks that DO bind
  // get skimmed.
  window.INST_SELF_VERIFICATION = [
    '## Final Self-Verification',
    'Every line below is about the unit you are writing NOW — this week, these documents, this',
    'ending. Check them against your own output before you emit it.',
    '- weeklyComponent.type matches the weeklyComponentType you were given, on a non-boss week',
    '- if this week is the midpoint, it carries the book\'s one binaryChoice; if it is not, it carries none',
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
    // BRANCHED FOR THE LIGHT BRIEF (the D135 class). The flat demand for four
    // layers is an unbranched conjunctive mandate on a doctrine surface that
    // reaches every brief class — and INST_ENVIRONMENT, twelve hundred lines
    // up, explicitly licenses two layers for a light or comedic brief. A model
    // reading both obeys the one that sounds like a check.
    '- the setting carries the layer depth this brief warrants — four (public, working, hidden, historical) for a complex or serious brief, three for a medium one, two for a light, comedic or simple one. Forcing institutional depth a light brief did not ask for is a failure, not thoroughness',
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

  // INST_QUALITY_STANDARD deleted (author-ruled 2026-08-18, DR-39/D203's
  // proposal): both demands already live at the printing stages —
  // INST_ANTI_GENERIC carries the transplant test and the self-verification
  // block restates it. Routing would have paid prompt budget to say it twice.

  window.INST_RULES_TEACH = [
    '## Rules Page Requirements',
    'The rulesSpread leftPage MUST teach the player how to play the game.',
    'It is NOT diegetic flavor or institutional worldbuilding — it is procedural instruction.',
    'Required sections (minimum 4):',
    '- Play cadence: what the player does each training session (workout -> oracle pull -> execute consequences -> read fragment -> mark board)',
    '- Map/board usage: how to annotate, what marks mean, when to update',
    // Re-voiced to VISION §3's own words (2026-08-17). The old line named one
    // vendor ("Google roll d100"), which reads as a product instruction inside
    // the fiction and is narrower than the ratified law: ANY assistant or app
    // is the same engine. The play-kit section above now carries the matching
    // exception, so the two surfaces teach one rule instead of contradicting.
    '- Oracle access: what triggers a pull, how to read results, how to execute consequence tags. Include, in the world\'s own voice: all oracle tables use d100 — no dice? say "roll a d100" to any assistant, or tap any dice app.',
    '- Clocks/trackers: what they are, when they advance, what happens when they fill or empty',
    'If the booklet carries a `percentile-stat` companion, one section MUST also teach it, in the world\'s own voice:',
    '- circle this week\'s value on the stat box before you roll',
    '- roll under it on the oracle d100 and read the entry one band above the one you rolled',
    '- complete every prescribed set in the session before rolling and you may re-roll once — the only thing training changes is your standing, never the sets themselves',
    'The rightPage contains the password/convergence tracker and unlock instructions.',
    'Both pages must be comprehensible to a player who has never seen the booklet before.',
    '',
    // ── THE REGISTER SPLIT (W1, 2026-08-18) ──────────────────────────────────
    // Not new doctrine: PLAY.md's rules-block law already reads "flat voice,
    // designed form (VISION §4.2)" and INST_VOICE_DISCIPLINE already exempts
    // this surface from the fiction's register. What was missing is the DEMAND
    // — the exemption told the model flatness was permitted here; nothing told
    // it flatness was required. The author's verdict on the first delivered
    // book was "most of the time I don't know what is being said... I still
    // don't know how to play the game."
    '### The register of this page: flat, not literary',
    'This is the one surface where the book stops performing and starts instructing. It is',
    'law, not permission (PLAY.md, the rules-block register: FLAT VOICE, DESIGNED FORM):',
    '- Second person, present tense, imperative. "Roll two d10." Never "one rolls", never',
    '  "the initiate may find that rolling is called for".',
    '- One instruction per sentence. A sentence that carries two steps is two sentences.',
    '- Concrete nouns the player can point at on a page: the box, the strip, the row, the',
    '  circle, the table. Never "the apparatus", "the working", "the observance".',
    '- DEFINE EVERY GAME TERM AT FIRST USE, in the same breath, in ordinary words. "Spend a',
    '  Tally — a Tally is one filled box on the strip at the foot of a session card."',
    '  A world-word used in a teaching sentence and defined nowhere on this page is the',
    '  defect this section exists to stop: the player reads a rule they cannot perform.',
    '- No metaphor, no atmosphere, no withholding. The fiction is everywhere else in this',
    '  book; here the reader is a stranger holding a pencil who wants to start.',
    '',
    '### PRINT THE GAME\'S OWN WORDS ON THIS PAGE',
    'The rulebook you were given above names the currency and the three-to-five core verbs.',
    'Those exact words MUST appear in the rules teaching, spelled the way the rulebook',
    'spells them. A player taught "Favour" and then shown "Marks" for every week of the',
    'block has been taught nothing; a player never shown a verb never performs it. Checked.',
    '',
    // ── THE ESTABLISHMENT SURFACE (W1, 2026-08-18) ───────────────────────────
    // The other half of "I don't know what is being said": the book opens in
    // medias res into a world with no situation and no named people, and the
    // rules page teaches procedure against a fiction the reader has not been
    // given. Orientation is where the reader is told, in plain words, what is
    // happening and who is in it — before the first document performs.
    '### rulesSpread.orientation — who and what, in plain words',
    'Before the procedure, establish the situation. This is NOT a teaser and NOT atmosphere:',
    'it is the paragraph a reader needs to understand every document that follows.',
    '- `situation` (string, 2-6 sentences, 200-700 characters): what is happening here, in',
    '  plain words, in the present tense. Where we are, what has gone wrong or is at stake,',
    '  and what the reader is doing about it over the coming weeks. A stranger who reads',
    '  only this paragraph can follow the whole book. Withhold the ANSWERS, never the SETUP.',
    '- `cast` (array, 3-8 items): the people, offices or bodies named in this book.',
    '  Each item: { `name` (as it is printed everywhere else in the book), `role` (2-6',
    '  words, what they are), `note` (optional, at most 12 words: what they want, or what',
    '  they are hiding) }. Every in-world author of a document belongs here. Names must',
    '  match the spelling used in the weeks and fragments exactly.',
    '',
    // ── THE DISCLOSURE LAW (author ruling, 2026-08-18) ───────────────────────
    // The delivered book's rightPage.instruction walked the player through
    // every glyph's location AND method on page four — duplicating the
    // point-of-use instructions the week pages already carry. The author: "it
    // gives too much information."
    '### rulesSpread.rightPage.instruction — a MANIFEST, never a walkthrough',
    'The file posts WHAT is to be found and WHEN. The week posts WHERE and HOW.',
    'The tracker page states the SHAPE of the collection and nothing more: how many boxes',
    'there are, that one is filled per week, and what happens once they are all filled.',
    '- LEGAL: "One box per week, one for every week of the block. Fill each at that week\'s',
    '  close. When they are all filled, convert them on the boss page and write the word in',
    '  the final row."',
    '- NOT LEGAL: addressing the boxes one at a time and hanging a source on each — e.g.',
    '  "box 1 from fragment F.03 in week one, box 2 from the cipher grid once the date is',
    '  decoded, box 3 from any row of the week-three oracle...". That is a walkthrough. It',
    '  spends the discovery of the whole block on the rules page, and it repeats instructions',
    '  the week pages already give at the moment they are usable.',
    'You may name a count. You may say one per week. You may NOT tell the player, up front,',
    'which surface each individual box comes from or what must be done to read it. Naming',
    'three or more boxes individually on this page is a blocking error.',
    'The METHOD lives at point of use, on the week that owns it — where the player is',
    'standing when they need it, and nowhere earlier.'
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
  //   (W4a), POINT_OF_USE / RETURN_LOOP / DOOR_BIAS (Teeth), SHELL_CHOICE (D144),
  //   GAME_RULEBOOK + ARSENAL (D173 / D217 W2 — the paste path has no rulebook
  //   stage at all). This roster is a hand-kept convenience, NOT the reader:
  //   `promptSectionReachability()` in validate.mjs is what fails a build on an
  //   unrouted section. The original arithmetic — the paste path hard against a
  //   115,000-character ceiling — retired with the paste door itself (D189); the
  //   live reason a stage-only section stays off the bundle is that no product
  //   path builds the bundle, and doctrine belongs at the seat that can obey it.
  // - NEVER put schema or instruction content in generator.js or api-generator.js.

  var STAGE_SCHEMA_MAP = {
    // ── THE RULEBOOK: the first authored stage on both API pipelines (D173) ──
    // It carries the ref grammar (its companions point at surfaces), the play
    // kit (it is designing for a pencil and two d10s and must not design past
    // them), the brief-fidelity law (a game designed for a different brief
    // mis-funds every stage downstream of it, the knowing's argument one level
    // up), and its own doctrine. NOTHING ELSE, on D128's rule: this stage
    // authors no prose, no theme, no weeks and no meta, so VOICE_DISCIPLINE,
    // OUTPUT_BUDGETS and CONTRACT_GUARDRAILS would all be false at it — and a
    // section routed to a stage it is false at teaches the model that this
    // prompt's rules may not apply to the shape in front of it.
    //
    // THE PLAY KIT IS STATED INLINE rather than routed, and that is the same
    // ruling INST_ARTIFACT_COMPILER Step 11 carries for the paste path: the kit
    // lives inside INST_VOICE_DISCIPLINE, which is a PROSE section this stage
    // writes none of. Routing the whole section to import one constraint is the
    // D128 defect; restating the constraint where it binds is not, and the
    // floors row asserts the kit reaches this stage either way.
    //
    // AMENDED (D217 W2, author directive 2026-08-18): doctrine-minimal PLUS THE
    // SHELF. The arsenal audit measured this seat and found ZERO of the 22
    // composable implements named at it — the whole shelf was taught one stage
    // later, at `shell`, after the rules were already written. A designer
    // unshown the shelf designs the default game (VISION §12: an acceptance set
    // the prompts never show is not a menu, it is a default generator). ARSENAL
    // is FIRST in the list on purpose: its own text says to read the shelf
    // before answering the eight questions, and §22e pins that ordering so the
    // sentence cannot become false by a reorder. It is the ONE addition — D128's
    // negatives above are unchanged and still asserted.
    'game-rulebook':  { schemas: ['GAME_RULEBOOK'],                             instructions: ['ARSENAL', 'GAME_RULEBOOK', 'SURFACE_REFS', 'BRIEF_FIDELITY'] },
    // ── The economy graph's week axis (§4.11) ──────────────────────────────
    // Doctrine-minimal on D128's rule, and the negatives are the same ones the
    // rulebook seat carries: this stage authors no prose, no theme, no weeks and
    // no meta, so VOICE_DISCIPLINE, OUTPUT_BUDGETS and CONTRACT_GUARDRAILS would
    // all be FALSE at it. SURFACE_REFS is the one import and it is load-bearing
    // rather than habitual: every edge this stage copies is a pair of surface
    // refs, and a stage that re-emits a grammar it was never taught will
    // normalise `clock:Root Clock` into something the floors no longer resolve.
    'economy-graph':  { schemas: ['ECONOMY_GRAPH'],                             instructions: ['ECONOMY_GRAPH', 'SURFACE_REFS'] },
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
    // ARRANGEMENT rides directly behind DESIGN_LANGUAGE, and the adjacency is
    // load-bearing rather than tidy: they are one sitting of the same decision.
    // The design language is what this object is printed LIKE; the arrangement
    // is how its page is PUT TOGETHER (VISION §8: layout IS the identity), and
    // a model that fixes the press and then composes the page in a different
    // sitting writes two objects. Same stage-only ruling, same reason.
    //
    // ── THE SHELL SPLIT (four sub-stages) ────────────────────────────────
    // Everything above stays true; it is now distributed rather than bundled.
    // The `'shell'` row below is the UNION and the GUIDED WIZARD'S row: that
    // door still authors the whole shell in one prompt (author ruling — the
    // wizard is untouched by this split), and `generateShellPrompt` reads this
    // row. The API/bridge pipeline reads the four sub-stage rows instead.
    //
    // THE UNION IS GATED, NOT MAINTAINED. `shellSplitRoutingParity()` in
    // scripts/validate.mjs fails the build when the four sub-rows and this row
    // stop being the same two sets — otherwise doctrine could quietly come to
    // live on the wizard path alone while `promptSectionReachability()` still
    // reported it ROUTED, which is the vacuity this split could have bought.
    //
    // WHAT MOVED WHERE, and why each is true at its seat (D128's law — a
    // section routed to a stage it is FALSE at teaches the model that this
    // prompt's rules may not apply to the shape in front of it):
    //   · shellIdentity — SCHEMA_META and the compiler. This is the seat that
    //     runs INST_ARTIFACT_COMPILER's steps, so SHELL_CHOICE (Steps 7/7a/9),
    //     CONVERGENCE_DESIGN (Step 6) and ENDING_SETTLEMENT ride with it, and
    //     MARK_SURFACE rides because `meta.economy` is authored here.
    //   · shellRules — cover + rulesSpread. RULES_TEACH is the whole reason
    //     the seat exists; VOICE_DISCIPLINE because the rules page is the
    //     first prose a reader meets and carries the play kit.
    //   · shellTheme — theme, designLanguage and arrangement, which the
    //     paragraphs above call ONE SITTING of one decision. Splitting them
    //     across sub-stages would have made two objects out of one press;
    //     they move together or not at all. (This is the one place the round's
    //     own cut was corrected on contact: `meta.designLanguage` was briefed
    //     into the identity block, which would have separated it from both the
    //     archetype it is composed onto and the arrangement it is one sitting
    //     with.)
    //   · shellSpine — `meta.playSpine`. LUDIC_SPINE and SURFACE_REFS (every
    //     spine edge is a pair of refs) and SHELL_SELF_CHECK, whose seven
    //     questions are all spine questions.
    // SEED_ASSIGNMENT rides identity and theme — the TWO seats IDENTITY_AXES
    // says author an axis. shellRules and shellSpine author none and are
    // therefore handed no assignments and told no assignment law: D149's own
    // trap read from the other end. (The spine's two axes sit at the identity
    // seat because that is where their EVIDENCE field is written — the compiler
    // declares, the spine builds; see IDENTITY_AXES' own note.)
    'shell':          { schemas: ['META', 'THEME', 'DESIGN_LANGUAGE', 'ARRANGEMENT', 'COVER_RULES'],              instructions: ['BRIEF_INTERPRETATION', 'BRIEF_FIDELITY', 'ARTIFACT_COMPILER', 'SHELL_CHOICE', 'SEED_ASSIGNMENT', 'SURFACE_REFS', 'LUDIC_SPINE', 'CONVERGENCE_DESIGN', 'ENDING_SETTLEMENT', 'WORLD_CONTRACT', 'VOICE_DISCIPLINE', 'STORY_ENGINE', 'ENVIRONMENT', 'CHARACTER_WEB', 'MARK_SURFACE', 'VOICE_SKELETON', 'RULES_TEACH', 'VISUAL_DIRECTION', 'DESIGN_LANGUAGE', 'ARRANGEMENT', 'OUTPUT_RULES', 'OUTPUT_BUDGETS', 'CONTRACT_GUARDRAILS', 'STRUCTURAL_RULES', 'SHELL_SELF_CHECK'] },
    'shellIdentity':  { schemas: ['META'],                                                                        instructions: ['BRIEF_INTERPRETATION', 'BRIEF_FIDELITY', 'ARTIFACT_COMPILER', 'SHELL_CHOICE', 'SEED_ASSIGNMENT', 'CONVERGENCE_DESIGN', 'ENDING_SETTLEMENT', 'WORLD_CONTRACT', 'VOICE_DISCIPLINE', 'STORY_ENGINE', 'ENVIRONMENT', 'CHARACTER_WEB', 'MARK_SURFACE', 'VOICE_SKELETON', 'OUTPUT_RULES', 'OUTPUT_BUDGETS', 'CONTRACT_GUARDRAILS'] },
    'shellRules':     { schemas: ['COVER_RULES'],                                                                 instructions: ['BRIEF_FIDELITY', 'RULES_TEACH', 'VOICE_DISCIPLINE', 'OUTPUT_RULES', 'OUTPUT_BUDGETS', 'STRUCTURAL_RULES'] },
    'shellTheme':     { schemas: ['THEME', 'DESIGN_LANGUAGE', 'ARRANGEMENT'],                                     instructions: ['BRIEF_INTERPRETATION', 'BRIEF_FIDELITY', 'SEED_ASSIGNMENT', 'VISUAL_DIRECTION', 'DESIGN_LANGUAGE', 'ARRANGEMENT', 'OUTPUT_RULES', 'CONTRACT_GUARDRAILS'] },
    'shellSpine':     { schemas: [],                                                                              instructions: ['BRIEF_FIDELITY', 'SURFACE_REFS', 'LUDIC_SPINE', 'VOICE_DISCIPLINE', 'OUTPUT_RULES', 'OUTPUT_BUDGETS', 'SHELL_SELF_CHECK'] },
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
    // The output shape is a SCHEMA row here (DR-39) and not a hand-written
    // block in the builder: the shape the stage must emit is derived from
    // SCHEMA_CANONICAL_WORKOUT, the same object whose field names
    // normalizeCanonicalWorkout() maps. Routing it is what makes that object
    // the taught shape instead of a second, unread description of it.
    'canonicalize':   { schemas: ['CANONICAL_WORKOUT_SPEC'],                    instructions: ['LIFTOSCRIPT_GRAMMAR'] },
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
    'ending':         { schemas: ['SINGLE_ENDING'],                             instructions: ['ENDING_STANDARD', 'ENDING_SETTLEMENT', 'CONVERGENCE_DESIGN', 'VOICE_DISCIPLINE', 'LAYERED_ARC', 'ANTI_GENERIC', 'OUTPUT_RULES', 'OUTPUT_BUDGETS', 'SELF_VERIFICATION'] },
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
      // `sessionRef` dropped 2026-08-17: no schema on either pipeline has ever
      // carried that key, so the model was told to emit a field that does not
      // exist. (The only `sessionRef` in the tree is a local variable in
      // validation.js about session.fragmentRef — a different relation entirely.)
      '- Each entry: { id, title, documentType, author, revealPurpose, clueFunction, weekRef }.',
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
      '  "designSpec": { "paperTone": "string", "primaryTypeface": "string" },',
      // THE WIRE SLOT for the settlement declaration. A prose demand with no
      // slot in the shape the model is told to return is the W5a defect: the
      // seat is asked for a field its output schema never mentions, and the
      // floor then blocks a model that answered the schema it was given.
      '  "settlement": { "mode": "revelation | twist | ambiguous-by-design",',
      '                  "debts": [ { "owed": "surface ref, e.g. fragment:F.03",',
      '                               "disposition": "paid | transformed | inverted",',
      '                               "how": "one sentence",',
      '                               "seededAt": "surface ref — REQUIRED when inverted" } ] } }',
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
      '  "designSpec": { "paperTone": "string", "primaryTypeface": "string" },',
      // THE WIRE SLOT for the settlement declaration. A prose demand with no
      // slot in the shape the model is told to return is the W5a defect: the
      // seat is asked for a field its output schema never mentions, and the
      // floor then blocks a model that answered the schema it was given.
      '  "settlement": { "mode": "revelation | twist | ambiguous-by-design",',
      '                  "debts": [ { "owed": "surface ref, e.g. fragment:F.03",',
      '                               "disposition": "paid | transformed | inverted",',
      '                               "how": "one sentence",',
      '                               "seededAt": "surface ref — REQUIRED when inverted" } ] } }',
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
    '## The Rubric — eleven dimensions, graded 0-100',
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
    'decorate because it has nothing true to select from?',
    '',
    '## The Gameplay-Excellence Axes — read this before grading the last three',
    'The eight dimensions above grade the composition. The three below grade the GAME, and',
    'they are graded against a different question: not "is this book well-formed" but "would a',
    'person who plays games call this designed". The machine validator has already proved this',
    'booklet is well-formed — schema, references, completion, no soft-locks. NONE of that is',
    'evidence on these three dimensions, and citing it is a scoring error.',
    'THE STANDARD, stated once and binding on all three: a booklet that passes every automated',
    'floor cleanly can score 40 here, and often should. Valid every time is exactly what a',
    'template produces. If you find yourself scoring one of these high because nothing is',
    'broken, you have graded validity again — start over and grade the play.',
    '',
    '### decisionWeight',
    'The player\'s forks, graded as DECISIONS rather than as wiring. `systemIntegration` above',
    'already asks whether a fork touches board state on both sides; do not re-grade that here.',
    'This dimension asks whether a correctly-wired fork is a choice a person would stop and',
    'think about.',
    'THE FLAVOUR-SWAP TEST, the primary instrument: take a binary choice, door, or spend and',
    'mentally SWAP the two options\' flavour text while leaving every mechanical cost, grant and',
    'consequence exactly as printed. Would a rational player\'s pick change? If it would not,',
    'the fork is flavour with a die attached. Grade it inert and cite both options.',
    'NO DOMINANT OPTION: is one side strictly better with nothing real given up? A cost that is',
    'only a sentence — not a printed mark, spend, or closed route — is not a cost. Name the',
    'option and the cost that is missing.',
    'DISCERNIBLE: once the player commits, does a NAMED thing on a printed surface differ — a',
    'mark, a track position, a route, a page they may now open? A consequence the player cannot',
    'point at did not happen, however faithfully the JSON records it.',
    'INTEGRATED: does the consequence reappear LATER — a week later, not in the next sentence?',
    'A fork that resolves and is never mentioned again is a dead end however well it is wired.',
    'AUTONOMY: does a roll immediately overwrite what the player just chose? Dice may govern',
    'DEGREE, cost, or flavour; a die that decides the very thing the player was asked to decide',
    'converts a choice into an instruction, and it reads as imposed even when the graph is',
    'correct. Cite the fork and the roll that erases it.',
    'WHAT A FAILURE LOOKS LIKE ON A CLEAN BOOK: every clock resolves, every ref binds, every',
    'week offers a choice — and every choice is two flavours of the same cost. "A choice is',
    'present" is a validity property; "the choice is worth making" is not.',
    '',
    '### masteryCurve',
    'The shape of the DEMAND across the whole program, and whether anything is ever lost.',
    '`fusionPacing` grades how loudly each week SPEAKS against its training load; this grades',
    'what each week ASKS. A book can be perfectly counterpointed in prose and mechanically flat.',
    'STALENESS: describe what the player weighs in a session in week 1, then what they weigh in',
    'the last non-boss week. If those two descriptions are the same sentence, the mechanic was',
    'fully learned in week 1 and has been repeated ever since — dozens of repetitions of a',
    'pattern with nothing left to master. Grade that as inert and name both weeks.',
    'ESCALATION AGAINST THE REAL PROGRAM: does the demand rise with the TRAINING LOAD the',
    'measured frame reports — more to track, tighter thresholds, harder choices as the body',
    'gets stronger — or on an arbitrary curve of its own, or not at all? The player is',
    'measurably improving in the gym. A book whose difficulty ignores that is out of step with',
    'the clock it claims to run on. Cite weeks by number and load index.',
    'COMPETENCE: does anything COMPOUND — a track, a stat, a route, a standing licence — so a',
    'late session is measurably easier, wider, or more capable than an early one? If session 1',
    'and the last session are mechanically indistinguishable to the player, the book has',
    'recorded the program without ever registering that the person changed.',
    'ATTRITION: does at least one mechanism take something AWAY — crossed out, spent, lost,',
    'downgraded — or does every track only ever fill? Pure accumulation is a generator\'s',
    'default, and a book where nothing can be lost has no stakes it can print. Name the loss',
    'channel, or state plainly that the book has none.',
    'WHAT A FAILURE LOOKS LIKE ON A CLEAN BOOK: every clock legal, every threshold reachable,',
    'every week complete — and an identical flat demand for the whole block, with no cost',
    'channel anywhere in the book. The validator says yes to all of that.',
    '',
    '### authoredMechanism',
    'Whether this mechanic set was designed FOR this brief, or filled into a template that',
    'would have accepted any brief. `worldCohesion` asks whether the NOUNS come from the world',
    'contract; this asks whether the SHAPES do.',
    'THE MAD LIBS TEST, the primary instrument: strip every proper noun and themed word from',
    'the book\'s mechanics and describe what is left as pure shape — what goes in, what',
    'transforms it, what comes out. Now re-skin that shape with a different archetype\'s',
    'vocabulary. Would anyone notice it was a different book? If the shape survives the swap',
    'unchanged, it is filler wearing this brief\'s words. Cite the mechanic and write out the',
    'shape you extracted, so the claim can be checked.',
    'CONSONANCE EARNED, NOT LOOKED UP: the brief\'s own words must earn the mechanic, or the die',
    'assigned it and the book says why. A mechanic paired to its theme by obvious convention',
    '(urgency, therefore a drain clock) with nothing anywhere stating what in THIS brief chose',
    'it, is a table lookup rather than a design decision. Quote the brief phrase that should',
    'have earned it and did not.',
    'ACCUMULATED STATE: does the mechanic consume or reference something established EARLIER —',
    'an earlier week\'s choice, an earlier document, the player\'s own recorded numbers? Apply',
    'the deletion test: if every other page were removed, would this surface read identically?',
    'A surface that would is generated content sitting next to other content, not composed.',
    'DEAD ENDS: after an outcome resolves, is it referenced again anywhere? Name the later',
    'surface that reads it, or record that none does.',
    'WHAT A FAILURE LOOKS LIKE ON A CLEAN BOOK: schema-valid, reference-complete, floor-passing',
    'content is precisely what a good template produces. Here, valid-every-time IS the failure',
    'mode under grade — never accept validity as evidence of authorship.'
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
    'THE GAMEPLAY-EXCELLENCE AXES ARE ALMOST NEVER PROSE FAILURES. A fork whose two options',
    'cost the same, a demand that never rises, a mechanic that would fit any brief — none of',
    'these is fixable by rewriting sentences, and a "prose" directive against one of them buys',
    'a retint and changes nothing. Default them to "structure" and reopen what the finding',
    'actually needs: `decision` for a dominated or flavour-only fork, `economy` for a book with',
    'no loss channel or a demand that never compounds, `mechanism` or `motif` for a shape that',
    'would survive a change of theme, `dynamics` when the week asks the wrong amount for its',
    'load. Use "prose" on these three only when the mechanism is genuinely sound and the page',
    'merely describes it badly — say so in the issue when you claim it.',
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
      '    "voiceDiscipline":   { "score": 0, "evidence": [], "failures": [] },',
      '    "decisionWeight":    { "score": 0, "evidence": [], "failures": [] },',
      '    "masteryCurve":      { "score": 0, "evidence": [], "failures": [] },',
      '    "authoredMechanism": { "score": 0, "evidence": [], "failures": [] }',
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
  /**
   * formatUnitFloorGivensBlock(demands) -> string
   *
   * THE FLOOR GIVENS AT THE REVISION SEAT — the taught half of the gate every
   * revision re-enters (D186/D187's two-halves law, applied to the one unit
   * seat that never received it).
   *
   * THE FLOOR IT TEACHES: `unitFloorErrors()` in modules/critic.js re-runs the
   * unit's own stage validator with the generation floors ON, and the critic
   * loop DISCARDS any revision whose floor count went up. That gate was never
   * stated to the reviser. Proving run 3 paid for nine week revisions and
   * refused nine, every one "dropped generation floors (0 → N)".
   *
   * `demands` is harvested from the gate itself by `unitFloorDemands()`, so
   * every sentence below the header is the FLOOR'S OWN WORDING, carried through
   * unaltered. Nothing here restates a demand and nothing here copies a cap:
   * a second copy is the D93 defect, and a prompt that teaches a different set
   * than the floor demands is worse than silence (D143).
   *
   * THE BUDGETS ARE THE OTHER HALF, and on the evidence the louder one. The
   * presence demands are visible to a reviser holding the unit — it can see the
   * fields it already has. A CAP is invisible: the model cannot count
   * characters, the delivered book sat one character under `storyPrompt`'s 220,
   * and "sharpen this line" is a directive that spends that character.
   * INST_OUTPUT_BUDGETS is included verbatim — the same section, already parity-
   * asserted against OUTPUT_BUDGETS, that D186 routed to the week, fragment and
   * ending seats. This is the fourth seat that authors budgeted prose and the
   * last one that was never told the budgets.
   */
  window.formatUnitFloorGivensBlock = function (demands) {
    var list = (Array.isArray(demands) ? demands : []).map(function (d) {
      return String(d == null ? '' : d).trim();
    }).filter(Boolean);
    var lines = [
      '## The Gate This Revision Re-Enters — a GIVEN, and it is checked',
      '',
      'Your revised unit goes straight back through the same stage gate the original passed. A',
      'revision that answers every directive but drops one demand below is DISCARDED and the',
      'original kept — the critic\'s note goes unanswered and the run pays for nothing. Fix what',
      'the directives name; leave everything below true.'
    ];
    if (list.length) {
      lines.push('');
      lines.push('The gate refuses this unit with each message below when the surface it names is');
      lines.push('missing. They are quoted exactly, and together they are its demand list:');
      list.forEach(function (d) { lines.push('- ' + d); });
    }
    var budgets = (typeof window.INST_OUTPUT_BUDGETS !== 'undefined' && window.INST_OUTPUT_BUDGETS)
      ? window.INST_OUTPUT_BUDGETS.join('\n')
      : '';
    if (budgets) {
      lines.push('');
      lines.push('The caps below are enforced on this unit by that same gate, and revision is where');
      lines.push('they break. A directive asking for a sharper, fuller or clearer line is never a');
      lines.push('licence to exceed one. Assume the text you were handed already sits close to its');
      lines.push('cap: to add a clause, cut one.');
      lines.push('');
      lines.push(budgets);
    }
    return lines.join('\n');
  };

  window.buildUnitRevisionPrompt = function (unitLabel, unitJson, directives, contextJson, reopenScopes, floorGivens) {
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
      ''
      // THE GATE'S OWN DEMANDS, when the caller holds them. Absent or empty,
      // the prompt is BYTE-IDENTICAL to the one this builder always produced —
      // the demotion proof every derived block in this file carries, and the
      // reason the corpus harness's prose-only row still reads the old prompt.
    ], (floorGivens ? [String(floorGivens), ''] : []), [
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

  // ── DELTA REPAIR (D167) ─────────────────────────────────────────────────────
  // THE PROMPT FOR THE SMALLEST POSSIBLE RETRY.
  //
  // A stage gate can fail on defects that are LOCALIZED and NAMED: N specific
  // strings, each a few characters over its printed-space budget. The remedy
  // the pipeline had for that was the remedy it has for everything — re-roll
  // the whole stage — and a week stage is ~30k tokens of output. The author's
  // first live book re-rolled Week 3 three times over four characters.
  //
  // This prompt asks for the four characters. It carries each failing field's
  // current text, its exact requirement in the floor's own words, and enough of
  // the surrounding unit to keep the voice; it demands the corrected fields and
  // NOTHING else. The floor is unchanged — the model still has to satisfy the
  // same budget the same way, and the same gate re-runs afterwards.
  //
  // THE MODEL WRITES EVERY CHARACTER (D160). Nothing in the pipeline truncates,
  // ellipsises or synthesizes a replacement; the merge lands exactly what comes
  // back and rejects anything that names a field nobody asked about.
  window.STRUCTURED_SCHEMA_DELTA_REPAIR = {
    type: 'object',
    additionalProperties: false,
    properties: {
      fixes: {
        type: 'array',
        description: 'One entry per field you were asked to correct. No other fields.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            path: {
              type: 'string',
              description: 'Echo the field path EXACTLY as given in the Fields table.'
            },
            value: {
              type: 'string',
              // Generalised with the prompt (R2). The requirement is stated per
              // field in the Fields table; a budget is one requirement shape
              // among several, so the wire schema names the requirement rather
              // than one instance of it. Still a STRING on every path: the
              // merge writes scalar leaves only, which is what keeps a
              // presence-class repair "exactly the declared path and nothing
              // deeper or wider" rather than a licence to post an object.
              description: 'The text for that field, meeting the requirement stated for it.'
            }
          },
          required: ['path', 'value']
        }
      }
    },
    required: ['fixes']
  };

  // THE GENERAL ONE-FIELD REMEDY (author ruling, 2026-08-17 — R2). This prompt
  // was born for one floor: a prose string a few characters past its printed
  // budget. Every sentence in it said so — the header framing, the budget row,
  // the rewriting advice. That made the machinery below it a lie by omission:
  // the classifier and the merge guard have always been generic (they match on
  // error identity, not on error kind), so any floor could declare a delta
  // target, and the only thing stopping one was a prompt that could describe a
  // single defect.
  //
  // The generalisation: EVERY target states its REQUIREMENT, in the floor's own
  // words, and the budget breach becomes one requirement SHAPE among others
  // rather than the frame the whole page is written in. A target carrying
  // cap/length still gets its arithmetic, verbatim; a presence-class target
  // says the field is missing and asks for it; anything else states its
  // requirement and nothing more. The candidate loop's economics depend on
  // this — a one-field remedy that only knows one field is a one-floor remedy.
  window.buildDeltaRepairPrompt = function (stageName, fields, contextJson) {
    var list = fields || [];
    var hasBudget = function (f) {
      return typeof f.cap === 'number' && typeof f.length === 'number' && f.cap > 0;
    };
    var anyBudget = list.some(hasBudget);
    var rows = list.map(function (f, i) {
      var row = [
        '### ' + (i + 1) + '. `' + f.path + '`',
        '- Requirement: ' + f.requirement
      ];
      if (hasBudget(f)) {
        // The HARD numeric target (D194): models cannot count characters, so a
        // bare cap invites grazing (2449 against 2400, live). The target is
        // ~88% of the cap - deep enough that a miscount still lands under.
        var hardTarget = Math.floor(f.cap * 0.88);
        row.push('- Budget: ' + f.cap + ' characters. Yours is ' + f.length + ' \u2014 '
          + Math.max(1, (f.length - f.cap)) + ' too many.');
        row.push('- RETURN AT MOST ' + hardTarget + ' CHARACTERS for this field. Cut whole'
          + ' sentences until you are clearly under \u2014 do not compress words or shave'
          + ' punctuation to graze the cap.');
      }
      if (f.presence) {
        // No "current text" block, deliberately: there is no current text, and
        // an empty fenced block under that heading invites the model to read
        // its own answer as having been erased.
        row.push('- This field is MISSING from your answer. Write it now, at exactly this path.');
      } else {
        row.push('- Current text:');
        row.push('```');
        row.push(String(f.current == null ? '' : f.current));
        row.push('```');
      }
      // The trailing blank is structural, not cosmetic: a `###` heading with no
      // blank line above it is not a heading in any markdown reader, and the
      // budget rows only got away without one because they ended in a fence.
      row.push('');
      return row.join('\n');
    });
    var contextBlock = (typeof contextJson === 'string' && contextJson.trim()) ? [
      '## Surrounding Content (for voice — do NOT return any of it)',
      'These are the neighbouring fields of the same unit. They are already accepted and',
      'frozen. Read them so your rewrite sounds like the same hand wrote it.',
      contextJson,
      ''
    ] : [];
    var anyPresence = list.some(function (f) { return !!f.presence; });
    var headline = list.length === 1
      ? 'was accepted in every respect but one: one field did not meet its requirement.'
      : 'was accepted except for ' + list.length
        + ' fields, which did not meet their requirements.';
    var budgetNote = anyBudget ? [
      'Where a budget is stated below, it is real estate, not style: these are PRINTED surfaces,',
      'and the budget is the width of a line on a 5.5x8.5in page in a reader\'s hand between two',
      'sets — past it the text is cut off by the page, not by us.',
      ''
    ] : [];
    return [
      '# Delta Repair — ' + stageName,
      '',
      'Your previous answer for ' + stageName + ' ' + headline,
      'Nothing else about the answer is in question, and nothing else may change.',
      'Each field below states the requirement it has to meet, in the words it will be',
      're-checked in. Meet that requirement exactly; do not solve a different problem.',
      ''
    ].concat(budgetNote, contextBlock, [
      '## Fields To Fix',
      ''
    ], rows, [
      '## How To Write These',
      '- Where a character cap is stated, DO NOT LAND ON IT: aim for roughly 85% of the',
      '  cap. The proving run\'s finale returned 2521 against 2400 twice, then trimmed to',
      '  just under and failed a third count elsewhere - a rewrite that grazes its cap is',
      '  a coin flip you are re-rolling with the whole stage as the stake.',
      '- Keep the meaning, the proper nouns, and any reference or pointer the line makes.'
    ], (contextBlock.length ? [
      '- Match the voice of the surrounding fields exactly. This is the same book, same hand.'
    ] : []), [
      '- Every field must read as finished prose or a finished instruction — never a stub, a',
      '  placeholder, or a clause cut off mid-thought. It prints exactly as you write it.'
    ], (anyBudget ? [
      '- Where a budget is stated: rewrite the sentence SHORTER. Do NOT trim with an ellipsis',
      '  and do NOT cut a clause off mid-thought. Land a few characters UNDER the budget rather',
      '  than exactly on it — the check counts characters exactly and one character over fails',
      '  the whole stage again.'
    ] : []), (anyPresence ? [
      '- Where a field is marked MISSING: write it fresh, satisfying its stated requirement,',
      '  consistent with everything the answer already says. Do not restate a neighbouring',
      '  field and do not invent a surface the book has not already named.'
    ] : []), [
      '- Change nothing else. Do not rename, add, remove, reorder or "improve" any other field.',
      '',
      '## Output Contract',
      'Return ONLY this object:',
      '{ "fixes": [ { "path": "<exact path from above>", "value": "<the rewritten text>" } ] }',
      '',
      '- One entry per field listed above, and no entries for anything else.',
      '- `path` must be echoed EXACTLY as written above, character for character. A path that',
      '  was not asked for is rejected and the whole repair is discarded.',
      '- `value` is the field\'s new text only — not the object it lives in.',
      '- Return valid JSON only. No fences, no commentary.'
    ]).join('\n');
  };
