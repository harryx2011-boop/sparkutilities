import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, ChevronUp, Loader2, FileVideo, FileAudio, FileImage, FileText } from 'lucide-react';
import { quickProbe, deepProbe } from '@/lib/mediaProbe';
import { formatTimecode } from '@/lib/timecode';
import { formatFileSize } from '@/lib/conversionFormats';

const FILE_ICONS = {
  video: FileVideo,
  audio: FileAudio,
  image: FileImage,
  document: FileText,
};

export default function MetadataPanel({ file, category, getFFmpeg }) {
  const [open, setOpen] = useState(false);
  const [quick, setQuick] = useState(null);
  const [deep, setDeep] = useState(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepError, setDeepError] = useState('');

  // Run the quick probe as soon as the panel opens (cheap, native).
  useEffect(() => {
    if (!open || quick) return;
    let cancelled = false;
    quickProbe(file, category).then(r => {
      if (!cancelled) setQuick(r);
    });
    return () => { cancelled = true; };
  }, [open, quick, file, category]);

  const runDeepProbe = async () => {
    if (deepLoading || deep) return;
    setDeepLoading(true);
    setDeepError('');
    try {
      const ffmpeg = await getFFmpeg();
      const result = await deepProbe(file, ffmpeg);
      setDeep(result);
    } catch (e) {
      setDeepError(e?.message || 'Probe failed');
    } finally {
      setDeepLoading(false);
    }
  };

  const Icon = FILE_ICONS[category] || FileText;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
        File info
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
            <div className="mt-3 p-3 rounded-xl bg-background/60 border border-border/50 space-y-3">
              {/* Basics — always available */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground col-span-2 mb-0.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-foreground font-medium truncate">{file.name}</span>
                </div>
                <Field label="Size" value={formatFileSize(file.size)} />
                <Field label="MIME" value={file.type || '—'} />
                {quick?.duration > 0 && <Field label="Duration" value={formatTimecode(quick.duration)} />}
                {quick?.width > 0 && <Field label="Dimensions" value={`${quick.width} × ${quick.height}`} />}
              </div>

              {quick?.error && (
                <p className="text-[11px] text-amber-400">
                  Quick probe: {quick.error}
                </p>
              )}

              {/* Deep probe — opt-in, since it spins up ffmpeg.wasm */}
              <div className="pt-2 border-t border-border/40">
                {!deep && !deepLoading && !deepError && (
                  <button
                    type="button"
                    onClick={runDeepProbe}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Run deep probe (codec, bitrate, channels…)
                  </button>
                )}

                {deepLoading && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Probing with ffmpeg…
                  </div>
                )}

                {deepError && (
                  <p className="text-[11px] text-destructive">Deep probe failed: {deepError}</p>
                )}

                {deep && (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      {deep.container && <Field label="Container" value={deep.container} mono />}
                      {deep.duration && <Field label="Duration" value={formatTimecode(deep.duration)} mono />}
                      {deep.bitrate && <Field label="Total bitrate" value={deep.bitrate} mono />}
                    </div>

                    {deep.streams.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Streams ({deep.streams.length})
                        </p>
                        {deep.streams.map((s) => (
                          <div key={`${s.index}-${s.type}`} className="rounded-md bg-secondary/30 border border-border/40 p-2 space-y-0.5">
                            <p className="text-[11px] font-mono">
                              <span className="text-primary">#{s.index}</span>
                              <span className="text-muted-foreground"> {s.type}</span>
                              {s.codec && <span className="text-foreground"> · {s.codec}</span>}
                            </p>
                            {s.type === 'video' && (
                              <p className="text-[11px] text-muted-foreground font-mono">
                                {s.width && s.height && `${s.width}×${s.height}`}
                                {s.fps && ` · ${s.fps} fps`}
                                {s.bitrate && ` · ${s.bitrate}`}
                              </p>
                            )}
                            {s.type === 'audio' && (
                              <p className="text-[11px] text-muted-foreground font-mono">
                                {s.sampleRate && `${s.sampleRate} Hz`}
                                {s.channels && ` · ${s.channels}`}
                                {s.bitrate && ` · ${s.bitrate}`}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xs ${mono ? 'font-mono' : ''} text-foreground/90 break-all`}>{value}</p>
    </div>
  );
}
