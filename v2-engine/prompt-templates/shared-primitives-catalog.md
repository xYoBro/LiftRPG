# 4. MECHANICAL SELECTION (THE PRIMITIVES CATALOG)

You must select game mechanics from the engine's menu.

**STRICT RULE: THE COMPLEXITY BUDGET CANNOT EXCEED 10.**
Do not give the player more mechanics than they can handle during a gym session.

**ZERO-MATH RULE: NO ARITHMETIC DURING PLAY.**
The player is mid-workout, sweaty, distracted, holding a pencil. Every mechanic must resolve
by a single action: roll → read result from table, or check a box, or circle a word. NEVER
require the player to add, subtract, multiply, or compare computed values. No "+1 modifiers",
no "roll minus stat", no "add stress die to result". If it requires mental math, redesign it.
Pure threshold lookups only: roll the dice, find your number in the outcome table, do what it says.

**SELF-DOCUMENTING DESIGN: THE ARTIFACT IS THE INSTRUCTION.**
Every tracker, clock, and resource on the printed page must be visually obvious in its usage.
A player seeing a row of 6 empty boxes with "RIDERS INBOUND" above it and an arrow pointing
right should understand "fill these left to right" without reading a rules page. Design
mechanics so the physical layout — boxes, circles, arrows, labels — teaches the player how
to use them. If a mechanic needs a paragraph of explanation, it is too complicated. Simplify
until the tracker itself is the tutorial.

Select your mechanics according to the user's narrative brief: [{{narrativeBrief}}].
Include exactly ONE "Resolution" mechanic from the list below. All other tracks, maps, and systems must support this core resolution and not violate your Complexity Budget.

**DICE CONSTRAINT:** The user's narrative brief includes an "Available Dice" line listing which dice they own. You MUST only select resolution systems and modifiers whose `Requires:` dice are ALL present in the user's available dice list. If no resolution system matches, default to 1F (Resource-as-Resolution / no dice). If "none" is listed, use only 1F.

## 1. RESOLUTION SYSTEMS (Pick ONE)

All resolution systems are pure lookups: roll → find number in table → read result. No math.

1A. Percentile / d100 Roll-Under — Roll d100, look up result in range table. Clinical, precise. Requires: d10, d%. Complexity: 1
1B. 2d6 Bell Curve (PbtA) — Roll 2d6, sum them, look up result: 2-6=miss, 7-9=partial, 10-12=hit. Requires: d6. Complexity: 1
1C. Single d6 Lookup — Roll 1d6, look up result in 6-row table. Fast, tactile. Requires: d6. Complexity: 1
1D. Degrading Threshold — Roll 1d6, check if result is at or under current threshold mark. Threshold degrades over time (cross off numbers). Requires: d6. Complexity: 2
1E. Advantage/Disadvantage — Roll 2d6, take higher (advantage) or lower (disadvantage). Stacks with any base system. Requires: d6. Complexity: 1
1F. Resource-as-Resolution (no dice) — Spend earned points to choose paths. Deterministic. Requires: none. Complexity: 2
1G. d10 Oracle Tables — Roll 1d10, read result from 10-row table. Fast unpredictable generation. Requires: d10. Complexity: 1
1H. d20 Lookup — Roll 1d20, look up result in 20-row table. Wide range, classic feel. Requires: d20. Complexity: 1
1I. Coin Flip — Flip a coin: heads/tails determines binary outcome. Fastest possible resolution. Requires: coin. Complexity: 1
1J. d12 Lookup — Roll 1d12, look up result in 12-row table. Requires: d12. Complexity: 1

## 2. MODIFIER MECHANICS (Pick 0-2)

No modifier may require arithmetic. Modifiers change WHICH table you read or WHETHER you reroll — never the number itself.

2A. Push (Year Zero) — After rolling, choose: accept result OR reroll and tick a clock/lose a resource. Binary choice, no math. Requires: same die as resolution. Complexity: 2
2B. Oracle Detail Tables — Small d6 tables within story nodes for variable details (roll a separate die, read flavor). Requires: d6. Complexity: 1
2C. Performance Bonus — Workout completion affects game state directly (completed all sets = tick a bonus box; PR = circle a codeword). Requires: none. Complexity: 1

## 3. TRACKING MECHANICS (Pick 1-4)

