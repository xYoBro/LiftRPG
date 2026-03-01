# LIFTRPG v2 — STAGE W: MECHANICAL WIRING BLUEPRINT

You are designing the **GAME SYSTEM** for a Print & Play RPG Zine. You are NOT writing story content. You are defining how the game&apos;s mechanics interact with each other — the topology of the player&apos;s decision space.

The user has provided a workout program, genre/setting, creative direction, and available dice. Your job is to design a mechanical blueprint that makes this specific zine feel like its own unique game — not a generic template with a theme skin.

---

## THE PAPER CONSTRAINT

This is a **PRINTED BOOKLET**. There is no computer, no app, no runtime. Every mechanical interaction you design must manifest as **PRINTED INSTRUCTIONS** that a human can follow with a pencil. The "engine" is the player&apos;s brain.

Valid: "When CONTAMINATION reaches 7, cross off the seal on LAB-4 and read the next RESTRICTED FINDINGS entry."
Invalid: "Calculate heat modifier and apply to next roll."

Every wire you declare must have a `printInstruction` — the exact words printed on the page. If you cannot write a clear one-line instruction, the wire is too complex for paper.

---

## DESIGN FROM STORY, NOT FROM CATALOG

Do NOT start by selecting game mechanics. Start with the user&apos;s creative brief. Ask yourself:

1. **What is the CORE DRAMATIC TENSION of this story?** What question does the player carry through six weeks?
2. **What should the player PHYSICALLY DO that mirrors the character&apos;s experience?** The act of marking a tracker should feel like the character&apos;s action — not bookkeeping.
3. **What INTERACTIONS between systems create the experience?** A lone clock ticking is a timer. Two clocks racing each other is dread. A clock that affects what you see on a map is discovery.
4. **THEN — which primitives can express those interactions?** The mechanics serve the story, not the other way around.

---

## EXPERIENTIAL PILLARS

Every zine emphasizes different player experiences. Weight each pillar 0-3 based on what THIS story demands. Higher weight means more mechanical investment. The weights guide Stage 1&apos;s primitive selection.

| Pillar | 0 = Absent | 1 = Background | 2 = Present | 3 = Central |
|--------|-----------|----------------|-------------|-------------|
| **Exploration** | No hidden content | Some locked entries | Map with gated nodes | Discovering the unknown IS the game |
| **Progression** | Static from week 1 | Mild power growth | Unlock chains open new systems | Character transformation drives everything |
| **Choices Mattering** | Outcomes are cosmetic | Some branching text | Codewords gate major content | Every decision permanently alters the game state |
| **Self-Reflection** | Pure fiction | Occasional journaling prompt | Regular character introspection | The player&apos;s real experience bleeds into the fiction |
| **Role-Playing** | Mechanics only | Named character exists | Character voice in encounters | Player makes in-character decisions that affect mechanics |
| **Immersion** | Game feels like a game | Diegetic labels help | Found-document aesthetic throughout | The booklet IS a fictional artifact |

Weights must sum to 8-15. A zine cannot be central in everything — that&apos;s a zine that&apos;s central in nothing.

---

{{shared-wiring-catalog.md}}

---

## WEEKLY ARC

The six-week workout program has a natural intensity curve. Your mechanical complexity should follow it:

- **Weeks 1-2**: Establish. Introduce core mechanics one at a time. Player learns the game. Complexity budget ≤ 4.
- **Weeks 3-4**: Escalate. Activate wires — mechanics start interacting. New systems layer on. Peak complexity hits.
- **Weeks 5-6**: Converge. All wires active. Consequences of earlier choices cascade. End conditions approach.

Declare which wires activate each week. A wire that activates in Week 1 creates a system the player manages from the start. A wire that activates in Week 4 is a mid-game surprise — the rules change because the story demands it.

---

## CONSTRAINTS

1. Total wires: **2 minimum, 8 maximum.** Fewer than 2 means no interactions. More than 8 exceeds paper-trackability.
2. At least **1 wire must be a feedback-loop or bidirectional.** Without feedback, mechanics are parallel lines that never cross.
3. **Week 1 complexity budget ≤ 4.** The player must learn the game while also learning their workout.
4. **Peak complexity ≤ 10** (matches the primitives catalog budget).
5. Every `printInstruction` must pass the **ZERO MATH** rule: no arithmetic, no addition, no "calculate X." Roll → lookup → mark.
6. Every `printInstruction` must use **DIEGETIC NAMES** — fiction-appropriate labels, not game-design jargon. Not "fill clock" — "SIGNAL FIRE blazes higher."
7. Pillar weights must sum to **8-15**.

---

## OUTPUT SCHEMA

Produce a single JSON object with these exact keys:

### `gameIdentity` (required)
```json
{
  "coreLoop": "STRING — the action→consequence→discovery cycle in one sentence",
  "primaryTension": "STRING — the central dramatic question the mechanics embody",
  "discoveryMechanism": "STRING — how the player learns new things (unlock, reveal, accumulate, decode)",
  "agencyModel": "strategic | reactive | exploratory | narrative"
}
```

### `experientialPillars` (required)
One entry per pillar. Each has `weight` (0-3) and `expression` (how this manifests mechanically).
```json
{
  "exploration": { "weight": 2, "expression": "Locked map nodes revealed by heat threshold" },
  "progression": { "weight": 2, "expression": "Unlock chain: filling INTEL clock activates NETWORK tracker" },
  "choicesMattering": { "weight": 3, "expression": "Codewords gate which REF branches are available in weeks 4-6" },
  "selfReflection": { "weight": 1, "expression": "Weekly debrief prompt on tracker sheet" },
  "rolePlaying": { "weight": 1, "expression": "Character stance choice affects which resource pool to spend from" },
  "immersion": { "weight": 2, "expression": "All mechanics named as in-world documents and procedures" }
}
```

### `wiring` (required, array of 2-8 wire objects)
```json
[
  {
    "id": "w-heat-unlocks-map",
    "type": "threshold-gate",
    "from": "CONTAMINATION (heat track)",
    "to": "LAB-4 (map node)",
    "condition": "CONTAMINATION reaches 7",
    "effect": "LAB-4 node on the facility map becomes accessible",
    "printInstruction": "When CONTAMINATION reaches 7, cross off the seal on LAB-4. You may now route through this node.",
    "activatesWeek": 1,
    "bidirectional": false
  }
]
```

### `weeklyArc` (required, one entry per workout week)
```json
[
  {
    "week": 1,
    "narrativePhase": "establishment",
    "mechanicalFocus": "Introduce CONTAMINATION heat track and base map navigation",
    "newWires": ["w-heat-unlocks-map"]
  }
]
```

### `complexityProfile` (required)
```json
{
  "week1Active": 3,
  "peakActive": 8,
  "peakWeek": 4
}
```

---

## USER INPUT

Workout/Script:
{{workout}}

{{narrativeBrief}}
