// ── Canonical booklet schema v1.5.0 (APPLIED) ───────────────────────────────
// Replaces the never-enforced booklet-render.schema.json (AUDIT finding 57).
//
// Authored as a JS module rather than a .json file so every enum is IMPORTED
// from contracts/contract-constants.js — schema/enum drift is impossible by
// construction (the failure mode behind AUDIT findings 5, 73, 74, 75).
//
// Strictness doctrine:
//   - additionalProperties:false at every level where drift hurt us in 1.3
//     (top level, meta, week, session, exercise, boss, fragment, oracle).
//   - The `_x` extension namespace is the ONLY place for non-contract data
//     (pipeline telemetry, migration residue): top level, meta, week,
//     bossEncounter, fragment.
//   - Deliberately open objects: designSpec, authenticityChecks, theme.tokens,
//     literaryRegister, storySpine, interlude.payload —
//     content varies legitimately there. literaryRegister stays open but now
//     TYPES its voiceSpec fields (mechanisms / authorRegisters / licensedMoves)
//     where a shape carries law; see the voiceSpec block below.
//   - cipher.body.workSpace WAS open, and that openness was the bug: `style`
//     was unvalidated free text while the renderer recognised exactly four
//     geometries, so 'ruled' printed plaintext cells and nobody found out.
//     It is now a closed object with an enumerated style.
//
// Consumed by scripts/validate.js (Ajv 2020-12).

import {
  SCHEMA_VERSION,
  VALID_ARC_FAMILIES,
  VALID_MECHANIC_GRAMMAR_FAMILIES,
  VALID_CONVERGENCE_PATTERNS,
  DOCUMENT_TYPE_ENUM,
  VALID_MAP_TYPES,
  VALID_EDGE_SEMANTICS,
  VALID_CELL_SHAPES,
  VALID_COMPONENT_DIALECTS,
  VALID_COMPANION_TYPES,
  VALID_CLOCK_TYPES,
  VALID_PAYLOAD_TYPES,
  VALID_ARCHETYPES,
  VALID_SHELL_FAMILIES,
  VALID_BOARD_STATE_MODES,
  VALID_ATTACHMENT_STRATEGIES,
  ORACLE_ROLL_BANDS,
  SPATIAL_GUARDRAILS,
  PERCENTILE_STAT,
  VALID_WORKSPACE_STYLES,
  VOICE_LICENSABLE_MOVES,
  VOICE_SPEC_LIMITS,
  MARK_STRIP,
  MARK_STRIP_TARGET_KINDS,
  RECKONING_SINK_KINDS
} from './contract-constants.mjs';

var G = SPATIAL_GUARDRAILS;

var nonEmptyString = { type: 'string', minLength: 1 };
var hexColor = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' };
var xt = { type: 'object' }; // _x extension blob

// ── artifactIntent (Layer 3 planning contract, §10 "the Armed Lens") ────────
// The compiled binding contract the skeleton/shell stage produces: how the
// brief was read, which families the booklet committed to, and what it refuses.
//
// Strict but wholly OPTIONAL (required: []). Two different severities meet
// here and both are honoured:
//   - Generation POLICY demands these fields — the structured skeleton schema
//     lists them as required and the stage validators warn on absence (D19:
//     policy heuristics warn, they do not break fixtures).
//   - The ARTIFACT contract does not: no corpus fixture carries artifactIntent
//     at all (it is a pipeline product, not a rendered surface), so requiring
//     anything here would break every fixture to enforce a prompt rule.
//
// `additionalProperties: false` is the point of the block. The failure mode it
// closes is a misnamed sibling — `pov` for `povFrame`, `reason` for
// `selectionReason` — which reads as a complete record, renders identically
// (nothing renders), and silently costs the audit trail the recorded reading
// exists to provide. `_x` is the declared escape hatch for anything genuinely
// off-contract (e.g. the compiler's rejected-candidate one-liners).
var artifactIntentReading = {
  type: 'object',
  required: [],
  additionalProperties: false,
  properties: {
    // Free strings by ruling: the reading is a RECORD of interpretation, not a
    // controlled vocabulary. Enumerating tone or register would re-impose the
    // house flavour the lens exists to escape. The field NAMES are the contract
    // (they mirror the six signals INST_BRIEF_INTERPRETATION extracts); the
    // values are the model's own words.
    tone: { type: 'string' },
    register: { type: 'string' },
    povFrame: { type: 'string' },
    impliedSetting: { type: 'string' },
    emotionalArc: { type: 'string' },
    genreTemplate: { type: 'string' },
    // 1-2 sentences citing the brief phrases that drove the reading. This is
    // what makes a misread localizable: the critic grades the booklet against
    // the recorded reading, and a reading the brief cannot support is a cited
    // finding rather than a vague "tone feels off".
    briefEvidence: { type: 'string' },
    _x: xt
  }
};

