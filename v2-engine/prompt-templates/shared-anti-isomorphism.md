# 7. STRUCTURAL FINGERPRINT CHECK (MANDATORY)

Before finalizing your JSON, compute your STRUCTURAL FINGERPRINT. This is the shape of your zine — not its theme, not its names, not its dice.

## Step 1: Compute the fingerprint

| Dimension | Your Value |
|-----------|-----------|
| **Category count** | How many of the 8 primitive categories are you using? (from `mechanicalProfile.categoriesUsed.length`) |
| **Page vocabulary size** | How many distinct page types appear in your `pages[]` array? |
| **Arc shape** | Which arc shape did you declare? (from `mechanicalProfile.arcShape`) |
| **Zeroed pillars** | How many experiential pillars have weight 0? |
| **Wire topology** | List wire types used (threshold-gate, feedback-loop, etc.). What is the dominant type? |
| **Tracker profile** | What mix of tracker types? (e.g., "2 fill, 1 heat" or "1 tug only" or "none") |

Your fingerprint string: `{categoryCount}-{pageVocabSize}-{arcShape}-{zeroPillarCount}-{dominantWireType}`

Example: `3-7-slow-burn-3-threshold-gate` or `6-9-three-act-2-feedback-loop`

## Step 2: Check against the default template

The DEFAULT TEMPLATE fingerprint is: `6-9-three-act-0-threshold-gate`

This means: 6+ categories, all 9 page types, three-act arc, no zeroed pillars, mostly threshold-gate wires.

**If your fingerprint matches the default template on 4 or more of the 5 dimensions, you MUST redesign.** Change at least 2 dimensions to create genuine structural difference:

- Drop categories (aim for 3-5 instead of 6-7)
- Remove page types (does this zine really need a tracker-sheet? a setup page?)
- Use a non-standard arc (slow-burn, front-loaded, oscillating, crescendo)
- Zero 2+ pillars (not everything matters equally in every story)
- Use diverse wire types (feedback-loops and conditional-routing, not just threshold-gates)

## Step 3: Wire topology audit

List your wire implementation from the Stage W blueprint:
- How many threshold-gates? Feedback-loops? Conditional routes? Escalation wires? Unlock-chains?
- Confirm each wire from the blueprint is implemented: name the mechanic that serves as `from`, the target that serves as `to`, and where the `printInstruction` appears in your output.
- If a wire was specified in the blueprint but you did not implement it, explain why.

## Step 4: Compliance statement

State your fingerprint, confirm it does not match the default template on 4+ dimensions, and confirm your `pages[]` array matches your `mechanicalProfile.pageVocabulary`.

GENERATE THE JSON NOW:
