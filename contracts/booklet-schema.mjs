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
//     literaryRegister, storySpine, artifactIntent, cipher.body.workSpace,
//     interlude.payload — content varies legitimately there.
//
// Consumed by scripts/validate.js (Ajv 2020-12).

import {
  SCHEMA_VERSION,
  DOCUMENT_TYPE_ENUM,
  VALID_MAP_TYPES,
  VALID_COMPANION_TYPES,
  VALID_CLOCK_TYPES,
  VALID_PAYLOAD_TYPES,
  VALID_ARCHETYPES,
  VALID_SHELL_FAMILIES,
  VALID_BOARD_STATE_MODES,
  VALID_ATTACHMENT_STRATEGIES,
  ORACLE_ROLL_BANDS,
  SPATIAL_GUARDRAILS,
  PERCENTILE_STAT
} from './contract-constants.mjs';

var G = SPATIAL_GUARDRAILS;

var nonEmptyString = { type: 'string', minLength: 1 };
var hexColor = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' };
var xt = { type: 'object' }; // _x extension blob

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
        literaryRegister: { type: 'object' },
        structuralShape: { type: 'object', required: ['resolution'], additionalProperties: true },
        storySpine: { type: 'object' },
        artifactIdentity: {
          type: 'object',
          additionalProperties: true,
          properties: {
            shellFamily: { enum: VALID_SHELL_FAMILIES },
            boardStateMode: { enum: VALID_BOARD_STATE_MODES },
            attachmentStrategy: { enum: VALID_ATTACHMENT_STRATEGIES }
          }
        },
        artifactIntent: { type: 'object' },
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
            workSpace: { type: 'object' },
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
