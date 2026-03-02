# LiftRPG

A generative Print & Play RPG Zine engine. Input a real workout program and a narrative brief, feed them to any LLM, get back structured JSON, and the engine renders a printable saddle-stitched booklet. Each booklet is a physical gamebook: a workout journal fused with a branching narrative TTRPG, designed to be written in with a pencil during actual gym sessions.

The quality bar is indie TTRPG production -- Mothership, Mork Borg, Into the Odd. Found-document aesthetics, overwhelming information density, mechanical depth. The format IS fiction: the booklet reads like an artifact from the story's world.

Every booklet is mechanically, visually, and narratively unique. The engine supports 7 resolution systems, 5 modifier mechanics, 7 tracking types, 5 spatial mechanics, and 6 narrative structures via a mechanical primitives catalog with a complexity budget system. A wiring engine designs how mechanics interact -- feedback loops, threshold gates, conditional routing -- so each booklet plays like its own game.

**Current version: v3.0.0-alpha.6**

---

## 1. Architecture Overview

### Pipeline

```text
User (workout program + narrative brief + dice selection)
  |
  v
Browser UI (index.html -- builds system prompt from prompt-templates/)
  |
  v
[Stage W] Wiring Blueprint -- designs mechanical topology
  |
  v
[Stages 1-5] Foundation, Voice, Archives, Story, Evidence
  |
  v
User pastes each prompt into any LLM (Claude, ChatGPT, Gemini, etc.)
  |
  v
LLM generates JSON, pasted back and validated at each stage
  |
  v
content-atomizer.js decomposes finalPayload into typed atom inventory
  |
  v
box-packer.js routes to rendering path:
  Governor (primary) -- groupByAffinity -> template selection -> atom rendering
  Legacy (fallback)  -- pages[] dispatch via switch/case to render-*.js modules
  |
  v
DOM pages rendered at 5.5" x 8.5" (half-letter)
  |
  v
Saddle-stitch imposition (11" x 8.5" landscape spreads) -> Print
```

### File Map

```text
LiftRPG/
  index.html                           Browser UI: HTML structure + boot script (init, template fetch)
  app-ui.css                           App UI styles -- dark theme, progress rail, accordion, forms, footer
  v2-engine/
    base-theme.css                     Page dimensions, typography, components, print media, visual treatments
    box-packer.js                      Governor primary / legacy fallback -- routes to Layout Governor or pages[] dispatch
    render-utils.js                    Sanitizers (escapeHtml, sanitizeSvg, sanitizeHtml, decodeEntities) + page boilerplate
    render-primitives.js               Tracker widgets -- SVG clocks, tug-of-war, progress, heat, skill tree, faction
    render-pages.js                    Structural pages -- cover, rules manual, tracker sheet, setup, endings, evidence, final
    render-narrative.js                REF pages (scrambled paragraph-book) + archive pages (7 document formats)
    render-encounters.js               Encounter spread (HUD + session log) + map renderers (grid, PTP, linear)
    content-atomizer.js                Content decomposition -- converts finalPayload into typed atom inventory
    atom-renderers.js                  DOM fragment producers for 22+ atom types
    layout-governor.js                 Composition engine -- affinity grouping + template selection + overflow handling
    layout-templates.js                18 page-composition templates with registry (multi-slot, single-slot, structural)
    governor-measure.js                Offscreen measurement harness -- caches atom heights for scoring
    governor-score.js                  Layout quality scoring -- fill ratios, diversity bonuses, overflow penalties
    story-tables.js                    Randomizer data -- curated story generator tables
    json-repair.js                     LLM JSON repair pipeline -- safeExtract() with 7 repair phases
    validators.js                      Schema validation + Quality Governor + atom inventory validation
    prompt-assembler.js                Prompt text builders -- template substitution + cross-stage context
    pipeline-state.js                  Central state container -- window.Pipeline API
    intake-ui.js                       Dice selector + cover image UI (dropzone, file handling)
    ui-state.js                        UI state machine -- progress rail, accordion, stage lifecycle
    pipeline-io.js                     Pipeline I/O -- validation orchestration, import/export, assembly + imposition
    prompt-templates/
      stage-w-wiring.md                Mechanical wiring blueprint prompt (Stage W)
      stage-1-data-requirements.md     Stage 1 JSON schema spec
      stage-1-liftoscript.md           Workout script parsing (Stage 1 only)
      shared-creative-direction.md     Genre-neutral creative framework (Stages 1-5)
      shared-primitives-catalog.md     Mechanical menu with complexity budgets + wire compatibility
      shared-wiring-catalog.md         Wire type catalog
      shared-anti-isomorphism.md       Structural uniqueness check + wire topology audit
      stage-2-voice-map.md             Voice layer + spatial map data
      stage-3-archives.md              Found documents + endings
      stage-4-story.md                 Session narrative REF nodes
      stage-5-evidence.md              Evidence tracks (optional)
  .gitignore                           Ignores .DS_Store
  README.md                            This file
  LICENSE                              MIT License
```

