/**
 * api-generator.js
 *
 * Client-side API integration for the LiftRPG prompt generator.
 * Supports Anthropic and any OpenAI-compatible provider (OpenAI, Groq,
 * Ollama, custom endpoints).
 *
 * Exposes: window.LiftRPGAPI = { PROVIDERS, generate(settings, workout, brief) }
 *
 * SECURITY: API keys are session-only — the caller holds them in a password
 * field and never persists them (saveApiPrefs deliberately excludes the key);
 * they are sent as headers directly to the provider and never pass through
 * any LiftRPG server. Pipeline checkpoints persist to localStorage, mirrored
 * to sessionStorage (checkpoint.js), and contain no key material: the run
 * fingerprint hashes only workout + brief + pipeline method, and the stored
 * inputs record provider/model names but never the key or base URL.
 * Anthropic browser-side access requires the dangerous-direct-browser-access
 * header, which Anthropic provides for exactly this use case.
 */
'use strict';

// ── ES6 Module Imports ────────────────────────────────────────────────────────

import {
  DEFAULT_TIMEOUT_MS,
  MAX_OUTPUT_TOKENS,
  PROVIDERS,
  PAGE_ESTIMATE,
  RATE_WINDOW_MS,
  RATE_MAX_CALLS,
  DAILY_CALL_LIMIT,
  DOCUMENT_TYPE_ENUM,
  VALID_ARCHETYPES,
  CRITIC_SCORE_THRESHOLD,
  CRITIC_MAX_ROUNDS,
  CRITIC_MAX_REVISIONS_PER_ROUND,
  CRITIC_DIMENSIONS,
  STRUCTURAL_REOPEN_SCOPES,
  CONDUCTOR_MECHANISMS,
  CONDUCTOR_MAX_FINDINGS,
  STAGE_BUDGETS,
  // D167: how many times one attempt may ask the model to shorten the same
  // named fields before the attempt is spent and the ladder escalates.
  DELTA_REPAIR_MAX_ROUNDS,
  RETRY_TIMEOUT_GROWTH,
  RETRY_TIMEOUT_CEILING_MS,
  THROTTLE_INITIAL_DELAY_MS,
  THROTTLE_BACKOFF_MULTIPLIER,
  THROTTLE_MAX_DELAY_MS,
  THROTTLE_MAX_WAITS,
  // Teeth Round T1a: the dialect enum and the prose caps, both stamped onto the
  // structured schemas below so a compat transport enforces what the stage
  // validators enforce.
  VALID_COMPONENT_DIALECTS,
  // D144: the shell and the board become bounded choices on the transport, the
  // same way the dialect already was. See STRUCTURED_SCHEMA_SHELL below.
  VALID_SHELL_FAMILIES,
  VALID_BOARD_STATE_MODES,
  OUTPUT_BUDGETS,
  // D128 → W4a: pipeline debris lives under `_x`, the only home the schema
  // has ever allowed it. These two are the whole move — a direct
  // `booklet._foo =` is caught by pipelineDebrisHome() in validate.mjs.
  readPipelineDebris,
  writePipelineDebris,
  // The two-source law's draw and its axis table (VISION §11). The
  // orchestrator is the only place allowed to call the draw, once per run, for
  // the same reason it is the only place allowed to draw the seed: a builder
  // that drew its own assignments would hand every retry a different identity
  // (D101). `identityAxesForStage` is what keeps the prompt's slice and the
  // floor's slice the same slice.
  drawSeedAssignments,
  identityAxesForStage,
  // The arsenal's week schedule (D170) — one derivation, two readers per
  // pipeline: the week prompt's GIVEN and the week gate's floor.
  deriveLudicWeekAssignments
} from './modules/constants.js';

import {
  buildCriticDigest,
  buildFusionFrame,
  formatFusionFrameBlock,
  buildSpineFrame,
  formatSpineFrameBlock,
  validateCriticVerdict,
  normalizeCriticVerdict,
  summarizeVerdict,
  selectRevisionTargets,
  getUnit,
  setUnit,
  revisionPreservesIdentity,
  revisionInventsKeys,
  unitFloorErrors,
  unitLabel
} from './modules/critic.js';

import {
  extractJson
} from './modules/repair.js';

import {
  normalizeId,
  truncateText,
  compactJsonString,
  ensureArtifactIdentity,
  buildIdentityContract,
  compareIdentityContract,
  enforceIdentityContract,
  truthBoardStateMode,
  formatIdentityContractLines,
  buildContinuityLedger,
  extractShellContext,
  buildChunkContinuity,
  normalizeCompanionComponents,
  normalizeThemeArchetype,
  autoRepairWeek,
  assembleBooklet,
  assembleStructuredBooklet,
  extractWeekSummaries,
  findBinaryChoiceWeek,
  enforceBookletDerivedFields,
  buildFragmentBatches,
  mergeFragmentBatches,
  buildSkeletonFragmentBatches,
  assembleSkeletonFleshBooklet,
  compareArtifactIntentDrift,
  normalizeDocumentTypes
} from './modules/assembly.js';

import {
  validateWeekChunkContinuity,
  validateFragmentBatchContinuity,
  validateEndingsContinuity,
  validateBookletSchema,
  validateWeekSchema,
  normalizeShellShape,
  validateShellSchema,
  validateAssembledBooklet,
  validateLayerBibleStage,
  normalizeCampaignPlanOwnership,
  validateCampaignPlanStage,
  validateFragmentsStage,
  validateSkeletonStage,
  validateKnowingStage,
  // D173 — the rudder's own gate. The parity floor is imported by the two spine
  // gates inside validation.js and never called from here: a pipeline that
  // called it directly would be a second opinion about a stage's verdict.
  validateGameRulebookStage,
  classifyValidationErrors,
  collectBudgetBreaches,
  collectPercentileStatFindings,
  collectMarkStripFindings,
  collectNounRosterFindings,
  collectVoiceTicFindings,
  collectLicensedMovePlacementFindings,
  scanTerminalVoiceTics,
  // W7. The prompt builders live in generator.js, a classic IIFE that cannot
  // import — so the floor reaches them the way the topology digest already
  // does: registered on `window` as a side effect of loading this module (see
  // the registration below). Two builders used to carry a hand-copied
  // `Math.min(Math.max(weekCount - 2, 3), ...)` each, which is three homes for
  // one number and exactly the drift class D91 named.
  cipherVarietyFloor,
  // D143. The ownership derivation and the door obligation both live in the
  // validator because that is where the floors and their stage labels live —
  // this file routes on the answer, it does not compute it.
  repairOwnerForError,
  // D173. Same rule, applied to a PROMPT: the week gate's own options object,
  // read back as the two identity GIVENS the week prompt was missing. This file
  // hands the derivation the object it already built for the gate and forwards
  // the result — it does not decide what a week owes.
  deriveWeekIdentityGiven,
  // D167. The ONE rendering of a field path. The gates produce coordinates as
  // key arrays; this renders the string the model is shown and must echo. There
  // is deliberately no parser anywhere — arrays travel, the string is wire.
  formatFieldPath
} from './modules/validation.js';

import {
  buildQualityGate,
  generateQualityReport,
  collectMotifCrossRegistrationFindings
} from './modules/quality.js';

// The walker itself, for the critic's soft-finding channel. The gate reaches it
// through validateAssembledBooklet; the critic needs it directly because it
// re-measures each round after accepted revisions.
import { simulateBook, simSoftFindings } from './modules/sim-player.js';

// The third referee (FUSION §4 mechanism 6). Its pure half lives in its own
// module for the same reason the walker's does: it is a distinct reading with
// its own vocabulary, its own abstention rule, and its own projection of the
// booklet — not a helper of the critic's verdict.
import {
  buildConductorScore,
  formatConductorScoreBlock,
  validateConductorReport,
  normalizeConductorReport,
  conductorFailures,
  formatConductorReportBlock,
  conductorSummaryLine
} from './modules/conductor.js';

import {
  getDailyBudget,
  recordApiCall,
  isGeminiProvider,
  createRateLimiter,
  checkDailyBudget
} from './modules/budget.js';

import {
  saveCheckpoint,
  clearCheckpoint,
  countResumedStages,
  getCheckpoint,
  setCheckpointNotice,
  resumeCheckpointForRun,
  describeResume,
  recordCheckpointSpend,
  getCheckpointSpend,
  getCheckpointSpendToDate,
  getShelvedCheckpoint,
  clearShelvedCheckpoint,
  computeRunFingerprint
} from './modules/checkpoint.js';

import {
  shouldRetryStageError,
  shouldSplitFragmentBatch,
  isLikelyTruncationError,
  isTruncationFinishReason,
  isLikelyThrottleError
} from './modules/error-classify.js';

import {
  detectProviderId,
  safeNumber,
  blankUsageTotals,
  addUsageTotals,
  refreshPricing,
  listProviderModels,
  callProvider,
  callProviderStructured,
  transportSupports,
  resolveStructuredPipelineSettings,
  allowsEmptyApiKey
} from './modules/provider.js';

// §10.4: importing this also registers window.buildWorkoutTopology and
// window.formatWorkoutTopologyBlock for generator.js, which is a classic IIFE
// and cannot import — armCompilerContext there reads them off window.
// looksLikeDeloadWeek IS called here (Teeth Round T1a): the week floors exempt
// deload weeks, and DELOAD_MARKER has exactly one home, in that module.
import { looksLikeDeloadWeek } from './modules/workout-topology.js';

// The Liftosaur seam (§11 Wave 5). The pure half is used here; the network half
// self-registers on window for index.html's program-lookup affordance.
import {
  looksLikeLiftoscript,
  normalizeCanonicalWorkout,
  extendCanonicalWorkout
} from './modules/liftosaur.js';


// ── Structured Output JSON Schemas ──────────────────────────────────────────
// JSON Schema objects for Gemini native structured output (responseJsonSchema).
// Derived from STAGE1/STAGE2_OUTPUT_SCHEMA shapes + SCHEMA_SPEC field definitions
// in generator.js. Required fields match what the pipeline and
// validateAssembledBooklet() check. Deeply variable inner structures (fieldOps,
// bossEncounter) typed as generic objects — prompt text provides guidance.

// Archetype enum comes from the contract (via constants.js re-export) — a new
// archetype added to contract-constants must reach structured output too.

var DESIGN_SPEC_SCHEMA = {
  type: 'object',
  properties: {
    paperTone: { type: 'string', enum: ['cold', 'warm', 'aged', 'clinical', 'weathered', 'official', 'faded'] },
    primaryTypeface: { type: 'string', enum: ['mono', 'serif', 'sans', 'mixed', 'handwritten'] },
    headerStyle: { type: 'string', enum: ['form', 'letterhead', 'stamp', 'handwritten', 'typewriter', 'none'] },
    hasRedactions: { type: 'boolean' },
    hasAnnotations: { type: 'boolean' }
  }
};

var AUTHENTICITY_CHECKS_SCHEMA = {
  type: 'object',
  properties: {
    hasIrrelevantDetail: { type: 'boolean' },
    couldExistInDifferentStory: { type: 'boolean' },
    redactionDoesNarrativeWork: { type: 'boolean' }
  }
};

var STRUCTURED_SCHEMA_BIBLE = {
  type: 'object',
  properties: {
    storyLayer: {
      type: 'object',
      properties: {
        premise: { type: 'string' },
        protagonist: {
          type: 'object',
          properties: {
            role: { type: 'string' }, want: { type: 'string' }, need: { type: 'string' },
            flaw: { type: 'string' }, wound: { type: 'string' }, arc: { type: 'string' }
          },
          required: ['role', 'want', 'need', 'flaw', 'wound', 'arc']
        },
        antagonistPressure: { type: 'string' },
        relationshipWeb: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' }, role: { type: 'string' },
              initialStance: { type: 'string' }, secret: { type: 'string' },
              arcFunction: { type: 'string' }
            },
            required: ['name', 'role', 'initialStance', 'secret', 'arcFunction']
          }
        },
        midpointReversal: { type: 'string' },
        darkestMoment: { type: 'string' },
        resolutionMode: { type: 'string' },
        bossTruth: { type: 'string' },
        recurringMotifs: {
          type: 'object',
          properties: {
            object: { type: 'string' }, place: { type: 'string' },
            phrase: { type: 'string' }, sensory: { type: 'string' }
          },
          required: ['object', 'place', 'phrase', 'sensory']
        }
      },
      required: ['premise', 'protagonist', 'antagonistPressure', 'relationshipWeb',
        'midpointReversal', 'darkestMoment', 'resolutionMode', 'bossTruth', 'recurringMotifs']
    },
    gameLayer: {
      type: 'object',
      properties: {
        coreLoop: { type: 'string' },
        persistentTopology: { type: 'string' },
        majorZones: { type: 'array', items: { type: 'string' } },
        gatesAndKeys: { type: 'array', items: { type: 'string' } },
        progressionGates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              week: { type: 'integer' }, playerGains: { type: 'string' },
              unlocks: { type: 'string' }, requires: { type: 'string' }
            },
            required: ['week', 'playerGains', 'unlocks', 'requires']
          }
        },
        persistentPressures: { type: 'array', items: { type: 'string' } },
        companionSurfaces: { type: 'array', items: { type: 'string' } },
        revisitLogic: { type: 'string' },
        boardStateArc: { type: 'string' },
        bossConvergence: { type: 'string' },
        informationLayers: { type: 'string' },
        weeklyComponentType: { type: 'string' }
      },
      required: ['coreLoop', 'persistentTopology', 'majorZones', 'gatesAndKeys',
        'progressionGates', 'persistentPressures', 'companionSurfaces',
        'revisitLogic', 'boardStateArc', 'bossConvergence', 'informationLayers',
        'weeklyComponentType']
    },
    governingLayer: {
      type: 'object',
      properties: {
        institutionName: { type: 'string' },
        departments: { type: 'array', items: { type: 'string' } },
        proceduresThatAffectPlay: { type: 'array', items: { type: 'string' } },
        recordsAndForms: { type: 'array', items: { type: 'string' } },
        documentVoiceRules: { type: 'array', items: { type: 'string' } }
      },
      required: ['institutionName', 'departments', 'proceduresThatAffectPlay',
        'recordsAndForms', 'documentVoiceRules']
    },
    designLedger: {
      type: 'object',
      properties: {
        mysteryQuestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              answerableFrom: { type: 'string' },
              revealTiming: { type: 'string' }
            },
            required: ['question', 'answerableFrom', 'revealTiming']
          }
        },
        falseAssumptions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              assumption: { type: 'string' },
              plantedBy: { type: 'string' },
              correctedBy: { type: 'string' }
            },
            required: ['assumption', 'plantedBy', 'correctedBy']
          }
        },
        motifPayoffs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              motif: { type: 'string' },
              firstAppearance: { type: 'string' },
              transformation: { type: 'string' },
              payoff: { type: 'string' }
            },
            required: ['motif', 'firstAppearance', 'transformation', 'payoff']
          }
        },
        weekTransformations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              week: { type: 'integer' },
              understandingShift: { type: 'string' },
              stateChange: { type: 'string' },
              framingChange: { type: 'string' }
            },
            required: ['week', 'understandingShift', 'stateChange', 'framingChange']
          }
        },
        clueEconomy: {
          type: 'object',
          properties: {
            hardClues: { type: 'array', items: { type: 'string' } },
            softClues: { type: 'array', items: { type: 'string' } },
            misdirections: { type: 'array', items: { type: 'string' } },
            confirmations: { type: 'array', items: { type: 'string' } }
          },
          required: ['hardClues', 'softClues', 'misdirections', 'confirmations']
        },
        finalRevealRecontextualizes: { type: 'string' }
      },
      required: ['mysteryQuestions', 'falseAssumptions', 'motifPayoffs',
        'weekTransformations', 'clueEconomy', 'finalRevealRecontextualizes']
    }
  },
  required: ['storyLayer', 'gameLayer', 'governingLayer', 'designLedger']
};

var STRUCTURED_SCHEMA_CAMPAIGN = {
  type: 'object',
  properties: {
    topology: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        identity: { type: 'string' },
        mainMap: { type: 'string' },
        zones: { type: 'array', items: { type: 'string' } },
        persistentLocks: { type: 'array', items: { type: 'string' } },
        shortcuts: { type: 'array', items: { type: 'string' } },
        pressureCircuits: { type: 'array', items: { type: 'string' } }
      },
      required: ['mainMap', 'zones']
    },
    weeks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          weekNumber: { type: 'integer' },
          arcBeat: { type: 'string' },
          npcBeat: { type: 'string' },
          stateSnapshot: { type: 'string' },
          playerGains: { type: 'string' },
          zoneFocus: { type: 'string' },
          cipherType: { type: 'string' },
          mapReuse: { type: 'string' },
          stateChange: { type: 'string' },
          newGateOrUnlock: { type: 'string' },
          weeklyComponentMeaning: { type: 'string' },
          oraclePressure: { type: 'string' },
          fragmentFunction: { type: 'string' },
          governingProcedure: { type: 'string' },
          companionChange: { type: 'string' },
          isBossWeek: { type: 'boolean' },
          isBinaryChoiceWeek: { type: 'boolean' },
          sessionCount: { type: 'integer' },
          fragmentIds: { type: 'array', items: { type: 'string' } },
          overflowFragmentId: { type: 'string' },
          sessionBeatTypes: { type: 'array', items: { type: 'string' } }
        },
        required: ['weekNumber', 'arcBeat', 'stateSnapshot', 'cipherType', 'mapReuse', 'stateChange', 'newGateOrUnlock', 'isBossWeek', 'isBinaryChoiceWeek', 'sessionCount', 'fragmentIds', 'sessionBeatTypes']
      }
    },
    bossPlan: {
      type: 'object',
      properties: {
        decodeLogic: { type: 'string' },
        whyItFeelsEarned: { type: 'string' },
        requiredPriorKnowledge: { type: 'array', items: { type: 'string' } },
        weeklyComponentType: { type: 'string' }
      },
      required: ['decodeLogic', 'whyItFeelsEarned', 'requiredPriorKnowledge', 'weeklyComponentType']
    },
    fragmentRegistry: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          // Enum-constrained since the first real run (D153 follow-on): the
          // diversity floor counts CANONICAL types only, and a model shown no
          // menu wrote nine invented types that counted as zero. The other
          // fragment schemas below already carry this enum; this one missed it.
          documentType: { type: 'string', enum: DOCUMENT_TYPE_ENUM },
          author: { type: 'string' },
          revealPurpose: { type: 'string' },
          clueFunction: { type: 'string', enum: ['establishes', 'complicates', 'reveals'] },
          weekRef: { type: 'integer' }
        },
        required: ['id', 'title', 'documentType', 'revealPurpose', 'clueFunction', 'weekRef']
      }
    },
    overflowRegistry: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          weekNumber: { type: 'integer' },
          documentType: { type: 'string' },
          author: { type: 'string' },
          narrativeFunction: { type: 'string' },
          tonalIntent: { type: 'string' },
          arcRelationship: { type: 'string' }
        },
        required: ['id', 'weekNumber', 'documentType', 'narrativeFunction']
      }
    }
  },
  required: ['topology', 'weeks', 'bossPlan', 'fragmentRegistry']
};

var STRUCTURED_SCHEMA_SHELL = {
  type: 'object',
  properties: {
    meta: {
      type: 'object',
      properties: {
        schemaVersion: { type: 'string' },
        generatedAt: { type: 'string' },
        blockTitle: { type: 'string' },
        blockSubtitle: { type: 'string' },
        worldContract: { type: 'string' },
        narrativeVoice: {
          type: 'object',
          properties: {
            person: { type: 'string', enum: ['first', 'second', 'third'] },
            tense: { type: 'string', enum: ['past', 'present'] },
            narratorStance: { type: 'string' },
            voiceRationale: { type: 'string' }
          },
          required: ['person', 'tense', 'narratorStance']
        },
        literaryRegister: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            behaviorDescription: { type: 'string' },
            forbiddenMoves: { type: 'array', items: { type: 'string' } },
            typographicBehavior: { type: 'string' }
          },
          required: ['name', 'behaviorDescription', 'forbiddenMoves']
        },
        structuralShape: {
          type: 'object',
          properties: {
            resolution: { type: 'string', enum: ['closed', 'open', 'shifted', 'costly', 'full', 'partial', 'ambiguous'] },
            temporalOrder: { type: 'string', enum: ['chronological', 'in-medias-res', 'rashomon', 'fragmented', 'linear', 'reverse', 'parallel'] },
            narratorReliability: { type: 'string', enum: ['reliable', 'compromised', 'unreliable', 'institutional', 'multiple', 'shifting'] },
            promptFragmentRelationship: { type: 'string', enum: ['fragments-deepen', 'fragments-contradict', 'fragments-parallel', 'fragments-precede'] },
            shapeRationale: { type: 'string' }
          },
          required: ['resolution', 'temporalOrder', 'narratorReliability', 'promptFragmentRelationship']
        },
        artifactIdentity: {
          type: 'object',
          properties: {
            artifactClass: { type: 'string' },
            artifactBlend: {
              anyOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ]
            },
            authorialMode: { type: 'string' },
            // ── The shell and the board, ENUM-CONSTRAINED (D144) ────────────
            // Measured: the real shell prompt named zero of the eight shell
            // families, and this literal accepted any string, so nothing in the
            // whole standard pipeline either offered a menu or refused an
            // off-menu answer. componentDialect below has been the template
            // since the Teeth Round; these two now match it. Imported rather
            // than quoted — unlike prompt_rules.js, this file is a module and
            // both enums are already re-exported through modules/constants.js,
            // so there is no second copy to drift.
            boardStateMode: { type: 'string', enum: VALID_BOARD_STATE_MODES },
            documentEcology: { type: 'string' },
            materialCulture: { type: 'string' },
            openingMode: { type: 'string' },
            rulesDeliveryMode: { type: 'string' },
            revealShape: { type: 'string' },
            unlockLogic: { type: 'string' },
            shellFamily: { type: 'string', enum: VALID_SHELL_FAMILIES },
            attachmentStrategy: { type: 'string' },
            // Teeth Round F2, mirroring STRUCTURED_SCHEMA_SKELETON's
            // artifactIdentity: the multi-stage shell is the other place a book
            // declares its identity, and a floor enforced on one pipeline only
            // is a floor the other pipeline routes around.
            componentDialect: { type: 'string', enum: VALID_COMPONENT_DIALECTS }
          },
          required: ['artifactClass', 'boardStateMode', 'shellFamily', 'attachmentStrategy', 'componentDialect']
        },
        // ── The artifact planning bundle (D136's floor, transport half) ─────
        // Found beside the design-language gap and closed with it. D136 made
        // `meta.artifactIntent` BLOCKING at this gate (artifactIntentFloorErrors
        // in modules/validation.js) and D137(a) landed the same floor at the
        // skeleton gate — where STRUCTURED_SCHEMA_SKELETON has demanded the
        // bundle since Wave 2. This literal never did. So the STANDARD pipeline
        // has been blocking on a field its own transport schema never mentions,
        // while the S+F pipeline asks for it properly: the W5a defect again,
        // and this time only half of it was ever there.
        //
        // MIRRORS THE SKELETON BLOCK, deliberately and structurally.
        // INST_ARTIFACT_COMPILER is routed to BOTH stages and teaches both the
        // same bundle, so both transports demand the same bundle — including
        // `_x.rejectedReadings`, which is the triptych's audit trail and the
        // only machine-comparable record that three readings were actually
        // constructed. A shape that differed between pipelines would make the
        // pipeline the model answers under a fact about what it is asked for.
        //
        // TYPES, NOT MENUS, and here that is forced rather than chosen:
        // VALID_ARC_FAMILIES, VALID_MECHANIC_GRAMMAR_FAMILIES and
        // VALID_CONVERGENCE_PATTERNS are not re-exported through
        // modules/constants.js, so this file cannot import them, and quoting
        // them inline would plant a third copy in the one place no parity pass
        // watches (validate.mjs diffs the contract against prompt_rules.js, not
        // against this file). The menus are stated to the model in the prompt
        // and enforced by the skeleton literal; membership stays where it
        // already lives — the stage advisories and the artifact schema.
        artifactIntent: {
          type: 'object',
          properties: {
            briefMode: { type: 'string' },
            fidelityMode: { type: 'string' },
            arcFamily: { type: 'string' },
            mechanicGrammarFamily: { type: 'string' },
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
            homePull: { type: 'string' },
            convergencePattern: { type: 'string' },
            // `tone` and `briefEvidence` are the two the floor BLOCKS on: the
            // tone is what the critic's register axis grades this book against,
            // and the evidence is what makes the reading auditable at all. The
            // other six are required for the same reason the skeleton requires
            // them — an optional reading is a reading the model skips.
            reading: {
              type: 'object',
              properties: {
                tone: { type: 'string' },
                register: { type: 'string' },
                povFrame: { type: 'string' },
                impliedSetting: { type: 'string' },
                emotionalArc: { type: 'string' },
                genreTemplate: { type: 'string' },
                ludicReading: { type: 'string' },
                briefEvidence: { type: 'string' }
              },
              required: ['tone', 'register', 'povFrame', 'impliedSetting', 'emotionalArc',
                'genreTemplate', 'ludicReading', 'briefEvidence']
            },
            selectionReason: { type: 'string' },
            _x: {
              type: 'object',
              properties: {
                rejectedReadings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      axis: { type: 'string' },
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
          required: ['briefMode', 'fidelityMode', 'arcFamily', 'mechanicGrammarFamily',
            'documentEcology', 'exclusions', 'homePull', 'convergencePattern', 'reading',
            'selectionReason', '_x']
        },
        // ── The authored design language (W6, landed with the floor) ────────
        // W6 shipped `meta.designLanguage` REQUIRED in prose — all nine axes,
        // in SCHEMA_DESIGN_LANGUAGE — and named in NO structured literal. That
        // is the W5a defect verbatim, one wave later: the shell stage is the
        // only stage routed the doctrine, so this is the only transport schema
        // that can carry it, and a model answering under a compat transport was
        // being asked in prose for a field its response schema never mentioned.
        // The floor that now blocks on absence (designLanguageFloorErrors in
        // modules/validation.js) makes that gap expensive rather than merely
        // untidy, so the two land together.
        //
        // TYPES, NOT MENUS, and that is STRUCTURED_PLAY_SPINE's `entry`
        // precedent rather than laziness: the menus are already stated to the
        // model in the prose section and already parity-asserted both ways by
        // designLanguageMenuParity() in validate.mjs. A third copy here would
        // be a third thing to drift, and this file cannot import the W6 enums
        // without a re-export through modules/constants.js. The floor rejects a
        // stray value with a message naming the whole menu, which is the same
        // division of labour the closure floors use for the spine's library.
        designLanguage: {
          type: 'object',
          properties: {
            layoutIntensity: { type: 'number' },
            productionTexture: { type: 'string' },
            toneTexture: { type: 'string' },
            typeVoice: { type: 'string' },
            documentRecipes: { type: 'object' },
            marginSemantics: { type: 'string' },
            inkDiscipline: { type: 'string' },
            sealTreatment: { type: 'string' },
            designEvidence: { type: 'string' }
          },
          // All nine, because the prompt marks all nine REQUIRED and the floor
          // blocks on all nine. A transport schema that asked for fewer would
          // be steering the model toward a shell its own stage gate refuses.
          required: ['layoutIntensity', 'productionTexture', 'toneTexture', 'typeVoice',
            'documentRecipes', 'marginSemantics', 'inkDiscipline', 'sealTreatment', 'designEvidence']
        },
        // ── The economy, on the transport at last (D144) ────────────────────
        // THE DEFECT: `meta.economy` is described in SCHEMA_META, demanded by
        // INST_MARK_SURFACE ("names the currency EXACTLY as
        // `meta.economy.currencyLabel` writes it — the whole phrase, verbatim"),
        // enforced by currencyMentionVerdict at every week gate, synthesized by
        // deriveMarkStripEconomy when absent — and named in NO structured
        // literal. The W5a/D139 shape a third time: prose-demanded,
        // gate-enforced, transport-absent.
        //
        // It is the load-bearing one. F04 failed 17 of 18 weeks across three
        // pipeline books, and the reason is arithmetic rather than prose: a
        // model told to reproduce a phrase verbatim can only do it if it has
        // been SHOWN the phrase. Under a strict structured mode this field
        // could be dropped before the shell ever carried it, and then
        // deriveMarkStripEconomy would invent "Marks" and every week would be
        // graded against a label no author chose.
        economy: {
          type: 'object',
          properties: {
            currencyId: { type: 'string' },
            currencyLabel: { type: 'string' }
          },
          required: ['currencyId', 'currencyLabel']
        },
        weeklyComponentType: { type: 'string' },
        passwordEncryptedEnding: { type: 'string' },
        liftoScript: { type: 'string' }
      },
      required: ['schemaVersion', 'blockTitle', 'worldContract', 'narrativeVoice',
        'literaryRegister', 'structuralShape', 'artifactIdentity', 'artifactIntent',
        'designLanguage', 'economy', 'weeklyComponentType']
      // NOTE: `playSpine` is deliberately absent from this literal and from the
      // required list above. It is injected by withPlaySpine() below, from the
      // one copy prompt_rules.js owns. See that function.
    },
    cover: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        designation: { type: 'string' },
        subtitle: { type: 'string' },
        tagline: { type: 'string' },
        colophonLines: { type: 'array', items: { type: 'string' } }
      },
      required: ['title', 'designation', 'tagline', 'colophonLines']
    },
    rulesSpread: {
      type: 'object',
      properties: {
        leftPage: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            reEntryRule: { type: 'string' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  heading: { type: 'string' },
                  body: { type: 'string' }
                },
                required: ['heading', 'body']
              }
            }
          },
          required: ['title', 'reEntryRule', 'sections']
        },
        rightPage: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            instruction: { type: 'string' }
          },
          required: ['title', 'instruction']
        }
      },
      required: ['leftPage', 'rightPage']
    },
    theme: {
      type: 'object',
      properties: {
        visualArchetype: { type: 'string', enum: VALID_ARCHETYPES },
        palette: {
          type: 'object',
          properties: {
            ink: { type: 'string' }, paper: { type: 'string' },
            accent: { type: 'string' }, muted: { type: 'string' },
            rule: { type: 'string' }, fog: { type: 'string' }
          },
          required: ['ink', 'paper', 'accent', 'muted', 'rule', 'fog']
        },
        tokens: { type: 'object' }
      },
      required: ['visualArchetype', 'palette']
    }
  },
  required: ['meta', 'cover', 'rulesSpread', 'theme']
};

/**
 * withPlaySpine(schema) -> schema with meta.playSpine demanded
 *
 * ONE STRUCTURED SPINE LITERAL, BORROWED (W5a). prompt_rules.js owns it —
 * a stage schema is what a compat transport enforces on the model, which makes
 * it prompt content, and the file that owns prompt content owns this too. This
 * reaches it through the same `window` hop the skeleton stage already uses for
 * `window.STRUCTURED_SCHEMA_SKELETON` twenty lines from here.
 *
 * WHY THIS EXISTS AT ALL: W4a made `meta.playSpine` required in prose and
 * blocking at the closure floors, and put it in NEITHER structured literal. A
 * model answering under a strict structured mode was being asked for a field
 * its schema never mentioned — and in the strictest modes the field would have
 * been dropped in transit, so every attempt would fail on something no model
 * could deliver. Found on contact in W5a and fixed here.
 *
 * FAILS LOUD, never silently: without prompt_rules.js there is no spine literal
 * to inject, and shipping the un-spined schema would put the pipeline right back
 * in the state above — retrying forever against a floor it cannot satisfy. Any
 * page or harness that reaches this line has already loaded prompt_rules for a
 * dozen INST_ sections, so the throw is unreachable in practice and diagnostic
 * when it is not.
 *
 * Copies the two levels it touches; the shared literal is never mutated, so the
 * exported `manual.structuredSchemas.shell` stays the plain object it was.
 */
function withPlaySpine(schema) {
  var spine = (typeof window !== 'undefined') && window.STRUCTURED_SCHEMA_PLAY_SPINE;
  if (!spine) {
    throw new Error('[LiftRPG] window.STRUCTURED_SCHEMA_PLAY_SPINE is missing — prompt_rules.js '
      + 'has not loaded, so the shell stage would demand a spine the transport never asks for.');
  }
  var meta = schema.properties.meta;
  var nextProps = Object.assign({}, meta.properties, { playSpine: spine });
  var nextRequired = meta.required.indexOf('playSpine') === -1
    ? meta.required.concat(['playSpine'])
    : meta.required.slice();
  return Object.assign({}, schema, {
    properties: Object.assign({}, schema.properties, {
      meta: Object.assign({}, meta, { properties: nextProps, required: nextRequired })
    })
  });
}

var STRUCTURED_SCHEMA_FRAGMENTS = {
  type: 'object',
  properties: {
    fragments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          documentType: { type: 'string', enum: DOCUMENT_TYPE_ENUM },
          inWorldAuthor: { type: 'string' },
          inWorldRecipient: { type: 'string' },
          inWorldPurpose: { type: 'string' },
          // Teeth Round F6, amended by D160b. BOTH transports now force this
          // schema — compat via response_format:json_schema, anthropic via a
          // forced tool call carrying it as the tool's input_schema — so every
          // structured stage is schema-forced on every paid path. What neither
          // transport does is ENFORCE `maxLength`: a `strict:false` json_schema
          // does not constrain decoding, and a tool input_schema shows the
          // keyword to the model as documentation (adding `strict:true` or
          // output_config.format would reject the keyword outright rather than
          // enforce it). So the cap still reaches the model as instruction only,
          // and the same number is ALSO enforced by collectBudgetBreaches at the
          // stage validator. Wire schema and validator remain two readings of
          // one OUTPUT_BUDGETS row, not two policies.
          content: { type: 'string', maxLength: OUTPUT_BUDGETS.fragmentBody },
          designSpec: DESIGN_SPEC_SCHEMA,
          authenticityChecks: AUTHENTICITY_CHECKS_SCHEMA
        },
        required: ['id', 'documentType', 'inWorldAuthor', 'inWorldPurpose', 'content']
      }
    }
  },
  required: ['fragments']
};

var STRUCTURED_SCHEMA_ENDINGS = {
  type: 'object',
  properties: {
    endings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          variant: { type: 'string', enum: ['canonical', 'bittersweet', 'dark', 'ambiguous'] },
          content: {
            type: 'object',
            properties: {
              documentType: { type: 'string', enum: DOCUMENT_TYPE_ENUM },
              body: { type: 'string' },
              finalLine: { type: 'string' }
            },
            required: ['body', 'finalLine']
          },
          designSpec: {
            type: 'object',
            properties: {
              paperTone: { type: 'string' },
              primaryTypeface: { type: 'string' }
            },
            required: ['paperTone']
          }
        },
        required: ['variant', 'content', 'designSpec']
      }
    }
  },
  required: ['endings']
};


// ── Pipeline-local helpers (not extracted to modules) ─────────────────────────

function unwrapIfNeeded(result, expectedKey) {
  if (!result || typeof result !== 'object') return result;
  if (Array.isArray(result)) return result; // arrays are not wrapper objects
  if (result[expectedKey]) return result;
  var keys = Object.keys(result);
  if (keys.length === 1) {
    var inner = result[keys[0]];
    if (inner && typeof inner === 'object' && inner[expectedKey]) {
      console.warn('[LiftRPG] Stage output wrapped in "' + keys[0] + '" key — unwrapping to get "' + expectedKey + '"');
      return inner;
    }
  }
  return result;
}

function parseWeekCountFromWorkout(workout) {
  if (typeof window !== 'undefined' && typeof window.parseWeekCount === 'function') {
    return window.parseWeekCount(workout);
  }
  var match = String(workout || '').match(/(\d+)\s*weeks?\b/i);
  var count = match ? parseInt(match[1], 10) : 6;
  return Math.max(4, Math.min(12, count || 6));
}

