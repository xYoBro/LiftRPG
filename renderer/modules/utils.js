// The standard-A1Z26 predicate and the decoder it gates are shared with the
// generator tree — one implementation in contracts/contract-constants.mjs. A
// local copy is how the generator path ended up rejecting array-form tables
// the renderer accepted, and how decodeA1Z26 came to signal "no password" as
// null on one side and '' on the other (D93).
import { decodeA1Z26, isStandardAlphaTable } from '../../contracts/contract-constants.mjs';

export function safeUpper(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normalisePassword(raw) {
  return safeUpper(raw);
}

export function alpha(hex, value) {
  // Malformed palette values must fail loudly, not paint the page black or
  // emit rgba(NaN,…) (an invalid declaration the browser silently drops).
  if (typeof hex !== 'string' || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
    console.warn('[LiftRPG] alpha(): expected a #rgb/#rrggbb hex color, got '
      + JSON.stringify(hex) + ' — falling back to neutral gray.');
    return 'rgba(128,128,128,' + value + ')';
  }
  const full = hex.length === 4
    ? '#' + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2) + hex.charAt(3) + hex.charAt(3)
    : hex;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + value + ')';
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function mergeObjects(base, overrides) {
  const output = clone(base || {});
  Object.keys(overrides || {}).forEach((key) => {
    output[key] = overrides[key];
  });
  return output;
}

export function validateBooklet(data) {
  const errors = [];
  if (!data || typeof data !== 'object') {
    errors.push('JSON root must be an object.');
    return errors;
  }

  ['meta', 'cover', 'rulesSpread', 'weeks', 'fragments', 'endings'].forEach((key) => {
    if (!data[key]) errors.push('Missing top-level key "' + key + '".');
  });

  if (data.meta && Array.isArray(data.weeks) && data.meta.weekCount !== data.weeks.length) {
    errors.push('meta.weekCount does not match weeks.length.');
  }

  if (Array.isArray(data.weeks)) {
    const bossWeeks = data.weeks.filter((week) => week && week.isBossWeek);
    if (bossWeeks.length !== 1) errors.push('Exactly one boss week is required.');
    if (bossWeeks.length === 1 && data.weeks[data.weeks.length - 1] !== bossWeeks[0]) {
      errors.push('Boss week must be final week.');
    }
  }

  return errors;
}

export function splitParagraphs(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function splitRichContentBlocks(content) {
  const value = String(content || '').trim();
  if (!value) return [];

  if (/<p\b/i.test(value)) {
    const blocks = value.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi);
    if (blocks && blocks.length) {
      return blocks.map((block) => block.trim()).filter(Boolean);
    }
  }

  if (/<[a-z][\s\S]*>/i.test(value)) {
    return [value];
  }

  return splitParagraphs(value);
}

export function joinRichContentBlocks(blocks) {
  const normalized = (blocks || []).map((block) => String(block || '').trim()).filter(Boolean);
  if (!normalized.length) return '';
  const hasHtml = normalized.some((block) => /<[a-z][\s\S]*>/i.test(block));
  return hasHtml ? normalized.join('') : normalized.join('\n\n');
}

export function stripHtml(text) {
  return String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function unwrapElement(element) {
  const parent = element && element.parentNode;
  if (!parent) return;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
}

function isSafeUrl(url) {
  const value = String(url || '').trim();
  if (!value) return false;
  if (value.startsWith('#') || value.startsWith('/')) return true;
  if (/^(https?:|mailto:|tel:)/i.test(value)) return true;
  return false;
}

function sanitizeDomTree(root, allowedTags, blockedTags, allowedAttributes, options = {}) {
  Array.from(root.querySelectorAll('*')).forEach((element) => {
    const tagName = String(element.tagName || '').toUpperCase();

    if (blockedTags.has(tagName)) {
      element.remove();
      return;
    }

    if (!allowedTags.has(tagName)) {
      unwrapElement(element);
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = String(attribute.name || '');
      const lowerName = name.toLowerCase();
      const value = String(attribute.value || '');

      if (
        lowerName.startsWith('on')
        || lowerName === 'style'
        || lowerName === 'src'
        || lowerName === 'srcdoc'
        || lowerName === 'xlink:href'
      ) {
        element.removeAttribute(name);
        return;
      }

      if (lowerName === 'href') {
        if (!options.allowHref || !isSafeUrl(value)) {
          element.removeAttribute(name);
          element.removeAttribute('target');
          element.removeAttribute('rel');
          return;
        }
        element.setAttribute('rel', 'noopener noreferrer');
        return;
      }

      if (!allowedAttributes.has(name) && !allowedAttributes.has(lowerName)) {
        element.removeAttribute(name);
      }
    });
  });
}

export function sanitizeHtml(rawHtml) {
  const content = String(rawHtml || '').trim();
  if (!content) return '';

  if (typeof DOMParser === 'undefined') {
    return stripHtml(content);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString('<body>' + content + '</body>', 'text/html');
  const root = doc.body;
  const allowedTags = new Set([
    'A',
    'B',
    'BLOCKQUOTE',
    'BR',
    'EM',
    'HR',
    'I',
    'LI',
    'OL',
    'P',
    'SPAN',
    'STRONG',
    'U',
    'UL'
  ]);
  const blockedTags = new Set([
    'BASE',
    'BUTTON',
    'EMBED',
    'FORM',
    'IFRAME',
    'INPUT',
    'LINK',
    'META',
    'OBJECT',
    'SCRIPT',
    'SELECT',
    'STYLE',
    'SVG',
    'MATH',
    'TEMPLATE',
    'TEXTAREA'
  ]);

  sanitizeDomTree(root, allowedTags, blockedTags, new Set(['href', 'rel', 'title']), { allowHref: true });

  return root.innerHTML.trim();
}

export function sanitizeSvg(rawSvg) {
  const content = String(rawSvg || '').trim();
  if (!content || typeof DOMParser === 'undefined') return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'image/svg+xml');
  const root = doc.documentElement;
  const rootTag = String(root && root.tagName || '').toLowerCase();
  if (rootTag !== 'svg') return '';

  const blockedTags = new Set(['SCRIPT', 'FOREIGNOBJECT', 'IFRAME', 'AUDIO', 'VIDEO', 'IMAGE', 'USE', 'STYLE']);
  const allowedTags = new Set([
    'SVG',
    'G',
    'PATH',
    'LINE',
    'RECT',
    'CIRCLE',
    'ELLIPSE',
    'POLYGON',
    'POLYLINE',
    'TEXT',
    'TSPAN',
    'DEFS',
    'CLIPPATH'
  ]);
  const allowedAttributes = new Set([
    'class',
    'clip-path',
    'cx',
    'cy',
    'd',
    'fill',
    'height',
    'opacity',
    'points',
    'preserveAspectRatio',
    'r',
    'rx',
    'ry',
    'stroke',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-width',
    'text-anchor',
    'transform',
    'viewBox',
    'width',
    'x',
    'x1',
    'x2',
    'y',
    'y1',
    'y2',
    'xmlns'
  ]);

  sanitizeDomTree(root, allowedTags, blockedTags, allowedAttributes);

  root.removeAttribute('style');
  root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return root.outerHTML.trim();
}

export function readingLength(value) {
  return stripHtml(splitParagraphs(value).join(' ')).length;
}

/**
 * Lines a string occupies in a wrapped box of `charsPerLine` characters.
 *
 * The shared primitive behind every measured wrap term in the estimate models
 * (`session-card-metrics.js`, `atoms/week-header.js`). `charsPerLine` is
 * always a FIT — the largest divisor that never predicted fewer lines than the
 * browser actually laid out over the corpus — not a column capacity: greedy
 * word wrap wastes the end of every line, so modelling with the capacity
 * under-counts.
 *
 * Newlines are NOT hard breaks. Every element these models measure renders
 * with `white-space: normal`, which collapses a newline to a space, so
 * splitting on `\n` would model a break the browser never draws. The collapse
 * below is what the browser does, applied before measuring.
 *
 * `Math.max(12, …)` floors the divisor so a corrupted ladder row cannot make
 * the line count explode.
 *
 * @param {string} text
 * @param {number} charsPerLine
 * @returns {number} line count; 0 for empty text
 */
export function countWrappedLines(text, charsPerLine) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 0;

  return Math.max(1, Math.ceil(normalized.length / Math.max(12, charsPerLine)));
}

