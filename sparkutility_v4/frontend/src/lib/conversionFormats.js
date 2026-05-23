import { parseTimecode, toFFmpegTime } from './timecode';

export const CATEGORIES = [
  { key: 'video',    label: 'Video',    icon: 'Video'    },
  { key: 'audio',    label: 'Audio',    icon: 'Music'    },
  { key: 'image',    label: 'Image',    icon: 'Image'    },
  { key: 'document', label: 'Document', icon: 'FileText' },
];

export const FORMAT_MAP = {
  video: {
    accepts:   '.mp4,.avi,.mkv,.mov,.wmv,.flv,.webm,.mts,.m2ts,.ts,.mpeg,.mpg,.3gp,.ogv',
    targets:   ['MP4', 'AVI', 'MKV', 'MOV', 'WEBM', 'GIF', 'WMV', 'FLV'],
    mimeTypes: 'video/*,.mts,.m2ts',
  },
  audio: {
    accepts:   '.mp3,.wav,.flac,.aac,.ogg,.wma,.m4a,.opus,.aiff',
    targets:   ['MP3', 'WAV', 'FLAC', 'AAC', 'OGG', 'M4A', 'OPUS', 'WMA'],
    mimeTypes: 'audio/*',
  },
  image: {
    accepts:   '.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff,.svg,.ico,.avif',
    targets:   ['PNG', 'JPG', 'WEBP', 'GIF', 'BMP', 'TIFF', 'AVIF', 'ICO'],
    mimeTypes: 'image/*',
  },
  document: {
    accepts:   '.pdf,.docx,.doc,.csv,.xlsx,.xls,.json,.xml,.txt,.html,.htm,.md,.rtf,.yaml,.yml,.toml,.ini,.log,.js,.ts,.jsx,.tsx,.css',
    targets:   ['PDF', 'TXT', 'HTML', 'MD', 'CSV', 'XLSX', 'JSON', 'XML'],
    mimeTypes: '.pdf,.docx,.doc,.csv,.xlsx,.xls,.json,.xml,.txt,.html,.htm,.md,.rtf,.yaml,.yml,.toml,.ini,.log,.js,.ts,.jsx,.tsx,.css,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
};

// Targets shown when "Extract audio" is enabled on a video file.
export const AUDIO_EXTRACT_TARGETS = ['MP3', 'WAV', 'FLAC', 'AAC', 'OGG', 'M4A', 'OPUS'];

// Combined accept lists for the dropzone (drops are now category-agnostic).
export const ALL_ACCEPTS = Object.values(FORMAT_MAP).map(f => f.accepts).join(',');
export const ALL_MIME_TYPES = 'video/*,audio/*,image/*,.mts,.m2ts,.pdf,.csv,.xlsx,.xls,.json,.xml,.txt,.html,.md,.rtf,.yaml,.yml,.toml,.ini,.log,.js,.ts,.jsx,.tsx,.css';

export const getFileCategory = (file) => {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  for (const [cat, info] of Object.entries(FORMAT_MAP)) {
    if (info.accepts.includes(`.${ext}`)) return cat;
  }
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf' || mime.startsWith('text/') || mime === 'application/msword' || mime.includes('wordprocessingml') || mime.includes('docx')) return 'document';
  return 'video'; // last-resort fallback
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k     = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i     = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Codec maps
const VIDEO_CODEC_MAP = {
  'H.264 (libx264)': 'libx264',
  'H.265 (libx265)': 'libx265',
  'VP9':             'libvpx-vp9',
  'AV1':             'libaom-av1',
  'MPEG-4':          'mpeg4',
  'ProRes':          'prores',
};

const AUDIO_CODEC_MAP = {
  'AAC':              'aac',
  'MP3 (libmp3lame)': 'libmp3lame',
  'FLAC':             'flac',
  'Opus':             'libopus',
  'Vorbis':           'libvorbis',
  'PCM':              'pcm_s16le',
};

const VIDEO_CRF     = { compact: 40, balanced: 25, lossless: 0 };
const IMAGE_QUALITY = { compact: 50, balanced: 85, lossless: 100 };

// Codec to use when extracting audio to a given format.
const EXTRACT_CODEC_BY_FORMAT = {
  mp3:  'libmp3lame',
  wav:  'pcm_s16le',
  flac: 'flac',
  aac:  'aac',
  ogg:  'libvorbis',
  m4a:  'aac',
  opus: 'libopus',
};

function buildImageScaleFilter(image) {
  if (!image || (image.mode !== 'pixels' && image.mode !== 'percent')) return null;
  if (image.mode === 'pixels') {
    const w = parseInt(image.width, 10);
    const h = parseInt(image.height, 10);
    const lockAR = !!image.lockAspectRatio;
    if (lockAR) {
      if (w > 0 && (!h || h <= 0)) return `scale=${w}:-1`;
      if (h > 0 && (!w || w <= 0)) return `scale=-1:${h}`;
      if (w > 0 && h > 0) return `scale=${w}:${h}:force_original_aspect_ratio=decrease`;
    }
    if (w > 0 && h > 0) return `scale=${w}:${h}`;
    if (w > 0) return `scale=${w}:-1`;
    if (h > 0) return `scale=-1:${h}`;
    return null;
  }
  const pct = parseFloat(image.percent);
  if (!pct || pct <= 0 || pct > 1000) return null;
  const factor = pct / 100;
  return `scale=trunc(iw*${factor}/2)*2:trunc(ih*${factor}/2)*2`;
}

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function resolveTrim(trim) {
  if (!trim || !trim.enabled) return null;
  const startSec = parseTimecode(trim.start);
  const endSec = parseTimecode(trim.end);
  const start = Number.isFinite(startSec) && startSec >= 0 ? startSec : 0;
  const end = Number.isFinite(endSec) ? endSec : null;
  if (end !== null && end <= start) return null;
  return {
    ss: toFFmpegTime(start),
    duration: end !== null ? Math.max(0.001, end - start) : null,
  };
}

export function buildFFmpegArgs({
  inputName, outputName, category, targetFormat, compression, settings,
  extractAudio = false, trim = null, gif = null,
}) {
  const threads = Math.max(1, navigator.hardwareConcurrency || 4);
  const args = ['-threads', String(threads)];

  const trimResolved = resolveTrim(trim);
  if (trimResolved) {
    args.push('-ss', trimResolved.ss);
  }
  args.push('-i', inputName);
  if (trimResolved && trimResolved.duration !== null) {
    args.push('-t', trimResolved.duration.toFixed(3));
  }

  if (category === 'video' && extractAudio) {
    const codec = EXTRACT_CODEC_BY_FORMAT[targetFormat] || 'libmp3lame';
    args.push('-vn', '-c:a', codec);
    if (codec !== 'flac' && codec !== 'pcm_s16le') {
      const br = compression === 'compact' ? '96k' : compression === 'lossless' ? '320k' : '192k';
      args.push('-b:a', br);
    }
    args.push(outputName);
    return args;
  }

  if (category === 'video' && targetFormat === 'gif') {
    const gifFps = clampInt(gif?.fps, 1, 60, 12);
    const gifWidth = clampInt(gif?.width, 32, 1920, 480);
    args.push(
      '-an',
      '-vf',
      `fps=${gifFps},scale=${gifWidth}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
      outputName,
    );
    return args;
  }

  if (category === 'video') {
    const codec = VIDEO_CODEC_MAP[settings?.codec] || 'libx264';
    args.push('-c:v', codec);

    if (codec === 'libx264' || codec === 'libx265') {
      const crf = VIDEO_CRF[compression] ?? 23;
      args.push('-crf', String(crf));
      const preset = compression === 'lossless' ? 'medium' : 'ultrafast';
      args.push('-preset', preset);
    } else if (codec === 'libvpx-vp9') {
      args.push('-b:v', '0', '-crf', String(VIDEO_CRF[compression] ?? 33));
    }

    if (settings?.bitrate && settings.bitrate !== 'Auto') {
      args.push('-b:v', settings.bitrate);
    }

    const resMap = {
      '3840x2160 (4K)':    '3840:2160',
      '1920x1080 (1080p)': '1920:1080',
      '1280x720 (720p)':   '1280:720',
      '854x480 (480p)':    '854:480',
      '640x360 (360p)':    '640:360',
    };
    if (settings?.resolution && resMap[settings.resolution]) {
      args.push('-vf', `scale=${resMap[settings.resolution]}`);
    }

    const fpsMap = { '60': '60', '30': '30', '24': '24', '15': '15' };
    if (settings?.fps && fpsMap[settings.fps]) {
      args.push('-r', fpsMap[settings.fps]);
    }

    args.push('-c:a', 'aac', '-b:a', '128k');

  } else if (category === 'audio') {
    const codec = AUDIO_CODEC_MAP[settings?.codec] || 'libmp3lame';
    args.push('-c:a', codec);

    if (settings?.bitrate && settings.bitrate !== 'Auto') {
      args.push('-b:a', settings.bitrate);
    } else if (codec !== 'flac' && codec !== 'pcm_s16le') {
      const br = compression === 'compact' ? '96k' : compression === 'lossless' ? '320k' : '192k';
      args.push('-b:a', br);
    }

    const srMap = { '48000 Hz': '48000', '44100 Hz': '44100', '22050 Hz': '22050', '16000 Hz': '16000' };
    if (settings?.sampleRate && srMap[settings.sampleRate]) args.push('-ar', srMap[settings.sampleRate]);

    const chMap = { 'Stereo (2)': '2', 'Mono (1)': '1', 'Surround (5.1)': '6' };
    if (settings?.channels && chMap[settings.channels]) args.push('-ac', chMap[settings.channels]);

  } else if (category === 'image') {
    const quality = IMAGE_QUALITY[compression] ?? 85;
    if (targetFormat === 'jpg' || targetFormat === 'jpeg') {
      args.push('-q:v', String(Math.round(2 + (1 - quality / 100) * 29)));
    } else if (targetFormat === 'webp') {
      args.push('-quality', String(quality));
    } else if (targetFormat === 'avif') {
      args.push('-c:v', 'libaom-av1', '-still-picture', '1', '-crf', String(Math.round(63 * (1 - quality / 100))));
    }

    const scaleFilter = buildImageScaleFilter(settings?.image);
    if (scaleFilter) args.push('-vf', scaleFilter);
  }

  args.push(outputName);
  return args;
}
