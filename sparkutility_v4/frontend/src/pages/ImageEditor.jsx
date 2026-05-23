import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, Image as ImageIcon, Crop, RotateCw, RotateCcw, FlipHorizontal,
  FlipVertical, Sun, Droplets, ZoomIn, ZoomOut,
  Download, Trash2, RefreshCw, Sliders, Eye, EyeOff, Wand2,
  Layers, Filter, Move, Square, Shield, Zap, Pencil, Brush, Eraser,
  Undo2, Redo2, Sparkles, Thermometer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useToolTheme } from '@/context/ToolThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { playSuccessChime, notifyTaskComplete } from '@/lib/notificationSound';

const FILTERS = [
  { key: 'none',      label: 'Original',  css: '' },
  { key: 'grayscale', label: 'Grayscale', css: 'grayscale(100%)' },
  { key: 'sepia',     label: 'Sepia',     css: 'sepia(80%)' },
  { key: 'invert',    label: 'Invert',    css: 'invert(100%)' },
  { key: 'blur',      label: 'Blur',      css: 'blur(2px)' },
  { key: 'saturate',  label: 'Vivid',     css: 'saturate(200%)' },
  { key: 'cool',      label: 'Cool',      css: 'hue-rotate(180deg) saturate(120%)' },
  { key: 'warm',      label: 'Warm',      css: 'sepia(40%) saturate(150%) brightness(105%)' },
  { key: 'drama',     label: 'Drama',     css: 'contrast(130%) saturate(80%) brightness(90%)' },
  { key: 'fade',      label: 'Fade',      css: 'brightness(110%) contrast(85%) saturate(80%)' },
];

const DEFAULT_ADJUSTMENTS = {
  exposure:    0,   // -2 … +2 stops
  contrast:    0,   // -100 … +100
  highlights:  0,   // -100 … +100  (pulls down / lifts bright pixels)
  shadows:     0,   // -100 … +100  (lifts / crushes dark pixels)
  whites:      0,   // -100 … +100  (extends bright range)
  blacks:      0,   // -100 … +100  (extends dark range)
  saturation:  0,   // -100 … +100
  vibrance:    0,   // -100 … +100  (weights away from already-saturated)
  temperature: 0,   // -100 (cool) … +100 (warm)  — R/B shift
  tint:        0,   // -100 (green) … +100 (magenta) — G shift
};

const DEFAULT_TRANSFORM = {
  rotation: 0,
  flipH:    false,
  flipV:    false,
  zoom:     100,
};

function applyLightroomAdjustments(imageData, adj) {
  const d = imageData.data;
  const exposureGain = Math.pow(2, adj.exposure); // ±2 stops → ×0.25 .. ×4
  const contrastFactor = 1 + adj.contrast / 100;
  const hi = adj.highlights / 100;
  const sh = adj.shadows / 100;
  const wh = adj.whites / 100;
  const bl = adj.blacks / 100;
  const sat = 1 + adj.saturation / 100;
  const vib = adj.vibrance / 100;
  const temp = adj.temperature / 100;
  const tint = adj.tint / 100;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;

    r *= exposureGain; g *= exposureGain; b *= exposureGain;

    r = (r - 0.5) * contrastFactor + 0.5;
    g = (g - 0.5) * contrastFactor + 0.5;
    b = (b - 0.5) * contrastFactor + 0.5;

    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    if (lum > 0.5) {
      const t = (lum - 0.5) * 2;
      const factor = 1 + hi * t * 0.5;
      r *= factor; g *= factor; b *= factor;
    }
    if (lum < 0.5) {
      const t = (0.5 - lum) * 2;
      const factor = 1 + sh * t * 0.5;
      r += (sh > 0 ? 1 : 0 - r) * t * Math.abs(sh) * 0.4;
      g += (sh > 0 ? 1 : 0 - g) * t * Math.abs(sh) * 0.4;
      b += (sh > 0 ? 1 : 0 - b) * t * Math.abs(sh) * 0.4;
      // factor lift for completeness
      r *= factor; g *= factor; b *= factor;
    }

    if (lum > 0.85) {
      const t = (lum - 0.85) / 0.15;
      r += wh * t * 0.3;
      g += wh * t * 0.3;
      b += wh * t * 0.3;
    }
    if (lum < 0.15) {
      const t = (0.15 - lum) / 0.15;
      r -= bl * t * 0.3;
      g -= bl * t * 0.3;
      b -= bl * t * 0.3;
    }

    r += temp * 0.10;
    b -= temp * 0.10;

    g -= tint * 0.10;

    if (sat !== 1) {
      const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = grey + (r - grey) * sat;
      g = grey + (g - grey) * sat;
      b = grey + (b - grey) * sat;
    }

    if (vib !== 0) {
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const currentSat = mx - mn;
      const room = 1 - currentSat;
      const f = 1 + vib * room;
      const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = grey + (r - grey) * f;
      g = grey + (g - grey) * f;
      b = grey + (b - grey) * f;
    }

    d[i]     = Math.max(0, Math.min(255, r * 255));
    d[i + 1] = Math.max(0, Math.min(255, g * 255));
    d[i + 2] = Math.max(0, Math.min(255, b * 255));
  }
}

