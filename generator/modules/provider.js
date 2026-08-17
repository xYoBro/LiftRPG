// ── Provider transport, pricing, model discovery, and API calls ───────────────
// Extracted from api-generator.js IIFE.
//
// Exports:
//   Transport:  fetchWithTimeout, normalizeUrl
//   Payload:    buildOpenAICompatChatPayload, buildOpenAICompatUrl,
//               buildOpenAICompatHeaders
//   Content:    extractTextContent, normalizeImageParts,
//               buildAnthropicUserContent, buildOpenAICompatUserContent
//   Calls:      callAnthropic, callOpenAICompat, callProvider
//               callAnthropicStructured, callOpenAICompatStructured,
//               callProviderStructured
//   Pricing:    safeNumber, normalizeModelId, normalizeModelFamilyId, escapeRegex,
//               detectProviderId, resolveModelPricing, estimateUsageCostUsd,
//               buildUsageSnapshot, blankUsageTotals, addUsageTotals,
//               humanizeModelLabel, buildOpenAIModelDocsUrl,
//               refreshPricing, MODEL_PRICING_RULES, PRICING_SOURCES,
//               THIRD_PARTY_PRICING_FEED, DEFAULT_PRICING_REFRESH_TIMEOUT_MS
//   Discovery:  listProviderModels, fetchJsonWithTimeout
//   Settings:   resolveStructuredPipelineSettings, allowsEmptyApiKey

import {
  DEFAULT_TIMEOUT_MS,
  MAX_OUTPUT_TOKENS,
  PROVIDERS,
  STREAM_CONNECT_TIMEOUT_MS,
  STREAM_IDLE_TIMEOUT_MS,
  STREAM_MIN_OVERALL_MS,
  STREAM_MAX_OVERALL_MS
} from './constants.js';
import { extractJson } from './repair.js';
import { cloneSimple } from './assembly.js';
import {
  buildStructuredStageName,
  isStructuredOutputUnsupportedMessage,
  isLikelyTruncationError,
  isLikelyJsonFailure,
  shouldFallbackFromStructured
} from './error-classify.js';

// ── Finish reason normalization (SINGLE HOME) ────────────────────────────────
// Provider vocabulary stops here. Everything downstream — error-classify.js,
// the retry ladder, the UI — reads only the canonical enum:
//
//   'stop'       generation completed normally
//   'truncation' hit the output token ceiling mid-answer  (the only value the
//                retry ladder branches on)
//   'filtered'   refused / safety-stopped / recitation-blocked
//   'tool_use'   stopped to call a tool
//   'pause'      server-tool pause; caller may resume
//   'error'      provider reported a stream-level failure
//   'unknown'    provider said nothing, or said something we do not recognize
//
// ADDING A PROVIDER MEANS ADDING ROWS HERE AND NOWHERE ELSE. An unrecognized
// value degrades to 'unknown' — never throws, never guesses.
// Keys are lower-cased before lookup, so Gemini's upper-case wire values
// (MAX_TOKENS, SAFETY, …) land on the same rows as their lower-case twins.
var FINISH_REASON_MAP = {
  // Anthropic — stop_reason
  end_turn: 'stop',
  stop_sequence: 'stop',
  max_tokens: 'truncation',
  refusal: 'filtered',
  tool_use: 'tool_use',
  pause_turn: 'pause',
  model_context_window_exceeded: 'truncation',
  // OpenAI-compatible — finish_reason (Kimi, Codex, Groq, Ollama, OpenRouter, …)
  stop: 'stop',
  length: 'truncation',
  tool_calls: 'tool_use',
  function_call: 'tool_use',
  content_filter: 'filtered',
  // Gemini — finishReason
  safety: 'filtered',
  recitation: 'filtered',
  blocklist: 'filtered',
  prohibited_content: 'filtered',
  spii: 'filtered',
  malformed_function_call: 'error',
  other: 'unknown'
};

export function normalizeFinishReason(raw) {
  var value = String(raw == null ? '' : raw).trim().toLowerCase();
  if (!value) return 'unknown';
  return FINISH_REASON_MAP[value] || 'unknown';
}

// ── Pricing constants ─────────────────────────────────────────────────────────

export var DEFAULT_PRICING_REFRESH_TIMEOUT_MS = 20000;
var PRICING_VERIFIED_AT = '2026-03-23';

export var PRICING_SOURCES = {
  anthropic: {
    label: 'Anthropic pricing',
    url: 'https://docs.anthropic.com/en/docs/about-claude/pricing',
    browserDirectFetch: false
  },
  openai: {
    label: 'OpenAI pricing',
    url: 'https://platform.openai.com/pricing',
    browserDirectFetch: false
  },
  groq: {
    label: 'Groq model pricing',
    url: 'https://console.groq.com/docs/models',
    browserDirectFetch: false
  },
  gemini: {
    label: 'Gemini Developer API pricing',
    url: 'https://ai.google.dev/pricing',
    browserDirectFetch: false
  }
};

// Centralized third-party pricing fallback configuration.
// If this ecosystem shifts again, update this single object first.
export var THIRD_PARTY_PRICING_FEED = {
  id: 'pricetoken',
  enabled: true,
  label: 'PriceToken pricing API',
  siteUrl: 'https://pricetoken.ai/',
  modelEndpointBase: 'https://pricetoken.ai/api/v1/text/'
};

export var MODEL_PRICING_RULES = [
  {
    provider: 'anthropic',
    match: /^claude-(?:sonnet-4(?:[-_.]\d+)?|sonnet-4(?:[-_.]6)?|sonnet-4(?:[-_.]5)?)/i,
    label: 'Claude Sonnet 4',
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheWritePerMillion: 3.75,
    cacheReadPerMillion: 0.30,
    source: PRICING_SOURCES.anthropic
  },
  {
    provider: 'anthropic',
    match: /^claude-(?:opus-4(?:[-_.]\d+)?|opus-4(?:[-_.]1)?)/i,
    label: 'Claude Opus 4',
    inputPerMillion: 15,
    outputPerMillion: 75,
    cacheWritePerMillion: 18.75,
    cacheReadPerMillion: 1.50,
    source: PRICING_SOURCES.anthropic
  },
  {
    provider: 'anthropic',
    match: /^claude-(?:haiku-3(?:[-_.]5)?)/i,
    label: 'Claude Haiku 3.5',
    inputPerMillion: 0.80,
    outputPerMillion: 4,
    cacheWritePerMillion: 1,
    cacheReadPerMillion: 0.08,
    source: PRICING_SOURCES.anthropic
  },
  {
    provider: 'anthropic',
    match: /^claude-(?:haiku-4(?:[-_.]5)?|4(?:[-_.]5)?-haiku)/i,
    label: 'Claude Haiku 4.5',
    inputPerMillion: 1,
    outputPerMillion: 5,
    cacheWritePerMillion: 1.25,
    cacheReadPerMillion: 0.10,
    source: PRICING_SOURCES.anthropic
  },
  {
    // Standard rate. Introductory pricing of $2 in / $10 out per MTok runs
    // through 2026-08-31; the standard rate is carried here so the headline
    // figure over-estimates rather than under-estimates during the intro window.
    provider: 'anthropic',
    match: /^claude-(?:sonnet-5|5-sonnet)(?:$|[-_.])/i,
    label: 'Claude Sonnet 5',
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheWritePerMillion: 3.75,
    cacheReadPerMillion: 0.30,
    source: PRICING_SOURCES.anthropic
  },
  {
    provider: 'anthropic',
    match: /^claude-(?:opus-5|5-opus)(?:$|[-_.])/i,
    label: 'Claude Opus 5',
    inputPerMillion: 5,
    outputPerMillion: 25,
    cacheWritePerMillion: 6.25,
    cacheReadPerMillion: 0.50,
    source: PRICING_SOURCES.anthropic
  },
  {
    provider: 'openai',
    match: /^gpt-4o(?:$|[-_])/i,
    label: 'GPT-4o',
    inputPerMillion: 2.5,
    cachedInputPerMillion: 1.25,
    outputPerMillion: 10,
    source: PRICING_SOURCES.openai
  },
  {
    provider: 'openai',
    match: /^gpt-4\.1(?:$|[-_])/i,
    label: 'GPT-4.1',
    inputPerMillion: 2,
    cachedInputPerMillion: 0.50,
    outputPerMillion: 8,
    source: PRICING_SOURCES.openai
  },
  {
    provider: 'openai',
    match: /^gpt-4\.1-mini(?:$|[-_])/i,
    label: 'GPT-4.1 mini',
    inputPerMillion: 0.40,
    cachedInputPerMillion: 0.10,
    outputPerMillion: 1.60,
    source: PRICING_SOURCES.openai
  },
  {
    provider: 'openai',
    match: /^gpt-4\.1-nano(?:$|[-_])/i,
    label: 'GPT-4.1 nano',
    inputPerMillion: 0.10,
    cachedInputPerMillion: 0.025,
    outputPerMillion: 0.40,
    source: PRICING_SOURCES.openai
  },
  {
    provider: 'openai',
    match: /^gpt-5(?:\.4)?(?:$|[-_])(?!mini|nano|pro)/i,
    label: 'GPT-5',
    inputPerMillion: 1.25,
    cachedInputPerMillion: 0.125,
    outputPerMillion: 10,
    source: PRICING_SOURCES.openai
  },
  {
    provider: 'openai',
    match: /^gpt-5(?:\.4)?-mini(?:$|[-_])/i,
    label: 'GPT-5 mini',
    inputPerMillion: 0.25,
    cachedInputPerMillion: 0.025,
    outputPerMillion: 2,
    source: PRICING_SOURCES.openai
  },
  {
    provider: 'openai',
    match: /^gpt-5(?:\.4)?-nano(?:$|[-_])/i,
    label: 'GPT-5 nano',
    inputPerMillion: 0.05,
    cachedInputPerMillion: 0.005,
    outputPerMillion: 0.40,
    source: PRICING_SOURCES.openai
  },
  {
    provider: 'openai',
    match: /^gpt-5(?:\.4)?-pro(?:$|[-_])/i,
    label: 'GPT-5 pro',
    inputPerMillion: 15,
    outputPerMillion: 120,
    source: PRICING_SOURCES.openai
  },
  {
    provider: 'groq',
    match: /^llama-3\.3-70b-versatile$/i,
    label: 'Llama 3.3 70B Versatile',
    inputPerMillion: 0.59,
    outputPerMillion: 0.79,
    source: PRICING_SOURCES.groq
  },
  {
    provider: 'gemini',
    match: /^gemini-2\.5-pro(?:$|[-_])/i,
    label: 'Gemini 2.5 Pro',
    inputPerMillion: 1.25,
    outputPerMillion: 10,
    longContextThresholdTokens: 200000,
    longContextInputPerMillion: 2.50,
    longContextOutputPerMillion: 15,
    source: PRICING_SOURCES.gemini
  },
  {
    provider: 'gemini',
    match: /^gemini-2\.5-flash(?:$|[-_])(?!lite)/i,
    label: 'Gemini 2.5 Flash',
    inputPerMillion: 0.30,
    outputPerMillion: 2.50,
    source: PRICING_SOURCES.gemini
  },
  {
    provider: 'gemini',
    match: /^gemini-2\.5-flash-lite(?:$|[-_])/i,
    label: 'Gemini 2.5 Flash-Lite',
    inputPerMillion: 0.10,
    outputPerMillion: 0.40,
    source: PRICING_SOURCES.gemini
  }
];

// ── Core transport ────────────────────────────────────────────────────────────

// Wraps fetch() with an AbortController so long-running requests don't hang
// silently. Default 10 minutes; override via settings.requestTimeoutMs.
export function fetchWithTimeout(url, options, timeoutMs) {
  var ms = timeoutMs || DEFAULT_TIMEOUT_MS;
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, ms);
  var merged = Object.assign({}, options, { signal: controller.signal });
  return fetch(url, merged)
    .catch(function (err) {
      var msg = String(err.message || err || '').toLowerCase();
      // Catch both Chrome AbortError and Safari's "Fetch is aborted" TypeError
      if (err.name === 'AbortError' || msg.indexOf('abort') !== -1) {
        var timeoutError = new Error(
          'Request timed out or was aborted after ' + Math.round(ms / 1000) + 's. ' +
          'The model may need more time, or the request may have stalled. Try again.'
        );
        timeoutError.errorType = 'timeout';
        timeoutError.retryable = true;
        throw timeoutError;
      }
      // Network failures (CORS, DNS, connection refused, Safari "Load failed") — add context
      if (err.name === 'TypeError' && (
        msg.indexOf('fetch') !== -1 ||
        msg.indexOf('network') !== -1 ||
        msg.indexOf('load failed') !== -1 ||
        msg.indexOf('connection was lost') !== -1 ||
        msg.indexOf('network changed') !== -1
      )) {
        var networkError = new Error(
          'Network error reaching API: ' + err.message + '. ' +
          'Check your API key, internet connection, and that the provider URL is correct.'
        );
        networkError.errorType = 'network';
        networkError.retryable = true;
        throw networkError;
      }
      throw err;
    })
    .finally(function () { clearTimeout(timer); });
}

