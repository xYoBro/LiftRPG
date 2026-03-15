(function () {
  var BANNED_TROPES = [
    'gladiator arena or Roman colosseum settings',
    'space marine or generic military sci-fi',
    'post-apocalyptic scavenger cliches by default',
    'chosen one or prophecy fulfillment',
    'zombie outbreak as fallback premise',
    'generic medieval fantasy dungeon-crawl',
    'superhero origin story'
  ];

  var GENRE_POOL = [
    'Corporate accounting horror: an audit trail that audits you back',
    'Competitive birdwatching noir: binoculars, betrayal, and rare sightings',
    'Municipal zoning board cosmic horror: the variance was never approved',
    'Insurance fraud romance: two adjusters, one suspicious claim',
    'Deep-sea botanical survey: cataloguing organisms that should not photosynthesize',
    'Antarctic radio station mystery: the signal predates the station',
    'Venetian glassblowing espionage: secrets encoded in crystal',
    '1970s brutalist architecture thriller: the building is watching',
    'Lost pet investigation told through flyers and hand-drawn maps',
    'HOA meeting minutes that get increasingly disturbing',
    'Recipe collection hiding a conspiracy: the ingredients do not exist',
    'Veterinary clinic case files gone wrong: the animals remember',
    'Sumerian tax collector diary: debts older than writing',
    'Byzantine bureaucratic intrigue: forms within forms within forms',
    'Victorian sewer cartography: mapping what lives below',
    'Cold War library science: banned books as dead drops',
    'Competitive origami underground: folding is a blood sport',
    'Elevator inspector existential crisis: between floors, between worlds',
    'Weather station at the edge of reality: the forecast is always wrong',
    'Lighthouse keepers union dispute: the light must not go out',
    'Plague doctor apprentice journal: the cure is the disease',
    'Archaeological dig procedural: every layer is a lie',
    'Train conductor logbook on a route that should not exist',
    'Beekeeping cooperative thriller: the hive has a plan',
    'Cartographer of impossible coastlines: the shore moves at night',
    'Deep space janitor maintenance log: someone has to clean up after first contact',
    'Monastery brewery conspiracy: the recipe is a prayer is a weapon',
    'Professional cheese cave inspector: aging reveals terrible truths',
    'Retired circus performer memoir: the tent is still standing somewhere',
    'County water archive mystery: missing ledgers, recurring names, one wrong map',
    'Rural telephone switchboard conspiracy: voices arrive from lines buried decades ago',
    'University physics department cover-up: the lab notes explain too much and not enough',
    'Probationary museum registrar mystery: every mislabeled object points to the same erased donor',
    'Community astronomy logbook: the sky repeats a pattern no one else records'
  ];

  var DESIGN_PROFILES = [
    {
      id: 'institutional-mystery',
      keywords: ['archive', 'bureau', 'office', 'survey', 'inspection', 'record', 'ledger', 'agency', 'compliance', 'gauge', 'meter', 'building'],
      storyLens: 'mundane competence inside a system whose official purpose is no longer the real one',
      settingLayers: [
        'public-facing counters, corridors, waiting rooms, or lobby surfaces',
        'working spaces where the real labor happens and people improvise',
        'sealed, restricted, or quietly abandoned rooms that retain institutional memory',
        'older administrative history whose paperwork still shapes present behavior'
      ],
      characterWeb: [
        'a supervisor or handler who knows more than they say',
        'a peer who has normalized the wrongness for survival',
        'a dependent, trainee, or novice who changes the protagonist way of seeing',
        'an absent predecessor whose traces are still operationally useful'
      ],
      secretShapes: [
        'routine data encodes human intention',
        'institutional language is being used to hide culpability',
        'the system started drifting long before the protagonist noticed'
      ],
      arcMoves: [
        'small discrepancy',
        'pattern recognition',
        'reframing of what the work really does',
        'personal cost for knowing'
      ],
      mapType: 'grid',
      oracleMode: 'simple',
      puzzleFamilies: ['fragment cross-reference', 'grid-coordinate reading', 'observational anomaly hunting', 'process deduction'],
      pressureClocks: ['Exposure Risk', 'Evidence Chain', 'Site Integrity'],
      scarcitySurfaces: ['dashboard', 'stress-track', 'return-box'],
      interludePayloads: ['fragment-ref', 'password-element', 'narrative'],
      documentTypes: ['memo', 'report', 'inspection', 'fieldNote', 'form', 'transcript'],
      themeHints: ['government', 'noir', 'minimalist']
    },
    {
      id: 'route-expedition',
      keywords: ['road', 'route', 'rail', 'expedition', 'shore', 'coast', 'voyage', 'mountain', 'signal', 'station', 'ferry', 'lighthouse'],
      storyLens: 'movement through a living route where distance, weather, and attrition shape revelation',
      settingLayers: [
        'the official route, chart, trail, or timetable the world claims is stable',
        'temporary shelters, depots, or waystations where travelers barter information',
        'hazard space where weather, terrain, or distance rewrites plans',
        'older routes, lost expeditions, or buried paths still exerting pressure'
      ],
      characterWeb: [
        'a guide, dispatcher, or navigator with compromised judgment',
        'a quartermaster or caretaker tracking scarcity better than anyone else',
        'someone waiting at the far end whose idea of the protagonist is out of date',
        'a vanished traveler or crew member whose route notes remain'
      ],
      secretShapes: [
        'the route was built for a purpose nobody names now',
        'the destination is not the whole truth of the journey',
        'the environment is recording the travelers as much as they are recording it'
      ],
      arcMoves: [
        'departure under ordinary procedure',
        'supply or distance pressure',
        'route re-interpretation',
        'arrival that reveals a cost already paid'
      ],
      mapType: 'linear-track',
      oracleMode: 'simple',
      puzzleFamilies: ['path tracing', 'route adjacency', 'environmental pattern recognition', 'resource clock pressure'],
      pressureClocks: ['Exposure', 'Supplies', 'Distance Remaining'],
      scarcitySurfaces: ['usage-die', 'inventory-grid', 'dashboard'],
      interludePayloads: ['narrative', 'cipher', 'map'],
      documentTypes: ['fieldNote', 'report', 'letter', 'correspondence', 'memo'],
      themeHints: ['nautical', 'pastoral', 'scifi']
    },
    {
      id: 'social-intrigue',
      keywords: ['union', 'meeting', 'family', 'town', 'parish', 'committee', 'choir', 'household', 'school', 'election', 'neighborhood'],
      storyLens: 'a pressure network of people whose public stories and private motives keep crossing wires',
      settingLayers: [
        'public rooms where everyone performs consensus or civility',
        'back rooms, kitchens, porches, offices, and cars where real decisions happen',
        'records, minutes, correspondence, or gossip channels that preserve selective memory',
        'older grievances, debts, or promises the present keeps inheriting'
      ],
      characterWeb: [
        'one intimate ally or dependent whose needs complicate the work',
        'one rival or institutional counterweight who is not entirely wrong',
        'one charismatic figure who changes register depending on audience',
        'one absent or compromised person everyone is quietly orienting around'
      ],
      secretShapes: [
        'different people are protecting different versions of the same event',
        'community language hides coercion',
        'the protagonist role in the social web is not what they thought it was'
      ],
      arcMoves: [
        'surface harmony',
        'contradictory testimony',
        'midpoint allegiance fracture',
        'consequence that must be lived with publicly'
      ],
      mapType: 'point-to-point',
      oracleMode: 'full',
      puzzleFamilies: ['logic deduction', 'witness contradiction', 'fragment cross-reference', 'branch consequence tracking'],
      pressureClocks: ['Suspicion', 'Trust', 'Public Attention'],
      scarcitySurfaces: ['memory-slots', 'dashboard', 'return-box'],
      interludePayloads: ['fragment-ref', 'narrative', 'companion'],
      documentTypes: ['correspondence', 'letter', 'transcript', 'memo', 'fieldNote', 'form'],
      themeHints: ['noir', 'pastoral', 'government']
    },
    {
      id: 'occult-revelation',
      keywords: ['ritual', 'church', 'grave', 'occult', 'forbidden', 'prayer', 'grimoire', 'ghost', 'curse', 'relic', 'abbey'],
      storyLens: 'forbidden pattern recognition where belief, evidence, and contamination change one another',
      settingLayers: [
        'ordinary devotional or inherited surface practice',
        'working rituals, marginal notes, or hidden procedures',
        'sanctified or forbidden spaces that alter perception',
        'buried doctrine, inheritance, or earlier failure still exerting force'
      ],
      characterWeb: [
        'a believer whose faith is not the same thing as trust',
        'a skeptic whose refusal has its own theology',
        'a keeper of texts or relics who edits what survives',
        'a dead or missing voice that still directs behavior'
      ],
      secretShapes: [
        'the ritual was designed to translate, not merely conceal',
        'the first interpretation of events is spiritually useful but false',
        'the protagonist is more implicated than they initially seem'
      ],
      arcMoves: [
        'symbol without context',
        'pattern recognition through accumulation',
        'midpoint revelation that changes the rules of reading',
        'irreversible interpretive act'
      ],
      mapType: 'player-drawn',
      oracleMode: 'full',
      puzzleFamilies: ['symbol decoding', 'layered metapuzzle assembly', 'observational anomaly hunting', 'oracle-triggered rule mutation'],
      pressureClocks: ['Contamination', 'Witness', 'Seal Integrity'],
      scarcitySurfaces: ['stress-track', 'memory-slots', 'overlay-window'],
      interludePayloads: ['cipher', 'password-element', 'map'],
      documentTypes: ['anomaly', 'fieldNote', 'letter', 'transcript', 'correspondence'],
      themeHints: ['occult', 'fantasy', 'noir']
    },
    {
      id: 'containment-failure',
      keywords: ['lab', 'facility', 'containment', 'quarantine', 'specimen', 'ward', 'reactor', 'clean room', 'protocol', 'medical', 'test chamber'],
      storyLens: 'a controlled environment that reveals its control was already compromised',
      settingLayers: [
        'sterile, public-facing procedure surfaces',
        'technical maintenance and emergency handling spaces',
        'sealed enclosures, wards, or access strata where procedure outruns ethics',
        'older incident history the facility pretends is resolved'
      ],
      characterWeb: [
        'a protocol loyalist who keeps the place functioning',
        'a medic, handler, or operator who treats people as liabilities and obligations',
        'a witness whose account cannot be cleanly integrated into the record',
        'a missing subject, patient, or operator shaping every decision'
      ],
      secretShapes: [
        'containment depends on selective truth',
        'the emergency plan assumes sacrificial logic',
        'the protagonist labor is itself part of the experiment'
      ],
      arcMoves: [
        'stable protocol',
        'procedural deviation',
        'midpoint realization about what is being contained',
        'triage under institutional pressure'
      ],
      mapType: 'grid',
      oracleMode: 'simple',
      puzzleFamilies: ['process deduction', 'index extraction', 'observational anomaly hunting', 'route denial'],
      pressureClocks: ['Containment Loss', 'Triage Load', 'Exposure Window'],
      scarcitySurfaces: ['dashboard', 'stress-track', 'inventory-grid'],
      interludePayloads: ['clock', 'cipher', 'narrative'],
      documentTypes: ['report', 'memo', 'form', 'transcript', 'inspection', 'anomaly'],
      themeHints: ['scifi', 'government', 'minimalist']
    },
    {
      id: 'frontier-survival',
      keywords: ['frontier', 'trail', 'canyon', 'desert', 'outpost', 'range', 'mine', 'wildfire', 'reserve', 'ranch', 'flood', 'forest'],
      storyLens: 'survival inside a hard landscape where logistics, memory, and power decide what counts as law',
      settingLayers: [
        'the claimed or mapped version of the land',
        'the lived routes, shelters, water, and labor that actually sustain movement',
        'hazard zones or cut-off spaces the map keeps underdescribing',
        'older occupation, violence, or stewardship the current order relies on'
      ],
      characterWeb: [
        'a local expert whose knowledge is practical and politically dangerous',
        'a traveler, newcomer, or returnee who sees the place differently',
        'a dependent community figure whose safety changes the stakes',
        'an enemy, landlord, or authority who thinks scarcity justifies ownership'
      ],
      secretShapes: [
        'the land is not empty, neutral, or honestly described',
        'the official story of danger hides who benefits',
        'survival decisions keep becoming moral decisions'
      ],
      arcMoves: [
        'ordinary route or season',
        'resource pressure',
        'midpoint reinterpretation of threat',
        'costly arrival or stand'
      ],
      mapType: 'point-to-point',
      oracleMode: 'simple',
      puzzleFamilies: ['path tracing', 'adjacency extraction', 'constraint logic', 'resource clock pressure'],
      pressureClocks: ['Weather', 'Supplies', 'Pursuit'],
      scarcitySurfaces: ['inventory-grid', 'usage-die', 'return-box'],
      interludePayloads: ['map', 'narrative', 'fragment-ref'],
      documentTypes: ['fieldNote', 'letter', 'report', 'inspection', 'memo'],
      themeHints: ['pastoral', 'noir', 'nautical']
    },
    {
      id: 'domestic-secret',
      keywords: ['apartment', 'hotel', 'household', 'kitchen', 'laundry', 'boarding house', 'residence', 'clinic', 'block association', 'care home'],
      storyLens: 'private life under pressure, where care, routine, and secrecy all occupy the same rooms',
      settingLayers: [
        'the rooms everyone sees and knows how to perform inside',
        'service, care, or maintenance spaces where the real labor happens',
        'sealed drawers, ledgers, or rooms where intimacy and concealment overlap',
        'older domestic history still organizing the present through habit'
      ],
      characterWeb: [
        'one intimate relationship that cannot stay in its current form',
        'one caretaker or dependent whose needs are morally clarifying',
        'one institutional intruder or inspector',
        'one absent household member or predecessor still structuring the rooms'
      ],
      secretShapes: [
        'care is entangled with control',
        'ordinary household records preserve the real history',
        'the protagonist role in the home is built on a suppressed bargain'
      ],
      arcMoves: [
        'routine with cracks',
        'room-by-room revelation',
        'midpoint relational reversal',
        'consequence that changes how the place can be lived in'
      ],
      mapType: 'grid',
      oracleMode: 'simple',
      puzzleFamilies: ['room-label derivation', 'fragment cross-reference', 'pattern recognition', 'logic deduction'],
      pressureClocks: ['Strain', 'Suspicion', 'Caretaking Load'],
      scarcitySurfaces: ['memory-slots', 'dashboard', 'inventory-grid'],
      interludePayloads: ['narrative', 'fragment-ref', 'companion'],
      documentTypes: ['letter', 'correspondence', 'fieldNote', 'form', 'transcript', 'memo'],
      themeHints: ['pastoral', 'noir', 'minimalist']
    },
    {
      id: 'infrastructure-thriller',
      keywords: ['dam', 'switchboard', 'tunnel', 'elevator', 'boiler', 'pipeline', 'utility', 'telecom', 'signal', 'grid', 'substation', 'control room'],
      storyLens: 'the systems everybody relies on are legible only to the people no one notices until failure',
      settingLayers: [
        'public infrastructure surfaces people take for granted',
        'maintenance paths, control rooms, and service access known only to workers',
        'offline, dead, or bypass systems still physically present',
        'historical build phases, patch jobs, and earlier failures baked into the structure'
      ],
      characterWeb: [
        'a veteran operator or fixer who knows the old system',
        'a manager or public-facing official who cannot read the real risk',
        'a worker, apprentice, or dependent relying on the protagonist competence',
        'a vanished technician or saboteur whose notes still matter'
      ],
      secretShapes: [
        'the system has been doing more than anyone admitted',
        'infrastructure failure is socially distributed, not purely technical',
        'maintenance records hide political decisions'
      ],
      arcMoves: [
        'routine operation',
        'pressure spike',
        'midpoint systems re-interpretation',
        'manual intervention with public consequence'
      ],
      mapType: 'point-to-point',
      oracleMode: 'simple',
      puzzleFamilies: ['route adjacency', 'tracker-value lookup', 'process deduction', 'visual pattern'],
      pressureClocks: ['Load', 'Outage Risk', 'Public Fallout'],
      scarcitySurfaces: ['dashboard', 'usage-die', 'stress-track'],
      interludePayloads: ['clock', 'map', 'password-element'],
      documentTypes: ['inspection', 'report', 'memo', 'form', 'fieldNote', 'transcript'],
      themeHints: ['government', 'scifi', 'noir']
    }
  ];

  function hashString(text) {
    var hash = 2166136261;
    var str = String(text || '');
    for (var i = 0; i < str.length; i += 1) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function normalizeText(text) {
    return String(text || '').toLowerCase();
  }

  function unique(list) {
    var seen = {};
    return (list || []).filter(function (item) {
      if (!item || seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }

  function pickStable(list, seed, count) {
    var copy = (list || []).slice();
    var result = [];
    var value = seed >>> 0;
    while (copy.length && result.length < count) {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      result.push(copy.splice(value % copy.length, 1)[0]);
    }
    return result;
  }

  function mergeUnique(primary, secondary) {
    return unique([].concat(primary || [], secondary || []));
  }

  function deriveDesignBlend(brief, workout) {
    var haystack = normalizeText(String(brief || '') + '\n' + String(workout || ''));
    var seed = hashString(haystack || String(workout || '') || 'liftrpg');
    var scored = DESIGN_PROFILES.map(function (profile) {
      var score = 0;
      profile.keywords.forEach(function (keyword) {
        if (haystack.indexOf(keyword) !== -1) score += 1;
      });
      return { profile: profile, score: score };
    }).sort(function (left, right) {
      return right.score - left.score;
    });

    var primary = scored[0] && scored[0].score > 0
      ? scored[0].profile
      : DESIGN_PROFILES[seed % DESIGN_PROFILES.length];

    var secondary = null;
    if (scored[1] && scored[1].score > 0 && scored[1].score >= scored[0].score - 1 && scored[1].profile.id !== primary.id) {
      secondary = scored[1].profile;
    } else if (!scored[0] || scored[0].score <= 0) {
      secondary = DESIGN_PROFILES[Math.floor(seed / 7) % DESIGN_PROFILES.length];
      if (secondary.id === primary.id) secondary = null;
    }

    return {
      seed: seed,
      primary: primary,
      secondary: secondary
    };
  }

  function formatDesignBias(blend) {
    var primary = blend.primary;
    var secondary = blend.secondary;
    var worldLayers = mergeUnique(primary.settingLayers, secondary && secondary.settingLayers).slice(0, 4);
    var cast = mergeUnique(primary.characterWeb, secondary && secondary.characterWeb).slice(0, 4);
    var secrets = mergeUnique(primary.secretShapes, secondary && secondary.secretShapes).slice(0, 4);
    var arcs = mergeUnique(primary.arcMoves, secondary && secondary.arcMoves).slice(0, 4);
    var puzzles = mergeUnique(primary.puzzleFamilies, secondary && secondary.puzzleFamilies).slice(0, 5);
    var clocks = mergeUnique(primary.pressureClocks, secondary && secondary.pressureClocks).slice(0, 4);
    var scarcity = mergeUnique(primary.scarcitySurfaces, secondary && secondary.scarcitySurfaces).slice(0, 4);
    var payloads = mergeUnique(primary.interludePayloads, secondary && secondary.interludePayloads).slice(0, 4);
    var documents = mergeUnique(primary.documentTypes, secondary && secondary.documentTypes).slice(0, 6);
    var themes = mergeUnique(primary.themeHints, secondary && secondary.themeHints).slice(0, 4);
    var mapTypes = mergeUnique([primary.mapType], secondary ? [secondary.mapType] : []);
    var oracleModes = mergeUnique([primary.oracleMode], secondary ? [secondary.oracleMode] : []);

    return [
      '## Story And Game Bias',
      '',
      'Use this as the preferred design bias unless the user brief strongly demands a better fit.',
      '- Primary booklet logic: ' + primary.storyLens,
      secondary ? '- Secondary blend: ' + secondary.storyLens : '- Secondary blend: none; lean harder into the primary identity.',
      '- World layers to give concrete form: ' + worldLayers.join('; '),
      '- Character web pressures to include: ' + cast.join('; '),
      '- Secret and contradiction shapes to favor: ' + secrets.join('; '),
      '- Arc moves to stage across the block: ' + arcs.join('; '),
      '- Exploration surfaces to prefer: ' + mapTypes.join('; '),
      '- Oracle tempo to prefer: ' + oracleModes.join('; '),
      '- Pressure systems to favor: ' + clocks.join('; '),
      '- Scarcity surfaces to favor: ' + scarcity.join('; '),
      '- Puzzle families to recombine: ' + puzzles.join('; '),
      '- Interlude payloads to favor: ' + payloads.join('; '),
      '- Document families to draw from: ' + documents.join('; '),
      '- Visual archetypes most likely to fit: ' + themes.join('; '),
      '',
      'The goal is not to make every week look the same. The goal is to make every week feel like it belongs to the same living system.'
    ].join('\n');
  }

  function buildDefaultBrief(workout, blend) {
    var seed = blend.seed ^ hashString(workout || '');
    var picks = pickStable(GENRE_POOL, seed, 4);
    return [
      'No specific creative direction provided.',
      'Default to a deep, slow-burn mystery with a strong human core, layered setting, and real board-state consequences.',
      'Occupational specificity is welcome. A gauge reader, registrar, dispatcher, archive clerk, utility inspector, ferry worker, toll operator, or facilities tech can carry a compelling story if the world around them has layers.',
      '',
      'Do not default to these overused fallbacks: ' + BANNED_TROPES.join('; ') + '.',
      '',
      'Aim for a rich environment with a public layer, a working layer, a hidden layer, and a historical layer.',
      'Unless the block is intentionally comic, give the cast robust inner lives, contradictory motives, and distinct voices across prompts and documents.',
      '',
      'Possible directions if you want a push:',
      '- ' + (picks[0] || GENRE_POOL[0]),
      '- ' + (picks[1] || GENRE_POOL[1]),
      '- ' + (picks[2] || GENRE_POOL[2]),
      '- ' + (picks[3] || GENRE_POOL[3])
    ].join('\n');
  }

  var SCHEMA_HEADER = [
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

  var SCHEMA_META = [
    '## meta (object)',
    '',
    'Required fields:',
    '- `schemaVersion` (string): Always "1.3.0"',
    '- `generatedAt` (string): ISO 8601 datetime',
    '- `blockTitle` (string): Full story title',
    '- `blockSubtitle` (string): One-line official or diegetic designation',
    '- `worldContract` (string): One sentence. The north star for every story, mechanic, and visual choice. Write this first.',
    '- `narrativeVoice` (object): { person, tense, narratorStance, voiceRationale }',
    '- `literaryRegister` (object): { name, behaviorDescription, forbiddenMoves, typographicBehavior }',
    '- `weeklyComponentType` (string): One fiction-native non-semantic measurement family used across all non-boss weeks. It should feel like an operational residue or in-world key: a number, code, reading, tag, case ID, route marker, calibration value, or designation, never a plaintext letter.',
    '- `structuralShape` (object): { resolution, temporalOrder, narratorReliability, promptFragmentRelationship, shapeRationale }',
    '- `passwordLength` (integer, 4-12): Length of the intended final password word',
    '- `passwordEncryptedEnding` (string): If you are not running trusted encryption code, set this to "PLACEHOLDER_ENCRYPT_WITH_RENDERER". Do not invent fake ciphertext.',
    '- `demoPassword` (string, optional): Only include for explicit demo fixtures.',
    '- `liftoScript` (string): Raw workout program pasted by the user',
    '- `weekCount` (integer, 4-16): Derived from the workout program',
    '- `totalSessions` (integer): Total sessions across all weeks',
    '',
    'Forbidden:',
    '- Do not include `meta.passwordPlaintext` in normal output.',
    '- Do not include hidden planning notes in `meta`.'
  ];

  var SCHEMA_THEME = [
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

  var SCHEMA_WEEKS_PRE = [
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
    '- `sessions` (array, 3-6 items): Each session has { sessionNumber, label, exercises, storyPrompt, fragmentRef?, binaryChoice? }',
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
  var SCHEMA_SPATIAL = [
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

  var SCHEMA_WEEKS_POST = [
    '### fieldOps.cipher',
    '- Shape: { type, title, body, noticeabilityDesign, extractionInstruction, characterDerivationProof }',
    '- `type` should name a specific technique such as substitution, reverse-alphabet, grid-filter, index-extraction, fragment-cross-reference, path-tracing, typographic-anomaly, numeric-sequence, contextual-question, or room-label-derivation',
    '- Ciphers yield fiction-native values only. The boss page handles value-to-letter decoding.',
    '',
    '### fieldOps.oracleTable',
    '- Shape: { title, instruction, mode, entries[] }',
    '- `mode`: "simple" or "full"',
    '- `simple` uses exactly 11 entries (2-12)',
    '- `full` uses exactly 10 entries (01-00 bands)',
    '- Entry `type` is "fragment" or "consequence"',
    '- Consequence entries must include `paperAction` that visibly changes the paper state',
    '',
    '### fieldOps.companionComponents',
    'Supported component `type` values only:',
    '- `dashboard`',
    '- `return-box`',
    '- `inventory-grid`',
    '- `token-sheet`',
    '- `overlay-window`',
    '- `stress-track`',
    '- `usage-die`',
    '- `memory-slots`',
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
    '- Shape: { title, narrative, mechanismDescription, componentInputs, decodingKey, convergenceProof, passwordRevealInstruction, binaryChoiceAcknowledgement? }',
    '- `decodingKey`: { instruction, referenceTable }',
    '- `componentInputs` must match the prior weeklyComponent values in order',
    '- The boss page reveals how raw values become letters for the first time'
  ];

  // Later: do not expand document families until we prove the current
  // set can carry threaded evidence, contradiction, and character depth.
  // Favor better fragment function over more fragment categories.
  var SCHEMA_FRAGMENTS = [
    '## fragments (array of found documents)',
    '',
    'Use 12-30 fragments. Mix 4-7 document families from this supported list:',
    '- `memo`',
    '- `report`',
    '- `inspection`',
    '- `fieldNote`',
    '- `correspondence`',
    '- `letter`',
    '- `transcript`',
    '- `form`',
    '- `anomaly`',
    '',
    'Each fragment has:',
    '- `id` (string): pattern "F.N"',
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

  var SCHEMA_TAIL = [
    '## cover',
    '- `title` (string): same as meta.blockTitle',
    '- `designation` (string)',
    '- `tagline` (string)',
    '- `colophonLines` (string[], 3-6 items)',
    '- `svgArt` (string, optional): sparse line-based inline SVG only when it materially helps',
    '- `coverArtCaption` (string, optional)',
    '',
    '## rulesSpread',
    '- `leftPage`: { title, reEntryRule, sections[] }',
    '- `rightPage`: { title, instruction, unlockUrl }',
    '- One leftPage section must explain the play cadence in-world',
    '',
    '## endings',
    '- Array of 1-3 plaintext endings',
    '- Each item: { variant, content, designSpec }',
    '- `content`: { documentType, body, finalLine }',
    '- These are authored now; encryption happens later in trusted tooling'
  ];

  var SCHEMA_SPEC = [].concat(
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
  var INSTRUCTIONS = [
    '# Generation Instructions',
    '',
    '## Output Rules',
    '- Return valid JSON only. No markdown fences, no explanation, no comments.',
    '- The JSON must parse with JSON.parse().',
    '- Use only renderer-supported vocabulary for theme archetypes, document types, companion component types, interlude payload types, clock types, and map types.',
    '- Do not include literal newlines inside string values — encode them as \\n.',
    '- Do not use trailing commas in objects or arrays.',
    '- All internal double-quotes inside string values must be escaped as \\".',
    '- Never leave arrays or objects unclosed. Complete every structure before ending the response.',
    '- If nearing the output token limit, shorten prose fields (storyPrompt, fragment content, interlude body, endings) rather than omitting required structure.',
    '- Before outputting, silently verify the response would pass JSON.parse(). If it would not, fix it first.',
    '',
    '## Contract Guardrails',
    '- Always include a `theme` object.',
    '- If you are not actually encrypting endings with trusted code, set `meta.passwordEncryptedEnding` to "PLACEHOLDER_ENCRYPT_WITH_RENDERER".',
    '- Do not include `meta.passwordPlaintext` unless this is an explicit demo fixture and the user asked for it.',
    '- Author the plaintext `endings` array now. Tooling will encrypt later.',
    '',
    '## Output Length Budgets',
    '- `storyPrompt`: max 220 characters per session prompt.',
    '- Fragment `content` (any body field): max 600 characters.',
    '- `interlude.body`: max 240 characters.',
    '- `ending.content.body`: max 700 characters.',
    '- Prefer the minimum valid count of fragments and endings unless the brief clearly requires more.',
    '- Avoid quoted dialogue unless it materially advances story or game state.',
    '',
    '## World Contract First',
    '- Write `meta.worldContract` before anything else.',
    '- Every later decision must justify itself through that world contract.',
    '- If a choice does not strengthen the world contract, cut it.',
    '',
    '## Story Engine First, Then JSON',
    '- Before writing fields, determine this internal story engine: genre/tone, layered setting, protagonist role, core want, core need, flaw, wound, relationship web, antagonist pressure, secret, midpoint shift, darkest moment, resolution mode, recurring object, recurring place, recurring motif.',
    '- Do not output that planning object separately. Let it shape the authored fields.',
    '- The week prompts, fragments, rules spread, boss page, and endings must all feel like consequences of the same hidden story engine.',
    '',
    '## Rich Environment',
    '- Every setting must have at least four layers: public layer, working layer, hidden layer, and historical layer.',
    '- Even a bland building, office, clinic, dam, station, depot, or archive can be compelling if the labor, wear, jurisdiction, rumor, and buried history are specific.',
    '- Define 8-12 world-native nouns early and reuse them across prompts, fragments, map labels, and interface labels.',
    '- Give the world material specificity: one recurring smell, one recurring sound, one recurring object, one recurring bureaucratic or folk phrase.',
    '',
    '## Character Depth',
    '- Unless the block is intentionally comic, give the protagonist and supporting cast robust inner lives.',
    '- Include at least one intimate tie, one institutional tie, one unstable tie, and one absent or ghostly tie if appropriate.',
    '- Do not make everyone sound the same. Quality of thought should be consistent; diction, omissions, motives, and self-protection should differ by speaker and document type.',
    '- Different fragment authors should reveal different blind spots, not just different handwriting.',
    '',
    '## Layered Arc',
    '- Build a real arc, not just clue accumulation.',
    '- At least one week should recontextualize earlier evidence instead of merely adding another clue.',
    '- The midpoint must change interpretation, not just raise stakes.',
    '- The darkest moment should cost the protagonist something relational, ethical, or institutional, not only tactical convenience.',
    '',
    '## Workout-Story Fusion',
    '- Fuse the workout to the story structurally, not usually literally.',
    '- Heavy or dense training weeks should correspond to compression, crisis, confrontation, escalation, or costly action.',
    '- Deload or lighter weeks should correspond to aftermath, eerie quiet, regrouping, false safety, emotional exposure, or reinterpretation.',
    '- Consistency, attrition, missed opportunities, and recovery can shape the campaign logic, but do not force explicit gym terminology into the fiction unless the theme genuinely wants it.',
    '- The story should still feel specific and meaningful if you remove explicit exercise words from the prose.',
    '',
    '## Gameplay Cadence',
    '- Think in three play bands:',
    '  1. microplay: one mark, one lookup, one trace, one quick choice during rest',
    '  2. bridge play: one meaningful consequence or route update between workout segments',
    '  3. deep play: heavier deduction, map work, or metapuzzle assembly before or after the session',
    '- Do not pack deep-play tasks into every rest period.',
    '- Bridge play should often update route access, scarcity state, or message flow so the world feels responsive between sessions.',
    '',
    '## Game Grammar',
    '- Across the whole booklet, build a coherent mix of:',
    '  exploration surface (route, map, topology, movement)',
    '  pressure surface (clocks, alert, threat, pursuit, institutional heat)',
    '  scarcity surface (stress, memory, inventory, usage, access, time, trust)',
    '  mystery surface (fragments, cipher logic, contradiction, cross-reference)',
    '  gate surface (choice, locked node, interlude payload, password element, route denial)',
    '- Every non-boss week should reinforce at least two of those surfaces, and the block as a whole must express all five.',
    '- Keep at least one scarcity surface persistent across all non-boss weeks so the player is managing a living constraint, not resetting each chapter.',
    '- Include at least one route or gate pattern that rewards revisitation, re-entry, remembered space, or changed access.',
    '- Prefer visible state change over abstract explanation.',
    '',
    '## Weekly Components',
    '- Treat `weeklyComponent` values as diegetic residues or operational keys: readings, tags, case numbers, route markers, calibration results, timestamps, docket fragments, call signs, or similar in-world traces.',
    '- Each non-boss weeklyComponent value should feel collectable, comparable, and operationally meaningful even before the boss decode explains its final use.',
    '',
    '## Session Prompts',
    '- Each `storyPrompt` is 2-4 sentences.',
    '- Each prompt must advance the story, alter pressure, expose a relationship, reveal environment, or force interpretation. It must not simply summarize events.',
    '- Every prompt should include one physical action, one sensory detail, and one material object.',
    '- End sessions on unresolved pressure or altered expectation, not tidy closure.',
    '- Do not force every prompt to name a clock, node, or mechanic. When prompt text references system state, it must feel diegetic and earned.',
    '',
    '## Found Document Quality',
    '- Fragments must feel like real artifacts with real purposes inside the world.',
    '- Include routine, domestic, or procedural documents, not only dramatic revelations.',
    '- At least two fragments should be protagonist-adjacent by authorship, address, or consequence.',
    '- Build at least three linked fragment functions into the booklet: one artifact that changes action, one that changes interpretation, and one that deepens character stakes.',
    '- Let at least one incident, place, procedure, or relationship echo across multiple document perspectives.',
    '- Treat fragments as threaded evidence, found packets, route instructions, contradictory accounts, or emotional aftershocks, not only lore drops.',
    '- Use redactions only when they do narrative work.',
    '',
    '## Cipher And Puzzle Design',
    '- Ciphers produce fiction-native raw values, never raw letters.',
    '- Week 1 puzzle should be solvable quickly. Later weeks can deepen or recombine the grammar.',
    '- Use at least four distinct puzzle families across a standard six-week block.',
    '- Do not repeat the same puzzle family in consecutive non-boss weeks unless repetition is diegetic and escalating.',
    '- Good families include constraint logic, spatial route reading, fragment cross-reference, pattern recognition, typographic anomaly, observational anomaly hunting, metapuzzle assembly, and process deduction.',
    '',
    '## Maps As Board State',
    '- The map is a changing board state, not an illustration.',
    '- Every map should contain a denied route, locked zone, or inaccessible space plus a likely return point, checkpoint, or remembered landmark.',
    '- If consecutive weeks reuse the same mapType, visible structure must change: new node, new label, changed state, altered route, new annotation, or new prompt.',
    '- If a map persists across weeks, at least one route should reopen, close, mutate, or be reinterpreted.',
    '- Point-to-point labels should be short and memorable.',
    '- Use `floorLabel` when layered spaces such as decks, wings, sectors, or strata matter to orientation.',
    '- Player-drawn maps should still give enough seed markers or prompts to feel purposeful, not empty.',
    '',
    '## Interludes And Messaging',
    '- Use supported interlude payloads for discovered packets, route updates, partial instructions, password elements, fragment references, or compact state changes only when they materially affect play.',
    '- Do not add interludes as ornamental prose breaks. Each one should change pressure, interpretation, access, or memory.',
    '',
    '## Oracles And Clocks',
    '- Oracle consequence results must visibly alter the paper state.',
    '- Use clocks to embody threat, bureaucracy, contamination, pursuit, trust, distance, repair, or public fallout.',
    '- Prefer at least one endowed track or clock with `startValue > 0` unless the fiction strongly argues against it.',
    '',
    '## Companion Components',
    '- Only use companion components when they create real scarcity, tension, overwrite pressure, route denial, or strategic tradeoff.',
    '- Good uses: stress accumulation, usage depletion, evidence crowding, memory overwrite, access buffer, or dashboard state.',
    '- Do not add companion surfaces as decorative filler.',
    '',
    '## Visual Direction',
    '- Choose one supported visual archetype that matches the world.',
    '- Use density variation across the booklet: not every spread should be medium density.',
    '- Make the visual logic part of the fiction. Format is worldbuilding, not decoration.',
    '- If the story is institutional, document structure should feel institutional. If it is intimate, the artifact should still show the world hand through margins, annotations, or typographic behavior.',
    '- Choose only 2-3 recurring visual signals for the whole booklet, such as stamps, route arrows, warning bars, docket numbers, repeated symbols, or marginalia.',
    '- Those recurring signals should communicate status, authorship, jurisdiction, pressure, or hazard.',
    '- Avoid decorative clutter that does not support world logic or play clarity.',
    '',
    '## Anti-Sameness',
    '- Do not make every booklet about the same kinds of institutions, secrets, beats, or reveals.',
    '- Mundane work is welcome if it becomes strange through specificity and consequence.',
    '- Choose at least one mechanic family, document family, or expected beat to exclude on purpose. Identity comes from selected absence as much as inclusion.',
    '- Avoid cookie-cutter arcs where each week is just clue -> stranger clue -> boss reveal.',
    '',
    '## Ending Standard',
    '- The ending is a found document first, not a summary.',
    '- Pay off at least three recurring details: object, place, relationship phrase, procedure, motif, or earlier contradiction.',
    '- The final line should feel discrete and earned.',
    '',
    '## Structural Rules',
    '- Exactly one binaryChoice per block, at the midpoint week, never on boss week.',
    '- Exactly one boss week, and it is the final week.',
    '- Boss week `weeklyComponent.value` is null.',
    '- Every fragmentRef must resolve to a real fragment ID.',
    '- `bossEncounter.componentInputs` must match prior weeklyComponent values in order.',
    '- `rulesSpread.leftPage.sections` must include a section explaining the play cadence in-world.',
    '',
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
    '- story voices are distinct across prompts and fragments',
    '- the setting has public, working, hidden, and historical layers',
    '- at least one scarcity surface persists across all non-boss weeks',
    '- the booklet includes at least one meaningful re-entry, revisitation, or changed-access payoff',
    '- at least three fragments have distinct linked functions: action-changing, interpretation-changing, and character-deepening',
    '- maps contain denied space, a return point, and visible state evolution where appropriate',
    '- recurring visual signals are restrained and functional rather than decorative',
    '- the block expresses exploration, pressure, scarcity, mystery, and gating across its full arc',
    '- the story would still feel specific if explicit exercise terminology were removed from the prose'
  ].join('\n');

  window.generatePrompt = function (workout, brief, dice) {
    var blend = deriveDesignBlend(brief, workout);
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
      brief || buildDefaultBrief(workout, blend),
      '',
      formatDesignBias(blend),
      '',
      '## Dice Selection',
      '',
      dice,
      'Tip: use only the selected dice and keep microplay pencil-fast.',
      '',
      '---',
      '',
      INSTRUCTIONS
    ];

    return parts.join('\n');
  };
})();