function summarizeLayerBibleForCampaignRetry(layerBible) {
  var bible = layerBible || {};
  var story = bible.storyLayer || {};
  var protagonist = story.protagonist || {};
  var game = bible.gameLayer || {};
  var governing = bible.governingLayer || {};
  var ledger = bible.designLedger || {};
  return {
    story: {
      premise: truncateText(story.premise, 160),
      protagonist: {
        role: truncateText(protagonist.role, 60),
        want: truncateText(protagonist.want, 70),
        need: truncateText(protagonist.need, 70),
        flaw: truncateText(protagonist.flaw, 70),
        wound: truncateText(protagonist.wound, 70),
        arc: truncateText(protagonist.arc, 90)
      },
      antagonistPressure: truncateText(story.antagonistPressure, 120),
      midpointReversal: truncateText(story.midpointReversal, 120),
      darkestMoment: truncateText(story.darkestMoment, 120),
      bossTruth: truncateText(story.bossTruth, 120)
    },
    cast: (story.relationshipWeb || []).slice(0, 5).map(function (entry) {
      return {
        name: entry.name || '',
        role: truncateText(entry.role, 50),
        secret: truncateText(entry.secret, 70),
        arcFunction: truncateText(entry.arcFunction, 70)
      };
    }),
    game: {
      topology: truncateText(game.persistentTopology, 130),
      zones: (game.majorZones || []).slice(0, 5),
      gatesAndKeys: (game.gatesAndKeys || []).slice(0, 6),
      progressionGates: (game.progressionGates || []).slice(0, 6).map(function (entry) {
        return {
          week: entry.week,
          playerGains: truncateText(entry.playerGains, 70),
          unlocks: truncateText(entry.unlocks, 70),
          requires: truncateText(entry.requires, 70)
        };
      }),
      bossConvergence: truncateText(game.bossConvergence, 120)
    },
    governing: {
      institutionName: truncateText(governing.institutionName, 70),
      departments: (governing.departments || []).slice(0, 4),
      procedures: (governing.proceduresThatAffectPlay || []).slice(0, 4)
    },
    designLedger: {
      mysteryQuestions: (ledger.mysteryQuestions || []).slice(0, 3),
      falseAssumptions: (ledger.falseAssumptions || []).slice(0, 3),
      motifPayoffs: (ledger.motifPayoffs || []).slice(0, 4),
      weekTransformations: (ledger.weekTransformations || []).slice(0, 8),
      finalReveal: truncateText(ledger.finalRevealRecontextualizes, 140)
    }
  };
}

function buildCompactCampaignRetryPrompt(workout, brief, layerBible, retryState, options) {
  // The retry has to demand the SAME length the first attempt did. It used to
  // re-derive it, and parseWeekCount clamps to 4-12 where the pipeline does
  // not — so a 16-week book's retry asked for 12 and the stage could never
  // satisfy the validator it was retrying against.
  var weekCount = (options && options.weekCount > 0)
    ? options.weekCount
    : parseWeekCountFromWorkout(workout);
  var midpoint = Math.ceil(weekCount / 2);
  var lastError = retryState && retryState.error ? truncateText(retryState.error.message || retryState.error, 180) : '';
  var lastErrorLower = lastError.toLowerCase();
  var retryHints = [];
  if (/ciphertype/.test(lastErrorLower)) {
    retryHints.push('- Recheck every non-boss week for a concrete cipherType and ensure consecutive non-boss weeks do not repeat it.');
  }
  if (/statechange|newgateorunlock|mapsnapshot|statesnapshot|no-change|no change|map progression|repeat the prior non-boss week/.test(lastErrorLower)) {
    retryHints.push('- Recheck every non-boss week for real map progression: stateSnapshot, mapReuse, stateChange, and newGateOrUnlock must all be present and may not repeat the prior non-boss week.');
  }
  if (/fragmentregistry|fragmentids|weekref|documenttype/.test(lastErrorLower)) {
    retryHints.push('- Recheck fragment ownership: every fragmentRegistry entry must match its owning week fragmentIds, and the registry must keep at least 3 document types with no dominant type above 45% once it has 8+ entries.');
  }
  if (/weeklycomponent|a1z26|not an integer|out of a1z26 range/.test(lastErrorLower)) {
    retryHints.push('- Recheck weekly component planning: every non-boss week must resolve to exactly one integer 1-26 for standard A1Z26 decode. weeklyComponentMeaning explains the number; it does not contain the value prose itself.');
  }
  if (/overflowregistry|overflowfragmentid/.test(lastErrorLower)) {
    retryHints.push('- Recheck overflow ownership: every week with sessionCount > 3 needs overflowFragmentId plus a matching overflowRegistry entry with weekNumber and canonical F.30+ IDs.');
  }
  return [
    '# API Stage 2 — Story Plan (Compact Retry)',
    '',
    'Return JSON only.',
    'Generate a compact but complete campaign plan that matches this exact top-level shape:',
    '{"topology":{},"weeks":[],"bossPlan":{},"fragmentRegistry":[],"overflowRegistry":[]}',
    '',
    'Compact week template (repeat for each week, filling every field):',
    '{"weekNumber":1,"arcBeat":"","npcBeat":"","stateSnapshot":"","playerGains":"","zoneFocus":"","cipherType":"","mapReuse":"full","stateChange":"","newGateOrUnlock":"","weeklyComponentMeaning":"","oraclePressure":"","fragmentFunction":"","governingProcedure":"","companionChange":"","isBossWeek":false,"isBinaryChoiceWeek":false,"sessionCount":3,"fragmentIds":["F.01"],"overflowFragmentId":"F.30","sessionBeatTypes":[]}',
    '',
    '## Hard Requirements',
    '- Use exactly ' + weekCount + ' weeks.',
    '- Week ' + midpoint + ' must be the binary choice week.',
    '- Week ' + weekCount + ' must be the boss week.',
    '- Every week needs: weekNumber, arcBeat, npcBeat, stateSnapshot, playerGains, zoneFocus, mapReuse, stateChange, newGateOrUnlock, weeklyComponentMeaning, oraclePressure, fragmentFunction, governingProcedure, companionChange, isBossWeek, isBinaryChoiceWeek, sessionCount, fragmentIds, sessionBeatTypes.',
    '- weeklyComponentMeaning must describe one derivable integer 1-26 for each non-boss week. Do not treat it as a composite reading bundle, paragraph, or ledger excerpt.',
    '- Include a concrete cipherType for every non-boss week and do not repeat cipherType in consecutive non-boss weeks.',
    '- mapReuse cannot mean "no change": every non-boss week must declare a visibly new stateChange or unlock relative to the prior week.',
    '- Fragment IDs MUST use canonical LiftRPG format only: F.01, F.02, F.03 ... Never use placeholders like F-1A or F_01.',
    '- Every fragmentRegistry entry must have a real weekRef and must also appear in that week\'s fragmentIds array.',
    '- Each fragment ID appears in exactly ONE week\'s fragmentIds — the week that introduces it (its weekRef). A later week, the boss week included, must NOT re-list an earlier week\'s fragment; later weeks reach earlier documents through references, never ownership.',
    '- fragmentRegistry entries must be full objects with id, title, documentType, author, revealPurpose, clueFunction, weekRef.',
    '- documentType must be one of: ' + DOCUMENT_TYPE_ENUM.join(', ') + '.',
    '- overflowRegistry entries must use weekNumber and canonical IDs starting at F.30. Do not omit weekNumber.',
    '- Overflow weeks (sessionCount > 3) must set overflowFragmentId and match overflowRegistry for that same week.',
    '- Boss weeks can only consume planned fragmentIds through session.fragmentRef coverage. Do not assign more boss-week fragmentIds than boss-week sessions.',
    '- fragmentRegistry must establish clues early, complicate them mid-block, and reveal them late.',
    '- Use at least 3 fragment document types when the registry has 8+ entries, and do not let one documentType exceed 45% of the registry.',
    '- Keep descriptions concise. Preserve clue economy, progression, and convergence logic.',
    retryHints.length ? '## Retry Hints' : '',
    retryHints.length ? retryHints.join('\n') : '',
    lastError ? '- Fix the prior failure: ' + lastError : '',
    '',
    '## Layer Codex Essentials',
    compactJsonString(summarizeLayerBibleForCampaignRetry(layerBible)),
    '',
    '## Inputs',
    'Workout: ' + truncateText(workout, 900),
    'Creative direction: ' + truncateText(brief || '', 420)
  ].filter(Boolean).join('\n');
}

function shouldEchoFailedOutputForRetry(stageName) {
  var label = String(stageName || '');
  if (/^Layer Codex$/i.test(label)) return false;
  if (/^Story Plan$/i.test(label)) return false;
  if (/^Booklet Setup$/i.test(label)) return false;
  if (/^Week\s+\d+/i.test(label)) return false;
  if (/^Fragments batch/i.test(label)) return false;
  if (/^Fragment\s+/i.test(label)) return false;
  return true;
}

function buildSmartRetryDirective(stageName, attempt, err) {
  // Truncation is a capacity failure, not a correctness failure. Re-sending the
  // "fix these validation errors" directive would just re-roll the same
  // oversized output. stageBudget() raises the token ceiling; this tells the
  // model to spend the budget on substance instead of length.
  if (isLikelyTruncationError(err)) {
    return [
      '',
      '## Length Directive (Retry ' + (attempt + 1) + ')',
      '',
      'Your previous output for ' + stageName + ' was cut off before the JSON closed —',
      'it exceeded the output token limit.',
      '',
      '### Instructions',
      '- Return the SAME structure, complete and closed. Completeness beats length.',
      '- Tighten prose: shorter paragraphs, fewer restatements, no preamble or commentary.',
      '- Do NOT drop required fields, sessions, or entries to save space. Shorten their text instead.',
      '- Return valid JSON only. No markdown fences.'
    ].join('\n');
  }

  var errors = err._blockingErrors || [truncateText((err && err.message) || 'unknown', 500)];
  var failedOutput = err._failedOutput || null;
  var echoFailedOutput = failedOutput && shouldEchoFailedOutputForRetry(stageName);

  var lines = [
    '',
    '## Correction Directive (Retry ' + (attempt + 1) + ')',
    '',
    'Your previous output for ' + stageName + ' had ' + errors.length + ' validation error(s).',
    ''
  ];

  if (echoFailedOutput) {
    var compact = compactJsonString(failedOutput);
    if (compact.length > 6000) compact = compact.slice(0, 6000) + '... [truncated]';
    lines.push('### Your Previous Output');
    lines.push('```json');
    lines.push(compact);
    lines.push('```');
    lines.push('');
  }

  lines.push('### Validation Errors (fix ALL of these)');
  errors.forEach(function (e, i) {
    lines.push((i + 1) + '. ' + e);
  });
  lines.push('');
  lines.push('### Instructions');
  lines.push('Return the CORRECTED JSON with these issues fixed.');
  lines.push('- Preserve all working content (names, prose, mechanical values).');
  lines.push('- Do NOT regenerate from scratch. Fix only the listed errors.');
  if (!echoFailedOutput) {
    lines.push('- Keep the retry compact. Only rewrite the exact fields needed to satisfy the failed contract.');
  }
  if (/^Week\s+\d+/i.test(String(stageName || ''))) {
    lines.push('- Preserve valid sessions, exercises, and working prose; only fix broken refs, overflow data, oracle actions, or missing required fields.');
  }
  if (/^Fragments batch/i.test(String(stageName || '')) || /^Fragment\s+/i.test(String(stageName || ''))) {
    lines.push('- Keep every fragment on its assigned id/documentType/author contract and only repair missing or invalid fragment bodies.');
  }
  lines.push('- Return valid JSON only. No markdown fences, no commentary.');

  return lines.join('\n');
}

// ── DELTA REPAIR (D167) ──────────────────────────────────────────────────────
//
// THE FAILURE THIS EXISTS FOR (live, 2026-08-17). Week 3 failed three attempts
// on: "Over budget: Week 3 session 1 storyPrompt is 224 chars (budget 220);
// Week 3 session 2 storyPrompt is 223 chars (budget 220)". A ~30k-token stage
// was re-rolled in full, three times, over seven characters — and every re-roll
// re-rolled every OTHER budgeted string in the week too, each with its own small
// chance of overshooting. A stage carries dozens of capped strings; P(all clean
// on one roll) is well under 1, so a full re-roll is not merely expensive here,
// it is the wrong shape: it re-opens every field that already passed.
//
// THE REMEDY'S SHAPE, and the four laws it is built from:
//
//   1. THE FLOOR DOES NOT MOVE. No tolerance band, no relaxed budget. The same
//      gate, unchanged, re-runs against the merged payload and decides.
//   2. THE MODEL WRITES EVERY CHARACTER (D160). Nothing here shortens, elides
//      or synthesizes text. The failing fields go back to the model with their
//      requirement quoted; the pipeline merges what comes back and nothing else.
//      The reverted "semantic auto-salvage" is the named crime this avoids.
//   3. THE MERGE CANNOT INVENT OR LOSE (D136's revisionInventsKeys idiom). A
//      delta result may change ONLY the paths the gate named. A response
//      carrying an unnamed path is discarded whole and loudly; everything
//      outside the named paths is asserted byte-identical after the merge.
//   4. THE LADDER IS UNCHANGED. Delta rounds are bounded and sit INSIDE one
//      attempt. A full re-roll remains the escalation — for a persistent
//      overage, for a rejected merge, and for every error class that is not
//      path-named. Terminal behaviour is exactly what it was.
//
// CHECKPOINT/RESUME (D98/D101/D143): a delta-repaired stage banks its MERGED
// payload under the same key with the same event shape, so resume and the run
// fingerprint are untouched. The repair-aware seed rules (D143) deliberately do
// NOT apply here: they exist because a re-entered stage must rebuild the world
// it repairs from the same draw, and a delta preserves that world BY
// CONSTRUCTION — every field except the named ones is the same bytes.

// The engine key for the delta call's budget row. Named once; the ladder owns
// the numbers (D97), and no call site below writes a token or timeout literal.
var DELTA_REPAIR_BUDGET_KEY = 'deltaRepair';

function deltaClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readAtPathParts(root, parts) {
  var cur = root;
  for (var i = 0; i < parts.length; i++) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

// Writes ONLY where a container already exists. A delta repair shortens a field
// that is already there; creating a path would be inventing content, which is
// exactly what rule 3 forbids.
function writeAtPathParts(root, parts, value) {
  if (!parts || !parts.length) return false;
  var cur = root;
  for (var i = 0; i < parts.length - 1; i++) {
    if (cur === null || typeof cur !== 'object') return false;
    cur = cur[parts[i]];
  }
  var last = parts[parts.length - 1];
  if (cur === null || typeof cur !== 'object') return false;
  if (!Object.prototype.hasOwnProperty.call(cur, last)) return false;
  cur[last] = value;
  return true;
}

/**
 * partitionDeltaRepair(blockingErrors, deltaTargets) -> { eligible, targets, structural }
 *
 * THE CLASSIFIER, pure and side-effect-free. A stage takes the delta path only
 * when EVERY blocking error is delta-class — one named field, one exact
 * coordinate, one requirement the model can satisfy in isolation.
 *
 * Mixed lists take the full re-roll, deliberately: a structural failure (a
 * missing session, a broken reference, a spine that does not close) can change
 * what the neighbouring prose should say, so repairing a sentence beside it
 * would be polishing a field that may not survive. The cheap remedy is only
 * correct when the expensive one has nothing else to fix.
 *
 * Matching is by the error string's IDENTITY, never by parsing it: the gate
 * that wrote the message also wrote the coordinate, and a target claims its
 * message verbatim. An error no target claims is structural by definition —
 * which is what makes this safe as new floors are added.
 */
function partitionDeltaRepair(blockingErrors, deltaTargets) {
  var blocking = (blockingErrors || []).slice();
  var targets = (deltaTargets || []).slice();
  if (!blocking.length) return { eligible: false, reason: 'no-blocking-errors', targets: [], structural: [] };
  if (!targets.length) return { eligible: false, reason: 'no-delta-targets', targets: [], structural: blocking };

  var byMessage = {};
  targets.forEach(function (t) {
    if (t && typeof t.message === 'string' && Array.isArray(t.pathParts) && t.pathParts.length) {
      byMessage[t.message] = t;
    }
  });

  var matched = [];
  var structural = [];
  var seenPath = {};
  blocking.forEach(function (message) {
    var t = byMessage[message];
    if (!t) { structural.push(message); return; }
    // Two blocking errors naming ONE path would make "which value wins" a
    // question, and a merge with a question in it is not a merge. Treat the
    // whole list as structural rather than guessing.
    if (seenPath[t.path]) { structural.push(message); return; }
    seenPath[t.path] = true;
    matched.push(t);
  });

  if (structural.length) {
    return { eligible: false, reason: 'mixed-with-structural', targets: matched, structural: structural };
  }
  return { eligible: true, reason: '', targets: matched, structural: [] };
}

/**
 * partitionDeltaRepairOn(payload, blockingErrors, deltaTargets) -> partition
 *
 * THE CLASSIFIER, ASKED WHERE THE PAYLOAD IS (D168). A coordinate that does
 * not address this stage's own payload is not a coordinate — it is a path into
 * some other object, and repairing against it would either land nothing or
 * land it somewhere nobody named.
 *
 * This is not hypothetical. One gate serves several call sites, and a call site
 * that wraps its result before validating (a single fragment wrapped into a
 * `{ fragments:[...] }` envelope for the gate's benefit) publishes coordinates
 * relative to the envelope while the pipeline banks the bare object. The merge
 * guard would catch it — writeAtPathParts refuses a path that does not exist —
 * but only after a paid call, and the refusal would read as the model's fault.
 * Checked HERE it costs nothing and reports the true reason.
 */
function partitionDeltaRepairOn(payload, blockingErrors, deltaTargets) {
  var partition = partitionDeltaRepair(blockingErrors, deltaTargets);
  if (!partition.eligible) return partition;
  var unreachable = partition.targets.filter(function (t) {
    return readAtPathParts(payload, t.pathParts) === undefined;
  });
  if (!unreachable.length) return partition;
  return {
    eligible: false,
    reason: 'targets-not-on-payload',
    // The claimed set SURVIVES the refusal. These errors really were budget
    // breaches with coordinates; only the coordinates' frame is wrong, and the
    // reader's sentence still has to say "over budget" rather than "missing
    // required parts" (the D167 vocabulary rider does not care why the cheap
    // remedy was declined).
    targets: partition.targets,
    structural: unreachable.map(function (t) {
      return t.path + ' (no such field on this stage\'s payload)';
    })
  };
}

/**
 * deltaRefusalRecord(partition) -> telemetry record
 *
 * THE REFUSAL, WRITTEN DOWN (D168). Before this, a stage whose blocking errors
 * were mixed took the full re-roll and left NO trace anywhere that delta repair
 * had even been considered: no log line, no telemetry field, nothing in the run
 * report. The author's live Week 3 read as "it re-rolled over 4 characters"
 * because the only visible fact was the budget count in the retry sentence.
 *
 * Deliberately NOT a pipeline phase. A refusal resolves instantly into the
 * ordinary retry, and the retry line is the reader-facing event; inventing a
 * second event for a decision that changed nothing the reader waits on would be
 * noise. The trace belongs in the run notes and the stage's telemetry, which is
 * where someone asking "why did it re-roll?" is already looking.
 *
 * The counts are zero and `fields` is empty because nothing was spent and
 * nothing was repaired — a refusal record must never be mistakeable for a
 * repair that happened to cost nothing.
 */
function deltaRefusalRecord(partition) {
  return {
    rounds: 0,
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    fields: [],
    resolved: false,
    refused: partition.reason || 'ineligible',
    // The blocking errors NOT claimed by any target — the reason, in the gate's
    // own words rather than a category name.
    structural: (partition.structural || []).slice(),
    // The errors that WERE path-named, so a reader can see the mix rather than
    // inferring it. Present and empty when nothing was claimed at all.
    claimed: (partition.targets || []).map(function (t) { return t.path; })
  };
}

/**
 * applyDeltaFixes(payload, targets, fixes) -> { ok, merged, applied, rejected }
 *
 * THE MERGE GUARD. Two refusals and one proof:
 *
 *   · REFUSAL — a fix naming a path no target named. The response is discarded
 *     WHOLE (not filtered): a model that answered about a field nobody asked
 *     about was not doing the task, and quietly keeping the rest of its answer
 *     would be trusting the half we cannot check.
 *   · REFUSAL — a fix whose value is not a string, or whose path does not
 *     already exist on the payload. Delta repair shortens; it never creates.
 *   · PROOF — after the merge, everything outside the named paths is asserted
 *     byte-identical. Both sides are masked at the named paths and compared as
 *     serialized JSON, so key order, arrays, numbers and every untouched string
 *     are all in scope. A merge that moved anything else fails here rather than
 *     shipping a silently mutated week.
 */
function applyDeltaFixes(payload, targets, fixes) {
  var allowed = {};
  (targets || []).forEach(function (t) { allowed[t.path] = t; });

  var rejected = [];
  var seen = {};
  var normalized = [];
  (fixes || []).forEach(function (fix) {
    var path = fix && typeof fix.path === 'string' ? fix.path : '';
    if (!path || !allowed[path]) {
      rejected.push('unnamed path: ' + (path || '(missing)'));
      return;
    }
    if (typeof fix.value !== 'string') {
      rejected.push('non-string value at ' + path);
      return;
    }
    if (seen[path]) { rejected.push('duplicate fix for ' + path); return; }
    seen[path] = true;
    normalized.push({ target: allowed[path], value: fix.value });
  });
  if (rejected.length) return { ok: false, merged: null, applied: [], rejected: rejected };
  if (!normalized.length) return { ok: false, merged: null, applied: [], rejected: ['no fixes returned'] };

  // ONE merged object: the one that is proven is the one that ships.
  //
  // The first version built the proof copy and the shipped copy separately —
  // mask a clone, compare, then re-apply the fixes onto a fresh clone — and a
  // mutation test killed it on the spot: a stray write into the proof copy
  // never reached the shipped one, and a stray write into the shipped one was
  // never proven. Two objects is two answers to "what did this merge do", which
  // is D93's law at the smallest possible scale. The masking below therefore
  // runs on THROWAWAY copies of the real pair.
  var merged = deltaClone(payload);
  var applied = [];
  for (var i = 0; i < normalized.length; i++) {
    var n = normalized[i];
    if (!writeAtPathParts(merged, n.target.pathParts, n.value)) {
      return { ok: false, merged: null, applied: [], rejected: ['path does not exist on the payload: ' + n.target.path] };
    }
    applied.push(n.target.path);
  }

  // The byte-identity proof. Mask EVERY named path on both sides — including
  // ones the model declined to fix — then compare. What remains is the whole
  // payload minus the fields the gate itself named.
  var MASK = '\u0001delta-repair-mask\u0001';
  var beforeMasked = deltaClone(payload);
  var afterMasked = deltaClone(merged);
  (targets || []).forEach(function (t) {
    writeAtPathParts(beforeMasked, t.pathParts, MASK);
    writeAtPathParts(afterMasked, t.pathParts, MASK);
  });
  if (JSON.stringify(beforeMasked) !== JSON.stringify(afterMasked)) {
    return { ok: false, merged: null, applied: [], rejected: ['the merge changed content outside the named fields'] };
  }

  return { ok: true, merged: merged, applied: applied, rejected: [] };
}

// A model that has to shorten a sentence needs the sentences around it, or the
// rewrite arrives in a different voice than the paragraph it lands in. This
// hands it the failing field's SIBLING strings — accepted, frozen, and named as
// such in the prompt — capped so the delta call stays the cheapest in the run.
var DELTA_CONTEXT_FIELD_CHARS = 400;
var DELTA_CONTEXT_MAX_CHARS = 4000;

function buildDeltaContext(payload, targets) {
  var context = {};
  (targets || []).forEach(function (t) {
    var parentParts = t.pathParts.slice(0, -1);
    var leaf = t.pathParts[t.pathParts.length - 1];
    var parent = readAtPathParts(payload, parentParts);
    if (!parent || typeof parent !== 'object') return;
    var siblings = {};
    Object.keys(parent).forEach(function (key) {
      if (key === leaf) return;
      if (typeof parent[key] !== 'string' || !parent[key].trim()) return;
      siblings[key] = truncateText(parent[key], DELTA_CONTEXT_FIELD_CHARS);
    });
    if (Object.keys(siblings).length) context[formatFieldPath(parentParts) || '(root)'] = siblings;
  });
  if (!Object.keys(context).length) return '';
  var json = compactJsonString(context);
  return json.length > DELTA_CONTEXT_MAX_CHARS
    ? json.slice(0, DELTA_CONTEXT_MAX_CHARS) + '... [truncated]'
    : json;
}

// The model may answer with the contracted envelope, a bare array, or a plain
// path->value map. All three are path-keyed, so all three are checkable by the
// merge guard; anything else normalizes to an empty list and is rejected there.
function normalizeDeltaFixes(result) {
  var raw = result;
  if (raw && !Array.isArray(raw) && typeof raw === 'object' && Array.isArray(raw.fixes)) raw = raw.fixes;
  if (Array.isArray(raw)) {
    return raw.map(function (entry) {
      if (!entry || typeof entry !== 'object') return { path: '', value: null };
      return { path: entry.path, value: entry.value !== undefined ? entry.value : entry.text };
    });
  }
  if (raw && typeof raw === 'object') {
    return Object.keys(raw).map(function (key) { return { path: key, value: raw[key] }; });
  }
  return [];
}

// The whole clause agrees, not just the noun: "1 over-budget line that ran past
// THEIR budgetS" is the kind of sentence that tells a reader nobody read it.
function describeDeltaFields(targets) {
  var n = (targets || []).length;
  return n === 1
    ? '1 over-budget line that ran past its printed-space budget'
    : n + ' over-budget lines that ran past their printed-space budgets';
}

/**
 * runDeltaRepairRounds(ctx) -> { repaired, rounds, calls, usage, notes }
 *
 * The bounded loop. Each round: ask the model for the named fields, merge under
 * the guard, re-run THE SAME gate. A pass returns the merged payload and the
 * caller banks it exactly as an ordinary pass. Anything else — a rejected
 * merge, a still-failing gate whose errors are no longer delta-class, the round
 * budget spent — returns null, and the attempt ladder takes over unchanged.
 */
async function runDeltaRepairRounds(ctx) {
  var payload = ctx.payload;
  var targets = ctx.targets;
  var notes = [];
  // `notes` is the ledger's own array, not a copy (D168). Every return below
  // pushes its reason onto it, so a repair that did not resolve carries WHY it
  // did not resolve into stage telemetry and therefore into the run report —
  // it used to reach a console.warn and stop there, which is a reason only a
  // reader with devtools open ever saw.
  var ledger = {
    rounds: 0, calls: 0, inputTokens: 0, outputTokens: 0,
    fields: [], resolved: false, notes: notes
  };

  var builder = (typeof window !== 'undefined') && window.buildDeltaRepairPrompt;
  var schema = (typeof window !== 'undefined') && window.STRUCTURED_SCHEMA_DELTA_REPAIR;
  if (typeof builder !== 'function') {
    notes.push('prompt builder unavailable');
    return { repaired: null, ledger: ledger, notes: notes };
  }

  var budget = stageBudget(DELTA_REPAIR_BUDGET_KEY, ctx.settings.requestTimeoutMs);
  var deltaSettings = Object.assign({}, ctx.settings, {
    requestTimeoutMs: budget.requestTimeoutMs({ attempt: 0, error: null })
  });

  for (var round = 1; round <= DELTA_REPAIR_MAX_ROUNDS; round++) {
    ledger.rounds = round;
    var fields = targets.map(function (t) {
      return {
        path: t.path,
        requirement: t.requirement || t.message,
        cap: t.cap,
        length: t.length,
        current: readAtPathParts(payload, t.pathParts)
      };
    });
    ledger.fields = fields.map(function (f) { return f.path; });

    // THE PANEL MUST BE TOLD (D165). A delta repair is a new pipeline event and
    // a paid call; without its own phase it would fall through to the
    // unknown-phase warning — visible only in a console nobody has open.
    ctx.emit('Repairing ' + ctx.stageName + ': rewriting ' + describeDeltaFields(targets)
      + ' (round ' + round + ' of '
      + DELTA_REPAIR_MAX_ROUNDS + '). The rest of the answer is kept.', {
      phase: 'delta_repair',
      round: round,
      maxRounds: DELTA_REPAIR_MAX_ROUNDS,
      fields: ledger.fields.slice(),
      fieldCount: fields.length
    });

    var prompt = builder(ctx.stageName, fields, buildDeltaContext(payload, targets));
    var response;
    try {
      response = await callProviderStructured(deltaSettings, prompt, schema || null,
        budget.maxTokens({ attempt: 0, error: null }), ctx.stageName + ' delta repair', {});
    } catch (err) {
      // A delta call that fails for ANY transport reason (throttle included)
      // hands the attempt straight back to the ladder. The delta path is the
      // cheap optimisation, never a second place for retry policy to live.
      notes.push('delta call failed: ' + String((err && err.message) || err || 'unknown'));
      return { repaired: null, ledger: ledger, notes: notes };
    }
    ledger.calls += 1;
    // The usage SNAPSHOT is an envelope — provider, model, pricing, cost, and
    // the token counts one level in under `usage` (buildUsageSnapshot). Reading
    // the counts off the envelope silently yields zero, which is exactly what
    // the first campaign run reported: a repair that cost nothing measurable is
    // a repair whose economics nobody can check.
    var deltaUsage = (response && response.usage && response.usage.usage) || null;
    if (deltaUsage) {
      ledger.inputTokens += safeNumber(deltaUsage.inputTokens);
      ledger.outputTokens += safeNumber(deltaUsage.outputTokens);
    }
    // Spend is spend: the delta call rides the stage's own usage totals so the
    // cost meter and the checkpoint ledger stay honest (D96/D113).
    recordStageUsage(ctx.telemetry, response);

    var merge = applyDeltaFixes(payload, targets, normalizeDeltaFixes(response && response.result));
    if (!merge.ok) {
      // LOUD, and then the ordinary ladder. A rejected merge is a defect report
      // about this response, not a reason to weaken the guard.
      notes.push('merge rejected: ' + merge.rejected.join('; '));
      ctx.emit(ctx.stageName + ': the targeted repair answered about fields nobody asked about, so it was '
        + 'discarded and the stage will be rewritten in full (' + merge.rejected[0] + ').', {
        phase: 'delta_repair',
        round: round,
        maxRounds: DELTA_REPAIR_MAX_ROUNDS,
        rejected: merge.rejected.slice()
      });
      return { repaired: null, ledger: ledger, notes: notes };
    }

    var verdict = ctx.validate(merge.merged);
    if (!validationFailed(verdict)) {
      ledger.resolved = true;
      notes.push('repaired ' + merge.applied.length + ' field(s) in round ' + round);
      return { repaired: merge.merged, ledger: ledger, notes: notes };
    }

    // Still failing. Re-classify against the SAME rule: another round only if
    // every remaining blocking error is still one named field.
    var again = partitionDeltaRepairOn(
      merge.merged,
      classifyValidationErrors(extractErrorList(verdict)).blocking,
      (verdict && verdict.deltaTargets) || []
    );
    if (!again.eligible) {
      notes.push('remaining errors are not delta-class (' + again.reason + ')');
      return { repaired: null, ledger: ledger, notes: notes };
    }
    payload = merge.merged;
    targets = again.targets;
  }

  notes.push('delta rounds exhausted (' + DELTA_REPAIR_MAX_ROUNDS + ')');
  return { repaired: null, ledger: ledger, notes: notes };
}

// ── CROSS-STAGE REPAIR ROUTING (D143) ───────────────────────────────────────
// D128 proved that doctrine routed to the wrong stage lies to the model: six
// attempts, six identical failures, because no retry ladder saves a prompt that
// cannot fix the defect. This is that law one level up. A stage gate can fail
// on a defect whose material belongs to an EARLIER stage — M1's week gate died
// three times on a missing `playSpine.decisionLedger` row, which is the shell's
// to write and which no week prompt has ever been able to author — and the only
// escape the system had was a full fresh rebuild of thirteen paid stages.
//
// The route is: re-enter the OWNING stage with the defect quoted verbatim, then
// replay the bank forward. Everything before the owner is untouched and free
// (D98's whole point); everything after it is re-validated against the owner's
// new output and regenerated ONLY if it actually fails.
//
// TRANSPORT-BLIND BY CONSTRUCTION. Nothing in this seam reads a provider, a
// format, a base URL, a model id or a door: it routes on the blocking-error
// list and a stage order, both of which are the same on every transport and in
// every pipeline. That is the same stance error-classify.js takes toward
// provider vocabulary, asserted the same way — by scanning this seam's own
// source (see the routing rows in scripts/check-generation-floors.mjs).
//
// ONE TOTAL ORDER for both pipelines. `skeleton` and `shell` are the two
// compiler seats and never coexist in a run, so a single merged order is a
// legal linearisation of both stage sequences and there is no per-pipeline
// table to drift.
var REPAIR_STAGE_ORDER = [
  // `gameRulebook` sits after canonicalization and before every compiler seat,
  // which is where the stage actually runs on both pipelines (D173). Its rank
  // matters even though no floor currently routes TO it: an error carrying its
  // label at a later stage would otherwise rank -1 and be silently unroutable,
  // and a stage missing from this table is a stage whose repairs vanish.
  'workoutCanonical', 'canonicalize', 'gameRulebook', 'layerBible', 'campaignPlan',
  'skeleton', 'shell', 'knowing', 'rules', 'weeks', 'fragments', 'endings'
];

// A routing loop is a new failure mode, so the hops are bounded and the
// same-wall-twice → fresh-rebuild policy stays as the outermost resort.
var MAX_REPAIR_HOPS = 2;

function repairStageRank(stageKey) {
  var key = String(stageKey || '');
  if (/^week_/.test(key)) key = 'weeks';
  if (/^fragBatch_/.test(key)) key = 'fragments';
  return REPAIR_STAGE_ORDER.indexOf(key);
}

/**
 * planRepairRoute(err, state) -> null | { from, to, defects, defect, hop }
 *
 * THE ROUTING DECISION, pure and side-effect-free. Returns null — meaning "the
 * existing ladder owns this" — far more often than it returns a route, and
 * every refusal below is deliberate:
 *
 *   · no blocking errors, or no stage identity     nothing to reason about
 *   · every owner is this stage or later           its own retry can fix it,
 *                                                  which is what retries are
 *   · the hop budget is spent                      bounded, by ruling
 *   · this exact hop already ran                   a repair that did not take
 *                                                  will not take twice
 *
 * When several EARLIER stages own defects, the route goes to the earliest and
 * quotes ONLY that stage's defects. Quoting another stage's defect into this
 * prompt would be D128's exact disease — instructing a model to fix a shape it
 * does not author. The remaining owners resurface after the replay and get
 * their own hop, which is what the budget is for.
 */
function planRepairRoute(err, state) {
  var st = state || {};
  if ((st.hops || 0) >= MAX_REPAIR_HOPS) return null;

  var from = (err && err._stageKey) || '';
  var fromRank = repairStageRank(from);
  if (fromRank < 0) return null;

  var blocking = (err && err._blockingErrors) || [];
  if (!blocking.length) return null;

  var byOwner = {};
  blocking.forEach(function (message) {
    var owner = repairOwnerForError(message);
    if (!owner) return;                      // unprefixed: raised-by owns it
    var rank = repairStageRank(owner);
    if (rank < 0 || rank >= fromRank) return; // same stage or later: not a route
    if (!byOwner[owner]) byOwner[owner] = [];
    byOwner[owner].push(message);
  });

  var owners = Object.keys(byOwner).sort(function (a, b) {
    return repairStageRank(a) - repairStageRank(b);
  });
  if (!owners.length) return null;

  var to = owners[0];
  var hopId = to + '<-' + from;
  if (st.visited && st.visited[hopId]) return null;

  return {
    from: from,
    to: to,
    defects: byOwner[to].slice(),
    defect: byOwner[to][0],
    hop: (st.hops || 0) + 1
  };
}

/**
 * buildRepairDirective(route, ownerStageName, fromStageName) -> string
 *
 * The Correction Directive idiom, aimed one stage back. Same shape as
 * buildSmartRetryDirective's correction half deliberately — the model has been
 * taught to read that heading — with the one fact it needs that a same-stage
 * retry never has to state: this output was accepted, and something downstream
 * of it could not be built.
 */
function buildRepairDirective(route, ownerStageName, fromStageName) {
  var lines = [
    '',
    '## Correction Directive (Cross-Stage Repair)',
    '',
    'Your earlier output for ' + ownerStageName + ' was accepted, but ' + fromStageName
      + ' could not be completed because of ' + route.defects.length + ' defect(s) in it.',
    'You are being re-run to fix exactly those defects.',
    '',
    '### Defects (fix ALL of these)'
  ];
  route.defects.forEach(function (e, i) { lines.push((i + 1) + '. ' + e); });
  lines.push('');
  lines.push('### Instructions');
  lines.push('Return the CORRECTED JSON for ' + ownerStageName + ' with these issues fixed.');
  lines.push('- Preserve all working content (names, prose, palette, mechanical values).');
  lines.push('- Do NOT regenerate from scratch. Fix only the listed defects.');
  lines.push('- Everything downstream that already exists was written against your previous');
  lines.push('  output, so change as little as possible to satisfy the contract.');
  lines.push('- Return valid JSON only. No markdown fences, no commentary.');
  return lines.join('\n');
}

// The operator-facing name of each routable stage, so a directive and a UI card
// can say the same word for the same seat. Keys are stage keys; the values are
// the names the pipelines already emit on their progress events.
var REPAIR_STAGE_NAMES = {
  gameRulebook: 'Game Rulebook',
  layerBible: 'Layer Codex',
  campaignPlan: 'Story Plan',
  skeleton: 'Skeleton',
  shell: 'Booklet Setup',
  knowing: 'World Detail',
  rules: 'Rules Spread',
  weeks: 'Week',
  fragments: 'Fragments',
  endings: 'Endings'
};

/**
 * describeRepairRoute(err, fromStageName) -> null | routeShape
 *
 * THE CONSUMABLE SHAPE. One description of "who owns this defect and what
 * would you say to them", stamped on every blocking stage failure and read by
 * two different doors:
 *
 *   · the automatic path (runPipelineWithRepairRouting) re-enters the owning
 *     stage and hands `directive` to its prompt builder;
 *   · a guided/manual surface can send the operator back to the OWNING card
 *     with the same `directive` as its repair prompt.
 *
 * Same validators, same defect, same route, by construction — the two doors
 * differ in who performs the re-entry, never in where it lands.
 */
function describeRepairRoute(err, fromStageName) {
  var route = planRepairRoute(err, { hops: 0, visited: {} });
  if (!route) return null;
  var ownerName = REPAIR_STAGE_NAMES[route.to] || route.to;
  var fromName = fromStageName || REPAIR_STAGE_NAMES[route.from] || route.from;
  return {
    ownedBy: route.to,
    ownedByStageName: ownerName,
    from: route.from,
    fromStageName: fromName,
    defects: route.defects.slice(),
    directive: buildRepairDirective(route, ownerName, fromName)
  };
}

/**
 * derivePlannedWeekShapes(workout, campaignPlan, weekCount) -> [{ weekNumber, isBoss, isDeload }]
 *
 * What the plan and the program already know about every week, before a word of
 * it is written. Both facts were already being derived inside the week loop —
 * this lifts them to ONE home so the shell gate's pre-flight and the week gate
 * cannot form different opinions about the same week.
 *
 * The deload rule is unchanged and deliberately conservative: the multi-stage
 * campaign plan carries no isDeload field at all, so the plan is asked first and
 * the program's DECLARED marker second. A week that dips in volume without
 * saying so is not excused, because the floors must fail toward demanding
 * content.
 */
function derivePlannedWeekShapes(workout, campaignPlan, weekCount) {
  var plan = campaignPlan || {};
  var shapes = [];
  for (var w = 1; w <= weekCount; w++) {
    var entry = (plan.weeks || []).filter(function (pw) {
      return Number(pw.weekNumber) === w;                              // eslint-disable-line no-loop-func
    })[0] || {};
    var text = (typeof window.extractWeekWorkout === 'function')
      ? window.extractWeekWorkout(workout, [w])
      : '';
    shapes.push({
      weekNumber: w,
      isBoss: w === weekCount,
      isDeload: !!entry.isDeload || looksLikeDeloadWeek(text)
    });
  }
  return shapes;
}

/**
 * sweepStaleBankedWeeks(checkpoint, ctx) -> string[]  (stage keys to regenerate)
 *
 * After a cross-stage repair rewrites an upstream stage, the weeks already in
 * the bank were written against the OLD one. Blanket-invalidating them would
 * throw away exactly the paid work D98 exists to protect, so each is re-asked
 * its own gate against the NEW upstream and only the ones that actually fail
 * come back.
 *
 * `ctx.upstream` is the stage output holding meta.playSpine: the shell on the
 * multi-stage pipeline, the SKELETON on S+F. Named for the role, not for one
 * pipeline's word for it.
 *
 * SCOPED TO WHAT THE RE-ENTERED STAGE COULD HAVE CHANGED — the spine, the
 * grammar family. Continuity inputs (previousWeek's map evolution, the boss's
 * componentInputs) are deliberately not re-asked here: a shell repair cannot
 * have invalidated them, and asking would manufacture regeneration this repair
 * did not cause. Anything outside that scope is still held by the real week
 * gate if the week is ever regenerated for another reason.
 */
function sweepStaleBankedWeeks(checkpoint, ctx) {
  var stale = [];
  if (!checkpoint || !checkpoint.stages) return stale;
  var meta = ((ctx.upstream || {}).meta) || {};
  var family = (meta.artifactIntent || {}).mechanicGrammarFamily || '';
  var spine = meta.playSpine || null;
  var shapes = ctx.plannedWeekShapes || [];
  for (var w = 1; w <= ctx.weekCount; w++) {
    var banked = checkpoint.stages['week_' + w];
    if (!banked) continue;
    var shape = shapes[w - 1] || {};
    var verdict = validateWeekSchema(banked, w === ctx.weekCount, {
      currentWeekNumber: w,
      generationFloors: true,
      weekNumber: w,
      isDeload: !!shape.isDeload,
      spineStageLabel: ctx.spineStageLabel,
      mechanicGrammarFamily: family,
      playSpine: spine
    });
    var errors = (verdict && verdict.errors) || [];
    if (classifyValidationErrors(errors).blocking.length) stale.push('week_' + w);
  }
  return stale;
}

/**
 * pruneCheckpointStages(checkpoint, keys) -> checkpoint
 *
 * Drop named stages from the bank so the pipeline regenerates them. Deliberately
 * written against the EXISTING checkpoint API rather than a new one: a deletion
 * reaches storage by re-saving a surviving stage with its own value, because
 * saveCheckpoint persists the object it is handed. D98's four touchpoints and
 * one storage key are unchanged, and no key is invented (a non-stage key inside
 * `stages` would inflate stageCount and lie about how much was resumed).
 *
 * Best-effort by design. The in-process prune in the pipeline is the
 * load-bearing half; this one exists so a crash mid-repair does not resurrect
 * the stage the repair was called to rewrite.
 */
function pruneCheckpointStages(checkpoint, keys) {
  var cp = checkpoint || getCheckpoint();
  if (!cp || !cp.stages || typeof cp.stages !== 'object') return cp;
  var dropped = 0;
  (keys || []).forEach(function (key) {
    if (Object.prototype.hasOwnProperty.call(cp.stages, key)) {
      delete cp.stages[key];
      dropped++;
    }
  });
  if (!dropped) return cp;
  var survivors = Object.keys(cp.stages);
  // No survivor means there is nothing left to resume anyway — the pipeline's
  // own in-process prune already guarantees the correct behaviour, and clearing
  // storage here would throw away the spend ledger with it.
  if (survivors.length) saveCheckpoint(survivors[0], cp.stages[survivors[0]], cp);
  return cp;
}

/**
 * runPipelineWithRepairRouting(pipelineFn, options) -> booklet
 *
 * The outermost loop of the retry economics. A pipeline that dies on a defect
 * an earlier stage owns is re-run with that stage dropped from the bank and the
 * defect quoted into its prompt; everything else stays banked and replays free.
 *
 * Bounded three ways, because a routing loop would be a worse failure than the
 * rebuild it replaces: MAX_REPAIR_HOPS total, never the same hop twice, and any
 * refusal by planRepairRoute falls straight through to the caller — which is
 * the bench's same-wall-twice → fresh-rebuild policy, unchanged and still the
 * outermost resort.
 */
async function runPipelineWithRepairRouting(pipelineFn, options) {
  var opts = options || {};
  var state = { hops: 0, visited: {}, routes: [] };
  opts._repairState = state;
  for (;;) {
    try {
      return await pipelineFn(opts);
    } catch (err) {
      var route = planRepairRoute(err, state);
      if (!route) throw err;

      var ownerName = REPAIR_STAGE_NAMES[route.to] || route.to;
      var fromName = REPAIR_STAGE_NAMES[route.from] || route.from;
      route.directive = buildRepairDirective(route, ownerName, fromName);

      state.hops = route.hop;
      state.visited[route.to + '<-' + route.from] = 1;
      state.pending = route;
      // THE HOP LEDGER. Every route is recorded with the defect that caused it,
      // so a book that took two hops can be read back as two hops and not as a
      // mysteriously cheap success.
      state.routes.push({ from: route.from, to: route.to, defect: route.defect });

      opts._repairPrune = [route.to];
      pruneCheckpointStages(getCheckpoint(), [route.to]);

      var notice = 'Repairing ' + ownerName + ': ' + fromName + ' failed on a defect that stage owns.'
        + ' Re-running it with the defect quoted, then replaying saved work'
        + ' (hop ' + route.hop + '/' + MAX_REPAIR_HOPS + ').';
      console.warn('[LiftRPG] ' + notice);
      emitPipelineEvent(opts.onProgress, 0, 0, notice, {
        phase: 'start',
        stageKey: route.to,
        stageName: ownerName,
        noticeLevel: 'warn',
        repairRoute: { from: route.from, to: route.to, defect: route.defect }
      });
    }
  }
}

// Classification markers must survive the stage-name prefix. Rebuilding a bare
// Error here used to strip errorType / finishReason / retryable, which is how a
// classified truncation could reach a caller as an unclassifiable 'unknown'.
// `_stageKey` joined them for D143: the routing seam needs to know which stage
// raised the failure, and the human-facing stage NAME is not that identity.
// `repairRoute` joined them so the queryable shape survives to the caller.
var STAGE_ERROR_MARKERS = [
  'errorType', 'finishReason', 'retryable', 'status',
  'structuredUnsupported', '_failedOutput', '_blockingErrors', '_stageKey',
  'repairRoute',
  // D167: how many of the blocking errors were budget breaches. A structural
  // count, carried for the same reason finishReason is — so the reader's
  // sentence can name the real cause without anyone reading error prose.
  'budgetBreachCount',
  // D168: the TOTAL blocking count, so the reader's sentence can distinguish
  // "only budgets" from "budgets and something else". Useless if it does not
  // survive the stage-name prefix, exactly like the count above it.
  'blockingCount'
];

function carryStageErrorMarkers(source, target) {
  if (!source || !target) return target;
  STAGE_ERROR_MARKERS.forEach(function (key) {
    if (source[key] !== undefined && target[key] === undefined) target[key] = source[key];
  });
  return target;
}

function prefixStageError(stageName, err) {
  var message = String((err && err.message) || err || 'Unknown error');
  if (message.indexOf('[' + stageName + '] ') === 0) {
    return err instanceof Error ? err : carryStageErrorMarkers(err, new Error(message));
  }
  return carryStageErrorMarkers(err, new Error('[' + stageName + '] ' + message));
}

// ── Stage budget ladder (W2) ─────────────────────────────────────────────────
// The ONLY place stage token ceilings and timeouts are resolved. Values live in
// STAGE_BUDGETS (constants.js); escalation policy lives here; runJsonStage
// applies it automatically from config.stageKey. A stage should NOT hand-write
// maxTokens / requestTimeoutMs — doing so opts out of the ladder (which is how
// Story Plan ended up shrinking 420s -> 300s on retry).
//
// Two invariants:
//   1. Retries ESCALATE — attempt N+1 always gets at least as much wall clock
//      as attempt N (growth ^ attempt, capped at RETRY_TIMEOUT_CEILING_MS).
//   2. A truncated attempt gets its token ceiling raised to MAX_OUTPUT_TOKENS
//      rather than re-rolled at the ceiling that just proved too small.
function normalizeStageBudgetKey(stageKey) {
  var key = String(stageKey || '');
  if (STAGE_BUDGETS[key]) return key;
  // Per-week checkpoint keys are 'week_1', 'week_2', ...; the multi-stage
  // pipeline calls its per-week stage 'weeks'. Both share the 'week' budget.
  if (/^week(s|_\d+)?$/i.test(key)) return 'week';
  if (/^fragment/i.test(key)) return 'fragments';
  if (/^ending/i.test(key)) return 'endings';
  return '';
}

function stageBudget(stageKey, userTimeoutMs) {
  var key = normalizeStageBudgetKey(stageKey);
  var base = STAGE_BUDGETS[key] || { maxTokens: MAX_OUTPUT_TOKENS, timeoutMs: DEFAULT_TIMEOUT_MS };
  var baseTokens = base.maxTokens;
  // The user's timeout setting is a FLOOR, never a cap: they may grant a stage
  // more wall clock than the ladder budgets, but may not starve one below what
  // its token ceiling needs. Keeps the UI's timeout label honest (it is a real
  // minimum) without letting a single knob flatten per-stage differences.
  var floor = Number(userTimeoutMs) > 0 ? Number(userTimeoutMs) : 0;
  var baseTimeout = Math.max(base.timeoutMs, floor);

  return {
    // The optional third column, read through the SAME accessor as the other
    // two so no call site ever reaches into STAGE_BUDGETS itself (D97). '' when
    // the row is unset, which is every row today, and '' sends nothing.
    effort: String(base.effort || '').trim().toLowerCase(),
    // The optional fourth column, same accessor law as effort: 0 when the row
    // is unset, and 0 means "the caller's own default" — never a silent 1.
    attempts: Number(base.attempts) > 0 ? Math.round(Number(base.attempts)) : 0,
    maxTokens: function (retryState) {
      if (retryState && retryState.attempt > 0 && isLikelyTruncationError(retryState.error)) {
        return MAX_OUTPUT_TOKENS;
      }
      return baseTokens;
    },
    requestTimeoutMs: function (retryState) {
      var attempt = (retryState && retryState.attempt) || 0;
      var escalated = baseTimeout * Math.pow(RETRY_TIMEOUT_GROWTH, attempt);
      return Math.round(Math.min(escalated, RETRY_TIMEOUT_CEILING_MS));
    }
  };
}

function getApiPromptBuilders() {
  return {
    // D173 — the rules-first stage. Shared with Skeleton+Flesh: same builder,
    // same head, same document, so the parity floor at the two different spine
    // seats is checking the same thing twice rather than two things once.
    gameRulebook: window.generateGameRulebookPrompt,
    stage1: window.generateApiStage1Prompt || window.generateStage1Prompt,
    stage2: window.generateApiStage2Prompt || window.generateStage2Prompt,
    shell: window.generateApiShellPrompt || window.generateShellPrompt,
    // Shared with the Skeleton+Flesh pipeline — same builder, same head.
    knowing: window.generateKnowingPrompt,
    // `weeks`, `fragments` and `endings` rows were removed here (chip
    // task_84c0400a, DR-5 — the audit correction to D170's phrasing). The
    // registry offered them but nothing in this file ever dispatched
    // `builders.weeks` / `.fragments` / `.endings` — the live seats are
    // singleWeekFinal / fragmentBatch (clean run) + singleFragment (adaptive
    // recovery) / singleEnding below. The underlying functions
    // (`generateApiWeekChunkPrompt`, `generateApiFragmentsPrompt`,
    // `generateApiEndingsPrompt`) are NOT deleted — they stay pinned directly
    // by the D170/D173 floors rows in check-generation-floors.mjs, which call
    // them without going through this registry — and `generateWeekChunkPrompt`
    // / `generateEndingsPrompt` (the non-Api fallbacks these rows also named)
    // remain live on the guided-build wizard in index.html.
    singleWeekFinal: window.generateSingleWeekFinalPrompt,
    singleFragment: window.generateSingleFragmentPrompt,
    fragmentBatch: window.generateApiFragmentBatchPrompt || window.generateFragmentBatchPrompt,
    singleEnding: window.generateSingleEndingPrompt
  };
}

function assertApiPromptBuilders(builders) {
  if (!builders.gameRulebook ||
    !builders.stage1 || !builders.stage2 || !builders.shell || !builders.knowing ||
    !builders.singleWeekFinal ||
    !builders.singleFragment ||
    !builders.fragmentBatch || !builders.singleEnding) {
    throw new Error('Pipeline generators not loaded. Please reload the page.');
  }
}

function createStageTelemetry(stageKey, stageName) {
  return {
    stageKey: stageKey || '',
    stageName: stageName || '',
    attempts: 0,       // total API calls (success + failed)
    retries: 0,        // failed attempts only (attempts - 1 on success, attempts on total failure)
    startMs: Date.now(),
    latencyMs: 0,
    hadRepair: false,
    errorClass: null,   // last error classification seen (e.g. 'schema', 'timeout')
    provider: '',
    model: '',
    // The ladder's effort for this stage ('' = unset = the API default), so a
    // run report can state what each stage was asked to spend rather than
    // leaving the reader to infer it from the table.
    effort: '',
    // Set when a schema-forced stage DEGRADED to freeform text plus repair.
    // Null is the normal, healthy value; a non-null one is a defect report the
    // run must surface, not a footnote (D162's recorded-open).
    structuredFallback: null,
    // Set when the stage's gate failed on named fields and the pipeline asked
    // for those fields alone instead of re-rolling (D167). Null is "no delta
    // repair happened", which is most stages. The token counts here are a
    // SUBSET of `usage` below, not an addition to it: a delta call is spend,
    // and it rides the same meter as every other call in the run.
    deltaRepair: null,
    usage: blankUsageTotals(),
    estimatedCostUsd: 0,
    pricing: null
  };
}

function summarizeStageTelemetry(telemetry) {
  var usage = telemetry && telemetry.usage ? telemetry.usage : blankUsageTotals();
  var latencyMs = telemetry && telemetry.startMs ? (Date.now() - telemetry.startMs) : 0;
  return {
    stageKey: telemetry && telemetry.stageKey ? telemetry.stageKey : '',
    stageName: telemetry && telemetry.stageName ? telemetry.stageName : '',
    attempts: telemetry ? telemetry.attempts : 0,
    retries: telemetry ? telemetry.retries : 0,
    latencyMs: latencyMs,
    hadRepair: telemetry ? !!telemetry.hadRepair : false,
    errorClass: telemetry ? (telemetry.errorClass || null) : null,
    provider: telemetry && telemetry.provider ? telemetry.provider : '',
    model: telemetry && telemetry.model ? telemetry.model : '',
    effort: telemetry && telemetry.effort ? telemetry.effort : '',
    structuredFallback: telemetry && telemetry.structuredFallback
      ? Object.assign({}, telemetry.structuredFallback)
      : null,
    // Every array here is COPIED, not referenced: a summary is a snapshot that
    // outlives the stage object, and a shared array would keep mutating after
    // the event carrying it was emitted. `notes` and `structural`/`claimed`
    // joined `fields` for that reason when the refusal trace landed (D168).
    deltaRepair: telemetry && telemetry.deltaRepair
      ? Object.assign({}, telemetry.deltaRepair, {
        fields: (telemetry.deltaRepair.fields || []).slice(),
        notes: (telemetry.deltaRepair.notes || []).slice(),
        structural: (telemetry.deltaRepair.structural || []).slice(),
        claimed: (telemetry.deltaRepair.claimed || []).slice()
      })
      : null,
    usage: {
      inputTokens: safeNumber(usage.inputTokens),
      outputTokens: safeNumber(usage.outputTokens),
      cachedInputTokens: safeNumber(usage.cachedInputTokens),
      // Cache accounting, carried per stage so a run can be judged on measured
      // hits instead of on the assumption that a `cache_control` marker worked.
      // A marker on a prefix below the model's minimum is silently inert: it
      // reports zero writes AND zero reads, which is exactly what these two
      // numbers reading 0/0 across a whole run means.
      cacheWriteTokens: safeNumber(usage.cacheWriteTokens),
      cacheReadTokens: safeNumber(usage.cacheReadTokens),
      // Thinking spend, where the transport reports it. The Anthropic Messages
      // API does not: thinking is billed inside outputTokens with no separate
      // count, so 0 here means UNREPORTED on that path, never "did not think".
      reasoningTokens: safeNumber(usage.reasoningTokens),
      totalTokens: safeNumber(usage.totalTokens)
    },
    estimatedCostUsd: telemetry ? telemetry.estimatedCostUsd : 0,
    pricing: telemetry && telemetry.pricing ? Object.assign({}, telemetry.pricing) : null
  };
}

function recordStageUsage(telemetry, response) {
  if (!telemetry || !response || !response.usage) return;
  // Note: attempts is now incremented at loop top in runJsonStage, not here.
  telemetry.provider = response.usage.provider || telemetry.provider;
  telemetry.model = response.usage.model || telemetry.model;
  addUsageTotals(telemetry.usage, response.usage);
  if (response.usage.pricing) telemetry.pricing = response.usage.pricing;
  telemetry.estimatedCostUsd += safeNumber(response.usage.estimatedCostUsd);
}

function emitPipelineEvent(handler, stageIndex, totalStages, message, meta) {
  if (!handler) return;
  if (typeof handler === 'function') {
    handler(stageIndex, totalStages, message, meta || null);
    return;
  }
  if (typeof handler.onProgress === 'function') {
    handler.onProgress(stageIndex, totalStages, message, meta || null);
  }
}

// Checkpoint notices — durable-storage degradation, progress set aside for a
// different build, resume facts — ride the pipeline's existing progress/log
// channel rather than inventing a UI surface. Shape: a 'start'-phase event with
// an EMPTY stageKey, which the status surface logs verbatim while leaving the
// stage ledger untouched (markApiStageInProgress no-ops on a blank key).
// `noticeLevel` is advisory metadata for any surface that wants to style it.
function wireCheckpointNotices(onProgress, getStageIndex, getTotalStages) {
  setCheckpointNotice(function (level, message) {
    emitPipelineEvent(onProgress, getStageIndex(), getTotalStages(), message, {
      phase: 'start',
      stageKey: '',
      stageName: 'Checkpoint',
      noticeLevel: level
    });
  });
}


// ── Validation helpers for smart retry ───────────────────────────────────────

// THE THIRD SHAPE (D157, found by an outside review of this file, 2026-08-13).
// The documented convention is '' / {valid:true} for success and a non-empty
// string / {valid:false, errors} for failure — but the multi-stage week gate
// returned a bare ARRAY of continuity errors, and an array is `typeof
// 'object'` with no `.valid`, so `vr.valid === false` was false and a real
// failure read as a PASS. Continuity errors were dropped in silence and the
// chunk was banked to the checkpoint: no retry, no message, a book whose weeks
// do not answer each other. Arrays are handled here rather than only fixed at
// the call site, because the next callback to return one should fail loudly
// instead of silently — a convention that only holds when everyone remembers
// it is the shape this bug already had.
function validationFailed(vr) {
  if (typeof vr === 'string') return !!vr;
  if (Array.isArray(vr)) return vr.length > 0;
  return !!(vr && typeof vr === 'object' && vr.valid === false);
}

function extractErrorList(vr) {
  if (typeof vr === 'string') return [vr];
  if (Array.isArray(vr)) return vr.slice();
  if (vr && vr.errors && vr.errors.length) return vr.errors;
  return ['Schema validation failed'];
}

// ── The stage heartbeat ───────────────────────────────────────────────────────
//
// THE INCIDENT (live run, 2026-08-11): a long prose stage is ONE streaming call
// that can run 3-8+ minutes and reports its token usage only at the very end.
// The panel showed a fixed line and a frozen cost meter, and the operator asked
// whether to hit Stop — which would have discarded every token already paid
// for. Silence is not a state a paid pipeline is allowed to have.
//
// Two ADDITIVE event phases answer it, keyed to the same stageKey the existing
// start/complete/failed events already use:
//
//   'streaming' — one beat at dispatch (`received:false` — asked, nothing back
//                 yet), then a throttled tick per batch of received text, then
//                 one `final:true` tick carrying the true count.
//   'retrying'  — an attempt failed and another is coming. This used to be a
//                 console.warn and nothing else, so from the panel a silent
//                 retry escalation and a hang looked exactly alike.
//
// Surfaces that only know start/complete/failed keep working untouched.

function emitStageStreamEvent(config, message, extra) {
  emitPipelineEvent(
    config.onProgress,
    config.stageIndex || 0,
    config.getTotalStages ? config.getTotalStages() : 0,
    message,
    Object.assign({
      phase: 'streaming',
      stageKey: config.stageKey || '',
      stageName: config.stageName
    }, extra)
  );
}

// Why an attempt died, in words a reader owes nothing to a wire format for.
// Reads STRUCTURAL markers only — the guard's streamPhase and our own
// errorType — never provider prose and never the error message text.
function describeStageFailureCause(err) {
  var streamPhase = err && err.streamPhase;
  if (streamPhase === 'connect') return 'the provider never started answering';
  if (streamPhase === 'idle') return 'the answer stopped arriving partway through';
  if (streamPhase === 'overall') return 'it ran past its time limit';
  var errorType = (err && err.errorType) || '';
  if (errorType === 'timeout') return 'it timed out';
  if (errorType === 'truncation') return 'the answer was cut off at the length limit';
  // A body that PARSED but stopped at the length limit reaches us wearing a
  // validation error's clothes (see runJsonStage). The transport's normalized
  // verdict outranks the symptom: say why it was short, not what was missing.
  if (isTruncationFinishReason(err && err.finishReason)) return 'the answer was cut off at the length limit';
  // ── THE PROVIDER'S OWN FAILURE, NAMED (D165's recorded-open) ───────────────
  // `status` is already on the error object and was never read here, so a 500
  // from the provider's servers was reported to the reader as "it did not
  // complete" — indistinguishable from a model that wrote something wrong. A
  // 5xx is not the run's fault and not the model's, and saying so is the
  // difference between "try again" and "something I did is broken".
  var status = Number(err && err.status);
  if (status >= 500 && status < 600) return 'the provider\'s server failed';
  if (errorType === 'schema') {
    // ── OVER BUDGET IS NOT "MISSING PARTS" (D167) ───────────────────────────
    // The live Week 3 failure said "the answer came back missing required
    // parts" about two sentences that were four characters too long. Nothing
    // was missing; the model wrote too much. Read structurally off the count
    // the gate carried, never off the message text.
    var breaches = Number(err && err.budgetBreachCount) || 0;
    if (breaches > 0) {
      // ── AND WHAT ELSE (D168) ──────────────────────────────────────────────
      // The count above was rendered as the whole cause whenever it was
      // non-zero, so an attempt that failed on two budgets AND a missing
      // section was reported as an over-budget failure alone. The author read
      // that sentence on the live run and concluded the stage had re-rolled
      // over four characters; it had re-rolled over something structural, and
      // the budget count was the only part of the truth being told.
      //
      // `blockingCount` is the total; the remainder is what the budget count
      // does not explain. Absent (every pre-D168 error object and every
      // hand-built one) it falls back to the breach count, which makes the
      // remainder zero and the sentence BYTE-IDENTICAL to what it was.
      var total = Number(err && err.blockingCount) || breaches;
      var others = Math.max(0, total - breaches);
      var sentence = breaches === 1
        ? 'it came back with 1 line over its printed-space budget'
        : 'it came back with ' + breaches + ' lines over their printed-space budgets';
      if (others > 0) {
        sentence += ' and ' + others + ' other issue' + (others === 1 ? '' : 's');
      }
      return sentence;
    }
    return 'the answer came back missing required parts';
  }
  if (errorType === 'network') return 'the connection dropped';
  return 'it did not complete';
}

function formatBudgetMinutes(ms) {
  return Math.max(1, Math.round(Number(ms || 0) / 60000));
}

// Deliberately NOT "nothing you paid for is lost" — the tokens spent on the
// attempt that just died ARE gone. What is true is that finished stages are
// checkpointed, so that is what we say (D96 honesty family).
function buildStageRetryNotice(config, attempt, attemptCount, err, nextTimeoutMs) {
  var minutes = formatBudgetMinutes(nextTimeoutMs);
  return config.stageName + ': attempt ' + (attempt + 1) + ' of ' + attemptCount +
    ' did not finish (' + describeStageFailureCause(err) + '). ' +
    'Trying again automatically with more time — up to ' + minutes + ' minute' +
    (minutes === 1 ? '' : 's') + '. Stages that already finished are saved.';
}

// Parse the standard HTTP Retry-After header. Returns milliseconds to wait,
// or 0 if absent/unparseable. Handles both formats:
//   Retry-After: 120          (seconds)
//   Retry-After: Sat, 16 Aug 2026 16:00:00 GMT   (HTTP-date)
function parseRetryAfterHeader(err) {
  var raw = err && err.retryAfterHeader;
  if (!raw) return 0;
  var seconds = Number(raw);
  if (isFinite(seconds) && seconds > 0) return Math.ceil(seconds * 1000);
  var date = new Date(raw);
  if (!isNaN(date.getTime())) return Math.max(0, date.getTime() - Date.now());
  return 0;
}

// ── Core stage runner ─────────────────────────────────────────────────────────

// Authoritative API-stage discipline helper. Guided build should mirror this
// behavior at paste-time rather than inventing parallel acceptance rules.
async function runJsonStage(settings, config) {
  // Attempt count, in ladder order: an explicit config.maxAttempts wins (the
  // trial-mode call sites set one deliberately), then the STAGE_BUDGETS row,
  // then the 2 every call site used to hand-write.
  var attemptCount = config.maxAttempts
    || stageBudget(config.budgetKey || config.stageKey, settings.requestTimeoutMs).attempts
    || 2;
  var lastErr = null;
  var stageTelemetry = createStageTelemetry(config.stageKey, config.stageName);
  var rateLimitWaits = 0;

  for (var attempt = 0; attempt < attemptCount; attempt++) {
    // Rate limiter: wait for slot before each API call (including retries)
    if (config.rateLimiter) await config.rateLimiter.waitForSlot();

    // Daily budget check: abort if Gemini free-tier limit reached
    if (config.budgetEnforce && isGeminiProvider(settings)) {
      var budget = getDailyBudget();
      if (budget.calls >= DAILY_CALL_LIMIT) {
        throw new Error('Daily API budget reached (' + budget.calls + '/' + DAILY_CALL_LIMIT +
          ' calls). Your progress is saved. Resume tomorrow or switch to a paid API key.');
      }
    }

    var retryState = { attempt: attempt, error: lastErr };
    var prompt = config.buildPrompt(retryState);
    if (attempt > 0) prompt += buildSmartRetryDirective(config.stageName, attempt, lastErr);
    // A cross-stage repair re-enters this stage at attempt 0, so the directive
    // cannot ride the retry counter — it rides the config, set by the router
    // for exactly one re-entry (D143). Appended after the retry directive so a
    // repaired stage that then fails its OWN gate still sees both.
    else if (config.repairDirective) prompt += config.repairDirective;

    // Stage budgets come from the ladder (STAGE_BUDGETS + stageBudget()) keyed
    // by stageKey. An explicit config.maxTokens / config.requestTimeoutMs still
    // wins, but opting out also opts out of retry escalation — prefer the ladder.
    var budget = stageBudget(config.budgetKey || config.stageKey, settings.requestTimeoutMs);
    var maxTokensSpec = config.maxTokens !== undefined ? config.maxTokens : budget.maxTokens;
    var timeoutSpec = config.requestTimeoutMs !== undefined ? config.requestTimeoutMs : budget.requestTimeoutMs;

    var resolvedMaxTokens = typeof maxTokensSpec === 'function'
      ? maxTokensSpec(retryState)
      : maxTokensSpec;
    var resolvedTimeoutMs = typeof timeoutSpec === 'function'
      ? timeoutSpec(retryState)
      : (timeoutSpec || settings.requestTimeoutMs || DEFAULT_TIMEOUT_MS);
    // The effort column, from the ladder and nowhere else. Absent on every row
    // today, so this branch never fires and `stageSettings` is the object it
    // always was — the byte-identity the gates assert. When a row IS set, the
    // value rides settings for the transport that can use it; every other
    // adapter ignores the key and its payload is unchanged.
    var stageEffort = budget.effort || '';
    var stageSettings = resolvedTimeoutMs === (settings.requestTimeoutMs || DEFAULT_TIMEOUT_MS)
      ? settings
      : Object.assign({}, settings, { requestTimeoutMs: resolvedTimeoutMs });
    if (stageEffort) {
      stageSettings = Object.assign({}, stageSettings, { _effort: stageEffort });
    }

    stageTelemetry.attempts += 1;

    // The heartbeat. `budgetMs` is the RESOLVED ladder value for this attempt
    // (escalated on retries), so any surface can state how long this step may
    // run without a hand-written per-stage minute literal anywhere (D97).
    var attemptStreamMeta = {
      attempt: attempt,
      attemptCount: attemptCount,
      budgetMs: resolvedTimeoutMs
    };
    emitStageStreamEvent(config, 'Waiting on ' + config.stageName + '…', Object.assign({
      received: false,
      chars: 0,
      approxTokens: 0,
      elapsedMs: 0,
      final: false
    }, attemptStreamMeta));

    var callOptions = {
      onStreamTick: function (tick) {
        emitStageStreamEvent(config, 'Receiving ' + config.stageName + '…', Object.assign({
          received: true,
          chars: tick.chars,
          approxTokens: tick.approxTokens,
          elapsedMs: tick.elapsedMs,
          final: !!tick.final
        }, attemptStreamMeta));
      }
    };

    try {
      var response = config.schema
        ? await callProviderStructured(stageSettings, prompt, config.schema, resolvedMaxTokens, config.stageName, callOptions)
        : await (async function () {
          var rawResponse = await callProvider(stageSettings, prompt, resolvedMaxTokens, callOptions);
          return {
            result: extractJson(rawResponse.text),
            meta: rawResponse.meta,
            usage: rawResponse.usage
          };
        })();
      var result = response.result;
      recordStageUsage(stageTelemetry, response);
      stageTelemetry.effort = stageEffort;

      // ── A LOST SCHEMA FORCE IS AN EVENT, NOT A CONSOLE LINE ─────────────────
      // callProviderStructured degrades a stage to freeform when the endpoint
      // refuses to force a schema. That is the right move for a genuine refusal
      // and re-opens D159's dropped-section failure for everything else, so the
      // run has to SAY it happened, name the stage, and quote the provider —
      // once, on the attempt it happened on, through the same channel every
      // other stage fact rides. It does not fail the stage: the answer may be
      // perfectly good, and the loudness is so a bad one is attributable.
      var lostForce = response.meta && response.meta.structuredFallback;
      if (lostForce && !stageTelemetry.structuredFallback) {
        stageTelemetry.structuredFallback = {
          stageName: lostForce.stageName || config.stageName || '',
          reason: lostForce.reason || '',
          providerMessage: lostForce.providerMessage || ''
        };
        emitPipelineEvent(config.onProgress, config.stageIndex || 0,
          config.getTotalStages ? config.getTotalStages() : 0,
          config.stageName + ': the provider refused schema-forced output, so this stage '
          + 'answered as freeform text and may drop a required section. Provider said: '
          + (lostForce.providerMessage || 'no message'), {
            phase: 'structured_fallback',
            // Rides the NOTICE channel, and the empty stageKey is required by
            // it: a notice must not pin itself onto a stage card (the comment
            // at that branch in index.html says so). The stage is named in the
            // message instead, and the machine-readable copy reaches the card
            // through this stage's own telemetry summary a moment later.
            noticeLevel: 'warn',
            stageKey: '',
            stageName: config.stageName,
            reason: lostForce.reason || '',
            providerMessage: lostForce.providerMessage || ''
          });
      }

      // THE ATTEMPT'S FINISH REASON (D97 escalation, restored).
      //
      // A response that ran out of output tokens does not always arrive as a
      // thrown truncation. When the partial body still PARSES — repaired JSON,
      // an adapter that returns what it received rather than raising — the only
      // thing that fails is config.validate(), and a validation error carries no
      // errorType and no finishReason. stageBudget() then sees an ordinary
      // schema failure and hands attempt 2 the exact ceiling that just proved
      // too small, so the retry truncates identically and the stage dies twice
      // at the same wall.
      //
      // The transport already told us how the attempt ended, on the normalized
      // enum. Carry that verdict onto the error so it rides retryState like any
      // other structural marker: stageBudget() raises the ceiling to
      // MAX_OUTPUT_TOKENS and buildSmartRetryDirective() sends the Length
      // Directive instead of a Correction Directive. No message text is read to
      // reach that conclusion, and error-classify.js stays provider-blind.
      var attemptFinishReason = (response.meta && response.meta.finishReason) || '';

      // Record API call for daily budget tracking
      if (config.budgetEnforce) {
        var totalTokens = (response.usage && response.usage.totalTokens) || 0;
        recordApiCall(totalTokens);
      }

      if (config.unwrapKey) result = unwrapIfNeeded(result, config.unwrapKey);
      if (config.normalizeResult) result = config.normalizeResult(result);
      if (config.validate) {
        // Convention: validate() returns '' or {valid: true} on success, non-empty string or {valid: false, errors: [...]} on failure.
        var validationResult = config.validate(result);

        // Layer 1: attempt auto-repair before considering retry
        if (validationFailed(validationResult) && config.autoRepair) {
          result = config.autoRepair(result);
          validationResult = config.validate(result);
          if (!validationFailed(validationResult)) {
            console.info('[LiftRPG] ' + config.stageName + ' auto-repaired — no retry needed.');
            stageTelemetry.hadRepair = true;
          }
        }

        // Layer 3: classify remaining errors by severity
        if (validationFailed(validationResult)) {
          var errorList = extractErrorList(validationResult);
          var classified = classifyValidationErrors(errorList);

          if (classified.blocking.length === 0) {
            // All remaining issues are repairable (assembly will fix) or degraded (acceptable)
            if (classified.degraded.length > 0) {
              console.warn('[LiftRPG] ' + config.stageName + ' accepted with degraded fields:', classified.degraded);
            }
            if (classified.repairable.length > 0) {
              console.info('[LiftRPG] ' + config.stageName + ' has ' + classified.repairable.length + ' repairable issue(s) — assembly will fix.');
            }
            // fall through to success
          } else {
            // ── DELTA REPAIR BEFORE THE RE-ROLL (D167) ───────────────────────
            // Every blocking error named one field and one coordinate? Then ask
            // the model for those fields only, merge under the guard, and
            // re-run THIS SAME gate. A pass falls through to the ordinary
            // success path below — same banking, same event, same checkpoint —
            // with the repair recorded in telemetry. Anything else throws
            // exactly as it always did, and the attempts ladder is untouched.
            var deltaPartition = partitionDeltaRepairOn(result, classified.blocking,
              (validationResult && validationResult.deltaTargets) || []);
            var deltaResolved = false;
            if (!deltaPartition.eligible) {
              // ── THE REFUSAL LEAVES A TRACE (D168) ─────────────────────────
              // A decision this consequential — re-roll a whole stage rather
              // than rewrite two sentences — may not be invisible. Both halves
              // land: a run-note naming the reason and the unclaimed errors,
              // and the same fact on the stage's telemetry so the run report
              // shows delta was considered and why it was not taken. Without
              // this, "the partition refused" and "the partition never ran"
              // are the same picture from outside.
              // Built once, read twice. The log line reads the RECORD rather
              // than the telemetry slot it was just written to, so the two
              // halves of the trace fail independently — a slot that stopped
              // being written must not also take the log line down with it.
              var refusal = deltaRefusalRecord(deltaPartition);
              stageTelemetry.deltaRepair = refusal;
              console.info('[LiftRPG] ' + config.stageName + ' targeted repair not applicable ('
                + refusal.refused + ') — re-rolling the stage. '
                + (refusal.structural.length
                  ? 'Not path-named: ' + refusal.structural.join(' | ')
                  : 'No blocking error published a field coordinate.'));
            } else {
              var deltaOutcome = await runDeltaRepairRounds({
                settings: settings,
                stageName: config.stageName,
                payload: result,
                targets: deltaPartition.targets,
                validate: config.validate,
                telemetry: stageTelemetry,
                emit: function (message, meta) {
                  emitPipelineEvent(config.onProgress, config.stageIndex || 0,
                    config.getTotalStages ? config.getTotalStages() : 0, message,
                    Object.assign({
                      stageKey: config.stageKey || '',
                      stageName: config.stageName,
                      attempt: attempt,
                      attemptCount: attemptCount
                    }, meta));
                }
              });
              stageTelemetry.deltaRepair = deltaOutcome.ledger;
              if (deltaOutcome.repaired) {
                result = deltaOutcome.repaired;
                deltaResolved = true;
                stageTelemetry.hadRepair = true;
                console.info('[LiftRPG] ' + config.stageName + ' delta-repaired '
                  + deltaOutcome.ledger.fields.length + ' field(s) in '
                  + deltaOutcome.ledger.rounds + ' round(s) — no re-roll needed.');
              } else {
                console.warn('[LiftRPG] ' + config.stageName + ' delta repair did not resolve: '
                  + deltaOutcome.notes.join('; '));
              }
            }
            if (!deltaResolved) {
              // Blocking errors remain — throw for smart retry
              var err = new Error(classified.blocking.join('; '));
              err.errorType = 'schema';
              err.retryable = true;
              // How many of the blocking errors were budgets, carried
              // STRUCTURALLY so the reader's sentence can say what actually went
              // wrong without anyone parsing an error message (D167's honesty
              // rider). 0 on every other failure, which is the identity value.
              err.budgetBreachCount = deltaPartition.targets.length;
              // And how many blocking errors there were IN TOTAL (D168). The
              // count above was rendered as the whole story — "it came back
              // with 4 lines over their printed-space budgets" — on attempts
              // that also failed something structural, so the reader was told
              // the stage re-rolled over four characters when it re-rolled over
              // a missing section. Two numbers, one sentence, neither parsed.
              err.blockingCount = classified.blocking.length;
              // The wire's verdict on this attempt, carried structurally. Only a
              // normalized 'truncation' changes the retry's behavior; every other
              // value is recorded and inert.
              err.finishReason = attemptFinishReason;
              err._failedOutput = result;
              err._blockingErrors = classified.blocking;
              // Which stage RAISED this. The routing seam compares it against the
              // stage each defect is OWNED by; the human-facing stageName is a
              // label, not an identity.
              err._stageKey = config.stageKey || '';
              // THE QUERYABLE ROUTING SHAPE (D143). Computed on every blocking
              // stage failure, whether or not this run's automatic path takes the
              // route, because the guided door runs these same validators and
              // must be able to send the user back to the OWNING card with the
              // same directive as its repair prompt. `null` means "this stage
              // owns its own defect", which is a real and useful answer.
              err.repairRoute = describeRepairRoute(err, config.stageName);
              throw err;
            }
          }
        }
      }
      var summary = summarizeStageTelemetry(stageTelemetry);
      // Single choke point for every paid call in every pipeline (critic rounds
      // included) — the cross-session spend ledger is fed from here and only here.
      recordCheckpointSpend(summary);
      emitPipelineEvent(config.onProgress, config.stageIndex || 0, config.getTotalStages ? config.getTotalStages() : 0, config.completeMessage || config.stageName, {
        phase: 'complete',
        stageKey: config.stageKey || '',
        stageName: config.stageName,
        telemetry: summary
      });
      if (Array.isArray(config.telemetryCollector)) {
        config.telemetryCollector.push(summary);
      }
      return result;
    } catch (err) {
      // ── Throttle backoff ───────────────────────────────────────────────
      // A "come back later" is not a content failure. Do not consume an
      // attempt — wait for the provider's window to reopen, then re-enter
      // the same attempt. The provider doesn't matter: 429 is 429.
      if (isLikelyThrottleError(err) && rateLimitWaits < THROTTLE_MAX_WAITS) {
        rateLimitWaits++;
        var retryAfterMs = parseRetryAfterHeader(err);
        var backoffMs = retryAfterMs > 0
          ? retryAfterMs
          : Math.min(
              THROTTLE_INITIAL_DELAY_MS * Math.pow(THROTTLE_BACKOFF_MULTIPLIER, rateLimitWaits - 1),
              THROTTLE_MAX_DELAY_MS
            );
        var waitMinutes = Math.ceil(backoffMs / 60000);
        emitPipelineEvent(config.onProgress, config.stageIndex || 0,
          config.getTotalStages ? config.getTotalStages() : 0,
          config.stageName + ': provider said "not now" — waiting ' + waitMinutes +
          ' minute' + (waitMinutes === 1 ? '' : 's') +
          ' before retrying (wait ' + rateLimitWaits + '/' + THROTTLE_MAX_WAITS +
          '). Progress is saved.', {
            phase: 'throttle_wait',
            stageKey: config.stageKey || '',
            stageName: config.stageName,
            waitMs: backoffMs,
            waitNumber: rateLimitWaits,
            maxWaits: THROTTLE_MAX_WAITS
          });
        await new Promise(function(resolve) { setTimeout(resolve, backoffMs); });
        attempt--;   // for-loop will increment; net effect: same attempt index
        continue;
      }

      // All throttle waits exhausted — exit cleanly.
      if (isLikelyThrottleError(err)) {
        var exhaustionErr = new Error(
          config.stageName + ': the provider has not resumed after ' +
          rateLimitWaits + ' waits (~' + Math.round(
            THROTTLE_INITIAL_DELAY_MS * (Math.pow(THROTTLE_BACKOFF_MULTIPLIER, rateLimitWaits) - 1)
            / (THROTTLE_BACKOFF_MULTIPLIER - 1) / 60000
          ) + ' minutes). Your progress through completed stages is saved. ' +
          'Click Build to resume from where you left off — no re-spend.'
        );
        exhaustionErr.errorType = 'throttle_exhaustion';
        exhaustionErr.retryable = false;
        // SAY WHICH STAGE DIED. Every other terminal path through this function
        // emits phase:'failed' before it throws, and the panel's stage ledger is
        // driven by that event: without it the exhausted stage is left rendered
        // as still in progress while the run has already ended, so the reader
        // sees a hang where there is a finished, resumable failure. Found by the
        // fault campaign's exhaustion arm, 2026-08-16 (the D110 family: a stage
        // nobody claims is a UI lie).
        emitPipelineEvent(config.onProgress, config.stageIndex || 0,
          config.getTotalStages ? config.getTotalStages() : 0,
          config.stageName + ' failed', {
            phase: 'failed',
            stageKey: config.stageKey || '',
            stageName: config.stageName,
            error: String(exhaustionErr.message || ''),
            errorType: 'throttle_exhaustion',
            telemetry: summarizeStageTelemetry(stageTelemetry)
          });
        throw prefixStageError(config.stageName, exhaustionErr);
      }

      lastErr = err;
      stageTelemetry.retries += 1;
      stageTelemetry.errorClass = err.errorType || (err.code === 'ECONNABORTED' ? 'timeout' : 'unknown');
      console.warn('[LiftRPG] ' + config.stageName + ' attempt ' + (attempt + 1) + '/' + attemptCount + ' failed:', err.message);
      if (attempt === attemptCount - 1 || !shouldRetryStageError(err)) {
        emitPipelineEvent(config.onProgress, config.stageIndex || 0, config.getTotalStages ? config.getTotalStages() : 0, config.stageName + ' failed', {
          phase: 'failed',
          stageKey: config.stageKey || '',
          stageName: config.stageName,
          error: String((err && err.message) || err || ''),
          telemetry: summarizeStageTelemetry(stageTelemetry)
        });
        throw prefixStageError(config.stageName, err);
      }
      // Another attempt is coming. Say so — from the panel, a silent retry
      // and a hang are the same picture, and the reader's only lever is Stop.
      var nextTimeoutMs = typeof timeoutSpec === 'function'
        ? timeoutSpec({ attempt: attempt + 1, error: err })
        : resolvedTimeoutMs;
      emitPipelineEvent(config.onProgress, config.stageIndex || 0, config.getTotalStages ? config.getTotalStages() : 0,
        buildStageRetryNotice(config, attempt, attemptCount, err, nextTimeoutMs), {
          phase: 'retrying',
          stageKey: config.stageKey || '',
          stageName: config.stageName,
          attempt: attempt,
          attemptCount: attemptCount,
          errorClass: stageTelemetry.errorClass,
          streamPhase: (err && err.streamPhase) || '',
          nextTimeoutMs: nextTimeoutMs
        });
    }
  }

  throw prefixStageError(config.stageName, lastErr || new Error('Unknown stage failure'));
}


// ── Week chunk + Fragment batch adaptive runners ──────────────────────────────

function splitRegistryForRetry(registry) {
  var midpoint = Math.ceil(registry.length / 2);
  return [registry.slice(0, midpoint), registry.slice(midpoint)];
}

function weekSummariesForRegistry(registry, allWeekSummaries, fallbackSummaries) {
  var lookup = {};
  (registry || []).forEach(function (entry) {
    if (entry && entry.weekRef) lookup[entry.weekRef] = true;
  });
  var scoped = (allWeekSummaries || []).filter(function (summary) {
    return lookup[summary.weekNumber];
  });
  return scoped.length ? scoped : (fallbackSummaries || []);
}

function normalizeSingleFragmentResult(result, registryEntry) {
  var fragment = result;
  if (fragment && Array.isArray(fragment.fragments) && fragment.fragments.length === 1) {
    fragment = fragment.fragments[0];
  }
  if (!fragment || typeof fragment !== 'object') return fragment;
  var normalized = Object.assign({}, fragment);
  if (!normalized.id && registryEntry && registryEntry.id) {
    normalized.id = registryEntry.id;
  }
  if (!normalized.documentType && registryEntry && registryEntry.documentType) {
    normalized.documentType = registryEntry.documentType;
  }
  if (!normalized.inWorldAuthor && registryEntry && registryEntry.author) {
    normalized.inWorldAuthor = registryEntry.author;
  }
  return normalized;
}

function normalizeFragmentBatchResult(result, registry) {
  var batch = result;
  var fragments = [];

  if (Array.isArray(batch)) {
    fragments = batch;
    batch = { fragments: batch };
  } else if (batch && typeof batch === 'object' && Array.isArray(batch.fragments)) {
    fragments = batch.fragments;
  } else if (batch && typeof batch === 'object') {
    var wrapperKeys = ['documents', 'docs', 'items', 'records', 'entries'];
    for (var i = 0; i < wrapperKeys.length; i++) {
      if (Array.isArray(batch[wrapperKeys[i]])) {
        fragments = batch[wrapperKeys[i]];
        batch = { fragments: batch[wrapperKeys[i]] };
        break;
      }
    }
    if (!fragments.length && batch.id) {
      fragments = [batch];
      batch = { fragments: fragments };
    }
  }

  if (!Array.isArray(fragments)) return batch;

  var registryEntries = Array.isArray(registry) ? registry : [];
  var registryByNorm = {};
  registryEntries.forEach(function (entry) {
    var norm = normalizeId(entry && entry.id);
    if (norm) registryByNorm[norm] = entry;
  });

  var normalizedFragments = fragments.map(function (fragment, index) {
    var norm = normalizeId(fragment && fragment.id);
    var registryEntry = (norm && registryByNorm[norm]) || registryEntries[index] || null;
    return normalizeSingleFragmentResult(fragment, registryEntry);
  }).filter(Boolean);

  return Object.assign({}, (batch && typeof batch === 'object' && !Array.isArray(batch)) ? batch : {}, {
    fragments: normalizedFragments
  });
}

function planFragmentBatchRecovery(result, registry) {
  var batchResult = result;
  if (batchResult && Array.isArray(batchResult.fragments)) batchResult = batchResult.fragments;
  var fragments = Array.isArray(batchResult) ? batchResult : [];
  var registryEntries = Array.isArray(registry) ? registry : [];
  var registryByNorm = {};
  var registryOrder = {};
  var recoveredByNorm = {};

  registryEntries.forEach(function (entry, index) {
    var norm = normalizeId(entry && entry.id);
    if (!norm) return;
    registryByNorm[norm] = entry;
    registryOrder[norm] = index;
  });

  fragments.forEach(function (fragment) {
    var norm = normalizeId(fragment && fragment.id);
    var registryEntry = registryByNorm[norm];
    if (!registryEntry || recoveredByNorm[norm]) return;
    var normalized = normalizeSingleFragmentResult(fragment, registryEntry);
    // The gate answers in the verdict shape (D157/D168). Read through the same
    // helper every other call site uses — a truthiness test on the object would
    // read EVERY verdict, pass included, as a failure and salvage nothing.
    var validation = validateFragmentsStage({ fragments: normalized ? [normalized] : [] }, [registryEntry]);
    if (!validationFailed(validation)) {
      recoveredByNorm[norm] = normalized;
    }
  });

  var recoveredFragments = Object.keys(recoveredByNorm)
    .sort(function (a, b) { return registryOrder[a] - registryOrder[b]; })
    .map(function (norm) { return recoveredByNorm[norm]; });

  var missingRegistry = registryEntries.filter(function (entry) {
    return !recoveredByNorm[normalizeId(entry && entry.id)];
  });

  return {
    fragments: recoveredFragments,
    missingRegistry: missingRegistry
  };
}

async function generateSingleFragmentAdaptive(settings, builders, config) {
  var registryEntry = (config.registry || [])[0] || null;
  var fragment = await runJsonStage(settings, {
    stageKey: config.stageKey || 'fragments',
    stageName: config.label,
    stageIndex: config.stageIndex || 0,
    completeMessage: config.label + ' complete.',
    onProgress: config.silent ? null : (config.onProgress || null),
    getTotalStages: config.getTotalStages || null,
    schema: null,
    maxAttempts: 2,
    rateLimiter: config.rateLimiter || null,
    budgetEnforce: config.budgetEnforce || false,
    normalizeResult: function (result) {
      return normalizeSingleFragmentResult(result, registryEntry);
    },
    validate: function (result) {
      return validateFragmentsStage({ fragments: result ? [result] : [] },
        registryEntry ? [registryEntry] : [], { generationFloors: true });
    },
    buildPrompt: function (retryState) {
      return builders.singleFragment(
        config.layerBible,
        registryEntry,
        config.batchWeekSummaries,
        config.shellContext,
        config.priorFragments,
        retryState
      );
    }
  });
  return { fragments: fragment ? [fragment] : [] };
}

async function recoverFragmentBatchDeterministically(settings, builders, config, err) {
  var recoveryPlan = planFragmentBatchRecovery(err && err._failedOutput, config.registry);
  var recoveredFragments = (recoveryPlan.fragments || []).slice();
  var pendingRegistry = recoveryPlan.missingRegistry || [];
  var stagedFragments = config.priorFragments.concat(recoveredFragments);
  var salvagedCount = recoveredFragments.length;

  if (recoveredFragments.length > 0) {
    console.warn('[LiftRPG] Salvaged ' + recoveredFragments.length + '/' + config.registry.length +
      ' fragments from failed batch output:', config.label);
  } else {
    console.warn('[LiftRPG] No valid fragments salvaged from failed batch output:', config.label);
  }

  for (var i = 0; i < pendingRegistry.length; i++) {
    var entry = pendingRegistry[i];
    var recovered = await generateSingleFragmentAdaptive(settings, builders, {
      layerBible: config.layerBible,
      registry: [entry],
      batchWeekSummaries: weekSummariesForRegistry([entry], config.allWeekSummaries, config.batchWeekSummaries),
      shellContext: config.shellContext,
      priorFragments: stagedFragments,
      label: config.label + ' recovery ' + entry.id,
      stageKey: config.stageKey,
      stageIndex: config.stageIndex,
      onProgress: config.onProgress,
      getTotalStages: config.getTotalStages,
      rateLimiter: config.rateLimiter,
      budgetEnforce: config.budgetEnforce,
      silent: true
    });
    (recovered.fragments || []).forEach(function (fragment) {
      recoveredFragments.push(fragment);
      stagedFragments.push(fragment);
    });
  }

  emitPipelineEvent(config.onProgress, config.stageIndex || 0, config.getTotalStages ? config.getTotalStages() : 0, config.label + ' recovered deterministically.', {
    phase: 'complete',
    stageKey: config.stageKey || 'fragments',
    stageName: config.label,
    completionSource: 'recovery',
    recoveredCount: recoveredFragments.length,
    salvagedCount: salvagedCount,
    generatedCount: pendingRegistry.length
  });

  return {
    fragments: recoveredFragments
  };
}

async function generateFragmentBatchAdaptive(settings, builders, config) {
  try {
    return await runJsonStage(settings, {
      stageKey: config.stageKey || 'fragments',
      stageName: config.label,
      stageIndex: config.stageIndex || 0,
      completeMessage: config.label + ' complete.',
      onProgress: config.onProgress || null,
      getTotalStages: config.getTotalStages || null,
      schema: STRUCTURED_SCHEMA_FRAGMENTS,
      unwrapKey: 'fragments',
      maxAttempts: 2,
      rateLimiter: config.rateLimiter || null,
      budgetEnforce: config.budgetEnforce || false,
      normalizeResult: function (result) {
        return normalizeFragmentBatchResult(result, config.registry);
      },
      validate: function (result) {
        return validateFragmentsStage(result, config.registry, { generationFloors: true });
      },
      buildPrompt: function (retryState) {
        return builders.fragmentBatch(
          config.layerBible,
          config.registry,
          config.batchWeekSummaries,
          config.allWeekSummaries,
          config.priorFragments,
          config.batchIndex,
          config.totalBatches,
          config.shellContext,
          retryState.attempt > 0 ? { retryMode: 'tight' } : undefined
        );
      }
    });
  } catch (err) {
    if (config.registry.length === 1 && shouldRetryStageError(err)) {
      console.warn('[LiftRPG] Falling back to single-fragment recovery after batch failure:', config.label, err.message);
      return await generateSingleFragmentAdaptive(settings, builders, config);
    }
    if (config.registry.length > 1 && shouldRetryStageError(err)) {
      try {
        console.warn('[LiftRPG] Recovering fragment batch deterministically after failure:', config.label, err.message);
        return await recoverFragmentBatchDeterministically(settings, builders, config, err);
      } catch (recoveryErr) {
        err = recoveryErr;
      }
    }
    if (!shouldSplitFragmentBatch(err, config.registry)) throw err;
    console.warn('[LiftRPG] Splitting fragment batch after failure:', config.label, err.message);

    var halves = splitRegistryForRetry(config.registry);
    var leftRegistry = halves[0];
    var rightRegistry = halves[1];
    var leftSummaries = weekSummariesForRegistry(leftRegistry, config.allWeekSummaries, config.batchWeekSummaries);
    var rightSummaries = weekSummariesForRegistry(rightRegistry, config.allWeekSummaries, config.batchWeekSummaries);

    var leftOutput = await generateFragmentBatchAdaptive(settings, builders, {
      layerBible: config.layerBible,
      registry: leftRegistry,
      batchWeekSummaries: leftSummaries,
      allWeekSummaries: config.allWeekSummaries,
      priorFragments: config.priorFragments,
      batchIndex: config.batchIndex,
      totalBatches: config.totalBatches,
      shellContext: config.shellContext,
      label: config.label + 'A',
      stageKey: config.stageKey,
      stageIndex: config.stageIndex,
      onProgress: config.onProgress,
      getTotalStages: config.getTotalStages,
      rateLimiter: config.rateLimiter,
      budgetEnforce: config.budgetEnforce
    });

    var priorForRight = config.priorFragments.concat(leftOutput.fragments || []);
    var rightOutput = await generateFragmentBatchAdaptive(settings, builders, {
      layerBible: config.layerBible,
      registry: rightRegistry,
      batchWeekSummaries: rightSummaries,
      allWeekSummaries: config.allWeekSummaries,
      priorFragments: priorForRight,
      batchIndex: config.batchIndex,
      totalBatches: config.totalBatches,
      shellContext: config.shellContext,
      label: config.label + 'B',
      stageKey: config.stageKey,
      stageIndex: config.stageIndex,
      onProgress: config.onProgress,
      getTotalStages: config.getTotalStages,
      rateLimiter: config.rateLimiter,
      budgetEnforce: config.budgetEnforce
    });

    return { fragments: (leftOutput.fragments || []).concat(rightOutput.fragments || []) };
  }
}

var LAST_API_BOOKLET_STORAGE_KEY = 'liftrpg_last_api_booklet';
var LAST_API_BOOKLET_META_STORAGE_KEY = 'liftrpg_last_api_booklet_meta';

function persistLastBooklet(booklet, meta) {
  if (!booklet || typeof booklet !== 'object') return;

  var savedAt = new Date().toISOString();
  var source = meta && meta.source ? String(meta.source) : '';
  var apiSurface = (typeof window !== 'undefined' && window.LiftRPGAPI) ? window.LiftRPGAPI : null;

  if (apiSurface) {
    apiSurface.lastBooklet = booklet;
    apiSurface.lastBookletSavedAt = savedAt;
    apiSurface.lastBookletSource = source;
  }

  try {
    sessionStorage.setItem(LAST_API_BOOKLET_STORAGE_KEY, JSON.stringify(booklet));
    sessionStorage.setItem(LAST_API_BOOKLET_META_STORAGE_KEY, JSON.stringify({
      savedAt: savedAt,
      source: source,
      title: (((booklet || {}).cover || {}).title || '')
    }));
  } catch (error) {
    console.warn('[LiftRPG] Could not persist recoverable API booklet:', error && error.message ? error.message : error);
  }
}


// ── 10-Stage API Pipeline Orchestrator ────────────────────────────────────────

// ── Composition critic loop (D66): grade → revise → regrade ─────────────────
// Runs AFTER assembly + machine validation + the mechanical quality gate. The
// critic grades the seven compositional dimensions (rubric in prompt_rules.js);
// failing dimensions produce unit-scoped directives; targeted revisions apply
// under two hard floors: identity fields never change, and a revision that
// raises machine-validation errors is reverted. Loops until every dimension
// clears the threshold or the round cap hits. Per D19 severity doctrine the
// loop never blocks delivery — an unfinished booklet ships with its critique
// attached in _criticReport.
// ── The conductor's pass (FUSION.md §4 mechanism 6) ─────────────────────────
// ONE bounded call, never a loop of its own. It runs after assembly and ahead
// of the critic's first round, on both API pipelines, because both reach it
// through runCriticLoop — which is also why the skip logic lives here in one
// place rather than at two call sites.
//
// WHAT IT COSTS AND WHY THAT IS THE POINT. Its input is the score projection
// alone: at twelve weeks, roughly a page. The critic's input is the digest —
// twenty-six to thirty-eight thousand tokens. This pass is the cheapest stage
// in the ladder that can change a book, and it is cheap for the same reason it
// works: a reader shown only the sequence hears the sequence.
//
// SKIPS ARE STATED, NEVER SILENT (the D111 / W4b idiom). A book that declares
// no fusionBeat is not read and says so, which is every fixture in content/ and
// every book generated before W4a. A stage failure degrades the same way: the
// pass is recorded as skipped with the reason, and the critic loop continues
// exactly as it did before this landed. Nothing here may block delivery (D19).
async function runConductorPass(settings, booklet, brief, ctx, stageName) {
  ctx = ctx || {};
  if (settings && settings.conductorPass === false) {
    return { skipped: true, skipReason: 'the conductor\'s pass is disabled in settings' };
  }
  if (typeof window.buildConductorPrompt !== 'function') {
    return { skipped: true, skipReason: 'the conductor prompt builder is unavailable' };
  }
  var score = buildConductorScore(booklet);
  if (score.skipped) return { skipped: true, skipReason: score.skipReason, score: score };
  var scoreBlock = formatConductorScoreBlock(score);
  if (!scoreBlock) return { skipped: true, skipReason: 'the score projection printed nothing', score: score };

  var raw;
  try {
    raw = await runJsonStage(settings, {
      stageKey: 'conductor',
      stageName: stageName || 'The Conductor\'s Pass',
      buildPrompt: (function (block) {
        return function () { return window.buildConductorPrompt(block, brief); };
      })(scoreBlock),
      maxAttempts: 2,
      schema: window.STRUCTURED_SCHEMA_CONDUCTOR || null,
      validate: (function (s) {
        return function (result) { return validateConductorReport(result, s); };
      })(score),
      rateLimiter: ctx.rateLimiter || null,
      budgetEnforce: !!ctx.budgetEnforce,
      onProgress: ctx.onProgress,
      telemetryCollector: ctx.telemetryCollector
    });
  } catch (err) {
    console.warn('[LiftRPG] The conductor\'s pass failed — the critic runs without it:', err.message);
    return { skipped: true, skipReason: 'the stage failed: ' + String((err && err.message) || err), score: score };
  }
  var report = normalizeConductorReport(raw, score);
  console.log('[LiftRPG] ' + conductorSummaryLine(report));
  return report;
}

// Round-one only, and that bound is a ruling rather than an economy. The report
// is a reading of the book AS IT STOOD before any revision; carrying it into
// round two would hand the critic a description of a page the reviser has
// already changed, and would hold fusionPacing open for a defect that may be
// fixed. One pass, one round, then the loop's own instruments take over.
function seedConductorFailures(verdictRaw, conductor) {
  var failures = conductorFailures(conductor);
  if (!failures.length) return 0;
  if (!verdictRaw || typeof verdictRaw !== 'object') return 0;
  var verdict = verdictRaw.verdict;
  if (!verdict || typeof verdict !== 'object') return 0;
  var entry = verdict.fusionPacing;
  if (!entry || typeof entry !== 'object') return 0;
  entry.failures = (Array.isArray(entry.failures) ? entry.failures : []).concat(failures);
  return failures.length;
}

async function runCriticLoop(settings, booklet, brief, ctx) {
  ctx = ctx || {};
  if (settings && settings.criticLoop === false) return null;
  if (ctx.trialMode) return null;
  if (typeof window.buildCriticPrompt !== 'function' || typeof window.buildUnitRevisionPrompt !== 'function') {
    console.warn('[LiftRPG] Critic prompt builders unavailable — skipping critic loop.');
    return null;
  }
  var threshold = (settings && settings.criticThreshold) || CRITIC_SCORE_THRESHOLD;
  var maxRounds = (settings && settings.criticMaxRounds) || CRITIC_MAX_ROUNDS;
  var report = {
    threshold: threshold,
    rounds: [],
    finished: false,
    revisedUnits: 0,
    // Teeth T4: shape surgery is reported as shape surgery. A reader of
    // _criticReport must be able to see that a week's beat was re-decided, not
    // just that "a week was revised" — the two are different operations and the
    // eval reads them differently.
    structuralRevisions: 0
  };
  // FUSION §4 mechanism 6, before the general read. One call, ahead of round
  // one, so its findings are targets in the round that has the most rounds left
  // to act on them.
  var conductor = await runConductorPass(settings, booklet, brief, ctx);
  report.conductor = conductor;
  var revisedAnyWeek = false;
  var meta = booklet.meta || {};
  var contextJson = JSON.stringify({
    storySpine: meta.storySpine || '',
    worldContract: meta.worldContract || '',
    artifactIntent: meta.artifactIntent || null,
    weekCount: (booklet.weeks || []).length
  });

  for (var round = 1; round <= maxRounds; round++) {
    var digestJson = JSON.stringify(buildCriticDigest(booklet));
    // Machine findings (GAP-1): everything the pipeline can MEASURE goes to the
    // critic as fact it must convert into unit-scoped failures — text-budget
    // breaches (fusionPacing), Core Noun Roster drift (worldCohesion),
    // growing-stat discipline and mark-economy taste — clumsy tick labels,
    // dangling sink refs (systemIntegration) — and terminal-position voice
    // tics plus licensed-move placement (voiceDiscipline). Recomputed each
    // round so accepted revisions clear their own findings. Posted-manifest
    // breakage is absent by design: it is a validation ERROR, so it never
    // reaches here.
    var machineFindings = []
      .concat(collectBudgetBreaches(booklet).map(function (b) { return b.message; }))
      .concat(collectNounRosterFindings(booklet))
      .concat(collectPercentileStatFindings(booklet))
      .concat(collectMarkStripFindings(booklet).warnings)
      .concat(collectVoiceTicFindings(booklet).map(function (f) { return f.message; }))
      .concat(collectLicensedMovePlacementFindings(booklet).map(function (f) { return f.message; }))
      // W4b: the simulated player's SOFT half — decision droughts, an
      // immaterial spend spread, a declared stake nothing can take. The hard
      // half never arrives here: soft-locks are stage-gate errors and are
      // already blocking by the time the critic runs. Motif cross-registration
      // rides the same channel (FUSION §6's V/B promotion, WARN-class).
      .concat(simSoftFindings(simulateBook(booklet)))
      .concat(collectMotifCrossRegistrationFindings(booklet))
      .map(function (finding) {
        return typeof finding === 'string' ? finding : String((finding && finding.message) || finding);
      })
      .filter(Boolean);
    // The fusion frame (Teeth T4 — FUSION.md mechanism 6). Rebuilt every round
    // for the same reason the machine findings are: an accepted revision that
    // cut a week's prose moves the curve the next verdict grades against.
    var fusionFrameBlock = formatFusionFrameBlock(buildFusionFrame(booklet));
    // The spine frame (W4b) rides beside it for the same reason and by the same
    // rule: it ABSTAINS rather than printing nulls, so a pre-spine book's
    // prompt is byte-identical to what it was before this landed.
    var spineFrameBlock = formatSpineFrameBlock(buildSpineFrame(booklet));
    // The conductor's read rides beside them in ROUND ONE ONLY — see
    // seedConductorFailures for why a stale reading is worse than none.
    var conductorBlock = round === 1 ? formatConductorReportBlock(conductor) : '';
    var frameBlocks = [fusionFrameBlock, spineFrameBlock, conductorBlock].filter(function (b) {
      return typeof b === 'string' && b.trim();
    }).join('\n\n');
    var verdictRaw;
    try {
      verdictRaw = await runJsonStage(settings, {
        stageKey: 'critic',
        stageName: 'Composition Critic — round ' + round,
        buildPrompt: (function (dj, mf, ff) {
          return function () { return window.buildCriticPrompt(dj, brief, mf, ff); };
        })(digestJson, machineFindings, frameBlocks),
        maxAttempts: 2,
        validate: validateCriticVerdict,
        rateLimiter: ctx.rateLimiter || null,
        budgetEnforce: !!ctx.budgetEnforce,
        onProgress: ctx.onProgress,
        telemetryCollector: ctx.telemetryCollector
      });
    } catch (err) {
      console.warn('[LiftRPG] Critic round ' + round + ' failed — booklet kept as-is:', err.message);
      report.error = String((err && err.message) || err);
      break;
    }
    // THE PRE-SEED. The conductor's findings join the round-one verdict as
    // fusionPacing failures BEFORE normalization, so they earn no privileges:
    // the same validation, the same reopen-scope filtering, the same fail-safe
    // demotion, the same union-by-unit in targeting, and the same three floors
    // at acceptance. The clamp that follows is the evidence law the critic has
    // always run under, applied to a failure the critic did not author.
    var seeded = round === 1 ? seedConductorFailures(verdictRaw, conductor) : 0;
    var verdict = normalizeCriticVerdict(verdictRaw, threshold);
    var summary = summarizeVerdict(verdict);
    var roundRecord = {
      round: round,
      conductorSeeded: seeded,
      scores: summary.byDimension,
      min: summary.min,
      avg: summary.avg,
      summary: verdict.summary,
      revised: [],
      // Refused revisions are part of the honest record: a structural revision
      // the floors sent back is exactly what an author needs to see, and it used
      // to exist only as a console warning nobody reads after the run.
      rejected: []
    };
    report.rounds.push(roundRecord);
    console.log('[LiftRPG] Critic round ' + round + ': min ' + summary.min + ' avg ' + summary.avg, summary.byDimension);

    if (summary.min >= threshold) { report.finished = true; break; }
    if (round === maxRounds) break;

    var targets = selectRevisionTargets(verdict, threshold, CRITIC_MAX_REVISIONS_PER_ROUND);
    if (!targets.length) {
      console.warn('[LiftRPG] Critic named no unit-addressable failures — stopping with critique attached.');
      break;
    }
    var baselineErrors = validateAssembledBooklet(booklet).errors.length;

    for (var ti = 0; ti < targets.length; ti++) {
      var target = targets[ti];
      var original = getUnit(booklet, target.unitType, target.unitRef);
      if (!original) continue;
      var label = unitLabel(target.unitType, target.unitRef);
      var structural = !!target.structural && target.reopen.length > 0;
      // Floor state BEFORE the revision, at the unit's own stage gate. Compared
      // as a delta so a book that was already failing a floor (generated before
      // D111, hand-loaded, or a fixture) can still be improved, while a revision
      // that DROPS a surface is refused. Absolute would veto the whole loop on
      // any pre-existing failure.
      var floorsBefore = unitFloorErrors(target.unitType, original, booklet).length;
      var revised;
      try {
        revised = await runJsonStage(settings, {
          stageKey: 'critic-revise',
          stageName: (structural ? 'Structural Revision — ' : 'Composition Revision — ') + label,
          buildPrompt: (function (lbl, oj, dirs, reopen) {
            return function () { return window.buildUnitRevisionPrompt(lbl, oj, dirs, contextJson, reopen); };
          })(label, JSON.stringify(original), target.directives, structural ? target.reopen : []),
          maxAttempts: 2,
          rateLimiter: ctx.rateLimiter || null,
          budgetEnforce: !!ctx.budgetEnforce,
          telemetryCollector: ctx.telemetryCollector
        });
      } catch (err) {
        console.warn('[LiftRPG] ' + label + ' revision failed — unit kept as-is:', err.message);
        roundRecord.rejected.push({ unit: label, structural: structural, reason: 'stage-error' });
        continue;
      }
      if (!revisionPreservesIdentity(target.unitType, original, revised)) {
        console.warn('[LiftRPG] ' + label + ' revision changed identity fields — rejected.');
        roundRecord.rejected.push({ unit: label, structural: structural, reason: 'identity-floor' });
        continue;
      }
      // Validity floor, part 2 (Teeth T4): the unit's own stage validator, with
      // the generation floors on. The assembled-booklet validator cannot hold
      // this — a booklet with no oracle is legal (fixtures have none), so only
      // the stage gate knows that a GENERATED week owes one. Without it, a
      // reopened mechanical assignment could delete the surface it re-decided.
      var floorsAfter = unitFloorErrors(target.unitType, revised, booklet).length;
      if (floorsAfter > floorsBefore) {
        console.warn('[LiftRPG] ' + label + ' revision dropped generation floors ('
          + floorsBefore + ' → ' + floorsAfter + ') — rejected.');
        roundRecord.rejected.push({ unit: label, structural: structural, reason: 'generation-floor' });
        continue;
      }
      // Validity floor, part 3 (W3 corrective wave, F06): the schema-filtered
      // key diff. Checked BEFORE setUnit rather than reverted after it — the
      // comparison needs only the two units, and a floor that never touches the
      // booklet cannot leave it half-revised. The outcome is the one the revert
      // produced: the unit stands as it was, and the refusal is on the record.
      var inventedKeys = revisionInventsKeys(target.unitType, original, revised);
      if (inventedKeys.length) {
        console.warn('[LiftRPG] ' + label + ' revision invented ' + inventedKeys.length
          + ' key(s) the schema rejects (' + inventedKeys.join(', ') + ') — rejected.');
        roundRecord.rejected.push({ unit: label, structural: structural,
          reason: 'key-invention-floor', invented: inventedKeys.slice() });
        continue;
      }
      var slot = setUnit(booklet, target.unitType, target.unitRef, revised);
      if (!slot) continue;
      var postErrors = validateAssembledBooklet(booklet).errors.length;
      if (postErrors > baselineErrors) {
        // Validity floor: a revision may never make the booklet less valid.
        setUnit(booklet, target.unitType, target.unitRef, slot.previous);
        console.warn('[LiftRPG] ' + label + ' revision raised validation errors ('
          + baselineErrors + ' → ' + postErrors + ') — reverted.');
        roundRecord.rejected.push({ unit: label, structural: structural, reason: 'validity-floor' });
        continue;
      }
      report.revisedUnits += 1;
      if (structural) report.structuralRevisions += 1;
      if (target.unitType === 'week') revisedAnyWeek = true;
      roundRecord.revised.push({
        unit: label,
        dimensions: target.dimensions,
        directives: target.directives.length,
        structural: structural,
        reopened: structural ? target.reopen.slice() : []
      });
    }
    if (!roundRecord.revised.length) {
      console.warn('[LiftRPG] Critic round ' + round + ': no revision survived the floors — stopping.');
      break;
    }
  }

  // THE RE-READ. One more bounded call, and only when a WEEK actually changed —
  // the conductor reads a per-week sequence, so a revised fragment or ending
  // moves nothing it can hear. It changes no decision: the loop is over and the
  // booklet ships either way (D19). What it produces is the honest record the
  // two-book evidence needs — did the surgery move the curve, or did the book
  // come out the other side phrased exactly as it went in? A flatness finding
  // that survives its own revision is the strongest signal this system can
  // emit, and without the second read it is indistinguishable from success.
  if (!conductor.skipped && revisedAnyWeek && !(settings && settings.conductorReread === false)) {
    report.conductorReread = await runConductorPass(
      settings, booklet, brief, ctx, 'The Conductor\'s Pass — re-read');
  }

  if (report.rounds.length) {
    var last = report.rounds[report.rounds.length - 1];
    report.finalScores = last.scores;
    report.finalMin = last.min;
    report.finalAvg = last.avg;
  }
  writePipelineDebris(booklet, '_criticReport', report);
  if (!report.finished) {
    console.warn('[LiftRPG] Critic loop ended below threshold ' + threshold
      + ' — delivering with critique attached (quality heuristics warn, never block — D19).');
  }
  return report;
}

// ── The knowing stage (§11 Wave 1.5) ────────────────────────────────────────
// Both pipelines run the same stage against the same surface: the compiler
// stage's output (skeleton in Skeleton+Flesh, shell in multi-stage/structured)
// carries `meta`, and the knowing is written back onto that same `meta`.
//
// Writing it back — rather than carrying it in a parallel variable — is what
// makes it flow for free through everything already keyed on meta:
// extractShellContext (multi-stage prose prompts), extractSkeletonContext
// (S+F prose prompts), and the assemblers. One assignment, three consumers.
//
// The knowing stage is checkpointed on its own key, so the compiler stage's
// checkpoint (saved BEFORE this ran) never carries particulars. Resume
// therefore re-applies them here from the knowing checkpoint. The merge is
// idempotent for exactly that reason.
// ── The rulebook's plumbing (VISION §4.0, D173) ─────────────────────────────
// The rudder is authored before anything else and then has to reach two places:
// the stages that must SERVE it (through their prompt builders, as a GIVEN) and
// the finished artifact (so a reader, the bench and the auditor can see what
// game this book was designed to be). This is the second half.
//
// Stamped onto the compiler stage's `meta` exactly the way the knowing is,
// because that object BECOMES `booklet.meta` — no new assembly seam, no new
// checkpoint key, and a booklet whose rulebook stage never ran is byte-identical
// to one built before this existed.
function applyGameRulebook(target, rulebookOutput) {
  if (!target || !rulebookOutput) return null;
  var rulebook = rulebookOutput.gameRulebook;
  if (!rulebook || typeof rulebook !== 'object' || Array.isArray(rulebook)) return null;
  target.meta = target.meta || {};
  target.meta.gameRulebook = rulebook;
  return rulebook;
}

// Freeform providers return the payload one level flatter than asked often
// enough that the knowing stage already carries this exact repair. Same shape
// mistake, same answer: rewrap rather than spend a call to be told the same
// thing again. Anchored on the four questions a bare payload would show at its
// root, never on one — a single key is a coincidence, four is a shape.
function normalizeGameRulebookShape(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return result;
  if (result.gameRulebook) return result;
  var KEYS = ['winCondition', 'coreVerbs', 'economy', 'passwordPath',
    'sessionShape', 'weekShape', 'whatGoesBadly', 'teachingOrder'];
  var present = KEYS.filter(function (k) { return result[k] && typeof result[k] === 'object'; });
  if (present.length < 4) return result;
  console.warn('[LiftRPG] Game rulebook stage returned a bare document — rewrapping');
  var wrapped = {};
  KEYS.forEach(function (k) { if (result[k] !== undefined) wrapped[k] = result[k]; });
  if (Array.isArray(result.unprintableWants)) wrapped.unprintableWants = result.unprintableWants;
  return { gameRulebook: wrapped };
}

// One-line run-log summary. The operator's question about this stage is "what
// game did it decide on", and the currency plus the verbs answer it in one
// line — the two declarations every later stage is held to.
function describeGameRulebook(rulebook) {
  if (!rulebook) return 'no game rulebook authored';
  var currency = String(((rulebook.economy || {}).currency) || '').trim();
  var verbs = ((rulebook.coreVerbs || {}).verbs) || [];
  var verbList = (Array.isArray(verbs) ? verbs : []).map(function (v) {
    return String((v || {}).verb || '').trim();
  }).filter(Boolean);
  var parts = [];
  if (currency) parts.push('currency "' + currency + '"');
  if (verbList.length) parts.push('verbs: ' + verbList.join(', '));
  var wants = rulebook.unprintableWants;
  if (Array.isArray(wants) && wants.length) parts.push(wants.length + ' declared unprintable want(s)');
  return parts.length ? 'Game rulebook: ' + parts.join('; ') + '.' : 'game rulebook authored (no declarations)';
}

// THE EARLIEST BANKED SEED CARRIER (D101/D143, extended by D173).
//
// The seed used to ride the COMPILER stage alone, because the compiler was the
// first stage that could carry one. The rulebook now runs before it, and that
// moves the hazard rather than removing it: a run that banks the rulebook and
// dies before the shell would, on resume, find no compiler stage, draw a FRESH
// seed, and hand the shell a different world from the one the banked rulebook
// was designed for. Nothing would throw — the run would simply build a book
// whose rules and whose identity came from two different draws.
//
// Varargs in RUN ORDER; the first stage actually present wins, and "present
// with no seed" is still a real answer (resolveRunSeed's own distinction).
function earliestSeedCarrier() {
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i]) return arguments[i];
  }
  return null;
}

