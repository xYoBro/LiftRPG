/**
 * shell-decorator-registry.js — Shell decorator resolution
 *
 * Minimal registry that maps shell-family values to decorator objects.
 * Decorators provide optional hooks that the page renderer calls during
 * page construction. Unregistered families get the no-op default.
 *
 * See docs/layer0/SHELL-DECORATOR-CONTRACT.md for the full contract.
 *
 * @module shell-decorator-registry
 */

const decorators = new Map();

/** No-op decorator — every hook lookup returns undefined. */
const NO_OP = Object.freeze({});

/**
 * Register a shell decorator for a given shell-family value.
 * @param {string} shellFamily
 * @param {object} decorator
 */
export function registerShellDecorator(shellFamily, decorator) {
  decorators.set(shellFamily, decorator);
}

/**
 * Resolve a decorator for a shell-family value.
 * Returns the no-op frozen object when no decorator is registered.
 * @param {string|null} shellFamily
 * @returns {object}
 */
export function getShellDecorator(shellFamily) {
  return (shellFamily && decorators.get(shellFamily)) || NO_OP;
}
