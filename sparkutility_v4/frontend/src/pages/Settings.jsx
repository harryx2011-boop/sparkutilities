import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Settings2, Shield, Zap, RotateCcw, ChevronDown,
  Eye, Server, Cpu, Battery, Trash2, Search,
  Keyboard, X, Check, Palette, BadgeCheck, Gem, Bell, BellOff, Volume2, VolumeX,
  Activity, Database, Download, Upload, Sparkles, AlertTriangle, Layers,
  PanelLeft, Pin, PinOff, RefreshCw, Wand2, Youtube, Music2, MonitorPlay,
  ShieldCheck, Wrench, Hash, Monitor, Type, Lock,
} from 'lucide-react';
import { ALL_PINNABLE_TOOLS } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useSettings } from '@/context/SettingsContext';
import { DEFAULT_SETTINGS } from '@/lib/settingsManager';
import { useTheme } from '@/context/ThemeContext';
import {
  isMuted, setMuted,
  pushSupported, pushPermission, isPushEnabled, setPushEnabled, ensurePushPermission,
} from '@/lib/notificationSound';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

function formatExpiry(min) {
  if (min < 60) return `${min} min`;
  if (min === 60) return '1 hour';
  if (min < 1440) return `${min / 60} hours`;
  return '24 hours';
}

