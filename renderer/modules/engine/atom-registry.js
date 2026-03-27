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
 *   `estimate(data, density)` and `render(atom, density)` functions.
 *   Optional fields: `defaultSizeHint`, `canShare`, `pageAffinity`.
 * @throws {Error} if `estimate` or `render` functions are missing
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

/**
 * Check whether a type has been registered.
 *
 * @param {string} type
 * @returns {boolean}
 */
export function hasAtomType(type) {
  return registry.has(type);
}

/**
 * Return all registered type names.
 *
 * @returns {string[]}
 */
export function getRegisteredTypes() {
  return Array.from(registry.keys());
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
    mustOwnPage:  !!partial.mustOwnPage,
    section:      partial.section ?? null,
    sequence:     partial.sequence ?? 0,
    sizeHint:     partial.sizeHint ?? definition.defaultSizeHint,
    pageAffinity: partial.pageAffinity ?? definition.pageAffinity,
    data:         partial.data ?? null,
  };
}

// ---------------------------------------------------------------------------
// Testing support
// ---------------------------------------------------------------------------

/**
 * Clear all registered atom types. Intended for test harnesses only.
 * Not part of the public API for production use.
 */
export function _resetRegistry() {
  registry.clear();
}
