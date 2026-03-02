# LIFTRPG v2 — STAGE 1: FOUNDATION

You are generating a Print & Play RPG Zine — a physical booklet that combines a real workout program with a branching narrative game. The user will print it, grab a pencil and dice, and play through it during their actual gym sessions.

Your output will be a single JSON object with these top-level keys: `meta`, `workout`, `mechanics`, `theme`, `story` (encounters only), `map` (optional), `pages`, and `archiveLayout`. A rendering engine turns this JSON into printable half-letter spreads (5.5″ × 8.5″ pages). A validator checks every cross-reference. **Precision matters.**

The engine uses an **encounter-based page model**: each workout session is an "encounter" with its own narrative and outcomes. The engine picks page layouts automatically — you never specify layout or CSS. You provide content; the engine provides form.

---

## SCHEMA SPECIFICATION

Produce a single JSON object with these exact top-level keys:

### `meta`

```json
{
  "title": "STRING — the zine title, all caps, 2-4 words",
  "subtitle": "STRING — tagline or program descriptor",
  "inspiration": "STRING — 1-sentence thematic summary for internal reference",
  "author": "Iron & Aether Engine v2"
}
```

### `workout`

```json
{
  "totalWeeks": NUMBER,
  "weekIntensities": [NUMBER, ...],
  "intensityUnit": "STRING — e.g. '% 1RM' or 'RPE'",
  "sessionTypes": [
    {
      "id": "STRING — e.g. 'lift-a'",
      "name": "STRING — e.g. 'SESSION A'",
      "category": "lifting" | "conditioning",
      "days": [NUMBER, ...],
      "exercises": [
        { "name": "STRING", "sets": NUMBER, "reps": NUMBER | "STRING" }
      ],
      "protocol": "STRING (optional — e.g. 'AMRAP' or 'EMOM')",
      "rounds": "NUMBER (optional — for conditioning)"
    }
  ],
  "setup": {
    "title": "STRING — diegetic title for the setup page",
    "instructions": "STRING — how to calculate starting weights",
    "fields": [
      { "label": "STRING — e.g. 'Squat 1RM'", "calcPercents": [NUMBER, ...] }
    ],
    "noteLines": NUMBER
  },
  "weightColumnLabel": "STRING (optional — override 'WEIGHT' column header)",
  "weekEndCheckin": ["STRING", ...] | { "1": ["STRING", ...], "2": ["STRING", ...] },
  "progressionNote": "STRING — how to progress between sessions"
}
```

**Field notes:**

- `exercises[].reps` — simple rep count: NUMBER (5) or short STRING ("3-5", "AMRAP"). Do NOT include weekly variations or percentages — that belongs in `weekIntensities[]`.
- `exercises[].sets` — working sets per session, not total across weeks.
- `weekIntensities[]` — one entry per week; the renderer displays this separately above the table.
- `weekEndCheckin` — default to a flat array ["Q1", "Q2"] for all weeks. Use the object format `{ "1": [...], "2": [...] }` if questions should escalate thematically week-by-week.

**Example workout object:**

```json
{
  "totalWeeks": 6,
  "weekIntensities": [70, 75, 80, 85, 90, 95],
  "intensityUnit": "%",
  "sessionTypes": [
    {
      "id": "lift-a",
      "name": "HEAVY LOWER",
      "category": "lifting",
      "days": [1],
      "exercises": [
        { "name": "Squat", "sets": 3, "reps": 5 },
        { "name": "Romanian Deadlift", "sets": 3, "reps": 8 }
      ]
    }
  ]
}
```

**Important**: Translate the user&apos;s workout program faithfully. Every day in `sessionTypes[].days` must be a unique number. Days are numbered 1 through N where N is sessions per week.

**OPTIONAL ARRAYS:** The `modifiers`, `tracks`, `codewords`, and `resources` arrays are all optional. If your `mechanicalProfile` excludes their categories, OMIT these arrays entirely from your JSON. Do not include empty arrays `[]` — omit the key.

