/**
 * image.js — Image / inline SVG atom
 *
 * Renders inline SVG artwork or an img tag with optional caption.
 * Density scales the image down to save vertical space. SVG content
 * is sanitized before insertion. Designed for print-friendly output
 * within half-letter pages.
 *
 * @module atoms/image
 */

import { registerAtom } from '../engine/atom-registry.js';
import { make } from '../dom.js';
import { sanitizeSvg } from '../utils.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default image height when not specified in data. */
const DEFAULT_HEIGHT = 350;

/** Caption height allowance in px. */
const CAPTION_HEIGHT = 25;

/** Minimum scale factor at maximum density. */
const MIN_SCALE = 0.7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(spacious, compressed, density) {
  return spacious + (compressed - spacious) * density;
}

// ---------------------------------------------------------------------------
// Atom registration
// ---------------------------------------------------------------------------

registerAtom('image', {
  defaultSizeHint: 'half-page',
  canShare: true,
  pageAffinity: 'either',

  estimate(data, density) {
    const d = density ?? 0;
    const baseHeight = data?.height || DEFAULT_HEIGHT;
    const scale = lerp(1.0, MIN_SCALE, d);
    const captionH = data?.caption ? CAPTION_HEIGHT : 0;
    const height = Math.round(baseHeight * scale + captionH);

    return {
      minHeight: Math.round(baseHeight * MIN_SCALE + captionH),
      preferredHeight: height,
    };
  },

  render(atom, density) {
    const data = atom.data ?? {};
    const d = density ?? 0;
    const scale = lerp(1.0, MIN_SCALE, d);

    const el = make('div', 'image-atom');

    // Image container — holds either SVG or img
    const frame = make('div', 'image-frame');

    if (data.svg) {
      // Inline SVG — sanitize before insertion
      frame.innerHTML = sanitizeSvg(data.svg);
      frame.classList.add('image-frame-svg');
    } else if (data.src) {
      const img = make('img', 'image-img');
      img.src = data.src;
      img.alt = data.alt || '';
      if (data.width) img.width = data.width;
      if (data.height) img.height = data.height;
      frame.appendChild(img);
    }

    // Density scaling — apply via max-height so the image shrinks
    // without distortion. CSS handles aspect-ratio preservation.
    if (d > 0.1) {
      const maxH = Math.round((data.height || DEFAULT_HEIGHT) * scale);
      frame.style.maxHeight = `${maxH}px`;
      frame.style.overflow = 'hidden';
    }

    el.appendChild(frame);

    // Optional caption
    if (data.caption) {
      el.appendChild(make('figcaption', 'image-caption', data.caption));
    }

    return el;
  },
});

export default 'image';
