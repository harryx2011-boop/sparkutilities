/**
 * gpuAccelerate.js
 * Provides WebGL/Canvas GPU-accelerated image processing for specific formats
 * where GPU offloading genuinely helps (image format conversions, resizing).
 * For video/audio we always defer to ffmpeg.wasm (CPU, multi-threaded).
 *
 * GPU acceleration is used ONLY for image conversions where:
 *   - Source is a raster image (not SVG)
 *   - Target is PNG, JPG, WEBP, BMP, GIF, or AVIF
 *   - No advanced codec settings are required
 */

// Detect WebGL2 support once
let _webglSupported = null;
export function isWebGLSupported() {
  if (_webglSupported !== null) return _webglSupported;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    _webglSupported = !!gl;
    if (gl) {
      // Clean up context to avoid resource leak
      const ext = gl.getExtension('WEBGL_lose_context');
      ext?.loseContext();
    }
  } catch {
    _webglSupported = false;
  }
  return _webglSupported;
}

/**
 * Returns true if GPU-accelerated conversion should be used for this job.
 * Criteria: image category, non-SVG source, standard raster target, no trimming.
 */
export function canUseGPU(category, sourceExt, targetExt) {
  if (category !== 'image') return false;
  if (sourceExt === 'svg') return false; // SVG uses its own canvas path
  const GPU_TARGETS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'avif']);
  if (!GPU_TARGETS.has(targetExt.toLowerCase())) return false;
  return isWebGLSupported();
}

/**
 * GPU-accelerated image conversion via OffscreenCanvas / createImageBitmap.
 * Uses the browser's native codec pipeline (which is hardware-accelerated on
 * most platforms) rather than ffmpeg's software decoder.
 *
 * @param {File}   file       - source image file
 * @param {string} targetExt  - output extension (png, jpg, webp, etc.)
 * @param {object} opts       - { width?, height?, quality? }
 * @returns {Promise<{ data: Uint8Array, ext: string }>}
 */
export async function convertImageGPU(file, targetExt, opts = {}) {
  const ext = targetExt.toLowerCase();

  // createImageBitmap is hardware-accelerated and supports most raster formats
  const bitmap = await createImageBitmap(file);

  const targetWidth  = opts.width  || bitmap.width;
  const targetHeight = opts.height || bitmap.height;

  // Prefer OffscreenCanvas (off-main-thread, GPU composited)
  let canvas;
  let ctx;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(targetWidth, targetHeight);
    ctx = canvas.getContext('2d', { alpha: ext === 'png' || ext === 'webp' });
  } else {
    canvas = document.createElement('canvas');
    canvas.width  = targetWidth;
    canvas.height = targetHeight;
    ctx = canvas.getContext('2d', { alpha: ext === 'png' || ext === 'webp' });
  }

  // High-quality downscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill background for formats that don't support transparency
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'bmp') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close(); // free GPU memory

  const mimeMap = {
    png:  'image/png',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    bmp:  'image/bmp',
    gif:  'image/gif',   // canvas gif = static frame only
    avif: 'image/avif',
  };

  const mime    = mimeMap[ext] || 'image/png';
  const quality = opts.quality ?? (ext === 'jpg' || ext === 'jpeg' ? 0.92 : undefined);

  let blob;
  if (typeof canvas.convertToBlob === 'function') {
    // OffscreenCanvas path
    blob = await canvas.convertToBlob({ type: mime, quality });
  } else {
    // Regular canvas path
    blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
        mime,
        quality
      );
    });
  }

  const arrayBuffer = await blob.arrayBuffer();
  return { data: new Uint8Array(arrayBuffer), ext: ext === 'jpeg' ? 'jpg' : ext };
}
