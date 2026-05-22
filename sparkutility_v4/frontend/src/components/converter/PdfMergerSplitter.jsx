import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FilePlus2, Scissors, Upload, Trash2, GripVertical, Download, Loader2, CheckCircle2,
  AlertCircle, FileText, X,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function getPdfLib() {
  const mod = await import('pdf-lib');
  return mod;
}

async function getPdfJs() {
  const mod = await import('pdfjs-dist/build/pdf.mjs');
  try {
    const wUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
    mod.GlobalWorkerOptions.workerSrc = wUrl;
  } catch {
    mod.GlobalWorkerOptions.workerSrc = '';
  }
  return mod;
}

async function getPageCount(file) {
  const pdfjs = await getPdfJs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const n = doc.numPages;
  doc.destroy?.();
  return n;
}

function parseSplitRanges(input, totalPages) {
  // Accepts: "1-3, 5, 7-10" → [[1,3],[5,5],[7,10]]
  const ranges = [];
  const parts = input.split(',').map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return null;
    const a = parseInt(m[1], 10);
    const b = m[2] ? parseInt(m[2], 10) : a;
    if (a < 1 || b < a || b > totalPages) return null;
    ranges.push([a, b]);
  }
  return ranges.length ? ranges : null;
}

// ── PDF Entry (for merge list) ────────────────────────────────────────────────

