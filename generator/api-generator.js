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

  async function callAnthropic(apiKey, model, prompt) {
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
        max_tokens: 32000,
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

    window.LiftRPGAPI && (window.LiftRPGAPI.lastRaw = body.content[0].text);
    return body.content[0].text;
  }

  async function callOpenAICompat(apiKey, baseUrl, model, prompt) {
    var url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
    var headers = { 'content-type': 'application/json' };
    if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;

    var resp = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
        max_tokens: 32768,
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

    window.LiftRPGAPI && (window.LiftRPGAPI.lastRaw = body.choices[0].message.content);
    return body.choices[0].message.content;
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
  var AFTER_STRING = { ',':1, '}':1, ']':1, ':':1 };

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

  // ── public repair entry point ────────────────────────────────────────────────

  function repairJson(text) {
    return fixStructural(walkAndRepair(text));
  }

  // ── JSON extraction ──────────────────────────────────────────────────────────

  function extractJson(text) {
    // 1. Strip markdown code fences
    var stripped = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

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

  return { PROVIDERS: PROVIDERS, generate: generate, _extractJson: extractJson };
})();
