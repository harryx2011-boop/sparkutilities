// Thresholds — raised to support 1 GB+ files (MTS, MOV, etc.)
export const LARGE_FILE_BYTES      = 256 * 1024 * 1024;  // 256 MB — info notice
export const VERY_LARGE_FILE_BYTES = 768 * 1024 * 1024;  // 768 MB — strong warning
export const HEAP_WARN_RATIO    = 0.80;                   // 80% heap used → warn
export const HEAP_CRITICAL_RATIO = 0.92;                  // 92% heap used → critical

export function getHeapRatio() {
  try {
    const mem = performance?.memory;
    if (!mem || !mem.jsHeapSizeLimit || mem.jsHeapSizeLimit === 0) return null;
    return mem.usedJSHeapSize / mem.jsHeapSizeLimit;
  } catch {
    return null;
  }
}

export function getMemoryPressure() {
  const ratio = getHeapRatio();
  if (ratio === null) return 'ok';
  if (ratio >= HEAP_CRITICAL_RATIO) return 'critical';
  if (ratio >= HEAP_WARN_RATIO)     return 'warn';
  return 'ok';
}

export function getFileSizeWarning(bytes) {
  if (bytes >= 1024 * 1024 * 1024)    return 'gigabyte';   // ≥ 1 GB — chunked WASM write
  if (bytes >= VERY_LARGE_FILE_BYTES) return 'very-large';  // ≥ 768 MB
  if (bytes >= LARGE_FILE_BYTES)      return 'large';       // ≥ 256 MB
  return 'none';
}

export function subscribeMemoryPressure(callback, intervalMs = 3000) {
  callback(getMemoryPressure());
  if (!performance?.memory) return () => {};
  const id = setInterval(() => callback(getMemoryPressure()), intervalMs);
  return () => clearInterval(id);
}
