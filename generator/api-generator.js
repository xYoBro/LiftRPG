/**
 * api-generator.js
 *
 * Client-side API integration for the LiftRPG prompt generator.
 * Supports Anthropic and any OpenAI-compatible provider (OpenAI, Groq,
 * Ollama, custom endpoints).
 *
 * Exposes: window.LiftRPGAPI = { PROVIDERS, generate(settings, workout, brief) }
 *
 * SECURITY: API keys are stored in localStorage by the caller and sent
 * directly to the provider. They never pass through any LiftRPG server.
 * Anthropic browser-side access requires the dangerous-direct-browser-access
 * header, which Anthropic provides for exactly this use case.
 */
'use strict';

// ── ES6 Module Imports ────────────────────────────────────────────────────────

import {
  DEFAULT_TIMEOUT_MS,
  MAX_OUTPUT_TOKENS,
  PROVIDERS,
  RATE_WINDOW_MS,
  RATE_MAX_CALLS,
  DAILY_CALL_LIMIT,
  DOCUMENT_TYPE_ENUM
} from './modules/constants.js';

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
  formatIdentityContractLines,
  buildContinuityLedger,
  extractShellContext,
  buildChunkContinuity,
  normalizeCompanionComponents,
  assembleBooklet,
  assembleStructuredBooklet,
  extractWeekSummaries,
  findBinaryChoiceWeek,
  enforceBookletDerivedFields,
  buildFragmentBatches,
  mergeFragmentBatches,
  buildSkeletonFragmentBatches,
  assembleSkeletonFleshBooklet,
  generatePatchPrompt
} from './modules/assembly.js';

import {
  validateWeekChunkContinuity,
  validateFragmentBatchContinuity,
  validateEndingsContinuity,
  validateBookletSchema,
  validateWeekSchema,
  validateShellSchema,
  validateAssembledBooklet,
  validateLayerBibleStage,
  validateCampaignPlanStage,
  validateWeeksStage,
  validateFragmentsStage,
  validateSkeletonStage
} from './modules/validation.js';

import {
  buildQualityGate,
  generateQualityReport
} from './modules/quality.js';

import {
  getDailyBudget,
  recordApiCall,
  isGeminiProvider,
  createRateLimiter,
  checkDailyBudget
} from './modules/budget.js';

import {
  loadCheckpoint,
  initCheckpoint,
  saveCheckpoint,
  clearCheckpoint,
  countResumedStages,
  getCheckpoint
} from './modules/checkpoint.js';

import {
  shouldRetryStageError,
  shouldSplitWeekChunk,
  shouldSplitFragmentBatch
} from './modules/error-classify.js';

import {
  detectProviderId,
  safeNumber,
  normalizeModelId,
  blankUsageTotals,
  addUsageTotals,
  refreshPricing,
  listProviderModels,
  callProvider,
  callProviderStructured,
  resolveStructuredPipelineSettings,
  allowsEmptyApiKey
} from './modules/provider.js';


// ── Structured Output JSON Schemas ──────────────────────────────────────────
// JSON Schema objects for Gemini native structured output (responseJsonSchema).
// Derived from STAGE1/STAGE2_OUTPUT_SCHEMA shapes + SCHEMA_SPEC field definitions
// in generator.js. Required fields match what the pipeline and
// validateAssembledBooklet() check. Deeply variable inner structures (fieldOps,
// bossEncounter) typed as generic objects — prompt text provides guidance.

var TILE_TYPE_ENUM = ['empty', 'cleared', 'locked', 'anomaly', 'current', 'inaccessible'];
var MAP_TYPE_ENUM = ['grid', 'point-to-point', 'linear-track', 'player-drawn'];
var VISUAL_ARCHETYPE_ENUM = ['government', 'cyberpunk', 'scifi', 'fantasy', 'noir',
  'steampunk', 'minimalist', 'nautical', 'occult', 'pastoral'];

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
          sessionBeatTypes: { type: 'array', items: { type: 'string' } }
        },
        required: ['weekNumber', 'arcBeat', 'isBossWeek', 'isBinaryChoiceWeek', 'sessionBeatTypes']
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
          documentType: { type: 'string' },
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
            boardStateMode: { type: 'string' },
            documentEcology: { type: 'string' },
            materialCulture: { type: 'string' },
            openingMode: { type: 'string' },
            rulesDeliveryMode: { type: 'string' },
            revealShape: { type: 'string' },
            unlockLogic: { type: 'string' },
            shellFamily: { type: 'string' },
            attachmentStrategy: { type: 'string' }
          },
          required: ['artifactClass', 'boardStateMode', 'shellFamily', 'attachmentStrategy']
        },
        weeklyComponentType: { type: 'string' },
        passwordEncryptedEnding: { type: 'string' },
        liftoScript: { type: 'string' }
      },
      required: ['schemaVersion', 'blockTitle', 'worldContract', 'narrativeVoice',
        'literaryRegister', 'structuralShape', 'artifactIdentity', 'weeklyComponentType']
    },
    cover: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        designation: { type: 'string' },
        subtitle: { type: 'string' },
        tagline: { type: 'string' },
        colophonLines: { type: 'array', items: { type: 'string' } },
        svgArt: { type: 'string' },
        coverArtCaption: { type: 'string' }
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
            sections: { type: 'array', items: { type: 'object' } }
          },
          required: ['title', 'sections']
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
        visualArchetype: { type: 'string', enum: VISUAL_ARCHETYPE_ENUM },
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

