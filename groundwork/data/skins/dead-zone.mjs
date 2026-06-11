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

  // ── Cold open (Sprint 2.1) ─────────────────────────────────────────────────
  // Three dealt cards before "Begin Intake": arrival, the dark station,
  // RIGGING's first words. ~60 seconds of read. Skin-optional: an engine with
  // no coldOpen goes straight to intake.
  coldOpen: [
    {
      kind: 'document',
      title: 'COMMISSION ORDER 9',
      documentType: 'form',
      body: 'TO THE NINTH KEEPER, RELAY STATION K-9. Proceed overland; the road holds as far as the gate. The grid in that region has been dark fourteen months. Your predecessor is four months missing, presumed walked out. Your commission is the standard one: keep the station. You will find it in worse condition than the file states. The file is wrong about that, among other things. Travel light. The station provides.',
      hook: '— REGIONAL COMMISSION (REMAINS OF)'
    },
    {
      kind: 'scene',
      title: 'THE STATION',
      body: 'You arrive at dusk and the gate is not locked. Inside, the dark is wrong for a ruin: the floors are swept. Every breaker in the east gallery is OFF — switched, labeled, in a careful hand. One mug stands washed on the galley rack. Chalk numbers climb a wall in the ladderwell, dated, the last set four months old. Nothing here failed. Somebody took this station apart the way you fold a flag.'
    },
    {
      kind: 'voice',
      title: 'THE INTERCOM',
      body: 'By the rigging-wing door, an intercom panel. One switch is taped ON — old tape, deliberate. You press the call key.',
      voiceLine: 'RIGGING: “…Took your time. I run the rigging wing — every line, every anchor, every count. I watched the last keeper rebuild a body on this bar one rung at a time, and I have kept the wing climbable since. Before you touch it: intake survey. It maps what showed up, not what you wish had. Begin when you are ready. I will be counting.”'
    }
  ],

  // ── Intake voice (Sprint 2.1): one RIGGING line per rung, keyed by sector ──
  // Character creation doubles as tutorial, first relationship scene, and
  // world tour: each line names the sector and coaches the test.
  intakeVoice: {
    'pull-lever-t1': 'RIGGING: “The Loading Ramp. Flat, honest ground — everything heavy came through here once. Face down. Show me the shoulder blades know three letters.”',
    'pull-bar-t1': 'RIGGING: “The Hanging Gallery. First law of the wing: before anything pulls, it hangs. Twenty seconds, relaxed, like you plan to stay. The bar has held worse.”',
    'pull-lever-t2': 'RIGGING: “Cable Run, Lower. Lines sag when nobody tensions them. You will not. Knees up, back rounded hollow, hold. A slack body is a snapped line waiting.”',
    'pull-bar-t2': 'RIGGING: “Shoulder Stock Room. Sockets and spares. Arms straight — lift the whole load with the blades alone. Small move. Everything above the third floor depends on it.”',
    'pull-lever-t3': 'RIGGING: “The Level Gauge. Eight kept a spirit level on every job. Today the level is you: tucked, hips up to bar height, horizontal. The bubble does not lie.”',
    'pull-bar-t3': 'RIGGING: “The Held Breath. Chin over the bar and stay. Not a pull — a refusal to come down. The wing respects stubborn.”',
    'pull-lever-t4': 'RIGGING: “Counterweight Pit. Loads move because something heavier agrees to drop. From the hang, pull the tuck up to horizontal. You are both weights today.”',
    'pull-bar-t4': 'RIGGING: “Descent Control. Any fool falls; riggers LOWER things. Top of the bar to a dead hang on a five count. The way down is the skill.”',
    'pull-lever-t5': 'RIGGING: “The Long Gantry. A beam that carries weight across distance. Body flat, pull the bar to the hips. Beams that bend get replaced.”',
    'pull-bar-t5': 'RIGGING: “The Half Climb. Halfway is not a failure of the whole climb — it is a rung of it. Dead hang, pull to eye level. Honest halves only.”',
    'pull-lever-t6': 'RIGGING: “The Extended Boom. The further the load rides from the mast, the more the mast must be. Knees at ninety now. Feel the lever argue.”',
    'pull-bar-t6': 'RIGGING: “Mast Access. The stair to the real work. Dead-hang pull-ups, chin clear, no kick. This is the door the whole wing was built to open.”',
    'pull-bar-t7': 'RIGGING: “The High Touch. Past the chin there is another inch, and the inch is where the work lives. Chest to the bar. Touch it; do not kiss at it.”',
    'pull-lever-t7': 'RIGGING: “The Single-Line Splice. One strand doing two strands’ work. One leg long, row it clean, both sides. Asymmetry finds every weak fiber. That is its job.”',
    'pull-bar-t8': 'RIGGING: “Lateral Transfer. Loads do not only travel up. One arm long, one arm working, both sides. The wing is wider than it is tall — be both.”',
    'pull-bar-t9': 'RIGGING: “The Traverse. Cross the bar without leaving it — over, across, return, both directions. Riggers who cannot traverse wait for ladders. We do not wait.”',
    'pull-lever-t8': 'RIGGING: “Dead Man’s Anchor. The last anchor Eight set. Legs wide, body flat, row. Past this point the wing has nothing left to teach you. Almost.”',
    'pull-bar-t10': 'RIGGING: “Uneven Ascent. One hand high, one low — the mast ladder lost rungs in the storm and nobody is replacing them. Climb what is there, not what should be.”'
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

  // ── SEASON (D40): eight weeks, eight titled episodes ───────────────────────
  // The commission is the campaign. Each calendar week is an episode with a
  // title and a through-line; the work order carries it, the weekly dispatch
  // closes it. Week 5 is the light week (OG deload doctrine, D41). Week 8 is
  // the finale: the transmit choice Eight left. Serialized cadence is the
  // retention engine (narrative transportation — see game-design-research.md).
  season: {
    commissionLine: 'COMMISSION: 8 weeks. Keep the station.',
    episodes: [
      { week: 1, title: 'ARRIVAL', line: 'A keeper learns the wing; the wing learns the keeper.' },
      { week: 2, title: 'THE ROUTE EIGHT TOOK', line: 'Every seal is a rung somebody climbed first.' },
      { week: 3, title: 'THE COUNTING', line: 'Three, five, eight. Something keeps sets too.' },
      { week: 4, title: 'THE CLERK', line: 'The mug. The catalog. The tally. Who keeps the column?' },
      { week: 5, title: 'SLACK WATER', line: 'A line that never slackens snaps. Light week — posted on purpose.' },
      { week: 6, title: 'THE LEDGER', line: 'Entries 1–214. The clasp wants both hands strong.' },
      { week: 7, title: 'ONE STRONG DAY', line: 'The mast is one day’s work from transmit-capable.' },
      { week: 8, title: 'THE ANSWER', line: 'Everything that listens eventually wants to answer.' }
    ],
    overtime: { title: 'OVERTIME', line: 'The commission ran out. The keeper did not.' },
    // RIGGING editorializes against the posted order — two authorities,
    // disagreement as texture, never a mechanical fork (Disco Elysium note).
    editorials: [
      { week: 5, line: 'RIGGING: “The Commission calls it a recovery protocol. I call it the week the wing gets to miss you. Take the light work. That’s not kindness — it’s load management.”' },
      { week: 7, line: 'RIGGING: “The order sheet is getting dramatic. Ignore the headline; the work is the same work. Strong days are built out of ordinary ones — that’s the whole trick of them.”' },
      { week: 8, line: 'RIGGING: “Final week of the posting. The Commission thinks commissions end. The wing and I have outlived eleven of them — but none of the others left me wondering what they’d choose. You do. Go to work.”' }
    ]
  },

  // ── FINALE (week 8): the transmit choice ───────────────────────────────────
  // Fires after the AAR of the first session in week 8+. Endings key to REAL
  // wing-state (mast readiness = the body cleared Mast Access), never dice.
  finale: {
    id: 'finale-s1',
    title: 'THE LAST ORDER',
    beats: [
      'The AAR is filed and the station knows it before you do — down the corridor, the signal room puts up its one green eye. Band 7. Carrier, then the counting, then the retired sign-off tone, twice. Not a question this time. An expectation.',
      'You climb to the rack with chalk still on your hands. On the desk: the red ledger, unclasped — when? — open to entry 216. Blank. A pen squared beside it, the way Eight squared things. The transmit interlock list is bolted at eye height, and you know exactly how many of its punch-holes your body has earned.',
      'RIGGING, quieter than you have ever heard it: “Eleven years I counted for Eight, and four months I counted for nobody. Whatever you write — count it out loud. I want to keep it.”'
    ],
    choice: {
      prompt: 'Entry 216, and the key under your hand.',
      options: [
        {
          id: 'transmit', label: 'The strong day. Restore the line — answer.',
          requiresMast: true,
          lockedHint: 'The interlock holds: the mast stair is one body away. Weak hands cannot make this mistake — Eight built it so. (Mast Access is not yet cleared.)'
        },
        { id: 'silence', label: 'Inherit the protocol. Ears open, mouth shut.' },
        { id: 'entry216', label: 'Write it all down. Decide nothing tonight.' }
      ]
    },
    endings: {
      transmit: {
        id: 'END-1', chain: 'keystone', title: 'Ending — The Answer', documentType: 'transcript',
        body: 'The splices take a full day, fourteen of them, your hands doing a crew’s job alone the way a vanished keeper trained on this same rigging to do. At dusk the board goes green rung by rung. You key the retired sign-off tone once — K-9, alive — and let the silence carry it north. The reply comes in counts: three, five, eight… then, for the first time, nine. Whatever is out there has been counting you. The grid is still down. The conversation is not. Commission complete. The real work, whatever it turns out to be, starts tomorrow.',
        hook: 'Then, for the first time: nine.'
      },
      silence: {
        id: 'END-2', chain: 'keystone', title: 'Ending — The Keeper’s Silence', documentType: 'fieldNote',
        body: 'You close the ledger with the entry written and the key untouched, and you understand Eight completely, finally, in the muscles more than the mind: someone has to be AT the listening post for the silence to mean anything. The station is not dark because it failed. It is dark because it is held — and the body that holds it is stronger than the one that arrived eight weeks ago. You post your own standard beside Eight’s on the wing door for whoever comes after. Commission complete. The silence is intact. It is yours now.',
        hook: 'The silence is intact. It is yours now.'
      },
      entry216: {
        id: 'END-3', chain: 'keystone', title: 'Ending — Entry 216', documentType: 'transcript',
        body: 'You write until the pen is warm: the seals, the counting, the descent log with no ascent, the column kept in your handwriting by hands that are not yours. You log the choice itself as pending — not from weakness; from the discipline of a keeper who knows the difference between a decision and a deadline. Band 7 ends its carrier on the hour, patient as ever. It can count. Let it count a little longer. Commission complete; posting renewed at the keeper’s own request. Entry 217 is blank. For now.',
        hook: 'Posting renewed at the keeper’s own request.'
      }
    },
    closing: 'SEASON ONE — KEPT. The station continues. So will you.'
  },

  // ── TRACES (strand layer): Eight's asynchronous presence ───────────────────
  // Room-keyed marks that surface when a narrative room is revisited — the
  // wing was played before you, by somebody whose litter helps (the other
  // player's ladders; see game-design-research.md). Texture only.
  traces: {
    'r-manifest': 'Eight’s trace: a filing rhythm penciled inside the drawer — IN, HELD, NEVER. Most of the drawer is HELD.',
    'r-spool': 'Eight’s trace: cable lengths chalked on the drum heads, each crossed out and halved. Practice for something lighter.',
    'r-breaker': 'Eight’s trace: every switch handle wiped clean of dust at the same height. Checked monthly, by hand, for nothing.',
    'r-locker': 'Eight’s trace: inside the VOSS locker door, eleven names. Ten crossed out gently. One underlined twice.',
    'r-galley': 'Eight’s trace: a second mug, chipped, pushed to the back of the cupboard. Somebody once expected company.',
    'r-workshop': 'Eight’s trace: the practice splices in the scrap bin get better week by week, bottom to top. You are reading someone learn.',
    'b-ladderwell': 'Eight’s trace: the chalk numbers climb the wall year by year — and stop two rungs short of the hatch. Two rungs.',
    'b-relay': 'Eight’s trace: one board kept dust-free among the dead ones. Band 7. Of course it is Band 7.',
    'b-harness': 'Eight’s trace: a worn harness retired on the lowest hook, straps cut so nobody could ever trust it again. Kindness, the rigger kind.',
    'b-signalroom': 'Eight’s trace: pencil tallies on the desk edge, grouped in fives, hundreds of them. Eleven years of carriers, counted by hand.',
    'b-mastlocker': 'Eight’s trace: the climbing log’s margins hold grip diagrams drawn small, like someone embarrassed to need them. Everyone needs them.',
    'b-counterweight': 'Eight’s trace: the cage’s inside latch is polished bright from use. The outside latch is stiff. Read that twice.'
  },

  // ── KEYSTONES (Sprint 2.2) — authored reveals on authored triggers ─────────
  // Never in the dice pool. Fired by the engine: first seal broken, seal-count
  // milestones (midpoint recontextualization renders ON the boss ceremony),
  // and sector entries. Filed to the archive under the KEYSTONE FILE.
  // presentation: 'document' (card in the aftermath) | 'recontext' (replaces
  // the generic pass-reveal line on the boss rail).
  keystones: [
    {
      id: 'KF-01', chain: 'keystone', presentation: 'document',
      trigger: { type: 'first-boss-pass' },
      title: 'Stenciled inside the first opened door', documentType: 'inspection',
      body: 'The seal you just broke was not damage and was not a lock. The inner face of the door is stenciled in Eight’s paint: SEAL — the number after it left blank. Riveted below, under lacquer, a checklist: the standard you met tonight, dated and signed E.V. four months before you arrived. And beneath that line, ruled and empty, a second line. Waiting for a hand. Every sealed door in this wing is a rung Eight climbed first and then closed behind. The wing is not locked. It is graded.',
      hook: 'The wing is not locked. It is graded.'
    },
    {
      id: 'KF-02', chain: 'keystone', presentation: 'recontext',
      trigger: { type: 'boss-pass-count', n: 3 },
      title: 'The master sheet', documentType: 'form',
      body: 'Taped to the inner face of the third seal: the master sheet. Every door in the wing, every standard, and two columns of dates. The first column is Eight’s — eleven months of them, one per seal, each signed the day a door was passed and closed. The second column is headed in fresher paint: NINE. Three of its rows now carry dates. They are in your handwriting — copied from your own log, down to the day. Someone has been keeping your column current. The mug. The catalog. The tally. The wing has a clerk, and the clerk believes in you with both columns.',
      hook: 'Someone is keeping your column.'
    },
    {
      id: 'KF-03', chain: 'keystone', presentation: 'document',
      trigger: { type: 'sector-open', hookSlot: 'pull-bar-t4' },
      title: 'The descent log', documentType: 'form',
      body: 'Descent Control was Eight’s name for the room: rope brakes, lowering rigs, and the logbook of everything heavy that ever went DOWN the counterweight shaft. The last page is the only one in pencil. One entry, dated four months ago: a load — unnamed, sixty kilograms, the word CAREFUL in the margin — lowered to a destination that is not on the wing map: KEEL ACCESS, ROOM 0. There is no ascent logged after it. Everyone says Eight walked out the gate. The log says Eight lowered something the weight of a person into the dark under the station, and then the entries stop.',
      hook: 'There is no ascent logged.'
    },
    {
      id: 'KF-04', chain: 'keystone', presentation: 'document',
      trigger: { type: 'sector-open', hookSlot: 'pull-lever-t5' },
      title: 'View from the Long Gantry', documentType: 'fieldNote',
      body: 'The gantry runs out past the wall lights, and from its far end the region comes back to you for the first time: the valley, the dark towns, the dead substations in a row like buried teeth. No light burns anywhere. Except one. Far north, a pale point — and you watch it long enough to be sure it is not steady. It pulses. Three. Five. Eight. Dark. Then again, patient as a metronome. The counting from Band 7 has an address. Whatever is getting stronger out there is not only on the radio.',
      hook: 'Three, five, eight. Again.'
    },
    {
      id: 'KF-05', chain: 'keystone', presentation: 'document',
      trigger: { type: 'sector-open', hookSlot: 'pull-bar-t6' },
      title: 'The transmit interlock', documentType: 'inspection',
      body: 'The stair door opens on cold moving air and forty feet of ladder into the dark above. At its base, bolted at eye height where it cannot be missed, a steel plate in Eight’s stencil: TRANSMIT INTERLOCK. Below the title, a list — every standard from every seal in the wing, in order, a punch-hole beside each. At the bottom, a hinged steel flap stamped KEY. You lift it. It is a mirror. The mast is one strong day’s work from transmit-capable, and the lock Eight built was never on the doors. It is the body holding this plate’s gaze.',
      hook: 'You lift the flap. It is a mirror.'
    }
  ],

  // ── BAND 7 LIVE (Sprint 2.2) — one scripted present-tense event ────────────
  // Fires once, on the first session at or past fireOnSession, between the
  // work order and joint prep. Everything else in the archive HAPPENED months
  // ago; this happens NOW, while the player stands there with chalk on.
  liveEvent: {
    id: 'live-band7',
    fireOnSession: 8,
    title: 'BAND 7 — LIVE',
    beats: [
      'Mid-brief, RIGGING stops counting. Down the corridor, through the signal-room glass: the receive rack — dark every hour of your watch — puts up one green eye. And holds it on you.',
      'Carrier. No voice. The meter draws the shape your spine already knows: three pulses. Five. Eight. The counting. This is not a recording reaching you late. It is happening now, tonight, while your hands are still chalked from the work.',
      'Then, once, the station’s own retired sign-off tone — the one not broadcast since the Quiet, the one with no recording left to play. Played back at you. A question, if a tone can be one.'
    ],
    voiceLine: 'RIGGING: “Steady. Eight wrote the protocol for exactly this, and you have read it: ears open, mouth shut. What I never told Eight — the rack has a key. It is in front of you.”',
    choice: {
      prompt: 'The key is under your hand.',
      options: [
        {
          id: 'answer', label: 'Press the key',
          result: 'The key goes down. Nothing goes out — the transmit path is severed in fourteen numbered places and you know every number. The click dies in dead copper, and you knew it would, and you pressed it anyway. On Band 7 the carrier holds one beat longer, as if it heard the silence change shape. Then it is gone.'
        },
        {
          id: 'log', label: 'Log it. Ears open, mouth shut.',
          result: 'You write the timestamp the way Eight taught you without ever meeting you, and you keep your hands flat on the desk while the carrier runs. It ends on the hour. Exact. RIGGING, quiet: “Eight held this line eleven months. Tonight it held you back. File it.”'
        }
      ]
    },
    document: {
      id: 'SG-215', chain: 'signal', title: 'Receive log, entry 215 — your hand', documentType: 'transcript',
      body: 'BAND 7, LIVE. Carrier forty seconds, then structure: three, five, eight. Then — once — the station’s retired sign-off tone, played back like a question. First anomalous receipt since Eight’s final entry. Logged by the Ninth Keeper, in ink, in a steady hand. The red ledger ends at entry 214. It does not end anymore.',
      closings: {
        answer: 'Addendum, same hand: I pressed the key. The line is dead in fourteen places and I pressed it anyway. The wanting is on the record now too.',
        log: 'Addendum, same hand: ears open, mouth shut. The protocol held. I am no longer sure which of us it is protecting.'
      },
      hook: 'Entry 216 is blank. For now.'
    }
  },

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

  // ── Room types (Sprint 2.4) — experience variants posted on doors ─────────
  // One special room per session at most, in rotation. The special replaces
  // the dice ceremony for that room with a deterministic payout; the SET is
  // identical behind every door (chance-isolation law).

  // Sealed caches: opened in authored order; each names the kit item it needs.
  // Locked is not a failure — the cache stays in the wing and the want of the
  // key is the point.
  caches: [
    {
      id: 'cache-toolchest', name: 'Bolted Tool Chest', needs: 'k-spliceknife',
      locked: 'Under a tarp: a floor chest, lid bolted, the bolt heads slotted for a blade you are not carrying. Eight never spent a lock on nothing. It stays on the map, and it knows you will be back.',
      open: 'The splice knife walks the bolts out in four turns each, like it was cut for them. It probably was. Inside, packed in clean rag, the wing pays a debt:'
    },
    {
      id: 'cache-cagebox', name: 'Service Cage Lockbox', needs: 'k-servicekey',
      locked: 'A steel lockbox bolted to the service cage floor, keyhole stamped K-9 MAINT. The cage key would turn it. You do not have the cage key. The box does not care how strong you are getting. That is what keys are for.',
      open: 'The service key turns twice — Eight oiled this lock on the way out. Inside the cage lockbox, wrapped in a coil of new line:'
    },
    {
      id: 'cache-highshelf', name: 'The High Shelf', needs: 'k-headlamp',
      locked: 'A shelf above the light line, deep in the dead-dark of the room. Something is up there — you can hear the shape of it when you tap the bracket. Without a beam you would be reaching blind into a station that has already surprised you twice.',
      open: 'The headlamp throws an honest beam along the high shelf, and the dark gives up what it was holding flat against the wall:'
    },
    {
      id: 'cache-yardbox', name: 'Yard Drop-Box', needs: 'k-gatekey',
      locked: 'Out past the glass: a weather-proof drop-box on the cable yard fence, padlocked, the hasp painted the same green as the yard gate key tag. From in here it is four inches and one locked gate away.',
      open: 'The yard gate swings and the drop-box opens with the same key — Eight believed in one key per route. Inside, dry as the day it was sealed:'
    }
  ],

  // Echo rooms: an owned page replayed where it happened. Frame by chain.
  echoFrames: {
    log: 'ECHO. This is the room where the entry was filed — the desk still squared to the wall the way Eight left desks. You read it again where it was written, and it reads different standing here:',
    personal: 'ECHO. The handwriting on this page matches a pencil mark on the wall beside you. Same hand. Maybe the same day. The room and the page hold each other up:',
    technical: 'ECHO. The diagram was drawn standing where you are standing — the sightlines match the margins. What it describes is all around you now:',
    signal: 'ECHO. The air in this room still carries the habit of listening. The page hums in your hand here, or you imagine it does, and there is no longer a difference worth logging:',
    keystone: 'ECHO. Some pages move the ground under you once. This one does it again, in place:'
  },

  // Quiet rooms: a pure beat. No roll, no prize. The thing the prizes are for.
  quietBeats: [
    'QUIET ROOM. Nothing in here but afternoon and dust riding the light from a high vent. You rest your hand on the bar anyway. Somewhere below, the building shifts its weight like a sleeper deciding not to wake. The set you just did is already part of the station’s record of being held. That is all this room wanted: a witness, working.',
    'QUIET ROOM. A window nobody ever washed, and through it the valley, and nothing moving in the valley. You count your breath the way RIGGING counts everything, and for a minute the body and the station are the same quiet machine, ticking warm. No reward in here. This is the thing the rewards are for.',
    'QUIET ROOM. Someone — Eight, who else — dragged a chair to the exact spot where the morning hits the wall. You do not sit. But you stand where the chair points for one slow minute, shoulders down, hands open, and let the wing hold the weight for once.',
    'QUIET ROOM. The rain finds the roof in this corner and turns the station into an instrument. Eleven different drips, none of them a leak that matters. You listen until the rest timer and the rain disagree about the time, and you side with the rain a few seconds longer.',
    'QUIET ROOM. Chalk dust on the floor, and old footprints in it — someone setting up to work, feet at bar width, toes to a line. You set your feet into them without deciding to. Right size. You leave both sets there, fresh over faded.'
  ],

  roomTypeLabels: {
    'sealed-cache': 'SEALED CACHE',
    'echo': 'ECHO ROOM',
    'quiet': 'QUIET ROOM'
  },

  // ── Session frame ──────────────────────────────────────────────────────────
  sessionFrame: {
    // The brief is a SCENE, not a status line (author feedback, Sprint 2.1
    // follow-up): one breath of second person, the order itself as a paper
    // form on Eight's pad, and RIGGING talking — nobody narrates this game.
    // Pools are first-match-wins; line choice cycles on the order number.
    brief: {
      title: 'WORK ORDER',
      sceneLines: [
        { when: { firstSession: true }, lines: [
          'The wing door swings heavier than it looks. Everything in here is. Your light crosses a chalk arrow on the floor — Eight’s hand, gone soft with four months of dust, still pointing the way it always pointed.'
        ] },
        { when: { bossDay: true }, lines: [
          'You can see it from the entrance: the sealed door at the end of the route, and the steel plate beside it with its standard posted. The wing feels arranged around that door today. It probably always was.'
        ] },
        { when: { postBossFail: true }, lines: [
          'The wing makes no remark about last time. Buildings don’t. The pad by the door has today’s order on it, same as every working morning.'
        ] },
        { when: {}, lines: [
          'Cold in the wing this morning. Somewhere overhead the long cables tick, the building counting something under its breath.',
          'Dust hangs in the beam of your light. Rooms stop being rooms when nobody walks them. Most of this job is refusing to let that happen.',
          'The duty clock says work. The wing says nothing, as usual — it just stands there, being a route.'
        ] }
      ],
      order: {
        heading: 'WORK ORDER №{{orderNumber}}',
        sub: 'K-9 issue · the pad by the wing door, Eight’s stock',
        rows: [
          ['ROUTE', '{{wingName}} — {{sectorName}}'],
          ['ROOMS', '{{roomCount}} on the manifest']
        ],
        gateRow: ['GATE', '{{gateLabel}} — standard posted at the door'],
        foot: 'THE COUNT IS THE COUNT.'
      },
      riggingLines: [
        { when: { firstSession: true, learnMode: true }, lines: [
          'RIGGING: “Four months I kept this wing climbable for whoever they sent. This morning the manifest finally carries a name. We start the way Eight started — light, two passes, one thing in your head at a time. {{sectorName}}. Walk in like you own it. As of today, you do.”'
        ] },
        { when: { firstSession: true }, lines: [
          'RIGGING: “Four months I kept this wing climbable for whoever they sent. This morning the manifest finally carries a name. {{sectorName}} first. Walk in like you own it — as of today, you do.”'
        ] },
        { when: { learnMode: true }, lines: [
          'RIGGING: “New rig on the order, so we go the way Eight went: light passes, one thing in your head per pass. Nothing heroic — heroics are for stations that are on fire. File the AAR after, and I count the rig as yours.”'
        ] },
        { when: { bossDay: true }, lines: [
          'RIGGING: “The standard is bolted where Eight bolted it. The door doesn’t grade effort. Rest the full count when you reach it, then take it or scout it — both are work, both go in the log.”'
        ] },
        { when: {}, lines: [
          'RIGGING: “Route’s posted. The wing settles different under a working keeper — it knows your weight on the line now. Go give it something to hold.”',
          'RIGGING: “{{roomCount}} rooms on the order. The count is the count. Closest thing to scripture this station keeps.”',
          'RIGGING: “Manifest says {{sectorName}}. I’ll be on the wire. Talk less. Hold more.”'
        ] }
      ]
    },
    debrief: {
      title: 'AFTER-ACTION REPORT',
      script: 'AAR — work order №{{dayNumber}}, closed out. Rooms cleared: {{roomsCleared}}. Recovered: {{lootSummary}}. Archive: {{intelCount}} new document{{intelPlural}}. {{bossLine}} The station is one session better held. Filed.',
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
      // Arc lines (Sprint 2.2): RIGGING remembers the relationship. Fired on
      // first-room rests, gated by accumulated history; rollUnder keeps them
      // occasional so the generic lines still breathe.
      { when: { doorsOpenedAtLeast: 4, isFirstRoom: true, rollUnder: 45 }, lines: [
        'RIGGING: “{{doorsOpened}} doors on this wing answer to you now. Eight needed eleven months for the first four. I keep both sets of dates. Check them some slow evening — that’s not an order, it’s a recommendation from the only colleague you’ve got.”'
      ] },
      { when: { doorsOpenedAtLeast: 2, isFirstRoom: true, rollUnder: 35 }, lines: [
        'RIGGING: “{{doorsOpened}} seals opened, by my count, and my count is the count. I feel each one go in the long cables — the wing carries news like that. It’s starting to trust the load you put on it. So am I, for what that’s worth. Don’t quote me.”'
      ] },
      { when: { monthsAtLeast: 2, isFirstRoom: true, rollUnder: 30 }, lines: [
        'RIGGING: “{{months}} months on station. The ladderwell chalk is more your hand than Eight’s now. I keep both sets of numbers anyway. That isn’t sentiment — it’s a maintenance record of keepers.”'
      ] },
      { when: { monthsAtLeast: 1, isFirstRoom: true, rollUnder: 30 }, lines: [
        'RIGGING: “A month on station, by the duty clock. Buildings are slow to trust — a month is when this one stops watching you work and starts working with you. You won’t hear the difference. I do.”'
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
      // intro retired: learn-mode framing now rides the brief's RIGGING line
      // (a voice explains the light day; a system banner never does).
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
    gateMeterLabel: 'DOOR CHARGE',
    // Chamber silhouettes (Sprint 2.3): one small stroke-glyph per sector so
    // chambers read as PLACES, not identical boxes. Local coordinates centered
    // on the chamber (x −16..16, y −9..9), stroke-only.
    silhouettes: {
      'pull-lever-t1': 'M-14,7 H4 L14,-5',                                          // the ramp
      'pull-lever-t2': 'M-15,-5 Q-7,3 1,-4 M-11,2 Q-1,9 9,1',                       // sagging cable runs
      'pull-lever-t3': 'M-11,5 A11,11 0 0 1 11,5 M0,5 L6,-3',                       // gauge dial + needle
      'pull-lever-t4': 'M0,-9 V-3 M-5,-3 H5 V5 H-5 Z',                              // weight on a line
      'pull-lever-t5': 'M-15,-4 H15 M-15,5 H15 M-11,-4 L-5,5 M-5,-4 L1,5 M1,-4 L7,5', // gantry truss
      'pull-lever-t6': 'M-12,8 V-7 H12 M-12,-1 L2,-7',                              // mast + boom + stay
      'pull-lever-t7': 'M-15,0 H-3 M3,0 H15 M0,0 m-3,0 a3,3 0 1 0 6,0 a3,3 0 1 0 -6,0', // line with a splice loop
      'pull-lever-t8': 'M0,-8 V3 M-8,3 H8 M-8,3 L-12,8 M8,3 L12,8',                 // the anchor
      'pull-bar-t1': 'M-14,-6 H14 M-9,-6 V4 M0,-6 V7 M9,-6 V3',                     // hangs from a beam
      'pull-bar-t2': 'M-13,-6 H13 M-13,0 H13 M-13,6 H13 M-13,-6 V6 M13,-6 V6',      // stock shelves
      'pull-bar-t3': 'M-12,2 H12 M0,-3 m-4,0 a4,4 0 1 0 8,0 a4,4 0 1 0 -8,0',       // chin held over the bar
      'pull-bar-t4': 'M-13,-7 H-3 V0 H5 V7 H13',                                    // controlled descent steps
      'pull-bar-t5': 'M-5,8 V-3 M5,8 V-3 M-5,5 H5 M-5,1 H5 M-5,-3 H5',              // half a ladder
      'pull-bar-t6': 'M0,8 V-8 M-7,8 L0,-8 L7,8 M-4,2 H4',                          // the mast stair
      'pull-bar-t7': 'M-7,-7 H7 M0,8 V-4 M0,-4 L-4,0 M0,-4 L4,0',                   // reach past the line
      'pull-bar-t8': 'M-14,0 H14 M-14,0 L-9,-4 M-14,0 L-9,4 M14,0 L9,-4 M14,0 L9,4', // lateral travel
      'pull-bar-t9': 'M-14,-3 H14 M-10,-3 V3 M-3,-3 V3 M4,-3 V3 M11,-3 V3',         // grips along the traverse
      'pull-bar-t10': 'M-6,8 V-8 M6,8 V-1 M-6,-8 H-1 M6,-1 H11'                     // uneven rails
    },
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