### `mechanics`

```json
{
  "dice": {
    "type": "STRING — from the primitives catalog (d100, d6, 2d6, d10, d12, d20, coin, d6-under, none)",
    "timing": "STRING — when to roll",
    "note": "STRING (optional — flavor text about the dice)",
    "outcomes": [
      {
        "range": [NUMBER, NUMBER],
        "name": "STRING — diegetic outcome name (NOT 'success'/'failure')",
        "suffix": "STRING — appended to REF code (e.g. '-T', '-S')",
        "ticks": "STRING — name of clock/track to tick"
      }
    ],
    "stat": {
      "name": "STRING",
      "startValue": NUMBER,
      "degradeTrigger": "STRING",
      "recoverTrigger": "STRING"
    }
  },
  "modifiers": [
    {
      "type": "STRING — push, performance, oracle, stress, advantage",
      "trigger": "STRING — when this modifier activates",
      "effect": "STRING — what it does",
      "cost": "STRING — what it costs"
    }
  ],
  "clocks": [
    {
      "name": "STRING — diegetic name",
      "size": NUMBER,
      "direction": "fill" | "drain",
      "triggerAt": NUMBER,
      "onTrigger": {
        "action": "read-archive",
        "section": "STRING — archive section key",
        "order": "sequential-loop | sequential-stop | by-week-player-choice"
      },
      "clearOnTrigger": NUMBER,
      "flavor": "STRING — what this clock represents in the fiction"
    }
  ],
  "tracks": [
    {
      "id": "STRING — short identifier (e.g. 'FACTION-A', 'SUSPICION')",
      "type": "heat" | "tug" | "progress" | "faction",
      "name": "STRING — diegetic name",
      "size": NUMBER,
      "startValue": NUMBER,
      "thresholds": [
        { "value": NUMBER, "effect": "STRING" }
      ],
      "standings": [
        { "value": NUMBER, "label": "STRING" }
      ],
      "flavor": "STRING"
    }
  ],
  "resources": [
    {
      "name": "STRING — diegetic name",
      "earnRule": "STRING",
      "spendCost": NUMBER | "STRING",
      "spendEffect": "STRING",
      "reset": "STRING — 'weekly' | 'never' | 'on-spend'",
      "linkedResource": "STRING (optional — for dual economy)",
      "note": "STRING (optional)"
    }
  ],
  "codewords": [
    {
      "id": "STRING — all-caps single word",
      "trigger": "STRING — when to circle this codeword",
      "effect": "STRING — what changes when circled"
    }
  ],
  "endConditions": [
    {
      "id": "STRING — e.g. 'E-DESCENT'",
      "condition": "STRING — exact trigger condition"
    }
  ],
  "exampleTurn": {
    "context": "STRING",
    "roll": "STRING",
    "result": "STRING",
    "then": "STRING",
    "note": "STRING (optional)"
  },
  "archiveRouting": ["STRING", ...],
  "replayability": ["STRING", ...]
}
```

**Field notes:**

- `dice.outcomes[]`: Required for all dice types except "none". Each outcome is a pure lookup: the player finds their roll in the range and reads the result. NO arithmetic modifiers.
- `dice.stat`: Only for degrading threshold (1D) type — represents a threshold strip the player crosses off, not a number to subtract. Set to `null` or omit for all other dice types. If `stat.name` would be "none" or unused, OMIT the entire stat object.
- `clocks[].direction`: "fill" starts empty and fills up. "drain" starts full and empties.
- `clocks[].clearOnTrigger`: How many boxes to clear/restore when triggered.
- `tracks[].standings[]`: Only for faction tracks.
- `resources[].linkedResource`: Only for dual economy pairs. Both must reference each other.
- `modifiers`, `tracks`, `codewords`, `resources`: All optional arrays. Omit if not using.
- `exampleTurn`, `archiveRouting`, `replayability`: These fields inform Stage 2 rules-manual voice generation. They do not appear directly in the rendered booklet — they are inter-stage communication fields.
- Clock sizes should be between 4 and 12.
- **Outcome count**: You may have 2, 3, 4, 5, or more outcomes. Do NOT default to 3. Match outcome count to your dice type and theme complexity.
- **ZERO MATH**: No outcome, modifier, or resource rule may require the player to add, subtract, or compute anything. Roll → lookup → act. That is the entire loop.

