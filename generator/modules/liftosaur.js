/**
 * Liftosaur seam — workout input tiers (§11 Wave 5).
 *
 * Three tiers of workout input, all generation-time (D92: the RENDERER stays
 * offline; generation already reaches the network to talk to an LLM, and this
 * rides that same sanctioned exception):
 *
 *   Tier 1  pasted Liftoscript  → detected here, canonicalized by the model
 *                                 against the grammar summary in prompt_rules.js
 *   Tier 2  named program       → fetched from the public reference tier of
 *                                 Liftosaur's MCP endpoint, so the canonical
 *                                 builtin beats the model's memory of it
 *   Tier 3  freeform text       → untouched; the model builds it (as before)
 *
 * WHY A HAND-ROLLED FETCH AND NOT AN SDK. There is no npm package to vendor
 * (D92 requires vendored first-party bytes for runtime deps), and the upstream
 * source is AGPL-3.0 against this repo's MIT public tree — a license wall, not
 * an inconvenience. So nothing is extracted from their repo: this module speaks
 * the published wire protocol to the published endpoint and knows nothing else
 * about their implementation.
 *
 * WHAT IS FREE AND WHAT IS NOT. Only the reference tier is unauthenticated
 * (list_builtin_programs, get_builtin_program, list_exercises,
 * get_liftoscript_reference, and their siblings). Everything that would
 * actually VALIDATE a program — create_program, run_playground, the REST API —
 * is gated behind a premium key. There is no free validation path, so tier 1
 * canonicalization is a model reading against a grammar, never a parse. This
 * module does not pretend otherwise, and neither should any message built on it.
 *
 * PURITY SPLIT: everything above the network section is pure — no fetch, no
 * clock, no DOM — so Node can import and unit-test detection and shaping
 * without touching the wire. The module has no top-level side effects beyond
 * the guarded `window` registration at the bottom.
 */

