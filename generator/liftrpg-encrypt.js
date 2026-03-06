/**
 * liftrpg-encrypt.js
 * 
 * Run at book generation time (Phase 2, generator branch).
 * Takes the plaintext ending payload and the password, produces
 * the encrypted blob that ships with the generated booklet.
 *
 * Usage (Node.js 18+):
 *   node liftrpg-encrypt.js --password THORNFIELD --payload ending.json
 *
 * Or import as a module:
 *   import { encryptEnding } from './liftrpg-encrypt.js';
 *
 * Output: base64url string. Store in schema as meta.passwordEncryptedEnding.
 * Deliver to the user as:
 *   - A URL parameter: https://liftrpg.co/?blob=<base64url>
 *   - Or as a QR code printed on the password log page of the booklet
 *   - Or as a string the user pastes manually
 *
 * ── FORMAT ──────────────────────────────────────────────────────────────────
 * Encrypted blob = base64url( salt(32) | iv(12) | ciphertext )
 * Key derivation: PBKDF2-SHA256, 200,000 iterations, 256-bit AES-GCM key
 * Password normalisation: trim → uppercase → strip non-alphanumeric
 * This normalisation is mirrored in unlock/index.html
 *
 * ── PAYLOAD FORMAT ──────────────────────────────────────────────────────────
 * The plaintext that gets encrypted is JSON:
 * {
 *   "kicker": "Municipal Survey Authority — CLASSIFIED",
 *   "title": "Final Survey Report — MSA Form 99",
 *   "content": "<p>The building at...</p><p>...</p>"
 * }
 * kicker: short label rendered above the title on the reveal page
 * title: Playfair Display Italic, large — the name of the final document
 * content: HTML string — the full ending, rendered as Libre Baskerville prose
 */

const ALGO       = 'AES-GCM';
const KEY_BITS   = 256;
const SALT_BYTES = 32;
const IV_BYTES   = 12;
const ITER       = 200_000;

// ── NORMALISE ──────────────────────────────────────────────────────────────
// Must match the normalisation in unlock/index.html exactly.
export function normalisePassword(raw) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// ── ENCRYPT ────────────────────────────────────────────────────────────────
/**
 * Encrypts an ending payload with the given password.
 * Returns a base64url string suitable for embedding in a URL or QR code.
 *
 * @param {object} payload  - { kicker, title, content }
 * @param {string} password - The plaintext password (will be normalised)
 * @returns {Promise<string>} base64url-encoded encrypted blob
 */
export async function encryptEnding(payload, password) {
  const normPassword = normalisePassword(password);
  if (!normPassword) throw new Error('Password normalises to empty string');

  const enc        = new TextEncoder();
  const plaintext  = enc.encode(JSON.stringify(payload));
  const salt       = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv         = crypto.getRandomValues(new Uint8Array(IV_BYTES));

  // Derive key
  const keyMat = await crypto.subtle.importKey(
    'raw', enc.encode(normPassword), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    keyMat,
    { name: ALGO, length: KEY_BITS },
    false,
    ['encrypt']
  );

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    plaintext
  );

  // Concatenate salt | iv | ciphertext
  const saltArr   = new Uint8Array(salt);
  const ivArr     = new Uint8Array(iv);
  const cipherArr = new Uint8Array(ciphertext);

  const combined = new Uint8Array(SALT_BYTES + IV_BYTES + cipherArr.length);
  combined.set(saltArr,  0);
  combined.set(ivArr,    SALT_BYTES);
  combined.set(cipherArr, SALT_BYTES + IV_BYTES);

  // Encode to base64url
  return uint8ToBase64url(combined);
}

// ── DECRYPT (for testing) ──────────────────────────────────────────────────
/**
 * Decrypts a blob produced by encryptEnding.
 * Mirrors the decryption in unlock/index.html.
 *
 * @param {string} blobBase64url
 * @param {string} password
 * @returns {Promise<object>} parsed payload
 */
export async function decryptEnding(blobBase64url, password) {
  const normPassword = normalisePassword(password);
  const buf = base64urlToUint8(blobBase64url);

  const salt       = buf.slice(0, SALT_BYTES);
  const iv         = buf.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = buf.slice(SALT_BYTES + IV_BYTES);

  const enc    = new TextEncoder();
  const keyMat = await crypto.subtle.importKey(
    'raw', enc.encode(normPassword), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    keyMat,
    { name: ALGO, length: KEY_BITS },
    false,
    ['decrypt']
  );

  const plainBuf = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);
  return JSON.parse(new TextDecoder().decode(plainBuf));
}

// ── ROUND-TRIP TEST ────────────────────────────────────────────────────────
/**
 * Verifies that encrypt → decrypt with the same password recovers the payload,
 * and that a wrong password throws. Call this from the generator to validate
 * the passwordEncryptedEnding before it ships with the booklet.
 *
 * @param {object} payload
 * @param {string} password
 * @returns {Promise<{blob: string, valid: boolean}>}
 */
export async function validateEncryption(payload, password) {
  const blob = await encryptEnding(payload, password);

  // Verify correct password recovers payload
  const recovered = await decryptEnding(blob, password);
  const valid = JSON.stringify(recovered) === JSON.stringify(payload);

  // Verify wrong password throws
  let wrongThrew = false;
  try {
    await decryptEnding(blob, password + 'X');
  } catch {
    wrongThrew = true;
  }

  if (!valid)      throw new Error('Round-trip failed: decrypted payload does not match original');
  if (!wrongThrew) throw new Error('Wrong password did not throw — encryption may be broken');

  return { blob, valid: true };
}

// ── UTILS ──────────────────────────────────────────────────────────────────
function uint8ToBase64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToUint8(str) {
  const b64  = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin  = atob(b64);
  const buf  = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

// ── CLI USAGE (Node.js) ────────────────────────────────────────────────────
// Run directly: node liftrpg-encrypt.js --password THORNFIELD --payload ending.json
if (typeof process !== 'undefined' && process.argv?.[1]?.endsWith('liftrpg-encrypt.js')) {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };

  const password    = getArg('--password');
  const payloadFile = getArg('--payload');
  const testFlag    = args.includes('--test');

  if (!password || !payloadFile) {
    console.error('Usage: node liftrpg-encrypt.js --password <PASSWORD> --payload <file.json> [--test]');
    process.exit(1);
  }

  const { readFileSync } = await import('fs');
  const payload = JSON.parse(readFileSync(payloadFile, 'utf8'));

  if (testFlag) {
    const result = await validateEncryption(payload, password);
    console.log('✓ Round-trip validation passed');
    console.log('✓ Wrong password correctly rejected');
    console.log('\nEncrypted blob:');
    console.log(result.blob);
    console.log('\nURL:');
    console.log(`https://liftrpg.co/?blob=${result.blob}`);
  } else {
    const blob = await encryptEnding(payload, password);
    console.log(blob);
  }
}
