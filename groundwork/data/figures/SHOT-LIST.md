# Groundwork Figure Photos — Shot List

Every tier shows up to 3 photos (start / mid / end position) in the intake's
"How to do it," in learn mode, and behind the room's Form standard disclosure.
**Filename contract:** `<tier id, dots→dashes>-<frame>.webp` in this folder,
portrait 3:4, e.g. `pull-lever-tuck-hold-1.webp`. Missing files simply don't
render — ship what you have, fill in over time. **After adding files, run
`npm run figures`** (regenerates the manifest the app reads), then redeploy.

## Two ways to produce them

**Option A — shoot yourself (recommended).** Phone on a tripod or propped chair-
height surface, landscape room / portrait crop, consistent spot, consistent
clothing. One 30–40 minute session covers everything below. Style target:
plain instructional, the way Keeper Eight would document form — slightly utilitarian
is *correct*. Convert: `cwebp -q 80 in.jpg -o out.webp` (or any converter, or
export WebP from Photos/Preview). Aim under 60KB each.

**Option B — image-generation model.** Use the style block once, then one prompt
per frame below. **Verification rule (you are learning these movements, so the
image must not teach a fault): after generating each frame, check it against
the tier's ▶ video link in the app before keeping it.** The frame descriptions
below encode the correct positions in words — if the image disagrees with the
description or the video, regenerate. Common model mistakes to reject: sagging
hips on any lever frame (the body must be a flat line), bent elbows on
straight-arm work, chin poking forward at the top of pulls.

**Option C — progressive self-documentation (the long game).** Once you CLEAR
a tier you know its form (learn mode + the AAR phone-video self-check teach
it). Photograph yourself then, replacing any generated frame. Over months the
manual fills with your own documentation — which is also exactly what the
fiction says it is.

> STYLE BLOCK (prepend to every prompt): "Instructional fitness photograph,
> exercise reference book style, the same athletic adult in a plain grey
> t-shirt and dark joggers in every image, neutral grey wall, soft even
> lighting, full body visible, camera at chest height from the side unless
> stated, no text, no watermark, photorealistic, 3:4 portrait."

## LEVER CORRIDOR

**pull-lever-floor-scap** (Prone Y-T-W Raises) — camera: side-high 45°
1. Face-down on a yoga mat, arms overhead in a Y, forehead down, arms resting.
2. Arms in Y raised off the floor, thumbs rotated up, neck long, lower back flat.
3. Arms in W (elbows bent 90°) raised, shoulder blades visibly pinched.

**pull-lever-hollow-hang** (Hollow Tuck Hang) — camera: full side
1. Dead hang from a pull-up bar, body straight, relaxed.
2. Knees tucked to hip height, lower back rounded, shoulder blades pulled down.
3. (skip — two frames suffice)

**pull-lever-tuck-hold** (Tuck Front-Lever Hold) — camera: full side
1. Hollow tuck hang, arms straight.
2. Mid-pull: hips rising, arms still straight.
3. Back parallel to floor, knees tight to chest, arms locked straight, gaze up.

**pull-lever-tuck-pull** (Tuck-Lever Pull) — camera: full side
1. Hollow tuck hang, straight arms.
2. Body halfway to horizontal, arms straight.
3. Horizontal tuck position, paused.

**pull-lever-tuck-row** (Tuck-Lever Row) — camera: full side
1. Horizontal tuck, arms straight.
2. Mid-row: elbows bending, bar moving toward hips, body still horizontal.
3. Bar at hip line, elbows driven back, body flat.

**pull-lever-adv-tuck-row** (Advanced-Tuck Row) — camera: full side
1. Advanced tuck hold (knees at 90°, shins parallel to floor), arms straight.
2. Mid-row at 90° knee angle, back flat.
3. Bar at hips, knee angle unchanged.

**pull-lever-single-leg-row** (Single-Leg Lever Row) — camera: full side
1. One leg extended in line with torso, other tucked, horizontal, arms straight.
2. Mid-row, hips level, extended leg on the body line.
3. Bar at hips, no twist, leg still in line.

**pull-lever-straddle-row** (Straddle-Lever Row) — camera: front-side 45°
1. Straddle front lever hold, both legs straight and wide, body flat.
2. Mid-row, straddle wide, hips level with shoulders.
3. Bar at hips, full straddle, flat beam.

## BAR CORRIDOR

**pull-bar-dead-hang** (Dead Hang) — camera: full side
1. Full hang, thumbs-wrapped grip, arms straight, body still. (one frame)

**pull-bar-scap-pulls** (Scap Pulls) — camera: full side
1. Dead hang, shoulders up by the ears (relaxed).
2. Blades pulled down and together, elbows still locked, body risen ~5cm, neck long.

**pull-bar-flexed-hang** (Flexed-Arm Hang) — camera: full side
1. Chin over the bar, elbows fully closed, bar at upper chest, blades down. (one frame)

**pull-bar-negatives** (Slow Negatives) — camera: full side
1. Top position, chin over bar.
2. Halfway down, elbows at 90°, visibly controlled.
3. Dead hang finish, arms straight.

**pull-bar-partial-rom** (Partial-Range Pull-Up) — camera: full side
1. Motionless dead hang, blades set.
2. Pulled to 90° elbows, eyes near bar height.

**pull-bar-full** (Pull-Up) — camera: full side
1. Dead hang, motionless.
2. Mid-pull, elbows driving down.
3. Chin clearly over the bar, chest proud, no neck reach.

**pull-bar-chest-to-bar** (Chest-to-Bar Pull-Up) — camera: full side
1. Dead hang.
2. Bar touching at the collarbones, elbows down and back.

**pull-bar-archer** (Archer Pull-Up) — camera: front
1. Wide grip dead hang.
2. Chin over the working hand, other arm straight along the bar like a rail.

**pull-bar-typewriter** (Typewriter Pull-Up) — camera: front
1. Top position over the left hand.
2. Mid-slide, chin above bar height, body level.
3. Top position over the right hand.

**pull-bar-uneven** (Uneven-Grip Pull-Up) — camera: front-side 45°
1. One hand on the bar, other hand gripping that wrist, dead hang.
2. Chin over the bar-side hand, wrist arm assisting below.

## Coverage checklist

~40 frames total. Priority order if shooting in batches: your two ACTIVE tiers
first (they render in learn mode immediately), then the rest of each corridor
upward, then the capstones.