// ── Tier 1: detection ───────────────────────────────────────────────────────
//
// Detection ROUTES; it never transforms. A false positive costs a
// canonicalization pass over text that was never Liftoscript — which is the
// expensive mistake, because the model is then asked to read plain English as
// a formal grammar and will find structure that is not there. So the predicate
// demands corroboration: a week header ALONE is not evidence (plenty of
// freeform programs write "Week 1:"), and a lone `3x8` is not either.
//
// Grammar facts verified against the official reference (liftosaur.com/docs/
// liftoscript, 2026-08-11), not from memory:
//   `# Week 1` / `## Day 1`         headers
//   `Bench Press, Dumbbell / 3x5`   exercise line: name[, equipment] / sets x reps
//   `1x5+ @8+`                      trailing `+` on reps is AMRAP
//   `Squat / ...Bench Press[2:1]`   reuse, optionally qualified [week:day]
//   `Bench Press[1-5] / 3x8`        week range rides the exercise NAME
//   `progress: lp(...)`             lp / dp / sum / custom(...){~ ~}
//   `//` shown to the user, `///` not
// CORRECTED AGAINST REAL PROGRAMS (2026-08-11), not against the doc's tidy
// examples. Two of these were wrong on first draft, and the live fetch of
// `basicBeginner` is what proved it:
//   - Day headers are NOT always `## Day 1`. That program uses `## Workout A`.
//     Any level-2 header is a day header inside a Liftoscript block, so the
//     match widened; the two-marker rule is what keeps prose from qualifying.
//   - Exercise lines may carry MORE `/`-separated segments before the sets, as
//     in `main / used: none / 2x5, 1x5+`. Requiring the sets to follow the
//     FIRST slash rejected a real line from the most-recommended beginner
//     program in the catalogue.
const WEEK_HEADER = /^\s*#\s*week\s+\d+/im;
const DAY_HEADER = /^\s*##\s+\S/m;
const EXERCISE_LINE = /^[^\n]*\/\s*\d+\s*x\s*\d+/im;
const PROGRESS_LINE = /^\s*progress:\s*(lp|dp|sum|custom)\s*\(/im;
const REUSE_LINE = /\/\s*\.\.\./;

/**
 * Does this input look like Liftoscript?
 *
 * Two independent markers required. `# Week` is the strongest single signal but
 * still not sufficient alone — the corroborating marker is what separates a
 * Liftoscript block from prose that happens to number its weeks.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikeLiftoscript(text) {
  const source = String(text || '');
  if (!source.trim()) return false;

  let markers = 0;
  if (WEEK_HEADER.test(source)) markers++;
  if (DAY_HEADER.test(source)) markers++;
  if (EXERCISE_LINE.test(source)) markers++;
  if (PROGRESS_LINE.test(source)) markers++;
  if (REUSE_LINE.test(source)) markers++;

  return markers >= 2;
}

// ── Tier 1: canonical shape ─────────────────────────────────────────────────

/**
 * A rep target this seam is willing to pass on, or null to drop it.
 *
 * CROSS-FILE CONTRACT — the authority is `isPrintableRepTarget()` in
 * generator/modules/validation.js, which decides what a rep box may legally
 * print. This is deliberately a SUBSET of it: a producer may be stricter than
 * the gate, never looser. It is duplicated rather than imported because this
 * module's purity (no imports, Node-testable in isolation) is load-bearing and
 * validation.js drags in constants.js + assembly.js. The pair is pinned by
 * scripts/check-generation-floors.mjs §12, which runs one shared case table
 * through BOTH implementations and fails if they disagree on the nonsense class.
 *
 * WHY DROP RATHER THAN STRINGIFY. This used to be
 * `if (x != null) entry.repsPerSet = String(x).trim()`, which laundered a
 * model's `-1` or `0` into the STRING "-1"/"0" — truthy, and therefore immune
 * to every `|| '5'` fallback between here and the page. The canonical-workout
 * wire schema types repsPerSet as `string` (SCHEMA_CANONICAL_WORKOUT in
 * prompt_rules.js), so the sentinel arrives pre-stringified in the likely case
 * and the old guard could not have seen it at all. Dropping mirrors the `sets`
 * guard directly above: the value is absent, assembly.js fills its placeholder
 * and raises the `exercise-fields-defaulted` diagnostic, and the operator gets
 * a printed "5" with a warning instead of a printed "-1" with silence. It also
 * keeps the sentinel out of formatNormalizedForPrompt(), which would otherwise
 * teach the model "Chin-ups 3x-1" as the program it must transcribe.
 *
 * @param {*} value
 * @returns {string|null} the trimmed target, or null when nothing printable
 */
function printableRepTarget(value) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  if (typeof value === 'object') return null;
  // Numbers are judged as numbers, never via their spelling: String(Infinity)
  // is "Infinity", which no numeric test below would catch.
  if (typeof value === 'number') return (isFinite(value) && value > 0) ? String(value) : null;
  const text = String(value).trim();
  if (!text) return null;
  // Slash forms print as one target per set, so each segment is judged on its
  // own — "5/-1/5" is a sentinel in box two wearing a legal-looking string.
  const parts = text.indexOf('/') === -1 ? [text] : text.split('/');
  let printable = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;                 // the renderer drops empty segments
    const lowered = part.toLowerCase();
    if (lowered === 'null' || lowered === 'undefined' || lowered === 'nan') return null;
    // Bare number only — "6+", "0-5" and "45s" are written targets, not numbers.
    if (/^[+-]?\d+(?:\.\d+)?$/.test(part) && Number(part) <= 0) return null;
    printable++;
  }
  return printable > 0 ? text : null;
}

/**
 * Shape a canonicalization stage's output into the normalized workout object
 * the pipeline already knows how to consume.
 *
 * THIS IS THE RICH BRANCH'S FIRST REAL PRODUCER. `normalizeWorkoutParam()` has
 * always had two branches — pass an object through, or wrap a string with
 * `weeks: []` — and until now nothing in the shipping product ever produced the
 * object. Every consumer downstream (formatNormalizedForPrompt, the topology
 * digest's weeksFromNormalized source, totalSessions) has been reading the
 * empty branch. The key names below are therefore not free: they are the names
 * those consumers already read, and renaming one silently returns the rich
 * branch to being decorative.
 *
 * `rawText` is deliberately the USER'S ORIGINAL, not a re-serialization. It is
 * what the checkpoint fingerprint hashes (run identity is what the user gave,
 * never what canonicalization made of it), and it is the fallback prompt text
 * if the weeks come back empty.
 *
 * @param {string} rawText   the user's original input, verbatim
 * @param {object} output    the canonicalization stage's parsed JSON
 * @returns {object|null}    normalized workout, or null when nothing usable came back
 */
