/**
 * memoryMonitor.js
 * Lightweight memory-pressure utilities.
 *
 * Uses performance.memory (Chrome/Edge only) when available,
 * and provides size-based heuristics as a universal fallback.
 */

// Thresholds — raised to support 1 GB+ files (MTS, MOV, etc.)
export const LARGE_FILE_BYTES      = 256 * 1024 * 1024;  // 256 MB — info notice
export const VERY_LARGE_FILE_BYTES = 768 * 1024 * 1024;  // 768 MB — strong warning
export const HEAP_WARN_RATIO    = 0.80;                   // 80% heap used → warn
export const HEAP_CRITICAL_RATIO = 0.92;                  // 92% heap used → critical

/**
 * Returns current heap usage ratio [0..1] if available, else null.
 */
export function getHeapRatio() {
  try {
    const mem = performance?.memory;
    if (!mem || !mem.jsHeapSizeLimit || mem.jsHeapSizeLimit === 0) return null;
    return mem.usedJSHeapSize / mem.jsHeapSizeLimit;
  } catch {
    return null;
  }
}

/**
 * Returns memory pressure level: 'ok' | 'warn' | 'critical'
 * based on heap ratio. Falls back to 'ok' when API unavailable.
 */
export function getMemoryPressure() {
  const ratio = getHeapRatio();
  if (ratio === null) return 'ok';
  if (ratio >= HEAP_CRITICAL_RATIO) return 'critical';
  if (ratio >= HEAP_WARN_RATIO)     return 'warn';
  return 'ok';
}

/**
 * Returns the warning level for a given file size.
 * 'none' | 'large' | 'very-large'
 */
export function getFileSizeWarning(bytes) {
  if (bytes >= 1024 * 1024 * 1024)    return 'gigabyte';   // ≥ 1 GB — chunked WASM write
  if (bytes >= VERY_LARGE_FILE_BYTES) return 'very-large';  // ≥ 768 MB
  if (bytes >= LARGE_FILE_BYTES)      return 'large';       // ≥ 256 MB
  return 'none';
}

/**
 * Subscribe to periodic memory pressure checks.
 * Returns an unsubscribe function.
 *
 * @param {(level: 'ok'|'warn'|'critical') => void} callback
 * @param {number} intervalMs
 */
export function subscribeMemoryPressure(callback, intervalMs = 3000) {
  // performance.memory is only available in Chrome/Edge — if absent
  // we still call once with 'ok' so the consumer can set initial state.
  callback(getMemoryPressure());
  if (!performance?.memory) return () => {};
  const id = setInterval(() => callback(getMemoryPressure()), intervalMs);
  return () => clearInterval(id);
}
