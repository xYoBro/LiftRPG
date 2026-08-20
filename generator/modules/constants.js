// ── Shared constants for the API generation pipeline ─────────────────────────
// Single source of truth for enums, provider config, and tuning values.
// Every module in the pipeline imports from here — never duplicate these.

export var DEFAULT_TIMEOUT_MS = 600000; // 10 minutes — long frontier-model stages often exceed 5m
export var MAX_OUTPUT_TOKENS = 64000;   // hard ceiling for a single stage; only generated tokens are billed

// ── Streaming transport windows (format-agnostic) ────────────────────────────
// Every streaming transport shares these. Wall-clock is the WRONG failure signal for
// a stream: a legitimate 24k-token completion at a conservative 20 tok/s runs
// ~20 minutes, while a dead socket produces no bytes at all. So the transport
// fails fast on SILENCE and stays patient with PROGRESS:
//
//   connect  — no response headers within this window  -> abort (server unreachable)
//   idle     — no bytes for this long mid-stream       -> abort (connection died)
//   overall  — absolute ceiling regardless of progress -> abort (runaway)
//
// The caller's per-stage requestTimeoutMs is treated as ADVISORY on this path:
// it is clamped into [STREAM_MIN_OVERALL_MS, STREAM_MAX_OVERALL_MS]
// and used as the overall cap only. Idle is the real guard.
export var STREAM_CONNECT_TIMEOUT_MS = 90000;       // 90s to first response headers
export var STREAM_IDLE_TIMEOUT_MS = 120000;  // 2m of total silence mid-stream
export var STREAM_MIN_OVERALL_MS = 600000;   // never cap a live stream below 10m
export var STREAM_MAX_OVERALL_MS = 1800000;          // 30m absolute ceiling

