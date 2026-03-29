// ── Error classification for the API generation pipeline ─────────────────────
// Extracted from api-generator.js (lines 3808–3887).
// Pure string-matching predicates — no external dependencies.
// Used by runJsonStage to decide: retry, split, fallback from structured output.

export function isStructuredOutputUnsupportedMessage(message) {
  var lower = String(message || '').toLowerCase();
  return lower.indexOf('response_format') !== -1
    || lower.indexOf('json_schema') !== -1
    || lower.indexOf('unsupported') !== -1
    || lower.indexOf('not supported') !== -1
    || lower.indexOf('unknown parameter') !== -1
    || lower.indexOf('invalid parameter') !== -1;
}

export function buildStructuredStageName(stageName) {
  return String(stageName || 'stage')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'stage';
}

export function isLikelyTruncationError(err) {
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
    || isLikelySchemaFailure(err);
}

export function shouldSplitWeekChunk(err, weekNumbers) {
  return weekNumbers.length > 1 && shouldRetryStageError(err);
}

export function shouldSplitFragmentBatch(err, registry) {
  return registry.length > 1 && shouldRetryStageError(err);
}
