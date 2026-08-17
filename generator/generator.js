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

  // The run's variant salt. Pass the run seed's value and the salt IS the seed
  // — which turns `deriveDesignBlend`'s keyword-miss fallback from an anonymous
  // per-run hash into a draw reproducible from `_x.divergenceSeed` on the
  // finished book (D144's flagged relay, closed under VISION §11). Called with
  // no argument by the paste path, which has no run and no record to be
  // reproducible from; that path keeps the random salt it always had.
  window.beginLiftRpgPromptRun = function (runSeedValue) {
    var salt = runSeedValue ? String(runSeedValue) : createPromptVariantSalt();
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
    var currencySeeds = mergeUnique(primary.currencySeeds, secondary && secondary.currencySeeds).slice(0, 4);
    var scarcity = mergeUnique(primary.scarcitySurfaces, secondary && secondary.scarcitySurfaces).slice(0, 4);
    var payloads = mergeUnique(primary.interludePayloads, secondary && secondary.interludePayloads).slice(0, 4);
    var documents = mergeUnique(primary.documentTypes, secondary && secondary.documentTypes).slice(0, 6);
    var themes = mergeUnique(primary.themeHints, secondary && secondary.themeHints).slice(0, 4);
    // D144: the profiles carry a PROPOSAL SET now, not one board. Merged in
    // proposal order and capped at four so the line stays a shortlist rather
    // than "any of the six", which proposes nothing.
    var mapTypes = mergeUnique(primary.mapTypes || [], (secondary && secondary.mapTypes) || []).slice(0, 4);
    var cellShapes = mergeUnique(
      primary.cellShape ? [primary.cellShape] : [],
      (secondary && secondary.cellShape) ? [secondary.cellShape] : []
    );
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
      '- Exploration geometries PROPOSED (the mechanic grammar family decides; say so in selectionReason if you overrule these): '
        + mapTypes.join('; ')
        + (cellShapes.length ? ' — cellShape worth considering: ' + cellShapes.join('; ') : ''),
      '- Oracle tempo to prefer: ' + oracleModes.join('; '),
      '- Pressure systems to favor: ' + clocks.join('; '),
      '- Currency-name families to draw from or beat (a label portable between briefs is the wrong label): ' + currencySeeds.join('; '),
      '- Scarcity surfaces to favor: ' + scarcity.join('; '),
      '- Puzzle families to recombine: ' + puzzles.join('; '),
      '- Interlude payloads to favor: ' + payloads.join('; '),
      '- Document families to draw from: ' + documents.join('; '),
      '- Visual archetypes most likely to fit: ' + themes.join('; '),
      '',
      'The goal is not to make every week look the same. The goal is to make every week feel like it belongs to the same living system.'
    ].join('\n');
  }

  // ── Brief classification (Layer 3 planning) ──────────────────────────────
  // Classifies the user brief into a briefMode for the artifact intent compiler.
  // This is a heuristic — the model refines in-context, but this gives it a
  // starting signal and makes the classification visible in the prompt.

  function classifyBrief(brief) {
    var raw = String(brief || '').trim();
    if (!raw) return { briefMode: 'empty', fidelityMode: 'compositional' };

    var lower = raw.toLowerCase();
    var wordCount = raw.split(/\s+/).length;

    // Personal-subject detection: named pets, real people, possessive pronouns + proper nouns
    if (/\bmy\s+(dog|cat|yorkie|pup|puppy|kitten|partner|dad|mom|brother|sister|friend|grandma|grandpa)\b/i.test(raw)) {
      return { briefMode: 'personal-subject', fidelityMode: 'literal' };
    }

    // Reference-led detection: named works, authors, films
    if (/\b(meets|like|inspired by|in the style of|a la)\b/i.test(raw) && /\b[A-Z][a-z]+\s+[A-Z]/m.test(raw)) {
      return { briefMode: 'mashup', fidelityMode: 'interpretive' };
    }
    if (/\b(steinbeck|lovecraft|borges|kafka|hemingway|cormac mccarthy|ursula le guin|octavia butler)\b/i.test(lower)) {
      return { briefMode: 'reference-led', fidelityMode: 'interpretive' };
    }
    // Generic cultural reference patterns
    if (/\b(like the (movie|film|book|show|game|series)|inspired by|reminiscent of|homage to)\b/i.test(raw)) {
      return { briefMode: 'reference-led', fidelityMode: 'interpretive' };
    }

    // Mashup detection: X meets Y, X + Y, X but with Y
    if (/\b(meets|crossed with|mixed with|plus|but with|mashed with)\b/i.test(raw) && wordCount > 4) {
      return { briefMode: 'mashup', fidelityMode: 'interpretive' };
    }

    // Sparse vs explicit by word count
    if (wordCount < 15) {
      return { briefMode: 'sparse', fidelityMode: 'interpretive' };
    }

    return { briefMode: 'explicit', fidelityMode: 'literal' };
  }

  // ── The Armed Lens: compiler context (§10 of the gameplay brainstorm) ────
  //
  // ONE function assembles everything the artifact-intent compiler needs that
  // is not the schema itself: the pre-computed brief classification, the
  // divergence seed, and the derived program-shape digest. All three compiler
  // stages consume it (S+F skeleton, multi-stage shell, structured shell) so
  // the lens cannot be armed on one path and blind on another — which is what
  // "the compiler" being three separate prompt builders had already made easy.
  //
  // Home ruling: this lives in generator.js because classifyBrief,
  // formatUserBrief and buildDefaultBrief are IIFE-private here and the brief
  // channel is assembled from all three. It is window-exposed for
  // api-generator.js (a module, which cannot reach into this closure).

  // ── EVERY BOOK DRAWS A SEED (VISION §11, D146) ───────────────────────────
  // "Every book draws a seed — no brief is too rich to need one." Until this
  // wave the seed existed only for empty and sparse briefs, which made
  // "seeded against convergence" aspirational on every real brief: an explicit
  // brief got no die at all, so every identity choice it did not itself fund
  // was answered by the model's habit. The seed is now unconditional.
  //
  // THE SEED IS TWO THINGS AND THEY ARE SIZED DIFFERENTLY, which is the whole
  // repair. `value` is the ENTROPY — always present, the single source every
  // identity assignment is drawn from, and the thing recorded on the booklet so
  // the book is reproducible. `text` is DIRECTION MATERIAL, and it stays sized
  // to the reason exactly as before, because handing drawn premise material to
  // a user who wrote fifteen words of their own is not the two-source law, it
  // is the die overruling the brief — which §11 forbids in the same breath that
  // it mandates the seed ("the brief's own words earn it"). An explicit brief
  // therefore gets a seed and no seeded text, and its prompt is byte-identical
  // to what it was before this wave.
  //
  // Which classifications earn TEXT. `empty` is the design case; a `sparse`
  // brief gets material to be specific IN, never material that replaces what
  // the user said (see buildBriefChannel).
  function seedReasonFor(briefMode) {
    if (briefMode === 'empty') return 'empty';
    if (briefMode === 'sparse') return 'sparse';
    return null;
  }

  // The entropy itself, and the ONLY place in the seed path that is allowed to
  // be random. Everything downstream — every axis assignment, the design bias's
  // keyword-miss draw — is a pure function of this string, which is what makes
  // "same seed ⇒ same book identity" a checkable claim rather than a hope.
  // Hex, fixed width, so the recorded value is comparable by eye across runs.
  function drawSeedValue() {
    if (typeof crypto !== 'undefined' && crypto && typeof crypto.getRandomValues === 'function') {
      return Array.prototype.map.call(
        crypto.getRandomValues(new Uint32Array(4)),
        function (n) { return ('00000000' + n.toString(16)).slice(-8); }
      ).join('');
    }
    // No Web Crypto (old sandboxes, some test contexts). Still entropy, still
    // drawn once; the determinism guarantee is about what happens AFTER.
    var out = '';
    for (var i = 0; i < 4; i++) {
      out += ('00000000' + Math.floor(Math.random() * 4294967296).toString(16)).slice(-8);
    }
    return out;
  }

  // The draw is SIZED to the reason (Wave 2). An empty direction field gets
  // the full brief — there is nothing to bury, and the seed IS the choosing.
  // A sparse brief gets the texture slice only: five texture rolls (object,
  // dynamic, irony, motif, returning place) and a touchstone — no premise,
  // no protagonist, no setting, no voice. The full
  // draw was ten times the mass of a five-word premise, and buildBriefChannel
  // could only ask the model to subordinate it; this makes the subordination
  // structural instead of rhetorical — the seed no longer CONTAINS a competing
  // premise, so it cannot displace the user's.
  function drawDivergenceSeed(reason) {
    var text = '';
    if (reason && typeof window.randomizeBrief === 'function') {
      try {
        if (reason === 'sparse' && typeof window.randomizeBriefSlice === 'function') {
          text = String(window.randomizeBriefSlice('texture') || '');
        }
        // Empty briefs, and any environment whose story-tables predates the
        // slice API, fall back to the full draw.
        if (!text.trim()) text = String(window.randomizeBrief() || '');
      } catch (_e) { text = ''; }
    }
    // Story-tables absent, or a brief that funds its own direction: the
    // MATERIAL is simply removed. The seed itself is not — it still carries the
    // entropy every identity assignment is drawn from, and `reason: 'identity'`
    // records honestly that this seed exists to assign, not to direct.
    // `source` names the table set so a future second drawer is distinguishable
    // in the record. No timestamp: this object is persisted in the checkpoint
    // and compared across resumes, and a clock would make it unstable.
    return {
      source: 'story-tables',
      reason: text.trim() ? reason : 'identity',
      text: text.trim() ? text : '',
      value: drawSeedValue()
    };
  }

  // The brief CHANNEL, not the instruction channel (§10.3). A drawn seed is the
  // same material a user could have pasted, so it enters where user direction
  // enters — which is what structurally satisfies D47 rather than promising to.
  function buildBriefChannel(workout, brief, blend, seed) {
    var userChannel = formatUserBrief(brief, buildDefaultBrief(workout, blend));
    // A seed with no material has nothing to say HERE. Its work is the identity
    // assignments, which reach the model through their own stage block.
    if (!seed || !seed.text) return userChannel;

    if (seed.reason === 'empty') {
      // Total substitution. buildDefaultBrief's "no direction provided" block
      // offers four alternative pushes and a trope ban — all of it is now
      // noise that competes with an actual choice. The seed IS the choosing.
      return [
        '[SEEDED DIRECTION]: The direction field was empty. A seed direction was drawn for',
        'this booklet. Interpret it under FULL fidelity doctrine — it is direction, not a',
        'suggestion. Build around what it names, exactly, the way you would around a brief',
        'the user typed. Do not abstract it toward something safer or more general.',
        '',
        seed.text
      ].join('\n');
    }

    // Sparse: the user DID write something. Precedence is the whole contract
    // here — the seed is ten times the mass of a five-word premise and will
    // eat it unless the ordering is stated in the imperative.
    return [
      userChannel,
      '',
      '[SEED MATERIAL — SUBORDINATE]: The direction above is thin, so TEXTURE was drawn to give',
      'it specifics to be specific in. It is texture and a tonal touchstone only — no premise,',
      'no protagonist, no setting — because those are the user\'s to name and the user\'s words',
      'are PRIMARY and BINDING. Use the seed only where it does not contradict them. Where the',
      'two disagree, the user wins and the seed is discarded.',
      '',
      seed.text
    ].join('\n');
  }

  /**
   * Arm the artifact-intent compiler for one stage call.
   *
   * @param {string} workout  raw program text (or normalized-workout object)
   * @param {string} brief    the USER's creative direction, pre-seed
   * @param {object} options
   *   options.divergenceSeed  an already-drawn seed to REUSE (resume/retry).
   *                           Supplying it is how "draw exactly once per run"
   *                           is enforced: prompt builders run per attempt.
   *   options.drawSeed        false to suppress drawing entirely.
   * @returns {{briefMode, fidelityMode, divergenceSeed, topology,
   *            briefChannel, contextBlock}}
   */
  function armCompilerContext(workout, brief, options) {
    // Coerced, not merely defaulted. window.generatePrompt's third parameter
    // was vestigial for years — the smoke and generator suites both pass a
    // dice string there that the function never read — and giving that slot
    // meaning would otherwise turn 'd6' into an options bag whose every lookup
    // silently returns undefined. Anything that is not an object is not options.
    options = (options && typeof options === 'object') ? options : {};
    var classified = classifyBrief(brief);
    var briefMode = classified.briefMode;
    var fidelityMode = classified.fidelityMode;

    var seed = options.divergenceSeed || null;
    if (!seed && options.drawSeed !== false) {
      // Unconditional as of the fourth-referee wave. The arming condition that
      // used to sit here (`if (reason)`) is what made an explicit brief's book
      // undiced; `seedReasonFor` survives as the sizing of the MATERIAL, which
      // is the thing that legitimately depends on how much the user wrote.
      seed = drawDivergenceSeed(seedReasonFor(briefMode));
    }

    // A drawn seed for an EMPTY brief upgrades fidelity to literal. Leaving it
    // at `compositional` ("infer aggressively") while the brief channel says
    // "full fidelity doctrine" would put two contradictory instructions in one
    // prompt — the model splits the difference and the seed dissolves. The
    // RECORD still says the user gave nothing: briefMode stays `empty`.
    if (seed && seed.reason === 'empty') fidelityMode = 'literal';

    var topology = typeof window.buildWorkoutTopology === 'function'
      ? window.buildWorkoutTopology(workout)
      : null;

    var contextLines = [
      '## Brief Classification (pre-computed)',
      'The system has classified this brief as:',
      '- briefMode: ' + briefMode,
      '- fidelityMode: ' + fidelityMode,
      'Use these as your starting point for meta.artifactIntent. You may refine them',
      'based on your interpretation, but do not ignore them.'
    ];
    // Gated on the MATERIAL, not on the seed. Every book now has a seed, and
    // this block is a note about the brief channel — telling a model with an
    // explicit brief that "the channel below carries seeded material" when it
    // carries none is a false sentence, and it would put every paste-path
    // prompt over a ceiling it currently clears with 318 characters.
    if (seed && seed.text) {
      contextLines.push(
        '- divergenceSeed: drawn (reason: ' + seed.reason + '). The creative direction channel',
        '  below carries seeded material. Record briefMode as classified above — it describes',
        '  what the USER supplied — and read the seeded material as real direction.'
      );
    }

    var topologyBlock = (topology && typeof window.formatWorkoutTopologyBlock === 'function')
      ? window.formatWorkoutTopologyBlock(topology)
      : '';

    // THE GIVENS (VISION §11). The assignments and the stage's axis slice
    // arrive as DATA from the orchestrator — this file is a classic script and
    // cannot import the contract module, and the sentences about what to do
    // with them live in prompt_rules.js where every prompt sentence lives.
    // Riding armCompilerContext is what reaches all three compiler seats at
    // once: the S+F skeleton, the multi-stage shell and the structured shell
    // are three builders and one contract, and D144 W-3's lesson is that a
    // value demanded at a stage must be SHOWN to that stage on BOTH pipelines.
    var assignmentBlock = (typeof window.formatSeedAssignmentBlock === 'function')
      ? window.formatSeedAssignmentBlock(options.seedAssignments, options.identityAxes)
      : '';

    return {
      briefMode: briefMode,
      fidelityMode: fidelityMode,
      divergenceSeed: seed,
      topology: topology,
      briefChannel: function (blend) { return buildBriefChannel(workout, brief, blend, seed); },
      contextBlock: [contextLines.join('\n'), topologyBlock, assignmentBlock]
        .filter(Boolean).join('\n\n')
    };
  }

  window.armCompilerContext = armCompilerContext;

  // Draw-once-per-run seam. A prompt builder runs once per ATTEMPT, so a
  // builder that draws its own seed hands every retry a different world. The
  // run orchestrator calls this exactly once, then passes the result into every
  // builder as options.divergenceSeed. It now returns a seed on EVERY run —
  // the null return was the arming condition, and §11 removed it.
  window.resolveDivergenceSeed = function (brief) {
    return drawDivergenceSeed(seedReasonFor(classifyBrief(brief).briefMode));
  };

  // ── Artifact intent contract formatter (Layer 3 planning) ──────────────
  // Produces compact binding contract text from meta.artifactIntent for
  // downstream prompts. ONE formatter, both pipelines: the S+F builders reach
  // it through extractSkeletonContext, and the multi-stage builders reach it
  // through assembly.js extractShellContext (which now carries artifactIntent
  // for exactly this reason). Window-exposed because api-generator.js and the
  // multi-stage builders are outside this closure.
  //
  // Takes anything with an `.artifactIntent` — a skeleton's meta or a shell
  // context — so neither caller has to reshape its object first.

  function formatArtifactIntentContract(meta) {
    var intent = (meta || {}).artifactIntent;
    if (!intent) return '';

    var ecology = intent.documentEcology || {};
    var exclusions = intent.exclusions || {};
    var reading = intent.reading || {};

    var lines = [
      '## Artifact Intent Contract (BINDING — do not drift)',
      '',
      'The skeleton stage committed to these planning decisions. You MUST preserve them.',
      'Do not collapse back to generic LiftRPG defaults.',
      '',
      '- Arc family: ' + (intent.arcFamily || 'unspecified'),
      '- Mechanic grammar: ' + (intent.mechanicGrammarFamily || 'unspecified'),
      '- Home pull: ' + (intent.homePull || 'mixed'),
      '- Fidelity mode: ' + (intent.fidelityMode || 'interpretive')
    ];

    if (intent.convergencePattern) {
      lines.push('- Convergence pattern: ' + intent.convergencePattern);
    }

    if (ecology.dominant && ecology.dominant.length > 0) {
      lines.push('- Document ecology dominant: ' + ecology.dominant.join(', '));
    }
    if (ecology.forbidden && ecology.forbidden.length > 0) {
      lines.push('- Document ecology FORBIDDEN: ' + ecology.forbidden.join(', ') + ' — do NOT use these types');
    }
    if (exclusions.mechanicExclusions && exclusions.mechanicExclusions.length > 0) {
      lines.push('- Mechanic exclusions: ' + exclusions.mechanicExclusions.join(', ') + ' — do NOT use these board-state modes');
    }
    if (exclusions.arcExclusions && exclusions.arcExclusions.length > 0) {
      lines.push('- Arc exclusions: ' + exclusions.arcExclusions.join(', ') + ' — do NOT follow these arc patterns');
    }

    // The recorded reading, compacted (Wave 2). The compiler wrote down how it
    // read the brief and then every prose stage wrote the book without ever
    // seeing it — the reading was auditable after the fact and invisible
    // during. Three fields only: tone and register are what the prose must
    // sound like, emotionalArc is what it must move toward. briefEvidence is
    // deliberately excluded — it is the critic's exhibit for grading the
    // reading against the brief, and quoting the brief back at a week-writer
    // invites transcription rather than interpretation.
    var readingLines = [];
    if (reading.tone) readingLines.push('- Tone: ' + reading.tone);
    if (reading.register) readingLines.push('- Register: ' + reading.register);
    if (reading.emotionalArc) readingLines.push('- Emotional arc: ' + reading.emotionalArc);
    if (readingLines.length) {
      lines.push('');
      lines.push('The recorded reading of the brief — write inside it, not beside it:');
      lines = lines.concat(readingLines);
    }

    lines.push('');
    lines.push('Obligations:');
    lines.push('- Session prompts must follow the ' + (intent.arcFamily || '') + ' tension curve, not a generic escalation');
    lines.push('- Mechanics must match the ' + (intent.mechanicGrammarFamily || '') + ' grammar, not default survey-grid');
    lines.push('- Documents must use dominant types (' + (ecology.dominant || []).join(', ') + '), never forbidden types');
    lines.push('- If content drifts toward a different arc or mechanic family, rewrite it');

    return lines.join('\n');
  }

  window.formatArtifactIntentContract = formatArtifactIntentContract;

  // ── Skeleton context extractor (Skeleton+Flesh) ─────────────────────────
  // The S+F sibling of assembly.js `extractShellContext`. Every flesh builder
  // used to pluck meta.blockTitle / worldContract / narrativeVoice /
  // literaryRegister by hand, five times over, which is how a new identity
  // field reaches four of five prompts and nobody notices. One projection, one
  // renderer, five callers.
  //
  // Returns a plain object rather than prompt text so callers can read
  // individual fields (the week builder needs weeklyComponentType, the ending
  // builder needs the resolution) without re-reaching into meta.
  function extractSkeletonContext(skeleton) {
    var meta = (skeleton || {}).meta || {};
    return {
      blockTitle:          meta.blockTitle || '',
      worldContract:       meta.worldContract || '',
      narrativeVoice:      meta.narrativeVoice || {},
      literaryRegister:    meta.literaryRegister || {},
      structuralShape:     meta.structuralShape || {},
      artifactIdentity:    meta.artifactIdentity || {},
      weeklyComponentType: meta.weeklyComponentType || '',
      // The currency (D144). extractShellContext's twin on this pipeline, and
      // the D103 contract row applies verbatim: both projections carry it or
      // one pipeline's prose stages are unfunded. The flesh prompts must be
      // SHOWN the label to print it verbatim, which is what INST_MARK_SURFACE
      // demands and what currencyMentionVerdict grades.
      economy:             meta.economy || null,
      // The knowing (§11 Wave 1.5). Null when the stage did not run or the
      // model returned nothing usable — every consumer must tolerate absence,
      // because a booklet generated before this wave has none.
      processParticulars:  meta.processParticulars || null,
      intentContract:      formatArtifactIntentContract(meta)
    };
  }

  // ── Process particulars renderer (the knowing, in prompt form) ──────────
  // Prompt-side rendering of meta.processParticulars for the prose stages.
  // Returns '' when there is nothing authored, so callers can .filter(Boolean)
  // it out and a pre-knowing skeleton produces byte-identical prompts.
  //
  // Entry and length caps are prompt-budget defence, not doctrine: this block
  // rides EVERY week, fragment, and ending prompt, so an over-generous knowing
  // stage must not be able to crowd out the schema it is meant to fund.
  var KNOWING_MAX_ENTRIES_PER_CATEGORY = 14;
  var KNOWING_MAX_ENTRY_CHARS = 200;
  var KNOWING_CATEGORIES = [
    ['instruments',        'Instruments and what they are called'],
    ['paperworkRealities', 'Paperwork realities'],
    ['orderOfOperations',  'Order of operations'],
    ['periodSpecifics',    'Period and regional specifics']
  ];

  function formatProcessParticulars(particulars) {
    if (!particulars || typeof particulars !== 'object') return '';
    var blocks = [];
    for (var i = 0; i < KNOWING_CATEGORIES.length; i++) {
      var key = KNOWING_CATEGORIES[i][0];
      var heading = KNOWING_CATEGORIES[i][1];
      var list = particulars[key];
      if (!Array.isArray(list) || list.length === 0) continue;
      var entries = [];
      for (var j = 0; j < list.length && entries.length < KNOWING_MAX_ENTRIES_PER_CATEGORY; j++) {
        var raw = String(list[j] == null ? '' : list[j]).trim();
        if (!raw) continue;
        entries.push('- ' + (raw.length > KNOWING_MAX_ENTRY_CHARS
          ? raw.slice(0, KNOWING_MAX_ENTRY_CHARS - 1) + '…'
          : raw));
      }
      if (entries.length) blocks.push('### ' + heading + '\n' + entries.join('\n') + '\n');
    }
    if (!blocks.length) return '';

    return [
      '## The Knowing — this world\'s process particulars (BINDING)',
      '',
      'These were authored for this booklet before any prose was written. They',
      'are the material your plainness is funded by: SELECT from them, do not',
      'invent a parallel set, and do not contradict them. Use the working names',
      'exactly as written. Not every particular belongs in every unit — choosing',
      'which ones a given writer would have recorded IS the characterization.',
      ''
    ].concat(blocks).join('\n');
  }

  /**
   * formatCurrencyGiven(economy) -> string ('' when no label is authored)
   *
   * THE ONE HOME for the currency GIVEN (D144, corrected). The demand is
   * VERBATIM reproduction — `week.reckoning.conversion` must print
   * `meta.economy.currencyLabel` character for character — and a model can only
   * reproduce a phrase it has been SHOWN. So every prompt whose stage authors a
   * conversion sentence prints the label on a line of its own.
   *
   * WHY A FUNCTION AND NOT THREE STRINGS, which is the whole defect this
   * replaces. D144 landed the given as an inline expression in
   * generateApiWeekChunkPrompt and a second, differently-worded one inside
   * formatSkeletonIdentityBlock. It missed generateSingleWeekFinalPrompt — and
   * that is the builder the multi-stage pipeline ACTUALLY calls for every week
   * (`builders.singleWeekFinal`, api-generator.js). generateApiWeekChunkPrompt
   * is reachable from no live pipeline path at all, so the given was added to a
   * builder nothing runs and to the S+F twin, and the default pipeline went on
   * writing every week blind. Measured cost: the first completed book renamed
   * the currency in 6 of 6 weeks, each one a book-level ERROR found after every
   * paid prose stage had already run.
   *
   * One function, three callers, one floors row that asserts the label reaches
   * each of them. A fourth week builder added later either calls this or fails
   * that row.
   *
   * Returns '' when no label is authored, so a pre-D144 skeleton or shell
   * produces a byte-identical prompt.
   */
  function formatCurrencyGiven(economy) {
    var label = String(((economy || {}).currencyLabel) || '').trim();
    if (!label) return '';
    return 'CURRENCY (a GIVEN — this booklet pays out "' + label + '"): every '
      + 'week.reckoning.conversion sentence must print that phrase VERBATIM, whole, once. '
      + 'Not a synonym, not the modifier alone, not a second name for the same thing — '
      + 'the player counts one currency and it is spelled exactly this way.';
  }
  window.formatCurrencyGiven = formatCurrencyGiven;

  // Shared identity header for the Skeleton+Flesh flesh builders. `extraLines`
  // are the per-stage additions (component type, resolution, artifact shape);
  // `includeKnowing` is false for the rules spread, which is deliberately
  // instrument-flat and outside the fiction (VOICE.md §1).
  function formatSkeletonIdentityBlock(ctx, options) {
    options = options || {};
    var lines = [
      '## Booklet Identity',
      '- Title: ' + ctx.blockTitle,
      '- World Contract: ' + ctx.worldContract,
      '- Voice: ' + JSON.stringify(ctx.narrativeVoice),
      '- Register: ' + JSON.stringify(ctx.literaryRegister)
    ].concat(
      // The currency, printed as its own line rather than buried in a JSON
      // blob (D144). The reckoning sentence must reproduce this string
      // CHARACTER FOR CHARACTER, so the prompt shows it that way — a label the
      // model has to dig out of a serialized object is a label it paraphrases.
      // Absent on any skeleton authored before the currency floor: the line is
      // simply not emitted, and such a prompt is byte-identical to before.
      // Wording now comes from formatCurrencyGiven — the one home, so the three
      // week builders cannot drift apart again (see that function's header).
      formatCurrencyGiven(ctx.economy) ? ['- ' + formatCurrencyGiven(ctx.economy)] : []
    ).concat(options.extraLines || []);

    var parts = [lines.join('\n'), ''];
    if (ctx.intentContract) parts.push(ctx.intentContract, '');
    if (options.includeKnowing !== false) {
      var knowing = formatProcessParticulars(ctx.processParticulars);
      if (knowing) parts.push(knowing, '');
    }
    return parts.join('\n');
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

  window.generatePrompt = function (workout, brief, options) {
    var blend = deriveDesignBlend(brief, workout);
    window.authorProfile = deriveAuthorBlend(brief);
    // The classic modal path assembles the flat INSTRUCTIONS bundle, which
    // includes INST_ARTIFACT_COMPILER — so this IS a compiler surface and gets
    // the armed context (ruling D, §11 Wave 1). One prompt, one paste, no run
    // orchestration: the seed is drawn here and lives only in the text the user
    // copies. There is no checkpoint to replay, and re-opening the modal
    // legitimately draws a new direction.
    var armed = armCompilerContext(workout, brief, options || {});
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
      armed.briefChannel(blend),
      '',
      armed.contextBlock,
      '',
      formatDesignBias(blend),
      formatAuthorBias(authorProfile || window.authorProfile),
      '',
      '---',
      '',
      INSTRUCTIONS
    ];

    return parts.join('\n');
  };

  /**
   * The cipher-variety demand, as a prompt line.
   *
   * ONE HOME: `cipherVarietyFloor()` in generator/modules/validation.js, capped
   * by GENERATION_CIPHER_TECHNIQUES in contract-constants.mjs. It reaches this
   * classic-IIFE file through the `window` bridge api-generator.js installs.
   * Two builders each carried a hand-copied `Math.min(Math.max(n - 2, 3), ...)`
   * before W7, so the prompt and the gate could disagree — and at 12 weeks they
   * did, both demanding 10 distinct techniques against a menu of 8.
   *
   * NO FALLBACK FORMULA. If the bridge is missing, the line states the rule
   * without a number. A guessed number here would be a prompt demanding a floor
   * the gate does not enforce, which is the failure this replaced.
   */
  function cipherVarietyLine(weekCount) {
    var floor = (typeof window.cipherVarietyFloor === 'function')
      ? window.cipherVarietyFloor(weekCount) : null;
    return floor
      ? '- Use at least ' + floor + ' distinct cipher types across the non-boss weeks.'
      : '- Give as many non-boss weeks as possible a cipher type no earlier week used.';
  }

  // ── Week count + chunking utilities ────────────────────────────────────────

  window.parseWeekCount = function (workout) {
    var text = String(workout || '');
    // Primary: count distinct "Week N" headers (most reliable for structured input)
    var headers = text.match(/^Week\s+\d+/gim);
    if (headers && headers.length >= 2) {
      return Math.max(4, Math.min(12, headers.length));
    }
    // Fallback: look for "N weeks" phrase (unstructured text)
    var match = text.match(/\b(\d+)\s+weeks?\b/i);
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

  window.generateStage1Prompt = function (workout, brief) {
    var blend = deriveDesignBlend(brief, workout);
    var authorProfile = deriveAuthorBlend(brief);
    var parts = [
      '# Stage 1 — Layer Codex',
      '',
    ].concat(window.INST_STAGE1_DOCTRINE, [
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
      '---',
      '',
      '## Output Schema',
      '',
      STAGE1_OUTPUT_SCHEMA
    ]);
    return parts.join('\n');
  };

  window.generateStage2Prompt = function (workout, brief, layerBible) {
    var weekCount = window.parseWeekCount(workout);
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
    ].concat(window.buildStage2Doctrine(weekCount), [
      '',
      '---',
      '',
      '## Output Schema',
      '',
      STAGE2_OUTPUT_SCHEMA
    ]);
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
    SCHEMA_COVER_RULES
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

  var SCHEMA_ENDINGS_PARTIAL = [].concat(
    ['# LiftRPG Endings Schema — Partial Output'],
    [''],
    ['Output a JSON object with a single `endings` array.'],
    [''],
    window.SCHEMA_ENDINGS
  ).join('\n');

  /**
   * Stage 3 (API pipeline): Booklet Shell — meta, cover, rulesSpread, theme
   */
  window.generateShellPrompt = function (brief, layerBible, campaignPlan, options) {
    options = options || {};
    var blendContext = buildBlendContextFromPlans(layerBible, campaignPlan);
    var blend = deriveDesignBlend(brief, blendContext);
    var authorProfile = deriveAuthorBlend(brief);
    var weekCount = (campaignPlan.weeks || []).length || 6;
    // The shell stage is this pipeline's artifact-intent compiler (INSTRUCTIONS
    // and buildStageSchema('shell') both carry INST_ARTIFACT_COMPILER), so it
    // gets the same armed context the S+F skeleton gets. options.workout is
    // supplied by the run orchestrator — this builder's own signature has never
    // carried the program, and topology without it would be silently absent.
    var armed = armCompilerContext(options.workout || blendContext, brief, options);
    // THE DOOR GIVENS. `options.plannedWeekShapes` is the orchestrator's ONE
    // derivation of the week picture — the same array the shell gate's
    // pre-flight is checked against — so the prompt and the floor cannot form
    // different opinions about who owes a door. Empty for every caller that has
    // no week picture, and the block is empty with it.
    var doorGivens = (typeof window.formatPlannedDoorGivensBlock === 'function')
      ? window.formatPlannedDoorGivensBlock(options.plannedWeekShapes)
      : '';
    var parts = [
      '# Booklet Setup — meta, cover, rulesSpread, theme',
      '',
      'Generate the booklet infrastructure as a partial JSON object.',
      'Output a JSON object with exactly these top-level keys: meta, cover, rulesSpread, theme.',
      'Do NOT output weeks, fragments, or endings — those come in later stages.',
      '',
      '---',
      '',
      window.buildStageSchema('shell'),
      ''
    ].concat(doorGivens ? [doorGivens, ''] : []).concat([
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
      armed.briefChannel(blend),
      '',
      armed.contextBlock,
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
    ]);
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
      parts.push('### Planned Overflow Documents (BINDING — do not invent new IDs)');
      parts.push('When a week has > 3 sessions, it gets overflow: true and needs an overflowDocument.');
      parts.push('Each overflow week below has a pre-assigned overflow document. You MUST use it:');
      parts.push('- overflowDocument.id MUST exactly match the planned entry id below');
      parts.push('- overflowDocument.documentType MUST match the planned entry documentType');
      parts.push('- Do NOT invent a new overflow ID or document type for any week that has a planned entry');
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
      // The planning contract (Wave 2). Same shell channel, same formatter the
      // S+F builders use — before this, the multi-stage pipeline compiled an
      // artifactIntent at the shell stage and then never showed it to any
      // stage that wrote prose.
      var intentBlock = formatArtifactIntentContract(shellContext);
      if (intentBlock) { parts.push(''); parts.push(intentBlock); }
      // The knowing (§11 Wave 1.5): authored process particulars ride the
      // same shell channel as the rest of the identity contract.
      var knowingBlock = formatProcessParticulars(shellContext.processParticulars);
      if (knowingBlock) { parts.push(''); parts.push(knowingBlock); }
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
        parts.push('- **OVERFLOW CONTRACT (BINDING):** overflowDocument.id MUST be "' + plannedOF.id +
          '", documentType MUST be "' + plannedOF.documentType +
          '", author: ' + (plannedOF.author || 'unknown'));
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
   * Internal: render week summary lines into a parts array.
   * Used by the batch fragment prompt builders.
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
      // The planning contract (Wave 2). Same shell channel, same formatter the
      // S+F builders use — before this, the multi-stage pipeline compiled an
      // artifactIntent at the shell stage and then never showed it to any
      // stage that wrote prose.
      var intentBlock = formatArtifactIntentContract(shellContext);
      if (intentBlock) { parts.push(''); parts.push(intentBlock); }
      // The knowing (§11 Wave 1.5): authored process particulars ride the
      // same shell channel as the rest of the identity contract.
      var knowingBlock = formatProcessParticulars(shellContext.processParticulars);
      if (knowingBlock) { parts.push(''); parts.push(knowingBlock); }
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
    parts.push('- Do not flatten different document types into the same memo-like texture. A transcript, inspection,');
    parts.push('  correspondence, and field note must look and read like different document species.');
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
      SCHEMA_ENDINGS_PARTIAL,
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
      // The planning contract (Wave 2). Same shell channel, same formatter the
      // S+F builders use — before this, the multi-stage pipeline compiled an
      // artifactIntent at the shell stage and then never showed it to any
      // stage that wrote prose.
      var intentBlock = formatArtifactIntentContract(shellContext);
      if (intentBlock) { parts.push(''); parts.push(intentBlock); }
      // The knowing (§11 Wave 1.5): authored process particulars ride the
      // same shell channel as the rest of the identity contract.
      var knowingBlock = formatProcessParticulars(shellContext.processParticulars);
      if (knowingBlock) { parts.push(''); parts.push(knowingBlock); }
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

  // Same cap, but LINE-PRESERVING. truncateText collapses every run of
  // whitespace to a single space, which is right for a paragraph of prose and
  // wrong for material whose structure carries the meaning: a drawn seed is ten
  // labelled lines (Protagonist / Fatal flaw / Antagonist / …), and collapsing
  // them yields one 1,500-character run-on that the model has to re-parse.
  //
  // Deliberately NOT swapped in for the unseeded brief channel: that would
  // change the prompt bytes of every existing run for a reason this wave has no
  // evidence for. Seeded material is new, so it gets the better treatment.
  function capText(value, maxLength) {
    var text = String(value || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
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
      // D144: a proposal SET, capped for the same reason formatDesignBias caps
      // it. `cellShapeBias` rides alongside rather than inside, because hex is a
      // variant of `grid` and folding it into the type list would offer the
      // model a seventh map type the schema does not have.
      topologyBias: mergeUnique(primary.mapTypes || [], (secondary && secondary.mapTypes) || []).slice(0, 4),
      cellShapeBias: mergeUnique(
        primary.cellShape ? [primary.cellShape] : [],
        (secondary && secondary.cellShape) ? [secondary.cellShape] : []
      ),
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
          sessionCount: week.sessionCount || 0,
          fragmentIds: (week.fragmentIds || []).slice(0, 8),
          overflowFragmentId: week.overflowFragmentId || '',
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
      artifactIdentity: shellContext.artifactIdentity || null,
      // NON-NEGOTIABLE (D144). This projection is what the week, fragment and
      // ending prompts of the standard pipeline actually read, and
      // INST_MARK_SURFACE demands the week's reckoning sentence print
      // `meta.economy.currencyLabel` verbatim, whole phrase, once. A verbatim
      // demand whose subject is not in the prompt is a rule the model can only
      // satisfy by luck — and the measurement says it does not: F04 failed 17
      // of 18 weeks across three books. Untruncated, deliberately: this is the
      // one field whose value must survive character-for-character.
      economy: shellContext.economy || null
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


  // ══════════════════════════════════════════════════════════════════════════
  // SKELETON + FLESH PIPELINE PROMPT BUILDERS
  // ══════════════════════════════════════════════════════════════════════════
  //
  // Skeleton: one call produces the complete structural scaffold (no prose).
  // Flesh: individual calls fill each content unit with actual writing.
  // Assembly: deterministic merge of skeleton + flesh outputs.

  /**
   * Skeleton prompt — produces the complete structural scaffold.
   * Replaces Layer Codex + Campaign Plan (2 fragile stages → 1 robust stage).
   */
  window.generateSkeletonPrompt = function (workout, brief, options) {
    options = options || {};
    // The pipeline's resolved book length when it has one; parseWeekCount is
    // the fallback for pipeline-free callers. Same reason as
    // generateApiStage2Prompt: parseWeekCount clamps to 4-12.
    var weekCount = (options.weekCount > 0) ? options.weekCount : window.parseWeekCount(workout);
    var blend = deriveDesignBlend(brief, workout);
    var armed = armCompilerContext(workout, brief, options);
    return [
      '# LiftRPG Booklet Skeleton',
      '',
      'You are planning the STRUCTURAL SKELETON of a LiftRPG print-and-play booklet.',
      'This booklet fuses a real workout program with a branching narrative TTRPG.',
      'The workout IS the story clock. The story IS the workout meaning-making system.',
      '',
      '## Your Task',
      'Return a single JSON object containing ONLY structural decisions — no long prose,',
      'no session content, no fragment bodies, no exercise details. Just the scaffold that',
      'later stages will fill with writing.',
      '',
      armed.contextBlock,
      '',
      window.INST_ARTIFACT_COMPILER.join('\n'),
      '',
      // The compiler's Steps 7/7a/9 menus (D144). This is the S+F pipeline's
      // compiler seat, so it owes the same three choices the shell stage owes —
      // and the shell family, the ecology and the pull are declared HERE or
      // nowhere on this path. Routed by hand rather than through
      // STAGE_SCHEMA_MAP because this builder predates the stage map and
      // assembles INST_ARTIFACT_COMPILER by hand too; the pair moves together.
      window.INST_SHELL_CHOICE.join('\n'),
      '',
      // The two-source law, hand-routed for the same reason the menus above
      // are: this is the S+F compiler seat and it assembles its own sections.
      // The menus and the law that governs answering them move together — a
      // seat shown the menu and not the law would read the assignments in
      // `armed.contextBlock` as a fourth menu rather than as givens.
      window.INST_SEED_ASSIGNMENT.join('\n'),
      '',
      // The skeleton authors meta.literaryRegister (the voiceSpec) and
      // meta.worldContract (the knowing) — both are prose law, so the doctrine
      // travels with the stage that writes them. Content lives in prompt_rules.
      window.INST_VOICE_DISCIPLINE.join('\n'),
      '',
      window.MECHANIC_VOCAB_BRIEF,
      '',
      window.SCHEMA_SKELETON,
      '',
      '## Output Example',
      window.SKELETON_OUTPUT_EXAMPLE,
      '',
      '## Hard Constraints',
      '- Exactly ' + weekCount + ' weeks. Final week MUST be boss week (isBossWeek: true).',
      '- Password word length = ' + (weekCount - 1) + ' letters (one componentValue per non-boss week).',
      '- Each non-boss componentValue must be an integer 1-26 (A1Z26 encoding).',
      '- The boss week\'s componentValue is null.',
      '- Fragment IDs: use pattern F.01, F.02, etc. Create 12-30 fragments.',
      '- Every fragmentId referenced in weekPlan must exist in fragmentRegistry.',
      '- Overflow weeks (sessionCount > 3) must have an overflowFragmentId.',
      '- Exactly one binary choice week (isBinaryChoiceWeek: true), typically at the midpoint.',
      '- Cipher values are FICTION-NATIVE (numbers, codes, readings), NEVER raw letters.',
      '- palette colors must be valid 6-digit hex (#rrggbb) and form a cohesive visual identity.',
      '',
      '## Quality Targets',
      '- worldContract: a testable governing tension, not a summary. It drives the whole booklet.',
      '- arcBeats: each week\'s beat should show PROGRESSION. Avoid "investigation continues" repetition.',
      '- fragmentRegistry: create a clue economy (plant early, complicate middle, reveal late).',
      '- Map type variety: don\'t use "grid" for every week. Mix map types across the booklet.',
      '- Companion variety: use at least 2 different companion types across the booklet.',
      '',
      '## Inputs',
      '### Workout Program',
      truncateText(workout, 3200),
      '',
      '### Creative Direction',
      // Wider budget when a seed is present: the drawn material is ~1KB on its
      // own, and truncating it mid-sentence hands the compiler a half-world.
      armed.divergenceSeed
        ? capText(armed.briefChannel(blend), 3200)
        : truncateText(armed.briefChannel(blend), 2000),
      '',
      '### Design Bias',
      compactJson(summarizeDesignBiasForApi(blend)),
      options.retryMode ? '\nRetry mode: keep all field values concrete and within constraints. Ensure JSON completes cleanly.' : '',
      '',
      // The shell's last pass (D158), hand-routed for the same reason
      // INST_SHELL_CHOICE is: this builder predates STAGE_SCHEMA_MAP and
      // assembles by hand, so the pair moves together. LAST on purpose — it
      // is a check over everything above it, and a checklist read before the
      // rules it checks is just more rules.
      window.INST_SHELL_SELF_CHECK.join('\n'),
      '',
      'Return ONLY the JSON object matching the skeleton schema. No markdown fences, no commentary.'
    ].filter(Boolean).join('\n');
  };

  /**
   * Knowing prompt: the world's process particulars (§11 Wave 1.5).
   *
   * Shared by BOTH API pipelines — Skeleton+Flesh passes the skeleton,
   * multi-stage/structured passes the shell. Both carry the same `meta`
   * surface (worldContract, artifactIntent + its recorded reading), so one
   * builder serves both and the stub bench has one prompt head to route.
   *
   * Input: skeleton-or-shell + the creative brief
   * Output: { processParticulars: { instruments, paperworkRealities,
   *           orderOfOperations, periodSpecifics } }
   */
  window.generateKnowingPrompt = function (source, brief, options) {
    options = options || {};
    var meta = (source || {}).meta || {};
    var intent = meta.artifactIntent || {};
    var reading = intent.reading || {};

    var readingLines = [];
    var READING_LABELS = [
      ['tone', 'Tone'], ['register', 'Register'], ['povFrame', 'POV frame'],
      ['impliedSetting', 'Implied setting'], ['emotionalArc', 'Emotional arc'],
      ['genreTemplate', 'Genre template']
    ];
    for (var r = 0; r < READING_LABELS.length; r++) {
      var val = reading[READING_LABELS[r][0]];
      if (val) readingLines.push('- ' + READING_LABELS[r][1] + ': ' + val);
    }
    if (reading.briefEvidence) {
      readingLines.push('- Evidence from the brief: ' + reading.briefEvidence);
    }

    var parts = [
      '# LiftRPG Knowing Stage — Process Particulars',
      '',
      'You are writing down how this booklet\'s world actually works, before any',
      'of its prose exists. Later stages will write every session prompt, found',
      'document, and ending by selecting from what you author here.',
      '',
      '## Booklet Identity',
      '- Title: ' + (meta.blockTitle || ''),
      '- World Contract (the Core Noun Roster and the governing tension): ' + (meta.worldContract || ''),
      '- Register: ' + JSON.stringify(meta.literaryRegister || {}),
      '- Artifact: ' + JSON.stringify(meta.artifactIdentity || {}),
      ''
    ];

    // D101: the recorded reading is what makes a misread localizable. The
    // knowing is the first stage downstream of it that can contradict it in a
    // way nothing else would catch — a world of the wrong period funds every
    // prose stage wrongly — so the reading is quoted here as binding.
    if (readingLines.length) {
      parts.push(
        '## The Recorded Reading of the Brief (BINDING)',
        'The compiler read the brief and wrote this reading down. Author',
        'particulars that belong to THIS world, not a more interesting one.'
      );
      parts = parts.concat(readingLines, ['']);
    }

    var intentContract = formatArtifactIntentContract(meta);
    if (intentContract) parts.push(intentContract, '');

    parts.push(
      window.buildStageSchema('knowing'),
      '',
      '## Creative Direction (the brief, verbatim)',
      brief ? truncateText(String(brief), 2000) : '(none supplied — derive the particulars from the identity above.)',
      ''
    );
    if (options.retryMode) {
      parts.push('Retry mode: keep every entry to one flat line. Ensure the JSON completes cleanly.', '');
    }
    parts.push('Return ONLY the JSON object. No markdown fences, no commentary.');

    return parts.join('\n');
  };

  /**
   * Canonicalization prompt (§11 Wave 5): pasted Liftoscript → structure.
   *
   * Deliberately the thinnest prompt in the system. It carries the grammar and
   * the program and nothing else — no brief, no identity, no voice, no world.
   * Every one of those would be an invitation to improve the training, and the
   * training is the one input in this product that the model does not get a
   * vote on. The exercise fidelity law downstream (INST_WORKOUT_FUSION) is only
   * as good as what this stage hands it.
   */
  window.generateCanonicalizePrompt = function (workoutText, options) {
    options = options || {};
    var parts = [
      '# LiftRPG Canonicalization Stage',
      'Read the program below into structured JSON. Transcribe only.',
      '',
      window.buildStageSchema('canonicalize'),
      '',
      '## Output shape',
      'Return ONLY a JSON object:',
      '{ "weeks": [ { "weekNumber": 1, "isDeload": false, "sessions": [',
      '  { "dayLabel": "Day 1", "exercises": [',
      '    { "name": "Bench Press", "sets": 3, "repsPerSet": "8", "weightField": "100lb", "notes": "" }',
      '  ] } ] } ], "progressionSummary": "" }',
      '',
      '## The program',
      String(workoutText || ''),
      ''
    ];
    if (options.retryMode) {
      parts.push('Retry mode: keep every value short and flat. Ensure the JSON completes cleanly.', '');
    }
    parts.push('Return ONLY the JSON object. No markdown fences, no commentary.');
    return parts.join('\n');
  };

  /**
   * Flesh prompt: rules spread.
   * Input: skeleton meta + cover + artifactIdentity
   * Output: { rulesSpread: { leftPage, rightPage } }
   *
   * No knowing block: the rules spread is procedural instruction from OUTSIDE
   * the fiction (VOICE.md §1), so it takes the instrument-flat register and
   * has no prose to fund.
   */
  window.generateFleshRulesPrompt = function (skeleton, options) {
    options = options || {};
    var ctx = extractSkeletonContext(skeleton);
    return [
      '# LiftRPG Flesh Stage — Rules Spread',
      '',
      'You are writing the RULES SPREAD for a LiftRPG booklet.',
      'This is two pages: leftPage teaches the game rules in-world, rightPage provides tracking instructions.',
      '',
      formatSkeletonIdentityBlock(ctx, {
        extraLines: ['- Artifact: ' + JSON.stringify(ctx.artifactIdentity)],
        includeKnowing: false
      })
    ].concat(window.FLESH_RULES_SPREAD_SPEC).filter(Boolean).join('\n');
  };

  /**
   * Flesh prompt: single week.
   * Input: skeleton weekPlan entry + workout for that week + prior week summaries
   * Output: complete week object matching renderer schema
   */
  window.generateFleshWeekPrompt = function (skeleton, weekPlan, weekWorkout, priorSummaries, allComponentValues, options) {
    options = options || {};
    var ctx = extractSkeletonContext(skeleton);
    var isBoss = weekPlan.isBossWeek;
    var weekNum = weekPlan.weekNumber;

    var contextLines = [
      '# LiftRPG Flesh Stage — Week ' + weekNum + (isBoss ? ' (BOSS WEEK)' : ''),
      '',
      'You are writing the COMPLETE CONTENT for Week ' + weekNum + ' of a LiftRPG booklet.',
      '',
      formatSkeletonIdentityBlock(ctx, {
        extraLines: ['- Weekly Component Type: ' + ctx.weeklyComponentType]
      }),
      '## This Week\'s Skeleton',
      JSON.stringify(weekPlan, null, 2),
      '',
      '## Week Schema',
      window.buildStageSchema('week-final'),
      ''
    ];

    if (weekWorkout) {
      contextLines.push('## Workout for This Week');
      contextLines.push(truncateText(weekWorkout, 1500));
      contextLines.push('');
    }

    if (priorSummaries && priorSummaries.length > 0) {
      contextLines.push('## Prior Week Summaries (for continuity)');
      contextLines.push(compactJson(priorSummaries));
      contextLines.push('');
    }

    // Structural decisions are GIVEN — the LLM fills content within them
    contextLines.push('## Structural Decisions (already decided — do not change)');
    contextLines.push('- Map type: ' + weekPlan.mapType);
    contextLines.push('- Cipher type: ' + weekPlan.cipherType);
    contextLines.push('- Sessions: ' + weekPlan.sessionCount);
    contextLines.push('- Fragment refs: ' + JSON.stringify(weekPlan.fragmentIds));
    contextLines.push('- **FRAGMENT REF CONTRACT (BINDING):** Any session.fragmentRef or oracle entry.fragmentRef MUST use ONLY IDs from this approved list: ' + JSON.stringify((weekPlan.fragmentIds || []).concat(weekPlan.overflowFragmentId ? [weekPlan.overflowFragmentId] : [])) + '. Do NOT invent new fragment IDs. Do NOT reference fragments not in this list.');
    if (weekPlan.componentValue !== null && weekPlan.componentValue !== undefined) {
      contextLines.push('- Component value: ' + weekPlan.componentValue + ' (fiction-native integer 1-26, NOT a letter and NOT a prose bundle)');
    }
    // OVERFLOW: the requirement itself, not just the id constraint. The 2026-08-11
    // live run proved the old single line ('overflowDocument.id MUST be exactly X')
    // is vacuously satisfiable by omitting the document — the model wrote 4 sessions
    // and stopped, three retries deep. Mirror of the multi-stage builder's
    // 'Planned Overflow Documents (BINDING)' block in generateWeekChunkPrompt.
    var sfSessionCount = Number(weekPlan.sessionCount) || 0;
    if (weekPlan.overflowFragmentId || sfSessionCount > 3) {
      contextLines.push('- **OVERFLOW CONTRACT (BINDING):** this week has ' + (sfSessionCount || 'more than 3') +
        ' sessions, so you MUST set overflow: true AND include a complete overflowDocument. ' +
        'It is REQUIRED — a week with 4+ sessions and no overflowDocument is invalid and will be rejected.');
      contextLines.push('  - overflowDocument is a SELF-CONTAINED found document (id, documentType, title, content, designSpec) — a standalone Part-2 page beside the overflow sessions, NOT a continuation of session content.');
      if (weekPlan.overflowFragmentId) {
        contextLines.push('  - overflowDocument.id MUST be exactly "' + weekPlan.overflowFragmentId + '" — do NOT invent a different ID');
      }
    }
    contextLines.push('- Oracle mode: ' + (weekPlan.oracleMode || 'mixed'));
    if (weekPlan.companionTypes && weekPlan.companionTypes.length > 0) {
      contextLines.push('- Companion types: ' + JSON.stringify(weekPlan.companionTypes));
    }
    contextLines.push('- Epigraph: "' + (weekPlan.epigraphText || '') + '" — ' + (weekPlan.epigraphAttribution || ''));
    contextLines.push('');

    // The arsenal's week GIVEN (D170). '' when this week owes nothing, so a
    // caller with no schedule builds the prompt it always built, byte for byte.
    var sfLudicGiven = (typeof window.formatLudicWeekGivenBlock === 'function')
      ? window.formatLudicWeekGivenBlock(options.ludicWeekGiven)
      : '';
    if (sfLudicGiven) {
      contextLines.push(sfLudicGiven);
      contextLines.push('');
    }

    // The two gate-read identity values (D173) — this pipeline's twin of the
    // multi-stage week seat. The S+F week gate reads `mechanicGrammarFamily` and
    // `shellFamily` exactly as its multi-stage sibling does, and this builder
    // printed neither: the identity block above carries the family INSIDE the
    // intent contract as a planning fact, which is not the same as resolving the
    // door conditional for this week, and carries no citation grammar at all. A
    // given landed on one pipeline and not its twin widens the funding gap the
    // audit recorded — and the DEFAULT pipeline is this one.
    var sfIdentityGiven = (typeof window.formatWeekIdentityGivenBlock === 'function')
      ? window.formatWeekIdentityGivenBlock(options.weekIdentityGiven)
      : '';
    if (sfIdentityGiven) {
      contextLines.push(sfIdentityGiven);
      contextLines.push('');
    }

    if (isBoss) {
      contextLines.push('## Boss Week Requirements');
      contextLines.push('- This week replaces fieldOps with bossEncounter.');
      contextLines.push('- componentInputs must be EXACTLY this array (no additions, no removals, no reordering): ' + JSON.stringify(allComponentValues));
      contextLines.push('- There are exactly ' + allComponentValues.length + ' non-boss weeks, so componentInputs MUST have exactly ' + allComponentValues.length + ' entries.');
      contextLines.push('- Every approved boss-week fragmentRef must appear directly in session.fragmentRef at least once.');
      contextLines.push('- decodingKey.referenceTable maps these values to letters.');
      contextLines.push('- Must include: title, narrative, mechanismDescription, convergenceProof, passwordRevealInstruction.');
      if (weekPlan.isBinaryChoiceWeek || (skeleton.bossPlan && skeleton.bossPlan.binaryChoiceSetup)) {
        contextLines.push('- Include binaryChoiceAcknowledgement: { ifA, ifB }');
      }
      contextLines.push('');
    } else {
      contextLines.push('## Weekly Component Requirements');
      contextLines.push('- weeklyComponent.value must be a single integer 1-26 (or numeric string) for deterministic A1Z26 decode.');
      contextLines.push('- Put explanation in weeklyComponent.extractionInstruction, not inside weeklyComponent.value.');
      contextLines.push('');
    }

    contextLines.push('Return a single JSON week object. No markdown fences, no commentary.');

    return contextLines.filter(Boolean).join('\n');
  };

  /**
   * Flesh prompt: fragment batch.
   * Input: skeleton fragmentRegistry entries for this batch + week context
   * Output: { fragments: [...] }
   */
  window.generateFleshFragmentBatchPrompt = function (skeleton, batchEntries, weekSummaries, priorFragments, batchIndex, totalBatches, options) {
    options = options || {};
    var ctx = extractSkeletonContext(skeleton);

    return [
      '# LiftRPG Flesh Stage — Fragment Batch ' + (batchIndex + 1) + '/' + totalBatches,
      '',
      'You are writing FOUND DOCUMENTS for a LiftRPG booklet.',
      'These are in-world documents discovered during play — memos, reports, field notes, etc.',
      '',
      formatSkeletonIdentityBlock(ctx),
      '## Fragment Schema',
      window.buildStageSchema('fragment'),
      '',
      '## Fragments to Generate',
      'Generate exactly these fragments (IDs, types, authors, and purposes are pre-assigned):',
      JSON.stringify(batchEntries, null, 2),
      '',
      weekSummaries ? '## Week Context\n' + compactJson(weekSummaries) + '\n' : '',
      priorFragments && priorFragments.length > 0
        ? '## Previously Generated Fragments (for tonal consistency)\n' + compactJson(priorFragments.map(function (f) { return { id: f.id, title: f.title, openingLine: truncateText(f.content || f.body || '', 80) }; })) + '\n'
        : '',
      '## Quality Requirements',
      '- Each fragment must feel like a real document that could exist independently.',
      '- Include [██████] redactions where they serve narrative purpose.',
      '- Include {annotations} where a reader would scribble notes.',
      '- hasIrrelevantDetail: at least some fragments should include mundane details that build verisimilitude.',
      '- Match designSpec to the document type and world identity.',
      '',
      'Return { "fragments": [...] } with one complete fragment per registry entry. No markdown fences.'
    ].filter(Boolean).join('\n');
  };

  /**
   * Flesh prompt: ending.
   * Input: skeleton bossPlan + final week summary + variant
   * Output: single ending object
   */
  window.generateFleshEndingPrompt = function (skeleton, variant, finalWeekSummary, weekSummaries, options) {
    options = options || {};
    var ctx = extractSkeletonContext(skeleton);
    var boss = skeleton.bossPlan || {};

    return [
      '# LiftRPG Flesh Stage — Ending ("' + variant + '")',
      '',
      'You are writing a BOOKLET ENDING for a LiftRPG zine.',
      'This is the payoff document the player unlocks after solving the password.',
      '',
      formatSkeletonIdentityBlock(ctx, {
        extraLines: ['- Resolution: ' + (ctx.structuralShape.resolution || '')]
      }),
      '## Boss Context',
      '- Password: ' + (boss.passwordWord || ''),
      '- Convergence: ' + (boss.convergenceRequirements || ''),
      '- Binary choice: ' + (boss.binaryChoiceSetup || 'none'),
      '',
      finalWeekSummary ? '## Final Week Summary\n' + compactJson(finalWeekSummary) + '\n' : '',
      weekSummaries ? '## All Week Summaries\n' + compactJson(weekSummaries) + '\n' : '',
      '',
      // The S+F ending path reached the model with NO voice discipline at all,
      // while multi-stage endings got it through buildStageSchema('ending').
      // Endings are the constitution's own named highest-failure surface and
      // S+F is the default pipeline, so the gap sat on the most-run path over
      // the most fragile prose. Included directly, the same way
      // generateSkeletonPrompt carries it.
      window.INST_VOICE_DISCIPLINE.join('\n'),
      '',
      // Same gap shape, same idiom (Wave 2): the ending STANDARD — pay off
      // three recurring details, acknowledge the choice and the boss outcome,
      // land a final line — also rode buildStageSchema('ending') only. The
      // voice law says how to write; this says what the ending must DO, and
      // the default pipeline was getting neither.
      window.INST_ENDING_STANDARD.join('\n'),
      '',
      // The third instance of the same gap (D150). `endingBody` is BLOCKING at
      // this stage, and this builder stated no length at all — so the default
      // pipeline could be rejected for a cap it was never shown, which is the
      // exact waste outputBudgetParity exists to prevent, one level up. It
      // matters more now that the cap is a demand to FILL the page rather than
      // a warning to stay under it. Gated by endingBuildersCarryBudgets().
      window.INST_OUTPUT_BUDGETS.join('\n'),
      ''
    ].concat(window.buildFleshEndingSpec(variant)).filter(Boolean).join('\n');
  };

  /**
   * Flesh prompt: all endings in one call (bundled).
   * Input: skeleton bossPlan + week summaries + all ending variants
   * Output: { endings: [{ variant, content, designSpec }, ...] }
   */
  window.generateFleshEndingsBundledPrompt = function (skeleton, endingVariants, finalWeekSummary, weekSummaries, options) {
    options = options || {};
    var ctx = extractSkeletonContext(skeleton);
    var boss = skeleton.bossPlan || {};

    var variantList = endingVariants.map(function (v) { return '"' + v + '"'; }).join(', ');

    return [
      '# LiftRPG Flesh Stage — All Endings',
      '',
      'You are writing ALL BOOKLET ENDINGS for a LiftRPG zine.',
      'Each ending is a payoff document the player unlocks after solving the password.',
      'Generate one ending per variant: ' + variantList,
      '',
      formatSkeletonIdentityBlock(ctx, {
        extraLines: ['- Resolution: ' + (ctx.structuralShape.resolution || '')]
      }),
      '## Boss Context',
      '- Password: ' + (boss.passwordWord || ''),
      '- Convergence: ' + (boss.convergenceRequirements || ''),
      '- Binary choice: ' + (boss.binaryChoiceSetup || 'none'),
      '',
      finalWeekSummary ? '## Final Week Summary\n' + compactJson(finalWeekSummary) + '\n' : '',
      weekSummaries ? '## All Week Summaries\n' + compactJson(weekSummaries) + '\n' : '',
      '',
      // Same gap, same fix — see generateFleshEndingPrompt above. The bundled
      // builder is the one the pipeline actually calls by default.
      window.INST_VOICE_DISCIPLINE.join('\n'),
      '',
      window.INST_ENDING_STANDARD.join('\n'),
      '',
      // …and the length demand, which neither ending builder carried (D150).
      // This is the builder the pipeline calls BY DEFAULT, so it is where the
      // raised `endingBody` cap and its "fill the surface" framing have to
      // land or the wave reaches every path except the busiest one.
      window.INST_OUTPUT_BUDGETS.join('\n'),
      ''
    ].concat(window.FLESH_ENDINGS_BUNDLE_SPEC).filter(Boolean).join('\n');
  };

  // ══════════════════════════════════════════════════════════════════════════
  // CLASSIC API PIPELINE PROMPT BUILDERS (existing, preserved as fallback)
  // ══════════════════════════════════════════════════════════════════════════

  window.generateApiStage1Prompt = function (workout, brief, options) {
    options = options || {};
    var blend = deriveDesignBlend(brief, workout);
    var authorProfile = deriveAuthorBlend(brief);
    return [
      '# API Stage 1 — Layer Codex',
      '',
      '## SCHEMA CONTRACT',
      window.buildStageSchema('layer-codex'),
      '',
      '## Output Schema',
      'Return a single JSON object with exactly this structure (fill every field):',
      window.STAGE1_OUTPUT_SCHEMA,
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
      options.retryMode ? 'Retry mode: keep prose concrete and compact so the full JSON finishes cleanly.' : '',
      '',
      'Return ONLY the JSON object matching the schema above. No markdown fences, no commentary.'
    ].filter(Boolean).join('\n');
  };

  window.generateApiStage2Prompt = function (workout, brief, layerBible, options) {
    options = options || {};
    // AUTHORITATIVE WEEK COUNT, not a re-derivation. The pipeline already
    // resolved book length (runApiPipeline → resolveCanonicalBookLength) and
    // passes it; `parseWeekCount` is the fallback for callers that have no
    // pipeline (the length probe, the guided-build harness). They differed:
    // parseWeekCount clamps to 4-12, the pipeline does not, so a 16-week
    // canonical program was planned as 12 weeks and built as 16.
    var weekCount = (options.weekCount > 0) ? options.weekCount : window.parseWeekCount(workout);
    // WHAT THE PLANNER SEES OF THE PROGRAM (W3 length audit). The raw echo
    // below is capped at 2,200 characters, which at 12 weeks stops inside week
    // 5 — and this stage is the one told "use exactly 12 weeks". The digest's
    // per-week rows are the fix: every week's shape, ~330 characters, no
    // truncation. The cap stays; the blindness does not.
    var topology = (typeof window.buildWorkoutTopology === 'function')
      ? window.buildWorkoutTopology(workout) : null;
    var scheduleBlock = (typeof window.formatWeekScheduleBlock === 'function')
      ? window.formatWeekScheduleBlock(topology) : '';
    var shapeBlock = (typeof window.formatWorkoutTopologyBlock === 'function')
      ? window.formatWorkoutTopologyBlock(topology) : '';
    // The board geometry's GIVEN (VISION §11). This stage declares
    // `topology.mainMapType` and every later week reuses it (D144 W-2), so this
    // is the seat that owes the assignment. The doctrine rides
    // buildStageSchema('campaign-plan'); this is the per-run value.
    var assignmentBlock = (typeof window.formatSeedAssignmentBlock === 'function')
      ? window.formatSeedAssignmentBlock(options.seedAssignments, options.identityAxes)
      : '';
    return [
      '# API Stage 2 — Story Plan',
      '',
      '## SCHEMA CONTRACT',
      window.buildStageSchema('campaign-plan'),
      // One entry, not two: the array is `.filter(Boolean)`-ed, so an empty
      // block would take its separator with it and the prompt would be
      // byte-identical for callers with no seed context.
      assignmentBlock ? '\n' + assignmentBlock : '',
      '',
      '## Output Schema',
      'Return a single JSON object with exactly this structure (fill every field, ' + weekCount + ' entries in weeks[]):',
      window.STAGE2_OUTPUT_SCHEMA,
      '',
      '## Stage Rules',
      '- Use exactly ' + weekCount + ' weeks; mark the final week as boss and the midpoint week as the binary choice week.',
      '- Every week must include sessionCount and fragmentIds. fragmentIds are the exact document IDs that week sessions/oracles will reference.',
      '- Every non-boss week must ultimately yield exactly one weekly component value: a single integer 1-26 for standard A1Z26 decode. weeklyComponentMeaning explains that number in-fiction; it must not turn into a composite reading list or prose excerpt.',
      '- Every non-boss week must declare a concrete cipherType, and no two consecutive non-boss weeks may use the same cipherType.',
      // DERIVED, never restated. cipherVarietyFloor is the one home of this
      // number (validation.js, capped by GENERATION_CIPHER_TECHNIQUES) and it
      // reaches this classic-IIFE file on `window`. When it is absent the line
      // states the RULE without a number rather than guessing one — a prompt
      // that demands a floor the gate does not enforce is worse than a prompt
      // that demands variety in words.
      cipherVarietyLine(weekCount),
      '- Fragment IDs MUST use canonical LiftRPG format only: F.01, F.02, F.03 ... Never use placeholders like F-1A or F_01.',
      '- Every fragmentRegistry entry must have a real weekRef and must also appear in that owning week\'s fragmentIds array.',
      // The one-owner law + the legal documentType menu (D153 follow-on):
      // both were demanded at the gate and stated nowhere the stage could
      // read — the first real run failed twice on exactly that. The menu
      // arrives through options from the pipeline's import, never a quoted
      // copy here (this file cannot import contract-constants).
      '- Each fragment ID appears in exactly ONE week\'s fragmentIds — the week that introduces it (its weekRef). A later week, the boss week included, must NOT re-list an earlier week\'s fragment; later weeks reach earlier documents through references, never ownership.',
      '- fragmentRegistry entries must be full objects with id, title, documentType, author, revealPurpose, clueFunction, weekRef.',
      (options && Array.isArray(options.documentTypeMenu) && options.documentTypeMenu.length
        ? '- documentType must be one of: ' + options.documentTypeMenu.join(', ') + '.'
        : '- documentType must be a real found-document kind, used consistently.'),
      '- overflowRegistry entries must use weekNumber and canonical IDs starting at F.30. Do not omit weekNumber.',
      '- Overflow weeks (sessionCount > 3) must set overflowFragmentId and match overflowRegistry for that same week.',
      '- Boss weeks can only consume planned fragmentIds through session.fragmentRef coverage. Do not assign more boss-week fragmentIds than the boss week has sessions.',
      '- Map each mystery question, false assumption, motif payoff, and week transformation into the week plan.',
      '- mapReuse may keep the same topology, but it may never mean "no visible change." Every non-boss week needs a visibly new stateChange or unlock relative to the prior week.',
      // D144 — the board is chosen HERE, by the stage that declares the
      // persistent topology, not three stages later by the one told to preserve
      // it. The geometry table rides this stage now (INST_MAP_GEOMETRY via
      // STAGE_SCHEMA_MAP), so this line points at doctrine the model can see.
      '- topology.mainMapType MUST be one of: grid | point-to-point | linear-track | player-drawn | concentric | maze. Choose it from the mechanic grammar family\'s verb using the "Choosing the geometry" table above — not from the design bias, which only proposes. Every non-boss week reuses this geometry.',
      '- topology.cellShape applies to grid only: "square" (default) or "hex". Use "hex" when the player is crossing ground rather than reading a floor plan. Leave it "" for every other geometry.',
      '- Fragment registry must create clue economy: establish early, complicate mid-block, reveal late; no lore-dump placeholders.',
      '- Use at least 3 documentType values across the full fragmentRegistry once the booklet has 8+ fragments.',
      '- No single documentType may account for more than 45% of the fragmentRegistry once the booklet has 8+ fragments.',
      // D144: this line was an unbranched conjunctive institutional mandate on
      // a stage every brief class reaches — D136's exact defect shape, on the
      // surface D137(b) swept but did not reach. Retyped as a register menu
      // reusing INST_LAYERED_ARC's wording, so a theatre's boss converges on a
      // troupe's procedure rather than a ministry's.
      '- Boss convergence must require outputs from map progression, relationship state, and the procedure of whatever body this world actually runs on — an institution, a house, a guild, a troupe, a market, a congregation, or a crew.',
      '',
      '## Layer Codex Summary',
      compactJson(summarizeLayerBibleForWeeks(layerBible)),
      '',
      '## Inputs',
      // One entry, not two: the array is `.filter(Boolean)`-ed, so a separate
      // blank-line element would be filtered out with the empty blocks.
      [shapeBlock, scheduleBlock].filter(Boolean).join('\n\n'),
      'Workout (abbreviated echo — the schedule above is the authority on length): '
        + truncateText(workout, 2200),
      'Creative direction: ' + truncateText(brief || '', 900),
      options.retryMode ? 'Retry mode: shorten descriptions where needed, but keep clue economy and week transformations intact.' : '',
      '',
      'Return ONLY the JSON object matching the schema above. No markdown fences, no commentary.'
    ].filter(Boolean).join('\n');
  };

  window.generateApiShellPrompt = function (brief, layerBible, campaignPlan, options) {
    options = options || {};
    var blendContext = buildBlendContextFromPlans(layerBible, campaignPlan);
    var blend = deriveDesignBlend(brief, blendContext);
    var weekCount = (campaignPlan.weeks || []).length || 6;
    // Same armed context as the other two compiler stages (see
    // generateShellPrompt). The '# API Stage 3' opener is load-bearing for the
    // eval bench's stub router — added context goes BELOW it, never above.
    var armed = armCompilerContext(options.workout || blendContext, brief, options);
    // THE DOOR GIVENS, on the seat the multi-stage pipeline actually runs
    // (`builders.shell` resolves to THIS builder). Same array the gate reads,
    // same formatter, and one entry rather than two so the `.filter(Boolean)`
    // below takes the separator with it when there is no week picture.
    var doorGivens = (typeof window.formatPlannedDoorGivensBlock === 'function')
      ? window.formatPlannedDoorGivensBlock(options.plannedWeekShapes)
      : '';
    return [
      '# API Stage 3 — Booklet Setup',
      '',
      '## SCHEMA CONTRACT',
      window.buildStageSchema('shell'),
      doorGivens ? '\n' + doorGivens : '',
      '',
      '## Stage Rules',
      '- worldContract is the booklet north star. It must read like a testable governing tension, not a summary.',
      '- narrativeVoice, literaryRegister, structuralShape, and artifactIdentity are downstream contracts; make them strong enough that later stages can follow them exactly.',
      '- Cover, rules spread, and theme must all feel like one coherent shell family, not adjacent UI labels.',
      '- rulesSpread.leftPage MUST include title, reEntryRule, and a sections array of objects. Never return bare strings or unlabeled prose blocks in sections.',
      '- Every rulesSpread.leftPage.sections entry MUST be exactly { heading, body } with both fields present and non-empty.',
      '- rulesSpread.rightPage MUST include title and instruction; do not rename them to heading/body/text.',
      '- passwordEncryptedEnding stays blank; trusted tooling seals it later.',
      '- meta.weekCount MUST exactly equal ' + weekCount + '.',
      '- meta.passwordLength MUST exactly equal ' + Math.max(0, weekCount - 1) + '.',
      (options.totalSessions ? '- meta.totalSessions MUST exactly equal ' + options.totalSessions + '.' : ''),
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
      armed.divergenceSeed
        ? capText(armed.briefChannel(blend), 2800)
        : truncateText(armed.briefChannel(blend), 1200),
      '',
      armed.contextBlock,
      '',
      '## Design Bias',
      compactJson(summarizeDesignBiasForApi(blend)),
      options.retryMode ? 'Retry mode: keep shells concise, specific, renderer-safe, and distinctive in diction before adding more labels. Preserve valid shell identity, but rewrite any malformed rules sections into explicit { heading, body } objects.' : '',
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
      // The currency, on its own line as well as inside the contract JSON
      // (D144). The demand is VERBATIM reproduction, and a string a model has
      // to dig out of a serialized object is a string it paraphrases — which is
      // the 'modifier' verdict F04 splits out. Emitted only when a label
      // exists, so a pre-D144 shell produces a byte-identical prompt.
      formatCurrencyGiven((shellContext || {}).economy) || null,
      '',
      // The intent contract (D173). Same rule as the currency line above, and
      // held to it for the same reason: this builder is wired as
      // `builders.weeks`, it authors weeks, and summarizeShellContractForApi
      // carries no artifactIntent — a decision buried in a serialized blob is a
      // decision the model paraphrases, so the contract prints as a block.
      formatArtifactIntentContract(shellContext),
      '',
      formatProcessParticulars((shellContext || {}).processParticulars),
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
      // The intent contract (D173) — the document ecology's dominant AND
      // forbidden types live here and nowhere else this stage can see.
      formatArtifactIntentContract(shellContext),
      '',
      formatProcessParticulars((shellContext || {}).processParticulars),
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
      // THE INTENT CONTRACT, ON THE MULTI-STAGE PIPELINE'S DEFAULT FRAGMENT SEAT
      // (D173). The audit named `generateSingleFragmentPrompt` as the live seat;
      // measured against the dispatch, that builder is the ADAPTIVE RECOVERY
      // path — `generateSingleFragmentAdaptive` runs one entry at a time only
      // after a batch fails. `builders.fragmentBatch` is what every fragment on
      // a clean run is written by. Funding the recovery seat and not this one
      // would have reproduced the exact defect this wave exists to fix, on the
      // busiest fragment surface in the pipeline.
      formatArtifactIntentContract(shellContext),
      '',
      formatProcessParticulars((shellContext || {}).processParticulars),
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
      // The intent contract (D173) — the arc family and the convergence pattern
      // this ending has to land. Wired as `builders.endings`.
      formatArtifactIntentContract(shellContext),
      '',
      formatProcessParticulars((shellContext || {}).processParticulars),
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

  window.generateSingleWeekFinalPrompt = function (workout, brief, layerBible, campaignPlan, weekPlan, shellContext, continuity, allComponentValues, retryState, options) {
    options = options || {};
    var isBossWeek = campaignPlan && campaignPlan.weeks && weekPlan.weekNumber === campaignPlan.weeks.length;
    var weekWorkout = window.extractWeekWorkout(workout, [weekPlan.weekNumber]);
    var overflowRegistry = (campaignPlan && campaignPlan.overflowRegistry) || [];
    var plannedOverflow = overflowRegistry.filter(function (entry) {
      return Number(entry.weekNumber) === Number(weekPlan.weekNumber);
    })[0] || null;
    var plannedWeekFragmentIds = Array.isArray(weekPlan && weekPlan.fragmentIds) && weekPlan.fragmentIds.length
      ? weekPlan.fragmentIds
      : ((campaignPlan && campaignPlan.fragmentRegistry) || []).filter(function (entry) {
          return Number(entry && entry.weekRef) === Number(weekPlan && weekPlan.weekNumber);
        }).map(function (entry) {
          return entry.id;
        });
    var approvedFragmentRefs = []
      .concat(plannedWeekFragmentIds)
      .concat(plannedOverflow && plannedOverflow.id ? [plannedOverflow.id] : []);
    var retryError = retryState && retryState.error && retryState.error.message
      ? String(retryState.error.message)
      : '';
    var retryErrorLower = retryError.toLowerCase();
    var planAnchors = [];
    if (weekPlan.arcBeat) planAnchors.push('- Planned arcBeat: ' + weekPlan.arcBeat + '.');
    if (weekPlan.npcBeat) planAnchors.push('- Planned npcBeat: ' + weekPlan.npcBeat + '.');
    if (weekPlan.zoneFocus) planAnchors.push('- Planned zoneFocus: ' + weekPlan.zoneFocus + '.');
    if (weekPlan.playerGains) planAnchors.push('- Planned playerGains: ' + weekPlan.playerGains + '.');
    if (weekPlan.mapReuse) planAnchors.push('- Planned mapReuse: "' + weekPlan.mapReuse + '". Preserve this map progression mode unless the plan explicitly changes it.');
    if (weekPlan.stateSnapshot) planAnchors.push('- Planned stateSnapshot: ' + weekPlan.stateSnapshot + '.');
    if (weekPlan.stateChange) planAnchors.push('- Planned stateChange: ' + weekPlan.stateChange + '. Reflect this visibly in fieldOps.mapState.');
    if (weekPlan.newGateOrUnlock) planAnchors.push('- Planned newGateOrUnlock: ' + weekPlan.newGateOrUnlock + '.');
    if (weekPlan.oraclePressure) planAnchors.push('- Planned oraclePressure: ' + weekPlan.oraclePressure + '.');
    if (weekPlan.fragmentFunction) planAnchors.push('- Planned fragmentFunction: ' + weekPlan.fragmentFunction + '.');
    if (weekPlan.governingProcedure) planAnchors.push('- Planned governingProcedure: ' + weekPlan.governingProcedure + '.');
    if (weekPlan.companionChange) planAnchors.push('- Planned companionChange: ' + weekPlan.companionChange + '.');
    if (weekPlan.weeklyComponentMeaning) planAnchors.push('- Planned weeklyComponentMeaning: ' + weekPlan.weeklyComponentMeaning + '.');
    var retryScaffolds = [];
    if (retryErrorLower) {
      if (/overflowdocument/.test(retryErrorLower) && plannedOverflow) {
        retryScaffolds.push('- If the blocking error is overflowDocument-related, copy the planned overflow scaffold exactly for id/documentType before revising prose.');
      }
      if (/characterderivationproof|noticeabilitydesign|extractioninstruction|fieldops\.cipher|cipher\./.test(retryErrorLower) && !isBossWeek) {
        retryScaffolds.push('- If the blocking error is cipher-field-related, keep the puzzle body but ensure fieldOps.cipher includes exactly: type, title, body, extractionInstruction, characterDerivationProof, noticeabilityDesign.');
      }
      if (/weeklycomponent|a1z26|not an integer|out of a1z26 range/.test(retryErrorLower) && !isBossWeek) {
        retryScaffolds.push('- If the blocking error is weekly-component-related, set weeklyComponent.value to exactly one bare integer from 1 to 26 and explain that number in weeklyComponent.extractionInstruction instead of embedding prose inside value.');
      }
      if (/fragmentref|approved for this week|planned fragment/.test(retryErrorLower) && approvedFragmentRefs.length) {
        retryScaffolds.push('- If the blocking error is fragment-ref-related, only use these approved refs: ' + JSON.stringify(approvedFragmentRefs) + '.');
      }
      if (/oracle/.test(retryErrorLower) && !isBossWeek) {
        retryScaffolds.push('- If the blocking error is oracle-related, return exactly 10 oracle entries with roll bands "00-09" through "90-99" and concrete paperAction text.');
      }
      if (/mapstate|currentposition|no visible evolution|map /.test(retryErrorLower) && !isBossWeek) {
        retryScaffolds.push('- If the blocking error is map-related, make fieldOps.mapState visibly reflect the planned stateChange/newGateOrUnlock and include a concrete currentPosition.');
      }
      if (/referencetable|a1z26|password not derived deterministically|decodingkey/.test(retryErrorLower) && isBossWeek) {
        retryScaffolds.push('- If the blocking error is boss-decode-related, set bossEncounter.decodingKey.referenceTable to a plain A1Z26 string such as "1=A 2=B 3=C ... 26=Z". Do not use objects or custom codebooks.');
      }
    }
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
      // THE CURRENCY GIVEN, on the seat the multi-stage pipeline actually runs.
      // `builders.singleWeekFinal` resolves to THIS builder, and this is the
      // stage that authors week.reckoning.conversion — so a verbatim demand
      // that lands anywhere else is a demand the writing model never reads.
      // D144 put the given on generateApiWeekChunkPrompt (which no live path
      // calls) and on the S+F identity block, and missed this one; the first
      // completed book renamed the currency in 6 of 6 weeks as a result.
      formatCurrencyGiven(shellContext.economy) || '',
      '',
      // THE ARTIFACT INTENT CONTRACT, on the seat that writes 168,000 input
      // tokens of weeks (D173). Same defect class as the currency given two
      // lines up and ten times the scope: the compiler committed to an arc
      // family, a mechanic grammar, a home pull, a convergence pattern, a
      // document ecology with FORBIDDEN types, two exclusion lists and its own
      // recorded reading of the brief — and `builders.singleWeekFinal`, the
      // builder the multi-stage pipeline actually runs for every week, printed
      // none of it. extractShellContext has carried `artifactIntent` "for
      // exactly this reason" since Wave 2; only the wizard-only builders and the
      // S+F twins ever printed it. Measured: the first completed book read as
      // one-note (D171) while every planning decision that would have made it
      // otherwise sat unread in the checkpoint. Same formatter as the S+F seat,
      // same position in the order (identity, currency, intent, knowing), and
      // '' when no compiler ran — so a pre-contract shell is byte-identical.
      formatArtifactIntentContract(shellContext),
      '',
      formatProcessParticulars(shellContext.processParticulars),
      '',
      '**Week Workout:** ' + weekWorkout,
      '',
      planAnchors.length ? '## Planned Week Anchors\n' + planAnchors.join('\n') : '',
      '',
      // The arsenal's week GIVEN (D170) — the same row the week gate reads as
      // `owesLudicEntry`. '' when this week owes nothing.
      (typeof window.formatLudicWeekGivenBlock === 'function')
        ? window.formatLudicWeekGivenBlock(options.ludicWeekGiven)
        : '',
      '',
      // The two GATE-READ identity values (D173), resolved for this week. Both
      // floors — F4's door and the citation-pinpoint promotion — read planning
      // values this prompt printed zero times, so the model was asked to read a
      // conditional and supply its own antecedent, and to pick one of eight
      // citation grammars with the key withheld. `options.weekIdentityGiven` is
      // the week gate's own options object read back by deriveWeekIdentityGiven;
      // '' when the pipeline holds neither value.
      (typeof window.formatWeekIdentityGivenBlock === 'function')
        ? window.formatWeekIdentityGivenBlock(options.weekIdentityGiven)
        : '',
      '',
      continuity ? '**Continuity Rules:** ' + JSON.stringify(continuity) : '',
      isBossWeek && allComponentValues ? '**Prior Values for Boss Decode (EXACTLY ' + allComponentValues.length + ' values — do not add, remove, or reorder):** ' + JSON.stringify(allComponentValues) + '\nSet bossEncounter.componentInputs to EXACTLY this array. There are ' + allComponentValues.length + ' non-boss weeks, so there must be EXACTLY ' + allComponentValues.length + ' componentInputs.' : '',
      '',
      '## Structural Obligations',
      !isBossWeek ? '- Non-boss weeks MUST include fieldOps.oracleTable, fieldOps.cipher, and fieldOps.mapState.' : '- Boss week MUST include bossEncounter and MUST omit fieldOps.',
      !isBossWeek ? '- fieldOps.cipher.characterDerivationProof is REQUIRED and cannot be blank.' : '- bossEncounter.componentInputs must exactly match the prior component values list.',
      !isBossWeek ? '- fieldOps.cipher MUST include type, title, body, extractionInstruction, characterDerivationProof, and noticeabilityDesign.' : '',
      !isBossWeek ? '- weeklyComponent.value MUST be exactly one integer from 1 to 26 (or a numeric string such as "8"). Never put prose, composite readings, timelines, or ledger excerpts in weeklyComponent.value.' : '',
      !isBossWeek ? '- weeklyComponent.extractionInstruction must explain how that single integer is extracted from the week\'s fiction-native evidence.' : '',
      isBossWeek ? '- bossEncounter.decodingKey.referenceTable MUST be a plain string containing the full standard A1Z26 table (1=A through 26=Z). Do not use object maps, calibration ranges, custom lookup systems, or thematic substitution tables.' : '',
      isBossWeek ? '- bossEncounter.decodingKey.instruction may explain how to use the weekly component values, but the actual referenceTable must stay standard A1Z26 so the ending remains deterministic.' : '',
      isBossWeek && Number(weekPlan.sessionCount) > 3
        ? '- This is a boss week with overflow. bossEncounter and overflowDocument MUST both be present. Do not omit overflowDocument just because this is the boss week.'
        : '',
      Number(weekPlan.sessionCount) > 3
        ? '- This week has ' + weekPlan.sessionCount + ' sessions. Therefore overflow MUST be true and overflowDocument MUST be present.'
        : '- This week has ' + weekPlan.sessionCount + ' sessions. Therefore overflow must be false and overflowDocument must be omitted.',
      plannedOverflow
        ? '- Planned overflow document (BINDING): overflowDocument.id MUST be exactly "' + plannedOverflow.id + '" and overflowDocument.documentType MUST be exactly "' + plannedOverflow.documentType + '".'
        : '',
      plannedOverflow && plannedOverflow.author
        ? '- Planned overflow document author: ' + plannedOverflow.author + '.'
        : '',
      plannedOverflow && plannedOverflow.narrativeFunction
        ? '- Planned overflow document function: ' + plannedOverflow.narrativeFunction + '.'
        : '',
      plannedOverflow
        ? '- Minimum overflowDocument keys: id, documentType, title, content or body, and designSpec.'
        : '',
      !isBossWeek && weekPlan && weekPlan.cipherType
        ? '- Planned cipher family for this week is "' + weekPlan.cipherType + '". Keep that family; do not substitute a different cipher type.'
        : '',
      approvedFragmentRefs.length
        ? '- Approved fragmentRef IDs for this week: ' + JSON.stringify(approvedFragmentRefs) + '. Sessions and oracle entries may only reference IDs from this list. Do not invent new fragment IDs.'
        : '- This week has no approved fragmentRef IDs. Do not invent or reference fragment IDs.',
      approvedFragmentRefs.length
        ? '- Every approved fragmentRef ID for this week must be used at least once in a session, oracle entry, or fieldOps.cipher.body.referenceTargets before the week is complete.'
        : '',
      isBossWeek && approvedFragmentRefs.length
        ? '- Boss-week fragment coverage is stricter: every approved fragmentRef ID must appear directly in session.fragmentRef at least once before any repeats.'
        : '',
      plannedOverflow
        ? '- If you are unsure, copy this scaffold and then fill the prose fields instead of omitting overflowDocument: ' + JSON.stringify({
            overflow: true,
            overflowDocument: {
              id: plannedOverflow.id,
              documentType: plannedOverflow.documentType,
              title: 'Short institutional title',
              content: 'In-world document prose that does real narrative work.',
              designSpec: {}
            }
          })
        : '',
      !isBossWeek
        ? '- Minimum cipher scaffold if you are unsure: ' + JSON.stringify({
            fieldOps: {
              cipher: {
                type: 'contextual-question',
                title: 'Cipher title',
                body: { displayText: 'Cipher body text', key: 'Support key' },
                extractionInstruction: 'How the player derives the weekly component.',
                characterDerivationProof: 'Explain exactly why the extracted character/value is correct.',
                noticeabilityDesign: 'Describe how the clue is noticeable but still feels in-world.'
              }
            }
          })
        : '',
      isBossWeek
        ? '- Minimum boss decoding scaffold if you are unsure: ' + JSON.stringify({
            bossEncounter: {
              decodingKey: {
                instruction: 'Convert each prior component value with the standard A1Z26 table, then read the resulting letters in order.',
                referenceTable: '1=A 2=B 3=C 4=D 5=E 6=F 7=G 8=H 9=I 10=J 11=K 12=L 13=M 14=N 15=O 16=P 17=Q 18=R 19=S 20=T 21=U 22=V 23=W 24=X 25=Y 26=Z'
              }
            }
          })
        : '',
      '',
      retryError ? '## Retry Focus\nThe previous attempt failed with this blocking error: ' + retryError + '\nFix that exact contract violation in this response.' : '',
      retryScaffolds.length ? '## Retry Scaffolds\n' + retryScaffolds.join('\n') : '',
      '',
      // ── Point-of-use doctrine (§11 Wave 4a; re-routed Teeth Round T1a) ────
      // This used to paste window.INST_POINT_OF_USE in HERE, which reached this
      // multi-stage builder and no other. The S+F flesh builders — the DEFAULT
      // pipeline — never saw it, so their weeks were asked for `microLines` by
      // a one-line field shape pointing at doctrine that was not in the prompt.
      // It now rides STAGE_SCHEMA_MAP['week-final'], which both pipelines build
      // from, and buildStageSchema('week-final') above already carries it.
      //
      // Still off the flat INSTRUCTIONS bundle: the single-prompt path is hard
      // against its 108,000-char ceiling (measured 107.6k at Wave 4a; this
      // doctrine is ~8.2k). Compression could not close that — a 4-gram overlap
      // scan across the whole bundle found at most 1.7% cross-section
      // redundancy — so the only remaining lever is deleting live doctrine, an
      // author decision rather than an engineering one.
      '## Constraints',
      '- Preserve Specificity: storyPrompts must contain physical action and named places.',
      '- Oracle paperAction text must be concrete and singular: name the exact clock, map node, gate, companion slot, or document state being changed. Avoid vague bundled edits.',
      '- Do not flatten the style. Execute the exact Literary Register specified.',
      '- JSON only.'
    ];

    return parts.filter(Boolean).join('\n');
  };

  window.generateSingleFragmentPrompt = function (layerBible, registryEntry, weekSummaries, shellContext, pastFragments, retryState) {
    var retryError = retryState && retryState.error && retryState.error.message
      ? String(retryState.error.message)
      : '';
    var parts = [
      '# Write Fragment ' + registryEntry.id,
      '',
      'Generate exactly ONE found document object as valid JSON. Do not over-explain.',
      'Return exactly one fragment object. Do NOT wrap it in { "fragments": [...] }.',
      '',
      '## SCHEMA CONTRACT',
      window.buildStageSchema('fragment'),
      '',
      '## Fragment Registry Assignment',
      JSON.stringify(registryEntry),
      '',
      '## Structural Obligations',
      '- id MUST be exactly "' + (registryEntry.id || '') + '".',
      registryEntry && registryEntry.documentType
        ? '- documentType MUST be exactly "' + registryEntry.documentType + '".'
        : '',
      registryEntry && registryEntry.author
        ? '- inWorldAuthor MUST be exactly "' + registryEntry.author + '".'
        : '',
      '- The root object MUST include id, title, documentType, inWorldAuthor, content or body, and designSpec.',
      '- If you are unsure, copy this scaffold and fill the prose fields instead of omitting required keys: ' + JSON.stringify({
          id: registryEntry.id || 'F.01',
          title: 'Short document title',
          documentType: registryEntry.documentType || 'memo',
          inWorldAuthor: registryEntry.author || 'Records Clerk',
          content: 'In-world document prose with concrete operational detail.',
          designSpec: {}
        }),
      '',
      '## Context',
      '**World Contract:** ' + (shellContext.worldContract || ''),
      '**Artifact Identity:** ' + JSON.stringify(shellContext.artifactIdentity || {}),
      '',
      // The intent contract (D173). This stage authors the document ecology's
      // actual documents, and the contract is the only surface that states the
      // FORBIDDEN types and the dominant ones — a fragment stage without it is
      // choosing a document type from a list it was never shown. The S+F twin
      // (generateFleshFragmentBatchPrompt, through formatSkeletonIdentityBlock)
      // has printed it since Wave 2; this is the live multi-stage seat.
      formatArtifactIntentContract(shellContext),
      '',
      formatProcessParticulars(shellContext.processParticulars),
      '',
      '**Current Timeline (Cross-Reference Support):**',
      JSON.stringify(weekSummaries || []),
      '',
      pastFragments && pastFragments.length ? '**Prior Fragments (Prevent Repetition):** ' + JSON.stringify(pastFragments) : '',
      '',
      retryError ? '## Retry Focus\nThe previous attempt failed with this blocking error: ' + retryError + '\nFix that exact contract violation in this response.' : '',
      '',
      // Wave 4a: `citeRef` and `seal` are authored here, so the citation
      // grammar has to reach this stage — it now does through
      // buildStageSchema('fragment') above (STAGE_SCHEMA_MAP), which the S+F
      // fragment-batch builder shares. See the note in the week stage above.
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
      // The intent contract (D173). The ending is the constitution's own named
      // highest-failure surface, and this seat had no arc family, no convergence
      // pattern and no recorded reading — it was asked to land an arc it was
      // never told the shape of. Both S+F ending builders carry it.
      formatArtifactIntentContract(shellContext),
      '',
      formatProcessParticulars(shellContext.processParticulars),
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

})();
