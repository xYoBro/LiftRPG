// ── Error classification for the API generation pipeline ─────────────────────
// Extracted from api-generator.js (lines 3808–3887).
// Pure string-matching predicates — no external dependencies.
// Used by runJsonStage to decide: retry, split, fallback from structured output.

// ── THE NARROW, LOUD HATCH (D162's recorded-open, closed here) ───────────────
//
// This predicate decides whether a structured stage may DEGRADE to freeform
// text plus repair.js extraction. That degradation is correct for exactly one
// situation — an endpoint that genuinely refuses to force a schema — and is the
// D159 failure mode for every other: a freeform stage under token pressure
// answers by dropping a whole required section, which is what D162 made
// structurally impossible by forcing the shape on the wire.
//
// The predicate used to match the BARE words "unsupported" and "not supported"
// anywhere in a provider message. Every schema-validation 400 phrased that way
// — "unsupported keyword", "unsupported content block type", "value is not
// supported" — therefore re-opened the exact door D162 closed, silently, on the
// paid path. It matched "unknown parameter" and "invalid parameter" the same
// way, for any parameter at all.
//
// So the match is now CONJUNCTIVE: a refusal word AND a subject that means
// structured output or tool forcing. A subject term that is already unambiguous
// on its own (`response_format`, `json_schema`) still needs the refusal word —
// "response_format.schema is invalid" is our bug, not the endpoint's refusal.
//
// The reason is RETURNED rather than discarded, because the degradation has to
// announce itself: callProviderStructured carries it onto the response, and the
// stage runner turns it into a pipeline event and a run-report line naming the
// stage and the provider's own words. Fail loudly, never silently substitute.
var STRUCTURED_REFUSAL_WORDS = [
  'unsupported',
  'not supported',
  'does not support',
  "doesn't support",
  'no support for',
  'unknown parameter',
  'unrecognized parameter',
  'invalid parameter'
];

// Subjects that mean "the schema-forcing mechanism itself". Deliberately NOT
// bare `tools`: a rejected keyword inside our own tool schema arrives as
// "tools.0.input_schema: unsupported keyword", which is a contract defect to
// fix, not an endpoint that cannot force. The whole-phrase forms below catch a
// real refusal of tool use without catching that.
var STRUCTURED_REFUSAL_SUBJECTS = [
  'response_format',
  'json_schema',
  'json schema',
  'tool_choice',
  'tool choice',
  'structured output',
  'function calling',
  'function_call',
  'tool use',
  'tool_use',
  'tools are',
  'tools is',
  'support tools',
  'support for tools'
];

// Returns the matched subject (a short, quotable phrase) or '' when the message
// is not a structured-output refusal. Truthiness IS the predicate.
export function structuredOutputRefusalReason(message) {
  var lower = String(message || '').toLowerCase();
  if (!lower) return '';
  var sawRefusal = false;
  for (var i = 0; i < STRUCTURED_REFUSAL_WORDS.length; i++) {
    if (lower.indexOf(STRUCTURED_REFUSAL_WORDS[i]) !== -1) { sawRefusal = true; break; }
  }
  if (!sawRefusal) return '';
  for (var j = 0; j < STRUCTURED_REFUSAL_SUBJECTS.length; j++) {
    if (lower.indexOf(STRUCTURED_REFUSAL_SUBJECTS[j]) !== -1) return STRUCTURED_REFUSAL_SUBJECTS[j];
  }
  return '';
}

export function isStructuredOutputUnsupportedMessage(message) {
  return !!structuredOutputRefusalReason(message);
}

export function buildStructuredStageName(stageName) {
  return String(stageName || 'stage')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'stage';
}

// ── Finish reason: the classifier is PROVIDER-BLIND ──────────────────────────
// This module never learns a provider's vocabulary. The transport layer
// (provider.js normalizeFinishReason) is the single home for mapping raw
// provider values — Anthropic stop_reason, OpenAI finish_reason, Gemini
// finishReason — onto the canonical enum:
//
//   'stop' | 'truncation' | 'filtered' | 'tool_use' | 'pause' | 'error' | 'unknown'
//
// Everything below reads the canonical value only. Adding a provider must never
// require an edit to this file — if it does, the normalization leaked.
export var FINISH_REASON_TRUNCATION = 'truncation';

export function isTruncationFinishReason(normalized) {
  return String(normalized || '') === FINISH_REASON_TRUNCATION;
}

export function isLikelyTruncationError(err) {
  // Structural signal first — the transport tells us outright.
  if (err && err.errorType === 'truncation') return true;
  if (err && isTruncationFinishReason(err.finishReason)) return true;
  if (err && err.meta && isTruncationFinishReason(err.meta.finishReason)) return true;

  // Fallback: message heuristics for paths that surface no structured reason
  // at all (a compat provider that streams no finish_reason, a mid-JSON socket
  // cut). Provider-agnostic by construction — these are English, not vocabulary.
  var lower = String((err && err.message) || err || '').toLowerCase();
  return lower.indexOf('truncated') !== -1
    || lower.indexOf('max_tokens') !== -1
    || lower.indexOf('output token limit') !== -1
    || lower.indexOf('finish_reason') !== -1 && lower.indexOf('length') !== -1
    || lower.indexOf('unexpected end') !== -1
    || lower.indexOf('unexpected eof') !== -1
    || lower.indexOf('unterminated') !== -1;
}