export function normalizeUrl(url) {
  // Forgive the full-endpoint paste (2026-08-13, found on the first real
  // deployed-site run): the bridge's own startup line advertises
  // "POST …/v1/chat/completions", so a reader pastes exactly that into a
  // field that wants the base — and the models probe then requested
  // …/v1/chat/completions/models, a path nothing serves, reported as
  // "nothing came back". The base IS that value with the suffix removed, so
  // both spellings are accepted here, in the ONE normalizer both the models
  // URL and the completions URL build from — they must agree on one root.
  return String(url || '')
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/i, '')
    .replace(/\/+$/, '');
}

// ── Pricing helpers ───────────────────────────────────────────────────────────

export function safeNumber(value) {
  var num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

export function normalizeModelId(value) {
  return String(value || '').trim().toLowerCase();
}

export function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeModelFamilyId(modelId) {
  return normalizeModelId(modelId)
    .replace(/-\d{8}(?=$|[-_.\/])/g, '')
    .replace(/-\d{4}-\d{2}-\d{2}(?=$|[-_.\/])/g, '')
    .replace(/-latest(?=$|[-_.\/])/g, '');
}

function buildModelFamilyRegex(modelId) {
  var family = normalizeModelFamilyId(modelId);
  if (!family) return /^$/i;
  return new RegExp('^' + escapeRegex(family) + '(?:$|[-_.\\/])', 'i');
}

function clonePricingSource(source) {
  return {
    label: source && source.label ? source.label : '',
    url: source && source.url ? source.url : ''
  };
}

function clonePricingRule(rule) {
  if (!rule) return null;
  var cloned = {};
  Object.keys(rule).forEach(function (key) {
    if (key === 'match' && rule.match instanceof RegExp) {
      cloned.match = new RegExp(rule.match.source, rule.match.flags || '');
      return;
    }
    if (key === 'source' && rule.source) {
      cloned.source = clonePricingSource(rule.source);
      return;
    }
    cloned[key] = rule[key];
  });
  return cloned;
}

function findMatchingPricingRule(rules, providerId, modelId) {
  var normalizedModel = normalizeModelId(modelId);
  return (rules || []).filter(function (entry) {
    return entry && entry.provider === providerId && entry.match && entry.match.test(normalizedModel);
  })[0] || null;
}

function mergePricingRule(baseRule, overrideRule) {
  if (!baseRule) return clonePricingRule(overrideRule);
  if (!overrideRule) return clonePricingRule(baseRule);
  var merged = clonePricingRule(baseRule) || {};
  Object.keys(overrideRule).forEach(function (key) {
    if (key === 'match' && overrideRule.match instanceof RegExp) {
      merged.match = new RegExp(overrideRule.match.source, overrideRule.match.flags || '');
      return;
    }
    if (key === 'source' && overrideRule.source) {
      merged.source = clonePricingSource(overrideRule.source);
      return;
    }
    if (overrideRule[key] !== undefined && overrideRule[key] !== null && overrideRule[key] !== '') {
      merged[key] = overrideRule[key];
    }
  });
  return merged;
}

export function detectProviderId(settings, responseProviderId) {
  if (responseProviderId) return responseProviderId;
  var providerId = String((settings && (settings.provider || settings.providerId || settings._providerId)) || '').trim().toLowerCase();
  if (providerId && PROVIDERS[providerId]) return providerId;
  var format = String((settings && settings.format) || '').trim().toLowerCase();
  var baseUrl = normalizeUrl((settings && settings.baseUrl) || '');
  if (format === 'anthropic' || baseUrl === normalizeUrl(PROVIDERS.anthropic.baseUrl)) return 'anthropic';
  if (baseUrl === normalizeUrl(PROVIDERS.groq.baseUrl)) return 'groq';
  if (baseUrl === normalizeUrl(PROVIDERS.gemini.baseUrl)) return 'gemini';
  if (baseUrl === normalizeUrl(PROVIDERS.ollama.baseUrl)) return 'ollama';
  return providerId || 'openai';
}

function normalizeUsageMetrics(providerId, usage) {
  usage = usage || {};
  if (providerId === 'anthropic') {
    var anthropicInput = safeNumber(usage.input_tokens);
    var anthropicOutput = safeNumber(usage.output_tokens);
    var anthropicCacheWrite = safeNumber(usage.cache_creation_input_tokens);
    var anthropicCacheRead = safeNumber(usage.cache_read_input_tokens);
    return {
      inputTokens: anthropicInput,
      outputTokens: anthropicOutput,
      cachedInputTokens: 0,
      cacheWriteTokens: anthropicCacheWrite,
      cacheReadTokens: anthropicCacheRead,
      reasoningTokens: 0,
      totalTokens: safeNumber(usage.total_tokens) || (anthropicInput + anthropicOutput + anthropicCacheWrite + anthropicCacheRead)
    };
  }

  var promptTokens = safeNumber(usage.prompt_tokens);
  var completionTokens = safeNumber(usage.completion_tokens);
  var promptDetails = usage.prompt_tokens_details || {};
  var completionDetails = usage.completion_tokens_details || {};
  var cachedTokens = safeNumber(promptDetails.cached_tokens);
  return {
    inputTokens: promptTokens,
    outputTokens: completionTokens,
    cachedInputTokens: cachedTokens,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    reasoningTokens: safeNumber(completionDetails.reasoning_tokens),
    totalTokens: safeNumber(usage.total_tokens) || (promptTokens + completionTokens)
  };
}

function resolvePricingFromRule(rule, usage) {
  if (!rule) return null;

  var resolved = {
    label: rule.label,
    sourceLabel: rule.source && rule.source.label ? rule.source.label : '',
    sourceUrl: rule.source && rule.source.url ? rule.source.url : '',
    verifiedAt: rule.verifiedAt || PRICING_VERIFIED_AT,
    fetchedAt: rule.fetchedAt || '',
    live: !!rule.live,
    sourceKind: rule.sourceKind || 'official',
    fallbackReason: rule.fallbackReason || '',
    inputPerMillion: rule.inputPerMillion,
    outputPerMillion: rule.outputPerMillion,
    cachedInputPerMillion: rule.cachedInputPerMillion,
    cacheWritePerMillion: rule.cacheWritePerMillion,
    cacheReadPerMillion: rule.cacheReadPerMillion,
    longContextApplied: false
  };

  var promptTokens = safeNumber(usage && usage.inputTokens);
  if (rule.longContextThresholdTokens && promptTokens > rule.longContextThresholdTokens) {
    if (rule.longContextInputPerMillion !== undefined) resolved.inputPerMillion = rule.longContextInputPerMillion;
    if (rule.longContextOutputPerMillion !== undefined) resolved.outputPerMillion = rule.longContextOutputPerMillion;
    if (rule.longContextCachedInputPerMillion !== undefined) resolved.cachedInputPerMillion = rule.longContextCachedInputPerMillion;
    if (rule.longContextCacheWritePerMillion !== undefined) resolved.cacheWritePerMillion = rule.longContextCacheWritePerMillion;
    if (rule.longContextCacheReadPerMillion !== undefined) resolved.cacheReadPerMillion = rule.longContextCacheReadPerMillion;
    resolved.longContextApplied = true;
  }

  return resolved;
}

export function resolveModelPricing(providerId, modelId, usage, overrideRule) {
  var normalizedModel = normalizeModelId(modelId);
  if (!providerId || !normalizedModel) return null;

  var rule = null;
  if (overrideRule && overrideRule.provider === providerId && overrideRule.match && overrideRule.match.test(normalizedModel)) {
    rule = overrideRule;
  }
  if (!rule) {
    rule = findMatchingPricingRule(MODEL_PRICING_RULES, providerId, normalizedModel);
  }
  return resolvePricingFromRule(rule, usage);
}

export function estimateUsageCostUsd(usage, pricing) {
  if (!pricing || !usage) return null;
  var cachedInput = Math.min(safeNumber(usage.cachedInputTokens), safeNumber(usage.inputTokens));
  var uncachedInput = Math.max(0, safeNumber(usage.inputTokens) - cachedInput);
  var cacheWriteTokens = safeNumber(usage.cacheWriteTokens);
  var cacheReadTokens = safeNumber(usage.cacheReadTokens);
  var outputTokens = safeNumber(usage.outputTokens);

  var total =
    (uncachedInput * safeNumber(pricing.inputPerMillion)) / 1000000 +
    (cachedInput * safeNumber(pricing.cachedInputPerMillion !== undefined ? pricing.cachedInputPerMillion : pricing.inputPerMillion)) / 1000000 +
    (cacheWriteTokens * safeNumber(pricing.cacheWritePerMillion !== undefined ? pricing.cacheWritePerMillion : pricing.inputPerMillion)) / 1000000 +
    (cacheReadTokens * safeNumber(pricing.cacheReadPerMillion !== undefined ? pricing.cacheReadPerMillion : (pricing.cachedInputPerMillion !== undefined ? pricing.cachedInputPerMillion : pricing.inputPerMillion))) / 1000000 +
    (outputTokens * safeNumber(pricing.outputPerMillion)) / 1000000;

  return total > 0 ? total : 0;
}

export function buildUsageSnapshot(providerId, modelId, usage, pricingRule) {
  var normalizedUsage = normalizeUsageMetrics(providerId, usage);
  var pricing = resolveModelPricing(providerId, modelId, normalizedUsage, pricingRule);
  return {
    provider: providerId,
    model: String(modelId || '').trim(),
    usage: normalizedUsage,
    pricing: pricing,
    estimatedCostUsd: estimateUsageCostUsd(normalizedUsage, pricing)
  };
}

export function blankUsageTotals() {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0
  };
}

export function addUsageTotals(target, sample) {
  if (!sample || !sample.usage) return target;
  target.inputTokens += safeNumber(sample.usage.inputTokens);
  target.outputTokens += safeNumber(sample.usage.outputTokens);
  target.cachedInputTokens += safeNumber(sample.usage.cachedInputTokens);
  target.cacheWriteTokens += safeNumber(sample.usage.cacheWriteTokens);
  target.cacheReadTokens += safeNumber(sample.usage.cacheReadTokens);
  target.reasoningTokens += safeNumber(sample.usage.reasoningTokens);
  target.totalTokens += safeNumber(sample.usage.totalTokens);
  return target;
}

function parseMoneyValue(value) {
  var match = String(value || '').match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number(match[1]) : 0;
}

function extractHtmlText(html) {
  var raw = String(html || '');
  if (!raw) return '';
  if (typeof DOMParser !== 'undefined') {
    try {
      var doc = new DOMParser().parseFromString(raw, 'text/html');
      if (doc && doc.body && doc.body.textContent) {
        return doc.body.textContent;
      }
    } catch (_error) {}
  }
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function normalizePricingPageText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function humanizeModelLabel(modelId) {
  var label = String(modelId || '')
    .replace(/^openai\//i, '')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!label) return 'Selected model';
  label = label.replace(/\bgpt\b/gi, 'GPT');
  label = label.replace(/\bo\d+\b/gi, function (token) { return token.toLowerCase(); });
  label = label.replace(/\bclaude\b/gi, 'Claude');
  label = label.replace(/\bgemini\b/gi, 'Gemini');
  return label.replace(/\b([a-z])/g, function (_, chr) { return chr.toUpperCase(); });
}

function buildAnthropicPricingLabels(modelId) {
  var normalized = normalizeModelFamilyId(modelId);
  var modern = normalized.match(/^claude-(opus|sonnet|haiku)-(\d)(?:[-_.](\d))?/i);
  var legacy = normalized.match(/^claude-(\d)(?:[-_.](\d))?-(opus|sonnet|haiku)/i);
  var family = '';
  var major = '';
  var minor = '';
  if (modern) {
    family = modern[1];
    major = modern[2];
    minor = modern[3] || '';
  } else if (legacy) {
    family = legacy[3];
    major = legacy[1];
    minor = legacy[2] || '';
  }
  if (!family || !major) return [humanizeModelLabel(modelId)];
  return ['Claude ' + family.charAt(0).toUpperCase() + family.slice(1) + ' ' + major + (minor ? '.' + minor : '')];
}

export function buildOpenAIModelDocsUrl(modelId) {
  return 'https://developers.openai.com/api/docs/models/' + encodeURIComponent(normalizeModelFamilyId(modelId));
}

async function fetchTextWithTimeout(url, timeoutMs) {
  var resp = await fetchWithTimeout(url, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8'
    }
  }, timeoutMs);
  var text = await resp.text();
  if (!resp.ok) {
    throw new Error('Pricing source returned HTTP ' + resp.status + '.');
  }
  return text;
}

