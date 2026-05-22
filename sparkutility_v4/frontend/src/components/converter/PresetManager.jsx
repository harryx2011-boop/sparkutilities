import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Save, Trash2, Check, Share2, Download as DownloadIcon, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  listPresets,
  savePreset,
  deletePreset,
  exportPreset,
  decodeToken,
  importPresetFromToken,
} from '@/lib/presets';

export default function PresetManager({ category, current, onApply }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [presets, setPresets] = useState([]);
  const [savedTick, setSavedTick] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [importToken, setImportToken] = useState('');
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState('');

  const refresh = () => setPresets(listPresets(category));

  useEffect(() => {
    if (open) refresh();
  }, [open, category]);

  const handleSave = () => {
    if (!name.trim()) return;
    savePreset({
      name,
      category,
      targetFormat: current.targetFormat,
      compression: current.compression,
      settings: current.settings,
    });
    setName('');
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1200);
    refresh();
  };

  const handleApply = (preset) => {
    onApply(preset);
    setOpen(false);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    deletePreset(id);
    refresh();
  };

  const handleShare = async (id, e) => {
    e.stopPropagation();
    try {
      const token = exportPreset(id);
      await navigator.clipboard.writeText(token);
      setCopiedId(id);
      setTimeout(() => setCopiedId(c => (c === id ? null : c)), 1400);
    } catch {
      // Clipboard may be unavailable (insecure context). Fall back silently —
      // user can re-try; we keep the UI honest and don't pretend it copied.
      setCopiedId(null);
    }
  };

  const handlePreviewImport = () => {
    setImportError('');
    setImportPreview(null);
    if (!importToken.trim()) return;
    try {
      const decoded = decodeToken(importToken);
      setImportPreview(decoded);
    } catch (err) {
      setImportError(err?.message || 'Invalid token');
    }
  };

  const handleConfirmImport = () => {
    setImportError('');
    try {
      importPresetFromToken(importToken);
      setImportToken('');
      setImportPreview(null);
      refresh();
    } catch (err) {
      setImportError(err?.message || 'Import failed');
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(o => !o)}
        title="Conversion presets"
      >
        <Bookmark className="w-3.5 h-3.5" />
        Presets
      </Button>

      <AnimatePresence>
        {open && (
          <>
            {/* Click-away overlay */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 w-72 rounded-xl border border-border/60 bg-popover shadow-xl z-50 overflow-hidden"
            >
              <div className="p-2 border-b border-border/50 flex items-center gap-1.5">
                <Input
                  value={name}
                  onChange={e => setName(e.target.value.slice(0, 60))}
                  placeholder="Preset name"
                  className="h-7 text-xs"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleSave}
                  disabled={!name.trim()}
                  title="Save current settings"
                >
                  {savedTick ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                </Button>
              </div>

              <div className="max-h-56 overflow-y-auto p-1">
                {presets.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-3 px-2">
                    No saved presets yet. Configure settings, name it, and hit save.
                  </p>
                ) : (
                  presets.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-md hover:bg-secondary/50 group"
                    >
                      <button
                        onClick={() => handleApply(p)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-xs font-medium truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {p.targetFormat || 'any'} · {p.compression}
                        </p>
                      </button>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleShare(p.id, e)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleShare(p.id, e); }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity p-1"
                        title="Copy share token"
                      >
                        {copiedId === p.id ? <Check className="w-3 h-3 text-green-500" /> : <Share2 className="w-3 h-3" />}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleDelete(p.id, e)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDelete(p.id, e); }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1"
                        title="Delete preset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Import section */}
              <div className="border-t border-border/50 p-2 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-0.5">
                  Import preset
                </p>
                <div className="flex items-center gap-1.5">
                  <Input
                    value={importToken}
                    onChange={e => {
                      setImportToken(e.target.value);
                      setImportPreview(null);
                      setImportError('');
                    }}
                    placeholder="Paste token"
                    className="h-7 text-[11px] font-mono"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (importPreview) handleConfirmImport();
                        else handlePreviewImport();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={handlePreviewImport}
                    disabled={!importToken.trim()}
                    title="Preview token"
                  >
                    <DownloadIcon className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {importError && (
                  <div className="flex items-start gap-1 text-[10px] text-destructive">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                {importPreview && !importError && (
                  <div className="rounded-md bg-secondary/40 border border-border/40 p-1.5 space-y-1">
                    <p className="text-[11px] text-foreground/90">
                      Preset <span className="font-semibold">&quot;{importPreview.name}&quot;</span>
                      {' '}({importPreview.targetFormat || 'any'}, {importPreview.compression}) ready to import.
                    </p>
                    {importPreview.category !== category && (
                      <p className="text-[10px] text-yellow-500">
                        Note: this preset is for {importPreview.category}, current category is {category}.
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="h-6 w-full text-[11px] gap-1"
                      onClick={handleConfirmImport}
                    >
                      <Check className="w-3 h-3" />
                      Confirm import
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
