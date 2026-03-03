# STRUCTURAL FINGERPRINT CHECK (MANDATORY)

Before finalizing your JSON, compute your STRUCTURAL FINGERPRINT. This is the shape of your zine — not its theme, not its names, not its dice.

## Step 1: Compute the fingerprint

| Dimension | Your Value |
|-----------|-----------|
| **Category count** | How many of the 8 primitive categories are you using? (from `mechanicalProfile.categoriesUsed.length`) |
| **Has spatial** | Did you include a spatial mechanic (5A, 5B, or 5C)? Answer: `yes` or `no` |
| **Encounter variant diversity** | How many distinct encounter configurations appear? Count unique combinations of: `special` types (rest, branch, boss) and `pacingHint` values (breather, crescendo, transition). A standard encounter with no special type and no pacingHint counts as 1. |
| **Arc shape** | Which arc shape did you declare? (from `mechanicalProfile.arcShape`) |
| **Zeroed pillars** | How many experiential pillars have weight 0? |
| **Wire topology** | List wire types used (threshold-gate, feedback-loop, etc.). What is the dominant type? |

Your fingerprint string: `{categoryCount}-{hasSpatial}-{encounterVariety}-{arcShape}-{zeroPillarCount}-{dominantWireType}`

Example: `3-yes-4-slow-burn-3-threshold-gate` or `6-no-5-three-act-2-feedback-loop`

## Step 2: Check against the default template

The DEFAULT TEMPLATE fingerprint is: `6-no-3-three-act-2-threshold-gate`

This means: 6+ categories, NO spatial mechanic, only 3 encounter variants (standard + one special + one pacing hint), three-act arc, exactly 2 zeroed pillars (the Stage W minimum), mostly threshold-gate wires.

**If your fingerprint matches the default template on 4 or more of the 6 dimensions, you MUST redesign.** Change at least 2 dimensions to create genuine structural difference:

- Drop categories (aim for 3-5 instead of 6-7)
- **Use a spatial mechanic** (change `hasSpatial` from `no` to `yes` — this is the highest-impact single change)
- Increase encounter variety (use more special types: rest, branch, boss; use more pacingHint values: breather, crescendo, transition)
- Use a non-standard arc (slow-burn, front-loaded, oscillating, crescendo)
- Zero 2+ pillars (not everything matters equally in every story)
- Use diverse wire types (feedback-loops and conditional-routing, not just threshold-gates)

## Step 3: Wire topology audit

Valid wire types (from the wiring catalog): `threshold-gate`, `feedback-loop`, `conditional-routing`, `resource-cycle`, `escalation`, `unlock-chain`.

List your wire implementation from the Stage W blueprint:

- How many of each wire type? (e.g., "2 threshold-gate, 1 feedback-loop, 1 escalation")
- What is your tracker mix? (e.g., "2 fill clocks, 1 heat track" or "1 tug-of-war only" or "none") — if all trackers are the same type, consider whether the blueprint actually demands that uniformity.
- Confirm each wire from the blueprint is implemented: name the mechanic that serves as `from`, the target that serves as `to`, and where the `printInstruction` appears in your output.
- If a wire was specified in the blueprint but you did not implement it, explain why.

## Step 4: Compliance statement

State your fingerprint, confirm it does not match the default template on 4+ dimensions, **explicitly state your `hasSpatial` value and justify it** (either name the spatial mechanic you selected, or explain why a spatial mechanic does not serve this story), and confirm your encounter variant count by listing the distinct encounter configurations from your `encounters[]` array (count unique combinations of `special` type and `pacingHint` value, plus standard encounters as one configuration).

GENERATE THE JSON NOW:
