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

  // ── Booklet assembler ────────────────────────────────────────────────────
  // Merges partial JSON chunks from the 10-stage pipeline into a complete booklet.

  function assembleBooklet(shell, weekChunkOutputs, fragmentsOutput, endingsOutput) {
    var booklet = {
      meta:       shell.meta       || {},
      cover:      shell.cover      || {},
      rulesSpread:shell.rulesSpread|| {},
      theme:      shell.theme      || {},
      weeks:      [],
      fragments:  (fragmentsOutput || {}).fragments || [],
      endings:    (endingsOutput   || {}).endings   || []
    };

    // Concatenate weeks from all chunks in order
    weekChunkOutputs.forEach(function (chunk) {
      booklet.weeks = booklet.weeks.concat(chunk.weeks || []);
    });

    // Ensure meta.weekCount matches
    booklet.meta.weekCount = booklet.weeks.length;

    // Sum total sessions
    booklet.meta.totalSessions = booklet.weeks.reduce(function (sum, w) {
      return sum + (w.sessions ? w.sessions.length : 0);
    }, 0);

    return booklet;
  }

  // ── Week summary extractor ──────────────────────────────────────────────
  // Compact context from generated weeks for the fragments stage.

  function extractWeekSummaries(weekChunkOutputs) {
    var summaries = [];
    weekChunkOutputs.forEach(function (chunk) {
      (chunk.weeks || []).forEach(function (w) {
        var entry = {
          weekNumber: w.weekNumber,
          title: w.title,
          storyPrompts: (w.sessions || []).map(function (s) { return s.storyPrompt || ''; }).filter(Boolean),
          fragmentRefs: (w.sessions || []).map(function (s) { return s.fragmentRef || ''; }).filter(Boolean),
          binaryChoice: null,
          overflowDocument: w.overflowDocument
            ? { id: w.overflowDocument.id, title: w.overflowDocument.title || '' }
            : null
        };
        (w.sessions || []).forEach(function (s) {
          if (s.binaryChoice) entry.binaryChoice = s.binaryChoice;
        });
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

  // ── Expanded booklet validation ─────────────────────────────────────────
  // Validates the assembled booklet. Returns array of human-readable errors.

  function validateAssembledBooklet(booklet) {
    var errors = [];

    // Top-level key checks
    ['meta', 'cover', 'rulesSpread', 'weeks', 'fragments', 'endings'].forEach(function (key) {
      if (!booklet[key]) errors.push('Missing top-level key: ' + key);
    });

    var weeks = booklet.weeks || [];
    var fragments = booklet.fragments || [];

    // Week count consistency
    if (booklet.meta && booklet.meta.weekCount !== weeks.length) {
      errors.push('meta.weekCount (' + booklet.meta.weekCount + ') does not match weeks.length (' + weeks.length + ')');
    }

    // Boss week checks
    var bossWeeks = weeks.filter(function (w) { return w.isBossWeek; });
    if (bossWeeks.length === 0) {
      errors.push('No boss week found (isBossWeek: true)');
    } else if (bossWeeks.length > 1) {
      errors.push('Multiple boss weeks found — must be exactly one');
    }
    if (weeks.length > 0 && !weeks[weeks.length - 1].isBossWeek) {
      errors.push('Boss week must be the final week in the array');
    }

    // Fragment ID cross-reference
    var fragmentIds = {};
    fragments.forEach(function (f) { if (f.id) fragmentIds[f.id] = true; });

    weeks.forEach(function (week, wi) {
      var wn = 'Week ' + (wi + 1);
      var fo = week.fieldOps || {};

      // Session fragmentRef checks
      (week.sessions || []).forEach(function (s, si) {
        if (s.fragmentRef && !fragmentIds[s.fragmentRef]) {
          errors.push(wn + ' session ' + (si + 1) + ': fragmentRef "' + s.fragmentRef + '" not found in fragments[]');
        }
      });

      // Oracle checks (existing + fragmentRef cross-ref)
      var oracle = fo.oracleTable || fo.oracle || {};
      var entries = oracle.entries || [];
      entries.forEach(function (entry, ei) {
        if (Object.prototype.hasOwnProperty.call(entry, 'description')) {
          errors.push(wn + ' oracle[' + ei + ']: uses "description" — must be "text"');
        }
        if (entry.type === 'fragment' && !entry.fragmentRef) {
          errors.push(wn + ' oracle[' + ei + ']: type "fragment" missing fragmentRef');
        }
        if (entry.fragmentRef && !fragmentIds[entry.fragmentRef]) {
          errors.push(wn + ' oracle[' + ei + ']: fragmentRef "' + entry.fragmentRef + '" not found in fragments[]');
        }
      });
      var mode = oracle.mode || (entries.length === 11 ? 'simple' : null);
      if (mode === 'simple' && entries.length !== 11) {
        errors.push(wn + ' simple oracle: has ' + entries.length + ' entries, needs 11 (rolls "2"\u2013"12")');
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

      // weeklyComponent.value on non-boss weeks
      if (!week.isBossWeek) {
        var wc = week.weeklyComponent || {};
        if (wc.value === undefined || wc.value === null || wc.value === '') {
          errors.push(wn + ': weeklyComponent.value is missing or empty');
        }
      }
    });

    // Boss componentInputs length
    if (bossWeeks.length === 1) {
      var boss = bossWeeks[0].bossEncounter || {};
      var inputs = boss.componentInputs || [];
      var nonBossCount = weeks.filter(function (w) { return !w.isBossWeek; }).length;
      if (inputs.length > 0 && inputs.length !== nonBossCount) {
        errors.push('Boss componentInputs has ' + inputs.length + ' values but there are ' + nonBossCount + ' non-boss weeks');
      }
    }

    return errors;
  }

  // ── 10-Stage Multi-Stage Generator ──────────────────────────────────────
  //
  // Pipeline: Layer Bible → Campaign Plan → Shell → Week Chunks → Fragments → Endings → Validate → Patch
  //
  // onProgress(stageIndex, totalStages, message) — UI callback

  async function generateMultiStage(settings, workout, brief, dice, onProgress) {
    // Check required generators
    if (typeof window.generateStage1Prompt !== 'function' ||
        typeof window.generateStage2Prompt !== 'function' ||
        typeof window.generateShellPrompt  !== 'function' ||
        typeof window.generateWeekChunkPrompt !== 'function' ||
        typeof window.generateFragmentsPrompt !== 'function' ||
        typeof window.generateEndingsPrompt   !== 'function') {
      throw new Error('Pipeline generators not loaded. Please reload the page.');
    }

    // 0. Plan the pipeline
    var weekCount = window.parseWeekCount(workout);
    var chunks = window.planWeekChunks(weekCount);
    var totalStages = 3 + chunks.length + 2; // planning(2) + shell(1) + weeks(N) + fragments(1) + endings(1)
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

    // 3. Booklet Shell
    progress('Building booklet shell\u2026');
    var raw3 = await callStage(window.generateShellPrompt(brief, layerBible, campaignPlan), 16384, 'Booklet Shell');
    var shell = extractJson(raw3);

    if (!shell.meta || !shell.cover || !shell.rulesSpread) {
      throw new Error(
        'Stage 3 failed: booklet shell missing required keys (meta, cover, rulesSpread).\n' +
        'The model may not have followed the output schema. Try again.'
      );
    }

    // 4..N-3. Week Chunks
    var weekChunkOutputs = [];
    var allComponentValues = [];
    var previousChunkWeeks = null;

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
      var rawChunk = await callStage(
        window.generateWeekChunkPrompt(workout, brief, layerBible, campaignPlan, weekNums, previousChunkWeeks, allComponentValues),
        32000,
        chunkLabel
      );
      var chunkOutput = extractJson(rawChunk);
      weekChunkOutputs.push(chunkOutput);
      previousChunkWeeks = chunkOutput.weeks || [];

      // Accumulate component values for boss decode
      (chunkOutput.weeks || []).forEach(function (w) {
        if (w.weeklyComponent && w.weeklyComponent.value !== undefined && w.weeklyComponent.value !== null) {
          allComponentValues.push(w.weeklyComponent.value);
        }
      });
    }

    // N-2. Fragments
    progress('Generating fragments\u2026');
    var weekSummaries = extractWeekSummaries(weekChunkOutputs);
    var rawFrags = await callStage(
      window.generateFragmentsPrompt(layerBible, campaignPlan, weekSummaries),
      32000,
      'Fragments'
    );
    var fragmentsOutput = extractJson(rawFrags);

    // N-1. Endings
    progress('Generating endings\u2026');
    var lastChunkWeeks = weekChunkOutputs[weekChunkOutputs.length - 1].weeks || [];
    var bossWeek = lastChunkWeeks[lastChunkWeeks.length - 1] || {};
    var binaryChoiceWeek = findBinaryChoiceWeek(weekChunkOutputs);
    var rawEndings = await callStage(
      window.generateEndingsPrompt(layerBible, campaignPlan, bossWeek, binaryChoiceWeek),
      8192,
      'Endings'
    );
    var endingsOutput = extractJson(rawEndings);

    // Assemble
    console.log('[LiftRPG] Assembling booklet from', weekChunkOutputs.length, 'week chunks,',
      ((fragmentsOutput || {}).fragments || []).length, 'fragments,',
      ((endingsOutput || {}).endings || []).length, 'endings');
    var booklet = assembleBooklet(shell, weekChunkOutputs, fragmentsOutput, endingsOutput);

    // Validate
    var errors = validateAssembledBooklet(booklet);
    if (errors.length > 0) {
      console.warn('[LiftRPG] Assembled booklet has', errors.length, 'validation errors:', errors);
      var errLabel = errors.length === 1 ? '1 error' : errors.length + ' errors';
      progress('Patching ' + errLabel + '\u2026');
      // Patch stage: send the full assembled booklet + errors
      var rawPatched = await callStage(
        generatePatchPrompt(JSON.stringify(booklet, null, 2), errors),
        32000,
        'Patch'
      );
      booklet = extractJson(rawPatched);
      var remaining = validateAssembledBooklet(booklet);
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
   * Single-pass generation (Standard mode).
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

  return {
    PROVIDERS: PROVIDERS,
    generate: generate,
    generateMultiStage: generateMultiStage,
    _extractJson: extractJson,
    _validateSchema: validateBookletSchema,
    _validateAssembled: validateAssembledBooklet
  };
})();
