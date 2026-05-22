import React from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FPS_PRESETS = [10, 12, 15, 24];
const WIDTH_PRESETS = [320, 480, 640, 720];

export default function GifOptions({ value, onChange }) {
  const fps = value?.fps ?? 12;
  const width = value?.width ?? 480;

  const update = (patch) => onChange({ ...(value || {}), ...patch });

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 p-3 rounded-xl bg-background/60 border border-border/50"
    >
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-2">
        <ImageIcon className="w-3 h-3" />
        GIF maker — combine with <span className="text-foreground font-medium">Trim</span> for short clips.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Frame rate (fps)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              max="60"
              value={fps}
              onChange={(e) => update({ fps: e.target.value.replace(/[^0-9]/g, '').slice(0, 2) })}
              className="h-8 text-xs font-mono w-20"
            />
            <div className="flex gap-1 flex-wrap">
              {FPS_PRESETS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update({ fps: p })}
                  className={`text-[10px] px-1.5 py-0.5 rounded-md border transition-colors ${
                    Number(fps) === p
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Width (px)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min="32"
              max="1920"
              value={width}
              onChange={(e) => update({ width: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) })}
              className="h-8 text-xs font-mono w-24"
            />
            <div className="flex gap-1 flex-wrap">
              {WIDTH_PRESETS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update({ width: p })}
                  className={`text-[10px] px-1.5 py-0.5 rounded-md border transition-colors ${
                    Number(width) === p
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