// ── Per-stage token / timeout ladder (single source) ─────────────────────────
// THE LADDER LIVES HERE. Do not hand-write maxTokens/requestTimeoutMs literals
// at stage call sites — pass a stage budget key instead (see stageBudget() in
// api-generator.js), which also owns retry escalation.
//
// Ceilings are ~3-4x the output measured across the three real Anthropic S+F
// runs (docs/plans/2026-03-28-gemini-flash-pipeline-optimization-audit.md §2:
// skeleton ~6.9k, rules ~0.8k, week ~4.3k, fragments ~12.2k bundled, endings
// ~7.4k bundled). Timeouts are sized so the ceiling is actually REACHABLE at a
// conservative ~20 tok/s planning floor — the pairing the old blanket
// 64000-tokens/120000-ms configuration could never satisfy.
// Rows carrying their own evidence citation (skeleton/shell/campaign via
// D155/D159/D166, critic pair via D113) have been re-derived PAST this base
// rule since — where a row comment and this header disagree, the row wins.
// (Provenance note, 2026-08-17 ballast audit: the §2 telemetry the base rule
// cites was measured on real Claude runs — the doc's Gemini-Flash title
// describes its question, not its data. The ladder was never weak-model-derived.)
//
// INVARIANT: retries escalate. A retry must never get less budget than the
// attempt it is replacing (the Story Plan stage previously shrank 420s -> 300s
// on retry, which is how a slow-but-healthy generation got killed twice).
// ── THE OPTIONAL THIRD COLUMN: effort ────────────────────────────────────────
//
// Every row below may carry an OPTIONAL `effort` alongside its (maxTokens,
// timeoutMs) pair — one of VALID_STAGE_EFFORTS ('low' | 'medium' | 'high' |
// 'xhigh' | 'max'). It rides this table for the same reason the other two do
// (D97): a hand-written effort literal at a stage call site is a defect, and a
// second home for "how hard should this stage work" is how one table becomes
// two answers. stageBudget() is the one accessor; the anthropic transport is
// the one place it reaches the wire (`output_config.effort`), because it is an
// Anthropic Messages field and a compat endpoint would reject it.
//
// EVERY ROW SHIPS UNSET, AND THAT IS THE POINT. An absent value sends no
// parameter at all, which the API documents as exactly equivalent to the
// default ('high'), so an unset ladder makes a request byte-identical to a
// pre-knob one — asserted in both gates. Do NOT set a non-default effort on any
// stage here without evidence: what effort costs and buys on THIS pipeline's
// stages has not been measured, and the vendor's own recommendation for the
// default model (medium on claude-sonnet-4-6) is guidance, not a measurement of
// our books. Tuning these rows is a future evidence-based ruling — a bench
// sweep per stage, judged on book quality, not a value copied from a doc.
//
// Two constraints for whoever does that sweep. Effort is rendered into the
// prompt, so CHANGING it invalidates cache prefixes — hold it constant across
// calls that share one (i.e. set it per stage, never per attempt). And it is
// model-gated: an endpoint whose model predates the parameter answers 400, so a
// non-empty value here is a claim about the models this pipeline runs.
// ── THE OPTIONAL FOURTH COLUMN: attempts ─────────────────────────────────────
//
// How many times a stage may be re-asked before the run stops. It belongs here
// for the same reason the other three do (D97): `maxAttempts: 2` written at a
// stage call site is a hand-written ladder literal, and "how many tries does
// this stage get" is not a property of the call site, it is a property of the
// stage. Read through stageBudget() like the rest; an explicit
// `config.maxAttempts` still wins (the trial-mode call sites depend on that),
// and an unset row falls back to the same 2 every call site used to write.
//
// A row is raised on EVIDENCE of a stage that is expensive to reach and fails
// on something a retry can actually fix — not as a general cushion. Every extra
// attempt is a full-price call.
export var STAGE_BUDGETS = {
  // ── THE RULEBOOK (VISION §4.0, D173) ──────────────────────────────────────
  // Shared by both pipelines and the FIRST authored stage on each. Its output
  // is bounded in the one place a stage's output is ever bounded from above by
  // doctrine rather than by geometry: OUTPUT_BUDGETS.gameRulebook caps the
  // whole document at 1,800 WORDS, which is ~2,400 tokens of prose and ~3,000
  // once a model pretty-prints the JSON around it. 16000 is the ladder's own
  // ~3-4x rule with headroom for a model that thinks inside the same ceiling.
  //
  // NOT SIZED LIKE A COMPILER STAGE, deliberately, and the asymmetry is the
  // point: `shell` and `skeleton` cost 56000 because they write a whole
  // identity bundle plus a spine plus (on S+F) a week plan. This stage writes
  // eight paragraphs and four short lists. A generous ceiling here would buy
  // nothing except permission to exceed a band the floor then rejects.
  //
  // The timeout moved 300000 → 600000 in the D192 schedule with `knowing`:
  // both are short-structured-output stages, but both run first-in-line on a
  // door whose frontier default thinks before writing (D184/D191's mechanism),
  // and a timeout loss at the front of the run is pure waste. `conductor` and
  // `rules` keep 300000 — they read projections, not briefs, and have never
  // shown a slow attempt.
  //
  // ATTEMPTS UNSET (= 2). Raised only on evidence, per this table's own law.
  // The failures this stage can have are a thin answer and a band breach, both
  // of which a retry with the blocking error quoted can genuinely fix.
  gameRulebook: { maxTokens: 16000, timeoutMs: 600000 },
  // Shared by both pipelines (§11 Wave 1.5). One structured object of short
  // strings — roughly 25-35 one-line facts. Cheaper than any prose stage by
  // construction, and an explicit row rather than the silent MAX_OUTPUT_TOKENS
  // fallback a missing key would take (D97).
  knowing:    { maxTokens: 12000, timeoutMs: 600000 },
  // ── THE ECONOMY GRAPH'S WEEK AXIS (§4.11) ─────────────────────────────────
  // Shared by both pipelines, between the shell and the first week. It COPIES a
  // graph it was given and annotates each edge — so its output size is bounded
  // by the input's edge count (SPINE_BUDGETS caps the graph), not by anything it
  // invents. A spine's economyGraph is a handful of edges of two short refs and
  // three optional scalars; 12000 is the same short-structured-output shelf
  // `knowing` sits on, with room for a model that thinks inside the ceiling.
  //
  // NOT SIZED LIKE THE SHELL, and the asymmetry is the whole reason this stage
  // exists: the graph used to be authored inside that stage's ~108k payload,
  // where it was one question among a dozen. A narrow seat with a narrow budget
  // is the fix (D158's density class).
  //
  // The timeout matches `knowing` for the same reason stated on that row: this
  // is a short structured stage running early on doors whose frontier default
  // thinks before writing, and a timeout loss at the front of the run is waste.
  //
  // ATTEMPTS UNSET (= 2), per this table's own law — raised only on evidence.
  // Its failure modes are a dropped edge and a half-declared cadence, both of
  // which a retry with the blocking error quoted can genuinely fix.
  economyGraph: { maxTokens: 12000, timeoutMs: 600000 },
  // Canonicalize (§11 Wave 5). Shared by both pipelines, and the only stage
  // whose output size is set by the USER'S input rather than by the book: a
  // six-week program with six sessions a week is a few hundred short strings.
  // Generous on tokens because truncation here silently drops training weeks,
  // and short on wall clock because it is transcription, not composition.
  canonicalize: { maxTokens: 16000, timeoutMs: 300000 },
  // Skeleton+Flesh
  // The S+F pipeline's compiler seat: it writes the SAME identity bundle the
  // multi-stage `shell` writes (D144/D149/D152 axes, citations, spine) plus a
  // whole weekPlan, so it moves with `shell` below — one growth, both seats
  // (D155). A stage returning a whole unit is never budgeted below the stage
  // that writes the same unit on the other pipeline.
  skeleton:   { maxTokens: 56000, timeoutMs: 900000 },  // moves with `shell` (its own law above); dormant but the pairing holds
  rules:      { maxTokens: 12000, timeoutMs: 300000 },
  week:       { maxTokens: 24000, timeoutMs: 900000 },
  fragments:  { maxTokens: 40000, timeoutMs: 900000 },
  // THREE ATTEMPTS on evidence (the proving run, 2026-08-17): the finale is
  // the most expensive-to-reach stage in the book - the whole run stands
  // behind it - and it died at attempts=2 on a budget breach, a failure a
  // retry genuinely fixes (D166's law, same reasoning as shell's row).
  endings:    { maxTokens: 24000, timeoutMs: 720000, attempts: 3 },
  // Multi-stage / structured
  //
  // ── THE CEILING IS A SAFETY VALVE, NOT A BUDGET (D155, 2026-08-13) ──
  // Measured on the author's first real book: `campaign` truncated attempt 1
  // at 24000 and completed at the escalated ceiling; `shell` truncated at
  // 16000. Both rows were sized before D144/D149/D152 gave these stages far
  // more to WRITE — a shell now declares fifteen identity axes with citations,
  // six design-language axes with evidence, and a full play spine, and both
  // stages run on models that spend part of the same ceiling thinking.
  //
  // Only GENERATED tokens are billed (see MAX_OUTPUT_TOKENS above), so a
  // ceiling set too high costs nothing and a ceiling set too low costs a
  // full-price truncated call plus its retry. The asymmetry is total, and
  // these rows are set from what the stage must write plus thinking headroom,
  // never from thrift. The runaway guard is unchanged: MAX_OUTPUT_TOKENS is
  // still the hard cap, and the stage validators still reject over-budget
  // prose (OUTPUT_BUDGETS, D150) — a ceiling has never been what keeps a
  // stage's prose short.
  // Raised 600000 → 900000 on live author evidence (2026-08-17, D191): the
  // Foundation stage "always takes a long time" on the bridge door, where the
  // frontier default runs adaptive thinking BEFORE output (D184's noted
  // interaction) — a 10-minute attempt-1 was a timeout coin flip that cost the
  // full 10 minutes on every loss. First ladder row re-derived from frontier
  // evidence per directive 10c; the others move only when a run shows theirs.
  layerBible: { maxTokens: 24000, timeoutMs: 900000 },
  campaign:   { maxTokens: 56000, timeoutMs: 900000 },
  // MEASURED AGAIN, one model later (D159): a shell attempt reported 28.1k
  // output against this row's 32000 — 88% consumed — and came back with
  // `meta.playSpine` ABSENT rather than truncated. Above a tight ceiling a
  // model does not always cut the JSON off mid-token; it drops whole required
  // sections to fit, and the result surfaces as a schema failure with the
  // budget problem hidden underneath. The raise stands on that 28.1k/32000
  // number alone. (D159's first version attributed the drop to thinking
  // consuming the shared ceiling and named the wrong model; the author
  // WITHDREW that explanation the same evening and the ledger records the
  // correction. Nothing about thinking is established by this row — the
  // sentence that claimed it has been removed rather than left standing as
  // measurement. Where a model DOES think inside this ceiling, the knob is the
  // effort column below, not a thinking budget.)
  // THREE ATTEMPTS, on evidence (the door-givens wave). The author's first live
  // book failed this stage twice in a row on ONE cross-reference floor — the
  // decisionLedger owing a row per door week — with the blocking error quoted
  // verbatim into the retry directive both times, and the run stopped with
  // every upstream stage paid for. This is the most cross-reference-dense stage
  // in the pipeline and the last cheap one before the prose stages, so the
  // third attempt is bought against the cost of a stopped run rather than
  // against the cost of a call. The prompt-side fix (the derived GIVENS block)
  // is the load-bearing half; this is the cushion under it.
  // ── THE SHELL SPLIT: one row became four (PROVISIONAL) ──────────────────
  // The `shell` row is GONE rather than kept as an alias, and that asymmetry
  // with STAGE_SCHEMA_MAP (where `'shell'` survives) is the right one: the map
  // row survives because the GUIDED WIZARD builds a real prompt from it, and
  // that door pastes rather than calls, so it spends no token budget at all.
  // Nothing dispatches `stageBudget('shell')` any more, and a row for a stage
  // no caller names is a number that goes stale unobserved.
  //
  // DERIVATION, named as the economy protocol asks. Not a guess and not a
  // proportional slice of 56,000 for its own sake: the four numbers come from
  // the MEASURED output shares of the real 2026-08-19 banked shell
  // (liftrpg-checkpoint-2026-08-19T0300.json, the six-week delivered book),
  // serialized per surface —
  //
  //     identity (meta minus designLanguage/arrangement/playSpine)  12,014 ch  37.5%
  //     rules    (cover + rulesSpread)                               6,231 ch  19.5%
  //     theme    (theme + designLanguage + arrangement)              1,991 ch   6.2%
  //     spine    (meta.playSpine)                                   11,797 ch  36.8%
  //                                                                 ─────────
  //                                                                 32,033 ch
  //
  // — at roughly four characters per token, and then carried at the SAME
  // generosity ratio the 56,000 row already ran at (~7× the largest observed
  // payload, bought against the cost of a truncation rather than the cost of a
  // call). The four sum to 64,000 rather than 56,000 and that is correct: they
  // are four separate ceilings on four separate calls, never one budget shared.
  //
  // PROVISIONAL, every row, until the proving round measures a real split run.
  // One book is one draw; these shares are that book's, and a spine-heavy or a
  // rules-heavy brief will move them. The row that would hurt first is
  // `shellTheme` — it is the smallest and the one whose payload is least
  // predictable, so it carries the largest headroom multiple of the four.
  //
  // ATTEMPTS. The 56,000 row's third attempt was bought for CROSS-REFERENCE
  // DENSITY, and that density did not divide evenly: it is almost entirely the
  // spine's (the decisionLedger row-per-door failure that earned the row is a
  // playSpine defect) with a second concentration at the identity seat, whose
  // floors read the rulebook, the brief and the die at once. Those two keep
  // three. `shellRules` keeps three as well — its floors are the content ones
  // that have failed real books (rules teaching, orientation, assembly
  // disclosure). `shellTheme` takes the ladder default of two: its floors are
  // enum-shaped and mostly auto-repairable, and D166's rule is that an attempt
  // is raised on evidence, not on symmetry.
  shellIdentity: { maxTokens: 24000, timeoutMs: 600000, attempts: 3 },
  shellRules:    { maxTokens: 12000, timeoutMs: 480000, attempts: 3 },
  shellTheme:    { maxTokens: 6000,  timeoutMs: 300000 },
  shellSpine:    { maxTokens: 22000, timeoutMs: 600000, attempts: 3 },
  fragment:   { maxTokens: 24000, timeoutMs: 720000 },
  // Critic loop (D66). Both rows were sized before the critic had eight
  // dimensions and machine findings, and both were the smallest rows in the
  // ladder while doing the ladder's largest reading. Measured against real
  // six-week books (Book 1 glassworks, Eastern Shore, what-the-soil-remembers):
  //
  //   critic         input  ~26-38k tokens of digest.
  //                  output a verdict over 8 dimensions, each carrying >=2
  //                  evidence entries (evidence law) plus one failure object
  //                  per weakness. A PASSING verdict is ~700 tokens; the
  //                  verdict that matters is a FAILING one, and a heavy round
  //                  (4 evidence + 5 failures per dimension, pretty-printed as
  //                  models emit it) measures ~6.2k tokens. 8000 gave that
  //                  round no headroom at all — and none whatsoever on a model
  //                  that spends part of the same ceiling thinking.
  //   critic-revise  output is ONE COMPLETE UNIT returned whole, and the
  //                  largest unit is a week: 5.4k tokens compact on Book 1
  //                  (~7k as pretty-printed JSON), and a revision is usually
  //                  longer than the thing it revises. 16000 budgeted the
  //                  rewrite of a week BELOW the 24000 the `week` row spends
  //                  writing one, which is incoherent — a stage may not be
  //                  asked to reproduce an object it cannot afford to emit.
  //
  // Both now follow the ladder's own rule (~3-4x measured output) and pair
  // with a timeout that reaches the ceiling at the conservative ~20 tok/s floor.
  critic:         { maxTokens: 24000, timeoutMs: 720000 },
  'critic-revise': { maxTokens: 24000, timeoutMs: 900000 },
  // The conductor's pass (FUSION.md §4 mechanism 6). The cheapest reading stage
  // in the ladder BY CONSTRUCTION: its input is the score projection alone —
  // one line per week plus a caption, roughly 1.5k tokens at twelve weeks —
  // never the digest, because a reader handed the pages stops hearing the
  // sequence (that is the whole failure §4.6 names). Output is one verdict
  // sentence per week plus at most CONDUCTOR_MAX_FINDINGS findings: ~800 tokens
  // compact at twelve weeks, ~1.5k as models pretty-print it. 12000 is the
  // ladder's own ~3-4x rule with headroom for a model that thinks inside the
  // same ceiling, and it pairs with the 300000ms the `rules` and `knowing` rows
  // use — the two other short-structured-output stages. Sized deliberately
  // BELOW `critic`: a stage that reads an index must never be budgeted like one
  // that reads the book.
  conductor:      { maxTokens: 12000, timeoutMs: 300000 },
  // ── DELTA REPAIR (D167) ────────────────────────────────────────────────────
  // The smallest row in the ladder, and it must be: this stage rewrites only
  // the fields a gate NAMED. The motivating case is two storyPrompts four
  // characters over a 220-char budget — roughly 120 output tokens against the
  // 24000 a whole week costs to re-roll. 4000 covers the worst realistic case
  // (a week whose every point-of-use surface breached at once: ~20 short
  // strings) with the ladder's usual 3-4x headroom, and the timeout is the
  // shortest one here because there is no composition to do — the model is
  // shortening sentences it already wrote. A row, not a literal, for the same
  // reason every other stage has one (D97).
  deltaRepair:    { maxTokens: 4000, timeoutMs: 180000 }
};