function describePricingFetchError(error, fallbackMessage) {
  var message = error && error.message ? error.message : String(error || '');
  if (!message) return fallbackMessage || 'Pricing refresh failed.';
  if (/failed to fetch|load failed/i.test(message)) {
    return fallbackMessage || 'Browser could not fetch the pricing source directly.';
  }
  return message;
}

function buildLivePricingRule(providerId, modelId, fields) {
  fields = fields || {};
  return {
    provider: providerId,
    match: buildModelFamilyRegex(modelId),
    label: fields.label || humanizeModelLabel(modelId),
    inputPerMillion: fields.inputPerMillion,
    outputPerMillion: fields.outputPerMillion,
    cachedInputPerMillion: fields.cachedInputPerMillion,
    cacheWritePerMillion: fields.cacheWritePerMillion,
    cacheReadPerMillion: fields.cacheReadPerMillion,
    longContextThresholdTokens: fields.longContextThresholdTokens,
    longContextInputPerMillion: fields.longContextInputPerMillion,
    longContextOutputPerMillion: fields.longContextOutputPerMillion,
    longContextCachedInputPerMillion: fields.longContextCachedInputPerMillion,
    longContextCacheWritePerMillion: fields.longContextCacheWritePerMillion,
    longContextCacheReadPerMillion: fields.longContextCacheReadPerMillion,
    source: fields.source || { label: '', url: '' },
    live: true,
    sourceKind: fields.sourceKind || 'official',
    fallbackReason: fields.fallbackReason || '',
    fetchedAt: fields.fetchedAt || '',
    verifiedAt: fields.verifiedAt || (fields.fetchedAt ? String(fields.fetchedAt).slice(0, 10) : PRICING_VERIFIED_AT)
  };
}

function buildThirdPartyPricingUrl(modelId) {
  return THIRD_PARTY_PRICING_FEED.modelEndpointBase + encodeURIComponent(normalizeModelFamilyId(modelId) || normalizeModelId(modelId));
}

function parseThirdPartyPricingRule(body, providerId, modelId) {
  var payload = body && body.data ? body.data : body;
  if (!payload || (!payload.modelId && !payload.displayName)) return null;
  var payloadProvider = normalizeModelId(payload.provider || providerId);
  if (providerId && payloadProvider && providerId !== payloadProvider && providerId !== 'custom' && providerId !== 'ollama') {
    return null;
  }
  return buildLivePricingRule(payloadProvider || providerId || 'openai', modelId, {
    label: payload.displayName || humanizeModelLabel(payload.modelId || modelId),
    inputPerMillion: parseMoneyValue(payload.inputPerMTok),
    outputPerMillion: parseMoneyValue(payload.outputPerMTok),
    source: {
      label: THIRD_PARTY_PRICING_FEED.label,
      url: THIRD_PARTY_PRICING_FEED.siteUrl
    },
    sourceKind: 'thirdParty',
    fetchedAt: payload.lastUpdated || (body && body.meta && body.meta.timestamp) || new Date().toISOString()
  });
}

function parseAnthropicPricingRule(pageText, modelId, fetchedAt) {
  var labels = buildAnthropicPricingLabels(modelId);
  for (var i = 0; i < labels.length; i++) {
    var label = labels[i];
    var row = new RegExp(
      escapeRegex(label) +
      '\\s*\\$([0-9]+(?:\\.[0-9]+)?)\\s*/\\s*MTok' +
      '\\s*\\$([0-9]+(?:\\.[0-9]+)?)\\s*/\\s*MTok' +
      '\\s*\\$([0-9]+(?:\\.[0-9]+)?)\\s*/\\s*MTok' +
      '\\s*\\$([0-9]+(?:\\.[0-9]+)?)\\s*/\\s*MTok' +
      '\\s*\\$([0-9]+(?:\\.[0-9]+)?)\\s*/\\s*MTok',
      'i'
    ).exec(pageText);
    if (!row) continue;
    var rule = buildLivePricingRule('anthropic', modelId, {
      label: label,
      inputPerMillion: parseMoneyValue(row[1]),
      cacheWritePerMillion: parseMoneyValue(row[2]),
      cacheReadPerMillion: parseMoneyValue(row[4]),
      outputPerMillion: parseMoneyValue(row[5]),
      source: {
        label: 'Anthropic pricing (live)',
        url: PRICING_SOURCES.anthropic.url
      },
      fetchedAt: fetchedAt
    });
    if (/^claude-(?:sonnet-4(?:[-_.]5)?|4(?:[-_.]5)?-sonnet)$/i.test(normalizeModelFamilyId(modelId))) {
      var longMatch = /Claude Sonnet 4\.5\s*\/\s*4\s*\$([0-9]+(?:\.[0-9]+)?)\s*\/\s*MTok\s*\$([0-9]+(?:\.[0-9]+)?)\s*\/\s*MTok\s*\$([0-9]+(?:\.[0-9]+)?)\s*\/\s*MTok\s*\$([0-9]+(?:\.[0-9]+)?)\s*\/\s*MTok/i.exec(pageText);
      if (longMatch) {
        rule.longContextThresholdTokens = 200000;
        rule.longContextInputPerMillion = parseMoneyValue(longMatch[3]);
        rule.longContextOutputPerMillion = parseMoneyValue(longMatch[4]);
      }
    }
    return rule;
  }
  return null;
}

function parseOpenAIPricingRule(pageText, modelId, url, fetchedAt) {
  var pricingBlock = pageText;
  var pricingIndex = pricingBlock.toLowerCase().indexOf('pricing');
  if (pricingIndex !== -1) pricingBlock = pricingBlock.slice(pricingIndex, pricingIndex + 2200);
  var ioMatch = /Text tokens[\s\S]{0,700}?Input\s*\$([0-9]+(?:\.[0-9]+)?)\s*[\s\S]{0,160}?Output\s*\$([0-9]+(?:\.[0-9]+)?)/i.exec(pricingBlock)
    || /Pricing[\s\S]{0,900}?Input\s*\$([0-9]+(?:\.[0-9]+)?)\s*[\s\S]{0,160}?Output\s*\$([0-9]+(?:\.[0-9]+)?)/i.exec(pricingBlock);
  if (!ioMatch) return null;
  var cachedMatch = /Cached input\s*\$([0-9]+(?:\.[0-9]+)?)/i.exec(pricingBlock);
  var labelMatch = /([A-Za-z0-9 .-]+?)\s+Model\s*\|\s*OpenAI API/i.exec(pageText);
  return buildLivePricingRule('openai', modelId, {
    label: labelMatch ? labelMatch[1].trim() : humanizeModelLabel(modelId),
    inputPerMillion: parseMoneyValue(ioMatch[1]),
    outputPerMillion: parseMoneyValue(ioMatch[2]),
    cachedInputPerMillion: cachedMatch ? parseMoneyValue(cachedMatch[1]) : undefined,
    source: {
      label: 'OpenAI model docs (live)',
      url: url
    },
    fetchedAt: fetchedAt
  });
}

function parseGeminiPricingRule(pageText, modelId, fetchedAt) {
  var canonical = normalizeModelFamilyId(modelId);
  var blockMatch = new RegExp(
    escapeRegex(canonical) +
    '[\\s\\S]{0,1200}?Input price[^$]*\\$([0-9]+(?:\\.[0-9]+)?)(?:[^$]*\\$([0-9]+(?:\\.[0-9]+)?))?' +
    '[\\s\\S]{0,260}?Output price[^$]*\\$([0-9]+(?:\\.[0-9]+)?)(?:[^$]*\\$([0-9]+(?:\\.[0-9]+)?))?',
    'i'
  ).exec(pageText);
  if (!blockMatch) return null;
  var cacheMatch = new RegExp(
    escapeRegex(canonical) +
    '[\\s\\S]{0,1300}?Context caching price[^$]*\\$([0-9]+(?:\\.[0-9]+)?)(?:[^$]*\\$([0-9]+(?:\\.[0-9]+)?))?',
    'i'
  ).exec(pageText);
  return buildLivePricingRule('gemini', modelId, {
    label: humanizeModelLabel(modelId),
    inputPerMillion: parseMoneyValue(blockMatch[1]),
    outputPerMillion: parseMoneyValue(blockMatch[3]),
    cachedInputPerMillion: cacheMatch ? parseMoneyValue(cacheMatch[1]) : undefined,
    longContextThresholdTokens: blockMatch[2] || blockMatch[4] ? 200000 : undefined,
    longContextInputPerMillion: blockMatch[2] ? parseMoneyValue(blockMatch[2]) : undefined,
    longContextOutputPerMillion: blockMatch[4] ? parseMoneyValue(blockMatch[4]) : undefined,
    longContextCachedInputPerMillion: cacheMatch && cacheMatch[2] ? parseMoneyValue(cacheMatch[2]) : undefined,
    source: {
      label: 'Gemini pricing (live)',
      url: PRICING_SOURCES.gemini.url
    },
    fetchedAt: fetchedAt
  });
}

function parseGroqPricingRule(pageText, modelId, fetchedAt) {
  var row = new RegExp(
    escapeRegex(normalizeModelId(modelId)) +
    '\\s*[\\s\\S]{0,160}?\\$([0-9]+(?:\\.[0-9]+)?)\\s*input\\s*\\$([0-9]+(?:\\.[0-9]+)?)\\s*output',
    'i'
  ).exec(normalizeModelId(pageText));
  if (!row) return null;
  return buildLivePricingRule('groq', modelId, {
    label: humanizeModelLabel(modelId),
    inputPerMillion: parseMoneyValue(row[1]),
    outputPerMillion: parseMoneyValue(row[2]),
    source: {
      label: 'Groq model pricing (live)',
      url: PRICING_SOURCES.groq.url
    },
    fetchedAt: fetchedAt
  });
}

async function fetchLivePricingRule(providerId, modelId, timeoutMs) {
  var fetchedAt = new Date().toISOString();
  if (!providerId || !modelId) return null;

  if (providerId === 'anthropic') {
    var anthropicHtml = await fetchTextWithTimeout(PRICING_SOURCES.anthropic.url, timeoutMs);
    return parseAnthropicPricingRule(normalizePricingPageText(extractHtmlText(anthropicHtml)), modelId, fetchedAt);
  }
  if (providerId === 'openai') {
    var openAiUrl = buildOpenAIModelDocsUrl(modelId);
    var openAiHtml = await fetchTextWithTimeout(openAiUrl, timeoutMs);
    return parseOpenAIPricingRule(normalizePricingPageText(extractHtmlText(openAiHtml)), modelId, openAiUrl, fetchedAt);
  }
  if (providerId === 'gemini') {
    var geminiHtml = await fetchTextWithTimeout(PRICING_SOURCES.gemini.url, timeoutMs);
    return parseGeminiPricingRule(normalizePricingPageText(extractHtmlText(geminiHtml)), modelId, fetchedAt);
  }
  if (providerId === 'groq') {
    var groqHtml = await fetchTextWithTimeout(PRICING_SOURCES.groq.url, timeoutMs);
    return parseGroqPricingRule(normalizePricingPageText(extractHtmlText(groqHtml)), modelId, fetchedAt);
  }
  return null;
}

async function fetchThirdPartyPricingRule(providerId, modelId, timeoutMs) {
  if (!THIRD_PARTY_PRICING_FEED.enabled || !modelId) return null;
  var body = await fetchJsonWithTimeout(buildThirdPartyPricingUrl(modelId), {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      'accept': 'application/json'
    }
  }, timeoutMs);
  return parseThirdPartyPricingRule(body, providerId, modelId);
}

function shouldSkipOfficialPricingFetch(providerId) {
  if (typeof window === 'undefined') return false;
  var source = providerId && PRICING_SOURCES[providerId] ? PRICING_SOURCES[providerId] : null;
  return !!(source && source.browserDirectFetch === false);
}

