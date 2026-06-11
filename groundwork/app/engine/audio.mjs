// ── Audio: synthesized, vendored-free (pillar 5 — zero assets, zero network) ─
// WebAudio tones generated at runtime: rest chime, boss sting, roll tick.
// Respects the profile mute setting and never throws when audio is blocked.

let ctx = null;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, start, duration, gainPeak, type = 'sine') {
  const ac = ensureCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ac.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, ac.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + duration + 0.05);
}

export function chimeRestEnd(muted) {
  if (muted) return;
  // two rising notes — "back to work", friendly not alarming
  tone(660, 0, 0.18, 0.18);
  tone(880, 0.2, 0.3, 0.2);
  if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
}

export function rollTick(muted) {
  if (muted) return;
  // Cosmetic-randomness exemption (determinism law): pitch jitter on a UI
  // sound never touches engine state — like the die-face flutter in main.mjs.
  tone(220 + Math.random() * 60, 0, 0.03, 0.05, 'square');
}

export function bossSting(muted, passed) {
  if (muted) return;
  if (passed) {
    // door-opening: low → high resolve
    tone(196, 0, 0.4, 0.16, 'triangle');
    tone(392, 0.25, 0.4, 0.18, 'triangle');
    tone(587, 0.5, 0.7, 0.2, 'triangle');
    if (navigator.vibrate) navigator.vibrate([60, 40, 60, 40, 200]);
  } else {
    // held: two low patient notes — not a defeat sound, a "noted" sound
    tone(196, 0, 0.35, 0.15, 'triangle');
    tone(165, 0.3, 0.5, 0.15, 'triangle');
  }
}

export function unlockAudio() {
  // call once on a user gesture so iOS lets later sounds play
  ensureCtx();
}
