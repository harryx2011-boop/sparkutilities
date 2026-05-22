import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, Layers, Minimize2, LayoutGrid, Hash, SlidersHorizontal,
  Copy, Check, AlertTriangle, CheckCircle2, Zap, ChevronDown, Minus, Plus, Palette,
  RefreshCw, Type,
} from 'lucide-react';
import FluxBackdrop from '@/components/fluxkit/FluxBackdrop';

/* ─── Design tokens ─────────────────────────────────────────────────────────── */
const FH   = { fontFamily: '"Cormorant Garamond","Georgia",serif', fontWeight: 700, letterSpacing: '-0.02em' };
const FB   = { fontFamily: '"Montserrat","Inter",sans-serif' };
const FM   = { fontFamily: '"JetBrains Mono",monospace' };
const GOLD = '#FACC15';

/* ─── Shared primitives ─────────────────────────────────────────────────────── */
function useCopy(timeout = 1800) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    });
  }, [timeout]);
  return [copied, copy];
}

function ToolPanel({ children, title, icon: Icon, code, chips }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: '#0a0a0a', borderColor: 'rgba(250,204,21,0.15)', boxShadow: '0 4px 32px rgba(0,0,0,0.4)' }}>
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg,#FACC15,#92400E 60%,transparent)' }} />
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-white/[0.02] transition-colors">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,rgba(250,204,21,0.18),rgba(249,115,22,0.12))', border: '1px solid rgba(250,204,21,0.22)' }}>
          <Icon className="w-5 h-5" style={{ color: GOLD }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span style={{ ...FH, color: '#F5F0E8', fontSize: '1.05rem' }}>{title}</span>
            <span style={{ ...FM, fontSize: '0.65rem', color: GOLD, background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', padding: '2px 8px', borderRadius: '4px' }}>{code}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {chips.map(c => (
              <span key={c} style={{ ...FM, fontSize: '0.62rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(200,190,170,0.55)' }}>{c}</span>
            ))}
          </div>
        </div>
        <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
          style={{ color: 'rgba(250,204,21,0.5)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22,1,0.36,1] }}
            style={{ overflow: 'hidden' }}>
            <div className="px-6 pb-7 pt-1 border-t" style={{ borderColor: 'rgba(250,204,21,0.08)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CopyBlock({ value, label = 'Output CSS', rows = 8 }) {
  const [copied, copy] = useCopy();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <button onClick={() => copy(value)}
          className="flex items-center gap-1 text-[11px] transition-colors px-2 py-0.5 rounded"
          style={{ color: copied ? GOLD : 'rgba(200,190,170,0.4)', background: copied ? 'rgba(250,204,21,0.1)' : 'transparent' }}>
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <textarea value={value} readOnly rows={rows} spellCheck={false}
        className="w-full resize-y rounded-xl px-4 py-3 outline-none"
        style={{ ...FM, fontSize: '0.8rem', lineHeight: '1.6', background: 'rgba(250,204,21,0.025)', border: '1px solid rgba(250,204,21,0.15)', color: 'rgba(250,204,21,0.85)' }} />
    </div>
  );
}

function SliderRow({ label, value, min, max, step = 1, onChange, unit = '' }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between">
        <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <span style={{ ...FM, fontSize: '0.72rem', color: GOLD }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="fluxkit-range w-full" style={{ cursor: 'pointer' }} />
    </div>
  );
}

function ColorRow({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: '34px', height: '30px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', padding: '2px', background: 'none', flexShrink: 0 }} />
        <input type="text" value={value}
          onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
          style={{ ...FM, fontSize: '0.78rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '5px 10px', color: '#F5F0E8', width: '88px', outline: 'none' }} />
      </div>
    </div>
  );
}

function StatusBanner({ type, message }) {
  if (!message) return null;
  const cfg = {
    error:   { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  color: '#FCA5A5', Icon: AlertTriangle },
    success: { bg: 'rgba(250,204,21,0.06)', border: 'rgba(250,204,21,0.25)', color: GOLD,      Icon: CheckCircle2 },
  };
  const { bg, border, color, Icon } = cfg[type] || cfg.success;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: bg, border: `1px solid ${border}` }}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color }} />
      <p style={{ ...FB, fontSize: '0.78rem', color, lineHeight: '1.55' }}>{message}</p>
    </div>
  );
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function hexToRgb(hex) {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c.padEnd(6, '0');
  const n = parseInt(full, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/* ─── 1. CSS Glassmorphism Generator ─────────────────────────────────────────── */
function GlassmorphismGenerator() {
  const [blur, setBlur]             = useState(12);
  const [saturation, setSaturation] = useState(180);
  const [opacity, setOpacity]       = useState(0.15);
  const [radius, setRadius]         = useState(16);
  const [borderOp, setBorderOp]     = useState(0.2);
  const [tint, setTint]             = useState('#ffffff');

  const [r, g, b] = hexToRgb(tint);
  const bgColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;

  const css = `/* Glassmorphism */
.glass {
  backdrop-filter: blur(${blur}px) saturate(${saturation}%);
  -webkit-backdrop-filter: blur(${blur}px) saturate(${saturation}%);
  background-color: rgba(${r}, ${g}, ${b}, ${opacity});
  border-radius: ${radius}px;
  border: 1px solid rgba(255, 255, 255, ${borderOp});
}`;

  return (
    <ToolPanel title="CSS Glassmorphism Generator" icon={Layers} code="css.glass()" chips={['backdrop-filter','rgba','border','live preview']}>
      <div className="mt-4 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <SliderRow label="Blur"             value={blur}      min={0}  max={40}  onChange={setBlur}        unit="px" />
            <SliderRow label="Saturation"       value={saturation} min={100} max={250} onChange={setSaturation}  unit="%" />
            <SliderRow label="Opacity"          value={opacity}   min={0}  max={1}   step={0.01} onChange={setOpacity} />
            <SliderRow label="Border Radius"    value={radius}    min={0}  max={48}  onChange={setRadius}      unit="px" />
            <SliderRow label="Border Opacity"   value={borderOp}  min={0}  max={1}   step={0.05} onChange={setBorderOp} />
            <ColorRow  label="Tint Colour"      value={tint}      onChange={setTint} />
          </div>
          <div className="flex flex-col gap-2">
            <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live Preview</span>
            <div className="flex-1 min-h-[180px] rounded-xl overflow-hidden relative flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 30%,#ec4899 65%,#f97316 100%)' }}>
              <div style={{
                backdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
                WebkitBackdropFilter: `blur(${blur}px) saturate(${saturation}%)`,
                backgroundColor: bgColor,
                borderRadius: `${radius}px`,
                border: `1px solid rgba(255,255,255,${borderOp})`,
                padding: '20px 28px',
                textAlign: 'center',
                minWidth: '140px',
              }}>
                <p style={{ ...FB, fontSize: '0.9rem', color: '#fff', fontWeight: 600, marginBottom: '4px' }}>Glass Card</p>
                <p style={{ ...FM, fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)' }}>blur({blur}px) / {Math.round(opacity * 100)}% opacity</p>
              </div>
            </div>
          </div>
        </div>
        <CopyBlock value={css} label="Generated CSS" rows={9} />
      </div>
    </ToolPanel>
  );
}

/* ─── 2. SVG Path Optimizer ──────────────────────────────────────────────────── */
function optimizeSVG(raw, opts) {
  let svg = raw;
  if (opts.removeXmlDecl)    svg = svg.replace(/<\?xml[^?]*\?>\s*/gi, '');
  if (opts.removeComments)   svg = svg.replace(/<!--[\s\S]*?-->/g, '');
  if (opts.removeMeta)       svg = svg.replace(/<metadata[\s\S]*?<\/metadata>\s*/gi, '');
  if (opts.removeTitle)      svg = svg.replace(/<title[\s\S]*?<\/title>\s*/gi, '');
  if (opts.removeDesc)       svg = svg.replace(/<desc[\s\S]*?<\/desc>\s*/gi, '');
  if (opts.removeEmptyGroups) svg = svg.replace(/<g[^>]*>\s*<\/g>\s*/g, '');
  if (opts.precision < 6) {
    svg = svg.replace(/\d+\.\d{2,}/g, n => parseFloat(parseFloat(n).toFixed(opts.precision)).toString());
  }
  svg = svg.replace(/[ \t]+/g, ' ').replace(/>\s+</g, '><').trim();
  return svg;
}

function SVGOptimizer() {
  const [input, setInput]   = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState(null);
  const [opts, setOpts]     = useState({
    removeXmlDecl: true, removeComments: true, removeMeta: true,
    removeTitle: true, removeDesc: false, removeEmptyGroups: true, precision: 2,
  });

  const toggle = k => setOpts(o => ({ ...o, [k]: !o[k] }));

  const run = () => {
    if (!input.trim()) { setStatus({ type: 'error', message: 'Paste an SVG first.' }); return; }
    try {
      const result = optimizeSVG(input.trim(), opts);
      setOutput(result);
      const pct = ((1 - result.length / input.trim().length) * 100).toFixed(1);
      setStatus({ type: 'success', message: `✓ Optimized — ${input.trim().length.toLocaleString()} → ${result.length.toLocaleString()} chars (${pct}% smaller)` });
    } catch (e) {
      setStatus({ type: 'error', message: e.message }); setOutput('');
    }
  };

  const CheckBox = ({ k, label }) => (
    <label className="flex items-center gap-2 cursor-pointer select-none" onClick={() => toggle(k)}>
      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
        style={{ background: opts[k] ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${opts[k] ? GOLD : 'rgba(255,255,255,0.12)'}` }}>
        {opts[k] && <Check className="w-2.5 h-2.5" style={{ color: GOLD }} />}
      </div>
      <span style={{ ...FM, fontSize: '0.72rem', color: 'rgba(200,190,170,0.6)' }}>{label}</span>
    </label>
  );

  return (
    <ToolPanel title="SVG Path Optimizer" icon={Minimize2} code="svg.optimize()" chips={['Metadata removal','Decimal precision','Whitespace collapse']}>
      <div className="mt-4 space-y-4">
        <div className="flex flex-col gap-1.5">
          <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Input SVG</span>
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={6}
            placeholder={'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">\n  <!-- icon -->\n  <metadata>Adobe Illustrator</metadata>\n  <path d="M 12.00000 2.00000 L 20.49000 17.00000 L 3.51000 17.00000 Z"/>\n</svg>'}
            spellCheck={false} className="w-full resize-y rounded-xl px-4 py-3 outline-none"
            style={{ ...FM, fontSize: '0.78rem', lineHeight: '1.6', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#F5F0E8', caretColor: GOLD }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4">
          <CheckBox k="removeXmlDecl"    label="XML declaration" />
          <CheckBox k="removeComments"   label="Comments" />
          <CheckBox k="removeMeta"       label="<metadata>" />
          <CheckBox k="removeTitle"      label="<title>" />
          <CheckBox k="removeDesc"       label="<desc>" />
          <CheckBox k="removeEmptyGroups" label="Empty <g>" />
        </div>
        <SliderRow label="Decimal precision" value={opts.precision} min={0} max={6}
          onChange={v => setOpts(o => ({ ...o, precision: v }))} unit=" dp" />
        <button onClick={run} disabled={!input.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg,#FACC15,#F97316)', ...FB }}>
          <Zap className="w-4 h-4" /> Optimize SVG
        </button>
        {status && <StatusBanner type={status.type} message={status.message} />}
        {output && <CopyBlock value={output} label="Optimized SVG" rows={6} />}
      </div>
    </ToolPanel>
  );
}

/* ─── 3. Flexbox / Grid Playground ──────────────────────────────────────────── */
const ITEM_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#10b981','#06b6d4','#f59e0b','#ef4444'];

const FLEX_OPTIONS = {
  flexDirection:  ['row','row-reverse','column','column-reverse'],
  flexWrap:       ['nowrap','wrap','wrap-reverse'],
  justifyContent: ['flex-start','flex-end','center','space-between','space-around','space-evenly'],
  alignItems:     ['flex-start','flex-end','center','stretch','baseline'],
  alignContent:   ['flex-start','flex-end','center','space-between','space-around','stretch'],
};

const GRID_OPTIONS = {
  justifyItems: ['start','end','center','stretch'],
  alignItems:   ['start','end','center','stretch'],
};

function Pill({ value, active, onClick }) {
  return (
    <button onClick={onClick} className="px-2 py-0.5 rounded text-[10px] transition-all"
      style={{ ...FM, background: active ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.08)'}`, color: active ? GOLD : 'rgba(200,190,170,0.5)' }}>
      {value}
    </button>
  );
}

function PillGroup({ label, options, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <div className="flex flex-wrap gap-1">{options.map(o => <Pill key={o} value={o} active={value === o} onClick={() => onChange(o)} />)}</div>
    </div>
  );
}

function FlexGridPlayground() {
  const [mode, setMode] = useState('flex');
  const [items, setItems] = useState(4);
  const [fd, setFd] = useState('row');
  const [fw, setFw] = useState('nowrap');
  const [jc, setJc] = useState('flex-start');
  const [ai, setAi] = useState('stretch');
  const [ac, setAc] = useState('flex-start');
  const [gap, setGap] = useState(8);
  const [gcols, setGcols] = useState(3);
  const [ggap, setGgap] = useState(8);
  const [gji, setGji] = useState('stretch');
  const [gai, setGai] = useState('stretch');

  const containerStyle = mode === 'flex'
    ? { display: 'flex', flexDirection: fd, flexWrap: fw, justifyContent: jc, alignItems: ai, alignContent: ac, gap: `${gap}px` }
    : { display: 'grid', gridTemplateColumns: `repeat(${gcols}, 1fr)`, gap: `${ggap}px`, justifyItems: gji, alignItems: gai };

  const css = mode === 'flex'
    ? `.container {\n  display: flex;\n  flex-direction: ${fd};\n  flex-wrap: ${fw};\n  justify-content: ${jc};\n  align-items: ${ai};\n  align-content: ${ac};\n  gap: ${gap}px;\n}`
    : `.container {\n  display: grid;\n  grid-template-columns: repeat(${gcols}, 1fr);\n  gap: ${ggap}px;\n  justify-items: ${gji};\n  align-items: ${gai};\n}`;

  return (
    <ToolPanel title="Flexbox / Grid Playground" icon={LayoutGrid} code="css.layout()" chips={['Interactive','Visual preview','Flexbox','CSS Grid']}>
      <div className="mt-4 space-y-5">
        {/* Mode + item count */}
        <div className="flex items-center gap-3 flex-wrap">
          {['flex', 'grid'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ ...FB, background: mode === m ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${mode === m ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.1)'}`, color: mode === m ? GOLD : 'rgba(200,190,170,0.5)' }}>
              {m.toUpperCase()}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-auto">
            <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.4)' }}>items</span>
            <button onClick={() => setItems(i => Math.max(1, i - 1))} className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F0E8' }}><Minus className="w-3 h-3" /></button>
            <span style={{ ...FM, fontSize: '0.82rem', color: GOLD, minWidth: '18px', textAlign: 'center' }}>{items}</span>
            <button onClick={() => setItems(i => Math.min(8, i + 1))} className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#F5F0E8' }}><Plus className="w-3 h-3" /></button>
          </div>
        </div>

        {/* Controls */}
        {mode === 'flex' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PillGroup label="flex-direction"  options={FLEX_OPTIONS.flexDirection}  value={fd}  onChange={setFd} />
            <PillGroup label="flex-wrap"       options={FLEX_OPTIONS.flexWrap}       value={fw}  onChange={setFw} />
            <PillGroup label="justify-content" options={FLEX_OPTIONS.justifyContent} value={jc}  onChange={setJc} />
            <PillGroup label="align-items"     options={FLEX_OPTIONS.alignItems}     value={ai}  onChange={setAi} />
            <PillGroup label="align-content"   options={FLEX_OPTIONS.alignContent}   value={ac}  onChange={setAc} />
            <SliderRow label="gap" value={gap} min={0} max={32} onChange={setGap} unit="px" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SliderRow label="columns" value={gcols} min={1} max={6} onChange={setGcols} />
            <SliderRow label="gap"     value={ggap}  min={0} max={32} onChange={setGgap} unit="px" />
            <PillGroup label="justify-items" options={GRID_OPTIONS.justifyItems} value={gji} onChange={setGji} />
            <PillGroup label="align-items"   options={GRID_OPTIONS.alignItems}   value={gai} onChange={setGai} />
          </div>
        )}

        {/* Preview */}
        <div>
          <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live Preview</span>
          <div className="mt-2 rounded-xl p-3 overflow-auto"
            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', minHeight: '100px', maxHeight: '220px' }}>
            <div style={{ ...containerStyle, minHeight: '76px' }}>
              {Array.from({ length: items }, (_, i) => (
                <div key={i} style={{ width: '44px', height: '44px', borderRadius: '8px', background: ITEM_COLORS[i % ITEM_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(0,0,0,0.75)', flexShrink: 0 }}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
        <CopyBlock value={css} label="Generated CSS" rows={mode === 'flex' ? 9 : 7} />
      </div>
    </ToolPanel>
  );
}

/* ─── 4. Hex → RGBA / HSLA Converter ─────────────────────────────────────────── */
function isValidHex(h) { return /^#[0-9a-fA-F]{6}$/.test(h) || /^#[0-9a-fA-F]{3}$/.test(h); }

function HexToColor() {
  const [hex, setHex]     = useState('#6366f1');
  const [alpha, setAlpha] = useState(1);

  const valid = isValidHex(hex);
  const [r, g, b]   = valid ? hexToRgb(hex) : [99, 102, 241];
  const [hh, hs, hl] = rgbToHsl(r, g, b);

  const output = `/* Color conversions: ${hex} */

/* Direct values */
rgba(${r}, ${g}, ${b}, ${alpha})
hsla(${hh}, ${hs}%, ${hl}%, ${alpha})

/* CSS Custom Properties */
--color-base:  ${hex};
--color-rgb:   ${r}, ${g}, ${b};
--color-rgba:  rgba(${r}, ${g}, ${b}, ${alpha});
--color-hsl:   ${hh}deg ${hs}% ${hl}%;
--color-hsla:  hsla(${hh}, ${hs}%, ${hl}%, ${alpha});

/* Usage with opacity */
background-color: rgba(var(--color-rgb), 0.1);`;

  return (
    <ToolPanel title="Hex → RGBA / HSLA Converter" icon={Hash} code="color.convert()" chips={['RGBA','HSLA','CSS variables','Alpha channel']}>
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hex Input</span>
              <div className="flex items-center gap-2">
                <input type="color" value={valid ? hex : '#6366f1'} onChange={e => setHex(e.target.value)}
                  style={{ width: '34px', height: '30px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', padding: '2px', background: 'none', flexShrink: 0 }} />
                <input type="text" value={hex} maxLength={9} onChange={e => setHex(e.target.value)} placeholder="#6366f1"
                  style={{ ...FM, fontSize: '0.85rem', background: 'rgba(255,255,255,0.04)', border: `1px solid ${valid ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.45)'}`, borderRadius: '8px', padding: '6px 12px', color: '#F5F0E8', outline: 'none', flex: 1 }} />
              </div>
            </div>
            <SliderRow label="Alpha" value={alpha} min={0} max={1} step={0.01} onChange={setAlpha} />
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[['R', r, '#ef4444'], ['G', g, '#22c55e'], ['B', b, '#3b82f6']].map(([ch, val, col]) => (
                <div key={ch} className="rounded-lg p-2 text-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ ...FM, fontSize: '0.6rem', color: col, marginBottom: '2px' }}>{ch}</p>
                  <p style={{ ...FM, fontSize: '0.85rem', color: '#F5F0E8' }}>{val}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Colour Swatch</span>
            <div className="flex-1 min-h-[120px] rounded-xl overflow-hidden flex flex-col">
              <div className="flex-1" style={{ backgroundColor: valid ? hex : '#6366f1' }} />
              <div className="flex-1" style={{ backgroundColor: `rgba(${r},${g},${b},${alpha})`, backgroundImage: alpha < 1 ? 'linear-gradient(45deg,#555 25%,transparent 25%),linear-gradient(-45deg,#555 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#555 75%),linear-gradient(-45deg,transparent 75%,#555 75%)' : 'none', backgroundSize: '10px 10px', backgroundPosition: '0 0,0 5px,5px -5px,-5px 0px' }} />
            </div>
            <div className="flex justify-between">
              <span style={{ ...FM, fontSize: '0.6rem', color: 'rgba(200,190,170,0.35)' }}>Solid</span>
              <span style={{ ...FM, fontSize: '0.6rem', color: 'rgba(200,190,170,0.35)' }}>With alpha ({alpha})</span>
            </div>
          </div>
        </div>
        {!valid && hex.length > 1 && <StatusBanner type="error" message="Invalid hex — use #RGB or #RRGGBB format." />}
        <CopyBlock value={output} label="Output Values" rows={12} />
      </div>
    </ToolPanel>
  );
}

/* ─── 5. Custom Scrollbar Generator ─────────────────────────────────────────── */
const SB_SCOPE = 'fluxkit-sb-preview';

function ScrollbarGenerator() {
  const [width,       setWidth]       = useState(8);
  const [trackColor,  setTrackColor]  = useState('#111827');
  const [trackRadius, setTrackRadius] = useState(4);
  const [thumbColor,  setThumbColor]  = useState('#FACC15');
  const [thumbHover,  setThumbHover]  = useState('#f59e0b');
  const [thumbRadius, setThumbRadius] = useState(4);
  const styleRef = useRef(null);

  const scopedCss = `.${SB_SCOPE}::-webkit-scrollbar{width:${width}px;height:${width}px}` +
    `.${SB_SCOPE}::-webkit-scrollbar-track{background:${trackColor};border-radius:${trackRadius}px}` +
    `.${SB_SCOPE}::-webkit-scrollbar-thumb{background:${thumbColor};border-radius:${thumbRadius}px}` +
    `.${SB_SCOPE}::-webkit-scrollbar-thumb:hover{background:${thumbHover}}`;

  const outputCss = `::-webkit-scrollbar {
  width: ${width}px;
  height: ${width}px;
}
::-webkit-scrollbar-track {
  background: ${trackColor};
  border-radius: ${trackRadius}px;
}
::-webkit-scrollbar-thumb {
  background: ${thumbColor};
  border-radius: ${thumbRadius}px;
}
::-webkit-scrollbar-thumb:hover {
  background: ${thumbHover};
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: ${thumbColor} ${trackColor};
}`;

  useEffect(() => {
    const el = document.createElement('style');
    document.head.appendChild(el);
    styleRef.current = el;
    return () => { if (styleRef.current) document.head.removeChild(styleRef.current); };
  }, []);

  useEffect(() => {
    if (styleRef.current) styleRef.current.textContent = scopedCss;
  }, [scopedCss]);

  return (
    <ToolPanel title="Custom Scrollbar Generator" icon={SlidersHorizontal} code="css.scrollbar()" chips={['-webkit-scrollbar','Firefox fallback','Live preview']}>
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <SliderRow label="Scrollbar width"  value={width}       min={4}  max={24} onChange={setWidth}       unit="px" />
            <SliderRow label="Track radius"     value={trackRadius} min={0}  max={12} onChange={setTrackRadius} unit="px" />
            <SliderRow label="Thumb radius"     value={thumbRadius} min={0}  max={12} onChange={setThumbRadius} unit="px" />
            <ColorRow  label="Track colour"     value={trackColor}  onChange={setTrackColor} />
            <ColorRow  label="Thumb colour"     value={thumbColor}  onChange={setThumbColor} />
            <ColorRow  label="Thumb hover"      value={thumbHover}  onChange={setThumbHover} />
          </div>
          <div className="flex flex-col gap-2">
            <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Live Preview</span>
            <div className={`${SB_SCOPE} flex-1 rounded-xl p-3 overflow-y-auto`}
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '170px' }}>
              {Array.from({ length: 14 }, (_, i) => (
                <div key={i} className="py-1.5 px-3 rounded mb-1.5"
                  style={{ background: 'rgba(250,204,21,0.04)', borderLeft: `2px solid rgba(250,204,21,0.2)` }}>
                  <span style={{ ...FM, fontSize: '0.7rem', color: 'rgba(200,190,170,0.5)' }}>Scroll item {i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <CopyBlock value={outputCss} label="Generated CSS" rows={11} />
      </div>
    </ToolPanel>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
// ── 6. Advanced Palette Generator ────────────────────────────────────────────

const HARMONY_MODES = [
  { id: 'mono',        label: 'Monochromatic' },
  { id: 'complementary', label: 'Complementary' },
  { id: 'triadic',     label: 'Triadic'       },
  { id: 'split',       label: 'Split-Comp'    },
  { id: 'analogous',   label: 'Analogous'     },
  { id: 'tetradic',    label: 'Tetradic'      },
];

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  let h = 0, s = 0, l = (max+min)/2;
  if (d !== 0) {
    s = d / (1 - Math.abs(2*l - 1));
    if (max === r) h = ((g-b)/d + 6) % 6;
    else if (max === g) h = (b-r)/d + 2;
    else h = (r-g)/d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s*100), l: Math.round(l*100) };
}

function generatePalette(baseHex, mode) {
  const { h, s, l } = hexToHsl(baseHex);
  switch (mode) {
    case 'mono': return [0,-15,-30,+15,+30].map(dl => hslToHex(h, s, Math.max(5, Math.min(95, l+dl)))).filter((v,i,a) => a.indexOf(v) === i);
    case 'complementary': return [hslToHex(h,s,l), hslToHex(h,s,Math.min(90,l+20)), hslToHex((h+180)%360,s,l), hslToHex((h+180)%360,s,Math.min(90,l+20)), hslToHex(h,Math.max(10,s-20),Math.min(90,l+35))];
    case 'triadic':   return [0,120,240].flatMap(offset => [hslToHex((h+offset)%360,s,l), hslToHex((h+offset)%360,s,Math.min(90,l+20))]).slice(0,5);
    case 'split':     return [hslToHex(h,s,l), hslToHex((h+150)%360,s,l), hslToHex((h+210)%360,s,l), hslToHex(h,s,Math.min(90,l+25)), hslToHex(h,Math.max(10,s-15),Math.max(10,l-20))];
    case 'analogous': return [-40,-20,0,20,40].map(dh => hslToHex((h+dh+360)%360,s,l));
    case 'tetradic':  return [0,90,180,270].map(dh => hslToHex((h+dh)%360,s,l)).concat([hslToHex(h,s,Math.min(90,l+25))]);
    default: return [baseHex];
  }
}

function PaletteGenerator() {
  const [baseColor, setBaseColor] = useState('#6366f1');
  const [mode, setMode] = useState('complementary');
  const [copiedIdx, setCopiedIdx] = useState(null);
  const palette = generatePalette(baseColor, mode);

  const copyColor = (hex, idx) => {
    navigator.clipboard.writeText(hex);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1400);
  };

  const allCss = `/* ${HARMONY_MODES.find(m=>m.id===mode)?.label} palette */\n${palette.map((c,i)=>`--color-${i+1}: ${c};`).join('\n')}`;
  const [copiedAll, copyAll] = useCopy();

  return (
    <ToolPanel title="Advanced Palette Generator" icon={RefreshCw} code="palette.gen()" chips={['Monochromatic', 'Complementary', 'Triadic', 'Analogous', 'Tetradic', 'Split-Comp']}>
      <div className="space-y-5 mt-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <label style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Base</label>
            <input type="color" value={baseColor} onChange={e => setBaseColor(e.target.value)}
              className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent" />
            <span style={{ ...FM, fontSize: '0.78rem', color: GOLD }}>{baseColor.toUpperCase()}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {HARMONY_MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: mode === m.id ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${mode === m.id ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.08)'}`, color: mode === m.id ? GOLD : 'rgba(200,190,170,0.6)', ...FB }}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {palette.map((hex, i) => (
            <button key={i} onClick={() => copyColor(hex, i)} title={hex}
              className="flex-1 rounded-xl transition-transform hover:scale-105 active:scale-95 relative group"
              style={{ height: 72, background: hex, border: '2px solid rgba(255,255,255,0.08)' }}>
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-black/60 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity text-white">
                {copiedIdx === i ? 'Copied!' : hex.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={() => copyAll(allCss)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.2)', color: copiedAll ? GOLD : 'rgba(200,190,170,0.5)', ...FM }}>
            {copiedAll ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copiedAll ? 'Copied CSS!' : 'Copy as CSS vars'}
          </button>
          <span style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.4)' }}>{palette.length} colours · click swatch to copy</span>
        </div>
      </div>
    </ToolPanel>
  );
}

// ── 6b. Color Palette Generator (comprehensive) ─────────────────────────────

function rotateHue(h, deg) { return ((h + deg) % 360 + 360) % 360; }

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function genAnalogous(h, s, l) {
  return [-60, -30, 0, 30, 60].map(dh => hslToHex(rotateHue(h, dh), s, l));
}
function genComplementary(h, s, l) {
  return [hslToHex(h, s, l), hslToHex(rotateHue(h, 180), s, l)];
}
function genSplitComplementary(h, s, l) {
  return [hslToHex(h, s, l), hslToHex(rotateHue(h, 150), s, l), hslToHex(rotateHue(h, 210), s, l)];
}
function genTriadic(h, s, l) {
  return [0, 120, 240].map(dh => hslToHex(rotateHue(h, dh), s, l));
}
function genTetradic(h, s, l) {
  return [0, 90, 180, 270].map(dh => hslToHex(rotateHue(h, dh), s, l));
}
function genMonochromatic(h, s, l) {
  const steps = [-32, -16, 0, 16, 32];
  return steps.map(dl => hslToHex(h, s, clamp(l + dl, 8, 92)));
}
function genTints(h, s, l) {
  // 5 progressively lighter shades
  return [0, 1, 2, 3, 4].map(i => hslToHex(h, s, clamp(l + (i + 1) * (100 - l) / 6, 0, 96)));
}
function genShades(h, s, l) {
  return [0, 1, 2, 3, 4].map(i => hslToHex(h, s, clamp(l - (i + 1) * l / 6, 4, 100)));
}

function randomHex() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

const PALETTE_GROUPS = [
  { id: 'analogous',     label: 'Analogous',         gen: genAnalogous },
  { id: 'complementary', label: 'Complementary',     gen: genComplementary },
  { id: 'split',         label: 'Split-Complementary', gen: genSplitComplementary },
  { id: 'triadic',       label: 'Triadic',           gen: genTriadic },
  { id: 'tetradic',      label: 'Tetradic',          gen: genTetradic },
  { id: 'mono',          label: 'Monochromatic',     gen: genMonochromatic },
  { id: 'tints',         label: 'Tints',             gen: genTints },
  { id: 'shades',        label: 'Shades',            gen: genShades },
];

function Swatch({ hex, onCopy, copied }) {
  const blackRatio = contrastRatio(hex, '#000000');
  const whiteRatio = contrastRatio(hex, '#FFFFFF');
  const blackOk = blackRatio >= 4.5;
  const whiteOk = whiteRatio >= 4.5;
  const blackAaa = blackRatio >= 7;
  const whiteAaa = whiteRatio >= 7;

  return (
    <button onClick={() => onCopy(hex)}
      className="relative group flex-1 min-w-[68px] rounded-lg overflow-hidden transition-all hover:scale-[1.04] active:scale-95"
      style={{ height: 72, background: hex, border: '1px solid rgba(255,255,255,0.06)' }}
      title={`${hex.toUpperCase()} — click to copy`}>
      {/* Contrast badges */}
      <div className="absolute top-1 left-1 right-1 flex justify-between items-start text-[8px] font-bold pointer-events-none">
        <span className="px-1 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: blackAaa ? '#22c55e' : blackOk ? '#facc15' : '#ef4444' }}>
          {blackAaa ? 'AAA' : blackOk ? 'AA' : '✗'}
        </span>
        <span className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.85)', color: whiteAaa ? '#15803d' : whiteOk ? '#b45309' : '#b91c1c' }}>
          {whiteAaa ? 'AAA' : whiteOk ? 'AA' : '✗'}
        </span>
      </div>
      {/* Hex label */}
      <div className="absolute inset-x-0 bottom-0 px-1 py-1 text-center"
        style={{ background: 'rgba(0,0,0,0.65)' }}>
        <span style={{ ...FM, fontSize: '0.6rem', color: copied ? GOLD : '#F5F0E8' }}>
          {copied ? '✓ Copied' : hex.toUpperCase()}
        </span>
      </div>
    </button>
  );
}

function ColorPaletteGenerator() {
  const [base, setBase]     = useState('#6366f1');
  const [copied, setCopied] = useState(null);
  const [exportCopied, setExportCopied] = useState(null);

  const valid = isValidHex(base);
  const { h, s, l } = valid ? hexToHsl(base) : { h: 240, s: 70, l: 60 };

  const palettes = PALETTE_GROUPS.map(g => ({ ...g, colors: g.gen(h, s, l) }));

  const copyHex = (hex) => {
    navigator.clipboard.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(null), 1400);
  };

  const buildTailwindConfig = () => {
    const lines = ['// tailwind.config.js — palette excerpt', 'module.exports = {', '  theme: {', '    extend: {', '      colors: {'];
    palettes.forEach(p => {
      lines.push(`        ${p.id}: {`);
      p.colors.forEach((c, i) => lines.push(`          ${(i + 1) * 100}: '${c}',`));
      lines.push('        },');
    });
    lines.push('      },', '    },', '  },', '};');
    return lines.join('\n');
  };

  const buildCssVars = () => {
    const lines = ['/* CSS variables — generated palette */', ':root {'];
    palettes.forEach(p => {
      p.colors.forEach((c, i) => lines.push(`  --${p.id}-${(i + 1) * 100}: ${c};`));
    });
    lines.push('}');
    return lines.join('\n');
  };

  const buildJson = () => {
    const obj = { base: base.toUpperCase() };
    palettes.forEach(p => { obj[p.id] = p.colors.map(c => c.toUpperCase()); });
    return JSON.stringify(obj, null, 2);
  };

  const exportTo = (key, builder) => {
    navigator.clipboard.writeText(builder());
    setExportCopied(key);
    setTimeout(() => setExportCopied(null), 1600);
  };

  return (
    <ToolPanel title="Color Palette Generator" icon={Palette} code="palette.harmony()" chips={['8 harmony types', 'WCAG badges', 'Tailwind', 'CSS vars', 'JSON']}>
      <div className="space-y-5 mt-3">
        {/* Input row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input type="color" value={valid ? base : '#6366f1'}
              onChange={e => setBase(e.target.value)}
              style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', padding: 2, background: 'none' }} />
            <input type="text" value={base} maxLength={7}
              onChange={e => setBase(e.target.value)}
              placeholder="#6366f1"
              style={{ ...FM, fontSize: '0.85rem', background: 'rgba(255,255,255,0.04)', border: `1px solid ${valid ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.45)'}`, borderRadius: 8, padding: '7px 12px', color: '#F5F0E8', outline: 'none', width: 110 }} />
          </div>
          <button onClick={() => setBase(randomHex())}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all"
            style={{ ...FB, background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)', color: GOLD }}>
            <RefreshCw className="w-3 h-3" /> Random
          </button>
          {valid && (
            <div className="flex items-center gap-3 ml-auto" style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.5)' }}>
              <span>H {h}°</span><span>S {s}%</span><span>L {l}%</span>
            </div>
          )}
        </div>

        {!valid && base.length > 1 && (
          <StatusBanner type="error" message="Invalid hex — use #RRGGBB format." />
        )}

        {/* Palette rows */}
        <div className="space-y-3">
          {palettes.map(p => (
            <div key={p.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {p.label}
                </span>
                <span style={{ ...FM, fontSize: '0.6rem', color: 'rgba(200,190,170,0.35)' }}>{p.colors.length} colors</span>
              </div>
              <div className="flex gap-1.5">
                {p.colors.map((hex, i) => (
                  <Swatch key={p.id + '-' + i} hex={hex} onCopy={copyHex} copied={copied === hex} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Export buttons */}
        <div className="pt-2 border-t" style={{ borderColor: 'rgba(250,204,21,0.08)' }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Export</span>
            <span style={{ ...FM, fontSize: '0.6rem', color: 'rgba(200,190,170,0.4)' }}>copies to clipboard</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { key: 'tailwind', label: 'Tailwind config', builder: buildTailwindConfig },
              { key: 'css',      label: 'CSS variables',   builder: buildCssVars },
              { key: 'json',     label: 'JSON',            builder: buildJson },
            ].map(({ key, label, builder }) => {
              const isCopied = exportCopied === key;
              return (
                <button key={key} onClick={() => exportTo(key, builder)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs transition-all"
                  style={{ ...FB, background: isCopied ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isCopied ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.08)'}`, color: isCopied ? GOLD : 'rgba(200,190,170,0.7)' }}>
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Copied!' : label}
                </button>
              );
            })}
          </div>
        </div>

        <p style={{ ...FM, fontSize: '0.62rem', color: 'rgba(200,190,170,0.35)' }}>
          Click any swatch to copy its hex. Badges show WCAG contrast vs black (left) and white (right) — AA ≥ 4.5:1, AAA ≥ 7:1.
        </p>
      </div>
    </ToolPanel>
  );
}

// ── 7. Contrast Checker (A11y) ────────────────────────────────────────────────

function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const lin = v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
  return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1), l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1,l2), darker = Math.min(l1,l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function ContrastChecker() {
  const [fg, setFg] = useState('#ffffff');
  const [bg, setBg] = useState('#1e1b4b');
  const ratio = contrastRatio(fg, bg);
  const ratioStr = ratio.toFixed(2) + ':1';
  const aaLarge  = ratio >= 3;
  const aaNormal = ratio >= 4.5;
  const aaaLarge = ratio >= 4.5;
  const aaaNormal = ratio >= 7;

  const Badge = ({ pass, label }) => (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl"
      style={{ background: pass ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${pass ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
      <span style={{ ...FB, fontSize: '0.8rem', color: 'rgba(200,190,170,0.85)' }}>{label}</span>
      <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: pass ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: pass ? 'rgb(34,197,94)' : 'rgb(239,68,68)' }}>
        {pass ? '✓ Pass' : '✗ Fail'}
      </span>
    </div>
  );

  return (
    <ToolPanel title="Contrast Checker (A11y)" icon={CheckCircle2} code="a11y.contrast()" chips={['WCAG AA', 'WCAG AAA', 'Live ratio', 'Live preview']}>
      <div className="space-y-5 mt-3">
        <div className="grid grid-cols-2 gap-4">
          {[{label:'Foreground', val:fg, set:setFg},{label:'Background', val:bg, set:setBg}].map(({label,val,set}) => (
            <div key={label} className="space-y-2">
              <label style={{ ...FM, fontSize:'0.68rem', color:'rgba(200,190,170,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', display:'block' }}>{label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={val} onChange={e=>set(e.target.value)} className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent" />
                <input value={val} onChange={e=>{ if(/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) set(e.target.value); }}
                  className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ ...FM, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'#F5F0E8' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Live preview */}
        <div className="rounded-xl p-5 text-center space-y-1" style={{ background: bg, border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-2xl font-bold" style={{ color: fg }}>Sample Text</p>
          <p className="text-sm" style={{ color: fg }}>The quick brown fox jumps over the lazy dog.</p>
          <p className="text-xs opacity-75" style={{ color: fg }}>Small body text for readability testing.</p>
        </div>

        {/* Ratio badge */}
        <div className="flex items-center justify-center">
          <div className="text-center px-8 py-4 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-4xl font-display font-bold" style={{ color: aaNormal ? 'rgb(34,197,94)' : ratio >= 3 ? GOLD : 'rgb(239,68,68)' }}>
              {ratioStr}
            </div>
            <div style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)', marginTop: '4px' }}>CONTRAST RATIO</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Badge pass={aaNormal}  label="AA — Normal text (4.5:1)" />
          <Badge pass={aaLarge}   label="AA — Large text (3:1)" />
          <Badge pass={aaaNormal} label="AAA — Normal text (7:1)" />
          <Badge pass={aaaLarge}  label="AAA — Large text (4.5:1)" />
        </div>
      </div>
    </ToolPanel>
  );
}

// ── 8. Font Pairing Tool ──────────────────────────────────────────────────────

const FONT_PAIRS = [
  { display: 'Playfair Display', body: 'Lato',          style: 'Editorial', desc: 'Classic editorial — luxury magazines and long-form articles.' },
  { display: 'Oswald',           body: 'Merriweather',  style: 'Strong',    desc: 'Bold headlines with readable serif body. Great for news sites.' },
  { display: 'Raleway',          body: 'Open Sans',     style: 'Modern',    desc: 'Clean geometric display with friendly sans-serif body.' },
  { display: 'Abril Fatface',    body: 'Nunito',        style: 'Playful',   desc: 'High-contrast display with rounded, friendly body text.' },
  { display: 'Cormorant Garamond', body: 'Proza Libre', style: 'Refined',   desc: 'Elegant high-contrast serif for premium brand identity.' },
  { display: 'Bebas Neue',       body: 'Roboto',        style: 'Impact',    desc: 'Maximum-impact display with highly readable utility body.' },
  { display: 'Libre Baskerville',body: 'Source Sans Pro', style: 'Classic', desc: 'Traditional book typography meets clean screen sans.' },
  { display: 'DM Serif Display', body: 'DM Sans',       style: 'Unified',   desc: 'Matching type family — cohesive and versatile.' },
];

const STYLE_COLORS = { Editorial:'#f59e0b', Strong:'#ef4444', Modern:'#6366f1', Playful:'#ec4899', Refined:'#a78bfa', Impact:'#f97316', Classic:'#10b981', Unified:'#0ea5e9' };

function FontPairingTool() {
  const [active, setActive] = useState(0);
  const [sampleText, setSampleText] = useState('Design with intention.');
  const [bodyText, setBodyText] = useState('Typography shapes how readers experience your content. The right pairing creates harmony between hierarchy and readability — guiding the eye without effort.');
  const [filter, setFilter] = useState('All');
  const pair = FONT_PAIRS[active];
  const styles = ['All', ...new Set(FONT_PAIRS.map(p => p.style))];
  const filtered = FONT_PAIRS.map((p,i)=>({...p,idx:i})).filter(p => filter === 'All' || p.style === filter);
  const [copiedCss, setCopiedCss] = useState(false);
  const css = `@import url('https://fonts.googleapis.com/css2?family=${pair.display.replace(/ /g,'+')}:wght@700&family=${pair.body.replace(/ /g,'+')}&display=swap');\n\nh1, h2, h3 { font-family: '${pair.display}', serif; font-weight: 700; }\nbody, p    { font-family: '${pair.body}', sans-serif; }`;

  const loadGFont = (name) => {
    const id = `gfont-${name.replace(/ /g,'-')}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id; link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${name.replace(/ /g,'+')}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    }
  };

  useEffect(() => { loadGFont(pair.display); loadGFont(pair.body); }, [pair]);

  return (
    <ToolPanel title="Font Pairing Tool" icon={Type} code="fonts.pair()" chips={['8 curated pairs', 'Google Fonts', 'Live preview', 'CSS export']}>
      <div className="space-y-5 mt-3">
        {/* Style filter */}
        <div className="flex flex-wrap gap-2">
          {styles.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1 rounded-lg text-xs transition-all"
              style={{ background: filter===s ? 'rgba(250,204,21,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${filter===s ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.08)'}`, color: filter===s ? GOLD : 'rgba(200,190,170,0.6)', ...FB }}>
              {s}
            </button>
          ))}
        </div>

        {/* Pair grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map(({ display, body, style, desc, idx }) => {
            const color = STYLE_COLORS[style] || GOLD;
            return (
              <button key={idx} onClick={() => setActive(idx)}
                className="text-left p-3 rounded-xl transition-all"
                style={{ background: active===idx ? 'rgba(250,204,21,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active===idx ? 'rgba(250,204,21,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: color+'22', color }}>{style}</span>
                </div>
                <p className="text-sm font-semibold text-foreground/90">{display}</p>
                <p style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.5)' }}>+ {body}</p>
              </button>
            );
          })}
        </div>

        {/* Live preview */}
        <div className="rounded-2xl p-6 space-y-3" style={{ background: '#0d0d0d', border: '1px solid rgba(250,204,21,0.1)' }}>
          <input value={sampleText} onChange={e=>setSampleText(e.target.value)}
            className="w-full bg-transparent outline-none resize-none"
            style={{ fontFamily: `'${pair.display}', serif`, fontSize: 'clamp(1.6rem,4vw,2.5rem)', fontWeight: 700, color: '#F5F0E8', lineHeight: 1.1 }} />
          <textarea value={bodyText} onChange={e=>setBodyText(e.target.value)} rows={3}
            className="w-full bg-transparent outline-none resize-none"
            style={{ fontFamily: `'${pair.body}', sans-serif`, fontSize: '0.95rem', color: 'rgba(200,190,170,0.75)', lineHeight: 1.7 }} />
          <div style={{ ...FM, fontSize: '0.65rem', color: 'rgba(200,190,170,0.35)' }}>
            {pair.display} (display) · {pair.body} (body) — {pair.desc}
          </div>
        </div>

        {/* CSS export */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ ...FM, fontSize: '0.68rem', color: 'rgba(200,190,170,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CSS Import</span>
            <button onClick={() => { navigator.clipboard.writeText(css); setCopiedCss(true); setTimeout(()=>setCopiedCss(false),1600); }}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors"
              style={{ color: copiedCss ? GOLD : 'rgba(200,190,170,0.4)', background: copiedCss ? 'rgba(250,204,21,0.1)' : 'transparent' }}>
              {copiedCss ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedCss ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre className="rounded-xl p-4 text-xs overflow-x-auto whitespace-pre-wrap"
            style={{ ...FM, background: 'rgba(250,204,21,0.025)', border: '1px solid rgba(250,204,21,0.15)', color: 'rgba(250,204,21,0.85)' }}>
            {css}
          </pre>
        </div>
      </div>
    </ToolPanel>
  );
}

export default function WebDevAssets() {
  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: '#050505' }}>
      <style>{`
        textarea { color-scheme: dark; }
        textarea::placeholder { color: rgba(200,190,170,0.22) !important; }
        .fluxkit-range { -webkit-appearance: none; appearance: none; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; outline: none; }
        .fluxkit-range::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #FACC15; cursor: pointer; border: 2px solid rgba(0,0,0,0.4); }
        .fluxkit-range::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #FACC15; cursor: pointer; border: 2px solid rgba(0,0,0,0.4); }
      `}</style>

      <FluxBackdrop />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-20">

        {/* Breadcrumb */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 mb-10"
          style={{ ...FB, fontSize: '0.75rem', color: 'rgba(200,190,170,0.4)' }}>
          <Zap className="w-3 h-3" style={{ color: GOLD, fill: GOLD }} />
          <span style={{ color: GOLD }}>FluxKit</span>
          <ChevronRight className="w-3 h-3" />
          <span>Web Dev Assets</span>
        </motion.div>

        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm mb-8"
          style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)', ...FM, fontSize: '0.68rem', color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          <Palette className="w-3 h-3" />
          Web Development Assets
        </motion.div>

        {/* Headline */}
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          style={{ ...FH, fontSize: 'clamp(2.2rem,6vw,4.5rem)', lineHeight: 1.05, color: '#F5F0E8', marginBottom: '1rem' }}>
          <span style={{ color: GOLD }}>Design</span> with precision.<br />
          <span>Ship polished UI.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          style={{ ...FB, fontSize: '0.95rem', color: 'rgba(200,190,170,0.6)', lineHeight: '1.7', maxWidth: '520px', marginBottom: '1.75rem' }}>
          Five visual CSS tools plus three new design utilities — glassmorphism, SVG optimisation, flexbox/grid layouts, colour conversion, custom scrollbars, palette generator, A11y contrast checker, and font pairing. All live previews, zero uploads.
        </motion.p>

        {/* Divider */}
        <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }} className="flex items-center gap-4 mb-12" style={{ transformOrigin: 'left' }}>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,rgba(250,204,21,0.3),transparent)' }} />
          <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(250,204,21,0.35)' }}>9 live tools · click panel to expand/collapse</span>
          <div className="h-px w-16" style={{ background: 'rgba(250,204,21,0.1)' }} />
        </motion.div>

        {/* Tools */}
        <div className="space-y-4">
          {[GlassmorphismGenerator, SVGOptimizer, FlexGridPlayground, HexToColor, ScrollbarGenerator, PaletteGenerator, ColorPaletteGenerator, ContrastChecker, FontPairingTool].map((Tool, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}>
              <Tool />
            </motion.div>
          ))}
        </div>

        {/* Footer note */}
        <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ delay: 0.15 }} className="mt-12 text-center">
          <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl"
            style={{ background: 'rgba(250,204,21,0.04)', border: '1px solid rgba(250,204,21,0.13)' }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: 'rgba(250,204,21,0.45)' }} />
            <span style={{ ...FB, fontSize: '0.78rem', color: 'rgba(200,190,170,0.45)' }}>
              All FluxKit tools run 100% in-browser. No data is ever sent to a server.
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