function PdfEntry({ entry, index, onRemove, dragHandleProps }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl glass-card group">
      <div {...dragHandleProps} className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground transition-colors flex-shrink-0">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FileText className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{entry.file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatSize(entry.file.size)}
          {entry.pageCount ? ` · ${entry.pageCount} page${entry.pageCount !== 1 ? 's' : ''}` : ''}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] flex-shrink-0">#{index + 1}</Badge>
      <button
        onClick={() => onRemove(entry.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PdfMergerSplitter() {
  const [mode, setMode] = useState('merge'); // 'merge' | 'split'

  // ── Merge state ──────────────────────────────────────────────────────────
  const [mergeFiles, setMergeFiles] = useState([]);
  const [mergeStatus, setMergeStatus] = useState('idle'); // idle | working | done | error
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergeError, setMergeError] = useState('');
  const mergeOutputRef = useRef(null);
  const mergeInputRef = useRef(null);

  // ── Split state ──────────────────────────────────────────────────────────
  const [splitFile, setSplitFile] = useState(null);
  const [splitPageCount, setSplitPageCount] = useState(0);
  const [splitMode, setSplitMode] = useState('each'); // 'each' | 'range' | 'half'
  const [splitRanges, setSplitRanges] = useState('');
  const [splitStatus, setSplitStatus] = useState('idle');
  const [splitProgress, setSplitProgress] = useState(0);
  const [splitError, setSplitError] = useState('');
  const splitInputRef = useRef(null);

  // ── Merge handlers ───────────────────────────────────────────────────────

  const handleMergeFilesAdded = useCallback(async (fileList) => {
    const pdfs = Array.from(fileList).filter(f =>
      f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf'
    );
    if (!pdfs.length) return;
    const entries = await Promise.all(pdfs.map(async f => {
      let pageCount = null;
      try { pageCount = await getPageCount(f); } catch { /* ignore */ }
      return { id: `${f.name}-${Date.now()}-${Math.random()}`, file: f, pageCount };
    }));
    setMergeFiles(prev => [...prev, ...entries]);
    setMergeStatus('idle');
  }, []);

  const handleMergeDrop = useCallback((e) => {
    e.preventDefault();
    handleMergeFilesAdded(e.dataTransfer.files);
  }, [handleMergeFilesAdded]);

  const handleMergeDragEnd = useCallback((result) => {
    if (!result.destination) return;
    setMergeFiles(prev => {
      const next = [...prev];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      return next;
    });
  }, []);

  const handleMerge = useCallback(async () => {
    if (mergeFiles.length < 2) return;
    setMergeStatus('working');
    setMergeProgress(0);
    setMergeError('');
    try {
      const { PDFDocument } = await getPdfLib();
      const merged = await PDFDocument.create();
      for (let i = 0; i < mergeFiles.length; i++) {
        const buf = await mergeFiles[i].file.arrayBuffer();
        const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
        const pages = await merged.copyPages(srcDoc, srcDoc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        setMergeProgress(Math.round(((i + 1) / mergeFiles.length) * 90));
      }
      const bytes = await merged.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      mergeOutputRef.current = { blob, filename: `merged-${Date.now()}.pdf` };
      setMergeProgress(100);
      setMergeStatus('done');
    } catch (err) {
      setMergeError(err.message || 'Merge failed');
      setMergeStatus('error');
    }
  }, [mergeFiles]);

  const handleMergeDownload = useCallback(() => {
    const out = mergeOutputRef.current;
    if (!out) return;
    const url = URL.createObjectURL(out.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = out.filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, []);

  // ── Split handlers ───────────────────────────────────────────────────────

  const handleSplitFileAdded = useCallback(async (fileList) => {
    const f = Array.from(fileList).find(x =>
      x.name.toLowerCase().endsWith('.pdf') || x.type === 'application/pdf'
    );
    if (!f) return;
    setSplitFile(f);
    setSplitStatus('idle');
    setSplitError('');
    try {
      const n = await getPageCount(f);
      setSplitPageCount(n);
    } catch {
      setSplitPageCount(0);
    }
  }, []);

  const handleSplit = useCallback(async () => {
    if (!splitFile) return;
    setSplitStatus('working');
    setSplitProgress(0);
    setSplitError('');
    try {
      const { PDFDocument } = await getPdfLib();
      const buf = await splitFile.arrayBuffer();
      const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const total = srcDoc.getPageCount();

      let ranges = [];
      if (splitMode === 'each') {
        ranges = Array.from({ length: total }, (_, i) => [i + 1, i + 1]);
      } else if (splitMode === 'half') {
        const mid = Math.ceil(total / 2);
        ranges = [[1, mid], [mid + 1, total]];
      } else if (splitMode === 'range') {
        const parsed = parseSplitRanges(splitRanges, total);
        if (!parsed) throw new Error('Invalid range format. Use e.g. "1-3, 5, 7-10"');
        ranges = parsed;
      }

      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const baseName = splitFile.name.replace(/\.pdf$/i, '');

      for (let i = 0; i < ranges.length; i++) {
        const [from, to] = ranges[i];
        const newDoc = await PDFDocument.create();
        const pages = await newDoc.copyPages(srcDoc, Array.from({ length: to - from + 1 }, (_, k) => from - 1 + k));
        pages.forEach(p => newDoc.addPage(p));
        const bytes = await newDoc.save();
        const label = ranges.length === 1 ? '' : `-part${i + 1}`;
        const fname = ranges[i][0] === ranges[i][1]
          ? `${baseName}-p${ranges[i][0]}.pdf`
          : `${baseName}-p${from}-${to}${label}.pdf`;
        zip.file(fname, bytes);
        setSplitProgress(Math.round(((i + 1) / ranges.length) * 90));
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      setSplitProgress(100);
      setSplitStatus('done');

      // Auto-download
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}-split-${Date.now()}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setSplitError(err.message || 'Split failed');
      setSplitStatus('error');
    }
  }, [splitFile, splitMode, splitRanges]);

  // ── Range validation ─────────────────────────────────────────────────────
  const rangesValid = splitMode !== 'range' || !!parseSplitRanges(splitRanges, splitPageCount);

  return (
    <div className="rounded-2xl glass-card border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/30 bg-secondary/20">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">PDF Merger &amp; Splitter</h2>
          <p className="text-xs text-muted-foreground">Combine or divide PDF files — 100% local</p>
        </div>
        {/* Mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/60">
          <button
            onClick={() => setMode('merge')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'merge' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            Merge
          </button>
          <button
            onClick={() => setMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'split' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Scissors className="w-3.5 h-3.5" />
            Split
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <AnimatePresence mode="wait">

          {/* ── MERGE MODE ── */}
          {mode === 'merge' && (
            <motion.div key="merge" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleMergeDrop}
                onClick={() => mergeInputRef.current?.click()}
                className="relative cursor-pointer rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-secondary/20 transition-all duration-200 p-6 text-center"
              >
                <input ref={mergeInputRef} type="file" multiple accept=".pdf,application/pdf" className="hidden" onChange={e => handleMergeFilesAdded(e.target.files)} />
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Drop PDFs here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Add as many PDFs as you need — drag to reorder</p>
              </div>

              {/* File list */}
              {mergeFiles.length > 0 && (
                <DragDropContext onDragEnd={handleMergeDragEnd}>
                  <Droppable droppableId="merge-list">
                    {provided => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                        {mergeFiles.map((entry, index) => (
                          <Draggable key={entry.id} draggableId={entry.id} index={index}>
                            {drag => (
                              <div ref={drag.innerRef} {...drag.draggableProps}>
                                <PdfEntry
                                  entry={entry}
                                  index={index}
                                  onRemove={id => setMergeFiles(p => p.filter(x => x.id !== id))}
                                  dragHandleProps={drag.dragHandleProps}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}

              {/* Actions */}
              {mergeFiles.length >= 2 && (
                <div className="space-y-3">
                  {mergeStatus === 'working' && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Merging {mergeFiles.length} PDFs…</span>
                        <span>{mergeProgress}%</span>
                      </div>
                      <Progress value={mergeProgress} className="h-1.5" />
                    </div>
                  )}
                  {mergeStatus === 'error' && (
                    <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {mergeError}
                    </div>
                  )}
                  <div className="flex items-center gap-2 justify-between">
                    <button
                      onClick={() => setMergeFiles([])}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Clear all
                    </button>
                    <div className="flex items-center gap-2">
                      {mergeStatus === 'done' && (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10" onClick={handleMergeDownload}>
                          <Download className="w-3.5 h-3.5" /> Download merged PDF
                        </Button>
                      )}
                      <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleMerge} disabled={mergeStatus === 'working'}>
                        {mergeStatus === 'working' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus2 className="w-3.5 h-3.5" />}
                        {mergeStatus === 'working' ? 'Merging…' : mergeStatus === 'done' ? 'Re-merge' : `Merge ${mergeFiles.length} PDFs`}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {mergeFiles.length === 1 && (
                <p className="text-xs text-muted-foreground text-center py-1">Add at least one more PDF to merge</p>
              )}
            </motion.div>
          )}

          {/* ── SPLIT MODE ── */}
          {mode === 'split' && (
            <motion.div key="split" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleSplitFileAdded(e.dataTransfer.files); }}
                onClick={() => splitInputRef.current?.click()}
                className="relative cursor-pointer rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-secondary/20 transition-all duration-200 p-6 text-center"
              >
                <input ref={splitInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => handleSplitFileAdded(e.target.files)} />
                {splitFile ? (
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{splitFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(splitFile.size)}{splitPageCount ? ` · ${splitPageCount} pages` : ''}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setSplitFile(null); setSplitPageCount(0); setSplitStatus('idle'); }} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Scissors className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">Drop a PDF here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">Choose how to split it below</p>
                  </>
                )}
              </div>

              {/* Split options */}
              {splitFile && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Split method</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'each', label: 'Every page', desc: `${splitPageCount} files` },
                      { key: 'half', label: 'Split in half', desc: '2 files' },
                      { key: 'range', label: 'Custom ranges', desc: 'You choose' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setSplitMode(opt.key)}
                        className={`p-3 rounded-xl border text-left transition-all duration-200 ${splitMode === opt.key ? 'border-primary/50 bg-primary/5' : 'border-border/40 hover:border-border hover:bg-secondary/30'}`}
                      >
                        <p className={`text-xs font-medium ${splitMode === opt.key ? 'text-primary' : ''}`}>{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>

                  {splitMode === 'range' && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">Page ranges <span className="opacity-60">(e.g. 1-3, 5, 7-10)</span></label>
                      <input
                        type="text"
                        value={splitRanges}
                        onChange={e => setSplitRanges(e.target.value)}
                        placeholder={`1-${Math.ceil(splitPageCount / 2)}, ${Math.ceil(splitPageCount / 2) + 1}-${splitPageCount}`}
                        className={`w-full px-3 py-2 rounded-lg text-sm border bg-background transition-colors focus:outline-none focus:ring-1 focus:ring-primary ${!rangesValid && splitRanges ? 'border-destructive' : 'border-border/60'}`}
                      />
                      {!rangesValid && splitRanges && (
                        <p className="text-xs text-destructive">Invalid range — check page numbers (max: {splitPageCount})</p>
                      )}
                    </div>
                  )}

                  {splitStatus === 'working' && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Splitting…</span>
                        <span>{splitProgress}%</span>
                      </div>
                      <Progress value={splitProgress} className="h-1.5" />
                    </div>
                  )}

                  {splitStatus === 'error' && (
                    <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {splitError}
                    </div>
                  )}

                  {splitStatus === 'done' && (
                    <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      Split complete — ZIP downloaded automatically.
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      onClick={handleSplit}
                      disabled={splitStatus === 'working' || (splitMode === 'range' && !rangesValid)}
                    >
                      {splitStatus === 'working' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                      {splitStatus === 'working' ? 'Splitting…' : 'Split PDF'}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