function applyProcessParticulars(target, knowingOutput) {
  if (!target || !knowingOutput) return null;
  var particulars = knowingOutput.processParticulars;
  if (!particulars || typeof particulars !== 'object' || Array.isArray(particulars)) return null;
  target.meta = target.meta || {};
  target.meta.processParticulars = particulars;
  return particulars;
}

// Freeform providers reliably return the payload one level flatter than asked
// (the four category arrays at the root, with no `processParticulars` wrapper).
// That is a shape mistake, not a content one — retrying it buys a second call
// and the same answer. Rewrap instead, exactly like the week stage unwraps a
// weeks[] wrapper it never asked for.
function normalizeKnowingShape(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return result;
  if (result.processParticulars) return result;
  var CATEGORIES = ['instruments', 'paperworkRealities', 'orderOfOperations', 'periodSpecifics'];
  var bare = CATEGORIES.some(function (k) { return Array.isArray(result[k]); });
  if (!bare) return result;
  console.warn('[LiftRPG] Knowing stage returned bare particulars — rewrapping');
  var wrapped = {};
  CATEGORIES.forEach(function (k) { if (Array.isArray(result[k])) wrapped[k] = result[k]; });
  return { processParticulars: wrapped };
}

// One-line run-log summary. Counting is the honest report here: the operator's
// question about this stage is "did it author anything", and a category list
// with counts answers it without printing the world back at them.
function describeProcessParticulars(particulars) {
  if (!particulars) return 'no process particulars authored';
  var parts = [];
  ['instruments', 'paperworkRealities', 'orderOfOperations', 'periodSpecifics'].forEach(function (key) {
    var list = particulars[key];
    if (Array.isArray(list) && list.length) parts.push(key + ' ' + list.length);
  });
  return parts.length ? 'World detail: ' + parts.join(', ') + '.' : 'no process particulars authored';
}

