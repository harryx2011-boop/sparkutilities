function probeImage(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        kind: 'image',
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ kind: 'image', error: 'Browser could not decode this image format' });
    };
    img.src = url;
  });
}

function probeAV(file, kind) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(kind === 'video' ? 'video' : 'audio');
    el.preload = 'metadata';
    el.muted = true;
    let settled = false;

    const finish = (data) => {
      if (settled) return;
      settled = true;
      el.src = '';
      try { el.load(); } catch { /* ignore */ }
      URL.revokeObjectURL(url);
      resolve(data);
    };

    el.addEventListener('loadedmetadata', () => {
      const data = { kind, duration: Number.isFinite(el.duration) ? el.duration : 0 };
      if (kind === 'video') {
        data.width = el.videoWidth || 0;
        data.height = el.videoHeight || 0;
      }
      finish(data);
    });

    el.addEventListener('error', () => {
      finish({ kind, error: 'Browser could not decode this file natively' });
    });

    // Fall-back timeout — some containers stall the metadata event indefinitely.
    setTimeout(() => finish({ kind, error: 'Metadata probe timed out' }), 8000);

    el.src = url;
  });
}

export async function quickProbe(file, category) {
  if (!file) return null;
  if (category === 'image') return probeImage(file);
  if (category === 'video') return probeAV(file, 'video');
  if (category === 'audio') return probeAV(file, 'audio');
  return null;
}

// Sample lines we care about:
//   Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'input.mp4':
//   Duration: 00:01:23.45, start: 0.000000, bitrate: 4567 kb/s
//   Stream #0:0(und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709), 1920x1080 [SAR 1:1 DAR 16:9], 4321 kb/s, 30 fps, 30 tbr, 15360 tbn (default)
//   Stream #0:1(und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 192 kb/s (default)
function parseFFmpegMetadata(logLines) {
  const out = {
    container: null,
    duration: null,
    bitrate: null,
    streams: [],
  };

  for (const raw of logLines) {
    const line = raw.trim();

    const containerMatch = line.match(/^Input #\d+, ([^,]+(?:,[^,]+)*),/);
    if (containerMatch) {
      out.container = containerMatch[1];
      continue;
    }

    const durMatch = line.match(/Duration:\s*(\d+):(\d+):([\d.]+)(?:.*?bitrate:\s*([\d.]+\s*\w+\/s))?/);
    if (durMatch) {
      const h = parseInt(durMatch[1]);
      const m = parseInt(durMatch[2]);
      const s = parseFloat(durMatch[3]);
      out.duration = h * 3600 + m * 60 + s;
      if (durMatch[4]) out.bitrate = durMatch[4].replace(/\s+/g, ' ').trim();
      continue;
    }

    const streamMatch = line.match(/Stream\s+#(\d+):(\d+)[^:]*:\s*(Video|Audio|Subtitle|Data):\s*(.+)$/i);
    if (streamMatch) {
      const [, , idx, kind, rest] = streamMatch;
      const lower = kind.toLowerCase();
      const stream = { index: parseInt(idx), type: lower, raw: rest };

      if (lower === 'video') {
        const codecMatch = rest.match(/^([a-z0-9_]+)/i);
        const resMatch = rest.match(/(\d{2,5})x(\d{2,5})/);
        const fpsMatch = rest.match(/([\d.]+)\s*fps/);
        const brMatch = rest.match(/([\d.]+\s*\w+\/s)/);
        if (codecMatch) stream.codec = codecMatch[1];
        if (resMatch) { stream.width = parseInt(resMatch[1]); stream.height = parseInt(resMatch[2]); }
        if (fpsMatch) stream.fps = parseFloat(fpsMatch[1]);
        if (brMatch) stream.bitrate = brMatch[1].trim();
      } else if (lower === 'audio') {
        const codecMatch = rest.match(/^([a-z0-9_]+)/i);
        const srMatch = rest.match(/(\d{4,6})\s*Hz/);
        const brMatch = rest.match(/([\d.]+\s*\w+\/s)/);
        const chMatch = rest.match(/(stereo|mono|5\.1|7\.1|quad|\b\d+\s*channels?\b)/i);
        if (codecMatch) stream.codec = codecMatch[1];
        if (srMatch) stream.sampleRate = parseInt(srMatch[1]);
        if (brMatch) stream.bitrate = brMatch[1].trim();
        if (chMatch) stream.channels = chMatch[1];
      }

      out.streams.push(stream);
    }
  }

  return out;
}

// Run an ffmpeg `-i` pass to extract metadata. Reuses the singleton instance
// already loaded by ConversionCard.jsx — pass it in.
export async function deepProbe(file, ffmpegInstance) {
  if (!ffmpegInstance) throw new Error('ffmpeg instance required');
  const { ff, fetchFile } = ffmpegInstance;

  const ext = file.name.split('.').pop().toLowerCase();
  const probeName = `probe_${Date.now()}.${ext}`;
  const lines = [];

  const onLog = ({ message }) => { lines.push(message); };
  ff.on('log', onLog);

  try {
    await ff.writeFile(probeName, await fetchFile(file));
    // -hide_banner cuts header noise. -i with no output causes ffmpeg to
    // print stream info then exit non-zero, which we expect.
    try {
      await ff.exec(['-hide_banner', '-i', probeName, '-f', 'null', '-']);
    } catch {
      // ffmpeg often returns non-zero from this probe pattern on certain
      // builds. The log lines were still captured, so swallow and proceed.
    }
  } finally {
    ff.off('log', onLog);
    try { await ff.deleteFile(probeName); } catch { /* ignore */ }
  }

  return parseFFmpegMetadata(lines);
}
