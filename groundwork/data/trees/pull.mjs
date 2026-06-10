// ── Groundwork skill tree: PULL ──────────────────────────────────────────────
// Original tier chart authored for Groundwork on Overcoming Gravity-style
// methodology (strength-endurance rep windows, paired push/pull balance,
// conservative connective-tissue pacing). No book text or chart reproduced.
//
// Two branches: ROWS (horizontal pull) and BAR (vertical pull). Both train
// every session the tree is scheduled; horizontal/vertical balance is a
// structural-balance requirement, not a choice.
//
// Field contract (every tier):
//   id, name           — engine identity + plain name (narrative skins rename
//                        via hookSlot, never here)
//   hookSlot           — stable key a campaign skin binds flavor to
//   branch             — 'rows' | 'bar'
//   prereqs            — tier ids that must be cleared (ability gates)
//   equipment          — tags from EQUIPMENT_TAGS; every TRX tag has a
//                        noTrxFallback; bar-only completability is validated
//   setup              — how to set up the movement (plain text)
//   formStandard       — 3-5 checkable points; the canonical truth (L1 of the
//                        instruction block)
//   scheme             — working scheme: { kind:'reps', sets, repWindow:[lo,hi] }
//                        or { kind:'hold', sets, holdWindow:[lo,hi] (seconds) }
//   unlock             — top of window across ALL sets at form standard
//   boss               — the gate test: clean reps/hold OF THE NEXT TIER
//   regression         — tier id to fall back to when the floor is missed
//   commonFaults       — observable faults (used by AAR self-check)
//   faultSideQuests    — fault id → side-quest accessory (intel-drop payload)
//   rig                — keyframe ids in data/rig (slice: pull tiers only)
//   videoRef           — creator + search terms, never a bare URL
//   tutorial           — one form point emphasized per learn-mode set