/**
 * Lines a run of `chars` characters occupies in a box `widthPx` wide, given an
 * average advance width of `charPx` per character.
 *
 * The pixel-space sibling of `countWrappedLines()` above: that one divides by a
 * character capacity, this one divides by a measured width. Atom estimate()
 * paths that already carry a px budget (fragment-doc, map-panel) use this form.
 *
 * SINGLE HOME (see the declaration registry in scripts/validate.mjs). This was
 * declared privately in atoms/fragment-doc.js and atoms/map-panel.js — the D91
 * defect class: two copies of a measurement helper feeding the density solver,
 * with nothing to stop one from being tuned and the other not. They were
 * byte-identical at unification.
 *
 * NOT the same function as `wrappedLines()` in atoms/oracle-table.js, whose
 * third parameter is a FONT SIZE (it derives a per-line character capacity via
 * CHAR_WIDTH_RATIO) rather than a per-character width. That one is a namesake
 * with a different contract, deliberately left in place.
 *
 * `Math.max(1, widthPx)` guards the divisor; a zero-width box would otherwise
 * return Infinity and poison the estimate.
 *
 * @param {number} chars   — character count
 * @param {number} widthPx — box width in CSS pixels
 * @param {number} charPx  — average character advance in CSS pixels
 * @returns {number} line count; 0 for empty input
 */
