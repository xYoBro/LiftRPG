export function safeUpper(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normalisePassword(raw) {
  return safeUpper(raw);
}

export function alpha(hex, value) {
  if (!hex || hex.charAt(0) !== '#' || (hex.length !== 7 && hex.length !== 4)) {
    return 'rgba(0,0,0,' + value + ')';
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

export function readingLength(value) {
  return stripHtml(splitParagraphs(value).join(' ')).length;
}

export function pad2(value) {
  return value < 10 ? '0' + value : String(value);
}

export function getPasswordLength(data, fallback) {
  const meta = data.meta || {};
  if (typeof meta.passwordLength === 'number' && meta.passwordLength > 0) return meta.passwordLength;
  if (typeof meta.demoPassword === 'string' && meta.demoPassword.trim()) return meta.demoPassword.trim().length;
  if (meta.passwordPlaintext) return meta.passwordPlaintext.length;
  return fallback || 6;
}

export function getDemoPassword(meta) {
  if (meta && typeof meta.demoPassword === 'string' && meta.demoPassword.trim()) return meta.demoPassword;
  if (meta && typeof meta.passwordPlaintext === 'string' && meta.passwordPlaintext.trim()) return meta.passwordPlaintext;
  return '';
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

  return normalized.split(/[.;,(]/)[0].trim().slice(0, 12);
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
