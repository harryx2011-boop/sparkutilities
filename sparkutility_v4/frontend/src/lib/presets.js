// Local-only presets store. Saved per-category so the UI can filter relevant ones.
const KEY = 'sparkutility_presets_v1';
const MAX_PRESETS = 50;

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_PRESETS)));
  } catch { /* quota or disabled — ignore */ }
}

export function listPresets(category) {
  const all = readAll();
  return category ? all.filter(p => p.category === category) : all;
}

export function savePreset({ name, category, targetFormat, compression, settings }) {
  if (!name || !category) return null;
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return null;

  const all = readAll();
  // Replace existing preset with same name+category, or append.
  const idx = all.findIndex(p => p.category === category && p.name === trimmed);
  const entry = {
    id: idx >= 0 ? all[idx].id : `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: trimmed,
    category,
    targetFormat: targetFormat || '',
    compression: compression || 'balanced',
    settings: settings || {},
    updatedAt: Date.now(),
  };
  if (idx >= 0) all[idx] = entry;
  else all.unshift(entry);
  writeAll(all);
  return entry;
}

export function deletePreset(id) {
  const all = readAll().filter(p => p.id !== id);
  writeAll(all);
}

// ── Shareable token encoding ────────────────────────────────────────────────
// Tokens are URL-safe base64 of a compact-keyed JSON shape so they're short
// enough to copy-paste through any chat / email / message field:
//   { n: name, c: category, t: targetFormat, cp: compression, s: settings }

function toUrlSafe(b64) {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafe(token) {
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return b64 + pad;
}

function encodePreset(preset) {
  const compact = {
    n:  preset.name,
    c:  preset.category,
    t:  preset.targetFormat || '',
    cp: preset.compression  || 'balanced',
    s:  preset.settings     || {},
  };
  // unescape(encodeURIComponent(...)) keeps btoa safe across non-Latin-1
  // characters (preset names may include emoji/non-ASCII).
  const json = JSON.stringify(compact);
  const safe = typeof unescape === 'function'
    ? unescape(encodeURIComponent(json))
    : json;
  return toUrlSafe(btoa(safe));
}

function decodeRaw(token) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Empty token');
  }
  let json;
  try {
    const decoded = atob(fromUrlSafe(token.trim()));
    json = typeof decodeURIComponent === 'function'
      ? decodeURIComponent(escape(decoded))
      : decoded;
  } catch {
    throw new Error('Invalid token format');
  }
  let obj;
  try {
    obj = JSON.parse(json);
  } catch {
    throw new Error('Token payload is not valid JSON');
  }
  if (!obj || typeof obj !== 'object') {
    throw new Error('Token payload is not an object');
  }
  if (typeof obj.n !== 'string' || !obj.n.trim()) {
    throw new Error('Token is missing a preset name');
  }
  if (typeof obj.c !== 'string' || !obj.c.trim()) {
    throw new Error('Token is missing a category');
  }
  return {
    name:         obj.n.slice(0, 60),
    category:     obj.c,
    targetFormat: typeof obj.t  === 'string' ? obj.t  : '',
    compression:  typeof obj.cp === 'string' ? obj.cp : 'balanced',
    settings:     obj.s && typeof obj.s === 'object' ? obj.s : {},
  };
}

export function exportPreset(id) {
  const all = readAll();
  const preset = all.find(p => p.id === id);
  if (!preset) throw new Error('Preset not found');
  return encodePreset(preset);
}

export function decodeToken(token) {
  return decodeRaw(token);
}

export function importPresetFromToken(token) {
  const decoded = decodeRaw(token);
  return savePreset(decoded);
}