export function normalizeCanonicalWorkout(rawText, output) {
  if (!output || typeof output !== 'object') return null;

  const weeksIn = Array.isArray(output.weeks) ? output.weeks : [];
  const weeks = [];
  let totalExercises = 0;
  let maxSessions = 0;

  for (let i = 0; i < weeksIn.length; i++) {
    const week = weeksIn[i] || {};
    const sessionsIn = Array.isArray(week.sessions) ? week.sessions : [];
    const sessions = [];

    for (let s = 0; s < sessionsIn.length; s++) {
      const session = sessionsIn[s] || {};
      const exercisesIn = Array.isArray(session.exercises) ? session.exercises : [];
      const exercises = [];

      for (let e = 0; e < exercisesIn.length; e++) {
        const exercise = exercisesIn[e] || {};
        const name = String(exercise.name || '').trim();
        if (!name) continue;               // a nameless exercise is not fidelity, it is noise
        const entry = { name: name };
        const sets = parseInt(exercise.sets, 10);
        if (isFinite(sets) && sets > 0) entry.sets = sets;
        const reps = printableRepTarget(exercise.repsPerSet);
        if (reps !== null) entry.repsPerSet = reps;
        if (exercise.weightField) entry.weightField = String(exercise.weightField).trim();
        if (exercise.notes) entry.notes = String(exercise.notes).trim();
        exercises.push(entry);
      }

      if (!exercises.length) continue;     // a session with no work is not a session
      totalExercises += exercises.length;
      const shaped = { exercises: exercises };
      if (session.dayLabel) shaped.dayLabel = String(session.dayLabel).trim();
      if (session.notes) shaped.notes = String(session.notes).trim();
      sessions.push(shaped);
    }

    if (!sessions.length) continue;
    if (sessions.length > maxSessions) maxSessions = sessions.length;
    const weekNumber = parseInt(week.weekNumber, 10);
    weeks.push({
      weekNumber: isFinite(weekNumber) && weekNumber > 0 ? weekNumber : (weeks.length + 1),
      isDeload: !!week.isDeload,
      sessions: sessions
    });
  }

  // Nothing usable came back. Returning null rather than an empty-weeks object
  // is the honest answer: it sends the caller back to the raw branch it already
  // handles, instead of handing it a rich object that is rich in name only.
  if (!weeks.length) return null;

  return {
    source: 'liftoscript',
    rawText: String(rawText || ''),
    weekCount: weeks.length,
    weeks: weeks,
    summary: {
      sessionsPerWeek: maxSessions,
      totalExercises: totalExercises,
      progression: String(output.progressionSummary || '').trim()
    }
  };
}

