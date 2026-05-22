import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, ChevronDown, ChevronUp, Crosshair } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { parseTimecode, formatTimecode } from '@/lib/timecode';

export default function VideoTrimmer({ trim, onChange, getPreviewTime, getDuration }) {
  const [open, setOpen] = useState(trim?.enabled || false);

  // When the preview reports a duration we didn't know about, default the
  // end value so the user has something sensible to start from.
  useEffect(() => {
    if (!trim?.enabled) return;
    if (trim?.end) return;
    const dur = getDuration?.();
    if (dur > 0) onChange({ ...trim, end: formatTimecode(dur) });
  }, [trim?.enabled, trim?.end, getDuration, onChange, trim]);

  const update = (patch) => onChange({ ...(trim || {}), ...patch });

  const setTimeFromPlayback = (field) => {
    const t = getPreviewTime?.() ?? 0;
    update({ [field]: formatTimecode(t) });
  };

  // Validation — derived once for the inline error.
  const startSec = parseTimecode(trim?.start);
  const endSec = parseTimecode(trim?.end);
  const startValid = trim?.start === '' || trim?.start === undefined || Number.isFinite(startSec);
  const endValid = trim?.end === '' || trim?.end === undefined || Number.isFinite(endSec);
  const rangeValid = !Number.isFinite(startSec) || !Number.isFinite(endSec) || endSec > startSec;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Scissors className="w-3.5 h-3.5" />
        Trim
        {trim?.enabled && (
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-primary/15 text-primary">
            {trim?.start || '00:00'} → {trim?.end || 'end'}
          </span>
        )}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-3 rounded-xl bg-background/60 border border-border/50 space-y-3">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!trim?.enabled}
                  onChange={(e) => update({ enabled: e.target.checked })}
                  className="accent-primary"
                />
                <span className="text-foreground/90">Trim before converting</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground flex items-center justify-between">
                    Start
                    <button
                      type="button"
                      disabled={!trim?.enabled}
                      onClick={() => setTimeFromPlayback('start')}
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                      title="Use current preview time"
                    >
                      <Crosshair className="w-3 h-3" />
                      Use preview
                    </button>
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="00:00:00"
                    value={trim?.start || ''}
                    disabled={!trim?.enabled}
                    onChange={(e) => update({ start: e.target.value.slice(0, 12) })}
                    className={`h-8 text-xs font-mono ${!startValid ? 'border-destructive/60' : ''}`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground flex items-center justify-between">
                    End
                    <button
                      type="button"
                      disabled={!trim?.enabled}
                      onClick={() => setTimeFromPlayback('end')}
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                      title="Use current preview time"
                    >
                      <Crosshair className="w-3 h-3" />
                      Use preview
                    </button>
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="00:00:30"
                    value={trim?.end || ''}
                    disabled={!trim?.enabled}
                    onChange={(e) => update({ end: e.target.value.slice(0, 12) })}
                    className={`h-8 text-xs font-mono ${!endValid || !rangeValid ? 'border-destructive/60' : ''}`}
                  />
                </div>
              </div>

              {(!startValid || !endValid) && (
                <p className="text-[11px] text-destructive">
                  Use HH:MM:SS, MM:SS, or seconds (e.g. 12.5).
                </p>
              )}
              {startValid && endValid && !rangeValid && (
                <p className="text-[11px] text-destructive">
                  End must be greater than start.
                </p>
              )}

              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Tip: scrub the preview, then click <span className="font-medium">Use preview</span>.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => onChange({ enabled: false, start: '', end: '' })}
                >
                  Reset
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