function adjustmentsAreDefault(a) {
  return Object.keys(DEFAULT_ADJUSTMENTS).every(k => a[k] === DEFAULT_ADJUSTMENTS[k]);
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function CropOverlay({ cropBox, onChange, imgW, imgH }) {
  const dragging = useRef(null);
  const boxRef = useRef(null);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const onMouseDown = (e, handle) => {
    e.preventDefault();
    dragging.current = { handle, startX: e.clientX, startY: e.clientY, box: { ...cropBox } };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };
  const onMouseMove = useCallback((e) => {
    if (!dragging.current || !imgW || !imgH) return;
    const dx = ((e.clientX - dragging.current.startX) / imgW) * 100;
    const dy = ((e.clientY - dragging.current.startY) / imgH) * 100;
    const { handle, box } = dragging.current;
    let { x, y, w, h } = box;
    if (handle === 'move') {
      x = clamp(x + dx, 0, 100 - w);
      y = clamp(y + dy, 0, 100 - h);
    } else {
      if (handle.includes('e')) w = clamp(w + dx, 5, 100 - x);
      if (handle.includes('s')) h = clamp(h + dy, 5, 100 - y);
      if (handle.includes('w')) { const dw = clamp(-dx, -(w - 5), x); x -= dw; w += dw; }
      if (handle.includes('n')) { const dh = clamp(-dy, -(h - 5), y); y -= dh; h += dh; }
    }
    onChange({ x, y, w, h });
  }, [imgW, imgH, onChange]);
  const onMouseUp = useCallback(() => {
    dragging.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  const handles = [
    { id: 'nw', style: { top: 0, left: 0, cursor: 'nw-resize' } },
    { id: 'ne', style: { top: 0, right: 0, cursor: 'ne-resize' } },
    { id: 'sw', style: { bottom: 0, left: 0, cursor: 'sw-resize' } },
    { id: 'se', style: { bottom: 0, right: 0, cursor: 'se-resize' } },
    { id: 'n',  style: { top: 0, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
    { id: 's',  style: { bottom: 0, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
    { id: 'w',  style: { left: 0, top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize' } },
    { id: 'e',  style: { right: 0, top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize' } },
  ];

  return (
    <div
      ref={boxRef}
      className="absolute border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
      style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.w}%`, height: `${cropBox.h}%`, cursor: 'move' }}
      onMouseDown={(e) => onMouseDown(e, 'move')}
    >
      {/* Rule-of-thirds grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-1/3 h-px bg-white/30" />
        <div className="absolute inset-x-0 top-2/3 h-px bg-white/30" />
        <div className="absolute inset-y-0 left-1/3 w-px bg-white/30" />
        <div className="absolute inset-y-0 left-2/3 w-px bg-white/30" />
      </div>
      {handles.map(h => (
        <div
          key={h.id}
          className="absolute w-3 h-3 bg-primary rounded-sm border border-background"
          style={{ ...h.style, margin: -6 }}
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, h.id); }}
        />
      ))}
    </div>
  );
}

function SideSection({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-secondary/30 hover:bg-secondary/60 transition-colors text-sm font-semibold"
      >
        <Icon className="w-4 h-4 text-primary" />
        {title}
        <span className="ml-auto text-muted-foreground text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

function AdjSlider({ label, value, min, max, step = 1, onChange, unit = '', accent }) {
  const [inputVal, setInputVal] = React.useState(String(value));
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) setInputVal(String(value));
  }, [value, focused]);

  const commit = (raw) => {
    const n = parseFloat(raw);
    if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
    else setInputVal(String(value));
  };

  const isCentered = min < 0 && max > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="text-muted-foreground shrink-0">{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={inputVal}
            onFocus={() => setFocused(true)}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={(e) => { setFocused(false); commit(e.target.value); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.target.blur(); }
              if (e.key === 'Escape') { setInputVal(String(value)); e.target.blur(); }
            }}
            className="w-16 h-6 rounded-md border border-border/60 bg-secondary/60 px-1.5 text-right font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            style={accent && value !== 0 ? { color: accent } : undefined}
          />
          {unit && <span className="text-muted-foreground/60 text-[10px]">{unit}</span>}
        </div>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} className="w-full" />
      {isCentered && value !== 0 && (
        <button
          onClick={() => onChange(0)}
          className="text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          Reset to 0
        </button>
      )}
    </div>
  );
}

export default function ImageEditor() {
  const { getToolGradient } = useToolTheme();
  const toolGradient = getToolGradient('/image-editor');
  const { settings } = useSettings();
  const kb = settings?.keybinds ?? {};

  const [file, setFile] = useState(null);
  const [src, setSrc]   = useState(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  const [outputSize, setOutputSize] = useState(null);

  const [adjustments, setAdjustments] = useState(DEFAULT_ADJUSTMENTS);
  const [transform, setTransform]     = useState(DEFAULT_TRANSFORM);
  const [activeFilter, setActiveFilter] = useState('none');

  const [cropMode, setCropMode] = useState(false);
  const [cropBox, setCropBox]   = useState({ x: 10, y: 10, w: 80, h: 80 });

  const [tool, setTool]          = useState(null);
  const [brushSize, setBrushSize] = useState(8);
  const [brushColor, setBrushColor] = useState('#ff3366');
  const [recentColors, setRecentColors] = useState(['#ff3366', '#fbbf24', '#22c55e', '#3b82f6', '#a855f7', '#ffffff', '#000000']);
  const [drawHistory, setDrawHistory] = useState([]);
  const [drawRedoStack, setDrawRedoStack] = useState([]);

  const [showOriginal, setShowOriginal] = useState(false);
  const [activeTab, setActiveTab] = useState('adjust');
  const [rendering, setRendering] = useState(false);

  const imgRef        = useRef(null);
  const baseCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const containerRef  = useRef(null);
  const dropRef       = useRef(null);
  const renderRafRef  = useRef(null);
  const isDrawingRef  = useRef(false);
  const lastPointRef  = useRef(null);

  const loadFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    setSrc(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(f); });
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setTransform(DEFAULT_TRANSFORM);
    setActiveFilter('none');
    setCropMode(false);
    setOutputSize(null);
    setTool(null);
    setDrawHistory([]);
    setDrawRedoStack([]);
  };

  const renderBase = useCallback(() => {
    const img = imgRef.current;
    const canvas = baseCanvasRef.current;
    if (!img || !canvas || !img.complete || !img.naturalWidth) return;

    const W = img.naturalWidth;
    const H = img.naturalHeight;
    if (canvas.width !== W) canvas.width  = W;
    if (canvas.height !== H) canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Apply preset filter via CSS-style canvas filter (cheap, GPU-accelerated)
    const presetCss = FILTERS.find(f => f.key === activeFilter)?.css || '';
    ctx.save();
    ctx.filter = presetCss || 'none';
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    ctx.restore();

    if (!adjustmentsAreDefault(adjustments)) {
      const data = ctx.getImageData(0, 0, W, H);
      applyLightroomAdjustments(data, adjustments);
      ctx.putImageData(data, 0, 0);
    }
  }, [adjustments, activeFilter]);

  // Re-render on adjustment change, debounced through a single rAF.
  useEffect(() => {
    if (!src) return;
    if (renderRafRef.current) cancelAnimationFrame(renderRafRef.current);
    renderRafRef.current = requestAnimationFrame(() => {
      setRendering(true);
      renderBase();
      setRendering(false);
    });
    return () => { if (renderRafRef.current) cancelAnimationFrame(renderRafRef.current); };
  }, [src, adjustments, activeFilter, renderBase]);

  // Match the drawing canvas dimensions to the image.
  useEffect(() => {
    const draw = drawCanvasRef.current;
    if (!draw || !imgDims.w || !imgDims.h) return;
    if (draw.width !== imgDims.w)  draw.width  = imgDims.w;
    if (draw.height !== imgDims.h) draw.height = imgDims.h;
  }, [imgDims]);

  const onDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadFile(f); };
  const onPick = (e) => { const f = e.target.files[0]; if (f) loadFile(f); };

  const setAdj = (key) => (val) => setAdjustments(prev => ({ ...prev, [key]: val }));
  const setTrn = (key) => (val) => setTransform(prev => ({ ...prev, [key]: val }));
  const rotate = (deg) => setTransform(prev => ({ ...prev, rotation: (prev.rotation + deg + 360) % 360 }));
  const resetAdjustments = () => setAdjustments(DEFAULT_ADJUSTMENTS);
  const resetAll = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setTransform(DEFAULT_TRANSFORM);
    setActiveFilter('none');
    setCropMode(false);
    setTool(null);
    clearDrawing();
  };

  const eventToCanvas = (e) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  };

  const HISTORY_CAP = 30;

  const snapshotDrawCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  const restoreDrawSnapshot = (snap) => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !snap) return;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(snap, 0, 0);
  };

  const pushDrawHistory = () => {
    const snap = snapshotDrawCanvas();
    if (!snap) return;
    setDrawHistory(prev => {
      const next = [...prev, snap];
      if (next.length > HISTORY_CAP) next.shift();
      return next;
    });
    setDrawRedoStack([]);
  };

  const undoDraw = useCallback(() => {
    setDrawHistory(prev => {
      if (!prev.length) return prev;
      // Capture the CURRENT canvas state so redo can return to it.
      const current = snapshotDrawCanvas();
      const last = prev[prev.length - 1];
      restoreDrawSnapshot(last);
      if (current) setDrawRedoStack(r => {
        const next = [...r, current];
        if (next.length > HISTORY_CAP) next.shift();
        return next;
      });
      return prev.slice(0, -1);
    });
  }, []);

  const redoDraw = useCallback(() => {
    setDrawRedoStack(prev => {
      if (!prev.length) return prev;
      const current = snapshotDrawCanvas();
      const next = prev[prev.length - 1];
      restoreDrawSnapshot(next);
      if (current) setDrawHistory(h => {
        const out = [...h, current];
        if (out.length > HISTORY_CAP) out.shift();
        return out;
      });
      return prev.slice(0, -1);
    });
  }, []);

  const clearDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    // Snapshot before clearing so the user can undo a "clear all".
    const snap = snapshotDrawCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (snap) {
      setDrawHistory(prev => {
        const next = [...prev, snap];
        if (next.length > HISTORY_CAP) next.shift();
        return next;
      });
      setDrawRedoStack([]);
    } else {
      setDrawHistory([]);
      setDrawRedoStack([]);
    }
  };

  const onCanvasPointerDown = (e) => {
    if (!tool) return;
    e.preventDefault();
    pushDrawHistory();
    isDrawingRef.current = true;
    const p = eventToCanvas(e);
    lastPointRef.current = p;
    drawSegment(p, p);
  };

  const onCanvasPointerMove = (e) => {
    if (!tool || !isDrawingRef.current) return;
    const p = eventToCanvas(e);
    if (!p) return;
    drawSegment(lastPointRef.current || p, p);
    lastPointRef.current = p;
  };

  const onCanvasPointerUp = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const drawSegment = (a, b) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    if (tool === 'eraser') {
      // Erase clears alpha on the draw layer only — base image is untouched.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.shadowBlur = 0;
    } else if (tool === 'brush') {
      // Soft brush: rely on shadow blur for the falloff.
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
      ctx.shadowBlur = Math.max(2, brushSize * 0.7);
      ctx.shadowColor = brushColor;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
      ctx.shadowBlur = 0;
    }
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };

  // Track the most recent N colours selected.
  const onPickColor = (c) => {
    setBrushColor(c);
    setRecentColors(prev => {
      const without = prev.filter(p => p.toLowerCase() !== c.toLowerCase());
      const next = [c, ...without];
      return next.slice(0, 8);
    });
  };

  const applyCrop = () => {
    const base = baseCanvasRef.current;
    const draw = drawCanvasRef.current;
    if (!base) return;
    const cw = Math.round((cropBox.w / 100) * base.width);
    const ch = Math.round((cropBox.h / 100) * base.height);
    const cx = Math.round((cropBox.x / 100) * base.width);
    const cy = Math.round((cropBox.y / 100) * base.height);

    // Composite base + draw before cropping so user strokes are kept.
    const out = document.createElement('canvas');
    out.width = cw; out.height = ch;
    const octx = out.getContext('2d');
    octx.drawImage(base, cx, cy, cw, ch, 0, 0, cw, ch);
    if (draw) octx.drawImage(draw, cx, cy, cw, ch, 0, 0, cw, ch);

    out.toBlob(blob => {
      if (!blob) return;
      const newSrc = URL.createObjectURL(blob);
      setSrc(prev => { if (prev) URL.revokeObjectURL(prev); return newSrc; });
      setFile(new File([blob], file?.name || 'cropped.png', { type: blob.type }));
      setImgDims({ w: cw, h: ch });
      setAdjustments(DEFAULT_ADJUSTMENTS);
      clearDrawing();
      setCropMode(false);
    }, file?.type || 'image/png');
  };

  const handleDownload = () => {
    const base = baseCanvasRef.current;
    const draw = drawCanvasRef.current;
    if (!base) return;

    const W = base.width;
    const H = base.height;
    const rad = (transform.rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const rotW = Math.round(W * cos + H * sin);
    const rotH = Math.round(W * sin + H * cos);
    const zoomFactor = transform.zoom / 100;

    const out = document.createElement('canvas');
    out.width  = Math.round(rotW * zoomFactor);
    out.height = Math.round(rotH * zoomFactor);
    const octx = out.getContext('2d');
    octx.translate(out.width / 2, out.height / 2);
    octx.rotate(rad);
    octx.scale(
      (transform.flipH ? -1 : 1) * zoomFactor,
      (transform.flipV ? -1 : 1) * zoomFactor,
    );
    octx.drawImage(base, -W / 2, -H / 2);
    if (draw) octx.drawImage(draw, -W / 2, -H / 2);

    const mime = file?.type || 'image/png';
    const ext  = (file?.name?.split('.').pop() || 'png').toLowerCase();
    out.toBlob(blob => {
      if (!blob) return;
      setOutputSize(blob.size);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited_${file?.name || `image.${ext}`}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      playSuccessChime();
      notifyTaskComplete({
        title: 'Image saved',
        body:  a.download,
        tag:   `image-${file?.name || 'export'}`,
      });
    }, mime, 0.92);
  };

  const transformStr = `rotate(${transform.rotation}deg) scaleX(${transform.flipH ? -1 : 1}) scaleY(${transform.flipV ? -1 : 1}) scale(${transform.zoom / 100})`;

  const shortcuts = useMemo(() => {
    if (!src) return {};
    return {
      [kb.imageUndo    ?? 'Mod+z']:       () => undoDraw(),
      [kb.imageRedo    ?? 'Mod+Shift+z']: () => redoDraw(),
      [kb.imageRedoAlt ?? 'Mod+y']:       () => redoDraw(),
      [kb.imageToolPen    ?? 'p']: () => setActiveTab('draw') || setTool('pen'),
      [kb.imageToolBrush  ?? 'b']: () => setActiveTab('draw') || setTool('brush'),
      [kb.imageToolEraser ?? 'e']: () => setActiveTab('draw') || setTool('eraser'),
    };
  }, [src, kb.imageUndo, kb.imageRedo, kb.imageRedoAlt, kb.imageToolPen, kb.imageToolBrush, kb.imageToolEraser, undoDraw, redoDraw]);
  useKeyboardShortcuts(shortcuts, { enabled: !!src });

  const TABS = [
    { key: 'adjust',    label: 'Adjust',    icon: Sliders },
    { key: 'draw',      label: 'Draw',      icon: Brush   },
    { key: 'transform', label: 'Transform', icon: Move    },
    { key: 'filters',   label: 'Filters',   icon: Filter  },
    { key: 'crop',      label: 'Crop',      icon: Crop    },
  ];

  const canvasIsInteractive = !!tool && !cropMode;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <section className="relative py-14 sm:py-18 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ background: `radial-gradient(circle, ${toolGradient.preview[0]}, transparent)` }}
          />
          <div
            className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-15"
            style={{ background: `radial-gradient(circle, ${toolGradient.preview[1]}, transparent)`, animationDelay: '3s' }}
          />
        </div>
        <div className="relative max-w-4xl mx-auto text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-6 shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${toolGradient.preview[0]}, ${toolGradient.preview[1]})`,
              boxShadow: `0 0 24px ${toolGradient.glow}`,
              color: '#fff',
            }}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Image Editor
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-tight mb-4"
          >
            Edit Images.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, ${toolGradient.preview[0]}, ${toolGradient.preview[1]})` }}
            >
              Like A Pro.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8"
          >
            Lightroom-style adjustments, MS-Paint-style drawing tools, and a full crop/transform
            kit — all 100% in your browser.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {[
              { icon: Shield, label: '100% Private' },
              { icon: Sparkles, label: '10 Lightroom Sliders' },
              { icon: Brush, label: 'Pen + Brush + Eraser' },
              { icon: Zap, label: 'Canvas-Powered' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm font-medium text-foreground/80">
                <Icon className="w-4 h-4 text-primary" />
                {label}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {src && (
        <img
          ref={imgRef}
          src={src}
          alt=""
          className="hidden"
          onLoad={(e) => {
            setImgDims({ w: e.target.naturalWidth, h: e.target.naturalHeight });
            renderBase();
          }}
        />
      )}

      {!src ? (
        <label
          ref={dropRef}
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          className="block cursor-pointer"
        >
          <div className="glass-card rounded-2xl border-2 border-dashed border-border/60 transition-all duration-300 p-16 text-center group hover:border-primary/40">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${toolGradient.color} flex items-center justify-center mx-auto mb-4 shadow-lg transition-all`}
              style={{ boxShadow: `0 0 30px ${toolGradient.glow}` }}
            >
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
            <p className="text-lg font-semibold mb-1">Drop an image here</p>
            <p className="text-sm text-muted-foreground mb-4">or click to browse your files</p>
            <p className="text-xs text-muted-foreground/60">PNG, JPG, WebP, GIF, BMP, AVIF, SVG supported</p>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={onPick} />
        </label>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="glass-card rounded-xl p-3 flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={resetAll}>
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </Button>
              <Button
                size="sm"
                variant={showOriginal ? 'secondary' : 'ghost'}
                className="gap-1.5 text-xs"
                onMouseDown={() => setShowOriginal(true)}
                onMouseUp={() => setShowOriginal(false)}
                onMouseLeave={() => setShowOriginal(false)}
              >
                {showOriginal ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                Hold to compare
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs"
                onClick={undoDraw}
                disabled={!drawHistory.length}
                title="Undo (Cmd/Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" /> Undo
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs"
                onClick={redoDraw}
                disabled={!drawRedoStack.length}
                title="Redo (Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" /> Redo
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs text-destructive border-destructive/30"
                  onClick={() => { setFile(null); setSrc(prev => { if (prev) URL.revokeObjectURL(prev); return null; }); }}>
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
                <Button size="sm" className="gap-1.5 text-xs" onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
              </div>
            </div>

            {/* Canvas stack */}
            <div
              ref={containerRef}
              className="glass-card rounded-xl overflow-hidden bg-[repeating-conic-gradient(hsl(var(--secondary))_0%_25%,transparent_0%_50%)_0_0/20px_20px] min-h-80 flex items-center justify-center relative"
              style={{ aspectRatio: '16/10' }}
            >
              <div
                className="relative max-w-full max-h-full transition-transform duration-300"
                style={{ transform: transformStr }}
              >
                {/* Base canvas: the adjustments-applied image. */}
                <canvas
                  ref={baseCanvasRef}
                  className="block max-w-full max-h-[60vh] select-none"
                  style={{ display: showOriginal ? 'none' : 'block' }}
                />
                {/* When holding compare, show the unmodified source image at the same dimensions. */}
                {showOriginal && (
                  <img src={src} alt="Original" className="block max-w-full max-h-[60vh] select-none" draggable={false} />
                )}
                {/* Drawing layer — exact same dimensions, captures pointer events only when a tool is active. */}
                <canvas
                  ref={drawCanvasRef}
                  onPointerDown={onCanvasPointerDown}
                  onPointerMove={onCanvasPointerMove}
                  onPointerUp={onCanvasPointerUp}
                  onPointerLeave={onCanvasPointerUp}
                  className="absolute inset-0 w-full h-full"
                  style={{
                    pointerEvents: canvasIsInteractive ? 'auto' : 'none',
                    cursor: tool === 'eraser' ? 'cell' : tool ? 'crosshair' : 'default',
                  }}
                />
              </div>
              {cropMode && (
                <div className="absolute inset-0">
                  <CropOverlay
                    cropBox={cropBox}
                    onChange={setCropBox}
                    imgW={containerRef.current?.offsetWidth}
                    imgH={containerRef.current?.offsetHeight}
                  />
                </div>
              )}
              {rendering && (
                <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 text-[10px] text-white/80 font-mono">
                  rendering…
                </div>
              )}
            </div>

            <div className="glass-card rounded-xl p-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="font-medium text-foreground truncate max-w-48">{file?.name}</span>
              <span>{formatFileSize(file?.size)} original</span>
              {outputSize && <span>~{formatFileSize(outputSize)} output</span>}
              {imgDims.w > 0 && <span>{imgDims.w} × {imgDims.h}px</span>}
              <span className="ml-auto">Rotation: {transform.rotation}°</span>
            </div>

            {cropMode && (
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setCropMode(false)}>Cancel</Button>
                <Button size="sm" onClick={applyCrop} className="gap-1.5">
                  <Crop className="w-3.5 h-3.5" /> Apply Crop
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="glass-card rounded-xl p-1 flex gap-1 overflow-x-auto">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      if (tab.key === 'crop') setCropMode(true); else setCropMode(false);
                      if (tab.key !== 'draw') setTool(null);
                    }}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-[10px] font-semibold transition-all ${
                      activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Adjust tab — Lightroom sliders */}
            {activeTab === 'adjust' && (
              <div className="space-y-3">
                <SideSection title="Light" icon={Sun}>
                  <AdjSlider label="Exposure"   value={adjustments.exposure}   min={-2}   max={2}   step={0.05} onChange={setAdj('exposure')}   unit=" EV" />
                  <AdjSlider label="Contrast"   value={adjustments.contrast}   min={-100} max={100}             onChange={setAdj('contrast')} />
                  <AdjSlider label="Highlights" value={adjustments.highlights} min={-100} max={100}             onChange={setAdj('highlights')} />
                  <AdjSlider label="Shadows"    value={adjustments.shadows}    min={-100} max={100}             onChange={setAdj('shadows')} />
                  <AdjSlider label="Whites"     value={adjustments.whites}     min={-100} max={100}             onChange={setAdj('whites')} />
                  <AdjSlider label="Blacks"     value={adjustments.blacks}     min={-100} max={100}             onChange={setAdj('blacks')} />
                </SideSection>
                <SideSection title="Colour" icon={Droplets}>
                  <AdjSlider label="Saturation"  value={adjustments.saturation}  min={-100} max={100} onChange={setAdj('saturation')} />
                  <AdjSlider label="Vibrance"    value={adjustments.vibrance}    min={-100} max={100} onChange={setAdj('vibrance')} />
                </SideSection>
                <SideSection title="White Balance" icon={Thermometer}>
                  <AdjSlider label="Temperature" value={adjustments.temperature} min={-100} max={100} onChange={setAdj('temperature')} unit="" accent="#f59e0b" />
                  <AdjSlider label="Tint"        value={adjustments.tint}        min={-100} max={100} onChange={setAdj('tint')}        unit="" accent="#a855f7" />
                </SideSection>
                <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={resetAdjustments}>
                  <RefreshCw className="w-3.5 h-3.5" /> Reset adjustments
                </Button>
              </div>
            )}

            {/* Draw tab — MS-Paint tools */}
            {activeTab === 'draw' && (
              <div className="space-y-3">
                <SideSection title="Tool" icon={Brush}>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'pen',    icon: Pencil, label: 'Pen' },
                      { key: 'brush',  icon: Brush,  label: 'Brush' },
                      { key: 'eraser', icon: Eraser, label: 'Eraser' },
                    ].map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        onClick={() => setTool(prev => prev === key ? null : key)}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-all ${
                          tool === key
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] font-semibold">{label}</span>
                      </button>
                    ))}
                  </div>
                  {tool && (
                    <p className="text-[11px] text-muted-foreground/80 leading-relaxed pt-1">
                      {tool === 'pen' && 'Hard edge, full opacity. Best for sharp marks and labels.'}
                      {tool === 'brush' && 'Soft falloff with a feathered edge. Best for highlights and tints.'}
                      {tool === 'eraser' && 'Clears strokes from the drawing layer. The base image is untouched.'}
                    </p>
                  )}
                </SideSection>

                <SideSection title="Brush settings" icon={Sliders}>
                  <AdjSlider label="Size" value={brushSize} min={1} max={100} onChange={setBrushSize} unit=" px" />
                  {tool !== 'eraser' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Colour</span>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-md border border-border/60"
                            style={{ background: brushColor }}
                          />
                          <input
                            type="color"
                            value={brushColor}
                            onChange={e => onPickColor(e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer bg-transparent border-none"
                          />
                          <span className="font-mono text-[10px] text-muted-foreground/70 uppercase">{brushColor}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentColors.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => onPickColor(c)}
                            className={`w-6 h-6 rounded-md border-2 transition-all ${
                              c.toLowerCase() === brushColor.toLowerCase()
                                ? 'border-primary scale-110'
                                : 'border-border/40 hover:border-border'
                            }`}
                            style={{ background: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </SideSection>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5 text-destructive border-destructive/40"
                  onClick={clearDrawing}
                  disabled={!drawHistory.length && !drawCanvasRef.current}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear all strokes
                </Button>
              </div>
            )}

            {/* Transform tab */}
            {activeTab === 'transform' && (
              <div className="space-y-3">
                <SideSection title="Rotation" icon={RotateCw}>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => rotate(-90)}>
                      <RotateCcw className="w-3.5 h-3.5" /> -90°
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => rotate(90)}>
                      <RotateCw className="w-3.5 h-3.5" /> +90°
                    </Button>
                  </div>
                  <AdjSlider label="Fine rotation" value={transform.rotation} min={0} max={359} onChange={setTrn('rotation')} unit="°" />
                </SideSection>
                <SideSection title="Flip" icon={FlipHorizontal}>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={transform.flipH ? 'default' : 'outline'}
                      className="flex-1 gap-1.5"
                      onClick={() => setTransform(p => ({ ...p, flipH: !p.flipH }))}
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" /> Horizontal
                    </Button>
                    <Button
                      size="sm"
                      variant={transform.flipV ? 'default' : 'outline'}
                      className="flex-1 gap-1.5"
                      onClick={() => setTransform(p => ({ ...p, flipV: !p.flipV }))}
                    >
                      <FlipVertical className="w-3.5 h-3.5" /> Vertical
                    </Button>
                  </div>
                </SideSection>
                <SideSection title="Zoom" icon={ZoomIn}>
                  <AdjSlider label="Zoom level" value={transform.zoom} min={25} max={300} onChange={setTrn('zoom')} unit="%" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => setTrn('zoom')(Math.max(25, transform.zoom - 25))}>
                      <ZoomOut className="w-3.5 h-3.5" /> -25%
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => setTrn('zoom')(100)}>
                      <Square className="w-3.5 h-3.5" /> 100%
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => setTrn('zoom')(Math.min(300, transform.zoom + 25))}>
                      <ZoomIn className="w-3.5 h-3.5" /> +25%
                    </Button>
                  </div>
                </SideSection>
              </div>
            )}

            {/* Filters tab */}
            {activeTab === 'filters' && (
              <SideSection title="Preset Filters" icon={Layers} defaultOpen>
                <div className="grid grid-cols-2 gap-2">
                  {FILTERS.map(f => (
                    <button
                      key={f.key}
                      onClick={() => setActiveFilter(f.key)}
                      className={`rounded-lg overflow-hidden border-2 transition-all text-xs font-medium ${
                        activeFilter === f.key ? 'border-primary' : 'border-border/40 hover:border-border'
                      }`}
                    >
                      <div className="h-16 overflow-hidden bg-secondary/30 flex items-center justify-center">
                        <img
                          src={src}
                          alt={f.label}
                          className="w-full h-full object-cover"
                          style={{ filter: f.css }}
                        />
                      </div>
                      <div className={`py-1 px-2 text-center ${activeFilter === f.key ? 'bg-primary text-primary-foreground' : 'bg-secondary/30'}`}>
                        {f.label}
                      </div>
                    </button>
                  ))}
                </div>
              </SideSection>
            )}

            {/* Crop tab */}
            {activeTab === 'crop' && (
              <SideSection title="Crop Tool" icon={Crop} defaultOpen>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Drag the handles on the image to set your crop area. The rule-of-thirds grid helps with composition.
                </p>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-secondary/30 rounded-lg p-2 text-center">
                      <div className="text-muted-foreground mb-1">X offset</div>
                      <div className="font-mono font-bold">{cropBox.x.toFixed(1)}%</div>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-2 text-center">
                      <div className="text-muted-foreground mb-1">Y offset</div>
                      <div className="font-mono font-bold">{cropBox.y.toFixed(1)}%</div>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-2 text-center">
                      <div className="text-muted-foreground mb-1">Width</div>
                      <div className="font-mono font-bold">{cropBox.w.toFixed(1)}%</div>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-2 text-center">
                      <div className="text-muted-foreground mb-1">Height</div>
                      <div className="font-mono font-bold">{cropBox.h.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setCropMode(false); setActiveTab('adjust'); }}>
                      Cancel
                    </Button>
                    <Button size="sm" className="flex-1 gap-1.5" onClick={applyCrop}>
                      <Crop className="w-3.5 h-3.5" /> Apply
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground font-medium">Quick aspect ratios</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '1:1', x: 10, y: 10, w: 80, h: 80 },
                      { label: '16:9', x: 0, y: 15, w: 100, h: 56 },
                      { label: '4:3', x: 5, y: 5, w: 90, h: 68 },
                      { label: '3:2', x: 5, y: 8, w: 90, h: 60 },
                      { label: '9:16', x: 25, y: 0, w: 50, h: 100 },
                    ].map(p => (
                      <button
                        key={p.label}
                        onClick={() => setCropBox({ x: p.x, y: p.y, w: p.w, h: p.h })}
                        className="px-2 py-1 text-[10px] rounded-md border border-border/50 hover:border-primary hover:text-primary transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </SideSection>
            )}

            {/* Quick actions */}
            <div className="glass-card rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Quick Actions</p>
              <div className="grid grid-cols-2 gap-1.5">
                <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={resetAll}>
                  <RefreshCw className="w-3 h-3" /> Reset All
                </Button>
                <Button size="sm" className="text-xs gap-1.5" onClick={handleDownload}>
                  <Download className="w-3 h-3" /> Save Image
                </Button>
              </div>
            </div>

            <label className="block cursor-pointer">
              <div className="glass-card rounded-xl p-3 border border-dashed border-border/50 hover:border-primary/50 transition-all text-center text-xs text-muted-foreground hover:text-foreground">
                <Upload className="w-4 h-4 mx-auto mb-1" />
                Replace image
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={onPick} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

