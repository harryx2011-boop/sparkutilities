import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music, Download, Trash2, Play, Pause, ChevronDown,
  Volume2, Wind, Waves, Activity, Sliders, RotateCcw,
  Mic2, Zap, Shield, Cpu, AlignCenter, Scissors,
  RefreshCw, Check, Scale, Gem, ChevronUp,
} from 'lucide-react';
import { useToolTheme } from '@/context/ToolThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { playSuccessChime, notifyTaskComplete } from '@/lib/notificationSound';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(sec) {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024, s = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${s[i]}`;
}

// ─── Cubic Spline Interpolation for EQ ───────────────────────────────────────

function cubicSplinePoints(points, steps = 200) {
  const n = points.length;
  if (n < 2) return points;
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const h = [], alpha = [], l = [], mu = [], z = [], c = [], b = [], d = [];
  for (let i = 0; i < n - 1; i++) h[i] = xs[i + 1] - xs[i];
  for (let i = 1; i < n - 1; i++)
    alpha[i] = (3 / h[i]) * (ys[i + 1] - ys[i]) - (3 / h[i - 1]) * (ys[i] - ys[i - 1]);
  l[0] = 1; mu[0] = 0; z[0] = 0;
  for (let i = 1; i < n - 1; i++) {
    l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1];
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }
  l[n - 1] = 1; z[n - 1] = 0; c[n - 1] = 0;
  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (ys[j + 1] - ys[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }
  const result = [];
  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s <= steps / (n - 1); s++) {
      const t = (s / (steps / (n - 1))) * h[i];
      const y = ys[i] + b[i] * t + c[i] * t * t + d[i] * t * t * t;
      result.push({ x: xs[i] + t, y: Math.max(0, Math.min(100, y)) });
    }
  }
  result.push({ x: xs[n - 1], y: ys[n - 1] });
  return result;
}

// ─── Shared Sub-components ────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, step = 1, unit = '', onChange, accent = '#6366f1', formatVal }) {
  const display = formatVal ? formatVal(value) : `${value}${unit}`;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span className="text-xs font-mono px-2 py-0.5 rounded"
          style={{ background: 'rgba(255,255,255,0.06)', color: accent }}>{display}</span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="absolute h-1.5 rounded-full pointer-events-none"
          style={{
            background: `linear-gradient(90deg, ${accent}, ${accent}aa)`,
            width: `${((value - min) / (max - min)) * 100}%`,
          }} />
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute w-full h-full opacity-0 cursor-pointer" />
        <div className="absolute w-4 h-4 rounded-full border-2 pointer-events-none shadow-lg"
          style={{
            left: `calc(${((value - min) / (max - min)) * 100}% - 8px)`,
            background: accent,
            borderColor: 'rgba(255,255,255,0.3)',
          }} />
      </div>
    </div>
  );
}

function ToolCard({ title, icon: Icon, iconColor, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border overflow-hidden transition-all duration-300 glass-card"
      style={{ borderColor: `${iconColor}30` }}>
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${iconColor}, transparent)` }} />
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${iconColor}18`, border: `1px solid ${iconColor}35` }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <span className="flex-1 font-semibold text-sm text-foreground">{title}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground/50 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}>
            <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: `${iconColor}15` }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── EQ Spline Visualizer ─────────────────────────────────────────────────────

// EQ gain is capped at ±18 dB to prevent speaker-destroying boosts and stay in
// line with the range used by every consumer EQ. Anything above that is also
// the safety threshold where biquad shelves start producing audible ringing
// even on clean source material.
const EQ_DB_LIMIT = 18;