export function wrappedLines(chars, widthPx, charPx) {
  if (!chars) return 0;
  return Math.max(1, Math.ceil(chars * charPx / Math.max(1, widthPx)));
}

/**
 * Resolves after the browser has painted the current DOM mutations.
 *
 * Two nested rAF callbacks: the first fires before the paint that flushes
 * pending mutations, the second after it. Callers that measure or rasterize
 * (PDF export, post-render font settle) need the second.
 *
 * SINGLE HOME (see the declaration registry in scripts/validate.mjs). Declared
 * privately in app.js and pdf-export.js; byte-identical at unification.
 *
 * @returns {Promise<void>}
 */
export function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

export function pad2(value) {
  return value < 10 ? '0' + value : String(value);
}

export function getPasswordLength(data, fallback) {
  const meta = data.meta || {};
  if (typeof meta.passwordLength === 'number' && meta.passwordLength > 0) return meta.passwordLength;
  const derived = deriveBookletPassword(data);
  if (derived) return derived.length;
  return fallback || 6;
}

export function getDemoPassword(meta) {
  if (meta && typeof meta.demoPassword === 'string' && meta.demoPassword.trim()) return meta.demoPassword;
  if (meta && typeof meta.passwordPlaintext === 'string' && meta.passwordPlaintext.trim()) return meta.passwordPlaintext;
  return '';
}

