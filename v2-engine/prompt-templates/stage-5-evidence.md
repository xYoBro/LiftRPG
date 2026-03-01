# LIFTRPG v2 — STAGE 5: EVIDENCE TRACK NODES

You are writing investigative evidence nodes for a Print & Play RPG Zine. These are deep-lore documents unlocked when a specific clock fills. They form parallel investigative tracks offering competing explanations for what is happening in the zine&apos;s world.

Each track tells a coherent story across all weeks. A player who pursues one track pieces together one theory. A player who mixes tracks gets fragments of several. All tracks are simultaneously plausible — none is definitively "correct."

---

## TRACK DESIGN

Each track has 1 node per week of the program:

- **First ~33%**: Establish the track&apos;s perspective and voice. Introduce one key claim.
- **Middle ~33%**: Deepen and complicate. Introduce contradictions or new angles.
- **Final ~33%**: Strongest evidence yet, but end on an open thread — never a neat conclusion.

## CROSS-TRACK CONNECTIONS

Tracks should share some concrete details (a date, a name, a measurement) but interpret them differently. A location one track calls "the facility" another might call "the lab" or "Building 7." This rewards players who read multiple tracks across replays.

## VOICE PER TRACK

Each track should SOUND different — different vocabulary, concerns, blind spots. Adapt to your zine&apos;s theme. Examples:

- Corporate: quarterly reports, ROI language, sanitized
- Government: classification stamps, redacted sections, procedural
- Independent researcher: field notes, first-person, informal but precise
- Religious/spiritual: liturgical language, ritual observations

---

## WHAT YOU ARE PRODUCING

A flat JSON object where each key is an evidence node ID. The keys MUST exactly match the format `ev-{TRACK_ID}-w{WEEK_NUMBER}`:

```json
{
  "ev-TRACKID-w1": { "type": "evidence-TRACKID_LOWERCASE", "html": "..." },
  "ev-TRACKID-w2": { "type": "evidence-TRACKID_LOWERCASE", "html": "..." }
}
```

The `type` field: `"evidence-TRACKID_LOWERCASE"` (e.g., `"evidence-a"`, `"evidence-b"`).

### Node content

- 2-5 sentences each
- HTML only, use `<strong>`, `<em>`, `<br>`
- Use `&apos;` not bare apostrophes
- Each node should feel like an excerpt from a longer document
- Include specific details that connect to other tracks or session narrative

---

## CONSTRAINTS

1. Produce EXACTLY one node ID per week for each track provided. E.g., if there are 2 tracks and 6 total weeks, produce 12 node IDs total. IDs MUST perfectly match the format `ev-{TRACK_ID}-w{WEEK_NUMBER}` (where `TRACK_ID` is the track's id from Stage 1). Example: `ev-A-w1`, `ev-A-w2`.
2. Every node must have `"type"` and `"html"` fields
3. Type format: `"evidence-TRACKID_LOWERCASE"`
4. HTML only — no markdown
5. `&apos;` not bare apostrophes
6. No BANNED WORDS
7. 2-5 sentences per node
8. Each track must tell a coherent arc (not random fragments)

---

## OUTPUT

Return ONLY a valid JSON object. No wrapping, no commentary, no markdown fences.

---

## PASTE YOUR STAGE 1 + STAGE 3 CONTEXT BELOW THIS LINE
