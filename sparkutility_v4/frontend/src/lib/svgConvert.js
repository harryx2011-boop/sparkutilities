// Native SVG conversion via the browser's canvas. Avoids a librsvg dependency
// in ffmpeg.wasm — most users only need SVG → raster anyway.
//
// Public API:
//   convertSVG(file, targetExt, options) → Promise<{ data: Uint8Array, ext: string }>
// Supports SVG → PNG / JPG / WebP / BMP / GIF (single-frame) and SVG → SVG passthrough.

const SVG_RASTER_TARGETS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif']);
const RASTER_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  bmp: 'image/bmp',
  gif: 'image/gif',
};

export function isSvgConvertibleTarget(targetExt) {
  const t = String(targetExt || '').toLowerCase();
  return t === 'svg' || SVG_RASTER_TARGETS.has(t);
}

async function svgToImageBitmap(file) {
  const text = await file.text();
  // Inline parse so we can read width/height from the root element.
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const errEl = doc.querySelector('parsererror');
  if (errEl) throw new Error('Invalid SVG: ' + errEl.textContent.slice(0, 200));
  const svg = doc.documentElement;

  // Pick a sensible default canvas size when SVG has no explicit dims.
  const viewBox = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
  const defaultW = viewBox.length === 4 && viewBox[2] > 0 ? viewBox[2] : 1024;
  const defaultH = viewBox.length === 4 && viewBox[3] > 0 ? viewBox[3] : 1024;
  const w = parseFloat(svg.getAttribute('width')) || defaultW;
  const h = parseFloat(svg.getAttribute('height')) || defaultH;

  // Use a Blob URL rather than a data URL — avoids percent-encoding the entire
  // SVG and works for arbitrarily large vectors.
  const blob = new Blob([text], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    return { img, width: w, height: h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Browser failed to render this SVG'));
    img.src = url;
  });
}

function clampSize(width, height, maxSide = 8192) {
  if (width <= maxSide && height <= maxSide) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxSide / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function convertSVG(file, targetExt, options = {}) {
  const target = String(targetExt || '').toLowerCase();

  // Same-format passthrough — re-emit the original bytes verbatim.
  if (target === 'svg') {
    const data = new Uint8Array(await file.arrayBuffer());
    return { data, ext: 'svg' };
  }

  if (!SVG_RASTER_TARGETS.has(target)) {
    throw new Error(`SVG → ${target.toUpperCase()} not supported (rasterize to PNG/JPG/WebP/BMP/GIF instead).`);
  }

  const { img, width, height } = await svgToImageBitmap(file);

  // Honor an explicit user-requested resize; otherwise clamp to a sane max so
  // a vector with viewBox="0 0 99999 99999" doesn't OOM the tab.
  let outW = options.width || width;
  let outH = options.height || height;
  ({ width: outW, height: outH } = clampSize(outW, outH));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  // JPG has no alpha — paint a white background first.
  if (target === 'jpg' || target === 'jpeg' || target === 'bmp') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
  }
  ctx.drawImage(img, 0, 0, outW, outH);

  const mime = RASTER_MIME[target] || 'image/png';
  const quality = target === 'jpg' || target === 'jpeg' || target === 'webp' ? (options.quality ?? 0.92) : undefined;
  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), mime, quality),
  );
  return { data: new Uint8Array(await blob.arrayBuffer()), ext: target === 'jpeg' ? 'jpg' : target };
}