// ── Week-count ownership: the template is a pattern, not a book length ──────
//
// THE DEFECT THIS CLOSES (W3, 2026-08-13). The Liftosaur builtin `gzclp` is a
// ONE-WEEK, FOUR-DAY rotating template with autoregulated stage progression —
// verified on the live wire: weekHeaders=1, dayHeaders=4. The canonicalize
// stage is told "transcribe only", so it correctly returns `weeks.length === 1`,
// and `normalizeCanonicalWorkout` correctly reports `weekCount: 1`. The
// pipeline then took that number as the BOOK'S length and shipped a one-week
// booklet for a program the lifter will run for months. Nothing threw. The eval
// matrix had to hand-expand the program to get a fixed-length book at all
// (evals/w3-matrix/build-workouts.mjs states the workaround in its header).
//
// THE RULING. The user's requested week count owns book length. A template
// shorter than the request REPEATS to fill it, because that is what a rotating
// template IS — a week pattern plus a rule for continuing. Applying the
// program's own `progress:` semantics across N weeks is TRANSCRIPTION; it is
// the same act as transcribing the first week. Inventing exercises, loads, a
// volume ramp, or a deload the program never declared would be IMPROVEMENT, and
// that stays forbidden (docs/craft/WORKOUT.md; D107's whole point).
//
// THE ASYMMETRY IS DELIBERATE. A template LONGER than the request is left
// alone: those weeks are written program, not a repeating pattern, and dropping
// them would discard training the user's own file contains. So this function
// only ever extends, never truncates — the same shape as faceDelta()'s clamp in
// type-metrics.js, and for the same reason: move in the direction that can be
// defended from the data, and stand still in the direction that cannot.
//
// HONESTY WHEN THERE IS NOTHING TO APPLY. A template with no stated progression
// at all cannot be extended by any rule; the only honest extension is literal
// repetition, and `note.warning` says so in words the operator reads. Never a
// silent one-week book, and never a silent invented ramp.
//
// D117 MIRROR: every exercise entry copied here was already shaped (and
// rep-target filtered) by normalizeCanonicalWorkout above. Extension copies;
// it never constructs. The producer therefore stays stricter-than-the-validator
// by construction, with no second copy of printableRepTarget to drift.

/** Plain-JSON deep copy. The shaped week objects are JSON by construction
 *  (normalizeCanonicalWorkout builds them from primitives), and aliasing them
 *  across weeks would let one later mutation edit several weeks at once. */
function cloneWeekBody(week) {
  return JSON.parse(JSON.stringify(week));
}

/**
 * Does this program state how it continues past the weeks it wrote out?
 *
 * Two independent signals, either of which is enough: the canonicalization
 * stage's own `progressionSummary`, and a Liftoscript `progress:` line in the
 * user's original text. The second is checked because the summary is model
 * prose and may come back empty on a program whose script plainly carries the
 * rule.
 *
 * @param {object} nw normalized workout (normalizeCanonicalWorkout output)
 * @returns {boolean}
 */
export function statesProgression(nw) {
  if (!nw || typeof nw !== 'object') return false;
  const summary = String((nw.summary && nw.summary.progression) || '').trim();
  if (summary) return true;
  return PROGRESS_LINE.test(String(nw.rawText || ''));
}

/**
 * Extend a canonical workout to the requested book length by cycling its weeks.
 *
 * @param {object} nw              normalizeCanonicalWorkout output (or null)
 * @param {number} requestedWeeks  the week count the user's input asked for
 * @returns {{nw: object|null, extended: boolean, note: object|null}}
 *   `nw`       the workout to use downstream — the input object untouched when
 *              no extension was needed, a new object when it was.
 *   `extended` whether cycling happened.
 *   `note`     operator-facing record: template length, book length, whether
 *              the program stated a progression, and the warning text when it
 *              did not. Null when nothing happened.
 */
export function extendCanonicalWorkout(nw, requestedWeeks) {
  const unchanged = { nw: nw || null, extended: false, note: null };
  if (!nw || typeof nw !== 'object') return unchanged;

  const weeks = Array.isArray(nw.weeks) ? nw.weeks : [];
  const template = weeks.length;
  const wanted = Math.floor(Number(requestedWeeks));
  if (!template || !isFinite(wanted) || wanted <= template) return unchanged;

  const progression = statesProgression(nw);
  const out = [];
  for (let i = 0; i < wanted; i++) {
    const source = weeks[i % template];
    const week = cloneWeekBody(source);
    week.weekNumber = i + 1;
    if (i >= template) {
      // The provenance of a repeated week, carried as data rather than as
      // prose, so the prompt formatter can state it and the checkpoint can
      // show it. `cycleOf` is a 1-based week number in the ORIGINAL template.
      week.cycleOf = (i % template) + 1;
    }
    out.push(week);
  }

  let totalExercises = 0;
  let maxSessions = 0;
  out.forEach(function (week) {
    const sessions = week.sessions || [];
    if (sessions.length > maxSessions) maxSessions = sessions.length;
    sessions.forEach(function (session) {
      totalExercises += ((session && session.exercises) || []).length;
    });
  });

  const extendedNw = {
    source: nw.source,
    rawText: nw.rawText,
    weekCount: wanted,
    weeks: out,
    summary: {
      sessionsPerWeek: maxSessions,
      totalExercises: totalExercises,
      progression: String((nw.summary && nw.summary.progression) || '')
    }
  };

  return {
    nw: extendedNw,
    extended: true,
    note: {
      templateWeeks: template,
      bookWeeks: wanted,
      progressionStated: progression,
      warning: progression ? '' : (
        'The program is a ' + template + '-week template that states no progression rule, '
        + 'so weeks ' + (template + 1) + '-' + wanted + ' repeat it exactly as written. '
        + 'Nothing has been added to the training.'
      )
    }
  };
}

