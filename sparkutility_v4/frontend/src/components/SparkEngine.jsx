import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, Command, Terminal,
  Settings2, Zap, Sun, Moon, Shield, Keyboard, X, List, Hash, Eye,
} from 'lucide-react';
import { SEARCH_INDEX, runSearch } from '@/lib/sparkSearch';
import { useSettings } from '@/context/SettingsContext';
import { useTheme } from '@/context/ThemeContext';

const isMac = typeof navigator !== 'undefined' &&
  (navigator.platform.toUpperCase().includes('MAC') || navigator.userAgent.includes('Macintosh'));

const CATEGORY_ORDER = ['Utilities', 'FluxKit', 'System'];

// Commands are triggered when the user types /commandname in SparkEngine
const COMMANDS = [
  { id: 'goto-home',        trigger: '/home',         label: 'Go to Home',               desc: 'Navigate to the home page',                icon: Search,   type: 'nav',      path: '/' },
  { id: 'goto-converter',   trigger: '/convert',      label: 'File Converter',            desc: 'Open the File Converter tool',              icon: Zap,      type: 'nav',      path: '/file-converter' },
  { id: 'goto-image',       trigger: '/image',        label: 'Image Editor',              desc: 'Open the Image Editor tool',                icon: Search,   type: 'nav',      path: '/image-editor' },
  { id: 'image-undo',       trigger: '/undo',         label: 'Undo (Image Editor)',       desc: 'Open the Image Editor — Cmd/Ctrl+Z to undo',icon: Search,   type: 'nav',      path: '/image-editor' },
  { id: 'image-redo',       trigger: '/redo',         label: 'Redo (Image Editor)',       desc: 'Open the Image Editor — Cmd/Ctrl+Shift+Z to redo', icon: Search, type: 'nav', path: '/image-editor' },
  { id: 'goto-audio',       trigger: '/audio',        label: 'Audio Modifier',            desc: 'Open the Audio Modifier tool',              icon: Search,   type: 'nav',      path: '/audio-modifier' },
  { id: 'goto-preview',     trigger: '/preview',      label: 'Content Previewer',         desc: 'Open the Content Previewer (safe zones, social mockups, thumbnails)', icon: Eye, type: 'nav', path: '/content-previewer' },
  { id: 'goto-thumbnail',   trigger: '/thumbnail',    label: 'Thumbnail Builder',         desc: 'Open the Content Previewer to capture a thumbnail',                  icon: Eye, type: 'nav', path: '/content-previewer' },
  { id: 'goto-fluxkit',     trigger: '/fluxkit',      label: 'FluxKit',                   desc: 'Open FluxKit developer tools hub',          icon: Hash,     type: 'nav',      path: '/fluxkit' },
  { id: 'goto-data',        trigger: '/data',         label: 'Data & Structure',          desc: 'Open the Data & Structure FluxKit category', icon: Hash,    type: 'nav',      path: '/fluxkit/data-structure' },
  { id: 'goto-webdev',      trigger: '/webdev',       label: 'Web Dev Assets',            desc: 'Open the Web Dev Assets FluxKit category',   icon: Hash,    type: 'nav',      path: '/fluxkit/web-dev-assets' },
  { id: 'goto-css',         trigger: '/css',          label: 'CSS / Web Dev Assets',      desc: 'Jump to the Web Dev Assets FluxKit category', icon: Hash,   type: 'nav',      path: '/fluxkit/web-dev-assets' },
  { id: 'goto-security',    trigger: '/security',     label: 'Security & Logic',          desc: 'Open the Security & Logic FluxKit category', icon: Hash,    type: 'nav',      path: '/fluxkit/security-logic' },
  { id: 'goto-jwt',         trigger: '/jwt',          label: 'JWT Decoder',               desc: 'Open Security & Logic — includes JWT Debugger', icon: Hash, type: 'nav',      path: '/fluxkit/security-logic' },
  { id: 'goto-regex',       trigger: '/regex',        label: 'Regex Tester',              desc: 'Open Security & Logic — includes Regex Tester', icon: Hash, type: 'nav',      path: '/fluxkit/security-logic' },
  { id: 'goto-productivity',trigger: '/productivity', label: 'Productivity Tools',        desc: 'Open the Productivity FluxKit category',     icon: Hash,    type: 'nav',      path: '/fluxkit/productivity' },
  { id: 'goto-diff',        trigger: '/diff',         label: 'Diff Viewer',               desc: 'Open Productivity — includes the Diff Viewer', icon: Hash, type: 'nav',      path: '/fluxkit/productivity' },
  { id: 'goto-curl',        trigger: '/curl',         label: 'cURL Converter',            desc: 'Open Productivity — includes cURL → Fetch / Axios converter', icon: Hash, type: 'nav', path: '/fluxkit/productivity' },
  { id: 'goto-latex',       trigger: '/latex',        label: 'LaTeX Builder',             desc: 'Open the FluxKit LaTeX Builder',           icon: Hash,     type: 'nav',      path: '/fluxkit/latex-builder' },
  { id: 'goto-settings',    trigger: '/settings',     label: 'Settings',                  desc: 'Open the Settings page',                    icon: Settings2,type: 'nav',      path: '/settings' },
  { id: 'toggle-dark',      trigger: '/dark',         label: 'Toggle Dark Mode',          desc: 'Switch to dark mode',                       icon: Moon,     type: 'action',   action: 'dark' },
  { id: 'toggle-light',     trigger: '/light',        label: 'Toggle Light Mode',         desc: 'Switch to light mode',                      icon: Sun,      type: 'action',   action: 'light' },
  { id: 'toggle-lowpower',  trigger: '/lowpower',     label: 'Toggle Low-Power Mode',     desc: 'Enable or disable low-power mode',          icon: Zap,      type: 'action',   action: 'lowpower' },
  { id: 'toggle-scrub',     trigger: '/scrub',        label: 'Toggle Auto-Scrub Metadata',desc: 'Enable or disable metadata scrubbing',     icon: Shield,   type: 'action',   action: 'scrub' },
  { id: 'keybinds',         trigger: '/keybinds',     label: 'Keyboard Shortcuts',        desc: 'View and edit keyboard shortcut bindings',  icon: Keyboard, type: 'nav',      path: '/settings' },
  //    SparkEngine search bar (Phase D, v3.3.11). Keeping them in the global
  //    palette duplicated the surface and let users drop templates with no
  //    target editor in focus, which was a confusing no-op. The /latex nav
  //    command above still opens the Builder, where the symbol/command
  //    search lives next to the editor it acts on.
];

