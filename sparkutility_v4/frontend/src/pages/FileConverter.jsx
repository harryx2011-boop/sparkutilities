import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast, { Toaster as HotToaster } from 'react-hot-toast';
import { Play, Trash2, Keyboard, Archive, RotateCcw, X, Clipboard } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import HeroSection from '@/components/converter/HeroSection';
import DropZone from '@/components/converter/Dropzone';
import ConversionCard from '@/components/converter/ConversionCard';
import ConversionHistory from '@/components/converter/ConversionHistory';
import MemoryWarning from '@/components/converter/MemoryWarning';
import IsolationNotice from '@/components/converter/IsolationNotice';
import EngineStatus from '@/components/converter/EngineStatus';
import PdfMergerSplitter from '@/components/converter/PdfMergerSplitter';
import DocumentEditor from '@/components/converter/DocumentEditor';
import { Button } from '@/components/ui/button';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { getFileCategory } from '@/lib/conversionFormats';
import { useSettings } from '@/context/SettingsContext';
import { useSidebar } from '@/context/SidebarContext';

const HISTORY_KEY    = 'sparkutility_history_v1';
const HISTORY_CAP    = 500;

export default function FileConverter() {
  const { settings } = useSettings();
  const { registerWorkflow, unregisterWorkflow } = useSidebar();
  const [files, setFiles]           = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [doneIds, setDoneIds]       = useState(() => new Set());
  const [batching, setBatching]     = useState(false);
  const [zipping, setZipping]       = useState(false);
  const cardRefs = useRef(new Map());

  // ── Re-apply intent (from ConversionHistory "Re-apply" button) ────────────
  // When the user clicks "Re-apply" on a past conversion, we stash the desired
  // category + targetFormat here so the next dropped file in that category gets
  // its ConversionCard pre-selected. The intent is single-shot: it clears as
  // soon as a matching file is queued, or the user dismisses the banner.
  const [pendingReapply, setPendingReapply] = useState(null);
  // initialTargetByFileId tells each ConversionCard which target to seed; we
  // delete the entry after read so re-mounts don't keep re-seeding.
  const initialTargetByFileIdRef = useRef(new Map());

  // ── Dropzone pulse (Ctrl+V visual feedback) ───────────────────────────────
  const [pastePulse, setPastePulse] = useState(false);

  // Report batch conversion activity to the sidebar
  useEffect(() => {
    if (batching) {
      registerWorkflow('file-converter', { label: 'File Converter', indeterminate: true });
    } else {
      unregisterWorkflow('file-converter');
    }
  }, [batching, registerWorkflow, unregisterWorkflow]);

  // ── Windows Explorer / OS "Open with" integration ─────────────────────────
  // When the installed PWA is launched as a file handler (right-click → Open
  // with → SparkUtilities), Chromium fires window.launchQueue with handles for
  // every selected file. We pull them into the converter queue automatically.
  useEffect(() => {
    if (!('launchQueue' in window)) return;
    window.launchQueue.setConsumer(async (params) => {
      if (!params?.files?.length) return;
      const incoming = [];
      for (const handle of params.files) {
        try {
          const file = await handle.getFile();
          if (file) incoming.push(file);
        } catch { /* permission revoked or handle expired — skip */ }
      }
      if (incoming.length) {
        const entries = incoming.map(f => ({
          id:       `${f.name}-${Date.now()}-${Math.random()}`,
          file:     f,
          category: getFileCategory(f),
        }));
        setFiles(prev => [...prev, ...entries]);
      }
    });
  }, []);

  // ── Re-apply broadcast listener ──────────────────────────────────────────
  // ConversionHistory dispatches `sparkutility:reapply` with the past entry's
  // category + targetFormat. We stash it as a pending intent; the next
  // matching file that lands in the queue gets its target pre-selected.
  useEffect(() => {
    const onReapply = (e) => {
      const { category, targetFormat, originalFormat } = e.detail || {};
      if (!category || !targetFormat) return;
      setPendingReapply({ category, targetFormat, originalFormat: originalFormat || '' });
    };
    window.addEventListener('sparkutility:reapply', onReapply);
    return () => window.removeEventListener('sparkutility:reapply', onReapply);
  }, []);

  const handleFilesAdded = useCallback((newFiles) => {
    const fileEntries = newFiles.map(f => ({
      id:       `${f.name}-${Date.now()}-${Math.random()}`,
      file:     f,
      category: getFileCategory(f),
    }));

    // Consume pending re-apply intent: seed the first matching-category file
    // with the requested target format, then clear the intent.
    setPendingReapply(intent => {
      if (!intent) return null;
      const match = fileEntries.find(e => e.category === intent.category);
      if (!match) return intent; // keep intent alive — no matching file yet
      initialTargetByFileIdRef.current.set(match.id, intent.targetFormat);
      return null;
    });

    setFiles(prev => [...prev, ...fileEntries]);
  }, []);

  // ── Paste-to-Convert (Ctrl+V) ────────────────────────────────────────────
  // Listens for paste events while this route is mounted and pulls in:
  //   1) files from clipboardData.files (e.g. copied from Explorer)
  //   2) image data from clipboardData.items (e.g. Win+Shift+S screenshot)
  //   3) a single-line http(s) URL — fetched, gated to image/video/audio MIME
  // Ignores paste events originating in inputs / textareas / contentEditable
  // so the existing PresetManager / FormatCombobox inputs still work normally.
  useEffect(() => {
    const isEditableTarget = (t) => {
      if (!t) return false;
      const tag = t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (t.isContentEditable) return true;
      return false;
    };

    const triggerPulse = () => {
      setPastePulse(true);
      setTimeout(() => setPastePulse(false), 700);
    };

    const onPaste = async (e) => {
      if (isEditableTarget(e.target)) return;
      const cd = e.clipboardData;
      if (!cd) return;

      // (1) Direct files (e.g. Explorer copy)
      if (cd.files && cd.files.length > 0) {
        e.preventDefault();
        triggerPulse();
        handleFilesAdded(Array.from(cd.files));
        return;
      }

      // (2) image/* clipboard items
      if (cd.items && cd.items.length > 0) {
        const imageFiles = [];
        for (const item of cd.items) {
          if (item.kind === 'file' && item.type && item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (blob) {
              const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
              const named = new File(
                [blob],
                `clipboard-image-${Date.now()}.${ext}`,
                { type: blob.type, lastModified: Date.now() },
              );
              imageFiles.push(named);
            }
          }
        }
        if (imageFiles.length > 0) {
          e.preventDefault();
          triggerPulse();
          handleFilesAdded(imageFiles);
          return;
        }
      }

      // (3) Plain-text URL
      const text = cd.getData ? cd.getData('text/plain') : '';
      if (text) {
        const trimmed = text.trim();
        // Single line, parses as http(s) URL
        if (!trimmed.includes('\n') && !trimmed.includes('\r')) {
          let url;
          try { url = new URL(trimmed); } catch { return; }
          if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
          e.preventDefault();
          triggerPulse();
          const toastId = toast.loading('Fetching from URL...');
          try {
            const resp = await fetch(trimmed, { mode: 'cors' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const ctype = (resp.headers.get('content-type') || '').toLowerCase();
            const isMedia =
              ctype.startsWith('image/') ||
              ctype.startsWith('video/') ||
              ctype.startsWith('audio/');
            if (!isMedia) {
              throw new Error(`Unsupported content-type: ${ctype || 'unknown'}`);
            }
            const blob = await resp.blob();
            // Derive filename: last path segment, or content-type extension
            const lastSeg = url.pathname.split('/').filter(Boolean).pop() || '';
            const hasExt = lastSeg.includes('.');
            const ext = hasExt
              ? lastSeg.split('.').pop()
              : (ctype.split('/')[1] || 'bin').split(';')[0];
            const filename = hasExt
              ? lastSeg
              : `clipboard-url-${Date.now()}.${ext}`;
            const file = new File([blob], filename, { type: ctype, lastModified: Date.now() });
            handleFilesAdded([file]);
            toast.success(`Queued ${filename}`, { id: toastId });
          } catch (err) {
            toast.error(`Failed to fetch URL: ${err?.message || err}`, { id: toastId });
          }
        }
      }
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [handleFilesAdded]);

  // True when at least one queued file is a document — gates the document tools
  const hasDocuments = files.some(f => f.category === 'document');

  // ── Persistent history ────────────────────────────────────────────────────
  const [history, setHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch { /* storage quota exceeded — silently ignore */ }
  }, [history]);

  // ── File management ───────────────────────────────────────────────────────
  const handleRemove = useCallback((fileToRemove) => {
    setFiles(prev => {
      const next = prev.filter(f => f.file !== fileToRemove);
      const remainingIds = new Set(next.map(f => f.id));
      setSelectedIds(curr => {
        const out = new Set();
        curr.forEach(id => { if (remainingIds.has(id)) out.add(id); });
        return out;
      });
      setDoneIds(curr => {
        const out = new Set();
        curr.forEach(id => { if (remainingIds.has(id)) out.add(id); });
        return out;
      });
      return next;
    });
  }, []);

  const handleConvert = useCallback(({ file, targetFormat, outputSize }) => {
    const entry = files.find(f => f.file === file);
    const originalFormat = (file.name.split('.').pop() || '').toUpperCase();
    if (entry) setDoneIds(curr => new Set([...curr, entry.id]));
    setHistory(h => [{
      name:         file.name,
      originalSize: file.size,
      outputSize:   outputSize || null,
      originalFormat,
      category:     entry?.category || 'video',
      targetFormat,
      timestamp:    Date.now(),
    }, ...h].slice(0, HISTORY_CAP));
  }, [files]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
  }, []);

  // ── Selection ─────────────────────────────────────────────────────────────
  const handleSelect = useCallback((file) => {
    const entry = files.find(f => f.file === file);
    if (!entry) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(entry.id)) next.delete(entry.id);
      else next.add(entry.id);
      return next;
    });
  }, [files]);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const setCardRef = useCallback((id) => (instance) => {
    if (instance) cardRefs.current.set(id, instance);
    else cardRefs.current.delete(id);
  }, []);

  // ── Batch convert ─────────────────────────────────────────────────────────
  // Parallel two-lane scheduler:
  //   • Fast lane (GPU image / SVG / document) — fully concurrent. These
  //     paths are bounded by GPU throughput or pure-JS string work and don't
  //     compete with each other for the same FFmpeg WASM heap, so running
  //     them in parallel is essentially free.
  //   • Slow lane (FFmpeg, multi- or single-threaded) — capped concurrency.
  //     Each FFmpeg job already uses every CPU thread when running mt, so
  //     running more than ~2 concurrent jobs just contends for the same
  //     cores and balloons WASM memory. Cap at MAX_FFMPEG_CONCURRENT (=2)
  //     so the second video starts the moment the first finishes without
  //     stalling the GPU lane.
  // Net effect: a queue of (video.mp4, image.png, image.jpg, video.mov)
  // converts in roughly max(t_video1 + t_video2, t_image1 + t_image2)
  // wall time instead of the old strictly-sequential sum.
  const MAX_FFMPEG_CONCURRENT = 2;
  const runBatch = useCallback(async () => {
    if (batching) return;
    setBatching(true);
    try {
      const cards = [...cardRefs.current.values()].filter(c => c.canConvert?.());
      const fastLane = [];
      const slowLane = [];
      for (const card of cards) {
        const hint = card.getEngineHint?.();
        if (hint === 'mt' || hint === 'st') slowLane.push(card);
        else fastLane.push(card);
      }
      // Slow-lane worker: pulls one card at a time off the slowLane queue.
      // Running MAX_FFMPEG_CONCURRENT of these in parallel gives us the
      // pipelining we want without thrashing the FFmpeg WASM heap.
      const slowQueue = [...slowLane];
      const slowWorker = async () => {
        while (slowQueue.length) {
          const card = slowQueue.shift();
          if (card) await card.convert();
        }
      };
      await Promise.all([
        // Fast lane: every GPU/SVG/document card concurrently
        ...fastLane.map(c => c.convert()),
        // Slow lane: capped concurrency
        ...Array.from({ length: Math.min(MAX_FFMPEG_CONCURRENT, slowLane.length) }, slowWorker),
      ]);
    } finally {
      setBatching(false);
    }
  }, [batching]);

  // ── Remove selected / last ────────────────────────────────────────────────
  const removeSelected = useCallback(() => {
    if (selectedIds.size === 0) {
      setFiles(prev => (prev.length === 0 ? prev : prev.slice(0, -1)));
      return;
    }
    setFiles(prev => prev.filter(entry => !selectedIds.has(entry.id)));
    setSelectedIds(new Set());
  }, [selectedIds]);

  // ── Drag-to-reorder ───────────────────────────────────────────────────────
  const handleDragEnd = useCallback((result) => {
    if (!result.destination) return;
    setFiles(prev => {
      const next = [...prev];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      return next;
    });
  }, []);

  // ── Download all as ZIP ───────────────────────────────────────────────────
  const handleDownloadAllZip = useCallback(async () => {
    if (zipping) return;
    setZipping(true);
    try {
      const outputs = [];
      for (const entry of files) {
        const card = cardRefs.current.get(entry.id);
        const out  = card?.getOutput?.();
        if (out) outputs.push(out);
      }
      if (outputs.length === 0) return;

      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const { filename, data } of outputs) {
        zip.file(filename, data.buffer ?? data);
      }
      const blob = await zip.generateAsync({
        type:                'blob',
        compression:         'DEFLATE',
        compressionOptions:  { level: 6 },
      });
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download  = `sparkutilities-batch-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setZipping(false);
    }
  }, [zipping, files]);

  const kb = settings.keybinds ?? {};
  useKeyboardShortcuts({
    [kb.convertFiles   ?? 'Space']:     () => runBatch(),
    [kb.deleteFile     ?? 'Delete']:    removeSelected,
    'Backspace':                        removeSelected,
    [kb.clearSelection ?? 'Escape']:    () => setSelectedIds(new Set()),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <HotToaster position="bottom-right" toastOptions={{ duration: 4000 }} />
      <HeroSection />

      <section className="space-y-6">
        <IsolationNotice />
        <MemoryWarning />

        <div className="flex justify-end">
          <EngineStatus />
        </div>

        <AnimatePresence>
          {pendingReapply && (
            <motion.div
              key="reapply-banner"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 px-3 py-2 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary self-start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>
                Re-applying{' '}
                <span className="font-semibold uppercase tracking-wider">
                  {pendingReapply.originalFormat || pendingReapply.category}
                </span>
                {' → '}
                <span className="font-semibold uppercase tracking-wider">
                  {pendingReapply.targetFormat}
                </span>
                . Drop a matching file to convert.
              </span>
              <button
                type="button"
                onClick={() => setPendingReapply(null)}
                className="ml-1 p-0.5 rounded-full hover:bg-primary/20 text-primary/80 hover:text-primary transition-colors"
                aria-label="Dismiss re-apply intent"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={pastePulse ? { scale: [1, 1.01, 1], opacity: [1, 0.92, 1] } : { scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <DropZone onFilesAdded={handleFilesAdded} />
          <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/70">
            <Clipboard className="w-3 h-3" />
            <span>Paste from clipboard with</span>
            <kbd className="px-1 rounded bg-secondary border border-border/50 font-mono">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1 rounded bg-secondary border border-border/50 font-mono">V</kbd>
            <span>— files, screenshots, or media URLs.</span>
          </div>
        </motion.div>

        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl glass-card"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  <span className="text-foreground font-semibold">{files.length}</span> queued
                  {selectedIds.size > 0 && (
                    <> · <span className="text-primary font-semibold">{selectedIds.size}</span> selected</>
                  )}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 ml-2 text-[10px] opacity-70">
                  <Keyboard className="w-3 h-3" />
                  <kbd className="px-1 rounded bg-secondary border border-border/50 font-mono">Space</kbd>
                  <span>convert all</span>
                  <kbd className="ml-1 px-1 rounded bg-secondary border border-border/50 font-mono">Del</kbd>
                  <span>remove</span>
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {doneIds.size >= 2 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                    onClick={handleDownloadAllZip}
                    disabled={zipping}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    {zipping ? 'Zipping…' : `Download ${doneIds.size} as ZIP`}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={removeSelected}
                  disabled={files.length === 0}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {selectedIds.size > 0 ? `Remove ${selectedIds.size}` : 'Remove last'}
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={runBatch}
                  disabled={batching}
                >
                  <Play className="w-3.5 h-3.5" />
                  {batching ? 'Converting…' : 'Convert all'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File queue with drag-to-reorder */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="file-queue">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-3"
              >
                <AnimatePresence>
                  {files.map((entry, index) => {
                    // Pull-once: any re-apply target seeded for this id is
                    // consumed at mount so re-renders don't re-overwrite the
                    // user's later format choices.
                    const seedMap = initialTargetByFileIdRef.current;
                    const seed = seedMap.get(entry.id) || '';
                    if (seed) seedMap.delete(entry.id);
                    return (
                      <Draggable key={entry.id} draggableId={entry.id} index={index}>
                        {(drag) => (
                          <div ref={drag.innerRef} {...drag.draggableProps}>
                            <ConversionCard
                              ref={setCardRef(entry.id)}
                              file={entry.file}
                              category={entry.category}
                              selected={selectedIds.has(entry.id)}
                              onSelect={handleSelect}
                              onRemove={handleRemove}
                              onConvert={handleConvert}
                              dragHandleProps={drag.dragHandleProps}
                              initialTargetFormat={seed}
                            />
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                </AnimatePresence>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* ── Document tools — only shown when a document file is queued ── */}
        <AnimatePresence>
        {hasDocuments && (
          <>
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="flex items-center gap-2 px-1">
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Document Tools</span>
                <div className="flex-1 h-px bg-border/40" />
              </div>
            </motion.div>
            <PdfMergerSplitter />

            <DocumentEditor />
          </>
        )}
        </AnimatePresence>

        <ConversionHistory history={history} onClear={handleClearHistory} />
      </section>
    </div>
  );
}