// ── Tier 2: the public reference tier ───────────────────────────────────────

export const LIFTOSAUR_MCP_ENDPOINT = 'https://www.liftosaur.com/mcp';

/**
 * The one message the operator sees when lookup cannot happen (D96/D99 family).
 *
 * D92's motivating case — a restricted or offline network — is exactly when
 * this fires, so it must never read as a bug. It says what did not happen and
 * what will happen instead, and it does NOT silently fall back: a program the
 * model reconstructed from memory and a program fetched from source are
 * different objects, and the operator is the one entitled to know which they got.
 */
export const PROGRAM_LOOKUP_UNAVAILABLE =
  'Program lookup unavailable on this network — your pasted text will be interpreted as written.';

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * One JSON-RPC call against the MCP endpoint.
 *
 * TRANSPORT NOTES, and an honest statement of what is UNVERIFIED. The endpoint
 * is documented as MCP "Streamable HTTP". Two consequences follow, and this
 * repo has confirmed neither against the live server (the build sandbox denies
 * egress; see the env-gated test):
 *
 *   1. INITIALIZE. The MCP spec has clients open with an `initialize` handshake.
 *      Source reading suggested this handler dispatches reference tools before
 *      any such check, i.e. stateless. Rather than bet on either reading, this
 *      tries the direct call first and performs the handshake only if the
 *      server complains — correct under both, one extra round-trip under one.
 *   2. RESPONSE FRAMING. Streamable HTTP may answer with `application/json` OR
 *      an SSE stream. Both are parsed below. Assuming JSON alone would fail
 *      against a server that is behaving correctly.
 *
 * @param {string} name    tool name (reference tier only unless `apiKey` is given)
 * @param {object} args    tool arguments
 * @param {object} [opts]  { apiKey, timeoutMs, fetchImpl, endpoint }
 * @returns {Promise<object>} the tool result payload
 */
export async function callMcpTool(name, args, opts) {
  const options = opts || {};
  const endpoint = options.endpoint || LIFTOSAUR_MCP_ENDPOINT;
  const doFetch = options.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) throw lookupError('No fetch implementation available in this environment.');

  const headers = {
    'content-type': 'application/json',
    // Both framings declared, because we accept both. See TRANSPORT NOTES.
    accept: 'application/json, text/event-stream'
  };
  if (options.apiKey) headers.authorization = 'Bearer ' + options.apiKey;

  const call = async (sessionId) => {
    const sent = Object.assign({}, headers);
    if (sessionId) sent['mcp-session-id'] = sessionId;
    return postRpc(doFetch, endpoint, sent, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: name, arguments: args || {} }
    }, options.timeoutMs || DEFAULT_TIMEOUT_MS);
  };

  let response = await call(null);
  if (response.needsInitialize) {
    const sessionId = await initializeSession(doFetch, endpoint, headers, options.timeoutMs || DEFAULT_TIMEOUT_MS);
    response = await call(sessionId);
  }
  if (response.error) throw lookupError(response.error);
  return response.result;
}