async function runApiPipeline(options) {
  if (typeof window.beginLiftRpgPromptRun === 'function') window.beginLiftRpgPromptRun();

  var settings = options.settings || {};
  var builders = getApiPromptBuilders();
  assertApiPromptBuilders(builders);

  var workout = options.workout || '';
  var brief = options.brief || '';
  var weekCount = options.weekCount || (typeof window.parseWeekCount === 'function' ? window.parseWeekCount(workout) : 6);
  var totalSessions = options.totalSessions || 0;
  // RUN IDENTITY. What the user gave, before any formatting or canonicalization
  // this pipeline applies to it — see runCanonicalizeStage(). Defaulting to
  // `workout` keeps every checkpoint written before Wave 5 resumable: on the
  // paste path the two values are the same string, so the fingerprint does not
  // move for any run that existed before canonicalization did.
  var rawWorkout = options.rawWorkout !== undefined && options.rawWorkout !== null
    ? options.rawWorkout
    : workout;

  // Initial estimation: 5 setup (rulebook, codex, campaign, shell, knowing)
  // + weekCount (single-stage per week) + endings. The rulebook joined the
  // count in the same change that added the stage — a rail that draws one more
  // card than the counter knows about is the D110 UI lie in miniature.
  var totalStages = 5 + weekCount + 2;
  var stageNum = 0;
  var onProgress = options.onProgress;

  // ── Checkpoint: resume from last completed stage if available ────
  // Wired before the resume decision so storage-degradation and set-aside
  // warnings reach the operator through the run log.
  wireCheckpointNotices(onProgress, function () { return stageNum; }, function () { return totalStages; });

  // The pipeline label is part of the run identity: multi-stage and structured
  // share this orchestrator but format the workout differently and assemble
  // differently, so their stage outputs are not interchangeable. Before Wave A.1
  // both wrote the tag 'structured' and silently resumed into each other.
  var pipelineLabel = options.pipelineLabel || 'structured';
  var resumeState = resumeCheckpointForRun({
    workout: rawWorkout,
    brief: brief,
    model: settings.model,
    provider: detectProviderId(settings),
    pipeline: pipelineLabel
  });
  var checkpoint = resumeState.checkpoint;
  var resumed = resumeState.resumed;

  // ── Cross-stage repair: drop the owning stage from the bank (D143) ────
  // The router already pruned storage; this is the in-process half, and it is
  // the load-bearing one. A persist that silently failed (quota, private mode)
  // must never resurrect the stage this run exists to rewrite — that would
  // spend a whole replay to arrive back at the identical defect.
  var repairState = options._repairState || null;
  var repairPending = (repairState && repairState.pending) || null;
  // THE SEED SURVIVES THE REPAIR. Dropping the compiler stage would otherwise
  // send resolveRunSeed down its fresh-draw branch, and the re-entered stage
  // would build a DIFFERENT WORLD from the layerBible and campaignPlan still
  // banked beside it — D101's law exactly ("a builder that draws its own hands
  // every retry a different world"), and silent. `undefined` means no prune
  // happened; `null` is a real answer carried forward, because a stage written
  // with no seed must be repaired with no seed.
  var repairSeedCarry;
  if (options._repairPrune && checkpoint && checkpoint.stages) {
    options._repairPrune.forEach(function (key) {
      if (checkpoint.stages[key] !== undefined) {
        var dropped = checkpoint.stages[key];
        repairSeedCarry = repairSeedFromStage(dropped);
        delete checkpoint.stages[key];
        resumed = Math.max(0, resumed - 1);
      }
    });
  }
  function repairDirectiveFor(stageKey) {
    return (repairPending && repairPending.to === stageKey) ? repairPending.directive : '';
  }

  // ── The run seed, resolved before the first stage (the fourth-referee wave) ─
  // It used to be resolved two stages in, immediately above the shell call,
  // which was fine while its only consumer was the shell prompt. It has two
  // more now: the identity assignments every compiler stage is handed, and the
  // design bias — which is derived inside EVERY builder, including the two that
  // run before the shell. A seed resolved late would leave those two builders
  // drawing from a different source than the rest of the run, which is the
  // within-run incoherence the draw-once seam exists to prevent (D101).
  // EARLIEST BANKED CARRIER, not the compiler stage (D173). The rulebook now
  // runs before the shell, so a resume that finds a banked rulebook and no
  // shell must reuse the rulebook's seed — otherwise the shell is built from a
  // fresh draw against a rulebook designed under the old one, and nothing
  // throws. See earliestSeedCarrier().
  var divergenceSeed = resolveRepairAwareSeed(repairSeedCarry,
    earliestSeedCarrier(
      (checkpoint && checkpoint.stages && checkpoint.stages.gameRulebook) || null,
      (checkpoint && checkpoint.stages && checkpoint.stages.shell) || null
    ), brief);
  // The assignments are a pure function of the seed, so a resume and a repair
  // recover the SAME ones with the stage they shaped — no second key on the
  // checkpoint, and nothing to keep in sync (D98's four touchpoints stay four).
  var seedAssignments = drawSeedAssignments(divergenceSeed && divergenceSeed.value);
  adoptRunSeedSalt(divergenceSeed);

  if (resumed > 0) {
    var resumeLine = describeResume(resumeState);
    console.log('[LiftRPG] ' + resumeLine);
    emitPipelineEvent(onProgress, stageNum, totalStages, resumeLine, {
      phase: 'start',
      stageKey: '',
      stageName: 'Checkpoint',
      noticeLevel: 'info',
      restoredStages: resumeState.restoredStages,
      priorSpend: resumeState.priorSpend
    });
  }

  // ── Rate limiter + daily budget ──────────────────────────────────────
  var useGeminiBudget = isGeminiProvider(settings);
  var rateLimiter = useGeminiBudget ? createRateLimiter(RATE_MAX_CALLS, RATE_WINDOW_MS) : null;

  // Pre-flight budget check
  if (useGeminiBudget) {
    var budgetWarning = checkDailyBudget(settings, weekCount);
    if (budgetWarning) {
      var msg = 'This booklet needs ~' + budgetWarning.estimated + ' API calls. ' +
        'You have ' + budgetWarning.remaining + ' remaining today (Gemini free tier: ' +
        budgetWarning.limit + '/day). You can start now and resume from checkpoint tomorrow, ' +
        'or switch to a paid API key.';
      if (options.onStatus) options.onStatus(msg);
      console.warn('[LiftRPG] ' + msg);
      // The UI drives these pipelines with an onProgress function and no
      // options.onStatus, so the budget warning also rides the notice channel —
      // otherwise the one message that tells the user they can stop and resume
      // tomorrow never reaches them.
      emitPipelineEvent(onProgress, stageNum, totalStages, msg, {
        phase: 'start',
        stageKey: '',
        stageName: 'Budget',
        noticeLevel: 'warn'
      });
      // Don't block — checkpoint resume makes partial runs viable
    }
  }

  function progress(stageKey, message) {
    stageNum++;
    emitPipelineEvent(onProgress, stageNum, totalStages, message, {
      phase: 'start',
      stageKey: stageKey || '',
      stageName: message
    });
  }

  // ── STAGE 0: canonicalize the program (§11 Wave 5) ───────────────────
  // Before anything reads the workout, because every later stage receives it
  // through `workout` and the topology digest reads the normalized object.
  var canonState = await runCanonicalizeStage(settings, buildCanonicalizeConfig({
    rawWorkout: rawWorkout,
    checkpoint: checkpoint,
    onProgress: onProgress,
    rateLimiter: rateLimiter,
    budgetEnforce: useGeminiBudget,
    trialMode: !!(options.trialMode || settings.trialMode),
    bumpStage: function () { return ++stageNum; },
    bumpTotal: function () { totalStages++; },
    getTotalStages: function () { return totalStages; }
  }));
  checkpoint = canonState.checkpoint;
  if (canonState.applied) {
    // The user's requested length owns the book; a shorter template cycles to
    // fill it (resolveCanonicalBookLength). Before W3 this line read
    // `weekCount = canonState.nw.weekCount` and a one-week rotating template
    // produced a one-week booklet.
    var canonWeeks = resolveCanonicalBookLength(canonState, weekCount, onProgress,
      function () { return totalStages; });
    workout = formatNormalizedForPrompt(canonState.nw);
    if (canonWeeks) {
      totalStages += (canonWeeks - weekCount);
      weekCount = canonWeeks;
    }
    // The shell validator checks its declared session count against this. On
    // the paste path it has always been 0 (the raw branch counts no sessions),
    // so the check was inert; canonicalization is the first thing that can
    // give it a real number to hold the shell to.
    var canonSessions = 0;
    (canonState.nw.weeks || []).forEach(function (w) {
      canonSessions += (w.sessions ? w.sessions.length : 0);
    });
    if (canonSessions > 0) totalSessions = canonSessions;
  }
  var workoutLifecycle = describeWorkoutLifecycle(canonState);

  // ── STAGE 0.5: THE GAME RULEBOOK (VISION §4.0, D173) ─────────────────
  // Before the codex, before the plan, before anything. See
  // runGameRulebookStage for why FIRST is the ruling and not a convenience.
  var rulebookState = await runGameRulebookStage(settings, {
    cached: (checkpoint && checkpoint.stages && checkpoint.stages.gameRulebook) || null,
    checkpoint: checkpoint,
    onProgress: onProgress,
    rateLimiter: rateLimiter,
    budgetEnforce: useGeminiBudget,
    trialMode: !!(options.trialMode || settings.trialMode),
    divergenceSeed: divergenceSeed,
    repairDirective: repairDirectiveFor('gameRulebook'),
    progress: progress,
    getStageIndex: function () { return stageNum; },
    getTotalStages: function () { return totalStages; },
    emitRestored: function () {
      stageNum++;
      console.log('[LiftRPG] Resumed: Game Rulebook (cached)');
      emitPipelineEvent(onProgress, stageNum, totalStages, 'Game rulebook restored from checkpoint.', {
        phase: 'complete',
        stageKey: 'gameRulebook',
        stageName: 'Game Rulebook',
        completionSource: 'checkpoint'
      });
    },
    buildPrompt: function (retryState) {
      return builders.gameRulebook(workout, brief, {
        retryMode: retryState.attempt > 0,
        weekCount: weekCount,
        divergenceSeed: divergenceSeed
      });
    }
  });
  checkpoint = rulebookState.checkpoint;
  var gameRulebook = (rulebookState.rulebook || {}).gameRulebook || null;
  console.log('[LiftRPG] ' + describeGameRulebook(gameRulebook));

  // ── STAGES 1, 2, 3 (Shell Setup) ──────────────────────────
  // Each stage checks for a cached checkpoint before calling the API.

  var layerBible;
  if (checkpoint && checkpoint.stages && checkpoint.stages.layerBible) {
    layerBible = checkpoint.stages.layerBible;
    stageNum++;
    console.log('[LiftRPG] Resumed: Layer Codex (cached)');
    emitPipelineEvent(onProgress, stageNum, totalStages, 'Layer codex restored from checkpoint.', {
      phase: 'complete',
      stageKey: 'layerBible',
      stageName: 'Layer Codex',
      completionSource: 'checkpoint'
    });
  } else {
    progress('layerBible', 'Building layer codex\u2026');
    layerBible = await runJsonStage(settings, {
      stageKey: 'layerBible',
      stageName: 'Layer Codex',
      stageIndex: stageNum,
      completeMessage: 'Layer codex complete.',
      onProgress: onProgress,
      getTotalStages: function () { return totalStages; },
      schema: STRUCTURED_SCHEMA_BIBLE,
      maxAttempts: 2,
      rateLimiter: rateLimiter,
      budgetEnforce: useGeminiBudget,
      validate: validateLayerBibleStage,
      buildPrompt: function (retryState) { return builders.stage1(workout, brief, retryState.attempt > 0 ? { retryMode: 'tight' } : undefined); }
    });
    checkpoint = saveCheckpoint('layerBible', layerBible, checkpoint);
  }

  var campaignPlan;
  if (checkpoint && checkpoint.stages && checkpoint.stages.campaignPlan) {
    campaignPlan = checkpoint.stages.campaignPlan;
    stageNum++;
    console.log('[LiftRPG] Resumed: Story Plan (cached)');
    emitPipelineEvent(onProgress, stageNum, totalStages, 'Story plan restored from checkpoint.', {
      phase: 'complete',
      stageKey: 'campaign',
      stageName: 'Story Plan',
      completionSource: 'checkpoint'
    });
  } else {
    progress('campaign', 'Planning story\u2026');
    campaignPlan = await runJsonStage(settings, {
      stageKey: 'campaign',
      stageName: 'Story Plan',
      stageIndex: stageNum,
      completeMessage: 'Story plan complete.',
      onProgress: onProgress,
      getTotalStages: function () { return totalStages; },
      schema: STRUCTURED_SCHEMA_CAMPAIGN,
      normalizeResult: normalizeCampaignPlanOwnership,
      maxAttempts: 2,
      rateLimiter: rateLimiter,
      budgetEnforce: useGeminiBudget,
      // generationFloors turns on the cipher-variety floor (F5). Passed here
      // and nowhere else: the guided-build harness and the manual API replay
      // hand-built plans and owe no generation policy (see floorsOn in
      // validation.js).
      validate: function (result) {
        // seedAssignments rides the gate for exactly the axis this stage was
        // SHOWN (identityAxesForStage('campaign-plan')): a stage checked
        // against an assignment its prompt never carried is the derived-or-
        // strict trap, and this is the same object the builder below is handed.
        return validateCampaignPlanStage(result, {
          generationFloors: true,
          seedAssignments: seedAssignments
        });
      },
      buildPrompt: function (retryState) {
        if (!retryState || !retryState.attempt) {
          // The pipeline's resolved book length, not the builder's own parse.
          // See generateApiStage2Prompt: parseWeekCount clamps to 4-12 and the
          // pipeline does not, so a longer canonical program was planned short.
          return builders.stage2(workout, brief, layerBible, {
            weekCount: weekCount,
            // The board geometry's GIVEN: this stage declares
            // `topology.mainMapType` and every later week reuses it (D144 W-2).
            seedAssignments: seedAssignments,
            // The legal fragment documentType menu rides the call (D153
            // follow-on) — generator.js is a classic script that cannot
            // import contract-constants, and a quoted copy there would be
            // the drift the one-home law exists to prevent. Passing the
            // enum at call time keeps the single home by construction.
            documentTypeMenu: DOCUMENT_TYPE_ENUM,
            identityAxes: identityAxesForStage('campaign-plan')
          });
        }
        return buildCompactCampaignRetryPrompt(workout, brief, layerBible, retryState, { weekCount: weekCount });
      }
    });
    checkpoint = saveCheckpoint('campaignPlan', campaignPlan, checkpoint);
  }

  if (!Array.isArray(campaignPlan.fragmentRegistry)) campaignPlan.fragmentRegistry = [];
  if (!Array.isArray(campaignPlan.overflowRegistry)) campaignPlan.overflowRegistry = [];

  // ── The planned week shapes (D143) ───────────────────────────────────
  // ONE derivation, two readers: the shell gate's pre-flight (which holds the
  // spine to the doors these weeks will owe) and the week loop's floor options
  // (which holds each week to the same obligation as it lands). Deriving it
  // twice is how the two gates would come to disagree about who owes a door,
  // and a pre-flight that disagreed with the gate it protects would be worse
  // than none — it would block plans the week gate would have accepted.
  var plannedWeekShapes = derivePlannedWeekShapes(workout, campaignPlan, weekCount);

  // The divergence seed for this run was resolved at the top of the pipeline
  // (see the block above repairDirectiveFor) — from the cached compiler stage
  // when resuming, drawn exactly once otherwise. See resolveRunSeed.

  var shell;
  if (checkpoint && checkpoint.stages && checkpoint.stages.shell) {
    shell = checkpoint.stages.shell;
    stageNum++;
    console.log('[LiftRPG] Resumed: Booklet Setup (cached)');
    emitPipelineEvent(onProgress, stageNum, totalStages, 'Booklet setup restored from checkpoint.', {
      phase: 'complete',
      stageKey: 'shell',
      stageName: 'Booklet Setup',
      completionSource: 'checkpoint'
    });
  } else {
    progress('shell', 'Building booklet setup\u2026');
    shell = await runJsonStage(settings, {
      stageKey: 'shell',
      stageName: 'Booklet Setup',
      stageIndex: stageNum,
      completeMessage: 'Booklet setup complete.',
      onProgress: onProgress,
      getTotalStages: function () { return totalStages; },
      schema: withPlaySpine(STRUCTURED_SCHEMA_SHELL),
      unwrapKey: 'meta',
      // NO maxAttempts literal here: this stage's attempt count is a ladder row
      // (STAGE_BUDGETS.shell.attempts), read through stageBudget() like its
      // tokens and its timeout.
      rateLimiter: rateLimiter,
      budgetEnforce: useGeminiBudget,
      normalizeResult: function (result) {
        if (result && result.meta && Array.isArray(result.weeks)) {
          delete result.weeks; delete result.fragments; delete result.endings;
        }
        if (result && result.meta && !('passwordEncryptedEnding' in result.meta)) {
          result.meta.passwordEncryptedEnding = '';
        }
        normalizeShellShape(result);
        return result;
      },
      autoRepair: function (result) {
        normalizeShellShape(result);
        if (result && result.theme && result.theme.visualArchetype) {
          result.theme.visualArchetype = normalizeThemeArchetype(result.theme.visualArchetype);
        }
        return result;
      },
      repairDirective: repairDirectiveFor('shell'),
      validate: function(result) {
        var v = validateShellSchema(result, {
          weekCount: weekCount,
          totalSessions: totalSessions,
          generationFloors: true,  // F2: componentDialect is declared here or nowhere
          // D144: the unearned-packet arm of artifactIntentFloorErrors needs the
          // brief to ask whether an institution was ever in it.
          brief: brief,
          // D148: the obedience floor's evidence. The SAME map the builder was
          // handed above — one draw per run, shown and checked, so the gate can
          // never demand a value the prompt did not carry.
          seedAssignments: seedAssignments,
          // ── The earliest-stage pre-flight's inputs (D143) ──
          // The campaign plan ran two stages ago and the program is on the
          // desk; between them they know which weeks will owe a door and which
          // week each fragment lands in. That is everything the spine can be
          // held to before a single week is written.
          plannedWeeks: plannedWeekShapes,
          fragmentRegistry: campaignPlan.fragmentRegistry,
          // D173 — the rulebook⇄spine parity floor's evidence. THE SAME object
          // the builder below is handed, so the gate can never demand a
          // projection of a document the prompt did not carry.
          gameRulebook: gameRulebook
        });
        if (!v.valid) {
          return 'Shell schema validation: ' + v.errors.join('; ');
        }
        if (result && result.weeks) { delete result.weeks; }
        if (result && result.fragments) { delete result.fragments; }
        if (result && result.endings) { delete result.endings; }
        return '';
      },
      buildPrompt: function (retryState) {
        return builders.shell(brief, layerBible, campaignPlan, {
          retryMode: retryState.attempt > 0 ? 'tight' : undefined,
          // The compiler stage needs the program to derive its topology digest;
          // this builder's signature never carried it.
          workout: workout,
          // Passing the run's seed is what makes retries reuse it instead of
          // drawing a fresh world on attempt 2.
          divergenceSeed: divergenceSeed,
          // The GIVENS this seat owes an answer for. Same slice the obedience
          // floor below reads, from one accessor, because a stage checked
          // against axes it was never shown is the derived-or-strict trap.
          seedAssignments: seedAssignments,
          identityAxes: identityAxesForStage('shell'),
          // The door GIVENS. THE SAME derivation the validate() above is
          // checked against, one line up — the prompt and the floor read one
          // array or they form different opinions about who owes a door, which
          // is the two-algorithms defect this pipeline has paid for once
          // already (D93). Deliberately NOT the topology digest's "lighter
          // weeks" line: that is a second, independent deload heuristic.
          plannedWeekShapes: plannedWeekShapes,
          // THE RULEBOOK (D173). This seat authors the spine — the rulebook's
          // projection — and `rulesSpread`, which prints its point-of-use
          // subset. Shown here and checked one block up, one object.
          gameRulebook: gameRulebook
        });
      }
    });
    recordSeedOnStage(shell, divergenceSeed);
    checkpoint = saveCheckpoint('shell', shell, checkpoint);

    // ── Downstream sweep after a cross-stage repair (D143) ─────────────
    // The shell has just been rewritten. Weeks already banked were written
    // against the old one, so each is re-asked its own gate against the new
    // spine — and only the ones that ACTUALLY fail are dropped. A blanket
    // invalidation here would discard paid work for a defect it may not have.
    if (repairPending && repairPending.to === 'shell') {
      var staleWeeks = sweepStaleBankedWeeks(checkpoint, {
        weekCount: weekCount,
        upstream: shell,
        plannedWeekShapes: plannedWeekShapes,
        spineStageLabel: 'Shell'
      });
      if (staleWeeks.length) {
        staleWeeks.forEach(function (key) { delete checkpoint.stages[key]; });
        checkpoint = pruneCheckpointStages(checkpoint, staleWeeks);
        var sweptLine = 'Repair swept ' + staleWeeks.length + ' banked week(s) that no longer satisfy the'
          + ' corrected setup: ' + staleWeeks.join(', ') + '. Everything else stays banked.';
        console.warn('[LiftRPG] ' + sweptLine);
        emitPipelineEvent(onProgress, stageNum, totalStages, sweptLine, {
          phase: 'start', stageKey: 'shell', stageName: 'Booklet Setup', noticeLevel: 'warn'
        });
      }
    }
  }

  // THE RULEBOOK REACHES THE ARTIFACT (D173). Stamped after the shell exists —
  // from the checkpoint or from the call — because `shell.meta` becomes
  // `booklet.meta`, exactly the way the knowing is applied below. Outside the
  // `else` on purpose: a RESUMED shell must carry it too, or a resumed book
  // ships with no record of the game it was designed to be.
  applyGameRulebook(shell, rulebookState.rulebook);

  var identityContract = buildIdentityContract(shell, campaignPlan);

  // ── THE KNOWING: process particulars (§11 Wave 1.5) ───────────
  // After the shell (which authors the roster and the recorded reading) and
  // before extractShellContext, because that projection is how every prose
  // stage downstream receives this world.
  //
  // Deliberately NOT part of the identity contract: the contract exists to
  // catch shell identity DRIFT in generated weeks, and the particulars are
  // authored after it is built. They are material, not a promise to keep.

  var knowingOutput;
  if (checkpoint && checkpoint.stages && checkpoint.stages.knowing) {
    knowingOutput = checkpoint.stages.knowing;
    stageNum++;
    console.log('[LiftRPG] Resumed: World Detail (cached)');
    emitPipelineEvent(onProgress, stageNum, totalStages, 'World detail restored from checkpoint.', {
      phase: 'complete',
      stageKey: 'knowing',
      stageName: 'World Detail',
      completionSource: 'checkpoint'
    });
  } else {
    progress('knowing', 'Working out how this world runs…');
    knowingOutput = await runJsonStage(settings, {
      stageKey: 'knowing',
      stageName: 'World Detail',
      stageIndex: stageNum,
      completeMessage: 'World detail complete.',
      onProgress: onProgress,
      getTotalStages: function () { return totalStages; },
      schema: window.STRUCTURED_SCHEMA_KNOWING || null,
      maxAttempts: 2,
      rateLimiter: rateLimiter,
      budgetEnforce: useGeminiBudget,
      normalizeResult: normalizeKnowingShape,
      validate: function (result) {
        return validateKnowingStage(result);
      },
      buildPrompt: function (retryState) {
        return builders.knowing(shell, brief, { retryMode: retryState.attempt > 0 });
      }
    });
    checkpoint = saveCheckpoint('knowing', knowingOutput, checkpoint);
  }

  var msParticulars = applyProcessParticulars(shell, knowingOutput);
  console.log('[LiftRPG] ' + describeProcessParticulars(msParticulars));

  var shellContext = extractShellContext(shell);

  // ── PROMPT CACHING ────────────────────────────────────────────
  // Capability lookup, not a format check: any transport advertising
  // systemPromptCaching gets the cacheable prefix.
  if (transportSupports(settings, 'systemPromptCaching')) {
    settings._systemPrompt = [
      'You are generating components of a LiftRPG print-and-play booklet.',
      'World contract: ' + (shellContext.worldContract || ''),
      'Identity contract: ' + JSON.stringify(identityContract),
      'Layer codex premise: ' + ((layerBible.storyLayer || {}).premise || ''),
      'Return valid JSON only. No markdown fences, no commentary.'
    ].join('\n');
  }

  // ── The arsenal's week schedule (D170) ────────────────────────────────────
  // Derived once, from the spine the shell just declared and the SAME week
  // shapes the door givens are built from. Two readers below: the week prompt's
  // GIVEN block and the week gate's `owesLudicEntry`. Re-deriving on either
  // side would put the grid in one week and demand it in another (D93/D166).
  var ludicWeekAssignments = deriveLudicWeekAssignments(
    ((shell || {}).meta || {}).playSpine,
    plannedWeekShapes
  );

  // ── TARGETED UNIT GENERATION: WEEKS ──────────────────────────
  var finalWeeks = [];
  var allComponentValues = [];

  for (var w = 1; w <= weekCount; w++) {
    var isBossWeek = w === weekCount;
    var weekCacheKey = 'week_' + w;

    if (checkpoint && checkpoint.stages && checkpoint.stages[weekCacheKey]) {
      var cachedWeek = checkpoint.stages[weekCacheKey];
      finalWeeks.push(cachedWeek);
      if (!cachedWeek.isBossWeek && cachedWeek.weeklyComponent && cachedWeek.weeklyComponent.value) {
        allComponentValues.push(cachedWeek.weeklyComponent.value);
      }
      stageNum++;
      console.log('[LiftRPG] Resumed: Week ' + w + ' (cached)');
      emitPipelineEvent(onProgress, stageNum, totalStages, 'Week ' + w + ' restored from checkpoint.', {
        phase: 'complete',
        stageKey: 'weeks',
        stageName: 'Week ' + w,
        completionSource: 'checkpoint'
      });
      continue;
    }

    var continuityPacket = buildChunkContinuity(finalWeeks);
    var campaignWeekPlan = (campaignPlan.weeks || []).filter(function (pw) {
      return Number(pw.weekNumber) === w;
    })[0] || { weekNumber: w };

    // ── Generation-floor context (Teeth Round T1a) ────────────────────────
    // The floors need two facts the week output cannot supply about itself.
    //
    // DELOAD: the multi-stage campaign plan carries no isDeload field at all
    // (STRUCTURED_SCHEMA_CAMPAIGN's week items have no such property), so the
    // only honest source is the program's own text. looksLikeDeloadWeek reads
    // the DECLARED marker only — a week that dips in volume without saying so
    // is NOT excused, because the floors must fail toward demanding content.
    //
    // FAMILY: the compiler runs on the shell stage in this pipeline, so the
    // grammar family lives at shell.meta.artifactIntent — the same place
    // assembly.js reads it. Absent family = removed signal: isDoorLeaningFamily
    // answers false and the door floor simply does not apply.
    // Both facts now come from derivePlannedWeekShapes, computed once above the
    // shell gate so the pre-flight there and this gate hold the same week to
    // the same obligation (D143). The derivation itself is unchanged.
    var weekShape = plannedWeekShapes[w - 1] || { weekNumber: w, isBoss: isBossWeek, isDeload: false };
    // The arsenal row this week owes (D170). Derived ONCE above the loop from
    // the shell's own composition and the same week shapes the door givens use;
    // the prompt builder and the floor below both read this object, so a grid
    // can never be taught in one week and demanded in another.
    var owesLudic = ludicWeekAssignments.filter(function (row) {
      return Number(row.weekNumber) === w;
    })[0] || null;
    var weekFloorOptions = {
      generationFloors: true,
      weekNumber: w,
      isDeload: weekShape.isDeload,
      // The seat that authored the spine on THIS pipeline, so a spine defect
      // found here routes back to a prompt that can fix it (D129/D143).
      spineStageLabel: 'Shell',
      mechanicGrammarFamily: (((shell || {}).meta || {}).artifactIntent || {}).mechanicGrammarFamily || '',
      // W4a: the spine was declared at the shell stage; the door and the clocks
      // are authored here. The closure floors that pair them need both, so the
      // declaration rides in the same way the family does. No spine in the
      // options means no spine floors — a floor must never invent the
      // declaration it is checking against.
      playSpine: ((shell || {}).meta || {}).playSpine || null,
      owesLudicEntry: owesLudic,
      // The currency, for the week gate's conversion floor. Declared at the
      // shell stage, printed by THIS stage, and until now graded only after
      // assembly — which is why the first completed book renamed it in 6 of 6
      // weeks and every one of those was a book-level error with no cheap
      // remedy. Same law as playSpine directly above: absent label, no check.
      currencyLabel: (((shell || {}).meta || {}).economy || {}).currencyLabel || '',
      // The shell family, for the week gate's citation-pinpoint floor (D170).
      // citationPinpoints needs the family to know which filing labels this
      // artifact uses; absent family, no check — the same law as above.
      shellFamily: (((shell || {}).meta || {}).artifactIdentity || {}).shellFamily || ''
    };
    // THE GATE'S OWN ROW, READ BACK AS PROMPT GIVENS (D173). The two blocking
    // floors above read `mechanicGrammarFamily` and `shellFamily`; the prompt
    // printed neither, so the door demand arrived as a conditional with no
    // antecedent and the citation grammar as eight rows with no key. Derived
    // FROM weekFloorOptions rather than from the shell again, so the values the
    // model is taught cannot drift from the values it is checked against.
    var weekIdentityGiven = deriveWeekIdentityGiven(weekFloorOptions, isBossWeek);

    progress('weeks', 'Writing Week ' + w + (isBossWeek ? ' (Boss)' : '') + '\u2026');
    var weekObject = await runJsonStage(settings, {
      stageKey: 'weeks',
      stageName: 'Week ' + w,
      stageIndex: stageNum,
      completeMessage: 'Week ' + w + ' complete.',
      onProgress: onProgress,
      getTotalStages: function () { return totalStages; },
      schema: null,
      maxAttempts: 3,
      rateLimiter: rateLimiter,
      budgetEnforce: useGeminiBudget,
      normalizeResult: function (result) {
        if (result && Array.isArray(result.weeks) && result.weeks.length > 0) {
          console.warn('[LiftRPG] Week stage returned weeks[] wrapper — unwrapping');
          var match = result.weeks.filter(function (wk) { return Number(wk.weekNumber) === w; })[0];
          result = match || result.weeks[0];
        }
        if (result && result.meta && Array.isArray(result.weeks) && result.weeks.length > 0) {
          console.warn('[LiftRPG] Week stage returned full booklet — extracting week');
          var match2 = result.weeks.filter(function (wk) { return Number(wk.weekNumber) === w; })[0];
          result = match2 || result.weeks[0];
        }
        if (result && result.meta && !result.title && !result.sessions) {
          console.warn('[LiftRPG] Week stage returned booklet shell instead of week — rejecting');
          return null;
        }
        if (result) normalizeCompanionComponents(result);
        return result;
      },
      autoRepair: function (result) {
        var planEntry = (campaignPlan.weeks || []).find(function (pw) { return pw.weekNumber === w; });
        return autoRepairWeek(result, {
          weekNumber: w,
          overflowRegistry: campaignPlan.overflowRegistry || [],
          weeklyComponentType: (shell.meta || {}).weeklyComponentType || '',
          approvedFragmentIds: planEntry ? (planEntry.fragmentIds || []) : [],
          overflowFragmentId: planEntry ? (planEntry.overflowFragmentId || '') : ''
        });
      },
      validate: function (result) {
        if (!result) return 'Week generation returned empty result. Model may have returned a shell instead of a week object.';
        if (!result.title) return 'Week object missing "title" field. Got keys: ' + Object.keys(result).slice(0, 5).join(', ');
        if (!result.sessions) return 'Week object missing "sessions" array. Got keys: ' + Object.keys(result).slice(0, 5).join(', ');
        var schemaValidation = validateWeekSchema(result, isBossWeek, Object.assign({
          componentInputs: isBossWeek ? allComponentValues : undefined,
          approvedFragmentIds: campaignWeekPlan ? (campaignWeekPlan.fragmentIds || []) : [],
          currentWeekNumber: w,
          previousWeek: !isBossWeek && finalWeeks.length ? finalWeeks[finalWeeks.length - 1] : null
        }, weekFloorOptions));
        if (schemaValidation && schemaValidation.valid === false) {
          return schemaValidation;
        }
        var continuityErrors = validateWeekChunkContinuity(
          { weeks: [Object.assign({}, result, { weekNumber: w, isBossWeek: isBossWeek })] },
          {
            shell: shell,
            campaignPlan: campaignPlan,
            priorWeekChunkOutputs: finalWeeks.length ? [{ weeks: finalWeeks }] : []
          }
        );
        if (continuityErrors.length > 0) {
          // Conform to the documented convention rather than leaning on the
          // array arm above: both halves of D157 land, so this gate is right
          // by its own shape AND survives a future refactor of the helper.
          return { valid: false, errors: continuityErrors };
        }
        return schemaValidation;
      },
      buildPrompt: function (retryState) {
        return builders.singleWeekFinal(
          workout,
          brief,
          layerBible,
          campaignPlan,
          campaignWeekPlan,
          shellContext,
          continuityPacket,
          allComponentValues,
          retryState,
          // The GIVEN and the floor read the same row (D170); the identity
          // givens and the floor read the same OPTIONS OBJECT (D173).
          { ludicWeekGiven: owesLudic, weekIdentityGiven: weekIdentityGiven }
        );
      }
    });

    weekObject.weekNumber = w;
    if (isBossWeek) weekObject.isBossWeek = true;
    else weekObject.isBossWeek = false;

    // Schema validation safety net
    var weekValidation = validateWeekSchema(weekObject, weekObject.isBossWeek, {
      componentInputs: weekObject.isBossWeek ? allComponentValues : undefined,
      approvedFragmentIds: campaignWeekPlan ? (campaignWeekPlan.fragmentIds || []) : [],
      currentWeekNumber: w,
      previousWeek: !weekObject.isBossWeek && finalWeeks.length ? finalWeeks[finalWeeks.length - 1] : null
    });
    if (!weekValidation.valid) {
      console.warn('[pipeline] Week ' + w + ' schema issues:', weekValidation.errors);
      if (options.onStatus) options.onStatus('Week ' + w + ': ' + weekValidation.errors.length + ' schema issue(s)');
    }
    if (weekValidation.warnings && weekValidation.warnings.length > 0) {
      console.warn('[pipeline] Week ' + w + ' advisory:', weekValidation.warnings);
      if (options.onStatus) options.onStatus('Week ' + w + ': ' + weekValidation.warnings.length + ' advisory warning(s)');
    }

    finalWeeks.push(weekObject);
    if (!isBossWeek && weekObject.weeklyComponent && weekObject.weeklyComponent.value) {
      allComponentValues.push(weekObject.weeklyComponent.value);
    }
    checkpoint = saveCheckpoint(weekCacheKey, weekObject, checkpoint);
  }

  var assembledWeeksOutput = [{ weeks: finalWeeks }];
  var weekSummaries = extractWeekSummaries(assembledWeeksOutput);

  // ── BATCHED FRAGMENT GENERATION ──────────────────────────────
  var finalFragments = [];
  var registry = campaignPlan.fragmentRegistry || [];
  var fragmentBatches = buildFragmentBatches(registry, weekSummaries);
  var totalBatches = fragmentBatches.length;

  // Update totalStages now that we know batch count instead of individual count
  totalStages = 4 + weekCount + totalBatches + 1;

  for (var fb = 0; fb < fragmentBatches.length; fb++) {
    var batch = fragmentBatches[fb];
    var fragCacheKey = 'fragBatch_' + fb;
    var batchLabel = 'Fragments batch ' + (fb + 1) + '/' + totalBatches;

    if (checkpoint && checkpoint.stages && checkpoint.stages[fragCacheKey]) {
      var cachedFrags = checkpoint.stages[fragCacheKey];
      (cachedFrags.fragments || []).forEach(function (f) { finalFragments.push(f); });
      stageNum++;
      console.log('[LiftRPG] Resumed: ' + batchLabel + ' (cached)');
      emitPipelineEvent(onProgress, stageNum, totalStages, batchLabel + ' restored from checkpoint.', {
        phase: 'complete',
        stageKey: 'fragments',
        stageName: batchLabel,
        completionSource: 'checkpoint'
      });
      continue;
    }

    progress('fragments', 'Writing ' + batchLabel + ' (' + batch.registry.length + ' docs)\u2026');
    var batchWeekNums = {};
    batch.registry.forEach(function (entry) { if (entry.weekRef) batchWeekNums[entry.weekRef] = true; });
    var batchWeekSummaries = weekSummaries.filter(function (ws) { return batchWeekNums[ws.weekNumber]; });

    var batchOutput = await generateFragmentBatchAdaptive(settings, builders, {
      layerBible: layerBible,
      registry: batch.registry,
      batchWeekSummaries: batchWeekSummaries.length > 0 ? batchWeekSummaries : weekSummaries,
      allWeekSummaries: weekSummaries,
      priorFragments: finalFragments,
      batchIndex: fb,
      totalBatches: totalBatches,
      shellContext: shellContext,
      label: batchLabel,
      stageKey: 'fragments',
      stageIndex: stageNum,
      onProgress: onProgress,
      getTotalStages: function () { return totalStages; },
      rateLimiter: rateLimiter,
      budgetEnforce: useGeminiBudget
    });

    (batchOutput.fragments || []).forEach(function (frag, i) {
      var fragNorm = normalizeId(frag && frag.id);
      var matched = false;
      if (fragNorm) {
        for (var ri = 0; ri < batch.registry.length; ri++) {
          if (normalizeId(batch.registry[ri].id) === fragNorm) {
            frag.id = batch.registry[ri].id;
            matched = true;
            break;
          }
        }
      }
      if (!matched && batch.registry[i] && batch.registry[i].id) {
        frag.id = batch.registry[i].id;
      }
      finalFragments.push(frag);
    });
    checkpoint = saveCheckpoint(fragCacheKey, batchOutput, checkpoint);
  }

  var assembledFragmentsOutput = { fragments: finalFragments };

  // ── TARGETED UNIT GENERATION: ENDING ────────────────────────
  var finalEndings = [];
  if (checkpoint && checkpoint.stages && checkpoint.stages.endings) {
    finalEndings = checkpoint.stages.endings;
    stageNum++;
    console.log('[LiftRPG] Resumed: Finale (cached)');
    emitPipelineEvent(onProgress, stageNum, totalStages, 'Finale restored from checkpoint.', {
      phase: 'complete',
      stageKey: 'endings',
      stageName: 'Finale',
      completionSource: 'checkpoint'
    });
  } else {
    progress('endings', 'Writing finale\u2026');
    var endingObj = await runJsonStage(settings, {
      stageKey: 'endings',
      stageName: 'Finale Variant',
      stageIndex: stageNum,
      completeMessage: 'Finale complete.',
      onProgress: onProgress,
      getTotalStages: function () { return totalStages; },
      schema: null,
      // THE SHAPE MARKER IS `variant`, not `ending` (D128).
      //
      // unwrapIfNeeded(result, key) asks "does the result already carry `key`?"
      // — not "is the result wrapped in `key`?". So the key named here is the
      // first required field of the object this stage validates, exactly as
      // `meta` is for the shell stage. A correct {variant, content, designSpec}
      // passes through untouched (it carries `variant`); a single-key envelope
      // like {"ending": {...}} unwraps to the object inside it.
      //
      // This is the ONE unit stage that was left without it, and a bench book
      // died here six attempts running while thirteen paid stages sat in the
      // checkpoint behind it.
      unwrapKey: 'variant',
      maxAttempts: 2,
      rateLimiter: rateLimiter,
      budgetEnforce: useGeminiBudget,
      validate: function (result) {
        if (!result) return 'Ending object is null.';
        if (!result.variant) return 'Ending missing variant.';
        var content = result.content;
        if (!content || typeof content !== 'object') return 'Ending missing content object.';
        if (!content.body) return 'Ending missing content.body.';
        if (!content.documentType) return 'Ending missing content.documentType.';
        if (!result.designSpec || typeof result.designSpec !== 'object') return 'Ending missing designSpec object.';
        // F6, the multi-stage twin of the S+F endings gate above.
        var endingBreaches = collectBudgetBreaches({ endings: [result] })
          .map(function (b) { return b.message; });
        if (endingBreaches.length > 0) {
          return 'Over budget: ' + endingBreaches.join('; ');
        }
        return '';
      },
      buildPrompt: function (retryState) {
        return builders.singleEnding(layerBible, campaignPlan, "Primary", shellContext, weekSummaries);
      }
    });
    finalEndings.push(endingObj);
    checkpoint = saveCheckpoint('endings', finalEndings, checkpoint);
  }
  var assembledEndingsOutput = { endings: finalEndings };

  // ── DETERMINISTIC ASSEMBLY & QUALITY GATE ───────────────────
  emitPipelineEvent(onProgress, totalStages, totalStages, 'Assembling booklet locally…', {
    phase: 'start',
    stageKey: 'quality',
    stageName: 'Quality Check',
    completionSource: 'local'
  });
  console.log('[LiftRPG] Assembling booklet from ' + finalWeeks.length + ' weeks, ' + finalFragments.length + ' fragments, ' + finalEndings.length + ' endings.');

  var booklet = options.assemble(shell, assembledWeeksOutput, assembledFragmentsOutput, assembledEndingsOutput, campaignPlan);
  enforceIdentityContract(booklet, identityContract);
  truthBoardStateMode(booklet, readPipelineDebris(booklet, '_assemblyDiagnostics') || []);
  recordSeedOnBooklet(booklet, divergenceSeed);
  recordWorkoutLifecycle(booklet, workoutLifecycle);

  // generationFloors: the API path, so the simulated player's soft-locks are
  // blocking-class errors (D111). See validateAssembledBooklet's header for the
  // severity split and why the corpus is untouched by it.
  var validationResult = validateAssembledBooklet(booklet, { generationFloors: true });
  writePipelineDebris(booklet, '_simReport', validationResult.sim);
  if (validationResult.sim && !validationResult.sim.skipped) {
    console.log('[LiftRPG] Simulated player: ' + validationResult.sim.hard.length + ' soft-lock(s), '
      + validationResult.sim.soft.length + ' finding(s).');
  }
  if (validationResult.warnings && validationResult.warnings.length > 0) {
    console.warn('[LiftRPG] Validation warnings:', validationResult.warnings);
  }

  if (validationResult.errors.length > 0) {
    console.warn('[LiftRPG] Final assembly has', validationResult.errors.length, 'validation errors:', validationResult.errors);
    console.warn('[LiftRPG] Whole-booklet patching is disabled by policy. Returning aggressively unit-repaired booklet.');
  }

  var report = generateQualityReport(booklet);
  var qualityGate = buildQualityGate(report);
  writePipelineDebris(booklet, '_qualityReport', report);
  writePipelineDebris(booklet, '_qualityGate', qualityGate);
  writePipelineDebris(booklet, '_pipeline', readPipelineDebris(booklet, '_pipeline') || 'standard');

  // Persist Layer 2 assembly diagnostics (serialization-safe)
  writePipelineDebris(booklet, '_assemblyWarnings', {
    diagnostics: readPipelineDebris(booklet, '_assemblyDiagnostics') || [],
    validationErrors: validationResult.errors,
    validationWarnings: validationResult.warnings
  });
  delete booklet._x._assemblyDiagnostics;

  // Post-assembly artifact-intent drift diagnostics (Layer 3 planning contract)
  var driftResult = compareArtifactIntentDrift(booklet);
  writePipelineDebris(booklet, '_artifactIntentDrift', driftResult);
  if (driftResult.diagnostics.length > 0) {
    console.warn('[LiftRPG] Artifact intent drift:', driftResult.diagnostics.length, 'issue(s)');
  }

  if (!qualityGate.passed) {
    console.warn('[LiftRPG] Quality gate warnings (non-blocking):', qualityGate.blockers.map(function (entry) {
      return entry.message;
    }));
  }

  // Every paid generation stage is now banked and the booklet is assembled.
  // The critic that follows makes more paid calls, so snapshot the recoverable
  // booklet FIRST: if the run dies mid-critic, the user still has a complete,
  // fully-paid-for book instead of only a checkpoint that has to be re-graded.
  persistLastBooklet(booklet, {
    source: options && options.pipelineLabel ? options.pipelineLabel : 'structured'
  });

  // ── COMPOSITION CRITIC LOOP (D66) ───────────────────────────
  var criticReport = await runCriticLoop(settings, booklet, brief, {
    rateLimiter: rateLimiter,
    budgetEnforce: useGeminiBudget,
    onProgress: onProgress
  });
  if (criticReport && criticReport.revisedUnits > 0) {
    // Revisions changed prose — refresh the mechanical report to match.
    report = generateQualityReport(booklet);
    qualityGate = buildQualityGate(report);
    writePipelineDebris(booklet, '_qualityReport', report);
    writePipelineDebris(booklet, '_qualityGate', qualityGate);
  }

  emitPipelineEvent(onProgress, totalStages, totalStages, qualityGate.passed
    ? 'Assembled and validated locally on this device.'
    : 'Assembled locally. Quality warnings were found.', {
    phase: 'complete',
    stageKey: 'quality',
    stageName: 'Quality Check',
    completionSource: 'local'
  });

  persistLastBooklet(booklet, {
    source: options && options.pipelineLabel ? options.pipelineLabel : 'structured'
  });

  // Pipeline succeeded — clear the checkpoint so next run starts fresh
  clearCheckpoint();
  console.log('[LiftRPG] Pipeline complete. Checkpoint cleared.');

  return booklet;
}


