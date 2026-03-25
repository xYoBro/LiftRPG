// ── Pipeline checkpoint persistence ──────────────────────────────────────────
// Extracted from api-generator.js (lines 4720–4773).
// Saves and restores per-stage pipeline state in sessionStorage so that
// interrupted runs can resume without reissuing completed API calls.

import { CHECKPOINT_STORAGE_KEY } from './constants.js';

export function loadCheckpoint() {
  try {
    var raw = sessionStorage.getItem(CHECKPOINT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_e) { return null; }
}

export function initCheckpoint(inputs) {
  var cp = {
    inputs: {
      workout: inputs.workout || '',
      brief: inputs.brief || '',
      model: inputs.model || '',
      provider: inputs.provider || '',
      pipeline: inputs.pipeline || ''
    },
    stages: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  try {
    sessionStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(cp));
  } catch (_e) {
    console.warn('[LiftRPG] Could not init pipeline checkpoint:', _e.message);
  }
  return cp;
}

export function saveCheckpoint(stage, data, checkpoint) {
  try {
    var cp = checkpoint || loadCheckpoint() || { inputs: {}, stages: {} };
    cp.stages[stage] = data;
    cp.updatedAt = new Date().toISOString();
    sessionStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(cp));
    return cp;
  } catch (_e) {
    console.warn('[LiftRPG] Could not save pipeline checkpoint:', _e.message);
    return checkpoint || { inputs: {}, stages: {} };
  }
}

export function clearCheckpoint() {
  try { sessionStorage.removeItem(CHECKPOINT_STORAGE_KEY); } catch (_e) {}
}

export function countResumedStages(checkpoint) {
  if (!checkpoint || !checkpoint.stages) return 0;
  return Object.keys(checkpoint.stages).length;
}

export function getCheckpoint() {
  return loadCheckpoint();
}
