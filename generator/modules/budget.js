// ── Budget, rate limiting, and daily call tracking ───────────────────────────
// Extracted from api-generator.js (lines 62–151).
// Manages Gemini free-tier budget enforcement, per-minute rate limiting,
// and localStorage persistence of daily API call counts.

import { BUDGET_KEY, RATE_WINDOW_MS, RATE_MAX_CALLS, DAILY_CALL_LIMIT } from './constants.js';
import { detectProviderId } from './provider.js';

// ── Exported functions ────────────────────────────────────────────────────────

export function getDailyBudget() {
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

export function saveDailyBudget(budget) {
  try { localStorage.setItem(BUDGET_KEY, JSON.stringify(budget)); } catch (_e) { /* quota */ }
}

export function recordApiCall(tokenCount) {
  var budget = getDailyBudget();
  budget.calls++;
  budget.tokens += (tokenCount || 0);
  budget.timestamps.push(Date.now());
  saveDailyBudget(budget);
}

export function isGeminiProvider(settings) {
  var providerId = detectProviderId(settings);
  return providerId === 'gemini' || providerId === 'google' || providerId === 'google-free';
}

export function createRateLimiter(maxCalls, windowMs) {
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

export function emitRateLimitWait(delayMs) {
  console.log('[LiftRPG] Rate limit: waiting ' + Math.ceil(delayMs / 1000) + 's for next slot.');
}

export function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

export function estimatePipelineCalls(weekCount) {
  // 3 setup + weekCount weeks + ceil(weekCount/2) fragment batches (max 3) + 1 ending
  var fragBatches = Math.min(3, Math.ceil(weekCount / 2));
  return 3 + weekCount + fragBatches + 1;
}

export function checkDailyBudget(settings, weekCount) {
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