// ── Divergence seed lifecycle (§10.3 — the Armed Lens) ─────────────────────
//
// When the direction field is empty or thin, generator JS draws creative
// material from story-tables.js and injects it into the BRIEF channel before
// the compiler stage runs. Three properties have to hold, and each is bought by
// exactly one line below:
//
//  1. IDENTITY IS UNPERTURBED. computeRunFingerprint hashes the RAW pre-seed
//     brief and runs at the very top of the pipeline, before any of this. A
//     draw therefore cannot move a run onto a different checkpoint — which it
//     would, silently, if the seeded text were spliced into `brief` instead.
//  2. DRAWN EXACTLY ONCE. Prompt builders run once per ATTEMPT; a builder that
//     drew its own seed would hand retry #2 a different world than retry #1.
//     The run resolves the seed here and passes it down.
//  3. RESUME REPLAYS THE SAME BOOK. The seed rides on the compiler stage's own
//     checkpointed output, so a resume recovers it with the stage it shaped. A
//     re-draw would write the back half of a book against a world the front
//     half never saw.

/**
 * repairSeedFromStage(stage) -> seed | null
 * resolveRepairAwareSeed(carry, cachedCompilerStage, brief) -> seed | null
 *
 * THE SEED SURVIVES THE REPAIR (D143). A cross-stage repair drops the compiler
 * stage from the bank, which would otherwise send resolveRunSeed down its
 * fresh-draw branch — and the re-entered stage would then build a DIFFERENT
 * WORLD from the layerBible and campaignPlan still banked beside it. That is
 * D101's law verbatim ("a builder that draws its own hands every retry a
 * different world"), and nothing would throw.
 *
 * `undefined` carry means no repair pruned anything; `null` is a real answer
 * carried forward, because a stage written with no seed must be repaired with
 * no seed — the same distinction resolveRunSeed already makes for a resume.
 */
function repairSeedFromStage(stage) {
  return (stage && stage._x && stage._x.divergenceSeed) || null;
}

function resolveRepairAwareSeed(carry, cachedCompilerStage, brief) {
  if (carry !== undefined) return carry;
  return resolveRunSeed(cachedCompilerStage, brief);
}

/**
 * adoptRunSeedSalt(seed) -> void
 *
 * THE DESIGN BIAS STOPS BEING AN ANONYMOUS HASH (D144's flagged relay, closed
 * by the fourth-referee wave). `deriveDesignBlend` scores the brief against the
 * profile keywords and, when nothing hits — which D144 measured happening on
 * real briefs — falls through to `DESIGN_PROFILES[hash % length]`, where the
 * hash mixes in a per-run salt drawn from `crypto.getRandomValues`. Same draw,
 * but from entropy nobody recorded: the book could not be reproduced, and the
 * bias could not be classified as anything at all.
 *
 * The repair is one line of plumbing, not a new mechanism: the run's variant
 * salt BECOMES the run seed's value, so the keyword-miss draw is a pure
 * function of a string that rides `_x.divergenceSeed` on the finished booklet.
 * Reproducible from the record, which is what "declared" has to mean for a
 * deterministic draw.
 *
 * Called once per pipeline run, before the first builder, because every builder
 * derives its own blend and they must all agree within a run.
 */
function adoptRunSeedSalt(seed) {
  var value = seed && seed.value;
  if (!value) return;
  if (typeof window.beginLiftRpgPromptRun === 'function') {
    window.beginLiftRpgPromptRun(value);
  }
}

function resolveRunSeed(cachedCompilerStage, brief) {
  if (cachedCompilerStage) {
    // Resuming. Whatever the paid-for stage was written against is the truth —
    // including "no seed", which is why this returns rather than falling
    // through to a draw.
    var cached = cachedCompilerStage._x && cachedCompilerStage._x.divergenceSeed;
    return cached || null;
  }
  return typeof window.resolveDivergenceSeed === 'function'
    ? window.resolveDivergenceSeed(brief)
    : null;
}

// Carried on the stage output so the checkpoint persists it for free — the
// checkpoint stores stage outputs verbatim, so no new checkpoint key and no
// change to CHECKPOINT_STORAGE_KEY's four touchpoints (D98).
function recordSeedOnStage(stageOutput, seed) {
  if (!stageOutput || !seed) return;
  if (!stageOutput._x || typeof stageOutput._x !== 'object') stageOutput._x = {};
  stageOutput._x.divergenceSeed = seed;
}

// The RECORD. `_x` is the declared extension namespace at the booklet's top
// level, and this is where a reader (or the bench) looks to answer "where did
// this world come from when nobody asked for one?"
function recordSeedOnBooklet(booklet, seed) {
  if (!booklet || !seed) return;
  if (!booklet._x || typeof booklet._x !== 'object') booklet._x = {};
  booklet._x.divergenceSeed = seed;
}


// ── Workout input normalisation ─────────────────────────────────────────────

function normalizeWorkoutParam(workout) {
  if (workout && typeof workout === 'object' && workout.source) {
    return workout;
  }

  var rawText = String(workout || '');
  var weekCount = typeof window.parseWeekCount === 'function'
    ? window.parseWeekCount(rawText)
    : 6;

  return {
    source: 'raw',
    rawText: rawText,
    weekCount: weekCount,
    weeks: [],
    summary: {
      sessionsPerWeek: 0,
      totalExercises: 0,
      progression: ''
    }
  };
}

function formatNormalizedForPrompt(nw) {
  if (!nw || !nw.weeks || nw.weeks.length === 0) {
    return nw ? nw.rawText || '' : '';
  }

  var lines = [];
  var sessionsPerWeek = 0;
  nw.weeks.forEach(function (week) {
    if (week.sessions) sessionsPerWeek = Math.max(sessionsPerWeek, week.sessions.length);
  });

  lines.push(nw.weekCount + ' weeks, ' + sessionsPerWeek + ' sessions/week.' +
    (nw.summary && nw.summary.progression ? ' Progression: ' + nw.summary.progression + '.' : ''));
  lines.push('');

  nw.weeks.forEach(function (week, wi) {
    // A cycled week says so. `cycleOf` is set by extendCanonicalWorkout when a
    // template shorter than the book was repeated to fill it; stating it is the
    // difference between "the program prescribes this again" (true) and "the
    // author wrote a new week that happens to match" (false). The progression
    // line above is what actually moves between cycles.
    lines.push('Week ' + (wi + 1) + ':'
      + (week.cycleOf ? '  (repeats week ' + week.cycleOf + ' of the program cycle; apply the stated progression)' : ''));
    (week.sessions || []).forEach(function (session, si) {
      var label = session.dayLabel || ('Session ' + (si + 1));
      var exList = (session.exercises || []).map(function (ex) {
        var sets = ex.sets || 3;
        var reps = ex.repsPerSet || '5';
        var desc = ex.name + ' ' + sets + 'x' + reps;
        if (ex.notes) desc += ' ' + ex.notes;
        return desc;
      }).join(', ');
      lines.push('  ' + label + ': ' + (exList || 'no exercises listed'));
    });
  });

  return lines.join('\n');
}


// ── Canonicalization (§11 Wave 5) ───────────────────────────────────────────
//
// LIFECYCLE, and why it is shaped like the knowing stage rather than like a
// utility call. Canonicalization is a paid API call over the user's program. It
// therefore runs ONCE per run, at the orchestrator level, checkpointed on its
// own key — a resumed run reuses the canonical form and never re-buys it.
//
// RUN IDENTITY IS THE RAW INPUT, NOT THIS OUTPUT. The checkpoint fingerprint
// hashes what the USER GAVE. That is not a stylistic preference: this stage's
// output changes whenever the grammar summary, the stage prompt or the model
// changes, and if identity were computed from it, every such change would
// orphan every checkpoint in the field and re-buy books that were already paid
// for. The same reasoning already excludes model and provider from the
// fingerprint (checkpoint.js, Wave A.1). Pipelines pass `rawWorkout` for
// identity and the canonical text for prompts, and those two are deliberately
// different values from here on.
//
// TIER 3 IS THE DEFAULT AND COSTS NOTHING. Freeform text never reaches this
// stage: detection is a routing decision made before any call, so the only runs
// that pay for canonicalization are the ones with Liftoscript to canonicalize.
async function runCanonicalizeStage(settings, config) {
  var rawWorkout = config.rawWorkout;
  var rawText = typeof rawWorkout === 'string' ? rawWorkout : '';
  var checkpoint = config.checkpoint;

  // Already rich (the wizard path, or a re-entry) — nothing to canonicalize.
  if (rawWorkout && typeof rawWorkout === 'object' && rawWorkout.source) {
    return { applied: false, reason: 'already-structured', checkpoint: checkpoint };
  }
  if (!looksLikeLiftoscript(rawText)) {
    return { applied: false, reason: 'not-liftoscript', checkpoint: checkpoint };
  }

  var cached = checkpoint && checkpoint.stages ? checkpoint.stages.workoutCanonical : null;
  if (cached) {
    var restored = normalizeCanonicalWorkout(rawText, cached);
    if (restored) {
      config.emitRestored();
      return { applied: true, reason: 'checkpoint', nw: restored, checkpoint: checkpoint };
    }
    // A cached payload that no longer shapes is not a reason to re-buy the
    // stage silently — fall through and say so through the normal stage log.
  }

  var output;
  try {
    output = await runJsonStage(settings, {
      stageKey: 'canonicalize',
      stageName: 'Reading the program',
      stageIndex: config.stageIndex(),
      completeMessage: 'Program read.',
      onProgress: config.onProgress,
      getTotalStages: config.getTotalStages,
      maxAttempts: config.trialMode ? 1 : 2,
      rateLimiter: config.rateLimiter,
      budgetEnforce: config.budgetEnforce,
      buildPrompt: function (retryState) {
        return window.generateCanonicalizePrompt(rawText, { retryMode: retryState.attempt > 0 });
      }
    });
  } catch (error) {
    // NEVER FATAL. The program is already usable as the user typed it — that is
    // what tier 3 has always done. Losing the book because a transcription
    // convenience failed would be the tail wagging the dog.
    config.emitDegraded((error && error.message) || 'the program could not be read as Liftoscript');
    return { applied: false, reason: 'stage-failed', checkpoint: checkpoint };
  }

  var nw = normalizeCanonicalWorkout(rawText, output);
  if (!nw) {
    config.emitDegraded('the program came back empty when read as Liftoscript');
    return { applied: false, reason: 'empty-result', checkpoint: checkpoint };
  }

  checkpoint = saveCheckpoint('workoutCanonical', output, checkpoint);
  return { applied: true, reason: 'generated', nw: nw, checkpoint: checkpoint };
}

/**
 * Adapter: pipeline-agnostic options → the config runCanonicalizeStage wants.
 *
 * Both pipelines count stages with their own local `stageNum` / `totalStages`
 * variables and their own progress emitters, so the stage helper takes closures
 * rather than reaching for either. The stage counter is bumped ONLY on the
 * paths that actually occupy a stage slot — a run that never canonicalizes must
 * not show a phantom step, which is the honest-progress rule the checkpoint
 * restore events already follow.
 */
/**
 * runGameRulebookStage(settings, config) -> { rulebook, checkpoint }
 *
 * THE RULES-FIRST STAGE (VISION §4.0 / PLAY.md §3.1, D173), shared by both API
 * pipelines and IDENTICAL on each. One stage runner rather than two copies, for
 * the reason `generateKnowingPrompt` is one builder: the stage's inputs are the
 * two threads and nothing else, so there is nothing for a per-pipeline copy to
 * differ about except by accident.
 *
 * PLACEMENT: FIRST, on both pipelines, immediately after canonicalization.
 *
 *   multi-stage:  canonicalize → RULEBOOK → codex → plan → shell(spine) → …
 *   skeleton+flesh: canonicalize → RULEBOOK → skeleton(spine) → knowing → rules → …
 *
 * The placement is the ruling and it is worth stating why, because the cheaper
 * option was available and is wrong. Putting the rulebook AFTER the campaign
 * plan on the multi-stage path would let it name the world's proper nouns —
 * and would make it a DESCRIPTION of decisions already taken (the topology, the
 * progression, the boss), which is the component-supplier pipeline §4.0 exists
 * to end. It would also make the two pipelines asymmetric: S+F's compiler seat
 * authors the registry and the spine in ONE call, so there is no seat between
 * "the world exists" and "the spine is written" on that path at all. First on
 * both, from the same inputs, is the only placement where the rulebook is the
 * SOURCE on both doors and the parity floor is checking the same thing twice.
 *
 * The cost is real and is the design: the rulebook names surfaces before the
 * book has them. That is what makes it a rudder — a ref written here becomes a
 * DEMAND on the spine, and the parity floor at the spine seat is what collects
 * it. The rulebook's own gate therefore checks ref GRAMMAR and never ref
 * RESOLUTION: at this seat there is no index to resolve against, and a floor
 * that pretended otherwise would fail every book for not yet existing.
 *
 * THE SEED RIDES THIS STAGE (D101/D143). It is now the earliest banked stage,
 * so it is the earliest seed carrier; see earliestSeedCarrier() for the resume
 * hazard that creates and how the two pipelines resolve it. No new checkpoint
 * key: the seed rides `_x` on the stage output, which the checkpoint stores
 * verbatim (D98's four touchpoints stay four).
 */
async function runGameRulebookStage(settings, config) {
  var cached = config.cached;
  if (cached) {
    config.emitRestored();
    return { rulebook: cached, checkpoint: config.checkpoint };
  }
  config.progress('gameRulebook', 'Designing the game…');
  var output = await runJsonStage(settings, {
    stageKey: 'gameRulebook',
    stageName: 'Game Rulebook',
    // READ AFTER `progress` INCREMENTS IT, which is why it is a getter and not
    // a number: every other stage in this file reads `stageNum` on the line
    // after its own progress() call, and a value captured before that call
    // labels the stage with the previous stage's index.
    stageIndex: config.getStageIndex(),
    completeMessage: 'Game rulebook complete.',
    onProgress: config.onProgress,
    getTotalStages: config.getTotalStages,
    schema: window.STRUCTURED_SCHEMA_GAME_RULEBOOK || null,
    // NO maxAttempts LITERAL (D97/D166): the row is STAGE_BUDGETS.gameRulebook
    // and its attempts column is unset, which stageBudget() reads as 2. Trial
    // mode still wins explicitly, the way every other stage lets it.
    maxAttempts: config.trialMode ? 1 : undefined,
    rateLimiter: config.rateLimiter,
    budgetEnforce: config.budgetEnforce,
    telemetryCollector: config.telemetryCollector,
    normalizeResult: normalizeGameRulebookShape,
    repairDirective: config.repairDirective || '',
    validate: function (result) { return validateGameRulebookStage(result); },
    buildPrompt: function (retryState) {
      return config.buildPrompt(retryState);
    }
  });
  recordSeedOnStage(output, config.divergenceSeed);
  return { rulebook: output, checkpoint: saveCheckpoint('gameRulebook', output, config.checkpoint) };
}