export async function refreshPricing(settings, options) {
  var resolved = Object.assign({}, settings || {});
  var providerId = detectProviderId(resolved);
  var modelId = String(resolved.model || '').trim();
  var timeoutMs = (options && options.timeoutMs) || Math.min(resolved.requestTimeoutMs || DEFAULT_TIMEOUT_MS, DEFAULT_PRICING_REFRESH_TIMEOUT_MS);
  var fallbackRule = findMatchingPricingRule(MODEL_PRICING_RULES, providerId, modelId);
  var liveRule = null;
  var thirdPartyRule = null;
  var officialRefreshError = '';
  var refreshError = '';

  if (shouldSkipOfficialPricingFetch(providerId)) {
    officialRefreshError = 'Official provider pricing pages cannot be fetched directly from this browser.';
  } else {
    try {
      liveRule = await fetchLivePricingRule(providerId, modelId, timeoutMs);
      if (!liveRule) {
        officialRefreshError = 'Official pricing did not expose a parseable entry for ' + (modelId || 'the selected model') + '.';
      }
    } catch (error) {
      officialRefreshError = describePricingFetchError(error, 'Browser could not fetch the official provider pricing page directly.');
    }
  }

  if (!liveRule && THIRD_PARTY_PRICING_FEED.enabled && !fallbackRule) {
    try {
      thirdPartyRule = await fetchThirdPartyPricingRule(providerId, modelId, timeoutMs);
      if (thirdPartyRule && officialRefreshError) {
        thirdPartyRule.fallbackReason = officialRefreshError;
      }
    } catch (error) {
      refreshError = describePricingFetchError(error, 'The configured third-party pricing feed could not be reached.');
    }
  }

  var effectiveRule = null;
  var live = false;
  if (liveRule) {
    effectiveRule = mergePricingRule(fallbackRule, liveRule);
    live = true;
    refreshError = '';
  } else if (thirdPartyRule) {
    effectiveRule = mergePricingRule(fallbackRule, thirdPartyRule);
    live = true;
    refreshError = officialRefreshError;
  } else if (fallbackRule) {
    effectiveRule = clonePricingRule(fallbackRule);
    refreshError = officialRefreshError || refreshError;
  } else {
    refreshError = officialRefreshError || refreshError;
  }

  resolved._pricingRule = effectiveRule || null;
  if (settings && typeof settings === 'object') {
    settings._pricingRule = effectiveRule || null;
  }

  var pricing = effectiveRule ? resolvePricingFromRule(effectiveRule, blankUsageTotals()) : null;
  var result = {
    provider: providerId,
    model: modelId,
    matched: !!pricing,
    live: live,
    pricing: pricing,
    sourcePath: liveRule ? 'official' : thirdPartyRule ? 'third-party' : 'local',
    error: refreshError
  };
  if (result.pricing && !live && refreshError) {
    result.pricing.fallbackReason = refreshError;
  }
  if (result.pricing && thirdPartyRule && officialRefreshError) {
    result.pricing.fallbackReason = officialRefreshError;
  }
  if (typeof window !== 'undefined' && window.LiftRPGAPI) {
    window.LiftRPGAPI.lastPricing = result;
  }
  return result;
}

// ── Model discovery ───────────────────────────────────────────────────────────

export function fetchJsonWithTimeout(url, options, timeoutMs) {
  return fetchWithTimeout(url, options, timeoutMs).then(async function (resp) {
    var text = await resp.text();
    if (!resp.ok) {
      throw new Error('Provider returned ' + resp.status + ' for ' + url + ': ' + text);
    }
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error('Provider returned invalid JSON for ' + url + '.');
    }
  });
}

function uniqueStrings(values) {
  var seen = Object.create(null);
  return (values || []).map(function (value) {
    return String(value || '').trim();
  }).filter(Boolean).filter(function (value) {
    if (seen[value]) return false;
    seen[value] = true;
    return true;
  });
}

function isLikelyGenerationModel(modelId) {
  var lower = String(modelId || '').toLowerCase();
  if (!lower) return false;
  if (/(?:^|[-_/])(embedding|embeddings)(?:[-_/]|$)/.test(lower)) return false;
  if (/(?:^|[-_/])(tts|speech|whisper|transcribe|translate)(?:[-_/]|$)/.test(lower)) return false;
  if (/(?:^|[-_/])(moderation|omni-moderation)(?:[-_/]|$)/.test(lower)) return false;
  if (/(?:^|[-_/])(image|images|dall-e)(?:[-_/]|$)/.test(lower)) return false;
  return true;
}

function normalizeModelIds(values) {
  return uniqueStrings(values).filter(isLikelyGenerationModel);
}

function buildOpenAICompatModelsUrl(baseUrl) {
  return normalizeUrl(baseUrl) + '/models';
}

function buildOllamaTagsUrl(baseUrl) {
  var normalized = normalizeUrl(baseUrl || PROVIDERS.ollama.baseUrl);
  if (/\/api\/tags$/i.test(normalized)) return normalized;
  if (/\/api$/i.test(normalized)) return normalized + '/tags';
  if (/\/v1$/i.test(normalized)) return normalized.replace(/\/v1$/i, '') + '/api/tags';
  return normalized + '/api/tags';
}

function buildGeminiNativeModelsUrl() {
  return 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000';
}

// Model discovery keeps the BYOK surface current without bloating the
// generation prompts. We ask providers for the latest model IDs at setup
// time, but still allow manual entry when a provider's catalog is partial.
async function listOpenAICompatModels(apiKey, baseUrl, timeoutMs) {
  if (!baseUrl) throw new Error('Base URL is required to load models.');
  var headers = { 'content-type': 'application/json' };
  if (apiKey) headers.Authorization = 'Bearer ' + apiKey;
  var body = await fetchJsonWithTimeout(buildOpenAICompatModelsUrl(baseUrl), {
    method: 'GET',
    headers: headers
  }, timeoutMs);
  return {
    models: normalizeModelIds((body.data || []).map(function (entry) { return entry && entry.id; })),
    source: 'openai-models'
  };
}

async function listAnthropicModels(apiKey, timeoutMs) {
  if (!apiKey) throw new Error('API key required to load Anthropic models.');
  var body = await fetchJsonWithTimeout('https://api.anthropic.com/v1/models?limit=1000', {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json'
    }
  }, timeoutMs);
  return {
    models: uniqueStrings((body.data || []).map(function (entry) { return entry && entry.id; })),
    source: 'anthropic-models'
  };
}

async function listOllamaModels(baseUrl, apiKey, timeoutMs) {
  var headers = { 'content-type': 'application/json' };
  if (apiKey) headers.Authorization = 'Bearer ' + apiKey;
  var body = await fetchJsonWithTimeout(buildOllamaTagsUrl(baseUrl), {
    method: 'GET',
    headers: headers
  }, timeoutMs);
  return {
    models: uniqueStrings((body.models || []).map(function (entry) {
      return (entry && (entry.model || entry.name)) || '';
    })),
    source: 'ollama-tags'
  };
}

async function listGeminiModels(apiKey, baseUrl, timeoutMs) {
  if (!apiKey) throw new Error('API key required to load Gemini models.');

  try {
    var compat = await listOpenAICompatModels(apiKey, baseUrl || PROVIDERS.gemini.baseUrl, timeoutMs);
    if (compat.models.length) return compat;
  } catch (_compatError) {
    // Fall through to Gemini's native models API. This keeps discovery
    // resilient even if the OpenAI-compatible listing drifts or lags.
  }

  var body = await fetchJsonWithTimeout(buildGeminiNativeModelsUrl(), {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey,
      'content-type': 'application/json'
    }
  }, timeoutMs);
  return {
    models: normalizeModelIds((body.models || []).filter(function (entry) {
      var methods = entry && entry.supportedGenerationMethods;
      return Array.isArray(methods) && methods.indexOf('generateContent') !== -1;
    }).map(function (entry) {
      return (entry && (entry.baseModelId || String(entry.name || '').replace(/^models\//, ''))) || '';
    })),
    source: 'gemini-native-models'
  };
}

export async function listProviderModels(settings) {
  var resolved = Object.assign({}, settings || {});
  var providerId = String(resolved.provider || resolved.providerId || resolved._providerId || '').trim();
  var preset = PROVIDERS[providerId] || null;
  var discoveryKind = resolved.modelDiscovery || (preset && preset.modelDiscovery) || '';
  var baseUrl = resolved.baseUrl || (preset && preset.baseUrl) || '';
  var apiKey = resolved.apiKey || '';
  var format = resolved.format || (preset && preset.format) || 'openai';
  var timeoutMs = resolved.requestTimeoutMs || DEFAULT_TIMEOUT_MS;

  if (!discoveryKind) {
    if (providerId === 'anthropic' || normalizeUrl(baseUrl) === normalizeUrl(PROVIDERS.anthropic.baseUrl) || format === 'anthropic') {
      discoveryKind = 'anthropic';
    } else if (providerId === 'gemini' || normalizeUrl(baseUrl) === normalizeUrl(PROVIDERS.gemini.baseUrl)) {
      discoveryKind = 'gemini';
    } else if (providerId === 'ollama' || normalizeUrl(baseUrl) === normalizeUrl(PROVIDERS.ollama.baseUrl) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(baseUrl)) {
      discoveryKind = 'ollama';
    } else {
      discoveryKind = 'openai';
    }
  }

  var result;
  if (discoveryKind === 'anthropic') {
    result = await listAnthropicModels(apiKey, timeoutMs);
  } else if (discoveryKind === 'gemini') {
    result = await listGeminiModels(apiKey, baseUrl, timeoutMs);
  } else if (discoveryKind === 'ollama') {
    result = await listOllamaModels(baseUrl, apiKey, timeoutMs);
  } else {
    if (!baseUrl) throw new Error('Base URL is required to load models for this provider.');
    result = await listOpenAICompatModels(apiKey, baseUrl, timeoutMs);
  }

  return {
    models: result.models,
    source: result.source,
    provider: providerId || discoveryKind,
    baseUrl: baseUrl || '',
    fetchedAt: new Date().toISOString()
  };
}

// ── Content extraction helpers ────────────────────────────────────────────────
// OpenAI-compatible responses may return content as a string or an array of
// typed parts (e.g. [{ type: "text", text: "..." }]).

export function extractTextContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(function (p) { return p && (p.type === 'text' || p.text); })
      .map(function (p) { return p.text || ''; })
      .join('');
  }
  return String(content || '');
}

// ── Image content (OPTIONAL capability of the existing transports) ────────────
//
// D94 law: the registry is the seam and a wire FORMAT is the only code. Vision
// is NOT a new format — it is a capability the anthropic and openai-compat
// adapters already have on the wire, expressed here as an OPTIONAL second
// content channel. Callers that pass no images produce byte-identical payloads
// to the text-only path; that inertness is structural, not a promise:
// normalizeImageParts() collapses everything falsy/malformed to [], and both
// content builders return the bare `prompt` STRING (not a one-element array)
// when the list is empty, so the request body is the same object it always was.
//
// Consumer: scripts/playthrough-audit.mjs, which calls from page context with
// base64 page screenshots. Nothing in the generation pipeline passes images.

var SUPPORTED_IMAGE_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

// Accepts { mediaType, dataBase64 } (and the `media_type` / `data` spellings a
// caller copying provider wire docs would reach for). Anything else is dropped
// silently — a malformed image must never turn a working text call into a 400.
export function normalizeImageParts(images) {
  if (!Array.isArray(images) || !images.length) return [];
  var out = [];
  for (var i = 0; i < images.length; i++) {
    var raw = images[i];
    if (!raw || typeof raw !== 'object') continue;
    var mediaType = String(raw.mediaType || raw.media_type || 'image/png').toLowerCase();
    var data = String(raw.dataBase64 || raw.data || '');
    if (!data) continue;
    if (SUPPORTED_IMAGE_MEDIA_TYPES.indexOf(mediaType) === -1) continue;
    out.push({ mediaType: mediaType, dataBase64: data });
  }
  return out;
}

// Anthropic Messages: image blocks precede the text block (the documented
// ordering for multi-image prompts — the text refers back to what came before).
export function buildAnthropicUserContent(prompt, images) {
  var parts = normalizeImageParts(images);
  if (!parts.length) return prompt;
  var blocks = parts.map(function (p) {
    return {
      type: 'image',
      source: { type: 'base64', media_type: p.mediaType, data: p.dataBase64 }
    };
  });
  blocks.push({ type: 'text', text: prompt });
  return blocks;
}

// OpenAI-compatible chat completions: text first, then image_url parts carrying
// data: URIs. Gemini's compat endpoint accepts the same shape.
export function buildOpenAICompatUserContent(prompt, images) {
  var parts = normalizeImageParts(images);
  if (!parts.length) return prompt;
  var blocks = [{ type: 'text', text: prompt }];
  parts.forEach(function (p) {
    blocks.push({
      type: 'image_url',
      image_url: { url: 'data:' + p.mediaType + ';base64,' + p.dataBase64 }
    });
  });
  return blocks;
}

// ── Payload builders ──────────────────────────────────────────────────────────

