// ── Provider transport, pricing, model discovery, and API calls ───────────────
// Extracted from api-generator.js IIFE.
//
// Exports:
//   Transport:  escalatingTimeout, fetchWithTimeout, normalizeUrl
//   Payload:    buildOpenAICompatChatPayload, buildOpenAICompatUrl,
//               buildOpenAICompatHeaders
//   Content:    extractTextContent
//   Calls:      callAnthropic, callOpenAICompat, callProvider
//               callOpenAICompatStructured, callProviderStructured
//   Pricing:    safeNumber, normalizeModelId, normalizeModelFamilyId, escapeRegex,
//               detectProviderId, resolveModelPricing, estimateUsageCostUsd,
//               buildUsageSnapshot, blankUsageTotals, addUsageTotals,
//               humanizeModelLabel, buildOpenAIModelDocsUrl,
//               refreshPricing, MODEL_PRICING_RULES, PRICING_SOURCES,
//               THIRD_PARTY_PRICING_FEED, DEFAULT_PRICING_REFRESH_TIMEOUT_MS
//   Discovery:  listProviderModels, fetchJsonWithTimeout
//   Settings:   resolveStructuredPipelineSettings, allowsEmptyApiKey

import { DEFAULT_TIMEOUT_MS, MAX_OUTPUT_TOKENS, PROVIDERS } from './constants.js';
import { extractJson } from './repair.js';
import { cloneSimple } from './assembly.js';
import {
  buildStructuredStageName,
  isStructuredOutputUnsupportedMessage,
  isLikelyTruncationError,
  isLikelyJsonFailure,
  isLikelyTimeoutError,
  shouldFallbackFromStructured
} from './error-classify.js';

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

// Timeout escalation for retries — if a request timed out, give the next
// attempt more room instead of failing identically. Returns the base timeout
// on attempt 0, then scales up by 50% per subsequent attempt (capped at
// DEFAULT_TIMEOUT_MS so we never exceed the global ceiling).
export function escalatingTimeout(baseMs) {
  var base = baseMs || DEFAULT_TIMEOUT_MS;
  return function (retryState) {
    var attempt = (retryState && retryState.attempt) || 0;
    if (attempt === 0) return base;
    var wasTimeout = retryState.error && isLikelyTimeoutError(retryState.error);
    if (!wasTimeout) return base; // non-timeout failure — same timeout is fine
    var escalated = Math.round(base * (1 + 0.5 * attempt));
    return Math.min(escalated, DEFAULT_TIMEOUT_MS);
  };
}

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
  return String(url || '').replace(/\/+$/, '');
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

// ── Payload builders ──────────────────────────────────────────────────────────

export function buildOpenAICompatChatPayload(model, prompt, maxTokens, extra) {
  var payload = Object.assign({
    model: model,
    // Keep the chat-completions contract conservative across OpenAI-style
    // providers. Some providers reject requests that include both legacy and
    // newer token-limit fields in the same payload.
    max_tokens: maxTokens || MAX_OUTPUT_TOKENS,
    messages: [{ role: 'user', content: prompt }]
  }, extra || {});
  return payload;
}

export function buildOpenAICompatUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '') + '/chat/completions';
}

export function buildOpenAICompatHeaders(apiKey) {
  var headers = { 'content-type': 'application/json' };
  if (apiKey) headers.Authorization = 'Bearer ' + apiKey;
  return headers;
}

// ── Request handlers ──────────────────────────────────────────────────────────

// Anthropic model output token limits — models reject requests above their cap.
var ANTHROPIC_MAX_OUTPUT = {
  'haiku': 64000
  // Sonnet/Opus default to MAX_OUTPUT_TOKENS (65536+)
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

export async function callAnthropic(apiKey, model, prompt, maxTokens, timeoutMs, pricingRule, systemPrompt) {
  var resolvedMax = clampAnthropicMaxTokens(model, maxTokens || MAX_OUTPUT_TOKENS);
  var payload = {
    model: model,
    max_tokens: resolvedMax,
    messages: [{ role: 'user', content: prompt }]
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

  var resp = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'anthropic-beta': 'output-128k-2025-02-19',
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  }, timeoutMs);

  var body = await resp.json();

  if (!resp.ok) {
    var errMsg = (body.error && body.error.message) || ('HTTP ' + resp.status);
    throw new Error('Anthropic API error: ' + errMsg);
  }

  if (!body.content || !body.content[0] || !body.content[0].text) {
    throw new Error('Unexpected Anthropic response shape. Check the console.');
  }

  var rawText = body.content[0].text;
  var meta = {
    provider: 'anthropic',
    stop_reason: body.stop_reason,
    model: body.model,
    usage: body.usage
  };
  window.LiftRPGAPI && (window.LiftRPGAPI.lastRaw = rawText);
  window.LiftRPGAPI && (window.LiftRPGAPI.lastMeta = meta);
  if (body.stop_reason === 'max_tokens') {
    throw new Error(
      'Response truncated: the model hit the output token limit before completing the JSON.\n\n' +
      'The booklet JSON requires more output tokens than this model provided. ' +
      'Switch to a model with a larger output window, or use Chat mode.\n' +
      'Tip: open generator/test-repair.html and click \'Load lastRaw\' to inspect the partial output.'
    );
  }
  return {
    text: rawText,
    meta: meta,
    usage: buildUsageSnapshot('anthropic', body.model || model, body.usage, pricingRule)
  };
}

