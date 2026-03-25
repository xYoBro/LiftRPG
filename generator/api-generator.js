/**
 * api-generator.js
 *
 * Client-side API integration for the LiftRPG prompt generator.
 * Supports Anthropic and any OpenAI-compatible provider (OpenAI, Groq,
 * Ollama, custom endpoints).
 *
 * Exposes: window.LiftRPGAPI = { PROVIDERS, generate(settings, workout, brief) }
 *
 * SECURITY: API keys are stored in localStorage by the caller and sent
 * directly to the provider. They never pass through any LiftRPG server.
 * Anthropic browser-side access requires the dangerous-direct-browser-access
 * header, which Anthropic provides for exactly this use case.
 */
window.LiftRPGAPI = (function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────

  var DEFAULT_TIMEOUT_MS = 600000; // 10 minutes — long frontier-model stages often exceed 5m
  var DEFAULT_PRICING_REFRESH_TIMEOUT_MS = 20000;
  var PRICING_VERIFIED_AT = '2026-03-23';

  // Canonical document type list — single source of truth for schema enums + validator
  var DOCUMENT_TYPE_ENUM = ['memo', 'report', 'inspection', 'fieldNote',
    'correspondence', 'transcript', 'form', 'anomaly'];
  // Legacy alias: 'letter' has no CSS treatment — normalize to 'correspondence'
  var DOCUMENT_TYPE_ALIASES = { 'letter': 'correspondence' };

  var VALID_MAP_TYPES = ['grid', 'point-to-point', 'linear-track', 'player-drawn'];
  var VALID_COMPANION_TYPES = ['dashboard', 'return-box', 'inventory-grid', 'token-sheet',
    'overlay-window', 'stress-track', 'memory-slots'];
  var VALID_CLOCK_TYPES = ['progress-clock', 'danger-clock', 'racing-clock',
    'tug-of-war-clock', 'linked-clock', 'project-clock'];
  var VALID_ARCHETYPES = ['government', 'cyberpunk', 'scifi', 'fantasy', 'noir',
    'steampunk', 'minimalist', 'nautical', 'occult', 'pastoral'];

  // ── Rate Limiter + Daily Budget ─────────────────────────────────────────────

  var BUDGET_KEY = 'liftrpg_api_daily_budget';
  var RATE_WINDOW_MS = 60000;  // 1 minute
  var RATE_MAX_CALLS = 5;      // 5 calls per minute (Gemini free tier)
  var DAILY_CALL_LIMIT = 20;   // Gemini free tier: 20 API calls/day

  function getDailyBudget() {
    var raw = null;
    try { raw = localStorage.getItem(BUDGET_KEY); } catch (_e) { /* private browsing */ }
    var budget = raw ? JSON.parse(raw) : null;
    var today = new Date().toISOString().slice(0, 10);
    if (!budget || budget.date !== today) {
      return { date: today, calls: 0, tokens: 0, timestamps: [] };
    }
    // Clean stale timestamps (older than RATE_WINDOW_MS)
    var now = Date.now();
    if (Array.isArray(budget.timestamps)) {
      budget.timestamps = budget.timestamps.filter(function (t) { return t > now - RATE_WINDOW_MS; });
    } else {
      budget.timestamps = [];
    }
    return budget;
  }

  function saveDailyBudget(budget) {
    try { localStorage.setItem(BUDGET_KEY, JSON.stringify(budget)); } catch (_e) { /* quota */ }
  }

  function recordApiCall(tokenCount) {
    var budget = getDailyBudget();
    budget.calls++;
    budget.tokens += (tokenCount || 0);
    budget.timestamps.push(Date.now());
    saveDailyBudget(budget);
  }

  function isGeminiProvider(settings) {
    var providerId = detectProviderId(settings);
    return providerId === 'gemini' || providerId === 'google' || providerId === 'google-free';
  }

  function createRateLimiter(maxCalls, windowMs) {
    // Load persisted timestamps from localStorage
    var budget = getDailyBudget();
    var timestamps = (budget.timestamps || []).slice();

    return {
      async waitForSlot() {
        var now = Date.now();
        timestamps = timestamps.filter(function (t) { return t > now - windowMs; });
        if (timestamps.length >= maxCalls) {
          var waitUntil = timestamps[0] + windowMs;
          var delay = waitUntil - now;
          if (delay > 0) {
            emitRateLimitWait(delay);
            await sleep(delay);
          }
        }
        timestamps.push(Date.now());
        // Persist for cross-run collision prevention
        var b = getDailyBudget();
        b.timestamps = timestamps.slice();
        saveDailyBudget(b);
      }
    };
  }

  function emitRateLimitWait(delayMs) {
    console.log('[LiftRPG] Rate limit: waiting ' + Math.ceil(delayMs / 1000) + 's for next slot.');
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function estimatePipelineCalls(weekCount) {
    // 3 setup + weekCount weeks + ceil(weekCount/2) fragment batches (max 3) + 1 ending
    var fragBatches = Math.min(3, Math.ceil(weekCount / 2));
    return 3 + weekCount + fragBatches + 1;
  }

  function checkDailyBudget(settings, weekCount) {
    if (!isGeminiProvider(settings)) return null;
    var budget = getDailyBudget();
    var remaining = Math.max(0, DAILY_CALL_LIMIT - budget.calls);
    var estimated = estimatePipelineCalls(weekCount);
    if (remaining < estimated) {
      return {
        remaining: remaining,
        estimated: estimated,
        used: budget.calls,
        limit: DAILY_CALL_LIMIT
      };
    }
    return null;
  }

  // ── Provider presets ────────────────────────────────────────────────────────

  var PROVIDERS = {
    anthropic: {
      label: 'Claude (Anthropic)',
      baseUrl: 'https://api.anthropic.com',
      defaultModel: 'claude-sonnet-4-6',
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

  var PRICING_SOURCES = {
    anthropic: {
      label: 'Anthropic pricing',
      url: 'https://docs.anthropic.com/en/docs/about-claude/pricing'
    },
    openai: {
      label: 'OpenAI pricing',
      url: 'https://platform.openai.com/pricing'
    },
    groq: {
      label: 'Groq model pricing',
      url: 'https://console.groq.com/docs/models'
    },
    gemini: {
      label: 'Gemini Developer API pricing',
      url: 'https://ai.google.dev/pricing'
    }
  };

  // Centralized third-party pricing fallback configuration.
  // If this ecosystem shifts again, update this single object first.
  var THIRD_PARTY_PRICING_FEED = {
    id: 'pricetoken',
    enabled: true,
    label: 'PriceToken pricing API',
    siteUrl: 'https://pricetoken.ai/',
    modelEndpointBase: 'https://pricetoken.ai/api/v1/text/'
  };

  var MODEL_PRICING_RULES = [
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

  // ── Fetch with timeout ────────────────────────────────────────────────────
  // Wraps fetch() with an AbortController so long-running requests don't hang
  // silently. Default 10 minutes; override via settings.requestTimeoutMs.

  function fetchWithTimeout(url, options, timeoutMs) {
    var ms = timeoutMs || DEFAULT_TIMEOUT_MS;
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, ms);
    var merged = Object.assign({}, options, { signal: controller.signal });
    return fetch(url, merged)
      .catch(function (err) {
        if (err.name === 'AbortError') {
          throw new Error(
            'Request timed out after ' + Math.round(ms / 1000) + 's. ' +
            'The model may need more time, or the request may have stalled. Try again.'
          );
        }
        throw err;
      })
      .finally(function () { clearTimeout(timer); });
  }

  function normalizeUrl(url) {
    return String(url || '').replace(/\/+$/, '');
  }

  function safeNumber(value) {
    var num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : 0;
  }

  function normalizeModelId(value) {
    return String(value || '').trim().toLowerCase();
  }

  function escapeRegex(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeModelFamilyId(modelId) {
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

  function detectProviderId(settings, responseProviderId) {
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

  function resolveModelPricing(providerId, modelId, usage, overrideRule) {
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

  function estimateUsageCostUsd(usage, pricing) {
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

  function buildUsageSnapshot(providerId, modelId, usage, pricingRule) {
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

  function blankUsageTotals() {
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

  function addUsageTotals(target, sample) {
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

  function humanizeModelLabel(modelId) {
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

  function buildOpenAIModelDocsUrl(modelId) {
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

  async function refreshPricing(settings, options) {
    var resolved = Object.assign({}, settings || {});
    var providerId = detectProviderId(resolved);
    var modelId = String(resolved.model || '').trim();
    var timeoutMs = (options && options.timeoutMs) || Math.min(resolved.requestTimeoutMs || DEFAULT_TIMEOUT_MS, DEFAULT_PRICING_REFRESH_TIMEOUT_MS);
    var fallbackRule = findMatchingPricingRule(MODEL_PRICING_RULES, providerId, modelId);
    var liveRule = null;
    var thirdPartyRule = null;
    var officialRefreshError = '';
    var refreshError = '';

    try {
      liveRule = await fetchLivePricingRule(providerId, modelId, timeoutMs);
      if (!liveRule) {
        officialRefreshError = 'Official pricing did not expose a parseable entry for ' + (modelId || 'the selected model') + '.';
      }
    } catch (error) {
      officialRefreshError = describePricingFetchError(error, 'Browser could not fetch the official provider pricing page directly.');
    }

    if (!liveRule && THIRD_PARTY_PRICING_FEED.enabled) {
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

  function fetchJsonWithTimeout(url, options, timeoutMs) {
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

  function buildOpenAICompatChatPayload(model, prompt, maxTokens, extra) {
    var payload = Object.assign({
      model: model,
      // Keep the chat-completions contract conservative across OpenAI-style
      // providers. Some providers reject requests that include both legacy and
      // newer token-limit fields in the same payload.
      max_tokens: maxTokens || 65536,
      messages: [{ role: 'user', content: prompt }]
    }, extra || {});
    return payload;
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

  async function listProviderModels(settings) {
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

  // ── Content extraction helpers ────────────────────────────────────────────
  // OpenAI-compatible responses may return content as a string or an array of
  // typed parts (e.g. [{ type: "text", text: "..." }]).

  function extractTextContent(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter(function (p) { return p && (p.type === 'text' || p.text); })
        .map(function (p) { return p.text || ''; })
        .join('');
    }
    return String(content || '');
  }

  // ── Request handlers ────────────────────────────────────────────────────────

  async function callAnthropic(apiKey, model, prompt, maxTokens, timeoutMs, pricingRule, systemPrompt) {
    var payload = {
      model: model,
      max_tokens: maxTokens || 32000,
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

  async function callOpenAICompat(apiKey, baseUrl, model, prompt, maxTokens, timeoutMs, pricingRule) {
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
        || ('HTTP ' + resp.status + ' — ' + JSON.stringify(body).slice(0, 500));
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

  // ── JSON repair ─────────────────────────────────────────────────────────────
  //
  // LLMs regularly produce JSON that is structurally correct but fails to parse.
  // Root causes addressed here:
  //
  //  1. Raw control characters in strings  (newlines, tabs, CR, U+0000–U+001F)
  //  2. Stray backslashes                  (Windows paths, LaTeX, regex)
  //  3. Unescaped double-quotes in strings (HTML attrs: class="x", "scare quotes")
  //  4. Trailing commas                    (before } or ])
  //  5. Missing commas between items       (adjacent } { or ] [)
  //  6. Python/JS literals                 (True, False, None, NaN, etc.)
  //
  // Strategy:
  //  - findJsonBounds: depth-counting walk to find the exact root {…} block,
  //    not fragile indexOf/lastIndexOf which can grab trailing text.
  //  - walkAndRepair: single character pass fixing issues 1–3. For unescaped
  //    quotes, heuristic: if the char after " (ignoring whitespace) is NOT a
  //    JSON structural char (,:}]) then we're inside a string, escape it.
  //  - fixLiterals: string-aware replacement of Python/JS literals (issue 6).
  //    Only replaces outside JSON string values to avoid corrupting prose.
  //  - fixStructural: regex pass for issues 4–5.
  //  - extractJson runs direct parse first (fast path), then repair, so clean
  //    JSON pays no cost.

  // ── bounds ──────────────────────────────────────────────────────────────────

  function findJsonBounds(text) {
    var depth = 0, inStr = false, esc = false, start = -1;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (esc) { esc = false; continue; }
      if (c === '\\' && inStr) { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') { if (depth++ === 0) start = i; }
      else if (c === '}') { if (--depth === 0 && start !== -1) return [start, i]; }
    }
    // Fallback: first { to last } (handles unterminated JSON)
    var a = text.indexOf('{'), b = text.lastIndexOf('}');
    return (a !== -1 && b > a) ? [a, b] : null;
  }

  // ── character walk ───────────────────────────────────────────────────────────

  var VALID_ESC = { '"': 1, '\\': 1, '/': 1, b: 1, f: 1, n: 1, r: 1, t: 1, u: 1 };
  // After a string closes, valid JSON structural separators follow
  var AFTER_STRING = { ',': 1, '}': 1, ']': 1, ':': 1, '/': 1 };  // / starts a comment

  function peekStructural(text, from) {
    for (var k = from; k < text.length; k++) {
      var p = text[k];
      if (p !== ' ' && p !== '\t' && p !== '\r' && p !== '\n') return p;
    }
    return '';  // end of input = also fine to close a string
  }

  function walkAndRepair(text) {
    var out = [], inStr = false, esc = false;

    for (var i = 0; i < text.length; i++) {
      var c = text[i];

      // Pass-through: character following a valid escape sequence
      if (esc) { out.push(c); esc = false; continue; }

      // JS-style comments: skip when not inside a string
      if (!inStr && c === '/') {
        var nx2 = text[i + 1] || '';
        if (nx2 === '/') {                      // line comment
          while (i < text.length && text[i] !== '\n') i++;
          continue;
        } else if (nx2 === '*') {               // block comment
          i += 2;
          while (i < text.length - 1 && !(text[i] === '*' && text[i + 1] === '/')) i++;
          i++;  // skip closing '/'
          continue;
        }
      }

      // Backslash inside string: validate or double-escape
      if (c === '\\' && inStr) {
        var nx = text[i + 1] || '';
        if (VALID_ESC[nx]) { out.push(c); esc = true; }
        else { out.push('\\\\'); }  // stray backslash
        continue;
      }

      // Double-quote: decide open / close / escape-in-place
      if (c === '"') {
        if (inStr) {
          var peek = peekStructural(text, i + 1);
          if (AFTER_STRING[peek] || peek === '') {
            // Followed by a structural char — legitimate end of string
            inStr = false;
            out.push('"');
          } else {
            // Followed by content — unescaped quote inside the string value
            out.push('\\"');
          }
        } else {
          inStr = true;
          out.push('"');
        }
        continue;
      }

      // Inside a string: escape raw control characters
      if (inStr) {
        var code = c.charCodeAt(0);
        if (c === '\n') { out.push('\\n'); continue; }
        else if (c === '\r') { out.push('\\r'); continue; }
        else if (c === '\t') { out.push('\\t'); continue; }
        else if (code < 0x20) {
          out.push('\\u' + ('0000' + code.toString(16)).slice(-4));
          continue;
        }
      }

      out.push(c);
    }

    return out.join('');
  }

  // ── structural regex fixes ───────────────────────────────────────────────────

  function fixStructural(text) {
    // 1. Trailing comma before } or ]
    text = text.replace(/,(?=\s*[}\]])/g, '');

    // 2. Missing comma between adjacent items:
    //    }{  ][  ]["  }[  ]{  ]"  }"  — only when separated by whitespace
    //    (whitespace guard avoids firing on root-level double-objects, which
    //    are unfixable anyway and need Chat mode)
    text = text.replace(/([}\]])(\s+)([{[\"])/g, function (_, close, ws, open) {
      return close + ',' + ws + open;
    });

    return text;
  }

  // ── Python / JS literal normalisation ───────────────────────────────────────
  // String-aware: only replaces literals outside JSON string values to avoid
  // corrupting prose like "None of the above" → "null of the above".
  // Runs AFTER walkAndRepair so string escaping is normalised first.

  var LITERAL_KEYWORDS = {
    'True': 'true', 'False': 'false', 'None': 'null',
    'NaN': 'null', 'Infinity': 'null', 'undefined': 'null'
  };

  function fixLiterals(text) {
    var out = '';
    var inStr = false;
    var esc = false;
    var i = 0;

    while (i < text.length) {
      var c = text[i];

      if (esc) { out += c; esc = false; i++; continue; }
      if (c === '\\' && inStr) { out += c; esc = true; i++; continue; }
      if (c === '"') { inStr = !inStr; out += c; i++; continue; }
      if (inStr) { out += c; i++; continue; }

      // Outside string: check for keyword at word boundary
      var matched = false;
      if (/[A-Z_a-z]/.test(c)) {
        var before = i > 0 ? text[i - 1] : '';
        if (!before || !/\w/.test(before)) {
          for (var kw in LITERAL_KEYWORDS) {
            if (text.substring(i, i + kw.length) === kw) {
              var after = text[i + kw.length];
              if (!after || !/\w/.test(after)) {
                out += LITERAL_KEYWORDS[kw];
                i += kw.length;
                matched = true;
                break;
              }
            }
          }
        }
      }

      if (!matched) { out += c; i++; }
    }

    return out;
  }

  // ── public repair entry point ────────────────────────────────────────────────

  function repairJson(text) {
    // walkAndRepair first (normalises escapes), then fixLiterals (string-aware),
    // then fixStructural (trailing commas, missing commas)
    return fixStructural(fixLiterals(walkAndRepair(text)));
  }

  // ── JSON extraction ──────────────────────────────────────────────────────────

  function extractJson(text) {
    // 1. Strip BOM
    var cleaned = text.replace(/^\uFEFF/, '');

    // 2. Extract from ```json ... ``` fenced block anywhere in the text
    var fenceMatch = cleaned.match(/```json\s*([\s\S]*?)```/i);
    if (!fenceMatch) {
      // Also try plain ``` fences (some models omit "json" label)
      fenceMatch = cleaned.match(/```\s*([\s\S]*?)```/);
    }
    var stripped = fenceMatch ? fenceMatch[1].trim() : cleaned.trim();

    // 3. Doubled JSON — model serialised the JSON twice
    if (stripped.charAt(0) === '"' && stripped.charAt(stripped.length - 1) === '"') {
      try {
        var maybeInner = JSON.parse(stripped);
        if (typeof maybeInner === 'string' && maybeInner.trim().charAt(0) === '{') {
          try { return JSON.parse(maybeInner); } catch (e) { /* fall through */ }
        }
      } catch (e) { /* not a valid JSON string, continue */ }
    }

    // 4. Locate root {…} with depth counting (not fragile lastIndexOf)
    var bounds = findJsonBounds(stripped);
    if (!bounds) {
      throw new Error(
        'No JSON object found in the response. Try again, or use Chat mode.\n\n' +
        'Response preview: ' + text.slice(0, 300)
      );
    }
    var jsonStr = stripped.slice(bounds[0], bounds[1] + 1);

    // 5. Fast path: direct parse
    try {
      return JSON.parse(jsonStr);
    } catch (e1) {
      console.warn('[LiftRPG] Direct parse failed (' + e1.message + ') — attempting repair');
      console.log('[LiftRPG] Raw JSON (first 500):', jsonStr.slice(0, 500));
    }

    // 6. Repair path
    var repaired = repairJson(jsonStr);
    try {
      return JSON.parse(repaired);
    } catch (e2) {
      console.error('[LiftRPG] Repair failed:', e2.message);
      console.log('[LiftRPG] Repaired JSON (first 500):', repaired.slice(0, 500));
      console.log('[LiftRPG] Full raw length:', repaired.length, '— access window.LiftRPGAPI.lastRaw for full text');
      var msg = e2.message || '';
      var msgL = msg.toLowerCase();
      var isTruncated = msgL.indexOf('unterminated') !== -1
        || msgL.indexOf('unexpected end') !== -1
        || msgL.indexOf('unexpected eof') !== -1
        || msgL.indexOf('end of file') !== -1
        || msgL.indexOf("expected ']'") !== -1
        || msgL.indexOf("expected '}'") !== -1;
      throw new Error(
        'Malformed JSON: ' + msg + '\n\n' +
        (isTruncated
          ? 'The response was cut off (output token limit). Switch to a model with a larger output window, or use Chat mode.'
          : 'The JSON could not be repaired automatically. Check the browser console for the raw output, then use Chat mode to paste manually.')
      );
    }
  }

  // ── Provider dispatcher ────────────────────────────────────────────────────
  // Unified dispatch used by both single-stage generate() and generateMultiStage().

  async function callProvider(settings, prompt, maxTokens) {
    var timeoutMs = settings.requestTimeoutMs || DEFAULT_TIMEOUT_MS;
    if (settings.format === 'anthropic') {
      return callAnthropic(settings.apiKey, settings.model, prompt, maxTokens, timeoutMs, settings._pricingRule, settings._systemPrompt);
    }
    return callOpenAICompat(settings.apiKey, settings.baseUrl, settings.model, prompt, maxTokens, timeoutMs, settings._pricingRule);
  }

  // ── ID normalisation ────────────────────────────────────────────────────────
  // Soft matching for fragment IDs: "F.01" vs "F-01" vs "f_01" all match.
  // Used in validation only — never rewrites IDs in the booklet.

  function normalizeId(id) {
    return String(id || '').toLowerCase().replace(/[-_.\s]/g, '');
  }

  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i++) {
      var value = arguments[i];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
    return '';
  }

  function toSlugWords(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function inferArtifactClassFromShell(shell) {
    var cover = shell.cover || {};
    var meta = shell.meta || {};
    var theme = shell.theme || {};
    var source = toSlugWords([
      cover.designation,
      cover.title,
      cover.subtitle,
      meta.blockSubtitle,
      meta.worldContract,
      meta.weeklyComponentType
    ].join(' '));

    if (!source) {
      switch (String(theme.visualArchetype || '').toLowerCase()) {
        case 'government': return 'classified incident packet';
        case 'nautical': return 'ship logbook';
        case 'minimalist': return 'technical field manual';
        case 'occult': return 'devotional manual';
        default: return 'field survey folio';
      }
    }

    if (/\b(ship|deck|captain|hull|compartment|navigation|voyage)\b/.test(source)) return 'ship logbook';
    if (/\b(court|docket|testimony|deposition|verdict)\b/.test(source)) return 'court packet';
    if (/\b(devotional|liturgy|prayer|rite|choir|chapel)\b/.test(source)) return 'devotional manual';
    if (/\b(binder|witness|statement|interview|profile)\b/.test(source)) return 'witness binder';
    if (/\b(archive|household|family|estate|ledger)\b/.test(source)) return 'household archive';
    if (/\b(manual|protocol|maintenance|operations|procedure)\b/.test(source)) return 'technical field manual';
    if (/\b(packet|dossier|classified|incident|agency|office)\b/.test(source)) return 'classified incident packet';
    return 'field survey folio';
  }

  function inferShellFamily(artifactClass, themeArchetype) {
    var artifact = toSlugWords(artifactClass);
    if (artifact.indexOf('ship') !== -1) return 'ship-logbook';
    if (artifact.indexOf('court') !== -1) return 'court-packet';
    if (artifact.indexOf('devotional') !== -1) return 'devotional-manual';
    if (artifact.indexOf('witness') !== -1) return 'witness-binder';
    if (artifact.indexOf('archive') !== -1 || artifact.indexOf('household') !== -1) return 'household-archive';
    if (artifact.indexOf('manual') !== -1) return 'technical-manual';
    if (artifact.indexOf('packet') !== -1 || artifact.indexOf('dossier') !== -1 || themeArchetype === 'government') {
      return 'classified-packet';
    }
    return 'field-survey';
  }

  function inferBoardStateMode(shell, campaignPlan) {
    var metaIdentity = (((shell || {}).meta || {}).artifactIdentity || {});
    if (metaIdentity.boardStateMode) return String(metaIdentity.boardStateMode);

    var topology = (((campaignPlan || {}).topology || {}).type || '').toLowerCase();
    if (topology) {
      if (topology.indexOf('timeline') !== -1) return 'timeline-reconstruction';
      if (topology.indexOf('route') !== -1) return 'route-tracker';
      if (topology.indexOf('node') !== -1) return 'node-graph';
    }

    var componentType = String((((shell || {}).meta || {}).weeklyComponentType) || '').toLowerCase();
    if (componentType.indexOf('station') !== -1 || componentType.indexOf('gauge') !== -1) return 'survey-grid';
    if (componentType.indexOf('ledger') !== -1) return 'ledger-board';
    return 'survey-grid';
  }

  function inferAttachmentStrategy(shellFamily, boardStateMode) {
    if (boardStateMode === 'timeline-reconstruction' || boardStateMode === 'testimony-matrix') {
      return 'narrative-support';
    }
    if (shellFamily === 'classified-packet' || shellFamily === 'technical-manual' || shellFamily === 'ship-logbook') {
      return 'split-technical';
    }
    if (shellFamily === 'witness-binder' || shellFamily === 'household-archive') {
      return 'single-dominant';
    }
    return 'split-technical';
  }

  function normalizeArtifactIdentity(rawIdentity, shell, campaignPlan) {
    var identity = rawIdentity && typeof rawIdentity === 'object' ? rawIdentity : {};
    var themeArchetype = String((((shell || {}).theme || {}).visualArchetype) || '').toLowerCase();
    var artifactClass = firstNonEmpty(identity.artifactClass, inferArtifactClassFromShell(shell));
    var shellFamily = firstNonEmpty(identity.shellFamily, inferShellFamily(artifactClass, themeArchetype));
    var boardStateMode = firstNonEmpty(identity.boardStateMode, inferBoardStateMode(shell, campaignPlan));
    var attachmentStrategy = firstNonEmpty(identity.attachmentStrategy, inferAttachmentStrategy(shellFamily, boardStateMode));

    return {
      artifactClass: artifactClass,
      artifactBlend: Array.isArray(identity.artifactBlend) ? identity.artifactBlend.slice(0, 4) : (identity.artifactBlend || ''),
      authorialMode: firstNonEmpty(identity.authorialMode, themeArchetype === 'government' ? 'procedural' : ''),
      boardStateMode: boardStateMode,
      documentEcology: identity.documentEcology || '',
      materialCulture: identity.materialCulture || '',
      openingMode: firstNonEmpty(identity.openingMode, shellFamily === 'classified-packet' ? 'briefing' : 'artifact-first'),
      rulesDeliveryMode: firstNonEmpty(identity.rulesDeliveryMode, shellFamily === 'devotional-manual' ? 'diegetic-procedure' : 'mixed'),
      revealShape: identity.revealShape || '',
      unlockLogic: identity.unlockLogic || '',
      shellFamily: shellFamily,
      attachmentStrategy: attachmentStrategy
    };
  }

  function ensureArtifactIdentity(shell, campaignPlan) {
    if (!shell || typeof shell !== 'object') return null;
    if (!shell.meta) shell.meta = {};
    var normalized = normalizeArtifactIdentity(shell.meta.artifactIdentity, shell, campaignPlan);
    shell.meta.artifactIdentity = normalized;
    return normalized;
  }

  function cloneSimple(value) {
    if (value === undefined || value === null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function buildIdentityContract(shell, campaignPlan) {
    shell = shell || {};
    ensureArtifactIdentity(shell, campaignPlan || null);
    var meta = shell.meta || {};
    return {
      worldContract: meta.worldContract || '',
      narrativeVoice: cloneSimple(meta.narrativeVoice) || null,
      literaryRegister: cloneSimple(meta.literaryRegister) || null,
      structuralShape: cloneSimple(meta.structuralShape) || null,
      weeklyComponentType: meta.weeklyComponentType || '',
      artifactIdentity: cloneSimple(meta.artifactIdentity) || null
    };
  }

  function equalJsonLike(a, b) {
    return JSON.stringify(a || null) === JSON.stringify(b || null);
  }

  function compareIdentityContract(booklet, contract) {
    var errors = [];
    if (!booklet || !contract) return errors;
    var meta = booklet.meta || {};
    var expectedIdentity = contract.artifactIdentity || {};
    var actualIdentity = normalizeArtifactIdentity(meta.artifactIdentity, { meta: meta, theme: booklet.theme || {} }, null);

    if (contract.worldContract && meta.worldContract !== contract.worldContract) {
      errors.push('meta.worldContract drifted from the approved shell contract');
    }
    if (contract.weeklyComponentType && meta.weeklyComponentType !== contract.weeklyComponentType) {
      errors.push('meta.weeklyComponentType drifted from "' + contract.weeklyComponentType + '"');
    }
    if (contract.narrativeVoice && !equalJsonLike(meta.narrativeVoice, contract.narrativeVoice)) {
      errors.push('meta.narrativeVoice drifted from the approved shell contract');
    }
    if (contract.literaryRegister && !equalJsonLike(meta.literaryRegister, contract.literaryRegister)) {
      errors.push('meta.literaryRegister drifted from the approved shell contract');
    }
    if (contract.structuralShape && !equalJsonLike(meta.structuralShape, contract.structuralShape)) {
      errors.push('meta.structuralShape drifted from the approved shell contract');
    }

    Object.keys(expectedIdentity).forEach(function (key) {
      if (!expectedIdentity[key]) return;
      if (JSON.stringify(actualIdentity[key] || null) !== JSON.stringify(expectedIdentity[key] || null)) {
        errors.push('meta.artifactIdentity.' + key + ' drifted from "' + expectedIdentity[key] + '"');
      }
    });

    return errors;
  }

  function enforceIdentityContract(booklet, contract) {
    if (!booklet || !contract) return;
    booklet.meta = booklet.meta || {};
    if (contract.worldContract) booklet.meta.worldContract = contract.worldContract;
    if (contract.weeklyComponentType) booklet.meta.weeklyComponentType = contract.weeklyComponentType;
    if (contract.narrativeVoice) booklet.meta.narrativeVoice = cloneSimple(contract.narrativeVoice);
    if (contract.literaryRegister) booklet.meta.literaryRegister = cloneSimple(contract.literaryRegister);
    if (contract.structuralShape) booklet.meta.structuralShape = cloneSimple(contract.structuralShape);
    if (contract.artifactIdentity) booklet.meta.artifactIdentity = cloneSimple(contract.artifactIdentity);
  }

  function formatIdentityContractLines(contract) {
    if (!contract) return [];
    var lines = [
      '- Preserve shell identity exactly. Do not normalize this booklet into generic field dossier grammar.'
    ];
    if (contract.worldContract) lines.push('- Keep meta.worldContract exactly: ' + contract.worldContract);
    if (contract.weeklyComponentType) lines.push('- Keep meta.weeklyComponentType: ' + contract.weeklyComponentType);
    if (contract.artifactIdentity) {
      lines.push('- Keep meta.artifactIdentity exactly: ' + JSON.stringify(contract.artifactIdentity));
      if (contract.artifactIdentity.shellFamily) lines.push('- Do not change shellFamily: ' + contract.artifactIdentity.shellFamily);
      if (contract.artifactIdentity.boardStateMode) lines.push('- Do not change boardStateMode: ' + contract.artifactIdentity.boardStateMode);
      if (contract.artifactIdentity.openingMode) lines.push('- Do not change openingMode: ' + contract.artifactIdentity.openingMode);
      if (contract.artifactIdentity.rulesDeliveryMode) lines.push('- Do not change rulesDeliveryMode: ' + contract.artifactIdentity.rulesDeliveryMode);
      if (contract.artifactIdentity.unlockLogic) lines.push('- Do not change unlockLogic: ' + contract.artifactIdentity.unlockLogic);
    }
    if (contract.narrativeVoice) lines.push('- Keep meta.narrativeVoice exactly as provided.');
    if (contract.literaryRegister) lines.push('- Keep meta.literaryRegister exactly as provided.');
    if (contract.structuralShape) lines.push('- Keep meta.structuralShape exactly as provided.');
    return lines;
  }

  function extractEndingBodyText(entry) {
    if (!entry || typeof entry !== 'object') return '';
    if (typeof entry.content === 'string') return entry.content;
    if (entry.content && typeof entry.content === 'object') {
      return firstNonEmpty(entry.content.body, entry.content.content, entry.content.html);
    }
    return firstNonEmpty(entry.body, entry.text);
  }

  var SIGNAL_TOKEN_STOPWORDS = {
    the: 1, and: 1, with: 1, from: 1, into: 1, this: 1, that: 1, then: 1,
    were: 1, have: 1, your: 1, their: 1, there: 1, while: 1, after: 1,
    before: 1, where: 1, which: 1, shall: 1, would: 1, could: 1, about: 1
  };
  var COUNT_WORDS = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };
  var CONTINUITY_PHRASE_PATTERNS = [
    /\b([a-z0-9-]+(?:\s+[a-z0-9-]+){0,2}\s+cipher)\b/gi,
    /\b([a-z0-9-]+(?:\s+[a-z0-9-]+){0,2}\s+relay)\b/gi,
    /\b([a-z0-9-]+(?:\s+[a-z0-9-]+){0,2}\s+clearance)\b/gi
  ];

  function extractYearsFromText(text) {
    var matches = String(text || '').match(/\b(18|19|20)\d{2}\b/g) || [];
    return matches.map(function (year) { return Number(year); });
  }

  function addSignalTokens(target, text) {
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .forEach(function (token) {
        if (!token || token.length < 4 || SIGNAL_TOKEN_STOPWORDS[token]) return;
        target[token] = true;
      });
  }

  function collectAnchoredPhrases(text) {
    var source = String(text || '').toLowerCase();
    var phrases = {};

    CONTINUITY_PHRASE_PATTERNS.forEach(function (pattern) {
      pattern.lastIndex = 0;
      var match;
      while ((match = pattern.exec(source))) {
        var phrase = String(match[1] || '').replace(/\s+/g, ' ').trim();
        if (!phrase) continue;
        phrases[phrase] = true;
      }
    });

    return Object.keys(phrases);
  }

  function addAnchoredPhrases(target, text) {
    collectAnchoredPhrases(text).forEach(function (phrase) {
      target[phrase] = true;
    });
  }

  function parseCountToken(token) {
    if (token === undefined || token === null) return 0;
    var normalized = String(token).trim().toLowerCase();
    if (COUNT_WORDS[normalized]) return COUNT_WORDS[normalized];
    return parseInt(normalized, 10) || 0;
  }

  function extractInputCountClaims(text) {
    var claims = [];
    var seen = {};
    var pattern = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:true\s+|recorded\s+|convergence\s+|component\s+|weekly\s+|final\s+|real\s+)?inputs?\b/gi;
    var match;

    while ((match = pattern.exec(String(text || '')))) {
      var phrase = String(match[0] || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!phrase || seen[phrase]) continue;
      seen[phrase] = true;
      claims.push({
        phrase: phrase,
        value: parseCountToken(match[1])
      });
    }

    return claims;
  }

  function buildContinuityLedger(context) {
    context = context || {};
    var shell = context.shell || {};
    var campaignPlan = context.campaignPlan || {};
    var weekChunkOutputs = context.weekChunkOutputs || [];
    var fragmentsOutput = context.fragmentsOutput || {};
    var endingsOutput = context.endingsOutput || {};
    var identity = ensureArtifactIdentity(shell, campaignPlan) || {};
    var weeks = [];
    var fragmentIds = {};
    var overflowIds = {};
    var componentValues = [];
    var cipherTypes = [];
    var sessionFragmentRefs = {};
    var oracleFragmentRefs = {};
    var knownSignalTokens = {};
    var knownAnchoredPhrases = {};
    var priorYears = {};

    addSignalTokens(knownSignalTokens, (shell.meta || {}).worldContract);
    addSignalTokens(knownSignalTokens, (((shell.meta || {}).artifactIdentity || {}).artifactClass || ''));
    addAnchoredPhrases(knownAnchoredPhrases, (shell.meta || {}).worldContract);

    weekChunkOutputs.forEach(function (chunk) {
      (chunk.weeks || []).forEach(function (week) {
        weeks.push(week);
        var wc = week.weeklyComponent || {};
        if (!week.isBossWeek && wc.value !== undefined && wc.value !== null && wc.value !== '') {
          componentValues.push(String(wc.value));
        }
        if (week.overflowDocument && week.overflowDocument.id) {
          overflowIds[normalizeId(week.overflowDocument.id)] = true;
        }
        var cipherType = (((week.fieldOps || {}).cipher || {}).type || '').trim();
        if (cipherType) cipherTypes.push(cipherType);
        addSignalTokens(knownSignalTokens, week.title);
        addSignalTokens(knownSignalTokens, ((week.fieldOps || {}).cipher || {}).title);
        addAnchoredPhrases(knownAnchoredPhrases, week.title);
        addAnchoredPhrases(knownAnchoredPhrases, ((week.fieldOps || {}).cipher || {}).title);
        extractYearsFromText(week.title).forEach(function (year) { priorYears[year] = true; });
        (week.sessions || []).forEach(function (session) {
          if (session.fragmentRef) sessionFragmentRefs[normalizeId(session.fragmentRef)] = true;
          addSignalTokens(knownSignalTokens, session.storyPrompt);
          addAnchoredPhrases(knownAnchoredPhrases, session.storyPrompt);
          extractYearsFromText(session.storyPrompt).forEach(function (year) { priorYears[year] = true; });
        });
        ((((week.fieldOps || {}).oracleTable || {}).entries) || []).forEach(function (entry) {
          if (entry.fragmentRef) oracleFragmentRefs[normalizeId(entry.fragmentRef)] = true;
          addSignalTokens(knownSignalTokens, entry.text);
          addAnchoredPhrases(knownAnchoredPhrases, entry.text);
          extractYearsFromText(entry.text).forEach(function (year) { priorYears[year] = true; });
        });
        ((((week.fieldOps || {}).oracle || {}).entries) || []).forEach(function (entry) {
          if (entry.fragmentRef) oracleFragmentRefs[normalizeId(entry.fragmentRef)] = true;
          addSignalTokens(knownSignalTokens, entry.text);
          addAnchoredPhrases(knownAnchoredPhrases, entry.text);
          extractYearsFromText(entry.text).forEach(function (year) { priorYears[year] = true; });
        });
        if (week.overflowDocument) {
          addSignalTokens(knownSignalTokens, week.overflowDocument.title);
          addSignalTokens(knownSignalTokens, week.overflowDocument.content || week.overflowDocument.body);
          addAnchoredPhrases(knownAnchoredPhrases, week.overflowDocument.title);
          addAnchoredPhrases(knownAnchoredPhrases, week.overflowDocument.content || week.overflowDocument.body);
          extractYearsFromText(week.overflowDocument.content || week.overflowDocument.body).forEach(function (year) { priorYears[year] = true; });
        }
      });
    });

    (campaignPlan.fragmentRegistry || []).forEach(function (entry) {
      if (entry && entry.id) fragmentIds[normalizeId(entry.id)] = true;
    });
    ((fragmentsOutput || {}).fragments || []).forEach(function (entry) {
      if (entry && entry.id) fragmentIds[normalizeId(entry.id)] = true;
      addSignalTokens(knownSignalTokens, entry.title);
      addSignalTokens(knownSignalTokens, extractEndingBodyText(entry));
      addAnchoredPhrases(knownAnchoredPhrases, entry.title);
      addAnchoredPhrases(knownAnchoredPhrases, extractEndingBodyText(entry));
      extractYearsFromText(extractEndingBodyText(entry)).forEach(function (year) { priorYears[year] = true; });
    });
    (campaignPlan.overflowRegistry || []).forEach(function (entry) {
      if (entry && entry.id) overflowIds[normalizeId(entry.id)] = true;
    });

    var bossPlan = campaignPlan.bossPlan || {};
    var expectedBossInputCount = weeks.filter(function (week) { return !week.isBossWeek; }).length;
    if (!expectedBossInputCount && Array.isArray(campaignPlan.weeks)) {
      expectedBossInputCount = Math.max(0, campaignPlan.weeks.length - 1);
    }

    return {
      artifactIdentity: identity,
      weekCount: Array.isArray(campaignPlan.weeks) ? campaignPlan.weeks.length : weeks.length,
      weeklyComponentType: firstNonEmpty((shell.meta || {}).weeklyComponentType, bossPlan.weeklyComponentType),
      expectedBossInputCount: expectedBossInputCount,
      componentValues: componentValues,
      fragmentIds: fragmentIds,
      overflowIds: overflowIds,
      cipherTypes: cipherTypes,
      sessionFragmentRefs: sessionFragmentRefs,
      oracleFragmentRefs: oracleFragmentRefs,
      endings: (endingsOutput || {}).endings || [],
      knownSignalTokens: knownSignalTokens,
      knownAnchoredPhrases: knownAnchoredPhrases,
      priorYears: priorYears
    };
  }

  function continuityRefExists(ledger, ref) {
    var normalized = normalizeId(ref);
    return !!((ledger.fragmentIds && ledger.fragmentIds[normalized]) || (ledger.overflowIds && ledger.overflowIds[normalized]));
  }

  function validateWeekChunkContinuity(chunk, context) {
    var errors = [];
    context = context || {};
    var ledger = buildContinuityLedger({
      shell: context.shell,
      campaignPlan: context.campaignPlan,
      weekChunkOutputs: context.priorWeekChunkOutputs || []
    });
    var expectedWeeklyComponentType = ledger.weeklyComponentType;
    var combinedComponentValues = ledger.componentValues.slice();

    (chunk.weeks || []).forEach(function (week, index) {
      var label = 'Week ' + (week.weekNumber || context.expectedWeeks && context.expectedWeeks[index] || '?');
      var wc = week.weeklyComponent || {};
      if (!week.isBossWeek && expectedWeeklyComponentType && wc.type && wc.type !== expectedWeeklyComponentType) {
        errors.push(label + ' weeklyComponent.type "' + wc.type + '" does not match shell meta.weeklyComponentType "' + expectedWeeklyComponentType + '"');
      }

      (week.sessions || []).forEach(function (session, sessionIndex) {
        if (session.fragmentRef && !continuityRefExists(ledger, session.fragmentRef)) {
          errors.push(label + ' session ' + (sessionIndex + 1) + ': fragmentRef "' + session.fragmentRef + '" is not present in fragmentRegistry or overflowRegistry');
        }
      });

      var oracle = (week.fieldOps || {}).oracleTable || (week.fieldOps || {}).oracle || {};
      (oracle.entries || []).forEach(function (entry, entryIndex) {
        if (entry.fragmentRef && !continuityRefExists(ledger, entry.fragmentRef)) {
          errors.push(label + ' oracle[' + entryIndex + ']: fragmentRef "' + entry.fragmentRef + '" is not present in fragmentRegistry or overflowRegistry');
        }
      });

      if (week.overflowDocument && week.overflowDocument.id) {
        var overflowId = normalizeId(week.overflowDocument.id);
        if (!ledger.overflowIds[overflowId] && Array.isArray((context.campaignPlan || {}).overflowRegistry) && (context.campaignPlan || {}).overflowRegistry.length) {
          errors.push(label + ' overflowDocument.id "' + week.overflowDocument.id + '" is not present in overflowRegistry');
        }
        ledger.overflowIds[overflowId] = true;
      }

      if (!week.isBossWeek && wc.value !== undefined && wc.value !== null && wc.value !== '') {
        combinedComponentValues.push(String(wc.value));
      }
    });

    var bossWeek = (chunk.weeks || []).find(function (week) { return week && week.isBossWeek; });
    if (bossWeek && bossWeek.bossEncounter) {
      var inputs = (bossWeek.bossEncounter.componentInputs || []).map(function (value) { return String(value); });
      if (inputs.length !== combinedComponentValues.length) {
        errors.push('Boss componentInputs has ' + inputs.length + ' values but the validated non-boss week set has ' + combinedComponentValues.length);
      } else {
        for (var i = 0; i < inputs.length; i++) {
          if (inputs[i] !== combinedComponentValues[i]) {
            errors.push('Boss componentInputs[' + i + '] = "' + inputs[i] + '" does not match collected weeklyComponent value "' + combinedComponentValues[i] + '"');
          }
        }
      }

      var bossText = [
        bossWeek.bossEncounter.narrative,
        bossWeek.bossEncounter.mechanismDescription,
        (bossWeek.bossEncounter.decodingKey || {}).instruction,
        bossWeek.bossEncounter.convergenceProof,
        bossWeek.bossEncounter.passwordRevealInstruction
      ].join('\n');
      extractInputCountClaims(bossText).forEach(function (claim) {
        if (claim.value && claim.value !== inputs.length) {
          errors.push('Boss prose says "' + claim.phrase + '" but componentInputs has ' + inputs.length + ' values.');
        }
      });
    }

    return errors;
  }

  function validateFragmentBatchContinuity(batchOutput, context) {
    var errors = [];
    context = context || {};
    var ledger = buildContinuityLedger({
      shell: context.shell,
      campaignPlan: context.campaignPlan,
      weekChunkOutputs: context.weekChunkOutputs || []
    });

    (batchOutput.fragments || []).forEach(function (fragment) {
      var id = String((fragment || {}).id || '');
      var normalized = normalizeId(id);
      if (!normalized) return;
      if (context.expectedRegistry && context.expectedRegistry.length && !ledger.fragmentIds[normalized]) {
        errors.push('Fragment "' + id + '" is not present in the campaign fragmentRegistry');
      }

      var content = extractEndingBodyText(fragment);
      var lowered = content.toLowerCase();
      if (lowered.indexOf('liftrpg.co') !== -1 || lowered.indexOf('unlock the ending') !== -1) {
        errors.push('Fragment "' + id + '" leaks final unlock language reserved for the boss/endings path');
      }
    });

    return errors;
  }

  function validateEndingsContinuity(endingsOutput, context) {
    var errors = [];
    context = context || {};
    var ledger = buildContinuityLedger({
      shell: context.shell,
      campaignPlan: context.campaignPlan,
      weekChunkOutputs: context.weekChunkOutputs || [],
      fragmentsOutput: context.fragmentsOutput || {}
    });

    (endingsOutput.endings || []).forEach(function (ending, index) {
      if (ending.passwordEncryptedEnding || ending.passwordPlaintext) {
        errors.push('Ending ' + (index + 1) + ' includes forbidden password fields; ending payloads must stay plaintext until local sealing.');
      }

      var body = extractEndingBodyText(ending);
      var lowered = body.toLowerCase();
      if (lowered.indexOf('passwordencryptedending') !== -1) {
        errors.push('Ending ' + (index + 1) + ' appears to include ciphertext or sealing metadata.');
      }

      if (ledger.componentValues.length > 0 && lowered.indexOf('liftrpg.co') !== -1 && lowered.indexOf('enter it') === -1 && lowered.indexOf('enter the word') === -1) {
        errors.push('Ending ' + (index + 1) + ' references the unlock path without a stable instruction phrase.');
      }

      extractYearsFromText(body).forEach(function (year) {
        var knownYears = Object.keys(ledger.priorYears || {}).map(function (value) { return Number(value); });
        if (!knownYears.length) return;
        var known = !!ledger.priorYears[year];
        var closeToKnown = knownYears.some(function (candidate) {
          return Math.abs(candidate - year) <= 1;
        });
        if (!known && !closeToKnown) {
          errors.push('Ending ' + (index + 1) + ' introduces year ' + year + ' without support from validated weeks or fragments.');
        }
      });

      collectAnchoredPhrases(body).forEach(function (phrase) {
        var supportedPhrase = ledger.knownAnchoredPhrases && ledger.knownAnchoredPhrases[phrase];
        if (!supportedPhrase) {
          errors.push('Ending ' + (index + 1) + ' references "' + phrase + '" but that anchored phrase does not appear in validated weeks or fragments.');
        }
      });

      if (/\bearth relay\b/i.test(body) && !(ledger.knownSignalTokens && (ledger.knownSignalTokens.earth || ledger.knownSignalTokens.relay))) {
        errors.push('Ending ' + (index + 1) + ' introduces "Earth relay" without upstream support.');
      }
    });

    return errors;
  }

  // ── Booklet schema postchecks ─────────────────────────────────────────────
  // Returns array of human-readable error strings.

  var VALID_PAYLOAD_TYPES = {
    none: 1, narrative: 1, cipher: 1, map: 1, clock: 1,
    companion: 1, 'fragment-ref': 1, 'password-element': 1
  };
  var ORACLE_ROLL_BANDS = ['00-09', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-99'];

  function normalizeOracleRollBand(value) {
    return String(value || '')
      .trim()
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, '');
  }

  function collectOracleBandErrors(entries, label) {
    var errors = [];
    if (entries.length !== ORACLE_ROLL_BANDS.length) {
      errors.push(label + ': has ' + entries.length + ' entries, needs 10 (bands "00-09"–"90-99")');
      return errors;
    }
    var seen = {};
    entries.forEach(function (entry) {
      var roll = normalizeOracleRollBand(entry && entry.roll);
      if (ORACLE_ROLL_BANDS.indexOf(roll) === -1) {
        errors.push(label + ': unexpected roll "' + (entry && entry.roll) + '" (must use d100 bands "00-09"–"90-99")');
        return;
      }
      if (seen[roll]) {
        errors.push(label + ': duplicate roll "' + roll + '"');
        return;
      }
      seen[roll] = true;
    });
    ORACLE_ROLL_BANDS.forEach(function (roll) {
      if (!seen[roll]) errors.push(label + ': missing roll "' + roll + '"');
    });
    return errors;
  }

  function validateBookletSchema(booklet) {
    var errors = [];
    (booklet.weeks || []).forEach(function (week, wi) {
      var wn = 'Week ' + (wi + 1);
      var fo = week.fieldOps || {};

      // Oracle checks
      var oracle = fo.oracleTable || fo.oracle || {};
      var entries = oracle.entries || [];
      entries.forEach(function (entry, ei) {
        if (Object.prototype.hasOwnProperty.call(entry, 'description')) {
          errors.push(wn + ' oracle[' + ei + ']: uses "description" — must be "text"');
        }
        if (entry.type === 'fragment' && !entry.fragmentRef) {
          errors.push(wn + ' oracle[' + ei + ']: type "fragment" missing fragmentRef');
        }
      });
      collectOracleBandErrors(entries, wn + ' oracle').forEach(function (message) {
        errors.push(message);
      });

      // Cipher body must be an object
      var cipher = fo.cipher || {};
      if (cipher.body !== undefined && typeof cipher.body !== 'object') {
        errors.push(wn + ' cipher.body: must be an object, got ' + (typeof cipher.body));
      }

      // Interlude payloadType
      var interlude = week.interlude || {};
      if (interlude.payloadType && !VALID_PAYLOAD_TYPES[interlude.payloadType]) {
        errors.push(wn + ' interlude.payloadType: "' + interlude.payloadType + '" not supported');
      }
    });
    return errors;
  }

  // ── Targeted patch prompt ─────────────────────────────────────────────────

  function generatePatchPrompt(rawJson, errors, options) {
    options = options || {};
    var contractLines = formatIdentityContractLines(options.identityContract || null);
    return [
      'You are a JSON repair specialist.',
      '',
      'The JSON below has validation errors. Fix ONLY the listed errors.',
      '',
      'RULES:',
      '- Output ONLY the corrected JSON. No markdown fences, no commentary, no explanation.',
      '- Preserve all unaffected content exactly as-is.',
      '- Do not rewrite the booklet into a safer or more generic form.',
      '- The output must be valid, parseable JSON.',
      contractLines.length ? '' : null,
      contractLines.length ? '## Identity Contract' : null,
      contractLines.length ? contractLines.join('\n') : null,
      '',
      '## Errors to Fix',
      errors.map(function (e) { return '- ' + e; }).join('\n'),
      '',
      '## JSON',
      '',
      rawJson
    ].filter(Boolean).join('\n');
  }

  // ── Shell context extractor ─────────────────────────────────────────────
  // Extracts compact narrative constraints from shell output for downstream stages.
  // Returns null if shell has no relevant fields (safe to pass as-is).

  function extractShellContext(shell) {
    var meta = shell.meta || {};
    var ctx = {};
    var hasContent = false;
    ensureArtifactIdentity(shell, null);
    if (meta.worldContract) { ctx.worldContract = meta.worldContract; hasContent = true; }
    if (meta.narrativeVoice) { ctx.narrativeVoice = meta.narrativeVoice; hasContent = true; }
    if (meta.literaryRegister) { ctx.literaryRegister = meta.literaryRegister; hasContent = true; }
    if (meta.structuralShape) { ctx.structuralShape = meta.structuralShape; hasContent = true; }
    if (meta.artifactIdentity) { ctx.artifactIdentity = meta.artifactIdentity; hasContent = true; }
    return ctx;
  }

  // ── Inter-chunk continuity builder ──────────────────────────────────────
  // Builds a compact continuity packet from ALL prior generated weeks.
  // Replaces the thin {lastWeekNumber, lastMapState, lastClocks, lastTitle}
  // with a richer summary that lets downstream chunks maintain puzzle, map,
  // fragment, and narrative coherence without seeing full prior JSON.

  function buildChunkContinuity(allPriorWeeks) {
    allPriorWeeks = (allPriorWeeks || []).filter(Boolean);
    if (allPriorWeeks.length === 0) return null;

    var weekSummaries = [];
    var usedFragmentRefs = [];
    var cipherProgression = [];
    var componentValues = [];
    var overflowDocs = [];
    var binaryChoiceState = null;

    // Map progression from the LAST week that has a mapState
    var lastMapState = null;

    // Recent oracle context (last 2 weeks only)
    var recentOracles = [];

    allPriorWeeks.forEach(function (week, wi) {
      var wn = week.weekNumber || (wi + 1);
      var fo = week.fieldOps || {};
      var sessions = week.sessions || [];

      // Week title summary
      weekSummaries.push({ week: wn, title: week.title || '' });

      // Component values
      var wc = week.weeklyComponent || {};
      if (wc.value !== undefined && wc.value !== null && wc.value !== '') {
        componentValues.push({ week: wn, value: wc.value });
      }

      // Cipher progression (type + short summary)
      var cipher = fo.cipher || {};
      if (cipher.type) {
        cipherProgression.push({
          week: wn,
          type: cipher.type,
          title: (cipher.title || '').slice(0, 80)
        });
      }

      // Fragment refs used in sessions
      sessions.forEach(function (s) {
        if (s.fragmentRef) usedFragmentRefs.push(s.fragmentRef);
      });

      // Oracle fragment refs
      var oracle = fo.oracleTable || fo.oracle || {};
      var entries = oracle.entries || [];
      entries.forEach(function (e) {
        if (e.fragmentRef) usedFragmentRefs.push(e.fragmentRef);
      });

      // Binary choice detection
      sessions.forEach(function (s) {
        if (s.binaryChoice) {
          binaryChoiceState = {
            week: wn,
            choiceLabel: (s.binaryChoice.choiceLabel || '').slice(0, 120)
          };
        }
      });

      // Overflow document tracking
      if (week.overflowDocument && week.overflowDocument.id) {
        overflowDocs.push({
          week: wn,
          id: week.overflowDocument.id,
          documentType: week.overflowDocument.documentType || '',
          author: week.overflowDocument.inWorldAuthor || ''
        });
      }

      // Map state tracking
      if (fo.mapState) {
        lastMapState = fo.mapState;
      }

      // Recent oracle summaries (keep last 2)
      if (entries.length > 0) {
        var oracleSummary = { week: wn, entryCount: entries.length };
        // Extract fragment refs and paper actions from oracle
        var oracleFrags = [];
        var oracleActions = [];
        entries.forEach(function (e) {
          if (e.fragmentRef) oracleFrags.push(e.fragmentRef);
          if (e.paperAction) oracleActions.push(e.paperAction.slice(0, 60));
        });
        if (oracleFrags.length > 0) oracleSummary.fragmentRefs = oracleFrags;
        if (oracleActions.length > 0) oracleSummary.paperActions = oracleActions.slice(0, 3);
        recentOracles.push(oracleSummary);
      }
    });

    // Build map summary from last known mapState
    var mapSummary = summarizeMapStateForContinuity(lastMapState);

    // Deduplicate fragment refs
    var seen = {};
    usedFragmentRefs = usedFragmentRefs.filter(function (ref) {
      if (seen[ref]) return false;
      seen[ref] = true;
      return true;
    });

    return {
      weekCount: allPriorWeeks.length,
      weekSummaries: weekSummaries,
      componentValues: componentValues,
      cipherProgression: cipherProgression,
      usedFragmentRefs: usedFragmentRefs,
      overflowDocs: overflowDocs,
      recentOracles: recentOracles.slice(-2),
      mapProgression: mapSummary,
      binaryChoice: binaryChoiceState,
      clocks: (allPriorWeeks[allPriorWeeks.length - 1] || {}).gameplayClocks || []
    };
  }

  function summarizeMapStateForContinuity(mapState) {
    if (!mapState) return null;

    var mapType = String(mapState.mapType || 'grid');
    var summary = { mapType: mapType };

    if (mapState.title) summary.title = String(mapState.title).slice(0, 80);
    if (mapState.floorLabel) summary.floorLabel = String(mapState.floorLabel).slice(0, 60);
    if (mapState.mapNote) summary.mapNote = String(mapState.mapNote).slice(0, 120);

    if (mapType === 'point-to-point') {
      var nodes = mapState.nodes || [];
      var edges = mapState.edges || [];
      summary.nodeCount = nodes.length;
      summary.edgeCount = edges.length;
      summary.currentNode = mapState.currentNode || '';
      summary.notableNodes = nodes
        .filter(function (node) { return node && (node.state || node.label); })
        .slice(0, 5)
        .map(function (node) {
          return (node.label || node.id || 'node') + (node.state ? ' [' + node.state + ']' : '');
        });
      return summary;
    }

    if (mapType === 'linear-track') {
      var positions = mapState.positions || [];
      summary.positionCount = positions.length;
      summary.currentPosition = mapState.currentPosition;
      summary.direction = mapState.direction || 'horizontal';
      summary.notablePositions = positions
        .filter(function (position) { return position && (position.annotation || position.label || position.state); })
        .slice(0, 5)
        .map(function (position) {
          var parts = [position.label || ('Position ' + position.index)];
          if (position.state) parts.push('[' + position.state + ']');
          if (position.annotation) parts.push(position.annotation.slice(0, 40));
          return parts.join(' ');
        });
      return summary;
    }

    if (mapType === 'player-drawn') {
      summary.canvasType = mapState.canvasType || 'dot-grid';
      summary.dimensions = mapState.dimensions || null;
      summary.seedMarkerCount = (mapState.seedMarkers || []).length;
      summary.promptCount = (mapState.prompts || []).length;
      summary.seedMarkers = (mapState.seedMarkers || []).slice(0, 3).map(function (marker) {
        return marker.label || ('(' + marker.col + ',' + marker.row + ')');
      });
      return summary;
    }

    var tiles = mapState.tiles || [];
    var anomalyCount = 0;
    var inaccessibleCount = 0;
    var notableAnnotations = [];
    tiles.forEach(function (tile) {
      if (tile.type === 'anomaly') anomalyCount++;
      if (tile.type === 'inaccessible') inaccessibleCount++;
      if (tile.annotation) notableAnnotations.push((tile.label || 'tile') + ': ' + tile.annotation.slice(0, 50));
    });
    summary.currentPosition = mapState.currentPosition;
    summary.gridDimensions = mapState.gridDimensions;
    summary.tileCount = tiles.length;
    summary.anomalyCount = anomalyCount;
    summary.inaccessibleCount = inaccessibleCount;
    if (notableAnnotations.length > 0) {
      summary.notableAnnotations = notableAnnotations.slice(0, 5);
    }
    return summary;
  }

  // ── Booklet assembler ────────────────────────────────────────────────────
  // Merges partial JSON chunks from the 10-stage pipeline into a complete booklet.

  function assembleBooklet(shell, weekChunkOutputs, fragmentsOutput, endingsOutput, campaignPlan) {
    ensureArtifactIdentity(shell, campaignPlan || null);
    var booklet = {
      meta: shell.meta || {},
      cover: shell.cover || {},
      rulesSpread: shell.rulesSpread || {},
      theme: shell.theme || {},
      weeks: [],
      fragments: (fragmentsOutput || {}).fragments || [],
      endings: (endingsOutput || {}).endings || []
    };

    // Concatenate weeks from all chunks in order
    weekChunkOutputs.forEach(function (chunk) {
      booklet.weeks = booklet.weeks.concat(chunk.weeks || []);
    });

    // Normalize data shapes that models commonly get wrong
    booklet.weeks.forEach(normalizeCompanionComponents);
    normalizeDocumentTypes(booklet);

    // Enforce deterministic derived fields (meta counts, componentInputs, password)
    var result = enforceBookletDerivedFields(booklet);
    if (result.warnings.length > 0) {
      console.warn('[LiftRPG] Assembly derivation warnings:', result.warnings);
    }

    return booklet;
  }

  // ── Structured booklet assembler ────────────────────────────────────────
  // Same as assembleBooklet but with exercise override: when normalizedWorkout
  // has populated weeks[].sessions[].exercises, those replace LLM-generated
  // exercise data deterministically. Used only by generateStructured().

  function assembleStructuredBooklet(shell, weekChunkOutputs, fragmentsOutput, endingsOutput, normalizedWorkout, campaignPlan) {
    ensureArtifactIdentity(shell, campaignPlan || null);
    var booklet = {
      meta: shell.meta || {},
      cover: shell.cover || {},
      rulesSpread: shell.rulesSpread || {},
      theme: shell.theme || {},
      weeks: [],
      fragments: (fragmentsOutput || {}).fragments || [],
      endings: (endingsOutput || {}).endings || []
    };

    // Concatenate weeks from all chunks in order
    weekChunkOutputs.forEach(function (chunk) {
      booklet.weeks = booklet.weeks.concat(chunk.weeks || []);
    });

    // Normalize data shapes that models commonly get wrong
    booklet.weeks.forEach(normalizeCompanionComponents);
    normalizeDocumentTypes(booklet);

    // Override exercises with normalized data when available
    var nw = normalizedWorkout || {};
    if (nw.weeks && nw.weeks.length > 0) {
      booklet.weeks.forEach(function (week, wi) {
        var nwWeek = nw.weeks[wi];
        if (!nwWeek || !nwWeek.sessions) return;
        (week.sessions || []).forEach(function (session, si) {
          var nwSession = nwWeek.sessions[si];
          if (!nwSession || !nwSession.exercises || nwSession.exercises.length === 0) return;
          // Map normalized exercises to renderer shape
          session.exercises = nwSession.exercises.map(function (ex) {
            return {
              name: ex.name || 'Lift',
              sets: ex.sets || 3,
              repsPerSet: ex.repsPerSet || '5',
              weightField: ex.weightField !== undefined ? ex.weightField : true,
              notes: ex.notes || ''
            };
          });
          if (nwSession.dayLabel) {
            session.label = 'Session ' + (si + 1) + ' \u00b7 ' + nwSession.dayLabel;
          }
        });
      });
    }

    // Set overflow deterministically
    booklet.weeks.forEach(function (week) {
      if ((week.sessions || []).length > 3) {
        week.overflow = true;
      }
    });

    // Enforce deterministic derived fields (meta counts, componentInputs, password)
    var result = enforceBookletDerivedFields(booklet);
    if (result.warnings.length > 0) {
      console.warn('[LiftRPG] Structured assembly derivation warnings:', result.warnings);
    }

    return booklet;
  }

  // ── Week summary extractor ──────────────────────────────────────────────
  // Compact context from generated weeks for the fragments stage.

  function extractWeekSummaries(weekChunkOutputs) {
    var summaries = [];
    weekChunkOutputs.forEach(function (chunk) {
      (chunk.weeks || []).forEach(function (w) {
        var sessions = w.sessions || [];
        var fo = w.fieldOps || {};

        var entry = {
          weekNumber: w.weekNumber,
          title: w.title
        };

        // Epigraph (truncated — may be string or {text, attribution})
        if (w.epigraph) {
          entry.epigraph = typeof w.epigraph === 'string'
            ? w.epigraph.slice(0, 80)
            : (w.epigraph.text || '').slice(0, 80);
        }

        // Session data (compact — truncated prompts, key refs only)
        entry.sessions = sessions.map(function (s, si) {
          var sd = { index: si + 1 };
          if (s.label) sd.label = s.label;
          if (s.storyPrompt) sd.storyPrompt = s.storyPrompt.slice(0, 50);
          if (s.fragmentRef) sd.fragmentRef = s.fragmentRef;
          return sd;
        });

        // Fragment refs (flat list for quick lookup)
        var refs = sessions.map(function (s) { return s.fragmentRef || ''; }).filter(Boolean);
        if (refs.length > 0) entry.fragmentRefs = refs;

        // Weekly component
        var wc = w.weeklyComponent || {};
        if (wc.value !== undefined && wc.value !== null) {
          entry.weeklyComponent = { value: wc.value };
          if (wc.type) entry.weeklyComponent.type = wc.type;
          if (wc.extractionInstruction) entry.weeklyComponent.extractionInstruction = wc.extractionInstruction;
        }

        // Cipher summary
        var cipher = fo.cipher || {};
        if (cipher.type) {
          entry.cipher = {
            type: cipher.type,
            title: (cipher.title || '').slice(0, 100)
          };
          if (cipher.extractionInstruction) {
            entry.cipher.extractionInstruction = cipher.extractionInstruction.slice(0, 150);
          }
          if (cipher.characterDerivationProof) {
            entry.cipher.hasProof = true;
          }
        }

        // Oracle summary (compact — counts + fragment refs only)
        var oracle = fo.oracleTable || fo.oracle || {};
        var oEntries = oracle.entries || [];
        if (oEntries.length > 0) {
          var fragLinked = [];
          oEntries.forEach(function (e) {
            if (e.fragmentRef) fragLinked.push(e.fragmentRef);
          });
          entry.oracle = { entryCount: oEntries.length };
          if (oracle.mode) entry.oracle.mode = oracle.mode;
          if (fragLinked.length > 0) entry.oracle.fragmentLinked = fragLinked;
        }

        // Map state summary
        var ms = fo.mapState;
        if (ms) {
          entry.mapState = {};
          if (ms.gridDimensions) {
            entry.mapState.gridSize = ms.gridDimensions.columns + '\u00d7' + ms.gridDimensions.rows;
          }
          if (ms.currentPosition) entry.mapState.currentPosition = ms.currentPosition;
          if (ms.mapNote) entry.mapState.mapNote = ms.mapNote.slice(0, 120);
          // Tile counts (compact)
          var tiles = ms.tiles || [];
          if (tiles.length > 0) {
            var anomalyCount = 0, inaccessibleCount = 0;
            tiles.forEach(function (t) {
              if (t.type === 'anomaly') anomalyCount++;
              if (t.type === 'inaccessible') inaccessibleCount++;
            });
            if (anomalyCount) entry.mapState.anomalyCount = anomalyCount;
            if (inaccessibleCount) entry.mapState.inaccessibleCount = inaccessibleCount;
          }
        }

        // Overflow document
        if (w.overflowDocument) {
          entry.overflowDocument = {
            id: w.overflowDocument.id,
            documentType: w.overflowDocument.documentType || '',
            title: (w.overflowDocument.title || '').slice(0, 80)
          };
          if (w.overflowDocument.inWorldPurpose) {
            entry.overflowDocument.inWorldPurpose = w.overflowDocument.inWorldPurpose.slice(0, 100);
          }
        }

        // Binary choice
        sessions.forEach(function (s) {
          if (s.binaryChoice) {
            entry.binaryChoice = {
              choiceLabel: (s.binaryChoice.choiceLabel || '').slice(0, 120),
              promptA: (s.binaryChoice.promptA || '').slice(0, 80),
              promptB: (s.binaryChoice.promptB || '').slice(0, 80)
            };
          }
        });

        // Boss encounter summary
        if (w.isBossWeek && w.bossEncounter) {
          var boss = w.bossEncounter;
          entry.bossEncounter = {
            title: boss.title || '',
            componentInputs: boss.componentInputs || []
          };
          if (boss.convergenceProof) {
            entry.bossEncounter.convergenceExcerpt = boss.convergenceProof.slice(0, 200);
          }
          if (boss.binaryChoiceAcknowledgement) {
            entry.bossEncounter.acknowledgesBinaryChoice = true;
          }
        }

        summaries.push(entry);
      });
    });
    return summaries;
  }

  // ── Binary choice week finder ───────────────────────────────────────────

  function findBinaryChoiceWeek(weekChunkOutputs) {
    for (var ci = 0; ci < weekChunkOutputs.length; ci++) {
      var weeks = weekChunkOutputs[ci].weeks || [];
      for (var wi = 0; wi < weeks.length; wi++) {
        var sessions = weeks[wi].sessions || [];
        for (var si = 0; si < sessions.length; si++) {
          if (sessions[si].binaryChoice) return weeks[wi];
        }
      }
    }
    return null;
  }

  // ── Deterministic derivation helpers ──────────────────────────────────────
  // Compute bookkeeping facts from assembled data instead of trusting model prose.

  /**
   * decodeA1Z26(values) → string | null
   * Converts an array of numeric values to uppercase letters via A=1 … Z=26.
   * Returns null if any value is out of range or non-numeric.
   */
  function decodeA1Z26(values) {
    if (!Array.isArray(values) || values.length === 0) return null;
    var letters = '';
    for (var i = 0; i < values.length; i++) {
      var n = Number(values[i]);
      if (isNaN(n) || n < 1 || n > 26 || n !== Math.floor(n)) return null;
      letters += String.fromCharCode(64 + n); // 65='A', so 64+1='A'
    }
    return letters;
  }

  /**
   * isStandardAlphaTable(referenceTable) → boolean
   * Detects whether a decodingKey.referenceTable is a standard A=1 … Z=26 table.
   * Matches tables formatted as "1=A  2=B  3=C …" with any whitespace/newlines.
   * Returns false for any non-standard mapping (reverse alphabet, custom codes, etc.).
   */
  function isStandardAlphaTable(referenceTable) {
    if (!referenceTable || typeof referenceTable !== 'string') return false;
    // Extract all N=L pairs from the table text
    var pairs = referenceTable.match(/\d+=\s*[A-Za-z]/g);
    if (!pairs || pairs.length < 26) return false;
    // Verify each pair matches standard A1Z26
    for (var i = 0; i < 26; i++) {
      var expected = (i + 1) + '=' + String.fromCharCode(65 + i);
      // Find this pair (allow whitespace around =)
      var found = false;
      for (var j = 0; j < pairs.length; j++) {
        var cleaned = pairs[j].replace(/\s/g, '').toUpperCase();
        if (cleaned === expected) { found = true; break; }
      }
      if (!found) return false;
    }
    return true;
  }

  var SUPPORTED_THEME_ARCHETYPES = {
    pastoral: true,
    government: true,
    cyberpunk: true,
    scifi: true,
    fantasy: true,
    noir: true,
    steampunk: true,
    minimalist: true,
    nautical: true,
    occult: true
  };

  var THEME_ARCHETYPE_ALIASES = {
    institutional: 'government',
    terminal: 'scifi',
    clinical: 'minimalist',
    corporate: 'government',
    confessional: 'pastoral',
    literary: 'pastoral'
  };

  function normalizeThemeArchetype(value) {
    var requested = String(value || '').trim().toLowerCase();
    if (SUPPORTED_THEME_ARCHETYPES[requested]) return requested;
    if (THEME_ARCHETYPE_ALIASES[requested]) return THEME_ARCHETYPE_ALIASES[requested];
    return 'pastoral';
  }

  /**
   * enforceBookletDerivedFields(booklet) → { warnings: string[] }
   *
   * Post-assembly enforcement of deterministic fields. Mutates booklet in place.
   * Called by both assembleBooklet() and assembleStructuredBooklet().
   *
   * Enforces:
   *   meta.weekCount, meta.totalSessions
   *   bossEncounter.componentInputs (from collected non-boss weeklyComponent values)
   *   meta.passwordLength (when A1Z26 decode succeeds)
   *
   * Returns warnings array for non-critical issues (e.g. non-standard decode table).
   */
  function enforceBookletDerivedFields(booklet) {
    var warnings = [];
    var weeks = booklet.weeks || [];
    var meta = booklet.meta || {};
    booklet.meta = meta;
    booklet.theme = booklet.theme || {};

    var requestedArchetype = String(booklet.theme.visualArchetype || '').trim().toLowerCase();
    var normalizedArchetype = normalizeThemeArchetype(booklet.theme.visualArchetype);
    if (requestedArchetype && requestedArchetype !== normalizedArchetype) {
      warnings.push('theme.visualArchetype normalized from "' + requestedArchetype + '" to "' + normalizedArchetype + '"');
    }
    booklet.theme.visualArchetype = normalizedArchetype;

    // ── Meta counts (warn on mismatch, then enforce deterministic truth) ──
    var actualTotalSessions = weeks.reduce(function (sum, w) {
      return sum + (w.sessions ? w.sessions.length : 0);
    }, 0);
    if (meta.weekCount !== weeks.length) {
      warnings.push('Booklet meta.weekCount (' + meta.weekCount + ') corrected to ' + weeks.length);
    }
    if (meta.totalSessions !== actualTotalSessions) {
      warnings.push('Booklet meta.totalSessions (' + meta.totalSessions + ') corrected to ' + actualTotalSessions);
    }
    meta.weekCount = weeks.length;
    meta.totalSessions = actualTotalSessions;

    // ── Collect non-boss weeklyComponent values ────────────────────────────
    var nonBossValues = [];
    weeks.forEach(function (w) {
      if (!w.isBossWeek) {
        var wc = w.weeklyComponent || {};
        if (wc.value !== undefined && wc.value !== null && wc.value !== '') {
          nonBossValues.push(wc.value);
        }
      }
    });

    // ── Boss encounter: verify componentInputs ─────────────────────────────
    var bossWeek = null;
    for (var i = weeks.length - 1; i >= 0; i--) {
      if (weeks[i].isBossWeek) { bossWeek = weeks[i]; break; }
    }

    if (bossWeek && bossWeek.bossEncounter && nonBossValues.length > 0) {
      var boss = bossWeek.bossEncounter;
      var existingInputs = boss.componentInputs || [];

      // Only enforce when we have values for every non-boss week
      var nonBossCount = weeks.filter(function (w) { return !w.isBossWeek; }).length;
      if (nonBossValues.length === nonBossCount) {
        var computed = nonBossValues.map(function (v) { return String(v); });
        var mismatch = existingInputs.length !== computed.length;
        if (!mismatch) {
          for (var ci = 0; ci < computed.length; ci++) {
            if (String(existingInputs[ci]) !== computed[ci]) { mismatch = true; break; }
          }
        }
        if (mismatch) {
          if (existingInputs.length > 0) {
            warnings.push('componentInputs corrected: model had [' + existingInputs.join(', ') + '], computed [' + computed.join(', ') + ']');
          }
          boss.componentInputs = computed;
        }
      }

      // ── Password derivation (A1Z26 only) ──────────────────────────────────
      var dk = boss.decodingKey;
      if (dk && dk.referenceTable) {
        if (isStandardAlphaTable(dk.referenceTable)) {
          var numericValues = (boss.componentInputs || []).map(function (v) { return Number(v); });
          var password = decodeA1Z26(numericValues);
          if (password) {
            if (meta.passwordLength !== password.length) {
              warnings.push('meta.passwordLength corrected from ' + meta.passwordLength + ' to ' + password.length);
            }
            meta.passwordLength = password.length;
          } else {
            warnings.push('A1Z26 decode failed — componentInputs contain non-integer or out-of-range values');
          }
        } else {
          warnings.push('Boss decodingKey.referenceTable is not standard A1Z26 — password not derived deterministically');
        }
      }
    }

    return { warnings: warnings };
  }

  // ── Fragment batching ──────────────────────────────────────────────────
  // Groups fragmentRegistry entries into batches by weekRef for sequential generation.

  /**
   * buildFragmentBatches(fragmentRegistry, weekSummaries) → Array<{ weekNumbers, registry, weekSummaries }>
   *
   * Groups fragmentRegistry entries into batches using weekRef associations.
   * Strategy: one batch per week-chunk pair (weeks 1-2, 3-4, 5-6 for a 6-week booklet).
   * Entries that lack weekRef are distributed evenly across batches (round-robin).
   *
   * Each batch contains:
   *   weekNumbers: number[]         — which weeks this batch covers
   *   registry: object[]            — registry entries for this batch
   *   weekSummaries: object[]       — week summaries scoped to this batch
   */
  function buildFragmentBatches(fragmentRegistry, weekSummaries) {
    if (!fragmentRegistry || fragmentRegistry.length === 0) return [];

    // Determine week numbers from summaries; fall back to weekRefs in registry
    var allWeekNums = (weekSummaries || []).map(function (ws) { return ws.weekNumber; });
    if (allWeekNums.length === 0) {
      // Pre-planning call (no summaries yet) — derive from registry weekRefs
      var weekSet = {};
      fragmentRegistry.forEach(function (entry) {
        if (entry.weekRef && typeof entry.weekRef === 'number') weekSet[entry.weekRef] = true;
      });
      allWeekNums = Object.keys(weekSet).map(Number).sort(function (a, b) { return a - b; });
    }
    if (allWeekNums.length === 0) allWeekNums = [1]; // absolute fallback — at least one batch

    // Build pairs: [1,2], [3,4], [5,6] for 6-week; [1,2], [3] for 3-week, etc.
    var pairs = [];
    for (var i = 0; i < allWeekNums.length; i += 2) {
      var pair = [allWeekNums[i]];
      if (i + 1 < allWeekNums.length) pair.push(allWeekNums[i + 1]);
      pairs.push(pair);
    }

    // Build a weekNumber → summaries lookup
    var summaryByWeek = {};
    (weekSummaries || []).forEach(function (ws) {
      summaryByWeek[ws.weekNumber] = ws;
    });

    // Assign each registry entry to a pair based on weekRef
    var pairBuckets = pairs.map(function () { return []; });
    var unassigned = [];

    fragmentRegistry.forEach(function (entry) {
      if (entry.weekRef && typeof entry.weekRef === 'number') {
        // Find which pair this weekRef belongs to
        var placed = false;
        for (var pi = 0; pi < pairs.length; pi++) {
          if (pairs[pi].indexOf(entry.weekRef) !== -1) {
            pairBuckets[pi].push(entry);
            placed = true;
            break;
          }
        }
        if (!placed) unassigned.push(entry);
      } else {
        unassigned.push(entry);
      }
    });

    // Distribute unassigned entries evenly across batches (not all into last)
    if (unassigned.length > 0) {
      for (var ui = 0; ui < unassigned.length; ui++) {
        var targetBucket = ui % pairBuckets.length;
        pairBuckets[targetBucket].push(unassigned[ui]);
      }
    }

    // Build batch objects (skip empty batches)
    var batches = [];
    for (var bi = 0; bi < pairs.length; bi++) {
      if (pairBuckets[bi].length === 0) continue;
      var batchSummaries = pairs[bi].map(function (wn) {
        return summaryByWeek[wn];
      }).filter(Boolean);
      batches.push({
        weekNumbers: pairs[bi],
        registry: pairBuckets[bi],
        weekSummaries: batchSummaries
      });
    }

    // Cap at 3 batches: merge smallest batches until count ≤ 3
    while (batches.length > 3) {
      // Find the two smallest batches by registry length
      var minIdx = 0;
      for (var mi = 1; mi < batches.length; mi++) {
        if (batches[mi].registry.length < batches[minIdx].registry.length) minIdx = mi;
      }
      // Merge smallest into its neighbor (prefer the adjacent batch)
      var mergeTarget = minIdx > 0 ? minIdx - 1 : 1;
      batches[mergeTarget].weekNumbers = batches[mergeTarget].weekNumbers.concat(batches[minIdx].weekNumbers);
      batches[mergeTarget].registry = batches[mergeTarget].registry.concat(batches[minIdx].registry);
      batches[mergeTarget].weekSummaries = batches[mergeTarget].weekSummaries.concat(batches[minIdx].weekSummaries);
      batches.splice(minIdx, 1);
    }

    return batches;
  }

  /**
   * mergeFragmentBatches(batchOutputs, expectedRegistry) → { fragments, errors }
   *
   * Merges batch outputs into a single fragments array.
   * Validates:
   *   - no duplicate IDs across batches
   *   - all registry IDs present in output
   *   - final array ordered by batch sequence (deterministic)
   */
  function mergeFragmentBatches(batchOutputs, expectedRegistry) {
    var merged = [];
    var seenIds = {};
    var errors = [];

    batchOutputs.forEach(function (batchOutput, bi) {
      var frags = (batchOutput || {}).fragments || [];
      frags.forEach(function (f) {
        var nid = normalizeId(f.id);
        if (seenIds[nid]) {
          errors.push('Duplicate fragment ID across batches: ' + f.id + ' (batch ' + (bi + 1) + ')');
        } else {
          seenIds[nid] = true;
          merged.push(f);
        }
      });
    });

    // Check completeness against registry
    (expectedRegistry || []).forEach(function (entry) {
      var nid = normalizeId(entry.id);
      if (!seenIds[nid]) {
        errors.push('Missing fragment from batches: ' + entry.id);
      }
    });

    return { fragments: merged, errors: errors };
  }

  // ── Expanded booklet validation ─────────────────────────────────────────
  /**
   * Per-week structural validation. Runs after each week is generated
   * in the pipeline, before proceeding to the next stage.
   * Returns { valid: boolean, errors: string[] }
   */
  function validateWeekSchema(weekObj, isBoss, expectedOptions) {
    var errors = [];
    var warnings = [];
    if (!weekObj) { return { valid: false, errors: ['Week object is null'] }; }
    if (!weekObj.title) errors.push('Missing week title');

    // Epigraph — renderer reads .text and .attribution for every week page
    if (!weekObj.epigraph || typeof weekObj.epigraph !== 'object') {
      errors.push('Week missing epigraph');
    } else {
      if (!weekObj.epigraph.text) errors.push('Week epigraph missing text');
      if (!weekObj.epigraph.attribution) errors.push('Week epigraph missing attribution');
    }

    if (!Array.isArray(weekObj.sessions) || weekObj.sessions.length === 0) {
      errors.push('Missing or empty sessions array');
    } else {
      weekObj.sessions.forEach(function(s, si) {
        if (!s.storyPrompt) errors.push('Session ' + (si+1) + ' missing storyPrompt');
        if (!s.label) errors.push('Session ' + (si+1) + ' missing label');
        if (s.sessionNumber === undefined) errors.push('Session ' + (si+1) + ' missing sessionNumber');
        if (!Array.isArray(s.exercises) || s.exercises.length === 0) {
          errors.push('Session ' + (si+1) + ' missing exercises');
        }
      });
    }

    // Non-boss weeks must have weeklyComponent.extractionInstruction
    if (!isBoss) {
      var wc = weekObj.weeklyComponent || {};
      if (!wc.extractionInstruction) {
        errors.push('Non-boss week missing weeklyComponent.extractionInstruction');
      }
    }

    // Non-boss weeks must have fieldOps
    if (!isBoss && !weekObj.fieldOps) {
      errors.push('Non-boss week missing fieldOps');
    }
    if (!isBoss && weekObj.fieldOps) {
      var fo = weekObj.fieldOps;

      if (!fo.cipher) errors.push('Non-boss week missing fieldOps.cipher');
      if (!fo.mapState) errors.push('Non-boss week missing fieldOps.mapState');

      // Oracle validation — LLMs use both "oracleTable" and "oracle" keys
      var ot = fo.oracleTable || fo.oracle;
      if (ot) {
        if (!ot.title) errors.push('oracleTable.title missing');
        if (!ot.instruction) errors.push('oracleTable.instruction missing');
        if (!Array.isArray(ot.entries)) {
          errors.push('oracleTable.entries must be an array');
        } else {
          if (ot.entries.length !== 10) {
            errors.push('Oracle table must have exactly 10 entries (d100 bands), got ' + ot.entries.length);
          }
          ot.entries.forEach(function(e, i) {
            if (e && !e.text) {
              if (e.result) {
                errors.push('Oracle entry ' + i + ' uses "result" instead of "text"');
              } else if (e.description) {
                errors.push('Oracle entry ' + i + ' uses "description" instead of "text"');
              } else if (e.label) {
                errors.push('Oracle entry ' + i + ' uses "label" instead of "text"');
              } else {
                errors.push('Oracle entry ' + i + ' missing text field');
              }
            }
          });
        }
      } else {
        errors.push('Non-boss week missing fieldOps.oracleTable');
      }

      // Cipher validation
      if (fo.cipher) {
        if (!fo.cipher.title) errors.push('cipher.title missing');
        if (fo.cipher.body && typeof fo.cipher.body === 'string') {
          errors.push('cipher.body must be an object (with displayText, key, workSpace), not a string');
        }
      }

      // Map validation
      if (fo.mapState) {
        if (!fo.mapState.mapType) {
          errors.push('mapState missing mapType field');
        } else if (VALID_MAP_TYPES.indexOf(fo.mapState.mapType) === -1) {
          errors.push('Unknown mapType: "' + fo.mapState.mapType + '". Must be one of: ' + VALID_MAP_TYPES.join(', '));
        }
        if (fo.mapState.mapType === 'grid' && fo.mapState.gridDimensions) {
          var gd = fo.mapState.gridDimensions;
          if (gd.columns > 12 || gd.rows > 8) {
            errors.push('Grid dimensions exceed max (12x8): got ' + gd.columns + 'x' + gd.rows);
          }
        }
      }

      // Companion component validation
      if (Array.isArray(fo.companionComponents)) {
        fo.companionComponents.forEach(function(cc) {
          if (!cc) return;
          if (cc.type && VALID_COMPANION_TYPES.indexOf(cc.type) === -1) {
            errors.push('Unknown companion component type: "' + cc.type + '"');
          }
          if (!cc.label) errors.push('Companion component missing label');
          if (!cc.body) errors.push('Companion component missing body');
        });
      }
    }

    // Boss week validation
    if (isBoss) {
      var boss = weekObj.bossEncounter;
      if (!boss) {
        errors.push('Boss week missing bossEncounter');
      } else {
        if (!boss.title) errors.push('Boss encounter missing title');
        if (!boss.narrative) errors.push('Boss encounter missing narrative');
        if (!boss.mechanismDescription) errors.push('Boss encounter missing mechanismDescription');
        if (!boss.convergenceProof) errors.push('Boss encounter missing convergenceProof');
        if (!boss.passwordRevealInstruction) errors.push('Boss encounter missing passwordRevealInstruction');

        if (!boss.decodingKey) {
          errors.push('Boss encounter missing decodingKey');
        } else {
          if (!boss.decodingKey.referenceTable) {
            errors.push('Boss decodingKey missing referenceTable');
          }
          if (!boss.decodingKey.instruction) {
            errors.push('Boss decodingKey missing instruction');
          }
        }

        if (expectedOptions && expectedOptions.componentInputs && expectedOptions.componentInputs.length > 0) {
          var existingInputs = boss.componentInputs || [];
          var computed = expectedOptions.componentInputs.map(function(v) { return String(v); });
          var mismatch = existingInputs.length !== computed.length;
          if (!mismatch) {
            for (var ci = 0; ci < computed.length; ci++) {
              if (String(existingInputs[ci]) !== computed[ci]) { mismatch = true; break; }
            }
          }
          if (mismatch) {
            errors.push('bossEncounter.componentInputs does not accurately reflect prior weeks. Expected: [' + computed.join(', ') + '], got: [' + existingInputs.join(', ') + ']');
          }

          var dk = boss.decodingKey;
          if (dk && dk.referenceTable && isStandardAlphaTable(dk.referenceTable)) {
            var numericValues = existingInputs.map(function (v) { return Number(v); });
            var password = decodeA1Z26(numericValues);
            if (!password) {
               errors.push('Boss decodingKey A1Z26 decode failed — componentInputs contain non-integer or out-of-range values');
            }
          }
        }
      }
    }

    // Overflow consistency: overflow must be true when sessions > 3
    if (Array.isArray(weekObj.sessions) && weekObj.sessions.length > 3 && !weekObj.overflow) {
      errors.push('Week has ' + weekObj.sessions.length + ' sessions but overflow is not true');
    }
    if (weekObj.overflow && Array.isArray(weekObj.sessions) && weekObj.sessions.length <= 3) {
      errors.push('Week has overflow=true but only ' + weekObj.sessions.length + ' sessions');
    }

    // Gameplay clocks — renderer builds clock widgets from these fields
    if (Array.isArray(weekObj.gameplayClocks) && weekObj.gameplayClocks.length > 0) {
      weekObj.gameplayClocks.forEach(function (clock, ci) {
        if (!clock) return;
        var label = 'gameplayClocks[' + ci + ']';
        if (!clock.clockName) errors.push(label + ' missing clockName');
        if (clock.segments === undefined || typeof clock.segments !== 'number') {
          errors.push(label + ' missing or non-numeric segments');
        }
        if (!clock.clockType) {
          errors.push(label + ' missing clockType');
        } else if (VALID_CLOCK_TYPES.indexOf(clock.clockType) === -1) {
          errors.push(label + ' unknown clockType: "' + clock.clockType + '"');
        }
        if (!clock.consequenceOnFull) errors.push(label + ' missing consequenceOnFull');
      });
    }

    // Interlude validation — renderer reads title and body when interlude exists
    if (weekObj.interlude && typeof weekObj.interlude === 'object') {
      if (!weekObj.interlude.title) errors.push('Interlude missing title');
      if (!weekObj.interlude.body) errors.push('Interlude missing body');
    }

    if (warnings.length > 0) {
      console.warn('[LiftRPG] Week advisory:', warnings.join('; '));
    }
    return { valid: errors.length === 0, errors: errors };
  }

  /**
   * Shell structural validation. Runs after shell stage (Stage 3).
   * Returns { valid: boolean, errors: string[] }
   */
  function validateShellSchema(shell, expectedOptions) {
    var errors = [];
    var warnings = [];
    if (!shell) { return { valid: false, errors: ['Shell is null'] }; }
    // Hard failures: match pre-restructure checks exactly
    if (!shell.meta) errors.push('Missing meta');
    if (!shell.cover) errors.push('Missing cover');
    if (!shell.rulesSpread) {
      errors.push('Missing rulesSpread');
    } else {
      if (!shell.rulesSpread.leftPage) errors.push('rulesSpread missing leftPage');
      if (!shell.rulesSpread.rightPage) errors.push('rulesSpread missing rightPage');
      if (shell.rulesSpread.leftPage && !Array.isArray(shell.rulesSpread.leftPage.sections)) {
        errors.push('rulesSpread.leftPage missing sections array');
      }
      if (shell.rulesSpread.leftPage && Array.isArray(shell.rulesSpread.leftPage.sections)) {
        if (shell.rulesSpread.leftPage.sections.length < 4) {
          errors.push('rulesSpread.leftPage.sections has fewer than 4 entries (' +
            shell.rulesSpread.leftPage.sections.length + ')');
        }
        shell.rulesSpread.leftPage.sections.forEach(function(s, i) {
          if (!s.heading) errors.push('leftPage.sections[' + i + '] missing heading');
          if (!s.body && !s.text) errors.push('leftPage.sections[' + i + '] missing body');
        });
      }
    }
    if (shell.meta) {
      if (!shell.meta.schemaVersion || !String(shell.meta.schemaVersion).match(/^1\.3/)) {
        errors.push('meta.schemaVersion should start with "1.3", got: ' + shell.meta.schemaVersion);
      }
      if (!('passwordEncryptedEnding' in shell.meta)) {
        errors.push('meta.passwordEncryptedEnding must exist (can be empty string)');
      }
      if (expectedOptions && expectedOptions.weekCount !== undefined && shell.meta.weekCount !== expectedOptions.weekCount) {
        errors.push('meta.weekCount must be exactly ' + expectedOptions.weekCount + ', got: ' + shell.meta.weekCount);
      }
      if (expectedOptions && expectedOptions.totalSessions > 0 && shell.meta.totalSessions !== expectedOptions.totalSessions) {
        errors.push('meta.totalSessions must be exactly ' + expectedOptions.totalSessions + ', got: ' + shell.meta.totalSessions);
      }
      if (expectedOptions && expectedOptions.weekCount !== undefined && shell.meta.passwordLength !== (expectedOptions.weekCount - 1)) {
        errors.push('meta.passwordLength must be exactly ' + (expectedOptions.weekCount - 1) + ', got: ' + shell.meta.passwordLength);
      }
    }
    if (shell.theme && shell.theme.visualArchetype) {
      if (VALID_ARCHETYPES.indexOf(shell.theme.visualArchetype) === -1) {
        errors.push('Unknown visualArchetype: "' + shell.theme.visualArchetype + '"');
      }
    }
    // ── Theme palette validation (renderer reads all 6 for 27 CSS vars) ──────
    if (shell.theme) {
      if (!shell.theme.palette || typeof shell.theme.palette !== 'object') {
        errors.push('theme.palette missing — renderer cannot set CSS variables');
      } else {
        var HEX_RE = /^#[0-9a-fA-F]{6}$/;
        ['ink', 'paper', 'accent', 'muted', 'rule', 'fog'].forEach(function (key) {
          var val = shell.theme.palette[key];
          if (!val) {
            errors.push('theme.palette.' + key + ' missing');
          } else if (!HEX_RE.test(val)) {
            errors.push('theme.palette.' + key + ' is not valid hex: "' + val + '"');
          }
        });
      }
    }

    // ── Meta sub-fields consumed by renderer ──────────────────────────────────
    if (shell.meta) {
      if (!shell.meta.blockTitle) errors.push('meta.blockTitle missing');
      if (!shell.meta.worldContract) warnings.push('Shell → meta: missing worldContract');
      if (!shell.meta.artifactIdentity) warnings.push('Shell → meta: missing artifactIdentity');

      // narrativeVoice — render.js reads .person and .tense
      var nv = shell.meta.narrativeVoice;
      if (!nv || typeof nv !== 'object') {
        errors.push('meta.narrativeVoice missing');
      } else {
        if (!nv.person) errors.push('meta.narrativeVoice.person missing');
        if (!nv.tense) errors.push('meta.narrativeVoice.tense missing');
      }

      // structuralShape — cover page reads .resolution
      var ss = shell.meta.structuralShape;
      if (!ss || typeof ss !== 'object') {
        errors.push('meta.structuralShape missing');
      } else {
        if (!ss.resolution) errors.push('meta.structuralShape.resolution missing');
      }
    }

    // ── Cover required fields (renderer reads all three) ──────────────────────
    if (shell.cover) {
      if (!shell.cover.title) errors.push('cover.title missing');
      if (!shell.cover.designation) errors.push('cover.designation missing');
      if (!shell.cover.tagline) errors.push('cover.tagline missing');
      if (!Array.isArray(shell.cover.colophonLines) || shell.cover.colophonLines.length < 3) {
        errors.push('cover.colophonLines must be an array with at least 3 items');
      }
    }

    // ── Rules spread right page instruction ───────────────────────────────────
    if (shell.rulesSpread && shell.rulesSpread.rightPage) {
      if (!shell.rulesSpread.rightPage.instruction) {
        errors.push('rulesSpread.rightPage.instruction missing');
      }
    }

    if (!shell.theme) warnings.push('Shell → theme: missing entirely');
    if (warnings.length > 0) {
      console.warn('[LiftRPG] Shell advisory:', warnings.join('; '));
    }
    return { valid: errors.length === 0, errors: errors };
  }

  // Validates the assembled booklet. Returns array of human-readable errors.
  // Fragment ID matching is soft: "F.01" matches "F-01", "f_01", etc.

  function validateAssembledBooklet(booklet) {
    var errors = [];
    var warnings = []; // soft issues (stylistic, non-fatal) — attached to return value

    // ── Top-level structure ──────────────────────────────────────────────────
    ['meta', 'cover', 'rulesSpread', 'weeks', 'fragments', 'endings'].forEach(function (key) {
      if (!booklet[key]) errors.push('Missing top-level key: ' + key);
    });

    var meta = booklet.meta || {};
    var weeks = booklet.weeks || [];
    var fragments = booklet.fragments || [];

    if (!meta.artifactIdentity || typeof meta.artifactIdentity !== 'object') {
      warnings.push('meta.artifactIdentity is missing; renderer will fall back to a derived shell family.');
    }

    // ── Meta consistency ─────────────────────────────────────────────────────
    if (meta.weekCount !== undefined && meta.weekCount !== weeks.length) {
      errors.push('meta.weekCount (' + meta.weekCount + ') does not match weeks.length (' + weeks.length + ')');
    }
    if (meta.totalSessions !== undefined) {
      var actualSessions = 0;
      weeks.forEach(function (w) { actualSessions += (w.sessions || []).length; });
      if (meta.totalSessions !== actualSessions) {
        errors.push('meta.totalSessions (' + meta.totalSessions + ') does not match actual session count (' + actualSessions + ')');
      }
    }

    // ── Boss week: exactly one, must be final ────────────────────────────────
    var bossWeeks = weeks.filter(function (w) { return w.isBossWeek; });
    if (bossWeeks.length === 0) {
      errors.push('No boss week found (isBossWeek: true)');
    } else if (bossWeeks.length > 1) {
      errors.push('Multiple boss weeks found — must be exactly one');
    }
    if (weeks.length > 0 && !weeks[weeks.length - 1].isBossWeek) {
      errors.push('Boss week must be the final week in the array');
    }
    if (bossWeeks.length === 1 && !bossWeeks[0].bossEncounter) {
      errors.push('Boss week (isBossWeek: true) has no bossEncounter object');
    }

    // ── Fragment documentType validation ────────────────────────────────────
    // Derive from DOCUMENT_TYPE_ENUM (single source of truth for schema + validator)
    var validDocLookup = {};
    DOCUMENT_TYPE_ENUM.forEach(function (t) { validDocLookup[t] = true; });
    fragments.forEach(function (f) {
      if (f.documentType && !validDocLookup[f.documentType]) {
        errors.push('Fragment "' + (f.id || '?') + '": documentType "' + f.documentType + '" not in supported list');
      }
      if (!f.designSpec || typeof f.designSpec !== 'object') {
        warnings.push('Fragment "' + (f.id || '?') + '": missing designSpec (renderer falls back to neutral defaults)');
      }
    });

    // ── Fragment + overflow document ID uniqueness ───────────────────────────
    var fragmentIds = {};
    var fragmentIdsNorm = {};
    var allDocIds = {};  // fragments + overflow docs combined
    fragments.forEach(function (f) {
      if (f.id) {
        var nid = normalizeId(f.id);
        if (fragmentIds[f.id]) {
          errors.push('Duplicate fragment ID: "' + f.id + '"');
        }
        fragmentIds[f.id] = true;
        fragmentIdsNorm[nid] = true;
        if (allDocIds[nid]) {
          errors.push('Fragment ID "' + f.id + '" collides with another document ID');
        }
        allDocIds[nid] = 'fragment';
      }
    });

    // Collect overflow document IDs and check for collisions + required fields
    weeks.forEach(function (week, wi) {
      var wn = 'Week ' + (wi + 1);
      var hasOverflow = (week.sessions || []).length > 3;
      var od = week.overflowDocument;

      // Week alignment: overflow weeks must have overflow docs
      if (hasOverflow && !od) {
        errors.push(wn + ' has > 3 sessions but no overflowDocument');
      }

      if (od) {
        // Required fields
        if (!od.id) {
          errors.push(wn + ' overflowDocument missing id');
        }
        if (!od.documentType) {
          errors.push(wn + ' overflowDocument missing documentType');
        } else if (!validDocLookup[od.documentType]) {
          errors.push(wn + ' overflowDocument: documentType "' + od.documentType + '" not in supported list');
        }
        if (!od.content && !od.body) {
          errors.push(wn + ' overflowDocument missing content');
        }
        if (!od.designSpec || typeof od.designSpec !== 'object') {
          warnings.push(wn + ' overflowDocument missing designSpec (renderer falls back to neutral defaults)');
        }

        // ID collision check
        if (od.id) {
          var nid = normalizeId(od.id);
          if (allDocIds[nid]) {
            errors.push(wn + ' overflowDocument ID "' + od.id + '" collides with ' + (allDocIds[nid] === 'fragment' ? 'a fragment' : 'another overflow document'));
          }
          allDocIds[nid] = 'overflow';
        }
      }
    });

    function fragmentExists(ref) {
      var nid = normalizeId(ref);
      return fragmentIds[ref] || fragmentIdsNorm[nid] || allDocIds[nid] === 'overflow';
    }

    // ── Collect non-boss weeklyComponent values for boss verification ────────
    var nonBossValues = [];
    var hasBinaryChoice = false;
    var binaryChoiceWeek = null;
    var weekMapSnapshots = []; // collected for cross-week map progression check

    // ── Per-week validation ──────────────────────────────────────────────────
    weeks.forEach(function (week, wi) {
      var wn = 'Week ' + (wi + 1);
      var fo = week.fieldOps || {};

      // -- Sessions --
      (week.sessions || []).forEach(function (s, si) {
        if (s.fragmentRef && !fragmentExists(s.fragmentRef)) {
          errors.push(wn + ' session ' + (si + 1) + ': fragmentRef "' + s.fragmentRef + '" not found in fragments[] or overflowDocument IDs');
        }
        if (s.binaryChoice) {
          hasBinaryChoice = true;
          binaryChoiceWeek = wn;
        }
      });

      // -- Oracle validation --
      var oracle = fo.oracleTable || fo.oracle || {};
      if (!week.isBossWeek) {
        if (!oracle.title) errors.push(wn + ' oracle: missing title');
        if (!oracle.instruction) errors.push(wn + ' oracle: missing instruction');
      }
      var entries = oracle.entries || [];
      entries.forEach(function (entry, ei) {
        if (Object.prototype.hasOwnProperty.call(entry, 'description')) {
          errors.push(wn + ' oracle[' + ei + ']: uses "description" — must be "text"');
        }
        if (entry.type === 'fragment' && !entry.fragmentRef) {
          errors.push(wn + ' oracle[' + ei + ']: type "fragment" missing fragmentRef');
        }
        if (entry.fragmentRef && !fragmentExists(entry.fragmentRef)) {
          errors.push(wn + ' oracle[' + ei + ']: fragmentRef "' + entry.fragmentRef + '" not found in fragments[] or overflowDocument IDs');
        }
      });

      collectOracleBandErrors(entries, wn + ' oracle').forEach(function (message) {
        errors.push(message);
      });

      // -- Cipher validation (non-boss weeks) --
      var cipher = fo.cipher || {};
      if (!week.isBossWeek) {
        // Required cipher fields
        var REQUIRED_CIPHER_FIELDS = ['type', 'title', 'body', 'extractionInstruction', 'characterDerivationProof', 'noticeabilityDesign'];
        REQUIRED_CIPHER_FIELDS.forEach(function (field) {
          if (cipher[field] === undefined || cipher[field] === null || cipher[field] === '') {
            errors.push(wn + ' cipher: missing required field "' + field + '"');
          }
        });
        if (cipher.body !== undefined && typeof cipher.body !== 'object') {
          errors.push(wn + ' cipher.body: must be an object, got ' + (typeof cipher.body));
        }
      }

      // -- Map grid integrity --
      var mapState = fo.mapState;
      if (mapState && mapState.gridDimensions) {
        var dims = mapState.gridDimensions;
        var tiles = mapState.tiles || [];
        var expectedTileCount = (dims.rows || 0) * (dims.columns || 0);

        if (tiles.length > 0 && tiles.length !== expectedTileCount) {
          errors.push(wn + ' mapState: rows(' + dims.rows + ') * columns(' + dims.columns + ') = ' + expectedTileCount + ' but got ' + tiles.length + ' tiles');
        }

        // Duplicate coordinate check + bounds check
        if (tiles.length > 0) {
          var coordsSeen = {};
          tiles.forEach(function (tile, ti) {
            if (tile.row !== undefined && tile.col !== undefined) {
              var coord = tile.row + ',' + tile.col;
              if (coordsSeen[coord]) {
                errors.push(wn + ' mapState tile[' + ti + ']: duplicate coord (' + coord + ')');
              }
              coordsSeen[coord] = true;
              if (tile.row < 1 || tile.row > dims.rows) {
                errors.push(wn + ' mapState tile[' + ti + ']: row ' + tile.row + ' out of bounds (1\u2013' + dims.rows + ')');
              }
              if (tile.col < 1 || tile.col > dims.columns) {
                errors.push(wn + ' mapState tile[' + ti + ']: col ' + tile.col + ' out of bounds (1\u2013' + dims.columns + ')');
              }
            }
          });
        }

        // currentPosition validity
        var cp = mapState.currentPosition;
        if (cp) {
          if (cp.row !== undefined && (cp.row < 1 || cp.row > dims.rows)) {
            errors.push(wn + ' mapState.currentPosition: row ' + cp.row + ' out of bounds (1\u2013' + dims.rows + ')');
          }
          if (cp.col !== undefined && (cp.col < 1 || cp.col > dims.columns)) {
            errors.push(wn + ' mapState.currentPosition: col ' + cp.col + ' out of bounds (1\u2013' + dims.columns + ')');
          }
          // Verify currentPosition corresponds to an actual tile
          if (cp.row !== undefined && cp.col !== undefined && tiles.length > 0) {
            var cpCoord = cp.row + ',' + cp.col;
            if (!coordsSeen[cpCoord]) {
              errors.push(wn + ' mapState.currentPosition (' + cpCoord + ') does not match any tile');
            }
          }
        }
      }

      // Collect map snapshot for cross-week progression check (non-boss only)
      if (!week.isBossWeek && mapState && mapState.tiles && mapState.tiles.length > 0) {
        var tileByCoord = {};
        (mapState.tiles || []).forEach(function (t) {
          if (t.row !== undefined && t.col !== undefined) {
            tileByCoord[t.row + ',' + t.col] = t.type || 'unknown';
          }
        });
        weekMapSnapshots.push({
          weekIndex: wi,
          dims: mapState.gridDimensions || {},
          tileByCoord: tileByCoord
        });
      }

      // -- Interlude payloadType --
      var interlude = week.interlude || {};
      if (interlude.payloadType && !VALID_PAYLOAD_TYPES[interlude.payloadType]) {
        errors.push(wn + ' interlude.payloadType: "' + interlude.payloadType + '" not supported');
      }

      // -- weeklyComponent.value on non-boss weeks --
      if (!week.isBossWeek) {
        var wc = week.weeklyComponent || {};
        if (wc.value === undefined || wc.value === null || wc.value === '') {
          errors.push(wn + ': weeklyComponent.value is missing or empty');
        }
        nonBossValues.push(wc.value);
      }
    });

    // ── Cross-week map progression validation ─────────────────────────────────
    if (weekMapSnapshots.length >= 2) {
      // Impossible tile regressions: cleared→locked, anomaly→locked
      var REGRESSION_PAIRS = { 'cleared→locked': true, 'anomaly→locked': true };
      var firstDims = weekMapSnapshots[0].dims;

      for (var mi = 1; mi < weekMapSnapshots.length; mi++) {
        var prev = weekMapSnapshots[mi - 1];
        var curr = weekMapSnapshots[mi];
        var prevWn = 'Week ' + (prev.weekIndex + 1);
        var currWn = 'Week ' + (curr.weekIndex + 1);

        // Grid dimension consistency (warning — dimensions could change for narrative reasons)
        if (curr.dims.rows !== firstDims.rows || curr.dims.columns !== firstDims.columns) {
          warnings.push(currWn + ' mapState gridDimensions (' + curr.dims.rows + 'x' + curr.dims.columns +
            ') differ from Week 1 (' + firstDims.rows + 'x' + firstDims.columns + ')');
        }

        // Tile state regressions (error — logically impossible)
        for (var coord in prev.tileByCoord) {
          if (curr.tileByCoord[coord]) {
            var transition = prev.tileByCoord[coord] + '\u2192' + curr.tileByCoord[coord];
            if (REGRESSION_PAIRS[transition]) {
              errors.push(prevWn + '\u2192' + currWn + ' tile (' + coord + '): impossible regression ' + transition);
            }
          }
        }
      }
    }

    // ── Boss encounter validation ────────────────────────────────────────────
    if (bossWeeks.length === 1) {
      var boss = bossWeeks[0].bossEncounter || {};
      var inputs = boss.componentInputs || [];
      var nonBossCount = weeks.filter(function (w) { return !w.isBossWeek; }).length;

      // componentInputs count must match non-boss weeks (error — deterministic invariant)
      if (inputs.length > 0 && inputs.length !== nonBossCount) {
        errors.push('Boss componentInputs has ' + inputs.length + ' values but there are ' + nonBossCount + ' non-boss weeks');
      }

      // componentInputs values must exactly match collected weeklyComponent values in order
      if (inputs.length === nonBossValues.length && inputs.length > 0) {
        for (var ci = 0; ci < inputs.length; ci++) {
          if (String(inputs[ci]) !== String(nonBossValues[ci])) {
            errors.push('Boss componentInputs[' + ci + '] = "' + inputs[ci] + '" does not match Week ' + (ci + 1) + ' weeklyComponent.value = "' + nonBossValues[ci] + '"');
          }
        }
      }

      // ── A1Z26 numeric validity (when boss decode is standard alphabetic) ────
      var dk = boss.decodingKey;
      var isA1Z26Boss = dk && dk.referenceTable && isStandardAlphaTable(dk.referenceTable);

      if (isA1Z26Boss) {
        // Each non-boss weeklyComponent.value must be an integer 1–26
        nonBossValues.forEach(function (val, vi) {
          if (val === undefined || val === null || val === '') return; // already flagged above
          var n = Number(val);
          if (isNaN(n) || n !== Math.floor(n)) {
            errors.push('Week ' + (vi + 1) + ' weeklyComponent.value "' + val + '" is not an integer (required for A1Z26 decode)');
          } else if (n < 1 || n > 26) {
            errors.push('Week ' + (vi + 1) + ' weeklyComponent.value ' + n + ' out of A1Z26 range (1\u201326)');
          }
        });

        // Verify demoPassword matches deterministic derivation
        var derivedPassword = decodeA1Z26(
          (boss.componentInputs || []).map(function (v) { return Number(v); })
        );
        if (derivedPassword && meta.demoPassword) {
          if (meta.demoPassword !== derivedPassword) {
            errors.push('meta.demoPassword "' + meta.demoPassword + '" does not match derived A1Z26 password "' + derivedPassword + '"');
          }
        }

        // Repeated decoded letters (warning — stylistic, not impossible)
        if (derivedPassword) {
          var letterCounts = {};
          for (var li = 0; li < derivedPassword.length; li++) {
            var ch = derivedPassword[li];
            letterCounts[ch] = (letterCounts[ch] || 0) + 1;
          }
          for (var letter in letterCounts) {
            if (letterCounts[letter] > 1) {
              warnings.push('A1Z26 decoded password "' + derivedPassword + '" has repeated letter "' + letter + '" (\u00d7' + letterCounts[letter] + ')');
            }
          }
        }
      }

      // binaryChoice → binaryChoiceAcknowledgement cross-check
      if (hasBinaryChoice) {
        var bca = boss.binaryChoiceAcknowledgement;
        if (!bca) {
          errors.push('A session has binaryChoice (' + binaryChoiceWeek + ') but boss encounter has no binaryChoiceAcknowledgement');
        } else {
          if (!bca.ifA) {
            errors.push('Boss binaryChoiceAcknowledgement missing ifA');
          }
          if (!bca.ifB) {
            errors.push('Boss binaryChoiceAcknowledgement missing ifB');
          }
        }
      }
    }

    // Attach warnings as a property on the errors array (preserves API contract)
    errors.warnings = warnings;
    return errors;
  }

  // ── Multi-stage pipeline helpers ────────────────────────────────────────

  function unwrapIfNeeded(result, expectedKey) {
    if (!result || typeof result !== 'object') return result;
    if (Array.isArray(result)) return result; // arrays are not wrapper objects
    if (result[expectedKey]) return result;
    var keys = Object.keys(result);
    if (keys.length === 1) {
      var inner = result[keys[0]];
      if (inner && typeof inner === 'object' && inner[expectedKey]) {
        console.warn('[LiftRPG] Stage output wrapped in "' + keys[0] + '" key — unwrapping to get "' + expectedKey + '"');
        return inner;
      }
    }
    return result;
  }

  // Normalize companionComponents: model sometimes returns an object keyed by
  // component name instead of the expected array. Convert in place.
  function normalizeCompanionComponents(week) {
    var fo = week.fieldOps || week.bossEncounter;
    if (!fo || !fo.companionComponents) return;
    if (Array.isArray(fo.companionComponents)) return;
    if (typeof fo.companionComponents === 'object' && fo.companionComponents !== null) {
      var cc = fo.companionComponents;
      fo.companionComponents = Object.keys(cc).map(function (key) {
        var val = cc[key];
        if (typeof val === 'object' && val !== null) {
          if (!val.type) val.type = key;
          return val;
        }
        return { type: key, value: val };
      });
      console.warn('[LiftRPG] Normalized companionComponents from object to array (' + fo.companionComponents.length + ' items)');
    }
  }

  // Normalize documentType aliases (e.g. 'letter' → 'correspondence') on
  // fragments, overflow documents, and endings in place.
  function normalizeDocumentTypes(booklet) {
    (booklet.fragments || []).forEach(function (f) {
      if (f.documentType && DOCUMENT_TYPE_ALIASES[f.documentType]) {
        f.documentType = DOCUMENT_TYPE_ALIASES[f.documentType];
      }
    });
    (booklet.weeks || []).forEach(function (week) {
      if (week.overflowDocument && week.overflowDocument.documentType && DOCUMENT_TYPE_ALIASES[week.overflowDocument.documentType]) {
        week.overflowDocument.documentType = DOCUMENT_TYPE_ALIASES[week.overflowDocument.documentType];
      }
    });
    (booklet.endings || []).forEach(function (ending) {
      var content = ending.content;
      if (content && content.documentType && DOCUMENT_TYPE_ALIASES[content.documentType]) {
        content.documentType = DOCUMENT_TYPE_ALIASES[content.documentType];
      }
    });
  }

  function buildOpenAICompatUrl(baseUrl) {
    return String(baseUrl || '').replace(/\/+$/, '') + '/chat/completions';
  }

  function buildOpenAICompatHeaders(apiKey) {
    var headers = { 'content-type': 'application/json' };
    if (apiKey) headers.Authorization = 'Bearer ' + apiKey;
    return headers;
  }

  function isStructuredOutputUnsupportedMessage(message) {
    var lower = String(message || '').toLowerCase();
    return lower.indexOf('response_format') !== -1
      || lower.indexOf('json_schema') !== -1
      || lower.indexOf('unsupported') !== -1
      || lower.indexOf('not supported') !== -1
      || lower.indexOf('unknown parameter') !== -1
      || lower.indexOf('invalid parameter') !== -1;
  }

  function buildStructuredStageName(stageName) {
    return String(stageName || 'stage')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48) || 'stage';
  }

  function isLikelyTruncationError(err) {
    var lower = String((err && err.message) || err || '').toLowerCase();
    return lower.indexOf('truncated') !== -1
      || lower.indexOf('max_tokens') !== -1
      || lower.indexOf('output token limit') !== -1
      || lower.indexOf('finish_reason') !== -1 && lower.indexOf('length') !== -1
      || lower.indexOf('unexpected end') !== -1
      || lower.indexOf('unexpected eof') !== -1
      || lower.indexOf('unterminated') !== -1;
  }

  function isLikelyJsonFailure(err) {
    var lower = String((err && err.message) || err || '').toLowerCase();
    return lower.indexOf('malformed json') !== -1
      || lower.indexOf('json') !== -1 && lower.indexOf('repair') !== -1
      || lower.indexOf('parse') !== -1 && lower.indexOf('json') !== -1
      || lower.indexOf('no json object found') !== -1;
  }

  function isLikelySchemaFailure(err) {
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

  function shouldFallbackFromStructured(err) {
    var message = (err && err.message) || '';
    return !!(err && err.structuredUnsupported)
      || isStructuredOutputUnsupportedMessage((err && err.message) || '')
      || String(message).toLowerCase().indexOf('unexpected structured response shape') !== -1
      || (isLikelyJsonFailure(err) && !isLikelyTruncationError(err));
  }

  function isLikelyTimeoutError(err) {
    var lower = String((err && err.message) || err || '').toLowerCase();
    return lower.indexOf('timed out') !== -1
      || lower.indexOf('timeout') !== -1
      || lower.indexOf('aborterror') !== -1
      || lower.indexOf('stalled') !== -1;
  }

  function shouldRetryStageError(err) {
    return isLikelyTimeoutError(err) || isLikelyTruncationError(err) || isLikelyJsonFailure(err) || isLikelySchemaFailure(err);
  }

  function shouldSplitWeekChunk(err, weekNumbers) {
    return weekNumbers.length > 1 && shouldRetryStageError(err);
  }

  function shouldSplitFragmentBatch(err, registry) {
    return registry.length > 1 && shouldRetryStageError(err);
  }

  function truncateText(value, maxLength) {
    var text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!maxLength || text.length <= maxLength) return text;
    return text.slice(0, Math.max(0, maxLength - 3)).replace(/\s+\S*$/, '') + '...';
  }

  function compactJsonString(value) {
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return '{}';
    }
  }

  function parseWeekCountFromWorkout(workout) {
    if (typeof window !== 'undefined' && typeof window.parseWeekCount === 'function') {
      return window.parseWeekCount(workout);
    }
    var match = String(workout || '').match(/(\d+)\s*weeks?\b/i);
    var count = match ? parseInt(match[1], 10) : 6;
    return Math.max(4, Math.min(12, count || 6));
  }

  function summarizeLayerBibleForCampaignRetry(layerBible) {
    var bible = layerBible || {};
    var story = bible.storyLayer || {};
    var protagonist = story.protagonist || {};
    var game = bible.gameLayer || {};
    var governing = bible.governingLayer || {};
    var ledger = bible.designLedger || {};
    return {
      story: {
        premise: truncateText(story.premise, 160),
        protagonist: {
          role: truncateText(protagonist.role, 60),
          want: truncateText(protagonist.want, 70),
          need: truncateText(protagonist.need, 70),
          flaw: truncateText(protagonist.flaw, 70),
          wound: truncateText(protagonist.wound, 70),
          arc: truncateText(protagonist.arc, 90)
        },
        antagonistPressure: truncateText(story.antagonistPressure, 120),
        midpointReversal: truncateText(story.midpointReversal, 120),
        darkestMoment: truncateText(story.darkestMoment, 120),
        bossTruth: truncateText(story.bossTruth, 120)
      },
      cast: (story.relationshipWeb || []).slice(0, 5).map(function (entry) {
        return {
          name: entry.name || '',
          role: truncateText(entry.role, 50),
          secret: truncateText(entry.secret, 70),
          arcFunction: truncateText(entry.arcFunction, 70)
        };
      }),
      game: {
        topology: truncateText(game.persistentTopology, 130),
        zones: (game.majorZones || []).slice(0, 5),
        gatesAndKeys: (game.gatesAndKeys || []).slice(0, 6),
        progressionGates: (game.progressionGates || []).slice(0, 6).map(function (entry) {
          return {
            week: entry.week,
            playerGains: truncateText(entry.playerGains, 70),
            unlocks: truncateText(entry.unlocks, 70),
            requires: truncateText(entry.requires, 70)
          };
        }),
        bossConvergence: truncateText(game.bossConvergence, 120)
      },
      governing: {
        institutionName: truncateText(governing.institutionName, 70),
        departments: (governing.departments || []).slice(0, 4),
        procedures: (governing.proceduresThatAffectPlay || []).slice(0, 4)
      },
      designLedger: {
        mysteryQuestions: (ledger.mysteryQuestions || []).slice(0, 3),
        falseAssumptions: (ledger.falseAssumptions || []).slice(0, 3),
        motifPayoffs: (ledger.motifPayoffs || []).slice(0, 4),
        weekTransformations: (ledger.weekTransformations || []).slice(0, 8),
        finalReveal: truncateText(ledger.finalRevealRecontextualizes, 140)
      }
    };
  }

  function buildCompactCampaignRetryPrompt(workout, brief, layerBible, retryState) {
    var weekCount = parseWeekCountFromWorkout(workout);
    var midpoint = Math.ceil(weekCount / 2);
    var lastError = retryState && retryState.error ? truncateText(retryState.error.message || retryState.error, 180) : '';
    return [
      '# API Stage 2 — Story Plan (Compact Retry)',
      '',
      'Return JSON only.',
      'Generate a compact but complete campaign plan that matches this exact top-level shape:',
      '{"topology":{},"weeks":[],"bossPlan":{},"fragmentRegistry":[],"overflowRegistry":[]}',
      '',
      '## Hard Requirements',
      '- Use exactly ' + weekCount + ' weeks.',
      '- Week ' + midpoint + ' must be the binary choice week.',
      '- Week ' + weekCount + ' must be the boss week.',
      '- Every week needs: weekNumber, arcBeat, npcBeat, stateSnapshot, playerGains, zoneFocus, mapReuse, stateChange, newGateOrUnlock, weeklyComponentMeaning, oraclePressure, fragmentFunction, governingProcedure, companionChange, isBossWeek, isBinaryChoiceWeek, sessionBeatTypes.',
      '- fragmentRegistry must establish clues early, complicate them mid-block, and reveal them late.',
      '- Keep descriptions concise. Preserve clue economy, progression, and convergence logic.',
      lastError ? '- Fix the prior failure: ' + lastError : '',
      '',
      '## Layer Codex Essentials',
      compactJsonString(summarizeLayerBibleForCampaignRetry(layerBible)),
      '',
      '## Inputs',
      'Workout: ' + truncateText(workout, 900),
      'Creative direction: ' + truncateText(brief || '', 420)
    ].filter(Boolean).join('\n');
  }

  function isSlowPlanningModel(settings) {
    var providerId = detectProviderId(settings);
    var modelId = normalizeModelId(settings && settings.model);
    return (providerId === 'anthropic' && /^claude-opus/i.test(modelId))
      || (providerId === 'openai' && /(gpt-5(?:\.4)?-pro|o3-pro)/i.test(modelId));
  }

  async function callOpenAICompatStructured(apiKey, baseUrl, model, prompt, schema, maxTokens, timeoutMs, stageName, pricingRule) {
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
        || ('HTTP ' + resp.status + ' — ' + JSON.stringify(body).slice(0, 500));
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

  async function callProviderStructured(settings, prompt, schema, maxTokens, stageName) {
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

  function buildRetryDirective(stageName, attempt, err) {
    return [
      '',
      '## Retry Directive',
      '- This is retry ' + (attempt + 1) + ' for ' + stageName + '.',
      '- Keep prose concrete and high-signal, but slightly tighter so the full JSON completes cleanly.',
      '- Preserve named characters, shell identity, clue economy, and map continuity.',
      '- Fix the failure that caused the retry: ' + truncateText(((err && err.message) || 'unknown issue'), 240)
    ].join('\n');
  }

  function prefixStageError(stageName, err) {
    var message = String((err && err.message) || err || 'Unknown error');
    if (message.indexOf('[' + stageName + '] ') === 0) return err instanceof Error ? err : new Error(message);
    return new Error('[' + stageName + '] ' + message);
  }

  function getApiPromptBuilders() {
    return {
      stage1: window.generateApiStage1Prompt || window.generateStage1Prompt,
      stage2: window.generateApiStage2Prompt || window.generateStage2Prompt,
      shell: window.generateApiShellPrompt || window.generateShellPrompt,
      weeks: window.generateApiWeekChunkPrompt || window.generateWeekChunkPrompt,
      weekPlan: window.generateSingleWeekPlanPrompt,
      singleWeekFinal: window.generateSingleWeekFinalPrompt,
      fragments: window.generateApiFragmentsPrompt || window.generateFragmentsPrompt,
      singleFragment: window.generateSingleFragmentPrompt,
      fragmentBatch: window.generateApiFragmentBatchPrompt || window.generateFragmentBatchPrompt,
      endings: window.generateApiEndingsPrompt || window.generateEndingsPrompt,
      singleEnding: window.generateSingleEndingPrompt
    };
  }

  function assertApiPromptBuilders(builders) {
    // weekPlan is optional — the live pipeline uses campaignPlan weeks directly.
    // It's only used by the manual wizard path.
    if (!builders.stage1 || !builders.stage2 || !builders.shell || !builders.weeks ||
      !builders.singleWeekFinal ||
      !builders.fragments || !builders.singleFragment ||
      !builders.fragmentBatch || !builders.endings || !builders.singleEnding) {
      throw new Error('Pipeline generators not loaded. Please reload the page.');
    }
  }

  function validateLayerBibleStage(result) {
    if (!result) return 'Layer Codex → missing required sections (null result).';
    var errors = [];
    var warnings = [];
    // Hard failures: top-level sections must exist (matches pre-restructure behavior)
    if (!result.storyLayer) errors.push('Layer Codex → storyLayer: missing entirely');
    if (!result.gameLayer) errors.push('Layer Codex → gameLayer: missing entirely');
    if (!result.governingLayer) errors.push('Layer Codex → governingLayer: missing entirely');
    if (!result.designLedger) {
      errors.push('Layer Codex → designLedger: missing entirely');
    } else {
      // designLedger sub-fields are hard requirements (were checked before restructure)
      if (!result.designLedger.mysteryQuestions) errors.push('Layer Codex → designLedger: missing mysteryQuestions');
      if (!result.designLedger.weekTransformations) errors.push('Layer Codex → designLedger: missing weekTransformations');
      if (!result.designLedger.falseAssumptions) warnings.push('Layer Codex → designLedger: missing falseAssumptions');
      if (!result.designLedger.motifPayoffs) warnings.push('Layer Codex → designLedger: missing motifPayoffs');
      if (!result.designLedger.finalRevealRecontextualizes) warnings.push('Layer Codex → designLedger: missing finalRevealRecontextualizes');
    }
    // Advisory warnings: sub-field checks for debugging (logged, not blocking)
    if (result.storyLayer) {
      if (!result.storyLayer.premise) warnings.push('Layer Codex → storyLayer: missing premise');
      if (!result.storyLayer.protagonist) warnings.push('Layer Codex → storyLayer: missing protagonist');
      if (!result.storyLayer.antagonistPressure) warnings.push('Layer Codex → storyLayer: missing antagonistPressure');
      if (!result.storyLayer.recurringMotifs) warnings.push('Layer Codex → storyLayer: missing recurringMotifs');
    }
    if (result.gameLayer) {
      if (!result.gameLayer.coreLoop) warnings.push('Layer Codex → gameLayer: missing coreLoop');
      if (!result.gameLayer.persistentTopology) warnings.push('Layer Codex → gameLayer: missing persistentTopology');
      if (!result.gameLayer.majorZones) warnings.push('Layer Codex → gameLayer: missing majorZones');
    }
    if (result.governingLayer) {
      if (!result.governingLayer.institutionName) warnings.push('Layer Codex → governingLayer: missing institutionName');
      if (!result.governingLayer.departments) warnings.push('Layer Codex → governingLayer: missing departments');
    }
    if (result.designLedger && !result.designLedger.clueEconomy) {
      warnings.push('Layer Codex → designLedger: missing clueEconomy');
    }
    if (warnings.length > 0) {
      console.warn('[LiftRPG] Layer Codex advisory:', warnings.join('; '));
    }
    if (errors.length > 0) return errors.join('; ');
    return '';
  }

  function validateCampaignPlanStage(result) {
    if (!result) return 'Campaign Plan → missing required sections (null result).';
    var errors = [];
    var warnings = [];
    // Hard failures: weeks[] and bossPlan must exist (matches pre-restructure behavior)
    if (!Array.isArray(result.weeks)) {
      errors.push('Campaign Plan → weeks: missing or not an array');
    } else if (result.weeks.length === 0) {
      errors.push('Campaign Plan → weeks: empty array');
    }
    if (!result.bossPlan) errors.push('Campaign Plan → bossPlan: missing');
    // Advisory warnings: sub-field checks for debugging
    if (!result.topology) {
      warnings.push('Campaign Plan → topology: missing entirely');
    } else if (!result.topology.zones) {
      warnings.push('Campaign Plan → topology: missing zones');
    }
    if (!Array.isArray(result.overflowRegistry)) {
      warnings.push('Campaign Plan → overflowRegistry: missing or not an array');
    }
    if (!Array.isArray(result.fragmentRegistry)) {
      warnings.push('Campaign Plan → fragmentRegistry: missing or not an array');
    } else {
      result.fragmentRegistry.forEach(function (f, i) {
        if (!f.id) warnings.push('Campaign Plan → fragmentRegistry[' + i + ']: missing id');
        if (!f.weekRef) warnings.push('Campaign Plan → fragmentRegistry[' + i + ']: missing weekRef');
      });
    }
    if (Array.isArray(result.weeks)) {
      result.weeks.forEach(function (w, i) {
        if (!w.weekNumber) warnings.push('Campaign Plan → weeks[' + i + ']: missing weekNumber');
      });
    }
    if (warnings.length > 0) {
      console.warn('[LiftRPG] Campaign Plan advisory:', warnings.join('; '));
    }
    if (errors.length > 0) return errors.join('; ');
    return '';
  }

  function validateWeeksStage(result, expectedWeeks) {
    if (!result || !Array.isArray(result.weeks)) {
      return 'Week stage validation failed: expected a { weeks:[...] } object.';
    }
    var requested = (expectedWeeks || []).slice().sort(function (a, b) { return a - b; });
    var returned = result.weeks.map(function (week) { return week.weekNumber; }).sort(function (a, b) { return a - b; });
    if (requested.length !== returned.length) {
      return 'Week stage validation failed: expected ' + requested.length + ' weeks but received ' + returned.length + '.';
    }
    for (var i = 0; i < requested.length; i++) {
      if (requested[i] !== returned[i]) {
        return 'Week stage validation failed: expected weeks [' + requested.join(', ') + '] but received [' + returned.join(', ') + '].';
      }
    }
    return '';
  }

  function validateFragmentsStage(result, expectedRegistry) {
    if (!result || !Array.isArray(result.fragments)) {
      return 'Fragment stage validation failed: expected a { fragments:[...] } object.';
    }
    var expected = (expectedRegistry || []).map(function (entry) { return normalizeId(entry.id); }).filter(Boolean);
    if (!expected.length) return '';
    var seen = {};
    var extras = [];
    var invalid = [];
    var missingDesignSpec = [];
    var missingTitle = [];
    var missingDocType = [];
    var missingAuthor = [];
    var validDocLookup = {};
    DOCUMENT_TYPE_ENUM.forEach(function (t) { validDocLookup[t] = true; });

    result.fragments.forEach(function (fragment) {
      var id = normalizeId(fragment && fragment.id);
      if (!id) return;
      if (!fragment.content && !fragment.bodyParagraphs && !fragment.bodyText && !fragment.body) {
        invalid.push(fragment.id);
      }
      if (!fragment.designSpec || typeof fragment.designSpec !== 'object') {
        missingDesignSpec.push(fragment.id);
      }
      if (!fragment.title) {
        missingTitle.push(fragment.id);
      }
      if (!fragment.documentType) {
        missingDocType.push(fragment.id);
      } else if (!validDocLookup[fragment.documentType] && !DOCUMENT_TYPE_ALIASES[fragment.documentType]) {
        missingDocType.push(fragment.id + ' (invalid: "' + fragment.documentType + '")');
      }
      if (!fragment.inWorldAuthor) {
        missingAuthor.push(fragment.id);
      }
      seen[id] = true;
      if (expected.indexOf(id) === -1) extras.push(fragment.id);
    });
    if (missingDesignSpec.length > 0) {
      console.warn('[LiftRPG] Fragments missing designSpec: ' + missingDesignSpec.join(', '));
    }
    if (invalid.length > 0) {
      return 'Fragment stage validation failed: missing content/body in IDs ' + invalid.slice(0, 8).join(', ') + '.';
    }
    if (missingTitle.length > 0) {
      console.warn('[LiftRPG] Fragments missing title: ' + missingTitle.join(', '));
    }
    if (missingDocType.length > 0) {
      return 'Fragment stage validation failed: missing/invalid documentType in IDs ' + missingDocType.slice(0, 8).join(', ') + '.';
    }
    if (missingAuthor.length > 0) {
      return 'Fragment stage validation failed: missing inWorldAuthor in IDs ' + missingAuthor.slice(0, 8).join(', ') + '.';
    }
    var missing = expected.filter(function (id) { return !seen[id]; });
    if (missing.length > 0) {
      return 'Fragment stage validation failed: missing IDs ' + missing.slice(0, 8).join(', ') + '.';
    }
    if (extras.length > 0) {
      return 'Fragment stage validation failed: unexpected IDs ' + extras.slice(0, 8).join(', ') + '.';
    }
    return '';
  }

  function validateEndingsStage(result) {
    if (!result || !Array.isArray(result.endings) || result.endings.length === 0) {
      return 'Finale stage validation failed: expected a non-empty endings array.';
    }
    var issues = [];
    result.endings.forEach(function (ending, i) {
      var label = 'Ending ' + (i + 1);
      if (!ending.variant) issues.push(label + ' missing variant');
      if (!ending.content || typeof ending.content !== 'object') {
        issues.push(label + ' missing content object');
      } else {
        if (!ending.content.body) issues.push(label + ' missing content.body');
        if (!ending.content.documentType) issues.push(label + ' missing content.documentType');
        if (!ending.content.finalLine) issues.push(label + ' missing content.finalLine');
      }
      if (!ending.designSpec) {
        issues.push(label + ' missing designSpec');
      } else if (typeof ending.designSpec === 'object') {
        if (!ending.designSpec.paperTone) issues.push(label + ' designSpec missing paperTone');
      }
      // String designSpec is accepted for backward compatibility (renderer normalizes it)
    });
    return issues.length > 0 ? 'Finale stage: ' + issues.join('; ') : '';
  }

  function createStageTelemetry(stageKey, stageName) {
    return {
      stageKey: stageKey || '',
      stageName: stageName || '',
      attempts: 0,
      provider: '',
      model: '',
      usage: blankUsageTotals(),
      estimatedCostUsd: 0,
      pricing: null
    };
  }

  function summarizeStageTelemetry(telemetry) {
    var usage = telemetry && telemetry.usage ? telemetry.usage : blankUsageTotals();
    return {
      stageKey: telemetry && telemetry.stageKey ? telemetry.stageKey : '',
      stageName: telemetry && telemetry.stageName ? telemetry.stageName : '',
      attempts: telemetry && telemetry.attempts ? telemetry.attempts : 0,
      provider: telemetry && telemetry.provider ? telemetry.provider : '',
      model: telemetry && telemetry.model ? telemetry.model : '',
      usage: {
        inputTokens: safeNumber(usage.inputTokens),
        outputTokens: safeNumber(usage.outputTokens),
        cachedInputTokens: safeNumber(usage.cachedInputTokens),
        cacheWriteTokens: safeNumber(usage.cacheWriteTokens),
        cacheReadTokens: safeNumber(usage.cacheReadTokens),
        reasoningTokens: safeNumber(usage.reasoningTokens),
        totalTokens: safeNumber(usage.totalTokens)
      },
      estimatedCostUsd: telemetry ? telemetry.estimatedCostUsd : 0,
      pricing: telemetry && telemetry.pricing ? Object.assign({}, telemetry.pricing) : null
    };
  }

  function recordStageUsage(telemetry, response) {
    if (!telemetry || !response || !response.usage) return;
    telemetry.attempts += 1;
    telemetry.provider = response.usage.provider || telemetry.provider;
    telemetry.model = response.usage.model || telemetry.model;
    addUsageTotals(telemetry.usage, response.usage);
    if (response.usage.pricing) telemetry.pricing = response.usage.pricing;
    telemetry.estimatedCostUsd += safeNumber(response.usage.estimatedCostUsd);
  }

  function emitPipelineEvent(handler, stageIndex, totalStages, message, meta) {
    if (!handler) return;
    if (typeof handler === 'function') {
      handler(stageIndex, totalStages, message, meta || null);
      return;
    }
    if (typeof handler.onProgress === 'function') {
      handler.onProgress(stageIndex, totalStages, message, meta || null);
    }
  }

  async function runJsonStage(settings, config) {
    var attemptCount = config.maxAttempts || 2;
    var lastErr = null;
    var stageTelemetry = createStageTelemetry(config.stageKey, config.stageName);

    for (var attempt = 0; attempt < attemptCount; attempt++) {
      // Rate limiter: wait for slot before each API call (including retries)
      if (config.rateLimiter) await config.rateLimiter.waitForSlot();

      // Daily budget check: abort if Gemini free-tier limit reached
      if (config.budgetEnforce && isGeminiProvider(settings)) {
        var budget = getDailyBudget();
        if (budget.calls >= DAILY_CALL_LIMIT) {
          throw new Error('Daily API budget reached (' + budget.calls + '/' + DAILY_CALL_LIMIT +
            ' calls). Your progress is saved. Resume tomorrow or switch to a paid API key.');
        }
      }

      var retryState = { attempt: attempt, error: lastErr };
      var prompt = config.buildPrompt(retryState);
      if (attempt > 0) prompt += buildRetryDirective(config.stageName, attempt, lastErr);
      var resolvedMaxTokens = typeof config.maxTokens === 'function'
        ? config.maxTokens(retryState)
        : config.maxTokens;
      var resolvedTimeoutMs = typeof config.requestTimeoutMs === 'function'
        ? config.requestTimeoutMs(retryState)
        : (config.requestTimeoutMs || settings.requestTimeoutMs || DEFAULT_TIMEOUT_MS);
      var stageSettings = resolvedTimeoutMs === (settings.requestTimeoutMs || DEFAULT_TIMEOUT_MS)
        ? settings
        : Object.assign({}, settings, { requestTimeoutMs: resolvedTimeoutMs });

      try {
        var response = config.schema
          ? await callProviderStructured(stageSettings, prompt, config.schema, resolvedMaxTokens, config.stageName)
          : await (async function () {
            var rawResponse = await callProvider(stageSettings, prompt, resolvedMaxTokens);
            return {
              result: extractJson(rawResponse.text),
              meta: rawResponse.meta,
              usage: rawResponse.usage
            };
          })();
        var result = response.result;
        recordStageUsage(stageTelemetry, response);

        // Record API call for daily budget tracking
        if (config.budgetEnforce) {
          var totalTokens = (response.usage && response.usage.totalTokens) || 0;
          recordApiCall(totalTokens);
        }

        if (config.unwrapKey) result = unwrapIfNeeded(result, config.unwrapKey);
        if (config.normalizeResult) result = config.normalizeResult(result);
        if (config.validate) {
          // Convention: validate() returns '' or {valid: true} on success, non-empty string or {valid: false, errors: [...]} on failure.
          var validationResult = config.validate(result);
          if (typeof validationResult === 'string' && validationResult) {
            var err = new Error(validationResult);
            err.errorType = 'schema';
            err.retryable = true;
            throw err;
          } else if (validationResult && typeof validationResult === 'object' && validationResult.valid === false) {
            var errMsg = (validationResult.errors && validationResult.errors.length) ? validationResult.errors.join('; ') : 'Schema validation failed';
            var errObj = new Error(errMsg);
            errObj.errorType = validationResult.errorType || 'schema';
            errObj.retryable = validationResult.retryable !== false;
            throw errObj;
          }
        }
        emitPipelineEvent(config.onProgress, config.stageIndex || 0, config.getTotalStages ? config.getTotalStages() : 0, config.completeMessage || config.stageName, {
          phase: 'complete',
          stageKey: config.stageKey || '',
          stageName: config.stageName,
          telemetry: summarizeStageTelemetry(stageTelemetry)
        });
        return result;
      } catch (err) {
        lastErr = err;
        console.warn('[LiftRPG] ' + config.stageName + ' attempt ' + (attempt + 1) + '/' + attemptCount + ' failed:', err.message);
        if (attempt === attemptCount - 1 || !shouldRetryStageError(err)) {
          emitPipelineEvent(config.onProgress, config.stageIndex || 0, config.getTotalStages ? config.getTotalStages() : 0, config.stageName + ' failed', {
            phase: 'failed',
            stageKey: config.stageKey || '',
            stageName: config.stageName,
            error: String((err && err.message) || err || ''),
            telemetry: summarizeStageTelemetry(stageTelemetry)
          });
          throw prefixStageError(config.stageName, err);
        }
      }
    }

    throw prefixStageError(config.stageName, lastErr || new Error('Unknown stage failure'));
  }

  function collectWeeksAndValues(targetWeeks, targetValues, chunkOutput) {
    (chunkOutput.weeks || []).forEach(function (week) {
      targetWeeks.push(week);
      if (!week.isBossWeek && week.weeklyComponent &&
        week.weeklyComponent.value !== undefined && week.weeklyComponent.value !== null && week.weeklyComponent.value !== '') {
        targetValues.push(week.weeklyComponent.value);
      }
    });
  }

  async function generateWeekChunkAdaptive(settings, builders, config) {
    var stageName = config.weekNumbers.length === 1
      ? 'Week ' + config.weekNumbers[0]
      : 'Weeks ' + config.weekNumbers.join(',');

    try {
      return [await runJsonStage(settings, {
        stageName: stageName,
        schema: STRUCTURED_SCHEMA_WEEKS,
        maxTokens: 32000,
        unwrapKey: 'weeks',
        maxAttempts: 2,
        normalizeResult: function (result) {
          if (result && result.meta && Array.isArray(result.weeks)) {
            console.warn('[LiftRPG] Week chunk output a full booklet — extracting weeks only');
            return { weeks: result.weeks };
          }
          return result;
        },
        validate: function (result) {
          return validateWeeksStage(result, config.weekNumbers);
        },
        buildPrompt: function (retryState) {
          return builders.weeks(
            config.workout,
            config.brief,
            config.layerBible,
            config.campaignPlan,
            config.weekNumbers,
            buildChunkContinuity(config.allPriorWeeks),
            config.allComponentValues,
            config.shellContext,
            retryState.attempt > 0 ? { retryMode: 'tight' } : undefined
          );
        }
      })];
    } catch (err) {
      if (!shouldSplitWeekChunk(err, config.weekNumbers)) throw err;
      console.warn('[LiftRPG] Splitting week chunk [' + config.weekNumbers.join(', ') + '] after failure:', err.message);

      var outputs = [];
      var stagedWeeks = config.allPriorWeeks.slice();
      var stagedValues = config.allComponentValues.slice();

      for (var i = 0; i < config.weekNumbers.length; i++) {
        var splitOutputs = await generateWeekChunkAdaptive(settings, builders, {
          workout: config.workout,
          brief: config.brief,
          layerBible: config.layerBible,
          campaignPlan: config.campaignPlan,
          weekNumbers: [config.weekNumbers[i]],
          allPriorWeeks: stagedWeeks,
          allComponentValues: stagedValues,
          shellContext: config.shellContext
        });
        splitOutputs.forEach(function (chunkOutput) {
          outputs.push(chunkOutput);
          collectWeeksAndValues(stagedWeeks, stagedValues, chunkOutput);
        });
      }

      return outputs;
    }
  }

  function splitRegistryForRetry(registry) {
    var midpoint = Math.ceil(registry.length / 2);
    return [registry.slice(0, midpoint), registry.slice(midpoint)];
  }

  function weekSummariesForRegistry(registry, allWeekSummaries, fallbackSummaries) {
    var lookup = {};
    (registry || []).forEach(function (entry) {
      if (entry && entry.weekRef) lookup[entry.weekRef] = true;
    });
    var scoped = (allWeekSummaries || []).filter(function (summary) {
      return lookup[summary.weekNumber];
    });
    return scoped.length ? scoped : (fallbackSummaries || []);
  }

  async function generateFragmentBatchAdaptive(settings, builders, config) {
    try {
      return await runJsonStage(settings, {
        stageKey: config.stageKey || 'fragments',
        stageName: config.label,
        stageIndex: config.stageIndex || 0,
        completeMessage: config.label + ' complete.',
        onProgress: config.onProgress || null,
        getTotalStages: config.getTotalStages || null,
        schema: STRUCTURED_SCHEMA_FRAGMENTS,
        maxTokens: 32000,
        unwrapKey: 'fragments',
        maxAttempts: 2,
        rateLimiter: config.rateLimiter || null,
        budgetEnforce: config.budgetEnforce || false,
        validate: function (result) {
          return validateFragmentsStage(result, config.registry);
        },
        buildPrompt: function (retryState) {
          return builders.fragmentBatch(
            config.layerBible,
            config.registry,
            config.batchWeekSummaries,
            config.allWeekSummaries,
            config.priorFragments,
            config.batchIndex,
            config.totalBatches,
            config.shellContext,
            retryState.attempt > 0 ? { retryMode: 'tight' } : undefined
          );
        }
      });
    } catch (err) {
      if (!shouldSplitFragmentBatch(err, config.registry)) throw err;
      console.warn('[LiftRPG] Splitting fragment batch after failure:', config.label, err.message);

      var halves = splitRegistryForRetry(config.registry);
      var leftRegistry = halves[0];
      var rightRegistry = halves[1];
      var leftSummaries = weekSummariesForRegistry(leftRegistry, config.allWeekSummaries, config.batchWeekSummaries);
      var rightSummaries = weekSummariesForRegistry(rightRegistry, config.allWeekSummaries, config.batchWeekSummaries);

      var leftOutput = await generateFragmentBatchAdaptive(settings, builders, {
        layerBible: config.layerBible,
        registry: leftRegistry,
        batchWeekSummaries: leftSummaries,
        allWeekSummaries: config.allWeekSummaries,
        priorFragments: config.priorFragments,
        batchIndex: config.batchIndex,
        totalBatches: config.totalBatches,
        shellContext: config.shellContext,
        label: config.label + 'A',
        stageKey: config.stageKey,
        stageIndex: config.stageIndex,
        onProgress: config.onProgress,
        getTotalStages: config.getTotalStages,
        rateLimiter: config.rateLimiter,
        budgetEnforce: config.budgetEnforce
      });

      var priorForRight = config.priorFragments.concat(leftOutput.fragments || []);
      var rightOutput = await generateFragmentBatchAdaptive(settings, builders, {
        layerBible: config.layerBible,
        registry: rightRegistry,
        batchWeekSummaries: rightSummaries,
        allWeekSummaries: config.allWeekSummaries,
        priorFragments: priorForRight,
        batchIndex: config.batchIndex,
        totalBatches: config.totalBatches,
        shellContext: config.shellContext,
        label: config.label + 'B',
        stageKey: config.stageKey,
        stageIndex: config.stageIndex,
        onProgress: config.onProgress,
        getTotalStages: config.getTotalStages,
        rateLimiter: config.rateLimiter,
        budgetEnforce: config.budgetEnforce
      });

      return { fragments: (leftOutput.fragments || []).concat(rightOutput.fragments || []) };
    }
  }

  async function patchAssembledBooklet(settings, booklet, errors, identityContract) {
    try {
      var patchedResponse = await callProvider(
        settings,
        generatePatchPrompt(JSON.stringify(booklet, null, 2), errors, {
          identityContract: identityContract
        }),
        32000
      );
      var patched = extractJson(patchedResponse.text);
      enforceIdentityContract(patched, identityContract);
      enforceBookletDerivedFields(patched);
      var identityDrift = compareIdentityContract(patched, identityContract);
      if (identityDrift.length > 0) {
        console.warn('[LiftRPG] Patch drifted shell identity; restoring approved shell contract:', identityDrift);
        enforceIdentityContract(patched, identityContract);
      }
      return patched;
    } catch (patchErr) {
      console.warn('[LiftRPG] Patch stage failed, returning unpatched booklet:', patchErr.message);
      return booklet;
    }
  }

  // ── Pipeline Checkpoint (resume after failure) ─────────────────────────
  // Saves intermediate stage outputs + original inputs to sessionStorage.
  // On retry, the pipeline restores completed stages instantly and resumes
  // from the first uncached stage. The UI can detect a checkpoint on page
  // load and offer to resume with the original inputs pre-filled.
  //
  // One checkpoint per session — a new run overwrites the previous one.
  // Inputs (workout, brief, model, provider) are stored so the UI
  // can restore them without the user re-typing anything.

  var CHECKPOINT_STORAGE_KEY = 'liftrpg_pipeline_checkpoint';

  function loadCheckpoint() {
    try {
      var raw = sessionStorage.getItem(CHECKPOINT_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_e) { return null; }
  }

  function initCheckpoint(inputs) {
    var cp = {
      inputs: {
        workout: inputs.workout || '',
        brief: inputs.brief || '',
        model: inputs.model || '',
        provider: inputs.provider || ''
      },
      stages: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      sessionStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(cp));
    } catch (_e) {
      console.warn('[LiftRPG] Could not init pipeline checkpoint:', _e.message);
    }
    return cp;
  }

  function saveCheckpoint(stage, data, checkpoint) {
    try {
      var cp = checkpoint || loadCheckpoint() || { inputs: {}, stages: {} };
      cp.stages[stage] = data;
      cp.updatedAt = new Date().toISOString();
      sessionStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(cp));
      return cp;
    } catch (_e) {
      console.warn('[LiftRPG] Could not save pipeline checkpoint:', _e.message);
      return checkpoint || { inputs: {}, stages: {} };
    }
  }

  function clearCheckpoint() {
    try { sessionStorage.removeItem(CHECKPOINT_STORAGE_KEY); } catch (_e) {}
  }

  function countResumedStages(checkpoint) {
    if (!checkpoint || !checkpoint.stages) return 0;
    return Object.keys(checkpoint.stages).length;
  }

  function getCheckpoint() {
    return loadCheckpoint();
  }

  async function runApiPipeline(options) {
    if (typeof window.beginLiftRpgPromptRun === 'function') window.beginLiftRpgPromptRun();

    var settings = options.settings || {};
    var builders = getApiPromptBuilders();
    assertApiPromptBuilders(builders);

    var workout = options.workout || '';
    var brief = options.brief || '';
    var weekCount = options.weekCount || (typeof window.parseWeekCount === 'function' ? window.parseWeekCount(workout) : 6);
    var totalSessions = options.totalSessions || 0;

    // ── Checkpoint: resume from last completed stage if available ────
    var checkpoint = loadCheckpoint();
    var resumed = checkpoint ? countResumedStages(checkpoint) : 0;
    if (resumed > 0) {
      console.log('[LiftRPG] Resuming pipeline from checkpoint (' + resumed + ' cached stages).');
    } else {
      // Fresh run — init checkpoint with inputs so UI can restore them on page load
      checkpoint = initCheckpoint({
        workout: workout,
        brief: brief,
        model: settings.model,
        provider: detectProviderId(settings)
      });
    }

    // ── Rate limiter + daily budget ──────────────────────────────────────
    var useGeminiBudget = isGeminiProvider(settings);
    var rateLimiter = useGeminiBudget ? createRateLimiter(RATE_MAX_CALLS, RATE_WINDOW_MS) : null;

    // Pre-flight budget check
    if (useGeminiBudget) {
      var budgetWarning = checkDailyBudget(settings, weekCount);
      if (budgetWarning) {
        var msg = 'This booklet needs ~' + budgetWarning.estimated + ' API calls. ' +
          'You have ' + budgetWarning.remaining + ' remaining today (Gemini free tier: ' +
          budgetWarning.limit + '/day). You can start now and resume from checkpoint tomorrow, ' +
          'or switch to a paid API key.';
        if (options.onStatus) options.onStatus(msg);
        console.warn('[LiftRPG] ' + msg);
        // Don't block — checkpoint resume makes partial runs viable
      }
    }

    // Initial estimation: 3 setup + weekCount (single-stage per week) + endings
    var totalStages = 3 + weekCount + 2;
    var stageNum = 0;
    var onProgress = options.onProgress;

    function progress(stageKey, message) {
      stageNum++;
      emitPipelineEvent(onProgress, stageNum, totalStages, message, {
        phase: 'start',
        stageKey: stageKey || '',
        stageName: message
      });
    }

    // ── STAGES 1, 2, 3 (Shell Setup) ──────────────────────────
    // Each stage checks for a cached checkpoint before calling the API.

    var layerBible;
    if (checkpoint && checkpoint.stages.layerBible) {
      layerBible = checkpoint.stages.layerBible;
      stageNum++;
      console.log('[LiftRPG] Resumed: Layer Codex (cached)');
      emitPipelineEvent(onProgress, stageNum, totalStages, 'Layer codex restored from checkpoint.', { phase: 'complete', stageKey: 'layerBible', stageName: 'Layer Codex' });
    } else {
      progress('layerBible', 'Building layer codex…');
      layerBible = await runJsonStage(settings, {
        stageKey: 'layerBible',
        stageName: 'Layer Codex',
        stageIndex: stageNum,
        completeMessage: 'Layer codex complete.',
        onProgress: onProgress,
        getTotalStages: function () { return totalStages; },
        schema: STRUCTURED_SCHEMA_BIBLE,
        maxTokens: 20480,
        requestTimeoutMs: 300000,
        maxAttempts: 2,
        rateLimiter: rateLimiter,
        budgetEnforce: useGeminiBudget,
        validate: validateLayerBibleStage,
        buildPrompt: function (retryState) { return builders.stage1(workout, brief, retryState.attempt > 0 ? { retryMode: 'tight' } : undefined); }
      });
      checkpoint = saveCheckpoint('layerBible', layerBible, checkpoint);
    }

    var campaignPlan;
    if (checkpoint && checkpoint.stages.campaignPlan) {
      campaignPlan = checkpoint.stages.campaignPlan;
      stageNum++;
      console.log('[LiftRPG] Resumed: Story Plan (cached)');
      emitPipelineEvent(onProgress, stageNum, totalStages, 'Story plan restored from checkpoint.', { phase: 'complete', stageKey: 'campaign', stageName: 'Story Plan' });
    } else {
      progress('campaign', 'Planning story…');
      campaignPlan = await runJsonStage(settings, {
        stageKey: 'campaign',
        stageName: 'Story Plan',
        stageIndex: stageNum,
        completeMessage: 'Story plan complete.',
        onProgress: onProgress,
        getTotalStages: function () { return totalStages; },
        schema: STRUCTURED_SCHEMA_CAMPAIGN,
        requestTimeoutMs: function (retryState) {
          return retryState && retryState.attempt > 0 ? 300000 : 420000;
        },
        maxTokens: function (retryState) {
          return retryState && retryState.attempt > 0 ? 8192 : 12288;
        },
        maxAttempts: 2,
        rateLimiter: rateLimiter,
        budgetEnforce: useGeminiBudget,
        validate: validateCampaignPlanStage,
        buildPrompt: function (retryState) {
          if (!retryState || !retryState.attempt) {
            return builders.stage2(workout, brief, layerBible);
          }
          return buildCompactCampaignRetryPrompt(workout, brief, layerBible, retryState);
        }
      });
      checkpoint = saveCheckpoint('campaignPlan', campaignPlan, checkpoint);
    }

    if (!Array.isArray(campaignPlan.fragmentRegistry)) campaignPlan.fragmentRegistry = [];
    if (!Array.isArray(campaignPlan.overflowRegistry)) campaignPlan.overflowRegistry = [];

    // totalStages will be recalculated after weeks complete, once we know
    // the actual fragment batch count (not individual fragment count).

    var shell;
    if (checkpoint && checkpoint.stages.shell) {
      shell = checkpoint.stages.shell;
      stageNum++;
      console.log('[LiftRPG] Resumed: Booklet Setup (cached)');
      emitPipelineEvent(onProgress, stageNum, totalStages, 'Booklet setup restored from checkpoint.', { phase: 'complete', stageKey: 'shell', stageName: 'Booklet Setup' });
    } else {
      progress('shell', 'Building booklet setup…');
      shell = await runJsonStage(settings, {
        stageKey: 'shell',
        stageName: 'Booklet Setup',
        stageIndex: stageNum,
        completeMessage: 'Booklet setup complete.',
        onProgress: onProgress,
        getTotalStages: function () { return totalStages; },
        schema: STRUCTURED_SCHEMA_SHELL,
        maxTokens: 16384,
        requestTimeoutMs: 300000,
        unwrapKey: 'meta',
        maxAttempts: 2,
        rateLimiter: rateLimiter,
        budgetEnforce: useGeminiBudget,
        normalizeResult: function (result) {
          if (result && result.meta && Array.isArray(result.weeks)) {
            delete result.weeks; delete result.fragments; delete result.endings;
          }
          if (result && result.meta && !('passwordEncryptedEnding' in result.meta)) {
            result.meta.passwordEncryptedEnding = '';
          }
          return result;
        },
        validate: function(result) {
          var v = validateShellSchema(result, { weekCount: weekCount, totalSessions: totalSessions });
          if (!v.valid) {
            return 'Shell schema validation: ' + v.errors.join('; ');
          }
          // Strip weeks/fragments/endings if LLM generated them (normalizer
          // handles the common case; this catches anything it missed)
          if (result && result.weeks) { delete result.weeks; }
          if (result && result.fragments) { delete result.fragments; }
          if (result && result.endings) { delete result.endings; }
          return '';
        },
        buildPrompt: function (retryState) { return builders.shell(brief, layerBible, campaignPlan, retryState.attempt > 0 ? { retryMode: 'tight' } : undefined); }
      });
      checkpoint = saveCheckpoint('shell', shell, checkpoint);
    }

    var identityContract = buildIdentityContract(shell, campaignPlan);
    var shellContext = extractShellContext(shell);

    // ── ANTHROPIC PROMPT CACHING ──────────────────────────────────
    // For Anthropic calls, set a shared system prompt containing the identity
    // contract and layer codex summary. Marked ephemeral so subsequent calls
    // in this pipeline session get cache hits (~90% cheaper input tokens).
    if (settings.format === 'anthropic') {
      settings._systemPrompt = [
        'You are generating components of a LiftRPG print-and-play booklet.',
        'World contract: ' + (shellContext.worldContract || ''),
        'Identity contract: ' + JSON.stringify(identityContract),
        'Layer codex premise: ' + ((layerBible.storyLayer || {}).premise || ''),
        'Return valid JSON only. No markdown fences, no commentary.'
      ].join('\n');
    }

    // ── TARGETED UNIT GENERATION: WEEKS ──────────────────────────
    // Single-stage per week. Checkpoint-aware: cached weeks are restored,
    // then generation continues from the first uncached week.
    var finalWeeks = [];
    var allComponentValues = [];

    for (var w = 1; w <= weekCount; w++) {
      var isBossWeek = w === weekCount;
      var weekCacheKey = 'week_' + w;

      if (checkpoint && checkpoint.stages[weekCacheKey]) {
        var cachedWeek = checkpoint.stages[weekCacheKey];
        finalWeeks.push(cachedWeek);
        if (!cachedWeek.isBossWeek && cachedWeek.weeklyComponent && cachedWeek.weeklyComponent.value) {
          allComponentValues.push(cachedWeek.weeklyComponent.value);
        }
        stageNum++;
        console.log('[LiftRPG] Resumed: Week ' + w + ' (cached)');
        emitPipelineEvent(onProgress, stageNum, totalStages, 'Week ' + w + ' restored from checkpoint.', { phase: 'complete', stageKey: 'weeks', stageName: 'Week ' + w });
        continue;
      }

      var continuityPacket = buildChunkContinuity(finalWeeks);
      var campaignWeekPlan = (campaignPlan.weeks || []).filter(function (pw) {
        return Number(pw.weekNumber) === w;
      })[0] || { weekNumber: w };

      progress('weeks', 'Writing Week ' + w + (isBossWeek ? ' (Boss)' : '') + '…');
      var weekObject = await runJsonStage(settings, {
        stageKey: 'weeks',
        stageName: 'Week ' + w,
        stageIndex: stageNum,
        completeMessage: 'Week ' + w + ' complete.',
        onProgress: onProgress,
        getTotalStages: function () { return totalStages; },
        schema: null,
        maxTokens: isBossWeek ? 12288 : 8192,
        requestTimeoutMs: 180000,
        maxAttempts: 3,
        rateLimiter: rateLimiter,
        budgetEnforce: useGeminiBudget,
        normalizeResult: function (result) {
          // Model sometimes returns a full booklet or a weeks[] wrapper instead
          // of a bare week object. Unwrap to get the single week.
          if (result && Array.isArray(result.weeks) && result.weeks.length > 0) {
            console.warn('[LiftRPG] Week stage returned weeks[] wrapper — unwrapping');
            var match = result.weeks.filter(function (wk) { return Number(wk.weekNumber) === w; })[0];
            result = match || result.weeks[0];
          }
          if (result && result.meta && Array.isArray(result.weeks) && result.weeks.length > 0) {
            console.warn('[LiftRPG] Week stage returned full booklet — extracting week');
            var match2 = result.weeks.filter(function (wk) { return Number(wk.weekNumber) === w; })[0];
            result = match2 || result.weeks[0];
          }
          // Model returned a shell (meta/cover) without any weeks — reject it
          if (result && result.meta && !result.title && !result.sessions) {
            console.warn('[LiftRPG] Week stage returned booklet shell instead of week — rejecting');
            return null;
          }
          // Normalize companionComponents: model sometimes returns object instead of array
          if (result) normalizeCompanionComponents(result);
          return result;
        },
        validate: function (result) {
          if (!result) return 'Week generation returned empty result. Model may have returned a shell instead of a week object.';
          if (!result.title) return 'Week object missing "title" field. Got keys: ' + Object.keys(result).slice(0, 5).join(', ');
          if (!result.sessions) return 'Week object missing "sessions" array. Got keys: ' + Object.keys(result).slice(0, 5).join(', ');
          return validateWeekSchema(result, isBossWeek, isBossWeek ? { componentInputs: allComponentValues } : undefined);
        },
        buildPrompt: function (retryState) {
          return builders.singleWeekFinal(workout, brief, layerBible, campaignPlan, campaignWeekPlan, shellContext, continuityPacket, allComponentValues);
        }
      });

      weekObject.weekNumber = w;
      if (isBossWeek) weekObject.isBossWeek = true;
      else weekObject.isBossWeek = false;

      // Schema validation safety net
      var weekValidation = validateWeekSchema(weekObject, weekObject.isBossWeek, weekObject.isBossWeek ? { componentInputs: allComponentValues } : undefined);
      if (!weekValidation.valid) {
        console.warn('[pipeline] Week ' + w + ' schema issues:', weekValidation.errors);
        if (options.onStatus) options.onStatus('Week ' + w + ': ' + weekValidation.errors.length + ' schema issue(s)');
      }

      finalWeeks.push(weekObject);
      if (!isBossWeek && weekObject.weeklyComponent && weekObject.weeklyComponent.value) {
        allComponentValues.push(weekObject.weeklyComponent.value);
      }
      checkpoint = saveCheckpoint(weekCacheKey, weekObject, checkpoint);
    }

    var assembledWeeksOutput = [{ weeks: finalWeeks }];
    var weekSummaries = extractWeekSummaries(assembledWeeksOutput);

    // ── BATCHED FRAGMENT GENERATION ──────────────────────────────
    // Checkpoint-aware: each batch is cached individually.
    var finalFragments = [];
    var registry = campaignPlan.fragmentRegistry || [];
    var fragmentBatches = buildFragmentBatches(registry, weekSummaries);
    var totalBatches = fragmentBatches.length;

    // Update totalStages now that we know batch count instead of individual count
    totalStages = 3 + weekCount + totalBatches + 1;

    for (var fb = 0; fb < fragmentBatches.length; fb++) {
      var batch = fragmentBatches[fb];
      var fragCacheKey = 'fragBatch_' + fb;
      var batchLabel = 'Fragments batch ' + (fb + 1) + '/' + totalBatches;

      if (checkpoint && checkpoint.stages[fragCacheKey]) {
        var cachedFrags = checkpoint.stages[fragCacheKey];
        (cachedFrags.fragments || []).forEach(function (f) { finalFragments.push(f); });
        stageNum++;
        console.log('[LiftRPG] Resumed: ' + batchLabel + ' (cached)');
        emitPipelineEvent(onProgress, stageNum, totalStages, batchLabel + ' restored from checkpoint.', { phase: 'complete', stageKey: 'fragments', stageName: batchLabel });
        continue;
      }

      progress('fragments', 'Writing ' + batchLabel + ' (' + batch.registry.length + ' docs)…');
      var batchWeekNums = {};
      batch.registry.forEach(function (entry) { if (entry.weekRef) batchWeekNums[entry.weekRef] = true; });
      var batchWeekSummaries = weekSummaries.filter(function (ws) { return batchWeekNums[ws.weekNumber]; });

      var batchOutput = await generateFragmentBatchAdaptive(settings, builders, {
        layerBible: layerBible,
        registry: batch.registry,
        batchWeekSummaries: batchWeekSummaries.length > 0 ? batchWeekSummaries : weekSummaries,
        allWeekSummaries: weekSummaries,
        priorFragments: finalFragments,
        batchIndex: fb,
        totalBatches: totalBatches,
        shellContext: shellContext,
        label: batchLabel,
        stageKey: 'fragments',
        stageIndex: stageNum,
        onProgress: onProgress,
        getTotalStages: function () { return totalStages; },
        rateLimiter: rateLimiter,
        budgetEnforce: useGeminiBudget
      });

      // Match returned fragments to registry entries by normalised ID first,
      // falling back to array index if IDs don't match (LLMs may reorder).
      (batchOutput.fragments || []).forEach(function (frag, i) {
        var fragNorm = normalizeId(frag && frag.id);
        var matched = false;
        if (fragNorm) {
          for (var ri = 0; ri < batch.registry.length; ri++) {
            if (normalizeId(batch.registry[ri].id) === fragNorm) {
              frag.id = batch.registry[ri].id; // use canonical ID casing
              matched = true;
              break;
            }
          }
        }
        if (!matched && batch.registry[i] && batch.registry[i].id) {
          frag.id = batch.registry[i].id; // positional fallback
        }
        finalFragments.push(frag);
      });
      checkpoint = saveCheckpoint(fragCacheKey, batchOutput, checkpoint);
    }

    var assembledFragmentsOutput = { fragments: finalFragments };

    // ── TARGETED UNIT GENERATION: ENDING ────────────────────────
    var finalEndings = [];
    if (checkpoint && checkpoint.stages.endings) {
      finalEndings = checkpoint.stages.endings;
      stageNum++;
      console.log('[LiftRPG] Resumed: Finale (cached)');
      emitPipelineEvent(onProgress, stageNum, totalStages, 'Finale restored from checkpoint.', { phase: 'complete', stageKey: 'endings', stageName: 'Finale' });
    } else {
      progress('endings', 'Writing finale…');
      var endingObj = await runJsonStage(settings, {
        stageKey: 'endings',
        stageName: 'Finale Variant',
        stageIndex: stageNum,
        completeMessage: 'Finale complete.',
        onProgress: onProgress,
        getTotalStages: function () { return totalStages; },
        schema: null,
        maxTokens: 4096,
        requestTimeoutMs: 120000,
        maxAttempts: 2,
        rateLimiter: rateLimiter,
        budgetEnforce: useGeminiBudget,
        validate: function (result) {
          if (!result) return 'Ending object is null.';
          if (!result.variant) return 'Ending missing variant.';
          var content = result.content;
          if (!content || typeof content !== 'object') return 'Ending missing content object.';
          if (!content.body) return 'Ending missing content.body.';
          if (!content.documentType) return 'Ending missing content.documentType.';
          if (!result.designSpec || typeof result.designSpec !== 'object') return 'Ending missing designSpec object.';
          return '';
        },
        buildPrompt: function (retryState) {
          return builders.singleEnding(layerBible, campaignPlan, "Primary", shellContext, weekSummaries);
        }
      });
      finalEndings.push(endingObj);
      checkpoint = saveCheckpoint('endings', finalEndings, checkpoint);
    }
    var assembledEndingsOutput = { endings: finalEndings };

    // ── DETERMINISTIC ASSEMBLY & QUALITY GATE ───────────────────
    console.log('[LiftRPG] Assembling booklet from ' + finalWeeks.length + ' weeks, ' + finalFragments.length + ' fragments, ' + finalEndings.length + ' endings.');

    var booklet = options.assemble(shell, assembledWeeksOutput, assembledFragmentsOutput, assembledEndingsOutput, campaignPlan);
    enforceIdentityContract(booklet, identityContract);

    var errors = validateAssembledBooklet(booklet);
    if (errors.warnings && errors.warnings.length > 0) {
      console.warn('[LiftRPG] Validation warnings:', errors.warnings);
    }

    if (errors.length > 0 && options.allowPatch !== false) {
      console.warn('[LiftRPG] Final assembly has', errors.length, 'validation errors:', errors);
      // NOTE: Because we are aggressively targeting the generation and validating *per unit*,
      // the legacy patchAssembledBooklet fallback is bypassed directly, unless explicitly wired in a future iteration. 
      // This enforces the "Remove whole-booklet patching" requirement from the user.
      console.warn('[LiftRPG] Whole-booklet patching is disabled by policy. Returning aggressively unit-repaired booklet.');
    }

    var report = generateQualityReport(booklet);
    var qualityGate = buildQualityGate(report);
    booklet._qualityReport = report;
    booklet._qualityGate = qualityGate;
    if (!qualityGate.passed) {
      console.warn('[LiftRPG] Quality gate warnings (non-blocking):', qualityGate.blockers.map(function (entry) {
        return entry.message;
      }));
    }

    // Pipeline succeeded — clear the checkpoint so next run starts fresh
    clearCheckpoint();
    console.log('[LiftRPG] Pipeline complete. Checkpoint cleared.');

    return booklet;
  }


  // ── Structured Output JSON Schemas ──────────────────────────────────────────
  // JSON Schema objects for Gemini native structured output (responseJsonSchema).
  // Derived from STAGE1/STAGE2_OUTPUT_SCHEMA shapes + SCHEMA_SPEC field definitions
  // in generator.js. Required fields match what the pipeline and
  // validateAssembledBooklet() check. Deeply variable inner structures (fieldOps,
  // bossEncounter) typed as generic objects — prompt text provides guidance.

  var STRUCTURED_SCHEMA_BIBLE = {
    type: 'object',
    properties: {
      storyLayer: {
        type: 'object',
        properties: {
          premise: { type: 'string' },
          protagonist: {
            type: 'object',
            properties: {
              role: { type: 'string' }, want: { type: 'string' }, need: { type: 'string' },
              flaw: { type: 'string' }, wound: { type: 'string' }, arc: { type: 'string' }
            },
            required: ['role', 'want', 'need', 'flaw', 'wound', 'arc']
          },
          antagonistPressure: { type: 'string' },
          relationshipWeb: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' }, role: { type: 'string' },
                initialStance: { type: 'string' }, secret: { type: 'string' },
                arcFunction: { type: 'string' }
              },
              required: ['name', 'role', 'initialStance', 'secret', 'arcFunction']
            }
          },
          midpointReversal: { type: 'string' },
          darkestMoment: { type: 'string' },
          resolutionMode: { type: 'string' },
          bossTruth: { type: 'string' },
          recurringMotifs: {
            type: 'object',
            properties: {
              object: { type: 'string' }, place: { type: 'string' },
              phrase: { type: 'string' }, sensory: { type: 'string' }
            },
            required: ['object', 'place', 'phrase', 'sensory']
          }
        },
        required: ['premise', 'protagonist', 'antagonistPressure', 'relationshipWeb',
          'midpointReversal', 'darkestMoment', 'resolutionMode', 'bossTruth', 'recurringMotifs']
      },
      gameLayer: {
        type: 'object',
        properties: {
          coreLoop: { type: 'string' },
          persistentTopology: { type: 'string' },
          majorZones: { type: 'array', items: { type: 'string' } },
          gatesAndKeys: { type: 'array', items: { type: 'string' } },
          progressionGates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                week: { type: 'integer' }, playerGains: { type: 'string' },
                unlocks: { type: 'string' }, requires: { type: 'string' }
              },
              required: ['week', 'playerGains', 'unlocks', 'requires']
            }
          },
          persistentPressures: { type: 'array', items: { type: 'string' } },
          companionSurfaces: { type: 'array', items: { type: 'string' } },
          revisitLogic: { type: 'string' },
          boardStateArc: { type: 'string' },
          bossConvergence: { type: 'string' },
          informationLayers: { type: 'string' },
          weeklyComponentType: { type: 'string' }
        },
        required: ['coreLoop', 'persistentTopology', 'majorZones', 'gatesAndKeys',
          'progressionGates', 'persistentPressures', 'companionSurfaces',
          'revisitLogic', 'boardStateArc', 'bossConvergence', 'informationLayers',
          'weeklyComponentType']
      },
      governingLayer: {
        type: 'object',
        properties: {
          institutionName: { type: 'string' },
          departments: { type: 'array', items: { type: 'string' } },
          proceduresThatAffectPlay: { type: 'array', items: { type: 'string' } },
          recordsAndForms: { type: 'array', items: { type: 'string' } },
          documentVoiceRules: { type: 'array', items: { type: 'string' } }
        },
        required: ['institutionName', 'departments', 'proceduresThatAffectPlay',
          'recordsAndForms', 'documentVoiceRules']
      },
      designLedger: {
        type: 'object',
        properties: {
          mysteryQuestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                answerableFrom: { type: 'string' },
                revealTiming: { type: 'string' }
              },
              required: ['question', 'answerableFrom', 'revealTiming']
            }
          },
          falseAssumptions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                assumption: { type: 'string' },
                plantedBy: { type: 'string' },
                correctedBy: { type: 'string' }
              },
              required: ['assumption', 'plantedBy', 'correctedBy']
            }
          },
          motifPayoffs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                motif: { type: 'string' },
                firstAppearance: { type: 'string' },
                transformation: { type: 'string' },
                payoff: { type: 'string' }
              },
              required: ['motif', 'firstAppearance', 'transformation', 'payoff']
            }
          },
          weekTransformations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                week: { type: 'integer' },
                understandingShift: { type: 'string' },
                stateChange: { type: 'string' },
                framingChange: { type: 'string' }
              },
              required: ['week', 'understandingShift', 'stateChange', 'framingChange']
            }
          },
          clueEconomy: {
            type: 'object',
            properties: {
              hardClues: { type: 'array', items: { type: 'string' } },
              softClues: { type: 'array', items: { type: 'string' } },
              misdirections: { type: 'array', items: { type: 'string' } },
              confirmations: { type: 'array', items: { type: 'string' } }
            },
            required: ['hardClues', 'softClues', 'misdirections', 'confirmations']
          },
          finalRevealRecontextualizes: { type: 'string' }
        },
        required: ['mysteryQuestions', 'falseAssumptions', 'motifPayoffs',
          'weekTransformations', 'clueEconomy', 'finalRevealRecontextualizes']
      }
    },
    required: ['storyLayer', 'gameLayer', 'governingLayer', 'designLedger']
  };

  var STRUCTURED_SCHEMA_CAMPAIGN = {
    type: 'object',
    properties: {
      topology: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          identity: { type: 'string' },
          mainMap: { type: 'string' },
          zones: { type: 'array', items: { type: 'string' } },
          persistentLocks: { type: 'array', items: { type: 'string' } },
          shortcuts: { type: 'array', items: { type: 'string' } },
          pressureCircuits: { type: 'array', items: { type: 'string' } }
        },
        required: ['mainMap', 'zones']
      },
      weeks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            weekNumber: { type: 'integer' },
            arcBeat: { type: 'string' },
            npcBeat: { type: 'string' },
            stateSnapshot: { type: 'string' },
            playerGains: { type: 'string' },
            zoneFocus: { type: 'string' },
            mapReuse: { type: 'string' },
            stateChange: { type: 'string' },
            newGateOrUnlock: { type: 'string' },
            weeklyComponentMeaning: { type: 'string' },
            oraclePressure: { type: 'string' },
            fragmentFunction: { type: 'string' },
            governingProcedure: { type: 'string' },
            companionChange: { type: 'string' },
            isBossWeek: { type: 'boolean' },
            isBinaryChoiceWeek: { type: 'boolean' },
            sessionBeatTypes: { type: 'array', items: { type: 'string' } }
          },
          required: ['weekNumber', 'arcBeat', 'isBossWeek', 'isBinaryChoiceWeek', 'sessionBeatTypes']
        }
      },
      bossPlan: {
        type: 'object',
        properties: {
          decodeLogic: { type: 'string' },
          whyItFeelsEarned: { type: 'string' },
          requiredPriorKnowledge: { type: 'array', items: { type: 'string' } },
          weeklyComponentType: { type: 'string' }
        },
        required: ['decodeLogic', 'whyItFeelsEarned', 'requiredPriorKnowledge', 'weeklyComponentType']
      },
      fragmentRegistry: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            documentType: { type: 'string' },
            author: { type: 'string' },
            revealPurpose: { type: 'string' },
            clueFunction: { type: 'string', enum: ['establishes', 'complicates', 'reveals'] },
            weekRef: { type: 'integer' }
          },
          required: ['id', 'title', 'documentType', 'revealPurpose', 'clueFunction', 'weekRef']
        }
      },
      overflowRegistry: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            weekNumber: { type: 'integer' },
            documentType: { type: 'string' },
            author: { type: 'string' },
            narrativeFunction: { type: 'string' },
            tonalIntent: { type: 'string' },
            arcRelationship: { type: 'string' }
          },
          required: ['id', 'weekNumber', 'documentType', 'narrativeFunction']
        }
      }
    },
    required: ['topology', 'weeks', 'bossPlan', 'fragmentRegistry']
  };

  // ── Shared sub-schemas for reuse across structured schemas ──────────────

  var DESIGN_SPEC_SCHEMA = {
    type: 'object',
    properties: {
      paperTone: { type: 'string', enum: ['cold', 'warm', 'aged', 'clinical', 'weathered', 'official', 'faded'] },
      primaryTypeface: { type: 'string', enum: ['mono', 'serif', 'sans', 'mixed', 'handwritten'] },
      headerStyle: { type: 'string', enum: ['form', 'letterhead', 'stamp', 'handwritten', 'typewriter', 'none'] },
      hasRedactions: { type: 'boolean' },
      hasAnnotations: { type: 'boolean' }
    }
  };

  var AUTHENTICITY_CHECKS_SCHEMA = {
    type: 'object',
    properties: {
      hasIrrelevantDetail: { type: 'boolean' },
      couldExistInDifferentStory: { type: 'boolean' },
      redactionDoesNarrativeWork: { type: 'boolean' }
    }
  };

  var TILE_TYPE_ENUM = ['empty', 'cleared', 'locked', 'anomaly', 'current', 'inaccessible'];
  var MAP_TYPE_ENUM = ['grid', 'point-to-point', 'linear-track', 'player-drawn'];
  var VISUAL_ARCHETYPE_ENUM = ['government', 'cyberpunk', 'scifi', 'fantasy', 'noir',
    'steampunk', 'minimalist', 'nautical', 'occult', 'pastoral'];

  // ── STRUCTURED_SCHEMA_SHELL ───────────────────────────────────────────────

  var STRUCTURED_SCHEMA_SHELL = {
    type: 'object',
    properties: {
      meta: {
        type: 'object',
        properties: {
          schemaVersion: { type: 'string' },
          generatedAt: { type: 'string' },
          blockTitle: { type: 'string' },
          blockSubtitle: { type: 'string' },
          worldContract: { type: 'string' },
          narrativeVoice: {
            type: 'object',
            properties: {
              person: { type: 'string', enum: ['first', 'second', 'third'] },
              tense: { type: 'string', enum: ['past', 'present'] },
              narratorStance: { type: 'string' },
              voiceRationale: { type: 'string' }
            },
            required: ['person', 'tense', 'narratorStance']
          },
          literaryRegister: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              behaviorDescription: { type: 'string' },
              forbiddenMoves: { type: 'array', items: { type: 'string' } },
              typographicBehavior: { type: 'string' }
            },
            required: ['name', 'behaviorDescription', 'forbiddenMoves']
          },
          structuralShape: {
            type: 'object',
            properties: {
              resolution: { type: 'string', enum: ['closed', 'open', 'shifted', 'costly', 'full', 'partial', 'ambiguous'] },
              temporalOrder: { type: 'string', enum: ['chronological', 'in-medias-res', 'rashomon', 'fragmented', 'linear', 'reverse', 'parallel'] },
              narratorReliability: { type: 'string', enum: ['reliable', 'compromised', 'unreliable', 'institutional', 'multiple', 'shifting'] },
              promptFragmentRelationship: { type: 'string', enum: ['fragments-deepen', 'fragments-contradict', 'fragments-parallel', 'fragments-precede'] },
              shapeRationale: { type: 'string' }
            },
            required: ['resolution', 'temporalOrder', 'narratorReliability', 'promptFragmentRelationship']
          },
          artifactIdentity: {
            type: 'object',
            properties: {
              artifactClass: { type: 'string' },
              artifactBlend: {
                anyOf: [
                  { type: 'string' },
                  { type: 'array', items: { type: 'string' } }
                ]
              },
              authorialMode: { type: 'string' },
              boardStateMode: { type: 'string' },
              documentEcology: { type: 'string' },
              materialCulture: { type: 'string' },
              openingMode: { type: 'string' },
              rulesDeliveryMode: { type: 'string' },
              revealShape: { type: 'string' },
              unlockLogic: { type: 'string' },
              shellFamily: { type: 'string' },
              attachmentStrategy: { type: 'string' }
            },
            required: ['artifactClass', 'boardStateMode', 'shellFamily', 'attachmentStrategy']
          },
          weeklyComponentType: { type: 'string' },
          passwordLength: { type: 'integer' },
          passwordEncryptedEnding: { type: 'string' },
          liftoScript: { type: 'string' },
          weekCount: { type: 'integer' },
          totalSessions: { type: 'integer' }
        },
        required: ['schemaVersion', 'blockTitle', 'worldContract', 'narrativeVoice',
          'literaryRegister', 'structuralShape', 'artifactIdentity', 'weeklyComponentType',
          'passwordLength', 'weekCount', 'totalSessions']
      },
      cover: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          designation: { type: 'string' },
          subtitle: { type: 'string' },
          tagline: { type: 'string' },
          colophonLines: { type: 'array', items: { type: 'string' } },
          svgArt: { type: 'string' },
          coverArtCaption: { type: 'string' }
        },
        required: ['title', 'designation', 'tagline', 'colophonLines']
      },
      rulesSpread: {
        type: 'object',
        properties: {
          leftPage: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              reEntryRule: { type: 'string' },
              sections: { type: 'array', items: { type: 'object' } }
            },
            required: ['title', 'sections']
          },
          rightPage: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              instruction: { type: 'string' }
            },
            required: ['title', 'instruction']
          }
        },
        required: ['leftPage', 'rightPage']
      },
      theme: {
        type: 'object',
        properties: {
          visualArchetype: { type: 'string', enum: VISUAL_ARCHETYPE_ENUM },
          palette: {
            type: 'object',
            properties: {
              ink: { type: 'string' }, paper: { type: 'string' },
              accent: { type: 'string' }, muted: { type: 'string' },
              rule: { type: 'string' }, fog: { type: 'string' }
            },
            required: ['ink', 'paper', 'accent', 'muted', 'rule', 'fog']
          },
          tokens: { type: 'object' }
        },
        required: ['visualArchetype', 'palette']
      }
    },
    required: ['meta', 'cover', 'rulesSpread', 'theme']
  };

  var STRUCTURED_SCHEMA_WEEKS = {
    type: 'object',
    properties: {
      weeks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            weekNumber: { type: 'integer' },
            title: { type: 'string' },
            epigraph: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                attribution: { type: 'string' }
              },
              required: ['text', 'attribution']
            },
            isBossWeek: { type: 'boolean' },
            isDeload: { type: 'boolean' },
            overflow: { type: 'boolean' },
            weeklyComponent: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                value: { type: 'string', nullable: true },
                extractionInstruction: { type: 'string' }
              },
              required: ['type', 'value', 'extractionInstruction']
            },
            sessions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sessionNumber: { type: 'integer' },
                  label: { type: 'string' },
                  storyPrompt: { type: 'string' },
                  fragmentRef: { type: 'string' },
                  exercises: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        sets: { type: 'integer' },
                        repsPerSet: { type: 'string' },
                        weightField: { type: 'boolean' },
                        notes: { type: 'string' }
                      },
                      required: ['name']
                    }
                  },
                  binaryChoice: {
                    type: 'object',
                    properties: {
                      choiceLabel: { type: 'string' },
                      promptA: { type: 'string' },
                      promptB: { type: 'string' }
                    }
                  }
                },
                required: ['sessionNumber', 'label', 'storyPrompt', 'exercises']
              }
            },
            fieldOps: {
              type: 'object',
              properties: {
                mapState: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    mapType: { type: 'string', enum: MAP_TYPE_ENUM },
                    gridDimensions: {
                      type: 'object',
                      properties: {
                        columns: { type: 'integer' },
                        rows: { type: 'integer' }
                      },
                      required: ['columns', 'rows']
                    },
                    floorLabel: { type: 'string' },
                    currentPosition: {
                      type: 'object',
                      properties: {
                        col: { type: 'integer' },
                        row: { type: 'integer' }
                      },
                      required: ['col', 'row']
                    },
                    mapNote: { type: 'string' },
                    tiles: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          col: { type: 'integer' },
                          row: { type: 'integer' },
                          type: { type: 'string', enum: TILE_TYPE_ENUM },
                          label: { type: 'string' },
                          annotation: { type: 'string' }
                        },
                        required: ['col', 'row', 'type', 'label']
                      }
                    }
                  },
                  required: ['gridDimensions', 'currentPosition', 'tiles']
                },
                cipher: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    title: { type: 'string' },
                    body: {
                      type: 'object',
                      properties: {
                        displayText: { type: 'string' },
                        key: { type: 'string' },
                        workSpace: {
                          type: 'object',
                          properties: {
                            rows: { type: 'integer' },
                            cellCount: { type: 'integer' },
                            style: { type: 'string' }
                          }
                        },
                        referenceTargets: { type: 'array', items: { type: 'string' } }
                      },
                      required: ['displayText', 'key']
                    },
                    extractionInstruction: { type: 'string' },
                    characterDerivationProof: { type: 'string' },
                    noticeabilityDesign: { type: 'string' }
                  },
                  required: ['type', 'title', 'body', 'extractionInstruction',
                    'characterDerivationProof', 'noticeabilityDesign']
                },
                oracleTable: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    instruction: { type: 'string' },
                    mode: { type: 'string' },
                    entries: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          roll: { type: 'string' },
                          text: { type: 'string' },
                          type: { type: 'string', enum: ['fragment', 'consequence'] },
                          fragmentRef: { type: 'string' },
                          paperAction: { type: 'string' }
                        },
                        required: ['roll', 'text', 'type']
                      }
                    }
                  },
                  required: ['title', 'instruction', 'mode', 'entries']
                },
                companionComponents: { type: 'array', items: { type: 'object' } }
              }
            },
            bossEncounter: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                narrative: { type: 'string' },
                mechanismDescription: { type: 'string' },
                componentInputs: { type: 'array', items: { type: 'string' } },
                decodingKey: {
                  type: 'object',
                  properties: {
                    instruction: { type: 'string' },
                    referenceTable: { type: 'string' }
                  },
                  required: ['instruction', 'referenceTable']
                },
                convergenceProof: { type: 'string' },
                passwordRevealInstruction: { type: 'string' },
                binaryChoiceAcknowledgement: {
                  type: 'object',
                  properties: {
                    ifA: { type: 'string' },
                    ifB: { type: 'string' }
                  },
                  required: ['ifA', 'ifB']
                }
              },
              required: ['title', 'narrative', 'mechanismDescription', 'componentInputs',
                'decodingKey', 'passwordRevealInstruction']
            },
            overflowDocument: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                documentType: { type: 'string', enum: DOCUMENT_TYPE_ENUM },
                inWorldAuthor: { type: 'string' },
                inWorldRecipient: { type: 'string' },
                inWorldPurpose: { type: 'string' },
                content: { type: 'string' },
                designSpec: DESIGN_SPEC_SCHEMA,
                authenticityChecks: AUTHENTICITY_CHECKS_SCHEMA
              },
              required: ['id', 'documentType', 'content']
            },
            interlude: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                reason: { type: 'string' },
                body: { type: 'string' },
                payloadType: { type: 'string' },
                payload: { type: 'object' },
                spreadAware: { type: 'boolean' }
              },
              required: ['title', 'reason', 'body']
            },
            gameplayClocks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  clockType: { type: 'string' },
                  segments: { type: 'integer' },
                  startValue: { type: 'integer' },
                  direction: { type: 'string', enum: ['fill', 'drain'] },
                  linkedClockName: { type: 'string' },
                  opposedClockName: { type: 'string' },
                  thresholds: { type: 'array', items: { type: 'object' } },
                  consequenceOnFull: { type: 'string' }
                },
                required: ['name', 'segments']
              }
            }
          },
          required: ['weekNumber', 'title', 'isBossWeek', 'sessions', 'weeklyComponent']
        }
      }
    },
    required: ['weeks']
  };

  var STRUCTURED_SCHEMA_FRAGMENTS = {
    type: 'object',
    properties: {
      fragments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            documentType: { type: 'string', enum: DOCUMENT_TYPE_ENUM },
            inWorldAuthor: { type: 'string' },
            inWorldRecipient: { type: 'string' },
            inWorldPurpose: { type: 'string' },
            content: { type: 'string' },
            designSpec: DESIGN_SPEC_SCHEMA,
            authenticityChecks: AUTHENTICITY_CHECKS_SCHEMA
          },
          required: ['id', 'documentType', 'inWorldAuthor', 'inWorldPurpose', 'content']
        }
      }
    },
    required: ['fragments']
  };

  var STRUCTURED_SCHEMA_ENDINGS = {
    type: 'object',
    properties: {
      endings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            variant: { type: 'string', enum: ['canonical', 'bittersweet', 'dark', 'ambiguous'] },
            content: {
              type: 'object',
              properties: {
                documentType: { type: 'string', enum: DOCUMENT_TYPE_ENUM },
                body: { type: 'string' },
                finalLine: { type: 'string' }
              },
              required: ['body', 'finalLine']
            },
            designSpec: {
              type: 'object',
              properties: {
                paperTone: { type: 'string' },
                primaryTypeface: { type: 'string' }
              },
              required: ['paperTone']
            }
          },
          required: ['variant', 'content', 'designSpec']
        }
      }
    },
    required: ['endings']
  };

  // ── Workout input normalisation ─────────────────────────────────────────────
  // Bridge between string workout input and NormalizedWorkout objects.
  // String input: wraps in a minimal shell with source: "raw" and empty weeks[].
  // Object input: passes through unchanged.

  function normalizeWorkoutParam(workout) {
    // Already a NormalizedWorkout object
    if (workout && typeof workout === 'object' && workout.source) {
      return workout;
    }

    // String input — wrap in minimal NormalizedWorkout shell
    var rawText = String(workout || '');
    var weekCount = typeof window.parseWeekCount === 'function'
      ? window.parseWeekCount(rawText)
      : 6;

    return {
      source: 'raw',
      rawText: rawText,
      weekCount: weekCount,
      weeks: [],
      summary: {
        sessionsPerWeek: 0,
        totalExercises: 0,
        progression: ''
      }
    };
  }

  // ── Normalized workout → prompt text ────────────────────────────────────────
  // Converts a NormalizedWorkout with populated weeks[] into compact structured
  // text for prompt injection. Falls back to rawText when weeks[] is empty.

  function formatNormalizedForPrompt(nw) {
    if (!nw || !nw.weeks || nw.weeks.length === 0) {
      return nw ? nw.rawText || '' : '';
    }

    var lines = [];
    var sessionsPerWeek = 0;
    nw.weeks.forEach(function (week) {
      if (week.sessions) sessionsPerWeek = Math.max(sessionsPerWeek, week.sessions.length);
    });

    lines.push(nw.weekCount + ' weeks, ' + sessionsPerWeek + ' sessions/week.' +
      (nw.summary && nw.summary.progression ? ' Progression: ' + nw.summary.progression + '.' : ''));
    lines.push('');

    nw.weeks.forEach(function (week, wi) {
      lines.push('Week ' + (wi + 1) + ':');
      (week.sessions || []).forEach(function (session, si) {
        var label = session.dayLabel || ('Session ' + (si + 1));
        var exList = (session.exercises || []).map(function (ex) {
          var sets = ex.sets || 3;
          var reps = ex.repsPerSet || '5';
          var desc = ex.name + ' ' + sets + 'x' + reps;
          if (ex.notes) desc += ' ' + ex.notes;
          return desc;
        }).join(', ');
        lines.push('  ' + label + ': ' + (exList || 'no exercises listed'));
      });
    });

    return lines.join('\n');
  }

  // ── 5-Stage Structured Generator ──────────────────────────────────────────
  //
  // Pipeline: World+Story → Booklet Setup → Weeks → Bonus Pages → Finale
  //

  function resolveStructuredPipelineSettings(settings) {
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

  function allowsEmptyApiKey(settings) {
    var baseUrl = String((settings && settings.baseUrl) || '').replace(/\/+$/, '');
    return !!(settings && settings.noKey)
      || baseUrl === String(PROVIDERS.ollama.baseUrl || '').replace(/\/+$/, '')
      || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(baseUrl);
  }

  // ── Runtime pipeline entrypoints ─────────────────────────────────────────
  // The exported runtime flows are defined here. Older reference flows above
  // are intentionally renamed so they no longer shadow the live entrypoints.

  async function generateMultiStage(settings, workout, brief, onProgress) {
    var nw = normalizeWorkoutParam(workout);
    var totalSessions = 0;
    (nw.weeks || []).forEach(function(w) { totalSessions += (w.sessions ? w.sessions.length : 0); });

    return runApiPipeline({
      settings: settings,
      workout: workout,
      brief: brief,
      weekCount: nw.weekCount,
      totalSessions: totalSessions,
      onProgress: onProgress,
      allowPatch: true,
      assemble: function (shell, weekChunkOutputs, fragmentsOutput, endingsOutput, campaignPlan) {
        return assembleBooklet(shell, weekChunkOutputs, fragmentsOutput, endingsOutput, campaignPlan);
      }
    });
  }

  async function generateStructured(settings, workout, brief, onProgress) {
    var resolvedSettings = resolveStructuredPipelineSettings(settings);
    if (!resolvedSettings.apiKey && resolvedSettings.format !== 'anthropic' && !allowsEmptyApiKey(resolvedSettings)) {
      throw new Error('API key required for structured generation.');
    }

    var nw = normalizeWorkoutParam(workout);
    var workoutText = nw.weeks.length > 0 ? formatNormalizedForPrompt(nw) : nw.rawText;
    var weekCount = nw.weekCount || (typeof window.parseWeekCount === 'function' ? window.parseWeekCount(workoutText) : 6);
    var totalSessions = 0;
    (nw.weeks || []).forEach(function(w) { totalSessions += (w.sessions ? w.sessions.length : 0); });

    return runApiPipeline({
      settings: resolvedSettings,
      workout: workoutText,
      brief: brief,
      onProgress: onProgress,
      weekCount: weekCount,
      totalSessions: totalSessions,
      allowPatch: true,
      assemble: function (shell, weekChunkOutputs, fragmentsOutput, endingsOutput, campaignPlan) {
        return assembleStructuredBooklet(shell, weekChunkOutputs, fragmentsOutput, endingsOutput, nw, campaignPlan);
      }
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * generate(settings, workout, brief) → Promise<Object>
   *
   * Single-pass generation (Standard mode).
   *
   * settings: {
   *   format:  'anthropic' | 'openai'
   *   apiKey:  string
   *   baseUrl: string       (openai format only)
   *   model:   string
   *   requestTimeoutMs: number (optional, default 600000)
   * }
   */
  async function generate(settings, workout, brief) {
    if (typeof window.beginLiftRpgPromptRun === 'function') window.beginLiftRpgPromptRun();
    if (typeof window.generatePrompt !== 'function') {
      throw new Error('Prompt generator not loaded. Please reload the page.');
    }

    var prompt = window.generatePrompt(workout, brief);
    var rawResponse = await callProvider(settings, prompt);
    return extractJson(rawResponse.text);
  }

  // ── Quality Report ────────────────────────────────────────────────────────
  //
  // Deterministic post-generation analysis. Returns a structured report
  // object with scores, warnings, and weak-spot flags. Does NOT modify the
  // booklet. Stored on window.LiftRPGAPI.lastQualityReport after each call.

  function extractWeekCompanionTypes(week) {
    return ((((week || {}).fieldOps || {}).companionComponents) || [])
      .map(function (component) { return String((component || {}).type || '').trim(); })
      .filter(Boolean)
      .sort();
  }

  function collectIdentityVariationFindings(booklet, nonBossWeeks, fragments, report) {
    var findings = 0;
    var meta = (booklet || {}).meta || {};
    var artifactIdentity = meta.artifactIdentity || {};

    var docTypeCounts = {};
    fragments.forEach(function (fragment) {
      var type = String((fragment || {}).documentType || '').trim().toLowerCase();
      if (!type) return;
      docTypeCounts[type] = (docTypeCounts[type] || 0) + 1;
    });
    var dominantDocType = '';
    var dominantDocCount = 0;
    Object.keys(docTypeCounts).forEach(function (type) {
      if (docTypeCounts[type] > dominantDocCount) {
        dominantDocType = type;
        dominantDocCount = docTypeCounts[type];
      }
    });
    if (dominantDocType && fragments.length >= 6 && dominantDocCount / fragments.length >= 0.5) {
      report.weakSpots.push({
        area: 'artifact-monoculture',
        detail: '"' + dominantDocType + '" accounts for ' + dominantDocCount + ' of ' + fragments.length + ' fragments',
        severity: 'high'
      });
      findings++;
    }

    var mapTypes = {};
    nonBossWeeks.forEach(function (week) {
      var mapType = String((((week || {}).fieldOps || {}).mapState || {}).mapType || 'grid');
      mapTypes[mapType] = true;
    });
    if (nonBossWeeks.length >= 4 && Object.keys(mapTypes).length < 2) {
      report.weakSpots.push({
        area: 'board-monotony',
        detail: 'All non-boss weeks use the same mapState.mapType "' + Object.keys(mapTypes)[0] + '"',
        severity: 'high'
      });
      findings++;
    }

    var companionSignatures = {};
    nonBossWeeks.forEach(function (week) {
      var signature = extractWeekCompanionTypes(week).join('|') || 'none';
      companionSignatures[signature] = true;
    });
    if (nonBossWeeks.length >= 4 && Object.keys(companionSignatures).length < 2) {
      report.weakSpots.push({
        area: 'companion-sameness',
        detail: 'Companion component loadout repeats across every non-boss week',
        severity: 'medium'
      });
      findings++;
    }

    if (!artifactIdentity.openingMode || !artifactIdentity.rulesDeliveryMode || !artifactIdentity.unlockLogic) {
      report.weakSpots.push({
        area: 'identity-undercommitment',
        detail: 'artifactIdentity is missing one or more differentiation fields (openingMode, rulesDeliveryMode, unlockLogic)',
        severity: 'medium'
      });
      findings++;
    }

    return findings;
  }

  var QUALITY_BLOCKING_AREAS = {
    'artifact-monoculture': { target: 'fragments' },
    'board-monotony': { target: 'weeks' },
    'companion-sameness': { target: 'weeks' },
    'identity-undercommitment': { target: 'shell', alwaysBlock: true },
    'map-stagnation': { target: 'weeks' },
    'cipher-repetition': { target: 'weeks' },
    'oracle-vagueness': { target: 'weeks' },
    'identity-drift-risk': { target: 'shell', alwaysBlock: true },
    'thin-ending': { target: 'endings' },
    'unsupported-reveal': { target: 'endings' }
  };

  function formatQualityGateMessage(target, detail) {
    var prefix = target ? target.charAt(0).toUpperCase() + target.slice(1) : 'Booklet';
    return prefix + ': ' + detail;
  }

  function buildQualityGate(report) {
    report = report || {};
    var blockers = [];
    var seen = {};

    function pushBlocker(target, detail) {
      var message = formatQualityGateMessage(target, detail);
      if (seen[message]) return;
      seen[message] = true;
      blockers.push({ target: target || '', message: message });
    }

    (report.weakSpots || []).forEach(function (spot) {
      var policy = QUALITY_BLOCKING_AREAS[spot.area];
      if (!policy) return;
      if (policy.alwaysBlock || spot.severity === 'high') {
        pushBlocker(policy.target, spot.detail);
      }
    });

    var identityVariationScore = (((report.scores || {}).identityVariation) || {}).score;
    if (typeof identityVariationScore === 'number' && identityVariationScore < 0.8) {
      pushBlocker('shell', 'identity variation score is ' + identityVariationScore + ' — the booklet is still converging toward the default grammar');
    }

    var aggregateScore = (((report.scores || {}).aggregate) || {}).score;
    if (typeof aggregateScore === 'number' && aggregateScore < 0.72) {
      pushBlocker('shell', 'aggregate quality score is ' + aggregateScore + ' — the booklet needs another pass before export');
    }

    return {
      passed: blockers.length === 0,
      blockers: blockers
    };
  }

  function generateQualityReport(booklet) {
    var report = {
      timestamp: new Date().toISOString(),
      schemaErrors: [],
      scores: {},
      warnings: [],
      weakSpots: []
    };

    if (!booklet || typeof booklet !== 'object') {
      report.schemaErrors.push('Booklet is not a valid object');
      return report;
    }

    // ── Schema completeness (delegate to existing validator) ───────────────
    report.schemaErrors = validateAssembledBooklet(booklet);
    // Surface validator warnings (soft issues) alongside hard errors
    var validatorWarnings = report.schemaErrors.warnings || [];
    if (validatorWarnings.length > 0) {
      report.warnings = report.warnings.concat(validatorWarnings);
    }
    report.scores.schemaCompleteness = report.schemaErrors.length === 0
      ? { score: 1, label: validatorWarnings.length > 0 ? validatorWarnings.length + ' warnings' : 'clean' }
      : { score: Math.max(0, 1 - report.schemaErrors.length * 0.1), label: report.schemaErrors.length + ' errors' };

    var meta = booklet.meta || {};
    var weeks = booklet.weeks || [];
    var fragments = booklet.fragments || [];
    var endings = booklet.endings || [];
    var nonBossWeeks = weeks.filter(function (w) { return !w.isBossWeek; });
    var bossWeek = weeks.filter(function (w) { return w.isBossWeek; })[0];

    // ── Helper: collect all fragment IDs (soft-matching via normalizeId) ────
    var fragmentIdSet = {};     // exact ID → fragment
    var fragmentIdSetNorm = {}; // normalizeId(ID) → fragment
    var overflowIdSetNorm = {}; // normalizeId(ID) → overflow document
    fragments.forEach(function (f) {
      if (f.id) {
        fragmentIdSet[f.id] = f;
        fragmentIdSetNorm[normalizeId(f.id)] = f;
      }
    });
    weeks.forEach(function (week) {
      var od = week && week.overflowDocument;
      if (od && od.id) overflowIdSetNorm[normalizeId(od.id)] = od;
    });

    function fragmentExistsQR(ref) {
      return fragmentIdSet[ref] || fragmentIdSetNorm[normalizeId(ref)] || overflowIdSetNorm[normalizeId(ref)];
    }

    // ── Continuity coherence ───────────────────────────────────────────────
    var continuityIssues = [];

    // Check fragmentRefs in sessions resolve (soft-matching via normalizeId)
    var referencedFragmentIdsNorm = {}; // normalizeId(ref) → true
    weeks.forEach(function (week, wi) {
      (week.sessions || []).forEach(function (s) {
        if (s.fragmentRef) {
          referencedFragmentIdsNorm[normalizeId(s.fragmentRef)] = true;
          if (!fragmentExistsQR(s.fragmentRef)) {
            continuityIssues.push('Week ' + (wi + 1) + ' fragmentRef "' + s.fragmentRef + '" unresolved');
          }
        }
      });
      // Oracle fragment refs
      var oracle = (week.fieldOps || {}).oracleTable || (week.fieldOps || {}).oracle || {};
      (oracle.entries || []).forEach(function (e) {
        if (e.fragmentRef) {
          referencedFragmentIdsNorm[normalizeId(e.fragmentRef)] = true;
          if (!fragmentExistsQR(e.fragmentRef)) {
            continuityIssues.push('Week ' + (wi + 1) + ' oracle fragmentRef "' + e.fragmentRef + '" unresolved');
          }
        }
      });
    });

    // Unreferenced fragments (never pointed to by any session or oracle, soft-matched)
    var unreferencedFragments = fragments.filter(function (f) {
      return f.id && !referencedFragmentIdsNorm[normalizeId(f.id)];
    });
    if (unreferencedFragments.length > 0) {
      continuityIssues.push(unreferencedFragments.length + ' fragment(s) never referenced: ' +
        unreferencedFragments.map(function (f) { return f.id; }).join(', '));
    }

    report.scores.continuityCoherence = continuityIssues.length === 0
      ? { score: 1, label: 'clean' }
      : { score: Math.max(0, 1 - continuityIssues.length * 0.15), label: continuityIssues.length + ' issues' };
    if (continuityIssues.length) report.warnings = report.warnings.concat(continuityIssues);

    // ── Boss convergence integrity ─────────────────────────────────────────
    // Count boss-related validator errors for scoring (they already live in
    // schemaErrors — do NOT re-add them to warnings to avoid duplication).
    // Add quality-only checks that the validator doesn't cover.
    var bossIssues = [];
    var bossQualityWarnings = []; // quality-only (not in schemaErrors)
    if (!bossWeek) {
      // Already an error in schemaErrors; just count for scoring
      bossIssues.push('No boss week found');
    } else if (!bossWeek.bossEncounter) {
      bossIssues.push('Boss week has no bossEncounter object');
    } else {
      var bossObj = bossWeek.bossEncounter;
      if (!bossObj.decodingKey) {
        bossQualityWarnings.push('Boss missing decodingKey — no reveal mechanic');
      }
      // Count boss-related hard errors from validator for scoring only
      var bossErrorCount = report.schemaErrors.filter(function (e) {
        return e.indexOf('Boss ') === 0 || e.indexOf('componentInputs') !== -1 ||
          e.indexOf('A1Z26') !== -1 || e.indexOf('demoPassword') !== -1;
      }).length;
      // Pad bossIssues length to reflect validator errors without duplicating strings
      for (var bei = 0; bei < bossErrorCount; bei++) bossIssues.push('(validator)');
    }

    var bossTotalIssues = bossIssues.length + bossQualityWarnings.length;
    report.scores.bossConvergence = bossTotalIssues === 0
      ? { score: 1, label: 'clean' }
      : { score: Math.max(0, 1 - bossTotalIssues * 0.25), label: bossTotalIssues + ' issues' };
    // Only add quality-only warnings (validator errors are already in schemaErrors)
    if (bossQualityWarnings.length) report.warnings = report.warnings.concat(bossQualityWarnings);

    // ── Fragment reference integrity ───────────────────────────────────────
    var fragIssues = [];
    var docTypes = {};
    fragments.forEach(function (f) {
      if (!f.id) fragIssues.push('Fragment missing id');
      if (!f.documentType) fragIssues.push('Fragment "' + (f.id || '?') + '" missing documentType');
      var dt = f.documentType || 'unknown';
      docTypes[dt] = (docTypes[dt] || 0) + 1;
      if (!f.content && !f.body) fragIssues.push('Fragment "' + (f.id || '?') + '" missing content');
    });

    // Document type diversity
    var typeCount = Object.keys(docTypes).length;
    if (typeCount < 3 && fragments.length >= 6) {
      report.weakSpots.push({
        area: 'fragment-diversity',
        detail: 'Only ' + typeCount + ' document type(s) across ' + fragments.length + ' fragments',
        severity: 'medium'
      });
    }

    report.scores.fragmentIntegrity = fragIssues.length === 0
      ? { score: 1, label: 'clean' }
      : { score: Math.max(0, 1 - fragIssues.length * 0.1), label: fragIssues.length + ' issues' };

    // ── Map integrity ──────────────────────────────────────────────────────
    var mapIssues = [];
    var prevMapLabels = null;
    nonBossWeeks.forEach(function (week) {
      var actualWeekNum = weeks.indexOf(week) + 1; // true week number, not filtered index
      var ms = (week.fieldOps || {}).mapState;
      if (!ms) {
        mapIssues.push('Week ' + actualWeekNum + ' missing mapState');
        return;
      }
      var tiles = ms.tiles || [];
      // Fingerprint includes label + type so persistent topology with evolving state is not flagged
      var labels = tiles.map(function (t) { return (t.label || '') + ':' + (t.type || ''); }).sort().join('|');

      // Check for state evolution (tile labels AND types should differ between weeks)
      if (prevMapLabels !== null && labels === prevMapLabels) {
        report.weakSpots.push({
          area: 'map-stagnation',
          detail: 'Week ' + actualWeekNum + ' map tiles identical to previous week — no visible evolution',
          severity: 'high'
        });
      }
      prevMapLabels = labels;

      if (!ms.currentPosition) {
        mapIssues.push('Week ' + actualWeekNum + ' mapState missing currentPosition');
      }
    });

    // Count map regression errors from validator for scoring (already in schemaErrors)
    var mapRegressionCount = report.schemaErrors.filter(function (e) {
      return e.indexOf('impossible regression') !== -1;
    }).length;

    var mapTotalIssues = mapIssues.length + mapRegressionCount;
    report.scores.mapIntegrity = mapTotalIssues === 0
      ? { score: 1, label: 'clean' }
      : { score: Math.max(0, 1 - mapTotalIssues * 0.15), label: mapTotalIssues + ' issues' };

    // ── Oracle completeness ────────────────────────────────────────────────
    var oracleIssues = [];
    var allOracleTexts = [];
    weeks.forEach(function (week, wi) {
      if (week.isBossWeek) return;
      var oracle = (week.fieldOps || {}).oracleTable || (week.fieldOps || {}).oracle || {};
      var entries = oracle.entries || [];
      if (entries.length === 0) {
        oracleIssues.push('Week ' + (wi + 1) + ' has no oracle entries');
        return;
      }

      entries.forEach(function (e) {
        var txt = e.text || '';
        allOracleTexts.push(txt);
        // Check for vague paperAction
        if (e.paperAction) {
          var pa = e.paperAction.toLowerCase();
          if (pa.indexOf('something') !== -1 || pa.indexOf('update the board') !== -1 || pa === '') {
            report.weakSpots.push({
              area: 'oracle-vagueness',
              detail: 'Week ' + (wi + 1) + ' oracle paperAction is vague: "' + e.paperAction + '"',
              severity: 'high'
            });
          }
        }
      });
    });

    // Thin oracle variety: check for near-duplicate texts across weeks
    var oracleDupes = 0;
    for (var oi = 0; oi < allOracleTexts.length; oi++) {
      for (var oj = oi + 1; oj < allOracleTexts.length; oj++) {
        if (allOracleTexts[oi] && allOracleTexts[oi] === allOracleTexts[oj]) {
          oracleDupes++;
        }
      }
    }
    if (oracleDupes > 0) {
      report.weakSpots.push({
        area: 'oracle-variety',
        detail: oracleDupes + ' duplicate oracle text(s) across weeks',
        severity: 'medium'
      });
    }

    report.scores.oracleCompleteness = oracleIssues.length === 0
      ? { score: 1, label: 'clean' }
      : { score: Math.max(0, 1 - oracleIssues.length * 0.2), label: oracleIssues.length + ' issues' };

    // ── Overflow document planning integrity ───────────────────────────────
    var overflowIssues = [];
    weeks.forEach(function (week, wi) {
      if ((week.sessions || []).length > 3) {
        var od = week.overflowDocument;
        if (!od) {
          overflowIssues.push('Week ' + (wi + 1) + ' overflow but no overflowDocument');
        } else {
          if (!od.documentType) overflowIssues.push('Week ' + (wi + 1) + ' overflowDocument missing documentType');
          if (!od.content && !od.body) overflowIssues.push('Week ' + (wi + 1) + ' overflowDocument missing content');
        }
      }
    });

    report.scores.overflowIntegrity = overflowIssues.length === 0
      ? { score: 1, label: 'clean' }
      : { score: Math.max(0, 1 - overflowIssues.length * 0.25), label: overflowIssues.length + ' issues' };

    // ── Workout/session consistency ────────────────────────────────────────
    var sessionIssues = [];
    var totalSessions = 0;
    weeks.forEach(function (week, wi) {
      var sessions = week.sessions || [];
      totalSessions += sessions.length;
      if (sessions.length === 0) {
        sessionIssues.push('Week ' + (wi + 1) + ' has zero sessions');
      }
      sessions.forEach(function (s, si) {
        if (!s.storyPrompt && !s.prompt) {
          sessionIssues.push('Week ' + (wi + 1) + ' session ' + (si + 1) + ' missing storyPrompt');
        }
        if (!s.exercises || s.exercises.length === 0) {
          sessionIssues.push('Week ' + (wi + 1) + ' session ' + (si + 1) + ' has no exercises');
        }
      });
    });
    if (meta.totalSessions && meta.totalSessions !== totalSessions) {
      sessionIssues.push('meta.totalSessions (' + meta.totalSessions + ') != actual (' + totalSessions + ')');
    }

    report.scores.sessionConsistency = sessionIssues.length === 0
      ? { score: 1, label: 'clean' }
      : { score: Math.max(0, 1 - sessionIssues.length * 0.1), label: sessionIssues.length + ' issues' };

    var identityVariationIssues = collectIdentityVariationFindings(booklet, nonBossWeeks, fragments, report);
    report.scores.identityVariation = identityVariationIssues === 0
      ? { score: 1, label: 'clean' }
      : { score: Math.max(0, 1 - identityVariationIssues * 0.2), label: identityVariationIssues + ' issues' };

    // ── Weak spot detection (heuristics) ───────────────────────────────────

    // Repeated cipher types
    var cipherTypes = [];
    nonBossWeeks.forEach(function (w) {
      var ct = ((w.fieldOps || {}).cipher || {}).type || '';
      cipherTypes.push(ct);
    });
    for (var ci = 1; ci < cipherTypes.length; ci++) {
      if (cipherTypes[ci] && cipherTypes[ci] === cipherTypes[ci - 1]) {
        report.weakSpots.push({
          area: 'cipher-repetition',
          detail: 'Weeks ' + ci + ' and ' + (ci + 1) + ' both use cipher type "' + cipherTypes[ci] + '"',
          severity: 'high'
        });
      }
    }
    var uniqueCipherTypes = {};
    cipherTypes.forEach(function (t) { if (t) uniqueCipherTypes[t] = true; });
    if (Object.keys(uniqueCipherTypes).length < Math.min(4, nonBossWeeks.length) && nonBossWeeks.length >= 4) {
      report.weakSpots.push({
        area: 'cipher-diversity',
        detail: 'Only ' + Object.keys(uniqueCipherTypes).length + ' distinct cipher types across ' + nonBossWeeks.length + ' non-boss weeks (target: 4+)',
        severity: 'medium'
      });
    }

    // Underused fragments (exist but never referenced)
    if (unreferencedFragments.length > fragments.length * 0.3 && fragments.length > 3) {
      report.weakSpots.push({
        area: 'underused-fragments',
        detail: unreferencedFragments.length + ' of ' + fragments.length + ' fragments never referenced by sessions or oracles',
        severity: 'medium'
      });
    }

    // Voice/register drift risk: check if meta has narrativeVoice
    if (!meta.narrativeVoice && !meta.literaryRegister) {
      report.weakSpots.push({
        area: 'voice-drift-risk',
        detail: 'meta missing narrativeVoice and literaryRegister — high risk of register drift across stages',
        severity: 'low'
      });
    }
    if (!meta.artifactIdentity) {
      report.weakSpots.push({
        area: 'identity-drift-risk',
        detail: 'meta.artifactIdentity missing — renderer will infer shell identity from weak signals only',
        severity: 'high'
      });
    }

    // Endings quality: check endings reference specifics
    endings.forEach(function (ending, ei) {
      var body = '';
      if (ending.content && typeof ending.content === 'object') {
        body = ending.content.body || ending.content.html || '';
      } else if (typeof ending.content === 'string') {
        body = ending.content;
      } else if (ending.body) {
        body = ending.body;
      }
      if (body.length < 100) {
        report.weakSpots.push({
          area: 'thin-ending',
          detail: 'Ending ' + (ei + 1) + ' body is only ' + body.length + ' chars — likely too thin for payoff',
          severity: 'high'
        });
      }
    });

    // Unsupported reveal pattern: boss without decodingKey referenceTable
    if (bossWeek) {
      var dk = (bossWeek.bossEncounter || {}).decodingKey;
      if (dk && !dk.referenceTable && !dk.instruction) {
        report.weakSpots.push({
          area: 'unsupported-reveal',
          detail: 'Boss decodingKey present but missing both referenceTable and instruction',
          severity: 'high'
        });
      }
    }

    // ── Aggregate score ────────────────────────────────────────────────────
    var scoreKeys = Object.keys(report.scores);
    var totalScore = 0;
    scoreKeys.forEach(function (k) { totalScore += report.scores[k].score; });
    report.scores.aggregate = {
      score: Math.round((totalScore / scoreKeys.length) * 100) / 100,
      label: scoreKeys.length + ' dimensions'
    };

    report.weakSpotCount = report.weakSpots.length;
    report.warningCount = report.warnings.length;

    // Side-effect: store on public API for console inspection
    if (typeof window !== 'undefined' && window.LiftRPGAPI) {
      window.LiftRPGAPI.lastQualityReport = report;
    }

    return report;
  }


  return {
    PROVIDERS: PROVIDERS,
    listProviderModels: listProviderModels,
    refreshPricing: refreshPricing,
    generate: generate,
    generateMultiStage: generateMultiStage,
    generateStructured: generateStructured,
    clearCheckpoint: clearCheckpoint,
    getCheckpoint: getCheckpoint,
    manual: {
      ensureArtifactIdentity: ensureArtifactIdentity,
      buildIdentityContract: buildIdentityContract,
      compareIdentityContract: compareIdentityContract,
      enforceIdentityContract: enforceIdentityContract,
      formatIdentityContractLines: formatIdentityContractLines,
      buildContinuityLedger: buildContinuityLedger,
      validateWeekChunkContinuity: validateWeekChunkContinuity,
      validateFragmentBatchContinuity: validateFragmentBatchContinuity,
      validateEndingsContinuity: validateEndingsContinuity,
      extractShellContext: extractShellContext,
      buildChunkContinuity: buildChunkContinuity,
      assembleBooklet: assembleBooklet,
      extractWeekSummaries: extractWeekSummaries,
      findBinaryChoiceWeek: findBinaryChoiceWeek,
      buildFragmentBatches: buildFragmentBatches,
      mergeFragmentBatches: mergeFragmentBatches
    },
    _extractJson: extractJson,
    _validateSchema: validateBookletSchema,
    _validateAssembled: validateAssembledBooklet,
    _normalizeWorkout: normalizeWorkoutParam,
    _buildIdentityContract: buildIdentityContract,
    _compareIdentityContract: compareIdentityContract,
    qualityReport: generateQualityReport,
    qualityGate: buildQualityGate,
    getDailyBudget: getDailyBudget,
    checkDailyBudget: checkDailyBudget,
    DAILY_CALL_LIMIT: DAILY_CALL_LIMIT,
    lastQualityReport: null,
    lastPricing: null
  };
})();