var artifactIntent = {
  type: 'object',
  required: [],
  additionalProperties: false,
  properties: {
    briefMode: { type: 'string' },
    fidelityMode: { type: 'string' },
    arcFamily: { enum: VALID_ARC_FAMILIES },
    mechanicGrammarFamily: { enum: VALID_MECHANIC_GRAMMAR_FAMILIES },
    documentEcology: {
      type: 'object',
      additionalProperties: true,
      properties: {
        dominant: { type: 'array', items: { type: 'string' } },
        forbidden: { type: 'array', items: { type: 'string' } }
      }
    },
    exclusions: {
      type: 'object',
      additionalProperties: true,
      properties: {
        mechanicExclusions: { type: 'array', items: { type: 'string' } },
        documentExclusions: { type: 'array', items: { type: 'string' } },
        arcExclusions: { type: 'array', items: { type: 'string' } }
      }
    },
    homePull: { type: 'string' },
    // The endgame's shape (Wave 2). Enum-gated like the two family fields
    // because it is a closed menu, optional like everything else in this block
    // because no corpus fixture carries an artifactIntent at all.
    convergencePattern: { enum: VALID_CONVERGENCE_PATTERNS },
    reading: artifactIntentReading,
    selectionReason: { type: 'string' },
    _x: xt
  }
};

// ── manifestPointer (schema 1.5.0) ──────────────────────────────────────────
// Posted manifests: a diegetic forward reference printed on a fragment or an
// interlude ("X was last logged in Y") that names a REAL later surface. Optional
// everywhere; when present both fields are required.
//   targetRef — a fragment id ("F.07") or a week reference ("W4").
//   postedAs  — the manifest line the renderer prints, in the artifact's voice.
// Resolution (target exists AND is later than its source) is the forward-only
// law, checked in generator/modules/validation.js — JSON Schema cannot express
// a cross-document ordering constraint.
var manifestPointer = {
  type: 'object',
  required: ['targetRef', 'postedAs'],
  additionalProperties: false,
  properties: {
    targetRef: nonEmptyString,
    postedAs: nonEmptyString
  }
};

// ── citeRef (schema 1.5.0, §11 Wave 4a) ─────────────────────────────────────
// The manifest's twin, and deliberately its near-copy: a printed pointer at
// another surface of this same booklet. Where a manifestPointer POSTS a chase
// ("X was last logged in Y" — always forward, always a promise), a citeRef
// CITES an authority ("the tally rule — Sheet 4"), and an authority may sit in
// either direction: the rule a Week-5 micro-line fires under was taught in
// Week 1, and a later fragment may cite the reader's own earlier marginal note.
// Directionality is the only semantic difference, which is why the resolver is
// parameterized on it rather than duplicated.
//
// NAMED `citeRef`, NOT the research doc's `referenceRef`. `referenceTable` and
// `referenceTargets` already mean specific, unrelated things inside the decode
// chain (bossEncounter.decodingKey.referenceTable is the A1Z26 table), and a
// third `reference*` field pointing at surfaces would have collided with that
// vocabulary in every prompt, validator message, and doc that had to say which
// "reference" it meant.
//
//   targetRef — a fragment id ("F.07") or a week reference ("W4"), same
//               vocabulary manifestPointer uses and the same resolver reads.
//   citedAs   — the citation as the artifact prints it. It must carry a
//               PINPOINT (the destination named in the shell's own citation
//               grammar, or one of the booklet's refs) or it is a blind
//               reference — a pointer that makes the reader guess.
// Resolution, no-chain, blind-pointer, and citation-style parity are checked
// in generator/modules/validation.js; JSON Schema can require the fields but
// cannot look across the document to see whether they mean anything.
var citeRef = {
  type: 'object',
  required: ['targetRef', 'citedAs'],
  additionalProperties: false,
  properties: {
    targetRef: nonEmptyString,
    citedAs: nonEmptyString
  }
};

// ── Conditional micro-lines (schema 1.5.0, §11 Wave 4a) ─────────────────────
// The re-entry mechanism, and the cheapest content the book can carry: same
// printed page, new pencil state, new reading. A micro-line costs one line and
// buys a branch, which is why thirty of them out-branch the page count.
//
//   condition — the state test, in the artifact's voice. It must name a
//               CHECKABLE PRINTED STATE (a marked clock, a shaded node, a
//               ticked strip target, a spent token, a circled stat) so the
//               player can answer it by looking at the page. Checkability is
//               generation doctrine and is scanned advisorily, not here: JSON
//               Schema cannot tell "if the Ledger stands at 3" from "if you
//               feel ready".
//   cue       — the payload clause. What to do or read now that it holds.
//   citeRef   — optional. Present only when the payload needs a rule or
//               document that does not fit beside the blank.
//
// NO maxItems, deliberately. The density law is ≤2 per session and at most one
// citeRef among them, but it is a WARN (D19: a reading-budget heuristic, not a
// validity claim), so capping it here would convert an advisory into a parse
// failure and cost a retry for a book that is merely dense.
var microLine = {
  type: 'object',
  required: ['condition', 'cue'],
  additionalProperties: false,
  properties: {
    condition: nonEmptyString,
    cue: nonEmptyString,
    citeRef: citeRef
  }
};