/** The MCP opening handshake. Returns a session id when the server issues one. */
async function initializeSession(doFetch, endpoint, headers, timeoutMs) {
  const response = await postRpc(doFetch, endpoint, headers, {
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'liftrpg', version: '1' }
    }
  }, timeoutMs);
  if (response.error) throw lookupError(response.error);
  return response.sessionId || null;
}

async function postRpc(doFetch, endpoint, headers, body, timeoutMs) {
  // AbortController is the only timeout fetch honors. Without it a hung
  // connection on a captive-portal network stalls the whole run at stage one,
  // which is the worst possible place for this feature to hang.
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller && typeof setTimeout === 'function'
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  let raw;
  let status;
  let sessionId = null;
  try {
    const response = await doFetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
      signal: controller ? controller.signal : undefined
    });
    status = response.status;
    sessionId = response.headers && typeof response.headers.get === 'function'
      ? response.headers.get('mcp-session-id')
      : null;
    raw = await response.text();
  } catch (error) {
    throw lookupError((error && error.message) || 'network request failed');
  } finally {
    if (timer) clearTimeout(timer);
  }

  const message = parseRpcBody(raw);
  if (!message) {
    return { error: 'unreadable response from the program service (HTTP ' + status + ')' };
  }
  if (message.error) {
    const text = String((message.error && message.error.message) || '');
    // The server told us the direct call was not welcome without a handshake.
    // Matching on meaning rather than on a code, because the exact code this
    // server uses is one of the things not yet verified against the live wire.
    if (/initiali[sz]|session/i.test(text)) return { needsInitialize: true };
    return { error: text || 'the program service refused the request' };
  }
  return { result: unwrapToolResult(message.result), sessionId: sessionId };
}

/** Accepts either a plain JSON-RPC body or an SSE stream carrying one. */
function parseRpcBody(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;

  const direct = tryParse(text);
  if (direct) return direct;

  // SSE: one or more `data:` lines; the last complete JSON payload wins.
  let found = null;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.indexOf('data:') !== 0) continue;
    const parsed = tryParse(line.slice(5).trim());
    if (parsed) found = parsed;
  }
  return found;
}

function tryParse(text) {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? value : null;
  } catch (_error) {
    return null;
  }
}

/**
 * MCP tool results arrive as a `content` array of typed parts. The reference
 * tools answer with JSON encoded into a text part, so the useful payload is one
 * level further in than `result`. `structuredContent`, when the server sends
 * it, is the same data already decoded.
 */
function unwrapToolResult(result) {
  if (!result || typeof result !== 'object') return result;
  if (result.structuredContent) return result.structuredContent;

  const content = Array.isArray(result.content) ? result.content : null;
  if (!content) return result;

  for (let i = 0; i < content.length; i++) {
    const part = content[i];
    if (!part || part.type !== 'text' || typeof part.text !== 'string') continue;
    const decoded = tryParse(part.text);
    if (decoded) return decoded;
    return part.text;
  }
  return result;
}

function lookupError(detail) {
  const error = new Error(PROGRAM_LOOKUP_UNAVAILABLE);
  error.name = 'LiftosaurLookupError';
  error.detail = String(detail || '');
  return error;
}

/**
 * Tier 2: the catalogue of built-in programs. Reference tier — no key.
 * @param {object} [opts] see callMcpTool
 */
export function listBuiltinPrograms(opts) {
  return callMcpTool('list_builtin_programs', {}, opts);
}

/**
 * Parse the builtin catalogue into `{ id, name }` entries.
 *
 * THE WIRE FORMAT IS PLAIN TEXT, verified against the live endpoint
 * (2026-08-11, see the env-gated test): the reference tier answers with a
 * `content[].text` part whose body is newline-delimited `id: Display Name`,
 * NOT a JSON array. The first draft of this module assumed JSON and would have
 * shipped a lookup button that always reported "unavailable" — the shape is
 * pinned by test now precisely because reading it wrong fails silently.
 *
 * The JSON branches below are kept as a courtesy to a future server that
 * decides to send structured data; they cost four lines and remove a whole
 * class of breakage.
 */
