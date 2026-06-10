// ── Groundwork skin: DEAD ZONE (v2 — full narrative payload) ─────────────────
// Deployment-survival flavor. A skin is never load-bearing: delete this file
// and the engine renders plain fallbacks. But THIS file is where the game
// lives — the fragments are real documents you read, the rooms are places,
// the voice knows what your body just did.
//
// Story spine (fragments assemble it; chains deliver in order):
//   You are Keeper Nine of Relay Station K-9, alone since the Quiet — the
//   night every grid in the region went dark. Keeper Eight kept this station
//   for eleven years and vanished four months before you arrived. The logs
//   say Eight let the station fail. The logs are wrong. Eight UNBUILT it,
//   carefully, alone — and trained on this same rigging to be strong enough
//   to do it. The wing you are clearing is the route Eight took. The question
//   the archive keeps almost answering: why would a keeper silence their own
//   station — and why does the silence feel like it is protecting you?

export const SKIN = {
  id: 'dead-zone',
  name: 'DEAD ZONE',
  version: '0.2.0',
  worldLine: 'The grid is down. The station holds. So will you.',

  // ── Tree voice ─────────────────────────────────────────────────────────────
  voices: {
    'pull-voice': {
      name: 'RIGGING',
      register: 'Ex-line-crew rigger. Counts everything. Trusts knots, distrusts adjectives. Secretly proud of you.',
      ttsHint: { style: 'low, unhurried, clipped sentences' }
    }
  },

  // ── Tier flavor names (sectors of the Rigging Wing) ───────────────────────
  tierNames: {
    'pull-lever-t1': 'The Loading Ramp',
    'pull-lever-t2': 'Cable Run, Lower',
    'pull-lever-t3': 'The Level Gauge',
    'pull-lever-t4': 'Counterweight Pit',
    'pull-lever-t5': 'The Long Gantry',
    'pull-lever-t6': 'The Extended Boom',
    'pull-lever-t7': 'The Single-Line Splice',
    'pull-lever-t8': 'Dead Man’s Anchor',
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

  // ── Narrative rooms (exploration layer) ────────────────────────────────────
  // Each sector (= active tier) holds a pool of rooms. Door choice: before
  // each working set the player picks one of two frontier doors. The bias tag
  // is posted ON the door — the choice is informed, and it never touches the
  // set (same tier, same scheme, same rest behind every door).
  // bias: 'intel' | 'loot' | 'encounter' | 'story' — nudges the reward table.
  roomPools: {
    lever: [
      { id: 'r-manifest', name: 'Manifest Office', bias: 'intel', desc: 'Paper everywhere. Eight filed things here, then stopped filing.' },
      { id: 'r-spool', name: 'Spool Storage', bias: 'loot', desc: 'Cable drums taller than you. Some have been unwound by hand.' },
      { id: 'r-breaker', name: 'Breaker Gallery', bias: 'encounter', desc: 'Every switch is OFF. Switched off, not failed off.' },
      { id: 'r-locker', name: 'Crew Lockers', bias: 'story', desc: 'Eleven lockers. One name tag left: E. VOSS.' },
      { id: 'r-galley', name: 'The Galley', bias: 'story', desc: 'One mug on the drying rack. Washed. Placed. Waiting.' },
      { id: 'r-loading', name: 'Receiving Bay', bias: 'loot', desc: 'The last delivery was never unpacked.' },
      { id: 'r-workshop', name: 'Splice Workshop', bias: 'intel', desc: 'Half-finished joins, labeled in two different handwritings.' },
      { id: 'r-pumphouse', name: 'Pump House', bias: 'encounter', desc: 'Water moves through here. Something else might.' },
      { id: 'r-archive-anteroom', name: 'Archive Anteroom', bias: 'intel', desc: 'The card catalog has been re-sorted. Recently.' },
      { id: 'r-yard', name: 'The Cable Yard', bias: 'loot', desc: 'Open sky. The mast shadow falls across it like a sundial.' }
    ],
    bar: [
      { id: 'b-ladderwell', name: 'The Ladderwell', bias: 'story', desc: 'Forty rungs up into the dark. Chalk marks every ten.' },
      { id: 'b-harness', name: 'Harness Room', bias: 'loot', desc: 'Gear racks. One harness is missing. One is brand new.' },
      { id: 'b-relay', name: 'Relay Floor', bias: 'intel', desc: 'The boards are dark, but the dust says someone visits.' },
      { id: 'b-antenna-base', name: 'Antenna Base', bias: 'encounter', desc: 'The mast hums even with no power. You checked twice.' },
      { id: 'b-signalroom', name: 'The Signal Room', bias: 'intel', desc: 'Headphones on the desk, jack unplugged, cord coiled like it mattered.' },
      { id: 'b-counterweight', name: 'Counterweight Shaft', bias: 'encounter', desc: 'A four-story drop with a service cage. The cage is locked from inside.' },
      { id: 'b-roofwalk', name: 'The Roof Walk', bias: 'story', desc: 'Guy-wires fan out like the start of a map.' },
      { id: 'b-transformer', name: 'Transformer Vault', bias: 'loot', desc: 'Big iron, cold for months. Tools laid out mid-job.' },
      { id: 'b-mastlocker', name: 'Mast Locker', bias: 'story', desc: 'Climbing logs on a clipboard. The last entry is just a time: 03:14.' },
      { id: 'b-skybridge', name: 'The Skybridge', bias: 'intel', desc: 'Connects the wing to the mast proper. Wind owns it.' }
    ]
  },

  // Cross-wing teases: locked doors visible in the slice that name the other
  // trees — the metroidvania promise. (Slice: visible, never openable.)
  lockedDoors: [
    { name: 'The Pressure Wing', requires: 'Push tree', tease: 'A bulkhead marked with a flat hand. It does not move.' },
    { name: 'The Foundation Wing', requires: 'Legs tree', tease: 'Stairs descending past your light. The handrail is worn smooth.' },
    { name: 'The Keel', requires: 'Core tree', tease: 'A crawlspace hatch. Cold air rises from it, steady as breathing.' },
    { name: 'The Mast', requires: 'Handstand tree', tease: 'The ladder past the Skybridge. Eight chalked one word at the base: LATER.' }
  ],

  // ── THE ARCHIVE — found-document fragments (the real reward) ───────────────
  // Four chains, delivered in order within each chain. Intel rolls advance a
  // chain (seeded pick weighted by room bias). Every fragment ends on a hook
  // (Zeigarnik). 60-110 words each. documentTypes echo LiftRPG's families.
  fragments: [
    // ── CHAIN: STATION LOG (Eight's official record — procedural surface)
    { id: 'SL-01', chain: 'log', title: 'Station Log, Day 1 of the Quiet', documentType: 'fieldNote',
      body: 'Grid loss at 03:14, all sectors. Backup held forty minutes, then I shut it down myself to save the cells. Protocol says transmit status on emergency power. I did not. Writing that here because a log is supposed to be honest: I had the power, and I sat in the dark, and I did not transmit. Reason to follow when I have one.',
      hook: 'Reason to follow.' },
    { id: 'SL-02', chain: 'log', title: 'Station Log, Day 9', documentType: 'fieldNote',
      body: 'Inventory complete. We are over-provisioned for one keeper by a factor of eleven, which is what happens when the crew leaves and the supply schedule does not. Pulled the breakers in the east gallery — all of them, by hand, labeled. If headquarters reads this someday: the station did not fail. I want that on the record. The station was made quiet. There is a difference, and the difference is the job now.',
      hook: 'The difference is the job now.' },
    { id: 'SL-03', chain: 'log', title: 'Station Log, Day 31', documentType: 'fieldNote',
      body: 'A month dark. I have started maintenance on the rigging wing — not to restore it. To keep it CLIMBABLE. Those are different maintenance schedules, it turns out. I need the wing strong because I need to be able to reach the mast head alone, without power assist, on a day I cannot predict. Started training again. The log is not the place for that, but the manifest office has my numbers if anyone wants to laugh.',
      hook: 'On a day I cannot predict.' },
    { id: 'SL-04', chain: 'log', title: 'Station Log, Day 77', documentType: 'fieldNote',
      body: 'Storm took two guy-wires on the north stay. Re-tensioned both. Solo rigging at my age is a comedy nobody is watching. For the record, because records are what I have: the mast is sound, the station is dry, the silence is INTACT. I find I maintain the silence the way I used to maintain the signal. Same hands. Same checklists. Opposite job. Day off tomorrow. There are no days off.',
      hook: 'The silence is intact.' },
    { id: 'SL-05', chain: 'log', title: 'Station Log, Day 130', documentType: 'fieldNote',
      body: 'Someone walked the perimeter fence last night. Boot prints, size nine, stopping at the gate — not climbing, just standing. A long time, by the depth of them. The gate stayed shut. I want to be clear that I wanted to open it. The protocol I am writing as I go has one rule so far and the rule held: nothing in, nothing out, nothing TRANSMITTED. Whoever you are: I am sorry. I counted your footprints. There were enough of them to mean you waited.',
      hook: 'There were enough of them to mean you waited.' },
    { id: 'SL-06', chain: 'log', title: 'Station Log, final page', documentType: 'fieldNote',
      body: 'If a Ninth Keeper is reading this, the commission found my request letter, which means the commission still exists, which is more than I knew when I wrote it. The station will try to tell you I went strange out here. Fine. Read the personal file in the locker marked VOSS before you judge, and read the red ledger before you touch the mast. That is not advice. That is the whole of the law. — E. Voss, Keeper Eight',
      hook: 'Read the red ledger before you touch the mast.' },

    // ── CHAIN: PERSONAL (Eight's private notes — intimate undertow)
    { id: 'PV-01', chain: 'personal', title: 'Note found in a coat pocket', documentType: 'correspondence',
      body: 'M — You asked, the last time the line worked, why I stayed when the others rotated out. I gave you the pension answer. The true answer is that I can hear it now. Not a sound. The shape where a sound goes. Eleven years listening to this region breathe through a headset and you learn what its silence is supposed to sound like, and M, since the Quiet, the silence is wrong. It is the silence of something holding still. — E.',
      hook: 'The silence of something holding still.' },
    { id: 'PV-02', chain: 'personal', title: 'Training journal, first page', documentType: 'fieldNote',
      body: 'Day one numbers, written down so the only witness is honest: I cannot pull my own weight to the first rung. Sixty-one years old, eleven of them in a chair with headphones. Fine. The mast does not negotiate and neither does gravity, so the program is the program: hang, row, pull. The galley doorframe holds my weight. So will I, eventually. The funny thing about training alone at the end of the world is the complete absence of excuses. There is nothing here but the work and me. One of us will win.',
      hook: 'One of us will win.' },
    { id: 'PV-03', chain: 'personal', title: 'Training journal, month four', documentType: 'fieldNote',
      body: 'First full pull-up today. From a dead hang, like the manual says, no kick, no kidding myself. I hung at the top an extra second because nobody has ever earned a second like that one. M would laugh — eleven years she watched me take the elevator to the relay floor. I wrote the number on the ladderwell wall in chalk where I will see it on the hard days. The hard days are most of them. The number does not care. That is what I like about it.',
      hook: 'The number does not care.' },
    { id: 'PV-04', chain: 'personal', title: 'Unsent letter, water-stained', documentType: 'correspondence',
      body: 'M — A station is a promise that somebody is listening. I kept that promise eleven years, and now I keep its opposite, and here is what I have learned: they are the same promise. Someone has to be AT the listening post for the silence to mean anything. I am still at my post. The post turned inside out, is all. If this reaches you, the quarantine broke or I did. Either way, the garden behind the transformer vault is yours. I planted it the week I understood I was not leaving. — E.',
      hook: 'The week I understood I was not leaving.' },
    { id: 'PV-05', chain: 'personal', title: 'Note taped inside locker VOSS', documentType: 'correspondence',
      body: 'To the Ninth. By now you have rebuilt some of what I let them think was decay. Good. The strength matters — not for the climb. Anyone can climb. The strength matters because the day will come when the easy thing and the right thing split, up there on the mast, with your hands full of cable and the whole region waiting to hear itself again, and on that day the body that does the right thing will be the one that trained for it. I have left you everything except the choice. That one comes with the job. — E.V.',
      hook: 'I have left you everything except the choice.' },

    // ── CHAIN: TECHNICAL (manifests and diagrams with anomalies)
    { id: 'TM-01', chain: 'technical', title: 'Parts Manifest 44-C, annotated', documentType: 'form',
      body: 'Standard quarterly manifest, except: every transmitter component is marked DEFERRED in Eight’s hand, and every structural and rigging item is marked EXPEDITE. Six climbing harness inspections in one year — for a station with no climbing program. At the bottom, in pencil, a sum: hours of mast work needed for full manual teardown of the transmit array, divided into months, divided into training days. The arithmetic of someone planning to do a crew’s job alone.',
      hook: 'A crew’s job, alone.' },
    { id: 'TM-02', chain: 'technical', title: 'Wiring diagram, redrawn', documentType: 'inspection',
      body: 'The official schematic shows the station as built. Pinned over it, Eight’s revision: the receive path lovingly maintained, every redundancy intact — and the transmit path severed in fourteen places, each cut numbered, each numbered cut logged with a date. This was not sabotage. This was surgery. The receive side can hear a whisper from the far ridge. The transmit side could not call for help if the building were burning. Margin note: “Ears open. Mouth shut. K-9 protocol.”',
      hook: 'Ears open. Mouth shut.' },
    { id: 'TM-03', chain: 'technical', title: 'Power ledger, final quarter', documentType: 'form',
      body: 'Solar trickle, battery bank, consumption rows in a tight hand. One line item never named, only coded: ROOM 0 — eleven watts, constant, every day of the ledger. Eleven watts is a small lamp. Or an instrument that must never lose power. The ledger balances perfectly except for one week in the last quarter where consumption doubles and the margin says only: “It asked again. Held.” The next week, back to eleven watts.',
      hook: 'It asked again. Held.' },
    { id: 'TM-04', chain: 'technical', title: 'The Red Ledger (cover page only)', documentType: 'report',
      body: 'Bound in red cord, shelved in plain sight in the archive anteroom, which is the best hiding place there is. The cover page, typed: “RECEIVE LOG: ANOMALOUS. Entries 1–214. Keeper’s determination: NOT FOR RELAY. Begin at entry 119 if you doubt me. Begin at entry 1 if you doubt yourself.” The ledger itself is locked to a clasp you cannot open one-handed. Whatever opens it wants both your hands free — and strong.',
      hook: 'Begin at entry 119 if you doubt me.' },

    // ── CHAIN: SIGNAL (intercepts — the eerie ones)
    { id: 'SG-01', chain: 'signal', title: 'Receive log excerpt, undated', documentType: 'transcript',
      body: 'TRANSCRIPT, AUTO-RECEIVE, BAND 7: …carrier detected, no voice. Thirty-one seconds. Then the carrier repeated the station’s own sign-off tone — K-9’s tone, the one Eight retired the night of the Quiet — played back perfectly, twice. Note in margin: “We never broadcast that tone after the Quiet. There is no recording of it to play. It learned it BEFORE.”',
      hook: 'It learned it before.' },
    { id: 'SG-02', chain: 'signal', title: 'Receive log excerpt, day 161', documentType: 'transcript',
      body: 'BAND 7 AGAIN: carrier, then for the first time, structure. Not words. Intervals. Margin, Eight’s hand, steadier than it has any right to be: “It is counting. 3, 5, 8 — sets and reps, I would call it, if I called it anything. It is doing what I am doing. Getting stronger at its own kind of work. Quarantine holds. Keep training.”',
      hook: 'It is doing what I am doing.' },
    { id: 'SG-03', chain: 'signal', title: 'Receive log, the last entry Eight typed', documentType: 'transcript',
      body: 'BAND 7: forty minutes of carrier, the longest yet. At minute thirty-nine, one pulse of the K-9 sign-off tone — a question, if a tone can be one. Eight’s note, the handwriting careful: “Everything that listens eventually wants to answer. That is the whole danger of ears. The next keeper should know the mast is one day’s strong work from transmit-capable. I made sure it would take a strong day ON PURPOSE. Weak hands cannot make this mistake.”',
      hook: 'Weak hands cannot make this mistake.' }
  ],

  // ── Kit items (loot with bodies; keys create real map shortcuts) ──────────
  kitItems: [
    { id: 'k-headlamp', name: 'Keeper’s Headlamp', kind: 'tool', body: 'Eight’s, by the strap adjustment. The beam is honest and the switch is loud in a quiet building.' },
    { id: 'k-chalk', name: 'Tin of Chalk', kind: 'tool', body: 'Half gone. The other half is on the ladderwell wall, spelling out somebody’s numbers.' },
    { id: 'k-servicekey', name: 'Service Cage Key', kind: 'key', unlocks: 'counterweight-bypass', body: 'Opens the counterweight service cage — the climb between floors stops being the long way around.' },
    { id: 'k-spliceknife', name: 'Splice Knife', kind: 'tool', body: 'Kept sharp by someone who believed dull tools are a moral failing.' },
    { id: 'k-thermos', name: 'The Good Thermos', kind: 'comfort', body: 'Dented, green, marked E.V. Still seals. Some equipment is morale.' },
    { id: 'k-gatekey', name: 'Yard Gate Key', kind: 'key', unlocks: 'yard-gate', body: 'The cable yard connects to the receiving bay if you can open the yard gate. Now you can.' },
    { id: 'k-manual', name: 'Rigging Manual, annotated', kind: 'lore', body: 'A standard manual made non-standard by marginalia. Eight argues with chapter four and wins.' },
    { id: 'k-harness', name: 'The New Harness', kind: 'tool', body: 'Never worn. Tagged in Eight’s hand: FOR NINE. Sized close to right.' },
    { id: 'k-tuningfork', name: 'Calibration Fork', kind: 'lore', body: 'Stamped K-9. Strike it and the relay floor answers a half-second late, like the room is deciding whether to.' },
    { id: 'k-radiocard', name: 'Punched Access Card', kind: 'key', unlocks: 'signal-shortcut', body: 'Opens the signal room’s back stair. The headphones on the desk get closer to the work.' },
    { id: 'k-photograph', name: 'Photograph, sun-faded', kind: 'comfort', body: 'Eleven people on the loading ramp, squinting. On the back: crew of K-9, final rotation. Someone drew a small circle around their own face. Smallest person in the row.' },
    { id: 'k-rations', name: 'Sealed Ration Crate', kind: 'comfort', body: 'The good kind, the kind that got hoarded. Eight left it dead center in receiving where you could not miss it.' }
  ],

  // ── Session frame ──────────────────────────────────────────────────────────
  sessionFrame: {
    brief: {
      title: 'WORK ORDER',
      script: 'Station log, day {{dayNumber}}. Grid still dark. Today’s order: {{wingName}}, {{roomCount}} rooms on the route{{bossClause}}. RIGGING has the manifest. Begin when ready.',
      bossClause: ' — and the sealed door at the end of it'
    },
    debrief: {
      title: 'AFTER-ACTION REPORT',
      script: 'AAR, day {{dayNumber}}. Rooms cleared: {{roomsCleared}}. Recovered: {{lootSummary}}. Archive: {{intelCount}} new document{{intelPlural}}. {{bossLine}} Station integrity improved by exactly one session. Log closed.',
      bossPassLine: 'The sealed door is sealed no longer.',
      bossFailLine: 'The sealed door held — and told us everything about its hinges.'
    },

    // State-aware rest beats. First matching condition wins; conditions check
    // the engine context: outcome, branch, streak (consecutive hits), isFirstRoom,
    // postBossFail (a failed boss exists in history for this tier).
    restBeats: [
      { when: { kind: 'crit' }, lines: [
        'RIGGING: “...That, I would have signed off on a certified crew doing. Chalk it. Days like this are why the wall has room left.”'
      ] },
      { when: { kind: 'complication' }, lines: [
        'RIGGING: “Hold up. That noise wasn’t the building settling. Buildings settle DOWN. Finish your rest with your eyes on the door.”'
      ] },
      { when: { outcome: 'missed', branch: 'bar' }, lines: [
        'RIGGING: “Grip went before the back did — I watched it. That’s not failure, that’s a survey result. Towel work. We splice the weak strand first.”',
        'RIGGING: “The bar wins one. Fine. It’s been here longer than both of us. What gave out — write it down while it’s honest.”'
      ] },
      { when: { outcome: 'missed', branch: 'lever' }, lines: [
        'RIGGING: “The beam bent at the hips — I watched the line break. Hollow work on the mat. A lever is a plank that decided to fly.”',
        'RIGGING: “Short of the count. The count holds no grudge. It’ll be hanging right there next session.”'
      ] },
      { when: { outcome: 'partial' }, lines: [
        'RIGGING: “Most of a set is still work the station banks. But the window has a top for a reason. Next time we touch it.”'
      ] },
      { when: { streak: 3 }, lines: [
        'RIGGING: “Three clean in a row. You know what that is? Boring. Boring is the sound rigging makes when it’s done right. Stay boring.”'
      ] },
      // Trough inoculation (Papercut doctrine): sessions ~7-18 are the
      // documented flat zone. Forecasting the flatness IS the intervention.
      { when: { troughWindow: true, isFirstRoom: true }, lines: [
        'RIGGING: “Heads up. We’re in the flat weeks — the stretch where every program feels like nothing’s happening. That’s the forecast holding, not the work failing. Tendon and wire thicken in silence. Walk the room.”',
        'RIGGING: “Day-in-the-trough report: it will feel pointless today. It felt pointless to Eight too — there’s a journal page about it. The numbers kept moving anyway. Yours are moving. You just can’t hear it yet.”',
        'RIGGING: “Boredom check. Good. Boredom is the sound load-bearing work makes. Fireworks are for stations that are on fire.”'
      ] },
      { when: { isFirstRoom: true }, lines: [
        'RIGGING: “First room of the day. Cold building, warm hands by the end — that’s the whole trade. Manifest says move.”'
      ] },
      { when: { postBossFail: true }, lines: [
        'RIGGING: “Same wing as the door that held. It’s still there. It’s not going anywhere — that’s the good news AND the plan.”'
      ] },
      { when: {}, lines: [
        'RIGGING: “Clean. Load path held the whole way. Mark the room and breathe — the next one isn’t going anywhere.”',
        'RIGGING: “You see how the dust sits in here? Nobody’s worked this room in a long time. Somebody does now.”',
        'RIGGING: “Eight kept this wing climbable for a reason. Today the reason’s got your name on the duty sheet.”'
      ] }
    ],

    deloadBeats: [
      'RIGGING: “Light week. Don’t argue. A line that never slackens snaps — that’s not philosophy, it’s material science. Walk the cleared rooms. Touch the old anchors. They held because we let them rest.”'
    ],

    tutorial: {
      intro: 'NEW ROOM TYPE. RIGGING walks it first: reduced volume, one cue per set. The manual page unlocks when the AAR is filed.',
      aarPrompt: 'Field-manual protocol: record one set on your phone. Check it against the form standard — every point, honestly. File the AAR. The manual entry for this room is yours after that.'
    },

    assessment: {
      intro: 'INTAKE SURVEY. The station needs to know what it’s working with — not what you used to be, not what you plan to be. Climb the ladder until a rung says stop. Every rung you touch is a room already cleared.',
      outro: 'Survey complete. There is no failing an intake — there is only the map drawing itself around what’s true. Your wing assignments are posted. Work begins next session.'
    },

    intelDrop: 'INTEL DROP — {{faultName}}: {{sideQuestName}}. {{sideQuestNote}} Added to the route.',

    // First session of the trough window: the WORK ORDER carries the forecast.
    troughForecast: 'FORECAST, posted by the previous keeper and left up on purpose: “Weeks three through six feel like nothing. That is the program working at the depth where you cannot watch it. Attendance is the whole job until the feeling comes back. It comes back.”',

    // Implementation intention (intake closing — Gollwitzer, d≈0.65)
    intention: {
      prompt: 'Last line of the intake. Post the duty schedule — the station runs on schedules, not motivation:',
      afterLabel: 'After (an event that already happens daily)',
      afterPlaceholder: 'morning coffee / dropping the kids / logging off work',
      whereLabel: 'At (the place the bar lives)',
      wherePlaceholder: 'the hallway doorframe / the garage',
      display: 'DUTY SCHEDULE — after {{after}}, at {{where}}.'
    },

    // Storm protocol (minimum dose — protects the identity rep)
    storm: {
      button: 'Storm Protocol (two-minute day)',
      intro: 'STORM PROTOCOL. Bad day. The station does not need a session from you — it needs proof the keeper still exists. One easy set in a cleared room. Log it. Done is the whole standard today.',
      done: 'Anchor checked. Log entry filed. That was not a small thing: the chain is the asset, and the chain holds. Full work resumes when the weather does.',
      missCue: 'One missed day is an accident. Two is the start of a new habit. The station will take two minutes today over zero — Storm Protocol is on the board.'
    },

    // Weekly dispatch (review trends, not feelings)
    dispatch: {
      title: 'WEEKLY DISPATCH',
      intro: 'Trend review. Three-week windows, no feelings, no verdicts on single days — the log judges in trends or not at all.',
      frictionPrompt: 'One thing that pulled you off course this week (one line):',
      goalPrompt: 'One micro-goal for next week (specific enough to fail at):',
      close: 'Dispatch filed. Same time next week. The trend is the truth.'
    },

    // Zeigarnik: the AAR closes on a forward hook; the home screen repeats it.
    nextTeasers: {
      bossEligible: 'NEXT SESSION: the sealed door at {{bossDoor}}. The standard is posted. Rest like it matters.',
      newFragment: 'The archive grew today. {{lastFragmentHook}}',
      default: 'NEXT SESSION: {{focusRoom}} is on the manifest. The wing doesn’t clear itself.'
    }
  },

  // ── Encounter decision beats (texture choices — never training) ───────────
  // When a roll lands on an 'encounter' effect, the player gets a real choice.
  // Both options are pure narrative texture; one may award archive/kit.
  encounters: [
    {
      id: 'enc-watcher',
      prompt: 'Something is in the room with you. It holds very still, the way you are holding very still.',
      options: [
        { label: 'Put the light on it', result: 'A maintenance drone, dead for months, face-down like it tripped. Nothing holds a charge that long. Its little log light blinks once when your beam crosses it. Once is not none.', award: { type: 'intel' } },
        { label: 'Mark it and keep working', result: 'You chalk an X on the floor at a respectful distance. Professionals don’t investigate everything. Professionals come back with backup — and there is no backup, so the X will keep.', award: null }
      ]
    },
    {
      id: 'enc-knock',
      prompt: 'From beyond the far wall: three knocks. Evenly spaced. Patient.',
      options: [
        { label: 'Knock back twice', result: 'Silence for a ten-count. Then — two knocks. Whatever shares a wall with you can count. You file that under things the AAR will say calmly.', award: { type: 'intel' } },
        { label: 'Note the time, say nothing', result: 'Eight’s protocol, the one in the wiring diagram margin: ears open, mouth shut. You log the timestamp. The knocking does not repeat. Restraint is also an answer.', award: null }
      ]
    },
    {
      id: 'enc-door-ajar',
      prompt: 'A door you cleared last week stands ajar. You closed it. You remember closing it.',
      options: [
        { label: 'Sweep the room again', result: 'Everything as you left it — except the chalk tally on the wall, which has one more mark than your log says. Someone is keeping your count. Or correcting it.', award: { type: 'intel' } },
        { label: 'Close it and wedge it', result: 'The splice knife makes a fine wedge. Some mysteries you solve; some you just outlast. The door does not argue. Doors never do — that is what’s wrong with this one.', award: null }
      ]
    },
    {
      id: 'enc-power',
      prompt: 'For four seconds, the dead overhead light flickers on. The breakers to this gallery are OFF. You pulled them yourself.',
      options: [
        { label: 'Trace the circuit', result: 'The line back-feeds from somewhere past the archive anteroom — toward the eleven-watt room in the ledger. ROOM 0 is real, it has power, and now it has your attention.', award: { type: 'intel' } },
        { label: 'Finish the set count first', result: 'Work first. The light can perform for an empty room. By the time you look up it is dark again, and you are stronger than you were four seconds ago. Priorities.', award: null }
      ]
    }
  ],

  // ── Boss ceremony copy ─────────────────────────────────────────────────────
  bossCeremony: {
    approach: 'The {{doorName}} door. Sealed since before your rotation. The standard is bolted beside it on a steel plate, the way Eight posted everything: {{standard}}. Behind it: {{tease}}.',
    teases: {
      default: 'the next stretch of the wing, and whatever Eight left there',
      'pull-bar-t6': 'the mast access stair — the whole reason this wing exists'
    },
    beforeAttempt: 'RIGGING: “No audience. No second opinion. The door doesn’t grade effort, it grades the standard. Rest the full count, then go take it.”',
    passReveal: 'The mechanism gives. The door swings the way heavy doors do — slowly, and then all at once. {{sectorName}} is open. The map redraws itself while you stand there breathing.',
    failReveal: 'The door holds. You hang the attempt on the steel plate next to the standard, where Eight would have wanted the honesty posted. The door is patient. So is the program.'
  },

  map: {
    stationName: 'Relay Station K-9',
    // Key-item shortcuts drawn as cross-links between corridor positions
    // (branch + tier index, 0-based from the wing entrance).
    shortcutRoutes: {
      'yard-gate': { label: 'Yard Gate', from: ['lever', 1], to: ['bar', 1] },
      'counterweight-bypass': { label: 'Counterweight Bypass', from: ['lever', 3], to: ['bar', 4] },
      'signal-shortcut': { label: 'Signal Back Stair', from: ['lever', 5], to: ['bar', 7] }
    },
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