var STRUCTURED_SCHEMA_WEEKS = {
  type: 'object',
  properties: {
    weeks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          weekNumber: { type: 'integer' },
          title: { type: 'string' },
          epigraph: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              attribution: { type: 'string' }
            },
            required: ['text', 'attribution']
          },
          isBossWeek: { type: 'boolean' },
          isDeload: { type: 'boolean' },
          overflow: { type: 'boolean' },
          weeklyComponent: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              value: { type: 'string', nullable: true },
              extractionInstruction: { type: 'string' }
            },
            required: ['type', 'value', 'extractionInstruction']
          },
          sessions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sessionNumber: { type: 'integer' },
                label: { type: 'string' },
                storyPrompt: { type: 'string' },
                fragmentRef: { type: 'string' },
                exercises: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      sets: { type: 'integer' },
                      repsPerSet: { type: 'string' },
                      weightField: { type: 'boolean' },
                      notes: { type: 'string' }
                    },
                    required: ['name']
                  }
                },
                binaryChoice: {
                  type: 'object',
                  properties: {
                    choiceLabel: { type: 'string' },
                    promptA: { type: 'string' },
                    promptB: { type: 'string' }
                  }
                }
              },
              required: ['sessionNumber', 'label', 'storyPrompt', 'exercises']
            }
          },
          fieldOps: {
            type: 'object',
            properties: {
              mapState: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  mapType: { type: 'string', enum: MAP_TYPE_ENUM },
                  gridDimensions: {
                    type: 'object',
                    properties: {
                      columns: { type: 'integer' },
                      rows: { type: 'integer' }
                    },
                    required: ['columns', 'rows']
                  },
                  floorLabel: { type: 'string' },
                  currentPosition: {
                    type: 'object',
                    properties: {
                      col: { type: 'integer' },
                      row: { type: 'integer' }
                    },
                    required: ['col', 'row']
                  },
                  mapNote: { type: 'string' },
                  tiles: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        col: { type: 'integer' },
                        row: { type: 'integer' },
                        type: { type: 'string', enum: TILE_TYPE_ENUM },
                        label: { type: 'string' },
                        annotation: { type: 'string' }
                      },
                      required: ['col', 'row', 'type', 'label']
                    }
                  }
                },
                required: ['gridDimensions', 'currentPosition', 'tiles']
              },
              cipher: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  title: { type: 'string' },
                  body: {
                    type: 'object',
                    properties: {
                      displayText: { type: 'string' },
                      key: { type: 'string' },
                      workSpace: {
                        type: 'object',
                        properties: {
                          rows: { type: 'integer' },
                          cellCount: { type: 'integer' },
                          style: { type: 'string' }
                        }
                      },
                      referenceTargets: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['displayText', 'key']
                  },
                  extractionInstruction: { type: 'string' },
                  characterDerivationProof: { type: 'string' },
                  noticeabilityDesign: { type: 'string' }
                },
                required: ['type', 'title', 'body', 'extractionInstruction',
                  'characterDerivationProof', 'noticeabilityDesign']
              },
              oracleTable: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  instruction: { type: 'string' },
                  mode: { type: 'string' },
                  entries: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        roll: { type: 'string' },
                        text: { type: 'string' },
                        type: { type: 'string', enum: ['fragment', 'consequence'] },
                        fragmentRef: { type: 'string' },
                        paperAction: { type: 'string' }
                      },
                      required: ['roll', 'text', 'type']
                    }
                  }
                },
                required: ['title', 'instruction', 'mode', 'entries']
              },
              companionComponents: { type: 'array', items: { type: 'object' } }
            }
          },
          bossEncounter: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              narrative: { type: 'string' },
              mechanismDescription: { type: 'string' },
              componentInputs: { type: 'array', items: { type: 'string' } },
              decodingKey: {
                type: 'object',
                properties: {
                  instruction: { type: 'string' },
                  referenceTable: { type: 'string' }
                },
                required: ['instruction', 'referenceTable']
              },
              convergenceProof: { type: 'string' },
              passwordRevealInstruction: { type: 'string' },
              binaryChoiceAcknowledgement: {
                type: 'object',
                properties: {
                  ifA: { type: 'string' },
                  ifB: { type: 'string' }
                },
                required: ['ifA', 'ifB']
              }
            },
            required: ['title', 'narrative', 'mechanismDescription', 'componentInputs',
              'decodingKey', 'passwordRevealInstruction']
          },
          overflowDocument: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              documentType: { type: 'string', enum: DOCUMENT_TYPE_ENUM },
              inWorldAuthor: { type: 'string' },
              inWorldRecipient: { type: 'string' },
              inWorldPurpose: { type: 'string' },
              content: { type: 'string' },
              designSpec: DESIGN_SPEC_SCHEMA,
              authenticityChecks: AUTHENTICITY_CHECKS_SCHEMA
            },
            required: ['id', 'documentType', 'content']
          },
          interlude: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              reason: { type: 'string' },
              body: { type: 'string' },
              payloadType: { type: 'string', enum: ['none', 'narrative', 'cipher', 'map', 'clock', 'companion', 'fragment-ref', 'password-element'] },
              payload: {},
              spreadAware: { type: 'boolean' }
            },
            required: ['title', 'reason', 'body']
          },
          gameplayClocks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                clockType: { type: 'string' },
                segments: { type: 'integer' },
                startValue: { type: 'integer' },
                direction: { type: 'string', enum: ['fill', 'drain'] },
                linkedClockName: { type: 'string' },
                opposedClockName: { type: 'string' },
                thresholds: { type: 'array', items: { type: 'object' } },
                consequenceOnFull: { type: 'string' }
              },
              required: ['name', 'segments']
            }
          }
        },
        required: ['weekNumber', 'title', 'isBossWeek', 'sessions', 'weeklyComponent']
      }
    }
  },
  required: ['weeks']
};

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
          content: { type: 'string' },
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