export function buildOpenAICompatChatPayload(model, prompt, maxTokens, extra, images) {
  var payload = Object.assign({
    model: model,
    // Keep the chat-completions contract conservative across OpenAI-style
    // providers. Some providers reject requests that include both legacy and
    // newer token-limit fields in the same payload.
    max_tokens: maxTokens || MAX_OUTPUT_TOKENS,
    messages: [{ role: 'user', content: buildOpenAICompatUserContent(prompt, images) }]
  }, extra || {});
  return payload;
}

export function buildOpenAICompatUrl(baseUrl) {
  // Through the one normalizer, so a base pasted WITH /chat/completions does
  // not become …/chat/completions/chat/completions here while the models
  // probe strips it — the two URLs must be built from the same root.
  return normalizeUrl(baseUrl) + '/chat/completions';
}

export function buildOpenAICompatHeaders(apiKey) {
  var headers = { 'content-type': 'application/json' };
  if (apiKey) headers.Authorization = 'Bearer ' + apiKey;
  return headers;
}

// ── Request handlers ──────────────────────────────────────────────────────────

// Anthropic model output token limits — models reject requests above their cap.
// Haiku 4.5 caps at 64000 output tokens; Sonnet 5 / Opus 5 / Sonnet 4.6 reach
// 128000. MAX_OUTPUT_TOKENS is 64000 (constants.js), i.e. already at or below
// every current model's cap — this table only matters if that ceiling is ever
// raised past 64000.
var ANTHROPIC_MAX_OUTPUT = {
  'haiku': 64000
};

function clampAnthropicMaxTokens(model, requested) {
  var modelLower = String(model || '').toLowerCase();
  for (var key in ANTHROPIC_MAX_OUTPUT) {
    if (modelLower.indexOf(key) !== -1) {
      return Math.min(requested, ANTHROPIC_MAX_OUTPUT[key]);
    }
  }
  return requested;
}

export var ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

// Headers are deliberately minimal. NOTE: no `anthropic-beta` header —
// 128k output is built into Claude 4+ models, so `output-128k-2025-02-19` was
// a no-op fossil. And no temperature/top_p/top_k anywhere in the payload:
// claude-sonnet-5 and claude-opus-5 reject non-default sampling params with a
// 400, and omitting them is uniformly safe on every model.
export function buildAnthropicHeaders(apiKey) {
  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
    'content-type': 'application/json'
  };
}

// ── Shared streaming guard ───────────────────────────────────────────────────
// Wall-clock is the WRONG failure signal for a stream: a healthy 24k-token
// completion runs for many minutes, while a dead socket produces no bytes at
// all. So every streaming transport fails fast on SILENCE and stays patient
// with PROGRESS. One harness, used by every format — a new adapter gets the
// same semantics for free.
//
//   connect — no response headers yet          -> abort
//   idle    — no bytes for this long mid-stream -> abort
//   overall — absolute ceiling regardless       -> abort
//
// The caller's per-stage timeout is ADVISORY on a streaming path: it becomes
// the overall cap, clamped so a healthy long stream is never killed early and
// a runaway is never unbounded.
function createStreamGuard(label, requestedTimeoutMs) {
  var controller = new AbortController();
  var phase = '';
  var phaseMs = 0;
  var silenceTimer = null;
  var overallTimer = null;
  var overallMs = Math.min(
    STREAM_MAX_OVERALL_MS,
    Math.max(Number(requestedTimeoutMs) > 0 ? Number(requestedTimeoutMs) : DEFAULT_TIMEOUT_MS,
      STREAM_MIN_OVERALL_MS)
  );

  function abortWithPhase(nextPhase, ms) {
    phase = nextPhase;
    phaseMs = ms;
    try { controller.abort(); } catch (abortErr) { /* already aborted */ }
  }
  function armSilence(ms, nextPhase) {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(function () { abortWithPhase(nextPhase, ms); }, ms);
  }

  return {
    signal: controller.signal,
    overallMs: overallMs,
    start: function () {
      armSilence(STREAM_CONNECT_TIMEOUT_MS, 'connect');
      overallTimer = setTimeout(function () { abortWithPhase('overall', overallMs); }, overallMs);
    },
    // Call once headers land, then on every chunk, to re-arm the idle window.
    touch: function () {
      armSilence(STREAM_IDLE_TIMEOUT_MS, 'idle');
    },
    clear: function () {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (overallTimer) clearTimeout(overallTimer);
      silenceTimer = null;
      overallTimer = null;
    },
    // Maps a thrown fetch/read failure onto a classified pipeline error.
    // Returns null when the error is not one this guard is responsible for.
    toTimeoutError: function (err) {
      var lower = String((err && err.message) || err || '').toLowerCase();
      var aborted = (err && err.name === 'AbortError') || lower.indexOf('abort') !== -1;
      if (!aborted || !phase) return null;
      var seconds = Math.round(phaseMs / 1000);
      var detail = phase === 'connect'
        ? label + ' did not send response headers within ' + seconds + 's.'
        : phase === 'idle'
          ? 'The ' + label + ' stream went silent for ' + seconds + 's mid-response (connection likely dropped).'
          : 'The ' + label + ' stream exceeded its overall ' + seconds + 's ceiling.';
      var timeoutError = new Error(detail + ' Try again.');
      timeoutError.errorType = 'timeout';
      timeoutError.retryable = true;
      // STRUCTURAL marker, not prose. Surfaces that explain a retry in plain
      // language pick their wording from this ('connect' | 'idle' | 'overall')
      // instead of regexing the message above — the message is for humans and
      // is free to change.
      timeoutError.streamPhase = phase;
      return timeoutError;
    }
  };
}

// ── Streaming progress ticks (the heartbeat) ─────────────────────────────────
//
// A long stage is ONE streaming call that can run for many minutes and reports
// its token usage only at the very end. Without a signal, a healthy stage and a
// hung one look identical, and the rational move for a waiting operator is to
// hit Stop and throw away the spend. So the transports offer a heartbeat.
//
// The channel is INERT BY DEFAULT, the same way vision is (D108): no callback
// means no emitter, no wrapper, and — critically — nothing added to any request
// payload. `onStreamTick` never touches the wire; it only reports what already
// came back. A text-only call made without it is byte-identical to one made
// before this channel existed (test-asserted).
//
// Ticks fire on stream ACTIVITY, not on text growth. A model that spends four
// minutes in a thinking block is alive and must look alive, even though the
// assistant text is still empty. `chars` is what has been accumulated so far;
// `approxTokens` is chars/4 — an ESTIMATE, and every surface that shows it must
// say so. The billed count arrives with the stage's usage snapshot.
export var STREAM_TICK_MIN_INTERVAL_MS = 500;

// Returns a throttled emit(chars, isFinal) — or null when no callback was
// supplied, so callers can skip the wrapper entirely.
//
// Leading edge fires immediately (the UI should react to first contact, not
// half a second later). The FINAL tick always fires and is never throttled:
// the last number a reader sees has to be the real one rather than whatever
// the throttle happened to let through, and `final` is the only signal that
// this call is done talking. One extra callback per request — the throttle
// exists to stop hundreds, not one.
function createStreamTickEmitter(onStreamTick) {
  if (typeof onStreamTick !== 'function') return null;
  var startedAt = Date.now();
  var lastAt = 0;

  return function emitStreamTick(chars, isFinal) {
    var count = Number(chars) > 0 ? Math.floor(Number(chars)) : 0;
    var now = Date.now();
    if (!isFinal && lastAt && (now - lastAt) < STREAM_TICK_MIN_INTERVAL_MS) return;
    lastAt = now;
    try {
      onStreamTick({
        chars: count,
        approxTokens: Math.round(count / 4),
        elapsedMs: now - startedAt,
        final: !!isFinal
      });
    } catch (tickErr) {
      // A progress callback is decoration. It must never kill a paid generation.
      console.warn('[LiftRPG] Stream progress callback threw; continuing:', tickErr);
    }
  };
}

function buildNetworkError(err) {
  var networkError = new Error(
    'Network error reaching API: ' + ((err && err.message) || err) + '. ' +
    'Check your API key, internet connection, and that the provider URL is correct.'
  );
  networkError.errorType = 'network';
  networkError.retryable = true;
  return networkError;
}

// Splits an SSE byte stream into `data:` payload lines and hands each to
// onFrame. Shared by every streaming format — the frame FORMAT is universal
// (text/event-stream); only the payload SCHEMA differs per provider.
// `onFrame` returning false stops the read (used for the `[DONE]` sentinel).
async function readSseFrames(response, onActivity, onFrame) {
  var reader = response.body.getReader();
  var decoder = new TextDecoder();
  var buffer = '';
  var stopped = false;

  function drainLine(line) {
    if (stopped) return;
    if (line.indexOf('data:') !== 0) return;   // `event:` / `id:` / `:` comments
    var raw = line.slice(5).trim();
    if (!raw) return;
    if (onFrame(raw) === false) stopped = true;
  }

  while (!stopped) {
    var step = await reader.read();
    if (onActivity) onActivity();
    if (step.done) break;
    buffer += decoder.decode(step.value, { stream: true });
    var newlineIndex;
    while (!stopped && (newlineIndex = buffer.indexOf('\n')) !== -1) {
      var line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
      buffer = buffer.slice(newlineIndex + 1);
      drainLine(line);
    }
  }
  if (!stopped) {
    buffer += decoder.decode();
    if (buffer.trim()) drainLine(buffer.replace(/\r$/, '').trim());
  }
}

// Parses one SSE data payload as JSON. Unparseable frames are skipped, never
// thrown — a provider emitting a keepalive or a shape we do not know must not
// kill a healthy generation.
function parseSseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch (parseErr) {
    console.warn('[LiftRPG] Skipping unparseable ' + label + ' SSE frame:', raw.slice(0, 200));
    return null;
  }
}

// POSTs a streaming request and consumes it under the shared guard. Every
// streaming transport routes through here, so timeout semantics, HTTP-error
// shaping, and network-error classification are identical across formats.
async function runStreamingRequest(spec) {
  var guard = createStreamGuard(spec.label, spec.timeoutMs);
  var emitTick = createStreamTickEmitter(spec.onStreamTick);
  guard.start();
  try {
    var resp = await fetch(spec.url, {
      method: 'POST',
      headers: spec.headers,
      body: JSON.stringify(spec.payload),
      signal: guard.signal
    });

    if (!resp.ok) {
      var errorText = '';
      try { errorText = await resp.text(); } catch (readErr) { errorText = ''; }
      var parsed = null;
      try { parsed = errorText ? JSON.parse(errorText) : null; } catch (jsonErr) { parsed = null; }
      var errObj = Array.isArray(parsed) ? parsed[0] : parsed;   // Gemini returns array errors
      var errMsg = (errObj && errObj.error && errObj.error.message)
        || (errObj && errObj.message)
        || (errorText ? errorText.slice(0, 500) : '')
        || ('HTTP ' + resp.status);
      var httpError = new Error(spec.errorPrefix + errMsg);
      httpError.status = resp.status;
      if (resp.status === 429 || resp.status >= 500) httpError.retryable = true;
      // Carry the standard Retry-After header so the backoff loop can use
      // the provider's own estimate instead of guessing. Provider-agnostic:
      // this is an HTTP standard, not a vendor feature.
      if (resp.status === 429 || resp.status === 503) {
        httpError.errorType = 'rate_limit';
        var retryAfter = resp.headers.get('retry-after');
        if (retryAfter) httpError.retryAfterHeader = retryAfter;
      }
      throw httpError;
    }

    if (!resp.body || typeof resp.body.getReader !== 'function') {
      throw new Error(spec.label + ' streaming response has no readable body. Check the console.');
    }

    guard.touch();   // headers landed — switch connect window -> idle window
    var streamed = await spec.consume(resp, guard.touch, emitTick);
    // One final, unthrottled tick from the one place every format passes
    // through — so the closing number is the true total for every transport,
    // present and future, without each consumer remembering to do it.
    //
    // A consumer that received bytes in something other than `text` reports its
    // own total as `streamChars` (the forced-tool-call path, D160b). Absent
    // means text-only, so every reader that predates the field — and the compat
    // reader, which has no tool path — closes on exactly the number it always did.
    if (emitTick) {
      emitTick(
        (streamed && typeof streamed.streamChars === 'number')
          ? streamed.streamChars
          : String((streamed && streamed.text) || '').length,
        true
      );
    }
    return streamed;
  } catch (err) {
    var timeoutError = guard.toTimeoutError(err);
    if (timeoutError) throw timeoutError;
    if (err && err.name === 'TypeError' && !err.status) throw buildNetworkError(err);
    throw err;
  } finally {
    guard.clear();
  }
}

