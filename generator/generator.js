(function () {
  var BANNED_TROPES = window.BANNED_TROPES;
  var GENRE_POOL = window.GENRE_POOL;
  var DESIGN_PROFILES = window.DESIGN_PROFILES;

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


  function deriveAuthorBlend(brief) {
    if (!window.AUTHORIAL_PROFILES) return null;
    var haystack = normalizeText(String(brief || ''));
    var scored = window.AUTHORIAL_PROFILES.map(function(profile) {
      var score = 0;
      var loweredDisplay = normalizeText(profile.displayName);
      if (haystack.indexOf(loweredDisplay) !== -1) score += 10;
      var parts = loweredDisplay.split(' ');
      var surname = parts[parts.length - 1];
      if (surname && haystack.indexOf(surname) !== -1) score += 5;
      return { profile: profile, score: score };
    }).sort(function (left, right) {
      return right.score - left.score;
    });

    if (scored[0] && scored[0].score > 0) return scored[0].profile;
    return null;
  }

  function formatAuthorBias(authorProfile) {
    if (!authorProfile) return '';
    var reg = authorProfile.literaryRegister;
    return [
      '## Authorial Constraints & Tone',
      '',
      'The user has requested the distinctive style of ' + authorProfile.displayName + ' (' + reg.name + ').',
      'You MUST adopt the following behaviors:',
      '- ' + reg.behaviorDescription,
      '- DO NOT DO THIS: ' + reg.forbiddenMoves.join('; '),
      '- TYPOGRAPHY & FORMATTING: ' + reg.typographicBehavior,
      '',
      'This constraint overrides all generic design biases.'
    ].join('\n');
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

  function formatUserBrief(brief, fallbackText) {
    var raw = String(brief || '').trim();
    if (!raw) return fallbackText;
    if (raw.split(/\s+/).length < 15) {
      return raw + '\n\n' +
        '[ENGINE CONSTRAINT]: The user provided a minimal, raw premise. ' +
        'Do not attempt to make this epic, and do not use flowery, omniscient summaries. ' +
        'Treat this premise as literal reality. Ground it in sensory details. ' +
        'Choose a strict document format (like a logbook, letters, or inspection notes) to frame the narrative. ' +
        'Restrict your vocabulary: do not use phrases like "palpable tension", "a testament to", or "little did they know". ' +
        'Withhold information and enforce a slow-burn progression across the weeks.';
    }
    return raw;
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

  var SCHEMA_HEADER = window.SCHEMA_HEADER;
  var SCHEMA_META = window.SCHEMA_META;
  var SCHEMA_THEME = window.SCHEMA_THEME;
  var SCHEMA_WEEKS_PRE = window.SCHEMA_WEEKS_PRE;
  var SCHEMA_SPATIAL = window.SCHEMA_SPATIAL;
  var SCHEMA_WEEKS_POST = window.SCHEMA_WEEKS_POST;
  var SCHEMA_FRAGMENTS = window.SCHEMA_FRAGMENTS;
  var SCHEMA_TAIL = window.SCHEMA_TAIL;
  var SCHEMA_SPEC = window.SCHEMA_SPEC;
  var INSTRUCTIONS = window.INSTRUCTIONS;
  var STAGE1_OUTPUT_SCHEMA = window.STAGE1_OUTPUT_SCHEMA;
  var STAGE2_OUTPUT_SCHEMA = window.STAGE2_OUTPUT_SCHEMA;

  window.generatePrompt = function (workout, brief, dice) {
    window.blend = deriveDesignBlend(brief, workout);
    window.authorProfile = deriveAuthorBlend(brief);
    window.parts = [
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
      formatUserBrief(brief, buildDefaultBrief(workout, blend)),
      '',
      formatDesignBias(blend),
      formatAuthorBias(authorProfile || window.authorProfile),
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

  window.generateStage1Prompt = function (workout, brief, dice) {
    var blend = deriveDesignBlend(brief, workout);
    var authorProfile = deriveAuthorBlend(brief);
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
      formatUserBrief(brief, buildDefaultBrief(workout, blend)),
      '',
      formatDesignBias(blend),
      formatAuthorBias(authorProfile || window.authorProfile),
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
      JSON.stringify(layerBible),
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
      '- Oracle consequences should connect to the week\'s zone focus and active pressures.',
      '',
      '## Companion & Choice Doctrine',
      '- Each non-boss week must specify which named companion appears and how their stance changes.',
      '- companionChange must be specific: "X\'s trust increases because Y" — not "relationship develops."',
      '- The binary choice week must name: what the player gains from each option, what they lose,',
      '  and how at least one companion reacts differently based on the choice.',
      '- At least one companion\'s behavior in the final weeks depends on earlier player actions.',
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
    var authorProfile = deriveAuthorBlend(brief);
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
      formatUserBrief(brief, buildDefaultBrief(blendContext, blend)),
      '',
      formatDesignBias(blend),
      formatAuthorBias(authorProfile || window.authorProfile),
      '',
      '## Booklet Setup Requirements',
      '',
      '### Structural',
      '- meta.weekCount must equal ' + weekCount,
      '- meta.weeklyComponentType should match the layer codex\'s game layer',
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
      '  the protagonist\'s perception, vocabulary, and blind spots. Specific enough that',
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
      '- Rules sections must explain the play cadence diegetically, using the layer codex\'s',
      '  governing procedures. A player who reads only the rules spread should understand',
      '  what the institution expects them to do and why the weekly routine matters.',
      '',
      '### Visual Archetype & Theme',
      '- Choose the archetype that serves the fiction — not always "government."',
      '- Palette: 6 hex colors (ink, paper, accent, muted, rule, fog) that feel',
      '  like the world\'s stationery. A government archive, a coastal field office,',
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
    var authorProfile = deriveAuthorBlend(brief);
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
      parts.push(JSON.stringify(relevantOverflows));
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
    parts.push(formatUserBrief(brief, buildDefaultBrief(workout, blend)));
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
    parts.push('- The map must reflect this week\'s stateChange from the campaign plan.');
    parts.push('- Preserve the established mapType unless the campaign plan explicitly justifies a zoom or overlay shift.');
    parts.push('- Do not silently collapse point-to-point, linear-track, or player-drawn spaces into a grid.');
    parts.push('- Tiles changed from prior weeks: update type (locked→cleared, empty→anomaly, etc.).');
    parts.push('- New tiles must have labels drawn from the layer codex\'s governing layer or topology.');
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
    parts.push('- Oracle entries should connect to this week\'s zone focus and active pressures.');
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
      JSON.stringify(campaignPlan.fragmentRegistry || []),
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
    parts.push('- Honour the registry\'s clueFunction tag: "establishes" fragments plant baseline');
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
    parts.push('  (interpretation), and one that deepens a named character\'s stakes.');
    parts.push('- Every fragment must support at least one cross-reference: a place named on the map,');
    parts.push('  a date that aligns with a week\'s events, a person mentioned in a storyPrompt,');
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
      JSON.stringify(batchRegistry),
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
    parts.push('- Honour the registry\'s clueFunction tag: "establishes" fragments plant baseline');
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
        parts.push(JSON.stringify(binaryChoice));
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
    parts.push('- The ending is a found document that exists in-world — not a narrator\'s summary.');
    parts.push('- Choose a document type that the story has earned: final report, personal letter,');
    parts.push('  decommission order, recovered journal entry, institutional memo.');
    parts.push('- The document\'s author writes for their own purpose. They do not address the player.');
    parts.push('');
    parts.push('### Payoff Density');
    parts.push('- Name at least three specific earlier elements by their exact in-world identifiers:');
    parts.push('  a place, an object, a relationship, a phrase, a procedure, or a motif.');
    parts.push('- The decoded password truth must land — reference the revelation without');
    parts.push('  restating it mechanically. Show its consequence, not its content.');
    parts.push('- The binary choice and boss outcome must both visibly shape the document\'s');
    parts.push('  content, tone, or what the author knows. Not just which ending fires.');
    parts.push('');
    parts.push('### Variant Differentiation');
    parts.push('- Multiple endings must differ in emotional register, relationship resolution,');
    parts.push('  and what the author believes happened — not just plot outcome.');
    parts.push('- Each variant should feel like a different person wrote it, or the same person');
    parts.push('  in a fundamentally different emotional state.');
    parts.push('');
    parts.push('### Voice & Register');
    parts.push('- Preserve the booklet\'s established literary register while allowing deliberate');
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


  window.generateApiStage1Prompt = function (workout, brief, dice, options) {
    options = options || {};
    var blend = deriveDesignBlend(brief, workout);
    var authorProfile = deriveAuthorBlend(brief);
    return [
      '# API Stage 1 — Layer Codex',
      '',
      '## SCHEMA CONTRACT',
      window.buildStageSchema('layer-codex'),
      '',
      '## Stage Rules',
      '- Plan a persistent topology with explicit gates, named keys, revisitation logic, and boss convergence requirements.',
      '- Keep the protagonist arc specific: role, want, need, flaw, wound, arc, darkest moment, and costly transformation.',
      '- Relationship web must use 4-6 named characters with distinct secrets and arc functions.',
      '- Design ledger commitments are binding; later API stages will inherit these instead of re-planning the book.',
      '',
      '## Inputs',
      'Workout: ' + truncateText(workout, 3200),
      'Creative direction: ' + truncateText(formatUserBrief(brief, buildDefaultBrief(workout, blend)), 1800),
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
      '## SCHEMA CONTRACT',
      window.buildStageSchema('campaign-plan'),
      '',
      '## Stage Rules',
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
      '## SCHEMA CONTRACT',
      window.buildStageSchema('shell'),
      '',
      '## Stage Rules',
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
      truncateText(formatUserBrief(brief, buildDefaultBrief(blendContext, blend)), 1200),
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
    var authorProfile = deriveAuthorBlend(brief);
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
      '## SCHEMA CONTRACT',
      window.buildStageSchema('week-final'),
      '',
      '## Stage Rules',
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
      truncateText(formatUserBrief(brief, buildDefaultBrief(workout, blend)), 1000),
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
      '## SCHEMA CONTRACT',
      window.buildStageSchema('fragment'),
      '',
      '## Stage Rules',
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
      '## SCHEMA CONTRACT',
      window.buildStageSchema('fragment'),
      '',
      '## Stage Rules',
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
      '## SCHEMA CONTRACT',
      window.buildStageSchema('ending'),
      '',
      '## Stage Rules',
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

  // ── NEW SINGLE-UNIT PROMPT BUILDERS (Unit-Level Engine Refactor) ───────

  window.generateSingleWeekPlanPrompt = function (workout, brief, layerBible, campaignPlan, weekNumber, shellContext, continuity) {
    var weekWorkout = window.extractWeekWorkout(workout, [weekNumber]);
    var isBossWeek = campaignPlan && campaignPlan.weeks && weekNumber === campaignPlan.weeks.length;
    var weekLabel = isBossWeek ? 'Week ' + weekNumber + ' (Boss Week)' : 'Week ' + weekNumber;
    var planData = campaignPlan && campaignPlan.weeks ? campaignPlan.weeks.filter(function(w) { return w.weekNumber === weekNumber; })[0] : {};

    var parts = [
      '# Plan ' + weekLabel,
      '',
      'Generate a highly compact weekPlan JSON object containing narrative and structural intent.',
      '',
      '## SCHEMA CONTRACT',
      window.buildStageSchema('week-plan'),
      '',
      '## Context',
      '**World Contract:** ' + (shellContext.worldContract || ''),
      '**Week Workout:** ' + weekWorkout,
      '**Campaign Plan for ' + weekLabel + ':** ' + JSON.stringify(planData || {}),
      continuity ? '**Story So Far (abstract):** ' + JSON.stringify(continuity) : ''
    ];

    return parts.filter(Boolean).join('\n');
  };

  window.generateSingleWeekFinalPrompt = function (workout, brief, layerBible, campaignPlan, weekPlan, shellContext, continuity, allComponentValues) {
    var isBossWeek = campaignPlan && campaignPlan.weeks && weekPlan.weekNumber === campaignPlan.weeks.length;
    var weekWorkout = window.extractWeekWorkout(workout, [weekPlan.weekNumber]);
    var parts = [
      '# Write Week ' + weekPlan.weekNumber,
      '',
      'Generate exactly ONE week object as valid JSON.',
      'The root object MUST have "title" and "sessions" keys. Do NOT output meta, cover, rulesSpread, or theme.',
      'Do NOT regenerate the booklet shell. Output ONLY the week.',
      '',
      '## SCHEMA CONTRACT',
      window.buildStageSchema('week-final'),
      '',
      '## The Plan to Execute',
      JSON.stringify(weekPlan),
      '',
      '## Required Context',
      '**World Contract:** ' + (shellContext.worldContract || ''),
      '**Narrative Voice:** ' + JSON.stringify(shellContext.narrativeVoice || {}),
      '**Literary Register:** ' + JSON.stringify(shellContext.literaryRegister || {}),
      '',
      '**Week Workout:** ' + weekWorkout,
      '',
      continuity ? '**Continuity Rules:** ' + JSON.stringify(continuity) : '',
      isBossWeek && allComponentValues ? '**Prior Values for Boss Decode:** ' + JSON.stringify(allComponentValues) : '',
      '',
      '## Constraints',
      '- Preserve Specificity: storyPrompts must contain physical action and named places.',
      '- Do not flatten the style. Execute the exact Literary Register specified.',
      '- JSON only.'
    ];

    return parts.filter(Boolean).join('\n');
  };

  window.generateSingleFragmentPrompt = function (layerBible, registryEntry, weekSummaries, shellContext, pastFragments) {
    var parts = [
      '# Write Fragment ' + registryEntry.id,
      '',
      'Generate exactly ONE found document object as valid JSON. Do not over-explain.',
      '',
      '## SCHEMA CONTRACT',
      window.buildStageSchema('fragment'),
      '',
      '## Fragment Registry Assignment',
      JSON.stringify(registryEntry),
      '',
      '## Context',
      '**World Contract:** ' + (shellContext.worldContract || ''),
      '**Artifact Identity:** ' + JSON.stringify(shellContext.artifactIdentity || {}),
      '',
      '**Current Timeline (Cross-Reference Support):**',
      JSON.stringify(weekSummaries || []),
      '',
      pastFragments && pastFragments.length ? '**Prior Fragments (Prevent Repetition):** ' + JSON.stringify(pastFragments) : '',
      '',
      '## Constraints',
      '- The fragment MUST feel like an authentic, found document (memo, letter, dispatch).',
      '- Do not summarize lore. Include trivial details (routing codes, times) to heighten realism.',
      '- Cross-link to at least one entity, location, or finding from the Timeline above.',
      '- JSON only.'
    ];

    return parts.filter(Boolean).join('\n');
  };

  window.generateSingleEndingPrompt = function (layerBible, campaignPlan, variantId, shellContext, weekSummaries) {
    var parts = [
      '# Write Ending Variant: ' + variantId,
      '',
      'Generate ONE ending object as valid JSON.',
      '',
      '## SCHEMA CONTRACT',
      window.buildStageSchema('ending'),
      '',
      '## Context',
      '**World Contract:** ' + (shellContext.worldContract || ''),
      '**Narrative Voice:** ' + JSON.stringify(shellContext.narrativeVoice || {}),
      '',
      '**Journey So Far:**',
      JSON.stringify(weekSummaries || []),
      '',
      '## Constraints',
      '- The ending must meaningfully resolve the pressures established in the weeks.',
      '- Do not flatten the payoff into a cliché victory. Honour the cost of the journey.',
      '- JSON only.'
    ];

    return parts.filter(Boolean).join('\n');
  };

  window.generateTargetedRepairPrompt = function (unitName, badJsonStr, errorMessages, targetSchemaStr) {
    var msgs = errorMessages.length > 0 ? errorMessages.map(function(m) { return '- ' + m; }).join('\n') : '- Undefined structural error.';
    var parts = [
      '# Critical Repair Required for ' + unitName,
      '',
      'The previous generation produced structural or quality errors.',
      'You are a precise JSON repair utility. You must return EXACTLY the corrected JSON for "' + unitName + '".',
      '',
      '## Errors Detected (Fix these strictly)',
      msgs,
      '',
      '## Target Schema',
      targetSchemaStr,
      '',
      '## Broken JSON Input',
      '```json',
      badJsonStr,
      '```',
      '',
      '## Instructions',
      '- Ensure the response is COMPLETELY valid JSON.',
      '- Do not change valid creative choices or prose, ONLY fix the errors.',
      '- Output ONLY the JSON object. Do not wrap it in markdown.'
    ];

    return parts.filter(Boolean).join('\n');
  };

})();
