# LIFTRPG v2 — STAGE 4: STORY REF NODES

You are writing the session narrative for a Print & Play RPG Zine. Each "REF node" is a short story fragment that a player reads during a real gym workout. They roll a die between sets, get an outcome, and read the matching fragment. That is the entire interaction — 5 to 15 seconds of reading, then back to lifting.

These fragments ARE the story. They accumulate across 18+ sessions into a complete narrative arc. Each one must work as a standalone moment AND advance long-running threads.

---

## DYNAMIC MACRO ARC

- **Phase 1 (~25%): Status Quo** — Establish the mundane reality. Seed 2-3 mystery threads.
- **Phase 2 (~50%): Escalation** — Threads multiply. Rules resist. Background becomes foreground.
- **Phase 3 (~15%): Crisis** — Breaking point. Assumptions fail. Maximum stakes.
- **Phase 4 (~10%): Convergence** — Climax. Mechanics and narrative permanently converge.

---

## WHAT YOU ARE PRODUCING

For each session REF, produce exactly **1 router node + N branch nodes** (N = number of dice outcomes from Stage 1).

### Router node
Read BEFORE rolling. Sets the scene. 1-3 sentences.

Format: `{ "type": "NARRATIVE_TYPE", "html": "<strong>WEEK W / SESSION D.</strong> Content..." }`

Router `type` values — choose the type matching dramatic function:
- `"kinetic"` — action, urgency, physical motion
- `"philosophical"` — reflection, observation, the world&apos;s rules
- `"echo"` or `"artifact"` — found evidence, a document, a recording
- `"steinbeck"` or `"dirt"` — raw physical detail, minimal framing
- `"apex"` — climactic reveal (use 1-2 per zine MAX)

### Branch nodes
Read AFTER rolling. Each branch = a different version of what happens. Not severity variations — genuinely different paths.

Format: `{ "type": "OUTCOME_NAME_LOWERCASE", "html": "<strong>OUTCOME_NAME.</strong> Content..." }`

### Rules for all nodes:
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
7. No BANNED WORDS.
8. Node type distribution: no type >40% of routers, at least 3 types used, apex at most 1-2 total.

---

## COMPLETENESS CHECK (MANDATORY)

Before outputting your JSON, verify you have produced every required node:

- **Total nodes needed** = (number of encounters) × (1 router + N outcome branches)
- For a typical 6-week, 3-session program with 3 outcomes: 18 × 4 = **72 nodes**
- **Every encounter MUST have its router AND all branch nodes.** Missing even one means the player rolls dice and gets nothing — the game breaks. The engine validates this and will reject incomplete output.
- Count your output keys and compare against the expected total. If they don&apos;t match, find and fill the gaps before outputting.

---

## OUTPUT

Return ONLY a valid JSON object where each key is a REF ID and each value is `{ "type": "...", "html": "..." }`. No wrapping object, no commentary, no markdown fences.

---

## PASTE YOUR STAGE 1 + STAGE 3 CONTEXT BELOW THIS LINE