function groupByCategory(items) {
  const map = {};
  for (const item of items) {
    if (!map[item.category]) map[item.category] = [];
    map[item.category].push(item);
  }
  return CATEGORY_ORDER
    .filter(c => map[c])
    .map(c => ({ category: c, items: map[c] }));
}

function highlight(text, query) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded px-0.5">{text.slice(idx, idx + query.trim().length)}</mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

function CommandListModal({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-xl rounded-2xl border border-border/60 bg-neutral-950 overflow-hidden shadow-2xl"
        style={{ boxShadow: '0 0 60px rgba(139,92,246,0.12), 0 25px 50px rgba(0,0,0,0.7)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">Command Reference</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-800 text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[70vh] p-3 space-y-0.5">
          {COMMANDS.filter(c => !c.hidden).map(cmd => {
            const Icon = cmd.icon;
            return (
              <div key={cmd.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-900 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{cmd.trigger}</code>
                    <span className="text-xs font-medium text-foreground">{cmd.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{cmd.desc}</p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-muted-foreground font-mono flex-shrink-0">
                  {cmd.type}
                </span>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-border/30 bg-neutral-950/80">
          <p className="text-[10px] text-muted-foreground/50 text-center">
            Type any command directly in <span className="text-primary font-mono">SparkEngine</span> to run it
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SparkEngine() {
  const [open, setOpen]            = useState(false);
  const [query, setQuery]          = useState('');
  const [selectedIdx, setSelected] = useState(0);
  const [showCmdList, setShowCmdList] = useState(false);
  const inputRef                   = useRef(null);
  const listRef                    = useRef(null);
  const navigate                   = useNavigate();
  const { settings, updateSetting } = useSettings();
  const { currentMode, setUserMode } = useTheme();

  const isCommand = query.startsWith('/');

  // Pre-build index reference
  const indexReady = useMemo(
    () => settings.sparkSearchIndexing ? SEARCH_INDEX : SEARCH_INDEX,
    [settings.sparkSearchIndexing]
  );

  const filteredCommands = useMemo(() => {
    if (!isCommand) return [];
    const q = query.toLowerCase();
    return COMMANDS.filter(c => {
      // Hidden commands only appear when the user has typed their trigger exactly
      if (c.hidden) return q === c.trigger;
      return c.trigger.startsWith(q) || c.label.toLowerCase().includes(q.slice(1));
    });
  }, [query, isCommand]);

  const searchResults = useMemo(() => {
    if (isCommand) return [];
    const raw = runSearch(query);
    return query.trim() ? raw : indexReady;
  }, [query, isCommand, indexReady]);

  const flatList = useMemo(() => {
    if (isCommand) return filteredCommands;
    if (query.trim()) return searchResults;
    return CATEGORY_ORDER.flatMap(cat => searchResults.filter(r => r.category === cat));
  }, [isCommand, filteredCommands, searchResults, query]);

  const grouped = useMemo(() => {
    if (isCommand || query.trim()) return null;
    return groupByCategory(searchResults);
  }, [isCommand, searchResults, query]);

  const execCommand = useCallback((cmd) => {
    setOpen(false);
    setQuery('');
    if (cmd.type === 'nav') {
      navigate(cmd.path);
    } else if (cmd.type === 'action') {
      if (cmd.action === 'dark')     setUserMode?.('dark');
      if (cmd.action === 'light')    setUserMode?.('light');
      if (cmd.action === 'lowpower') updateSetting('lowPowerMode', !settings.lowPowerMode);
      if (cmd.action === 'scrub')    updateSetting('autoScrubMetadata', !settings.autoScrubMetadata);
    }
  }, [navigate, settings, updateSetting, setUserMode]);

  useEffect(() => {
    const key = settings.keybinds?.sparkEngine ?? 'k';
    const down = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === key) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [settings.keybinds]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(i => Math.min(i + 1, flatList.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(i => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatList[selectedIdx];
      if (!item) return;
      if (isCommand) {
        execCommand(item);
      } else {
        navigate(item.path);
        setOpen(false);
      }
    }
  }, [flatList, selectedIdx, navigate, isCommand, execCommand]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const go = useCallback((path) => { navigate(path); setOpen(false); }, [navigate]);

  const ResultItem = ({ item, idx }) => {
    const Icon   = item.Icon;
    const active = idx === selectedIdx;
    return (
      <button
        data-idx={idx}
        type="button"
        onMouseEnter={() => setSelected(idx)}
        onClick={() => go(item.path)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${active ? 'bg-primary/10' : 'hover:bg-primary/5'}`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${active ? 'bg-primary/20' : 'bg-neutral-800'}`}>
          <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-none mb-0.5 ${active ? 'text-primary' : 'text-foreground'}`}>
            {highlight(item.label, query)}
          </p>
          <p className="text-xs text-muted-foreground truncate">{highlight(item.description, query)}</p>
        </div>
        {active && <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
      </button>
    );
  };

  const CommandItem = ({ cmd, idx }) => {
    const Icon   = cmd.icon;
    const active = idx === selectedIdx;
    return (
      <button
        data-idx={idx}
        type="button"
        onMouseEnter={() => setSelected(idx)}
        onClick={() => execCommand(cmd)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${active ? 'bg-primary/10' : 'hover:bg-primary/5'}`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-primary/20' : 'bg-neutral-800'}`}>
          <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className={`text-xs font-mono px-1.5 py-0.5 rounded ${active ? 'bg-primary/20 text-primary' : 'bg-neutral-800 text-muted-foreground'}`}>
              {cmd.trigger}
            </code>
            <p className={`text-sm font-medium leading-none ${active ? 'text-primary' : 'text-foreground'}`}>{cmd.label}</p>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{cmd.desc}</p>
        </div>
        {active && <ArrowRight className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
      </button>
    );
  };

  const keyHint = isMac
    ? <><Command className="w-2.5 h-2.5" />K</>
    : 'Ctrl+K';

  return (
    <>
      {/* Trigger button (shown in Navbar) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-background/50 text-muted-foreground text-xs hover:border-primary/30 hover:text-foreground transition-colors"
        aria-label="Open SparkEngine"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search…</span>
        <kbd className="ml-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border/60 bg-background text-[10px] font-mono">
          {keyHint}
        </kbd>
      </button>

      {/* Command list modal */}
      <AnimatePresence>
        {showCmdList && <CommandListModal onClose={() => setShowCmdList(false)} />}
      </AnimatePresence>

      {/* Main overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99]"
              onClick={() => setOpen(false)}
            />

            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.96, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -12 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-1/2 top-[12vh] -translate-x-1/2 w-full max-w-lg z-[100] px-4"
            >
              <div className="rounded-2xl border border-border/60 bg-black shadow-2xl overflow-hidden"
                style={{ boxShadow: '0 0 60px rgba(139,92,246,0.15), 0 25px 50px rgba(0,0,0,0.6)' }}>

                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40">
                  {isCommand
                    ? <Terminal className="w-4 h-4 text-primary flex-shrink-0" />
                    : <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  }
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isCommand ? 'Type a command… (/ to browse all)' : 'Search SparkEngine… or type / for commands'}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                      className="text-xs text-muted-foreground/60 hover:text-muted-foreground px-1.5 py-0.5 rounded border border-border/40 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border/40 bg-neutral-900 text-[10px] font-mono text-muted-foreground">
                    esc
                  </kbd>
                </div>

                {/* Results / Commands */}
                <div ref={listRef} className="max-h-[60vh] overflow-y-auto overscroll-contain py-2 px-2">
                  {isCommand ? (
                    filteredCommands.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Unknown command. Type <span className="text-primary font-mono">/</span> to see all commands.
                      </div>
                    ) : (
                      filteredCommands.map((cmd, idx) => <CommandItem key={cmd.id} cmd={cmd} idx={idx} />)
                    )
                  ) : flatList.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      No results for <span className="text-foreground">"{query}"</span>
                    </div>
                  ) : query.trim() ? (
                    flatList.map((item, idx) => <ResultItem key={item.id} item={item} idx={idx} />)
                  ) : (
                    grouped.map(({ category, items }) => (
                      <div key={category} className="mb-1">
                        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50">
                          {category}
                        </p>
                        {items.map(item => {
                          const idx = flatList.findIndex(f => f.id === item.id);
                          return <ResultItem key={item.id} item={item} idx={idx} />;
                        })}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border/30 bg-neutral-950/60">
                  {[
                    { keys: ['↑', '↓'], label: 'navigate' },
                    { keys: ['↵'],      label: 'open'     },
                    { keys: ['esc'],    label: 'close'    },
                  ].map(({ keys, label }) => (
                    <span key={label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                      {keys.map(k => (
                        <kbd key={k} className="px-1.5 py-0.5 rounded border border-border/40 bg-neutral-900 font-mono text-foreground/60">
                          {k}
                        </kbd>
                      ))}
                      {label}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setShowCmdList(true); }}
                    className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors font-mono"
                  >
                    <List className="w-3 h-3" />
                    commands
                  </button>
                  <span className="text-[10px] text-muted-foreground/40 font-display font-semibold">
                    <span className="gradient-text">Spark</span>Engine
                  </span>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
