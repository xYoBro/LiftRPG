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
    '- `schemaVersion` (string): Always "1.3.0"',
    '- `generatedAt` (string): ISO 8601 datetime',
    '- `blockTitle` (string): Full story title',
    '- `blockSubtitle` (string): One-line official or diegetic designation',
    '- `worldContract` (string): One sentence. The north star for every story, mechanic, and visual choice. Write this first.',
    '- `narrativeVoice` (object): { person, tense, narratorStance, voiceRationale }. Do not default to second-person present tense. Choose the person and tense that best serves the fiction: first person for intimate or unreliable narrators, second person for procedural or instructional worlds, third limited for institutional distance.',
    '- `literaryRegister` (object): { name, behaviorDescription, forbiddenMoves, typographicBehavior }',
    '- `artifactIdentity` (object, required for shell-aware rendering): { artifactClass, artifactBlend?, authorialMode?, boardStateMode, documentEcology?, materialCulture?, openingMode?, rulesDeliveryMode?, revealShape?, unlockLogic?, shellFamily, attachmentStrategy }',
    '- `weeklyComponentType` (string): One fiction-native non-semantic measurement family used across all non-boss weeks. It should feel like an operational residue or in-world key: a number, code, reading, tag, case ID, route marker, calibration value, or designation, never a plaintext letter.',
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
    '- `sessions` (array, 3-6 items): Each session has { sessionNumber, label, exercises: [{ name, sets, repsPerSet, weightField?, notes? }], storyPrompt, fragmentRef?, binaryChoice?: { choiceLabel, promptA, promptB } }',
    '- `fieldOps` (object, required on non-boss weeks): contains mapState, cipher, oracleTable, and optional companionComponents',
    '- `bossEncounter` (object, required on boss week): replaces fieldOps',
    '- `overflow` (boolean): MUST be true when sessions.length > 3. This is a hard contract — the renderer uses it to build a Part 2 spread. Omitting it when sessions exceed 3 breaks page layout.',
    '- `overflowDocument` (foundDocument, REQUIRED when overflow is true): The Part 2 right-hand page. Must be a self-contained found document with all standard fragment fields (id, title, documentType, content, designSpec, etc.). This is a standalone document that appears alongside the overflow sessions — it is NOT a continuation of the session content. Treat it as another fragment, placed here for pacing.',
    '- `interlude` (object, optional): must contain { title, reason, body } and may also include payloadType, payload, spreadAware',
    '- `gameplayClocks` (array, optional): week-level progress clocks outside the oracle payload',
    '- `isDeload` (boolean, optional): tonal flag only'
  ];

  // Later: deepen spatial play before adding new map types.
  // First get more mileage out of revisitation, denied routes,
  // checkpoints, changed annotations, and floorLabel within the
  // current renderer-supported map schema.
  window.SCHEMA_SPATIAL = [
    '### fieldOps.mapState',
    '- `mapType` (string): one of "grid" | "point-to-point" | "linear-track" | "player-drawn"',
    '- `title` (string): diegetic heading',
    '- `floorLabel` (string, optional): deck, floor, wing, district, sector, or stratum label when it strengthens spatial identity',
    '- `mapNote` (string, optional): footer note',
    '- Shared states: "empty" | "cleared" | "locked" | "anomaly" | "current" | "inaccessible"',
    '- Treat the map as changing board state, not as an illustration.',
    '- Every map should include one denied route, locked zone, or inaccessible space.',
    '- Every map should include one likely return point, checkpoint, or remembered landmark.',
    '- If the same space persists across weeks, show at least one changed state, altered route, updated annotation, or revised label.',
    '',
    'GRID:',
    '- `gridDimensions`: { columns: 5-12, rows: 4-8 }',
    '- `tiles`: [{ col, row, type, label?, annotation? }] with route meaning, blocked movement, checkpoints, or discoverable annotations, not filler cells',
    '- `currentPosition`: { col, row }',
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
    '  - `workSpace`: { style: "cells"|"boxed-totals"|"blank", rows?: number, cols?: number }',
    '  - `referenceTargets`: array of fragment IDs or map labels for cross-reference puzzles',
    '- `extractionInstruction`: **HARD LIMIT: 200 characters maximum.** One or two sentences only.',
    '- `type` should name a specific technique such as substitution, reverse-alphabet, grid-filter, index-extraction, fragment-cross-reference, path-tracing, typographic-anomaly, numeric-sequence, contextual-question, or room-label-derivation',
    '- Ciphers yield fiction-native values only. The boss page handles value-to-letter decoding.',
    '- Cipher body displayText should present the puzzle cleanly — no "thinking out loud" about the method, no self-referential explanations of how to solve it.',
    '',
    '### fieldOps.oracleTable',
    '- Shape: { title, instruction, mode, entries[] }',
    '- `mode` is optional metadata; if present prefer "fragment", "consequence", or "mixed"',
    '- Oracle tables use exactly 10 entries with roll bands "00-09", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80-89", "90-99"',
    '- Each entry: { roll: string, type: "fragment"|"consequence", text: string, paperAction?: string, fragmentRef?: string }',
    '- CRITICAL: the text field is called `text`, never `description` or `label`.',
    '- Fragment entries (type: "fragment") must include `fragmentRef` pointing to a real fragment ID.',
    '- Consequence entries must include `paperAction` that visibly changes the paper state (mark a clock, shade a node, cross off a route, etc.).',
    '- Oracle entries must be playable game consequences or concrete fiction events, not atmospheric vibes or prose descriptions.',
    '- If the user&apos;s creative direction specifies a different dice system (e.g. 2d6, d20), adapt oracle entries and roll bands to match.',
    '',
    '### fieldOps.companionComponents',
    'Array of 0-3 companion components per week. Each is an object with `type` plus type-specific fields.',
    'Supported component `type` values only:',
    '- `dashboard`: { type, label, body, rows?, cols?, subtitle?, footprint? }',
    '- `return-box`: { type, label, body, reminder? }',
    '- `inventory-grid`: { type, label, body, rows?, cols?, tokens? }',
    '- `token-sheet`: { type, label, body, tokens?, usageDie? }',
    '- `overlay-window`: { type, label, body, windows?, playWindow? }',
    '- `stress-track`: { type, label, body, tracks?, conditions? }',
    '- `memory-slots`: { type, label, body, slots? }',
    '',
    'Common fields across all types:',
    '- `label` (string, required): diegetic title for the component',
    '- `body` (string, required): instruction or flavour text',
    '- `footprint` (string, optional): "half-page" (default) or "full-page"',
    '- `subtitle` (string, optional): secondary label',
    '- `reminder` (string, optional): short reminder note shown at bottom',
    '',
    '### week.interlude',
    '- Required if present: `title`, `reason`, `body`',
    '- `reason` MUST reference specific terms from the worldContract or literaryRegister. It grounds the interlude in the fiction. Do not use generic phrasing \u2014 name characters, locations, or artifacts from the Core Noun Roster.',
    '- Optional: `payloadType`, `payload`, `spreadAware`',
    '- Supported `payloadType` values ONLY (no others accepted):',
    '  "none" | "narrative" | "cipher" | "map" | "clock" | "companion" | "fragment-ref" | "password-element"',
    '  Do NOT use "fragment" (use "fragment-ref" instead). Do NOT invent new payload types.',
    '- When `payloadType` is "companion", `payload` MUST be an object: `{ "companionComponents": [{ "type": "...", ... }] }`',
    '- When `payloadType` is "map", `payload` MUST be an object: `{ "mapState": { "mapType": "...", ... } }`',
    '- When `payloadType` is "clock", `payload` MUST be an object: `{ "gameplayClocks": [{ ... }] }`',
    '- When `payloadType` is "fragment-ref", `payload` MUST be an object: `{ "fragmentRef": "F.XX", "action": "..." }`',
    '- When `payloadType` is "narrative" or "none", `payload` is a plain string or omitted.',
    '- Use interludes for discovered packets, route updates, partial instructions, fragment handoffs, password elements, or compact state shifts only when they materially change play.',
    '',
    '### week.gameplayClocks',
    '- Each clock: { clockName, segments, clockType, startValue?, direction?, linkedClockName?, opposedClockName?, thresholds?, consequenceOnFull }',
    '- Supported `clockType` values only:',
    '  "progress-clock" | "danger-clock" | "racing-clock" | "tug-of-war-clock" | "linked-clock" | "project-clock"',
    '',
    '### bossEncounter',
    '- Shape: { title, narrative, mechanismDescription, componentInputs, decodingKey, convergenceProof, passwordRevealInstruction, binaryChoiceAcknowledgement?: { ifA, ifB } }',
    '- `decodingKey`: { instruction, referenceTable }',
    '- `componentInputs` must match the prior weeklyComponent values in order',
    '- The boss page reveals how raw values become letters for the first time'
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
    '- `svgArt` (string, optional): sparse line-based inline SVG only when it materially helps',
    '- `coverArtCaption` (string, optional)',
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
    '- `body` length: aim for 400–700 characters. The renderer splits long endings across pages automatically; extremely long endings (1500+ chars) may produce awkward page breaks. Prefer concise, emotionally dense prose.',
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
    '- `sessions` (array, 3-6 items): { sessionNumber, label, exercises: [{ name, sets, repsPerSet, weightField?, notes? }], storyPrompt, fragmentRef?, binaryChoice?: { choiceLabel, promptA, promptB } }',
    '- `fieldOps` (object): mapState, cipher, oracleTable, companionComponents',
    '- `bossEncounter` (object): replaces fieldOps if boss week',
    '- `overflow` (boolean) and `overflowDocument` (foundDocument object)',
    '- `interlude` (object, optional)',
    '- `gameplayClocks` (array, optional)',
    '- `isDeload` (boolean, optional)'
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
    '- `authenticityChecks` (object): { hasIrrelevantDetail, couldExistInDifferentStory, redactionDoesNarrativeWork }'
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
    '- `narrativeVoice` (object): { person, tense, narratorStance, voiceRationale }',
    '- `literaryRegister` (object): { name, behaviorDescription, forbiddenMoves, typographicBehavior }',
    '- `structuralShape` (object): { resolution, temporalOrder, narratorReliability, promptFragmentRelationship, shapeRationale }',
    '  resolution: "closed"|"open"|"shifted"|"costly"|"full"|"partial"|"ambiguous"',
    '  temporalOrder: "chronological"|"in-medias-res"|"rashomon"|"fragmented"|"linear"|"reverse"|"parallel"',
    '  narratorReliability: "reliable"|"compromised"|"unreliable"|"institutional"|"multiple"|"shifting"',
    '  promptFragmentRelationship: "fragments-deepen"|"fragments-contradict"|"fragments-parallel"|"fragments-precede"',
    '- `storySpine` (object): { premise, protagonistDrive, centralTension, midpointShift, finalCost } — 5 sentences total',
    '- `artifactIdentity` (object): { artifactClass, shellFamily, boardStateMode, attachmentStrategy }',
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
    '- `mapType` (string): grid|point-to-point|linear-track|player-drawn',
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
      narrativeVoice: { person: '', tense: '', narratorStance: '', voiceRationale: '' },
      literaryRegister: { name: '', behaviorDescription: '', forbiddenMoves: '', typographicBehavior: '' },
      structuralShape: { resolution: '', temporalOrder: '', narratorReliability: '', promptFragmentRelationship: '', shapeRationale: '' },
      storySpine: { premise: '', protagonistDrive: '', centralTension: '', midpointShift: '', finalCost: '' },
      artifactIdentity: { artifactClass: '', shellFamily: '', boardStateMode: '', attachmentStrategy: '' },
      artifactIntent: {
        briefMode: 'sparse', fidelityMode: 'interpretive',
        arcFamily: 'slow-burn-investigation', mechanicGrammarFamily: 'survey-grid',
        documentEcology: { dominant: ['fieldNote', 'report'], forbidden: ['transcript'] },
        exclusions: { mechanicExclusions: ['testimony-matrix'], documentExclusions: ['transcript'], arcExclusions: ['institutional-collapse'] },
        homePull: 'investigation'
      }
    },
    theme: { visualArchetype: '', palette: { ink: '#000000', paper: '#ffffff', accent: '#000000', muted: '#888888', rule: '#cccccc', fog: '#eeeeee' } },
    cover: { title: '', designation: '', tagline: '', colophonLines: ['', '', ''] },
    weekPlan: [
      { weekNumber: 1, title: '', arcBeat: '', epigraphText: '', epigraphAttribution: '',
        mapType: 'grid', cipherType: '', componentValue: 1, isBossWeek: false, isDeload: false,
        isBinaryChoiceWeek: false, sessionCount: 5, fragmentIds: ['F.01'],
        overflowFragmentId: null, oracleMode: 'mixed', companionTypes: [], clockNames: [], hasInterlude: false }
    ],
    fragmentRegistry: [
      { id: 'F.01', documentType: 'memo', inWorldAuthor: '', inWorldRecipient: '', title: '', narrativePurpose: '' }
    ],
    bossPlan: { passwordWord: '', decodingLogic: '', convergenceRequirements: '', binaryChoiceSetup: '' },
    endingVariants: ['canonical']
  }, null, 2);

  // Structured output schema for the skeleton (OpenAI json_schema format)
  window.STRUCTURED_SCHEMA_SKELETON = {
    type: 'object',
    properties: {
      meta: {
        type: 'object',
        properties: {
          blockTitle: { type: 'string' }, blockSubtitle: { type: 'string' },
          worldContract: { type: 'string' }, weeklyComponentType: { type: 'string' },
          narrativeVoice: {
            type: 'object',
            properties: { person: { type: 'string' }, tense: { type: 'string' }, narratorStance: { type: 'string' }, voiceRationale: { type: 'string' } },
            required: ['person', 'tense', 'narratorStance']
          },
          literaryRegister: {
            type: 'object',
            properties: { name: { type: 'string' }, behaviorDescription: { type: 'string' }, forbiddenMoves: { type: 'string' }, typographicBehavior: { type: 'string' } },
            required: ['name', 'behaviorDescription']
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
            properties: { artifactClass: { type: 'string' }, shellFamily: { type: 'string' }, boardStateMode: { type: 'string' }, attachmentStrategy: { type: 'string' } },
            required: ['artifactClass', 'shellFamily', 'boardStateMode', 'attachmentStrategy']
          },
          artifactIntent: {
            type: 'object',
            properties: {
              briefMode: { type: 'string', enum: ['explicit', 'sparse', 'empty', 'mashup', 'reference-led', 'personal-subject'] },
              fidelityMode: { type: 'string', enum: ['literal', 'interpretive', 'compositional'] },
              arcFamily: { type: 'string', enum: ['slow-burn-investigation', 'institutional-collapse', 'witness-accumulation', 'contamination-spiral', 'procedural-deepening', 'pilgrimage-approach', 'false-order-to-rupture'] },
              mechanicGrammarFamily: { type: 'string', enum: ['survey-grid', 'node-graph', 'timeline-reconstruction', 'testimony-matrix', 'ledger-board', 'route-tracker', 'profile-assembly'] },
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
              homePull: { type: 'string', enum: ['story', 'game', 'investigation', 'mixed'] }
            },
            required: ['briefMode', 'fidelityMode', 'arcFamily', 'mechanicGrammarFamily', 'documentEcology', 'exclusions', 'homePull']
          }
        },
        required: ['blockTitle', 'blockSubtitle', 'worldContract', 'weeklyComponentType', 'narrativeVoice', 'literaryRegister', 'structuralShape', 'storySpine', 'artifactIdentity', 'artifactIntent']
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
            mapType: { type: 'string', enum: ['grid', 'point-to-point', 'linear-track', 'player-drawn'] },
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
    'These extracted signals own the story. The design bias in the prompt owns the game mechanics. They do not compete.',
    'Brief interpretation overrides: storyLens, characterWeb, secretShapes, arcMoves from the design bias.',
    'Design bias still governs: mapType, puzzleFamilies, pressureClocks, scarcitySurfaces, documentTypes.'
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

  window.INST_CONTRACT_GUARDRAILS = [
    '## Contract Guardrails',
    '- Always include a `theme` object.',
    '- Do not invent `meta.passwordEncryptedEnding`. Leave it empty or omit it; trusted tooling seals the ending later.',
    '- Do not include `meta.passwordPlaintext` unless this is an explicit demo fixture and the user asked for it.',
    '- Author the plaintext `endings` array now. Tooling will encrypt later.'
  ];

  window.INST_OUTPUT_BUDGETS = [
    '## Output Length Budgets',
    '- `storyPrompt`: max 220 characters per session prompt.',
    '- Fragment `content` (any body field): max 600 characters.',
    '- `interlude.body`: max 240 characters.',
    '- `ending.content.body`: 400–700 characters preferred. The renderer auto-splits long endings across pages, but extremely long bodies (1500+ chars) produce awkward breaks. Prioritize density over length.',
    '- Prefer the minimum valid count of fragments and endings unless the brief clearly requires more.',
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

  window.INST_CHARACTER_WEB = [
    '## Character Web & Ideological Contradictions',
    '- Do not define characters by functional tropes (e.g., "the hacker", "the mentor"). Define them by their emotional dependencies and ideological contradictions.',
    '- Every major NPC must have a worldview that structurally challenges or opposes the protagonist, but remains utterly sympathetic or unavoidable.',
    '',
    'Scale character depth to match the brief:',
    '- **Complex/serious brief:** Name 4-6 recurring characters in the Core Noun Roster. Include at least one intimate dependency, one structural/institutional betrayal, one unstable alliance, and one absent/ghostly shadow over the cast. At least 3 fragments should be authored by named ideological rivals. At least one character must radically change stance or be tragically recontextualized by the final third.',
    '- **Medium brief:** Name 2-3 recurring characters with opposing worldviews. Include at least one dependency and one betrayal or alliance. At least 2 fragments authored by named characters.',
    '- **Light/comedic/simple brief:** 1-2 characters with clear motivation and one relationship that changes. No mandatory betrayal or institutional complexity. At least 1 fragment authored by a named character.',
    '',
    '- Use named characters consistently across storyPrompts, fragments, and interludes at whatever depth the brief demands.'
  ];

  window.INST_LAYERED_ARC = [
    '## Layered Arc',
    '- Build a real arc, not just clue accumulation.',
    '- At least one week should recontextualize earlier evidence instead of merely adding another clue.',
    '- The midpoint must change interpretation, not just raise stakes.',
    '- The darkest moment should cost the protagonist something relational, ethical, or institutional, not only tactical convenience.',
    '- Shape the tension curve explicitly:',
    '  Early weeks: establishment, constraint, first mystery, first relationship.',
    '  Midpoint: binary choice that recontextualizes prior evidence AND costs a relationship.',
    '  Late weeks: convergence, darkest moment (relational or ethical cost), escalation.',
    '  Boss week: culmination that tests spatial mastery, institutional knowledge, and relationship stakes.',
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
    '- **CRITICAL: Every session MUST have a non-empty exercises array.** Transcribe the user&apos;s workout exactly — name, sets, repsPerSet, weightField. Never omit exercises on any session, even the last session in a high-session-count week. If the user provides 6 sessions of exercises, all 6 must appear with complete exercise data.',
    '- **HARD CONSTRAINT — EXERCISE FIDELITY:** Copy exercise names VERBATIM from the user&apos;s liftoscript. Do NOT add, invent, substitute, or supplement sessions with exercises not explicitly written by the user. Do NOT guess what accessory work the program implies. If the user provided 3 exercises per session, use those 3. If a session needs more volume, add more sets of the user&apos;s exercises — never new exercise names. Machine exercises, cable exercises, and isolation movements are FORBIDDEN unless the user explicitly listed them.'
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
    '- At least one fragment per block should plant a mystery that requires combining information from two different weeks to resolve.'
  ];

  window.INST_DIEGETIC_MECHANICS = [
    '## Diegetic Mechanics Selection',
    '- Do not blindly paste game mechanics into every week. Smartly select mechanics ONLY when they make diegetic sense.',
    '- **Session Phase Loop:** Design and name a specific play cadence for this booklet (e.g., "Workout → Oracle Pull → Execute Consequence → Read Fragment → Mark Board → Record Component"). Commit to this loop in the rulesSpread and follow it consistently. The loop is what makes this feel like a board game, not a journal.',
    '- **Clocks:** Use only when the story implies countdowns, rising institutional heat, structural failure, or approaching pursuers.',
    '- **Ciphers / Puzzles:** Use only when the player intersects hidden communications, corrupted data, or encrypted journals. Do not bury a door code in an abstract puzzle unless someone in-world hid it that way.',
    '- **Maps:** If exploring or tracking, use hex/point-to-point. If breaching a facility, use strict grid.',
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
    '- Use at least four distinct puzzle families across a standard six-week block.',
    '- Do not repeat the same puzzle family in consecutive non-boss weeks unless repetition is diegetic and escalating.',
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
    '- If the mapType or topology truly changes for a week (zoom-in, new sector), the change must be diegetically justified and the main topology must return.',
    '- **Point-to-point print legibility:** Node and edge labels print at ~5pt on a half-letter page. Keep node labels to 2–3 words. Edge labels to 1–2 words. If a location has a long institutional name, abbreviate it for the map label and use the full name in prose. The map is a board, not a paragraph.',
    '- Use `floorLabel` when layered spaces such as decks, wings, sectors, or strata matter to orientation.',
    '- Player-drawn maps should still give enough seed markers or prompts to feel purposeful, not empty.'
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
    '- Do not add companion surfaces as decorative filler.'
  ];

  window.INST_PROGRESSION = [
    '## Progression Design',
    '- Design a clear capability arc across the campaign. Week 1 should feel constrained: limited map access, simple mechanics, few nodes visible, basic companion state.',
    '- **Mechanical Rule Ramp:** Week 1 should introduce only the core loop (map + oracle + session prompts). Add companion components starting Week 2-3. Introduce gameplay clocks by Week 3-4. Week 5+ can layer multiple mechanical surfaces simultaneously. Do not give the player every mechanical surface in Week 1 — complexity is a reward, not a starting condition.',
    '- Each non-boss week must give the player something new: a cleared route, an unlocked node, a decoded access code, a revealed map area, a new companion function, a key that opens a previously locked gate.',
    '- By the penultimate week, the player should have enough capabilities and map knowledge to make real strategic choices about route, resource allocation, and risk.',
    '- The boss week should require the player to have MASTERED the space. The decodingKey should reference map node names, spatial relationships, clock history, or institutional knowledge gathered across the campaign — not just arithmetic on weekly component values.',
    '- Do not give the player everything in Week 1. Do not gate everything behind the boss. Distribute progression evenly, with the midpoint binary choice as the biggest single state change.'
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
    '- `empty`: no creative direction provided',
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
    '### Step 3: Choose one arc family',
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
    '### Step 4: Choose one mechanic grammar family',
    'Set `mechanicGrammarFamily` to one of these. Each changes what the player DOES each week:',
    '',
    '| Family | Board-State Mode | Primary Player Action | Oracle Role | Convergence Shape |',
    '|--------|-----------------|----------------------|-------------|------------------|',
    '| `survey-grid` | survey-grid | Mark, clear, annotate grid positions | Discovery: reveals what is at a location | Sequential assembly of surveyed values |',
    '| `node-graph` | node-graph | Connect, traverse, sever nodes | Routing: determines which connections are traversable | Route confirmation: correct traversal yields the key |',
    '| `timeline-reconstruction` | timeline-reconstruction | Sequence events, identify gaps | Dating: assigns events to time slots | Chronological assembly: correct order yields the key |',
    '| `testimony-matrix` | testimony-matrix | Compare accounts, mark contradictions | Interrogation: surfaces claims that may be true or false | Reconciliation: resolving contradictions yields the key |',
    '| `ledger-board` | ledger-board | Track quantities, debits, credits | Auditing: reveals discrepancies | Balance: correct ledger state yields the key |',
    '| `route-tracker` | route-tracker | Advance position, choose direction | Scouting: reveals conditions ahead | Arrival: correct waypoint sequence yields the key |',
    '| `profile-assembly` | profile-assembly | Collect attributes, compare profiles | Profiling: surfaces traits of several subjects | Identification: assembling the correct profile yields the key |',
    '',
    'The mechanic grammar family determines `meta.artifactIdentity.boardStateMode` and shapes',
    'the oracle, cipher, and companion surface choices. Do not choose one family and then',
    'design mechanics from a different one.',
    '',
    '### Step 5: Declare document ecology',
    'Set `documentEcology`:',
    '- `dominant` (string[], 2-3 types): document types that make up 50%+ of fragments',
    '- `forbidden` (string[], 1-3 types): document types that must NOT appear in this booklet',
    '',
    'Valid types: memo, report, inspection, fieldNote, correspondence, transcript, form, anomaly.',
    '',
    'The ecology must feel native to the artifact. A court packet is mostly transcript and',
    'correspondence. A ship log is mostly fieldNote and inspection. Do not use all 8 types.',
    '',
    '### Step 6: Declare exclusions',
    'Set `exclusions`:',
    '- `mechanicExclusions` (string[], at least 1): board-state modes this booklet will NOT use',
    '- `documentExclusions` (string[], at least 1): same as forbidden in ecology — reinforced here',
    '- `arcExclusions` (string[], at least 1): arc families this booklet is NOT following',
    '',
    'Exclusions are identity. Every booklet must refuse something.',
    '',
    '### Step 7: Name the home pull',
    'Set `homePull` to one of: `story` | `game` | `investigation` | `mixed`',
    '',
    'This is: what kind of evening object is this when the lifter opens it at home?',
    '- `story`: the player returns for narrative curiosity',
    '- `game`: the player returns for mechanical progression',
    '- `investigation`: the player returns to assemble evidence and solve',
    '- `mixed`: balanced pull across dimensions'
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

    // ── TIER 2: Game Design (the play experience) ─────────────────────
    ['## ── TIER 2: GAME DESIGN ──', ''],
    INST_WORLD_CONTRACT, [''],
    INST_ENVIRONMENT, [''],
    INST_WORKOUT_FUSION, [''],
    INST_PERVASIVE_PLAY, [''],
    INST_DIEGETIC_MECHANICS, [''],
    INST_SYSTEM_INTEGRATION, [''],
    INST_WEEKLY_COMPONENTS, [''],
    INST_CIPHER_DESIGN, [''],
    INST_MAPS_BOARD, [''],
    INST_ORACLES_CLOCKS, [''],
    INST_COMPANIONS, [''],
    INST_PROGRESSION, [''],
    INST_INTERLUDES, [''],
    INST_ANTI_SAMENESS, [''],

    // ── TIER 3: Structural Compliance (guardrails) ────────────────────
    ['## ── TIER 3: STRUCTURAL COMPLIANCE ──', ''],
    INST_OUTPUT_RULES, [''],
    INST_CONTRACT_GUARDRAILS, [''],
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
    '- Map types (exactly 4): grid, point-to-point, linear-track, player-drawn.',
    '  Grid: max 12 cols x 8 rows. PTP: max 15 nodes, 20 edges. Linear: max 12 positions. Player-drawn: canvas instructions only.',
    '- Ciphers: DELAYED INTERPRETATION. Weekly values are fiction-native (numbers, codes, instrument readings), NEVER raw letters.',
    '  The boss decodingKey at Week 6 converts accumulated values to letters. This is non-negotiable.',
    '- Oracle tables: d100 with exactly 10 bands (00-09, 10-19, ... 90-99). Each entry has a `text` field.',
    '  Entry types: "fragment" (includes fragmentRef) or "consequence" (includes paperAction).',
    '- Companion component types (7): dashboard, return-box, inventory-grid, token-sheet, overlay-window, stress-track, memory-slots.',
    '- Clock types (6): progress-clock, danger-clock, racing-clock, tug-of-war-clock, linked-clock, project-clock.',
    '- Fragment documentTypes (8): memo, report, inspection, fieldNote, correspondence, transcript, form, anomaly.',
    '- Boss encounter MUST include decodingKey with referenceTable (e.g., "1=A 2=B ... 26=Z").',
    '- Visual archetypes (10): government, cyberpunk, scifi, fantasy, noir, steampunk, minimalist, nautical, occult, pastoral.',
    'Do NOT invent mechanics, map types, component types, or document types outside these lists.'
  ].join('\n');

  // ── Stage Schema Assembler ──────────────────────────────────────────────
  // Routes the right SCHEMA + INST slices to each API pipeline stage.
  // Single source of truth: modify SCHEMA_* or INST_* above, and both
  // the single-prompt path AND the API pipeline automatically pick up changes.
  //
  // COUPLING CONTRACT:
  // - If you add a new SCHEMA section, add it here for relevant stages.
  // - If you add a new INST section, add it here AND to the INSTRUCTIONS reassembly.
  // - NEVER put schema or instruction content in generator.js or api-generator.js.

  var STAGE_SCHEMA_MAP = {
    // Planning stages: story-first
    'layer-codex':    { schemas: [],                                            instructions: ['STORY_ENGINE', 'CHARACTER_WEB', 'LAYERED_ARC', 'ANTI_PATTERNS'] },
    'campaign-plan':  { schemas: [],                                            instructions: ['WORLD_CONTRACT', 'PROGRESSION', 'SYSTEM_INTEGRATION', 'ANTI_PATTERNS', 'ANTI_SAMENESS'] },
    // Shell: story + world + structural
    'shell':          { schemas: ['META', 'THEME', 'COVER_RULES'],              instructions: ['BRIEF_INTERPRETATION', 'BRIEF_FIDELITY', 'ARTIFACT_COMPILER', 'WORLD_CONTRACT', 'STORY_ENGINE', 'ENVIRONMENT', 'CHARACTER_WEB', 'RULES_TEACH', 'VISUAL_DIRECTION', 'OUTPUT_RULES', 'OUTPUT_BUDGETS', 'CONTRACT_GUARDRAILS', 'STRUCTURAL_RULES'] },
    // Week plan: lean
    'week-plan':      { schemas: ['WEEK_PLAN'],                                 instructions: [] },
    // Week flesh: full game design + story
    'week-final':     { schemas: ['SINGLE_WEEK', 'SPATIAL', 'WEEKS_POST'],      instructions: ['SESSION_PROMPTS', 'LAYERED_ARC', 'WORKOUT_FUSION', 'PERVASIVE_PLAY', 'DIEGETIC_MECHANICS', 'SYSTEM_INTEGRATION', 'WEEKLY_COMPONENTS', 'CIPHER_DESIGN', 'MAPS_BOARD', 'INTERLUDES', 'ORACLES_CLOCKS', 'COMPANIONS', 'PROGRESSION', 'ANTI_SAMENESS', 'ANTI_GENERIC', 'ANTI_PATTERNS', 'OUTPUT_RULES', 'OUTPUT_BUDGETS', 'CONTRACT_GUARDRAILS', 'SELF_VERIFICATION'] },
    // Fragment: story quality first
    'fragment':       { schemas: ['SINGLE_FRAGMENT'],                           instructions: ['FOUND_DOCUMENTS', 'ANTI_GENERIC', 'CHARACTER_WEB', 'OUTPUT_RULES', 'OUTPUT_BUDGETS', 'SELF_VERIFICATION'] },
    // Ending: story quality first
    'ending':         { schemas: ['SINGLE_ENDING'],                             instructions: ['ENDING_STANDARD', 'LAYERED_ARC', 'ANTI_GENERIC', 'OUTPUT_RULES', 'OUTPUT_BUDGETS', 'CONTRACT_GUARDRAILS', 'SELF_VERIFICATION'] }
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