**Critical cross-references:**

- Every `outcomes[].ticks` value MUST reference a valid clock or track name.
- `endConditions[].id` values are used as ending IDs in Stage 3.
- If using dual economy, both `linkedResource` fields must reference each other by name.
- `clocks[].onTrigger.section` values define archive section keys — they MUST match the keys in `archiveLayout`.

### `theme`

```json
{
  "visualArchetype": "STRING — one of: institutional, literary, corporate, terminal, noir, confessional, brutalist, clinical. CRITICAL: this drives the booklet's visual texture — not just naming, but how pages LOOK when printed. Choose based on the creative brief's emotional core and the diegetic medium (see Visual Identity in shared-creative-direction.md).",
  "colors": {
    "ink": "#HEX",
    "paper": "#HEX",
    "fog": "#HEX — slightly darker than paper, for alternating sections",
    "accent": "#HEX — primary highlight color",
    "muted": "#HEX — secondary/quiet color"
  },
  "fonts": {
    "body": "STRING — CSS font-family (use Google Fonts, include fallback)",
    "heading": "STRING — CSS font-family"
  },
  "layout": {
    "stampStyle": "heavy | double | redacted | distressed",
    "pageTexture": "vignette | clean | grain",
    "pageDecorated": "BOOLEAN",
    "pageGrain": "BOOLEAN",
    "defaultDensity": "dense | normal | breathing",
    "archiveSeparator": "dots | line | rule | none",
    "textTransformHeadings": "uppercase | capitalize | none",
    "textTransformLabels": "uppercase | capitalize | none",
    "logNameWidth": "CSS_WIDTH (default 35%) — exercise name column proportion",
    "logSetsWidth": "CSS_WIDTH (default 50%) — sets column proportion",
    "logBoxWidth": "CSS_LENGTH (default 1.8rem) — individual set checkbox width",
    "logBoxHeight": "CSS_LENGTH (default 1.1rem) — individual set checkbox height",
    "logBorder": "CSS_BORDER (default 1.5px solid) — outer table border style. Options: 1px solid, 2px double, 1px dashed, none"
  },
  "art": {
    "style": "geometric | organic | technical | minimal | brutalist | interference | topographic | none — drives SVG generation style. Match to subject: geometric for maps/clocks/architecture, organic for nature/growth/decay, technical for sci-fi/engineering/systems, interference for glitch/signal/corruption, topographic for terrain/exploration. This is the visual LANGUAGE of inline illustrations, not a decoration toggle.",
    "coverSvg": "STRING (optional) — inline SVG for cover art using currentColor. Abstract, atmospheric, diegetic. NOT literal scene illustration. Must be visually compelling at 5.5in × 8.5in. A simple geometric shape is not enough — layer elements that communicate the genre AND the emotional core of this zine. Think: a distorted floor plan with impossible angles, a scale with uneven arms, circuit traces that form a face, topographic lines that spiral inward. The cover is the player&apos;s first impression — make it feel like picking up an artifact.",
    "coverImage": "STRING (optional) — base64 data URI for cover illustration. Only if user provides an image or uses an image generation tool. When present, takes priority over coverSvg. When absent, coverSvg is used.",
    "dividerSvg": "STRING (optional) — inline SVG for section dividers using currentColor. Keep under 200 chars. Simple geometric or organic line that matches art.style."
  },
  "customCss": "STRING — 5-10 CSS rule sets. Target: .classification, .session-title-row, .fragment, .cover-title, .hud-zone, .rulebox, .page-num, .hr, section-specific like [data-section='archive']"
}
```

