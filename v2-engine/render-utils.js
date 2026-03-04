// ── Shared rendering utilities ───────────────────────────────
//
// Sanitizers, entity helpers, and page creation boilerplate.
// Every other render-*.js file depends on these.
//
// Exposed: window.escapeHtml, window.sanitizeSvg, window.sanitizeHtml,
//          window.decodeEntities, window.createPage, window.renderDivider,
//          window.addPageNumber, window.toKebabClass

// -- Sanitization helper (prevents XSS from untrusted JSON) --
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

function sanitizeSvg(svgStr) {
    if (typeof svgStr !== 'string') return '';
    // Strip <script>, <foreignObject>, <image> tags (paired and unpaired)
    var s = svgStr.replace(/<(script|foreignObject|image)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
    s = s.replace(/<(script|foreignObject|image)\b[^>]*\/?>/gi, '');
    // Strip inline event handlers — quoted and unquoted
    s = s.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
    // Strip javascript: and data: URIs (quoted and unquoted)
    s = s.replace(/(href|src|xlink:href)\s*=\s*(?:"[^"]*(javascript|data):[^"]*"|'[^']*(javascript|data):[^']*')/gi, '$1=""');
    s = s.replace(/(href|src|xlink:href)\s*=\s*(javascript|data):[^\s>]*/gi, '$1=""');
    return s;
}

// Lightweight allowlist for LLM-generated HTML
function sanitizeHtml(htmlStr) {
    if (typeof htmlStr !== 'string') return '';
    // Strip dangerous tags — paired (with content)
    var s = htmlStr.replace(/<(script|iframe|object|embed|applet|style|form|base|link|meta|svg|math|picture)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
    // Strip dangerous tags — opening/self-closing (no closing tag)
    s = s.replace(/<(script|iframe|object|embed|applet|style|form|base|link|meta|svg|math|picture)\b[^>]*\/?>/gi, '');
    // Strip inline event handlers — quoted and unquoted
    s = s.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
    // Strip javascript: and data: URIs (quoted and unquoted)
    s = s.replace(/(href|src)\s*=\s*(?:"[^"]*(javascript|data):[^"]*"|'[^']*(javascript|data):[^']*')/gi, '$1=""');
    s = s.replace(/(href|src)\s*=\s*(javascript|data):[^\s>]*/gi, '$1=""');
    return s;
}

// Decode the 5 standard XML entities in textContent strings from LLM JSON
function decodeEntities(str) {
    if (typeof str !== 'string') return str == null ? '' : String(str);
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

// -- Page creation boilerplate --

function createPage(pageType) {
    var p = document.createElement('div');
    p.className = 'zine-page';
    if (pageType) p.dataset.pageType = pageType;
    return p;
}

function renderDivider(container) {
    var theme = window._zineTheme;
    if (!theme || !theme.art || !theme.art.dividerSvg) return;
    var div = document.createElement('div');
    div.className = 'section-divider';
    div.innerHTML = sanitizeSvg(theme.art.dividerSvg);
    container.appendChild(div);
}

function addPageNumber(page, num) {
    var n = document.createElement('div');
    n.className = 'page-number';
    n.textContent = String(num).padStart(2, '0');
    page.appendChild(n);
}

// Sanitize type strings into valid CSS class fragments (kebab-case)
function toKebabClass(str) {
    return (str || 'unknown').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// Expose on window for cross-file access
window.escapeHtml = escapeHtml;
window.sanitizeSvg = sanitizeSvg;
window.sanitizeHtml = sanitizeHtml;
window.decodeEntities = decodeEntities;
window.createPage = createPage;
window.renderDivider = renderDivider;
window.addPageNumber = addPageNumber;
window.toKebabClass = toKebabClass;
