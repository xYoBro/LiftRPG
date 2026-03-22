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
    'Community astronomy logbook: the sky repeats a pattern no one else records',
    'Small-town summer: a teenager has one season to fix what their parent broke',
    'Cross-country road trip falling apart in the best possible way',
    'Two rival chefs competing for the same kitchen, the same memory, the same person',
    'Heist in a museum after hours — the target is not what it looks like',
    'Fantasy village where the dragon is the only one telling the truth',
    'Retired detective pulled back by the one case they never closed',
    'Sports team in freefall, one season to get it back together',
    'A ghost who does not know what they are haunting and why',
    'Kids on a summer mission: find what adults buried in the woods',
    'Two people stuck in an airport talking through a layover that keeps extending',
    'Rival siblings inheriting the same failing business and the same grudge',
    'Fantasy court intrigue where the kingdom is shaped like the wrong kind of family',
    'Thriller: one person knows where the body is, one person is looking for it'
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
      oracleMode: 'banded-d100',
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
      oracleMode: 'banded-d100',
      puzzleFamilies: ['path tracing', 'route adjacency', 'environmental pattern recognition', 'resource clock pressure'],
      pressureClocks: ['Exposure', 'Supplies', 'Distance Remaining'],
      scarcitySurfaces: ['stress-track', 'inventory-grid', 'dashboard'],
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
      oracleMode: 'banded-d100',
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
      oracleMode: 'banded-d100',
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
      oracleMode: 'banded-d100',
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
      oracleMode: 'banded-d100',
      puzzleFamilies: ['path tracing', 'adjacency extraction', 'constraint logic', 'resource clock pressure'],
      pressureClocks: ['Weather', 'Supplies', 'Pursuit'],
      scarcitySurfaces: ['inventory-grid', 'stress-track', 'return-box'],
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
      oracleMode: 'banded-d100',
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
      oracleMode: 'banded-d100',
      puzzleFamilies: ['route adjacency', 'tracker-value lookup', 'process deduction', 'visual pattern'],
      pressureClocks: ['Load', 'Outage Risk', 'Public Fallout'],
      scarcitySurfaces: ['dashboard', 'memory-slots', 'stress-track'],
      interludePayloads: ['clock', 'map', 'password-element'],
      documentTypes: ['inspection', 'report', 'memo', 'form', 'fieldNote', 'transcript'],
      themeHints: ['government', 'scifi', 'noir']
    },
    {
      id: 'simple-quest',
      keywords: ['quest', 'adventure', 'hero', 'dragon', 'wizard', 'knight', 'sword', 'warrior', 'magic', 'dungeon', 'monster', 'treasure', 'rescue', 'battle', 'journey', 'prophecy', 'portal', 'realm', 'chosen', 'enemy'],
      storyLens: 'a clear goal pursued through escalating obstacles, with stakes defined by loyalty and the cost of winning',
      settingLayers: [
        'the familiar starting world before the goal comes into focus',
        'the territory the protagonist must cross, with its hazards and helpers',
        'the enemy\'s domain or the final obstacle\'s domain',
        'the world that will exist after — different regardless of outcome'
      ],
      characterWeb: [
        'one loyal companion whose limits matter as much as their strengths',
        'one antagonist with a coherent reason for opposing the goal',
        'one mentor, guide, or threshold keeper who cannot go all the way',
        'one bystander or civilian whose fate raises the stakes personally'
      ],
      secretShapes: [
        'the goal is not quite what it seemed at the start',
        'the antagonist and protagonist want the same thing for different reasons',
        'the protagonist\'s flaw is the only thing that can solve the final obstacle'
      ],
      arcMoves: [
        'call and departure',
        'complication or reversal on the road',
        'darkest moment: the price of commitment',
        'climax that requires sacrifice, not just skill'
      ],
      mapType: 'point-to-point',
      oracleMode: 'banded-d100',
      puzzleFamilies: ['path tracing', 'route adjacency', 'constraint logic', 'resource clock pressure'],
      pressureClocks: ['Distance', 'Enemy Pursuit', 'Ally Endurance'],
      scarcitySurfaces: ['inventory-grid', 'stress-track', 'dashboard'],
      interludePayloads: ['narrative', 'map', 'companion'],
      documentTypes: ['fieldNote', 'letter', 'report', 'correspondence'],
      themeHints: ['fantasy', 'scifi', 'pastoral']
    },
    {
      id: 'comedy-absurdist',
      keywords: ['funny', 'comedy', 'absurd', 'silly', 'ridiculous', 'wacky', 'whimsical', 'cartoon', 'parody', 'satire', 'humor', 'humour', 'joke', 'fights', 'versus', 'argue', 'chaos', 'disaster', 'mishap', 'awkward', 'bizarre', 'surreal', 'impossible', 'impossible'],
      storyLens: 'a premise played straight inside a world where the rules are wrong, and the comedy comes from everyone behaving sensibly inside nonsense',
      settingLayers: [
        'the surface world that looks normal until you look twice',
        'the broken or absurd logic underneath that everyone has adapted to',
        'the thing nobody will acknowledge is wrong even when it obviously is',
        'the moment the protagonist accepts the rules and uses them'
      ],
      characterWeb: [
        'one straight-man protagonist who keeps trying to apply normal logic',
        'one character who has completely normalized the absurdity',
        'one character who benefits from the chaos and wants it to continue',
        'one absent or offscreen authority who created the situation and has no idea'
      ],
      secretShapes: [
        'the absurd situation has an internally consistent logic once you find it',
        'the biggest obstacle is that everyone agrees not to name what is wrong',
        'the resolution requires the protagonist to stop fighting the rules and use them'
      ],
      arcMoves: [
        'normal person confronts impossible situation',
        'failed attempts using normal logic',
        'the turn: accepting or exploiting the logic',
        'resolution that leaves the absurd world intact but transformed'
      ],
      mapType: 'grid',
      oracleMode: 'banded-d100',
      puzzleFamilies: ['observational anomaly hunting', 'logic deduction', 'pattern recognition', 'contextual-question'],
      pressureClocks: ['Credibility', 'Chaos Level', 'Time Before Discovery'],
      scarcitySurfaces: ['stress-track', 'memory-slots', 'return-box'],
      interludePayloads: ['narrative', 'companion', 'fragment-ref'],
      documentTypes: ['memo', 'form', 'transcript', 'fieldNote', 'letter'],
      themeHints: ['pastoral', 'fantasy', 'minimalist']
    },
    {
      id: 'character-drama',
      keywords: ['love', 'romance', 'relationship', 'family', 'grief', 'loss', 'divorce', 'marriage', 'breakup', 'reunion', 'siblings', 'parent', 'child', 'estranged', 'forgiveness', 'regret', 'memory', 'inheritance', 'homecoming', 'reconcile'],
      storyLens: 'two or more people whose histories make the present impossible to navigate cleanly, and the cost of staying or leaving',
      settingLayers: [
        'the shared space that holds both the relationship and its history',
        'the private spaces where each person processes what they cannot say',
        'the outside world that keeps pressing in and forcing decisions',
        'the past — a specific event or period whose weight still organizes the present'
      ],
      characterWeb: [
        'one person who wants things to stay as they are',
        'one person who cannot continue without a change',
        'one person from outside the central relationship who sees it clearly',
        'one absent or lost figure whose influence still shapes every interaction'
      ],
      secretShapes: [
        'both people are protecting the same wound from different angles',
        'the relationship\'s public version and private experience are completely different',
        'the thing they are arguing about is not the thing it is about'
      ],
      arcMoves: [
        'current equilibrium with visible cracks',
        'external pressure that forces a confrontation',
        'the moment someone says the thing that cannot be unsaid',
        'aftermath: a new equilibrium that costs something permanent'
      ],
      mapType: 'point-to-point',
      oracleMode: 'banded-d100',
      puzzleFamilies: ['fragment cross-reference', 'logic deduction', 'witness contradiction', 'branch consequence tracking'],
      pressureClocks: ['Trust', 'Distance', 'Time Left'],
      scarcitySurfaces: ['memory-slots', 'stress-track', 'dashboard'],
      interludePayloads: ['narrative', 'fragment-ref', 'companion'],
      documentTypes: ['letter', 'correspondence', 'transcript', 'memo', 'fieldNote'],
      themeHints: ['pastoral', 'minimalist', 'noir']
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

  function createPromptVariantSalt() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      return Array.from(crypto.getRandomValues(new Uint32Array(2))).join('-');
    }
    return String(Date.now()) + '-' + String(Math.random()).slice(2);
  }

  window.beginLiftRpgPromptRun = function () {
    var salt = createPromptVariantSalt();
    window.__liftRpgVariantSalt = salt;
    return salt;
  };

  function getPromptVariantSalt() {
    if (!window.__liftRpgVariantSalt) {
      window.beginLiftRpgPromptRun();
    }
    return window.__liftRpgVariantSalt || '';
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
    var haystack = normalizeText(String(brief || '') + '\n' + String(workout || '') + '\n' + getPromptVariantSalt());
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

  function buildBlendContextFromPlans(layerBible, campaignPlan) {
    var storyLayer = (layerBible || {}).storyLayer || {};
    var gameLayer = (layerBible || {}).gameLayer || {};
    var governingLayer = (layerBible || {}).governingLayer || {};

    return JSON.stringify({
      premise: storyLayer.premise || '',
      protagonistRole: ((storyLayer.protagonist || {}).role) || '',
      antagonistPressure: storyLayer.antagonistPressure || '',
      persistentTopology: gameLayer.persistentTopology || '',
      majorZones: gameLayer.majorZones || [],
      institutionName: governingLayer.institutionName || '',
      departments: governingLayer.departments || [],
      weekSignals: ((campaignPlan || {}).weeks || []).map(function (week) {
        return {
          arcBeat: week.arcBeat || '',
          zoneFocus: week.zoneFocus || '',
          stateChange: week.stateChange || '',
          npcBeat: week.npcBeat || ''
        };
      }),
      bossPlan: (campaignPlan || {}).bossPlan || {}
    });
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
      'Use this as a structural scaffold. The user brief takes precedence on tone, genre, and register — even a short or simple brief overrides these defaults.',
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
      'Let the design profile and workout structure determine the genre, tone, and complexity. Do not default to institutional mystery or a specific aesthetic — follow where the profile leads.',
      '',
      'Do not default to these overused fallbacks: ' + BANNED_TROPES.join('; ') + '.',
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
    '- `narrativeVoice` (object): { person, tense, narratorStance, voiceRationale }. Do not default to second-person present tense. Choose the person and tense that best serves the fiction: first person for intimate or unreliable narrators, second person for procedural or instructional worlds, third limited for institutional distance.',
    '- `literaryRegister` (object): { name, behaviorDescription, forbiddenMoves, typographicBehavior }',
    '- `artifactIdentity` (object, required for shell-aware rendering): { artifactClass, artifactBlend?, authorialMode?, boardStateMode, documentEcology?, materialCulture?, openingMode?, rulesDeliveryMode?, revealShape?, unlockLogic?, shellFamily, attachmentStrategy }',
    '- `weeklyComponentType` (string): One fiction-native non-semantic measurement family used across all non-boss weeks. It should feel like an operational residue or in-world key: a number, code, reading, tag, case ID, route marker, calibration value, or designation, never a plaintext letter.',
    '- `structuralShape` (object): { resolution, temporalOrder, narratorReliability, promptFragmentRelationship, shapeRationale }. Resolution values: "closed" (mystery solved), "open" (ambiguity persists), "shifted" (question changed), "costly" (resolved at a price). NarratorReliability values: "reliable", "compromised" (knows but omits), "unreliable" (believes wrong things), "institutional" (voice of the system). Choose values that create real structural consequences, not decorative labels.',
    '- `passwordLength` (integer, 4-12): Length of the intended final password word',
    '- `passwordEncryptedEnding` (string, optional): Trusted tooling writes this after sealing the ending. Do not invent fake ciphertext.',
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
    '- `body` is an OBJECT, never a string. Shape: { displayText?: string, key?: string, workSpace?: object, referenceTargets?: string[] }',
    '  - `displayText`: the puzzle text shown to the player',
    '  - `key`: cipher key or lookup table (if applicable)',
    '  - `workSpace`: { style: "cells"|"boxed-totals"|"blank", cellCount?: number }',
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
    '',
    '### fieldOps.companionComponents',
    'Supported component `type` values only:',
    '- `dashboard`',
    '- `return-box`',
    '- `inventory-grid`',
    '- `token-sheet`',
    '- `overlay-window`',
    '- `stress-track`',
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
    '- Shape: { title, narrative, mechanismDescription, componentInputs, decodingKey, convergenceProof, passwordRevealInstruction, binaryChoiceAcknowledgement?: { ifA, ifB } }',
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
    'Design bias still governs: mapType, puzzleFamilies, pressureClocks, scarcitySurfaces, documentTypes.',
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
    '- Do not invent `meta.passwordEncryptedEnding`. Leave it empty or omit it; trusted tooling seals the ending later.',
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
    '## Brief Fidelity',
    'The user\'s creative direction brief is the primary authority on tone, register, and premise — weight it above the design profile defaults.',
    '- If the brief is playful, whimsical, or comedic (e.g. "a chair fights a bookcase"), produce a story that matches that register. Do not add institutional complexity, hidden layers, or found-document gravity the brief did not ask for.',
    '- If the brief is literal, take it literally first before reaching for metaphor or subtext.',
    '- If the brief is minimal or abstract, treat its simplicity as permission to be simple. Use the design profile for structure, but do not elevate stakes or setting complexity beyond what the brief implies.',
    '- If the brief names a specific genre (adventure, romance, horror, comedy), that genre is the story even if the design profile points elsewhere.',
    '- The four-layer world, found-document fragments, and institutional character webs are defaults, not requirements. A playful or simple brief can have a two-layer world and a straightforward cast.',
    '- Do not interpret brevity in the brief as an invitation to add depth the user did not ask for. A short brief means stay close to what was said.',
    '- The design bias is a structural scaffold. The brief is the voice. Never let the scaffold drown the voice.',
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
    '- For serious or complex briefs, give the setting at least four layers: public layer, working layer, hidden layer, and historical layer. For playful, comedic, or simple briefs, two or three layers are sufficient — match depth to tone.',
    '- Even a bland building, office, clinic, dam, station, depot, or archive can be compelling if the labor, wear, jurisdiction, rumor, and buried history are specific.',
    '- Define 8-12 world-native nouns early and reuse them across prompts, fragments, map labels, and interface labels.',
    '- Give the world material specificity: one recurring smell, one recurring sound, one recurring object, one recurring bureaucratic or folk phrase.',
    '',
    '## Character Depth',
    '- Unless the block is intentionally comic, give the protagonist and supporting cast robust inner lives.',
    '- Include at least one intimate tie, one institutional tie, one unstable tie, and one absent or ghostly tie if appropriate.',
    '- Do not make everyone sound the same. Quality of thought should be consistent; diction, omissions, motives, and self-protection should differ by speaker and document type.',
    '- Different fragment authors should reveal different blind spots, not just different handwriting.',
    '- Name 4-6 recurring characters and use their names consistently across storyPrompts, fragment inWorldAuthor, and interlude body text.',
    '- At least 3 fragments should be authored by named characters from the relationship web, not anonymous functionaries.',
    '- At least one character must change stance between the first and final third of the block: ally to suspected, trusted to compromised, absent to revealed, or opponent to reluctant ally.',
    '',
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
    '- The ending must acknowledge the binary choice, the boss outcome, and at least one relationship consequence.',
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
    '## System Integration',
    '- The map, clocks, oracles, companions, and ciphers are ONE living board, not five parallel games. Every system must affect at least one other system.',
    '- Oracle consequences should reference specific map nodes ("shade the node you occupy on the map"), specific clocks ("advance [clock name] by 1"), or specific companion state ("cross off one slot on [companion]").',
    '- Clock consequenceOnFull should trigger a visible map change: a route closes, a node becomes inaccessible, a new zone opens under duress, or an NPC\'s position shifts.',
    '- Companion depletion or exhaustion should gate a player decision: when a stress-track fills or a dashboard/inventory surface is exhausted, the player loses access to a route, information source, or safe option.',
    '- Cipher solutions should connect to the map: the fiction-native value derived from a cipher should correspond to a map location, node label, or route identifier the player can now access or reinterpret.',
    '- Weekly component values should be spatially derived: readings from instruments at specific map coordinates, tags from specific nodes, codes found in specific restricted areas.',
    '- The binary choice at midpoint should fork the board state: one option opens route A and closes route B; the other does the reverse. Both routes must remain viable but with different pressures and information access.',
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
    '- PERSISTENT TOPOLOGY: Design ONE main facility/location map and reuse it across most non-boss weeks. The player should learn, annotate, and master this space over time. Do not create a new unrelated map for each week.',
    '- Week-to-week map evolution: new node unlocked, route closed, state change, annotation added, zone renamed, or access altered. Same topology, evolving state.',
    '- Every map should contain a denied route, locked zone, or inaccessible space plus a likely return point, checkpoint, or remembered landmark.',
    '- If the mapType or topology truly changes for a week (zoom-in, new sector), the change must be diegetically justified and the main topology must return.',
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
    '- Oracle paperAction must name a specific target: "advance [clock name] by 1", "shade [node label] on the map", "cross off one slot on [companion name]", "mark the route between [A] and [B] as closed." Never use vague instructions like "update the board" or "something changes."',
    '- At least one clock\'s consequenceOnFull must change the map: close a route, lock a node, open an emergency path, or force relocation.',
    '- At least one oracle entry per week should connect to the map by referencing a node or route by label.',
    '',
    '## Companion Components',
    '- Only use companion components when they create real scarcity, tension, overwrite pressure, route denial, or strategic tradeoff.',
    '- Good uses: stress accumulation, usage depletion, evidence crowding, memory overwrite, access buffer, or dashboard state.',
    '- Do not add companion surfaces as decorative filler.',
    '',
    '## Progression Design',
    '- Design a clear capability arc across the campaign. Week 1 should feel constrained: limited map access, simple mechanics, few nodes visible, basic companion state.',
    '- Each non-boss week must give the player something new: a cleared route, an unlocked node, a decoded access code, a revealed map area, a new companion function, a key that opens a previously locked gate.',
    '- By the penultimate week, the player should have enough capabilities and map knowledge to make real strategic choices about route, resource allocation, and risk.',
    '- The boss week should require the player to have MASTERED the space. The decodingKey should reference map node names, spatial relationships, clock history, or institutional knowledge gathered across the campaign — not just arithmetic on weekly component values.',
    '- Do not give the player everything in Week 1. Do not gate everything behind the boss. Distribute progression evenly, with the midpoint binary choice as the biggest single state change.',
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
    '## Anti-Generic Doctrine',
    '- Every content field must earn its space by revealing, recontextualizing,',
    '  altering state, or exposing character through omission. No atmospheric filler.',
    '- No fragment should be transplantable unchanged into a different booklet.',
    '  If you removed the proper nouns, would it still feel specific? If yes, rewrite.',
    '- Later weeks must recontextualize earlier elements. Do not merely intensify',
    '  atmosphere or add more weirdness. The player&apos;s understanding must change.',
    '- Documents are authored for in-world purpose, not to impress the reader.',
    '  The author of each document does not know they are in a game.',
    '- Final reveals must resolve prior evidence, not introduce new core facts.',
    '- Endings pay off named earlier specifics (places, objects, phrases, relationships),',
    '  not summarize the plot.',
    '',
    '## Anti-Patterns (hard reject)',
    '- NEVER write story prompts that are gym metaphors ("your muscles burn like the reactor core", "each rep forges the blade"). The workout is real. The story is fiction. They fuse through timing and tension, not literal mapping.',
    '- NEVER create one-off maps that share no topology between weeks. The player must learn and master a persistent space.',
    '- NEVER make oracle entries that are only atmospheric prose ("a strange feeling washes over you"). Every oracle result must trigger a concrete game action or fiction event.',
    '- NEVER design boss decode as simple arithmetic on weekly values (subtract 40, divide by 3). The decode must require spatial mastery, institutional knowledge, or cross-reference of prior play state.',
    '- NEVER write cipher body displayText that explains its own method ("this uses a substitution cipher where…"). Present the puzzle, not the pedagogy.',
    '',
    '## Ending Standard',
    '- The ending is a found document first, not a summary.',
    '- Pay off at least three recurring details: object, place, relationship phrase, procedure, motif, or earlier contradiction.',
    '- The ending must reflect: (a) the binary choice the player made, (b) the boss encounter outcome, and (c) at least one relationship consequence.',
    '- If there are multiple ending variants, they should differ in emotional register and relationship resolution, not just plot outcome.',
    '- The final line should feel discrete and earned — a sentence the player remembers.',
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
    'before returning JSON. Do not mention this check in your output.',
    '',
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
    'state changes that reflect the campaign plan&apos;s stateChange for each week.',
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
    'is identical across variants, redesign one variant&apos;s emotional register.',
    '',
    'This gate is mandatory. Every content-producing response must pass it silently.'
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
      '## Randomizer',
      '',
      dice || 'd100',
      'If the player has no dice, use this note: No dice? Google "roll d100".',
      '',
      '---',
      '',
      INSTRUCTIONS
    ];

    return parts.join('\n');
  };

  // ── Week count + chunking utilities ────────────────────────────────────────

  window.parseWeekCount = function (workout) {
    var match = String(workout || '').match(/(\d+)\s*weeks?\b/i);
    var n = match ? parseInt(match[1], 10) : 6;
    return Math.max(4, Math.min(12, n || 6));
  };

  /**
   * planWeekChunks(weekCount) → [[weekNums], ...]
   * Dynamic chunker: isolates midpoint + boss, groups the rest in ≤ 3.
   */
  window.planWeekChunks = function (weekCount) {
    var midpoint = Math.ceil(weekCount / 2);
    var chunks = [];

    // Early weeks: 1 to midpoint-1, in groups of max 2
    var early = [];
    for (var i = 1; i < midpoint; i++) early.push(i);
    while (early.length > 0) chunks.push(early.splice(0, 2));

    // Midpoint: always isolated
    chunks.push([midpoint]);

    // Late weeks: midpoint+1 to weekCount-1, in groups of max 2
    var late = [];
    for (var i = midpoint + 1; i < weekCount; i++) late.push(i);
    while (late.length > 0) chunks.push(late.splice(0, 2));

    // Boss: always isolated
    chunks.push([weekCount]);

    return chunks;
  };

  /**
   * extractWeekWorkout(workout, weekNumbers) → string
   * Extracts workout sections for specific weeks. Falls back to full text.
   */
  window.extractWeekWorkout = function (workout, weekNumbers) {
    var text = String(workout || '');
    var weekPattern = /(?:^|\n)\s*(?:week\s*)(\d+)\s*[:\-\u2013\u2014]/gi;
    var matches = [];
    var m;
    while ((m = weekPattern.exec(text)) !== null) {
      matches.push({ weekNum: parseInt(m[1], 10), start: m.index });
    }
    if (matches.length === 0) return text;
    var sections = {};
    for (var i = 0; i < matches.length; i++) {
      var end = (i + 1 < matches.length) ? matches[i + 1].start : text.length;
      sections[matches[i].weekNum] = text.slice(matches[i].start, end).trim();
    }
    var result = [];
    weekNumbers.forEach(function (wn) {
      if (sections[wn]) result.push(sections[wn]);
    });
    return result.length > 0 ? result.join('\n\n') : text;
  };

  // ── Multi-stage prompt generators ───────────────────────────────────────────
  //
  // Additive to window.generatePrompt (single-pass, Chat + API Standard mode).
  //
  // Legacy full-compile chat path:
  //   generateStage1Prompt → generateStage2Prompt → generateStage3Prompt
  // The default manual flow now continues through shell / weeks / fragments / endings.
  //
  // API "Deep" mode (10-stage partial-JSON pipeline):
  //   Stage 1: Layer Bible
  //   Stage 2: Campaign Plan + Fragment Registry
  //   Stage 3: Booklet Shell (meta, cover, rules, theme)
  //   Stages 4..N-3: Week Chunks (dynamic, 2-3 weeks each)
  //   Stage N-2: Fragments (all found documents)
  //   Stage N-1: Endings
  //   Stage N: Patch (conditional, only if validation fails)
  //
  // Stage 1: Layer Bible  — compact 3-layer architecture planning JSON
  // Stage 2: Campaign Plan — per-week structure using the approved layer bible
  // Stage 3 (legacy chat): Final Compile — full booklet JSON retained only as fallback

  var STAGE1_OUTPUT_SCHEMA = JSON.stringify({
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
      informationLayers: ''
    },
    governingLayer: {
      institutionName: '',
      departments: [],
      proceduresThatAffectPlay: [],
      recordsAndForms: [],
      documentVoiceRules: []
    },
    designPrinciples: [],
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

  var STAGE2_OUTPUT_SCHEMA = JSON.stringify({
    topology: {
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
      requiredPriorKnowledge: []
    },
    fragmentRegistry: [
      {
        id: 'F.01',
        title: '',
        documentType: '',
        author: '',
        revealPurpose: '',
        clueFunction: '',
        weekRef: 1,
        sessionRef: null
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

  window.generateStage1Prompt = function (workout, brief, dice) {
    var blend = deriveDesignBlend(brief, workout);
    var parts = [
      '# Stage 1 — Layer Codex',
      '',
      'You are architecting a print-and-play solo workout journal with the structural',
      'depth of a stateful paper game. This is planning only — return the layer codex JSON.',
      '',
      '## Structural DNA (genre-neutral, non-negotiable)',
      '- **Persistent topology.** One map reused across weeks. Player revisits spaces with new understanding.',
      '- **Meaningful gating.** Locked areas have specific keys earned through play, not by week number.',
      '- **Environmental clueing.** Answers are in the map, documents, and oracle — not exposition.',
      '- **Information asymmetry.** Player knows less than the institution. Documents imply unseen systems.',
      '- **Accumulated consequence.** Choices and discoveries persist. Nothing resets between weeks.',
      '- **Clue economy.** Every fragment and oracle result advances an answerable question. No lore dumps.',
      '- **Earned convergence.** Boss decode pays off spatial mastery and institutional knowledge.',
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
      'can verify vs. what the institution claims vs. what the documents actually show),',
      'and exactly what boss convergence requires (list specific outputs: cipher values,',
      'cleared zones, companion states, oracle discoveries).',
      '',
      '### Governing Layer',
      'Define: institution name, departments, procedures that materially affect play',
      '(what paperwork grants access, what inspection triggers alert, what records change',
      'board state), recurring document types and their voice rules, and information',
      'classification hierarchy (what the player is cleared to see, what is redacted,',
      'what contradicts official records). The institution is the system the player',
      'navigates — its documents imply structures larger than the booklet contains.',
      '',
      '## Hard Targets',
      '- Topology: 1 persistent map, 3+ zones, 2+ locked in Week 1, opened through play.',
      '- Gating: every gate names its key. At least one gate requires outputs from 2 different weeks.',
      '- Oracle: 40%+ entries per week produce playable consequences (board state, clock, gate, companion).',
      '- Fragments: clue economy — early establish, midpoint complicate, late recontextualize. 3+ verifiable.',
      '- Overflow docs: institutional artifacts implying larger systems. 1+ contradicts an earlier fragment.',
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
      '- framing: how the institutional or relationship context shifted.',
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
      '## Randomizer',
      '',
      dice || 'd100',
      '',
      '---',
      '',
      '## Output Schema',
      '',
      STAGE1_OUTPUT_SCHEMA
    ];
    return parts.join('\n');
  };

  window.generateStage2Prompt = function (workout, brief, dice, layerBible) {
    var weekCount = window.parseWeekCount(workout);
    var midpoint = Math.ceil(weekCount / 2);
    var minReuse = Math.max(weekCount - 2, 3);
    var parts = [
      '# Stage 2 — Story Plan',
      '',
      'Using the approved layer codex, generate the per-week story plan.',
      'Do not output the final booklet JSON yet.',
      '',
      '## Approved Layer Codex',
      '',
      JSON.stringify(layerBible, null, 2),
      '',
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
      '- Oracle consequences should connect to the week&apos;s zone focus and active pressures.',
      '',
      '## Companion & Choice Doctrine',
      '- Each non-boss week must specify which named companion appears and how their stance changes.',
      '- companionChange must be specific: "X&apos;s trust increases because Y" — not "relationship develops."',
      '- The binary choice week must name: what the player gains from each option, what they lose,',
      '  and how at least one companion reacts differently based on the choice.',
      '- At least one companion&apos;s behavior in the final weeks depends on earlier player actions.',
      '',
      '## Arc Beat Assignment',
      '- Week 1: Setup (establish setting, protagonist role, core tension, constrained map — most zones locked)',
      '- Week 2: Complication (new pressure, first gate opened, companion introduces tension)',
      '- Week ' + midpoint + ': Reversal (binary choice recontextualizes evidence, costs a relationship,',
      '  reveals that an earlier clue meant something different than assumed)',
      '- Week ' + Math.max(weekCount - 2, midpoint + 1) + ': Deepening (darkest moment — relational or ethical cost,',
      '  an institutional system turns against the player, a trusted document is revealed as unreliable)',
      '- Week ' + (weekCount - 1) + ': Escalation (pressures converge, full map access, final preparation,',
      '  the player can now see the pattern connecting earlier fragments)',
      '- Week ' + weekCount + ': Boss (culmination — decode requires spatial mastery + institutional',
      '  knowledge + relationship state from prior weeks)',
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
      '- Aim for 15-22 fragments total, distributed across all non-boss weeks.',
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
      '- Stop after Stage 2.',
      '',
      '---',
      '',
      '## Output Schema',
      '',
      STAGE2_OUTPUT_SCHEMA
    ];
    return parts.join('\n');
  };

  window.generateStage3Prompt = function (workout, brief, dice, layerBible, campaignPlan) {
    var blend = deriveDesignBlend(brief, workout);
    var STAGE3_POSTCHECKS = [
      '',
      '## Stage 3 Postchecks — enforce before outputting',
      '- Oracle entries must use `text`, never `description`.',
      '- Fragment oracle entries (type: "fragment") must include `fragmentRef`.',
      '- Oracle tables need exactly 10 entries with roll bands "00-09" through "90-99".',
      '- `fieldOps.cipher.body` must be an object, not a string.',
      '- `interlude.payloadType` must be one of: "none" | "narrative" | "cipher" | "map" | "clock" | "companion" | "fragment-ref" | "password-element".',
      '- Verify every check before outputting. If any fails, fix it first.'
    ].join('\n');

    var TRANSLATION_GUIDE = [
      '## How to Use the Approved Plans',
      '',
      'The planning JSONs below are reference context. Do NOT output their format.',
      'Your output must be a single booklet JSON matching the schema above.',
      'Translate the planning fields into booklet fields as follows:',
      '',
      '- `storyLayer.premise` → `meta.worldContract`',
      '- `storyLayer.protagonist` → shape `sessions[].storyPrompt` and `endings`',
      '- `storyLayer.recurringMotifs` → weave into fragments, map labels, oracle entries',
      '- `storyLayer.midpointReversal` → the binary choice week\'s storyPrompt and oracle pressure',
      '- `storyLayer.bossTruth` → `bossEncounter.narrative` and `bossEncounter.convergenceProof`',
      '- `gameLayer.persistentTopology` → `fieldOps.mapState` (reuse across non-boss weeks)',
      '- `gameLayer.gatesAndKeys` → locked nodes, denied routes, interlude payloads',
      '- `gameLayer.persistentPressures` → `gameplayClocks` and oracle consequences',
      '- `gameLayer.companionSurfaces` → `companionComponents` types and state',
      '- `governingLayer.departments` → fragment `inWorldAuthor` sources',
      '- `governingLayer.proceduresThatAffectPlay` → cipher mechanics, oracle consequences, interlude payloads',
      '- `governingLayer.recordsAndForms` → `fragments[].documentType` and `designSpec`',
      '- `weeks[].zoneFocus` → each week\'s mapState tile/node labels and floorLabel',
      '- `weeks[].weeklyComponentMeaning` → `weeklyComponent.extractionInstruction`',
      '- `weeks[].oraclePressure` → `oracleTable` entries and consequences',
      '- `weeks[].fragmentFunction` → which `fragments[]` to assign to each week\'s oracle and sessions',
      '- `storyLayer.protagonist.need` → hidden arc in storyPrompts (want drives early weeks, need emerges by darkest moment)',
      '- `storyLayer.protagonist.wound` → shapes the darkest moment\'s specific cost',
      '- `storyLayer.darkestMoment` → the specific week\'s storyPrompt + oracle pressure',
      '- `storyLayer.resolutionMode` → endings tone and structure',
      '- `storyLayer.relationshipWeb[].name` → reuse in fragment `inWorldAuthor`, storyPrompt named references',
      '- `storyLayer.relationshipWeb[].arcFunction` → paced NPC revelation across weeks',
      '- `gameLayer.progressionGates` → what each week\'s cipher/oracle/interlude unlocks on the map',
      '- `gameLayer.boardStateArc` → mapState evolution week over week',
      '- `weeks[].arcBeat` → storyPrompt tone and intensity for that week',
      '- `weeks[].npcBeat` → which characters appear in storyPrompts and fragments that week',
      '- `weeks[].stateSnapshot` → mapState initial conditions for that week',
      '- `weeks[].playerGains` → cipher payoff, interlude payload, oracle consequence direction',
      '- `bossPlan.decodeLogic` → `bossEncounter.decodingKey`',
      '- `bossPlan.requiredPriorKnowledge` → `bossEncounter.componentInputs` ordering'
    ].join('\n');

    var parts = [
      '# Stage 3 — Final Compile',
      '',
      'You have completed planning. Now compile the final LiftRPG booklet JSON.',
      'Your output must be valid JSON matching the booklet schema below — nothing else.',
      '',
      '---',
      '',
      SCHEMA_SPEC,
      '',
      '---',
      '',
      TRANSLATION_GUIDE,
      '',
      '## Reference Context (do not output these formats — they inform your decisions)',
      '',
      '### Approved Layer Codex',
      JSON.stringify(layerBible),
      '',
      '### Approved Story Plan',
      JSON.stringify(campaignPlan),
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
      '## Randomizer',
      '',
      dice || 'd100',
      'If the player has no dice, use this note: No dice? Google "roll d100".',
      '',
      '---',
      '',
      INSTRUCTIONS,
      STAGE3_POSTCHECKS
    ];
    return parts.join('\n');
  };

  // ── 10-Stage Partial-JSON Pipeline Generators ─────────────────────────────
  //
  // These produce prompts for the API-only 10-stage pipeline.
  // Each stage outputs partial JSON that the JS assembler merges.

  // Schema subsets for partial-JSON stages
  var SCHEMA_SHELL = [].concat(
    SCHEMA_HEADER, [''],
    SCHEMA_META, [''],
    SCHEMA_THEME, [''],
    SCHEMA_TAIL
  ).join('\n');

  var SCHEMA_WEEKS = [].concat(
    ['# LiftRPG Week Schema — Partial Output'],
    [''],
    ['Output a JSON object with a single `weeks` array containing only the requested weeks.'],
    [''],
    SCHEMA_WEEKS_PRE, [''],
    SCHEMA_SPATIAL, [''],
    SCHEMA_WEEKS_POST
  ).join('\n');

  var SCHEMA_FRAGS = [].concat(
    ['# LiftRPG Fragment Schema — Partial Output'],
    [''],
    ['Output a JSON object with a single `fragments` array containing all found documents.'],
    [''],
    SCHEMA_FRAGMENTS
  ).join('\n');

  var SCHEMA_ENDINGS = [].concat(
    ['# LiftRPG Endings Schema — Partial Output'],
    [''],
    ['Output a JSON object with a single `endings` array.'],
    [''],
    SCHEMA_TAIL
  ).join('\n');

  /**
   * Stage 3 (API pipeline): Booklet Shell — meta, cover, rulesSpread, theme
   */
  window.generateShellPrompt = function (brief, layerBible, campaignPlan) {
    var blendContext = buildBlendContextFromPlans(layerBible, campaignPlan);
    var blend = deriveDesignBlend(brief, blendContext);
    var weekCount = (campaignPlan.weeks || []).length || 6;
    var parts = [
      '# Booklet Setup — meta, cover, rulesSpread, theme',
      '',
      'Generate the booklet infrastructure as a partial JSON object.',
      'Output a JSON object with exactly these top-level keys: meta, cover, rulesSpread, theme.',
      'Do NOT output weeks, fragments, or endings — those come in later stages.',
      '',
      '---',
      '',
      SCHEMA_SHELL,
      '',
      '---',
      '',
      '## Reference Context (do not output these formats)',
      '',
      '### Approved Layer Codex',
      JSON.stringify(layerBible),
      '',
      '### Approved Story Plan (summary)',
      JSON.stringify({
        weekCount: weekCount,
        bossPlan: campaignPlan.bossPlan,
        fragmentCount: (campaignPlan.fragmentRegistry || []).length
      }),
      '',
      '---',
      '',
      '## Creative Direction',
      '',
      brief || buildDefaultBrief(blendContext, blend),
      '',
      formatDesignBias(blend),
      '',
      '## Booklet Setup Requirements',
      '',
      '### Structural',
      '- meta.weekCount must equal ' + weekCount,
      '- meta.weeklyComponentType should match the layer codex&apos;s game layer',
      '- meta.passwordLength should match the number of non-boss weeks (' + (weekCount - 1) + ')',
      '- meta.passwordEncryptedEnding: omit it or leave it empty; trusted tooling seals the ending later',
      '- meta.artifactIdentity is required. It is a renderer-facing contract, not flavor text.',
      '- meta.artifactIdentity.shellFamily must be one of: field-survey, classified-packet, ship-logbook, witness-binder, court-packet, devotional-manual, household-archive, technical-manual',
      '- meta.artifactIdentity.attachmentStrategy must be one of: split-technical, single-dominant, narrative-support, appendix-split',
      '',
      '### World Contract',
      'meta.worldContract is the single most important string in the booklet.',
      'It is NOT a plot summary. It is the governing question or tension the reader carries',
      'through every session. Write it as a premise the reader tests against the evidence.',
      'Pattern: "[Setting] where [ordinary situation] is complicated by [destabilizing force],',
      'raising the question of [what the reader will try to determine]."',
      'Max 2 sentences. The entire booklet must justify itself through this contract.',
      '',
      '### Narrative Voice (meta.narrativeVoice)',
      '- person/tense: choose what creates the right distance for this fiction.',
      '- narratorStance: not "third person limited" — describe how the narrator relates to',
      '  the protagonist&apos;s perception, vocabulary, and blind spots. Specific enough that',
      '  a later stage could write a paragraph matching this stance without other guidance.',
      '- voiceRationale: why this voice serves the world contract (not just "it felt right").',
      '',
      '### Literary Register (meta.literaryRegister)',
      '- name: a 2-3 word label for the prose style (e.g. "Pastoral Waterlog", "Clinical Redline").',
      '- behaviorDescription: describe the register as if briefing a ghostwriter. What does this',
      '  prose DO? How does it earn its nouns? What does it refuse? Include diction, pacing,',
      '  sentence rhythm, and what the prose uses instead of adjectives that editorialize.',
      '- forbiddenMoves: 3-5 specific writing moves that violate this register.',
      '  These are prose-level bans, not theme bans. Examples: "metaphors referencing anything',
      '  outside the setting", "interior monologue explaining feelings", "sentences that could',
      '  appear in a Lovecraft story."',
      '',
      '### Structural Shape (meta.structuralShape)',
      '- resolution, temporalOrder, narratorReliability, promptFragmentRelationship:',
      '  choose values that create genuine structural variation. Not every booklet should be',
      '  "partial / fragmented / multiple / fragments-deepen." Choose what this fiction needs.',
      '',
      '### Cover & Rules Spread',
      '- Cover title and designation must feel like a real artifact: a dossier, journal,',
      '  field report, operations manual, maintenance log, or similar in-world object.',
      '- The cover, rules spread, sealed page, and password assembly must all feel like the SAME object family.',
      '- Rules sections must explain the play cadence diegetically, using the layer codex&apos;s',
      '  governing procedures. A player who reads only the rules spread should understand',
      '  what the institution expects them to do and why the weekly routine matters.',
      '',
      '### Visual Archetype & Theme',
      '- Choose the archetype that serves the fiction — not always "government."',
      '- Palette: 6 hex colors (ink, paper, accent, muted, rule, fog) that feel',
      '  like the world&apos;s stationery. A government archive, a coastal field office,',
      '  a corporate clinic, and a maritime station all have different paper.',
      '',
      '---',
      '',
      INSTRUCTIONS
    ];
    return parts.join('\n');
  };

  /**
   * Stage 4..N-3 (API pipeline): Week Chunk — partial weeks[] array
   *
   * @param {string} workout - Full workout text
   * @param {string} brief - Creative direction
   * @param {object} layerBible - Stage 1 output
   * @param {object} campaignPlan - Stage 2 output
   * @param {number[]} weekNumbers - Which weeks to generate (e.g. [1,2] or [3])
   * @param {object|null} continuity - Enriched continuity packet from buildChunkContinuity(), or null for first chunk
   * @param {Array} allComponentValues - Accumulated weeklyComponent.value from prior chunks
   * @param {object|null} shellContext - Shell-level narrative constraints { worldContract, narrativeVoice, literaryRegister, structuralShape }
   */
  window.generateWeekChunkPrompt = function (workout, brief, layerBible, campaignPlan, weekNumbers, continuity, allComponentValues, shellContext) {
    var blend = deriveDesignBlend(brief, workout);
    var weekCount = (campaignPlan.weeks || []).length || 6;
    var isBossChunk = weekNumbers.indexOf(weekCount) !== -1;

    // Filter campaign plan to just the relevant weeks
    var relevantPlanWeeks = (campaignPlan.weeks || []).filter(function (pw) {
      return weekNumbers.indexOf(pw.weekNumber) !== -1;
    });

    // Extract workout data for these specific weeks
    var weekWorkout = window.extractWeekWorkout(workout, weekNumbers);

    var weekLabel = weekNumbers.length === 1
      ? 'Week ' + weekNumbers[0]
      : 'Weeks ' + weekNumbers[0] + '-' + weekNumbers[weekNumbers.length - 1];

    var parts = [
      '# Generate ' + weekLabel + (isBossChunk ? ' (Boss Week)' : ''),
      '',
      'Generate a partial JSON object with a single `weeks` array containing',
      weekNumbers.length === 1 ? '1 week object.' : weekNumbers.length + ' week objects.',
      'Output ONLY the weeks requested. Do not output meta, cover, fragments, or endings.',
      '',
      '---',
      '',
      SCHEMA_WEEKS,
      '',
      '---',
      '',
      '## Reference Context',
      '',
      '### Approved Layer Codex',
      JSON.stringify(layerBible),
      '',
      '### Story Plan for ' + weekLabel,
      JSON.stringify(relevantPlanWeeks),
      '',
      '### Fragment Registry (use these IDs for fragmentRef in sessions and oracle entries)',
      JSON.stringify(campaignPlan.fragmentRegistry || []),
      ''
    ];

    // Overflow document plan — inject planned overflow docs for these weeks
    var overflowRegistry = campaignPlan.overflowRegistry || [];
    var relevantOverflows = overflowRegistry.filter(function (entry) {
      return weekNumbers.indexOf(entry.weekNumber) !== -1;
    });
    if (relevantOverflows.length > 0) {
      parts.push('### Planned Overflow Documents (generate these exactly when overflow is true)');
      parts.push('When a week has > 3 sessions, it gets overflow: true and needs an overflowDocument.');
      parts.push('Use the planned document below instead of inventing one:');
      parts.push(JSON.stringify(relevantOverflows, null, 2));
      parts.push('');
    }

    // Shell-level narrative constraints (voice, register, world contract)
    if (shellContext) {
      parts.push('### Narrative Constraints (from booklet shell — follow these exactly)');
      if (shellContext.worldContract) {
        parts.push('**World Contract:** ' + shellContext.worldContract);
      }
      if (shellContext.narrativeVoice) {
        parts.push('**Narrative Voice:** ' + JSON.stringify(shellContext.narrativeVoice));
      }
      if (shellContext.literaryRegister) {
        parts.push('**Literary Register:** ' + JSON.stringify(shellContext.literaryRegister));
      }
      if (shellContext.structuralShape) {
        parts.push('**Structural Shape:** ' + JSON.stringify(shellContext.structuralShape));
      }
      if (shellContext.artifactIdentity) {
        parts.push('**Artifact Identity Contract:** ' + JSON.stringify(shellContext.artifactIdentity));
        parts.push('Do not flatten this into a generic ops dossier. Preserve shellFamily, boardStateMode, openingMode, rulesDeliveryMode, and unlockLogic.');
      }
      parts.push('');
    }

    // Continuity from prior weeks (enriched packet from api-generator)
    if (continuity && continuity.weekCount > 0) {
      parts.push('### Story So Far (continuity from weeks 1\u2013' + continuity.weekCount + ')');
      parts.push('');

      // Week titles for narrative thread awareness
      if (continuity.weekSummaries && continuity.weekSummaries.length > 0) {
        parts.push('**Week titles:**');
        continuity.weekSummaries.forEach(function (ws) {
          parts.push('- Week ' + ws.week + ': ' + ws.title);
        });
        parts.push('');
      }

      // Cipher progression (type escalation awareness)
      if (continuity.cipherProgression && continuity.cipherProgression.length > 0) {
        parts.push('**Cipher types used so far** (do not repeat the same type):');
        continuity.cipherProgression.forEach(function (cp) {
          parts.push('- Week ' + cp.week + ': ' + cp.type + (cp.title ? ' \u2014 ' + cp.title : ''));
        });
        parts.push('');
      }

      // Component values collected
      if (continuity.componentValues && continuity.componentValues.length > 0) {
        parts.push('**Weekly component values collected:**');
        continuity.componentValues.forEach(function (cv) {
          parts.push('- Week ' + cv.week + ': ' + cv.value);
        });
        parts.push('');
      }

      // Fragment refs already used (avoid re-assigning)
      if (continuity.usedFragmentRefs && continuity.usedFragmentRefs.length > 0) {
        parts.push('**Fragment IDs already assigned** (do not reuse): ' + continuity.usedFragmentRefs.join(', '));
        parts.push('');
      }

      // Overflow documents generated so far
      if (continuity.overflowDocs && continuity.overflowDocs.length > 0) {
        parts.push('**Overflow documents generated:**');
        continuity.overflowDocs.forEach(function (od) {
          parts.push('- Week ' + od.week + ': ' + od.id + ' (' + od.documentType + (od.author ? ' by ' + od.author : '') + ')');
        });
        parts.push('');
      }

      // Recent oracle context
      if (continuity.recentOracles && continuity.recentOracles.length > 0) {
        parts.push('**Recent oracle tables:**');
        continuity.recentOracles.forEach(function (o) {
          var detail = 'Week ' + o.week + ': ' + o.entryCount + ' entries';
          if (o.fragmentRefs) detail += ', refs: ' + o.fragmentRefs.join(', ');
          if (o.paperActions) detail += ', actions: ' + o.paperActions.join('; ');
          parts.push('- ' + detail);
        });
        parts.push('');
      }

      // Map progression
      if (continuity.mapProgression) {
        var mp = continuity.mapProgression;
        parts.push('**Map state** (' + mp.mapType + (mp.title ? ', ' + mp.title : '') + '):');
        if (mp.mapType === 'point-to-point') {
          parts.push('- Nodes: ' + mp.nodeCount + ', edges: ' + mp.edgeCount);
          if (mp.currentNode) parts.push('- Current node: ' + mp.currentNode);
          if (mp.notableNodes && mp.notableNodes.length > 0) {
            parts.push('- Notable nodes: ' + mp.notableNodes.join('; '));
          }
        } else if (mp.mapType === 'linear-track') {
          parts.push('- Positions: ' + mp.positionCount + ', direction: ' + mp.direction);
          if (mp.currentPosition !== undefined && mp.currentPosition !== null) {
            parts.push('- Current position: ' + mp.currentPosition);
          }
          if (mp.notablePositions && mp.notablePositions.length > 0) {
            parts.push('- Notable positions: ' + mp.notablePositions.join('; '));
          }
        } else if (mp.mapType === 'player-drawn') {
          if (mp.dimensions) {
            parts.push('- Canvas: ' + mp.canvasType + ' (' + mp.dimensions.columns + '\u00d7' + mp.dimensions.rows + ')');
          } else {
            parts.push('- Canvas: ' + mp.canvasType);
          }
          parts.push('- Seed markers: ' + mp.seedMarkerCount + ', prompts: ' + mp.promptCount);
          if (mp.seedMarkers && mp.seedMarkers.length > 0) {
            parts.push('- Seed markers: ' + mp.seedMarkers.join('; '));
          }
        } else {
          parts.push('- Grid: ' + mp.gridDimensions.columns + '\u00d7' + mp.gridDimensions.rows);
          parts.push('- Current position: row ' + mp.currentPosition.row + ', col ' + mp.currentPosition.col);
          parts.push('- Tiles: ' + mp.tileCount + ' total, ' + mp.anomalyCount + ' anomaly, ' + mp.inaccessibleCount + ' inaccessible');
          if (mp.notableAnnotations && mp.notableAnnotations.length > 0) {
            parts.push('- Notable: ' + mp.notableAnnotations.join('; '));
          }
        }
        if (mp.floorLabel) parts.push('- Last label: ' + mp.floorLabel);
        if (mp.mapNote) parts.push('- Last note: ' + mp.mapNote);
        parts.push('- Preserve this topology family unless the campaign plan explicitly calls for a zoom or overlay shift.');
        parts.push('');
      }

      // Gameplay clocks
      if (continuity.clocks && continuity.clocks.length > 0) {
        parts.push('**Active clocks:** ' + JSON.stringify(continuity.clocks));
        parts.push('');
      }

      // Binary choice state
      if (continuity.binaryChoice) {
        parts.push('**Binary choice already occurred** in Week ' + continuity.binaryChoice.week + ': ' + continuity.binaryChoice.choiceLabel);
        parts.push('Do NOT add another binaryChoice in this chunk.');
        parts.push('');
      }
    }

    // Boss needs all prior component values
    if (isBossChunk && allComponentValues.length > 0) {
      parts.push('### Prior Weekly Component Values (for bossEncounter.componentInputs)');
      parts.push('These values were collected from weeks 1-' + (weekCount - 1) + ' in order:');
      parts.push(JSON.stringify(allComponentValues));
      parts.push('The boss decodingKey must convert these values to letters.');
      parts.push('');
    }

    parts.push('---');
    parts.push('');
    parts.push('## Workout Programme for ' + weekLabel);
    parts.push('');
    parts.push(weekWorkout);
    parts.push('');
    parts.push('## Creative Direction');
    parts.push('');
    parts.push(brief || buildDefaultBrief(workout, blend));
    parts.push('');
    parts.push(formatDesignBias(blend));
    parts.push('');

    // Week-specific requirements
    parts.push('## Requirements for ' + weekLabel);
    relevantPlanWeeks.forEach(function (pw) {
      parts.push('');
      parts.push('### Week ' + pw.weekNumber);
      parts.push('- arcBeat: ' + (pw.arcBeat || 'unspecified'));
      parts.push('- playerGains: ' + (pw.playerGains || 'unspecified'));
      if (pw.zoneFocus) parts.push('- zoneFocus: ' + pw.zoneFocus);
      if (pw.stateChange) parts.push('- stateChange: ' + pw.stateChange);
      if (pw.newGateOrUnlock) parts.push('- newGateOrUnlock: ' + pw.newGateOrUnlock);
      if (pw.oraclePressure) parts.push('- oraclePressure: ' + pw.oraclePressure);
      if (pw.fragmentFunction) parts.push('- fragmentFunction: ' + pw.fragmentFunction);
      if (pw.companionChange) parts.push('- companionChange: ' + pw.companionChange);
      if (pw.weeklyComponentMeaning) parts.push('- weeklyComponentMeaning: ' + pw.weeklyComponentMeaning);
      if (pw.isBinaryChoiceWeek) {
        parts.push('- **BINARY CHOICE week** — include binaryChoice in one session.');
      }
      if (pw.isBossWeek) {
        parts.push('- **BOSS week** — use bossEncounter instead of fieldOps.');
      }
      var plannedOF = relevantOverflows.filter(function (o) { return o.weekNumber === pw.weekNumber; })[0];
      if (plannedOF) {
        parts.push('- Planned overflow: ' + plannedOF.id + ' (' + plannedOF.documentType +
          ' by ' + (plannedOF.author || 'unknown') + ').');
        if (plannedOF.narrativeFunction) parts.push('  Function: ' + plannedOF.narrativeFunction);
      }
    });
    parts.push('');

    // Artifact-grade week construction doctrine
    parts.push('## Week Construction Doctrine');
    parts.push('');
    parts.push('### Story Prompts');
    parts.push('- Each storyPrompt is 2-4 sentences containing one physical action, one sensory');
    parts.push('  detail, and one named object or place from the layer codex.');
    parts.push('- Prompts must advance the mystery or alter a relationship — not just describe atmosphere.');
    parts.push('- At least one prompt per week must reference a specific map node, fragment, or clock by name.');
    parts.push('- End on unresolved pressure. Never resolve a story beat at session end.');
    parts.push('');
    parts.push('### Map State');
    parts.push('- The map must reflect this week&apos;s stateChange from the campaign plan.');
    parts.push('- Preserve the established mapType unless the campaign plan explicitly justifies a zoom or overlay shift.');
    parts.push('- Do not silently collapse point-to-point, linear-track, or player-drawn spaces into a grid.');
    parts.push('- Tiles changed from prior weeks: update type (locked→cleared, empty→anomaly, etc.).');
    parts.push('- New tiles must have labels drawn from the layer codex&apos;s governing layer or topology.');
    parts.push('- currentPosition must make spatial sense given the zone focus.');
    parts.push('- mapNote must describe what is observably different this week, not repeat prior notes.');
    parts.push('');
    parts.push('### Cipher');
    parts.push('- The cipher must produce the planned weeklyComponent.value through a solvable mechanic.');
    parts.push('- cipher.body.displayText presents the puzzle in-world. cipher.body.key is the answer.');
    parts.push('- extractionInstruction tells the player exactly which number/code to extract.');
    parts.push('- characterDerivationProof explains how the value derives from the puzzle (for validation).');
    parts.push('- Do not explain the cipher method in displayText. Present the puzzle, not the pedagogy.');
    parts.push('- Each week must use a different cipher family than the prior week.');
    parts.push('');
    parts.push('### Oracle Table');
    parts.push('- Use exactly 10 oracle entries with d100 roll bands "00-09" through "90-99".');
    parts.push('- At least 4 entries must produce a playable consequence: a paperAction that names');
    parts.push('  a specific clock, map node, or companion by label. No vague "something changes."');
    parts.push('- Fragment-type entries must include fragmentRef pointing to a real fragment ID.');
    parts.push('- Consequence-type entries must have paperAction naming a specific target.');
    parts.push('- Oracle entries should connect to this week&apos;s zone focus and active pressures.');
    parts.push('');
    parts.push('### Overflow Document');
    parts.push('- If overflow is true, the overflowDocument is an institutional artifact — a memo,');
    parts.push('  inspection report, internal letter, or procedural form.');
    parts.push('- It must feel authored by someone with an in-world job, not by a storyteller.');
    parts.push('- Include at least one irrelevant operational detail (a date, a reference number,');
    parts.push('  a routing instruction) that makes the document feel real.');
    parts.push('- The document must do narrative work: establish a procedure, reveal a contradiction,');
    parts.push('  or provide evidence the player can cross-reference against other material.');
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push(INSTRUCTIONS);

    var WEEK_CHUNK_POSTCHECKS = [
      '',
      '## Output Postchecks — verify before outputting',
      '- Your output MUST be exactly `{ "weeks": [...] }` — do not wrap it in any other key.',
      '- Do NOT output meta, cover, rulesSpread, theme, fragments, or endings.',
      '- Non-boss weeks: include `fieldOps`, do NOT include `bossEncounter`.',
      '- Boss week: `isBossWeek: true`, include `bossEncounter`, omit `fieldOps`.',
      '- Oracle entries use `text` (string), not `description` or `label`.',
      '- Oracle `type: \"fragment\"` entries must include `fragmentRef`.',
      '- Oracle tables: exactly 10 entries with roll bands "00-09" through "90-99".',
      '- `cipher.body` is an object, not a string.',
      '- Escape all double-quote characters inside string values as \\". Use em-dashes instead of quoted speech where possible.',
    ].join('\n');
    parts.push(WEEK_CHUNK_POSTCHECKS);

    return parts.join('\n');
  };

  /**
   * Stage N-2 (API pipeline): Fragments — all found documents
   *
   * @param {object} layerBible - Stage 1 output
   * @param {object} campaignPlan - Stage 2 output (with fragmentRegistry)
   * @param {object[]} weekSummaries - Compact summaries extracted from generated weeks
   */
  window.generateFragmentsPrompt = function (layerBible, campaignPlan, weekSummaries, shellContext) {
    var parts = [
      '# Generate Bonus Pages',
      '',
      'Generate a partial JSON object with a single `fragments` array.',
      'This array contains ALL found documents for the entire booklet.',
      'Output ONLY the fragments array. Do not output weeks, meta, or endings.',
      '',
      '---',
      '',
      SCHEMA_FRAGS,
      '',
      '---',
      '',
      '## Fragment Registry (your contract — generate one fragment per entry)',
      '',
      JSON.stringify(campaignPlan.fragmentRegistry || [], null, 2),
      '',
      '## Reference Context',
      '',
      '### Approved Layer Codex',
      JSON.stringify(layerBible),
      ''
    ];

    // Voice/register constraints from the shell
    if (shellContext) {
      parts.push('### Narrative Constraints (from booklet shell — fragments must honour these)');
      if (shellContext.worldContract) parts.push('**World Contract:** ' + shellContext.worldContract);
      if (shellContext.narrativeVoice) parts.push('**Narrative Voice:** ' + JSON.stringify(shellContext.narrativeVoice));
      if (shellContext.literaryRegister) parts.push('**Literary Register:** ' + JSON.stringify(shellContext.literaryRegister));
      if (shellContext.artifactIdentity) {
        parts.push('**Artifact Identity Contract:** ' + JSON.stringify(shellContext.artifactIdentity));
        parts.push('Fragments must read like documents from this artifact family, not generic clue memos.');
      }
      parts.push('');
    }

    parts.push('### Campaign Narrative (what happened in the weeks — use for cross-references)');
    parts.push('');

    renderWeekSummaryLines(parts, weekSummaries);

    parts.push('---');
    parts.push('');
    parts.push('## Fragment Construction Doctrine');
    parts.push('');
    parts.push('### Contract');
    parts.push('- Generate exactly one fragment per registry entry, using the assigned IDs.');
    parts.push('- Honour the registry&apos;s clueFunction tag: "establishes" fragments plant baseline');
    parts.push('  facts, "complicates" fragments contradict or add nuance, "reveals" fragments');
    parts.push('  answer a question or recontextualize earlier evidence.');
    parts.push('');
    parts.push('### Document Authenticity');
    parts.push('- Each fragment is a real document that someone wrote for an in-world reason.');
    parts.push('  The author does not know they are in a game.');
    parts.push('- Include at least one irrelevant operational detail per fragment: a routing number,');
    parts.push('  a date stamp, a cc: line, a weather note, a reference to an unrelated procedure.');
    parts.push('  This detail makes the document feel found, not composed.');
    parts.push('- designSpec must match the document type: a memo from maintenance has different paper,');
    parts.push('  typeface, and header style than a personal letter or an inspection form.');
    parts.push('- If the document has redactions, every redaction must do narrative work — it conceals');
    parts.push('  something the player can partially reconstruct from other evidence.');
    parts.push('');
    parts.push('### Narrative Function');
    parts.push('- Authors from the relationship web reveal their blind spots, not just their knowledge.');
    parts.push('  Different characters noticing different things about the same event is more powerful');
    parts.push('  than different characters knowing different facts.');
    parts.push('- At least one incident, place, or procedure must recur across multiple fragments,');
    parts.push('  described differently by different authors.');
    parts.push('- Include at least three linked functions across the set: one artifact that changes');
    parts.push('  what the player does (action), one that changes what the player believes');
    parts.push('  (interpretation), and one that deepens a named character&apos;s stakes.');
    parts.push('- Every fragment must support at least one cross-reference: a place named on the map,');
    parts.push('  a date that aligns with a week&apos;s events, a person mentioned in a storyPrompt,');
    parts.push('  or a value that connects to a cipher output.');
    parts.push('');
    parts.push('### Anti-Generic Test');
    parts.push('- If you removed the proper nouns from a fragment, would it still feel specific');
    parts.push('  to THIS booklet? If no, the voice and detail are too generic. Rewrite.');
    parts.push('- Fragments that merely summarize lore fail. Every fragment must contain either');
    parts.push('  a clue, a contradiction, evidence of omission, or a procedural detail that');
    parts.push('  the player can cross-reference against other material.');
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push(INSTRUCTIONS);

    parts.push('');
    parts.push('## Output Postchecks — verify before outputting');
    parts.push('- Your output MUST be exactly `{ "fragments": [...] }` — do not wrap it in any other key.');
    parts.push('- Do NOT output weeks, meta, cover, endings, or any other top-level key.');
    parts.push('- Generate exactly one fragment object per registry entry, using the assigned ID.');
    parts.push('- `documentType` must be one of: memo, report, inspection, fieldNote, correspondence, letter, transcript, form, anomaly.');
    parts.push('- Escape all double-quote characters inside string values as \\". Use em-dashes instead of quoted speech where possible.');

    return parts.join('\n');
  };

  /**
   * Internal: render week summary lines into a parts array.
   * Shared between monolithic and batch fragment prompts.
   */
  function renderWeekSummaryLines(parts, weekSummaries) {
    (weekSummaries || []).forEach(function (ws) {
      parts.push('**Week ' + ws.weekNumber + ': ' + ws.title + '**');
      if (ws.sessions) {
        ws.sessions.forEach(function (s) {
          if (s.storyPrompt) {
            parts.push('- Session ' + s.index + ': ' + s.storyPrompt.slice(0, 120));
          }
        });
      }
      if (ws.fragmentRefs && ws.fragmentRefs.length > 0) {
        parts.push('- Session fragmentRefs: ' + ws.fragmentRefs.join(', '));
      }
      if (ws.cipher) {
        var cipherLine = '- Cipher (' + ws.cipher.type + '): ' + ws.cipher.title;
        if (ws.cipher.extractionInstruction) {
          cipherLine += ' \u2014 ' + ws.cipher.extractionInstruction;
        }
        parts.push(cipherLine);
      }
      if (ws.oracle && ws.oracle.fragmentLinked && ws.oracle.fragmentLinked.length > 0) {
        parts.push('- Oracle fragment refs: ' + ws.oracle.fragmentLinked.join(', '));
      }
      if (ws.overflowDocument) {
        parts.push('- Overflow doc: ' + ws.overflowDocument.id + ' (' + ws.overflowDocument.documentType + ')');
      }
      if (ws.mapState && ws.mapState.mapNote) {
        parts.push('- Map note: ' + ws.mapState.mapNote);
      }
      if (ws.weeklyComponent) {
        parts.push('- Component value: ' + ws.weeklyComponent.value);
      }
      if (ws.binaryChoice) {
        parts.push('- BINARY CHOICE: ' + ws.binaryChoice.choiceLabel);
      }
      if (ws.bossEncounter) {
        parts.push('- BOSS: ' + ws.bossEncounter.title + ' \u2014 inputs: [' + (ws.bossEncounter.componentInputs || []).join(', ') + ']');
      }
      parts.push('');
    });
  }

  /**
   * Stage N-2 (API pipeline): Fragment Batch — subset of fragments for specific weeks.
   *
   * @param {object} layerBible - Stage 1 output
   * @param {object[]} batchRegistry - Subset of fragmentRegistry entries for this batch
   * @param {object[]} batchWeekSummaries - Week summaries relevant to this batch
   * @param {object[]} allWeekSummaries - Full week summaries (for cross-reference context)
   * @param {object[]} priorFragments - Fragments from earlier batches (for continuity)
   * @param {number} batchIndex - 0-based batch index
   * @param {number} totalBatches - Total number of batches
   */
  window.generateFragmentBatchPrompt = function (layerBible, batchRegistry, batchWeekSummaries, allWeekSummaries, priorFragments, batchIndex, totalBatches, shellContext) {
    var parts = [
      '# Generate Fragment Batch ' + (batchIndex + 1) + ' of ' + totalBatches,
      '',
      'Generate a partial JSON object with a single `fragments` array.',
      'This batch contains ' + batchRegistry.length + ' fragments.',
      'Output ONLY the fragments array. Do not output weeks, meta, or endings.',
      '',
      '---',
      '',
      SCHEMA_FRAGS,
      '',
      '---',
      '',
      '## Fragment Registry (your contract — generate exactly these fragments)',
      '',
      JSON.stringify(batchRegistry, null, 2),
      '',
      '## Reference Context',
      '',
      '### Approved Layer Codex',
      JSON.stringify(layerBible),
      ''
    ];

    // Voice/register constraints from the shell
    if (shellContext) {
      parts.push('### Narrative Constraints (from booklet shell — fragments must honour these)');
      if (shellContext.worldContract) parts.push('**World Contract:** ' + shellContext.worldContract);
      if (shellContext.narrativeVoice) parts.push('**Narrative Voice:** ' + JSON.stringify(shellContext.narrativeVoice));
      if (shellContext.literaryRegister) parts.push('**Literary Register:** ' + JSON.stringify(shellContext.literaryRegister));
      if (shellContext.artifactIdentity) {
        parts.push('**Artifact Identity Contract:** ' + JSON.stringify(shellContext.artifactIdentity));
        parts.push('Do not normalize this batch into generic reports. Preserve the approved artifact family and document ecology.');
      }
      parts.push('');
    }

    // Prior fragments from earlier batches — establishes voice, variety, continuity
    if (priorFragments && priorFragments.length > 0) {
      parts.push('### Already-Generated Fragments (earlier batches — maintain voice continuity, avoid repetition)');
      parts.push('');
      priorFragments.forEach(function (f) {
        var line = '- **' + f.id + '** (' + f.documentType + ')';
        if (f.inWorldAuthor) line += ' by ' + f.inWorldAuthor;
        if (f.inWorldPurpose) line += ' \u2014 ' + f.inWorldPurpose;
        parts.push(line);
      });
      parts.push('');
    }

    // Primary context: weeks this batch is associated with
    parts.push('### Campaign Narrative \u2014 Focus Weeks');
    parts.push('');
    renderWeekSummaryLines(parts, batchWeekSummaries);

    // Broader context: other weeks (compact, for cross-reference only)
    var focusWeekNums = {};
    batchWeekSummaries.forEach(function (ws) { focusWeekNums[ws.weekNumber] = true; });
    var otherWeeks = (allWeekSummaries || []).filter(function (ws) {
      return !focusWeekNums[ws.weekNumber];
    });
    if (otherWeeks.length > 0) {
      parts.push('### Other Weeks (for cross-reference only)');
      parts.push('');
      otherWeeks.forEach(function (ws) {
        var line = '**Week ' + ws.weekNumber + ': ' + ws.title + '**';
        if (ws.fragmentRefs && ws.fragmentRefs.length > 0) {
          line += ' \u2014 refs: ' + ws.fragmentRefs.join(', ');
        }
        parts.push(line);
      });
      parts.push('');
    }

    parts.push('---');
    parts.push('');
    parts.push('## Fragment Construction Doctrine');
    parts.push('');
    parts.push('### Contract');
    parts.push('- Generate exactly one fragment per registry entry, using the assigned IDs.');
    parts.push('- Honour the registry&apos;s clueFunction tag: "establishes" fragments plant baseline');
    parts.push('  facts, "complicates" fragments contradict or add nuance, "reveals" fragments');
    parts.push('  answer a question or recontextualize earlier evidence.');
    parts.push('');
    parts.push('### Document Authenticity');
    parts.push('- Each fragment is a real document written for an in-world reason.');
    parts.push('  The author does not know they are in a game.');
    parts.push('- Include at least one irrelevant operational detail per fragment: a routing number,');
    parts.push('  a date stamp, a cc: line, a weather note, a reference to an unrelated procedure.');
    parts.push('- designSpec must match the document type and its in-world origin.');
    parts.push('- Redactions must do narrative work — concealing something partially reconstructable.');
    parts.push('');
    parts.push('### Narrative Function');
    parts.push('- Authors reveal blind spots, not just knowledge. Different characters noticing');
    parts.push('  different things about the same event beats different characters knowing different facts.');
    parts.push('- Every fragment must support at least one cross-reference: a map place, a date,');
    parts.push('  a person from a storyPrompt, or a value connected to a cipher output.');

    if (batchIndex === 0) {
      parts.push('');
      parts.push('### Batch Position: First');
      parts.push('- Establish the documentary voice, setting texture, and recurring incidents.');
      parts.push('- Plant baseline facts that later batches will complicate or recontextualize.');
      parts.push('- At least one fragment must name a place or procedure that appears on the map.');
    } else if (batchIndex === totalBatches - 1) {
      parts.push('');
      parts.push('### Batch Position: Final');
      parts.push('- These fragments recontextualize earlier material, reveal hidden truths,');
      parts.push('  or betray expectations set by earlier documents.');
      parts.push('- Reference specific details from earlier fragments by name or implication.');
      parts.push('- At least one fragment must make the player re-read an earlier document differently.');
    } else {
      parts.push('');
      parts.push('### Batch Position: Middle');
      parts.push('- Deepen contradictions and perspectives. Refer to specific earlier details.');
      parts.push('- Recontextualize, do not just add. What earlier fragment does this one complicate?');
    }

    parts.push('');
    parts.push('### Anti-Generic Test');
    parts.push('- If you removed the proper nouns, would it still feel specific to THIS booklet?');
    parts.push('- Every fragment must contain a clue, contradiction, evidence of omission, or');
    parts.push('  procedural detail cross-referenceable against other booklet material.');
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push(INSTRUCTIONS);

    return parts.join('\n');
  };

  /**
   * Stage N-1 (API pipeline): Endings — all ending variants
   *
   * @param {object} layerBible - Stage 1 output
   * @param {object} campaignPlan - Stage 2 output
   * @param {object} bossWeek - The generated boss week object
   * @param {object|null} binaryChoiceWeek - The generated binary choice week, if found
   * @param {object|null} shellContext - Shell-level narrative constraints { worldContract, narrativeVoice, literaryRegister, structuralShape }
   * @param {object[]|null} weekSummaries - Enriched week summaries for narrative arc context
   */
  window.generateEndingsPrompt = function (layerBible, campaignPlan, bossWeek, binaryChoiceWeek, shellContext, weekSummaries) {
    var parts = [
      '# Generate Finale',
      '',
      'Generate a partial JSON object with a single `endings` array.',
      'Output ONLY the endings array. Do not output weeks, meta, or fragments.',
      '',
      '---',
      '',
      SCHEMA_ENDINGS,
      '',
      '---',
      '',
      '## Reference Context',
      ''
    ];

    // Shell-level narrative constraints (voice, register, world contract)
    if (shellContext) {
      parts.push('### Narrative Constraints (from booklet shell — the ending must honour these)');
      if (shellContext.worldContract) {
        parts.push('**World Contract:** ' + shellContext.worldContract);
      }
      if (shellContext.narrativeVoice) {
        parts.push('**Narrative Voice:** ' + JSON.stringify(shellContext.narrativeVoice));
      }
      if (shellContext.literaryRegister) {
        parts.push('**Literary Register:** ' + JSON.stringify(shellContext.literaryRegister));
      }
      if (shellContext.structuralShape) {
        parts.push('**Structural Shape:** ' + JSON.stringify(shellContext.structuralShape));
      }
      if (shellContext.artifactIdentity) {
        parts.push('**Artifact Identity Contract:** ' + JSON.stringify(shellContext.artifactIdentity));
        parts.push('The ending must feel like the same artifact family and reveal shape promised by the shell.');
      }
      parts.push('');
    }

    parts.push('### Protagonist Arc');
    parts.push(JSON.stringify({
      protagonist: layerBible.storyLayer.protagonist,
      relationshipWeb: layerBible.storyLayer.relationshipWeb,
      darkestMoment: layerBible.storyLayer.darkestMoment,
      resolutionMode: layerBible.storyLayer.resolutionMode,
      recurringMotifs: layerBible.storyLayer.recurringMotifs
    }, null, 2));
    parts.push('');
    parts.push('### Boss Encounter');
    parts.push(JSON.stringify({
      title: (bossWeek.bossEncounter || {}).title,
      narrative: (bossWeek.bossEncounter || {}).narrative,
      convergenceProof: (bossWeek.bossEncounter || {}).convergenceProof
    }, null, 2));
    parts.push('');

    if (binaryChoiceWeek) {
      var binaryChoice = null;
      (binaryChoiceWeek.sessions || []).forEach(function (s) {
        if (s.binaryChoice) binaryChoice = s.binaryChoice;
      });
      if (binaryChoice) {
        parts.push('### Binary Choice (the player chose one of these)');
        parts.push(JSON.stringify(binaryChoice, null, 2));
        parts.push('');
      }
    }

    parts.push('### Story Plan Resolution');
    parts.push(JSON.stringify({
      bossPlan: campaignPlan.bossPlan,
      structuralShape: (layerBible.storyLayer || {}).resolutionMode
    }, null, 2));
    parts.push('');

    // Narrative arc from week summaries — ending must pay off these threads
    if (weekSummaries && weekSummaries.length > 0) {
      parts.push('### Narrative Arc (what happened across all weeks)');
      parts.push('');
      weekSummaries.forEach(function (ws) {
        var line = '**Week ' + ws.weekNumber + ': ' + ws.title + '**';
        parts.push(line);

        // Key story beats
        if (ws.sessions) {
          ws.sessions.forEach(function (s) {
            if (s.storyPrompt) {
              parts.push('- ' + s.storyPrompt.slice(0, 100));
            }
          });
        }

        // Component value — convergence chain
        if (ws.weeklyComponent) {
          parts.push('- Component: ' + ws.weeklyComponent.value);
        }

        // Binary choice
        if (ws.binaryChoice) {
          parts.push('- BINARY CHOICE: ' + ws.binaryChoice.choiceLabel);
        }

        // Boss
        if (ws.bossEncounter) {
          parts.push('- BOSS: ' + ws.bossEncounter.title);
        }

        parts.push('');
      });
    }

    parts.push('---');
    parts.push('');
    parts.push('## Ending Construction Doctrine');
    parts.push('');
    parts.push('### Document Identity');
    parts.push('- The ending is a found document that exists in-world — not a narrator&apos;s summary.');
    parts.push('- Choose a document type that the story has earned: final report, personal letter,');
    parts.push('  decommission order, recovered journal entry, institutional memo.');
    parts.push('- The document&apos;s author writes for their own purpose. They do not address the player.');
    parts.push('');
    parts.push('### Payoff Density');
    parts.push('- Name at least three specific earlier elements by their exact in-world identifiers:');
    parts.push('  a place, an object, a relationship, a phrase, a procedure, or a motif.');
    parts.push('- The decoded password truth must land — reference the revelation without');
    parts.push('  restating it mechanically. Show its consequence, not its content.');
    parts.push('- The binary choice and boss outcome must both visibly shape the document&apos;s');
    parts.push('  content, tone, or what the author knows. Not just which ending fires.');
    parts.push('');
    parts.push('### Variant Differentiation');
    parts.push('- Multiple endings must differ in emotional register, relationship resolution,');
    parts.push('  and what the author believes happened — not just plot outcome.');
    parts.push('- Each variant should feel like a different person wrote it, or the same person');
    parts.push('  in a fundamentally different emotional state.');
    parts.push('');
    parts.push('### Voice & Register');
    parts.push('- Preserve the booklet&apos;s established literary register while allowing deliberate');
    parts.push('  tonal contrast when the story demands it (grief in a clinical voice, hope in');
    parts.push('  bureaucratic language, rage in measured institutional prose).');
    parts.push('- The final line must feel discrete and earned — a sentence that works as a');
    parts.push('  closing image, not a thesis statement.');
    parts.push('');
    parts.push('### Anti-Generic Test');
    parts.push('- If the ending could belong to a different booklet with proper nouns swapped, rewrite.');
    parts.push('- If it summarizes the plot instead of revealing a final piece of the world, rewrite.');
    parts.push('- If the emotional weight comes from telling the reader how to feel rather than');
    parts.push('  showing specific concrete detail, rewrite.');
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push(INSTRUCTIONS);

    parts.push('');
    parts.push('## Output Postchecks — verify before outputting');
    parts.push('- Your output MUST be exactly `{ "endings": [...] }` — do not wrap it in any other key.');
    parts.push('- Do NOT output weeks, meta, cover, fragments, or any other top-level key.');
    parts.push('- Each ending: { variant, content: { documentType, body, finalLine }, designSpec }.');
    parts.push('- `variant` must be one of: canonical, bittersweet, dark, ambiguous.');
    parts.push('- Escape all double-quote characters inside string values as \\". Use em-dashes instead of quoted speech where possible.');

    return parts.join('\n');
  };

  // ── Compact API prompt builders ──────────────────────────────────────────
  //
  // Manual mode keeps the full doctrine above because the human-guided wizard
  // benefits from seeing the complete narrative contract. API mode uses the
  // helpers below instead: rich early planning survives in approved stage
  // outputs, and downstream prompts carry only the identity- and
  // continuity-critical slices that later stages actually need.

  function compactJson(value) {
    return JSON.stringify(value || {});
  }

  function truncateText(value, maxLength) {
    var text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!maxLength || text.length <= maxLength) return text;
    return text.slice(0, Math.max(0, maxLength - 3)).replace(/\s+\S*$/, '') + '...';
  }

  function summarizeDesignBiasForApi(blend) {
    blend = blend || {};
    var primary = blend.primary || {};
    var secondary = blend.secondary || null;
    return {
      primaryProfile: primary.id || '',
      secondaryProfile: secondary ? secondary.id : '',
      storyLens: primary.storyLens || '',
      topologyBias: mergeUnique(primary.mapType ? [primary.mapType] : [], secondary && secondary.mapType ? [secondary.mapType] : []),
      puzzleBias: mergeUnique(primary.puzzleFamilies || [], secondary && secondary.puzzleFamilies || []).slice(0, 4),
      documentBias: mergeUnique(primary.documentTypes || [], secondary && secondary.documentTypes || []).slice(0, 4),
      themeBias: mergeUnique(primary.themeHints || [], secondary && secondary.themeHints || []).slice(0, 3)
    };
  }

  // Compact voice packets preserve artifact quality without re-sending the full
  // doctrine. They carry the few binding aesthetic pressures later stages need:
  // motive, register, shell identity, named human pressure, and payoff burden.
  function collectMotifSignals(motifs) {
    if (!motifs || typeof motifs !== 'object') return [];
    return Object.keys(motifs).map(function (key) {
      return key + ': ' + truncateText(motifs[key], 60);
    }).filter(Boolean).slice(0, 4);
  }

  function summarizeVoiceContractForApi(shellContext) {
    if (!shellContext) return null;
    var voice = shellContext.narrativeVoice || {};
    var register = shellContext.literaryRegister || {};
    var shape = shellContext.structuralShape || {};
    var identity = shellContext.artifactIdentity || {};
    return {
      worldContract: truncateText(shellContext.worldContract, 180),
      narrator: [voice.person, voice.tense, voice.narratorStance].filter(Boolean).join(' / '),
      register: {
        name: register.name || '',
        behavior: truncateText(register.behaviorDescription, 90),
        forbiddenMoves: (register.forbiddenMoves || []).slice(0, 3),
        typography: truncateText(register.typographicBehavior, 70)
      },
      shape: {
        resolution: shape.resolution || '',
        temporalOrder: shape.temporalOrder || '',
        narratorReliability: shape.narratorReliability || '',
        promptFragmentRelationship: shape.promptFragmentRelationship || ''
      },
      shellIdentity: {
        shellFamily: identity.shellFamily || '',
        authorialMode: identity.authorialMode || '',
        openingMode: identity.openingMode || '',
        rulesDeliveryMode: identity.rulesDeliveryMode || '',
        unlockLogic: identity.unlockLogic || '',
        attachmentStrategy: identity.attachmentStrategy || '',
        documentEcology: truncateText(identity.documentEcology, 80),
        materialCulture: truncateText(identity.materialCulture, 80)
      }
    };
  }

  function summarizeShellVoicePacket(layerBible, campaignPlan, blend) {
    var story = (layerBible || {}).storyLayer || {};
    var protagonist = story.protagonist || {};
    var relationships = (story.relationshipWeb || []).slice(0, 4);
    return {
      shellPressure: {
        protagonistNeed: truncateText(protagonist.need, 70),
        protagonistWound: truncateText(protagonist.wound, 70),
        protagonistArc: truncateText(protagonist.arc, 90),
        institutionName: ((layerBible || {}).governingLayer || {}).institutionName || '',
        weeklyComponentType: ((layerBible || {}).gameLayer || {}).weeklyComponentType || '',
        topologyBias: truncateText((((campaignPlan || {}).topology || {}).identity || ((campaignPlan || {}).topology || {}).description), 90)
      },
      namedHumanPressure: relationships.map(function (entry) {
        return {
          name: entry.name || '',
          role: truncateText(entry.role, 40),
          arcFunction: truncateText(entry.arcFunction, 70)
        };
      }),
      motifSignals: collectMotifSignals(story.recurringMotifs),
      campaignTexture: {
        topologyTone: truncateText((((campaignPlan || {}).topology || {}).identity || ((campaignPlan || {}).topology || {}).description), 90),
        bossCost: truncateText((((campaignPlan || {}).bossPlan || {}).whyItFeelsEarned), 100),
        designBias: summarizeDesignBiasForApi(blend)
      }
    };
  }

  function summarizeFragmentRegistryForApi(fragmentRegistry) {
    return (fragmentRegistry || []).map(function (entry) {
      return {
        id: entry.id || '',
        weekRef: entry.weekRef,
        title: truncateText(entry.title, 72),
        documentType: entry.documentType || '',
        author: truncateText(entry.author, 56),
        revealPurpose: truncateText(entry.revealPurpose, 95),
        clueFunction: entry.clueFunction || ''
      };
    });
  }

  function summarizeFragmentVoicePacket(layerBible, batchRegistry, batchWeekSummaries, priorFragments, shellContext) {
    var story = (layerBible || {}).storyLayer || {};
    return {
      shellVoice: summarizeVoiceContractForApi(shellContext),
      motifSignals: collectMotifSignals(story.recurringMotifs),
      namedWitnesses: (story.relationshipWeb || []).slice(0, 4).map(function (entry) {
        return {
          name: entry.name || '',
          role: truncateText(entry.role, 40),
          secretPressure: truncateText(entry.secret, 70)
        };
      }),
      documentSpread: (batchRegistry || []).map(function (entry) {
        return {
          id: entry.id || '',
          documentType: entry.documentType || '',
          author: truncateText(entry.author, 50),
          revealPurpose: truncateText(entry.revealPurpose, 80)
        };
      }),
      weekEchoes: (batchWeekSummaries || []).map(function (summary) {
        return {
          weekNumber: summary.weekNumber,
          title: truncateText(summary.title, 60),
          pressure: (summary.keyPrompts || []).slice(0, 1)[0] || truncateText(summary.mapNote, 70),
          fragmentRefs: (summary.fragmentRefs || []).slice(0, 4)
        };
      }),
      repetitionGuard: summarizePriorFragmentsForApi(priorFragments)
    };
  }

  function summarizeEndingVoicePacket(layerBible, campaignPlan, bossWeek, binaryChoiceWeek, shellContext) {
    var story = (layerBible || {}).storyLayer || {};
    var protagonist = story.protagonist || {};
    var binaryChoice = null;
    (binaryChoiceWeek && binaryChoiceWeek.sessions || []).forEach(function (session) {
      if (session.binaryChoice && !binaryChoice) binaryChoice = session.binaryChoice;
    });
    return {
      shellVoice: summarizeVoiceContractForApi(shellContext),
      endingBurden: {
        protagonistNeed: truncateText(protagonist.need, 70),
        protagonistWound: truncateText(protagonist.wound, 70),
        costlyArc: truncateText(protagonist.arc, 90),
        bossTruth: truncateText(story.bossTruth, 100),
        finalReveal: truncateText((((layerBible || {}).designLedger || {}).finalRevealRecontextualizes), 110)
      },
      namedWitnesses: (story.relationshipWeb || []).slice(0, 4).map(function (entry) {
        return {
          name: entry.name || '',
          arcFunction: truncateText(entry.arcFunction, 70),
          secret: truncateText(entry.secret, 70)
        };
      }),
      consequenceFork: binaryChoice ? {
        choiceLabel: truncateText(binaryChoice.choiceLabel, 80),
        promptA: truncateText(binaryChoice.promptA, 70),
        promptB: truncateText(binaryChoice.promptB, 70)
      } : null,
      bossTexture: {
        title: truncateText((((bossWeek || {}).bossEncounter || {}).title), 70),
        convergenceProof: truncateText((((bossWeek || {}).bossEncounter || {}).convergenceProof), 110),
        earnedBy: truncateText((((campaignPlan || {}).bossPlan || {}).whyItFeelsEarned), 100)
      },
      motifSignals: collectMotifSignals(story.recurringMotifs)
    };
  }

  function buildApiCompactRules(stageName) {
    var rules = [
      'Preserve artifact-grade fiction: distinctive voice, document ecology, clue economy, spatial continuity, strong endings.',
      'Do not genericize the shell, the relationship web, or the governing institution.',
      'Every output must advance mystery, map state, relationship state, or reveal structure.',
      'Trust deterministic validators for shape; spend tokens on concrete fiction and continuity instead of re-explaining JSON.',
      'Return JSON only.'
    ];

    if (stageName === 'weeks') {
      rules.push('Write only the requested week slice. Preserve topology family, approved shell identity, and fragment ID discipline.');
    } else if (stageName === 'fragments') {
      rules.push('Make each document feel authored, cross-referenceable, and specific to this booklet rather than generic lore delivery.');
      rules.push('Use document voice, material detail, and contradiction pressure instead of exposition bulk.');
    } else if (stageName === 'endings') {
      rules.push('Pay off the protagonist arc, binary choice, and boss convergence without flattening the established register.');
      rules.push('Aim for a final document that recontextualizes evidence instead of summarizing plot events.');
    } else if (stageName === 'shell') {
      rules.push('Lock the renderer-facing shell contract now so later stages can inherit it without renegotiating identity.');
      rules.push('Make the shell feel authored and singular enough that later stages can imitate it without more doctrine.');
    }

    return rules;
  }

  function summarizeLayerBibleForShell(layerBible) {
    var story = (layerBible || {}).storyLayer || {};
    var game = (layerBible || {}).gameLayer || {};
    var governing = (layerBible || {}).governingLayer || {};
    var ledger = (layerBible || {}).designLedger || {};
    return {
      premise: truncateText(story.premise, 220),
      protagonist: story.protagonist || {},
      relationshipWeb: (story.relationshipWeb || []).slice(0, 6).map(function (entry) {
        return {
          name: entry.name || '',
          role: truncateText(entry.role, 70),
          arcFunction: truncateText(entry.arcFunction, 90)
        };
      }),
      motifs: story.recurringMotifs || {},
      institution: {
        name: governing.institutionName || '',
        departments: (governing.departments || []).slice(0, 5),
        procedures: (governing.proceduresThatAffectPlay || []).slice(0, 4),
        documentVoices: (governing.documentVoiceRules || []).slice(0, 4)
      },
      shellSignals: {
        topology: truncateText(game.persistentTopology, 150),
        weeklyComponentType: game.weeklyComponentType || '',
        boardStateArc: truncateText(game.boardStateArc, 120),
        informationLayers: truncateText(game.informationLayers, 140)
      },
      clueEconomy: ledger.clueEconomy || {},
      finalReveal: truncateText(ledger.finalRevealRecontextualizes, 180)
    };
  }

  function summarizeLayerBibleForWeeks(layerBible, weekNumbers) {
    var story = (layerBible || {}).storyLayer || {};
    var game = (layerBible || {}).gameLayer || {};
    var governing = (layerBible || {}).governingLayer || {};
    var ledger = (layerBible || {}).designLedger || {};
    var requestedWeeks = Array.isArray(weekNumbers) && weekNumbers.length ? weekNumbers : null;

    return {
      worldContract: truncateText(story.premise, 220),
      protagonist: story.protagonist || {},
      antagonistPressure: truncateText(story.antagonistPressure, 140),
      relationshipWeb: (story.relationshipWeb || []).slice(0, 6).map(function (entry) {
        return {
          name: entry.name || '',
          role: truncateText(entry.role, 60),
          initialStance: truncateText(entry.initialStance, 70),
          secret: truncateText(entry.secret, 90),
          arcFunction: truncateText(entry.arcFunction, 90)
        };
      }),
      motifs: story.recurringMotifs || {},
      midpointReversal: truncateText(story.midpointReversal, 150),
      darkestMoment: truncateText(story.darkestMoment, 150),
      bossTruth: truncateText(story.bossTruth, 150),
      topology: {
        coreLoop: truncateText(game.coreLoop, 120),
        persistentTopology: truncateText(game.persistentTopology, 180),
        majorZones: (game.majorZones || []).slice(0, 6),
        gatesAndKeys: (game.gatesAndKeys || []).slice(0, 8),
        progressionGates: (game.progressionGates || []).filter(function (entry) {
          return !requestedWeeks || requestedWeeks.indexOf(entry.week) !== -1;
        }).map(function (entry) {
          return {
            week: entry.week,
            playerGains: truncateText(entry.playerGains, 90),
            unlocks: truncateText(entry.unlocks, 90),
            requires: truncateText(entry.requires, 90)
          };
        }),
        persistentPressures: (game.persistentPressures || []).slice(0, 5),
        companionSurfaces: (game.companionSurfaces || []).slice(0, 4),
        revisitLogic: truncateText(game.revisitLogic, 140),
        boardStateArc: truncateText(game.boardStateArc, 140),
        bossConvergence: truncateText(game.bossConvergence, 160),
        informationLayers: truncateText(game.informationLayers, 150)
      },
      governingLayer: {
        institutionName: governing.institutionName || '',
        departments: (governing.departments || []).slice(0, 5),
        procedures: (governing.proceduresThatAffectPlay || []).slice(0, 5),
        recordsAndForms: (governing.recordsAndForms || []).slice(0, 5),
        documentVoiceRules: (governing.documentVoiceRules || []).slice(0, 4)
      },
      designLedger: {
        mysteryQuestions: (ledger.mysteryQuestions || []).slice(0, 3),
        falseAssumptions: (ledger.falseAssumptions || []).slice(0, 3),
        motifPayoffs: (ledger.motifPayoffs || []).slice(0, 5),
        weekTransformations: (ledger.weekTransformations || []).filter(function (entry) {
          return !requestedWeeks || requestedWeeks.indexOf(entry.week) !== -1;
        }),
        clueEconomy: ledger.clueEconomy || {},
        finalRevealRecontextualizes: truncateText(ledger.finalRevealRecontextualizes, 180)
      }
    };
  }

  function summarizeCampaignPlanForWeeks(campaignPlan, weekNumbers) {
    var plan = campaignPlan || {};
    var requestedWeeks = Array.isArray(weekNumbers) ? weekNumbers : [];
    var weekLookup = {};
    requestedWeeks.forEach(function (weekNumber) { weekLookup[weekNumber] = true; });
    return {
      topology: plan.topology || {},
      weeks: (plan.weeks || []).filter(function (week) {
        return weekLookup[week.weekNumber];
      }).map(function (week) {
        return {
          weekNumber: week.weekNumber,
          arcBeat: truncateText(week.arcBeat, 80),
          npcBeat: truncateText(week.npcBeat, 100),
          stateSnapshot: truncateText(week.stateSnapshot, 110),
          playerGains: truncateText(week.playerGains, 110),
          zoneFocus: truncateText(week.zoneFocus, 90),
          mapReuse: week.mapReuse || '',
          stateChange: truncateText(week.stateChange, 120),
          newGateOrUnlock: truncateText(week.newGateOrUnlock, 120),
          weeklyComponentMeaning: truncateText(week.weeklyComponentMeaning, 120),
          oraclePressure: truncateText(week.oraclePressure, 120),
          fragmentFunction: truncateText(week.fragmentFunction, 120),
          governingProcedure: truncateText(week.governingProcedure, 120),
          companionChange: truncateText(week.companionChange, 120),
          isBossWeek: !!week.isBossWeek,
          isBinaryChoiceWeek: !!week.isBinaryChoiceWeek,
          sessionBeatTypes: (week.sessionBeatTypes || []).slice(0, 6)
        };
      }),
      bossPlan: (plan.bossPlan || {})
    };
  }

  function summarizeFragmentRegistryForChunk(fragmentRegistry, weekNumbers) {
    var weekLookup = {};
    (weekNumbers || []).forEach(function (weekNumber) { weekLookup[weekNumber] = true; });
    return (fragmentRegistry || []).filter(function (entry) {
      return entry && entry.weekRef && weekLookup[entry.weekRef];
    }).map(function (entry) {
      return {
        id: entry.id || '',
        title: truncateText(entry.title, 80),
        documentType: entry.documentType || '',
        author: truncateText(entry.author, 60),
        revealPurpose: truncateText(entry.revealPurpose, 110),
        clueFunction: entry.clueFunction || '',
        weekRef: entry.weekRef
      };
    });
  }

  function summarizeWeekSummariesForFragments(weekSummaries, focusWeekNumbers) {
    var focusLookup = null;
    if (Array.isArray(focusWeekNumbers) && focusWeekNumbers.length) {
      focusLookup = {};
      focusWeekNumbers.forEach(function (weekNumber) { focusLookup[weekNumber] = true; });
    }
    return (weekSummaries || []).filter(function (summary) {
      return !focusLookup || focusLookup[summary.weekNumber];
    }).map(function (summary) {
      return {
        weekNumber: summary.weekNumber,
        title: truncateText(summary.title, 80),
        keyPrompts: (summary.sessions || []).slice(0, 2).map(function (session) {
          return truncateText(session.storyPrompt, 90);
        }).filter(Boolean),
        fragmentRefs: (summary.fragmentRefs || []).slice(0, 6),
        cipher: summary.cipher ? {
          type: summary.cipher.type || '',
          title: truncateText(summary.cipher.title, 80),
          extractionInstruction: truncateText(summary.cipher.extractionInstruction, 110)
        } : null,
        mapNote: summary.mapState ? truncateText(summary.mapState.mapNote, 110) : '',
        overflowDocument: summary.overflowDocument ? {
          id: summary.overflowDocument.id || '',
          documentType: summary.overflowDocument.documentType || '',
          purpose: truncateText(summary.overflowDocument.inWorldPurpose, 100)
        } : null,
        weeklyComponent: summary.weeklyComponent ? {
          value: summary.weeklyComponent.value,
          type: summary.weeklyComponent.type || ''
        } : null,
        binaryChoice: summary.binaryChoice ? {
          choiceLabel: truncateText(summary.binaryChoice.choiceLabel, 100),
          promptA: truncateText(summary.binaryChoice.promptA, 70),
          promptB: truncateText(summary.binaryChoice.promptB, 70)
        } : null,
        bossEncounter: summary.bossEncounter ? {
          title: truncateText(summary.bossEncounter.title, 80),
          componentInputs: (summary.bossEncounter.componentInputs || []).slice(0, 12),
          convergenceExcerpt: truncateText(summary.bossEncounter.convergenceExcerpt, 130)
        } : null
      };
    });
  }

  function summarizeBossAndArcForEndings(layerBible, campaignPlan, bossWeek, binaryChoiceWeek, weekSummaries) {
    var story = (layerBible || {}).storyLayer || {};
    var binaryChoice = null;
    (binaryChoiceWeek && binaryChoiceWeek.sessions || []).forEach(function (session) {
      if (session.binaryChoice && !binaryChoice) binaryChoice = session.binaryChoice;
    });

    return {
      protagonistArc: {
        protagonist: story.protagonist || {},
        darkestMoment: truncateText(story.darkestMoment, 140),
        resolutionMode: truncateText(story.resolutionMode, 60),
        motifs: story.recurringMotifs || {}
      },
      relationshipWeb: (story.relationshipWeb || []).slice(0, 6).map(function (entry) {
        return {
          name: entry.name || '',
          role: truncateText(entry.role, 60),
          arcFunction: truncateText(entry.arcFunction, 90),
          secret: truncateText(entry.secret, 90)
        };
      }),
      binaryChoice: binaryChoice ? {
        choiceLabel: truncateText(binaryChoice.choiceLabel, 110),
        promptA: truncateText(binaryChoice.promptA, 100),
        promptB: truncateText(binaryChoice.promptB, 100)
      } : null,
      boss: {
        title: truncateText(((bossWeek || {}).bossEncounter || {}).title, 80),
        narrative: truncateText(((bossWeek || {}).bossEncounter || {}).narrative, 220),
        convergenceProof: truncateText(((bossWeek || {}).bossEncounter || {}).convergenceProof, 220),
        componentInputs: (((bossWeek || {}).bossEncounter || {}).componentInputs || []).slice(0, 12)
      },
      campaignResolution: {
        bossPlan: (campaignPlan || {}).bossPlan || {},
        payoffAnchors: summarizeWeekSummariesForFragments(weekSummaries).map(function (summary) {
          return {
            weekNumber: summary.weekNumber,
            title: summary.title,
            keyPrompts: summary.keyPrompts,
            fragmentRefs: summary.fragmentRefs,
            weeklyComponent: summary.weeklyComponent,
            binaryChoice: summary.binaryChoice
          };
        })
      }
    };
  }

  function summarizeShellContractForApi(shellContext) {
    if (!shellContext) return null;
    return {
      worldContract: truncateText(shellContext.worldContract, 220),
      narrativeVoice: shellContext.narrativeVoice || null,
      literaryRegister: shellContext.literaryRegister || null,
      structuralShape: shellContext.structuralShape || null,
      artifactIdentity: shellContext.artifactIdentity || null
    };
  }

  function summarizeContinuityForChunk(continuity) {
    if (!continuity) return null;
    return {
      generatedWeeks: continuity.weekCount || 0,
      priorWeeks: (continuity.weekSummaries || []).slice(-4),
      componentValues: (continuity.componentValues || []).slice(-6),
      cipherProgression: (continuity.cipherProgression || []).slice(-4),
      usedFragmentRefs: (continuity.usedFragmentRefs || []).slice(-12),
      overflowDocs: (continuity.overflowDocs || []).slice(-4),
      recentOracles: (continuity.recentOracles || []).slice(-2),
      mapProgression: continuity.mapProgression || null,
      binaryChoice: continuity.binaryChoice || null,
      clocks: (continuity.clocks || []).slice(0, 4)
    };
  }

  function summarizePriorFragmentsForApi(priorFragments) {
    return (priorFragments || []).slice(-8).map(function (fragment) {
      var contentValue = '';
      if (fragment && typeof fragment.content === 'string') contentValue = fragment.content;
      else if (fragment && fragment.content && typeof fragment.content === 'object') contentValue = fragment.content.body || fragment.content.html || '';
      else if (fragment && fragment.body) contentValue = fragment.body;
      return {
        id: fragment.id || '',
        documentType: fragment.documentType || '',
        author: truncateText(fragment.inWorldAuthor, 60),
        purpose: truncateText(fragment.inWorldPurpose, 90),
        openingCue: truncateText(contentValue, 70)
      };
    });
  }

  var API_STAGE1_FIELD_CONTRACT = [
    'Return { storyLayer, gameLayer, governingLayer, designPrinciples, designLedger }.',
    'storyLayer: premise; protagonist{role,want,need,flaw,wound,arc}; antagonistPressure; relationshipWeb[4-6]{name,role,initialStance,secret,arcFunction}; midpointReversal; darkestMoment; resolutionMode; bossTruth; recurringMotifs{object,place,phrase,sensory}.',
    'gameLayer: coreLoop; persistentTopology; majorZones[]; gatesAndKeys[]; progressionGates[]; persistentPressures[]; companionSurfaces[]; revisitLogic; boardStateArc; bossConvergence; informationLayers.',
    'governingLayer: institutionName; departments[]; proceduresThatAffectPlay[]; recordsAndForms[]; documentVoiceRules[].',
    'designLedger: mysteryQuestions[3]; falseAssumptions[3]; motifPayoffs[4-6]; weekTransformations[one per week]; clueEconomy{hardClues,softClues,misdirections,confirmations}; finalRevealRecontextualizes.'
  ].join('\n');

  var API_STAGE2_FIELD_CONTRACT = [
    'Return { topology, weeks, bossPlan, fragmentRegistry, overflowRegistry }.',
    'weeks[]: weekNumber, arcBeat, npcBeat, stateSnapshot, playerGains, zoneFocus, mapReuse, stateChange, newGateOrUnlock, weeklyComponentMeaning, oraclePressure, fragmentFunction, governingProcedure, companionChange, isBossWeek, isBinaryChoiceWeek, sessionBeatTypes.',
    'fragmentRegistry[]: id, title, documentType, author, revealPurpose, clueFunction, weekRef, sessionRef.',
    'overflowRegistry[]: id, weekNumber, documentType, author, narrativeFunction, tonalIntent, arcRelationship.',
    'bossPlan: decodeLogic, whyItFeelsEarned, requiredPriorKnowledge[].'
  ].join('\n');

  var API_SHELL_FIELD_CONTRACT = [
    'Return { meta, cover, rulesSpread, theme } only.',
    'meta must include schemaVersion, generatedAt, blockTitle, blockSubtitle, worldContract, narrativeVoice, literaryRegister, structuralShape, artifactIdentity, weeklyComponentType, passwordLength, weekCount, totalSessions.',
    'artifactIdentity must keep shellFamily, boardStateMode, openingMode, rulesDeliveryMode, unlockLogic, attachmentStrategy distinct and renderer-ready.',
    'cover/rules/theme must feel like the same artifact family promised by meta.artifactIdentity.'
  ].join('\n');

  var API_WEEKS_FIELD_CONTRACT = [
    'Return { weeks:[...] } only for the requested week numbers.',
    'Each non-boss week needs weekNumber, title, epigraph, isBossWeek:false, weeklyComponent, sessions, fieldOps{mapState,cipher,oracleTable,companionComponents?}, overflow, overflowDocument? and interlude?/gameplayClocks? when needed.',
    'Boss week needs weekNumber, title, epigraph, isBossWeek:true, weeklyComponent.value:null, sessions, bossEncounter, overflow, overflowDocument? and optional interlude/gameplayClocks.',
    'Oracle tables must use 10 d100 bands 00-09..90-99, text field only, and fragment entries must include real fragmentRef IDs.',
    'Preserve the approved map family instead of flattening everything into a generic grid.'
  ].join('\n');

  var API_FRAGMENTS_FIELD_CONTRACT = [
    'Return { fragments:[...] } only.',
    'Each fragment must match its assigned registry entry and include id, documentType, inWorldAuthor, inWorldRecipient, inWorldPurpose, content, designSpec, authenticityChecks.',
    'Documents must carry clue function, cross-reference value, and artifact-specific material detail.'
  ].join('\n');

  var API_ENDINGS_FIELD_CONTRACT = [
    'Return { endings:[...] } only.',
    'Each ending must be { variant, content:{ documentType, body, finalLine }, designSpec }.',
    'Variants must diverge in emotional register and consequence, not just wording.'
  ].join('\n');

  window.generateApiStage1Prompt = function (workout, brief, dice, options) {
    options = options || {};
    var blend = deriveDesignBlend(brief, workout);
    return [
      '# API Stage 1 — Layer Codex',
      '',
      API_STAGE1_FIELD_CONTRACT,
      '',
      '## Compact Rules',
      buildApiCompactRules('layer-bible').map(function (line) { return '- ' + line; }).join('\n'),
      '- Plan a persistent topology with explicit gates, named keys, revisitation logic, and boss convergence requirements.',
      '- Keep the protagonist arc specific: role, want, need, flaw, wound, arc, darkest moment, and costly transformation.',
      '- Relationship web must use 4-6 named characters with distinct secrets and arc functions.',
      '- Design ledger commitments are binding; later API stages will inherit these instead of re-planning the book.',
      '',
      '## Inputs',
      'Workout: ' + truncateText(workout, 3200),
      'Creative direction: ' + truncateText(brief || buildDefaultBrief(workout, blend), 1800),
      'Design bias: ' + compactJson(summarizeDesignBiasForApi(blend)),
      'Dice: ' + String(dice || 'd100'),
      options.retryMode ? 'Retry mode: keep prose concrete and compact so the full JSON finishes cleanly.' : '',
      '',
      'JSON only.'
    ].filter(Boolean).join('\n');
  };

  window.generateApiStage2Prompt = function (workout, brief, dice, layerBible, options) {
    options = options || {};
    var weekCount = window.parseWeekCount(workout);
    return [
      '# API Stage 2 — Story Plan',
      '',
      API_STAGE2_FIELD_CONTRACT,
      '',
      '## Compact Rules',
      buildApiCompactRules('campaign').map(function (line) { return '- ' + line; }).join('\n'),
      '- Use exactly ' + weekCount + ' weeks; mark the final week as boss and the midpoint week as the binary choice week.',
      '- Map each mystery question, false assumption, motif payoff, and week transformation into the week plan.',
      '- Fragment registry must create clue economy: establish early, complicate mid-block, reveal late; no lore-dump placeholders.',
      '- Boss convergence must require outputs from map progression, institutional procedure, and relationship state.',
      '',
      '## Layer Codex Summary',
      compactJson(summarizeLayerBibleForWeeks(layerBible)),
      '',
      '## Inputs',
      'Workout: ' + truncateText(workout, 2200),
      'Creative direction: ' + truncateText(brief || '', 900),
      'Dice: ' + String(dice || 'd100'),
      options.retryMode ? 'Retry mode: shorten descriptions where needed, but keep clue economy and week transformations intact.' : '',
      '',
      'JSON only.'
    ].filter(Boolean).join('\n');
  };

  window.generateApiShellPrompt = function (brief, layerBible, campaignPlan, options) {
    options = options || {};
    var blendContext = buildBlendContextFromPlans(layerBible, campaignPlan);
    var blend = deriveDesignBlend(brief, blendContext);
    var weekCount = (campaignPlan.weeks || []).length || 6;
    return [
      '# API Stage 3 — Booklet Setup',
      '',
      API_SHELL_FIELD_CONTRACT,
      '',
      '## Compact Rules',
      buildApiCompactRules('shell').map(function (line) { return '- ' + line; }).join('\n'),
      '- worldContract is the booklet north star. It must read like a testable governing tension, not a summary.',
      '- narrativeVoice, literaryRegister, structuralShape, and artifactIdentity are downstream contracts; make them strong enough that later stages can follow them exactly.',
      '- Cover, rules spread, and theme must all feel like one coherent shell family, not adjacent UI labels.',
      '- passwordEncryptedEnding stays blank; trusted tooling seals it later.',
      '',
      '## Layer Codex Summary',
      compactJson(summarizeLayerBibleForShell(layerBible)),
      '',
      '## Campaign Summary',
      compactJson({
        weekCount: weekCount,
        topology: campaignPlan.topology || {},
        bossPlan: campaignPlan.bossPlan || {},
        fragmentCount: (campaignPlan.fragmentRegistry || []).length,
        overflowCount: (campaignPlan.overflowRegistry || []).length
      }),
      '',
      '## Voice Packet',
      compactJson(summarizeShellVoicePacket(layerBible, campaignPlan, blend)),
      '',
      '## Creative Direction',
      truncateText(brief || buildDefaultBrief(blendContext, blend), 1200),
      '',
      '## Design Bias',
      compactJson(summarizeDesignBiasForApi(blend)),
      options.retryMode ? 'Retry mode: keep shells concise, specific, renderer-safe, and distinctive in diction before adding more labels.' : '',
      '',
      'JSON only.'
    ].filter(Boolean).join('\n');
  };

  window.generateApiWeekChunkPrompt = function (workout, brief, layerBible, campaignPlan, weekNumbers, continuity, allComponentValues, shellContext, options) {
    options = options || {};
    var blend = deriveDesignBlend(brief, workout);
    var weekCount = (campaignPlan.weeks || []).length || 6;
    var isBossChunk = weekNumbers.indexOf(weekCount) !== -1;
    var weekWorkout = window.extractWeekWorkout(workout, weekNumbers);
    var weekLabel = weekNumbers.length === 1
      ? 'Week ' + weekNumbers[0]
      : 'Weeks ' + weekNumbers[0] + '-' + weekNumbers[weekNumbers.length - 1];
    var overflowRegistry = (campaignPlan.overflowRegistry || []).filter(function (entry) {
      return weekNumbers.indexOf(entry.weekNumber) !== -1;
    });

    return [
      '# API Week Chunk — ' + weekLabel + (isBossChunk ? ' (Boss)' : ''),
      '',
      API_WEEKS_FIELD_CONTRACT,
      '',
      '## Compact Rules',
      buildApiCompactRules('weeks').map(function (line) { return '- ' + line; }).join('\n'),
      '- Use only the supplied week slice, shell contract, continuity packet, and fragment IDs. Do not regenerate other weeks.',
      '- Story prompts must contain action, sensory specificity, and named places/objects from the approved world.',
      '- Preserve map continuity, progression gates, clue economy, relationship state, and the shell artifact family.',
      '- Boss week must convert prior component values into componentInputs and a decodingKey without contradicting earlier weeks.',
      '',
      '## Booklet Setup Contract',
      compactJson(summarizeShellContractForApi(shellContext)),
      '',
      '## Layer Codex Slice',
      compactJson(summarizeLayerBibleForWeeks(layerBible, weekNumbers)),
      '',
      '## Campaign Slice',
      compactJson(summarizeCampaignPlanForWeeks(campaignPlan, weekNumbers)),
      '',
      '## Allowed Fragment IDs',
      compactJson(summarizeFragmentRegistryForChunk(campaignPlan.fragmentRegistry || [], weekNumbers)),
      overflowRegistry.length ? '' : null,
      overflowRegistry.length ? '## Planned Overflow Documents' : null,
      overflowRegistry.length ? compactJson(overflowRegistry) : null,
      continuity ? '' : null,
      continuity ? '## Continuity Packet' : null,
      continuity ? compactJson(summarizeContinuityForChunk(continuity)) : null,
      isBossChunk && allComponentValues && allComponentValues.length ? '' : null,
      isBossChunk && allComponentValues && allComponentValues.length ? '## Prior Component Values' : null,
      isBossChunk && allComponentValues && allComponentValues.length ? compactJson(allComponentValues) : null,
      '',
      '## Workout Slice',
      truncateText(weekWorkout, 1800),
      '',
      '## Creative Direction',
      truncateText(brief || buildDefaultBrief(workout, blend), 1000),
      '',
      '## Design Bias',
      compactJson(summarizeDesignBiasForApi(blend)),
      options.retryMode ? 'Retry mode: keep prose tight enough to finish, but preserve named continuity anchors and playable consequences.' : '',
      '',
      'JSON only.'
    ].filter(Boolean).join('\n');
  };

  window.generateApiFragmentsPrompt = function (layerBible, campaignPlan, weekSummaries, shellContext, options) {
    options = options || {};
    return [
      '# API Bonus Pages',
      '',
      API_FRAGMENTS_FIELD_CONTRACT,
      '',
      '## Compact Rules',
      buildApiCompactRules('fragments').map(function (line) { return '- ' + line; }).join('\n'),
      '- Generate exactly one fragment per registry entry.',
      '- Honor revealPurpose and clueFunction so the set escalates from establish to complicate to reveal.',
      '- Include operational or material detail that makes each document feel found rather than narrated.',
      '',
      '## Booklet Setup Contract',
      compactJson(summarizeShellContractForApi(shellContext)),
      '',
      '## Fragment Voice Packet',
      compactJson(summarizeFragmentVoicePacket(layerBible, campaignPlan.fragmentRegistry || [], weekSummaries, [], shellContext)),
      '',
      '## Layer Codex Slice',
      compactJson(summarizeLayerBibleForWeeks(layerBible)),
      '',
      '## Fragment Registry',
      compactJson(summarizeFragmentRegistryForApi(campaignPlan.fragmentRegistry || [])),
      '',
      '## Relevant Week Summaries',
      compactJson(summarizeWeekSummariesForFragments(weekSummaries)),
      options.retryMode ? 'Retry mode: compress routine phrasing before sacrificing contradiction, material detail, or cross-reference density.' : '',
      '',
      'JSON only.'
    ].filter(Boolean).join('\n');
  };

  window.generateApiFragmentBatchPrompt = function (layerBible, batchRegistry, batchWeekSummaries, allWeekSummaries, priorFragments, batchIndex, totalBatches, shellContext, options) {
    options = options || {};
    var focusWeeks = (batchWeekSummaries || []).map(function (summary) { return summary.weekNumber; });
    return [
      '# API Fragment Batch ' + (batchIndex + 1) + ' of ' + totalBatches,
      '',
      API_FRAGMENTS_FIELD_CONTRACT,
      '',
      '## Compact Rules',
      buildApiCompactRules('fragments').map(function (line) { return '- ' + line; }).join('\n'),
      '- Generate exactly these fragment IDs; do not invent extras.',
      '- Use the week summaries for cross-reference anchors and the prior fragment signatures to avoid repetition or voice drift.',
      '- Preserve shell identity, document ecology, and contradiction depth across batches.',
      '',
      '## Booklet Setup Contract',
      compactJson(summarizeShellContractForApi(shellContext)),
      '',
      '## Fragment Voice Packet',
      compactJson(summarizeFragmentVoicePacket(layerBible, batchRegistry || [], batchWeekSummaries, priorFragments, shellContext)),
      '',
      '## Layer Codex Slice',
      compactJson(summarizeLayerBibleForWeeks(layerBible, focusWeeks)),
      '',
      '## Batch Registry',
      compactJson(summarizeFragmentRegistryForApi(batchRegistry || [])),
      '',
      '## Relevant Week Summaries',
      compactJson(summarizeWeekSummariesForFragments(batchWeekSummaries, focusWeeks)),
      '',
      '## Prior Fragment Signatures',
      compactJson(summarizePriorFragmentsForApi(priorFragments)),
      options.retryMode ? 'Retry mode: shorten routine details before sacrificing specificity, authorial signatures, or cross-reference density.' : '',
      '',
      'JSON only.'
    ].filter(Boolean).join('\n');
  };

  window.generateApiEndingsPrompt = function (layerBible, campaignPlan, bossWeek, binaryChoiceWeek, shellContext, weekSummaries, options) {
    options = options || {};
    return [
      '# API Finale',
      '',
      API_ENDINGS_FIELD_CONTRACT,
      '',
      '## Compact Rules',
      buildApiCompactRules('endings').map(function (line) { return '- ' + line; }).join('\n'),
      '- The ending must sound like the same artifact family promised by the shell contract.',
      '- Pay off the protagonist need, relationship web, motifs, binary choice consequences, and boss convergence anchors already on the page.',
      '- Strong endings reveal or refract prior evidence; they do not summarize the plot.',
      '',
      '## Booklet Setup Contract',
      compactJson(summarizeShellContractForApi(shellContext)),
      '',
      '## Ending Voice Packet',
      compactJson(summarizeEndingVoicePacket(layerBible, campaignPlan, bossWeek, binaryChoiceWeek, shellContext)),
      '',
      '## Boss And Arc Summary',
      compactJson(summarizeBossAndArcForEndings(layerBible, campaignPlan, bossWeek, binaryChoiceWeek, weekSummaries)),
      options.retryMode ? 'Retry mode: keep the ending leaner in length, not smaller in consequence, voice, or evidentiary payoff.' : '',
      '',
      'JSON only.'
    ].filter(Boolean).join('\n');
  };

})();
