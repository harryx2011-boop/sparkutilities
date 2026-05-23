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

export function canUseGPU(category, sourceExt, targetExt) {
  if (category !== 'image') return false;
  if (sourceExt === 'svg') return false;
  const GPU_TARGETS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'avif']);
  if (!GPU_TARGETS.has(targetExt.toLowerCase())) return false;
  return isWebGLSupported();
}

export async function convertImageGPU(file, targetExt, opts = {}) {
  const ext = targetExt.toLowerCase();
  const bitmap = await createImageBitmap(file);
  const targetWidth  = opts.width  || bitmap.width;
  const targetHeight = opts.height || bitmap.height;
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

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'bmp') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const mimeMap = {
    png:  'image/png',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    bmp:  'image/bmp',
    gif:  'image/gif',
    avif: 'image/avif',
  };

  const mime    = mimeMap[ext] || 'image/png';
  const quality = opts.quality ?? (ext === 'jpg' || ext === 'jpeg' ? 0.92 : undefined);

  let blob;
  if (typeof canvas.convertToBlob === 'function') {
    blob = await canvas.convertToBlob({ type: mime, quality });
  } else {
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
