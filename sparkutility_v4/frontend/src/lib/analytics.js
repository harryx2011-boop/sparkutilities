// Privacy-preserving conversion event tracker.
// Sends only: category, source extension, target extension, size bucket.
// No filename, no user identifiers, no IP — all aggregated server-side.
function bucketSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'unknown';
  const mb = bytes / (1024 * 1024);
  if (mb < 10) return '<10MB';
  if (mb < 100) return '10-100MB';
  if (mb < 1024) return '100MB-1GB';
  return '>1GB';
}

function extOf(name) {
  if (typeof name !== 'string') return '';
  const ext = name.split('.').pop().toLowerCase();
  // Strict allowlist character set — server requires /^[A-Za-z0-9]{1,8}$/
  if (!/^[a-z0-9]{1,8}$/.test(ext)) return '';
  return ext;
}

export function recordConversion({ file, category, targetFormat }) {
  if (!file || !category || !targetFormat) return;
  const payload = {
    category,
    targetFormat: String(targetFormat),
    sourceFormat: extOf(file.name),
    sizeBucket: bucketSize(file.size),
  };
  // Fire and forget. Network errors are silent — analytics is never load-bearing.
  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => { /* ignore */ });
}