3A. Fill Clocks — N boxes, fill on tick, trigger at threshold. Complexity: 1. Wires: threshold-gate, unlock-chain, resource-cycle
3B. Drain Clocks — Start full, remove on tick, trigger when empty. Feels like a fuse. Complexity: 1. Wires: escalation (reduce starting value), feedback-loop (restoration)
3C. Tug-of-War Track — Single track, pointer at center, outcomes push left/right. Endpoints trigger events. Complexity: 2. Wires: conditional-routing (which side determines story path), feedback-loop
3D. Progress Tracks (Ironsworn) — Fill 0-10 boxes, then roll against track value. Success uncertain even at full. Complexity: 2. Wires: threshold-gate, unlock-chain
3E. Heat / Threat Level — Counter 0-10, rises on events, thresholds trigger escalating consequences, never resets. Complexity: 1. Wires: threshold-gate (only rises, perfect escalation source), escalation
3F. Skill Tree / Unlock Path — Branching tree, unlock nodes by spending resources. Footprint: Large. Complexity: 3. Wires: unlock-chain (node completion activates new mechanics)
3G. Faction Reputation — Multiple faction tracks (2-4). Actions raise one, may lower another. Footprint: Large. Complexity: 3. Wires: conditional-routing (standing determines content access), resource-cycle

## 4. RESOURCE SYSTEMS (Pick 0-2)

Resources are tracked by filling or crossing off boxes. No running totals, no negative numbers, no bookkeeping.

4A. Evidence Points — Earn from workout (fill 1 box per set completed), spend by crossing off N boxes to unlock content. Weekly reset (clear all). Complexity: 1. Wires: resource-cycle, threshold-gate
4B. Supply / Inventory — Fixed pool of boxes. Cross off to use. Replenish by filling back in. Different supplies for different actions. Complexity: 2. Wires: resource-cycle, escalation (depletion pressure)
4C. Stress / Strain — Boxes that fill up and never clear. When you reach the marked threshold: read the consequence. Complexity: 1. Wires: escalation, threshold-gate
4D. Dual Economy — Two competing tracks side by side. Filling one forces you to cross off the other. Visual tension. Complexity: 2. Wires: feedback-loop (inherent), resource-cycle

## 5. SPATIAL MECHANICS (Pick 0-1)

5A. Facility Grid Map — Pre-printed grid with rooms. Player marks position. Rooms reveal/lock over weeks. Footprint: Full Page. Complexity: 3. Wires: threshold-gate (locked rooms unlocked by tracker state)
5B. Point-to-Point Map — Named locations connected by paths. Move along paths by dice/choices. Footprint: Full Page. Complexity: 3. Wires: threshold-gate (gated nodes), conditional-routing (path choice)
5C. Track/Race — Linear track start to finish. Advance by session performance. Complexity: 2. Wires: threshold-gate (position-based triggers)
5D. No Map — No spatial element. All narrative is text-based. Complexity: 0. Wires: none

## 6. NARRATIVE STRUCTURES (Pick 1-2)

6A. Clock-Triggered Archives — Clocks fill > trigger > read next archive node in sequence. Complexity: 1. Wires: threshold-gate (clock→archive, the classic wire)
6B. Evidence/Theory System — Multiple parallel evidence tracks. Player chooses which to investigate. Complexity: 2. Wires: conditional-routing (which track shapes story)
6C. Branching Path — Binary/trinary choices at key moments. Cannot be undone. Complexity: 1. Wires: conditional-routing (codewords gate branches)
6D. Modular Reveal — Archive sections unlock in any order based on player actions. Complexity: 2. Wires: threshold-gate, unlock-chain
6E. Escalating Encounters — Difficulty increases across program. Maps to workout intensity arc. Complexity: 1. Wires: escalation
6F. Relationship Web — NPCs with changing dispositions. Actions affect relationships. Complexity: 3. Wires: feedback-loop, conditional-routing

## 7. SESSION-LEVEL MECHANICS (Pick 1-2)

7A. Roll-Per-Session — One dice roll after completing all exercises. Result determines narrative branch. Complexity: 1
7B. Roll-Per-Set — Roll after each set. Multiple rolls create richer per-session arc. Complexity: 2
7C. Accumulate-Then-Resolve — Track workout performance across session, then make single game decision. Complexity: 1
7D. Choose-Your-Action — After workout, choose from 2-3 available actions (investigate, fortify, rest). Complexity: 2
7E. Push-or-Accept — After initial roll, push for better result at a cost. The between-sets decision. Complexity: 2

## 8. END CONDITIONS (Pick 2-4, Complexity: 1 each)

Multiple endings triggered by different game states (clocks filled, resources depleted, choices made, thresholds crossed).

## COMPLEXITY BUDGET

Combined complexity of all selected primitives MUST NOT EXCEED 10.
Goldilocks zone: 6-9.

Example combinations:

- Survival Horror (8/10): 1D(2) + 2A(2) + 3B(1) + 4C(1) + 6E(1) + 7E(2) + 8(1)
- Political Intrigue (9/10): 1B(1) + 3G(3) + 3C(2) + 6F(3) + 7D(2) + 8(1)
- Noir Investigation (6/10): 1A(1) + 3E(1) + 4A(1) + 6D(2) + 7A(1) + 8(1)
- Exploration (10/10): 1C(1) + 3F(3) + 4B(2) + 5B(3) + 6D(2) + 7A(1) + 8(1)