function buildCanonicalizeConfig(options) {
  var emitted = false;
  function bumpOnce() {
    if (emitted) return;
    emitted = true;
    options.bumpTotal();
  }
  return {
    rawWorkout: options.rawWorkout,
    checkpoint: options.checkpoint,
    onProgress: options.onProgress,
    rateLimiter: options.rateLimiter,
    budgetEnforce: options.budgetEnforce,
    trialMode: options.trialMode,
    getTotalStages: options.getTotalStages,
    stageIndex: function () {
      bumpOnce();
      return options.bumpStage();
    },
    emitRestored: function () {
      bumpOnce();
      var index = options.bumpStage();
      emitPipelineEvent(options.onProgress, index, options.getTotalStages(),
        'Program reading restored from checkpoint.', {
          phase: 'complete',
          stageKey: 'canonicalize',
          stageName: 'Reading the program',
          completionSource: 'checkpoint'
        });
    },
    // DEGRADATION HONESTY (D96/D99 family). The run continues on the user's text
    // as written — but it says so. A silent fallback here would leave the
    // operator believing their Liftoscript was parsed when it was read as prose.
    emitDegraded: function (detail) {
      emitPipelineEvent(options.onProgress, options.getTotalStages(), options.getTotalStages(),
        'Could not read the program as Liftoscript — it will be interpreted as written. (' +
        detail + ')', {
          phase: 'start',
          stageKey: 'canonicalize',
          stageName: 'Reading the program',
          noticeLevel: 'warn'
        });
    }
  };
}

/**
 * The audit line a canonicalized run records on the assembled booklet.
 *
 * `_x` is the declared extension namespace, and this is where the bench (and a
 * reader) answers "was this program transcribed, and from what?" — the lifecycle
 * has to be legible after the fact or the once-per-run claim is unfalsifiable.
 */
function recordWorkoutLifecycle(booklet, lifecycle) {
  if (!booklet || !lifecycle) return;
  if (!booklet._x || typeof booklet._x !== 'object') booklet._x = {};
  booklet._x.workoutInput = lifecycle;
}

function describeWorkoutLifecycle(state) {
  var note = state.lengthNote || null;
  return {
    tier: state.applied ? 'liftoscript' : 'freeform',
    canonicalized: !!state.applied,
    source: state.reason,
    weekCount: state.nw ? state.nw.weekCount : null,
    sessionsPerWeek: state.nw && state.nw.summary ? state.nw.summary.sessionsPerWeek : null,
    progressionSummary: state.nw && state.nw.summary ? state.nw.summary.progression : '',
    // Week-count ownership (W3 close). Present only when a template shorter
    // than the requested book was cycled to fill it; absent means the program
    // supplied every week itself. The audit line has to be able to answer
    // "where did week 9 come from?" after the fact.
    templateWeeks: note ? note.templateWeeks : null,
    lengthPolicy: note ? 'template-cycled' : 'as-written',
    progressionStated: note ? note.progressionStated : null
  };
}

/**
 * WEEK-COUNT OWNERSHIP — one home, both pipelines.
 *
 * `extendCanonicalWorkout` holds the ruling (liftosaur.js); this holds the
 * WIRING, and it is a function rather than two inline blocks because the two
 * pipelines' copies of the old `weekCount = canonState.nw.weekCount` line are
 * exactly the shape that drifts. A pipeline that resolved book length its own
 * way would ship a different-length book from the same input.
 *
 * The mutation of `state.nw` is deliberate: `describeWorkoutLifecycle` reads it
 * to write the booklet's audit line, and the audit must describe the book that
 * was actually built, not the template it was built from. `state.lengthNote`
 * carries the provenance so the two are distinguishable.
 *
 * @returns {number} the week count the pipeline should build to
 */
function resolveCanonicalBookLength(state, requestedWeeks, onProgress, getTotalStages) {
  var result = extendCanonicalWorkout(state.nw, requestedWeeks);
  state.nw = result.nw;
  if (!result.note) return state.nw && state.nw.weekCount ? state.nw.weekCount : requestedWeeks;

  state.lengthNote = result.note;
  // DEGRADATION HONESTY, same channel and same rules as emitDegraded above: a
  // repetition the program did not license is a thing the operator is entitled
  // to know about before they print it.
  if (result.note.warning) {
    emitPipelineEvent(onProgress, getTotalStages(), getTotalStages(), result.note.warning, {
      phase: 'start',
      stageKey: 'canonicalize',
      stageName: 'Reading the program',
      noticeLevel: 'warn'
    });
  }
  return result.note.bookWeeks;
}


// ── Runtime pipeline entrypoints ─────────────────────────────────────────

async function generateMultiStage(settings, workout, brief, onProgress) {
  var nw = normalizeWorkoutParam(workout);
  var totalSessions = 0;
  (nw.weeks || []).forEach(function(w) { totalSessions += (w.sessions ? w.sessions.length : 0); });

  return runPipelineWithRepairRouting(runApiPipeline, {
    settings: settings,
    workout: workout,
    rawWorkout: workout,
    brief: brief,
    pipelineLabel: 'multi-stage',
    weekCount: nw.weekCount,
    totalSessions: totalSessions,
    onProgress: onProgress,
    assemble: function (shell, weekChunkOutputs, fragmentsOutput, endingsOutput, campaignPlan) {
      return assembleBooklet(shell, weekChunkOutputs, fragmentsOutput, endingsOutput, campaignPlan);
    }
  });
}

async function generateStructured(settings, workout, brief, onProgress) {
  var resolvedSettings = resolveStructuredPipelineSettings(settings);
  if (!resolvedSettings.apiKey && resolvedSettings.format !== 'anthropic' && !allowsEmptyApiKey(resolvedSettings)) {
    throw new Error('API key required for structured generation.');
  }

  var nw = normalizeWorkoutParam(workout);
  var workoutText = nw.weeks.length > 0 ? formatNormalizedForPrompt(nw) : nw.rawText;
  var weekCount = nw.weekCount || (typeof window.parseWeekCount === 'function' ? window.parseWeekCount(workoutText) : 6);
  var totalSessions = 0;
  (nw.weeks || []).forEach(function(w) { totalSessions += (w.sessions ? w.sessions.length : 0); });

  return runPipelineWithRepairRouting(runApiPipeline, {
    settings: resolvedSettings,
    workout: workoutText,
    rawWorkout: workout,
    brief: brief,
    pipelineLabel: 'structured',
    onProgress: onProgress,
    weekCount: weekCount,
    totalSessions: totalSessions,
    assemble: function (shell, weekChunkOutputs, fragmentsOutput, endingsOutput, campaignPlan) {
      return assembleStructuredBooklet(shell, weekChunkOutputs, fragmentsOutput, endingsOutput, nw, campaignPlan);
    }
  });
}


// ══════════════════════════════════════════════════════════════════════════
// SKELETON + FLESH PIPELINE
// ══════════════════════════════════════════════════════════════════════════

function getSkeletonFleshBuilders() {
  return {
    // D173 — shared with the multi-stage pipeline. One builder, one prompt
    // head, and the stage's only inputs are the two threads, so there is
    // nothing for a second copy to differ about except by accident.
    gameRulebook:          window.generateGameRulebookPrompt          || null,
    skeleton:              window.generateSkeletonPrompt              || null,
    // Shared with the multi-stage pipeline — one builder, one prompt head.
    knowing:               window.generateKnowingPrompt               || null,
    fleshRules:            window.generateFleshRulesPrompt            || null,
    fleshWeek:             window.generateFleshWeekPrompt             || null,
    fleshFragmentBatch:    window.generateFleshFragmentBatchPrompt    || null,
    fleshEnding:           window.generateFleshEndingPrompt           || null,
    fleshEndingsBundled:   window.generateFleshEndingsBundledPrompt   || null
  };
}

function assertSkeletonFleshBuilders(builders) {
  var required = ['gameRulebook', 'skeleton', 'knowing', 'fleshRules', 'fleshWeek', 'fleshFragmentBatch', 'fleshEnding'];
  for (var i = 0; i < required.length; i++) {
    if (typeof builders[required[i]] !== 'function') {
      throw new Error('Skeleton+Flesh pipeline: missing prompt builder "' + required[i] + '". Reload the page.');
    }
  }
}