function buildCompactCampaignRetryPrompt(workout, brief, layerBible, retryState) {
  var weekCount = parseWeekCountFromWorkout(workout);
  var midpoint = Math.ceil(weekCount / 2);
  var lastError = retryState && retryState.error ? truncateText(retryState.error.message || retryState.error, 180) : '';
  return [
    '# API Stage 2 — Story Plan (Compact Retry)',
    '',
    'Return JSON only.',
    'Generate a compact but complete campaign plan that matches this exact top-level shape:',
    '{"topology":{},"weeks":[],"bossPlan":{},"fragmentRegistry":[],"overflowRegistry":[]}',
    '',
    '## Hard Requirements',
    '- Use exactly ' + weekCount + ' weeks.',
    '- Week ' + midpoint + ' must be the binary choice week.',
    '- Week ' + weekCount + ' must be the boss week.',
    '- Every week needs: weekNumber, arcBeat, npcBeat, stateSnapshot, playerGains, zoneFocus, mapReuse, stateChange, newGateOrUnlock, weeklyComponentMeaning, oraclePressure, fragmentFunction, governingProcedure, companionChange, isBossWeek, isBinaryChoiceWeek, sessionBeatTypes.',
    '- fragmentRegistry must establish clues early, complicate them mid-block, and reveal them late.',
    '- Keep descriptions concise. Preserve clue economy, progression, and convergence logic.',
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

function isSlowPlanningModel(settings) {
  var providerId = detectProviderId(settings);
  var modelId = normalizeModelId(settings && settings.model);
  return (providerId === 'anthropic' && /^claude-opus/i.test(modelId))
    || (providerId === 'openai' && /(gpt-5(?:\.4)?-pro|o3-pro)/i.test(modelId));
}

function buildRetryDirective(stageName, attempt, err) {
  return [
    '',
    '## Retry Directive',
    '- This is retry ' + (attempt + 1) + ' for ' + stageName + '.',
    '- Keep prose concrete and high-signal, but slightly tighter so the full JSON completes cleanly.',
    '- Preserve named characters, shell identity, clue economy, and map continuity.',
    '- Fix the failure that caused the retry: ' + truncateText(((err && err.message) || 'unknown issue'), 240)
  ].join('\n');
}

function prefixStageError(stageName, err) {
  var message = String((err && err.message) || err || 'Unknown error');
  if (message.indexOf('[' + stageName + '] ') === 0) return err instanceof Error ? err : new Error(message);
  return new Error('[' + stageName + '] ' + message);
}

function getApiPromptBuilders() {
  return {
    stage1: window.generateApiStage1Prompt || window.generateStage1Prompt,
    stage2: window.generateApiStage2Prompt || window.generateStage2Prompt,
    shell: window.generateApiShellPrompt || window.generateShellPrompt,
    weeks: window.generateApiWeekChunkPrompt || window.generateWeekChunkPrompt,
    weekPlan: window.generateSingleWeekPlanPrompt,
    singleWeekFinal: window.generateSingleWeekFinalPrompt,
    fragments: window.generateApiFragmentsPrompt || window.generateFragmentsPrompt,
    singleFragment: window.generateSingleFragmentPrompt,
    fragmentBatch: window.generateApiFragmentBatchPrompt || window.generateFragmentBatchPrompt,
    endings: window.generateApiEndingsPrompt || window.generateEndingsPrompt,
    singleEnding: window.generateSingleEndingPrompt
  };
}

function assertApiPromptBuilders(builders) {
  // weekPlan is optional — the live pipeline uses campaignPlan weeks directly.
  // It's only used by the manual wizard path.
  if (!builders.stage1 || !builders.stage2 || !builders.shell || !builders.weeks ||
    !builders.singleWeekFinal ||
    !builders.fragments || !builders.singleFragment ||
    !builders.fragmentBatch || !builders.endings || !builders.singleEnding) {
    throw new Error('Pipeline generators not loaded. Please reload the page.');
  }
}

function createStageTelemetry(stageKey, stageName) {
  return {
    stageKey: stageKey || '',
    stageName: stageName || '',
    attempts: 0,
    provider: '',
    model: '',
    usage: blankUsageTotals(),
    estimatedCostUsd: 0,
    pricing: null
  };
}

function summarizeStageTelemetry(telemetry) {
  var usage = telemetry && telemetry.usage ? telemetry.usage : blankUsageTotals();
  return {
    stageKey: telemetry && telemetry.stageKey ? telemetry.stageKey : '',
    stageName: telemetry && telemetry.stageName ? telemetry.stageName : '',
    attempts: telemetry && telemetry.attempts ? telemetry.attempts : 0,
    provider: telemetry && telemetry.provider ? telemetry.provider : '',
    model: telemetry && telemetry.model ? telemetry.model : '',
    usage: {
      inputTokens: safeNumber(usage.inputTokens),
      outputTokens: safeNumber(usage.outputTokens),
      cachedInputTokens: safeNumber(usage.cachedInputTokens),
      cacheWriteTokens: safeNumber(usage.cacheWriteTokens),
      cacheReadTokens: safeNumber(usage.cacheReadTokens),
      reasoningTokens: safeNumber(usage.reasoningTokens),
      totalTokens: safeNumber(usage.totalTokens)
    },
    estimatedCostUsd: telemetry ? telemetry.estimatedCostUsd : 0,
    pricing: telemetry && telemetry.pricing ? Object.assign({}, telemetry.pricing) : null
  };
}

function recordStageUsage(telemetry, response) {
  if (!telemetry || !response || !response.usage) return;
  telemetry.attempts += 1;
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


// ── Core stage runner ─────────────────────────────────────────────────────────

async function runJsonStage(settings, config) {
  var attemptCount = config.maxAttempts || 2;
  var lastErr = null;
  var stageTelemetry = createStageTelemetry(config.stageKey, config.stageName);

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
    if (attempt > 0) prompt += buildRetryDirective(config.stageName, attempt, lastErr);
    var resolvedMaxTokens = typeof config.maxTokens === 'function'
      ? config.maxTokens(retryState)
      : config.maxTokens;
    var resolvedTimeoutMs = typeof config.requestTimeoutMs === 'function'
      ? config.requestTimeoutMs(retryState)
      : (config.requestTimeoutMs || settings.requestTimeoutMs || DEFAULT_TIMEOUT_MS);
    var stageSettings = resolvedTimeoutMs === (settings.requestTimeoutMs || DEFAULT_TIMEOUT_MS)
      ? settings
      : Object.assign({}, settings, { requestTimeoutMs: resolvedTimeoutMs });

    try {
      var response = config.schema
        ? await callProviderStructured(stageSettings, prompt, config.schema, resolvedMaxTokens, config.stageName)
        : await (async function () {
          var rawResponse = await callProvider(stageSettings, prompt, resolvedMaxTokens);
          return {
            result: extractJson(rawResponse.text),
            meta: rawResponse.meta,
            usage: rawResponse.usage
          };
        })();
      var result = response.result;
      recordStageUsage(stageTelemetry, response);

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
        if (typeof validationResult === 'string' && validationResult) {
          var err = new Error(validationResult);
          err.errorType = 'schema';
          err.retryable = true;
          throw err;
        } else if (validationResult && typeof validationResult === 'object' && validationResult.valid === false) {
          var errMsg = (validationResult.errors && validationResult.errors.length) ? validationResult.errors.join('; ') : 'Schema validation failed';
          var errObj = new Error(errMsg);
          errObj.errorType = validationResult.errorType || 'schema';
          errObj.retryable = validationResult.retryable !== false;
          throw errObj;
        }
      }
      emitPipelineEvent(config.onProgress, config.stageIndex || 0, config.getTotalStages ? config.getTotalStages() : 0, config.completeMessage || config.stageName, {
        phase: 'complete',
        stageKey: config.stageKey || '',
        stageName: config.stageName,
        telemetry: summarizeStageTelemetry(stageTelemetry)
      });
      return result;
    } catch (err) {
      lastErr = err;
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
    }
  }

  throw prefixStageError(config.stageName, lastErr || new Error('Unknown stage failure'));
}


// ── Week chunk + Fragment batch adaptive runners ──────────────────────────────

function collectWeeksAndValues(targetWeeks, targetValues, chunkOutput) {
  (chunkOutput.weeks || []).forEach(function (week) {
    targetWeeks.push(week);
    if (!week.isBossWeek && week.weeklyComponent &&
      week.weeklyComponent.value !== undefined && week.weeklyComponent.value !== null && week.weeklyComponent.value !== '') {
      targetValues.push(week.weeklyComponent.value);
    }
  });
}

async function generateWeekChunkAdaptive(settings, builders, config) {
  var stageName = config.weekNumbers.length === 1
    ? 'Week ' + config.weekNumbers[0]
    : 'Weeks ' + config.weekNumbers.join(',');

  try {
    return [await runJsonStage(settings, {
      stageName: stageName,
      schema: STRUCTURED_SCHEMA_WEEKS,
      maxTokens: MAX_OUTPUT_TOKENS,
      unwrapKey: 'weeks',
      maxAttempts: 2,
      normalizeResult: function (result) {
        if (result && result.meta && Array.isArray(result.weeks)) {
          console.warn('[LiftRPG] Week chunk output a full booklet — extracting weeks only');
          return { weeks: result.weeks };
        }
        return result;
      },
      validate: function (result) {
        return validateWeeksStage(result, config.weekNumbers);
      },
      buildPrompt: function (retryState) {
        return builders.weeks(
          config.workout,
          config.brief,
          config.layerBible,
          config.campaignPlan,
          config.weekNumbers,
          buildChunkContinuity(config.allPriorWeeks),
          config.allComponentValues,
          config.shellContext,
          retryState.attempt > 0 ? { retryMode: 'tight' } : undefined
        );
      }
    })];
  } catch (err) {
    if (!shouldSplitWeekChunk(err, config.weekNumbers)) throw err;
    console.warn('[LiftRPG] Splitting week chunk [' + config.weekNumbers.join(', ') + '] after failure:', err.message);

    var outputs = [];
    var stagedWeeks = config.allPriorWeeks.slice();
    var stagedValues = config.allComponentValues.slice();

    for (var i = 0; i < config.weekNumbers.length; i++) {
      var splitOutputs = await generateWeekChunkAdaptive(settings, builders, {
        workout: config.workout,
        brief: config.brief,
        layerBible: config.layerBible,
        campaignPlan: config.campaignPlan,
        weekNumbers: [config.weekNumbers[i]],
        allPriorWeeks: stagedWeeks,
        allComponentValues: stagedValues,
        shellContext: config.shellContext
      });
      splitOutputs.forEach(function (chunkOutput) {
        outputs.push(chunkOutput);
        collectWeeksAndValues(stagedWeeks, stagedValues, chunkOutput);
      });
    }

    return outputs;
  }
}

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
      maxTokens: MAX_OUTPUT_TOKENS,
      unwrapKey: 'fragments',
      maxAttempts: 2,
      rateLimiter: config.rateLimiter || null,
      budgetEnforce: config.budgetEnforce || false,
      validate: function (result) {
        return validateFragmentsStage(result, config.registry);
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

async function patchAssembledBooklet(settings, booklet, errors, identityContract) {
  try {
    var patchedResponse = await callProvider(
      settings,
      generatePatchPrompt(JSON.stringify(booklet, null, 2), errors, {
        identityContract: identityContract
      }),
      32000
    );
    var patched = extractJson(patchedResponse.text);
    enforceIdentityContract(patched, identityContract);
    enforceBookletDerivedFields(patched);
    var identityDrift = compareIdentityContract(patched, identityContract);
    if (identityDrift.length > 0) {
      console.warn('[LiftRPG] Patch drifted shell identity; restoring approved shell contract:', identityDrift);
      enforceIdentityContract(patched, identityContract);
    }
    return patched;
  } catch (patchErr) {
    console.warn('[LiftRPG] Patch stage failed, returning unpatched booklet:', patchErr.message);
    return booklet;
  }
}


// ── 10-Stage API Pipeline Orchestrator ────────────────────────────────────────

async function runApiPipeline(options) {
  if (typeof window.beginLiftRpgPromptRun === 'function') window.beginLiftRpgPromptRun();

  var settings = options.settings || {};
  var builders = getApiPromptBuilders();
  assertApiPromptBuilders(builders);

  var workout = options.workout || '';
  var brief = options.brief || '';
  var weekCount = options.weekCount || (typeof window.parseWeekCount === 'function' ? window.parseWeekCount(workout) : 6);
  var totalSessions = options.totalSessions || 0;

  // ── Checkpoint: resume from last completed stage if available ────
  var checkpoint = loadCheckpoint();
  var isResume = checkpoint && checkpoint.stages;
  var resumed = checkpoint ? countResumedStages(checkpoint) : 0;

  // Don't resume from a different pipeline type
  if (isResume && (!checkpoint.inputs || checkpoint.inputs.pipeline !== 'structured')) {
    console.warn('[structured] Found checkpoint from different pipeline — starting fresh');
    clearCheckpoint();
    checkpoint = null;
    isResume = false;
    resumed = 0;
  }

  if (resumed > 0) {
    console.log('[LiftRPG] Resuming pipeline from checkpoint (' + resumed + ' cached stages).');
  } else {
    // Fresh run — init checkpoint with inputs so UI can restore them on page load
    checkpoint = initCheckpoint({
      workout: workout,
      brief: brief,
      model: settings.model,
      provider: detectProviderId(settings),
      pipeline: 'structured'
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
      // Don't block — checkpoint resume makes partial runs viable
    }
  }

  // Initial estimation: 3 setup + weekCount (single-stage per week) + endings
  var totalStages = 3 + weekCount + 2;
  var stageNum = 0;
  var onProgress = options.onProgress;

  function progress(stageKey, message) {
    stageNum++;
    emitPipelineEvent(onProgress, stageNum, totalStages, message, {
      phase: 'start',
      stageKey: stageKey || '',
      stageName: message
    });
  }

  // ── STAGES 1, 2, 3 (Shell Setup) ──────────────────────────
  // Each stage checks for a cached checkpoint before calling the API.

  var layerBible;
  if (checkpoint && checkpoint.stages && checkpoint.stages.layerBible) {
    layerBible = checkpoint.stages.layerBible;
    stageNum++;
    console.log('[LiftRPG] Resumed: Layer Codex (cached)');
    emitPipelineEvent(onProgress, stageNum, totalStages, 'Layer codex restored from checkpoint.', { phase: 'complete', stageKey: 'layerBible', stageName: 'Layer Codex' });
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
      maxTokens: MAX_OUTPUT_TOKENS,
      requestTimeoutMs: 300000,
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
    emitPipelineEvent(onProgress, stageNum, totalStages, 'Story plan restored from checkpoint.', { phase: 'complete', stageKey: 'campaign', stageName: 'Story Plan' });
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
      requestTimeoutMs: function (retryState) {
        return retryState && retryState.attempt > 0 ? 300000 : 420000;
      },
      maxTokens: MAX_OUTPUT_TOKENS,
      maxAttempts: 2,
      rateLimiter: rateLimiter,
      budgetEnforce: useGeminiBudget,
      validate: validateCampaignPlanStage,
      buildPrompt: function (retryState) {
        if (!retryState || !retryState.attempt) {
          return builders.stage2(workout, brief, layerBible);
        }
        return buildCompactCampaignRetryPrompt(workout, brief, layerBible, retryState);
      }
    });
    checkpoint = saveCheckpoint('campaignPlan', campaignPlan, checkpoint);
  }

  if (!Array.isArray(campaignPlan.fragmentRegistry)) campaignPlan.fragmentRegistry = [];
  if (!Array.isArray(campaignPlan.overflowRegistry)) campaignPlan.overflowRegistry = [];

  var shell;
  if (checkpoint && checkpoint.stages && checkpoint.stages.shell) {
    shell = checkpoint.stages.shell;
    stageNum++;
    console.log('[LiftRPG] Resumed: Booklet Setup (cached)');
    emitPipelineEvent(onProgress, stageNum, totalStages, 'Booklet setup restored from checkpoint.', { phase: 'complete', stageKey: 'shell', stageName: 'Booklet Setup' });
  } else {
    progress('shell', 'Building booklet setup\u2026');
    shell = await runJsonStage(settings, {
      stageKey: 'shell',
      stageName: 'Booklet Setup',
      stageIndex: stageNum,
      completeMessage: 'Booklet setup complete.',
      onProgress: onProgress,
      getTotalStages: function () { return totalStages; },
      schema: STRUCTURED_SCHEMA_SHELL,
      maxTokens: MAX_OUTPUT_TOKENS,
      requestTimeoutMs: 300000,
      unwrapKey: 'meta',
      maxAttempts: 2,
      rateLimiter: rateLimiter,
      budgetEnforce: useGeminiBudget,
      normalizeResult: function (result) {
        if (result && result.meta && Array.isArray(result.weeks)) {
          delete result.weeks; delete result.fragments; delete result.endings;
        }
        if (result && result.meta && !('passwordEncryptedEnding' in result.meta)) {
          result.meta.passwordEncryptedEnding = '';
        }
        return result;
      },
      validate: function(result) {
        var v = validateShellSchema(result, { weekCount: weekCount, totalSessions: totalSessions });
        if (!v.valid) {
          return 'Shell schema validation: ' + v.errors.join('; ');
        }
        if (result && result.weeks) { delete result.weeks; }
        if (result && result.fragments) { delete result.fragments; }
        if (result && result.endings) { delete result.endings; }
        return '';
      },
      buildPrompt: function (retryState) { return builders.shell(brief, layerBible, campaignPlan, retryState.attempt > 0 ? { retryMode: 'tight' } : undefined); }
    });
    checkpoint = saveCheckpoint('shell', shell, checkpoint);
  }

  var identityContract = buildIdentityContract(shell, campaignPlan);
  var shellContext = extractShellContext(shell);

  // ── ANTHROPIC PROMPT CACHING ──────────────────────────────────
  if (settings.format === 'anthropic') {
    settings._systemPrompt = [
      'You are generating components of a LiftRPG print-and-play booklet.',
      'World contract: ' + (shellContext.worldContract || ''),
      'Identity contract: ' + JSON.stringify(identityContract),
      'Layer codex premise: ' + ((layerBible.storyLayer || {}).premise || ''),
      'Return valid JSON only. No markdown fences, no commentary.'
    ].join('\n');
  }

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
      emitPipelineEvent(onProgress, stageNum, totalStages, 'Week ' + w + ' restored from checkpoint.', { phase: 'complete', stageKey: 'weeks', stageName: 'Week ' + w });
      continue;
    }

    var continuityPacket = buildChunkContinuity(finalWeeks);
    var campaignWeekPlan = (campaignPlan.weeks || []).filter(function (pw) {
      return Number(pw.weekNumber) === w;
    })[0] || { weekNumber: w };

    progress('weeks', 'Writing Week ' + w + (isBossWeek ? ' (Boss)' : '') + '\u2026');
    var weekObject = await runJsonStage(settings, {
      stageKey: 'weeks',
      stageName: 'Week ' + w,
      stageIndex: stageNum,
      completeMessage: 'Week ' + w + ' complete.',
      onProgress: onProgress,
      getTotalStages: function () { return totalStages; },
      schema: null,
      maxTokens: MAX_OUTPUT_TOKENS,
      requestTimeoutMs: 180000,
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
      validate: function (result) {
        if (!result) return 'Week generation returned empty result. Model may have returned a shell instead of a week object.';
        if (!result.title) return 'Week object missing "title" field. Got keys: ' + Object.keys(result).slice(0, 5).join(', ');
        if (!result.sessions) return 'Week object missing "sessions" array. Got keys: ' + Object.keys(result).slice(0, 5).join(', ');
        return validateWeekSchema(result, isBossWeek, isBossWeek ? { componentInputs: allComponentValues } : undefined);
      },
      buildPrompt: function (retryState) {
        return builders.singleWeekFinal(workout, brief, layerBible, campaignPlan, campaignWeekPlan, shellContext, continuityPacket, allComponentValues);
      }
    });

    weekObject.weekNumber = w;
    if (isBossWeek) weekObject.isBossWeek = true;
    else weekObject.isBossWeek = false;

    // Schema validation safety net
    var weekValidation = validateWeekSchema(weekObject, weekObject.isBossWeek, weekObject.isBossWeek ? { componentInputs: allComponentValues } : undefined);
    if (!weekValidation.valid) {
      console.warn('[pipeline] Week ' + w + ' schema issues:', weekValidation.errors);
      if (options.onStatus) options.onStatus('Week ' + w + ': ' + weekValidation.errors.length + ' schema issue(s)');
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
  totalStages = 3 + weekCount + totalBatches + 1;

  for (var fb = 0; fb < fragmentBatches.length; fb++) {
    var batch = fragmentBatches[fb];
    var fragCacheKey = 'fragBatch_' + fb;
    var batchLabel = 'Fragments batch ' + (fb + 1) + '/' + totalBatches;

    if (checkpoint && checkpoint.stages && checkpoint.stages[fragCacheKey]) {
      var cachedFrags = checkpoint.stages[fragCacheKey];
      (cachedFrags.fragments || []).forEach(function (f) { finalFragments.push(f); });
      stageNum++;
      console.log('[LiftRPG] Resumed: ' + batchLabel + ' (cached)');
      emitPipelineEvent(onProgress, stageNum, totalStages, batchLabel + ' restored from checkpoint.', { phase: 'complete', stageKey: 'fragments', stageName: batchLabel });
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
    emitPipelineEvent(onProgress, stageNum, totalStages, 'Finale restored from checkpoint.', { phase: 'complete', stageKey: 'endings', stageName: 'Finale' });
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
      maxTokens: MAX_OUTPUT_TOKENS,
      requestTimeoutMs: 120000,
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
  console.log('[LiftRPG] Assembling booklet from ' + finalWeeks.length + ' weeks, ' + finalFragments.length + ' fragments, ' + finalEndings.length + ' endings.');

  var booklet = options.assemble(shell, assembledWeeksOutput, assembledFragmentsOutput, assembledEndingsOutput, campaignPlan);
  enforceIdentityContract(booklet, identityContract);

  var errors = validateAssembledBooklet(booklet);
  if (errors.warnings && errors.warnings.length > 0) {
    console.warn('[LiftRPG] Validation warnings:', errors.warnings);
  }

  if (errors.length > 0 && options.allowPatch !== false) {
    console.warn('[LiftRPG] Final assembly has', errors.length, 'validation errors:', errors);
    console.warn('[LiftRPG] Whole-booklet patching is disabled by policy. Returning aggressively unit-repaired booklet.');
  }

  var report = generateQualityReport(booklet);
  var qualityGate = buildQualityGate(report);
  booklet._qualityReport = report;
  booklet._qualityGate = qualityGate;
  if (!qualityGate.passed) {
    console.warn('[LiftRPG] Quality gate warnings (non-blocking):', qualityGate.blockers.map(function (entry) {
      return entry.message;
    }));
  }

  // Pipeline succeeded — clear the checkpoint so next run starts fresh
  clearCheckpoint();
  console.log('[LiftRPG] Pipeline complete. Checkpoint cleared.');

  return booklet;
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
    lines.push('Week ' + (wi + 1) + ':');
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


// ── Runtime pipeline entrypoints ─────────────────────────────────────────

async function generateMultiStage(settings, workout, brief, onProgress) {
  var nw = normalizeWorkoutParam(workout);
  var totalSessions = 0;
  (nw.weeks || []).forEach(function(w) { totalSessions += (w.sessions ? w.sessions.length : 0); });

  return runApiPipeline({
    settings: settings,
    workout: workout,
    brief: brief,
    weekCount: nw.weekCount,
    totalSessions: totalSessions,
    onProgress: onProgress,
    allowPatch: true,
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

  return runApiPipeline({
    settings: resolvedSettings,
    workout: workoutText,
    brief: brief,
    onProgress: onProgress,
    weekCount: weekCount,
    totalSessions: totalSessions,
    allowPatch: true,
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
    skeleton:           window.generateSkeletonPrompt           || null,
    fleshRules:         window.generateFleshRulesPrompt         || null,
    fleshWeek:          window.generateFleshWeekPrompt          || null,
    fleshFragmentBatch: window.generateFleshFragmentBatchPrompt || null,
    fleshEnding:        window.generateFleshEndingPrompt        || null
  };
}

function assertSkeletonFleshBuilders(builders) {
  var required = ['skeleton', 'fleshRules', 'fleshWeek', 'fleshFragmentBatch', 'fleshEnding'];
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

  // ── Setup ──
  if (typeof window.beginLiftRpgPromptRun === 'function') {
    window.beginLiftRpgPromptRun();
  }

  var builders = getSkeletonFleshBuilders();
  assertSkeletonFleshBuilders(builders);

  var useGeminiBudget = isGeminiProvider(settings);
  var rateLimiter = useGeminiBudget ? createRateLimiter(RATE_MAX_CALLS, RATE_WINDOW_MS) : null;

  // Estimate total stages (updated after skeleton provides fragment/ending counts)
  var totalStages = 1 + 1 + weekCount + 2 + 1;
  var stageNum = 0;

  function progress(stageKey, message) {
    stageNum++;
    emitPipelineEvent(onProgress, stageNum, totalStages, message, {
      phase: 'start', stageKey: stageKey, stageName: message
    });
  }

  // Checkpoint support
  var checkpoint = loadCheckpoint();
  var isResume = checkpoint && checkpoint.stages;

  // Don't resume from a different pipeline type
  if (isResume && (!checkpoint.inputs || checkpoint.inputs.pipeline !== 'skeleton-flesh')) {
    console.warn('[S+F] Found checkpoint from different pipeline — starting fresh');
    clearCheckpoint();
    checkpoint = null;
    isResume = false;
  }

  if (!isResume) {
    checkpoint = null;
    initCheckpoint({
      workout: workout.substring(0, 200),
      brief: (brief || '').substring(0, 200),
      model: settings.model || '',
      provider: detectProviderId ? detectProviderId(settings) : '',
      pipeline: 'skeleton-flesh'
    });
  }

  function cached(key) {
    return isResume && checkpoint.stages && checkpoint.stages[key];
  }

  // ════════════════════════════════════════════════════════════════════
  // STAGE 1: SKELETON
  // ════════════════════════════════════════════════════════════════════

  var skeleton;
  if (cached('skeleton')) {
    skeleton = checkpoint.stages.skeleton;
    console.log('[S+F] Resuming — skeleton loaded from checkpoint');
    progress('skeleton', 'Skeleton (cached)');
    emitPipelineEvent(onProgress, stageNum, totalStages, 'Skeleton (cached)', {
      phase: 'complete', stageKey: 'skeleton', stageName: 'Skeleton'
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
      maxTokens:        MAX_OUTPUT_TOKENS,
      requestTimeoutMs: 360000,
      maxAttempts:      2,
      rateLimiter:      rateLimiter,
      budgetEnforce:    useGeminiBudget,
      buildPrompt: function (retryState) {
        return builders.skeleton(workout, brief, {
          retryMode: retryState.attempt > 0
        });
      },
      validate: function (result) {
        return validateSkeletonStage(result, weekCount);
      }
    });
    saveCheckpoint('skeleton', skeleton, checkpoint);
  }

  // Update stage estimate now that we know fragment + ending counts
  var fragBatches = buildSkeletonFragmentBatches(skeleton);
  var endingVariants = skeleton.endingVariants || ['canonical'];
  totalStages = 1 + 1 + (skeleton.weekPlan || []).length + fragBatches.length + endingVariants.length;

  // Anthropic prompt caching: set system prompt from skeleton identity
  if (settings.format === 'anthropic' && skeleton.meta) {
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
  // STAGE 2: FLESH — RULES SPREAD
  // ════════════════════════════════════════════════════════════════════

  var rulesOutput;
  if (cached('rules')) {
    rulesOutput = checkpoint.stages.rules;
    console.log('[S+F] Resuming — rules loaded from checkpoint');
    progress('rules', 'Rules spread (cached)');
    emitPipelineEvent(onProgress, stageNum, totalStages, 'Rules spread (cached)', {
      phase: 'complete', stageKey: 'rules', stageName: 'Rules Spread'
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
      maxTokens:        MAX_OUTPUT_TOKENS,
      requestTimeoutMs: 120000,
      maxAttempts:      2,
      rateLimiter:      rateLimiter,
      budgetEnforce:    useGeminiBudget,
      buildPrompt: function () {
        return builders.fleshRules(skeleton);
      },
      validate: function (result) {
        if (!result || !result.rulesSpread) return 'Rules: missing rulesSpread';
        if (!result.rulesSpread.leftPage) return 'Rules: missing rulesSpread.leftPage';
        return '';
      }
    });
    saveCheckpoint('rules', rulesOutput, checkpoint);
  }

  // ════════════════════════════════════════════════════════════════════
  // STAGES 3–N: FLESH — PER-WEEK CONTENT
  // ════════════════════════════════════════════════════════════════════

  var weekOutputs = [];
  var weekSummariesSF = [];
  var allComponentValuesSF = [];
  var actualWeekCount = (skeleton.weekPlan || []).length;

  for (var wSF = 0; wSF < actualWeekCount; wSF++) {
    var weekPlan = skeleton.weekPlan[wSF];
    var weekNum = weekPlan.weekNumber || (wSF + 1);
    var isBoss = !!weekPlan.isBossWeek;
    var ckKey = 'week_' + weekNum;

    if (cached(ckKey)) {
      var cachedWeekSF = checkpoint.stages[ckKey];
      weekOutputs.push(cachedWeekSF);
      console.log('[S+F] Resuming — week ' + weekNum + ' loaded from checkpoint');
      progress(ckKey, 'Week ' + weekNum + ' (cached)');
      emitPipelineEvent(onProgress, stageNum, totalStages, 'Week ' + weekNum + ' (cached)', {
        phase: 'complete', stageKey: ckKey, stageName: 'Week ' + weekNum
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

    var weekResult = await runJsonStage(settings, {
      stageKey:        ckKey,
      stageName:        'Week ' + weekNum + (isBoss ? ' (Boss)' : ''),
      stageIndex:       stageNum,
      getTotalStages:   function () { return totalStages; },
      completeMessage:  'Week ' + weekNum + ' complete',
      onProgress:       onProgress,
      schema:           null,
      maxTokens:        MAX_OUTPUT_TOKENS,
      requestTimeoutMs: 300000,
      maxAttempts:      3,
      rateLimiter:      rateLimiter,
      budgetEnforce:    useGeminiBudget,
      buildPrompt: function (retryState) {
        return builders.fleshWeek(skeleton, weekPlan, weekWorkout, weekSummariesSF, allComponentValuesSF, {
          retryMode: retryState.attempt > 0
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
      validate: function (result) {
        if (!result || !result.title) return 'Week ' + weekNum + ': missing title';
        if (!Array.isArray(result.sessions) || result.sessions.length === 0) {
          return 'Week ' + weekNum + ': missing or empty sessions';
        }
        var vResult = validateWeekSchema(result, isBoss, {
          componentInputs: isBoss ? allComponentValuesSF.map(String) : undefined
        });
        if (vResult && typeof vResult === 'object' && !vResult.valid) {
          return (vResult.errors || []).join('; ');
        }
        return '';
      }
    });

    weekResult.weekNumber = weekNum;
    weekResult.isBossWeek = isBoss;
    weekResult.isDeload = !!weekPlan.isDeload;

    weekOutputs.push(weekResult);
    saveCheckpoint(ckKey, weekResult, checkpoint);

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

  // ════════════════════════════════════════════════════════════════════
  // STAGES N+1 to N+3: FLESH — FRAGMENT BATCHES
  // ════════════════════════════════════════════════════════════════════

  var allFragments = [];
  var priorFragments = [];

  for (var b = 0; b < fragBatches.length; b++) {
    var batchSF = fragBatches[b];
    var batchKey = 'fragBatch_' + b;

    if (cached(batchKey)) {
      var cachedFragsSF = checkpoint.stages[batchKey];
      allFragments = allFragments.concat(cachedFragsSF);
      priorFragments = priorFragments.concat(cachedFragsSF);
      console.log('[S+F] Resuming — fragment batch ' + b + ' loaded from checkpoint');
      progress(batchKey, 'Fragment batch ' + (b + 1) + ' (cached)');
      emitPipelineEvent(onProgress, stageNum, totalStages, 'Fragment batch ' + (b + 1) + ' (cached)', {
        phase: 'complete', stageKey: batchKey, stageName: 'Fragments ' + (b + 1)
      });
      continue;
    }

    progress(batchKey, 'Writing fragments batch ' + (b + 1) + '/' + fragBatches.length + '\u2026');

    var fragResult = await runJsonStage(settings, {
      stageKey:        batchKey,
      stageName:        'Fragments ' + (b + 1) + '/' + fragBatches.length,
      stageIndex:       stageNum,
      getTotalStages:   function () { return totalStages; },
      completeMessage:  'Fragment batch ' + (b + 1) + ' complete',
      onProgress:       onProgress,
      schema:           null,
      maxTokens:        MAX_OUTPUT_TOKENS,
      requestTimeoutMs: 180000,
      maxAttempts:      2,
      rateLimiter:      rateLimiter,
      budgetEnforce:    useGeminiBudget,
      unwrapKey:        'fragments',
      buildPrompt: function () {
        return builders.fleshFragmentBatch(
          skeleton,
          batchSF.registry,
          batchSF.weekSummaries.length > 0 ? batchSF.weekSummaries : weekSummariesSF,
          priorFragments,
          b,
          fragBatches.length
        );
      },
      validate: function (result) {
        // After unwrapKey, result should be a { fragments: [...] } object or the unwrapped array.
        // unwrapIfNeeded returns the object containing the key, so check both shapes.
        var fragsArray = Array.isArray(result) ? result : (result && result.fragments ? result.fragments : null);
        if (!fragsArray || fragsArray.length === 0) {
          return 'Fragments batch ' + (b + 1) + ': missing or empty fragments array';
        }
        // Wrap back into expected shape for validateFragmentsStage
        var wrapped = Array.isArray(result) ? { fragments: result } : result;
        return validateFragmentsStage(wrapped, batchSF.registry);
      }
    });

    // fragResult is the unwrapped array (due to unwrapKey: 'fragments')
    var batchFragmentsSF = Array.isArray(fragResult) ? fragResult : [fragResult];
    allFragments = allFragments.concat(batchFragmentsSF);
    priorFragments = priorFragments.concat(batchFragmentsSF);
    saveCheckpoint(batchKey, batchFragmentsSF, checkpoint);
  }

  // ════════════════════════════════════════════════════════════════════
  // FINAL STAGES: FLESH — ENDINGS
  // ════════════════════════════════════════════════════════════════════

  var allEndings = [];
  var finalWeekSummary = weekSummariesSF.length > 0 ? weekSummariesSF[weekSummariesSF.length - 1] : null;

  for (var e = 0; e < endingVariants.length; e++) {
    var variant = endingVariants[e];
    var endingKey = 'ending_' + e;

    if (cached(endingKey)) {
      allEndings.push(checkpoint.stages[endingKey]);
      console.log('[S+F] Resuming — ending "' + variant + '" loaded from checkpoint');
      progress(endingKey, 'Ending "' + variant + '" (cached)');
      emitPipelineEvent(onProgress, stageNum, totalStages, 'Ending "' + variant + '" (cached)', {
        phase: 'complete', stageKey: endingKey, stageName: 'Ending "' + variant + '"'
      });
      continue;
    }

    progress(endingKey, 'Writing ending "' + variant + '"\u2026');

    var endingResult = await runJsonStage(settings, {
      stageKey:        endingKey,
      stageName:        'Ending "' + variant + '"',
      stageIndex:       stageNum,
      getTotalStages:   function () { return totalStages; },
      completeMessage:  'Ending "' + variant + '" complete',
      onProgress:       onProgress,
      schema:           null,
      maxTokens:        MAX_OUTPUT_TOKENS,
      requestTimeoutMs: 120000,
      maxAttempts:      2,
      rateLimiter:      rateLimiter,
      budgetEnforce:    useGeminiBudget,
      buildPrompt: function () {
        return builders.fleshEnding(skeleton, variant, finalWeekSummary, weekSummariesSF);
      },
      validate: function (result) {
        if (!result) return 'Ending "' + variant + '": empty result';
        if (!result.content && !result.body) return 'Ending "' + variant + '": missing content';
        return '';
      }
    });

    allEndings.push(endingResult);
    saveCheckpoint(endingKey, endingResult, checkpoint);
  }

  // ════════════════════════════════════════════════════════════════════
  // ASSEMBLY + QUALITY GATE
  // ════════════════════════════════════════════════════════════════════

  var booklet = assembleSkeletonFleshBooklet(
    skeleton, rulesOutput, weekOutputs, allFragments, allEndings, options.nw
  );

  var identityContract = typeof buildIdentityContract === 'function'
    ? buildIdentityContract(skeleton, null)
    : null;
  if (identityContract) {
    enforceIdentityContract(booklet, identityContract);
  }

  var assemblyErrors = validateAssembledBooklet(booklet);
  if (assemblyErrors && assemblyErrors.length > 0) {
    console.warn('[S+F] Assembly validation warnings:', assemblyErrors);
  }

  var report = generateQualityReport(booklet);
  var qualityGate = buildQualityGate(report);
  booklet._qualityReport = report;
  booklet._qualityGate = qualityGate;
  booklet._pipeline = 'skeleton-flesh';

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

  return runSkeletonFleshPipeline({
    settings:      resolvedSettings,
    workout:       workoutText,
    brief:         brief,
    onProgress:    onProgress,
    weekCount:     weekCount,
    totalSessions: totalSessions,
    nw:            nw
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


// ── Public API surface ──────────────────────────────────────────────────────

window.LiftRPGAPI = {
  PROVIDERS: PROVIDERS,
  listProviderModels: listProviderModels,
  refreshPricing: refreshPricing,
  generate: generate,
  generateMultiStage: generateMultiStage,
  generateStructured: generateStructured,
  generateSkeletonFlesh: generateSkeletonFlesh,
  clearCheckpoint: clearCheckpoint,
  getCheckpoint: getCheckpoint,
  manual: {
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
    assembleSkeletonFleshBooklet: assembleSkeletonFleshBooklet,
    validateSkeletonStage: validateSkeletonStage,
    buildSkeletonFragmentBatches: buildSkeletonFragmentBatches
  },
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
  lastQualityReport: null,
  lastPricing: null
};

// Notify inline scripts that the API module has loaded.
// Because this file is type="module" (deferred), inline scripts run first
// and may need to re-initialize once window.LiftRPGAPI is available.
window.dispatchEvent(new Event('liftrpg-api-ready'));
