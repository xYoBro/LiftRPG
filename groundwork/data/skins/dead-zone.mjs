// ── Groundwork example skin: DEAD ZONE ───────────────────────────────────────
// Deployment-survival flavor (mission 3.6 default). Demonstrates every hook
// type the engine exposes. A skin is NEVER load-bearing: delete this file and
// the engine renders plain-language fallbacks for every slot.
//
// In full production, skins like this are LLM-generated via the chat-prompt or
// BYOK API pipeline (same dual path as LiftRPG booklets); this authored one is
// the reference shape. Slice scope: pull tree + session-frame hooks only.
//
// Premise: you are the lone maintainer of a relay station in a communications
// dead zone after a regional grid collapse. The station is a five-wing complex
// (one wing per tree). Restoring yourself and restoring the station are the
// same project — the wings open as the body does. Voice register: procedural
// surface, intimate undertow (house style), but its own voice — terse,
// field-expedient, dryly funny.

export const SKIN = {
  id: 'dead-zone',
  name: 'DEAD ZONE',
  version: '0.1.0',
  worldLine: 'The grid is down. The station holds. So will you.',

  // ── Tree voices (Disco Elysium-style skill-as-character) ──────────────────
  // The engine provides voiceSlot per tree; the skin casts it. Rest beats and
  // AARs in rooms owned by this tree are delivered in this voice.
  voices: {
    'pull-voice': {
      name: 'RIGGING',
      register: 'Ex-line-crew rigger. Counts everything. Trusts knots, distrusts adjectives. Secretly proud of you.',
      catchphrase: 'Load path is everything.',
      ttsHint: { style: 'low, unhurried, clipped sentences' }
    }
  },

  // ── Tier flavor names (hookSlot → diegetic name) ──────────────────────────
  // The plain name always remains available in the UI (fiction serves the
  // program); the flavor name is how the map labels the room.
  tierNames: {
    'pull-rows-t1': 'The Loading Ramp',
    'pull-rows-t2': 'Cable Run, Lower',
    'pull-rows-t3': 'The Service Crawl',
    'pull-rows-t4': 'Counterweight Pit',
    'pull-rows-t5': 'The Wide Gantry',
    'pull-rows-t6': 'Asymmetric Junction',
    'pull-rows-t7': 'The Single-Line Splice',
    'pull-rows-t8': 'Dead Man’s Anchor',
    'pull-bar-t1': 'The Hanging Gallery',
    'pull-bar-t2': 'Shoulder Stock Room',
    'pull-bar-t3': 'The Held Breath',
    'pull-bar-t4': 'Descent Control',
    'pull-bar-t5': 'The Half Climb',
    'pull-bar-t6': 'Mast Access',
    'pull-bar-t7': 'The High Touch',
    'pull-bar-t8': 'Lateral Transfer',
    'pull-bar-t9': 'The Traverse',
    'pull-bar-t10': 'Uneven Ascent'
  },

  // ── Session frame (mission brief → rest beats → debrief) ──────────────────
  // Every script is TTS-renderable: short numbered beats keyed to the
  // session's set/rest structure, written to be read aloud in 60-120s rest
  // slots. On-page text is the fallback rendering.
  sessionFrame: {
    brief: {
      title: 'WORK ORDER',
      script: 'Station log, day {{dayNumber}}. Grid still dark. Today’s order: {{wingName}} wing, {{roomCount}} rooms on the route{{bossClause}}. RIGGING has the manifest. Weather is irrelevant — we are indoors. Begin when ready.',
      bossClause: ', and a sealed door at the end of it'
    },
    debrief: {
      title: 'AFTER-ACTION REPORT',
      script: 'AAR filed, day {{dayNumber}}. Rooms cleared: {{roomsCleared}}. Recovered: {{lootSummary}}. Intel: {{intelCount}} fragment{{intelPlural}} to the board. {{bossLine}} Station integrity improved by exactly one session. That is how it improves. Log closed.',
      bossPassLine: 'The sealed door is sealed no longer.',
      bossFailLine: 'The sealed door held — and told us everything about its hinges.'
    },
    // Numbered rest beats — the narrative channel. One per rest slot.
    restBeats: {
      'success-beat': [
        'RIGGING: “Clean. Load path held the whole way. Mark the room and breathe — the next one isn’t going anywhere.”',
        'RIGGING: “You see how the dust sits in here? Nobody’s worked this room in a long time. Somebody does now.”'
      ],
      'fail-beat': [
        'RIGGING: “Room kept its secrets. Fine. We keep ours. What gave first — grip or line? Note it. That’s tomorrow’s splice.”',
        'RIGGING: “No salvage. Plenty of survey. A dead end on the map is worth two doors you only wondered about.”'
      ],
      'crit-beat': [
        'RIGGING: “...Huh. That’s the cleanest I’ve seen that done since before the grid went down. Don’t let it go to your head. Let it go to the log.”'
      ],
      'complication-beat': [
        'RIGGING: “Hold up. That sound — that wasn’t the building settling. Finish your rest. Eyes open on the next room.”'
      ],
      'boss-pass-beat': [
        'RIGGING: “Door’s open. I’d say something stirring, but you already heard the hinges. That was the speech.”'
      ],
      'boss-fail-beat': [
        'RIGGING: “It held. Doors do that — right up until they don’t. You touched the mechanism. We splice the weak strand, we come back, it opens. That’s not hope, that’s rigging.”'
      ]
    },
    // Deload beats (scripted story beats every 4-6 weeks; slice carries one)
    deloadBeats: [
      'RIGGING: “Light week. Don’t argue. A line that never slackens snaps — that’s not philosophy, that’s material science. Walk the cleared rooms. Touch the old anchors. They held because we let them rest.”'
    ],
    // Tutorial encounter framing (learn mode = field-manual entry + AAR)
    tutorial: {
      intro: 'NEW ROOM TYPE. RIGGING walks it first: reduced volume, one cue per set. The manual page unlocks when the AAR is filed.',
      aarPrompt: 'Field-manual protocol: record one set on your phone. Check it against the form standard — every point, honestly. File the AAR. The manual entry for this room is yours after that.'
    },
    // Assessment framing (character creation; impossible to fail by copy)
    assessment: {
      intro: 'INTAKE SURVEY. The station needs to know what it’s working with — not what you used to be, not what you plan to be. Climb the ladder until a rung says stop. Every rung you touch is a room already cleared.',
      outro: 'Survey complete. There is no failing an intake — there is only the map drawing itself around what’s true. Your wing assignments are posted. Work begins next session.'
    },
    // Intel-drop copy frame (boss fail → side quest assignment)
    intelDrop: 'INTEL DROP — {{faultName}}: {{sideQuestName}}. {{sideQuestNote}} Added to the route.'
  },

  // ── Boss intros (per gate, keyed by the tier whose boss it is) ────────────
  bossIntros: {
    'pull-bar-t6': 'The Mast Access door. Behind it, the station’s antenna mast — the whole point of this place. The door takes one payment: three honest pulls from a dead stop. It has never accepted a substitute.',
    default: 'A sealed door, marked with the standard of the next room beyond it. The standard is posted. The door is patient.'
  },

  // Map flavor (the five wings; slice renders pull only)
  map: {
    stationName: 'Relay Station K-9',
    wings: {
      pull: 'The Rigging Wing',
      push: 'The Pressure Wing',
      legs: 'The Foundation Wing',
      core: 'The Keel',
      handstand: 'The Mast'
    }
  }
};

export default SKIN;
