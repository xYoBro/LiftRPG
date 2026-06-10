// ── Groundwork skill tree: PULL (v2 — bar + mat ONLY) ───────────────────────
// Original tier chart authored for Groundwork on Overcoming Gravity-style
// methodology (strength-endurance rep windows, paired push/pull balance,
// conservative connective-tissue pacing). No book text or chart reproduced.
//
// EQUIPMENT CONTRACT (author directive, checkpoint 2): a pull-up bar and a
// yoga mat. Nothing else — no tables, no chairs, no straps, no furniture.
// Hotel-room-proof by construction; travel mode is the default mode.
//
// Horizontal pulling without furniture: the FRONT-LEVER LINEAGE. Hanging tuck
// rows ARE horizontal rowing done from a high bar, scalable from floor scap
// work to straddle-lever rows — and as a prestige skill line, a better
// metroidvania corridor than furniture rows ever were. Structural balance:
// vertical pull (Bar branch) pairs with the lever line's horizontal vector;
// floor scap work covers the beginner horizontal dose.
//
// Two branches: LEVER (horizontal pull / front-lever line) and BAR (vertical
// pull). Both train every session the tree is scheduled.
//
// Field contract per tier: id, name, hookSlot, branch, prereqs, equipment,
// setup, formStandard[3-5], scheme, unlock, boss (next-tier standard),
// regression, commonFaults, faultSideQuests, rig, videoRef, tutorial.