export function isLikelyJsonFailure(err) {
  var lower = String((err && err.message) || err || '').toLowerCase();
  return lower.indexOf('malformed json') !== -1
    || lower.indexOf('json') !== -1 && lower.indexOf('repair') !== -1
    || lower.indexOf('parse') !== -1 && lower.indexOf('json') !== -1
    || lower.indexOf('no json object found') !== -1;
}

export function isLikelySchemaFailure(err) {
  if (err && err.errorType === 'schema') return true;
  var lower = String((err && err.message) || err || '').toLowerCase();
  return lower.indexOf('missing required') !== -1
    || lower.indexOf('expected ') !== -1
    || lower.indexOf('returned weeks') !== -1
    || lower.indexOf('returned fragments') !== -1
    || lower.indexOf('returned empty result') !== -1
    || lower.indexOf('returned a shell') !== -1
    || lower.indexOf('missing "title"') !== -1
    || lower.indexOf('missing "sessions"') !== -1
    || lower.indexOf('missing "content"') !== -1
    || lower.indexOf('stage validation') !== -1
    || lower.indexOf('missing required sections') !== -1;
}

export function shouldFallbackFromStructured(err) {
  var message = (err && err.message) || '';
  return !!(err && err.structuredUnsupported)
    || isStructuredOutputUnsupportedMessage((err && err.message) || '')
    || String(message).toLowerCase().indexOf('unexpected structured response shape') !== -1
    || (isLikelyJsonFailure(err) && !isLikelyTruncationError(err));
}

export function isLikelyTimeoutError(err) {
  var lower = String((err && err.message) || err || '').toLowerCase();
  return lower.indexOf('timed out') !== -1
    || lower.indexOf('timeout') !== -1
    || lower.indexOf('aborterror') !== -1
    || lower.indexOf('stalled') !== -1;
}

export function isLikelyNetworkTransportError(err) {
  if (err && err.errorType === 'network') return true;
  var lower = String((err && err.message) || err || '').toLowerCase();
  return lower.indexOf('network error reaching api') !== -1
    || lower.indexOf('failed to fetch') !== -1
    || lower.indexOf('load failed') !== -1
    || lower.indexOf('connection was lost') !== -1
    || lower.indexOf('network changed') !== -1
    || lower.indexOf('err_network_changed') !== -1
    || lower.indexOf('offline') !== -1;
}

export function shouldRetryStageError(err) {
  if (err && err.retryable) return true;
  return isLikelyTimeoutError(err)
    || isLikelyNetworkTransportError(err)
    || isLikelyTruncationError(err)
    || isLikelyJsonFailure(err)
    || isLikelySchemaFailure(err)
    || isLikelyThrottleError(err);
}

export function shouldSplitWeekChunk(err, weekNumbers) {
  return weekNumbers.length > 1 && shouldRetryStageError(err);
}

export function shouldSplitFragmentBatch(err, registry) {
  return registry.length > 1 && shouldRetryStageError(err);
}

// ── Throttle: provider-agnostic ──────────────────────────────────────────────
// Every provider on the internet says "not now" with HTTP 429 or 503, or with
// English words. This classifier reads both. It never checks which provider
// sent the response — a 429 is a 429 whether it came from OpenAI, Anthropic,
// DeepSeek, Groq, HuggingFace, Kimi, Ollama behind a reverse proxy, or
// anything else with an OpenAI-compatible surface.
export function isLikelyThrottleError(err) {
  // Structural: HTTP status codes that universally mean "try later"
  if (err && (err.status === 429 || err.status === 503)) return true;
  if (err && err.errorType === 'rate_limit') return true;
  // Text: English patterns seen across every provider. Provider-blind by
  // construction — these are words, not vocabulary.
  var lower = String((err && err.message) || err || '').toLowerCase();
  return lower.indexOf('rate limit') !== -1
    || lower.indexOf('rate_limit') !== -1
    || lower.indexOf('usage limit') !== -1
    || lower.indexOf('too many requests') !== -1
    || lower.indexOf('quota exceeded') !== -1
    || lower.indexOf('quota exhausted') !== -1
    || lower.indexOf('throttl') !== -1
    || lower.indexOf('overloaded') !== -1
    || (lower.indexOf('capacity') !== -1 && lower.indexOf('at capacity') !== -1)
    || lower.indexOf('temporarily unavailable') !== -1
    || lower.indexOf('try again later') !== -1
    || lower.indexOf('usage window') !== -1
    || lower.indexOf('server_busy') !== -1;
}
