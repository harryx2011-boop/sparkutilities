// Parse a timestamp string into seconds. Accepts:
//   "12.5"          → 12.5
//   "1:30"          → 90
//   "1:02:30"       → 3750
//   "01:02:30.500"  → 3750.5
// Returns NaN for invalid input.
export function parseTimecode(input) {
  if (typeof input === 'number') return input;
  if (!input) return NaN;
  const str = String(input).trim();
  if (!str) return NaN;

  if (!/^[\d:.]+$/.test(str)) return NaN;

  const parts = str.split(':');
  if (parts.length > 3) return NaN;

  const nums = parts.map(p => Number(p));
  if (nums.some(n => Number.isNaN(n) || n < 0)) return NaN;

  if (parts.length === 1) return nums[0];
  if (parts.length === 2) return nums[0] * 60 + nums[1];
  return nums[0] * 3600 + nums[1] * 60 + nums[2];
}

// Format seconds into "HH:MM:SS.mmm" (or "MM:SS.mmm" when under an hour).
export function formatTimecode(seconds, { showMs = true } = {}) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total - h * 3600 - m * 60;

  const pad = (n) => String(Math.floor(n)).padStart(2, '0');
  const sStr = showMs
    ? s.toFixed(2).padStart(5, '0')
    : pad(s);

  return h > 0
    ? `${pad(h)}:${pad(m)}:${sStr}`
    : `${pad(m)}:${sStr}`;
}

// Convert seconds to the canonical "HH:MM:SS.mmm" form ffmpeg accepts.
export function toFFmpegTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00:00.000';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds - h * 3600 - m * 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
}
