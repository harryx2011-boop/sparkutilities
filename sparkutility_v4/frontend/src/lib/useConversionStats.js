import { useEffect, useMemo, useState } from 'react';

const HISTORY_KEY = 'sparkutility_history_v1';

function readHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Reads `sparkutility_history_v1` and returns memoised aggregates for the Home
 * activity dashboard. Subscribes to the `storage` event so the dashboard stays
 * in sync across tabs. Returns null when the history is empty so the caller
 * can skip rendering the section entirely.
 *
 * @returns {{
 *   total: number,
 *   weekTotal: number,
 *   totalBytes: number,
 *   topFormat: string | null,
 *   topCategory: string | null,
 *   daily: number[]   // length 14, oldest first
 * } | null}
 */
export function useConversionStats() {
  const [history, setHistory] = useState(readHistory);

  useEffect(() => {
    // Refresh whenever the key changes in another tab.
    const onStorage = (e) => {
      if (e.key !== HISTORY_KEY) return;
      setHistory(readHistory());
    };
    window.addEventListener('storage', onStorage);

    // Same-tab refresh: re-read on focus, since the history can be mutated by
    // FileConverter mid-session without dispatching a storage event.
    const onFocus = () => setHistory(readHistory());
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return useMemo(() => {
    if (!history || history.length === 0) return null;

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    let weekTotal = 0;
    let totalBytes = 0;
    const formatCounts = new Map();
    const categoryCounts = new Map();
    const daily = new Array(14).fill(0);

    // Anchor the 14-day window to "today, end of day local" so the rightmost
    // bar always represents today.
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const dayMs = 24 * 60 * 60 * 1000;

    for (const entry of history) {
      const ts = Number(entry?.timestamp) || 0;
      if (ts >= weekAgo) weekTotal += 1;
      totalBytes += Number(entry?.originalSize) || 0;

      const fmt = entry?.targetFormat;
      if (fmt) formatCounts.set(fmt, (formatCounts.get(fmt) || 0) + 1);

      const cat = entry?.category;
      if (cat) categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);

      const daysAgo = Math.floor((today.getTime() - ts) / dayMs);
      if (daysAgo >= 0 && daysAgo < 14) {
        daily[13 - daysAgo] += 1;
      }
    }

    const pickTop = (map) => {
      let topKey = null;
      let topVal = 0;
      for (const [k, v] of map) {
        if (v > topVal) { topKey = k; topVal = v; }
      }
      return topKey;
    };

    return {
      total: history.length,
      weekTotal,
      totalBytes,
      topFormat: pickTop(formatCounts),
      topCategory: pickTop(categoryCounts),
      daily,
    };
  }, [history]);
}
