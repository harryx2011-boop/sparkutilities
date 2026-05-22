import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X, Download, ChevronDown, ChevronUp, Play,
  FileVideo, FileAudio, FileImage, FileText,
  Loader2, CheckCircle2, AlertCircle, Music2,
  AlertTriangle, Zap, GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import FormatCombobox from './FormatCombobox';
import { Badge } from '@/components/ui/badge';
import { FORMAT_MAP, AUDIO_EXTRACT_TARGETS, formatFileSize, buildFFmpegArgs } from '@/lib/conversionFormats';
import CompressionOptions from './CompressionOptions';
import AdvancedSettings from './AdvancedSettings';
import PresetManager from './PresetManager';
import VideoTrimmer from './VideoTrimmer';
import GifOptions from './GifOptions';
import MediaPreview from './MediaPreview';
import MetadataPanel from './MetadataPanel';
import { playSuccessChime, playErrorBuzz, notifyTaskComplete } from '@/lib/notificationSound';
import { recordConversion } from '@/lib/analytics';
import ShareConversionDialog from './ShareConversionDialog';
import { Share2 } from 'lucide-react';
import { canUseGPU, convertImageGPU } from '@/lib/gpuAccelerate';
import { getFileSizeWarning } from '@/lib/memoryMonitor';

const FILE_ICONS = {
  video:    FileVideo,
  audio:    FileAudio,
  image:    FileImage,
  document: FileText,
};

const STATUS_CONFIG = {
  pending:    { color: 'text-muted-foreground', bg: 'bg-secondary',        label: 'Ready'        },
  converting: { color: 'text-primary',          bg: 'bg-primary/10',       label: 'Converting...' },
  done:       { color: 'text-green-500',        bg: 'bg-green-500/10',     label: 'Complete'     },
  error:      { color: 'text-destructive',      bg: 'bg-destructive/10',   label: 'Error'        },
};

// ── FFmpeg singleton ──────────────────────────────────────────────────────────
// Two cores ship side-by-side and the right one is picked at runtime:
//
//   • core-mt (multi-threaded) — needs SharedArrayBuffer, which needs
//     crossOriginIsolated === true (COOP same-origin + COEP require-corp on the
//     navigation response). On a page that has SAB available, this is 3-5×
//     faster on video and uses every CPU thread.
//   • core (single-threaded)  — works in any browser/origin context. Slower,
//     but it's the only path that survives when the service worker has
//     stripped COOP/COEP from a cached navigation, when the production host
//     forgot to set the headers, or when SAB is gated behind a flag.
//
// We export ffmpegEngine so the UI can show "multi-thread" / "single-thread"
// in the status footer and surface a hint about how to re-enable MT.
let ffmpegInstance = null;
let ffmpegLoading  = null;
export let ffmpegEngine = null; // 'mt' | 'st' | null
const SAB_AVAILABLE =
  typeof window !== 'undefined' &&
  typeof SharedArrayBuffer !== 'undefined' &&
  // Some browsers expose SAB but throttle it unless the page is isolated.
  // crossOriginIsolated is the canonical signal that COOP/COEP took effect.
  window.crossOriginIsolated === true;

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoading)  return ffmpegLoading;

  ffmpegLoading = (async () => {
    const { FFmpeg }               = await import('@ffmpeg/ffmpeg');
    const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

    const ff = new FFmpeg();

    // Large-file optimisation: give the WASM heap more initial memory.
    // The default Emscripten INITIAL_MEMORY is 32 MB which causes OOM
    // during writeFile on files ≥ ~200 MB. We request 1 GB initial +
    // allow growth beyond that. The browser will only map the pages that
    // are actually touched, so requesting 1 GB up front does NOT cost
    // 512 MB of RAM for small files.
    // initial: 16384 pages = 1 GB; maximum: 65536 pages = 4 GB (browser hard cap).
    // Shared memory is required for the MT core; ST core ignores the `shared` flag.
    const wasmMemory = typeof WebAssembly !== 'undefined'
      ? new WebAssembly.Memory({ initial: 16384, maximum: 65536, shared: SAB_AVAILABLE })
      : undefined;

    if (SAB_AVAILABLE) {
      // Fast path — multi-threaded core with one Web Worker per CPU thread.
      try {
        await ff.load({
          coreURL:   await toBlobURL('/ffmpeg-core.js',        'text/javascript'),
          wasmURL:   await toBlobURL('/ffmpeg-core.wasm',      'application/wasm'),
          workerURL: await toBlobURL('/ffmpeg-core.worker.js', 'text/javascript'),
        });
        ffmpegEngine = 'mt';
      } catch (mtErr) {
        // Defensive fallback: SAB was reported available but core-mt still
        // refused to start (rare — usually a CSP / CORS regression on the
        // worker URL). Try the single-threaded core before surfacing an error.
        console.warn('[ffmpeg] core-mt failed, falling back to single-threaded:', mtErr?.message || mtErr);
        await ff.load({
          coreURL: await toBlobURL('/ffmpeg-core-st.js',   'text/javascript'),
          wasmURL: await toBlobURL('/ffmpeg-core-st.wasm', 'application/wasm'),
        });
        ffmpegEngine = 'st';
      }
    } else {
      // Single-threaded core — works without SharedArrayBuffer / cross-origin
      // isolation. The cost is real (3-5× slower on video) but it's the only
      // way to keep the converter usable when the host hasn't set COOP/COEP
      // or when the service worker is serving cached navigations.
      await ff.load({
        coreURL: await toBlobURL('/ffmpeg-core-st.js',   'text/javascript'),
        wasmURL: await toBlobURL('/ffmpeg-core-st.wasm', 'application/wasm'),
      });
      ffmpegEngine = 'st';
    }

    ffmpegInstance = { ff, fetchFile, engine: ffmpegEngine };
    ffmpegLoading  = null; // ← Bug fix: reset so future calls don't re-enter
    return ffmpegInstance;
  })();

  return ffmpegLoading;
}

