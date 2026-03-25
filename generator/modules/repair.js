// ── JSON repair & extraction ─────────────────────────────────────────────────
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
//  - findJsonBounds: depth-counting walk to find the exact root {…} block.
//  - walkAndRepair: single character pass fixing issues 1–3.
//  - fixLiterals: string-aware replacement of Python/JS literals (issue 6).
//  - fixStructural: regex pass for issues 4–5.
//  - extractJson runs direct parse first (fast path), then repair, so clean
//    JSON pays no cost.
//
// Zero external dependencies — this module is a fully isolated leaf.

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
var AFTER_STRING = { ',': 1, '}': 1, ']': 1, ':': 1, '/': 1 };

function peekStructural(text, from) {
  for (var k = from; k < text.length; k++) {
    var p = text[k];
    if (p !== ' ' && p !== '\t' && p !== '\r' && p !== '\n') return p;
  }
  return '';
}

function walkAndRepair(text) {
  var out = [], inStr = false, esc = false;

  for (var i = 0; i < text.length; i++) {
    var c = text[i];

    if (esc) { out.push(c); esc = false; continue; }

    // JS-style comments: skip when not inside a string
    if (!inStr && c === '/') {
      var nx2 = text[i + 1] || '';
      if (nx2 === '/') {
        while (i < text.length && text[i] !== '\n') i++;
        continue;
      } else if (nx2 === '*') {
        i += 2;
        while (i < text.length - 1 && !(text[i] === '*' && text[i + 1] === '/')) i++;
        i++;
        continue;
      }
    }

    // Backslash inside string: validate or double-escape
    if (c === '\\' && inStr) {
      var nx = text[i + 1] || '';
      if (VALID_ESC[nx]) { out.push(c); esc = true; }
      else { out.push('\\\\'); }
      continue;
    }

    // Double-quote: decide open / close / escape-in-place
    if (c === '"') {
      if (inStr) {
        var peek = peekStructural(text, i + 1);
        if (AFTER_STRING[peek] || peek === '') {
          inStr = false;
          out.push('"');
        } else {
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
  text = text.replace(/,(?=\s*[}\]])/g, '');
  text = text.replace(/([}\]])(\s+)([{[\"])/g, function (_, close, ws, open) {
    return close + ',' + ws + open;
  });
  return text;
}

// ── Python / JS literal normalisation ───────────────────────────────────────

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

export function repairJson(text) {
  return fixStructural(fixLiterals(walkAndRepair(text)));
}

// ── JSON extraction ──────────────────────────────────────────────────────────

export function extractJson(text) {
  // 1. Strip BOM
  var cleaned = text.replace(/^\uFEFF/, '');

  // 2. Extract from ```json ... ``` fenced block anywhere in the text
  var fenceMatch = cleaned.match(/```json\s*([\s\S]*?)```/i);
  if (!fenceMatch) {
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

  // 4. Locate root {…} with depth counting
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
    console.warn('[LiftRPG] Direct parse failed (' + e1.message + ') \u2014 attempting repair');
    console.log('[LiftRPG] Raw JSON (first 500):', jsonStr.slice(0, 500));
  }

  // 6. Repair path
  var repaired = repairJson(jsonStr);
  try {
    return JSON.parse(repaired);
  } catch (e2) {
    console.error('[LiftRPG] Repair failed:', e2.message);
    console.log('[LiftRPG] Repaired JSON (first 500):', repaired.slice(0, 500));
    console.log('[LiftRPG] Full raw length:', repaired.length);
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
