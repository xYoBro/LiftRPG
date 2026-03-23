  window.BANNED_TROPES = [
    'gladiator arena or Roman colosseum settings',
    'space marine or generic military sci-fi',
    'post-apocalyptic scavenger cliches by default',
    'chosen one or prophecy fulfillment',
    'zombie outbreak as fallback premise',
    'generic medieval fantasy dungeon-crawl',
    'superhero origin story'
  ];

  window.GENRE_POOL = [
    'Traditional pulp adventure: ancient temples, hidden traps, and rival explorers',
    'Cozy village mystery: a missing baker, local gossip, and secrets behind the counter',
    'Space opera western: a dusty outpost on the edge of the galaxy holding out against a mega-corp',
    'Classic epic fantasy: a motley crew must deliver an artifact to a dangerous realm',
    'Sports underdog drama: a disgraced coach and a team of misfits with one last shot at the championship',
    'Lighthearted slice-of-life: a magical coffee shop where the drinks change people\'s memories',
    'Superhero street-level resistance: ordinary citizens pushing back against a corrupt vigilante',
    'High-tech corporate heist: stealing a prototype from a floating casino',
    'Romantic comedy with a supernatural twist: matchmaking for ghosts who unfinished business',
    'Hardboiled detective noir: it started with a missing pet and ended with the mayor\'s secrets',
    'Survival horror in a completely mundane setting: getting lost in an infinite suburban open house',
    'Corporate accounting horror: an audit trail that audits you back',
    'Competitive birdwatching noir: binoculars, betrayal, and rare sightings',
    'Municipal zoning board cosmic horror: the variance was never approved',
    'Insurance fraud romance: two adjusters, one suspicious claim',
    'Deep-sea botanical survey: cataloguing organisms that should not photosynthesize',
    'Victorian sewer cartography: mapping what lives below',
    'Cold War library science: banned books as dead drops',
    'Professional cheese cave inspector: aging reveals terrible truths',
    'Small-town summer: a teenager has one season to fix what their parent broke',
    'Cross-country road trip falling apart in the best possible way',
    'Two rival chefs competing for the same kitchen, the same memory, the same person',
    'Heist in a museum after hours — the target is not what it looks like',
    'Fantasy village where the dragon is the only one telling the truth',
    'Retired detective pulled back by the one case they never closed',
    'Kids on a summer mission: find what adults buried in the woods'
  ];

  window.DESIGN_PROFILES = [
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
    },
    {
      id: 'modern-action',
      keywords: ['gun', 'fight', 'action', 'spy', 'heist', 'cop', 'detective', 'chase', 'combat', 'war', 'battle', 'soldier', 'mercenary', 'cartel', 'gang', 'heist', 'thief', 'assassin', 'sniper'],
      storyLens: 'high-stakes tactical problem solving where leverage, timing, and violence are the only currencies',
      settingLayers: [
        'the public surface where the target or objective is hidden',
        'the tactical routes, sightlines, and cover points only operators see',
        'the compromised safehouses or extraction points',
        'the aftermath of sudden, localized violence'
      ],
      characterWeb: [
        'a handler or contractor whose loyalties are conditional',
        'a target or VIP who refuses to cooperate cleanly',
        'a rival operator working the same objective from a different angle',
        'a civilian bystander caught in the crossfire'
      ],
      secretShapes: [
        'the objective is a decoy for a larger operation',
        'the employer has already sold the protagonist out',
        'the rules of engagement were written to ensure failure'
      ],
      arcMoves: [
        'reconnaissance and staging',
        'the plan makes contact with the enemy',
        'midpoint escalation or extraction failure',
        'costly exfiltration'
      ],
      mapType: 'point-to-point',
      oracleMode: 'banded-d100',
      puzzleFamilies: ['path tracing', 'route adjacency', 'constraint logic', 'resource clock pressure'],
      pressureClocks: ['Security Response', 'Target Escaping', 'Ammo/Supplies'],
      scarcitySurfaces: ['inventory-grid', 'stress-track', 'dashboard'],
      interludePayloads: ['map', 'cipher', 'fragment-ref'],
      documentTypes: ['memo', 'report', 'inspection', 'form'],
      themeHints: ['noir', 'minimalist', 'cyberpunk']
    }
  ];