async function runSkeletonFleshPipeline(options) {
  var settings      = options.settings;
  var workout       = options.workout;
  var brief         = options.brief;
  var onProgress    = options.onProgress;
  var weekCount     = options.weekCount;
  var nw            = options.nw;
  var trialMode     = !!(options.trialMode || settings.trialMode);

  // Trial mode: one attempt per stage, no retries — preserves diagnostics and fail-fast
  var TRIAL_ATTEMPTS = 1;

  // ── Setup ──
  if (typeof window.beginLiftRpgPromptRun === 'function') {
    window.beginLiftRpgPromptRun();
  }

  var builders = getSkeletonFleshBuilders();
  assertSkeletonFleshBuilders(builders);

  var useGeminiBudget = isGeminiProvider(settings);
  var rateLimiter = useGeminiBudget ? createRateLimiter(RATE_MAX_CALLS, RATE_WINDOW_MS) : null;

  // Estimate total stages (updated after skeleton provides fragment/ending
  // counts). The leading 1 is the rulebook (D173) — first on this pipeline too.
  var totalStages = 1 + 1 + 1 + weekCount + 2 + 1;
  var stageNum = 0;

  function progress(stageKey, message) {
    stageNum++;
    emitPipelineEvent(onProgress, stageNum, totalStages, message, {
      phase: 'start', stageKey: stageKey, stageName: message
    });
  }

  // ── Checkpoint support ──
  // Wired before the resume decision so storage-degradation and set-aside
  // warnings reach the operator through the run log.
  wireCheckpointNotices(onProgress, function () { return stageNum; }, function () { return totalStages; });

  // RUN IDENTITY — see runCanonicalizeStage(). Defaults to `workout` so every
  // pre-Wave-5 checkpoint keeps resuming: on the paste path the two are the
  // same string.
  var rawWorkout = options.rawWorkout !== undefined && options.rawWorkout !== null
    ? options.rawWorkout
    : workout;

  var sfResumeState = resumeCheckpointForRun({
    // Stored in full: a truncated copy corrupts both the fingerprint and the
    // workout/brief the UI restores from an uploaded checkpoint file.
    workout: rawWorkout,
    brief: brief || '',
    model: settings.model || '',
    provider: detectProviderId ? detectProviderId(settings) : '',
    pipeline: 'skeleton-flesh'
  });
  var checkpoint = sfResumeState.checkpoint;
  var isResume = sfResumeState.resumed > 0;

  // ── Cross-stage repair (D143), S+F's half ────────────────────────────
  // Same seam, different compiler seat: the spine is authored at `skeleton`
  // here and at `shell` on the multi-stage path, which is precisely why D129
  // made the floors' stage label a parameter rather than a constant.
  var sfRepairState = options._repairState || null;
  var sfRepairPending = (sfRepairState && sfRepairState.pending) || null;
  var sfRepairSeedCarry;
  if (options._repairPrune && checkpoint && checkpoint.stages) {
    options._repairPrune.forEach(function (key) {
      if (checkpoint.stages[key] !== undefined) {
        var droppedSF = checkpoint.stages[key];
        // Same rule, same reason (D101): the repair rebuilds the world it was
        // repairing, never a new one.
        sfRepairSeedCarry = repairSeedFromStage(droppedSF);
        delete checkpoint.stages[key];
      }
    });
    isResume = Object.keys(checkpoint.stages).length > 0;
  }
  function sfRepairDirectiveFor(stageKey) {
    return (sfRepairPending && sfRepairPending.to === stageKey) ? sfRepairPending.directive : '';
  }

  // The run seed, resolved before the first stage — same move and same reason
  // as the standard pipeline above. The S+F seat's compiler is the SKELETON,
  // so that is the cached stage the seed rides.
  // Earliest banked carrier, D173's half of the same hazard — see
  // earliestSeedCarrier(). S+F's compiler seat is the SKELETON, and the
  // rulebook now runs before it.
  var divergenceSeed = resolveRepairAwareSeed(sfRepairSeedCarry,
    earliestSeedCarrier(cached('gameRulebook'), cached('skeleton')), brief);
  var seedAssignments = drawSeedAssignments(divergenceSeed && divergenceSeed.value);
  adoptRunSeedSalt(divergenceSeed);

  if (isResume) {
    var sfResumeLine = describeResume(sfResumeState);
    console.log('[S+F] ' + sfResumeLine);
    emitPipelineEvent(onProgress, stageNum, totalStages, sfResumeLine, {
      phase: 'start',
      stageKey: '',
      stageName: 'Checkpoint',
      noticeLevel: 'info',
      restoredStages: sfResumeState.restoredStages,
      priorSpend: sfResumeState.priorSpend
    });
  }

  function cached(key) {
    return isResume && checkpoint && checkpoint.stages ? checkpoint.stages[key] : null;
  }

  // ── STAGE 0: canonicalize the program (§11 Wave 5) ──
  var sfCanonState = await runCanonicalizeStage(settings, buildCanonicalizeConfig({
    rawWorkout: rawWorkout,
    checkpoint: checkpoint,
    onProgress: onProgress,
    rateLimiter: rateLimiter,
    budgetEnforce: useGeminiBudget,
    trialMode: trialMode,
    bumpStage: function () { return ++stageNum; },
    bumpTotal: function () { totalStages++; },
    getTotalStages: function () { return totalStages; }
  }));
  checkpoint = sfCanonState.checkpoint;
  if (sfCanonState.applied) {
    // Same ownership seam as the shell pipeline — see resolveCanonicalBookLength.
    var sfCanonWeeks = resolveCanonicalBookLength(sfCanonState, weekCount, onProgress,
      function () { return totalStages; });
    nw = sfCanonState.nw;
    workout = formatNormalizedForPrompt(nw);
    if (sfCanonWeeks) {
      totalStages += (sfCanonWeeks - weekCount);
      weekCount = sfCanonWeeks;
    }
  }
  var sfWorkoutLifecycle = describeWorkoutLifecycle(sfCanonState);

  // ── Telemetry + continuity accumulators ──
  var sfTelemetry = [];
  var sfContinuityWarnings = [];

  // ══════════════════════════════════════════════════════════════════════
  // STAGE 0.5: THE GAME RULEBOOK (VISION §4.0, D173)
  // ══════════════════════════════════════════════════════════════════════
  // Same runner, same builder, same placement as the multi-stage path: FIRST.
  // The one thing that differs is which seat downstream is the spine's, and
  // that difference is why the parity floor takes its label as a parameter.
  var sfRulebookState = await runGameRulebookStage(settings, {
    cached: cached('gameRulebook'),
    checkpoint: checkpoint,
    onProgress: onProgress,
    rateLimiter: rateLimiter,
    budgetEnforce: useGeminiBudget,
    trialMode: trialMode,
    telemetryCollector: sfTelemetry,
    divergenceSeed: divergenceSeed,
    repairDirective: sfRepairDirectiveFor('gameRulebook'),
    progress: progress,
    getStageIndex: function () { return stageNum; },
    getTotalStages: function () { return totalStages; },
    emitRestored: function () {
      console.log('[S+F] Resuming — game rulebook loaded from checkpoint');
      progress('gameRulebook', 'Game rulebook restored from checkpoint.');
      emitPipelineEvent(onProgress, stageNum, totalStages, 'Game rulebook restored from checkpoint.', {
        phase: 'complete', stageKey: 'gameRulebook', stageName: 'Game Rulebook',
        completionSource: 'checkpoint'
      });
    },
    buildPrompt: function (retryState) {
      return builders.gameRulebook(workout, brief, {
        retryMode: retryState.attempt > 0,
        weekCount: weekCount,
        divergenceSeed: divergenceSeed
      });
    }
  });
  checkpoint = sfRulebookState.checkpoint;
  var sfGameRulebook = (sfRulebookState.rulebook || {}).gameRulebook || null;
  console.log('[S+F] ' + describeGameRulebook(sfGameRulebook));

  // ════════════════════════════════════════════════════════════════════
  // STAGE 1: SKELETON
  // ════════════════════════════════════════════════════════════════════

  // Same lifecycle as the shell stage — see resolveRunSeed. The skeleton is
  // this pipeline's compiler stage, so it is the seed's carrier here; the seed
  // itself was resolved at the top of the run (see sfRepairDirectiveFor).

  var skeleton;
  if (cached('skeleton')) {
    skeleton = checkpoint.stages.skeleton;
    console.log('[S+F] Resuming — skeleton loaded from checkpoint');
    progress('skeleton', 'Skeleton restored from checkpoint.');
    // completionSource is what tells the status surface this stage cost nothing.
    // Without it a restored stage renders as a paid API completion.
    emitPipelineEvent(onProgress, stageNum, totalStages, 'Skeleton restored from checkpoint.', {
      phase: 'complete', stageKey: 'skeleton', stageName: 'Skeleton',
      completionSource: 'checkpoint'
    });
  } else {
    progress('skeleton', 'Building structural skeleton\u2026');
    skeleton = await runJsonStage(settings, {
      stageKey:        'skeleton',
      stageName:        'Skeleton',
      stageIndex:       stageNum,
      getTotalStages:   function () { return totalStages; },
      completeMessage:  'Skeleton complete',
      onProgress:       onProgress,
      schema:           window.STRUCTURED_SCHEMA_SKELETON || null,
      maxAttempts:      trialMode ? TRIAL_ATTEMPTS : 2,
      rateLimiter:      rateLimiter,
      budgetEnforce:    useGeminiBudget,
      telemetryCollector: sfTelemetry,
      repairDirective:  sfRepairDirectiveFor('skeleton'),
      buildPrompt: function (retryState) {
        return builders.skeleton(workout, brief, {
          retryMode: retryState.attempt > 0,
          divergenceSeed: divergenceSeed,
          weekCount: weekCount,
          // This pipeline's compiler seat owes the GIVENS for the axes IT
          // authors — D144 W-3's lesson (a value demanded at a stage must be
          // SHOWN to that stage on both pipelines) with D128's other half kept:
          // SCHEMA_SKELETON names no designLanguage and no playSpine, so this
          // seat is shown eight axes rather than fifteen. A given it cannot
          // deliver would be doctrine false at its stage.
          seedAssignments: seedAssignments,
          identityAxes: identityAxesForStage('skeleton'),
          // THE RULEBOOK (D173). This is S+F's spine seat, so the document the
          // spine projects is shown here and checked in the same call.
          gameRulebook: sfGameRulebook
        });
      },
      validate: function (result) {
        // generationFloors turns on F2 (componentDialect), F5 (the cipher plan)
        // and F8 (the companion floor). The skeleton is the only stage that
        // sees the whole book at once, so it is where a book-level floor can
        // be held at all.
        // `brief` rides along for the D144 unearned-packet arm: a
        // classified-packet shell over a brief that names no institution owes a
        // written selectionReason. The floor cannot ask that question without
        // the brief, and this is the only seat that has it.
        return validateSkeletonStage(result, weekCount, {
          generationFloors: true,
          brief: brief,
          // D148, this seat's half: shown eight axes above, checked on eight.
          seedAssignments: seedAssignments,
          // D173 — the parity floor's evidence, the same object the builder
          // above is handed.
          gameRulebook: sfGameRulebook
        });
      }
    });
    recordSeedOnStage(skeleton, divergenceSeed);
    checkpoint = saveCheckpoint('skeleton', skeleton, checkpoint);

    // ── Downstream sweep after a cross-stage repair (D143) ─────────────
    // S+F's half of the same rule. The pre-flight above catches the door class
    // before any week is banked, so a route that lands here is for something it
    // cannot see — a voluntary door, a mute clock — and those CAN leave banked
    // weeks written against the old spine. Each is re-asked its own gate; only
    // the actual failures come back.
    if (sfRepairPending && sfRepairPending.to === 'skeleton') {
      var sfStale = sweepStaleBankedWeeks(checkpoint, {
        weekCount: weekCount,
        upstream: skeleton,
        spineStageLabel: 'Skeleton',
        plannedWeekShapes: (skeleton.weekPlan || []).map(function (w, i) {
          return {
            weekNumber: Number((w || {}).weekNumber) || (i + 1),
            isBoss: !!(w || {}).isBossWeek,
            isDeload: !!(w || {}).isDeload
          };
        })
      });
      if (sfStale.length) {
        sfStale.forEach(function (key) { delete checkpoint.stages[key]; });
        checkpoint = pruneCheckpointStages(checkpoint, sfStale);
        console.warn('[LiftRPG] Repair swept ' + sfStale.length + ' banked week(s): ' + sfStale.join(', '));
      }
    }
  }

  // THE RULEBOOK REACHES THE ARTIFACT (D173), S+F's half. `skeleton.meta`
  // becomes `booklet.meta` on this pipeline, so the stamp goes here — outside
  // the cached/uncached branch above, because a resumed skeleton must carry the
  // record too. It also means `generateFleshRulesPrompt` can read it off the
  // skeleton as its fallback, one document either way.
  applyGameRulebook(skeleton, sfRulebookState.rulebook);

  // Update stage estimate: rulebook + skeleton + knowing + rules + weeks
  // + 1 fragment call + 1 ending call
  var endingVariants = skeleton.endingVariants || ['canonical'];
  var fullFragRegistry = skeleton.fragmentRegistry || [];
  totalStages = 1 + 1 + 1 + 1 + (skeleton.weekPlan || []).length + 1 + 1;

  // Prompt caching: set system prompt from skeleton identity when the
  // resolved transport advertises support (capability, not format).
  if (transportSupports(settings, 'systemPromptCaching') && skeleton.meta) {
    settings._systemPrompt = [
      'You are writing content for a LiftRPG booklet.',
      'World contract: ' + (skeleton.meta.worldContract || ''),
      'Title: ' + (skeleton.meta.blockTitle || ''),
      'Voice: ' + JSON.stringify(skeleton.meta.narrativeVoice || {}),
      'Register: ' + JSON.stringify(skeleton.meta.literaryRegister || {}),
      'Always return valid JSON. No markdown fences.'
    ].join('\n');
  }

  // ════════════════════════════════════════════════════════════════════
  // STAGE 2: THE KNOWING — process particulars
  // ════════════════════════════════════════════════════════════════════
  // Runs after the skeleton (which authors the roster and the recorded
  // reading) and before any prose stage, because every prose stage from the
  // rules spread onward reads this world through skeleton.meta.

  var knowingOutput;
  if (cached('knowing')) {
    knowingOutput = checkpoint.stages.knowing;
    console.log('[S+F] Resuming — knowing loaded from checkpoint');
    progress('knowing', 'World detail restored from checkpoint.');
    emitPipelineEvent(onProgress, stageNum, totalStages, 'World detail restored from checkpoint.', {
      phase: 'complete', stageKey: 'knowing', stageName: 'World Detail',
      completionSource: 'checkpoint'
    });
  } else {
    progress('knowing', 'Working out how this world runs…');
    knowingOutput = await runJsonStage(settings, {
      stageKey:        'knowing',
      stageName:       'World Detail',
      stageIndex:      stageNum,
      getTotalStages:  function () { return totalStages; },
      completeMessage: 'World detail complete',
      onProgress:      onProgress,
      schema:          window.STRUCTURED_SCHEMA_KNOWING || null,
      maxAttempts:     trialMode ? TRIAL_ATTEMPTS : 2,
      rateLimiter:     rateLimiter,
      budgetEnforce:   useGeminiBudget,
      telemetryCollector: sfTelemetry,
      normalizeResult: normalizeKnowingShape,
      buildPrompt: function (retryState) {
        return builders.knowing(skeleton, brief, { retryMode: retryState.attempt > 0 });
      },
      validate: function (result) {
        return validateKnowingStage(result);
      }
    });
    checkpoint = saveCheckpoint('knowing', knowingOutput, checkpoint);
  }

  var sfParticulars = applyProcessParticulars(skeleton, knowingOutput);
  console.log('[S+F] ' + describeProcessParticulars(sfParticulars));

  // ════════════════════════════════════════════════════════════════════
  // STAGE 3: FLESH — RULES SPREAD
  // ════════════════════════════════════════════════════════════════════

  var rulesOutput;
  if (cached('rules')) {
    rulesOutput = checkpoint.stages.rules;
    console.log('[S+F] Resuming — rules loaded from checkpoint');
    progress('rules', 'Rules spread restored from checkpoint.');
    emitPipelineEvent(onProgress, stageNum, totalStages, 'Rules spread restored from checkpoint.', {
      phase: 'complete', stageKey: 'rules', stageName: 'Rules Spread',
      completionSource: 'checkpoint'
    });
  } else {
    progress('rules', 'Writing rules spread\u2026');
    rulesOutput = await runJsonStage(settings, {
      stageKey:        'rules',
      stageName:        'Rules Spread',
      stageIndex:       stageNum,
      getTotalStages:   function () { return totalStages; },
      completeMessage:  'Rules spread complete',
      onProgress:       onProgress,
      schema:           null,
      maxAttempts:      trialMode ? TRIAL_ATTEMPTS : 2,
      rateLimiter:      rateLimiter,
      budgetEnforce:    useGeminiBudget,
      telemetryCollector: sfTelemetry,
      // Same class as the finale stage above (D128): a freeform single-unit
      // stage whose validator names one required key and whose config had no
      // envelope rescue. {"rules": {"rulesSpread": {...}}} now unwraps; a
      // correct result already carries `rulesSpread` and is returned untouched.
      unwrapKey:        'rulesSpread',
      buildPrompt: function () {
        // THE RULEBOOK, COMPACT (D173). This stage writes the pages the
        // player is TAUGHT from, and §4.0's ruling is that what prints is the
        // point-of-use subset OF THIS DOCUMENT. Passed explicitly rather than
        // left to the builder's skeleton fallback, so the hand-over is visible
        // at the call site where a future reader looks for it.
        return builders.fleshRules(skeleton, { gameRulebook: sfGameRulebook });
      },
      validate: function (result) {
        if (!result || !result.rulesSpread) return 'Rules: missing rulesSpread';
        if (!result.rulesSpread.leftPage) return 'Rules: missing rulesSpread.leftPage';
        return '';
      }
    });
    checkpoint = saveCheckpoint('rules', rulesOutput, checkpoint);
  }

  // ════════════════════════════════════════════════════════════════════
  // STAGES 4–N: FLESH — PER-WEEK CONTENT
  // ════════════════════════════════════════════════════════════════════

  var weekOutputs = [];
  var weekSummariesSF = [];
  var allComponentValuesSF = [];
  var actualWeekCount = (skeleton.weekPlan || []).length;

  // ── The arsenal's week schedule (D170) ────────────────────────────────────
  // ONE derivation, two readers — this pipeline's twin of the multi-stage row
  // above the week loop. The skeleton's weekPlan already carries weekNumber and
  // isBossWeek, so the shapes are the plan itself.
  var ludicWeeksSF = deriveLudicWeekAssignments(
    ((skeleton || {}).meta || {}).playSpine,
    (skeleton.weekPlan || []).map(function (wp, i) {
      return { weekNumber: Number((wp || {}).weekNumber) || (i + 1), isBoss: !!(wp || {}).isBossWeek };
    })
  );

  for (var wSF = 0; wSF < actualWeekCount; wSF++) {
    var weekPlan = skeleton.weekPlan[wSF];
    var weekNum = weekPlan.weekNumber || (wSF + 1);
    var isBoss = !!weekPlan.isBossWeek;
    var ckKey = 'week_' + weekNum;
    var owesLudicSF = ludicWeeksSF.filter(function (row) {
      return Number(row.weekNumber) === Number(weekNum);
    })[0] || null;

    if (cached(ckKey)) {
      var cachedWeekSF = checkpoint.stages[ckKey];
      weekOutputs.push(cachedWeekSF);
      console.log('[S+F] Resuming — week ' + weekNum + ' loaded from checkpoint');
      progress(ckKey, 'Week ' + weekNum + ' restored from checkpoint.');
      emitPipelineEvent(onProgress, stageNum, totalStages, 'Week ' + weekNum + ' restored from checkpoint.', {
        phase: 'complete', stageKey: ckKey, stageName: 'Week ' + weekNum,
        completionSource: 'checkpoint'
      });
      if (!isBoss && cachedWeekSF.weeklyComponent && cachedWeekSF.weeklyComponent.value != null) {
        allComponentValuesSF.push(cachedWeekSF.weeklyComponent.value);
      }
      weekSummariesSF.push({
        weekNumber: weekNum,
        title: cachedWeekSF.title || '',
        arcBeat: weekPlan.arcBeat || '',
        sessionCount: (cachedWeekSF.sessions || []).length
      });
      continue;
    }

    // Extract this week's workout text
    var weekWorkout = null;
    if (typeof window.extractWeekWorkout === 'function') {
      weekWorkout = window.extractWeekWorkout(workout, [weekNum]);
    }

    progress(ckKey, 'Writing week ' + weekNum + (isBoss ? ' (boss)\u2026' : '\u2026'));

    // ── The week gate's floor context, HOISTED (D173) ─────────────────────
    // It was built inline inside `validate` below, which made it unreachable
    // from the prompt — so this pipeline's identity givens would have had to
    // re-read the skeleton, i.e. a second answer to what the gate asks. Hoisted
    // unchanged: every input is fixed for the whole week iteration
    // (allComponentValuesSF and weekOutputs are appended only after this stage
    // returns), so the object the validator receives is byte-identical to the
    // one it built for itself on every attempt.
    var sfWeekFloorOptions = {
      componentInputs: isBoss ? allComponentValuesSF.map(String) : undefined,
      approvedFragmentIds: weekPlan.fragmentIds || [],
      currentWeekNumber: weekNum,
      previousWeek: !isBoss && weekOutputs.length ? weekOutputs[weekOutputs.length - 1] : null,
      // ── Generation-floor context (Teeth Round T1a) ──────────────────
      // Unlike the multi-stage plan, the skeleton's weekPlan DOES carry
      // isDeload (it is in STRUCTURED_SCHEMA_SKELETON), so the plan is the
      // first source and the program text is the corroborating one.
      generationFloors: true,
      weekNumber: weekNum,
      isDeload: !!weekPlan.isDeload || looksLikeDeloadWeek(weekWorkout),
      // This pipeline's compiler seat (D129/D143) — 'Skeleton', not 'Shell'.
      spineStageLabel: 'Skeleton',
      mechanicGrammarFamily: (((skeleton || {}).meta || {}).artifactIntent || {}).mechanicGrammarFamily || '',
      playSpine: ((skeleton || {}).meta || {}).playSpine || null,
      // The arsenal row this week owes, if any — the same object the
      // prompt states as a GIVEN (D170).
      owesLudicEntry: owesLudicSF,
      // The currency, for the conversion floor — this pipeline's twin of
      // the multi-stage weekFloorOptions row. Both carry it or one pipeline
      // writes its reckoning sentences ungated.
      currencyLabel: (((skeleton || {}).meta || {}).economy || {}).currencyLabel || '',
      // This pipeline's twin of the multi-stage shellFamily row (D170).
      shellFamily: (((skeleton || {}).meta || {}).artifactIdentity || {}).shellFamily || ''
    };
    var sfWeekIdentityGiven = deriveWeekIdentityGiven(sfWeekFloorOptions, isBoss);

    var weekResult = await runJsonStage(settings, {
      stageKey:        ckKey,
      stageName:        'Week ' + weekNum + (isBoss ? ' (Boss)' : ''),
      stageIndex:       stageNum,
      getTotalStages:   function () { return totalStages; },
      completeMessage:  'Week ' + weekNum + ' complete',
      onProgress:       onProgress,
      schema:           null,
      maxAttempts:      trialMode ? TRIAL_ATTEMPTS : 3,
      rateLimiter:      rateLimiter,
      budgetEnforce:    useGeminiBudget,
      telemetryCollector: sfTelemetry,
      buildPrompt: function (retryState) {
        return builders.fleshWeek(skeleton, weekPlan, weekWorkout, weekSummariesSF, allComponentValuesSF, {
          retryMode: retryState.attempt > 0,
          // The GIVEN and the floor below read the same row (D170); the identity
          // givens and the floor below read the same OPTIONS OBJECT (D173).
          ludicWeekGiven: owesLudicSF,
          weekIdentityGiven: sfWeekIdentityGiven
        });
      },
      normalizeResult: function (result) {
        if (result && Array.isArray(result.weeks) && result.weeks.length === 1) {
          result = result.weeks[0];
        }
        normalizeCompanionComponents(result);
        if (result && Array.isArray(result.sessions) && result.sessions.length > 3) {
          result.overflow = true;
        }
        return result;
      },
      autoRepair: function (result) {
        // Build overflow registry context from skeleton weekPlan for S+F path
        var sfOverflowRegistry = [];
        if (weekPlan.overflowFragmentId) {
          sfOverflowRegistry.push({
            weekNumber: weekNum,
            id: weekPlan.overflowFragmentId,
            documentType: '' // S+F skeleton doesn't always specify type
          });
        }
        return autoRepairWeek(result, {
          weekNumber: weekNum,
          overflowRegistry: sfOverflowRegistry,
          weeklyComponentType: (skeleton.meta || {}).weeklyComponentType || '',
          approvedFragmentIds: weekPlan.fragmentIds || [],
          overflowFragmentId: weekPlan.overflowFragmentId || ''
        });
      },
      validate: function (result) {
        if (!result || !result.title) return 'Week ' + weekNum + ': missing title';
        if (!Array.isArray(result.sessions) || result.sessions.length === 0) {
          return 'Week ' + weekNum + ': missing or empty sessions';
        }
        // The hoisted object above (D173) — one row, two readers: this gate and
        // the identity GIVENS the prompt printed.
        var vResult = validateWeekSchema(result, isBoss, sfWeekFloorOptions);
        if (vResult && typeof vResult === 'object' && !vResult.valid) {
          // The VERDICT OBJECT, not a joined string. extractErrorList treats a
          // string as one error, so joining collapsed N defects with N
          // different owners into a single unroutable blob whose only prefix is
          // whichever error happened to sort first — and the router would then
          // either miss the route entirely or quote a week's defects into the
          // skeleton's prompt, which is D128's disease exactly. Returning the
          // object is also what the multi-stage week gate already does, so the
          // two pipelines now classify severity the same way (D19).
          return vResult;
        }
        return '';
      }
    });

    weekResult.weekNumber = weekNum;
    weekResult.isBossWeek = isBoss;
    weekResult.isDeload = !!weekPlan.isDeload;

    // Surface advisory warnings from schema validation
    var sfWeekValidation = validateWeekSchema(weekResult, isBoss, {
      componentInputs: isBoss ? allComponentValuesSF.map(String) : undefined,
      approvedFragmentIds: weekPlan.fragmentIds || [],
      currentWeekNumber: weekNum,
      previousWeek: !isBoss && weekOutputs.length ? weekOutputs[weekOutputs.length - 1] : null
    });
    if (sfWeekValidation.warnings && sfWeekValidation.warnings.length > 0) {
      console.warn('[pipeline] Week ' + weekNum + ' advisory:', sfWeekValidation.warnings);
      if (options.onStatus) options.onStatus('Week ' + weekNum + ': ' + sfWeekValidation.warnings.length + ' advisory warning(s)');
    }

    weekOutputs.push(weekResult);
    checkpoint = saveCheckpoint(ckKey, weekResult, checkpoint);

    if (!isBoss && weekResult.weeklyComponent && weekResult.weeklyComponent.value != null) {
      allComponentValuesSF.push(weekResult.weeklyComponent.value);
    }

    weekSummariesSF.push({
      weekNumber: weekNum,
      title: weekResult.title || '',
      arcBeat: weekPlan.arcBeat || '',
      sessionCount: (weekResult.sessions || []).length
    });
  }

  // ── Cross-stage continuity: weeks ──
  var weekContinuityCtx = {
    shell: skeleton,
    campaignPlan: skeleton,
    priorWeekChunkOutputs: []
  };
  var weekContinuityErrors = validateWeekChunkContinuity(
    { weeks: weekOutputs },
    weekContinuityCtx
  );
  if (weekContinuityErrors.length > 0) {
    console.warn('[S+F] Week continuity warnings:', weekContinuityErrors);
    for (var cwi = 0; cwi < weekContinuityErrors.length; cwi++) {
      sfContinuityWarnings.push({ stage: 'weeks', message: weekContinuityErrors[cwi] });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // STAGE N+1: FLESH — ALL FRAGMENTS (single call)
  // ════════════════════════════════════════════════════════════════════

  var allFragments = [];

  if (cached('fragments')) {
    allFragments = checkpoint.stages.fragments || [];
    console.log('[S+F] Resuming — fragments loaded from checkpoint');
    progress('fragments', 'Fragments restored from checkpoint.');
    emitPipelineEvent(onProgress, stageNum, totalStages, 'Fragments restored from checkpoint.', {
      phase: 'complete', stageKey: 'fragments', stageName: 'Fragments',
      completionSource: 'checkpoint'
    });
  } else {
    progress('fragments', 'Writing all fragments\u2026');

    var fragResultSF = await runJsonStage(settings, {
      stageKey:        'fragments',
      stageName:        'Fragments',
      stageIndex:       stageNum,
      getTotalStages:   function () { return totalStages; },
      completeMessage:  'Fragments complete',
      onProgress:       onProgress,
      schema:           null,
      maxAttempts:      trialMode ? TRIAL_ATTEMPTS : 2,
      rateLimiter:      rateLimiter,
      budgetEnforce:    useGeminiBudget,
      telemetryCollector: sfTelemetry,
      unwrapKey:        'fragments',
      buildPrompt: function () {
        return builders.fleshFragmentBatch(
          skeleton,
          fullFragRegistry,
          weekSummariesSF,
          [],   // no prior fragments (single call)
          0,    // batch index
          1     // total batches
        );
      },
      // THE GATE MUST JUDGE THE OBJECT THE PIPELINE BANKS (D168). `unwrapKey`
      // hands this stage a bare array, and the old validator built a throwaway
      // `{ fragments: [...] }` wrapper around it — so the coordinates the gate
      // publishes addressed an object that existed only inside the callback,
      // and delta repair could not reach this pipeline at all. Normalizing to
      // the wrapper here costs nothing (the caller below already reads either
      // shape) and makes one gate's coordinates true on both pipelines.
      normalizeResult: function (result) {
        return Array.isArray(result) ? { fragments: result } : result;
      },
      validate: function (result) {
        var fragsArray = result && Array.isArray(result.fragments) ? result.fragments : null;
        if (!fragsArray || fragsArray.length === 0) {
          return 'Fragments: missing or empty fragments array';
        }
        return validateFragmentsStage(result, fullFragRegistry, { generationFloors: true });
      }
    });

    // Normalize: fragResult may be array (from unwrapKey) or wrapper object
    allFragments = Array.isArray(fragResultSF)
      ? fragResultSF
      : (fragResultSF && fragResultSF.fragments ? fragResultSF.fragments : [fragResultSF]);
    checkpoint = saveCheckpoint('fragments', allFragments, checkpoint);
  }

  // ── Cross-stage continuity: fragments ──
  var fragContinuityCtx = {
    shell: skeleton,
    campaignPlan: skeleton,
    weekChunkOutputs: [{ weeks: weekOutputs }],
    expectedRegistry: skeleton.fragmentRegistry || []
  };
  var fragContinuityErrors = validateFragmentBatchContinuity(
    { fragments: allFragments },
    fragContinuityCtx
  );
  if (fragContinuityErrors.length > 0) {
    console.warn('[S+F] Fragment continuity warnings:', fragContinuityErrors);
    for (var cfi = 0; cfi < fragContinuityErrors.length; cfi++) {
      sfContinuityWarnings.push({ stage: 'fragments', message: fragContinuityErrors[cfi] });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // FINAL STAGE: FLESH — ALL ENDINGS (single call)
  // ════════════════════════════════════════════════════════════════════

  var allEndings = [];
  var finalWeekSummary = weekSummariesSF.length > 0 ? weekSummariesSF[weekSummariesSF.length - 1] : null;

  if (cached('endings')) {
    allEndings = checkpoint.stages.endings || [];
    console.log('[S+F] Resuming — endings loaded from checkpoint');
    progress('endings', 'Endings restored from checkpoint.');
    emitPipelineEvent(onProgress, stageNum, totalStages, 'Endings restored from checkpoint.', {
      phase: 'complete', stageKey: 'endings', stageName: 'Endings',
      completionSource: 'checkpoint'
    });
  } else {
    progress('endings', 'Writing all endings\u2026');

    var endingsResultSF = await runJsonStage(settings, {
      stageKey:        'endings',
      stageName:        'Endings',
      stageIndex:       stageNum,
      getTotalStages:   function () { return totalStages; },
      completeMessage:  'Endings complete',
      onProgress:       onProgress,
      schema:           null,
      maxAttempts:      trialMode ? TRIAL_ATTEMPTS : 2,
      rateLimiter:      rateLimiter,
      budgetEnforce:    useGeminiBudget,
      telemetryCollector: sfTelemetry,
      unwrapKey:        'endings',
      buildPrompt: function () {
        if (builders.fleshEndingsBundled) {
          return builders.fleshEndingsBundled(skeleton, endingVariants, finalWeekSummary, weekSummariesSF);
        }
        // Fallback: use single-ending builder for first variant (shouldn't reach here)
        return builders.fleshEnding(skeleton, endingVariants[0], finalWeekSummary, weekSummariesSF);
      },
      validate: function (result) {
        var endingsArray = Array.isArray(result) ? result : (result && result.endings ? result.endings : null);
        if (!endingsArray || endingsArray.length === 0) {
          return 'Endings: missing or empty endings array';
        }
        var errors = [];
        for (var ei = 0; ei < endingsArray.length; ei++) {
          var ending = endingsArray[ei];
          if (!ending) { errors.push('Ending [' + ei + ']: null'); continue; }
          if (!ending.content && !ending.body) {
            errors.push('Ending "' + (ending.variant || ei) + '": missing content');
          }
        }
        if (endingsArray.length < endingVariants.length) {
          errors.push('Endings: expected ' + endingVariants.length + ' variants but got ' + endingsArray.length);
        }
        // F6: the ending body cap costs a retry here. Book 1's endings ran ~3x
        // budget, and an ending that long does not just cost pages — the
        // renderer splits it across page breaks it was never composed for.
        collectBudgetBreaches({ endings: endingsArray }).forEach(function (b) {
          errors.push('Over budget: ' + b.message);
        });
        return errors.length > 0 ? errors.join('; ') : '';
      }
    });

    // Normalize: endingsResultSF may be array (from unwrapKey) or wrapper
    allEndings = Array.isArray(endingsResultSF)
      ? endingsResultSF
      : (endingsResultSF && endingsResultSF.endings ? endingsResultSF.endings : [endingsResultSF]);
    checkpoint = saveCheckpoint('endings', allEndings, checkpoint);
  }

  // ── Cross-stage continuity: endings ──
  var endingContinuityCtx = {
    shell: skeleton,
    campaignPlan: skeleton,
    weekChunkOutputs: [{ weeks: weekOutputs }],
    fragmentsOutput: { fragments: allFragments }
  };
  var endingContinuityErrors = validateEndingsContinuity(
    { endings: allEndings },
    endingContinuityCtx
  );
  if (endingContinuityErrors.length > 0) {
    console.warn('[S+F] Ending continuity warnings:', endingContinuityErrors);
    for (var cei = 0; cei < endingContinuityErrors.length; cei++) {
      sfContinuityWarnings.push({ stage: 'endings', message: endingContinuityErrors[cei] });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // ASSEMBLY + QUALITY GATE
  // ════════════════════════════════════════════════════════════════════

  // The final stage announces itself, exactly as the multi-stage pipeline
  // does. Without this the S+F run went silent the moment the last writing
  // stage finished: the panel's headline stayed frozen on "Writing all
  // endings…" while assembly, the quality gate and the whole critic loop ran
  // underneath it, every card read Complete, and the Quality card sat Pending.
  // Minutes of paid work with no stage claiming them (live run, 2026-08-11).
  emitPipelineEvent(onProgress, totalStages, totalStages,
    'Assembling the booklet and running the editorial review…', {
      phase: 'start',
      stageKey: 'quality',
      stageName: 'Quality Check'
    });

  // `nw`, not `options.nw`: canonicalization reassigns the local, and assembly
  // is the consumer that most needs the canonical form. Reading the option here
  // would hand assembly the empty raw-branch object while every prompt upstream
  // saw the structured one.
  var booklet = assembleSkeletonFleshBooklet(
    skeleton, rulesOutput, weekOutputs, allFragments, allEndings, nw
  );
  recordSeedOnBooklet(booklet, divergenceSeed);
  recordWorkoutLifecycle(booklet, sfWorkoutLifecycle);

  var identityContract = typeof buildIdentityContract === 'function'
    ? buildIdentityContract(skeleton, null)
    : null;
  if (identityContract) {
    enforceIdentityContract(booklet, identityContract);
    truthBoardStateMode(booklet, readPipelineDebris(booklet, '_assemblyDiagnostics') || []);
  }

  // generationFloors: this is the API path, so the simulated player's
  // soft-locks are blocking-class errors here (D111). The guided wizard and the
  // corpus call the same function without the flag and get warnings.
  var validationResult = validateAssembledBooklet(booklet, { generationFloors: true });
  writePipelineDebris(booklet, '_simReport', validationResult.sim);
  if (validationResult.errors && validationResult.errors.length > 0) {
    console.warn('[S+F] Assembly validation errors:', validationResult.errors);
  }
  if (validationResult.warnings && validationResult.warnings.length > 0) {
    console.warn('[S+F] Assembly validation warnings:', validationResult.warnings);
  }

  // ── Persist telemetry, continuity, and assembly diagnostics ──
  var report = generateQualityReport(booklet);
  var qualityGate = buildQualityGate(report);
  writePipelineDebris(booklet, '_qualityReport', report);
  writePipelineDebris(booklet, '_qualityGate', qualityGate);
  writePipelineDebris(booklet, '_pipeline', 'skeleton-flesh');
  writePipelineDebris(booklet, '_trialMode', trialMode);

  // Persist Layer 2 assembly diagnostics (serialization-safe, same shape as standard pipeline)
  writePipelineDebris(booklet, '_assemblyWarnings', {
    diagnostics: readPipelineDebris(booklet, '_assemblyDiagnostics') || [],
    validationErrors: validationResult.errors,
    validationWarnings: validationResult.warnings
  });
  delete booklet._x._assemblyDiagnostics;

  // Post-assembly artifact-intent drift diagnostics (Layer 3 planning contract)
  var driftResult = compareArtifactIntentDrift(booklet);
  writePipelineDebris(booklet, '_artifactIntentDrift', driftResult);
  if (driftResult.diagnostics.length > 0) {
    console.warn('[S+F] Artifact intent drift:', driftResult.diagnostics.length, 'issue(s)');
  }

  // Snapshot before the critic spends more money (see the same guard in
  // runApiPipeline): a run that dies mid-critic still leaves a complete,
  // already-paid-for booklet the user can recover.
  persistLastBooklet(booklet, { source: 'skeleton-flesh' });

  // ── COMPOSITION CRITIC LOOP (D66) ───────────────────────────
  var sfCriticReport = await runCriticLoop(settings, booklet, brief, {
    rateLimiter: rateLimiter,
    budgetEnforce: useGeminiBudget,
    onProgress: onProgress,
    telemetryCollector: sfTelemetry,
    trialMode: trialMode
  });
  if (sfCriticReport && sfCriticReport.revisedUnits > 0) {
    report = generateQualityReport(booklet);
    qualityGate = buildQualityGate(report);
    writePipelineDebris(booklet, '_qualityReport', report);
    writePipelineDebris(booklet, '_qualityGate', qualityGate);
  }

  emitPipelineEvent(onProgress, totalStages, totalStages, qualityGate.passed
    ? 'Assembled and validated locally on this device.'
    : 'Assembled locally. Quality warnings were found.', {
    phase: 'complete',
    stageKey: 'quality',
    stageName: 'Quality Check',
    completionSource: 'local'
  });

  writePipelineDebris(booklet, '_continuityWarnings', sfContinuityWarnings);

  // Build stage telemetry summary
  var totalLatencyMs = 0;
  var totalRetries = 0;
  var totalAttempts = 0;
  var totalTokens = 0;
  var totalCostUsd = 0;
  for (var ti = 0; ti < sfTelemetry.length; ti++) {
    totalLatencyMs += safeNumber(sfTelemetry[ti].latencyMs);
    totalRetries += safeNumber(sfTelemetry[ti].retries);
    totalAttempts += safeNumber(sfTelemetry[ti].attempts);
    var stUsage = sfTelemetry[ti].usage || {};
    totalTokens += safeNumber(stUsage.totalTokens);
    totalCostUsd += safeNumber(sfTelemetry[ti].estimatedCostUsd);
  }
  writePipelineDebris(booklet, '_stageTelemetry', {
    stages: sfTelemetry,
    summary: {
      totalStages: sfTelemetry.length,
      totalAttempts: totalAttempts,
      totalRetries: totalRetries,
      totalLatencyMs: totalLatencyMs,
      totalTokens: totalTokens,
      totalCostUsd: totalCostUsd
    }
  });

  persistLastBooklet(booklet, { source: 'skeleton-flesh' });
  clearCheckpoint();
  return booklet;
}

async function generateSkeletonFlesh(settings, workout, brief, onProgress) {
  var resolvedSettings = resolveStructuredPipelineSettings(settings);

  if (!resolvedSettings.apiKey && resolvedSettings.format !== 'anthropic') {
    var baseUrl = resolvedSettings.baseUrl || '';
    if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1') && !baseUrl.includes('ollama')) {
      throw new Error('API key required for Skeleton+Flesh pipeline');
    }
  }

  var nw = normalizeWorkoutParam(workout);
  var workoutText = nw.weeks.length > 0 ? formatNormalizedForPrompt(nw) : nw.rawText;
  var weekCount = nw.weekCount || (typeof window.parseWeekCount === 'function' ? window.parseWeekCount(workoutText) : 6);
  var totalSessions = 0;
  if (nw.weeks.length > 0) {
    for (var i = 0; i < nw.weeks.length; i++) {
      totalSessions += (nw.weeks[i].sessions || []).length;
    }
  }

  return runPipelineWithRepairRouting(runSkeletonFleshPipeline, {
    settings:      resolvedSettings,
    workout:       workoutText,
    rawWorkout:    workout,
    brief:         brief,
    onProgress:    onProgress,
    weekCount:     weekCount,
    totalSessions: totalSessions,
    nw:            nw,
    trialMode:     !!(settings.trialMode)
  });
}


// ── Single-pass generation (Standard mode) ────────────────────────────────────

async function generate(settings, workout, brief) {
  if (typeof window.beginLiftRpgPromptRun === 'function') window.beginLiftRpgPromptRun();
  if (typeof window.generatePrompt !== 'function') {
    throw new Error('Prompt generator not loaded. Please reload the page.');
  }

  var prompt = window.generatePrompt(workout, brief);
  var rawResponse = await callProvider(settings, prompt);
  return extractJson(rawResponse.text);
}


// ══════════════════════════════════════════════════════════════════════════════
// Guided-build audit helper
// ══════════════════════════════════════════════════════════════════════════════
// Runs all relevant validators/normalizers across guided-build stage outputs
// and returns a structured operator-facing report. Designed for the manual
// wizard workflow where retries are expensive.

function auditGuidedBuild(data) {
  data = data || {};
  var stages = [];
  var allIssues = [];

  // Helper: run a validator and produce a stage report
  function auditStage(stageName, fn) {
    var entry = { stage: stageName, status: 'ok', blocking: [], repairable: [], degraded: [], warnings: [] };
    try {
      fn(entry);
    } catch (err) {
      entry.blocking.push('Audit error: ' + err.message);
    }
    if (entry.blocking.length > 0) entry.status = 'blocking';
    else if (entry.repairable.length > 0) entry.status = 'repairable';
    else if (entry.degraded.length > 0) entry.status = 'degraded';
    else if (entry.warnings.length > 0) entry.status = 'ok'; // warnings don't change status
    stages.push(entry);

    // Collect all issues for recurrence analysis
    entry.blocking.forEach(function (m) { allIssues.push({ msg: m, severity: 'blocking', stage: stageName }); });
    entry.repairable.forEach(function (m) { allIssues.push({ msg: m, severity: 'repairable', stage: stageName }); });
    entry.degraded.forEach(function (m) { allIssues.push({ msg: m, severity: 'degraded', stage: stageName }); });
    return entry;
  }

  // Helper: classify error strings using existing classifier
  function classifyInto(entry, errors) {
    if (!errors || errors.length === 0) return;
    var classified = classifyValidationErrors(errors);
    classified.blocking.forEach(function (e) { entry.blocking.push(e); });
    classified.repairable.forEach(function (e) { entry.repairable.push(e); });
    classified.degraded.forEach(function (e) { entry.degraded.push(e); });
  }

  // ── Stage 1: Layer Bible / Foundation ──
  if (data.layerBible) {
    auditStage('layer-bible', function (entry) {
      // Normalize designPrinciples shape before validation
      var lb = data.layerBible;
      if (lb.designPrinciples !== undefined && lb.designPrinciples !== null) {
        if (typeof lb.designPrinciples === 'string') {
          lb.designPrinciples = [lb.designPrinciples];
          entry.repairable.push('designPrinciples was a string — normalized to array');
        } else if (!Array.isArray(lb.designPrinciples) && typeof lb.designPrinciples === 'object') {
          lb.designPrinciples = Object.values(lb.designPrinciples).map(function (v) { return String(v); });
          entry.repairable.push('designPrinciples was an object — normalized to array');
        }
      } else {
        lb.designPrinciples = [];
        entry.warnings.push('designPrinciples was missing — initialized to empty array');
      }

      var result = validateLayerBibleStage(lb);
      if (result) {
        classifyInto(entry, result.split('; '));
      }
    });
  }

  // ── Stage 2: Campaign Plan ──
  if (data.campaignPlan) {
    auditStage('campaign-plan', function (entry) {
      var result = validateCampaignPlanStage(data.campaignPlan);
      if (result) {
        classifyInto(entry, result.split('; '));
      }
      // Additional guided-build-specific checks
      var cp = data.campaignPlan;
      if (!Array.isArray(cp.overflowRegistry) || cp.overflowRegistry.length === 0) {
        entry.warnings.push('No overflow registry entries — overflow weeks will lack planned docs');
      }
      if (Array.isArray(cp.weeks) && Array.isArray(cp.overflowRegistry)) {
        var overflowWeeks = cp.weeks.filter(function (w) { return w.sessionCount > 3; });
        var registeredWeeks = {};
        cp.overflowRegistry.forEach(function (o) { registeredWeeks[o.weekNumber] = true; });
        overflowWeeks.forEach(function (w) {
          if (!registeredWeeks[w.weekNumber]) {
            entry.warnings.push('Week ' + w.weekNumber + ' has > 3 sessions but no overflow registry entry');
          }
        });
      }
    });
  }

  // ── Stage 3: Skeleton (S+F path) ──
  if (data.skeleton) {
    auditStage('skeleton', function (entry) {
      var weekCount = data.weekCount || (data.skeleton.weekPlan || []).length;
      var result = validateSkeletonStage(data.skeleton, weekCount);
      if (result) {
        classifyInto(entry, [result]);
      }
    });
  }

  // ── Stage 4: Week chunks ──
  if (data.weekChunks && data.weekChunks.length > 0) {
    data.weekChunks.forEach(function (chunk, ci) {
      var chunkLabel = 'week-chunk-' + (ci + 1);
      auditStage(chunkLabel, function (entry) {
        var context = {
          shell: data.shell || {},
          campaignPlan: data.campaignPlan || {},
          priorWeekChunkOutputs: data.weekChunks.slice(0, ci)
        };
        var errors = validateWeekChunkContinuity(chunk, context);
        classifyInto(entry, errors);

        // Per-week schema validation
        (chunk.weeks || []).forEach(function (week) {
          var isBoss = !!week.isBossWeek;
          var schemaResult = validateWeekSchema(week, isBoss);
          if (schemaResult && !schemaResult.valid) {
            classifyInto(entry, schemaResult.errors || []);
          }
          if (schemaResult && schemaResult.warnings) {
            schemaResult.warnings.forEach(function (w) { entry.warnings.push(w); });
          }
        });
      });
    });
  }

  // ── Stage 5: Fragment batches ──
  if (data.fragmentBatches && data.fragmentBatches.length > 0) {
    data.fragmentBatches.forEach(function (batch, bi) {
      auditStage('fragment-batch-' + (bi + 1), function (entry) {
        var context = {
          shell: data.shell || {},
          campaignPlan: data.campaignPlan || {},
          weekChunkOutputs: data.weekChunks || []
        };
        var errors = validateFragmentBatchContinuity(batch, context);
        classifyInto(entry, errors);
      });
    });
  }

  // ── Stage 6: Endings ──
  if (data.endings) {
    auditStage('endings', function (entry) {
      var context = {
        shell: data.shell || {},
        campaignPlan: data.campaignPlan || {},
        weekChunkOutputs: data.weekChunks || []
      };
      var errors = validateEndingsContinuity(data.endings, context);
      classifyInto(entry, errors);
    });
  }

  // ── Stage 7: Assembled booklet ──
  if (data.assembledBooklet) {
    auditStage('assembled-booklet', function (entry) {
      var vResult = validateAssembledBooklet(data.assembledBooklet);
      classifyInto(entry, vResult.errors || []);
      if (vResult.warnings) {
        vResult.warnings.forEach(function (w) { entry.warnings.push(w); });
      }
    });

    // Quality report + gate
    auditStage('quality-gate', function (entry) {
      var report = generateQualityReport(data.assembledBooklet);
      var gate = buildQualityGate(report);
      if (!gate.passed) {
        gate.blockers.forEach(function (b) { entry.degraded.push(b.message); });
      }
      // Artifact intent drift
      var drift = readPipelineDebris(data.assembledBooklet, '_artifactIntentDrift') || compareArtifactIntentDrift(data.assembledBooklet);
      if (drift.diagnostics && drift.diagnostics.length > 0) {
        drift.diagnostics.forEach(function (d) {
          if (d.severity === 'error') entry.blocking.push('[drift] ' + d.message);
          else entry.degraded.push('[drift] ' + d.message);
        });
      }
    });
  }

  // ── Recurrence analysis ──
  // Group issues by pattern code to surface systemic problems
  var patternMap = {};
  var PATTERN_RULES = [
    { pattern: /designPrinciples/i, code: 'design-principles-shape' },
    { pattern: /overflowDocument\.id.*not present in overflowRegistry/i, code: 'overflow-registry-mismatch' },
    { pattern: /overflowRegistry/i, code: 'overflow-registry-issue' },
    { pattern: /fragmentRef.*not present/i, code: 'fragment-ref-missing' },
    { pattern: /missing designSpec/i, code: 'missing-designspec' },
    { pattern: /missing epigraph/i, code: 'missing-epigraph' },
    { pattern: /componentInputs/i, code: 'component-inputs-mismatch' },
    { pattern: /weeklyComponent\.type.*does not match/i, code: 'weekly-component-type-mismatch' },
    { pattern: /visualArchetype/i, code: 'visual-archetype-issue' },
    { pattern: /interlude.*payloadType/i, code: 'interlude-payload-type' },
    { pattern: /companionComponent/i, code: 'companion-component-shape' },
    { pattern: /forbidden.*document/i, code: 'forbidden-document-drift' },
    { pattern: /dominant.*ecology/i, code: 'dominant-ecology-drift' },
    { pattern: /mechanic.*grammar.*mismatch/i, code: 'mechanic-grammar-drift' }
  ];

  allIssues.forEach(function (issue) {
    var matched = false;
    for (var pi = 0; pi < PATTERN_RULES.length; pi++) {
      if (PATTERN_RULES[pi].pattern.test(issue.msg)) {
        var code = PATTERN_RULES[pi].code;
        if (!patternMap[code]) patternMap[code] = { code: code, count: 0, severity: issue.severity, stages: [] };
        patternMap[code].count++;
        if (patternMap[code].stages.indexOf(issue.stage) === -1) patternMap[code].stages.push(issue.stage);
        // Escalate severity if any instance is blocking
        if (issue.severity === 'blocking') patternMap[code].severity = 'blocking';
        matched = true;
        break;
      }
    }
    if (!matched) {
      var genericCode = 'unclassified-' + issue.severity;
      if (!patternMap[genericCode]) patternMap[genericCode] = { code: genericCode, count: 0, severity: issue.severity, stages: [] };
      patternMap[genericCode].count++;
      if (patternMap[genericCode].stages.indexOf(issue.stage) === -1) patternMap[genericCode].stages.push(issue.stage);
    }
  });

  var recurrentPatterns = Object.keys(patternMap).map(function (k) { return patternMap[k]; })
    .sort(function (a, b) {
      var sevOrder = { blocking: 0, repairable: 1, degraded: 2 };
      return (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3) || b.count - a.count;
    });

  // ── Readiness flags ──
  var hasBlocking = stages.some(function (s) { return s.status === 'blocking'; });
  var preAssemblyStages = stages.filter(function (s) {
    return s.stage !== 'assembled-booklet' && s.stage !== 'quality-gate';
  });
  var preAssemblyBlocking = preAssemblyStages.some(function (s) { return s.status === 'blocking'; });
  var assemblyStage = stages.filter(function (s) { return s.stage === 'assembled-booklet'; })[0];
  var gateStage = stages.filter(function (s) { return s.stage === 'quality-gate'; })[0];

  return {
    stages: stages,
    recurrentPatterns: recurrentPatterns,
    readyForAssembly: !preAssemblyBlocking,
    readyForRenderer: !hasBlocking && assemblyStage && assemblyStage.status !== 'blocking',
    qualityGatePassed: gateStage ? gateStage.status !== 'blocking' && gateStage.status !== 'degraded' : null,
    summary: stages.map(function (s) { return s.stage + ': ' + s.status; }).join(', ')
  };
}


// ── Public API surface ──────────────────────────────────────────────────────

window.LiftRPGAPI = {
  PROVIDERS: PROVIDERS,
  // The pre-run estimate's only home (D135). index.html is a classic script and
  // cannot import a module, so the row reaches the interface through this seam
  // — which is what keeps the page/sheet/ceiling numbers out of the markup.
  PAGE_ESTIMATE: PAGE_ESTIMATE,
  listProviderModels: listProviderModels,
  refreshPricing: refreshPricing,
  generate: generate,
  generateMultiStage: generateMultiStage,
  generateStructured: generateStructured,
  generateSkeletonFlesh: generateSkeletonFlesh,
  clearCheckpoint: clearCheckpoint,
  getCheckpoint: getCheckpoint,
  // Durability surface: the resume economics the status UI and the eval bench
  // need, so neither has to reach into storage keys or recompute identity.
  checkpoint: {
    get: getCheckpoint,
    clear: clearCheckpoint,
    stages: countResumedStages,
    spend: getCheckpointSpend,
    // The pre-run reading: what this booklet has already cost across every
    // attempt on disk. Survives a page reload, which `spend` cannot.
    spendToDate: getCheckpointSpendToDate,
    fingerprint: computeRunFingerprint,
    getShelved: getShelvedCheckpoint,
    clearShelved: clearShelvedCheckpoint
  },
  // The one debris reader, exposed so the landing page reads through the same
  // function the pipeline writes with (D93). index.html is a classic script and
  // cannot import contract-constants; a second inline fallback there is exactly
  // how the new position gets read in one place and the legacy position in
  // another (D128 → W4a).
  readPipelineDebris: readPipelineDebris,
  manual: {
    structuredSchemas: {
      shell: STRUCTURED_SCHEMA_SHELL,
      // The spine injector, exported as a FUNCTION rather than as a second
      // pre-built schema: withPlaySpine() throws when prompt_rules.js has not
      // loaded, and a throw at module-evaluation time would take the whole API
      // surface down instead of the one stage that needs it.
      withPlaySpine: withPlaySpine
    },
    ensureArtifactIdentity: ensureArtifactIdentity,
    buildIdentityContract: buildIdentityContract,
    compareIdentityContract: compareIdentityContract,
    enforceIdentityContract: enforceIdentityContract,
    formatIdentityContractLines: formatIdentityContractLines,
    buildContinuityLedger: buildContinuityLedger,
    validateWeekChunkContinuity: validateWeekChunkContinuity,
    validateFragmentBatchContinuity: validateFragmentBatchContinuity,
    validateEndingsContinuity: validateEndingsContinuity,
    extractShellContext: extractShellContext,
    buildChunkContinuity: buildChunkContinuity,
    assembleBooklet: assembleBooklet,
    extractWeekSummaries: extractWeekSummaries,
    findBinaryChoiceWeek: findBinaryChoiceWeek,
    buildFragmentBatches: buildFragmentBatches,
    mergeFragmentBatches: mergeFragmentBatches,
    planFragmentBatchRecovery: planFragmentBatchRecovery,
    normalizeFragmentBatchResult: normalizeFragmentBatchResult,
    buildSmartRetryDirective: buildSmartRetryDirective,
    // ── The delta-repair seam (D167), exported for the gates ────────────────
    // Pure functions with no transport, no DOM and no window dependency, so the
    // floors harness can hold them to their contracts with no port and no
    // browser — the same stance the D143 routing seam takes.
    partitionDeltaRepair: partitionDeltaRepair,
    // The payload-aware wrapper and the refusal record (D168). Exported for the
    // same reason: the decision to re-roll instead of repair is now observable,
    // and a gate can only hold an observable decision to its contract if it can
    // call it.
    partitionDeltaRepairOn: partitionDeltaRepairOn,
    deltaRefusalRecord: deltaRefusalRecord,
    applyDeltaFixes: applyDeltaFixes,
    normalizeDeltaFixes: normalizeDeltaFixes,
    describeStageFailureCause: describeStageFailureCause,
    deltaRepairMaxRounds: DELTA_REPAIR_MAX_ROUNDS,
    buildCompactCampaignRetryPrompt: buildCompactCampaignRetryPrompt,
    assembleSkeletonFleshBooklet: assembleSkeletonFleshBooklet,
    validateSkeletonStage: validateSkeletonStage,
    buildSkeletonFragmentBatches: buildSkeletonFragmentBatches,
    classifyValidationErrors: classifyValidationErrors,
    autoRepairWeek: autoRepairWeek,
    validateWeekSchema: validateWeekSchema,
    normalizeShellShape: normalizeShellShape,
    validateShellSchema: validateShellSchema,
    validateLayerBibleStage: validateLayerBibleStage,
    normalizeCampaignPlanOwnership: normalizeCampaignPlanOwnership,
    validateCampaignPlanStage: validateCampaignPlanStage,
    normalizeDocumentTypes: normalizeDocumentTypes,
    auditGuidedBuild: auditGuidedBuild,
    buildCriticDigest: buildCriticDigest,
    buildFusionFrame: buildFusionFrame,
    formatFusionFrameBlock: formatFusionFrameBlock,
    // W4b — the walker and its critic projection, exposed for the same reason
    // the fusion frame is: the browser suite is where "does this run in the
    // door" is provable, and the sim's whole promise is that it does.
    buildSpineFrame: buildSpineFrame,
    formatSpineFrameBlock: formatSpineFrameBlock,
    simulateBook: simulateBook,
    validateCriticVerdict: validateCriticVerdict,
    normalizeCriticVerdict: normalizeCriticVerdict,
    summarizeVerdict: summarizeVerdict,
    selectRevisionTargets: selectRevisionTargets,
    criticGetUnit: getUnit,
    criticSetUnit: setUnit,
    criticDimensions: CRITIC_DIMENSIONS,
    structuralReopenScopes: STRUCTURAL_REOPEN_SCOPES,
    // The conductor's pure half. Exposed for the same reason the two frames
    // are: the measured projection is the anti-vacuity half of this pass, and
    // the browser suite is where it is provable against the real prompt
    // surfaces the stage actually builds from.
    buildConductorScore: buildConductorScore,
    formatConductorScoreBlock: formatConductorScoreBlock,
    validateConductorReport: validateConductorReport,
    normalizeConductorReport: normalizeConductorReport,
    conductorFailures: conductorFailures,
    formatConductorReportBlock: formatConductorReportBlock,
    conductorMechanisms: CONDUCTOR_MECHANISMS,
    conductorMaxFindings: CONDUCTOR_MAX_FINDINGS,
    revisionPreservesIdentity: revisionPreservesIdentity,
    revisionInventsKeys: revisionInventsKeys,
    unitFloorErrors: unitFloorErrors,
    // The loop itself, exposed for gating only. It stays HERE rather than in
    // modules/critic.js because it needs the stage runner and the validators
    // (D66) — but the seam T4 adds, a structural verdict reaching the revise
    // prompt as a reopened constraint, cannot be proven from the pure helpers
    // alone, and the stub bench never revises (its canned verdict passes round
    // one). A registered stub transport plus this handle is the only way to
    // gate tier 3 without spending real model money on every run of the suite.
    runCriticLoop: runCriticLoop,
    // ── The cross-stage repair seam (D143), exposed for two readers ──────
    // GATES: the routing decision is a pure function of a blocking-error list
    // and a stage order, so the floors harness can prove the whole policy —
    // ownership, hop bounds, the ledger shape, transport-blindness — with no
    // browser, no port and no model money.
    // THE GUIDED DOOR: `describeRepairRoute(err)` is the queryable shape a
    // surface reads to send an operator back to the OWNING card carrying
    // `directive` as its repair prompt. The guided path runs the same
    // validators, so the same defect routes to the same seat there; only the
    // performer of the re-entry differs (automatic here, a card there).
    planRepairRoute: planRepairRoute,
    describeRepairRoute: describeRepairRoute,
    buildRepairDirective: buildRepairDirective,
    repairStageOrder: REPAIR_STAGE_ORDER,
    repairStageNames: REPAIR_STAGE_NAMES,
    maxRepairHops: MAX_REPAIR_HOPS,
    sweepStaleBankedWeeks: sweepStaleBankedWeeks,
    repairSeedFromStage: repairSeedFromStage,
    resolveRepairAwareSeed: resolveRepairAwareSeed,
    derivePlannedWeekShapes: derivePlannedWeekShapes,
    collectVoiceTicFindings: collectVoiceTicFindings,
    collectLicensedMovePlacementFindings: collectLicensedMovePlacementFindings,
    scanTerminalVoiceTics: scanTerminalVoiceTics
  },
  // D157: exposed so the array arm is pinnable. The bug it fixes was invisible
  // precisely because nothing could ask this function a question.
  _validationFailed: validationFailed,
  _extractErrorList: extractErrorList,
  _extractJson: extractJson,
  _validateSchema: validateBookletSchema,
  _validateAssembled: validateAssembledBooklet,
  _normalizeWorkout: normalizeWorkoutParam,
  _buildIdentityContract: buildIdentityContract,
  _compareIdentityContract: compareIdentityContract,
  qualityReport: generateQualityReport,
  qualityGate: buildQualityGate,
  getDailyBudget: getDailyBudget,
  checkDailyBudget: checkDailyBudget,
  DAILY_CALL_LIMIT: DAILY_CALL_LIMIT,
  lastBooklet: null,
  lastBookletSavedAt: '',
  lastBookletSource: '',
  lastQualityReport: null,
  lastPricing: null
};

// Notify inline scripts that the API module has loaded.
// Because this file is type="module" (deferred), inline scripts run first
// and may need to re-initialize once window.LiftRPGAPI is available.
// The classic-IIFE prompt builders read this off `window` at call time — the
// same bridge workout-topology.js uses for buildWorkoutTopology. Bare rather
// than under LiftRPGAPI because generator.js is not an API consumer; it is a
// prompt surface that needs one derived number and must never restate the
// formula behind it.
window.cipherVarietyFloor = cipherVarietyFloor;

window.dispatchEvent(new Event('liftrpg-api-ready'));
