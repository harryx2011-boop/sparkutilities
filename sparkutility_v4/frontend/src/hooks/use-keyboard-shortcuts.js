import { useEffect } from 'react';

// Skip the shortcut when the user is actively typing somewhere.
function isEditableTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  // Radix Select trigger is a button with role=combobox.
  if (target.getAttribute && target.getAttribute('role') === 'combobox') return true;
  return false;
}

// Detect Mac so 'Mod+X' resolves to Cmd on macOS and Ctrl elsewhere — matching
// what most cross-platform editors do.
const IS_MAC = typeof navigator !== 'undefined'
  && (navigator.platform?.toUpperCase().includes('MAC') || navigator.userAgent?.includes('Macintosh'));

// Parse a binding string into { mod, shift, alt, key }.
// Accepted shapes:
//   'Space', 'Escape', 'k'          — plain key, no modifiers
//   'Mod+z'                         — Cmd on Mac, Ctrl elsewhere + Z
//   'Ctrl+y' / 'Cmd+y'              — explicit modifier
//   'Mod+Shift+z'                   — combined modifiers
function parseBinding(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.split('+').map(s => s.trim()).filter(Boolean);
  const out = { mod: false, shift: false, alt: false, key: '' };
  for (const p of parts) {
    const lower = p.toLowerCase();
    if (lower === 'mod')             out.mod = true;
    else if (lower === 'ctrl')       out.mod = !IS_MAC ? true : out.mod;
    else if (lower === 'cmd' || lower === 'meta') out.mod = IS_MAC ? true : out.mod;
    else if (lower === 'shift')      out.shift = true;
    else if (lower === 'alt' || lower === 'option') out.alt = true;
    else                              out.key = p === ' ' ? 'Space' : p;
  }
  return out.key ? out : null;
}

function bindingMatchesEvent(b, e) {
  if (!b) return false;
  const wantMod = b.mod;
  const haveMod = IS_MAC ? e.metaKey : e.ctrlKey;
  if (wantMod !== haveMod) return false;
  if (b.shift !== e.shiftKey) return false;
  if (b.alt   !== e.altKey)   return false;
  const key = e.key === ' ' ? 'Space' : e.key;
  return key.toLowerCase() === b.key.toLowerCase();
}

/**
 * Bind app-level shortcuts. Each handler is a function called with the original event.
 * Pass `enabled: false` to temporarily disable the listener (e.g. inside a modal).
 *
 * shortcuts: { [binding]: (e) => void }
 *   binding examples:
 *     - 'Space' / 'Escape' / 'k'         (no modifiers — won't fire when Ctrl/Cmd/Alt is held)
 *     - 'Mod+z'                          (Cmd on Mac, Ctrl elsewhere)
 *     - 'Mod+Shift+z' / 'Mod+y'          (combined)
 *
 * Order of matching: longest binding first, so 'Mod+Shift+z' is tried before 'Mod+z'.
 */
export function useKeyboardShortcuts(shortcuts, { enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return undefined;

    // Pre-parse and sort by specificity (more modifiers = higher priority).
    const entries = Object.entries(shortcuts)
      .map(([raw, fn]) => ({ raw, fn, parsed: parseBinding(raw) }))
      .filter(e => e.parsed)
      .sort((a, b) => {
        const score = (p) => (p.mod ? 4 : 0) + (p.shift ? 2 : 0) + (p.alt ? 1 : 0);
        return score(b.parsed) - score(a.parsed);
      });

    const handler = (e) => {
      if (isEditableTarget(e.target)) return;

      for (const { fn, parsed } of entries) {
        // Plain (no-modifier) bindings are skipped when ANY modifier is held —
        // matches the original behaviour so Space-to-convert doesn't fire on Ctrl+Space.
        if (!parsed.mod && !parsed.shift && !parsed.alt) {
          if (e.metaKey || e.ctrlKey || e.altKey) continue;
        }
        if (bindingMatchesEvent(parsed, e)) {
          e.preventDefault();
          fn(e);
          return;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, enabled]);
}
