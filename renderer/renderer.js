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

      // Hard limit of 3 workouts per page
      if (current.length >= 3 || (current.length >= 1 && load + weight > 3.8)) {
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
      if (len > 600) {
        var paras = splitParagraphs(body);
        var currentParas = [];
        var currentLen = 0;
        var part = 1;

        paras.forEach(function (p) {
          var pLen = readingLength(p);
          if (currentLen + pLen > 550 && currentParas.length > 0) {
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



  function buildCoverPage(data) {
    var page = make('section', 'booklet-page');
    page.setAttribute('data-page-type', 'cover');
    var frame = make('div', 'cover-page');

    if (data.cover.designation) {
      frame.appendChild(make('div', 'cover-designation', data.cover.designation));
    }

    var hero = make('div', 'cover-hero');
    hero.appendChild(make('h1', 'cover-title', data.meta.blockTitle || 'LiftRPG'));
    hero.appendChild(make('p', 'cover-tagline', data.cover.tagline || ''));
    hero.appendChild(make('div', 'cover-rule'));
    frame.appendChild(hero);

    var colophon = make('div', 'cover-colophon');
    (data.cover.colophonLines || []).forEach(function (line) {
      colophon.appendChild(make('div', 'cover-colophon-line', line));
    });
    frame.appendChild(colophon);
    page.appendChild(frame);

    return page;
  }

  function buildRulesPage(data) {
    var pages = [];
    
    // Left Page: Rules/Briefing
    var leftPage = make('section', 'booklet-page');
    leftPage.setAttribute('data-page-type', 'rules-left');
    var leftFrame = make('div', 'rules-left');
    
    var leftHeader = make('header', 'rules-header');
    leftHeader.appendChild(make('span', '', 'Orientation'));
    leftHeader.appendChild(make('span', 'page-num', ''));
    leftFrame.appendChild(leftHeader);
    
    leftFrame.appendChild(make('h2', 'rules-title', data.rulesSpread.leftPage.title || 'Briefing'));
    
    var leftBody = make('div', 'rules-body');
    (data.rulesSpread.leftPage.sections || []).forEach(function (section) {
      leftBody.appendChild(make('h3', '', section.heading || 'Procedure'));
      splitParagraphs(section.body || section.text).forEach(function (para) {
        leftBody.appendChild(make('p', '', para));
      });
    });

    var reEntry = data.rulesSpread.leftPage.reEntryRule;
    var reEntryText = typeof reEntry === 'string' ? reEntry : reEntry && reEntry.ruleText;
    if (reEntryText) {
      leftBody.appendChild(make('h3', '', 'Re-entry Procedure'));
      splitParagraphs(reEntryText).forEach(function (para) {
        leftBody.appendChild(make('p', '', para));
      });
    }
    leftFrame.appendChild(leftBody);
    leftPage.appendChild(leftFrame);
    pages.push(leftPage);

    // Right Page: Password Log
    var rightPage = make('section', 'booklet-page');
    rightPage.setAttribute('data-page-type', 'rules-right');
    var rightFrame = make('div', 'rules-right');
    
    var rightHeader = make('header', 'rules-header');
    rightHeader.appendChild(make('span', '', 'Record'));
    rightHeader.appendChild(make('span', 'page-num', ''));
    rightFrame.appendChild(rightHeader);

    rightFrame.appendChild(make('div', 'password-log-title', data.rulesSpread.rightPage.title || 'Password Log'));
    if (data.rulesSpread.rightPage.instruction) {
      rightFrame.appendChild(make('div', 'password-log-subtitle', data.rulesSpread.rightPage.instruction));
    }

    var logGrid = make('div', 'password-log-grid');
    var componentType = (data.meta.weeklyComponentType || 'component').replace(/-/g, ' ');
    (data.weeks || []).forEach(function (week) {
      var row = make('div', 'password-log-row');
      row.appendChild(make('div', 'password-log-week', 'W' + pad2(week.weekNumber)));
      row.appendChild(make('div', 'password-log-box'));
      if (!week.isBossWeek) {
        row.appendChild(make('div', 'password-log-instruction', week.weeklyComponent && week.weeklyComponent.extractionInstruction || componentType));
      } else {
        row.appendChild(make('div', 'password-log-instruction', 'Hold until convergence protocol.'));
      }
      logGrid.appendChild(row);
    });
    rightFrame.appendChild(logGrid);

    var finalBlock = make('div', 'password-final');
    finalBlock.appendChild(make('div', 'password-final-label', 'Final Assembly'));
    finalBlock.appendChild(makePasswordBoxes(getPasswordLength(data, (data.meta && data.meta.weekCount) || 6), 'password-final-box'));
    rightFrame.appendChild(finalBlock);

    rightPage.appendChild(rightFrame);
    pages.push(rightPage);

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
        if (chunkIndex > 0) {
           // Subsequent workout chunks must also land on left pages.
           // Since the previous page was a left page, we must insert a blank right page first.
           var blank = make('section', 'booklet-page');
           blank.setAttribute('data-page-type', 'blank-filler');
           blank.classList.add('blank-page');
           pages.push(blank);
        }
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
          var page = make('section', 'booklet-page');
          page.setAttribute('data-page-type', 'fragment');
          var frame = make('div', 'fragment-page');
          var header = make('header', 'page-header');
          header.appendChild(make('span', '', 'Archive'));
          header.appendChild(make('span', 'page-num', ''));
          frame.appendChild(header);

          var stack = make('div', 'fragment-stack');
          pageFragments.forEach(function (fragment) {
            stack.appendChild(renderFragment(fragment));
          });
          frame.appendChild(stack);
          page.appendChild(frame);
          return page;
        }));
      }
    });
    return pages.flat();
  }

  function buildWorkoutPage(data, week, sessions, chunkIndex, chunkCount) {
    var page = make('section', 'booklet-page');
    page.setAttribute('data-page-type', 'workout-left');
    var frame = make('div', 'workout-left');

    var header = make('header', 'page-header');
    header.appendChild(make('span', 'week-id', 'Week ' + pad2(week.weekNumber)));
    header.appendChild(make('span', 'page-num', ''));
    frame.appendChild(header);

    var kickerText = chunkCount > 1 ? 'Session Log ' + (chunkIndex + 1) + '/' + chunkCount : 'Session Log';
    frame.appendChild(make('div', 'week-kicker', kickerText));
    frame.appendChild(make('h2', 'week-title', week.title || 'Training Record'));
    
    if (week.epigraph && chunkIndex === 0) {
      frame.appendChild(make('div', 'week-subtitle', week.epigraph.attribution || ''));
      frame.appendChild(make('div', 'week-meta', week.epigraph.text || ''));
    }

    var cards = make('div', 'session-cards');
    sessions.forEach(function (session) {
      cards.appendChild(buildSessionCard(session));
    });
    frame.appendChild(cards);

    page.appendChild(frame);
    return page;
  }

  function buildSessionCard(session) {
    var card = make('article', 'session-card');
    
    var exCount = (session.exercises || []).length;
    if (exCount > 4) card.classList.add('density-dense');
    else if (exCount > 2) card.classList.add('density-compact');
    
    card.appendChild(make('div', 'session-header', typeof session.label === 'string' ? session.label : 'Session'));
    
    if (session.storyPrompt) {
      var prompt = make('div', 'story-prompt', session.storyPrompt);
      card.appendChild(prompt);
    }
    
    if (session.fragmentRef) {
      card.appendChild(make('div', 'frag-ref', 'Fragment ' + session.fragmentRef));
    }

    var exercises = make('table', 'exercise-table');
    (session.exercises || []).forEach(function (exercise) {
      exercises.appendChild(renderExerciseRow(exercise));
    });
    card.appendChild(exercises);

    var notesBox = make('div', 'notes-box');
    var notesLines = make('div', 'notes-lines');
    notesLines.appendChild(make('div', 'notes-line'));
    notesLines.appendChild(make('div', 'notes-line'));
    notesBox.appendChild(notesLines);
    card.appendChild(notesBox);

    if (session.binaryChoice) {
      var choice = make('div', 'binary-choice');
      choice.appendChild(make('div', 'binary-choice-label', session.binaryChoice.choiceLabel || 'Route Decision'));
      
      var a = make('div', 'binary-choice-option');
      a.appendChild(make('div', 'binary-choice-marker'));
      a.appendChild(make('div', 'binary-choice-text', session.binaryChoice.promptA || ''));
      choice.appendChild(a);

      var b = make('div', 'binary-choice-option');
      b.appendChild(make('div', 'binary-choice-marker'));
      b.appendChild(make('div', 'binary-choice-text', session.binaryChoice.promptB || ''));
      choice.appendChild(b);
      
      card.appendChild(choice);
    }

    return card;
  }

  function renderExerciseRow(exercise) {
    var tr = make('tr');
    
    var tdName = make('td');
    var nameWrapper = make('div', 'exercise-name');
    nameWrapper.textContent = exercise.name || 'Lift';
    tdName.appendChild(nameWrapper);
    tr.appendChild(tdName);
    
    if (showLoadSuffix(exercise) || exercise.loadGuide || exercise.loadInstruction) {
        var tdWeight = make('td', 'exercise-weight');
        tdWeight.textContent = getLoadGuide(exercise) + (showLoadSuffix(exercise) ? ' x' : '');
        tr.appendChild(tdWeight);
    }
    
    var tdDots = make('td');
    tdDots.style.width = '100%';
    tdDots.appendChild(make('div', 'exercise-dots'));
    tr.appendChild(tdDots);
    
    var tdReps = make('td');
    var repGroup = make('div', 'rep-boxes');
    var count = getExerciseSetCount(exercise);
    for (var i = 0; i < count; i++) {
        repGroup.appendChild(make('div', 'rep-box'));
    }
    tdReps.appendChild(repGroup);
    tr.appendChild(tdReps);
    
    return tr;
  }

  function getExerciseSetCount(exercise) {
    if (typeof exercise.sets === 'number' && exercise.sets > 0) return Math.min(exercise.sets, 10);
    if (typeof exercise.repsPerSet === 'string' && exercise.repsPerSet.indexOf('/') !== -1) {
      return Math.min(exercise.repsPerSet.split('/').length, 10);
    }
    return 3;
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

    var page = make('section', 'booklet-page');
    page.setAttribute('data-page-type', 'field-ops');
    var frame = make('div', 'field-ops-right');

    var header = make('header', 'rp-header');
    header.appendChild(make('span', '', fieldOps.mapState && fieldOps.mapState.title || week.title || 'Field Operations'));
    header.appendChild(make('span', 'page-num', ''));
    frame.appendChild(header);

    var rpContent = make('div', 'rp-content');

    if (fieldOps.cipher) rpContent.appendChild(renderCipherSection(fieldOps.cipher, week.weeklyComponent));
    
    // Map Zone
    var mapZone = make('section', 'map-zone');
    if (fieldOps.mapState) mapZone.appendChild(renderMapSection(fieldOps.mapState));
    if (week.gameplayClocks && week.gameplayClocks.length > 0) {
      mapZone.appendChild(renderGameplayClocks(week.gameplayClocks));
    }
    rpContent.appendChild(mapZone);

    if (!splitOracle && fieldOps.oracleTable) {
        rpContent.appendChild(renderOracleSection(fieldOps.oracleTable));
    }

    frame.appendChild(rpContent);
    page.appendChild(frame);
    pages.push(page);

    if (splitOracle && fieldOps.oracleTable) {
      var secondPage = make('section', 'booklet-page');
      secondPage.setAttribute('data-page-type', 'oracle-overflow');
      var secondFrame = make('div', 'field-ops-right');
      
      var secondHeader = make('header', 'rp-header');
      secondHeader.appendChild(make('span', '', fieldOps.oracleTable.title || 'Oracle'));
      secondHeader.appendChild(make('span', 'page-num', ''));
      secondFrame.appendChild(secondHeader);
      
      var secondContent = make('div', 'rp-content');
      secondContent.style.gridTemplateAreas = '"oracle oracle"';
      secondContent.appendChild(renderOracleSection(fieldOps.oracleTable));
      secondFrame.appendChild(secondContent);
      secondPage.appendChild(secondFrame);
      pages.push(secondPage);
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
    var section = make('div', 'map-content');
    section.appendChild(make('div', 'map-title', mapState.title || 'Map'));

    if (mapState.mapType === 'point-to-point') {
      section.appendChild(renderPointMap(mapState));
    } else if (mapState.mapType === 'linear-track') {
      section.appendChild(renderLinearMap(mapState));
    } else if (mapState.mapType === 'player-drawn') {
      section.appendChild(renderPlayerMap(mapState));
    } else {
      section.appendChild(renderGridMap(mapState));
    }
    if (mapState.floorLabel) section.appendChild(make('div', 'map-annotation', mapState.floorLabel));
    if (mapState.mapNote) section.appendChild(make('div', 'map-note', mapState.mapNote));
    return section;
  }

  function renderGridMap(mapState) {
    var gridData = mapState.gridDimensions || { columns: 6, rows: 5 };
    var wrap = make('div', 'map-grid');
    wrap.style.gridTemplateColumns = 'repeat(' + gridData.columns + ', 1fr)';

    var tilesByPos = {};
    (mapState.tiles || []).forEach(function (tile) {
      tilesByPos[tile.col + ':' + tile.row] = tile;
    });

    for (var row = 1; row <= gridData.rows; row++) {
      for (var col = 1; col <= gridData.columns; col++) {
        var tile = tilesByPos[col + ':' + row] || {};
        var cellClass = 'map-cell ' + (tile.type || 'empty');
        if (mapState.currentPosition && mapState.currentPosition.col === col && mapState.currentPosition.row === row) cellClass += ' current';
        var cell = make('div', cellClass);
        
        var rawLabel = tile.label || (mapState.currentPosition && mapState.currentPosition.col === col && mapState.currentPosition.row === row ? 'YOU' : '');
        cell.textContent = rawLabel.substring(0, 5); // Tighter truncation for grid
        
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
    var section = make('div', 'cipher-zone');
    section.appendChild(make('div', 'puzzle-title', cipher.title || 'Cipher'));
    if (cipher.body && cipher.body.displayText) {
      section.appendChild(make('div', 'cipher-sequence', cipher.body.displayText));
    }

    if (cipher.body && cipher.body.key) {
      var key = make('div', 'cipher-key');
      var grid = make('div', 'key-grid');
      grid.textContent = cipher.body.key;
      key.appendChild(grid);
      section.appendChild(key);
    }

    if (cipher.body && cipher.body.workSpace) {
      section.appendChild(renderWorkspace(cipher.body.workSpace));
    }

    var instruction = cipher.extractionInstruction || (weeklyComponent && weeklyComponent.extractionInstruction) || 'Record the derived value.';
    section.appendChild(make('div', 'password-extract', instruction));
    
    return section;
  }

  function renderWorkspace(workSpace) {
    var grid = make('div', 'plaintext-grid');
    var size = Math.min((workSpace.rows || 1) * (workSpace.cols || 10), 40);
    for (var i = 0; i < size; i++) {
        grid.appendChild(make('div', 'plaintext-cell'));
    }
    return grid;
  }

  function renderOracleSection(oracle) {
    var section = make('div', 'oracle-zone');
    section.appendChild(make('header', 'oracle-header', oracle.title || 'Oracle'));
    if (oracle.instruction) section.appendChild(make('div', 'oracle-instruction', oracle.instruction));

    var list = make('div', 'oracle-entries');
    (oracle.entries || []).forEach(function (entry) {
      var row = make('div', 'oracle-entry');
      row.appendChild(make('div', 'oracle-case-num', entry.roll || ''));
      row.appendChild(make('div', 'oracle-text', entry.text || ''));
      if (entry.paperAction) row.appendChild(make('div', 'oracle-text', '(' + entry.paperAction + ')'));
      if (entry.fragmentRef) row.appendChild(make('div', 'frag-ref', entry.fragmentRef));
      list.appendChild(row);
    });
    section.appendChild(list);
    return section;
  }

  function buildBossPage(data, week) {
    var boss = week.bossEncounter || {};
    var page = make('section', 'booklet-page');
    page.setAttribute('data-page-type', 'boss');
    var frame = make('div', 'boss-right');
    
    var header = make('header', 'boss-header');
    header.appendChild(make('span', '', 'Convergence'));
    header.appendChild(make('span', 'page-num', ''));
    frame.appendChild(header);

    frame.appendChild(make('h2', 'boss-title', boss.title || week.title));

    if (boss.narrative) {
      var narrative = make('div', 'boss-narrative');
      splitParagraphs(boss.narrative).forEach(function (para) {
        narrative.appendChild(make('p', '', para));
      });
      frame.appendChild(narrative);
    }
    
    if (boss.mechanismDescription) {
      var mechanism = make('div', 'boss-mechanism');
      mechanism.appendChild(make('strong', 'boss-mechanism-label', 'Procedure'));
      splitParagraphs(boss.mechanismDescription).forEach(function (para) {
        mechanism.appendChild(make('p', '', para));
      });
      frame.appendChild(mechanism);
    }

    var components = make('div', 'boss-components');
    components.appendChild(make('div', 'boss-components-label', 'Recorded Inputs'));
    var list = make('div', 'boss-component-list');
    (boss.componentInputs || []).forEach(function (item, idx) {
      var row = make('div', 'boss-component-item');
      row.appendChild(make('div', 'boss-component-week', 'W' + pad2(idx + 1)));
      row.appendChild(make('div', 'boss-component-box'));
      row.appendChild(make('div', '', item));
      list.appendChild(row);
    });
    components.appendChild(list);
    frame.appendChild(components);

    var convergence = make('div', 'boss-convergence');
    convergence.appendChild(make('div', 'boss-convergence-label', 'Final Word'));
    convergence.appendChild(make('p', 'boss-convergence-instruction', boss.passwordRevealInstruction || 'When the final word is assembled, enter it at liftrpg.co to unlock the ending.'));
    
    var wordLen = getPasswordLength(data, (boss.componentInputs || []).length || 6);
    var pboxes = make('div', 'boss-password-boxes');
    for (var i = 0; i < wordLen; i++) {
        pboxes.appendChild(make('div', 'boss-password-box'));
    }
    convergence.appendChild(pboxes);
    
    frame.appendChild(convergence);
    page.appendChild(frame);
    return page;
  }

  function buildFragmentPages(data, renderedFragments) {
    renderedFragments = renderedFragments || {};
    var remaining = (data.fragments || []).filter(function (f) {
      return !renderedFragments[f.id];
    });
    return paginateFragments(remaining).map(function (pageFragments, index) {
      var page = make('section', 'booklet-page');
      page.setAttribute('data-page-type', 'fragment');
      var frame = make('div', 'fragment-page');
      var header = make('header', 'page-header');
      header.appendChild(make('span', '', 'Archive'));
      header.appendChild(make('span', 'page-num', ''));
      frame.appendChild(header);

      var stack = make('div', 'fragment-stack');
      pageFragments.forEach(function (fragment) {
        stack.appendChild(renderFragment(fragment));
      });
      frame.appendChild(stack);
      page.appendChild(frame);
      return page;
    });
  }

  function renderFragment(fragment) {
    var page = make('section', 'booklet-page');
    // alternate fragment-page styling if needed
    page.setAttribute('data-page-type', 'fragment');
    
    var frame = make('div', 'fragment-page');
    var header = make('header', 'page-header');
    header.appendChild(make('span', '', 'Archive'));
    header.appendChild(make('span', 'page-num', ''));
    frame.appendChild(header);

    var block = make('div', 'fragment-block');
    if (fragment.id) {
        block.appendChild(make('div', 'fragment-number', fragment.id.replace('F.', '')));
    }

    var dtype = (fragment.documentType || 'memo').toLowerCase().replace(' ', '-');
    var doc = make('div', 'fragment-doc ' + dtype);
    doc.appendChild(make('div', 'fragment-doc-type', (fragment.documentType || 'Document')));
    
    var meta = [];
    if (fragment.inWorldAuthor) meta.push('FROM: ' + fragment.inWorldAuthor);
    if (fragment.inWorldRecipient) meta.push('TO: ' + fragment.inWorldRecipient);
    if (fragment.date) meta.push('DATE: ' + fragment.date);
    if (meta.length) {
      var metaBox = make('div', 'fragment-doc-header');
      meta.forEach(function (line) {
        metaBox.appendChild(make('div', '', line));
      });
      doc.appendChild(metaBox);
    }

    var body = make('div', 'fragment-doc-body');
    splitParagraphs(fragment.bodyText || fragment.body || fragment.content || '').forEach(function (para) {
      body.appendChild(make('p', '', para));
    });
    doc.appendChild(body);

    if (fragment.inWorldPurpose) {
        doc.appendChild(make('div', 'fragment-doc-sig', fragment.inWorldPurpose));
    } else {
        doc.appendChild(make('div', 'fragment-doc-sig', 'END FILE'));
    }

    block.appendChild(doc);
    frame.appendChild(block);
    page.appendChild(frame);
    
    return page;
  }

  function buildAssemblyPage(data) {
    var page = make('section', 'booklet-page');
    page.setAttribute('data-page-type', 'assembly');
    
    var frame = make('div', 'password-assembly-page');
    frame.appendChild(make('h2', 'password-assembly-title', 'Password Assembly'));
    frame.appendChild(make('p', 'password-assembly-subtitle', 'Transfer each recorded weekly value into the final assembly ladder. Decode only when the boss page gives the rule.'));
    
    var list = make('div', 'password-assembly-grid');
    (data.weeks || []).forEach(function (week) {
      if (week.isBossWeek) return; // Boss weeks don't get an explicit row normally
      var row = make('div', 'password-assembly-row');
      row.appendChild(make('div', 'password-assembly-week-label', 'Week ' + pad2(week.weekNumber)));
      row.appendChild(make('div', 'password-assembly-cell'));
      row.appendChild(make('div', 'password-assembly-arrow', '→'));
      row.appendChild(make('div', 'password-assembly-cell'));
      list.appendChild(row);
    });
    frame.appendChild(list);

    var finalBlock = make('div', 'password-final-assembly');
    finalBlock.appendChild(make('div', 'password-final-label', 'Final Word'));
    
    var wordLen = getPasswordLength(data, (data.meta && data.meta.weekCount) || 6);
    var pboxes = make('div', 'password-final-row');
    for (var i = 0; i < wordLen; i++) {
        pboxes.appendChild(make('div', 'password-final-cell'));
    }
    finalBlock.appendChild(pboxes);

    frame.appendChild(finalBlock);
    page.appendChild(frame);
    
    return page;
  }

  function buildLockedEndingPage(data) {
    var page = make('section', 'booklet-page');
    page.setAttribute('data-page-type', 'ending-locked');
    var frame = make('div', 'endings-page');
    frame.appendChild(make('h2', 'endings-title', 'Final Document'));
    
    var body = make('div', 'endings-body');
    body.appendChild(make('p', '', 'This final page remains sealed until the completed password is entered above. The booklet should give you everything you need.'));
    frame.appendChild(body);
    
    if (data.endings && data.endings.length) {
      var variants = make('div', 'chip-row');
      data.endings.forEach(function (ending) {
        variants.appendChild(make('div', 'chip chip-muted', ending.variant || 'Variant'));
      });
      frame.appendChild(variants);
    }
    page.appendChild(frame);
    return page;
  }

  function buildUnlockedEndingPage(payload) {
    var page = make('section', 'booklet-page');
    page.setAttribute('data-page-type', 'ending-unlocked');
    var frame = make('div', 'endings-page');

    frame.appendChild(make('h2', 'endings-title', payload.title || 'Unlocked Document'));
    if (payload.documentType) frame.appendChild(make('div', 'doc-label', payload.documentType));
    
    var body = make('div', 'endings-body');
    splitParagraphs(payload.body || payload.content || '').forEach(function (para) {
      body.appendChild(make('p', '', para));
    });
    frame.appendChild(body);
    
    if (payload.finalLine) {
      frame.appendChild(make('div', 'endings-final-line', payload.finalLine));
    }
    page.appendChild(frame);
    return page;
  }

  function buildBackCover(data) {
    var page = make('section', 'booklet-page');
    page.classList.add('page-back');
    page.setAttribute('data-page-type', 'back-cover');
    var colophon = make('div', 'back-cover');
    colophon.appendChild(make('p', 'back-cover-colophon', 'Printed by hand, completed in pencil, resolved through repetition.'));
    colophon.appendChild(make('div', 'back-cover-mark', 'LiftRPG'));
    page.appendChild(colophon);
    return page;
  }

  function buildNotesPage(index) {
    var page = make('section', 'booklet-page');
    page.setAttribute('data-page-type', 'notes');
    
    var frame = make('div', 'notes-page');
    var header = make('header', 'page-header');
    header.appendChild(make('span', '', 'Field Notes'));
    header.appendChild(make('span', 'page-num', ''));
    frame.appendChild(header);

    var notes = make('div', 'notes-grid');
    for (var i = 0; i < 36; i++) {
      notes.appendChild(make('div', 'notes-cell'));
    }
    frame.appendChild(notes);
    page.appendChild(frame);
    return page;
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
    var clippedCount = 0;
    pages.forEach(function (page) {
      var frame = page.firstElementChild;
      if (!frame || frame.tagName !== 'DIV') return;

      var clientH = page.clientHeight;
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
      
      var MIN_SCALE = 0.82;
      var isClipped = false;
      if (scale < MIN_SCALE) {
        if (debug) {
          console.warn('SEVERE OVERFLOW: Scale clamped from ' + scale.toFixed(3) + ' to MIN_SCALE (' + MIN_SCALE + ') on ' + page.getAttribute('data-page-type'));
          frame.style.outline = '2px dashed red';
        }
        scale = MIN_SCALE;
        isClipped = true;
        clippedCount++;
        page.setAttribute('data-fit-failed', 'true');
      }

      frame.style.transform = 'scale(' + scale.toFixed(3) + ')';
      frame.style.transformOrigin = 'top center';
      if (debug && !isClipped) console.log('Fallback: applied global CSS transform scale of', scale.toFixed(3));
    });

    refs.printBtn.disabled = false;
    if (clippedCount > 0) {
      setStatus('Loaded ' + pages.length + ' pages. Warning: ' + clippedCount + ' pages clipped (exceeded max density).', 'error');
    } else {
      setStatus('Loaded ' + pages.length + ' pages. Review, then print.', 'success');
    }
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
