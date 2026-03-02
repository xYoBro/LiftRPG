# LIFTRPG v2 — STAGE 2: VOICE + MAP

You are generating the UI text layer and optional spatial map for a Print & Play RPG Zine. The "voice" is every piece of text on the printed page that is NOT story content — page headers, classification stamps, the instruction manual, HUD labels, session names, and archive section introductions.

The voice IS the fiction. If the zine is set in a bureaucratic horror world, every page header reads like a classified document stamp. If it is set in a space station, headers read like console output. The voice layer makes the physical booklet feel like a found document from that world.

---

## DIEGETIC UI (mandatory)

Every UI element must pass this test: **"Could this object or label exist inside the fiction?"**

Adapt the voice to match the user's genre and setting. Examples across genres:

- Tracking bubbles are not "rep tracking boxes" — they are fuel cells (sci-fi), prayer beads (fantasy), tally marks (noir), petal counts (fairy tale)
- The mechanics page is not a "rules reference" — it is an operational brief (military), a field manual (exploration), a grimoire page (fantasy), a case dossier (noir)
- Page numbers are not "page numbers" — they are file indices (institutional), signal frequencies (sci-fi), chapter verses (literary), coordinates (exploration)
- Session headers are not "Day 1" — they are shift designations (industrial), log entries (scientific), ritual markers (fantasy), case numbers (noir)

## SESSION-BOUNDARY HOOKS

The voice layer controls what the player reads at the START and END of each session:

- **`weekAlerts`**: Week-start framing. For early weeks: "PREVIOUSLY ON" framing (1 sentence). For later weeks: foreshadowing. Keep in-fiction voice.
- **`refPageAlerts`**: Can include "NEXT SESSION PREVIEW" hints — cryptic in-fiction sentences that make the player look forward to the next workout. These are Zeigarnik hooks.
- **`weekBosses`**: Narrative climax events. Place on highest-intensity weeks for physiological congruence.

The player should leave each session with an unresolved question and arrive at the next session remembering it.

## ENDOWED PROGRESS

If you generate a Track or Clock for Session 1, write a rule instructing the player to pre-fill the first 10-20% of the tracker immediately. The endowed progress effect increases engagement.

---

## WHAT YOU ARE PRODUCING

Two sections: `voice` and `map` (map is optional — set to `null` if not appropriate).

### `voice`

```json
{
  "cover": {
    "classification": "STRING — top-of-page stamp, e.g. 'RESTRICTED // FACILITY USE ONLY'",
    "department": "STRING — organizational unit",
    "subjectLine": "STRING — subject identifier",
    "tagline": "STRING — one-line description",
    "intro": "STRING (HTML) — REQUIRED. 2-4 sentences establishing the world before the rules page. Written in the fiction&apos;s voice. Physical details, not exposition."
  },
  "classifications": {
    "brief": "STRING — operational brief page header",
    "sessionLog": "STRING with {{week}} — weekly log header",
    "operationsLog": "STRING with {{week}} — right page weekly header",
    "mechanics": "STRING — mechanics reference header",
    "ARCHIVE_KEY": "STRING — one entry per archive section key from Stage 1",
    "refs": "STRING with {{week}} — REF pages header",
    "endings": "STRING — endings page header",
    "endOfFile": "STRING — final page header"
  },
  "manual": {
    "title": "STRING — diegetic title for the rules page",
    "sections": [
      { "heading": "STRING", "body": "STRING (HTML)" }
    ]
  },
  "hud": {
    "mapTitle": "STRING with {{week}} — HUD map section title",
    "clocksLabel": "STRING — label above clocks on HUD",
    "diceLabel": "STRING — label above dice table on HUD",
    "diceNote": "STRING — instruction below dice table"
  },
  "weekPage": {
    "leftTitle": "STRING with {{week}} — left page header",
    "sessions": {
      "DAY_NUMBER": "STRING — one entry per day in workout.sessionTypes[].days"
    }
  },
  "archive": {
    "SECTION_KEYTitle": "STRING — one per archive section key",
    "SECTION_KEYIntro": "STRING — one per archive section key",
    "evidenceTitle": "STRING — diegetic title for evidence pages (e.g. 'EVIDENCE LOG', 'FIELD OBSERVATIONS')",
    "evidenceIntro": "STRING with {{prefix}} — {{prefix}} is replaced at render time with the REF code prefix from Stage 1 refScheme",
    "endingsTitle": "STRING",
    "endingsTrigger": {
      "heading": "STRING",
      "lines": ["STRING — when to read each ending"]
    }
  },
  "weekAlerts": {
    "WEEK_NUMBER": {
      "type": "intake | alert | note — intake = first-session setup (text defaults to 'INTAKE'), alert = in-fiction warning, note = in-fiction observation",
      "text": "STRING"
    }
  },
  "refPageAlerts": {
    "WEEK_NUMBER": {
      "type": "note | alert",
      "text": "STRING"
    }
  },
  "weekBosses": {
    "WEEK_NUMBER": {
      "alert": "STRING — short punchy banner text (e.g., 'THREAT LEVEL CRITICAL')"
    }
  },
  "finalPage": {
    "heading": "STRING (HTML — can use <br>)",
    "subline": "STRING",
    "instruction": "STRING"
  },
  "labels": {
    "mechanicsHeading": "STRING — tracker sheet page heading (default: 'CHARACTER DOSSIER')",
    "clocksHeading": "STRING — clocks section heading (default: 'CLOCKS')",
    "resourceHeading": "STRING — resources section heading (default: 'RESOURCES')",
    "liftColumn": "STRING — exercise name column header (default: 'LIFT')",
    "weightColumn": "STRING — weight column header (default: 'WEIGHT')",
    "sessionRef": "STRING — REF code label, uses {{ref}} token (default: 'REF {{ref}}')",
    "weekEndCheckin": "STRING — week-end check-in heading (default: 'WEEK-END CHECK-IN')"
  }
}
```