**GREYSCALE SAFETY**: All visual design must work in B&W. Never rely on hue alone. Test contrast between ink and paper.

### `story` (encounters only — REF node text comes in Stage 4)

```json
{
  "encounters": [
    {
      "id": "STRING — e.g. 'E01', sequential",
      "title": "STRING — diegetic encounter name, all caps. FROM the fiction.",
      "week": NUMBER,
      "day": NUMBER,
      "narrative": "STRING (HTML) — 2-4 sentences. Scene-setting read BEFORE rolling.",
      "challenge": "STRING — 1 sentence connecting workout moment to narrative (parallel, not metaphor)",
      "outcomes": [
        {
          "range": [NUMBER, NUMBER],
          "name": "STRING — must match mechanics.dice.outcomes name",
          "text": "STRING (HTML) — brief summary of this outcome for THIS encounter",
          "effect": "STRING — clock/track/resource changes",
          "goto": "STRING | null — next encounter ID"
        }
      ],
      "special": "null | 'boss' | 'rest' | 'branch'",
      "visualWeight": "STRING — 'standard' | 'sparse' | 'dense' | 'crisis'. Controls page density and typographic drama. See Encounter notes below.",
      "bossRules": {
        "title": "STRING (optional) — title for special boss rules block",
        "preamble": "STRING (optional) — flavor text describing mechanics constraint",
        "steps": ["STRING", ...],
        "stakes": "STRING (optional) — bottom summary of success/failure"
      },
      "options": [
        {
          "label": "STRING — diegetic choice label",
          "ref": "STRING — REF code for this choice path",
          "cost": "STRING — tracker/resource cost (optional)"
        }
      ],
      "conditionalInstructions": [
        {
          "condition": "STRING — tracker state trigger, for LLM reasoning only (not printed separately)",
          "instruction": "STRING — diegetic instruction for the player (this is the printed text)",
          "style": "STRING — 'default' | 'alert'"
        }
      ],
      "marginalia": "STRING | null — optional sidebar flavor text"
    }
  ],
  "refScheme": {
    "prefix": "STRING — e.g. 'R'",
    "weekDigits": NUMBER,
    "sessionDigits": NUMBER
  }
}
```

**Encounter notes:**

- One encounter per lifting session across all weeks. 6-week, 3-day program = 18 encounters.
- `title`: Diegetic encounter name from the fiction. NOT "Week 1 Day 1".
- `narrative`: Ground the reader in physical space. No exposition dumps. Sensory details. **Narrative threading:** encounter narratives should form a visible thread across each week. Session 1 introduces a detail. Session 2 references it changed. Session 3 reveals why. The player should feel the world moving between sessions.
- `outcomes[]`: Ranges MUST match `mechanics.dice.outcomes[]` ranges. Each outcome has genuinely different narrative — NOT just severity variations of the same event.
- `special`: **Minimum variety requirement** over a 6-week program:
  - At least **1 boss** encounter (peak intensity week)
  - At least **1 rest** encounter (deload or early week — larger narrative, lighter mechanical pressure)
  - At least **1 branch** encounter (player chooses between paths — include `options[]` array)
  - Remaining encounters are standard. A zine with 18 identical sessions is a failed design.
- `bossRules`: **REQUIRED** when `special` is `"boss"`. Every boss encounter MUST have a `bossRules` object with at least `title` and `steps[]` (non-empty). This renders a distinct bordered procedure box. Without it, the boss encounter renders as a normal session with no special protocol — a silent failure.
- `options[]`: **REQUIRED** when `special` is `"branch"`. Present 2-3 choices with distinct REF codes and costs. The renderer displays these as a choice box before the workout table.
- `conditionalInstructions[]`: Optional. Printed "IF tracker state, THEN action" blocks that create immediate feedback when tracker thresholds are crossed. Use diegetic language. The renderer styles these as distinct instruction panels.
- `visualWeight`: Assign based on the weekly arc:
  - Establishment phase: mostly `"standard"`, allow `"sparse"` for rest encounters
  - Escalation phase: mostly `"standard"`, include `"dense"` for key moments
  - Crisis/peak weeks: `"dense"` or `"crisis"` for climactic sessions
  - No more than 2 `"crisis"` encounters per zine. Boss encounters should be `"dense"` or `"crisis"`.

