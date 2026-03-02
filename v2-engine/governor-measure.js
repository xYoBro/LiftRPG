// ── Governor Measure: Offscreen Measurement Harness ──────────
//
// Measures atom DOM fragments offscreen to enable intelligent
// template selection and layout scoring before final rendering.
// Creates a hidden .zine-page element with correct CSS context,
// renders atoms into it, measures heights, and caches results.
//
// Phase 3 of the Layout Governor v3.0 architecture.
//
// Depends on: atom-renderers.js (AtomRenderers), render-utils.js,
//             base-theme.css (.zine-page dimensions)
//
// TIMING: Must be initialized AFTER injectTheme() sets CSS custom
//         properties and AFTER document.fonts.ready resolves.
//         Measuring before fonts load produces wrong heights that
//         cascade into bad page breaks.
//
// Exposed: window.GovernorMeasure

var GovernorMeasure = {};

// ── Private State ────────────────────────────────────────────

var _harness = null;
var _measureCache = {};
var _themeVersion = 0;
var _pageHeight = 0;
var _contentWidth = 0;

// ── Initialization ───────────────────────────────────────────

/**
 * Initialize (or reinitialize) the offscreen measurement harness.
 * Creates a hidden .zine-page element in the DOM. Call this AFTER
 * injectTheme() and document.fonts.ready to get accurate measurements.
 *
 * Safe to call multiple times — destroys and rebuilds each time,
 * incrementing the theme version to invalidate cached measurements.
 */
GovernorMeasure.init = function () {
    if (_harness && _harness.parentNode) {
        _harness.parentNode.removeChild(_harness);
    }
    _harness = document.createElement('div');
    _harness.className = 'zine-page';
    _harness.style.cssText =
        'position:absolute;left:-9999px;top:-9999px;' +
        'visibility:hidden;pointer-events:none;';
    document.body.appendChild(_harness);

    _pageHeight = _harness.clientHeight;
    _contentWidth = _harness.clientWidth;
    _measureCache = {};
    _themeVersion++;
};

// ── Page Geometry ────────────────────────────────────────────

/**
 * @returns {number} Usable page height in pixels (after padding).
 */
GovernorMeasure.getPageHeight = function () {
    if (!_harness) GovernorMeasure.init();
    return _pageHeight;
};

/**
 * @returns {number} Content width in pixels (after padding).
 */
GovernorMeasure.getContentWidth = function () {
    if (!_harness) GovernorMeasure.init();
    return _contentWidth;
};

// ── Cache Key ────────────────────────────────────────────────

/**
 * Build cache key for an atom measurement.
 * Phase 3: atomId + themeVersion + slotWidth (full-width default).
 * Phase 4+: extend with templateId, slotName, densityClass.
 *
 * @param {string} atomId
 * @param {number} [slotWidth]
 * @returns {string}
 */
function buildMeasureKey(atomId, slotWidth) {
    return atomId + '|v' + _themeVersion + '|w' + (slotWidth || _contentWidth);
}

// ── Single Atom Measurement ──────────────────────────────────

/**
 * Measure a single atom's rendered height.
 *
 * Renders the atom via AtomRenderers.render() into the offscreen
 * harness, reads offsetHeight, removes it, and caches the result.
 *
 * @param {Atom} atom
 * @param {Object} ctx  Governor context { data: finalPayload }
 * @param {number} [slotWidth]  Optional width override (px)
 * @returns {number} height in pixels (0 if atom renders nothing)
 */
GovernorMeasure.measure = function (atom, ctx, slotWidth) {
    if (!_harness) GovernorMeasure.init();

    var key = buildMeasureKey(atom.id, slotWidth);
    if (_measureCache[key] !== undefined) return _measureCache[key];

    // Width override for non-full-width slots
    var widthChanged = false;
    if (slotWidth && slotWidth !== _contentWidth) {
        _harness.style.width = slotWidth + 'px';
        widthChanged = true;
    }

    var fragment = AtomRenderers.render(atom, ctx);
    if (!fragment) {
        _measureCache[key] = 0;
        if (widthChanged) _harness.style.width = '';
        return 0;
    }

    _harness.appendChild(fragment);
    var height = fragment.offsetHeight;
    _harness.removeChild(fragment);

    if (widthChanged) _harness.style.width = '';

    _measureCache[key] = height;
    return height;
};

// ── Group Measurement ────────────────────────────────────────

/**
 * Measure all atoms in a group and return aggregate data.
 *
 * @param {Atom[]} atoms
 * @param {Object} ctx
 * @param {number} [slotWidth]
 * @returns {GroupMeasurement}
 */
GovernorMeasure.measureGroup = function (atoms, ctx, slotWidth) {
    var results = [];
    var total = 0;
    var ph = GovernorMeasure.getPageHeight();

    for (var i = 0; i < atoms.length; i++) {
        var h = GovernorMeasure.measure(atoms[i], ctx, slotWidth);
        results.push({ atom: atoms[i], height: h });
        total += h;
    }

    return {
        measurements: results,
        totalHeight: total,
        pageHeight: ph,
        estimatedPages: Math.ceil(total / ph) || 1
    };
};

/**
 * Measure the template overhead for a page type.
 * Renders a blank page with the given type and any header elements,
 * returns the consumed height before atom content starts.
 *
 * @param {string} pageType  e.g. 'encounter-hud', 'encounter-log'
 * @param {Function} [headerBuilder]  Optional function(page) that adds header elements
 * @returns {number} overhead height in pixels
 */
GovernorMeasure.measureOverhead = function (pageType, headerBuilder) {
    if (!_harness) GovernorMeasure.init();

    // Create a temporary page inside the harness
    var tempPage = document.createElement('div');
    tempPage.className = 'zine-page';
    tempPage.style.cssText = 'position:relative;width:100%;';

    if (headerBuilder) {
        headerBuilder(tempPage);
    }

    _harness.appendChild(tempPage);
    var overhead = tempPage.scrollHeight;
    _harness.removeChild(tempPage);

    return overhead;
};

// ── Cache Management ─────────────────────────────────────────

/**
 * Clear the measurement cache. Call when theme changes or
 * when atom content is modified.
 */
GovernorMeasure.clearCache = function () {
    _measureCache = {};
};

/**
 * @returns {number} Number of cached measurements.
 */
GovernorMeasure.cacheSize = function () {
    return Object.keys(_measureCache).length;
};

/**
 * Destroy the harness DOM element and clear all state.
 * Call during cleanup or before reinitializing with new theme.
 */
GovernorMeasure.destroy = function () {
    if (_harness && _harness.parentNode) {
        _harness.parentNode.removeChild(_harness);
    }
    _harness = null;
    _measureCache = {};
    _pageHeight = 0;
    _contentWidth = 0;
};

// ── Expose ───────────────────────────────────────────────────

window.GovernorMeasure = GovernorMeasure;