export const PULL_TREE = {
  id: 'pull',
  name: 'Pull',
  voiceSlot: 'pull-voice',          // campaign skins cast this (tree voice)
  statBase: 20,                      // d100 roll-under stat = statBase +
  statPerTier: 6,                    //   clearedTiers*statPerTier + recent
  statRecentMax: 15,                 //   performance bonus (capped), cap 85
  statCap: 85,
  branches: {
    rows: { name: 'Rows', note: 'Horizontal pull. Scapular retraction under load.' },
    bar: { name: 'Bar', note: 'Vertical pull. Hang tolerance before pulling strength — tendons first.' }
  },

  // ── Assessment ladder (Session Zero) ──────────────────────────────────────
  // Ordered easy → hard. Perform each until the standard is missed; placement
  // = last tier passed per branch. Impossible to fail: every outcome is a
  // valid starting stat. Fatigue cap: stop a branch after the first miss;
  // never test both branches to failure back-to-back (engine inserts 3 min
  // rest and alternates branches).
  assessmentLadder: [
    { tier: 'pull.rows.incline-high', standard: { kind: 'reps', value: 8 } },
    { tier: 'pull.bar.dead-hang', standard: { kind: 'hold', value: 20 } },
    { tier: 'pull.rows.incline-low', standard: { kind: 'reps', value: 8 } },
    { tier: 'pull.bar.scap-pulls', standard: { kind: 'reps', value: 6 } },
    { tier: 'pull.rows.horizontal', standard: { kind: 'reps', value: 6 } },
    { tier: 'pull.bar.flexed-hang', standard: { kind: 'hold', value: 15 } },
    { tier: 'pull.rows.feet-elevated', standard: { kind: 'reps', value: 6 } },
    { tier: 'pull.bar.negatives', standard: { kind: 'reps', value: 3 } },
    { tier: 'pull.rows.wide', standard: { kind: 'reps', value: 6 } },
    { tier: 'pull.bar.partial-rom', standard: { kind: 'reps', value: 3 } },
    { tier: 'pull.rows.archer', standard: { kind: 'reps', value: 4, perSide: true } },
    { tier: 'pull.bar.full', standard: { kind: 'reps', value: 5 } },
    { tier: 'pull.bar.chest-to-bar', standard: { kind: 'reps', value: 3 } },
    { tier: 'pull.rows.one-arm-assisted', standard: { kind: 'reps', value: 3, perSide: true } },
    { tier: 'pull.bar.archer', standard: { kind: 'reps', value: 2, perSide: true } },
    { tier: 'pull.bar.typewriter', standard: { kind: 'reps', value: 2, perSide: true } },
    { tier: 'pull.rows.one-arm', standard: { kind: 'reps', value: 2, perSide: true } },
    { tier: 'pull.bar.uneven', standard: { kind: 'reps', value: 3, perSide: true } }
  ],

  tiers: [
    // ════════════════════════ ROWS BRANCH ════════════════════════
    {
      id: 'pull.rows.incline-high',
      name: 'High Incline Row',
      hookSlot: 'pull-rows-t1',
      branch: 'rows',
      prereqs: [],
      equipment: ['table-edge', 'trx-optional'],
      noTrxFallback: 'Sturdy table edge, desk lip, or two chairs with a broomstick across.',
      setup: 'Grip a sturdy table edge (or straps set long), walk feet forward until your body is at roughly 45 degrees. Body in one line, heels on the floor.',
      formStandard: [
        'Body rigid from heels to head — no hip sag or pike',
        'Shoulder blades pull down and together before the arms bend',
        'Chest touches (or nearly touches) the edge at the top',
        'Two seconds down, no dropping'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [8, 12] },
      unlock: '3 sets of 12 at form standard',
      boss: { tier: 'pull.rows.incline-low', standard: { kind: 'reps', value: 5 }, label: '5 clean reps at the lower angle' },
      regression: null,
      commonFaults: [
        { id: 'hip-sag', text: 'Hips sag — body bends at the waist' },
        { id: 'shrug', text: 'Shoulders shrug toward ears instead of pulling blades together' },
        { id: 'partial-top', text: 'Chest stops short of the edge' }
      ],
      faultSideQuests: {
        'hip-sag': { id: 'sq.plank-rkc', name: 'Hard-style plank, 3×20s', note: 'A rigid row is a moving plank. Earn the line.' },
        'shrug': { id: 'sq.scap-retraction', name: 'Scap retraction holds, 3×10×2s', note: 'Blades down and back; pause where they meet.' },
        'partial-top': { id: 'sq.row-iso-top', name: 'Top-position hold, 3×10s', note: 'Own the inch you keep skipping.' }
      },
      rig: ['row-incline.start', 'row-incline.top'],
      videoRef: { creator: 'Darebee or FitnessFAQs', search: 'incline bodyweight row table tutorial' },
      tutorial: ['Set the blades before the arms', 'Body is one plank, hips locked']
    },
    {
      id: 'pull.rows.incline-low',
      name: 'Low Incline Row',
      hookSlot: 'pull-rows-t2',
      branch: 'rows',
      prereqs: ['pull.rows.incline-high'],
      equipment: ['table-edge', 'trx-optional'],
      noTrxFallback: 'Lower table, or bar of a sturdy chair-bridge at hip height.',
      setup: 'Same as high incline but the anchor is near hip height; body approaches 30 degrees.',
      formStandard: [
        'Body rigid, heels planted',
        'Blades set first, elbows track 45 degrees from ribs',
        'Full touch at top, full hang at bottom',
        'Controlled two-second negative'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [8, 12] },
      unlock: '3 sets of 12 at form standard',
      boss: { tier: 'pull.rows.horizontal', standard: { kind: 'reps', value: 5 }, label: '5 clean horizontal rows' },
      regression: 'pull.rows.incline-high',
      commonFaults: [
        { id: 'hip-sag', text: 'Hips sag at the lower angle' },
        { id: 'elbow-flare', text: 'Elbows flare to 90 degrees' },
        { id: 'speed-drop', text: 'Negative becomes a drop as sets get heavy' }
      ],
      faultSideQuests: {
        'hip-sag': { id: 'sq.plank-rkc', name: 'Hard-style plank, 3×20s', note: 'The angle got lower. The plank has to get harder.' },
        'elbow-flare': { id: 'sq.row-elbow-path', name: 'Slow rows at the easier angle, 2×8, watching elbow path', note: 'Forty-five degrees. Film it.' },
        'speed-drop': { id: 'sq.row-negatives', name: '3×5 three-second negatives at this angle', note: 'The way down is half the rep.' }
      },
      rig: ['row-low.start', 'row-low.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'bodyweight row progression low angle' },
      tutorial: ['Angle changes, the plank does not', 'Elbows at 45, never 90']
    },
    {
      id: 'pull.rows.horizontal',
      name: 'Horizontal Row',
      hookSlot: 'pull-rows-t3',
      branch: 'rows',
      prereqs: ['pull.rows.incline-low'],
      equipment: ['low-bar', 'trx-optional'],
      noTrxFallback: 'Broomstick across two chairs; low pull-up bar; sturdy table you can lie under.',
      setup: 'Anchor at roughly knee height. Body horizontal, heels on the floor, arms start fully extended.',
      formStandard: [
        'Body one straight line, hips never touch down between reps',
        'Chest to the bar/edge every rep',
        'Blades lead, arms finish',
        'Two-second negative, dead-stop hang at the bottom'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [6, 10] },
      unlock: '3 sets of 10 at form standard',
      boss: { tier: 'pull.rows.feet-elevated', standard: { kind: 'reps', value: 5 }, label: '5 clean feet-elevated rows' },
      regression: 'pull.rows.incline-low',
      commonFaults: [
        { id: 'hip-sag', text: 'Hips drop on later reps' },
        { id: 'partial-top', text: 'Chest stops a fist short of the bar' },
        { id: 'kip', text: 'Hips bounce to start the pull' }
      ],
      faultSideQuests: {
        'hip-sag': { id: 'sq.hollow-hold', name: 'Hollow-body hold, 3×20s', note: 'The line breaks where the core gives.' },
        'partial-top': { id: 'sq.row-iso-top', name: 'Top hold at chest, 3×8s', note: 'Touch it. Hold it. Then talk.' },
        'kip': { id: 'sq.row-deadstop', name: 'Dead-stop rows, 2×6 with 1s hang', note: 'Kill the bounce at the bottom.' }
      },
      rig: ['row-horizontal.start', 'row-horizontal.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'inverted row form chest to bar' },
      tutorial: ['Dead hang between reps — no bounce', 'Chest to bar or it does not count']
    },
    {
      id: 'pull.rows.feet-elevated',
      name: 'Feet-Elevated Row',
      hookSlot: 'pull-rows-t4',
      branch: 'rows',
      prereqs: ['pull.rows.horizontal'],
      equipment: ['low-bar', 'chair'],
      noTrxFallback: 'Feet on a chair, hands on broomstick-across-chairs or low bar.',
      setup: 'As horizontal row, feet elevated to anchor height or above. Bodyweight share on the arms rises past half.',
      formStandard: [
        'Hips level with the body line even with feet up',
        'Chest to bar every rep',
        'No neck poke — head stays in line',
        'Two-second negative'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [6, 10] },
      unlock: '3 sets of 10 at form standard',
      boss: { tier: 'pull.rows.wide', standard: { kind: 'reps', value: 5 }, label: '5 clean wide rows' },
      regression: 'pull.rows.horizontal',
      commonFaults: [
        { id: 'hip-sag', text: 'Hips hang below the line' },
        { id: 'neck-poke', text: 'Chin juts to fake the last inch' },
        { id: 'partial-top', text: 'Range shrinks as sets accumulate' }
      ],
      faultSideQuests: {
        'hip-sag': { id: 'sq.hollow-hold', name: 'Hollow-body hold, 3×25s', note: 'Feet up moved the lever. Pay the core its tax.' },
        'neck-poke': { id: 'sq.chin-pack', name: 'Chin-packed rows at horizontal, 2×8', note: 'The chin is not a pulling muscle.' },
        'partial-top': { id: 'sq.row-iso-top', name: 'Top hold, 3×8s, feet elevated', note: 'Prove the top exists before you visit it.' }
      },
      rig: ['row-elevated.start', 'row-elevated.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'feet elevated inverted row' },
      tutorial: ['The line tilts; it must not bend', 'Watch the chin']
    },
    {
      id: 'pull.rows.wide',
      name: 'Wide Row',
      hookSlot: 'pull-rows-t5',
      branch: 'rows',
      prereqs: ['pull.rows.feet-elevated'],
      equipment: ['low-bar'],
      noTrxFallback: 'Wide grip on any fixed bar; with rings/TRX use a high elbow path instead.',
      setup: 'Feet-elevated row with hands half again shoulder width, elbows tracking wide. Shifts load to rear delts and mid-back.',
      formStandard: [
        'Elbows track wide and high (about 70 degrees)',
        'Bar to upper chest, not sternum',
        'No shrug at the top',
        'Body line holds through every rep'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [6, 10] },
      unlock: '3 sets of 10 at form standard',
      boss: { tier: 'pull.rows.archer', standard: { kind: 'reps', value: 3, perSide: true }, label: '3 clean archer rows per side' },
      regression: 'pull.rows.feet-elevated',
      commonFaults: [
        { id: 'shrug', text: 'Traps take over at the top' },
        { id: 'narrow-drift', text: 'Hands drift narrow as fatigue builds' },
        { id: 'partial-top', text: 'Bar touches lower each set' }
      ],
      faultSideQuests: {
        'shrug': { id: 'sq.scap-depression', name: 'Scap depression holds on bar, 3×8s', note: 'Blades down. The shrug is the body lying about strength.' },
        'narrow-drift': { id: 'sq.wide-row-light', name: 'Wide rows at horizontal angle, 2×10', note: 'Groove the width where it is cheap.' },
        'partial-top': { id: 'sq.row-iso-top', name: 'Wide top hold, 3×6s', note: 'Upper chest. Every time.' }
      },
      rig: ['row-wide.start', 'row-wide.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'wide grip inverted row rear delt' },
      tutorial: ['Elbows wide and high', 'Touch the upper chest']
    },
    {
      id: 'pull.rows.archer',
      name: 'Archer Row',
      hookSlot: 'pull-rows-t6',
      branch: 'rows',
      prereqs: ['pull.rows.wide'],
      equipment: ['low-bar'],
      noTrxFallback: 'Fixed bar works; slide the assisting hand along the bar.',
      setup: 'Row position; pull to one side while the other arm stays straight, assisting along the bar. The straight arm gives less every week.',
      formStandard: [
        'Working-side shoulder stays square — no body twist past 15 degrees',
        'Straight arm assists, never bends',
        'Chest to bar on the working side',
        'Same rep count both sides'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [4, 8], perSide: true },
      unlock: '3 sets of 8 per side at form standard',
      boss: { tier: 'pull.rows.one-arm-assisted', standard: { kind: 'reps', value: 3, perSide: true }, label: '3 assisted one-arm rows per side' },
      regression: 'pull.rows.wide',
      commonFaults: [
        { id: 'twist', text: 'Torso rotates to cheat the working side' },
        { id: 'assist-bend', text: 'The straight arm bends and becomes a second rower' },
        { id: 'side-gap', text: 'One side is 2+ reps behind the other' }
      ],
      faultSideQuests: {
        'twist': { id: 'sq.antirotation-hold', name: 'One-arm plank touches, 3×6 per side', note: 'Anti-rotation is a skill. Train it on the floor first.' },
        'assist-bend': { id: 'sq.archer-tempo', name: 'Archer rows, 2×5, 3s negatives, watching the straight arm', note: 'Film the off arm. It is lying to you.' },
        'side-gap': { id: 'sq.weak-side-first', name: 'Start every row set on the weak side until even', note: 'The weak side goes first and sets the count.' }
      },
      rig: ['row-archer.start', 'row-archer.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'archer row one arm progression' },
      tutorial: ['Square shoulders — the twist is the cheat', 'Weak side first']
    },
    {
      id: 'pull.rows.one-arm-assisted',
      name: 'Assisted One-Arm Row',
      hookSlot: 'pull-rows-t7',
      branch: 'rows',
      prereqs: ['pull.rows.archer'],
      equipment: ['low-bar', 'towel'],
      noTrxFallback: 'Towel in the off hand anchored to the bar gives adjustable assist.',
      setup: 'One hand on the bar, other hand grips a towel hung from the bar. Assist only as much as the last clean rep needs.',
      formStandard: [
        'Hips and shoulders square to the bar',
        'Towel hand assists in the bottom half only',
        'Working arm reaches full extension every rep',
        'No corkscrew through the trunk'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [3, 6], perSide: true },
      unlock: '3 sets of 6 per side with fingertip assist only',
      boss: { tier: 'pull.rows.one-arm', standard: { kind: 'reps', value: 2, perSide: true }, label: '2 strict one-arm rows per side' },
      regression: 'pull.rows.archer',
      commonFaults: [
        { id: 'twist', text: 'Trunk corkscrews on the pull' },
        { id: 'overassist', text: 'Towel arm does the top half too' },
        { id: 'rom-loss', text: 'No full hang between reps' }
      ],
      faultSideQuests: {
        'twist': { id: 'sq.antirotation-hold', name: 'One-arm plank holds, 3×10s per side', note: 'Square is strength.' },
        'overassist': { id: 'sq.assist-audit', name: 'Two fingers on the towel, 2×4 per side', note: 'Count the fingers. Then count fewer.' },
        'rom-loss': { id: 'sq.deadhang-reset', name: 'One-arm dead-stop start, 2×3 per side', note: 'Every rep starts from honest zero.' }
      },
      rig: ['row-onearm.start', 'row-onearm.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'one arm inverted row towel assist' },
      tutorial: ['Assist the bottom, own the top', 'Square hips, square shoulders']
    },
    {
      id: 'pull.rows.one-arm',
      name: 'One-Arm Row',
      hookSlot: 'pull-rows-t8',
      branch: 'rows',
      prereqs: ['pull.rows.one-arm-assisted'],
      equipment: ['low-bar'],
      noTrxFallback: 'Any fixed bar at knee height.',
      setup: 'One hand on the bar, free arm at your side or behind the back. Full hang to chest-touch with a square trunk.',
      formStandard: [
        'Zero trunk rotation through the pull',
        'Full extension at the bottom, chest to bar at the top',
        'Free arm never touches anything',
        'Both sides within one rep of each other'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [2, 5], perSide: true },
      unlock: '3 sets of 5 per side at form standard',
      boss: null, // branch capstone in the slice; full build adds front-lever rows
      regression: 'pull.rows.one-arm-assisted',
      commonFaults: [
        { id: 'twist', text: 'Rotation sneaks back under max effort' },
        { id: 'side-gap', text: 'Strong side runs away from weak side' }
      ],
      faultSideQuests: {
        'twist': { id: 'sq.antirotation-hold', name: 'Weighted one-arm plank, 3×8s per side', note: 'The trunk is the second arm.' },
        'side-gap': { id: 'sq.weak-side-first', name: 'Weak side opens and closes every session', note: 'Symmetry is programmed, not wished for.' }
      },
      rig: ['row-onearm.start', 'row-onearm.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'strict one arm bodyweight row' },
      tutorial: ['This is an anti-rotation lift that happens to be a row', 'One rep gap maximum between sides']
    },

    // ════════════════════════ BAR BRANCH ════════════════════════
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
        'grip-fade': { id: 'sq.towel-hang', name: 'Towel hang, 3×10s', note: 'Grip is built where it is hardest.' },
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
      boss: { tier: 'pull.bar.flexed-hang', standard: { kind: 'hold', value: 10 }, label: '10s flexed-arm hang' },
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
      equipment: ['bar', 'chair'],
      setup: 'Jump or step (from a chair) to the top position — chin over bar, elbows fully bent — and hold.',
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
      tutorial: ['Step up — do not pull up — to start', 'The hold ends when the elbows open, not the chin']
    },
    {
      id: 'pull.bar.negatives',
      name: 'Slow Negatives',
      hookSlot: 'pull-bar-t4',
      branch: 'bar',
      prereqs: ['pull.bar.flexed-hang'],
      equipment: ['bar', 'chair'],
      setup: 'Start at the top (step up from a chair). Lower to a dead hang as slowly as you can control. Five seconds is the working standard.',
      formStandard: [
        'Five seconds top to dead hang, evenly paced',
        'No free-fall through the middle third',
        'Finish at a full dead hang every rep',
        'Step down and reset — no kipping back up'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [3, 6] },
      unlock: '3 sets of 6 five-second negatives',
      boss: { tier: 'pull.bar.partial-rom', standard: { kind: 'reps', value: 3 }, label: '3 half-range pull-ups from dead hang' },
      regression: 'pull.bar.flexed-hang',
      commonFaults: [
        { id: 'midfall', text: 'Middle third free-falls — control only at top and bottom' },
        { id: 'short-finish', text: 'Stepping off before the dead hang' }
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
      boss: { tier: 'pull.bar.uneven', standard: { kind: 'reps', value: 2, perSide: true }, label: '2 uneven pull-ups per side' },
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
      name: 'Uneven Pull-Up',
      hookSlot: 'pull-bar-t10',
      branch: 'bar',
      prereqs: ['pull.bar.typewriter'],
      equipment: ['bar', 'towel'],
      setup: 'One hand on the bar, the other gripping a towel hung from the bar at forearm length. The towel arm assists; the bar arm leads. The doorway to the one-arm road.',
      formStandard: [
        'Bar-side arm does visibly most of the work',
        'Chin over the bar-side hand',
        'Towel grip at forearm distance or lower',
        'No swing'
      ],
      scheme: { kind: 'reps', sets: 3, repWindow: [2, 5], perSide: true },
      unlock: '3 sets of 5 per side with towel at full forearm length',
      boss: null, // branch capstone in the slice; full build continues to one-arm
      regression: 'pull.bar.typewriter',
      commonFaults: [
        { id: 'towel-pull', text: 'Towel arm secretly leads' },
        { id: 'swing', text: 'Asymmetric load starts a pendulum' }
      ],
      faultSideQuests: {
        'towel-pull': { id: 'sq.assist-audit', name: 'Lower the towel grip one fist, 2×3', note: 'Lengthen the lie until it becomes the truth.' },
        'swing': { id: 'sq.quiet-hang', name: 'Uneven hang holds, 3×10s per side', note: 'Still first. Strong second.' }
      },
      rig: ['uneven.top'],
      videoRef: { creator: 'FitnessFAQs', search: 'uneven pull up towel one arm progression' },
      tutorial: ['The towel is a witness, not a worker', 'Quiet body before strong body']
    }
  ]
};

export default PULL_TREE;