export function parseProgramList(payload) {
  var text = typeof payload === 'string'
    ? payload
    : (payload && typeof payload.text === 'string' ? payload.text : null);

  if (text === null) {
    var list = Array.isArray(payload) ? payload
      : (payload && Array.isArray(payload.programs)) ? payload.programs : null;
    if (!list) return [];
    var structured = [];
    for (var j = 0; j < list.length; j++) {
      var entry = list[j];
      if (typeof entry === 'string') { structured.push({ id: entry, name: entry }); continue; }
      if (!entry || typeof entry !== 'object') continue;
      var key = entry.id || entry.key || entry.slug || entry.name;
      if (!key) continue;
      structured.push({ id: String(key), name: String(entry.name || entry.title || key) });
    }
    return structured;
  }

  var out = [];
  var lines = text.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var split = line.indexOf(':');
    // A line with no colon is a heading or a note, not a program.
    if (split <= 0) continue;
    var id = line.slice(0, split).trim();
    var name = line.slice(split + 1).trim();
    if (!id || /\s/.test(id)) continue;      // ids are single tokens
    out.push({ id: id, name: name || id });
  }
  return out;
}

/**
 * Pull the program text out of a fetched program payload.
 *
 * Preferring the longest plausible string is deliberate: a program payload may
 * carry a one-line description beside the actual script, and the script is
 * always the bigger of the two. A bare string payload is returned as-is, which
 * is what the text-part wire format produces.
 */
export function extractProgramScript(payload) {
  var raw = '';
  if (typeof payload === 'string') {
    raw = payload;
  } else if (payload && typeof payload === 'object') {
    var keys = ['liftoscript', 'script', 'text', 'program', 'source', 'body'];
    for (var i = 0; i < keys.length; i++) {
      var value = payload[keys[i]];
      if (typeof value === 'string' && value.length > raw.length) raw = value;
    }
  }
  if (!raw) return '';

  // THE PAYLOAD IS AN ARTICLE, NOT A SCRIPT — verified on the live wire.
  // `get_builtin_program` answers with a markdown document: YAML frontmatter,
  // several thousand words of philosophy and coaching notes, and ONE fenced
  // ```liftoscript block carrying the actual program. Handing the whole
  // document to the workout field would paste an essay into it and send the
  // essay to the model as the training plan.
  var fenced = raw.match(/```liftoscript\s*\n([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

  // Any single fenced block is the next best guess — a program page with one
  // code block is showing you the program.
  var blocks = raw.match(/```[a-zA-Z]*\s*\n[\s\S]*?```/g) || [];
  if (blocks.length === 1) {
    return blocks[0].replace(/^```[a-zA-Z]*\s*\n/, '').replace(/```$/, '').trim();
  }

  // No fences at all: the payload really is the program.
  if (!blocks.length && raw.indexOf('```') === -1) return raw.trim();

  // Ambiguous — several code blocks and no language tag to choose between
  // them. Returning nothing routes the caller to the honest "unavailable"
  // message rather than pasting the wrong block into the workout field.
  return '';
}

/**
 * Tier 2: one built-in program, canonical. Reference tier — no key.
 * @param {string} id
 * @param {object} [opts] see callMcpTool
 */
export function getBuiltinProgram(id, opts) {
  return callMcpTool('get_builtin_program', { id: String(id || '') }, opts);
}

// Classic-IIFE consumers (index.html's inline handlers, generator.js) cannot
// import. Guarded so Node imports stay side-effect free.
if (typeof window !== 'undefined') {
  window.looksLikeLiftoscript = looksLikeLiftoscript;
  window.liftosaurExtendCanonicalWorkout = extendCanonicalWorkout;
  window.liftosaurStatesProgression = statesProgression;
  window.liftosaurListBuiltinPrograms = listBuiltinPrograms;
  window.liftosaurGetBuiltinProgram = getBuiltinProgram;
  window.liftosaurParseProgramList = parseProgramList;
  window.liftosaurExtractProgramScript = extractProgramScript;
  window.LIFTOSAUR_LOOKUP_UNAVAILABLE = PROGRAM_LOOKUP_UNAVAILABLE;
}
