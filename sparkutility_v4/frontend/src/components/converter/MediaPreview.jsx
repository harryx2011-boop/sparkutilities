import React, { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { formatFileSize } from '@/lib/conversionFormats';

// MIME hint by extension — falls back to file.type, then to a reasonable guess.
const MIME_HINTS = {
  mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska',
  mov: 'video/quicktime', avi: 'video/x-msvideo', flv: 'video/x-flv',
  mts: 'video/mp2t', m2ts: 'video/mp2t', ts: 'video/mp2t',
  mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', aac: 'audio/aac',
  ogg: 'audio/ogg', m4a: 'audio/mp4', opus: 'audio/ogg',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', bmp: 'image/bmp',
};

function pickMime(name, fileType) {
  if (fileType) return fileType;
  const ext = (name.split('.').pop() || '').toLowerCase();
  return MIME_HINTS[ext] || 'application/octet-stream';
}

const MediaPreview = forwardRef(function MediaPreview(
  { file, category, output, defaultOpen = false },
  ref
) {
  const [open, setOpen] = useState(defaultOpen);
  const [origError, setOrigError] = useState(false);
  const [outError, setOutError] = useState(false);

  const origUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const outUrl = useMemo(() => {
    if (!output?.data) return null;
    const mime = MIME_HINTS[output.ext] || 'application/octet-stream';
    return URL.createObjectURL(new Blob([output.data.buffer], { type: mime }));
  }, [output]);

  const origVideoRef = useRef(null);
  const origAudioRef = useRef(null);

  // Browser inferred media kind for the output. The preview "after" panel may
  // be a video, audio, or image depending on what we converted to.
  const outKind = useMemo(() => {
    if (!output?.ext) return null;
    const mime = MIME_HINTS[output.ext] || '';
    if (mime.startsWith('video')) return 'video';
    if (mime.startsWith('audio')) return 'audio';
    if (mime.startsWith('image')) return 'image';
    return null;
  }, [output]);

  useEffect(() => () => {
    if (origUrl) URL.revokeObjectURL(origUrl);
  }, [origUrl]);

  useEffect(() => () => {
    if (outUrl) URL.revokeObjectURL(outUrl);
  }, [outUrl]);

  // Expose the playback element so the trimmer can read currentTime.
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => {
      const el = origVideoRef.current || origAudioRef.current;
      return el ? el.currentTime : 0;
    },
    getDuration: () => {
      const el = origVideoRef.current || origAudioRef.current;
      return el && Number.isFinite(el.duration) ? el.duration : 0;
    },
    play: () => {
      const el = origVideoRef.current || origAudioRef.current;
      el?.play().catch(() => {});
    },
    pause: () => {
      const el = origVideoRef.current || origAudioRef.current;
      el?.pause();
    },
    seek: (t) => {
      const el = origVideoRef.current || origAudioRef.current;
      if (el) el.currentTime = t;
    },
  }), []);

  if (!file) return null;

  const origMime = pickMime(file.name, file.type);
  const renderOriginal = () => {
    if (origError) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Browser can&apos;t natively decode this format for preview. The conversion will still work.
        </div>
      );
    }
    if (category === 'image') {
      return (
        <img
          src={origUrl}
          alt={file.name}
          className="max-w-full max-h-64 rounded-md object-contain bg-black/20"
          onError={() => setOrigError(true)}
        />
      );
    }
    if (category === 'video') {
      return (
        <video
          ref={origVideoRef}
          src={origUrl}
          controls
          preload="metadata"
          className="w-full max-h-64 rounded-md bg-black"
          onError={() => setOrigError(true)}
        >
          <source src={origUrl} type={origMime} />
        </video>
      );
    }
    if (category === 'audio') {
      return (
        <audio
          ref={origAudioRef}
          src={origUrl}
          controls
          preload="metadata"
          className="w-full"
          onError={() => setOrigError(true)}
        />
      );
    }
    return null;
  };

  const renderOutput = () => {
    if (!outUrl) return null;
    if (outError) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Output format not previewable in this browser — download to verify.
        </div>
      );
    }
    if (outKind === 'image') {
      return (
        <img
          src={outUrl}
          alt="Conversion output"
          className="max-w-full max-h-64 rounded-md object-contain bg-black/20"
          onError={() => setOutError(true)}
        />
      );
    }
    if (outKind === 'video') {
      return (
        <video
          src={outUrl}
          controls
          preload="metadata"
          className="w-full max-h-64 rounded-md bg-black"
          onError={() => setOutError(true)}
        />
      );
    }
    if (outKind === 'audio') {
      return (
        <audio
          src={outUrl}
          controls
          preload="metadata"
          className="w-full"
          onError={() => setOutError(true)}
        />
      );
    }
    return null;
  };

  const outSize = output?.data ? output.data.byteLength : 0;
  const reduction = output && outSize && file.size
    ? ((file.size - outSize) / file.size) * 100
    : 0;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Eye className="w-3.5 h-3.5" />
        Preview
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`mt-3 grid gap-3 ${output ? 'sm:grid-cols-2' : ''}`}>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Original · {formatFileSize(file.size)}
                </p>
                <div className="rounded-lg border border-border/50 bg-background/40 p-2">
                  {renderOriginal()}
                </div>
              </div>
              {output && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider font-semibold">
                    <span className="text-green-500">Converted</span>
                    <span className="text-muted-foreground"> · {formatFileSize(outSize)}</span>
                    {reduction > 0 && (
                      <span className="ml-1 text-emerald-400">(-{reduction.toFixed(0)}%)</span>
                    )}
                    {reduction < 0 && (
                      <span className="ml-1 text-amber-400">(+{Math.abs(reduction).toFixed(0)}%)</span>
                    )}
                  </p>
                  <div className="rounded-lg border border-green-500/30 bg-background/40 p-2">
                    {renderOutput()}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default MediaPreview;
