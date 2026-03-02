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

Weights must sum to 8-15. **At least 2 pillars MUST have weight 0.** A zine that tries to do everything is a zine that does nothing. Zeroing pillars is a design choice, not a failure — it focuses the experience.

---

{{shared-wiring-catalog.md}}

---

## WEEKLY ARC

The workout program has a natural intensity curve. Your mechanical complexity should follow a deliberate arc — but NOT always the same arc.

**Available arc shapes** (choose one that serves your story):

- **Three-Act** (establish → escalate → converge): Classic. Early weeks teach, middle weeks layer, final weeks resolve. Phase boundaries at weeks 2/4.
- **Front-Loaded** (complex → simplify → resolve): All mechanics active from week 1. Later weeks remove options as consequences narrow the game. Good for survival stories.
- **Slow-Burn** (minimal → minimal → ignite → cascade): Weeks 1-3 have very few mechanics. Week 4 triggers a cascade of new systems. Good for mystery/investigation.
- **Crescendo** (steady build → peak at final week): Each week adds exactly one new mechanic. No plateau. Good for transformation/growth stories.
- **Oscillating** (tension → release → tension → release): Alternate high-complexity weeks with low-complexity recovery weeks. Mirrors undulating workout periodization.

Declare your chosen arc shape, your phase boundaries (which weeks belong to which phase), and which wires activate each week. You are NOT required to use 3 phases or to split at weeks 2/4.

---

## CONSTRAINTS

1. Total wires: **2 minimum, 8 maximum.** Fewer than 2 means no interactions. More than 8 exceeds paper-trackability.
2. **At least 2 wires must create cross-subsystem effects.** Wire A connects a tracker to another tracker (e.g., clock threshold → track shift). Wire B connects a tracker to map, archive, or encounter state. Single-system wires (clock fills → read archive of that clock) do not count toward this minimum. The player should feel that marking one tracker changes the pressure on another.
3. **Week 1 complexity budget ≤ 4.** The player must learn the game while also learning their workout.
4. **Peak complexity ≤ 10** (matches the primitives catalog budget).
5. Every `printInstruction` must pass the **ZERO MATH** rule: no arithmetic, no addition, no "calculate X." Roll → lookup → mark. This also applies to wire `effect` fields — never write "add +N to rolls" or "subtract from track." If a wire needs to change how dice resolve, use a binary state swap: "treat all X results as Y instead."
6. Every `printInstruction` must use **DIEGETIC NAMES** — fiction-appropriate labels, not game-design jargon. Not "fill clock" — "SIGNAL FIRE blazes higher."
7. Pillar weights must sum to **8-15**, with **at least 2 pillars at weight 0**.
8. **Mechanical breadth constraint:** `categoriesExcluded` must contain at least 1 category. Every zine has blind spots — declare yours.
9. **Resource economy:** If "Choices Mattering" or "Progression" is weighted ≥2, you MUST include at least one resource system (Category 4 in the primitives catalog). Resources create the only print-compatible decision loop: earn by lifting → choose when/how to spend. Without resources, the player is a passenger.
10. **Player agency floor:** At least one non-zero pillar must involve player decisions. A zine where the player never makes a choice — only lifts, rolls, and reads — is a zine where the player is a passenger, not a protagonist. If "Choices Mattering" is 0, ensure "Role-Playing" or "Exploration" provides some decision point.

---

## SELF-EVALUATION (MANDATORY)

Before outputting, verify your blueprint against these quality checks:

- **Structural Diversity:** Does your fingerprint differ from the default template (`6-10-three-act-2-threshold-gate`) on at least 2 of 5 dimensions? If not, redesign.
- **Mechanical expression:** Does the `primaryTension` in `gameIdentity` name a tension the MECHANICS embody — not just a story theme? "Will the contamination spread?" is mechanical. "A scary adventure" is not.
- **Cross-subsystem wires:** Do at least 2 wires connect DIFFERENT subsystems (tracker→tracker, tracker→map, tracker→archive)? Single-system wires (clock→its own archive) don&apos;t count.
- **Workout as engine:** Can you trace every wire back to the workout as its energy source? If a system activates without the player lifting, it&apos;s decoration.
- **Arc-intensity alignment:** Do high-complexity weeks in your `weeklyArc` correspond to the workout program&apos;s peak intensity weeks? Heavy training = mechanical crisis.
- **Decision points:** Does at least one wire create a moment where the player CHOOSES (spend a resource, pick a path, sacrifice one tracker for another)? Passive observation is not gameplay.
- **Pillar zeroes are meaningful:** Do your weight-0 pillars represent genuine exclusions that shape the zine&apos;s identity, or did you just zero the least familiar ones?