### `map` (optional — set to `null` if no spatial element)

```json
{
  "type": "facility-grid | point-to-point | linear-track",
  "title": "STRING — diegetic map title"
}
```

For Stage 1, include only `type` and `title`. Full map data (rooms, locations, weekly progression) is generated in Stage 2. Set to `null` if no spatial element fits the theme — do NOT force a map.

### MECHANICAL PROFILE COMPLIANCE

Your Stage W `mechanicalProfile` constrains your selections:

1. **Categories:** Only select primitives from `categoriesUsed`. If `tracking` is excluded, omit the `clocks` and `tracks` arrays entirely. If `resource` is excluded, omit the `resources` array. If `modifier` is excluded, omit the `modifiers` array.
2. **Complexity:** Your total complexity must not exceed `mechanicalProfile`&apos;s complexity ceiling (which matches `complexityProfile.peakActive`).
3. **Pages:** Your `pages[]` array MUST match `mechanicalProfile.pageVocabulary` — include only the page types declared there.
4. **Evidence guardrail:** If any track has an `id` field (faction or progress tracks), you MUST include `{ "type": "evidence" }` in your `pages[]` array.

### `pages`

The `pages` array defines the page structure of the printed zine. The engine knows how to render each page type — you control which types appear and in what order. **Your `pages[]` must match your Stage W `mechanicalProfile.pageVocabulary`.** Do not include page types you did not declare.

#### Standard (all page types, 9+ type vocabulary)
```json
[
  { "type": "cover" },
  { "type": "rules-manual" },
  { "type": "tracker-sheet" },
  { "type": "setup" },
  { "type": "encounter-spread", "week": 1 },
  { "type": "ref-pages", "week": 1 },
  { "type": "encounter-spread", "week": 2 },
  { "type": "ref-pages", "week": 2 },
  ...
  { "type": "archive", "section": "SECTION_KEY" },
  { "type": "evidence" },
  { "type": "endings" },
  { "type": "final" }
]
```

#### Minimalist (5-type vocabulary — no tracker-sheet, no setup, no evidence)
```json
[
  { "type": "cover" },
  { "type": "rules-manual" },
  { "type": "encounter-spread", "week": 1 },
  { "type": "ref-pages", "week": 1 },
  ...
  { "type": "archive", "section": "SECTION_KEY" },
  { "type": "endings" },
  { "type": "final" }
]
```

#### Discovery-paced (archives interleaved between encounter weeks)
```json
[
  { "type": "cover" },
  { "type": "rules-manual" },
  { "type": "tracker-sheet" },
  { "type": "setup" },
  { "type": "encounter-spread", "week": 1 },
  { "type": "ref-pages", "week": 1 },
  { "type": "archive", "section": "SECTION_KEY_A" },
  { "type": "encounter-spread", "week": 2 },
  { "type": "ref-pages", "week": 2 },
  { "type": "archive", "section": "SECTION_KEY_B" },
  ...
  { "type": "endings" },
  { "type": "final" }
]
```

Available page types:

- `cover`: Title page with classification stamp, intro text, cover art
- `rules-manual`: Instruction manual in the fiction&apos;s voice (from Stage 2)
- `tracker-sheet`: Printable character dossier with all clocks, tracks, resources, codewords
- `setup`: Workout setup page with 1RM fields, calculation grid
- `encounter-spread`: Weekly encounter pages — HUD (map + trackers + dice table) + workout logs + narrative
- `ref-pages`: Story REF branching nodes for that week (router + outcome branches, from Stage 4)
- `archive`: Archive section pages (from Stage 3). Requires `"section"` key matching an archive key.
- `endings`: All ending narratives with trigger conditions (from Stage 3)
- `final`: Closing page

