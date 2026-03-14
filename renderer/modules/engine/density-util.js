/**
 * density-util.js — Shared density helpers for atoms
 *
 * Maps the continuous density value (0.0–1.0) to discrete CSS
 * variant names used by `data-density-variant` attributes.
 *
 * @module engine/density-util
 */

/**
 * Convert a numeric density (0.0–1.0) to a CSS variant name.
 *
 * @param {number} density — 0.0 (spacious) to 1.0 (maximum compression)
 * @returns {string|null} — 'compact', 'dense', 'tight', or null (default)
 */
export function densityVariant(density) {
  if (density >= 0.85) return 'tight';
  if (density >= 0.6)  return 'dense';
  if (density >= 0.3)  return 'compact';
  return null;
}
