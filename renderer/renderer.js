(function () {
  'use strict';

  var PAGE_WIDTH_IN = 5.5;
  var PAGE_HEIGHT_IN = 8.5;
  var CRYPTO_ALGO = 'AES-GCM';
  var CRYPTO_KEY_BITS = 256;
  var CRYPTO_SALT_BYTES = 32;
  var CRYPTO_IV_BYTES = 12;
  var CRYPTO_ITERATIONS = 200000;

  var state = {
    data: null,
    unlockedEnding: null,
    layoutMode: 'single'
  };

  var refs = {};

  var THEME_PRESETS = {
    government: {
      '--font-display': '"Playfair Display", Georgia, serif',
      '--font-body': '"IBM Plex Mono", "Courier New", Courier, monospace',
      '--font-mono': '"IBM Plex Mono", "Courier New", Courier, monospace',
      '--font-accent': '"Share Tech Mono", monospace',
      '--weight-body': '400',
      '--weight-heading': '700',
      '--weight-label': '600',
      '--weight-emphasis': '700',
      '--page-ink': '#111111',
      '--page-paper': '#e6dfd1',
      '--page-accent': '#a33b3b',
      '--page-muted': '#5e5a51',
      '--page-rule': '#a33b3b',
      '--page-fog': '#dacfbe',
      '--page-surface': 'linear-gradient(180deg, #e6dfd1 0%, #dacfbe 100%)',
      '--page-underlay': 'none',
      '--panel-surface': 'linear-gradient(180deg, rgba(230, 223, 209, 0.98) 0%, rgba(218, 207, 190, 0.92) 100%)',
      '--panel-secondary-surface': 'transparent',
      '--card-surface': 'transparent',
      '--line-style': 'solid',
      '--line-width-hair': '1px',
      '--line-width-rule': '1.5px',
      '--line-width-frame': '2px',
      '--surface-radius': '0px',
      '--surface-shadow': '0 18px 34px rgba(0, 0, 0, 0.08)',
      '--page-shadow': '0 24px 56px rgba(0, 0, 0, 0.20)',
      '--noise-opacity': '0.12',
      '--fog-opacity': '0.1',
      '--rule-opacity': '0.8',
      '--stamp-opacity': '0.9',
      '--label-size': '6pt',
      '--label-spacing': '0.28em',
      '--label-transform': 'uppercase',
      '--heading-style': 'italic',
      '--heading-size-xl': '38pt',
      '--heading-size-lg': '16pt',
      '--heading-size-md': '12pt',
      '--body-size': '9pt',
      '--body-line-height': '1.5',
      '--small-size': '6.2pt',
      '--mono-size': '6.4pt',
      '--grid-stroke-style': 'solid',
      '--grid-dot-opacity': '0.5',
      '--grid-fill': 'rgba(163, 59, 59, 0.08)',
      '--track-fill': 'rgba(218, 207, 190, 0.4)',
      '--badge-style': 'normal',
      '--callout-surface': 'rgba(218, 207, 190, 0.22)',
      '--highlight-surface': 'rgba(163, 59, 59, 0.12)',
      '--page-margin': '0.4in'
    },
    cyberpunk: {
      '--font-display': '"Share Tech Mono", monospace',
      '--font-body': '"IBM Plex Mono", monospace',
      '--font-mono': '"IBM Plex Mono", monospace',
      '--font-accent': '"Share Tech Mono", monospace',
      '--weight-body': '400',
      '--weight-heading': '600',
      '--weight-label': '600',
      '--weight-emphasis': '700',
      '--page-ink': '#00ffcc',
      '--page-paper': '#0a0a0a',
      '--page-accent': '#ff00ff',
      '--page-muted': '#008866',
      '--page-rule': '#00ffcc',
      '--page-fog': '#111111',
      '--page-surface': 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
      '--page-underlay': 'repeating-linear-gradient(180deg, rgba(0,255,204,0.06) 0 2px, transparent 2px 4px)',
      '--panel-surface': 'linear-gradient(180deg, rgba(10,10,10,0.95) 0%, rgba(17,17,17,0.92) 100%)',
      '--panel-secondary-surface': 'linear-gradient(180deg, rgba(0,255,204,0.1) 0%, transparent 100%)',
      '--card-surface': 'rgba(17,17,17,0.8)',
      '--line-style': 'solid',
      '--line-width-hair': '1px',
      '--line-width-rule': '1px',
      '--line-width-frame': '2px',
      '--surface-radius': '0px',
      '--surface-shadow': '0 0px 20px rgba(0, 255, 204, 0.2)',
      '--page-shadow': '0 24px 50px rgba(0,0,0,0.6)',
      '--noise-opacity': '0.2',
      '--fog-opacity': '0.3',
      '--rule-opacity': '1',
      '--stamp-opacity': '1',
      '--label-size': '7pt',
      '--label-spacing': '0.2em',
      '--label-transform': 'uppercase',
      '--heading-style': 'normal',
      '--heading-size-xl': '24pt',
      '--heading-size-lg': '14pt',
      '--heading-size-md': '10pt',
      '--body-size': '8pt',
      '--body-line-height': '1.4',
      '--small-size': '6pt',
      '--mono-size': '8pt',
      '--grid-stroke-style': 'dotted',
      '--grid-dot-opacity': '0.5',
      '--grid-fill': 'rgba(0, 255, 204, 0.1)',
      '--track-fill': 'rgba(0, 255, 204, 0.2)',
      '--badge-style': 'normal',
      '--callout-surface': 'rgba(255, 0, 255, 0.1)',
      '--highlight-surface': 'rgba(0, 255, 204, 0.15)',
      '--page-margin': '0.3in'
    },
    scifi: {
      '--font-display': 'system-ui, -apple-system, sans-serif',
      '--font-body': 'system-ui, -apple-system, sans-serif',
      '--font-mono': '"IBM Plex Mono", monospace',
      '--font-accent': 'system-ui, -apple-system, sans-serif',
      '--weight-body': '400',
      '--weight-heading': '600',
      '--weight-label': '500',
      '--weight-emphasis': '700',
      '--page-ink': '#222222',
      '--page-paper': '#ffffff',
      '--page-accent': '#0066ff',
      '--page-muted': '#888888',
      '--page-rule': '#e0e0e0',
      '--page-fog': '#f5f7fa',
      '--page-surface': 'linear-gradient(180deg, #ffffff 0%, #f5f7fa 100%)',
      '--page-underlay': 'none',
      '--panel-surface': 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,247,250,0.92) 100%)',
      '--panel-secondary-surface': 'rgba(245,247,250,0.8)',
      '--card-surface': 'rgba(255,255,255,1)',
      '--line-style': 'solid',
      '--line-width-hair': '1px',
      '--line-width-rule': '1px',
      '--line-width-frame': '1.5px',
      '--surface-radius': '4px',
      '--surface-shadow': '0 8px 24px rgba(0, 102, 255, 0.08)',
      '--page-shadow': '0 24px 40px rgba(0,0,0,0.1)',
      '--noise-opacity': '0.02',
      '--fog-opacity': '0.05',
      '--rule-opacity': '1',
      '--stamp-opacity': '0.9',
      '--label-size': '6.5pt',
      '--label-spacing': '0.15em',
      '--label-transform': 'uppercase',
      '--heading-style': 'normal',
      '--heading-size-xl': '28pt',
      '--heading-size-lg': '16pt',
      '--heading-size-md': '11pt',
      '--body-size': '8.5pt',
      '--body-line-height': '1.6',
      '--small-size': '6.5pt',
      '--mono-size': '7.5pt',
      '--grid-stroke-style': 'solid',
      '--grid-dot-opacity': '0.2',
      '--grid-fill': 'rgba(0, 102, 255, 0.04)',
      '--track-fill': 'rgba(224, 224, 224, 0.4)',
      '--badge-style': 'normal',
      '--callout-surface': 'rgba(0, 102, 255, 0.06)',
      '--highlight-surface': 'rgba(0, 102, 255, 0.1)',
      '--page-margin': '0.45in'
    },
    fantasy: {
      '--font-display': '"Playfair Display", serif',
      '--font-body': '"Libre Baskerville", serif',
      '--font-mono': '"Libre Baskerville", serif',
      '--font-accent': '"Playfair Display", serif',
      '--weight-body': '400',
      '--weight-heading': '700',
      '--weight-label': '600',
      '--weight-emphasis': '700',
      '--page-ink': '#1a3322',
      '--page-paper': '#f4ecc2',
      '--page-accent': '#c5a059',
      '--page-muted': '#5c6b5d',
      '--page-rule': '#c5a059',
      '--page-fog': '#eaddad',
      '--page-surface': 'linear-gradient(180deg, #f4ecc2 0%, #eaddad 100%)',
      '--page-underlay': 'none',
      '--panel-surface': 'linear-gradient(180deg, rgba(244,236,194,0.98) 0%, rgba(234,221,173,0.92) 100%)',
      '--panel-secondary-surface': 'transparent',
      '--card-surface': 'transparent',
      '--line-style': 'solid',
      '--line-width-hair': '1px',
      '--line-width-rule': '1.5px',
      '--line-width-frame': '2.5px',
      '--surface-radius': '0px',
      '--surface-shadow': '0 18px 34px rgba(26, 51, 34, 0.15)',
      '--page-shadow': '0 24px 56px rgba(0, 0, 0, 0.25)',
      '--noise-opacity': '0.15',
      '--fog-opacity': '0.2',
      '--rule-opacity': '0.8',
      '--stamp-opacity': '0.7',
      '--label-size': '7pt',
      '--label-spacing': '0.15em',
      '--label-transform': 'uppercase',
      '--heading-style': 'italic',
      '--heading-size-xl': '32pt',
      '--heading-size-lg': '16pt',
      '--heading-size-md': '12pt',
      '--body-size': '9pt',
      '--body-line-height': '1.55',
      '--small-size': '6.5pt',
      '--mono-size': '8pt',
      '--grid-stroke-style': 'dotted',
      '--grid-dot-opacity': '0.6',
      '--grid-fill': 'rgba(197, 160, 89, 0.1)',
      '--track-fill': 'rgba(234, 221, 173, 0.5)',
      '--badge-style': 'italic',
      '--callout-surface': 'rgba(197, 160, 89, 0.15)',
      '--highlight-surface': 'rgba(26, 51, 34, 0.1)',
      '--page-margin': '0.36in'
    },
    noir: {
      '--font-display': '"Share Tech Mono", monospace',
      '--font-body': '"IBM Plex Mono", monospace',
      '--font-mono': '"IBM Plex Mono", monospace',
      '--font-accent': '"Share Tech Mono", monospace',
      '--weight-body': '600',
      '--weight-heading': '700',
      '--weight-label': '700',
      '--weight-emphasis': '700',
      '--page-ink': '#000000',
      '--page-paper': '#e4e4e4',
      '--page-accent': '#000000',
      '--page-muted': '#555555',
      '--page-rule': '#000000',
      '--page-fog': '#c8c8c8',
      '--page-surface': 'linear-gradient(180deg, #e4e4e4 0%, #d0d0d0 100%)',
      '--page-underlay': 'none',
      '--panel-surface': 'linear-gradient(180deg, rgba(228,228,228,0.98) 0%, rgba(200,200,200,0.92) 100%)',
      '--panel-secondary-surface': 'rgba(0,0,0,0.05)',
      '--card-surface': 'linear-gradient(180deg, rgba(228,228,228,0.98) 0%, rgba(200,200,200,0.92) 100%)',
      '--line-style': 'solid',
      '--line-width-hair': '1.5px',
      '--line-width-rule': '2.5px',
      '--line-width-frame': '4px',
      '--surface-radius': '0px',
      '--surface-shadow': '0 20px 40px rgba(0,0,0,0.4)',
      '--page-shadow': '0 24px 60px rgba(0,0,0,0.5)',
      '--noise-opacity': '0.25',
      '--fog-opacity': '0.1',
      '--rule-opacity': '1',
      '--stamp-opacity': '0.9',
      '--label-size': '7.5pt',
      '--label-spacing': '0.2em',
      '--label-transform': 'uppercase',
      '--heading-style': 'normal',
      '--heading-size-xl': '26pt',
      '--heading-size-lg': '15pt',
      '--heading-size-md': '11pt',
      '--body-size': '8.5pt',
      '--body-line-height': '1.5',
      '--small-size': '7pt',
      '--mono-size': '8.5pt',
      '--grid-stroke-style': 'solid',
      '--grid-dot-opacity': '0.8',
      '--grid-fill': 'rgba(0,0,0,0.08)',
      '--track-fill': 'rgba(0,0,0,0.15)',
      '--badge-style': 'normal',
      '--callout-surface': 'rgba(0,0,0,0.08)',
      '--highlight-surface': 'rgba(0,0,0,0.15)',
      '--page-margin': '0.35in'
    },
    steampunk: {
      '--font-display': '"Playfair Display", serif',
      '--font-body': '"Libre Baskerville", serif',
      '--font-mono': '"IBM Plex Mono", monospace',
      '--font-accent': '"Share Tech Mono", monospace',
      '--weight-body': '400',
      '--weight-heading': '700',
      '--weight-label': '600',
      '--weight-emphasis': '700',
      '--page-ink': '#3e2f24',
      '--page-paper': '#d9c8b4',
      '--page-accent': '#b87333',
      '--page-muted': '#7a6452',
      '--page-rule': '#b5a642',
      '--page-fog': '#c4b09c',
      '--page-surface': 'linear-gradient(180deg, #d9c8b4 0%, #c4b09c 100%)',
      '--page-underlay': 'none',
      '--panel-surface': 'linear-gradient(180deg, rgba(217,200,180,0.98) 0%, rgba(196,176,156,0.92) 100%)',
      '--panel-secondary-surface': 'rgba(184,115,51,0.08)',
      '--card-surface': 'linear-gradient(180deg, rgba(217,200,180,0.98) 0%, rgba(196,176,156,0.92) 100%)',
      '--line-style': 'double',
      '--line-width-hair': '1px',
      '--line-width-rule': '3px',
      '--line-width-frame': '4px',
      '--surface-radius': '0px',
      '--surface-shadow': '0 18px 34px rgba(62, 47, 36, 0.25)',
      '--page-shadow': '0 24px 50px rgba(0,0,0,0.3)',
      '--noise-opacity': '0.18',
      '--fog-opacity': '0.2',
      '--rule-opacity': '0.9',
      '--stamp-opacity': '0.8',
      '--label-size': '6.5pt',
      '--label-spacing': '0.22em',
      '--label-transform': 'uppercase',
      '--heading-style': 'normal',
      '--heading-size-xl': '28pt',
      '--heading-size-lg': '15pt',
      '--heading-size-md': '11pt',
      '--body-size': '8.5pt',
      '--body-line-height': '1.5',
      '--small-size': '6.2pt',
      '--mono-size': '7.5pt',
      '--grid-stroke-style': 'solid',
      '--grid-dot-opacity': '0.5',
      '--grid-fill': 'rgba(184, 115, 51, 0.1)',
      '--track-fill': 'rgba(181, 166, 66, 0.2)',
      '--badge-style': 'normal',
      '--callout-surface': 'rgba(184, 115, 51, 0.15)',
      '--highlight-surface': 'rgba(181, 166, 66, 0.15)',
      '--page-margin': '0.38in'
    },
    minimalist: {
      '--font-display': 'system-ui, -apple-system, sans-serif',
      '--font-body': 'system-ui, -apple-system, sans-serif',
      '--font-mono': '"IBM Plex Mono", monospace',
      '--font-accent': 'system-ui, -apple-system, sans-serif',
      '--weight-body': '400',
      '--weight-heading': '600',
      '--weight-label': '600',
      '--weight-emphasis': '700',
      '--page-ink': '#000000',
      '--page-paper': '#ffffff',
      '--page-accent': '#000000',
      '--page-muted': '#888888',
      '--page-rule': '#e0e0e0',
      '--page-fog': '#fdfdfd',
      '--page-surface': '#ffffff',
      '--page-underlay': 'none',
      '--panel-surface': '#ffffff',
      '--panel-secondary-surface': '#fcfcfc',
      '--card-surface': '#ffffff',
      '--line-style': 'solid',
      '--line-width-hair': '1px',
      '--line-width-rule': '1px',
      '--line-width-frame': '2px',
      '--surface-radius': '0px',
      '--surface-shadow': 'none',
      '--page-shadow': '0 20px 40px rgba(0,0,0,0.05)',
      '--noise-opacity': '0.01',
      '--fog-opacity': '0',
      '--rule-opacity': '1',
      '--stamp-opacity': '1',
      '--label-size': '6pt',
      '--label-spacing': '0.25em',
      '--label-transform': 'uppercase',
      '--heading-style': 'normal',
      '--heading-size-xl': '30pt',
      '--heading-size-lg': '16pt',
      '--heading-size-md': '11pt',
      '--body-size': '8.5pt',
      '--body-line-height': '1.65',
      '--small-size': '6.5pt',
      '--mono-size': '7.5pt',
      '--grid-stroke-style': 'solid',
      '--grid-dot-opacity': '0.1',
      '--grid-fill': 'rgba(0,0,0,0.02)',
      '--track-fill': 'rgba(0,0,0,0.05)',
      '--badge-style': 'normal',
      '--callout-surface': 'rgba(0,0,0,0.03)',
      '--highlight-surface': 'rgba(0,0,0,0.06)',
      '--page-margin': '0.5in'
    },
    nautical: {
      '--font-display': '"Playfair Display", serif',
      '--font-body': '"Libre Baskerville", serif',
      '--font-mono': '"IBM Plex Mono", monospace',
      '--font-accent': '"Libre Baskerville", serif',
      '--weight-body': '400',
      '--weight-heading': '700',
      '--weight-label': '600',
      '--weight-emphasis': '700',
      '--page-ink': '#001a33',
      '--page-paper': '#f5f5dc',
      '--page-accent': '#8a3324',
      '--page-muted': '#5c6b73',
      '--page-rule': '#334c66',
      '--page-fog': '#e6e6cc',
      '--page-surface': 'linear-gradient(180deg, #f5f5dc 0%, #e6e6cc 100%)',
      '--page-underlay': 'none',
      '--panel-surface': 'linear-gradient(180deg, rgba(245,245,220,0.98) 0%, rgba(230,230,204,0.92) 100%)',
      '--panel-secondary-surface': 'rgba(0,26,51,0.05)',
      '--card-surface': 'transparent',
      '--line-style': 'solid',
      '--line-width-hair': '1px',
      '--line-width-rule': '1.5px',
      '--line-width-frame': '2px',
      '--surface-radius': '0px',
      '--surface-shadow': '0 16px 30px rgba(0, 26, 51, 0.15)',
      '--page-shadow': '0 24px 50px rgba(0,0,0,0.2)',
      '--noise-opacity': '0.1',
      '--fog-opacity': '0.15',
      '--rule-opacity': '0.85',
      '--stamp-opacity': '0.85',
      '--label-size': '6.8pt',
      '--label-spacing': '0.22em',
      '--label-transform': 'uppercase',
      '--heading-style': 'normal',
      '--heading-size-xl': '26pt',
      '--heading-size-lg': '15pt',
      '--heading-size-md': '11pt',
      '--body-size': '8.5pt',
      '--body-line-height': '1.58',
      '--small-size': '6.4pt',
      '--mono-size': '7.2pt',
      '--grid-stroke-style': 'solid',
      '--grid-dot-opacity': '0.4',
      '--grid-fill': 'rgba(138, 51, 36, 0.08)',
      '--track-fill': 'rgba(51, 76, 102, 0.2)',
      '--badge-style': 'normal',
      '--callout-surface': 'rgba(51, 76, 102, 0.1)',
      '--highlight-surface': 'rgba(138, 51, 36, 0.15)',
      '--page-margin': '0.36in'
    },
    occult: {
      '--font-display': '"Playfair Display", serif',
      '--font-body': '"Libre Baskerville", serif',
      '--font-mono': '"Libre Baskerville", serif',
      '--font-accent': '"Playfair Display", serif',
      '--weight-body': '400',
      '--weight-heading': '700',
      '--weight-label': '600',
      '--weight-emphasis': '700',
      '--page-ink': '#2a1a2e',
      '--page-paper': '#c2b28f',
      '--page-accent': '#8c001a',
      '--page-muted': '#5c4a63',
      '--page-rule': '#5a3d4a',
      '--page-fog': '#a69673',
      '--page-surface': 'linear-gradient(180deg, #c2b28f 0%, #a69673 100%)',
      '--page-underlay': 'none',
      '--panel-surface': 'linear-gradient(180deg, rgba(194,178,143,0.98) 0%, rgba(166,150,115,0.92) 100%)',
      '--panel-secondary-surface': 'rgba(140,0,26,0.06)',
      '--card-surface': 'transparent',
      '--line-style': 'solid',
      '--line-width-hair': '1px',
      '--line-width-rule': '1.5px',
      '--line-width-frame': '2.5px',
      '--surface-radius': '0px',
      '--surface-shadow': '0 20px 38px rgba(42, 26, 46, 0.25)',
      '--page-shadow': '0 24px 60px rgba(0,0,0,0.4)',
      '--noise-opacity': '0.22',
      '--fog-opacity': '0.25',
      '--rule-opacity': '0.9',
      '--stamp-opacity': '0.8',
      '--label-size': '6.5pt',
      '--label-spacing': '0.18em',
      '--label-transform': 'uppercase',
      '--heading-style': 'italic',
      '--heading-size-xl': '30pt',
      '--heading-size-lg': '16pt',
      '--heading-size-md': '12pt',
      '--body-size': '9pt',
      '--body-line-height': '1.45',
      '--small-size': '6.4pt',
      '--mono-size': '8pt',
      '--grid-stroke-style': 'dotted',
      '--grid-dot-opacity': '0.7',
      '--grid-fill': 'rgba(140, 0, 26, 0.08)',
      '--track-fill': 'rgba(90, 61, 74, 0.3)',
      '--badge-style': 'italic',
      '--callout-surface': 'rgba(90, 61, 74, 0.15)',
      '--highlight-surface': 'rgba(140, 0, 26, 0.15)',
      '--page-margin': '0.36in'
    }
  };

  function qs(id) {
    return document.getElementById(id);
  }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function append(node, children) {
    children.forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function setStatus(message, tone) {
    refs.status.textContent = message || '';
    refs.status.setAttribute('data-tone', tone || 'neutral');
  }

  function safeUpper(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function normalisePassword(raw) {
    return safeUpper(raw);
  }

  function alpha(hex, value) {
    if (!hex || hex.charAt(0) !== '#' || (hex.length !== 7 && hex.length !== 4)) {
      return 'rgba(0,0,0,' + value + ')';
    }
    var full = hex.length === 4
      ? '#' + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2) + hex.charAt(3) + hex.charAt(3)
      : hex;
    var r = parseInt(full.slice(1, 3), 16);
    var g = parseInt(full.slice(3, 5), 16);
    var b = parseInt(full.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + value + ')';
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function mergeObjects(base, overrides) {
    var output = clone(base || {});
    Object.keys(overrides || {}).forEach(function (key) {
      output[key] = overrides[key];
    });
    return output;
  }

  function resolveTheme(data) {
    var theme = (data && data.theme) || {};
    var archetype = theme.visualArchetype || 'government';
    var preset = THEME_PRESETS[archetype] || THEME_PRESETS.government;
    var palette = theme.palette || {};
    var tokens = mergeObjects(preset, theme.tokens || {});

    if (palette.ink) tokens['--page-ink'] = palette.ink;
    if (palette.paper) tokens['--page-paper'] = palette.paper;
    if (palette.accent) tokens['--page-accent'] = palette.accent;
    if (palette.muted) tokens['--page-muted'] = palette.muted;
    if (palette.rule) tokens['--page-rule'] = palette.rule;
    if (palette.fog) tokens['--page-fog'] = palette.fog;

    if (palette.paper && !theme.tokens) {
      tokens['--page-surface'] = 'linear-gradient(180deg, ' + palette.paper + ' 0%, ' + alpha(palette.paper, 0.92) + ' 100%)';
      tokens['--panel-surface'] = 'linear-gradient(180deg, ' + alpha(palette.paper, 0.98) + ' 0%, ' + alpha(palette.paper, 0.9) + ' 100%)';
      tokens['--card-surface'] = tokens['--panel-surface'];
    }
    tokens['--page-underlay'] = tokens['--page-underlay'] || 'none';
    tokens['--panel-secondary-surface'] = tokens['--panel-secondary-surface'] || alpha(tokens['--page-fog'], 0.28);
    tokens['--callout-surface'] = tokens['--callout-surface'] || alpha(tokens['--page-fog'], 0.2);
    tokens['--highlight-surface'] = tokens['--highlight-surface'] || alpha(tokens['--page-accent'], 0.12);

    return {
      archetype: archetype,
      tokens: tokens
    };
  }

  function applyTheme(container, theme) {
    container.setAttribute('data-archetype', theme.archetype);
    Object.keys(theme.tokens).forEach(function (key) {
      container.style.setProperty(key, theme.tokens[key]);
    });
  }

  function validateBooklet(data) {
    var errors = [];
    if (!data || typeof data !== 'object') {
      errors.push('JSON root must be an object.');
      return errors;
    }
    ['meta', 'cover', 'rulesSpread', 'weeks', 'fragments', 'endings'].forEach(function (key) {
      if (!data[key]) errors.push('Missing top-level key "' + key + '".');
    });
    if (data.meta && Array.isArray(data.weeks) && data.meta.weekCount !== data.weeks.length) {
      errors.push('meta.weekCount does not match weeks.length.');
    }
    if (Array.isArray(data.weeks)) {
      var bossWeeks = data.weeks.filter(function (week) { return week && week.isBossWeek; });
      if (bossWeeks.length !== 1) errors.push('Exactly one boss week is required.');
      if (bossWeeks.length === 1 && data.weeks[data.weeks.length - 1] !== bossWeeks[0]) {
        errors.push('Boss week must be final week.');
      }
    }
    return errors;
  }

  function splitParagraphs(text) {
    return String(text || '')
      .split('\n')
      .map(function (line) { return line.trim(); })
      .filter(Boolean);
  }

  function readingLength(value) {
    return splitParagraphs(value).join(' ').length;
  }

  function chunkSessions(week) {
    var sessions = week.sessions || [];
    var chunks = [];
    var current = [];
    var load = 0;

    sessions.forEach(function (session) {
      var weight = 1;
      weight += Math.min((session.exercises || []).length, 6) * 0.3;
      weight += Math.min(readingLength(session.storyPrompt) / 300, 1.5);
      if (session.binaryChoice) weight += 1.2;

      // Reduced chunk size for easier layout: max 2 sessions, tight weight limits
      if (current.length >= 2 || (current.length >= 1 && load + weight > 2.05)) {
        chunks.push(current);
        current = [];
        load = 0;
      }
      current.push(session);
      load += weight;
    });
    if (current.length) chunks.push(current);
    return chunks;
  }

  function paginateFragments(fragments) {
    var pages = [];
    var current = [];
    var load = 0;

    var processed = [];
    (fragments || []).forEach(function (fragment) {
      var body = fragment.bodyText || fragment.body || fragment.content || '';
      var len = readingLength(body);
      if (len > 800) {
        var paras = splitParagraphs(body);
        var currentParas = [];
        var currentLen = 0;
        var part = 1;

        paras.forEach(function (p) {
          var pLen = readingLength(p);
          if (currentLen + pLen > 750 && currentParas.length > 0) {
            var fClone = Object.assign({}, fragment, {
              content: currentParas.join('\n\n'),
              title: fragment.title ? (part > 1 ? fragment.title + ' (cont.)' : fragment.title) : ''
            });
            if (part > 1) {
              fClone.inWorldAuthor = ''; fClone.inWorldRecipient = ''; fClone.date = '';
            }
            processed.push(fClone);
            currentParas = [p];
            currentLen = pLen;
            part++;
          } else {
            currentParas.push(p);
            currentLen += pLen;
          }
        });
        if (currentParas.length > 0) {
          var fFinal = Object.assign({}, fragment, {
            content: currentParas.join('\n\n'),
            title: fragment.title && part > 1 ? fragment.title + ' (cont.)' : fragment.title || ''
          });
          if (part > 1) {
            fFinal.inWorldAuthor = ''; fFinal.inWorldRecipient = ''; fFinal.date = '';
          }
          processed.push(fFinal);
        }
      } else {
        processed.push(fragment);
      }
    });

    processed.forEach(function (fragment) {
      var body = fragment.bodyText || fragment.body || fragment.content || '';
      // Reduced density: lower max chars per page weight
      var weight = Math.max(1, Math.min(readingLength(body) / 600, 2.5));
      if (current.length >= 2 || (current.length >= 1 && load + weight > 1.35)) {
        pages.push(current);
        current = [];
        load = 0;
      }
      current.push(fragment);
      load += weight;
    });

    if (current.length) pages.push(current);
    return pages;
  }

  function makePageShell(type, title, kicker) {
    var page = make('section', 'booklet-page');
    page.setAttribute('data-page-type', type);

    var frame = make('div', 'page-frame');
    var header = make('header', 'page-header');
    var kickerEl = make('div', 'page-kicker', kicker || '');
    var titleEl = make('h2', 'page-title', title || '');
    header.appendChild(kickerEl);
    header.appendChild(titleEl);
    frame.appendChild(header);
    page.appendChild(frame);

    return {
      page: page,
      frame: frame
    };
  }

  function buildCoverPage(data) {
    var shell = makePageShell('cover', data.meta.blockTitle, data.cover.designation || '');
    shell.page.classList.add('page-cover');

    if (data.cover.designation) {
      shell.frame.insertBefore(make('div', 'doc-designation', data.cover.designation), shell.frame.firstChild);
    }

    var hero = make('div', 'cover-hero');
    hero.appendChild(make('h1', 'cover-headline', data.meta.blockTitle || 'LiftRPG'));
    hero.appendChild(make('p', 'cover-tagline', data.cover.tagline || ''));

    var colophon = make('div', 'cover-colophon');
    (data.cover.colophonLines || []).forEach(function (line) {
      colophon.appendChild(make('div', 'cover-colophon-line', line));
    });

    shell.frame.appendChild(hero);
    shell.frame.appendChild(colophon);
    return shell.page;
  }

  function buildRulesPage(data) {
    var pages = [];
    var left = makePageShell('rules', data.rulesSpread.leftPage.title, 'Orientation');
    var body = make('div', 'rules-stack');
    (data.rulesSpread.leftPage.sections || []).forEach(function (section) {
      var block = make('section', 'doc-block');
      block.appendChild(make('div', 'doc-label', section.heading || 'Procedure'));
      splitParagraphs(section.body || section.text).forEach(function (para) {
        block.appendChild(make('p', 'body-copy', para));
      });
      body.appendChild(block);
    });

    var reEntry = data.rulesSpread.leftPage.reEntryRule;
    var reEntryText = typeof reEntry === 'string' ? reEntry : reEntry && reEntry.ruleText;
    if (reEntryText) {
      var reEntryBlock = make('section', 'doc-block doc-block-callout');
      reEntryBlock.appendChild(make('div', 'doc-label', 'Re-entry Procedure'));
      splitParagraphs(reEntryText).forEach(function (para) {
        reEntryBlock.appendChild(make('p', 'body-copy', para));
      });
      body.appendChild(reEntryBlock);
    }
    left.frame.appendChild(body);
    pages.push(left.page);

    var right = makePageShell('log', data.rulesSpread.rightPage.title, 'Record');
    var logGrid = make('div', 'record-grid');
    var componentType = (data.meta.weeklyComponentType || 'component').replace(/-/g, ' ');
    (data.weeks || []).forEach(function (week) {
      var row = make('div', 'record-row');
      row.appendChild(make('div', 'record-week', 'Week ' + pad2(week.weekNumber)));
      row.appendChild(make('div', 'record-cells record-cells-value'));
      if (!week.isBossWeek) {
        row.appendChild(make('div', 'record-note', week.weeklyComponent && week.weeklyComponent.extractionInstruction || componentType));
      } else {
        row.appendChild(make('div', 'record-note', 'Hold until convergence protocol.'));
      }
      logGrid.appendChild(row);
    });
    right.frame.appendChild(make('p', 'body-copy lead-copy', data.rulesSpread.rightPage.instruction || ''));
    right.frame.appendChild(logGrid);

    var finalBlock = make('section', 'doc-block doc-block-callout');
    finalBlock.appendChild(make('div', 'doc-label', 'Final Assembly'));
    finalBlock.appendChild(makePasswordBoxes(getPasswordLength(data, (data.meta && data.meta.weekCount) || 6), 'password-box'));
    finalBlock.appendChild(make('p', 'body-copy', 'Return to liftrpg.co → Render with the completed word to unlock the final document.'));
    right.frame.appendChild(finalBlock);
    pages.push(right.page);

    return pages;
  }

  function extractFragmentRefs(node) {
    var refs = [];
    if (!node || typeof node !== 'object') return refs;
    if (Array.isArray(node)) {
      node.forEach(function (child) {
        refs = refs.concat(extractFragmentRefs(child));
      });
      return refs;
    }
    if (typeof node.fragmentRef === 'string') {
      refs.push(node.fragmentRef);
    }
    Object.keys(node).forEach(function (key) {
      if (typeof node[key] === 'string') {
        var match = node[key].match(/\bF\.\d+\b/g);
        if (match) refs = refs.concat(match);
      } else if (typeof node[key] === 'object') {
        refs = refs.concat(extractFragmentRefs(node[key]));
      }
    });
    return refs;
  }

  function buildWeekPages(data, renderedFragments) {
    var pages = [];
    renderedFragments = renderedFragments || {};
    (data.weeks || []).forEach(function (week) {
      chunkSessions(week).forEach(function (chunk, chunkIndex, chunkList) {
        pages.push(buildWorkoutPage(data, week, chunk, chunkIndex, chunkList.length));
      });
      pages.push(week.isBossWeek ? buildBossPage(data, week) : buildFieldOpsPages(data, week));

      var refs = extractFragmentRefs(week);
      var uniqueRefs = refs.filter(function (r, idx) { return refs.indexOf(r) === idx; });
      var fragmentsForWeek = (data.fragments || []).filter(function (f) {
        return uniqueRefs.indexOf(f.id) !== -1 && !renderedFragments[f.id];
      });

      if (fragmentsForWeek.length > 0) {
        fragmentsForWeek.forEach(function (f) { renderedFragments[f.id] = true; });
        pages = pages.concat(paginateFragments(fragmentsForWeek).map(function (pageFragments, index) {
          var shell = makePageShell('fragments', 'Recovered Documents', 'Week ' + pad2(week.weekNumber) + ' · Archive');
          var stack = make('div', 'fragment-stack');
          pageFragments.forEach(function (fragment) {
            stack.appendChild(renderFragment(fragment));
          });
          shell.frame.appendChild(stack);
          return shell.page;
        }));
      }
    });
    return pages.flat();
  }

  function buildWorkoutPage(data, week, sessions, chunkIndex, chunkCount) {
    var shell = makePageShell(
      'week-sessions',
      week.title,
      'Week ' + pad2(week.weekNumber) + (chunkCount > 1 ? ' · Session Log ' + (chunkIndex + 1) + '/' + chunkCount : ' · Session Log')
    );
    shell.page.classList.add('page-workout-form');

    var intro = make('section', 'week-form-intro');
    if (chunkIndex === 0) {
      intro.appendChild(make('div', 'doc-label', week.epigraph && week.epigraph.attribution || ''));
      intro.appendChild(make('p', 'body-copy epigraph-copy', week.epigraph && week.epigraph.text || ''));
      shell.frame.appendChild(intro);
    }

    var sheet = make('section', 'workout-sheet');
    sheet.appendChild(buildWorkoutSheetMeta(week, chunkIndex, chunkCount));

    var cards = make('div', 'session-ledger-stack');
    sessions.forEach(function (session) {
      cards.appendChild(buildSessionLedger(session));
    });
    sheet.appendChild(cards);

    var footer = make('section', 'week-capture');
    footer.appendChild(make('div', 'doc-label', week.isBossWeek ? 'Terminal Week' : 'Weekly Capture'));
    footer.appendChild(make('p', 'body-copy body-copy-tight', week.isBossWeek
      ? 'Record your final sessions as performed. Convergence happens on the facing operations page.'
      : week.weeklyComponent && week.weeklyComponent.extractionInstruction || 'Log the derived weekly value after this week’s field operation.'));
    sheet.appendChild(footer);
    shell.frame.appendChild(sheet);
    return shell.page;
  }

  function buildWorkoutSheetMeta(week, chunkIndex, chunkCount) {
    var meta = make('div', 'workout-sheet-meta');
    meta.appendChild(buildMetaField('Week', pad2(week.weekNumber)));
    meta.appendChild(buildMetaField('Block', week.title || 'Training Record'));
    meta.appendChild(buildMetaField('Section', chunkCount > 1 ? 'Log ' + (chunkIndex + 1) + '/' + chunkCount : 'Full Log'));
    meta.appendChild(buildMetaField('Status', week.isBossWeek ? 'Terminal' : (week.isDeload ? 'Reduced Load' : 'Active')));
    return meta;
  }

  function buildMetaField(label, value) {
    var field = make('div', 'workout-meta-field');
    field.appendChild(make('div', 'workout-meta-label', label));
    field.appendChild(make('div', 'workout-meta-value', value || ''));
    return field;
  }

  function buildSessionLedger(session) {
    var ledger = make('article', 'session-ledger');
    var top = make('div', 'session-ledger-head');
    top.appendChild(renderSessionLabel(session.label));
    if (session.fragmentRef) top.appendChild(make('div', 'session-fragment', 'Fragment ' + session.fragmentRef));
    ledger.appendChild(top);

    var body = make('div', 'session-ledger-body');
    var exercises = make('div', 'exercise-table');
    (session.exercises || []).forEach(function (exercise) {
      var block = make('section', 'exercise-block');
      block.appendChild(renderExerciseLedger(exercise));
      if (exercise.notes) {
        var notes = make('div', 'exercise-note', exercise.notes);
        block.appendChild(notes);
      }
      exercises.appendChild(block);
    });
    body.appendChild(exercises);

    if (session.storyPrompt || session.binaryChoice) {
      var marginal = make('div', 'session-marginalia');
      if (session.storyPrompt) {
        splitParagraphs(session.storyPrompt).forEach(function (para) {
          marginal.appendChild(make('p', 'body-copy body-copy-tight', para));
        });
      }
      if (session.binaryChoice) {
        var choice = make('div', 'binary-choice');
        choice.appendChild(make('div', 'doc-label', session.binaryChoice.choiceLabel || 'Route Decision'));
        var columns = make('div', 'binary-choice-options');
        var a = make('div', 'binary-choice-option');
        a.appendChild(make('div', 'binary-choice-letter', 'A'));
        a.appendChild(make('p', 'body-copy', session.binaryChoice.promptA || ''));
        var b = make('div', 'binary-choice-option');
        b.appendChild(make('div', 'binary-choice-letter', 'B'));
        b.appendChild(make('p', 'body-copy', session.binaryChoice.promptB || ''));
        columns.appendChild(a);
        columns.appendChild(b);
        choice.appendChild(columns);
        marginal.appendChild(choice);
      }
      body.appendChild(marginal);
    }

    ledger.appendChild(body);
    return ledger;
  }

  function buildSessionCard(session) {
    var card = make('article', 'session-card');
    var top = make('div', 'session-head');
    top.appendChild(renderSessionLabel(session.label));
    if (session.fragmentRef) top.appendChild(make('div', 'session-fragment', 'Fragment ' + session.fragmentRef));
    card.appendChild(top);

    var exercises = make('div', 'exercise-table');
    (session.exercises || []).forEach(function (exercise) {
      var block = make('section', 'exercise-block');
      block.appendChild(renderExerciseLedger(exercise));
      if (exercise.notes) {
        var notes = make('div', 'exercise-note', exercise.notes);
        block.appendChild(notes);
      }
      exercises.appendChild(block);
    });
    card.appendChild(exercises);

    if (session.storyPrompt) {
      var narrative = make('div', 'session-narrative');
      splitParagraphs(session.storyPrompt).forEach(function (para) {
        narrative.appendChild(make('p', 'body-copy', para));
      });
      card.appendChild(narrative);
    }

    if (session.binaryChoice) {
      var choice = make('div', 'binary-choice');
      choice.appendChild(make('div', 'doc-label', session.binaryChoice.choiceLabel || 'Route Decision'));
      var columns = make('div', 'binary-choice-options');
      var a = make('div', 'binary-choice-option');
      a.appendChild(make('div', 'binary-choice-letter', 'A'));
      a.appendChild(make('p', 'body-copy', session.binaryChoice.promptA || ''));
      var b = make('div', 'binary-choice-option');
      b.appendChild(make('div', 'binary-choice-letter', 'B'));
      b.appendChild(make('p', 'body-copy', session.binaryChoice.promptB || ''));
      columns.appendChild(a);
      columns.appendChild(b);
      choice.appendChild(columns);
      card.appendChild(choice);
    }

    return card;
  }

  function renderSessionLabel(label) {
    var text = typeof label === 'string' && label.trim() ? label.trim() : 'Session';
    var parts = text.split('·').map(function (part) {
      return part.trim();
    }).filter(Boolean);
    if (parts.length < 2) return make('div', 'session-label', text);

    var group = make('div', 'session-docket');
    var dayField = make('div', 'session-docket-field');
    dayField.appendChild(make('div', 'session-docket-label', 'Day'));
    dayField.appendChild(make('div', 'session-label', parts[0]));
    group.appendChild(dayField);

    var typeField = make('div', 'session-docket-field');
    typeField.appendChild(make('div', 'session-docket-label', 'Assignment'));
    typeField.appendChild(make('div', 'session-subtype', parts.slice(1).join(' · ')));
    group.appendChild(typeField);
    return group;
  }

  function renderExerciseLedger(exercise) {
    var row = make('div', 'exercise-row');
    row.appendChild(make('div', 'exercise-name', exercise.name || 'Lift'));
    row.appendChild(make('div', 'exercise-leader'));

    var load = make('div', 'exercise-load');
    var loadLine = make('div', 'exercise-load-line');
    loadLine.appendChild(make('span', 'exercise-guide', getLoadGuide(exercise)));
    load.appendChild(loadLine);
    if (showLoadSuffix(exercise)) {
      load.appendChild(make('span', 'exercise-load-suffix', 'x'));
    }
    row.appendChild(load);
    row.appendChild(renderSetBoxes(exercise));
    return row;
  }

  function renderSetBoxes(exercise) {
    var grid = make('div', 'set-grid');
    var reps = getExerciseRepGuides(exercise);
    var count = reps.length;
    for (var index = 0; index < count; index++) {
      var cell = make('div', 'set-cell');
      var box = make('div', 'set-box');
      box.appendChild(make('span', 'set-guide', reps[index]));
      cell.appendChild(box);
      grid.appendChild(cell);
    }
    return grid;
  }

  function getExerciseSetCount(exercise) {
    if (typeof exercise.sets === 'number' && exercise.sets > 0) return Math.min(exercise.sets, 10);
    if (typeof exercise.repsPerSet === 'string' && exercise.repsPerSet.indexOf('/') !== -1) {
      return Math.min(exercise.repsPerSet.split('/').length, 10);
    }
    return 3;
  }

  function getExerciseRepGuides(exercise) {
    if (typeof exercise.repsPerSet === 'number') {
      return repeatGuide(String(exercise.repsPerSet), getExerciseSetCount(exercise));
    }
    if (typeof exercise.repsPerSet === 'string') {
      if (exercise.repsPerSet.indexOf('/') !== -1) {
        return exercise.repsPerSet.split('/').map(function (part) {
          return part.trim();
        }).filter(Boolean).slice(0, 10);
      }
      return repeatGuide(exercise.repsPerSet.trim(), getExerciseSetCount(exercise));
    }
    return repeatGuide('', getExerciseSetCount(exercise));
  }

  function repeatGuide(value, count) {
    var items = [];
    for (var i = 0; i < count; i++) items.push(value);
    return items;
  }

  function getLoadGuide(exercise) {
    if (typeof exercise.weightField === 'string' && exercise.weightField.trim()) {
      return exercise.weightField.trim();
    }
    if (exercise.weightField === false) return 'done';
    return 'weight';
  }

  function showLoadSuffix(exercise) {
    var guide = getLoadGuide(exercise).toLowerCase();
    return guide !== 'done';
  }

  function buildFieldOpsPages(data, week) {
    var fieldOps = week.fieldOps || {};
    var pages = [];
    var splitOracle = fieldOps.oracleTable && (fieldOps.oracleTable.entries || []).length > 8;

    var first = makePageShell('field-ops', fieldOps.mapState && fieldOps.mapState.title || week.title, 'Week ' + pad2(week.weekNumber) + ' · Field Operations');
    first.page.classList.add('page-field-board');
    var board = make('div', 'field-board');
    if (fieldOps.mapState) board.appendChild(renderMapSection(fieldOps.mapState));
    var appendix = make('div', !splitOracle && fieldOps.oracleTable ? 'field-appendix field-appendix-dual' : 'field-appendix');
    if (week.gameplayClocks && week.gameplayClocks.length > 0) {
      appendix.appendChild(renderGameplayClocks(week.gameplayClocks));
    }
    if (fieldOps.cipher) appendix.appendChild(renderCipherSection(fieldOps.cipher, week.weeklyComponent));
    if (!splitOracle && fieldOps.oracleTable) appendix.appendChild(renderOracleSection(fieldOps.oracleTable));
    if (appendix.children.length) board.appendChild(appendix);
    first.frame.appendChild(board);
    pages.push(first.page);

    if (splitOracle && fieldOps.oracleTable) {
      var second = makePageShell('oracle', fieldOps.oracleTable.title || 'Oracle', 'Week ' + pad2(week.weekNumber) + ' · Consequence Table');
      second.page.classList.add('page-field-board');
      var oracleSheet = make('div', 'field-board');
      oracleSheet.appendChild(renderOracleSection(fieldOps.oracleTable));
      second.frame.appendChild(oracleSheet);
      pages.push(second.page);
    }

    return pages;
  }

  function renderGameplayClocks(clocks) {
    var section = make('section', 'ops-section ops-clocks');
    section.appendChild(make('div', 'doc-label', 'Active Clocks'));
    var grid = make('div', 'clock-grid');
    (clocks || []).forEach(function (clock) {
      var item = make('div', 'clock-item');
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('class', 'progress-clock-svg');
      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '50');
      circle.setAttribute('cy', '50');
      circle.setAttribute('r', '48');
      circle.setAttribute('fill', 'var(--track-fill)');
      circle.setAttribute('stroke', 'var(--page-rule)');
      circle.setAttribute('stroke-width', '2');
      svg.appendChild(circle);
      var segments = parseInt(clock.segments, 10) || 4;
      for (var i = 0; i < segments; i++) {
        var angle = (i * 360) / segments;
        var rad = (angle - 90) * (Math.PI / 180);
        var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '50');
        line.setAttribute('y1', '50');
        line.setAttribute('x2', String(50 + 48 * Math.cos(rad)));
        line.setAttribute('y2', String(50 + 48 * Math.sin(rad)));
        line.setAttribute('stroke', 'var(--page-rule)');
        line.setAttribute('stroke-width', '1.5');
        svg.appendChild(line);
      }
      var visuals = make('div', 'clock-visuals');
      visuals.appendChild(svg);
      item.appendChild(visuals);
      var info = make('div', 'clock-info');
      info.appendChild(make('div', 'clock-name', clock.clockName || 'Clock'));
      if (clock.consequenceOnFull) {
        info.appendChild(make('div', 'clock-consequence', 'ON FULL: ' + clock.consequenceOnFull));
      }
      item.appendChild(info);
      grid.appendChild(item);
    });
    section.appendChild(grid);
    return section;
  }

  function renderMapSection(mapState) {
    var section = make('section', 'ops-section ops-map survey-board');
    section.appendChild(make('div', 'doc-label', mapState.title || 'Map'));
    if (mapState.floorLabel) section.appendChild(make('div', 'survey-board-designation', mapState.floorLabel));
    if (mapState.mapNote) section.appendChild(make('p', 'body-copy body-copy-tight', mapState.mapNote));

    if (mapState.mapType === 'point-to-point') {
      section.appendChild(renderPointMap(mapState));
    } else if (mapState.mapType === 'linear-track') {
      section.appendChild(renderLinearMap(mapState));
    } else if (mapState.mapType === 'player-drawn') {
      section.appendChild(renderPlayerMap(mapState));
    } else {
      section.appendChild(renderGridMap(mapState));
    }
    section.appendChild(renderMapLegend(mapState));
    return section;
  }

  function renderGridMap(mapState) {
    var gridData = mapState.gridDimensions || { columns: 6, rows: 5 };
    var wrap = make('div', 'map-board');
    wrap.style.setProperty('--grid-columns', gridData.columns);
    wrap.style.setProperty('--grid-rows', gridData.rows);

    var tilesByPos = {};
    (mapState.tiles || []).forEach(function (tile) {
      tilesByPos[tile.col + ':' + tile.row] = tile;
    });

    wrap.appendChild(make('div', 'map-axis-corner'));
    for (var colIndex = 1; colIndex <= gridData.columns; colIndex++) {
      wrap.appendChild(make('div', 'map-axis-label map-axis-label-top', String(colIndex)));
    }

    for (var row = 1; row <= gridData.rows; row++) {
      wrap.appendChild(make('div', 'map-axis-label map-axis-label-side', String.fromCharCode(64 + row)));
      for (var col = 1; col <= gridData.columns; col++) {
        var tile = tilesByPos[col + ':' + row] || {};
        var cell = make('div', 'map-grid-cell map-board-cell');
        cell.setAttribute('data-state', tile.type || 'empty');
        cell.setAttribute('data-coord', String.fromCharCode(64 + row) + col);
        var label = tile.label || (mapState.currentPosition && mapState.currentPosition.col === col && mapState.currentPosition.row === row ? 'YOU' : '');
        cell.appendChild(make('div', 'map-grid-coord', String.fromCharCode(64 + row) + col));
        cell.appendChild(make('div', 'map-grid-label', label));
        if (tile.annotation) cell.appendChild(make('div', 'map-grid-note', tile.annotation));
        wrap.appendChild(cell);
      }
    }
    return wrap;
  }

  function renderMapLegend(mapState) {
    var section = make('div', 'map-legend');
    var seen = {};
    (mapState.tiles || []).forEach(function (tile) {
      var state = tile.type || 'empty';
      if (seen[state]) return;
      seen[state] = true;
      var item = make('div', 'map-legend-item');
      var swatch = make('div', 'map-legend-swatch');
      swatch.setAttribute('data-state', state);
      item.appendChild(swatch);
      item.appendChild(make('div', 'map-legend-label', state.replace(/-/g, ' ')));
      section.appendChild(item);
    });
    return section;
  }

  function renderPointMap(mapState) {
    var wrap = make('div', 'map-network');
    (mapState.nodes || []).forEach(function (node) {
      var card = make('div', 'map-node');
      card.setAttribute('data-state', node.state || 'empty');
      card.appendChild(make('div', 'map-node-name', node.label || node.id));
      card.appendChild(make('div', 'map-node-meta', node.id || ''));
      wrap.appendChild(card);
    });
    return wrap;
  }

  function renderLinearMap(mapState) {
    var wrap = make('div', 'map-track');
    (mapState.positions || []).forEach(function (position) {
      var step = make('div', 'map-track-step');
      step.setAttribute('data-state', position.state || 'empty');
      step.appendChild(make('div', 'map-track-index', String(position.index)));
      step.appendChild(make('div', 'map-track-label', position.label || ''));
      wrap.appendChild(step);
    });
    return wrap;
  }

  function renderPlayerMap(mapState) {
    var gridData = mapState.dimensions || { columns: 12, rows: 8 };
    var wrap = make('div', 'player-map');
    wrap.style.setProperty('--grid-columns', gridData.columns);
    wrap.style.setProperty('--grid-rows', gridData.rows);
    wrap.setAttribute('data-canvas-type', mapState.canvasType || 'dot-grid');
    (mapState.prompts || []).slice(0, 4).forEach(function (prompt) {
      wrap.appendChild(make('div', 'player-map-prompt', prompt));
    });
    return wrap;
  }

  function renderCipherSection(cipher, weeklyComponent) {
    var section = make('section', 'ops-section ops-cipher');
    section.appendChild(make('div', 'doc-label', cipher.title || 'Cipher'));
    if (cipher.body && cipher.body.displayText) {
      splitParagraphs(cipher.body.displayText).forEach(function (para) {
        section.appendChild(make('p', 'body-copy', para));
      });
    }

    if (cipher.body && cipher.body.key) {
      var key = make('div', 'cipher-key');
      splitParagraphs(cipher.body.key).forEach(function (line) {
        key.appendChild(make('div', 'cipher-key-line', line));
      });
      section.appendChild(key);
    }

    if (cipher.body && cipher.body.workSpace) {
      section.appendChild(renderWorkspace(cipher.body.workSpace));
    }

    var extraction = make('div', 'cipher-outcome');
    extraction.appendChild(make('div', 'doc-label', 'Extraction'));
    extraction.appendChild(make('p', 'body-copy', cipher.extractionInstruction || (weeklyComponent && weeklyComponent.extractionInstruction) || 'Record the derived value.'));
    section.appendChild(extraction);
    return section;
  }

  function renderWorkspace(workSpace) {
    var grid = make('div', 'cipher-workspace');
    var rows = Math.max(2, Math.min(workSpace.rows || 4, 8));
    var cols = Math.max(4, Math.min(workSpace.cols || 10, 14));
    grid.style.setProperty('--workspace-columns', cols);
    for (var i = 0; i < rows * cols; i++) {
      grid.appendChild(make('div', 'cipher-cell'));
    }
    return grid;
  }

  function renderOracleSection(oracle) {
    var section = make('section', 'ops-section ops-oracle');
    section.appendChild(make('div', 'doc-label', oracle.title || 'Oracle'));
    if (oracle.instruction) section.appendChild(make('p', 'body-copy body-copy-tight', oracle.instruction));

    var list = make('div', 'oracle-list');
    (oracle.entries || []).forEach(function (entry) {
      var row = make('article', 'oracle-entry');
      row.setAttribute('data-entry-type', entry.type || 'fragment');
      row.appendChild(make('div', 'oracle-roll', entry.roll || ''));
      var content = make('div', 'oracle-copy');
      content.appendChild(make('div', 'oracle-text', entry.text || ''));
      if (entry.paperAction) content.appendChild(make('div', 'oracle-action', entry.paperAction));
      if (entry.fragmentRef) content.appendChild(make('div', 'oracle-fragment', 'Retrieve ' + entry.fragmentRef));
      row.appendChild(content);
      list.appendChild(row);
    });
    section.appendChild(list);
    return section;
  }

  function buildBossPage(data, week) {
    var boss = week.bossEncounter || {};
    var shell = makePageShell('boss', boss.title || week.title, 'Week ' + pad2(week.weekNumber) + ' · Convergence');
    var layout = make('div', 'boss-layout');

    var story = make('section', 'ops-section boss-story');
    story.appendChild(make('div', 'doc-label', 'Terminal Document'));
    splitParagraphs(boss.narrative || '').forEach(function (para) {
      story.appendChild(make('p', 'body-copy', para));
    });
    if (boss.mechanismDescription) {
      story.appendChild(make('div', 'doc-label', 'Procedure'));
      splitParagraphs(boss.mechanismDescription).forEach(function (para) {
        story.appendChild(make('p', 'body-copy', para));
      });
    }
    if (boss.binaryChoiceAcknowledgement) {
      story.appendChild(make('div', 'doc-label', 'Route Memory'));
      if (boss.binaryChoiceAcknowledgement.ifA) story.appendChild(make('p', 'body-copy', 'If you marked A: ' + boss.binaryChoiceAcknowledgement.ifA));
      if (boss.binaryChoiceAcknowledgement.ifB) story.appendChild(make('p', 'body-copy', 'If you marked B: ' + boss.binaryChoiceAcknowledgement.ifB));
    }

    var decode = make('section', 'ops-section boss-decode');
    decode.appendChild(make('div', 'doc-label', 'Decoding Key'));
    if (boss.decodingKey && boss.decodingKey.instruction) decode.appendChild(make('p', 'body-copy', boss.decodingKey.instruction));
    if (boss.decodingKey && boss.decodingKey.referenceTable) {
      var table = make('div', 'reference-table');
      splitParagraphs(boss.decodingKey.referenceTable).forEach(function (line) {
        table.appendChild(make('div', 'reference-line', line));
      });
      decode.appendChild(table);
    }

    decode.appendChild(make('div', 'doc-label', 'Recorded Inputs'));
    var inputChips = make('div', 'chip-row');
    (boss.componentInputs || []).forEach(function (item) {
      inputChips.appendChild(make('div', 'chip', item));
    });
    decode.appendChild(inputChips);

    decode.appendChild(make('div', 'doc-label', 'Final Word'));
    decode.appendChild(makePasswordBoxes(getPasswordLength(data, (boss.componentInputs || []).length || 6), 'password-box password-box-large'));
    decode.appendChild(make('p', 'body-copy', boss.passwordRevealInstruction || 'When the final word is assembled, enter it at liftrpg.co.'));

    layout.appendChild(story);
    layout.appendChild(decode);
    shell.frame.appendChild(layout);
    return shell.page;
  }

  function buildFragmentPages(data, renderedFragments) {
    renderedFragments = renderedFragments || {};
    var remaining = (data.fragments || []).filter(function (f) {
      return !renderedFragments[f.id];
    });
    return paginateFragments(remaining).map(function (pageFragments, index) {
      var shell = makePageShell('fragments', 'Recovered Documents', 'Appendix ' + pad2(index + 1));
      var stack = make('div', 'fragment-stack');
      pageFragments.forEach(function (fragment) {
        stack.appendChild(renderFragment(fragment));
      });
      shell.frame.appendChild(stack);
      return shell.page;
    });
  }

  function renderFragment(fragment) {
    var doc = make('article', 'fragment-card');
    doc.setAttribute('data-document-type', fragment.documentType || 'memo');
    if (fragment.designSpec && fragment.designSpec.paperTone) doc.setAttribute('data-paper-tone', fragment.designSpec.paperTone);
    if (fragment.designSpec && fragment.designSpec.headerStyle) doc.setAttribute('data-header-style', fragment.designSpec.headerStyle);
    if (fragment.designSpec && typeof fragment.designSpec.hasRedactions !== 'undefined') doc.setAttribute('data-has-redactions', String(fragment.designSpec.hasRedactions));
    if (fragment.designSpec && typeof fragment.designSpec.hasAnnotations !== 'undefined') doc.setAttribute('data-has-annotations', String(fragment.designSpec.hasAnnotations));
    var fragmentTop = make('div', 'fragment-topline');
    fragmentTop.appendChild(make('div', 'doc-label', fragment.id || fragment.documentType || 'Document'));
    fragmentTop.appendChild(make('div', 'fragment-type-badge', (fragment.documentType || 'document').replace(/([A-Z])/g, ' $1').trim()));
    doc.appendChild(fragmentTop);
    if (fragment.title) doc.appendChild(make('h3', 'fragment-title', fragment.title));

    var meta = [];
    if (fragment.inWorldAuthor) meta.push('From: ' + fragment.inWorldAuthor);
    if (fragment.inWorldRecipient) meta.push('To: ' + fragment.inWorldRecipient);
    if (fragment.date) meta.push('Date: ' + fragment.date);
    if (fragment.inWorldPurpose) meta.push('Purpose: ' + fragment.inWorldPurpose);
    if (meta.length) {
      var metaBox = make('div', 'fragment-meta');
      meta.forEach(function (line) {
        metaBox.appendChild(make('div', 'fragment-meta-line', line));
      });
      doc.appendChild(metaBox);
    }

    splitParagraphs(fragment.bodyText || fragment.body || fragment.content || '').forEach(function (para) {
      doc.appendChild(make('p', 'body-copy', para));
    });
    return doc;
  }

  function buildAssemblyPage(data) {
    var shell = makePageShell('assembly', 'Password Assembly', 'Convergence Log');
    shell.frame.appendChild(make('p', 'body-copy lead-copy', 'Transfer each recorded weekly value into the final assembly ladder. Decode only when the boss page gives the rule.'));
    var list = make('div', 'assembly-grid');
    (data.weeks || []).forEach(function (week) {
      var row = make('div', 'assembly-row');
      row.appendChild(make('div', 'assembly-week', 'Week ' + pad2(week.weekNumber)));
      row.appendChild(make('div', 'assembly-input'));
      row.appendChild(make('div', 'assembly-arrow', '→'));
      row.appendChild(make('div', 'assembly-output'));
      list.appendChild(row);
    });
    shell.frame.appendChild(list);
    shell.frame.appendChild(makePasswordBoxes(getPasswordLength(data, (data.meta && data.meta.weekCount) || 6), 'password-box password-box-large'));
    return shell.page;
  }

  function buildLockedEndingPage(data) {
    var shell = makePageShell('ending-locked', 'Final Document', 'Encrypted');
    shell.frame.appendChild(make('p', 'body-copy lead-copy', 'This final page remains sealed until the completed password is entered above. The booklet should give you everything you need.'));
    if (data.endings && data.endings.length) {
      var variants = make('div', 'chip-row');
      data.endings.forEach(function (ending) {
        variants.appendChild(make('div', 'chip chip-muted', ending.variant || 'Variant'));
      });
      shell.frame.appendChild(variants);
    }
    return shell.page;
  }

  function buildUnlockedEndingPage(payload) {
    var shell = makePageShell('ending-unlocked', payload.title || 'Unlocked Document', payload.kicker || 'Unlocked');
    if (payload.documentType) shell.frame.appendChild(make('div', 'doc-label', payload.documentType));
    splitParagraphs(payload.body || payload.content || '').forEach(function (para) {
      shell.frame.appendChild(make('p', 'body-copy ending-copy', para));
    });
    if (payload.finalLine) {
      shell.frame.appendChild(make('p', 'body-copy ending-final-line', payload.finalLine));
    }
    return shell.page;
  }

  function buildBackCover(data) {
    var shell = makePageShell('back-cover', data.meta.blockTitle, 'LiftRPG');
    shell.page.classList.add('page-back');
    shell.frame.appendChild(make('p', 'body-copy lead-copy', 'Printed by hand, completed in pencil, resolved through repetition.'));
    var facts = make('div', 'chip-row');
    facts.appendChild(make('div', 'chip', (data.meta.weekCount || 0) + ' weeks'));
    facts.appendChild(make('div', 'chip', (data.meta.totalSessions || 0) + ' sessions'));
    facts.appendChild(make('div', 'chip', (data.meta.weeklyComponentType || 'component').replace(/-/g, ' ')));
    shell.frame.appendChild(facts);
    if (data.meta.generatedAt) shell.frame.appendChild(make('div', 'back-meta', 'Generated ' + data.meta.generatedAt));
    return shell.page;
  }

  function buildNotesPage(index) {
    var shell = makePageShell('notes', 'Field Notes', 'Pad ' + pad2(index + 1));
    var notes = make('div', 'notes-grid');
    for (var i = 0; i < 36; i++) {
      notes.appendChild(make('div', 'notes-cell'));
    }
    shell.frame.appendChild(notes);
    return shell.page;
  }

  function makePasswordBoxes(count, className) {
    var row = make('div', 'password-box-row');
    for (var i = 0; i < count; i++) {
      row.appendChild(make('div', className));
    }
    return row;
  }

  function getPasswordLength(data, fallback) {
    var meta = data.meta || {};
    if (typeof meta.passwordLength === 'number' && meta.passwordLength > 0) return meta.passwordLength;
    if (meta.passwordPlaintext) return meta.passwordPlaintext.length;
    return fallback || 6;
  }

  function buildPages(data) {
    var pages = [];
    var renderedFragments = {};
    pages.push(buildCoverPage(data));
    pages = pages.concat(buildRulesPage(data));
    pages = pages.concat(buildWeekPages(data, renderedFragments));
    pages = pages.concat(buildFragmentPages(data, renderedFragments));
    pages.push(buildAssemblyPage(data));
    pages.push(state.unlockedEnding ? buildUnlockedEndingPage(state.unlockedEnding) : buildLockedEndingPage(data));
    while ((pages.length + 1) % 4 !== 0) {
      pages.push(buildNotesPage(pages.length));
    }
    pages.push(buildBackCover(data));
    return pages;
  }

  function renderBooklet(data) {
    refs.booklet.innerHTML = '';
    refs.booklet.setAttribute('data-layout-mode', state.layoutMode);
    applyTheme(refs.booklet, resolveTheme(data));

    var pages = buildPages(data);
    
    pages.forEach(function (page, index) {
      page.setAttribute('data-page-number', String(index + 1));
      page.classList.add((index + 1) % 2 === 0 ? 'page-left' : 'page-right');
    });

    var grid = make('div', 'booklet-grid');

    if (state.layoutMode === 'single') {
      pages.forEach(function (page) {
        grid.appendChild(page);
      });
    } else if (state.layoutMode === 'booklet') {
      var n = pages.length;
      if (n % 4 !== 0) {
        while (n % 4 !== 0) {
          var blank = make('section', 'booklet-page page-blank');
          pages.push(blank);
          n = pages.length;
        }
      }
      for (var i = 0; i < n / 2; i += 2) {
        var spreadOut = make('div', 'spread-row printer-sheet');
        spreadOut.appendChild(pages[n - 1 - i]);
        spreadOut.appendChild(pages[i]);
        grid.appendChild(spreadOut);

        if (i + 1 < n / 2) {
          var spreadIn = make('div', 'spread-row printer-sheet');
          spreadIn.appendChild(pages[i + 1]);
          spreadIn.appendChild(pages[n - 2 - i]);
          grid.appendChild(spreadIn);
        }
      }
    } else {
      var nReader = pages.length;
      var coverSpread = make('div', 'spread-row reader-spread');
      coverSpread.appendChild(make('div', 'spread-spacer'));
      coverSpread.appendChild(pages[0]);
      grid.appendChild(coverSpread);

      for (var j = 1; j < nReader - 1; j += 2) {
        var rSpread = make('div', 'spread-row reader-spread');
        rSpread.appendChild(pages[j]);
        if (j + 1 < nReader) rSpread.appendChild(pages[j + 1]);
        else rSpread.appendChild(make('div', 'spread-spacer'));
        grid.appendChild(rSpread);
      }

      if (nReader % 2 === 0) {
        var backSpread = make('div', 'spread-row reader-spread');
        backSpread.appendChild(pages[nReader - 1]);
        backSpread.appendChild(make('div', 'spread-spacer'));
        grid.appendChild(backSpread);
      }
    }

    refs.booklet.appendChild(grid);
    
    // Phase 1 + 2: Enforce page fit dynamically after painting
    pages.forEach(function (page) {
      var frame = page.querySelector('.page-frame');
      if (!frame) return;

      var clientH = frame.clientHeight;
      if (clientH === 0) return; // not effectively painted

      var trueH = frame.scrollHeight;
      var debug = new URLSearchParams(window.location.search).get('debugLayout') === '1';

      if (trueH <= clientH) return;

      if (debug) console.log('Overflow detected on', page.getAttribute('data-page-type'), '(Safe:', clientH, '/ True:', trueH, 'px)');

      var levels = ['1', '2', '3'];
      for (var k = 0; k < levels.length; k++) {
        page.setAttribute('data-fit-level', levels[k]);
        trueH = frame.scrollHeight;
        if (trueH <= clientH) {
          if (debug) console.log('Resolved with compaction fit-' + levels[k]);
          return;
        }
      }

      var scale = clientH / trueH;
      page.setAttribute('data-fit-level', '4');
      frame.style.transform = 'scale(' + scale.toFixed(3) + ')';
      frame.style.transformOrigin = 'top center';
      if (debug) console.log('Fallback: applied global CSS transform scale of', scale.toFixed(3));
    });

    refs.printBtn.disabled = false;
    setStatus('Loaded ' + pages.length + ' pages. Review, then print.', 'success');
  }

  function formatPrescription(exercise) {
    var sets = exercise.sets != null ? exercise.sets : '?';
    var reps = exercise.repsPerSet != null ? exercise.repsPerSet : '?';
    return sets + ' × ' + reps;
  }

  function pad2(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function deriveKey(password, salt, usage) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(normalisePassword(password)), 'PBKDF2', false, ['deriveKey'])
      .then(function (material) {
        return crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: CRYPTO_ITERATIONS, hash: 'SHA-256' },
          material,
          { name: CRYPTO_ALGO, length: CRYPTO_KEY_BITS },
          false,
          usage
        );
      });
  }

  function base64urlToUint8(blob) {
    var normalized = blob.replace(/-/g, '+').replace(/_/g, '/');
    while (normalized.length % 4) normalized += '=';
    var binary = atob(normalized);
    var out = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }

  function uint8ToBase64url(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decryptBlob(blob, password) {
    var packed = base64urlToUint8(blob);
    var salt = packed.slice(0, CRYPTO_SALT_BYTES);
    var iv = packed.slice(CRYPTO_SALT_BYTES, CRYPTO_SALT_BYTES + CRYPTO_IV_BYTES);
    var ciphertext = packed.slice(CRYPTO_SALT_BYTES + CRYPTO_IV_BYTES);
    return deriveKey(password, salt, ['decrypt']).then(function (key) {
      return crypto.subtle.decrypt({ name: CRYPTO_ALGO, iv: iv }, key, ciphertext);
    }).then(function (plainBuf) {
      return JSON.parse(new TextDecoder().decode(plainBuf));
    });
  }

  function encryptBlob(payload, password) {
    var salt = crypto.getRandomValues(new Uint8Array(CRYPTO_SALT_BYTES));
    var iv = crypto.getRandomValues(new Uint8Array(CRYPTO_IV_BYTES));
    var plaintext = new TextEncoder().encode(JSON.stringify(payload));
    return deriveKey(password, salt, ['encrypt']).then(function (key) {
      return crypto.subtle.encrypt({ name: CRYPTO_ALGO, iv: iv }, key, plaintext);
    }).then(function (ciphertext) {
      var cipherBytes = new Uint8Array(ciphertext);
      var combined = new Uint8Array(CRYPTO_SALT_BYTES + CRYPTO_IV_BYTES + cipherBytes.length);
      combined.set(salt, 0);
      combined.set(iv, CRYPTO_SALT_BYTES);
      combined.set(cipherBytes, CRYPTO_SALT_BYTES + CRYPTO_IV_BYTES);
      return uint8ToBase64url(combined);
    });
  }

  function attemptUnlock() {
    if (!state.data || !state.data.meta || !state.data.meta.passwordEncryptedEnding) {
      refs.unlockStatus.textContent = 'No encrypted ending found.';
      return;
    }
    var password = normalisePassword(refs.unlockPassword.value || '');
    if (!password) {
      refs.unlockStatus.textContent = 'Enter the completed password.';
      return;
    }
    refs.unlockStatus.textContent = 'Unlocking…';
    decryptBlob(state.data.meta.passwordEncryptedEnding, password).then(function (payload) {
      state.unlockedEnding = payload;
      refs.unlockStatus.textContent = 'Unlocked.';
      renderBooklet(state.data);
    }).catch(function () {
      refs.unlockStatus.textContent = 'Password rejected.';
    });
  }

  function attemptEncrypt() {
    if (!state.data || !Array.isArray(state.data.endings) || !state.data.endings.length) {
      refs.encryptStatus.textContent = 'No endings available.';
      return;
    }
    var password = normalisePassword(refs.encryptPassword.value || '');
    if (!password) {
      refs.encryptStatus.textContent = 'Enter a password.';
      return;
    }
    refs.encryptStatus.textContent = 'Encrypting…';
    encryptBlob(state.data.endings[0].content || state.data.endings[0], password).then(function (blob) {
      state.data.meta.passwordEncryptedEnding = blob;
      refs.encryptStatus.textContent = 'Encrypted.';
      refs.encryptDownload.style.display = 'inline-flex';
    }).catch(function () {
      refs.encryptStatus.textContent = 'Encryption failed.';
    });
  }

  function downloadJson() {
    if (!state.data) return;
    var blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'liftrpg-booklet.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function loadBooklet(data, sourceLabel) {
    var errors = validateBooklet(data);
    if (errors.length) {
      refs.booklet.innerHTML = '';
      refs.printBtn.disabled = true;
      refs.unlockRow.style.display = 'none';
      refs.encryptRow.style.display = 'none';
      setStatus(errors.join(' '), 'error');
      return;
    }

    state.data = data;
    state.unlockedEnding = null;
    renderBooklet(data);
    refs.unlockRow.style.display = data.meta && data.meta.passwordEncryptedEnding ? 'flex' : 'none';
    refs.encryptRow.style.display = data.meta && (!data.meta.passwordEncryptedEnding || data.meta.passwordEncryptedEnding.indexOf('PLACEHOLDER_') === 0) ? 'flex' : 'none';
    refs.encryptDownload.style.display = 'none';
    refs.unlockPassword.value = '';
    refs.unlockStatus.textContent = '';
    refs.encryptStatus.textContent = '';
    setStatus('Loaded ' + sourceLabel + '.', 'success');
  }

  function loadJsonFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result || '{}'));
        loadBooklet(data, file.name);
      } catch (error) {
        setStatus('Invalid JSON: ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  function fetchDemo(name) {
    var url = name === 'liftrpg-eastern-shore' ? '../liftrpg-eastern-shore.json' : '../' + name + '.json';
    return fetch(url).then(function (response) {
      if (!response.ok) throw new Error('Demo JSON not found.');
      return response.json();
    }).then(function (data) {
      loadBooklet(data, name + '.json');
    }).catch(function (error) {
      setStatus(error.message, 'error');
    });
  }

  function syncLayoutMode() {
    refs.booklet.setAttribute('data-layout-mode', state.layoutMode);
  }

  function wireUi() {
    refs.jsonInput.addEventListener('change', function (event) {
      loadJsonFile(event.target.files && event.target.files[0]);
    });
    refs.printBtn.addEventListener('click', function () {
      window.print();
    });
    refs.layoutMode.addEventListener('change', function () {
      state.layoutMode = refs.layoutMode.value;
      syncLayoutMode();
      if (state.data) renderBooklet(state.data);
    });
    refs.unlockBtn.addEventListener('click', attemptUnlock);
    refs.unlockPassword.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') attemptUnlock();
    });
    refs.encryptBtn.addEventListener('click', attemptEncrypt);
    refs.encryptDownload.addEventListener('click', downloadJson);
  }

  function captureRefs() {
    refs = {
      booklet: qs('booklet-container'),
      jsonInput: qs('json-input'),
      printBtn: qs('print-btn'),
      layoutMode: qs('layout-mode'),
      status: qs('status'),
      unlockRow: qs('unlock-row'),
      unlockPassword: qs('unlock-password'),
      unlockBtn: qs('unlock-btn'),
      unlockStatus: qs('unlock-status'),
      encryptRow: qs('encrypt-row'),
      encryptPassword: qs('encrypt-password'),
      encryptBtn: qs('encrypt-btn'),
      encryptDownload: qs('encrypt-download'),
      encryptStatus: qs('encrypt-status')
    };
  }

  function init() {
    captureRefs();
    wireUi();
    syncLayoutMode();
    refs.printBtn.disabled = true;

    var params = new URLSearchParams(window.location.search);
    if (params.get('demo')) {
      fetchDemo(params.get('demo'));
    } else {
      setStatus('Load a booklet JSON to preview and print.', 'neutral');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