// ── The delta-repair round bound (D167) ──────────────────────────────────────
// Delta rounds sit INSIDE one attempt of the stage's own ladder: the full
// re-roll remains the escalation, and this is how many times the model may be
// asked to shorten the same named fields before the attempt is spent. Two, by
// ruling — one round covers the ordinary stochastic overage, a second covers a
// model that overshot its first correction, and a third would be a model that
// cannot count characters at all, which a re-roll does not fix either.
// A constant, not a literal at the call site: the D97 law applied to rounds
// the same way D166 applied it to attempts.
// 2 -> 4 on live evidence (D194, the proving run's finale): the trim CONVERGES
// (2580 -> 2449 across calls) but models cannot count characters, so two
// rounds ended 49 over and re-rolled a whole stage. Each round is a ~4k-token
// 30-second call - four rounds cost under 2% of the re-roll they prevent.
export var DELTA_REPAIR_MAX_ROUNDS = 4;

// Retry escalation: each attempt gets more wall clock than the last, and a
// truncated attempt gets its token ceiling raised to MAX_OUTPUT_TOKENS.
export var RETRY_TIMEOUT_GROWTH = 1.5;
export var RETRY_TIMEOUT_CEILING_MS = 1200000; // 20m — no retry waits longer

// ── Provider presets ─────────────────────────────────────────────────────────