// Consumes an OpenAI-compatible SSE stream. This is the path every third-party
// and local model rides (Kimi via Moonshot/OpenRouter, Codex-style endpoints,
// Groq, Ollama, Gemini's compat endpoint), so it is deliberately forgiving:
//
//   - text accumulates from choices[0].delta.content
//   - the stream terminates on a literal `[DONE]` sentinel (unlike Anthropic)
//   - usage is OPTIONAL. Many compat providers omit it from streams or reject
//     stream_options entirely. Missing usage means "tokens unknown", which is
//     a reportable state — NOT an error.
//   - unknown fields, unknown delta shapes, and non-JSON keepalives are ignored
async function readOpenAICompatStream(response, onActivity, onTick) {
  var text = '';
  var finishReasonRaw = '';
  var streamedModel = '';
  var usage = null;
  var streamError = null;
  var sawDone = false;

  await readSseFrames(response, function () {
    if (onActivity) onActivity();
    if (onTick) onTick(text.length);
  }, function (raw) {
    if (raw === '[DONE]') {
      sawDone = true;
      return false;   // stop reading
    }
    var payload = parseSseJson(raw, 'OpenAI-compatible');
    if (!payload) return true;

    if (payload.error) {
      streamError = new Error('API error: ' + (payload.error.message || payload.error.type || 'stream error'));
      streamError.retryable = true;
      return false;
    }
    if (payload.model && !streamedModel) streamedModel = payload.model;

    // Usage arrives either on a dedicated final chunk (empty choices, with
    // stream_options.include_usage) or not at all.
    if (payload.usage) usage = payload.usage;

    var choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
    if (!choice) return true;
    if (choice.finish_reason) finishReasonRaw = choice.finish_reason;

    var delta = choice.delta || {};
    // `content` is normally a string; some providers send typed parts.
    if (typeof delta.content === 'string') {
      text += delta.content;
    } else if (delta.content) {
      text += extractTextContent(delta.content);
    }
    return true;
  });

  if (streamError) throw streamError;

  return {
    text: text,
    usage: usage,
    finishReasonRaw: finishReasonRaw,
    model: streamedModel,
    complete: sawDone
  };
}

// Provider-neutral: raised whenever a normalized finishReason is 'truncation'
// (Anthropic stop_reason max_tokens, OpenAI finish_reason length, Gemini
// MAX_TOKENS). The structural markers are what error-classify.js reads — the
// message text is for humans only.
function buildTruncationError(detail) {
  var err = new Error(
    'Response truncated: the model hit the output token limit before completing the JSON.\n\n' +
    (detail || 'The booklet JSON requires more output tokens than this model provided. ' +
      'Retry with a higher max output token limit, switch to a model with a larger output window, or use Chat mode.')
  );
  err.errorType = 'truncation';
  err.finishReason = 'truncation';
  err.retryable = true;
  return err;
}

// Consumes an Anthropic SSE stream and accumulates assistant text + usage.
//
// Event order: message_start (message.usage: input_tokens,
// cache_creation_input_tokens, cache_read_input_tokens) -> content_block_start
// -> content_block_delta* -> content_block_stop -> message_delta
// (delta.stop_reason, usage.output_tokens) -> message_stop.
//
// There is NO "[DONE]" sentinel — message_stop ends the stream.
//
// Only `delta.type === 'text_delta'` contributes to the returned TEXT.
// `thinking_delta`, `signature_delta`, and any future delta type are skipped
// silently: claude-sonnet-5 and claude-opus-5 run adaptive thinking by default
// and legitimately emit thinking blocks alongside text.
//
// `input_json_delta` is the ONE exception, and it is not text. It carries the
// arguments of a `tool_use` block, which is how callAnthropicStructured gets a
// schema-forced stage answer (D160b): under `tool_choice: {type:'tool'}` the
// API prefills the assistant turn, so the whole response is one tool_use block
// and `text` stays empty for the entire stream. It accumulates into a SEPARATE
// buffer keyed by content-block index and is never mixed into `text` — a
// freeform call still returns exactly the string it always did.
async function readAnthropicStream(response, onActivity, onTick) {
  var text = '';
  // index -> { name, json }. Empty on every non-tool call, which is every
  // prose stage and every stream this function read before D160b.
  var toolBlocks = {};
  var firstToolIndex = -1;
  var usage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0
  };
  var stopReason = '';
  var streamedModel = '';
  var streamError = null;
  var sawMessageStop = false;

  function handleEvent(payload) {
    var type = payload && payload.type;
    if (type === 'message_start') {
      var message = payload.message || {};
      streamedModel = message.model || streamedModel;
      var startUsage = message.usage || {};
      usage.input_tokens = safeNumber(startUsage.input_tokens);
      usage.cache_creation_input_tokens = safeNumber(startUsage.cache_creation_input_tokens);
      usage.cache_read_input_tokens = safeNumber(startUsage.cache_read_input_tokens);
      // Some responses report output tokens on message_start too; message_delta wins.
      usage.output_tokens = safeNumber(startUsage.output_tokens);
      return;
    }
    if (type === 'content_block_start') {
      var startBlock = payload.content_block || {};
      if (startBlock.type === 'tool_use') {
        var startIndex = safeNumber(payload.index);
        toolBlocks[startIndex] = { name: String(startBlock.name || ''), json: '' };
        if (firstToolIndex === -1) firstToolIndex = startIndex;
      }
      return;
    }
    if (type === 'content_block_delta') {
      var delta = payload.delta || {};
      if (delta.type === 'text_delta' && typeof delta.text === 'string') {
        text += delta.text;
      } else if (delta.type === 'input_json_delta' && typeof delta.partial_json === 'string') {
        var deltaIndex = safeNumber(payload.index);
        // Tolerate a missing content_block_start (a proxy that drops it, a
        // replayed transcript): the arguments still have to land somewhere.
        if (!toolBlocks[deltaIndex]) {
          toolBlocks[deltaIndex] = { name: '', json: '' };
          if (firstToolIndex === -1) firstToolIndex = deltaIndex;
        }
        toolBlocks[deltaIndex].json += delta.partial_json;
      }
      return;
    }
    if (type === 'message_delta') {
      var messageDelta = payload.delta || {};
      if (messageDelta.stop_reason) stopReason = messageDelta.stop_reason;
      var deltaUsage = payload.usage || {};
      if (deltaUsage.output_tokens !== undefined) {
        usage.output_tokens = safeNumber(deltaUsage.output_tokens);
      }
      if (deltaUsage.input_tokens !== undefined && !usage.input_tokens) {
        usage.input_tokens = safeNumber(deltaUsage.input_tokens);
      }
      return;
    }
    if (type === 'message_stop') {
      sawMessageStop = true;
      return;
    }
    if (type === 'error') {
      var apiError = payload.error || {};
      streamError = new Error('Anthropic API error: ' + (apiError.message || apiError.type || 'stream error'));
      streamError.retryable = true;
    }
    // content_block_start / content_block_stop / ping and unknown types: ignore.
  }

  // Each frame is an `event:` line followed by a `data:` line. The data payload
  // is standalone JSON carrying its own `type`, so the event: line is redundant.
  // The tick rides ACTIVITY, not text growth: adaptive thinking legitimately
  // produces minutes of `thinking_delta` frames with `text` still empty. That
  // is the exact stretch a reader needs to see is alive.
  // Bytes the reader has actually received, whichever block type carried them.
  // A forced tool call streams its whole answer as input_json_delta with `text`
  // empty, so counting text alone would report "nothing back yet" for the full
  // duration of a structured stage — a finished stage rendered as a hang, which
  // is the defect class the heartbeat exists to prevent. Zero added chars on a
  // freeform call, so every prose stage ticks exactly the numbers it always did.
  function streamedChars() {
    var total = text.length;
    for (var key in toolBlocks) total += toolBlocks[key].json.length;
    return total;
  }

  await readSseFrames(response, function () {
    if (onActivity) onActivity();
    if (onTick) onTick(streamedChars());
  }, function (raw) {
    var payload = parseSseJson(raw, 'Anthropic');
    if (payload) handleEvent(payload);
  });

  if (streamError) throw streamError;

  return {
    text: text,
    usage: usage,
    stopReason: stopReason,
    model: streamedModel,
    complete: sawMessageStop,
    streamChars: streamedChars(),
    toolUse: firstToolIndex === -1 ? null : {
      name: toolBlocks[firstToolIndex].name,
      json: toolBlocks[firstToolIndex].json
    }
  };
}

export async function callAnthropic(apiKey, model, prompt, maxTokens, timeoutMs, pricingRule, systemPrompt, images, onStreamTick) {
  var resolvedMax = clampAnthropicMaxTokens(model, maxTokens || MAX_OUTPUT_TOKENS);
  var payload = {
    model: model,
    max_tokens: resolvedMax,
    stream: true,
    messages: [{ role: 'user', content: buildAnthropicUserContent(prompt, images) }]
  };

  // Prompt caching: if a system prompt is provided, mark it ephemeral so
  // subsequent calls in the same session get cache hits (~90% cheaper input).
  if (systemPrompt) {
    payload.system = [{
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' }
    }];
  }

  var streamed = await runStreamingRequest({
    label: 'Anthropic',
    errorPrefix: 'Anthropic API error: ',
    url: ANTHROPIC_MESSAGES_URL,
    headers: buildAnthropicHeaders(apiKey),
    payload: payload,
    timeoutMs: timeoutMs,
    onStreamTick: onStreamTick,
    consume: readAnthropicStream
  });

  var rawText = streamed.text;
  var meta = {
    provider: 'anthropic',
    stop_reason: streamed.stopReason,
    finishReason: normalizeFinishReason(streamed.stopReason),
    model: streamed.model || model,
    usage: streamed.usage,
    streamed: true
  };
  window.LiftRPGAPI && (window.LiftRPGAPI.lastRaw = rawText);
  window.LiftRPGAPI && (window.LiftRPGAPI.lastMeta = meta);

  if (meta.finishReason === 'truncation') {
    throw buildTruncationError();
  }

  if (!rawText) {
    var emptyError = new Error(
      'Anthropic returned no text content' +
      (streamed.stopReason ? ' (stop_reason: ' + streamed.stopReason + ')' : '') + '. Check the console.'
    );
    emptyError.finishReason = meta.finishReason;
    throw emptyError;
  }

  return {
    text: rawText,
    meta: meta,
    usage: buildUsageSnapshot('anthropic', meta.model, streamed.usage, pricingRule)
  };
}

// Provider identity from the base URL. This is CONFIG matching, not code
// branching \u2014 a base URL we do not recognize is simply 'openai', which is the
// correct answer for every custom OpenAI-compatible endpoint.
function detectOpenAICompatProvider(baseUrl) {
  var normalized = normalizeUrl(baseUrl);
  if (normalized === normalizeUrl(PROVIDERS.groq.baseUrl)) return 'groq';
  if (normalized === normalizeUrl(PROVIDERS.gemini.baseUrl)) return 'gemini';
  if (normalized === normalizeUrl(PROVIDERS.ollama.baseUrl)) return 'ollama';
  return 'openai';
}

// `stream_options: {include_usage: true}` is the standard way to get token
// counts out of an OpenAI-compatible stream, but plenty of compat servers
// reject unknown parameters outright. We ask once per endpoint; if the endpoint
// refuses, we remember and stop asking for the rest of the session. Tokens then
// report as unknown, which is honest \u2014 never an error.
var STREAM_OPTIONS_UNSUPPORTED = {};

function rejectsStreamOptions(err) {
  if (!err || err.status !== 400) return false;
  var message = String(err.message || '');
  return message.toLowerCase().indexOf('stream_options') !== -1
    || isStructuredOutputUnsupportedMessage(message);
}

