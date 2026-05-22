import React, { useEffect, useState } from 'react';
import { Cpu, Zap, Layers } from 'lucide-react';
import { SAB_AVAILABLE } from './ConversionCard';
import { isWebGLSupported } from '@/lib/gpuAccelerate';

/**
 * Compact engine-status pill shown at the top of the File Converter.
 * Reflects the current best-available compute path:
 *
 *   MT + GPU    — multi-threaded FFmpeg (every CPU thread) for video/audio,
 *                 WebGL/OffscreenCanvas for raster image conversions. Both
 *                 engines run concurrently across files in batch mode.
 *   GPU only    — WebGL works but cross-origin isolation is missing, so
 *                 FFmpeg falls back to its single-threaded core.
 *   MT only     — WebGL absent (rare; older browsers, in-app webviews).
 *   Single-thread — neither path active. Conversions still work, just slower.
 *
 * Click-through behaviour intentionally omitted — the IsolationNotice and
 * MemoryWarning banners already explain the performance implications when
 * one of the engines is missing.
 */
export default function EngineStatus() {
  // WebGL detection is synchronous and cached; running it on mount avoids
  // polluting first-paint timing with the canvas probe.
  const [webgl, setWebgl] = useState(false);
  useEffect(() => { setWebgl(isWebGLSupported()); }, []);

  const mt = SAB_AVAILABLE;
  const gpu = webgl;

  let label;
  let detail;
  let tone;
  let Icon;

  if (mt && gpu) {
    label  = 'Max performance';
    detail = 'Multi-threaded FFmpeg + WebGL — both engines run in parallel across files';
    tone   = 'border-primary/40 bg-primary/10 text-primary';
    Icon   = Layers;
  } else if (mt) {
    label  = 'Multi-thread only';
    detail = 'WebGL not available — FFmpeg uses every CPU thread';
    tone   = 'border-primary/30 bg-primary/5 text-primary/90';
    Icon   = Cpu;
  } else if (gpu) {
    label  = 'GPU only';
    detail = 'Cross-origin isolation missing — FFmpeg running single-threaded; image conversions still on WebGL';
    tone   = 'border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
    Icon   = Zap;
  } else {
    label  = 'Single-thread';
    detail = 'No SAB and no WebGL detected — conversions will still complete but more slowly';
    tone   = 'border-muted-foreground/30 bg-secondary text-muted-foreground';
    Icon   = Cpu;
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium ${tone}`}
      title={detail}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      <span className="hidden sm:inline-block opacity-70 font-normal">
        · {mt ? 'MT' : 'ST'}{gpu ? ' + GPU' : ''}
      </span>
    </div>
  );
}
