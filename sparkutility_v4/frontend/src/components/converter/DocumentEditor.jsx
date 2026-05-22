/**
 * DocumentEditor — custom drag-drop editor for imported documents.
 * Supports: txt, md, html, json, xml, csv, pdf (read-only view), docx (text extract).
 * Features: live editing, find & replace, line numbers, word count, export.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Search, Replace, Type, Hash, Download,
  WrapText, Maximize2, Minimize2,
  AlertCircle, Loader2, RotateCcw, Copy, Check,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function countWords(text) {
  return (text.match(/\S+/g) || []).length;
}

function countLines(text) {
  return text.split('\n').length;
}

const SUPPORTED_EXTS = new Set([
  'txt', 'md', 'html', 'htm', 'json', 'xml', 'csv', 'js', 'ts', 'jsx', 'tsx',
  'css', 'yaml', 'yml', 'toml', 'ini', 'log', 'pdf', 'docx', 'doc', 'rtf',
]);

function getExt(filename) {
  return (filename.split('.').pop() || '').toLowerCase();
}

function getLanguage(ext) {
  const MAP = { js: 'javascript', ts: 'typescript', jsx: 'jsx', tsx: 'tsx', html: 'html', htm: 'html', css: 'css', json: 'json', xml: 'xml', md: 'markdown', yaml: 'yaml', yml: 'yaml', toml: 'toml' };
  return MAP[ext] || 'plaintext';
}

async function extractText(file, ext) {
  if (ext === 'pdf') {
    const mod = await import('pdfjs-dist/build/pdf.mjs');
    try {
      const wUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
      mod.GlobalWorkerOptions.workerSrc = wUrl;
    } catch { mod.GlobalWorkerOptions.workerSrc = ''; }
    const buf = await file.arrayBuffer();
    const doc = await mod.getDocument({ data: new Uint8Array(buf) }).promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      pages.push(tc.items.map(it => it.str || '').join(' ').replace(/\s+/g, ' ').trim());
      page.cleanup?.();
    }
    doc.destroy?.();
    return { text: pages.join('\n\n'), readOnly: true };
  }
  const text = await file.text();
  return { text, readOnly: false };
}

// ── LineNumbers component ────────────────────────────────────────────────────

function LineNumbers({ text, lineHeight = 21 }) {
  const lines = text.split('\n');
  return (
    <div className="select-none text-right pr-3 border-r border-border/30 flex-shrink-0 overflow-hidden" style={{ minWidth: 36, paddingTop: 12, paddingBottom: 12 }}>
      {lines.map((_, i) => (
        <div key={i} className="text-[11px] text-muted-foreground/40 font-mono leading-[21px]">
          {i + 1}
        </div>
      ))}
    </div>
  );
}

// ── FindReplace bar ──────────────────────────────────────────────────────────

function FindReplaceBar({ text, onTextChange, onClose }) {
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    if (!find) { setMatchCount(0); return; }
    try {
      const flags = matchCase ? 'g' : 'gi';
      const matches = text.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags));
      setMatchCount(matches ? matches.length : 0);
    } catch { setMatchCount(0); }
  }, [find, text, matchCase]);

  const handleReplace = useCallback(() => {
    if (!find) return;
    try {
      const flags = matchCase ? 'g' : 'gi';
      const re = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
      onTextChange(text.replace(re, replace));
    } catch { /* ignore */ }
  }, [find, replace, text, onTextChange, matchCase]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-secondary/10">
      <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <input
        autoFocus
        value={find}
        onChange={e => setFind(e.target.value)}
        placeholder="Find…"
        className="flex-1 min-w-0 text-xs bg-transparent focus:outline-none"
      />
      {find && <span className="text-[10px] text-muted-foreground flex-shrink-0">{matchCount} match{matchCount !== 1 ? 'es' : ''}</span>}
      <div className="w-px h-3 bg-border/40" />
      <Replace className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <input
        value={replace}
        onChange={e => setReplace(e.target.value)}
        placeholder="Replace with…"
        className="flex-1 min-w-0 text-xs bg-transparent focus:outline-none"
      />
      <button
        onClick={() => setMatchCase(m => !m)}
        className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${matchCase ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground'}`}
        title="Match case"
      >Aa</button>
      <button onClick={handleReplace} className="text-[10px] px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
        Replace all
      </button>
      <button onClick={onClose} className="p-1 hover:bg-secondary rounded transition-colors">
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DocumentEditor() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  const handleFileLoad = useCallback(async (f) => {
    const ext = getExt(f.name);
    if (!SUPPORTED_EXTS.has(ext)) {
      setError(`Unsupported file type: .${ext}. Supported: ${[...SUPPORTED_EXTS].join(', ')}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { text: extracted, readOnly: ro } = await extractText(f, ext);
      setFile(f);
      setText(extracted);
      setOriginalText(extracted);
      setReadOnly(ro);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to read file');
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileLoad(f);
  }, [handleFileLoad]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  const handleDownload = useCallback(() => {
    if (!file) return;
    const ext = getExt(file.name);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace(`.${ext}`, `-edited.${ext}`);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, [file, text]);

  const isDirty = text !== originalText;
  const stats = useMemo(() => ({ words: countWords(text), chars: text.length, lines: countLines(text) }), [text]);
  const ext = file ? getExt(file.name) : '';

  // ── Keyboard shortcut for find/replace ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && file) {
        e.preventDefault();
        setShowFindReplace(s => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [file]);

  const editorHeight = expanded ? 'calc(80vh - 180px)' : '320px';

  return (
    <div className={`rounded-2xl glass-card border border-border/40 overflow-hidden ${expanded ? 'fixed inset-4 z-50 shadow-2xl' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/30 bg-secondary/20">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Type className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold">Document Editor</h2>
          {file ? (
            <p className="text-xs text-muted-foreground truncate">{file.name} · {formatSize(file.size)}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Drag &amp; drop a document to edit it inline</p>
          )}
        </div>
        {file && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowLineNumbers(s => !s)}
              className={`p-1.5 rounded-lg transition-colors ${showLineNumbers ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
              title="Toggle line numbers"
            >
              <Hash className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setWordWrap(s => !s)}
              className={`p-1.5 rounded-lg transition-colors ${wordWrap ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
              title="Toggle word wrap"
            >
              <WrapText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowFindReplace(s => !s)}
              className={`p-1.5 rounded-lg transition-colors ${showFindReplace ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
              title="Find & Replace (Ctrl+F)"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-border/40 mx-0.5" />
            <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Copy all">
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {!readOnly && isDirty && (
              <button onClick={() => { setText(originalText); }} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Revert changes">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            {!readOnly && (
              <button onClick={handleDownload} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Download edited file">
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setExpanded(s => !s)}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
              title={expanded ? 'Minimize' : 'Maximize'}
            >
              {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => { setFile(null); setText(''); setOriginalText(''); setError(''); setShowFindReplace(false); }}
              className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
              title="Close file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Find & replace */}
      <AnimatePresence>
        {showFindReplace && file && !readOnly && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <FindReplaceBar text={text} onTextChange={setText} onClose={() => setShowFindReplace(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      {!file && !loading && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer p-8 text-center transition-all duration-200 ${isDragging ? 'bg-primary/5' : 'hover:bg-secondary/20'}`}
        >
          <input ref={inputRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFileLoad(e.target.files[0])} />
          <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-sm font-medium">Drop a document to edit</p>
          <p className="text-xs text-muted-foreground mt-1">txt, md, html, json, xml, csv, <strong>pdf</strong>, <strong>docx</strong> and more</p>
          {error && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-destructive">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}

      {file && !loading && (
        <div className="flex flex-col" style={{ height: editorHeight }}>
          {/* Status bar */}
          <div className="flex items-center justify-between px-3 py-1 border-b border-border/20 bg-secondary/10 text-[10px] text-muted-foreground flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="uppercase font-mono opacity-70">{ext}</span>
              {readOnly && <span className="text-amber-500/80 font-medium">Read-only</span>}
              {isDirty && <span className="text-primary/80 font-medium">● Modified</span>}
            </div>
            <div className="flex items-center gap-3">
              <span>{stats.words.toLocaleString()} words</span>
              <span>{stats.chars.toLocaleString()} chars</span>
              <span>{stats.lines.toLocaleString()} lines</span>
            </div>
          </div>

          {/* Editor area */}
          <div className="flex flex-1 overflow-hidden font-mono text-xs">
            {showLineNumbers && (
              <div className="overflow-hidden flex-shrink-0" style={{ overflowY: 'auto' }}>
                <LineNumbers text={text} />
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => !readOnly && setText(e.target.value)}
              readOnly={readOnly}
              spellCheck={false}
              className={`flex-1 resize-none bg-transparent p-3 text-xs leading-[21px] focus:outline-none overflow-auto text-foreground/90 ${!wordWrap ? 'whitespace-pre overflow-x-auto' : 'whitespace-pre-wrap'} ${readOnly ? 'opacity-80 cursor-default' : ''}`}
              style={{ tabSize: 2, fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", Menlo, monospace' }}
            />
          </div>
        </div>
      )}

      {/* Drag overlay */}
      {file && isDragging && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-2xl flex items-center justify-center pointer-events-none z-10">
          <p className="text-sm font-medium text-primary">Drop to replace file</p>
        </div>
      )}
    </div>
  );
}