export var PROVIDERS = {
  anthropic: {
    label: 'Claude (Anthropic)',
    baseUrl: 'https://api.anthropic.com',
    // Refreshed 2026-08-17 (ballast audit 10a): claude-sonnet-4-6 → the current
    // frontier Opus. NOTE for the 10c budget trials: on claude-opus-5 an omitted
    // `thinking` parameter runs ADAPTIVE thinking (on sonnet-4-6 it meant none),
    // and max_tokens caps thinking + text TOGETHER — the STAGE_BUDGETS ladder was
    // sized for text alone, so truncation-shaped retries on this door are trial
    // evidence, not noise. D162's no-thinking-config pin is unchanged (we still
    // send no `thinking` field; the DEFAULT behind absence is what moved).
    defaultModel: 'claude-opus-5',
    format: 'anthropic',
    modelDiscovery: 'anthropic'
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    format: 'openai',
    modelDiscovery: 'openai'
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    format: 'openai',
    modelDiscovery: 'openai'
  },
  ollama: {
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    format: 'openai',
    modelDiscovery: 'ollama',
    noKey: true
  },
  // ── The Code Bridge (D127) — the third door ────────────────────────────
  // `scripts/liftrpg-bridge.mjs` serves the OpenAI-compatible surface on
  // loopback :8090 and fulfils every request by spawning the user's own
  // `claude` CLI, so a book costs a subscription window instead of metered
  // tokens.
  //
  // THIS ROW IS THE WHOLE INTEGRATION. D127(a): the OpenAI adapter takes its
  // URL from `settings.baseUrl` while the anthropic adapter hardcodes
  // ANTHROPIC_MESSAGES_URL, so the bridge is reachable as pure CONFIG and
  // needed zero client code. A provider is config (D94) — if this door ever
  // seems to need a transport change, the change is wrong.
  //
  // `modelDiscovery:'openai'` is LOAD-BEARING, not decoration: listProviderModels
  // only falls back by URL shape when the kind is empty, and that fallback reads
  // ANY loopback base URL as Ollama. Naming the kind is what keeps the bridge's
  // own /v1/models (OpenAI list shape) from being parsed as an Ollama tag list.
  //
  // `noKey` is the second belt. allowsEmptyApiKey() already exempts loopback by
  // URL, and the flag is what makes the key field visibly not-required rather
  // than merely tolerated — the bridge never sees a credential and must never
  // be handed one.
  //
  // `defaultModel:'default'` is one of the bridge's own CLI_DEFAULT_SENTINELS:
  // it means "whatever the subscription resolves", the one model id that cannot
  // go stale when the alias set moves. The bridge hardcodes no model on purpose;
  // neither does this row.
  bridge: {
    label: 'Claude Code (on this machine)',
    baseUrl: 'http://127.0.0.1:8090/v1',
    defaultModel: 'default',
    format: 'openai',
    modelDiscovery: 'openai',
    noKey: true
  },
  // ── The bridge's other two backends (2026-08-19) — SCAFFOLDING ─────────
  // The same bridge process, on the same port, behind a path PREFIX. That is
  // the whole mechanism, and it is the D94 law again: the OpenAI adapter
  // builds its endpoint as normalizeUrl(baseUrl) + '/chat/completions' and its
  // model list as baseUrl + '/models', so a backend is a different baseUrl and
  // NOTHING else. Not a query param (baseUrl gets a path appended AFTER any
  // query string, which would break it) and not a header (that would need
  // client code, which is the change being avoided).
  //
  // `modelDiscovery:'openai'` is load-bearing here for exactly the reason it is
  // on the bridge row above: listProviderModels falls back BY URL SHAPE when
  // the kind is empty, and that fallback reads any loopback base URL as Ollama.
  //
  // THE TWO ROWS ARE NOT IN THE SAME STATE, and each label says which.
  //
  // `bridgeCodex` is LIVE, proven end to end on 2026-08-19: a real request
  // through the real bridge to the real `codex` binary returned a
  // schema-conforming answer, one-shot and streaming. Its parser was written
  // from observed transcripts, which is where its three traps came from (the
  // CLI exits 0 on a FAILED turn; the user's config-pinned model 400s every
  // call without --ignore-user-config; warnings share the answer's frame type).
  //
  // THREE THINGS THE READER IS OWED before choosing it. (1) NO OUTPUT CEILING:
  // that CLI has no max-tokens lever, so the STAGE_BUDGETS row (D97) is
  // advisory on this door — stated to the model in words, enforced by nothing.
  // (2) The CLI prepends its own agent framing, measured at ~17.3k input tokens
  // on a call whose prompt was six words, and it is charged on every stage.
  // (3) It is LANDED, not PROVEN: no full book has been built through it.
  //
  // These three are OWED TO THE READER, not just to us, and since 2026-08-19
  // they are said out loud on the door: index.html's BRIDGE_BACKEND_UI carries
  // a `caveats` array for this backend that states them in plain words under
  // the Codex chip and above the Build button. This comment is the finding;
  // that array is the sentence a reader sees. When the CLI grows an output
  // ceiling or a truncation signal — or when a book finishes through it — both
  // move in the same change, or the door is telling someone a stale story.
  //
  // `bridgeGemini` is SCAFFOLDING. The bridge routes the prefix and answers
  // every request under it with a fatal, self-describing refusal naming the
  // blocker — no spawn, no partial success — because that CLI has no auth
  // configured here and a parser built from zero observed successes is how a
  // silently-wrong transport ships. The BACKENDS table in the bridge holds what
  // a follow-up wave owes; the label is what the person choosing sees.
  bridgeCodex: {
    label: 'Codex CLI (on this machine — no token ceiling)',
    baseUrl: 'http://127.0.0.1:8090/codex/v1',
    defaultModel: 'default',
    format: 'openai',
    modelDiscovery: 'openai',
    noKey: true
  },
  bridgeGemini: {
    label: 'Gemini CLI (on this machine — not implemented yet)',
    baseUrl: 'http://127.0.0.1:8090/gemini/v1',
    defaultModel: 'default',
    format: 'openai',
    modelDiscovery: 'openai',
    noKey: true
  },
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-pro',
    format: 'openai',
    modelDiscovery: 'gemini'
  },
  custom: {
    label: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    defaultModel: '',
    format: 'openai',
    modelDiscovery: 'openai'
  }
};

