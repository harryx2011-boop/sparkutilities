// Lightweight Web Audio chime — no external assets, respects a localStorage mute toggle.
// Also wires up the browser Notification API so a desktop toast pops up when a
// long-running task (file conversion, YouTube download, audio export, etc.)
// finishes — useful when the user has switched tabs.
const MUTE_KEY  = 'sparkutility_mute_sounds';
const PUSH_KEY  = 'sparkutility_push_notifications';

let audioCtx = null;

function getCtx() {
  if (audioCtx) return audioCtx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
}

export function isMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

export function setMuted(muted) {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, '1');
    else localStorage.removeItem(MUTE_KEY);
  } catch { /* ignore */ }
}

// Two-tone "ding" — softer triangle waves with a fast attack/decay envelope.
export function playSuccessChime() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  // Some browsers leave the context suspended until user interaction.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const tone = (freq, start, dur, gainPeak = 0.18) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(gainPeak, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.05);
  };

  tone(880, 0, 0.18);   // A5
  tone(1318.5, 0.12, 0.28); // E6
}

// ─── Browser push notifications ────────────────────────────────────────────────
// Same opt-in / mute model as the chime. The user has to grant permission once
// (the prompt is gated to a user gesture so we don't spam permission requests
// on page load — the ensurePermission() helper is what tools call from a
// Settings toggle). After permission, notifyTaskComplete(...) fires whenever a
// long-running job finishes, even if the tab is in the background.

export function pushSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function pushPermission() {
  return pushSupported() ? Notification.permission : 'denied';
}

export function isPushEnabled() {
  if (!pushSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  try { return localStorage.getItem(PUSH_KEY) === '1'; } catch { return false; }
}

export function setPushEnabled(enabled) {
  try {
    if (enabled) localStorage.setItem(PUSH_KEY, '1');
    else localStorage.removeItem(PUSH_KEY);
  } catch { /* ignore */ }
}

// Request permission from the browser. Must be called from a user gesture
// (button click, etc.) — Chrome/Safari ignore programmatic calls otherwise.
// Returns the resulting permission state.
export async function ensurePushPermission() {
  if (!pushSupported()) return 'denied';
  if (Notification.permission === 'granted') {
    setPushEnabled(true);
    return 'granted';
  }
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') setPushEnabled(true);
    return result;
  } catch {
    return 'denied';
  }
}

// Fire a desktop notification. Silent no-op if push is muted, permission
// denied, or the API is unavailable. Pass a tag so repeated notifications
// for the same job replace each other instead of stacking.
export function notifyTaskComplete({ title, body, tag, icon } = {}) {
  if (!isPushEnabled()) return;
  try {
    const n = new Notification(title || 'SparkUtilities', {
      body: body || '',
      tag: tag || 'sparkutility-task',
      icon: icon || '/favicon.svg',
      silent: false,    // let the OS chime layer atop our in-page chime
    });
    // Auto-dismiss after 7s so the user's notification tray stays clean.
    setTimeout(() => { try { n.close(); } catch { /* ignore */ } }, 7000);
    n.onclick = () => {
      try { window.focus(); } catch { /* ignore */ }
      try { n.close(); } catch { /* ignore */ }
    };
  } catch { /* notification API can throw inside iframes / restricted contexts */ }
}

// Short "error" buzz for failed conversions.
export function playErrorBuzz() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.linearRampToValueAtTime(140, now + 0.25);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.35);
}
