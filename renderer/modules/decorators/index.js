/**
 * decorators/index.js — Decorator barrel
 *
 * Imports all shell decorators for side-effect registration.
 * Imported by page-renderer.js so that any code path reaching
 * renderPageFromPlacements() also gets decorator registration.
 */

import './classified-packet.js';
