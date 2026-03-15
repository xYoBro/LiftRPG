import {
  CRYPTO_ALGO,
  CRYPTO_ITERATIONS,
  CRYPTO_IV_BYTES,
  CRYPTO_KEY_BITS,
  CRYPTO_SALT_BYTES
} from './constants.js?v=46';
import { normalisePassword } from './utils.js?v=46';

function deriveKey(password, salt, usage) {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey('raw', encoder.encode(normalisePassword(password)), 'PBKDF2', false, ['deriveKey'])
    .then((material) => crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: CRYPTO_ITERATIONS, hash: 'SHA-256' },
      material,
      { name: CRYPTO_ALGO, length: CRYPTO_KEY_BITS },
      false,
      usage
    ));
}

function base64urlToUint8(blob) {
  let normalized = blob.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) normalized += '=';
  const binary = atob(normalized);
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    output[index] = binary.charCodeAt(index);
  }
  return output;
}

function uint8ToBase64url(bytes) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decryptBlob(blob, password) {
  const packed = base64urlToUint8(blob);
  const salt = packed.slice(0, CRYPTO_SALT_BYTES);
  const iv = packed.slice(CRYPTO_SALT_BYTES, CRYPTO_SALT_BYTES + CRYPTO_IV_BYTES);
  const ciphertext = packed.slice(CRYPTO_SALT_BYTES + CRYPTO_IV_BYTES);
  return deriveKey(password, salt, ['decrypt'])
    .then((key) => crypto.subtle.decrypt({ name: CRYPTO_ALGO, iv }, key, ciphertext))
    .then((plainBuffer) => JSON.parse(new TextDecoder().decode(plainBuffer)));
}

export function encryptBlob(payload, password) {
  const salt = crypto.getRandomValues(new Uint8Array(CRYPTO_SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  return deriveKey(password, salt, ['encrypt'])
    .then((key) => crypto.subtle.encrypt({ name: CRYPTO_ALGO, iv }, key, plaintext))
    .then((ciphertext) => {
      const cipherBytes = new Uint8Array(ciphertext);
      const combined = new Uint8Array(CRYPTO_SALT_BYTES + CRYPTO_IV_BYTES + cipherBytes.length);
      combined.set(salt, 0);
      combined.set(iv, CRYPTO_SALT_BYTES);
      combined.set(cipherBytes, CRYPTO_SALT_BYTES + CRYPTO_IV_BYTES);
      return uint8ToBase64url(combined);
    });
}
