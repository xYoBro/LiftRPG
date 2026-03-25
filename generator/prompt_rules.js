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
    '- `passwordLength` (integer, 4-12): Length of the intended final password word',
    '- `passwordEncryptedEnding` (string): Set to empty string `""`. Trusted tooling writes this after sealing the ending. Do not invent fake ciphertext. Always include this key.',
    '- `demoPassword` (string, optional): Only include for explicit demo fixtures.',
    '- `liftoScript` (string): Raw workout program pasted by the user',
    '- `weekCount` (integer, 4-16): Derived from the workout program',
    '- `totalSessions` (integer): Total sessions across all weeks',
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
    '- `overflow` (boolean): True when sessions.length > 3',
    '- `overflowDocument` (foundDocument, required when overflow is true)',
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
    '- `nodes`: [{ id, label, x, y, state }]',
    '- `edges`: [{ from, to, label?, state? }] with short memorable labels and stateful access when possible, not just neutral connectivity',
    '- `currentNode`: string',
    '- Limits: max 12 nodes total, max 10 edges total, labels short, spacing generous',
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
    '  - `displayText`: the puzzle text shown to the player',
    '  - `key`: cipher key or lookup table (if applicable)',
    '  - `workSpace`: { style: "cells"|"boxed-totals"|"blank", rows?: number, cols?: number }',
    '  - `referenceTargets`: array of fragment IDs or map labels for cross-reference puzzles',
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
    '- Optional: `payloadType`, `payload`, `spreadAware`',
    '- Supported `payloadType` values only:',
    '  "none" | "narrative" | "cipher" | "map" | "clock" | "companion" | "fragment-ref" | "password-element"',
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
    'Use 12-30 fragments. Mix 4-7 document families from this supported list:',
    '- `memo`',
    '- `report`',
    '- `inspection`',
    '- `fieldNote`',
    '- `correspondence`',
    '- `transcript`',
    '- `form`',
    '- `anomaly`',
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
    '- `ending.content.body`: max 700 characters.',
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
    '- Before writing fields, determine this internal story engine: genre/tone, layered setting, protagonist role, core want, core need, flaw, wound, relationship web, antagonist pressure, secret, midpoint shift, darkest moment, resolution mode, recurring object, recurring place, recurring motif.',
    '- Do not output that planning object separately. Let it shape the authored fields.',
    '- The week prompts, fragments, rules spread, boss page, and endings must all feel like consequences of the same hidden story engine.'
  ];

  window.INST_ENVIRONMENT = [
    '## Rich Environment',
    '- For serious or complex briefs, give the setting at least four layers: public layer, working layer, hidden layer, and historical layer. For playful, comedic, or simple briefs, two or three layers are sufficient — match depth to tone.',
    '- Even a bland building, office, clinic, dam, station, depot, or archive can be compelling if the labor, wear, jurisdiction, rumor, and buried history are specific.',
    '- Define 8-12 world-native nouns early and reuse them across prompts, fragments, map labels, and interface labels.',
    '- Give the world material specificity: one recurring smell, one recurring sound, one recurring object, one recurring bureaucratic or folk phrase.'
  ];

  window.INST_CHARACTER_WEB = [
    '## Character Web & Ideological Contradictions',
    '- Do not define characters by functional tropes (e.g., "the hacker", "the mentor"). Define them by their emotional dependencies and ideological contradictions.',
    '- Every major NPC must have a worldview that structurally challenges or opposes the protagonist, but remains utterly sympathetic or unavoidable.',
    '- Include at least one intimate dependency, one structural/institutional betrayal, one unstable alliance, and one absent/ghostly shadow over the cast.',
    '- Name 4-6 recurring characters in the Core Noun Roster and use them consistently across storyPrompts, fragments, and interludes.',
    '- At least 3 fragments should be authored by these named ideological rivals, exposing their blind spots and conflicting worldviews.',
    '- At least one character must radically change stance or be tragically recontextualized by the final third of the block.'
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
    '- Identify the dominant physical modality in the raw workout and apply its metaphor translation strictly to the `storyPrompts`. Only use literal gym terminology if the theme demands it.'
  ];

  window.INST_PERVASIVE_PLAY = [
    '## Pervasive Play (The Rest Interval)',
    '- Think in three play bands:',
    '  1. microplay: one mark, one lookup, one trace during mid-workout rest.',
    '  2. bridge play: one meaningful cross-reference or route update that persists across sessions.',
    '  3. pervasive/deep play (The Rest Interval): The time *between* workouts MUST be filled with diegetic anticipation.',
    '- Use `interlude` payloads to assign "off-session contemplation" tasks: a cipher that requires staring at the map at night, a moral dilemma to weigh before the next session, or a cliffhanger code to crack.',
    '- Do not let the fiction sleep when the player rests. The interlude must demand mental engagement even when they are not lifting.'
  ];

  window.INST_DIEGETIC_MECHANICS = [
    '## Diegetic Mechanics Selection',
    '- Do not blindly paste game mechanics into every week. Smartly select mechanics ONLY when they make diegetic sense.',
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
    '- Good families include constraint logic, spatial route reading, fragment cross-reference, pattern recognition, typographic anomaly, observational anomaly hunting, metapuzzle assembly, and process deduction.'
  ];

  window.INST_MAPS_BOARD = [
    '## Maps As Board State',
    '- The map is a changing board state, not an illustration.',
    '- PERSISTENT TOPOLOGY: Design ONE main facility/location map and reuse it across most non-boss weeks. The player should learn, annotate, and master this space over time. Do not create a new unrelated map for each week.',
    '- Week-to-week map evolution: new node unlocked, route closed, state change, annotation added, zone renamed, or access altered. Same topology, evolving state.',
    '- Every map should contain a denied route, locked zone, or inaccessible space plus a likely return point, checkpoint, or remembered landmark.',
    '- If the mapType or topology truly changes for a week (zoom-in, new sector), the change must be diegetically justified and the main topology must return.',
    '- Point-to-point labels should be short and memorable.',
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
    '- the ending reflects the binary choice, boss outcome, and at least one relationship consequence'
  ];

  window.INST_QUALITY_STANDARD = [
    '## Quality Standard — Artifact vs Generic',
    '',
    '**Artifact-grade** output reads like a real indie TTRPG product:',
    '- Every document has an in-world author with a visible agenda, blind spot, or emotional state.',
    '- Fragments cross-reference each other through shared proper nouns, contradictory claims, or sequential document numbers.',
    '- Oracle consequences name specific map nodes, clock names, or companion slots — never vague.',
    '- Cipher families differ week to week. No two consecutive non-boss weeks use the same puzzle shape.',
    '- Map state evolves: nodes unlock, routes close, annotations accumulate. The player can see where they have been.',
    '- The boss decode rewards spatial mastery and institutional memory, not arithmetic.',
    '- Endings name specific earlier objects, places, phrases, and relationships — not plot summaries.',
    '',
    '**Competent but generic** output looks professional but transplantable:',
    '- Documents have atmospheric prose but no visible author agenda or blind spot.',
    '- Fragments are self-contained lore drops — removing any one changes nothing.',
    '- Oracle entries say "something shifts" or "you feel uneasy" instead of naming targets.',
    '- The same cipher family repeats across weeks with only surface reskinning.',
    '- Maps reset each week or share topology but show no state evolution.',
    '- The boss decode is arithmetic on weekly values.',
    '- Endings summarize the arc ("and so the mystery was solved") instead of paying off specifics.',
    '',
    'If any section of your output matches the generic column, silently rewrite it',
    'before returning JSON. Do not mention this check in your output.'
  ];

  window.INST_POSTWRITING_GATE = [
    '## Postwriting Quality Gate',
    '',
    'After drafting your complete JSON response but before returning it, silently',
    'audit every content field against this checklist. Rewrite any field that fails.',
    'Do not mention this audit or output any reasoning — just fix and return clean JSON.',
    '',
    '**Fragments:** For each fragment, ask: if I removed the proper nouns, would this',
    'document still feel specific to THIS booklet? If yes → rewrite with concrete',
    'references to named places, people, procedures, or prior events.',
    '',
    '**Oracle tables:** Scan all oracle entries across all weeks. Flag any entry whose',
    'consequence is atmospheric rather than mechanical (no named target for paperAction).',
    'Flag any pair of entries across weeks that are functionally identical. Rewrite flagged entries.',
    '',
    '**Cipher families:** List the cipher family used each non-boss week. If any two',
    'consecutive weeks share the same family, redesign one. If any cipher body explains',
    'its own method, strip the pedagogy and present only the puzzle.',
    '',
    '**Story prompts:** Read all storyPrompts in sequence. Flag any prompt that:',
    '(a) contains gym/exercise metaphor, (b) ends on tidy closure instead of unresolved',
    'pressure, (c) lacks a physical action or sensory detail, or (d) is interchangeable',
    'with a prompt from a different week. Rewrite flagged prompts.',
    '',
    '**Map progression:** Compare map state across weeks. If the topology shows no',
    'evolution (no new unlocks, closed routes, or annotation changes), add visible',
    'state changes that reflect the campaign plan\'s stateChange for each week.',
    '',
    '**Clue economy:** Verify every fragment tagged "establishes" is referenced or',
    'contradicted by a later fragment. Verify every "reveals" fragment resolves',
    'something planted earlier. Orphaned clues must be connected or cut.',
    '',
    '**Boss reveal:** Confirm the decodingKey requires knowledge the player earned',
    'through play (map locations, institutional facts, spatial relationships), not',
    'just arithmetic on weekly component values. If arithmetic-only, redesign.',
    '',
    '**Endings:** Confirm each ending names at least three specific earlier elements',
    'by their exact in-world identifiers. If an ending summarizes plot instead of',
    'paying off specifics, rewrite it as a found document with concrete references.',
    '',
    '**Overflow documents:** Confirm each overflow document adds institutional depth',
    '(new operational detail, contradictory account, procedural artifact) rather than',
    'restating information the player already has. If it restates, replace with new material.',
    '',
    '**Repeated reveal shapes:** Scan endings and boss content. If the emotional shape',
    'of the reveal (dramatic unmasking, quiet realization, institutional cover-up exposed)',
    'is identical across variants, redesign one variant\'s emotional register.',
    '',
    'This gate is mandatory. Every content-producing response must pass it silently.'
  ];

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
    INST_BRIEF_INTERPRETATION, [''],
    INST_OUTPUT_RULES, [''],
    INST_CONTRACT_GUARDRAILS, [''],
    INST_OUTPUT_BUDGETS, [''],
    INST_BRIEF_FIDELITY, [''],
    INST_WORLD_CONTRACT, [''],
    INST_STORY_ENGINE, [''],
    INST_ENVIRONMENT, [''],
    INST_CHARACTER_WEB, [''],
    INST_LAYERED_ARC, [''],
    INST_WORKOUT_FUSION, [''],
    INST_PERVASIVE_PLAY, [''],
    INST_DIEGETIC_MECHANICS, [''],
    INST_SYSTEM_INTEGRATION, [''],
    INST_WEEKLY_COMPONENTS, [''],
    INST_SESSION_PROMPTS, [''],
    INST_FOUND_DOCUMENTS, [''],
    INST_CIPHER_DESIGN, [''],
    INST_MAPS_BOARD, [''],
    INST_INTERLUDES, [''],
    INST_ORACLES_CLOCKS, [''],
    INST_COMPANIONS, [''],
    INST_PROGRESSION, [''],
    INST_VISUAL_DIRECTION, [''],
    INST_ANTI_SAMENESS, [''],
    INST_ANTI_GENERIC, [''],
    INST_ANTI_PATTERNS, [''],
    INST_ENDING_STANDARD, [''],
    INST_STRUCTURAL_RULES, [''],
    INST_SELF_VERIFICATION, [''],
    INST_QUALITY_STANDARD, [''],
    INST_POSTWRITING_GATE, [''],
    INST_RULES_TEACH
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
    'layer-codex':    { schemas: [],                                            instructions: ['ANTI_PATTERNS'] },
    'campaign-plan':  { schemas: [],                                            instructions: ['WORLD_CONTRACT', 'ANTI_PATTERNS'] },
    'shell':          { schemas: ['META', 'THEME', 'COVER_RULES'],              instructions: ['BRIEF_INTERPRETATION', 'OUTPUT_RULES', 'OUTPUT_BUDGETS', 'CONTRACT_GUARDRAILS', 'BRIEF_FIDELITY', 'WORLD_CONTRACT', 'STORY_ENGINE', 'ENVIRONMENT', 'CHARACTER_WEB', 'RULES_TEACH', 'VISUAL_DIRECTION', 'STRUCTURAL_RULES'] },
    'week-plan':      { schemas: ['WEEK_PLAN'],                                 instructions: [] },
    'week-final':     { schemas: ['SINGLE_WEEK', 'SPATIAL', 'WEEKS_POST'],      instructions: ['OUTPUT_RULES', 'OUTPUT_BUDGETS', 'CONTRACT_GUARDRAILS', 'WORKOUT_FUSION', 'PERVASIVE_PLAY', 'DIEGETIC_MECHANICS', 'SYSTEM_INTEGRATION', 'WEEKLY_COMPONENTS', 'SESSION_PROMPTS', 'CIPHER_DESIGN', 'MAPS_BOARD', 'INTERLUDES', 'ORACLES_CLOCKS', 'COMPANIONS', 'PROGRESSION', 'ANTI_SAMENESS', 'ANTI_GENERIC', 'ANTI_PATTERNS', 'LAYERED_ARC', 'SELF_VERIFICATION'] },
    'fragment':       { schemas: ['SINGLE_FRAGMENT'],                           instructions: ['OUTPUT_RULES', 'OUTPUT_BUDGETS', 'FOUND_DOCUMENTS', 'ANTI_GENERIC', 'SELF_VERIFICATION'] },
    'ending':         { schemas: ['SINGLE_ENDING'],                             instructions: ['OUTPUT_RULES', 'OUTPUT_BUDGETS', 'ENDING_STANDARD', 'LAYERED_ARC', 'CONTRACT_GUARDRAILS', 'SELF_VERIFICATION'] }
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
