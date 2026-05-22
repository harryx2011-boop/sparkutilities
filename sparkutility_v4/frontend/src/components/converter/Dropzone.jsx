import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileUp, FolderOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ALL_ACCEPTS, ALL_MIME_TYPES } from '@/lib/conversionFormats';

export default function DropZone({ onFilesAdded }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFilesAdded(files);
  }, [onFilesAdded]);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) onFilesAdded(files);
    e.target.value = '';
  };

  // Compact summary of supported extensions, deduped.
  const supportSummary = (() => {
    const exts = new Set(
      ALL_ACCEPTS.split(',').map(s => s.trim().replace(/^\./, '').toUpperCase()),
    );
    return Array.from(exts).slice(0, 18).join(', ') + '...';
  })();

  return (
    <motion.div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-8 sm:p-12 text-center group ${
        isDragging
          ? 'border-primary bg-primary/5 glow'
          : 'border-border/60 hover:border-primary/50 hover:bg-secondary/30'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALL_MIME_TYPES}
        onChange={handleChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={isDragging ? 'dragging' : 'idle'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex flex-col items-center gap-4"
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            isDragging ? 'bg-primary/20 glow' : 'bg-secondary group-hover:bg-primary/10'
          }`}>
            {isDragging ? (
              <FileUp className="w-7 h-7 text-primary animate-bounce" />
            ) : (
              <div className="flex items-center gap-1">
                <FolderOpen className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            )}
          </div>
          <div>
            <p className="text-base font-medium text-foreground">
              {isDragging ? 'Drop files here' : 'Drag & drop any file or click to browse'}
            </p>
            <p className="text-sm text-muted-foreground mt-1.5">
              We&apos;ll detect the file type automatically — videos, audio, images, documents.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Supports: {supportSummary}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