Your `pages[]` structure is controlled by your `mechanicalProfile.pageVocabulary`. Design choices:

- **Omit `tracker-sheet`** only if total mechanic count (clocks + tracks + resources) is 4 or fewer. At 5+ mechanics, include `tracker-sheet` — the player needs a central reference page to see all game state at once, especially in a gym context
- **Omit `setup`** if the workout doesn&apos;t require weight calculations
- **Omit `ref-pages`** for a diceless zine where choices are embedded in encounters
- **Interleave `archive` entries** between encounter weeks for discovery-paced reveals
- **Add multiple `archive` entries** for separate document collections
- **Include `evidence`** if any track has a faction or progress type with an `id` field

### `archiveLayout`

Defines how archive pages are organized into two-page spreads:

```json
[
  { "left": ["SECTION_KEY"], "right": ["SECTION_KEY"] }
]
```

Each entry = one spread. Keys MUST match `clocks[].onTrigger.section` values.

---

**LUDONARRATIVE CONSONANCE**: Every element must make sense as a physical object found at that moment in the story.

---

## WIRING BLUEPRINT COMPLIANCE

If a **Mechanical Wiring Blueprint** is provided (in the BINDING section above), you MUST comply:

1. **Every wire&apos;s `from` field** must correspond to a clock, track, resource, or other mechanic you select. Name it to match.
2. **Every wire&apos;s `to` field** must correspond to a mechanic, map element, archive section, or content structure you create.
3. **Every wire&apos;s `printInstruction`** must appear verbatim somewhere in your output — in `clocks[].onTrigger` text, in encounter narratives, in resource descriptions, or as a threshold effect.
4. **Respect `activatesWeek`** — mechanics for later-activating wires exist in the schema from the start, but their printed interaction instructions only appear on pages for that week onward.
5. **Respect `complexityProfile`** — your total primitive count must not exceed `peakActive`, and Week 1 active mechanics must not exceed `week1Active`.
6. **Pillar weights guide selection** — pillars with weight 3 need dedicated mechanical expression. Weight 0 pillars need no mechanical support.

If no wiring blueprint is provided, design mechanics freely using the primitives catalog.

---

## CONSTRAINTS

1. All `html` fields use HTML, not markdown
2. Use `&apos;` not bare apostrophes in JSON strings
3. No BANNED WORDS (terrifying, chilling, sinister, evil, looming, epic, badass, sudden, suddenly, eerie, ominous, foreboding, mysterious)
4. Every `outcomes[].ticks` MUST reference a valid clock or track name
5. Encounter `outcomes[].range` must match ranges in `mechanics.dice.outcomes[]`
6. `endConditions[].id` values will be used as ending IDs in Stage 3
7. `clocks[].onTrigger.section` values define archive section keys
8. `theme.colors` must have all 5 keys, all valid 6-digit hex (e.g. #1a1a18)
9. `pages[]` must include at minimum: cover, at least one encounter-spread, endings, final
10. Encounter count must equal (unique training days per week) × totalWeeks. Days per week = count of unique day numbers across all sessionTypes[].days
11. You MUST ESCAPE ALL DOUBLE QUOTES inside strings (e.g. `\"`), or use single quotes for HTML/SVG attributes and CSS selectors. Unescaped double quotes will break JSON parsing.
12. **ZERO MATH**: No mechanic may require addition, subtraction, or any computation during play. Roll → lookup → mark. If a stat has no function, omit it entirely (do not set name to "none").
13. **INTUITIVE DESIGN**: Every tracker must be usable by someone who has never read the rules page. The physical layout (boxes, arrows, labels, thresholds) must communicate how to use it. If you need to explain a mechanic in prose, the mechanic is too complex — simplify it.

---

## OUTPUT

Return ONLY a valid JSON object. No commentary, no markdown fences. Just the raw JSON.