export function sanitizeBossTextForDisplay(text, password) {
  const raw = String(text || '');
  const upper = normalisePassword(password || '');
  if (!raw || !upper) return raw;

  const escaped = upper.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const quoted = new RegExp('([\'"])' + escaped + '\\1', 'g');
  const bare = new RegExp('\\b' + escaped + '\\b', 'g');

  return raw
    .replace(/enter this password,\s*(['"])?[A-Z0-9-]{3,16}\1?/gi, 'enter the reconstructed password')
    .replace(/the resultant name is your final password/gi, 'the resultant name is the final designation')
    .replace(/to expose\s+(['"])?[A-Z0-9-]{3,16}\1?/gi, 'to expose the hidden author')
    .replace(quoted, "'[REDACTED]'")
    .replace(bare, '[REDACTED]');
}

function derivePasswordFromBossRevealText(boss) {
  const candidates = [
    boss && boss.passwordRevealInstruction,
    boss && boss.narrative,
    boss && boss.convergenceProof
  ].filter(Boolean).map((value) => String(value).trim());

  for (let i = 0; i < candidates.length; i += 1) {
    const revealText = candidates[i];
    if (!revealText) continue;

    const directMatch = revealText.match(/\bpassword\s+is\s+([A-Z0-9-]{3,})\b/i);
    if (directMatch) {
      return normalisePassword(directMatch[1]);
    }

    const enterMatch = revealText.match(/\benter\s+this\s+password,\s*['"]?([A-Z0-9-]{3,})['"]?/i);
    if (enterMatch) {
      return normalisePassword(enterMatch[1]);
    }

    const sequenceMatch = revealText.match(/order:\s*([A-Z](?:\s*-\s*[A-Z]){2,})/i);
    if (sequenceMatch) {
      return normalisePassword(sequenceMatch[1].replace(/\s*-\s*/g, ''));
    }
  }
  return '';
}

function derivePasswordFromReferenceTable(boss) {
  const inputs = Array.isArray(boss && boss.componentInputs) ? boss.componentInputs : [];
  const table = boss && boss.decodingKey && Array.isArray(boss.decodingKey.referenceTable)
    ? boss.decodingKey.referenceTable
    : [];
  if (!inputs.length || !table.length) return '';

  const letters = [];
  for (let index = 0; index < inputs.length; index += 1) {
    const input = String(inputs[index]).trim();
    const match = table.find((entry) => String(entry && entry.value).trim() === input);
    const letter = match && typeof match.letter === 'string' ? match.letter.trim() : '';
    if (!letter) return '';
    letters.push(letter);
  }

  return normalisePassword(letters.join(''));
}

export function deriveBookletPassword(data) {
  const meta = data && data.meta ? data.meta : {};
  if (typeof meta.demoPassword === 'string' && meta.demoPassword.trim()) {
    return normalisePassword(meta.demoPassword);
  }
  if (typeof meta.passwordPlaintext === 'string' && meta.passwordPlaintext.trim()) {
    return normalisePassword(meta.passwordPlaintext);
  }

  const weeks = Array.isArray(data && data.weeks) ? data.weeks : [];
  const bossWeek = weeks.find((week) => week && week.isBossWeek && week.bossEncounter);
  const boss = bossWeek && bossWeek.bossEncounter ? bossWeek.bossEncounter : null;
  if (!boss) return '';

  const explicit = derivePasswordFromBossRevealText(boss);
  if (explicit) return explicit;

  const customTable = derivePasswordFromReferenceTable(boss);
  if (customTable) return customTable;

  if (!boss.decodingKey || !isStandardAlphaTable(boss.decodingKey.referenceTable)) return '';

  return normalisePassword(decodeA1Z26(boss.componentInputs || []));
}

export function getExerciseSetCount(exercise) {
  if (typeof exercise.sets === 'number' && exercise.sets > 0) return Math.min(exercise.sets, 10);
  if (typeof exercise.repsPerSet === 'string' && exercise.repsPerSet.indexOf('/') !== -1) {
    return Math.min(exercise.repsPerSet.split('/').length, 10);
  }
  return 3;
}

export function getExerciseTargetLoad(exercise) {
  if (typeof exercise.notes === 'string' && exercise.notes.trim()) {
    return exercise.notes.trim();
  }
  if (typeof exercise.loadInstruction === 'string' && exercise.loadInstruction.trim()) {
    return exercise.loadInstruction.trim();
  }
  if (typeof exercise.loadGuide === 'string' && exercise.loadGuide.trim()) {
    return exercise.loadGuide.trim();
  }
  if (typeof exercise.weightField === 'string' && exercise.weightField.trim()) {
    return exercise.weightField.trim();
  }
  return '';
}

function normalizeExerciseCue(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim();
}

function compactExerciseCue(raw) {
  const normalized = normalizeExerciseCue(raw);
  if (!normalized) return '';

  const stripped = normalized
    .replace(/\/?\s*update:\s*custom\([^]*$/i, '')
    .replace(/\s*weights\s*=\s*bodyweight[^]*$/i, '')
    .trim();

  if (!stripped) return '';

  const warmupSeconds = stripped.match(/^warmup:\s*1x(\d+)\s*0lb$/i);
  if (warmupSeconds) {
    const totalSeconds = Number(warmupSeconds[1] || 0);
    if (Number.isFinite(totalSeconds) && totalSeconds > 0) {
      if (totalSeconds % 60 === 0) return (totalSeconds / 60) + ' min easy warm-up';
      return totalSeconds + 's easy warm-up';
    }
  }

  if (/^warmup:\s*none/i.test(stripped) && /bodyweight/i.test(normalized)) {
    return 'Warm-up: BW';
  }

  if (/^\d+\s*s$/i.test(stripped)) {
    return '';
  }

  return stripped
    .replace(/^warm\s+up\s+with\s+bodyweight$/i, 'Warm-up: BW')
    .replace(/^warmup:\s*none$/i, 'Warm-up: none')
    .replace(/^assisted\s+if\s+needed$/i, 'Assisted as needed')
    .replace(/^weighted\s+if\s+possible$/i, 'Add weight if possible')
    .replace(/^add\s+weight\s+if\s+possible$/i, 'Add weight if possible')
    .replace(/^add\s+(\d+)\s+reps?\s+from\s+week\s+(\d+)$/i, '+$1 reps from W$2')
    .replace(/^add\s+(\d+)\s+rep\s+from\s+w(\d+)$/i, '+$1 rep from W$2')
    .replace(/^(\d+)\s+min(?:ute)?s?\s+steady\s+state$/i, '$1 min steady')
    .replace(/^(\d+)\s+min(?:ute)?s?\s+final\s+session$/i, '$1 min final')
    .replace(/^final\s+session$/i, 'Final session')
    .replace(/^final\s+pr\s+attempt$/i, 'Final PR')
    .replace(/^\(?amrap\)?,\s*\d+x\d+\s*0lb\s*\/\s*\d+s$/i, 'AMRAP + back-off')
    .replace(/^\(?amrap\)?$/i, 'AMRAP')
    .replace(/^\(?test\)?$/i, 'Test set')
    .replace(/^max\s+effort$/i, 'Max effort');
}

function parseLoadValue(rawGuide) {
  const guide = normalizeExerciseCue(rawGuide);
  if (!guide || guide.toLowerCase() === 'done') {
    return { value: '', unit: '', isWeightLike: false };
  }

  var match = guide.match(/^(\d+(?:\.\d+)?)\s*(lb|lbs)$/i);
  if (match) {
    return { value: match[1], unit: 'lbs', isWeightLike: true };
  }

  match = guide.match(/^(\d+(?:\.\d+)?)\s*(kg|kgs)$/i);
  if (match) {
    return { value: match[1], unit: 'kg', isWeightLike: true };
  }

  match = guide.match(/^(\d+(?:\.\d+)?)\s*%\s*(?:of\s*)?(1rm)$/i);
  if (match) {
    return { value: match[1] + '%', unit: '1RM', isWeightLike: true };
  }

  match = guide.match(/^(\d+(?:\.\d+)?)\s*%$/i);
  if (match) {
    return { value: match[1] + '%', unit: '', isWeightLike: true };
  }

  if (/^body\s*weight$/i.test(guide)) {
    return { value: 'BW', unit: '', isWeightLike: true };
  }

  return { value: '', unit: '', isWeightLike: false };
}

export function describeExerciseLoad(exercise) {
  const rawGuide = typeof exercise.weightField === 'string' ? exercise.weightField.trim() : '';
  const rawInstruction = getExerciseTargetLoad(exercise);
  const load = parseLoadValue(rawGuide);
  let instruction = compactExerciseCue(rawInstruction);

  if (!instruction && rawGuide && !load.isWeightLike) {
    instruction = compactExerciseCue(rawGuide);
  }

  if (instruction && /^0+\s*(lb|lbs)$/i.test(rawGuide)) {
    load.value = '';
    load.unit = '';
    load.isWeightLike = false;
  }

  return {
    hasLoadValue: !!load.value,
    loadValue: load.value,
    loadUnit: load.unit,
    instructionHint: instruction
  };
}

export function formatExerciseTargetLoad(exercise) {
  const raw = getExerciseTargetLoad(exercise);
  if (!raw) return '';

  const normalized = raw.replace(/\s+/g, ' ').trim();
  const rmMatch = normalized.match(/(\d+\s*%)\s*(?:of\s*)?(1RM)/i);
  if (rmMatch) {
    return (rmMatch[1] + ' ' + rmMatch[2].toUpperCase()).replace(/\s+/g, ' ').trim();
  }

  const percentMatch = normalized.match(/\d+\s*%/);
  if (percentMatch) return percentMatch[0].replace(/\s+/g, ' ');

  const poundsMatch = normalized.match(/\d+\s*(?:lb|lbs)/i);
  if (poundsMatch) return poundsMatch[0].toLowerCase();

  return normalized.split(/[.;,(]/)[0].trim().slice(0, 32);
}

export function getLoadGuide(exercise) {
  if (typeof exercise.weightField === 'string' && exercise.weightField.trim()) {
    return exercise.weightField.trim();
  }
  if (exercise.weightField === false) return 'done';
  return 'weight';
}

export function showLoadSuffix(exercise) {
  return getLoadGuide(exercise).toLowerCase() !== 'done';
}

export function getRepTargets(exercise) {
  const count = getExerciseSetCount(exercise);
  if (typeof exercise.repsPerSet === 'string' && exercise.repsPerSet.indexOf('/') !== -1) {
    const targets = exercise.repsPerSet.split('/').map((part) => String(part || '').trim()).filter(Boolean);
    if (!targets.length) return Array.from({ length: count }, () => '');
    return Array.from({ length: count }, (_, index) => targets[Math.min(index, targets.length - 1)]);
  }

  const target = exercise.repsPerSet == null ? '' : String(exercise.repsPerSet).trim();
  return Array.from({ length: count }, () => target);
}

export function extractFragmentRefs(node) {
  let refs = [];
  if (!node || typeof node !== 'object') return refs;

  if (Array.isArray(node)) {
    node.forEach((child) => {
      refs = refs.concat(extractFragmentRefs(child));
    });
    return refs;
  }

  if (typeof node.fragmentRef === 'string') {
    refs.push(node.fragmentRef);
  }

  Object.keys(node).forEach((key) => {
    if (typeof node[key] === 'string') {
      const match = node[key].match(/\bF\.\d+\b/g);
      if (match) refs = refs.concat(match);
    } else if (typeof node[key] === 'object') {
      refs = refs.concat(extractFragmentRefs(node[key]));
    }
  });

  return refs;
}