### Schema: Dual Rendering Path (v3)

The v3 engine uses a **dual rendering architecture**. The primary path (Layout Governor) decomposes LLM-generated JSON into a typed atom inventory, groups atoms by affinity, selects from 18 page-composition templates, and renders with measurement-aware scoring for optimal page fill. The legacy fallback path dispatches a `pages[]` array to `render-*.js` modules when the atom inventory is unavailable.

**New in v3:** The `pages[]` array is deprecated -- the engine auto-generates page ordering from the atom inventory. `structuralAtoms[]` (quote-page, pacing-breath) provide LLM-directed full-page creative elements with placement hints. `pacingHint` on encounters drives template selection (breather, crescendo, transition).

Top-level JSON keys (assembled from all LLM stages):

```json
{
  "meta": { "title": "...", "subtitle": "...", "author": "..." },
  "workout": { "totalWeeks": 6, "sessionTypes": ["..."], "setup": {} },
  "mechanics": { "dice": {}, "clocks": [], "tracks": [], "resources": [] },
  "theme": { "visualArchetype": "...", "colors": {}, "fonts": {} },
  "story": { "encounters": [], "refs": {}, "archives": {}, "endings": [] },
  "map": { "type": "facility-grid", "title": "..." },
  "voice": { "cover": {}, "manual": {}, "classifications": {} },
  "structuralAtoms": [{ "type": "quote-page", "content": {}, "placement": {} }]
}
```

### Page Types (box-packer dispatch)

| Type | Description |
|------|-------------|
| `cover` | Title page with classification stamp, intro text, cover art |
| `rules-manual` | Instruction manual written in the fiction's voice |
| `tracker-sheet` | Printable character dossier with clocks, tracks, resources, codewords |
| `setup` | Workout setup page with 1RM fields, calculation grid |
| `encounter-spread` | Weekly encounter pages: HUD + workout logs + narrative (requires `week`) |
| `ref-pages` | Story REF branching nodes for a week (requires `week`) |
| `archive` | Archive section pages: found documents (requires `section`) |
| `evidence` | Faction/progress evidence pages (auto-skipped if no tracks) |
| `endings` | All ending narratives with trigger conditions |
| `final` | Closing page |

Pages are padded to a multiple of 4 for saddle-stitch imposition.

### Imposition (Saddle-Stitch)

`pipeline-io.js` reorders pages into 11" x 8.5" spreads for duplex printing:

- Even spread index: Left = high page number, Right = low page number
- Odd spread index: Left = low page number, Right = high page number

Print duplex, fold in half, staple the spine.

---

## 2. Rendered Primitives

The engine renders visual components for these mechanical primitive IDs:

| Primitive | Renderer | CSS Class |
|-----------|----------|-----------|
| 3A/3B | Fill/drain clock boxes | `.clock-container` `.clock-segment` |
| 3C | Tug-of-war track with center marker | `.tug-container` `.tug-track` `.tug-box` |
| 3D | Progress track (fillable boxes) | `.progress-track` `.progress-box` |
| 3E | Heat/threat counter (numbered boxes) | `.heat-track` `.heat-box` |
| 3F | Skill tree with checkboxes and costs | `.skill-tree` `.skill-node` |
| 3G | Faction reputation track with labels | `.faction-track` `.faction-boxes` |
| 5A/5C | Grid map (facility/hex) | `.map-grid` `.map-cell` |
| 5B | Point-to-point SVG map | `.ptp-map` |
| 5D | Linear track (numbered positions) | `.linear-track` `.linear-box` |