export const PULL_TREE = {
  id: 'pull',
  name: 'Pull',
  voiceSlot: 'pull-voice',
  statBase: 20,
  statPerTier: 6,
  statRecentMax: 15,
  statCap: 85,
  branches: {
    lever: { name: 'Lever', note: 'Horizontal pull, hanging. The front-lever road: body as the beam, bar as the pivot.' },
    bar: { name: 'Bar', note: 'Vertical pull. Hang tolerance before pulling strength — tendons first.' }
  },

  // ── Assessment ladder (Session Zero) ──────────────────────────────────────
  // Ordered easy → hard, alternating branches (fatigue cap). First miss per
  // branch ends that branch. Placement = last tier passed. Impossible to fail.
  assessmentLadder: [
    { tier: 'pull.lever.floor-scap', standard: { kind: 'reps', value: 8 } },
    { tier: 'pull.bar.dead-hang', standard: { kind: 'hold', value: 20 } },
    { tier: 'pull.lever.hollow-hang', standard: { kind: 'hold', value: 10 } },
    { tier: 'pull.bar.scap-pulls', standard: { kind: 'reps', value: 6 } },
    { tier: 'pull.lever.tuck-hold', standard: { kind: 'hold', value: 6 } },
    { tier: 'pull.bar.flexed-hang', standard: { kind: 'hold', value: 15 } },
    { tier: 'pull.lever.tuck-pull', standard: { kind: 'reps', value: 4 } },
    { tier: 'pull.bar.negatives', standard: { kind: 'reps', value: 3 } },
    { tier: 'pull.lever.tuck-row', standard: { kind: 'reps', value: 4 } },
    { tier: 'pull.bar.partial-rom', standard: { kind: 'reps', value: 3 } },
    { tier: 'pull.lever.adv-tuck-row', standard: { kind: 'reps', value: 3 } },
    { tier: 'pull.bar.full', standard: { kind: 'reps', value: 5 } },
    { tier: 'pull.bar.chest-to-bar', standard: { kind: 'reps', value: 3 } },
    { tier: 'pull.lever.single-leg-row', standard: { kind: 'reps', value: 2, perSide: true } },
    { tier: 'pull.bar.archer', standard: { kind: 'reps', value: 2, perSide: true } },
    { tier: 'pull.bar.typewriter', standard: { kind: 'reps', value: 2, perSide: true } },
    { tier: 'pull.lever.straddle-row', standard: { kind: 'reps', value: 2 } },
    { tier: 'pull.bar.uneven', standard: { kind: 'reps', value: 3, perSide: true } }
  ],

  tiers: [
    // ════════════════════════ LEVER BRANCH (bar + mat) ════════════════════════
    {
      id: 'pull.lever.floor-scap',
      name: 'Prone Y-T-W Raises',
      hookSlot: 'pull-lever-t1',
      branch: 'lever',
      prereqs: [],
      equipment: ['mat'],
      setup: 'Lie face-down on the mat, arms overhead in a Y. Raise both arms off the floor by squeezing the shoulder blades down and together; lower; repeat in a T (arms sideways) and a W (elbows bent). One rep = one raise in the current letter.',
      formStandard: [
        'Arms lift from the blades, not by arching the lower back',
        'Thumbs rotate toward the ceiling at the top',
        'Forehead stays down — neck long',
        'One-second pause at the top of every raise'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [8, 12] },
      unlock: '3 sets of 12 per letter with a 1s pause',
      boss: { tier: 'pull.lever.hollow-hang', standard: { kind: 'hold', value: 6 }, label: 'a 6-second hollow tuck hang' },
      regression: null,
      commonFaults: [
        { id: 'back-arch', text: 'Lower back arches to fake the lift' },
        { id: 'no-pause', text: 'Arms bounce instead of pausing' },
        { id: 'neck-crane', text: 'Head lifts to watch the hands' }
      ],
      faultSideQuests: {
        'back-arch': { id: 'sq.glute-set', name: 'Glutes-on Y raises, 2×8', note: 'Squeeze the glutes first; the back stops volunteering.' },
        'no-pause': { id: 'sq.iso-letters', name: '5s holds at the top of each letter, 3 each', note: 'The pause is where the scap learns.' },
        'neck-crane': { id: 'sq.forehead-down', name: 'Forehead on the folded mat edge, full set watching nothing', note: 'The blades do not need supervision.' }
      },
      rig: ['ytw.y', 'ytw.t', 'ytw.w'],
      videoRef: { creator: 'GMB or Darebee', search: 'prone YTW raises shoulder blade tutorial' },
      tutorial: ['Blades move the arms, back stays quiet', 'Pause at the top — own it']
    },
    {
      id: 'pull.lever.hollow-hang',
      name: 'Hollow Tuck Hang',
      hookSlot: 'pull-lever-t2',
      branch: 'lever',
      prereqs: ['pull.lever.floor-scap'],
      equipment: ['bar'],
      setup: 'Hang from the bar, pull the blades down, tuck the knees toward the chest, and round the lower back into a hollow. The body becomes a loaded spring, not a dangling weight.',
      formStandard: [
        'Knees tucked at or above hip height',
        'Lower back rounded — tail tucked under',
        'Blades pulled down (not a dead-weight shrug hang)',
        'Still: no swing, steady breathing'
      ],
      scheme: { kind: 'hold', sets: 3, holdWindow: [10, 25] },
      unlock: '3 holds of 25s',
      boss: { tier: 'pull.lever.tuck-hold', standard: { kind: 'hold', value: 4 }, label: 'a 4-second horizontal tuck hold' },
      regression: 'pull.lever.floor-scap',
      commonFaults: [
        { id: 'shrug', text: 'Hanging off the traps — ears swallow the shoulders' },
        { id: 'knee-drop', text: 'Knees sink below hip height as the hold goes on' },
        { id: 'swing', text: 'Body swings instead of holding the spring' }
      ],
      faultSideQuests: {
        'shrug': { id: 'sq.scap-depression', name: 'Scap depression holds on bar, 3×8s', note: 'Blades down. The shrug is the body lying about strength.' },
        'knee-drop': { id: 'sq.knee-raise-iso', name: 'Hanging knee-raise holds, 3×8s', note: 'The tuck is hip flexor work. Pay it.' },
        'swing': { id: 'sq.quiet-hang', name: 'Dead-still hollow hang, 3×10s', note: 'Still first. Strong second.' }
      },
      rig: ['hollow-hang.hold'],
      videoRef: { creator: 'FitnessFAQs', search: 'hollow body hang tuck front lever prep' },
      tutorial: ['Tail tucked under — round the low back', 'Blades down even while hanging']
    },
    {
      id: 'pull.lever.tuck-hold',
      name: 'Tuck Front-Lever Hold',
      hookSlot: 'pull-lever-t3',
      branch: 'lever',
      prereqs: ['pull.lever.hollow-hang'],
      equipment: ['bar'],
      setup: 'From a hollow tuck hang, pull down hard through straight arms until the back is parallel to the floor, knees tucked tight. The body is now a horizontal beam held by the lats.',
      formStandard: [
        'Hips at shoulder height — back parallel to the floor',
        'Arms straight: elbows locked, pulling from the lats',
        'Knees tight to chest, tail tucked',
        'Head neutral — look at the ceiling, not the bar'
      ],
      scheme: { kind: 'hold', sets: 3, holdWindow: [5, 12] },
      unlock: '3 holds of 12s',
      boss: { tier: 'pull.lever.tuck-pull', standard: { kind: 'reps', value: 3 }, label: '3 tuck-lever pulls from hang to horizontal' },
      regression: 'pull.lever.hollow-hang',
      commonFaults: [
        { id: 'hip-sag', text: 'Hips drop below shoulder line — the beam bends' },
        { id: 'elbow-bend', text: 'Elbows bend to cheat the leverage' },
        { id: 'short-hold', text: 'Touches horizontal, cannot stay there' }
      ],
      faultSideQuests: {
        'hip-sag': { id: 'sq.tuck-negatives', name: 'Slow tuck-lever negatives, 3×3 (5s down)', note: 'Visit horizontal slowly until it knows you.' },
        'elbow-bend': { id: 'sq.straight-arm-pulldown', name: 'Straight-arm scap pulls in hollow hang, 3×6', note: 'Straight means straight. The lats do the holding.' },
        'short-hold': { id: 'sq.hold-ladders', name: 'Hold ladders: 3s/5s/3s with rest, 2 rounds', note: 'Seconds are reps. Collect them.' }
      },
      rig: ['tuck-fl.hold'],
      videoRef: { creator: 'FitnessFAQs', search: 'tuck front lever hold tutorial' },
      tutorial: ['Hips to shoulder height — flat beam', 'Lock the elbows; the lats carry it']
    },
    {
      id: 'pull.lever.tuck-pull',
      name: 'Tuck-Lever Pull',
      hookSlot: 'pull-lever-t4',
      branch: 'lever',
      prereqs: ['pull.lever.tuck-hold'],
      equipment: ['bar'],
      setup: 'From a hollow tuck hang, pull with straight arms to the horizontal tuck position, pause, lower with control. The dynamic version of the hold — the rowing pattern begins.',
      formStandard: [
        'Arms stay straight both directions',
        'One-second pause at horizontal',
        'Tuck stays tight — no kipping the knees',
        'Three-second controlled descent'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [3, 6] },
      unlock: '3 sets of 6 with paused horizontals',
      boss: { tier: 'pull.lever.tuck-row', standard: { kind: 'reps', value: 3 }, label: '3 tuck-lever rows (bar to hips at horizontal)' },
      regression: 'pull.lever.tuck-hold',
      commonFaults: [
        { id: 'elbow-bend', text: 'Elbows bend on the way up' },
        { id: 'kip', text: 'Knees throw to start the pull' },
        { id: 'freefall', text: 'Descent becomes a drop' }
      ],
      faultSideQuests: {
        'elbow-bend': { id: 'sq.straight-arm-pulldown', name: 'Straight-arm scap pulls, 3×6', note: 'Bent elbows are a different exercise. Do this one.' },
        'kip': { id: 'sq.deadstop-lever', name: 'Dead-stop pulls: 2s still hang before each, 2×4', note: 'Stillness, then strength. In that order.' },
        'freefall': { id: 'sq.tuck-negatives', name: '5s negatives only, 3×3', note: 'The way down is half the rep.' }
      },
      rig: ['tuck-pull.start', 'tuck-pull.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'front lever raises tuck progression' },
      tutorial: ['Straight arms — it is a lat pull, not a curl', 'Pause flat, lower slow']
    },
    {
      id: 'pull.lever.tuck-row',
      name: 'Tuck-Lever Row',
      hookSlot: 'pull-lever-t5',
      branch: 'lever',
      prereqs: ['pull.lever.tuck-pull'],
      equipment: ['bar'],
      setup: 'Hold the horizontal tuck, then ROW: bend the arms and pull the bar to your hips, lower to straight arms without losing horizontal. This is the bodyweight equivalent of a heavy horizontal row.',
      formStandard: [
        'Body stays horizontal through the whole row',
        'Bar travels to the hip line, elbows driving back',
        'No hip drop at the top of the row',
        'Straight-arm finish before the next rep'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [3, 8] },
      unlock: '3 sets of 8 at form standard',
      boss: { tier: 'pull.lever.adv-tuck-row', standard: { kind: 'reps', value: 3 }, label: '3 advanced-tuck rows (knees at 90°)' },
      regression: 'pull.lever.tuck-pull',
      commonFaults: [
        { id: 'hip-sag', text: 'Hips sink as the arms bend' },
        { id: 'partial-row', text: 'Bar stops short of the hips' },
        { id: 'pike', text: 'Body pikes to make the row easier' }
      ],
      faultSideQuests: {
        'hip-sag': { id: 'sq.row-iso-top', name: 'Top-of-row holds, 3×5s', note: 'Own the inch you keep skipping.' },
        'partial-row': { id: 'sq.row-iso-top', name: 'Bar-at-hips holds, 3×5s', note: 'Touch it. Hold it. Then talk.' },
        'pike': { id: 'sq.hollow-hold', name: 'Hollow-body holds on the mat, 3×25s', note: 'The line breaks where the core gives.' }
      },
      rig: ['tuck-row.start', 'tuck-row.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'tuck front lever row tutorial' },
      tutorial: ['Horizontal is the contract — the row happens inside it', 'Bar to hips, every rep']
    },
    {
      id: 'pull.lever.adv-tuck-row',
      name: 'Advanced-Tuck Row',
      hookSlot: 'pull-lever-t6',
      branch: 'lever',
      prereqs: ['pull.lever.tuck-row'],
      equipment: ['bar'],
      setup: 'Tuck-lever row with the knees opened to 90 degrees — the hips extend, the beam gets longer, every rep gets heavier. Flat back is the whole test.',
      formStandard: [
        'Knee angle at 90° — thighs vertical-ish, shins parallel to floor',
        'Lower back FLAT, tail still tucked',
        'Bar to hips with body horizontal',
        'No re-tucking mid-set'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [3, 6] },
      unlock: '3 sets of 6 at form standard',
      boss: { tier: 'pull.lever.single-leg-row', standard: { kind: 'reps', value: 2, perSide: true }, label: '2 single-leg lever rows per side' },
      regression: 'pull.lever.tuck-row',
      commonFaults: [
        { id: 'back-arch', text: 'Lower back arches as the legs open' },
        { id: 're-tuck', text: 'Knees creep back in under fatigue' },
        { id: 'hip-sag', text: 'The longer beam bends at the hips' }
      ],
      faultSideQuests: {
        'back-arch': { id: 'sq.hollow-hold', name: 'Advanced-tuck hollow holds on mat, 3×20s', note: 'Find the flat back on the floor; bring it to the bar.' },
        're-tuck': { id: 'sq.angle-watch', name: 'Filmed sets at the easier tuck, watching knee angle', note: 'Film the knees. They negotiate when you stop looking.' },
        'hip-sag': { id: 'sq.adv-tuck-iso', name: 'Advanced-tuck holds, 3×6s', note: 'Hold the longer beam before rowing it.' }
      },
      rig: ['adv-tuck-row.hold'],
      videoRef: { creator: 'FitnessFAQs', search: 'advanced tuck front lever row' },
      tutorial: ['Open the knees, NOT the lower back', '90 degrees is a promise — keep it']
    },
    {
      id: 'pull.lever.single-leg-row',
      name: 'Single-Leg Lever Row',
      hookSlot: 'pull-lever-t7',
      branch: 'lever',
      prereqs: ['pull.lever.adv-tuck-row'],
      equipment: ['bar'],
      setup: 'Advanced tuck with one leg extended fully. Row. Switch legs set to set — both sides earn the same count.',
      formStandard: [
        'Extended leg straight and in line with the torso',
        'Hips level — no twist toward the tucked side',
        'Bar to hips, body horizontal',
        'Equal reps both legs'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [2, 5], perSide: true },
      unlock: '3 sets of 5 per side',
      boss: { tier: 'pull.lever.straddle-row', standard: { kind: 'reps', value: 2 }, label: '2 straddle-lever rows' },
      regression: 'pull.lever.adv-tuck-row',
      commonFaults: [
        { id: 'twist', text: 'Hips rotate toward the tucked leg' },
        { id: 'leg-drop', text: 'Extended leg sinks below the line' },
        { id: 'side-gap', text: 'One leg’s reps outrun the other' }
      ],
      faultSideQuests: {
        'twist': { id: 'sq.antirotation-hold', name: 'Side plank, 3×20s per side', note: 'Lock the box before you tilt it.' },
        'leg-drop': { id: 'sq.single-leg-iso', name: 'Single-leg lever holds, 3×5s per side', note: 'The leg is part of the beam. Act like it.' },
        'side-gap': { id: 'sq.weak-side-first', name: 'Weak side opens and closes every session', note: 'Symmetry is programmed, not wished for.' }
      },
      rig: ['single-leg-row.hold'],
      videoRef: { creator: 'FitnessFAQs', search: 'single leg front lever row' },
      tutorial: ['The straight leg is the test — keep it on the line', 'Weak side first']
    },
    {
      id: 'pull.lever.straddle-row',
      name: 'Straddle-Lever Row',
      hookSlot: 'pull-lever-t8',
      branch: 'lever',
      prereqs: ['pull.lever.single-leg-row'],
      equipment: ['bar'],
      setup: 'Both legs extended in a wide straddle, body horizontal. Row the bar to the hips. The doorway to the full front lever — the capstone of the slice.',
      formStandard: [
        'Both legs straight, straddled wide, on the body line',
        'Hips level with shoulders through the row',
        'Bar to hips, controlled straight-arm finish',
        'No arch — flat beam, tail tucked'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [2, 5] },
      unlock: '3 sets of 5 at form standard',
      boss: null, // branch capstone in the slice; full build: full front lever
      regression: 'pull.lever.single-leg-row',
      commonFaults: [
        { id: 'hip-sag', text: 'Hips sink under the full leverage' },
        { id: 'narrow-straddle', text: 'The straddle narrows to shorten the beam' }
      ],
      faultSideQuests: {
        'hip-sag': { id: 'sq.straddle-iso', name: 'Straddle-lever holds, 3×4s', note: 'Hold the shape before moving inside it.' },
        'narrow-straddle': { id: 'sq.straddle-width', name: 'Filmed holds with marked straddle width', note: 'Wide is honest. Mark it on the wall.' }
      },
      rig: ['straddle-row.hold'],
      videoRef: { creator: 'FitnessFAQs', search: 'straddle front lever row' },
      tutorial: ['Wide straddle, flat beam', 'This is the door to the full lever — respect it']
    },

    // ════════════════════════ BAR BRANCH (unchanged contract) ═══════════════
    {
      id: 'pull.bar.dead-hang',
      name: 'Dead Hang',
      hookSlot: 'pull-bar-t1',
      branch: 'bar',
      prereqs: [],
      equipment: ['bar'],
      setup: 'Full grip on the bar, arms straight, feet off the floor. Shoulders may rise into the ears — this tier is grip and tendon tolerance.',
      formStandard: [
        'Full-hand grip, thumbs wrapped',
        'Arms fully straight',
        'Body still — no swing',
        'Breathe; do not hold breath'
      ],
      scheme: { kind: 'hold', sets: 3, holdWindow: [20, 45] },
      unlock: '3 holds of 45s',
      boss: { tier: 'pull.bar.scap-pulls', standard: { kind: 'reps', value: 5 }, label: '5 clean scap pulls' },
      regression: null,
      commonFaults: [
        { id: 'grip-fade', text: 'Fingers peel open before the clock' },
        { id: 'swing', text: 'Body swings or twists' }
      ],
      faultSideQuests: {
        'grip-fade': { id: 'sq.grip-singles', name: 'Short max-grip hangs, 5×8s', note: 'Grip is built where it is hardest.' },
        'swing': { id: 'sq.quiet-hang', name: 'Hollow-body hang, 3×15s', note: 'A still body is a strong signal.' }
      },
      rig: ['hang-dead.start'],
      videoRef: { creator: 'GMB or FitnessFAQs', search: 'dead hang tutorial shoulder safety' },
      tutorial: ['Thumbs wrapped, always', 'Just hang. The boredom is the exercise.']
    },
    {
      id: 'pull.bar.scap-pulls',
      name: 'Scap Pulls',
      hookSlot: 'pull-bar-t2',
      branch: 'bar',
      prereqs: ['pull.bar.dead-hang'],
      equipment: ['bar'],
      setup: 'From a dead hang, pull the shoulder blades down and together without bending the elbows. The body rises an inch or two.',
      formStandard: [
        'Elbows stay locked straight',
        'Blades drive down — the neck visibly lengthens',
        'One-second pause at the top of each pull',
        'No kip or leg drive'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [5, 10] },
      unlock: '3 sets of 10 with a 1s pause',
      boss: { tier: 'pull.bar.flexed-hang', standard: { kind: 'hold', value: 10 }, label: 'a 10s flexed-arm hang' },
      regression: 'pull.bar.dead-hang',
      commonFaults: [
        { id: 'elbow-bend', text: 'Elbows bend — it becomes a tiny pull-up' },
        { id: 'no-pause', text: 'Bouncing through the top' }
      ],
      faultSideQuests: {
        'elbow-bend': { id: 'sq.straight-arm-cue', name: 'Scap pulls with elbow watch, 2×6 filmed', note: 'Straight means straight. Film the elbows.' },
        'no-pause': { id: 'sq.scap-iso', name: 'Top-position scap hold, 3×8s', note: 'The pause is where the strength lives.' }
      },
      rig: ['scap-pull.start', 'scap-pull.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'scapular pull up tutorial' },
      tutorial: ['Arms are ropes; blades do the work', 'Pause at the top — own it']
    },
    {
      id: 'pull.bar.flexed-hang',
      name: 'Flexed-Arm Hang',
      hookSlot: 'pull-bar-t3',
      branch: 'bar',
      prereqs: ['pull.bar.scap-pulls'],
      equipment: ['bar'],
      setup: 'Jump from the floor to the top position — chin over bar, elbows fully bent — and hold. (No chair needed: a controlled jump from under the bar is the mount.)',
      formStandard: [
        'Chin over the bar without reaching with the neck',
        'Elbows fully closed, bar at upper chest',
        'Blades down — no hanging in the shrug',
        'Quiet body'
      ],
      scheme: { kind: 'hold', sets: 3, holdWindow: [10, 30] },
      unlock: '3 holds of 30s',
      boss: { tier: 'pull.bar.negatives', standard: { kind: 'reps', value: 3 }, label: '3 five-second negatives' },
      regression: 'pull.bar.scap-pulls',
      commonFaults: [
        { id: 'neck-reach', text: 'Chin pokes to stay over the bar as elbows open' },
        { id: 'shrug', text: 'Hanging off the traps instead of the lats' }
      ],
      faultSideQuests: {
        'neck-reach': { id: 'sq.hang-honest', name: 'Hold ends when elbows open, 3 honest holds', note: 'The chin is a liar. Time the elbows.' },
        'shrug': { id: 'sq.scap-depression', name: 'Scap depression holds, 3×8s', note: 'Down-blades even at the top.' }
      },
      rig: ['hang-flexed.top'],
      videoRef: { creator: 'GMB', search: 'flexed arm hang chin over bar' },
      tutorial: ['Jump up — do not pull up — to start', 'The hold ends when the elbows open, not the chin']
    },
    {
      id: 'pull.bar.negatives',
      name: 'Slow Negatives',
      hookSlot: 'pull-bar-t4',
      branch: 'bar',
      prereqs: ['pull.bar.flexed-hang'],
      equipment: ['bar'],
      setup: 'Jump to the top position. Lower to a dead hang as slowly as you can control. Five seconds is the working standard.',
      formStandard: [
        'Five seconds top to dead hang, evenly paced',
        'No free-fall through the middle third',
        'Finish at a full dead hang every rep',
        'Drop and reset — no kipping back up'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [3, 6] },
      unlock: '3 sets of 6 five-second negatives',
      boss: { tier: 'pull.bar.partial-rom', standard: { kind: 'reps', value: 3 }, label: '3 half-range pull-ups from dead hang' },
      regression: 'pull.bar.flexed-hang',
      commonFaults: [
        { id: 'midfall', text: 'Middle third free-falls — control only at top and bottom' },
        { id: 'short-finish', text: 'Dropping off before the dead hang' }
      ],
      faultSideQuests: {
        'midfall': { id: 'sq.mid-iso', name: '90-degree hold, 3×8s', note: 'The middle is weakest because it is never visited.' },
        'short-finish': { id: 'sq.deadhang-finish', name: 'Every negative ends with a 3s dead hang', note: 'Finish the floor of the movement.' }
      },
      rig: ['negative.top', 'negative.mid', 'negative.bottom'],
      videoRef: { creator: 'FitnessFAQs', search: 'pull up negatives 5 seconds' },
      tutorial: ['Count out loud — five honest seconds', 'The middle third is the test']
    },
    {
      id: 'pull.bar.partial-rom',
      name: 'Partial-Range Pull-Up',
      hookSlot: 'pull-bar-t5',
      branch: 'bar',
      prereqs: ['pull.bar.negatives'],
      equipment: ['bar'],
      setup: 'From a dead hang, pull to roughly 90-degree elbows (eyes near bar height). The bottom half is the hard half — this tier owns it.',
      formStandard: [
        'Start from a motionless dead hang',
        'Blades set first, then pull',
        'Elbows reach 90 degrees minimum',
        'Controlled negative back to dead hang'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [3, 8] },
      unlock: '3 sets of 8 at form standard',
      boss: { tier: 'pull.bar.full', standard: { kind: 'reps', value: 3 }, label: '3 full dead-hang pull-ups' },
      regression: 'pull.bar.negatives',
      commonFaults: [
        { id: 'kip', text: 'Hips swing to start the pull' },
        { id: 'no-scap', text: 'Pulling with arms before blades set' }
      ],
      faultSideQuests: {
        'kip': { id: 'sq.deadstop-pull', name: '2s motionless hang before every rep', note: 'Stillness, then strength. In that order.' },
        'no-scap': { id: 'sq.scap-first', name: 'Scap pull + partial as one rep, 2×5', note: 'Blades, then bend. Two beats.' }
      },
      rig: ['pullup-partial.start', 'pullup-partial.mid'],
      videoRef: { creator: 'FitnessFAQs', search: 'pull up bottom half partial reps' },
      tutorial: ['Dead stop before every rep', 'Blades, then bend']
    },
    {
      id: 'pull.bar.full',
      name: 'Pull-Up',
      hookSlot: 'pull-bar-t6',
      branch: 'bar',
      prereqs: ['pull.bar.partial-rom'],
      equipment: ['bar'],
      setup: 'Dead hang to chin over bar. The standard pull-up, done strictly.',
      formStandard: [
        'Dead hang start, motionless',
        'Chin clearly over the bar without neck reach',
        'No kip, no leg drive',
        'Two-second negative to full hang'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [3, 8] },
      unlock: '3 sets of 8 strict',
      boss: { tier: 'pull.bar.chest-to-bar', standard: { kind: 'reps', value: 3 }, label: '3 chest-to-bar pull-ups' },
      regression: 'pull.bar.partial-rom',
      commonFaults: [
        { id: 'kip', text: 'Legs swim on the last reps' },
        { id: 'neck-reach', text: 'Chin pokes over while the chest stays low' },
        { id: 'short-negative', text: 'Dropping the negative' }
      ],
      faultSideQuests: {
        'kip': { id: 'sq.hollow-pullup', name: 'Hollow-body pull-ups, 2×5', note: 'Toes pointed, glutes on. The swim is core leaking.' },
        'neck-reach': { id: 'sq.row-iso-top', name: 'Top holds above the bar, 3×5s', note: 'Be strong where you cheat.' },
        'short-negative': { id: 'sq.row-negatives', name: 'Last rep of each set: 5s negative', note: 'The negative is free strength. Stop refusing it.' }
      },
      rig: ['pullup.start', 'pullup.mid', 'pullup.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'strict pull up form dead hang' },
      tutorial: ['Strict means motionless start', 'Chin over, chest proud']
    },
    {
      id: 'pull.bar.chest-to-bar',
      name: 'Chest-to-Bar Pull-Up',
      hookSlot: 'pull-bar-t7',
      branch: 'bar',
      prereqs: ['pull.bar.full'],
      equipment: ['bar'],
      setup: 'Pull until the bar touches at or below the collarbone. The extra range is upper-back strength the one-arm road requires.',
      formStandard: [
        'Bar touches chest at/below the collarbones',
        'Elbows drive down and back at the top',
        'No kip',
        'Controlled negative'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [3, 6] },
      unlock: '3 sets of 6 with chest contact',
      boss: { tier: 'pull.bar.archer', standard: { kind: 'reps', value: 2, perSide: true }, label: '2 archer pull-ups per side' },
      regression: 'pull.bar.full',
      commonFaults: [
        { id: 'no-contact', text: 'Bar hovers an inch from the chest' },
        { id: 'kip', text: 'Hip snap appears as range demands rise' }
      ],
      faultSideQuests: {
        'no-contact': { id: 'sq.ctb-iso', name: 'Chest-contact holds, 3×3s', note: 'Touch is binary. Make contact.' },
        'kip': { id: 'sq.hollow-pullup', name: 'Hollow chest-to-bar, 2×3', note: 'Range without rigidity is borrowed.' }
      },
      rig: ['pullup-ctb.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'chest to bar strict pull up' },
      tutorial: ['Contact or no count', 'Elbows down and back at the top']
    },
    {
      id: 'pull.bar.archer',
      name: 'Archer Pull-Up',
      hookSlot: 'pull-bar-t8',
      branch: 'bar',
      prereqs: ['pull.bar.chest-to-bar'],
      equipment: ['bar'],
      setup: 'Wide grip; pull to one hand while the other arm straightens along the bar. The straight arm assists less every week.',
      formStandard: [
        'Chin over the working hand',
        'Off arm straight at the top — a rail, not a rower',
        'Shoulders level through the rep',
        'Equal work both sides'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [2, 5], perSide: true },
      unlock: '3 sets of 5 per side',
      boss: { tier: 'pull.bar.typewriter', standard: { kind: 'reps', value: 2, perSide: true }, label: '2 typewriters per side' },
      regression: 'pull.bar.chest-to-bar',
      commonFaults: [
        { id: 'assist-bend', text: 'Off arm bends and shares the load' },
        { id: 'twist', text: 'Hips rotate toward the working side' },
        { id: 'side-gap', text: 'Sides drift apart in quality' }
      ],
      faultSideQuests: {
        'assist-bend': { id: 'sq.archer-tempo', name: 'Archer negatives, 2×3 per side, 4s', note: 'The straight arm earns its keep on the way down.' },
        'twist': { id: 'sq.antirotation-hold', name: 'Side plank, 3×15s per side', note: 'Lock the box before you tilt it.' },
        'side-gap': { id: 'sq.weak-side-first', name: 'Weak side opens every archer set', note: 'Lead with the lagging hand.' }
      },
      rig: ['archer-pull.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'archer pull up progression' },
      tutorial: ['The off arm is a rail', 'Weak side first, always']
    },
    {
      id: 'pull.bar.typewriter',
      name: 'Typewriter Pull-Up',
      hookSlot: 'pull-bar-t9',
      branch: 'bar',
      prereqs: ['pull.bar.archer'],
      equipment: ['bar'],
      setup: 'Pull to one hand, slide horizontally across to the other hand while staying above the bar, lower. Time under tension at the top of the hardest range.',
      formStandard: [
        'Chin stays above bar height through the slide',
        'Slide is smooth — no drop-and-catch in the middle',
        'Both directions trained equally',
        'Controlled exit negative'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [2, 4], perSide: true },
      unlock: '3 sets of 4 per direction',
      boss: { tier: 'pull.bar.uneven', standard: { kind: 'reps', value: 2, perSide: true }, label: '2 uneven-grip pull-ups per side' },
      regression: 'pull.bar.archer',
      commonFaults: [
        { id: 'sag-middle', text: 'Body drops in the middle of the slide' },
        { id: 'jerk', text: 'Slide becomes a lurch' }
      ],
      faultSideQuests: {
        'sag-middle': { id: 'sq.ctb-iso', name: 'Mid-slide hold, 3×3s', note: 'Pause where you sink.' },
        'jerk': { id: 'sq.slow-slide', name: 'Three-second slides, 2×2 per direction', note: 'Smooth is strong.' }
      },
      rig: ['typewriter.left', 'typewriter.right'],
      videoRef: { creator: 'FitnessFAQs', search: 'typewriter pull up tutorial' },
      tutorial: ['Stay tall through the slide', 'Slow beats far']
    },
    {
      id: 'pull.bar.uneven',
      name: 'Uneven-Grip Pull-Up',
      hookSlot: 'pull-bar-t10',
      branch: 'bar',
      prereqs: ['pull.bar.typewriter'],
      equipment: ['bar'],
      setup: 'One hand on the bar, the other gripping the WRIST of the bar arm (bar + nothing else). The wrist-grip arm assists; the bar arm leads. The doorway to the one-arm road.',
      formStandard: [
        'Bar-side arm does visibly most of the work',
        'Chin over the bar-side hand',
        'Assist hand on the wrist, not the forearm',
        'No swing'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [2, 5], perSide: true },
      unlock: '3 sets of 5 per side with wrist-grip assist',
      boss: null, // branch capstone in the slice; full build continues to one-arm
      regression: 'pull.bar.typewriter',
      commonFaults: [
        { id: 'assist-pull', text: 'Wrist hand secretly leads' },
        { id: 'swing', text: 'Asymmetric load starts a pendulum' }
      ],
      faultSideQuests: {
        'assist-pull': { id: 'sq.assist-audit', name: 'Two-finger wrist assist, 2×3 per side', note: 'Count the fingers. Then count fewer.' },
        'swing': { id: 'sq.quiet-hang', name: 'Uneven hang holds, 3×10s per side', note: 'Still first. Strong second.' }
      },
      rig: ['uneven.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'uneven grip wrist pull up one arm progression' },
      tutorial: ['The wrist hand is a witness, not a worker', 'Quiet body before strong body']
    }
  ]
};

export default PULL_TREE;