// ── Book-length + spend estimate (D135) ──────────────────────────────────────
// The pre-run answer to "how long is this book, and what will it cost me".
//
// SINGLE HOME, and the reason is the D97/D110 law read one surface out: a page
// count or a minute figure written as a literal in index.html is a number the
// reader cannot trace to the thing that produced it, and nobody ever moves it
// when the thing that produced it moves. Every figure the interface shows is
// derived from this row.
//
// pages = interceptPages + pagesPerWeek × weeks. Fitted across the W3 matrix
// (D135; r² = 0.984). `bandPages` is NOT a confidence interval — it is half the
// OBSERVED spread at IDENTICAL inputs (32–44 pages at six weeks), which is the
// estimator's honest ±: two runs of the same program on the same settings land
// that far apart, so the surface says "about" and shows a range.
//
// `recommendedMaxWeeks` is the ratified ceiling (D135): home-stapler
// bindability at the fitted slope. WARN, NEVER FORBID — a longer program is the
// user's to print, and `longReachWeeks` is where a long-reach stapler still
// closes the fold.
//
// `tokensPerWeek` is anchored to ONE measured book: "The Second Sky", a
// complete six-week booklet through the Code Bridge at 241,658 tokens with zero
// stage retries (D127) — 241658 / 6, rounded. One point fixes a slope through
// the origin and nothing else: the fixed cost of the plan-first stages cannot
// be separated from the per-week cost without a second measured length, so the
// interface says "roughly", names the one run it comes from, and shows no
// dollar figure at all. The measured total carries no input/output split, and
// inventing one to price it would be the prohibited lie (D96) — the money
// question is answered by the live meter, which has real usage, and by
// getCheckpointSpendToDate on a resume (D113).
export var PAGE_ESTIMATE = {
  interceptPages: 11.2,
  pagesPerWeek: 4.4,
  bandPages: 6,
  pagesPerSheet: 4,        // half-letter, saddle-stitched: two spreads a sheet
  recommendedMaxWeeks: 10,
  longReachWeeks: 13,
  tokensPerWeek: 40000,
  tokenAnchorWeeks: 6,
  tokenAnchorTotal: 241658
};

// ── Rate limiting & budget ───────────────────────────────────────────────────

export var BUDGET_KEY = 'liftrpg_api_daily_budget';
export var RATE_WINDOW_MS = 60000;   // 1 minute
export var RATE_MAX_CALLS = 5;       // 5 calls per minute (Gemini free tier)
export var DAILY_CALL_LIMIT = 20;    // Gemini free tier: 20 API calls/day

// ── Checkpointing ────────────────────────────────────────────────────────────

export var CHECKPOINT_STORAGE_KEY = 'liftrpg_pipeline_checkpoint';

// ── Schema enums ─────────────────────────────────────────────────────────────
// Single source of truth: contracts/contract-constants.mjs (synced to
// public/contracts/ by build:gold-disk). These re-exports keep existing import
// sites stable. NEVER define enum values here.

