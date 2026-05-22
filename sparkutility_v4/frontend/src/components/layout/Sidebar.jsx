import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Zap, Home, Settings2, Search, ChevronLeft, ChevronRight,
  RefreshCw, Wand2, Music2, MonitorPlay,
  Database, Palette, ShieldCheck, Wrench, Hash,
  Shield, Activity, Loader2,
} from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useSettings } from '@/context/SettingsContext';

const isMac = typeof navigator !== 'undefined' &&
  (navigator.platform.toUpperCase().includes('MAC') || navigator.userAgent.includes('Macintosh'));

const COLLAPSED_W  = 42;
const EXPANDED_W   = 200;
const COLLAPSE_THRESHOLD = 90;
const SNAP_STOPS = [COLLAPSED_W, 140, 200, 260, 320];

export const ALL_PINNABLE_TOOLS = [
  { path: '/file-converter',          label: 'File Converter',    icon: RefreshCw,    group: 'utilities' },
  { path: '/image-editor',            label: 'Image Editor',      icon: Wand2,         group: 'utilities' },
  { path: '/audio-modifier',          label: 'Audio Modifier',    icon: Music2,        group: 'utilities' },
  { path: '/content-previewer',       label: 'Content Previewer', icon: MonitorPlay,   group: 'utilities' },
  { path: '/fluxkit/data-structure',  label: 'Data & Structure',  icon: Database,      group: 'fluxkit'   },
  { path: '/fluxkit/web-dev-assets',  label: 'Web Dev Assets',    icon: Palette,       group: 'fluxkit'   },
  { path: '/fluxkit/security-logic',  label: 'Security & Logic',  icon: ShieldCheck,   group: 'fluxkit'   },
  { path: '/fluxkit/productivity',    label: 'Productivity',      icon: Wrench,        group: 'fluxkit'   },
  { path: '/fluxkit/latex-builder',   label: 'LaTeX Builder',     icon: Hash,          group: 'fluxkit'   },
];

function openSparkEngine() {
  window.dispatchEvent(new KeyboardEvent('keydown', {
    [isMac ? 'metaKey' : 'ctrlKey']: true,
    key: 'k',
    bubbles: true,
  }));
}

function ProgressRing({ progress, size = 16, stroke = 2 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="hsl(187,92%,50%)" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
    </svg>
  );
}