export { SAB_AVAILABLE };

// ── Pre-conversion size estimate helpers ─────────────────────────────────────
// Rough per-format output-size factors (relative to input).
// Used only when no compression preset is selected; otherwise CompressionOptions
// already shows its own estimate. Values are intentionally conservative.
const FMT_SIZE_FACTORS = {
  gif: 2.0, mp4: 0.7, webm: 0.6, mkv: 0.8, avi: 0.9, mov: 0.8, wmv: 0.85, flv: 0.8,
  wav: 3.0, mp3: 0.5, flac: 0.7, aac: 0.4, ogg: 0.4, m4a: 0.45, opus: 0.35, wma: 0.5,
  png: 1.0, jpg: 0.3, jpeg: 0.3, webp: 0.6, avif: 0.4, bmp: 3.0, tiff: 2.0, ico: 0.1,
  pdf: 1.0, csv: 0.3, xlsx: 0.5, json: 0.8, xml: 1.2, txt: 0.5, html: 1.0, md: 0.5,
};

function getFormatEstimate(fileSize, fmt) {
  if (!fmt || fileSize <= 0) return null;
  const factor = FMT_SIZE_FACTORS[fmt.toLowerCase()] ?? 0.8;
  const est = fileSize * factor;
  if (est < 1024)        return `${Math.round(est)} B`;
  if (est < 1024 * 1024) return `${(est / 1024).toFixed(1)} KB`;
  return `${(est / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Output MIME map ──────────────────────────────────────────────────────────
const OUTPUT_MIME = {
  mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska',
  avi: 'video/x-msvideo', mov: 'video/quicktime', wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv', gif: 'image/gif',
  mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac',
  aac: 'audio/aac', ogg: 'audio/ogg', m4a: 'audio/mp4',
  opus: 'audio/ogg', wma: 'audio/x-ms-wma',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', bmp: 'image/bmp', tiff: 'image/tiff',
  avif: 'image/avif', ico: 'image/x-icon', svg: 'image/svg+xml',
  pdf: 'application/pdf',
  csv: 'text/csv;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  json: 'application/json;charset=utf-8',
  xml: 'application/xml;charset=utf-8',
  txt: 'text/plain;charset=utf-8',
  html: 'text/html;charset=utf-8',
  htm: 'text/html;charset=utf-8',
  md: 'text/markdown;charset=utf-8',
};

function formatDuration(seconds) {
  if (!isFinite(seconds) || seconds <= 0) return '—';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return `${m}m ${rem}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// ── Component ─────────────────────────────────────────────────────────────────
const ConversionCard = forwardRef(function ConversionCard(
  { file, category, selected = false, onSelect, onRemove, onConvert, dragHandleProps, initialTargetFormat = '' },
  ref
) {
  // initialTargetFormat is set when a "Re-apply" history entry pre-selected a
  // format for the next matching file. We normalise it against the targets the
  // useEffect-guard accepts (uppercase per FormatCombobox convention).
  const [targetFormat, setTargetFormat]         = useState(
    initialTargetFormat ? String(initialTargetFormat).toUpperCase() : ''
  );
  const [compression, setCompression]           = useState(null);
  const [advancedSettings, setAdvancedSettings] = useState({});
  const [extractAudio, setExtractAudio]         = useState(false);
  const [trim, setTrim]                         = useState({ enabled: false, start: '', end: '' });
  const [gif, setGif]                           = useState({ fps: 12, width: 480 });
  const [status, setStatus]                     = useState('pending');
  const [progress, setProgress]                 = useState(0);
  const [logs, setLogs]                         = useState([]);
  const [showLogs, setShowLogs]                 = useState(false);
  const [errorMsg, setErrorMsg]                 = useState('');
  const [speedMBs, setSpeedMBs]                 = useState(0);
  const [etaSec, setEtaSec]                     = useState(0);
  const [gpuUsed, setGpuUsed]                   = useState(false);
  const outputRef                               = useRef(null);
  const startTimeRef                            = useRef(0);
  const lastTickRef                             = useRef({ time: 0, progress: 0 });
  const previewRef                              = useRef(null);
  // Bug fix: outputVersion forces re-render so the output snapshot below is fresh
  const [outputVersion, setOutputVersion]       = useState(0);
  const [shareOpen, setShareOpen]               = useState(false);

  // Bug fix: read outputRef.current at render time so it's always up-to-date.
  // Previously "const output = outputRef.current" at line 132 was evaluated once
  // and became stale after retry+reconversion cycles. Now it's derived each render.
  const output = outputRef.current;

  const FileIcon    = FILE_ICONS[category] || FileText;
  const baseTargets = FORMAT_MAP[category]?.targets || [];
  const sourceExt   = (file.name.split('.').pop() || '').toUpperCase();
  const targets = (category === 'video' && extractAudio)
    ? AUDIO_EXTRACT_TARGETS
    : (sourceExt && !baseTargets.includes(sourceExt) ? [sourceExt, ...baseTargets] : baseTargets);

  const effectiveTargetFormat = targetFormat || (extractAudio ? '' : sourceExt);
  const statusInfo = STATUS_CONFIG[status];
  const sizeWarning = getFileSizeWarning(file.size);

  useEffect(() => {
    if (targetFormat && !targets.includes(targetFormat)) setTargetFormat('');
  }, [targets, targetFormat]);

  const appendLog = (msg) => setLogs(prev => [...prev, msg]);

  // ── Conversion ───────────────────────────────────────────────────────────────
  const runConversion = async () => {
    const targetForRun = effectiveTargetFormat;
    if (!targetForRun) return;
    setStatus('converting');
    setProgress(0);
    setLogs([]);
    setErrorMsg('');
    setSpeedMBs(0);
    setEtaSec(0);
    setGpuUsed(false);
    outputRef.current = null;
    setOutputVersion(v => v + 1);
    startTimeRef.current = performance.now();
    lastTickRef.current  = { time: startTimeRef.current, progress: 0 };

    const ext            = targetForRun.toLowerCase();
    const sourceExtLower = (file.name.split('.').pop() || '').toLowerCase();
    const inputName      = `input_${Date.now()}.${sourceExtLower}`;
    const outputName     = `output_${Date.now()}.${ext}`;

    // ── Documents ────────────────────────────────────────────────────────────
    if (category === 'document') {
      try {
        appendLog(`Reading ${file.name}...`);
        setProgress(20);
        const { convertDocument } = await import('@/lib/documentConvert');
        appendLog(`Converting ${sourceExtLower.toUpperCase()} → ${ext.toUpperCase()}${compression ? ` (${compression})` : ''}...`);
        setProgress(60);
        const result = await convertDocument(file, sourceExtLower, ext, compression);
        outputRef.current = { data: result.data, ext: result.ext };
        setOutputVersion(v => v + 1);
        setProgress(100);
        setStatus('done');
        setEtaSec(0);
        const totalSec = (performance.now() - startTimeRef.current) / 1000;
        setSpeedMBs(totalSec > 0 ? (file.size / (1024 * 1024)) / totalSec : 0);
        appendLog(`✓ Done — converted to ${result.ext.toUpperCase()} in ${formatDuration(totalSec)}`);
        playSuccessChime();
        notifyTaskComplete({
          title: `Converted to ${targetForRun}`,
          body:  `${file.name} · ${formatDuration((performance.now() - startTimeRef.current) / 1000)}`,
          tag:   `convert-${file.name}`,
        });
        recordConversion({ file, category, targetFormat: targetForRun });
        if (onConvert) onConvert({ file, targetFormat: targetForRun, outputSize: result.data?.byteLength || result.data?.length || null });
      } catch (err) {
        const msg = err?.message || String(err);
        setErrorMsg(msg);
        appendLog(`✗ Error: ${msg}`);
        setStatus('error');
        setProgress(0);
        setSpeedMBs(0);
        setEtaSec(0);
        playErrorBuzz();
      }
      return;
    }

    // ── SVG ───────────────────────────────────────────────────────────────────
    if (category === 'image' && sourceExtLower === 'svg') {
      try {
        appendLog(`Reading ${file.name}...`);
        setProgress(20);
        const { convertSVG } = await import('@/lib/svgConvert');
        appendLog(`Rasterizing SVG → ${ext.toUpperCase()}...`);
        setProgress(60);
        const result = await convertSVG(file, ext, {
          width:  parseInt(advancedSettings?.image?.width, 10)  || undefined,
          height: parseInt(advancedSettings?.image?.height, 10) || undefined,
        });
        outputRef.current = { data: result.data, ext: result.ext };
        setOutputVersion(v => v + 1);
        setProgress(100);
        setStatus('done');
        setEtaSec(0);
        const totalSec = (performance.now() - startTimeRef.current) / 1000;
        setSpeedMBs(totalSec > 0 ? (file.size / (1024 * 1024)) / totalSec : 0);
        appendLog(`✓ Done — rasterized to ${result.ext.toUpperCase()} in ${formatDuration(totalSec)}`);
        playSuccessChime();
        notifyTaskComplete({
          title: `Converted to ${targetForRun}`,
          body:  `${file.name} · ${formatDuration((performance.now() - startTimeRef.current) / 1000)}`,
          tag:   `convert-${file.name}`,
        });
        recordConversion({ file, category, targetFormat: targetForRun });
        if (onConvert) onConvert({ file, targetFormat: targetForRun, outputSize: result.data?.byteLength || null });
      } catch (err) {
        const msg = err?.message || String(err);
        setErrorMsg(msg);
        appendLog(`✗ Error: ${msg}`);
        setStatus('error');
        setProgress(0);
        setSpeedMBs(0);
        setEtaSec(0);
        playErrorBuzz();
      }
      return;
    }

    // ── GPU image conversion ─────────────────────────────────────────────────
    if (canUseGPU(category, sourceExtLower, ext)) {
      try {
        appendLog(`Using GPU-accelerated conversion (WebGL/Canvas)...`);
        setProgress(20);
        const result = await convertImageGPU(file, ext, {
          quality: compression === 'compact' ? 0.75 : compression === 'lossless' ? 1.0 : 0.92,
        });
        outputRef.current = { data: result.data, ext: result.ext };
        setOutputVersion(v => v + 1);
        setProgress(100);
        setStatus('done');
        setEtaSec(0);
        setGpuUsed(true);
        const totalSec = (performance.now() - startTimeRef.current) / 1000;
        setSpeedMBs(totalSec > 0 ? (file.size / (1024 * 1024)) / totalSec : 0);
        appendLog(`✓ Done (GPU) — converted to ${result.ext.toUpperCase()} in ${formatDuration(totalSec)}`);
        playSuccessChime();
        notifyTaskComplete({
          title: `Converted to ${targetForRun}`,
          body:  `${file.name} · ${formatDuration((performance.now() - startTimeRef.current) / 1000)}`,
          tag:   `convert-${file.name}`,
        });
        recordConversion({ file, category, targetFormat: targetForRun });
        if (onConvert) onConvert({ file, targetFormat: targetForRun, outputSize: result.data?.byteLength || null });
      } catch (err) {
        appendLog(`GPU path failed (${err?.message}), falling back to FFmpeg...`);
        setGpuUsed(false);
        await runFFmpegConversion({ ext, sourceExtLower, inputName, outputName, targetForRun });
      }
      return;
    }

    // ── FFmpeg ────────────────────────────────────────────────────────────────
    await runFFmpegConversion({ ext, sourceExtLower, inputName, outputName, targetForRun });
  };

  const runFFmpegConversion = async ({ ext, sourceExtLower, inputName, outputName, targetForRun }) => {
    try {
      appendLog('Loading FFmpeg engine...');
      setProgress(5);

      const { ff, fetchFile } = await getFFmpeg();

      let totalDuration = 0;
      const onLog = ({ message }) => {
        const durMatch = message.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
        if (durMatch) {
          totalDuration =
            parseInt(durMatch[1]) * 3600 +
            parseInt(durMatch[2]) * 60 +
            parseFloat(durMatch[3]);
        }
        const timeMatch = message.match(/time=\s*(\d+):(\d+):([\d.]+)/);
        if (timeMatch && totalDuration > 0) {
          const cur =
            parseInt(timeMatch[1]) * 3600 +
            parseInt(timeMatch[2]) * 60 +
            parseFloat(timeMatch[3]);
          const pct = Math.min(95, 10 + Math.round((cur / totalDuration) * 85));
          setProgress(pct);

          const now  = performance.now();
          const dPct = pct - lastTickRef.current.progress;
          const dT   = (now - lastTickRef.current.time) / 1000;
          if (dT > 0.4 && dPct > 0) {
            const mbs = (file.size * (dPct / 100) / (1024 * 1024)) / dT;
            setSpeedMBs(mbs);
            const elapsed      = (now - startTimeRef.current) / 1000;
            const remainingPct = Math.max(0, 95 - pct);
            setEtaSec((elapsed / Math.max(1, pct - 5)) * remainingPct);
            lastTickRef.current = { time: now, progress: pct };
          }
        }
        if (
          message.includes('Error')   || message.includes('error') ||
          message.includes('frame=')  || message.includes('time=')  ||
          message.includes('size=')   || message.includes('Duration') ||
          message.includes('Stream')  || message.includes('Output')
        ) {
          appendLog(message.trim());
        }
      };
      ff.on('log', onLog);

      appendLog(`Reading "${file.name}"...`);
      setProgress(8);

      // Large file handling: files ≥ 128 MB get a chunked ArrayBuffer read
      // so we don't spike the JS heap by holding both the original Blob data
      // and the WASM copy alive simultaneously. 128 MB chunks let the GC
      // reclaim each slice before the next one is pinned, reducing peak RSS.
      const LARGE_FILE_THRESHOLD = 128 * 1024 * 1024; // 128 MB
      if (file.size >= LARGE_FILE_THRESHOLD) {
        appendLog(`Large file (${(file.size / (1024 * 1024)).toFixed(0)} MB) — using chunked WASM write for maximum throughput…`);
        const CHUNK = 128 * 1024 * 1024; // 128 MB chunks — optimal for modern V8 GC
        const totalChunks = Math.ceil(file.size / CHUNK);
        const fullBuffer = new Uint8Array(file.size);
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK;
          const end   = Math.min(file.size, start + CHUNK);
          const slice = await file.slice(start, end).arrayBuffer();
          fullBuffer.set(new Uint8Array(slice), start);
          setProgress(8 + Math.round((i / totalChunks) * 4));
        }
        await ff.writeFile(inputName, fullBuffer);
      } else {
        await ff.writeFile(inputName, await fetchFile(file));
      }
      appendLog('File loaded into WASM memory.');
      setProgress(12);

      const args = buildFFmpegArgs({
        inputName,
        outputName,
        category,
        targetFormat: ext,
        compression,
        settings: advancedSettings,
        extractAudio,
        trim: category === 'video' ? trim : null,
        gif: ext === 'gif' ? gif : null,
      });

      appendLog(`Running: ffmpeg ${args.join(' ')}`);
      setProgress(15);

      await ff.exec(args);

      appendLog('Reading output...');
      const data = await ff.readFile(outputName);

      // Guard against silent failures — typically happens when a codec
      // is missing from the WASM core (e.g. libopus not in the single-
      // threaded fallback) or when the input has no audio stream and
      // extractAudio is set. ffmpeg may exit 0 but write nothing.
      if (!data || data.byteLength === 0) {
        try { await ff.deleteFile(inputName);  } catch { /* ignore */ }
        try { await ff.deleteFile(outputName); } catch { /* ignore */ }
        const hint = extractAudio
          ? `Audio extraction produced no output. The source file may not contain an audio track, or the ${ext.toUpperCase()} encoder may be unavailable in this FFmpeg build (${ffmpegEngine || 'unknown'}). Try a different audio format (MP3 / WAV are the most universally supported).`
          : `Conversion produced no output. The ${ext.toUpperCase()} encoder may be unavailable in this FFmpeg build (${ffmpegEngine || 'unknown'}).`;
        throw new Error(hint);
      }

      try { await ff.deleteFile(inputName);  } catch { /* ignore */ }
      try { await ff.deleteFile(outputName); } catch { /* ignore */ }

      ff.off('log', onLog);

      outputRef.current = { data, ext };
      setOutputVersion(v => v + 1);
      setProgress(100);
      setStatus('done');
      setEtaSec(0);
      const totalSec = (performance.now() - startTimeRef.current) / 1000;
      setSpeedMBs(totalSec > 0 ? (file.size / (1024 * 1024)) / totalSec : 0);
      appendLog(`✓ Done — converted to ${targetForRun} in ${formatDuration(totalSec)}`);
      playSuccessChime();
      notifyTaskComplete({
        title: `Converted to ${targetForRun}`,
        body:  `${file.name} · ${formatDuration(totalSec)}`,
        tag:   `convert-${file.name}`,
      });
      recordConversion({ file, category, targetFormat: targetForRun });
      if (onConvert) onConvert({ file, targetFormat: targetForRun, outputSize: data?.byteLength || null });
    } catch (err) {
      console.error('FFmpeg error:', err);
      const msg = err?.message || String(err);
      setErrorMsg(msg);
      appendLog(`✗ Error: ${msg}`);
      setStatus('error');
      setProgress(0);
      setSpeedMBs(0);
      setEtaSec(0);
      playErrorBuzz();
      notifyTaskComplete({
        title: 'Conversion failed',
        body:  `${file.name} · ${msg.slice(0, 100)}`,
        tag:   `convert-${file.name}`,
      });
    }
  };

  useImperativeHandle(ref, () => ({
    convert:    runConversion,
    canConvert: () => status === 'pending' && !!effectiveTargetFormat,
    getStatus:  () => status,
    // Predicts which engine will handle this card if convert() runs now.
    // The batch runner uses this to put GPU/document/SVG cards in the
    // "fast lane" (no concurrency cap) and FFmpeg cards in the "slow lane"
    // (capped by CPU thread count) so a queue of mixed video + image
    // files saturates both engines instead of running serially.
    //   'doc' — runs through documentConvert (no FFmpeg)
    //   'svg' — runs through svgConvert (Canvas API)
    //   'gpu' — runs through convertImageGPU (WebGL/OffscreenCanvas)
    //   'mt'  — runs through FFmpeg multi-threaded core
    //   'st'  — runs through FFmpeg single-threaded core (no SAB)
    getEngineHint: () => {
      if (!effectiveTargetFormat) return null;
      const sourceExt = file.name.split('.').pop()?.toLowerCase() || '';
      const ext = effectiveTargetFormat.toLowerCase();
      if (category === 'document') return 'doc';
      if (category === 'image' && sourceExt === 'svg') return 'svg';
      if (canUseGPU(category, sourceExt, ext)) return 'gpu';
      return SAB_AVAILABLE ? 'mt' : 'st';
    },
    getOutput:  () => {
      const out = outputRef.current;
      if (!out) return null;
      const stem = file.name.replace(/\.[^.]+$/, '');
      return { data: out.data, ext: out.ext, filename: `${stem}.${out.ext}` };
    },
  }), [status, effectiveTargetFormat, runConversion, file.name, category]);

  // ── Download ────────────────────────────────────────────────────────────────
  const handleDownload = () => {
    const out = outputRef.current;
    if (!out) return;
    const { data, ext } = out;
    const mime = OUTPUT_MIME[ext] || 'application/octet-stream';
    const blob = new Blob([data.buffer ?? data], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${file.name.replace(/\.[^.]+$/, '')}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const handleRetry = () => {
    setStatus('pending');
    setProgress(0);
    setLogs([]);
    setErrorMsg('');
    setSpeedMBs(0);
    setEtaSec(0);
    setGpuUsed(false);
    outputRef.current = null;
    setOutputVersion(v => v + 1);
  };

  const handleApplyPreset = (preset) => {
    if (preset.targetFormat && targets.includes(preset.targetFormat)) setTargetFormat(preset.targetFormat);
    if (preset.compression)  setCompression(preset.compression);
    if (preset.settings)     setAdvancedSettings(preset.settings);
  };

  const handleCardClick = (e) => {
    if (!onSelect) return;
    if (e.target.closest('button, input, [role="combobox"], a, [role="button"]')) return;
    onSelect(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      onClick={handleCardClick}
      className={`glass-card rounded-xl overflow-hidden transition-all ${
        selected ? 'ring-2 ring-primary/70 shadow-[0_0_20px_var(--glow-color)]' : ''
      }`}
    >
      <div className="p-4">
        {/* Large file warning */}
        {sizeWarning !== 'none' && status === 'pending' && (
          <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 mb-3 ${
            sizeWarning === 'gigabyte' || sizeWarning === 'very-large'
              ? 'bg-destructive/10 border-destructive/40 text-destructive'
              : 'bg-yellow-500/10 border-yellow-500/40 text-yellow-600 dark:text-yellow-400'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] leading-relaxed">
              {sizeWarning === 'gigabyte'
                ? `Very large file (${formatFileSize(file.size)}) — chunked WASM write enabled for 1 GB+ support. Conversion may take several minutes and requires significant free RAM.`
                : sizeWarning === 'very-large'
                  ? `Large file (${formatFileSize(file.size)}) — conversion may take a while and use significant memory. Ensure no other heavy conversions are running.`
                  : `File is ${formatFileSize(file.size)} — conversion may take a few minutes.`}
            </p>
          </div>
        )}

        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Drag handle — only rendered when DnD is active */}
          {dragHandleProps && (
            <div
              {...dragHandleProps}
              className="flex-shrink-0 mt-3 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <FileIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>{formatFileSize(file.size)}</span>
              <span className="opacity-50">·</span>
              <span className="uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded-md bg-secondary/60 text-foreground/80 font-semibold">
                {category}
              </span>
            </p>
          </div>
          <Badge variant="outline" className={`${statusInfo.bg} ${statusInfo.color} border-0 text-xs`}>
            {status === 'converting' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {status === 'done'       && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {status === 'error'      && <AlertCircle className="w-3 h-3 mr-1" />}
            {statusInfo.label}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(file)}
            disabled={status === 'converting'}
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress bar */}
        {status === 'converting' && (
          <div className="mt-3">
            <Progress value={progress} className="h-1.5" />
            <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
              <span>
                {speedMBs > 0 ? `${speedMBs.toFixed(2)} MB/s` : '—'}
                {' · '}
                ETA {etaSec > 0 ? formatDuration(etaSec) : '—'}
              </span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {/* Done summary */}
        {status === 'done' && (
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
            {gpuUsed && <Zap className="w-3 h-3 text-primary" title="GPU accelerated" />}
            {speedMBs > 0 && <span>Avg throughput: {speedMBs.toFixed(2)} MB/s</span>}
            {gpuUsed && <span className="text-primary font-medium">(GPU accelerated)</span>}
            {output?.data && (
              <span className="text-green-500 font-medium ml-1">
                → {formatFileSize(output.data.byteLength ?? output.data.length)} output
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {status === 'error' && errorMsg && (
          <div className="mt-3 rounded-lg bg-destructive/10 border border-destructive/30 p-2">
            <p className="text-xs text-destructive font-mono break-all">{errorMsg}</p>
          </div>
        )}

        {/* Audio extract toggle */}
        {category === 'video' && status !== 'done' && (
          <button
            type="button"
            onClick={() => setExtractAudio(v => !v)}
            disabled={status === 'converting'}
            className={`mt-3 inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border transition-colors ${
              extractAudio
                ? 'border-primary text-primary bg-primary/10'
                : 'border-border/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Music2 className="w-3 h-3" />
            {extractAudio ? 'Extracting audio only' : 'Extract audio only'}
          </button>
        )}

        {/* Compression */}
        {status !== 'done' && (
          <CompressionOptions value={compression} onChange={setCompression} fileSize={file.size} />
        )}

        {/* Controls row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <FormatCombobox
            value={targetFormat}
            onChange={setTargetFormat}
            formats={targets}
            placeholder={extractAudio ? 'Pick audio format' : `Keep ${sourceExt || 'original'}`}
            sourceExt={extractAudio ? undefined : sourceExt}
            disabled={status === 'converting'}
          />

          {status === 'pending' && (
            <Button
              size="sm"
              disabled={!effectiveTargetFormat}
              onClick={runConversion}
              className="h-9 gap-1.5"
              title={
                !effectiveTargetFormat
                  ? 'Pick an audio format to extract'
                  : targetFormat
                    ? `Convert to ${targetFormat}`
                    : `Re-encode as ${sourceExt} (trim/resize/compress only)`
              }
            >
              <Play className="w-3.5 h-3.5" />
              Convert
              {!targetFormat && !extractAudio && sourceExt && (
                <span className="text-[10px] opacity-70 ml-0.5">→ {sourceExt}</span>
              )}
            </Button>
          )}

          {status === 'done' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 text-green-500 border-green-500/30 hover:bg-green-500/10"
                onClick={handleDownload}
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </Button>
            </>
          )}

          {status === 'error' && (
            <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={handleRetry}>
              Retry
            </Button>
          )}

          {status !== 'done' && status !== 'converting' && (
            <PresetManager
              category={category}
              current={{ targetFormat, compression, settings: advancedSettings }}
              onApply={handleApplyPreset}
            />
          )}

          {logs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 ml-auto text-xs text-muted-foreground"
              onClick={() => setShowLogs(!showLogs)}
            >
              Logs
              {showLogs ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </Button>
          )}
        </div>

        {/* Pre-conversion size estimate — shown when a format is selected but no compression
            preset is active (CompressionOptions already surfaces its own estimate when active) */}
        {status === 'pending' && effectiveTargetFormat && !compression && (() => {
          const est = getFormatEstimate(file.size, effectiveTargetFormat);
          return est ? (
            <p className="text-[11px] text-muted-foreground mt-1.5 ml-0.5">
              Est. output: <span className="font-medium text-foreground/70">~{est}</span>
            </p>
          ) : null;
        })()}

        {category === 'video' && effectiveTargetFormat === 'GIF' && !extractAudio && status !== 'converting' && status !== 'done' && (
          <GifOptions value={gif} onChange={setGif} />
        )}

        {category === 'video' && status !== 'converting' && status !== 'done' && (
          <VideoTrimmer
            trim={trim}
            onChange={setTrim}
            getPreviewTime={() => previewRef.current?.getCurrentTime?.() ?? 0}
            getDuration={() => previewRef.current?.getDuration?.() ?? 0}
          />
        )}

        {(category === 'video' || category === 'audio' || category === 'image') && (
          <MediaPreview
            ref={previewRef}
            file={file}
            category={category}
            output={status === 'done' ? output : null}
            key={`preview-${outputVersion}`}
          />
        )}

        {status !== 'done' && (
          <AdvancedSettings
            category={category}
            settings={advancedSettings}
            onChange={setAdvancedSettings}
          />
        )}

        {(category === 'video' || category === 'audio' || category === 'image') && (
          <MetadataPanel file={file} category={category} getFFmpeg={getFFmpeg} />
        )}

        <ShareConversionDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          file={file}
          sourceFormat={(file.name.split('.').pop() || '').toUpperCase()}
          targetFormat={(output?.ext || '').toUpperCase()}
          originalSize={file.size}
          outputSize={output?.data?.byteLength || 0}
        />

        {showLogs && logs.length > 0 && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            className="mt-3 rounded-lg bg-background/80 border border-border/50 p-3 max-h-40 overflow-y-auto"
          >
            {logs.map((log, i) => (
              <p key={i} className="text-xs font-mono text-muted-foreground leading-relaxed">
                <span className="text-primary/60">[{String(i).padStart(2, '0')}]</span> {log}
              </p>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

export default ConversionCard;