// ── returnBeat (schema 1.5.0, §11 Wave 4a — salvage seed 7) ─────────────────
// The return loop, at one line per session. The Groundwork simulation's four
// deficits (docs/reference/return-loop-design.md §1) are what this closes:
// tomorrow is unnamed, the return moment is mute, progress reads flat, and the
// session ends on logistics instead of the body's win.
//
//   closingLine — tomorrow cut tonight. The write-in prompt that names the
//                 NEXT session before the player closes the book.
//   openingEcho — the world acknowledging the last session, keyed to something
//                 the player actually marked.
//
// `openingEcho` is OPTIONAL while `closingLine` is required, because the
// booklet's first session has no prior session to echo. Requiring both would
// have forced every book to either skip the return beat on session 1 or invent
// a memory of a session that never happened. A missing echo on a LATER session
// is deficit 2 and is warned about on the assembled path.
var returnBeat = {
  type: 'object',
  required: ['closingLine'],
  additionalProperties: false,
  properties: {
    closingLine: nonEmptyString,
    openingEcho: nonEmptyString
  }
};

// ── doorChoice (schema 1.5.0, §11 Wave 4a — salvage seed 3) ─────────────────
// The weekly decision, with the bias POSTED. Two routes, identical work behind
// either — agency lives on the reward side only, so the chance-isolation law is
// untouched and the prescription never moves.
//
// `lean` is what makes it a decision rather than a coin flip: the player is
// told what each door is likely to pay in. It is optional at the schema level
// and demanded by generation policy (WARN), following D19 — a door missing its
// lean is a weaker design, not an unprintable document.
//
// DELIBERATELY NOT session.binaryChoice. That field carries the midpoint fork
// and the boss encounter's binaryChoiceAcknowledgement cross-check, both of
// which assume exactly one exists in the booklet; a second choice channel on
// the same field would have broken an assumption the tests pin.
var doorOption = {
  type: 'object',
  required: ['label'],
  additionalProperties: false,
  properties: {
    label: nonEmptyString,
    lean: { type: 'string' }
  }
};

var doorChoice = {
  type: 'object',
  required: ['optionA', 'optionB'],
  additionalProperties: false,
  properties: {
    label: { type: 'string' },
    optionA: doorOption,
    optionB: doorOption
  }
};

// ── seal (schema 1.5.0, §11 Wave 4a — salvage seed 5) ───────────────────────
// The sealed cache: a document printed late that wants a key found early. No
// crypto — the honour system IS the mechanism, because the pleasure is the flip
// and the deciding, and a locked page the player physically cannot open is a
// worse artifact than one they choose not to open yet.
//
//   keyHint         — what the key looks like, so the player recognises it when
//                     they meet it weeks early.
//   unlockCondition — what must already be true to open this. It names an
//                     EARLIER printed surface; the assembled-path check reads
//                     any refs it carries and requires them to resolve backward.
//
// Page-flipping as travel is a BETWEEN-state pleasure only (point-of-use §5.2):
// a seal is never a demand made during a rest interval.
var seal = {
  type: 'object',
  required: ['keyHint', 'unlockCondition'],
  additionalProperties: false,
  properties: {
    keyHint: nonEmptyString,
    unlockCondition: nonEmptyString
  }
};

// ── voiceSpec (schema 1.5.0, additive) ──────────────────────────────────────
// meta.literaryRegister grew from an unenforced vibe-phrase object into the
// per-book prose contract (docs/voice/VOICE.md). Additive and fully optional:
// the legacy shape { name, behaviorDescription, forbiddenMoves,
// typographicBehavior } stays legal because the object keeps
// additionalProperties:true. Three typed fields carry the law:
//   mechanisms      — 2-4 borrowings stated in SELECTION terms (what the prose
//                     DOES: "reports the reading before the person taking it").
//                     Never a named author, never a vibe adjective.
//   authorRegisters — the MULTI-HAND LAW. One entry per named in-world author:
//                     what they record, what they omit, how they format. This
//                     is where character lives; flourish is not character.
//   licensedMoves   — the declared exception. At most one, drawn from
//                     VOICE_LICENSABLE_MOVES, carrying a countable budget and a
//                     rationale. The universal machine-tells are absent from
//                     that enum, so they cannot be licensed at all.
var voiceAuthorRegister = {
  type: 'object',
  required: ['author', 'records', 'omits', 'format'],
  additionalProperties: false,
  properties: {
    author: nonEmptyString,   // must match an inWorldAuthor used in the booklet
    records: nonEmptyString,  // what this hand puts on paper
    omits: nonEmptyString,    // what this hand leaves out (identity by refusal)
    format: nonEmptyString    // headers, fields, numbering — the document's own conventions
  }
};

var voiceLicensedMove = {
  type: 'object',
  required: ['move', 'budget', 'rationale'],
  additionalProperties: false,
  properties: {
    move: { enum: VOICE_LICENSABLE_MOVES },
    budget: nonEmptyString,    // a countable ceiling AND where it applies
    rationale: nonEmptyString  // why this brief demands it; absent = not a license
  }
};

var literaryRegister = {
  type: 'object',
  additionalProperties: true, // legacy vibe fields remain legal (1.4.0 corpus)
  properties: {
    mechanisms: {
      type: 'array',
      minItems: VOICE_SPEC_LIMITS.minMechanisms,
      maxItems: VOICE_SPEC_LIMITS.maxMechanisms,
      items: nonEmptyString
    },
    authorRegisters: { type: 'array', items: voiceAuthorRegister },
    licensedMoves: {
      type: 'array',
      maxItems: VOICE_SPEC_LIMITS.maxLicensedMoves,
      items: voiceLicensedMove
    }
  }
};

