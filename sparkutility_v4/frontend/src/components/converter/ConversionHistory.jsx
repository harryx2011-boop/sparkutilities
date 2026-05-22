import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Trash2, FileVideo, FileAudio, FileImage, FileText,
  CheckCircle2, ArrowRight, TrendingUp, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/conversionFormats';

const FILE_ICONS = {
  video:    FileVideo,
  audio:    FileAudio,
  image:    FileImage,
  document: FileText,
};

export default function ConversionHistory({ history, onClear }) {
  if (history.length === 0) return null;

  const handleReapply = (item, e) => {
    e.stopPropagation();
    if (!item.targetFormat || !item.category) return;
    window.dispatchEvent(new CustomEvent('sparkutility:reapply', {
      detail: {
        category:       item.category,
        targetFormat:   item.targetFormat,
        originalFormat: item.originalFormat || '',
      },
    }));
  };

  // Compute stats over the full persistent history
  const totalMB = history.reduce((acc, item) => acc + (item.originalSize || 0), 0) / (1024 * 1024);
  const formatCounts = {};
  history.forEach(item => {
    if (item.targetFormat) formatCounts[item.targetFormat] = (formatCounts[item.targetFormat] || 0) + 1;
  });
  const mostUsedFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock className="w-4 h-4 text-muted-foreground" />
          Conversion History
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
          onClick={onClear}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground bg-secondary/20 rounded-lg px-3 py-2 mb-3">
        <span className="flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3" />
          <span className="font-semibold text-foreground">{history.length}</span>
          {' '}conversion{history.length !== 1 ? 's' : ''}
        </span>
        <span className="opacity-40">·</span>
        <span>
          <span className="font-medium text-foreground">{totalMB.toFixed(1)} MB</span> processed
        </span>
        {mostUsedFormat && (
          <>
            <span className="opacity-40">·</span>
            <span>
              Top format:{' '}
              <span className="font-semibold text-primary">{mostUsedFormat}</span>
            </span>
          </>
        )}
      </div>

      {/* Entry list */}
      <div className="space-y-2">
        <AnimatePresence>
          {history.map((item) => {
            const Icon = FILE_ICONS[item.category] || FileText;
            return (
              <motion.div
                key={`${item.name}-${item.timestamp}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 text-sm flex-wrap"
              >
                <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate flex-1 text-foreground/80 min-w-0">{item.name}</span>

                <div className="flex items-center gap-1.5 text-xs ml-auto">
                  <span className="text-muted-foreground">{formatFileSize(item.originalSize)}</span>
                  <span className="uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded-md bg-secondary/80 text-foreground/60 font-semibold">
                    {item.originalFormat}
                  </span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground/60" />
                  {item.outputSize ? (
                    <span className={`font-medium ${item.outputSize < item.originalSize ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {formatFileSize(item.outputSize)}
                    </span>
                  ) : null}
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-primary/10">
                    {item.targetFormat}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={(e) => handleReapply(item, e)}
                  title={`Re-apply ${item.originalFormat || ''} → ${item.targetFormat} on the next matching file`}
                >
                  <RotateCcw className="w-3 h-3" />
                  Re-apply
                </Button>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
