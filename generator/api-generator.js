/**
 * api-generator.js
 *
 * Client-side API integration for the LiftRPG prompt generator.
 * Supports Anthropic and any OpenAI-compatible provider (OpenAI, Groq,
 * Ollama, custom endpoints).
 *
 * Exposes: window.LiftRPGAPI = { PROVIDERS, generate(settings, workout, brief, dice) }
 *
 * SECURITY: API keys are stored in localStorage by the caller and sent
 * directly to the provider. They never pass through any LiftRPG server.
 * Anthropic browser-side access requires the dangerous-direct-browser-access
 * header, which Anthropic provides for exactly this use case.
 */
window.LiftRPGAPI = (function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────

  var DEFAULT_TIMEOUT_MS = 300000; // 5 minutes — generous for long LLM generations

  // Canonical document type list — single source of truth for schema enums + validator
  var DOCUMENT_TYPE_ENUM = ['memo', 'report', 'inspection', 'fieldNote',
    'correspondence', 'letter', 'transcript', 'form', 'anomaly'];

  // ── Provider presets ────────────────────────────────────────────────────────

  var PROVIDERS = {
    anthropic: {
      label: 'Claude (Anthropic)',
      baseUrl: 'https://api.anthropic.com',
      defaultModel: 'claude-opus-4-6',
      format: 'anthropic'
    },
    openai: {
      label: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o',
      format: 'openai'
    },
    groq: {
      label: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      defaultModel: 'llama-3.3-70b-versatile',
      format: 'openai'
    },
    ollama: {
      label: 'Ollama (local)',
      baseUrl: 'http://localhost:11434/v1',
      defaultModel: 'llama3.2',
      format: 'openai',
      noKey: true
    },
    gemini: {
      label: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      defaultModel: 'gemini-2.5-pro-preview',
      format: 'openai'
    },
    custom: {
      label: 'Custom (OpenAI-compatible)',
      baseUrl: '',
      defaultModel: '',
      format: 'openai'
    }
  };

  // ── Fetch with timeout ────────────────────────────────────────────────────
  // Wraps fetch() with an AbortController so long-running requests don't hang
  // silently. Default 5 minutes; override via settings.requestTimeoutMs.

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

  async function callAnthropic(apiKey, model, prompt, maxTokens, timeoutMs) {
    var resp = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens || 32000,
        messages: [{ role: 'user', content: prompt }]
      })
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
    window.LiftRPGAPI && (window.LiftRPGAPI.lastRaw = rawText);
    window.LiftRPGAPI && (window.LiftRPGAPI.lastMeta = {
      stop_reason: body.stop_reason,
      model: body.model,
      usage: body.usage
    });
    if (body.stop_reason === 'max_tokens') {
      throw new Error(
        'Response truncated: the model hit the output token limit before completing the JSON.\n\n' +
        'The booklet JSON requires more output tokens than this model provided. ' +
        'Switch to a model with a larger output window, or use Chat mode.\n' +
        'Tip: open generator/test-repair.html and click \'Load lastRaw\' to inspect the partial output.'
      );
    }
    return rawText;
  }

  async function callOpenAICompat(apiKey, baseUrl, model, prompt, maxTokens, timeoutMs) {
    var url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
    var headers = { 'content-type': 'application/json' };
    if (apiKey) {
      headers['Authorization'] = 'Bearer ' + apiKey;
    }

    var resp = await fetchWithTimeout(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens || 65536,
        max_completion_tokens: maxTokens || 65536,
        messages: [{ role: 'user', content: prompt }]
      })
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
    window.LiftRPGAPI && (window.LiftRPGAPI.lastRaw = rawText);
    window.LiftRPGAPI && (window.LiftRPGAPI.lastMeta = {
      finish_reason: body.choices[0].finish_reason,
      model: body.model,
      usage: body.usage
    });
    if (body.choices[0].finish_reason === 'length') {
      throw new Error(
        'Response truncated: the model hit the output token limit before completing the JSON.\n\n' +
        'The booklet JSON requires more output tokens than this model provided. ' +
        'Switch to a model with a larger output window, or use Chat mode.\n' +
        'Tip: open generator/test-repair.html and click \'Load lastRaw\' to inspect the partial output.'
      );
    }
    return rawText;
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
      return callAnthropic(settings.apiKey, settings.model, prompt, maxTokens, timeoutMs);
    }
    return callOpenAICompat(settings.apiKey, settings.baseUrl, settings.model, prompt, maxTokens, timeoutMs);
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
      var mode = oracle.mode || (entries.length === 11 ? 'simple' : null);
      if (mode === 'simple' && entries.length !== 11) {
        errors.push(wn + ' simple oracle: has ' + entries.length + ' entries, needs 11 (rolls "2"–"12")');
      }

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

  function generatePatchPrompt(rawJson, errors) {
    return [
      'You are a JSON repair specialist.',
      '',
      'The JSON below has validation errors. Fix ONLY the listed errors.',
      '',
      'RULES:',
      '- Output ONLY the corrected JSON. No markdown fences, no commentary, no explanation.',
      '- Preserve all unaffected content exactly as-is.',
      '- The output must be valid, parseable JSON.',
      '',
      '## Errors to Fix',
      errors.map(function (e) { return '- ' + e; }).join('\n'),
      '',
      '## JSON',
      '',
      rawJson
    ].join('\n');
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
    return hasContent ? ctx : null;
  }

  // ── Inter-chunk continuity builder ──────────────────────────────────────
  // Builds a compact continuity packet from ALL prior generated weeks.
  // Replaces the thin {lastWeekNumber, lastMapState, lastClocks, lastTitle}
  // with a richer summary that lets downstream chunks maintain puzzle, map,
  // fragment, and narrative coherence without seeing full prior JSON.

  function buildChunkContinuity(allPriorWeeks) {
    if (!allPriorWeeks || allPriorWeeks.length === 0) return null;

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
      clocks: allPriorWeeks[allPriorWeeks.length - 1].gameplayClocks || []
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

    // ── Meta counts (always override) ──────────────────────────────────────
    meta.weekCount = weeks.length;
    meta.totalSessions = weeks.reduce(function (sum, w) {
      return sum + (w.sessions ? w.sessions.length : 0);
    }, 0);

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

    // ── Boss encounter: enforce componentInputs ────────────────────────────
    var bossWeek = null;
    for (var i = weeks.length - 1; i >= 0; i--) {
      if (weeks[i].isBossWeek) { bossWeek = weeks[i]; break; }
    }

    if (bossWeek && bossWeek.bossEncounter && nonBossValues.length > 0) {
      var boss = bossWeek.bossEncounter;
      var existingInputs = boss.componentInputs || [];

      // Only override when we have values for every non-boss week
      var nonBossCount = weeks.filter(function (w) { return !w.isBossWeek; }).length;
      if (nonBossValues.length === nonBossCount) {
        // Convert to strings for consistency
        var computed = nonBossValues.map(function (v) { return String(v); });

        // Check if model's values match — if not, override with computed truth
        var mismatch = existingInputs.length !== computed.length;
        if (!mismatch) {
          for (var ci = 0; ci < computed.length; ci++) {
            if (String(existingInputs[ci]) !== computed[ci]) { mismatch = true; break; }
          }
        }

        if (mismatch) {
          if (existingInputs.length > 0) {
            warnings.push('componentInputs overridden: model had [' + existingInputs.join(', ') + '], computed [' + computed.join(', ') + ']');
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

      // Simple oracle: must have exactly rolls "2" through "12"
      var mode = oracle.mode || (entries.length === 11 ? 'simple' : null);
      if (mode === 'simple') {
        if (entries.length !== 11) {
          errors.push(wn + ' simple oracle: has ' + entries.length + ' entries, needs 11 (rolls "2"\u2013"12")');
        } else {
          var expectedRolls = {};
          for (var r = 2; r <= 12; r++) expectedRolls[String(r)] = false;
          entries.forEach(function (entry) {
            var roll = String(entry.roll);
            if (!(roll in expectedRolls)) {
              errors.push(wn + ' simple oracle: unexpected roll "' + roll + '" (must be "2"\u2013"12")');
            } else if (expectedRolls[roll]) {
              errors.push(wn + ' simple oracle: duplicate roll "' + roll + '"');
            }
            expectedRolls[roll] = true;
          });
          for (var mr in expectedRolls) {
            if (!expectedRolls[mr]) {
              errors.push(wn + ' simple oracle: missing roll "' + mr + '"');
            }
          }
        }
      }

      // -- Cipher validation (non-boss weeks) --
      var cipher = fo.cipher || {};
      if (!week.isBossWeek) {
        // Required cipher fields
        var REQUIRED_CIPHER_FIELDS = ['type', 'body', 'extractionInstruction', 'characterDerivationProof', 'noticeabilityDesign'];
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

  // ── 10-Stage Multi-Stage Generator ──────────────────────────────────────
  //
  // Pipeline: Layer Bible → Campaign Plan → Shell → Week Chunks → Fragments → Endings → Validate → Patch
  //
  // onProgress(stageIndex, totalStages, message) — UI callback

  async function generateMultiStage(settings, workout, brief, dice, onProgress) {
    if (typeof window.beginLiftRpgPromptRun === 'function') window.beginLiftRpgPromptRun();
    // Check required generators
    if (typeof window.generateStage1Prompt !== 'function' ||
      typeof window.generateStage2Prompt !== 'function' ||
      typeof window.generateShellPrompt !== 'function' ||
      typeof window.generateWeekChunkPrompt !== 'function' ||
      typeof window.generateFragmentsPrompt !== 'function' ||
      typeof window.generateFragmentBatchPrompt !== 'function' ||
      typeof window.generateEndingsPrompt !== 'function') {
      throw new Error('Pipeline generators not loaded. Please reload the page.');
    }

    // 0. Plan the pipeline
    var weekCount = window.parseWeekCount(workout);
    var chunks = window.planWeekChunks(weekCount);
    // totalStages updated after campaign plan (once we know batch count)
    var totalStages = 3 + chunks.length + 2; // initial estimate: planning(2) + shell(1) + weeks(N) + fragments(1) + endings(1)
    var stageNum = 0;

    function progress(message) {
      stageNum++;
      onProgress(stageNum, totalStages, message);
    }

    // Helper: wrap callProvider to tag errors with stage name
    async function callStage(prompt, maxTokens, stageName) {
      try {
        return await callProvider(settings, prompt, maxTokens);
      } catch (err) {
        throw new Error('[' + stageName + '] ' + err.message);
      }
    }

    // Helper: unwrap partial-JSON output when model adds an extra wrapper key.
    // e.g., { "weekOutput": { "weeks": [...] } } → { "weeks": [...] }
    function unwrapIfNeeded(result, expectedKey) {
      if (!result || typeof result !== 'object') return result;
      if (result[expectedKey]) return result; // already correct shape
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

    // 1. Layer Bible
    progress('Building layer bible\u2026');
    var raw1 = await callStage(window.generateStage1Prompt(workout, brief, dice), 8192, 'Layer Bible');
    var layerBible = extractJson(raw1);

    if (!layerBible.storyLayer || !layerBible.gameLayer || !layerBible.governingLayer) {
      throw new Error(
        'Stage 1 failed: layer bible missing required sections (storyLayer, gameLayer, governingLayer).\n' +
        'The model may not have followed the output schema. Try again.'
      );
    }

    // 2. Campaign Plan + Fragment Registry
    progress('Planning campaign\u2026');
    var raw2 = await callStage(window.generateStage2Prompt(workout, brief, dice, layerBible), 16384, 'Campaign Plan');
    var campaignPlan = extractJson(raw2);

    if (!campaignPlan.weeks || !Array.isArray(campaignPlan.weeks) || !campaignPlan.bossPlan) {
      throw new Error(
        'Stage 2 failed: campaign plan missing required sections (weeks[], bossPlan).\n' +
        'The model may not have followed the output schema. Try again.'
      );
    }

    if (!campaignPlan.fragmentRegistry || !Array.isArray(campaignPlan.fragmentRegistry)) {
      console.warn('[LiftRPG] Stage 2 missing fragmentRegistry — fragments will have no pre-assigned IDs');
      campaignPlan.fragmentRegistry = [];
    }
    if (!campaignPlan.overflowRegistry || !Array.isArray(campaignPlan.overflowRegistry)) {
      console.warn('[LiftRPG] Stage 2 missing overflowRegistry — overflow docs will be unplanned');
      campaignPlan.overflowRegistry = [];
    }

    // Recalculate totalStages now that we know fragment batch count
    var plannedFragBatches = buildFragmentBatches(campaignPlan.fragmentRegistry, null);
    var fragBatchCount = Math.max(plannedFragBatches.length, 1); // at least 1 for monolithic fallback
    totalStages = 3 + chunks.length + fragBatchCount + 1; // planning(2) + shell(1) + weeks(N) + fragBatches(B) + endings(1)

    // 3. Booklet Shell
    progress('Building booklet shell\u2026');
    var raw3 = await callStage(window.generateShellPrompt(brief, layerBible, campaignPlan), 16384, 'Booklet Shell');
    var shell = extractJson(raw3);
    shell = unwrapIfNeeded(shell, 'meta');
    // If model output full booklet instead of shell, strip week/fragment/endings keys
    if (shell.meta && Array.isArray(shell.weeks)) {
      console.warn('[LiftRPG] Shell stage output included weeks/fragments/endings — stripping');
      delete shell.weeks;
      delete shell.fragments;
      delete shell.endings;
    }

    if (!shell.meta || !shell.cover || !shell.rulesSpread) {
      throw new Error(
        'Stage 3 failed: booklet shell missing required keys (meta, cover, rulesSpread).\n' +
        'The model may not have followed the output schema. Try again.'
      );
    }

    // Extract narrative constraints for downstream stages
    var shellContext = extractShellContext(shell);

    // 4..N-3. Week Chunks
    var weekChunkOutputs = [];
    var allComponentValues = [];
    var allPriorWeeks = [];

    for (var ci = 0; ci < chunks.length; ci++) {
      var weekNums = chunks[ci];
      var isBoss = weekNums.indexOf(weekCount) !== -1;
      var label = isBoss
        ? 'Generating boss week\u2026'
        : weekNums.length === 1
          ? 'Generating week ' + weekNums[0] + '\u2026'
          : 'Generating weeks ' + weekNums[0] + '\u2013' + weekNums[weekNums.length - 1] + '\u2026';

      progress(label);
      var chunkLabel = isBoss ? 'Boss Week' : 'Weeks ' + weekNums.join(',');
      var continuity = buildChunkContinuity(allPriorWeeks);
      var rawChunk = await callStage(
        window.generateWeekChunkPrompt(workout, brief, layerBible, campaignPlan, weekNums, continuity, allComponentValues, shellContext),
        32000,
        chunkLabel
      );
      var chunkOutput = extractJson(rawChunk);
      chunkOutput = unwrapIfNeeded(chunkOutput, 'weeks');
      // If model output full booklet instead of just weeks, extract only weeks
      if (chunkOutput.meta && Array.isArray(chunkOutput.weeks)) {
        console.warn('[LiftRPG] Week chunk output a full booklet — extracting weeks only');
        chunkOutput = { weeks: chunkOutput.weeks };
      }
      weekChunkOutputs.push(chunkOutput);

      // Accumulate all prior weeks for continuity + component values for boss
      (chunkOutput.weeks || []).forEach(function (w) {
        allPriorWeeks.push(w);
        if (w.weeklyComponent && w.weeklyComponent.value !== undefined && w.weeklyComponent.value !== null) {
          allComponentValues.push(w.weeklyComponent.value);
        }
      });
    }

    // N-2. Fragments (batched by week association)
    var weekSummaries = extractWeekSummaries(weekChunkOutputs);
    var fragBatches = buildFragmentBatches(campaignPlan.fragmentRegistry, weekSummaries);
    var fragmentsOutput;

    if (fragBatches.length <= 1) {
      // Small registry or no weekRef data — single call (monolithic fallback)
      progress('Generating fragments\u2026');
      var rawFrags = await callStage(
        window.generateFragmentsPrompt(layerBible, campaignPlan, weekSummaries, shellContext),
        32000,
        'Fragments'
      );
      fragmentsOutput = extractJson(rawFrags);
      fragmentsOutput = unwrapIfNeeded(fragmentsOutput, 'fragments');
    } else {
      // Batched generation
      var batchOutputs = [];
      var priorFragments = [];

      for (var fi = 0; fi < fragBatches.length; fi++) {
        var batch = fragBatches[fi];
        var batchLabel = 'Fragments ' + (fi + 1) + '/' + fragBatches.length +
          ' (weeks ' + batch.weekNumbers.join(',') + ')';
        progress('Generating ' + batchLabel.toLowerCase() + '\u2026');

        var rawBatch = await callStage(
          window.generateFragmentBatchPrompt(
            layerBible,
            batch.registry,
            batch.weekSummaries,
            weekSummaries,
            priorFragments,
            fi,
            fragBatches.length,
            shellContext
          ),
          32000,
          batchLabel
        );
        var batchOutput = extractJson(rawBatch);
        batchOutput = unwrapIfNeeded(batchOutput, 'fragments');
        batchOutputs.push(batchOutput);

        // Accumulate for continuity into next batch
        (batchOutput.fragments || []).forEach(function (f) {
          priorFragments.push(f);
        });
      }

      // Merge + validate
      var mergeResult = mergeFragmentBatches(batchOutputs, campaignPlan.fragmentRegistry);
      if (mergeResult.errors.length > 0) {
        console.warn('[LiftRPG] Fragment batch merge issues:', mergeResult.errors);
      }
      fragmentsOutput = { fragments: mergeResult.fragments };
    }

    // N-1. Endings
    progress('Generating endings\u2026');
    var lastChunkWeeks = weekChunkOutputs[weekChunkOutputs.length - 1].weeks || [];
    var bossWeek = lastChunkWeeks[lastChunkWeeks.length - 1] || {};
    var binaryChoiceWeek = findBinaryChoiceWeek(weekChunkOutputs);
    var rawEndings = await callStage(
      window.generateEndingsPrompt(layerBible, campaignPlan, bossWeek, binaryChoiceWeek, shellContext, weekSummaries),
      8192,
      'Endings'
    );
    var endingsOutput = extractJson(rawEndings);
    endingsOutput = unwrapIfNeeded(endingsOutput, 'endings');

    // Assemble
    console.log('[LiftRPG] Assembling booklet from', weekChunkOutputs.length, 'week chunks,',
      ((fragmentsOutput || {}).fragments || []).length, 'fragments,',
      ((endingsOutput || {}).endings || []).length, 'endings');
    var booklet = assembleBooklet(shell, weekChunkOutputs, fragmentsOutput, endingsOutput, campaignPlan);

    // Validate + single patch attempt (no retry loop)
    var errors = validateAssembledBooklet(booklet);
    if (errors.warnings && errors.warnings.length > 0) {
      console.warn('[LiftRPG] Validation warnings:', errors.warnings);
    }
    if (errors.length > 0) {
      console.warn('[LiftRPG] Assembled booklet has', errors.length, 'validation errors:', errors);
      totalStages++; // account for patch stage in progress reporting
      var errLabel = errors.length === 1 ? '1 error' : errors.length + ' errors';
      progress('Patching ' + errLabel + '\u2026');
      try {
        var rawPatched = await callStage(
          generatePatchPrompt(JSON.stringify(booklet, null, 2), errors),
          32000,
          'Patch'
        );
        booklet = extractJson(rawPatched);
        // Re-enforce derived fields — patch LLM may have clobbered them
        enforceBookletDerivedFields(booklet);
        var remaining = validateAssembledBooklet(booklet);
        if (remaining.length > 0) {
          console.warn('[LiftRPG] Patch did not fully resolve errors (' + remaining.length + ' remaining):', remaining);
          // Keep the partially repaired booklet — better than the unpatched version
        }
      } catch (patchErr) {
        // Patch failed — keep the unpatched booklet and warn
        console.warn('[LiftRPG] Patch stage failed, returning unpatched booklet:', patchErr.message);
      }
    }

    // Auto-populate quality report for console inspection
    generateQualityReport(booklet);

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
          informationLayers: { type: 'string' }
        },
        required: ['coreLoop', 'persistentTopology', 'majorZones', 'gatesAndKeys',
          'progressionGates', 'persistentPressures', 'companionSurfaces',
          'revisitLogic', 'boardStateArc', 'bossConvergence', 'informationLayers']
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
      designPrinciples: { type: 'array', items: { type: 'string' } },
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
    required: ['storyLayer', 'gameLayer', 'governingLayer', 'designPrinciples', 'designLedger']
  };

  var STRUCTURED_SCHEMA_CAMPAIGN = {
    type: 'object',
    properties: {
      topology: {
        type: 'object',
        properties: {
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
          requiredPriorKnowledge: { type: 'array', items: { type: 'string' } }
        },
        required: ['decodeLogic', 'whyItFeelsEarned', 'requiredPriorKnowledge']
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
          required: ['id', 'title', 'documentType', 'revealPurpose', 'clueFunction']
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
              resolution: { type: 'string', enum: ['full', 'partial', 'ambiguous', 'open', 'closed', 'shifted', 'costly'] },
              temporalOrder: { type: 'string', enum: ['linear', 'fragmented', 'reverse', 'parallel'] },
              narratorReliability: { type: 'string', enum: ['reliable', 'unreliable', 'multiple', 'shifting', 'compromised', 'institutional'] },
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
                    mode: { type: 'string', enum: ['simple', 'full'] },
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
            designSpec: { type: 'string' }
          },
          required: ['variant', 'content']
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
  // Pipeline: World+Campaign → Shell → Weeks → Fragments → Endings
  //
  // Uses native Gemini API with responseJsonSchema for typed JSON output.
  // No extractJson/repairJson step. Reuses existing prompt generators from
  // generator.js unchanged. Exercise override happens during assembly.
  //
  // onProgress(stageIndex, totalStages, message) — UI callback

  async function generateStructured(settings, workout, brief, dice, onProgress) {
    if (typeof window.beginLiftRpgPromptRun === 'function') window.beginLiftRpgPromptRun();
    // Validate required prompt generators
    if (typeof window.generateStage1Prompt !== 'function' ||
      typeof window.generateStage2Prompt !== 'function' ||
      typeof window.generateShellPrompt !== 'function' ||
      typeof window.generateWeekChunkPrompt !== 'function' ||
      typeof window.generateFragmentsPrompt !== 'function' ||
      typeof window.generateFragmentBatchPrompt !== 'function' ||
      typeof window.generateEndingsPrompt !== 'function') {
      throw new Error('Pipeline generators not loaded. Please reload the page.');
    }

    // Resolve Gemini settings
    var apiKey = settings.geminiApiKey || settings.apiKey;
    var model = settings.geminiModel || settings.model || 'gemini-2.5-flash';
    if (!apiKey) {
      throw new Error('Gemini API key required for structured generation.');
    }
    var timeoutMs = settings.requestTimeoutMs || DEFAULT_TIMEOUT_MS;

    // Normalize workout input
    var nw = normalizeWorkoutParam(workout);
    var workoutText = nw.weeks.length > 0 ? formatNormalizedForPrompt(nw) : nw.rawText;
    var weekCount = nw.weekCount || (typeof window.parseWeekCount === 'function' ? window.parseWeekCount(workoutText) : 6);

    // Plan pipeline
    var chunks = typeof window.planWeekChunks === 'function' ? window.planWeekChunks(weekCount) : [[1, 2, 3], [4, 5, 6]];
    var totalStages = 5; // initial estimate; updated after campaign plan
    var stageNum = 0;

    function progress(message) {
      stageNum++;
      if (onProgress) onProgress(stageNum, totalStages, message);
    }

    // Helper: call Gemini via OpenAI-compatible endpoint + extractJson
    // Native structured output (responseJsonSchema) proved unreliable —
    // Gemini regularly returns malformed JSON despite schema constraints.
    // The OpenAI-compatible path + extractJson repair pipeline is robust.
    var geminiOpenAIBase = 'https://generativelanguage.googleapis.com/v1beta/openai';
    async function callStage(prompt, _schema, maxTokens, stageName) {
      try {
        var raw = await callOpenAICompat(apiKey, geminiOpenAIBase, model, prompt, maxTokens, timeoutMs);
        return extractJson(raw);
      } catch (err) {
        throw new Error('[' + stageName + '] ' + err.message);
      }
    }

    // Stage 1 — World + Campaign (2 internal API calls, 1 progress step)
    progress('Building world + campaign\u2026');
    var layerBible = await callStage(
      window.generateStage1Prompt(workoutText, brief, dice),
      STRUCTURED_SCHEMA_BIBLE, 16384, 'Layer Bible'
    );

    if (!layerBible.storyLayer || !layerBible.gameLayer || !layerBible.governingLayer) {
      throw new Error(
        'Stage 1 failed: layer bible missing required sections (storyLayer, gameLayer, governingLayer).\n' +
        'The model may not have followed the output schema. Try again.'
      );
    }

    var campaignPlan = await callStage(
      window.generateStage2Prompt(workoutText, brief, dice, layerBible),
      STRUCTURED_SCHEMA_CAMPAIGN, 16384, 'Campaign Plan'
    );

    if (!campaignPlan.weeks || !Array.isArray(campaignPlan.weeks) || !campaignPlan.bossPlan) {
      throw new Error(
        'Stage 2 failed: campaign plan missing required sections (weeks[], bossPlan).\n' +
        'The model may not have followed the output schema. Try again.'
      );
    }

    if (!campaignPlan.fragmentRegistry || !Array.isArray(campaignPlan.fragmentRegistry)) {
      console.warn('[LiftRPG] Stage 2 missing fragmentRegistry \u2014 fragments will have no pre-assigned IDs');
      campaignPlan.fragmentRegistry = [];
    }
    if (!campaignPlan.overflowRegistry || !Array.isArray(campaignPlan.overflowRegistry)) {
      console.warn('[LiftRPG] Stage 2 missing overflowRegistry \u2014 overflow docs will be unplanned');
      campaignPlan.overflowRegistry = [];
    }

    // Recalculate totalStages now that we know fragment batch count
    var plannedFragBatches = buildFragmentBatches(campaignPlan.fragmentRegistry, null);
    var fragBatchCount = Math.max(plannedFragBatches.length, 1);
    totalStages = 3 + fragBatchCount + 1; // world+campaign(1) + shell(1) + weeks(1) + fragBatches(B) + endings(1)

    // Stage 2 — Booklet Shell
    progress('Building booklet shell\u2026');
    var shell = await callStage(
      window.generateShellPrompt(brief, layerBible, campaignPlan),
      STRUCTURED_SCHEMA_SHELL, 16384, 'Booklet Shell'
    );

    if (!shell.meta || !shell.cover || !shell.rulesSpread) {
      throw new Error(
        'Stage 3 failed: booklet shell missing required keys (meta, cover, rulesSpread).\n' +
        'The model may not have followed the output schema. Try again.'
      );
    }

    // Extract narrative constraints for downstream stages
    var shellContext = extractShellContext(shell);

    // Stage 3 — Weeks (N internal API calls, 1 progress step)
    progress('Generating weeks\u2026');
    var weekChunkOutputs = [];
    var allComponentValues = [];
    var allPriorWeeks = [];

    for (var ci = 0; ci < chunks.length; ci++) {
      var weekNums = chunks[ci];
      var chunkLabel = weekNums.length === 1
        ? 'Week ' + weekNums[0]
        : 'Weeks ' + weekNums.join(',');

      var continuity = buildChunkContinuity(allPriorWeeks);
      var chunkOutput = await callStage(
        window.generateWeekChunkPrompt(workoutText, brief, layerBible, campaignPlan, weekNums, continuity, allComponentValues, shellContext),
        STRUCTURED_SCHEMA_WEEKS, 32000, chunkLabel
      );
      weekChunkOutputs.push(chunkOutput);

      // Accumulate all prior weeks for continuity + component values for boss
      (chunkOutput.weeks || []).forEach(function (w) {
        allPriorWeeks.push(w);
        if (w.weeklyComponent && w.weeklyComponent.value !== undefined && w.weeklyComponent.value !== null) {
          allComponentValues.push(w.weeklyComponent.value);
        }
      });
    }

    // Stage 4 — Fragments (batched by week association)
    var weekSummaries = extractWeekSummaries(weekChunkOutputs);
    var fragBatches = buildFragmentBatches(campaignPlan.fragmentRegistry, weekSummaries);
    var fragmentsOutput;

    if (fragBatches.length <= 1) {
      // Small registry or no weekRef data — single call (monolithic fallback)
      progress('Generating fragments\u2026');
      fragmentsOutput = await callStage(
        window.generateFragmentsPrompt(layerBible, campaignPlan, weekSummaries, shellContext),
        STRUCTURED_SCHEMA_FRAGMENTS, 32000, 'Fragments'
      );
    } else {
      // Batched generation
      var batchOutputs = [];
      var priorFragments = [];

      for (var fi = 0; fi < fragBatches.length; fi++) {
        var batch = fragBatches[fi];
        var batchLabel = 'Fragments ' + (fi + 1) + '/' + fragBatches.length +
          ' (weeks ' + batch.weekNumbers.join(',') + ')';
        progress('Generating ' + batchLabel.toLowerCase() + '\u2026');

        var batchOutput = await callStage(
          window.generateFragmentBatchPrompt(
            layerBible,
            batch.registry,
            batch.weekSummaries,
            weekSummaries,
            priorFragments,
            fi,
            fragBatches.length,
            shellContext
          ),
          STRUCTURED_SCHEMA_FRAGMENTS, 32000, batchLabel
        );
        batchOutputs.push(batchOutput);

        // Accumulate for continuity into next batch
        (batchOutput.fragments || []).forEach(function (f) {
          priorFragments.push(f);
        });
      }

      // Merge + validate
      var mergeResult = mergeFragmentBatches(batchOutputs, campaignPlan.fragmentRegistry);
      if (mergeResult.errors.length > 0) {
        console.warn('[LiftRPG] Fragment batch merge issues:', mergeResult.errors);
      }
      fragmentsOutput = { fragments: mergeResult.fragments };
    }

    // Stage 5 — Endings
    progress('Generating endings\u2026');
    var lastChunkWeeks = weekChunkOutputs[weekChunkOutputs.length - 1].weeks || [];
    var bossWeek = lastChunkWeeks[lastChunkWeeks.length - 1] || {};
    var binaryChoiceWeek = findBinaryChoiceWeek(weekChunkOutputs);
    var endingsOutput = await callStage(
      window.generateEndingsPrompt(layerBible, campaignPlan, bossWeek, binaryChoiceWeek, shellContext, weekSummaries),
      STRUCTURED_SCHEMA_ENDINGS, 8192, 'Endings'
    );

    // Assemble with exercise override
    console.log('[LiftRPG] Assembling structured booklet from', weekChunkOutputs.length, 'week chunks,',
      ((fragmentsOutput || {}).fragments || []).length, 'fragments,',
      ((endingsOutput || {}).endings || []).length, 'endings');
    var booklet = assembleStructuredBooklet(shell, weekChunkOutputs, fragmentsOutput, endingsOutput, nw, campaignPlan);

    // Validate — log warnings but no LLM patch step
    // (structured output should prevent malformed JSON; semantic errors are reported)
    var errors = validateAssembledBooklet(booklet);
    if (errors.warnings && errors.warnings.length > 0) {
      console.warn('[LiftRPG] Validation warnings:', errors.warnings);
    }
    if (errors.length > 0) {
      console.warn('[LiftRPG] Assembled structured booklet has', errors.length, 'validation errors:', errors);
    }

    // Auto-populate quality report for console inspection
    generateQualityReport(booklet);

    return booklet;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * generate(settings, workout, brief, dice) → Promise<Object>
   *
   * Single-pass generation (Standard mode).
   *
   * settings: {
   *   format:  'anthropic' | 'openai'
   *   apiKey:  string
   *   baseUrl: string       (openai format only)
   *   model:   string
   *   requestTimeoutMs: number (optional, default 300000)
   * }
   */
  async function generate(settings, workout, brief, dice) {
    if (typeof window.beginLiftRpgPromptRun === 'function') window.beginLiftRpgPromptRun();
    if (typeof window.generatePrompt !== 'function') {
      throw new Error('Prompt generator not loaded. Please reload the page.');
    }

    var prompt = window.generatePrompt(workout, brief, dice);
    var raw = await callProvider(settings, prompt);
    return extractJson(raw);
  }

  // ── Quality Report ────────────────────────────────────────────────────────
  //
  // Deterministic post-generation analysis. Returns a structured report
  // object with scores, warnings, and weak-spot flags. Does NOT modify the
  // booklet. Stored on window.LiftRPGAPI.lastQualityReport after each call.

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

  // ── Golden Comparator ──────────────────────────────────────────────────────
  //
  // Compare an assembled booklet against a target artifact and report
  // structural, continuity, and quality differences.

  function compareToTarget(booklet, target) {
    var diffs = {
      timestamp: new Date().toISOString(),
      missingFields: [],
      looserStructures: [],
      continuityMismatches: [],
      genericityRisks: [],
      crossRefWeaknesses: []
    };

    if (!booklet || !target) {
      diffs.missingFields.push('booklet or target is null/undefined');
      return diffs;
    }

    // ── Missing fields: walk target top-level and per-week ─────────────────
    var TOP_KEYS = ['meta', 'theme', 'cover', 'rulesSpread', 'weeks', 'fragments', 'endings'];
    TOP_KEYS.forEach(function (key) {
      if (target[key] !== undefined && booklet[key] === undefined) {
        diffs.missingFields.push('Missing top-level: ' + key);
      }
    });

    // Compare meta keys
    if (target.meta && booklet.meta) {
      Object.keys(target.meta).forEach(function (mk) {
        if (booklet.meta[mk] === undefined) {
          diffs.missingFields.push('Missing meta.' + mk);
        }
      });
    }

    // Compare theme keys
    if (target.theme && booklet.theme) {
      Object.keys(target.theme).forEach(function (tk) {
        if (booklet.theme[tk] === undefined) {
          diffs.missingFields.push('Missing theme.' + tk);
        }
      });
    }

    // ── Per-week structural comparison ─────────────────────────────────────
    var tWeeks = target.weeks || [];
    var bWeeks = booklet.weeks || [];
    var minWeeks = Math.min(tWeeks.length, bWeeks.length);

    for (var wi = 0; wi < minWeeks; wi++) {
      var tw = tWeeks[wi];
      var bw = bWeeks[wi];
      var wn = 'Week ' + (wi + 1);

      // fieldOps sub-keys
      var tfo = tw.fieldOps || {};
      var bfo = bw.fieldOps || {};
      ['mapState', 'cipher'].forEach(function (fk) {
        if (tfo[fk] && !bfo[fk]) {
          diffs.missingFields.push(wn + ' fieldOps.' + fk + ' missing');
        }
      });
      // Oracle uses either key — check both
      if ((tfo.oracleTable || tfo.oracle) && !(bfo.oracleTable || bfo.oracle)) {
        diffs.missingFields.push(wn + ' fieldOps oracle missing');
      }

      // Session count comparison
      var tSessions = (tw.sessions || []).length;
      var bSessions = (bw.sessions || []).length;
      if (bSessions < tSessions) {
        diffs.looserStructures.push(wn + ': ' + bSessions + ' sessions vs target ' + tSessions);
      }

      // Oracle entry count
      var tOracle = (tfo.oracleTable || tfo.oracle || {}).entries || [];
      var bOracle = (bfo.oracleTable || bfo.oracle || {}).entries || [];
      if (bOracle.length < tOracle.length) {
        diffs.looserStructures.push(wn + ': ' + bOracle.length + ' oracle entries vs target ' + tOracle.length);
      }

      // Map tile count
      var tTiles = ((tfo.mapState || {}).tiles || []).length;
      var bTiles = ((bfo.mapState || {}).tiles || []).length;
      if (bTiles < tTiles && tTiles > 0) {
        diffs.looserStructures.push(wn + ': ' + bTiles + ' map tiles vs target ' + tTiles);
      }

      // Cipher fields present in target but missing in booklet
      var tCipher = tfo.cipher || {};
      var bCipher = bfo.cipher || {};
      ['type', 'body', 'extractionInstruction', 'characterDerivationProof', 'noticeabilityDesign'].forEach(function (cf) {
        if (tCipher[cf] !== undefined && (bCipher[cf] === undefined || bCipher[cf] === null || bCipher[cf] === '')) {
          diffs.missingFields.push(wn + ' cipher.' + cf);
        }
      });

      // Overflow document comparison
      if (tw.overflowDocument && !bw.overflowDocument) {
        diffs.missingFields.push(wn + ' overflowDocument missing (target has one)');
      }
    }

    if (bWeeks.length < tWeeks.length) {
      diffs.looserStructures.push('Fewer weeks: ' + bWeeks.length + ' vs target ' + tWeeks.length);
    }

    // ── Fragment comparison ────────────────────────────────────────────────
    var tFrags = target.fragments || [];
    var bFrags = booklet.fragments || [];
    if (bFrags.length < tFrags.length) {
      diffs.looserStructures.push('Fewer fragments: ' + bFrags.length + ' vs target ' + tFrags.length);
    }

    // Fragment field depth — richness comparison, not schema validation.
    // Target-only optional fields are genericityRisks (thinner output), not missingFields.
    var targetFragKeys = {};
    tFrags.forEach(function (f) {
      Object.keys(f).forEach(function (k) { targetFragKeys[k] = true; });
    });
    var bookletFragKeys = {};
    bFrags.forEach(function (f) {
      Object.keys(f).forEach(function (k) { bookletFragKeys[k] = true; });
    });
    Object.keys(targetFragKeys).forEach(function (k) {
      if (!bookletFragKeys[k]) {
        diffs.genericityRisks.push('Fragment field "' + k + '" present in target but absent in booklet');
      }
    });

    // ── Continuity mismatches ──────────────────────────────────────────────

    // Cipher type diversity comparison
    var tCipherTypes = {};
    var bCipherTypes = {};
    (target.weeks || []).forEach(function (w) {
      if (!w.isBossWeek) {
        var t = ((w.fieldOps || {}).cipher || {}).type;
        if (t) tCipherTypes[t] = true;
      }
    });
    (booklet.weeks || []).forEach(function (w) {
      if (!w.isBossWeek) {
        var t = ((w.fieldOps || {}).cipher || {}).type;
        if (t) bCipherTypes[t] = true;
      }
    });
    var tCipherCount = Object.keys(tCipherTypes).length;
    var bCipherCount = Object.keys(bCipherTypes).length;
    if (bCipherCount < tCipherCount) {
      diffs.continuityMismatches.push('Cipher diversity: ' + bCipherCount + ' types vs target ' + tCipherCount);
    }

    // Document type diversity comparison
    var tDocTypes = {};
    var bDocTypes = {};
    tFrags.forEach(function (f) { if (f.documentType) tDocTypes[f.documentType] = true; });
    bFrags.forEach(function (f) { if (f.documentType) bDocTypes[f.documentType] = true; });
    var tDocCount = Object.keys(tDocTypes).length;
    var bDocCount = Object.keys(bDocTypes).length;
    if (bDocCount < tDocCount) {
      diffs.continuityMismatches.push('Document type diversity: ' + bDocCount + ' types vs target ' + tDocCount);
    }

    // ── Genericity risks ───────────────────────────────────────────────────

    // Fragment content length comparison (thinner = riskier)
    var tAvgLen = 0;
    var bAvgLen = 0;
    tFrags.forEach(function (f) {
      var c = f.content;
      if (typeof c === 'object' && c) c = c.body || c.html || '';
      tAvgLen += (c || '').length;
    });
    bFrags.forEach(function (f) {
      var c = f.content;
      if (typeof c === 'object' && c) c = c.body || c.html || '';
      bAvgLen += (c || '').length;
    });
    tAvgLen = tFrags.length ? Math.round(tAvgLen / tFrags.length) : 0;
    bAvgLen = bFrags.length ? Math.round(bAvgLen / bFrags.length) : 0;
    if (bAvgLen < tAvgLen * 0.6 && tAvgLen > 0) {
      diffs.genericityRisks.push('Fragment avg content length ' + bAvgLen + ' chars vs target ' + tAvgLen + ' — likely thinner');
    }

    // Ending count comparison
    var tEndings = (target.endings || []).length;
    var bEndings = (booklet.endings || []).length;
    if (bEndings < tEndings) {
      diffs.genericityRisks.push('Fewer endings: ' + bEndings + ' vs target ' + tEndings);
    }

    // Check for authenticityChecks presence (target has it, booklet might not)
    var targetHasAuthChecks = tFrags.some(function (f) { return f.authenticityChecks; });
    var bookletHasAuthChecks = bFrags.some(function (f) { return f.authenticityChecks; });
    if (targetHasAuthChecks && !bookletHasAuthChecks) {
      diffs.genericityRisks.push('Target fragments have authenticityChecks — booklet fragments lack them');
    }

    // ── Cross-reference weaknesses ─────────────────────────────────────────
    var bFragRefCount = 0;
    (booklet.weeks || []).forEach(function (w) {
      (w.sessions || []).forEach(function (s) { if (s.fragmentRef) bFragRefCount++; });
      var o = ((w.fieldOps || {}).oracleTable || (w.fieldOps || {}).oracle || {}).entries || [];
      o.forEach(function (e) { if (e.fragmentRef) bFragRefCount++; });
    });
    var tFragRefCount = 0;
    (target.weeks || []).forEach(function (w) {
      (w.sessions || []).forEach(function (s) { if (s.fragmentRef) tFragRefCount++; });
      var o = ((w.fieldOps || {}).oracleTable || (w.fieldOps || {}).oracle || {}).entries || [];
      o.forEach(function (e) { if (e.fragmentRef) tFragRefCount++; });
    });
    if (bFragRefCount < tFragRefCount) {
      diffs.crossRefWeaknesses.push('Fewer fragment cross-references: ' + bFragRefCount + ' vs target ' + tFragRefCount);
    }

    // Characters as fragment authors
    var bAuthors = {};
    bFrags.forEach(function (f) { if (f.inWorldAuthor) bAuthors[f.inWorldAuthor] = true; });
    var tAuthors = {};
    tFrags.forEach(function (f) { if (f.inWorldAuthor) tAuthors[f.inWorldAuthor] = true; });
    if (Object.keys(bAuthors).length < Object.keys(tAuthors).length) {
      diffs.crossRefWeaknesses.push('Fewer distinct fragment authors: ' + Object.keys(bAuthors).length + ' vs target ' + Object.keys(tAuthors).length);
    }

    // Summary counts
    diffs.totalIssues = diffs.missingFields.length + diffs.looserStructures.length +
      diffs.continuityMismatches.length + diffs.genericityRisks.length +
      diffs.crossRefWeaknesses.length;

    return diffs;
  }

  return {
    PROVIDERS: PROVIDERS,
    generate: generate,
    generateMultiStage: generateMultiStage,
    generateStructured: generateStructured,
    manual: {
      ensureArtifactIdentity: ensureArtifactIdentity,
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
    qualityReport: generateQualityReport,
    compareToTarget: compareToTarget,
    lastQualityReport: null
  };
})();