// ── Mark economy (schema 1.5.0, Session 1 / D89) ────────────────────────────
// Three additive optional fields carrying one economy: session.markStrip (the
// Mark surface), week.reckoning (the Resolve surface), meta.economy (the
// declaration). session / week / meta are all additionalProperties:false, so
// without these definitions the feature cannot exist in a valid document.
//
// DELIBERATELY LOOSER THAN THE ASSEMBLED INVARIANT. The strip's real law is
// 3-5 targets; the schema demands only 1. A model that emits two targets must
// produce a SCHEMA-VALID document that assembly can repair (deriveMarkStripEconomy
// tops up to minTargets), rather than a parse-stage rejection that costs a
// retry. The 3-5 demand lives on the assembled-booklet path, where repair has
// already run — generator/modules/validation.js collectMarkStripFindings.
var markStripTarget = {
  type: 'object',
  required: ['label'],
  additionalProperties: false,
  properties: {
    // Assigned by assembly (ms-w{week}-s{session}-{n}); a model may author it,
    // and assembly overwrites. Machine identity only — never printed.
    id: { type: 'string' },
    // The printed tick label. Diegetic per world, capped at
    // MARK_STRIP.maxLabelWords words and digit-free — both checked in
    // assembly (repair) and validation (report), not here: JSON Schema can
    // count characters but not words.
    label: nonEmptyString,
    // MACHINE-ONLY derivation provenance. Never printed, never prompted.
    kind: { enum: MARK_STRIP_TARGET_KINDS }
  }
};

var markStrip = {
  type: 'object',
  required: ['targets'],
  additionalProperties: false,
  properties: {
    targets: {
      type: 'array',
      minItems: 1,
      maxItems: MARK_STRIP.maxTargets,
      items: markStripTarget
    }
  }
};

// The week's Resolve surface. `conversion` is the one-sentence rule the panel
// teaches where it fires (per-spread teachCost — rules live where they fire).
// `sink` names where the marks GO, and its kind is drawn from the vocabulary
// the renderer already prints: a mark converting into a surface the player
// cannot see is an unpaid promise. `threshold` appears on the boss week and is
// DERIVED in assembly (RECKONING_THRESHOLD_RATIO x attainable ticks) — the
// reachability band is asserted on the assembled path.
var reckoning = {
  type: 'object',
  required: ['conversion', 'sink'],
  additionalProperties: false,
  properties: {
    conversion: nonEmptyString,
    sink: {
      type: 'object',
      required: ['kind', 'instruction'],
      additionalProperties: false,
      properties: {
        kind: { enum: RECKONING_SINK_KINDS },
        // Optional pointer at the named surface (a clock name, a companion
        // title, a fragment id, a map node). Resolution is checked on the
        // assembled path — JSON Schema cannot reach across the document.
        ref: { type: 'string' },
        instruction: nonEmptyString
      }
    },
    threshold: { type: 'integer', minimum: 1 }
  }
};

// The economy declaration: machine id / printed label split. currencyId is the
// stable handle later contracts point at (Session 3's `unlocked-by:<currency>`);
// currencyLabel is the diegetic noun the booklet prints. Exactly one markStrip
// currency per booklet — the amended one-currency law reads per-markStrip, so
// this object is the whole income-stream declaration.
var economy = {
  type: 'object',
  required: ['currencyId', 'currencyLabel'],
  additionalProperties: false,
  properties: {
    currencyId: { type: 'string', pattern: '^[a-z][a-z0-9-]{1,31}$' },
    currencyLabel: nonEmptyString
  }
};

// ── Process particulars (schema 1.5.0, §11 Wave 1.5 — "the knowing") ────────
// VOICE.md §7's funding rule, made supply-side. `meta.worldContract` stays what
// it has always been: the prose string carrying the governing tension and the
// Core Noun Roster — WHO and WHAT exists. This sibling object carries HOW that
// world actually works, authored by the knowing stage as structured material
// every prose stage selects FROM rather than inventing per-unit.
//
// Arrays of short strings by ruling. A particular is one true fact about the
// process ("the bell log is countersigned before the relief signs on"), not a
// paragraph — a paragraph is prose, and unfunded prose is the failure this
// exists to prevent. Selection is the point; a wall of text cannot be selected
// from, only paraphrased.
//
// Additive and wholly optional (required: []). Zero shipped fixtures carry it;
// a booklet without it renders byte-identically to before. The renderer never
// reads it — it is generation-side material that reaches the page only as the
// prose it funded.
var processParticulars = {
  type: 'object',
  required: [],
  additionalProperties: false,
  properties: {
    // The instruments and what they are actually called.
    instruments: { type: 'array', items: nonEmptyString },
    // What form gates what access; what gets signed, filed, countersigned, refused.
    paperworkRealities: { type: 'array', items: nonEmptyString },
    // What happens first; what cannot happen until something else does.
    orderOfOperations: { type: 'array', items: nonEmptyString },
    // Period and regional specifics, where the brief implies them.
    periodSpecifics: { type: 'array', items: nonEmptyString },
    _x: xt
  }
};

