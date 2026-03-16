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

  // ── Request handlers ────────────────────────────────────────────────────────

  async function callAnthropic(apiKey, model, prompt, maxTokens) {
    var resp = await fetch('https://api.anthropic.com/v1/messages', {
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
    });

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
      model:       body.model,
      usage:       body.usage
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

  async function callOpenAICompat(apiKey, baseUrl, model, prompt, maxTokens) {
    var url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
    var headers = { 'content-type': 'application/json' };
    if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;

    var resp = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens || 32768,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    var body = await resp.json();

    if (!resp.ok) {
      var errMsg = (body.error && body.error.message) || ('HTTP ' + resp.status);
      throw new Error('API error: ' + errMsg);
    }

    if (!body.choices || !body.choices[0] || !body.choices[0].message) {
      throw new Error('Unexpected API response shape. Check the console.');
    }

    var rawText = body.choices[0].message.content;
    window.LiftRPGAPI && (window.LiftRPGAPI.lastRaw = rawText);
    window.LiftRPGAPI && (window.LiftRPGAPI.lastMeta = {
      finish_reason: body.choices[0].finish_reason,
      model:         body.model,
      usage:         body.usage
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
  //
  // Strategy:
  //  - findJsonBounds: depth-counting walk to find the exact root {…} block,
  //    not fragile indexOf/lastIndexOf which can grab trailing text.
  //  - walkAndRepair: single character pass fixing issues 1–3. For unescaped
  //    quotes, heuristic: if the char after " (ignoring whitespace) is NOT a
  //    JSON structural char (,:}]) then we're inside a string, escape it.
  //  - fixStructural: regex pass for issues 4–5.
  //  - extractJson runs direct parse first (fast path), then repair, so clean
  //    JSON pays no cost.

  // ── bounds ──────────────────────────────────────────────────────────────────

  function findJsonBounds(text) {
    var depth = 0, inStr = false, esc = false, start = -1;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (esc)             { esc = false; continue; }
      if (c === '\\' && inStr) { esc = true; continue; }
      if (c === '"')       { inStr = !inStr; continue; }
      if (inStr)           continue;
      if (c === '{') { if (depth++ === 0) start = i; }
      else if (c === '}') { if (--depth === 0 && start !== -1) return [start, i]; }
    }
    // Fallback: first { to last } (handles unterminated JSON)
    var a = text.indexOf('{'), b = text.lastIndexOf('}');
    return (a !== -1 && b > a) ? [a, b] : null;
  }

  // ── character walk ───────────────────────────────────────────────────────────

  var VALID_ESC    = { '"':1, '\\':1, '/':1, b:1, f:1, n:1, r:1, t:1, u:1 };
  // After a string closes, valid JSON structural separators follow
  var AFTER_STRING = { ',':1, '}':1, ']':1, ':':1, '/':1 };  // / starts a comment

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
          while (i < text.length - 1 && !(text[i] === '*' && text[i+1] === '/')) i++;
          i++;  // skip closing '/'
          continue;
        }
      }

      // Backslash inside string: validate or double-escape
      if (c === '\\' && inStr) {
        var nx = text[i + 1] || '';
        if (VALID_ESC[nx]) { out.push(c); esc = true; }
        else               { out.push('\\\\'); }  // stray backslash
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
        if      (c === '\n') { out.push('\\n');  continue; }
        else if (c === '\r') { out.push('\\r');  continue; }
        else if (c === '\t') { out.push('\\t');  continue; }
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
    text = text.replace(/([}\]])(\s+)([{[\"])/g, function(_, close, ws, open) {
      return close + ',' + ws + open;
    });

    return text;
  }

  // ── Python / JS literal normalisation ───────────────────────────────────────
  // Some models (especially smaller/fine-tuned) emit Python or JS literals.
  // Word-boundary replacement: may fire inside string values, but these tokens
  // (True, None, NaN, Infinity) are vanishingly rare in narrative prose.

  function fixLiterals(text) {
    return text
      .replace(/\bTrue\b/g,     'true')
      .replace(/\bFalse\b/g,    'false')
      .replace(/\bNone\b/g,     'null')
      .replace(/\bNaN\b/g,      'null')
      .replace(/\bInfinity\b/g, 'null')
      .replace(/\bundefined\b/g,'null');
  }

  // ── public repair entry point ────────────────────────────────────────────────

  function repairJson(text) {
    return fixStructural(walkAndRepair(fixLiterals(text)));
  }

  // ── JSON extraction ──────────────────────────────────────────────────────────

  function extractJson(text) {
    // 1. Strip markdown code fences
    var stripped = text
      .replace(/^\uFEFF/, '')           // strip BOM
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    // 1.5: Doubled JSON — model serialised the JSON twice
    if (stripped.charAt(0) === '"' && stripped.charAt(stripped.length - 1) === '"') {
      try {
        var maybeInner = JSON.parse(stripped);
        if (typeof maybeInner === 'string' && maybeInner.trim().charAt(0) === '{') {
          try { return JSON.parse(maybeInner); } catch (e) { /* fall through */ }
        }
      } catch (e) { /* not a valid JSON string, continue */ }
    }

    // 2. Locate root {…} with depth counting (not fragile lastIndexOf)
    var bounds = findJsonBounds(stripped);
    if (!bounds) {
      throw new Error(
        'No JSON object found in the response. Try again, or use Chat mode.\n\n' +
        'Response preview: ' + text.slice(0, 300)
      );
    }
    var jsonStr = stripped.slice(bounds[0], bounds[1] + 1);

    // 3. Fast path: direct parse
    try {
      return JSON.parse(jsonStr);
    } catch (e1) {
      console.warn('[LiftRPG] Direct parse failed (' + e1.message + ') — attempting repair');
      console.log('[LiftRPG] Raw JSON (first 500):', jsonStr.slice(0, 500));
    }

    // 4. Repair path
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
        || msgL.indexOf("expected '}'" ) !== -1;
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
    if (settings.format === 'anthropic') {
      return callAnthropic(settings.apiKey, settings.model, prompt, maxTokens);
    }
    return callOpenAICompat(settings.apiKey, settings.baseUrl, settings.model, prompt, maxTokens);
  }

  // ── Booklet schema postchecks ─────────────────────────────────────────────
  // Returns array of human-readable error strings.

  var VALID_PAYLOAD_TYPES = {
    none:1, narrative:1, cipher:1, map:1, clock:1,
    companion:1, 'fragment-ref':1, 'password-element':1
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
      '# Schema Patch',
      '',
      'The LiftRPG booklet JSON below has validation errors.',
      'Return the corrected JSON only. Fix only the listed errors.',
      'Do not rewrite or restructure anything else.',
      '',
      '## Errors',
      errors.map(function (e) { return '- ' + e; }).join('\n'),
      '',
      '## JSON to Patch',
      '',
      rawJson
    ].join('\n');
  }

  // ── Multi-stage generator ─────────────────────────────────────────────────

  async function generateMultiStage(settings, workout, brief, dice, onProgress) {
    if (typeof window.generateStage1Prompt !== 'function' ||
        typeof window.generateStage2Prompt !== 'function' ||
        typeof window.generateStage3Prompt !== 'function') {
      throw new Error('Multi-stage generators not loaded. Please reload the page.');
    }

    onProgress('stage1', 'Building layer bible\u2026');
    var raw1 = await callProvider(settings, window.generateStage1Prompt(workout, brief, dice), 4096);
    var layerBible = extractJson(raw1);

    if (!layerBible.storyLayer || !layerBible.gameLayer || !layerBible.governingLayer) {
      throw new Error(
        'Stage 1 failed: layer bible is missing required sections (storyLayer, gameLayer, governingLayer).\n' +
        'The model may not have followed the output schema. Try again.'
      );
    }

    onProgress('stage2', 'Planning your campaign\u2026');
    var raw2 = await callProvider(settings, window.generateStage2Prompt(workout, brief, dice, layerBible), 8192);
    var campaignPlan = extractJson(raw2);

    if (!campaignPlan.weeks || !Array.isArray(campaignPlan.weeks) || !campaignPlan.bossPlan) {
      throw new Error(
        'Stage 2 failed: campaign plan is missing required sections (weeks[], bossPlan).\n' +
        'The model may not have followed the output schema. Try again.'
      );
    }

    onProgress('stage3', 'Compiling booklet\u2026');
    var raw3 = await callProvider(settings, window.generateStage3Prompt(workout, brief, dice, layerBible, campaignPlan));
    var booklet = extractJson(raw3);

    onProgress('validating', 'Validating schema\u2026');
    var errors = validateBookletSchema(booklet);
    if (errors.length > 0) {
      console.warn('[LiftRPG] Schema errors, requesting patch:', errors);
      var label = errors.length === 1 ? '1 error' : errors.length + ' errors';
      onProgress('patching', 'Patching ' + label + '\u2026');
      var rawPatched = await callProvider(settings, generatePatchPrompt(JSON.stringify(booklet, null, 2), errors));
      booklet = extractJson(rawPatched);
      var remaining = validateBookletSchema(booklet);
      if (remaining.length > 0) {
        console.warn('[LiftRPG] Patch did not fully resolve errors:', remaining);
      }
    }

    return booklet;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * generate(settings, workout, brief, dice) → Promise<Object>
   *
   * settings: {
   *   format:  'anthropic' | 'openai'
   *   apiKey:  string
   *   baseUrl: string       (openai format only)
   *   model:   string
   * }
   */
  async function generate(settings, workout, brief, dice) {
    if (typeof window.generatePrompt !== 'function') {
      throw new Error('Prompt generator not loaded. Please reload the page.');
    }

    var prompt = window.generatePrompt(workout, brief, dice);
    var raw;

    if (settings.format === 'anthropic') {
      raw = await callAnthropic(settings.apiKey, settings.model, prompt);
    } else {
      raw = await callOpenAICompat(settings.apiKey, settings.baseUrl, settings.model, prompt);
    }

    return extractJson(raw);
  }

  return { PROVIDERS: PROVIDERS, generate: generate, generateMultiStage: generateMultiStage, _extractJson: extractJson, _validateSchema: validateBookletSchema };
})();