---

## THE MASTER CLOCK

The workout program is the clock that drives all systems. Every wire you design must trace back to the workout as its ultimate energy source:

1. **Player lifts** → energy flows into the game
2. **Dice roll** → energy distributes across trackers
3. **Trackers cross thresholds** → wires fire, cascading effects through map/archive/encounter state
4. **World changes** → player sees consequences at the next session

If a system doesn&apos;t connect back to the workout, it&apos;s decoration. The workout IS the engine — everything else is downstream.

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
One entry per pillar. Each has `weight` (0-3) and `expression` (how this manifests mechanically). At least 2 pillars must be weight 0 — set `expression` to `"N/A"` for zeroed pillars.

**Example A — Espionage thriller (pillars sum = 11, 2 zeroed):**
```json
{
  "exploration": { "weight": 2, "expression": "Locked map nodes revealed by heat threshold" },
  "progression": { "weight": 2, "expression": "Unlock chain: filling INTEL clock activates NETWORK tracker" },
  "choicesMattering": { "weight": 3, "expression": "Codewords gate which REF branches are available in weeks 4-6" },
  "selfReflection": { "weight": 0, "expression": "N/A" },
  "rolePlaying": { "weight": 0, "expression": "N/A" },
  "immersion": { "weight": 2, "expression": "All mechanics named as in-world documents and procedures" }
}
```

**Example B — Literary noir (pillars sum = 8, 3 zeroed):**
```json
{
  "exploration": { "weight": 0, "expression": "N/A" },
  "progression": { "weight": 0, "expression": "N/A" },
  "choicesMattering": { "weight": 3, "expression": "Codewords gate which ending is reachable" },
  "selfReflection": { "weight": 2, "expression": "Weekly debrief asks what the detective believes happened" },
  "rolePlaying": { "weight": 0, "expression": "N/A" },
  "immersion": { "weight": 3, "expression": "The entire booklet is a case file" }
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

### `mechanicalProfile` (required)

Declares which primitive categories this zine uses and which it excludes. This is the gatekeeper — Stage 1 can ONLY select primitives from `categoriesUsed`.

```json
{
  "categoriesUsed": ["resolution", "tracking", "narrative", "session", "endCondition"],
  "categoriesExcluded": [
    { "category": "spatial", "reason": "The story takes place entirely through documents — physical space is irrelevant" },
    { "category": "modifier", "reason": "Pure lookup resolution matches the clinical tone — no push/reroll decisions" },
    { "category": "resource", "reason": "The tension comes from tracking, not from spending" }
  ],
  "arcShape": "slow-burn",
  "phaseBoundaries": { "1": [1, 2, 3], "2": [4, 5], "3": [6] }
}
```

**Field definitions:**

- `categoriesUsed`: Array of category names from the Primitives Catalog. Valid names: `"resolution"`, `"modifier"`, `"tracking"`, `"resource"`, `"spatial"`, `"narrative"`, `"session"`, `"endCondition"`.
- `categoriesExcluded`: Array of `{ "category": STRING, "reason": STRING }`. Every category NOT in `categoriesUsed` MUST appear here with a story-motivated justification. Forcing justification makes the decision stick.
- `arcShape`: One of `"three-act"`, `"front-loaded"`, `"slow-burn"`, `"crescendo"`, `"oscillating"`.
- `phaseBoundaries`: Object mapping phase number (string) to array of week numbers. Allows non-standard phase boundaries.

---

## USER INPUT

Workout/Script:
{{workout}}

{{narrativeBrief}}