import {
  SCHEMA_VERSION,
  ACCEPTED_SCHEMA_VERSIONS,
  DOCUMENT_TYPE_ENUM,
  DOCUMENT_TYPE_ALIASES,
  VALID_MAP_TYPES,
  VALID_EDGE_SEMANTICS,
  VALID_CELL_SHAPES,
  VALID_COMPONENT_DIALECTS,
  DEFAULT_COMPONENT_DIALECT,
  SPATIAL_GUARDRAILS,
  VALID_COMPANION_TYPES,
  DEMOTED_COMPANION_TYPES,
  GENERATION_COMPANION_MENU,
  VALID_CLOCK_TYPES,
  VALID_ARCHETYPES,
  // The voice die's five menus (W3). Re-exported here for the same reason
  // every enum above is: the generator tree reads its vocabularies through
  // this module, and a consumer importing straight from contract-constants
  // would be a second door onto one source.
  VOICE_PERSON_REGIMES,
  VOICE_SENTENCE_REGIMES,
  VOICE_FRAGMENT_LICENSES,
  VOICE_PUNCTUATION_SIGNATURES,
  VOICE_PARAGRAPH_REGIMES,
  VOICE_RESTRAINT_POSITIONS,
  THEME_ARCHETYPE_ALIASES,
  ORACLE_ROLL_BANDS,
  VALID_PAYLOAD_TYPES as PAYLOAD_TYPE_LIST,
  VALID_SHELL_FAMILIES,
  VALID_BOARD_STATE_MODES,
  VALID_ATTACHMENT_STRATEGIES,
  PERCENTILE_STAT,
  VALID_WORKSPACE_STYLES,
  WORKSPACE_STYLE_ALIASES,
  DEFAULT_WORKSPACE_STYLE,
  MARK_STRIP,
  MARK_STRIP_TARGET_KINDS,
  RECKONING_SINK_KINDS,
  RECKONING_THRESHOLD_RATIO,
  OUTPUT_BUDGETS,
  PAGE_FILL_THIN_RATIO,
  LUDIC_LIBRARY,
  LUDIC_LIBRARY_ATOMS,
  VALID_DYNAMIC_MARKINGS,
  SPINE_BUDGETS,
  SURFACE_REF_KINDS,
  SURFACE_REF_SINGLETONS,
  parseSurfaceRef,
  VALID_GATE_STRUCTURES,
  GATE_STRUCTURE_SHAPES,
  VALID_LEGACY_MOVES,
  BRANCH_OPTIONS,
  BRANCH_REF_PATTERN,
  parseBranchRef,
  PIPELINE_DEBRIS_KEYS,
  readPipelineDebris,
  writePipelineDebris,
  // The two-source law's seam (VISION §11). The axis table and the draw live
  // in contract-constants because three consumers and two harnesses have to
  // agree about what the die said; these re-exports only keep the import sites
  // in this tree pointed at one path.
  IDENTITY_AXES,
  identityAxesForStage,
  drawSeedAssignments,
  readAxisValue,
  familyRefusesGeometry,
  // The ludic lens's own seam (D170). The arsenal split and the week schedule
  // live beside the axis table for the same reason: the prompt hands out what
  // the floor checks.
  LUDIC_STRUCTURAL_ENTRIES,
  LUDIC_DISCRETIONARY_ENTRIES,
  LUDIC_ARSENAL_ENTRIES,
  ludicArsenalWeekField,
  compositionDiscretionaryFloor,
  deriveLudicWeekAssignments
} from '../../contracts/contract-constants.mjs';

export {
  SCHEMA_VERSION,
  ACCEPTED_SCHEMA_VERSIONS,
  DOCUMENT_TYPE_ENUM,
  DOCUMENT_TYPE_ALIASES,
  VALID_MAP_TYPES,
  // Wave 3 map variant axes + the component dialect. Re-exported for the same
  // reason every other enum here is: one home, stable import sites.
  VALID_EDGE_SEMANTICS,
  VALID_CELL_SHAPES,
  VALID_COMPONENT_DIALECTS,
  DEFAULT_COMPONENT_DIALECT,
  SPATIAL_GUARDRAILS,
  // VALID_* is the schema's acceptance set; DEMOTED/MENU is the generation
  // axis. A menu narrowing (D122c) never touches acceptance — old books keep
  // validating and rendering. The menu is derived in contract-constants.mjs.
  VALID_COMPANION_TYPES,
  DEMOTED_COMPANION_TYPES,
  GENERATION_COMPANION_MENU,
  VALID_CLOCK_TYPES,
  VALID_ARCHETYPES,
  // The voice die's five menus (W3). Re-exported here for the same reason
  // every enum above is: the generator tree reads its vocabularies through
  // this module, and a consumer importing straight from contract-constants
  // would be a second door onto one source.
  VOICE_PERSON_REGIMES,
  VOICE_SENTENCE_REGIMES,
  VOICE_FRAGMENT_LICENSES,
  VOICE_PUNCTUATION_SIGNATURES,
  VOICE_PARAGRAPH_REGIMES,
  VOICE_RESTRAINT_POSITIONS,
  THEME_ARCHETYPE_ALIASES,
  ORACLE_ROLL_BANDS,
  VALID_SHELL_FAMILIES,
  VALID_BOARD_STATE_MODES,
  VALID_ATTACHMENT_STRATEGIES,
  PERCENTILE_STAT,
  VALID_WORKSPACE_STYLES,
  WORKSPACE_STYLE_ALIASES,
  DEFAULT_WORKSPACE_STYLE,
  // Mark economy (Session 1 / D89) — markStrip shape, machine-only target
  // kinds, Reckoning sink vocabulary, derived-threshold ratio.
  MARK_STRIP,
  MARK_STRIP_TARGET_KINDS,
  RECKONING_SINK_KINDS,
  RECKONING_THRESHOLD_RATIO,
  // Prose caps (Teeth Round T1a). Hoisted to contract-constants when breaches
  // became stage-blocking: api-generator.js reads them through here to stamp
  // maxLength onto the structured schemas the compat transports enforce.
  OUTPUT_BUDGETS,
  // The report-class lens over those caps (the depth wave): quality.js is the
  // only reader, and it warns rather than scoring.
  PAGE_FILL_THIN_RATIO,
  // ── The Ludic Spine (W4a) ──────────────────────────────────────────────
  // The play vocabulary and its one ref grammar. Re-exported, never
  // re-declared: parseSurfaceRef has a single home (D93) and the floors, the
  // prompt-parity pass, and the W4b simulated player all reach it through
  // this seam.
  LUDIC_LIBRARY,
  LUDIC_LIBRARY_ATOMS,
  VALID_DYNAMIC_MARKINGS,
  SPINE_BUDGETS,
  SURFACE_REF_KINDS,
  SURFACE_REF_SINGLETONS,
  parseSurfaceRef,
  // ── The Ludic Harvest, tranche 1 (W5a) ────────────────────────────────
  // The tier-2 patterns that landed a declaration surface. Same seam, same
  // rule: parseBranchRef has one home beside parseSurfaceRef, because a
  // second branch parser is a second answer to "which side is this".
  VALID_GATE_STRUCTURES,
  GATE_STRUCTURE_SHAPES,
  VALID_LEGACY_MOVES,
  BRANCH_OPTIONS,
  BRANCH_REF_PATTERN,
  parseBranchRef,
  // ── Pipeline debris (D128) ─────────────────────────────────────────────
  // `_x` is the only lawful home for non-contract data and always was; the
  // pipelines wrote ten keys at top level anyway, where the schema rejects
  // every one. write/read are the seam that makes the move total.
  PIPELINE_DEBRIS_KEYS,
  readPipelineDebris,
  writePipelineDebris,
  // ── The two-source law (VISION §11) ────────────────────────────────────
  // Every identity choice is brief-funded or seed-assigned; anything else is a
  // default, and defaults are findings. The axes, the draw and the geometry
  // exemption are ONE home — the prompt hands out what the floor checks and
  // what the referee classifies, so a second copy would let the three drift
  // into demanding a value nobody was ever given.
  IDENTITY_AXES,
  identityAxesForStage,
  drawSeedAssignments,
  readAxisValue,
  familyRefusesGeometry,
  LUDIC_STRUCTURAL_ENTRIES,
  LUDIC_DISCRETIONARY_ENTRIES,
  LUDIC_ARSENAL_ENTRIES,
  ludicArsenalWeekField,
  compositionDiscretionaryFloor,
  deriveLudicWeekAssignments
};