function EQVisualizer({ bass, vocal, treble, onChange }) {
  const svgRef = useRef(null);
  const dragging = useRef(null);
  const W = 320, H = 100;
  // Vertical scale: the 0 dB line sits at y=50 in the 100-tall viewBox; the
  // ±EQ_DB_LIMIT range maps to ±42 px so the curves fit with breathing room.
  const PX_PER_DB = 42 / EQ_DB_LIMIT;

  const points = [
    { x: 0,     y: 50 },
    { x: W * 0.18, y: 50 - bass * PX_PER_DB },
    { x: W * 0.5,  y: 50 - vocal * PX_PER_DB },
    { x: W * 0.82, y: 50 - treble * PX_PER_DB },
    { x: W,     y: 50 },
  ];

  const curve = cubicSplinePoints(points, 300);
  const pathD = curve.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fillD = pathD + ` L${W},${H} L0,${H} Z`;

  const handles = [
    { key: 'bass',   x: W * 0.18, y: 50 - bass * PX_PER_DB,   color: '#eab308', label: 'Bass' },
    { key: 'vocal',  x: W * 0.5,  y: 50 - vocal * PX_PER_DB,  color: '#22c55e', label: 'Vocal' },
    { key: 'treble', x: W * 0.82, y: 50 - treble * PX_PER_DB, color: '#22c55e', label: 'Treble' },
  ];

  const onMouseDown = (e, key) => {
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const scaleY = H / rect.height;
    dragging.current = { key, rect, scaleY };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    const { key, rect } = dragging.current;
    const relY = e.clientY - rect.top;
    const pct = Math.max(0, Math.min(1, relY / rect.height));
    // (0.5 - pct) gives ±0.5 normalized; scale to dB then clamp to the cap.
    const dbValue = Math.round((0.5 - pct) * 2 * EQ_DB_LIMIT);
    const clamped = Math.max(-EQ_DB_LIMIT, Math.min(EQ_DB_LIMIT, dbValue));
    onChange(key, clamped);
  }, [onChange]);

  const onMouseUp = useCallback(() => {
    dragging.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(34,197,94,0.2)', background: '#0a0a0a' }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '90px', cursor: 'ns-resize' }}>
          <defs>
            <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[25, 50, 75].map(y => (
            <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          ))}
          <line x1="0" y1={50} x2={W} y2={50} stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4,4" />
          {/* Fill */}
          <path d={fillD} fill="url(#eqGrad)" />
          {/* Curve */}
          <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
          {/* Drag handles */}
          {handles.map(h => (
            <g key={h.key} onMouseDown={e => onMouseDown(e, h.key)} style={{ cursor: 'ns-resize' }}>
              <circle cx={h.x} cy={h.y} r="7" fill={h.color} opacity="0.2" />
              <circle cx={h.x} cy={h.y} r="4" fill={h.color} stroke="white" strokeWidth="1.5" />
            </g>
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {handles.map(h => (
          <div key={h.key}>
            <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">{h.label}</div>
          <div className="text-xs font-mono" style={{ color: h.color }}>
                {(h.key === 'bass' ? bass : h.key === 'vocal' ? vocal : treble) >= 0 ? '+' : ''}
                {h.key === 'bass' ? bass : h.key === 'vocal' ? vocal : treble} dB
              </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Audio Waveform Visualizer ────────────────────────────────────────────────

function WaveformDisplay({ audioBuffer, trimStart, trimEnd, currentTime, duration }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;
    const ctx = canvas.getContext('2d');
    const { width: W, height: H } = canvas;
    ctx.clearRect(0, 0, W, H);

    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / W);
    const mid = H / 2;

    // Draw waveform bars
    for (let i = 0; i < W; i++) {
      let max = 0;
      for (let j = 0; j < step; j++) {
        const v = Math.abs(data[i * step + j] || 0);
        if (v > max) max = v;
      }
      const barH = max * mid * 0.9;
      const px = i / W;
      const inTrim = px >= trimStart && px <= trimEnd;
      ctx.fillStyle = inTrim ? 'rgba(99,102,241,0.85)' : 'rgba(99,102,241,0.22)';
      ctx.fillRect(i, mid - barH, 1, barH * 2);
    }

    // Playhead
    if (duration > 0) {
      const px = (currentTime / duration) * W;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
    }
  }, [audioBuffer, trimStart, trimEnd, currentTime, duration]);

  return (
    <canvas ref={canvasRef} width={600} height={80}
      className="w-full rounded-lg" style={{ height: '80px', background: 'rgba(0,0,0,0.3)' }} />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AudioModifier() {
  const { getToolGradient } = useToolTheme();
  const toolGradient = getToolGradient('/audio-modifier');
  const { settings } = useSettings();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // File / Audio state
  const [file, setFile] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [exported, setExported] = useState(false);
  const [compression, setCompression] = useState(null); // null | 'compact' | 'balanced' | 'lossless'
  const [showCompressOpts, setShowCompressOpts] = useState(false);

  // Trim
  const [trimStart, setTrimStart] = useState(0);   // 0–1 fraction
  const [trimEnd, setTrimEnd] = useState(1);
  const trimDragging = useRef(null);
  const waveformRef = useRef(null);

  // Toolkit state
  const [audio3D, setAudio3D] = useState({ enabled: false, width: 50, depth: 40 });
  const [autoPanner, setAutoPanner] = useState({ enabled: false, rate: 0.5, depth: 80 });
  const [stereoPanner, setStereoPanner] = useState({ enabled: false, pan: 0 });
  const [bassBooster, setBassBooster] = useState({ enabled: false, gain: 12, freq: 200 });
  const [eq, setEq] = useState({ enabled: false, bass: 0, vocal: 0, treble: 0 });
  const [pitchShifter, setPitchShifter] = useState({ enabled: false, semitones: 0 });
  const [reverb, setReverb] = useState({ enabled: false, decay: 2, wet: 40 });
  const [reverser, setReverser] = useState({ enabled: false });
  const [tempoChanger, setTempoChanger] = useState({ enabled: false, rate: 1.0 });
  const [volumeChanger, setVolumeChanger] = useState({ enabled: false, db: 0 });

  // Web Audio refs
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const startTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const rafRef = useRef(null);
  // Live-updatable node refs for real-time preview. The play graph populates
  // these on start; effect-state useEffects mutate the AudioParams in place
  // so slider drags can be heard without rebuilding the graph.
  const eqNodesRef = useRef({ bass: null, vocal: null, treble: null });
  const bassBoostNodeRef = useRef(null);
  const volumeNodeRef = useRef(null);
  const stereoPannerNodeRef = useRef(null);
  const reverbGainsRef = useRef({ dry: null, wet: null });
  const tempoSrcRef = useRef(null);

  const dropRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Load file ────────────────────────────────────────────────────────────────
  const loadFile = useCallback(async (f) => {
    const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac',
      'audio/aac', 'audio/m4a', 'audio/webm', 'audio/opus', 'audio/x-wav', 'audio/x-flac'];
    const isAudio = AUDIO_TYPES.includes(f.type) || /\.(mp3|wav|ogg|flac|aac|m4a|opus|webm)$/i.test(f.name);
    if (!isAudio) return;

    stopPlayback();
    // Close previous AudioContext to prevent resource leak
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    setFile(f);
    setCurrentTime(0);
    setTrimStart(0);
    setTrimEnd(1);
    setExported(false);

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;
    const arrayBuf = await f.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuf);
    setAudioBuffer(decoded);
    setDuration(decoded.duration);
  }, []);

  const stopPlayback = () => {
    if (sourceRef.current) { try { sourceRef.current.stop(); } catch {} sourceRef.current = null; }
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
  };

  // ── Play / Pause ─────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    if (!audioBuffer || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;

    if (playing) {
      pauseOffsetRef.current = ctx.currentTime - startTimeRef.current;
      stopPlayback();
      return;
    }

    const trimStartSec = trimStart * duration;
    const trimEndSec = trimEnd * duration;
    const offset = Math.max(trimStartSec, Math.min(trimEndSec, pauseOffsetRef.current + trimStartSec));

    // Build node chain
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.playbackRate.value = tempoChanger.enabled ? tempoChanger.rate : 1;
    tempoSrcRef.current = src;

    let lastNode = src;

    // Volume
    if (volumeChanger.enabled) {
      const gain = ctx.createGain();
      gain.gain.value = Math.pow(10, volumeChanger.db / 20);
      lastNode.connect(gain);
      lastNode = gain;
      volumeNodeRef.current = gain;
    } else {
      volumeNodeRef.current = null;
    }

    // Bass Boost — gain clamped to EQ_DB_LIMIT for the same anti-abuse reason.
    if (bassBooster.enabled) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowshelf';
      filter.frequency.value = bassBooster.freq;
      filter.gain.value = Math.max(0, Math.min(EQ_DB_LIMIT, bassBooster.gain));
      lastNode.connect(filter);
      lastNode = filter;
      bassBoostNodeRef.current = filter;
    } else {
      bassBoostNodeRef.current = null;
    }

    // EQ — gains hard-clamped to ±EQ_DB_LIMIT so adversarial state can't drive
    // the audio chain into clipping or speaker damage.
    if (eq.enabled) {
      const clamp = v => Math.max(-EQ_DB_LIMIT, Math.min(EQ_DB_LIMIT, v));
      const bassF = ctx.createBiquadFilter();
      bassF.type = 'lowshelf'; bassF.frequency.value = 250; bassF.gain.value = clamp(eq.bass);
      const midF = ctx.createBiquadFilter();
      midF.type = 'peaking'; midF.frequency.value = 2000; midF.Q.value = 0.8; midF.gain.value = clamp(eq.vocal);
      const trebleF = ctx.createBiquadFilter();
      trebleF.type = 'highshelf'; trebleF.frequency.value = 8000; trebleF.gain.value = clamp(eq.treble);
      lastNode.connect(bassF); bassF.connect(midF); midF.connect(trebleF);
      // Stash refs so realtime preview can update gains without rebuilding.
      eqNodesRef.current = { bass: bassF, vocal: midF, treble: trebleF };
      lastNode = trebleF;
    }

    // Stereo Panner
    if (stereoPanner.enabled && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = stereoPanner.pan / 100;
      lastNode.connect(panner);
      lastNode = panner;
      stereoPannerNodeRef.current = panner;
    } else {
      stereoPannerNodeRef.current = null;
    }

    // Reverb (convolver with synthetic IR)
    if (reverb.enabled) {
      const convolver = ctx.createConvolver();
      const sr = ctx.sampleRate;
      const len = sr * reverb.decay;
      const ir = ctx.createBuffer(2, len, sr);
      for (let c = 0; c < 2; c++) {
        const ch = ir.getChannelData(c);
        for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, reverb.decay);
      }
      convolver.buffer = ir;
      const dryGain = ctx.createGain(); dryGain.gain.value = 1 - reverb.wet / 100;
      const wetGain = ctx.createGain(); wetGain.gain.value = reverb.wet / 100;
      const merger = ctx.createGain();
      lastNode.connect(dryGain); dryGain.connect(merger);
      lastNode.connect(convolver); convolver.connect(wetGain); wetGain.connect(merger);
      lastNode = merger;
      reverbGainsRef.current = { dry: dryGain, wet: wetGain };
    } else {
      reverbGainsRef.current = { dry: null, wet: null };
    }

    // 3D Audio (simple width spread)
    if (audio3D.enabled) {
      const splitter = ctx.createChannelSplitter(2);
      const merger2 = ctx.createChannelMerger(2);
      const leftDelay = ctx.createDelay(); leftDelay.delayTime.value = (audio3D.depth / 1000) * 0.01;
      const rightDelay = ctx.createDelay(); rightDelay.delayTime.value = 0;
      lastNode.connect(splitter);
      splitter.connect(leftDelay, 0); leftDelay.connect(merger2, 0, 0);
      splitter.connect(rightDelay, 1); rightDelay.connect(merger2, 0, 1);
      lastNode = merger2;
    }

    lastNode.connect(ctx.destination);
    sourceRef.current = src;

    startTimeRef.current = ctx.currentTime - (offset - trimStartSec);
    src.start(0, offset, trimEndSec - offset);
    src.onended = () => { setPlaying(false); setCurrentTime(0); pauseOffsetRef.current = 0; };
    setPlaying(true);

    const tick = () => {
      const t = ctx.currentTime - startTimeRef.current + trimStartSec;
      setCurrentTime(Math.min(t, trimEndSec));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [audioBuffer, playing, duration, trimStart, trimEnd, tempoChanger, volumeChanger,
      bassBooster, eq, stereoPanner, reverb, audio3D]);

  // ── Real-time preview ────────────────────────────────────────────────────────
  // Each effect's params are mirrored onto its live AudioNode (when present)
  // so dragging a slider during playback applies instantly. The graph is only
  // (re)built at play start; these effects run on every state change but only
  // touch the param if the node is currently in the chain.
  // Using setTargetAtTime (5–10 ms time-constant) avoids zipper noise while
  // keeping latency well under perception.
  const SMOOTH = 0.008;

  useEffect(() => {
    const ctx = audioCtxRef.current; if (!ctx) return;
    const clamp = v => Math.max(-EQ_DB_LIMIT, Math.min(EQ_DB_LIMIT, v));
    const { bass: bN, vocal: vN, treble: tN } = eqNodesRef.current;
    if (bN) bN.gain.setTargetAtTime(clamp(eq.bass),   ctx.currentTime, SMOOTH);
    if (vN) vN.gain.setTargetAtTime(clamp(eq.vocal),  ctx.currentTime, SMOOTH);
    if (tN) tN.gain.setTargetAtTime(clamp(eq.treble), ctx.currentTime, SMOOTH);
  }, [eq.bass, eq.vocal, eq.treble]);

  useEffect(() => {
    const ctx = audioCtxRef.current; if (!ctx || !bassBoostNodeRef.current) return;
    bassBoostNodeRef.current.gain.setTargetAtTime(
      Math.max(0, Math.min(EQ_DB_LIMIT, bassBooster.gain)),
      ctx.currentTime, SMOOTH,
    );
    bassBoostNodeRef.current.frequency.setTargetAtTime(bassBooster.freq, ctx.currentTime, SMOOTH);
  }, [bassBooster.gain, bassBooster.freq]);

  useEffect(() => {
    const ctx = audioCtxRef.current; if (!ctx || !volumeNodeRef.current) return;
    const linear = Math.pow(10, volumeChanger.db / 20);
    volumeNodeRef.current.gain.setTargetAtTime(linear, ctx.currentTime, SMOOTH);
  }, [volumeChanger.db]);

  useEffect(() => {
    const ctx = audioCtxRef.current; if (!ctx || !stereoPannerNodeRef.current) return;
    stereoPannerNodeRef.current.pan.setTargetAtTime(stereoPanner.pan / 100, ctx.currentTime, SMOOTH);
  }, [stereoPanner.pan]);

  useEffect(() => {
    const ctx = audioCtxRef.current; if (!ctx) return;
    const { dry, wet } = reverbGainsRef.current;
    if (dry) dry.gain.setTargetAtTime(1 - reverb.wet / 100, ctx.currentTime, SMOOTH);
    if (wet) wet.gain.setTargetAtTime(reverb.wet / 100, ctx.currentTime, SMOOTH);
  }, [reverb.wet]);

  useEffect(() => {
    const ctx = audioCtxRef.current; if (!ctx || !tempoSrcRef.current) return;
    // playbackRate doubles as pitch when tempoChanger is on; only update if
    // the source is still alive (didn't stop).
    try {
      tempoSrcRef.current.playbackRate.setTargetAtTime(
        tempoChanger.enabled ? tempoChanger.rate : 1,
        ctx.currentTime, SMOOTH,
      );
    } catch { /* source ended */ }
  }, [tempoChanger.enabled, tempoChanger.rate]);

  // ── Trim drag ────────────────────────────────────────────────────────────────
  const onTrimMouseDown = (e, handle) => {
    e.stopPropagation();
    trimDragging.current = handle;
    window.addEventListener('mousemove', onTrimMouseMove);
    window.addEventListener('mouseup', onTrimMouseUp);
  };

  const onTrimMouseMove = useCallback((e) => {
    if (!trimDragging.current || !waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (trimDragging.current === 'start') setTrimStart(Math.min(frac, trimEnd - 0.02));
    else setTrimEnd(Math.max(frac, trimStart + 0.02));
  }, [trimStart, trimEnd]);

  const onTrimMouseUp = useCallback(() => {
    trimDragging.current = null;
    window.removeEventListener('mousemove', onTrimMouseMove);
    window.removeEventListener('mouseup', onTrimMouseUp);
  }, [onTrimMouseMove]);

  // ── Export ───────────────────────────────────────────────────────────────────
  const exportAudio = async () => {
    if (!audioBuffer || processing) return;
    setProcessing(true);
    try {
      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        Math.ceil(audioBuffer.sampleRate * (trimEnd - trimStart) * duration),
        audioBuffer.sampleRate
      );

      // Trim
      let buf = audioBuffer;
      if (reverser.enabled) {
        const rev = offlineCtx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
        for (let c = 0; c < buf.numberOfChannels; c++) {
          const ch = buf.getChannelData(c);
          const out = rev.getChannelData(c);
          for (let i = 0; i < ch.length; i++) out[i] = ch[ch.length - 1 - i];
        }
        buf = rev;
      }

      const src = offlineCtx.createBufferSource();
      src.buffer = audioBuffer;
      src.playbackRate.value = tempoChanger.enabled ? tempoChanger.rate : 1;

      let lastNode = src;

      if (volumeChanger.enabled) {
        const g = offlineCtx.createGain();
        g.gain.value = Math.pow(10, volumeChanger.db / 20);
        lastNode.connect(g); lastNode = g;
      }
      if (bassBooster.enabled) {
        const f = offlineCtx.createBiquadFilter();
        f.type = 'lowshelf'; f.frequency.value = bassBooster.freq;
        f.gain.value = Math.max(0, Math.min(EQ_DB_LIMIT, bassBooster.gain));
        lastNode.connect(f); lastNode = f;
      }
      if (eq.enabled) {
        const eqClamp = v => Math.max(-EQ_DB_LIMIT, Math.min(EQ_DB_LIMIT, v));
        const bf = offlineCtx.createBiquadFilter(); bf.type = 'lowshelf'; bf.frequency.value = 250; bf.gain.value = eqClamp(eq.bass);
        const mf = offlineCtx.createBiquadFilter(); mf.type = 'peaking'; mf.frequency.value = 2000; mf.Q.value = 0.8; mf.gain.value = eqClamp(eq.vocal);
        const tf = offlineCtx.createBiquadFilter(); tf.type = 'highshelf'; tf.frequency.value = 8000; tf.gain.value = eqClamp(eq.treble);
        lastNode.connect(bf); bf.connect(mf); mf.connect(tf); lastNode = tf;
      }
      if (stereoPanner.enabled) {
        const p = offlineCtx.createStereoPanner();
        p.pan.value = stereoPanner.pan / 100;
        lastNode.connect(p); lastNode = p;
      }
      if (reverb.enabled) {
        const conv = offlineCtx.createConvolver();
        const sr = offlineCtx.sampleRate;
        const len = sr * reverb.decay;
        const ir = offlineCtx.createBuffer(2, len, sr);
        for (let c = 0; c < 2; c++) {
          const ch = ir.getChannelData(c);
          for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, reverb.decay);
        }
        conv.buffer = ir;
        const dg = offlineCtx.createGain(); dg.gain.value = 1 - reverb.wet / 100;
        const wg = offlineCtx.createGain(); wg.gain.value = reverb.wet / 100;
        const mg = offlineCtx.createGain();
        lastNode.connect(dg); dg.connect(mg);
        lastNode.connect(conv); conv.connect(wg); wg.connect(mg);
        lastNode = mg;
      }

      lastNode.connect(offlineCtx.destination);
      src.start(0, trimStart * duration, (trimEnd - trimStart) * duration);

      const rendered = await offlineCtx.startRendering();

      // Determine bit depth from compression setting
      const bitsPerSample = compression === 'compact' ? 8 : compression === 'lossless' ? 32 : 16;
      const wav = encodeWAV(rendered, bitsPerSample);
      const blob = new Blob([wav], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = compression === 'compact' ? '_compact' : compression === 'lossless' ? '_lossless' : '_modified';
      a.download = (file.name.replace(/\.[^.]+$/, '') || 'audio') + suffix + '.wav';
      a.click();
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 2500);
      playSuccessChime();
      notifyTaskComplete({
        title: 'Audio export complete',
        body:  a.download,
        tag:   `audio-${file.name}`,
      });
    } catch (e) {
      console.error('Export failed:', e);
    }
    setProcessing(false);
  };

  function encodeWAV(buffer, bitsPerSample = 16) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const numSamples = buffer.length;
    // 32-bit float uses format code 3 (IEEE float); 8 and 16 use 1 (PCM)
    const formatCode = bitsPerSample === 32 ? 3 : 1;
    const bytesPerSample = bitsPerSample / 8;
    const byteRate = sampleRate * numChannels * bytesPerSample;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = numSamples * numChannels * bytesPerSample;
    const buf = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buf);
    const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE'); writeStr(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, formatCode, true);
    view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true); writeStr(36, 'data');
    view.setUint32(40, dataSize, true);
    let off = 44;
    for (let i = 0; i < numSamples; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
        if (bitsPerSample === 8) {
          // 8-bit WAV is unsigned (0–255), center at 128
          view.setUint8(off, Math.round((s + 1) * 127.5));
          off += 1;
        } else if (bitsPerSample === 16) {
          view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          off += 2;
        } else {
          // 32-bit IEEE float
          view.setFloat32(off, s, true);
          off += 4;
        }
      }
    }
    return buf;
  }

  // ── Drop handlers ────────────────────────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  };

  const eqHandleChange = useCallback((key, val) => {
    setEq(prev => ({ ...prev, [key]: val }));
  }, []);

  // Cleanup
  useEffect(() => () => { stopPlayback(); audioCtxRef.current?.close(); }, []);

  // Play/Pause keybind
  useEffect(() => {
    if (!file) return;
    const playKey = (settings.keybinds?.playPause ?? 'Space').toLowerCase();
    const handler = (e) => {
      if (['input','textarea','select'].includes(e.target.tagName.toLowerCase())) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key === ' ' ? 'space' : e.key.toLowerCase();
      if (k === playKey) { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [file, settings.keybinds, togglePlay]);

  const trimStartSec = trimStart * duration;
  const trimEndSec = trimEnd * duration;
  const enabledCount = [audio3D, autoPanner, stereoPanner, bassBooster, eq, pitchShifter, reverb, reverser, tempoChanger, volumeChanger].filter(t => t.enabled).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 relative">

      {/* ── Hero ── */}
      <section className="relative py-14 sm:py-18 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ background: `radial-gradient(circle, ${toolGradient.preview[0]}, transparent)` }} />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-15"
            style={{ background: `radial-gradient(circle, ${toolGradient.preview[1]}, transparent)` }} />
        </div>
        <div className="relative max-w-4xl mx-auto text-center px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-6 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${toolGradient.preview[0]}, ${toolGradient.preview[1]})`, color: '#fff' }}>
            <Music className="w-3.5 h-3.5" />
            Audio Modifier
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-tight mb-4">
            Shape your sound.{' '}
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, ${toolGradient.preview[0]}, ${toolGradient.preview[1]})` }}>
              Perfectly.
            </span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.18 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            Trim, EQ, reverse, add reverb and more — all processed with the Web Audio API.
            Your audio never leaves your device.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28 }}
            className="flex flex-wrap justify-center gap-3">
            {[
              { icon: Shield, label: '100% Private' },
              { icon: Cpu, label: 'Web Audio API' },
              { icon: Zap, label: '10 Tools' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm font-medium text-foreground/80">
                <Icon className="w-4 h-4 text-primary" /> {label}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {!file ? (
        // ── Drop zone ──────────────────────────────────────────────────────────
        <motion.label initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          ref={dropRef}
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className="block cursor-pointer">
          <div className={`glass-card rounded-2xl border-2 border-dashed transition-all duration-300 p-16 text-center group ${isDragging ? 'border-primary/60 bg-primary/5 scale-[1.01]' : 'border-border/60 hover:border-primary/40'}`}>
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mx-auto mb-4 shadow-lg transition-all ${toolGradient.color}`}
              style={{ boxShadow: `0 0 30px ${toolGradient.glow}` }}>
              <Music className="w-8 h-8 text-white" />
            </div>
            <p className="text-lg font-semibold mb-1">{isDragging ? 'Drop it!' : 'Drop audio here'}</p>
            <p className="text-sm text-muted-foreground mb-4">or click to browse your files</p>
            <p className="text-xs text-muted-foreground/60">MP3, WAV, OGG, FLAC, AAC, M4A, Opus, WebM supported</p>
          </div>
          <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) loadFile(f); }} />
        </motion.label>
      ) : (
        // ── Editor layout ──────────────────────────────────────────────────────
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">

          {/* Left — player + trimmer */}
          <div className="space-y-5">

            {/* File info bar */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${toolGradient.color} flex items-center justify-center flex-shrink-0`}>
                  <Music className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)} · {formatTime(duration)}</p>
                </div>
              </div>
              <button onClick={() => { stopPlayback(); setFile(null); setAudioBuffer(null); }}
                className="p-2 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>

            {/* Waveform + trimmer */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="glass-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Audio Trimmer</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {formatTime(trimStartSec)} – {formatTime(trimEndSec)}
                  <span className="ml-2 opacity-60">({formatTime(trimEndSec - trimStartSec)})</span>
                </span>
              </div>

              {/* Waveform */}
              <div ref={waveformRef} className="relative select-none">
                <WaveformDisplay audioBuffer={audioBuffer} trimStart={trimStart} trimEnd={trimEnd}
                  currentTime={currentTime} duration={duration} />

                {/* Trim region overlay */}
                <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden">
                  {/* Dark masks outside trim */}
                  <div className="absolute top-0 bottom-0 left-0 bg-black/50 rounded-l-lg"
                    style={{ width: `${trimStart * 100}%` }} />
                  <div className="absolute top-0 bottom-0 right-0 bg-black/50 rounded-r-lg"
                    style={{ width: `${(1 - trimEnd) * 100}%` }} />
                </div>

                {/* Start handle */}
                <div className="absolute top-0 bottom-0 w-1 cursor-ew-resize z-10 group"
                  style={{ left: `calc(${trimStart * 100}% - 2px)` }}
                  onMouseDown={e => onTrimMouseDown(e, 'start')}>
                  <div className="w-full h-full bg-primary rounded-full" />
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background shadow" />
                </div>

                {/* End handle */}
                <div className="absolute top-0 bottom-0 w-1 cursor-ew-resize z-10"
                  style={{ left: `calc(${trimEnd * 100}% - 2px)` }}
                  onMouseDown={e => onTrimMouseDown(e, 'end')}>
                  <div className="w-full h-full bg-primary rounded-full" />
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background shadow" />
                </div>
              </div>

              {/* Playback controls */}
              <div className="flex items-center gap-4">
                <button onClick={togglePlay}
                  className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${toolGradient.color} text-white shadow-lg transition-transform hover:scale-105 active:scale-95`}>
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full transition-none"
                    style={{
                      background: `linear-gradient(90deg, ${toolGradient.preview[0]}, ${toolGradient.preview[1]})`,
                      width: duration > 0 ? `${((currentTime - trimStartSec) / (trimEndSec - trimStartSec)) * 100}%` : '0%',
                    }} />
                </div>
                <span className="text-xs font-mono text-muted-foreground w-20 text-right">
                  {formatTime(currentTime)} / {formatTime(trimEndSec - trimStartSec)}
                </span>
              </div>

              {/* Reset trim */}
              <button onClick={() => { setTrimStart(0); setTrimEnd(1); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw className="w-3 h-3" /> Reset trim
              </button>
            </motion.div>

            {/* Export + Compression */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
              {/* Compression picker */}
              <div className="glass-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground/70 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-primary" /> Compression
                  </span>
                  <div className="flex items-center gap-2">
                    {compression && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                        style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                        {compression === 'compact' ? '8-bit · ~50% size' : compression === 'balanced' ? '16-bit · standard' : '32-bit float · lossless'}
                      </span>
                    )}
                    <button onClick={() => setShowCompressOpts(o => !o)}
                      className="text-xs px-3 py-1 rounded-lg transition-colors"
                      style={{ background: showCompressOpts ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)', color: showCompressOpts ? '#818cf8' : 'rgba(200,200,200,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {compression ? 'Change' : 'Select'}
                    </button>
                    {compression && (
                      <button onClick={() => { setCompression(null); setShowCompressOpts(false); }}
                        className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">✕</button>
                    )}
                  </div>
                </div>
                <AnimatePresence>
                  {showCompressOpts && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'compact',  label: 'Compact',  desc: '8-bit · smallest', Icon: Zap,   color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.35)' },
                          { key: 'balanced', label: 'Balanced', desc: '16-bit · standard', Icon: Scale, color: '#818cf8', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)' },
                          { key: 'lossless', label: 'Lossless', desc: '32-bit float',      Icon: Gem,   color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.35)' },
                        ].map(({ key, label, desc, Icon, color, bg, border }) => (
                          <button key={key} onClick={() => { setCompression(key); setShowCompressOpts(false); }}
                            className="flex flex-col items-center gap-1 py-3 rounded-xl transition-all text-center"
                            style={{ background: compression === key ? bg : 'rgba(255,255,255,0.04)', border: `1px solid ${compression === key ? border : 'rgba(255,255,255,0.08)'}` }}>
                            <Icon className="w-4 h-4" style={{ color }} />
                            <span className="text-xs font-semibold" style={{ color: compression === key ? color : 'rgba(200,200,200,0.8)' }}>{label}</span>
                            <span className="text-[10px] text-muted-foreground">{desc}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Export button */}
              <button onClick={exportAudio} disabled={processing}
                className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-semibold text-sm transition-all bg-gradient-to-r ${toolGradient.color} text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed`}
                style={{ boxShadow: `0 0 24px ${toolGradient.glow}` }}>
                {processing ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</>
                ) : exported ? (
                  <><Check className="w-4 h-4" /> Exported!</>
                ) : (
                  <><Download className="w-4 h-4" /> Export Modified Audio (.wav)</>
                )}
              </button>
              {(enabledCount > 0 || compression) && (
                <p className="text-center text-xs text-muted-foreground">
                  {enabledCount > 0 && <>{enabledCount} effect{enabledCount > 1 ? 's' : ''} active</>}
                  {enabledCount > 0 && compression && <> · </>}
                  {compression === 'compact' && '8-bit WAV'}
                  {compression === 'balanced' && '16-bit PCM WAV'}
                  {compression === 'lossless' && '32-bit float WAV'}
                  {!compression && enabledCount > 0 && ' · 16-bit PCM WAV'}
                </p>
              )}
            </motion.div>
          </div>

          {/* Right — Audio Toolkit */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            className="space-y-3">
            <div className="flex items-center gap-2 px-1 mb-4">
              <Sliders className="w-4 h-4 text-primary" />
              <h2 className="font-display font-bold text-base">Audio Toolkit</h2>
              {enabledCount > 0 && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-mono"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                  {enabledCount} active
                </span>
              )}
            </div>

            {/* 3D Audio */}
            <ToolCard title="3D Audio" icon={Waves} iconColor="#ef4444">
              <div className="space-y-4 mt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-muted-foreground">Enable</span>
                  <div onClick={() => setAudio3D(p => ({ ...p, enabled: !p.enabled }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${audio3D.enabled ? 'bg-red-500' : 'bg-white/15'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${audio3D.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </label>
                {audio3D.enabled && <>
                  <SliderRow label="Width" value={audio3D.width} min={0} max={100} unit="%" onChange={v => setAudio3D(p => ({ ...p, width: v }))} accent="#ef4444" />
                  <SliderRow label="Depth" value={audio3D.depth} min={0} max={100} unit="%" onChange={v => setAudio3D(p => ({ ...p, depth: v }))} accent="#ef4444" />
                </>}
              </div>
            </ToolCard>

            {/* Auto Panner */}
            <ToolCard title="Auto Panner" icon={Activity} iconColor="#f97316">
              <div className="space-y-4 mt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-muted-foreground">Enable</span>
                  <div onClick={() => setAutoPanner(p => ({ ...p, enabled: !p.enabled }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${autoPanner.enabled ? 'bg-orange-500' : 'bg-white/15'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoPanner.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </label>
                {autoPanner.enabled && <>
                  <SliderRow label="Rate" value={autoPanner.rate} min={0.1} max={4} step={0.1} unit=" Hz" onChange={v => setAutoPanner(p => ({ ...p, rate: v }))} accent="#f97316" />
                  <SliderRow label="Depth" value={autoPanner.depth} min={0} max={100} unit="%" onChange={v => setAutoPanner(p => ({ ...p, depth: v }))} accent="#f97316" />
                </>}
              </div>
            </ToolCard>

            {/* Stereo Panner */}
            <ToolCard title="Stereo Panner" icon={AlignCenter} iconColor="#fb923c">
              <div className="space-y-4 mt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-muted-foreground">Enable</span>
                  <div onClick={() => setStereoPanner(p => ({ ...p, enabled: !p.enabled }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${stereoPanner.enabled ? 'bg-orange-400' : 'bg-white/15'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${stereoPanner.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </label>
                {stereoPanner.enabled && <>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 mb-1 font-mono">
                    <span>L</span><span>Center</span><span>R</span>
                  </div>
                  <SliderRow label="Pan" value={stereoPanner.pan} min={-100} max={100} unit="" onChange={v => setStereoPanner(p => ({ ...p, pan: v }))} accent="#fb923c"
                    formatVal={v => v === 0 ? 'Center' : v < 0 ? `${Math.abs(v)}% L` : `${v}% R`} />
                </>}
              </div>
            </ToolCard>

            {/* Bass Booster */}
            <ToolCard title="Bass Booster" icon={Volume2} iconColor="#eab308">
              <div className="space-y-4 mt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-muted-foreground">Enable</span>
                  <div onClick={() => setBassBooster(p => ({ ...p, enabled: !p.enabled }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${bassBooster.enabled ? 'bg-yellow-500' : 'bg-white/15'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${bassBooster.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </label>
                {bassBooster.enabled && <>
                  <SliderRow label="Gain" value={bassBooster.gain} min={0} max={EQ_DB_LIMIT} unit=" dB" onChange={v => setBassBooster(p => ({ ...p, gain: v }))} accent="#eab308" />
                  <SliderRow label="Frequency" value={bassBooster.freq} min={60} max={500} unit=" Hz" onChange={v => setBassBooster(p => ({ ...p, freq: v }))} accent="#eab308" />
                </>}
              </div>
            </ToolCard>

            {/* Equalizer */}
            <ToolCard title="Equalizer" icon={Sliders} iconColor="#22c55e" defaultOpen={false}>
              <div className="space-y-4 mt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-muted-foreground">Enable</span>
                  <div onClick={() => setEq(p => ({ ...p, enabled: !p.enabled }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${eq.enabled ? 'bg-green-500' : 'bg-white/15'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${eq.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </label>
                {eq.enabled && (
                  <EQVisualizer bass={eq.bass} vocal={eq.vocal} treble={eq.treble} onChange={eqHandleChange} />
                )}
              </div>
            </ToolCard>

            {/* Pitch Shifter */}
            <ToolCard title="Pitch Shifter" icon={Mic2} iconColor="#7dd3fc">
              <div className="space-y-4 mt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-muted-foreground">Enable</span>
                  <div onClick={() => setPitchShifter(p => ({ ...p, enabled: !p.enabled }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${pitchShifter.enabled ? 'bg-sky-300' : 'bg-white/15'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${pitchShifter.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </label>
                {pitchShifter.enabled && (
                  <SliderRow label="Semitones" value={pitchShifter.semitones} min={-12} max={12} unit=" st" onChange={v => setPitchShifter(p => ({ ...p, semitones: v }))} accent="#7dd3fc"
                    formatVal={v => v === 0 ? '0 st (original)' : `${v > 0 ? '+' : ''}${v} st`} />
                )}
                {pitchShifter.enabled && <p className="text-[10px] text-muted-foreground/60">Note: Pitch shift applies playback rate scaling during export.</p>}
              </div>
            </ToolCard>

            {/* Reverb */}
            <ToolCard title="Reverb" icon={Wind} iconColor="#1d4ed8">
              <div className="space-y-4 mt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-muted-foreground">Enable</span>
                  <div onClick={() => setReverb(p => ({ ...p, enabled: !p.enabled }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${reverb.enabled ? 'bg-blue-700' : 'bg-white/15'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${reverb.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </label>
                {reverb.enabled && <>
                  <SliderRow label="Decay" value={reverb.decay} min={0.5} max={8} step={0.5} unit=" s" onChange={v => setReverb(p => ({ ...p, decay: v }))} accent="#1d4ed8" />
                  <SliderRow label="Wet Mix" value={reverb.wet} min={0} max={100} unit="%" onChange={v => setReverb(p => ({ ...p, wet: v }))} accent="#1d4ed8" />
                </>}
              </div>
            </ToolCard>

            {/* Reverser */}
            <ToolCard title="Audio Reverser" icon={RotateCcw} iconColor="#d8b4fe">
              <div className="space-y-4 mt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-muted-foreground">Reverse on export</span>
                  <div onClick={() => setReverser(p => ({ ...p, enabled: !p.enabled }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${reverser.enabled ? 'bg-purple-300' : 'bg-white/15'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${reverser.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </label>
                {reverser.enabled && (
                  <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                    The audio will be reversed during export. Reversal applies before all other effects.
                  </p>
                )}
              </div>
            </ToolCard>

            {/* Tempo Changer */}
            <ToolCard title="Tempo Changer" icon={Zap} iconColor="#a855f7">
              <div className="space-y-4 mt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-muted-foreground">Enable</span>
                  <div onClick={() => setTempoChanger(p => ({ ...p, enabled: !p.enabled }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${tempoChanger.enabled ? 'bg-purple-500' : 'bg-white/15'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${tempoChanger.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </label>
                {tempoChanger.enabled && (
                  <SliderRow label="Playback Rate" value={tempoChanger.rate} min={0.25} max={3} step={0.05} onChange={v => setTempoChanger(p => ({ ...p, rate: v }))} accent="#a855f7"
                    formatVal={v => `${v.toFixed(2)}× ${v === 1 ? '(original)' : v < 1 ? '(slower)' : '(faster)'}`} />
                )}
              </div>
            </ToolCard>

            {/* Volume Changer */}
            <ToolCard title="Volume Changer" icon={Volume2} iconColor="#f472b6">
              <div className="space-y-4 mt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-muted-foreground">Enable</span>
                  <div onClick={() => setVolumeChanger(p => ({ ...p, enabled: !p.enabled }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${volumeChanger.enabled ? 'bg-pink-400' : 'bg-white/15'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${volumeChanger.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </label>
                {volumeChanger.enabled && <>
                  <SliderRow label="Volume (dB)" value={volumeChanger.db} min={-40} max={12} unit=" dB" onChange={v => setVolumeChanger(p => ({ ...p, db: v }))} accent="#f472b6"
                    formatVal={v => `${v >= 0 ? '+' : ''}${v} dB`} />
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 font-mono">
                    <span>−40 dB (silent)</span><span>0 dB (unity)</span><span>+12 dB (boost)</span>
                  </div>
                </>}
              </div>
            </ToolCard>

          </motion.div>
        </div>
      )}

      {/* Scroll-to-top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 w-10 h-10 rounded-full flex items-center justify-center shadow-lg z-40 transition-all hover:scale-110"
            style={{ background: `linear-gradient(135deg, ${toolGradient.preview[0]}, ${toolGradient.preview[1]})` }}
            aria-label="Scroll to top"
          >
            <ChevronUp className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