export var BOOKLET_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://liftrpg.co/contracts/booklet/v' + SCHEMA_VERSION,
  title: 'LiftRPG Booklet v' + SCHEMA_VERSION,
  type: 'object',
  required: ['meta', 'theme', 'weeks', 'fragments', 'cover', 'rulesSpread', 'endings'],
  additionalProperties: false,
  properties: {
    meta: { $ref: '#/$defs/meta' },
    theme: { $ref: '#/$defs/theme' },
    weeks: { type: 'array', minItems: 1, items: { $ref: '#/$defs/week' } },
    fragments: { type: 'array', items: { $ref: '#/$defs/fragment' } },
    cover: { $ref: '#/$defs/cover' },
    rulesSpread: { $ref: '#/$defs/rulesSpread' },
    endings: { type: 'array', items: { $ref: '#/$defs/ending' } },
    _x: xt
  },
  $defs: {
    meta: {
      type: 'object',
      required: ['schemaVersion', 'blockTitle', 'weekCount', 'totalSessions',
        'weeklyComponentType', 'narrativeVoice', 'structuralShape', 'passwordEncryptedEnding'],
      additionalProperties: false,
      properties: {
        schemaVersion: { const: SCHEMA_VERSION },
        generatedAt: { type: 'string' },
        blockTitle: nonEmptyString,
        blockSubtitle: { type: 'string' },
        worldContract: { type: 'string' },
        narrativeVoice: {
          type: 'object',
          required: ['person', 'tense'],
          additionalProperties: true,
          properties: {
            person: { type: 'string' },
            tense: { type: 'string' },
            narratorStance: { type: 'string' },
            voiceRationale: { type: 'string' }
          }
        },
        literaryRegister: literaryRegister,
        structuralShape: { type: 'object', required: ['resolution'], additionalProperties: true },
        storySpine: { type: 'object' },
        artifactIdentity: {
          type: 'object',
          additionalProperties: true,
          properties: {
            shellFamily: { enum: VALID_SHELL_FAMILIES },
            boardStateMode: { enum: VALID_BOARD_STATE_MODES },
            attachmentStrategy: { enum: VALID_ATTACHMENT_STRATEGIES },
            // Whose instrument the countable surfaces are. Additive and
            // optional (absent = 'segments'); declared explicitly even though
            // artifactIdentity allows extra keys, because a declared property
            // is still enum-checked and an unrenderable dialect must fail here
            // rather than print as the default and look intentional.
            componentDialect: { enum: VALID_COMPONENT_DIALECTS }
          }
        },
        artifactIntent: artifactIntent,
        processParticulars: processParticulars,
        economy: economy,
        weeklyComponentType: nonEmptyString,
        weekCount: { type: 'integer', minimum: 1 },
        totalSessions: { type: 'integer', minimum: 1 },
        passwordLength: { type: 'integer', minimum: 1 },
        passwordEncryptedEnding: { type: 'string' },
        demoPassword: { type: 'string' },
        // Contract debt: validator warns when present outside demo fixtures.
        passwordPlaintext: { type: 'string' },
        liftoScript: { type: 'string' },
        spreadModel: { type: 'string' },
        _x: xt
      }
    },

    theme: {
      type: 'object',
      required: ['visualArchetype', 'palette'],
      additionalProperties: false,
      properties: {
        visualArchetype: { enum: VALID_ARCHETYPES },
        palette: {
          type: 'object',
          required: ['ink', 'paper', 'accent', 'muted', 'rule', 'fog'],
          additionalProperties: hexColor,
          properties: {
            ink: hexColor, paper: hexColor, accent: hexColor,
            muted: hexColor, rule: hexColor, fog: hexColor
          }
        },
        tokens: { type: 'object' }
      }
    },

    week: {
      type: 'object',
      required: ['weekNumber', 'title', 'sessions', 'weeklyComponent'],
      additionalProperties: false,
      properties: {
        weekNumber: { type: 'integer', minimum: 1 },
        title: nonEmptyString,
        epigraph: {
          type: 'object',
          required: ['text'],
          additionalProperties: false,
          properties: { text: { type: 'string' }, attribution: { type: 'string' } }
        },
        isBossWeek: { type: 'boolean' },
        isDeload: { type: 'boolean' },
        weeklyComponent: {
          type: 'object',
          required: ['type'],
          additionalProperties: false,
          properties: {
            type: { type: 'string' },
            value: { type: ['string', 'number', 'null'] },
            extractionInstruction: { type: 'string' }
          }
        },
        sessions: { type: 'array', minItems: 1, items: { $ref: '#/$defs/session' } },
        reckoning: reckoning,
        doorChoice: doorChoice,
        fieldOps: { $ref: '#/$defs/fieldOps' },
        bossEncounter: { $ref: '#/$defs/bossEncounter' },
        overflow: { type: 'boolean' },
        overflowDocument: { $ref: '#/$defs/fragment' },
        interlude: { $ref: '#/$defs/interlude' },
        gameplayClocks: { type: 'array', items: { $ref: '#/$defs/gameplayClock' } },
        _x: xt
      },
      allOf: [
        {
          if: { properties: { isBossWeek: { const: true } }, required: ['isBossWeek'] },
          then: { required: ['bossEncounter'] },
          else: { required: ['fieldOps'] }
        },
        {
          if: { properties: { overflow: { const: true } }, required: ['overflow'] },
          then: { required: ['overflowDocument'] }
        }
      ]
    },

    session: {
      type: 'object',
      required: ['sessionNumber', 'label', 'exercises'],
      additionalProperties: false,
      properties: {
        sessionNumber: { type: 'integer', minimum: 1 },
        label: nonEmptyString,
        storyPrompt: { type: 'string' },
        fragmentRef: { type: ['string', 'null'] },
        showNotes: { type: 'boolean' },
        continuationLabel: { type: 'string' },
        exercises: { type: 'array', minItems: 1, items: { $ref: '#/$defs/exercise' } },
        markStrip: markStrip,
        microLines: { type: 'array', items: microLine },
        returnBeat: returnBeat,
        binaryChoice: {
          type: 'object',
          required: ['promptA', 'promptB'],
          additionalProperties: false,
          properties: {
            choiceLabel: { type: 'string' },
            promptA: { type: 'string' },
            promptB: { type: 'string' }
          }
        }
      }
    },

    exercise: {
      type: 'object',
      required: ['name', 'sets', 'repsPerSet'],
      additionalProperties: false,
      properties: {
        name: nonEmptyString,
        sets: { type: ['integer', 'string'] },
        repsPerSet: { type: ['string', 'integer'] },
        weightField: { type: ['string', 'boolean'] },
        notes: { type: 'string' }
      }
    },

    fieldOps: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mapState: { $ref: '#/$defs/mapState' },
        cipher: { $ref: '#/$defs/cipher' },
        oracleTable: { $ref: '#/$defs/oracleTable' },
        companionComponents: { type: 'array', items: { $ref: '#/$defs/companionComponent' } }
      }
    },

    cipher: {
      type: 'object',
      required: ['title', 'body'],
      additionalProperties: false,
      properties: {
        type: { type: 'string' },
        title: { type: 'string' },
        subtitle: { type: 'string' },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            displayText: { type: 'string' },
            key: { type: ['string', 'object', 'array', 'integer'] },
            // The printed writing surface. `style` names a geometry the
            // renderer actually builds — the enum is the whole point of this
            // object being closed. Generated content reaches canonical values
            // via WORKSPACE_STYLE_ALIASES in assembly.js; the renderer applies
            // the same table at render time for hand-loaded JSON.
            // `rows`/`cols` size the boxed-totals grid, the lined stack and
            // the blank block. The `cells` strip WRAPS to the available width,
            // so for that style the pair is only ever a way to spell a total —
            // and `cellCount` spells the same total directly. When present it
            // wins; otherwise rows x cols (defaulting to 1 x 10) stands in.
            // Both the renderer and the estimate read it through
            // resolveWorkspaceCellCount() in contract-constants.mjs.
            workSpace: {
              type: 'object',
              additionalProperties: false,
              properties: {
                style: { enum: VALID_WORKSPACE_STYLES },
                rows: { type: 'integer', minimum: 1 },
                cols: { type: 'integer', minimum: 1 },
                cellCount: { type: 'integer', minimum: 1 }
              }
            },
            referenceTargets: { type: 'array', items: { type: 'string' } }
          }
        },
        extractionInstruction: { type: 'string' },
        noticeabilityDesign: { type: 'string' },
        characterDerivationProof: { type: 'string' }
      }
    },

    oracleTable: {
      type: 'object',
      required: ['title', 'entries'],
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        instruction: { type: 'string' },
        mode: { type: 'string' },
        // Generation policy is d100 with exactly 10 bands (ORACLE_ROLL_BANDS,
        // enforced by the generator validators); the corpus contract admits
        // other dice systems the brief asked for — the demo booklet uses
        // 11-entry 2d6 tables.
        entries: {
          type: 'array',
          minItems: 2,
          maxItems: 12,
          items: {
            type: 'object',
            required: ['roll', 'text'],
            additionalProperties: false,
            properties: {
              roll: { type: ['string', 'integer'] },
              type: { enum: ['fragment', 'consequence'] },
              text: nonEmptyString,
              paperAction: { type: 'string' },
              fragmentRef: { type: 'string' },
              tick: { type: ['string', 'integer'] },
              clockTarget: { type: 'string' }
            }
          }
        }
      }
    },

    mapState: {
      type: 'object',
      additionalProperties: false,
      properties: {
        mapType: { enum: VALID_MAP_TYPES },
        title: { type: 'string' },
        floorLabel: { type: 'string' },
        mapNote: { type: 'string' },
        gridDimensions: {
          type: 'object',
          additionalProperties: false,
          properties: {
            columns: { type: 'integer', minimum: 1, maximum: G.grid.maxColumns },
            rows: { type: 'integer', minimum: 1, maximum: G.grid.maxRows }
          }
        },
        tiles: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              col: { type: 'integer' }, row: { type: 'integer' },
              x: { type: 'integer' }, y: { type: 'integer' },
              type: { type: 'string' }, label: { type: 'string' },
              annotation: { type: 'string' }
            }
          }
        },
        currentPosition: { type: ['object', 'integer', 'string'] },
        nodes: {
          type: 'array',
          maxItems: G.ptp.renderMaxNodes,
          items: {
            type: 'object',
            required: ['id'],
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              // Coord range 1-12 (SPATIAL_GUARDRAILS.ptp) is generation
              // policy; legacy fixtures carry %-scale coords the renderer
              // normalizes, so the corpus contract only requires integers.
              x: { type: 'integer' },
              y: { type: 'integer' },
              state: { type: 'string' },
              annotation: { type: 'string' }
            }
          }
        },
        edges: {
          type: 'array',
          maxItems: G.ptp.renderMaxEdges,
          items: {
            type: 'object',
            required: ['from', 'to'],
            additionalProperties: false,
            properties: {
              from: { type: 'string' }, to: { type: 'string' },
              label: { type: 'string' }, state: { type: 'string' }
            }
          }
        },
        currentNode: { type: 'string' },
        // point-to-point edge reading. Absent = 'traversal' (the historical
        // meaning); 'relational' is the constellation mode. Declared here
        // rather than under a new map type on purpose: the node/edge shape is
        // byte-identical, so the map-evolution fingerprint stays comparable.
        edgeSemantics: { enum: VALID_EDGE_SEMANTICS },
        // grid cell polygon. Absent = 'square'. Reuses tiles + gridDimensions.
        cellShape: { enum: VALID_CELL_SHAPES },
        // ── concentric ──────────────────────────────────────────────────────
        // Ordered OUTERMOST FIRST. rings[0] is the perimeter you hold or lose;
        // the last ring is what the siege is about.
        rings: {
          type: 'array',
          minItems: G.concentric.minRings,
          maxItems: G.concentric.maxRings,
          items: {
            type: 'object',
            required: ['label'],
            additionalProperties: false,
            properties: {
              label: { type: 'string', maxLength: G.concentric.ringLabelMaxChars },
              state: { type: 'string' },
              annotation: { type: 'string' }
            }
          }
        },
        // 1-based index into rings[]. Integer, not a label: the renderer has to
        // match it against a ring, and a label typo would silently mark nothing.
        currentRing: { type: 'integer', minimum: 1, maximum: G.concentric.maxRings },
        // How many write-in breach boxes print under the rings. A pencil
        // affordance, not a count of breaches that happened.
        breachMarks: { type: 'integer', minimum: 0, maximum: G.concentric.maxBreachMarks },
        // ── maze ────────────────────────────────────────────────────────────
        // Corridors between nodes[]. `state` here is PROGRESS (a locked door
        // opens week over week); node `state` is the topology ROLE.
        passages: {
          type: 'array',
          maxItems: G.maze.renderMaxPassages,
          items: {
            type: 'object',
            required: ['from', 'to'],
            additionalProperties: false,
            properties: {
              from: { type: 'string' }, to: { type: 'string' },
              label: { type: 'string' }, state: { type: 'string' }
            }
          }
        },
        positions: {
          type: 'array',
          maxItems: G.linearTrack.maxPositions,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              index: { type: 'integer' }, label: { type: 'string' },
              state: { type: 'string' }, annotation: { type: 'string' }
            }
          }
        },
        direction: { enum: ['horizontal', 'vertical'] },
        dimensions: {
          type: 'object',
          additionalProperties: false,
          properties: { columns: { type: 'integer' }, rows: { type: 'integer' } }
        },
        prompts: { type: 'array', maxItems: G.playerDrawn.maxPrompts, items: { type: 'string' } },
        seedMarkers: {
          type: 'array',
          maxItems: G.playerDrawn.maxSeedMarkers,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              col: { type: 'integer' }, row: { type: 'integer' }, label: { type: 'string' }
            }
          }
        },
        canvasType: { enum: ['dot-grid', 'graph-paper', 'hex-dot', 'blank'] }
      }
    },

    companionComponent: {
      type: 'object',
      required: ['type'],
      additionalProperties: false,
      properties: {
        type: { enum: VALID_COMPANION_TYPES },
        label: { type: 'string' },
        title: { type: 'string' },
        subtitle: { type: 'string' },
        body: { type: 'string' },
        description: { type: 'string' },
        instruction: { type: 'string' },
        footprint: { enum: ['half-page', 'full-page'] },
        reminder: { type: 'string' },
        rows: { type: 'integer' },
        cols: { type: 'integer' },
        slots: { type: ['integer', 'array'] },
        tokens: { type: ['integer', 'array'] },
        usageDie: { type: 'string' },
        usage: { type: 'string' },
        die: { type: ['string', 'null'] },
        currentFace: { type: ['string', 'integer', 'null'] },
        notes: { type: 'string' },
        windows: { type: ['integer', 'array'] },
        playWindow: { type: 'string' },
        tracks: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
            properties: {
              label: { type: 'string' },
              segments: { type: 'integer' },
              startValue: { type: 'integer' }
            }
          }
        },
        conditions: { type: 'array' },
        currentValue: { type: ['integer', 'string'] },
        startValue: { type: ['integer', 'string'] },
        maxValue: { type: ['integer', 'string'] },
        // ── percentile-stat (schema 1.5.0) ──────────────────────────────────
        // The growing-stat d100. Additive and optional on every other
        // companion type; statName + weeklyValues are required when
        // type === 'percentile-stat' (see the conditional below).
        // Monotonicity (display-floor doctrine) is a B-class rule, checked in
        // generator/modules/validation.js — JSON Schema cannot express it.
        statName: nonEmptyString,
        weeklyValues: {
          type: 'array',
          minItems: PERCENTILE_STAT.minWeeklyValues,
          maxItems: PERCENTILE_STAT.maxWeeklyValues,
          items: {
            type: 'integer',
            minimum: PERCENTILE_STAT.minValue,
            maximum: PERCENTILE_STAT.maxValue
          }
        },
        advantageRule: { type: 'string' }
      },
      allOf: [
        {
          if: { properties: { type: { const: 'percentile-stat' } }, required: ['type'] },
          then: { required: ['statName', 'weeklyValues'] }
        }
      ]
    },

    gameplayClock: {
      type: 'object',
      required: ['clockName', 'segments', 'clockType'],
      additionalProperties: false,
      properties: {
        clockName: nonEmptyString,
        segments: { type: 'integer', minimum: 1 },
        clockType: { enum: VALID_CLOCK_TYPES },
        startValue: { type: 'integer' },
        direction: { type: 'string' },
        linkedClockName: { type: 'string' },
        opposedClockName: { type: 'string' },
        thresholds: { type: ['array', 'object'] },
        consequenceOnFull: { type: 'string' }
      }
    },

    interlude: {
      type: 'object',
      required: ['title', 'reason', 'body'],
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        reason: { type: 'string' },
        body: { type: 'string' },
        payloadType: { enum: VALID_PAYLOAD_TYPES },
        payload: { type: ['object', 'string', 'null'] },
        spreadAware: { type: 'boolean' },
        manifestPointer: manifestPointer
      }
    },

    bossEncounter: {
      type: 'object',
      required: ['title', 'narrative'],
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        subtitle: { type: 'string' },
        narrative: { type: 'string' },
        mechanismDescription: { type: 'string' },
        componentInputs: { type: 'array' },
        decodingKey: {
          type: 'object',
          additionalProperties: false,
          properties: {
            instruction: { type: 'string' },
            referenceTable: { type: ['string', 'array'] },
            input: { type: 'string' }
          }
        },
        convergenceProof: { type: 'string' },
        passwordRevealInstruction: { type: 'string' },
        binaryChoiceAcknowledgement: {
          type: 'object',
          additionalProperties: false,
          properties: { ifA: { type: 'string' }, ifB: { type: 'string' } }
        },
        _x: xt
      }
    },

    fragment: {
      type: 'object',
      required: ['id', 'documentType', 'content'],
      additionalProperties: false,
      properties: {
        id: nonEmptyString,
        title: { type: 'string' },
        documentType: { enum: DOCUMENT_TYPE_ENUM },
        date: { type: 'string' },
        inWorldAuthor: { type: 'string' },
        inWorldRecipient: { type: 'string' },
        inWorldPurpose: { type: 'string' },
        content: nonEmptyString,
        // Optional rich-HTML body (sanitized at render); migrated from legacy
        // content:{html} objects.
        contentHtml: { type: 'string' },
        designSpec: { type: ['object', 'string'] },
        authenticityChecks: { type: 'object' },
        continuationLabel: { type: 'string' },
        partIndex: { type: 'integer' },
        partCount: { type: 'integer' },
        manifestPointer: manifestPointer,
        // Co-resident with manifestPointer on purpose: a document may both
        // POST a chase forward and CITE the authority it was filed under.
        citeRef: citeRef,
        seal: seal,
        _x: xt
      }
    },

    cover: {
      type: 'object',
      required: ['title'],
      additionalProperties: false,
      properties: {
        title: nonEmptyString,
        designation: { type: 'string' },
        subtitle: { type: 'string' },
        tagline: { type: 'string' },
        colophonLines: { type: 'array', items: { type: 'string' } },
        svgArt: { type: 'string' },
        coverArt: { type: 'string' },
        coverArtCaption: { type: 'string' },
        artCaption: { type: 'string' }
      }
    },

    rulesSpread: {
      type: 'object',
      required: ['leftPage', 'rightPage'],
      additionalProperties: false,
      properties: {
        leftPage: {
          type: 'object',
          required: ['sections'],
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            reEntryRule: { type: ['string', 'object'] },
            sections: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['heading'],
                additionalProperties: false,
                properties: {
                  heading: { type: 'string' },
                  body: { type: 'string' },
                  text: { type: 'string' }
                }
              }
            }
          }
        },
        rightPage: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            instruction: { type: 'string' },
            unlockUrl: { type: 'string' }
          }
        }
      }
    },

    ending: {
      type: 'object',
      required: ['content'],
      additionalProperties: false,
      properties: {
        variant: { type: 'string' },
        title: { type: 'string' },
        _x: xt,
        content: {
          type: 'object',
          required: ['body'],
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            documentType: { type: 'string' },
            kicker: { type: 'string' },
            body: nonEmptyString,
            finalLine: { type: 'string' }
          }
        },
        designSpec: { type: ['object', 'string'] }
      }
    }
  }
};