export async function callOpenAICompat(apiKey, baseUrl, model, prompt, maxTokens, timeoutMs, pricingRule) {
  var url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
  var headers = { 'content-type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = 'Bearer ' + apiKey;
  }

  var resp = await fetchWithTimeout(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(buildOpenAICompatChatPayload(model, prompt, maxTokens))
  }, timeoutMs);

  var body = await resp.json();
  // Gemini may return array-format error responses
  var errObj = Array.isArray(body) ? body[0] : body;

  if (!resp.ok) {
    var errMsg = (errObj.error && errObj.error.message)
      || (errObj.error && errObj.error.status && (errObj.error.status + ': ' + JSON.stringify(errObj.error)))
      || (errObj.message)
      || ('HTTP ' + resp.status + ' \u2014 ' + JSON.stringify(body).slice(0, 500));
    throw new Error('API error: ' + errMsg);
  }

  if (!body.choices || !body.choices[0] || !body.choices[0].message) {
    throw new Error('Unexpected API response shape. Check the console.');
  }

  var rawText = extractTextContent(body.choices[0].message.content);
  var meta = {
    provider: normalizeUrl(baseUrl) === normalizeUrl(PROVIDERS.groq.baseUrl) ? 'groq'
      : normalizeUrl(baseUrl) === normalizeUrl(PROVIDERS.gemini.baseUrl) ? 'gemini'
        : normalizeUrl(baseUrl) === normalizeUrl(PROVIDERS.ollama.baseUrl) ? 'ollama'
          : 'openai',
    finish_reason: body.choices[0].finish_reason,
    model: body.model,
    usage: body.usage
  };
  window.LiftRPGAPI && (window.LiftRPGAPI.lastRaw = rawText);
  window.LiftRPGAPI && (window.LiftRPGAPI.lastMeta = meta);
  if (body.choices[0].finish_reason === 'length' || body.choices[0].finish_reason === 'MAX_TOKENS') {
    throw new Error(
      'Response truncated: the model hit the output token limit before completing the JSON.\n\n' +
      'The booklet JSON requires more output tokens than this model provided. ' +
      'Switch to a model with a larger output window, or use Chat mode.\n' +
      'Tip: open generator/test-repair.html and click \'Load lastRaw\' to inspect the partial output.'
    );
  }
  return {
    text: rawText,
    meta: meta,
    usage: buildUsageSnapshot(meta.provider, body.model || model, body.usage, pricingRule)
  };
}

// ── Provider dispatcher ────────────────────────────────────────────────────────
// Unified dispatch used by both single-stage generate() and generateMultiStage().

export async function callProvider(settings, prompt, maxTokens) {
  var timeoutMs = settings.requestTimeoutMs || DEFAULT_TIMEOUT_MS;
  if (settings.format === 'anthropic') {
    return callAnthropic(settings.apiKey, settings.model, prompt, maxTokens, timeoutMs, settings._pricingRule, settings._systemPrompt);
  }
  return callOpenAICompat(settings.apiKey, settings.baseUrl, settings.model, prompt, maxTokens, timeoutMs, settings._pricingRule);
}

// ── Structured output calls ───────────────────────────────────────────────────

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

  var body = await resp.json();
  var errObj = Array.isArray(body) ? body[0] : body;
  if (!resp.ok) {
    var errMsg = (errObj.error && errObj.error.message)
      || (errObj.error && errObj.error.status && (errObj.error.status + ': ' + JSON.stringify(errObj.error)))
      || errObj.message
      || ('HTTP ' + resp.status + ' \u2014 ' + JSON.stringify(body).slice(0, 500));
    var err = new Error('API error: ' + errMsg);
    if (isStructuredOutputUnsupportedMessage(errMsg)) err.structuredUnsupported = true;
    throw err;
  }

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
    model: body.model,
    usage: body.usage,
    response_mode: 'json_schema'
  };
  var usageSnapshot = buildUsageSnapshot(providerId, body.model || model, body.usage, pricingRule);

  if (message.parsed && typeof message.parsed === 'object') {
    window.LiftRPGAPI && (window.LiftRPGAPI.lastRaw = JSON.stringify(message.parsed, null, 2));
    window.LiftRPGAPI && (window.LiftRPGAPI.lastMeta = meta);
    return {
      result: cloneSimple(message.parsed),
      meta: meta,
      usage: usageSnapshot
    };
  }

  var rawText = extractTextContent(message.content);
  window.LiftRPGAPI && (window.LiftRPGAPI.lastRaw = rawText);
  window.LiftRPGAPI && (window.LiftRPGAPI.lastMeta = meta);

  if (body.choices[0].finish_reason === 'length' || body.choices[0].finish_reason === 'MAX_TOKENS') {
    throw new Error(
      'Response truncated: the model hit the output token limit before completing the JSON.\n\n' +
      'The stage output requires more output tokens than this model provided.'
    );
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

export async function callProviderStructured(settings, prompt, schema, maxTokens, stageName) {
  if (!schema || settings.format === 'anthropic') {
    var unstructuredResponse = await callProvider(settings, prompt, maxTokens);
    return {
      result: extractJson(unstructuredResponse.text),
      meta: unstructuredResponse.meta,
      usage: unstructuredResponse.usage
    };
  }

  try {
    return await callOpenAICompatStructured(
      settings.apiKey,
      settings.baseUrl,
      settings.model,
      prompt,
      schema,
      maxTokens,
      settings.requestTimeoutMs || DEFAULT_TIMEOUT_MS,
      stageName,
      settings._pricingRule
    );
  } catch (err) {
    if (!shouldFallbackFromStructured(err) || isLikelyTruncationError(err)) throw err;
    console.warn('[LiftRPG] Structured output unavailable for ' + stageName + '; falling back to freeform JSON repair:', err.message);
    var fallbackResponse = await callProvider(settings, prompt, maxTokens);
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
