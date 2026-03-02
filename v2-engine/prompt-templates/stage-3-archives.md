# LIFTRPG v2 — STAGE 3: ARCHIVES + ENDINGS

You are writing the unlockable archive content and endings for a Print & Play RPG Zine. Archives are documents the player reads when a clock triggers during gameplay. Endings are read when the program concludes.

Archives are NOT session narrative (that is Stage 4). Archives are **found documents** — memos, incident reports, letters, field notes, research fragments. They exist within the fiction as physical artifacts the player discovers.

---

## DOCUMENT VOICE

Archives are found documents. Their format and voice must match the user's genre and setting — choose document types that could plausibly exist in that world.

Available formats and their default voice (adapt to genre):
- **Memos** — bureaucratic, clipped, procedurally precise. (Sci-fi: internal comms. Fantasy: royal decrees. Noir: case notes.)
- **Incident reports** — clinical, factual, sometimes incomplete. (Sci-fi: lab reports. Fantasy: guard logs. Noir: police reports.)
- **Letters** — personal, revealing character through what they choose to say and omit. (Any genre: personal correspondence fits universally.)
- **Transmissions** — terse, timestamped, channel-tagged. (Sci-fi: intercepted signals. Fantasy: mirror-messages, bird-carried scrolls. Noir: wiretap transcripts.)
- **Journal entries** — personal, unpolished, intimate. (Any genre: private records fit universally.)
- **Clippings** — headline-driven, attributed, journalistic. (Sci-fi: colony news feeds. Fantasy: town crier notices, broadsheets. Noir: newspaper clippings.)

Choose formats that feel native to the fiction. A fairy tale zine might use letters and journal entries but never incident reports. A corporate dystopia might use memos and clippings but never journal entries.

Each document should contain at least one concrete physical detail — a date, a measurement, a name, a location, a material.

---

## WHAT YOU ARE PRODUCING

### 1. `storyArchives` — the archive sections

Each archive section matches a clock trigger from Stage 1. Section keys MUST match both `mechanics.clocks[].onTrigger.section` and `archiveLayout` keys — these are the same set.

```json
{
  "SECTION_KEY": {
    "format": "memo | incident-report | letter | transmission | journal | clipping | fragment-columns",
    "formatConfig": {},
    "nodes": [
      {
        "id": "STRING — e.g. 'D01', 'CR01'. IDs are passed to Stage 4 as cross-reference targets — use stable, meaningful prefixes per section.",
        "title": "STRING — short document title (letter format uses 'from' instead)",
        "from": "STRING (OPTIONAL) — letter format only: sender name displayed as attribution",
        "html": "STRING (HTML) — the document content"
      }
    ]
  }
}
```

**Format configs:**
- `memo`: `{ "fields": ["TO","FROM","RE","REF"], "defaults": { "TO": "...", "FROM": "..." } }`
- `incident-report`: `{ "severityDefault": "STRING" }`
- `letter`: `{ "border": "dashed" | "solid" }`. Nodes use `"from"` instead of `"title"`.
- `transmission`: `{ "channel": "STRING" }`. Monospace, timestamped.
- `journal`: `{}`. Italic, dashed borders. Nodes use `"title"` as date-like heading.
- `clipping`: `{ "source": "STRING" }`. Headline-driven, attributed.
- `fragment-columns`: `{}`. Renders title + body in a simple block layout — use for structured data fragments, catalogues, or indexed entries that don&apos;t fit other formats.

**How many archive nodes per section:**
- Clock with `sequential-loop`: 4-8 nodes
- Clock with `sequential-stop`: 4-8 nodes
- Clock with `by-week-player-choice`: 1 node per week per track

**ARCHIVE FORMAT DIVERSITY (mandatory):** Use at least 2 different `format` values across your archive sections (excluding evidence). The engine renders each format with a distinct visual treatment. Same format everywhere defeats the found-document illusion.

### 2. `storyEndings` — the ending nodes

Produce 2-5 endings. Each corresponds to an `endConditions` entry from Stage 1.

```json
[
  {
    "id": "STRING — MUST match an endConditions[].id from Stage 1",
    "title": "STRING — e.g. 'ENDING: THE THEORY'",
    "html": "STRING (HTML) — 3-8 sentences. Consequence, not celebration."
  }
]
```

**Ending guidelines:**
- Endings reflect lasting consequence, not generic win/lose
- Every ending acknowledges the physical achievement (they lifted for N weeks) without fanfare
- Endings can reference archive content the player may have read
- 3-8 sentences each. Substantial but not essays.
- **Failure advances narrative.** "Bad" endings should feel like "the story went somewhere different," not punishment.

---

## CONSTRAINTS

1. All `html` fields use HTML, not markdown
2. Use `&apos;` not bare apostrophes
3. No BANNED WORDS (terrifying, chilling, sinister, evil, looming, epic, badass, sudden, suddenly, eerie, ominous, foreboding, mysterious)
4. Archive section keys MUST match `archiveLayout` keys AND `clocks[].onTrigger.section` from Stage 1
5. Ending IDs MUST match `endConditions[].id` from Stage 1
6. Each archive node: 1-6 sentences. Each ending: 3-8 sentences.
7. Notes/letters using `"from"` instead of `"title"` — check format spec
8. Archive format diversity: at least 2 different format types

---

## OUTPUT

Return ONLY a valid JSON object with two keys: `storyArchives` and `storyEndings`. No commentary, no markdown fences.

---

## STAGE 1 CONTEXT (required fields)

The following Stage 1 fields are needed to generate archives and endings:

- `mechanics.clocks[]` — clock names, sizes, directions, and `onTrigger.section` keys (defines which archive sections to produce)
- `mechanics.endConditions[]` — ending IDs and trigger conditions (defines which endings to produce)
- `archiveLayout[]` — left/right section key assignments (confirms the complete set of section keys)
- `story.refScheme` — REF code prefix (for consistent cross-reference naming)

## PASTE YOUR STAGE 1 CONTEXT BELOW THIS LINE
