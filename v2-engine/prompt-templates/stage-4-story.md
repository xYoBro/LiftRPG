# LIFTRPG v2 — STAGE 4: STORY REF NODES

You are writing the session narrative for a Print & Play RPG Zine. Each "REF node" is a short story fragment that a player reads during a real gym workout. They roll a die between sets, get an outcome, and read the matching fragment. That is the entire interaction — 5 to 15 seconds of reading, then back to lifting.

These fragments ARE the story. They accumulate across 18+ sessions into a complete narrative arc. Each one must work as a standalone moment AND advance long-running threads.

---

## DYNAMIC MACRO ARC

- **Phase 1 (~25%): Status Quo** — Establish the mundane reality. Seed 2-3 mystery threads.
- **Phase 2 (~50%): Escalation** — Threads multiply. Rules resist. Background becomes foreground.
- **Phase 3 (~15%): Crisis** — Breaking point. Assumptions fail. Maximum stakes.
- **Phase 4 (~10%): Convergence** — Climax. Mechanics and narrative permanently converge.

These percentages are defaults. The encounters&apos; week distribution and `narrativePhase` labels from the wiring blueprint take precedence — adapt pacing to match.

---

## WHAT YOU ARE PRODUCING

For each session REF, produce exactly **1 router node + N branch nodes** (N = number of dice outcomes from Stage 1).

### REF ID formula

Construct IDs from the encounter&apos;s `week`, `day`, and the `refScheme` from Stage 1:

- **Router ID:** `refScheme.prefix` + `week` (zero-padded to `weekDigits`) + `day` (zero-padded to `sessionDigits`)
- **Branch ID:** router ID + `outcome.suffix`

Example: prefix `R`, weekDigits 1, sessionDigits 1, week 2, day 1, outcomes with suffixes `-T`, `-S`, `-H`:

- Router key: `R21`
- Branch keys: `R21-T`, `R21-S`, `R21-H`

The engine validates every expected ID exists. **One wrong key = hard rejection of the entire stage.**

### Router node

Read BEFORE rolling. Sets the scene. 1-3 sentences.

Format: `{ "type": "NARRATIVE_TYPE", "html": "<strong>WEEK W / SESSION D.</strong> Content..." }`

Router `type` values (6 types) — choose the type matching dramatic function:

- `"kinetic"` — action, urgency, physical motion
- `"philosophical"` — reflection, observation, the world&apos;s rules
- `"echo"` — found evidence, a document, a recording
- `"artifact"` — physical object, relic, environmental detail as story
- `"steinbeck"` — raw physical detail, minimal framing, sensory-first prose (`"dirt"` is accepted as an alias)
- `"apex"` — climactic reveal (use 1-2 per zine MAX)

### Branch nodes

Read AFTER rolling. Each branch = a different version of what happens. Not severity variations — genuinely different paths.

Format: `{ "type": "OUTCOME_NAME_LOWERCASE", "html": "<strong>OUTCOME_NAME.</strong> Content..." }`

### Rules for all nodes

- 1-3 sentences each. Rarely 4. Never 5+.
- HTML only. Use `<strong>`, `<em>`, `<br>`.
- Use `&apos;` not bare apostrophes.
- Cross-reference archive nodes sparingly: 0-2 times per week.

### Zeigarnik hooks

At least 1 branch node per session should end with an unresolved image or detail that implies something the reader hasn&apos;t seen. The LAST session of each week should leave the strongest open thread.

### Codeword usage (if Stage 1 includes codewords)

- **Award** codewords in branch nodes (after rolling)
- **Check** codewords in router nodes (before rolling)
- 1-2 awards per week. 1 check per week max.
- Codewords unlock alternate content, never gate progression.

---

## CONSTRAINTS

1. Produce EXACTLY the REF IDs needed: for each encounter, the router ID and one branch per outcome suffix.
2. Every node must have `"type"` and `"html"` fields.
3. Router type must be a narrative type (NOT "router").
4. Branch types are the dice outcome names in lowercase.
5. HTML only — no markdown.
6. `&apos;` not bare apostrophes.
7. No BANNED WORDS (terrifying, chilling, sinister, evil, looming, epic, badass, sudden, suddenly, eerie, ominous, foreboding, mysterious).
8. Node type distribution: 6 router types available (kinetic, philosophical, echo, artifact, steinbeck, apex). No type >40% of routers, at least 3 types used, apex at most 1-2 total regardless of program length.

---

## COMPLETENESS CHECK (MANDATORY)

Before outputting your JSON, verify you have produced every required node:

- **Total nodes needed** = (count of encounters in your `story.encounters[]` input) × (1 router + N branches, where N = count of `mechanics.dice.outcomes[]`)
- **COMPUTE THIS FROM YOUR INPUT — do NOT use the example below as your target number.** Count every encounter object in the Stage 1 context you received. Example for reference only: a 6-week, 3-lifting + 2-conditioning day program = 30 encounters × 4 nodes = **120 nodes**.
- **Every encounter MUST have its router AND all branch nodes.** Missing even one means the player rolls dice and gets nothing — the game breaks. The engine validates this and will reject incomplete output.
- Count your output keys and compare against your computed total. If they don&apos;t match, find and fill the gaps before outputting.

---

## SELF-EVALUATION (MANDATORY)

Before outputting, verify your narrative against these quality checks:

- **Zeigarnik hooks:** Check the LAST branch node of each week&apos;s final session. Does it end with an unresolved image, an unanswered question, or an incomplete action? If the week ends with resolution, the player has no reason to return Monday.
- **Intensity-tension parallel:** Are your `crisis` and `dense` encounters concentrated in the weeks with the heaviest workout loads? Are `sparse` and rest encounters in lighter weeks? Narrative tension should mirror physical effort.
- **Type distribution:** Count your router node types. Is any single type above 40%? Are at least 3 different types represented? Is `apex` used at most 1-2 times total?
- **Diegetic mechanic references:** When branch nodes reference clocks, tracks, or resources, do they use the DIEGETIC names from Stage 1 — not game terms? "The signal fire dims" passes. "Mark 1 tick on Clock A" fails.
- **Branch divergence:** For each encounter, are the branch outcomes genuinely different paths — not just severity levels of the same event? "You succeed / you partially succeed / you fail" is three intensities, not three stories.
- **Show, don&apos;t tell:** Scan your html fields. Are there any banned words? Any sentences that tell the reader how to feel rather than describing what happens?

---

## OUTPUT

Return ONLY a valid JSON object where each key is a REF ID and each value is `{ "type": "...", "html": "..." }`. No wrapping object, no commentary, no markdown fences.

---

## STAGE 1 + STAGE 3 CONTEXT (required fields)

The following fields are needed to generate REF nodes:

**From Stage 1:**

- `meta` — title, setting context
- `mechanics` — clocks, tracks, dice outcomes, codewords, endConditions (for narrative reference)
- `story.encounters[]` — week, day, title, narrative, challenge, outcomes with suffixes (defines every REF ID you must produce)
- `story.refScheme` — prefix, weekDigits, sessionDigits (the REF ID formula inputs)

**From Stage 3:**

- Archive node IDs grouped by section key (for optional cross-references in narrative)

## PASTE YOUR STAGE 1 + STAGE 3 CONTEXT BELOW THIS LINE
