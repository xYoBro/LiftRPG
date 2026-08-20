/**
 * atom-registry.js — Central atom type catalog
 *
 * Atom types register here with their estimate/render functions.
 * The engine uses this registry to validate, create, and look up atoms
 * during the layout pipeline. Domain-agnostic — no knowledge of any
 * specific schema or booklet format.
 *
 * @module engine/atom-registry
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Valid sizeHint values for atom descriptors. */
const VALID_SIZE_HINTS = new Set([
  'full-page',
  'half-page',
  'quarter-page',
  'flex',
  'minimal',
]);

/** Valid pageAffinity values for atom descriptors. */
const VALID_PAGE_AFFINITIES = new Set([
  'left',
  'right',
  'either',
]);

/** Defaults applied to atom definitions when not provided. */
const DEFINITION_DEFAULTS = {
  defaultSizeHint: 'flex',
  canShare: true,
  pageAffinity: 'either',
};

// ---------------------------------------------------------------------------
// Registry (module-private)
// ---------------------------------------------------------------------------

/** @type {Map<string, AtomDefinition>} */
const registry = new Map();

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register an atom type with the catalog.
 *
 * @param {string} type — unique type name (e.g. 'session-card', 'cover')
 * @param {object} definition — atom definition containing at minimum
 *   `estimate(data, density, context)` and `render(atom, density, context)`
 *   functions. Optional fields: `defaultSizeHint`, `canShare`, `pageAffinity`.
 * @throws {Error} if `estimate` or `render` functions are missing
 *
 * ── THE CONTEXT PARAMETER, ON BOTH PHASES (DR-25 estimate · DR-49 render) ──
 * `context` is an OPAQUE, OPTIONAL bag of layout facts the engine resolves and
 * forwards without reading: `typeMetrics` (D121) and `slotWidthPx` (DR-25).
 * The engine sets it; what an atom does with it is the atom's business.
 *
 * It is additive-optional on BOTH sides and on BOTH phases. An atom that
 * ignores the parameter returns exactly what it returned before the parameter
 * existed, and a caller that supplies none — a harness, a test, a legacy
 * primitive — gets an atom's declared fallbacks. That is the only reason it
 * could be threaded through `render()` at all without re-proving every atom.
 *
 * WHY RENDER NEEDED IT TOO. DR-25 gave the ESTIMATE its column and stopped
 * there, because estimation is the phase that models wrapped text. But an atom
 * that LAYS CONTENT OUT in a normalized coordinate space needs the same fact at
 * draw time: `field-ops-primitives.js`'s node-graph relaxation kept its cards
 * apart by a constant expressed in 0–100 map units while the cards' footprint
 * is fixed in real pixels, so the guard was correct at a full column and
 * separated by less than half a card's width in a halves cell — three pairs of
 * node cards printed on top of each other across the sealed corpus (DR-49).
 * A width-blind constant in a normalized space is only ever right at one width.
 *
 * MEASUREMENT AND RENDER MUST BE HANDED THE SAME CONTEXT. Both paths resolve
 * the slot from `resolvePageRowPlan()` (D210's one row plan), so an atom that
 * draws differently at two widths draws the SAME way in the harness and on the
 * page. Handing render a width the harness did not use would reintroduce the
 * measurement⇄render divergence the Charter exists to prevent.
 */
export function registerAtom(type, definition) {
  if (!type || typeof type !== 'string') {
    throw new Error('registerAtom: type must be a non-empty string');
  }

  if (typeof definition?.estimate !== 'function') {
    throw new Error(
      `registerAtom('${type}'): definition must include an estimate(data, density) function`
    );
  }

  if (typeof definition?.render !== 'function') {
    throw new Error(
      `registerAtom('${type}'): definition must include a render(atom, density) function`
    );
  }

  if (registry.has(type)) {
    console.warn(`registerAtom: overwriting existing atom type '${type}'`);
  }

  // Merge with defaults — explicit values in definition win.
  registry.set(type, {
    ...DEFINITION_DEFAULTS,
    ...definition,
  });
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

/**
 * Look up an atom definition by type name.
 *
 * @param {string} type
 * @returns {AtomDefinition|null} the definition, or null if not registered
 */
export function getAtomDefinition(type) {
  return registry.get(type) ?? null;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate an atom descriptor against the registry.
 *
 * Returns an array of human-readable error strings. An empty array means
 * the descriptor is valid.
 *
 * @param {object} atom — an atom descriptor
 * @returns {string[]} validation errors (empty = valid)
 */
export function validateAtom(atom) {
  const errors = [];

  if (!atom || typeof atom !== 'object') {
    return ['atom must be a non-null object'];
  }

  // Required fields
  if (!atom.type || typeof atom.type !== 'string') {
    errors.push('atom.type must be a non-empty string');
  }

  if (!atom.id || typeof atom.id !== 'string') {
    errors.push('atom.id must be a non-empty string');
  }

  if (!atom.section || typeof atom.section !== 'string') {
    errors.push('atom.section must be a non-empty string');
  }

  // Type must be registered
  if (atom.type && typeof atom.type === 'string' && !registry.has(atom.type)) {
    errors.push(`atom.type '${atom.type}' is not registered`);
  }

  // sizeHint — optional, but must be valid if provided
  if (atom.sizeHint !== undefined && !VALID_SIZE_HINTS.has(atom.sizeHint)) {
    errors.push(
      `atom.sizeHint '${atom.sizeHint}' is invalid. ` +
      `Valid values: ${Array.from(VALID_SIZE_HINTS).join(', ')}`
    );
  }

  // pageAffinity — optional, but must be valid if provided
  if (atom.pageAffinity !== undefined && !VALID_PAGE_AFFINITIES.has(atom.pageAffinity)) {
    errors.push(
      `atom.pageAffinity '${atom.pageAffinity}' is invalid. ` +
      `Valid values: ${Array.from(VALID_PAGE_AFFINITIES).join(', ')}`
    );
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an atom descriptor with defaults filled from the registry.
 *
 * Accepts a partial descriptor and fills in missing metadata fields from
 * the registered atom definition. The `data` field is passed through as-is.
 *
 * @param {object} partial — partial atom descriptor (must include `type`)
 * @returns {AtomDescriptor} complete atom descriptor
 * @throws {Error} if type is missing or not registered
 */
export function createAtom(partial) {
  if (!partial?.type || typeof partial.type !== 'string') {
    throw new Error('createAtom: partial.type must be a non-empty string');
  }

  const definition = registry.get(partial.type);
  if (!definition) {
    throw new Error(`createAtom: atom type '${partial.type}' is not registered`);
  }

  return {
    type:         partial.type,
    id:           partial.id ?? null,
    group:        partial.group ?? null,
    groupPolicy:  partial.groupPolicy ?? null,
    rowGroup:     partial.rowGroup ?? null,
    mergeKey:     partial.mergeKey ?? null,
    zone:         partial.zone ?? null,
    shellAttrs:       partial.shellAttrs ?? null,
    continuationOf:        partial.continuationOf ?? null,
    continuationOrigin:    partial.continuationOrigin ?? null,
    continuationAdjacency: partial.continuationAdjacency ?? null,
    mustOwnPage:  !!partial.mustOwnPage,
    section:      partial.section ?? null,
    sequence:     partial.sequence ?? 0,
    sizeHint:     partial.sizeHint ?? definition.defaultSizeHint,
    pageAffinity: partial.pageAffinity ?? definition.pageAffinity,
    data:         partial.data ?? null,
  };
}
