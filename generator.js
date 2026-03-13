(function () {
  /* ─── Anti-Trope Defense ─────────────────────────────────────────
     Ban list + randomized genre pool. When the user leaves creative
     direction blank, we actively steer the LLM away from default
     tropes and toward genuinely unusual territory.
     ─────────────────────────────────────────────────────────────── */
  var BANNED_TROPES = [
    'gladiator arena or Roman colosseum settings',
    'space marine or military sci-fi',
    'post-apocalyptic survival',
    'chosen one or prophecy fulfillment',
    'zombie outbreak',
    'generic medieval fantasy (dragon slaying, dungeon crawling)',
    'superhero origin story'
  ];

  var GENRE_POOL = [
    'Corporate Accounting Horror — an audit trail that audits you back',
    'Competitive Birdwatching Noir — binoculars, betrayal, and rare sightings',
    'Municipal Zoning Board Cosmic Horror — the variance was never approved',
    'Insurance Fraud Romance — two adjusters, one suspicious claim',
    'Deep-Sea Botanical Survey — cataloguing organisms that shouldn\'t photosynthesize',
    'Antarctic Radio Station Mystery — the signal predates the station',
    'Venetian Glassblowing Espionage — secrets encoded in crystal',
    '1970s Brutalist Architecture Thriller — the building is watching',
    'Lost Pet Investigation told through flyers and hand-drawn maps',
    'HOA Meeting Minutes That Get Increasingly Disturbing',
    'Recipe Collection Hiding a Conspiracy — the ingredients don\'t exist',
    'Veterinary Clinic Case Files Gone Wrong — the animals remember',
    'Sumerian Tax Collector\'s Diary — debts older than writing',
    'Byzantine Bureaucratic Intrigue — forms within forms within forms',
    'Victorian Sewer Cartography — mapping what lives below',
    'Cold War Library Science — banned books as dead drops',
    'Competitive Origami Underground — folding is a blood sport',
    'Elevator Inspector\'s Existential Crisis — between floors, between worlds',
    'Weather Station at the Edge of Reality — the forecast is always wrong',
    'Lighthouse Keeper\'s Union Dispute — the light must not go out',
    'Plague Doctor\'s Apprentice Journal — the cure is the disease',
    'Archaeological Dig Site Procedural — every layer is a lie',
    'Train Conductor\'s Logbook on a Route That Shouldn\'t Exist',
    'Beekeeping Cooperative Thriller — the hive has a plan',
    'Cartographer of Impossible Coastlines — the shore moves at night',
    'Deep Space Janitor\'s Maintenance Log — someone has to clean up after first contact',
    'Monastery Brewery Conspiracy — the recipe is a prayer is a weapon',
    'Professional Cheese Cave Inspector — aging reveals terrible truths',
    'Retired Circus Performer\'s Memoir — the tent is still standing somewhere',
    'County Water Archive Mystery — missing ledgers, recurring names, one wrong map',
    'Rural Telephone Switchboard Conspiracy — voices arrive from lines that were buried decades ago',
    'University Physics Department Cover-Up — the lab notes explain too much and not enough',
    'Probationary Museum Registrar Mystery — every mislabeled object points to the same erased donor',
    'Community Astronomy Logbook — the sky repeats a pattern no one else records'
  ];

  function shufflePick(arr, n) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy.slice(0, n);
  }

  var MECHANIC_PROFILES = [
    {
      id: 'bureaucratic-mystery',
      keywords: ['archive', 'bureau', 'county', 'survey', 'water', 'inspection', 'record', 'ledger', 'agency', 'protocol'],
      mechanicFamily: 'investigation through paperwork and visible procedural drift',
      dominantMap: 'grid',
      oracleMode: 'simple',
      puzzleFamilies: ['fragment cross-reference', 'grid-coordinate reading', 'observational anomaly hunting', 'oracle-driven state change'],
      clocks: ['Escalation Risk', 'Evidence Chain', 'Site Integrity'],
      artifacts: ['field notes', 'inspection forms', 'annotated maps']
    },
    {
      id: 'journey-expedition',
      keywords: ['road', 'route', 'rail', 'expedition', 'shore', 'coast', 'mountain', 'voyage', 'signal', 'station'],
      mechanicFamily: 'movement pressure, route planning, and discovery under attrition',
      dominantMap: 'linear-track',
      oracleMode: 'simple',
      puzzleFamilies: ['path tracing', 'route adjacency', 'environmental pattern recognition', 'resource clock pressure'],
      clocks: ['Exposure', 'Supplies', 'Distance Remaining'],
      artifacts: ['travel logs', 'route diagrams', 'supply manifests']
    },
    {
      id: 'social-intrigue',
      keywords: ['union', 'meeting', 'romance', 'family', 'town', 'parish', 'committee', 'choir', 'household', 'election'],
      mechanicFamily: 'relationship pressure, trust tracking, and branching testimony',
      dominantMap: 'point-to-point',
      oracleMode: 'full',
      puzzleFamilies: ['logic deduction', 'witness contradiction', 'fragment cross-reference', 'branch consequence tracking'],
      clocks: ['Suspicion', 'Trust', 'Public Attention'],
      artifacts: ['letters', 'minutes', 'transcripts']
    },
    {
      id: 'occult-revelation',
      keywords: ['ritual', 'saint', 'church', 'grave', 'occult', 'forbidden', 'prayer', 'grimoire', 'ghost', 'curse'],
      mechanicFamily: 'forbidden knowledge accumulation with staged ritual revelation',
      dominantMap: 'player-drawn',
      oracleMode: 'full',
      puzzleFamilies: ['symbol decoding', 'layered metapuzzle assembly', 'observational anomaly hunting', 'oracle-triggered rule mutation'],
      clocks: ['Contamination', 'Witness', 'Seal Integrity'],
      artifacts: ['marginalia', 'liturgical notes', 'redacted confessions']
    }
  ];

  function deriveMechanicProfile(brief, workout) {
    var haystack = String(brief || '') + '\n' + String(workout || '');
    var text = haystack.toLowerCase();
    var best = MECHANIC_PROFILES[0];
    var bestScore = -1;

    MECHANIC_PROFILES.forEach(function (profile) {
      var score = 0;
      profile.keywords.forEach(function (keyword) {
        if (text.indexOf(keyword) !== -1) score += 1;
      });
      if (score > bestScore) {
        bestScore = score;
        best = profile;
      }
    });

    return best;
  }

  function formatMechanicProfile(profile) {
    return [
      '## Algorithmic Story-to-Game Mapping',
      '',
      'Use this mechanic profile as the default ludonarrative package unless the worldContract strongly justifies a better fit.',
      '- Dominant mechanic family: ' + profile.mechanicFamily,
      '- Preferred recurring mapType: ' + profile.dominantMap,
      '- Preferred oracle mode: ' + profile.oracleMode,
      '- Puzzle families to emphasize: ' + profile.puzzleFamilies.join('; '),
      '- Named progress clocks to prefer: ' + profile.clocks.join('; '),
      '- Artifact surfaces to emphasize: ' + profile.artifacts.join('; '),
      '',
      'Write the weeks so the analog game structures feel inevitable for this story, not pasted on afterward.'
    ].join('\n');
  }

  /* ─── Schema Sections ───────────────────────────────────────────
     Each section is independently editable. To fix a map issue,
     find SCHEMA_SPATIAL. To fix a cipher issue, stay in SCHEMA_WEEKS
     (cipher is part of fieldOps). To fix meta fields, find SCHEMA_META.
     Distilled from liftrpg-schema.json v1.3.
     ─────────────────────────────────────────────────────────────── */

  var SCHEMA_HEADER = [
    '# LiftRPG Booklet Schema v1.3 — Generation Reference',
    '',
    'You are generating a complete LiftRPG booklet as a single JSON object.',
    'The booklet is a workout journal fused with a branching narrative TTRPG,',
    'designed to be printed as a saddle-stitched half-letter zine and written',
    'in with a pencil during real gym sessions.',
    '',
    '## Top-Level Structure',
    '',
    'The JSON has these top-level keys (all required):',
    '- `meta` — Block-level constants set once, consumed everywhere',
    '- `weeks` — Array of week objects (one per training week)',
    '- `fragments` — Array of found documents (back-of-book, non-sequential)',
    '- `cover` — Title page fields',
    '- `rulesSpread` — How-to-play briefing + password record page',
    '- `endings` — Encrypted ending content (1-3 variants)'
  ];

  var SCHEMA_META = [
    '## meta (object)',
    '',
    'Required fields:',
    '- `schemaVersion` (string): Always "1.3.0"',
    '- `generatedAt` (string): ISO 8601 datetime',
    '- `blockTitle` (string): The full title of this story. Rendered in Playfair Display Italic on cover. Example: "The Cartographer of Unmapped Rooms"',
    '- `blockSubtitle` (string): One line beneath title in Share Tech Mono. Feels like an official designation, not a tagline.',
    '- `worldContract` (string): One sentence. The fundamental nature of this world and what it asks of the person inside it. This is the north star for EVERY design and story decision. Write this FIRST.',
    '- `narrativeVoice` (object):',
    '  - `person` ("first"|"second"|"third"): Grammatical person for session card prompts',
    '  - `tense` ("present"|"past"): Tense for session card prompts',
    '  - `narratorStance` (string): One sentence. Who is speaking, to whom, under what conditions.',
    '  - `voiceRationale` (string): Why this voice serves this world contract. Must reference worldContract.',
    '- `literaryRegister` (object):',
    '  - `name` (string): Internal reference name (never printed)',
    '  - `behaviorDescription` (string): What this register does — properties and behaviors, never source names. 3-5 sentences.',
    '  - `forbiddenMoves` (string[]): At least 3 specific prohibitions.',
    '  - `typographicBehavior` (string): How typography participates in this register.',
    '- `weeklyComponentType` (string): The fiction-native measurement type used across all non-boss weeks. Values are NON-SEMANTIC — numbers, codes, or readings that have no alphabetic meaning until the boss encounter reveals the decoding key. Examples: "gauge-reading", "station-code", "sample-index", "calibration-number", "grid-coordinate"',
    '- `structuralShape` (object):',
    '  - `resolution` ("resolves"|"refuses"|"partial")',
    '  - `temporalOrder` ("forward"|"backward"|"middle-outward"|"fragmented")',
    '  - `narratorReliability` ("reliable"|"unreliable"|"unknown"|"multiple")',
    '  - `promptFragmentRelationship` ("parallel"|"fragments-deepen"|"fragments-contradict"|"prompts-are-the-lie"|"fragments-are-the-lie")',
    '  - `shapeRationale` (string): Why this shape serves this world contract.',
    '- `passwordEncryptedEnding` (string): AES-256-GCM encrypted blob of the endings array, keyed on the final password word derived by the boss convergence mechanism. Base64url encoded. Generate the endings first, then encrypt.',
    '- `demoPassword` (string, optional): Demo-only blurred unlock word for the website preview. Omit from production/public artifacts.',
    '- `liftoScript` (string): The raw workout programme pasted by the user. Store verbatim.',
    '- `weekCount` (integer, 4-16): Number of training weeks. Derived from the workout programme.',
    '- `totalSessions` (integer): Total sessions across all weeks.'
  ];

  var SCHEMA_WEEKS_PRE = [
    '## weeks (array of objects)',
    '',
    'One object per week. Length must equal meta.weekCount.',
    '',
    'Each week requires:',
    '- `weekNumber` (integer): 1-indexed',
    '- `title` (string): Feels like a chapter title in the world. Example: "Survey Sector 4 · The Rooms That Close"',
    '- `epigraph` (object): { text, attribution } — A fragment of found text beneath the week title. Attribution is an in-world designation, never a real author.',
    '- `isBossWeek` (boolean): True for the FINAL week only. Replaces fieldOps with bossEncounter.',
    '- `weeklyComponent` (object): { type, value, extractionInstruction } — The component this week contributes. type matches meta.weeklyComponentType. value is a fiction-native datum (number, code, reading) — NOT a letter. The value is non-semantic until the boss page reveals how to decode it. Null on boss week. extractionInstruction is an in-world procedure for recording the raw value.',
    '- `sessions` (array, 3-6 items): Each session has:',
    '  - `sessionNumber` (integer): 1-indexed within week',
    '  - `label` (string): Example: "Session 2 · Workout B"',
    '  - `exercises` (array): From the workout programme — { name, sets, repsPerSet, weightField, notes }',
    '  - `storyPrompt` (string): 2-4 sentences. Advances the story. Creates a thread the reader follows. Never summarizes.',
    '  - `fragmentRef` (string, optional): Pattern "F.N". Points to a fragment. Only when the prompt creates a thread a specific fragment resolves.',
    '  - `binaryChoice` (object, optional): Present on EXACTLY one session per block at the midpoint week. Two genuine narrative continuations with map-marker circles. { choiceLabel, promptA, promptB }',
    '- `fieldOps` (object, required on non-boss weeks):'
  ];

  // ── Spatial element schema ──────────────────────────────────────
  // To fix map rendering issues: adjust constraints here, not in renderer.js.
  // The renderer enforces a font floor and viewBox — everything else lives here.
  var SCHEMA_SPATIAL = [
    '  - `mapState` (object): The spatial element for this week.',
    '    - `mapType` (string): "grid" | "point-to-point" | "linear-track" | "player-drawn". Default "grid".',
    '    - `title` (string): Diegetic map heading.',
    '    - `mapNote` (string, optional): Footer flavor text.',
    '    Shared tile/node/position states: "empty"|"cleared"|"locked"|"anomaly"|"current"|"inaccessible".',
    '',
    '    GRID (mapType = "grid"):',
    '      gridDimensions: {columns: 5-12, rows: 4-8}.',
    '      tiles: [{col, row, type, label?, annotation?}].',
    '      currentPosition: {col, row}.',
    '',
    '    POINT-TO-POINT (mapType = "point-to-point"):',
    '      nodes: [{id, label (max 14 chars), x (0-100), y (0-100), state}].',
    '      edges: [{from, to, label? (max 8 chars), state?}].',
    '      currentNode: string (node id).',
    '      LIMITS: max 8 visible nodes/week, max 12 total, max 3 edges/node,',
    '      max 10 edges/week, min inter-node distance 15 units.',
    '',
    '    LINEAR TRACK (mapType = "linear-track"):',
    '      positions: [{index, label (max 8 chars), state, annotation?}].',
    '      currentPosition: number (index).',
    '      direction: "horizontal" (default) | "vertical".',
    '      LIMITS: 3-12 positions.',
    '',
    '    PLAYER-DRAWN (mapType = "player-drawn"):',
    '      canvasType: "dot-grid" | "graph-paper" | "hex-dot" | "blank".',
    '      dimensions: {columns: 8-16, rows: 6-12}.',
    '      prompts: [string] — drawing instructions (max 4, max 60 chars each).',
    '      seedMarkers: [{col, row, label (max 8 chars)}] — pre-placed landmarks (max 3).'
  ];

  var SCHEMA_WEEKS_POST = [
    '  - `cipher` (object): The puzzle yielding the weekly component — { type, title, body: {displayText, key?, workSpace: {rows, style}}, noticeabilityDesign, extractionInstruction, characterDerivationProof }. characterDerivationProof proves the cipher yields the fiction-native value (number/code), NOT a letter. The value-to-letter conversion is the boss page\'s responsibility via decodingKey.',
    '    `type` (string): A descriptive label for the cipher technique. Choose from these categories:',
    '    - Classical Cryptography: substitution, reverse-alphabet, Caesar-shift, Atbash, Vigenère-short-key',
    '    - Positional Extraction: index-extraction, prime-filter, grid-filter, acrostic, nth-word',
    '    - Cross-Reference: fragment-cross-reference, oracle-table-derived, page-number-extraction, tracker-value-lookup',
    '    - Steganographic: first-letter-per-sentence, word-count-encoding, repeated-word-pattern, typographic-anomaly',
    '    - Pattern Recognition: numeric-sequence, visual-pattern, logical-deduction-from-series',
    '    - Semantic / Contextual: riddle, fill-in-the-blank, contextual-question, definitional-clue',
    '    - Elimination: candidates-and-clues, process-of-elimination, constraint-satisfaction',
    '    - Map-Spatial: grid-coordinate-reading, path-tracing, adjacency-extraction, room-label-derivation',
    '  - `oracleTable` (object): { title, instruction, mode, entries[] }. mode "simple" = 11 entries (2d6, rolls 2-12). mode "full" = 10 entries (d10xd10, ranges 01-10 through 91-00). Entry types: "fragment" (with fragmentRef) or "consequence" (in-place action).',
    '    Consequence entries MUST include `paperAction` (string): a concrete player instruction that changes visible paper state — e.g., "Advance the \'Extraction Risk\' clock 1 tick", "Mark [Node 4] as locked", "Check off one \'Supply\' box". Names specific targets by their in-world name.',
    '- `bossEncounter` (object, required when isBossWeek is true):',
    '  - `title` (string): In-world title for the boss page. Not "Final Puzzle".',
    '  - `narrative` (string): 2-4 sentences. The climax story moment.',
    '  - `mechanismDescription` (string): In-world fiction-first instructions. Must include the decoding step — converting recorded values to letters using the decodingKey. Completable with booklet + pencil.',
    '  - `componentInputs` (string[]): Ordered list of prior weeks\' fiction-native values (numbers/codes, not letters).',
    '  - `decodingKey` (object): Revealed ONLY on the boss page. Converts fiction-native values to password letters.',
    '    - `instruction` (string): Narrative framing for the decoding step. Fiction-first — should feel like a decryption protocol or calibration key reveal.',
    '    - `referenceTable` (string): The actual key data (e.g., "1=A 2=B ... 26=Z" or a custom mapping). Newline-separated for multi-line tables. Must enable conversion of every componentInputs value to its password letter.',
    '  - `convergenceProof` (string): Step-by-step walkthrough: (a) raw fiction-native values, (b) decoded via decodingKey to letters, (c) assembled into the final password word. Must document 0-1, 2-3, and 4-5 component states.',
    '  - `passwordRevealInstruction` (string): The final in-world instruction. Ends with "Enter it at liftrpg.co."',
    '  - `binaryChoiceAcknowledgement` (object, optional): { ifA, ifB } — boss page acknowledges binary choice.',
    '- `overflow` (boolean): True when sessions.length > 3. Triggers Part 2 spread.',
    '- `isDeload` (boolean): True for deload weeks. Tonal flag — "deload" never appears in booklet.',
    '- `overflowDocument` (foundDocument, required when overflow is true): Found document for the Part 2 right page.',
    '- `interlude` (object, optional): Typographic interlude page. Must have explicit reason referencing worldContract or literaryRegister.',
    '- `gameplayClocks` (array, optional): Setup for progress clocks (e.g. Forged in the Dark style) mapped to the story. Each { clockName, segments (4/6/8), consequenceOnFull }.'
  ];

  var SCHEMA_FRAGMENTS = [
    '## fragments (array of foundDocument, 12-30 items)',
    '',
    'Back-of-book found documents. Non-sequential, mixed types. Each is a distinct document artifact.',
    'Target: 2-3 fragments per non-boss week plus 2-4 bonus. A 5-week block should have 12-18.',
    '',
    'foundDocument structure:',
    '- `id` (string): Pattern "F.N" — e.g., "F.1", "F.14"',
    '- `documentType` ("memo"|"fieldNote"|"transcript"|"inspection"|"correspondence"|"anomaly")',
    '- `inWorldAuthor` (string): Who wrote this within the world. Must be specific.',
    '- `inWorldRecipient` (string): Who it was for.',
    '- `inWorldPurpose` (string): Why this document exists in the world — independent of story function.',
    '- `content` (string): Full text including headers, form fields, redactions [██████], annotations {in braces}.',
    '- `designSpec` (object): { paperTone ("warm"|"neutral"|"cold"|"aged"), primaryTypeface ("mono"|"serif"|"mixed"), headerStyle ("form"|"letterhead"|"handwritten"|"none"), hasRedactions (bool), hasAnnotations (bool) }',
    '- `authenticityChecks` (object): { hasIrrelevantDetail (must be true), couldExistInDifferentStory (must be false), redactionDoesNarrativeWork (true if redactions present, null if not) }'
  ];

  var SCHEMA_THEME = [
    '## theme (object)',
    '',
    'Visual identity for the booklet. The renderer applies these as CSS custom properties and a treatment archetype.',
    '',
    'Required fields:',
    '- `visualArchetype` (string): One of "government" | "cyberpunk" | "scifi" | "fantasy" | "noir" | "steampunk" | "minimalist" | "nautical" | "occult".',
    '  - government: Bureaucratic forms, dark inks, stark red accents, vintage paper. Use for military, institutional, classified, legal, and operational stories. This is the default treatment for deep anomalies or surveys.',
    '  - cyberpunk: Neon accents, dark slates, terminal monospaces. Use for hacking, corporate dystopian, AI, or grid-runner plots.',
    '  - scifi: Clean whites, sharp blues, sleek modern sans-serifs. Lab reports, deep-space logs, futuristic forensic trails.',
    '  - fantasy: Rich organic greens/golds, elegant old-style serifs. Use for magic, folklore, knightly ledgers, or pastoral journals.',
    '  - noir: High-contrast black and white, hard typewriter fonts. Use for gritty crime, old detective case files, or hardboiled mysteries.',
    '  - steampunk: Brass and copper palettes, mechanical serifs. Use for Victorian-era, clockwork, industrial-revolution era logs.',
    '  - minimalist: Pure stark monochrome, extreme whitespace boundaries. Use for extremely clinical, surreal, or "empty" liminal horror.',
    '  - nautical: Deep oceanic blues, rusted bronze, crisp formal serifs. Use for submarine logs, shipping manifests, lighthouse keeper journals.',
    '  - occult: Deep purples, crimson accents, aged and occult styling. Use for cosmic horror, grimoires, forbidden texts, dark academia.',
    '- `palette` (object): 6 hex color values (#rrggbb). Must work in B&W (adequate contrast).',
    '  - `ink` (string): Primary text color. Dark.',
    '  - `paper` (string): Page background. Light.',
    '  - `accent` (string): Stamps, highlights, key elements.',
    '  - `muted` (string): Secondary text, annotations.',
    '  - `rule` (string): Borders, dividers.',
    '  - `fog` (string): Subtle backgrounds, card fills.',
    '- `tokens` (object, optional): Any additional renderer theme variables needed to make the archetype feel specific without touching base CSS. Use this when the default archetype treatment needs custom surfaces, typography behavior, or line treatment.'
  ];

  var SCHEMA_TAIL = [
    '## cover (object)',
    '',
    '- `title` (string): Same as meta.blockTitle',
    '- `designation` (string): Official-sounding designation. Example: "MSA Survey Log · Block 01 · Restricted Distribution"',
    '- `tagline` (string): One line. Official warning or procedural note — not marketing.',
    '- `colophonLines` (string[], 3-6): Small print: date, schema version, URL. Plus one LLM-written world line.',
    '',
    '## rulesSpread (object)',
    '',
    '- `leftPage` (object):',
    '  - `title` (string): In-world title — not "How to Play". Example: "Personnel Orientation · Survey Conduct & Incident Protocol"',
    '  - `reEntryRule` (object): { progressionType ("lp"|"dp"|"sum"|"custom"), ruleText (string — in-world field procedure for missed weeks) }',
    '  - `sections` (array, 4-6): Each { heading, body }. Cover: using the log, fragments, cipher system, oracle table, password record, liftrpg.co.',
    '- `rightPage` (object): RENDERER-GENERATED from week count. Schema needs: { title, instruction, unlockUrl: "liftrpg.co" }',
    '',
    '## endings (array, 1-3 items)',
    '',
    'Encrypted and stored in meta.passwordEncryptedEnding. Each:',
    '- `variant` (string): What determines which ending shows.',
    '- `content` (object): { documentType, body (full ending text), finalLine (the last line — designed as discrete unit) }',
    '- `designSpec` (string): How the ending page feels to arrive at.'
  ];

  var SCHEMA_SPEC = [].concat(
    SCHEMA_HEADER, [''],
    SCHEMA_META, [''],
    SCHEMA_WEEKS_PRE,
    SCHEMA_SPATIAL,
    SCHEMA_WEEKS_POST, [''],
    SCHEMA_FRAGMENTS, [''],
    SCHEMA_THEME, [''],
    SCHEMA_TAIL
  ).join('\n');

  /* ─── Generation Instructions ──────────────────────────────────── */
  var INSTRUCTIONS = [
    '# Generation Instructions',
    '',
    '## Output Format',
    '- Return ONLY valid JSON. No markdown code fences. No commentary.',
    '- The JSON must parse successfully with JSON.parse().',
    '- All string values must use proper JSON escaping (newlines as \\n, quotes as \\").',
    '',
    '## World Contract First',
    '- Write meta.worldContract BEFORE generating any other content.',
    '- Every design decision — naming, voice, cipher themes, document types, map labels — must trace back to the world contract.',
    '- If a decision cannot justify itself through the world contract, cut it.',
    '- If the user provides no creative direction, default to a deep mystery with a strong human core, a hidden system, and revelations that arrive by accumulation instead of jump scares.',
    '',
    '## Diegetic Everything',
    '- Every label, title, and instruction must feel like it belongs inside the fiction.',
    '- No game terminology: not "puzzle", "level", "boss fight", "checkpoint".',
    '- The booklet is a found document. The workout log is a real institutional form.',
    '',
    '## Session Loop & Analog Gameplay',
    '- Treat the booklet like a board game or analog video game. It is not just a story; it is a system of tracking variables on paper.',
    '- Every session follows a strict phase order: Workout \u2192 Field Ops (Puzzles/Maps) \u2192 Oracle (Systems/Events) \u2192 Record (Clocks/Tracks) \u2192 Carry Forward.',
    '- Tie the Oracle heavily into "Progress Clocks" (e.g., "Risk of Discovery", "Storm Proximity").',
    '- Story prompts MUST set up the Field Ops phase and explicitly refer to in-world game states (e.g. "If \'Alertness\' is full, mark this exercise skipped...").',
    '- Write one of the rulesSpread.leftPage.sections to explain this analog game loop using DIEGETIC phase names.',
    '',
    '## Found Document Quality',
    '- Every fragment must pass: hasIrrelevantDetail = true, couldExistInDifferentStory = false.',
    '- Use all 6 document types across fragments. Vary paperTone and typeface.',
    '- Redactions must do narrative work or don\'t use them.',
    '- Include domestic and routine documents — supply orders, shift logs, personal notes — not just operational revelations.',
    '- At least 2 fragments should be authored by or addressed to the protagonist.',
    '',
    '## Cipher Design',
    '- Ciphers yield FICTION-NATIVE VALUES (numbers, codes, readings), never raw letters.',
    '- The value must feel like a natural measurement within the world — a gauge reading, a station number, a grid coordinate.',
    '- Players record these non-semantic values on their log. The values become meaningful only at the boss encounter.',
    '- Week 1 cipher: solvable in under 60 seconds.',
    '- Difficulty escalates but with variance (not monotonic).',
    '- Vary cipher categories across weeks — no two consecutive weeks should use the same category.',
    '- Each cipher must be completable with only the printed booklet and a pencil.',
    '- The `type` field should name the specific technique (e.g., "acrostic"), not just the category.',
    '- noticeabilityDesign is REQUIRED — an unwarned reader must discover the puzzle exists.',
    '- characterDerivationProof must verify that solving the cipher produces exactly weeklyComponent.value (a number/code, not a letter).',
    '',
    '## Password & Encryption',
    '- The final password word must be a meaningful word in the world, 4-12 chars, uppercase alphanumeric only.',
    '- The decodingKey on the bossEncounter converts recorded values to letters. Design it as a revelation moment, not an instruction sheet.',
    '- Generate endings content, then encrypt with AES-256-GCM keyed on that final password word, store as base64url in passwordEncryptedEnding.',
    '- Prefer passwords that become legible only when the boss document teaches the player how to read what they already recorded.',
    '- Avoid passwords that are the most guessable noun in the setting. The password should be inevitable in retrospect, not predictable in advance.',
    '',
    '## Convergence Design',
    '',
    '### Universal: Delayed Interpretation',
    '- Every block uses delayed interpretation. Weekly ciphers yield fiction-native values (numbers, codes, readings).',
    '- The boss page reveals a decodingKey that converts these values to letters for the first time.',
    '- The moment of decoding should feel like a narrative revelation — the values suddenly have meaning.',
    '- The patterns below describe how the DECODED LETTERS assemble into the password.',
    '- The boss convergenceProof must demonstrate: (a) raw values, (b) decoded via decodingKey to letters, (c) assembled into the final password word.',
    '- Prefer boss convergence that adds one more transform beyond simple reveal: reorder, filter, spatial lookup, cross-reference.',
    '',
    '### Pattern 1: Sequential Assembly',
    '- Decoded letters concatenate in week order to form the password.',
    '- Boss mechanism: decode values, then read in sequence. Simplest and most transparent.',
    '- Best for: worlds where order and procedure are thematic (bureaucracies, rituals, timelines).',
    '',
    '### Pattern 2: Reordering Puzzle',
    '- Each week yields one value, but the correct assembly order of decoded letters is NOT week order.',
    '- Boss mechanism reveals the true sequence (e.g., "arrange by the floor where each was found").',
    '- convergenceProof must show both the week-order result (wrong) and the correct-order result (the final password word).',
    '- Best for: worlds where hidden structure or secret logic is thematic (mysteries, conspiracies, archaeology).',
    '',
    '### Pattern 3: Red Herring Filtration',
    '- Weekly values include decoys. More values are collected than the password needs.',
    '- Boss mechanism tells the player which decoded letters to keep and which to discard.',
    '- convergenceProof must identify which values are real vs. decoys and show the filtered result equals the final password word.',
    '- Best for: worlds where deception, filtering, or judgment is thematic (espionage, trials, audits).',
    '',
    '### Pattern 4: Dual-Source Assembly',
    '- Some values come from ciphers as usual, but others must be extracted from oracle table results or fragment content.',
    '- Boss mechanism tells the player to combine cipher-derived and narrative-derived values, then decode all.',
    '- convergenceProof must document both cipher and narrative sources for each value.',
    '- Best for: worlds where multiple information streams converge (investigations, research, intelligence gathering).',
    '',
    '## Story Prompts',
    '- 2-4 sentences per session. Present tense (or as established by narrativeVoice).',
    '- Each must advance the story. Never summarize. Create threads the reader follows.',
    '- End sessions with unresolved tension (Zeigarnik Effect).',
    '',
    '### Human Core',
    '- The protagonist has daily labor (not adventure — routine, skill, obligation).',
    '- Name one private wound. It surfaces through behavior, not exposition.',
    '- At least one recurring relationship: ally, dependent, rival, or ghost.',
    '- One physical place the protagonist returns to. Describe it through wear and use.',
    '- One recurring object (tool, garment, document) that accumulates meaning across weeks.',
    '',
    '### Prose Standard',
    '- Every prompt must contain: one body action, one sensory detail, one material object.',
    '- Imply emotional states through physical behavior. Never name emotions directly.',
    '- Ban: "a sense of", "couldn\'t help but feel", "something was different", "little did they know".',
    '- Prefer concrete nouns over abstract ones. "The third bolt" not "the mechanism".',
    '',
    '### Place Lexicon',
    '- Define 8-12 world-native nouns early (worldContract or first session prompts).',
    '- Reuse these nouns across prompts, fragments, and oracle entries for cohesion.',
    '- Places/objects should feel named by the people who use them, not a narrator.',
    '',
    '## Ending Quality',
    '- The ending is a found document first, not a plot summary.',
    '- Pay off at least 3 recurring details from earlier pages (objects, places, phrases).',
    '- Include one standalone emotional line — a sentence that works without context.',
    '- Answer: who had to write this document, and why now?',
    '',
    '## Priority Rule',
    '- When forced to choose, prefer literary specificity over mechanical cleverness.',
    '- A well-observed detail in a prompt outweighs an elaborate cipher variation.',
    '',
    '## Structural Rules',
    '- Exactly one binaryChoice per block, at the midpoint week, never on boss week.',
    '- Exactly one week has isBossWeek: true (the final week).',
    '- Boss week weeklyComponent.value is null.',
    '- Fragment IDs ("F.1", "F.2", ...) must be unique and referenced consistently by fragmentRef pointers.',
    '- Oracle table: simple mode = 11 entries (2d6), full mode = 10 entries (d10xd10).',
    '- Maximum 3 consequence-type oracle entries per week.',
    '',
    '## Oracle as Analog Game Engine',
    '- The oracle table is the main driver of the analog game state. Every consequence oracle entry MUST include a `paperAction` that changes visible paper state.',
    '- Use Progress Clocks frequently (circles with 4, 6, or 8 slices to fill in).',
    '- Valid paperActions: "Fill 1 segment of the [Clock Name] clock", "Advance the [Specific] track by 2", "Mark [Node 4] as compromised", "Reveal [Fragment ID]".',
    '- The `paperAction` must be unambiguously actionable on the paper, naming specific targets by their in-world name.',
    '- Oracle results that produce only flavor text are NOT consequences \u2014 they are useless for gameplay. The board state must change.',
    '',
    '## Puzzle Variety',
    '- Across a standard six-week block, use at least 4 distinct puzzle families.',
    '- Valid families include: classical cipher, positional extraction, constraint logic, spatial route/adjacency, oracle-driven state change, fragment cross-reference, pattern recognition, metapuzzle assembly, and observational anomaly hunting.',
    '- Do not repeat the same puzzle family in consecutive non-boss weeks unless the world contract makes repetition feel diegetic and escalating.',
    '- The puzzle sequence should feel like a campaign arc: teach a grammar early, complicate it mid-block, then recombine it at convergence.',
    '- Oracle tables must do more than point at flavor text. They should pressure routes, unlock documents, alter map states, or advance visible tracks.',
    '',
    '## Educational / Non-Fiction Mode',
    '- If the user asks for educational or non-fiction material, treat the booklet as a diegetic teaching artifact rather than forcing a fiction overlay.',
    '- Session prompts should frame inquiry, observation, or reflection instead of invented plot.',
    '- Puzzles and oracle outcomes should reinforce the target material by requiring categorization, comparison, recall, sequencing, or model-building.',
    '- The final encrypted page should still feel earned: it reveals synthesis, mastery, or a culminating insight rather than a fictional twist.',
    '',
    '## Branch Consequences',
    '- The binaryChoice is a branch-and-merge checkpoint, not a single-session fork.',
    '- After the choice, the 1-2 weeks between choice and boss must alter at least 2 of these 4 surfaces:',
    '  1. Story prompts reference consequences of the chosen path.',
    '  2. At least 1 fragment reads differently depending on path (written for A, recontextualized under B).',
    '  3. Oracle entries in post-choice weeks shift in mood or consequence type.',
    '  4. Post-choice maps show a different labeled node, route, or state.',
    '- Both paths reconverge at the boss encounter (bossEncounter.binaryChoiceAcknowledgement handles this).',
    '- Write post-choice prompts so readers on path A and path B feel they are in different versions of the same world.',
    '- The choice must feel consequential even though both paths reach the boss. Different journey, same destination.',
    '',
    '## Spatial Design',
    '- Vary map types across weeks when the narrative justifies it.',
    '  Grid: structured spaces (buildings, properties, floor plans).',
    '  Point-to-point: connected locations (investigations, dungeon rooms).',
    '  Linear track: journeys, chases, countdowns.',
    '  Player-drawn: exploration, discovery (player constructs the map).',
    '- You MAY use one map type all weeks if the story demands it.',
    '- You MAY mix types across weeks (grid 1-3, then PTP 4-6).',
    '- PTP: use 4-6 nodes per week. 7-8 only for climax. Labels 1-2 words.',
    '  Space nodes generously (min distance 15). Reveal 2-3 new nodes/week.',
    '- Cipher-map cross-reference: ciphers that reference map coordinates',
    '  or node labels link both zones. Use when narratively fitting.',
    '- MAP CONTINUITY: for recurring map types (same mapType across consecutive weeks), each week\'s map MUST show at least one visible change \u2014 a new node, changed state, new label, shifted position, or new route.',
    '- The map is a board state, not an illustration. Same map with different prose only is a bug.',
    '- Name specific map changes in storyPrompt when narratively relevant.',
    '',
    '## Visual Theme',
    '- Choose a visualArchetype that reinforces the world contract.',
    '- A rural, coastal, natural, folkloric, or land-memory world → pastoral.',
    '- A bureaucratic world → institutional or corporate. A mystery → noir. A journal → confessional or literary.',
    '- A machine, infrastructure, or system-trust world → terminal or clinical.',
    '- The palette must have sufficient contrast for B&W printing (ink on paper ≥ 4.5:1 ratio).',
    '- palette.paper should be a light warm/neutral tone (not pure white). palette.ink should be near-black.',
    '- palette.accent is the signature color — stamps, borders, key headings.',
    '',
    '## Exercise Data',
    '- Copy exercise data EXACTLY from the workout programme provided below.',
    '- Do not rename, reorder, or modify exercises.',
    '- sets, repsPerSet, weightField, and notes come directly from the programme.',
    '',
    '## Self-Verification',
    '',
    'Before returning JSON, verify every item:',
    '- meta.weekCount === weeks.length',
    '- meta.totalSessions === actual total of all session arrays',
    '- weeklyComponent.type === meta.weeklyComponentType for every non-boss week',
    '- Exactly one isBossWeek: true, on the final week only',
    '- Exactly one binaryChoice in the entire block, at the midpoint week, never on boss week',
    '- Boss week weeklyComponent.value is null; all others are non-null',
    '- Every non-boss week has fieldOps; boss week has bossEncounter',
    '- Every fragmentRef resolves to a real fragment ID; all fragment IDs are unique',
    '- bossEncounter.componentInputs matches prior weekly weeklyComponent.values in order',
    '- plaintext password metadata does not appear in the final JSON unless this is an explicit demo fixture using meta.demoPassword',
    '- Pre-boss components do not form recognizable plaintext in collection order',
    '- Oracle entry counts: simple mode = exactly 11, full mode = exactly 10; max 3 consequence entries per week',
    '- Every consequence oracle entry has a non-empty paperAction naming a specific analog paper target (e.g. a clock or track)',
    '- Post-choice sessions (between binaryChoice week and boss week) reference the choice consequences in at least 2 of: prompts, fragments, oracle entries, map labels',
    '- For consecutive weeks sharing the same mapType: map data differs in at least one node/tile/position state, label, or structure',
    '- rulesSpread.leftPage.sections includes a section explaining the analog gameplay phase order'
  ].join('\n');

  /* ─── Public API ───────────────────────────────────────────────── */
  window.generatePrompt = function (workout, brief, dice) {
    var mechanicProfile = deriveMechanicProfile(brief, workout);
    var parts = [
      SCHEMA_SPEC,
      '',
      '---',
      '',
      '# Your Inputs',
      '',
      '## Workout Programme',
      '',
      workout,
      '',
      '## Creative Direction',
      '',
      brief || (function () {
        var picks = shufflePick(GENRE_POOL, 4);
        return [
          'No specific creative direction provided.',
          'Default mode: build a deep, slow-burn mystery with a strong human center.',
          'The mystery should feel discoverable through labor, routine, documents, and repeated physical return to the same world.',
          '',
          'DO NOT default to these overused genres: ' + BANNED_TROPES.join('; ') + '.',
          'These are the most common LLM defaults and produce identical-feeling booklets.',
          '',
          'Instead, consider one of these unusual directions (or invent something equally unexpected):',
          '- ' + picks[0],
          '- ' + picks[1],
          '- ' + picks[2],
          '- ' + picks[3],
          '',
          'The world contract should feel genuinely surprising. Use the workout programme\'s',
          'structure (heavy weeks, deload weeks, exercise selection) to inspire the fiction\'s texture.',
          'Whichever direction you choose, the resulting booklet should still function as a mystery that rewards theory-building across the full block.'
        ].join('\n');
      })(),
      '',
      formatMechanicProfile(mechanicProfile),
      '',
      '## Dice Selection',
      '',
      dice,
      'Tip: Google "roll ' + dice + '" — works as dice if you have none.',
      '',
      '---',
      '',
      INSTRUCTIONS
    ];
    return parts.join('\n');
  };
})();