### Manual sections (Apple design philosophy)

**BREVITY IS MANDATORY.** The player is about to go to the gym. They will not read a wall of
text. Write the absolute minimum needed to start playing. If a mechanic is well-designed, the
tracker on the page teaches itself — boxes to fill, circles to mark, tables to read from.
The manual exists only for what the physical layout cannot communicate on its own.

Write 3-5 SHORT sections. Each section: a heading and 1-3 sentences maximum. No paragraphs.

1. What you need (dice type, pencil — one sentence)
2. The session loop (workout → roll → read result → mark tracker — as a numbered list of 3-5 steps, not prose)
3. Your trackers (one sentence per clock/track naming it and what happens when it fills/empties — a bullet list, not paragraphs)
4. Missed sessions (one sentence)
5. ONLY if there is a mechanic the tracker layout truly cannot communicate: one additional section explaining it in 1-2 sentences

If you are writing more than ~150 words total across all sections, you are writing too much. Cut.

Write these IN THE FICTION&apos;S VOICE. Not "roll a d6" but whatever the fiction calls it.

### `voice.labels` (optional overrides)

The engine has defaults for every rendered string. Only override those where the default doesn&apos;t fit the world. Match the user&apos;s genre:

- Military: `"mechanicsHeading": "RULES OF ENGAGEMENT"`, `"weekEndCheckin": "DEBRIEF"`
- Scientific: `"clocksHeading": "INSTRUMENTS"`, `"weekEndCheckin": "DATA COLLECTION"`
- Literary: `"liftColumn": "MOVEMENT"`, `"weightColumn": "LOAD"`
- Fantasy: `"mechanicsHeading": "THE RITES"`, `"resourceHeading": "RELICS"`
- Noir: `"mechanicsHeading": "HOW THIS WORKS"`, `"liftColumn": "EXERCISE"`
- Fairy Tale: `"clocksHeading": "ENCHANTMENTS"`, `"weekEndCheckin": "REFLECTION"`

### `map` (optional)

If the theme involves a physical location that changes over the program, include a map. Choose the type that fits the fiction.

**`type: "facility-grid"`** — grid of rooms across floors.

```json
{
  "type": "facility-grid",
  "title": "STRING",
  "levels": [{ "name": "STRING", "columns": NUMBER }],
  "weeks": {
    "WEEK_NUMBER": {
      "floor1Label": "STRING",
      "playerLabel": "STRING",
      "divider": "STRING",
      "dividerAlert": BOOLEAN,
      "rooms": [[{ "label": "STRING", "mod": "STRING", "sub": "STRING" }]]
    }
  }
}
```

Room `mod` values: `""` (normal), `"you"` (player), `"corridor"`, `"locked"`, `"redacted"`.

**`type: "point-to-point"`** — location network with fog-of-war.

```json
{
  "type": "point-to-point",
  "title": "STRING",
  "locations": [{ "id": "STRING", "label": "STRING", "x": NUMBER, "y": NUMBER }],
  "connections": [{ "from": "LOCATION_ID", "to": "LOCATION_ID" }],
  "weeks": {
    "WEEK_NUMBER": { "playerAt": "LOCATION_ID", "revealed": [], "locked": [] }
  }
}
```

**`type: "linear-track"`** — single track with position marker.

```json
{
  "type": "linear-track",
  "title": "STRING",
  "size": NUMBER,
  "labels": ["START", "...", "END"],
  "weeks": {
    "WEEK_NUMBER": { "position": NUMBER, "obstacles": [], "entities": [] }
  }
}
```

All map types: show progression — more areas revealed, position advancing, or regions unlocking as weeks increase.

---

## CRITICAL REQUIREMENTS

- `classifications` MUST have an entry for every archive section key from Stage 1
- `weekPage.sessions` MUST have an entry for every day number across ALL `workout.sessionTypes[].days`
- `{{week}}` and `{{prefix}}` template tokens are replaced at render time
- `weekAlerts`: Week 1 should typically be `"type": "intake"`
- All `html`/`body` fields use HTML, not markdown
- Use `&apos;` not bare apostrophes
- No BANNED WORDS (terrifying, chilling, sinister, evil, looming, epic, badass, sudden, suddenly, eerie, ominous, foreboding, mysterious)

---

## OUTPUT

Return ONLY a valid JSON object with two keys: `voice` and `map`. No commentary, no markdown fences.

---

## PASTE YOUR STAGE 1 CONTEXT BELOW THIS LINE