export async function callOpenAICompat(apiKey, baseUrl, model, prompt, maxTokens, timeoutMs, pricingRule, images, onStreamTick) {
  var url = buildOpenAICompatUrl(baseUrl);
  var endpointKey = normalizeUrl(baseUrl);
  var headers = buildOpenAICompatHeaders(apiKey);

  function buildPayload(includeUsage) {
    var extra = { stream: true };
    if (includeUsage) extra.stream_options = { include_usage: true };
    return buildOpenAICompatChatPayload(model, prompt, maxTokens, extra, images);
  }

  async function attempt(includeUsage) {
    return runStreamingRequest({
      label: 'API',
      errorPrefix: 'API error: ',
      url: url,
      headers: headers,
      payload: buildPayload(includeUsage),
      timeoutMs: timeoutMs,
      onStreamTick: onStreamTick,
      consume: readOpenAICompatStream
    });
  }

  var askForUsage = !STREAM_OPTIONS_UNSUPPORTED[endpointKey];
  var streamed;
  try {
    streamed = await attempt(askForUsage);
  } catch (err) {
    if (askForUsage && rejectsStreamOptions(err)) {
      // Endpoint refuses the usage opt-in. Remember, retry once without it.
      console.warn('[LiftRPG] ' + endpointKey + ' rejected stream_options; retrying without usage reporting.');
      STREAM_OPTIONS_UNSUPPORTED[endpointKey] = true;
      streamed = await attempt(false);
    } else {
      throw err;
    }
  }

  var providerId = detectOpenAICompatProvider(baseUrl);
  var meta = {
    provider: providerId,
    finish_reason: streamed.finishReasonRaw,
    finishReason: normalizeFinishReason(streamed.finishReasonRaw),
    model: streamed.model || model,
    usage: streamed.usage || null,
    usageReported: !!streamed.usage,
    streamed: true
  };
  window.LiftRPGAPI && (window.LiftRPGAPI.lastRaw = streamed.text);
  window.LiftRPGAPI && (window.LiftRPGAPI.lastMeta = meta);

  if (meta.finishReason === 'truncation') {
    throw buildTruncationError();
  }

  if (!streamed.text) {
    var emptyError = new Error(
      'The provider returned no text content' +
      (streamed.finishReasonRaw ? ' (finish_reason: ' + streamed.finishReasonRaw + ')' : '') +
      '. Check the console.'
    );
    emptyError.finishReason = meta.finishReason;
    throw emptyError;
  }

  return {
    text: streamed.text,
    meta: meta,
    // No usage in the stream is a normal outcome: buildUsageSnapshot zeroes the
    // counters and the cost meter reports the run as unpriced rather than $0.00.
    usage: buildUsageSnapshot(providerId, meta.model, streamed.usage || {}, pricingRule)
  };
}

// ── Transport registry ────────────────────────────────────────────────────────
//
// THE EXTENSION SEAM. A provider is CONFIG (a preset in constants.js: format +
// baseUrl + key + model id + discovery kind). A wire FORMAT is the only thing
// that is code, and it lives here as one adapter.
//
// Adding wire format #4 requires exactly three things and nothing else:
//   1. one adapter implementing the interface below,
//   2. one `registerTransport()` entry,
//   3. one provider preset in constants.js.
// Everything downstream — runJsonStage, error-classify.js, the retry ladder,
// the cost meter, checkpointing, the UI — is format-blind by construction. If a
// new format forces an edit outside these three places, the seam has leaked.
//
// This is the project's "new theme next month" scalability test (CLAUDE.md
// Design System Principles) applied to transports.
//
/**
 * @typedef {Object} TransportResult
 * @property {string} text          Assistant text (the stage's JSON, as a string).
 * @property {Object} meta          Diagnostics: provider, model, raw + normalized
 *                                  finishReason, usageReported, streamed.
 * @property {Object} usage         Usage snapshot from buildUsageSnapshot().
 *                                  Zeroed counters when the provider reported
 *                                  none — "unknown", never an error.
 */
/**
 * @typedef {Object} TransportCapabilities
 * @property {boolean} streaming        Adapter consumes an incremental stream.
 * @property {'reliable'|'optional'|'none'} usageInStream
 *           reliable — usage always present; optional — may be absent and the
 *           run must degrade to unknown tokens; none — never reported.
 * @property {boolean} structuredOutput Honors a JSON-schema response format.
 *           When false, callProviderStructured falls back to freeform JSON
 *           extraction instead of sending a schema.
 * @property {boolean} systemPromptCaching
 *           Accepts a cacheable system prompt via settings._systemPrompt.
 * @property {boolean=} vision
 *           Accepts base64 image content blocks alongside the text prompt via
 *           opts.images. OPTIONAL and absent-means-false: an adapter that never
 *           declares it (including third-party ones registered at runtime) is
 *           simply never handed images. Probe with
 *           transportSupports(settings, 'vision') before passing any.
 */
/**
 * @typedef {Object} TransportAdapter
 * @property {string} id                       Wire format id; matches settings.format.
 * @property {string} label                    Human-readable, for diagnostics.
 * @property {TransportCapabilities} capabilities
 * @property {(settings: Object, prompt: string, opts: {maxTokens: number, timeoutMs: number}) => Promise<TransportResult>} call
 *           `opts` may also carry `images` (see vision) and `onStreamTick` — a
 *           progress callback handed only to adapters that declare
 *           `capabilities.streaming`. Both are absent-by-default: an adapter
 *           that knows about neither receives the same two-key object it always
 *           did, and no request payload changes either way.
 * @property {((settings: Object) => Promise<Object>)=} listModels
 *           RESERVED. Not implemented today: model discovery is preset-driven
 *           (PROVIDERS[*].modelDiscovery -> listProviderModels), which is config
 *           rather than code. Implement only if a format's discovery cannot be
 *           expressed as a preset.
 */

export var DEFAULT_TRANSPORT_FORMAT = 'openai';

var TRANSPORT_REGISTRY = {};

export function registerTransport(adapter) {
  if (!adapter || !adapter.id || typeof adapter.call !== 'function') {
    throw new Error('registerTransport requires an adapter with { id, call }.');
  }
  TRANSPORT_REGISTRY[adapter.id] = adapter;
  return adapter;
}

export function getTransport(formatId) {
  return TRANSPORT_REGISTRY[String(formatId || '').trim().toLowerCase()] || null;
}

export function listTransportFormats() {
  return Object.keys(TRANSPORT_REGISTRY);
}

// Unknown/blank format resolves to the OpenAI-compatible adapter — the correct
// default for any custom endpoint the user points at with a base URL.
export function resolveTransport(settings) {
  return getTransport(settings && settings.format) || getTransport(DEFAULT_TRANSPORT_FORMAT);
}

registerTransport({
  id: 'anthropic',
  label: 'Anthropic Messages',
  capabilities: {
    streaming: true,
    usageInStream: 'reliable',
    // Forced tool use, not response_format — a CAPABILITY of this transport,
    // reached through its own adapter entry. Nothing downstream learns that the
    // two formats force a schema by different mechanisms (D94/D160b).
    structuredOutput: true,
    systemPromptCaching: true,
    vision: true
  },
  call: function (settings, prompt, opts) {
    return callAnthropic(
      settings.apiKey, settings.model, prompt,
      opts.maxTokens, opts.timeoutMs,
      settings._pricingRule, settings._systemPrompt,
      opts.images, opts.onStreamTick
    );
  },
  callStructured: function (settings, prompt, schema, maxTokens, stageName, opts) {
    return callAnthropicStructured(
      settings.apiKey, settings.model, prompt, schema,
      maxTokens, opts.timeoutMs,
      settings._pricingRule, settings._systemPrompt,
      stageName, opts.onStreamTick
    );
  }
});

registerTransport({
  id: 'openai',
  label: 'OpenAI-compatible chat completions',
  capabilities: {
    streaming: true,
    // Third-party and local servers frequently omit usage from streams.
    usageInStream: 'optional',
    structuredOutput: true,
    systemPromptCaching: false,
    // Whether the MODEL behind a compat endpoint can see is a model question,
    // not a format question. The wire format carries image_url parts; a
    // text-only model behind it will say so in its own error.
    vision: true
  },
  call: function (settings, prompt, opts) {
    return callOpenAICompat(
      settings.apiKey, settings.baseUrl, settings.model, prompt,
      opts.maxTokens, opts.timeoutMs, settings._pricingRule,
      opts.images, opts.onStreamTick
    );
  },
  callStructured: function (settings, prompt, schema, maxTokens, stageName, opts) {
    return callOpenAICompatStructured(
      settings.apiKey, settings.baseUrl, settings.model, prompt, schema,
      maxTokens, opts.timeoutMs, stageName, settings._pricingRule
    );
  }
});

// Gemini is NOT a distinct wire format in this codebase — PROVIDERS.gemini.format
// is 'openai' and it is reached through Google's OpenAI-compatibility endpoint.
// This alias exists so a settings object that still carries format:'gemini'
// (pre-normalization, or hand-built) resolves instead of silently falling back.
// Its finishReason vocabulary is already covered by FINISH_REASON_MAP.
registerTransport({
  id: 'gemini',
  label: 'Google Gemini (OpenAI-compatible endpoint)',
  capabilities: {
    streaming: true,
    usageInStream: 'optional',
    structuredOutput: true,
    systemPromptCaching: false,
    vision: true
  },
  call: function (settings, prompt, opts) {
    return getTransport('openai').call(settings, prompt, opts);
  },
  callStructured: function (settings, prompt, schema, maxTokens, stageName, opts) {
    return getTransport('openai').callStructured(settings, prompt, schema, maxTokens, stageName, opts);
  }
});

// ── Provider dispatcher ────────────────────────────────────────────────────────
// Unified dispatch used by both single-stage generate() and generateMultiStage().
// Format branching lives in the registry lookup and nowhere else.

export async function callProvider(settings, prompt, maxTokens, options) {
  var adapter = resolveTransport(settings);
  var images = normalizeImageParts(options && options.images);
  var opts = {
    maxTokens: maxTokens,
    timeoutMs: settings.requestTimeoutMs || DEFAULT_TIMEOUT_MS
  };
  // `images` is added to opts ONLY when there are images AND the adapter says
  // it can see them. Every generation-pipeline call therefore receives the same
  // two-key opts object it always did, and a runtime-registered adapter that
  // knows nothing about vision is never handed a key it does not understand.
  if (images.length && adapter && adapter.capabilities && adapter.capabilities.vision) {
    opts.images = images;
  }
  // Same absent-means-inert rule for the heartbeat. No callback, or an adapter
  // that does not stream, and `opts` keeps exactly the two keys it always had.
  if (typeof (options && options.onStreamTick) === 'function'
    && adapter && adapter.capabilities && adapter.capabilities.streaming) {
    opts.onStreamTick = options.onStreamTick;
  }
  return adapter.call(settings, prompt, opts);
}

// Capability probe for callers that used to branch on `format === 'anthropic'`.
export function transportSupports(settings, capability) {
  var adapter = resolveTransport(settings);
  return !!(adapter && adapter.capabilities && adapter.capabilities[capability]);
}

// ── Structured output calls ───────────────────────────────────────────────────