All other primitives (1x, 2x, 4x, 6x, 7x, 8x) are prompt-only -- no dedicated renderers.

---

## 3. How to Create a New Booklet

### Step 1: Write Your Prompt

Prepare two things:

1. **Workout program**: exercises, sets, reps, schedule, weekly intensity progression, duration
2. **Narrative brief**: genre, setting, tone, mood, inspirations, narrative voice -- or click "Randomize" to roll from the story generator tables

### Step 2: Generate the JSON

1. Open [liftrpg.co](https://liftrpg.co) in a browser (or serve locally with any static file server)
2. Enter your workout and narrative brief in the intake form
3. Select your available dice (or "No Dice" for diceless mechanics)
4. Click "Begin Generation" to unlock the Wiring Blueprint stage
5. For each stage (W, then 1-5):
   - Click "Generate Prompt" to build and copy the LLM prompt
   - Paste the prompt into any LLM (Claude, ChatGPT, Gemini)
   - Copy the LLM's JSON response back into the "Paste LLM Output" textarea
   - Click "Process & Save" to validate and advance
   - Stage 5 auto-skips if no evidence tracks exist

### Step 3: Assemble and Print

1. Once all stages are validated, click "Validate & Assemble"
2. The engine renders all pages and imposes them into saddle-stitch spreads
3. Click "Print Spreads" (set paper to 11" x 8.5" landscape, margins to none)

You can also export/import the pipeline JSON at any stage to save progress.

---

## 4. Theming

Themes are generated inline by the LLM via `injectTheme()`. Each booklet gets a unique visual identity based on the narrative brief -- colors, fonts, layout variables.

### CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--ink` | `#1a1a18` | Primary text/border color |
| `--paper` | `#f0ede4` | Page background |
| `--fog` | `#e6e2d8` | Alternating section background |
| `--accent` | `#c45c00` | Primary highlight color |
| `--muted` | `#5a5a56` | Secondary/quiet color |
| `--font-body` | Helvetica Neue | Body text font |
| `--font-heading` | (inherits body) | Heading font |

All designs must work in B&W (never rely on hue alone).

---

## 5. Development

This is a static site with no build step. To run locally, serve the repo root with any static file server:

```bash
npx http-server . -p 8080
```

Open `localhost:8080` in a browser.

### Adding a New Primitive Renderer

1. Write a render function in `v2-engine/render-primitives.js` (for tracker widgets) or `v2-engine/render-pages.js` (for page-level renderers) that returns a DOM element
2. Add a dispatch case in `v2-engine/box-packer.js` for new page types, or wire the primitive into the appropriate page renderer
3. Add structural CSS in `v2-engine/base-theme.css`
4. Update the primitives catalog in `v2-engine/prompt-templates/shared-primitives-catalog.md`

---

## 6. License & Attribution

**LiftRPG** is an open-source project released under the [MIT License](LICENSE).

### Open Source AI Statement

The architectural concept, mechanical systems planning, and creative direction of this engine were developed by xYoBro. However, the vast majority of the source code, styling, and algorithms in this repository were generated by a Large Language Model (AI).

Furthermore, all narrative content, rules text, and layout data inside the PDF booklets produced *by* this engine are explicitly AI-generated. The output documents are not written by humans. We release this tool freely to the world so others can experiment with generative physical media.

### Acknowledgments

Workout input supports exports from [Liftosaur](https://www.liftosaur.com/) by Anton Astashov.

---

## 7. Feedback & Contributions

This project is free and open source. If you find a bug, have an idea, or want to talk about generative physical media, open an issue:

**[GitHub Issues](https://github.com/xYoBro/LiftRPG/issues)**

No formal support is provided, but issues are read. If you build something inspired by this engine, I'd love to hear about it.
