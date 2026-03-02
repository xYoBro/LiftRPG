// ── Robust JSON extractor with LLM output repair ──────────────
//
// LLMs regularly produce malformed JSON. This pipeline:
//   1. Strips markdown fences and prose wrapper
//   2. Attempts JSON.parse (fast path for valid output)
//   3. On failure, runs incremental repair phases, re-trying
//      parse after each phase to minimize transformation risk
//
// Exposed: window.safeExtract, window._lastExtractRepairs

var _lastExtractRepairs = [];

function safeExtract(raw) {
    _lastExtractRepairs.length = 0;
    var str = raw.trim();

    // Phase 0: Strip markdown fences and extract outermost structure
    var fence = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence) str = fence[1].trim();
    var outerMatch = str.match(/(\{|\[)[\s\S]*(\}|\])/);
    if (outerMatch) str = outerMatch[0];

    // Fast path: try parsing as-is
    try { return JSON.parse(str); } catch (e) { /* continue to repairs */ }

    // ── Repair pipeline (incremental, re-parse after each phase) ──
    //
    // ORDER MATTERS: Unescaped quotes must be fixed before any
    // phase that tracks string boundaries (comments, newlines,
    // control chars, backslashes). Trailing commas use a simple
    // regex without string tracking so they run first safely.

    // Phase 1: Trailing commas (most common, safest fix — no string tracking)
    var repaired = str.replace(/,\s*([}\]])/g, '$1');
    if (repaired !== str) {
        _lastExtractRepairs.push('trailing-commas');
        str = repaired;
        try { return JSON.parse(str); } catch (e) { /* continue */ }
    }

    // Phase 2: Unescaped double quotes inside string values
    // (SVG attributes, HTML content — the #1 LLM JSON killer)
    // Must run BEFORE comments/newlines/control chars since those
    // depend on correct string boundary detection.
    repaired = _repairUnescapedQuotes(str);
    if (repaired !== str) {
        _lastExtractRepairs.push('unescaped-quotes');
        str = repaired;
        try { return JSON.parse(str); } catch (e) { /* continue */ }
    }

    // Phase 3: Comments (// and /* */) outside strings
    // Now safe because string boundaries are correct after Phase 2.
    repaired = _stripComments(str);
    if (repaired !== str) {
        _lastExtractRepairs.push('comments');
        str = repaired;
        try { return JSON.parse(str); } catch (e) { /* continue */ }
    }

    // Phase 4: Literal newlines inside strings
    repaired = _repairNewlinesInStrings(str);
    if (repaired !== str) {
        _lastExtractRepairs.push('newlines-in-strings');
        str = repaired;
        try { return JSON.parse(str); } catch (e) { /* continue */ }
    }

    // Phase 5: Control characters inside strings
    repaired = _repairControlChars(str);
    if (repaired !== str) {
        _lastExtractRepairs.push('control-chars');
        str = repaired;
        try { return JSON.parse(str); } catch (e) { /* continue */ }
    }

    // Phase 6: Invalid backslash escapes inside strings
    repaired = _repairBackslashes(str);
    if (repaired !== str) {
        _lastExtractRepairs.push('invalid-escapes');
        str = repaired;
        try { return JSON.parse(str); } catch (e) { /* continue */ }
    }

    // Phase 7: Truncation — close unclosed brackets/braces
    repaired = _repairTruncation(str);
    if (repaired !== str) {
        _lastExtractRepairs.push('truncation');
        str = repaired;
        try { return JSON.parse(str); } catch (e) { /* continue */ }
    }

    // All repairs exhausted — final attempt, throw on failure
    return JSON.parse(str);
}

// ── Repair helpers ──────────────────────────────────────────────

function _stripComments(str) {
    var result = [];
    var inString = false;
    var i = 0;
    while (i < str.length) {
        var ch = str[i];
        if (ch === '\\' && inString) {
            result.push(ch, str[i + 1] || '');
            i += 2;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            result.push(ch);
            i++;
            continue;
        }
        if (!inString && ch === '/' && str[i + 1] === '/') {
            while (i < str.length && str[i] !== '\n') i++;
            continue;
        }
        if (!inString && ch === '/' && str[i + 1] === '*') {
            i += 2;
            while (i < str.length - 1 && !(str[i] === '*' && str[i + 1] === '/')) i++;
            i += 2;
            continue;
        }
        result.push(ch);
        i++;
    }
    return result.join('');
}

