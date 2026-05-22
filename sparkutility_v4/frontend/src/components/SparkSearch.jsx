import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, Command } from 'lucide-react';
import { SEARCH_INDEX, runSearch } from '@/lib/sparkSearch';
import { useSettings } from '@/context/SettingsContext';

const CATEGORY_ORDER = ['Utilities', 'FluxKit', 'Content', 'Support', 'System'];

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

export default function SparkSearch() {
  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState('');
  const [selectedIdx, setSelected] = useState(0);
  const inputRef                  = useRef(null);
  const listRef                   = useRef(null);
  const navigate                  = useNavigate();
  const { settings }              = useSettings();

  // Pre-build index reference if sparkSearchIndexing is on (eager vs. lazy is identical
  // for a static list, but this satisfies the setting's contract for future dynamic indexes).
  const indexReady = useMemo(
    () => settings.sparkSearchIndexing ? SEARCH_INDEX : SEARCH_INDEX,
    [settings.sparkSearchIndexing]
  );

  const results = useMemo(() => {
    const raw = runSearch(query);
    return query.trim() ? raw : indexReady;
  }, [query, indexReady]);

  const flatResults = results.flatMap ? results : results;

  // For keyboard navigation we need a flat ordered list
  const flatList = useMemo(() => {
    if (query.trim()) return results;
    return CATEGORY_ORDER.flatMap(cat => results.filter(r => r.category === cat));
  }, [results, query]);

  const grouped = useMemo(() => {
    if (query.trim()) return null;
    return groupByCategory(results);
  }, [results, query]);

  // ── Keyboard shortcut ────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  // ── Auto-focus input on open ──────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ── Reset selection when results change ──────────────────────────────────
  useEffect(() => { setSelected(0); }, [query]);

  // ── Navigation inside modal ───────────────────────────────────────────────
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
      if (item) { navigate(item.path); setOpen(false); }
    }
  }, [flatList, selectedIdx, navigate]);

  // ── Scroll selected item into view ────────────────────────────────────────
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const go = useCallback((path) => {
    navigate(path);
    setOpen(false);
  }, [navigate]);

  // ── Result item renderer ──────────────────────────────────────────────────
  const ResultItem = ({ item, idx }) => {
    const Icon    = item.Icon;
    const active  = idx === selectedIdx;
    return (
      <button
        key={item.id}
        data-idx={idx}
        type="button"
        onMouseEnter={() => setSelected(idx)}
        onClick={() => go(item.path)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
          active ? 'bg-primary/10' : 'hover:bg-primary/5'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
          active ? 'bg-primary/20' : 'bg-neutral-800'
        }`}>
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

  return (
    <>
      {/* Trigger hint shown in navbar (purely visual — actual shortcut is global) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/50 bg-background/50 text-muted-foreground text-xs hover:border-primary/30 hover:text-foreground transition-colors"
        aria-label="Open search"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search…</span>
        <kbd className="ml-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border/60 bg-background text-[10px] font-mono">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99]"
              onClick={() => setOpen(false)}
            />

            {/* Modal */}
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
                  <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search SparkUtilities…"
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

                {/* Results */}
                <div ref={listRef} className="max-h-[60vh] overflow-y-auto overscroll-contain py-2 px-2">
                  {flatList.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      No results for <span className="text-foreground">"{query}"</span>
                    </div>
                  ) : query.trim() ? (
                    // Flat ranked results when searching
                    flatList.map((item, idx) => <ResultItem key={item.id} item={item} idx={idx} />)
                  ) : (
                    // Grouped by category when empty query
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

                {/* Footer hints */}
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
                  <span className="ml-auto text-[10px] text-muted-foreground/40 font-display font-semibold">
                    <span className="gradient-text">Spark</span>Search
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