export default function Sidebar() {
  const { collapsed, toggleCollapsed, workflows } = useSidebar();
  const { settings, updateSetting } = useSettings();
  const location = useLocation();

  const [apiOk, setApiOk] = useState(null);
  const [scrubOn, setScrubOn] = useState(settings.autoScrubMetadata ?? false);

  const [isDragging, setIsDragging] = useState(false);
  const [dragWidth, setDragWidth]   = useState(null);
  const [lockedWidth, setLockedWidth] = useState(EXPANDED_W);
  const dragStartX  = useRef(0);
  const dragStartW  = useRef(0);
  const asideRef    = useRef(null);

  const pinnedPaths = settings.pinnedTools ?? [];
  const pinnedTools = ALL_PINNABLE_TOOLS.filter(t => pinnedPaths.includes(t.path));
  const workflowEntries = Object.entries(workflows);

  useEffect(() => {
    setScrubOn(settings.autoScrubMetadata ?? false);
  }, [settings.autoScrubMetadata]);

  const handleScrubToggle = () => {
    const next = !scrubOn;
    setScrubOn(next);
    updateSetting('autoScrubMetadata', next);
  };

  useEffect(() => {
    let mounted = true;
    const check = () => {
      fetch('/api/health', { signal: AbortSignal.timeout(4000) })
        .then(r => { if (mounted) setApiOk(r.ok); })
        .catch(() => { if (mounted) setApiOk(false); });
    };
    check();
    const id = setInterval(check, 30_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartW.current = asideRef.current?.offsetWidth ?? (collapsed ? COLLAPSED_W : lockedWidth);
  }, [collapsed, lockedWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e) => {
      const delta = e.clientX - dragStartX.current;
      const next  = Math.max(COLLAPSED_W, Math.min(320, dragStartW.current + delta));
      setDragWidth(next);
    };

    const onUp = () => {
      setIsDragging(false);
      const rawW = dragWidth ?? dragStartW.current;
      setDragWidth(null);

      const snapped = SNAP_STOPS.reduce((best, stop) =>
        Math.abs(stop - rawW) < Math.abs(best - rawW) ? stop : best,
        SNAP_STOPS[0]
      );

      if (snapped <= COLLAPSE_THRESHOLD) {
        if (!collapsed) toggleCollapsed();
      } else {
        if (collapsed) toggleCollapsed();
        setLockedWidth(snapped);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, collapsed, toggleCollapsed, dragWidth]);

  const displayW = isDragging && dragWidth !== null
    ? dragWidth
    : collapsed ? COLLAPSED_W : lockedWidth;

  const isCollapsed = isDragging ? dragWidth !== null && dragWidth < COLLAPSE_THRESHOLD : collapsed;

  return (
    <aside
      ref={asideRef}
      className="relative flex-shrink-0 hidden lg:flex flex-col h-[calc(100vh-4rem)] sticky top-16 z-40 overflow-hidden"
      style={{
        width: displayW,
        transition: isDragging ? 'none' : 'width 0.22s cubic-bezier(0.22,1,0.36,1)',
        background: 'rgba(8,8,12,0.92)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        userSelect: isDragging ? 'none' : undefined,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 -z-0"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 100%)' }}
      />

      <div
        onMouseDown={handleDragStart}
        className="absolute top-0 right-0 w-1.5 h-full z-50 cursor-col-resize group"
        title="Drag to resize"
      >
        <div className="absolute inset-y-0 right-0 w-px bg-white/[0.06] group-hover:bg-primary/30 transition-colors duration-150" />
        <div className="absolute inset-y-0 -right-1.5 -left-1 opacity-0" />
      </div>

      <div className={`relative z-10 flex items-center gap-2.5 px-3 pt-4 pb-3 ${isCollapsed ? 'flex-col' : ''}`}>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, hsl(262,83%,58%), hsl(187,92%,50%))',
            boxShadow: '0 0 14px rgba(139,92,246,0.35)',
          }}
        >
          <Zap className="w-4 h-4 text-white" />
        </div>

        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold leading-none gradient-text truncate">SparkUtilities</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-none">Utility Hub</p>
          </div>
        )}

        <button
          type="button"
          onClick={openSparkEngine}
          aria-label="Open SparkEngine"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-border/30 bg-neutral-900/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mx-3 border-t border-white/[0.05]" />

      <div className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1 sidebar-scroll">

        <SidebarItem
          path="/"
          label="Home"
          icon={Home}
          isCollapsed={isCollapsed}
          active={location.pathname === '/'}
        />

        <SidebarGroupLabel label="Pinned" isCollapsed={isCollapsed} />
        {pinnedTools.length === 0 ? (
          !isCollapsed && (
            <Link to="/settings" className="block px-3 py-2">
              <p className="text-[10px] text-muted-foreground/50 leading-snug">
                Nothing here!{' '}
                <span className="underline underline-offset-2 hover:text-muted-foreground transition-colors">
                  Configure in settings.
                </span>
              </p>
            </Link>
          )
        ) : (
          pinnedTools.map(tool => {
            const wf = workflowEntries.find(([, v]) => v.label === tool.label || v.path === tool.path);
            return (
              <SidebarItem
                key={tool.path}
                path={tool.path}
                label={tool.label}
                icon={tool.icon}
                isCollapsed={isCollapsed}
                active={location.pathname === tool.path || location.pathname.startsWith(tool.path + '/')}
                workflow={wf ? wf[1] : null}
                isFluxKit={tool.group === 'fluxkit'}
              />
            );
          })
        )}

        {workflowEntries.filter(([, v]) => !pinnedPaths.some(p => v.path === p || v.label === ALL_PINNABLE_TOOLS.find(t => t.path === p)?.label)).length > 0 && (
          <>
            <SidebarGroupLabel label="Active" isCollapsed={isCollapsed} />
            {workflowEntries
              .filter(([, v]) => !pinnedPaths.includes(v.path ?? ''))
              .map(([id, wf]) => (
                <SidebarWorkflowItem key={id} workflow={wf} isCollapsed={isCollapsed} />
              ))}
          </>
        )}
      </div>

      <div className="relative z-10 border-t border-white/[0.05] pt-2 pb-3 px-2 space-y-1">

        <div
          className={`flex items-center gap-2.5 px-2 py-2 rounded-xl transition-colors hover:bg-white/[0.04] cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
          onClick={handleScrubToggle}
          title={scrubOn ? 'Auto-Scrub EXIF: ON' : 'Auto-Scrub EXIF: OFF'}
        >
          <div className="relative flex-shrink-0">
            <Shield
              className={`w-4 h-4 transition-colors ${scrubOn ? 'text-amber-400' : 'text-muted-foreground/50'}`}
            />
            {scrubOn && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-semibold leading-none ${scrubOn ? 'text-amber-400' : 'text-muted-foreground'}`}>
                  EXIF Scrub
                </p>
                <p className="text-[9px] text-muted-foreground/50 mt-0.5 leading-none">Removes all private data off of image/video exports.</p>
              </div>
              <div
                className={`relative w-8 h-4 rounded-full flex-shrink-0 transition-colors ${scrubOn ? 'bg-amber-500' : 'bg-neutral-700'}`}
              >
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${scrubOn ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </div>
            </>
          )}
        </div>

        <SidebarItem
          path="/settings"
          label="Settings"
          icon={Settings2}
          isCollapsed={isCollapsed}
          active={location.pathname === '/settings'}
        />

        <div
          className={`flex items-center gap-2.5 px-2 py-2 rounded-xl min-w-0 overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}
          title={apiOk === null ? 'Checking…' : apiOk ? 'All systems operational' : 'Backend offline'}
        >
          <div className="relative flex-shrink-0">
            <Activity className="w-4 h-4 text-muted-foreground/40" />
            <span
              className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                apiOk === null ? 'bg-neutral-500 animate-pulse' :
                apiOk ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`}
            />
          </div>
          {!isCollapsed && (
            <p className={`text-[10px] font-medium leading-none truncate min-w-0 flex-1 ${
              apiOk === null ? 'text-muted-foreground/40' :
              apiOk ? 'text-emerald-400/80' : 'text-red-400/80'
            }`}>
              {apiOk === null ? 'Checking…' : apiOk ? 'All systems operational' : 'Backend offline'}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-muted-foreground/40 hover:text-muted-foreground hover:bg-white/[0.04] transition-colors ${isCollapsed ? 'justify-center' : ''}`}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          {!isCollapsed && <span className="text-[10px] font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function SidebarGroupLabel({ label, isCollapsed }) {
  if (isCollapsed) return <div className="mx-3 my-1 h-px bg-white/[0.05]" />;
  return (
    <p className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-widest font-bold text-muted-foreground/40">
      {label}
    </p>
  );
}

function SidebarItem({ path, label, icon: Icon, isCollapsed, active, workflow = null, isFluxKit = false }) {
  const isFlux = isFluxKit || path.startsWith('/fluxkit');

  return (
    <Link to={path} className="block px-2">
      <div
        className={`flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all duration-150 ${
          active
            ? isFlux
              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              : 'bg-primary/10 text-foreground border border-primary/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border border-transparent'
        } ${isCollapsed ? 'justify-center' : ''}`}
      >
        <div className="relative flex-shrink-0">
          <Icon className={`w-4 h-4 ${active && isFlux ? 'text-yellow-400' : active ? 'text-primary' : ''}`} />
          {workflow && (
            <div className="absolute -top-1 -right-1">
              {workflow.indeterminate ? (
                <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
              ) : workflow.progress != null ? (
                <ProgressRing progress={workflow.progress} size={14} stroke={1.5} />
              ) : null}
            </div>
          )}
        </div>

        {!isCollapsed && (
          <>
            <span className="text-xs font-medium truncate flex-1 min-w-0">{label}</span>
            {workflow && (
              <span className="flex-shrink-0 text-[9px] font-mono text-cyan-400 tabular-nums">
                {workflow.indeterminate ? '…' : workflow.progress != null ? `${Math.round(workflow.progress)}%` : ''}
              </span>
            )}
          </>
        )}
      </div>
    </Link>
  );
}

function SidebarWorkflowItem({ workflow, isCollapsed }) {
  const Icon = workflow.icon ?? Activity;
  return (
    <div className={`flex items-center gap-2.5 px-4 py-2 ${isCollapsed ? 'justify-center' : ''}`}>
      <div className="relative flex-shrink-0">
        <Icon className="w-4 h-4 text-cyan-400/70" />
        <div className="absolute -top-1 -right-1">
          {workflow.indeterminate ? (
            <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
          ) : workflow.progress != null ? (
            <ProgressRing progress={workflow.progress} size={14} stroke={1.5} />
          ) : null}
        </div>
      </div>
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-cyan-400/80 truncate">{workflow.label}</p>
          {!workflow.indeterminate && workflow.progress != null && (
            <div className="mt-1 h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${workflow.progress}%`,
                  background: 'linear-gradient(to right, hsl(262,83%,58%), hsl(187,92%,50%))',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function useWorkflow(id, label, icon = null) {
  const { registerWorkflow, updateWorkflow, unregisterWorkflow } = useSidebar();

  const start = (opts = {}) => registerWorkflow(id, { label, icon, ...opts });
  const update = (patch) => updateWorkflow(id, patch);
  const finish = () => unregisterWorkflow(id);

  return { start, update, finish };
}
