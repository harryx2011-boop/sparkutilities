import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Scale, Gem } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OPTIONS = [
  {
    key: 'compact',
    label: 'Compact',
    description: 'Smallest file size',
    icon: Zap,
    sizeFactor: 0.45,
    colors: 'from-orange-500/20 to-red-500/20 border-orange-500/30 hover:border-orange-500/60',
    activeColors: 'from-orange-500/30 to-red-500/30 border-orange-500 shadow-orange-500/20',
    iconColor: 'text-orange-400',
    accentColor: 'text-orange-400',
  },
  {
    key: 'balanced',
    label: 'Balanced',
    description: 'Quality & size',
    icon: Scale,
    sizeFactor: 0.70,
    colors: 'from-primary/20 to-accent/20 border-primary/30 hover:border-primary/60',
    activeColors: 'from-primary/30 to-accent/30 border-primary shadow-primary/20',
    iconColor: 'text-primary',
    accentColor: 'text-primary',
  },
  {
    key: 'lossless',
    label: 'Lossless',
    description: 'Perfect quality',
    icon: Gem,
    sizeFactor: 0.95,
    colors: 'from-emerald-500/20 to-cyan-500/20 border-emerald-500/30 hover:border-emerald-500/60',
    activeColors: 'from-emerald-500/30 to-cyan-500/30 border-emerald-500 shadow-emerald-500/20',
    iconColor: 'text-emerald-400',
    accentColor: 'text-emerald-400',
  },
];

function formatEstimatedSize(bytes, factor) {
  const est = bytes * factor;
  if (est < 1024)        return `${Math.round(est)} B`;
  if (est < 1024 * 1024) return `${(est / 1024).toFixed(1)} KB`;
  return `${(est / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CompressionOptions({ value, onChange, fileSize }) {
  const [open, setOpen] = useState(false);

  const active = OPTIONS.find(o => o.key === value);
  const hasSelection = !!active;
  const estimatedSize = (hasSelection && fileSize > 0)
    ? formatEstimatedSize(fileSize, active.sizeFactor)
    : null;

  return (
    <div className="mt-3">
      {/* Toggle + inline status label */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          variant={open ? 'secondary' : 'default'}
          onClick={() => setOpen(v => !v)}
          className="h-9 gap-1.5 text-xs"
        >
          Compress
        </Button>

        {/* Inline compression status — shown when a type is selected */}
        <AnimatePresence>
          {hasSelection && (
            <motion.span
              key="compress-label"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              {/* small dot separator */}
              <span className="opacity-40">·</span>
              <span>Compression:</span>
              <span className={`font-semibold ${active.accentColor}`}>{active.label}</span>
              {estimatedSize && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="text-foreground/70">
                    Est.{' '}
                    <span className="font-medium text-foreground">{estimatedSize}</span>
                  </span>
                </>
              )}
              {/* Clear button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(null); }}
                className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity text-[10px] leading-none"
                title="Clear compression"
              >
                ✕
              </button>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Expandable options */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mt-2">
              {OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = value === opt.key;
                const estSize = fileSize > 0
                  ? formatEstimatedSize(fileSize, opt.sizeFactor)
                  : null;

                return (
                  <motion.button
                    key={opt.key}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { onChange(opt.key); setOpen(false); }}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border bg-gradient-to-br transition-all duration-200 ${
                      isActive ? `${opt.activeColors} shadow-lg` : opt.colors
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${opt.iconColor}`} />
                    <span className="text-xs font-semibold leading-none">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-none">{opt.description}</span>
                    {estSize && (
                      <span className={`text-[10px] font-medium leading-none mt-0.5 ${opt.accentColor} opacity-80`}>
                        ~{estSize}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