export var SUPPORTED_THEME_ARCHETYPES = VALID_ARCHETYPES.reduce(function (acc, name) {
  acc[name] = true;
  return acc;
}, {});

// Legacy object-map shape retained for existing call sites.
export var VALID_PAYLOAD_TYPES = PAYLOAD_TYPE_LIST.reduce(function (acc, name) {
  acc[name] = 1;
  return acc;
}, {});

// ── Composition critic loop (the conductor's ears) ──────────────────────────
// The critic grades the ASSEMBLED booklet on the compositional commitments
// prompt_rules.js already demands, then drives targeted unit revisions until
// every dimension clears the threshold or the round cap is hit (D66).
// Dimension ids must match the rubric in prompt_rules.js buildCriticPrompt
// (generator tests assert the parity).
export var CRITIC_SCORE_THRESHOLD = 90;
export var CRITIC_MAX_ROUNDS = 3;
export var CRITIC_MAX_REVISIONS_PER_ROUND = 6;
export var CRITIC_DIMENSIONS = [
  { id: 'arcIntegrity', name: 'Arc Integrity' },
  { id: 'systemIntegration', name: 'System Integration' },
  { id: 'clueEconomy', name: 'Clue Economy & Mystery' },
  { id: 'motifPayoff', name: 'Motif Payoff' },
  { id: 'worldCohesion', name: 'World Cohesion' },
  { id: 'briefFidelity', name: 'Brief Fidelity & Register' },
  { id: 'fusionPacing', name: 'Fusion & Pacing' },
  // Voice discipline (docs/voice/VOICE.md): the critic is the audit seat for
  // the prose laws no regex can reach — multi-hand distinctness, terminal
  // position, unlicensed genre moves. The B-class tic scan feeds it facts.
  { id: 'voiceDiscipline', name: 'Voice Discipline' },

  // ── THE GAMEPLAY-EXCELLENCE AXES (2026-08-19) ────────────────────────────
  // WHY THREE MORE, when eight dimensions already grade the book.
  //
  // The EDPCG frame (Yannakakis & Togelius) names four components of a
  // generative pipeline: representation, generator, quality-evaluation, and a
  // PLAYER-EXPERIENCE MODEL. This project has the first two and an unusually
  // heavy validity layer — schema, layout, closure floors, the sim walker's
  // soft-locks. What it has never had is a quality signal that references what
  // a READER should decide, feel, and notice, held apart from whether the book
  // is well-formed. Without that fourth component every "quality score"
  // re-derives validity, and Goodhart does the rest: technically clean books
  // that do not read as designed. That is the author's standing complaint, and
  // it is a missing component, not a missing sentence in an existing rubric.
  //
  // THE TEST EACH OF THESE MUST PASS, and the reason they are separate ids:
  // each must be able to score LOW on a book that passes every existing floor
  // cleanly. A dimension that can only fail what the validator already fails is
  // decoration. Stated per dimension in the rubric, and each one's flat case is
  // pinned in check-generation-floors.mjs.
  //
  // WHAT THEY ARE NOT. `systemIntegration` asks whether the parts REFERENCE
  // each other — a wiring question, answerable from the JSON graph, and it is
  // exactly the question the floors and the sim walker already answer best.
  // These three ask the questions the graph cannot: whether a fork that is
  // correctly wired is a real DECISION, whether a mechanic correctly repeated
  // thirty times still asks anything by week six, and whether a shape that
  // validates against this brief would validate identically against any other.
  // A book can satisfy every arrow in the graph and fail all three.
  //
  // REPORT-AND-REVISE, never blocking (D19). They feed revision targeting the
  // same way the other eight do. VISION's own law — a green critic score is a
  // floor, not a success — applies to these hardest, because they are the ones
  // most tempting to teach the model to game.
  { id: 'decisionWeight', name: 'Decision Weight & Autonomy' },
  { id: 'masteryCurve', name: 'Mastery Curve & Attrition' },
  { id: 'authoredMechanism', name: 'Authored Mechanism (anti-template)' }
];