function Toggle({ enabled, onToggle, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        enabled ? 'bg-primary' : 'bg-neutral-700'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      aria-pressed={enabled}
    >
      <span className={`absolute top-0.5 left-0 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SettingRow({ icon: Icon, label, description, control, accent = false }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border/30 last:border-0 ${accent ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="flex-shrink-0 sm:ml-4">{control}</div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, iconColor = 'text-primary', iconBg = 'bg-primary/10', children }) {
  return (
    <motion.div {...fadeUp(0.05)} className="glass-card rounded-2xl border border-border/40 overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-border/40 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <h2 className="text-base font-display font-bold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="px-5 sm:px-6 py-1">{children}</div>
    </motion.div>
  );
}

const PERSISTENCE_OPTIONS = [
  { value: 'session', label: 'Clear on Close' },
  { value: '24h',     label: '24 Hours'       },
  { value: 'always',  label: 'Always Remember' },
];

const THEME_OPTIONS = [
  { value: 'base',         label: 'Base',         desc: 'Dark glassmorphism, violet/cyan' },
  { value: 'cyber',        label: 'Cyber',         desc: 'Neon green terminal aesthetic'  },
  { value: 'retro-sunset', label: 'Retro Sunset',  desc: 'Orange/pink synthwave'          },
  { value: 'minimal',      label: 'Minimal',       desc: 'Clean white/light theme'        },
];

const KEYBIND_ACTIONS = [
  { key: 'sparkEngine',     label: 'Open SparkEngine',     desc: 'Ctrl/Cmd + this key',       modifier: true  },
  { key: 'convertFiles',    label: 'Convert Files',        desc: 'File Converter batch start', modifier: false },
  { key: 'deleteFile',      label: 'Delete Selected File', desc: 'File Converter',             modifier: false },
  { key: 'clearSelection',  label: 'Clear Selection',      desc: 'File Converter',             modifier: false },
  { key: 'playPause',       label: 'Play / Pause Audio',   desc: 'Audio Modifier',             modifier: false },
  { key: 'imageUndo',       label: 'Undo',                 desc: 'Image Editor — drawing-layer undo (default Cmd/Ctrl+Z)',          modifier: false, raw: true },
  { key: 'imageRedo',       label: 'Redo',                 desc: 'Image Editor — drawing-layer redo (default Cmd/Ctrl+Shift+Z)',    modifier: false, raw: true },
  { key: 'imageRedoAlt',    label: 'Redo (alt)',           desc: 'Image Editor — second binding for redo (default Cmd/Ctrl+Y)',     modifier: false, raw: true },
  { key: 'imageToolPen',    label: 'Pen Tool',             desc: 'Image Editor — switch to Pen',     modifier: false },
  { key: 'imageToolBrush',  label: 'Brush Tool',           desc: 'Image Editor — switch to Brush',   modifier: false },
  { key: 'imageToolEraser', label: 'Eraser Tool',          desc: 'Image Editor — switch to Eraser',  modifier: false },
  { key: 'previewerPlayPause', label: 'Play / Pause Video', desc: 'Content Previewer',                modifier: false },
];

function KeybindRow({ actionKey, label, desc, modifier, raw, value, onChange }) {
  const [listening, setListening] = useState(false);
  const ref = useRef(null);

  const startCapture = () => {
    setListening(true);
    setTimeout(() => ref.current?.focus(), 10);
  };

  const handleKeyDown = useCallback((e) => {
    e.preventDefault();
    if (e.key === 'Escape') { setListening(false); return; }
    // Skip pure modifier presses
    if (['Control','Meta','Alt','Shift'].includes(e.key)) return;

    // Chord capture (raw: true) — emit the modifier-aware syntax that
    // useKeyboardShortcuts understands: "Mod+z", "Mod+Shift+z", "Ctrl+y".
    // We use Mod as a cross-platform alias for Cmd-on-mac / Ctrl-elsewhere
    // so the saved binding doesn't lock the user into one platform.
    if (raw) {
      const parts = [];
      if (e.metaKey || e.ctrlKey) parts.push('Mod');
      if (e.altKey)               parts.push('Alt');
      if (e.shiftKey)             parts.push('Shift');
      const k = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toLowerCase() : e.key;
      parts.push(k);
      // Require at least one modifier on a chord row — otherwise we'd
      // be saving a plain key into a slot the parser still treats as raw.
      if (parts.length < 2) return;
      onChange(parts.join('+'));
      setListening(false);
      return;
    }

    // Plain capture path (existing behaviour)
    onChange(e.key === ' ' ? 'Space' : e.key);
    setListening(false);
  }, [onChange, raw]);

  const displayKey = value === ' ' ? 'Space' : value;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border/30 last:border-0">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Keyboard className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}{modifier ? ' — uses Ctrl/Cmd modifier' : ''}</p>
        </div>
      </div>
      <div className="flex-shrink-0 sm:ml-4 flex items-center gap-2">
        {listening ? (
          <div className="flex items-center gap-2">
            <input
              ref={ref}
              type="text"
              readOnly
              onKeyDown={handleKeyDown}
              onBlur={() => setListening(false)}
              className="w-44 text-center text-xs px-3 py-2 rounded-lg border border-primary/60 bg-primary/5 text-primary outline-none animate-pulse"
              placeholder={raw ? 'Press Cmd/Ctrl + key…' : 'Press a key…'}
            />
            <button onClick={() => setListening(false)} className="p-1.5 rounded-lg hover:bg-neutral-800 text-muted-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={startCapture}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 hover:border-primary/40 transition-colors group"
          >
            {modifier && <kbd className="text-[10px] font-mono text-muted-foreground">Ctrl/⌘ +</kbd>}
            <kbd className="px-2 py-1 rounded bg-neutral-800 border border-border/60 text-xs font-mono text-foreground group-hover:border-primary/40 transition-colors">
              {displayKey}
            </kbd>
            <span className="text-[10px] text-muted-foreground/50">click to remap</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Drives both the sticky sidebar (desktop) and the scrollable tab strip
// (mobile). `id` matches the corresponding section element id for anchor
// scroll + IntersectionObserver-based active highlighting.
const SECTIONS = [
  { id: 'status',        Icon: Activity,  title: 'System Status',     subtitle: 'Live runtime + capabilities' },
  { id: 'privacy',       Icon: Shield,    title: 'Privacy & Security',subtitle: 'Data handling + secure links' },
  { id: 'notifications', Icon: Bell,      title: 'Notifications',     subtitle: 'Sounds + desktop alerts' },
  { id: 'performance',   Icon: Zap,       title: 'Performance',       subtitle: 'Hardware + memory tuning' },
  { id: 'keybinds',      Icon: Keyboard,  title: 'Keyboard',          subtitle: 'Custom hotkeys' },
  { id: 'theme',         Icon: Palette,   title: 'Theme & Display',   subtitle: 'Appearance + accessibility' },
  { id: 'sidebar',       Icon: PanelLeft, title: 'Sidebar',           subtitle: 'Pinned tools + visibility' },
  { id: 'data',          Icon: Database,  title: 'Data',              subtitle: 'Export, import, wipe' },
];

// Single source of truth for the System Status card. Each probe is cheap
// and side-effect-free; we run them once at component mount and surface the
// result in the read-only status card.
function probeWebGL() {
  if (typeof document === 'undefined') return { ok: false, version: '—' };
  try {
    const canvas = document.createElement('canvas');
    if (canvas.getContext('webgl2')) return { ok: true, version: 'WebGL2' };
    if (canvas.getContext('webgl'))  return { ok: true, version: 'WebGL1' };
    return { ok: false, version: '—' };
  } catch { return { ok: false, version: '—' }; }
}

// Targets every key with the canonical sparkutility_ prefix plus the legacy
// The exported JSON is a flat dump — re-importing it
// restores the full local profile on a fresh device.
const STORAGE_KEYS = [
  'sparkutility_admin_theme',          // legacy key retained as the base-theme store
  'sparkutility_user_mode',
  'sparkutility_tool_themes',
  'sparkutility_presets_v1',
  'sparkutility_settings_v1',
  'sparkutility_latex_history',
  'sparkutility_push_notifications',
  'sparkutility_history_v1',
  'sparkutility_url_preview_history',
];

function exportLocalData() {
  if (typeof localStorage === 'undefined') return null;
  const dump = {};
  for (const k of STORAGE_KEYS) {
    const v = localStorage.getItem(k);
    if (v != null) dump[k] = v;
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    keys: dump,
  };
}

function importLocalData(payload) {
  if (!payload || typeof payload !== 'object' || !payload.keys) {
    throw new Error('Invalid export — missing keys field');
  }
  let restored = 0;
  for (const [k, v] of Object.entries(payload.keys)) {
    if (!STORAGE_KEYS.includes(k)) continue; // allowlist
    if (typeof v !== 'string') continue;
    try { localStorage.setItem(k, v); restored++; } catch {}
  }
  return restored;
}

function clearLocalData() {
  if (typeof localStorage === 'undefined') return 0;
  let cleared = 0;
  for (const k of STORAGE_KEYS) {
    if (localStorage.getItem(k) != null) { localStorage.removeItem(k); cleared++; }
  }
  return cleared;
}

export default function Settings() {
  const { settings, updateSetting, resetSettings } = useSettings();
  const { customTheme, setCustomTheme } = useTheme();
  const [resetConfirm, setResetConfirm] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [activeSection, setActiveSection] = useState('status');
  const [importMsg, setImportMsg] = useState('');
  const importFileRef = useRef(null);

  // Notification toggles. The sound chime + browser push are stored in
  // localStorage (separate from the SettingsContext) because they're queried
  // synchronously from notificationSound.js's hot path on every conversion
  // finish — going through the React context would force a re-render storm.
  const [soundsMuted, setSoundsMuted]   = useState(() => isMuted());
  const [pushEnabled, setPushEnabledState] = useState(() => isPushEnabled());
  const [pushState, setPushState]       = useState(() => pushPermission());
  const handleSoundsToggle = () => {
    const next = !soundsMuted;
    setMuted(next);
    setSoundsMuted(next);
  };
  const handlePushToggle = async () => {
    if (pushEnabled) {
      setPushEnabled(false);
      setPushEnabledState(false);
      return;
    }
    // Off → On: needs permission. ensurePushPermission must run inside this
    // user-gesture handler or Chrome/Safari will silently ignore the request.
    const result = await ensurePushPermission();
    setPushState(result);
    setPushEnabledState(isPushEnabled());
  };

  const handleReset = () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    resetSettings();
    setResetConfirm(false);
  };

  const updateKeybind = (actionKey, newKey) => {
    updateSetting('keybinds', { ...settings.keybinds, [actionKey]: newKey });
  };

  const sabAvailable = useMemo(() =>
    typeof window !== 'undefined' && window.crossOriginIsolated === true, []);
  const webgl = useMemo(probeWebGL, []);
  const cores = useMemo(() =>
    typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 0) : 0, []);
  const fileConverterMode = useMemo(() => {
    if (sabAvailable && webgl.ok) return { label: 'Max performance',  tone: 'good' };
    if (sabAvailable && !webgl.ok) return { label: 'Multi-thread only', tone: 'ok' };
    if (!sabAvailable && webgl.ok) return { label: 'GPU only',          tone: 'ok' };
    return { label: 'Single-thread', tone: 'warn' };
  }, [sabAvailable, webgl.ok]);

  useEffect(() => {
    const els = SECTIONS.map(s => document.getElementById(`section-${s.id}`)).filter(Boolean);
    if (els.length === 0) return;
    const obs = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActiveSection(visible[0].target.id.replace('section-', ''));
    }, { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(`section-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleExport = () => {
    const payload = exportLocalData();
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sparkutilities-settings-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setImportMsg('Exported');
    setTimeout(() => setImportMsg(''), 1800);
  };

  const handleImportClick = () => importFileRef.current?.click();

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const n = importLocalData(data);
      setImportMsg(`Restored ${n} keys — reloading…`);
      setTimeout(() => window.location.reload(), 900);
    } catch {
      setImportMsg('Import failed — invalid file');
      setTimeout(() => setImportMsg(''), 2400);
    } finally {
      e.target.value = '';
    }
  };

  const handleClearAll = () => {
    if (!clearConfirm) { setClearConfirm(true); return; }
    const n = clearLocalData();
    setImportMsg(`Cleared ${n} keys — reloading…`);
    setClearConfirm(false);
    setTimeout(() => window.location.reload(), 900);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(ellipse 70% 40% at 50% -5%, rgba(139,92,246,0.14) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

        {/* ── Compact header bar ── */}
        <motion.div {...fadeUp(0)} className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, hsl(262,83%,58%), hsl(187,92%,50%))', boxShadow: '0 0 22px rgba(139,92,246,0.35)' }}>
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold gradient-text leading-tight">Settings</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">All preferences are local to this device — nothing is uploaded.</p>
            </div>
          </div>
          {importMsg && (
            <div className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-medium">
              {importMsg}
            </div>
          )}
        </motion.div>

        <div className="lg:hidden flex gap-1 mb-6 overflow-x-auto pb-2 -mx-1 px-1">
          {SECTIONS.map(s => {
            const active = activeSection === s.id;
            return (
              <button key={s.id} onClick={() => scrollToSection(s.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-colors border ${
                  active
                    ? 'bg-primary/15 text-primary border-primary/40'
                    : 'bg-neutral-900/40 text-muted-foreground border-border/40 hover:text-foreground'
                }`}>
                <s.Icon className="w-3 h-3" />
                {s.title}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">

          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1">
              {SECTIONS.map(s => {
                const active = activeSection === s.id;
                return (
                  <button key={s.id} onClick={() => scrollToSection(s.id)}
                    className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all border ${
                      active
                        ? 'bg-primary/10 border-primary/30 text-foreground'
                        : 'border-transparent text-muted-foreground hover:bg-neutral-900/40 hover:text-foreground'
                    }`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      active ? 'bg-primary/20' : 'bg-neutral-900/60'
                    }`}>
                      <s.Icon className={`w-3.5 h-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5">{s.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="space-y-6 min-w-0">

        <div id="section-status" className="scroll-mt-24">
        <SectionCard
          icon={Activity}
          title="System Status"
          subtitle="Live snapshot of what your browser supports right now"
          iconColor="text-cyan-400"
          iconBg="bg-cyan-500/10"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
            {[
              { Icon: Layers, label: 'File Converter mode', value: fileConverterMode.label,
                tone: fileConverterMode.tone, hint: 'MT engine + GPU lane state' },
              { Icon: Cpu, label: 'CPU threads detected', value: cores ? `${cores}` : 'Unknown',
                tone: cores >= 4 ? 'good' : cores >= 2 ? 'ok' : 'warn',
                hint: 'navigator.hardwareConcurrency' },
              { Icon: Zap, label: 'Cross-origin isolation', value: sabAvailable ? 'Active' : 'Inactive',
                tone: sabAvailable ? 'good' : 'warn',
                hint: sabAvailable ? 'SharedArrayBuffer available — multi-threaded FFmpeg enabled' : 'Single-threaded fallback in use' },
              { Icon: Sparkles, label: 'WebGL acceleration', value: webgl.ok ? webgl.version : 'Unavailable',
                tone: webgl.ok ? 'good' : 'warn',
                hint: webgl.ok ? 'Image conversions can use the GPU fast lane' : 'Falls back to FFmpeg for raster conversions' },
              { Icon: Bell, label: 'Desktop notifications', value: !pushSupported() ? 'Unsupported' : pushState === 'granted' ? 'Granted' : pushState === 'denied' ? 'Blocked' : 'Default',
                tone: pushState === 'granted' ? 'good' : pushState === 'denied' ? 'warn' : 'ok',
                hint: 'Browser-level Notification permission' },
            ].map(s => (
              <div key={s.label} className="flex items-start gap-3 px-3 py-3 rounded-xl border border-border/40 bg-neutral-900/30">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  s.tone === 'good' ? 'bg-emerald-500/15 text-emerald-400'
                  : s.tone === 'warn' ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-neutral-800 text-muted-foreground'
                }`}>
                  <s.Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{s.label}</p>
                  <p className="text-sm font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{s.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
        </div>

        <div id="section-privacy" className="scroll-mt-24">
        <SectionCard
          icon={Shield}
          title="Privacy & Security"
          subtitle="Control how your data and files are handled"
        >
          <SettingRow
            icon={Eye}
            label="Auto-Scrub Metadata"
            description="Automatically remove EXIF, GPS, and device data from all image and video exports."
            control={
              <Toggle
                enabled={settings.autoScrubMetadata}
                onToggle={() => updateSetting('autoScrubMetadata', !settings.autoScrubMetadata)}
              />
            }
          />

          <SettingRow
            icon={Server}
            label="Session Persistence"
            description="Choose how long your settings and recent tool history are saved."
            control={
              <div className="relative">
                <select
                  value={settings.sessionPersistence}
                  onChange={e => updateSetting('sessionPersistence', e.target.value)}
                  className="appearance-none bg-background/80 border border-border/60 text-foreground text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer"
                >
                  {PERSISTENCE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            }
          />

          <SettingRow
            icon={Shield}
            label="Secure Link Expiry"
            description={`Default self-destruct timer for shared files or notes — currently set to ${formatExpiry(settings.secureLinkExpiry)}.`}
            control={
              <div className="flex items-center gap-3 w-44">
                <Slider
                  min={5}
                  max={1440}
                  step={5}
                  value={[settings.secureLinkExpiry]}
                  onValueChange={([v]) => updateSetting('secureLinkExpiry', v)}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-14 text-right whitespace-nowrap">
                  {formatExpiry(settings.secureLinkExpiry)}
                </span>
              </div>
            }
          />
        </SectionCard>

        </div>

        <div id="section-notifications" className="scroll-mt-24">
        <SectionCard
          icon={Bell}
          title="Notifications"
          subtitle="Sounds and desktop alerts when long-running tasks finish"
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
        >
          <SettingRow
            icon={soundsMuted ? VolumeX : Volume2}
            label="Sound chime on task complete"
            description="Plays a soft two-tone chime when a file finishes converting, downloading, or exporting. Web Audio API — no external assets."
            control={<Toggle enabled={!soundsMuted} onToggle={handleSoundsToggle} />}
          />
          <SettingRow
            icon={pushEnabled ? Bell : BellOff}
            label="Desktop notifications"
            description={
              !pushSupported()
                ? 'This browser does not expose the Notification API. Sounds still work.'
                : pushState === 'denied'
                  ? 'Permission was denied earlier. Re-enable notifications for this site in your browser settings, then come back here to flip the toggle.'
                  : pushEnabled
                    ? 'Pops a desktop toast when a task finishes — handy when you switch tabs during a long conversion.'
                    : 'Enable to get a desktop toast when a task finishes. Permission prompt appears the first time.'
            }
            control={
              <Toggle
                enabled={pushEnabled}
                onToggle={handlePushToggle}
                disabled={!pushSupported() || pushState === 'denied'}
              />
            }
          />
        </SectionCard>

        </div>

        <div id="section-performance" className="scroll-mt-24">
        <SectionCard
          icon={Zap}
          title="Performance & System"
          subtitle="Optimise SparkUtilities for your hardware"
          iconColor="text-yellow-400"
          iconBg="bg-yellow-500/10"
        >
          <SettingRow
            icon={Cpu}
            label="Hardware Acceleration"
            description="Enable GPU-accelerated rendering for the Image Editor and conversion pipeline."
            control={
              <Toggle
                enabled={settings.hardwareAcceleration}
                onToggle={() => updateSetting('hardwareAcceleration', !settings.hardwareAcceleration)}
              />
            }
          />

          <SettingRow
            icon={Battery}
            label="Low-Power Mode"
            description="Disable background animations and reduce motion effects to save battery and CPU."
            control={
              <Toggle
                enabled={settings.lowPowerMode}
                onToggle={() => updateSetting('lowPowerMode', !settings.lowPowerMode)}
              />
            }
          />

          <SettingRow
            icon={Trash2}
            label="Memory Management"
            description="Automatically clear temporary file buffers after each download to free up RAM."
            control={
              <Toggle
                enabled={settings.memoryManagement}
                onToggle={() => updateSetting('memoryManagement', !settings.memoryManagement)}
              />
            }
          />

          <SettingRow
            icon={Search}
            label="SparkEngine Indexing"
            description="Pre-load tool metadata so results appear instantly when you open SparkEngine (Ctrl/Cmd+K)."
            control={
              <Toggle
                enabled={settings.sparkSearchIndexing}
                onToggle={() => updateSetting('sparkSearchIndexing', !settings.sparkSearchIndexing)}
              />
            }
          />
        </SectionCard>

        </div>

        <div id="section-keybinds" className="scroll-mt-24">
        <SectionCard
          icon={Keyboard}
          title="Keyboard Shortcuts"
          subtitle="Remap hotkeys to your preferred keys"
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
        >
          {KEYBIND_ACTIONS.map(action => {
            const value = settings.keybinds?.[action.key] ?? DEFAULT_SETTINGS.keybinds[action.key];
            return (
              <KeybindRow
                key={action.key}
                actionKey={action.key}
                label={action.label}
                desc={action.desc}
                modifier={action.modifier}
                raw={action.raw}
                value={value}
                onChange={(newKey) => updateKeybind(action.key, newKey)}
              />
            );
          })}
          <div className="py-3 flex justify-end">
            <button
              onClick={() => updateSetting('keybinds', { ...DEFAULT_SETTINGS.keybinds })}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" /> Reset keybinds to default
            </button>
          </div>
        </SectionCard>

        </div>

        <div id="section-theme" className="scroll-mt-24">
        <SectionCard
          icon={Palette}
          title="Theme & Display"
          subtitle="Appearance settings and accessibility options"
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
        >
          <SettingRow
            icon={Type}
            label="Dyslexia-Friendly Font"
            description="Switches the entire interface to OpenDyslexic — a typeface designed to increase readability for users with dyslexia by weighting the bottom of each letter."
            control={
              <Toggle
                enabled={!!settings.dyslexiaFont}
                onToggle={() => updateSetting('dyslexiaFont', !settings.dyslexiaFont)}
              />
            }
          />
          <div className="pt-2 pb-1 border-t border-border/30">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/40 py-2">Custom Theme</p>
          </div>
          <div className="py-2">
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[{ value: null, label: 'Default', desc: 'Use the base site theme' }, ...THEME_OPTIONS].map(opt => {
                const active = customTheme === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() => setCustomTheme(opt.value)}
                    className="flex items-start gap-2.5 p-3 rounded-xl border transition-all text-left"
                    style={{
                      borderColor: active ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)',
                      background: active ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                      style={{ borderColor: active ? '#a78bfa' : 'rgba(255,255,255,0.2)', background: active ? '#a78bfa' : 'transparent' }}>
                      {active && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        </div>

        <div id="section-sidebar" className="scroll-mt-24">
        <SectionCard
          icon={PanelLeft}
          title="Sidebar"
          subtitle="Control sidebar visibility and which tools are pinned for quick access"
          iconColor="text-indigo-400"
          iconBg="bg-indigo-500/10"
        >
          <SettingRow
            icon={PanelLeft}
            label="Show Sidebar"
            description="Display the quick-access sidebar on the left edge of every page (desktop only)."
            control={
              <Toggle
                enabled={settings.sidebarEnabled !== false}
                onToggle={() => updateSetting('sidebarEnabled', !(settings.sidebarEnabled !== false))}
              />
            }
          />

          <div className="py-4 border-b border-border/30 last:border-0">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Pin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Pinned Tools</p>
                <p className="text-xs text-muted-foreground mt-0.5">Choose which tools appear in the sidebar for quick access. Click to toggle.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {ALL_PINNABLE_TOOLS.map(tool => {
                const Icon = tool.icon;
                const pinned = (settings.pinnedTools ?? []).includes(tool.path);
                const isFlux = tool.group === 'fluxkit';
                return (
                  <button
                    key={tool.path}
                    type="button"
                    onClick={() => {
                      const current = settings.pinnedTools ?? [];
                      const next = pinned
                        ? current.filter(p => p !== tool.path)
                        : [...current, tool.path];
                      updateSetting('pinnedTools', next);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      pinned
                        ? isFlux
                          ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                          : 'bg-primary/10 border-primary/30 text-foreground'
                        : 'border-border/40 text-muted-foreground hover:border-border/70 hover:text-foreground'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      pinned
                        ? isFlux ? 'bg-yellow-500/15' : 'bg-primary/15'
                        : 'bg-neutral-800'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-none truncate">{tool.label}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 capitalize">{tool.group === 'fluxkit' ? 'FluxKit' : 'Utility'}</p>
                    </div>
                    {pinned
                      ? <Pin className="w-3 h-3 flex-shrink-0 opacity-60" />
                      : <PinOff className="w-3 h-3 flex-shrink-0 opacity-30" />
                    }
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>
        </div>

        <div id="section-data" className="scroll-mt-24">
        <SectionCard
          icon={Database}
          title="Data"
          subtitle="Export your local profile, restore it on another device, or wipe everything"
          iconColor="text-violet-400"
          iconBg="bg-violet-500/10"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4">
            <button onClick={handleExport}
              className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border/40 bg-neutral-900/30 hover:bg-neutral-900/60 hover:border-primary/40 transition-all text-left">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Download className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-foreground">Export settings</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Downloads a JSON snapshot of every preference, keybind, theme, and saved token. Safe to commit to a private dotfile repo.</p>
            </button>

            <button onClick={handleImportClick}
              className="flex flex-col items-start gap-2 p-4 rounded-xl border border-border/40 bg-neutral-900/30 hover:bg-neutral-900/60 hover:border-primary/40 transition-all text-left">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Upload className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-sm font-bold text-foreground">Restore from file</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Pick an export file. Recognised keys are written back; unknown keys are ignored. The page reloads when restore completes.</p>
              <input ref={importFileRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
            </button>

            <button onClick={handleClearAll}
              className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-all text-left ${
                clearConfirm
                  ? 'border-destructive/60 bg-destructive/10'
                  : 'border-border/40 bg-neutral-900/30 hover:bg-neutral-900/60 hover:border-destructive/40'
              }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                clearConfirm ? 'bg-destructive/20' : 'bg-red-500/15'
              }`}>
                {clearConfirm ? <AlertTriangle className="w-4 h-4 text-destructive" /> : <Trash2 className="w-4 h-4 text-red-400" />}
              </div>
              <p className={`text-sm font-bold ${clearConfirm ? 'text-destructive' : 'text-foreground'}`}>
                {clearConfirm ? 'Confirm clear?' : 'Clear local data'}
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {clearConfirm
                  ? 'Click again to wipe every sparkutility_* localStorage key. This cannot be undone — export first if you want a backup.'
                  : 'Removes every preference, keybind, conversion history, and saved preset. This cannot be undone.'}
              </p>
            </button>
          </div>
        </SectionCard>
        </div>

        <motion.div {...fadeUp(0.1)} className="flex items-center justify-between gap-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Settings are saved locally and never shared.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className={`gap-2 transition-colors ${resetConfirm ? 'border-destructive text-destructive hover:bg-destructive/10' : 'text-muted-foreground'}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {resetConfirm ? 'Confirm reset?' : 'Reset to Defaults'}
          </Button>
        </motion.div>

          </div>
        </div>

      </div>
    </div>
  );
}