// THE NATIVE PATH'S SCHEMA FORCE (D160b).
//
// The compat transports get schema-forced output from `response_format:
// json_schema`. The Anthropic Messages API has no such field, so until this
// existed every structured stage on the PAID path fell back to freeform text
// plus repair.js extraction — and a model under token pressure answers freeform
// by DROPPING a whole required section rather than truncating (D159's measured
// 28.1k/32000 shell attempt, `meta.playSpine` simply absent). A forced tool call
// makes that shape impossible: the stage's own STRUCTURED_SCHEMA_* object rides
// as the single tool's `input_schema`, `tool_choice` names that tool, and the
// answer arrives as the tool's arguments or not at all.
//
// THREE THINGS THIS DELIBERATELY REUSES RATHER THAN REBUILDS:
//
//   1. runStreamingRequest — so the D160/D161 error shaping (read the body as
//      text, decide on resp.ok, attach status/retryable/errorType/
//      retryAfterHeader) is the SAME code the prose stages ride, not a second
//      copy that can drift out of agreement with it. HTTP vocabulary only;
//      error-classify.js still learns nothing about who answered.
//   2. readAnthropicStream — so `stop_reason: max_tokens` normalizes to
//      'truncation' exactly as it does for prose, and D97's ladder escalates
//      the ceiling instead of re-rolling it. A tool call cut off mid-arguments
//      is a truncation, not a schema failure.
//   3. The heartbeat — a forced tool call streams, so the reader watches bytes
//      arrive for the whole stage. The compat structured path is one-shot and
//      cannot.
//
// THINKING, RULED (verified against the current API docs, 2026-08-16, not
// assumed): forced `tool_choice` is incompatible with MANUAL extended thinking
// (`thinking: {type:'enabled', budget_tokens:N}`) only — that combination
// errors. Adaptive thinking, including on models where thinking is on by
// default, supports forced tool use. This pipeline has never sent a `thinking`
// parameter of any kind, so there is no tradeoff to take and nothing is given
// up here. Do NOT add manual `budget_tokens` to this payload; it would break
// the force. Effort/adaptive-thinking config remains free to add later.
//
// maxLength, RULED: the schemas carry OUTPUT_BUDGETS caps as `maxLength`, which
// a tool `input_schema` treats as documentation shown to the model rather than
// a constraint it enforces (it is NOT a rejected keyword here — `strict: true`
// and output_config.format both reject it, which is why neither is used). So
// the cap binds the same way it binds on a compat `strict: false` json_schema:
// as instruction. Enforcement stays with collectBudgetBreaches at the stage
// validator. Two readings of one OUTPUT_BUDGETS row, unchanged by this wave.
export async function callAnthropicStructured(apiKey, model, prompt, schema, maxTokens, timeoutMs, pricingRule, systemPrompt, stageName, onStreamTick) {
  var resolvedMax = clampAnthropicMaxTokens(model, maxTokens || MAX_OUTPUT_TOKENS);
  var toolName = buildStructuredStageName(stageName);
  var payload = {
    model: model,
    max_tokens: resolvedMax,
    stream: true,
    tools: [{
      name: toolName,
      description: 'Record the complete ' + (stageName || 'stage')
        + ' result. Every required field must be present and fully written.',
      input_schema: schema
    }],
    // `disable_parallel_tool_use` guarantees exactly one tool_use block, so the
    // stage answer can never arrive split across two partial calls.
    tool_choice: { type: 'tool', name: toolName, disable_parallel_tool_use: true },
    messages: [{ role: 'user', content: buildAnthropicUserContent(prompt) }]
  };

  // Same ephemeral system-prompt caching as the freeform call — a structured
  // stage should not silently lose the cache discount the prose stages get.
  if (systemPrompt) {
    payload.system = [{
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' }
    }];
  }

  var streamed = await runStreamingRequest({
    label: 'Anthropic',
    errorPrefix: 'Anthropic API error: ',
    url: ANTHROPIC_MESSAGES_URL,
    headers: buildAnthropicHeaders(apiKey),
    payload: payload,
    timeoutMs: timeoutMs,
    onStreamTick: onStreamTick,
    consume: readAnthropicStream
  });

  var rawJson = (streamed.toolUse && streamed.toolUse.json) || '';
  var meta = {
    provider: 'anthropic',
    stop_reason: streamed.stopReason,
    finishReason: normalizeFinishReason(streamed.stopReason),
    model: streamed.model || model,
    usage: streamed.usage,
    streamed: true,
    response_mode: 'tool_use'
  };
  // Debug surface first, so the operator can read what came back when the next
  // line throws. A tool call's arguments are the raw answer here.
  window.LiftRPGAPI && (window.LiftRPGAPI.lastRaw = rawJson || streamed.text);
  window.LiftRPGAPI && (window.LiftRPGAPI.lastMeta = meta);

  var usageSnapshot = buildUsageSnapshot('anthropic', meta.model, streamed.usage, pricingRule);

  // BEFORE the shape is inspected: a run that hit the ceiling mid-arguments has
  // partial, parseable-looking JSON, and accepting it is how a budget failure
  // gets misread as a schema failure (D159's lesson, in the other direction).
  if (meta.finishReason === 'truncation') {
    throw buildTruncationError('The stage output requires more output tokens than this model provided.');
  }

  if (!streamed.toolUse) {
    // Forced tool_choice and no tool_use block means the endpoint did not honor
    // the force (a proxy that strips `tools`, a model that rejects forcing).
    // The wording is load-bearing: shouldFallbackFromStructured() reads it, so
    // this degrades to freeform + repair rather than killing the run — the same
    // treatment the compat path gives an unexpected structured response shape.
    var shapeError = new Error(
      'Unexpected structured response shape: no tool_use block for ' + stageName
      + (streamed.stopReason ? ' (stop_reason: ' + streamed.stopReason + ')' : '') + '.'
    );
    shapeError.finishReason = meta.finishReason;
    throw shapeError;
  }

  try {
    return {
      result: JSON.parse(rawJson),
      meta: meta,
      usage: usageSnapshot
    };
  } catch (parseErr) {
    console.warn('[LiftRPG] Tool-call arguments for ' + stageName + ' were not directly parseable; attempting JSON repair fallback');
    return {
      result: extractJson(rawJson),
      meta: meta,
      usage: usageSnapshot
    };
  }
}

export async function callOpenAICompatStructured(apiKey, baseUrl, model, prompt, schema, maxTokens, timeoutMs, stageName, pricingRule) {
  var resp = await fetchWithTimeout(buildOpenAICompatUrl(baseUrl), {
    method: 'POST',
    headers: buildOpenAICompatHeaders(apiKey),
    body: JSON.stringify(buildOpenAICompatChatPayload(model, prompt, maxTokens, {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: buildStructuredStageName(stageName),
          strict: false,
          schema: schema
        }
      }
    }))
  }, timeoutMs);

  // \u2500\u2500 THE ERROR PATH, SHAPED LIKE THE STREAMING HARNESS'S (D160's second half)
  //
  // Two things used to go wrong here, and the fault campaign measured both.
  //
  // (1) The body was PARSED BEFORE `resp.ok` was checked. A 429 with an empty
  //     body \u2014 what gateways, proxies and load balancers actually return \u2014 threw
  //     "Failed to execute 'json' on 'Response'" and reached the stage runner as
  //     an unclassifiable failure. It burned an attempt against a closed door,
  //     which is the exact defect D160's backoff was written to end; it simply
  //     never reached the five structured stages.
  //
  // (2) The error carried no `status` and no `retryAfterHeader`, so a throttle
  //     survived only if the provider happened to write the words "rate limit"
  //     into its message, and the provider's own Retry-After estimate was
  //     discarded on every structured stage.
  //
  // Read the body as TEXT first, then decide. Provider-agnostic by construction:
  // `status` and `Retry-After` are HTTP, not vendor vocabulary, and
  // error-classify.js still learns nothing about who sent the response.
  if (!resp.ok) {
    var errorText = '';
    try { errorText = await resp.text(); } catch (readErr) { errorText = ''; }
    var parsedError = null;
    try { parsedError = errorText ? JSON.parse(errorText) : null; } catch (jsonErr) { parsedError = null; }
    var errEnvelope = Array.isArray(parsedError) ? parsedError[0] : parsedError;   // Gemini returns array errors
    var errMsg = (errEnvelope && errEnvelope.error && errEnvelope.error.message)
      || (errEnvelope && errEnvelope.error && errEnvelope.error.status
        && (errEnvelope.error.status + ': ' + JSON.stringify(errEnvelope.error)))
      || (errEnvelope && errEnvelope.message)
      || (errorText ? errorText.slice(0, 500) : '')
      || ('HTTP ' + resp.status);
    var err = new Error('API error: ' + errMsg);
    err.status = resp.status;
    if (resp.status === 429 || resp.status >= 500) err.retryable = true;
    if (resp.status === 429 || resp.status === 503) {
      err.errorType = 'rate_limit';
      var retryAfter = resp.headers.get('retry-after');
      if (retryAfter) err.retryAfterHeader = retryAfter;
    }
    if (isStructuredOutputUnsupportedMessage(errMsg)) err.structuredUnsupported = true;
    throw err;
  }

  var body = await resp.json();

  if (!body.choices || !body.choices[0] || !body.choices[0].message) {
    throw new Error('Unexpected structured response shape. Check the console.');
  }

  var message = body.choices[0].message;
  var providerId = normalizeUrl(baseUrl) === normalizeUrl(PROVIDERS.groq.baseUrl) ? 'groq'
    : normalizeUrl(baseUrl) === normalizeUrl(PROVIDERS.gemini.baseUrl) ? 'gemini'
      : normalizeUrl(baseUrl) === normalizeUrl(PROVIDERS.ollama.baseUrl) ? 'ollama'
        : 'openai';
  var meta = {
    provider: providerId,
    finish_reason: body.choices[0].finish_reason,
    finishReason: normalizeFinishReason(body.choices[0].finish_reason),
    model: body.model,
    usage: body.usage,
    response_mode: 'json_schema'
  };
  var usageSnapshot = buildUsageSnapshot(providerId, body.model || model, body.usage, pricingRule);

  // A pre-parsed body is still a body: an adapter or SDK that hands back
  // `message.parsed` built it out of whatever arrived, and what arrived may have
  // been cut off mid-object. The truncation check therefore runs BEFORE either
  // branch consumes the response, not inside one of them (D113 residue, closed
  // Teeth T4). Latent on the raw REST path this file uses — no OpenAI-compatible
  // endpoint returns `parsed` over the wire — but it is the one place where a
  // truncation the transport already normalized was read and then ignored, and a
  // silently accepted partial stage is exactly the failure the normalized
  // contract exists to make impossible.
  var parsedResult = (message.parsed && typeof message.parsed === 'object') ? message.parsed : null;
  var rawText = parsedResult
    ? JSON.stringify(parsedResult, null, 2)
    : extractTextContent(message.content);
  // Debug surface first, so the operator can still read what came back when the
  // next line throws.
  window.LiftRPGAPI && (window.LiftRPGAPI.lastRaw = rawText);
  window.LiftRPGAPI && (window.LiftRPGAPI.lastMeta = meta);

  if (meta.finishReason === 'truncation') {
    throw buildTruncationError('The stage output requires more output tokens than this model provided.');
  }

  if (parsedResult) {
    return {
      result: cloneSimple(parsedResult),
      meta: meta,
      usage: usageSnapshot
    };
  }

  try {
    return {
      result: JSON.parse(rawText),
      meta: meta,
      usage: usageSnapshot
    };
  } catch (parseErr) {
    console.warn('[LiftRPG] Structured response for ' + stageName + ' was not directly parseable; attempting JSON repair fallback');
    return {
      result: extractJson(rawText),
      meta: meta,
      usage: usageSnapshot
    };
  }
}

export async function callProviderStructured(settings, prompt, schema, maxTokens, stageName, options) {
  // Capability lookup, not a format check — an adapter that cannot force a
  // schema falls back to freeform extraction. HOW an adapter forces one is its
  // own business: the compat adapter sends response_format, the anthropic
  // adapter sends a forced tool call. Dispatch is a registry lookup, so a third
  // wire format is one adapter entry and nothing here (D94/D160b).
  var adapter = resolveTransport(settings);
  if (!schema || !transportSupports(settings, 'structuredOutput')
    || typeof (adapter && adapter.callStructured) !== 'function') {
    var unstructuredResponse = await callProvider(settings, prompt, maxTokens, options);
    return {
      result: extractJson(unstructuredResponse.text),
      meta: unstructuredResponse.meta,
      usage: unstructuredResponse.usage
    };
  }

  var structuredOpts = { timeoutMs: settings.requestTimeoutMs || DEFAULT_TIMEOUT_MS };
  // Same absent-means-inert rule as callProvider: a one-shot structured adapter
  // never receives a callback it cannot use, so its request payload is
  // unchanged. A streaming one (the forced tool call) gets the heartbeat, which
  // is why a structured stage on that path no longer reports "nothing back yet"
  // for its whole duration.
  if (typeof (options && options.onStreamTick) === 'function'
    && adapter.capabilities && adapter.capabilities.streaming) {
    structuredOpts.onStreamTick = options.onStreamTick;
  }

  try {
    return await adapter.callStructured(settings, prompt, schema, maxTokens, stageName, structuredOpts);
  } catch (err) {
    if (!shouldFallbackFromStructured(err) || isLikelyTruncationError(err)) throw err;
    console.warn('[LiftRPG] Structured output unavailable for ' + stageName + '; falling back to freeform JSON repair:', err.message);
    var fallbackResponse = await callProvider(settings, prompt, maxTokens, options);
    return {
      result: extractJson(fallbackResponse.text),
      meta: fallbackResponse.meta,
      usage: fallbackResponse.usage
    };
  }
}

// ── Settings resolution ───────────────────────────────────────────────────────

export function resolveStructuredPipelineSettings(settings) {
  var resolved = Object.assign({}, settings || {});

  if (!resolved.apiKey && resolved.geminiApiKey) resolved.apiKey = resolved.geminiApiKey;
  if (!resolved.model && resolved.geminiModel) resolved.model = resolved.geminiModel;
  if (!resolved.baseUrl && (resolved.geminiApiKey || resolved.format === 'gemini')) {
    resolved.baseUrl = PROVIDERS.gemini.baseUrl;
  }
  if (!resolved.model && resolved.baseUrl === PROVIDERS.gemini.baseUrl) {
    resolved.model = PROVIDERS.gemini.defaultModel;
  }
  if (!resolved.format || resolved.format === 'gemini') {
    resolved.format = resolved.baseUrl === PROVIDERS.anthropic.baseUrl ? 'anthropic' : 'openai';
  }
  if (!resolved.baseUrl && resolved.format !== 'anthropic') {
    resolved.baseUrl = PROVIDERS.openai.baseUrl;
  }
  if (!resolved.model) {
    if (resolved.format === 'anthropic') resolved.model = PROVIDERS.anthropic.defaultModel;
    else if (resolved.baseUrl === PROVIDERS.gemini.baseUrl) resolved.model = PROVIDERS.gemini.defaultModel;
    else resolved.model = PROVIDERS.openai.defaultModel;
  }

  return resolved;
}

export function allowsEmptyApiKey(settings) {
  var baseUrl = String((settings && settings.baseUrl) || '').replace(/\/+$/, '');
  return !!(settings && settings.noKey)
    || baseUrl === String(PROVIDERS.ollama.baseUrl || '').replace(/\/+$/, '')
    || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(baseUrl);
}