// ── Structural revision reach (Teeth T4 — the surgeon) ──────────────────────
// The three-tier fix loop is law: code derives (silent) -> stage retries
// correct (Correction Directive) -> the critic revises (grade->revise->regrade).
// Tier 3 used to be able to reword a unit and nothing else, so a finding whose
// cause was the unit's SHAPE could only ever retint sentences. It was
// commentary. A failure may now declare `scope: "structure"`, and name which
// aspects of the unit the reviser may RE-DECIDE, from this closed menu.
//
// The menu is deliberately the FUSION.md mechanism vocabulary (docs/craft/
// FUSION.md §4) rather than a list of schema fields: a reviser told "you may
// re-decide weeks[3].gameplayClocks[0].clockType" edits a field, while one told
// "the mechanical assignment is reopened" re-decides which surface carries the
// week's pressure. The constitution names the moves; the surgery uses its names.
//
// SINGLE HOME. modules/critic.js normalizes against these ids and prompt_rules.js
// states them to the model in TWO places — the failure contract (how to declare
// one) and the revision prompt (what re-deciding each one licenses). Generator
// tests assert the three surfaces agree, the same parity CRITIC_DIMENSIONS has.
export var STRUCTURAL_REOPEN_SCOPES = [
  { id: 'beat', name: 'the declared beat',
    licenses: 'what this unit is ABOUT may change — its position in the arc, what is at '
      + 'risk in it, what it converges or postpones' },
  { id: 'dynamics', name: 'the dynamic marking',
    licenses: 'how loudly this unit SPEAKS may change — its prose volume and register '
      + 'against the training load of its week, including cutting it shorter' },
  { id: 'motif', name: 'the motif carried',
    licenses: 'which recurring object, place, or phrase this unit carries may change, and '
      + 'what that object means at this point in the book' },
  { id: 'mechanism', name: 'the mechanical assignment',
    licenses: 'which printed surface carries this unit\'s pressure may change — what the '
      + 'clock, oracle, door, cipher, or strip is keyed to and what it answers' },
  // ── The ludic scopes (W4b) ───────────────────────────────────────────────
  // The first four are the FUSION vocabulary: they let a reviser re-decide what
  // a unit is and how it sounds. None of them can re-decide how the unit is
  // WIRED, and that is precisely the class of finding the simulated player
  // produces — a dead sink, a key that arrives too late, a week that asks
  // nothing. Routing a sim finding through `mechanism` would license "re-key
  // the clock" when the defect is "nothing reads the clock", which is a
  // different edit on a different object.
  //
  // Three, not one, for the same reason there are four above rather than one
  // "structure": the reviser is told what is open and everything else is
  // frozen, so a scope that meant "the play is reopened" would unfreeze the
  // whole unit on every finding.
  { id: 'economy', name: 'the economic wiring',
    licenses: 'where this unit\'s value flows may change — what its marks bank into, what its '
      + 'spend buys, and which surface downstream reads the result' },
  { id: 'gate', name: 'the gate and its key',
    licenses: 'what this unit locks and what opens it may change — which key the player must '
      + 'already hold, and how far ahead of the lock they can hold it' },
  { id: 'decision', name: 'the decision offered',
    licenses: 'what this unit asks the player to CHOOSE may change — whether it forks at all, '
      + 'and what mechanically differs across the branches' }
];

// ── The conductor's pass (FUSION.md §4 mechanism 6) ─────────────────────────
// "A dedicated post-draft read of ONLY the play-order sequence... auditing
// phrasing across the whole." The constitution has named this since it was
// written and nothing ran it: its material existed in the digest, and a general
// read passed over it every time — which is exactly what §4.6 predicts and what
// two real books measured (fusionPacing was the MINIMUM dimension in both).
//
// THIS IS THE VERDICT VOCABULARY, not a list of schema fields — the same choice
// STRUCTURAL_REOPEN_SCOPES made and for the same reason. A reader told "score
// the pacing" produces an impression; a reader told "name which of these nine
// relations you heard, and cite the weeks and the curves you read it from"
// produces a finding somebody can act on. Every id below is one of the six
// mechanisms as HEARD, or one of the two failures §4.6 names by name:
//
//   score / exhale         -> mechanism 1 (the fusion score; the deload law)
//   counterpoint / doubling-> mechanism 2 + §3 (the load-bearing law, both ways)
//   leitmotif              -> mechanism 3
//   echo                   -> mechanism 4
//   unnameable             -> mechanism 5
//   discord / flat         -> §4.6's two named failures
//
// Mechanism 6 is the pass itself and therefore cannot appear here: a reader
// whose verdict is "the conductor's pass" has named its own chair.
//
// SINGLE HOME, same as CRITIC_DIMENSIONS and STRUCTURAL_REOPEN_SCOPES:
// modules/conductor.js validates against these ids and prompt_rules.js states
// them to the model once (INST_CONDUCTOR). check-generation-floors.mjs asserts
// the mirror, because an id the pipeline accepts and the prompt never offers is
// a verdict nobody can return.
export var CONDUCTOR_MECHANISMS = [
  { id: 'score',
    reads: 'the week plays the beat and the dynamic marking it declared for itself' },
  { id: 'counterpoint',
    reads: 'what is at stake rises with the training load while the page speaks the other way' },
  { id: 'doubling',
    reads: 'both curves move together — unison, which is not harmony' },
  { id: 'discord',
    reads: 'a heavy week carrying an administrative beat, with nothing at risk in it' },
  { id: 'flat',
    reads: 'the book holds one dynamic for its whole length — every week mezzo-forte' },
  { id: 'exhale',
    reads: 'the lighter week carries content — the aftermath, the arriving document, the count taken' },
  { id: 'leitmotif',
    reads: 'a carried object means something different here than it did before the midpoint' },
  { id: 'echo',
    reads: 'a mechanical event and a story surface answer each other inside one week, both directions' },
  { id: 'unnameable',
    reads: 'what this world will not say is carried by a printed surface rather than a sentence' }
];

// At most three, and the number is the point. The conductor is a prioritizer,
// not a second critic: a read that returns nine findings has returned a list,
// and the loop it feeds revises CRITIC_MAX_REVISIONS_PER_ROUND units in a round
// under floors that can refuse any of them. Three prioritized findings is what
// one round can actually act on.
export var CONDUCTOR_MAX_FINDINGS = 3;

// ── Throttle backoff (provider-agnostic) ─────────────────────────────────────
// When a stage gets a "come back later" (429, 503, rate limit, overloaded),
// the pipeline waits before retrying. These values are provider-blind:
//
//   - The Retry-After header, when present, overrides everything below.
//     Every major provider (OpenAI, Anthropic, Google, HuggingFace) sends it.
//   - Without the header, exponential backoff: 1m → 2m → 4m → 8m → 10m.
//   - After THROTTLE_MAX_WAITS, the pipeline exits cleanly with checkpoint
//     intact. The user clicks Build to resume — zero re-spend.
//
// These are NOT the stage's retry attempts (maxAttempts: 2). A throttle wait
// does not consume an attempt. The two budgets are independent.
export var THROTTLE_INITIAL_DELAY_MS = 60000;      // 1 minute
export var THROTTLE_BACKOFF_MULTIPLIER = 2;        // double each wait
export var THROTTLE_MAX_DELAY_MS = 600000;         // 10 minute ceiling
export var THROTTLE_MAX_WAITS = 5;                 // ~25 min total before clean exit