function _repairUnescapedQuotes(str) {
    // Walk character-by-character tracking string state.
    // A closing quote is "structural" if followed by : , } ] or EOF.
    // Anything else means the quote is embedded content — escape it.
    var result = [];
    var inString = false;
    var i = 0;
    while (i < str.length) {
        var ch = str[i];
        if (ch === '\\' && inString) {
            result.push(ch, str[i + 1] || '');
            i += 2;
            continue;
        }
        if (ch === '"') {
            if (!inString) {
                inString = true;
                result.push(ch);
            } else {
                // Is this a structural close-quote?
                var rest = str.slice(i + 1).replace(/^\s+/, '');
                var next = rest[0];
                if (next === ':' || next === ',' || next === '}' ||
                    next === ']' || rest.length === 0 || next === undefined) {
                    inString = false;
                    result.push(ch);
                } else {
                    // Content quote — escape it
                    result.push('\\"');
                }
            }
        } else {
            result.push(ch);
        }
        i++;
    }
    return result.join('');
}

function _repairNewlinesInStrings(str) {
    var result = [];
    var inString = false;
    for (var i = 0; i < str.length; i++) {
        var ch = str[i];
        if (ch === '\\' && inString) {
            result.push(ch, str[i + 1] || '');
            i++;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            result.push(ch);
            continue;
        }
        if ((ch === '\n' || ch === '\r') && inString) {
            if (ch === '\r' && str[i + 1] === '\n') i++;
            result.push('\\n');
        } else {
            result.push(ch);
        }
    }
    return result.join('');
}

function _repairControlChars(str) {
    var result = [];
    var inString = false;
    var escaped = false;
    for (var i = 0; i < str.length; i++) {
        var ch = str[i];
        var code = str.charCodeAt(i);
        if (escaped) { result.push(ch); escaped = false; continue; }
        if (ch === '\\' && inString) { result.push(ch); escaped = true; continue; }
        if (ch === '"') { inString = !inString; result.push(ch); continue; }
        if (inString && code < 0x20 && code !== 0x0A && code !== 0x0D) {
            if (code === 0x09) result.push('\\t');
            else if (code === 0x08) result.push('\\b');
            else if (code === 0x0C) result.push('\\f');
            else result.push('\\u' + ('0000' + code.toString(16)).slice(-4));
        } else {
            result.push(ch);
        }
    }
    return result.join('');
}

function _repairBackslashes(str) {
    var result = [];
    var inString = false;
    var i = 0;
    while (i < str.length) {
        var ch = str[i];
        if (ch === '"' && (i === 0 || str[i - 1] !== '\\')) {
            inString = !inString;
            result.push(ch);
            i++;
            continue;
        }
        if (inString && ch === '\\') {
            var nx = str[i + 1];
            if (nx && '"\\\/bfnrt'.indexOf(nx) !== -1) {
                result.push(ch, nx);
                i += 2;
                continue;
            }
            if (nx === 'u' && /^[0-9a-fA-F]{4}$/.test(str.substring(i + 2, i + 6))) {
                result.push(str.substring(i, i + 6));
                i += 6;
                continue;
            }
            result.push('\\\\');
            i++;
            continue;
        }
        result.push(ch);
        i++;
    }
    return result.join('');
}

function _repairTruncation(str) {
    var trimmed = str.trimEnd();

    // Check for unclosed string (odd quote count)
    var quoteCount = 0;
    var esc = false;
    for (var i = 0; i < trimmed.length; i++) {
        if (esc) { esc = false; continue; }
        if (trimmed[i] === '\\') { esc = true; continue; }
        if (trimmed[i] === '"') quoteCount++;
    }
    if (quoteCount % 2 !== 0) {
        // Truncate back to last structural character before the broken string
        var lastGood = -1;
        var inStr = false;
        var isEsc = false;
        for (var j = 0; j < trimmed.length; j++) {
            if (isEsc) { isEsc = false; continue; }
            if (trimmed[j] === '\\' && inStr) { isEsc = true; continue; }
            if (trimmed[j] === '"') inStr = !inStr;
            if (!inStr && (trimmed[j] === ',' || trimmed[j] === '{' ||
                trimmed[j] === '[' || trimmed[j] === ':')) {
                lastGood = j;
            }
        }
        if (lastGood > 0) {
            trimmed = trimmed.substring(0, lastGood + 1);
            trimmed = trimmed.replace(/[,:]\s*$/, '');
        }
    }

    // Count unmatched openers, append closers
    var stack = [];
    var inString = false;
    var isEscaped = false;
    for (var k = 0; k < trimmed.length; k++) {
        if (isEscaped) { isEscaped = false; continue; }
        if (trimmed[k] === '\\' && inString) { isEscaped = true; continue; }
        if (trimmed[k] === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (trimmed[k] === '{') stack.push('}');
        else if (trimmed[k] === '[') stack.push(']');
        else if (trimmed[k] === '}' || trimmed[k] === ']') stack.pop();
    }
    if (stack.length > 0) {
        return trimmed + stack.reverse().join('');
    }
    return trimmed;
}

// Expose on window for cross-file access
window.safeExtract = safeExtract;
window._lastExtractRepairs = _lastExtractRepairs;
